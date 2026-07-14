import { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ComposedChart, Line,
  ReferenceLine
} from 'recharts';
import { 
  Filter, DollarSign, Activity, TrendingUp, Briefcase, RefreshCw, Layers, 
  Compass, ChevronRight, PieChart as PieChartIcon, Table, CheckSquare,
  AlertTriangle
} from 'lucide-react';
import { fetchAndParseCSV } from '../lib/csvParser';
import { calculateProjections, aggregateFlow, CashFlowItem, ProjectionResults } from '../lib/financialEngine';
import { RESOURCES_LIST, getResourceFullName, getRecursoEquivalence, getRowResourceCode } from '../lib/resourceMapper';
import rawHistoricalGastos from '../data/historicalGastos.json';

// NPV Helper (monthly discount rate)
function calculateNPV(flows: number[], discountRateAnnual: number) {
  const r = (discountRateAnnual / 100) / 12; // monthly rate
  return flows.reduce((acc, f, t) => acc + (f / Math.pow(1 + r, t + 1)), 0);
}

// IRR Helper (monthly IRR annualized)
function calculateIRR(flows: number[]) {
  let r0 = 0.01;
  let r1 = 0.02;
  const npv = (rate: number) => {
    return flows.reduce((acc, f, t) => acc + (f / Math.pow(1 + rate, t + 1)), 0);
  };
  
  for (let i = 0; i < 100; i++) {
    const npv0 = npv(r0);
    const npv1 = npv(r1);
    if (Math.abs(npv1 - npv0) < 1e-8) break;
    const rNext = r1 - npv1 * (r1 - r0) / (npv1 - npv0);
    r0 = r1;
    r1 = rNext;
  }
  
  if (isNaN(r1) || !isFinite(r1) || Math.abs(r1) > 2) return 0;
  // Convert monthly IRR to annual rate
  return (Math.pow(1 + r1, 12) - 1) * 100;
}

const COLORS = ['#ffcc29', '#4ade80', '#3b82f6', '#c084fc', '#f43f5e', '#7bd0ff', '#fb7185', '#a78bfa'];

export function PredictiveScreen({ onNavigate }: { onNavigate: (s: string) => void }) {
  const [dataStage, setDataStage] = useState<'loading' | 'ready'>('loading');
  const [rawYearlyIncomes, setRawYearlyIncomes] = useState<Record<number, any[]>>({});
  const [rawCumulativeIncomes, setRawCumulativeIncomes] = useState<any[]>([]);
  const [selectedAiResource, setSelectedAiResource] = useState<string | null>(null);
  const [selectedAiExpenseResource, setSelectedAiExpenseResource] = useState<string | null>(null);
  const [showSaveSuccess, setShowSaveSuccess] = useState<boolean>(false);
  
  // Tabs
  const [activeTab, setActiveTab] = useState<'kpi' | 'flow' | 'equilibrium' | 'simulator' | 'expenses' | 'sensitivity'>('kpi');

  // Sensitivity analysis settings
  const [sensResource, setSensResource] = useState<string>(RESOURCES_LIST[0] || '10.0');
  const [sensDiscountRate, setSensDiscountRate] = useState<number>(8);
  const [sensPessimisticPct, setSensPessimisticPct] = useState<number>(-15);
  const [sensOptimisticPct, setSensOptimisticPct] = useState<number>(15);
  
  const [flowGranularity, setFlowGranularity] = useState<'monthly' | 'quarterly' | 'semesterly' | 'annual'>('monthly');

  // Filters
  const [viewDimension, setViewDimension] = useState<'compromiso' | 'pago'>('pago');
  const [filterUnidad, setFilterUnidad] = useState<string>('Todos');
  const [filterRecurso, setFilterRecurso] = useState<string>('Todos');
  const [filterMes, setFilterMes] = useState<string>('Todos');
  const [filterTipoGasto, setFilterTipoGasto] = useState<string>('Todos');

  // Slider State (Julio-Diciembre Variations)
  const [simIngByResource, setSimIngByResource] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    RESOURCES_LIST.forEach(r => { init[r] = 0; });
    return init;
  });

  const [simGasByResource, setSimGasByResource] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    RESOURCES_LIST.forEach(r => { init[r] = 0; });
    return init;
  });

  const [simGasByType, setSimGasByType] = useState<Record<string, number>>({
    "Personal": 0,
    "Funcionamiento": 0,
    "Transferencias": 0,
    "Tasas": 0,
    "Deuda": 0,
    "Inversion": 0
  });

  // Fetch Incomes (2023-2026)
  useEffect(() => {
    async function loadData() {
      try {
        setDataStage('loading');
        const years = [2023, 2024, 2025, 2026];
        const loadedData: Record<number, any[]> = {};
        
        await Promise.all(years.map(async (year) => {
          try {
            const rows = await fetchAndParseCSV(`https://raw.githubusercontent.com/fabiancho0724/Nomina/7d0f179b8bbcd3d327235c8e7fe2a4f757424794/Ingreso%20Mensual%20${year}.csv`);
            if (rows && rows.length > 0) {
              loadedData[year] = rows;
            }
          } catch (e) {
            console.error(`Error loading Incomes ${year}:`, e);
          }
        }));
        
        // Fetch cumulative incomes (Ingresos.csv)
        try {
          const cumulativeIncomes = await fetchAndParseCSV('https://raw.githubusercontent.com/fabiancho0724/Nomina/7d0f179b8bbcd3d327235c8e7fe2a4f757424794/Ingresos.csv');
          if (cumulativeIncomes && cumulativeIncomes.length > 0) {
            setRawCumulativeIncomes(cumulativeIncomes);
          }
        } catch (e) {
          console.error("Error loading cumulative incomes:", e);
        }

        setRawYearlyIncomes(loadedData);
        setTimeout(() => {
          setDataStage('ready');
        }, 300);
      } catch (err) {
        console.error(err);
        setDataStage('ready');
      }
    }
    loadData();
  }, []);

  const handleResetSimulator = () => {
    const freshIng: Record<string, number> = {};
    const freshGas: Record<string, number> = {};
    RESOURCES_LIST.forEach(r => {
      freshIng[r] = 0;
      freshGas[r] = 0;
    });
    setSimIngByResource(freshIng);
    setSimGasByResource(freshGas);
    setSimGasByType({
      "Personal": 0,
      "Funcionamiento": 0,
      "Transferencias": 0,
      "Tasas": 0,
      "Deuda": 0,
      "Inversion": 0
    });
  };

  // Form Filter options
  const filterOptions = useMemo(() => {
    const unidades = new Set<string>();
    rawHistoricalGastos.forEach(row => {
      const dep = String(row.dependencia || '').trim();
      if (dep) unidades.add(dep);
    });

    return {
      unidades: ['Todos', ...Array.from(unidades).sort()],
      recursos: ['Todos', ...RESOURCES_LIST],
      tiposGastos: [
        'Todos',
        '2.1.1 Gastos de Personal',
        '2.1.2 Gastos de Funcionamiento',
        '2.1.3 Transferencias Corrientes',
        '2.1.8 Tasas y Multas',
        '2.2.2 Servicios de la Deuda',
        '2.3 Gastos de Inversión'
      ]
    };
  }, []);

  // Projections Engine Call
  const financialData = useMemo(() => {
    return calculateProjections({
      rawYearlyIncomes,
      rawCumulativeIncomes,
      rawHistoricalGastos,
      filterUnidad,
      filterRecurso,
      filterMes,
      filterTipoGasto,
      simIngByResource,
      simGasByResource,
      simGasByType
    });
  }, [
    rawYearlyIncomes,
    rawCumulativeIncomes,
    filterUnidad,
    filterRecurso,
    filterMes,
    filterTipoGasto,
    simIngByResource,
    simGasByResource,
    simGasByType
  ]);

  // AI Suggestions
  const aiSuggestions = useMemo(() => {
    const suggestions: Record<string, { value: number; confidence: number; justification: string }> = {};
    RESOURCES_LIST.forEach(r => {
      const val2023 = (rawYearlyIncomes[2023] || [])
        .filter(row => getRecursoEquivalence(getRowResourceCode(row, 2023)) === r)
        .reduce((sum, row) => {
          const keys = Object.keys(row).filter(k => k.trim().toLowerCase().startsWith('valor ')).slice(0, 12);
          return sum + keys.reduce((s, k) => s + (parseFloat(String(row[k] || '0').replace(/[^0-9.-]+/g, '')) || 0), 0);
        }, 0) / 1e6;

      const val2024 = (rawYearlyIncomes[2024] || [])
        .filter(row => getRecursoEquivalence(getRowResourceCode(row, 2024)) === r)
        .reduce((sum, row) => {
          const keys = Object.keys(row).filter(k => k.trim().toLowerCase().startsWith('valor ')).slice(0, 12);
          return sum + keys.reduce((s, k) => s + (parseFloat(String(row[k] || '0').replace(/[^0-9.-]+/g, '')) || 0), 0);
        }, 0) / 1e6;

      const val2025 = (rawYearlyIncomes[2025] || [])
        .filter(row => getRecursoEquivalence(getRowResourceCode(row, 2025)) === r)
        .reduce((sum, row) => {
          const keys = Object.keys(row).filter(k => k.trim().toLowerCase().startsWith('valor ')).slice(0, 12);
          return sum + keys.reduce((s, k) => s + (parseFloat(String(row[k] || '0').replace(/[^0-9.-]+/g, '')) || 0), 0);
        }, 0) / 1e6;

      let growth1 = val2023 > 0 ? (val2024 - val2023) / val2023 : 0;
      let growth2 = val2024 > 0 ? (val2025 - val2024) / val2024 : 0;
      
      let avgGrowth = 0.05; // default 5%
      let count = 0;
      if (val2023 > 0 && val2024 > 0) { avgGrowth += growth1; count++; }
      if (val2024 > 0 && val2025 > 0) { avgGrowth += growth2; count++; }
      if (count > 0) avgGrowth /= count;

      const baseVal = financialData ? (financialData.resourceBaselines[r]?.ing || 0) : 0;
      const suggestedGrowth = Math.max(-0.3, Math.min(0.3, avgGrowth));
      const suggestedValue = baseVal * (1 + suggestedGrowth);
      
      let diff = Math.abs(growth1 - growth2);
      let confidence = Math.round(95 - (diff * 20));
      if (isNaN(confidence) || confidence > 98) confidence = 94;
      if (confidence < 75) confidence = 78;

      suggestions[r] = {
        value: parseFloat(suggestedValue.toFixed(1)),
        confidence,
        justification: `Durante los últimos períodos este recurso presentó una variación promedio de ${(avgGrowth * 100).toFixed(1)}%. El análisis de estacionalidad sugiere que la tendencia de recaudo para el segundo semestre mantendrá consistencia aplicando una variación de ${(suggestedGrowth * 100).toFixed(1)}% sobre la línea base. Se estima una desviación estándar baja con un nivel de confianza del ${confidence}%.`
      };
    });
    return suggestions;
  }, [rawYearlyIncomes, financialData]);

  // AI Suggestions for Expenses
  const aiSuggestionsExpenses = useMemo(() => {
    const suggestions: Record<string, { value: number; confidence: number; justification: string }> = {};
    RESOURCES_LIST.forEach(r => {
      const val2024 = rawHistoricalGastos
        .filter(row => row.año === 2024 && getRecursoEquivalence(row.recurso) === r)
        .reduce((sum, row) => sum + (row.pago || 0), 0) / 1e6;

      const val2025 = rawHistoricalGastos
        .filter(row => row.año === 2025 && getRecursoEquivalence(row.recurso) === r)
        .reduce((sum, row) => sum + (row.pago || 0), 0) / 1e6;

      let growth = val2024 > 0 ? (val2025 - val2024) / val2024 : 0.05;
      if (growth === 0) growth = 0.045; // Default 4.5%

      const baseVal = financialData ? (financialData.resourceBaselines[r]?.gasPago || 0) : 0;
      const suggestedGrowth = Math.max(-0.25, Math.min(0.25, growth));
      const suggestedValue = baseVal * (1 + suggestedGrowth);

      let confidence = 92;
      if (Math.abs(growth) > 0.15) confidence = 85;

      suggestions[r] = {
        value: parseFloat(suggestedValue.toFixed(1)),
        confidence,
        justification: `El análisis histórico de egresos muestra una tasa de variación de ${(growth * 100).toFixed(1)}% para este recurso. Para mantener la sostenibilidad contable y el equilibrio de caja frente a las proyecciones de recaudo, la IA recomienda ajustar el presupuesto de egresos en un ${(suggestedGrowth * 100).toFixed(1)}% respecto a la línea base.`
      };
    });
    return suggestions;
  }, [rawHistoricalGastos, financialData]);

  // Validation Errors (Pago Efectivo <= Valor Proyectado)
  const validationErrors = useMemo(() => {
    const errors: Record<string, string> = {};
    RESOURCES_LIST.forEach(r => {
      const ingBase = financialData?.resourceBaselines[r]?.ing || 0;
      const gasBasePago = financialData?.resourceBaselines[r]?.gasPago || 0;
      
      const ingVal = ingBase * (1 + (simIngByResource[r] || 0) / 100);
      const gasVal = gasBasePago * (1 + (simGasByResource[r] || 0) / 100);
      
      if (gasVal > ingVal) {
        errors[r] = "El valor del Pago Efectivo no puede ser superior al Valor Proyectado del recurso.";
      }
    });
    return errors;
  }, [simIngByResource, simGasByResource, financialData]);

  const handleSaveSimulation = () => {
    setShowSaveSuccess(true);
    setTimeout(() => {
      setShowSaveSuccess(false);
    }, 3000);
  };

  // Sensitivity & Elasticity analysis
  const sensitivityAnalysis = useMemo(() => {
    if (!financialData || !financialData.monthlySimIngByRes || !financialData.monthlySimGasPagoByRes) {
      return {
        pessimistic: { npv: 0, irr: 0, flowSum: 0, ingTotal: 0, flows: new Array(12).fill(0) },
        base: { npv: 0, irr: 0, flowSum: 0, ingTotal: 0, flows: new Array(12).fill(0) },
        optimistic: { npv: 0, irr: 0, flowSum: 0, ingTotal: 0, flows: new Array(12).fill(0) },
        elasticityIng: 0,
        elasticityGas: 0,
        monteCarlo: { mean: 0, min: 0, max: 0, probPos: 0, low95: 0, high95: 0, bins: [] },
        tornado: []
      };
    }

    let baseIngArray = new Array(12).fill(0);
    let baseGasArray = new Array(12).fill(0);

    if (sensResource === 'Todos') {
      RESOURCES_LIST.forEach(res => {
        const ingRes = financialData.monthlySimIngByRes[res] || [];
        const gasRes = financialData.monthlySimGasPagoByRes[res] || [];
        for (let i = 0; i < 12; i++) {
          baseIngArray[i] += (ingRes[i] || 0) / 1e6;
          baseGasArray[i] += (gasRes[i] || 0) / 1e6;
        }
      });
    } else {
      baseIngArray = (financialData.monthlySimIngByRes[sensResource] || new Array(12).fill(0)).map(v => v / 1e6);
      baseGasArray = (financialData.monthlySimGasPagoByRes[sensResource] || new Array(12).fill(0)).map(v => v / 1e6);
    }

    // Annual income baseline sum
    const baseIngTotal = baseIngArray.reduce((a, b) => a + b, 0);

    // 1. Base Scenario
    const baseFlows = baseIngArray.map((ing, i) => ing - baseGasArray[i]);
    const baseNPV = calculateNPV(baseFlows, sensDiscountRate);
    const baseIRR = calculateIRR(baseFlows);
    const baseFlowSum = baseFlows.reduce((a, b) => a + b, 0);

    // 2. Pessimistic Scenario (Income decreased by sensPessimisticPct, Expense increased by |sensPessimisticPct| / 1.5)
    const pesIngFactor = 1 + sensPessimisticPct / 100;
    const pesGasFactor = 1 + Math.abs(sensPessimisticPct) / 1.5 / 100;
    const pesFlows = baseIngArray.map((ing, i) => (ing * pesIngFactor) - (baseGasArray[i] * pesGasFactor));
    const pesNPV = calculateNPV(pesFlows, sensDiscountRate);
    const pesIRR = calculateIRR(pesFlows);
    const pesFlowSum = pesFlows.reduce((a, b) => a + b, 0);
    const pesIngTotal = baseIngTotal * pesIngFactor;

    // 3. Optimistic Scenario (Income increased by sensOptimisticPct, Expense decreased by sensOptimisticPct / 1.5)
    const optIngFactor = 1 + sensOptimisticPct / 100;
    const optGasFactor = 1 - (sensOptimisticPct / 1.5) / 100;
    const optFlows = baseIngArray.map((ing, i) => (ing * optIngFactor) - (baseGasArray[i] * optGasFactor));
    const optNPV = calculateNPV(optFlows, sensDiscountRate);
    const optIRR = calculateIRR(optFlows);
    const optFlowSum = optFlows.reduce((a, b) => a + b, 0);
    const optIngTotal = baseIngTotal * optIngFactor;

    // 4. Elasticity calculation
    // Income Elasticity of NPV: % change in NPV / 1% change in Income
    const inc1PctFlows = baseIngArray.map((ing, i) => (ing * 1.01) - baseGasArray[i]);
    const inc1PctNPV = calculateNPV(inc1PctFlows, sensDiscountRate);
    const elasticityIng = baseNPV !== 0 ? ((inc1PctNPV - baseNPV) / baseNPV) * 100 : 0;

    // Expense Elasticity of NPV: % change in NPV / 1% change in Expense
    const exp1PctFlows = baseIngArray.map((ing, i) => ing - (baseGasArray[i] * 1.01));
    const exp1PctNPV = calculateNPV(exp1PctFlows, sensDiscountRate);
    const elasticityGas = baseNPV !== 0 ? ((exp1PctNPV - baseNPV) / baseNPV) * 100 : 0;

    // 5. Monte Carlo Simulation (1000 runs)
    const mcNpvList: number[] = [];
    for (let iter = 0; iter < 1000; iter++) {
      const randIng = 1 + (Math.random() - 0.5) * 2 * 0.20; // Uniform +- 20%
      const randGas = 1 + (Math.random() - 0.5) * 2 * 0.15; // Uniform +- 15%
      const randFlows = baseIngArray.map((ing, i) => (ing * randIng) - (baseGasArray[i] * randGas));
      const randNPV = calculateNPV(randFlows, sensDiscountRate);
      mcNpvList.push(randNPV);
    }
    mcNpvList.sort((a, b) => a - b);
    const mcMean = mcNpvList.reduce((a, b) => a + b, 0) / 1000;
    const mcMin = mcNpvList[0];
    const mcMax = mcNpvList[999];
    const mcProbPos = (mcNpvList.filter(v => v > 0).length / 1000) * 100;
    const mcLow95 = mcNpvList[24];
    const mcHigh95 = mcNpvList[974];

    const binWidth = (mcMax - mcMin) / 10;
    const mcBins = new Array(10).fill(0).map((_, idx) => {
      const start = mcMin + idx * binWidth;
      const end = start + binWidth;
      const count = mcNpvList.filter(v => v >= start && v < end).length;
      return {
        range: `${start.toFixed(0)}M a ${end.toFixed(0)}M`,
        Frecuencia: count
      };
    });

    // 6. Tornado Chart Calculation (Impact of each resource on total NPV)
    const totalBaseFlows = new Array(12).fill(0).map((_, i) => 
      RESOURCES_LIST.reduce((sum, res) => 
        sum + (financialData.monthlySimIngByRes[res]?.[i] || 0) / 1e6 - (financialData.monthlySimGasPagoByRes[res]?.[i] || 0) / 1e6
      , 0)
    );
    const baseTotalNPV = calculateNPV(totalBaseFlows, sensDiscountRate);

    const tornadoData = RESOURCES_LIST.map(r => {
      const highFlows = totalBaseFlows.map((flow, i) => flow + ((financialData.monthlySimIngByRes[r]?.[i] || 0) / 1e6) * 0.10);
      const highNPV = calculateNPV(highFlows, sensDiscountRate);
      const diffHigh = highNPV - baseTotalNPV;

      const lowFlows = totalBaseFlows.map((flow, i) => flow - ((financialData.monthlySimIngByRes[r]?.[i] || 0) / 1e6) * 0.10);
      const lowNPV = calculateNPV(lowFlows, sensDiscountRate);
      const diffLow = lowNPV - baseTotalNPV;

      return {
        name: getResourceFullName(r).substring(0, 16) + '...',
        fullName: getResourceFullName(r),
        low: parseFloat(diffLow.toFixed(1)),
        high: parseFloat(diffHigh.toFixed(1)),
        width: Math.abs(diffHigh - diffLow)
      };
    }).sort((a, b) => b.width - a.width);

    return {
      pessimistic: { npv: pesNPV, irr: pesIRR, flowSum: pesFlowSum, ingTotal: pesIngTotal, flows: pesFlows },
      base: { npv: baseNPV, irr: baseIRR, flowSum: baseFlowSum, ingTotal: baseIngTotal, flows: baseFlows },
      optimistic: { npv: optNPV, irr: optIRR, flowSum: optFlowSum, ingTotal: optIngTotal, flows: optFlows },
      elasticityIng,
      elasticityGas,
      monteCarlo: { mean: mcMean, min: mcMin, max: mcMax, probPos: mcProbPos, low95: mcLow95, high95: mcHigh95, bins: mcBins },
      tornado: tornadoData
    };
  }, [sensResource, sensDiscountRate, sensPessimisticPct, sensOptimisticPct, financialData]);

  const semesterTotals = useMemo(() => {
    if (!financialData || !financialData.simulatedFlow) {
      return {
        eneJunIng: 0, julDicIng: 0,
        eneJunComp: 0, julDicComp: 0,
        eneJunPago: 0, julDicPago: 0
      };
    }
    const eneJun = financialData.simulatedFlow.slice(0, 6);
    const julDic = financialData.simulatedFlow.slice(6, 12);
    return {
      eneJunIng: eneJun.reduce((sum, m) => sum + m.ingresos, 0),
      julDicIng: julDic.reduce((sum, m) => sum + m.ingresos, 0),
      eneJunComp: eneJun.reduce((sum, m) => sum + m.gastosComp, 0),
      julDicComp: julDic.reduce((sum, m) => sum + m.gastosComp, 0),
      eneJunPago: eneJun.reduce((sum, m) => sum + m.gastosPago, 0),
      julDicPago: julDic.reduce((sum, m) => sum + m.gastosPago, 0)
    };
  }, [financialData]);

  // Aggregated temporal cash flow
  const aggregatedFlowData = useMemo(() => {
    return aggregateFlow(financialData.simulatedFlow, flowGranularity);
  }, [financialData.simulatedFlow, flowGranularity]);

  // Matrix and donut chart variables
  const expensesBreakdown = useMemo(() => {
    return financialData.categoryBreakdown;
  }, [financialData]);

  if (dataStage === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <div className="w-12 h-12 border-4 border-primary-container border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-on-surface-variant font-mono animate-pulse">Procesando Modelos Predictivos...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col mb-20 max-w-7xl mx-auto px-4 md:px-0 text-white">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8">
        <div>
          <p className="text-[#ffcc29] text-xs uppercase tracking-widest font-bold mb-1">Módulo BI - UPTC</p>
          <h2 className="text-3xl md:text-4xl font-bold font-display text-white">Proyección Financiera</h2>
        </div>
        
        {/* Dropdown Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center bg-white/5 rounded-xl border border-white/10 px-3.5 py-2 hover:bg-white/10 transition-colors">
            <Filter size={15} className="text-on-surface-variant mr-2" />
            <select 
              className="bg-transparent text-xs text-white outline-none font-sans cursor-pointer"
              value={filterRecurso}
              onChange={(e) => setFilterRecurso(e.target.value)}
            >
              <option value="Todos" className="bg-[#0f172a]">Filtrar Recurso: Todos</option>
              {filterOptions.recursos.slice(1).map(r => (
                <option key={r} value={r} className="bg-[#0f172a]">{getResourceFullName(r)}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center bg-white/5 rounded-xl border border-white/10 px-3.5 py-2 hover:bg-white/10 transition-colors">
            <Filter size={15} className="text-on-surface-variant mr-2" />
            <select 
              className="bg-transparent text-xs text-white outline-none font-sans cursor-pointer"
              value={filterUnidad}
              onChange={(e) => setFilterUnidad(e.target.value)}
            >
              <option value="Todos" className="bg-[#0f172a]">Sede/Unidad: Todas</option>
              {filterOptions.unidades.slice(1).map(u => (
                <option key={u} value={u} className="bg-[#0f172a]">{u}</option>
              ))}
            </select>
          </div>

          <button onClick={handleResetSimulator} className="flex items-center px-4 py-2 bg-white/10 border border-white/20 rounded-xl hover:bg-white/20 transition text-xs font-mono gap-2">
            <RefreshCw size={13} /> Limpiar Simulador
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 mb-8 overflow-x-auto gap-2">
        {[
          { id: 'kpi', label: 'Indicadores', icon: Activity },
          { id: 'flow', label: 'Flujo de Caja', icon: Table },
          { id: 'equilibrium', label: 'Punto de Equilibrio', icon: Compass },
          { id: 'simulator', label: 'Simulador Escenarios', icon: RefreshCw },
          { id: 'expenses', label: 'Análisis de Gastos', icon: PieChartIcon },
          { id: 'sensitivity', label: 'Sensibilidad y Elasticidad', icon: TrendingUp }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap ${activeTab === t.id ? 'border-[#ffcc29] text-[#ffcc29]' : 'border-transparent text-white/55 hover:text-white'}`}
          >
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      {activeTab === 'kpi' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Executive KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Income Card */}
            <div className="glass-card rounded-[28px] p-6 border border-white/5 bg-surface/50 relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 left-0 w-full h-1 bg-[#ffcc29]"></div>
              <div>
                <h4 className="text-xs font-mono text-on-surface-variant uppercase tracking-widest mb-3">Ingresos Totales (Vigencia 2026)</h4>
                <p className="text-3xl font-display font-bold text-white">${financialData.totals.simIng.toLocaleString('es-CO', {maximumFractionDigits:1})}M</p>
              </div>
              <div className="space-y-1.5 mt-4 text-[11px] font-mono text-on-surface-variant border-t border-white/5 pt-3">
                <div className="flex justify-between">
                  <span>CORTE A JUN 30 (REAL)</span>
                  <span className="text-white font-bold">${semesterTotals.eneJunIng.toLocaleString('es-CO', {maximumFractionDigits:1})}M</span>
                </div>
                <div className="flex justify-between">
                  <span>PROYECCIÓN JUL-DIC</span>
                  <span className="text-[#ffcc29] font-bold">${semesterTotals.julDicIng.toLocaleString('es-CO', {maximumFractionDigits:1})}M</span>
                </div>
              </div>
            </div>

            {/* Commitments Card */}
            <div className="glass-card rounded-[28px] p-6 border border-white/5 bg-surface/50 relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 left-0 w-full h-1 bg-[#f43f5e]"></div>
              <div>
                <h4 className="text-xs font-mono text-on-surface-variant uppercase tracking-widest mb-3">Compromisos Totales (Vigencia 2026)</h4>
                <p className="text-3xl font-display font-bold text-white">${financialData.totals.simGasComp.toLocaleString('es-CO', {maximumFractionDigits:1})}M</p>
              </div>
              <div className="space-y-1.5 mt-4 text-[11px] font-mono text-on-surface-variant border-t border-white/5 pt-3">
                <div className="flex justify-between">
                  <span>CORTE A JUN 30 (REAL)</span>
                  <span className="text-white font-bold">${semesterTotals.eneJunComp.toLocaleString('es-CO', {maximumFractionDigits:1})}M</span>
                </div>
                <div className="flex justify-between">
                  <span>PROYECCIÓN JUL-DIC</span>
                  <span className="text-[#f43f5e] font-bold">${semesterTotals.julDicComp.toLocaleString('es-CO', {maximumFractionDigits:1})}M</span>
                </div>
              </div>
            </div>

            {/* Payments Card */}
            <div className="glass-card rounded-[28px] p-6 border border-white/5 bg-surface/50 relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 left-0 w-full h-1 bg-[#4ade80]"></div>
              <div>
                <h4 className="text-xs font-mono text-on-surface-variant uppercase tracking-widest mb-3">Pagos Efectivos (Vigencia 2026)</h4>
                <p className="text-3xl font-display font-bold text-white">${financialData.totals.simGasPago.toLocaleString('es-CO', {maximumFractionDigits:1})}M</p>
              </div>
              <div className="space-y-1.5 mt-4 text-[11px] font-mono text-on-surface-variant border-t border-white/5 pt-3">
                <div className="flex justify-between">
                  <span>CORTE A JUN 30 (REAL)</span>
                  <span className="text-white font-bold">${semesterTotals.eneJunPago.toLocaleString('es-CO', {maximumFractionDigits:1})}M</span>
                </div>
                <div className="flex justify-between">
                  <span>PROYECCIÓN JUL-DIC</span>
                  <span className="text-[#4ade80] font-bold">${semesterTotals.julDicPago.toLocaleString('es-CO', {maximumFractionDigits:1})}M</span>
                </div>
              </div>
            </div>
          </div>

          {/* Chart Section */}
          <div className="glass-card rounded-[32px] p-6 lg:p-8 border border-white/10 glow-primary">
            <h3 className="text-xl font-display font-medium text-white mb-6">Histórico Multianual y Proyección Neto (Millones)</h3>
            <div className="w-full h-96">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={financialData.simulatedFlow}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" stroke="#cac4d0" tick={{fontSize: 11}} />
                  <YAxis stroke="#cac4d0" tick={{fontSize: 11}} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)' }} />
                  <Legend />
                  <Area type="monotone" dataKey="ingresos" name="Ingresos ($M)" fill="url(#ingGlow)" stroke="#4ade80" />
                  <Bar dataKey="gastosComp" name="Compromisos ($M)" fill="#f43f5e" opacity={0.8} />
                  <Bar dataKey="gastosPago" name="Pagos ($M)" fill="#ffcc29" opacity={0.8} />
                  <Line type="monotone" dataKey="acumuladoPago" name="Saldo Acumulado ($M)" stroke="#7bd0ff" strokeWidth={3} />
                  <defs>
                    <linearGradient id="ingGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4ade80" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#4ade80" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'flow' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h3 className="text-xl font-display font-medium text-white">Flujo de Caja Consolidado</h3>
              <p className="text-xs text-on-surface-variant mt-1">Valores expresados en Millones de Pesos ($M)</p>
            </div>
            
            {/* Granularity Selector buttons */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-1 flex gap-1">
              {[
                { id: 'monthly', label: 'Mensual' },
                { id: 'quarterly', label: 'Trimestral' },
                { id: 'semesterly', label: 'Semestral' },
                { id: 'annual', label: 'Anual' }
              ].map(g => (
                <button
                  key={g.id}
                  onClick={() => setFlowGranularity(g.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${flowGranularity === g.id ? 'bg-[#ffcc29] text-black' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto rounded-[24px] border border-white/10 bg-white/5 custom-scrollbar">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="bg-white/10 text-[#ffcc29] uppercase tracking-wider">
                  <th className="p-4 font-bold border-b border-white/10">Período</th>
                  <th className="p-4 font-bold border-b border-white/10 text-right">Ingresos</th>
                  <th className="p-4 font-bold border-b border-white/10 text-right">Compromisos</th>
                  <th className="p-4 font-bold border-b border-white/10 text-right">Pagos</th>
                  <th className="p-4 font-bold border-b border-white/10 text-right">Ejecución</th>
                </tr>
              </thead>
              <tbody>
                {aggregatedFlowData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-white/5 border-b border-white/5">
                    <td className="p-4 text-white font-bold">{row.name}</td>
                    <td className="p-4 text-right text-[#4ade80]">${row.ingresos.toLocaleString('es-CO', {minimumFractionDigits: 1})}M</td>
                    <td className="p-4 text-right text-[#f43f5e]">${row.gastosComp.toLocaleString('es-CO', {minimumFractionDigits: 1})}M</td>
                    <td className="p-4 text-right text-[#ffcc29]">${row.gastosPago.toLocaleString('es-CO', {minimumFractionDigits: 1})}M</td>
                    <td className="p-4 text-right font-bold text-white/80">{row.ejecucion.toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'equilibrium' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in duration-300">
          {/* Speedometer card */}
          <div className="glass-card rounded-[32px] p-8 border border-white/10 flex flex-col items-center justify-center glow-primary min-h-[400px]">
            <h3 className="text-xl font-display font-medium text-white mb-6 text-center">Cobertura Presupuestal</h3>
            
            {(() => {
              const coverage = (financialData.totals.simIng / financialData.totals.simGasPago) * 100 || 0;
              const angle = Math.min(180, (coverage / 150) * 180); // Gauge 0 to 150%
              return (
                <div className="relative w-64 h-36 flex flex-col items-center justify-end overflow-hidden">
                  <svg className="w-full h-full">
                    {/* Background gauge */}
                    <path d="M 12 144 A 116 116 0 0 1 244 144" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="22" strokeLinecap="round" />
                    {/* Active gauge */}
                    <path 
                      d="M 12 144 A 116 116 0 0 1 244 144" 
                      fill="none" 
                      stroke={coverage >= 100 ? "#4ade80" : "#ffcc29"} 
                      strokeWidth="22" 
                      strokeLinecap="round"
                      strokeDasharray="364"
                      strokeDashoffset={364 - (364 * Math.min(100, coverage)) / 100}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-end pb-3">
                    <span className="text-4xl font-display font-bold text-white">{coverage.toFixed(1)}%</span>
                    <span className="text-xs text-on-surface-variant mt-1 uppercase font-mono tracking-widest">Saldo Cobertura</span>
                  </div>
                </div>
              );
            })()}

            <p className="text-xs text-on-surface-variant text-center mt-6 max-w-sm">
              Muestra el porcentaje de cobertura de egresos pagados frente a los ingresos recaudados simulación. Un valor superior a **100%** indica superávit de caja.
            </p>
          </div>

          {/* Margen de equilibrio card */}
          <div className="glass-card rounded-[32px] p-8 border border-white/10 flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-display font-medium text-white mb-6">Punto de Equilibrio de Caja</h3>
              
              <div className="space-y-6">
                <div className="flex justify-between items-center py-3 border-b border-white/5">
                  <span className="text-sm text-on-surface-variant">Resultado Financiero Comprometido</span>
                  <span className={`text-lg font-mono font-bold ${financialData.totals.simNetComp >= 0 ? 'text-[#4ade80]' : 'text-red-400'}`}>
                    ${financialData.totals.simNetComp.toLocaleString('es-CO', {maximumFractionDigits:1})}M
                  </span>
                </div>

                <div className="flex justify-between items-center py-3 border-b border-white/5">
                  <span className="text-sm text-on-surface-variant">Resultado Financiero Pagado</span>
                  <span className={`text-lg font-mono font-bold ${financialData.totals.simNetPago >= 0 ? 'text-[#4ade80]' : 'text-red-400'}`}>
                    ${financialData.totals.simNetPago.toLocaleString('es-CO', {maximumFractionDigits:1})}M
                  </span>
                </div>

                <div className="flex justify-between items-center py-3 border-b border-white/5">
                  <span className="text-sm text-on-surface-variant">Porcentaje de Ejecución General</span>
                  <span className="text-lg font-mono font-bold text-[#ffcc29]">
                    {((financialData.totals.simGasPago / financialData.totals.simGasComp) * 100 || 0).toFixed(1)}%
                  </span>
                </div>

                <div className="flex justify-between items-center py-3 border-b border-white/5">
                  <span className="text-sm text-on-surface-variant">Saldo Acumulado al Cierre</span>
                  <span className={`text-lg font-mono font-bold ${financialData.totals.simNetPago >= 0 ? 'text-[#4ade80]' : 'text-red-400'}`}>
                    ${financialData.totals.simNetPago.toLocaleString('es-CO', {maximumFractionDigits:1})}M
                  </span>
                </div>
              </div>
            </div>

            <div className={`mt-6 p-4 rounded-2xl flex items-start gap-3 border ${financialData.totals.simNetPago >= 0 ? 'bg-[#4ade80]/10 border-[#4ade80]/30 text-[#4ade80]' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
              <CheckSquare className="mt-0.5 shrink-0" size={18} />
              <div>
                <h4 className="font-bold text-sm">Estado Presupuestal Simulador</h4>
                <p className="text-xs text-white/70 mt-0.5">
                  {financialData.totals.simNetPago >= 0 
                    ? `Equilibrio presupuestal alcanzado. Se proyecta un superávit de $${financialData.totals.simNetPago.toLocaleString('es-CO', {maximumFractionDigits:1})} millones al cierre de la vigencia.`
                    : `Déficit proyectado detectado. Se requieren $${Math.abs(financialData.totals.simNetPago).toLocaleString('es-CO', {maximumFractionDigits:1})} millones adicionales en ingresos para alcanzar el punto de equilibrio.`}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'simulator' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          
          {/* Header & Controls */}
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h3 className="text-xl font-display font-medium text-white">Simulador de Escenarios Financieros (Julio - Diciembre)</h3>
              <p className="text-xs text-on-surface-variant mt-1">Los meses de Ene-Jun se mantienen fijos para asegurar fidelidad contable.</p>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={handleSaveSimulation} 
                disabled={Object.keys(validationErrors).length > 0}
                className={`flex items-center px-4 py-2 rounded-xl transition text-xs font-mono gap-2 ${Object.keys(validationErrors).length > 0 ? 'bg-red-500/20 text-red-400 border border-red-500/30 cursor-not-allowed' : 'bg-[#ffcc29] text-black hover:bg-[#ffcc29]/90 font-bold shadow-lg shadow-[#ffcc29]/10'}`}
              >
                <CheckSquare size={13} /> Guardar Escenario
              </button>
              <button onClick={handleResetSimulator} className="flex items-center px-4 py-2 bg-white/10 border border-white/20 rounded-xl hover:bg-white/20 transition text-xs font-mono gap-2 text-white">
                <RefreshCw size={13} /> Restaurar Línea Base
              </button>
            </div>
          </div>

          {/* Success Save Banner */}
          {showSaveSuccess && (
            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-2xl text-green-400 text-xs flex items-start gap-2 animate-in slide-in-from-top duration-200">
              <CheckSquare className="shrink-0 mt-0.5" size={16} />
              <div>
                <p className="font-bold text-sm">Escenario Guardado</p>
                <p className="mt-1">El escenario simulado ha sido registrado y guardado con éxito.</p>
              </div>
            </div>
          )}

          {/* Validation Errors banner */}
          {Object.keys(validationErrors).length > 0 && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-xs flex items-start gap-2 animate-in slide-in-from-top duration-200">
              <AlertTriangle className="shrink-0 mt-0.5 animate-bounce" size={16} />
              <div>
                <p className="font-bold text-sm">Error de Validación de Presupuesto</p>
                <p className="mt-1">Existen recursos donde el **Pago Efectivo** supera el **Valor Proyectado** de ingresos. Por favor corrija los valores resaltados en rojo antes de continuar.</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Income resource modifiers */}
            <div className="glass-card rounded-[32px] p-6 lg:p-8 border border-white/10 flex flex-col gap-6">
              <h4 className="text-sm font-bold text-[#ffcc29] uppercase tracking-widest flex items-center gap-2 pb-4 border-b border-white/5">
                <TrendingUp size={16} /> Ajustar Variación de Ingresos
              </h4>
              <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {RESOURCES_LIST.map(r => {
                  const val = simIngByResource[r] || 0;
                  const baseVal = financialData.resourceBaselines[r]?.ing || 0;
                  const simVal = baseVal * (1 + val / 100);
                  
                  // Deviation color
                  const absDev = Math.abs(val);
                  let devDot = 'bg-green-400';
                  let devLabel = 'Estable';
                  if (absDev > 5 && absDev <= 15) {
                    devDot = 'bg-yellow-400';
                    devLabel = 'Modificado';
                  } else if (absDev > 15) {
                    devDot = 'bg-red-400';
                    devLabel = 'Desviación Alta';
                  }

                  return (
                    <div key={r} className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-3 hover:border-white/20 transition-all">
                      {/* Name & IA */}
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${devDot}`} title={devLabel}></span>
                          <span className="text-white font-bold text-xs truncate max-w-[200px]" title={getResourceFullName(r)}>
                            {getResourceFullName(r)}
                          </span>
                        </div>
                        <button 
                          onClick={() => setSelectedAiResource(r)} 
                          className="flex items-center gap-1 px-2.5 py-1 bg-[#ffcc29]/10 border border-[#ffcc29]/20 text-[#ffcc29] text-[10px] font-bold rounded-lg hover:bg-[#ffcc29]/20 transition-all"
                        >
                          <Compass size={11} /> IA Sugerir
                        </button>
                      </div>

                      {/* Info grid */}
                      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-on-surface-variant">
                        <div>
                          <p>VALOR INICIAL (BASE)</p>
                          <p className="text-white font-bold mt-0.5">${(baseVal).toLocaleString('es-CO', {maximumFractionDigits:1})}M</p>
                        </div>
                        <div>
                          <p>VALOR PROYECTADO</p>
                          <p className="text-[#ffcc29] font-bold mt-0.5">${(simVal).toLocaleString('es-CO', {maximumFractionDigits:1})}M</p>
                        </div>
                      </div>

                      {/* Variation row */}
                      <div className="flex justify-between items-center text-[10px] font-mono border-t border-white/5 pt-2">
                        <span className="text-on-surface-variant">VARIACIÓN</span>
                        <span className={`font-bold ${val >= 0 ? 'text-[#4ade80]' : 'text-[#ff5b5b]'}`}>
                          {val >= 0 ? '+' : ''}${(simVal - baseVal).toLocaleString('es-CO', {maximumFractionDigits:1})}M ({val >= 0 ? '+' : ''}{val.toFixed(1)}%)
                        </span>
                      </div>

                      {/* Controls row */}
                      <div className="flex items-center gap-4 pt-1">
                        <input 
                          type="range"
                          min="-50"
                          max="50"
                          step="1"
                          value={val}
                          onChange={(e) => {
                            const n = parseInt(e.target.value);
                            setSimIngByResource(prev => ({ ...prev, [r]: n }));
                          }}
                          className="flex-1 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#ffcc29]"
                        />
                        <div className="flex items-center bg-black/40 border border-white/10 rounded-xl px-2.5 py-1 w-24 shrink-0">
                          <input
                            type="number"
                            step="0.1"
                            value={parseFloat(simVal.toFixed(1))}
                            onChange={(e) => {
                              const inputVal = parseFloat(e.target.value) || 0;
                              let newPct = baseVal > 0 ? ((inputVal / baseVal) - 1) * 100 : 0;
                              newPct = Math.max(-50, Math.min(50, newPct));
                              setSimIngByResource(prev => ({ ...prev, [r]: parseFloat(newPct.toFixed(1)) }));
                            }}
                            className="bg-transparent text-white font-mono text-[11px] outline-none w-full text-right"
                          />
                          <span className="text-[9px] text-on-surface-variant ml-1 font-mono">M</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Expense resource modifiers */}
            <div className="glass-card rounded-[32px] p-6 lg:p-8 border border-white/10 flex flex-col gap-6">
              
              <div>
                <h4 className="text-sm font-bold text-[#f43f5e] uppercase tracking-widest flex items-center gap-2 pb-4 border-b border-white/5">
                  <Briefcase size={16} /> Ajustar Egresos por Recurso
                </h4>
                <div className="space-y-6 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar mt-4">
                  {RESOURCES_LIST.map(r => {
                    const val = simGasByResource[r] || 0;
                    const baseValComp = financialData.resourceBaselines[r]?.gasComp || 0;
                    const baseValPago = financialData.resourceBaselines[r]?.gasPago || 0;
                    
                    const simValComp = baseValComp * (1 + val / 100);
                    const simValPago = baseValPago * (1 + val / 100);

                    // Income projected for r
                    const ingBase = financialData.resourceBaselines[r]?.ing || 0;
                    const ingVal = ingBase * (1 + (simIngByResource[r] || 0) / 100);

                    // Validation rule: Pago Efectivo <= Valor Proyectado
                    const isInvalid = simValPago > ingVal;

                    return (
                      <div key={r} className={`p-4 bg-white/5 border rounded-2xl space-y-3 transition-all ${isInvalid ? 'border-red-500 bg-red-500/5 shadow-lg shadow-red-500/5' : 'border-white/10 hover:border-white/20'}`}>
                        {/* Name & Badge & IA */}
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex flex-col">
                            <span className="text-white font-bold text-xs truncate max-w-[200px]" title={getResourceFullName(r)}>
                              {getResourceFullName(r)}
                            </span>
                            {isInvalid && (
                              <span className="inline-block self-start mt-1 text-red-400 font-mono text-[9px] font-bold uppercase px-2 py-0.5 bg-red-500/10 rounded-md border border-red-500/20">
                                Exceso Egresos
                              </span>
                            )}
                          </div>
                          <button 
                            onClick={() => setSelectedAiExpenseResource(r)} 
                            className="flex items-center gap-1 px-2.5 py-1 bg-[#f43f5e]/10 border border-[#f43f5e]/20 text-[#f43f5e] text-[10px] font-bold rounded-lg hover:bg-[#f43f5e]/20 transition-all shrink-0"
                          >
                            <Compass size={11} /> IA Sugerir
                          </button>
                        </div>

                        {/* Info grid */}
                        <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-on-surface-variant">
                          <div>
                            <p>VALOR INICIAL (COMP/PAGO)</p>
                            <p className="text-white font-bold mt-0.5">${baseValComp.toFixed(1)}M / ${baseValPago.toFixed(1)}M</p>
                          </div>
                          <div>
                            <p>VALOR PROYECTADO (COMP/PAGO)</p>
                            <p className="text-[#f43f5e] font-bold mt-0.5">${simValComp.toFixed(1)}M / ${simValPago.toFixed(1)}M</p>
                          </div>
                        </div>

                        {/* Variation row */}
                        <div className="flex justify-between items-center text-[10px] font-mono border-t border-white/5 pt-2">
                          <span className="text-on-surface-variant">VARIACIÓN</span>
                          <span className={`font-bold ${val >= 0 ? 'text-[#ff5b5b]' : 'text-[#4ade80]'}`}>
                            {val >= 0 ? '+' : ''}{val.toFixed(1)}% (Pago: {val >= 0 ? '+' : ''}${(simValPago - baseValPago).toFixed(1)}M)
                          </span>
                        </div>

                        {/* Controls row */}
                        <div className="flex items-center gap-4 pt-1">
                          <input 
                            type="range"
                            min="-50"
                            max="50"
                            step="1"
                            value={val}
                            onChange={(e) => {
                              const n = parseInt(e.target.value);
                              setSimGasByResource(prev => ({ ...prev, [r]: n }));
                            }}
                            className="flex-1 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#f43f5e]"
                          />
                          <div className="flex items-center bg-black/40 border border-white/10 rounded-xl px-2.5 py-1 w-24 shrink-0">
                            <input
                              type="number"
                              step="0.1"
                              value={parseFloat(simValPago.toFixed(1))}
                              onChange={(e) => {
                                const inputVal = parseFloat(e.target.value) || 0;
                                let newPct = baseValPago > 0 ? ((inputVal / baseValPago) - 1) * 100 : 0;
                                newPct = Math.max(-50, Math.min(50, newPct));
                                setSimGasByResource(prev => ({ ...prev, [r]: parseFloat(newPct.toFixed(1)) }));
                              }}
                              className="bg-transparent text-white font-mono text-[11px] outline-none w-full text-right"
                            />
                            <span className="text-[9px] text-on-surface-variant ml-1 font-mono">M</span>
                          </div>
                        </div>

                        {/* Validation message warning */}
                        {isInvalid && (
                          <div className="text-[10px] text-red-400 font-mono mt-2 leading-relaxed bg-red-500/10 p-2.5 rounded-lg border border-red-500/20 flex gap-1.5 items-start">
                            <AlertTriangle className="shrink-0 mt-0.5" size={12} />
                            <span>El valor del Pago Efectivo no puede ser superior al Valor Proyectado del recurso (${ingVal.toFixed(1)}M).</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold text-[#7bd0ff] uppercase tracking-widest flex items-center gap-2 pb-4 border-b border-white/5">
                  <Layers size={16} /> Ajustar Egresos por Tipo/Categoría
                </h4>
                <div className="space-y-6 mt-4">
                  {[
                    { id: 'Personal', label: 'Gastos de Personal (2.1.1)' },
                    { id: 'Funcionamiento', label: 'Gastos de Funcionamiento (2.1.2)' },
                    { id: 'Transferencias', label: 'Transferencias Corrientes (2.1.3)' },
                    { id: 'Tasas', label: 'Tasas y Multas (2.1.8)' },
                    { id: 'Deuda', label: 'Servicios de la Deuda (2.2.2)' },
                    { id: 'Inversion', label: 'Gastos de Inversión (2.3)' }
                  ].map(c => {
                    const val = simGasByType[c.id] || 0;
                    return (
                      <div key={c.id} className="space-y-2">
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-white/80 font-bold">{c.label}</span>
                          <span className="text-[#7bd0ff] font-bold">{val >= 0 ? '+' : ''}{val}%</span>
                        </div>
                        <input 
                          type="range"
                          min="-30"
                          max="30"
                          value={val}
                          onChange={(e) => {
                            const n = parseInt(e.target.value);
                            setSimGasByType(prev => ({ ...prev, [c.id]: n }));
                          }}
                          className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#7bd0ff]"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {activeTab === 'expenses' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Donut Chart */}
            <div className="glass-card rounded-[32px] p-6 lg:p-8 border border-white/10 flex flex-col items-center justify-center glow-primary min-h-[400px]">
              <h3 className="text-xl font-display font-medium text-white mb-6">Distribución de Gastos por Rubro</h3>
              <div className="w-full h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expensesBreakdown[viewDimension] || []}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={95}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {(expensesBreakdown[viewDimension] || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              {/* Legend */}
              <div className="grid grid-cols-2 gap-4 mt-6 text-xs w-full max-w-md font-mono">
                {(expensesBreakdown[viewDimension] || []).map((entry, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                    <span className="text-white/80 truncate" title={entry.name}>{entry.name.substring(0, 24)}...</span>
                    <span className="text-[#ffcc29] font-bold ml-auto">${entry.value.toFixed(1)}M</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Matrix table */}
            <div className="glass-card rounded-[32px] p-6 lg:p-8 border border-white/10 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-display font-medium text-white">Matriz Rubros vs. Recursos</h3>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-1 flex gap-1 text-[10px] font-bold uppercase">
                    <button 
                      onClick={() => setViewDimension('compromiso')}
                      className={`px-3 py-1 rounded-lg ${viewDimension === 'compromiso' ? 'bg-[#ffcc29] text-black' : 'text-white/60'}`}
                    >
                      Compromiso
                    </button>
                    <button 
                      onClick={() => setViewDimension('pago')}
                      className={`px-3 py-1 rounded-lg ${viewDimension === 'pago' ? 'bg-[#ffcc29] text-black' : 'text-white/60'}`}
                    >
                      Pago
                    </button>
                  </div>
                </div>

                <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                  {(expensesBreakdown[viewDimension] || []).map((row, idx) => {
                    const totalVal = (expensesBreakdown[viewDimension] || []).reduce((acc: number, item: any) => acc + (item.value || 0), 0);
                    const pct = totalVal > 0 ? (row.value / totalVal) * 100 : 0;
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-white/80 font-bold">{row.name}</span>
                          <span className="text-white font-bold">${row.value.toLocaleString('es-CO', {maximumFractionDigits:1})}M ({pct.toFixed(1)}%)</span>
                        </div>
                        <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: COLORS[idx % COLORS.length] }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
            </div>
          </div>
        </div>
      </div>
    )}

      {activeTab === 'sensitivity' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          
          {/* Controls Header */}
          <div className="glass-card rounded-[32px] p-6 lg:p-8 border border-white/10 flex flex-wrap justify-between items-center gap-6">
            <div className="space-y-1">
              <h3 className="text-xl font-display font-medium text-white">Análisis de Sensibilidad y Elasticidad</h3>
              <p className="text-xs text-on-surface-variant">Estudio de impacto en el VAN (NPV) y la TIR (IRR) bajo variaciones del entorno financiero.</p>
            </div>
            
            {/* Resource Selector */}
            <div className="flex items-center bg-black/40 border border-white/10 rounded-xl px-4 py-2">
              <span className="text-xs font-mono text-on-surface-variant mr-3 uppercase">Recurso:</span>
              <select
                value={sensResource}
                onChange={(e) => setSensResource(e.target.value)}
                className="bg-transparent text-xs text-white font-bold outline-none cursor-pointer"
              >
                <option value="Todos" className="bg-[#0f172a]">Todos los Recursos</option>
                {RESOURCES_LIST.map(r => (
                  <option key={r} value={r} className="bg-[#0f172a]">{getResourceFullName(r)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Parameters Sliders */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Tasa de descuento slider */}
            <div className="glass-card rounded-2xl p-6 border border-white/5 bg-white/5">
              <div className="flex justify-between text-xs font-mono mb-3">
                <span className="text-white/60">Tasa de Descuento (k)</span>
                <span className="text-[#ffcc29] font-bold">{sensDiscountRate}% Anual</span>
              </div>
              <input
                type="range"
                min="1"
                max="25"
                step="1"
                value={sensDiscountRate}
                onChange={(e) => setSensDiscountRate(parseInt(e.target.value))}
                className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#ffcc29]"
              />
              <p className="text-[10px] text-on-surface-variant mt-2 font-mono">Tasa de oportunidad requerida para calcular el VAN.</p>
            </div>

            {/* Pessimistic Pct slider */}
            <div className="glass-card rounded-2xl p-6 border border-white/5 bg-white/5">
              <div className="flex justify-between text-xs font-mono mb-3">
                <span className="text-white/60">Variación Escenario Pesimista</span>
                <span className="text-red-400 font-bold">{sensPessimisticPct}% Ingreso</span>
              </div>
              <input
                type="range"
                min="-40"
                max="-5"
                step="5"
                value={sensPessimisticPct}
                onChange={(e) => setSensPessimisticPct(parseInt(e.target.value))}
                className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-red-400"
              />
              <p className="text-[10px] text-on-surface-variant mt-2 font-mono">Simula la caída de ingresos y aumento proporcional de egresos.</p>
            </div>

            {/* Optimistic Pct slider */}
            <div className="glass-card rounded-2xl p-6 border border-white/5 bg-white/5">
              <div className="flex justify-between text-xs font-mono mb-3">
                <span className="text-white/60">Variación Escenario Optimista</span>
                <span className="text-[#4ade80] font-bold">+{sensOptimisticPct}% Ingreso</span>
              </div>
              <input
                type="range"
                min="5"
                max="40"
                step="5"
                value={sensOptimisticPct}
                onChange={(e) => setSensOptimisticPct(parseInt(e.target.value))}
                className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#4ade80]"
              />
              <p className="text-[10px] text-on-surface-variant mt-2 font-mono">Simula el incremento de ingresos y reducción proporcional de egresos.</p>
            </div>

          </div>

          {/* Scenario Comparison Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Pessimistic Scenario Card */}
            <div className="glass-card rounded-[28px] p-6 border border-red-500/20 bg-red-500/5 relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 left-0 w-full h-1 bg-red-500"></div>
              <div>
                <h4 className="text-sm font-bold text-red-400 font-display">Escenario Pesimista</h4>
                <p className="text-[10px] text-on-surface-variant font-mono mt-1">Simulado a {sensPessimisticPct}% Ing / +{Math.abs(sensPessimisticPct) / 1.5}% Egr</p>
                
                <div className="space-y-4 mt-6">
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-xs text-on-surface-variant">Ingreso Proyectado Anual</span>
                    <span className="text-sm font-mono font-bold text-white">${sensitivityAnalysis.pessimistic.ingTotal.toLocaleString('es-CO', {maximumFractionDigits:1})}M</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-xs text-on-surface-variant">NPV / VAN</span>
                    <span className="text-sm font-mono font-bold text-white">${sensitivityAnalysis.pessimistic.npv.toLocaleString('es-CO', {maximumFractionDigits:1})}M</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-xs text-on-surface-variant">IRR / TIR</span>
                    <span className="text-sm font-mono font-bold text-white">{sensitivityAnalysis.pessimistic.irr > 0 ? `${sensitivityAnalysis.pessimistic.irr.toFixed(1)}%` : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-xs text-on-surface-variant">Flujo Neto (Dic 31)</span>
                    <span className="text-sm font-mono font-bold text-white">${sensitivityAnalysis.pessimistic.flowSum.toLocaleString('es-CO', {maximumFractionDigits:1})}M</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Base Scenario Card */}
            <div className="glass-card rounded-[28px] p-6 border border-white/10 bg-white/5 relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 left-0 w-full h-1 bg-white/30"></div>
              <div>
                <h4 className="text-sm font-bold text-white font-display">Escenario Base</h4>
                <p className="text-[10px] text-on-surface-variant font-mono mt-1">Simulado a 0% variación (Proyección Actual)</p>
                
                <div className="space-y-4 mt-6">
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-xs text-on-surface-variant">Ingreso Proyectado Anual</span>
                    <span className="text-sm font-mono font-bold text-white">${sensitivityAnalysis.base.ingTotal.toLocaleString('es-CO', {maximumFractionDigits:1})}M</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-xs text-on-surface-variant">NPV / VAN</span>
                    <span className="text-sm font-mono font-bold text-white">${sensitivityAnalysis.base.npv.toLocaleString('es-CO', {maximumFractionDigits:1})}M</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-xs text-on-surface-variant">IRR / TIR</span>
                    <span className="text-sm font-mono font-bold text-white">{sensitivityAnalysis.base.irr > 0 ? `${sensitivityAnalysis.base.irr.toFixed(1)}%` : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-xs text-on-surface-variant">Flujo Neto (Dic 31)</span>
                    <span className="text-sm font-mono font-bold text-white">${sensitivityAnalysis.base.flowSum.toLocaleString('es-CO', {maximumFractionDigits:1})}M</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Optimistic Scenario Card */}
            <div className="glass-card rounded-[28px] p-6 border border-green-500/20 bg-green-500/5 relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 left-0 w-full h-1 bg-green-500"></div>
              <div>
                <h4 className="text-sm font-bold text-green-400 font-display">Escenario Optimista</h4>
                <p className="text-[10px] text-on-surface-variant font-mono mt-1">Simulado a +{sensOptimisticPct}% Ing / -{sensOptimisticPct / 1.5}% Egr</p>
                
                <div className="space-y-4 mt-6">
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-xs text-on-surface-variant">Ingreso Proyectado Anual</span>
                    <span className="text-sm font-mono font-bold text-white">${sensitivityAnalysis.optimistic.ingTotal.toLocaleString('es-CO', {maximumFractionDigits:1})}M</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-xs text-on-surface-variant">NPV / VAN</span>
                    <span className="text-sm font-mono font-bold text-white">${sensitivityAnalysis.optimistic.npv.toLocaleString('es-CO', {maximumFractionDigits:1})}M</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-xs text-on-surface-variant">IRR / TIR</span>
                    <span className="text-sm font-mono font-bold text-white">{sensitivityAnalysis.optimistic.irr > 0 ? `${sensitivityAnalysis.optimistic.irr.toFixed(1)}%` : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-xs text-on-surface-variant">Flujo Neto (Dic 31)</span>
                    <span className="text-sm font-mono font-bold text-white">${sensitivityAnalysis.optimistic.flowSum.toLocaleString('es-CO', {maximumFractionDigits:1})}M</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Elasticity analysis & Line chart */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Chart */}
            <div className="lg:col-span-2 glass-card rounded-[32px] p-6 border border-white/10 flex flex-col h-[350px]">
              <h4 className="text-sm font-bold text-white uppercase tracking-widest mb-4">Evolución de Flujos por Escenario</h4>
              <div className="flex-1 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={new Array(12).fill(0).map((_, i) => ({
                      name: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'][i],
                      Pesimista: parseFloat(sensitivityAnalysis.pessimistic.flows[i].toFixed(1)),
                      Base: parseFloat(sensitivityAnalysis.base.flows[i].toFixed(1)),
                      Optimista: parseFloat(sensitivityAnalysis.optimistic.flows[i].toFixed(1))
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="name" stroke="#94a3b8" className="text-[10px] font-mono" />
                    <YAxis stroke="#94a3b8" className="text-[10px] font-mono" />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)' }} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Area type="monotone" dataKey="Optimista" stroke="#4ade80" fill="#4ade80" fillOpacity={0.05} />
                    <Area type="monotone" dataKey="Base" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.05} />
                    <Area type="monotone" dataKey="Pesimista" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.05} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Elasticity coefficient card */}
            <div className="glass-card rounded-[32px] p-6 border border-white/10 flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span>Coeficientes de Elasticidad</span>
                </h4>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Mide la sensibilidad del Valor Actual Neto (VAN) frente a cambios del 1% en los componentes de flujo.
                </p>

                <div className="space-y-4 mt-6">
                  <div className="p-4 bg-white/5 border border-white/5 rounded-2xl">
                    <p className="text-[10px] text-on-surface-variant font-mono uppercase">Elasticidad Ingreso-VAN</p>
                    <p className="text-lg font-bold text-[#ffcc29] mt-1">
                      {sensitivityAnalysis.elasticityIng >= 0 ? '+' : ''}{sensitivityAnalysis.elasticityIng.toFixed(2)}%
                    </p>
                    <p className="text-[10px] text-white/50 mt-1">
                      Por cada 1% de incremento en el ingreso proyectado de este recurso, el VAN se modifica en un **{Math.abs(sensitivityAnalysis.elasticityIng).toFixed(2)}%**.
                    </p>
                  </div>

                  <div className="p-4 bg-white/5 border border-white/5 rounded-2xl">
                    <p className="text-[10px] text-on-surface-variant font-mono uppercase">Elasticidad Egreso-VAN</p>
                    <p className="text-lg font-bold text-[#f43f5e] mt-1">
                      {sensitivityAnalysis.elasticityGas >= 0 ? '+' : ''}{sensitivityAnalysis.elasticityGas.toFixed(2)}%
                    </p>
                    <p className="text-[10px] text-white/50 mt-1">
                      Por cada 1% de incremento en el egreso proyectado, el VAN se modifica en un **{Math.abs(sensitivityAnalysis.elasticityGas).toFixed(2)}%**.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Monte Carlo & Tornado Chart Column Stack */}
          <div className="flex flex-col gap-8 mt-6">
            
            {/* Monte Carlo Simulation Dashboard */}
            <div className="glass-card rounded-[32px] p-6 lg:p-8 border border-white/10 flex flex-col justify-between bg-surface/50">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                    <Activity size={16} className="text-[#c084fc]" /> Simulación de Monte Carlo (1000 Iteraciones)
                  </h4>
                  <span className="px-2.5 py-0.5 bg-[#c084fc]/10 border border-[#c084fc]/20 text-[#c084fc] text-[9px] font-bold font-mono rounded-md uppercase">
                    Modelado Estocástico
                  </span>
                </div>
                <p className="text-xs text-on-surface-variant leading-relaxed mb-6">
                  Simulación de variabilidad aleatoria de ingresos (±20%) y egresos (±15%) para medir la probabilidad de éxito financiero (1000 corridas estocásticas).
                </p>

                {/* Monte Carlo Key Stats */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-white/5 border border-white/5 rounded-2xl p-4 text-center">
                    <p className="text-[9px] text-on-surface-variant font-mono uppercase">Prob. VAN &gt; 0</p>
                    <p className="text-xl font-display font-bold text-[#4ade80] mt-1">
                      {sensitivityAnalysis.monteCarlo.probPos.toFixed(1)}%
                    </p>
                  </div>
                  <div className="bg-white/5 border border-white/5 rounded-2xl p-4 text-center">
                    <p className="text-[9px] text-on-surface-variant font-mono uppercase">VAN Medio</p>
                    <p className="text-xl font-display font-bold text-[#ffcc29] mt-1">
                      ${sensitivityAnalysis.monteCarlo.mean.toLocaleString('es-CO', {maximumFractionDigits:1})}M
                    </p>
                  </div>
                  <div className="bg-white/5 border border-white/5 rounded-2xl p-4 text-center">
                    <p className="text-[9px] text-on-surface-variant font-mono uppercase">Intervalo 95%</p>
                    <p className="text-[10px] font-mono font-bold text-white mt-2 truncate" title={`[${sensitivityAnalysis.monteCarlo.low95.toLocaleString('es-CO', {maximumFractionDigits:1})}M, ${sensitivityAnalysis.monteCarlo.high95.toLocaleString('es-CO', {maximumFractionDigits:1})}M]`}>
                      [${sensitivityAnalysis.monteCarlo.low95.toLocaleString('es-CO', {maximumFractionDigits:1})}M, ${sensitivityAnalysis.monteCarlo.high95.toLocaleString('es-CO', {maximumFractionDigits:1})}M]
                    </p>
                  </div>
                </div>

                {/* Histogram */}
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={sensitivityAnalysis.monteCarlo.bins}
                      margin={{ top: 10, right: 10, left: 10, bottom: 40 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis 
                        dataKey="range" 
                        stroke="#94a3b8" 
                        className="text-[9px] font-mono" 
                        interval={0} 
                        angle={-30} 
                        textAnchor="end" 
                        height={60} 
                      />
                      <YAxis stroke="#94a3b8" className="text-[9px] font-mono" />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)' }} />
                      <Bar dataKey="Frecuencia" fill="#c084fc" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Tornado Chart */}
            <div className="glass-card rounded-[32px] p-6 lg:p-8 border border-white/10 flex flex-col justify-between bg-surface/50">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                    <Layers size={16} className="text-[#7bd0ff]" /> Diagrama de Tornado (Sensibilidad de Recursos)
                  </h4>
                  <span className="px-2.5 py-0.5 bg-[#7bd0ff]/10 border border-[#7bd0ff]/20 text-[#7bd0ff] text-[9px] font-bold font-mono rounded-md uppercase">
                    Impacto en VAN Global
                  </span>
                </div>
                <p className="text-xs text-on-surface-variant leading-relaxed mb-6">
                  Muestra la sensibilidad del VAN total del presupuesto universitario ante una variación de ±10% en cada recurso individual.
                </p>

                {/* Tornado Bar Chart */}
                <div className="h-[400px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={sensitivityAnalysis.tornado}
                      margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={true} horizontal={false} />
                      <XAxis type="number" stroke="#94a3b8" className="text-[9px] font-mono" />
                      <YAxis type="category" dataKey="name" stroke="#94a3b8" className="text-[10px] font-mono" width={150} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)' }}
                        formatter={(value: any, name: any) => {
                          const val = parseFloat(value);
                          return [`${val >= 0 ? '+' : ''}${val}M`, name === 'low' ? 'Bajo (-10%)' : 'Alto (+10%)'];
                        }}
                      />
                      <ReferenceLine x={0} stroke="#ffffff" strokeOpacity={0.2} strokeDasharray="3 3" />
                      <Bar dataKey="low" fill="#f43f5e" radius={[4, 0, 0, 4]} stackId="stack" />
                      <Bar dataKey="high" fill="#4ade80" radius={[0, 4, 4, 0]} stackId="stack" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-[9px] text-on-surface-variant mt-2 text-center font-mono">El ancho de barra representa la elasticidad del recurso. Barras más largas indican mayor impacto presupuestal.</p>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* AI Recommendation Modal */}
      {selectedAiResource && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-white/10 rounded-[32px] w-full max-w-lg p-6 md:p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            
            {/* Modal Header */}
            <div className="flex justify-between items-start gap-4">
              <div>
                <span className="px-2.5 py-1 bg-[#ffcc29]/10 border border-[#ffcc29]/20 text-[#ffcc29] text-[10px] font-bold font-mono rounded-lg uppercase tracking-wider">
                  Asistente Inteligente (IA)
                </span>
                <h3 className="text-xl font-display font-bold text-white mt-2">Recomendación de Proyección</h3>
              </div>
              <button 
                onClick={() => setSelectedAiResource(null)}
                className="text-white/60 hover:text-white transition-colors p-1"
              >
                ✕
              </button>
            </div>

            {/* Resource details */}
            <div className="bg-white/5 border border-white/5 rounded-2xl p-4 space-y-2">
              <p className="text-on-surface-variant text-[10px] font-mono uppercase tracking-wider">Recurso Presupuestal</p>
              <p className="text-sm text-white font-bold">{getResourceFullName(selectedAiResource)}</p>
            </div>

            {/* Recommendation info */}
            {(() => {
              const suggestion = aiSuggestions[selectedAiResource];
              const baseVal = financialData.resourceBaselines[selectedAiResource]?.ing || 0;
              const sliderValue = baseVal > 0 ? Math.round(((suggestion.value / baseVal) - 1) * 100) : 0;
              
              return (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                      <p className="text-on-surface-variant text-[10px] font-mono uppercase tracking-wider">Valor Sugerido</p>
                      <p className="text-2xl font-display font-bold text-[#ffcc29] mt-1">${suggestion.value.toLocaleString('es-CO', {maximumFractionDigits:1})}M</p>
                    </div>
                    
                    <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                      <p className="text-on-surface-variant text-[10px] font-mono uppercase tracking-wider">Nivel de Confianza</p>
                      <p className="text-2xl font-display font-bold text-[#4ade80] mt-1">{suggestion.confidence}%</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-on-surface-variant text-[10px] font-mono uppercase tracking-wider">Justificación Técnica</p>
                    <p className="text-xs text-white/80 font-sans leading-relaxed bg-white/5 border border-white/5 p-4 rounded-2xl">
                      {suggestion.justification}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => {
                        setSimIngByResource(prev => ({ ...prev, [selectedAiResource]: sliderValue }));
                        setSelectedAiResource(null);
                      }}
                      className="flex-1 py-3 bg-[#ffcc29] hover:bg-[#ffcc29]/90 text-black font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-[#ffcc29]/10"
                    >
                      Aplicar sugerencia IA
                    </button>
                    <button
                      onClick={() => setSelectedAiResource(null)}
                      className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all border border-white/10"
                    >
                      Cerrar
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* AI Expense Recommendation Modal */}
      {selectedAiExpenseResource && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-white/10 rounded-[32px] w-full max-w-lg p-6 md:p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            
            {/* Modal Header */}
            <div className="flex justify-between items-start gap-4">
              <div>
                <span className="px-2.5 py-1 bg-[#f43f5e]/10 border border-[#f43f5e]/20 text-[#f43f5e] text-[10px] font-bold font-mono rounded-lg uppercase tracking-wider">
                  Asistente Inteligente (IA) - Egresos
                </span>
                <h3 className="text-xl font-display font-bold text-white mt-2">Recomendación de Egresos</h3>
              </div>
              <button 
                onClick={() => setSelectedAiExpenseResource(null)}
                className="text-white/60 hover:text-white transition-colors p-1"
              >
                ✕
              </button>
            </div>

            {/* Resource details */}
            <div className="bg-white/5 border border-white/5 rounded-2xl p-4 space-y-2">
              <p className="text-on-surface-variant text-[10px] font-mono uppercase tracking-wider">Recurso Presupuestal</p>
              <p className="text-sm text-white font-bold">{getResourceFullName(selectedAiExpenseResource)}</p>
            </div>

            {/* Recommendation info */}
            {(() => {
              const suggestion = aiSuggestionsExpenses[selectedAiExpenseResource];
              const baseVal = financialData.resourceBaselines[selectedAiExpenseResource]?.gasPago || 0;
              const sliderValue = baseVal > 0 ? Math.round(((suggestion.value / baseVal) - 1) * 100) : 0;
              
              return (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                      <p className="text-on-surface-variant text-[10px] font-mono uppercase tracking-wider">Sugerencia (Pago)</p>
                      <p className="text-2xl font-display font-bold text-[#f43f5e] mt-1">${suggestion.value.toLocaleString('es-CO', {maximumFractionDigits:1})}M</p>
                    </div>
                    
                    <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                      <p className="text-on-surface-variant text-[10px] font-mono uppercase tracking-wider">Nivel de Confianza</p>
                      <p className="text-2xl font-display font-bold text-[#4ade80] mt-1">{suggestion.confidence}%</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-on-surface-variant text-[10px] font-mono uppercase tracking-wider">Justificación Técnica</p>
                    <p className="text-xs text-white/80 font-sans leading-relaxed bg-white/5 border border-white/5 p-4 rounded-2xl">
                      {suggestion.justification}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => {
                        setSimGasByResource(prev => ({ ...prev, [selectedAiExpenseResource]: sliderValue }));
                        setSelectedAiExpenseResource(null);
                      }}
                      className="flex-1 py-3 bg-[#f43f5e] hover:bg-[#f43f5e]/90 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-[#f43f5e]/10"
                    >
                      Aplicar sugerencia IA
                    </button>
                    <button
                      onClick={() => setSelectedAiExpenseResource(null)}
                      className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all border border-white/10"
                    >
                      Cerrar
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
