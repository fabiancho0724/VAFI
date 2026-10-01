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
  ShieldAlert,
  Printer,
  Eye,
  X,
  Loader2,
  FileDown
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

  // Estados de PDF y Previsualización
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [showPdfPreviewModal, setShowPdfPreviewModal] = useState<boolean>(false);

  // Impresión directa del documento
  const handlePrint = () => {
    window.print();
  };

  // Descarga directa del Informe Oficial en PDF con html2pdf
  const handleDownloadPDF = async () => {
    setIsGeneratingPdf(true);
    const prevTitle = document.title;
    const reportTitle = `UPTC_Informe_Tecnico_Horas_Catedra_2026_${new Date().toISOString().slice(0, 10)}`;
    document.title = reportTitle;

    try {
      if (!(window as any).html2pdf) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('No se pudo cargar la librería html2pdf'));
          document.head.appendChild(script);
          setTimeout(() => reject(new Error('Tiempo de espera agotado')), 5000);
        });
      }

      const element = document.getElementById('printable-horas-catedra-report');
      if (!element || !(window as any).html2pdf) {
        window.print();
        setIsGeneratingPdf(false);
        return;
      }

      const clone = element.cloneNode(true) as HTMLElement;
      clone.id = 'printable-horas-catedra-report-clone';
      clone.style.position = 'fixed';
      clone.style.left = '-9999px';
      clone.style.top = '0';
      clone.style.width = '1000px';
      clone.style.display = 'block';
      clone.style.visibility = 'visible';
      clone.style.opacity = '1';
      clone.style.background = '#ffffff';
      clone.style.color = '#0f172a';

      clone.querySelectorAll('*').forEach((el: any) => {
        el.style.visibility = 'visible';
        el.style.opacity = '1';
      });

      document.body.appendChild(clone);

      const opt = {
        margin: [8, 8, 8, 8],
        filename: `${reportTitle}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false
        },
        jsPDF: { unit: 'mm', format: 'letter', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };

      await (window as any).html2pdf().set(opt).from(clone).save();
      if (document.body.contains(clone)) {
        document.body.removeChild(clone);
      }
    } catch (err) {
      console.warn('Utilizando exportación mediante diálogo de impresión del navegador:', err);
      window.print();
    } finally {
      setIsGeneratingPdf(false);
      setTimeout(() => {
        document.title = prevTitle;
      }, 2500);
    }
  };

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

          <div className="flex flex-wrap items-center gap-2.5">
            <a
              href="http://pagos.uptc.edu.co/DocCompNormativa/015DE2009.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-surface-container-high/80 hover:bg-white/10 text-white text-xs font-medium border border-white/10 transition-all hover:scale-[1.02] shadow-lg cursor-pointer"
              title="Descargar PDF original del Acuerdo No. 015 de 2009"
            >
              <ExternalLink size={14} className="text-primary-container" />
              <span>Acuerdo 015 (PDF)</span>
            </a>

            <button
              onClick={() => setShowPdfPreviewModal(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold border border-white/15 transition-all hover:scale-[1.02] shadow-md cursor-pointer"
              title="Previsualizar el informe técnico formal en pantalla antes de descargar"
            >
              <Eye size={14} className="text-primary-container" />
              <span>Vista Previa PDF</span>
            </button>

            <button
              onClick={handleDownloadPDF}
              disabled={isGeneratingPdf}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-container hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-bold transition-all hover:scale-[1.02] shadow-[0_0_20px_rgba(255,204,41,0.25)] cursor-pointer"
              title="Generar y descargar el informe técnico completo en formato PDF institucional"
            >
              {isGeneratingPdf ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
              <span>{isGeneratingPdf ? 'Generando PDF...' : 'Descargar Informe PDF'}</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-surface-container-high/80 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-medium border border-white/10 transition-all cursor-pointer"
              title="Descargar matriz presupuestal en formato CSV"
            >
              <Download size={14} />
              <span>Exportar CSV</span>
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
      {/* PESTAÑA 5: INFORME TÉCNICO OFICIAL, PROYECCIÓN 2027 & REFORMA */}
      {/* ========================================================================= */}
      {activeTab === 'informe' && (
        <div className="space-y-6">
          {/* Banner de Descarga Oficial del Informe Técnico en PDF */}
          <div className="rounded-3xl bg-gradient-to-r from-amber-500/20 via-primary-container/10 to-transparent border border-primary-container/30 p-6 shadow-xl backdrop-blur-md flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary-container text-slate-950 uppercase tracking-wider">
                  Documento Institucional Oficial
                </span>
                <span className="text-xs text-slate-400 font-mono">Radicado UPTC-VAFI-HC-2026-015</span>
              </div>
              <h3 className="text-lg md:text-xl font-black text-white">
                Informe Técnico: Considerandos, Evolución, Proyección 2027 y Reforma al Modelo
              </h3>
              <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                Documento ejecutivo estructurado para sustentar ante el Consejo Superior Universitario la actualización del método de pago de horas cátedra, amparado en la Sentencia C-006-96 y el Acuerdo 015 de 2009.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 flex-shrink-0">
              <button
                onClick={() => setShowPdfPreviewModal(true)}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold border border-white/15 flex items-center gap-2 transition-all hover:scale-[1.02] cursor-pointer"
              >
                <Eye size={15} className="text-primary-container" />
                <span>Vista Previa PDF</span>
              </button>

              <button
                onClick={handleDownloadPDF}
                disabled={isGeneratingPdf}
                className="px-5 py-2.5 rounded-xl bg-primary-container hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-bold flex items-center gap-2 shadow-[0_0_20px_rgba(255,204,41,0.25)] transition-all hover:scale-[1.02] cursor-pointer"
              >
                {isGeneratingPdf ? <Loader2 size={15} className="animate-spin" /> : <FileDown size={15} />}
                <span>{isGeneratingPdf ? 'Generando PDF...' : 'Descargar Informe PDF'}</span>
              </button>
            </div>
          </div>

          {/* I. CONSIDERANDOS A NIVEL NORMATIVO */}
          <div className="rounded-3xl bg-surface-container/60 border border-white/10 p-6 md:p-8 shadow-xl backdrop-blur-md space-y-4">
            <div className="border-b border-white/10 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scale className="text-primary-container" size={20} />
                <h3 className="text-lg font-bold text-white uppercase tracking-wider">
                  I. Considerandos a Nivel Normativo (Sustento Jurídico Vinculante)
                </h3>
              </div>
              <span className="text-xs text-primary-container font-mono font-bold">Orden Constitucional y Legal</span>
            </div>

            <div className="p-4 rounded-2xl bg-black/30 border border-white/10 space-y-3 text-xs text-slate-300 leading-relaxed font-sans">
              <p className="font-bold text-white text-sm">CONSIDERANDO QUE:</p>
              <div className="space-y-2.5 pl-2 border-l-2 border-primary-container">
                <p>
                  <strong>1. Primacía de la Realidad (Art. 53 C.P.):</strong> La Constitución Política de Colombia consagra como principio fundamental la primacía de la realidad sobre las formas pactadas por los sujetos laborales y la irrenunciabilidad a los derechos laborales mínimos.
                </p>
                <p>
                  <strong>2. Jurisprudencia Constitucional Vinculante (Sentencia C-006 de 1996):</strong> La Honorable Corte Constitucional declaró que los docentes de cátedra que laboran bajo subordinación, directrices y horario continuo son servidores públicos o trabajadores subordinados. Por ende, determinó la inconstitucionalidad de contratarlos bajo órdenes de prestación de servicios (honorarios) y ordenó el reconocimiento y pago proporcional de todas las prestaciones sociales (vacaciones, prima de vacaciones, cesantías e intereses, y prima de Navidad).
                </p>
                <p>
                  <strong>3. Régimen de Incompatibilidades y Tesoro Público (Art. 128 C.P.):</strong> Nadie podrá recibir más de una asignación del tesoro público. En consecuencia, la cátedra interna de docentes de planta y ocasionales debe ejercerse obligatoriamente fuera del horario ordinario de trabajo y sin descarga académica.
                </p>
                <p>
                  <strong>4. Autonomía Universitaria y Piso Salarial (Ley 30 de 1992):</strong> Los artículos 69, 70 y 71 reconocen la facultad de las universidades para fijar su estatuto docente, señalando que la remuneración de la hora cátedra no podrá ser inferior al resultado de dividir ocho (8) SMMLV entre las horas laborables mensuales.
                </p>
                <p>
                  <strong>5. Régimen Salarial Público (Decreto 1279 de 2002 y Decreto 318 de 2026):</strong> El Gobierno Nacional actualiza anualmente el valor del punto salarial, fijado para 2026 en <strong>$ 23.924 COP</strong>.
                </p>
                <p>
                  <strong>6. Estatuto de Remuneración UPTC (Acuerdo No. 015 de 2009):</strong> El Consejo Superior Universitario fijó la escala de puntos por hora (Auxiliar 2.50, Asistente 2.75, Asociado 3.00 y Titular 3.50) y reguló la cátedra interna con tope legal estricto de máximo 1 asignatura y hasta 4 horas semanales.
                </p>
                <p>
                  <strong>7. Obligación de Blindaje Patrimonial:</strong> Es imperativo para la institución adecuar su modelo de contratación y liquidación a fin de blindar a la universidad de demandas laborales millonarias por desnaturalización de contratos.
                </p>
              </div>
            </div>
          </div>

          {/* II. EVOLUCIÓN HISTÓRICA DE LOS PAGOS (2024 - 2026) */}
          <div className="rounded-3xl bg-surface-container/60 border border-white/10 p-6 md:p-8 shadow-xl backdrop-blur-md space-y-6">
            <div className="border-b border-white/10 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="text-primary-container" size={20} />
                <h3 className="text-lg font-bold text-white uppercase tracking-wider">
                  II. Evolución Histórica de los Pagos y Nómina de Cátedra (2024 - 2026)
                </h3>
              </div>
              <span className="text-xs text-emerald-400 font-mono font-bold">Datos Oficiales UPTC</span>
            </div>

            {/* Evolución del Punto y Tarifas */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-white">1. Evolución del Valor del Punto y Tarifas Horarias por Categoría</h4>
              <div className="overflow-x-auto rounded-2xl border border-white/10">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/5 text-slate-300 font-semibold border-b border-white/10 uppercase text-[11px]">
                    <tr>
                      <th className="p-3">Categoría Docente</th>
                      <th className="p-3 text-center">Puntos / Hora</th>
                      <th className="p-3 text-right">Tarifa 2024 (Pto $20.895)</th>
                      <th className="p-3 text-right">Tarifa 2025 (Pto $22.358)</th>
                      <th className="p-3 text-right text-primary-container">Tarifa 2026 (Pto $23.924)</th>
                      <th className="p-3 text-center">Variación Acumulada</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-200">
                    {ESCALA_PUNTOS.map((e) => (
                      <tr key={e.categoria} className="hover:bg-white/5">
                        <td className="p-3 font-bold text-white">{e.categoria}</td>
                        <td className="p-3 text-center font-mono font-bold text-primary-container">{e.puntos.toFixed(2)} pts</td>
                        <td className="p-3 text-right font-mono text-slate-400">{formatCOP(e.tarifa2024)}</td>
                        <td className="p-3 text-right font-mono text-slate-300">{formatCOP(e.tarifa2025)}</td>
                        <td className="p-3 text-right font-mono font-bold text-emerald-400">{formatCOP(e.tarifa2026)}</td>
                        <td className="p-3 text-center font-mono text-emerald-300">+14.50%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Desembolsos Reales 2026 */}
            <div className="space-y-3 pt-2">
              <h4 className="text-sm font-bold text-white">2. Ejecución Presupuestal y Desembolsos Reales en la Vigencia 2026</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-slate-400 block text-[11px]">Apropiado Total 2026</span>
                  <span className="text-lg font-black text-white font-mono">{formatCurrency(totalCompromiso)}</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Pregrado: $8.561,5M | Posg: $8.892,5M</span>
                </div>
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-slate-400 block text-[11px]">Pagado (Ene - Ago 2026)</span>
                  <span className="text-lg font-black text-emerald-400 font-mono">{formatCurrency(totalPagado)}</span>
                  <span className="text-[10px] text-emerald-400 block mt-0.5">67.4% de avance ejecutado</span>
                </div>
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-slate-400 block text-[11px]">Saldo por Ejecutar (Sep - Dic)</span>
                  <span className="text-lg font-black text-blue-400 font-mono">{formatCurrency(saldoPorEjecutar)}</span>
                  <span className="text-[10px] text-blue-400 block mt-0.5">32.6% de saldo disponible</span>
                </div>
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-slate-400 block text-[11px]">Pico de Desembolso (Mayo)</span>
                  <span className="text-lg font-black text-amber-300 font-mono">$ 2.734,9 M</span>
                  <span className="text-[10px] text-amber-400 block mt-0.5">Cierre del Semestre 2026-I</span>
                </div>
              </div>
            </div>
          </div>

          {/* III. PROYECCIÓN DE LOS VALORES EN EL 2027 */}
          <div className="rounded-3xl bg-surface-container/60 border border-white/10 p-6 md:p-8 shadow-xl backdrop-blur-md space-y-6">
            <div className="border-b border-white/10 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="text-primary-container" size={20} />
                <h3 className="text-lg font-bold text-white uppercase tracking-wider">
                  III. Proyección de Valores y Costos Institucionales (Vigencia 2027)
                </h3>
              </div>
              <span className="text-xs text-amber-300 font-mono font-bold">IPC Proyectado +4.0%</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-white">1. Escala Tarifaria Proyectada 2027 (Punto D1279: $ 24.881 COP)</h4>
                <div className="overflow-x-auto rounded-xl border border-white/10">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-white/5 text-slate-300 font-semibold border-b border-white/10 text-[11px]">
                      <tr>
                        <th className="p-2.5">Categoría</th>
                        <th className="p-2.5 text-center">Puntos</th>
                        <th className="p-2.5 text-right">Tarifa 2026</th>
                        <th className="p-2.5 text-right text-primary-container">Tarifa Proyectada 2027</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-slate-200">
                      <tr>
                        <td className="p-2.5 font-semibold text-white">Profesor Auxiliar</td>
                        <td className="p-2.5 text-center font-mono">2.50</td>
                        <td className="p-2.5 text-right font-mono text-slate-400">$ 59.810</td>
                        <td className="p-2.5 text-right font-mono font-bold text-emerald-400">$ 62.203 / h</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-semibold text-white">Profesor Asistente</td>
                        <td className="p-2.5 text-center font-mono">2.75</td>
                        <td className="p-2.5 text-right font-mono text-slate-400">$ 65.791</td>
                        <td className="p-2.5 text-right font-mono font-bold text-emerald-400">$ 68.423 / h</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-semibold text-white">Profesor Asociado</td>
                        <td className="p-2.5 text-center font-mono">3.00</td>
                        <td className="p-2.5 text-right font-mono text-slate-400">$ 71.772</td>
                        <td className="p-2.5 text-right font-mono font-bold text-emerald-400">$ 74.643 / h</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-semibold text-white">Profesor Titular</td>
                        <td className="p-2.5 text-center font-mono">3.50</td>
                        <td className="p-2.5 text-right font-mono text-slate-400">$ 83.734</td>
                        <td className="p-2.5 text-right font-mono font-bold text-emerald-400">$ 87.084 / h</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-bold text-white">2. Presupuesto Institucional Requerido para Cátedra en 2027</h4>
                <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2.5 text-xs">
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">Presupuesto Comprometido Cátedra 2026:</span>
                    <span className="font-mono text-white font-bold">{formatCurrency(totalCompromiso)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">Pregrado Proyectado 2027 (+4.0%):</span>
                    <span className="font-mono text-emerald-400 font-bold">$ 8.903,9 M</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">Posgrados Proyectado 2027 (+4.0%):</span>
                    <span className="font-mono text-primary-container font-bold">$ 9.248,2 M</span>
                  </div>
                  <div className="flex justify-between pt-2 text-sm font-bold text-white">
                    <span>Total Presupuesto Proyectado Cátedra 2027:</span>
                    <span className="font-mono text-emerald-400">$ 18.152,2 M</span>
                  </div>
                  <p className="text-[11px] text-slate-400 italic pt-1">
                    Esfuerzo fiscal adicional requerido para sostener la misma asignación de horas lectivas: <strong>+$ 698,2 M</strong>.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* IV. SUSTENTO TÉCNICO PARA UNA MODIFICACIÓN DEL MODELO */}
          <div className="rounded-3xl bg-surface-container/60 border border-white/10 p-6 md:p-8 shadow-xl backdrop-blur-md space-y-6">
            <div className="border-b border-white/10 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="text-primary-container" size={20} />
                <h3 className="text-lg font-bold text-white uppercase tracking-wider">
                  IV. Sustento Técnico para una Modificación del Modelo de Horas Cátedra
                </h3>
              </div>
              <span className="text-xs text-rose-300 font-mono font-bold">Propuesta de Acuerdo</span>
            </div>

            <div className="space-y-4 text-xs leading-relaxed text-slate-300">
              <p className="text-justify">
                El análisis financiero y jurídico evidencia que el modelo vigente adoptado en el <strong>Acuerdo No. 015 de 2009</strong> requiere una actualización urgente fundamentada en los siguientes pilares técnicos:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
                  <span className="font-bold text-rose-300 text-sm block">1. Transparencia y Provisión Prestacional (C-006-96):</span>
                  <p className="text-[11px] text-slate-300 text-justify">
                    Para blindar a la universidad contra demandas laborales por el principio de primacía de la realidad, los contratos de cátedra deben desglosar explícitamente el salario básico en puntos y la alícuota proporcional correspondiente a cesantías (8.33%), prima de servicios (8.33%), prima de navidad y vacaciones (5.17%), totalizando un <strong>factor prestacional del 21.83%</strong>.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
                  <span className="font-bold text-emerald-300 text-sm block">2. Armonización de Divisores (Ley 30 vs. Acuerdo 015):</span>
                  <p className="text-[11px] text-slate-300 text-justify">
                    El divisor de la jornada docente de 171.2 horas (40h/sem × 4.28) fija un piso constitucional de $81.820/h con 8 SMMLV, frente al divisor de 240 horas ($58.364/h). La universidad debe nivelar el piso mínimo del Profesor Auxiliar para garantizar que ninguna categoría quede desprotegida ante reclamos de nivelación salarial.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
                  <span className="font-bold text-blue-300 text-sm block">3. Definición Operativa: Hora Reloj vs. Hora Académica:</span>
                  <p className="text-[11px] text-slate-300 text-justify">
                    Se debe reglamentar formalmente que la hora cátedra equivale a <strong>cincuenta (50) minutos lectivos presenciales de aula</strong>, fijando un margen de tolerancia estricto de <strong>diez (10) minutos</strong> de gracia antes de aplicar descuentos, condicionado a la expedición del <strong>Concepto Favorable mensual del Director de Escuela</strong>.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
                  <span className="font-bold text-amber-300 text-sm block">4. Blindaje de Topes Semanales y Unidad de Caja:</span>
                  <p className="text-[11px] text-slate-300 text-justify">
                    Fijar un tope máximo de <strong>19 horas semanales</strong> para cátedra externa (evitando desnaturalización de la jornada), ratificar el tope legal de <strong>4 horas semanales</strong> para cátedra interna (Art. 2) y autorizar la <strong>Unidad de Caja Temporal</strong> para solventar retrasos en los giros de la Gratuidad (R10.5).
                  </p>
                </div>
              </div>

              {/* Proyecto de Articulado Modificatorio */}
              <div className="p-5 rounded-2xl bg-black/40 border border-primary-container/30 space-y-2 mt-2">
                <span className="text-primary-container font-bold text-sm block uppercase tracking-wide">
                  Síntesis del Proyecto de Acuerdo Modificatorio para el Consejo Superior:
                </span>
                <ul className="space-y-1.5 text-[11px] text-slate-300 list-disc pl-4">
                  <li><strong>Artículo 1° (Fórmula Integral):</strong> Modificar el Art. 1 del Acuerdo 015/2009 para incorporar expresamente la provisión proporcional de prestaciones sociales de ley (21.83%).</li>
                  <li><strong>Artículo 2° (Equivalencia Horaria):</strong> Fijar que 1 hora cátedra corresponde a 50 minutos lectivos presenciales, con 10 minutos de tolerancia.</li>
                  <li><strong>Artículo 3° (Límites de Vinculación):</strong> Establecer un tope máximo de 19 horas semanales para cátedra externa y ratificar el tope de 4 horas para cátedra interna.</li>
                  <li><strong>Artículo 4° (Certificación Obligatoria):</strong> Condicionar el desembolso mensual de nómina al Concepto Favorable del Director de Programa o Escuela.</li>
                  <li><strong>Artículo 5° (Unidad de Caja):</strong> Habilitar la unidad de caja temporal para apalancar el Recurso 10.5 (Gratuidad) ante retrasos de transferencias nacionales.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DOCUMENTO OFICIAL IMPRIMIBLE / GENERADOR DE PDF INSTITUCIONAL              */}
      {/* ========================================================================= */}
      <div
        id="printable-horas-catedra-report"
        style={{ display: 'none' }}
        className="p-8 md:p-12 bg-white text-slate-900 font-sans text-xs space-y-6"
      >
        {/* Encabezado Institucional con Membrete Oficial */}
        <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-start">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full bg-amber-500 inline-block"></span>
              <span className="text-[11px] font-black tracking-widest uppercase text-slate-800">
                UNIVERSIDAD PEDAGÓGICA Y TECNOLÓGICA DE COLOMBIA
              </span>
            </div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase">
              VICERRECTORÍA ADMINISTRATIVA Y FINANCIERA — DIRECCIÓN FINANCIERA
            </h1>
            <h2 className="text-sm font-bold text-amber-600 uppercase tracking-wide">
              INFORME TÉCNICO OFICIAL: NÓMINA TEMPORAL DOCENTE Y LIQUIDACIÓN DE HORAS CÁTEDRA
            </h2>
            <p className="text-[11px] text-slate-600">
              Sustento Constitucional Sentencia C-006-96 • Acuerdo No. 015 de 2009 • Decretos 1279/2002 y 318/2026
            </p>
          </div>

          <div className="text-right text-[11px] text-slate-700 bg-slate-50 border border-slate-300 rounded-xl p-3 min-w-[220px] space-y-1">
            <div><strong>Radicado:</strong> UPTC-VAFI-HC-2026-015</div>
            <div><strong>Vigencia Fiscal:</strong> 2026</div>
            <div><strong>Fecha Emisión:</strong> {new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
            <div><strong>Valor Punto D1279:</strong> $ 23.924 COP</div>
          </div>
        </div>

        {/* 1. CONSIDERANDOS A NIVEL NORMATIVO */}
        <div className="space-y-2">
          <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider border-b border-slate-300 pb-1">
            1. Considerandos a Nivel Normativo (Sustento Jurídico Vinculante)
          </h3>
          <div className="text-[11px] text-slate-800 space-y-1.5 leading-relaxed text-justify">
            <p className="font-bold">CONSIDERANDO QUE:</p>
            <p><strong>1. Primacía de la Realidad (Art. 53 C.P.):</strong> La Constitución Política de Colombia consagra el principio fundamental de la primacía de la realidad sobre las formas contractuales y la irrenunciabilidad a los beneficios laborales mínimos.</p>
            <p><strong>2. Jurisprudencia Constitucional Vinculante (Sentencia C-006 de 1996):</strong> La Corte Constitucional determinó que los profesores de hora cátedra subordinados son servidores públicos o trabajadores con relación laboral auténtica, declarando inconstitucional su vinculación por honorarios (prestación de servicios) y ordenando el reconocimiento proporcional de todas las prestaciones sociales (vacaciones, cesantías, intereses, prima de navidad y prima de servicios).</p>
            <p><strong>3. Prohibición de Doble Asignación (Art. 128 C.P.):</strong> Nadie podrá recibir más de una asignación del tesoro público. La cátedra interna de docentes de planta y ocasionales debe ejercerse obligatoriamente fuera del horario ordinario de trabajo y sin descarga académica.</p>
            <p><strong>4. Autonomía Universitaria y Piso Salarial (Ley 30 de 1992):</strong> Los artículos 69 a 71 reconocen la autonomía universitaria y establecen que la hora cátedra no podrá ser inferior a la proporción de 8 SMMLV divididos entre las horas laborables mensuales.</p>
            <p><strong>5. Régimen Salarial Público (Decretos 1279/2002 y 318/2026):</strong> El valor del punto salarial oficial para la vigencia 2026 fue establecido en $ 23.924 COP.</p>
            <p><strong>6. Estatuto UPTC (Acuerdo No. 015 de 2009):</strong> Fijó los puntos por hora de pregrado (2.50 a 3.50 pts) y limitó la cátedra interna a un máximo de una (1) asignatura y hasta cuatro (4) horas semanales.</p>
          </div>
        </div>

        {/* 2. EVOLUCIÓN HISTÓRICA DE LOS PAGOS */}
        <div className="space-y-2 pt-2 border-t border-slate-200">
          <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider border-b border-slate-300 pb-1">
            2. Evolución Histórica de los Pagos y Nómina de Cátedra (2024 - 2026)
          </h3>
          <p className="text-[11px] text-slate-700">
            Evolución del punto salarial del Decreto 1279 y tarifas horarias resultantes bajo el Acuerdo 015 de la UPTC:
          </p>

          <table className="w-full text-left text-[11px] border border-slate-300">
            <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300 text-[10px] uppercase">
              <tr>
                <th className="p-1.5">Categoría en Escalafón</th>
                <th className="p-1.5 text-center">Puntos</th>
                <th className="p-1.5 text-right">Tarifa 2024</th>
                <th className="p-1.5 text-right">Tarifa 2025</th>
                <th className="p-1.5 text-right">Tarifa 2026</th>
                <th className="p-1.5 text-center">Variación Acum.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              <tr>
                <td className="p-1.5 font-bold text-slate-900">Profesor Auxiliar</td>
                <td className="p-1.5 text-center font-mono">2.50 pts</td>
                <td className="p-1.5 text-right font-mono text-slate-600">$ 52.238</td>
                <td className="p-1.5 text-right font-mono text-slate-700">$ 55.895</td>
                <td className="p-1.5 text-right font-mono font-bold text-slate-900">$ 59.810 / h</td>
                <td className="p-1.5 text-center font-mono text-emerald-700">+14.5%</td>
              </tr>
              <tr>
                <td className="p-1.5 font-bold text-slate-900">Profesor Asistente</td>
                <td className="p-1.5 text-center font-mono">2.75 pts</td>
                <td className="p-1.5 text-right font-mono text-slate-600">$ 57.461</td>
                <td className="p-1.5 text-right font-mono text-slate-700">$ 61.485</td>
                <td className="p-1.5 text-right font-mono font-bold text-slate-900">$ 65.791 / h</td>
                <td className="p-1.5 text-center font-mono text-emerald-700">+14.5%</td>
              </tr>
              <tr>
                <td className="p-1.5 font-bold text-slate-900">Profesor Asociado</td>
                <td className="p-1.5 text-center font-mono">3.00 pts</td>
                <td className="p-1.5 text-right font-mono text-slate-600">$ 62.685</td>
                <td className="p-1.5 text-right font-mono text-slate-700">$ 67.074</td>
                <td className="p-1.5 text-right font-mono font-bold text-slate-900">$ 71.772 / h</td>
                <td className="p-1.5 text-center font-mono text-emerald-700">+14.5%</td>
              </tr>
              <tr>
                <td className="p-1.5 font-bold text-slate-900">Profesor Titular</td>
                <td className="p-1.5 text-center font-mono">3.50 pts</td>
                <td className="p-1.5 text-right font-mono text-slate-600">$ 73.133</td>
                <td className="p-1.5 text-right font-mono text-slate-700">$ 78.253</td>
                <td className="p-1.5 text-right font-mono font-bold text-slate-900">$ 83.734 / h</td>
                <td className="p-1.5 text-center font-mono text-emerald-700">+14.5%</td>
              </tr>
            </tbody>
          </table>

          <div className="grid grid-cols-3 gap-2 pt-1 text-[10px]">
            <div className="p-2 border border-slate-300 rounded bg-slate-50">
              <span className="text-slate-500 block">Compromiso Total 2026:</span>
              <strong className="font-mono text-slate-900">{formatCurrency(totalCompromiso)}</strong>
            </div>
            <div className="p-2 border border-slate-300 rounded bg-slate-50">
              <span className="text-slate-500 block">Pagos a 31 de Agosto:</span>
              <strong className="font-mono text-emerald-800">{formatCurrency(totalPagado)} (67.4%)</strong>
            </div>
            <div className="p-2 border border-slate-300 rounded bg-slate-50">
              <span className="text-slate-500 block">Saldo por Ejecutar:</span>
              <strong className="font-mono text-blue-800">{formatCurrency(saldoPorEjecutar)}</strong>
            </div>
          </div>
        </div>

        {/* 3. PROYECCIÓN DE LOS VALORES EN EL 2027 */}
        <div className="space-y-2 pt-2 border-t border-slate-200">
          <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider border-b border-slate-300 pb-1">
            3. Proyección de Valores y Costos Institucionales para la Vigencia 2027
          </h3>
          <p className="text-[11px] text-slate-700">
            Considerando un incremento del IPC proyectado del 4.0%, el valor del punto D1279 se estima en <strong>$ 24.881 COP</strong>:
          </p>

          <table className="w-full text-left text-[11px] border border-slate-300">
            <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300 text-[10px] uppercase">
              <tr>
                <th className="p-1.5">Categoría</th>
                <th className="p-1.5 text-center">Puntos</th>
                <th className="p-1.5 text-right">Tarifa Proyectada 2027</th>
                <th className="p-1.5 text-right">Costo Contrato 64h (Base)</th>
                <th className="p-1.5 text-right">Prestaciones C-006-96 (+21.83%)</th>
                <th className="p-1.5 text-right">Total Contrato 2027</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              <tr>
                <td className="p-1.5 font-bold text-slate-900">Profesor Auxiliar</td>
                <td className="p-1.5 text-center font-mono">2.50 pts</td>
                <td className="p-1.5 text-right font-mono font-bold text-slate-900">$ 62.203 / h</td>
                <td className="p-1.5 text-right font-mono text-slate-700">$ 3.980.992</td>
                <td className="p-1.5 text-right font-mono text-emerald-700">+$ 869.051</td>
                <td className="p-1.5 text-right font-mono font-bold text-slate-900">$ 4.850.043</td>
              </tr>
              <tr>
                <td className="p-1.5 font-bold text-slate-900">Profesor Asistente</td>
                <td className="p-1.5 text-center font-mono">2.75 pts</td>
                <td className="p-1.5 text-right font-mono font-bold text-slate-900">$ 68.423 / h</td>
                <td className="p-1.5 text-right font-mono text-slate-700">$ 4.379.072</td>
                <td className="p-1.5 text-right font-mono text-emerald-700">+$ 955.951</td>
                <td className="p-1.5 text-right font-mono font-bold text-slate-900">$ 5.335.023</td>
              </tr>
              <tr>
                <td className="p-1.5 font-bold text-slate-900">Profesor Asociado</td>
                <td className="p-1.5 text-center font-mono">3.00 pts</td>
                <td className="p-1.5 text-right font-mono font-bold text-slate-900">$ 74.643 / h</td>
                <td className="p-1.5 text-right font-mono text-slate-700">$ 4.777.152</td>
                <td className="p-1.5 text-right font-mono text-emerald-700">+$ 1.042.852</td>
                <td className="p-1.5 text-right font-mono font-bold text-slate-900">$ 5.820.004</td>
              </tr>
              <tr>
                <td className="p-1.5 font-bold text-slate-900">Profesor Titular</td>
                <td className="p-1.5 text-center font-mono">3.50 pts</td>
                <td className="p-1.5 text-right font-mono font-bold text-slate-900">$ 87.084 / h</td>
                <td className="p-1.5 text-right font-mono text-slate-700">$ 5.573.376</td>
                <td className="p-1.5 text-right font-mono text-emerald-700">+$ 1.216.668</td>
                <td className="p-1.5 text-right font-mono font-bold text-slate-900">$ 6.790.044</td>
              </tr>
            </tbody>
          </table>

          <div className="p-2 border border-slate-300 rounded bg-slate-50 text-[10px] space-y-1">
            <strong>Presupuesto Global Proyectado Cátedra 2027:</strong>
            <p>Total Requerido: <strong>$ 18.152,2 M COP</strong> (Pregrado: $ 8.903,9 M | Posgrados: $ 9.248,2 M). Incremento institucional: <strong>+$ 698,2 M</strong>.</p>
          </div>
        </div>

        {/* 4. SUSTENTO TÉCNICO PARA UNA MODIFICACIÓN DEL MODELO */}
        <div className="space-y-2 pt-2 border-t border-slate-200">
          <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider border-b border-slate-300 pb-1">
            4. Sustento Técnico para una Modificación del Modelo de Horas Cátedra
          </h3>
          <div className="text-[11px] text-slate-800 space-y-1.5 leading-relaxed text-justify">
            <p><strong>a) Cumplimiento Estricto de la Sentencia C-006-96:</strong> La universidad debe incorporar formalmente en sus contratos la liquidación de prestaciones sociales proporcionales (factor 21.83%), suprimiendo de raíz cualquier riesgo de demandas laborales millonarias por primacía de la realidad.</p>
            <p><strong>b) Armonización de Divisores (171.2 vs. 240 Horas):</strong> El divisor de 171.2 horas (40h/sem) fija un piso constitucional de $81.820/h bajo Ley 30. Se sustenta técnicamente la conveniencia de elevar el factor base en puntos para evitar brechas litigiosas en las categorías de Auxiliar y Asistente.</p>
            <p><strong>c) Estandarización de 50 Minutos Lectivos y 10 Minutos de Tolerancia:</strong> Se reglamenta que la hora académica corresponde a 50 minutos de docencia directa de aula, con 10 minutos de tolerancia y pago condicionado al Concepto Favorable del Director de Escuela.</p>
            <p><strong>d) Blindaje de Topes Semanales:</strong> Fijar un tope infranqueable de 19 horas semanales para cátedra externa y ratificar el tope de 4 horas semanales para cátedra interna (Art. 2 Acuerdo 015).</p>
            <p><strong>e) Unidad de Caja Temporal (Recurso 10.5 Gratuidad):</strong> Habilitar a Tesorería para apalancar temporalmente la nómina con Recursos Propios ante retrasos en transferencias nacionales de gratuidad, con reintegro automático.</p>
          </div>
        </div>

        {/* 5. FIRMAS DE RESPONSABILIDAD INSTITUCIONAL */}
        <div className="pt-8 border-t-2 border-slate-800 grid grid-cols-3 gap-6 text-center text-[10px]">
          <div className="space-y-6">
            <div className="border-b border-slate-800 pb-1"></div>
            <div>
              <p className="font-bold text-slate-900">DR. VICERRECTOR ADMINISTRATIVO Y FINANCIERO</p>
              <p className="text-slate-600">Vicerrectoría Administrativa y Financiera</p>
              <p className="text-slate-500">UPTC Sede Central Tunja</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="border-b border-slate-800 pb-1"></div>
            <div>
              <p className="font-bold text-slate-900">DRA. DIRECTORA FINANCIERA Y DE PRESUPUESTO</p>
              <p className="text-slate-600">Dirección Financiera / Jefe de Presupuesto</p>
              <p className="text-slate-500">División Administrativa UPTC</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="border-b border-slate-800 pb-1"></div>
            <div>
              <p className="font-bold text-slate-900">DIRECTOR DE PROGRAMA / ESCUELA ACADÉMICA</p>
              <p className="text-slate-600">Comité de Currículo / Consejo de Facultad</p>
              <p className="text-slate-500">Certificación de Horas Efectivas Dictadas</p>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL DE PREVISUALIZACIÓN DEL INFORME TÉCNICO PDF                          */}
      {/* ========================================================================= */}
      {showPdfPreviewModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 md:p-6 overflow-y-auto">
          <div className="relative w-full max-w-5xl bg-surface-container border border-white/20 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Barra Superior del Modal */}
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-black/40">
              <div className="flex items-center gap-2.5">
                <FileText className="text-primary-container" size={20} />
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Vista Previa del Informe Técnico Oficial (PDF)
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Estructura: Considerandos Normativos • Evolución Pagos • Proyección 2027 • Sustento de Reforma
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Printer size={14} />
                  <span>Imprimir</span>
                </button>

                <button
                  onClick={handleDownloadPDF}
                  disabled={isGeneratingPdf}
                  className="px-4 py-1.5 rounded-xl bg-primary-container hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-bold flex items-center gap-2 shadow-lg transition-all cursor-pointer"
                >
                  {isGeneratingPdf ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
                  <span>{isGeneratingPdf ? 'Generando...' : 'Descargar PDF'}</span>
                </button>

                <button
                  onClick={() => setShowPdfPreviewModal(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors ml-2 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Contenido en Hoja Virtual de Papel Blanco */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-900/60">
              <div className="bg-white text-slate-900 rounded-2xl p-8 md:p-12 shadow-2xl max-w-4xl mx-auto border border-slate-300 space-y-6 text-xs font-sans">
                {/* Encabezado */}
                <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 rounded-full bg-amber-500 inline-block"></span>
                      <span className="text-[11px] font-black tracking-widest uppercase text-slate-800">
                        UNIVERSIDAD PEDAGÓGICA Y TECNOLÓGICA DE COLOMBIA
                      </span>
                    </div>
                    <h1 className="text-lg md:text-xl font-black text-slate-900 tracking-tight uppercase">
                      VICERRECTORÍA ADMINISTRATIVA Y FINANCIERA — DIRECCIÓN FINANCIERA
                    </h1>
                    <h2 className="text-xs md:text-sm font-bold text-amber-600 uppercase tracking-wide">
                      INFORME TÉCNICO OFICIAL: NÓMINA TEMPORAL DOCENTE Y LIQUIDACIÓN DE HORAS CÁTEDRA
                    </h2>
                    <p className="text-[11px] text-slate-600">
                      Sustento Constitucional Sentencia C-006-96 • Acuerdo No. 015 de 2009 • Decretos 1279/2002 y 318/2026
                    </p>
                  </div>

                  <div className="text-right text-[11px] text-slate-700 bg-slate-50 border border-slate-300 rounded-xl p-3 min-w-[200px] space-y-1">
                    <div><strong>Radicado:</strong> UPTC-VAFI-HC-2026-015</div>
                    <div><strong>Vigencia Fiscal:</strong> 2026</div>
                    <div><strong>Fecha:</strong> {new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                    <div><strong>Punto D1279:</strong> $ 23.924 COP</div>
                  </div>
                </div>

                {/* 1. Considerandos */}
                <div className="space-y-2">
                  <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider border-b border-slate-300 pb-1">
                    1. Considerandos a Nivel Normativo (Sustento Jurídico Vinculante)
                  </h3>
                  <div className="text-[11px] text-slate-800 space-y-1.5 leading-relaxed text-justify">
                    <p className="font-bold">CONSIDERANDO QUE:</p>
                    <p>• <strong>Art. 53 C.P.:</strong> Principio de primacía de la realidad sobre las formas e irrenunciabilidad de beneficios mínimos laborales.</p>
                    <p>• <strong>Sentencia C-006-96:</strong> Califica a los docentes de cátedra como servidores/trabajadores subordinados con derecho irrenunciable al pago proporcional de todas las prestaciones sociales (vacaciones, primas y cesantías). El pago por honorarios es inconstitucional.</p>
                    <p>• <strong>Art. 128 C.P.:</strong> Prohibición de doble asignación del tesoro público (cátedra interna solo fuera de jornada y sin descarga académica).</p>
                    <p>• <strong>Ley 30 de 1992:</strong> Autonomía universitaria y garantía de no pagar por debajo de la proporción de 8 SMMLV / horas mes.</p>
                    <p>• <strong>Decreto 1279/2002:</strong> Régimen salarial por puntos del Gobierno Nacional ($ 23.924 COP en 2026 según Dcto 318/2026).</p>
                    <p>• <strong>Acuerdo 015 de 2009 UPTC:</strong> Escala de 2.50 a 3.50 puntos/hora y tope de 4 horas semanales para cátedra interna.</p>
                  </div>
                </div>

                {/* 2. Evolución de los Pagos */}
                <div className="space-y-2 pt-2 border-t border-slate-200">
                  <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider border-b border-slate-300 pb-1">
                    2. Evolución Histórica de los Pagos (2024 - 2026)
                  </h3>
                  <p className="text-[11px] text-slate-700">
                    Evolución del punto salarial: 2024 ($20.895) → 2025 ($22.358) → 2026 ($23.924).
                  </p>
                  <table className="w-full text-left text-[11px] border border-slate-300">
                    <thead className="bg-slate-100 font-bold border-b border-slate-300 text-[10px]">
                      <tr>
                        <th className="p-1.5">Categoría</th>
                        <th className="p-1.5 text-center">Puntos</th>
                        <th className="p-1.5 text-right">Tarifa 2024</th>
                        <th className="p-1.5 text-right">Tarifa 2025</th>
                        <th className="p-1.5 text-right">Tarifa 2026</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      <tr>
                        <td className="p-1.5 font-bold">Auxiliar</td>
                        <td className="p-1.5 text-center font-mono">2.50 pts</td>
                        <td className="p-1.5 text-right font-mono">$ 52.238</td>
                        <td className="p-1.5 text-right font-mono">$ 55.895</td>
                        <td className="p-1.5 text-right font-mono font-bold">$ 59.810 / h</td>
                      </tr>
                      <tr>
                        <td className="p-1.5 font-bold">Asistente</td>
                        <td className="p-1.5 text-center font-mono">2.75 pts</td>
                        <td className="p-1.5 text-right font-mono">$ 57.461</td>
                        <td className="p-1.5 text-right font-mono">$ 61.485</td>
                        <td className="p-1.5 text-right font-mono font-bold">$ 65.791 / h</td>
                      </tr>
                      <tr>
                        <td className="p-1.5 font-bold">Asociado</td>
                        <td className="p-1.5 text-center font-mono">3.00 pts</td>
                        <td className="p-1.5 text-right font-mono">$ 62.685</td>
                        <td className="p-1.5 text-right font-mono">$ 67.074</td>
                        <td className="p-1.5 text-right font-mono font-bold">$ 71.772 / h</td>
                      </tr>
                      <tr>
                        <td className="p-1.5 font-bold">Titular</td>
                        <td className="p-1.5 text-center font-mono">3.50 pts</td>
                        <td className="p-1.5 text-right font-mono">$ 73.133</td>
                        <td className="p-1.5 text-right font-mono">$ 78.253</td>
                        <td className="p-1.5 text-right font-mono font-bold">$ 83.734 / h</td>
                      </tr>
                    </tbody>
                  </table>
                  <div className="grid grid-cols-3 gap-2 pt-1 text-[10px]">
                    <div className="p-2 border border-slate-300 rounded bg-slate-50">
                      <span className="text-slate-500 block">Compromiso 2026:</span>
                      <strong>{formatCurrency(totalCompromiso)}</strong>
                    </div>
                    <div className="p-2 border border-slate-300 rounded bg-slate-50">
                      <span className="text-slate-500 block">Pagos a Agosto 2026:</span>
                      <strong className="text-emerald-700">{formatCurrency(totalPagado)} (67.4%)</strong>
                    </div>
                    <div className="p-2 border border-slate-300 rounded bg-slate-50">
                      <span className="text-slate-500 block">Saldo por Ejecutar:</span>
                      <strong className="text-blue-700">{formatCurrency(saldoPorEjecutar)}</strong>
                    </div>
                  </div>
                </div>

                {/* 3. Proyección 2027 */}
                <div className="space-y-2 pt-2 border-t border-slate-200">
                  <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider border-b border-slate-300 pb-1">
                    3. Proyección de Valores para el 2027 (+4.0% IPC Proyectado)
                  </h3>
                  <p className="text-[11px] text-slate-700">
                    Valor estimado del punto salarial: <strong>$ 24.881 COP</strong>. Presupuesto institucional proyectado: <strong>$ 18.152,2 M</strong>.
                  </p>
                  <table className="w-full text-left text-[11px] border border-slate-300">
                    <thead className="bg-slate-100 font-bold border-b border-slate-300 text-[10px]">
                      <tr>
                        <th className="p-1.5">Categoría</th>
                        <th className="p-1.5 text-center">Puntos</th>
                        <th className="p-1.5 text-right">Tarifa Proyectada 2027</th>
                        <th className="p-1.5 text-right">Contrato 64h con Prestaciones C-006-96 (+21.83%)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      <tr>
                        <td className="p-1.5">Auxiliar</td>
                        <td className="p-1.5 text-center font-mono">2.50 pts</td>
                        <td className="p-1.5 text-right font-mono font-bold">$ 62.203 / h</td>
                        <td className="p-1.5 text-right font-mono font-bold text-slate-900">$ 4.850.043</td>
                      </tr>
                      <tr>
                        <td className="p-1.5">Asistente</td>
                        <td className="p-1.5 text-center font-mono">2.75 pts</td>
                        <td className="p-1.5 text-right font-mono font-bold">$ 68.423 / h</td>
                        <td className="p-1.5 text-right font-mono font-bold text-slate-900">$ 5.335.023</td>
                      </tr>
                      <tr>
                        <td className="p-1.5">Asociado</td>
                        <td className="p-1.5 text-center font-mono">3.00 pts</td>
                        <td className="p-1.5 text-right font-mono font-bold">$ 74.643 / h</td>
                        <td className="p-1.5 text-right font-mono font-bold text-slate-900">$ 5.820.004</td>
                      </tr>
                      <tr>
                        <td className="p-1.5">Titular</td>
                        <td className="p-1.5 text-center font-mono">3.50 pts</td>
                        <td className="p-1.5 text-right font-mono font-bold">$ 87.084 / h</td>
                        <td className="p-1.5 text-right font-mono font-bold text-slate-900">$ 6.790.044</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* 4. Sustento Técnico de Modificación */}
                <div className="space-y-2 pt-2 border-t border-slate-200">
                  <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider border-b border-slate-300 pb-1">
                    4. Sustento Técnico para una Modificación del Modelo
                  </h3>
                  <div className="text-[11px] text-slate-800 space-y-1 leading-relaxed text-justify">
                    <p>• <strong>Provisión Prestacional Explícita:</strong> Incorporar en el valor contratado la proporción de cesantías, primas y vacaciones (alícuota del 21.83%) para cerrar definitivamente la exposición a demandas laborales multimillonarias.</p>
                    <p>• <strong>Armonización de Divisores:</strong> Ajustar los puntos en categorías de Auxiliar y Asistente para asegurar que no queden por debajo del piso de 171.2 horas (jornada 40h/sem de $81.820/h con 8 SMMLV).</p>
                    <p>• <strong>Hora Académica de 50 Minutos:</strong> Reglamentar la duración de 50 minutos de docencia directa de aula y 10 minutos de tolerancia, condicionado a Concepto Favorable del Director de Escuela.</p>
                    <p>• <strong>Límites y Unidad de Caja:</strong> Tope de 19h para cátedra externa, tope de 4h para cátedra interna, y unidad de caja temporal para proteger la nómina frente a desfases en transferencias de Gratuidad (R10.5).</p>
                  </div>
                </div>

                {/* Firmas */}
                <div className="pt-6 border-t-2 border-slate-800 grid grid-cols-3 gap-4 text-center text-[9px]">
                  <div>
                    <div className="border-b border-slate-800 pb-1 mb-1"></div>
                    <p className="font-bold text-slate-900">VICERRECTOR ADMINISTRATIVO</p>
                    <p className="text-slate-600">UPTC Tunja</p>
                  </div>
                  <div>
                    <div className="border-b border-slate-800 pb-1 mb-1"></div>
                    <p className="font-bold text-slate-900">DIRECTORA FINANCIERA</p>
                    <p className="text-slate-600">Dirección de Presupuesto</p>
                  </div>
                  <div>
                    <div className="border-b border-slate-800 pb-1 mb-1"></div>
                    <p className="font-bold text-slate-900">DIRECTOR DE ESCUELA</p>
                    <p className="text-slate-600">Concepto Favorable Asistencia</p>
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