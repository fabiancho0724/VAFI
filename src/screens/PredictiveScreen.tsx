import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ComposedChart, Line 
} from 'recharts';
import { 
  Filter, AlertTriangle, Layers
} from 'lucide-react';
import { fetchAndParseCSV } from '../lib/csvParser';
import { calculateStrictProjections, StrictConfig, StrictProjectionResult } from '../lib/strictProjections';
import { RESOURCES_LIST } from '../lib/resourceMapper';

export function PredictiveScreen({ onNavigate }: { onNavigate: (s: string) => void }) {
  const [dataStage, setDataStage] = useState<'loading' | 'ready' | 'error'>('loading');
  const [balanceData, setBalanceData] = useState<any[]>([]);
  const [ingresosMensuales, setIngresosMensuales] = useState<any[]>([]);
  const [compromisos, setCompromisos] = useState<any[]>([]);
  const [errorMessage, setErrorMessage] = useState('');

  // Strict config state
  const [config, setConfig] = useState<StrictConfig>({
    growthRate: 0.05,
    expenseRate: 0.8,
    scenario: 'Base',
    filterRecurso: 'Todos',
    filterUnidad: 'Todos'
  });

  useEffect(() => {
    async function loadData() {
      try {
        const bd = await fetchAndParseCSV('/data/balance.csv');
        const im = await fetchAndParseCSV('/data/ingresos_mensuales.csv');
        const co = await fetchAndParseCSV('/data/compromisos.csv');
        setBalanceData(bd);
        setIngresosMensuales(im);
        setCompromisos(co);
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
    return calculateStrictProjections(balanceData, ingresosMensuales, compromisos, config);
  }, [dataStage, balanceData, ingresosMensuales, compromisos, config]);

  if (dataStage === 'loading') {
    return <div className="flex items-center justify-center h-full min-h-[500px]">
      <div className="flex flex-col items-center gap-4 text-slate-500">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="font-medium animate-pulse">Analizando ejecuciones mensuales e históricos...</p>
      </div>
    </div>;
  }
  if (dataStage === 'error') {
    return <div className="p-8 text-center text-red-500">Error cargando datos: {errorMessage}</div>;
  }
  if (!results) return null;

  const fmt = (v: number) => '$' + (v/1e6).toLocaleString('es-CO', { maximumFractionDigits: 1 }) + 'M';

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-900 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2 mb-2">
            <Layers className="w-6 h-6 text-indigo-300" />
            Proyección Financiera y Motor de Escenarios
          </h2>
          <p className="text-indigo-100/80 text-sm max-w-2xl">
            Modelo estricto basado en Balance Actual y ejecuciones mensuales. Evalúa escenarios controlando límites de recaudo, ingresos inflexibles de SIIF y flujo de caja histórico.
          </p>
        </div>
      </div>

      {/* Alertas Inteligentes */}
      {results.alerts.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl shadow-sm space-y-2">
          <h3 className="text-red-800 font-bold flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" /> Alertas Críticas (Regla Financiera Incumplida)
          </h3>
          <div className="pl-7 space-y-1">
            {results.alerts.map((al, idx) => (
              <p key={idx} className="text-red-700 text-sm">{al}</p>
            ))}
          </div>
        </div>
      )}

      {/* Configuración y Filtros */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-indigo-500" />
            <h3 className="text-lg font-semibold text-slate-800">Parámetros del Escenario</h3>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Escenario</label>
            <select 
              className="w-full text-sm border-slate-200 rounded-xl bg-slate-50 text-slate-800 p-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
              value={config.scenario}
              onChange={e => setConfig({...config, scenario: e.target.value as any})}
            >
              <option value="Base">Base</option>
              <option value="Optimista">Optimista (+ Crecimiento)</option>
              <option value="Pesimista">Pesimista (- Crecimiento)</option>
              <option value="Personalizado">Personalizado</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Recurso</label>
            <select 
              className="w-full text-sm border-slate-200 rounded-xl bg-slate-50 text-slate-800 p-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
              value={config.filterRecurso}
              onChange={e => setConfig({...config, filterRecurso: e.target.value})}
            >
              <option value="Todos">Todos los Recursos</option>
              {RESOURCES_LIST.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Crecimiento Ingresos</label>
            <div className="flex items-center gap-3">
              <input type="range" min="-0.5" max="0.5" step="0.01" 
                     value={config.growthRate} 
                     onChange={e => setConfig({...config, growthRate: parseFloat(e.target.value)})}
                     className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" disabled={config.scenario !== 'Personalizado'} />
              <span className="text-sm font-bold w-12 text-right text-indigo-700 bg-indigo-50 px-2 py-1 rounded-md">{(config.growthRate*100).toFixed(0)}%</span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Ejecución Gasto Restante</label>
            <div className="flex items-center gap-3">
              <input type="range" min="0.1" max="1" step="0.05" 
                     value={config.expenseRate} 
                     onChange={e => setConfig({...config, expenseRate: parseFloat(e.target.value)})}
                     className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-orange-500" />
              <span className="text-sm font-bold w-12 text-right text-orange-700 bg-orange-50 px-2 py-1 rounded-md">{(config.expenseRate*100).toFixed(0)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Balance Financiero Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-slate-100 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500"></div>
          <p className="text-xs text-slate-500 font-semibold mb-2 uppercase tracking-wider">Total Aforo (Anual)</p>
          <p className="text-3xl font-black text-slate-800">{fmt(results.totals.totalAforo)}</p>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-blue-50 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500"></div>
          <p className="text-xs text-slate-500 font-semibold mb-2 uppercase tracking-wider">Total Recaudo 31/08</p>
          <p className="text-3xl font-black text-blue-600">{fmt(results.totals.totalRecaudo)}</p>
        </div>
        <div className="bg-indigo-600 rounded-2xl p-6 text-white shadow-md relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-indigo-500 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500"></div>
          <p className="text-xs text-indigo-200 font-semibold mb-2 uppercase tracking-wider">Ingresos Proyectados (Sep-Dic)</p>
          <p className="text-3xl font-black text-white">{fmt(results.totals.totalIngresosProyectados)}</p>
        </div>
        <div className="bg-emerald-500 rounded-2xl p-6 text-white shadow-md relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-emerald-400 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500"></div>
          <p className="text-xs text-emerald-100 font-semibold mb-2 uppercase tracking-wider">Saldo Caja Proyectado</p>
          <p className="text-3xl font-black text-white">{fmt(results.totals.saldoDisponible)}</p>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
         <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-base font-bold text-slate-800 mb-6">Flujo de Caja Mensual (Ingresos vs Pagos)</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={results.flow} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" fontSize={12} stroke="#94a3b8" axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(val) => `$${val/1000}k`} fontSize={12} stroke="#94a3b8" axisLine={false} tickLine={false} />
                  <Tooltip 
                    formatter={(val: number) => fmt(val*1e6)} 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar dataKey="ingresosReales" name="Ingreso Real" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="ingresosProyectados" name="Ingreso Proyectado" stackId="a" fill="#c7d2fe" radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey="pagos" name="Pagos Efectivos" stroke="#f43f5e" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
         </div>
         
         <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-base font-bold text-slate-800 mb-6">Evolución Saldo de Caja Acumulado</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={results.flow} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" fontSize={12} stroke="#94a3b8" axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(val) => `$${val/1000}k`} fontSize={12} stroke="#94a3b8" axisLine={false} tickLine={false} />
                  <Tooltip 
                    formatter={(val: number) => fmt(val*1e6)} 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area type="monotone" dataKey="saldoFinal" name="Saldo Acumulado" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorSaldo)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
         </div>
      </div>

      {/* Tabla Detallada por Recurso */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="font-bold text-slate-800 text-lg">Trazabilidad por Recurso</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-xs">
              <tr>
                <th className="px-6 py-4">Recurso</th>
                <th className="px-6 py-4 text-right">Recaudo Real</th>
                <th className="px-6 py-4 text-right">Ingreso Proy.</th>
                <th className="px-6 py-4 text-right">Total Ingreso</th>
                <th className="px-6 py-4 text-right">Total Compromiso</th>
                <th className="px-6 py-4 text-right">Total Pago</th>
                <th className="px-6 py-4 text-right">Saldo Final</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {results.resources.map((r, i) => (
                <tr key={i} className="hover:bg-indigo-50/30 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-bold text-slate-700">{r.recurso}</span>
                    <span className="text-slate-500 ml-2 hidden md:inline">- {r.nombre}</span>
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-slate-600">{fmt(r.ingresosReales)}</td>
                  <td className="px-6 py-4 text-right font-medium text-indigo-500">{fmt(r.ingresosProyectados)}</td>
                  <td className="px-6 py-4 text-right font-bold text-slate-800 bg-slate-50/50">{fmt(r.totalIngresos)}</td>
                  <td className="px-6 py-4 text-right font-medium text-orange-500">{fmt(r.totalCompromisos)}</td>
                  <td className="px-6 py-4 text-right font-medium text-rose-500">{fmt(r.totalPagos)}</td>
                  <td className={`px-6 py-4 text-right font-black ${r.saldoDisponible < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {fmt(r.saldoDisponible)}
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-800 font-bold text-white">
                <td className="px-6 py-5 rounded-bl-xl">TOTALES</td>
                <td className="px-6 py-5 text-right">{fmt(results.totals.totalRecaudo)}</td>
                <td className="px-6 py-5 text-right text-indigo-300">{fmt(results.totals.totalIngresosProyectados)}</td>
                <td className="px-6 py-5 text-right">{fmt(results.totals.totalRecaudo + results.totals.totalIngresosProyectados)}</td>
                <td className="px-6 py-5 text-right text-orange-300">{fmt(results.totals.totalCompromisos)}</td>
                <td className="px-6 py-5 text-right text-rose-300">{fmt(results.totals.totalPagos)}</td>
                <td className={`px-6 py-5 text-right rounded-br-xl ${results.totals.saldoDisponible < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {fmt(results.totals.saldoDisponible)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      
    </div>
  );
}
