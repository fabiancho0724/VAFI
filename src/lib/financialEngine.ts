import { getRecursoEquivalence, RESOURCES_LIST } from './resourceMapper';
import { RECURSOS_FIJOS_RESOLUCION } from './constants';

export function getRowUnidad(row: any, year: number): string {
  if (year === 2026) {
    const vig = String(row['Vigencia'] || '').trim();
    if (vig.includes(' - ') || vig.toLowerCase().includes('administrativa') || vig.toLowerCase().includes('seccional') || vig.toLowerCase().includes('ciencias') || vig.toLowerCase().includes('educacion') || vig.toLowerCase().includes('ingenieria') || vig.toLowerCase().includes('aguazul') || vig.toLowerCase().includes('investigacion')) {
      return vig;
    }
  }
  return String(row['Unidad'] || row['Dependencia'] || row['dependencia'] || '').trim();
}

export const BUDGET_PAYROLL_2026 = 369650433862; // Official Master Budget for Payroll ($369.650.433.862 COP)
export const PAYROLL_REAL_ENE_JUL = 172115462719.57; // Real paid Payroll Ene-Jul ($172.115,46M)
export const PAYROLL_REMAINING_AGO_DIC = 197534971142.43; // Remaining Projected Payroll Ago-Dic ($197.534,97M)

// Historical seasonal monthly distribution weights for remaining payroll (Ago - Dic)
export const PAYROLL_AGO_DIC_WEIGHTS = [
  0.1555, // Ago (15.55%) -> ~$30.716M
  0.1585, // Sep (15.85%) -> ~$31.309M
  0.1610, // Oct (16.10%) -> ~$31.803M
  0.1650, // Nov (16.50%) -> ~$32.593M
  0.3600  // Dic (36.00%) -> ~$71.112M (Peak month with primas and cesantías)
];

export interface CashFlowItem {
  name: string;
  ingresos: number;
  gastosComp: number; // Compromisos
  gastosPago: number; // Pagos efectivos
  gastoPersonal: number; // Nómina
  otrosGastosPago: number; // Egresos operativos y de inversión
  netoComp: number;
  netoPago: number;
  acumuladoComp: number;
  acumuladoPago: number;
  acumuladoIng: number;
  saldoCajaAcumulado: number;
  rezagoCompromiso: number; // Compromiso acumulado menos Pago acumulado (Rezago de Giro)
  coberturaNomina: number; // %
  ejecucion: number; // %
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

  officialPayrollBudget: number; // $369.650.433.862 COP in Millions
  realPayrollPaid: number; // $172.115.46M
  remainingPayrollToProject: number; // $197.534.97M
  simulatedPayrollTotal: number; // Sum of 12 months simulated payroll in Millions
  payrollCoverageRatio: number; // Total simulated revenue / simulated payroll (%)
  payrollSurplus: number; // Total simulated revenue - simulated payroll (M)
  unpaidCommitments: number; // Saldo Pago: Total Commitments - Total Payments (M)
}

export interface PayrollCoverageItem {
  resourceCode: string;
  resourceName: string;
  totalRevenue: number; // Total projected revenue (M)
  payrollContribution: number; // Projected portion allocated to payroll (M)
  surplus: number; // Remaining revenue for other expenses (M)
  coveragePct: number; // Contribution / Total Payroll (%)
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
  filterUnidad = 'Todos',
  filterRecurso = 'Todos',
  filterMes = 'Todos',
  filterTipoGasto = 'Todos',
  simIngByResource = {},
  simGasByResource = {},
  simGasByType = {},
  expenseAdjustMode = 'category',
  selectedProjectedResources = undefined,
  selectedProjectedExpenseTypes = undefined
}: {
  rawYearlyIncomes: Record<number, any[]>;
  rawCumulativeIncomes: any[];
  rawHistoricalGastos: any[];
  filterUnidad?: string;
  filterRecurso?: string;
  filterMes?: string;
  filterTipoGasto?: string;
  simIngByResource?: Record<string, number>;
  simGasByResource?: Record<string, number>;
  simGasByType?: Record<string, number>;
  expenseAdjustMode?: 'resource' | 'category';
  selectedProjectedResources?: string[];
  selectedProjectedExpenseTypes?: string[];
}): ProjectionResults {

  // 1. Process Incomes from rawYearlyIncomes (2023, 2024, 2025, 2026)
  const incomesByYearRes: Record<number, Record<string, number[]>> = {
    2023: {}, 2024: {}, 2025: {}, 2026: {}
  };
  const expensesCompByYearRes: Record<number, Record<string, number[]>> = {
    2023: {}, 2024: {}, 2025: {}, 2026: {}
  };
  const expensesPagoByYearRes: Record<number, Record<string, number[]>> = {
    2023: {}, 2024: {}, 2025: {}, 2026: {}
  };

  [2023, 2024, 2025, 2026].forEach(yr => {
    RESOURCES_LIST.forEach(r => {
      incomesByYearRes[yr][r] = new Array(12).fill(0);
      expensesCompByYearRes[yr][r] = new Array(12).fill(0);
      expensesPagoByYearRes[yr][r] = new Array(12).fill(0);
    });
  });

  const MONTH_KEYS = [
    'Valor ene', 'Valor feb', 'Valor mar', 'Valor abr', 'Valor may', 'Valor jun',
    'Valor jul', 'Valor ago', 'Valor sep', 'Valor oct', 'Valor nov', 'Valor dic'
  ];

  [2023, 2024, 2025, 2026].forEach(year => {
    const rows = rawYearlyIncomes[year] || [];
    rows.forEach(row => {
      const rowUnidad = getRowUnidad(row, year);
      if (filterUnidad !== 'Todos' && rowUnidad !== filterUnidad) return;

      const recRaw = String(row['Recurso'] || row['Codigo'] || row['Código recurso'] || '').trim();
      const recMapped = getRecursoEquivalence(recRaw);
      
      if (incomesByYearRes[year] && incomesByYearRes[year][recMapped]) {
        MONTH_KEYS.forEach((mKey, mIdx) => {
          let val = 0;
          if (row[mKey] !== undefined) {
            val = typeof row[mKey] === 'number' ? row[mKey] : parseFloat(String(row[mKey]).replace(/[^0-9.-]+/g, '')) || 0;
          } else {
            const altKeys = Object.keys(row).filter(k => k.toLowerCase().includes(mKey.toLowerCase().replace('valor ', '')));
            if (altKeys.length > 0) {
              val = typeof row[altKeys[0]] === 'number' ? row[altKeys[0]] : parseFloat(String(row[altKeys[0]]).replace(/[^0-9.-]+/g, '')) || 0;
            }
          }
          incomesByYearRes[year][recMapped][mIdx] += val;
        });
      }
    });
  });

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

  // 3. Compute baseline values per resource with fixed resolution overrides
  const resourceBaselines: Record<string, { ing: number; gasComp: number; gasPago: number }> = {};
  RESOURCES_LIST.forEach(r => {
    let totIng = 0;
    let totGasComp = 0;
    let totGasPago = 0;

    const fixedObj = RECURSOS_FIJOS_RESOLUCION[r];

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
        // Payments in Ago-Dic accelerate with +5% increment
        totGasPago += expensesCompByYearRes[2025][r][i] * 1.05 * 0.992 * 1.05;
      }
    }

    // Fixed resolution override for total annual income
    if (fixedObj && fixedObj.valorCOP > 0) {
      totIng = fixedObj.valorCOP;
    }

    // Universal rule: Payments cannot exceed income
    if (totGasPago > totIng && totGasPago > 0) {
      const factorPago = totIng / totGasPago;
      totGasPago *= factorPago;
      if (totGasComp > totIng) totGasComp = totIng;
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

      // Check if resource is selected for projection
      const isResourceSelected = !selectedProjectedResources || selectedProjectedResources.includes(r);
      const isFixedRes = !!RECURSOS_FIJOS_RESOLUCION[r];

      // Fixed statutory resources are locked by resolution unless targeted
      const ingMod = (useRealIng || !isResourceSelected || isFixedRes) ? 0 : (simIngByResource[r] || 0) / 100;
      const gasMod = (useRealGas || !isResourceSelected || expenseAdjustMode === 'category') ? 0 : (simGasByResource[r] || 0) / 100;

      monthlyBaseIngByRes[r][i] = ingBaseVal;
      monthlyBaseGasCompByRes[r][i] = gasBaseCompVal;
      monthlyBaseGasPagoByRes[r][i] = gasBasePagoVal;

      monthlySimIngByRes[r][i] = ingBaseVal * (1 + ingMod);
      monthlySimGasCompByRes[r][i] = gasBaseCompVal * (1 + gasMod);
      monthlySimGasPagoByRes[r][i] = gasBasePagoVal * (1 + gasMod);
    });

    const isAgoDic = i >= 7;
    if (isAgoDic && expenseAdjustMode === 'category') {
      RESOURCES_LIST.forEach(r => {
        const weights = resCategoryWeights[r];
        const isExpTypeSelected = (type: string) => !selectedProjectedExpenseTypes || selectedProjectedExpenseTypes.includes(type);

        const personalMod = isExpTypeSelected("Personal") ? (simGasByType["Personal"] || 0) / 100 : 0;
        const funcMod = isExpTypeSelected("Funcionamiento") ? (simGasByType["Funcionamiento"] || 0) / 100 : 0;
        const transMod = isExpTypeSelected("Transferencias") ? (simGasByType["Transferencias"] || 0) / 100 : 0;
        const tasasMod = isExpTypeSelected("Tasas") ? (simGasByType["Tasas"] || 0) / 100 : 0;
        const deudaMod = isExpTypeSelected("Deuda") ? (simGasByType["Deuda"] || 0) / 100 : 0;
        const invMod = isExpTypeSelected("Inversion") ? (simGasByType["Inversion"] || 0) / 100 : 0;

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

  // 5. Capping rule: Monthly and annual simulated payments CAN NEVER EXCEED simulated income per resource
  RESOURCES_LIST.forEach(r => {
    const totSimIng = monthlySimIngByRes[r].reduce((a,b)=>a+b, 0);
    const totSimGasComp = monthlySimGasCompByRes[r].reduce((a,b)=>a+b, 0);
    const totSimGasPago = monthlySimGasPagoByRes[r].reduce((a,b)=>a+b, 0);

    if (totSimGasPago > totSimIng && totSimGasPago > 0) {
      const factorPago = totSimIng / totSimGasPago;
      for (let i = 0; i < 12; i++) {
        monthlySimGasPagoByRes[r][i] *= factorPago;
      }
    }

    if (totSimGasComp > totSimIng && totSimGasComp > 0) {
      const factorComp = totSimIng / totSimGasComp;
      for (let i = 0; i < 12; i++) {
        monthlySimGasCompByRes[r][i] *= factorComp;
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
  const targetEneJulPago = 246751.61661605 * 1e6;

  const eneJulScaleIng = (rawEneJulIng > 0 && filterRecurso === 'Todos' && filterUnidad === 'Todos' && filterTipoGasto === 'Todos') ? targetEneJulIng / rawEneJulIng : 1;
  const eneJulScaleComp = (rawEneJulGasComp > 0 && filterRecurso === 'Todos' && filterUnidad === 'Todos' && filterTipoGasto === 'Todos') ? targetEneJulComp / rawEneJulGasComp : 1;
  const eneJulScalePago = (rawEneJulGasPago > 0 && filterRecurso === 'Todos' && filterUnidad === 'Todos' && filterTipoGasto === 'Todos') ? targetEneJulPago / rawEneJulGasPago : 1;

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
      mSimIng *= eneJulScaleIng;
      mSimGasComp *= eneJulScaleComp;
      mSimGasPago *= eneJulScalePago;
      mBaseIng *= eneJulScaleIng;
      mBaseGasComp *= eneJulScaleComp;
      mBaseGasPago *= eneJulScalePago;
    }

    const monthPayrollCOP = monthlyPayroll[i] || 0;
    const gastoPersonalM = monthPayrollCOP / 1e6;
    const otrosGastosPagoM = Math.max(0, (mSimGasPago / 1e6) - gastoPersonalM);

    const mSimIngM = mSimIng / 1e6;
    const mSimGasCompM = mSimGasComp / 1e6;
    const mSimGasPagoM = mSimGasPago / 1e6;

    totalBaseIng += mBaseIng;
    totalBaseGasComp += mBaseGasComp;
    totalBaseGasPago += mBaseGasPago;

    totalSimIng += mSimIng;
    totalSimGasComp += mSimGasComp;
    totalSimGasPago += mSimGasPago;

    accumComp += mSimGasCompM;
    accumPago += mSimGasPagoM;
    accumIng += mSimIngM;

    const saldoCajaAcumulado = accumIng - accumPago;
    const rezagoCompromiso = accumComp - accumPago;
    const cobPct = gastoPersonalM > 0 ? (mSimIngM / gastoPersonalM) * 100 : 100;
    const execPct = mSimGasCompM > 0 ? (mSimGasPagoM / mSimGasCompM) * 100 : 0;

    simulatedFlow.push({
      name: MONTHS_STR[i],
      ingresos: parseFloat(mSimIngM.toFixed(1)),
      gastosComp: parseFloat(mSimGasCompM.toFixed(1)),
      gastosPago: parseFloat(mSimGasPagoM.toFixed(1)),
      gastoPersonal: parseFloat(gastoPersonalM.toFixed(1)),
      otrosGastosPago: parseFloat(otrosGastosPagoM.toFixed(1)),
      netoComp: parseFloat((mSimIngM - mSimGasCompM).toFixed(1)),
      netoPago: parseFloat((mSimIngM - mSimGasPagoM).toFixed(1)),
      acumuladoComp: parseFloat(accumComp.toFixed(1)),
      acumuladoPago: parseFloat(accumPago.toFixed(1)),
      acumuladoIng: parseFloat(accumIng.toFixed(1)),
      saldoCajaAcumulado: parseFloat(saldoCajaAcumulado.toFixed(1)),
      rezagoCompromiso: parseFloat(rezagoCompromiso.toFixed(1)),
      coberturaNomina: parseFloat(cobPct.toFixed(1)),
      ejecucion: parseFloat(execPct.toFixed(2))
    });
  }

  // Calculate simulated payroll total
  const simulatedPayrollTotal = (monthlyPayroll.reduce((a,b) => a+b, 0)) / 1e6;
  const totalSimIngM = totalSimIng / 1e6;

  // Build payroll coverage rankings per resource
  const payrollCoverageList: PayrollCoverageItem[] = [];
  RESOURCES_LIST.forEach(r => {
    const resTotIngM = (monthlySimIngByRes[r].reduce((a,b) => a+b, 0)) / 1e6;
    let payrollAlloc = 0;
    if (r === '10' || r === '10.0') payrollAlloc = resTotIngM * 0.95;
    else if (r === '10.5') payrollAlloc = resTotIngM * 0.40;
    else if (r === '14') payrollAlloc = resTotIngM * 0.30;
    else if (r === '20') payrollAlloc = resTotIngM * 0.15;
    else if (r === '17') payrollAlloc = resTotIngM * 0.10;
    else payrollAlloc = resTotIngM * 0.05;

    payrollAlloc = Math.min(payrollAlloc, resTotIngM);
    const surplus = Math.max(0, resTotIngM - payrollAlloc);
    const coveragePct = simulatedPayrollTotal > 0 ? (payrollAlloc / simulatedPayrollTotal) * 100 : 0;

    payrollCoverageList.push({
      resourceCode: r,
      resourceName: r === '10' ? '10.0 Aportes Nación Funcionamiento' : (r === '10.5' ? '10.5 Política de Gratuidad' : (r === '20' ? '20 Recursos Propios' : `Recurso ${r}`)),
      totalRevenue: parseFloat(resTotIngM.toFixed(1)),
      payrollContribution: parseFloat(payrollAlloc.toFixed(1)),
      surplus: parseFloat(surplus.toFixed(1)),
      coveragePct: parseFloat(coveragePct.toFixed(1))
    });
  });

  payrollCoverageList.sort((a,b) => b.totalRevenue - a.totalRevenue);

  const totalPayrollBudgetM = BUDGET_PAYROLL_2026 / 1e6;
  const realPayrollPaidM = PAYROLL_REAL_ENE_JUL / 1e6;
  const remainingPayrollM = PAYROLL_REMAINING_AGO_DIC / 1e6;
  const payrollCoverageRatio = simulatedPayrollTotal > 0 ? (totalSimIngM / simulatedPayrollTotal) * 100 : 0;
  const payrollSurplus = totalSimIngM - simulatedPayrollTotal;
  
  // Saldo Pago: Total Commitments - Total Payments
  const unpaidCommitments = (totalSimGasComp - totalSimGasPago) / 1e6;

  // Breakdown by Expense Category
  const catComp = {
    personal: 369650.43 * 1e6,
    funcionamiento: 124447.13 * 1e6,
    inversion: 19687.14 * 1e6,
    transferencias: 5090.33 * 1e6,
    tasas: 3908.35 * 1e6,
    deuda: 0
  };

  const catPago = {
    personal: 369650.43 * 1e6,
    funcionamiento: 124447.13 * 1e6,
    inversion: 13347.88 * 1e6, // Bounded by <= 70%
    transferencias: 5090.33 * 1e6,
    tasas: 3908.35 * 1e6,
    deuda: 0
  };

  if (expenseAdjustMode === 'category') {
    const isExpTypeSelected = (type: string) => !selectedProjectedExpenseTypes || selectedProjectedExpenseTypes.includes(type);

    const personalMod = isExpTypeSelected("Personal") ? (simGasByType["Personal"] || 0) / 100 : 0;
    const funcMod = isExpTypeSelected("Funcionamiento") ? (simGasByType["Funcionamiento"] || 0) / 100 : 0;
    const invMod = isExpTypeSelected("Inversion") ? (simGasByType["Inversion"] || 0) / 100 : 0;
    const transMod = isExpTypeSelected("Transferencias") ? (simGasByType["Transferencias"] || 0) / 100 : 0;
    const tasasMod = isExpTypeSelected("Tasas") ? (simGasByType["Tasas"] || 0) / 100 : 0;

    catComp.personal *= (1 + personalMod);
    catComp.funcionamiento *= (1 + funcMod);
    catComp.inversion *= (1 + invMod);
    catComp.transferencias *= (1 + transMod);
    catComp.tasas *= (1 + tasasMod);

    catPago.personal *= (1 + personalMod);
    catPago.funcionamiento *= (1 + funcMod);
    catPago.inversion = Math.min(catComp.inversion * 0.70, catPago.inversion * (1 + invMod));
    catPago.transferencias *= (1 + transMod);
    catPago.tasas *= (1 + tasasMod);
  }

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

      officialPayrollBudget: parseFloat(totalPayrollBudgetM.toFixed(1)),
      realPayrollPaid: parseFloat(realPayrollPaidM.toFixed(1)),
      remainingPayrollToProject: parseFloat(remainingPayrollM.toFixed(1)),
      simulatedPayrollTotal: parseFloat(simulatedPayrollTotal.toFixed(1)),
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
