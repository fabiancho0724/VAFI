import React, { useState, useMemo } from 'react';
import { 
  Building2, Landmark, TrendingUp, TrendingDown, Coins, Lock, CheckCircle2, 
  AlertTriangle, FileSpreadsheet, Download, Search, SlidersHorizontal, 
  ShieldCheck, Scale, Calendar, Sparkles, Info, HelpCircle, Layers, 
  ArrowUpRight, ArrowRight, Check, Eye, ExternalLink, ChevronDown, ChevronRight
} from 'lucide-react';
import { StrictResourceProjection, StrictTotals, GIROS_SIIF_PROYECTADOS } from '../lib/strictProjections';
import { RECURSOS_FIJOS_RESOLUCION } from '../lib/constants';

const formatCurrency = (value: number) => 
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);

const formatCurrencyShort = (value: number) => {
  if (Math.abs(value) >= 1e12) return `$ ${(value / 1e12).toFixed(2)} B`;
  if (Math.abs(value) >= 1e9) return `$ ${(value / 1e9).toFixed(2)} MM`;
  if (Math.abs(value) >= 1e6) return `$ ${(value / 1e6).toFixed(1)} M`;
  return `$ ${value.toLocaleString('es-CO')}`;
};

export const NACION_FIXED_CODES = ['10', '10.0', '10.1', '10.2', '10.3', '10.5', '12', '13', '14', '16', '16.0', '16.1', '16.2', '17', '18'];

export interface CashFlowIncomeFixedVsProjectedProps {
  resources: StrictResourceProjection[];
  balanceData: any[];
  totals: StrictTotals;
}

export function CashFlowIncomeFixedVsProjected({ resources, balanceData, totals }: CashFlowIncomeFixedVsProjectedProps) {
  const [activeTab, setActiveTab] = useState<'comparativa' | 'fijos' | 'proyectados' | 'consolidado'>('comparativa');
  const [searchTerm, setSearchTerm] = useState('');
  const [showMonthlyBreakdown, setShowMonthlyBreakdown] = useState(false);

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

  // Metadatos explicativos de marco legal y entidad para Ingresos Fijos
  const METADATOS_FIJOS: Record<string, { baseLegal: string; entidad: string; calendarNote: string }> = {
    '10': { baseLegal: 'Ley 30/1992 Art. 86 / Res. MEN Anual', entidad: 'Ministerio de Educación Nacional (MEN)', calendarNote: '4 Giros mensuales programados en PAC SIIF' },
    '10.0': { baseLegal: 'Ley 30/1992 Art. 86 / Res. MEN Anual', entidad: 'Ministerio de Educación Nacional (MEN)', calendarNote: '4 Giros mensuales programados en PAC SIIF' },
    '10.1': { baseLegal: 'Resolución MEN - Plan Fomento Calidad (PIC Convencional)', entidad: 'MEN - Subdirección Apoyo IES', calendarNote: 'Giros bimestrales en SIIF Nación' },
    '10.2': { baseLegal: 'Resolución MEN - Fomento a la Calidad Regional', entidad: 'MEN', calendarNote: 'Giro programado según radicación de proyectos' },
    '10.3': { baseLegal: 'Resolución MEN - Fortalecimiento a la Gestión', entidad: 'MEN', calendarNote: 'Giro programado en SIIF para noviembre' },
    '10.5': { baseLegal: 'Ley 2307/2023 / Decreto Reglamentario MEN (Gratuidad)', entidad: 'MEN / Fondo Gratuidad', calendarNote: 'Giros calendarizados de compensación matrícula 100%' },
    '12': { baseLegal: 'Ley 1697/2013 - Estampilla Pro-UNAL y Otras Estatales', entidad: 'Ministerio de Hacienda / DIAN', calendarNote: 'Transferencias de recaudos tributarios nacionales' },
    '13': { baseLegal: 'Art. 142 Ley 1819/2016 / DIAN (Excedentes Cooperativos)', entidad: 'Sector Cooperativo / DIAN', calendarNote: 'Giro reglamentado anual por excedentes financieros' },
    '14': { baseLegal: 'Fondo de Solidaridad Educativa (FSE) - MEN', entidad: 'MEN / FSE', calendarNote: 'Compensación de matrículas de estudiantes vulnerables' },
    '16': { baseLegal: 'Presupuesto General de la Nación (PGN) - Ley 30 Art. 87', entidad: 'DNP / MEN / MinHacienda', calendarNote: 'Asignación anual de inversión pública aprobada' },
    '16.0': { baseLegal: 'Presupuesto General de la Nación (PGN) - Ley 30 Art. 87', entidad: 'DNP / MEN / MinHacienda', calendarNote: 'Asignación anual de inversión pública aprobada' },
    '16.1': { baseLegal: 'Planes de Fomento Básicos (PFB) - MEN', entidad: 'MEN', calendarNote: 'Proyectos de inversión básica institucional' },
    '16.2': { baseLegal: 'Planes de Fomento Complementarios (PFC) - MEN', entidad: 'MEN', calendarNote: 'Proyectos complementarios de infraestructura y TIC' },
    '17': { baseLegal: 'Ley 403/1997 Art. 1 / MinHacienda (Descuento Electoral)', entidad: 'Ministerio de Hacienda y Crédito Público', calendarNote: 'Reembolso directo de descuentos electorales en matrículas' },
    '18': { baseLegal: 'Artículo 87 Ley 30/1992 - Fondo Desarrollo Universitario', entidad: 'CESU / MEN', calendarNote: 'Distribución reglamentada por indicadores de desempeño' }
  };

  // Metadatos explicativos de naturaleza y riesgo para Ingresos Proyectados
  const METADATOS_PROYECTADOS: Record<string, { naturaleza: string; dinamica: string; nivelRiesgo: 'Bajo' | 'Moderado' | 'Condicionado'; modelo: string }> = {
    '20': { naturaleza: 'Venta de Bienes y Servicios Académicos', dinamica: 'Matrículas pregrado, inscripciones, grados, constancias, certificaciones, cafeterías', nivelRiesgo: 'Moderado', modelo: 'Bottom-Up por Concepto / ARIMA (1,1,0)' },
    '21': { naturaleza: 'Devolución IVA - Instituciones Educación Superior', dinamica: 'Trámite administrativo de resoluciones de devolución ante la DIAN', nivelRiesgo: 'Moderado', modelo: 'Macro MFMP (+7.0%) / Promedio Histórico' },
    '31': { naturaleza: 'Matrículas y Derechos Pecuniarios de Posgrados', dinamica: 'Cohortes activas de Especializaciones, Maestrías y Doctorados', nivelRiesgo: 'Condicionado', modelo: 'Estacionalidad Calendario Académico Semestre II' },
    '32': { naturaleza: 'Extensión y Consultoría Universitaria', dinamica: 'Cursos libres, proyectos de asesoría técnica y análisis de laboratorios', nivelRiesgo: 'Condicionado', modelo: 'Flujo de Contratos de Servicios Vigentes' },
    '33': { naturaleza: 'Convenios Interadministrativos de Investigación', dinamica: 'Proyectos con entidades públicas y privadas con derechos institucionales', nivelRiesgo: 'Condicionado', modelo: 'Cronograma de Desembolsos e Interventorías' },
    '34': { naturaleza: 'Convenios de Cooperación sin Derechos', dinamica: 'Recursos en administración y convenios específicos de cooperación', nivelRiesgo: 'Bajo', modelo: 'Ejecución Estricta según Compromiso' },
    '35': { naturaleza: 'Educación Continuada y Diplomados', dinamica: 'Inscripciones a programas de actualización profesional y seminarios', nivelRiesgo: 'Moderado', modelo: 'Demanda de Cohortes en Inscripción' },
    '40': { naturaleza: 'Estampilla UPTC Territorial', dinamica: 'Retenciones del 1% al 2% sobre contratos de obra y adquisiciones en Boyacá', nivelRiesgo: 'Condicionado', modelo: 'Tendencia de Recaudo Territorial Departamental' }
  };

  // Clasificación de recursos en Fijos de la Nación y Proyectados
  const { fixedResources, projectedResources } = useMemo(() => {
    const fixed: StrictResourceProjection[] = [];
    const projected: StrictResourceProjection[] = [];

    resources.forEach(r => {
      const code = r.recurso;
      if (NACION_FIXED_CODES.includes(code)) {
        fixed.push(r);
      } else {
        projected.push(r);
      }
    });

    return { fixedResources: fixed, projectedResources: projected };
  }, [resources]);

  // Cálculos de agregados para Ingresos Fijos (Nación)
  const fixedAggregates = useMemo(() => {
    let recaudoReal = 0;
    let proyectadoSepDic = 0;
    let totalIngresos = 0;
    let aforoOficial = 0;
    let mesesProy = [0, 0, 0, 0];

    fixedResources.forEach(r => {
      recaudoReal += r.ingresosReales;
      const mSum = (r.ingresosPorMesProyectado || [0, 0, 0, 0]).reduce((a, b) => a + b, 0);
      proyectadoSepDic += mSum;
      totalIngresos += r.totalIngresos;
      const afo = balanceMetaMap[r.recurso]?.aforo || r.totalIngresos;
      aforoOficial += afo;

      if (r.ingresosPorMesProyectado && r.ingresosPorMesProyectado.length === 4) {
        mesesProy[0] += r.ingresosPorMesProyectado[0];
        mesesProy[1] += r.ingresosPorMesProyectado[1];
        mesesProy[2] += r.ingresosPorMesProyectado[2];
        mesesProy[3] += r.ingresosPorMesProyectado[3];
      }
    });

    const cumplimientoPct = aforoOficial > 0 ? (totalIngresos / aforoOficial) * 100 : 100;
    const recaudoAvancePct = totalIngresos > 0 ? (recaudoReal / totalIngresos) * 100 : 0;

    return { recaudoReal, proyectadoSepDic, totalIngresos, aforoOficial, mesesProy, cumplimientoPct, recaudoAvancePct };
  }, [fixedResources, balanceMetaMap]);

  // Cálculos de agregados para Ingresos Proyectados (Propios y Variables)
  const projectedAggregates = useMemo(() => {
    let recaudoReal = 0;
    let proyectadoSepDic = 0;
    let totalIngresos = 0;
    let aforoOficial = 0;
    let mesesProy = [0, 0, 0, 0];

    projectedResources.forEach(r => {
      recaudoReal += r.ingresosReales;
      const mSum = (r.ingresosPorMesProyectado || [0, 0, 0, 0]).reduce((a, b) => a + b, 0);
      proyectadoSepDic += mSum;
      totalIngresos += r.totalIngresos;
      const afo = balanceMetaMap[r.recurso]?.aforo || r.totalIngresos;
      aforoOficial += afo;

      if (r.ingresosPorMesProyectado && r.ingresosPorMesProyectado.length === 4) {
        mesesProy[0] += r.ingresosPorMesProyectado[0];
        mesesProy[1] += r.ingresosPorMesProyectado[1];
        mesesProy[2] += r.ingresosPorMesProyectado[2];
        mesesProy[3] += r.ingresosPorMesProyectado[3];
      }
    });

    const cumplimientoPct = aforoOficial > 0 ? (totalIngresos / aforoOficial) * 100 : 100;
    const recaudoAvancePct = totalIngresos > 0 ? (recaudoReal / totalIngresos) * 100 : 0;

    return { recaudoReal, proyectadoSepDic, totalIngresos, aforoOficial, mesesProy, cumplimientoPct, recaudoAvancePct };
  }, [projectedResources, balanceMetaMap]);

  // Gran Total Institucional
  const grandTotalIngresos = fixedAggregates.totalIngresos + projectedAggregates.totalIngresos;
  const shareFijosPct = grandTotalIngresos > 0 ? (fixedAggregates.totalIngresos / grandTotalIngresos) * 100 : 0;
  const shareProyPct = grandTotalIngresos > 0 ? (projectedAggregates.totalIngresos / grandTotalIngresos) * 100 : 0;

  // Filtrado por buscador
  const filteredFixed = useMemo(() => {
    if (!searchTerm.trim()) return fixedResources;
    const q = searchTerm.toLowerCase();
    return fixedResources.filter(r => {
      const meta = METADATOS_FIJOS[r.recurso];
      return r.recurso.toLowerCase().includes(q) ||
             r.nombre.toLowerCase().includes(q) ||
             (meta?.baseLegal || '').toLowerCase().includes(q) ||
             (meta?.entidad || '').toLowerCase().includes(q);
    });
  }, [fixedResources, searchTerm]);

  const filteredProjected = useMemo(() => {
    if (!searchTerm.trim()) return projectedResources;
    const q = searchTerm.toLowerCase();
    return projectedResources.filter(r => {
      const meta = METADATOS_PROYECTADOS[r.recurso];
      return r.recurso.toLowerCase().includes(q) ||
             r.nombre.toLowerCase().includes(q) ||
             (meta?.naturaleza || '').toLowerCase().includes(q) ||
             (meta?.dinamica || '').toLowerCase().includes(q) ||
             (meta?.modelo || '').toLowerCase().includes(q);
    });
  }, [projectedResources, searchTerm]);

  // Exportar Ingresos Fijos CSV
  const exportFixedCSV = () => {
    let csv = `﻿UNIVERSIDAD PEDAGOGICA Y TECNOLOGICA DE COLOMBIA - UPTC
`;
    csv += `FLUJO DE INGRESOS FIJOS (REGLAMENTADOS POR GIROS DE LA NACION) - VIGENCIA 2026
`;
    csv += `Corte de Recaudo: 31 de Agosto | Giros Programados: Septiembre a Diciembre

`;
    csv += `Recurso;Nombre del Recurso;Fundamento Legal / Entidad;Aforo Oficial (COP);Recaudo Real 31/08 (COP);Giro Sep (COP);Giro Oct (COP);Giro Nov (COP);Giro Dic (COP);Total Giros Sep-Dic (COP);Total Ingreso Fijo (COP);% Cumplimiento;Certeza Juridica
`;

    fixedResources.forEach(r => {
      const meta = METADATOS_FIJOS[r.recurso] || { baseLegal: 'Aportes Nación', entidad: 'Gobierno Nacional' };
      const afo = balanceMetaMap[r.recurso]?.aforo || r.totalIngresos;
      const m = r.ingresosPorMesProyectado || [0, 0, 0, 0];
      const mSum = m.reduce((a, b) => a + b, 0);
      const pct = afo > 0 ? ((r.totalIngresos / afo) * 100).toFixed(1) : '100.0';
      csv += `"R${r.recurso}";"${r.nombre}";"${meta.baseLegal} - ${meta.entidad}";"${Math.round(afo)}";"${Math.round(r.ingresosReales)}";"${Math.round(m[0])}";"${Math.round(m[1])}";"${Math.round(m[2])}";"${Math.round(m[3])}";"${Math.round(mSum)}";"${Math.round(r.totalIngresos)}";"${pct}%";"100% Fijo SIIF"
`;
    });

    csv += `"TOTAL FIJOS NACION";"Transferencias de la Nación y Normativa";"Presupuesto General de la Nación";"${Math.round(fixedAggregates.aforoOficial)}";"${Math.round(fixedAggregates.recaudoReal)}";"${Math.round(fixedAggregates.mesesProy[0])}";"${Math.round(fixedAggregates.mesesProy[1])}";"${Math.round(fixedAggregates.mesesProy[2])}";"${Math.round(fixedAggregates.mesesProy[3])}";"${Math.round(fixedAggregates.proyectadoSepDic)}";"${Math.round(fixedAggregates.totalIngresos)}";"${fixedAggregates.cumplimientoPct.toFixed(1)}%";"100% Certeza"
`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `UPTC_Flujo_Ingresos_Fijos_Nacion_2026.csv`;
    link.click();
  };

  // Exportar Ingresos Proyectados CSV
  const exportProjectedCSV = () => {
    let csv = `﻿UNIVERSIDAD PEDAGOGICA Y TECNOLOGICA DE COLOMBIA - UPTC
`;
    csv += `FLUJO DE INGRESOS PROYECTADOS (RECURSOS PROPIOS Y GESTION INSTITUCIONAL) - VIGENCIA 2026
`;
    csv += `Corte de Recaudo: 31 de Agosto | Estimacion Proyectada: Septiembre a Diciembre

`;
    csv += `Recurso;Nombre del Recurso;Naturaleza de la Fuente;Aforo / Meta (COP);Recaudo Real 31/08 (COP);Proy Sep (COP);Proy Oct (COP);Proy Nov (COP);Proy Dic (COP);Total Proy Sep-Dic (COP);Total Ingreso Proyectado (COP);% Ejecucion Corte;Modelo Utilizado;Nivel de Riesgo
`;

    projectedResources.forEach(r => {
      const meta = METADATOS_PROYECTADOS[r.recurso] || { naturaleza: 'Gestión Universitaria', modelo: 'Tendencia Histórica', nivelRiesgo: 'Moderado' };
      const afo = balanceMetaMap[r.recurso]?.aforo || r.totalIngresos;
      const m = r.ingresosPorMesProyectado || [0, 0, 0, 0];
      const mSum = m.reduce((a, b) => a + b, 0);
      const pct = afo > 0 ? ((r.ingresosReales / afo) * 100).toFixed(1) : '100.0';
      csv += `"R${r.recurso}";"${r.nombre}";"${meta.naturaleza}";"${Math.round(afo)}";"${Math.round(r.ingresosReales)}";"${Math.round(m[0])}";"${Math.round(m[1])}";"${Math.round(m[2])}";"${Math.round(m[3])}";"${Math.round(mSum)}";"${Math.round(r.totalIngresos)}";"${pct}%";"${meta.modelo}";"${meta.nivelRiesgo}"
`;
    });

    csv += `"TOTAL PROYECTADOS";"Recursos Propios y Gestión";"Fuentes Propias y Convenios";"${Math.round(projectedAggregates.aforoOficial)}";"${Math.round(projectedAggregates.recaudoReal)}";"${Math.round(projectedAggregates.mesesProy[0])}";"${Math.round(projectedAggregates.mesesProy[1])}";"${Math.round(projectedAggregates.mesesProy[2])}";"${Math.round(projectedAggregates.mesesProy[3])}";"${Math.round(projectedAggregates.proyectadoSepDic)}";"${Math.round(projectedAggregates.totalIngresos)}";"${projectedAggregates.recaudoAvancePct.toFixed(1)}%";"Modelo Institucional";"Sensible a Dinamica"
`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `UPTC_Flujo_Ingresos_Proyectados_2026.csv`;
    link.click();
  };

  return (
    <div className="glass-card p-6 md:p-8 rounded-[28px] overflow-hidden flex flex-col mb-8 border border-white/10 shadow-2xl bg-slate-900/80 space-y-6">
      
      {/* ENCABEZADO CON SELECTOR DE PESTAÑAS DEL FLUJO DE INGRESOS */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Scale size={13} className="text-emerald-400" />
              Estructura Dual del Flujo de Ingresos
            </span>
            <span className="text-xs text-slate-400 font-mono">Vigencia 2026</span>
          </div>
          <h2 className="text-2xl font-display text-white flex items-center gap-3">
            <Coins className="text-emerald-400" />
            Flujo de Ingresos: Fijos de la Nación vs. Proyectados
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-3xl">
            Diferenciación analítica entre los <strong>recaudos fijos garantizados por giros de la Nación</strong> (con respaldo legal en SIIF) y los <strong>ingresos proyectados de gestión propia y convenios</strong> (sujetos a estacionalidad académica y recaudo).
          </p>
        </div>

        {/* CONTROLES Y EXPORTACIÓN */}
        <div className="flex flex-wrap items-center gap-2.5 self-end lg:self-center">
          <button
            onClick={() => setShowMonthlyBreakdown(!showMonthlyBreakdown)}
            className={`text-xs px-3.5 py-2 rounded-xl border flex items-center gap-2 transition-all cursor-pointer ${
              showMonthlyBreakdown 
                ? 'bg-blue-500/20 text-blue-300 border-blue-500/40 font-bold' 
                : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
            }`}
            title="Muestra u oculta las columnas mensuales de Sep, Oct, Nov y Dic"
          >
            <Calendar size={14} />
            <span>{showMonthlyBreakdown ? 'Ocultar Meses Sep-Dic' : 'Ver Meses Sep-Dic'}</span>
          </button>

          <button
            onClick={exportFixedCSV}
            className="text-xs px-3.5 py-2 bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 border border-blue-500/40 rounded-xl flex items-center gap-1.5 transition-all font-semibold cursor-pointer shadow-lg"
            title="Descargar tabla de Ingresos Fijos de la Nación a CSV"
          >
            <Download size={14} />
            <span>Fijos (CSV)</span>
          </button>

          <button
            onClick={exportProjectedCSV}
            className="text-xs px-3.5 py-2 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 border border-emerald-500/40 rounded-xl flex items-center gap-1.5 transition-all font-semibold cursor-pointer shadow-lg"
            title="Descargar tabla de Ingresos Proyectados a CSV"
          >
            <Download size={14} />
            <span>Proyectados (CSV)</span>
          </button>
        </div>
      </div>

      {/* TARJETAS EJECUTIVAS COMPARATIVAS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* TARJETA 1: FIJOS NACIÓN */}
        <div className="bg-blue-950/40 border border-blue-500/30 rounded-2xl p-5 relative overflow-hidden group hover:border-blue-500/50 transition-all">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
              <Landmark size={14} />
              1. Ingresos Fijos (Giros de la Nación)
            </span>
            <span className="text-[10px] bg-blue-500/20 text-blue-300 font-mono font-bold px-2 py-0.5 rounded-full border border-blue-500/30">
              {shareFijosPct.toFixed(1)}% del Presupuesto
            </span>
          </div>

          <div className="text-2xl font-mono font-bold text-white mt-1">
            {formatCurrency(fixedAggregates.totalIngresos)}
          </div>
          <p className="text-[11px] text-blue-200/70 font-mono mt-0.5">
            Aforo Oficial: {formatCurrencyShort(fixedAggregates.aforoOficial)}
          </p>

          <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-blue-500/20 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 block">Recaudado (a 31/08):</span>
              <strong className="text-emerald-400 font-mono text-sm">{formatCurrencyShort(fixedAggregates.recaudoReal)}</strong>
              <span className="text-[10px] text-emerald-300/80 block">({fixedAggregates.recaudoAvancePct.toFixed(1)}% ya en caja)</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Giros SIIF (Sep-Dic):</span>
              <strong className="text-blue-300 font-mono text-sm">{formatCurrencyShort(fixedAggregates.proyectadoSepDic)}</strong>
              <span className="text-[10px] text-blue-300/80 block">4 Giros programados</span>
            </div>
          </div>

          <div className="mt-3 bg-blue-500/10 rounded-lg p-2 border border-blue-500/20 flex items-center justify-between text-[11px]">
            <span className="text-blue-300 font-medium flex items-center gap-1">
              <Lock size={12} className="text-blue-400" /> Certeza de Giro:
            </span>
            <span className="font-bold text-blue-200">100% Jurídico / Ley 30 & Conpes</span>
          </div>
        </div>

        {/* TARJETA 2: PROYECTADOS PROPIOS Y VARIABLES */}
        <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-5 relative overflow-hidden group hover:border-emerald-500/50 transition-all">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <TrendingUp size={14} />
              2. Ingresos Proyectados (Propios y Gestión)
            </span>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-mono font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
              {shareProyPct.toFixed(1)}% del Presupuesto
            </span>
          </div>

          <div className="text-2xl font-mono font-bold text-white mt-1">
            {formatCurrency(projectedAggregates.totalIngresos)}
          </div>
          <p className="text-[11px] text-emerald-200/70 font-mono mt-0.5">
            Aforo / Meta: {formatCurrencyShort(projectedAggregates.aforoOficial)}
          </p>

          <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-emerald-500/20 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 block">Recaudado (a 31/08):</span>
              <strong className="text-emerald-400 font-mono text-sm">{formatCurrencyShort(projectedAggregates.recaudoReal)}</strong>
              <span className="text-[10px] text-emerald-300/80 block">({projectedAggregates.recaudoAvancePct.toFixed(1)}% ejecutado)</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Estimado (Sep-Dic):</span>
              <strong className="text-amber-300 font-mono text-sm">{formatCurrencyShort(projectedAggregates.proyectadoSepDic)}</strong>
              <span className="text-[10px] text-amber-300/80 block">Proyección estacional</span>
            </div>
          </div>

          <div className="mt-3 bg-emerald-500/10 rounded-lg p-2 border border-emerald-500/20 flex items-center justify-between text-[11px]">
            <span className="text-emerald-300 font-medium flex items-center gap-1">
              <Sparkles size={12} className="text-emerald-400" /> Criterio Proyectivo:
            </span>
            <span className="font-bold text-emerald-200">Matrículas, IVA DIAN, Convenios</span>
          </div>
        </div>

        {/* TARJETA 3: TOTAL INSTITUCIONAL CONSOLIDADO */}
        <div className="bg-slate-800/60 border border-white/10 rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Coins size={14} className="text-amber-400" />
                Total General de Ingresos 2026
              </span>
              <span className="text-[10px] bg-white/10 text-white font-mono font-bold px-2 py-0.5 rounded-full">
                100% Institucional
              </span>
            </div>

            <div className="text-2xl font-mono font-bold text-white mt-1">
              {formatCurrency(grandTotalIngresos)}
            </div>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
              Recaudo base 31/Ago: {formatCurrencyShort(fixedAggregates.recaudoReal + projectedAggregates.recaudoReal)} ({(( (fixedAggregates.recaudoReal + projectedAggregates.recaudoReal) / grandTotalIngresos) * 100).toFixed(1)}%)
            </p>
          </div>

          {/* BARRA VISUAL DE DISTRIBUCIÓN */}
          <div className="space-y-1.5 mt-4 pt-3 border-t border-white/10">
            <div className="flex justify-between text-[10px] font-mono">
              <span className="text-blue-300">Fijos Nación: {shareFijosPct.toFixed(1)}%</span>
              <span className="text-emerald-300">Proyectados Propios: {shareProyPct.toFixed(1)}%</span>
            </div>
            <div className="h-3 w-full bg-slate-900 rounded-full overflow-hidden flex p-0.5 border border-white/10">
              <div 
                className="h-full bg-gradient-to-r from-blue-600 to-sky-400 rounded-l-full transition-all duration-500" 
                style={{ width: `${shareFijosPct}%` }}
                title={`Ingresos Fijos Nación: ${shareFijosPct.toFixed(1)}%`}
              />
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-r-full transition-all duration-500" 
                style={{ width: `${shareProyPct}%` }}
                title={`Ingresos Proyectados Propios: ${shareProyPct.toFixed(1)}%`}
              />
            </div>
            <div className="flex justify-between text-[9px] text-slate-400 pt-0.5">
              <span>{fixedResources.length} recursos fijos</span>
              <span>{projectedResources.length} recursos proyectados</span>
            </div>
          </div>
        </div>

      </div>

      {/* SELECTOR DE PESTAÑAS PRINCIPALES Y BUSCADOR */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-950/60 p-2 rounded-2xl border border-white/10">
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('comparativa')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'comparativa'
                ? 'bg-gradient-to-r from-blue-600 to-emerald-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Scale size={14} />
            <span>Vista Comparativa (Ambas Tablas)</span>
          </button>

          <button
            onClick={() => setActiveTab('fijos')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'fijos'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Landmark size={14} className="text-blue-400" />
            <span>1. Solo Ingresos Fijos (Nación)</span>
            <span className="text-[10px] bg-blue-500/30 text-blue-200 px-1.5 py-0.2 rounded-full font-mono">
              {fixedResources.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('proyectados')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'proyectados'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <TrendingUp size={14} className="text-emerald-400" />
            <span>2. Solo Ingresos Proyectados</span>
            <span className="text-[10px] bg-emerald-500/30 text-emerald-200 px-1.5 py-0.2 rounded-full font-mono">
              {projectedResources.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('consolidado')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'consolidado'
                ? 'bg-slate-700 text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Layers size={14} />
            <span>3. Consolidado Institucional Total</span>
          </button>
        </div>

        {/* BUSCADOR RÁPIDO */}
        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por recurso, ley, concepto..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500 transition-colors"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs">
              ×
            </button>
          )}
        </div>
      </div>

      {/* CONTENIDO SEGÚN LA PESTAÑA SELECCIONADA */}

      {/* SECCIÓN 1: TABLA DE INGRESOS FIJOS (GIROS DE LA NACIÓN) */}
      {(activeTab === 'comparativa' || activeTab === 'fijos') && (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                <Landmark size={18} />
              </div>
              <div>
                <h3 className="text-base font-display font-bold text-white flex items-center gap-2">
                  <span>TABLA 1: INGRESOS FIJOS — RECAUDOS GARANTIZADOS POR GIROS DE LA NACIÓN</span>
                  <span className="text-[10px] bg-blue-500/20 text-blue-300 font-mono px-2 py-0.5 rounded border border-blue-500/30">
                    Reglamentados por Ley / SIIF
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Transferencias y aportes de la Nación programados bajo resoluciones del MEN, Ley 30/92 y Ministerio de Hacienda con giros calendarizados.
                </p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-blue-300 self-start sm:self-auto bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
              Total Fijo Vigencia: {formatCurrencyShort(fixedAggregates.totalIngresos)}
            </span>
          </div>

          <div className="w-full overflow-x-auto rounded-2xl border border-blue-500/20 bg-black/20">
            <table className="w-full text-left border-collapse min-w-[950px] text-xs">
              <thead>
                <tr className="border-b border-blue-500/20 bg-blue-950/30 text-[11px] text-blue-200 uppercase tracking-wider font-mono">
                  <th className="p-3 font-bold">Recurso</th>
                  <th className="p-3 font-bold min-w-[200px]">Nombre Oficial</th>
                  <th className="p-3 font-bold min-w-[230px]">Fundamento Legal / Entidad</th>
                  <th className="p-3 font-bold text-right text-slate-400">Aforo Oficial</th>
                  <th className="p-3 font-bold text-right text-emerald-400">Recaudo 31/08</th>
                  {showMonthlyBreakdown && (
                    <>
                      <th className="p-2.5 font-bold text-right text-blue-300 font-mono">Giro Sep</th>
                      <th className="p-2.5 font-bold text-right text-blue-300 font-mono">Giro Oct</th>
                      <th className="p-2.5 font-bold text-right text-blue-300 font-mono">Giro Nov</th>
                      <th className="p-2.5 font-bold text-right text-blue-300 font-mono">Giro Dic</th>
                    </>
                  )}
                  <th className="p-3 font-bold text-right text-sky-300">Giros Sep-Dic</th>
                  <th className="p-3 font-bold text-right text-emerald-300 font-extrabold">Total Ingreso Fijo</th>
                  <th className="p-3 font-bold text-center">% Giro</th>
                  <th className="p-3 font-bold text-center">Certeza</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-sans">
                {filteredFixed.map(r => {
                  const meta = METADATOS_FIJOS[r.recurso] || {
                    baseLegal: 'Aportes de la Nación - Presupuesto General',
                    entidad: 'Gobierno Nacional',
                    calendarNote: 'Giro programado en SIIF'
                  };
                  const afo = balanceMetaMap[r.recurso]?.aforo || r.totalIngresos;
                  const m = r.ingresosPorMesProyectado || [0, 0, 0, 0];
                  const mSum = m.reduce((a, b) => a + b, 0);
                  const pct = afo > 0 ? (r.totalIngresos / afo) * 100 : 100;
                  const avanceRecaudo = r.totalIngresos > 0 ? (r.ingresosReales / r.totalIngresos) * 100 : 0;

                  return (
                    <tr key={r.recurso} className="hover:bg-blue-500/5 transition-colors font-mono">
                      <td className="p-3 font-bold text-blue-300 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                        <span>R{r.recurso}</span>
                      </td>
                      <td className="p-3 text-slate-200 font-sans font-medium" title={r.nombre}>
                        {r.nombre}
                      </td>
                      <td className="p-3 text-slate-300 font-sans text-[11px]">
                        <div className="font-semibold text-blue-200">{meta.baseLegal}</div>
                        <div className="text-[10px] text-slate-400">{meta.entidad}</div>
                      </td>
                      <td className="p-3 text-right text-slate-400">
                        {formatCurrencyShort(afo)}
                      </td>
                      <td className="p-3 text-right text-emerald-400 font-semibold">
                        {formatCurrencyShort(r.ingresosReales)}
                        <span className="text-[9px] text-emerald-400/80 block">({avanceRecaudo.toFixed(0)}%)</span>
                      </td>
                      {showMonthlyBreakdown && (
                        <>
                          <td className="p-2.5 text-right text-blue-300/90 text-[11px] bg-blue-950/20">{formatCurrencyShort(m[0])}</td>
                          <td className="p-2.5 text-right text-blue-300/90 text-[11px] bg-blue-950/20">{formatCurrencyShort(m[1])}</td>
                          <td className="p-2.5 text-right text-blue-300/90 text-[11px] bg-blue-950/20">{formatCurrencyShort(m[2])}</td>
                          <td className="p-2.5 text-right text-blue-300/90 text-[11px] bg-blue-950/20">{formatCurrencyShort(m[3])}</td>
                        </>
                      )}
                      <td className="p-3 text-right text-sky-300 font-bold bg-sky-500/5">
                        {formatCurrencyShort(mSum)}
                      </td>
                      <td className="p-3 text-right font-black text-emerald-300 text-sm bg-emerald-500/10">
                        {formatCurrencyShort(r.totalIngresos)}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          pct >= 99.5 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-blue-500/20 text-blue-300'
                        }`}>
                          {pct.toFixed(0)}%
                        </span>
                      </td>
                      <td className="p-3 text-center font-sans">
                        <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/40 px-2 py-0.5 rounded-full font-bold inline-flex items-center gap-1">
                          <Lock size={10} /> 100% Fijo SIIF
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-blue-500/40 font-bold text-xs bg-blue-950/40 font-mono">
                  <td colSpan={3} className="p-3 text-white uppercase font-sans tracking-wide">
                    TOTAL INGRESOS FIJOS DE LA NACIÓN ({filteredFixed.length} Recursos)
                  </td>
                  <td className="p-3 text-right text-slate-300">
                    {formatCurrencyShort(fixedAggregates.aforoOficial)}
                  </td>
                  <td className="p-3 text-right text-emerald-400">
                    {formatCurrencyShort(fixedAggregates.recaudoReal)}
                  </td>
                  {showMonthlyBreakdown && (
                    <>
                      <td className="p-2.5 text-right text-blue-300 font-mono">{formatCurrencyShort(fixedAggregates.mesesProy[0])}</td>
                      <td className="p-2.5 text-right text-blue-300 font-mono">{formatCurrencyShort(fixedAggregates.mesesProy[1])}</td>
                      <td className="p-2.5 text-right text-blue-300 font-mono">{formatCurrencyShort(fixedAggregates.mesesProy[2])}</td>
                      <td className="p-2.5 text-right text-blue-300 font-mono">{formatCurrencyShort(fixedAggregates.mesesProy[3])}</td>
                    </>
                  )}
                  <td className="p-3 text-right text-sky-300 font-black bg-sky-500/10">
                    {formatCurrencyShort(fixedAggregates.proyectadoSepDic)}
                  </td>
                  <td className="p-3 text-right text-emerald-300 font-black text-sm bg-emerald-500/20">
                    {formatCurrency(fixedAggregates.totalIngresos)}
                  </td>
                  <td className="p-3 text-center text-emerald-300">
                    {fixedAggregates.cumplimientoPct.toFixed(1)}%
                  </td>
                  <td className="p-3 text-center text-[10px] text-blue-300 font-sans font-bold">
                    ✓ Sin Riesgo
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* SECCIÓN 2: TABLA DE INGRESOS PROYECTADOS (RECURSOS PROPIOS Y GESTIÓN) */}
      {(activeTab === 'comparativa' || activeTab === 'proyectados') && (
        <div className="space-y-3 pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <TrendingUp size={18} />
              </div>
              <div>
                <h3 className="text-base font-display font-bold text-white flex items-center gap-2">
                  <span>TABLA 2: INGRESOS PROYECTADOS — RECURSOS PROPIOS Y GESTIÓN INSTITUCIONAL</span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-mono px-2 py-0.5 rounded border border-emerald-500/30">
                    Variables / Condicionados a Recaudo
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Fuentes generadas por venta de bienes y servicios, matrículas pregrado y posgrados, extensión, convenios y resoluciones DIAN de IVA.
                </p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-300 self-start sm:self-auto bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
              Total Proyectado Vigencia: {formatCurrencyShort(projectedAggregates.totalIngresos)}
            </span>
          </div>

          <div className="w-full overflow-x-auto rounded-2xl border border-emerald-500/20 bg-black/20">
            <table className="w-full text-left border-collapse min-w-[950px] text-xs">
              <thead>
                <tr className="border-b border-emerald-500/20 bg-emerald-950/30 text-[11px] text-emerald-200 uppercase tracking-wider font-mono">
                  <th className="p-3 font-bold">Recurso</th>
                  <th className="p-3 font-bold min-w-[180px]">Nombre Oficial</th>
                  <th className="p-3 font-bold min-w-[220px]">Naturaleza de la Fuente</th>
                  <th className="p-3 font-bold text-right text-slate-400">Aforo / Meta</th>
                  <th className="p-3 font-bold text-right text-emerald-400">Recaudo 31/08</th>
                  {showMonthlyBreakdown && (
                    <>
                      <th className="p-2.5 font-bold text-right text-amber-300 font-mono">Proy Sep</th>
                      <th className="p-2.5 font-bold text-right text-amber-300 font-mono">Proy Oct</th>
                      <th className="p-2.5 font-bold text-right text-amber-300 font-mono">Proy Nov</th>
                      <th className="p-2.5 font-bold text-right text-amber-300 font-mono">Proy Dic</th>
                    </>
                  )}
                  <th className="p-3 font-bold text-right text-amber-300">Proy Sep-Dic</th>
                  <th className="p-3 font-bold text-right text-emerald-300 font-extrabold">Total Proyectado</th>
                  <th className="p-3 font-bold text-center">% Avance</th>
                  <th className="p-3 font-bold min-w-[160px]">Modelo / Criterio</th>
                  <th className="p-3 font-bold text-center">Variabilidad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-sans">
                {filteredProjected.map(r => {
                  const meta = METADATOS_PROYECTADOS[r.recurso] || {
                    naturaleza: 'Recurso Propio Institucional',
                    dinamica: 'Recaudo por actividad académica y operativa',
                    nivelRiesgo: 'Moderado',
                    modelo: 'Tendencia Histórica'
                  };
                  const afo = balanceMetaMap[r.recurso]?.aforo || r.totalIngresos;
                  const m = r.ingresosPorMesProyectado || [0, 0, 0, 0];
                  const mSum = m.reduce((a, b) => a + b, 0);
                  const pct = afo > 0 ? (r.ingresosReales / afo) * 100 : 100;

                  return (
                    <tr key={r.recurso} className="hover:bg-emerald-500/5 transition-colors font-mono">
                      <td className="p-3 font-bold text-emerald-300 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                        <span>R{r.recurso}</span>
                      </td>
                      <td className="p-3 text-slate-200 font-sans font-medium" title={r.nombre}>
                        {r.nombre}
                      </td>
                      <td className="p-3 text-slate-300 font-sans text-[11px]">
                        <div className="font-semibold text-emerald-200">{meta.naturaleza}</div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[210px]" title={meta.dinamica}>{meta.dinamica}</div>
                      </td>
                      <td className="p-3 text-right text-slate-400">
                        {formatCurrencyShort(afo)}
                      </td>
                      <td className="p-3 text-right text-emerald-400 font-semibold">
                        {formatCurrencyShort(r.ingresosReales)}
                      </td>
                      {showMonthlyBreakdown && (
                        <>
                          <td className="p-2.5 text-right text-amber-300/90 text-[11px] bg-amber-950/20">{formatCurrencyShort(m[0])}</td>
                          <td className="p-2.5 text-right text-amber-300/90 text-[11px] bg-amber-950/20">{formatCurrencyShort(m[1])}</td>
                          <td className="p-2.5 text-right text-amber-300/90 text-[11px] bg-amber-950/20">{formatCurrencyShort(m[2])}</td>
                          <td className="p-2.5 text-right text-amber-300/90 text-[11px] bg-amber-950/20">{formatCurrencyShort(m[3])}</td>
                        </>
                      )}
                      <td className="p-3 text-right text-amber-300 font-bold bg-amber-500/5">
                        {formatCurrencyShort(mSum)}
                      </td>
                      <td className="p-3 text-right font-black text-emerald-300 text-sm bg-emerald-500/10">
                        {formatCurrencyShort(r.totalIngresos)}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          pct >= 90 ? 'bg-emerald-500/20 text-emerald-300' : pct >= 70 ? 'bg-blue-500/20 text-blue-300' : 'bg-amber-500/20 text-amber-300'
                        }`}>
                          {pct.toFixed(0)}%
                        </span>
                      </td>
                      <td className="p-3 text-slate-300 font-sans text-[11px]">
                        <span className="text-[10px] text-slate-300 bg-white/5 px-2 py-0.5 rounded border border-white/10 block truncate max-w-[150px]" title={meta.modelo}>
                          {meta.modelo}
                        </span>
                      </td>
                      <td className="p-3 text-center font-sans">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                          meta.nivelRiesgo === 'Bajo'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : meta.nivelRiesgo === 'Moderado'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : 'bg-orange-500/20 text-orange-300 border-orange-500/40'
                        }`}>
                          {meta.nivelRiesgo === 'Bajo' ? '🟢 Estable' : meta.nivelRiesgo === 'Moderado' ? '🟡 Moderado' : '🟠 Condicionado'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-emerald-500/40 font-bold text-xs bg-emerald-950/40 font-mono">
                  <td colSpan={3} className="p-3 text-white uppercase font-sans tracking-wide">
                    TOTAL INGRESOS PROYECTADOS ({filteredProjected.length} Recursos Propios y Convenios)
                  </td>
                  <td className="p-3 text-right text-slate-300">
                    {formatCurrencyShort(projectedAggregates.aforoOficial)}
                  </td>
                  <td className="p-3 text-right text-emerald-400">
                    {formatCurrencyShort(projectedAggregates.recaudoReal)}
                  </td>
                  {showMonthlyBreakdown && (
                    <>
                      <td className="p-2.5 text-right text-amber-300 font-mono">{formatCurrencyShort(projectedAggregates.mesesProy[0])}</td>
                      <td className="p-2.5 text-right text-amber-300 font-mono">{formatCurrencyShort(projectedAggregates.mesesProy[1])}</td>
                      <td className="p-2.5 text-right text-amber-300 font-mono">{formatCurrencyShort(projectedAggregates.mesesProy[2])}</td>
                      <td className="p-2.5 text-right text-amber-300 font-mono">{formatCurrencyShort(projectedAggregates.mesesProy[3])}</td>
                    </>
                  )}
                  <td className="p-3 text-right text-amber-300 font-black bg-amber-500/10">
                    {formatCurrencyShort(projectedAggregates.proyectadoSepDic)}
                  </td>
                  <td className="p-3 text-right text-emerald-300 font-black text-sm bg-emerald-500/20">
                    {formatCurrency(projectedAggregates.totalIngresos)}
                  </td>
                  <td className="p-3 text-center text-emerald-300">
                    {projectedAggregates.recaudoAvancePct.toFixed(1)}%
                  </td>
                  <td colSpan={2} className="p-3 text-center text-[10px] text-amber-300 font-sans font-bold">
                    Estimación Institucional
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* SECCIÓN 3: CONSOLIDADO INSTITUCIONAL TOTAL (TODOS LOS RECURSOS) */}
      {activeTab === 'consolidado' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center pb-2">
            <div>
              <h3 className="text-base font-display font-bold text-white flex items-center gap-2">
                <span>CONSOLIDADO GENERAL: TODOS LOS RECURSOS INSTITUCIONALES</span>
                <span className="text-[10px] bg-white/10 text-white font-mono px-2 py-0.5 rounded">
                  {resources.length} Recursos Totales
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Matriz integral unificada con recaudos efectivos, giros de la Nación, compromisos y cierre en equilibrio.
              </p>
            </div>
          </div>

          <div className="w-full overflow-x-auto rounded-2xl border border-white/10 bg-black/20">
            <table className="w-full text-left border-collapse min-w-[950px] text-xs">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider font-mono text-[11px] bg-slate-900/60">
                  <th className="p-3 font-medium">Recurso</th>
                  <th className="p-3 font-medium">Tipo Naturaleza</th>
                  <th className="p-3 font-medium">Nombre</th>
                  <th className="p-3 font-medium text-right text-emerald-400/70">Recaudo 31/08</th>
                  <th className="p-3 font-medium text-right text-slate-400">Proy Sep-Dic</th>
                  <th className="p-3 font-medium text-right text-emerald-400 font-bold">Ingreso Total</th>
                  <th className="p-3 font-medium text-right text-rose-300">Comp. Original</th>
                  <th className="p-3 font-medium text-right text-rose-400">Exceso (Alerta)</th>
                  <th className="p-3 font-medium text-right text-indigo-300 font-bold">Comp. Ajustado</th>
                  <th className="p-3 font-medium text-right text-blue-400">Pago Cierre</th>
                  <th className="p-3 font-medium text-right text-white">Saldo Disp.</th>
                  <th className="p-3 font-medium text-center">Estado Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-sans">
                {resources.map(r => {
                  const isFixed = NACION_FIXED_CODES.includes(r.recurso);
                  const mesesProy = (r.ingresosPorMesProyectado || [0, 0, 0, 0]).reduce((a, b) => a + b, 0);
                  const tieneExceso = (r.excesoCompromiso || 0) > 0;

                  return (
                    <tr key={r.recurso} className={`hover:bg-white/[0.03] transition-colors text-xs font-mono ${tieneExceso ? 'bg-rose-500/[0.04]' : ''}`}>
                      <td className="p-3 text-slate-200 font-bold">R{r.recurso}</td>
                      <td className="p-3 font-sans">
                        {isFixed ? (
                          <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full font-bold inline-flex items-center gap-1">
                            <Landmark size={10} /> Fijo Nación
                          </span>
                        ) : (
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold inline-flex items-center gap-1">
                            <TrendingUp size={10} /> Proyectado
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-slate-300 font-sans max-w-[170px] truncate" title={r.nombre}>{r.nombre}</td>
                      <td className="p-3 text-right text-emerald-400">{formatCurrencyShort(r.ingresosReales)}</td>
                      <td className="p-3 text-right text-slate-400">{formatCurrencyShort(mesesProy)}</td>
                      <td className="p-3 text-right font-bold text-emerald-300">{formatCurrencyShort(r.totalIngresos)}</td>
                      <td className="p-3 text-right text-slate-300">{formatCurrencyShort(r.compromisoOriginal || r.totalCompromisos)}</td>
                      <td className="p-3 text-right">
                        {tieneExceso ? (
                          <span className="text-rose-400 font-bold bg-rose-500/20 px-2 py-0.5 rounded text-[10px]">
                            +{formatCurrencyShort(r.excesoCompromiso)}
                          </span>
                        ) : (
                          <span className="text-slate-600 text-xs">-</span>
                        )}
                      </td>
                      <td className="p-3 text-right font-bold text-indigo-300 bg-indigo-500/5">{formatCurrencyShort(r.totalCompromisos)}</td>
                      <td className="p-3 text-right text-blue-300">{formatCurrencyShort(r.totalPagos)}</td>
                      <td className="p-3 text-right font-bold text-white bg-white/5">{formatCurrencyShort(r.saldoDisponible)}</td>
                      <td className="p-3 text-center font-sans">
                        {tieneExceso ? (
                          <span className="text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded-full font-bold">
                            🔴 Excedente R10
                          </span>
                        ) : (
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                            🟢 100% Cubierto
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-white/20 text-xs font-bold bg-white/5 font-mono">
                  <td colSpan={3} className="p-3 text-white uppercase font-sans">Totales Institucionales</td>
                  <td className="p-3 text-right text-emerald-400">{formatCurrencyShort(totals.totalRecaudo)}</td>
                  <td className="p-3 text-right text-slate-300">{formatCurrencyShort(totals.totalIngresosProyectados)}</td>
                  <td className="p-3 text-right text-emerald-300 font-extrabold">{formatCurrencyShort(totals.totalRecaudo + totals.totalIngresosProyectados)}</td>
                  <td className="p-3 text-right text-slate-300">{formatCurrencyShort(totals.totalCompromisosOriginales)}</td>
                  <td className="p-3 text-right text-rose-400 font-black">{formatCurrencyShort(totals.totalExcesoCompromisos)}</td>
                  <td className="p-3 text-right text-indigo-300 font-black bg-indigo-500/10">{formatCurrencyShort(totals.totalCompromisos)}</td>
                  <td className="p-3 text-right text-blue-400 font-black">{formatCurrencyShort(totals.totalPagos)}</td>
                  <td className="p-3 text-right text-white font-black bg-white/10">{formatCurrencyShort(totals.saldoDisponible)}</td>
                  <td className="p-3 text-center text-[10px] text-emerald-400 font-bold font-sans">🟢 Balance Equilibrado</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* PIE DE PÁGINA INFORMATIVO Y REGLAS DE TESORERÍA */}
      <div className="bg-slate-950/40 border border-white/5 rounded-2xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <Info size={16} className="text-emerald-400 shrink-0" />
          <span>
            <strong>Criterio de Tesorería Institucional:</strong> Los ingresos fijos de la Nación cuentan con certeza legal respaldada por la Ley 30/92 y Conpes de Gratuidad, garantizando la cobertura de la nómina docente y administrativa de la universidad.
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs font-mono shrink-0">
          <span className="flex items-center gap-1.5 text-blue-300">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Fijo Nación: {shareFijosPct.toFixed(1)}%
          </span>
          <span className="flex items-center gap-1.5 text-emerald-300">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Proyectado: {shareProyPct.toFixed(1)}%
          </span>
        </div>
      </div>

    </div>
  );
}
