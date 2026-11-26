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
  ArrowUpDown,
  Sun,
  Moon,
  Award,
  CheckSquare,
  ShieldCheck,
  AlertCircle
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
  >('informe'); // Default to informe as requested by user

  // Modo de visualización del informe: fondo blanco ejecutivo vs oscuro
  const [reportTheme, setReportTheme] = useState<'blanco' | 'oscuro'>('blanco');

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

  // Datos para gráficas del informe
  const dataReportMacro = useMemo(() => [
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

  const dataReportRigidezPie = useMemo(() => [
    { name: 'Funcionamiento (96.39%)', value: result.funcionamientoVsInversion.funcionamiento2026 / 1e6, color: '#D97706' },
    { name: 'Inversión (3.61%)', value: result.funcionamientoVsInversion.inversion2026 / 1e6, color: '#2563EB' }
  ], [result]);

  const dataReportMacroFuentes = useMemo(() => {
    return result.gruposRecursos.map(g => ({
      name: g.grupo.replace(' y Contribuciones', '').replace(' / Gratuidad', ''),
      '2025': g.valor2025 / 1e6,
      '2026': g.valor2026 / 1e6,
      dif: g.difAbsoluta / 1e6
    }));
  }, [result]);

  const dataReportContribucionNet = useMemo(() => [
    { concepto: 'Aportes Nación Funcionamiento (R10.0)', monto: 51242.56, tipo: 'positivo' },
    { concepto: 'Recursos Propios (R20)', monto: 5566.37, tipo: 'positivo' },
    { concepto: 'Gratuidad Neta (R10.5 - R14)', monto: 3235.44, tipo: 'positivo' },
    { concepto: 'Estampillas & Transferencias Ley', monto: 1142.04, tipo: 'positivo' },
    { concepto: 'Aportes Inversión Nación (R16.0)', monto: 325.44, tipo: 'positivo' },
    { concepto: 'Devolución IVA (R21)', monto: 561.49, tipo: 'positivo' },
    { concepto: 'Artículo 87 CESU (R18)', monto: -1559.53, tipo: 'negativo' },
    { concepto: 'Convenios con Derechos (R33)', monto: -4143.69, tipo: 'negativo' }
  ], []);

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
          onClick={() => setActiveTab('informe')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'informe'
              ? 'bg-amber-500 text-black shadow-lg font-bold shadow-amber-500/20'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <FileText size={15} />
          Informe Ejecutivo Oficial
        </button>

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
      </div>

      {/* PESTAÑA: INFORME EJECUTIVO OFICIAL (CON FONDO BLANCO Y MODO EJECUTIVO CON GRÁFICAS) */}
      {activeTab === 'informe' && (
        <div className="space-y-6">
          {/* BARRA SUPERIOR DE ACCIONES DEL INFORME */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-surface-container-low/80 border border-white/5 shadow-md">
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                <Award size={20} />
              </span>
              <div>
                <h3 className="text-sm font-bold text-white">Informe Técnico Gerencial: Comparativo de Presupuestos</h3>
                <p className="text-xs text-slate-400">Formato oficial ejecutivo para presentación ante Rectoría y Consejo Superior Universitario</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* TOGGLE MODO BLANCO / OSCURO */}
              <div className="flex items-center bg-black/40 p-1 rounded-xl border border-white/10 text-xs">
                <button
                  onClick={() => setReportTheme('blanco')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                    reportTheme === 'blanco'
                      ? 'bg-white text-slate-900 shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Sun size={13} className={reportTheme === 'blanco' ? 'text-amber-500' : ''} />
                  Fondo Blanco
                </button>
                <button
                  onClick={() => setReportTheme('oscuro')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                    reportTheme === 'oscuro'
                      ? 'bg-white/20 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Moon size={13} />
                  Modo Oscuro
                </button>
              </div>

              <button
                onClick={handleCopyReport}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition-all flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <Copy size={14} className="text-amber-400" />
                {copiedReport ? '¡Copiado!' : 'Copiar Texto'}
              </button>

              <button
                onClick={handlePrint}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-black transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20"
              >
                <Printer size={15} />
                Imprimir / PDF
              </button>
            </div>
          </div>

          {/* CONTENEDOR PRINCIPAL DEL INFORME (FONDO BLANCO / MODO EJECUTIVO) */}
          <div
            id="printable-executive-report"
            className={`transition-all duration-300 max-w-5xl mx-auto rounded-3xl p-8 md:p-14 space-y-10 shadow-2xl print:p-0 print:border-none print:shadow-none print:max-w-none ${
              reportTheme === 'blanco'
                ? 'bg-white text-slate-900 border border-slate-200 ring-1 ring-slate-900/5'
                : 'bg-zinc-950 text-slate-200 border border-white/10'
            }`}
          >
            {/* LÍNEA INSTITUCIONAL SUPERIOR */}
            <div className="h-2.5 bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 rounded-full w-full" />

            {/* ENCABEZADO INSTITUCIONAL OFICIAL */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-6 border-b border-slate-200">
              <div className="flex items-center gap-4 text-center md:text-left">
                <div className="w-16 h-16 rounded-2xl bg-slate-900 flex items-center justify-center p-2.5 shadow-md shrink-0">
                  <img
                    src="https://raw.githubusercontent.com/fabiancho0724/VAFI-Reporte-Financiero/7601e17bbde30e0381cc947ff62d9345b0ec3853/uptc-blanco%20(1).png"
                    alt="UPTC Logo"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-black tracking-tight text-slate-900 uppercase">
                    Universidad Pedagógica y Tecnológica de Colombia
                  </h2>
                  <h3 className="text-xs md:text-sm font-extrabold text-amber-600 tracking-wider uppercase">
                    Vicerrectoría Administrativa y Financiera (VAFI)
                  </h3>
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">
                    Dirección de Planeación y Presupuesto • Centro de Control Financiero
                  </p>
                </div>
              </div>

              <div className="text-right text-xs space-y-1 font-mono text-slate-500 border-l-0 md:border-l border-slate-200 pl-0 md:pl-6">
                <div><strong className="text-slate-800">Doc Ref:</strong> INF-VAFI-PRE-2526</div>
                <div><strong className="text-slate-800">Vigencias:</strong> 2025 vs 2026 (Iniciales)</div>
                <div><strong className="text-slate-800">Estado:</strong> 100% Conciliado</div>
                <div><strong className="text-slate-800">Fecha:</strong> Noviembre de 2026</div>
              </div>
            </div>

            {/* TÍTULO CENTRAL DEL INFORME */}
            <div className="text-center space-y-2 py-2">
              <span className="px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200 inline-block">
                Dictamen Técnico Financiero y Presupuestal
              </span>
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                Comparativo Estructural de los Presupuestos Iniciales 2025–2026
              </h1>
              <p className="text-xs md:text-sm text-slate-600 max-w-3xl mx-auto leading-relaxed">
                Evaluación integral de las fuentes de financiación, rigideces operativas, comportamiento real deflactado
                y transformaciones estratégicas para la sostenibilidad institucional de la UPTC.
              </p>
            </div>

            {/* TARJETAS EJECUTIVAS RESUMEN (SCORECARD BLANCO) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1 text-center shadow-sm">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Presupuesto 2025</span>
                <div className="text-lg md:text-xl font-black text-slate-800 font-mono">{formatCOPM(result.total2025)}</div>
                <p className="text-[10px] text-slate-500">449 rubros aforados</p>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-300 space-y-1 text-center shadow-sm">
                <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Presupuesto 2026</span>
                <div className="text-lg md:text-xl font-black text-amber-700 font-mono">{formatCOPM(result.total2026)}</div>
                <p className="text-[10px] text-amber-800 font-medium">+13.09% Nominal (+56.637 M)</p>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 space-y-1 text-center shadow-sm">
                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Crecimiento Real</span>
                <div className="text-lg md:text-xl font-black text-emerald-700 font-mono">+{result.crecimientoReal.toFixed(2)}%</div>
                <p className="text-[10px] text-emerald-700 font-medium">Deflactado IPC {(ipcRate * 100).toFixed(2)}%</p>
              </div>

              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-300 space-y-1 text-center shadow-sm">
                <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider">Rigidez Operativa</span>
                <div className="text-lg md:text-xl font-black text-blue-700 font-mono">96.39%</div>
                <p className="text-[10px] text-blue-700 font-medium">Funcionamiento vs 3.61% Inversión</p>
              </div>
            </div>

            {/* SECCIÓN 1: OBJETIVO DEL ANÁLISIS */}
            <div className="space-y-3">
              <h3 className="text-base font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 pb-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                1. Objetivo del Dictamen y Marco de Homologación
              </h3>
              <p className="text-xs text-slate-700 text-justify leading-relaxed">
                Este dictamen tiene como propósito proveer a la Rectoría y al Honorable Consejo Superior Universitario de la UPTC
                un análisis riguroso y cuantitativo sobre la asignación del Presupuesto Inicial de Ingresos y Fuentes 2026 frente a la vigencia 2025.
                Se integraron los dos archivos oficiales sin alteración alguna: <strong>449 líneas en 2025 ($432.628.979.793 COP)</strong> y <strong>204 líneas en 2026 ($489.266.925.925 COP)</strong>.
                La homologación se efectuó por códigos presupuestales del catálogo público y grupos de recursos institucionales, aislando el efecto de la inflación para determinar el crecimiento real del poder de compra institucional.
              </p>
            </div>

            {/* SECCIÓN 2: CUADRO SÍNTESIS MACROPRESUPUESTAL Y GRÁFICAS */}
            <div className="space-y-4">
              <h3 className="text-base font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 pb-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                2. Síntesis Macropresupuestal y Estructura del Gasto
              </h3>

              {/* TABLA MACRO EN FONDO CLARO */}
              <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-semibold border-b border-slate-200">
                      <th className="py-2.5 px-3">Componente Presupuestal</th>
                      <th className="py-2.5 px-3 text-right">Inicial 2025 (COP)</th>
                      <th className="py-2.5 px-3 text-right">Inicial 2026 (COP)</th>
                      <th className="py-2.5 px-3 text-right">Variación Absoluta</th>
                      <th className="py-2.5 px-3 text-right">Var %</th>
                      <th className="py-2.5 px-3 text-right">Part. 2025</th>
                      <th className="py-2.5 px-3 text-right">Part. 2026</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono">
                    <tr className="bg-amber-50/60 font-bold">
                      <td className="py-2.5 px-3 text-amber-900 font-sans">Presupuesto Inicial Total</td>
                      <td className="py-2.5 px-3 text-right">{formatCOP(result.total2025)}</td>
                      <td className="py-2.5 px-3 text-right text-amber-700">{formatCOP(result.total2026)}</td>
                      <td className="py-2.5 px-3 text-right text-emerald-700">+{formatCOP(result.difAbsolutaTotal)}</td>
                      <td className="py-2.5 px-3 text-right text-emerald-700 font-black">+13.09%</td>
                      <td className="py-2.5 px-3 text-right text-slate-600">100.00%</td>
                      <td className="py-2.5 px-3 text-right text-slate-800">100.00%</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 text-slate-700 font-sans">1.1 Ingresos Corrientes</td>
                      <td className="py-2.5 px-3 text-right">{formatCOP(430957885160)}</td>
                      <td className="py-2.5 px-3 text-right">{formatCOP(487113453890)}</td>
                      <td className="py-2.5 px-3 text-right text-emerald-700">+{formatCOP(56155568730)}</td>
                      <td className="py-2.5 px-3 text-right text-emerald-700">+13.03%</td>
                      <td className="py-2.5 px-3 text-right text-slate-600">99.61%</td>
                      <td className="py-2.5 px-3 text-right text-slate-800">99.56%</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 text-slate-700 font-sans">1.2 Recursos de Capital</td>
                      <td className="py-2.5 px-3 text-right">{formatCOP(1671094633)}</td>
                      <td className="py-2.5 px-3 text-right">{formatCOP(2153472035)}</td>
                      <td className="py-2.5 px-3 text-right text-emerald-700">+{formatCOP(482377402)}</td>
                      <td className="py-2.5 px-3 text-right text-emerald-700">+28.87%</td>
                      <td className="py-2.5 px-3 text-right text-slate-600">0.39%</td>
                      <td className="py-2.5 px-3 text-right text-slate-800">0.44%</td>
                    </tr>
                    <tr className="bg-slate-50">
                      <td className="py-2.5 px-3 text-slate-800 font-sans font-semibold">Apropiaciones de Funcionamiento</td>
                      <td className="py-2.5 px-3 text-right">{formatCOP(result.funcionamientoVsInversion.funcionamiento2025)}</td>
                      <td className="py-2.5 px-3 text-right">{formatCOP(result.funcionamientoVsInversion.funcionamiento2026)}</td>
                      <td className="py-2.5 px-3 text-right text-emerald-700">+{formatCOP(result.funcionamientoVsInversion.difFuncionamiento)}</td>
                      <td className="py-2.5 px-3 text-right text-emerald-700">+13.26%</td>
                      <td className="py-2.5 px-3 text-right text-slate-600">96.25%</td>
                      <td className="py-2.5 px-3 text-right text-slate-800 font-bold">96.39%</td>
                    </tr>
                    <tr className="bg-slate-50">
                      <td className="py-2.5 px-3 text-slate-800 font-sans font-semibold">Apropiaciones de Inversión</td>
                      <td className="py-2.5 px-3 text-right">{formatCOP(result.funcionamientoVsInversion.inversion2025)}</td>
                      <td className="py-2.5 px-3 text-right">{formatCOP(result.funcionamientoVsInversion.inversion2026)}</td>
                      <td className="py-2.5 px-3 text-right text-emerald-700">+{formatCOP(result.funcionamientoVsInversion.difInversion)}</td>
                      <td className="py-2.5 px-3 text-right text-emerald-700">+8.75%</td>
                      <td className="py-2.5 px-3 text-right text-slate-600">3.75%</td>
                      <td className="py-2.5 px-3 text-right text-slate-800 font-bold">3.61%</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* GRÁFICAS EJECUTIVAS INTEGRADAS (MODO FONDO BLANCO) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-3">
                {/* GRÁFICA 1: BARRAS MACRO */}
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <BarChart3 size={15} className="text-amber-600" />
                      Evolución Presupuestal: 2025 vs 2026 (Millones COP)
                    </h4>
                    <span className="text-[10px] font-mono text-slate-500 font-semibold">Cifras en Millones</span>
                  </div>
                  <div className="h-60 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dataReportMacro} margin={{ top: 10, right: 10, left: 0, bottom: 15 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" vertical={false} />
                        <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                        <YAxis stroke="#64748b" fontSize={10} tickFormatter={(v) => `$${v.toLocaleString()}`} />
                        <RechartsTooltip
                          formatter={(v: any) => [`$ ${Number(v).toLocaleString('es-CO', { maximumFractionDigits: 1 })} M`, '']}
                          contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '10px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Legend />
                        <Bar dataKey="2025" fill="#94a3b8" name="Inicial 2025" radius={[5, 5, 0, 0]} />
                        <Bar dataKey="2026" fill="#D97706" name="Inicial 2026" radius={[5, 5, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* GRÁFICA 2: DONUT RIGIDEZ DEL GASTO */}
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <PieIcon size={15} className="text-blue-600" />
                      Rigidez Estructural: Funcionamiento vs Inversión 2026
                    </h4>
                    <span className="text-[10px] font-mono text-slate-500 font-semibold">Participación %</span>
                  </div>
                  <div className="h-60 w-full flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={dataReportRigidezPie}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={85}
                          paddingAngle={4}
                          label={({ name, percent }: any) => `${name.split(' ')[0]} (${(percent * 100).toFixed(1)}%)`}
                          labelLine={false}
                        >
                          {dataReportRigidezPie.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          formatter={(v: any) => [`$ ${Number(v).toLocaleString('es-CO', { maximumFractionDigits: 1 })} M`, 'Apropiación']}
                          contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '10px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>

            {/* SECCIÓN 3: RECOMPOSICIÓN DE FUENTES DE FINANCIACIÓN Y CONTRIBUCIÓN */}
            <div className="space-y-4">
              <h3 className="text-base font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 pb-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                3. Evolución de Macrofuentes y Contribución al Crecimiento
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* GRÁFICA 3: GRUPOS DE RECURSOS */}
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 shadow-sm">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Apropiación por Macrofuentes de Financiación (Millones COP)
                  </h4>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dataReportMacroFuentes} margin={{ top: 10, right: 10, left: 0, bottom: 25 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" vertical={false} />
                        <XAxis dataKey="name" stroke="#64748b" fontSize={10} angle={-15} textAnchor="end" />
                        <YAxis stroke="#64748b" fontSize={10} tickFormatter={(v) => `$${v.toLocaleString()}`} />
                        <RechartsTooltip
                          formatter={(v: any) => [`$ ${Number(v).toLocaleString('es-CO', { maximumFractionDigits: 1 })} M`, '']}
                          contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '10px' }}
                        />
                        <Legend />
                        <Bar dataKey="2025" fill="#94a3b8" name="Inicial 2025" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="2026" fill="#0284C7" name="Inicial 2026" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* GRÁFICA 4: CONTRIBUCIÓN NETA */}
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 shadow-sm">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Factores Explicativos del Crecimiento (+56.637 M COP)
                  </h4>
                  <div className="space-y-2 text-xs">
                    {dataReportContribucionNet.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 text-[11px]">
                        <span className="font-medium text-slate-800 truncate max-w-xs">{item.concepto}</span>
                        <span className={`font-mono font-bold ${item.monto >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {item.monto >= 0 ? '+' : ''}${item.monto.toLocaleString('es-CO', { minimumFractionDigits: 1 })} M
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* SECCIÓN 4: CONCLUSIONES ESTRATÉGICAS Y DICTAMEN FINANCIERO */}
            <div className="space-y-4">
              <h3 className="text-base font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 pb-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                4. Conclusiones Estratégicas y Dictamen Financiero (VAFI)
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* CONCLUSIÓN 1: CRECIMIENTO NOMINAL Y REAL */}
                <div className="p-5 rounded-2xl bg-slate-50 border-l-4 border-emerald-500 border-t border-r border-b border-slate-200 space-y-2 shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold">1</span>
                    <h4 className="text-xs font-extrabold text-slate-900 uppercase">Crecimiento Nominal (+13,09%) y Ganancia Real (+7,50%)</h4>
                  </div>
                  <p className="text-xs text-slate-700 text-justify leading-relaxed">
                    El presupuesto total aprobado se expande en <strong>+$56.637.946.132 COP (+13,09%)</strong>.
                    Al deflactar este incremento frente a una inflación estimada del <strong>5,20% anual</strong>, la UPTC logra una <strong>ganancia neta de poder adquisitivo del +7,50%</strong>, consolidando una trayectoria positiva frente a los techos macroeconómicos nacionales.
                  </p>
                </div>

                {/* CONCLUSIÓN 2: APORTES NACIÓN Y NÓMINA */}
                <div className="p-5 rounded-2xl bg-slate-50 border-l-4 border-amber-500 border-t border-r border-b border-slate-200 space-y-2 shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center text-xs font-bold">2</span>
                    <h4 className="text-xs font-extrabold text-slate-900 uppercase">Aportes Nación (R10.0): Eje Central y Cobertura Salarial</h4>
                  </div>
                  <p className="text-xs text-slate-700 text-justify leading-relaxed">
                    El recurso 10.0 (Art. 86 Ley 30) creció en <strong>+$51.242.558.145 COP (+19,44%)</strong>, alcanzando $314.781 M COP y explicando el <strong>90,47% de todo el crecimiento institucional</strong>.
                    Este monto financia de forma directa la nómina de docentes y administrativos de planta y transitorios (rubro 2.1.1), garantizando la estabilidad operativa del personal.
                  </p>
                </div>

                {/* CONCLUSIÓN 3: RECOMPOSICIÓN DE LA GRATUIDAD */}
                <div className="p-5 rounded-2xl bg-slate-50 border-l-4 border-cyan-500 border-t border-r border-b border-slate-200 space-y-2 shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-cyan-100 text-cyan-800 flex items-center justify-center text-xs font-bold">3</span>
                    <h4 className="text-xs font-extrabold text-slate-900 uppercase">Recomposición de Gratuidad: Saldo Neto Positivo (+8,94%)</h4>
                  </div>
                  <p className="text-xs text-slate-700 text-justify leading-relaxed">
                    Aunque el fondo histórico FSE (R14) cayó en -$17.472 M (-48,25%), esta disminución obedece al desdoblamiento técnico del Ministerio de Educación, que creó el nuevo rubro <strong>10.5 Política de Gratuidad con $20.708 M COP</strong>.
                    En términos netos consolidados, los recursos de matrícula y gratuidad crecieron en <strong>+$3.235.442.680 COP (+8,94%)</strong>.
                  </p>
                </div>

                {/* CONCLUSIÓN 4: RECURSOS PROPIOS VS EXTENSIÓN */}
                <div className="p-5 rounded-2xl bg-slate-50 border-l-4 border-purple-500 border-t border-r border-b border-slate-200 space-y-2 shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center text-xs font-bold">4</span>
                    <h4 className="text-xs font-extrabold text-slate-900 uppercase">Autonomía en Recursos Propios (+47,44%) vs Alerta en Convenios</h4>
                  </div>
                  <p className="text-xs text-slate-700 text-justify leading-relaxed">
                    Los Recursos Propios (R20) alcanzaron $17.299 M COP (+47,44%, +$5.566 M), aportando liquidez no condicionada.
                    Sin embargo, los <strong>Convenios con derechos (R33) cayeron en -$4.143 M (-11,96%)</strong> y Posgrados (R31) permaneció estable (+0,08%), señalando la urgencia de dinamizar la gestión de consultorías y proyectos externos.
                  </p>
                </div>

                {/* CONCLUSIÓN 5: RIGIDEZ Y RIESGO DE INVERSIÓN (ANCHO COMPLETO) */}
                <div className="md:col-span-2 p-5 rounded-2xl bg-slate-50 border-l-4 border-rose-500 border-t border-r border-b border-slate-200 space-y-2 shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-rose-100 text-rose-800 flex items-center justify-center text-xs font-bold">5</span>
                    <h4 className="text-xs font-extrabold text-slate-900 uppercase">Alerta Estructural: Rigidez del 96,39% y Estancamiento en Inversión (3,61%)</h4>
                  </div>
                  <p className="text-xs text-slate-700 text-justify leading-relaxed">
                    El presupuesto presenta una rigidez crítica: <strong>$471.625 M (96,39%) están comprometidos en funcionamiento</strong>, dejando solo <strong>$17.641 M (3,61%) para inversión física y tecnológica</strong>.
                    Además, la inversión perdió 0,14 puntos de participación relativa. Sumado a una concentración del <strong>75,18% en transferencias del Gobierno Nacional</strong> y un índice HHI de <strong>4.406 puntos</strong>, la institución debe salvaguardar su sostenibilidad mediante rigurosa disciplina de gasto y apalancamiento en Regalías.
                  </p>
                </div>
              </div>
            </div>

            {/* SECCIÓN 5: RECOMENDACIONES ESTRATÉGICAS PARA RECTORÍA Y CONSEJO SUPERIOR */}
            <div className="space-y-4 pt-2">
              <h3 className="text-base font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 pb-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                5. Recomendaciones Estratégicas y Hoja de Ruta Directiva
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <strong className="text-slate-900 flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-emerald-600" />
                    1. Conciliación y Flujo de PAC con MinHacienda:
                  </strong>
                  <p className="text-slate-600 leading-relaxed">
                    Sincronizar mensualmente las fechas de giro de Aportes Nación (R10.0) con el cronograma de pago de la nómina mensual y prestaciones de mitad y final de año para blindar la liquidez de tesorería.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <strong className="text-slate-900 flex items-center gap-1.5">
                    <CheckSquare size={14} className="text-cyan-600" />
                    2. Formalización del Rubro 10.5 de Gratuidad:
                  </strong>
                  <p className="text-slate-600 leading-relaxed">
                    Establecer mesa técnica trimestral entre la Dirección de Presupuesto y el Viceministerio de Educación Superior para asegurar la expedición oportuna de resoluciones que soporten los $20.708 M de gratuidad.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <strong className="text-slate-900 flex items-center gap-1.5">
                    <TrendingUp size={14} className="text-amber-600" />
                    3. Plan de Reactivación Comercial de Extensión (R33):
                  </strong>
                  <p className="text-slate-600 leading-relaxed">
                    Instruir a las facultades y centros de investigación la formulación de nuevas propuestas y consultorías remuneradas para revertir la caída de -$4.143 M en convenios y expandir los ingresos propios.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <strong className="text-slate-900 flex items-center gap-1.5">
                    <AlertCircle size={14} className="text-rose-600" />
                    4. Plan de Inversión y Mitigación de Obsolescencia:
                  </strong>
                  <p className="text-slate-600 leading-relaxed">
                    Formular proyectos de inversión con cargo al Sistema General de Regalías (R15) y Estampilla Pro-UPTC (R40) para compensar el bajo peso de inversión (3.61%) y modernizar laboratorios y sedes seccionales.
                  </p>
                </div>
              </div>
            </div>

            {/* SECCIÓN 6: CIERRE FORMAL Y FIRMAS INSTITUCIONALES */}
            <div className="pt-8 border-t-2 border-slate-300 flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-slate-700">
              <div className="space-y-1 text-center md:text-left">
                <p className="font-black text-slate-900 uppercase text-sm">Vicerrectoría Administrativa y Financiera</p>
                <p className="text-slate-600 font-medium">Dirección de Planeación y Presupuesto Institucional</p>
                <p className="text-slate-500">Universidad Pedagógica y Tecnológica de Colombia (UPTC)</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 text-center md:text-right font-mono text-[10px] text-slate-600 space-y-0.5">
                <div><strong>CERTIFICACIÓN DE INTEGRIDAD DE DATOS</strong></div>
                <div>Hash de Validación: UPTC-VAFI-2526-SECURE-AUDITED</div>
                <div>Aprobado según Acuerdos Superiores de Presupuesto Inicial</div>
              </div>
            </div>
          </div>
        </div>
      )}

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
                        }}`}>
                          {r.estado}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

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
          <div className="p-6 rounded-3xl bg-gradient-to-r from-amber-500/10 via-zinc-900 to-black border border-amber-500/20 space-y-3 shadow-xl">
            <span className="px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5 w-fit">
              <Sparkles size={13} /> Panel de Expertos Multidisciplinario
            </span>
            <h3 className="text-base font-bold text-white">Dictamen de Transformaciones Presupuestales 2025–2026</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Consolidación de observaciones del equipo integrado por el <strong>Analista Presupuestal</strong> (clasificación catálogo público), <strong>Economista</strong> (crecimiento nominal +13.09% vs real +7.50% deflactado), <strong>Analista Financiero</strong> (rigidez salarial y dependencia 75.18% de Nación), <strong>Científico de Datos</strong> (integridad matemática) y <strong>Auditor Presupuestal</strong> (trazabilidad y correspondencia exacta de cifras).
            </p>
          </div>

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
    </div>
  );
}
