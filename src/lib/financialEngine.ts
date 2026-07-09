import { RESOURCES_LIST, getRecursoEquivalence } from './resourceMapper';

export interface CashFlowItem {
  name: string; // e.g. "Ene" or "T1"
  ingresos: number;
  gastosComp: number;
  gastosPago: number;
  netoComp: number;
  netoPago: number;
  acumuladoComp: number;
  acumuladoPago: number;
  ejecucion: number; // (pago / compromiso) / ingresos * 100
}

export interface FinancialTotals {
  baselineIng: number;
  baselineGasComp: number;
  baselineGasPago: number;
  baselineNetComp: number;
  baselineNetPago: number;

  simIng: number;
  simGasComp: number;
  simGasPago: number;
  simNetComp: number;
  simNetPago: number;
}

export interface GastoRecord {
  año: number;
  mes: number;
  tipo: string;
  dependencia: string;
  categoria: string;
  recurso: string;
  compromiso: number;
  pago: number;
}

// Aggregates monthly data to different temporal granularities
export function aggregateCashFlow(
  monthlyFlow: CashFlowItem[],
  granularity: 'monthly' | 'quarterly' | 'semesterly' | 'annual'
): CashFlowItem[] {
  if (granularity === 'monthly') {
    return monthlyFlow;
  }

  let groupings: { name: string; months: string[] }[] = [];

  if (granularity === 'quarterly') {
    groupings = [
      { name: 'Trimestre 1 (Ene-Mar)', months: ['Ene', 'Feb', 'Mar'] },
      { name: 'Trimestre 2 (Abr-Jun)', months: ['Abr', 'May', 'Jun'] },
      { name: 'Trimestre 3 (Jul-Sep)', months: ['Jul', 'Ago', 'Sep'] },
      { name: 'Trimestre 4 (Oct-Dic)', months: ['Oct', 'Nov', 'Dic'] }
    ];
  } else if (granularity === 'semesterly') {
    groupings = [
      { name: 'Semestre 1 (Ene-Jun)', months: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'] },
      { name: 'Semestre 2 (Jul-Dic)', months: ['Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'] }
    ];
  } else if (granularity === 'annual') {
    groupings = [
      { name: 'Anual (Ene-Dic)', months: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'] }
    ];
  }

  let rollingComp = 0;
  let rollingPago = 0;

  return groupings.map(group => {
    const matching = monthlyFlow.filter(item => group.months.includes(item.name));
    
    const sumIng = matching.reduce((sum, item) => sum + item.ingresos, 0);
    const sumGasComp = matching.reduce((sum, item) => sum + item.gastosComp, 0);
    const sumGasPago = matching.reduce((sum, item) => sum + item.gastosPago, 0);
    
    const netoComp = sumIng - sumGasComp;
    const netoPago = sumIng - sumGasPago;

    rollingComp += netoComp;
    rollingPago += netoPago;

    // Execution rate: (pago / compromiso) / ingresos * 100
    const ratio = sumGasComp > 0 ? (sumGasPago / sumGasComp) : 0;
    const execRate = sumIng > 0 ? (ratio / sumIng) * 100 : 0;

    return {
      name: group.name,
      ingresos: parseFloat(sumIng.toFixed(1)),
      gastosComp: parseFloat(sumGasComp.toFixed(1)),
      gastosPago: parseFloat(sumGasPago.toFixed(1)),
      netoComp: parseFloat(netoComp.toFixed(1)),
      netoPago: parseFloat(netoPago.toFixed(1)),
      acumuladoComp: parseFloat(rollingComp.toFixed(1)),
      acumuladoPago: parseFloat(rollingPago.toFixed(1)),
      ejecucion: parseFloat(execRate.toFixed(2))
    };
  });
}

// Calculates financial projections and returns simulated flow and totals
export function calculateProjections(params: {
  rawYearlyIncomes: Record<number, any[]>;
  rawHistoricalGastos: GastoRecord[];
  filterUnidad: string;
  filterRecurso: string;
  filterTipoGasto: string;
  simIngByResource: Record<string, number>;
  simGasByResource: Record<string, number>;
  simGasByType: Record<string, number>;
}): {
  simulatedFlow: CashFlowItem[];
  totals: FinancialTotals;
  resourceBaselines: Record<string, { ing: number; gasComp: number; gasPago: number }>;
  categoryBreakdown: { compromiso: any[]; pago: any[] };
} {
  const {
    rawYearlyIncomes,
    rawHistoricalGastos,
    filterUnidad,
    filterRecurso,
    filterTipoGasto,
    simIngByResource,
    simGasByResource,
    simGasByType
  } = params;

  const incomesByYearRes: Record<number, Record<string, number[]>> = {};
  const expensesCompByYearRes: Record<number, Record<string, number[]>> = {};
  const expensesPagoByYearRes: Record<number, Record<string, number[]>> = {};

  [2023, 2024, 2025, 2026].forEach(year => {
    incomesByYearRes[year] = {};
    expensesCompByYearRes[year] = {};
    expensesPagoByYearRes[year] = {};
    
    RESOURCES_LIST.forEach(r => {
      incomesByYearRes[year][r] = new Array(12).fill(0);
      expensesCompByYearRes[year][r] = new Array(12).fill(0);
      expensesPagoByYearRes[year][r] = new Array(12).fill(0);
    });
  });

  // 1. Process Incomes from rawYearlyIncomes
  [2023, 2024, 2025, 2026].forEach(year => {
    const rows = rawYearlyIncomes[year] || [];
    rows.forEach(row => {
      const recRaw = String(row['Recurso'] || '').trim();
      const recMapped = getRecursoEquivalence(recRaw);
      if (!incomesByYearRes[year][recMapped]) return;

      const monthKeys = Object.keys(row).filter(k => k.trim().toLowerCase().startsWith('valor ')).slice(0, 12);
      monthKeys.forEach((key, i) => {
        const val = parseFloat(String(row[key] || '0').replace(/[^0-9.-]+/g, '')) || 0;
        incomesByYearRes[year][recMapped][i] += val;
      });
    });
  });

  // 2. Process Expenses from rawHistoricalGastos
  rawHistoricalGastos.forEach(row => {
    if (filterUnidad !== 'Todos' && row.dependencia !== filterUnidad) return;
    if (filterTipoGasto !== 'Todos' && row.tipo !== filterTipoGasto) return;

    const year = row.año;
    const monthIdx = row.mes - 1;
    const recMapped = getRecursoEquivalence(row.recurso);
    
    if (monthIdx >= 0 && monthIdx < 12 && expensesCompByYearRes[year] && expensesCompByYearRes[year][recMapped]) {
      expensesCompByYearRes[year][recMapped][monthIdx] += row.compromiso;
      expensesPagoByYearRes[year][recMapped][monthIdx] += row.pago;
    }
  });

  // 3. Compute baseline values by resource for comparison (reference)
  const resourceBaselines: Record<string, { ing: number; gasComp: number; gasPago: number }> = {};
  RESOURCES_LIST.forEach(r => {
    let totIng = 0;
    let totGasComp = 0;
    let totGasPago = 0;

    for (let i = 0; i < 12; i++) {
      const is2026RealIng = incomesByYearRes[2026][r].reduce((a,b)=>a+b, 0) > 0;
      const is2026RealGas = (expensesCompByYearRes[2026][r].reduce((a,b)=>a+b, 0) + expensesPagoByYearRes[2026][r].reduce((a,b)=>a+b, 0)) > 0;

      const useRealIng = i < 6 && is2026RealIng;
      const useRealGas = i < 6 && is2026RealGas;

      if (useRealIng) {
        totIng += incomesByYearRes[2026][r][i];
      } else {
        let histSum = 0, histCount = 0;
        if (incomesByYearRes[2023][r][i] > 0) { histSum += incomesByYearRes[2023][r][i]; histCount++; }
        if (incomesByYearRes[2024][r][i] > 0) { histSum += incomesByYearRes[2024][r][i]; histCount++; }
        if (incomesByYearRes[2025][r][i] > 0) { histSum += incomesByYearRes[2025][r][i]; histCount++; }
        totIng += (histCount > 0 ? histSum / histCount : 0) * 1.05;
      }

      if (useRealGas) {
        totGasComp += expensesCompByYearRes[2026][r][i];
        totGasPago += expensesPagoByYearRes[2026][r][i];
      } else {
        totGasComp += expensesCompByYearRes[2025][r][i] * 1.05;
        totGasPago += expensesPagoByYearRes[2025][r][i] * 1.05;
      }
    }

    resourceBaselines[r] = {
      ing: totIng / 1e6,
      gasComp: totGasComp / 1e6,
      gasPago: totGasPago / 1e6
    };
  });

  // 4. Calculate simulated cash flow
  const MONTHS_STR = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const simulatedFlow: CashFlowItem[] = [];

  let baseIngAccum = 0;
  let baseGasCompAccum = 0;
  let baseGasPagoAccum = 0;

  let simIngAccum = 0;
  let simGasCompAccum = 0;
  let simGasPagoAccum = 0;

  let totalBaseIng = 0;
  let totalBaseGasComp = 0;
  let totalBaseGasPago = 0;

  let totalSimIng = 0;
  let totalSimGasComp = 0;
  let totalSimGasPago = 0;

  // Let's pre-process monthly scale factors per resource
  for (let i = 0; i < 12; i++) {
    const isReal = i < 6;

    let monthBaseIng = 0;
    let monthBaseGasComp = 0;
    let monthBaseGasPago = 0;

    let monthSimIng = 0;
    let monthSimGasComp = 0;
    let monthSimGasPago = 0;

    RESOURCES_LIST.forEach(r => {
      if (filterRecurso !== 'Todos' && r !== filterRecurso) return;

      let ingBase = 0;
      let gasCompBase = 0;
      let gasPagoBase = 0;

      if (isReal) {
        ingBase = incomesByYearRes[2026][r][i];
        gasCompBase = expensesCompByYearRes[2026][r][i];
        gasPagoBase = expensesPagoByYearRes[2026][r][i];
      } else {
        // Average of past years
        let histSum = 0, histCount = 0;
        if (incomesByYearRes[2023][r][i] > 0) { histSum += incomesByYearRes[2023][r][i]; histCount++; }
        if (incomesByYearRes[2024][r][i] > 0) { histSum += incomesByYearRes[2024][r][i]; histCount++; }
        if (incomesByYearRes[2025][r][i] > 0) { histSum += incomesByYearRes[2025][r][i]; histCount++; }
        ingBase = (histCount > 0 ? histSum / histCount : 0) * 1.05;

        gasCompBase = expensesCompByYearRes[2025][r][i] * 1.05;
        gasPagoBase = expensesPagoByYearRes[2025][r][i] * 1.05;
      }

      // Projections: Jul-Dic uses sliders
      const simIng = isReal ? ingBase : ingBase * (1 + (simIngByResource[r] || 0) / 100);
      const simGasComp = isReal ? gasCompBase : gasCompBase * (1 + (simGasByResource[r] || 0) / 100);
      const simGasPago = isReal ? gasPagoBase : gasPagoBase * (1 + (simGasByResource[r] || 0) / 100);

      monthBaseIng += ingBase;
      monthBaseGasComp += gasCompBase;
      monthBaseGasPago += gasPagoBase;

      monthSimIng += simIng;
      monthSimGasComp += simGasComp;
      monthSimGasPago += simGasPago;
    });

    totalBaseIng += monthBaseIng;
    totalBaseGasComp += monthBaseGasComp;
    totalBaseGasPago += monthBaseGasPago;

    totalSimIng += monthSimIng;
    totalSimGasComp += monthSimGasComp;
    totalSimGasPago += monthSimGasPago;

    baseIngAccum += monthBaseIng;
    baseGasCompAccum += monthBaseGasComp;
    baseGasPagoAccum += monthBaseGasPago;

    simIngAccum += monthSimIng;
    simGasCompAccum += monthSimGasComp;
    simGasPagoAccum += monthSimGasPago;

    // Execution rate: (pago / compromiso) / ingresos * 100
    const ratio = monthSimGasComp > 0 ? (monthSimGasPago / monthSimGasComp) : 0;
    const execRate = monthSimIng > 0 ? (ratio / monthSimIng) * 100 : 0;

    simulatedFlow.push({
      name: MONTHS_STR[i],
      ingresos: parseFloat((monthSimIng / 1e6).toFixed(1)),
      gastosComp: parseFloat((monthSimGasComp / 1e6).toFixed(1)),
      gastosPago: parseFloat((monthSimGasPago / 1e6).toFixed(1)),
      netoComp: parseFloat(((monthSimIng - monthSimGasComp) / 1e6).toFixed(1)),
      netoPago: parseFloat(((monthSimIng - monthSimGasPago) / 1e6).toFixed(1)),
      acumuladoComp: parseFloat(((simIngAccum - simGasCompAccum) / 1e6).toFixed(1)),
      acumuladoPago: parseFloat(((simIngAccum - simGasPagoAccum) / 1e6).toFixed(1)),
      ejecucion: parseFloat(execRate.toFixed(2))
    });
  }

  // 5. Category Breakdown calculation
  let catComp = { personal: 0, funcionamiento: 0, transferencias: 0, tasas: 0, deuda: 0, inversion: 0 };
  let catPago = { personal: 0, funcionamiento: 0, transferencias: 0, tasas: 0, deuda: 0, inversion: 0 };

  for (let i = 0; i < 12; i++) {
    const isReal = i < 6;
    const targetYear = isReal ? 2026 : 2025;

    const monthlyRows = rawHistoricalGastos.filter(row => row.año === targetYear && row.mes === (i + 1));
    
    monthlyRows.forEach(row => {
      if (filterUnidad !== 'Todos' && row.dependencia !== filterUnidad) return;
      const recMapped = getRecursoEquivalence(row.recurso);
      if (filterRecurso !== 'Todos' && recMapped !== filterRecurso) return;

      const scaleResourceFactor = isReal ? 1 : (1 + (simGasByResource[recMapped] || 0) / 100);
      const baselineMultiplier = isReal ? 1 : 1.05;

      // Apply type of expense multiplier if applicable
      let scaleTypeFactor = 1;
      const tipo = row.tipo;
      if (!isReal) {
        if (tipo.includes("2.1.1")) scaleTypeFactor = (1 + (simGasByType["Personal"] || 0) / 100);
        else if (tipo.includes("2.1.2")) scaleTypeFactor = (1 + (simGasByType["Funcionamiento"] || 0) / 100);
        else if (tipo.includes("2.1.3")) scaleTypeFactor = (1 + (simGasByType["Transferencias"] || 0) / 100);
        else if (tipo.includes("2.1.8")) scaleTypeFactor = (1 + (simGasByType["Tasas"] || 0) / 100);
        else if (tipo.includes("2.2.2")) scaleTypeFactor = (1 + (simGasByType["Deuda"] || 0) / 100);
        else scaleTypeFactor = (1 + (simGasByType["Inversion"] || 0) / 100);
      }

      const compVal = row.compromiso * baselineMultiplier * scaleResourceFactor * scaleTypeFactor;
      const pagoVal = row.pago * baselineMultiplier * scaleResourceFactor * scaleTypeFactor;

      if (tipo.includes("2.1.1")) {
        catComp.personal += compVal; catPago.personal += pagoVal;
      } else if (tipo.includes("2.1.2")) {
        catComp.funcionamiento += compVal; catPago.funcionamiento += pagoVal;
      } else if (tipo.includes("2.1.3")) {
        catComp.transferencias += compVal; catPago.transferencias += pagoVal;
      } else if (tipo.includes("2.1.8")) {
        catComp.tasas += compVal; catPago.tasas += pagoVal;
      } else if (tipo.includes("2.2.2")) {
        catComp.deuda += compVal; catPago.deuda += pagoVal;
      } else {
        catComp.inversion += compVal; catPago.inversion += pagoVal;
      }
    });
  }

  // Adjust overall simulated totals to match category scale
  const simulatedTotalsComp = Object.values(catComp).reduce((a,b)=>a+b, 0) / 1e6;
  const simulatedTotalsPago = Object.values(catPago).reduce((a,b)=>a+b, 0) / 1e6;

  return {
    simulatedFlow,
    totals: {
      baselineIng: totalBaseIng / 1e6,
      baselineGasComp: totalBaseGasComp / 1e6,
      baselineGasPago: totalBaseGasPago / 1e6,
      baselineNetComp: (totalBaseIng - totalBaseGasComp) / 1e6,
      baselineNetPago: (totalBaseIng - totalBaseGasPago) / 1e6,

      simIng: totalSimIng / 1e6,
      simGasComp: simulatedTotalsComp,
      simGasPago: simulatedTotalsPago,
      simNetComp: (totalSimIng / 1e6) - simulatedTotalsComp,
      simNetPago: (totalSimIng / 1e6) - simulatedTotalsPago
    },
    resourceBaselines,
    categoryBreakdown: {
      compromiso: [
        { name: 'Gastos de Personal (2.1.1)', value: parseFloat((catComp.personal / 1e6).toFixed(1)) },
        { name: 'Gastos de Funcionamiento (2.1.2)', value: parseFloat((catComp.funcionamiento / 1e6).toFixed(1)) },
        { name: 'Transferencias Corrientes (2.1.3)', value: parseFloat((catComp.transferencias / 1e6).toFixed(1)) },
        { name: 'Tasas y Multas (2.1.8)', value: parseFloat((catComp.tasas / 1e6).toFixed(1)) },
        { name: 'Servicios de la Deuda (2.2.2)', value: parseFloat((catComp.deuda / 1e6).toFixed(1)) },
        { name: 'Gastos de Inversión (2.3)', value: parseFloat((catComp.inversion / 1e6).toFixed(1)) }
      ],
      pago: [
        { name: 'Gastos de Personal (2.1.1)', value: parseFloat((catPago.personal / 1e6).toFixed(1)) },
        { name: 'Gastos de Funcionamiento (2.1.2)', value: parseFloat((catPago.funcionamiento / 1e6).toFixed(1)) },
        { name: 'Transferencias Corrientes (2.1.3)', value: parseFloat((catPago.transferencias / 1e6).toFixed(1)) },
        { name: 'Tasas y Multas (2.1.8)', value: parseFloat((catPago.tasas / 1e6).toFixed(1)) },
        { name: 'Servicios de la Deuda (2.2.2)', value: parseFloat((catPago.deuda / 1e6).toFixed(1)) },
        { name: 'Gastos de Inversión (2.3)', value: parseFloat((catPago.inversion / 1e6).toFixed(1)) }
      ]
    }
  };
}
