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

export function calculateStrictProjections(
  balanceData: any[],
  gastosHist: any[],
  config: StrictConfig
): StrictProjectionResult {
  const alerts: string[] = [];
  const resourcesObj: Record<string, StrictResourceProjection> = {};
  
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

  baseData.forEach(base => {
    const isFixed = NACION_FIXED.includes(base.recurso);
    let ingProyectado = 0;
    if (isFixed) {
      ingProyectado = base.siif;
    } else {
      const pendiente = Math.max(0, base.aforo - base.recaudo);
      let modifier = 1.0;
      if (config.scenario === 'Optimista') modifier = 1 + config.growthRate;
      if (config.scenario === 'Pesimista') modifier = 1 - config.growthRate;
      if (config.scenario === 'Personalizado') modifier = 1 + config.growthRate;
      ingProyectado = pendiente * modifier;
    }
    
    let totalIngresos = base.recaudo + ingProyectado;
    
    let compHistorico = 0;
    let pagoHistorico = 0;
    gastosHist.forEach(g => {
       if (getRecursoEquivalence(g.recurso || '') === base.recurso) {
          compHistorico += parseNumber(g.compromiso);
          pagoHistorico += parseNumber(g.pago);
       }
    });

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
      ingresosReales: base.recaudo,
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
    totalRecaudo: baseData.reduce((acc, r) => acc + r.recaudo, 0),
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
  const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  MONTHS.forEach((m, idx) => {
    let mIngReal = 0, mIngProy = 0, mComp = 0, mPago = 0;
    targetResources.forEach(r => {
      if (idx < 8) {
         mIngReal += r.ingresosReales / 8;
         mComp += (r.totalCompromisos - r.gastosProyectados) / 8;
         mPago += (r.totalPagos - (r.gastosProyectados*0.9)) / 8;
      } else {
         mIngProy += r.ingresosProyectados / 4;
         mComp += r.gastosProyectados / 4;
         mPago += (r.gastosProyectados*0.9) / 4;
      }
    });
    const totalIng = mIngReal + mIngProy;
    let estado: StrictFlowItem['estado'] = 'Sostenible';
    if (mComp > totalIng) estado = 'Presión financiera';
    if (saldoAcum + totalIng - mPago < 0) estado = 'Déficit';
    else if (saldoAcum + totalIng - mPago < (totalIng * 0.1)) estado = 'Riesgo';

    flow.push({ month: m, ingresosReales: mIngReal, ingresosProyectados: mIngProy, compromisos: mComp, pagos: mPago, saldoInicial: saldoAcum, saldoFinal: saldoAcum + totalIng - mPago, estado });
    saldoAcum += totalIng - mPago;
  });

  return { resources: targetResources, flow, totals, alerts };
}
