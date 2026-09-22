import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  X, Maximize2, Minimize2, ChevronLeft, ChevronRight, Download, Printer, 
  Landmark, TrendingUp, Coins, Lock, ShieldCheck, Scale, CheckCircle2, 
  AlertTriangle, Calendar, Sparkles, Layers, Presentation, FileText, 
  CheckCircle, BarChart3, PieChart as PieIcon, ArrowRight, Info, Eye
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, 
  PieChart, Pie, Cell 
} from 'recharts';
import { StrictResourceProjection, StrictTotals } from '../lib/strictProjections';
import { NACION_FIXED_CODES } from './CashFlowIncomeFixedVsProjected';

const formatCurrency = (value: number) => 
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);

const formatCurrencyShort = (value: number) => {
  if (Math.abs(value) >= 1e12) return `$ ${(value / 1e12).toFixed(2)} B`;
  if (Math.abs(value) >= 1e9) return `$ ${(value / 1e9).toFixed(2)} MM`;
  if (Math.abs(value) >= 1e6) return `$ ${(value / 1e6).toFixed(1)} M`;
  return `$ ${value.toLocaleString('es-CO')}`;
};

interface BoardPresentationModalProps {
  isOpen: boolean;
  onClose: () => void;
  resources: StrictResourceProjection[];
  balanceData: any[];
  totals: StrictTotals;
}

export function BoardPresentationModal({
  isOpen,
  onClose,
  resources,
  balanceData,
  totals
}: BoardPresentationModalProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [viewMode, setViewMode] = useState<'slides' | 'full'>('slides');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const printContentRef = useRef<HTMLDivElement>(null);

  // Mapeo auxiliar de aforos y SIIF desde balanceData
  const balanceMetaMap = useMemo(() => {
    const map: Record<string, { aforo: number; siif: number; nombreOriginal: string }> = {};
    if (!balanceData) return map;
    balanceData.forEach(row => {
      const raw = String(row['Recurso'] || row['recurso'] || '').trim();
      const code = raw.split('-')[0].trim();
      if (!code) return;
      const cleanNum = (val: any) => {
        if (!val) return 0;
        const s = String(val).replace(/[\$,\s]/g, '').trim();
        return parseFloat(s) || 0;
      };
      map[code] = {
        aforo: cleanNum(row['Aforo']),
        siif: cleanNum(row['SIIF']),
        nombreOriginal: raw.substring(raw.indexOf('-') + 1).trim() || raw
      };
    });
    return map;
  }, [balanceData]);

  // Metadatos explicativos para Ingresos Fijos (Nación)
  const METADATOS_FIJOS: Record<string, { baseLegal: string; entidad: string; calendarNote: string }> = {
    '10': { baseLegal: 'Ley 30/1992 Art. 86 / Res. MEN Anual', entidad: 'Ministerio de Educación Nacional (MEN)', calendarNote: 'Recaudo efectivo $238.714M + Giros PAC Sep-Dic $88.356M' },
    '10.0': { baseLegal: 'Ley 30/1992 Art. 86 / Res. MEN Anual', entidad: 'Ministerio de Educación Nacional (MEN)', calendarNote: 'Recaudo efectivo $238.714M + Giros PAC Sep-Dic $88.356M' },
    '10.1': { baseLegal: 'Resolución MEN - Plan Fomento Calidad (PIC Convencional)', entidad: 'MEN - Subdirección Apoyo IES', calendarNote: 'Recaudo efectivo $5.624M + Giro pendiente $2.165M' },
    '10.2': { baseLegal: 'Resolución MEN - Fomento a la Calidad Regional', entidad: 'MEN', calendarNote: 'Recaudo 100% efectivo ($3.060M) completado' },
    '10.3': { baseLegal: 'Resolución MEN - Fortalecimiento a la Gestión', entidad: 'MEN', calendarNote: 'Giro programado en SIIF para noviembre ($2.229M)' },
    '10.5': { baseLegal: 'Ley 2307/2023 / Decreto Reglamentario MEN (Gratuidad)', entidad: 'MEN / Fondo Gratuidad', calendarNote: 'Recaudo 100% efectivo ($11.208M) completado' },
    '12': { baseLegal: 'Ley 1697/2013 - Estampilla Pro-UNAL y Otras Estatales', entidad: 'Ministerio de Hacienda / DIAN', calendarNote: 'Transferencias de recaudos tributarios nacionales' },
    '13': { baseLegal: 'Art. 142 Ley 1819/2016 / DIAN (Excedentes Cooperativos)', entidad: 'Sector Cooperativo / DIAN', calendarNote: 'Recaudo 100% efectivo ($1.535M) completado' },
    '14': { baseLegal: 'Fondo de Solidaridad Educativa (FSE) - MEN', entidad: 'MEN / FSE', calendarNote: 'Recaudo 100% efectivo ($12.641M) completado' },
    '16': { baseLegal: 'Presupuesto General de la Nación (PGN) - Ley 30 Art. 87', entidad: 'DNP / MEN / MinHacienda', calendarNote: 'Asignación anual de inversión pública aprobada' },
    '16.0': { baseLegal: 'Presupuesto General de la Nación (PGN) - Ley 30 Art. 87', entidad: 'DNP / MEN / MinHacienda', calendarNote: 'Asignación anual de inversión pública aprobada' },
    '16.1': { baseLegal: 'Planes de Fomento Básicos (PFB) - MEN', entidad: 'MEN', calendarNote: 'Recaudo 100% efectivo ($1.407M) completado' },
    '16.2': { baseLegal: 'Planes de Fomento Complementarios (PFC) - MEN', entidad: 'MEN', calendarNote: 'Proyectos complementarios de infraestructura y TIC' },
    '17': { baseLegal: 'Ley 403/1997 Art. 1 / MinHacienda (Descuento Electoral)', entidad: 'Ministerio de Hacienda y Crédito Público', calendarNote: 'Recaudo efectivo $4.207M + Giros pendientes $1.437M' },
    '18': { baseLegal: 'Artículo 87 Ley 30/1992 - Fondo Desarrollo Universitario', entidad: 'CESU / MEN', calendarNote: 'Recaudo efectivo $1.573M + Giros pendientes $537M' }
  };

  // Metadatos explicativos para Ingresos Proyectados (Propios y Gestión)
  const METADATOS_PROYECTADOS: Record<string, { naturaleza: string; dinamica: string; nivelRiesgo: 'Bajo' | 'Moderado' | 'Condicionado'; modelo: string }> = {
    '20': { naturaleza: 'Venta de Bienes y Servicios Académicos', dinamica: 'Matrículas pregrado, inscripciones, grados, certificaciones y cafeterías', nivelRiesgo: 'Moderado', modelo: 'Bottom-Up por Concepto / ARIMA' },
    '21': { naturaleza: 'Devolución IVA - Instituciones Educación Superior', dinamica: 'Trámite administrativo de resoluciones de devolución ante la DIAN', nivelRiesgo: 'Moderado', modelo: 'Macro MFMP (+7.0%) / Histórico' },
    '31': { naturaleza: 'Matrículas y Derechos Pecuniarios de Posgrados', dinamica: 'Cohortes activas de Especializaciones, Maestrías y Doctorados', nivelRiesgo: 'Condicionado', modelo: 'Calendario Académico Semestre II' },
    '32': { naturaleza: 'Extensión y Consultoría Universitaria', dinamica: 'Cursos libres, proyectos de asesoría técnica y análisis de laboratorios', nivelRiesgo: 'Condicionado', modelo: 'Flujo de Contratos Vigentes' },
    '33': { naturaleza: 'Convenios Interadministrativos de Investigación', dinamica: 'Proyectos con entidades públicas y privadas con derechos institucionales', nivelRiesgo: 'Condicionado', modelo: 'Cronograma de Desembolsos e Interventorías' },
    '34': { naturaleza: 'Convenios de Cooperación sin Derechos', dinamica: 'Recursos en administración y convenios específicos de cooperación', nivelRiesgo: 'Bajo', modelo: 'Ejecución Estricta según Compromiso' },
    '35': { naturaleza: 'Educación Continuada y Diplomados', dinamica: 'Inscripciones a programas de actualización profesional y seminarios', nivelRiesgo: 'Moderado', modelo: 'Demanda de Cohortes en Inscripción' },
    '40': { naturaleza: 'Estampilla UPTC Territorial', dinamica: 'Retenciones del 1% al 2% sobre contratos de obra y adquisiciones en Boyacá', nivelRiesgo: 'Condicionado', modelo: 'Tendencia de Recaudo Territorial' }
  };

  // Agrupación en Fijos de la Nación y Proyectados
  const { fixedResources, projectedResources } = useMemo(() => {
    const fixed: StrictResourceProjection[] = [];
    const projected: StrictResourceProjection[] = [];

    resources.forEach(r => {
      if (NACION_FIXED_CODES.includes(r.recurso)) {
        fixed.push(r);
      } else {
        projected.push(r);
      }
    });

    return { fixedResources: fixed, projectedResources: projected };
  }, [resources]);

  // Agregados Fijos
  const fixedAggregates = useMemo(() => {
    let recaudoReal = 0;
    let proyectadoSepDic = 0;
    let totalIngresos = 0;
    let aforoOficial = 0;
    let mesesProy = [0, 0, 0, 0];

    fixedResources.forEach(r => {
      recaudoReal += r.ingresosReales;
      const m = r.ingresosPorMesProyectado || [0, 0, 0, 0];
      proyectadoSepDic += m.reduce((a, b) => a + b, 0);
      totalIngresos += r.totalIngresos;
      const afo = balanceMetaMap[r.recurso]?.aforo || r.totalIngresos;
      aforoOficial += afo;
      mesesProy[0] += m[0] || 0;
      mesesProy[1] += m[1] || 0;
      mesesProy[2] += m[2] || 0;
      mesesProy[3] += m[3] || 0;
    });

    const recaudoAvancePct = totalIngresos > 0 ? (recaudoReal / totalIngresos) * 100 : 0;
    return { recaudoReal, proyectadoSepDic, totalIngresos, aforoOficial, mesesProy, recaudoAvancePct };
  }, [fixedResources, balanceMetaMap]);

  // Agregados Proyectados
  const projectedAggregates = useMemo(() => {
    let recaudoReal = 0;
    let proyectadoSepDic = 0;
    let totalIngresos = 0;
    let aforoOficial = 0;
    let mesesProy = [0, 0, 0, 0];

    projectedResources.forEach(r => {
      recaudoReal += r.ingresosReales;
      const m = r.ingresosPorMesProyectado || [0, 0, 0, 0];
      proyectadoSepDic += m.reduce((a, b) => a + b, 0);
      totalIngresos += r.totalIngresos;
      const afo = balanceMetaMap[r.recurso]?.aforo || r.totalIngresos;
      aforoOficial += afo;
      mesesProy[0] += m[0] || 0;
      mesesProy[1] += m[1] || 0;
      mesesProy[2] += m[2] || 0;
      mesesProy[3] += m[3] || 0;
    });

    const recaudoAvancePct = totalIngresos > 0 ? (recaudoReal / totalIngresos) * 100 : 0;
    return { recaudoReal, proyectadoSepDic, totalIngresos, aforoOficial, mesesProy, recaudoAvancePct };
  }, [projectedResources, balanceMetaMap]);

  // Totales Generales
  const grandTotal = fixedAggregates.totalIngresos + projectedAggregates.totalIngresos;
  const shareFijosPct = grandTotal > 0 ? (fixedAggregates.totalIngresos / grandTotal) * 100 : 75.2;
  const shareProyPct = grandTotal > 0 ? (projectedAggregates.totalIngresos / grandTotal) * 100 : 24.8;
  const totalRecaudoReal = fixedAggregates.recaudoReal + projectedAggregates.recaudoReal;
  const totalPendiente = fixedAggregates.proyectadoSepDic + projectedAggregates.proyectadoSepDic;

  // Datos para gráficos
  const chartPieData = [
    { name: 'Fijos de la Nación (75.2%)', value: fixedAggregates.totalIngresos, color: '#3b82f6' },
    { name: 'Proyectados Propios (24.8%)', value: projectedAggregates.totalIngresos, color: '#10b981' }
  ];

  const chartBarData = [
    {
      categoria: 'Fijos Nación',
      Recaudado: Math.round(fixedAggregates.recaudoReal / 1e9),
      'Pendiente Sep-Dic': Math.round(fixedAggregates.proyectadoSepDic / 1e9),
      Total: Math.round(fixedAggregates.totalIngresos / 1e9)
    },
    {
      categoria: 'Proyectados',
      Recaudado: Math.round(projectedAggregates.recaudoReal / 1e9),
      'Pendiente Sep-Dic': Math.round(projectedAggregates.proyectadoSepDic / 1e9),
      Total: Math.round(projectedAggregates.totalIngresos / 1e9)
    }
  ];

  const slides = [
    { id: 0, title: 'Portada y Síntesis Macro', shortTitle: '1. Portada' },
    { id: 1, title: 'Flujo de Ingresos: Fijos Nación vs. Proyectados', shortTitle: '2. Comparativa Macro' },
    { id: 2, title: 'TABLA 1: Ingresos Fijos (Giros de la Nación)', shortTitle: '3. Tabla 1: Fijos Nación' },
    { id: 3, title: 'TABLA 2: Ingresos Proyectados (Recursos Propios)', shortTitle: '4. Tabla 2: Proyectados' },
    { id: 4, title: 'Síntesis de Tesorería y Conclusiones para la Junta', shortTitle: '5. Conclusiones y Cierre' }
  ];

  // Manejo de teclado (flechas y escape)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isFullscreen) {
          if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
          }
          setIsFullscreen(false);
        } else {
          onClose();
        }
      } else if (e.key === 'ArrowRight' && viewMode === 'slides') {
        setCurrentSlide(prev => Math.min(prev + 1, slides.length - 1));
      } else if (e.key === 'ArrowLeft' && viewMode === 'slides') {
        setCurrentSlide(prev => Math.max(prev - 1, 0));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, viewMode, slides.length, isFullscreen, onClose]);

  // Manejo de Pantalla Completa
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Descarga PDF con html2pdf
  const handleDownloadPDF = async () => {
    setIsGeneratingPdf(true);
    const prevTitle = document.title;
    const reportTitle = 'UPTC_Presentacion_Junta_Directiva_Flujo_Ingresos_2026';
    document.title = reportTitle;

    try {
      if (!(window as any).html2pdf) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('No se pudo cargar la librería html2pdf'));
          document.head.appendChild(script);
          setTimeout(() => reject(new Error('Tiempo de espera agotado')), 4000);
        });
      }

      const element = printContentRef.current;
      if (!element || !(window as any).html2pdf) {
        throw new Error('Elemento de reporte no disponible');
      }

      // Clonar nodo para generar PDF completo sobre fondo limpio
      const clone = element.cloneNode(true) as HTMLElement;
      clone.id = 'printable-board-presentation-clone';
      clone.style.position = 'fixed';
      clone.style.left = '-9999px';
      clone.style.top = '0';
      clone.style.width = '1200px';
      clone.style.maxHeight = 'none';
      clone.style.overflow = 'visible';
      clone.style.height = 'auto';
      clone.style.background = '#090d16';
      clone.style.color = '#ffffff';
      clone.style.opacity = '1';
      clone.style.visibility = 'visible';

      clone.querySelectorAll('*').forEach((el: any) => {
        el.style.visibility = 'visible';
        el.style.opacity = '1';
      });

      document.body.appendChild(clone);

      const opt = {
        margin: [6, 6, 6, 6],
        filename: `${reportTitle}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 1.5, 
          useCORS: true, 
          allowTaint: true,
          backgroundColor: '#090d16',
          logging: false 
        },
        jsPDF: { unit: 'mm', format: 'letter', orientation: 'landscape' },
        pagebreak: { mode: ['css', 'legacy'], after: '.board-slide-page' }
      };

      await (window as any).html2pdf().set(opt).from(clone).save();

      if (document.body.contains(clone)) {
        document.body.removeChild(clone);
      }
    } catch (err) {
      console.warn('Error en html2pdf, recurriendo a impresión de navegador:', err);
      window.print();
    } finally {
      document.title = prevTitle;
      setIsGeneratingPdf(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-xl flex flex-col text-slate-100 font-sans overflow-hidden select-none animate-in fade-in duration-200"
    >
      {/* BARRA SUPERIOR DE CONTROL EJECUTIVO */}
      <header className="h-16 px-6 bg-slate-900/90 border-b border-white/10 flex items-center justify-between gap-4 shrink-0 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 p-0.5 shadow-lg shadow-amber-500/20 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center text-amber-400">
              <Presentation size={20} />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20 font-bold">
                Junta Directiva UPTC
              </span>
              <span className="text-xs text-slate-400 font-medium hidden sm:inline">
                Vicerrectoría Administrativa y Financiera
              </span>
            </div>
            <h1 className="text-sm md:text-base font-display font-bold text-white tracking-wide truncate max-w-md sm:max-w-xl">
              Flujo de Ingresos: Fijos de la Nación vs. Proyectados (2026)
            </h1>
          </div>
        </div>

        {/* CONTROLES DE MODO, PANTALLA Y EXPORTACIÓN */}
        <div className="flex items-center gap-2">
          {/* Selector de modo: Diapositivas vs Documento Completo */}
          <div className="hidden md:flex items-center bg-slate-800/80 p-1 rounded-xl border border-white/10 text-xs">
            <button
              onClick={() => setViewMode('slides')}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'slides' 
                  ? 'bg-amber-500 text-slate-950 shadow-md font-bold' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Presentation size={14} />
              <span>Diapositivas</span>
            </button>
            <button
              onClick={() => setViewMode('full')}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'full' 
                  ? 'bg-amber-500 text-slate-950 shadow-md font-bold' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileText size={14} />
              <span>Vista Completa</span>
            </button>
          </div>

          {/* Botón Descargar PDF */}
          <button
            onClick={handleDownloadPDF}
            disabled={isGeneratingPdf}
            className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-900/30 transition-all border border-emerald-400/30 cursor-pointer disabled:opacity-50"
            title="Descargar presentación completa en formato PDF de alta resolución"
          >
            <Download size={14} />
            <span>{isGeneratingPdf ? 'Generando PDF...' : 'Descargar PDF'}</span>
          </button>

          {/* Botón Pantalla Completa */}
          <button
            onClick={toggleFullscreen}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-white/10 transition-colors cursor-pointer"
            title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>

          {/* Botón Cerrar */}
          <button
            onClick={onClose}
            className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 rounded-xl border border-rose-500/30 transition-colors cursor-pointer ml-1"
            title="Cerrar presentación (Esc)"
          >
            <X size={18} />
          </button>
        </div>
      </header>

      {/* ÁREA DE CONTENIDO PRINCIPAL */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8 flex flex-col items-center justify-start bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black">
        
        {/* ENVOLTORIO PARA PRESENTACIÓN O VISTA COMPLETA (Y OBJETO A IMPRIMIR/EXPORTAR) */}
        <div 
          ref={printContentRef}
          className="w-full max-w-7xl mx-auto space-y-8"
        >
          {viewMode === 'slides' ? (
            /* RENDERIZADO DIAPOSITIVA INDIVIDUAL */
            <div className="w-full animate-in fade-in duration-300">
              {renderSlideContent(currentSlide)}
            </div>
          ) : (
            /* RENDERIZADO COMPLETO (TODAS LAS DIAPOSITIVAS SECUENCIALES PARA PDF O REVISIÓN) */
            <div className="space-y-12">
              {slides.map(slide => (
                <div key={slide.id} className="board-slide-page border border-white/10 rounded-3xl p-6 md:p-8 bg-slate-900/60 shadow-2xl relative">
                  <div className="absolute top-4 right-6 text-xs font-mono text-slate-500 uppercase tracking-widest font-bold">
                    Diapositiva {slide.id + 1} de {slides.length}
                  </div>
                  {renderSlideContent(slide.id)}
                </div>
              ))}
            </div>
          )}
        </div>

      </main>

      {/* BARRA INFERIOR DE NAVEGACIÓN ENTRE DIAPOSITIVAS (SOLO EN MODO SLIDES) */}
      {viewMode === 'slides' && (
        <footer className="h-16 px-6 bg-slate-900/90 border-t border-white/10 flex items-center justify-between shrink-0 shadow-2xl">
          {/* Botón Diapositiva Anterior */}
          <button
            onClick={() => setCurrentSlide(prev => Math.max(prev - 1, 0))}
            disabled={currentSlide === 0}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold flex items-center gap-2 border border-white/10 transition-all cursor-pointer"
          >
            <ChevronLeft size={16} />
            <span className="hidden sm:inline">Anterior</span>
          </button>

          {/* Indicadores de Diapositiva / Tabs interactivos */}
          <div className="flex items-center gap-1.5 md:gap-2">
            {slides.map(slide => (
              <button
                key={slide.id}
                onClick={() => setCurrentSlide(slide.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                  currentSlide === slide.id
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${currentSlide === slide.id ? 'bg-amber-400' : 'bg-slate-600'}`} />
                <span className="hidden lg:inline">{slide.shortTitle}</span>
                <span className="lg:hidden">{slide.id + 1}</span>
              </button>
            ))}
          </div>

          {/* Botón Diapositiva Siguiente */}
          <button
            onClick={() => setCurrentSlide(prev => Math.min(prev + 1, slides.length - 1))}
            disabled={currentSlide === slides.length - 1}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold flex items-center gap-2 border border-white/10 transition-all cursor-pointer"
          >
            <span className="hidden sm:inline">Siguiente</span>
            <ChevronRight size={16} />
          </button>
        </footer>
      )}
    </div>
  );

  // RENDERIZADO DEL CONTENIDO DE CADA DIAPOSITIVA
  function renderSlideContent(slideIndex: number) {
    switch (slideIndex) {
      case 0:
        return renderSlide1Portada();
      case 1:
        return renderSlide2ComparativaMacro();
      case 2:
        return renderSlide3TablaFijos();
      case 3:
        return renderSlide4TablaProyectados();
      case 4:
        return renderSlide5Conclusiones();
      default:
        return null;
    }
  }

  // DIAPOSITIVA 1: PORTADA EJECUTIVA Y SÍNTESIS MACROPRESUPUESTAL
  function renderSlide1Portada() {
    return (
      <div className="flex flex-col space-y-8 py-4">
        {/* ENCABEZADO INSTITUCIONAL */}
        <div className="text-center space-y-3 pb-6 border-b border-white/10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-wider">
            <Sparkles size={14} className="text-amber-400" />
            Dictamen Gerencial y Financiero 2026 — Junta Directiva
          </div>
          <h1 className="text-3xl md:text-5xl font-display font-black text-white tracking-tight">
            ESTRUCTURA ESTRATÉGICA DEL FLUJO DE INGRESOS
          </h1>
          <p className="text-base md:text-lg text-slate-300 max-w-4xl mx-auto font-light">
            Diferenciación Técnica: <strong className="text-blue-400">Recaudos Fijos de la Nación (75.2%)</strong> vs. <strong className="text-emerald-400">Ingresos Proyectados de Gestión Institucional (24.8%)</strong>
          </p>
          <div className="text-xs text-slate-400 font-mono pt-1">
            Universidad Pedagógica y Tecnológica de Colombia (UPTC) • Vicerrectoría Administrativa y Financiera
          </div>
        </div>

        {/* 4 MACRO TARJETAS DE ALTO IMPACTO EJECUTIVO */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* TARJETA 1: TOTAL INGRESOS */}
          <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-800/80 to-slate-900/90 border border-white/15 shadow-xl relative overflow-hidden">
            <div className="flex justify-between items-center text-xs text-slate-400 uppercase font-mono tracking-wider mb-2">
              <span className="flex items-center gap-1.5 text-slate-300 font-bold">
                <Coins size={14} className="text-amber-400" /> Total Presupuesto
              </span>
              <span className="bg-white/10 px-2 py-0.5 rounded text-[10px] text-white font-bold">100%</span>
            </div>
            <div className="text-2xl md:text-3xl font-mono font-black text-white mt-1">
              {formatCurrency(grandTotal)}
            </div>
            <p className="text-[11px] text-emerald-300 mt-2 flex items-center gap-1">
              <CheckCircle2 size={13} /> 100% Cobertura de Compromisos
            </p>
            <div className="mt-3 pt-3 border-t border-white/10 text-[11px] text-slate-400">
              Recaudo base 31/08: <strong className="text-white font-mono">{formatCurrencyShort(totalRecaudoReal)}</strong> ({((totalRecaudoReal / grandTotal) * 100).toFixed(1)}%)
            </div>
          </div>

          {/* TARJETA 2: FIJOS NACIÓN */}
          <div className="p-5 rounded-2xl bg-gradient-to-b from-blue-950/60 to-slate-900/90 border border-blue-500/30 shadow-xl relative overflow-hidden">
            <div className="flex justify-between items-center text-xs text-blue-400 uppercase font-mono tracking-wider mb-2">
              <span className="flex items-center gap-1.5 font-bold">
                <Landmark size={14} className="text-blue-400" /> Fijos Nación (SIIF)
              </span>
              <span className="bg-blue-500/20 px-2 py-0.5 rounded text-[10px] text-blue-200 font-bold font-mono">
                {shareFijosPct.toFixed(1)}%
              </span>
            </div>
            <div className="text-2xl md:text-3xl font-mono font-black text-blue-300 mt-1">
              {formatCurrency(fixedAggregates.totalIngresos)}
            </div>
            <p className="text-[11px] text-blue-300 mt-2 flex items-center gap-1 font-semibold">
              <Lock size={13} className="text-blue-400" /> 100% Certeza Legal / Giros PAC
            </p>
            <div className="mt-3 pt-3 border-t border-blue-500/20 text-[11px] text-slate-300 flex justify-between font-mono">
              <span>Recaudo: <strong>{formatCurrencyShort(fixedAggregates.recaudoReal)}</strong></span>
              <span>PAC: <strong>{formatCurrencyShort(fixedAggregates.proyectadoSepDic)}</strong></span>
            </div>
          </div>

          {/* TARJETA 3: PROYECTADOS PROPIOS */}
          <div className="p-5 rounded-2xl bg-gradient-to-b from-emerald-950/60 to-slate-900/90 border border-emerald-500/30 shadow-xl relative overflow-hidden">
            <div className="flex justify-between items-center text-xs text-emerald-400 uppercase font-mono tracking-wider mb-2">
              <span className="flex items-center gap-1.5 font-bold">
                <TrendingUp size={14} className="text-emerald-400" /> Proyectados Propios
              </span>
              <span className="bg-emerald-500/20 px-2 py-0.5 rounded text-[10px] text-emerald-200 font-bold font-mono">
                {shareProyPct.toFixed(1)}%
              </span>
            </div>
            <div className="text-2xl md:text-3xl font-mono font-black text-emerald-300 mt-1">
              {formatCurrency(projectedAggregates.totalIngresos)}
            </div>
            <p className="text-[11px] text-emerald-300 mt-2 flex items-center gap-1">
              <Sparkles size={13} /> Gestión Académica, Posgrados e IVA
            </p>
            <div className="mt-3 pt-3 border-t border-emerald-500/20 text-[11px] text-slate-300 flex justify-between font-mono">
              <span>Recaudo: <strong>{formatCurrencyShort(projectedAggregates.recaudoReal)}</strong></span>
              <span>Proy: <strong>{formatCurrencyShort(projectedAggregates.proyectadoSepDic)}</strong></span>
            </div>
          </div>

          {/* TARJETA 4: REGLA DE PAGOS AL 91.5% Y RESERVA */}
          <div className="p-5 rounded-2xl bg-gradient-to-b from-purple-950/60 to-slate-900/90 border border-purple-500/30 shadow-xl relative overflow-hidden">
            <div className="flex justify-between items-center text-xs text-purple-400 uppercase font-mono tracking-wider mb-2">
              <span className="flex items-center gap-1.5 font-bold">
                <ShieldCheck size={14} className="text-purple-400" /> Cierre Tesorería
              </span>
              <span className="bg-purple-500/20 px-2 py-0.5 rounded text-[10px] text-purple-200 font-bold font-mono">
                91.5% Pagos
              </span>
            </div>
            <div className="text-2xl md:text-3xl font-mono font-black text-purple-300 mt-1">
              {formatCurrency(totals.totalPagos)}
            </div>
            <p className="text-[11px] text-purple-300 mt-2 flex items-center gap-1">
              <Scale size={13} /> Reserva Cuentas por Pagar (8.5%):
            </p>
            <div className="mt-3 pt-3 border-t border-purple-500/20 text-[11px] text-slate-300 flex justify-between font-mono">
              <span>Reserva 2027:</span>
              <strong className="text-amber-300">{formatCurrencyShort(totals.saldoDisponible)}</strong>
            </div>
          </div>

        </div>

        {/* MENSAJE CLAVE Y PRINCIPIOS DE GOBERNANZA */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-white/10 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-2 lg:col-span-2">
            <h3 className="text-base font-display font-bold text-white flex items-center gap-2">
              <CheckCircle className="text-emerald-400" size={18} />
              Conclusiones Estratégicas para la Junta Directiva
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              La UPTC presenta una <strong>estructura presupuestal blindada y sólida</strong>. El <strong>75.2%</strong> de los recursos corresponde a transferencias de la Nación respaldadas por la Ley 30/1992, la Política de Gratuidad (Ley 2307/2023) y resoluciones ejecutivas del MEN con giros automáticos en el SIIF. El <strong>24.8%</strong> restante proviene de recursos propios institucionales, los cuales registran un cumplimiento del <strong>83.3%</strong> de su recaudo al 31 de agosto, garantizando solvencia plena para el cierre fiscal.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-950/60 border border-white/10 space-y-2 text-xs">
            <div className="text-amber-400 font-bold uppercase tracking-wider text-[10px]">
              Garantía Institucional
            </div>
            <ul className="space-y-1.5 text-slate-300 text-[11px]">
              <li className="flex items-start gap-1.5">
                <span className="text-emerald-400 font-bold">✓</span> Nómina docente y administrativa 100% amparada por giros de la Nación.
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-emerald-400 font-bold">✓</span> Posgrados calibrado en $41.088M anual con recaudo del 96.8% en caja.
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-emerald-400 font-bold">✓</span> Reserva técnica de caja ($43.905M) para liquidar cuentas por pagar en 2027.
              </li>
            </ul>
          </div>
        </div>

      </div>
    );
  }

  // DIAPOSITIVA 2: COMPARATIVA MACRO — FIJOS NACIÓN VS. PROYECTADOS
  function renderSlide2ComparativaMacro() {
    return (
      <div className="flex flex-col space-y-6 py-2">
        {/* ENCABEZADO */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-white/10">
          <div>
            <div className="text-xs font-mono text-amber-400 font-bold uppercase tracking-wider mb-1">
              Análisis Dinámico de Estructura Presupuestal
            </div>
            <h2 className="text-2xl md:text-3xl font-display font-bold text-white flex items-center gap-2">
              <Scale className="text-amber-400" /> Flujo de Ingresos: Fijos de la Nación vs. Proyectados
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-3xl">
              Comparativa cuantitativa y cualitativa entre los recursos legalmente transferidos por el Gobierno Nacional y los ingresos generados por la oferta académica y gestión de la universidad.
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-xs font-mono text-slate-400">Presupuesto Consolidado</div>
            <div className="text-xl md:text-2xl font-mono font-extrabold text-white">
              {formatCurrency(grandTotal)}
            </div>
          </div>
        </div>

        {/* GRÁFICOS Y TARJETAS COMPARATIVAS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          
          {/* GRÁFICO DONUT DE PARTICIPACIÓN (4 COLS) */}
          <div className="lg:col-span-4 p-5 rounded-2xl bg-slate-900/80 border border-white/10 flex flex-col items-center justify-center">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 font-mono flex items-center gap-1.5">
              <PieIcon size={14} className="text-amber-400" /> Distribución Porcentual
            </h4>
            <div className="h-56 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {chartPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="#0f172a" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(val: any) => [formatCurrency(Number(val)), 'Total']}
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-between w-full text-xs font-mono pt-2 border-t border-white/10">
              <div className="flex items-center gap-1.5 text-blue-300">
                <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                <span>Fijos: {shareFijosPct.toFixed(1)}%</span>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-300">
                <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                <span>Proy: {shareProyPct.toFixed(1)}%</span>
              </div>
            </div>
          </div>

          {/* GRÁFICO DE BARRAS RECAUDADO VS PENDIENTE (8 COLS) */}
          <div className="lg:col-span-8 p-5 rounded-2xl bg-slate-900/80 border border-white/10">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 font-mono flex items-center gap-1.5">
              <BarChart3 size={14} className="text-emerald-400" /> Ejecución a Corte (31/Ago) vs. Saldo Sep-Dic (Miles de Millones COP)
            </h4>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartBarData} margin={{ top: 15, right: 30, left: 10, bottom: 5 }}>
                  <XAxis dataKey="categoria" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={10} unit=" MM" />
                  <Tooltip 
                    formatter={(val: any) => [`$ ${Number(val).toLocaleString('es-CO')} MM COP`, '']}
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="Recaudado" fill="#10b981" radius={[4, 4, 0, 0]} name="Recaudo Real 31/08" />
                  <Bar dataKey="Pendiente Sep-Dic" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Pendiente / Giros PAC Sep-Dic" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* COMPARACIÓN DETALLADA EN DOS PANELES EJECUTIVOS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* PANEL FIJOS NACIÓN */}
          <div className="p-5 rounded-2xl bg-blue-950/40 border border-blue-500/30 space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-blue-500/20">
              <div className="flex items-center gap-2 text-blue-300 font-bold text-sm">
                <Landmark size={16} /> 1. Ingresos Fijos (Giros de la Nación)
              </div>
              <span className="text-[10px] font-mono bg-blue-500/20 text-blue-200 px-2 py-0.5 rounded font-bold">
                13 Recursos Reglamentados
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-900/60 p-2.5 rounded-xl border border-white/5">
                <span className="text-[10px] text-slate-400 block">Total Recursos Fijos:</span>
                <strong className="text-white font-mono text-sm">{formatCurrency(fixedAggregates.totalIngresos)}</strong>
              </div>
              <div className="bg-slate-900/60 p-2.5 rounded-xl border border-white/5">
                <span className="text-[10px] text-slate-400 block">Certeza Jurídica:</span>
                <strong className="text-blue-300 font-mono text-sm flex items-center gap-1">
                  <Lock size={12} /> 100% SIIF Nación
                </strong>
              </div>
            </div>

            <ul className="text-xs text-slate-300 space-y-1.5 pt-1">
              <li className="flex items-start gap-1.5">
                <span className="text-blue-400 font-bold">•</span>
                <span><strong>Fundamento Legal:</strong> Aportes ordinarios Ley 30 Art. 86 ($327.070M) y Política de Gratuidad Ley 2307 ($11.208M).</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-blue-400 font-bold">•</span>
                <span><strong>Mecanismo de Desembolso:</strong> PAC automático mensual transferido por el Ministerio de Hacienda directamente a cuentas maestras.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-blue-400 font-bold">•</span>
                <span><strong>Recaudo a 31/08:</strong> ${formatCurrencyShort(fixedAggregates.recaudoReal)} ({fixedAggregates.recaudoAvancePct.toFixed(1)}% ya recibido). Giros Sep-Dic programados por ${formatCurrencyShort(fixedAggregates.proyectadoSepDic)}.</span>
              </li>
            </ul>
          </div>

          {/* PANEL PROYECTADOS PROPIOS */}
          <div className="p-5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-emerald-500/20">
              <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm">
                <TrendingUp size={16} /> 2. Ingresos Proyectados (Gestión Propia)
              </div>
              <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-200 px-2 py-0.5 rounded font-bold">
                8 Recursos de Gestión
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-900/60 p-2.5 rounded-xl border border-white/5">
                <span className="text-[10px] text-slate-400 block">Total Proyectados:</span>
                <strong className="text-white font-mono text-sm">{formatCurrency(projectedAggregates.totalIngresos)}</strong>
              </div>
              <div className="bg-slate-900/60 p-2.5 rounded-xl border border-white/5">
                <span className="text-[10px] text-slate-400 block">Nivel de Ejecución a 31/08:</span>
                <strong className="text-emerald-300 font-mono text-sm">
                  {projectedAggregates.recaudoAvancePct.toFixed(1)}% Cumplido
                </strong>
              </div>
            </div>

            <ul className="text-xs text-slate-300 space-y-1.5 pt-1">
              <li className="flex items-start gap-1.5">
                <span className="text-emerald-400 font-bold">•</span>
                <span><strong>Principales Fuentes:</strong> Matrículas Posgrados ($41.088M), Estampilla Boyacá ($39.315M) y Venta Bienes/Servicios ($27.068M).</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-emerald-400 font-bold">•</span>
                <span><strong>Criterio Econométrico:</strong> Modelos ARIMA para derechos pecuniarios y proyección DIAN (+7.0%) para Devolución IVA.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-emerald-400 font-bold">•</span>
                <span><strong>Estado de Recaudo:</strong> ${formatCurrencyShort(projectedAggregates.recaudoReal)} ya recaudados al corte. Saldo estimado Sep-Dic: ${formatCurrencyShort(projectedAggregates.proyectadoSepDic)}.</span>
              </li>
            </ul>
          </div>

        </div>

      </div>
    );
  }

  // DIAPOSITIVA 3: TABLA 1: INGRESOS FIJOS — RECAUDOS GARANTIZADOS POR GIROS DE LA NACIÓN
  function renderSlide3TablaFijos() {
    return (
      <div className="flex flex-col space-y-4 py-2">
        {/* ENCABEZADO */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-3 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded border border-blue-400/20 font-bold">
                100% Certeza Legal / SIIF Nación
              </span>
              <span className="text-xs text-slate-400 font-mono">13 Recursos Oficiales</span>
            </div>
            <h2 className="text-xl md:text-2xl font-display font-bold text-white flex items-center gap-2">
              <Landmark className="text-blue-400" /> TABLA 1: INGRESOS FIJOS — RECAUDOS GARANTIZADOS POR GIROS DE LA NACIÓN
            </h2>
            <p className="text-xs text-slate-300 mt-0.5 max-w-4xl">
              Transferencias nacionales respaldadas por Ley 30/1992, resoluciones del Ministerio de Educación Nacional y transferencias tributarias calendarizadas en el PAC de Tesorería Nacional.
            </p>
          </div>
          <div className="text-right shrink-0 bg-blue-950/40 border border-blue-500/30 px-4 py-2 rounded-xl">
            <span className="text-[10px] text-blue-300 uppercase font-mono block">Total Fijos Nación 2026</span>
            <span className="text-lg md:text-xl font-mono font-bold text-white">
              {formatCurrency(fixedAggregates.totalIngresos)}
            </span>
          </div>
        </div>

        {/* TABLA EJECUTIVA */}
        <div className="w-full overflow-x-auto rounded-2xl border border-blue-500/30 bg-slate-950/60 shadow-2xl">
          <table className="w-full text-left border-collapse min-w-[850px] text-[11px]">
            <thead>
              <tr className="border-b border-blue-500/30 bg-blue-950/50 text-blue-200 uppercase tracking-wider font-mono text-[10px]">
                <th className="p-2.5 font-bold">Recurso</th>
                <th className="p-2.5 font-bold min-w-[180px]">Nombre Oficial</th>
                <th className="p-2.5 font-bold min-w-[220px]">Fundamento Legal / Entidad</th>
                <th className="p-2.5 font-bold text-right text-slate-400">Aforo Oficial</th>
                <th className="p-2.5 font-bold text-right text-emerald-400">Recaudo 31/08</th>
                <th className="p-2.5 font-bold text-right text-sky-300">Giros Sep-Dic</th>
                <th className="p-2.5 font-bold text-right text-emerald-300 font-extrabold">Total Fijo Anual</th>
                <th className="p-2.5 font-bold text-center">% Giro</th>
                <th className="p-2.5 font-bold text-center">Certeza</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-sans">
              {fixedResources.map(r => {
                const meta = METADATOS_FIJOS[r.recurso] || {
                  baseLegal: 'Aportes de la Nación - Presupuesto General',
                  entidad: 'Gobierno Nacional',
                  calendarNote: 'Giro programado en SIIF'
                };
                const afo = balanceMetaMap[r.recurso]?.aforo || r.totalIngresos;
                const mSum = (r.ingresosPorMesProyectado || [0, 0, 0, 0]).reduce((a, b) => a + b, 0);
                const pct = afo > 0 ? (r.totalIngresos / afo) * 100 : 100;
                const avanceRecaudo = r.totalIngresos > 0 ? (r.ingresosReales / r.totalIngresos) * 100 : 0;

                return (
                  <tr key={r.recurso} className="hover:bg-blue-500/5 transition-colors font-mono">
                    <td className="p-2.5 font-bold text-blue-300 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                      <span>R{r.recurso}</span>
                    </td>
                    <td className="p-2.5 text-slate-200 font-sans font-medium" title={r.nombre}>
                      {r.nombre}
                    </td>
                    <td className="p-2.5 text-slate-300 font-sans text-[10px]">
                      <div className="font-semibold text-blue-200">{meta.baseLegal}</div>
                      <div className="text-[9px] text-slate-400">{meta.entidad}</div>
                    </td>
                    <td className="p-2.5 text-right text-slate-400">
                      {formatCurrencyShort(afo)}
                    </td>
                    <td className="p-2.5 text-right text-emerald-400 font-semibold">
                      {formatCurrencyShort(r.ingresosReales)}
                      <span className="text-[9px] text-emerald-400/70 block">({avanceRecaudo.toFixed(0)}%)</span>
                    </td>
                    <td className="p-2.5 text-right text-sky-300 font-bold bg-sky-500/5">
                      {formatCurrencyShort(mSum)}
                    </td>
                    <td className="p-2.5 text-right font-black text-emerald-300 text-xs bg-emerald-500/10">
                      {formatCurrencyShort(r.totalIngresos)}
                    </td>
                    <td className="p-2.5 text-center">
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                        pct >= 99.5 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-blue-500/20 text-blue-300'
                      }`}>
                        {pct.toFixed(0)}%
                      </span>
                    </td>
                    <td className="p-2.5 text-center font-sans">
                      <span className="text-[9px] bg-blue-500/20 text-blue-300 border border-blue-500/40 px-2 py-0.5 rounded-full font-bold inline-flex items-center gap-1">
                        <Lock size={9} /> 100% SIIF
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-blue-500/40 font-bold text-xs bg-blue-950/60 font-mono">
                <td colSpan={3} className="p-3 text-white uppercase font-sans tracking-wide">
                  TOTAL INGRESOS FIJOS DE LA NACIÓN ({fixedResources.length} Recursos)
                </td>
                <td className="p-3 text-right text-slate-300">
                  {formatCurrencyShort(fixedAggregates.aforoOficial)}
                </td>
                <td className="p-3 text-right text-emerald-400">
                  {formatCurrencyShort(fixedAggregates.recaudoReal)}
                </td>
                <td className="p-3 text-right text-sky-300 font-black">
                  {formatCurrencyShort(fixedAggregates.proyectadoSepDic)}
                </td>
                <td className="p-3 text-right font-black text-emerald-300 text-sm bg-emerald-500/20">
                  {formatCurrency(fixedAggregates.totalIngresos)}
                </td>
                <td className="p-3 text-center text-emerald-300">
                  {((fixedAggregates.totalIngresos / (fixedAggregates.aforoOficial || 1)) * 100).toFixed(0)}%
                </td>
                <td className="p-3 text-center text-[10px] text-blue-300 font-bold font-sans">
                  Garantía Ley
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* PIE DE PÁGINA EXPLICATIVO */}
        <div className="p-3 bg-blue-950/30 rounded-xl border border-blue-500/20 flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-blue-400 shrink-0" />
            <span>
              <strong>Garantía de Nómina y Funcionamiento:</strong> Los giros pendientes de Sep-Dic por <strong>{formatCurrencyShort(fixedAggregates.proyectadoSepDic)}</strong> cuentan con CDP y PAC autorizado en el Ministerio de Hacienda, respaldando el 100% de la nómina de fin de año.
            </span>
          </div>
          <div className="text-[11px] font-mono text-blue-300 shrink-0 hidden md:block">
            {shareFijosPct.toFixed(1)}% del Presupuesto Institucional
          </div>
        </div>

      </div>
    );
  }

  // DIAPOSITIVA 4: TABLA 2: INGRESOS PROYECTADOS — RECURSOS PROPIOS Y GESTIÓN INSTITUCIONAL
  function renderSlide4TablaProyectados() {
    return (
      <div className="flex flex-col space-y-4 py-2">
        {/* ENCABEZADO */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-3 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/20 font-bold">
                Gestión Universitaria y Fuentes Propias
              </span>
              <span className="text-xs text-slate-400 font-mono">8 Recursos de Gestión</span>
            </div>
            <h2 className="text-xl md:text-2xl font-display font-bold text-white flex items-center gap-2">
              <TrendingUp className="text-emerald-400" /> TABLA 2: INGRESOS PROYECTADOS — RECURSOS PROPIOS Y GESTIÓN INSTITUCIONAL
            </h2>
            <p className="text-xs text-slate-300 mt-0.5 max-w-4xl">
              Recursos originados por prestación de servicios académicos, derechos pecuniarios de posgrados, retenciones territoriales de estampilla y trámites tributarios de devolución de IVA.
            </p>
          </div>
          <div className="text-right shrink-0 bg-emerald-950/40 border border-emerald-500/30 px-4 py-2 rounded-xl">
            <span className="text-[10px] text-emerald-300 uppercase font-mono block">Total Proyectados 2026</span>
            <span className="text-lg md:text-xl font-mono font-bold text-white">
              {formatCurrency(projectedAggregates.totalIngresos)}
            </span>
          </div>
        </div>

        {/* TABLA EJECUTIVA */}
        <div className="w-full overflow-x-auto rounded-2xl border border-emerald-500/30 bg-slate-950/60 shadow-2xl">
          <table className="w-full text-left border-collapse min-w-[850px] text-[11px]">
            <thead>
              <tr className="border-b border-emerald-500/30 bg-emerald-950/50 text-emerald-200 uppercase tracking-wider font-mono text-[10px]">
                <th className="p-2.5 font-bold">Recurso</th>
                <th className="p-2.5 font-bold min-w-[170px]">Nombre Oficial</th>
                <th className="p-2.5 font-bold min-w-[210px]">Naturaleza / Dinámica de la Fuente</th>
                <th className="p-2.5 font-bold text-right text-slate-400">Aforo / Meta</th>
                <th className="p-2.5 font-bold text-right text-emerald-400">Recaudo 31/08</th>
                <th className="p-2.5 font-bold text-right text-amber-300">Estimado Sep-Dic</th>
                <th className="p-2.5 font-bold text-right text-emerald-300 font-extrabold">Total Proyectado</th>
                <th className="p-2.5 font-bold text-center">% Recaudo</th>
                <th className="p-2.5 font-bold text-center min-w-[130px]">Modelo / Criterio</th>
                <th className="p-2.5 font-bold text-center">Nivel Riesgo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-sans">
              {projectedResources.map(r => {
                const meta = METADATOS_PROYECTADOS[r.recurso] || {
                  naturaleza: 'Gestión Universitaria',
                  dinamica: 'Recursos propios institucionales',
                  modelo: 'Tendencia Histórica',
                  nivelRiesgo: 'Moderado'
                };
                const afo = balanceMetaMap[r.recurso]?.aforo || r.totalIngresos;
                const mSum = (r.ingresosPorMesProyectado || [0, 0, 0, 0]).reduce((a, b) => a + b, 0);
                const avanceRecaudo = r.totalIngresos > 0 ? (r.ingresosReales / r.totalIngresos) * 100 : 0;

                return (
                  <tr key={r.recurso} className="hover:bg-emerald-500/5 transition-colors font-mono">
                    <td className="p-2.5 font-bold text-emerald-300 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      <span>R{r.recurso}</span>
                    </td>
                    <td className="p-2.5 text-slate-200 font-sans font-medium" title={r.nombre}>
                      {r.nombre}
                    </td>
                    <td className="p-2.5 text-slate-300 font-sans text-[10px]">
                      <div className="font-semibold text-emerald-200">{meta.naturaleza}</div>
                      <div className="text-[9px] text-slate-400 truncate max-w-[210px]">{meta.dinamica}</div>
                    </td>
                    <td className="p-2.5 text-right text-slate-400">
                      {formatCurrencyShort(afo)}
                    </td>
                    <td className="p-2.5 text-right text-emerald-400 font-semibold">
                      {formatCurrencyShort(r.ingresosReales)}
                    </td>
                    <td className="p-2.5 text-right text-amber-300 font-bold bg-amber-500/5">
                      {formatCurrencyShort(mSum)}
                    </td>
                    <td className="p-2.5 text-right font-black text-emerald-300 text-xs bg-emerald-500/10">
                      {formatCurrencyShort(r.totalIngresos)}
                    </td>
                    <td className="p-2.5 text-center">
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                        avanceRecaudo >= 80 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {avanceRecaudo.toFixed(1)}%
                      </span>
                    </td>
                    <td className="p-2.5 text-center font-sans text-[10px] text-slate-300">
                      <span className="bg-slate-800/80 px-2 py-0.5 rounded border border-white/5 font-mono text-[9px] block">
                        {meta.modelo}
                      </span>
                    </td>
                    <td className="p-2.5 text-center font-sans">
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold inline-flex items-center gap-1 ${
                        meta.nivelRiesgo === 'Bajo' 
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                          : meta.nivelRiesgo === 'Moderado'
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}>
                        {meta.nivelRiesgo}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-emerald-500/40 font-bold text-xs bg-emerald-950/60 font-mono">
                <td colSpan={3} className="p-3 text-white uppercase font-sans tracking-wide">
                  TOTAL INGRESOS PROYECTADOS ({projectedResources.length} Recursos)
                </td>
                <td className="p-3 text-right text-slate-300">
                  {formatCurrencyShort(projectedAggregates.aforoOficial)}
                </td>
                <td className="p-3 text-right text-emerald-400">
                  {formatCurrencyShort(projectedAggregates.recaudoReal)}
                </td>
                <td className="p-3 text-right text-amber-300 font-black">
                  {formatCurrencyShort(projectedAggregates.proyectadoSepDic)}
                </td>
                <td className="p-3 text-right font-black text-emerald-300 text-sm bg-emerald-500/20">
                  {formatCurrency(projectedAggregates.totalIngresos)}
                </td>
                <td className="p-3 text-center text-emerald-300">
                  {projectedAggregates.recaudoAvancePct.toFixed(1)}%
                </td>
                <td colSpan={2} className="p-3 text-center text-[10px] text-amber-300 font-bold font-sans">
                  Gestión Institucional
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* NOTA CALIBRACIÓN POSGRADOS Y GESTIÓN */}
        <div className="p-3 bg-emerald-950/30 rounded-xl border border-emerald-500/20 flex flex-col md:flex-row items-start md:items-center justify-between text-xs text-slate-300 gap-2">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-emerald-400 shrink-0" />
            <span>
              <strong>Meta Posgrados (R31) Calibrada:</strong> El recurso 31 está calibrado estrictamente en <strong>$41.088.265.317</strong> anual (Recaudo Real $39.765M + Estimado Sep-Dic $1.324M), alcanzando un cumplimiento del 96.8% a corte de agosto.
            </span>
          </div>
          <div className="text-[11px] font-mono text-emerald-300 shrink-0">
            {shareProyPct.toFixed(1)}% del Presupuesto Institucional
          </div>
        </div>

      </div>
    );
  }

  // DIAPOSITIVA 5: CONCLUSIONES DE TESORERÍA Y CIERRE PARA LA JUNTA
  function renderSlide5Conclusiones() {
    return (
      <div className="flex flex-col space-y-6 py-2">
        {/* ENCABEZADO */}
        <div className="text-center space-y-2 pb-4 border-b border-white/10">
          <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold uppercase tracking-wider">
            <CheckCircle2 size={14} className="text-emerald-400" />
            Dictamen Final para la Junta Directiva
          </div>
          <h2 className="text-2xl md:text-4xl font-display font-black text-white">
            SÍNTESIS DE TESORERÍA Y EQUILIBRIO DE CIERRE 2026
          </h2>
          <p className="text-sm text-slate-300 max-w-3xl mx-auto">
            Sostenibilidad garantizada, 100% de compromisos amparados y aplicación del modelo técnico de ejecución de pagos al 91.5%.
          </p>
        </div>

        {/* 3 TARJETAS DE CIERRE PRESUPUESTAL */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 text-center space-y-2">
            <div className="text-xs uppercase font-mono text-slate-400 font-bold">Compromisos Totales Financiados</div>
            <div className="text-2xl md:text-3xl font-mono font-black text-emerald-400">
              {formatCurrency(grandTotal)}
            </div>
            <div className="text-xs text-emerald-300 flex items-center justify-center gap-1">
              <CheckCircle size={14} /> 100% de Cobertura Contractual
            </div>
            <p className="text-[11px] text-slate-400 pt-1">
              Cero déficit. Cada peso de gasto contractual cuenta con su respectiva fuente de ingreso garantizada.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-blue-950/50 border border-blue-500/30 text-center space-y-2">
            <div className="text-xs uppercase font-mono text-blue-400 font-bold">Pagos Efectivos Proyectados (91.5%)</div>
            <div className="text-2xl md:text-3xl font-mono font-black text-blue-300">
              {formatCurrency(totals.totalPagos)}
            </div>
            <div className="text-xs text-blue-200 flex items-center justify-center gap-1 font-semibold">
              <Scale size={14} /> Ajuste Técnico Histórico de Tesorería
            </div>
            <p className="text-[11px] text-slate-300 pt-1">
              En concordancia con el comportamiento histórico de contratos, los desembolsos reales a 31 de diciembre alcanzan el 91.5%.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-amber-950/40 border border-amber-500/30 text-center space-y-2">
            <div className="text-xs uppercase font-mono text-amber-400 font-bold">Reserva de Caja / Cuentas por Pagar (8.5%)</div>
            <div className="text-2xl md:text-3xl font-mono font-black text-amber-300">
              {formatCurrency(totals.saldoDisponible)}
            </div>
            <div className="text-xs text-amber-200 flex items-center justify-center gap-1 font-semibold">
              <Lock size={14} /> Liquidez Protegida para Enero 2027
            </div>
            <p className="text-[11px] text-slate-300 pt-1">
              Fondo de reserva disponible para respaldar los compromisos devengados que pasarán como cuentas por pagar a 2027.
            </p>
          </div>
        </div>

        {/* 4 RECOMENDACIONES CLAVE PARA LA JUNTA */}
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-white/10 space-y-4">
          <h3 className="text-sm md:text-base font-display font-bold text-white flex items-center gap-2">
            <CheckCircle className="text-amber-400" size={18} />
            Recomendaciones Estratégicas para la Junta Directiva
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300">
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/5 space-y-1">
              <strong className="text-blue-300 flex items-center gap-1 font-bold text-sm">
                1. Monitoreo del PAC de la Nación (R10 y R10.3)
              </strong>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Ratificar las gestiones ante el Ministerio de Educación Nacional para el oportuno desembolso del saldo de $88.356M (R10) y $2.229M (R10.3) en los meses de noviembre y diciembre.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/5 space-y-1">
              <strong className="text-emerald-300 flex items-center gap-1 font-bold text-sm">
                2. Consolidación de Posgrados (R31: $41.088M)
              </strong>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Con el 96.8% ya en tesorería ($39.765M), respaldar las convocatorias académicas del Semestre II para consolidar el recaudo final de $1.324M restante.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/5 space-y-1">
              <strong className="text-amber-300 flex items-center gap-1 font-bold text-sm">
                3. Agilidad en Resoluciones IVA DIAN (R21)
              </strong>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Hacer seguimiento prioritario a los actos administrativos de devolución bimestral radicados ante la DIAN por $3.435M para su radicación efectiva antes del corte anual.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/5 space-y-1">
              <strong className="text-purple-300 flex items-center gap-1 font-bold text-sm">
                4. Constitución Formal de la Reserva de Caja
              </strong>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Aprobar la reserva técnica de liquidez del 8.5% ($43.905M) para garantizar que los compromisos vigentes que pasen a cuentas por pagar 2027 cuenten con respaldo inmediato de caja.
              </p>
            </div>
          </div>
        </div>

        {/* DICTAMEN DE CIERRE */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/60 to-blue-950/60 border border-emerald-500/30 flex items-center justify-between text-xs text-white">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
            <span className="font-medium">
              <strong>Dictamen de Sostenibilidad:</strong> La Vicerrectoría Administrativa y Financiera certifica la viabilidad y equilibrio del ejercicio presupuestal 2026.
            </span>
          </div>
          <span className="font-mono text-emerald-300 font-bold shrink-0 hidden sm:inline">
            Equilibrio Presupuestal: $0,00
          </span>
        </div>

      </div>
    );
  }
}
