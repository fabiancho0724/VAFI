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

function getUnidadKey(row: any): string {
  for (const k of Object.keys(row)) {
    if (k.toLowerCase().includes('unidad')) return String(row[k]);
  }
  return '';
}

export function calculateStrictProjections(
  balanceData: any[],
  ingresosMensuales: any[],
  compromisosData: any[],
  config: StrictConfig
): StrictProjectionResult {
  const alerts: string[] = [];
  const resourcesObj: Record<string, StrictResourceProjection> = {};
  
  // Parse Base Data
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

  // Pre-calculate Monthly Historical Data by Resource
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

  // Process Ingresos Mensuales
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

  // Process Compromisos
  compromisosData.forEach(row => {
    const uni = getUnidadKey(row);
    if (config.filterUnidad !== 'Todos' && !uni.includes(config.filterUnidad)) return;
    const rawCode = String(row['Código recurso'] || row['Recurso'] || '');
    const rec = getRecursoEquivalence(rawCode);
    if (monthlyHist.comp[rec]) {
      const fecha = String(row['Fecha compromiso'] || '');
      const parts = fecha.split('/');
      if (parts.length >= 2) {
        let mIdx = parseInt(parts[1], 10) - 1;
        if (mIdx >= 0 && mIdx < 12) {
          monthlyHist.comp[rec][mIdx] += parseNumber(row['Valor compromiso']);
          monthlyHist.pago[rec][mIdx] += parseNumber(row['Valor pago']);
        }
      }
    }
  });

  // Build Resource Projections
  baseData.forEach(base => {
    const isFixed = NACION_FIXED.includes(base.recurso);
    let ingProyectado = 0;
    
    // We use the aggregated monthly incomes up to August as the base recaudo for projection matching
    // (If the user didn't filter, this should match base.recaudo)
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
    
    let compHistorico = monthlyHist.comp[base.recurso].slice(0, 8).reduce((a,b)=>a+b, 0);
    let pagoHistorico = monthlyHist.pago[base.recurso].slice(0, 8).reduce((a,b)=>a+b, 0);

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
      saldoDisponible: totalIngresos - totalPago
    };
  });

  let targetResources = Object.values(resourcesObj);
  if (config.filterRecurso && config.filterRecurso !== 'Todos') {
    targetResources = targetResources.filter(r => r.recurso === config.filterRecurso || getRecursoEquivalence(r.recurso) === config.filterRecurso);
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
    resultadoProyectado: 0
  };
  totals.resultadoProyectado = totals.totalIngresosProyectados - totals.totalGastosProyectados;

  const flow: StrictFlowItem[] = [];
  let saldoAcum = 0;
  
  MONTHS.forEach((m, idx) => {
    let mIngReal = 0, mIngProy = 0, mComp = 0, mPago = 0;
    
    targetResources.forEach(r => {
      if (idx < 8) { // Ene - Ago
         mIngReal += monthlyHist.ing[r.recurso][idx];
         mComp += monthlyHist.comp[r.recurso][idx];
         mPago += monthlyHist.pago[r.recurso][idx];
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
