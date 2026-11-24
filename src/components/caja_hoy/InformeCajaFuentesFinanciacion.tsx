import React, { useState, useMemo } from 'react';
import {
  Layers,
  Search,
  Download,
  Filter,
  CheckCircle,
  AlertTriangle,
  Coins,
  Scale,
  ArrowUpDown,
  Landmark,
  ShieldCheck,
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
  PieChart,
  Pie,
} from 'recharts';
import { InformeCajaFuenteRow, InformeCajaResult } from '../../lib/cajaHoyEngine';

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

export const InformeCajaFuentesFinanciacion: React.FC<Props> = ({ data, onExportCSV }) => {
  const { fuentes, totalesFuentes, resumenRecursos } = data;

  const [searchTerm, setSearchTerm] = useState('');
  const [naturalezaFilter, setNaturalezaFilter] = useState<'Todas' | 'Libre Destinación' | 'Destinación Específica'>('Todas');
  const [tipoFilter, setTipoFilter] = useState<'Todos' | 'Administración' | 'Inversión'>('Todos');
  const [sortBy, setSortBy] = useState<'codigo' | 'recaudo' | 'bancos' | 'disponibilidad'>('bancos');
  const [sortAsc, setSortAsc] = useState(false);

  const filteredFuentes = useMemo(() => {
    return fuentes
      .filter((f) => {
        const matchesSearch =
          f.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
          f.nombre.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesNat = naturalezaFilter === 'Todas' || f.naturaleza === naturalezaFilter;
        const matchesTipo = tipoFilter === 'Todos' || f.tipo === tipoFilter;
        return matchesSearch && matchesNat && matchesTipo;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortBy === 'codigo') cmp = a.codigo.localeCompare(b.codigo, undefined, { numeric: true });
        else if (sortBy === 'recaudo') cmp = a.totalRecaudo - b.totalRecaudo;
        else if (sortBy === 'bancos') cmp = a.saldoBancos - b.saldoBancos;
        else if (sortBy === 'disponibilidad') cmp = a.disponibilidadEfectiva - b.disponibilidadEfectiva;
        return sortAsc ? cmp : -cmp;
      });
  }, [fuentes, searchTerm, naturalezaFilter, tipoFilter, sortBy, sortAsc]);

  const chartData = useMemo(() => {
    return fuentes
      .filter((f) => f.totalRecaudo > 100000000 || f.saldoBancos > 50000000)
      .map((f) => ({
        codigo: f.codigo,
        nombre: f.nombre.slice(0, 20),
        recaudo: Math.round(f.totalRecaudo / 1e6),
        pagos: Math.round(f.pagos / 1e6),
        bancos: Math.round(f.saldoBancos / 1e6),
        disponible: Math.round(f.disponibilidadEfectiva / 1e6),
      }));
  }, [fuentes]);

  const pieData = useMemo(() => {
    return [
      { name: 'Libre Destinación (Funcionamiento)', value: Math.round(resumenRecursos.bancosLibreDestinacion / 1e6), color: '#10b981' },
      { name: 'Destinación Específica (Inversión/Convenios)', value: Math.round(resumenRecursos.bancosDestinacionEspecifica / 1e6), color: '#f59e0b' },
    ];
  }, [resumenRecursos]);

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(field);
      setSortAsc(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header con métricas de síntesis */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-surface-container-low/50 border border-white/5 p-4 rounded-2xl">
          <span className="text-[10px] font-mono text-on-surface-variant uppercase block">Fuentes Identificadas</span>
          <div className="text-xl font-black text-white mt-1">{fuentes.length} Recursos</div>
          <div className="text-[10px] text-gray-400 font-mono mt-1">R10.0 a R40 catalogados</div>
        </div>

        <div className="bg-surface-container-low/50 border border-emerald-500/20 p-4 rounded-2xl">
          <span className="text-[10px] font-mono text-on-surface-variant uppercase block">Bancos Libre Destinación</span>
          <div className="text-xl font-black text-emerald-400 mt-1">
            {formatMillions(resumenRecursos.bancosLibreDestinacion)}
          </div>
          <div className="text-[10px] text-emerald-300 font-mono mt-1">
            {resumenRecursos.porcentajeLibre.toFixed(1)}% de la caja bancaria
          </div>
        </div>

        <div className="bg-surface-container-low/50 border border-amber-500/20 p-4 rounded-2xl">
          <span className="text-[10px] font-mono text-on-surface-variant uppercase block">Bancos Destinación Específica</span>
          <div className="text-xl font-black text-amber-400 mt-1">
            {formatMillions(resumenRecursos.bancosDestinacionEspecifica)}
          </div>
          <div className="text-[10px] text-amber-300 font-mono mt-1">
            {resumenRecursos.porcentajeEspecifica.toFixed(1)}% restringido por ley
          </div>
        </div>

        <div className="bg-surface-container-low/50 border border-sky-500/20 p-4 rounded-2xl">
          <span className="text-[10px] font-mono text-on-surface-variant uppercase block">Rendimientos Financieros</span>
          <div className="text-xl font-black text-sky-400 mt-1">
            {formatMillions(totalesFuentes.rendimientosFinancieros)}
          </div>
          <div className="text-[10px] text-gray-400 font-mono mt-1">Intereses generados en cuentas</div>
        </div>
      </div>

      {/* 2. Gráficas de Recursos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-surface-container-low/40 border border-white/5 p-6 rounded-3xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white font-mono uppercase">
                Recaudo vs Pagos y Saldo Bancario por Fuente ($ M COP)
              </h3>
              <p className="text-xs text-on-surface-variant">Fuentes principales de financiación universitaria</p>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis dataKey="codigo" stroke="#888888" tick={{ fontSize: 10 }} />
                <YAxis stroke="#888888" tick={{ fontSize: 10 }} />
                <RechartsTooltip
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', borderRadius: '12px' }}
                  formatter={(val: any) => [`$ ${Number(val).toLocaleString('es-CO')} M`, '']}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="recaudo" name="Recaudo" fill="#FFCC29" radius={[3, 3, 0, 0]} />
                <Bar dataKey="pagos" name="Pagos" fill="#f43f5e" radius={[3, 3, 0, 0]} />
                <Bar dataKey="bancos" name="Saldo Bancos" fill="#38bdf8" radius={[3, 3, 0, 0]} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-surface-container-low/40 border border-white/5 p-6 rounded-3xl space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white font-mono uppercase">
              Composición de Bancos por Naturaleza
            </h3>
            <p className="text-xs text-on-surface-variant">Libre Destinación vs Destinación Específica</p>
          </div>

          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', borderRadius: '12px' }}
                  formatter={(val: any) => [`$ ${Number(val).toLocaleString('es-CO')} M`, '']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2 pt-2 border-t border-white/5">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-gray-300">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                Libre Destinación
              </span>
              <span className="font-mono font-bold text-emerald-400">
                {resumenRecursos.porcentajeLibre.toFixed(1)}% ({formatMillions(resumenRecursos.bancosLibreDestinacion)})
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-gray-300">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                Destinación Específica
              </span>
              <span className="font-mono font-bold text-amber-400">
                {resumenRecursos.porcentajeEspecifica.toFixed(1)}% ({formatMillions(resumenRecursos.bancosDestinacionEspecifica)})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Filtros y Búsqueda de Fuentes */}
      <div className="bg-surface-container-low/40 border border-white/5 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[260px]">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={14} />
            <input
              type="text"
              placeholder="Buscar por código (ej. 10.0, 20) o nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#FFCC29]"
            />
          </div>

          <select
            value={naturalezaFilter}
            onChange={(e) => setNaturalezaFilter(e.target.value as any)}
            className="bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#FFCC29]"
          >
            <option value="Todas">Todas las Naturalezas</option>
            <option value="Libre Destinación">Libre Destinación</option>
            <option value="Destinación Específica">Destinación Específica</option>
          </select>

          <select
            value={tipoFilter}
            onChange={(e) => setTipoFilter(e.target.value as any)}
            className="bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#FFCC29]"
          >
            <option value="Todos">Todos los Tipos</option>
            <option value="Administración">Administración</option>
            <option value="Inversión">Inversión</option>
          </select>
        </div>

        <button
          onClick={onExportCSV}
          className="flex items-center gap-2 px-4 py-1.5 bg-[#FFCC29] hover:bg-[#FFCC29]/90 text-black font-mono font-bold text-xs rounded-xl transition-all cursor-pointer shadow-sm active:scale-95"
        >
          <Download size={14} />
          <span>Exportar Matriz a CSV</span>
        </button>
      </div>

      {/* 4. Tabla Analítica de Fuentes */}
      <div className="bg-surface-container-low/40 border border-white/5 rounded-3xl overflow-hidden">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <h4 className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
            <Layers size={14} className="text-[#FFCC29]" />
            Matriz Detallada de Fuentes de Financiación (Mostrando {filteredFuentes.length} de {fuentes.length})
          </h4>
          <span className="text-[10px] font-mono text-gray-400">Valores en COP</span>
        </div>

        <div className="overflow-x-auto horizontal-scrollbar">
          <table className="w-full text-left border-collapse text-[11px] font-mono">
            <thead>
              <tr className="bg-white/5 text-gray-400 border-b border-white/5">
                <th className="p-3 cursor-pointer hover:text-white" onClick={() => handleSort('codigo')}>
                  <div className="flex items-center gap-1">
                    <span>Recurso</span>
                    <ArrowUpDown size={11} />
                  </div>
                </th>
                <th className="p-3">Naturaleza & Tipo</th>
                <th className="p-3 text-right">Aforo Inicial</th>
                <th className="p-3 text-right cursor-pointer hover:text-white" onClick={() => handleSort('recaudo')}>
                  <div className="flex items-center justify-end gap-1">
                    <span>Recaudo (% Cumpl.)</span>
                    <ArrowUpDown size={11} />
                  </div>
                </th>
                <th className="p-3 text-right">Rendimientos</th>
                <th className="p-3 text-right">Compromisos</th>
                <th className="p-3 text-right">Pagos Efectivos</th>
                <th className="p-3 text-right cursor-pointer hover:text-white" onClick={() => handleSort('bancos')}>
                  <div className="flex items-center justify-end gap-1">
                    <span>Saldo en Bancos</span>
                    <ArrowUpDown size={11} />
                  </div>
                </th>
                <th className="p-3 text-right">Cuentas x Pagar</th>
                <th className="p-3 text-right cursor-pointer hover:text-white" onClick={() => handleSort('disponibilidad')}>
                  <div className="flex items-center justify-end gap-1">
                    <span>Disponibilidad Neta</span>
                    <ArrowUpDown size={11} />
                  </div>
                </th>
                <th className="p-3 text-center">Cobertura</th>
                <th className="p-3 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-gray-300">
              {filteredFuentes.map((f) => (
                <tr key={f.codigo} className="hover:bg-white/5 transition-colors">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded font-bold text-xs bg-[#FFCC29]/20 text-[#FFCC29] border border-[#FFCC29]/30">
                        {f.codigo}
                      </span>
                      <span className="font-sans text-xs font-medium text-white max-w-[200px] truncate" title={f.nombre}>
                        {f.nombre}
                      </span>
                    </div>
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    <div className="flex flex-col gap-0.5">
                      <span className={`text-[9px] px-1.5 py-0.2 rounded w-fit ${
                        f.naturaleza === 'Libre Destinación'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {f.naturaleza}
                      </span>
                      <span className="text-[9px] text-gray-500">{f.tipo}</span>
                    </div>
                  </td>
                  <td className="p-3 text-right font-mono text-gray-400">
                    {formatCOP(f.aforoInicial)}
                  </td>
                  <td className="p-3 text-right font-mono text-white">
                    <div>{formatCOP(f.totalRecaudo)}</div>
                    <div className="text-[9px] text-gray-400 font-sans">
                      {f.porcentajeRecaudo.toFixed(1)}% aforo
                    </div>
                  </td>
                  <td className="p-3 text-right font-mono text-[#FFCC29]">
                    {f.rendimientosFinancieros > 0 ? formatCOP(f.rendimientosFinancieros) : '-'}
                  </td>
                  <td className="p-3 text-right font-mono text-gray-300">
                    {formatCOP(f.compromisos)}
                  </td>
                  <td className="p-3 text-right font-mono text-gray-300">
                    <div>{formatCOP(f.pagos)}</div>
                    <div className="text-[9px] text-gray-400 font-sans">
                      {f.porcentajeEjecucionGiro.toFixed(1)}% giro
                    </div>
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-sky-400">
                    {formatCOP(f.saldoBancos)}
                  </td>
                  <td className="p-3 text-right font-mono text-rose-400">
                    {formatCOP(f.saldoPorPagar)}
                  </td>
                  <td className="p-3 text-right font-mono font-bold">
                    <span className={f.disponibilidadEfectiva >= 0 ? 'text-emerald-400' : 'text-rose-500'}>
                      {formatCOP(f.disponibilidadEfectiva)}
                    </span>
                  </td>
                  <td className="p-3 text-center font-mono">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      f.coberturaBancosCompromisos >= 150
                        ? 'text-emerald-400 bg-emerald-500/10'
                        : f.coberturaBancosCompromisos >= 100
                        ? 'text-amber-400 bg-amber-500/10'
                        : 'text-rose-400 bg-rose-500/10'
                    }`}>
                      {f.saldoPorPagar === 0 ? '100%' : `${f.coberturaBancosCompromisos.toFixed(0)}%`}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                      f.estado === 'SUPERAVIT'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : f.estado === 'EQUILIBRIO'
                        ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}>
                      {f.estado === 'DEFICIT_RIESGO' ? 'Alerta' : f.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-black/60 font-bold text-white border-t-2 border-white/20">
                <td className="p-3" colSpan={2}>
                  TOTAL CONSOLIDADO ({filteredFuentes.length} FUENTES)
                </td>
                <td className="p-3 text-right font-mono">{formatCOP(totalesFuentes.aforoInicial)}</td>
                <td className="p-3 text-right font-mono text-emerald-400">{formatCOP(totalesFuentes.totalRecaudo)}</td>
                <td className="p-3 text-right font-mono text-[#FFCC29]">{formatCOP(totalesFuentes.rendimientosFinancieros)}</td>
                <td className="p-3 text-right font-mono text-gray-300">{formatCOP(totalesFuentes.compromisos)}</td>
                <td className="p-3 text-right font-mono text-gray-300">{formatCOP(totalesFuentes.pagos)}</td>
                <td className="p-3 text-right font-mono text-sky-400">{formatCOP(totalesFuentes.saldoBancos)}</td>
                <td className="p-3 text-right font-mono text-rose-400">{formatCOP(totalesFuentes.saldoPorPagar)}</td>
                <td className="p-3 text-right font-mono text-emerald-400">{formatCOP(totalesFuentes.disponibilidadEfectiva)}</td>
                <td className="p-3 text-center font-mono text-[#FFCC29]">{(totalesFuentes.coberturaGlobal / 100).toFixed(2)}x</td>
                <td className="p-3 text-center text-emerald-400">ÓPTIMO</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
