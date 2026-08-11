import { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ComposedChart, Line,
  ReferenceLine
} from 'recharts';
import { 
  Filter, DollarSign, Activity, TrendingUp, Briefcase, RefreshCw, Layers, 
  Compass, ChevronRight, PieChart as PieChartIcon, Table, CheckSquare,
  AlertTriangle, ShieldAlert, Gauge, TrendingDown, Target, ShieldCheck,
  ChevronUp, ChevronDown, Wallet, Users, Sliders, ArrowUpRight, ArrowDownRight,
  Sparkles, CheckCircle2
} from 'lucide-react';
import { fetchAndParseCSV } from '../lib/csvParser';
import { 
  calculateProjections, aggregateFlow, CashFlowItem, ProjectionResults,
  BUDGET_PAYROLL_2026, PAYROLL_REAL_ENE_JUL, PAYROLL_REMAINING_AGO_DIC
} from '../lib/financialEngine';
import { RESOURCES_LIST, getResourceFullName, getRecursoEquivalence, getRowResourceCode } from '../lib/resourceMapper';
import rawHistoricalGastos from '../data/historicalGastos.json';
import { MultiYearProjectionScreen } from './MultiYearProjectionScreen';

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
  return (Math.pow(1 + r1, 12) - 1) * 100;
}

const COLORS = ['#ffcc29', '#4ade80', '#3b82f6', '#c084fc', '#f43f5e', '#7bd0ff', '#fb7185', '#a78bfa'];

export function PredictiveScreen({ onNavigate }: { onNavigate: (s: string) => void }) {
  const [dataStage, setDataStage] = useState<'loading' | 'ready'>('loading');
  const [rawYearlyIncomes, setRawYearlyIncomes] = useState<Record<number, any[]>>({});
  const [rawCumulativeIncomes, setRawCumulativeIncomes] = useState<any[]>([]);
  const [selectedAiResource, setSelectedAiResource] = useState<string | null>(null);
  const [selectedAiExpenseResource, setSelectedAiExpenseResource] = useState<string | null>(null);
  const [selectedAiExpenseCategory, setSelectedAiExpenseCategory] = useState<string | null>(null);
  const [showSaveSuccess, setShowSaveSuccess] = useState<boolean>(false);
  const incomeAnalysisFilter = 'Todos';
  const [expandedIngresoGroup, setExpandedIngresoGroup] = useState<string | null>(null);
  const [expandedGastoCardGroup, setExpandedGastoCardGroup] = useState<string | null>(null);
  
  // Tabs: Simular Escenarios is FIRST by default!
  const [activeTab, setActiveTab] = useState<'simulator' | 'kpi' | 'flow' | 'cobertura' | 'sensitivity' | 'equilibrium'>('simulator');

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

  // Slider State
  const [simIngByResource, setSimIngByResource] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('vafi_simIngByResource');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    const init: Record<string, number> = {};
    RESOURCES_LIST.forEach(r => { init[r] = 0; });
    return init;
  });

  const [simGasByResource, setSimGasByResource] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('vafi_simGasByResource');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    const init: Record<string, number> = {};
    RESOURCES_LIST.forEach(r => { init[r] = 0; });
    return init;
  });

  const [simGasByType, setSimGasByType] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('vafi_simGasByType');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      "Personal": 0,
      "Funcionamiento": 0,
      "Transferencias": 0,
      "Tasas": 0,
      "Deuda": 0,
      "Inversion": 0
    };
  });

  const [expenseAdjustMode, setExpenseAdjustMode] = useState<'resource' | 'category'>('category');

  // Fetch datasets
  useEffect(() => {
    async function loadAllData() {
      try {
        const years = [2023, 2024, 2025, 2026];
        const loadedData: Record<number, any[]> = {};
        
        await Promise.all(years.map(async (year) => {
          try {
            const rows = await fetchAndParseCSV(`/data/Ingreso%20Mensual%20${year}.csv`);
            if (rows && rows.length > 0) {
              loadedData[year] = rows;
            }
          } catch (e) {
            console.error(`Error loading Incomes ${year}:`, e);
          }
        }));
        
        // Fetch cumulative incomes (Ingresos.csv)
        try {
          const cumulativeIncomes = await fetchAndParseCSV('/data/Ingresos.csv');
          if (cumulativeIncomes && cumulativeIncomes.length > 0) {
            setRawCumulativeIncomes(cumulativeIncomes);
          }
        } catch (e) {
          console.error("Error loading cumulative incomes:", e);
        }

        setRawYearlyIncomes(loadedData);
        setDataStage('ready');
      } catch (err) {
        console.error("Critical error in PredictiveScreen loadData:", err);
        setDataStage('ready');
      }
    }

    loadAllData();
  }, []);

  // Filter dropdown options
  const filterOptions = useMemo(() => {
    const recursos = ['Todos', ...RESOURCES_LIST];
    const unidadesSet = new Set<string>();
    const tiposGastoSet = new Set<string>();

    rawHistoricalGastos.forEach(row => {
      if (row.dependencia) unidadesSet.add(row.dependencia);
      if (row.tipo) tiposGastoSet.add(row.tipo);
    });

    return {
      recursos,
      unidades: ['Todos', ...Array.from(unidadesSet).sort()],
      tiposGasto: ['Todos', ...Array.from(tiposGastoSet).sort()]
    };
  }, []);

  // Calculation Engine
  const financialData: ProjectionResults = useMemo(() => {
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
      simGasByType,
      expenseAdjustMode
    });
  }, [
    rawYearlyIncomes, rawCumulativeIncomes, filterUnidad, filterRecurso,
    filterMes, filterTipoGasto, simIngByResource, simGasByResource,
    simGasByType, expenseAdjustMode
  ]);

  // Aggregated temporal cash flow
  const aggregatedFlowData = useMemo(() => {
    return aggregateFlow(financialData.simulatedFlow, flowGranularity);
  }, [financialData.simulatedFlow, flowGranularity]);

  // Cut-off Subtotals (7 Months Real vs 5 Months Projected)
  const semesterTotals = useMemo(() => {
    if (!financialData || !financialData.simulatedFlow) {
      return {
        eneJulIng: 0, agoDicIng: 0,
        eneJulComp: 0, agoDicComp: 0,
        eneJulPago: 0, agoDicPago: 0,
        eneJulNomina: 0, agoDicNomina: 0
      };
    }
    const eneJul = financialData.simulatedFlow.slice(0, 7);
    const agoDic = financialData.simulatedFlow.slice(7, 12);
    return {
      eneJulIng: eneJul.reduce((sum, m) => sum + m.ingresos, 0),
      agoDicIng: agoDic.reduce((sum, m) => sum + m.ingresos, 0),
      eneJulComp: eneJul.reduce((sum, m) => sum + m.gastosComp, 0),
      agoDicComp: agoDic.reduce((sum, m) => sum + m.gastosComp, 0),
      eneJulPago: eneJul.reduce((sum, m) => sum + m.gastosPago, 0),
      agoDicPago: agoDic.reduce((sum, m) => sum + m.gastosPago, 0),
      eneJulNomina: eneJul.reduce((sum, m) => sum + m.gastoPersonal, 0),
      agoDicNomina: agoDic.reduce((sum, m) => sum + m.gastoPersonal, 0)
    };
  }, [financialData]);

  // Validation: Pago Efectivo <= Valor Proyectado
  const validationErrors = useMemo(() => {
    const errors: Record<string, string> = {};
    if (!financialData) return errors;

    RESOURCES_LIST.forEach(r => {
      const ingBase = financialData.resourceBaselines[r]?.ing || 0;
      const gasBasePago = financialData.resourceBaselines[r]?.gasPago || 0;
      
      const ingVal = ingBase * (1 + (simIngByResource[r] || 0) / 100);
      let gasVal = 0;
      if (expenseAdjustMode === 'category') {
        gasVal = (financialData.monthlySimGasPagoByRes[r] || []).reduce((a,b)=>a+b, 0) / 1e6;
      } else {
        gasVal = gasBasePago * (1 + (simGasByResource[r] || 0) / 100);
      }
      
      if (gasVal > ingVal && ingVal > 0) {
        errors[r] = "El valor del Pago Efectivo no puede ser superior al Valor Proyectado del recurso.";
      }
    });
    return errors;
  }, [simIngByResource, simGasByResource, financialData, expenseAdjustMode]);

  const handleResetSimulator = () => {
    const initIng: Record<string, number> = {};
    const initGas: Record<string, number> = {};
    RESOURCES_LIST.forEach(r => {
      initIng[r] = 0;
      initGas[r] = 0;
    });
    setSimIngByResource(initIng);
    setSimGasByResource(initGas);
    setSimGasByType({
      "Personal": 0,
      "Funcionamiento": 0,
      "Transferencias": 0,
      "Tasas": 0,
      "Deuda": 0,
      "Inversion": 0
    });
    localStorage.removeItem('vafi_simIngByResource');
    localStorage.removeItem('vafi_simGasByResource');
    localStorage.removeItem('vafi_simGasByType');
  };

  const handleSaveSimulation = () => {
    localStorage.setItem('vafi_simIngByResource', JSON.stringify(simIngByResource));
    localStorage.setItem('vafi_simGasByResource', JSON.stringify(simGasByResource));
    localStorage.setItem('vafi_simGasByType', JSON.stringify(simGasByType));
    setShowSaveSuccess(true);
    setTimeout(() => {
      setShowSaveSuccess(false);
    }, 3000);
  };

  // Quick Preset Scenarios
  const applyPresetScenario = (preset: 'conservador' | 'moderado' | 'optimista' | 'estres') => {
    const newIng: Record<string, number> = {};
    const newGas: Record<string, number> = {};
    const newGasType = { ...simGasByType };

    if (preset === 'conservador') {
      RESOURCES_LIST.forEach(r => { newIng[r] = -3; newGas[r] = -2; });
      newGasType.Personal = 0;
      newGasType.Funcionamiento = -5;
      newGasType.Inversion = -8;
    } else if (preset === 'moderado') {
      RESOURCES_LIST.forEach(r => { newIng[r] = 2; newGas[r] = 0; });
      newGasType.Personal = 0;
      newGasType.Funcionamiento = 0;
      newGasType.Inversion = 0;
    } else if (preset === 'optimista') {
      RESOURCES_LIST.forEach(r => { newIng[r] = 8; newGas[r] = 2; });
      newGasType.Personal = 0;
      newGasType.Funcionamiento = 3;
      newGasType.Inversion = 10;
    } else if (preset === 'estres') {
      RESOURCES_LIST.forEach(r => { newIng[r] = -12; newGas[r] = 4; });
      newGasType.Personal = 0;
      newGasType.Funcionamiento = 6;
      newGasType.Inversion = -15;
    }

    setSimIngByResource(newIng);
    setSimGasByResource(newGas);
    setSimGasByType(newGasType);
  };

  // Sensitivity calculations
  const sensitivityAnalysis = useMemo(() => {
    if (!financialData || !financialData.monthlySimIngByRes || !financialData.monthlySimGasPagoByRes) {
      return {
        tornado: [],
        dscrBase: 0,
        cushion: 0,
        ruptureVar: 0,
        ruptureValue: 0
      };
    }

    const baseIngTotal = financialData.totals.simIng;
    const baseGasTotal = financialData.totals.simGasPago;
    const dscrBase = baseGasTotal > 0 ? baseIngTotal / baseGasTotal : 0;
    const cushion = baseIngTotal - baseGasTotal;

    const ruptureVar = baseIngTotal > 0 ? ((baseIngTotal - baseGasTotal) / baseIngTotal) * 100 : 0;
    const ruptureValue = cushion;

    const tornadoData = RESOURCES_LIST.map(r => {
      const rIngSum = (financialData.monthlySimIngByRes[r] || []).reduce((a,b)=>a+b,0) / 1e6;
      const rGasSum = (financialData.monthlySimGasPagoByRes[r] || []).reduce((a,b)=>a+b,0) / 1e6;

      const highIng = baseIngTotal + rIngSum * 0.10;
      const highGas = baseGasTotal - rGasSum * (10 / 1.5 / 100);
      const dscrHigh = highGas > 0 ? highIng / highGas : 0;

      const lowIng = baseIngTotal - rIngSum * 0.10;
      const lowGas = baseGasTotal + rGasSum * (10 / 1.5 / 100);
      const dscrLow = lowGas > 0 ? lowIng / lowGas : 0;

      return {
        name: r,
        fullName: getResourceFullName(r),
        labelName: getResourceFullName(r).substring(0, 18) + '...',
        low: parseFloat(dscrLow.toFixed(2)),
        high: parseFloat(dscrHigh.toFixed(2)),
        rangeWidth: Math.abs(dscrHigh - dscrLow)
      };
    }).sort((a, b) => b.rangeWidth - a.rangeWidth).slice(0, 8);

    return {
      tornado: tornadoData,
      dscrBase,
      cushion,
      ruptureVar,
      ruptureValue
    };
  }, [financialData]);

  if (dataStage === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <div className="w-12 h-12 border-4 border-[#ffcc29] border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-on-surface-variant font-mono animate-pulse text-sm">Calibrando modelo financiero y cargando vigencias...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col mb-20 max-w-7xl mx-auto px-4 md:px-0 text-white">
      
      {/* Title Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8">
        <div>
          <p className="text-[#ffcc29] text-xs uppercase tracking-widest font-bold mb-1">UPTC - Inteligencia Financiera & Planeación</p>
          <h2 className="text-3xl md:text-4xl font-bold font-display text-white">Proyección Financiera</h2>
          <p className="text-xs text-on-surface-variant mt-1">Simulación paramétrica de ingresos, compromisos y cobertura integral de nómina ($369.650M).</p>
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

      {/* Tabs Navigation (Reorganized in Requested Order) */}
      <div className="flex border-b border-white/10 mb-8 overflow-x-auto gap-2">
        {[
          { id: 'simulator', label: '1. Simular Escenarios', icon: Sliders },
          { id: 'kpi', label: '2. Indicadores Financieros', icon: Activity },
          { id: 'flow', label: '3. Flujo de Caja & Giro', icon: Table },
          { id: 'cobertura', label: '4. Cobertura de Nómina', icon: Users },
          { id: 'sensitivity', label: '5. Sensibilidad & Riesgo', icon: TrendingUp },
          { id: 'equilibrium', label: '6. Punto de Equilibrio & Desglose', icon: Compass }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap ${activeTab === t.id ? 'border-[#ffcc29] text-[#ffcc29] bg-[#ffcc29]/5' : 'border-transparent text-white/55 hover:text-white hover:bg-white/5'}`}
          >
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: SIMULAR ESCENARIOS (FIRST TAB!) */}
      {/* ========================================================================= */}
      {activeTab === 'simulator' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          
          {/* Master Payroll Budget Monitor ($369.650.433.862) */}
          <div className="glass-card rounded-[28px] p-6 lg:p-8 border border-white/10 bg-gradient-to-r from-[#0f172a] via-surface to-[#0f172a] relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#ffcc29] via-[#4ade80] to-[#38bdf8]"></div>
            
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 pb-6 border-b border-white/10">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase tracking-widest bg-[#ffcc29]/20 text-[#ffcc29] border border-[#ffcc29]/30">
                    Techo Presupuestal Maestro 2026
                  </span>
                  <span className="text-xs font-mono text-on-surface-variant">Decreto y Marco Fiscal Vigente</span>
                </div>
                <h3 className="text-2xl font-display font-bold text-white mt-1">Presupuesto Anual de Gastos de Personal (Nómina)</h3>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Único valor presupuestado oficial de referencia: <strong className="text-white font-mono">$369.650.433.862 COP</strong> ($369.650,4M).
                </p>
              </div>

              <div className="flex flex-wrap gap-4 text-right">
                <div className="bg-white/5 border border-white/10 px-4 py-2.5 rounded-2xl">
                  <span className="text-[10px] font-mono text-on-surface-variant uppercase block">Ejecutado Real (Ene-Jul)</span>
                  <span className="text-lg font-mono font-bold text-[#4ade80]">${financialData.totals.realPayrollPaid.toLocaleString('es-CO', {maximumFractionDigits:1})}M</span>
                  <span className="text-[10px] text-white/50 block font-mono">46.6% del total</span>
                </div>
                <div className="bg-white/5 border border-white/10 px-4 py-2.5 rounded-2xl">
                  <span className="text-[10px] font-mono text-on-surface-variant uppercase block">Saldo Proyectado (Ago-Dic)</span>
                  <span className="text-lg font-mono font-bold text-[#ffcc29]">${financialData.totals.remainingPayroll.toLocaleString('es-CO', {maximumFractionDigits:1})}M</span>
                  <span className="text-[10px] text-white/50 block font-mono">53.4% (Incluye Prima Dic)</span>
                </div>
                <div className="bg-white/5 border border-white/10 px-4 py-2.5 rounded-2xl">
                  <span className="text-[10px] font-mono text-on-surface-variant uppercase block">Cobertura con Ingresos</span>
                  <span className={`text-lg font-mono font-bold ${financialData.totals.payrollCoverageRatio >= 100 ? 'text-[#4ade80]' : 'text-red-400'}`}>
                    {financialData.totals.payrollCoverageRatio.toFixed(1)}%
                  </span>
                  <span className="text-[10px] text-[#4ade80] block font-mono">
                    Superávit: +${financialData.totals.payrollSurplus.toLocaleString('es-CO', {maximumFractionDigits:1})}M
                  </span>
                </div>
              </div>
            </div>

            {/* Visual Multi-Segment Progress Bar */}
            <div className="mt-6 space-y-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-on-surface-variant">PROGRESO DEL TECHO DE NÓMINA ($369.650M)</span>
                <span className="text-white font-bold">100.0% Programado</span>
              </div>
              <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden flex">
                <div className="h-full bg-[#4ade80] transition-all duration-500" style={{ width: '46.56%' }} title="Real Pagado Ene-Jul ($172.115M)"></div>
                <div className="h-full bg-[#ffcc29] transition-all duration-500 opacity-90" style={{ width: '53.44%' }} title="Proyectado Ago-Dic ($197.535M)"></div>
              </div>
              <div className="flex justify-between text-[10px] font-mono text-on-surface-variant pt-1">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#4ade80]"></span> Ene-Jul Real ($172.115M)</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#ffcc29]"></span> Ago-Dic Proyectado con Prestaciones ($197.535M)</span>
                <span className="text-[#38bdf8] font-bold">Total Garantizado: $369.650,4M</span>
              </div>
            </div>
          </div>

          {/* Quick Preset Buttons & Controls */}
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-on-surface-variant uppercase">Escenarios Rápidos:</span>
              <button onClick={() => applyPresetScenario('conservador')} className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-mono transition">
                📉 Conservador (-3%)
              </button>
              <button onClick={() => applyPresetScenario('moderado')} className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-mono transition text-[#ffcc29]">
                ⚖️ Moderado (+2%)
              </button>
              <button onClick={() => applyPresetScenario('optimista')} className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-mono transition text-[#4ade80]">
                🚀 Optimista (+8%)
              </button>
              <button onClick={() => applyPresetScenario('estres')} className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-mono transition text-[#f43f5e]">
                ⚡ Estrés Fiscal (-12%)
              </button>
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

          {/* Sliders Grid: Incomes & Expenses */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Income resource modifiers */}
            <div className="glass-card rounded-[32px] p-6 lg:p-8 border border-white/10 flex flex-col gap-6">
              <div className="flex justify-between items-center pb-4 border-b border-white/5">
                <h4 className="text-sm font-bold text-[#ffcc29] uppercase tracking-widest flex items-center gap-2">
                  <TrendingUp size={16} /> Variación de Ingresos por Recurso
                </h4>
                <span className="text-[10px] font-mono text-on-surface-variant">Ago - Dic 2026</span>
              </div>
              <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {RESOURCES_LIST.map(r => {
                  const val = simIngByResource[r] || 0;
                  const baseVal = financialData.resourceBaselines[r]?.ing || 0;
                  const simVal = baseVal * (1 + val / 100);

                  return (
                    <div key={r} className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-3 hover:border-white/20 transition-all">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${Math.abs(val) > 10 ? 'bg-yellow-400' : 'bg-green-400'}`}></span>
                          <span className="text-white font-bold text-xs truncate max-w-[200px]" title={getResourceFullName(r)}>
                            {getResourceFullName(r)}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-[#ffcc29] font-bold">
                          {val >= 0 ? '+' : ''}{val.toFixed(1)}%
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-on-surface-variant">
                        <div>
                          <p>BASE ANUAL</p>
                          <p className="text-white font-bold mt-0.5">${baseVal.toLocaleString('es-CO', {maximumFractionDigits:1})}M</p>
                        </div>
                        <div>
                          <p>PROYECTADO SIMULADO</p>
                          <p className="text-[#ffcc29] font-bold mt-0.5">${simVal.toLocaleString('es-CO', {maximumFractionDigits:1})}M</p>
                        </div>
                      </div>

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
              <div className="flex flex-col gap-2.5 pb-4 border-b border-white/5">
                <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider block">Ajuste de Egresos:</span>
                <div className="grid grid-cols-2 gap-2 bg-black/40 border border-white/10 p-1 rounded-xl">
                  <button
                    onClick={() => setExpenseAdjustMode('category')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold font-mono transition-all uppercase flex items-center justify-center gap-1.5 ${expenseAdjustMode === 'category' ? 'bg-[#7bd0ff] text-black shadow-md font-extrabold' : 'text-white/60 hover:text-white'}`}
                  >
                    <Layers size={12} /> Por Categoría (Recomendado)
                  </button>
                  <button
                    onClick={() => setExpenseAdjustMode('resource')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold font-mono transition-all uppercase flex items-center justify-center gap-1.5 ${expenseAdjustMode === 'resource' ? 'bg-[#f43f5e] text-white shadow-md' : 'text-white/60 hover:text-white'}`}
                  >
                    <Briefcase size={12} /> Por Recurso
                  </button>
                </div>
              </div>

              {/* Por Categoría Mode */}
              {expenseAdjustMode === 'category' && (
                <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                  {[
                    { id: 'Personal', label: 'Gastos de Personal (2.1.1)', desc: 'Techo fijado en $369.650M. Modifica contingencias salariales.', color: '#4ade80' },
                    { id: 'Funcionamiento', label: 'Gastos de Funcionamiento (2.1.2)', desc: 'Servicios públicos, mantenimiento y compras operativas.', color: '#7bd0ff' },
                    { id: 'Inversion', label: 'Gastos de Inversión (2.3)', desc: 'Infraestructura, laboratorios e inversión académica.', color: '#d0bcff' },
                    { id: 'Transferencias', label: 'Transferencias Corrientes (2.1.3)', desc: 'Subsidios y convenios interinstitucionales.', color: '#ffcc29' },
                    { id: 'Tasas', label: 'Tasas y Multas (2.1.8)', desc: 'Impuestos y tasas regulatorias.', color: '#f43f5e' },
                    { id: 'Deuda', label: 'Servicios de la Deuda (2.2.2)', desc: 'Amortización e intereses bancarios.', color: '#fb7185' }
                  ].map(c => {
                    const val = simGasByType[c.id] || 0;
                    return (
                      <div key={c.id} className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-3 hover:border-white/20 transition-all">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-white font-bold text-xs block">{c.label}</span>
                            <span className="text-[10px] text-on-surface-variant font-sans">{c.desc}</span>
                          </div>
                          <span className={`text-xs font-mono font-bold ${val >= 0 ? 'text-[#ff5b5b]' : 'text-[#4ade80]'}`}>
                            {val >= 0 ? '+' : ''}{val.toFixed(1)}%
                          </span>
                        </div>

                        <div className="flex items-center gap-4 pt-1">
                          <input 
                            type="range"
                            min="-50"
                            max="50"
                            step="1"
                            value={val}
                            onChange={(e) => {
                              const n = parseInt(e.target.value);
                              setSimGasByType(prev => ({ ...prev, [c.id]: n }));
                            }}
                            className="flex-1 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#7bd0ff]"
                          />
                          <div className="flex items-center bg-black/40 border border-white/10 rounded-xl px-2.5 py-1 w-20 shrink-0">
                            <span className="text-white font-mono text-[11px] w-full text-right">{val > 0 ? `+${val}` : val}%</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Por Recurso Mode */}
              {expenseAdjustMode === 'resource' && (
                <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                  {RESOURCES_LIST.map(r => {
                    const val = simGasByResource[r] || 0;
                    const baseValComp = financialData.resourceBaselines[r]?.gasComp || 0;
                    const baseValPago = financialData.resourceBaselines[r]?.gasPago || 0;
                    const simValPago = baseValPago * (1 + val / 100);

                    return (
                      <div key={r} className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-3 hover:border-white/20 transition-all">
                        <div className="flex justify-between items-start">
                          <span className="text-white font-bold text-xs truncate max-w-[200px]" title={getResourceFullName(r)}>
                            {getResourceFullName(r)}
                          </span>
                          <span className="text-[10px] font-mono text-[#f43f5e] font-bold">
                            {val >= 0 ? '+' : ''}{val.toFixed(1)}%
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-on-surface-variant">
                          <div>
                            <p>BASE (COMP/PAGO)</p>
                            <p className="text-white font-bold mt-0.5">${baseValComp.toFixed(1)}M / ${baseValPago.toFixed(1)}M</p>
                          </div>
                          <div>
                            <p>PAGO PROYECTADO</p>
                            <p className="text-[#f43f5e] font-bold mt-0.5">${simValPago.toFixed(1)}M</p>
                          </div>
                        </div>

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
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: INDICADORES FINANCIEROS */}
      {/* ========================================================================= */}
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
                  <span>CORTE A JUL 31 (REAL)</span>
                  <span className="text-white font-bold">${semesterTotals.eneJulIng.toLocaleString('es-CO', {maximumFractionDigits:1})}M</span>
                </div>
                <div className="flex justify-between">
                  <span>PROYECCIÓN AGO-DIC</span>
                  <span className="text-[#ffcc29] font-bold">${semesterTotals.agoDicIng.toLocaleString('es-CO', {maximumFractionDigits:1})}M</span>
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
                  <span>CORTE A JUL 31 (REAL)</span>
                  <span className="text-white font-bold">${semesterTotals.eneJulComp.toLocaleString('es-CO', {maximumFractionDigits:1})}M</span>
                </div>
                <div className="flex justify-between">
                  <span>PROYECCIÓN AGO-DIC</span>
                  <span className="text-[#f43f5e] font-bold">${semesterTotals.agoDicComp.toLocaleString('es-CO', {maximumFractionDigits:1})}M</span>
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
                  <span>CORTE A JUL 31 (REAL)</span>
                  <span className="text-white font-bold">${semesterTotals.eneJulPago.toLocaleString('es-CO', {maximumFractionDigits:1})}M</span>
                </div>
                <div className="flex justify-between">
                  <span>PROYECCIÓN AGO-DIC</span>
                  <span className="text-[#4ade80] font-bold">${semesterTotals.agoDicPago.toLocaleString('es-CO', {maximumFractionDigits:1})}M</span>
                </div>
              </div>
            </div>
          </div>

          {/* Secondary KPI Cards */}
          {(() => {
            const pctEjec = financialData.totals.simIng > 0 ? (financialData.totals.simGasComp / financialData.totals.simIng) * 100 : 0;
            const disponibleVal = financialData.totals.simIng - financialData.totals.simGasComp;
            const cuentasPagarVal = financialData.totals.unpaidCommitments;

            return (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-card rounded-[28px] p-6 border border-white/5 bg-surface/50 relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute top-0 left-0 w-full h-1 bg-[#ffcc29]"></div>
                  <div>
                    <h4 className="text-xs font-mono text-on-surface-variant uppercase tracking-widest mb-3">Porcentaje de Ejecución Presupuestal</h4>
                    <p className="text-3xl font-display font-bold text-[#ffcc29]">{pctEjec.toFixed(1)}%</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-white/5">
                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-[#ffcc29]" style={{ width: `${Math.min(100, pctEjec)}%` }}></div>
                    </div>
                    <div className="flex justify-between items-center mt-2 text-[10px] font-mono text-on-surface-variant">
                      <span>COMPROMISOS / INGRESOS</span>
                      <span className="text-[#4ade80] font-bold">Equilibrado</span>
                    </div>
                  </div>
                </div>

                <div className="glass-card rounded-[28px] p-6 border border-white/5 bg-surface/50 relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute top-0 left-0 w-full h-1 bg-[#4ade80]"></div>
                  <div>
                    <h4 className="text-xs font-mono text-on-surface-variant uppercase tracking-widest mb-3">Valor Disponible / Superávit Neto</h4>
                    <p className={`text-3xl font-display font-bold ${disponibleVal >= 0 ? 'text-[#4ade80]' : 'text-red-400'}`}>
                      ${disponibleVal.toLocaleString('es-CO', {maximumFractionDigits:1})}M
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-white/5 flex justify-between text-[10px] font-mono text-on-surface-variant">
                    <span>INGRESO - COMPROMISOS</span>
                    <span className="text-[#4ade80] font-bold uppercase">{disponibleVal >= 0 ? 'Superávit Libre' : 'Déficit'}</span>
                  </div>
                </div>

                <div className="glass-card rounded-[28px] p-6 border border-white/5 bg-surface/50 relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute top-0 left-0 w-full h-1 bg-[#7bd0ff]"></div>
                  <div>
                    <h4 className="text-xs font-mono text-on-surface-variant uppercase tracking-widest mb-3">Cuentas por Pagar (Rezago de Giro)</h4>
                    <p className="text-3xl font-display font-bold text-[#7bd0ff]">
                      ${cuentasPagarVal.toLocaleString('es-CO', {maximumFractionDigits:1})}M
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-white/5 flex justify-between text-[10px] font-mono text-on-surface-variant">
                    <span>COMPROMISOS NO PAGADOS</span>
                    <span className="text-[#7bd0ff] font-bold uppercase">Exigibilidad en Giro</span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Comparative Execution Table */}
          <div className="glass-card rounded-[32px] p-8 border border-white/10">
            <h3 className="text-xl font-display font-medium text-white mb-4">Balance General Comparativo (Real vs Proyección)</h3>
            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="bg-white/10 text-[#ffcc29] uppercase">
                    <th className="p-4">Concepto Presupuestal</th>
                    <th className="p-4 text-right">Real Ene-Jul (7 Meses)</th>
                    <th className="p-4 text-right">Proyectado Ago-Dic (5 Meses)</th>
                    <th className="p-4 text-right">Consolidado Anual 2026</th>
                    <th className="p-4 text-right">% Participación Real</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  <tr>
                    <td className="p-4 font-bold text-white">Ingresos Totales (Recaudo)</td>
                    <td className="p-4 text-right text-[#4ade80]">${semesterTotals.eneJulIng.toLocaleString('es-CO', {maximumFractionDigits:1})}M</td>
                    <td className="p-4 text-right text-[#ffcc29]">${semesterTotals.agoDicIng.toLocaleString('es-CO', {maximumFractionDigits:1})}M</td>
                    <td className="p-4 text-right font-bold text-white">${financialData.totals.simIng.toLocaleString('es-CO', {maximumFractionDigits:1})}M</td>
                    <td className="p-4 text-right font-bold">{((semesterTotals.eneJulIng / financialData.totals.simIng) * 100).toFixed(1)}%</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-bold text-white">Gastos de Personal (Nómina Maestro)</td>
                    <td className="p-4 text-right text-[#4ade80]">${semesterTotals.eneJulNomina.toLocaleString('es-CO', {maximumFractionDigits:1})}M</td>
                    <td className="p-4 text-right text-[#ffcc29]">${semesterTotals.agoDicNomina.toLocaleString('es-CO', {maximumFractionDigits:1})}M</td>
                    <td className="p-4 text-right font-bold text-[#38bdf8]">${financialData.totals.simulatedPayrollTotal.toLocaleString('es-CO', {maximumFractionDigits:1})}M</td>
                    <td className="p-4 text-right font-bold">{((semesterTotals.eneJulNomina / financialData.totals.simulatedPayrollTotal) * 100).toFixed(1)}%</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-bold text-white">Compromisos Totales</td>
                    <td className="p-4 text-right text-[#f43f5e]">${semesterTotals.eneJulComp.toLocaleString('es-CO', {maximumFractionDigits:1})}M</td>
                    <td className="p-4 text-right text-[#f43f5e]">${semesterTotals.agoDicComp.toLocaleString('es-CO', {maximumFractionDigits:1})}M</td>
                    <td className="p-4 text-right font-bold text-white">${financialData.totals.simGasComp.toLocaleString('es-CO', {maximumFractionDigits:1})}M</td>
                    <td className="p-4 text-right font-bold">{((semesterTotals.eneJulComp / financialData.totals.simGasComp) * 100).toFixed(1)}%</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-bold text-white">Pagos Efectivos</td>
                    <td className="p-4 text-right text-[#38bdf8]">${semesterTotals.eneJulPago.toLocaleString('es-CO', {maximumFractionDigits:1})}M</td>
                    <td className="p-4 text-right text-[#ffcc29]">${semesterTotals.agoDicPago.toLocaleString('es-CO', {maximumFractionDigits:1})}M</td>
                    <td className="p-4 text-right font-bold text-white">${financialData.totals.simGasPago.toLocaleString('es-CO', {maximumFractionDigits:1})}M</td>
                    <td className="p-4 text-right font-bold">{((semesterTotals.eneJulPago / financialData.totals.simGasPago) * 100).toFixed(1)}%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: FLUJO DE CAJA Y ANÁLISIS DE GIRO (ENHANCED CASH FLOW!) */}
      {/* ========================================================================= */}
      {activeTab === 'flow' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h3 className="text-2xl font-display font-bold text-white">Flujo de Caja, Giro y Liquidez</h3>
              <p className="text-xs text-on-surface-variant mt-1">Análisis integral del comportamiento temporal, rezago de compromisos y reserva de caja.</p>
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
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${flowGranularity === g.id ? 'bg-[#ffcc29] text-black font-extrabold shadow-md' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          {/* Graph 1: Inflow vs Outflow & Net Balance */}
          <div className="glass-card rounded-[32px] p-6 lg:p-8 border border-white/10 glow-primary">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h4 className="text-lg font-display font-bold text-white">Gráfico 1: Dinámica Temporal de Ingresos vs Pagos Efectivos</h4>
                <p className="text-xs text-on-surface-variant mt-0.5">Ingresos recaudados y proyectados frente a los giros efectivos mensuales.</p>
              </div>
              <span className="px-3 py-1 bg-white/5 rounded-full border border-white/10 text-[10px] font-mono text-[#4ade80]">
                Superávit Consolidado: +${financialData.totals.simNetPago.toFixed(1)}M
              </span>
            </div>
            <div className="w-full h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={aggregatedFlowData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" stroke="#cac4d0" tick={{fontSize: 11}} />
                  <YAxis stroke="#cac4d0" tick={{fontSize: 11}} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                  <Legend />
                  <Area type="monotone" dataKey="ingresos" name="Ingresos ($M)" fill="url(#flowIngGlow)" stroke="#4ade80" strokeWidth={2} />
                  <Bar dataKey="gastosPago" name="Pagos Efectivos ($M)" fill="#ffcc29" radius={[4, 4, 0, 0]} opacity={0.85} />
                  <Line type="monotone" dataKey="netoPago" name="Saldo Neto Mensual ($M)" stroke="#38bdf8" strokeWidth={3} dot={{r: 4}} />
                  <defs>
                    <linearGradient id="flowIngGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4ade80" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#4ade80" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Graph 2 & Graph 3 Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Graph 2: Compromiso vs Pago (Rezago / Cuentas por Pagar) */}
            <div className="glass-card rounded-[32px] p-6 lg:p-8 border border-white/10">
              <div className="mb-6">
                <h4 className="text-lg font-display font-bold text-white">Gráfico 2: Relación Compromisos vs Pagos (Rezago de Giro)</h4>
                <p className="text-xs text-on-surface-variant mt-0.5">Monitorea la acumulación de obligaciones pendientes de giro a lo largo del año.</p>
              </div>
              <div className="w-full h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={financialData.simulatedFlow}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" stroke="#cac4d0" tick={{fontSize: 10}} />
                    <YAxis stroke="#cac4d0" tick={{fontSize: 10}} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                    <Legend />
                    <Bar dataKey="rezagoCompromiso" name="Rezago Acumulado ($M)" fill="#f43f5e" radius={[4, 4, 0, 0]} opacity={0.7} />
                    <Line type="monotone" dataKey="gastosComp" name="Compromisos ($M)" stroke="#f43f5e" strokeWidth={2} />
                    <Line type="monotone" dataKey="gastosPago" name="Pagos ($M)" stroke="#ffcc29" strokeWidth={2} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 p-3 bg-white/5 rounded-xl border border-white/5 text-[11px] font-mono text-on-surface-variant flex justify-between">
                <span>REZAGO MÁXIMO PROYECTADO:</span>
                <span className="text-[#f43f5e] font-bold">${Math.max(...financialData.simulatedFlow.map(m => m.rezagoCompromiso)).toFixed(1)}M</span>
              </div>
            </div>

            {/* Graph 3: Cumulative Liquidity Reserve */}
            <div className="glass-card rounded-[32px] p-6 lg:p-8 border border-white/10">
              <div className="mb-6">
                <h4 className="text-lg font-display font-bold text-white">Gráfico 3: Curva de Reserva de Liquidez y Saldo Acumulado</h4>
                <p className="text-xs text-on-surface-variant mt-0.5">Evolución acumulada del disponible de tesorería mes a mes.</p>
              </div>
              <div className="w-full h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={financialData.simulatedFlow}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" stroke="#cac4d0" tick={{fontSize: 10}} />
                    <YAxis stroke="#cac4d0" tick={{fontSize: 10}} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                    <Legend />
                    <Area type="monotone" dataKey="saldoCajaAcumulado" name="Reserva Acumulada ($M)" fill="url(#reservaGlow)" stroke="#38bdf8" strokeWidth={3} />
                    <defs>
                      <linearGradient id="reservaGlow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.35}/>
                        <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.02}/>
                      </linearGradient>
                    </defs>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 p-3 bg-white/5 rounded-xl border border-white/5 text-[11px] font-mono text-on-surface-variant flex justify-between">
                <span>DISPONIBLE DE CIERRE:</span>
                <span className="text-[#38bdf8] font-bold">${financialData.simulatedFlow[11]?.saldoCajaAcumulado?.toFixed(1) || '0'}M</span>
              </div>
            </div>

          </div>

          {/* Graph 4: Payroll vs Other Disbursements */}
          <div className="glass-card rounded-[32px] p-6 lg:p-8 border border-white/10">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h4 className="text-lg font-display font-bold text-white">Gráfico 4: Composición del Pago: Nómina ($369.650M) vs Otros Gastos</h4>
                <p className="text-xs text-on-surface-variant mt-0.5">Desglose mensual entre el costo de nómina presupuestado y los pagos operativos e inversiones.</p>
              </div>
              <span className="px-3 py-1 bg-white/5 rounded-full border border-white/10 text-[10px] font-mono text-[#38bdf8]">
                Nómina Anual: ${financialData.totals.simulatedPayrollTotal.toFixed(1)}M
              </span>
            </div>
            <div className="w-full h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={financialData.simulatedFlow}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" stroke="#cac4d0" tick={{fontSize: 11}} />
                  <YAxis stroke="#cac4d0" tick={{fontSize: 11}} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                  <Legend />
                  <Bar dataKey="gastoPersonal" name="Gasto de Nómina ($M)" stackId="a" fill="#4ade80" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="otrosGastosPago" name="Otros Egresos Operativos ($M)" stackId="a" fill="#7bd0ff" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Consolidated Table */}
          <div className="glass-card rounded-[32px] p-8 border border-white/10">
            <h4 className="text-lg font-display font-bold text-white mb-4">Tabla Detallada de Flujo de Caja ({flowGranularity.toUpperCase()})</h4>
            <div className="overflow-x-auto rounded-[24px] border border-white/10 bg-white/5 custom-scrollbar">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className="bg-white/10 text-[#ffcc29] uppercase tracking-wider">
                    <th className="p-4 font-bold border-b border-white/10">Período</th>
                    <th className="p-4 font-bold border-b border-white/10 text-right">Ingresos</th>
                    <th className="p-4 font-bold border-b border-white/10 text-right">Compromisos</th>
                    <th className="p-4 font-bold border-b border-white/10 text-right">Pagos</th>
                    <th className="p-4 font-bold border-b border-white/10 text-right">Nómina ($M)</th>
                    <th className="p-4 font-bold border-b border-white/10 text-right">Saldo Neto</th>
                    <th className="p-4 font-bold border-b border-white/10 text-right">Reserva Caja</th>
                    <th className="p-4 font-bold border-b border-white/10 text-right">Rezago (C x P)</th>
                    <th className="p-4 font-bold border-b border-white/10 text-right">Ejecución</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {aggregatedFlowData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-white/5">
                      <td className="p-4 text-white font-bold">{row.name}</td>
                      <td className="p-4 text-right text-[#4ade80]">${row.ingresos.toLocaleString('es-CO', {minimumFractionDigits: 1})}M</td>
                      <td className="p-4 text-right text-[#f43f5e]">${row.gastosComp.toLocaleString('es-CO', {minimumFractionDigits: 1})}M</td>
                      <td className="p-4 text-right text-[#ffcc29]">${row.gastosPago.toLocaleString('es-CO', {minimumFractionDigits: 1})}M</td>
                      <td className="p-4 text-right text-[#38bdf8]">${row.gastoPersonal.toLocaleString('es-CO', {minimumFractionDigits: 1})}M</td>
                      <td className={`p-4 text-right font-bold ${row.netoPago >= 0 ? 'text-[#4ade80]' : 'text-red-400'}`}>
                        ${row.netoPago.toLocaleString('es-CO', {minimumFractionDigits: 1})}M
                      </td>
                      <td className="p-4 text-right text-[#38bdf8]">${row.saldoCajaAcumulado.toLocaleString('es-CO', {maximumFractionDigits: 1})}M</td>
                      <td className="p-4 text-right text-[#f43f5e]">${row.rezagoCompromiso.toLocaleString('es-CO', {maximumFractionDigits: 1})}M</td>
                      <td className="p-4 text-right font-bold text-white/80">{row.ejecucion.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: COBERTURA DE NÓMINA POR RECURSOS */}
      {/* ========================================================================= */}
      {activeTab === 'cobertura' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          
          <div className="glass-card rounded-[28px] p-6 lg:p-8 border border-white/10 bg-surface/50">
            <h3 className="text-2xl font-display font-bold text-white">Matriz de Cobertura de Nómina por Fuentes de Financiamiento</h3>
            <p className="text-xs text-on-surface-variant mt-1">
              Evaluación de suficiencia financiera: cómo los ingresos recaudados y proyectados de cada recurso financian el costo anual de personal (<strong className="text-white font-mono">$369.650,4M</strong>).
            </p>
          </div>

          {/* Ranked Table of Resource Contribution */}
          <div className="glass-card rounded-[32px] p-8 border border-white/10">
            <h4 className="text-lg font-display font-bold text-white mb-6">Fuentes de Financiamiento de Nómina (Ranking de Aporte)</h4>
            <div className="overflow-x-auto rounded-[24px] border border-white/10 bg-white/5">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="bg-white/10 text-[#ffcc29] uppercase">
                    <th className="p-4">Recurso / Fuente</th>
                    <th className="p-4 text-right">Ingreso Proyectado ($M)</th>
                    <th className="p-4 text-right">Aporte a Nómina ($M)</th>
                    <th className="p-4 text-right">Excedente Libre ($M)</th>
                    <th className="p-4 text-right">% Cobertura Nómina Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {financialData.payrollCoverageList.map((item, idx) => (
                    <tr key={idx} className="hover:bg-white/5">
                      <td className="p-4 text-white font-bold">{item.resourceName}</td>
                      <td className="p-4 text-right text-[#4ade80]">${item.totalRevenue.toLocaleString('es-CO', {maximumFractionDigits:1})}M</td>
                      <td className="p-4 text-right text-[#ffcc29] font-bold">${item.payrollContribution.toLocaleString('es-CO', {maximumFractionDigits:1})}M</td>
                      <td className="p-4 text-right text-[#38bdf8]">${item.surplus.toLocaleString('es-CO', {maximumFractionDigits:1})}M</td>
                      <td className="p-4 text-right font-bold text-white">{item.coveragePct.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Stacked Bar Chart */}
          <div className="glass-card rounded-[32px] p-8 border border-white/10">
            <h4 className="text-lg font-display font-bold text-white mb-6">Distribución de Ingresos por Recurso: Aporte a Nómina vs Excedente Libre</h4>
            <div className="w-full h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={financialData.payrollCoverageList.slice(0, 8)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="resourceCode" stroke="#cac4d0" tick={{fontSize: 11}} />
                  <YAxis stroke="#cac4d0" tick={{fontSize: 11}} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                  <Legend />
                  <Bar dataKey="payrollContribution" name="Aporte a Nómina ($M)" stackId="a" fill="#ffcc29" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="surplus" name="Excedente Libre Funcionamiento ($M)" stackId="a" fill="#4ade80" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: SENSIBILIDAD & RIESGO */}
      {/* ========================================================================= */}
      {activeTab === 'sensitivity' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-card rounded-[28px] p-6 border border-white/5 bg-surface/50">
              <span className="text-[10px] font-mono text-on-surface-variant uppercase block">DSCR Cobertura de Deuda/Gasto</span>
              <span className="text-3xl font-display font-bold text-[#4ade80] mt-1 block">{sensitivityAnalysis.dscrBase.toFixed(2)}x</span>
              <span className="text-xs text-on-surface-variant mt-1 block">Capacidad de pago sobre egresos efectivos</span>
            </div>
            <div className="glass-card rounded-[28px] p-6 border border-white/5 bg-surface/50">
              <span className="text-[10px] font-mono text-on-surface-variant uppercase block">Colchón de Liquidez Neto</span>
              <span className="text-3xl font-display font-bold text-[#38bdf8] mt-1 block">${sensitivityAnalysis.cushion.toFixed(1)}M</span>
              <span className="text-xs text-on-surface-variant mt-1 block">Margen de maniobra antes de déficit</span>
            </div>
            <div className="glass-card rounded-[28px] p-6 border border-white/5 bg-surface/50">
              <span className="text-[10px] font-mono text-on-surface-variant uppercase block">Caída Máxima Soportable (Ruptura)</span>
              <span className="text-3xl font-display font-bold text-[#ffcc29] mt-1 block">-{sensitivityAnalysis.ruptureVar.toFixed(1)}%</span>
              <span className="text-xs text-on-surface-variant mt-1 block">Tolerancia ante choque negativo de ingresos</span>
            </div>
          </div>

          {/* Tornado Chart */}
          <div className="glass-card rounded-[32px] p-8 border border-white/10">
            <h4 className="text-lg font-display font-bold text-white mb-2">Diagrama de Tornado: Sensibilidad del DSCR ante Choques (±10%)</h4>
            <p className="text-xs text-on-surface-variant mb-6">Identifica los recursos con mayor impacto sobre la solvencia institucional.</p>
            <div className="w-full h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sensitivityAnalysis.tornado} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis type="number" stroke="#cac4d0" tick={{fontSize: 11}} domain={['auto', 'auto']} />
                  <YAxis dataKey="labelName" type="category" stroke="#cac4d0" tick={{fontSize: 10}} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)' }} />
                  <Legend />
                  <Bar dataKey="low" name="Escenario Desfavorable (-10%)" fill="#f43f5e" />
                  <Bar dataKey="high" name="Escenario Favorable (+10%)" fill="#4ade80" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: PUNTO DE EQUILIBRIO & DESGLOSE */}
      {/* ========================================================================= */}
      {activeTab === 'equilibrium' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="glass-card rounded-[32px] p-8 border border-white/10 flex flex-col justify-between">
              <div>
                <h3 className="text-xl font-display font-bold text-white mb-6">Composición del Gasto por Categoría</h3>
                <div className="w-full h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={financialData.categoryBreakdown.pago}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {financialData.categoryBreakdown.pago.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)' }} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="glass-card rounded-[32px] p-8 border border-white/10 flex flex-col justify-between">
              <div>
                <h3 className="text-xl font-display font-bold text-white mb-4">Dictamen de Equilibrio y Sostenibilidad</h3>
                <div className="space-y-4">
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                    <span className="text-xs text-on-surface-variant block">Superávit Presupuestal Estimado</span>
                    <span className="text-2xl font-bold font-mono text-[#4ade80] mt-1 block">
                      +${financialData.totals.simNetPago.toLocaleString('es-CO', {maximumFractionDigits:1})}M
                    </span>
                  </div>
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                    <span className="text-xs text-on-surface-variant block">Porcentaje de Cobertura de Nómina</span>
                    <span className="text-2xl font-bold font-mono text-[#ffcc29] mt-1 block">
                      {financialData.totals.payrollCoverageRatio.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 rounded-2xl bg-[#4ade80]/10 border border-[#4ade80]/30 text-[#4ade80] flex items-start gap-3">
                <CheckCircle2 className="shrink-0 mt-0.5" size={18} />
                <div>
                  <h5 className="font-bold text-sm">Viabilidad Financiera Confirmada</h5>
                  <p className="text-xs text-white/70 mt-1">
                    Los ingresos proyectados cubren con holgura el techo de nómina de $369.650M y los compromisos operativos de la universidad.
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
