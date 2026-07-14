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
  rawCumulativeIncomes: any[]; // Cumulative execution report (Ingresos.csv)
  rawHistoricalGastos: any[];
  filterUnidad: string;
  filterRecurso: string;
  filterMes: string;
  filterTipoGasto: string;
  simIngByResource: Record<string, number>; // Slider inputs (-50 to 50 %)
  simGasByResource: Record<string, number>; // Slider inputs (-50 to 50 %)
  simGasByType: Record<string, number>;     // Slider inputs (-50 to 50 %)
  expenseAdjustMode?: 'resource' | 'category';
}

export interface ProjectionResults {
  simulatedFlow: CashFlowItem[]; // Monthly simulated flow
  totals: FinancialTotals;
  resourceBaselines: Record<string, { ing: number; gasComp: number; gasPago: number }>;
  monthlySimIngByRes: Record<string, number[]>;
  monthlySimGasPagoByRes: Record<string, number[]>;
  monthlyBaseIngByRes: Record<string, number[]>;
  monthlyBaseGasPagoByRes: Record<string, number[]>;
  categoryBreakdown: {
    compromiso: { name: string; value: number }[];
    pago: { name: string; value: number }[];
  };
}

export function calculateProjections({
  rawYearlyIncomes,
  rawCumulativeIncomes,
  rawHistoricalGastos,
  filterUnidad,
  filterRecurso,
  filterMes,
  filterTipoGasto,
  simIngByResource,
  simGasByResource,
  simGasByType,
  expenseAdjustMode = 'resource'
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

  // 1. Process Incomes from rawYearlyIncomes (monthly details)
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

  // Extract target recaudo and aforo values per resource from cumulative Ingresos.csv
  const recaudoByResource: Record<string, number> = {};
  const aforoByResource: Record<string, number> = {};
  RESOURCES_LIST.forEach(r => {
    recaudoByResource[r] = 0;
    aforoByResource[r] = 0;
  });

  if (rawCumulativeIncomes && rawCumulativeIncomes.length > 0) {
    rawCumulativeIncomes.forEach(row => {
      const recRaw = getRowResourceCode(row, 2026);
      const recMapped = getRecursoEquivalence(recRaw);
      if (recaudoByResource[recMapped] !== undefined) {
        const recVal = parseFloat(String(row['Total recaudo'] || '0').replace(/[^0-9.-]+/g, '')) || 0;
        const afoVal = parseFloat(String(row['Valor aforo'] || '0').replace(/[^0-9.-]+/g, '')) || 0;
        recaudoByResource[recMapped] += recVal;
        aforoByResource[recMapped] += afoVal;
      }
    });
  }

  // Adjust 2026 Ene-Jun monthly incomes to match cumulative 'Total recaudo' from Ingresos.csv
  RESOURCES_LIST.forEach(r => {
    const targetEneJun = recaudoByResource[r];
    if (targetEneJun > 0) {
      const currentEneJun = incomesByYearRes[2026][r].slice(0, 6).reduce((a,b)=>a+b, 0);
      if (currentEneJun > 0) {
        const factor = targetEneJun / currentEneJun;
        for (let i = 0; i < 6; i++) {
          incomesByYearRes[2026][r][i] *= factor;
        }
      } else {
        // Fallback: distribute evenly
        for (let i = 0; i < 6; i++) {
          incomesByYearRes[2026][r][i] = targetEneJun / 6;
        }
      }
    }
  });

  // Calculate projected baseline totals for Jul-Dic (months 7-12) to calculate scaling factor
  let rawProjectedJulDicTotal = 0;
  RESOURCES_LIST.forEach(r => {
    for (let i = 6; i < 12; i++) {
      let histSum = 0, histCount = 0;
      if (incomesByYearRes[2023][r][i] > 0) { histSum += incomesByYearRes[2023][r][i]; histCount++; }
      if (incomesByYearRes[2024][r][i] > 0) { histSum += incomesByYearRes[2024][r][i]; histCount++; }
      if (incomesByYearRes[2025][r][i] > 0) { histSum += incomesByYearRes[2025][r][i]; histCount++; }
      rawProjectedJulDicTotal += (histCount > 0 ? histSum / histCount : 0) * 1.05;
    }
  });

  // User Target values:
  // Ene-Jun target (Real execution) = $282,995.35M (includes $26.134M balance resources)
  // Base for Jul-Dic projection = $256,861.30M (excluding balance resources)
  // Full Year target (Baseline) = $282,995.35M + $256,861.30M = $539,856.65M
  const targetEneJunTotal = 282995.35257092 * 1e6;
  const targetJulDicTotal = 256861.3 * 1e6;
  const targetFullYearTotal = targetEneJunTotal + targetJulDicTotal;

  const scalingFactorJulDic = rawProjectedJulDicTotal > 0 ? targetJulDicTotal / rawProjectedJulDicTotal : 1;

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

  // 3. Compute baseline values per resource for comparison/reference
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
        totIng += (histCount > 0 ? histSum / histCount : 0) * 1.05 * scalingFactorJulDic;
      }

      if (useRealGas) {
        totGasComp += expensesCompByYearRes[2026][r][i];
        totGasPago += expensesPagoByYearRes[2026][r][i];
      } else {
        totGasComp += expensesCompByYearRes[2025][r][i] * 1.05;
        totGasPago += expensesPagoByYearRes[2025][r][i] * 1.05;
      }
    }

    // Apply baseline capping: baseline expense cannot exceed baseline income for resource r
    if (totGasComp > totIng && totGasComp > 0) {
      const factor = totIng / totGasComp;
      totGasComp *= factor;
      totGasPago *= factor; // Keep same scale
    }

    resourceBaselines[r] = {
      ing: totIng / 1e6,
      gasComp: totGasComp / 1e6,
      gasPago: totGasPago / 1e6
    };
  });

  // 4. Calculate simulated cash flows (Resource and Category level)
  const monthlySimIngByRes: Record<string, number[]> = {};
  const monthlySimGasCompByRes: Record<string, number[]> = {};
  const monthlySimGasPagoByRes: Record<string, number[]> = {};

  const monthlyBaseIngByRes: Record<string, number[]> = {};
  const monthlyBaseGasCompByRes: Record<string, number[]> = {};
  const monthlyBaseGasPagoByRes: Record<string, number[]> = {};

  RESOURCES_LIST.forEach(r => {
    monthlySimIngByRes[r] = new Array(12).fill(0);
    monthlySimGasCompByRes[r] = new Array(12).fill(0);
    monthlySimGasPagoByRes[r] = new Array(12).fill(0);

    monthlyBaseIngByRes[r] = new Array(12).fill(0);
    monthlyBaseGasCompByRes[r] = new Array(12).fill(0);
    monthlyBaseGasPagoByRes[r] = new Array(12).fill(0);
  });

  // Calculate historical distribution weights per category for second semester Jul-Dic 2025
  const resCategoryWeights: Record<string, Record<string, number>> = {};
  const resGasJulDicBaseComp: Record<string, number> = {};
  RESOURCES_LIST.forEach(r => {
    resCategoryWeights[r] = { Personal: 0, Funcionamiento: 0, Transferencias: 0, Tasas: 0, Deuda: 0, Inversion: 0 };
    resGasJulDicBaseComp[r] = 0;
  });

  rawHistoricalGastos.forEach(row => {
    const year = row.año;
    const monthIdx = row.mes - 1;
    if (year === 2025 && monthIdx >= 6) {
      const r = getRecursoEquivalence(row.recurso);
      if (resCategoryWeights[r]) {
        const tipo = String(row.tipo || '').toLowerCase();
        let catKey = 'Inversion';
        if (tipo.includes("2.1.1")) catKey = 'Personal';
        else if (tipo.includes("2.1.2")) catKey = 'Funcionamiento';
        else if (tipo.includes("2.1.3")) catKey = 'Transferencias';
        else if (tipo.includes("2.1.8")) catKey = 'Tasas';
        else if (tipo.includes("2.2.2")) catKey = 'Deuda';

        resCategoryWeights[r][catKey] += row.compromiso;
        resGasJulDicBaseComp[r] += row.compromiso;
      }
    }
  });

  RESOURCES_LIST.forEach(r => {
    const total = resGasJulDicBaseComp[r];
    if (total > 0) {
      Object.keys(resCategoryWeights[r]).forEach(cat => {
        resCategoryWeights[r][cat] /= total;
      });
    } else {
      Object.keys(resCategoryWeights[r]).forEach(cat => {
        resCategoryWeights[r][cat] = 1 / 6;
      });
    }
  });

  // Populating baseline and initial simulated arrays
  for (let i = 0; i < 12; i++) {
    RESOURCES_LIST.forEach(r => {
      const is2026RealIng = incomesByYearRes[2026][r].reduce((a,b)=>a+b, 0) > 0;
      const is2026RealGas = (expensesCompByYearRes[2026][r].reduce((a,b)=>a+b, 0) + expensesPagoByYearRes[2026][r].reduce((a,b)=>a+b, 0)) > 0;

      const useRealIng = i < 6 && is2026RealIng;
      const useRealGas = i < 6 && is2026RealGas;

      // Base Incomes
      let ingBaseVal = 0;
      if (useRealIng) {
        ingBaseVal = incomesByYearRes[2026][r][i];
      } else {
        let histSum = 0, histCount = 0;
        if (incomesByYearRes[2023][r][i] > 0) { histSum += incomesByYearRes[2023][r][i]; histCount++; }
        if (incomesByYearRes[2024][r][i] > 0) { histSum += incomesByYearRes[2024][r][i]; histCount++; }
        if (incomesByYearRes[2025][r][i] > 0) { histSum += incomesByYearRes[2025][r][i]; histCount++; }
        ingBaseVal = (histCount > 0 ? histSum / histCount : 0) * 1.05 * scalingFactorJulDic;
      }

      // Base Expenses
      let gasBaseCompVal = 0;
      let gasBasePagoVal = 0;
      if (useRealGas) {
        gasBaseCompVal = expensesCompByYearRes[2026][r][i];
        gasBasePagoVal = expensesPagoByYearRes[2026][r][i];
      } else {
        gasBaseCompVal = expensesCompByYearRes[2025][r][i] * 1.05;
        gasBasePagoVal = expensesPagoByYearRes[2025][r][i] * 1.05;
      }

      // Save baseline
      monthlyBaseIngByRes[r][i] = ingBaseVal;
      monthlyBaseGasCompByRes[r][i] = gasBaseCompVal;
      monthlyBaseGasPagoByRes[r][i] = gasBasePagoVal;

      // Save simulated (apply resource sliders)
      const ingMod = useRealIng ? 0 : (simIngByResource[r] || 0) / 100;
      const gasMod = (useRealGas || expenseAdjustMode === 'category') ? 0 : (simGasByResource[r] || 0) / 100;

      monthlySimIngByRes[r][i] = ingBaseVal * (1 + ingMod);
      monthlySimGasCompByRes[r][i] = gasBaseCompVal * (1 + gasMod);
      monthlySimGasPagoByRes[r][i] = gasBasePagoVal * (1 + gasMod);
    });

    // Apply global or weighted type modifiers (only for projected Jul-Dic)
    const isJulDic = i >= 6;
    if (isJulDic && expenseAdjustMode === 'category') {
      RESOURCES_LIST.forEach(r => {
        const weights = resCategoryWeights[r];
        const personalMod = (simGasByType["Personal"] || 0) / 100;
        const funcMod = (simGasByType["Funcionamiento"] || 0) / 100;
        const transMod = (simGasByType["Transferencias"] || 0) / 100;
        const tasasMod = (simGasByType["Tasas"] || 0) / 100;
        const deudaMod = (simGasByType["Deuda"] || 0) / 100;
        const invMod = (simGasByType["Inversion"] || 0) / 100;

        const mod = 
          weights.Personal * personalMod +
          weights.Funcionamiento * funcMod +
          weights.Transferencias * transMod +
          weights.Tasas * tasasMod +
          weights.Deuda * deudaMod +
          weights.Inversion * invMod;

        monthlySimGasCompByRes[r][i] = monthlyBaseGasCompByRes[r][i] * (1 + mod);
        monthlySimGasPagoByRes[r][i] = monthlyBaseGasPagoByRes[r][i] * (1 + mod);
      });
    }
  }

  // Enforce budget caps: annual simulated/baseline expenses cannot exceed simulated/baseline income per resource!
  RESOURCES_LIST.forEach(r => {
    // 1. Enforce on Baselines
    const totBaseIng = monthlyBaseIngByRes[r].reduce((a,b)=>a+b, 0);
    const totBaseGasComp = monthlyBaseGasCompByRes[r].reduce((a,b)=>a+b, 0);
    const totBaseGasPago = monthlyBaseGasPagoByRes[r].reduce((a,b)=>a+b, 0);

    if (totBaseGasComp > totBaseIng && totBaseGasComp > 0) {
      const factorComp = totBaseIng / totBaseGasComp;
      for (let i = 0; i < 12; i++) {
        monthlyBaseGasCompByRes[r][i] *= factorComp;
      }
    }
    if (totBaseGasPago > totBaseIng && totBaseGasPago > 0) {
      const factorPago = totBaseIng / totBaseGasPago;
      for (let i = 0; i < 12; i++) {
        monthlyBaseGasPagoByRes[r][i] *= factorPago;
      }
    }

    // 2. Enforce on Simulated
    const totSimIng = monthlySimIngByRes[r].reduce((a,b)=>a+b, 0);
    const totSimGasComp = monthlySimGasCompByRes[r].reduce((a,b)=>a+b, 0);
    const totSimGasPago = monthlySimGasPagoByRes[r].reduce((a,b)=>a+b, 0);

    if (totSimGasComp > totSimIng && totSimGasComp > 0) {
      const factorComp = totSimIng / totSimGasComp;
      for (let i = 0; i < 12; i++) {
        monthlySimGasCompByRes[r][i] *= factorComp;
      }
    }
    if (totSimGasPago > totSimIng && totSimGasPago > 0) {
      const factorPago = totSimIng / totSimGasPago;
      for (let i = 0; i < 12; i++) {
        monthlySimGasPagoByRes[r][i] *= factorPago;
      }
    }
  });

  // 5. Aggregate final monthly cash flow structures
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

  // Calculate Ene-Jun scaling factors to match target real numbers when no filter is applied
  let rawEneJunIng = 0;
  let rawEneJunGasComp = 0;
  let rawEneJunGasPago = 0;

  for (let i = 0; i < 6; i++) {
    RESOURCES_LIST.forEach(r => {
      if (filterRecurso !== 'Todos' && r !== filterRecurso) return;
      rawEneJunIng += monthlySimIngByRes[r][i];
      rawEneJunGasComp += monthlySimGasCompByRes[r][i];
      rawEneJunGasPago += monthlySimGasPagoByRes[r][i];
    });
  }

  const targetEneJunIng = 282995.35257092 * 1e6;
  const targetEneJunComp = 276110.9 * 1e6;
  const targetEneJunPago = 205394.3 * 1e6;

  const factorEneJunIng = (filterRecurso === 'Todos' && rawEneJunIng > 0) ? (targetEneJunIng / rawEneJunIng) : 1;
  const factorEneJunComp = (filterRecurso === 'Todos' && rawEneJunGasComp > 0) ? (targetEneJunComp / rawEneJunGasComp) : 1;
  const factorEneJunPago = (filterRecurso === 'Todos' && rawEneJunGasPago > 0) ? (targetEneJunPago / rawEneJunGasPago) : 1;

  for (let i = 0; i < 12; i++) {
    let mBaseIng = 0;
    let mBaseGasComp = 0;
    let mBaseGasPago = 0;

    let mSimIng = 0;
    let mSimGasComp = 0;
    let mSimGasPago = 0;

    RESOURCES_LIST.forEach(r => {
      if (filterRecurso !== 'Todos' && r !== filterRecurso) return;

      mBaseIng += monthlyBaseIngByRes[r][i];
      mBaseGasComp += monthlyBaseGasCompByRes[r][i];
      mBaseGasPago += monthlyBaseGasPagoByRes[r][i];

      mSimIng += monthlySimIngByRes[r][i];
      mSimGasComp += monthlySimGasCompByRes[r][i];
      mSimGasPago += monthlySimGasPagoByRes[r][i];
    });

    if (i < 6) {
      mBaseIng *= factorEneJunIng;
      mBaseGasComp *= factorEneJunComp;
      mBaseGasPago *= factorEneJunPago;

      mSimIng *= factorEneJunIng;
      mSimGasComp *= factorEneJunComp;
      mSimGasPago *= factorEneJunPago;
    }

    totalBaseIng += mBaseIng;
    totalBaseGasComp += mBaseGasComp;
    totalBaseGasPago += mBaseGasPago;

    totalSimIng += mSimIng;
    totalSimGasComp += mSimGasComp;
    totalSimGasPago += mSimGasPago;

    accumComp += (mSimIng - mSimGasComp);
    accumPago += (mSimIng - mSimGasPago);

    const execPct = mSimIng > 0 ? (mSimGasComp / mSimIng) * 100 : 0;

    simulatedFlow.push({
      name: MONTHS_STR[i],
      ingresos: parseFloat((mSimIng / 1e6).toFixed(1)),
      gastosComp: parseFloat((mSimGasComp / 1e6).toFixed(1)),
      gastosPago: parseFloat((mSimGasPago / 1e6).toFixed(1)),
      netoComp: parseFloat(((mSimIng - mSimGasComp) / 1e6).toFixed(1)),
      netoPago: parseFloat(((mSimIng - mSimGasPago) / 1e6).toFixed(1)),
      acumuladoComp: parseFloat((accumComp / 1e6).toFixed(1)),
      acumuladoPago: parseFloat((accumPago / 1e6).toFixed(1)),
    });
  }

  // Enforce business rules:
  // 1. Total payments CANNOT exceed total incomes: totalSimGasPago <= totalSimIng
  // 2. Total payments should not be lower than total commitments by more than $20,000M: totalSimGasPago >= totalSimGasComp - 20000 * 1e6
  // Rule #1 is a hard limit.

  let targetSimGasPago = totalSimGasPago;
  const maxDifference = 20000 * 1e6; // $20,000M
  
  // Rule 2: try to make payments at least totalComp - 20,000M
  if (totalSimGasComp - targetSimGasPago > maxDifference) {
    targetSimGasPago = totalSimGasComp - maxDifference;
  }
  
  // Rule 1: hard ceiling (payments can NEVER exceed total incomes)
  if (targetSimGasPago > totalSimIng) {
    targetSimGasPago = totalSimIng;
  }

  // Apply adjustment to the second semester
  if (Math.abs(targetSimGasPago - totalSimGasPago) > 1e-3) {
    const adjustmentVal = targetSimGasPago - totalSimGasPago;
    
    // Sum simulated payments for months 6 to 11 (second semester)
    let secondSemesterPagoSum = 0;
    for (let i = 6; i < 12; i++) {
      secondSemesterPagoSum += simulatedFlow[i].gastosPago * 1e6;
    }
    
    if (secondSemesterPagoSum > 0) {
      const factor = (secondSemesterPagoSum + adjustmentVal) / secondSemesterPagoSum;
      for (let i = 6; i < 12; i++) {
        simulatedFlow[i].gastosPago = parseFloat((simulatedFlow[i].gastosPago * factor).toFixed(1));
        // Recompute net and execution
        const ing = simulatedFlow[i].ingresos;
        const comp = simulatedFlow[i].gastosComp;
        const pago = simulatedFlow[i].gastosPago;
        simulatedFlow[i].netoPago = parseFloat((ing - pago).toFixed(1));
      }
      
      // Update totalSimGasPago to our adjusted target
      totalSimGasPago = targetSimGasPago;
      
      // Re-calculate running accumulated values
      let runningAccumPago = 0;
      for (let i = 0; i < 12; i++) {
        const ing = simulatedFlow[i].ingresos;
        const pago = simulatedFlow[i].gastosPago;
        runningAccumPago += (ing - pago);
        simulatedFlow[i].acumuladoPago = parseFloat(runningAccumPago.toFixed(1));
      }
    }
  }

  // 6. Category breakdown aligned with capped outputs
  const catComp = { personal: 0, funcionamiento: 0, transferencias: 0, tasas: 0, deuda: 0, inversion: 0 };
  const catPago = { personal: 0, funcionamiento: 0, transferencias: 0, tasas: 0, deuda: 0, inversion: 0 };

  rawHistoricalGastos.forEach(row => {
    if (filterUnidad !== 'Todos' && row.dependencia !== filterUnidad) return;
    const recMapped = getRecursoEquivalence(row.recurso);
    if (!expensesCompByYearRes[2026][recMapped]) return; // Guard
    if (filterRecurso !== 'Todos' && recMapped !== filterRecurso) return;

    const monthIdx = row.mes - 1;
    if (monthIdx < 0 || monthIdx >= 12) return;

    const year = row.año;
    if (year !== 2026 && year !== 2025) return;

    // Prevent duplication: only include first semester 2026 (Ene-Jun) and second semester 2025 (Jul-Dic)
    if (year === 2026 && monthIdx >= 6) return;
    if (year === 2025 && monthIdx < 6) return;

    const is2026RealGas = (expensesCompByYearRes[2026][recMapped].reduce((a,b)=>a+b, 0) + expensesPagoByYearRes[2026][recMapped].reduce((a,b)=>a+b, 0)) > 0;
    const useRealGas = monthIdx < 6 && is2026RealGas;

    // Apply baseline and capping scale factor to category values
    const baselineMultiplier = (year === 2026 && monthIdx < 6) ? 1 : 1.05;
    const scaleResourceFactor = (useRealGas || expenseAdjustMode === 'category') ? 1 : (1 + (simGasByResource[recMapped] || 0) / 100);
    
    let scaleTypeFactor = 1;
    const tipo = String(row.tipo || '').toLowerCase();
    if (monthIdx >= 6 && expenseAdjustMode === 'category') {
      if (tipo.includes("personal")) scaleTypeFactor = (1 + (simGasByType["Personal"] || 0) / 100);
      else if (tipo.includes("funcionamiento")) scaleTypeFactor = (1 + (simGasByType["Funcionamiento"] || 0) / 100);
      else if (tipo.includes("transferencia")) scaleTypeFactor = (1 + (simGasByType["Transferencias"] || 0) / 100);
      else if (tipo.includes("tasa") || tipo.includes("multa")) scaleTypeFactor = (1 + (simGasByType["Tasas"] || 0) / 100);
      else if (tipo.includes("deuda") || tipo.includes("servicio")) scaleTypeFactor = (1 + (simGasByType["Deuda"] || 0) / 100);
      else scaleTypeFactor = (1 + (simGasByType["Inversion"] || 0) / 100);
    }

    // Capping scale factor
    let capFactorComp = 1;
    let capFactorPago = 1;
    const totSimIng = monthlySimIngByRes[recMapped].reduce((a,b)=>a+b, 0);
    const totSimGasComp = monthlySimGasCompByRes[recMapped].reduce((a,b)=>a+b, 0);
    const totSimGasPago = monthlySimGasPagoByRes[recMapped].reduce((a,b)=>a+b, 0);

    if (totSimGasComp > totSimIng && totSimGasComp > 0) capFactorComp = totSimIng / totSimGasComp;
    if (totSimGasPago > totSimIng && totSimGasPago > 0) capFactorPago = totSimIng / totSimGasPago;

    const compVal = row.compromiso * baselineMultiplier * scaleResourceFactor * scaleTypeFactor * capFactorComp;
    const pagoVal = row.pago * baselineMultiplier * scaleResourceFactor * scaleTypeFactor * capFactorPago;

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

  // Align catPago breakdown to the adjusted totalSimGasPago if shortfall adjustment happened
  const sumCatPago = Object.values(catPago).reduce((a,b)=>a+b, 0);
  if (sumCatPago > 0 && Math.abs(sumCatPago - totalSimGasPago) > 1e-3) {
    const catPagoFactor = totalSimGasPago / sumCatPago;
    catPago.personal *= catPagoFactor;
    catPago.funcionamiento *= catPagoFactor;
    catPago.transferencias *= catPagoFactor;
    catPago.tasas *= catPagoFactor;
    catPago.deuda *= catPagoFactor;
    catPago.inversion *= catPagoFactor;
  }

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
      simGasComp: totalSimGasComp / 1e6,
      simGasPago: totalSimGasPago / 1e6,
      simNetComp: (totalSimIng - totalSimGasComp) / 1e6,
      simNetPago: (totalSimIng - totalSimGasPago) / 1e6
    },
    resourceBaselines,
    monthlySimIngByRes,
    monthlySimGasPagoByRes,
    monthlyBaseIngByRes,
    monthlyBaseGasPagoByRes,
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
      const execPct = ingSum > 0 ? (compSum / ingSum) * 100 : 0;
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
