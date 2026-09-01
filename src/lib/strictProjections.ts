import { getRecursoEquivalence } from './resourceMapper';
import { parseNumber } from './csvParser';

export interface BaseResource {
  recurso: string;
  nombre: string;
  valorInicial: number;
  aforo: number;
  recaudo: number;
  acuerdo: number;
  siif: number;
  totalRecaudo: number;
}

export interface StrictConfig {
  growthRate: number;
  expenseRate: number;
  scenario: 'Base' | 'Optimista' | 'Pesimista' | 'Personalizado';
  filterRecurso: string;
  filterUnidad: string;
}

export interface StrictFlowItem {
  month: string;
  ingresosReales: number;
  ingresosProyectados: number;
  compromisos: number;
  pagos: number;
  saldoInicial: number;
  saldoFinal: number;
  estado: 'Sostenible' | 'Riesgo' | 'Presión financiera' | 'Déficit';
}

export interface StrictResourceProjection {
  recurso: string;
  nombre: string;
  ingresosReales: number;
  ingresosProyectados: number;
  totalIngresos: number;
  gastosProyectados: number;
  totalCompromisos: number;
  totalPagos: number;
  saldoDisponible: number;
  ingresoAdministrativo: number; // For the 40% rule
}

export interface ExpenseTypeBreakdown {
  tipo: string;
  valorReal: number;
  valorProyectado: number;
  total: number;
}

export interface StrictTotals {
  totalRecursosIniciales: number;
  totalAforo: number;
  totalRecaudo: number;
  totalIngresosProyectados: number;
  totalGastosProyectados: number;
  totalCompromisos: number;
  totalPagos: number;
  saldoDisponible: number;
  resultadoProyectado: number;
  
  nominaReal: number;
  nominaProyectada: number;
  nominaTotal: number;
  
  ingresoAdminTotal: number; // Total money available for Nomina
  expenseBreakdown: ExpenseTypeBreakdown[];
}

export interface StrictProjectionResult {
  resources: StrictResourceProjection[];
  flow: StrictFlowItem[];
  totals: StrictTotals;
  alerts: string[];
}

const NACION_FIXED = ['10.0', '10.1', '10.2', '10.3', '10.5', '12', '16.0', '16.1', '16.2'];
const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const MONTH_KEYS = ['Valor ene', 'Valor feb', 'Valor mar', 'Valor abr', 'Valor may', 'Valor jun', 'Valor jul', 'Valor ago', 'Valor sep', 'Valor oct', 'Valor nov', 'Valor dic'];

const NOMINA_MONTHS_MAP: Record<string, number> = {
  'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3, 'mayo': 4, 'junio': 5, 'julio': 6, 'agosto': 7, 
  'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11
};

function getUnidadKey(row: any): string {
  for (const k of Object.keys(row)) {
    if (k.toLowerCase().includes('unidad')) return String(row[k]);
  }
  return '';
}

function cleanExpenseType(tipo: string): string {
  if (!tipo) return 'Otros';
  // Standardize e.g. "2.1.2 Gastos de Funcionamiento" -> "Funcionamiento"
  if (tipo.toLowerCase().includes('funcionamiento')) return 'Funcionamiento';
  if (tipo.toLowerCase().includes('personal')) return 'Personal (Nómina)';
  if (tipo.toLowerCase().includes('inversión') || tipo.toLowerCase().includes('inversion')) return 'Inversión';
  if (tipo.toLowerCase().includes('transferencias')) return 'Transferencias';
  if (tipo.toLowerCase().includes('tasas')) return 'Tasas y Multas';
  return tipo;
}

export function calculateStrictProjections(
  balanceData: any[],
  ingresosMensuales: any[],
  compromisosData: any[],
  nominaData: any[],
  config: StrictConfig
): StrictProjectionResult {
  const alerts: string[] = [];
  const resourcesObj: Record<string, StrictResourceProjection> = {};
  
  // 1. Parse Base Data
  const baseData: BaseResource[] = balanceData.map(row => {
    const raw = String(row['Recurso'] || row['recurso'] || '').trim();
    const code = raw.split('-')[0].trim();
    return {
      recurso: code,
      nombre: raw.substring(raw.indexOf('-') + 1).trim() || raw,
      valorInicial: parseNumber(row['Valor inicial']),
      aforo: parseNumber(row['Aforo']),
      recaudo: parseNumber(row['Recaudo 31/08']),
      acuerdo: parseNumber(row['Acuerdo']),
      siif: parseNumber(row['SIIF']),
      totalRecaudo: parseNumber(row['Total Recaudo'])
    };
  }).filter(r => r.recurso !== 'Total general' && r.recurso !== '');

  // 2. Monthly historical containers
  const monthlyHist = {
    ing: {} as Record<string, number[]>,
    comp: {} as Record<string, number[]>,
    pago: {} as Record<string, number[]>
  };
  
  baseData.forEach(b => {
    monthlyHist.ing[b.recurso] = new Array(12).fill(0);
    monthlyHist.comp[b.recurso] = new Array(12).fill(0);
    monthlyHist.pago[b.recurso] = new Array(12).fill(0);
  });

  // 3. Populate Ingresos Mensuales
  ingresosMensuales.forEach(row => {
    const uni = getUnidadKey(row);
    if (config.filterUnidad !== 'Todos' && !uni.includes(config.filterUnidad)) return;
    const rawCode = String(row['Recurso'] || row['Código recurso'] || '');
    const rec = getRecursoEquivalence(rawCode);
    if (monthlyHist.ing[rec]) {
      MONTH_KEYS.forEach((mk, i) => {
        monthlyHist.ing[rec][i] += parseNumber(row[mk]);
      });
    }
  });

  // 4. Populate Compromisos and capture real expenses by type
  const expenseTypeReal: Record<string, number> = {};
  
  compromisosData.forEach(row => {
    const uni = getUnidadKey(row);
    if (config.filterUnidad !== 'Todos' && !uni.includes(config.filterUnidad)) return;
    const rawCode = String(row['Código recurso'] || row['Recurso'] || '');
    const rec = getRecursoEquivalence(rawCode);
    const tipo = cleanExpenseType(String(row['Tipo de Gasto'] || ''));
    
    const compVal = parseNumber(row['Valor compromiso']);
    const pagoVal = parseNumber(row['Valor pago']);
    
    if (monthlyHist.comp[rec]) {
      const fecha = String(row['Fecha compromiso'] || '');
      const parts = fecha.split('/');
      if (parts.length >= 2) {
        let mIdx = parseInt(parts[1], 10) - 1;
        if (mIdx >= 0 && mIdx < 12) {
          monthlyHist.comp[rec][mIdx] += compVal;
          monthlyHist.pago[rec][mIdx] += pagoVal;
          
          if (!expenseTypeReal[tipo]) expenseTypeReal[tipo] = 0;
          expenseTypeReal[tipo] += compVal;
        }
      }
    }
  });

  // 5. Nomina Historical & Projection
  // Rule 4: Nomina projection for missing months based on historical data
  let nominaHistTotal = 0;
  let nominaMonthsCount = 0;
  const nominaMonthsPresent = new Set<number>();
  
  nominaData.forEach(row => {
    const pRaw = String(row['Periodo'] || '').toLowerCase().trim();
    const val = parseNumber(row['Valor liquidacion'] || row['Valor liquidación']);
    nominaHistTotal += val;
    if (NOMINA_MONTHS_MAP[pRaw] !== undefined) {
      nominaMonthsPresent.add(NOMINA_MONTHS_MAP[pRaw]);
    }
  });
  
  nominaMonthsCount = nominaMonthsPresent.size || 1;
  const avgMonthlyNomina = nominaHistTotal / nominaMonthsCount;
  // Project missing months (Assuming we project Sep-Dic, 4 months)
  const missingMonths = 12 - nominaMonthsCount;
  const nominaProyectadaGlobal = avgMonthlyNomina * missingMonths;

  // 6. Build Resource Projections
  baseData.forEach(base => {
    const isFixed = NACION_FIXED.includes(base.recurso);
    let ingProyectado = 0;
    
    // Aggregated real incomes up to August
    const recaudoRealAcumulado = monthlyHist.ing[base.recurso].slice(0, 8).reduce((a,b)=>a+b, 0);

    if (isFixed) {
      ingProyectado = base.siif;
    } else {
      const pendiente = Math.max(0, base.aforo - recaudoRealAcumulado);
      let modifier = 1.0;
      if (config.scenario === 'Optimista') modifier = 1 + config.growthRate;
      if (config.scenario === 'Pesimista') modifier = 1 - config.growthRate;
      if (config.scenario === 'Personalizado') modifier = 1 + config.growthRate;
      ingProyectado = pendiente * modifier;
    }
    
    let totalIngresos = recaudoRealAcumulado + ingProyectado;
    
    // Rule 1: 40% of R31 for Unidad Administrativa
    let ingresoAdmin = 0;
    if (base.recurso === '31') {
      ingresoAdmin = totalIngresos * 0.40;
    } else if (['10.0', '10.1', '10.2', '10.5', '12', '13', '14', '16.0', '17', '18', '20', '21'].includes(base.recurso)) {
      ingresoAdmin = totalIngresos; // Usually 100% of these are for the central admin unit
    }
    
    let compHistorico = monthlyHist.comp[base.recurso].slice(0, 8).reduce((a,b)=>a+b, 0);
    let pagoHistorico = monthlyHist.pago[base.recurso].slice(0, 8).reduce((a,b)=>a+b, 0);

    // Gasto Proyectado (excluding the specific Nomina override later for the pool)
    let gasProyectado = Math.max(0, (totalIngresos - compHistorico) * config.expenseRate);
    let totalComp = compHistorico + gasProyectado;
    let totalPago = pagoHistorico + (gasProyectado * 0.9);

    if (totalComp > totalIngresos) {
      alerts.push(`🔴 Déficit Proyectado: El compromiso en ${base.nombre} supera el recaudo disponible por $${((totalComp - totalIngresos)/1e6).toFixed(1)}M.`);
      totalComp = totalIngresos;
    }
    if (totalPago > totalIngresos) totalPago = totalIngresos;
    if (totalPago > totalComp) totalPago = totalComp;

    resourcesObj[base.recurso] = {
      recurso: base.recurso,
      nombre: base.nombre,
      ingresosReales: recaudoRealAcumulado,
      ingresosProyectados: ingProyectado,
      totalIngresos: totalIngresos,
      gastosProyectados: gasProyectado,
      totalCompromisos: totalComp,
      totalPagos: totalPago,
      saldoDisponible: totalIngresos - totalPago,
      ingresoAdministrativo: ingresoAdmin
    };
  });

  let targetResources = Object.values(resourcesObj);
  if (config.filterRecurso && config.filterRecurso !== 'Todos') {
    targetResources = targetResources.filter(r => r.recurso === config.filterRecurso || getRecursoEquivalence(r.recurso) === config.filterRecurso);
  }

  // 7. Process Totals & Rules
  const totalIngresoAdmin = targetResources.reduce((acc, r) => acc + r.ingresoAdministrativo, 0);
  
  // Rule 2: Only Admin Income can pay for Nomina
  if (nominaHistTotal + nominaProyectadaGlobal > totalIngresoAdmin) {
    alerts.push(`🔴 Déficit en Nómina: El total de Nómina proyectada ($${((nominaHistTotal + nominaProyectadaGlobal)/1e6).toFixed(1)}M) supera los ingresos habilitados para la Unidad Administrativa ($${(totalIngresoAdmin/1e6).toFixed(1)}M).`);
  }

  const totals: StrictTotals = {
    totalRecursosIniciales: baseData.reduce((acc, r) => acc + r.valorInicial, 0),
    totalAforo: baseData.reduce((acc, r) => acc + r.aforo, 0),
    totalRecaudo: targetResources.reduce((acc, r) => acc + r.ingresosReales, 0),
    totalIngresosProyectados: targetResources.reduce((acc, r) => acc + r.ingresosProyectados, 0),
    totalGastosProyectados: targetResources.reduce((acc, r) => acc + r.gastosProyectados, 0),
    totalCompromisos: targetResources.reduce((acc, r) => acc + r.totalCompromisos, 0),
    totalPagos: targetResources.reduce((acc, r) => acc + r.totalPagos, 0),
    saldoDisponible: targetResources.reduce((acc, r) => acc + r.saldoDisponible, 0),
    resultadoProyectado: 0,
    nominaReal: nominaHistTotal,
    nominaProyectada: nominaProyectadaGlobal,
    nominaTotal: nominaHistTotal + nominaProyectadaGlobal,
    ingresoAdminTotal: totalIngresoAdmin,
    expenseBreakdown: []
  };
  totals.resultadoProyectado = totals.totalIngresosProyectados - totals.totalGastosProyectados;

  // Breakdown 
  let breakdown: ExpenseTypeBreakdown[] = [];
  let remainingGastoProyectado = totals.totalGastosProyectados;
  
  // We allocate Nomina Proyectada explicitly to the "Personal (Nómina)" bucket
  const projectedPersonal = nominaProyectadaGlobal;
  remainingGastoProyectado -= projectedPersonal;
  
  Object.keys(expenseTypeReal).forEach(tipo => {
    let proj = 0;
    if (tipo === 'Personal (Nómina)') {
       proj = projectedPersonal;
    } else {
       // Distribute the remaining proportionally based on historical weight
       const totalOthers = totals.totalCompromisos - totals.totalGastosProyectados - (expenseTypeReal['Personal (Nómina)'] || 0);
       const weight = totalOthers > 0 ? expenseTypeReal[tipo] / totalOthers : 0;
       proj = Math.max(0, remainingGastoProyectado * weight);
    }
    
    breakdown.push({
      tipo,
      valorReal: expenseTypeReal[tipo],
      valorProyectado: proj,
      total: expenseTypeReal[tipo] + proj
    });
  });
  totals.expenseBreakdown = breakdown.sort((a,b) => b.total - a.total);

  // 8. Flow Cash Flow simulation
  const flow: StrictFlowItem[] = [];
  let saldoAcum = 0;
  
  MONTHS.forEach((m, idx) => {
    let mIngReal = 0, mIngProy = 0, mComp = 0, mPago = 0;
    
    targetResources.forEach(r => {
      if (idx < 8) { // Ene - Ago
         mIngReal += monthlyHist.ing[r.recurso][idx] || 0;
         mComp += monthlyHist.comp[r.recurso][idx] || 0;
         mPago += monthlyHist.pago[r.recurso][idx] || 0;
      } else { // Sep - Dic
         mIngProy += r.ingresosProyectados / 4;
         mComp += r.gastosProyectados / 4;
         mPago += (r.gastosProyectados * 0.9) / 4;
      }
    });
    
    const totalIng = mIngReal + mIngProy;
    let estado: StrictFlowItem['estado'] = 'Sostenible';
    if (mComp > totalIng) estado = 'Presión financiera';
    if (saldoAcum + totalIng - mPago < 0) estado = 'Déficit';
    else if (saldoAcum + totalIng - mPago < (totalIng * 0.1)) estado = 'Riesgo';

    flow.push({ 
      month: m, 
      ingresosReales: mIngReal, 
      ingresosProyectados: mIngProy, 
      compromisos: mComp, 
      pagos: mPago, 
      saldoInicial: saldoAcum, 
      saldoFinal: saldoAcum + totalIng - mPago, 
      estado 
    });
    saldoAcum += totalIng - mPago;
  });

  return { resources: targetResources, flow, totals, alerts };
}
