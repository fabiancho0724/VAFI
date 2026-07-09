import { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ComposedChart, Line
} from 'recharts';
import { 
  Filter, DollarSign, Activity, TrendingUp, Briefcase, RefreshCw, Layers, 
  Compass, ChevronRight, PieChart as PieChartIcon, Table, CheckSquare
} from 'lucide-react';
import { fetchAndParseCSV } from '../lib/csvParser';
import { calculateProjections, aggregateFlow, CashFlowItem, ProjectionResults } from '../lib/financialEngine';
import { RESOURCES_LIST, getResourceFullName, getRecursoEquivalence } from '../lib/resourceMapper';
import rawHistoricalGastos from '../data/historicalGastos.json';

const COLORS = ['#ffcc29', '#4ade80', '#3b82f6', '#c084fc', '#f43f5e', '#7bd0ff', '#fb7185', '#a78bfa'];

export function PredictiveScreen({ onNavigate }: { onNavigate: (s: string) => void }) {
  const [dataStage, setDataStage] = useState<'loading' | 'ready'>('loading');
  const [rawYearlyIncomes, setRawYearlyIncomes] = useState<Record<number, any[]>>({});
  const [rawCumulativeIncomes, setRawCumulativeIncomes] = useState<any[]>([]);
  
  // Tabs
  const [activeTab, setActiveTab] = useState<'kpi' | 'flow' | 'equilibrium' | 'simulator' | 'expenses'>('kpi');
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
          { id: 'expenses', label: 'Análisis de Gastos', icon: PieChartIcon }
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
            <div className="glass-card rounded-[28px] p-8 border border-white/5 bg-surface/50 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-[#ffcc29]"></div>
              <h4 className="text-xs font-mono text-on-surface-variant uppercase tracking-widest mb-4">Ingresos Simulados (COP)</h4>
              <p className="text-4xl font-display font-bold text-white">${financialData.totals.simIng.toLocaleString('es-CO', {maximumFractionDigits:1})}M</p>
              <div className="flex items-center gap-2 mt-4 text-xs text-on-surface-variant">
                <span className="font-bold text-[#ffcc29]">Base: ${financialData.totals.baselineIng.toLocaleString('es-CO', {maximumFractionDigits:1})}M</span>
                <span>(Jul-Dic Simulado)</span>
              </div>
            </div>

            <div className="glass-card rounded-[28px] p-8 border border-white/5 bg-surface/50 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-[#f43f5e]"></div>
              <h4 className="text-xs font-mono text-on-surface-variant uppercase tracking-widest mb-4">Compromisos Totales</h4>
              <p className="text-4xl font-display font-bold text-white">${financialData.totals.simGasComp.toLocaleString('es-CO', {maximumFractionDigits:1})}M</p>
              <div className="flex items-center gap-2 mt-4 text-xs text-on-surface-variant">
                <span className="font-bold text-[#f43f5e]">Base: ${financialData.totals.baselineGasComp.toLocaleString('es-CO', {maximumFractionDigits:1})}M</span>
                <span>(Jul-Dic Simulado)</span>
              </div>
            </div>

            <div className="glass-card rounded-[28px] p-8 border border-white/5 bg-surface/50 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-[#4ade80]"></div>
              <h4 className="text-xs font-mono text-on-surface-variant uppercase tracking-widest mb-4">Pagos Efectivos</h4>
              <p className="text-4xl font-display font-bold text-white">${financialData.totals.simGasPago.toLocaleString('es-CO', {maximumFractionDigits:1})}M</p>
              <div className="flex items-center gap-2 mt-4 text-xs text-on-surface-variant">
                <span className="font-bold text-[#4ade80]">Base: ${financialData.totals.baselineGasPago.toLocaleString('es-CO', {maximumFractionDigits:1})}M</span>
                <span>(Jul-Dic Simulado)</span>
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
                  <th className="p-4 font-bold border-b border-white/10 text-right">Resultado Neto (Pago)</th>
                  <th className="p-4 font-bold border-b border-white/10 text-right">Saldo Acumulado</th>
                  <th className="p-4 font-bold border-b border-white/10 text-right">Ejecución YoY</th>
                </tr>
              </thead>
              <tbody>
                {aggregatedFlowData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-white/5 border-b border-white/5">
                    <td className="p-4 text-white font-bold">{row.name}</td>
                    <td className="p-4 text-right text-[#4ade80]">${row.ingresos.toLocaleString('es-CO', {minimumFractionDigits: 1})}M</td>
                    <td className="p-4 text-right text-[#f43f5e]">${row.gastosComp.toLocaleString('es-CO', {minimumFractionDigits: 1})}M</td>
                    <td className="p-4 text-right text-[#ffcc29]">${row.gastosPago.toLocaleString('es-CO', {minimumFractionDigits: 1})}M</td>
                    <td className={`p-4 text-right font-bold ${row.netoPago >= 0 ? 'text-[#4ade80]' : 'text-red-400'}`}>
                      ${row.netoPago.toLocaleString('es-CO', {minimumFractionDigits: 1})}M
                    </td>
                    <td className="p-4 text-right text-[#7bd0ff]">${row.acumuladoPago.toLocaleString('es-CO', {minimumFractionDigits: 1})}M</td>
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
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xl font-display font-medium text-white">Simulador de Escenarios Financieros (Julio - Diciembre)</h3>
              <p className="text-xs text-on-surface-variant mt-1">Los meses de Ene-Jun se mantienen fijos para asegurar fidelidad contable.</p>
            </div>
            <button onClick={handleResetSimulator} className="flex items-center px-4 py-2 bg-white/10 border border-white/20 rounded-xl hover:bg-white/20 transition text-xs font-mono gap-2">
              <RefreshCw size={13} /> Restaurar Línea Base
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Income resource modifiers */}
            <div className="glass-card rounded-[32px] p-6 lg:p-8 border border-white/10">
              <h4 className="text-sm font-bold text-[#ffcc29] uppercase tracking-widest mb-6 flex items-center gap-2 pb-4 border-b border-white/5">
                <TrendingUp size={16} /> Ajustar Variación de Ingresos
              </h4>
              <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {RESOURCES_LIST.map(r => {
                  const val = simIngByResource[r] || 0;
                  const baseVal = financialData.resourceBaselines[r]?.ing || 0;
                  const simVal = baseVal * (1 + val / 100);
                  return (
                    <div key={r} className="space-y-2">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-white/80 font-bold truncate max-w-[280px]" title={getResourceFullName(r)}>
                          {getResourceFullName(r)}
                        </span>
                        <div className="text-right shrink-0">
                          <span className="text-on-surface-variant">Base: ${baseVal.toFixed(1)}M </span>
                          <span className="text-[#ffcc29] font-bold">→ Sim: ${simVal.toFixed(1)}M ({val >= 0 ? '+' : ''}{val}%)</span>
                        </div>
                      </div>
                      <input 
                        type="range"
                        min="-50"
                        max="50"
                        value={val}
                        onChange={(e) => {
                          const n = parseInt(e.target.value);
                          setSimIngByResource(prev => ({ ...prev, [r]: n }));
                        }}
                        className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#ffcc29]"
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Expense resource and category modifiers */}
            <div className="glass-card rounded-[32px] p-6 lg:p-8 border border-white/10 flex flex-col gap-8">
              <div>
                <h4 className="text-sm font-bold text-[#f43f5e] uppercase tracking-widest mb-6 flex items-center gap-2 pb-4 border-b border-white/5">
                  <Briefcase size={16} /> Ajustar Egresos por Recurso
                </h4>
                <div className="space-y-6 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                  {RESOURCES_LIST.map(r => {
                    const val = simGasByResource[r] || 0;
                    const baseVal = financialData.resourceBaselines[r]?.gasComp || 0;
                    const simVal = baseVal * (1 + val / 100);
                    return (
                      <div key={r} className="space-y-2">
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-white/80 font-bold truncate max-w-[280px]" title={getResourceFullName(r)}>
                            {getResourceFullName(r)}
                          </span>
                          <div className="text-right shrink-0">
                            <span className="text-on-surface-variant">Base: ${baseVal.toFixed(1)}M </span>
                            <span className="text-[#f43f5e] font-bold">→ Sim: ${simVal.toFixed(1)}M ({val >= 0 ? '+' : ''}{val}%)</span>
                          </div>
                        </div>
                        <input 
                          type="range"
                          min="-50"
                          max="50"
                          value={val}
                          onChange={(e) => {
                            const n = parseInt(e.target.value);
                            setSimGasByResource(prev => ({ ...prev, [r]: n }));
                          }}
                          className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#f43f5e]"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold text-[#7bd0ff] uppercase tracking-widest mb-6 flex items-center gap-2 pb-4 border-b border-white/5">
                  <Layers size={16} /> Ajustar Egresos por Tipo/Categoría
                </h4>
                <div className="space-y-6">
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
    </div>
  );
}
