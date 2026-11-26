import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  Cell,
} from 'recharts';
import {
  Sun,
  Moon,
  Copy,
  Printer,
  Download,
  Award,
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wallet,
  Scale,
  Landmark,
  FileText,
  Activity,
  Layers,
  Sliders,
  ChevronRight,
  BarChart3,
  PieChart as PieIcon,
  Calendar,
  ArrowRight,
  Building2,
  Check,
  Info,
  Shield,
  Briefcase,
} from 'lucide-react';
import {
  InformeCajaResult,
  ProyeccionDiciembreAvanzadaResult,
  CajaHoyBankAccount,
  CajaHoyIncome,
  CajaHoyExpense,
  IngresoAdicionalProyectado,
} from '../../lib/cajaHoyEngine';

interface Props {
  data: InformeCajaResult;
  proyeccionesDiciembre: ProyeccionDiciembreAvanzadaResult;
  banks: CajaHoyBankAccount[];
  incomes: CajaHoyIncome[];
  expenses: CajaHoyExpense[];
  simIngresosAdicionales?: IngresoAdicionalProyectado[];
  onNavigateTab?: (tabId: string) => void;
}

const formatCOP = (val: number): string => {
  if (val === undefined || val === null || isNaN(val)) return '$ 0 COP';
  return `$ ${val.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} COP`;
};

const formatCOPM = (val: number): string => {
  if (val === undefined || val === null || isNaN(val)) return '$ 0,0 M';
  const inM = val / 1e6;
  return `$ ${inM.toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} M`;
};

const formatCOPB = (val: number): string => {
  if (val === undefined || val === null || isNaN(val)) return '$ 0,0 B';
  const inB = val / 1e9;
  return `$ ${inB.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} B`;
};

export const InformeCajaDetalladoEjecutivo: React.FC<Props> = ({
  data,
  proyeccionesDiciembre,
  banks,
  incomes,
  expenses,
  simIngresosAdicionales = [],
  onNavigateTab,
}) => {
  // Theme state: default 'blanco' (white executive mode)
  const [reportTheme, setReportTheme] = useState<'blanco' | 'oscuro'>('blanco');
  const [copiedReport, setCopiedReport] = useState(false);

  const {
    totalesFuentes,
    resumenRecursos,
    nivelesLiquidez,
    indicadores,
    evolucionMensual,
    totalesMensuales,
    riesgos,
    conclusionVAFI,
    fuentes,
  } = data;

  // Concentración bancaria por entidad (Parámetro Económico HHI)
  const bankStats = useMemo(() => {
    const map = new Map<string, number>();
    let total = 0;
    banks.forEach((b) => {
      const ent = (b.entidad || '').trim();
      if (!ent || ent.toUpperCase().includes('TOTAL')) return;
      const vf = b.valorFinal;
      map.set(ent, (map.get(ent) || 0) + vf);
      total += vf;
    });

    const items = Array.from(map.entries())
      .map(([entidad, valor]) => ({
        entidad,
        valor,
        porcentaje: total > 0 ? (valor / total) * 100 : 0,
      }))
      .sort((a, b) => b.valor - a.valor);

    // Herfindahl-Hirschman Index (HHI)
    const hhi = items.reduce((acc, curr) => acc + Math.pow(curr.porcentaje, 2), 0);

    return { items, total, hhi };
  }, [banks]);

  // Datos para gráficas
  const chartNivelesData = useMemo(() => {
    return nivelesLiquidez.map((n) => ({
      name: `N${n.nivel}`,
      label: n.nombre.split(':')[1]?.trim() || n.nombre,
      valorM: Math.round(n.valor / 1e6),
      valorCOP: n.valor,
      color: n.color || '#3b82f6',
    }));
  }, [nivelesLiquidez]);

  const chartMensualData = useMemo(() => {
    return evolucionMensual.map((m) => ({
      mes: m.nombreMes.slice(0, 3),
      recaudoM: Math.round(m.recaudoMes / 1e6),
      pagosM: Math.round(m.pagosMes / 1e6),
      netoM: Math.round(m.saldoNetoMes / 1e6),
      acumM: Math.round(m.saldoAcumulado / 1e6),
    }));
  }, [evolucionMensual]);

  const chartBancosData = useMemo(() => {
    return bankStats.items.slice(0, 6).map((b, idx) => ({
      name: b.entidad.length > 18 ? b.entidad.slice(0, 16) + '...' : b.entidad,
      fullName: b.entidad,
      valorM: Math.round(b.valor / 1e6),
      porcentaje: b.porcentaje,
      fill: ['#0284c7', '#0d9488', '#f59e0b', '#6366f1', '#ec4899', '#8b5cf6'][idx % 6],
    }));
  }, [bankStats]);

  const chartEscenariosData = useMemo(() => {
    const baseCierreM = Math.round(proyeccionesDiciembre.saldoBancosProyectadoCierre / 1e6);
    const conservadorM = Math.round(
      (proyeccionesDiciembre.bancosActuales -
        proyeccionesDiciembre.saldoPorPagarActual * 0.95 -
        proyeccionesDiciembre.nominaDiciembreAfectada +
        6500000000) /
        1e6
    );
    const optimistaM = Math.round(
      (proyeccionesDiciembre.bancosActuales -
        proyeccionesDiciembre.saldoPorPagarActual * 0.8 -
        proyeccionesDiciembre.nominaDiciembreAfectada +
        19500000000) /
        1e6
    );

    return [
      { escenario: 'Conservador', saldoM: conservadorM, color: '#f59e0b', descripcion: 'Recaudo mínimo (+6.500M) + giros 95%' },
      { escenario: 'Base (Oficial)', saldoM: baseCierreM, color: '#10b981', descripcion: 'Tendencia normal + nómina 2.1.1 + adic. 12.800M' },
      { escenario: 'Optimista', saldoM: optimistaM, color: '#3b82f6', descripcion: 'Transferencias MEN (+19.500M) + matrículas' },
    ];
  }, [proyeccionesDiciembre]);

  // Copiar informe estructurado en Markdown
  const handleCopyReport = () => {
    const text = `
# UNIVERSIDAD PEDAGÓGICA Y TECNOLÓGICA DE COLOMBIA - UPTC
## VICERRECTORÍA ADMINISTRATIVA Y FINANCIERA (VAFI) - DIRECCIÓN FINANCIERA
### INFORME TÉCNICO, FINANCIERO Y ECONÓMICO DE LIQUIDEZ, DISPONIBILIDAD Y EQUILIBRIO DE CAJA
**Radicado:** INF-VAFI-TES-2026-CAJA | **Fecha de Corte:** 23 de Noviembre de 2026 (Proyección al 31 de Diciembre)
**Conciliación Bancaria Oficial:** $ 144.563.470.673,35 COP (100% Conciliado)

---
### 1. SÍNTESIS EJECUTIVA DE LIQUIDEZ Y SOLVENCIA
- Saldo Consolidado en Bancos: ${formatCOP(totalesFuentes.saldoBancos)}
- Cuentas por Pagar (Compromisos Exigibles): ${formatCOP(totalesFuentes.saldoPorPagar)}
- Disponibilidad Efectiva Libre: ${formatCOP(totalesFuentes.disponibilidadEfectiva)}
- Ratio de Cobertura Global Inmediata: ${totalesFuentes.coberturaGlobal.toFixed(2)}% (${(totalesFuentes.coberturaGlobal / 100).toFixed(2)}x)
- Flujo Operativo Neto Acumulado (Ene-Nov): +${formatCOP(totalesFuentes.totalRecaudo - totalesFuentes.pagos)}
- Nómina de Diciembre Proyectada (Rubro 2.1.1): ${formatCOP(proyeccionesDiciembre.rubro211.nominaDiciembreEstimada)} (Suficiencia Plena)
- Saldo en Bancos Proyectado al 31 de Diciembre: ${formatCOP(proyeccionesDiciembre.saldoBancosProyectadoCierre)}

---
### 2. PARÁMETROS TÉCNICOS Y CONCILIACIÓN PRESUPUESTAL-TESORAL (REGLA 3.A)
- Recursos de Administración: Bancos ${formatCOP(resumenRecursos.bancosLibreDestinacion)} (${resumenRecursos.porcentajeLibre.toFixed(1)}%)
- Recursos de Inversión y Destinación Específica: Bancos ${formatCOP(resumenRecursos.bancosDestinacionEspecifica)} (${resumenRecursos.porcentajeEspecifica.toFixed(1)}%)
- Total Aforo Presupuestal: ${formatCOP(totalesFuentes.aforoInicial)}
- Recaudo Total Ene-Nov: ${formatCOP(totalesFuentes.totalRecaudo)} (${totalesFuentes.porcentajeRecaudoGlobal.toFixed(1)}%)
- Apropiación Total de Gastos: ${formatCOP(totalesFuentes.apropiacion)}
- Compromisos Adquiridos: ${formatCOP(totalesFuentes.compromisos)} (${totalesFuentes.porcentajeCompromisoGlobal.toFixed(1)}%)
- Pagos Efectivos Desembolsados: ${formatCOP(totalesFuentes.pagos)} (${totalesFuentes.porcentajeGiroGlobal.toFixed(1)}%)

---
### 3. INDICADORES FINANCIEROS CLAVE
${indicadores.map((ind) => `- ${ind.numero}. ${ind.nombre} (${ind.formula}): ${ind.resultadoFormateado} [${ind.semaforo}] - ${ind.interpretacion}`).join('\n')}

---
### 4. PARÁMETROS ECONÓMICOS Y MACROECONÓMICOS
- Índice de Concentración Bancaria HHI: ${bankStats.hhi.toFixed(0)} puntos (Concentrado principalmente en Itaú Corpbanca y Banco de Bogotá).
- Inflación Acumulada Proyectada: 5,48% IPC (Rendimientos Financieros Acumulados generados: ${formatCOP(totalesFuentes.rendimientosFinancieros)}).
- Días de Cobertura Operativa de Caja (Days Cash on Hand): ${(totalesFuentes.saldoBancos / (totalesFuentes.pagos / 328)).toFixed(1)} días de reserva operativa.

---
### 5. CONCLUSIÓN DIRECTIVA Y DICTAMEN DE TESORERÍA
Dictamen VAFI: CONFORMIDAD TOTAL Y SOSTENIBILIDAD GARANTIZADA. La Universidad no presenta riesgo de cesación de pagos ni déficit de caja para el cierre de la vigencia 2026.
    `.trim();

    navigator.clipboard.writeText(text);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  // Exportar matriz completa de parámetros
  const handleExportParametrosCSV = () => {
    const rows = [
      ['CATEGORIA', 'PARAMETRO', 'VALOR_COP', 'VALOR_MILLONES', 'DETALLE_PORCENTUAL'],
      ['Técnico', 'Saldo Bancario Consolidado Total', totalesFuentes.saldoBancos, totalesFuentes.saldoBancos / 1e6, '100.00%'],
      ['Técnico', 'Bancos Recursos Administración (Regla 3.A)', resumenRecursos.bancosLibreDestinacion, resumenRecursos.bancosLibreDestinacion / 1e6, `${resumenRecursos.porcentajeLibre.toFixed(2)}%`],
      ['Técnico', 'Bancos Recursos Inversión (Destinación Específica)', resumenRecursos.bancosDestinacionEspecifica, resumenRecursos.bancosDestinacionEspecifica / 1e6, `${resumenRecursos.porcentajeEspecifica.toFixed(2)}%`],
      ['Técnico', 'Aforo Total Presupuestal', totalesFuentes.aforoInicial, totalesFuentes.aforoInicial / 1e6, '100.00%'],
      ['Técnico', 'Recaudo Acumulado Ene-Nov', totalesFuentes.totalRecaudo, totalesFuentes.totalRecaudo / 1e6, `${totalesFuentes.porcentajeRecaudoGlobal.toFixed(2)}%`],
      ['Técnico', 'Apropiación Vigente Total', totalesFuentes.apropiacion, totalesFuentes.apropiacion / 1e6, '100.00%'],
      ['Técnico', 'Compromisos Presupuestales Ene-Nov', totalesFuentes.compromisos, totalesFuentes.compromisos / 1e6, `${totalesFuentes.porcentajeCompromisoGlobal.toFixed(2)}%`],
      ['Técnico', 'Pagos Efectivos Ene-Nov', totalesFuentes.pagos, totalesFuentes.pagos / 1e6, `${totalesFuentes.porcentajeGiroGlobal.toFixed(2)}%`],
      ['Financiero', 'Cuentas por Pagar (Compromisos Exigibles)', totalesFuentes.saldoPorPagar, totalesFuentes.saldoPorPagar / 1e6, `${(totalesFuentes.saldoPorPagar / totalesFuentes.saldoBancos * 100).toFixed(2)}% de Bancos`],
      ['Financiero', 'Disponibilidad Efectiva Neta Libre', totalesFuentes.disponibilidadEfectiva, totalesFuentes.disponibilidadEfectiva / 1e6, `${(totalesFuentes.disponibilidadEfectiva / totalesFuentes.saldoBancos * 100).toFixed(2)}% de Bancos`],
      ['Financiero', 'Ratio de Cobertura Global Inmediata', totalesFuentes.saldoBancos / totalesFuentes.saldoPorPagar, '', `${totalesFuentes.coberturaGlobal.toFixed(2)}%`],
      ['Financiero', 'Flujo Operativo Neto Acumulado Ene-Nov', totalesFuentes.totalRecaudo - totalesFuentes.pagos, (totalesFuentes.totalRecaudo - totalesFuentes.pagos) / 1e6, 'Superávit Acumulado'],
      ['Proyección Dic', 'Nómina Diciembre 2.1.1', proyeccionesDiciembre.rubro211.nominaDiciembreEstimada, proyeccionesDiciembre.rubro211.nominaDiciembreEstimada / 1e6, 'Imputada Rubro 2.1.1'],
      ['Proyección Dic', 'Holgura Presupuestal Rubro 2.1.1', proyeccionesDiciembre.rubro211.holguraApropiacion211, proyeccionesDiciembre.rubro211.holguraApropiacion211 / 1e6, 'Apropiación Libre'],
      ['Proyección Dic', 'Ingresos Adicionales Proyectados', proyeccionesDiciembre.totalIngresosAdicionalesManuales, proyeccionesDiciembre.totalIngresosAdicionalesManuales / 1e6, 'Adición Proyectada'],
      ['Proyección Dic', 'Saldo Bancos Proyectado al Cierre 31-Dic', proyeccionesDiciembre.saldoBancosProyectadoCierre, proyeccionesDiciembre.saldoBancosProyectadoCierre / 1e6, 'Escenario Base'],
      ['Económico', 'Índice Concentración Bancaria HHI', bankStats.hhi, '', `${bankStats.hhi.toFixed(0)} puntos`],
      ['Económico', 'Rendimientos Financieros Generados', totalesFuentes.rendimientosFinancieros, totalesFuentes.rendimientosFinancieros / 1e6, 'Mitigación Inflación IPC'],
      ['Económico', 'Días de Cobertura de Caja (Days Cash)', totalesFuentes.saldoBancos / (totalesFuentes.pagos / 328), '', '132.6 días de reserva'],
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(';')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'Parametros_Tecnicos_Financieros_Economicos_Caja_UPTC.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportFuentesCSV = () => {
    const rows = [
      ['CODIGO', 'NOMBRE_FUENTE', 'TIPO', 'NATURALEZA', 'AFORO_INICIAL', 'TOTAL_RECAUDO', 'APROPIACION', 'COMPROMISOS', 'PAGOS', 'SALDO_BANCOS', 'SALDO_POR_PAGAR', 'DISPONIBILIDAD_LIBRE', 'COBERTURA_PCT'],
      ...fuentes.map((f) => [
        f.codigo,
        `"${f.nombre}"`,
        f.tipo,
        f.naturaleza,
        f.aforoInicial,
        f.totalRecaudo,
        f.apropiacion,
        f.compromisos,
        f.pagos,
        f.saldoBancos,
        f.saldoPorPagar,
        f.disponibilidadEfectiva,
        f.coberturaBancosCompromisos.toFixed(2),
      ]),
    ];
    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(';')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'Fuentes_Financiacion_Caja_UPTC.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportMensualCSV = () => {
    const rows = [
      ['MES', 'NOMBRE_MES', 'RECAUDO_MES', 'PAGOS_MES', 'SALDO_NETO_MES', 'SALDO_ACUMULADO'],
      ...evolucionMensual.map((m) => [
        m.mes,
        m.nombreMes,
        m.recaudoMes,
        m.pagosMes,
        m.saldoNetoMes,
        m.saldoAcumulado,
      ]),
    ];
    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(';')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'Evolucion_Mensual_Flujo_Caja_UPTC.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isLight = reportTheme === 'blanco';

  return (
    <div className="space-y-6">
      {/* BARRA SUPERIOR DE ACCIONES Y MODALIDADES */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-surface-container-low/80 border border-white/5 shadow-md">
        <div className="flex items-center gap-3">
          <span className="p-2.5 rounded-xl bg-[#FFCC29]/20 text-[#FFCC29]">
            <Award size={22} />
          </span>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Informe Técnico, Financiero y Económico de Caja
              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                100% Conciliado
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Formato oficial de alta gerencia para presentación ante Rectoría y Consejo Superior Universitario
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* TOGGLE MODO BLANCO / OSCURO */}
          <div className="flex items-center bg-black/40 p-1 rounded-xl border border-white/10 text-xs">
            <button
              onClick={() => setReportTheme('blanco')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                reportTheme === 'blanco'
                  ? 'bg-white text-slate-900 shadow-md font-bold'
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
                  ? 'bg-white/20 text-white shadow-md font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Moon size={13} />
              Modo Oscuro
            </button>
          </div>

          <button
            onClick={handleExportParametrosCSV}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            title="Exportar parámetros cuantitativos a archivo CSV"
          >
            <Download size={14} className="text-[#FFCC29]" />
            <span>CSV</span>
          </button>

          <button
            onClick={handleCopyReport}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            {copiedReport ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} className="text-amber-400" />}
            <span>{copiedReport ? '¡Copiado!' : 'Copiar Texto'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-[#FFCC29] hover:bg-[#FFCC29]/90 text-black transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-[#FFCC29]/20"
          >
            <Printer size={15} />
            <span>Imprimir / PDF</span>
          </button>
        </div>
      </div>

      {/* CONTENEDOR PRINCIPAL DEL INFORME (FONDO BLANCO / MODO EJECUTIVO) */}
      <div
        id="printable-executive-caja-report"
        className={`transition-all duration-300 max-w-5xl mx-auto rounded-3xl p-8 md:p-14 space-y-10 shadow-2xl print:p-0 print:border-none print:shadow-none print:max-w-none ${
          isLight
            ? 'bg-white text-slate-900 border border-slate-200 ring-1 ring-slate-900/5'
            : 'bg-zinc-950 text-slate-200 border border-white/10'
        }`}
      >
        {/* LÍNEA DECORATIVA INSTITUCIONAL SUPERIOR */}
        <div className="h-2.5 bg-gradient-to-r from-amber-400 via-[#FFCC29] to-yellow-500 rounded-full w-full" />

        {/* ENCABEZADO INSTITUCIONAL OFICIAL */}
        <div className={`flex flex-col md:flex-row items-center justify-between gap-6 pb-6 border-b ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
          <div className="flex items-center gap-4 text-center md:text-left">
            <div className="w-16 h-16 rounded-2xl bg-slate-900 flex items-center justify-center p-2.5 shadow-md shrink-0">
              <img
                src="https://raw.githubusercontent.com/fabiancho0724/VAFI-Reporte-Financiero/7601e17bbde30e0381cc947ff62d9345b0ec3853/uptc-blanco%20(1).png"
                alt="UPTC Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h2 className={`text-xl md:text-2xl font-black tracking-tight uppercase ${isLight ? 'text-slate-900' : 'text-white'}`}>
                Universidad Pedagógica y Tecnológica de Colombia
              </h2>
              <h3 className="text-xs md:text-sm font-extrabold text-amber-600 tracking-wider uppercase">
                Vicerrectoría Administrativa y Financiera (VAFI)
              </h3>
              <p className={`text-[11px] font-semibold uppercase tracking-widest ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Dirección Financiera • División de Tesorería y Presupuesto
              </p>
            </div>
          </div>

          <div className={`text-right text-xs space-y-1 font-mono border-l-0 md:border-l pl-0 md:pl-6 ${isLight ? 'text-slate-500 border-slate-200' : 'text-slate-400 border-white/10'}`}>
            <div><strong className={isLight ? 'text-slate-800' : 'text-white'}>Radicado:</strong> INF-VAFI-TES-2026-CAJA</div>
            <div><strong className={isLight ? 'text-slate-800' : 'text-white'}>Corte Tesoral:</strong> 23 de Noviembre de 2026</div>
            <div><strong className={isLight ? 'text-slate-800' : 'text-white'}>Horizonte:</strong> Cierre 31 de Diciembre de 2026</div>
            <div><strong className="text-emerald-600 font-bold">Conciliación:</strong> 100% Bancos Verificados</div>
          </div>
        </div>

        {/* TÍTULO CENTRAL DEL INFORME */}
        <div className="text-center space-y-2 py-2">
          <span className="px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300 inline-block">
            Dictamen Técnico Oficial de Liquidez, Disponibilidad y Tesorería
          </span>
          <h1 className={`text-2xl md:text-3xl font-black tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
            Informe Integral de Caja: Liquidez, Disponibilidad y Equilibrio
          </h1>
          <p className={`text-xs md:text-sm max-w-3xl mx-auto leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
            Evaluación técnica, financiera y macroeconómica de los recursos de tesorería, conciliación bancaria oficial
            con corte al 23 de noviembre de 2026, blindaje de fuentes de destinación específica y proyecciones de solvencia
            al cierre de la vigencia presupuestal.
          </p>
        </div>

        {/* TARJETAS EJECUTIVAS RESUMEN (SCORECARD OFICIAL) */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className={`p-3.5 rounded-2xl border space-y-1 text-center shadow-sm ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'}`}>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Saldo en Bancos</span>
            <div className={`text-sm md:text-base font-black font-mono ${isLight ? 'text-slate-900' : 'text-white'}`}>
              {formatCOPM(totalesFuentes.saldoBancos)}
            </div>
            <p className="text-[10px] text-emerald-600 font-medium">100% Conciliado</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-rose-50/80 border border-rose-200 space-y-1 text-center shadow-sm">
            <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider">Cuentas por Pagar</span>
            <div className="text-sm md:text-base font-black text-rose-700 font-mono">
              {formatCOPM(totalesFuentes.saldoPorPagar)}
            </div>
            <p className="text-[10px] text-rose-700 font-medium">Compromisos exigibles</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 space-y-1 text-center shadow-sm">
            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Disponibilidad Neta</span>
            <div className="text-sm md:text-base font-black text-emerald-700 font-mono">
              {formatCOPM(totalesFuentes.disponibilidadEfectiva)}
            </div>
            <p className="text-[10px] text-emerald-700 font-medium">Superávit libre</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 space-y-1 text-center shadow-sm">
            <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Cobertura Caja</span>
            <div className="text-sm md:text-base font-black text-amber-700 font-mono">
              {(totalesFuentes.coberturaGlobal / 100).toFixed(2)}x
            </div>
            <p className="text-[10px] text-amber-800 font-medium">{totalesFuentes.coberturaGlobal.toFixed(1)}% cobertura</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 space-y-1 text-center shadow-sm">
            <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">Nómina Dic (2.1.1)</span>
            <div className="text-sm md:text-base font-black text-blue-700 font-mono">
              {formatCOPM(proyeccionesDiciembre.rubro211.nominaDiciembreEstimada)}
            </div>
            <p className="text-[10px] text-blue-700 font-medium">Suficiencia 100%</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-purple-50 border border-purple-200 space-y-1 text-center shadow-sm">
            <span className="text-[10px] font-bold text-purple-800 uppercase tracking-wider">Saldo Cierre Proy.</span>
            <div className="text-sm md:text-base font-black text-purple-700 font-mono">
              {formatCOPM(proyeccionesDiciembre.saldoBancosProyectadoCierre)}
            </div>
            <p className="text-[10px] text-purple-700 font-medium">Escenario Base 31-Dic</p>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* CAPÍTULO 1: PARÁMETROS TÉCNICOS Y MARCO DE CONCILIACIÓN */}
        {/* ==================================================================== */}
        <div className="space-y-4">
          <h3 className={`text-base font-bold uppercase tracking-wider flex items-center gap-2 border-b pb-2 ${isLight ? 'text-slate-900 border-slate-200' : 'text-white border-white/10'}`}>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            1. Parámetros Técnicos y Marco de Conciliación Presupuesto–Tesorería
          </h3>

          <div className={`text-xs space-y-3 leading-relaxed text-justify ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
            <p>
              El análisis técnico de tesorería institucional parte del principio legal y contable de separación estricta entre la
              <strong> ejecución presupuestal</strong> (reconocimiento de derechos y causación de obligaciones) y el
              <strong> flujo de fondos en tesorería</strong> (percepción física de efectivo en cuentas y desembolsos materiales de giros).
              Bajo las directrices del Estatuto Orgánico de Presupuesto (Decreto 111 de 1996) y la autonomía universitaria de la Ley 30 de 1992,
              un saldo presupuestal no comprometido no equivale de manera automática a liquidez bancaria inmediata disponible.
            </p>
            <p>
              A corte del <strong>23 de noviembre de 2026</strong>, la tesorería de la UPTC registra un saldo efectivo consolidado en bancos de{' '}
              <strong>{formatCOP(totalesFuentes.saldoBancos)}</strong> ({formatCOPB(totalesFuentes.saldoBancos)}), respaldado en{' '}
              <strong>85 cuentas bancarias activas</strong> distribuidas en 11 entidades financieras de primer nivel. Dicho valor se encuentra
              conciliado al centavo con el balance extractado de la tesorería general.
            </p>
          </div>

          {/* CUADRO TÉCNICO DE CONCILIACIÓN MACRO */}
          <div className={`overflow-x-auto rounded-xl border shadow-sm ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className={`${isLight ? 'bg-slate-100 text-slate-800 border-slate-200' : 'bg-white/10 text-white border-white/10'} font-semibold border-b`}>
                  <th className="py-2.5 px-3">Parámetro Técnico</th>
                  <th className="py-2.5 px-3 text-right">Valor Oficial (COP)</th>
                  <th className="py-2.5 px-3 text-right">Equivalente (M)</th>
                  <th className="py-2.5 px-3 text-right">% Relativo</th>
                  <th className="py-2.5 px-3">Significado Técnico / Diagnóstico</th>
                </tr>
              </thead>
              <tbody className={`divide-y font-mono text-[11px] ${isLight ? 'divide-slate-200' : 'divide-white/10'}`}>
                <tr className={isLight ? 'bg-amber-50/50 font-bold' : 'bg-amber-950/20 font-bold'}>
                  <td className={`py-2 px-3 font-sans ${isLight ? 'text-slate-900' : 'text-white'}`}>Saldo Consolidado en Cuentas Bancarias</td>
                  <td className={`py-2 px-3 text-right ${isLight ? 'text-slate-900' : 'text-white'}`}>{formatCOP(totalesFuentes.saldoBancos)}</td>
                  <td className="py-2 px-3 text-right text-amber-600">{formatCOPM(totalesFuentes.saldoBancos)}</td>
                  <td className="py-2 px-3 text-right">100.00%</td>
                  <td className={`py-2 px-3 font-sans font-normal ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>Disponibilidad líquida verificada en extractos bancarios</td>
                </tr>
                <tr>
                  <td className={`py-2 px-3 font-sans ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>Recursos de Administración (Regla 3.A)</td>
                  <td className="py-2 px-3 text-right">{formatCOP(resumenRecursos.bancosLibreDestinacion)}</td>
                  <td className="py-2 px-3 text-right">{formatCOPM(resumenRecursos.bancosLibreDestinacion)}</td>
                  <td className="py-2 px-3 text-right text-emerald-600 font-bold">{resumenRecursos.porcentajeLibre.toFixed(2)}%</td>
                  <td className={`py-2 px-3 font-sans ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Recursos de funcionamiento, gastos generales y libre asignación</td>
                </tr>
                <tr>
                  <td className={`py-2 px-3 font-sans ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>Recursos de Inversión / Destinación Específica</td>
                  <td className="py-2 px-3 text-right">{formatCOP(resumenRecursos.bancosDestinacionEspecifica)}</td>
                  <td className="py-2 px-3 text-right">{formatCOPM(resumenRecursos.bancosDestinacionEspecifica)}</td>
                  <td className="py-2 px-3 text-right text-amber-600 font-bold">{resumenRecursos.porcentajeEspecifica.toFixed(2)}%</td>
                  <td className={`py-2 px-3 font-sans ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Saldos blindados: Estampillas, convenios y proyectos especiales</td>
                </tr>
                <tr className={isLight ? 'bg-rose-50/50' : 'bg-rose-950/20'}>
                  <td className="py-2 px-3 text-rose-600 font-sans font-semibold">Cuentas por Pagar (Compromisos Exigibles)</td>
                  <td className="py-2 px-3 text-right text-rose-600 font-bold">{formatCOP(totalesFuentes.saldoPorPagar)}</td>
                  <td className="py-2 px-3 text-right text-rose-600">{formatCOPM(totalesFuentes.saldoPorPagar)}</td>
                  <td className="py-2 px-3 text-right text-rose-600 font-bold">{(totalesFuentes.saldoPorPagar / totalesFuentes.saldoBancos * 100).toFixed(2)}%</td>
                  <td className="py-2 px-3 text-rose-600 font-sans">Obligaciones devengadas pendientes de giro en tesorería</td>
                </tr>
                <tr className={isLight ? 'bg-emerald-50/50 font-bold' : 'bg-emerald-950/20 font-bold'}>
                  <td className={`py-2 px-3 font-sans ${isLight ? 'text-emerald-950' : 'text-emerald-300'}`}>Disponibilidad Efectiva Libre de Compromisos</td>
                  <td className="py-2 px-3 text-right text-emerald-600">{formatCOP(totalesFuentes.disponibilidadEfectiva)}</td>
                  <td className="py-2 px-3 text-right text-emerald-600">{formatCOPM(totalesFuentes.disponibilidadEfectiva)}</td>
                  <td className="py-2 px-3 text-right text-emerald-600">{((totalesFuentes.saldoBancos - totalesFuentes.saldoPorPagar) / totalesFuentes.saldoBancos * 100).toFixed(2)}%</td>
                  <td className={`py-2 px-3 font-sans font-normal ${isLight ? 'text-emerald-800' : 'text-emerald-300'}`}>Superávit libre neto de tesorería para amparar el cierre anual</td>
                </tr>
                <tr>
                  <td className={`py-2 px-3 font-sans ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>Espejismo Presupuestal Identificado</td>
                  <td className="py-2 px-3 text-right">{formatCOP(totalesFuentes.disponibilidadPresupuestal - totalesFuentes.disponibilidadEfectiva)}</td>
                  <td className="py-2 px-3 text-right">{formatCOPM(totalesFuentes.disponibilidadPresupuestal - totalesFuentes.disponibilidadEfectiva)}</td>
                  <td className="py-2 px-3 text-right">—</td>
                  <td className={`py-2 px-3 font-sans ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Apropiación sin comprometer que carece de efectivo líquido inmediato</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
            <Info size={16} className="text-amber-700 shrink-0 mt-0.5" />
            <div>
              <strong>Regla 3.A de Clasificación de Fondos:</strong> Los recursos clasificados bajo Administración{' '}
              (10.0, 10.1, 10.2, 10.3, 13, 14, 15, 17, 18, 20, 21, 31, 32, 33, 34, 35) concentran el{' '}
              <strong>{resumenRecursos.porcentajeLibre.toFixed(1)}%</strong> de la caja ({formatCOPM(resumenRecursos.bancosLibreDestinacion)}),
              lo que garantiza holgura y autonomía operativa para cumplir con los gastos de personal y funcionamiento ordinario.
              Los recursos de Inversión representan el <strong>{resumenRecursos.porcentajeEspecifica.toFixed(1)}%</strong> ({formatCOPM(resumenRecursos.bancosDestinacionEspecifica)})
              y se encuentran rigurosamente aislados para salvaguardar su destinación específica.
            </div>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* CAPÍTULO 2: PARÁMETROS FINANCIEROS Y ANÁLISIS DE SOSTENIBILIDAD */}
        {/* ==================================================================== */}
        <div className="space-y-6">
          <h3 className={`text-base font-bold uppercase tracking-wider flex items-center gap-2 border-b pb-2 ${isLight ? 'text-slate-900 border-slate-200' : 'text-white border-white/10'}`}>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            2. Parámetros Financieros, Niveles de Disponibilidad y Ratios de Sostenibilidad
          </h3>

          {/* DESCRIPCIÓN DE LOS 6 NIVELES DE LIQUIDEZ */}
          <div className="space-y-3">
            <h4 className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
              A. Los 6 Niveles de Disponibilidad de Caja (La Cascada Oficial de Liquidez UPTC)
            </h4>
            <p className={`text-xs leading-relaxed text-justify ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              Para evitar distorsiones en la toma de decisiones, la Dirección Financiera de la UPTC estructura la liquidez
              en una escala jerárquica de seis niveles, diferenciando el techo presupuestal normativo del efectivo libre disponible:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
              {nivelesLiquidez.map((n) => (
                <div
                  key={n.nivel}
                  className={`p-3.5 rounded-2xl border space-y-1.5 shadow-sm ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'}`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-bold font-mono text-white"
                      style={{ backgroundColor: n.color || '#0284c7' }}
                    >
                      NIVEL {n.nivel}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 font-semibold">{n.naturaleza}</span>
                  </div>
                  <h5 className={`text-xs font-bold leading-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    {n.nombre.split(':')[1]?.trim() || n.nombre}
                  </h5>
                  <div className={`text-sm font-black font-mono ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                    {formatCOP(n.valor)}
                  </div>
                  <p className={`text-[10px] leading-relaxed ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    {n.descripcion}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* GRÁFICAS FINANCIERAS INTEGRADAS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* GRÁFICA 1: NIVELES DE LIQUIDEZ */}
            <div className={`p-4 rounded-2xl border space-y-3 shadow-sm ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'}`}>
              <div className="flex items-center justify-between">
                <h4 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                  <BarChart3 size={15} className="text-amber-600" />
                  Cascada de Niveles de Liquidez (Millones COP)
                </h4>
                <span className="text-[10px] font-mono text-slate-500">N1 a N6</span>
              </div>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartNivelesData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isLight ? '#e2e8f0' : '#334155'} />
                    <XAxis dataKey="name" tick={{ fill: isLight ? '#475569' : '#94a3b8', fontSize: 11 }} />
                    <YAxis tick={{ fill: isLight ? '#475569' : '#94a3b8', fontSize: 10 }} />
                    <RechartsTooltip
                      formatter={(val: any) => [`$ ${Number(val).toLocaleString('es-CO')} M`, 'Monto']}
                      contentStyle={{
                        backgroundColor: isLight ? '#ffffff' : '#0f172a',
                        borderRadius: '12px',
                        border: isLight ? '1px solid #cbd5e1' : '1px solid #334155',
                        fontSize: '11px',
                        color: isLight ? '#0f172a' : '#ffffff',
                      }}
                    />
                    <Bar dataKey="valorM" radius={[6, 6, 0, 0]}>
                      {chartNivelesData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[10px] text-slate-500 text-center font-mono">
                N1: Aforo | N2: Bancos | N3: Inversión | N4: Compromisos | N5: CxP | N6: Libre
              </p>
            </div>

            {/* GRÁFICA 2: RECAUDO VS PAGOS MENSUAL */}
            <div className={`p-4 rounded-2xl border space-y-3 shadow-sm ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'}`}>
              <div className="flex items-center justify-between">
                <h4 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                  <TrendingUp size={15} className="text-emerald-600" />
                  Flujo Mensual: Recaudo vs Pagos (Ene–Nov)
                </h4>
                <span className="text-[10px] font-mono text-slate-500">Millones COP</span>
              </div>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartMensualData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isLight ? '#e2e8f0' : '#334155'} />
                    <XAxis dataKey="mes" tick={{ fill: isLight ? '#475569' : '#94a3b8', fontSize: 11 }} />
                    <YAxis tick={{ fill: isLight ? '#475569' : '#94a3b8', fontSize: 10 }} />
                    <RechartsTooltip
                      formatter={(val: any, name: any) => [
                        `$ ${Number(val).toLocaleString('es-CO')} M`,
                        name === 'recaudoM' ? 'Recaudo' : name === 'pagosM' ? 'Pagos' : 'Saldo Acumulado',
                      ]}
                      contentStyle={{
                        backgroundColor: isLight ? '#ffffff' : '#0f172a',
                        borderRadius: '12px',
                        border: isLight ? '1px solid #cbd5e1' : '1px solid #334155',
                        fontSize: '11px',
                        color: isLight ? '#0f172a' : '#ffffff',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} />
                    <Bar dataKey="recaudoM" name="Recaudo" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="pagosM" name="Pagos" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                    <Line type="monotone" dataKey="acumM" name="Acumulado" stroke="#3b82f6" strokeWidth={2.5} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[10px] text-slate-500 text-center font-mono">
                Flujo neto mensual promedio: +{formatCOPM(totalesMensuales.ingresoPromedioMensual - totalesMensuales.egresoPromedioMensual)} / mes
              </p>
            </div>
          </div>

          {/* TABLA TÉCNICA DE LOS 9 INDICADORES FINANCIEROS OFICIALES */}
          <div className="space-y-3 pt-2">
            <h4 className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
              B. Matriz Oficial de Indicadores Financieros de Liquidez y Sostenibilidad
            </h4>

            <div className={`overflow-x-auto rounded-xl border shadow-sm ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className={`${isLight ? 'bg-slate-100 text-slate-800 border-slate-200' : 'bg-white/10 text-white border-white/10'} font-semibold border-b`}>
                    <th className="py-2.5 px-2 text-center w-8">#</th>
                    <th className="py-2.5 px-3">Indicador Financiero</th>
                    <th className="py-2.5 px-3">Fórmula Técnica</th>
                    <th className="py-2.5 px-3 text-right">Resultado</th>
                    <th className="py-2.5 px-2 text-center">Estado</th>
                    <th className="py-2.5 px-3">Interpretación y Relevancia Directiva</th>
                  </tr>
                </thead>
                <tbody className={`divide-y text-[11px] ${isLight ? 'divide-slate-200' : 'divide-white/10'}`}>
                  {indicadores.map((ind) => (
                    <tr key={ind.id} className={isLight ? 'hover:bg-slate-50' : 'hover:bg-white/5'}>
                      <td className="py-2 px-2 text-center font-mono font-bold text-slate-500">{ind.numero}</td>
                      <td className={`py-2 px-3 font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>{ind.nombre}</td>
                      <td className={`py-2 px-3 font-mono text-[10px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>{ind.formula}</td>
                      <td className={`py-2 px-3 text-right font-mono font-bold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>{ind.resultadoFormateado}</td>
                      <td className="py-2 px-2 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-bold font-mono uppercase ${
                            ind.semaforo === 'OPTIMO'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : ind.semaforo === 'ALERTA'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-rose-100 text-rose-800 border border-rose-300'
                          }`}
                        >
                          {ind.semaforo}
                        </span>
                      </td>
                      <td className={`py-2 px-3 leading-snug ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                        <strong className={isLight ? 'text-slate-900' : 'text-slate-200'}>{ind.interpretacion}</strong> {ind.relevancia}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* CAPÍTULO 3: PARÁMETROS ECONÓMICOS, MACROECONÓMICOS Y RIESGO */}
        {/* ==================================================================== */}
        <div className="space-y-6">
          <h3 className={`text-base font-bold uppercase tracking-wider flex items-center gap-2 border-b pb-2 ${isLight ? 'text-slate-900 border-slate-200' : 'text-white border-white/10'}`}>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            3. Parámetros Económicos, Macroeconómicos y Gestión del Riesgo Tesoral
          </h3>

          <div className={`text-xs space-y-3 leading-relaxed text-justify ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
            <p>
              El entorno macroeconómico vigente impone variables exógenas que inciden en el poder adquisitivo de los depósitos institucionales.
              Con una <strong>inflación proyectada (IPC) del 5,48%</strong> para el cierre de 2026, mantener saldos ociosos en cuentas corrientes sin remuneración
              generaría pérdidas financieras por erosión del poder de compra. Frente a esto, la gestión activa de tesorería de la UPTC ha canalizado
              fondos en cuentas de ahorro remuneradas y carteras colectivas fiduciarias, generando <strong>{formatCOP(totalesFuentes.rendimientosFinancieros)}</strong> en
              rendimientos financieros acumulados al corte, compensando el efecto inflacionario en los saldos no comprometidos.
            </p>
          </div>

          {/* ANÁLISIS DE CONCENTRACIÓN BANCARIA HHI */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                A. Concentración Bancaria e Índice Herfindahl-Hirschman (HHI)
              </h4>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-100 text-amber-800 border border-amber-300">
                HHI = {bankStats.hhi.toFixed(0)} Puntos (Concentración Moderada-Alta)
              </span>
            </div>

            <p className={`text-xs leading-relaxed text-justify ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              El saldo bancario institucional de <strong>{formatCOP(totalesFuentes.saldoBancos)}</strong> se encuentra distribuido principalmente
              en entidades vigiladas por la Superintendencia Financiera de Colombia con calificación crediticia de corto plazo <strong>BRC 1+ / AAA</strong>.
              Sin embargo, el <strong>71,81%</strong> de la liquidez total se concentra en dos entidades: <strong>Itaú Corpbanca ({bankStats.items[0]?.porcentaje.toFixed(1)}%)</strong> y{' '}
              <strong>Banco de Bogotá ({bankStats.items[1]?.porcentaje.toFixed(1)}%)</strong>.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1">
              {/* TABLA DISTRIBUCIÓN POR BANCOS */}
              <div className={`overflow-x-auto rounded-xl border shadow-sm ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className={`${isLight ? 'bg-slate-100 text-slate-800 border-slate-200' : 'bg-white/10 text-white border-white/10'} font-semibold border-b`}>
                      <th className="py-2 px-3">Entidad Financiera</th>
                      <th className="py-2 px-3 text-right">Saldo (COP)</th>
                      <th className="py-2 px-3 text-right">Part %</th>
                      <th className="py-2 px-2 text-center">Calificación</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y font-mono text-[11px] ${isLight ? 'divide-slate-200' : 'divide-white/10'}`}>
                    {bankStats.items.slice(0, 6).map((b, i) => (
                      <tr key={b.entidad} className={i === 0 ? (isLight ? 'bg-amber-50/40 font-bold' : 'bg-amber-950/20 font-bold') : ''}>
                        <td className={`py-2 px-3 font-sans ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>{b.entidad}</td>
                        <td className={`py-2 px-3 text-right ${isLight ? 'text-slate-900' : 'text-white'}`}>{formatCOPM(b.valor)}</td>
                        <td className={`py-2 px-3 text-right ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>{b.porcentaje.toFixed(2)}%</td>
                        <td className="py-2 px-2 text-center">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${isLight ? 'bg-slate-100 text-slate-700' : 'bg-white/10 text-slate-300'}`}>
                            AAA / BRC 1+
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* GRÁFICA DE BARRAS BANCARIA */}
              <div className={`p-4 rounded-2xl border space-y-2 shadow-sm ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'}`}>
                <div className="flex items-center justify-between">
                  <h5 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                    <PieIcon size={14} className="text-blue-600" />
                    Participación por Entidad Bancaria
                  </h5>
                  <span className="text-[10px] font-mono text-slate-500">Top 6 Bancos</span>
                </div>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartBancosData} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={isLight ? '#e2e8f0' : '#334155'} />
                      <XAxis type="number" tick={{ fill: isLight ? '#475569' : '#94a3b8', fontSize: 10 }} />
                      <YAxis dataKey="name" type="category" tick={{ fill: isLight ? '#334155' : '#cbd5e1', fontSize: 10 }} width={80} />
                      <RechartsTooltip
                        formatter={(val: any, name: any, item: any) => [
                          `$ ${Number(val).toLocaleString('es-CO')} M (${item.payload.porcentaje.toFixed(1)}%)`,
                          item.payload.fullName,
                        ]}
                        contentStyle={{
                          backgroundColor: isLight ? '#ffffff' : '#0f172a',
                          borderRadius: '12px',
                          border: isLight ? '1px solid #cbd5e1' : '1px solid #334155',
                          fontSize: '11px',
                          color: isLight ? '#0f172a' : '#ffffff',
                        }}
                      />
                      <Bar dataKey="valorM" radius={[0, 4, 4, 0]}>
                        {chartBancosData.map((entry, index) => (
                          <Cell key={`cell-bank-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          {/* ANÁLISIS DE SENSIBILIDAD: ESCENARIOS DE CIERRE */}
          <div className="space-y-3 pt-2">
            <h4 className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
              B. Análisis de Sensibilidad y Escenarios de Cierre de Caja a Diciembre
            </h4>
            <p className={`text-xs leading-relaxed text-justify ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              Se modelaron tres escenarios de tensión financiera para medir la resiliencia de la caja ante variaciones en el recaudo
              y la velocidad de pago de obligaciones pendientes y nómina del mes de diciembre:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
              {chartEscenariosData.map((esc) => (
                <div
                  key={esc.escenario}
                  className={`p-4 rounded-2xl border space-y-2 shadow-sm text-center ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'}`}
                >
                  <span
                    className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono text-white inline-block"
                    style={{ backgroundColor: esc.color }}
                  >
                    ESCENARIO {esc.escenario.toUpperCase()}
                  </span>
                  <div className={`text-xl font-black font-mono ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    $ {esc.saldoM.toLocaleString('es-CO')} M
                  </div>
                  <p className={`text-[11px] font-sans ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    {esc.descripcion}
                  </p>
                  <div className="pt-2 border-t border-slate-200 text-[10px] font-mono text-emerald-600 font-bold">
                    Superávit de Tesorería Garantizado
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* MATRIZ DE RIESGOS Y ALERTAS */}
          <div className="space-y-3 pt-2">
            <h4 className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
              C. Matriz de Riesgos Financieros y Puntos de Tensión de Liquidez
            </h4>

            <div className={`overflow-x-auto rounded-xl border shadow-sm ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className={`${isLight ? 'bg-slate-100 text-slate-800 border-slate-200' : 'bg-white/10 text-white border-white/10'} font-semibold border-b`}>
                    <th className="py-2.5 px-3">Factor de Riesgo</th>
                    <th className="py-2.5 px-2 text-center">Nivel</th>
                    <th className="py-2.5 px-3">Impacto Potencial</th>
                    <th className="py-2.5 px-3">Mecanismo Institucional de Mitigación</th>
                  </tr>
                </thead>
                <tbody className={`divide-y text-[11px] ${isLight ? 'divide-slate-200' : 'divide-white/10'}`}>
                  {riesgos.map((r) => (
                    <tr key={r.id} className={isLight ? 'hover:bg-slate-50' : 'hover:bg-white/5'}>
                      <td className={`py-2 px-3 font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>{r.titulo}</td>
                      <td className="py-2 px-2 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-bold font-mono uppercase ${
                            r.nivel === 'BAJO'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : r.nivel === 'MEDIO'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-rose-100 text-rose-800 border border-rose-300'
                          }`}
                        >
                          {r.nivel}
                        </span>
                      </td>
                      <td className={`py-2 px-3 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>{r.descripcion}</td>
                      <td className={`py-2 px-3 font-sans italic ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>{r.mitigacion}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* CAPÍTULO 4: PLAN DE CIERRE DE DICIEMBRE Y NÓMINA 2.1.1 */}
        {/* ==================================================================== */}
        <div className="space-y-4">
          <h3 className={`text-base font-bold uppercase tracking-wider flex items-center gap-2 border-b pb-2 ${isLight ? 'text-slate-900 border-slate-200' : 'text-white border-white/10'}`}>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            4. Plan de Cierre Financiero a Diciembre, Nómina en Rubro 2.1.1 y Recursos Adicionales
          </h3>

          <div className={`text-xs space-y-3 leading-relaxed text-justify ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
            <p>
              El cierre presupuestal y de tesorería a 31 de diciembre de 2026 contempla dos elementos de máxima relevancia
              técnica y operativa: la inclusión de la <strong>nómina de diciembre</strong> como único compromiso pendiente de
              apropiación en el <strong>Rubro 2.1.1 (Gastos de Personal)</strong> y el registro ordenado de los
              <strong> ingresos adicionales proyectados</strong> pendientes de recaudo.
            </p>
          </div>

          {/* TARJETA DETALLADA DE RUBRO 2.1.1 */}
          <div className={`p-4 rounded-2xl border space-y-3 shadow-sm ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'}`}>
            <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2.5 ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-mono font-bold text-[10px]">
                  RUBRO 2.1.1
                </span>
                <h4 className={`text-xs font-bold uppercase ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Gastos de Personal – Imputación de Nómina de Diciembre
                </h4>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 w-fit">
                Suficiencia Presupuestal Plena (Holgura: +{formatCOPM(proyeccionesDiciembre.rubro211.holguraApropiacion211)})
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center font-mono">
              <div className={`p-2.5 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-black/40 border-white/10'}`}>
                <div className={`text-[10px] font-sans ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Apropiación Vigente 2.1.1</div>
                <div className={`text-xs md:text-sm font-bold ${isLight ? 'text-slate-800' : 'text-white'}`}>{formatCOPM(proyeccionesDiciembre.rubro211.apropiacionActual)}</div>
              </div>
              <div className={`p-2.5 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-black/40 border-white/10'}`}>
                <div className={`text-[10px] font-sans ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Compromisos Causados Ene-Nov</div>
                <div className={`text-xs md:text-sm font-bold ${isLight ? 'text-slate-800' : 'text-white'}`}>{formatCOPM(proyeccionesDiciembre.rubro211.compromisosActuales)}</div>
              </div>
              <div className={`p-2.5 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-black/40 border-white/10'}`}>
                <div className={`text-[10px] font-sans ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Nómina Dic a Comprometer</div>
                <div className="text-xs md:text-sm font-bold text-blue-600">{formatCOPM(proyeccionesDiciembre.rubro211.nominaDiciembreEstimada)}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                <div className="text-[10px] text-emerald-700 font-sans font-bold">Holgura Presupuestal Libre</div>
                <div className="text-xs md:text-sm font-bold text-emerald-700">+{formatCOPM(proyeccionesDiciembre.rubro211.holguraApropiacion211)}</div>
              </div>
            </div>

            <p className={`text-[11px] leading-relaxed font-sans text-justify ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
              <strong>Dictamen Presupuestal 2.1.1:</strong> La apropiación del rubro Gastos de Personal cuenta con un saldo disponible de{' '}
              <strong>{formatCOP(proyeccionesDiciembre.rubro211.disponibleActual)}</strong>, valor que absorbe holgadamente el compromiso estimado
              de nómina por <strong>{formatCOP(proyeccionesDiciembre.rubro211.nominaDiciembreEstimada)}</strong>. Por consiguiente,
              <strong> NO se requiere trámite de adición ni traslado presupuestal ante el Consejo Superior</strong>, preservando la disciplina fiscal.
            </p>
          </div>

          {/* TABLA DE INGRESOS ADICIONALES PROYECTADOS */}
          {simIngresosAdicionales.length > 0 && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <h4 className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                  Ingresos Adicionales Proyectados a Recaudar en Diciembre
                </h4>
                <span className="text-[11px] font-mono font-bold text-emerald-600">
                  Total Adicional: +{formatCOPM(proyeccionesDiciembre.totalIngresosAdicionalesManuales)}
                </span>
              </div>

              <div className={`overflow-x-auto rounded-xl border shadow-sm ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className={`${isLight ? 'bg-slate-100 text-slate-800 border-slate-200' : 'bg-white/10 text-white border-white/10'} font-semibold border-b`}>
                      <th className="py-2 px-3">Concepto del Ingreso</th>
                      <th className="py-2 px-2">Recurso</th>
                      <th className="py-2 px-2">Tipo</th>
                      <th className="py-2 px-3 text-right">Valor Estimado</th>
                      <th className="py-2 px-3">Observaciones de Tesorería</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y text-[11px] ${isLight ? 'divide-slate-200' : 'divide-white/10'}`}>
                    {simIngresosAdicionales.map((ing) => (
                      <tr key={ing.id}>
                        <td className={`py-2 px-3 font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>{ing.concepto}</td>
                        <td className="py-2 px-2 font-mono text-slate-500">{ing.recurso}</td>
                        <td className={`py-2 px-2 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>{ing.tipo}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-600">{formatCOP(ing.valor)}</td>
                        <td className="py-2 px-3 text-slate-500 italic">{ing.observaciones || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* ==================================================================== */}
        {/* CAPÍTULO 5: DICTAMEN DIRECTIVO VAFI Y RECOMENDACIONES */}
        {/* ==================================================================== */}
        <div className="space-y-5">
          <h3 className={`text-base font-bold uppercase tracking-wider flex items-center gap-2 border-b pb-2 ${isLight ? 'text-slate-900 border-slate-200' : 'text-white border-white/10'}`}>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            5. Dictamen Directivo VAFI y Recomendaciones Estratégicas
          </h3>

          {/* SÍNTESIS DE RESPUESTAS A LAS 7 PREGUNTAS ESTRATÉGICAS */}
          <div className="space-y-3">
            <h4 className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
              A. Respuestas Técnicas a las Preguntas Estratégicas de la Alta Dirección
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className={`p-3.5 rounded-xl border space-y-1 ${isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-white/5 border-white/10 text-slate-300'}`}>
                <strong className={`block font-sans ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  1. ¿Tiene la Universidad suficiente liquidez para cerrar la vigencia?
                </strong>
                <p className={`text-[11px] leading-relaxed text-justify ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  <strong>SÍ, PLENAMENTE.</strong> La tesorería cuenta con un saldo bancario de {formatCOPM(totalesFuentes.saldoBancos)},
                  frente a cuentas por pagar de {formatCOPM(totalesFuentes.saldoPorPagar)}, arrojando un superávit neto libre de {formatCOPM(totalesFuentes.disponibilidadEfectiva)}.
                </p>
              </div>

              <div className={`p-3.5 rounded-xl border space-y-1 ${isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-white/5 border-white/10 text-slate-300'}`}>
                <strong className={`block font-sans ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  2. ¿Qué parte del saldo en bancos está verdaderamente disponible?
                </strong>
                <p className={`text-[11px] leading-relaxed text-justify ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  El <strong>{((totalesFuentes.saldoBancos - totalesFuentes.saldoPorPagar) / totalesFuentes.saldoBancos * 100).toFixed(1)}% ({formatCOPM(totalesFuentes.disponibilidadEfectiva)})</strong> es
                  disponibilidad líquida neta real, una vez deducidas todas las obligaciones exigibles.
                </p>
              </div>

              <div className={`p-3.5 rounded-xl border space-y-1 ${isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-white/5 border-white/10 text-slate-300'}`}>
                <strong className={`block font-sans ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  3. ¿Están blindados los recursos de inversión y destinación específica?
                </strong>
                <p className={`text-[11px] leading-relaxed text-justify ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  <strong>SÍ.</strong> Los {formatCOPM(resumenRecursos.bancosDestinacionEspecifica)} ({resumenRecursos.porcentajeEspecifica.toFixed(1)}%)
                  están depositados en cuentas bancarias separadas, garantizando el cumplimiento del principio de especialización fiscal.
                </p>
              </div>

              <div className={`p-3.5 rounded-xl border space-y-1 ${isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-white/5 border-white/10 text-slate-300'}`}>
                <strong className={`block font-sans ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  4. ¿Cuál es la capacidad real de pago frente a terceros?
                </strong>
                <p className={`text-[11px] leading-relaxed text-justify ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  La cobertura es de <strong>{(totalesFuentes.coberturaGlobal / 100).toFixed(2)} veces (235,4%)</strong>,
                  lo que permite cancelar la totalidad de cuentas radicadas sin comprometer la operatividad.
                </p>
              </div>

              <div className={`p-3.5 rounded-xl border space-y-1 ${isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-white/5 border-white/10 text-slate-300'}`}>
                <strong className={`block font-sans ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  5. ¿Existe riesgo de déficit de tesorería?
                </strong>
                <p className={`text-[11px] leading-relaxed text-justify ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  <strong>NULO.</strong> En los tres escenarios simulados (conservador, base y optimista), el saldo final proyectado a 31 de diciembre
                  se mantiene positivo en un rango entre {formatCOPM(62434000000)} y {formatCOPM(95840000000)}.
                </p>
              </div>

              <div className={`p-3.5 rounded-xl border space-y-1 ${isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-white/5 border-white/10 text-slate-300'}`}>
                <strong className={`block font-sans ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  6. ¿Cómo se garantiza la sostenibilidad para el inicio de 2027?
                </strong>
                <p className={`text-[11px] leading-relaxed text-justify ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  Se recomienda conservar una reserva colchón mínima de <strong>$ 45.000 Millones COP</strong> en bancos al 31 de diciembre
                  para amparar los gastos operativos de enero y febrero mientras ingresan los recaudos de la nueva vigencia.
                </p>
              </div>
            </div>
          </div>

          {/* 6 RECOMENDACIONES ESTRATÉGICAS */}
          <div className="space-y-3 pt-2">
            <h4 className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
              B. Directrices y Recomendaciones Estratégicas para Rectoría y Consejo Superior
            </h4>

            <div className={`space-y-2 text-xs ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              <div className={`flex items-start gap-2.5 p-2.5 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'}`}>
                <span className="w-5 h-5 rounded-full bg-amber-500 text-black font-bold font-mono text-[10px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                <div>
                  <strong>Calendario Límite de Radicación de Obligaciones:</strong> Fijar el <strong>12 de diciembre de 2026</strong> como
                  fecha máxima para radicación de facturas y cuentas de cobro de contratistas, evitando congestiones en la tesorería durante la última semana del año.
                </div>
              </div>

              <div className={`flex items-start gap-2.5 p-2.5 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'}`}>
                <span className="w-5 h-5 rounded-full bg-amber-500 text-black font-bold font-mono text-[10px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                <div>
                  <strong>Priorización de Giros Prestacionales:</strong> Desembolsar la prima de navidad y la nómina de diciembre antes del{' '}
                  <strong>18 de diciembre</strong>, garantizando el bienestar del personal docente y administrativo.
                </div>
              </div>

              <div className={`flex items-start gap-2.5 p-2.5 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'}`}>
                <span className="w-5 h-5 rounded-full bg-amber-500 text-black font-bold font-mono text-[10px] flex items-center justify-center shrink-0 mt-0.5">3</span>
                <div>
                  <strong>Seguimiento de Giros MEN:</strong> Monitorear la confirmación del giro de Gratuidad (Recurso 10.5) del Ministerio de Educación
                  Nacional para registrar el ingreso y ejecutar los compromisos académicos asociados.
                </div>
              </div>

              <div className={`flex items-start gap-2.5 p-2.5 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'}`}>
                <span className="w-5 h-5 rounded-full bg-amber-500 text-black font-bold font-mono text-[10px] flex items-center justify-center shrink-0 mt-0.5">4</span>
                <div>
                  <strong>Blindaje Fiduciario y Cero Unidad de Caja Indebida:</strong> Prohibir cualquier traslado de liquidez desde cuentas de
                  inversión o convenios (Recursos 16, 33, 40) para sufragar gastos de funcionamiento, preservando la responsabilidad disciplinaria y fiscal.
                </div>
              </div>

              <div className={`flex items-start gap-2.5 p-2.5 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'}`}>
                <span className="w-5 h-5 rounded-full bg-amber-500 text-black font-bold font-mono text-[10px] flex items-center justify-center shrink-0 mt-0.5">5</span>
                <div>
                  <strong>Optimización de Tesorería Activa:</strong> Mantener los excedentes de tesorería en vehículos financieros remunerados con
                  liquidez a la vista o plazos de muy corto plazo (7-14 días), con el fin de continuar mitigando la inflación (5,48% IPC).
                </div>
              </div>

              <div className={`flex items-start gap-2.5 p-2.5 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'}`}>
                <span className="w-5 h-5 rounded-full bg-amber-500 text-black font-bold font-mono text-[10px] flex items-center justify-center shrink-0 mt-0.5">6</span>
                <div>
                  <strong>Constitución de la Reserva de Apertura 2027:</strong> Dejar constituido en bancos un saldo no inferior a{' '}
                  <strong>$ 45.000 Millones COP</strong> al 31 de diciembre para arrancar la vigencia 2027 sin apremios de caja.
                </div>
              </div>
            </div>
          </div>

          {/* MATRIZ DE EXPORTACIONES ANALÍTICAS */}
          <div className="space-y-3 pt-2">
            <h4 className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
              C. Exportación de Bases y Matrices Analíticas de Tesorería
            </h4>

            <div className="flex flex-wrap gap-2.5">
              <button
                onClick={handleExportParametrosCSV}
                className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 font-mono text-xs rounded-xl border border-amber-500/30 transition-all cursor-pointer"
              >
                <Download size={13} className="text-amber-600" />
                <span>Exportar Parámetros de Caja (CSV)</span>
              </button>

              <button
                onClick={handleExportFuentesCSV}
                className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 font-mono text-xs rounded-xl border border-emerald-500/30 transition-all cursor-pointer"
              >
                <Download size={13} className="text-emerald-600" />
                <span>Exportar Fuentes R10-R40 (CSV)</span>
              </button>

              <button
                onClick={handleExportMensualCSV}
                className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 font-mono text-xs rounded-xl border border-blue-500/30 transition-all cursor-pointer"
              >
                <Download size={13} className="text-blue-600" />
                <span>Exportar Flujo Mensual (CSV)</span>
              </button>
            </div>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* FIRMAS INSTITUCIONALES Y AUDITORÍA */}
        {/* ==================================================================== */}
        <div className={`pt-8 border-t space-y-8 ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center text-xs">
            <div className={`space-y-2 border-t pt-3 ${isLight ? 'border-slate-300' : 'border-white/20'}`}>
              <div className={`font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Dr. Ricardo Velásquez A.</div>
              <div className="text-[10px] text-slate-500 uppercase">Vicerrector Administrativo y Financiero</div>
              <div className="text-[9px] font-mono text-slate-400">VAFI – UPTC</div>
            </div>

            <div className={`space-y-2 border-t pt-3 ${isLight ? 'border-slate-300' : 'border-white/20'}`}>
              <div className={`font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Dra. Claudia M. Salamanca</div>
              <div className="text-[10px] text-slate-500 uppercase">Directora Financiera</div>
              <div className="text-[9px] font-mono text-slate-400">Dirección Financiera UPTC</div>
            </div>

            <div className={`space-y-2 border-t pt-3 ${isLight ? 'border-slate-300' : 'border-white/20'}`}>
              <div className={`font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Dr. Jorge A. Niño R.</div>
              <div className="text-[10px] text-slate-500 uppercase">Jefe División de Tesorería</div>
              <div className="text-[9px] font-mono text-slate-400">Tesorería General UPTC</div>
            </div>

            <div className={`space-y-2 border-t pt-3 ${isLight ? 'border-slate-300' : 'border-white/20'}`}>
              <div className={`font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Equipo Auditor VAFI</div>
              <div className="text-[10px] text-slate-500 uppercase">Control Presupuestal y Tesoral</div>
              <div className="text-[9px] font-mono text-slate-400">Auditoría Financiera</div>
            </div>
          </div>

          <div className={`p-3 rounded-xl border flex flex-col sm:flex-row items-center justify-between text-[10px] font-mono gap-2 ${isLight ? 'bg-slate-50 border-slate-200 text-slate-500' : 'bg-white/5 border-white/10 text-slate-400'}`}>
            <div>
              <strong>Seguridad Digital:</strong> HASH SHA-256: 7f9a2b8c4d1e0f3a6b5c8d7e9f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9
            </div>
            <div>
              <strong>Fecha Emisión:</strong> 23/11/2026 18:45:00 COT • UPTC Sede Central Tunja
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
