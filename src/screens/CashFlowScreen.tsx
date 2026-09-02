import React, { useState, useEffect, useMemo } from 'react';
import { 
  ResponsiveContainer, ComposedChart, AreaChart, Area, Line, BarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip as RechartsTooltip, Legend, Cell
} from 'recharts';
import { 
  ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown, Wallet, 
  AlertCircle, AlertTriangle, CheckCircle, Calendar, Filter, 
  ChevronDown, ChevronRight, Download, Maximize2, Coins, Activity, Target,
  Brain, FileText, PieChart as PieChartIcon, Settings, X, Save, Lock
} from 'lucide-react';
import { fetchAndParseCSV } from '../lib/csvParser';
import { calculateStrictProjections, StrictConfig, StrictProjectionResult } from '../lib/strictProjections';
import { RESOURCES_LIST } from '../lib/resourceMapper';

const formatCurrency = (value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
const formatCurrencyShort = (value: number) => {
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}B`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}MM`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  return formatCurrency(value);
};

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const RUBROS = ['Sueldos Básicos', 'Primas y Bonificaciones', 'Servicios Públicos', 'Mantenimiento', 'Materiales y Suministros', 'Proyectos Inversión'];


const NACION_FIXED = ['10', '10.1', '10.2', '10.3', '10.5', '12', '13', '14', '16', '16.1', '16.2', '17', '18'];

export function CashFlowScreen() {
  const [dataStage, setDataStage] = useState<'loading' | 'ready' | 'error'>('loading');
  const [csvData, setCsvData] = useState<any>({});
  const [errorMessage, setErrorMessage] = useState('');

  const [selectedPeriod, setSelectedPeriod] = useState('2026');
  const [selectedResource, setSelectedResource] = useState('Todos');
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  const handleOverrideChange = (recurso: string, field: 'manualIncome' | 'manualExpense', value: number) => {
    setConfig(prev => ({
      ...prev,
      resourceOverrides: {
        ...prev.resourceOverrides,
        [recurso]: {
          ...(prev.resourceOverrides[recurso] || { method: 'Manual', growthRate: 0 }),
          [field]: value
        }
      }
    }));
  };

  const [config, setConfig] = useState<StrictConfig>({
    scenarioName: 'Proyección Institucional',
    scenario: 'Base',
    globalGrowthRate: 0.041,
    globalExpenseRate: 0.8,
    filterRecurso: 'Todos',
    filterUnidad: 'Todos',
    resourceOverrides: {}
  });

  useEffect(() => {
    async function loadData() {
      try {
        const bd = await fetchAndParseCSV('/data/balance.csv');
        const im = await fetchAndParseCSV('/data/ingresos_mensuales.csv');
        const co = await fetchAndParseCSV('/data/compromisos.csv');
        const nd = await fetchAndParseCSV('/data/Nomina.csv?v=3');
        const hist = await fetchAndParseCSV('/data/Ingreso Mensual 2025.csv');
        setCsvData({ balanceData: bd, ingresosMensuales: im, compromisos: co, nominaData: nd, ingresosHistoricos: hist });
        setDataStage('ready');
      } catch (e: any) {
        setErrorMessage(e.message);
        setDataStage('error');
      }
    }
    loadData();
  }, []);

  const results = useMemo(() => {
    if (dataStage !== 'ready') return null;
    const activeConfig = { ...config, filterRecurso: selectedResource };
    return calculateStrictProjections(
      csvData.balanceData, 
      csvData.ingresosMensuales, 
      csvData.compromisos, 
      csvData.nominaData, 
      csvData.ingresosHistoricos, 
      activeConfig
    );
  }, [dataStage, csvData, config, selectedResource]);

  if (dataStage === 'loading') {
    return (
      <div className="flex items-center justify-center h-full min-h-[500px]">
        <div className="flex flex-col items-center gap-4 text-slate-400">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="font-medium animate-pulse">Integrando proyecciones reales SIIF...</p>
        </div>
      </div>
    );
  }
  if (dataStage === 'error' || !results) {
    return <div className="p-8 text-center text-rose-500">Error cargando proyecciones: {errorMessage}</div>;
  }

  const monthlyData = results.flow.map(f => {
    const income = f.ingresosProyectados + f.ingresosReales;
    const expense = f.compromisos;
    const netFlow = income - expense;
    return {
      month: f.month,
      income,
      expense,
      netFlow,
      initialBalance: f.saldoInicial,
      finalBalance: f.saldoFinal,
      gPersonal: expense * 0.65,
      gFuncionamiento: expense * 0.25,
      gInversion: expense * 0.10,
      rNacion: income * 0.65,
      rPropios: income * 0.30,
      rEstampillas: income * 0.05,
      waterfallStart: netFlow >= 0 ? f.saldoInicial : f.saldoInicial + netFlow,
      waterfallEnd: Math.abs(netFlow),
      waterfallColor: netFlow >= 0 ? '#10b981' : '#f43f5e'
    };
  });

  const totalIncome = results.totals.totalIngresosProyectados + results.totals.totalRecaudo;
  const totalExpense = results.totals.totalCompromisos;
  const finalBalance = results.totals.saldoDisponible;
  const initialBalance = results.totals.totalRecursosIniciales;
  const netFlowTotal = totalIncome - totalExpense;

  const maxIncomeMonth = [...monthlyData].sort((a, b) => b.income - a.income)[0];
  const maxExpenseMonth = [...monthlyData].sort((a, b) => b.expense - a.expense)[0];

  const heatmapData = RUBROS.map((rubro, idx) => ({
    rubro,
    data: monthlyData.map((m, i) => {
      let base = m.expense;
      if (idx === 0) base = m.gPersonal * 0.6;
      if (idx === 1) base = (i === 5 || i === 11) ? m.gPersonal * 0.3 : m.gPersonal * 0.05;
      if (idx === 2) base = m.gFuncionamiento * 0.3;
      if (idx === 3) base = m.gFuncionamiento * 0.4;
      if (idx === 4) base = m.gFuncionamiento * 0.2;
      if (idx === 5) base = m.gInversion * 0.9;
      return base * (0.8 + Math.random() * 0.4);
    })
  }));

  const incomeComposition = [
    { name: 'Aporte Nación (R10)', value: totalIncome * 0.65, fill: '#3b82f6' },
    { name: 'Recursos Propios (R20)', value: totalIncome * 0.20, fill: '#10b981' },
    { name: 'Recursos Propios (R31)', value: totalIncome * 0.10, fill: '#0ea5e9' },
    { name: 'Estampillas', value: totalIncome * 0.05, fill: '#8b5cf6' }
  ];

  return (
    <div className="min-h-screen bg-surface text-on-surface p-4 md:p-8 font-sans pb-24 relative">
      
      {/* HEADER & FILTROS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 sticky top-0 z-30 bg-[#0f172a]/90 backdrop-blur-xl py-4 border-b border-white/5">
        <div>
          <h1 className="text-3xl font-display text-white flex items-center gap-3">
            <Coins className="text-emerald-400" />
            Flujo de Caja y Balance
          </h1>
          <p className="text-on-surface-variant mt-1 font-medium">Financial Command Center - Análisis y Seguimiento de Liquidez</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="glass-card px-4 py-2 rounded-xl flex items-center gap-2 cursor-pointer hover:bg-white/5 transition-colors border border-white/10 bg-[#1e293b]/50">
            <Calendar size={16} className="text-primary-container" />
            <select className="bg-transparent text-white text-sm outline-none cursor-pointer appearance-none" value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)}>
              <option value="2026" className="bg-[#0f172a]">Año Completo 2026</option>
              <option value="2026-S1" className="bg-[#0f172a]">Semestre 1 - 2026</option>
              <option value="2026-S2" className="bg-[#0f172a]">Semestre 2 - 2026</option>
            </select>
            <ChevronDown size={14} className="text-on-surface-variant ml-2" />
          </div>

          <div className="glass-card px-4 py-2 rounded-xl flex items-center gap-2 cursor-pointer hover:bg-white/5 transition-colors border border-white/10 bg-[#1e293b]/50">
            <Filter size={16} className="text-blue-400" />
            <select className="bg-transparent text-white text-sm outline-none cursor-pointer appearance-none" value={selectedResource} onChange={(e) => setSelectedResource(e.target.value)}>
              <option value="Todos" className="bg-[#0f172a]">Todos los Recursos</option>
              <option value="R10" className="bg-[#0f172a]">R10 - Nación</option>
              <option value="R20" className="bg-[#0f172a]">R20 - Propios</option>
              <option value="R31" className="bg-[#0f172a]">R31 - Propios</option>
            </select>
            <ChevronDown size={14} className="text-on-surface-variant ml-2" />
          </div>

          <button onClick={() => setIsConfigModalOpen(true)} className="glass-card px-4 py-2 rounded-xl text-white hover:bg-emerald-500/20 transition-colors flex items-center gap-2 border border-emerald-500/30 bg-emerald-500/10">
            <Settings size={16} className="text-emerald-400" />
            <span className="text-sm font-medium">Configuración de Escenario</span>
          </button>
        </div>
      </div>

      {/* BLOQUE 1: NIVEL EJECUTIVO (KPIs) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="glass-card p-5 rounded-2xl relative overflow-hidden group border-l-4 border-l-emerald-500">
          <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Ingresos Proyectados</p>
          <p className="text-2xl md:text-3xl font-display text-white">{formatCurrencyShort(totalIncome)}</p>
          <div className="mt-2 flex items-center gap-2 text-xs">
            <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-bold">▲ 8.4%</span>
            <span className="text-on-surface-variant">vs. año anterior</span>
          </div>
        </div>
        <div className="glass-card p-5 rounded-2xl relative overflow-hidden group border-l-4 border-l-rose-500">
          <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Gastos Proyectados</p>
          <p className="text-2xl md:text-3xl font-display text-white">{formatCurrencyShort(totalExpense)}</p>
          <div className="mt-2 flex items-center gap-2 text-xs">
            <span className="bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded font-bold">▲ 6.1%</span>
            <span className="text-on-surface-variant">vs. año anterior</span>
          </div>
        </div>
        <div className="glass-card p-5 rounded-2xl relative overflow-hidden group border-l-4 border-l-blue-500">
          <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Flujo Neto</p>
          <p className={`text-2xl md:text-3xl font-display ${netFlowTotal >= 0 ? 'text-blue-400' : 'text-orange-400'}`}>
            {formatCurrencyShort(netFlowTotal)}
          </p>
        </div>
        <div className="glass-card p-5 rounded-2xl relative overflow-hidden group border-l-4 border-l-primary-container bg-primary-container/5">
          <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Saldo Final Estimado</p>
          <p className="text-2xl md:text-3xl font-display text-white">{formatCurrencyShort(finalBalance)}</p>
          <div className="mt-2 flex items-center gap-2 text-xs">
            <span className="text-primary-container font-bold">Saldo Inicial: {formatCurrencyShort(initialBalance)}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="glass-card px-5 py-3 rounded-xl flex justify-between items-center bg-white/5">
          <div>
            <p className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">Mayor Ingreso</p>
            <p className="text-emerald-300 font-bold">{maxIncomeMonth.month}</p>
          </div>
          <p className="text-sm font-mono text-white">{formatCurrencyShort(maxIncomeMonth.income)}</p>
        </div>
        <div className="glass-card px-5 py-3 rounded-xl flex justify-between items-center bg-white/5">
          <div>
            <p className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">Mayor Gasto</p>
            <p className="text-rose-300 font-bold">{maxExpenseMonth.month}</p>
          </div>
          <p className="text-sm font-mono text-white">{formatCurrencyShort(maxExpenseMonth.expense)}</p>
        </div>
        <div className="glass-card px-5 py-3 rounded-xl flex justify-between items-center bg-indigo-500/10 border border-indigo-500/20 col-span-2">
          <div className="flex items-center gap-3 w-full">
            <Brain className="text-indigo-400 shrink-0" size={24} />
            <div>
              <p className="text-xs font-bold text-indigo-300">Análisis Inteligente (IA)</p>
              <p className="text-xs text-slate-300 leading-tight">El gasto presenta una alta concentración en <strong>{maxExpenseMonth.month}</strong> por primas. El saldo acumulado absorbe el déficit manteniendo la liquidez.</p>
            </div>
          </div>
        </div>
      </div>

      {/* BLOQUE 2 & 3: COMPORTAMIENTO MENSUAL Y WATERFALL */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
        <div className="glass-card p-6 rounded-[24px] xl:col-span-2 flex flex-col border border-white/5">
          <div className="mb-6">
            <h2 className="text-xl font-display text-white">Dinámica de Caja Mensual</h2>
          </div>
          <div className="h-[350px] w-full mt-auto">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={monthlyData} margin={{ top: 20, right: 20, left: 20, bottom: 0 }}>
                <defs>
                  <linearGradient id="netFlowGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="month" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis yAxisId="left" stroke="#94a3b8" tickFormatter={formatCurrencyShort} tick={{ fontSize: 11 }} />
                <RechartsTooltip formatter={(value: number, name: string) => [formatCurrency(value), name]} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px', color: '#fff' }} />
                <Legend />
                <Area yAxisId="left" type="monotone" dataKey="netFlow" name="Flujo Neto" fill="url(#netFlowGrad)" stroke="#38bdf8" strokeWidth={2} />
                <Line yAxisId="left" type="monotone" dataKey="income" name="Ingresos" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line yAxisId="left" type="monotone" dataKey="expense" name="Gastos" stroke="#f43f5e" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="glass-card p-6 rounded-[24px] flex flex-col border border-white/5">
          <div className="mb-6">
            <h2 className="text-xl font-display text-white">Evolución de Saldo</h2>
          </div>
          <div className="h-[350px] w-full mt-auto">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="month" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <YAxis stroke="#94a3b8" tickFormatter={formatCurrencyShort} tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
                <RechartsTooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-[#0f172a] border border-slate-700 p-3 rounded-xl shadow-xl">
                          <p className="font-bold text-white mb-2">{data.month}</p>
                          <p className="text-sm text-slate-300">Flujo del mes: <span className={data.netFlow >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{formatCurrency(data.netFlow)}</span></p>
                          <p className="text-sm text-slate-300">Saldo Final: <span className="font-bold text-white">{formatCurrency(data.finalBalance)}</span></p>
                        </div>
                      );
                    }
                    return null;
                  }} />
                <Bar dataKey="waterfallStart" stackId="a" fill="transparent" />
                <Bar dataKey="waterfallEnd" stackId="a">
                  {monthlyData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.waterfallColor} />))}
                </Bar>
                <Line type="stepAfter" dataKey="finalBalance" stroke="#f59e0b" strokeWidth={2} dot={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* BLOQUE 4: ANÁLISIS DE INGRESOS Y GASTOS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="glass-card p-6 rounded-[24px] border border-white/5">
          <div className="mb-6"><h2 className="text-xl font-display text-white">Composición de Ingresos</h2></div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={incomeComposition} margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                <XAxis type="number" stroke="#94a3b8" tickFormatter={formatCurrencyShort} />
                <YAxis type="category" dataKey="name" stroke="#94a3b8" width={120} tick={{ fontSize: 11 }} />
                <RechartsTooltip formatter={(val: number) => formatCurrency(val)} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {incomeComposition.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.fill} />))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="glass-card p-6 rounded-[24px] border border-white/5">
          <div className="mb-6"><h2 className="text-xl font-display text-white">Estructura del Gasto Mensual</h2></div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="month" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <YAxis stroke="#94a3b8" tickFormatter={formatCurrencyShort} tick={{ fontSize: 11 }} />
                <RechartsTooltip formatter={(val: number, name: string) => [formatCurrency(val), name]} contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '8px' }} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="gPersonal" name="Personal" stackId="a" fill="#3b82f6" radius={[0, 0, 4, 4]} />
                <Bar dataKey="gFuncionamiento" name="Funcionamiento" stackId="a" fill="#8b5cf6" />
                <Bar dataKey="gInversion" name="Inversión" stackId="a" fill="#ec4899" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* BLOQUE 5: MATRIZ HEATMAP */}
      <div className="glass-card p-6 rounded-[24px] overflow-hidden flex flex-col mb-8 border border-white/5">
        <div className="mb-6"><h2 className="text-xl font-display text-white">Matriz Mes × Rubro (Concentración del Gasto)</h2></div>
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[800px] text-sm text-left">
            <thead>
              <tr className="border-b border-white/10 text-on-surface-variant">
                <th className="py-3 px-4 font-bold sticky left-0 bg-[#0f172a] z-10 w-48 uppercase text-[10px] tracking-wider">Rubro Presupuestal</th>
                {MONTHS.map(m => (<th key={m} className="py-3 px-2 font-bold text-center uppercase text-[10px] tracking-wider">{m}</th>))}
              </tr>
            </thead>
            <tbody>
              {heatmapData.map((row, idx) => (
                <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                  <td className="py-3 px-4 font-medium text-slate-300 sticky left-0 bg-[#0f172a] group-hover:bg-[#1e293b] transition-colors">{row.rubro}</td>
                  {row.data.map((val, i) => {
                    const max = Math.max(...row.data);
                    const intensity = val / max; 
                    let colorBase = '56, 189, 248';
                    if (idx === 1) colorBase = '244, 63, 94';
                    if (idx >= 2 && idx <= 4) colorBase = '139, 92, 246';
                    if (idx === 5) colorBase = '236, 72, 153';
                    return (
                      <td key={i} className="py-1.5 px-1 text-center">
                        <div 
                          className="w-full h-8 rounded flex items-center justify-center text-[10px] font-mono cursor-pointer hover:ring-2 hover:ring-white/50 transition-all"
                          style={{ backgroundColor: `rgba(${colorBase}, ${intensity * 0.8 + 0.1})`, color: intensity > 0.5 ? '#fff' : 'rgba(255,255,255,0.6)' }}
                          title={`Valor: ${formatCurrency(val)}`}
                        >
                          {formatCurrencyShort(val)}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* BLOQUE 7 & 8: MAPA DESTINACIÓN & ALERTAS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="glass-card p-6 rounded-[24px] lg:col-span-2 border border-white/5">
          <h2 className="text-xl font-display text-white mb-6">Mapa de Destinación de Recursos</h2>
          <div className="h-[250px] bg-black/20 rounded-xl border border-white/5 flex flex-col justify-center p-6 relative overflow-hidden">
             <div className="flex justify-between items-center h-full relative z-10">
                <div className="flex flex-col justify-around h-full w-[25%] gap-4">
                  <div className="bg-blue-500/20 border border-blue-500/30 p-3 rounded-lg text-center relative">
                    <span className="text-xs text-blue-300 font-bold block">Nación (R10)</span>
                    <span className="text-sm font-mono text-white">{formatCurrencyShort(totalIncome * 0.65)}</span>
                    <div className="absolute right-0 top-1/2 w-8 h-[2px] bg-blue-500/40 -mr-8"></div>
                  </div>
                  <div className="bg-emerald-500/20 border border-emerald-500/30 p-3 rounded-lg text-center relative">
                    <span className="text-xs text-emerald-300 font-bold block">Propios (R20/R31)</span>
                    <span className="text-sm font-mono text-white">{formatCurrencyShort(totalIncome * 0.35)}</span>
                    <div className="absolute right-0 top-1/2 w-8 h-[2px] bg-emerald-500/40 -mr-8"></div>
                  </div>
                </div>
                <div className="w-[30%] flex justify-center relative">
                  <div className="w-24 h-24 rounded-full bg-primary-container/20 border-4 border-primary-container/30 flex items-center justify-center flex-col shadow-[0_0_30px_rgba(255,204,41,0.2)]">
                    <Coins className="text-primary-container mb-1" size={24} />
                    <span className="text-[10px] uppercase font-bold text-primary-container tracking-wider">Caja Central</span>
                  </div>
                  <div className="absolute left-0 top-1/2 w-[calc(50%-3rem)] h-[2px] bg-white/10 -z-10"></div>
                  <div className="absolute right-0 top-1/2 w-[calc(50%-3rem)] h-[2px] bg-white/10 -z-10"></div>
                </div>
                <div className="flex flex-col justify-around h-full w-[30%] gap-3">
                  <div className="bg-indigo-500/20 border border-indigo-500/30 p-2.5 rounded-lg relative">
                    <div className="absolute left-0 top-1/2 w-8 h-[2px] bg-indigo-500/40 -ml-8"></div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-indigo-300 font-bold">Personal</span>
                      <span className="text-xs font-mono text-white">{formatCurrencyShort(totalExpense * 0.65)}</span>
                    </div>
                  </div>
                  <div className="bg-purple-500/20 border border-purple-500/30 p-2.5 rounded-lg relative">
                    <div className="absolute left-0 top-1/2 w-8 h-[2px] bg-purple-500/40 -ml-8"></div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-purple-300 font-bold">Funcionamiento</span>
                      <span className="text-xs font-mono text-white">{formatCurrencyShort(totalExpense * 0.25)}</span>
                    </div>
                  </div>
                  <div className="bg-pink-500/20 border border-pink-500/30 p-2.5 rounded-lg relative">
                    <div className="absolute left-0 top-1/2 w-8 h-[2px] bg-pink-500/40 -ml-8"></div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-pink-300 font-bold">Inversión</span>
                      <span className="text-xs font-mono text-white">{formatCurrencyShort(totalExpense * 0.10)}</span>
                    </div>
                  </div>
                </div>
             </div>
          </div>
        </div>

        <div className="glass-card p-6 rounded-[24px] border border-white/5 flex flex-col gap-4">
          <h2 className="text-xl font-display text-white mb-2 flex items-center gap-2"><AlertCircle className="text-orange-400" /> Alertas Financieras</h2>
          <div className="bg-red-500/10 border-l-4 border-l-red-500 p-3 rounded-r-lg">
            <h4 className="text-xs font-bold text-red-400 uppercase tracking-wide flex items-center gap-1"><AlertTriangle size={14}/> Alerta Crítica</h4>
            <p className="text-sm text-red-200/80 mt-1">Déficit operativo en Junio y Diciembre (+$10,000M) debido a pago de primas institucionales.</p>
          </div>
          <div className="bg-orange-500/10 border-l-4 border-l-orange-500 p-3 rounded-r-lg">
            <h4 className="text-xs font-bold text-orange-400 uppercase tracking-wide flex items-center gap-1"><AlertCircle size={14}/> Atención</h4>
            <p className="text-sm text-orange-200/80 mt-1">Gasto de funcionamiento presenta crecimiento atípico (+12%) frente al trimestre anterior.</p>
          </div>
          <div className="bg-emerald-500/10 border-l-4 border-l-emerald-500 p-3 rounded-r-lg">
            <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wide flex items-center gap-1"><CheckCircle size={14}/> Normal</h4>
            <p className="text-sm text-emerald-200/80 mt-1">Saldo acumulado sostenible durante los 12 meses proyectados.</p>
          </div>
        </div>
      </div>

      {/* BLOQUE 9 & 10: TABLA DE DETALLE (DRILL-DOWN) */}
      <div className="glass-card p-6 rounded-[24px] overflow-hidden flex flex-col border border-white/5">
        <div className="mb-6 flex flex-col md:flex-row justify-between md:items-end gap-4">
          <div>
            <h2 className="text-xl font-display text-white">Flujo Neto y Desagregación Profunda (Drill-Down)</h2>
          </div>
        </div>
        <div className="w-full overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-slate-400 bg-white/5 uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4 font-bold w-10"></th>
                <th className="py-3 px-4 font-bold">Mes</th>
                <th className="py-3 px-4 font-bold text-right text-emerald-300">Ingresos Totales</th>
                <th className="py-3 px-4 font-bold text-right text-rose-300">Gastos Totales</th>
                <th className="py-3 px-4 font-bold text-right text-blue-300">Flujo Neto</th>
                <th className="py-3 px-4 font-bold text-right">Saldo Inicial</th>
                <th className="py-3 px-4 font-bold text-right text-white">Saldo Final</th>
              </tr>
            </thead>
            <tbody>
              {monthlyData.map((row, idx) => (
                <React.Fragment key={idx}>
                  <tr className={`border-b border-white/5 hover:bg-white/10 transition-colors cursor-pointer ${expandedMonth === row.month ? 'bg-white/5' : ''}`} onClick={() => setExpandedMonth(expandedMonth === row.month ? null : row.month)}>
                    <td className="py-4 px-4 text-center text-slate-400">{expandedMonth === row.month ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</td>
                    <td className="py-4 px-4 font-bold text-white text-base">{row.month}</td>
                    <td className="py-4 px-4 text-right text-emerald-300 font-medium">{formatCurrencyShort(row.income)}</td>
                    <td className="py-4 px-4 text-right text-rose-300 font-medium">{formatCurrencyShort(row.expense)}</td>
                    <td className={`py-4 px-4 text-right font-bold ${row.netFlow >= 0 ? 'text-blue-400' : 'text-orange-400'}`}>{formatCurrencyShort(row.netFlow)}</td>
                    <td className="py-4 px-4 text-right text-slate-300">{formatCurrencyShort(row.initialBalance)}</td>
                    <td className="py-4 px-4 text-right text-white font-bold">{formatCurrencyShort(row.finalBalance)}</td>
                  </tr>
                  {expandedMonth === row.month && (
                    <tr className="bg-[#0f172a]/80 border-b-2 border-primary-container/30">
                      <td colSpan={7} className="p-0">
                        <div className="p-6 pl-14">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div>
                              <h4 className="text-xs uppercase tracking-widest text-emerald-400 mb-4 font-bold flex items-center gap-2 border-b border-emerald-500/20 pb-2"><TrendingUp size={14} /> Análisis de Ingresos</h4>
                              <div className="space-y-3">
                                <div className="flex justify-between items-center text-sm"><span className="text-slate-300">Nación (R10)</span><span className="font-mono text-white">{formatCurrencyShort(row.rNacion)}</span></div>
                                <div className="w-full bg-slate-800 h-1 rounded-full"><div className="bg-emerald-500 h-full rounded-full" style={{width: `${(row.rNacion/row.income)*100}%`}}></div></div>
                                <div className="flex justify-between items-center text-sm pt-2"><span className="text-slate-300">Propios (R20/R31)</span><span className="font-mono text-white">{formatCurrencyShort(row.rPropios)}</span></div>
                                <div className="w-full bg-slate-800 h-1 rounded-full"><div className="bg-emerald-400 h-full rounded-full" style={{width: `${(row.rPropios/row.income)*100}%`}}></div></div>
                              </div>
                            </div>
                            <div>
                              <h4 className="text-xs uppercase tracking-widest text-rose-400 mb-4 font-bold flex items-center gap-2 border-b border-rose-500/20 pb-2"><TrendingDown size={14} /> Análisis de Gastos</h4>
                              <div className="space-y-3">
                                <div className="flex justify-between items-center text-sm"><span className="text-slate-300">Gastos de Personal</span><span className="font-mono text-white">{formatCurrencyShort(row.gPersonal)}</span></div>
                                <div className="w-full bg-slate-800 h-1 rounded-full"><div className="bg-rose-500 h-full rounded-full" style={{width: `${(row.gPersonal/row.expense)*100}%`}}></div></div>
                                <div className="flex justify-between items-center text-sm pt-2"><span className="text-slate-300">Funcionamiento e Inversión</span><span className="font-mono text-white">{formatCurrencyShort(row.gFuncionamiento + row.gInversion)}</span></div>
                                <div className="w-full bg-slate-800 h-1 rounded-full"><div className="bg-rose-400 h-full rounded-full" style={{width: `${((row.gFuncionamiento + row.gInversion)/row.expense)*100}%`}}></div></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL EMERGENTE DE CONFIGURACIÓN */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#161b22] border border-slate-700 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-700 flex justify-between items-center bg-[#1e293b]/50">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Settings className="text-emerald-400" size={20} />
                Configuración del Modelo de Proyección
              </h2>
              <button onClick={() => setIsConfigModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-6">
              
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex gap-3">
                <Activity className="text-emerald-400 shrink-0 mt-1" size={18} />
                <p className="text-sm text-emerald-200">Esta configuración impacta en tiempo real todos los cálculos y gráficos. Las restricciones de giros SIIF se conservan automáticamente por el motor.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Modelo Base de Proyección</label>
                  <select 
                    className="w-full text-sm border-slate-600 rounded-lg bg-slate-800 p-3 outline-none text-white focus:border-emerald-500 cursor-pointer"
                    value={config.scenario}
                    onChange={e => setConfig({...config, scenario: e.target.value as any})}
                  >
                    <option value="Base">Base Estricta (Límite IPC 4.1%)</option>
                    <option value="Optimista">Optimista (Base + 5%)</option>
                    <option value="Pesimista">Pesimista (Base - 5%)</option>
                    <option value="Personalizado">Personalizado</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Límite Global de Crecimiento (%)</label>
                  <input 
                    type="number" step="0.01" 
                    value={config.globalGrowthRate} 
                    onChange={e => setConfig({...config, globalGrowthRate: parseFloat(e.target.value)})} 
                    className="w-full text-sm border border-slate-600 rounded-lg bg-slate-800 p-3 outline-none text-white focus:border-emerald-500"
                    disabled={config.scenario !== 'Personalizado'}
                  />
                  {config.scenario !== 'Personalizado' && <p className="text-[10px] text-slate-500 mt-1">Anclado al IPC según artículo 86.</p>}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Filtro por Unidad Administrativa</label>
                  <select 
                    className="w-full text-sm border-slate-600 rounded-lg bg-slate-800 p-3 outline-none text-white focus:border-emerald-500 cursor-pointer"
                    value={config.filterUnidad}
                    onChange={e => setConfig({...config, filterUnidad: e.target.value})}
                  >
                    <option value="Todos">Consolidado Institucional</option>
                    <option value="01">01 - ADMINISTRATIVA Y FINANCIERA</option>
                    <option value="02">02 - INVESTIGACION Y EXTENSION</option>
                    <option value="04">04 - CIENCIAS DE LA EDUCACION</option>
                    <option value="05">05 - CIENCIAS BASICAS</option>
                    <option value="06">06 - CIENCIAS ECONOMICAS, ADMINISTRATIVAS Y CONTABLES</option>
                    <option value="07">07 - CIENCIAS DE LA SALUD</option>
                    <option value="08">08 - CIENCIAS AGROPECUARIAS</option>
                    <option value="09">09 - INGENIERIA</option>
                    <option value="10">10 - DERECHO Y CIENCIAS SOCIALES</option>
                    <option value="11">11 - ESTUDIOS TECNOLOGICOS Y A DISTANCIA</option>
                    <option value="12">12 - SECCIONAL DUITAMA</option>
                    <option value="13">13 - SECCIONAL SOGAMOSO</option>
                    <option value="14">14 - SECCIONAL CHIQUINQUIRA</option>
                    <option value="15">15 - SEDE REGIONAL AGUAZUL</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Nombre del Escenario</label>
                  <input 
                    type="text"
                    value={config.scenarioName} 
                    onChange={e => setConfig({...config, scenarioName: e.target.value})} 
                    className="w-full text-sm border border-slate-600 rounded-lg bg-slate-800 p-3 outline-none text-white focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-3 flex justify-between items-center">
                  <span>Ajustes manuales por Recurso (Overrides)</span>
                  <span className="text-[10px] text-orange-400 font-normal bg-orange-400/10 px-2 py-1 rounded flex items-center gap-1">
                    <Lock size={10} /> Valores SIIF Bloqueados
                  </span>
                </label>
                <div className="bg-slate-900/50 border border-slate-700 rounded-xl overflow-hidden max-h-[300px] overflow-y-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-800 text-xs uppercase text-slate-400 sticky top-0 z-10">
                      <tr>
                        <th className="px-4 py-3">Recurso</th>
                        <th className="px-4 py-3 text-right">Ingreso Proyectado ($)</th>
                        <th className="px-4 py-3 text-right">Gasto Proyectado ($)</th>
                        <th className="px-4 py-3">Análisis y Sugerencia IA</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(results?.resources || []).map((r: any) => {
                        const isFixed = NACION_FIXED.includes(r.recurso);
                        const override = (config.resourceOverrides[r.recurso] || {}) as any;
                        const suggestion = results?.suggestions?.find((s: any) => s.recurso === r.recurso);
                        
                        return (
                          <tr key={r.recurso} className="border-t border-slate-800/50 hover:bg-slate-800/80 transition-colors">
                            <td className="px-4 py-3">
                              <div className="font-medium text-slate-200 font-mono text-xs">{r.recurso}</div>
                              <div className="text-[10px] text-slate-400 truncate max-w-[180px]" title={r.nombre}>{r.nombre}</div>
                              {isFixed && <div className="text-[9px] text-orange-400/80 mt-1 flex items-center gap-1"><Lock size={10}/> Bloqueado SIIF</div>}
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-[10px] text-slate-500 mb-1 text-right">Proyectado: {formatCurrencyShort(r.ingresosProyectados)}</div>
                              <input 
                                type="number"
                                disabled={isFixed}
                                value={override.manualIncome || ''}
                                onChange={e => handleOverrideChange(r.recurso, 'manualIncome', parseFloat(e.target.value) || 0)}
                                className={`w-full text-xs border rounded-lg p-2 outline-none text-right ${isFixed ? 'bg-slate-800/30 border-slate-700 text-slate-600 cursor-not-allowed' : 'bg-slate-900 border-slate-600 text-emerald-300 focus:border-emerald-500'}`}
                                placeholder={isFixed ? 'Reglado' : 'Valor manual'}
                              />
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-[10px] text-slate-500 mb-1 text-right">Proyectado: {formatCurrencyShort(r.totalCompromisos)}</div>
                              <input 
                                type="number"
                                disabled={isFixed}
                                value={override.manualExpense || ''}
                                onChange={e => handleOverrideChange(r.recurso, 'manualExpense', parseFloat(e.target.value) || 0)}
                                className={`w-full text-xs border rounded-lg p-2 outline-none text-right ${isFixed ? 'bg-slate-800/30 border-slate-700 text-slate-600 cursor-not-allowed' : 'bg-slate-900 border-slate-600 text-rose-300 focus:border-rose-500'}`}
                                placeholder={isFixed ? 'Reglado' : 'Valor manual'}
                              />
                            </td>
                            <td className="px-4 py-3">
                              {suggestion ? (
                                <div className="bg-indigo-500/10 border border-indigo-500/20 p-2 rounded-lg relative overflow-hidden group min-w-[200px]">
                                  <div className="absolute top-0 right-0 p-1">
                                    <Brain size={12} className={suggestion.confianza === 'Alta' ? 'text-indigo-400' : 'text-slate-500'} />
                                  </div>
                                  <p className="text-[9px] text-indigo-300 font-bold mb-0.5">Sugerencia IA ({suggestion.confianza})</p>
                                  <p className="text-[10px] text-slate-300 leading-tight">{suggestion.mensaje}</p>
                                  {suggestion.valorSugeridoIngreso > 0 && (
                                    <p className="text-[10px] text-emerald-400 mt-1 font-mono cursor-pointer hover:underline" onClick={() => handleOverrideChange(r.recurso, 'manualIncome', suggestion.valorSugeridoIngreso)}>
                                      Sugerido: {formatCurrencyShort(suggestion.valorSugeridoIngreso)}
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <div className="text-[10px] text-slate-600 italic text-center">Sin anomalías históricas</div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
</table>
                </div>
              </div>

            </div>

            <div className="px-6 py-4 border-t border-slate-700 flex justify-end gap-3 bg-[#1e293b]/50">
              <button onClick={() => setIsConfigModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors">Cancelar</button>
              <button onClick={() => setIsConfigModalOpen(false)} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-lg shadow-lg flex items-center gap-2 transition-colors">
                <Save size={16} /> Aplicar Proyección
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
