import { useState, useEffect, useMemo } from 'react';
import { 
  BrainCircuit, 
  Filter, 
  BarChart as BarChartIcon, 
  Settings, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Wallet, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle,
  Info,
  Layers,
  ClipboardList,
  Eye,
  PieChart as PieIcon,
  Table as TableIcon,
  HelpCircle,
  TrendingUp as TrendIcon
} from 'lucide-react';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend,
  Bar,
  Line,
  ComposedChart,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { fetchAndParseCSV } from '../lib/csvParser';
import { RESOURCES_LIST, getRecursoEquivalence, MONTHS_STR } from '../lib/resourceMapper';
import { calculateProjections, aggregateCashFlow, GastoRecord, CashFlowItem } from '../lib/financialEngine';
import historicalGastosData from '../data/historicalGastos.json';

const rawHistoricalGastos = historicalGastosData as GastoRecord[];
const PIE_COLORS = ['#ffcc29', '#4ade80', '#3b82f6', '#c084fc', '#f43f5e', '#7bd0ff'];

function SpeedometerGauge({ value, title, subtitle }: { value: number; title: string; subtitle: string }) {
  const clampedValue = Math.min(Math.max(value, 0), 150);
  const angle = (clampedValue / 150) * 180 - 180;
  
  let statusColor = "text-[#f43f5e]";
  if (value >= 90 && value <= 110) statusColor = "text-yellow-400";
  if (value > 110) statusColor = "text-[#4ade80]";

  return (
    <div className="glass-card rounded-[24px] p-6 border border-white/5 flex flex-col items-center justify-center text-center shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
      <h4 className="text-sm font-bold text-white mb-1">{title}</h4>
      <p className="text-[10px] text-on-surface-variant uppercase font-mono tracking-widest mb-4">{subtitle}</p>
      
      <div className="relative w-48 h-28 flex items-center justify-center overflow-hidden">
        <svg className="w-40 h-40 absolute top-0" viewBox="0 0 200 200">
          <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="16" strokeLinecap="round" />
          <path d="M 20 100 A 80 80 0 0 1 84 48" fill="none" stroke="#f43f5e" strokeWidth="16" />
          <path d="M 84 48 A 80 80 0 0 1 124 48" fill="none" stroke="#eab308" strokeWidth="16" />
          <path d="M 124 48 A 80 80 0 0 1 180 100" fill="none" stroke="#4ade80" strokeWidth="16" strokeLinecap="round" />
          <g transform={`translate(100, 100) rotate(${angle})`}>
            <line x1="0" y1="0" x2="-65" y2="0" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" className="drop-shadow-lg" />
            <circle cx="0" cy="0" r="7" fill="#ffffff" />
            <circle cx="0" cy="0" r="3" fill="#0b1326" />
          </g>
        </svg>
        <div className="absolute bottom-1 flex flex-col items-center">
          <span className="text-3xl font-display font-bold text-white">{value.toFixed(1)}%</span>
        </div>
      </div>
      
      <div className="flex gap-4 mt-2 text-[10px] font-mono text-on-surface-variant">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> Déficit (&lt;90%)</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500"></span> Alerta</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> Óptimo (&gt;110%)</span>
      </div>
    </div>
  );
}

// skeleton loader
function SkeletonLoader() {
  return (
    <div className="space-y-6 animate-pulse w-full">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map(n => (
          <div key={n} className="h-32 bg-white/5 border border-white/10 rounded-[24px]"></div>
        ))}
      </div>
      <div className="h-96 bg-white/5 border border-white/10 rounded-[32px]"></div>
      <div className="h-48 bg-white/5 border border-white/10 rounded-[24px]"></div>
    </div>
  );
}

export function PredictiveScreen({ onNavigate }: { onNavigate: (s: string) => void }) {
  const [activeTab, setActiveTab] = useState<'kpi' | 'flow' | 'equilibrium' | 'simulator' | 'expenses'>('kpi');
  const [dataStage, setDataStage] = useState<'loading' | 'ready'>('loading');
  const [viewDimension, setViewDimension] = useState<'compromiso' | 'pago'>('pago');
  const [flowGranularity, setFlowGranularity] = useState<'monthly' | 'quarterly' | 'semesterly' | 'annual'>('monthly');
  
  const [rawYearlyIncomes, setRawYearlyIncomes] = useState<Record<number, any[]>>({});
  
  // Filters
  const [filterUnidad, setFilterUnidad] = useState<string>('Todos');
  const [filterRecurso, setFilterRecurso] = useState<string>('Todos');
  const [filterMes, setFilterMes] = useState<string>('Todos');
  const [filterTipoGasto, setFilterTipoGasto] = useState<string>('Todos');

  // Sliders state
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
        
        setRawYearlyIncomes(loadedData);
        // Simulate a minor visual delay for skeleton loader check
        setTimeout(() => {
          setDataStage('ready');
        }, 500);
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

  const financialData = useMemo(() => {
    return calculateProjections({
      rawYearlyIncomes,
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
    filterUnidad,
    filterRecurso,
    filterMes,
    filterTipoGasto,
    simIngByResource,
    simGasByResource,
    simGasByType
  ]);

  const aggregatedFlow = useMemo(() => {
    return aggregateCashFlow(financialData.simulatedFlow, flowGranularity);
  }, [financialData.simulatedFlow, flowGranularity]);

  const isPago = viewDimension === 'pago';
  const currentGas = isPago ? financialData.totals.simGasPago : financialData.totals.simGasComp;
  const baseGas = isPago ? financialData.totals.baselineGasPago : financialData.totals.baselineGasComp;
  const currentNet = isPago ? financialData.totals.simNetPago : financialData.totals.simNetComp;

  const breakEvenCoverage = currentGas > 0 ? (financialData.totals.simIng / currentGas) * 100 : 0;
  
  const totalComp = financialData.totals.simGasComp;
  const totalPago = financialData.totals.simGasPago;
  const totalIng = financialData.totals.simIng;
  
  const executionRatio = totalComp > 0 ? (totalPago / totalComp) : 0;
  const executionPercent = totalIng > 0 ? (executionRatio / totalIng) * 100 : 0;
  
  const rawExecutionRatio = totalComp > 0 ? (totalPago / totalComp) * 100 : 0;
  const expenseToIncomeRatio = totalIng > 0 ? (currentGas / totalIng) * 100 : 0;

  // Heatmap calculation (17 resources vs 6 expense types)
  const heatmapData = useMemo(() => {
    const matrix: Record<string, Record<string, number>> = {};
    RESOURCES_LIST.forEach(r => {
      matrix[r] = {
        '2.1.1 Gastos de Personal': 0,
        '2.1.2 Gastos de Funcionamiento': 0,
        '2.1.3 Transferencias Corrientes': 0,
        '2.1.8 Tasas y Multas': 0,
        '2.2.2 Servicios de la Deuda': 0,
        '2.3 Gastos de Inversión': 0
      };
    });

    rawHistoricalGastos.forEach(row => {
      if (filterUnidad !== 'Todos' && row.dependencia !== filterUnidad) return;
      const recMapped = getRecursoEquivalence(row.recurso);
      if (!matrix[recMapped]) return;

      const isReal = row.mes <= 6 && row.año === 2026;
      const baselineMultiplier = isReal ? 1 : 1.05;
      const scaleResourceFactor = isReal ? 1 : (1 + (simGasByResource[recMapped] || 0) / 100);
      
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

      const activeVal = isPago ? row.pago : row.compromiso;
      const val = activeVal * baselineMultiplier * scaleResourceFactor * scaleTypeFactor;

      let categoryKey = '2.3 Gastos de Inversión';
      if (tipo.includes("2.1.1")) categoryKey = '2.1.1 Gastos de Personal';
      else if (tipo.includes("2.1.2")) categoryKey = '2.1.2 Gastos de Funcionamiento';
      else if (tipo.includes("2.1.3")) categoryKey = '2.1.3 Transferencias Corrientes';
      else if (tipo.includes("2.1.8")) categoryKey = '2.1.8 Tasas y Multas';
      else if (tipo.includes("2.2.2")) categoryKey = '2.2.2 Servicios de la Deuda';

      matrix[recMapped][categoryKey] += val;
    });

    return Object.entries(matrix).map(([recurso, values]) => ({
      recurso,
      ...values
    }));
  }, [rawHistoricalGastos, filterUnidad, isPago, simGasByResource, simGasByType]);

  return (
    <div className="flex flex-col mb-20 max-w-7xl mx-auto w-full">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
        <div>
          <p className="text-[#ffcc29] text-xs uppercase tracking-widest font-mono font-bold mb-1 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#ffcc29] animate-pulse"></span>
            PLANEACIÓN INSTITUCIONAL DE RECURSOS UPTC
          </p>
          <div className="flex items-center gap-4">
            <h2 className="text-3xl font-bold font-display text-white">Proyección Financiera Integrada</h2>
            <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-full flex items-center gap-2">
              <BrainCircuit size={14} className="text-[#ffcc29]" />
              <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider">Enterprise BI Model</span>
            </div>
          </div>
          <p className="text-on-surface-variant text-xs mt-1.5 max-w-xl">
            Modulo unificado de previsión presupuestal contable y flujo de caja con filtros dinámicos por rubros y recursos institucionales.
          </p>
        </div>

        {/* Global Toolbar Filters */}
        <div className="flex flex-wrap gap-2.5 items-center">
          <div className="flex bg-white/5 rounded-xl p-1 border border-white/10 shrink-0">
            <button 
              onClick={() => setViewDimension('compromiso')}
              className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer ${!isPago ? 'bg-primary-container text-black' : 'text-on-surface-variant hover:text-white'}`}
            >
              Compromisos
            </button>
            <button 
              onClick={() => setViewDimension('pago')}
              className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer ${isPago ? 'bg-primary-container text-black' : 'text-on-surface-variant hover:text-white'}`}
            >
              Pagos Efectivos
            </button>
          </div>

          <div className="flex items-center bg-white/5 rounded-xl border border-white/10 px-3 py-1.5 focus-within:border-[#ffcc29]/50 transition-colors">
            <Filter size={13} className="text-on-surface-variant mr-2" />
            <select 
              className="bg-transparent text-xs text-white outline-none w-36 truncate"
              value={filterUnidad}
              onChange={(e) => setFilterUnidad(e.target.value)}
            >
              <option value="Todos" className="bg-[#0f172a] text-white">Todas las Sedes / Unidades</option>
              {filterOptions.unidades.filter(u => u !== 'Todos').map(u => (
                <option key={u} value={u} className="bg-[#0f172a] text-white">{u}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center bg-white/5 rounded-xl border border-white/10 px-3 py-1.5 focus-within:border-[#ffcc29]/50 transition-colors">
            <Filter size={13} className="text-on-surface-variant mr-2" />
            <select 
              className="bg-transparent text-xs text-white outline-none w-32 truncate"
              value={filterTipoGasto}
              onChange={(e) => setFilterTipoGasto(e.target.value)}
            >
              <option value="Todos" className="bg-[#0f172a] text-white">Todos los Egresos</option>
              {filterOptions.tiposGastos.filter(t => t !== 'Todos').map(t => (
                <option key={t} value={t} className="bg-[#0f172a] text-white">{t}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center bg-white/5 rounded-xl border border-white/10 px-3 py-1.5 focus-within:border-[#ffcc29]/50 transition-colors">
            <Filter size={13} className="text-on-surface-variant mr-2" />
            <select 
              className="bg-transparent text-xs text-white outline-none w-36 truncate"
              value={filterRecurso}
              onChange={(e) => setFilterRecurso(e.target.value)}
            >
              <option value="Todos" className="bg-[#0f172a] text-white">Todos los Recursos</option>
              {filterOptions.recursos.filter(r => r !== 'Todos').map(r => (
                <option key={r} value={r} className="bg-[#0f172a] text-white">{r}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center bg-white/5 rounded-xl border border-white/10 px-3 py-1.5 focus-within:border-[#ffcc29]/50 transition-colors">
            <Filter size={13} className="text-on-surface-variant mr-2" />
            <select 
              className="bg-transparent text-xs text-white outline-none w-24"
              value={filterMes}
              onChange={(e) => setFilterMes(e.target.value)}
            >
              <option value="Todos" className="bg-[#0f172a] text-white">Todos Meses</option>
              {MONTHS_STR.map(m => (
                <option key={m} value={m} className="bg-[#0f172a] text-white">{m}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Primary Tab Navigation */}
      <div className="flex border-b border-white/10 mb-8 bg-white/5 p-1 rounded-xl w-fit">
        <button 
          onClick={() => setActiveTab('kpi')}
          className={`px-5 py-2 text-sm font-medium rounded-lg flex items-center gap-2 transition-all ${activeTab === 'kpi' ? 'bg-[#ffcc29] text-black font-bold' : 'text-on-surface-variant hover:text-white'}`}
        >
          <Activity size={16} />
          Tablero Ejecutivo
        </button>
        <button 
          onClick={() => setActiveTab('flow')}
          className={`px-5 py-2 text-sm font-medium rounded-lg flex items-center gap-2 transition-all ${activeTab === 'flow' ? 'bg-[#ffcc29] text-black font-bold' : 'text-on-surface-variant hover:text-white'}`}
        >
          <Wallet size={16} />
          Flujo de Caja
        </button>
        <button 
          onClick={() => setActiveTab('equilibrium')}
          className={`px-5 py-2 text-sm font-medium rounded-lg flex items-center gap-2 transition-all ${activeTab === 'equilibrium' ? 'bg-[#ffcc29] text-black font-bold' : 'text-on-surface-variant hover:text-white'}`}
        >
          <Layers size={16} />
          Equilibrio Presupuestal
        </button>
        <button 
          onClick={() => setActiveTab('simulator')}
          className={`px-5 py-2 text-sm font-medium rounded-lg flex items-center gap-2 transition-all ${activeTab === 'simulator' ? 'bg-[#ffcc29] text-black font-bold' : 'text-on-surface-variant hover:text-white'}`}
        >
          <Settings size={16} />
          Simulador Financiero
        </button>
        <button 
          onClick={() => setActiveTab('expenses')}
          className={`px-5 py-2 text-sm font-medium rounded-lg flex items-center gap-2 transition-all ${activeTab === 'expenses' ? 'bg-[#ffcc29] text-black font-bold' : 'text-on-surface-variant hover:text-white'}`}
        >
          <PieIcon size={16} />
          Análisis de Gastos
        </button>
      </div>

      {/* Render Main Content / Skeleton Loaders */}
      {dataStage === 'loading' ? (
        <SkeletonLoader />
      ) : (
        <div className="space-y-8">
          
          {/* Active Constraints Banner */}
          <div className="glass-card rounded-[18px] px-6 py-4 border border-white/5 flex flex-wrap gap-4 items-center justify-between bg-white/5 text-xs text-on-surface-variant">
            <div className="flex items-center gap-2">
              <ClipboardList className="text-[#ffcc29]" size={18} />
              <span>
                <strong>Semestre Enero-Junio:</strong> Datos históricos reales inalterables. 
                <strong> Semestre Julio-Diciembre:</strong> Escenario simulado y proyectado.
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-on-surface-variant">Referencia de Proyecciones: <strong>Año anterior (2025)</strong></span>
              <div className="px-3 py-1 rounded bg-[#ffcc29]/10 text-[#ffcc29] font-mono text-[10px] uppercase font-bold">
                {isPago ? 'Pagos Efectivos' : 'Compromisos'}
              </div>
            </div>
          </div>

          {/* TAB 1: EXECUTIVE DASHBOARD */}
          {activeTab === 'kpi' && (
            <div className="space-y-8 animate-fade-in">
              {/* Primary Metrics Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="glass-card rounded-[24px] p-6 relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-[#4ade80]"></div>
                  <h4 className="text-xs font-mono text-on-surface-variant uppercase tracking-widest mb-2 flex justify-between">
                    Ingresos Anuales (Sim)
                    <TrendingUp size={12} className="text-[#4ade80]" />
                  </h4>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-display font-bold text-white">${financialData.totals.simIng.toLocaleString('es-CO', {maximumFractionDigits: 1})}</span>
                    <span className="text-[10px] font-mono text-on-surface-variant">mill.</span>
                  </div>
                  <p className="text-[10px] text-on-surface-variant mt-2">
                    Valor base: ${financialData.totals.baselineIng.toLocaleString('es-CO', {maximumFractionDigits: 1})} mill.
                  </p>
                </div>

                <div className="glass-card rounded-[24px] p-6 relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-[#f43f5e]"></div>
                  <h4 className="text-xs font-mono text-on-surface-variant uppercase tracking-widest mb-2 flex justify-between">
                    Gastos Anuales ({isPago ? 'Pagos' : 'Compromisos'})
                    <TrendingDown size={12} className="text-[#f43f5e]" />
                  </h4>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-display font-bold text-white">${currentGas.toLocaleString('es-CO', {maximumFractionDigits: 1})}</span>
                    <span className="text-[10px] font-mono text-on-surface-variant">mill.</span>
                  </div>
                  <p className="text-[10px] text-on-surface-variant mt-2">
                    Valor base: ${baseGas.toLocaleString('es-CO', {maximumFractionDigits: 1})} mill.
                  </p>
                </div>

                <div className="glass-card rounded-[24px] p-6 relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-[#7bd0ff]"></div>
                  <h4 className="text-xs font-mono text-on-surface-variant uppercase tracking-widest mb-2">Resultado Financiero</h4>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-3xl font-display font-bold ${currentNet >= 0 ? 'text-[#4ade80]' : 'text-[#f43f5e]'}`}>
                      ${currentNet.toLocaleString('es-CO', {maximumFractionDigits: 1})}
                    </span>
                    <span className="text-[10px] font-mono text-on-surface-variant">mill.</span>
                  </div>
                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold mt-2 px-2 py-0.5 rounded-full ${currentNet >= 0 ? 'bg-[#4ade80]/10 text-[#4ade80]' : 'bg-[#f43f5e]/10 text-[#f43f5e]'}`}>
                    {currentNet >= 0 ? 'Superávit Presupuestal' : 'Déficit Presupuestal'}
                  </span>
                </div>

                <div className="glass-card rounded-[24px] p-6 relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-[#ffcc29]"></div>
                  <h4 className="text-xs font-mono text-on-surface-variant uppercase tracking-widest mb-2 flex justify-between">
                    % de Ejecución Real
                    <HelpCircle size={12} className="text-[#ffcc29]" />
                  </h4>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-display font-bold text-white">{executionPercent.toFixed(2)}%</span>
                  </div>
                  <div className="text-[9px] text-on-surface-variant mt-2 font-mono flex flex-col gap-0.5">
                    <span>Pago / Compromiso: <strong>{rawExecutionRatio.toFixed(1)}%</strong></span>
                    <span>Gastos / Ingresos: <strong>{expenseToIncomeRatio.toFixed(1)}%</strong></span>
                  </div>
                </div>
              </div>

              {/* Monthly Composed Chart */}
              <div className="glass-card rounded-[32px] p-8 flex flex-col min-h-[450px]">
                <h3 className="text-lg font-display font-bold text-white mb-6 flex items-center gap-2">
                  <BarChartIcon size={20} className="text-[#ffcc29]" />
                  Flujo de Proyecciones e Indicadores (Ene-Jun Real / Jul-Dic Proy)
                </h3>
                <div className="flex-1 w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={financialData.simulatedFlow} margin={{ top: 20, right: -5, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" tick={{fontSize: 10, fontFamily: 'monospace'}} />
                      <YAxis yAxisId="left" stroke="rgba(255,255,255,0.4)" tick={{fontSize: 10, fontFamily: 'monospace'}} tickFormatter={(v) => `$${v}M`} />
                      <YAxis yAxisId="right" orientation="right" stroke="#ffcc29" tick={{fontSize: 10, fontFamily: 'monospace'}} tickFormatter={(v) => `${v}%`} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                      <Legend wrapperStyle={{ fontSize: '11px', opacity: 0.8 }} />
                      
                      <Bar yAxisId="left" dataKey="ingresos" name="Ingresos Totales" fill="#4ade80" radius={[4, 4, 0, 0]} maxBarSize={30} />
                      <Bar yAxisId="left" dataKey={isPago ? 'gastosPago' : 'gastosComp'} name={isPago ? 'Gastos (Pagos)' : 'Gastos (Compromisos)'} fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={30} />
                      <Line yAxisId="right" type="monotone" dataKey="ejecucion" name="Tasa de Ejecución (%)" stroke="#ffcc29" strokeWidth={3} dot={{ r: 4, fill: '#ffcc29', strokeWidth: 0 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Sub-Concept Breakdown */}
              <div className="glass-card rounded-[32px] p-8">
                <h3 className="text-base font-bold text-white mb-6">Distribución Contable de Gastos</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(isPago ? financialData.categoryBreakdown.pago : financialData.categoryBreakdown.compromiso).map((cat, idx) => (
                    <div key={idx} className="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-mono text-on-surface-variant uppercase block mb-1">Rubro Contable</span>
                        <span className="text-xs font-bold text-white truncate max-w-[200px] block">{cat.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-white font-mono">${cat.value.toLocaleString('es-CO')}M</span>
                        <span className="text-[9px] text-on-surface-variant block mt-0.5">
                          {totalComp > 0 ? ((cat.value / (isPago ? totalPago : totalComp)) * 100).toFixed(1) : 0}% del total
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: INTERACTIVE CASH FLOW */}
          {activeTab === 'flow' && (
            <div className="space-y-8 animate-fade-in">
              <div className="glass-card rounded-[32px] overflow-hidden border border-white/5">
                <div className="px-8 py-6 border-b border-white/5 bg-white/5 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
                  <div>
                    <h3 className="text-lg font-bold text-white">Consolidado de Flujo de Caja</h3>
                    <p className="text-xs text-on-surface-variant mt-1">Valores en millones de pesos ($M). Ajusta la agregación temporal usando los botones selectores.</p>
                  </div>
                  
                  {/* Selector of granularity */}
                  <div className="flex bg-white/5 rounded-xl p-1 border border-white/10 shrink-0">
                    <button 
                      onClick={() => setFlowGranularity('monthly')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${flowGranularity === 'monthly' ? 'bg-[#ffcc29] text-black' : 'text-on-surface-variant hover:text-white'}`}
                    >
                      Mensual
                    </button>
                    <button 
                      onClick={() => setFlowGranularity('quarterly')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${flowGranularity === 'quarterly' ? 'bg-[#ffcc29] text-black' : 'text-on-surface-variant hover:text-white'}`}
                    >
                      Trimestral
                    </button>
                    <button 
                      onClick={() => setFlowGranularity('semesterly')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${flowGranularity === 'semesterly' ? 'bg-[#ffcc29] text-black' : 'text-on-surface-variant hover:text-white'}`}
                    >
                      Semestral
                    </button>
                    <button 
                      onClick={() => setFlowGranularity('annual')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${flowGranularity === 'annual' ? 'bg-[#ffcc29] text-black' : 'text-on-surface-variant hover:text-white'}`}
                    >
                      Anual
                    </button>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 text-[10px] font-mono text-on-surface-variant uppercase bg-white/5">
                        <th className="px-5 py-4">Período</th>
                        <th className="px-5 py-4 text-right">Ingresos (M)</th>
                        <th className="px-5 py-4 text-right">Gastos Comp (M)</th>
                        <th className="px-5 py-4 text-right">Gastos Pago (M)</th>
                        <th className="px-5 py-4 text-right">Neto Comp (M)</th>
                        <th className="px-5 py-4 text-right">Neto Pago (M)</th>
                        <th className="px-5 py-4 text-right">Acumulado Comp (M)</th>
                        <th className="px-5 py-4 text-right">Acumulado Pago (M)</th>
                        <th className="px-5 py-4 text-right">Tasa Ejecución (%)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-xs">
                      {aggregatedFlow.map((row, idx) => (
                        <tr key={idx} className="hover:bg-white/5 transition-colors">
                          <td className="px-5 py-4 font-bold text-white">{row.name}</td>
                          <td className="px-5 py-4 text-right text-[#4ade80] font-mono">${row.ingresos.toLocaleString('es-CO')}</td>
                          <td className="px-5 py-4 text-right text-orange-400 font-mono">${row.gastosComp.toLocaleString('es-CO')}</td>
                          <td className="px-5 py-4 text-right text-[#f43f5e] font-mono">${row.gastosPago.toLocaleString('es-CO')}</td>
                          <td className={`px-5 py-4 text-right font-mono font-bold ${row.netoComp >= 0 ? 'text-[#4ade80]' : 'text-orange-400'}`}>
                            ${row.netoComp.toLocaleString('es-CO')}
                          </td>
                          <td className={`px-5 py-4 text-right font-mono font-bold ${row.netoPago >= 0 ? 'text-[#4ade80]' : 'text-[#f43f5e]'}`}>
                            ${row.netoPago.toLocaleString('es-CO')}
                          </td>
                          <td className="px-5 py-4 text-right text-orange-200 font-mono">${row.acumuladoComp.toLocaleString('es-CO')}</td>
                          <td className="px-5 py-4 text-right text-white font-mono">${row.acumuladoPago.toLocaleString('es-CO')}</td>
                          <td className="px-5 py-4 text-right text-[#ffcc29] font-mono font-bold">{row.ejecucion}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: BREAK-EVEN EQUILIBRIUM */}
          {activeTab === 'equilibrium' && (
            <div className="space-y-8 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <SpeedometerGauge 
                  value={breakEvenCoverage} 
                  title="Equilibrio Presupuestal" 
                  subtitle={`Ingresos vs Gastos (${isPago ? 'Pagos' : 'Compromisos'})`} 
                />
                
                <div className="glass-card rounded-[24px] p-6 border border-white/5 flex flex-col justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white mb-1">Capacidad Financiera</h4>
                    <p className="text-[10px] text-on-surface-variant uppercase font-mono tracking-widest mb-4">Estado del Margen</p>
                    <div className="mt-4 space-y-4">
                      <div>
                        <span className="text-xs text-on-surface-variant block mb-1">Resultado Neto Proyectado</span>
                        <span className={`text-2xl font-bold font-mono ${currentNet >= 0 ? 'text-[#4ade80]' : 'text-[#f43f5e]'}`}>
                          ${currentNet.toLocaleString('es-CO', {maximumFractionDigits: 1})} <span className="text-xs font-sans text-on-surface-variant font-normal">mill.</span>
                        </span>
                      </div>
                      <div>
                        <span className="text-xs text-on-surface-variant block mb-1">Ingresos requeridos equilibrio</span>
                        <span className="text-xl font-bold font-mono text-white">
                          ${currentGas.toLocaleString('es-CO', {maximumFractionDigits: 1})} <span className="text-xs font-sans text-on-surface-variant font-normal">mill.</span>
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className={`mt-6 p-4 rounded-xl text-xs flex gap-2 items-center ${currentNet >= 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                    {currentNet >= 0 ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                    <div>
                      <span className="font-bold">{currentNet >= 0 ? 'Superávit' : 'Déficit'}</span>
                      <p className="text-[10px] opacity-80 mt-0.5">
                        {currentNet >= 0 
                          ? 'Los ingresos superan los gastos simulados.' 
                          : 'Se requieren nuevas fuentes de ingresos o reducción de gastos.'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="glass-card rounded-[24px] p-6 border border-white/5 flex flex-col justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white mb-1">Ejecución del Presupuesto</h4>
                    <p className="text-[10px] text-on-surface-variant uppercase font-mono tracking-widest mb-4">Utilización Relativa</p>
                    <div className="mt-4 space-y-4">
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-on-surface-variant">Gastos vs Aforado</span>
                          <span className="font-bold text-white">{(currentGas / (financialData.totals.simIng || 1) * 100).toFixed(1)}%</span>
                        </div>
                        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${isPago ? 'bg-gradient-to-r from-[#ffcc29] to-[#f43f5e]' : 'bg-gradient-to-r from-orange-400 to-[#f43f5e]'}`} 
                            style={{width: `${Math.min(100, (currentGas / (financialData.totals.simIng || 1) * 100))}%`}}
                          ></div>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-on-surface-variant">Ejecución de Ingresos Recaudados</span>
                          <span className="font-bold text-white">{(financialData.totals.baselineIng > 0 ? (financialData.totals.simIng / financialData.totals.baselineIng) * 100 : 100).toFixed(1)}%</span>
                        </div>
                        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-[#4ade80]" 
                            style={{width: `${Math.min(100, (financialData.totals.simIng / (financialData.totals.baselineIng || 1)) * 100)}%`}}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white/5 p-4 rounded-xl text-[10px] text-on-surface-variant flex gap-2 items-start mt-6">
                    <Info size={16} className="text-[#ffcc29] shrink-0" />
                    <p>El punto de equilibrio se recalcula dinámicamente con los parámetros modificados en el simulador.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ADVANCED SIMULATOR */}
          {activeTab === 'simulator' && (
            <div className="space-y-8 animate-fade-in">
              <div className="glass-card rounded-[24px] p-6 border border-[#ffcc29]/20 bg-[#0c1527] flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-white text-lg flex items-center gap-2">
                    <Settings className="text-[#ffcc29]" size={20} />
                    Simulador Financiero Avanzado por Recurso y Rubro
                  </h3>
                  <p className="text-xs text-on-surface-variant mt-1">
                    Ajusta los sliders de ingresos y gastos. **Afecta únicamente la proyección de Julio a Diciembre, tomando como referencia base el año anterior (2025)**.
                  </p>
                </div>
                <button 
                  onClick={handleResetSimulator}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-on-surface-variant hover:text-white transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer border border-white/10"
                >
                  <RotateCcw size={14} />
                  Reiniciar Simulador
                </button>
              </div>

              {/* Expense Type Sliders (Fase 9: Personal, Funcionamiento, etc.) */}
              <div className="glass-card rounded-[24px] p-6 border border-white/5">
                <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <Layers size={16} className="text-orange-400" />
                  Simulación de Egresos por Tipo de Gasto
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Object.keys(simGasByType).map((typeKey) => {
                    const label = typeKey === "Personal" ? "Personal (2.1.1)" :
                                  typeKey === "Funcionamiento" ? "Funcionamiento (2.1.2)" :
                                  typeKey === "Transferencias" ? "Transferencias (2.1.3)" :
                                  typeKey === "Tasas" ? "Tasas/Multas (2.1.8)" :
                                  typeKey === "Deuda" ? "Servicio Deuda (2.2.2)" : "Inversión (2.3)";
                    
                    const val = simGasByType[typeKey];

                    return (
                      <div key={typeKey} className="bg-white/5 p-4 rounded-xl space-y-3">
                        <div className="flex justify-between text-xs">
                          <span className="text-on-surface-variant">{label}: {val > 0 ? '+' : ''}{val}%</span>
                        </div>
                        <input 
                          type="range" 
                          min="-50" 
                          max="50" 
                          step="1"
                          value={val} 
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            setSimGasByType(prev => ({ ...prev, [typeKey]: v }));
                          }}
                          className="w-full accent-orange-400"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Resource sliders */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {RESOURCES_LIST.map((resName) => {
                  const baseline = financialData.resourceBaselines[resName] || { ing: 0, gasComp: 0, gasPago: 0 };
                  const currentGasBaseline = isPago ? baseline.gasPago : baseline.gasComp;

                  const valIng = simIngByResource[resName] || 0;
                  const valGas = simGasByResource[resName] || 0;

                  const simIngValue = baseline.ing * (1 + valIng / 100);
                  const simGasValue = currentGasBaseline * (1 + valGas / 100);
                  const simNetValue = simIngValue - simGasValue;

                  return (
                    <div key={resName} className="glass-card rounded-[24px] p-6 border border-white/5 flex flex-col justify-between space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-sm font-bold text-white truncate max-w-[280px]">{resName}</h4>
                          <p className="text-[10px] text-on-surface-variant uppercase font-mono tracking-wider mt-0.5">
                            Línea de Proyección Anual (Base)
                          </p>
                        </div>
                        <span className="text-[10px] font-mono bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-full text-white">
                          Neto Base: ${(baseline.ing - currentGasBaseline).toFixed(1)}M
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 bg-white/5 p-3 rounded-xl text-center text-xs">
                        <div>
                          <span className="text-on-surface-variant text-[10px] block">Ingreso Proyectado Base</span>
                          <strong className="text-[#4ade80] font-mono">${baseline.ing.toFixed(1)}M</strong>
                        </div>
                        <div>
                          <span className="text-on-surface-variant text-[10px] block">Gasto Proyectado Base</span>
                          <strong className="text-[#f43f5e] font-mono">${currentGasBaseline.toFixed(1)}M</strong>
                        </div>
                      </div>

                      <div className="space-y-4 pt-2">
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs">
                            <span className="text-on-surface-variant">Simular Proyección Ingreso: {valIng > 0 ? '+' : ''}{valIng}%</span>
                            <span className="font-bold text-[#4ade80] font-mono">${simIngValue.toFixed(1)}M</span>
                          </div>
                          <input 
                            type="range" 
                            min="-100" 
                            max="100" 
                            step="5"
                            value={valIng} 
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              setSimIngByResource(prev => ({ ...prev, [resName]: val }));
                            }}
                            className="w-full accent-[#4ade80]"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs">
                            <span className="text-on-surface-variant">Simular Proyección Gasto: {valGas > 0 ? '+' : ''}{valGas}%</span>
                            <span className="font-bold text-[#f43f5e] font-mono">${simGasValue.toFixed(1)}M</span>
                          </div>
                          <input 
                            type="range" 
                            min="-100" 
                            max="100" 
                            step="5"
                            value={valGas} 
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              setSimGasByResource(prev => ({ ...prev, [resName]: val }));
                            }}
                            className="w-full accent-[#f43f5e]"
                          />
                        </div>
                      </div>

                      <div className="pt-2 border-t border-white/5 flex justify-between items-center text-xs font-mono">
                        <span className="text-on-surface-variant">Resultado Proyectado Simulado:</span>
                        <strong className={simNetValue >= 0 ? 'text-[#4ade80]' : 'text-[#f43f5e]'}>
                          ${simNetValue.toFixed(1)}M
                        </strong>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 5: DETAILED EXPENSES ANALYSIS */}
          {activeTab === 'expenses' && (
            <div className="space-y-8 animate-fade-in">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Donut of expenditures */}
                <div className="lg:col-span-1 glass-card rounded-[24px] p-6 border border-white/5 flex flex-col justify-between">
                  <h4 className="text-sm font-bold text-white mb-4">Comportamiento de Rubros</h4>
                  <div className="h-56 relative flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={(isPago ? financialData.categoryBreakdown.pago : financialData.categoryBreakdown.compromiso)}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {(isPago ? financialData.categoryBreakdown.pago : financialData.categoryBreakdown.compromiso).map((entry, idx) => (
                            <Cell key={`cell-${idx}`} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v) => `$${v}M`} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute flex flex-col items-center">
                      <span className="text-2xl font-bold font-mono text-white">${currentGas.toFixed(1)}M</span>
                      <span className="text-[9px] text-on-surface-variant uppercase font-mono">Total Gasto</span>
                    </div>
                  </div>
                  
                  {/* Legend list */}
                  <div className="space-y-1.5 mt-4 text-[10px] font-mono text-on-surface-variant">
                    {(isPago ? financialData.categoryBreakdown.pago : financialData.categoryBreakdown.compromiso).map((cat, idx) => (
                      <div key={idx} className="flex justify-between items-center">
                        <span className="flex items-center gap-1.5 truncate max-w-[170px]">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{backgroundColor: PIE_COLORS[idx % PIE_COLORS.length]}}></span>
                          {cat.name}
                        </span>
                        <strong className="text-white">${cat.value}M</strong>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Heatmap/Matrix showing Resource allocations vs Expense types */}
                <div className="lg:col-span-2 glass-card rounded-[24px] p-6 border border-white/5 overflow-hidden">
                  <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-1.5">
                    <TableIcon size={16} className="text-[#ffcc29]" />
                    Matriz de Asignaciones: Recursos vs. Rubros
                  </h4>
                  <div className="overflow-x-auto max-h-[340px]">
                    <table className="w-full text-[10px] font-mono text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/10 bg-white/5 uppercase text-on-surface-variant">
                          <th className="px-3 py-2.5">Recurso</th>
                          <th className="px-3 py-2.5 text-right">Personal (M)</th>
                          <th className="px-3 py-2.5 text-right">Funcionamiento (M)</th>
                          <th className="px-3 py-2.5 text-right">Inversión (M)</th>
                          <th className="px-3 py-2.5 text-right">Otros (M)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-white">
                        {heatmapData.map((row, idx) => {
                          const personal = (row['2.1.1 Gastos de Personal'] / 1e6) || 0;
                          const func = (row['2.1.2 Gastos de Funcionamiento'] / 1e6) || 0;
                          const inv = (row['2.3 Gastos de Inversión'] / 1e6) || 0;
                          const otros = ((row['2.1.3 Transferencias Corrientes'] + row['2.1.8 Tasas y Multas'] + row['2.2.2 Servicios de la Deuda']) / 1e6) || 0;
                          
                          if (personal === 0 && func === 0 && inv === 0 && otros === 0) return null;

                          return (
                            <tr key={idx} className="hover:bg-white/5 transition-colors">
                              <td className="px-3 py-2 truncate max-w-[180px] font-bold">{row.recurso}</td>
                              <td className="px-3 py-2 text-right font-mono">${personal.toFixed(1)}</td>
                              <td className="px-3 py-2 text-right font-mono">${func.toFixed(1)}</td>
                              <td className="px-3 py-2 text-right font-mono">${inv.toFixed(1)}</td>
                              <td className="px-3 py-2 text-right font-mono">${otros.toFixed(1)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-[9px] text-on-surface-variant font-mono mt-3">
                    * Muestra la distribución matricial reactiva cruzada según el filtro global de Sede/Unidad y sliders seleccionados.
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
