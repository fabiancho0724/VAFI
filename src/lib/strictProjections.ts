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
  compromisoOriginal: number;
  excesoCompromiso: number;
  tieneExceso: boolean;
  ingresosPorMesProyectado: number[];
  ingresoAdministrativo: number;
  methodUsed: string;
  aiIncomeReference: number;
  aiExpenseReference: number;
  trace: TraceNode[];
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

export interface RecursoExcesoItem {
  recurso: string;
  nombre: string;
  ingresos: number;
  compromisoOriginal: number;
  compromisoAjustado: number;
  exceso: number;
  pagosAjustados: number;
}

export interface StrictTotals {
  totalRecursosIniciales: number;
  totalAforo: number;
  totalRecaudo: number;
  totalIngresosProyectados: number;
  totalGastosProyectados: number;
  totalCompromisos: number; // Total compromisos ajustados (<= ingresos)
  totalCompromisosOriginales: number; // Total compromisos contractuales registrados
  totalExcesoCompromisos: number; // Suma de excesos de compromisos sobre ingresos
  totalPagos: number;
  saldoDisponible: number;
  ingresosPorMesProyectado?: number[];
  resultadoProyectado: number;
  recursosConExceso: RecursoExcesoItem[];
  
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

export const GIROS_SIIF_PROYECTADOS: Record<string, number[]> = {
  '10':   [20695590222, 23508369040, 23456386438, 20695555423],
  '10.0': [20695590222, 23508369040, 23456386438, 20695555423],
  '10.1': [0, 2165253520, 0, 0],
  '10.2': [0, 0, 0, 0],
  '10.3': [0, 0, 2229170511, 0],
  '10.5': [0, 0, 0, 0],
  '13':   [0, 0, 0, 0],
  '14':   [0, 0, 0, 0],
  '16.1': [0, 0, 0, 0],
  '17':   [0, 478844455, 478844455, 478844455],
  '18':   [0, 179049568, 179049568, 179049568]
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
  
  const NOMINA_EXACTA_SEP_DIC = [28740288969, 27877151499, 31041344714, 76314557950];
  const TOTAL_NOMINA_SEP_DIC = 163973343133;
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
    const customConfig = config.resourceOverrides ? config.resourceOverrides[base.recurso] : undefined;
    
    const recaudoRealAcumulado = (config.filterUnidad && config.filterUnidad !== 'Todos')
      ? ((monthlyHist.ing[base.recurso] || []).slice(0, 8).reduce((a:number,b:number)=>a+b, 0))
      : base.recaudo;
    const totalRealNomina = expenseTypeReal['2.1.1 Gastos de Personal'] || expenseTypeReal['Personal (Nómina)'] || 1;
    const shareNomina = (expenseTypeResourceReal['2.1.1 Gastos de Personal']?.[base.recurso] || expenseTypeResourceReal['Personal (Nómina)']?.[base.recurso] || 0) / totalRealNomina;
    const nominaAsignada = TOTAL_NOMINA_SEP_DIC * shareNomina;

    const totalRealFunc = expenseTypeReal['2.1.2 Gastos de Funcionamiento'] || expenseTypeReal['Funcionamiento'] || 1;
    const shareFunc = (expenseTypeResourceReal['2.1.2 Gastos de Funcionamiento']?.[base.recurso] || expenseTypeResourceReal['Funcionamiento']?.[base.recurso] || 0) / totalRealFunc;
    const funcAsignada = TOTAL_FUNC_SEP_DIC * shareFunc;
    const compHistorico = (monthlyHist.comp[base.recurso] || []).slice(0, 8).reduce((a:number,b:number)=>a+b, 0);
    const pagoHistorico = (monthlyHist.pago[base.recurso] || []).slice(0, 8).reduce((a:number,b:number)=>a+b, 0);

    const hasManualIncome = customConfig && customConfig.manualIncome !== undefined && customConfig.manualIncome !== null && !isNaN(customConfig.manualIncome);
    const hasManualExpense = customConfig && customConfig.manualExpense !== undefined && customConfig.manualExpense !== null && !isNaN(customConfig.manualExpense);

    let ingProyectado = 0;
    let gasProyectado = 0;
    let trace: TraceNode[] = [];
    let methodUsed = 'Tendencia Histórica';
    
    trace.push({ step: 'Base Aforo', value: base.aforo, detail: 'Aforo oficial' });
    trace.push({ step: 'Recaudo Real', value: recaudoRealAcumulado, detail: config.filterUnidad !== 'Todos' ? `Ene-Ago (Unidad ${config.filterUnidad})` : 'Enero a Agosto' });
    
    const girosExactos = GIROS_SIIF_PROYECTADOS[base.recurso];

    if (hasManualIncome) {
      ingProyectado = customConfig!.manualIncome!;
      methodUsed = 'Ajuste Manual';
      trace.push({ step: 'Ajuste Manual Ingreso', value: ingProyectado, detail: 'Valor fijado manualmente en configuración' });
    } else if (girosExactos) {
      ingProyectado = girosExactos.reduce((a, b) => a + b, 0);
      methodUsed = 'Fijo (SIIF)';
      trace.push({ step: 'Giros Pendientes (SIIF)', value: ingProyectado, detail: 'Valores exactos provistos para Sep-Dic' });
    } else if (isFixed) {
      ingProyectado = Math.max(0, base.siif - recaudoRealAcumulado);
      if (base.siif === 0) ingProyectado = 0;
      methodUsed = 'Fijo (SIIF)';
      trace.push({ step: 'Asignación Fija', value: ingProyectado, detail: 'Saldo restante del SIIF anual' });
    } else if (base.recurso === '31') {
      // REGLA INSTITUCIONAL POSGRADOS:
      // En Escenario Base el recaudo total de todo el año es exactamente $41.088.265.317 COP.
      // Recaudo Real Ene-Ago: $39.764.667.216 -> Saldo Base Sep-Dic = $1.323.598.101 COP.
      const TARGET_TOTAL_POSGRADOS = 41088265317;
      const baseRemPosgrados = Math.max(0, TARGET_TOTAL_POSGRADOS - recaudoRealAcumulado);
      
      let factorPosgrados = 1.0;
      if (config.scenario === 'Optimista') factorPosgrados = 1.05;
      else if (config.scenario === 'Pesimista') factorPosgrados = 0.95;
      else if (config.scenario === 'Personalizado') factorPosgrados = 1 + (effGrowth - 0.041);

      ingProyectado = Math.round(baseRemPosgrados * factorPosgrados);
      methodUsed = config.scenario === 'Base' ? 'Meta Anual Base Posgrados ($41.088M)' : `Meta Posgrados (${config.scenario})`;
      trace.push({ step: 'Meta Posgrados Anual', value: TARGET_TOTAL_POSGRADOS, detail: 'Meta anual base $41.088.265.317' });
      trace.push({ step: 'Proyección Sep-Dic', value: ingProyectado, detail: `Saldo base (${baseRemPosgrados.toLocaleString()}) × Factor (${factorPosgrados})` });
    } else {
      let pendiente = Math.max(0, base.aforo - recaudoRealAcumulado);
      let rRate = (customConfig && customConfig.growthRate !== undefined && customConfig.growthRate !== 0) ? customConfig.growthRate : effGrowth;
      ingProyectado = Math.round(pendiente * (1 + rRate));
      trace.push({ step: 'Cálculo Base Tendencia', value: ingProyectado, detail: `Aforo pendiente (${pendiente.toLocaleString()}) × tasa (${(rRate*100).toFixed(2)}%)` });
    }

    const aiIncomeReference = ingProyectado;
    let totalIngresos = recaudoRealAcumulado + ingProyectado;
    let totalIngresosAI = totalIngresos;
    let aiExpenseReference = Math.max(0, (totalIngresosAI - compHistorico) * effExpense);

    let totalComp = 0;
    let totalPago = 0;
    let compromisoOriginal = 0;
    let excesoCompromiso = 0;

    const isR10 = base.recurso === '10' || base.recurso === '10.0' || base.recurso.includes('10 -');

    // REGLA TÁCTICA INSTITUCIONAL:
    // Dados los históricos y condiciones contractuales de la UPTC, los pagos efectivos a 31 de diciembre
    // siempre están en promedio un 13% por debajo de los compromisos totales (ejecución efectiva del 87%).
    const FACTOR_PAGO_EFECTIVO = 0.87;

    if (hasManualExpense) {
      totalComp = customConfig!.manualExpense!;
      compromisoOriginal = totalComp;
      if (totalComp > totalIngresos) {
        excesoCompromiso = totalComp - totalIngresos;
      }
      gasProyectado = Math.max(0, totalComp - compHistorico);
      totalPago = Math.max(pagoHistorico, Math.round(totalComp * FACTOR_PAGO_EFECTIVO));
      methodUsed = methodUsed + ' / Gasto Manual';
      trace.push({ step: 'Gasto Manual Override', value: totalComp, detail: 'Compromiso total fijado manualmente' });
      trace.push({ step: 'Pago Cierre (87% Efectivo)', value: totalPago, detail: 'Pagos efectivos 13% por debajo de compromisos totales' });
    } else if (isR10) {
      // REGLA INSTITUCIONAL: La diferencia entre el compromiso y el ingreso es de apenas 2.200 millones,
      // concentrada exclusivamente como excedente en el Recurso R10 (Aportes Nación).
      excesoCompromiso = 2200000000;
      compromisoOriginal = totalIngresos + excesoCompromiso;
      totalComp = totalIngresos; // Ajustado en balance al ingreso disponible
      totalPago = Math.max(pagoHistorico, Math.round(totalComp * FACTOR_PAGO_EFECTIVO));
      gasProyectado = Math.max(0, totalComp - compHistorico);
      methodUsed = 'Ajuste Institucional (Excedente R10 $2.200M / Pagos 87%)';
      trace.push({ step: 'Compromiso R10 Original', value: compromisoOriginal, detail: `Ingreso R10 (${totalIngresos}) + Diferencia de $2.200M` });
      trace.push({ step: 'Excedente R10 (Alerta)', value: excesoCompromiso, detail: 'Excedente de compromisos sobre el ingreso' });
      trace.push({ step: 'Compromiso Ajustado', value: totalComp, detail: 'Limitado a ingresos para balance en equilibrio' });
      trace.push({ step: 'Pago Cierre R10 (87% Efectivo)', value: totalPago, detail: 'Pagos efectivos 13% por debajo de compromisos (Reserva de caja 13%)' });
      alerts.push('🚨 ALERTA PRESUPUESTAL: En Recurso 10 (Aportes Nación) existe una diferencia contractual de $2.200.000.000 sobre el ingreso proyectado.');
    } else {
      // En los demás recursos se redistribuyen los compromisos de forma proporcional al ingreso disponible,
      // asegurando que compromiso = ingreso y pago = 87% de compromiso (13% reserva para cuentas por pagar).
      compromisoOriginal = totalIngresos;
      excesoCompromiso = 0;
      totalComp = totalIngresos;
      totalPago = Math.max(pagoHistorico, Math.round(totalComp * FACTOR_PAGO_EFECTIVO));
      gasProyectado = Math.max(0, totalComp - compHistorico);
      trace.push({ step: 'Compromiso Equilibrado', value: totalComp, detail: 'Redistribuido al 100% del ingreso disponible' });
      trace.push({ step: 'Pago Cierre (87% Efectivo)', value: totalPago, detail: 'Pagos efectivos 13% por debajo de compromisos (Reserva de caja 13%)' });
    }
    
    let ingresoAdmin = 0;
    if (base.recurso === '31') ingresoAdmin = totalIngresos * 0.40;
    else if (['10', '10.1', '10.2', '10.5', '12', '13', '14', '16', '16.1', '16.2', '17', '18', '20', '21'].includes(base.recurso)) {
      ingresoAdmin = totalIngresos; 
    }
    
    const saldoDisp = Math.max(0, totalIngresos - totalPago);

    const mWeights = historicWeights[base.recurso] || [0,0,0,0,0,0,0,0, 0.25, 0.25, 0.25, 0.25];
    const girosMatch = (!hasManualIncome && (GIROS_SIIF_PROYECTADOS[base.recurso] || (base.recurso === '10' ? GIROS_SIIF_PROYECTADOS['10.0'] : undefined)));
    const ingresosPorMesProyectado = girosMatch ? [...girosMatch] : [
      ingProyectado * (mWeights[8] || 0.25),
      ingProyectado * (mWeights[9] || 0.25),
      ingProyectado * (mWeights[10] || 0.25),
      ingProyectado * (mWeights[11] || 0.25)
    ];

    resourcesObj[base.recurso] = {
      recurso: base.recurso, nombre: base.nombre,
      ingresosReales: recaudoRealAcumulado, ingresosProyectados: ingProyectado,
      totalIngresos, gastosProyectados: gasProyectado,
      totalCompromisos: totalComp, 
      totalPagos: totalPago,
      saldoDisponible: saldoDisp,
      compromisoOriginal: compromisoOriginal || totalComp,
      excesoCompromiso,
      tieneExceso: excesoCompromiso > 0,
      ingresosPorMesProyectado,
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
  if (config.filterUnidad && config.filterUnidad !== 'Todos') {
    targetResources = targetResources.filter(r => 
      r.ingresosReales > 0 || 
      r.ingresosProyectados > 0 || 
      r.totalCompromisos > 0 || 
      (config.resourceOverrides && config.resourceOverrides[r.recurso] !== undefined)
    );
  }

  const totalIngresoAdmin = targetResources.reduce((acc, r) => acc + r.ingresoAdministrativo, 0);

  const totals: StrictTotals = {
    totalRecursosIniciales: baseData.reduce((acc, r) => acc + r.valorInicial, 0),
    totalAforo: baseData.reduce((acc, r) => acc + r.aforo, 0),
    totalRecaudo: targetResources.reduce((acc, r) => acc + r.ingresosReales, 0),
    totalIngresosProyectados: targetResources.reduce((acc, r) => acc + r.ingresosProyectados, 0),
    totalGastosProyectados: targetResources.reduce((acc, r) => acc + r.gastosProyectados, 0),
    totalCompromisos: targetResources.reduce((acc, r) => acc + r.totalCompromisos, 0),
    totalCompromisosOriginales: targetResources.reduce((acc, r) => acc + (r.compromisoOriginal || r.totalCompromisos), 0),
    totalExcesoCompromisos: targetResources.reduce((acc, r) => acc + (r.excesoCompromiso || 0), 0),
    totalPagos: targetResources.reduce((acc, r) => acc + r.totalPagos, 0),
    saldoDisponible: targetResources.reduce((acc, r) => acc + r.saldoDisponible, 0),
    recursosConExceso: targetResources
      .filter(r => (r.excesoCompromiso || 0) > 0)
      .map(r => ({
        recurso: r.recurso,
        nombre: r.nombre,
        ingresos: r.totalIngresos,
        compromisoOriginal: r.compromisoOriginal || r.totalCompromisos,
        compromisoAjustado: r.totalCompromisos,
        exceso: r.excesoCompromiso || 0,
        pagosAjustados: r.totalPagos
      })),
    ingresosPorMesProyectado: [
      targetResources.reduce((acc, r) => acc + (r.ingresosPorMesProyectado?.[0] || 0), 0),
      targetResources.reduce((acc, r) => acc + (r.ingresosPorMesProyectado?.[1] || 0), 0),
      targetResources.reduce((acc, r) => acc + (r.ingresosPorMesProyectado?.[2] || 0), 0),
      targetResources.reduce((acc, r) => acc + (r.ingresosPorMesProyectado?.[3] || 0), 0),
    ],
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
         const w = historicWeights[r.recurso] ? historicWeights[r.recurso][idx] : 0.25;
         const monthIngProy = (r.ingresosPorMesProyectado && r.ingresosPorMesProyectado[pIdx] !== undefined)
           ? r.ingresosPorMesProyectado[pIdx]
           : (r.ingresosProyectados * w);
         mIngProy += monthIngProy;
         if (!r.ingresosPorMesProyectado) r.ingresosPorMesProyectado = [0,0,0,0];
         r.ingresosPorMesProyectado[pIdx] = monthIngProy;
         
         const compHistRec = (monthlyHist.comp[r.recurso] || []).slice(0, 8).reduce((a:number,b:number)=>a+b, 0);
         const pagoHistRec = (monthlyHist.pago[r.recurso] || []).slice(0, 8).reduce((a:number,b:number)=>a+b, 0);
         const remComp = Math.max(0, r.totalCompromisos - compHistRec);
         const remPago = Math.max(0, r.totalPagos - pagoHistRec);

         mComp += remComp * MONTH_PAGO_WEIGHTS[pIdx];
         mPago += remPago * MONTH_PAGO_WEIGHTS[pIdx];
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
