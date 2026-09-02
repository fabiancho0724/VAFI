import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ComposedChart, Line, PieChart, Pie, Cell 
} from 'recharts';
import { 
  Filter, AlertTriangle, Layers, Briefcase, Activity, Settings, TrendingUp, List, ChevronDown, ChevronRight
} from 'lucide-react';
import { fetchAndParseCSV } from '../lib/csvParser';
import { calculateStrictProjections, StrictConfig, StrictProjectionResult } from '../lib/strictProjections';
import { RESOURCES_LIST } from '../lib/resourceMapper';

const PIE_COLORS = ['#3b82f6', '#f97316', '#10b981', '#8b5cf6', '#ef4444', '#64748b'];

export function PredictiveScreen({ onNavigate }: { onNavigate: (s: string) => void }) {
  const [dataStage, setDataStage] = useState<'loading' | 'ready' | 'error'>('loading');
  const [balanceData, setBalanceData] = useState<any[]>([]);
  const [ingresosMensuales, setIngresosMensuales] = useState<any[]>([]);
  const [compromisos, setCompromisos] = useState<any[]>([]);
  const [nominaData, setNominaData] = useState<any[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [activeTab, setActiveTab] = useState(1);
  const [selectedResourceTrace, setSelectedResourceTrace] = useState<any>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

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
        setBalanceData(bd); setIngresosMensuales(im); setCompromisos(co); setNominaData(nd);
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
    return calculateStrictProjections(balanceData, ingresosMensuales, compromisos, nominaData, config);
  }, [dataStage, balanceData, ingresosMensuales, compromisos, nominaData, config]);

  if (dataStage === 'loading') {
    return <div className="flex items-center justify-center h-full min-h-[500px]">
      <div className="flex flex-col items-center gap-4 text-slate-400">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="font-medium animate-pulse">Analizando ejecuciones, simulando escenarios y trazabilidad...</p>
      </div>
    </div>;
  }
  if (dataStage === 'error') return <div className="p-8 text-center text-red-500">Error cargando datos: {errorMessage}</div>;
  if (!results) return null;

  const fmt = (v: number) => '$' + (v/1e6).toLocaleString('es-CO', { maximumFractionDigits: 1 }) + 'M';


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-900 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2 mb-2">
            <Layers className="w-6 h-6 text-indigo-300" />
            Motor de Proyección Financiera Institucional
          </h2>
          <p className="text-indigo-100/80 text-sm max-w-2xl">
            Simulador avanzado 4 Pestañas basado en Balance Actual y ejecuciones. Escenarios con límites estrictos, blindaje SIIF e IA predictiva.
          </p>
        </div>
      </div>

      {/* Alertas */}
      {results.alerts.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl shadow-sm space-y-2">
          <h3 className="text-red-800 font-bold flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" /> Alertas Críticas de Cumplimiento
          </h3>
          <div className="pl-7 space-y-1">
            {results.alerts.map((al, idx) => <p key={idx} className="text-red-700 text-sm">{al}</p>)}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-700 pb-2">
        {[
          {id: 1, label: 'Parámetros del Escenario', icon: Settings},
          {id: 2, label: 'Balance y Flujo de Caja', icon: Activity},
          {id: 3, label: 'Sensibilidad y Elasticidad', icon: TrendingUp},
          {id: 4, label: 'Detalle de Proyección', icon: List}
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl font-semibold transition-all ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-900/50 text-slate-400 hover:bg-slate-700'}`}>
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: PARÁMETROS */}
      {activeTab === 1 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-slate-800/60 backdrop-blur-sm p-6 rounded-2xl border border-slate-700 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Nombre Escenario</label>
                <input type="text" value={config.scenarioName} onChange={e => setConfig({...config, scenarioName: e.target.value})} className="w-full text-sm border border-slate-700 rounded-xl bg-slate-900/50 p-2.5 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Modelo Base</label>
                <select className="w-full text-sm border-slate-700 rounded-xl bg-slate-900/50 p-2.5 outline-none" value={config.scenario} onChange={e => setConfig({...config, scenario: e.target.value as any})}>
                  <option value="Base">Base</option>
                  <option value="Optimista">Optimista (+5% global)</option>
                  <option value="Pesimista">Pesimista (-5% global)</option>
                  <option value="Personalizado">Personalizado</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Crecimiento Global Ingresos</label>
                <input type="range" min="-0.5" max="0.5" step="0.01" value={config.globalGrowthRate} onChange={e => setConfig({...config, globalGrowthRate: parseFloat(e.target.value)})} className="w-full h-2 bg-slate-700 rounded-lg accent-indigo-600" disabled={config.scenario !== 'Personalizado'} />
                <div className="text-right text-xs mt-1 font-bold text-indigo-700">{(config.globalGrowthRate*100).toFixed(0)}%</div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Tasa Ejecución Gastos</label>
                <input type="range" min="0.1" max="1" step="0.05" value={config.globalExpenseRate} onChange={e => setConfig({...config, globalExpenseRate: parseFloat(e.target.value)})} className="w-full h-2 bg-slate-700 rounded-lg accent-orange-500" />
                <div className="text-right text-xs mt-1 font-bold text-orange-700">{(config.globalExpenseRate*100).toFixed(0)}%</div>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl shadow-sm border border-slate-700 overflow-hidden">
            <div className="p-5 border-b border-slate-700/50 bg-slate-900/40"><h3 className="font-bold text-slate-100 text-lg">Parámetros Manuales y Referencia IA</h3></div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-900/50 text-slate-400 font-semibold uppercase text-xs">
                  <tr>
                    <th className="px-4 py-3">Recurso</th>
                    <th className="px-4 py-3 text-right border-l border-slate-700/50">Ingreso Proy. (IA)</th>
                    <th className="px-4 py-3 text-right border-r border-slate-700/50">Gasto Proy. (IA)</th>
                    <th className="px-4 py-3 text-center bg-indigo-900/20">Ingreso Manual</th>
                    <th className="px-4 py-3 text-center bg-indigo-900/20">Gasto Manual</th>
                    <th className="px-4 py-3">Sugerencia IA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {results.resources.map((r, i) => {
                    const isSiif = r.methodUsed === 'Fijo (SIIF)';
                    const override = config.resourceOverrides[r.recurso];
                    const sugg = results.suggestions.find(s => s.recurso === r.recurso);
                    const hasManualInc = override?.manualIncome !== undefined;
                    const hasManualExp = override?.manualExpense !== undefined;
                    
                    return (
                      <tr key={i} className="hover:bg-slate-900/50">
                        <td className="px-4 py-3 font-medium text-slate-200">
                          <div className="flex flex-col">
                            <span>{r.recurso} - {r.nombre}</span>
                            {isSiif && <span className="text-[10px] text-slate-400 font-bold">Fijo (SIIF)</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right border-l border-slate-700/50 text-slate-400">{fmt(r.aiIncomeReference)}</td>
                        <td className="px-4 py-3 text-right border-r border-slate-700/50 text-slate-400">{fmt(r.aiExpenseReference)}</td>
                        <td className="px-4 py-2 bg-indigo-900/10 text-center">
                          <input 
                            type="text" 
                            placeholder={isSiif ? 'Bloqueado' : 'Valor manual'} 
                            disabled={isSiif}
                            value={hasManualInc ? override.manualIncome : ''}
                            onChange={(e) => {
                                const val = parseFloat(e.target.value.replace(/[^0-9.-]+/g, ''));
                                setConfig(prev => ({
                                  ...prev,
                                  resourceOverrides: {
                                    ...prev.resourceOverrides,
                                    [r.recurso]: {
                                      ...(prev.resourceOverrides[r.recurso] || { method: 'Manual', growthRate: prev.globalGrowthRate }),
                                      method: 'Manual',
                                      manualIncome: isNaN(val) ? undefined : val
                                    }
                                  }
                                }));
                            }}
                            className="w-32 bg-slate-900/50 border border-slate-700 rounded px-2 py-1 text-right text-indigo-300 disabled:opacity-50 outline-none focus:border-indigo-500 placeholder:text-slate-600"
                          />
                        </td>
                        <td className="px-4 py-2 bg-indigo-900/10 text-center">
                          <input 
                            type="text" 
                            placeholder={isSiif ? 'Bloqueado' : 'Valor manual'} 
                            disabled={isSiif}
                            value={hasManualExp ? override.manualExpense : ''}
                            onChange={(e) => {
                                const val = parseFloat(e.target.value.replace(/[^0-9.-]+/g, ''));
                                setConfig(prev => ({
                                  ...prev,
                                  resourceOverrides: {
                                    ...prev.resourceOverrides,
                                    [r.recurso]: {
                                      ...(prev.resourceOverrides[r.recurso] || { method: 'Manual', growthRate: prev.globalGrowthRate }),
                                      method: 'Manual',
                                      manualExpense: isNaN(val) ? undefined : val
                                    }
                                  }
                                }));
                            }}
                            className="w-32 bg-slate-900/50 border border-slate-700 rounded px-2 py-1 text-right text-orange-300 disabled:opacity-50 outline-none focus:border-orange-500 placeholder:text-slate-600"
                          />
                        </td>
                        <td className="px-4 py-2">
                          {sugg ? (
                            <div className="flex flex-col gap-1">
                              <span className="text-[11px] text-slate-400 leading-tight" title={sugg.mensaje}>{sugg.mensaje}</span>
                              <span className="text-[11px] text-indigo-300 font-bold">Sugerido: {fmt(sugg.valorSugeridoIngreso)}</span>
                              <button onClick={() => {
                                setConfig(prev => ({
                                  ...prev,
                                  resourceOverrides: {
                                    ...prev.resourceOverrides,
                                    [r.recurso]: {
                                      ...(prev.resourceOverrides[r.recurso] || { method: 'Manual', growthRate: prev.globalGrowthRate }),
                                      method: 'Manual',
                                      manualIncome: sugg.valorSugeridoIngreso,
                                      manualExpense: undefined // Let engine auto-calculate expense based on new income
                                    }
                                  }
                                }));
                              }} className="px-2 py-1 bg-indigo-500/20 text-indigo-400 text-[10px] font-bold rounded hover:bg-indigo-500/40 w-max">
                                Aplicar {(sugg.tasaSugerida*100).toFixed(0)}%
                              </button>
                            </div>
                          ) : <span className="text-slate-500 text-xs">N/A</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BALANCE Y FLUJO */}
      {activeTab === 2 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl p-6 border border-slate-700 shadow-sm"><p className="text-xs text-slate-400 font-semibold mb-2 uppercase">Total Aforo</p><p className="text-3xl font-black text-slate-100">{fmt(results.totals.totalAforo)}</p></div>
            <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl p-6 border border-slate-700 shadow-sm"><p className="text-xs text-slate-400 font-semibold mb-2 uppercase">Total Recaudo (Real + Proy)</p><p className="text-3xl font-black text-blue-500">{fmt(results.totals.totalRecaudo + results.totals.totalIngresosProyectados)}</p></div>
            <div className="bg-indigo-600 rounded-2xl p-6 text-white shadow-md"><p className="text-xs text-indigo-200 font-semibold mb-2 uppercase">Total Comprometido</p><p className="text-3xl font-black text-white">{fmt(results.totals.totalCompromisos)}</p></div>
            <div className="bg-emerald-500 rounded-2xl p-6 text-white shadow-md"><p className="text-xs text-emerald-100 font-semibold mb-2 uppercase">Total Pagado</p><p className="text-3xl font-black text-white">{fmt(results.totals.totalPagos)}</p></div>
          </div>
          
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
             <div className="bg-slate-800/60 backdrop-blur-sm p-6 rounded-2xl border border-slate-700 shadow-sm">
                <h3 className="text-base font-bold text-slate-100 mb-6">Flujo de Caja Mensual</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={results.flow} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                      <XAxis dataKey="month" fontSize={12} stroke="#94a3b8" axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={(val) => `$${val/1000}k`} fontSize={12} stroke="#94a3b8" axisLine={false} tickLine={false} />
                      <Tooltip formatter={(val: number) => fmt(val*1e6)} contentStyle={{ backgroundColor: '#1e293b', border: 'none', color: '#f8fafc', borderRadius: '8px' }} />
                      <Legend wrapperStyle={{ paddingTop: '20px' }} />
                      <Bar dataKey="ingresosReales" name="Ingreso Real" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="ingresosProyectados" name="Ingreso Proy." stackId="a" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      <Line type="monotone" dataKey="pagos" name="Pagos Totales" stroke="#f43f5e" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
             </div>
             
             <div className="bg-slate-800/60 backdrop-blur-sm p-6 rounded-2xl border border-slate-700 shadow-sm overflow-hidden flex flex-col">
                <h3 className="text-base font-bold text-slate-100 mb-6">Análisis de Gastos por Recurso</h3>
                <div className="flex-1 overflow-y-auto pr-2">
                  <div className="space-y-3">
                    {results.totals.expenseBreakdown.map((b, idx) => (
                      <div key={idx} className="border border-slate-700 rounded-xl overflow-hidden bg-slate-900/40">
                        <div 
                          className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-800/80 transition-colors"
                          onClick={() => setExpandedRow(expandedRow === b.tipo ? null : b.tipo)}
                        >
                          <div className="flex items-center gap-3">
                            {expandedRow === b.tipo ? <ChevronDown className="w-5 h-5 text-indigo-400"/> : <ChevronRight className="w-5 h-5 text-slate-400"/>}
                            <span className="font-bold text-slate-200">{b.tipo}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-black text-slate-100">{fmt(b.total)}</span>
                          </div>
                        </div>
                        {expandedRow === b.tipo && b.detalles && (
                          <div className="bg-slate-900/80 p-4 border-t border-slate-700/50">
                            <table className="w-full text-sm text-left">
                              <thead className="text-xs text-slate-400 uppercase border-b border-slate-700/50">
                                <tr><th className="pb-2 font-semibold">Recurso</th><th className="pb-2 text-right font-semibold">Gasto Real</th><th className="pb-2 text-right font-semibold">Proyectado</th><th className="pb-2 text-right font-semibold">Total</th></tr>
                              </thead>
                              <tbody className="divide-y divide-slate-700/50">
                                {b.detalles.map((d: any, dIdx: number) => (
                                  <tr key={dIdx} className="hover:bg-slate-800/50">
                                    <td className="py-2 font-medium text-slate-300">{d.recurso} - {d.nombre}</td>
                                    <td className="py-2 text-right text-slate-400">{fmt(d.valorReal)}</td>
                                    <td className="py-2 text-right text-indigo-400">{fmt(d.valorProyectado)}</td>
                                    <td className="py-2 text-right font-bold text-slate-200">{fmt(d.total)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* TAB 3: SENSIBILIDAD */}
      {activeTab === 3 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-slate-800/60 backdrop-blur-sm rounded-2xl shadow-sm border border-slate-700 overflow-hidden">
              <div className="p-5 border-b border-slate-700/50 bg-slate-900/40"><h3 className="font-bold text-slate-100 text-lg">Matriz de Sensibilidad de Ingresos (Heatmap)</h3></div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-900/50 text-slate-400 font-semibold uppercase text-xs">
                    <tr><th className="px-6 py-4">Variación Ingreso</th><th className="px-6 py-4 text-right">Ingresos Proyectados</th><th className="px-6 py-4 text-right">Saldo Disponible</th><th className="px-6 py-4 text-center">Impacto</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {results.sensitivity.map((s, i) => (
                      <tr key={i} className={s.variationNum === 0 ? 'bg-indigo-900/20 font-bold' : 'hover:bg-slate-900/50'}>
                        <td className="px-6 py-4 font-medium text-slate-200">{s.variationStr} {s.variationNum === 0 ? '(Base)' : ''}</td>
                        <td className="px-6 py-4 text-right">{fmt(s.ingresos)}</td>
                        <td className="px-6 py-4 text-right">{fmt(s.saldo)}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${s.impacto === 'Favorable' ? 'bg-emerald-100 text-emerald-700' : s.impacto === 'Alto Riesgo' ? 'bg-red-100 text-red-700' : s.impacto === 'Medio Riesgo' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>{s.impacto}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl shadow-sm border border-slate-700 overflow-hidden p-6">
              <h3 className="font-bold text-slate-100 text-lg mb-4">Elasticidad & Ranking de Riesgo</h3>
              <p className="text-sm text-slate-400 mb-6">Mide cómo impacta porcentualmente un cambio en los ingresos sobre el saldo disponible institucional.</p>
              <div className="space-y-4">
                {results.elasticityRanking.map((e, i) => (
                  <div key={i} className="flex flex-col gap-1 p-4 bg-slate-900/50 rounded-xl border border-slate-700/50">
                    <span className="text-sm font-semibold text-slate-200">{e.variable}</span>
                    <div className="flex justify-between items-end">
                      <span className="text-xs text-slate-400">Coeficiente de Elasticidad:</span>
                      <span className={`text-xl font-black ${e.elasticity > 1 ? 'text-red-600' : 'text-emerald-600'}`}>{e.elasticity.toFixed(2)}x</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: DETALLE DE PROYECCIÓN */}
      {activeTab === 4 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl shadow-sm border border-slate-700 overflow-hidden">
            <div className="p-5 border-b border-slate-700/50 bg-slate-900/40">
              <h3 className="font-bold text-slate-100 text-lg">Trazabilidad por Recurso</h3>
              <p className="text-xs text-slate-400">Haz clic en cualquier recurso para ver el método utilizado y el paso a paso matemático de su proyección.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-900/50 text-slate-400 font-semibold uppercase text-xs">
                  <tr><th className="px-6 py-4">Recurso</th><th className="px-6 py-4 text-right">Ingreso Proy.</th><th className="px-6 py-4 text-right">Total Ingreso</th><th className="px-6 py-4 text-right">Total Compromiso</th><th className="px-6 py-4 text-right">Saldo Final</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {results.resources.map((r, i) => (
                    <tr key={i} className="hover:bg-indigo-900/400/20 cursor-pointer transition-colors" onClick={() => setSelectedResourceTrace(r)}>
                      <td className="px-6 py-4 font-bold text-slate-200">{r.recurso} - {r.nombre}</td>
                      <td className="px-6 py-4 text-right text-indigo-500">{fmt(r.ingresosProyectados)}</td>
                      <td className="px-6 py-4 text-right font-bold text-slate-100">{fmt(r.totalIngresos)}</td>
                      <td className="px-6 py-4 text-right font-medium text-orange-500">{fmt(r.totalCompromisos)}</td>
                      <td className={`px-6 py-4 text-right font-black ${r.saldoDisponible < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{fmt(r.saldoDisponible)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {selectedResourceTrace && (
             <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedResourceTrace(null)}>
               <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                 <div className="p-6 border-b border-slate-700/50 flex justify-between items-center sticky top-0 bg-slate-800/60 backdrop-blur-sm">
                   <h3 className="text-xl font-bold text-slate-100">Trazabilidad Matemática: {selectedResourceTrace.recurso}</h3>
                   <button onClick={() => setSelectedResourceTrace(null)} className="text-slate-400 hover:text-slate-300">&times;</button>
                 </div>
                 <div className="p-6">
                   <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Secuencia de Cálculo Aplicada</h4>
                   <div className="space-y-4">
                     {selectedResourceTrace.trace.map((t: any, i: number) => (
                       <div key={i} className="flex items-start gap-4 p-4 rounded-xl bg-slate-900/50 border border-slate-700/50">
                         <div className="bg-indigo-100 text-indigo-600 font-bold rounded-full w-8 h-8 flex items-center justify-center shrink-0">{i+1}</div>
                         <div>
                           <p className="font-bold text-slate-100">{t.step}</p>
                           <p className="text-lg text-indigo-600 font-semibold">{typeof t.value === 'number' ? fmt(t.value) : t.value}</p>
                           <p className="text-sm text-slate-400">{t.detail}</p>
                         </div>
                       </div>
                     ))}
                   </div>
                 </div>
               </div>
             </div>
          )}
        </div>
      )}
      
    </div>
  );
}
