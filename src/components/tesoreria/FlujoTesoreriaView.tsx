import React, { useState, useEffect, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  AreaChart,
  Area,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  Cell
} from 'recharts';
import {
  Landmark,
  Coins,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  AlertCircle,
  Info,
  Calendar,
  Filter,
  Download,
  RotateCcw,
  Layers,
  Building2,
  CheckCircle2,
  ChevronRight,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  FileSpreadsheet,
  Copy,
  Check,
  Eye,
  X,
  PieChart as PieChartIcon,
  Scale,
  ArrowRight
} from 'lucide-react';
import { ConciliacionCajaView } from './ConciliacionCajaView';
import {
  loadTesoreriaRawData,
  processTesoreriaData,
  exportTesoreriaCSV,
  exportConciliacionCajaCSV,
  formatCOP,
  formatCOPFull,
  TesoreriaFilterState,
  TesoreriaProcessedData,
  RawBancoRow,
  RawIngresoRow,
  RecursoItem,
  CuentaItem
} from '../../lib/tesoreriaDataService';

const INITIAL_FILTERS: TesoreriaFilterState = {
  periodo: 'TODO',
  categoriaRecurso: 'TODOS',
  recurso: 'TODOS',
  banco: 'TODOS',
  cuenta: 'TODOS',
  tipoCuenta: 'TODOS'
};

export function FlujoTesoreriaView() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rawBancos, setRawBancos] = useState<RawBancoRow[]>([]);
  const [rawIngresos, setRawIngresos] = useState<RawIngresoRow[]>([]);
  const [filters, setFilters] = useState<TesoreriaFilterState>(INITIAL_FILTERS);

  // Modals / Drilldowns
  const [selectedRecursoModal, setSelectedRecursoModal] = useState<RecursoItem | null>(null);
  const [selectedCuentaModal, setSelectedCuentaModal] = useState<CuentaItem | null>(null);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [viewMode, setViewMode] = useState<'general' | 'conciliacion'>('general');
  const [activeAlertCategory, setActiveAlertCategory] = useState<'TODAS' | 'critico' | 'preventivo' | 'informativo'>('TODAS');

  useEffect(() => {
    async function initData() {
      try {
        setLoading(true);
        const { bancos, ingresos } = await loadTesoreriaRawData();
        setRawBancos(bancos);
        setRawIngresos(ingresos);
        setLoading(false);
      } catch (err: any) {
        setError(err.message || 'Error cargando datos de tesorería');
        setLoading(false);
      }
    }
    initData();
  }, []);

  const data: TesoreriaProcessedData = useMemo(() => {
    if (!rawBancos.length && !rawIngresos.length) {
      return processTesoreriaData([], [], filters);
    }
    return processTesoreriaData(rawBancos, rawIngresos, filters);
  }, [rawBancos, rawIngresos, filters]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.periodo !== 'TODO') count++;
    if (filters.categoriaRecurso !== 'TODOS') count++;
    if (filters.recurso !== 'TODOS') count++;
    if (filters.banco !== 'TODOS') count++;
    if (filters.cuenta !== 'TODOS') count++;
    if (filters.tipoCuenta !== 'TODOS') count++;
    return count;
  }, [filters]);

  const handleResetFilters = () => {
    setFilters(INITIAL_FILTERS);
  };

  const handleCopySummary = () => {
    if (!data.executiveSummary) return;
    navigator.clipboard.writeText(data.executiveSummary);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  const filteredAlerts = useMemo(() => {
    if (activeAlertCategory === 'TODAS') return data.alerts;
    return data.alerts.filter((a) => a.tipo === activeAlertCategory);
  }, [data.alerts, activeAlertCategory]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-white font-medium text-sm">Cargando datos maestros de Tesorería y Balance Bancos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-950/40 border border-rose-500/40 rounded-2xl p-6 text-center max-w-lg mx-auto my-12">
        <AlertTriangle className="text-rose-400 w-10 h-10 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-white mb-2">Error al procesar fuentes de tesorería</h3>
        <p className="text-xs text-rose-200">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn text-slate-100">
      {/* 1. ENCABEZADO OFICIAL INSTITUCIONAL */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/30 border border-amber-500/20 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-lg shadow-sm">
                Financial Command Center
              </span>
              <span className="px-3 py-1 bg-white/5 border border-white/10 text-slate-300 font-mono text-xs rounded-lg">
                Vigencia 2026
              </span>
              <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-xs rounded-lg">
                84 Cuentas Bancarias
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight flex items-center gap-3">
              <Landmark className="text-amber-400" />
              FLUJO TESORERÍA
            </h1>
            <p className="text-amber-300/90 font-semibold text-base">
              Monitoreo integrado del recaudo presupuestal y la liquidez real institucional
            </p>
            <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
              Compara el comportamiento mensual de los ingresos presupuestales frente al flujo real de efectivo registrado
              en las cuentas bancarias de la Universidad, permitiendo identificar tendencias, diferencias operativas y
              niveles consolidados de liquidez.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => exportTesoreriaCSV(data)}
              className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-900/30 border border-emerald-400/30 transition-all cursor-pointer"
              title="Descargar matriz de conciliación mensual en formato CSV/Excel"
            >
              <FileSpreadsheet size={16} />
              <span>Exportar Conciliación (Excel)</span>
            </button>
          </div>
        </div>
      </div>

      {/* SELECTOR DE MODO DE VISTA: TABLERO GENERAL VS CONCILIACIÓN DE CAJA */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/90 border border-white/10 rounded-2xl p-2.5 shadow-xl">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setViewMode('general')}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
              viewMode === 'general'
                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Landmark size={15} />
            <span>Tablero General de Tesorería</span>
          </button>
          <button
            onClick={() => setViewMode('conciliacion')}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
              viewMode === 'conciliacion'
                ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Scale size={15} />
            <span>Conciliación de Caja (Disponible vs. Bancos)</span>
            <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-slate-950">
              100% Cuadrado
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {viewMode === 'conciliacion' ? (
            <button
              onClick={() => exportConciliacionCajaCSV(data)}
              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-900/30 border border-emerald-400/30 transition-all cursor-pointer"
              title="Descargar matriz de conciliación de caja en CSV/Excel"
            >
              <FileSpreadsheet size={15} />
              <span>Exportar Conciliación de Caja (Excel)</span>
            </button>
          ) : (
            <button
              onClick={() => exportTesoreriaCSV(data)}
              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-900/30 border border-emerald-400/30 transition-all cursor-pointer"
              title="Descargar matriz mensual en CSV/Excel"
            >
              <FileSpreadsheet size={15} />
              <span>Exportar Matriz Mensual (Excel)</span>
            </button>
          )}
        </div>
      </div>

      {viewMode === 'conciliacion' ? (
        <ConciliacionCajaView
          data={data}
          onOpenRecursoModal={(codigo) => {
            const rec = data.recursos.find((r) => r.codigo === codigo);
            if (rec) setSelectedRecursoModal(rec);
          }}
        />
      ) : (
        <>
          {/* BANNER DESTACADO: COMPARACIÓN DIRECTA DISPONIBLE VS SALDO EN BANCOS A CORTE DE HOY */}
          <div className="bg-gradient-to-r from-cyan-950/80 via-slate-900 to-amber-950/60 border border-cyan-500/30 rounded-2xl p-4 md:p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start md:items-center gap-3.5">
              <div className="p-3 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shrink-0">
                <Scale size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black uppercase tracking-wider text-cyan-400">
                    Conciliación de Caja a Corte de Hoy
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-slate-950">
                    100% Cuadrado
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Extractos bancarios vs. Disponible presupuestal oficial
                  </span>
                </div>
                <div className="text-xs text-slate-300 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span>
                    Disponible Presupuestal:{' '}
                    <strong className="text-amber-400 font-mono font-bold">
                      {formatCOP(data.conciliacionCaja.disponiblePresupuestalTotal)}
                    </strong>
                  </span>
                  <span className="text-slate-600 hidden sm:inline">|</span>
                  <span>
                    Saldo Real en Bancos:{' '}
                    <strong className="text-cyan-400 font-mono font-bold">
                      {formatCOP(data.conciliacionCaja.saldoRealBancos)}
                    </strong>
                  </span>
                  <span className="text-slate-600 hidden sm:inline">|</span>
                  <span>
                    Brecha Directa:{' '}
                    <strong className="text-rose-400 font-mono font-bold">
                      {formatCOP(data.conciliacionCaja.diferenciaDirecta)}
                    </strong>
                  </span>
                  <span className="text-slate-600 hidden sm:inline">|</span>
                  <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white font-mono text-[11px]">
                    Cobertura: <strong>{data.conciliacionCaja.coberturaBancosPct.toFixed(2)}%</strong>
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setViewMode('conciliacion')}
              className="px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0 hover:scale-[1.02]"
            >
              <span>Ver Conciliación Completa</span>
              <ArrowRight size={14} />
            </button>
          </div>

          {/* 2. BARRA DE FILTROS PRINCIPALES */}
      <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
            <Filter size={15} />
            <span>Filtros Globales de Exploración</span>
            {activeFiltersCount > 0 && (
              <span className="bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full text-[10px] font-black">
                {activeFiltersCount} activo{activeFiltersCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
          {activeFiltersCount > 0 && (
            <button
              onClick={handleResetFilters}
              className="text-xs text-slate-400 hover:text-amber-400 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw size={13} />
              <span>Limpiar filtros</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Periodo */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Calendar size={12} className="text-amber-400" /> Período
            </label>
            <select
              value={filters.periodo}
              onChange={(e) => setFilters({ ...filters, periodo: e.target.value })}
              className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-amber-400 transition-colors"
            >
              <option value="TODO">Año Completo (Ene - Sep)</option>
              <option value="S1">Semestre 1 (Ene - Jun)</option>
              <option value="S2">Semestre 2 (Jul - Sep)</option>
              <option value="Q1">Trimestre 1 (Ene - Mar)</option>
              <option value="Q2">Trimestre 2 (Abr - Jun)</option>
              <option value="Q3">Trimestre 3 (Jul - Sep)</option>
              <option disabled>──────────</option>
              <option value="Enero">Enero</option>
              <option value="Febrero">Febrero</option>
              <option value="Marzo">Marzo</option>
              <option value="Abril">Abril</option>
              <option value="Mayo">Mayo</option>
              <option value="Junio">Junio</option>
              <option value="Julio">Julio</option>
              <option value="Agosto">Agosto</option>
              <option value="Septiembre">Septiembre</option>
            </select>
          </div>

          {/* Categoría Recurso */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Layers size={12} className="text-blue-400" /> Categoría
            </label>
            <select
              value={filters.categoriaRecurso}
              onChange={(e) => setFilters({ ...filters, categoriaRecurso: e.target.value as any })}
              className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-amber-400 transition-colors"
            >
              <option value="TODOS">Todas las Categorías</option>
              <option value="BASE">Base Presupuestal (Nación)</option>
              <option value="PROPIOS">Otros Recursos (Propios/Servicios)</option>
            </select>
          </div>

          {/* Recurso Específico */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Coins size={12} className="text-emerald-400" /> Recurso Ppto
            </label>
            <select
              value={filters.recurso}
              onChange={(e) => setFilters({ ...filters, recurso: e.target.value })}
              className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-amber-400 transition-colors"
            >
              <option value="TODOS">Todos los Recursos</option>
              {data.recursos.map((r) => (
                <option key={r.codigo} value={r.codigo}>
                  {r.codigo} - {r.nombre.slice(0, 26)}
                </option>
              ))}
            </select>
          </div>

          {/* Banco */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Building2 size={12} className="text-purple-400" /> Entidad Bancaria
            </label>
            <select
              value={filters.banco}
              onChange={(e) => setFilters({ ...filters, banco: e.target.value })}
              className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-amber-400 transition-colors"
            >
              <option value="TODOS">Todos los Bancos ({data.bancosList.length})</option>
              {data.bancosList.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* Tipo de Cuenta */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Layers size={12} className="text-cyan-400" /> Tipo de Cuenta
            </label>
            <select
              value={filters.tipoCuenta}
              onChange={(e) => setFilters({ ...filters, tipoCuenta: e.target.value })}
              className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-amber-400 transition-colors"
            >
              <option value="TODOS">Todos los Tipos</option>
              {data.tiposCuentaList.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Cuenta Bancaria */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Landmark size={12} className="text-amber-400" /> Cuenta Específica
            </label>
            <select
              value={filters.cuenta}
              onChange={(e) => setFilters({ ...filters, cuenta: e.target.value })}
              className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-amber-400 transition-colors"
            >
              <option value="TODOS">Todas las Cuentas ({data.cuentas.length})</option>
              {data.cuentasList.map((c) => (
                <option key={c.noCuenta} value={c.noCuenta}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 3. PRIMER BLOQUE: KPIs ESTRATÉGICOS DE TESORERÍA (6 TARJETAS) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* KPI 1: Recaudo Presupuestal & Disponible */}
        <div className="bg-slate-900/90 border-l-4 border-l-amber-500 border border-white/10 rounded-2xl p-4 shadow-lg flex flex-col justify-between group hover:border-amber-500/50 transition-all">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Recaudo Presupuestal
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 bg-amber-500/20 text-amber-300 rounded font-mono">
                {data.kpis.porcentajeEjecucionRecaudo.toFixed(1)}% ejec.
              </span>
            </div>
            <div className="text-xl lg:text-2xl font-black text-amber-400 font-mono mt-1">
              {formatCOP(data.kpis.recaudoPresupuestalTotal)}
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Disponible CSV:</span>
            <span className="font-mono font-bold text-white">
              {formatCOP(data.kpis.disponiblePresupuestalTotal)}
            </span>
          </div>
        </div>

        {/* KPI 2: Ingreso Real en Bancos */}
        <div className="bg-slate-900/90 border-l-4 border-l-emerald-500 border border-white/10 rounded-2xl p-4 shadow-lg flex flex-col justify-between group hover:border-emerald-500/50 transition-all">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Ingreso Real en Bancos
            </span>
            <div className="text-xl lg:text-2xl font-black text-emerald-400 font-mono mt-1">
              {formatCOP(data.kpis.ingresosBancosTotal)}
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Entradas acumuladas:</span>
            <span className="text-emerald-300 font-bold">100% extracto</span>
          </div>
        </div>

        {/* KPI 3: Saldo Real de Tesorería */}
        <div className="bg-slate-900/90 border-l-4 border-l-cyan-500 border border-white/10 rounded-2xl p-4 shadow-lg flex flex-col justify-between group hover:border-cyan-500/50 transition-all">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Saldo Real Tesorería
            </span>
            <div className="text-xl lg:text-2xl font-black text-cyan-400 font-mono mt-1">
              {formatCOP(data.kpis.saldoRealTesoreria)}
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Corte al período:</span>
            <span className="text-cyan-300 font-mono font-bold">{data.meses[data.meses.length - 1]?.mesCorto} 2026</span>
          </div>
        </div>

        {/* KPI 4: Egresos de Tesorería */}
        <div className="bg-slate-900/90 border-l-4 border-l-rose-500 border border-white/10 rounded-2xl p-4 shadow-lg flex flex-col justify-between group hover:border-rose-500/50 transition-all">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Egresos de Tesorería
            </span>
            <div className="text-xl lg:text-2xl font-black text-rose-400 font-mono mt-1">
              {formatCOP(data.kpis.egresosBancosTotal)}
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Salidas acumuladas:</span>
            <span className="text-rose-300 font-mono font-bold">Bancos</span>
          </div>
        </div>

        {/* KPI 5: Variación de Liquidez */}
        <div className="bg-slate-900/90 border-l-4 border-l-indigo-500 border border-white/10 rounded-2xl p-4 shadow-lg flex flex-col justify-between group hover:border-indigo-500/50 transition-all">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Variación Liquidez
            </span>
            <div
              className={`text-xl lg:text-2xl font-black font-mono mt-1 ${
                data.kpis.variacionLiquidez >= 0 ? 'text-indigo-300' : 'text-rose-400'
              }`}
            >
              {data.kpis.variacionLiquidez >= 0 ? '+' : ''}
              {formatCOP(data.kpis.variacionLiquidez)}
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Saldo Final – Inicial:</span>
            <span
              className={`font-mono font-bold ${
                data.kpis.variacionLiquidez >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {data.kpis.variacionLiquidezPct >= 0 ? '+' : ''}
              {data.kpis.variacionLiquidezPct.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* KPI 6: Cobertura de Caja */}
        <div className="bg-slate-900/90 border-l-4 border-l-yellow-400 border border-white/10 rounded-2xl p-4 shadow-lg flex flex-col justify-between group hover:border-yellow-400/50 transition-all">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Cobertura de Caja
            </span>
            <div className="text-xl lg:text-2xl font-black text-yellow-400 font-mono mt-1">
              {data.kpis.coberturaCajaMeses.toFixed(1)} meses
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Saldo / Prom. egresos:</span>
            <span className="text-yellow-300 font-bold">Respaldo</span>
          </div>
        </div>
      </div>

      {/* 4. SEGUNDO BLOQUE: COMPARACIÓN RECAUDO PRESUPUESTAL VS ENTRADAS BANCOS + INDICADOR DE BRECHA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900/80 border border-white/10 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <TrendingUp size={18} className="text-amber-400" />
                Recaudo Presupuestal vs. Flujo Real de Bancos
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Comparación del reconocimiento mensual de ingresos presupuestales frente a las entradas registradas en bancos
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs shrink-0">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-amber-400" />
                <span className="text-slate-300 font-medium">Recaudo Presupuestal</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-emerald-400" />
                <span className="text-slate-300 font-medium">Entradas en Bancos</span>
              </div>
            </div>
          </div>

          <div className="h-80 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data.meses} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                <XAxis dataKey="mesCorto" stroke="#94a3b8" tick={{ fill: '#cbd5e1', fontSize: 12 }} />
                <YAxis
                  stroke="#94a3b8"
                  tick={{ fill: '#cbd5e1', fontSize: 11 }}
                  tickFormatter={(val) => `$${(val / 1e6).toFixed(0)}M`}
                />
                <RechartsTooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload;
                      return (
                        <div className="bg-slate-950/95 border border-white/15 rounded-xl p-3 shadow-2xl text-xs space-y-1.5 min-w-[220px]">
                          <p className="font-bold text-white border-b border-white/10 pb-1 flex justify-between">
                            <span>{item.mes} 2026</span>
                            <span className="text-amber-400 font-mono">Mes {item.index + 1}</span>
                          </p>
                          <div className="flex justify-between items-center text-slate-300">
                            <span>Recaudo Presupuestal:</span>
                            <strong className="text-amber-400 font-mono">{formatCOP(item.recaudoPresupuestal)}</strong>
                          </div>
                          <div className="flex justify-between items-center text-slate-300">
                            <span>Entradas Bancos:</span>
                            <strong className="text-emerald-400 font-mono">{formatCOP(item.ingresoBancos)}</strong>
                          </div>
                          <div className="flex justify-between items-center pt-1 border-t border-white/10">
                            <span className="text-slate-400">Brecha (Bancos - Ppto):</span>
                            <strong
                              className={`font-mono ${
                                item.brecha >= 0 ? 'text-cyan-400' : 'text-rose-400'
                              }`}
                            >
                              {item.brecha >= 0 ? '+' : ''}
                              {formatCOP(item.brecha)}
                            </strong>
                          </div>
                          <div className="flex justify-between items-center text-[10px] text-slate-400">
                            <span>Variación Brecha:</span>
                            <span className="font-mono font-bold text-slate-200">{item.brechaPct.toFixed(1)}%</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  dataKey="recaudoPresupuestal"
                  name="Recaudo Presupuestal"
                  fill="#FFCC29"
                  radius={[6, 6, 0, 0]}
                  barSize={24}
                />
                <Line
                  type="monotone"
                  dataKey="ingresoBancos"
                  name="Entradas Bancos"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={{ r: 5, fill: '#10b981', stroke: '#064e3b', strokeWidth: 2 }}
                  activeDot={{ r: 7 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* INDICADOR DE BRECHA Y NOTA TÉCNICA OBLIGATORIA */}
        <div className="bg-slate-900/80 border border-white/10 rounded-3xl p-6 shadow-xl flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <Info size={16} className="text-cyan-400" />
                Brecha Presupuesto – Tesorería
              </h3>
              <span className="text-[10px] font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded">
                Indicador Clave
              </span>
            </div>

            <div className="mt-4 space-y-3">
              <div className="bg-black/30 border border-white/5 rounded-2xl p-4">
                <span className="text-[11px] text-slate-400 block font-medium">Brecha Acumulada del Período</span>
                <div className="text-2xl font-black text-cyan-400 font-mono mt-1">
                  +{formatCOP(data.kpis.ingresosBancosTotal - data.kpis.recaudoPresupuestalTotal)}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
                  <span>Proporción Entradas / Recaudo:</span>
                  <span className="font-mono font-bold text-white">
                    {data.kpis.recaudoPresupuestalTotal > 0
                      ? `${((data.kpis.ingresosBancosTotal / data.kpis.recaudoPresupuestalTotal) * 100).toFixed(1)}%`
                      : 'N/A'}
                  </span>
                </div>
              </div>

              <div className="bg-black/30 border border-white/5 rounded-2xl p-4 space-y-2">
                <span className="text-[11px] text-slate-400 block font-medium">Comportamiento en Último Mes</span>
                {(() => {
                  const last = data.meses[data.meses.length - 1];
                  if (!last) return null;
                  return (
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Recaudo ({last.mes}):</span>
                        <span className="font-mono text-amber-400 font-bold">{formatCOP(last.recaudoPresupuestal)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Entradas ({last.mes}):</span>
                        <span className="font-mono text-emerald-400 font-bold">{formatCOP(last.ingresoBancos)}</span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-white/5">
                        <span className="text-slate-300 font-bold">Brecha Mensual:</span>
                        <span className="font-mono text-cyan-300 font-bold">+{formatCOP(last.brecha)}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* NOTA ACLARATORIA TÉCNICA OBLIGATORIA */}
          <div className="bg-cyan-950/30 border border-cyan-500/30 rounded-2xl p-3.5 text-[11px] text-cyan-200/90 leading-relaxed">
            <strong className="text-cyan-300 block mb-1 flex items-center gap-1.5 font-bold">
              <CheckCircle2 size={13} />
              Nota Técnica de Interpretación
            </strong>
            Las diferencias entre recaudo presupuestal y movimientos bancarios pueden obedecer a temporalidades de
            registro, traslados entre cuentas, operaciones financieras, partidas no presupuestales u otras dinámicas de
            tesorería. La brecha constituye un indicador de análisis y no una conciliación contable automática.
          </div>
        </div>
      </div>

      {/* 5. TERCER BLOQUE: EVOLUCIÓN DE LA LIQUIDEZ INSTITUCIONAL (SALDO BANCARIO) */}
      <div className="bg-slate-900/80 border border-white/10 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Coins size={18} className="text-cyan-400" />
              Evolución de la Liquidez Institucional (Saldo Bancario)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Trayectoria mensual del saldo inicial, entradas, salidas y saldo final consolidado en cuentas bancarias
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-slate-300">
              <div className="w-3 h-3 rounded bg-cyan-400" /> Saldo Final
            </span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <div className="w-3 h-3 rounded bg-emerald-400" /> Entradas
            </span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <div className="w-3 h-3 rounded bg-rose-400" /> Salidas
            </span>
          </div>
        </div>

        <div className="h-80 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.meses} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
              <defs>
                <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
              <XAxis dataKey="mesCorto" stroke="#94a3b8" tick={{ fill: '#cbd5e1', fontSize: 12 }} />
              <YAxis
                stroke="#94a3b8"
                tick={{ fill: '#cbd5e1', fontSize: 11 }}
                tickFormatter={(val) => `$${(val / 1e6).toFixed(0)}M`}
              />
              <RechartsTooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload;
                    return (
                      <div className="bg-slate-950/95 border border-white/15 rounded-xl p-3 shadow-2xl text-xs space-y-1.5 min-w-[210px]">
                        <p className="font-bold text-white border-b border-white/10 pb-1">
                          {item.mes} 2026 - Posición de Caja
                        </p>
                        <div className="flex justify-between text-slate-300">
                          <span>Saldo Inicial:</span>
                          <span className="font-mono text-slate-400">{formatCOP(item.saldoInicial)}</span>
                        </div>
                        <div className="flex justify-between text-slate-300">
                          <span>Entradas (+):</span>
                          <span className="font-mono text-emerald-400 font-bold">{formatCOP(item.ingresoBancos)}</span>
                        </div>
                        <div className="flex justify-between text-slate-300">
                          <span>Salidas (-):</span>
                          <span className="font-mono text-rose-400 font-bold">{formatCOP(item.egresoBancos)}</span>
                        </div>
                        <div className="flex justify-between text-slate-300 pt-1 border-t border-white/10">
                          <span>Flujo Neto:</span>
                          <span
                            className={`font-mono font-bold ${
                              item.flujoNeto >= 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {item.flujoNeto >= 0 ? '+' : ''}
                            {formatCOP(item.flujoNeto)}
                          </span>
                        </div>
                        <div className="flex justify-between text-white font-bold pt-1 border-t border-white/10">
                          <span className="text-cyan-400">Saldo Final:</span>
                          <span className="font-mono text-cyan-300">{formatCOP(item.saldoFinal)}</span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="saldoFinal"
                name="Saldo Final"
                stroke="#06b6d4"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorSaldo)"
              />
              <Line
                type="monotone"
                dataKey="ingresoBancos"
                name="Entradas"
                stroke="#10b981"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="egresoBancos"
                name="Salidas"
                stroke="#f43f5e"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={{ r: 3 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 6. CUARTO Y QUINTO BLOQUE: FLUJO DE EFECTIVO NETO & DISTRIBUCIÓN POR CUENTA */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Entradas, Salidas y Flujo Neto Mensual */}
        <div className="bg-slate-900/80 border border-white/10 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="border-b border-white/5 pb-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <TrendingDown size={18} className="text-indigo-400" />
              Entradas, Salidas y Flujo Neto de Efectivo
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Comportamiento mensual del efectivo: superávits netos frente a meses de presión de caja
            </p>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.meses} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                <XAxis dataKey="mesCorto" stroke="#94a3b8" tick={{ fill: '#cbd5e1', fontSize: 12 }} />
                <YAxis
                  stroke="#94a3b8"
                  tick={{ fill: '#cbd5e1', fontSize: 11 }}
                  tickFormatter={(val) => `$${(val / 1e6).toFixed(0)}M`}
                />
                <RechartsTooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload;
                      return (
                        <div className="bg-slate-950/95 border border-white/15 rounded-xl p-3 shadow-2xl text-xs space-y-1.5 min-w-[200px]">
                          <p className="font-bold text-white border-b border-white/10 pb-1">{item.mes} 2026</p>
                          <div className="flex justify-between text-slate-300">
                            <span>Entradas:</span>
                            <strong className="text-emerald-400 font-mono">{formatCOP(item.ingresoBancos)}</strong>
                          </div>
                          <div className="flex justify-between text-slate-300">
                            <span>Salidas:</span>
                            <strong className="text-rose-400 font-mono">{formatCOP(item.egresoBancos)}</strong>
                          </div>
                          <div className="flex justify-between pt-1 border-t border-white/10">
                            <span className="font-bold text-white">Flujo Neto:</span>
                            <strong
                              className={`font-mono ${
                                item.flujoNeto >= 0 ? 'text-emerald-400' : 'text-rose-400'
                              }`}
                            >
                              {item.flujoNeto >= 0 ? '+' : ''}
                              {formatCOP(item.flujoNeto)}
                            </strong>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="flujoNeto" name="Flujo Neto" radius={[4, 4, 0, 0]}>
                  {data.meses.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.flujoNeto >= 0 ? '#10b981' : '#f43f5e'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-white/5">
            <span className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Meses Superavitarios (Entradas &gt; Salidas)
            </span>
            <span className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-400" /> Meses Deficitarios (Salidas &gt; Entradas)
            </span>
          </div>
        </div>

        {/* Distribución del Saldo Bancario por Cuenta (Ranking) */}
        <div className="bg-slate-900/80 border border-white/10 rounded-3xl p-6 shadow-xl space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <PieChartIcon size={18} className="text-yellow-400" />
                  Distribución del Saldo Bancario por Cuenta
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Ranking de cuentas por saldo final al corte de período (Haga clic para ver detalle)
                </p>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                Total: {data.cuentas.length} cuentas
              </span>
            </div>

            <div className="space-y-2.5 mt-4 max-h-72 overflow-y-auto pr-1">
              {data.cuentas.slice(0, 6).map((c, i) => (
                <div
                  key={c.noCuenta}
                  onClick={() => setSelectedCuentaModal(c)}
                  className="bg-black/30 hover:bg-white/5 border border-white/5 hover:border-amber-400/40 rounded-xl p-3 cursor-pointer transition-all flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-400 font-mono text-xs font-bold flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate group-hover:text-amber-300 transition-colors">
                        {c.nombreCuenta}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono truncate">
                        {c.banco} • {c.noCuenta} • {c.clase}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-mono font-black text-cyan-400 block">
                      {formatCOP(c.saldoFinal)}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {c.share.toFixed(1)}% del total
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="text-[10px] text-slate-400 bg-black/20 p-2.5 rounded-xl border border-white/5">
            💡 <em>Nota de control:</em> Una cuenta con alto saldo no equivale a disponibilidad presupuestal libre de gasto.
          </div>
        </div>
      </div>

      {/* 7. OCTAVO BLOQUE: ANÁLISIS DE CONCENTRACIÓN DE LIQUIDEZ (TOP 5) */}
      <div className="bg-slate-900/80 border border-white/10 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Building2 size={18} className="text-amber-400" />
              Análisis de Concentración de Liquidez (Top 5 Cuentas)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Participación sobre el saldo institucional consolidado de las 5 cuentas bancarias principales
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Concentración Top 5:</span>
            <span className="px-2.5 py-1 bg-amber-500/20 text-amber-300 font-mono font-black text-sm rounded-lg border border-amber-500/30">
              {data.kpis.top5ConcentracionPct.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Barra de progreso de concentración */}
        <div className="space-y-2">
          <div className="w-full bg-slate-950 rounded-full h-3 overflow-hidden flex border border-white/10">
            <div
              style={{ width: `${Math.min(100, data.kpis.top5ConcentracionPct)}%` }}
              className="bg-gradient-to-r from-amber-500 to-yellow-400 h-full rounded-full transition-all duration-500"
            />
          </div>
          <div className="flex justify-between text-[11px] text-slate-400">
            <span>
              Top 5 Cuentas: <strong className="text-white font-mono">{formatCOP(data.kpis.top5SaldoTotal)}</strong>
            </span>
            <span>
              Resto de Cuentas ({data.cuentas.length - 5}):{' '}
              <strong className="text-white font-mono">
                {formatCOP(Math.max(0, data.kpis.saldoRealTesoreria - data.kpis.top5SaldoTotal))}
              </strong>
            </span>
          </div>
        </div>

        {/* Tarjetas del Top 5 */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pt-2">
          {data.cuentas.slice(0, 5).map((c, idx) => (
            <div
              key={c.noCuenta}
              onClick={() => setSelectedCuentaModal(c)}
              className="bg-black/40 border border-white/10 hover:border-amber-400/50 rounded-2xl p-3.5 cursor-pointer transition-all hover:scale-[1.02] flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                  <span className="font-bold text-amber-400">Puesto #{idx + 1}</span>
                  <span className="font-mono bg-white/5 px-1.5 py-0.5 rounded">{c.share.toFixed(1)}%</span>
                </div>
                <p className="text-xs font-bold text-white line-clamp-2" title={c.nombreCuenta}>
                  {c.nombreCuenta}
                </p>
                <p className="text-[10px] text-slate-400 font-mono mt-1">{c.banco}</p>
              </div>
              <div className="mt-3 pt-2 border-t border-white/5">
                <span className="text-[10px] text-slate-400 block">Saldo Final:</span>
                <span className="text-sm font-mono font-black text-cyan-400">{formatCOP(c.saldoFinal)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 8. SEXTO Y SÉPTIMO BLOQUE: MATRIZ HEATMAP Y COMPOSICIÓN POR RECURSO */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Matriz Heatmap Mensual (Recursos vs Meses) */}
        <div className="lg:col-span-2 bg-slate-900/80 border border-white/10 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Calendar size={18} className="text-emerald-400" />
                Matriz de Comportamiento Heatmap (Recursos vs. Meses)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Visualización de intensidad del recaudo presupuestal para identificar estacionalidad y concentración
              </p>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-400">
              <span>Bajo</span>
              <div className="w-16 h-2 rounded bg-gradient-to-r from-slate-950 via-emerald-900/60 to-emerald-400" />
              <span>Alto</span>
            </div>
          </div>

          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-950/80 sticky top-0 z-10 text-[11px] text-slate-400 uppercase tracking-wider font-bold">
                <tr>
                  <th className="py-2.5 px-3 border-b border-white/10">Recurso</th>
                  {data.meses.map((m) => (
                    <th key={m.mes} className="py-2.5 px-2 border-b border-white/10 text-right">
                      {m.mesCorto}
                    </th>
                  ))}
                  <th className="py-2.5 px-3 border-b border-white/10 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono">
                {data.heatmapData.map((row) => {
                  const maxRow = Math.max(...row.valores, 1);
                  return (
                    <tr
                      key={row.recurso}
                      onClick={() => {
                        const recItem = data.recursos.find((r) => r.codigo === row.recurso);
                        if (recItem) setSelectedRecursoModal(recItem);
                      }}
                      className="hover:bg-white/5 cursor-pointer transition-colors"
                    >
                      <td className="py-2 px-3 text-slate-200 font-sans text-xs flex items-center gap-2 truncate max-w-[200px]">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            row.categoria === 'Base Presupuestal' ? 'bg-amber-400' : 'bg-blue-400'
                          }`}
                        />
                        <span className="font-bold text-white">{row.recurso}</span>
                        <span className="text-[11px] text-slate-400 truncate">{row.nombre.replace(/R[0-9.]+\s*-\s*/, '')}</span>
                      </td>
                      {row.valores.map((val, idx) => {
                        const ratio = val / maxRow;
                        let bgStyle = 'bg-transparent';
                        if (val > 0) {
                          if (ratio > 0.7) bgStyle = 'bg-emerald-500/50 text-white font-bold';
                          else if (ratio > 0.4) bgStyle = 'bg-emerald-500/30 text-emerald-200';
                          else if (ratio > 0.1) bgStyle = 'bg-emerald-500/15 text-emerald-300';
                          else bgStyle = 'bg-emerald-500/5 text-slate-400';
                        }
                        return (
                          <td key={idx} className={`py-2 px-2 text-right transition-colors ${bgStyle}`}>
                            {val > 0 ? (val / 1e6).toFixed(1) : '-'}
                          </td>
                        );
                      })}
                      <td className="py-2 px-3 text-right font-bold text-amber-400">
                        {(row.total / 1e6).toFixed(1)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Composición por Recurso (Ranking y Base Presupuestal) */}
        <div className="bg-slate-900/80 border border-white/10 rounded-3xl p-6 shadow-xl space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Coins size={18} className="text-amber-400" />
                  Recaudo por Recurso
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Participación de cada fuente sobre el total recaudado
                </p>
              </div>
            </div>

            <div className="space-y-2 mt-4 max-h-80 overflow-y-auto pr-1">
              {data.recursos.slice(0, 8).map((r) => (
                <div
                  key={r.codigo}
                  onClick={() => setSelectedRecursoModal(r)}
                  className="bg-black/30 hover:bg-white/5 border border-white/5 hover:border-amber-400/40 rounded-xl p-2.5 cursor-pointer transition-all flex items-center justify-between gap-3 group"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-white group-hover:text-amber-400 transition-colors">
                        R{r.codigo}
                      </span>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                          r.esBasePresupuestal
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        }`}
                      >
                        {r.esBasePresupuestal ? 'Base' : 'Otros'}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 truncate max-w-[170px] mt-0.5">
                      {r.nombre.replace(/R[0-9.]+\s*-\s*/, '')}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-mono font-bold text-amber-400 block">
                      {formatCOP(r.totalRecaudado)}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {r.share.toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Base Presupuestal
            </span>
            <span className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-400" /> Otros Recursos
            </span>
          </div>
        </div>
      </div>

      {/* 9. NOVENO BLOQUE: SISTEMA DE 6 ALERTAS INTELIGENTES AUTOMATIZADAS */}
      <div className="bg-slate-900/80 border border-white/10 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ShieldAlert size={18} className="text-amber-400" />
              Sistema de Alertas Inteligentes de Tesorería
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Detección de presiones de caja, caídas de saldo, brechas significativas e índices de concentración
            </p>
          </div>

          {/* Categoría Selector */}
          <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/10 text-xs">
            {(['TODAS', 'critico', 'preventivo', 'informativo'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveAlertCategory(cat)}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  activeAlertCategory === cat
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {cat === 'TODAS'
                  ? `Todas (${data.alerts.length})`
                  : cat === 'critico'
                  ? 'Críticas'
                  : cat === 'preventivo'
                  ? 'Preventivas'
                  : 'Informativas'}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredAlerts.length === 0 ? (
            <div className="col-span-full py-8 text-center text-slate-400 text-xs">
              No se registran alertas en esta categoría para los filtros seleccionados.
            </div>
          ) : (
            filteredAlerts.map((al) => {
              const isCrit = al.tipo === 'critico';
              const isPrev = al.tipo === 'preventivo';
              const borderCls = isCrit
                ? 'border-rose-500/40 bg-rose-950/20'
                : isPrev
                ? 'border-amber-500/40 bg-amber-950/20'
                : 'border-cyan-500/40 bg-cyan-950/20';
              const badgeCls = isCrit
                ? 'bg-rose-500 text-white'
                : isPrev
                ? 'bg-amber-500 text-slate-950'
                : 'bg-cyan-500 text-slate-950';

              return (
                <div
                  key={al.id}
                  className={`border rounded-2xl p-4 shadow-lg space-y-2.5 flex flex-col justify-between ${borderCls}`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${badgeCls}`}>
                        {al.tipo}
                      </span>
                      <span className="text-[11px] font-mono font-bold text-white">{al.valor}</span>
                    </div>
                    <h4 className="text-xs font-bold text-white">{al.titulo}</h4>
                    <p className="text-[11px] text-slate-300 leading-relaxed">{al.descripcion}</p>
                  </div>
                  <div className="text-[10px] text-slate-400 pt-2 border-t border-white/5 font-sans italic">
                    {al.detalle}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 10. ANÁLISIS AUTOMÁTICO: LECTURA EJECUTIVA DE TESORERÍA */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/20 border border-amber-500/30 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="flex items-center justify-between border-b border-amber-500/20 pb-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              AI
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-amber-300">
                Lectura Ejecutiva de Tesorería
              </h3>
              <p className="text-[10px] text-slate-400">
                Síntesis analítica generada algorítmicamente en tiempo real con base en datos consolidados
              </p>
            </div>
          </div>
          <button
            onClick={handleCopySummary}
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors border border-white/10 cursor-pointer"
          >
            {copiedSummary ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            <span>{copiedSummary ? 'Copiado' : 'Copiar lectura'}</span>
          </button>
        </div>

        <p className="text-xs md:text-sm text-slate-200 leading-relaxed font-sans bg-black/30 p-4 rounded-2xl border border-white/5">
          {data.executiveSummary}
        </p>
      </div>

      {/* 11. TABLA DE CONCILIACIÓN ANALÍTICA MENSUAL */}
      <div className="bg-slate-900/80 border border-white/10 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FileSpreadsheet size={18} className="text-emerald-400" />
              Tabla de Conciliación Analítica Mensual
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Matriz comparativa de recaudo, movimientos bancarios, brechas y posición final de liquidez
            </p>
          </div>
          <button
            onClick={() => exportTesoreriaCSV(data)}
            className="px-3 py-1.5 bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Download size={14} />
            <span>Descargar CSV para Excel</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-950 text-[11px] text-slate-400 uppercase tracking-wider font-bold">
              <tr>
                <th className="py-3 px-3 border-b border-white/10">Mes</th>
                <th className="py-3 px-3 border-b border-white/10 text-right">Recaudo Presupuestal</th>
                <th className="py-3 px-3 border-b border-white/10 text-right">Entradas Bancos</th>
                <th className="py-3 px-3 border-b border-white/10 text-right">Brecha (B - P)</th>
                <th className="py-3 px-3 border-b border-white/10 text-right">Salidas Bancos</th>
                <th className="py-3 px-3 border-b border-white/10 text-right">Flujo Neto</th>
                <th className="py-3 px-3 border-b border-white/10 text-right">Saldo Final</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono">
              {data.meses.map((m) => (
                <tr key={m.mes} className="hover:bg-white/5 transition-colors">
                  <td className="py-2.5 px-3 font-bold text-white font-sans">{m.mes}</td>
                  <td className="py-2.5 px-3 text-right text-amber-400">{formatCOP(m.recaudoPresupuestal)}</td>
                  <td className="py-2.5 px-3 text-right text-emerald-400">{formatCOP(m.ingresoBancos)}</td>
                  <td
                    className={`py-2.5 px-3 text-right font-bold ${
                      m.brecha >= 0 ? 'text-cyan-400' : 'text-rose-400'
                    }`}
                  >
                    {m.brecha >= 0 ? '+' : ''}
                    {formatCOP(m.brecha)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-rose-400">{formatCOP(m.egresoBancos)}</td>
                  <td
                    className={`py-2.5 px-3 text-right font-bold ${
                      m.flujoNeto >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {m.flujoNeto >= 0 ? '+' : ''}
                    {formatCOP(m.flujoNeto)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-black text-cyan-300">{formatCOP(m.saldoFinal)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-950 font-mono font-bold text-xs border-t-2 border-white/20">
              <tr>
                <td className="py-3 px-3 text-white font-sans uppercase">Total / Cierre</td>
                <td className="py-3 px-3 text-right text-amber-400 font-black">
                  {formatCOP(data.kpis.recaudoPresupuestalTotal)}
                </td>
                <td className="py-3 px-3 text-right text-emerald-400 font-black">
                  {formatCOP(data.kpis.ingresosBancosTotal)}
                </td>
                <td className="py-3 px-3 text-right text-cyan-400 font-black">
                  +{formatCOP(data.kpis.ingresosBancosTotal - data.kpis.recaudoPresupuestalTotal)}
                </td>
                <td className="py-3 px-3 text-right text-rose-400 font-black">
                  {formatCOP(data.kpis.egresosBancosTotal)}
                </td>
                <td
                  className={`py-3 px-3 text-right font-black ${
                    data.kpis.ingresosBancosTotal - data.kpis.egresosBancosTotal >= 0
                      ? 'text-emerald-400'
                      : 'text-rose-400'
                  }`}
                >
                  {data.kpis.ingresosBancosTotal - data.kpis.egresosBancosTotal >= 0 ? '+' : ''}
                  {formatCOP(data.kpis.ingresosBancosTotal - data.kpis.egresosBancosTotal)}
                </td>
                <td className="py-3 px-3 text-right text-cyan-300 font-black text-sm">
                  {formatCOP(data.kpis.saldoRealTesoreria)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

        </>
      )}

      {/* 12. MODAL / DRILLDOWN POR RECURSO */}
      {selectedRecursoModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-amber-500/30 rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                  Detalle de Recurso Presupuestal
                </span>
                <h3 className="text-lg font-black text-white">{selectedRecursoModal.nombre}</h3>
              </div>
              <button
                onClick={() => setSelectedRecursoModal(null)}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                <span className="text-[10px] text-slate-400 block">Total Recaudado</span>
                <span className="text-base font-black text-emerald-400 font-mono">
                  {formatCOP(selectedRecursoModal.totalRecaudado)}
                </span>
              </div>
              <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                <span className="text-[10px] text-slate-400 block">Disponible (CSV)</span>
                <span className="text-base font-black text-amber-400 font-mono">
                  {formatCOP(selectedRecursoModal.totalDisponible)}
                </span>
              </div>
              <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                <span className="text-[10px] text-slate-400 block">% Ejecución</span>
                <span className="text-base font-black text-cyan-400 font-mono">
                  {selectedRecursoModal.porcentajeEjecucion.toFixed(1)}%
                </span>
              </div>
              <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                <span className="text-[10px] text-slate-400 block">Recursos Balance</span>
                <span className="text-base font-black text-purple-400 font-mono">
                  {selectedRecursoModal.totalBalance > 0 ? formatCOP(selectedRecursoModal.totalBalance) : '$ 0'}
                </span>
              </div>
            </div>

            {/* Conceptos Principales */}
            <div>
              <h4 className="text-xs font-bold text-white mb-2 uppercase tracking-wider">
                Conceptos de Ingreso Asociados ({selectedRecursoModal.conceptosCount})
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {selectedRecursoModal.topConceptos.map((c, i) => (
                  <div
                    key={i}
                    className="bg-black/20 p-2.5 rounded-xl border border-white/5 flex items-center justify-between text-xs"
                  >
                    <div className="truncate max-w-[360px]">
                      <span className="text-slate-200 font-medium block truncate">{c.concepto}</span>
                      <span className="text-[10px] text-slate-400">
                        Disponible CSV: <strong className="text-amber-400 font-mono">{formatCOP(c.disponible)}</strong>
                      </span>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <span className="font-mono text-emerald-400 font-bold block">{formatCOP(c.total)}</span>
                      <span className="text-[10px] text-slate-400">
                        {c.disponible > 0 ? `${((c.total / c.disponible) * 100).toFixed(1)}% rec.` : '100%'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* AVISO DE CORRESPONDENCIA BANCARIA ESTRICTA */}
            <div className="bg-amber-950/30 border border-amber-500/30 rounded-2xl p-3 text-[11px] text-amber-200/90 leading-relaxed">
              <strong>Principio de Rigor Financiero:</strong> No existe información suficiente en las fuentes primarias
              para establecer una correspondencia directa entre este recurso presupuestal y los movimientos bancarios
              específicos. Las cuentas bancarias reciben flujos agregados y traslados no amarrados a un único código
              presupuestal.
            </div>
          </div>
        </div>
      )}

      {/* 13. MODAL / DRILLDOWN POR CUENTA BANCARIA */}
      {selectedCuentaModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-cyan-500/30 rounded-3xl p-6 max-w-3xl w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block">
                  Detalle de Cuenta Bancaria
                </span>
                <h3 className="text-lg font-black text-white">{selectedCuentaModal.nombreCuenta}</h3>
                <p className="text-xs text-slate-400 font-mono">
                  {selectedCuentaModal.banco} • No. {selectedCuentaModal.noCuenta} • {selectedCuentaModal.clase}
                </p>
              </div>
              <button
                onClick={() => setSelectedCuentaModal(null)}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                <span className="text-[10px] text-slate-400 block">Saldo Inicial</span>
                <span className="text-sm font-black text-slate-200 font-mono">
                  {formatCOP(selectedCuentaModal.saldoInicial)}
                </span>
              </div>
              <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                <span className="text-[10px] text-slate-400 block">Entradas Totales</span>
                <span className="text-sm font-black text-emerald-400 font-mono">
                  {formatCOP(selectedCuentaModal.entradasTotales)}
                </span>
              </div>
              <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                <span className="text-[10px] text-slate-400 block">Salidas Totales</span>
                <span className="text-sm font-black text-rose-400 font-mono">
                  {formatCOP(selectedCuentaModal.salidasTotales)}
                </span>
              </div>
              <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                <span className="text-[10px] text-slate-400 block">Saldo Final</span>
                <span className="text-sm font-black text-cyan-400 font-mono">
                  {formatCOP(selectedCuentaModal.saldoFinal)}
                </span>
              </div>
            </div>

            {/* Evolución Mensual de la Cuenta */}
            <div>
              <h4 className="text-xs font-bold text-white mb-2 uppercase tracking-wider">Evolución Mensual del Saldo</h4>
              <div className="overflow-x-auto max-h-48">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-950 text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                    <tr>
                      <th className="py-2 px-2 border-b border-white/10">Mes</th>
                      <th className="py-2 px-2 border-b border-white/10 text-right">Saldo Inicial</th>
                      <th className="py-2 px-2 border-b border-white/10 text-right">Entradas</th>
                      <th className="py-2 px-2 border-b border-white/10 text-right">Salidas</th>
                      <th className="py-2 px-2 border-b border-white/10 text-right">Flujo Neto</th>
                      <th className="py-2 px-2 border-b border-white/10 text-right">Saldo Final</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono">
                    {selectedCuentaModal.mensual.map((m) => (
                      <tr key={m.mes} className="hover:bg-white/5">
                        <td className="py-1.5 px-2 font-bold text-white font-sans">{m.mes}</td>
                        <td className="py-1.5 px-2 text-right text-slate-300">{formatCOP(m.saldoInicial)}</td>
                        <td className="py-1.5 px-2 text-right text-emerald-400">{formatCOP(m.entradas)}</td>
                        <td className="py-1.5 px-2 text-right text-rose-400">{formatCOP(m.salidas)}</td>
                        <td
                          className={`py-1.5 px-2 text-right font-bold ${
                            m.flujoNeto >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {m.flujoNeto >= 0 ? '+' : ''}
                          {formatCOP(m.flujoNeto)}
                        </td>
                        <td className="py-1.5 px-2 text-right font-bold text-cyan-300">{formatCOP(m.saldoFinal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
