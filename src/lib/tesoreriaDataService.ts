import { fetchAndParseCSV } from './csvParser';

export interface RawBancoRow {
  Mes: string;
  'No. cuenta': string;
  Banco: string;
  'Nombre de cuenta': string;
  Clase: string;
  Destino: string;
  Fuente: string;
  'Valor inicial': string | number;
  'Valor ingreso': string | number;
  'Valor egreso': string | number;
  'Valor final': string | number;
  Recurso?: string;
}

export interface RawIngresoRow {
  Vigencia: string | number;
  Unidad: string;
  Codigo: string;
  Recurso: string;
  Concepto: string;
  'Valor ene'?: string | number;
  'Valor feb'?: string | number;
  'Valor mar'?: string | number;
  'Valor abr'?: string | number;
  'Valor may'?: string | number;
  'Valor jun'?: string | number;
  'Valor jul'?: string | number;
  'Valor ago'?: string | number;
  'Valor sep'?: string | number;
  'Valor oct'?: string | number;
  'Valor nov'?: string | number;
  'Valor dic'?: string | number;
}

export const MESES_ORDEN = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre'
] as const;

export const MESES_ABR = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep'] as const;

export const RECURSOS_BASE_PRESUPUESTAL = [
  '10', '10.0', '10.1', '10.2', '10.3', '10.4', '10.5', '12', '13', '14', '16', '16.0', '16.1', '16.2', '17', '18'
];

export const NOMBRES_RECURSOS: Record<string, string> = {
  '10': 'R10 - Aportes Nación Funcionamiento',
  '10.0': 'R10.0 - Aportes Nación Funcionamiento',
  '10.1': 'R10.1 - Art. 86 Ley 30 (Nación)',
  '10.2': 'R10.2 - Art. 87 Ley 30 (Nación)',
  '10.3': 'R10.3 - Adicionales Nación',
  '10.5': 'R10.5 - Fomento a la Calidad (Base)',
  '12': 'R12 - Estampilla Pro-UNAL y Estatales',
  '13': 'R13 - Excedentes Cooperativas Art. 142',
  '14': 'R14 - Política de Gratuidad',
  '16': 'R16 - Aportes Departamentales',
  '16.0': 'R16.0 - Aportes Departamentales',
  '16.1': 'R16.1 - Aportes Depto Boyacá Específicos',
  '16.2': 'R16.2 - Aportes Departamentales Varios',
  '17': 'R17 - Devolución Descuento Votación',
  '18': 'R18 - Artículo 87 CESU',
  '20': 'R20 - Recursos Propios (Matrículas Pregrado)',
  '21': 'R21 - Recursos Propios (Matrículas Posgrados)',
  '31': 'R31 - Derechos Pecuniarios y Servicios',
  '32': 'R32 - Extensión, Asesorías y Lab.',
  '33': 'R33 - Otros Servicios Institucionales',
  '34': 'R34 - Arrendamientos y Alquileres',
  '35': 'R35 - Otros Ingresos No Tributarios',
  '40': 'R40 - Rendimientos Financieros y Capital'
};

export function parseCurrency(val: any): number {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const s = String(val).replace(/[\$\s]/g, '').replace(/\./g, '').replace(/,/g, '.');
  const num = parseFloat(s);
  return isNaN(num) ? 0 : num;
}

export function formatCOP(val: number, decimals: number = 1): string {
  if (val === undefined || val === null || isNaN(val)) return '$ 0,0 M';
  const inM = val / 1e6;
  const abs = Math.abs(inM);
  const sign = inM < 0 ? '-' : '';
  return `${sign}$ ${abs.toLocaleString('es-CO', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })} M`;
}

export function formatCOPFull(val: number): string {
  if (val === undefined || val === null || isNaN(val)) return '$ 0';
  const abs = Math.abs(val);
  const sign = val < 0 ? '-' : '';
  return `${sign}$ ${abs.toLocaleString('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  })}`;
}

export interface MesData {
  mes: string;
  mesCorto: string;
  index: number;
  recaudoPresupuestal: number;
  ingresoBancos: number;
  egresoBancos: number;
  flujoNeto: number;
  saldoInicial: number;
  saldoFinal: number;
  brecha: number;
  brechaPct: number;
  recaudoAcumulado: number;
  ingresoBancosAcumulado: number;
  egresoBancosAcumulado: number;
  brechaAcumulada: number;
}

export interface CuentaItem {
  noCuenta: string;
  banco: string;
  nombreCuenta: string;
  clase: string;
  destino: string;
  fuente: string;
  recurso: string;
  saldoInicial: number;
  entradasTotales: number;
  salidasTotales: number;
  flujoNeto: number;
  saldoFinal: number;
  share: number;
  mensual: {
    mes: string;
    mesCorto: string;
    saldoInicial: number;
    entradas: number;
    salidas: number;
    flujoNeto: number;
    saldoFinal: number;
  }[];
}

export interface RecursoItem {
  codigo: string;
  nombre: string;
  esBasePresupuestal: boolean;
  totalRecaudado: number;
  share: number;
  mensual: number[];
  mesPico: { mes: string; valor: number };
  mesValle: { mes: string; valor: number };
  conceptosCount: number;
  topConceptos: { concepto: string; total: number }[];
}

export interface TesoreriaAlert {
  id: string;
  titulo: string;
  tipo: 'critico' | 'preventivo' | 'informativo';
  descripcion: string;
  metrica: string;
  valor: string;
  detalle: string;
}

export interface TesoreriaKPIs {
  recaudoPresupuestalTotal: number;
  recaudoVariacionPrevMes: number;
  recaudoVariacionPrevMesPct: number;
  ingresosBancosTotal: number;
  saldoRealTesoreria: number;
  egresosBancosTotal: number;
  variacionLiquidez: number;
  variacionLiquidezPct: number;
  coberturaCajaMeses: number;
  totalCuentas: number;
  top5ConcentracionPct: number;
  top5SaldoTotal: number;
}

export interface TesoreriaFilterState {
  periodo: string; // 'TODO', 'S1', 'S2', 'Q1', 'Q2', 'Q3', or month name
  categoriaRecurso: 'TODOS' | 'BASE' | 'PROPIOS';
  recurso: string;
  banco: string;
  cuenta: string;
  tipoCuenta: string;
}

export interface TesoreriaProcessedData {
  kpis: TesoreriaKPIs;
  meses: MesData[];
  cuentas: CuentaItem[];
  recursos: RecursoItem[];
  heatmapData: {
    recurso: string;
    nombre: string;
    categoria: 'Base Presupuestal' | 'Otros Recursos';
    valores: number[];
    total: number;
  }[];
  alerts: TesoreriaAlert[];
  executiveSummary: string;
  rawBancos: RawBancoRow[];
  rawIngresos: RawIngresoRow[];
  bancosList: string[];
  cuentasList: { noCuenta: string; label: string }[];
  tiposCuentaList: string[];
}

export async function loadTesoreriaRawData(): Promise<{
  bancos: RawBancoRow[];
  ingresos: RawIngresoRow[];
}> {
  let bancos: RawBancoRow[] = [];
  let ingresos: RawIngresoRow[] = [];

  // Try direct public URLs
  const bancoUrls = ['/data/tesoreria/balance_bancos.csv', '/data/tesoreria/Balance Bancos.csv'];
  const ingresoUrls = ['/data/tesoreria/ingresos_mensual.csv', '/data/tesoreria/Ingresos Mensual.csv'];

  for (const url of bancoUrls) {
    try {
      const res = await fetchAndParseCSV(url);
      if (res && res.length > 0) {
        bancos = res as RawBancoRow[];
        break;
      }
    } catch {
      // try next
    }
  }

  for (const url of ingresoUrls) {
    try {
      const res = await fetchAndParseCSV(url);
      if (res && res.length > 0) {
        ingresos = res as RawIngresoRow[];
        break;
      }
    } catch {
      // try next
    }
  }

  return { bancos, ingresos };
}

export function processTesoreriaData(
  bancosRaw: RawBancoRow[],
  ingresosRaw: RawIngresoRow[],
  filters: TesoreriaFilterState
): TesoreriaProcessedData {
  // 1. Determine active months based on filters.periodo
  let activeMonthIndices: number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  if (filters.periodo === 'S1') {
    activeMonthIndices = [0, 1, 2, 3, 4, 5];
  } else if (filters.periodo === 'S2') {
    activeMonthIndices = [6, 7, 8];
  } else if (filters.periodo === 'Q1') {
    activeMonthIndices = [0, 1, 2];
  } else if (filters.periodo === 'Q2') {
    activeMonthIndices = [3, 4, 5];
  } else if (filters.periodo === 'Q3') {
    activeMonthIndices = [6, 7, 8];
  } else if (filters.periodo !== 'TODO') {
    const idx = MESES_ORDEN.findIndex((m) => m.toLowerCase() === filters.periodo.toLowerCase());
    if (idx !== -1) {
      activeMonthIndices = [idx];
    }
  }

  // Collect distinct filter lists
  const bancosSet = new Set<string>();
  const cuentasMap = new Map<string, string>();
  const tiposCuentaSet = new Set<string>();

  bancosRaw.forEach((r) => {
    if (r.Banco) bancosSet.add(r.Banco.trim());
    if (r['No. cuenta']) {
      const acc = r['No. cuenta'].trim();
      const name = r['Nombre de cuenta'] ? r['Nombre de cuenta'].trim() : '';
      cuentasMap.set(acc, `${acc} - ${name.slice(0, 30)}`);
    }
    if (r.Clase) tiposCuentaSet.add(r.Clase.trim());
  });

  const bancosList = Array.from(bancosSet).sort();
  const cuentasList = Array.from(cuentasMap.entries())
    .map(([noCuenta, label]) => ({ noCuenta, label }))
    .sort((a, b) => a.noCuenta.localeCompare(b.noCuenta));
  const tiposCuentaList = Array.from(tiposCuentaSet).sort();

  // 2. Pre-process bank accounts per account across all 9 months to obtain clean monthly deltas
  const accHistoryMap = new Map<string, Map<string, RawBancoRow>>();
  bancosRaw.forEach((r) => {
    const acc = r['No. cuenta']?.trim();
    if (!acc) return;
    if (!accHistoryMap.has(acc)) {
      accHistoryMap.set(acc, new Map());
    }
    accHistoryMap.get(acc)!.set(r.Mes?.trim(), r);
  });

  interface AccountMonthlyDelta {
    mes: string;
    mesIndex: number;
    saldoInicial: number;
    entradas: number;
    salidas: number;
    flujoNeto: number;
    saldoFinal: number;
  }

  const accountDeltas = new Map<
    string,
    {
      info: RawBancoRow;
      deltas: AccountMonthlyDelta[];
    }
  >();

  accHistoryMap.forEach((monthMap, acc) => {
    let prevIngAcum = 0;
    let prevEgrAcum = 0;
    let sampleInfo: RawBancoRow | null = null;
    const deltas: AccountMonthlyDelta[] = [];

    MESES_ORDEN.forEach((m, idx) => {
      const r = monthMap.get(m);
      if (r) {
        if (!sampleInfo) sampleInfo = r;
        const iniYear = parseCurrency(r['Valor inicial']);
        const ingAcum = parseCurrency(r['Valor ingreso']);
        const egrAcum = parseCurrency(r['Valor egreso']);
        const fin = parseCurrency(r['Valor final']);

        let mEntradas = 0;
        let mSalidas = 0;
        let mInicial = 0;

        if (idx === 0) {
          mEntradas = ingAcum;
          mSalidas = egrAcum;
          mInicial = iniYear;
        } else {
          mEntradas = Math.max(0, ingAcum - prevIngAcum);
          mSalidas = Math.max(0, egrAcum - prevEgrAcum);
          // initial is previous month's final
          const prevRow = monthMap.get(MESES_ORDEN[idx - 1]);
          mInicial = prevRow ? parseCurrency(prevRow['Valor final']) : iniYear;
        }

        prevIngAcum = ingAcum;
        prevEgrAcum = egrAcum;

        deltas.push({
          mes: m,
          mesIndex: idx,
          saldoInicial: mInicial,
          entradas: mEntradas,
          salidas: mSalidas,
          flujoNeto: mEntradas - mSalidas,
          saldoFinal: fin
        });
      }
    });

    if (sampleInfo) {
      accountDeltas.set(acc, { info: sampleInfo, deltas });
    }
  });

  // 3. Filter accounts according to user selection
  const filteredAccounts: {
    acc: string;
    info: RawBancoRow;
    deltas: AccountMonthlyDelta[];
  }[] = [];

  accountDeltas.forEach((data, acc) => {
    if (filters.banco !== 'TODOS' && data.info.Banco?.trim() !== filters.banco) return;
    if (filters.cuenta !== 'TODOS' && acc !== filters.cuenta) return;
    if (filters.tipoCuenta !== 'TODOS' && data.info.Clase?.trim() !== filters.tipoCuenta) return;
    filteredAccounts.push({ acc, info: data.info, deltas: data.deltas });
  });

  // 4. Monthly aggregates for Banks across the active months
  const monthlyBankAgg = MESES_ORDEN.map((m, idx) => {
    let entradas = 0;
    let salidas = 0;
    let saldoInicial = 0;
    let saldoFinal = 0;

    filteredAccounts.forEach((a) => {
      const d = a.deltas.find((x) => x.mesIndex === idx);
      if (d) {
        entradas += d.entradas;
        salidas += d.salidas;
        saldoInicial += d.saldoInicial;
        saldoFinal += d.saldoFinal;
      }
    });

    return {
      mes: m,
      mesCorto: MESES_ABR[idx],
      index: idx,
      entradas,
      salidas,
      flujoNeto: entradas - salidas,
      saldoInicial,
      saldoFinal
    };
  });

  // 5. Budget Revenue Aggregation per month and per resource
  const monthColKeys = [
    'Valor ene',
    'Valor feb',
    'Valor mar',
    'Valor abr',
    'Valor may',
    'Valor jun',
    'Valor jul',
    'Valor ago',
    'Valor sep'
  ];

  // Filter budget rows
  const filteredIngresos = ingresosRaw.filter((r) => {
    const rawRec = String(r.Recurso || '').trim();
    if (filters.recurso !== 'TODOS') {
      if (rawRec !== filters.recurso && rawRec.replace(/\.0$/, '') !== filters.recurso) {
        return false;
      }
    }
    if (filters.categoriaRecurso === 'BASE') {
      const isBase = RECURSOS_BASE_PRESUPUESTAL.some(
        (b) => rawRec === b || rawRec.startsWith(b + '.')
      );
      if (!isBase) return false;
    } else if (filters.categoriaRecurso === 'PROPIOS') {
      const isBase = RECURSOS_BASE_PRESUPUESTAL.some(
        (b) => rawRec === b || rawRec.startsWith(b + '.')
      );
      if (isBase) return false;
    }
    return true;
  });

  const monthlyBudgetAgg = MESES_ORDEN.map((m, idx) => {
    const col = monthColKeys[idx];
    let total = 0;
    filteredIngresos.forEach((r) => {
      total += parseCurrency((r as any)[col]);
    });
    return total;
  });

  // 6. Build Consolidated MesData for active months
  let runningRecaudoAcum = 0;
  let runningIngresoBancosAcum = 0;
  let runningEgresoBancosAcum = 0;

  const allMonthsData: MesData[] = MESES_ORDEN.map((m, idx) => {
    const b = monthlyBankAgg[idx];
    const recaudo = monthlyBudgetAgg[idx];

    runningRecaudoAcum += recaudo;
    runningIngresoBancosAcum += b.entradas;
    runningEgresoBancosAcum += b.salidas;

    const brecha = b.entradas - recaudo;
    const brechaPct = recaudo > 0 ? (brecha / recaudo) * 100 : 0;
    const brechaAcum = runningIngresoBancosAcum - runningRecaudoAcum;

    return {
      mes: m,
      mesCorto: MESES_ABR[idx],
      index: idx,
      recaudoPresupuestal: recaudo,
      ingresoBancos: b.entradas,
      egresoBancos: b.salidas,
      flujoNeto: b.flujoNeto,
      saldoInicial: b.saldoInicial,
      saldoFinal: b.saldoFinal,
      brecha,
      brechaPct,
      recaudoAcumulado: runningRecaudoAcum,
      ingresoBancosAcumulado: runningIngresoBancosAcum,
      egresoBancosAcumulado: runningEgresoBancosAcum,
      brechaAcumulada: brechaAcum
    };
  });

  const activeMesesData = allMonthsData.filter((m) => activeMonthIndices.includes(m.index));

  // 7. Calculate Strategic KPIs for the active selection
  const recaudoTotal = activeMesesData.reduce((acc, m) => acc + m.recaudoPresupuestal, 0);
  const ingresosBancosTotal = activeMesesData.reduce((acc, m) => acc + m.ingresoBancos, 0);
  const egresosBancosTotal = activeMesesData.reduce((acc, m) => acc + m.egresoBancos, 0);

  // Opening balance of first active month, closing balance of last active month
  const firstActiveMonth = activeMesesData[0] || allMonthsData[0];
  const lastActiveMonth = activeMesesData[activeMesesData.length - 1] || allMonthsData[allMonthsData.length - 1];
  const saldoInicialPeriodo = firstActiveMonth ? firstActiveMonth.saldoInicial : 0;
  const saldoRealTesoreria = lastActiveMonth ? lastActiveMonth.saldoFinal : 0;
  const variacionLiquidez = saldoRealTesoreria - saldoInicialPeriodo;
  const variacionLiquidezPct =
    saldoInicialPeriodo > 0 ? (variacionLiquidez / saldoInicialPeriodo) * 100 : 0;

  // Month-over-month recaudo variation (last month vs previous month)
  let recaudoVariacionPrevMes = 0;
  let recaudoVariacionPrevMesPct = 0;
  if (lastActiveMonth && lastActiveMonth.index > 0) {
    const prevMonthData = allMonthsData[lastActiveMonth.index - 1];
    recaudoVariacionPrevMes =
      lastActiveMonth.recaudoPresupuestal - prevMonthData.recaudoPresupuestal;
    recaudoVariacionPrevMesPct =
      prevMonthData.recaudoPresupuestal > 0
        ? (recaudoVariacionPrevMes / prevMonthData.recaudoPresupuestal) * 100
        : 0;
  }

  // Cobertura de caja = Saldo disponible / Promedio mensual de egresos
  const numActiveMonths = activeMesesData.length || 1;
  const promedioMensualEgresos = egresosBancosTotal / numActiveMonths;
  const coberturaCajaMeses =
    promedioMensualEgresos > 0 ? saldoRealTesoreria / promedioMensualEgresos : 0;

  // 8. Account Composition & Ranking at the end of the period
  const totalSaldoFinalCuentas = filteredAccounts.reduce((acc, a) => {
    const lastDelta = a.deltas.find((d) => d.mesIndex === lastActiveMonth.index);
    return acc + (lastDelta ? lastDelta.saldoFinal : 0);
  }, 0);

  const cuentasItems: CuentaItem[] = filteredAccounts
    .map((a) => {
      const lastDelta = a.deltas.find((d) => d.mesIndex === lastActiveMonth.index);
      const firstDelta = a.deltas.find((d) => d.mesIndex === firstActiveMonth.index);
      const sFinal = lastDelta ? lastDelta.saldoFinal : 0;
      const sInicial = firstDelta ? firstDelta.saldoInicial : 0;

      let inTotal = 0;
      let outTotal = 0;
      activeMonthIndices.forEach((idx) => {
        const d = a.deltas.find((x) => x.mesIndex === idx);
        if (d) {
          inTotal += d.entradas;
          outTotal += d.salidas;
        }
      });

      const mensualHistory = activeMesesData.map((m) => {
        const d = a.deltas.find((x) => x.mesIndex === m.index);
        return {
          mes: m.mes,
          mesCorto: m.mesCorto,
          saldoInicial: d ? d.saldoInicial : 0,
          entradas: d ? d.entradas : 0,
          salidas: d ? d.salidas : 0,
          flujoNeto: d ? d.flujoNeto : 0,
          saldoFinal: d ? d.saldoFinal : 0
        };
      });

      return {
        noCuenta: a.acc,
        banco: a.info.Banco?.trim() || 'Sin Banco',
        nombreCuenta: a.info['Nombre de cuenta']?.trim() || a.acc,
        clase: a.info.Clase?.trim() || 'Cuenta',
        destino: a.info.Destino?.trim() || 'General',
        fuente: a.info.Fuente?.trim() || 'N/A',
        recurso: a.info.Recurso?.trim() || 'N/A',
        saldoInicial: sInicial,
        entradasTotales: inTotal,
        salidasTotales: outTotal,
        flujoNeto: inTotal - outTotal,
        saldoFinal: sFinal,
        share: totalSaldoFinalCuentas > 0 ? (sFinal / totalSaldoFinalCuentas) * 100 : 0,
        mensual: mensualHistory
      };
    })
    .sort((a, b) => b.saldoFinal - a.saldoFinal);

  // Top 5 accounts concentration
  const top5Cuentas = cuentasItems.slice(0, 5);
  const top5SaldoTotal = top5Cuentas.reduce((acc, c) => acc + c.saldoFinal, 0);
  const top5ConcentracionPct =
    totalSaldoFinalCuentas > 0 ? (top5SaldoTotal / totalSaldoFinalCuentas) * 100 : 0;

  // 9. Resource Breakdown & Heatmap Matrix
  const resourceMap = new Map<
    string,
    {
      codigo: string;
      nombre: string;
      esBase: boolean;
      total: number;
      mensual: number[];
      conceptosMap: Map<string, { total: number; mensual: number[] }>;
    }
  >();

  filteredIngresos.forEach((r) => {
    let recCode = String(r.Recurso || '').trim();
    if (!recCode) return;
    const cleanKey = recCode;
    const isBase = RECURSOS_BASE_PRESUPUESTAL.some(
      (b) => recCode === b || recCode.startsWith(b + '.')
    );
    const recName = NOMBRES_RECURSOS[recCode] || `Recurso ${recCode}`;

    if (!resourceMap.has(cleanKey)) {
      resourceMap.set(cleanKey, {
        codigo: recCode,
        nombre: recName,
        esBase: isBase,
        total: 0,
        mensual: new Array(9).fill(0),
        conceptosMap: new Map()
      });
    }

    const item = resourceMap.get(cleanKey)!;
    const conceptoName = String(r.Concepto || 'Sin concepto').trim();

    if (!item.conceptosMap.has(conceptoName)) {
      item.conceptosMap.set(conceptoName, { total: 0, mensual: new Array(9).fill(0) });
    }
    const cItem = item.conceptosMap.get(conceptoName)!;

    monthColKeys.forEach((col, mIdx) => {
      const v = parseCurrency((r as any)[col]);
      item.mensual[mIdx] += v;
      if (activeMonthIndices.includes(mIdx)) {
        item.total += v;
        cItem.total += v;
      }
      cItem.mensual[mIdx] += v;
    });
  });

  const recursosItems: RecursoItem[] = Array.from(resourceMap.values())
    .map((r) => {
      let maxVal = -1;
      let minVal = Infinity;
      let picoMes = 'Ene';
      let valleMes = 'Ene';

      activeMonthIndices.forEach((idx) => {
        const val = r.mensual[idx];
        if (val > maxVal) {
          maxVal = val;
          picoMes = MESES_ABR[idx];
        }
        if (val < minVal) {
          minVal = val;
          valleMes = MESES_ABR[idx];
        }
      });

      const topConceptos = Array.from(r.conceptosMap.entries())
        .map(([conc, data]) => ({ concepto: conc, total: data.total }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);

      return {
        codigo: r.codigo,
        nombre: r.nombre,
        esBasePresupuestal: r.esBase,
        totalRecaudado: r.total,
        share: recaudoTotal > 0 ? (r.total / recaudoTotal) * 100 : 0,
        mensual: r.mensual,
        mesPico: { mes: picoMes, valor: maxVal > 0 ? maxVal : 0 },
        mesValle: { mes: valleMes, valor: minVal < Infinity ? minVal : 0 },
        conceptosCount: r.conceptosMap.size,
        topConceptos
      };
    })
    .sort((a, b) => b.totalRecaudado - a.totalRecaudado);

  // Heatmap Data (Recursos vs Meses)
  const heatmapData = recursosItems.map((r) => ({
    recurso: r.codigo,
    nombre: r.nombre,
    categoria: r.esBasePresupuestal ? ('Base Presupuestal' as const) : ('Otros Recursos' as const),
    valores: activeMonthIndices.map((idx) => r.mensual[idx]),
    total: r.totalRecaudado
  }));

  // 10. Intelligent Automated Alerts (6 System Rules)
  const alerts: TesoreriaAlert[] = [];

  // Alerta 1: Caída de liquidez (Detect drop > 10% between consecutive active months)
  for (let i = 1; i < activeMesesData.length; i++) {
    const prev = activeMesesData[i - 1];
    const curr = activeMesesData[i];
    const drop = prev.saldoFinal - curr.saldoFinal;
    if (drop > 0 && prev.saldoFinal > 0) {
      const dropPct = (drop / prev.saldoFinal) * 100;
      if (dropPct >= 10) {
        alerts.push({
          id: `alerta-caida-${curr.mes}`,
          titulo: `Caída de Liquidez en ${curr.mes}`,
          tipo: 'critico',
          descripcion: `El saldo final de tesorería disminuyó en ${formatCOP(drop)} (${dropPct.toFixed(1)}%) pasando de ${formatCOP(prev.saldoFinal)} a ${formatCOP(curr.saldoFinal)}.`,
          metrica: 'Variación de Saldo',
          valor: `-${dropPct.toFixed(1)}%`,
          detalle: `Fuerte presión de tesorería provocada por pagos institucionales concentrados y menores ingresos en el corte.`
        });
      }
    }
  }

  // Alerta 2: Flujo Neto Negativo (Meses donde salidas > entradas)
  const mesesDeficitarios = activeMesesData.filter((m) => m.flujoNeto < 0);
  if (mesesDeficitarios.length > 0) {
    const nombres = mesesDeficitarios.map((m) => m.mes).join(', ');
    const mayorDeficit = [...mesesDeficitarios].sort((a, b) => a.flujoNeto - b.flujoNeto)[0];
    alerts.push({
      id: 'alerta-flujo-negativo',
      titulo: `Flujo Neto de Caja Negativo (${mesesDeficitarios.length} ${mesesDeficitarios.length === 1 ? 'mes' : 'meses'})`,
      tipo: 'preventivo',
      descripcion: `Durante ${nombres}, las salidas de efectivo en bancos superaron a las entradas registradas. El mayor desbalance neto ocurrió en ${mayorDeficit.mes} con un flujo neto de ${formatCOP(mayorDeficit.flujoNeto)}.`,
      metrica: 'Meses Deficitarios',
      valor: `${mesesDeficitarios.length} de ${activeMesesData.length} meses`,
      detalle: `Es habitual en meses de alta cancelación de compromisos contractuales o nómina semestral (ej. primas de mitad de año en junio).`
    });
  }

  // Alerta 3: Brecha Significativa (Entradas bancarias vs Recaudo presupuestal)
  const brechaTotal = ingresosBancosTotal - recaudoTotal;
  if (Math.abs(brechaTotal) > 1e10) {
    alerts.push({
      id: 'alerta-brecha-ppto-bancos',
      titulo: 'Brecha Significativa: Movimientos Bancarios vs. Recaudo Presupuestal',
      tipo: 'informativo',
      descripcion: `Las entradas acumuladas a bancos (${formatCOP(ingresosBancosTotal)}) superan al recaudo presupuestal (${formatCOP(recaudoTotal)}) en una brecha de ${formatCOP(brechaTotal)}.`,
      metrica: 'Brecha de Flujo',
      valor: formatCOP(brechaTotal),
      detalle: `Las diferencias obedecen a traslados internos entre cuentas corrientes y ahorros, rendimientos financieros liquidados, operaciones no presupuestales y temporalidades contables.`
    });
  }

  // Alerta 4: Concentración Alta de Liquidez en Top 5 Cuentas
  if (top5ConcentracionPct >= 60) {
    alerts.push({
      id: 'alerta-concentracion-top5',
      titulo: `Alta Concentración de Liquidez (${top5ConcentracionPct.toFixed(1)}% en Top 5)`,
      tipo: 'preventivo',
      descripcion: `Las 5 cuentas principales concentran ${formatCOP(top5SaldoTotal)} del saldo consolidado de ${formatCOP(totalSaldoFinalCuentas)}. La cuenta con mayor liquidez es ${top5Cuentas[0]?.banco} (${top5Cuentas[0]?.nombreCuenta.slice(0, 30)}) con ${top5Cuentas[0]?.share.toFixed(1)}%.`,
      metrica: 'Índice Top 5',
      valor: `${top5ConcentracionPct.toFixed(1)}%`,
      detalle: `Exige vigilancia prioritaria sobre los cupos de contraparte y transferencias interbancarias para mitigar riesgo de liquidez operativa.`
    });
  }

  // Alerta 5: Disminución o Desaceleración del Recaudo Presupuestal
  for (let i = 1; i < activeMesesData.length; i++) {
    const prev = activeMesesData[i - 1];
    const curr = activeMesesData[i];
    if (prev.recaudoPresupuestal > 0 && curr.recaudoPresupuestal < prev.recaudoPresupuestal) {
      const dropPpto = prev.recaudoPresupuestal - curr.recaudoPresupuestal;
      const dropPct = (dropPpto / prev.recaudoPresupuestal) * 100;
      if (dropPct >= 20) {
        alerts.push({
          id: `alerta-caida-recaudo-${curr.mes}`,
          titulo: `Desaceleración de Recaudo Presupuestal en ${curr.mes}`,
          tipo: 'preventivo',
          descripcion: `El recaudo presupuestal de ${curr.mes} (${formatCOP(curr.recaudoPresupuestal)}) se redujo en ${formatCOP(dropPpto)} (-${dropPct.toFixed(1)}%) frente al mes precedente (${formatCOP(prev.recaudoPresupuestal)}).`,
          metrica: 'Caída de Recaudo',
          valor: `-${dropPct.toFixed(1)}%`,
          detalle: `Identificado en transiciones de períodos académicos o demoras en la radicación de aportes del nivel central.`
        });
      }
    }
  }

  // Alerta 6: Inconsistencia o Saldo Inalterado en Extracto Bancario
  const mesesSinMovimiento = activeMesesData.filter((m) => m.index > 0 && m.ingresoBancos === 0 && m.egresoBancos === 0);
  if (mesesSinMovimiento.length > 0) {
    const nombres = mesesSinMovimiento.map((m) => m.mes).join(', ');
    alerts.push({
      id: 'alerta-extracto-estatico',
      titulo: `Registro Bancario Estático o Acumulativo en ${nombres}`,
      tipo: 'informativo',
      descripcion: `En ${nombres}, la fuente bancaria reportó exactamente los mismos valores acumulados del mes anterior, reflejando 0 movimientos netos en el período.`,
      metrica: 'Meses Estáticos',
      valor: `${mesesSinMovimiento.length} mes(es)`,
      detalle: `Se detectaron extractos contables consolidados de forma bimestral o períodos pendientes de cierre contable en tesorería central.`
    });
  }

  // 11. Automated Executive Summary Text ("Lectura ejecutiva de tesorería")
  const liderRecurso = recursosItems[0];
  const liderCuenta = cuentasItems[0];
  const tendenciaLiquidez =
    variacionLiquidez > 0
      ? `un incremento neto de liquidez por ${formatCOP(variacionLiquidez)} (+${variacionLiquidezPct.toFixed(1)}%)`
      : `una contracción de liquidez de ${formatCOP(Math.abs(variacionLiquidez))} (${variacionLiquidezPct.toFixed(1)}%)`;

  const mesPicoRecaudo = [...activeMesesData].sort(
    (a, b) => b.recaudoPresupuestal - a.recaudoPresupuestal
  )[0];

  const executiveSummary = `Durante el período analizado (${firstActiveMonth?.mes || 'Ene'} - ${lastActiveMonth?.mes || 'Sep'}), el recaudo presupuestal institucional alcanzó un consolidado de ${formatCOP(recaudoTotal)}, impulsado principalmente por ${liderRecurso?.nombre || 'la Nación'} con una participación del ${liderRecurso?.share.toFixed(1)}% (${formatCOP(liderRecurso?.totalRecaudado || 0)}), alcanzando su mes pico en ${mesPicoRecaudo?.mes || 'el período'} con ${formatCOP(mesPicoRecaudo?.recaudoPresupuestal || 0)}. Por su parte, los movimientos reales de entrada registrados en las cuentas bancarias totalizaron ${formatCOP(ingresosBancosTotal)}, frente a egresos por ${formatCOP(egresosBancosTotal)}, arrojando un saldo disponible de cierre de ${formatCOP(saldoRealTesoreria)} y ${tendenciaLiquidez}. La brecha entre entradas bancarias y recaudo presupuestal (${formatCOP(brechaTotal)}) responde a la dinámica operativa de traslados entre cuentas y partidas no presupuestales. La liquidez presenta una concentración del ${top5ConcentracionPct.toFixed(1)}% en las 5 principales cuentas institucionales, encabezadas por ${liderCuenta?.banco || 'Itaú'} (${formatCOP(liderCuenta?.saldoFinal || 0)}), brindando una cobertura de caja estimada en ${coberturaCajaMeses.toFixed(1)} meses de operación institucional.`;

  return {
    kpis: {
      recaudoPresupuestalTotal: recaudoTotal,
      recaudoVariacionPrevMes,
      recaudoVariacionPrevMesPct,
      ingresosBancosTotal,
      saldoRealTesoreria,
      egresosBancosTotal,
      variacionLiquidez,
      variacionLiquidezPct,
      coberturaCajaMeses,
      totalCuentas: filteredAccounts.length,
      top5ConcentracionPct,
      top5SaldoTotal
    },
    meses: activeMesesData,
    cuentas: cuentasItems,
    recursos: recursosItems,
    heatmapData,
    alerts,
    executiveSummary,
    rawBancos: bancosRaw,
    rawIngresos: ingresosRaw,
    bancosList,
    cuentasList,
    tiposCuentaList
  };
}

export function exportTesoreriaCSV(data: TesoreriaProcessedData): void {
  const headers = [
    'Mes',
    'Recaudo Presupuestal (COP)',
    'Entradas Bancos (COP)',
    'Brecha Entradas vs Recaudo (COP)',
    'Salidas Bancos (COP)',
    'Flujo Neto Bancos (COP)',
    'Saldo Final Bancos (COP)',
    'Recaudo Acumulado (COP)',
    'Entradas Bancos Acumulado (COP)',
    'Salidas Bancos Acumulado (COP)'
  ];

  const rows = data.meses.map((m) => [
    m.mes,
    Math.round(m.recaudoPresupuestal),
    Math.round(m.ingresoBancos),
    Math.round(m.brecha),
    Math.round(m.egresoBancos),
    Math.round(m.flujoNeto),
    Math.round(m.saldoFinal),
    Math.round(m.recaudoAcumulado),
    Math.round(m.ingresoBancosAcumulado),
    Math.round(m.egresoBancosAcumulado)
  ]);

  let csvContent = '\uFEFF'; // UTF-8 BOM for Excel
  csvContent += headers.join(';') + '\r\n';
  rows.forEach((r) => {
    csvContent += r.join(';') + '\r\n';
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute(
    'download',
    `Conciliacion_Flujo_Tesoreria_UPTC_${new Date().toISOString().slice(0, 10)}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
