import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Clock,
  Scale,
  Award,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  FileText,
  Download,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  Info,
  Calendar,
  Layers,
  Sparkles,
  RefreshCw,
  Sliders,
  CheckCircle2,
  XCircle,
  HelpCircle,
  BarChart3
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
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

// --- Formateadores oficiales ---
function formatCurrency(value: number) {
  if (value === undefined || value === null || isNaN(value) || value === 0) return '$ 0 M';
  const inM = value / 1e6;
  const abs = Math.abs(inM);
  const sign = inM < 0 ? '-' : '';
  const maxDec = abs < 1 && abs > 0 ? 2 : 1;
  return `${sign}$ ${abs.toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: maxDec })} M`;
}

function formatCOP(value: number) {
  if (value === undefined || value === null || isNaN(value)) return '$ 0';
  return `$ ${Math.round(value).toLocaleString('es-CO')}`;
}

// --- Datos Oficiales de Ejecución 2026 (gastos_2026.csv y Nomina.csv) ---
const RECURSOS_DATA = [
  {
    codigo: '10',
    nombre: 'Recurso 10 - Nación Funcionamiento',
    nivel: 'Pregrado (Sede Central y Seccionales)',
    tipoBase: 'Base Presupuestal',
    compromiso: 8305651667,
    pagado: 4518339536,
    porcentaje: 54.4,
    color: '#ffcc29'
  },
  {
    codigo: '10.5',
    nombre: 'Recurso 10.5 - Política de Gratuidad',
    nivel: 'Pregrado (Fortalecimiento Estudiantil)',
    tipoBase: 'Base Presupuestal',
    compromiso: 142133515,
    pagado: 77321745,
    porcentaje: 54.4,
    color: '#4ade80'
  },
  {
    codigo: '17',
    nombre: 'Recurso 17 - Descuento por Votación',
    nivel: 'Pregrado',
    tipoBase: 'No Base (Específico)',
    compromiso: 109326074,
    pagado: 59474240,
    porcentaje: 54.4,
    color: '#38bdf8'
  },
  {
    codigo: '14',
    nombre: 'Recurso 14 - Otros Recursos de Capital',
    nivel: 'Pregrado',
    tipoBase: 'No Base (Específico)',
    compromiso: 4390058,
    pagado: 2388226,
    porcentaje: 54.4,
    color: '#c084fc'
  },
  {
    codigo: '31',
    nombre: 'Recurso 31 - Recursos Propios Posgrados',
    nivel: 'Posgrados (Cátedra Externa)',
    tipoBase: 'No Base (Recursos Propios)',
    compromiso: 8728558415,
    pagado: 6967332459,
    porcentaje: 79.8,
    color: '#fb7185'
  },
  {
    codigo: '34',
    nombre: 'Recurso 34 - Convenios y Fondos Especiales',
    nivel: 'Posgrados Especiales',
    tipoBase: 'No Base (Convenios)',
    compromiso: 163936151,
    pagado: 132166114,
    porcentaje: 80.6,
    color: '#f97316'
  }
];

// Curva de nómina mensual 2026 consolidada de Nomina.csv (en Millones)
const NOMINA_MENSUAL = [
  { mes: 'Ene', pregrado: 4.56, tecnica: 0.0, tecnologica: 0.0, posgrado: 0.0, total: 4.56 },
  { mes: 'Feb', pregrado: 379.39, tecnica: 33.71, tecnologica: 33.00, posgrado: 121.05, total: 567.15 },
  { mes: 'Mar', pregrado: 655.49, tecnica: 53.39, tecnologica: 53.30, posgrado: 1443.96, total: 2206.14 },
  { mes: 'Abr', pregrado: 746.08, tecnica: 139.09, tecnologica: 61.03, posgrado: 1367.96, total: 2314.16 },
  { mes: 'May', pregrado: 735.76, tecnica: 267.13, tecnologica: 57.64, posgrado: 1674.40, total: 2734.93 },
  { mes: 'Jun', pregrado: 431.84, tecnica: 125.61, tecnologica: 34.71, posgrado: 1205.22, total: 1797.38 },
  { mes: 'Jul', pregrado: 11.38, tecnica: 65.74, tecnologica: 2.38, posgrado: 65.97, total: 145.47 },
  { mes: 'Ago', pregrado: 507.63, tecnica: 222.11, tecnologica: 36.85, posgrado: 1220.66, total: 1987.25 }
];

// Escala de puntos oficiales Acuerdo 015 de 2009
const ESCALA_PUNTOS = [
  {
    categoria: 'Profesor Auxiliar',
    puntos: 2.50,
    equivalencia: 'Profesional universitario sin posgrado o con especialización en trámite',
    tarifa2024: 52238,
    tarifa2025: 55895,
    tarifa2026: 59810,
    participacionEst: '28%'
  },
  {
    categoria: 'Profesor Asistente',
    puntos: 2.75,
    equivalencia: 'Especialista graduado o Magíster con experiencia docente calificada',
    tarifa2024: 57461,
    tarifa2025: 61485,
    tarifa2026: 65791,
    participacionEst: '44%'
  },
  {
    categoria: 'Profesor Asociado',
    puntos: 3.00,
    equivalencia: 'Magíster con amplia trayectoria o Doctor (PhD) en consolidación',
    tarifa2024: 62685,
    tarifa2025: 67074,
    tarifa2026: 71772,
    participacionEst: '20%'
  },
  {
    categoria: 'Profesor Titular',
    puntos: 3.50,
    equivalencia: 'Doctor (PhD) con alta producción académica y reconocimiento en escalafón',
    tarifa2024: 73133,
    tarifa2025: 78253,
    tarifa2026: 83734,
    participacionEst: '8%'
  }
];

// Evolución del valor del punto Decreto 1279
const VALORES_PUNTO = [
  { vigencia: 2024, norma: 'Decreto 0298 de 2024', valor: 20895, variacion: '+10.88%' },
  { vigencia: 2025, norma: 'Decreto 0618 de 2025', valor: 22358, variacion: '+7.00%' },
  { vigencia: 2026, norma: 'Decreto 0318 de 2026', valor: 23924, variacion: '+7.00%' }
];

export function HorasCatedraScreen({ onNavigate }: { onNavigate: (s: string) => void }) {
  const [activeTab, setActiveTab] = useState<'ejecucion' | 'normativa' | 'simulador' | 'eficiencia'>('ejecucion');

  // Filtros Tablero
  const [filtroNivel, setFiltroNivel] = useState<'todos' | 'pregrado' | 'posgrado'>('todos');

  // Estados del Simulador Oficial
  const [modalidad, setModalidad] = useState<'externa' | 'interna'>('externa');
  const [categoriaIndex, setCategoriaIndex] = useState<number>(1); // Asistente (2.75) por defecto
  const [horasSemanales, setHorasSemanales] = useState<number>(4);
  const [semanasSemestre, setSemanasSemestre] = useState<number>(16);
  const [valorPuntoSim, setValorPuntoSim] = useState<number>(23924);
  const [mesesPago, setMesesPago] = useState<number>(4);

  // Cálculos del simulador
  const categoriaSeleccionada = ESCALA_PUNTOS[categoriaIndex];
  const valorHora = useMemo(() => {
    return Math.round(categoriaSeleccionada.puntos * valorPuntoSim);
  }, [categoriaSeleccionada, valorPuntoSim]);

  const totalHorasSemestre = useMemo(() => {
    return horasSemanales * semanasSemestre;
  }, [horasSemanales, semanasSemestre]);

  const valorTotalContrato = useMemo(() => {
    return valorHora * totalHorasSemestre;
  }, [valorHora, totalHorasSemestre]);

  const valorMensualPromedio = useMemo(() => {
    return mesesPago > 0 ? Math.round(valorTotalContrato / mesesPago) : 0;
  }, [valorTotalContrato, mesesPago]);

  // Validación de Cátedra Interna (Acuerdo 015 de 2009, Art. 2)
  const esExcedidoTopeInterno = modalidad === 'interna' && horasSemanales > 4;

  // Totales de Ejecución
  const totalCompromiso = 17453995880;
  const totalPagado = 11757022320;
  const saldoPorEjecutar = totalCompromiso - totalPagado;
  const porcentajeEjecutadoGlobal = (totalPagado / totalCompromiso) * 100;

  const recursosFiltrados = useMemo(() => {
    if (filtroNivel === 'pregrado') {
      return RECURSOS_DATA.filter(r => r.nivel.includes('Pregrado'));
    }
    if (filtroNivel === 'posgrado') {
      return RECURSOS_DATA.filter(r => r.nivel.includes('Posgrado'));
    }
    return RECURSOS_DATA;
  }, [filtroNivel]);

  // Exportar datos a CSV
  const handleExportCSV = () => {
    const headers = ['Recurso', 'Nivel', 'Clasificacion', 'Compromiso ($ M)', 'Pagado ($ M)', '% Ejecucion'];
    const rows = RECURSOS_DATA.map(r => [
      `"${r.nombre}"`,
      `"${r.nivel}"`,
      `"${r.tipoBase}"`,
      (r.compromiso / 1e6).toFixed(2),
      (r.pagado / 1e6).toFixed(2),
      r.porcentaje.toFixed(1)
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'UPTC_Ejecucion_Horas_Catedra_2026.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ========================================================================= */}
      {/* ENCABEZADO PRINCIPAL INSTITUCIONAL */}
      {/* ========================================================================= */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-surface-container-high via-surface-container-low to-black/80 border border-white/10 p-6 md:p-8 shadow-2xl backdrop-blur-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary-container/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary-container/20 text-primary-container border border-primary-container/30">
                <Scale size={13} className="text-primary-container" />
                Acuerdo No. 015 de 2009
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <CheckCircle size={13} />
                Decreto 1279 de 2002
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                <Calendar size={13} />
                Vigencia 2026
              </span>
            </div>

            <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <BookOpen className="text-primary-container w-8 h-8 md:w-10 md:h-10" />
              Módulo de Horas Cátedra
            </h1>

            <p className="text-sm md:text-base text-on-surface-variant max-w-3xl leading-relaxed">
              Administración normativa, monitoreo de la ejecución presupuestal de nómina temporal docente y simulador oficial
              de remuneración por hora cátedra de pregrado y posgrados de la Universidad Pedagógica y Tecnológica de Colombia.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <a
              href="http://pagos.uptc.edu.co/DocCompNormativa/015DE2009.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-container-high/80 hover:bg-white/10 text-white text-xs font-medium border border-white/10 transition-all hover:scale-[1.02] shadow-lg cursor-pointer"
            >
              <ExternalLink size={14} className="text-primary-container" />
              <span>Ver Acuerdo 015/2009 PDF</span>
            </a>

            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-container hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all hover:scale-[1.02] shadow-[0_0_20px_rgba(255,204,41,0.25)] cursor-pointer"
            >
              <Download size={14} />
              <span>Exportar Reporte</span>
            </button>
          </div>
        </div>

        {/* Barra de Tabs */}
        <div className="mt-8 flex flex-wrap gap-2 border-b border-white/10 pb-1">
          <button
            onClick={() => setActiveTab('ejecucion')}
            className={`flex items-center gap-2 px-5 py-3 rounded-t-xl text-xs md:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'ejecucion'
                ? 'bg-white/10 text-primary-container border-b-2 border-primary-container'
                : 'text-on-surface-variant hover:text-white hover:bg-white/5'
            }`}
          >
            <BarChart3 size={16} />
            <span>Ejecución Presupuestal 2026</span>
          </button>

          <button
            onClick={() => setActiveTab('normativa')}
            className={`flex items-center gap-2 px-5 py-3 rounded-t-xl text-xs md:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'normativa'
                ? 'bg-white/10 text-primary-container border-b-2 border-primary-container'
                : 'text-on-surface-variant hover:text-white hover:bg-white/5'
            }`}
          >
            <Scale size={16} />
            <span>Marco Normativo (Acuerdo 015)</span>
          </button>

          <button
            onClick={() => setActiveTab('simulador')}
            className={`flex items-center gap-2 px-5 py-3 rounded-t-xl text-xs md:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'simulador'
                ? 'bg-white/10 text-primary-container border-b-2 border-primary-container'
                : 'text-on-surface-variant hover:text-white hover:bg-white/5'
            }`}
          >
            <Sliders size={16} />
            <span>Simulador & Liquidador</span>
          </button>

          <button
            onClick={() => setActiveTab('eficiencia')}
            className={`flex items-center gap-2 px-5 py-3 rounded-t-xl text-xs md:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'eficiencia'
                ? 'bg-white/10 text-primary-container border-b-2 border-primary-container'
                : 'text-on-surface-variant hover:text-white hover:bg-white/5'
            }`}
          >
            <TrendingUp size={16} />
            <span>Análisis de Costos & Proyección</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PESTAÑA 1: TABLERO DE EJECUCIÓN PRESUPUESTAL 2026 */}
      {/* ========================================================================= */}
      {activeTab === 'ejecucion' && (
        <div className="space-y-6">
          {/* Tarjetas KPI */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl bg-surface-container/60 border border-white/10 p-5 shadow-lg backdrop-blur-md relative overflow-hidden">
              <div className="flex items-center justify-between text-on-surface-variant text-xs font-medium mb-2">
                <span>Compromiso Anual 2026</span>
                <span className="p-2 rounded-xl bg-primary-container/10 text-primary-container">
                  <DollarSign size={18} />
                </span>
              </div>
              <div className="text-2xl font-black text-white">{formatCurrency(totalCompromiso)}</div>
              <div className="mt-2 text-xs text-on-surface-variant flex items-center justify-between">
                <span>Pregrado: {formatCurrency(8561501314)}</span>
                <span className="text-primary-container font-mono">Posg: {formatCurrency(8892494566)}</span>
              </div>
            </div>

            <div className="rounded-2xl bg-surface-container/60 border border-white/10 p-5 shadow-lg backdrop-blur-md relative overflow-hidden">
              <div className="flex items-center justify-between text-on-surface-variant text-xs font-medium mb-2">
                <span>Pagos Realizados (a Ago 2026)</span>
                <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <TrendingUp size={18} />
                </span>
              </div>
              <div className="text-2xl font-black text-emerald-400">{formatCurrency(totalPagado)}</div>
              <div className="mt-2 text-xs text-on-surface-variant flex items-center gap-1.5">
                <span className="font-semibold text-emerald-400">{porcentajeEjecutadoGlobal.toFixed(1)}%</span>
                <span>de avance presupuestal global</span>
              </div>
            </div>

            <div className="rounded-2xl bg-surface-container/60 border border-white/10 p-5 shadow-lg backdrop-blur-md relative overflow-hidden">
              <div className="flex items-center justify-between text-on-surface-variant text-xs font-medium mb-2">
                <span>Saldo por Ejecutar (Sep - Dic)</span>
                <span className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                  <Clock size={18} />
                </span>
              </div>
              <div className="text-2xl font-black text-blue-400">{formatCurrency(saldoPorEjecutar)}</div>
              <div className="mt-2 text-xs text-on-surface-variant flex items-center gap-1.5">
                <span className="font-semibold text-blue-400">{(100 - porcentajeEjecutadoGlobal).toFixed(1)}%</span>
                <span>disponible para segundo semestre</span>
              </div>
            </div>

            <div className="rounded-2xl bg-surface-container/60 border border-white/10 p-5 shadow-lg backdrop-blur-md relative overflow-hidden">
              <div className="flex items-center justify-between text-on-surface-variant text-xs font-medium mb-2">
                <span>Valor Punto Decreto 1279</span>
                <span className="p-2 rounded-xl bg-amber-500/10 text-amber-300">
                  <Award size={18} />
                </span>
              </div>
              <div className="text-2xl font-black text-amber-300">$ 23.924 COP</div>
              <div className="mt-2 text-xs text-on-surface-variant flex items-center gap-1.5">
                <span className="font-semibold text-emerald-400">+7.00%</span>
                <span>fijado por Dcto. 318 de 2026</span>
              </div>
            </div>
          </div>

          {/* Gráfico de Nómina Mensual de Cátedra */}
          <div className="rounded-3xl bg-surface-container/60 border border-white/10 p-6 shadow-xl backdrop-blur-md space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Calendar className="text-primary-container" size={20} />
                  Curva Mensual de Desembolsos por Horas Cátedra (2026)
                </h3>
                <p className="text-xs text-on-surface-variant">
                  Evolución cronológica de la nómina temporal de cátedra (enero a agosto de 2026 en Millones de Pesos).
                </p>
              </div>

              <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-xl border border-white/10 text-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <span className="text-slate-300">Total Liquidado a Agosto:</span>
                <span className="font-bold text-white font-mono">{formatCurrency(totalPagado)}</span>
              </div>
            </div>

            <div className="h-80 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={NOMINA_MENSUAL} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="mes" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <YAxis
                    stroke="#94a3b8"
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    tickFormatter={(v) => `$ ${v} M`}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.95)',
                      borderColor: 'rgba(255,255,255,0.15)',
                      borderRadius: '1rem',
                      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
                    }}
                    formatter={(val: any) => [`$ ${Number(val).toLocaleString('es-CO', { minimumFractionDigits: 1 })} M`, '']}
                  />
                  <Legend wrapperStyle={{ paddingTop: 10 }} />
                  <Bar dataKey="pregrado" name="Pregrado Cátedra" fill="#ffcc29" radius={[4, 4, 0, 0]} stackId="a" />
                  <Bar dataKey="tecnica" name="Técnica Cátedra" fill="#38bdf8" radius={[4, 4, 0, 0]} stackId="a" />
                  <Bar dataKey="tecnologica" name="Tecnológica Cátedra" fill="#c084fc" radius={[4, 4, 0, 0]} stackId="a" />
                  <Bar dataKey="posgrado" name="Posgrado Cátedra" fill="#fb7185" radius={[4, 4, 0, 0]} stackId="a" />
                  <Area type="monotone" dataKey="total" name="Total Desembolsado" stroke="#4ade80" fill="transparent" strokeWidth={3} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs">
              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <span className="text-on-surface-variant font-medium">Pico de Liquidación (Mayo):</span>
                <p className="text-white font-bold mt-1">$ 2.734,9 M (Cierre del primer semestre académico)</p>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <span className="text-on-surface-variant font-medium">Receso Intersemestral (Julio):</span>
                <p className="text-white font-bold mt-1">$ 145,5 M (Mínimo estacional por vacaciones)</p>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <span className="text-on-surface-variant font-medium">Reinicio Segundo Semestre (Agosto):</span>
                <p className="text-white font-bold mt-1">$ 1.987,3 M (Reanudación de contratos 2026-II)</p>
              </div>
            </div>
          </div>

          {/* Desglose por Fuentes de Financiación */}
          <div className="rounded-3xl bg-surface-container/60 border border-white/10 p-6 shadow-xl backdrop-blur-md space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Layers className="text-primary-container" size={20} />
                  Desglose Presupuestal por Fuentes de Financiación (2026)
                </h3>
                <p className="text-xs text-on-surface-variant">
                  Apropiación, pagos y porcentaje de ejecución clasificados por fuente y base presupuestal.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFiltroNivel('todos')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    filtroNivel === 'todos' ? 'bg-primary-container text-slate-950' : 'bg-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  Todos ({RECURSOS_DATA.length})
                </button>
                <button
                  onClick={() => setFiltroNivel('pregrado')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    filtroNivel === 'pregrado' ? 'bg-primary-container text-slate-950' : 'bg-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  Pregrado
                </button>
                <button
                  onClick={() => setFiltroNivel('posgrado')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    filtroNivel === 'posgrado' ? 'bg-primary-container text-slate-950' : 'bg-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  Posgrados
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/5 text-slate-300 font-semibold border-b border-white/10 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="p-3.5">Fuente / Denominación</th>
                    <th className="p-3.5">Nivel Académico</th>
                    <th className="p-3.5">Clasificación Base</th>
                    <th className="p-3.5 text-right">Compromiso ($ M)</th>
                    <th className="p-3.5 text-right">Pagado a Ago ($ M)</th>
                    <th className="p-3.5 text-right">Saldo Sep-Dic ($ M)</th>
                    <th className="p-3.5 text-center">% Ejec.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-200">
                  {recursosFiltrados.map((r) => {
                    const saldo = r.compromiso - r.pagado;
                    return (
                      <tr key={r.codigo} className="hover:bg-white/5 transition-colors">
                        <td className="p-3.5 font-medium flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: r.color }} />
                          <div>
                            <div className="text-white font-bold">{r.nombre}</div>
                            <span className="text-[10px] text-slate-400">Recurso {r.codigo}</span>
                          </div>
                        </td>
                        <td className="p-3.5 text-slate-300">{r.nivel}</td>
                        <td className="p-3.5">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border ${
                              r.tipoBase === 'Base Presupuestal'
                                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                : 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                            }`}
                          >
                            {r.tipoBase}
                          </span>
                        </td>
                        <td className="p-3.5 text-right font-mono font-bold text-white">
                          {formatCurrency(r.compromiso)}
                        </td>
                        <td className="p-3.5 text-right font-mono font-bold text-emerald-400">
                          {formatCurrency(r.pagado)}
                        </td>
                        <td className="p-3.5 text-right font-mono text-slate-300">
                          {formatCurrency(saldo)}
                        </td>
                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-16 bg-white/10 rounded-full h-2 overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${r.porcentaje}%`,
                                  backgroundColor: r.color
                                }}
                              />
                            </div>
                            <span className="font-mono font-bold text-[11px] text-white">
                              {r.porcentaje.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-black/40 border-t-2 border-white/20 font-bold text-white text-xs">
                  <tr>
                    <td colSpan={3} className="p-3.5 uppercase tracking-wider text-primary-container">
                      Total Cátedra UPTC 2026
                    </td>
                    <td className="p-3.5 text-right font-mono text-primary-container">
                      {formatCurrency(totalCompromiso)}
                    </td>
                    <td className="p-3.5 text-right font-mono text-emerald-400">
                      {formatCurrency(totalPagado)}
                    </td>
                    <td className="p-3.5 text-right font-mono text-blue-300">
                      {formatCurrency(saldoPorEjecutar)}
                    </td>
                    <td className="p-3.5 text-center font-mono text-primary-container">
                      {porcentajeEjecutadoGlobal.toFixed(1)}%
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PESTAÑA 2: MARCO NORMATIVO ACUERDO 015 DE 2009 */}
      {/* ========================================================================= */}
      {activeTab === 'normativa' && (
        <div className="space-y-6">
          {/* Tarjeta de Resumen Normativo */}
          <div className="rounded-3xl bg-surface-container/60 border border-white/10 p-6 md:p-8 shadow-xl backdrop-blur-md space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-white/10 pb-6">
              <div className="space-y-1">
                <span className="text-xs font-bold text-primary-container uppercase tracking-widest">
                  Consejo Superior Universitario UPTC
                </span>
                <h2 className="text-xl md:text-2xl font-black text-white">
                  Acuerdo No. 015 de 2009 (29 de Enero de 2009)
                </h2>
                <p className="text-xs md:text-sm text-slate-300">
                  "Por el cual se fijan los valores de remuneración para los profesores que laboren por horas en los
                  programas de pregrado de la Universidad Pedagógica y Tecnológica de Colombia y se dictan otras disposiciones"
                </p>
              </div>

              <div className="flex items-center gap-3">
                <a
                  href="http://pagos.uptc.edu.co/DocCompNormativa/015DE2009.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl bg-primary-container text-slate-950 text-xs font-bold flex items-center gap-2 hover:bg-amber-400 transition-all shadow-md cursor-pointer"
                >
                  <Download size={14} />
                  Descargar Documento Oficial
                </a>
              </div>
            </div>

            {/* Tabla de Puntos por Escalafón Oficial */}
            <div className="space-y-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Award className="text-primary-container" size={18} />
                Artículo 1: Asignación de Puntos por Hora de Clase en Pregrado
              </h3>
              <p className="text-xs text-on-surface-variant">
                La remuneración de los profesores de cátedra se liquida multiplicando el número de puntos fijados por la
                categoría en el escalafón docente por el valor del punto establecido en el <strong>Decreto 1279 de 2002</strong>.
              </p>

              <div className="overflow-x-auto rounded-2xl border border-white/10">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/5 text-slate-300 font-semibold border-b border-white/10 text-[11px] uppercase">
                    <tr>
                      <th className="p-3.5">Categoría en Escalafón</th>
                      <th className="p-3.5 text-center">Puntos por Hora</th>
                      <th className="p-3.5">Equivalencia para Docentes Externos (Parágrafo 1)</th>
                      <th className="p-3.5 text-right">Tarifa Horaria 2024</th>
                      <th className="p-3.5 text-right">Tarifa Horaria 2025</th>
                      <th className="p-3.5 text-right text-primary-container">Tarifa Horaria 2026</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-200">
                    {ESCALA_PUNTOS.map((e) => (
                      <tr key={e.categoria} className="hover:bg-white/5 transition-colors">
                        <td className="p-3.5 font-bold text-white flex items-center gap-2">
                          <CheckCircle2 size={14} className="text-primary-container" />
                          {e.categoria}
                        </td>
                        <td className="p-3.5 text-center font-mono font-extrabold text-primary-container text-sm">
                          {e.puntos.toFixed(2)} pts
                        </td>
                        <td className="p-3.5 text-slate-300 max-w-xs">{e.equivalencia}</td>
                        <td className="p-3.5 text-right font-mono text-slate-400">{formatCOP(e.tarifa2024)}</td>
                        <td className="p-3.5 text-right font-mono text-slate-300">{formatCOP(e.tarifa2025)}</td>
                        <td className="p-3.5 text-right font-mono font-bold text-emerald-400 text-sm">
                          {formatCOP(e.tarifa2026)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Evolución Histórica del Valor del Punto */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              {VALORES_PUNTO.map((vp) => (
                <div key={vp.vigencia} className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Vigencia {vp.vigencia}</span>
                    <span className="text-emerald-400 font-bold">{vp.variacion}</span>
                  </div>
                  <div className="text-xl font-black text-white">{formatCOP(vp.valor)}</div>
                  <p className="text-[11px] text-slate-400">{vp.norma}</p>
                </div>
              ))}
            </div>

            {/* Desglose de Artículos 2, 3 y 4 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/10">
              {/* Articulo 2 */}
              <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-5 space-y-3">
                <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                  <AlertTriangle size={18} />
                  Artículo 2: Cátedra Interna (Docentes de Planta y Ocasionales)
                </div>
                <p className="text-xs text-slate-200 leading-relaxed">
                  Los docentes de tiempo completo y medio tiempo de planta u ocasionales podrán dictar horas de cátedra
                  adicionales, sujeto a las siguientes condiciones estrictas:
                </p>
                <ul className="text-xs text-slate-300 space-y-2 list-disc pl-4">
                  <li>
                    <strong>Máximo una (1) asignatura:</strong> Por necesidad imperiosa del servicio y de menor intensidad horaria.
                  </li>
                  <li className="text-amber-200 font-bold">
                    Tope legal no superior a cuatro (4) horas semanales de clase.
                  </li>
                  <li>
                    <strong>Flujo de autorización en cascada:</strong> Justificación de la Dirección de Escuela → Aval Comité de
                    Currículo → Aprobación Consejo de Facultad → Visto bueno Vicerrectoría Académica → Acto administrativo expedido por el Rector.
                  </li>
                </ul>
              </div>

              {/* Articulo 3 */}
              <div className="rounded-2xl bg-rose-500/10 border border-rose-500/30 p-5 space-y-3">
                <div className="flex items-center gap-2 text-rose-300 font-bold text-sm">
                  <XCircle size={18} />
                  Artículo 3: Régimen de Incompatibilidades y Prohibiciones
                </div>
                <p className="text-xs text-slate-200 leading-relaxed">
                  Garantía de transparencia y acatamiento al <strong>Artículo 128 de la Constitución Política</strong> (prohibición de doble asignación del tesoro público):
                </p>
                <ul className="text-xs text-slate-300 space-y-2 list-disc pl-4">
                  <li>
                    <strong>Fuera de jornada laboral:</strong> Las horas de cátedra interna deben ser dictadas obligatoriamente
                    fuera del horario ordinario de trabajo asignado.
                  </li>
                  <li>
                    <strong>Incompatibilidad con descarga:</strong> Queda absolutamente prohibida la asignación de horas cátedra
                    a docentes que gocen de descarga académica por investigación, extensión o administración.
                  </li>
                  <li>
                    <strong>Principio de subsidiariedad:</strong> Solo procede cuando la asignatura no pueda ser cubierta por el
                    Banco de Información de Elegibles (B.I.E.).
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PESTAÑA 3: SIMULADOR Y LIQUIDADOR INTERACTIVO */}
      {/* ========================================================================= */}
      {activeTab === 'simulador' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Panel de Configuración (7 Cols) */}
          <div className="lg:col-span-7 rounded-3xl bg-surface-container/60 border border-white/10 p-6 md:p-8 shadow-xl backdrop-blur-md space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Sliders className="text-primary-container" size={20} />
                  Parámetros de Liquidación de Cátedra
                </h3>
                <p className="text-xs text-on-surface-variant">
                  Configure las variables de vinculación para calcular la remuneración exacta bajo el Acuerdo 015 de 2009.
                </p>
              </div>

              <button
                onClick={() => {
                  setModalidad('externa');
                  setCategoriaIndex(1);
                  setHorasSemanales(4);
                  setSemanasSemestre(16);
                  setValorPuntoSim(23924);
                  setMesesPago(4);
                }}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 p-2 rounded-lg bg-white/5 cursor-pointer"
                title="Restablecer valores predeterminados"
              >
                <RefreshCw size={13} />
                <span>Restablecer</span>
              </button>
            </div>

            {/* Selector de Modalidad */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Modalidad de Vinculación
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setModalidad('externa')}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                    modalidad === 'externa'
                      ? 'bg-primary-container/20 border-primary-container text-white shadow-[0_0_15px_rgba(255,204,41,0.2)]'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                  }`}
                >
                  <div className="font-bold text-sm text-white flex items-center justify-between">
                    <span>Cátedra Externa</span>
                    {modalidad === 'externa' && <CheckCircle size={16} className="text-primary-container" />}
                  </div>
                  <p className="text-[11px] text-slate-300 mt-1">
                    Docente contratista temporal por período académico (semestre). Hasta 16 horas semanales.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setModalidad('interna');
                    if (horasSemanales > 4) setHorasSemanales(4);
                  }}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                    modalidad === 'interna'
                      ? 'bg-amber-500/20 border-amber-400 text-white shadow-[0_0_15px_rgba(251,191,36,0.2)]'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                  }`}
                >
                  <div className="font-bold text-sm text-white flex items-center justify-between">
                    <span>Cátedra Interna</span>
                    {modalidad === 'interna' && <CheckCircle size={16} className="text-amber-400" />}
                  </div>
                  <p className="text-[11px] text-slate-300 mt-1">
                    Docente de Planta u Ocasional en jornada adicional (Art. 2). Tope legal: máx. 4 horas/sem.
                  </p>
                </button>
              </div>
            </div>

            {/* Selector de Escalafón */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                <span>Categoría en el Escalafón Docente</span>
                <span className="text-primary-container font-mono">{categoriaSeleccionada.puntos.toFixed(2)} puntos/hora</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {ESCALA_PUNTOS.map((c, idx) => (
                  <button
                    key={c.categoria}
                    type="button"
                    onClick={() => setCategoriaIndex(idx)}
                    className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                      categoriaIndex === idx
                        ? 'bg-white/15 border-primary-container text-white font-bold'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                    }`}
                  >
                    <div className="text-xs">{c.categoria.replace('Profesor ', '')}</div>
                    <div className="text-sm font-mono text-primary-container mt-0.5">{c.puntos.toFixed(2)} pts</div>
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-400 italic">
                Equivalencia: {categoriaSeleccionada.equivalencia}
              </p>
            </div>

            {/* Slider de Intensidad Horaria Semanal */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300 uppercase tracking-wider">
                  Intensidad Horaria Semanal
                </span>
                <span className="font-mono text-base font-bold text-primary-container">
                  {horasSemanales} horas / semana
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={modalidad === 'interna' ? 6 : 16}
                value={horasSemanales}
                onChange={(e) => setHorasSemanales(Number(e.target.value))}
                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary-container"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>1 hora</span>
                {modalidad === 'interna' ? (
                  <span className="text-amber-400 font-bold">Tope legal Art. 2: 4 horas</span>
                ) : (
                  <span>8 horas</span>
                )}
                <span>{modalidad === 'interna' ? '6 horas (bloqueo)' : '16 horas'}</span>
              </div>

              {/* Alerta de Tope Legal para Cátedra Interna */}
              {esExcedidoTopeInterno && (
                <div className="p-3.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-400 mt-0.5" />
                  <div>
                    <span className="font-bold">Violación del Artículo 2 del Acuerdo 015 de 2009:</span>
                    <p className="mt-0.5 text-slate-300">
                      Los docentes de planta u ocasionales no pueden recibir asignación adicional superior a{' '}
                      <strong>cuatro (4) horas semanales</strong> de cátedra interna ni más de una (1) asignatura.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Duración del Semestre y Valor del Punto */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Semanas Lectivas del Semestre
                </label>
                <select
                  value={semanasSemestre}
                  onChange={(e) => setSemanasSemestre(Number(e.target.value))}
                  className="w-full bg-surface-container-high border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary-container"
                >
                  <option value={16}>16 Semanas (Semestre Estándar UPTC)</option>
                  <option value={18}>18 Semanas (Con Evaluaciones y Habilitaciones)</option>
                  <option value={8}>8 Semanas (Cursos Intensivos o Vacacionales)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Valor del Punto D1279 ($ COP)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={valorPuntoSim}
                    onChange={(e) => setValorPuntoSim(Number(e.target.value))}
                    className="w-full bg-surface-container-high border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-primary-container"
                  />
                  <span className="absolute right-3 top-2 text-[10px] text-slate-400 font-mono">Dcto 318/2026</span>
                </div>
              </div>
            </div>
          </div>

          {/* Panel de Resultados y Liquidación (5 Cols) */}
          <div className="lg:col-span-5 rounded-3xl bg-gradient-to-br from-surface-container via-surface-container-high to-black/90 border border-white/10 p-6 md:p-8 shadow-2xl backdrop-blur-xl flex flex-col justify-between space-y-6">
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="text-xs font-bold uppercase tracking-widest text-primary-container">
                  Liquidación Oficial Estimada
                </span>
                <span
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                    esExcedidoTopeInterno
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  }`}
                >
                  {esExcedidoTopeInterno ? 'No Viable Legalmente' : 'Normativamente Conforme'}
                </span>
              </div>

              {/* Valor por Hora */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <span className="text-xs text-slate-400">Valor por Hora Cátedra Liquidada:</span>
                <div className="text-2xl font-black text-white font-mono">{formatCOP(valorHora)} / hora</div>
                <div className="text-[11px] text-slate-400 font-mono">
                  = {categoriaSeleccionada.puntos.toFixed(2)} pts × {formatCOP(valorPuntoSim)}
                </div>
              </div>

              {/* Cifras Globales */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs py-2 border-b border-white/5">
                  <span className="text-slate-400">Horas Totales en el Período:</span>
                  <span className="font-mono font-bold text-white">{totalHorasSemestre} horas ({horasSemanales} h/sem × {semanasSemestre} sem)</span>
                </div>

                <div className="flex items-center justify-between text-xs py-2 border-b border-white/5">
                  <span className="text-slate-400">Valor Mensual Promedio (4 cuotas):</span>
                  <span className="font-mono font-bold text-emerald-400 text-sm">{formatCOP(valorMensualPromedio)} / mes</span>
                </div>

                <div className="pt-2">
                  <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                    Valor Total del Contrato Semestral:
                  </span>
                  <div className="text-3xl font-black text-primary-container font-mono mt-1">
                    {formatCOP(valorTotalContrato)}
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Sujeto a retenciones de ley y estampillas departamentales (Pro-UPTC, Bienestar del Anciano).
                  </span>
                </div>
              </div>

              {/* Checklist de Cumplimiento Legal */}
              <div className="rounded-2xl bg-black/40 border border-white/10 p-4 space-y-2 text-xs">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-primary-container" />
                  Control de Restricciones Acuerdo 015
                </span>
                <div className="space-y-1 text-slate-300">
                  <div className="flex items-center gap-2">
                    {esExcedidoTopeInterno ? (
                      <XCircle size={14} className="text-rose-400 flex-shrink-0" />
                    ) : (
                      <CheckCircle2 size={14} className="text-emerald-400 flex-shrink-0" />
                    )}
                    <span>Tope legal semanal {modalidad === 'interna' ? '(≤ 4 horas)' : '(≤ 16 horas)'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-400 flex-shrink-0" />
                    <span>Sin descarga académica vigente (Art. 3)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-400 flex-shrink-0" />
                    <span>Autorización y resolución rectoral requerida</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center pt-2">
              <p className="text-[11px] text-slate-400">
                Fórmula oficial: <span className="font-mono text-white">V = Puntos × ValorPunto × HorasSemanales × Semanas</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PESTAÑA 4: ANÁLISIS DE COSTOS Y EFICIENCIA */}
      {/* ========================================================================= */}
      {activeTab === 'eficiencia' && (
        <div className="space-y-6">
          {/* Comparativa Costo por Hora Efectiva Dictada */}
          <div className="rounded-3xl bg-surface-container/60 border border-white/10 p-6 md:p-8 shadow-xl backdrop-blur-md space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <TrendingUp className="text-primary-container" size={20} />
                Comparativa de Eficiencia: Costo por Hora Efectiva de Clase
              </h3>
              <p className="text-xs text-on-surface-variant">
                Comparación entre la remuneración de horas cátedra frente al costo real por hora de aula de docentes de
                tiempo completo (incluyendo prestaciones sociales, cesantías y primas).
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Docente Cátedra</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
                    Acuerdo 015
                  </span>
                </div>
                <div className="text-2xl font-black text-white font-mono">$ 68.000 COP</div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Promedio ponderado por hora de clase presencial. Se remunera estrictamente por semanas lectivas del
                  semestre académico (16 o 18 semanas).
                </p>
                <div className="text-[11px] text-emerald-400 font-semibold">
                  Mayor flexibilidad presupuestal para cobertura.
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Docente Ocasional (T.C.)</span>
                  <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold">
                    10 - 11 Meses
                  </span>
                </div>
                <div className="text-2xl font-black text-white font-mono">$ 125.000 COP</div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Costo estimado por hora efectiva de aula considerando carga de preparación, investigación, asesorías y
                  el paquete prestacional anual completo.
                </p>
                <div className="text-[11px] text-blue-300 font-semibold">
                  Estabilidad docente y acompañamiento institucional continuo.
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Docente de Planta</span>
                  <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold">
                    Permanente
                  </span>
                </div>
                <div className="text-2xl font-black text-white font-mono">$ 210.000 COP</div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Costo derivado de escalafón salarial, puntos salariales y de bonificación acumulados por producción
                  académica (Decreto 1279), además de cargas directivas e investigativas.
                </p>
                <div className="text-[11px] text-purple-300 font-semibold">
                  Pilar de acreditación institucional de alta calidad.
                </div>
              </div>
            </div>

            {/* Participación en el Presupuesto Total */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4 border-t border-white/10">
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Layers className="text-primary-container" size={16} />
                  Peso Relativo en la Nómina UPTC (2026)
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  El gasto total de horas cátedra en 2026 (<strong>$ 17.454,0 M</strong>) representa aproximadamente el{' '}
                  <strong className="text-primary-container">5.3%</strong> de la nómina global de personal de la UPTC (~$ 330.000 M),
                  mientras que atiende más del <strong>35%</strong> de los grupos de clase en programas de pregrado y posgrados.
                </p>
                <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Compromiso Pregrado Cátedra:</span>
                    <span className="font-mono text-white font-bold">{formatCurrency(8561501314)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Compromiso Posgrado Cátedra:</span>
                    <span className="font-mono text-white font-bold">{formatCurrency(8892494566)}</span>
                  </div>
                  <div className="flex justify-between border-t border-white/10 pt-2 font-bold text-primary-container">
                    <span>Total Anual Cátedra 2026:</span>
                    <span className="font-mono">{formatCurrency(totalCompromiso)}</span>
                  </div>
                </div>
              </div>

              {/* Proyección Indexada 2027 */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="text-primary-container" size={16} />
                  Proyección Presupuestal Indexada (2027)
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Considerando una variación del IPC proyectado del <strong>4.0%</strong> para el año 2027:
                </p>
                <div className="p-4 rounded-2xl bg-primary-container/10 border border-primary-container/20 space-y-3 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">Valor Estimado Punto D1279 (2027):</span>
                    <span className="font-mono font-bold text-primary-container text-base">
                      $ {Math.round(23924 * 1.04).toLocaleString('es-CO')} COP
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">Presupuesto Proyectado Cátedra 2027:</span>
                    <span className="font-mono font-bold text-white text-base">
                      {formatCurrency(totalCompromiso * 1.04)}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 border-t border-primary-container/20 pt-2">
                    Incremento requerido para sostener la misma asignación de horas lectivas: ~{formatCurrency(totalCompromiso * 0.04)}.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
