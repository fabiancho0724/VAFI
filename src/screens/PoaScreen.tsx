import React, { useState, useEffect, useMemo } from 'react';
import { 
  Layers, Download, RefreshCw, Search, Filter, RotateCcw, AlertTriangle, 
  CheckCircle2, DollarSign, Wallet, TrendingUp, PieChart as PieChartIcon, 
  ChevronDown, ChevronUp, ArrowUpDown, Building2, ShieldAlert, Sparkles, 
  Info, BarChart3, ChevronLeft, ChevronRight, FileSpreadsheet
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, 
  CartesianGrid, PieChart, Pie, Cell, Legend, ComposedChart, Line
} from 'recharts';
import { 
  PoaItem, fetchAndParsePOA, calculatePoaTotals, groupPoaBy, 
  formatCurrency, formatCurrencyShort, formatPercent, RECURSOS_MAP
} from '../lib/poaParser';

const PALETTE = ['#4ade80', '#38bdf8', '#fbbf24', '#f472b6', '#c084fc', '#a78bfa', '#f87171', '#34d399', '#60a5fa'];

export function PoaScreen({ onNavigate }: { onNavigate: (s: string) => void }) {
  const [data, setData] = useState<PoaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active Main Tab
  const [activeTab, setActiveTab] = useState<'distribucion' | 'graficas' | 'alertas' | 'tabla'>('distribucion');

  // Filters
  const [selectedUnidad, setSelectedUnidad] = useState('Todas');
  const [selectedRecurso, setSelectedRecurso] = useState('Todos');
  const [selectedTipoGasto, setSelectedTipoGasto] = useState('Todos');
  const [selectedFuente, setSelectedFuente] = useState('Todas');
  const [selectedRangoDisp, setSelectedRangoDisp] = useState('Todos');
  const [searchTerm, setSearchTerm] = useState('');

  // Table Pagination & Sorting
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [sortColumn, setSortColumn] = useState<keyof PoaItem>('valorDisponiblePoa');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Load POA data
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const items = await fetchAndParsePOA('/data/POA.csv');
      setData(items);
    } catch (err: any) {
      console.error('Error cargando POA.csv:', err);
      setError(err?.message || 'Error al cargar el archivo POA.csv');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter options dynamically extracted
  const unidadesList = useMemo(() => {
    const set = new Set(data.map(d => d.unidad).filter(Boolean));
    return Array.from(set).sort();
  }, [data]);

  const recursosList = useMemo(() => {
    const set = new Set(data.map(d => d.codigoRecurso).filter(Boolean));
    return Array.from(set).sort((a, b) => parseFloat(a) - parseFloat(b));
  }, [data]);

  const tiposGastoList = useMemo(() => {
    const set = new Set(data.map(d => d.tipoGasto).filter(Boolean));
    return Array.from(set).sort();
  }, [data]);

  const fuentesList = useMemo(() => {
    const set = new Set(data.map(d => d.codigoFuente).filter(Boolean));
    return Array.from(set).sort();
  }, [data]);

  // Filtered dataset
  const filteredData = useMemo(() => {
    return data.filter(item => {
      if (selectedUnidad !== 'Todas' && item.unidad !== selectedUnidad) return false;
      if (selectedRecurso !== 'Todos' && item.codigoRecurso !== selectedRecurso) return false;
      if (selectedTipoGasto !== 'Todos' && item.tipoGasto !== selectedTipoGasto) return false;
      if (selectedFuente !== 'Todas' && item.codigoFuente !== selectedFuente) return false;

      if (selectedRangoDisp === 'alto' && item.valorDisponiblePoa < 1000000000) return false;
      if (selectedRangoDisp === 'medio' && (item.valorDisponiblePoa < 100000000 || item.valorDisponiblePoa >= 1000000000)) return false;
      if (selectedRangoDisp === 'bajo' && (item.valorDisponiblePoa <= 0 || item.valorDisponiblePoa >= 100000000)) return false;
      if (selectedRangoDisp === 'agotado' && item.valorDisponiblePoa > 0) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchConcepto = item.concepto.toLowerCase().includes(q);
        const matchCodigo = item.codigoConcepto.toLowerCase().includes(q);
        const matchUnidad = item.unidad.toLowerCase().includes(q);
        const matchRecurso = item.codigoRecurso.toLowerCase().includes(q);
        if (!matchConcepto && !matchCodigo && !matchUnidad && !matchRecurso) return false;
      }

      return true;
    });
  }, [data, selectedUnidad, selectedRecurso, selectedTipoGasto, selectedFuente, selectedRangoDisp, searchTerm]);

  // Global Totals vs Filtered Totals
  const globalTotals = useMemo(() => calculatePoaTotals(data), [data]);
  const filteredTotals = useMemo(() => calculatePoaTotals(filteredData), [filteredData]);

  // Reset all filters
  const handleResetFilters = () => {
    setSelectedUnidad('Todas');
    setSelectedRecurso('Todos');
    setSelectedTipoGasto('Todos');
    setSelectedFuente('Todas');
    setSelectedRangoDisp('Todos');
    setSearchTerm('');
    setCurrentPage(1);
  };

  // Sorting
  const sortedData = useMemo(() => {
    const list = [...filteredData];
    list.sort((a, b) => {
      const valA = a[sortColumn];
      const valB = b[sortColumn];

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }
      const strA = String(valA || '').toLowerCase();
      const strB = String(valB || '').toLowerCase();
      return sortDirection === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });
    return list;
  }, [filteredData, sortColumn, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(sortedData.length / rowsPerPage) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return sortedData.slice(start, start + rowsPerPage);
  }, [sortedData, currentPage, rowsPerPage]);

  const handleSort = (column: keyof PoaItem) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
    setCurrentPage(1);
  };

  // Groupings for Visualizations
  const recursoSummary = useMemo(() => {
    return groupPoaBy(
      filteredData, 
      d => d.codigoRecurso, 
      d => `${d.codigoRecurso} - ${RECURSOS_MAP[d.codigoRecurso] || 'Recurso ' + d.codigoRecurso}`
    );
  }, [filteredData]);

  const unidadSummary = useMemo(() => {
    return groupPoaBy(filteredData, d => d.unidad);
  }, [filteredData]);

  const tipoGastoSummary = useMemo(() => {
    return groupPoaBy(filteredData, d => d.tipoGasto);
  }, [filteredData]);

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredData.length === 0) return;
    const headers = [
      'Vigencia', 'Unidad', 'Gasto', 'Objeto', 'Tipo de Gasto', 
      'Codigo Concepto', 'Recurso', 'Fuente', 'Concepto', 
      'POA Inicial', 'Modificaciones', 'POA Programado', 'Solicitudes', 'Disponible POA', '% Disponible'
    ];
    const rows = filteredData.map(d => [
      `"${d.vigencia}"`,
      `"${d.unidad}"`,
      `"${d.gasto}"`,
      `"${d.objeto}"`,
      `"${d.tipoGasto}"`,
      `"${d.codigoConcepto}"`,
      `"${d.codigoRecurso}"`,
      `"${d.codigoFuente}"`,
      `"${d.concepto.replace(/"/g, '""')}"`,
      d.valorPoaInicial,
      d.valorModificaciones,
      d.valorProgramadoPoa,
      d.valorSolicitudes,
      d.valorDisponiblePoa,
      d.pctDisponible.toFixed(2)
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `POA_UPTC_Disponible_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-12 h-12 border-4 border-[#ffcc29] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-on-surface-variant font-mono text-sm">Cargando base de datos del POA 2026...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center space-y-4">
        <AlertTriangle size={48} className="mx-auto text-rose-500" />
        <h2 className="text-xl font-bold text-white">Error cargando información del POA</h2>
        <p className="text-slate-400 text-sm max-w-md mx-auto">{error}</p>
        <button 
          onClick={loadData}
          className="px-4 py-2 bg-[#ffcc29] text-black font-bold text-xs rounded-xl uppercase tracking-wider"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto px-4 md:px-6 animate-in fade-in duration-500">
      
      {/* ========================================================= */}
      {/* TOP HEADER BAR                                            */}
      {/* ========================================================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 bg-[#ffcc29]/10 border border-[#ffcc29]/20 px-3 py-1 rounded-full mb-2">
            <Layers size={14} className="text-[#ffcc29]" />
            <span className="text-[11px] font-mono font-bold text-[#ffcc29] uppercase tracking-wider">
              Vigencia Fiscal 2026 — Plan Operativo Anual
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-display font-extrabold text-white tracking-tight">
            Control de POA y Fondos Disponibles
          </h1>
          <p className="text-xs md:text-sm text-on-surface-variant mt-1 max-w-3xl">
            Monitoreo en tiempo real de la programación presupuestal, solicitudes tramitadas y saldos disponibles por Unidad Ejecutora, Recurso de Financiación y Rubro.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer uppercase tracking-wider"
            title="Exportar registros filtrados a CSV / Excel"
          >
            <FileSpreadsheet size={15} />
            Exportar CSV
          </button>
          <button
            onClick={handleResetFilters}
            className="px-3.5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            title="Restablecer filtros a la vista general"
          >
            <RotateCcw size={14} />
            Restablecer
          </button>
          <button
            onClick={loadData}
            className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-slate-300 hover:text-white transition-all cursor-pointer"
            title="Recargar base de datos"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 4 GLOBAL KPI CARDS                                        */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: POA Programado */}
        <div className="glass-card p-5 rounded-2xl border border-white/5 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="text-xs font-mono text-on-surface-variant uppercase tracking-wider">POA Programado</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <Wallet size={18} />
            </div>
          </div>
          <p className="text-2xl font-mono font-bold text-white mt-2">
            {formatCurrencyShort(filteredTotals.programado)}
          </p>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 font-mono pt-2 border-t border-white/5">
            <span>Inicial: {formatCurrencyShort(filteredTotals.poaInicial)}</span>
            <span className="text-emerald-400">Modif: +{formatCurrencyShort(filteredTotals.modificaciones)}</span>
          </div>
        </div>

        {/* Card 2: Solicitudes / Comprometido */}
        <div className="glass-card p-5 rounded-2xl border border-white/5 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="text-xs font-mono text-on-surface-variant uppercase tracking-wider">Solicitudes (Comprometido)</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
              <TrendingUp size={18} />
            </div>
          </div>
          <p className="text-2xl font-mono font-bold text-rose-400 mt-2">
            {formatCurrencyShort(filteredTotals.solicitudes)}
          </p>
          <div className="mt-2 flex items-center justify-between text-[11px] font-mono pt-2 border-t border-white/5">
            <span className="text-slate-400">Avance de Solicitud:</span>
            <span className="text-rose-400 font-bold">{formatPercent(filteredTotals.pctEjecutado)}</span>
          </div>
        </div>

        {/* Card 3: DISPONIBLE TOTAL (GRAN DESTACADO) */}
        <div className="glass-card p-5 rounded-2xl border-2 border-emerald-500/40 bg-emerald-950/20 relative overflow-hidden shadow-lg shadow-emerald-500/10">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-mono text-emerald-400 font-bold uppercase tracking-wider block">
                DISPONIBLE TOTAL POA
              </span>
              <span className="text-[10px] text-emerald-300/70">Fondos libres por comprometer</span>
            </div>
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <DollarSign size={20} />
            </div>
          </div>
          <p className="text-2xl md:text-3xl font-mono font-black text-emerald-300 mt-2">
            {formatCurrencyShort(filteredTotals.disponible)}
          </p>
          <div className="mt-2 flex items-center justify-between text-[11px] font-mono pt-2 border-t border-emerald-500/20">
            <span className="text-emerald-200/80">Tasa de Disponibilidad:</span>
            <span className="text-emerald-300 font-bold bg-emerald-500/20 px-2 py-0.5 rounded-full">
              {formatPercent(filteredTotals.pctDisponible)}
            </span>
          </div>
        </div>

        {/* Card 4: Desglose del Disponible */}
        <div className="glass-card p-5 rounded-2xl border border-white/5 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="text-xs font-mono text-on-surface-variant uppercase tracking-wider">Desglose Disponible</span>
            <div className="p-2 rounded-xl bg-[#ffcc29]/10 text-[#ffcc29]">
              <PieChartIcon size={18} />
            </div>
          </div>
          <div className="mt-2 space-y-1 text-[11px] font-mono">
            <div className="flex justify-between">
              <span className="text-slate-400">Personal:</span>
              <span className="text-white font-bold">{formatCurrencyShort(tipoGastoSummary.find(t => t.key.includes('Personal'))?.disponible || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Funcionamiento:</span>
              <span className="text-white font-bold">{formatCurrencyShort(tipoGastoSummary.find(t => t.key.includes('Funcionamiento'))?.disponible || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Inversión:</span>
              <span className="text-white font-bold">{formatCurrencyShort(tipoGastoSummary.find(t => t.key.includes('Invers'))?.disponible || 0)}</span>
            </div>
          </div>
          <div className="mt-2 text-[10px] text-slate-500 pt-1 border-t border-white/5 truncate">
            {filteredData.length} registros seleccionados
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* FILTER BAR                                                */}
      {/* ========================================================= */}
      <div className="glass-card p-4 rounded-2xl border border-white/10 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-300 font-mono">
            <Filter size={14} className="text-[#ffcc29]" />
            <span>Filtros Multidimensionales del POA</span>
          </div>
          {(selectedUnidad !== 'Todas' || selectedRecurso !== 'Todos' || selectedTipoGasto !== 'Todos' || selectedFuente !== 'Todas' || selectedRangoDisp !== 'Todos' || searchTerm) && (
            <button
              onClick={handleResetFilters}
              className="text-[11px] text-[#ffcc29] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw size={12} /> Limpiar todos los filtros
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
          {/* Filtro Unidad */}
          <div className="space-y-1">
            <label className="text-[10px] font-mono text-slate-400 uppercase block">Unidad / Facultad</label>
            <select
              value={selectedUnidad}
              onChange={(e) => { setSelectedUnidad(e.target.value); setCurrentPage(1); }}
              className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-2.5 py-2 outline-none focus:border-[#ffcc29] text-xs truncate"
            >
              <option value="Todas">Todas las Unidades ({unidadesList.length})</option>
              {unidadesList.map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>

          {/* Filtro Recurso */}
          <div className="space-y-1">
            <label className="text-[10px] font-mono text-slate-400 uppercase block">Recurso de Financiación</label>
            <select
              value={selectedRecurso}
              onChange={(e) => { setSelectedRecurso(e.target.value); setCurrentPage(1); }}
              className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-2.5 py-2 outline-none focus:border-[#ffcc29] text-xs truncate"
            >
              <option value="Todos">Todos los Recursos ({recursosList.length})</option>
              {recursosList.map(r => (
                <option key={r} value={r}>R{r} - {RECURSOS_MAP[r] || 'Recurso ' + r}</option>
              ))}
            </select>
          </div>

          {/* Filtro Tipo de Gasto */}
          <div className="space-y-1">
            <label className="text-[10px] font-mono text-slate-400 uppercase block">Tipo de Gasto</label>
            <select
              value={selectedTipoGasto}
              onChange={(e) => { setSelectedTipoGasto(e.target.value); setCurrentPage(1); }}
              className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-2.5 py-2 outline-none focus:border-[#ffcc29] text-xs truncate"
            >
              <option value="Todos">Todos los Tipos</option>
              {tiposGastoList.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Filtro Fuente */}
          <div className="space-y-1">
            <label className="text-[10px] font-mono text-slate-400 uppercase block">Fuente</label>
            <select
              value={selectedFuente}
              onChange={(e) => { setSelectedFuente(e.target.value); setCurrentPage(1); }}
              className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-2.5 py-2 outline-none focus:border-[#ffcc29] text-xs"
            >
              <option value="Todas">Todas las Fuentes</option>
              {fuentesList.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          {/* Filtro Rango de Disponible */}
          <div className="space-y-1">
            <label className="text-[10px] font-mono text-slate-400 uppercase block">Nivel de Disponible</label>
            <select
              value={selectedRangoDisp}
              onChange={(e) => { setSelectedRangoDisp(e.target.value); setCurrentPage(1); }}
              className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-2.5 py-2 outline-none focus:border-[#ffcc29] text-xs"
            >
              <option value="Todos">Todos los Niveles</option>
              <option value="alto">Alto (&gt; $1.000 Millones)</option>
              <option value="medio">Medio ($100M - $1.000M)</option>
              <option value="bajo">Bajo (&lt; $100M)</option>
              <option value="agotado">Agotado ($0)</option>
            </select>
          </div>

          {/* Buscador libre */}
          <div className="space-y-1">
            <label className="text-[10px] font-mono text-slate-400 uppercase block">Buscar Concepto / Código</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Ej. Vigilancia, Sueldo..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl pl-8 pr-3 py-2 outline-none focus:border-[#ffcc29] text-xs"
              />
              <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* NAVIGATION TABS                                           */}
      {/* ========================================================= */}
      <div className="flex border-b border-white/10 gap-2 overflow-x-auto pb-1 text-xs font-mono font-bold">
        <button
          onClick={() => setActiveTab('distribucion')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'distribucion'
              ? 'bg-[#ffcc29] text-black shadow-lg shadow-[#ffcc29]/20'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <DollarSign size={15} />
          ¿Dónde está el Disponible?
        </button>
        <button
          onClick={() => setActiveTab('graficas')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'graficas'
              ? 'bg-[#ffcc29] text-black shadow-lg shadow-[#ffcc29]/20'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <BarChart3 size={15} />
          Gráficas de Análisis
        </button>
        <button
          onClick={() => setActiveTab('alertas')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'alertas'
              ? 'bg-[#ffcc29] text-black shadow-lg shadow-[#ffcc29]/20'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <AlertTriangle size={15} />
          Bolsas y Alertas
        </button>
        <button
          onClick={() => setActiveTab('tabla')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'tabla'
              ? 'bg-[#ffcc29] text-black shadow-lg shadow-[#ffcc29]/20'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Layers size={15} />
          Tabla Detallada ({filteredData.length})
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: ¿DÓNDE ESTÁ EL DISPONIBLE? (ANÁLISIS EJECUTIVO)   */}
      {/* ========================================================= */}
      {activeTab === 'distribucion' && (
        <div className="space-y-6">
          
          {/* Intro Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={14} /> Localización Estratégica de Fondos Libres
              </span>
              <h3 className="text-lg font-bold text-white">
                Total Disponible Seleccionado: <span className="text-emerald-400 font-mono font-black">{formatCurrency(filteredTotals.disponible)}</span>
              </h3>
              <p className="text-xs text-slate-400 max-w-3xl">
                El 91% del dinero disponible institucional se encuentra en la Sede Central (Unidad 01 - Administrativa y Financiera) principalmente por reservas de nómina y contratos de funcionamiento, seguido por Seccionales y Facultades.
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs font-mono text-slate-400 block">Tasa Global</span>
              <span className="text-xl font-mono font-bold text-emerald-400">{formatPercent(filteredTotals.pctDisponible)}</span>
            </div>
          </div>

          {/* Grid 2 Columnas: Por Recurso y Por Unidad */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* 1. Ranking de Disponible por Recurso */}
            <div className="glass-card p-5 rounded-2xl border border-white/5 space-y-4">
              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                <div>
                  <h4 className="text-sm font-bold text-white uppercase font-mono flex items-center gap-2">
                    <Wallet size={16} className="text-[#ffcc29]" />
                    Disponible por Recurso Financiero
                  </h4>
                  <p className="text-[11px] text-slate-400">Fondos libres por código presupuestal</p>
                </div>
                <span className="text-xs font-mono text-slate-400">{recursoSummary.length} recursos</span>
              </div>

              <div className="space-y-3 max-h-[480px] overflow-y-auto pr-2 custom-scrollbar">
                {recursoSummary.map((rec) => (
                  <div key={rec.key} className="p-3 bg-white/5 rounded-xl border border-white/5 hover:border-[#ffcc29]/30 transition-all">
                    <div className="flex justify-between items-center text-xs mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[#ffcc29] bg-[#ffcc29]/10 px-2 py-0.5 rounded">
                          R{rec.key}
                        </span>
                        <span className="text-white font-bold truncate max-w-[220px]" title={rec.name}>
                          {RECURSOS_MAP[rec.key] || rec.name}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-emerald-400">
                        {formatCurrencyShort(rec.disponible)}
                      </span>
                    </div>

                    {/* Barra visual de Progreso */}
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden flex">
                      <div 
                        className="bg-rose-500 h-full" 
                        style={{ width: `${Math.min(100, rec.pctEjecutado)}%` }} 
                        title={`Solicitado: ${formatPercent(rec.pctEjecutado)}`}
                      />
                      <div 
                        className="bg-emerald-500 h-full" 
                        style={{ width: `${Math.min(100, rec.pctDisponible)}%` }} 
                        title={`Disponible: ${formatPercent(rec.pctDisponible)}`}
                      />
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono mt-1">
                      <span>Prog: {formatCurrencyShort(rec.programado)}</span>
                      <span>Solicitado: {formatCurrencyShort(rec.solicitudes)} ({formatPercent(rec.pctEjecutado)})</span>
                      <span className="text-emerald-300 font-bold">{formatPercent(rec.pctDisponible)} libre</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Ranking de Disponible por Unidad Ejecutora */}
            <div className="glass-card p-5 rounded-2xl border border-white/5 space-y-4">
              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                <div>
                  <h4 className="text-sm font-bold text-white uppercase font-mono flex items-center gap-2">
                    <Building2 size={16} className="text-blue-400" />
                    Disponible por Unidad / Facultad
                  </h4>
                  <p className="text-[11px] text-slate-400">Saldos libres en dependencias y seccionales</p>
                </div>
                <span className="text-xs font-mono text-slate-400">{unidadSummary.length} unidades</span>
              </div>

              <div className="space-y-3 max-h-[480px] overflow-y-auto pr-2 custom-scrollbar">
                {unidadSummary.map((u) => (
                  <div key={u.key} className="p-3 bg-white/5 rounded-xl border border-white/5 hover:border-blue-400/30 transition-all">
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="text-white font-bold truncate max-w-[260px]" title={u.name}>
                        {u.name}
                      </span>
                      <span className="font-mono font-bold text-emerald-400">
                        {formatCurrencyShort(u.disponible)}
                      </span>
                    </div>

                    {/* Barra visual de Progreso */}
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden flex">
                      <div 
                        className="bg-rose-500 h-full" 
                        style={{ width: `${Math.min(100, u.pctEjecutado)}%` }} 
                        title={`Solicitado: ${formatPercent(u.pctEjecutado)}`}
                      />
                      <div 
                        className="bg-emerald-500 h-full" 
                        style={{ width: `${Math.min(100, u.pctDisponible)}%` }} 
                        title={`Disponible: ${formatPercent(u.pctDisponible)}`}
                      />
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono mt-1">
                      <span>Prog: {formatCurrencyShort(u.programado)}</span>
                      <span>Solicitado: {formatCurrencyShort(u.solicitudes)}</span>
                      <span className="text-emerald-300 font-bold">{formatPercent(u.pctDisponible)} libre</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* 3. Desglose por Tipo de Gasto */}
          <div className="glass-card p-5 rounded-2xl border border-white/5 space-y-4">
            <h4 className="text-sm font-bold text-white uppercase font-mono flex items-center gap-2">
              <PieChartIcon size={16} className="text-purple-400" />
              Disponible por Tipo de Gasto Institucional
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {tipoGastoSummary.map((t, idx) => (
                <div key={t.key} className="p-4 bg-white/5 rounded-xl border border-white/5 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PALETTE[idx % PALETTE.length] }}></div>
                    <span className="text-xs font-bold text-white truncate" title={t.name}>{t.name}</span>
                  </div>
                  <p className="text-lg font-mono font-black text-emerald-400">
                    {formatCurrencyShort(t.disponible)}
                  </p>
                  <div className="text-[10px] text-slate-400 font-mono space-y-0.5 pt-1 border-t border-white/5">
                    <div className="flex justify-between">
                      <span>Programado:</span>
                      <span className="text-white">{formatCurrencyShort(t.programado)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Solicitado:</span>
                      <span className="text-rose-400">{formatCurrencyShort(t.solicitudes)}</span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span className="text-emerald-300">% Disponible:</span>
                      <span className="text-emerald-300">{formatPercent(t.pctDisponible)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: GRÁFICAS DE ANÁLISIS                               */}
      {/* ========================================================= */}
      {activeTab === 'graficas' && (
        <div className="space-y-6">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gráfica 1: Programado vs Solicitudes vs Disponible por Recurso */}
            <div className="glass-card p-5 rounded-2xl border border-white/5 space-y-3">
              <h4 className="text-sm font-bold text-white uppercase font-mono flex items-center gap-2">
                <BarChart3 size={16} className="text-[#ffcc29]" />
                Programado vs Solicitado vs Disponible (Top 8 Recursos)
              </h4>
              <p className="text-xs text-slate-400">Comparativa en miles de millones de pesos ($MM)</p>

              <div className="h-80 w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={recursoSummary.slice(0, 8).map(r => ({
                    name: `R${r.key}`,
                    Programado: r.programado / 1e9,
                    Solicitudes: r.solicitudes / 1e9,
                    Disponible: r.disponible / 1e9
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `$${v}B`} />
                    <RechartsTooltip 
                      formatter={(val: any) => [`$${Number(val).toFixed(2)}B COP`, '']}
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Bar dataKey="Programado" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Solicitudes" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Disponible" fill="#4ade80" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Gráfica 2: Top 8 Unidades con Mayor Disponible */}
            <div className="glass-card p-5 rounded-2xl border border-white/5 space-y-3">
              <h4 className="text-sm font-bold text-white uppercase font-mono flex items-center gap-2">
                <Building2 size={16} className="text-emerald-400" />
                Top 8 Unidades con Mayor Saldo Disponible
              </h4>
              <p className="text-xs text-slate-400">Concentración de recursos libres por facultad / seccional</p>

              <div className="h-80 w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    layout="vertical"
                    data={unidadSummary.slice(0, 8).map(u => ({
                      name: u.name.length > 25 ? u.name.substring(0, 25) + '...' : u.name,
                      disponible: u.disponible / 1e9,
                      fullName: u.name
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" horizontal={false} />
                    <XAxis type="number" stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `$${v}B`} />
                    <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={10} width={130} />
                    <RechartsTooltip 
                      formatter={(val: any) => [`$${Number(val).toFixed(2)}B COP`, 'Disponible']}
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px' }}
                    />
                    <Bar dataKey="disponible" fill="#4ade80" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Gráfica 3: Torta de Distribución por Tipo de Gasto */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-card p-5 rounded-2xl border border-white/5 space-y-3">
              <h4 className="text-sm font-bold text-white uppercase font-mono flex items-center gap-2">
                <PieChartIcon size={16} className="text-purple-400" />
                Composición Porcentual del Disponible
              </h4>
              <p className="text-xs text-slate-400">Participación de cada macro-rubro en el disponible total</p>

              <div className="h-72 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={tipoGastoSummary.map(t => ({
                        name: t.name,
                        value: t.disponible
                      }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={95}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {tipoGastoSummary.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      formatter={(val: any) => [formatCurrency(Number(val)), 'Disponible']}
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Gráfica 4: Tasa de Ejecución vs Tasa de Disponibilidad */}
            <div className="glass-card p-5 rounded-2xl border border-white/5 space-y-3">
              <h4 className="text-sm font-bold text-white uppercase font-mono flex items-center gap-2">
                <TrendingUp size={16} className="text-cyan-400" />
                % Solicitado vs % Disponible por Recurso
              </h4>
              <p className="text-xs text-slate-400">Nivel relativo de avance contractual</p>

              <div className="h-72 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={recursoSummary.slice(0, 10).map(r => ({
                    name: `R${r.key}`,
                    '% Solicitado': r.pctEjecutado,
                    '% Disponible': r.pctDisponible
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
                    <RechartsTooltip 
                      formatter={(val: any) => [`${Number(val).toFixed(1)}%`, '']}
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="% Solicitado" fill="#f43f5e" stackId="a" />
                    <Bar dataKey="% Disponible" fill="#4ade80" stackId="a" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: ALERTAS Y BOLSAS DE DINERO                         */}
      {/* ========================================================= */}
      {activeTab === 'alertas' && (
        <div className="space-y-6">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Top Bolsas de Mayor Dinero Disponible (> $1.000 Millones) */}
            <div className="glass-card p-5 rounded-2xl border border-emerald-500/20 bg-emerald-950/10 space-y-4">
              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                <div>
                  <h4 className="text-sm font-bold text-emerald-400 uppercase font-mono flex items-center gap-2">
                    <CheckCircle2 size={16} />
                    Mayores Bolsas de Dinero Disponible (&gt; $500M)
                  </h4>
                  <p className="text-[11px] text-slate-400">Conceptos con alto saldo disponible sin comprometer</p>
                </div>
              </div>

              <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                {filteredData
                  .filter(d => d.valorDisponiblePoa >= 500000000)
                  .sort((a, b) => b.valorDisponiblePoa - a.valorDisponiblePoa)
                  .slice(0, 15)
                  .map(item => (
                    <div key={item.id} className="p-3 bg-slate-900/80 rounded-xl border border-emerald-500/20 space-y-1.5">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-xs font-bold text-white block">{item.concepto}</span>
                          <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                            {item.unidad} | R{item.codigoRecurso} ({item.recursoNombre})
                          </span>
                        </div>
                        <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                          {formatCurrency(item.valorDisponiblePoa)}
                        </span>
                      </div>
                      <div className="flex justify-between text-[10px] font-mono text-slate-400 pt-1 border-t border-white/5">
                        <span>Prog: {formatCurrencyShort(item.valorProgramadoPoa)}</span>
                        <span>Solicitado: {formatCurrencyShort(item.valorSolicitudes)} ({formatPercent(item.pctEjecutado)})</span>
                        <span className="text-emerald-300 font-bold">{formatPercent(item.pctDisponible)} disponible</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Rubros Críticos (< 10% Disponible o Agotados) */}
            <div className="glass-card p-5 rounded-2xl border border-rose-500/20 bg-rose-950/10 space-y-4">
              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                <div>
                  <h4 className="text-sm font-bold text-rose-400 uppercase font-mono flex items-center gap-2">
                    <ShieldAlert size={16} />
                    Rubros en Riesgo de Agotamiento (&lt; 10% Disponible)
                  </h4>
                  <p className="text-[11px] text-slate-400">Conceptos con poca o nula disponibilidad presupuestal</p>
                </div>
              </div>

              <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                {filteredData
                  .filter(d => d.valorProgramadoPoa > 10000000 && d.pctDisponible < 10)
                  .sort((a, b) => a.pctDisponible - b.pctDisponible)
                  .slice(0, 15)
                  .map(item => (
                    <div key={item.id} className="p-3 bg-slate-900/80 rounded-xl border border-rose-500/20 space-y-1.5">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-xs font-bold text-white block">{item.concepto}</span>
                          <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                            {item.unidad} | R{item.codigoRecurso} ({item.recursoNombre})
                          </span>
                        </div>
                        <span className="text-xs font-mono font-bold text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-500/30">
                          {formatCurrency(item.valorDisponiblePoa)}
                        </span>
                      </div>
                      <div className="flex justify-between text-[10px] font-mono text-slate-400 pt-1 border-t border-white/5">
                        <span>Prog: {formatCurrencyShort(item.valorProgramadoPoa)}</span>
                        <span>Solicitado: {formatCurrencyShort(item.valorSolicitudes)} ({formatPercent(item.pctEjecutado)})</span>
                        <span className="text-rose-300 font-bold">{formatPercent(item.pctDisponible)} disponible</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: TABLA DETALLADA COMPLETA (1.454 REGISTROS)         */}
      {/* ========================================================= */}
      {activeTab === 'tabla' && (
        <div className="glass-card rounded-2xl border border-white/10 overflow-hidden space-y-4 p-4">
          
          {/* Subtotal Banner */}
          <div className="flex flex-wrap items-center justify-between p-3 bg-slate-900/80 rounded-xl border border-white/5 text-xs font-mono">
            <div>
              <span className="text-slate-400">Registros Filtrados: </span>
              <span className="text-white font-bold">{filteredData.length}</span> de {data.length}
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <span className="text-slate-400">Programado: </span>
                <span className="text-blue-400 font-bold">{formatCurrencyShort(filteredTotals.programado)}</span>
              </div>
              <div>
                <span className="text-slate-400">Solicitudes: </span>
                <span className="text-rose-400 font-bold">{formatCurrencyShort(filteredTotals.solicitudes)}</span>
              </div>
              <div>
                <span className="text-slate-400">Disponible: </span>
                <span className="text-emerald-400 font-bold">{formatCurrency(filteredTotals.disponible)}</span>
              </div>
              <div>
                <span className="text-slate-400">% Disp: </span>
                <span className="text-emerald-400 font-bold">{formatPercent(filteredTotals.pctDisponible)}</span>
              </div>
            </div>
          </div>

          {/* Tabla */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse font-sans">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-900/90 text-[11px] font-mono uppercase text-slate-300">
                  <th onClick={() => handleSort('codigoConcepto')} className="p-3 cursor-pointer hover:text-white">
                    <div className="flex items-center gap-1">Código <ArrowUpDown size={12} /></div>
                  </th>
                  <th onClick={() => handleSort('concepto')} className="p-3 cursor-pointer hover:text-white min-w-[220px]">
                    <div className="flex items-center gap-1">Concepto <ArrowUpDown size={12} /></div>
                  </th>
                  <th onClick={() => handleSort('unidad')} className="p-3 cursor-pointer hover:text-white min-w-[160px]">
                    <div className="flex items-center gap-1">Unidad <ArrowUpDown size={12} /></div>
                  </th>
                  <th onClick={() => handleSort('codigoRecurso')} className="p-3 cursor-pointer hover:text-white">
                    <div className="flex items-center gap-1">Recurso <ArrowUpDown size={12} /></div>
                  </th>
                  <th onClick={() => handleSort('codigoFuente')} className="p-3 cursor-pointer hover:text-white">
                    <div className="flex items-center gap-1">Fuente <ArrowUpDown size={12} /></div>
                  </th>
                  <th onClick={() => handleSort('valorProgramadoPoa')} className="p-3 text-right cursor-pointer hover:text-white">
                    <div className="flex items-center justify-end gap-1">Programado <ArrowUpDown size={12} /></div>
                  </th>
                  <th onClick={() => handleSort('valorSolicitudes')} className="p-3 text-right cursor-pointer hover:text-white">
                    <div className="flex items-center justify-end gap-1">Solicitudes <ArrowUpDown size={12} /></div>
                  </th>
                  <th onClick={() => handleSort('valorDisponiblePoa')} className="p-3 text-right cursor-pointer text-emerald-400 hover:text-emerald-300">
                    <div className="flex items-center justify-end gap-1">Disponible POA <ArrowUpDown size={12} /></div>
                  </th>
                  <th onClick={() => handleSort('pctDisponible')} className="p-3 text-right cursor-pointer hover:text-white">
                    <div className="flex items-center justify-end gap-1">% Disp <ArrowUpDown size={12} /></div>
                  </th>
                  <th className="p-3 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {paginatedData.map((item) => (
                  <tr key={item.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-3 font-mono text-slate-400 text-[11px] whitespace-nowrap">
                      {item.codigoConcepto}
                    </td>
                    <td className="p-3 text-white font-medium">
                      <span className="block">{item.concepto}</span>
                      <span className="text-[10px] text-slate-500 font-mono block">{item.tipoGasto}</span>
                    </td>
                    <td className="p-3 text-slate-300 text-[11px] truncate max-w-[180px]" title={item.unidad}>
                      {item.unidad}
                    </td>
                    <td className="p-3 font-mono text-center">
                      <span className="bg-slate-800 text-[#ffcc29] px-2 py-0.5 rounded text-[11px] font-bold border border-slate-700">
                        R{item.codigoRecurso}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-center text-slate-300 text-[11px]">
                      {item.codigoFuente}
                    </td>
                    <td className="p-3 text-right font-mono text-slate-300 whitespace-nowrap">
                      {formatCurrency(item.valorProgramadoPoa)}
                    </td>
                    <td className="p-3 text-right font-mono text-rose-400 whitespace-nowrap">
                      {formatCurrency(item.valorSolicitudes)}
                    </td>
                    <td className="p-3 text-right font-mono text-emerald-400 font-bold whitespace-nowrap bg-emerald-950/20">
                      {formatCurrency(item.valorDisponiblePoa)}
                    </td>
                    <td className="p-3 text-right font-mono text-emerald-300 font-bold whitespace-nowrap">
                      {formatPercent(item.pctDisponible)}
                    </td>
                    <td className="p-3 text-center whitespace-nowrap">
                      {item.estadoDisponible === 'ALTO' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          🟢 Alto
                        </span>
                      )}
                      {item.estadoDisponible === 'MEDIO' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          🟡 Medio
                        </span>
                      )}
                      {item.estadoDisponible === 'CRITICO' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                          🟠 Crítico
                        </span>
                      )}
                      {item.estadoDisponible === 'AGOTADO' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                          🔴 Agotado
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-white/5 text-xs text-slate-400 font-mono">
            <div className="flex items-center gap-2">
              <span>Mostrar</span>
              <select
                value={rowsPerPage}
                onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className="bg-slate-900 border border-slate-700 text-white rounded-lg px-2 py-1 outline-none text-xs"
              >
                <option value={20}>20</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span>registros por página</span>
            </div>

            <div className="flex items-center gap-2">
              <span>Página {currentPage} de {totalPages}</span>
              <div className="flex gap-1">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed text-white cursor-pointer"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed text-white cursor-pointer"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
