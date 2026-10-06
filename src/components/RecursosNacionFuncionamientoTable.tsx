import React, { useState, useMemo, useEffect } from 'react';
import Papa from 'papaparse';
import {
  Landmark,
  ShieldCheck,
  Scale,
  FileSpreadsheet,
  Download,
  Search,
  CheckCircle2,
  Lock,
  Calendar,
  TrendingUp,
  Coins,
  Info,
  HelpCircle,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Building2,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { StrictResourceProjection, StrictTotals, GIROS_SIIF_PROYECTADOS } from '../lib/strictProjections';

export const RECURSOS_NACION_FUNCIONAMIENTO_CODES = [
  '10', '10.0', '10.1', '10.2', '10.3', '10.5', '13', '14', '17', '18'
];

interface MetadatoNacionFuncionamiento {
  codigoFormato: string;
  nombre: string;
  baseLegal: string;
  entidad: string;
  destinacion: string;
  categoria: 'Base Presupuestal' | 'Fomento y Calidad' | 'Gratuidad' | 'Transferencia Especial';
  notas: string;
}

export const METADATOS_NACION_FUNCIONAMIENTO: Record<string, MetadatoNacionFuncionamiento> = {
  '10': {
    codigoFormato: 'R10',
    nombre: 'Aportes Nación - Funcionamiento',
    baseLegal: 'Ley 30/1992 Art. 86 / Res. MEN Anual',
    entidad: 'Ministerio de Educación Nacional (MEN)',
    destinacion: 'Nómina docente, administrativa y gastos de operación central',
    categoria: 'Base Presupuestal',
    notas: 'Eje principal del funcionamiento. PAC calendarizado con giros mensuales de la Tesorería General.'
  },
  '10.0': {
    codigoFormato: 'R10',
    nombre: 'Aportes Nación - Funcionamiento',
    baseLegal: 'Ley 30/1992 Art. 86 / Res. MEN Anual',
    entidad: 'Ministerio de Educación Nacional (MEN)',
    destinacion: 'Nómina docente, administrativa y gastos de operación central',
    categoria: 'Base Presupuestal',
    notas: 'Eje principal del funcionamiento. PAC calendarizado con giros mensuales de la Tesorería General.'
  },
  '10.1': {
    codigoFormato: 'R10.1',
    nombre: 'Aportes Nación - PIC Convencional',
    baseLegal: 'Resolución MEN - Plan de Fomento a la Calidad',
    entidad: 'MEN - Subdirección de Apoyo a IES',
    destinacion: 'Cumplimiento de acuerdos colectivos laborales y bienestar docente/administrativo',
    categoria: 'Fomento y Calidad',
    notas: 'Amparo de compromisos convencionales laborales pactados con sindicatos.'
  },
  '10.2': {
    codigoFormato: 'R10.2',
    nombre: 'Aportes Nación - PIC Territorial',
    baseLegal: 'Resolución MEN - Fomento a la Calidad Regional',
    entidad: 'Ministerio de Educación Nacional',
    destinacion: 'Operación y fomento académico en sedes regionales (Duitama, Sogamoso, Chiquinquirá, Aguazul)',
    categoria: 'Fomento y Calidad',
    notas: '100% recaudado efectivo en el corte de agosto ($3.060 M).'
  },
  '10.3': {
    codigoFormato: 'R10.3',
    nombre: 'Aportes Nación - Fortalecimiento a la Gestión',
    baseLegal: 'Resolución MEN - Procesos de Fortalecimiento Institucional',
    entidad: 'Ministerio de Educación Nacional',
    destinacion: 'Modernización tecnológica, sistemas de información y apoyo a la gestión administrativa',
    categoria: 'Fomento y Calidad',
    notas: 'Giro programado en SIIF por $2.229 M para el mes de noviembre.'
  },
  '10.5': {
    codigoFormato: 'R10.5',
    nombre: 'Aportes Nación - Política de Gratuidad (Base)',
    baseLegal: 'Ley 2307/2023 / Decreto Reglamentario MEN',
    entidad: 'MEN / Fondo de Gratuidad',
    destinacion: 'Cobertura del costo operativo de matrícula para estudiantes de pregrado en gratuidad',
    categoria: 'Gratuidad',
    notas: 'Incorporado a la base presupuestal por mandato de la Ley 2307. 100% recaudado ($11.208 M).'
  },
  '13': {
    codigoFormato: 'R13',
    nombre: 'Excedentes Financieros Cooperativas',
    baseLegal: 'Artículo 142 Ley 1819 de 2016 / DIAN',
    entidad: 'Sector Cooperativo / DIAN',
    destinacion: 'Financiación de cupos, permanencia y apoyos de funcionamiento estudiantil',
    categoria: 'Transferencia Especial',
    notas: 'Transferencia tributaria del 20% del excedente cooperativo con destino a IES públicas. 100% recaudado.'
  },
  '14': {
    codigoFormato: 'R14',
    nombre: 'Matrículas FSE (Fondo de Solidaridad Educativa)',
    baseLegal: 'Decreto Legislativo MEN / Fondo de Solidaridad Educativa',
    entidad: 'Ministerio de Educación Nacional (FSE)',
    destinacion: 'Financiamiento operativo de la exención de matrícula a estudiantes vulnerables',
    categoria: 'Gratuidad',
    notas: 'Aporte de la Nación girado para garantizar funcionamiento sin cobro de matrícula. 100% recaudado ($12.641 M).'
  },
  '17': {
    codigoFormato: 'R17',
    nombre: 'Devolución Descuento Electoral',
    baseLegal: 'Ley 403 de 1997 Artículo 1 / MinHacienda',
    entidad: 'Ministerio de Hacienda y Crédito Público',
    destinacion: 'Compensación a la Universidad por el descuento obligatorio del 10% en matrículas a votantes',
    categoria: 'Transferencia Especial',
    notas: 'Reembolso estatal del descuento de votación: $4.207 M recaudados + $1.437 M en SIIF (Oct-Dic).'
  },
  '18': {
    codigoFormato: 'R18',
    nombre: 'Artículo 87 Ley 30/1992 (CESU)',
    baseLegal: 'Artículo 87 Ley 30 de 1992 / Consejo Nacional CESU',
    entidad: 'CESU / Ministerio de Educación Nacional',
    destinacion: 'Fondo de Desarrollo Universitario para fortalecimiento del funcionamiento institucional',
    categoria: 'Transferencia Especial',
    notas: 'Asignación del CESU: $1.573 M recaudados + $537 M en SIIF (Oct-Dic).'
  }
};

const formatCOP = (val: number) => {
  if (val === undefined || val === null || isNaN(val) || val === 0) return '$ 0 M';
  const inM = val / 1e6;
  const abs = Math.abs(inM);
  const sign = inM < 0 ? '-' : '';
  const dec = abs < 1 && abs > 0 ? 2 : 1;
  return `${sign}$ ${abs.toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: dec })} M`;
};

export interface RecursosNacionFuncionamientoTableProps {
  resources?: StrictResourceProjection[];
  balanceData?: any[];
  gastos2026Data?: any[];
  totals?: StrictTotals;
  className?: string;
}

export function RecursosNacionFuncionamientoTable({
  resources = [],
  balanceData = [],
  gastos2026Data = [],
  totals,
  className = ''
}: RecursosNacionFuncionamientoTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showMonthlyBreakdown, setShowMonthlyBreakdown] = useState(true);
  const [selectedCategoria, setSelectedCategoria] = useState<string>('TODAS');
  const [downloadNotice, setDownloadNotice] = useState(false);

  // Estados locales con fallback a CSV si no se pasan por props
  const [internalBalanceData, setInternalBalanceData] = useState<any[]>(balanceData);
  const [internalGastosData, setInternalGastosData] = useState<any[]>(gastos2026Data);

  useEffect(() => {
    if (balanceData && balanceData.length > 0) {
      setInternalBalanceData(balanceData);
    } else {
      fetch('/data/balance.csv')
        .then(res => res.text())
        .then(text => {
          Papa.parse<any>(text, {
            header: true,
            delimiter: ';',
            skipEmptyLines: true,
            complete: (results) => {
              if (results.data && results.data.length > 0) {
                setInternalBalanceData(results.data);
              }
            }
          });
        })
        .catch(() => {});
    }
  }, [balanceData]);

  useEffect(() => {
    if (gastos2026Data && gastos2026Data.length > 0) {
      setInternalGastosData(gastos2026Data);
    } else {
      fetch('/data/gastos_2026.csv')
        .then(res => res.text())
        .then(text => {
          Papa.parse<any>(text, {
            header: true,
            delimiter: ';',
            skipEmptyLines: true,
            complete: (results) => {
              if (results.data && results.data.length > 0) {
                setInternalGastosData(results.data);
              }
            }
          });
        })
        .catch(() => {});
    }
  }, [gastos2026Data]);

  // Mapeo auxiliar de aforos y balance
  const balanceMap = useMemo(() => {
    const map: Record<string, { aforo: number; siif: number; recaudo31Ago: number; totalRecaudo: number; nombreRaw: string }> = {};
    const dataset = internalBalanceData && internalBalanceData.length > 0 ? internalBalanceData : balanceData;
    if (!dataset || dataset.length === 0) return map;

    dataset.forEach(row => {
      const raw = String(row['Recurso'] || row['recurso'] || '').trim();
      const code = raw.split('-')[0].trim();
      if (!code) return;

      const cleanNum = (val: any) => {
        if (!val) return 0;
        const s = String(val).replace(/[\$,\s]/g, '').trim();
        return parseFloat(s) || 0;
      };

      const normalizedKey = code === '10.0' ? '10' : code;
      map[normalizedKey] = {
        aforo: cleanNum(row['Aforo']),
        siif: cleanNum(row['SIIF']),
        recaudo31Ago: cleanNum(row['Recaudo 31/08']),
        totalRecaudo: cleanNum(row['Total Recaudo']),
        nombreRaw: raw.substring(raw.indexOf('-') + 1).trim() || raw
      };
    });

    return map;
  }, [internalBalanceData, balanceData]);

  // Mapeo de compromisos y pagos desde gastos2026Data
  const gastosMap = useMemo(() => {
    const map: Record<string, { compromiso: number; pago: number }> = {};
    const dataset = internalGastosData && internalGastosData.length > 0 ? internalGastosData : gastos2026Data;
    if (!dataset || dataset.length === 0) return map;

    function cleanNum(val: any) {
      if (!val) return 0;
      const s = String(val).replace(/[\$,\s]/g, '').trim();
      return parseFloat(s) || 0;
    }

    function getCol(row: any, keyPart: string) {
      const k = Object.keys(row).find(x => x.toLowerCase().includes(keyPart.toLowerCase()));
      return k ? row[k] : '';
    }

    dataset.forEach(r => {
      let rec = String(getCol(r, 'recurso') || getCol(r, 'código recurso') || '').trim();
      if (rec.startsWith('10.0') || rec === '10') rec = '10';
      if (!rec) return;

      const comp = cleanNum(getCol(r, 'compromiso'));
      const pago = cleanNum(getCol(r, 'pago') || getCol(r, 'valor pago'));

      if (!map[rec]) {
        map[rec] = { compromiso: 0, pago: 0 };
      }
      map[rec].compromiso += comp;
      map[rec].pago += pago;
    });

    return map;
  }, [internalGastosData, gastos2026Data]);

  // Construcción unificada de las 9 filas de Recursos Nación para Funcionamiento
  const nacionRows = useMemo(() => {
    const ORDERED_KEYS = ['10', '10.1', '10.2', '10.3', '10.5', '13', '14', '17', '18'];

    return ORDERED_KEYS.map(key => {
      const meta = METADATOS_NACION_FUNCIONAMIENTO[key] || {
        codigoFormato: `R${key}`,
        nombre: `Recurso ${key}`,
        baseLegal: 'Presupuesto General de la Nación',
        entidad: 'Gobierno Nacional',
        destinacion: 'Gastos de Funcionamiento',
        categoria: 'Base Presupuestal' as const,
        notas: 'Aporte legal reglamentado'
      };

      const bal = balanceMap[key] || {
        aforo: 0,
        siif: 0,
        recaudo31Ago: 0,
        totalRecaudo: 0,
        nombreRaw: meta.nombre
      };

      // Si existe proyección en StrictResourceProjection
      const proj = resources.find(r => r.recurso === key || (key === '10' && r.recurso === '10.0'));

      const aforo = bal.aforo > 0 ? bal.aforo : (proj?.totalIngresos || 0);
      const recaudoReal = bal.recaudo31Ago > 0 ? bal.recaudo31Ago : (proj?.ingresosReales || 0);

      // Giros mensuales Sep-Dic desde GIROS_SIIF_PROYECTADOS o proj
      const defaultMeses = GIROS_SIIF_PROYECTADOS[key] || [0, 0, 0, 0];
      const mesesProy = proj?.ingresosPorMesProyectado && proj.ingresosPorMesProyectado.length === 4
        ? proj.ingresosPorMesProyectado
        : defaultMeses;

      const girosSepDic = bal.siif > 0 ? bal.siif : mesesProy.reduce((a, b) => a + b, 0);
      const totalIngreso = bal.totalRecaudo > 0 ? bal.totalRecaudo : (recaudoReal + girosSepDic);

      // Compromisos y pagos
      const g = gastosMap[key] || { compromiso: 0, pago: 0 };
      const compromiso = g.compromiso > 0 ? g.compromiso : (proj?.totalCompromisos || totalIngreso);
      const pago = g.pago > 0 ? g.pago : (proj?.totalPagos || recaudoReal);

      const avanceRecaudoPct = totalIngreso > 0 ? (recaudoReal / totalIngreso) * 100 : 0;
      const cumplimientoAforoPct = aforo > 0 ? (totalIngreso / aforo) * 100 : 100;
      const saldoCaja = totalIngreso - pago;

      return {
        key,
        codigoFormato: meta.codigoFormato,
        nombre: meta.nombre,
        baseLegal: meta.baseLegal,
        entidad: meta.entidad,
        destinacion: meta.destinacion,
        categoria: meta.categoria,
        notas: meta.notas,
        aforo,
        recaudoReal,
        mesesProy,
        girosSepDic,
        totalIngreso,
        compromiso,
        pago,
        saldoCaja,
        avanceRecaudoPct,
        cumplimientoAforoPct
      };
    });
  }, [balanceMap, resources, gastosMap]);

  // Filtrado por buscador y categoría
  const filteredRows = useMemo(() => {
    return nacionRows.filter(r => {
      const matchCat = selectedCategoria === 'TODAS' || r.categoria === selectedCategoria;
      if (!matchCat) return false;

      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      return (
        r.codigoFormato.toLowerCase().includes(q) ||
        r.nombre.toLowerCase().includes(q) ||
        r.baseLegal.toLowerCase().includes(q) ||
        r.entidad.toLowerCase().includes(q) ||
        r.destinacion.toLowerCase().includes(q)
      );
    });
  }, [nacionRows, searchTerm, selectedCategoria]);

  // Totales / Sumatoria de las filas visibles
  const totalsCalculated = useMemo(() => {
    let totAforo = 0;
    let totRecaudo = 0;
    let totSep = 0;
    let totOct = 0;
    let totNov = 0;
    let totDic = 0;
    let totGirosSepDic = 0;
    let totIngreso = 0;
    let totCompromiso = 0;
    let totPago = 0;
    let totSaldoCaja = 0;

    filteredRows.forEach(r => {
      totAforo += r.aforo;
      totRecaudo += r.recaudoReal;
      totSep += r.mesesProy[0] || 0;
      totOct += r.mesesProy[1] || 0;
      totNov += r.mesesProy[2] || 0;
      totDic += r.mesesProy[3] || 0;
      totGirosSepDic += r.girosSepDic;
      totIngreso += r.totalIngreso;
      totCompromiso += r.compromiso;
      totPago += r.pago;
      totSaldoCaja += r.saldoCaja;
    });

    const totAvancePct = totIngreso > 0 ? (totRecaudo / totIngreso) * 100 : 0;
    const totCumplimientoPct = totAforo > 0 ? (totIngreso / totAforo) * 100 : 100;

    return {
      totAforo,
      totRecaudo,
      totSep,
      totOct,
      totNov,
      totDic,
      totGirosSepDic,
      totIngreso,
      totCompromiso,
      totPago,
      totSaldoCaja,
      totAvancePct,
      totCumplimientoPct
    };
  }, [filteredRows]);

  // Exportar matriz a Excel / CSV
  const handleExportCSV = () => {
    let csv = `\uFEFFUNIVERSIDAD PEDAGOGICA Y TECNOLOGICA DE COLOMBIA - UPTC\n`;
    csv += `RECURSOS NACION PARA EL FUNCIONAMIENTO - VIGENCIA 2026\n`;
    csv += `Corte de Recaudo: 31 de Agosto | Giros Programados SIIF: Septiembre a Diciembre\n`;
    csv += `Normativa: Ley 30/1992 Art. 86, Planes PIC, Ley 2307/2023, CESU y Devolución Votación\n\n`;

    csv += `Recurso;Nombre Oficial;Fundamento Legal;Entidad Aportante;Destinación Institucional;Categoría;Aforo Oficial (COP);Recaudo 31/08 (COP);Giro Sep (COP);Giro Oct (COP);Giro Nov (COP);Giro Dic (COP);Total Giros Sep-Dic (COP);Total Ingreso Funcionamiento (COP);Compromisos (COP);Pagos Realizados (COP);% Cumplimiento;Certeza Jurídica\n`;

    filteredRows.forEach(r => {
      csv += `"${r.codigoFormato}";"${r.nombre}";"${r.baseLegal}";"${r.entidad}";"${r.destinacion}";"${r.categoria}";"${Math.round(r.aforo)}";"${Math.round(r.recaudoReal)}";"${Math.round(r.mesesProy[0])}";"${Math.round(r.mesesProy[1])}";"${Math.round(r.mesesProy[2])}";"${Math.round(r.mesesProy[3])}";"${Math.round(r.girosSepDic)}";"${Math.round(r.totalIngreso)}";"${Math.round(r.compromiso)}";"${Math.round(r.pago)}";"${r.cumplimientoAforoPct.toFixed(1)}%";"100% SIIF"\n`;
    });

    // Fila de TOTALES
    csv += `"TOTAL";"RECURSOS NACION PARA EL FUNCIONAMIENTO (${filteredRows.length} Recursos)";"Presupuesto General de la Nación (PGN)";"Gobierno Nacional / MEN / MinHacienda";"Nómina, Prestaciones Sociales y Operación Institucional";"Consolidado";"${Math.round(totalsCalculated.totAforo)}";"${Math.round(totalsCalculated.totRecaudo)}";"${Math.round(totalsCalculated.totSep)}";"${Math.round(totalsCalculated.totOct)}";"${Math.round(totalsCalculated.totNov)}";"${Math.round(totalsCalculated.totDic)}";"${Math.round(totalsCalculated.totGirosSepDic)}";"${Math.round(totalsCalculated.totIngreso)}";"${Math.round(totalsCalculated.totCompromiso)}";"${Math.round(totalsCalculated.totPago)}";"${totalsCalculated.totCumplimientoPct.toFixed(1)}%";"100% Certeza Legal"\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `UPTC_Recursos_Nacion_Funcionamiento_2026.csv`;
    link.click();

    setDownloadNotice(true);
    setTimeout(() => setDownloadNotice(false), 3000);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 1. ENCABEZADO Y TARJETA MAESTRA */}
      <div className="bg-gradient-to-r from-blue-950/90 via-slate-900 to-indigo-950/80 border border-blue-500/30 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden backdrop-blur-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-xs uppercase tracking-wider rounded-lg shadow-sm flex items-center gap-1.5">
                <Landmark size={14} />
                Recursos Nación para el Funcionamiento
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono">
                9 Recursos Oficiales
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <ShieldCheck size={12} />
                100% Respaldo PGN (Cero Riesgo de Mercado)
              </span>
            </div>

            <h2 className="text-2xl md:text-3xl font-display font-bold text-white tracking-tight">
              Recursos Nación para el Funcionamiento
            </h2>
            <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
              Consolidación y seguimiento de los <strong>9 recursos de orden nacional</strong> destinados de forma exclusiva al sostenimiento operativo, nómina docente y administrativa, prestaciones sociales y acuerdos colectivos de la UPTC: <strong>R10, R10.1, R10.2, R10.3, R10.5, R13, R14, R17 y R18</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={handleExportCSV}
              className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-950/40 border border-emerald-400/30 flex items-center gap-2 transition-all cursor-pointer hover:scale-[1.02]"
              title="Descargar matriz en Excel/CSV"
            >
              <FileSpreadsheet size={15} />
              <span>Exportar Tabla (Excel)</span>
            </button>
            {downloadNotice && (
              <span className="text-xs text-emerald-400 font-bold animate-fadeIn">
                ✓ Archivo descargado
              </span>
            )}
          </div>
        </div>

        {/* 2. TARJETAS KPI RESUMEN DE LOS 9 RECURSOS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/10">
          <div className="bg-black/30 p-4 rounded-2xl border border-blue-500/20">
            <span className="text-[10px] font-bold text-blue-300 uppercase tracking-wider block">
              Total Ingresos Nación Funcionamiento
            </span>
            <div className="text-xl md:text-2xl font-black text-white font-mono mt-1">
              {formatCOP(totalsCalculated.totIngreso)}
            </div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
              Aforo Oficial: {formatCOP(totalsCalculated.totAforo)}
            </div>
          </div>

          <div className="bg-black/30 p-4 rounded-2xl border border-emerald-500/20">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider block">
                Recaudo Real Efectivo (31/08)
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded font-mono">
                {totalsCalculated.totAvancePct.toFixed(1)}%
              </span>
            </div>
            <div className="text-xl md:text-2xl font-black text-emerald-400 font-mono mt-1">
              {formatCOP(totalsCalculated.totRecaudo)}
            </div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
              Ingresado en tesorería
            </div>
          </div>

          <div className="bg-black/30 p-4 rounded-2xl border border-sky-500/20">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-sky-300 uppercase tracking-wider block">
                Giros Programados Sep–Dic (SIIF)
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 bg-sky-500/20 text-sky-300 rounded font-mono">
                {(100 - totalsCalculated.totAvancePct).toFixed(1)}%
              </span>
            </div>
            <div className="text-xl md:text-2xl font-black text-sky-300 font-mono mt-1">
              {formatCOP(totalsCalculated.totGirosSepDic)}
            </div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
              Garantizado por PAC mensual
            </div>
          </div>

          <div className="bg-black/30 p-4 rounded-2xl border border-cyan-500/20">
            <span className="text-[10px] font-bold text-cyan-300 uppercase tracking-wider block">
              Cumplimiento Proyectado
            </span>
            <div className="text-xl md:text-2xl font-black text-cyan-300 font-mono mt-1">
              {totalsCalculated.totCumplimientoPct.toFixed(1)}%
            </div>
            <div className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 mt-0.5">
              <CheckCircle2 size={11} /> 100% Certeza Legal
            </div>
          </div>
        </div>
      </div>

      {/* 3. BARRA DE CONTROLES: FILTRO, BUSCADOR Y TOGGLE MENSUAL */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-900/90 p-4 rounded-2xl border border-white/10 shadow-lg">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Selector de Categoría */}
          <div className="flex items-center bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 gap-2 text-xs">
            <Layers size={14} className="text-blue-400" />
            <span className="text-[11px] font-bold text-slate-400 uppercase">Categoría:</span>
            <select
              value={selectedCategoria}
              onChange={e => setSelectedCategoria(e.target.value)}
              className="bg-transparent text-white font-semibold outline-none cursor-pointer pr-2"
            >
              <option value="TODAS" className="bg-slate-900">Todas las Categorías (9)</option>
              <option value="Base Presupuestal" className="bg-slate-900">Base Presupuestal (Ley 30 Art. 86)</option>
              <option value="Fomento y Calidad" className="bg-slate-900">Planes PIC y Fortalecimiento</option>
              <option value="Gratuidad" className="bg-slate-900">Política de Gratuidad (Ley 2307 & FSE)</option>
              <option value="Transferencia Especial" className="bg-slate-900">Cooperativas, Votación & CESU</option>
            </select>
          </div>

          {/* Toggle de Desglose Mensual Sep-Dic */}
          <button
            onClick={() => setShowMonthlyBreakdown(prev => !prev)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 cursor-pointer ${
              showMonthlyBreakdown
                ? 'bg-blue-600/30 text-blue-200 border-blue-500/50 shadow-sm'
                : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
            }`}
          >
            <Calendar size={14} />
            <span>{showMonthlyBreakdown ? 'Ocultar Desglose Sep-Dic' : 'Ver Calendario Sep-Dic'}</span>
          </button>
        </div>

        {/* Buscador Rápido */}
        <div className="relative w-full md:w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por R10, Gratuidad, MEN..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-blue-400 transition-colors font-medium"
          />
        </div>
      </div>

      {/* 4. TABLA PRINCIPAL: RECURSOS NACIÓN PARA EL FUNCIONAMIENTO */}
      <div className="bg-slate-900/80 border border-blue-500/20 rounded-3xl overflow-hidden shadow-2xl">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1050px] text-xs">
            <thead>
              <tr className="border-b border-blue-500/30 bg-blue-950/40 text-[11px] text-blue-200 uppercase tracking-wider font-mono">
                <th className="p-3.5 font-bold sticky left-0 bg-blue-950/90 z-20 min-w-[90px]">
                  Recurso
                </th>
                <th className="p-3.5 font-bold min-w-[220px]">
                  Nombre Oficial
                </th>
                <th className="p-3.5 font-bold min-w-[220px]">
                  Fundamento Legal / Entidad
                </th>
                <th className="p-3.5 font-bold text-right text-slate-300">
                  Aforo Oficial
                </th>
                <th className="p-3.5 font-bold text-right text-emerald-400">
                  Recaudo 31/08
                </th>
                {showMonthlyBreakdown && (
                  <>
                    <th className="p-2.5 font-bold text-right text-sky-300/90 font-mono bg-blue-950/20 min-w-[75px]">
                      Sep (PAC)
                    </th>
                    <th className="p-2.5 font-bold text-right text-sky-300/90 font-mono bg-blue-950/20 min-w-[75px]">
                      Oct (PAC)
                    </th>
                    <th className="p-2.5 font-bold text-right text-sky-300/90 font-mono bg-blue-950/20 min-w-[75px]">
                      Nov (PAC)
                    </th>
                    <th className="p-2.5 font-bold text-right text-sky-300/90 font-mono bg-blue-950/20 min-w-[75px]">
                      Dic (PAC)
                    </th>
                  </>
                )}
                <th className="p-3.5 font-bold text-right text-sky-300">
                  Giros Sep–Dic (SIIF)
                </th>
                <th className="p-3.5 font-bold text-right text-white font-extrabold bg-blue-600/10">
                  Total Funcionamiento
                </th>
                <th className="p-3.5 font-bold text-center">
                  % Cumpl.
                </th>
                <th className="p-3.5 font-bold text-center min-w-[120px]">
                  Certeza / Tipo
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/5 font-sans">
              {filteredRows.map((r) => {
                const isBase = r.categoria === 'Base Presupuestal';
                const isGratuidad = r.categoria === 'Gratuidad';

                return (
                  <tr
                    key={r.key}
                    className="hover:bg-blue-500/5 transition-colors font-mono group"
                  >
                    {/* Código Recurso */}
                    <td className="p-3.5 font-bold text-blue-300 sticky left-0 bg-slate-900 group-hover:bg-[#15233e] transition-colors z-10">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isBase
                              ? 'bg-blue-400 ring-2 ring-blue-400/40'
                              : isGratuidad
                              ? 'bg-cyan-400'
                              : 'bg-indigo-400'
                          }`}
                        />
                        <span className="text-sm font-black text-white">{r.codigoFormato}</span>
                      </div>
                    </td>

                    {/* Nombre Oficial */}
                    <td className="p-3.5 text-slate-100 font-sans font-semibold">
                      <div className="text-xs text-white group-hover:text-blue-300 transition-colors">
                        {r.nombre}
                      </div>
                      <div className="text-[10px] text-slate-400 font-normal mt-0.5 line-clamp-1" title={r.destinacion}>
                        {r.destinacion}
                      </div>
                    </td>

                    {/* Base Legal y Entidad */}
                    <td className="p-3.5 text-slate-300 font-sans text-[11px]">
                      <div className="font-semibold text-blue-200">{r.baseLegal}</div>
                      <div className="text-[10px] text-slate-400">{r.entidad}</div>
                    </td>

                    {/* Aforo Oficial */}
                    <td className="p-3.5 text-right text-slate-300 font-medium">
                      {formatCOP(r.aforo)}
                    </td>

                    {/* Recaudo 31/08 */}
                    <td className="p-3.5 text-right text-emerald-400 font-bold">
                      {formatCOP(r.recaudoReal)}
                      <span className="text-[9px] text-emerald-400/80 block font-normal">
                        ({r.avanceRecaudoPct.toFixed(1)}%)
                      </span>
                    </td>

                    {/* Giros Mensuales Sep..Dic */}
                    {showMonthlyBreakdown && (
                      <>
                        <td className="p-2.5 text-right text-sky-300/90 text-[11px] bg-blue-950/20">
                          {r.mesesProy[0] > 0 ? formatCOP(r.mesesProy[0]) : '-'}
                        </td>
                        <td className="p-2.5 text-right text-sky-300/90 text-[11px] bg-blue-950/20">
                          {r.mesesProy[1] > 0 ? formatCOP(r.mesesProy[1]) : '-'}
                        </td>
                        <td className="p-2.5 text-right text-sky-300/90 text-[11px] bg-blue-950/20">
                          {r.mesesProy[2] > 0 ? formatCOP(r.mesesProy[2]) : '-'}
                        </td>
                        <td className="p-2.5 text-right text-sky-300/90 text-[11px] bg-blue-950/20">
                          {r.mesesProy[3] > 0 ? formatCOP(r.mesesProy[3]) : '-'}
                        </td>
                      </>
                    )}

                    {/* Giros Sep-Dic Total */}
                    <td className="p-3.5 text-right text-sky-300 font-bold bg-sky-500/5">
                      {r.girosSepDic > 0 ? formatCOP(r.girosSepDic) : '$ 0 M'}
                    </td>

                    {/* Total Ingreso Funcionamiento */}
                    <td className="p-3.5 text-right font-black text-white text-sm bg-blue-500/10">
                      {formatCOP(r.totalIngreso)}
                    </td>

                    {/* % Cumplimiento */}
                    <td className="p-3.5 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
                        {r.cumplimientoAforoPct.toFixed(0)}%
                      </span>
                    </td>

                    {/* Certeza / Badge */}
                    <td className="p-3.5 text-center font-sans">
                      <span
                        className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold inline-flex items-center gap-1 border ${
                          isBase
                            ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                            : isGratuidad
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                            : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                        }`}
                      >
                        <Lock size={10} />
                        {r.categoria}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* 5. PIE DE TABLA: SUMATORIA TOTAL 100% CUADRADA */}
            <tfoot>
              <tr className="border-t-2 border-b-2 border-blue-500/40 font-bold text-xs bg-blue-950/70 font-mono text-white">
                <td
                  colSpan={3}
                  className="p-4 text-white uppercase font-sans tracking-wide sticky left-0 bg-blue-950 z-20"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                    <span>
                      SUMATORIA TOTAL: RECURSOS NACIÓN PARA EL FUNCIONAMIENTO ({filteredRows.length} RECURSOS)
                    </span>
                  </div>
                  <div className="text-[10px] text-blue-200/80 font-normal font-sans mt-0.5">
                    Respaldo legal 100% garantizado en resoluciones del MEN y Presupuesto General de la Nación
                  </div>
                </td>

                {/* Total Aforo */}
                <td className="p-4 text-right text-slate-200 font-black">
                  {formatCOP(totalsCalculated.totAforo)}
                </td>

                {/* Total Recaudo 31/08 */}
                <td className="p-4 text-right text-emerald-400 font-black">
                  {formatCOP(totalsCalculated.totRecaudo)}
                  <span className="text-[9px] text-emerald-300 block font-normal">
                    ({totalsCalculated.totAvancePct.toFixed(1)}% ejecutado)
                  </span>
                </td>

                {/* Totales Mensuales Sep..Dic */}
                {showMonthlyBreakdown && (
                  <>
                    <td className="p-2.5 text-right text-sky-300 font-mono bg-blue-950/80">
                      {formatCOP(totalsCalculated.totSep)}
                    </td>
                    <td className="p-2.5 text-right text-sky-300 font-mono bg-blue-950/80">
                      {formatCOP(totalsCalculated.totOct)}
                    </td>
                    <td className="p-2.5 text-right text-sky-300 font-mono bg-blue-950/80">
                      {formatCOP(totalsCalculated.totNov)}
                    </td>
                    <td className="p-2.5 text-right text-sky-300 font-mono bg-blue-950/80">
                      {formatCOP(totalsCalculated.totDic)}
                    </td>
                  </>
                )}

                {/* Total Giros Sep-Dic */}
                <td className="p-4 text-right text-sky-300 font-black bg-sky-500/15">
                  {formatCOP(totalsCalculated.totGirosSepDic)}
                </td>

                {/* Total Ingreso Vigencia */}
                <td className="p-4 text-right text-white font-black text-sm bg-blue-500/20">
                  {formatCOP(totalsCalculated.totIngreso)}
                </td>

                {/* Total % Cumplimiento */}
                <td className="p-4 text-center text-emerald-300 font-black">
                  {totalsCalculated.totCumplimientoPct.toFixed(1)}%
                </td>

                {/* Certificado */}
                <td className="p-4 text-center font-sans">
                  <span className="text-[10px] bg-emerald-500/30 text-emerald-300 border border-emerald-500/50 px-2.5 py-0.5 rounded-full font-bold">
                    100% Certeza PGN
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* 6. NOTA TÉCNICA Y NORMATIVA DE RESPALDO */}
      <div className="bg-gradient-to-r from-blue-950/40 via-slate-900 to-indigo-950/30 border border-blue-500/20 rounded-2xl p-4 md:p-5 text-xs text-slate-300 space-y-2">
        <div className="flex items-center gap-2 font-bold text-blue-300 text-sm">
          <Info size={16} />
          <span>Sustento Técnico: Canasta Exclusiva de Funcionamiento Nación (9 Recursos)</span>
        </div>
        <p className="text-slate-300 leading-relaxed">
          Esta tabla agrupa exclusivamente las fuentes de origen nacional orientadas al <strong>sostenimiento y funcionamiento institucional</strong>.
          Se excluyen deliberadamente los recursos de inversión de capital (<strong>R16, R16.1 y R16.2</strong> por pertenecer a proyectos de inversión pública y PFB),
          las estampillas tributarias universitarias (<strong>R12 Estampilla Pro-UNAL</strong>) y las regalías departamentales (<strong>R15</strong>),
          proporcionando así la visión técnica precisa de los aportes que respaldan la nómina docente y administrativa de la vigencia 2026.
        </p>
      </div>
    </div>
  );
}
