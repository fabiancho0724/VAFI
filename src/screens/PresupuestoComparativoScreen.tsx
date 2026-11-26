import React, { useState, useMemo, useRef } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  Landmark,
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart as PieIcon,
  BarChart3,
  Layers,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  FileText,
  Search,
  Filter,
  Download,
  Upload,
  RefreshCw,
  Printer,
  Copy,
  ChevronRight,
  Info,
  Scale,
  Building,
  GraduationCap,
  Percent,
  Sliders,
  Sparkles,
  ExternalLink,
  HelpCircle,
  Clock,
  ArrowUpDown
} from 'lucide-react';
import {
  PresupuestoItem,
  ComparisonRow,
  RecursoComparison,
  RubroAggregatedComparison,
  UnidadComparison,
  PresupuestoComparativoResult,
  loadDefaultData,
  buildPresupuestoComparativo,
  parsePresupuestoCSV,
  exportComparativoToExcel,
  exportComparativoToCSV,
  generateExecutiveReportMarkdown,
  formatCOP,
  formatCOPM,
  formatPercent,
  formatPP
} from '../lib/presupuestoComparativoEngine';

const COLORS_RECURSOS = [
  '#FFCC29', '#38bdf8', '#34d399', '#f472b6', '#a78bfa',
  '#fb923c', '#e879f9', '#4ade80', '#60a5fa', '#f87171'
];

interface PresupuestoComparativoScreenProps {
  onNavigate?: (screen: string) => void;
}

export function PresupuestoComparativoScreen({ onNavigate }: PresupuestoComparativoScreenProps) {
  const defaultData = useMemo(() => loadDefaultData(), []);
  const [data2025, setData2025] = useState<PresupuestoItem[]>(defaultData.data2025);
  const [data2026, setData2026] = useState<PresupuestoItem[]>(defaultData.data2026);
  const [ipcRate, setIpcRate] = useState<number>(0.052);
  const [activeTab, setActiveTab] = useState<
    'resumen' | 'recursos' | 'rubros' | 'componentes' | 'indicadores' | 'transformaciones' | 'informe'
  >('resumen');

  const [rubroSubFilter, setRubroSubFilter] = useState<
    'todos' | 'top_inc_abs' | 'top_inc_pct' | 'top_red_abs' | 'top_red_pct' | 'nuevos' | 'extintos' | 'estables'
  >('todos');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [tipoGastoFilter, setTipoGastoFilter] = useState<'TODOS' | 'Funcionamiento' | 'Inversión'>('TODOS');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 15;

  const [copiedReport, setCopiedReport] = useState<boolean>(false);
  const fileInput2025Ref = useRef<HTMLInputElement>(null);
  const fileInput2026Ref = useRef<HTMLInputElement>(null);

  const result: PresupuestoComparativoResult = useMemo(() => {
    return buildPresupuestoComparativo(data2025, data2026, ipcRate);
  }, [data2025, data2026, ipcRate]);

  const handleFileUpload2025 = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (text) {
        const parsed = parsePresupuestoCSV(text, 2025);
        if (parsed.length > 0) {
          setData2025(parsed);
          alert(`Presupuesto 2025 actualizado exitosamente con ${parsed.length} registros.`);
        } else {
          alert('No se pudieron leer registros válidos del archivo CSV 2025.');
        }
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleFileUpload2026 = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (text) {
        const parsed = parsePresupuestoCSV(text, 2026);
        if (parsed.length > 0) {
          setData2026(parsed);
          alert(`Presupuesto 2026 actualizado exitosamente con ${parsed.length} registros.`);
        } else {
          alert('No se pudieron leer registros válidos del archivo CSV 2026.');
        }
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleResetData = () => {
    setData2025(defaultData.data2025);
    setData2026(defaultData.data2026);
    setIpcRate(0.052);
    setSearchTerm('');
    setRubroSubFilter('todos');
  };

  const handleCopyReport = () => {
    const md = generateExecutiveReportMarkdown(result);
    navigator.clipboard.writeText(md);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  const filteredRubrosList = useMemo(() => {
    let list: RubroAggregatedComparison[] = [];
    switch (rubroSubFilter) {
      case 'top_inc_abs':
        list = result.top20MayorIncrementoAbsoluto;
        break;
      case 'top_inc_pct':
        list = result.top20MayorCrecimientoPct;
        break;
      case 'top_red_abs':
        list = result.top20MayorReduccionAbsoluta;
        break;
      case 'top_red_pct':
        list = result.top20MayorReduccionPct;
        break;
      case 'nuevos':
        list = result.rubrosNuevos;
        break;
      case 'extintos':
        list = result.rubrosExtintos;
        break;
      case 'estables':
        list = result.rubrosEstables;
        break;
      case 'todos':
      default:
        list = result.rubrosAgrupados;
        break;
    }

    return list.filter(r => {
      const matchesSearch =
        searchTerm === '' ||
        r.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.concepto.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.recursosPrincipales.some(rec => rec.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesTipo =
        tipoGastoFilter === 'TODOS' || r.tipoGasto === tipoGastoFilter;

      return matchesSearch && matchesTipo;
    });
  }, [result, rubroSubFilter, searchTerm, tipoGastoFilter]);

  const paginatedRubros = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRubrosList.slice(start, start + pageSize);
  }, [filteredRubrosList, currentPage]);

  const totalPages = Math.ceil(filteredRubrosList.length / pageSize) || 1;

  const dataChartComparacionGeneral = useMemo(() => [
    {
      name: 'Presupuesto Total',
      '2025': result.total2025 / 1e6,
      '2026': result.total2026 / 1e6
    },
    {
      name: 'Funcionamiento',
      '2025': result.funcionamientoVsInversion.funcionamiento2025 / 1e6,
      '2026': result.funcionamientoVsInversion.funcionamiento2026 / 1e6
    },
    {
      name: 'Inversión',
      '2025': result.funcionamientoVsInversion.inversion2025 / 1e6,
      '2026': result.funcionamientoVsInversion.inversion2026 / 1e6
    }
  ], [result]);

  const dataChartRecursos = useMemo(() => {
    return result.recursosComparacion
      .slice(0, 10)
      .map(r => ({
        name: r.codigoRecurso,
        fullName: r.recurso,
        '2025': r.valor2025 / 1e6,
        '2026': r.valor2026 / 1e6,
        dif: r.difAbsoluta / 1e6
      }));
  }, [result]);

  const dataPie2026 = useMemo(() => {
    return result.gruposRecursos.map(g => ({
      name: g.grupo,
      value: g.valor2026 / 1e6
    }));
  }, [result]);

  return (
    <div className="space-y-6 pb-16 text-slate-100">
      {/* HEADER INSTITUCIONAL */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-zinc-900 to-black p-6 md:p-8 border border-white/10 shadow-2xl">
        <div className="absolute -right-16 -top-16 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full text-[11px] font-bold tracking-widest uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30">
                VAFI • CONTROL FINANCIERO UPTC
              </span>
              <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                <CheckCircle2 size={13} /> Datos 100% Auditados
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <Scale className="text-amber-400" size={32} />
              Comparativo Estructural de Presupuestos Iniciales 2025–2026
            </h1>
            <p className="text-sm text-slate-400 max-w-3xl leading-relaxed">
              Herramienta estratégica de análisis presupuestal institucional. Compara integralmente las apropiaciones iniciales
              aprobadas por concepto, recurso y componente de gasto, identificando rigideces, variaciones nominales y reales, y transformaciones estructurales.
            </p>
          </div>

          {/* ACCIONES Y CONTROLES */}
          <div className="flex flex-wrap items-center gap-2.5">
            <input
              type="file"
              ref={fileInput2025Ref}
              onChange={handleFileUpload2025}
              accept=".csv"
              className="hidden"
            />
            <input
              type="file"
              ref={fileInput2026Ref}
              onChange={handleFileUpload2026}
              accept=".csv"
              className="hidden"
            />

            <button
              onClick={() => fileInput2025Ref.current?.click()}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition-all flex items-center gap-2 cursor-pointer shadow-sm"
              title="Cargar archivo CSV de Presupuesto Inicial 2025"
            >
              <Upload size={14} className="text-amber-400" />
              CSV 2025
            </button>

            <button
              onClick={() => fileInput2026Ref.current?.click()}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition-all flex items-center gap-2 cursor-pointer shadow-sm"
              title="Cargar archivo CSV de Presupuesto Inicial 2026"
            >
              <Upload size={14} className="text-amber-400" />
              CSV 2026
            </button>

            <button
              onClick={handleResetData}
              className="p-2 rounded-xl text-xs bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-all cursor-pointer"
              title="Restaurar datos oficiales 2025-2026"
            >
              <RefreshCw size={15} />
            </button>

            <button
              onClick={() => exportComparativoToExcel(result)}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600/30 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/40 transition-all flex items-center gap-2 cursor-pointer shadow-sm"
              title="Exportar a libro Excel con hojas dinámicas"
            >
              <FileSpreadsheet size={15} />
              Excel (.xlsx)
            </button>

            <button
              onClick={() => exportComparativoToCSV(result.detalleLineas)}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-cyan-600/30 hover:bg-cyan-600/40 text-cyan-300 border border-cyan-500/40 transition-all flex items-center gap-2 cursor-pointer shadow-sm"
              title="Exportar detalle a CSV"
            >
              <Download size={15} />
              CSV
            </button>
          </div>
        </div>

        {/* AJUSTE DE INFLACIÓN (IPC) EN VIVO */}
        <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-4">
            <span className="text-slate-400 flex items-center gap-1.5 font-medium">
              <Sliders size={14} className="text-amber-400" />
              Deflactor Inflacionario (IPC Referencia):
            </span>
            <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-xl border border-white/10">
              <input
                type="range"
                min="0.01"
                max="0.12"
                step="0.001"
                value={ipcRate}
                onChange={(e) => setIpcRate(parseFloat(e.target.value))}
                className="w-24 md:w-32 accent-amber-400 cursor-pointer"
              />
              <span className="font-mono font-bold text-amber-300">
                {(ipcRate * 100).toFixed(2)}%
              </span>
            </div>
            <span className="text-[11px] text-slate-500 hidden sm:inline">
              (Permite calibrar el poder adquisitivo real del presupuesto)
            </span>
          </div>

          <div className="flex items-center gap-3 text-slate-400 text-[11px]">
            <span>Filas 2025: <strong className="text-white">{result.totalRows2025}</strong></span>
            <span>•</span>
            <span>Filas 2026: <strong className="text-white">{result.totalRows2026}</strong></span>
            <span>•</span>
            <span>Total Homologado: <strong className="text-emerald-400">{result.rubrosAgrupados.length} conceptos</strong></span>
          </div>
        </div>
      </div>

      {/* NAVEGACIÓN POR SUBPESTAÑAS */}
      <div className="flex items-center gap-1.5 p-1.5 bg-surface-container-low/80 backdrop-blur-md rounded-2xl border border-white/5 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('resumen')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'resumen'
              ? 'bg-amber-500 text-black shadow-lg font-bold shadow-amber-500/20'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <BarChart3 size={15} />
          1. Resumen General & Macro
        </button>

        <button
          onClick={() => setActiveTab('recursos')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'recursos'
              ? 'bg-amber-500 text-black shadow-lg font-bold shadow-amber-500/20'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <PieIcon size={15} />
          2. Fuentes de Financiación (Recursos)
        </button>

        <button
          onClick={() => setActiveTab('rubros')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'rubros'
              ? 'bg-amber-500 text-black shadow-lg font-bold shadow-amber-500/20'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Layers size={15} />
          3. Comparativo por Rubro & Top Variaciones
        </button>

        <button
          onClick={() => setActiveTab('componentes')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'componentes'
              ? 'bg-amber-500 text-black shadow-lg font-bold shadow-amber-500/20'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Building size={15} />
          4. Componentes del Gasto & Rigideces
        </button>

        <button
          onClick={() => setActiveTab('indicadores')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'indicadores'
              ? 'bg-amber-500 text-black shadow-lg font-bold shadow-amber-500/20'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Percent size={15} />
          5. 10 Indicadores Financieros
        </button>

        <button
          onClick={() => setActiveTab('transformaciones')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'transformaciones'
              ? 'bg-amber-500 text-black shadow-lg font-bold shadow-amber-500/20'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <AlertTriangle size={15} />
          6. Transformaciones & Alertas VAFI
        </button>

        <button
          onClick={() => setActiveTab('informe')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'informe'
              ? 'bg-amber-500 text-black shadow-lg font-bold shadow-amber-500/20'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <FileText size={15} />
          7. Informe Ejecutivo Formal
        </button>
      </div>

      {/* PESTAÑA 1: RESUMEN GENERAL & MACRO */}
      {activeTab === 'resumen' && (
        <div className="space-y-6">
          {/* TARJETAS KPI PRINCIPALES */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <div className="p-4 rounded-2xl bg-surface-container-low/70 border border-white/5 space-y-1.5 shadow-md">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Presupuesto 2025</span>
              <div className="text-xl font-bold text-white font-mono">{formatCOPM(result.total2025)}</div>
              <p className="text-[10px] text-slate-500">Inicial oficial aprobado</p>
            </div>

            <div className="p-4 rounded-2xl bg-surface-container-low/70 border border-amber-500/20 space-y-1.5 shadow-md">
              <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">Presupuesto 2026</span>
              <div className="text-xl font-bold text-amber-400 font-mono">{formatCOPM(result.total2026)}</div>
              <p className="text-[10px] text-slate-400">Inicial vigencia 2026</p>
            </div>

            <div className="p-4 rounded-2xl bg-surface-container-low/70 border border-white/5 space-y-1.5 shadow-md">
              <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">Variación Neta</span>
              <div className="text-xl font-bold text-emerald-400 font-mono">+{formatCOPM(result.difAbsolutaTotal)}</div>
              <p className="text-[10px] text-slate-500">Incremento en pesos COP</p>
            </div>

            <div className="p-4 rounded-2xl bg-surface-container-low/70 border border-white/5 space-y-1.5 shadow-md">
              <span className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider">Crecimiento Nominal</span>
              <div className="text-xl font-bold text-cyan-400 font-mono">{formatPercent(result.crecimientoNominal)}</div>
              <p className="text-[10px] text-slate-500">Tasa de aumento nominal</p>
            </div>

            <div className="p-4 rounded-2xl bg-surface-container-low/70 border border-white/5 space-y-1.5 shadow-md">
              <span className="text-[11px] font-semibold text-purple-400 uppercase tracking-wider">Crecimiento Real</span>
              <div className="text-xl font-bold text-purple-400 font-mono">{formatPercent(result.crecimientoReal)}</div>
              <p className="text-[10px] text-slate-500">Descontando IPC {(ipcRate * 100).toFixed(2)}%</p>
            </div>

            <div className="p-4 rounded-2xl bg-surface-container-low/70 border border-white/5 space-y-1.5 shadow-md">
              <span className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider">Peso Inversión</span>
              <div className="text-xl font-bold text-rose-400 font-mono">{result.funcionamientoVsInversion.partInversion2026.toFixed(2)}%</div>
              <p className="text-[10px] text-slate-500">vs 96.39% Funcionamiento</p>
            </div>
          </div>

          {/* TABLA COMPARATIVA DE GRANDES COMPONENTES */}
          <div className="p-6 rounded-3xl bg-surface-container-low/70 border border-white/5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Landmark size={20} className="text-amber-400" />
                  Tabla Comparativa Estructural de Grandes Componentes
                </h3>
                <p className="text-xs text-slate-400">Desglose de presupuestos totales, ingresos corrientes, de capital y asignación por naturaleza de gasto.</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5 text-slate-300">
                    <th className="py-3 px-4 font-semibold">Componente Presupuestal</th>
                    <th className="py-3 px-4 font-semibold text-right">Inicial 2025 (COP)</th>
                    <th className="py-3 px-4 font-semibold text-right">Inicial 2026 (COP)</th>
                    <th className="py-3 px-4 font-semibold text-right">Variación Absoluta</th>
                    <th className="py-3 px-4 font-semibold text-right">Variación %</th>
                    <th className="py-3 px-4 font-semibold text-right">Part. 2025</th>
                    <th className="py-3 px-4 font-semibold text-right">Part. 2026</th>
                    <th className="py-3 px-4 font-semibold text-right">Cambio pp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {result.componentesGenerales.map((c, i) => (
                    <tr key={i} className={`hover:bg-white/5 transition-colors ${i === 0 ? 'bg-amber-500/10 font-bold' : ''}`}>
                      <td className="py-3 px-4 flex items-center gap-2 text-slate-200">
                        {i === 0 && <span className="w-2 h-2 rounded-full bg-amber-400" />}
                        {c.nombre}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-300">{formatCOP(c.valor2025)}</td>
                      <td className="py-3 px-4 text-right font-mono text-amber-300 font-semibold">{formatCOP(c.valor2026)}</td>
                      <td className={`py-3 px-4 text-right font-mono font-medium ${c.difAbsoluta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {c.difAbsoluta >= 0 ? '+' : ''}{formatCOP(c.difAbsoluta)}
                      </td>
                      <td className={`py-3 px-4 text-right font-mono font-bold ${c.difPorcentual >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {formatPercent(c.difPorcentual)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-400">{c.part2025.toFixed(2)}%</td>
                      <td className="py-3 px-4 text-right font-mono text-slate-200 font-semibold">{c.part2026.toFixed(2)}%</td>
                      <td className={`py-3 px-4 text-right font-mono font-medium ${c.part2026 - c.part2025 >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {formatPP(c.part2026 - c.part2025)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* GRÁFICOS COMPARATIVOS DE RESUMEN */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* GRÁFICO 1: COMPARACIÓN PRESUPUESTO Y GASTO */}
            <div className="p-6 rounded-3xl bg-surface-container-low/70 border border-white/5 space-y-4 shadow-xl">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <BarChart3 size={17} className="text-amber-400" />
                Evolución Presupuestal: 2025 vs 2026 (Millones COP)
              </h4>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dataChartComparacionGeneral} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(val) => `$${val.toLocaleString()}`} />
                    <RechartsTooltip
                      formatter={(val: any) => [`$ ${Number(val).toLocaleString('es-CO', { maximumFractionDigits: 1 })} M`, '']}
                      contentStyle={{ backgroundColor: '#18181b', borderColor: '#ffffff20', borderRadius: '12px' }}
                    />
                    <Legend />
                    <Bar dataKey="2025" fill="#64748b" name="Inicial 2025" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="2026" fill="#FFCC29" name="Inicial 2026" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* GRÁFICO 2: ESTRUCTURA DE PARTICIPACIÓN POR FUENTES */}
            <div className="p-6 rounded-3xl bg-surface-container-low/70 border border-white/5 space-y-4 shadow-xl">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <PieIcon size={17} className="text-cyan-400" />
                Composición por Grupos de Recursos 2026
              </h4>
              <div className="h-72 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dataPie2026}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={85}
                      innerRadius={45}
                      paddingAngle={4}
                      label={({ name, percent }: any) => `${name.split(' ')[0]} (${(percent * 100).toFixed(1)}%)`}
                      labelLine={false}
                    >
                      {dataPie2026.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS_RECURSOS[index % COLORS_RECURSOS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      formatter={(val: any) => [`$ ${Number(val).toLocaleString('es-CO', { maximumFractionDigits: 1 })} M`, 'Apropiación']}
                      contentStyle={{ backgroundColor: '#18181b', borderColor: '#ffffff20', borderRadius: '12px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 2: ANÁLISIS POR RECURSO */}
      {activeTab === 'recursos' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-surface-container-low/70 border border-white/5 space-y-4 shadow-xl">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <PieIcon size={20} className="text-amber-400" />
                Matriz Comparativa por Fuentes de Financiación (Recursos)
              </h3>
              <p className="text-xs text-slate-400">
                Consolidación completa de las 16 fuentes de financiación de la UPTC (R10 a R50), variaciones y ponderación sobre el total institucional.
              </p>
            </div>

            {/* GRÁFICO COMPARATIVO TOP RECURSOS */}
            <div className="h-80 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dataChartRecursos} margin={{ top: 10, right: 10, left: 10, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(val) => `$${val.toLocaleString()}`} />
                  <RechartsTooltip
                    formatter={(val: any, name: any, item: any) => [
                      `$ ${Number(val).toLocaleString('es-CO', { maximumFractionDigits: 1 })} M`,
                      name === '2025' ? 'Apropiación 2025' : 'Apropiación 2026'
                    ]}
                    labelFormatter={(label) => {
                      const item = dataChartRecursos.find(d => d.name === label);
                      return item ? item.fullName : label;
                    }}
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#ffffff20', borderRadius: '12px' }}
                  />
                  <Legend />
                  <Bar dataKey="2025" fill="#64748b" name="Inicial 2025" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="2026" fill="#FFCC29" name="Inicial 2026" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* TABLA DETALLADA POR RECURSO */}
            <div className="overflow-x-auto pt-4">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5 text-slate-300">
                    <th className="py-3 px-3 font-semibold">Cód</th>
                    <th className="py-3 px-3 font-semibold">Fuente / Denominación</th>
                    <th className="py-3 px-3 font-semibold">Grupo Estratégico</th>
                    <th className="py-3 px-3 font-semibold text-right">Inicial 2025 (COP)</th>
                    <th className="py-3 px-3 font-semibold text-right">Inicial 2026 (COP)</th>
                    <th className="py-3 px-3 font-semibold text-right">Variación Absoluta</th>
                    <th className="py-3 px-3 font-semibold text-right">Var %</th>
                    <th className="py-3 px-3 font-semibold text-right">Part. 2025</th>
                    <th className="py-3 px-3 font-semibold text-right">Part. 2026</th>
                    <th className="py-3 px-3 font-semibold text-right">Cambio pp</th>
                    <th className="py-3 px-3 font-semibold text-center">Volatilidad</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {result.recursosComparacion.map((r, i) => (
                    <tr key={i} className="hover:bg-white/5 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-amber-400">{r.codigoRecurso}</td>
                      <td className="py-3 px-3 text-slate-200 font-medium max-w-xs truncate" title={r.recurso}>
                        {r.recurso}
                      </td>
                      <td className="py-3 px-3 text-slate-400 text-[11px]">{r.grupoRecurso}</td>
                      <td className="py-3 px-3 text-right font-mono text-slate-300">{formatCOP(r.valor2025)}</td>
                      <td className="py-3 px-3 text-right font-mono text-amber-300 font-semibold">{formatCOP(r.valor2026)}</td>
                      <td className={`py-3 px-3 text-right font-mono ${r.difAbsoluta >= 0 ? 'text-emerald-400 font-medium' : 'text-rose-400 font-medium'}`}>
                        {r.difAbsoluta >= 0 ? '+' : ''}{formatCOP(r.difAbsoluta)}
                      </td>
                      <td className={`py-3 px-3 text-right font-mono font-bold ${r.difPorcentual >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {formatPercent(r.difPorcentual)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-400">{r.part2025.toFixed(2)}%</td>
                      <td className="py-3 px-3 text-right font-mono text-slate-200 font-semibold">{r.part2026.toFixed(2)}%</td>
                      <td className={`py-3 px-3 text-right font-mono ${r.cambioPuntosPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {formatPP(r.cambioPuntosPct)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          r.volatilidad === 'Baja' ? 'bg-emerald-500/20 text-emerald-400' :
                          r.volatilidad === 'Media' ? 'bg-amber-500/20 text-amber-400' :
                          'bg-rose-500/20 text-rose-400'
                        }`}>
                          {r.volatilidad}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 3: COMPARATIVO POR RUBRO */}
      {activeTab === 'rubros' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-surface-container-low/70 border border-white/5 space-y-4 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Layers size={20} className="text-amber-400" />
                  Comparativo Detallado de Rubros Presupuestales
                </h3>
                <p className="text-xs text-slate-400">
                  Explorador dinámico por concepto del catálogo presupuestal. Identifica mayores aumentos, reducciones, rubros nuevos y extintos.
                </p>
              </div>

              {/* BUSCADOR */}
              <div className="relative w-full md:w-80">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por código, concepto o recurso..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
                />
              </div>
            </div>

            {/* FILTROS RÁPIDOS (SUBPESTAÑAS) */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
              <button
                onClick={() => { setRubroSubFilter('todos'); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap cursor-pointer transition-all ${
                  rubroSubFilter === 'todos' ? 'bg-white/15 text-white font-bold' : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                Todos ({result.rubrosAgrupados.length})
              </button>

              <button
                onClick={() => { setRubroSubFilter('top_inc_abs'); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap cursor-pointer transition-all ${
                  rubroSubFilter === 'top_inc_abs' ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30' : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                Top 20 Mayores Incrementos
              </button>

              <button
                onClick={() => { setRubroSubFilter('top_inc_pct'); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap cursor-pointer transition-all ${
                  rubroSubFilter === 'top_inc_pct' ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30' : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                Top 20 Mayor Crecimiento %
              </button>

              <button
                onClick={() => { setRubroSubFilter('top_red_abs'); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap cursor-pointer transition-all ${
                  rubroSubFilter === 'top_red_abs' ? 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30' : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                Top 20 Mayores Reducciones
              </button>

              <button
                onClick={() => { setRubroSubFilter('nuevos'); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap cursor-pointer transition-all ${
                  rubroSubFilter === 'nuevos' ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30' : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                Nuevos en 2026 ({result.rubrosNuevos.length})
              </button>

              <button
                onClick={() => { setRubroSubFilter('extintos'); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap cursor-pointer transition-all ${
                  rubroSubFilter === 'extintos' ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30' : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                Sin Asignación ({result.rubrosExtintos.length})
              </button>

              <button
                onClick={() => { setRubroSubFilter('estables'); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap cursor-pointer transition-all ${
                  rubroSubFilter === 'estables' ? 'bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30' : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                Estables ({result.rubrosEstables.length})
              </button>
            </div>

            {/* TABLA DINÁMICA DE RUBROS */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5 text-slate-300">
                    <th className="py-3 px-3 font-semibold">Código Concepto</th>
                    <th className="py-3 px-3 font-semibold">Concepto / Denominación</th>
                    <th className="py-3 px-3 font-semibold">Tipo</th>
                    <th className="py-3 px-3 font-semibold text-right">Presupuesto 2025</th>
                    <th className="py-3 px-3 font-semibold text-right">Presupuesto 2026</th>
                    <th className="py-3 px-3 font-semibold text-right">Variación Absoluta</th>
                    <th className="py-3 px-3 font-semibold text-right">Var %</th>
                    <th className="py-3 px-3 font-semibold text-right">Part. 2026</th>
                    <th className="py-3 px-3 font-semibold text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {paginatedRubros.map((r, i) => (
                    <tr key={i} className="hover:bg-white/5 transition-colors">
                      <td className="py-3 px-3 font-mono text-amber-400 whitespace-nowrap">{r.codigo}</td>
                      <td className="py-3 px-3 text-slate-200 font-medium max-w-md">
                        <div className="truncate" title={r.concepto}>{r.concepto}</div>
                        <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                          Fuentes: {r.recursosPrincipales.join(', ')}
                        </div>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] ${
                          r.tipoGasto === 'Inversión' ? 'bg-rose-500/20 text-rose-300' : 'bg-cyan-500/20 text-cyan-300'
                        }`}>
                          {r.tipoGasto}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-300">{formatCOP(r.valor2025)}</td>
                      <td className="py-3 px-3 text-right font-mono text-amber-300 font-semibold">{formatCOP(r.valor2026)}</td>
                      <td className={`py-3 px-3 text-right font-mono ${r.difAbsoluta >= 0 ? 'text-emerald-400 font-medium' : 'text-rose-400 font-medium'}`}>
                        {r.difAbsoluta >= 0 ? '+' : ''}{formatCOP(r.difAbsoluta)}
                      </td>
                      <td className={`py-3 px-3 text-right font-mono font-bold ${r.difPorcentual >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {formatPercent(r.difPorcentual)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-200 font-semibold">{r.part2026.toFixed(2)}%</td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          r.estado === 'NUEVO' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' :
                          r.estado === 'EXTINTO' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                          r.estado === 'INCREMENTO' ? 'bg-emerald-500/20 text-emerald-300' :
                          r.estado === 'REDUCCION' ? 'bg-rose-500/20 text-rose-300' :
                          'bg-slate-500/20 text-slate-300'
                        }`}>
                          {r.estado}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {paginatedRubros.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        No se encontraron rubros con los criterios de búsqueda seleccionados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* PAGINACIÓN */}
            <div className="flex items-center justify-between pt-4 border-t border-white/5 text-xs text-slate-400">
              <span>
                Mostrando {Math.min((currentPage - 1) * pageSize + 1, filteredRubrosList.length)} a {Math.min(currentPage * pageSize, filteredRubrosList.length)} de {filteredRubrosList.length} rubros
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                >
                  Anterior
                </button>
                <span className="font-mono text-white">
                  Página {currentPage} de {totalPages}
                </span>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                >
                  Siguiente
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 4: COMPONENTES DEL GASTO & RIGIDECES */}
      {activeTab === 'componentes' && (
        <div className="space-y-6">
          {/* ANÁLISIS DE RIGIDEZ Y MARGEN DE MANIOBRA */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-3xl bg-surface-container-low/70 border border-rose-500/20 space-y-3 shadow-xl">
              <span className="px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30">
                Rigidez Máxima (Ineludible)
              </span>
              <div className="text-2xl font-black text-rose-400 font-mono">
                {formatCOPM(result.funcionamientoVsInversion.funcionamiento2026)}
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                El <strong>{result.funcionamientoVsInversion.partFuncionamiento2026.toFixed(2)}%</strong> del presupuesto está atado a nómina docente y administrativa (2.1.1), transferencias legales y costos fijos inmodificables.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-surface-container-low/70 border border-amber-500/20 space-y-3 shadow-xl">
              <span className="px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Margen de Inversión y Capital
              </span>
              <div className="text-2xl font-black text-amber-400 font-mono">
                {formatCOPM(result.funcionamientoVsInversion.inversion2026)}
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                La inversión representa únicamente el <strong>{result.funcionamientoVsInversion.partInversion2026.toFixed(2)}%</strong> institucional. Depende de Estampillas (R40, R12) y Aportes Nación Inversión (R16.0).
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-surface-container-low/70 border border-emerald-500/20 space-y-3 shadow-xl">
              <span className="px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Flexibilidad con Recursos Propios
              </span>
              <div className="text-2xl font-black text-emerald-400 font-mono">
                {formatCOPM(result.gruposRecursos.find(g => g.grupo === 'Recursos Propios')?.valor2026 || 0)}
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Crecimiento del <strong>+38.88%</strong> en rentas propias. Constituye la principal fuente disponible para atender contingencias institucionales.
              </p>
            </div>
          </div>

          {/* TARJETAS DE LOS 5 GRANDES COMPONENTES */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Building size={20} className="text-amber-400" />
              Diagnóstico Estratégico por Componentes del Gasto
            </h3>
            <div className="grid grid-cols-1 gap-4">
              {result.componentesGasto.map((c, idx) => (
                <div key={idx} className="p-5 rounded-2xl bg-surface-container-low/70 border border-white/5 space-y-3 shadow-md hover:border-amber-400/30 transition-all">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-mono text-amber-400 font-semibold">{c.codigo}</span>
                      <h4 className="text-sm font-bold text-white">{c.componente}</h4>
                    </div>
                    <div className="flex items-center gap-3 font-mono text-xs">
                      <span className="text-slate-400">2025: {formatCOPM(c.valor2025)}</span>
                      <span>→</span>
                      <span className="text-amber-400 font-bold">2026: {formatCOPM(c.valor2026)}</span>
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${c.difPorcentual >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                        {formatPercent(c.difPorcentual)}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{c.analisis}</p>
                  <div className="text-[11px] text-slate-400 flex items-center gap-2 pt-2 border-t border-white/5">
                    <span className="font-semibold text-slate-300">Fuentes:</span>
                    <span>{c.recursosFinanciadores}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* COMPARATIVO POR UNIDADES ACADÉMICAS / ADMINISTRATIVAS */}
          <div className="p-6 rounded-3xl bg-surface-container-low/70 border border-white/5 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <GraduationCap size={18} className="text-amber-400" />
              Distribución por Unidades y Facultades (Apropiación Inicial)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5 text-slate-300">
                    <th className="py-2.5 px-3 font-semibold">Unidad / Centro de Costo</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Inicial 2025</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Inicial 2026</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Variación Absoluta</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Var %</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Part. 2026</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {result.unidadesComparacion.map((u, i) => (
                    <tr key={i} className="hover:bg-white/5 transition-colors">
                      <td className="py-2.5 px-3 font-medium text-slate-200">{u.unidad}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-400">{formatCOPM(u.valor2025)}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-amber-300 font-semibold">{formatCOPM(u.valor2026)}</td>
                      <td className={`py-2.5 px-3 text-right font-mono ${u.difAbsoluta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {u.difAbsoluta >= 0 ? '+' : ''}{formatCOPM(u.difAbsoluta)}
                      </td>
                      <td className={`py-2.5 px-3 text-right font-mono font-bold ${u.difPorcentual >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {formatPercent(u.difPorcentual)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-200 font-semibold">{u.part2026.toFixed(2)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 5: 10 INDICADORES FINANCIEROS */}
      {activeTab === 'indicadores' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-surface-container-low/70 border border-white/5 space-y-4 shadow-xl">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Percent size={20} className="text-amber-400" />
                Matriz de los 10 Indicadores Financieros y Presupuestales Clave
              </h3>
              <p className="text-xs text-slate-400">
                Batería de indicadores requeridos para evaluar rigideces, poder adquisitivo real, concentración de rentas y sostenibilidad presupuestal.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {result.indicadores.map((ind) => (
                <div
                  key={ind.id}
                  className="p-5 rounded-2xl bg-surface-container/50 border border-white/5 space-y-3 hover:border-amber-400/30 transition-all shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-white/10 text-amber-400">
                        Indicador {ind.numero}
                      </span>
                      <h4 className="text-sm font-bold text-white">{ind.nombre}</h4>
                      <p className="text-[11px] text-slate-400 font-mono">{ind.metodologia}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      ind.semaforo === 'verde' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                      ind.semaforo === 'amarillo' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                      ind.semaforo === 'rojo' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                      'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                    }`}>
                      {ind.semaforo}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-black/40 border border-white/5 font-mono text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Base 2025</span>
                      <strong className="text-slate-300">{ind.valor2025}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Valor 2026</span>
                      <strong className="text-amber-400">{ind.valor2026}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Variación</span>
                      <strong className="text-white">{ind.variacion}</strong>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed border-t border-white/5 pt-2">
                    {ind.interpretacion}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 6: TRANSFORMACIONES & ALERTAS */}
      {activeTab === 'transformaciones' && (
        <div className="space-y-6">
          {/* PERSPECTIVA MULTIDISCIPLINARIA VAFI */}
          <div className="p-6 rounded-3xl bg-gradient-to-r from-amber-500/10 via-zinc-900 to-black border border-amber-500/20 space-y-3 shadow-xl">
            <span className="px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5 w-fit">
              <Sparkles size={13} /> Panel de Expertos Multidisciplinario
            </span>
            <h3 className="text-base font-bold text-white">Dictamen de Transformaciones Presupuestales 2025–2026</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Consolidación de observaciones del equipo integrado por el <strong>Analista Presupuestal</strong> (clasificación catálogo público), <strong>Economista</strong> (crecimiento nominal +13.09% vs real +7.50% deflactado), <strong>Analista Financiero</strong> (rigidez salarial y dependencia 75.18% de Nación), <strong>Científico de Datos</strong> (integridad matemática) y <strong>Auditor Presupuestal</strong> (trazabilidad y correspondencia exacta de cifras).
            </p>
          </div>

          {/* MATRIZ CLASIFICADA DE ALERTAS */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* HALLAZGOS POSITIVOS */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-emerald-500/30 text-emerald-400">
                  <CheckCircle2 size={18} />
                  <h4 className="text-sm font-bold uppercase tracking-wider">Hallazgos Positivos</h4>
                </div>
                {result.alertas.filter(a => a.categoria === 'POSITIVO').map(a => (
                  <div key={a.id} className="p-4 rounded-2xl bg-surface-container-low/70 border border-emerald-500/20 space-y-2.5 shadow-md">
                    <h5 className="text-xs font-bold text-emerald-300">{a.titulo}</h5>
                    <p className="text-xs text-slate-300 leading-relaxed">{a.descripcion}</p>
                    <div className="p-2.5 rounded-lg bg-black/40 text-[11px] font-mono space-y-1 text-slate-400 border border-white/5">
                      <div><strong className="text-slate-300">Soporte:</strong> {a.cifraSoporte}</div>
                      <div><strong className="text-emerald-400">Variación:</strong> {a.variacion}</div>
                      <div><strong className="text-slate-300">Participación:</strong> {a.participacion}</div>
                    </div>
                    <p className="text-[11px] text-slate-400"><strong className="text-slate-300">Recomendación VAFI:</strong> {a.recomendacionVAFI}</p>
                  </div>
                ))}
              </div>

              {/* ALERTAS PRESUPUESTALES */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-rose-500/30 text-rose-400">
                  <ShieldAlert size={18} />
                  <h4 className="text-sm font-bold uppercase tracking-wider">Alertas Presupuestales</h4>
                </div>
                {result.alertas.filter(a => a.categoria === 'ALERTA').map(a => (
                  <div key={a.id} className="p-4 rounded-2xl bg-surface-container-low/70 border border-rose-500/20 space-y-2.5 shadow-md">
                    <h5 className="text-xs font-bold text-rose-300">{a.titulo}</h5>
                    <p className="text-xs text-slate-300 leading-relaxed">{a.descripcion}</p>
                    <div className="p-2.5 rounded-lg bg-black/40 text-[11px] font-mono space-y-1 text-slate-400 border border-white/5">
                      <div><strong className="text-slate-300">Soporte:</strong> {a.cifraSoporte}</div>
                      <div><strong className="text-rose-400">Variación:</strong> {a.variacion}</div>
                      <div><strong className="text-slate-300">Participación:</strong> {a.participacion}</div>
                    </div>
                    <p className="text-[11px] text-slate-400"><strong className="text-slate-300">Recomendación VAFI:</strong> {a.recomendacionVAFI}</p>
                  </div>
                ))}
              </div>

              {/* ASPECTOS DE SEGUIMIENTO */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-amber-500/30 text-amber-400">
                  <Clock size={18} />
                  <h4 className="text-sm font-bold uppercase tracking-wider">Aspectos de Seguimiento</h4>
                </div>
                {result.alertas.filter(a => a.categoria === 'SEGUIMIENTO').map(a => (
                  <div key={a.id} className="p-4 rounded-2xl bg-surface-container-low/70 border border-amber-500/20 space-y-2.5 shadow-md">
                    <h5 className="text-xs font-bold text-amber-300">{a.titulo}</h5>
                    <p className="text-xs text-slate-300 leading-relaxed">{a.descripcion}</p>
                    <div className="p-2.5 rounded-lg bg-black/40 text-[11px] font-mono space-y-1 text-slate-400 border border-white/5">
                      <div><strong className="text-slate-300">Soporte:</strong> {a.cifraSoporte}</div>
                      <div><strong className="text-amber-400">Variación:</strong> {a.variacion}</div>
                      <div><strong className="text-slate-300">Participación:</strong> {a.participacion}</div>
                    </div>
                    <p className="text-[11px] text-slate-400"><strong className="text-slate-300">Recomendación VAFI:</strong> {a.recomendacionVAFI}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 7: INFORME EJECUTIVO FORMAL */}
      {activeTab === 'informe' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <FileText size={20} className="text-amber-400" />
              Informe Ejecutivo Oficial para Rectoría y Consejo Superior
            </h3>
            <div className="flex items-center gap-3">
              <button
                onClick={handleCopyReport}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition-all flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <Copy size={14} className="text-amber-400" />
                {copiedReport ? '¡Copiado!' : 'Copiar Markdown'}
              </button>
              <button
                onClick={handlePrint}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-black font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md"
              >
                <Printer size={15} />
                Imprimir / PDF
              </button>
            </div>
          </div>

          <div className="p-8 md:p-12 rounded-3xl bg-zinc-950 border border-white/10 space-y-8 shadow-2xl text-slate-200 leading-relaxed font-sans max-w-5xl mx-auto">
            {/* ENCABEZADO FORMAL */}
            <div className="text-center space-y-2 pb-6 border-b border-white/10">
              <h2 className="text-xl md:text-2xl font-black text-amber-400 tracking-wide uppercase">
                Universidad Pedagógica y Tecnológica de Colombia – UPTC
              </h2>
              <h3 className="text-sm md:text-base font-bold text-slate-300 tracking-wider uppercase">
                Vicerrectoría Administrativa y Financiera (VAFI)
              </h3>
              <p className="text-xs text-slate-400 uppercase tracking-widest pt-1">
                Dictamen Técnico: Comparativo Estructural de los Presupuestos Iniciales 2025–2026
              </p>
            </div>

            {/* SECCIÓN 1 Y 2 */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-amber-400 uppercase tracking-wider">
                1. Objetivo del Análisis & Alcance
              </h4>
              <p className="text-xs text-slate-300 text-justify">
                El presente informe técnico tiene por objeto suministrar a la Rectoría y al Honorable Consejo Superior Universitario
                el análisis comparativo exhaustivo entre el Presupuesto Inicial aprobado para la vigencia fiscal 2025 y el Presupuesto Inicial
                aprobado para la vigencia 2026. Se examina la evolución de las fuentes de financiación, las variaciones nominales y reales,
                la concentración de las rentas institucionales y el grado de rigidez presupuestal derivado de los compromisos de personal y funcionamiento.
              </p>
            </div>

            {/* SECCIÓN 3: CUADRO SINTÉTICO */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-amber-400 uppercase tracking-wider">
                2. Cuadro Síntesis de Variaciones Macropresupuestales
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-white/10">
                  <thead className="bg-white/5 text-slate-300">
                    <tr>
                      <th className="p-2.5 font-bold">Concepto Macropresupuestal</th>
                      <th className="p-2.5 text-right font-bold">Vigencia 2025 (COP)</th>
                      <th className="p-2.5 text-right font-bold">Vigencia 2026 (COP)</th>
                      <th className="p-2.5 text-right font-bold">Variación Absoluta</th>
                      <th className="p-2.5 text-right font-bold">Crecimiento %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10 font-mono">
                    <tr className="bg-amber-500/10 font-bold">
                      <td className="p-2.5 text-amber-300 font-sans">Presupuesto Inicial Total</td>
                      <td className="p-2.5 text-right">{formatCOP(result.total2025)}</td>
                      <td className="p-2.5 text-right text-amber-400">{formatCOP(result.total2026)}</td>
                      <td className="p-2.5 text-right text-emerald-400">+{formatCOP(result.difAbsolutaTotal)}</td>
                      <td className="p-2.5 text-right text-emerald-400">+{result.crecimientoNominal.toFixed(2)}%</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 text-slate-300 font-sans">Funcionamiento (Operación & Nómina)</td>
                      <td className="p-2.5 text-right">{formatCOP(result.funcionamientoVsInversion.funcionamiento2025)}</td>
                      <td className="p-2.5 text-right">{formatCOP(result.funcionamientoVsInversion.funcionamiento2026)}</td>
                      <td className="p-2.5 text-right text-emerald-400">+{formatCOP(result.funcionamientoVsInversion.difFuncionamiento)}</td>
                      <td className="p-2.5 text-right text-emerald-400">+{result.funcionamientoVsInversion.varFuncionamientoPct.toFixed(2)}%</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 text-slate-300 font-sans">Inversión (Infraestructura & Dotación)</td>
                      <td className="p-2.5 text-right">{formatCOP(result.funcionamientoVsInversion.inversion2025)}</td>
                      <td className="p-2.5 text-right">{formatCOP(result.funcionamientoVsInversion.inversion2026)}</td>
                      <td className="p-2.5 text-right text-emerald-400">+{formatCOP(result.funcionamientoVsInversion.difInversion)}</td>
                      <td className="p-2.5 text-right text-emerald-400">+{result.funcionamientoVsInversion.varInversionPct.toFixed(2)}%</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 text-slate-300 font-sans">Crecimiento Real Deflactado (IPC {(ipcRate * 100).toFixed(2)}%)</td>
                      <td className="p-2.5 text-right">Línea Base</td>
                      <td className="p-2.5 text-right text-purple-400 font-bold">+{result.crecimientoReal.toFixed(2)}%</td>
                      <td className="p-2.5 text-right text-purple-400">Ganancia Neta</td>
                      <td className="p-2.5 text-right text-purple-400">+{result.crecimientoReal.toFixed(2)}%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* SECCIÓN 4: CONCLUSIONES Y DICTAMEN */}
            <div className="space-y-4 pt-4 border-t border-white/10">
              <h4 className="text-sm font-bold text-amber-400 uppercase tracking-wider">
                3. Conclusiones y Dictamen de la Vicerrectoría Administrativa y Financiera
              </h4>
              <ul className="space-y-2 text-xs text-slate-300 list-disc list-inside leading-relaxed text-justify">
                <li>
                  <strong>Suficiencia Operativa de Nómina:</strong> El crecimiento del 19.44% en el Recurso 10.0 (+51.242 M COP) proporciona el respaldo financiero necesario para asegurar los pagos de salarios, prestaciones y seguridad social del cuerpo profesoral y personal administrativo en 2026.
                </li>
                <li>
                  <strong>Evolución de la Gratuidad:</strong> La aparente contracción del Fondo FSE (-48.25%) queda plenamente neutralizada por la creación formal del Recurso 10.5 de Política de Gratuidad (+20.708 M COP), generando un saldo neto favorable de +3.235 M COP para la institución.
                </li>
                <li>
                  <strong>Alerta sobre Inversión:</strong> La inversión institucional continúa representando una porción reducida del presupuesto (3.61%), por lo que se deben priorizar gestiones externas (Regalías y Cooperación) para evitar el deterioro de la infraestructura física y tecnológica.
                </li>
                <li>
                  <strong>Autonomía Financiera:</strong> El crecimiento del 47.44% en Recursos Propios constituye un logro destacado de gestión académica y comercial que debe ser preservado y consolidado durante la vigencia 2026.
                </li>
              </ul>
            </div>

            {/* FIRMA DE CIERRE */}
            <div className="pt-8 border-t border-white/10 flex justify-between items-end text-xs text-slate-400">
              <div>
                <p className="font-bold text-white uppercase">Vicerrectoría Administrativa y Financiera</p>
                <p>Dirección de Planeación y Presupuesto</p>
                <p>Universidad Pedagógica y Tecnológica de Colombia</p>
              </div>
              <div className="text-right font-mono text-[11px] text-slate-500">
                Sistema Integrado VAFI • Código Validación: UPTC-PRE-2526
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
