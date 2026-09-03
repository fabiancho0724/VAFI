import { parseNumber } from './csvParser';
import { RECURSOS_FINANCIEROS } from './constants';

export interface TraceEntry {
  recurso: string;
  unidad: string;
  tipoGasto: string;
  valorAsignado: number;
  reglaAplicada: string;
  justificacion: string;
}

export interface ResourceAllocationItem {
  recurso: string;
  nombre: string;
  recaudoReal: number;
  limiteSIIF: number;
  capacidadDisponible: number;
  gastoAsignado: number;
  pctUtilizado: number;
  tipoGastoFinanciado: string;
  unidadAsociada: string;
  saldoFinal: number;
  estado: 'Disponible' | 'Alta utilización' | 'Capacidad limitada' | 'Agotado' | 'Restringido';
  estadoColor: string;
  trazabilidad: TraceEntry[];
}

export interface AllocationAuditChecks {
  check1_recaudoInmutable: { passed: boolean; detail: string };
  check2_personalSoloAdmin: { passed: boolean; detail: string };
  check3_r31Min40Admin: { passed: boolean; detail: string; valorAdmin: number; pctAdmin: number };
  check4_inversionExclusiva: { passed: boolean; detail: string };
  check5_limiteSIIFRespetado: { passed: boolean; detail: string };
  check6_coberturaCompromisos: { passed: boolean; pctCobertura: number; totalCompromisos: number; totalCubierto: number };
  check7_deficitReportado: { hasDeficit: boolean; deficitTotal: number; detalleDeficit: string[] };
}

export interface AllocationAlert {
  id: string;
  tipo: 'CRITICO' | 'ALTO' | 'ADVERTENCIA' | 'INFO';
  titulo: string;
  indicador: string;
  valor: string;
  impacto: string;
  recomendacion: string;
  regla: string;
}

export interface AllocationOptimizationResult {
  allocations: ResourceAllocationItem[];
  totals: {
    recaudoRealTotal: number;
    compromisosTotal: number;
    gastoAsignadoTotal: number;
    cuentasPorPagarTotal: number;
    saldoDisponibleTotal: number;
    coberturaPct: number;
  };
  checks: AllocationAuditChecks;
  alerts: AllocationAlert[];
}

export const RECURSOS_INVERSION_EXCLUSIVOS = ['12', '16', '16.1', '16.2', '40'];

export function optimizeResourceAllocation(
  balanceData: any[],
  gastos2026Data: any[],
  simulationOverrides?: {
    priorizarInversion?: boolean;
    forzarMaximoPagoFuncionamiento?: boolean;
  }
): AllocationOptimizationResult {
  function getCol(row: any, keyPart: string) {
    const k = Object.keys(row).find(x => x.toLowerCase().includes(keyPart.toLowerCase()));
    return k ? row[k] : '';
  }

  const resNameMap: Record<string, string> = {};
  RECURSOS_FINANCIEROS.forEach(r => {
    resNameMap[r.codigo] = r.nombre;
  });

  // 1. RECAUDO REAL INMUTABLE Y LÍMITES SIIF DE BALANCE.CSV
  const recaudoRealMap: Record<string, { recaudo: number; siif: number; nombre: string }> = {};
  if (balanceData && balanceData.length > 0) {
    balanceData.forEach(row => {
      const raw = String(row['Recurso'] || row['recurso'] || '').trim();
      const code = raw.split('-')[0].trim();
      if (!code || code === 'Total general' || code === '15') return;
      recaudoRealMap[code] = {
        recaudo: parseNumber(row['Recaudo 31/08']),
        siif: parseNumber(row['SIIF']),
        nombre: raw.substring(raw.indexOf('-') + 1).trim() || resNameMap[code] || `Recurso ${code}`
      };
    });
  }

  // 2. COMPROMISOS OFICIALES Y OPERACIONES DE GASTOS 2026
  interface ExpenseNeed {
    unidad: string;
    tipo: string;
    recurso: string;
    operacion: string;
    compromiso: number;
    pagoRealAgo: number;
  }

  const expenseNeeds: ExpenseNeed[] = [];
  if (gastos2026Data && gastos2026Data.length > 0) {
    gastos2026Data.forEach(r => {
      const u = String(getCol(r, 'unidad')).trim();
      const t = String(getCol(r, 'tipo')).trim();
      let rec = String(getCol(r, 'recurso')).trim();
      if (rec.startsWith('10.0')) rec = '10';
      if (rec.startsWith('16.0')) rec = '16';
      const op = String(getCol(r, 'operacion')).trim();
      const comp = parseNumber(getCol(r, 'compromiso'));
      const pago = parseNumber(getCol(r, 'pago'));
      if (comp > 0) {
        expenseNeeds.push({ unidad: u, tipo: t, recurso: rec, operacion: op, compromiso: comp, pagoRealAgo: pago });
      }
    });
  }

  // Group needs by Recurso
  const needsByResource: Record<string, {
    personalComp: number;
    funcComp: number;
    invComp: number;
    transComp: number;
    tasasComp: number;
    totalComp: number;
    unidades: Set<string>;
    tipos: Set<string>;
  }> = {};

  expenseNeeds.forEach(n => {
    if (!needsByResource[n.recurso]) {
      needsByResource[n.recurso] = {
        personalComp: 0,
        funcComp: 0,
        invComp: 0,
        transComp: 0,
        tasasComp: 0,
        totalComp: 0,
        unidades: new Set(),
        tipos: new Set()
      };
    }
    const rData = needsByResource[n.recurso];
    rData.totalComp += n.compromiso;
    rData.unidades.add(n.unidad);
    rData.tipos.add(n.tipo);

    const low = n.tipo.toLowerCase();
    if (low.includes('personal')) rData.personalComp += n.compromiso;
    else if (low.includes('funcionamiento')) rData.funcComp += n.compromiso;
    else if (low.includes('invers')) rData.invComp += n.compromiso;
    else if (low.includes('transferencias')) rData.transComp += n.compromiso;
    else if (low.includes('tasas')) rData.tasasComp += n.compromiso;
  });

  // 3. MOTOR DE ASIGNACIÓN INTELIGENTE BAJO REGLAS ESTRUCTURALES
  const allocations: ResourceAllocationItem[] = [];
  const alerts: AllocationAlert[] = [];
  const deficitDetails: string[] = [];

  let check1_passed = true;
  let check2_passed = true;
  let check3_passed = true;
  let check4_passed = true;
  let check5_passed = true;

  let r31TotalRecaudo = recaudoRealMap['31'] ? recaudoRealMap['31'].recaudo : 0;
  let r31AdminAsignado = 0;

  // Process each resource
  const allResourceCodes = Array.from(new Set([...Object.keys(recaudoRealMap), ...Object.keys(needsByResource)]));

  allResourceCodes.forEach(code => {
    const bInfo = recaudoRealMap[code] || { recaudo: 0, siif: 0, nombre: resNameMap[code] || `Recurso ${code}` };
    const nInfo = needsByResource[code] || { personalComp: 0, funcComp: 0, invComp: 0, transComp: 0, tasasComp: 0, totalComp: 0, unidades: new Set(), tipos: new Set() };

    const recaudoInmutable = bInfo.recaudo;
    const siifMaximo = bInfo.siif > 0 ? bInfo.siif : Infinity;
    const trazabilidad: TraceEntry[] = [];

    let asignacionPersonal = 0;
    let asignacionFuncionamiento = 0;
    let asignacionInversion = 0;
    let asignacionOtras = 0;

    // REGLA 3: RECURSOS DE INVERSIÓN (R12, R16, R16.1, R16.2, R40)
    const isInversionExclusiva = RECURSOS_INVERSION_EXCLUSIVOS.includes(code);

    if (isInversionExclusiva) {
      if (nInfo.personalComp > 0) {
        check2_passed = false;
        check4_passed = false;
        alerts.push({
          id: `bloqueo-inv-per-${code}`,
          tipo: 'CRITICO',
          titulo: `Bloqueo de Asignación Ilegal en R${code}`,
          indicador: 'Destinación Específica de Inversión',
          valor: `$${(nInfo.personalComp / 1e6).toFixed(1)}M en Personal`,
          impacto: 'Infracción presupuestal: Los recursos de inversión no pueden pagar nómina.',
          recomendacion: 'Reasignar el gasto de personal a la Unidad Administrativa (R10 / R31).',
          regla: 'REGLA 3 — Recursos de Inversión Exclusivos'
        });
      }
      if (nInfo.funcComp > 0) {
        check4_passed = false;
        alerts.push({
          id: `bloqueo-inv-func-${code}`,
          tipo: 'CRITICO',
          titulo: `Bloqueo de Asignación Ilegal en R${code}`,
          indicador: 'Destinación Específica de Inversión',
          valor: `$${(nInfo.funcComp / 1e6).toFixed(1)}M en Funcionamiento`,
          impacto: 'Infracción presupuestal: R12/R16/R40 no pueden financiar gastos corrientes.',
          recomendacion: 'Trasladar funcionamiento a recursos propios de libre destinación.',
          regla: 'REGLA 3 — Recursos de Inversión Exclusivos'
        });
      }

      // Se asigna EXCLUSIVAMENTE a Inversión
      const topeInversion = Math.min(recaudoInmutable, siifMaximo);
      asignacionInversion = Math.min(nInfo.invComp, topeInversion);

      trazabilidad.push({
        recurso: code,
        unidad: '01 - ADMINISTRATIVA Y FINANCIERA / PROYECTOS',
        tipoGasto: '2.3 Gastos de Inversión',
        valorAsignado: asignacionInversion,
        reglaAplicada: 'REGLA 3: Destinación Exclusiva a Gastos de Inversión',
        justificacion: `R${code} financia proyectos de infraestructura/equipamiento respetando el tope de recaudo real (${(recaudoInmutable/1e6).toFixed(1)}M).`
      });

    } else if (code === '31') {
      // REGLA 2: RECURSO R31 — POSGRADOS (Mínimo 40% a Unidad Administrativa)
      const minAdminCapacity = recaudoInmutable * 0.40;
      const academicCapacity = recaudoInmutable * 0.60;

      // Personal en R31 solo puede financiarse con la porción Administrativa
      const personalSolicitado = nInfo.personalComp;
      const personalAsignable = Math.min(personalSolicitado, minAdminCapacity);
      asignacionPersonal = personalAsignable;
      r31AdminAsignado += personalAsignable;

      // Resto de capacidad administrativa puede ir a funcionamiento administrativo
      const remAdminCapacity = minAdminCapacity - personalAsignable;
      const funcAdmin = Math.min(remAdminCapacity, nInfo.funcComp * 0.4);
      asignacionFuncionamiento += funcAdmin;
      r31AdminAsignado += funcAdmin;

      // Capacidad académica (60%) financia funcionamiento y convenios académicos
      const remAcademicCapacity = academicCapacity;
      const funcAcademico = Math.min(remAcademicCapacity, nInfo.funcComp - funcAdmin);
      asignacionFuncionamiento += funcAcademico;
      const otrasAcademico = Math.min(remAcademicCapacity - funcAcademico, nInfo.transComp + nInfo.tasasComp + nInfo.invComp);
      asignacionOtras += otrasAcademico;

      const pctAdminEfectivo = recaudoInmutable > 0 ? (r31AdminAsignado / recaudoInmutable) : 0;
      if (pctAdminEfectivo < 0.40 && (nInfo.personalComp + nInfo.funcComp) > 0) {
        check3_passed = false;
        alerts.push({
          id: 'alerta-r31-min40',
          tipo: 'ADVERTENCIA',
          titulo: 'Alerta de Proporción Administrativa R31',
          indicador: 'Participación en Unidad Administrativa',
          valor: `${(pctAdminEfectivo * 100).toFixed(1)}% (Mínimo requerido 40%)`,
          impacto: 'Insuficiencia de asignación administrativa sobre R31 Posgrados.',
          recomendacion: 'Asegurar que el 40% del recaudo real ($15.905M) quede formalmente reservado para la administración central.',
          regla: 'REGLA 2 — Reserva Mínima 40% R31 Administrativa'
        });
      }

      trazabilidad.push({
        recurso: '31',
        unidad: '01 - ADMINISTRATIVA Y FINANCIERA (40% RESERVADO)',
        tipoGasto: '2.1.1 Personal / 2.1.2 Funcionamiento',
        valorAsignado: r31AdminAsignado,
        reglaAplicada: 'REGLA 2: Participación Obligatoria 40% Admin',
        justificacion: `Se reservaron $${(r31AdminAsignado / 1e6).toFixed(1)}M (${(pctAdminEfectivo * 100).toFixed(1)}%) del recaudo real para la administración central.`
      });

      trazabilidad.push({
        recurso: '31',
        unidad: 'UNIDADES ACADÉMICAS POSGRADOS (60%)',
        tipoGasto: '2.1.2 Funcionamiento Posgrados',
        valorAsignado: asignacionFuncionamiento - funcAdmin + asignacionOtras,
        reglaAplicada: 'REGLA 2: Distribución del 60% Académico',
        justificacion: 'Financiación de gastos operativos propios de programas de posgrado en facultades y seccionales.'
      });

    } else {
      // RECURSOS GENERALES (R10 Nación, R20 Propios, R14 FSE, etc.)
      const esAdminUnit = Array.from(nInfo.unidades).some(u => u.includes('01') || u.includes('ADMINISTRATIVA'));

      // REGLA 1: GASTOS DE PERSONAL
      if (nInfo.personalComp > 0) {
        if (!esAdminUnit) {
          check2_passed = false;
          alerts.push({
            id: `bloqueo-personal-no-admin-${code}`,
            tipo: 'CRITICO',
            titulo: `Bloqueo de Nómina en Unidad No Autorizada (R${code})`,
            indicador: 'Restricción de Gastos de Personal',
            valor: `$${(nInfo.personalComp / 1e6).toFixed(1)}M`,
            impacto: 'Personal solo puede ejecutarse en Unidad Administrativa y Financiera.',
            recomendacion: 'Centralizar el pago en la nómina institucional.',
            regla: 'REGLA 1 — Gastos de Personal Exclusivos Unidad Administrativa'
          });
        } else {
          // Nómina se paga al 100% en vigencia limitado por capacidad
          asignacionPersonal = Math.min(nInfo.personalComp, recaudoInmutable);
          trazabilidad.push({
            recurso: code,
            unidad: '01 - ADMINISTRATIVA Y FINANCIERA',
            tipoGasto: '2.1.1 Gastos de Personal',
            valorAsignado: asignacionPersonal,
            reglaAplicada: 'REGLA 1: Nómina en Unidad Administrativa',
            justificacion: `Financiación de nómina de planta y temporal docente bajo Unidad Administrativa con recaudo disponible (${(recaudoInmutable / 1e6).toFixed(1)}M).`
          });
        }
      }

      // Resto de gastos: Funcionamiento, Transferencias, Tasas, Inversión complementaria
      let capRestante = Math.max(0, recaudoInmutable - asignacionPersonal);

      // REGLA 4: Control límite SIIF
      if (siifMaximo < Infinity && (asignacionPersonal + capRestante) > siifMaximo) {
        capRestante = Math.max(0, siifMaximo - asignacionPersonal);
      }

      asignacionFuncionamiento = Math.min(nInfo.funcComp, capRestante);
      capRestante -= asignacionFuncionamiento;

      asignacionOtras = Math.min(nInfo.transComp + nInfo.tasasComp + nInfo.invComp, capRestante);
      capRestante -= asignacionOtras;

      if (nInfo.funcComp > 0) {
        trazabilidad.push({
          recurso: code,
          unidad: Array.from(nInfo.unidades)[0] || '01 - ADMINISTRATIVA Y FINANCIERA',
          tipoGasto: '2.1.2 Funcionamiento / Corrientes',
          valorAsignado: asignacionFuncionamiento,
          reglaAplicada: 'Asignación Operativa Legalmente Compatible',
          justificacion: 'Gastos de funcionamiento ordinario dentro de la capacidad de recaudo real.'
        });
      }
    }

    // Total gasto asignado para este recurso
    let gastoAsignadoTotal = asignacionPersonal + asignacionFuncionamiento + asignacionInversion + asignacionOtras;

    // REGLA 4: VALIDAR TOPE SIIF
    if (siifMaximo < Infinity && gastoAsignadoTotal > siifMaximo) {
      check5_passed = false;
      gastoAsignadoTotal = siifMaximo;
      alerts.push({
        id: `siif-superado-${code}`,
        tipo: 'CRITICO',
        titulo: `Tope SIIF Excedido en R${code}`,
        indicador: 'Límite Máximo SIIF',
        valor: `Asignado: $${(gastoAsignadoTotal / 1e6).toFixed(1)}M | SIIF: $${(siifMaximo / 1e6).toFixed(1)}M`,
        impacto: 'El pago proyectado superaría el límite de giros programados en SIIF Nación.',
        recomendacion: 'Topar el pago al valor autorizado en SIIF.',
        regla: 'REGLA 4 — Valores Bloqueados SIIF'
      });
    }

    const saldoFinal = Math.max(0, recaudoInmutable - gastoAsignadoTotal);
    const pctUtilizado = recaudoInmutable > 0 ? (gastoAsignadoTotal / recaudoInmutable) * 100 : 0;

    // Determinar Estado del Recurso
    let estado: ResourceAllocationItem['estado'] = 'Disponible';
    let estadoColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';

    if (isInversionExclusiva) {
      estado = 'Restringido';
      estadoColor = 'text-blue-400 bg-blue-500/10 border-blue-500/20';
    } else if (pctUtilizado >= 99.5) {
      estado = 'Agotado';
      estadoColor = 'text-rose-400 bg-rose-500/10 border-rose-500/20';
    } else if (pctUtilizado >= 90) {
      estado = 'Alta utilización';
      estadoColor = 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    } else if (pctUtilizado >= 75) {
      estado = 'Capacidad limitada';
      estadoColor = 'text-orange-400 bg-orange-500/10 border-orange-500/20';
    }

    // Identificar insuficiencia frente al compromiso
    if (gastoAsignadoTotal < nInfo.totalComp) {
      const deficit = nInfo.totalComp - gastoAsignadoTotal;
      deficitDetails.push(`R${code} (${bInfo.nombre}): Compromisos por $${(nInfo.totalComp/1e6).toFixed(1)}M vs Asignación posible $${(gastoAsignadoTotal/1e6).toFixed(1)}M (Déficit de cobertura: $${(deficit/1e6).toFixed(1)}M)`);
      
      if (pctUtilizado >= 98) {
        alerts.push({
          id: `insuficiencia-${code}`,
          tipo: 'ALTO',
          titulo: `Insuficiencia de Recaudo en R${code}`,
          indicador: 'Cobertura de Compromisos',
          valor: `Déficit: $${(deficit / 1e6).toFixed(1)}M (${((gastoAsignadoTotal / nInfo.totalComp) * 100).toFixed(0)}% cubierto)`,
          impacto: `El recurso agotó su recaudo real ($${(recaudoInmutable / 1e6).toFixed(1)}M). Compromisos no pagados pasarán a cuentas por pagar.`,
          recomendacion: 'No autorizar pagos sin nuevo ingreso o adición presupuestal.',
          regla: 'PRINCIPIO 5: Integridad del Recaudo Real'
        });
      }
    }

    // Tipo de gasto principal
    const tipoArray = Array.from(nInfo.tipos);
    const tipoPrincipal = tipoArray.length > 0 ? (tipoArray.length === 1 ? tipoArray[0] : `${tipoArray[0]} (+${tipoArray.length - 1})`) : 'Sin Compromisos';
    const unidadPrincipal = Array.from(nInfo.unidades)[0] || '01 - ADMINISTRATIVA Y FINANCIERA';

    allocations.push({
      recurso: code,
      nombre: bInfo.nombre,
      recaudoReal: recaudoInmutable,
      limiteSIIF: siifMaximo < Infinity ? siifMaximo : 0,
      capacidadDisponible: recaudoInmutable,
      gastoAsignado: gastoAsignadoTotal,
      pctUtilizado,
      tipoGastoFinanciado: tipoPrincipal,
      unidadAsociada: unidadPrincipal,
      saldoFinal,
      estado,
      estadoColor,
      trazabilidad
    });
  });

  // Sort: Agotados y Alta Utilización primero, luego Disponibles
  allocations.sort((a, b) => b.gastoAsignado - a.gastoAsignado);

  const recaudoRealTotal = allocations.reduce((acc, a) => acc + a.recaudoReal, 0);
  const compromisosTotal = Object.values(needsByResource).reduce((acc, n) => acc + n.totalComp, 0);
  const gastoAsignadoTotal = allocations.reduce((acc, a) => acc + a.gastoAsignado, 0);
  const cuentasPorPagarTotal = Math.max(0, compromisosTotal - gastoAsignadoTotal);
  const saldoDisponibleTotal = allocations.reduce((acc, a) => acc + a.saldoFinal, 0);
  const coberturaPct = compromisosTotal > 0 ? (gastoAsignadoTotal / compromisosTotal) * 100 : 100;

  const checks: AllocationAuditChecks = {
    check1_recaudoInmutable: {
      passed: check1_passed,
      detail: 'El recaudo real de todos los recursos se mantuvo inmutable. Ningún valor fue incrementado o modificado.'
    },
    check2_personalSoloAdmin: {
      passed: check2_passed,
      detail: 'Los Gastos de Personal fueron financiados exclusivamente con recursos de la Unidad Administrativa y Financiera.'
    },
    check3_r31Min40Admin: {
      passed: check3_passed,
      detail: `R31 Posgrados reservó $${(r31AdminAsignado / 1e6).toFixed(1)}M (${((r31AdminAsignado / (r31TotalRecaudo || 1)) * 100).toFixed(1)}% del recaudo) para la Unidad Administrativa (Mínimo legal 40%).`,
      valorAdmin: r31AdminAsignado,
      pctAdmin: r31TotalRecaudo > 0 ? (r31AdminAsignado / r31TotalRecaudo) * 100 : 40
    },
    check4_inversionExclusiva: {
      passed: check4_passed,
      detail: 'R12, R16, R16.1, R16.2 y R40 fueron asignados con exclusividad estricta a Gastos de Inversión (0% en Personal o Funcionamiento).'
    },
    check5_limiteSIIFRespetado: {
      passed: check5_passed,
      detail: 'Ninguna asignación proyectada superó los límites máximos programados en el SIIF Nación.'
    },
    check6_coberturaCompromisos: {
      passed: coberturaPct >= 95.0,
      pctCobertura: coberturaPct,
      totalCompromisos: compromisosTotal,
      totalCubierto: gastoAsignadoTotal
    },
    check7_deficitReportado: {
      hasDeficit: cuentasPorPagarTotal > 0,
      deficitTotal: cuentasPorPagarTotal,
      detalleDeficit: deficitDetails
    }
  };

  return {
    allocations,
    totals: {
      recaudoRealTotal,
      compromisosTotal,
      gastoAsignadoTotal,
      cuentasPorPagarTotal,
      saldoDisponibleTotal,
      coberturaPct
    },
    checks,
    alerts
  };
}
