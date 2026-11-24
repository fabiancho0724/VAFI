import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Download,
  Calendar,
  AlertCircle,
  CheckCircle,
  Activity,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import { InformeCajaResult } from '../../lib/cajaHoyEngine';

interface Props {
  data: InformeCajaResult;
  onExportCSV: () => void;
}

const formatCOP = (val: number): string => {
  if (val === undefined || val === null || isNaN(val)) return '$ 0 COP';
  return `$ ${val.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} COP`;
};

const formatMillions = (val: number): string => {
  if (val === undefined || val === null || isNaN(val)) return '$ 0 M';
  const inM = val / 1e6;
  return `$ ${inM.toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} M`;
};

export const InformeCajaEvolucionMensual: React.FC<Props> = ({ data, onExportCSV }) => {
  const { evolucionMensual, totalesMensuales } = data;

  const chartData = evolucionMensual.map((m) => ({
    mes: m.mesNombre,
    ingresos: Math.round(m.ingresosMes / 1e6),
    egresos: Math.round(m.egresosMes / 1e6),
    flujoNeto: Math.round(m.flujoNetoMes / 1e6),
    saldoAcumulado: Math.round(m.saldoAcumuladoCaja / 1e6),
  }));

  return (
    <div className="space-y-6">
      {/* 1. Header con métricas de comportamiento */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-surface-container-low/50 border border-emerald-500/20 p-4 rounded-2xl">
          <span className="text-[10px] font-mono text-on-surface-variant uppercase block">Recaudo Mensual Promedio</span>
          <div className="text-xl font-black text-emerald-400 mt-1">
            {formatMillions(totalesMensuales.ingresoPromedioMensual)} / mes
          </div>
          <div className="text-[10px] text-gray-400 font-mono mt-1">11 meses observados</div>
        </div>

        <div className="bg-surface-container-low/50 border border-rose-500/20 p-4 rounded-2xl">
          <span className="text-[10px] font-mono text-on-surface-variant uppercase block">Giro Mensual Promedio</span>
          <div className="text-xl font-black text-rose-400 mt-1">
            {formatMillions(totalesMensuales.egresoPromedioMensual)} / mes
          </div>
          <div className="text-[10px] text-gray-400 font-mono mt-1">Desembolsos en operaciones</div>
        </div>

        <div className="bg-surface-container-low/50 border border-[#FFCC29]/30 p-4 rounded-2xl">
          <span className="text-[10px] font-mono text-on-surface-variant uppercase block">Flujo Neto Promedio</span>
          <div className="text-xl font-black text-[#FFCC29] mt-1">
            +{formatMillions(totalesMensuales.ingresoPromedioMensual - totalesMensuales.egresoPromedioMensual)} / mes
          </div>
          <div className="text-[10px] text-emerald-400 font-mono mt-1">Tasa de acumulación positiva</div>
        </div>

        <div className="bg-surface-container-low/50 border border-sky-500/20 p-4 rounded-2xl">
          <span className="text-[10px] font-mono text-on-surface-variant uppercase block">Mes de Mayor Recaudo</span>
          <div className="text-xl font-black text-white mt-1">Octubre ($ 57.963 M)</div>
          <div className="text-[10px] text-sky-400 font-mono mt-1">Giro MEN + Matrículas</div>
        </div>
      </div>

      {/* 2. Gráficas Duales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico 1: Ingresos vs Egresos */}
        <div className="bg-surface-container-low/40 border border-white/5 p-6 rounded-3xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white font-mono uppercase">
                Ingresos vs Egresos Efectivos Mensuales ($ M COP)
              </h3>
              <p className="text-xs text-on-surface-variant">Evolución cronológica Enero a Noviembre 2026</p>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis dataKey="mes" stroke="#888888" tick={{ fontSize: 10 }} />
                <YAxis stroke="#888888" tick={{ fontSize: 10 }} />
                <RechartsTooltip
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', borderRadius: '12px' }}
                  formatter={(val: any) => [`$ ${Number(val).toLocaleString('es-CO')} M`, '']}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="ingresos" name="Ingresos del Mes" fill="#FFCC29" radius={[3, 3, 0, 0]} />
                <Bar dataKey="egresos" name="Egresos del Mes" fill="#f43f5e" radius={[3, 3, 0, 0]} />
                <Line type="monotone" dataKey="flujoNeto" name="Flujo Neto Mensual" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 2: Trayectoria del Saldo de Caja */}
        <div className="bg-surface-container-low/40 border border-white/5 p-6 rounded-3xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white font-mono uppercase">
                Trayectoria del Saldo Acumulado de Caja ($ M COP)
              </h3>
              <p className="text-xs text-on-surface-variant">Evolución de liquidez disponible en el año</p>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 25 }}>
                <defs>
                  <linearGradient id="cajaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis dataKey="mes" stroke="#888888" tick={{ fontSize: 10 }} />
                <YAxis stroke="#888888" tick={{ fontSize: 10 }} />
                <RechartsTooltip
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', borderRadius: '12px' }}
                  formatter={(val: any) => [`$ ${Number(val).toLocaleString('es-CO')} M`, '']}
                />
                <Area type="monotone" dataKey="saldoAcumulado" name="Saldo Acumulado" stroke="#38bdf8" strokeWidth={2.5} fillOpacity={1} fill="url(#cajaGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 3. Tabla Mensual Detallada */}
      <div className="bg-surface-container-low/40 border border-white/5 rounded-3xl overflow-hidden">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <h4 className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
            <Calendar size={14} className="text-[#FFCC29]" />
            Tabla de Evolución Intermensual de Caja y Diagnóstico de Presión
          </h4>
          <button
            onClick={onExportCSV}
            className="flex items-center gap-2 px-3 py-1 bg-white/10 hover:bg-white/15 text-white font-mono text-xs rounded-xl transition-all cursor-pointer"
          >
            <Download size={13} />
            <span>Exportar CSV</span>
          </button>
        </div>

        <div className="overflow-x-auto horizontal-scrollbar">
          <table className="w-full text-left border-collapse text-[11px] font-mono">
            <thead>
              <tr className="bg-white/5 text-gray-400 border-b border-white/5">
                <th className="p-3">Mes</th>
                <th className="p-3 text-right">Ingresos del Mes</th>
                <th className="p-3 text-right">Egresos del Mes</th>
                <th className="p-3 text-right">Flujo Neto Mensual</th>
                <th className="p-3 text-right">Saldo Acumulado en Caja</th>
                <th className="p-3 text-right">Var. Ingresos</th>
                <th className="p-3 text-center">Diagnóstico de Presión de Liquidez</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-gray-300">
              {evolucionMensual.map((m) => (
                <tr key={m.mesNum} className="hover:bg-white/5 transition-colors">
                  <td className="p-3 font-bold text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center text-[10px] text-gray-400">
                      {m.mesNum}
                    </span>
                    <span>{m.mesNombre}</span>
                  </td>
                  <td className="p-3 text-right font-mono text-emerald-400 font-medium">
                    {formatCOP(m.ingresosMes)}
                  </td>
                  <td className="p-3 text-right font-mono text-rose-400">
                    {formatCOP(m.egresosMes)}
                  </td>
                  <td className="p-3 text-right font-mono font-bold">
                    <span className={m.flujoNetoMes >= 0 ? 'text-[#FFCC29]' : 'text-rose-500'}>
                      {m.flujoNetoMes >= 0 ? '+' : ''}{formatCOP(m.flujoNetoMes)}
                    </span>
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-sky-400">
                    {formatCOP(m.saldoAcumuladoCaja)}
                  </td>
                  <td className="p-3 text-right font-mono">
                    <span className={m.variacionIngresosPorc >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                      {m.variacionIngresosPorc > 0 ? '+' : ''}{m.variacionIngresosPorc.toFixed(1)}%
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-sans font-medium ${
                      m.esPresionLiquidez
                        ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}>
                      {m.diagnostico}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-black/60 font-bold text-white border-t-2 border-white/20">
                <td className="p-3">TOTAL ENE-NOV</td>
                <td className="p-3 text-right font-mono text-emerald-400">
                  {formatCOP(totalesMensuales.totalIngresosEneNov)}
                </td>
                <td className="p-3 text-right font-mono text-rose-400">
                  {formatCOP(totalesMensuales.totalEgresosEneNov)}
                </td>
                <td className="p-3 text-right font-mono text-[#FFCC29]">
                  +{formatCOP(totalesMensuales.flujoNetoTotalEneNov)}
                </td>
                <td className="p-3 text-right font-mono text-sky-400">
                  {formatCOP(evolucionMensual[evolucionMensual.length - 1]?.saldoAcumuladoCaja || 0)}
                </td>
                <td className="p-3 text-right font-mono text-gray-400">-</td>
                <td className="p-3 text-center text-emerald-400">SUPERAVITARIO</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
