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
  BarChart3,
  Timer,
  CheckSquare,
  RotateCw,
  Building2,
  UserCheck,
  Coins,
  ShieldAlert
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
  Legend
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

// Tarjetas Didácticas (Flashcards) de Control Operativo
const FLASHCARDS = [
  {
    id: 1,
    titulo: 'Hora Cátedra vs. Hora Reloj',
    pregunta: '¿Cuál es la diferencia entre hora cátedra y hora reloj?',
    respuesta:
      'La hora reloj son 60 minutos reales continuos. La hora cátedra (o académica) es una unidad pedagógica que suele durar entre 45 y 50 minutos según el estatuto curricular de la institución. Para el pago debe parametrizarse con exactitud el factor de conversión para retribuir las horas lectivas efectivamente dictadas.',
    icono: Timer,
    categoria: 'Unidades de Tiempo'
  },
  {
    id: 2,
    titulo: 'Sentencia C-006-96 y Prestaciones',
    pregunta: '¿Por qué es ilegal pagar a un docente de cátedra por honorarios?',
    respuesta:
      'La Corte Constitucional (Sentencia C-006-96) declaró que la labor de los docentes de cátedra subordinados configura una auténtica relación laboral. Por ende, la universidad está legalmente obligada a pagar todas las prestaciones sociales (vacaciones, cesantías, intereses, prima de navidad y prima de servicios) de forma proporcional al tiempo laborado, so pena de demandas millonarias.',
    icono: ShieldAlert,
    categoria: 'Jurisprudencia'
  },
  {
    id: 3,
    titulo: 'Divisor 171.2 vs. 240 Horas',
    pregunta: '¿Por qué el divisor de 171.2 horas mitiga el riesgo de litigio?',
    respuesta:
      'El divisor de 171.2 horas surge de una jornada docente semanal de 40 horas (40 × 4.28 semanas/mes). Reconoce que el docente no puede laborar 240 horas mensuales de docencia directa. Al calcular la tarifa mínima legal con 171.2 ($81.820/h en 2026 con 8 SMMLV), se cumple la convención constitucional y se blindan judicialmente los contratos.',
    icono: Scale,
    categoria: 'Modelos Financieros'
  },
  {
    id: 4,
    titulo: 'Límites de Contratación Semanal',
    pregunta: '¿Cuáles son los topes de vinculación en cátedra interna y externa?',
    respuesta:
      'En Cátedra Interna (Acuerdo 015 de 2009 UPTC, Art. 2): Máximo 1 asignatura y hasta 4 horas semanales, fuera de jornada ordinaria y sin descarga académica. En Cátedra Externa: El estándar institucional limita a máximo 19 horas semanales para evitar que se desnaturalice el régimen de cátedra a tiempo completo.',
    icono: UserCheck,
    categoria: 'Límites Operativos'
  }
];

// Preguntas del Cuestionario de Evaluación
const QUIZ_QUESTIONS = [
  {
    id: 1,
    pregunta: '¿Cuál fue el pronunciamiento hito de la Sentencia C-006-96 sobre los docentes de hora cátedra?',
    opciones: [
      { texto: 'Permitió contratarlos legalmente mediante orden de prestación de servicios sin prestaciones.', correcta: false },
      { texto: 'Estableció que son servidores o trabajadores con derecho al pago proporcional de todas sus prestaciones sociales.', correcta: true },
      { texto: 'Eliminó el escalafón docente y fijó un salario único para toda Colombia.', correcta: false },
      { texto: 'Fijó que solo tienen derecho a honorarios integrales sin seguridad social.', correcta: false }
    ],
    explicacion:
      'La Corte Constitucional en la Sentencia C-006-96 ratificó que la subordinación académica configura una relación laboral y ordenó el reconocimiento de vacaciones, cesantías, prima de servicios y prima de navidad proporcionales.'
  },
  {
    id: 2,
    pregunta: 'Bajo la Ley 30 de 1992, ¿cuál es el divisor mensual más seguro jurídicamente para liquidar la tarifa mínima de 8 SMMLV?',
    opciones: [
      { texto: 'Divisor estándar de 240 horas (30 días por 8 horas diarias).', correcta: false },
      { texto: 'Divisor docente de 171.2 horas (basado en jornada semanal máxima de 40 horas).', correcta: true },
      { texto: 'Divisor de 300 horas al mes.', correcta: false },
      { texto: 'Divisor de 120 horas lectivas.', correcta: false }
    ],
    explicacion:
      'El divisor de 171.2 horas (40 h/sem × 4.28) refleja la jornada docente real de tiempo completo, arrojando una tarifa que respeta los mínimos constitucionales ($81.820 en 2026) y elimina el riesgo de demandas por nivelación.'
  },
  {
    id: 3,
    pregunta: 'Según el Artículo 2 del Acuerdo 015 de 2009 de la UPTC, ¿cuál es el límite estricto para Cátedra Interna?',
    opciones: [
      { texto: 'Hasta 8 horas semanales en dos facultades.', correcta: false },
      { texto: 'Máximo una (1) asignatura de menor intensidad y tope legal de hasta cuatro (4) horas semanales.', correcta: true },
      { texto: 'Sin límite siempre que el docente tenga descarga académica de investigación.', correcta: false },
      { texto: 'Hasta 12 horas en sábados y domingos.', correcta: false }
    ],
    explicacion:
      'El Artículo 2 limita taxativamente a docentes de planta u ocasionales a máximo una sola asignatura y no más de cuatro (4) horas semanales, requiriendo autorización rectoral.'
  },
  {
    id: 4,
    pregunta: '¿Qué condición del Artículo 3 del Acuerdo 015 prohíbe taxativamente la asignación de horas cátedra?',
    opciones: [
      { texto: 'Haber obtenido título de doctorado en el exterior.', correcta: false },
      { texto: 'Gozar de descarga académica o realizar la labor dentro de la jornada ordinaria de trabajo.', correcta: true },
      { texto: 'Pertenecer al Banco de Información de Elegibles.', correcta: false },
      { texto: 'Tener más de 5 años de antigüedad en la universidad.', correcta: false }
    ],
    explicacion:
      'El Artículo 3 prohíbe asignar cátedra interna dentro de la jornada ordinaria (art. 128 C.P. doble asignación del tesoro) o a docentes que gocen de descarga por investigación, extensión o administración.'
  }
];

export function HorasCatedraScreen({ onNavigate }: { onNavigate: (s: string) => void }) {
  const [activeTab, setActiveTab] = useState<'ejecucion' | 'normativa' | 'simulador' | 'control' | 'informe'>('ejecucion');

  // Filtros Tablero
  const [filtroNivel, setFiltroNivel] = useState<'todos' | 'pregrado' | 'posgrado'>('todos');

  // Estados del Simulador Oficial
  const [modalidad, setModalidad] = useState<'externa' | 'interna'>('externa');
  const [categoriaIndex, setCategoriaIndex] = useState<number>(1); // Asistente (2.75) por defecto
  const [horasSemanales, setHorasSemanales] = useState<number>(4);
  const [semanasSemestre, setSemanasSemestre] = useState<number>(16);
  const [valorPuntoSim, setValorPuntoSim] = useState<number>(23924);
  const [mesesPago, setMesesPago] = useState<number>(4);
  const [smmlv2026, setSmmlv2026] = useState<number>(1750905);
  const [incluirPrestaciones, setIncluirPrestaciones] = useState<boolean>(true);
  const [modeloComparativo, setModeloComparativo] = useState<'puntos' | 'divisor171' | 'divisor240'>('puntos');

  // Estados del Glosario de Flashcards
  const [flippedCardId, setFlippedCardId] = useState<number | null>(null);

  // Estados de Control Operativo
  const [duracionHoraAcademicaMin, setDuracionHoraAcademicaMin] = useState<number>(50); // 50 minutos
  const [toleranciaMin, setToleranciaMin] = useState<number>(10); // 10 minutos
  const [horasProgramadasSemana, setHorasProgramadasSemana] = useState<number>(4);
  const [minutosRetardo, setMinutosRetardo] = useState<number>(5);

  // Estados del Quiz
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [showQuizResults, setShowQuizResults] = useState<boolean>(false);

  // Cálculos del simulador por Puntos UPTC
  const categoriaSeleccionada = ESCALA_PUNTOS[categoriaIndex];
  const valorHoraPuntos = useMemo(() => {
    return Math.round(categoriaSeleccionada.puntos * valorPuntoSim);
  }, [categoriaSeleccionada, valorPuntoSim]);

  // Tarifas de los modelos alternativos (Ley 30 de 1992 - 8 SMMLV)
  const base8SMMLV = useMemo(() => smmlv2026 * 8, [smmlv2026]);
  const valorHoraDivisor171 = useMemo(() => Math.round(base8SMMLV / 171.2), [base8SMMLV]);
  const valorHoraDivisor240 = useMemo(() => Math.round(base8SMMLV / 240), [base8SMMLV]);

  // Selección de la tarifa activa
  const valorHoraActiva = useMemo(() => {
    if (modeloComparativo === 'divisor171') return valorHoraDivisor171;
    if (modeloComparativo === 'divisor240') return valorHoraDivisor240;
    return valorHoraPuntos;
  }, [modeloComparativo, valorHoraDivisor171, valorHoraDivisor240, valorHoraPuntos]);

  const totalHorasSemestre = useMemo(() => {
    return horasSemanales * semanasSemestre;
  }, [horasSemanales, semanasSemestre]);

  const valorTotalBaseContrato = useMemo(() => {
    return valorHoraActiva * totalHorasSemestre;
  }, [valorHoraActiva, totalHorasSemestre]);

  // Cálculo proporcional de prestaciones sociales (Sentencia C-006-96)
  // Factores estándar: Cesantías (8.33%), Int. Cesantías (1.00%), Prima de Servicios (8.33%), Vacaciones proporcionales (4.17%) = ~21.83%
  const factorPrestacional = 0.2183;
  const valorPrestacionesProporcionales = useMemo(() => {
    return incluirPrestaciones ? Math.round(valorTotalBaseContrato * factorPrestacional) : 0;
  }, [incluirPrestaciones, valorTotalBaseContrato]);

  const valorGranTotalContrato = useMemo(() => {
    return valorTotalBaseContrato + valorPrestacionesProporcionales;
  }, [valorTotalBaseContrato, valorPrestacionesProporcionales]);

  const valorMensualPromedio = useMemo(() => {
    return mesesPago > 0 ? Math.round(valorGranTotalContrato / mesesPago) : 0;
  }, [valorGranTotalContrato, mesesPago]);

  // Validaciones Legales
  const esExcedidoTopeInterno = modalidad === 'interna' && horasSemanales > 4;
  const esExcedidoTopeExterno = modalidad === 'externa' && horasSemanales > 19;

  // Totales de Ejecución
  const totalCompromiso = 17453995880;
  const totalPagado = 11757022320;
  const saldoPorEjecutar = totalCompromiso - totalPagado;
  const porcentajeEjecutadoGlobal = (totalPagado / totalCompromiso) * 100;

  const recursosFiltrados = useMemo(() => {
    if (filtroNivel === 'pregrado') {
      return RECURSOS_DATA.filter((r) => r.nivel.includes('Pregrado'));
    }
    if (filtroNivel === 'posgrado') {
      return RECURSOS_DATA.filter((r) => r.nivel.includes('Posgrado'));
    }
    return RECURSOS_DATA;
  }, [filtroNivel]);

  // Puntaje del Quiz
  const quizScore = useMemo(() => {
    let score = 0;
    QUIZ_QUESTIONS.forEach((q) => {
      const selectedIndex = userAnswers[q.id];
      if (selectedIndex !== undefined && q.opciones[selectedIndex].correcta) {
        score++;
      }
    });
    return score;
  }, [userAnswers]);

  // Exportar datos a CSV
  const handleExportCSV = () => {
    const headers = ['Recurso', 'Nivel', 'Clasificacion', 'Compromiso ($ M)', 'Pagado ($ M)', '% Ejecucion'];
    const rows = RECURSOS_DATA.map((r) => [
      `"${r.nombre}"`,
      `"${r.nivel}"`,
      `"${r.tipoBase}"`,
      (r.compromiso / 1e6).toFixed(2),
      (r.pagado / 1e6).toFixed(2),
      r.porcentaje.toFixed(1)
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
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
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                <ShieldAlert size={13} />
                Sentencia C-006-96 (Prestaciones)
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
              Módulo de Horas Cátedra & Informe Técnico
            </h1>

            <p className="text-sm md:text-base text-on-surface-variant max-w-3xl leading-relaxed">
              Sistema integral de administración de horas cátedra: sustento jurisprudencial (Sentencia C-006-96),
              análisis comparativo de fórmulas (171.2 vs. 240 horas vs. Puntos UPTC), control operativo de asistencia y
              ejecución presupuestal 2026.
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
            className={`flex items-center gap-2 px-4 py-3 rounded-t-xl text-xs md:text-sm font-bold transition-all cursor-pointer ${
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
            className={`flex items-center gap-2 px-4 py-3 rounded-t-xl text-xs md:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'normativa'
                ? 'bg-white/10 text-primary-container border-b-2 border-primary-container'
                : 'text-on-surface-variant hover:text-white hover:bg-white/5'
            }`}
          >
            <Scale size={16} />
            <span>Marco Legal & C-006-96</span>
          </button>

          <button
            onClick={() => setActiveTab('simulador')}
            className={`flex items-center gap-2 px-4 py-3 rounded-t-xl text-xs md:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'simulador'
                ? 'bg-white/10 text-primary-container border-b-2 border-primary-container'
                : 'text-on-surface-variant hover:text-white hover:bg-white/5'
            }`}
          >
            <Sliders size={16} />
            <span>Simulador & Fórmulas</span>
          </button>

          <button
            onClick={() => setActiveTab('control')}
            className={`flex items-center gap-2 px-4 py-3 rounded-t-xl text-xs md:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'control'
                ? 'bg-white/10 text-primary-container border-b-2 border-primary-container'
                : 'text-on-surface-variant hover:text-white hover:bg-white/5'
            }`}
          >
            <Timer size={16} />
            <span>Control Operativo & Asistencia</span>
          </button>

          <button
            onClick={() => setActiveTab('informe')}
            className={`flex items-center gap-2 px-4 py-3 rounded-t-xl text-xs md:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'informe'
                ? 'bg-white/10 text-primary-container border-b-2 border-primary-container'
                : 'text-on-surface-variant hover:text-white hover:bg-white/5'
            }`}
          >
            <FileText size={16} />
            <span>Informe Técnico & Quiz</span>
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
      {/* PESTAÑA 2: MARCO LEGAL, JURISPRUDENCIA (C-006-96) & ACUERDO 015 */}
      {/* ========================================================================= */}
      {activeTab === 'normativa' && (
        <div className="space-y-6">
          {/* Alerta Constitucional: Sentencia C-006-96 */}
          <div className="rounded-3xl bg-gradient-to-r from-rose-950/70 via-surface-container to-surface-container-high border border-rose-500/40 p-6 md:p-8 shadow-xl backdrop-blur-md space-y-4">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-2xl bg-rose-500/20 text-rose-300 border border-rose-500/30 flex-shrink-0">
                <ShieldAlert size={28} />
              </div>
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-rose-500/30 text-rose-200 border border-rose-500/40">
                    Jurisprudencia Constitucional Vinculante
                  </span>
                  <span className="text-xs text-slate-400 font-mono">Corte Constitucional de Colombia</span>
                </div>
                <h3 className="text-xl md:text-2xl font-black text-white">
                  Sentencia C-006-96: Prohibición de Pago por Honorarios & Obligación Prestacional
                </h3>
                <p className="text-xs md:text-sm text-slate-200 leading-relaxed">
                  ¿Sabías que liquidar de forma incorrecta la hora cátedra de un docente o intentar pagarle mediante
                  <strong> contratos de prestación de servicios (honorarios)</strong> expone a la universidad a
                  <strong> millonarias demandas laborales</strong>?
                </p>
                <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
                  A partir de la <strong>Sentencia C-006 de 1996</strong>, la ley colombiana exige que los docentes de
                  hora cátedra, al ejercer su función bajo continua subordinación (cumplimiento de horarios, directrices
                  académicas y evaluaciones), sean reconocidos como <strong>servidores públicos o trabajadores subordinados</strong> con derecho al
                  <strong> pago proporcional de todas sus prestaciones sociales</strong>: vacaciones, prima de vacaciones,
                  cesantías, intereses a las cesantías y prima de Navidad.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs">
              <div className="p-3.5 rounded-xl bg-black/40 border border-rose-500/20">
                <span className="text-rose-400 font-bold block mb-1">Riesgo de Demanda Laboral:</span>
                <p className="text-slate-300 text-[11px]">
                  El principio de "primacía de la realidad sobre las formas" (Art. 53 C.P.) anula cualquier contrato de
                  prestación de servicios, obligando al pago retroactivo de cesantías y sanciones moratorias.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-black/40 border border-emerald-500/20">
                <span className="text-emerald-400 font-bold block mb-1">Obligación Prestacional Proporcional:</span>
                <p className="text-slate-300 text-[11px]">
                  Toda liquidación semestral debe liquidar expresamente las alícuotas proporcionales por cada hora
                  efectivamente dictada durante el período académico.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-black/40 border border-blue-500/20">
                <span className="text-blue-400 font-bold block mb-1">Autonomía y Decreto 1279:</span>
                <p className="text-slate-300 text-[11px]">
                  El Decreto 1279 de 2002 otorga autonomía a las universidades públicas para fijar su régimen interno
                  (como el Acuerdo 015 de la UPTC), siempre que respete los mínimos constitucionales.
                </p>
              </div>
            </div>
          </div>

          {/* Tarjeta de Resumen Normativo Acuerdo 015 */}
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
                  Descargar Acuerdo PDF
                </a>
              </div>
            </div>

            {/* Tabla de Puntos por Escalafón Oficial */}
            <div className="space-y-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Award className="text-primary-container" size={18} />
                Artículo 1: Asignación de Puntos por Hora de Clase en Pregrado
              </h3>
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

            {/* Artículos 2 y 3 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/10">
              <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-5 space-y-3">
                <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                  <AlertTriangle size={18} />
                  Artículo 2: Cátedra Interna (Docentes de Planta y Ocasionales)
                </div>
                <p className="text-xs text-slate-200 leading-relaxed">
                  Los docentes de tiempo completo y medio tiempo de planta u ocasionales podrán dictar horas de cátedra
                  adicionales, sujeto a condiciones estrictas:
                </p>
                <ul className="text-xs text-slate-300 space-y-2 list-disc pl-4">
                  <li>
                    <strong>Máximo una (1) asignatura:</strong> Por necesidad imperiosa del servicio y de menor intensidad horaria.
                  </li>
                  <li className="text-amber-200 font-bold">
                    Tope legal no superior a cuatro (4) horas semanales de clase.
                  </li>
                  <li>
                    <strong>Flujo en cascada:</strong> Justificación de Dirección de Escuela → Aval Comité de Currículo →
                    Aprobación Consejo de Facultad → Visto bueno Vicerrectoría Académica → Acto administrativo de Rectoría.
                  </li>
                </ul>
              </div>

              <div className="rounded-2xl bg-rose-500/10 border border-rose-500/30 p-5 space-y-3">
                <div className="flex items-center gap-2 text-rose-300 font-bold text-sm">
                  <XCircle size={18} />
                  Artículo 3: Incompatibilidades y Prohibiciones
                </div>
                <p className="text-xs text-slate-200 leading-relaxed">
                  Garantía del <strong>Artículo 128 de la Constitución Política</strong> (prohibición de doble asignación del tesoro público):
                </p>
                <ul className="text-xs text-slate-300 space-y-2 list-disc pl-4">
                  <li>
                    <strong>Fuera de jornada laboral:</strong> Obligatoriamente fuera del horario ordinario asignado.
                  </li>
                  <li>
                    <strong>Incompatibilidad con descarga:</strong> Prohibido para docentes con descarga por investigación, extensión o administración.
                  </li>
                  <li>
                    <strong>Principio de subsidiariedad:</strong> Solo procede si no puede ser cubierta por el Banco de Información de Elegibles (B.I.E.).
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Tarjetas Didácticas (Flashcards) de Términos Operativos */}
          <div className="rounded-3xl bg-surface-container/60 border border-white/10 p-6 md:p-8 shadow-xl backdrop-blur-md space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <BookOpen className="text-primary-container" size={20} />
                  Glosario de Términos Operativos & Flashcards de Estudio
                </h3>
                <p className="text-xs text-on-surface-variant">
                  Haz clic en cualquier tarjeta didáctica para voltearla y estudiar los conceptos operativos clave.
                </p>
              </div>
              <span className="text-xs text-slate-400">4 Conceptos Clave</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              {FLASHCARDS.map((card) => {
                const IconComponent = card.icono;
                const isFlipped = flippedCardId === card.id;
                return (
                  <div
                    key={card.id}
                    onClick={() => setFlippedCardId(isFlipped ? null : card.id)}
                    className={`rounded-2xl border p-5 cursor-pointer transition-all duration-300 flex flex-col justify-between min-h-[220px] ${
                      isFlipped
                        ? 'bg-gradient-to-br from-primary-container/20 to-surface-container-high border-primary-container/50 shadow-[0_0_20px_rgba(255,204,41,0.2)]'
                        : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs mb-3">
                        <span className="px-2 py-0.5 rounded-full bg-white/10 text-primary-container text-[10px] font-bold">
                          {card.categoria}
                        </span>
                        <RotateCw size={13} className="text-slate-400" />
                      </div>
                      <h4 className="font-bold text-sm text-white mb-2 flex items-center gap-2">
                        <IconComponent size={16} className="text-primary-container flex-shrink-0" />
                        {card.titulo}
                      </h4>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {isFlipped ? card.respuesta : card.pregunta}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-white/5 text-[10px] text-slate-400 italic">
                      {isFlipped ? 'Clic para ver pregunta' : 'Clic para revelar concepto'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PESTAÑA 3: SIMULADOR & COMPARADOR DE MODELOS FINANCIEROS */}
      {/* ========================================================================= */}
      {activeTab === 'simulador' && (
        <div className="space-y-6">
          {/* Selector de Modelos de Cálculo (Diapositivas / Comparador Secuencial) */}
          <div className="rounded-3xl bg-surface-container/60 border border-white/10 p-6 md:p-8 shadow-xl backdrop-blur-md space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Sliders className="text-primary-container" size={20} />
                Modelos de Cálculo para Hora Cátedra en Instituciones de Educación Superior
              </h3>
              <p className="text-xs text-on-surface-variant">
                Contraste técnico entre los modelos del sector privado (Divisores 171.2 vs 240 horas bajo Ley 30 de 1992) y
                el sistema de puntos del sector público (Acuerdo 015 UPTC y Decreto 1279).
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Modelo A: Divisor 171.2 Horas */}
              <button
                type="button"
                onClick={() => setModeloComparativo('divisor171')}
                className={`p-5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  modeloComparativo === 'divisor171'
                    ? 'bg-emerald-500/15 border-emerald-400 text-white shadow-[0_0_20px_rgba(52,211,153,0.2)]'
                    : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">
                      Jornada Docente 40h/sem
                    </span>
                    <span className="text-[10px] text-emerald-400 font-bold">Bajo Riesgo Litigio</span>
                  </div>
                  <h4 className="font-bold text-sm text-white">Divisor 171.2 Horas</h4>
                  <div className="text-2xl font-black text-emerald-400 font-mono my-2">
                    {formatCOP(valorHoraDivisor171)} / h
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Fórmula Ley 30: <strong>(8 SMMLV ÷ 171.2 h)</strong>. Reconoce que un profesor de tiempo completo
                    labora 40h semanales (40 × 4.28 = 171.2h).
                  </p>
                </div>
                <div className="mt-4 pt-2 border-t border-white/10 text-[11px] text-emerald-300">
                  ✓ Recomendado para blindaje laboral definitivo.
                </div>
              </button>

              {/* Modelo B: Divisor Estándar 240 Horas */}
              <button
                type="button"
                onClick={() => setModeloComparativo('divisor240')}
                className={`p-5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  modeloComparativo === 'divisor240'
                    ? 'bg-rose-500/15 border-rose-400 text-white shadow-[0_0_20px_rgba(244,63,94,0.2)]'
                    : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold text-[10px]">
                      Estándar MinTrabajo
                    </span>
                    <span className="text-[10px] text-rose-400 font-bold">Alto Riesgo Litigio</span>
                  </div>
                  <h4 className="font-bold text-sm text-white">Divisor 240 Horas</h4>
                  <div className="text-2xl font-black text-rose-400 font-mono my-2">
                    {formatCOP(valorHoraDivisor240)} / h
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Fórmula: <strong>(8 SMMLV ÷ 240 h)</strong> (30 días × 8h). Sugerida por Mineducación para abaratar el
                    costo unitario, pero vulnerable a demandas de nivelación.
                  </p>
                </div>
                <div className="mt-4 pt-2 border-t border-white/10 text-[11px] text-rose-300">
                  ⚠️ Menor costo unitario inicial, alta contingencia legal.
                </div>
              </button>

              {/* Modelo C: Puntos UPTC (Acuerdo 015) */}
              <button
                type="button"
                onClick={() => setModeloComparativo('puntos')}
                className={`p-5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  modeloComparativo === 'puntos'
                    ? 'bg-primary-container/20 border-primary-container text-white shadow-[0_0_20px_rgba(255,204,41,0.2)]'
                    : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="px-2 py-0.5 rounded-full bg-primary-container/20 text-primary-container font-bold text-[10px]">
                      Sector Público UPTC
                    </span>
                    <span className="text-[10px] text-primary-container font-bold">Estatuto Oficial</span>
                  </div>
                  <h4 className="font-bold text-sm text-white">Sistema de Puntos UPTC</h4>
                  <div className="text-2xl font-black text-primary-container font-mono my-2">
                    {formatCOP(valorHoraPuntos)} / h
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Fórmula Acuerdo 015: <strong>(Puntos Escalafón × Valor Punto D1279)</strong>. Desde 2.50 pts ($59.810)
                    hasta 3.50 pts ($83.734) según escalafón docente.
                  </p>
                </div>
                <div className="mt-4 pt-2 border-t border-white/10 text-[11px] text-primary-container">
                  ⭐ Modelo vigente en la Universidad.
                </div>
              </button>
            </div>
          </div>

          {/* Panel Interactivo de Liquidación */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Parámetros (7 Cols) */}
            <div className="lg:col-span-7 rounded-3xl bg-surface-container/60 border border-white/10 p-6 md:p-8 shadow-xl backdrop-blur-md space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <h4 className="font-bold text-white text-base flex items-center gap-2">
                  <Sliders className="text-primary-container" size={18} />
                  Parámetros de Contratación
                </h4>
                <button
                  onClick={() => {
                    setModalidad('externa');
                    setCategoriaIndex(1);
                    setHorasSemanales(4);
                    setSemanasSemestre(16);
                    setValorPuntoSim(23924);
                    setSmmlv2026(1750905);
                    setIncluirPrestaciones(true);
                    setModeloComparativo('puntos');
                  }}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 p-2 rounded-lg bg-white/5 cursor-pointer"
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
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      modalidad === 'externa'
                        ? 'bg-primary-container/20 border-primary-container text-white'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                    }`}
                  >
                    <div className="font-bold text-xs text-white">Cátedra Externa</div>
                    <p className="text-[11px] text-slate-400 mt-0.5">Tope estándar: hasta 19 horas/semana.</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setModalidad('interna');
                      if (horasSemanales > 4) setHorasSemanales(4);
                    }}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      modalidad === 'interna'
                        ? 'bg-amber-500/20 border-amber-400 text-white'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                    }`}
                  >
                    <div className="font-bold text-xs text-white">Cátedra Interna (Art. 2)</div>
                    <p className="text-[11px] text-slate-400 mt-0.5">Docente UPTC. Tope legal: máx. 4 h/sem.</p>
                  </button>
                </div>
              </div>

              {/* Selector de Escalafón (si aplica Puntos) */}
              {modeloComparativo === 'puntos' && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                    <span>Categoría en el Escalafón</span>
                    <span className="text-primary-container font-mono">{categoriaSeleccionada.puntos.toFixed(2)} pts</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {ESCALA_PUNTOS.map((c, idx) => (
                      <button
                        key={c.categoria}
                        type="button"
                        onClick={() => setCategoriaIndex(idx)}
                        className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                          categoriaIndex === idx
                            ? 'bg-white/15 border-primary-container text-white font-bold'
                            : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                        }`}
                      >
                        <div className="text-[11px]">{c.categoria.replace('Profesor ', '')}</div>
                        <div className="text-xs font-mono text-primary-container font-bold">{c.puntos.toFixed(2)} pts</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

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
                  max={modalidad === 'interna' ? 6 : 22}
                  value={horasSemanales}
                  onChange={(e) => setHorasSemanales(Number(e.target.value))}
                  className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary-container"
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>1 hora</span>
                  {modalidad === 'interna' ? (
                    <span className="text-amber-400 font-bold">Tope Art. 2: 4 horas</span>
                  ) : (
                    <span className="text-emerald-400 font-bold">Tope sugerido: 19 horas</span>
                  )}
                  <span>{modalidad === 'interna' ? '6 horas (bloqueo)' : '22 horas'}</span>
                </div>

                {esExcedidoTopeInterno && (
                  <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                    <AlertTriangle size={16} className="text-rose-400 flex-shrink-0" />
                    <span>Infracción Art. 2 Acuerdo 015/2009: No puede superar 4 horas semanales de cátedra interna.</span>
                  </div>
                )}

                {esExcedidoTopeExterno && (
                  <div className="p-3 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs flex items-center gap-2">
                    <AlertTriangle size={16} className="text-amber-400 flex-shrink-0" />
                    <span>Alerta de Sobrecontratación: Superar 19 horas semanales puede desnaturalizar el contrato de cátedra.</span>
                  </div>
                )}
              </div>

              {/* Semanas del Semestre & Switch de Prestaciones C-006-96 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Semanas Lectivas
                  </label>
                  <select
                    value={semanasSemestre}
                    onChange={(e) => setSemanasSemestre(Number(e.target.value))}
                    className="w-full bg-surface-container-high border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary-container"
                  >
                    <option value={16}>16 Semanas (Semestre Estándar UPTC)</option>
                    <option value={18}>18 Semanas (Con Evaluaciones y Habilitaciones)</option>
                    <option value={8}>8 Semanas (Cursos Vacacionales)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Prestaciones Proporcionales (C-006-96)
                  </label>
                  <button
                    type="button"
                    onClick={() => setIncluirPrestaciones(!incluirPrestaciones)}
                    className={`w-full py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                      incluirPrestaciones
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                        : 'bg-white/5 border-white/10 text-slate-400'
                    }`}
                  >
                    <span>{incluirPrestaciones ? 'Incluir (+21.83%)' : 'Solo Salario Base'}</span>
                    <CheckSquare size={16} className={incluirPrestaciones ? 'text-emerald-400' : 'text-slate-500'} />
                  </button>
                </div>
              </div>
            </div>

            {/* Resultados y Liquidación (5 Cols) */}
            <div className="lg:col-span-5 rounded-3xl bg-gradient-to-br from-surface-container via-surface-container-high to-black/90 border border-white/10 p-6 md:p-8 shadow-2xl backdrop-blur-xl flex flex-col justify-between space-y-6">
              <div className="space-y-5">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <span className="text-xs font-bold uppercase tracking-widest text-primary-container">
                    Liquidación Integral Estimada
                  </span>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                      esExcedidoTopeInterno
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    }`}
                  >
                    {esExcedidoTopeInterno ? 'No Viable Legalmente' : 'Conforme a Normas'}
                  </span>
                </div>

                {/* Tarifa por Hora */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                  <span className="text-xs text-slate-400">Tarifa por Hora Liquidada:</span>
                  <div className="text-2xl font-black text-white font-mono">{formatCOP(valorHoraActiva)} / h</div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    Modelo:{' '}
                    {modeloComparativo === 'divisor171'
                      ? 'Divisor 171.2 h (Ley 30)'
                      : modeloComparativo === 'divisor240'
                      ? 'Divisor 240 h (MinTrabajo)'
                      : `Acuerdo 015 (${categoriaSeleccionada.puntos.toFixed(2)} pts)`}
                  </div>
                </div>

                {/* Desglose Económico */}
                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between py-1.5 border-b border-white/5">
                    <span className="text-slate-400">Horas Totales del Semestre:</span>
                    <span className="font-mono font-bold text-white">{totalHorasSemestre} h</span>
                  </div>

                  <div className="flex items-center justify-between py-1.5 border-b border-white/5">
                    <span className="text-slate-400">Salario Base Semestral:</span>
                    <span className="font-mono font-bold text-white">{formatCOP(valorTotalBaseContrato)}</span>
                  </div>

                  {incluirPrestaciones && (
                    <div className="flex items-center justify-between py-1.5 border-b border-white/5 text-emerald-300">
                      <span>Prestaciones C-006-96 (Alícuota 21.83%):</span>
                      <span className="font-mono font-bold">+{formatCOP(valorPrestacionesProporcionales)}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between py-1.5 border-b border-white/5">
                    <span className="text-slate-400">Promedio Mensual (4 pagos):</span>
                    <span className="font-mono font-bold text-emerald-400">{formatCOP(valorMensualPromedio)} / mes</span>
                  </div>

                  <div className="pt-2">
                    <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                      Costo Total del Contrato Semestral:
                    </span>
                    <div className="text-3xl font-black text-primary-container font-mono mt-1">
                      {formatCOP(valorGranTotalContrato)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 bg-black/40 p-3 rounded-xl border border-white/5">
                💡 Incluye provisión de cesantías, prima de navidad y vacaciones proporcionales conforme a la
                Sentencia C-006-96.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PESTAÑA 4: CONTROL OPERATIVO & ASISTENCIA */}
      {/* ========================================================================= */}
      {activeTab === 'control' && (
        <div className="space-y-6">
          <div className="rounded-3xl bg-surface-container/60 border border-white/10 p-6 md:p-8 shadow-xl backdrop-blur-md space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Timer className="text-primary-container" size={20} />
                Control Operativo de Asistencia: Hora Reloj vs. Hora Cátedra
              </h3>
              <p className="text-xs text-on-surface-variant">
                Reglas institucionales de medición de tiempo real, periodos de gracia (tolerancia) y validación de horas
                efectivas dictadas antes de autorizar la liquidación de nómina.
              </p>
            </div>

            {/* Calculadora Operativa de Asistencia y Tolerancia */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-4">
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  <Sliders size={16} className="text-primary-container" />
                  Parametrización de la Sesión de Clase
                </h4>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-300 font-medium">
                    Duración de la Hora Cátedra Académica:
                  </label>
                  <select
                    value={duracionHoraAcademicaMin}
                    onChange={(e) => setDuracionHoraAcademicaMin(Number(e.target.value))}
                    className="w-full bg-surface-container-high border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value={45}>45 Minutos (Bloque estándar con receso)</option>
                    <option value={50}>50 Minutos (Estatuto Académico UPTC)</option>
                    <option value={60}>60 Minutos (Hora Reloj Continua)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-300 font-medium">
                    Margen de Tolerancia de Llegada (Minutos de Gracia):
                  </label>
                  <input
                    type="number"
                    value={toleranciaMin}
                    onChange={(e) => setToleranciaMin(Number(e.target.value))}
                    className="w-full bg-surface-container-high border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                  <p className="text-[10px] text-slate-400">
                    Estándar: 10 minutos de gracia antes de aplicar descuento automático de la sesión.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-300 font-medium">
                    Minutos de Retardo Registrados en la Sesión:
                  </label>
                  <input
                    type="number"
                    value={minutosRetardo}
                    onChange={(e) => setMinutosRetardo(Number(e.target.value))}
                    className="w-full bg-surface-container-high border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
              </div>

              {/* Dictamen del Sistema de Asistencia */}
              <div className="p-6 rounded-2xl bg-black/40 border border-white/10 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                      Dictamen del Sistema
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                        minutosRetardo <= toleranciaMin
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      }`}
                    >
                      {minutosRetardo <= toleranciaMin ? 'Dentro de Tolerancia (Válido)' : 'Excede Tolerancia (Descuento)'}
                    </span>
                  </div>

                  <div className="text-2xl font-black text-white font-mono">
                    {minutosRetardo <= toleranciaMin
                      ? `${duracionHoraAcademicaMin} min certificados`
                      : `${Math.max(0, duracionHoraAcademicaMin - minutosRetardo)} min efectivos`}
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {minutosRetardo <= toleranciaMin
                      ? `El docente llegó con ${minutosRetardo} minutos de retraso, cubierto por el margen de tolerancia institucional (${toleranciaMin} min). Se liquida el 100% de la hora cátedra programada.`
                      : `El retraso de ${minutosRetardo} minutos supera el límite de gracia (${toleranciaMin} min). El sistema de control biométrico descuenta el tiempo proporcional y alerta a la Dirección de Escuela.`}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-[11px] text-slate-400 space-y-1">
                  <span className="font-semibold text-white">Procedimiento de Aprobación Semanal:</span>
                  <p>
                    1. Marcación biométrica / firma digital → 2. Revisión de tutorías → 3. Expedición de Concepto
                    Favorable de la Dirección de Escuela → 4. Giro de nómina.
                  </p>
                </div>
              </div>
            </div>

            {/* Protocolo de Control de Horas Efectivas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-white/10 text-xs">
              <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-1.5">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <CheckCircle size={14} className="text-emerald-400" />
                  Horas Efectivas
                </span>
                <p className="text-slate-300 text-[11px]">
                  Pagar únicamente por el tiempo real dictado y las tutorías validadas en el sistema académico institucional.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-1.5">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <CheckCircle size={14} className="text-primary-container" />
                  Tolerancia Reglamentada
                </span>
                <p className="text-slate-300 text-[11px]">
                  Periodo de gracia de hasta 10 minutos antes de proceder a la penalización o descuento del tiempo de clase.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-1.5">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <CheckCircle size={14} className="text-blue-400" />
                  Concepto Favorable
                </span>
                <p className="text-slate-300 text-[11px]">
                  El Director de Escuela expide semanalmente el concepto favorable indispensable para el desembolso financiero.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PESTAÑA 5: INFORME TÉCNICO, PLAN DE CAJA & QUIZ INTERACTIVO */}
      {/* ========================================================================= */}
      {activeTab === 'informe' && (
        <div className="space-y-6">
          {/* Estructura Formal del Informe Técnico */}
          <div className="rounded-3xl bg-surface-container/60 border border-white/10 p-6 md:p-8 shadow-xl backdrop-blur-md space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FileText className="text-primary-container" size={20} />
                Estructura Definitiva del Informe Técnico Institucional
              </h3>
              <p className="text-xs text-on-surface-variant">
                Componentes obligatorios para la sustentación y aprobación ante el Consejo Superior Universitario y la
                Vicerrectoría Administrativa y Financiera.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                <div className="flex items-center gap-2 text-primary-container font-bold text-xs uppercase tracking-wider">
                  <span>1. Introducción & Justificación</span>
                </div>
                <h4 className="text-sm font-bold text-white">Mitigación de Riesgos Laborales</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Exposición de contingencias por demandas laborales multimillonarias derivadas de pagos por honorarios y
                  necesidad de modernización fiscal.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wider">
                  <span>2. Marco Normativo</span>
                </div>
                <h4 className="text-sm font-bold text-white">Sentencia C-006-96 & Ley 30</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Sustento de la relación laboral subordinada, derecho irrenunciable a prestaciones proporcionales y
                  autonomía del Decreto 1279 de 2002.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                  <span>3. Propuesta Económica</span>
                </div>
                <h4 className="text-sm font-bold text-white">Análisis de Divisores & Puntos</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Contraste financiero entre el divisor de 171.2h (blindaje jurídico), 240h (menor tarifa) y el sistema de
                  puntos del Acuerdo 015 de la UPTC.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                <div className="flex items-center gap-2 text-blue-400 font-bold text-xs uppercase tracking-wider">
                  <span>4. Control de Asistencia</span>
                </div>
                <h4 className="text-sm font-bold text-white">Flujo de Validación Semanal</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Parametrización de hora reloj vs. hora académica, 10 minutos de tolerancia y expedición de Concepto
                  Favorable por la Dirección de Programa.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
                  <span>5. Plan de Mitigación de Caja</span>
                </div>
                <h4 className="text-sm font-bold text-white">Retrasos en Giros de Gratuidad</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Mecanismos de liquidez para compensar demoras en transferencias de la Política de Gratuidad (Recurso 10.5)
                  sin suspender el pago de la nómina docente.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                <div className="flex items-center gap-2 text-purple-400 font-bold text-xs uppercase tracking-wider">
                  <span>6. Conclusiones y Acuerdos</span>
                </div>
                <h4 className="text-sm font-bold text-white">Proyecto de Acto Administrativo</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Redacción de articulado modificatorio para aprobación del Consejo Superior Universitario de la UPTC.
                </p>
              </div>
            </div>
          </div>

          {/* Plan de Mitigación de Riesgos Financieros de Caja (Gratuidad R10.5) */}
          <div className="rounded-3xl bg-surface-container/60 border border-white/10 p-6 md:p-8 shadow-xl backdrop-blur-md space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Coins className="text-primary-container" size={18} />
              Plan de Mitigación de Riesgos de Flujo de Caja (Política de Gratuidad R10.5)
            </h3>
            <p className="text-xs text-on-surface-variant">
              En 2026, la UPTC tiene apropiados <strong>$ 142,1 M</strong> en el Recurso 10.5 (Gratuidad). Los retrasos en los
              giros del Gobierno Nacional requieren medidas de contingencia de tesorería:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-xs space-y-2">
                <span className="font-bold text-amber-400">1. Unidad de Caja Temporal:</span>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Uso temporal de excedentes de liquidez de Recursos Propios (R20 / R31) para apalancar la nómina de cátedra
                  mientras se efectúan los desembolsos de la Nación.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-xs space-y-2">
                <span className="font-bold text-emerald-400">2. Reintegro Automático:</span>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Restitución automática de los fondos a las cuentas de origen en el mismo instante en que el Ministerio de
                  Educación radique los recursos de gratuidad.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-xs space-y-2">
                <span className="font-bold text-blue-400">3. Blindaje de Nómina:</span>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Priorización irrestricta de las cuentas de nómina docente sobre gastos generales o inversiones no
                  urgentes para evitar cesación de actividades académicas.
                </p>
              </div>
            </div>
          </div>

          {/* Cuestionario Interactivo de Evaluación */}
          <div className="rounded-3xl bg-surface-container/60 border border-white/10 p-6 md:p-8 shadow-xl backdrop-blur-md space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <CheckSquare className="text-primary-container" size={20} />
                  Evaluación Interactiva: Liquidación y Normativa de Hora Cátedra
                </h3>
                <p className="text-xs text-on-surface-variant">
                  Pon a prueba tus conocimientos sobre la Sentencia C-006-96, divisores mensuales y el Acuerdo 015 de la UPTC.
                </p>
              </div>

              <div className="flex items-center gap-3">
                {showQuizResults && (
                  <span className="px-3 py-1 rounded-xl bg-primary-container text-slate-950 font-bold text-xs">
                    Puntaje: {quizScore} de {QUIZ_QUESTIONS.length} ({((quizScore / QUIZ_QUESTIONS.length) * 100).toFixed(0)}%)
                  </span>
                )}
                <button
                  onClick={() => {
                    setUserAnswers({});
                    setShowQuizResults(false);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw size={13} />
                  <span>Reiniciar Quiz</span>
                </button>
              </div>
            </div>

            <div className="space-y-6">
              {QUIZ_QUESTIONS.map((q, qIndex) => {
                const selectedOption = userAnswers[q.id];
                return (
                  <div key={q.id} className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3 text-xs">
                    <span className="font-bold text-white text-sm block">
                      {qIndex + 1}. {q.pregunta}
                    </span>

                    <div className="space-y-2">
                      {q.opciones.map((op, opIndex) => {
                        const isSelected = selectedOption === opIndex;
                        let optionStyle = 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10';

                        if (showQuizResults) {
                          if (op.correcta) {
                            optionStyle = 'bg-emerald-500/20 border-emerald-500/50 text-emerald-200 font-bold';
                          } else if (isSelected && !op.correcta) {
                            optionStyle = 'bg-rose-500/20 border-rose-500/50 text-rose-200';
                          }
                        } else if (isSelected) {
                          optionStyle = 'bg-primary-container/20 border-primary-container text-white font-bold';
                        }

                        return (
                          <button
                            key={opIndex}
                            type="button"
                            onClick={() => {
                              if (!showQuizResults) {
                                setUserAnswers((prev) => ({ ...prev, [q.id]: opIndex }));
                              }
                            }}
                            className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${optionStyle}`}
                          >
                            <span>{op.texto}</span>
                            {showQuizResults && op.correcta && (
                              <CheckCircle size={16} className="text-emerald-400 flex-shrink-0" />
                            )}
                            {showQuizResults && isSelected && !op.correcta && (
                              <XCircle size={16} className="text-rose-400 flex-shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {showQuizResults && (
                      <div className="mt-3 p-3 rounded-xl bg-black/40 border border-white/10 text-[11px] text-slate-300">
                        <span className="font-bold text-primary-container">Explicación jurídica: </span>
                        {q.explicacion}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {!showQuizResults && (
              <div className="text-center pt-2">
                <button
                  onClick={() => setShowQuizResults(true)}
                  disabled={Object.keys(userAnswers).length === 0}
                  className="px-6 py-2.5 rounded-xl bg-primary-container hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs transition-all cursor-pointer shadow-lg"
                >
                  Calificar Evaluación
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
