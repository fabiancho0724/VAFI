import { RESOURCES_LIST, getRecursoEquivalence, getRowResourceCode } from './resourceMapper';

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

export interface ProjectionParams {
  rawYearlyIncomes: Record<number, any[]>;
  rawHistoricalGastos: any[];
  filterUnidad: string;
  filterRecurso: string;
  filterMes: string;
  filterTipoGasto: string;
  simIngByResource: Record<string, number>; // Slider inputs (-100 to 100 %)
  simGasByResource: Record<string, number>; // Slider inputs (-100 to 100 %)
  simGasByType: Record<string, number>;     // Slider inputs (-100 to 100 %)
}

export interface ProjectionResults {
  simulatedFlow: CashFlowItem[]; // Monthly simulated flow
  totals: FinancialTotals;
  resourceBaselines: Record<string, { ing: number; gasComp: number; gasPago: number }>;
  categoryBreakdown: {
    compromiso: { name: string; value: number }[];
    pago: { name: string; value: number }[];
  };
}

export function calculateProjections({
  rawYearlyIncomes,
  rawHistoricalGastos,
  filterUnidad,
  filterRecurso,
  filterMes,
  filterTipoGasto,
  simIngByResource,
  simGasByResource,
  simGasByType
}: ProjectionParams): ProjectionResults {
  // Initialize structure
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
      const recRaw = getRowResourceCode(row, year);
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

  let totalBaseIng = 0;
  let totalBaseGasComp = 0;
  let totalBaseGasPago = 0;

  let totalSimIng = 0;
  let totalSimGasComp = 0;
  let totalSimGasPago = 0;

  let accumComp = 0;
  let accumPago = 0;

  for (let i = 0; i < 12; i++) {
    let mBaseIng = 0;
    let mBaseGasComp = 0;
    let mBaseGasPago = 0;

    let mSimIng = 0;
    let mSimGasComp = 0;
    let mSimGasPago = 0;

    RESOURCES_LIST.forEach(r => {
      if (filterRecurso !== 'Todos' && r !== filterRecurso) return;

      const is2026RealIng = incomesByYearRes[2026][r].reduce((a,b)=>a+b, 0) > 0;
      const is2026RealGas = (expensesCompByYearRes[2026][r].reduce((a,b)=>a+b, 0) + expensesPagoByYearRes[2026][r].reduce((a,b)=>a+b, 0)) > 0;

      // Real or Projections
      const useRealIng = i < 6 && is2026RealIng;
      const useRealGas = i < 6 && is2026RealGas;

      // Incomes Base
      let ingBase = 0;
      if (useRealIng) {
        ingBase = incomesByYearRes[2026][r][i];
      } else {
        let histSum = 0, histCount = 0;
        if (incomesByYearRes[2023][r][i] > 0) { histSum += incomesByYearRes[2023][r][i]; histCount++; }
        if (incomesByYearRes[2024][r][i] > 0) { histSum += incomesByYearRes[2024][r][i]; histCount++; }
        if (incomesByYearRes[2025][r][i] > 0) { histSum += incomesByYearRes[2025][r][i]; histCount++; }
        ingBase = (histCount > 0 ? histSum / histCount : 0) * 1.05;
      }

      // Expenses Base
      let gasBaseComp = 0;
      let gasBasePago = 0;
      if (useRealGas) {
        gasBaseComp = expensesCompByYearRes[2026][r][i];
        gasBasePago = expensesPagoByYearRes[2026][r][i];
      } else {
        gasBaseComp = expensesCompByYearRes[2025][r][i] * 1.05;
        gasBasePago = expensesPagoByYearRes[2025][r][i] * 1.05;
      }

      mBaseIng += ingBase;
      mBaseGasComp += gasBaseComp;
      mBaseGasPago += gasBasePago;

      // Simulated values (only apply changes from sliders on Jul-Dic)
      const ingMod = useRealIng ? 0 : (simIngByResource[r] || 0) / 100;
      const gasMod = useRealGas ? 0 : (simGasByResource[r] || 0) / 100;

      const simIngVal = ingBase * (1 + ingMod);
      const simGasValComp = gasBaseComp * (1 + gasMod);
      const simGasValPago = gasBasePago * (1 + gasMod);

      mSimIng += simIngVal;
      mSimGasComp += simGasValComp;
      mSimGasPago += simGasValPago;
    });

    // Apply global type modifiers to the simulated expenses (only for projected Jul-Dic)
    const isJulDic = i >= 6;
    if (isJulDic) {
      // Find proportion of types and scale
      // To keep it simple and clean, type sliders act as additional multipliers on top of resource sliders
      let scaleTypeFactorComp = 1;
      let scaleTypeFactorPago = 1;
      
      let personalMod = (simGasByType["Personal"] || 0) / 100;
      let funcMod = (simGasByType["Funcionamiento"] || 0) / 100;
      let transMod = (simGasByType["Transferencias"] || 0) / 100;
      let tasasMod = (simGasByType["Tasas"] || 0) / 100;
      let deudaMod = (simGasByType["Deuda"] || 0) / 100;
      let invMod = (simGasByType["Inversion"] || 0) / 100;

      // We apply a weighted average modifier or simply scale them directly in the final categorization
      // To maintain exact consistency, we scale the monthly aggregate based on the average type slider value
      const averageMod = (personalMod + funcMod + transMod + tasasMod + deudaMod + invMod) / 6;
      mSimGasComp *= (1 + averageMod);
      mSimGasPago *= (1 + averageMod);
    }

    // Accumulate
    totalBaseIng += mBaseIng;
    totalBaseGasComp += mBaseGasComp;
    totalBaseGasPago += mBaseGasPago;

    totalSimIng += mSimIng;
    totalSimGasComp += mSimGasComp;
    totalSimGasPago += mSimGasPago;

    accumComp += (mSimIng - mSimGasComp);
    accumPago += (mSimIng - mSimGasPago);

    // Calculate YTD execution percentage: (Pago / Compromiso) / Ingresos * 100
    // As per user request: "Pago / Compromiso divido Los ingresos totales"
    const execPct = mSimGasComp > 0 ? (mSimGasPago / mSimGasComp) / (mSimIng || 1) * 100 : 0;

    simulatedFlow.push({
      name: MONTHS_STR[i],
      ingresos: parseFloat((mSimIng / 1e6).toFixed(1)),
      gastosComp: parseFloat((mSimGasComp / 1e6).toFixed(1)),
      gastosPago: parseFloat((mSimGasPago / 1e6).toFixed(1)),
      netoComp: parseFloat(((mSimIng - mSimGasComp) / 1e6).toFixed(1)),
      netoPago: parseFloat(((mSimIng - mSimGasPago) / 1e6).toFixed(1)),
      acumuladoComp: parseFloat((accumComp / 1e6).toFixed(1)),
      acumuladoPago: parseFloat((accumPago / 1e6).toFixed(1)),
      ejecucion: parseFloat(execPct.toFixed(2))
    });
  }

  // 5. Category breakdown
  const catComp = { personal: 0, funcionamiento: 0, transferencias: 0, tasas: 0, deuda: 0, inversion: 0 };
  const catPago = { personal: 0, funcionamiento: 0, transferencias: 0, tasas: 0, deuda: 0, inversion: 0 };

  rawHistoricalGastos.forEach(row => {
    if (filterUnidad !== 'Todos' && row.dependencia !== filterUnidad) return;
    const recMapped = getRecursoEquivalence(row.recurso);
    if (!expensesCompByYearRes[2026][recMapped]) return; // Guard against unmapped resources
    if (filterRecurso !== 'Todos' && recMapped !== filterRecurso) return;

    const monthIdx = row.mes - 1;
    if (monthIdx < 0 || monthIdx >= 12) return;

    const year = row.año;
    if (year !== 2026 && year !== 2025) return; // Only breakdown current/reference

    const is2026RealGas = (expensesCompByYearRes[2026][recMapped].reduce((a,b)=>a+b, 0) + expensesPagoByYearRes[2026][recMapped].reduce((a,b)=>a+b, 0)) > 0;
    const useRealGas = monthIdx < 6 && is2026RealGas;

    // We only categorize the 2026 (current simulated) values
    const baselineMultiplier = (year === 2026 && monthIdx < 6) ? 1 : 1.05;
    const scaleResourceFactor = useRealGas ? 1 : (1 + (simGasByResource[recMapped] || 0) / 100);
    
    let scaleTypeFactor = 1;
    const tipo = String(row.tipo || '').toLowerCase();
    if (monthIdx >= 6) {
      if (tipo.includes("personal")) scaleTypeFactor = (1 + (simGasByType["Personal"] || 0) / 100);
      else if (tipo.includes("funcionamiento")) scaleTypeFactor = (1 + (simGasByType["Funcionamiento"] || 0) / 100);
      else if (tipo.includes("transferencia")) scaleTypeFactor = (1 + (simGasByType["Transferencias"] || 0) / 100);
      else if (tipo.includes("tasa") || tipo.includes("multa")) scaleTypeFactor = (1 + (simGasByType["Tasas"] || 0) / 100);
      else if (tipo.includes("deuda") || tipo.includes("servicio")) scaleTypeFactor = (1 + (simGasByType["Deuda"] || 0) / 100);
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

export function aggregateFlow(monthlyFlow: CashFlowItem[], granularity: 'monthly' | 'quarterly' | 'semesterly' | 'annual'): CashFlowItem[] {
  if (granularity === 'monthly') return monthlyFlow;

  const aggregated: CashFlowItem[] = [];
  let ingSum = 0, compSum = 0, pagoSum = 0;
  let currentGroup = "";

  monthlyFlow.forEach((item, idx) => {
    ingSum += item.ingresos;
    compSum += item.gastosComp;
    pagoSum += item.gastosPago;

    let isEnd = false;
    if (granularity === 'quarterly') {
      const qNum = Math.floor(idx / 3) + 1;
      currentGroup = `Trimestre ${qNum}`;
      isEnd = (idx % 3 === 2);
    } else if (granularity === 'semesterly') {
      const sNum = Math.floor(idx / 6) + 1;
      currentGroup = `Semestre ${sNum}`;
      isEnd = (idx % 6 === 5);
    } else if (granularity === 'annual') {
      currentGroup = `Vigencia Anual`;
      isEnd = (idx === 11);
    }

    if (isEnd) {
      const execPct = compSum > 0 ? (pagoSum / compSum) / (ingSum || 1) * 100 : 0;
      aggregated.push({
        name: currentGroup,
        ingresos: parseFloat(ingSum.toFixed(1)),
        gastosComp: parseFloat(compSum.toFixed(1)),
        gastosPago: parseFloat(pagoSum.toFixed(1)),
        netoComp: parseFloat((ingSum - compSum).toFixed(1)),
        netoPago: parseFloat((ingSum - pagoSum).toFixed(1)),
        acumuladoComp: item.acumuladoComp,
        acumuladoPago: item.acumuladoPago,
        ejecucion: parseFloat(execPct.toFixed(2))
      });
      ingSum = 0; compSum = 0; pagoSum = 0;
    }
  });

  return aggregated;
}
