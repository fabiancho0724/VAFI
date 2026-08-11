import { RESOURCES_LIST, getRecursoEquivalence, getRowResourceCode, getResourceFullName } from './resourceMapper';

// MASTER BUDGET ANCHORS (UPTC 2026)
export const BUDGET_PAYROLL_2026 = 369650433862.0; // Total anual presupuestado de Gastos de Personal ($369.650,43M)
export const PAYROLL_REAL_ENE_JUL = 172115463571.0; // Ejecutado real Ene-Jul 2026 ($172.115,46M)
export const PAYROLL_REMAINING_AGO_DIC = BUDGET_PAYROLL_2026 - PAYROLL_REAL_ENE_JUL; // Saldo proyectado Ago-Dic ($197.534,97M)

// Estacionalidad histórica mensual Ago-Dic para Gastos de Personal (ponderación UPTC)
export const PAYROLL_AGO_DIC_WEIGHTS = [0.124995, 0.141856, 0.140609, 0.168585, 0.423955]; // Mes 8 a 12 (Dic incluye prima de navidad)

export interface CashFlowItem {
  name: string; // e.g. "Ene", "Feb", "T1", "S1"
  ingresos: number;
  gastosComp: number;
  gastosPago: number;
  gastoPersonal: number; // Nómina del mes ($M)
  otrosGastosPago: number; // Pagos no-nómina ($M)
  netoComp: number;
  netoPago: number;
  acumuladoComp: number;
  acumuladoPago: number;
  acumuladoIng: number;
  saldoCajaAcumulado: number; // Reserva de liquidez acumulada ($M)
  rezagoCompromiso: number; // Cuentas por pagar acumuladas si compromisos > ingresos ($M)
  coberturaNomina: number; // % de cobertura de nómina mensual
  ejecucion: number; // (gastosComp / ingresos) * 100
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

  totalPayrollBudget: number;
  realPayrollPaid: number;
  remainingPayroll: number;
  simulatedPayrollTotal: number;
  payrollCoverageRatio: number; // (simIng / simulatedPayrollTotal) * 100
  payrollSurplus: number; // simIng - simulatedPayrollTotal
  unpaidCommitments: number; // Cuentas por pagar a siguiente vigencia: Math.max(0, simGasComp - simIng)
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

export interface PayrollCoverageItem {
  resourceCode: string;
  resourceName: string;
  totalRevenue: number;
  payrollContribution: number;
  surplus: number;
  coveragePct: number;
}

export interface ProjectionResults {
  simulatedFlow: CashFlowItem[]; // Monthly simulated flow
  totals: FinancialTotals;
  resourceBaselines: Record<string, { ing: number; gasComp: number; gasPago: number }>;
  monthlySimIngByRes: Record<string, number[]>;
  monthlySimGasPagoByRes: Record<string, number[]>;
  monthlySimGasCompByRes: Record<string, number[]>;
  monthlyBaseIngByRes: Record<string, number[]>;
  monthlyBaseGasPagoByRes: Record<string, number[]>;
  monthlyPayroll: number[]; // 12 months payroll in COP
  payrollCoverageList: PayrollCoverageItem[];
  catComp: Record<string, number>;
  catPago: Record<string, number>;
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

  // Adjust 2026 Ene-Jul monthly incomes to match cumulative 'Total recaudo' from Ingresos.csv
  RESOURCES_LIST.forEach(r => {
    const targetEneJul = recaudoByResource[r];
    if (targetEneJul > 0) {
      const currentEneJul = incomesByYearRes[2026][r].slice(0, 7).reduce((a,b)=>a+b, 0);
      if (currentEneJul > 0) {
        const factor = targetEneJul / currentEneJul;
        for (let i = 0; i < 7; i++) {
          incomesByYearRes[2026][r][i] *= factor;
        }
      } else {
        for (let i = 0; i < 7; i++) {
          incomesByYearRes[2026][r][i] = targetEneJul / 7;
        }
      }
    }
  });

  // Calculate projected baseline totals for Ago-Dic (months 8-12) to calculate scaling factor
  let rawProjectedAgoDicTotal = 0;
  RESOURCES_LIST.forEach(r => {
    for (let i = 7; i < 12; i++) {
      let histSum = 0, histCount = 0;
      if (incomesByYearRes[2023][r][i] > 0) { histSum += incomesByYearRes[2023][r][i]; histCount++; }
      if (incomesByYearRes[2024][r][i] > 0) { histSum += incomesByYearRes[2024][r][i]; histCount++; }
      if (incomesByYearRes[2025][r][i] > 0) { histSum += incomesByYearRes[2025][r][i]; histCount++; }
      rawProjectedAgoDicTotal += (histCount > 0 ? histSum / histCount : 0) * 1.05;
    }
  });

  const targetEneJulTotal = 337135.14515498 * 1e6;
  const targetAgoDicTotal = 205696.88 * 1e6;
  const scalingFactorAgoDic = rawProjectedAgoDicTotal > 0 ? targetAgoDicTotal / rawProjectedAgoDicTotal : 1;

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

  // Compute monthly master payroll array
  const monthlyPayroll: number[] = new Array(12).fill(0);
  rawHistoricalGastos.forEach(row => {
    if (row.año === 2026) {
      const monthIdx = row.mes - 1;
      const tipo = String(row.tipo || '').toLowerCase();
      if (monthIdx >= 0 && monthIdx < 7 && (tipo.includes('2.1.1') || tipo.includes('personal'))) {
        monthlyPayroll[monthIdx] += row.pago;
      }
    }
  });

  PAYROLL_AGO_DIC_WEIGHTS.forEach((weight, idx) => {
    const monthIdx = idx + 7;
    monthlyPayroll[monthIdx] = PAYROLL_REMAINING_AGO_DIC * weight;
  });

  // 3. Compute baseline values per resource
  const resourceBaselines: Record<string, { ing: number; gasComp: number; gasPago: number }> = {};
  RESOURCES_LIST.forEach(r => {
    let totIng = 0;
    let totGasComp = 0;
    let totGasPago = 0;

    for (let i = 0; i < 12; i++) {
      const is2026RealIng = incomesByYearRes[2026][r].reduce((a,b)=>a+b, 0) > 0;
      const is2026RealGas = (expensesCompByYearRes[2026][r].reduce((a,b)=>a+b, 0) + expensesPagoByYearRes[2026][r].reduce((a,b)=>a+b, 0)) > 0;

      const useRealIng = i < 7 && is2026RealIng;
      const useRealGas = i < 7 && is2026RealGas;

      if (useRealIng) {
        totIng += incomesByYearRes[2026][r][i];
      } else {
        let histSum = 0, histCount = 0;
        if (incomesByYearRes[2023][r][i] > 0) { histSum += incomesByYearRes[2023][r][i]; histCount++; }
        if (incomesByYearRes[2024][r][i] > 0) { histSum += incomesByYearRes[2024][r][i]; histCount++; }
        if (incomesByYearRes[2025][r][i] > 0) { histSum += incomesByYearRes[2025][r][i]; histCount++; }
        totIng += (histCount > 0 ? histSum / histCount : 0) * 1.05 * scalingFactorAgoDic;
      }

      if (useRealGas) {
        totGasComp += expensesCompByYearRes[2026][r][i];
        totGasPago += expensesPagoByYearRes[2026][r][i];
      } else {
        totGasComp += expensesCompByYearRes[2025][r][i] * 1.05;
        // In baseline for Ago-Dic, payments accelerate close to 100% of commitments
        totGasPago += expensesCompByYearRes[2025][r][i] * 1.05 * 0.99;
      }
    }

    if (totGasComp > totIng && totGasComp > 0) {
      const factor = totIng / totGasComp;
      totGasComp *= factor;
      totGasPago *= factor;
    }

    resourceBaselines[r] = {
      ing: totIng / 1e6,
      gasComp: totGasComp / 1e6,
      gasPago: totGasPago / 1e6
    };
  });

  // 4. Calculate simulated cash flows
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

  const resCategoryWeights: Record<string, Record<string, number>> = {};
  const resGasAgoDicBaseComp: Record<string, number> = {};
  RESOURCES_LIST.forEach(r => {
    resCategoryWeights[r] = { Personal: 0, Funcionamiento: 0, Transferencias: 0, Tasas: 0, Deuda: 0, Inversion: 0 };
    resGasAgoDicBaseComp[r] = 0;
  });

  rawHistoricalGastos.forEach(row => {
    const year = row.año;
    const monthIdx = row.mes - 1;
    if (year === 2025 && monthIdx >= 7) {
      const r = getRecursoEquivalence(row.recurso);
      if (resCategoryWeights[r]) {
        const tipo = String(row.tipo || '').toLowerCase();
        let catKey = 'Inversion';
        if (tipo.includes("2.1.1") || tipo.includes("personal")) catKey = 'Personal';
        else if (tipo.includes("2.1.2") || tipo.includes("funcionamiento")) catKey = 'Funcionamiento';
        else if (tipo.includes("2.1.3") || tipo.includes("transferencia")) catKey = 'Transferencias';
        else if (tipo.includes("2.1.8") || tipo.includes("tasa") || tipo.includes("multa")) catKey = 'Tasas';
        else if (tipo.includes("2.2.2") || tipo.includes("deuda")) catKey = 'Deuda';

        resCategoryWeights[r][catKey] += row.compromiso;
        resGasAgoDicBaseComp[r] += row.compromiso;
      }
    }
  });

  RESOURCES_LIST.forEach(r => {
    const total = resGasAgoDicBaseComp[r];
    if (total > 0) {
      Object.keys(resCategoryWeights[r]).forEach(cat => {
        resCategoryWeights[r][cat] /= total;
      });
    } else {
      resCategoryWeights[r] = { Personal: 0.60, Funcionamiento: 0.25, Transferencias: 0.05, Tasas: 0.02, Deuda: 0.01, Inversion: 0.07 };
    }
  });

  for (let i = 0; i < 12; i++) {
    RESOURCES_LIST.forEach(r => {
      const is2026RealIng = incomesByYearRes[2026][r].reduce((a,b)=>a+b, 0) > 0;
      const is2026RealGas = (expensesCompByYearRes[2026][r].reduce((a,b)=>a+b, 0) + expensesPagoByYearRes[2026][r].reduce((a,b)=>a+b, 0)) > 0;

      const useRealIng = i < 7 && is2026RealIng;
      const useRealGas = i < 7 && is2026RealGas;

      let ingBaseVal = 0;
      if (useRealIng) {
        ingBaseVal = incomesByYearRes[2026][r][i];
      } else {
        let histSum = 0, histCount = 0;
        if (incomesByYearRes[2023][r][i] > 0) { histSum += incomesByYearRes[2023][r][i]; histCount++; }
        if (incomesByYearRes[2024][r][i] > 0) { histSum += incomesByYearRes[2024][r][i]; histCount++; }
        if (incomesByYearRes[2025][r][i] > 0) { histSum += incomesByYearRes[2025][r][i]; histCount++; }
        ingBaseVal = (histCount > 0 ? histSum / histCount : 0) * 1.05 * scalingFactorAgoDic;
      }

      let gasBaseCompVal = 0;
      let gasBasePagoVal = 0;
      if (useRealGas) {
        gasBaseCompVal = expensesCompByYearRes[2026][r][i];
        gasBasePagoVal = expensesPagoByYearRes[2026][r][i];
      } else {
        gasBaseCompVal = expensesCompByYearRes[2025][r][i] * 1.05;
        // Payments in Ago-Dic accelerate with +5% increment
        gasBasePagoVal = gasBaseCompVal * 0.992 * 1.05;
      }

      monthlyBaseIngByRes[r][i] = ingBaseVal;
      monthlyBaseGasCompByRes[r][i] = gasBaseCompVal;
      monthlyBaseGasPagoByRes[r][i] = gasBasePagoVal;

      const ingMod = useRealIng ? 0 : (simIngByResource[r] || 0) / 100;
      const gasMod = (useRealGas || expenseAdjustMode === 'category') ? 0 : (simGasByResource[r] || 0) / 100;

      monthlySimIngByRes[r][i] = ingBaseVal * (1 + ingMod);
      monthlySimGasCompByRes[r][i] = gasBaseCompVal * (1 + gasMod);
      monthlySimGasPagoByRes[r][i] = gasBasePagoVal * (1 + gasMod);
    });

    const isAgoDic = i >= 7;
    if (isAgoDic && expenseAdjustMode === 'category') {
      RESOURCES_LIST.forEach(r => {
        const weights = resCategoryWeights[r];
        const personalMod = (simGasByType["Personal"] || 0) / 100;
        const funcMod = (simGasByType["Funcionamiento"] || 0) / 100;
        const transMod = (simGasByType["Transferencias"] || 0) / 100;
        const tasasMod = (simGasByType["Tasas"] || 0) / 100;
        const deudaMod = (simGasByType["Deuda"] || 0) / 100;
        const invMod = (simGasByType["Inversion"] || 0) / 100;

        const effectiveGasCompMod = 
          (weights.Personal * personalMod) +
          (weights.Funcionamiento * funcMod) +
          (weights.Transferencias * transMod) +
          (weights.Tasas * tasasMod) +
          (weights.Deuda * deudaMod) +
          (weights.Inversion * invMod);

        const effectiveGasPagoMod = effectiveGasCompMod;

        monthlySimGasCompByRes[r][i] = monthlyBaseGasCompByRes[r][i] * (1 + effectiveGasCompMod);
        monthlySimGasPagoByRes[r][i] = monthlyBaseGasPagoByRes[r][i] * (1 + effectiveGasPagoMod);
      });
    }
  }

  // 5. Capping rule: Monthly simulated expenses cannot exceed monthly simulated income per resource
  RESOURCES_LIST.forEach(r => {
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

  // 6. Assemble overall consolidated cash flow
  const simulatedFlow: CashFlowItem[] = [];
  const MONTHS_STR = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  let totalBaseIng = 0;
  let totalBaseGasComp = 0;
  let totalBaseGasPago = 0;

  let totalSimIng = 0;
  let totalSimGasComp = 0;
  let totalSimGasPago = 0;

  let accumComp = 0;
  let accumPago = 0;
  let accumIng = 0;

  let rawEneJulIng = 0;
  let rawEneJulGasComp = 0;
  let rawEneJulGasPago = 0;

  for (let i = 0; i < 7; i++) {
    RESOURCES_LIST.forEach(r => {
      if (filterRecurso !== 'Todos' && r !== filterRecurso) return;
      rawEneJulIng += monthlySimIngByRes[r][i];
      rawEneJulGasComp += monthlySimGasCompByRes[r][i];
      rawEneJulGasPago += monthlySimGasPagoByRes[r][i];
    });
  }

  const targetEneJulIng = 337135.14515498 * 1e6;
  const targetEneJulComp = 312078.09712108 * 1e6;
  const targetEneJulPago = 246751.61880889 * 1e6;

  const factorEneJulIng = (filterRecurso === 'Todos' && rawEneJulIng > 0) ? (targetEneJulIng / rawEneJulIng) : 1;
  const factorEneJulComp = (filterRecurso === 'Todos' && rawEneJulGasComp > 0) ? (targetEneJulComp / rawEneJulGasComp) : 1;
  const factorEneJulPago = (filterRecurso === 'Todos' && rawEneJulGasPago > 0) ? (targetEneJulPago / rawEneJulGasPago) : 1;

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

    if (i < 7) {
      mBaseIng *= factorEneJulIng;
      mBaseGasComp *= factorEneJulComp;
      mBaseGasPago *= factorEneJulPago;

      mSimIng *= factorEneJulIng;
      mSimGasComp *= factorEneJulComp;
      mSimGasPago *= factorEneJulPago;
    } else {
      // In months 7 to 11 (Ago-Dic), accelerate payments with +5% increment + $10.000M ($2.000M/month)
      const remainingCompMonth = mSimGasComp;
      mSimGasPago = (remainingCompMonth * 0.992 * 1.05) + (2000 * 1e6);
      mBaseGasPago = (mBaseGasComp * 0.992 * 1.05) + (2000 * 1e6);

      // In December (month 11), ensure fixed operating functioning expenses (utilities, security, ongoing ops ~$11.245M) are explicitly added to payroll
      if (i === 11) {
        const decPayroll = monthlyPayroll[11];
        const fixedOperatingDec = 11245.31 * 1e6; // $11.245,31M servicios públicos y operación fija
        mSimGasPago = Math.max(mSimGasPago, decPayroll + fixedOperatingDec);
        mBaseGasPago = Math.max(mBaseGasPago, decPayroll + fixedOperatingDec);
      }
    }

    totalBaseIng += mBaseIng;
    totalBaseGasComp += mBaseGasComp;
    totalBaseGasPago += mBaseGasPago;

    totalSimIng += mSimIng;
    totalSimGasComp += mSimGasComp;
    totalSimGasPago += mSimGasPago;

    accumIng += mSimIng;
    accumComp += (mSimIng - mSimGasComp);
    accumPago += (mSimIng - mSimGasPago);

    const mPayrollVal = monthlyPayroll[i] / 1e6;
    const mSimPagoM = mSimGasPago / 1e6;
    const mOtrosGastos = Math.max(0, mSimPagoM - mPayrollVal);
    const mSaldoCajaAcum = (accumIng - totalSimGasPago) / 1e6;
    
    // Cuentas por pagar acumuladas solo si compromisos superan ingresos
    const mRezagoCompromiso = Math.max(0, (totalSimGasComp - totalSimIng) / 1e6);
    const mCobNomina = mPayrollVal > 0 ? ((mSimIng / 1e6) / mPayrollVal) * 100 : 100;
    const execPct = mSimIng > 0 ? (mSimGasComp / mSimIng) * 100 : 0;

    simulatedFlow.push({
      name: MONTHS_STR[i],
      ingresos: parseFloat((mSimIng / 1e6).toFixed(1)),
      gastosComp: parseFloat((mSimGasComp / 1e6).toFixed(1)),
      gastosPago: parseFloat((mSimGasPago / 1e6).toFixed(1)),
      gastoPersonal: parseFloat(mPayrollVal.toFixed(1)),
      otrosGastosPago: parseFloat(mOtrosGastos.toFixed(1)),
      netoComp: parseFloat(((mSimIng - mSimGasComp) / 1e6).toFixed(1)),
      netoPago: parseFloat(((mSimIng - mSimGasPago) / 1e6).toFixed(1)),
      acumuladoComp: parseFloat((accumComp / 1e6).toFixed(1)),
      acumuladoPago: parseFloat((accumPago / 1e6).toFixed(1)),
      acumuladoIng: parseFloat((accumIng / 1e6).toFixed(1)),
      saldoCajaAcumulado: parseFloat(mSaldoCajaAcum.toFixed(1)),
      rezagoCompromiso: parseFloat(mRezagoCompromiso.toFixed(1)),
      coberturaNomina: parseFloat(mCobNomina.toFixed(1)),
      ejecucion: parseFloat(execPct.toFixed(2))
    });
  }

  // 7. Category breakdown
  const catComp: Record<string, number> = {
    personal: 0,
    funcionamiento: 0,
    transferencias: 0,
    tasas: 0,
    deuda: 0,
    inversion: 0
  };
  const catPago: Record<string, number> = {
    personal: 0,
    funcionamiento: 0,
    transferencias: 0,
    tasas: 0,
    deuda: 0,
    inversion: 0
  };

  const personalSlider = simGasByType["Personal"] || 0;
  const simulatedPayrollTotal = (PAYROLL_REAL_ENE_JUL + PAYROLL_REMAINING_AGO_DIC * (1 + personalSlider / 100)) / 1e6;

  rawHistoricalGastos.forEach(row => {
    const recMapped = getRecursoEquivalence(row.recurso);
    if (!expensesCompByYearRes[2026][recMapped]) return;
    if (filterRecurso !== 'Todos' && recMapped !== filterRecurso) return;

    const monthIdx = row.mes - 1;
    if (monthIdx < 0 || monthIdx >= 12) return;

    const year = row.año;
    if (year !== 2026 && year !== 2025) return;

    if (year === 2026 && monthIdx >= 7) return;
    if (year === 2025 && monthIdx < 7) return;

    const is2026RealGas = (expensesCompByYearRes[2026][recMapped].reduce((a,b)=>a+b, 0) + expensesPagoByYearRes[2026][recMapped].reduce((a,b)=>a+b, 0)) > 0;
    const useRealGas = monthIdx < 7 && is2026RealGas;

    const baselineMultiplier = (year === 2026 && monthIdx < 7) ? 1 : 1.05;
    const scaleResourceFactor = (useRealGas || expenseAdjustMode === 'category') ? 1 : (1 + (simGasByResource[recMapped] || 0) / 100);
    
    let scaleTypeFactor = 1;
    const tipo = String(row.tipo || '').toLowerCase();
    if (monthIdx >= 7 && expenseAdjustMode === 'category') {
      if (tipo.includes("personal") || tipo.includes("2.1.1")) scaleTypeFactor = (1 + (simGasByType["Personal"] || 0) / 100);
      else if (tipo.includes("funcionamiento") || tipo.includes("2.1.2")) scaleTypeFactor = (1 + (simGasByType["Funcionamiento"] || 0) / 100);
      else if (tipo.includes("transferencia") || tipo.includes("2.1.3")) scaleTypeFactor = (1 + (simGasByType["Transferencias"] || 0) / 100);
      else if (tipo.includes("tasa") || tipo.includes("multa") || tipo.includes("2.1.8")) scaleTypeFactor = (1 + (simGasByType["Tasas"] || 0) / 100);
      else if (tipo.includes("deuda") || tipo.includes("2.2.2")) scaleTypeFactor = (1 + (simGasByType["Deuda"] || 0) / 100);
      else scaleTypeFactor = (1 + (simGasByType["Inversion"] || 0) / 100);
    }

    const compVal = row.compromiso * baselineMultiplier * scaleResourceFactor * scaleTypeFactor;
    // Pagos in Ago-Dic with +5% increment
    const pagoVal = monthIdx < 7 
      ? (row.pago * baselineMultiplier * scaleResourceFactor * scaleTypeFactor)
      : (compVal * 0.992 * 1.05);

    if (tipo.includes("2.1.1") || tipo.includes("personal")) {
      catComp.personal += compVal; catPago.personal += pagoVal;
    } else if (tipo.includes("2.1.2") || tipo.includes("funcionamiento")) {
      catComp.funcionamiento += compVal; catPago.funcionamiento += pagoVal;
    } else if (tipo.includes("2.1.3") || tipo.includes("transferencia")) {
      catComp.transferencias += compVal; catPago.transferencias += pagoVal;
    } else if (tipo.includes("2.1.8") || tipo.includes("tasa")) {
      catComp.tasas += compVal; catPago.tasas += pagoVal;
    } else if (tipo.includes("2.2.2") || tipo.includes("deuda")) {
      catComp.deuda += compVal; catPago.deuda += pagoVal;
    } else {
      // Inversión (2.3): Pagos proyectados se acotan históricamente a máximo el 70% de los compromisos
      const invPagoBounded = monthIdx < 7 ? pagoVal : (compVal * 0.678);
      catComp.inversion += compVal; 
      catPago.inversion += invPagoBounded;
    }
  });

  // Ensure Personal total aligns with Master Budget Anchor
  catComp.personal = simulatedPayrollTotal * 1e6;
  catPago.personal = simulatedPayrollTotal * 1e6;

  // Build Payroll Coverage by Resource List
  const payrollCoverageList: PayrollCoverageItem[] = [];
  const totalSimIngM = totalSimIng / 1e6;
  
  RESOURCES_LIST.forEach(r => {
    const rTotalIngM = monthlySimIngByRes[r].reduce((a,b)=>a+b, 0) / 1e6;
    if (rTotalIngM > 0) {
      let payrollShareWeight = 0.65;
      if (r.startsWith('10.0')) payrollShareWeight = 0.95;
      else if (r.startsWith('10.5')) payrollShareWeight = 0.75;
      else if (r.startsWith('31')) payrollShareWeight = 0.50;
      else if (r.startsWith('20')) payrollShareWeight = 0.40;

      const payrollContrib = Math.min(rTotalIngM * payrollShareWeight, simulatedPayrollTotal);
      const surplus = rTotalIngM - payrollContrib;
      const coveragePct = (payrollContrib / simulatedPayrollTotal) * 100;

      payrollCoverageList.push({
        resourceCode: r,
        resourceName: getResourceFullName(r),
        totalRevenue: parseFloat(rTotalIngM.toFixed(1)),
        payrollContribution: parseFloat(payrollContrib.toFixed(1)),
        surplus: parseFloat(surplus.toFixed(1)),
        coveragePct: parseFloat(coveragePct.toFixed(1))
      });
    }
  });

  payrollCoverageList.sort((a,b) => b.totalRevenue - a.totalRevenue);

  const totalPayrollBudgetM = BUDGET_PAYROLL_2026 / 1e6;
  const realPayrollPaidM = PAYROLL_REAL_ENE_JUL / 1e6;
  const remainingPayrollM = PAYROLL_REMAINING_AGO_DIC / 1e6;
  const payrollCoverageRatio = simulatedPayrollTotal > 0 ? (totalSimIngM / simulatedPayrollTotal) * 100 : 0;
  const payrollSurplus = totalSimIngM - simulatedPayrollTotal;
  
  // Saldo Pago: Compromisos Totales (Vigencia 2026) menos Pagos Efectivos (Vigencia 2026)
  const unpaidCommitments = (totalSimGasComp - totalSimGasPago) / 1e6;

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
      simNetPago: (totalSimIng - totalSimGasPago) / 1e6,

      totalPayrollBudget: totalPayrollBudgetM,
      realPayrollPaid: realPayrollPaidM,
      remainingPayroll: remainingPayrollM,
      simulatedPayrollTotal,
      payrollCoverageRatio: parseFloat(payrollCoverageRatio.toFixed(1)),
      payrollSurplus: parseFloat(payrollSurplus.toFixed(1)),
      unpaidCommitments: parseFloat(unpaidCommitments.toFixed(1))
    },
    resourceBaselines,
    monthlySimIngByRes,
    monthlySimGasPagoByRes,
    monthlySimGasCompByRes,
    monthlyBaseIngByRes,
    monthlyBaseGasPagoByRes,
    monthlyPayroll,
    payrollCoverageList,
    catComp: {
      personal: catComp.personal / 1e6,
      funcionamiento: catComp.funcionamiento / 1e6,
      inversion: catComp.inversion / 1e6,
      transferencias: catComp.transferencias / 1e6,
      tasas: catComp.tasas / 1e6,
      deuda: catComp.deuda / 1e6
    },
    catPago: {
      personal: catPago.personal / 1e6,
      funcionamiento: catPago.funcionamiento / 1e6,
      inversion: Math.min(catComp.inversion * 0.70 / 1e6, catPago.inversion / 1e6),
      transferencias: catPago.transferencias / 1e6,
      tasas: catPago.tasas / 1e6,
      deuda: catPago.deuda / 1e6
    },
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
  let ingSum = 0, compSum = 0, pagoSum = 0, personalSum = 0, otrosSum = 0;
  let currentGroup = "";

  monthlyFlow.forEach((item, idx) => {
    ingSum += item.ingresos;
    compSum += item.gastosComp;
    pagoSum += item.gastosPago;
    personalSum += item.gastoPersonal;
    otrosSum += item.otrosGastosPago;

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
      const cobPct = personalSum > 0 ? (ingSum / personalSum) * 100 : 100;
      aggregated.push({
        name: currentGroup,
        ingresos: parseFloat(ingSum.toFixed(1)),
        gastosComp: parseFloat(compSum.toFixed(1)),
        gastosPago: parseFloat(pagoSum.toFixed(1)),
        gastoPersonal: parseFloat(personalSum.toFixed(1)),
        otrosGastosPago: parseFloat(otrosSum.toFixed(1)),
        netoComp: parseFloat((ingSum - compSum).toFixed(1)),
        netoPago: parseFloat((ingSum - pagoSum).toFixed(1)),
        acumuladoComp: item.acumuladoComp,
        acumuladoPago: item.acumuladoPago,
        acumuladoIng: item.acumuladoIng,
        saldoCajaAcumulado: item.saldoCajaAcumulado,
        rezagoCompromiso: item.rezagoCompromiso,
        coberturaNomina: parseFloat(cobPct.toFixed(1)),
        ejecucion: parseFloat(execPct.toFixed(2))
      });
      ingSum = 0; compSum = 0; pagoSum = 0; personalSum = 0; otrosSum = 0;
    }
  });

  return aggregated;
}
