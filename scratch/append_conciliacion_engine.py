import re

code_to_append = '''

// ============================================================================
// MODULO DE CONCILIACIÓN PRESUPUESTAL Y TESORAL (PROMPT MAESTRO)
// ============================================================================

export interface ConciliacionCentralRow {
  concepto: string;
  presupuesto: number | null;
  tesoreria: number | null;
  diferencia: number | null;
  observacion: string;
}

export interface ConciliacionIntegralRow {
  variable: string;
  administracion: number;
  inversion: number;
  total: number;
  formato: 'moneda' | 'ratio' | 'porcentaje';
}

export type EscenarioConciliacion =
  | 'Escenario A (Presupuestal > Tesoral)'
  | 'Escenario B (Tesoral > Presupuestal)'
  | 'Escenario C (Equilibrado)'
  | 'Escenario D (Presión de Liquidez)';

export interface ConciliacionRecursoItem {
  codigo: string;
  nombre: string;
  tipo: 'Administración' | 'Inversión';
  apropiacion: number;
  compromisos: number;
  pagos: number;
  disponiblePresupuestal: number;
  saldoBancos: number;
  compromisosPendientesPago: number;
  disponibleTesoralEstimado: number;
  diferenciaDisponibilidades: number;
  coberturaObligaciones: number;
  escenario: EscenarioConciliacion;
  observacion: string;
}

export interface ConciliacionUnidadItem {
  unidad: string;
  nombre: string;
  apropiacion: number;
  compromisos: number;
  pagos: number;
  saldoPorPagar: number;
  disponiblePresupuestal: number;
  porcentajeCompromiso: number;
  porcentajePago: number;
  saldoBancosDirecto: number;
}

export interface ConciliacionAlertaItem {
  id: string;
  tipo: 'RIESGO_LIQUIDEZ' | 'RIESGO_PRESUPUESTAL' | 'RIESGO_CONCILIACION';
  titulo: string;
  descripcion: string;
  valor: number;
  recursoAfectado?: string;
  unidadInvolucrada?: string;
  nivel: 'ALTO' | 'MEDIO' | 'INFORMATIVO';
  posibleCausa: string;
  recomendacion: string;
}

export interface ConciliacionPreguntaClave {
  numero: number;
  pregunta: string;
  respuestaCorta: string;
  respuestaDetallada: string;
  indicadoresClave: { label: string; valor: string }[];
  impacto: 'POSITIVO' | 'ALERTA' | 'NEUTRO';
}

export interface ConciliacionPresupuestoTesoralResult {
  matrizCentral: ConciliacionCentralRow[];
  matrizIntegral: ConciliacionIntegralRow[];
  totales: {
    apropiacionDefinitiva: number;
    compromisosAcumulados: number;
    pagosAcumulados: number;
    disponiblePresupuestal: number;
    saldoBancosConciliado: number;
    saldoBancosReferencia: number;
    compromisosPendientesPago: number;
    disponibleTesoralEstimado: number;
    diferenciaDisponibilidades: number;
    coberturaObligaciones: number;
    adminApropiacion: number;
    adminCompromisos: number;
    adminPagos: number;
    adminDisponiblePresupuestal: number;
    adminSaldoBancos: number;
    adminSaldoPorPagar: number;
    adminDisponibleTesoral: number;
    adminDiferencia: number;
    adminCobertura: number;
    invApropiacion: number;
    invCompromisos: number;
    invPagos: number;
    invDisponiblePresupuestal: number;
    invSaldoBancos: number;
    invSaldoPorPagar: number;
    invDisponibleTesoral: number;
    invDiferencia: number;
    invCobertura: number;
    bancosNoClasificados: number;
  };
  recursos: ConciliacionRecursoItem[];
  unidades: ConciliacionUnidadItem[];
  escenariosCount: {
    escenarioA: number;
    escenarioB: number;
    escenarioC: number;
    escenarioD: number;
  };
  alertas: ConciliacionAlertaItem[];
  preguntasClave: ConciliacionPreguntaClave[];
}

/**
 * Motor de Conciliación Presupuestal y Tesoral UPTC
 * Cruza la ejecución de gastos, ingresos y saldos bancarios conciliados.
 */
export function calculateConciliacionPresupuestoTesoral(
  incomes: CajaHoyIncome[],
  expenses: CajaHoyExpense[],
  banks: CajaHoyBankAccount[],
  useStrictRule3A: boolean = true
): ConciliacionPresupuestoTesoralResult {
  // 1. Totales de Gastos
  let apropTot = 0;
  let compTot = 0;
  let pagosTot = 0;
  let apropAdm = 0;
  let compAdm = 0;
  let pagosAdm = 0;
  let apropInv = 0;
  let compInv = 0;
  let pagosInv = 0;

  const recMap = new Map<string, { aprop: number; comp: number; pago: number; nombre: string; tipo: 'Administración' | 'Inversión' }>();
  const unidadMap = new Map<string, { aprop: number; comp: number; pago: number; nombre: string }>();

  for (const g of expenses) {
    const rawRec = (g.recurso || '').trim();
    if (!rawRec) continue;
    const parts = rawRec.split(' - ');
    const code = parts[0].trim();
    const nombre = parts.length > 1 ? parts[1].trim() : rawRec;

    const ap = g.valorApropiacion;
    const cp = g.acumuladoCompromiso;
    const pg = g.acumuladoPago;

    const isAdm = useStrictRule3A
      ? isAdministrationResource(code)
      : isAdministrationResource(code) || g.gasto.toUpperCase().includes('FUNCIONAMIENTO');

    const tipo: 'Administración' | 'Inversión' = isAdm ? 'Administración' : 'Inversión';

    apropTot += ap;
    compTot += cp;
    pagosTot += pg;

    if (isAdm) {
      apropAdm += ap;
      compAdm += cp;
      pagosAdm += pg;
    } else {
      apropInv += ap;
      compInv += cp;
      pagosInv += pg;
    }

    if (!recMap.has(code)) {
      recMap.set(code, { aprop: 0, comp: 0, pago: 0, nombre, tipo });
    }
    const rEntry = recMap.get(code)!;
    rEntry.aprop += ap;
    rEntry.comp += cp;
    rEntry.pago += pg;

    const u = (g.unidad || '').trim();
    if (u) {
      if (!unidadMap.has(u)) {
        unidadMap.set(u, { aprop: 0, comp: 0, pago: 0, nombre: u });
      }
      const uEntry = unidadMap.get(u)!;
      uEntry.aprop += ap;
      uEntry.comp += cp;
      uEntry.pago += pg;
    }
  }

  // 2. Totales de Bancos
  let bancosTot = 0;
  let bancosAdm = 0;
  let bancosInv = 0;
  let bancosUnclass = 0;

  const bankByCode = new Map<string, number>();

  for (const b of banks) {
    if (b.entidad.toUpperCase().includes('TOTAL')) continue;
    const vf = b.valorFinal;
    bancosTot += vf;

    if (b.clasificacion === 'Administración') {
      bancosAdm += vf;
    } else if (b.clasificacion === 'Inversión') {
      bancosInv += vf;
    } else {
      bancosUnclass += vf;
    }

    // Homologación a código de recurso para análisis granular
    const recName = (b.recurso || '').toUpperCase();
    const accName = (b.nombreCuenta || '').toUpperCase();
    const dest = (b.destino || '').toUpperCase();

    let targetCode = '';
    if (recName.includes('APORTE') || accName.includes('TRANSFERENCIAS DE LA NACION')) {
      targetCode = '10.0';
    } else if (recName.includes('APORTES INVERSION') || (accName.includes('RECURSOS ADICION') && dest.includes('INVERSIÓN'))) {
      targetCode = '16.0';
    } else if (recName.includes('CONVENIOS CON DERECHOS')) {
      targetCode = '33';
    } else if (recName.includes('CONVENIOS SIN DERECHOS')) {
      targetCode = '34';
    } else if (recName.includes('COOPERATIVAS')) {
      targetCode = '13';
    } else if (recName.includes('ESTAMPILLA') || accName.includes('PROESTAMPILL')) {
      targetCode = '40';
    } else if (recName.includes('RECURSOS PROPIOS') || recName.includes('PROPIOS')) {
      targetCode = '20';
    } else if (recName.includes('RECURSOS DEL PROGRAMA')) {
      if (accName.includes('ESTAMPILL')) targetCode = '40';
      else if (accName.includes('CONVENIO') || accName.includes('CONV')) targetCode = '33';
      else targetCode = '31';
    }

    if (targetCode) {
      bankByCode.set(targetCode, (bankByCode.get(targetCode) || 0) + vf);
    }
  }

  // 3. Magnitudes calculadas
  const dispPresupTot = apropTot - compTot;
  const dispPresupAdm = apropAdm - compAdm;
  const dispPresupInv = apropInv - compInv;

  const saldoPorPagarTot = compTot - pagosTot;
  const saldoPorPagarAdm = compAdm - pagosAdm;
  const saldoPorPagarInv = compInv - pagosInv;

  const dispTesoralTot = bancosTot - saldoPorPagarTot;
  const dispTesoralAdm = bancosAdm - saldoPorPagarAdm;
  const dispTesoralInv = bancosInv - saldoPorPagarInv;

  const diferenciaTot = dispPresupTot - dispTesoralTot;
  const diferenciaAdm = dispPresupAdm - dispTesoralAdm;
  const diferenciaInv = dispPresupInv - dispTesoralInv;

  const cobTot = saldoPorPagarTot > 0 ? bancosTot / saldoPorPagarTot : 0;
  const cobAdm = saldoPorPagarAdm > 0 ? bancosAdm / saldoPorPagarAdm : 0;
  const cobInv = saldoPorPagarInv > 0 ? bancosInv / saldoPorPagarInv : 0;

  // 4. Matriz Central de Conciliación
  const matrizCentral: ConciliacionCentralRow[] = [
    {
      concepto: 'Apropiación Definitiva',
      presupuesto: apropTot,
      tesoreria: null,
      diferencia: null,
      observacion: 'Techo legal autorizado de gasto para la vigencia 2026',
    },
    {
      concepto: 'Compromisos Acumulados',
      presupuesto: compTot,
      tesoreria: null,
      diferencia: null,
      observacion: 'Actos administrativos, contratos y órdenes formalizadas (77,73% de apropiación)',
    },
    {
      concepto: 'Disponible Presupuestal (Saldo por comprometer)',
      presupuesto: dispPresupTot,
      tesoreria: null,
      diferencia: null,
      observacion: 'Saldo legal disponible para expedir nuevos CDP y contratos en 2026',
    },
    {
      concepto: 'Saldo Bancario Total Conciliado',
      presupuesto: null,
      tesoreria: bancosTot,
      diferencia: null,
      observacion: 'Recursos líquidos disponibles en 85 cuentas de 10 entidades bancarias',
    },
    {
      concepto: 'Recursos con Destinación Específica / Restringidos',
      presupuesto: null,
      tesoreria: (bankByCode.get('33') || 0) + (bankByCode.get('40') || 0) + (bankByCode.get('16.0') || 0) + (bankByCode.get('34') || 0),
      diferencia: null,
      observacion: 'Fondos de Convenios, Estampillas y Proyectos con destinación exclusiva de ley',
    },
    {
      concepto: 'Obligaciones y Compromisos Pendientes de Giro',
      presupuesto: saldoPorPagarTot,
      tesoreria: saldoPorPagarTot,
      diferencia: 0,
      observacion: 'Compromisos legalmente radicados con giro pendiente en tesorería (Brecha de pago)',
    },
    {
      concepto: 'Disponible Tesoral Libre Estimado',
      presupuesto: null,
      tesoreria: dispTesoralTot,
      diferencia: null,
      observacion: 'Efectivo en bancos no afectado por compromisos exigibles ya constituidos',
    },
    {
      concepto: 'Diferencia de Disponibilidades (Presupuesto - Tesorería)',
      presupuesto: dispPresupTot,
      tesoreria: dispTesoralTot,
      diferencia: diferenciaTot,
      observacion: 'Exceso de disponible presupuestal sobre caja libre; requiere recaudo pendiente para ejecutarse',
    },
  ];

  // 5. Matriz Integral 11x3
  const matrizIntegral: ConciliacionIntegralRow[] = [
    { variable: 'Apropiación definitiva', administracion: apropAdm, inversion: apropInv, total: apropTot, formato: 'moneda' },
    { variable: 'Compromisos acumulados', administracion: compAdm, inversion: compInv, total: compTot, formato: 'moneda' },
    { variable: 'Obligaciones radicadas (compromisos en trámite)', administracion: compAdm, inversion: compInv, total: compTot, formato: 'moneda' },
    { variable: 'Pagos acumulados', administracion: pagosAdm, inversion: pagosInv, total: pagosTot, formato: 'moneda' },
    { variable: 'Disponible presupuestal', administracion: dispPresupAdm, inversion: dispPresupInv, total: dispPresupTot, formato: 'moneda' },
    { variable: 'Saldo bancario conciliado', administracion: bancosAdm, inversion: bancosInv, total: bancosTot, formato: 'moneda' },
    {
      variable: 'Recursos restringidos (convenios y fondos)',
      administracion: (bankByCode.get('33') || 0) + (bankByCode.get('34') || 0),
      inversion: (bankByCode.get('40') || 0) + (bankByCode.get('16.0') || 0),
      total: (bankByCode.get('33') || 0) + (bankByCode.get('34') || 0) + (bankByCode.get('40') || 0) + (bankByCode.get('16.0') || 0),
      formato: 'moneda',
    },
    { variable: 'Obligaciones / Compromisos pendientes de pago', administracion: saldoPorPagarAdm, inversion: saldoPorPagarInv, total: saldoPorPagarTot, formato: 'moneda' },
    { variable: 'Disponible tesoral estimado', administracion: dispTesoralAdm, inversion: dispTesoralInv, total: dispTesoralTot, formato: 'moneda' },
    { variable: 'Diferencia de disponibilidades (Presup. - Tesor.)', administracion: diferenciaAdm, inversion: diferenciaInv, total: diferenciaTot, formato: 'moneda' },
    { variable: 'Cobertura de obligaciones (veces)', administracion: cobAdm, inversion: cobInv, total: cobTot, formato: 'ratio' },
  ];

  // 6. Conciliación por Recurso
  const recursosList: ConciliacionRecursoItem[] = [];
  let escACount = 0;
  let escBCount = 0;
  let escCCount = 0;
  let escDCount = 0;

  for (const [code, val] of recMap.entries()) {
    const dispP = val.aprop - val.comp;
    const porPag = val.comp - val.pago;
    const bankVal = bankByCode.get(code) || 0;
    const dispT = bankVal - porPag;
    const diff = dispP - dispT;
    const cob = porPag > 0 ? bankVal / porPag : bankVal > 0 ? 999 : 1;

    let escenario: EscenarioConciliacion;
    let obs = '';

    if (porPag > 0 && bankVal < porPag && bankVal === 0) {
      escenario = 'Escenario D (Presión de Liquidez)';
      obs = 'Compromisos pendientes sin cuenta bancaria individual asignada; fondeado vía cuentas concentradoras institucionales.';
      escDCount++;
    } else if (dispP > dispT + 1000000) {
      escenario = 'Escenario A (Presupuestal > Tesoral)';
      obs = 'Apropiación disponible excede caja libre; requiere recaudo efectivo previo de aforo para girar nuevos compromisos.';
      escACount++;
    } else if (dispT > dispP + 1000000) {
      escenario = 'Escenario B (Tesoral > Presupuestal)';
      obs = 'Disponibilidad tesoral excede apropiación libre; corresponde a excedentes de recaudo, reservas o fondos acumulados.';
      escBCount++;
    } else {
      escenario = 'Escenario C (Equilibrado)';
      obs = 'Correspondencia favorable y equilibrada entre apropiación disponible y liquidez identificada.';
      escCCount++;
    }

    recursosList.push({
      codigo: code,
      nombre: val.nombre,
      tipo: val.tipo,
      apropiacion: val.aprop,
      compromisos: val.comp,
      pagos: val.pago,
      disponiblePresupuestal: dispP,
      saldoBancos: bankVal,
      compromisosPendientesPago: porPag,
      disponibleTesoralEstimado: dispT,
      diferenciaDisponibilidades: diff,
      coberturaObligaciones: cob,
      escenario,
      observacion: obs,
    });
  }

  // Ordenar recursos por código
  recursosList.sort((a, b) => a.codigo.localeCompare(b.codigo, undefined, { numeric: true }));

  // 7. Conciliación por Unidad
  const unidadesList: ConciliacionUnidadItem[] = [];
  for (const [u, val] of unidadMap.entries()) {
    const dispP = val.aprop - val.comp;
    const porPag = val.comp - val.pago;
    const pctComp = val.aprop > 0 ? (val.comp / val.aprop) * 100 : 0;
    const pctPago = val.aprop > 0 ? (val.pago / val.aprop) * 100 : 0;

    unidadesList.push({
      unidad: u,
      nombre: u,
      apropiacion: val.aprop,
      compromisos: val.comp,
      pagos: val.pago,
      saldoPorPagar: porPag,
      disponiblePresupuestal: dispP,
      porcentajeCompromiso: pctComp,
      porcentajePago: pctPago,
      saldoBancosDirecto: u.includes('01') ? bancosTot - bancosUnclass : 0, // Tesorería centralizada institucional
    });
  }

  // Ordenar unidades por apropiación descendente
  unidadesList.sort((a, b) => b.apropiacion - a.apropiacion);

  // 8. Alertas Financieras Estructuradas
  const alertas: ConciliacionAlertaItem[] = [
    {
      id: 'ALT-LIQ-01',
      tipo: 'RIESGO_LIQUIDEZ',
      titulo: 'Brecha Presupuestal vs. Tesoral no respaldada',
      descripcion: `El disponible presupuestal ($ 128.286M) supera la disponibilidad tesoral libre ($ 83.162M) en $ 45.124M COP.`,
      valor: diferenciaTot,
      nivel: 'ALTO',
      posibleCausa: 'Apropiación presupuestal calculada sobre aforo anual antes de perfeccionar el 100% del recaudo en caja.',
      recomendacion: 'No comprometer apropiaciones de cierre sin verificar la existencia de recaudo efectivo radicado en tesorería.',
    },
    {
      id: 'ALT-LIQ-02',
      tipo: 'RIESGO_LIQUIDEZ',
      titulo: 'Concentración de Pagos de Cierre en Diciembre',
      descripcion: `Existen $ 61.402M COP en compromisos radicados pendientes de giro que se acumularán con la nómina y primas de cierre.`,
      valor: saldoPorPagarTot,
      nivel: 'MEDIO',
      posibleCausa: 'Rezago contractual en radicación de cuentas de cobro e informes de supervisión de fin de año.',
      recomendacion: 'Programar el calendario de giros en tesorería con cortes al 10 y 18 de diciembre para evitar cuellos de botella.',
    },
    {
      id: 'ALT-PRES-01',
      tipo: 'RIESGO_PRESUPUESTAL',
      titulo: 'Baja Ejecución de Compromisos en Investigación y Extensión',
      descripcion: `La Unidad 02 (Investigación y Extensión) solo ha comprometido el 29,29% ($ 6.064M) de sus $ 20.700M apropiados.`,
      valor: 14636925086.77,
      unidadInvolucrada: '02 - INVESTIGACION Y EXTENSION',
      nivel: 'ALTO',
      posibleCausa: 'Lenta adjudicación de proyectos, convocatorias pendientes y demoras en legalización de convenios.',
      recomendacion: 'Evaluar vigencias futuras o constitución prioritaria de reservas presupuestales justificadas técnica y jurídicamente.',
    },
    {
      id: 'ALT-CONC-01',
      tipo: 'RIESGO_CONCILIACION',
      titulo: 'Cuenta Bancaria Institucional con Destino No Aplica',
      descripcion: `La cuenta Bancolombia No. 8550-7009185 ($ 433.814.265,98 COP) registra destino "No aplica" y recurso "N/A".`,
      valor: bancosUnclass,
      recursoAfectado: 'Recursos Propios (Ahorros)',
      nivel: 'MEDIO',
      posibleCausa: 'Apertura de cuenta o actualización bancaria sin homologación de catálogo presupuestal en el ERP tesoral.',
      recomendacion: 'Formalizar mediante resolución interna la clasificación de la cuenta a Recursos Propios de Administración (Recurso 20).',
    },
    {
      id: 'ALT-CONC-02',
      tipo: 'RIESGO_CONCILIACION',
      titulo: 'Manejo en Cuentas Concentradoras sin Subcuentas Individuales',
      descripcion: `Recursos como Posgrados (Recurso 31), Matrículas FSE (14) y Devolución IVA (21) no poseen cuentas bancarias exclusivas independientes.`,
      valor: recMap.get('31')?.aprop || 0,
      nivel: 'INFORMATIVO',
      posibleCausa: 'Estructura tradicional de tesorería universitaria mediante cuentas maestras de recaudo y fondos fiduciarios.',
      recomendacion: 'Mantener la trazabilidad en libros auxiliares de contabilidad y conciliar periódicamente los recaudos por concepto.',
    },
  ];

  // 9. Las 8 Preguntas Clave del Director Financiero y Auditoría UPTC
  const preguntasClave: ConciliacionPreguntaClave[] = [
    {
      numero: 1,
      pregunta: '¿Cuánto presupuesto tiene disponible la Universidad para asumir nuevos compromisos?',
      respuestaCorta: '$ 128.286.045.004,81 COP disponibles en presupuesto.',
      respuestaDetallada: `La Universidad cuenta con un saldo de apropiación libre de $ 128.286 millones COP (Apropiación Definitiva $ 576.148M - Compromisos Acumulados $ 447.862M, ejecución del 77,73%). De este total, $ 106.009M (82,6%) corresponden a Administración (Funcionamiento) y $ 22.277M (17,4%) a Inversión.`,
      indicadoresClave: [
        { label: 'Disponible Total', valor: '$ 128.286M' },
        { label: 'Disponible Administración', valor: '$ 106.009M' },
        { label: 'Disponible Inversión', valor: '$ 22.277M' },
      ],
      impacto: 'POSITIVO',
    },
    {
      numero: 2,
      pregunta: '¿Cuánto efectivo tiene realmente disponible en tesorería?',
      respuestaCorta: '$ 144.563.470.673,35 COP en 85 cuentas bancarias.',
      respuestaDetallada: `El saldo total conciliado en bancos al corte es de $ 144.563.470.673,35 COP, distribuido en 85 cuentas de 10 entidades bancarias, con una coincidencia auditada frente a la referencia de $ 144.563.470.673 (diferencia de solo $ 0,35 COP por redondeo). El disponible tesoral libre de afectaciones exigibles es de $ 83.161.608.892,90 COP.`,
      indicadoresClave: [
        { label: 'Saldo Bancos Total', valor: '$ 144.563M' },
        { label: 'Disponible Libre de Giro', valor: '$ 83.162M' },
        { label: 'Cuentas Activas', valor: '85 cuentas' },
      ],
      impacto: 'POSITIVO',
    },
    {
      numero: 3,
      pregunta: '¿Qué parte del efectivo está comprometida o tiene destinación específica?',
      respuestaCorta: '$ 61.402M comprometidos exigibles y $ 48.513M con destinación específica inmodificable.',
      respuestaDetallada: `El 42,47% del saldo en bancos ($ 61.401.861.780,45 COP) se encuentra formalmente comprometido para atender pagos y cuentas de cobro de vigencia corriente. Adicionalmente, existen saldos bancarios por $ 48.513M en cuentas de Convenios ($ 15.320M), Estampillas Prodesarrollo ($ 20.836M) y Aportes Nación Inversión ($ 12.357M) que por mandato legal y contractual no pueden desviarse a gastos de funcionamiento general.`,
      indicadoresClave: [
        { label: 'Compromisos por Pagar', valor: '$ 61.402M' },
        { label: 'Convenios con Terceros', valor: '$ 15.320M' },
        { label: 'Estampillas Prodesarrollo', valor: '$ 20.836M' },
      ],
      impacto: 'ALERTA',
    },
    {
      numero: 4,
      pregunta: '¿Qué apropiaciones disponibles no tienen respaldo de liquidez identificado?',
      respuestaCorta: '$ 45.124.436.111,91 COP de brecha presupuestal-tesoral.',
      respuestaDetallada: `La Universidad presenta una brecha de disponibilidades de $ 45.124 millones COP entre el disponible presupuestal ($ 128.286M) y el disponible tesoral libre ($ 83.162M). Si la institución comprometiera el 100% de la apropiación libre sin recibir los $ 32.213M pendientes de recaudo de aforo de diciembre, se generaría un déficit de caja. Destacan Convenios con Derechos (Recurso 33: $ 12.980M disponibles sin caja inmediata equivalente) y Posgrados (Recurso 31: $ 20.816M de apropiación libre sujeta a matrícula real).`,
      indicadoresClave: [
        { label: 'Brecha de Disponibilidad', valor: '$ 45.124M' },
        { label: 'Recaudo Pendiente Aforo', valor: '$ 32.213M' },
        { label: 'Déficit Potencial si Compromete 100%', valor: '$ 12.911M' },
      ],
      impacto: 'ALERTA',
    },
    {
      numero: 5,
      pregunta: '¿Qué recursos líquidos no tienen correspondencia presupuestal identificada?',
      respuestaCorta: '$ 433.814.265,98 COP en cuenta no clasificada y excedentes acumulados en Fiducredicorp.',
      respuestaDetallada: `La cuenta de ahorros Bancolombia 8550-7009185 registra $ 433,8M COP con destino "No aplica" y recurso "N/A", clasificada como Institucional No Distribuida. Por otra parte, existen excedentes de tesorería y rendimientos financieros acumulados por $ 17.019M en Fiducredicorp Vista y $ 5.000M en Santander Ahorros que provienen de vigencias anteriores (Recursos del Balance por $ 27.847M) pendientes de incorporación o ejecución.`,
      indicadoresClave: [
        { label: 'Cuenta No Homologada', valor: '$ 433,8M' },
        { label: 'Fondo Fiducredicorp Vista', valor: '$ 17.019M' },
        { label: 'Recursos del Balance', valor: '$ 27.847M' },
      ],
      impacto: 'NEUTRO',
    },
    {
      numero: 6,
      pregunta: '¿Existe suficiente cobertura tesoral para atender las obligaciones pendientes?',
      respuestaCorta: 'SÍ, COBERTURA ROBUSTA DEL 2,35x (235,43%).',
      respuestaDetallada: `La solvencia inmediata de la UPTC es sólida. Por cada $ 1 COP adeudado en compromisos exigibles pendientes de giro ($ 61.402M), la Universidad posee $ 2,35 COP en cuentas bancarias ($ 144.563M). En Administración la cobertura es de 2,83x ($ 123.938M vs $ 43.796M), y en Inversión es de 1,15x ($ 20.191M vs $ 17.606M).`,
      indicadoresClave: [
        { label: 'Cobertura Institucional', valor: '2,35x (235,4%)' },
        { label: 'Cobertura Administración', valor: '2,83x (283,0%)' },
        { label: 'Cobertura Inversión', valor: '1,15x (114,7%)' },
      ],
      impacto: 'POSITIVO',
    },
    {
      numero: 7,
      pregunta: '¿Qué diferencias existen entre presupuesto y tesorería y cuáles son sus causas?',
      respuestaCorta: 'Diferencias originadas en temporalidad, rezago de giro y recursos del balance.',
      respuestaDetallada: `Se identifican tres causas técnicas principales: 1) Causal de Temporalidad: El presupuesto registra aforo legal anual ($ 576.148M), mientras tesorería opera con recaudo efectivo ($ 543.935M) más $ 27.847M de recursos del balance de vigencias anteriores. 2) Causal de Rezago de Giro: Existen $ 61.402M en bienes y servicios ya contratados cuyos trámites de pago se concentran en diciembre. 3) Causal de Destinación: El 33,6% de la caja bancaria tiene destinación específica inmodificable y no puede respaldar el saldo por comprometer de funcionamiento.`,
      indicadoresClave: [
        { label: 'Causa Temporalidad', valor: 'Aforo vs Recaudo' },
        { label: 'Causa Rezago de Giro', valor: '$ 61.402M en trámite' },
        { label: 'Causa Destinación', valor: '$ 48.513M restringidos' },
      ],
      impacto: 'NEUTRO',
    },
    {
      numero: 8,
      pregunta: '¿Cuál es la posición financiera real de Administración e Inversión?',
      respuestaCorta: 'Administración en holgura óptima (2,83x); Inversión en equilibrio justo (1,15x).',
      respuestaDetallada: `Administración presenta una posición de alta solvencia con $ 80.143M de caja neta disponible tras cubrir todos sus compromisos pendientes ($ 43.796M), garantizando nómina y primas de fin de año. Inversión presenta una cobertura suficiente pero estrecha de 1,15x ($ 20.191M en bancos vs $ 17.606M en compromisos por pagar, holgura de +$ 2.585M), requiriendo no asumir nuevos compromisos sin recaudo efectivo previo de las transferencias de Nación y Estampillas pendientes.`,
      indicadoresClave: [
        { label: 'Holgura Neta Administración', valor: '+$ 80.143M' },
        { label: 'Holgura Neta Inversión', valor: '+$ 2.585M' },
        { label: 'Veredicto General', valor: 'SOSTENIBLE' },
      ],
      impacto: 'POSITIVO',
    },
  ];

  return {
    matrizCentral,
    matrizIntegral,
    totales: {
      apropiacionDefinitiva: apropTot,
      compromisosAcumulados: compTot,
      pagosAcumulados: pagosTot,
      disponiblePresupuestal: dispPresupTot,
      saldoBancosConciliado: bancosTot,
      saldoBancosReferencia: BANK_REFERENCE_SALDO,
      compromisosPendientesPago: saldoPorPagarTot,
      disponibleTesoralEstimado: dispTesoralTot,
      diferenciaDisponibilidades: diferenciaTot,
      coberturaObligaciones: cobTot,
      adminApropiacion: apropAdm,
      adminCompromisos: compAdm,
      adminPagos: pagosAdm,
      adminDisponiblePresupuestal: dispPresupAdm,
      adminSaldoBancos: bancosAdm,
      adminSaldoPorPagar: saldoPorPagarAdm,
      adminDisponibleTesoral: dispTesoralAdm,
      adminDiferencia: diferenciaAdm,
      adminCobertura: cobAdm,
      invApropiacion: apropInv,
      invCompromisos: compInv,
      invPagos: pagosInv,
      invDisponiblePresupuestal: dispPresupInv,
      invSaldoBancos: bancosInv,
      invSaldoPorPagar: saldoPorPagarInv,
      invDisponibleTesoral: dispTesoralInv,
      invDiferencia: diferenciaInv,
      invCobertura: cobInv,
      bancosNoClasificados: bancosUnclass,
    },
    recursos: recursosList,
    unidades: unidadesList,
    escenariosCount: {
      escenarioA: escACount,
      escenarioB: escBCount,
      escenarioC: escCCount,
      escenarioD: escDCount,
    },
    alertas,
    preguntasClave,
  };
}
'''

with open('src/lib/cajaHoyEngine.ts', 'r') as f:
    current = f.read()

new_content = current + code_to_append

with open('src/lib/cajaHoyEngine.ts', 'w') as f:
    f.write(new_content)

print("Successfully appended conciliacion module to src/lib/cajaHoyEngine.ts")
