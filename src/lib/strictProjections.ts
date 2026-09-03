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

export interface ResourceConfig {
  method: 'SIIF' | 'Tendencia Histórica' | 'Manual';
  growthRate: number;
  manualIncome?: number;
  manualExpense?: number;
}

export interface StrictConfig {
  scenarioName: string;
  scenario: 'Base' | 'Optimista' | 'Pesimista' | 'Personalizado';
  globalGrowthRate: number;
  globalExpenseRate: number;
  filterRecurso: string;
  filterUnidad: string;
  resourceOverrides: Record<string, ResourceConfig>;
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

export interface TraceNode {
  step: string;
  value: number | string;
  detail: string;
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
  ingresoAdministrativo: number;
  methodUsed: string;
  aiIncomeReference: number;
  aiExpenseReference: number;
  trace: TraceNode[];
  ingresosPorMesProyectado?: number[];
}

export interface ExpenseDetail {
  recurso: string;
  nombre: string;
  valorReal: number;
  valorProyectado: number;
  total: number;
}

export interface ExpenseTypeBreakdown {
  tipo: string;
  valorReal: number;
  valorProyectado: number;
  total: number;
  detalles: ExpenseDetail[];
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
  ingresoAdminTotal: number;
  expenseBreakdown: ExpenseTypeBreakdown[];
}

export interface SensitivityItem {
  variationStr: string;
  variationNum: number;
  ingresos: number;
  gastos: number;
  saldo: number;
  impacto: 'Alto Riesgo' | 'Medio Riesgo' | 'Estable' | 'Favorable';
}

export interface ElasticityItem {
  variable: string;
  elasticity: number;
  rank: number;
}

export interface AISuggestion {
  recurso: string;
  nombre: string;
  mensaje: string;
  tasaSugerida: number;
  valorSugeridoIngreso: number;
  confianza: 'Alta' | 'Media' | 'Baja';
  aiIncomeReference: number;
  aiExpenseReference: number;
}

export interface StrictProjectionResult {
  resources: StrictResourceProjection[];
  flow: StrictFlowItem[];
  totals: StrictTotals;
  alerts: string[];
  sensitivity: SensitivityItem[];
  elasticityRanking: ElasticityItem[];
  suggestions: AISuggestion[];
}

const NACION_FIXED = ['10', '10.1', '10.2', '10.3', '10.5', '12', '13', '14', '16', '16.1', '16.2', '17', '18'];

const GIROS_SIIF_PROYECTADOS: Record<string, number[]> = {
  '10':   [25447028176, 28905581876, 28841664885, 25447028176],
  '10.5': [1720542062, 1720542062, 1720542062, 1720542062],
  '18':   [179049568, 179049568, 179049568, 179049568],
  '17':   [478844455, 478844455, 478844455, 478844455],
  '10.1': [5623807220, 2165253520, 0, 0],
  '10.3': [0, 0, 2229170511, 0]
};
const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const MONTH_KEYS = ['Valor ene', 'Valor feb', 'Valor mar', 'Valor abr', 'Valor may', 'Valor jun', 'Valor jul', 'Valor ago', 'Valor sep', 'Valor oct', 'Valor nov', 'Valor dic'];
const NOMINA_MONTHS_MAP: Record<string, number> = { 'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3, 'mayo': 4, 'junio': 5, 'julio': 6, 'agosto': 7, 'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11 };

function getUnidadKey(row: any): string {
  for (const k of Object.keys(row)) {
    if (k.toLowerCase().includes('unidad')) return String(row[k]);
  }
  return '';
}

function cleanExpenseType(tipo: string): string {
  if (!tipo) return 'Otros';
  const low = tipo.toLowerCase();
  if (low.includes('funcionamiento')) return '2.1.2 Gastos de Funcionamiento';
  if (low.includes('personal')) return '2.1.1 Gastos de Personal';
  if (low.includes('invers')) return '2.3 Gastos de Inversión';
  if (low.includes('transferencias')) return '2.1.3 Transferencias Corrientes';
  if (low.includes('tasas')) return '2.1.8 Tasas y Multas';
  return tipo;
}

// Internal simulation engine
function simulateCore(
  baseData: BaseResource[],
  monthlyHist: any,
  historicWeights: Record<string, number[]>,
  expenseTypeReal: Record<string, number>,
  expenseTypeResourceReal: Record<string, Record<string, number>>,
  nominaStats: { nominaHistTotal: number, missingMonths: number, avgMonthlyNomina: number },
  config: StrictConfig,
  modifierVariations: { incomeVar: number, expenseVar: number },
  gastos2026Parsed?: {
    byRecurso: Record<string, { compromiso: number; pagoAgo: number }>;
    byTipo: Record<string, { compromiso: number; pagoAgo: number }>;
    byTipoRec: Record<string, Record<string, { compromiso: number; pagoAgo: number }>>;
  }
): { resources: StrictResourceProjection[], flow: StrictFlowItem[], totals: StrictTotals, alerts: string[] } {
  
  const alerts: string[] = [];
  const resourcesObj: Record<string, StrictResourceProjection> = {};
  
  let effGrowth = config.globalGrowthRate + modifierVariations.incomeVar;
  let effExpense = config.globalExpenseRate + modifierVariations.expenseVar;
  
  if (config.scenario === 'Optimista') effGrowth += 0.05;
  if (config.scenario === 'Pesimista') effGrowth -= 0.05;
  
  const NOMINA_EXACTA_SEP_DIC = [26166093098, 29651541416, 37230066396, 72131354854];
  const TOTAL_NOMINA_SEP_DIC = 165179055764;
  const nominaProyectadaGlobal = TOTAL_NOMINA_SEP_DIC;

  const TOTAL_FUNC_ANUAL = 131209200000;
  const funcReal = expenseTypeReal['2.1.2 Gastos de Funcionamiento'] || expenseTypeReal['Funcionamiento'] || 0;
  const TOTAL_FUNC_SEP_DIC = Math.max(0, TOTAL_FUNC_ANUAL - funcReal);
  const funcScale = TOTAL_FUNC_SEP_DIC / 14532945667.71;
  const FUNCIONAMIENTO_EXACTO_SEP_DIC = [
      5381650891.99 * funcScale,
      5996809970.69 * funcScale,
      2581881333.37 * funcScale,
      572603471.66 * funcScale
  ];

  baseData.forEach(base => {
    const isFixed = NACION_FIXED.includes(base.recurso);
    const customConfig = config.resourceOverrides[base.recurso];
    
    const recaudoRealAcumulado = base.recaudo;
    const totalRealNomina = expenseTypeReal['2.1.1 Gastos de Personal'] || expenseTypeReal['Personal (Nómina)'] || 1;
    const shareNomina = (expenseTypeResourceReal['2.1.1 Gastos de Personal']?.[base.recurso] || expenseTypeResourceReal['Personal (Nómina)']?.[base.recurso] || 0) / totalRealNomina;
    const nominaAsignada = TOTAL_NOMINA_SEP_DIC * shareNomina;

    const totalRealFunc = expenseTypeReal['2.1.2 Gastos de Funcionamiento'] || expenseTypeReal['Funcionamiento'] || 1;
    const shareFunc = (expenseTypeResourceReal['2.1.2 Gastos de Funcionamiento']?.[base.recurso] || expenseTypeResourceReal['Funcionamiento']?.[base.recurso] || 0) / totalRealFunc;
    const funcAsignada = TOTAL_FUNC_SEP_DIC * shareFunc;
    const compHistorico = (monthlyHist.comp[base.recurso] || []).slice(0, 8).reduce((a:number,b:number)=>a+b, 0);
    const pagoHistorico = (monthlyHist.pago[base.recurso] || []).slice(0, 8).reduce((a:number,b:number)=>a+b, 0);

    let ingProyectado = 0;
    let gasProyectado = 0;
    let trace: TraceNode[] = [];
    let methodUsed = 'Tendencia Histórica';
    
    trace.push({ step: 'Base', value: base.aforo, detail: 'Aforo oficial' });
    trace.push({ step: 'Recaudo Real', value: recaudoRealAcumulado, detail: 'Enero a Agosto' });
    
    const girosExactos = GIROS_SIIF_PROYECTADOS[base.recurso];

    if (girosExactos) {
      ingProyectado = girosExactos.reduce((a, b) => a + b, 0);
      methodUsed = 'Fijo (SIIF)';
      trace.push({ step: 'Giros Pendientes (SIIF)', value: ingProyectado, detail: 'Valores exactos provistos para Sep-Dic' });
    } else if (isFixed) {
      ingProyectado = Math.max(0, base.siif - recaudoRealAcumulado);
      if (base.siif === 0) ingProyectado = 0;
      methodUsed = 'Fijo (SIIF)';
      trace.push({ step: 'Asignación Fija', value: ingProyectado, detail: 'Saldo restante del SIIF anual' });
    } else {
      let pendiente = Math.max(0, base.aforo - recaudoRealAcumulado);
      let rRate = customConfig ? customConfig.growthRate : effGrowth;
      ingProyectado = pendiente * (1 + rRate);
      trace.push({ step: 'Cálculo Base Tendencia', value: ingProyectado, detail: `Aforo pendiente (${pendiente}) × tasa (${(rRate*100).toFixed(1)}%)` });
    }

    const aiIncomeReference = ingProyectado;
    let totalIngresosAI = recaudoRealAcumulado + aiIncomeReference;
    let aiExpenseReference = Math.max(0, (totalIngresosAI - compHistorico) * effExpense);

    let totalComp = 0;
    let totalPago = 0;

    if (gastos2026Parsed && gastos2026Parsed.byRecurso[base.recurso]) {
      const g = gastos2026Parsed.byRecurso[base.recurso];
      totalComp = g.compromiso;
      gasProyectado = Math.max(0, totalComp - compHistorico);
      
      // Regla: El pago iguale al compromiso, sin más compromisos, limitado solo por el recaudo
      const maxPagoPermitido = Math.max(pagoHistorico, totalIngresosAI);
      totalPago = Math.min(totalComp, maxPagoPermitido);
      
      methodUsed = 'Gastos 2026 (Cierre Vigencia)';
      trace.push({ step: 'Compromiso Vigencia Completo', value: totalComp, detail: 'Gastos 2026 oficial sin compromisos adicionales' });
      trace.push({ step: 'Pago Cierre (Tope Recaudo)', value: totalPago, detail: `Pago acercado al compromiso, limitado por recaudo disponible (${totalIngresosAI})` });
      
      if (totalIngresosAI < totalComp) {
        alerts.push(`⚠️ Alerta de Recaudo: ${base.nombre} (R${base.recurso}) tiene compromisos por ${totalComp} pero recaudo proyectado en ${totalIngresosAI}. Pagos limitados a ${totalPago}.`);
      }
    } else {
      gasProyectado = Math.max(aiExpenseReference, nominaAsignada + funcAsignada);
      totalComp = compHistorico + gasProyectado;
      totalPago = pagoHistorico + (gasProyectado * 0.9);

      let minComp = compHistorico + nominaAsignada + funcAsignada;
      if (totalComp > totalIngresosAI) {
        totalComp = Math.max(totalIngresosAI, minComp);
      }
      let minPago = pagoHistorico + nominaAsignada + funcAsignada;
      if (totalPago > totalIngresosAI) totalPago = Math.max(totalIngresosAI, minPago);
      if (totalPago > totalComp) totalPago = totalComp;
    }

    if (customConfig && customConfig.method === 'Manual') {
      if (customConfig.manualIncome !== undefined) ingProyectado = customConfig.manualIncome;
      if (customConfig.manualExpense !== undefined) {
        gasProyectado = customConfig.manualExpense;
        totalComp = compHistorico + gasProyectado;
        totalPago = Math.min(totalComp, pagoHistorico + gasProyectado);
      }
      methodUsed = 'Manual';
      trace.push({ step: 'Ajuste Manual Usuario', value: ingProyectado, detail: 'Valor personalizado' });
    }
    
    let totalIngresos = recaudoRealAcumulado + ingProyectado;
    
    let ingresoAdmin = 0;
    if (base.recurso === '31') ingresoAdmin = totalIngresos * 0.40;
    else if (['10', '10.1', '10.2', '10.5', '12', '13', '14', '16', '16.1', '16.2', '17', '18', '20', '21'].includes(base.recurso)) {
      ingresoAdmin = totalIngresos; 
    }
    
    const saldoDisp = Math.max(0, totalIngresos - totalPago);

    resourcesObj[base.recurso] = {
      recurso: base.recurso, nombre: base.nombre,
      ingresosReales: recaudoRealAcumulado, ingresosProyectados: ingProyectado,
      totalIngresos, gastosProyectados: gasProyectado,
      totalCompromisos: totalComp, totalPagos: totalPago,
      saldoDisponible: saldoDisp,
      ingresoAdministrativo: ingresoAdmin,
      methodUsed, 
      aiIncomeReference, aiExpenseReference, 
      trace
    };
  });

  let targetResources = Object.values(resourcesObj);
  if (config.filterRecurso && config.filterRecurso !== 'Todos') {
    targetResources = targetResources.filter(r => r.recurso === config.filterRecurso || getRecursoEquivalence(r.recurso) === config.filterRecurso);
  }

  const totalIngresoAdmin = targetResources.reduce((acc, r) => acc + r.ingresoAdministrativo, 0);

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
    nominaReal: nominaStats.nominaHistTotal,
    nominaProyectada: nominaProyectadaGlobal,
    nominaTotal: nominaStats.nominaHistTotal + nominaProyectadaGlobal,
    ingresoAdminTotal: totalIngresoAdmin,
    expenseBreakdown: []
  };
  totals.resultadoProyectado = totals.totalIngresosProyectados - totals.totalGastosProyectados;

  if (gastos2026Parsed) {
    let breakdown: ExpenseTypeBreakdown[] = [];
    Object.keys(gastos2026Parsed.byTipo).forEach(tipo => {
      const tData = gastos2026Parsed.byTipo[tipo];
      const detalles: ExpenseDetail[] = [];
      const resMap = gastos2026Parsed.byTipoRec[tipo] || {};
      
      Object.keys(resMap).forEach(rec => {
        const rData = resMap[rec];
        const recBase = baseData.find(b => b.recurso === rec);
        detalles.push({
          recurso: rec,
          nombre: recBase ? recBase.nombre : `Recurso ${rec}`,
          valorReal: rData.pagoAgo,
          valorProyectado: Math.max(0, rData.compromiso - rData.pagoAgo),
          total: rData.compromiso
        });
      });
      detalles.sort((a,b) => b.total - a.total);
      breakdown.push({
        tipo,
        valorReal: tData.pagoAgo,
        valorProyectado: Math.max(0, tData.compromiso - tData.pagoAgo),
        total: tData.compromiso,
        detalles
      });
    });
    totals.expenseBreakdown = breakdown.sort((a,b) => b.total - a.total);
  } else {
    let breakdown: ExpenseTypeBreakdown[] = [];
    let remainingGastoProyectado = totals.totalGastosProyectados - nominaProyectadaGlobal;
    
    Object.keys(expenseTypeReal).forEach(tipo => {
      let proj = 0;
      if (tipo.includes('Personal')) {
         proj = nominaProyectadaGlobal;
      } else if (tipo.includes('Funcionamiento')) {
         proj = TOTAL_FUNC_SEP_DIC;
      } else {
         const totalOthers = totals.totalCompromisos - totals.totalGastosProyectados - (expenseTypeReal['Personal (Nómina)'] || expenseTypeReal['2.1.1 Gastos de Personal'] || 0) - (expenseTypeReal['Funcionamiento'] || expenseTypeReal['2.1.2 Gastos de Funcionamiento'] || 0);
         const weight = totalOthers > 0 ? expenseTypeReal[tipo] / totalOthers : 0;
         proj = Math.max(0, remainingGastoProyectado * weight);
      }
      
      const detalles: ExpenseDetail[] = [];
      const resMap = expenseTypeResourceReal[tipo] || {};
      const totalRealForTipo = expenseTypeReal[tipo] || 1;
      
      Object.keys(resMap).forEach(rec => {
        const realVal = resMap[rec];
        const weight = realVal / totalRealForTipo;
        const recProj = tipo.includes('Personal') ? (rec === '31' ? proj * 0.4 : proj * 0.6) : (proj * weight);
        const recBase = baseData.find(b => b.recurso === rec);
        detalles.push({
          recurso: rec,
          nombre: recBase ? recBase.nombre : rec,
          valorReal: realVal,
          valorProyectado: recProj,
          total: realVal + recProj
        });
      });
      
      detalles.sort((a,b) => b.total - a.total);
      breakdown.push({ tipo, valorReal: expenseTypeReal[tipo], valorProyectado: proj, total: expenseTypeReal[tipo] + proj, detalles });
    });
    totals.expenseBreakdown = breakdown.sort((a,b) => b.total - a.total);
  }

  const flow: StrictFlowItem[] = [];
  let saldoAcum = 0;
  const MONTH_PAGO_WEIGHTS = [0.20, 0.22, 0.26, 0.32]; // Sep, Oct, Nov, Dic

  MONTHS.forEach((m, idx) => {
    let mIngReal = 0, mIngProy = 0, mComp = 0, mPago = 0;
    targetResources.forEach(r => {
      if (idx < 8) {
         mIngReal += (monthlyHist.ing[r.recurso] || [])[idx] || 0;
         mComp += (monthlyHist.comp[r.recurso] || [])[idx] || 0;
         mPago += (monthlyHist.pago[r.recurso] || [])[idx] || 0;
      } else {
         const pIdx = idx - 8;
         const girosExactos = GIROS_SIIF_PROYECTADOS[r.recurso];
         const w = historicWeights[r.recurso] ? historicWeights[r.recurso][idx] : 0.25;
         
         if (!r.ingresosPorMesProyectado) r.ingresosPorMesProyectado = [0,0,0,0];
           
         let monthIngProy = 0;
         if (girosExactos) {
             monthIngProy = girosExactos[pIdx];
         } else {
             monthIngProy = r.ingresosProyectados * w;
         }
         mIngProy += monthIngProy;
         r.ingresosPorMesProyectado[pIdx] = monthIngProy;
         
         if (gastos2026Parsed) {
           const compHistRec = (monthlyHist.comp[r.recurso] || []).slice(0, 8).reduce((a:number,b:number)=>a+b, 0);
           const pagoHistRec = (monthlyHist.pago[r.recurso] || []).slice(0, 8).reduce((a:number,b:number)=>a+b, 0);
           const remComp = Math.max(0, r.totalCompromisos - compHistRec);
           const remPago = Math.max(0, r.totalPagos - pagoHistRec);

           mComp += remComp * MONTH_PAGO_WEIGHTS[pIdx];
           mPago += remPago * MONTH_PAGO_WEIGHTS[pIdx];
         } else {
           const totalRealNomina = expenseTypeReal['2.1.1 Gastos de Personal'] || expenseTypeReal['Personal (Nómina)'] || 1;
           const shareN = (expenseTypeResourceReal['2.1.1 Gastos de Personal']?.[r.recurso] || expenseTypeResourceReal['Personal (Nómina)']?.[r.recurso] || 0) / totalRealNomina;
           const nAsignada = TOTAL_NOMINA_SEP_DIC * shareN;
           const monthlyN = NOMINA_EXACTA_SEP_DIC[pIdx] * shareN;

           const totalRealFunc = expenseTypeReal['2.1.2 Gastos de Funcionamiento'] || expenseTypeReal['Funcionamiento'] || 1;
           const shareF = (expenseTypeResourceReal['2.1.2 Gastos de Funcionamiento']?.[r.recurso] || expenseTypeResourceReal['Funcionamiento']?.[r.recurso] || 0) / totalRealFunc;
           const fAsignada = TOTAL_FUNC_SEP_DIC * shareF;
           const monthlyF = FUNCIONAMIENTO_EXACTO_SEP_DIC[pIdx] * shareF;

           const otherExpense = Math.max(0, r.gastosProyectados - nAsignada - fAsignada);
           
           let w_other = w;
           if (idx === 11) {
               w_other = 0;
           } else if (idx === 10) {
               const dec_w = historicWeights[r.recurso] ? historicWeights[r.recurso][11] : 0.25;
               w_other += dec_w;
           }

           mComp += monthlyN + monthlyF + (otherExpense * w_other);
           mPago += monthlyN + (monthlyF * 0.9) + (otherExpense * 0.9 * w_other);
         }
      }
    });
    
    const totalIng = mIngReal + mIngProy;
    let estado: StrictFlowItem['estado'] = 'Sostenible';
    if (mPago > totalIng) estado = 'Presión financiera';
    if (saldoAcum + totalIng - mPago < 0) estado = 'Déficit';
    else if (saldoAcum + totalIng - mPago < (totalIng * 0.1)) estado = 'Riesgo';

    flow.push({ month: m, ingresosReales: mIngReal, ingresosProyectados: mIngProy, compromisos: mComp, pagos: mPago, saldoInicial: saldoAcum, saldoFinal: saldoAcum + totalIng - mPago, estado });
    saldoAcum += totalIng - mPago;
  });

  return { resources: targetResources, flow, totals, alerts };
}
export function calculateStrictProjections(
  balanceData: any[],
  ingresosMensuales: any[],
  compromisosData: any[],
  nominaData: any[],
  ingresosHistoricos: any[],
  config: StrictConfig,
  gastos2026Data?: any[]
): StrictProjectionResult {
  
  const baseData: BaseResource[] = balanceData.map(row => {
    const raw = String(row['Recurso'] || row['recurso'] || '').trim();
    return {
      recurso: getRecursoEquivalence(raw.split('-')[0].trim()),
      nombre: raw.substring(raw.indexOf('-') + 1).trim() || raw,
      valorInicial: parseNumber(row['Valor inicial']), aforo: parseNumber(row['Aforo']),
      recaudo: parseNumber(row['Recaudo 31/08']), acuerdo: parseNumber(row['Acuerdo']),
      siif: parseNumber(row['SIIF']), totalRecaudo: parseNumber(row['Total Recaudo'])
    };
  }).filter(r => r.recurso !== 'Total general' && r.recurso !== '' && r.recurso !== '15');

  const monthlyHist = { ing: {} as any, comp: {} as any, pago: {} as any };
  baseData.forEach(b => {
    monthlyHist.ing[b.recurso] = new Array(12).fill(0);
    monthlyHist.comp[b.recurso] = new Array(12).fill(0);
    monthlyHist.pago[b.recurso] = new Array(12).fill(0);
  });

  ingresosMensuales.forEach(row => {
    const uni = getUnidadKey(row);
    if (config.filterUnidad !== 'Todos' && !uni.includes(config.filterUnidad)) return;
    const rec = getRecursoEquivalence(String(row['Recurso'] || row['Código recurso'] || ''));
    if (monthlyHist.ing[rec]) {
      MONTH_KEYS.forEach((mk, i) => monthlyHist.ing[rec][i] += parseNumber(row[mk]));
    }
  });

  const expenseTypeReal: Record<string, number> = {};
  const expenseTypeResourceReal: Record<string, Record<string, number>> = {};
  compromisosData.forEach(row => {
    const uni = getUnidadKey(row);
    if (config.filterUnidad !== 'Todos' && !uni.includes(config.filterUnidad)) return;
    const rec = getRecursoEquivalence(String(row['Código recurso'] || row['Recurso'] || ''));
    const tipo = cleanExpenseType(String(row['Tipo de Gasto'] || ''));
    const compVal = parseNumber(row['Valor compromiso']);
    const pagoVal = parseNumber(row['Valor pago']);
    
    if (monthlyHist.comp[rec]) {
      const parts = String(row['Fecha compromiso'] || '').split('/');
      if (parts.length >= 2) {
        let mIdx = parseInt(parts[1], 10) - 1;
        if (mIdx >= 0 && mIdx < 12) {
          monthlyHist.comp[rec][mIdx] += compVal;
          monthlyHist.pago[rec][mIdx] += pagoVal;
          if (!expenseTypeReal[tipo]) expenseTypeReal[tipo] = 0;
          expenseTypeReal[tipo] += compVal;
          if (!expenseTypeResourceReal[tipo]) expenseTypeResourceReal[tipo] = {};
          if (!expenseTypeResourceReal[tipo][rec]) expenseTypeResourceReal[tipo][rec] = 0;
          expenseTypeResourceReal[tipo][rec] += compVal;
        }
      }
    }
  });

  let nominaHistTotal = 0;
  const nominaMonthsPresent = new Set<number>();
  nominaData.forEach(row => {
    const pRaw = String(row['Periodo'] || '').toLowerCase().trim();
    nominaHistTotal += parseNumber(row['Valor liquidacion'] || row['Valor liquidación']);
    if (NOMINA_MONTHS_MAP[pRaw] !== undefined) nominaMonthsPresent.add(NOMINA_MONTHS_MAP[pRaw]);
  });
  
  const nominaMonthsCount = nominaMonthsPresent.size || 1;
  const avgMonthlyNomina = nominaHistTotal / nominaMonthsCount;
  const missingMonths = 12 - nominaMonthsCount;
  const historicWeights: Record<string, number[]> = {};
  baseData.forEach(b => {
    historicWeights[b.recurso] = new Array(12).fill(0.25); // default fallback
  });
  
  ingresosHistoricos.forEach(row => {
    const rec = getRecursoEquivalence(String(row['Recurso'] || row['Código recurso'] || ''));
    if (historicWeights[rec]) {
      const vals = MONTH_KEYS.map(mk => parseNumber(row[mk]));
      const totalLast4 = vals.slice(8).reduce((a,b)=>a+b, 0);
      if (totalLast4 > 0) {
        historicWeights[rec][8] = vals[8] / totalLast4;
        historicWeights[rec][9] = vals[9] / totalLast4;
        historicWeights[rec][10] = vals[10] / totalLast4;
        historicWeights[rec][11] = vals[11] / totalLast4;
      }
    }
  });


  // Parse Gastos 2026 if provided
  let gastos2026Parsed: any = undefined;
  if (gastos2026Data && gastos2026Data.length > 0) {
    const byRecurso: Record<string, { compromiso: number; pagoAgo: number }> = {};
    const byTipo: Record<string, { compromiso: number; pagoAgo: number }> = {};
    const byTipoRec: Record<string, Record<string, { compromiso: number; pagoAgo: number }>> = {};

    gastos2026Data.forEach(r => {
      const uni = getUnidadKey(r);
      if (config.filterUnidad !== 'Todos' && !uni.includes(config.filterUnidad)) return;

      const tKey = Object.keys(r).find(k => k.toLowerCase().includes('tipo'));
      const rKey = Object.keys(r).find(k => k.toLowerCase().includes('recurso'));
      const cKey = Object.keys(r).find(k => k.trim().toLowerCase() === 'compromiso');
      const pKey = Object.keys(r).find(k => k.trim().toLowerCase() === 'valor pago');

      const tipo = cleanExpenseType(String(tKey ? r[tKey] : ''));
      let rec = getRecursoEquivalence(String(rKey ? r[rKey] : ''));
      const comp = parseNumber(cKey ? r[cKey] : 0);
      const pago = parseNumber(pKey ? r[pKey] : 0);

      if (!rec || !tipo) return;

      if (!byRecurso[rec]) byRecurso[rec] = { compromiso: 0, pagoAgo: 0 };
      byRecurso[rec].compromiso += comp;
      byRecurso[rec].pagoAgo += pago;

      if (!byTipo[tipo]) byTipo[tipo] = { compromiso: 0, pagoAgo: 0 };
      byTipo[tipo].compromiso += comp;
      byTipo[tipo].pagoAgo += pago;

      if (!byTipoRec[tipo]) byTipoRec[tipo] = {};
      if (!byTipoRec[tipo][rec]) byTipoRec[tipo][rec] = { compromiso: 0, pagoAgo: 0 };
      byTipoRec[tipo][rec].compromiso += comp;
      byTipoRec[tipo][rec].pagoAgo += pago;
    });

    gastos2026Parsed = { byRecurso, byTipo, byTipoRec };
  }

  // Base Simulation
  const baseSim = simulateCore(baseData, monthlyHist, historicWeights, expenseTypeReal, expenseTypeResourceReal, { nominaHistTotal, missingMonths, avgMonthlyNomina }, config, { incomeVar: 0, expenseVar: 0 }, gastos2026Parsed);

  // AI Suggestions
  const suggestions: AISuggestion[] = [];
  baseSim.resources.forEach(r => {
    if (!NACION_FIXED.includes(r.recurso)) {
      const base = baseData.find(b => b.recurso === r.recurso);
      if (base) {
        const porcentajeCumplimiento = base.aforo > 0 ? (r.ingresosReales / base.aforo) : 0;
        let tasaSugerida = 0;
        let msg = '';
        if (porcentajeCumplimiento > 0.8) {
           tasaSugerida = 0.15;
           msg = 'Excelente comportamiento histórico (>80% aforo). Sugerimos proyección optimista.';
        } else if (porcentajeCumplimiento < 0.3) {
           tasaSugerida = -0.10;
           msg = 'Bajo recaudo histórico (<30% aforo). Riesgo de déficit. Sugerimos proyección conservadora.';
        } else {
           tasaSugerida = 0.05;
           msg = 'Comportamiento estable. Tasa estándar recomendada.';
        }
        const pendiente = Math.max(0, base.aforo - r.ingresosReales);
        let valorSugeridoIngreso = pendiente * (1 + tasaSugerida);
        
        suggestions.push({ 
          recurso: r.recurso, 
          nombre: r.nombre, 
          mensaje: msg, 
          tasaSugerida, 
          valorSugeridoIngreso,
          confianza: 'Alta', 
          aiIncomeReference: r.aiIncomeReference, 
          aiExpenseReference: r.aiExpenseReference 
        });
      }
    }
  });

  // Sensitivity Matrix (-20% to +20%)
  const sensitivity: SensitivityItem[] = [];
  const variations = [-0.20, -0.15, -0.10, -0.05, 0, 0.05, 0.10, 0.15, 0.20];
  
  variations.forEach(v => {
    const sim = simulateCore(baseData, monthlyHist, historicWeights, expenseTypeReal, expenseTypeResourceReal, { nominaHistTotal, missingMonths, avgMonthlyNomina }, config, { incomeVar: v, expenseVar: 0 }, gastos2026Parsed);
    let impacto: SensitivityItem['impacto'] = 'Estable';
    if (sim.totals.saldoDisponible < 0) impacto = 'Alto Riesgo';
    else if (sim.totals.saldoDisponible < baseSim.totals.saldoDisponible * 0.5) impacto = 'Medio Riesgo';
    else if (sim.totals.saldoDisponible > baseSim.totals.saldoDisponible * 1.1) impacto = 'Favorable';

    sensitivity.push({
      variationStr: v > 0 ? `+${(v*100).toFixed(0)}%` : `${(v*100).toFixed(0)}%`,
      variationNum: v,
      ingresos: sim.totals.totalIngresosProyectados,
      gastos: sim.totals.totalGastosProyectados,
      saldo: sim.totals.saldoDisponible,
      impacto
    });
  });

  // Elasticity (Delta Saldo / Delta Ingreso)
  const elasticityRanking: ElasticityItem[] = [];
  const simBaseMatch = sensitivity.find(s => s.variationNum === 0);
  const simPlus10 = sensitivity.find(s => s.variationNum === 0.10);
  if (simBaseMatch && simPlus10 && simBaseMatch.ingresos > 0) {
     const pctIngreso = (simPlus10.ingresos - simBaseMatch.ingresos) / simBaseMatch.ingresos;
     const pctSaldo = simBaseMatch.saldo !== 0 ? (simPlus10.saldo - simBaseMatch.saldo) / simBaseMatch.saldo : 0;
     const eGeneral = pctIngreso !== 0 ? pctSaldo / pctIngreso : 0;
     elasticityRanking.push({ variable: 'Ingresos Globales', elasticity: eGeneral, rank: 1 });
  }

  return {
    resources: baseSim.resources,
    flow: baseSim.flow,
    totals: baseSim.totals,
    alerts: baseSim.alerts,
    sensitivity,
    elasticityRanking,
    suggestions
  };
}
