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
  const [gastosHist, setGastosHist] = useState<any[]>([]);
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
        const gh = await fetchAndParseCSV('/data/Gastos.csv');
        setBalanceData(bd);
        setGastosHist(gh);
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
    return calculateStrictProjections(balanceData, gastosHist, config);
  }, [dataStage, balanceData, gastosHist, config]);

  if (dataStage === 'loading') {
    return <div className="p-8 text-center text-gray-500">Analizando modelos financieros...</div>;
  }
  if (dataStage === 'error') {
    return <div className="p-8 text-center text-red-500">Error cargando datos: {errorMessage}</div>;
  }
  if (!results) return null;

  const fmt = (v: number) => '$' + (v/1e6).toLocaleString('es-CO', { maximumFractionDigits: 1 }) + 'M';

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Layers className="w-6 h-6 text-indigo-600" />
            Proyección Financiera y Motor de Escenarios
          </h2>
          <p className="text-sm text-slate-500">
            Modelo estricto basado en Balance Actual (Caja vs Recurso). Ingresos SIIF inflexibles.
          </p>
        </div>
      </div>

      {/* Alertas Inteligentes */}
      {results.alerts.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg shadow-sm space-y-2">
          <h3 className="text-red-800 font-bold flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" /> Alertas Críticas (Regla Financiera Incumplida)
          </h3>
          {results.alerts.map((al, idx) => (
             <p key={idx} className="text-red-700 text-sm">{al}</p>
          ))}
        </div>
      )}

      {/* Configuración y Filtros */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-slate-500" />
          <h3 className="text-lg font-semibold text-slate-700">Configuración de Proyección</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Escenario</label>
            <select 
              className="w-full text-sm border-slate-200 rounded-md bg-slate-50 text-slate-800 p-2"
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
            <label className="block text-xs font-semibold text-slate-500 mb-1">Recurso</label>
            <select 
              className="w-full text-sm border-slate-200 rounded-md bg-slate-50 text-slate-800 p-2"
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
            <label className="block text-xs font-semibold text-slate-500 mb-1">Crecimiento Ingresos (Proyectables)</label>
            <div className="flex items-center gap-2">
              <input type="range" min="-0.5" max="0.5" step="0.01" 
                     value={config.growthRate} 
                     onChange={e => setConfig({...config, growthRate: parseFloat(e.target.value)})}
                     className="w-full" disabled={config.scenario !== 'Personalizado'} />
              <span className="text-sm font-bold w-12 text-right">{(config.growthRate*100).toFixed(0)}%</span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Tasa Ejecución Gasto (Restante)</label>
            <div className="flex items-center gap-2">
              <input type="range" min="0.1" max="1" step="0.05" 
                     value={config.expenseRate} 
                     onChange={e => setConfig({...config, expenseRate: parseFloat(e.target.value)})}
                     className="w-full" />
              <span className="text-sm font-bold w-12 text-right">{(config.expenseRate*100).toFixed(0)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Balance Financiero Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
          <p className="text-xs text-slate-500 font-semibold mb-1">Total Aforo (Real)</p>
          <p className="text-xl font-bold text-slate-800">{fmt(results.totals.totalAforo)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
          <p className="text-xs text-slate-500 font-semibold mb-1">Total Recaudo 31/08 (Real)</p>
          <p className="text-xl font-bold text-slate-800">{fmt(results.totals.totalRecaudo)}</p>
        </div>
        <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100 shadow-sm">
          <p className="text-xs text-indigo-600 font-semibold mb-1">Ingresos Proyectados (Sep-Dic)</p>
          <p className="text-xl font-bold text-indigo-900">{fmt(results.totals.totalIngresosProyectados)}</p>
        </div>
        <div className="bg-green-50 rounded-xl p-4 border border-green-100 shadow-sm">
          <p className="text-xs text-green-600 font-semibold mb-1">Saldo de Caja Proyectado</p>
          <p className="text-xl font-bold text-green-900">{fmt(results.totals.saldoDisponible)}</p>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-bold text-slate-700 mb-4">Flujo de Caja (Ingresos vs Pagos)</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={results.flow}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="month" fontSize={12} stroke="#64748b" />
                  <YAxis tickFormatter={(val) => `${val/1000}k`} fontSize={12} stroke="#64748b" />
                  <Tooltip formatter={(val: number) => fmt(val*1e6)} />
                  <Legend />
                  <Bar dataKey="ingresosReales" name="Ing. Real" stackId="a" fill="#3b82f6" />
                  <Bar dataKey="ingresosProyectados" name="Ing. Proy" stackId="a" fill="#60a5fa" />
                  <Line type="monotone" dataKey="pagos" name="Pagos Totales" stroke="#ef4444" strokeWidth={2} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
         </div>
         <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-bold text-slate-700 mb-4">Evolución Saldo de Caja</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={results.flow}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="month" fontSize={12} stroke="#64748b" />
                  <YAxis tickFormatter={(val) => `${val/1000}k`} fontSize={12} stroke="#64748b" />
                  <Tooltip formatter={(val: number) => fmt(val*1e6)} />
                  <Area type="monotone" dataKey="saldoFinal" name="Saldo Final" stroke="#10b981" fill="#d1fae5" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
         </div>
      </div>

      {/* Tabla Detallada por Recurso */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h3 className="font-semibold text-slate-800">Trazabilidad por Recurso</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-100 text-slate-600 font-medium">
              <tr>
                <th className="px-4 py-3">Recurso</th>
                <th className="px-4 py-3 text-right">Recaudo Real</th>
                <th className="px-4 py-3 text-right">Ingreso Proy.</th>
                <th className="px-4 py-3 text-right">Total Ingreso</th>
                <th className="px-4 py-3 text-right">Total Compromiso</th>
                <th className="px-4 py-3 text-right">Total Pago</th>
                <th className="px-4 py-3 text-right">Saldo Disponible</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {results.resources.map((r, i) => (
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-700">{r.recurso} - {r.nombre}</td>
                  <td className="px-4 py-3 text-right">{fmt(r.ingresosReales)}</td>
                  <td className="px-4 py-3 text-right text-indigo-600">{fmt(r.ingresosProyectados)}</td>
                  <td className="px-4 py-3 text-right font-semibold">{fmt(r.totalIngresos)}</td>
                  <td className="px-4 py-3 text-right text-orange-600">{fmt(r.totalCompromisos)}</td>
                  <td className="px-4 py-3 text-right text-red-600">{fmt(r.totalPagos)}</td>
                  <td className={`px-4 py-3 text-right font-bold ${r.saldoDisponible < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {fmt(r.saldoDisponible)}
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-100 font-bold text-slate-800">
                <td className="px-4 py-3">TOTALES</td>
                <td className="px-4 py-3 text-right">{fmt(results.totals.totalRecaudo)}</td>
                <td className="px-4 py-3 text-right text-indigo-600">{fmt(results.totals.totalIngresosProyectados)}</td>
                <td className="px-4 py-3 text-right">{fmt(results.totals.totalRecaudo + results.totals.totalIngresosProyectados)}</td>
                <td className="px-4 py-3 text-right text-orange-600">{fmt(results.totals.totalCompromisos)}</td>
                <td className="px-4 py-3 text-right text-red-600">{fmt(results.totals.totalPagos)}</td>
                <td className={`px-4 py-3 text-right ${results.totals.saldoDisponible < 0 ? 'text-red-600' : 'text-green-600'}`}>
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
