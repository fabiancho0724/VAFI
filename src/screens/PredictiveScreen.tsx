import React, { useState, useEffect, useMemo } from 'react';
import { 
  ResponsiveContainer, ComposedChart, AreaChart, Area, Line, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip as RechartsTooltip, Legend, Cell, Sankey, Treemap,
  BarChart, PieChart, Pie
} from 'recharts';
import { 
  ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown, Wallet, 
  AlertCircle, AlertTriangle, CheckCircle, Info, Calendar, Filter, 
  ChevronDown, ChevronRight, Download, Maximize2, Coins, Activity, Target,
  Layers, Settings, List
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

export function PredictiveScreen({ onNavigate }: { onNavigate: (s: string) => void }) {
  const [dataStage, setDataStage] = useState<'loading' | 'ready' | 'error'>('loading');
  const [balanceData, setBalanceData] = useState<any[]>([]);
  const [ingresosMensuales, setIngresosMensuales] = useState<any[]>([]);
  const [compromisos, setCompromisos] = useState<any[]>([]);
  const [nominaData, setNominaData] = useState<any[]>([]);
  const [ingresosHistoricos, setIngresosHistoricos] = useState<any[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);

  const [config, setConfig] = useState<StrictConfig>({
    scenarioName: 'Proyección Anual',
    scenario: 'Base',
    globalGrowthRate: 0.05,
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
        setBalanceData(bd); setIngresosMensuales(im); setCompromisos(co); setNominaData(nd); setIngresosHistoricos(hist);
        setDataStage('ready');
      } catch (e: any) {
        setErrorMessage(e.message);
        setDataStage('error');
      }
    }
    loadData();
  }, []);

  const results: StrictProjectionResult | null = useMemo(() => {
    if (dataStage !== 'ready' || balanceData.length === 0) return null;
    return calculateStrictProjections(balanceData, ingresosMensuales, compromisos, nominaData, ingresosHistoricos, config);
  }, [dataStage, balanceData, ingresosMensuales, compromisos, nominaData, ingresosHistoricos, config]);

  if (dataStage === 'loading') {
    return <div className="flex items-center justify-center h-full min-h-[500px]">
      <div className="flex flex-col items-center gap-4 text-slate-400">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="font-medium animate-pulse">Analizando ejecuciones y simulando escenarios...</p>
      </div>
    </div>;
  }
  if (dataStage === 'error') return <div className="p-8 text-center text-red-500">Error cargando datos: {errorMessage}</div>;
  if (!results) return null;

  const monthlyData = results.flow.map(f => {
    const incomeTotal = f.ingresosProyectados + f.ingresosReales;
    return {
      month: f.month,
      income: incomeTotal,
      expense: f.compromisos,
      netFlow: incomeTotal - f.compromisos,
      initialBalance: f.saldoInicial,
      finalBalance: f.saldoFinal,
      gPersonal: f.compromisos * 0.65, 
      gFuncionamiento: f.compromisos * 0.25,
      gInversion: f.compromisos * 0.10,
      rNacion: incomeTotal * 0.70,
      rPropios: incomeTotal * 0.30,
    };
  });

  const totalIncome = results.totals.totalIngresosProyectados + results.totals.totalRecaudo;
  const totalExpense = results.totals.totalCompromisos;
  const netFlowTotal = totalIncome - totalExpense;
  const initialBalance = results.totals.totalRecursosIniciales;
  const finalBalance = results.totals.saldoDisponible;

  return (
    <div className="min-h-screen bg-surface text-on-surface p-4 md:p-8 font-sans pb-24">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-display text-white flex items-center gap-3">
            <Activity className="text-emerald-400" />
            Motor de Proyección Financiera Institucional
          </h1>
          <p className="text-on-surface-variant mt-1">Financial Command Center - Análisis, Simulación y Control de Liquidez</p>
        </div>
      </div>

      {/* APARTADO DE CONFIGURACIÓN */}
      <div className="mb-8">
        <div className="bg-[#1e293b]/80 backdrop-blur-sm p-6 rounded-2xl border border-white/10 shadow-lg">
          <h2 className="text-xl font-display text-white mb-6 flex items-center gap-2"><Settings size={20} className="text-emerald-400"/> Parámetros y Restricciones del Escenario</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Nombre Escenario</label>
              <input type="text" value={config.scenarioName} onChange={e => setConfig({...config, scenarioName: e.target.value})} className="w-full text-sm border border-slate-700 rounded-xl bg-slate-900/50 p-2.5 outline-none text-white focus:border-emerald-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Modelo Base</label>
              <select className="w-full text-sm border-slate-700 rounded-xl bg-slate-900/50 p-2.5 outline-none text-white focus:border-emerald-500 cursor-pointer" value={config.scenario} onChange={e => setConfig({...config, scenario: e.target.value as any})}>
                <option value="Base">Base Estricta (IPC)</option>
                <option value="Optimista">Optimista (+5% global)</option>
                <option value="Pesimista">Pesimista (-5% global)</option>
                <option value="Personalizado">Personalizado</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Filtro Unidad</label>
              <select className="w-full text-sm border-slate-700 rounded-xl bg-slate-900/50 p-2.5 outline-none text-white focus:border-emerald-500 cursor-pointer" value={config.filterUnidad} onChange={e => setConfig({...config, filterUnidad: e.target.value})}>
                <option value="Todos">Todas las Unidades</option>
                <option value="Sede Central">Sede Central</option>
                <option value="Facultad Seccional Duitama">Facultad Seccional Duitama</option>
                <option value="Facultad Seccional Sogamoso">Facultad Seccional Sogamoso</option>
                <option value="Facultad Seccional Chiquinquirá">Facultad Seccional Chiquinquirá</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Crecimiento Global (%)</label>
              <input type="number" step="0.01" value={config.globalGrowthRate} onChange={e => setConfig({...config, globalGrowthRate: parseFloat(e.target.value)})} className="w-full text-sm border border-slate-700 rounded-xl bg-slate-900/50 p-2.5 outline-none text-white focus:border-emerald-500" disabled={config.scenario !== 'Personalizado'} />
            </div>
          </div>
        </div>
      </div>

      {/* Alertas */}
      {results.alerts.length > 0 && (
        <div className="mb-8 bg-red-500/10 border border-red-500/20 rounded-xl p-4 shadow-sm space-y-2">
          <h3 className="text-red-400 font-bold flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" /> Alertas Críticas de Cumplimiento
          </h3>
          <div className="pl-7 space-y-1">
            {results.alerts.map((al, idx) => <p key={idx} className="text-red-200/80 text-sm">{al}</p>)}
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="glass-card p-5 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all"></div>
          <p className="text-sm text-on-surface-variant mb-1 flex items-center gap-2">
            <TrendingUp size={16} className="text-emerald-400" /> Ingresos Proyectados
          </p>
          <p className="text-3xl font-display text-white">{formatCurrencyShort(totalIncome)}</p>
        </div>
        <div className="glass-card p-5 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-red-500/10 rounded-full blur-2xl group-hover:bg-red-500/20 transition-all"></div>
          <p className="text-sm text-on-surface-variant mb-1 flex items-center gap-2">
            <TrendingDown size={16} className="text-red-400" /> Gastos Proyectados
          </p>
          <p className="text-3xl font-display text-white">{formatCurrencyShort(totalExpense)}</p>
        </div>
        <div className="glass-card p-5 rounded-2xl relative overflow-hidden group">
          <div className={`absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full blur-2xl transition-all ${netFlowTotal >= 0 ? 'bg-blue-500/10 group-hover:bg-blue-500/20' : 'bg-orange-500/10 group-hover:bg-orange-500/20'}`}></div>
          <p className="text-sm text-on-surface-variant mb-1 flex items-center gap-2">
            <Activity size={16} className={netFlowTotal >= 0 ? "text-blue-400" : "text-orange-400"} /> Flujo Neto Proyectado
          </p>
          <p className={`text-3xl font-display ${netFlowTotal >= 0 ? 'text-blue-400' : 'text-orange-400'}`}>
            {formatCurrencyShort(netFlowTotal)}
          </p>
        </div>
        <div className="glass-card p-5 rounded-2xl relative overflow-hidden group border border-primary-container/20">
          <div className="absolute inset-0 bg-gradient-to-br from-primary-container/5 to-transparent"></div>
          <p className="text-sm text-on-surface-variant mb-1 flex items-center gap-2 relative z-10">
            <Wallet size={16} className="text-primary-container" /> Saldo Final Estimado
          </p>
          <p className="text-3xl font-display text-white relative z-10">{formatCurrencyShort(finalBalance)}</p>
        </div>
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
        <div className="glass-card p-6 rounded-[24px] xl:col-span-2 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-display text-white">Dinámica de Caja: Ingresos vs Gastos vs Flujo</h2>
            </div>
          </div>
          <div className="h-[350px] w-full mt-auto">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={monthlyData} margin={{ top: 20, right: 20, left: 20, bottom: 0 }}>
                <defs>
                  <linearGradient id="netFlowGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="month" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis yAxisId="left" stroke="#94a3b8" tickFormatter={(val) => formatCurrencyShort(val)} />
                <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" tickFormatter={(val) => formatCurrencyShort(val)} />
                <RechartsTooltip formatter={(val: number) => formatCurrency(val)} contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px' }} />
                <Legend />
                <Area yAxisId="right" type="monotone" dataKey="netFlow" name="Flujo Neto" fill="url(#netFlowGrad)" stroke="#38bdf8" strokeWidth={2} />
                <Line yAxisId="left" type="monotone" dataKey="income" name="Ingresos" stroke="#10b981" strokeWidth={3} />
                <Line yAxisId="left" type="monotone" dataKey="expense" name="Gastos" stroke="#f43f5e" strokeWidth={3} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="glass-card p-6 rounded-[24px] flex flex-col">
          <div className="mb-6"><h2 className="text-xl font-display text-white">Evolución de Saldo</h2></div>
          <div className="h-[300px] w-full mt-auto">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="month" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis stroke="#94a3b8" tickFormatter={(val) => formatCurrencyShort(val)} domain={['auto', 'auto']} />
                <RechartsTooltip formatter={(val: number) => formatCurrency(val)} contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px' }} />
                <Area type="monotone" dataKey="finalBalance" name="Saldo Acumulado" stroke="#f59e0b" strokeWidth={3} fill="url(#balanceGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* HEATMAP / TABLE */}
      <div className="glass-card p-6 rounded-[24px] overflow-hidden flex flex-col mt-8">
        <div className="mb-6"><h2 className="text-xl font-display text-white">Balance Mensual y Detalle Operativo</h2></div>
        <div className="w-full overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-on-surface-variant bg-white/5">
                <th className="py-3 px-4 font-medium w-10"></th>
                <th className="py-3 px-4 font-medium">Mes</th>
                <th className="py-3 px-4 font-medium text-right">Personal</th>
                <th className="py-3 px-4 font-medium text-right">Funcionamiento</th>
                <th className="py-3 px-4 font-medium text-right">Inversión</th>
                <th className="py-3 px-4 font-medium text-right text-red-300">Total Gastos</th>
                <th className="py-3 px-4 font-medium text-right text-emerald-300">Total Ingresos</th>
                <th className="py-3 px-4 font-medium text-right text-blue-300">Flujo Neto</th>
              </tr>
            </thead>
            <tbody>
              {monthlyData.map((row, idx) => (
                <React.Fragment key={idx}>
                  <tr className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer" onClick={() => setExpandedMonth(expandedMonth === row.month ? null : row.month)}>
                    <td className="py-3 px-4 text-center text-on-surface-variant">
                      {expandedMonth === row.month ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </td>
                    <td className="py-3 px-4 font-bold text-white">{row.month}</td>
                    <td className="py-3 px-4 text-right text-on-surface-variant">{formatCurrencyShort(row.gPersonal)}</td>
                    <td className="py-3 px-4 text-right text-on-surface-variant">{formatCurrencyShort(row.gFuncionamiento)}</td>
                    <td className="py-3 px-4 text-right text-on-surface-variant">{formatCurrencyShort(row.gInversion)}</td>
                    <td className="py-3 px-4 text-right text-red-300 font-medium">{formatCurrencyShort(row.expense)}</td>
                    <td className="py-3 px-4 text-right text-emerald-300 font-medium">{formatCurrencyShort(row.income)}</td>
                    <td className={`py-3 px-4 text-right font-bold ${row.netFlow >= 0 ? 'text-blue-400' : 'text-orange-400'}`}>
                      {formatCurrencyShort(row.netFlow)}
                    </td>
                  </tr>
                  {expandedMonth === row.month && (
                    <tr className="bg-black/20 border-b border-primary-container/20">
                      <td colSpan={8} className="p-0">
                        <div className="p-4 pl-14">
                          <h4 className="text-xs uppercase tracking-widest text-primary-container mb-3 font-bold flex items-center gap-2">
                            <Target size={14} /> Desagregación por Recursos - {row.month}
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-sm text-emerald-200">Aporte Nación (R10)</span>
                                <span className="text-sm font-bold text-white">{formatCurrencyShort(row.rNacion)}</span>
                              </div>
                              <div className="w-full bg-surface-container h-1.5 rounded-full overflow-hidden">
                                <div className="bg-emerald-400 h-full" style={{ width: `${(row.rNacion / (row.income || 1)) * 100}%` }}></div>
                              </div>
                            </div>
                            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-sm text-blue-200">Recursos Propios (R20/R31)</span>
                                <span className="text-sm font-bold text-white">{formatCurrencyShort(row.rPropios)}</span>
                              </div>
                              <div className="w-full bg-surface-container h-1.5 rounded-full overflow-hidden">
                                <div className="bg-blue-400 h-full" style={{ width: `${(row.rPropios / (row.income || 1)) * 100}%` }}></div>
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
    </div>
  );
}
