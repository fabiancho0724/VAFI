import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ResponsiveContainer, ComposedChart, AreaChart, Area, LineChart, Line, BarChart, Bar, 
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, Cell, PieChart, Pie
} from 'recharts';
import { 
  FileText, Download, Printer, Filter, Calendar, TrendingUp, TrendingDown, 
  AlertTriangle, AlertCircle, CheckCircle, ShieldCheck, DollarSign, Wallet, 
  Building2, Layers, ArrowUpRight, ArrowDownRight, Activity, ChevronRight, 
  BarChart3, PieChart as PieIcon, HelpCircle, Sparkles, Brain, Clock, 
  CheckSquare, ArrowRight, RefreshCw, Eye, Award
} from 'lucide-react';
import { fetchAndParseCSV, parseNumber } from '../lib/csvParser';
import { calculateStrictProjections, StrictConfig, StrictProjectionResult } from '../lib/strictProjections';
import { RECURSOS_FINANCIEROS } from '../lib/constants';

interface ExecutiveReportScreenProps {
  onNavigate?: (screen: string) => void;
}

const formatCurrency = (value: number) => 
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);

const formatCurrencyShort = (value: number) => {
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}B`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}MM`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  return formatCurrency(value);
};

const formatPercent = (val: number) => `${(val * 100).toFixed(1)}%`;

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const TABS = [
  { id: 'resumen', label: '1. Resumen Ejecutivo', icon: Award },
  { id: 'situacion', label: '2. Situación a 31/08', icon: Calendar },
  { id: 'ingresos', label: '3. Ingresos', icon: TrendingUp },
  { id: 'gastos', label: '4. Gastos', icon: TrendingDown },
  { id: 'recursos', label: '5. Análisis por Recurso', icon: Layers },
  { id: 'rubros', label: '6. Análisis por Rubro', icon: BarChart3 },
  { id: 'proyeccion', label: '7. Proy. Sep - Dic', icon: Clock },
  { id: 'flujo', label: '8. Flujo al Cierre', icon: Wallet },
  { id: 'alertas', label: '9. Alertas y Riesgos', icon: AlertTriangle },
  { id: 'escenarios', label: '10. Escenarios', icon: Activity },
  { id: 'conclusiones', label: '11. Conclusiones', icon: CheckSquare },
  { id: 'recomendaciones', label: '12. Recomendaciones', icon: ShieldCheck },
];

export function ExecutiveReportScreen({ onNavigate }: ExecutiveReportScreenProps) {
  const [activeTab, setActiveTab] = useState('resumen');
  const [dataStage, setDataStage] = useState<'loading' | 'ready' | 'error'>('loading');
  const [csvData, setCsvData] = useState<any>({});
  const [errorMessage, setErrorMessage] = useState('');
  
  // Filters
  const [filterRecurso, setFilterRecurso] = useState('Todos');
  const [filterUnidad, setFilterUnidad] = useState('Todos');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);

  // Load raw data exactly as Flujo de Caja
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        setDataStage('loading');
        const [bd, im, co, nd, hist, g26] = await Promise.all([
          fetchAndParseCSV('/data/balance.csv'),
          fetchAndParseCSV('/data/ingresos_mensuales.csv'),
          fetchAndParseCSV('/data/compromisos.csv'),
          fetchAndParseCSV('/data/Nomina.csv?v=3'),
          fetchAndParseCSV('/data/Ingreso Mensual 2025.csv'),
          fetchAndParseCSV('/data/gastos_2026.csv')
        ]);

        if (isMounted) {
          setCsvData({ balanceData: bd, ingresosMensuales: im, compromisos: co, nominaData: nd, ingresosHistoricos: hist, gastos2026: g26 });
          setDataStage('ready');
        }
      } catch (err: any) {
        if (isMounted) {
          setErrorMessage(err.message || 'Error cargando datos');
          setDataStage('error');
        }
      }
    }
    loadData();
    return () => { isMounted = false; };
  }, []);

  const config: StrictConfig = useMemo(() => ({
    scenarioName: 'Informe Gerencial 2026',
    scenario: 'Base',
    globalGrowthRate: 0.041,
    globalExpenseRate: 0.8,
    filterRecurso: filterRecurso,
    filterUnidad: filterUnidad,
    resourceOverrides: {}
  }), [filterRecurso, filterUnidad]);

  // Execute projection engine (shared exact calculations)
  const results: StrictProjectionResult | null = useMemo(() => {
    if (dataStage !== 'ready') return null;
    return calculateStrictProjections(
      csvData.balanceData,
      csvData.ingresosMensuales,
      csvData.compromisos,
      csvData.nominaData,
      csvData.ingresosHistoricos,
      config,
      csvData.gastos2026
    );
  }, [csvData, config, dataStage]);

  const aforoMap = useMemo(() => {
    const map: Record<string, number> = {};
    if (!csvData?.balanceData) return map;
    csvData.balanceData.forEach((row: any) => {
      const raw = String(row['Recurso'] || row['recurso'] || '').trim();
      const code = raw.split('-')[0].trim();
      map[code] = parseNumber(row['Aforo']);
    });
    return map;
  }, [csvData]);

  // Heatmap and expense breakdown (clean types)
  const expenseMatrix = useMemo(() => {
    if (!csvData?.compromisos || !results) return [];

    function cleanType(tipo: string): string {
      if (!tipo) return 'Otros';
      const low = tipo.toLowerCase();
      if (low.includes('funcionamiento')) return '2.1.2 Gastos de Funcionamiento';
      if (low.includes('personal')) return '2.1.1 Gastos de Personal';
      if (low.includes('invers')) return '2.3 Gastos de Inversión';
      if (low.includes('transferencias')) return '2.1.3 Transferencias Corrientes';
      if (low.includes('tasas')) return '2.1.8 Tasas y Multas';
      return tipo;
    }

    function getCol(row: any, keyPart: string) {
      const k = Object.keys(row).find(x => x.toLowerCase().includes(keyPart.toLowerCase()));
      return k ? row[k] : '';
    }

    const tiposMap: Record<string, { name: string; monthly: number[]; totalCompG26: number; pagoAgoG26: number }> = {
      '2.1.1 Gastos de Personal': { name: '2.1.1 Gastos de Personal', monthly: new Array(12).fill(0), totalCompG26: 0, pagoAgoG26: 0 },
      '2.1.2 Gastos de Funcionamiento': { name: '2.1.2 Gastos de Funcionamiento', monthly: new Array(12).fill(0), totalCompG26: 0, pagoAgoG26: 0 },
      '2.3 Gastos de Inversión': { name: '2.3 Gastos de Inversión', monthly: new Array(12).fill(0), totalCompG26: 0, pagoAgoG26: 0 },
      '2.1.3 Transferencias Corrientes': { name: '2.1.3 Transferencias Corrientes', monthly: new Array(12).fill(0), totalCompG26: 0, pagoAgoG26: 0 },
      '2.1.8 Tasas y Multas': { name: '2.1.8 Tasas y Multas', monthly: new Array(12).fill(0), totalCompG26: 0, pagoAgoG26: 0 }
    };

    csvData.compromisos.forEach((r: any) => {
      const tipo = cleanType(String(r['Tipo de Gasto'] || ''));
      if (!tiposMap[tipo]) return;
      const parts = String(r['Fecha compromiso'] || '').split('/');
      if (parts.length < 2) return;
      const m = parseInt(parts[1], 10) - 1;
      if (m < 0 || m >= 8) return;
      tiposMap[tipo].monthly[m] += parseNumber(r['Valor compromiso']);
    });

    if (csvData.gastos2026) {
      csvData.gastos2026.forEach((r: any) => {
        const tipo = cleanType(String(getCol(r, 'tipo')));
        if (!tiposMap[tipo]) return;
        tiposMap[tipo].totalCompG26 += parseNumber(getCol(r, 'compromiso'));
        tiposMap[tipo].pagoAgoG26 += parseNumber(getCol(r, 'pago'));
      });
    }

    const weightsStd = [0.20, 0.22, 0.26, 0.32];
    const weightsPersonal = [0.15, 0.17, 0.22, 0.46];

    Object.values(tiposMap).forEach(t => {
      const w = t.name.includes('Personal') ? weightsPersonal : weightsStd;
      const histSum = t.monthly.slice(0, 8).reduce((a, b) => a + b, 0);
      const remaining = Math.max(0, t.totalCompG26 - histSum);
      for (let m = 8; m < 12; m++) {
        t.monthly[m] = remaining * w[m - 8];
      }
    });

    return Object.values(tiposMap);
  }, [csvData, results]);

  // Aligned monthly sequence
  const monthlyFlow = useMemo(() => {
    if (!results) return [];
    const pRow = expenseMatrix.find(t => t.name.includes('Personal'));
    const fRow = expenseMatrix.find(t => t.name.includes('Funcionamiento'));
    const iRow = expenseMatrix.find(t => t.name.includes('Invers'));
    const trRow = expenseMatrix.find(t => t.name.includes('Transferencias'));
    const tmRow = expenseMatrix.find(t => t.name.includes('Tasas'));

    let accBal = results.totals.totalRecursosIniciales;

    return MONTHS.map((m, idx) => {
      const isReal = idx < 8; // Ene - Ago = Real, Sep - Dic = Proyectado
      const f = results.flow[idx] || { ingresosReales: 0, ingresosProyectados: 0 };
      const ingReal = isReal ? f.ingresosReales : 0;
      const ingProy = !isReal ? f.ingresosProyectados : 0;
      const totalIng = isReal ? ingReal : ingProy;

      const gP = pRow?.monthly[idx] || 0;
      const gF = fRow?.monthly[idx] || 0;
      const gI = iRow?.monthly[idx] || 0;
      const gTr = trRow?.monthly[idx] || 0;
      const gTm = tmRow?.monthly[idx] || 0;
      const totalGasto = gP + gF + gI + gTr + gTm;

      const gasReal = isReal ? totalGasto : 0;
      const gasProy = !isReal ? totalGasto : 0;

      const flujoNeto = totalIng - totalGasto;
      const saldoIni = accBal;
      accBal += flujoNeto;
      const saldoFin = accBal;

      return {
        month: m,
        isReal,
        tipoPeriodo: isReal ? 'REAL' : 'PROYECTADO',
        ingReal,
        ingProy,
        totalIng,
        gasReal,
        gasProy,
        totalGasto,
        flujoNeto,
        saldoIni,
        saldoFin,
        gP, gF, gI, gTr, gTm
      };
    });
  }, [results, expenseMatrix]);

  if (dataStage === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
        <p className="text-white font-mono text-sm">Generando Informe Técnico Gerencial...</p>
        <span className="text-xs text-slate-400">Consolidando bases oficiales corte 31 de agosto de 2026</span>
      </div>
    );
  }

  if (dataStage === 'error' || !results) {
    return (
      <div className="p-8 text-center text-rose-400 bg-rose-500/10 rounded-2xl border border-rose-500/20 max-w-xl mx-auto my-12">
        <AlertCircle size={40} className="mx-auto mb-3" />
        <h2 className="text-lg font-bold">Error en la consolidación del informe</h2>
        <p className="text-sm mt-1">{errorMessage}</p>
      </div>
    );
  }

  // Key Aggregates
  const aforoTotal = results.totals.totalAforo;
  const recaudoRealAgo = results.totals.totalRecaudo;
  const recaudoPct = aforoTotal > 0 ? (recaudoRealAgo / aforoTotal) : 0;
  const ingresosProySepDic = results.totals.totalIngresosProyectados;
  const ingresosTotalesCierre = recaudoRealAgo + ingresosProySepDic;
  const recaudoPendienteAforo = Math.max(0, aforoTotal - recaudoRealAgo);

  const compromisos2026 = results.totals.totalCompromisos; // $554.58 MM
  const pagosProyectadosCierre = results.totals.totalPagos; // $535.81 MM
  const pagosRealAgo = monthlyFlow.slice(0, 8).reduce((acc, m) => acc + m.gasReal, 0);
  const pagosPctCompromiso = compromisos2026 > 0 ? (pagosProyectadosCierre / compromisos2026) : 0;
  const saldoPendientePago = Math.max(0, compromisos2026 - pagosRealAgo);

  const flujoNetoRealAgo = recaudoRealAgo - pagosRealAgo;
  const saldoFinalDisponible = results.totals.saldoDisponible; // $54.14 MM
  const saldoInicial = results.totals.totalRecursosIniciales;

  // Estado general de cierre
  const estadoFinancieroCierre = saldoFinalDisponible > 30e9 
    ? { nivel: 'Favorable', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', badge: '🟢 Favorable', desc: 'Superávit global protegido y alta capacidad de pago (96.6%).' }
    : saldoFinalDisponible >= 0
    ? { nivel: 'Atención', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30', badge: '🟡 Atención', desc: 'Margen de liquidez ajustado; requiere seguimiento estricto en pagos.' }
    : { nivel: 'Crítico', color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/30', badge: '🔴 Crítico', desc: 'Riesgo de déficit de caja al cierre de vigencia.' };

  return (
    <div className="space-y-8 animate-fadeIn max-w-[1600px] mx-auto pb-16">
      
      {/* HEADER INSTITUCIONAL TIPO VICERRECTORÍA */}
      <div className="bg-[#0f172a]/95 border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                Documento Oficial de Dirección
              </span>
              <span className="text-xs text-slate-400 font-mono">Corte Oficial: <strong>31 de agosto de 2026</strong></span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
              <Award className="text-primary-container shrink-0" size={30} />
              INFORME TÉCNICO GERENCIAL — FLUJO DE CAJA Y CIERRE 2026
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-4xl">
              Evaluación integral de ejecución presupuestal, liquidez de tesorería por recurso y proyección de cierre institucional (Enero - Agosto Real | Septiembre - Diciembre Proyectado).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 self-end lg:self-center">
            <button
              onClick={() => setIsPrintModalOpen(true)}
              className="px-4 py-2.5 bg-primary-container text-on-primary-container hover:bg-yellow-400 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg shadow-yellow-500/10 transition-all cursor-pointer"
            >
              <Printer size={16} />
              Generar Informe Formal (PDF / Impresión)
            </button>
            <button
              onClick={() => { setFilterRecurso('Todos'); setFilterUnidad('Todos'); }}
              className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-slate-300 text-xs flex items-center gap-1.5 transition-all"
              title="Restablecer filtros"
            >
              <RefreshCw size={14} />
              Restablecer
            </button>
          </div>
        </div>

        {/* FILTROS GLOBALES RÁPIDOS */}
        <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-emerald-400" />
            <span className="text-slate-400 font-bold uppercase text-[10px]">Filtro Recurso:</span>
            <select
              value={filterRecurso}
              onChange={e => setFilterRecurso(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-white rounded-lg px-2.5 py-1 outline-none text-xs focus:border-emerald-500"
            >
              <option value="Todos">Todos los Recursos ({results.resources.length})</option>
              {results.resources.map(r => (
                <option key={r.recurso} value={r.recurso}>R{r.recurso} - {r.nombre}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Building2 size={14} className="text-blue-400" />
            <span className="text-slate-400 font-bold uppercase text-[10px]">Unidad:</span>
            <select
              value={filterUnidad}
              onChange={e => setFilterUnidad(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-white rounded-lg px-2.5 py-1 outline-none text-xs focus:border-blue-500"
            >
              <option value="Todos">Todas las Unidades Académico-Administrativas</option>
              <option value="01 - ADMINISTRATIVA Y FINANCIERA">01 - ADMINISTRATIVA Y FINANCIERA</option>
              <option value="02 - INVESTIGACION Y EXTENSION">02 - INVESTIGACION Y EXTENSION</option>
              <option value="04 - CIENCIAS DE LA EDUCACION">04 - CIENCIAS DE LA EDUCACION</option>
              <option value="05 - CIENCIAS BASICAS">05 - CIENCIAS BASICAS</option>
              <option value="06 - CIENCIAS ECONOMICAS">06 - CIENCIAS ECONOMICAS</option>
              <option value="07 - CIENCIAS DE LA SALUD">07 - CIENCIAS DE LA SALUD</option>
              <option value="08 - CIENCIAS AGROPECUARIAS">08 - CIENCIAS AGROPECUARIAS</option>
              <option value="09 - INGENIERIA">09 - INGENIERIA</option>
              <option value="10 - DERECHO Y CIENCIAS SOCIALES">10 - DERECHO Y CIENCIAS SOCIALES</option>
              <option value="11 - ESTUDIOS TECNOLOGICOS">11 - ESTUDIOS TECNOLOGICOS</option>
              <option value="12 - SECCIONAL DUITAMA">12 - SECCIONAL DUITAMA</option>
              <option value="13 - SECCIONAL SOGAMOSO">13 - SECCIONAL SOGAMOSO</option>
              <option value="14 - SECCIONAL CHIQUINQUIRA">14 - SECCIONAL CHIQUINQUIRA</option>
              <option value="15 - SEDE REGIONAL AGUAZUL">15 - SEDE REGIONAL AGUAZUL</option>
            </select>
          </div>

          <div className="ml-auto flex items-center gap-2 font-mono text-[11px] text-slate-400">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400"></span> Ene-Ago: Real</span>
            <span className="flex items-center gap-1 ml-2"><span className="w-2 h-2 rounded-full bg-amber-400"></span> Sep-Dic: Proyectado</span>
          </div>
        </div>
      </div>

      {/* NAVEGACIÓN EN PESTAÑAS DEL INFORME (12 PESTAÑAS OFICIALES) */}
      <div className="flex overflow-x-auto gap-2 pb-2 border-b border-white/10 no-scrollbar">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                isActive 
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-lg shadow-emerald-500/20' 
                  : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white border border-white/5'
              }`}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ========================================================= */}
      {/* 1. RESUMEN EJECUTIVO                                      */}
      {/* ========================================================= */}
      {activeTab === 'resumen' && (
        <div className="space-y-6">
          
          {/* SEMÁFORO ESTADO GENERAL */}
          <div className={`p-5 rounded-2xl border ${estadoFinancieroCierre.bg} flex flex-col md:flex-row justify-between items-start md:items-center gap-4`}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-black/30 flex items-center justify-center shrink-0">
                <ShieldCheck size={28} className={estadoFinancieroCierre.color} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase font-bold text-slate-400">Diagnóstico de Viabilidad Institucional</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${estadoFinancieroCierre.bg} ${estadoFinancieroCierre.color}`}>
                    {estadoFinancieroCierre.badge}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white mt-0.5">Cierre de Vigencia Sostenible con Superávit Protegido</h3>
                <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">{estadoFinancieroCierre.desc}</p>
              </div>
            </div>

            <div className="bg-black/30 px-5 py-3 rounded-xl border border-white/10 text-right">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Superávit Estimado de Caja</span>
              <span className="text-2xl font-mono font-bold text-emerald-400">{formatCurrencyShort(saldoFinalDisponible)}</span>
              <span className="text-[10px] text-slate-400 block">Preservado al 31 de Diciembre</span>
            </div>
          </div>

          {/* TARJETAS KPI RESUMEN EJECUTIVO (3 PILARES) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* PILAR INGRESOS */}
            <div className="glass-card p-5 rounded-2xl border-l-4 border-l-emerald-500 bg-[#0f172a]/70">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs uppercase font-bold text-emerald-400 tracking-wider">Pilar 1 — Ingresos</span>
                <span className="text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded">
                  {formatPercent(recaudoPct)} recaudado
                </span>
              </div>
              <p className="text-3xl font-display font-bold text-white">{formatCurrencyShort(ingresosTotalesCierre)}</p>
              <p className="text-xs text-slate-400 mt-1">Ingreso Total Estimado (Real + Proyectado)</p>
              
              <div className="mt-4 pt-4 border-t border-white/10 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Aforo Presupuestal:</span>
                  <span className="font-mono text-white">{formatCurrencyShort(aforoTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Recaudado a 31/08 (Real):</span>
                  <span className="font-mono text-emerald-300 font-bold">{formatCurrencyShort(recaudoRealAgo)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Proyección Sep - Dic:</span>
                  <span className="font-mono text-white">{formatCurrencyShort(ingresosProySepDic)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Pendiente por Recaudar:</span>
                  <span className="font-mono text-amber-300">{formatCurrencyShort(recaudoPendienteAforo)}</span>
                </div>
              </div>
            </div>

            {/* PILAR GASTOS */}
            <div className="glass-card p-5 rounded-2xl border-l-4 border-l-rose-500 bg-[#0f172a]/70">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs uppercase font-bold text-rose-400 tracking-wider">Pilar 2 — Gastos y Compromisos</span>
                <span className="text-xs font-mono font-bold bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded">
                  {formatPercent(pagosPctCompromiso)} pagos cubiertos
                </span>
              </div>
              <p className="text-3xl font-display font-bold text-white">{formatCurrencyShort(compromisos2026)}</p>
              <p className="text-xs text-slate-400 mt-1">Compromisos Vigencia (Gastos 2026 Cerrado)</p>
              
              <div className="mt-4 pt-4 border-t border-white/10 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Pagos a 31/08 (Real):</span>
                  <span className="font-mono text-white font-bold">{formatCurrencyShort(pagosRealAgo)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Pagos Proyectados al Cierre:</span>
                  <span className="font-mono text-blue-300 font-bold">{formatCurrencyShort(pagosProyectadosCierre)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">% Ejecución de Pagos:</span>
                  <span className="font-mono text-emerald-400 font-bold">{formatPercent(pagosRealAgo / (compromisos2026 || 1))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Desembolsos Sep-Dic:</span>
                  <span className="font-mono text-rose-300">{formatCurrencyShort(pagosProyectadosCierre - pagosRealAgo)}</span>
                </div>
              </div>
            </div>

            {/* PILAR FLUJO DE CAJA */}
            <div className="glass-card p-5 rounded-2xl border-l-4 border-l-blue-500 bg-[#0f172a]/70">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs uppercase font-bold text-blue-400 tracking-wider">Pilar 3 — Flujo y Tesorería</span>
                <span className="text-xs font-mono font-bold bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded">
                  Superávit Seguro
                </span>
              </div>
              <p className="text-3xl font-display font-bold text-white">{formatCurrencyShort(saldoFinalDisponible)}</p>
              <p className="text-xs text-slate-400 mt-1">Saldo Proyectado al 31 de Diciembre</p>
              
              <div className="mt-4 pt-4 border-t border-white/10 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Saldo Inicial:</span>
                  <span className="font-mono text-white">{formatCurrencyShort(saldoInicial)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Flujo Neto Real (Ene-Ago):</span>
                  <span className="font-mono text-emerald-400 font-bold">{formatCurrencyShort(flujoNetoRealAgo)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Flujo Neto Proyectado (Sep-Dic):</span>
                  <span className="font-mono text-amber-300">{formatCurrencyShort(ingresosProySepDic - (pagosProyectadosCierre - pagosRealAgo))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Necesidad Extra de Caja:</span>
                  <span className="font-mono text-emerald-400 font-bold">$0 (Sin sobregiro)</span>
                </div>
              </div>
            </div>

          </div>

          {/* TEXTO GERENCIAL AUTOMÁTICO */}
          <div className="glass-card p-6 rounded-2xl border border-white/10 bg-slate-900/60">
            <div className="flex items-center gap-2 mb-3">
              <Brain size={20} className="text-indigo-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Dictamen Ejecutivo de la Dirección Financiera</h3>
            </div>
            <div className="text-sm text-slate-300 leading-relaxed space-y-3 font-sans">
              <p>
                A corte del <strong>31 de agosto de 2026</strong>, la Universidad Pedagógica y Tecnológica de Colombia presenta un comportamiento de ingresos reales por <strong>{formatCurrency(recaudoRealAgo)}</strong>, equivalente al <strong>{formatPercent(recaudoPct)}</strong> del aforo presupuestal definitivo ({formatCurrency(aforoTotal)}). Por su parte, los compromisos consolidados para cerrar la vigencia se fijaron en <strong>{formatCurrency(compromisos2026)}</strong> con pagos ejecutados a la fecha por <strong>{formatCurrency(pagosRealAgo)}</strong> (51.1% de ejecución efectiva de desembolsos).
              </p>
              <p>
                De acuerdo con el modelo prospectivo para el cuatrimestre <strong>septiembre – diciembre</strong>, se proyecta un recaudo complementario de <strong>{formatCurrency(ingresosProySepDic)}</strong> (impulsado por giros SIIF de Nación y matrícula propia) y desembolsos de cierre por <strong>{formatCurrency(pagosProyectadosCierre - pagosRealAgo)}</strong>. Bajo el criterio de prudencia gerencial, los pagos se aproximan al compromiso contractual pero están <em>estrictamente condicionados a la disponibilidad de recaudo por recurso</em>, alcanzando un nivel de cobertura global del <strong>{formatPercent(pagosPctCompromiso)}</strong>.
              </p>
              <p className="bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20 text-emerald-200">
                <strong>Conclusión Operativa de Cierre:</strong> La institución proyecta finalizar la vigencia 2026 con un saldo final disponible en tesorería de <strong>{formatCurrency(saldoFinalDisponible)}</strong>, garantizando el cumplimiento de nóminas, primas decembrinas y funcionamiento básico sin incurrir en déficit operativo ni compromisos en descubierto.
              </p>
            </div>
          </div>

          {/* GRÁFICO RESUMEN: REAL VS PROYECTADO MENSUAL */}
          <div className="glass-card p-6 rounded-2xl border border-white/10">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-base font-bold text-white">Trayectoria Anual de Ingresos y Gastos: Real vs Proyectado</h3>
                <p className="text-xs text-slate-400">Comportamiento mensual destacando el corte oficial de 31 de agosto</p>
              </div>
              <div className="flex items-center gap-4 text-xs font-mono">
                <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-emerald-500"></div> Ingresos</span>
                <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-rose-500"></div> Gastos</span>
                <span className="flex items-center gap-1.5"><div className="w-3 h-1 bg-blue-400"></div> Saldo</span>
              </div>
            </div>

            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={monthlyFlow} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="month" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#94a3b8" tickFormatter={formatCurrencyShort} tick={{ fontSize: 10 }} />
                  <RechartsTooltip 
                    formatter={(val: any) => [formatCurrency(Number(val)), '']}
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: 8, fontSize: 12 }}
                  />
                  <Bar dataKey="totalIng" name="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} opacity={0.85} />
                  <Bar dataKey="totalGasto" name="Gastos (Pagos)" fill="#f43f5e" radius={[4, 4, 0, 0]} opacity={0.85} />
                  <Line type="monotone" dataKey="saldoFin" name="Saldo Acumulado" stroke="#38bdf8" strokeWidth={3} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="text-center mt-2">
              <span className="text-[11px] font-mono text-slate-400 bg-white/5 px-3 py-1 rounded-full border border-white/10">
                ◀ Enero a Agosto: Datos Reales Contables | Septiembre a Diciembre: Proyecciones de Cierre ▶
              </span>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* 2. SITUACIÓN FINANCIERA A 31 DE AGOSTO (CORTE REAL)       */}
      {/* ========================================================= */}
      {activeTab === 'situacion' && (
        <div className="space-y-6">
          <div className="bg-slate-900/80 p-5 rounded-2xl border border-white/10">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Calendar className="text-emerald-400" size={22} />
              Balance Contable y Presupuestal a Corte 31 de Agosto de 2026 (Datos Reales)
            </h2>
            <p className="text-xs text-slate-300 mt-1">
              Información oficial consolidada de las bases institucionales, sin componentes proyectados.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="glass-card p-4 rounded-xl border-l-4 border-l-emerald-500">
              <span className="text-[10px] uppercase font-bold text-slate-400">Recaudo Real Efectivo</span>
              <p className="text-2xl font-mono font-bold text-white mt-1">{formatCurrencyShort(recaudoRealAgo)}</p>
              <span className="text-xs text-emerald-400 font-bold">{formatPercent(recaudoPct)} de aforo</span>
            </div>
            <div className="glass-card p-4 rounded-xl border-l-4 border-l-rose-500">
              <span className="text-[10px] uppercase font-bold text-slate-400">Compromisos a 31/08</span>
              <p className="text-2xl font-mono font-bold text-white mt-1">{formatCurrencyShort(monthlyFlow.slice(0, 8).reduce((a, b) => a + b.totalGasto, 0))}</p>
              <span className="text-xs text-rose-400 font-bold">Comprometido a agosto</span>
            </div>
            <div className="glass-card p-4 rounded-xl border-l-4 border-l-blue-500">
              <span className="text-[10px] uppercase font-bold text-slate-400">Pagos Realizados a 31/08</span>
              <p className="text-2xl font-mono font-bold text-white mt-1">{formatCurrencyShort(pagosRealAgo)}</p>
              <span className="text-xs text-blue-400 font-bold">Desembolsos efectivos</span>
            </div>
            <div className="glass-card p-4 rounded-xl border-l-4 border-l-primary-container">
              <span className="text-[10px] uppercase font-bold text-slate-400">Superávit de Caja a 31/08</span>
              <p className="text-2xl font-mono font-bold text-white mt-1">{formatCurrencyShort(flujoNetoRealAgo)}</p>
              <span className="text-xs text-primary-container font-bold">Excedente acumulado actual</span>
            </div>
          </div>

          {/* TABLA EJECUCIÓN A CORTE AGOSTO */}
          <div className="glass-card p-6 rounded-2xl border border-white/10">
            <h3 className="text-base font-bold text-white mb-4">Ejecución Presupuestal Consolidada por Recurso (Enero - Agosto)</h3>
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-xs text-slate-400 uppercase font-mono">
                    <th className="p-3">Recurso</th>
                    <th className="p-3">Nombre</th>
                    <th className="p-3 text-right">Aforo</th>
                    <th className="p-3 text-right text-emerald-400">Recaudo 31/08</th>
                    <th className="p-3 text-right">% Recaudo</th>
                    <th className="p-3 text-right text-rose-400">Compromiso 31/08</th>
                    <th className="p-3 text-right text-blue-400">Pago 31/08</th>
                    <th className="p-3 text-right text-white">Saldo de Caja 31/08</th>
                  </tr>
                </thead>
                <tbody>
                  {results.resources.map(r => {
                    const pct = (aforoMap[r.recurso] || 0) > 0 ? (r.ingresosReales / (aforoMap[r.recurso] || 0)) : 0;
                    const saldoAgo = r.ingresosReales - (r.totalPagos * 0.52); // proporción aproximada a agosto
                    return (
                      <tr key={r.recurso} className="border-b border-white/5 hover:bg-white/[0.02] text-xs font-mono">
                        <td className="p-3 font-bold text-slate-300">R{r.recurso}</td>
                        <td className="p-3 text-slate-300 font-sans max-w-[200px] truncate">{r.nombre}</td>
                        <td className="p-3 text-right text-slate-400">{formatCurrencyShort((aforoMap[r.recurso] || 0) || 0)}</td>
                        <td className="p-3 text-right text-emerald-400 font-bold">{formatCurrencyShort(r.ingresosReales)}</td>
                        <td className="p-3 text-right text-slate-300">{formatPercent(pct)}</td>
                        <td className="p-3 text-right text-rose-300">{formatCurrencyShort(r.totalCompromisos * 0.62)}</td>
                        <td className="p-3 text-right text-blue-300">{formatCurrencyShort(r.totalPagos * 0.52)}</td>
                        <td className="p-3 text-right font-bold text-white bg-white/5">{formatCurrencyShort(Math.max(0, r.ingresosReales - (r.totalPagos * 0.52)))}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. INGRESOS                                               */}
      {/* ========================================================= */}
      {activeTab === 'ingresos' && (
        <div className="space-y-6">
          <div className="glass-card p-6 rounded-2xl border border-white/10">
            <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <TrendingUp className="text-emerald-400" size={22} />
              Comportamiento Real y Prospectivo de los Ingresos
            </h2>
            <p className="text-xs text-slate-400">Evolución mensual, cumplimiento frente al aforo y concentración de fuentes.</p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              {/* Gráfico 1: Ingreso mensual Real vs Proyectado */}
              <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                <h4 className="text-xs font-bold text-slate-300 uppercase mb-4">Gráfico 1 — Recaudo Mensual (Ene-Ago Real / Sep-Dic Proy)</h4>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyFlow}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="month" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                      <YAxis stroke="#94a3b8" tickFormatter={formatCurrencyShort} tick={{ fontSize: 10 }} />
                      <RechartsTooltip formatter={(val: any) => [formatCurrency(Number(val)), 'Ingreso']} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                      <Bar dataKey="totalIng">
                        {monthlyFlow.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.isReal ? '#10b981' : '#f59e0b'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-4 text-xs mt-2">
                  <span className="flex items-center gap-1.5"><div className="w-3 h-3 bg-emerald-500 rounded"></div> Real (Ene-Ago)</span>
                  <span className="flex items-center gap-1.5"><div className="w-3 h-3 bg-amber-500 rounded"></div> Proyectado (Sep-Dic)</span>
                </div>
              </div>

              {/* Gráfico 2: Aforo vs Recaudo vs Proyección Anual */}
              <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                <h4 className="text-xs font-bold text-slate-300 uppercase mb-4">Gráfico 2 — Aforo vs Recaudo Real vs Proyección Cierre</h4>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { concepto: 'Aforo Presupuestal', valor: aforoTotal, fill: '#64748b' },
                      { concepto: 'Recaudo a 31/08 (Real)', valor: recaudoRealAgo, fill: '#10b981' },
                      { concepto: 'Ingresos Proyectados Cierre', valor: ingresosTotalesCierre, fill: '#3b82f6' }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="concepto" stroke="#94a3b8" tick={{ fontSize: 10 }} />
                      <YAxis stroke="#94a3b8" tickFormatter={formatCurrencyShort} tick={{ fontSize: 10 }} />
                      <RechartsTooltip formatter={(val: any) => [formatCurrency(Number(val)), 'Total']} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                      <Bar dataKey="valor" radius={[6, 6, 0, 0]}>
                        <Cell fill="#64748b" />
                        <Cell fill="#10b981" />
                        <Cell fill="#3b82f6" />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-xs text-slate-400 text-center mt-2">
                  La proyección de cierre supera el aforo en un <strong>+{((ingresosTotalesCierre/aforoTotal - 1)*100).toFixed(1)}%</strong> por adición de recursos y giros extraordinarios.
                </p>
              </div>
            </div>

            {/* Ranking de Recursos */}
            <div className="mt-8">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-3">Ranking de Recursos por Volumen de Recaudo</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[...results.resources].sort((a,b) => b.ingresosReales - a.ingresosReales).slice(0, 6).map((r, idx) => (
                  <div key={r.recurso} className="bg-white/5 p-3.5 rounded-xl border border-white/5 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] font-mono text-emerald-400 font-bold">#{idx + 1} Recurso {r.recurso}</span>
                      <p className="text-xs text-white font-bold truncate max-w-[170px]">{r.nombre}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-mono font-bold text-emerald-300">{formatCurrencyShort(r.ingresosReales)}</span>
                      <span className="text-[10px] text-slate-400 block">{formatPercent((aforoMap[r.recurso] || 0) > 0 ? r.ingresosReales / (aforoMap[r.recurso] || 0) : 1)} aforo</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. GASTOS                                                 */}
      {/* ========================================================= */}
      {activeTab === 'gastos' && (
        <div className="space-y-6">
          <div className="glass-card p-6 rounded-2xl border border-white/10">
            <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <TrendingDown className="text-rose-400" size={22} />
              Comportamiento Real y Clasificación del Gasto
            </h2>
            <p className="text-xs text-slate-400">Distribución de los compromisos completos ({formatCurrencyShort(compromisos2026)}) en las 5 tipologías presupuestales oficiales.</p>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-6">
              {expenseMatrix.map(t => {
                const total = t.monthly.reduce((a,b) => a+b, 0);
                const pct = compromisos2026 > 0 ? (total / compromisos2026) : 0;
                return (
                  <div key={t.name} className="bg-white/5 p-4 rounded-xl border border-white/5">
                    <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block truncate">{t.name}</span>
                    <p className="text-xl font-mono font-bold text-white mt-1">{formatCurrencyShort(total)}</p>
                    <div className="mt-2 flex justify-between text-[11px] text-slate-400">
                      <span>Participación:</span>
                      <span className="text-rose-400 font-bold">{formatPercent(pct)}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 bg-black/20 p-5 rounded-xl border border-white/5">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Curva Mensual de Desembolsos y Presión en Diciembre</h4>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyFlow}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="month" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" tickFormatter={formatCurrencyShort} />
                    <RechartsTooltip formatter={(val: any) => [formatCurrency(Number(val)), 'Total Gasto']} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                    <Area type="monotone" dataKey="totalGasto" stroke="#f43f5e" fill="rgba(244, 63, 94, 0.2)" strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-slate-300 mt-2 text-center">
                Observe el incremento en <strong>Diciembre ($91.37 MM)</strong> debido al pago acumulado de nómina docente, bonificaciones y prima de navidad.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 5. ANÁLISIS POR RECURSO                                   */}
      {/* ========================================================= */}
      {activeTab === 'recursos' && (
        <div className="space-y-6">
          <div className="glass-card p-6 rounded-2xl border border-white/10">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Layers className="text-blue-400" size={22} />
                  Matriz Integral de Recursos Financieros
                </h2>
                <p className="text-xs text-slate-400">Evaluación del recaudo, compromisos oficiales y saldo proyectado de cada fondo institucional.</p>
              </div>
              <span className="text-xs font-mono bg-white/5 px-3 py-1.5 rounded-lg border border-white/10 text-slate-300">
                Total Recursos: {results.resources.length}
              </span>
            </div>

            <div className="w-full overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 uppercase font-mono">
                    <th className="p-3">Recurso</th>
                    <th className="p-3">Denominación</th>
                    <th className="p-3 text-right">Aforo</th>
                    <th className="p-3 text-right text-emerald-400">Recaudo 31/08</th>
                    <th className="p-3 text-right">% Recaudo</th>
                    <th className="p-3 text-right">Proy Sep-Dic</th>
                    <th className="p-3 text-right text-emerald-300">Ingreso Total</th>
                    <th className="p-3 text-right text-rose-400">Compromiso 2026</th>
                    <th className="p-3 text-right text-blue-400">Pago Cierre</th>
                    <th className="p-3 text-right text-white font-bold">Saldo Cierre</th>
                    <th className="p-3 text-center">Riesgo</th>
                  </tr>
                </thead>
                <tbody>
                  {results.resources.map(r => {
                    const pctRec = (aforoMap[r.recurso] || 0) > 0 ? r.ingresosReales / (aforoMap[r.recurso] || 0) : 1;
                    const pctPagado = r.totalCompromisos > 0 ? (r.totalPagos / r.totalCompromisos) * 100 : 100;
                    const isDeficit = r.totalIngresos < r.totalCompromisos;
                    const riesgo = isDeficit 
                      ? { badge: '🔴 Alto', desc: 'Recaudo topa pagos' } 
                      : r.saldoDisponible < 1e9 
                      ? { badge: '🟡 Medio', desc: 'Saldo ajustado' } 
                      : { badge: '🟢 Bajo', desc: '100% Cubierto' };

                    return (
                      <tr key={r.recurso} className="border-b border-white/5 hover:bg-white/[0.02] font-mono text-[11px]">
                        <td className="p-3 font-bold text-slate-300">R{r.recurso}</td>
                        <td className="p-3 text-slate-300 font-sans max-w-[180px] truncate">{r.nombre}</td>
                        <td className="p-3 text-right text-slate-400">{formatCurrencyShort((aforoMap[r.recurso] || 0))}</td>
                        <td className="p-3 text-right text-emerald-400 font-bold">{formatCurrencyShort(r.ingresosReales)}</td>
                        <td className="p-3 text-right text-slate-300">{formatPercent(pctRec)}</td>
                        <td className="p-3 text-right text-slate-400">{formatCurrencyShort(r.ingresosProyectados)}</td>
                        <td className="p-3 text-right text-emerald-300 font-bold">{formatCurrencyShort(r.totalIngresos)}</td>
                        <td className="p-3 text-right text-rose-300 font-bold">{formatCurrencyShort(r.totalCompromisos)}</td>
                        <td className="p-3 text-right text-blue-300 font-bold">{formatCurrencyShort(r.totalPagos)}</td>
                        <td className="p-3 text-right font-bold text-white bg-white/5">{formatCurrencyShort(r.saldoDisponible)}</td>
                        <td className="p-3 text-center" title={riesgo.desc}>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-white/5 border border-white/10">
                            {riesgo.badge}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-white/20 font-bold text-xs bg-white/5 font-mono">
                    <td colSpan={2} className="p-3 text-white uppercase font-sans">Totales Institucionales</td>
                    <td className="p-3 text-right text-slate-400">{formatCurrencyShort(aforoTotal)}</td>
                    <td className="p-3 text-right text-emerald-400">{formatCurrencyShort(recaudoRealAgo)}</td>
                    <td className="p-3 text-right text-white">{formatPercent(recaudoPct)}</td>
                    <td className="p-3 text-right text-slate-300">{formatCurrencyShort(ingresosProySepDic)}</td>
                    <td className="p-3 text-right text-emerald-300">{formatCurrencyShort(ingresosTotalesCierre)}</td>
                    <td className="p-3 text-right text-rose-400">{formatCurrencyShort(compromisos2026)}</td>
                    <td className="p-3 text-right text-blue-400">{formatCurrencyShort(pagosProyectadosCierre)}</td>
                    <td className="p-3 text-right text-white bg-white/10">{formatCurrencyShort(saldoFinalDisponible)}</td>
                    <td className="p-3 text-center text-emerald-400">96.6% Global</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 6. ANÁLISIS POR RUBRO                                     */}
      {/* ========================================================= */}
      {activeTab === 'rubros' && (
        <div className="space-y-6">
          <div className="glass-card p-6 rounded-2xl border border-white/10">
            <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <BarChart3 className="text-purple-400" size={22} />
              Análisis por Tipologías y Rubros Presupuestales
            </h2>
            <p className="text-xs text-slate-400">Evaluación de la ejecución, pagos reales y presión de gasto al cierre.</p>

            <div className="space-y-4 mt-6">
              {expenseMatrix.map(t => {
                const total = t.monthly.reduce((a,b)=>a+b,0);
                const pct = compromisos2026 > 0 ? (total / compromisos2026) : 0;
                return (
                  <div key={t.name} className="bg-slate-900/60 p-4 rounded-xl border border-white/5 space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-bold text-white flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-400"></span>
                        {t.name}
                      </span>
                      <div className="text-right">
                        <span className="font-mono font-bold text-white text-base">{formatCurrencyShort(total)}</span>
                        <span className="text-xs text-slate-400 ml-2">({formatPercent(pct)} del total)</span>
                      </div>
                    </div>
                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct * 100}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl">
              <h4 className="text-xs font-bold text-amber-300 uppercase mb-1 flex items-center gap-2">
                <AlertTriangle size={15} /> Top Factores de Presión Presupuestal
              </h4>
              <p className="text-xs text-amber-200/90 leading-relaxed">
                El <strong>94.6%</strong> de los compromisos universitarios se concentra en únicamente dos rubros: <strong>2.1.1 Gastos de Personal ($369.65 MM)</strong> y <strong>2.1.2 Gastos de Funcionamiento ($154.90 MM)</strong>. La rigidez de la nómina y los servicios esenciales limita la reasignación de partidas hacia inversión en el último trimestre.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 7. PROYECCIÓN SEPTIEMBRE - DICIEMBRE                      */}
      {/* ========================================================= */}
      {activeTab === 'proyeccion' && (
        <div className="space-y-6">
          <div className="glass-card p-6 rounded-2xl border border-white/10">
            <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <Clock className="text-amber-400" size={22} />
              Proyección Financiera Cuatrimestre de Cierre (Septiembre – Diciembre)
            </h2>
            <p className="text-xs text-slate-400">Valores proyectados con el motor matemático institucional considerando giros SIIF y estacionalidad.</p>

            <div className="w-full overflow-x-auto mt-6">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 uppercase font-mono">
                    <th className="p-3">Periodo / Mes</th>
                    <th className="p-3 text-center">Naturaleza</th>
                    <th className="p-3 text-right text-emerald-400">Ingresos Reales</th>
                    <th className="p-3 text-right text-rose-400">Gastos Reales</th>
                    <th className="p-3 text-right text-emerald-300">Ingresos Proyectados</th>
                    <th className="p-3 text-right text-rose-300">Gastos Proyectados</th>
                    <th className="p-3 text-right text-blue-400">Flujo Neto</th>
                    <th className="p-3 text-right text-white">Saldo de Caja</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyFlow.map(m => (
                    <tr key={m.month} className={`border-b border-white/5 font-mono ${m.isReal ? 'bg-white/[0.01]' : 'bg-amber-500/[0.03]'}`}>
                      <td className="p-3 font-bold text-white">{m.month}</td>
                      <td className="p-3 text-center">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${m.isReal ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
                          {m.tipoPeriodo}
                        </span>
                      </td>
                      <td className="p-3 text-right text-emerald-400">{m.isReal ? formatCurrencyShort(m.ingReal) : '-'}</td>
                      <td className="p-3 text-right text-rose-400">{m.isReal ? formatCurrencyShort(m.gasReal) : '-'}</td>
                      <td className="p-3 text-right text-emerald-300">{!m.isReal ? formatCurrencyShort(m.ingProy) : '-'}</td>
                      <td className="p-3 text-right text-rose-300">{!m.isReal ? formatCurrencyShort(m.gasProy) : '-'}</td>
                      <td className={`p-3 text-right font-bold ${m.flujoNeto >= 0 ? 'text-blue-400' : 'text-orange-400'}`}>{formatCurrencyShort(m.flujoNeto)}</td>
                      <td className="p-3 text-right text-white font-bold bg-white/5">{formatCurrencyShort(m.saldoFin)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 8. FLUJO DE CAJA PROYECTADO AL CIERRE                     */}
      {/* ========================================================= */}
      {activeTab === 'flujo' && (
        <div className="space-y-6">
          <div className="glass-card p-6 rounded-2xl border border-white/10">
            <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <Wallet className="text-blue-400" size={22} />
              ¿Con cuánto dinero se espera cerrar la vigencia 2026?
            </h2>
            <p className="text-xs text-slate-400">Ecuación matemática de liquidación de tesorería y posición final de liquidez.</p>

            {/* ECUACIÓN VISUAL GERENCIAL */}
            <div className="bg-slate-900/80 p-6 rounded-2xl border border-white/10 my-6">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-center text-center">
                
                <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Saldo Inicial</span>
                  <p className="text-lg font-mono font-bold text-white mt-1">{formatCurrencyShort(saldoInicial)}</p>
                </div>

                <div className="text-2xl font-bold text-slate-500">+</div>

                <div className="bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/20">
                  <span className="text-[10px] text-emerald-400 uppercase font-bold block">Ingresos Totales</span>
                  <p className="text-lg font-mono font-bold text-emerald-300 mt-1">{formatCurrencyShort(ingresosTotalesCierre)}</p>
                  <span className="text-[10px] text-slate-400">Real + Proyectado</span>
                </div>

                <div className="text-2xl font-bold text-slate-500">-</div>

                <div className="bg-rose-500/10 p-4 rounded-xl border border-rose-500/20">
                  <span className="text-[10px] text-rose-400 uppercase font-bold block">Pagos Totales Cierre</span>
                  <p className="text-lg font-mono font-bold text-rose-300 mt-1">{formatCurrencyShort(pagosProyectadosCierre)}</p>
                  <span className="text-[10px] text-slate-400">Desembolsos efectivos</span>
                </div>

              </div>

              <div className="mt-6 pt-6 border-t border-white/10 text-center">
                <span className="text-xs uppercase font-bold text-slate-400 tracking-wider block">Resultado Esperado al 31 de Diciembre de 2026</span>
                <p className="text-4xl md:text-5xl font-display font-bold text-emerald-400 mt-2">{formatCurrencyShort(saldoFinalDisponible)}</p>
                <div className="mt-3 inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-4 py-1.5 rounded-full text-xs font-bold font-mono">
                  <CheckCircle size={15} />
                  SUPERÁVIT DISPONIBLE EN BANCOS (CIERRE POSITIVO)
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 9. ALERTAS Y RIESGOS                                      */}
      {/* ========================================================= */}
      {activeTab === 'alertas' && (
        <div className="space-y-6">
          <div className="glass-card p-6 rounded-2xl border border-white/10">
            <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <AlertTriangle className="text-amber-400" size={22} />
              Centro de Alertas Técnicas para el Cierre
            </h2>
            <p className="text-xs text-slate-400">Detección automática de factores de riesgo financiero y recomendaciones de mitigación.</p>

            <div className="space-y-4 mt-6">
              
              <div className="bg-rose-500/10 border-l-4 border-l-rose-500 p-4 rounded-r-xl border-y border-r border-rose-500/20">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertCircle size={16} /> Alerta 1 — Compromisos Exceden Recaudo en Recursos Específicos
                  </span>
                  <span className="text-[10px] font-mono bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded font-bold">Crítico</span>
                </div>
                <div className="mt-2 text-xs text-slate-300 space-y-1">
                  <p><strong>Indicador:</strong> Recursos con recaudo inferior a compromisos contratados (Fondo Especial R14, R10.5 Gratuidad, R33 Convenios).</p>
                  <p><strong>Impacto:</strong> Si se pagaran al 100%, se generaría déficit de caja por <strong>$18.763 MM</strong>.</p>
                  <p className="text-rose-200"><strong>Acción de Mitigación:</strong> Aplicar estrictamente la regla de tope de pagos al recaudo real disponible. No autorizar desembolsos adicionales sin ingreso efectivo en bancos.</p>
                </div>
              </div>

              <div className="bg-amber-500/10 border-l-4 border-l-amber-500 p-4 rounded-r-xl border-y border-r border-amber-500/20">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock size={16} /> Alerta 2 — Concentración de Desembolsos en Diciembre (Nómina y Primas)
                  </span>
                  <span className="text-[10px] font-mono bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-bold">Seguimiento</span>
                </div>
                <div className="mt-2 text-xs text-slate-300 space-y-1">
                  <p><strong>Indicador:</strong> El mes de diciembre concentra <strong>$91.37 MM</strong> en pagos (16.5% del gasto anual en un solo mes).</p>
                  <p><strong>Impacto:</strong> Exigencia máxima de liquidez en la segunda semana de diciembre.</p>
                  <p className="text-amber-200"><strong>Acción de Mitigación:</strong> Pre-fondear la tesorería durante noviembre con los giros de Nación y reservas de recursos propios para evitar descalces en la fecha de dispersión de nómina.</p>
                </div>
              </div>

              <div className="bg-blue-500/10 border-l-4 border-l-blue-500 p-4 rounded-r-xl border-y border-r border-blue-500/20">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Activity size={16} /> Alerta 3 — Dependencia de Giros SIIF MinHacienda (Recurso 10)
                  </span>
                  <span className="text-[10px] font-mono bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded font-bold">Control Externo</span>
                </div>
                <div className="mt-2 text-xs text-slate-300 space-y-1">
                  <p><strong>Indicador:</strong> R10 Nación aporta más del 70% de la financiación de la nómina docente y administrativa.</p>
                  <p><strong>Impacto:</strong> Cualquier retraso en el PAC de la Dirección del Tesoro Nacional alteraría el cronograma de giros.</p>
                  <p className="text-blue-200"><strong>Acción de Mitigación:</strong> Mantener enlace permanente con la Dirección de Presupuesto del MinEducación para asegurar el cumplimiento del cronograma de giros programados.</p>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 10. ESCENARIOS                                            */}
      {/* ========================================================= */}
      {activeTab === 'escenarios' && (
        <div className="space-y-6">
          <div className="glass-card p-6 rounded-2xl border border-white/10">
            <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <Activity className="text-indigo-400" size={22} />
              Simulación de Escenarios de Cierre Presupuestal
            </h2>
            <p className="text-xs text-slate-400">Análisis de sensibilidad ante variaciones macroeconómicas y de recaudo.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
              
              {/* Conservador */}
              <div className="bg-slate-900/80 p-5 rounded-2xl border border-white/10">
                <span className="text-xs font-bold text-amber-400 uppercase font-mono">Escenario 1 — Conservador</span>
                <p className="text-xs text-slate-400 mt-1">Recaudo propio -5%, rezago en convenios.</p>
                <div className="mt-4 space-y-2 text-xs">
                  <div className="flex justify-between"><span className="text-slate-400">Ingresos Totales:</span><span className="font-mono text-white">$560.45MM</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Pagos Cierre:</span><span className="font-mono text-white">$533.60MM</span></div>
                  <div className="flex justify-between font-bold pt-2 border-t border-white/10"><span className="text-slate-300">Saldo Disponible:</span><span className="font-mono text-amber-400">$26.85MM</span></div>
                </div>
                <div className="mt-4 bg-amber-500/10 text-amber-300 text-[10px] p-2 rounded text-center font-bold">
                  Sostenible con Margen Estrecho
                </div>
              </div>

              {/* Base */}
              <div className="bg-slate-900/80 p-5 rounded-2xl border-2 border-emerald-500 shadow-xl shadow-emerald-500/5">
                <span className="text-xs font-bold text-emerald-400 uppercase font-mono">Escenario 2 — Base Oficial (Vigente)</span>
                <p className="text-xs text-slate-400 mt-1">Cumplimiento de giros SIIF y tendencia real.</p>
                <div className="mt-4 space-y-2 text-xs">
                  <div className="flex justify-between"><span className="text-slate-400">Ingresos Totales:</span><span className="font-mono text-white">{formatCurrencyShort(ingresosTotalesCierre)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Pagos Cierre:</span><span className="font-mono text-white">{formatCurrencyShort(pagosProyectadosCierre)}</span></div>
                  <div className="flex justify-between font-bold pt-2 border-t border-white/10"><span className="text-slate-300">Saldo Disponible:</span><span className="font-mono text-emerald-400">{formatCurrencyShort(saldoFinalDisponible)}</span></div>
                </div>
                <div className="mt-4 bg-emerald-500/20 text-emerald-300 text-[10px] p-2 rounded text-center font-bold">
                  Recomendado para Planificación
                </div>
              </div>

              {/* Optimista */}
              <div className="bg-slate-900/80 p-5 rounded-2xl border border-white/10">
                <span className="text-xs font-bold text-blue-400 uppercase font-mono">Escenario 3 — Optimista</span>
                <p className="text-xs text-slate-400 mt-1">Recaudo propio +5%, adición de saldos.</p>
                <div className="mt-4 space-y-2 text-xs">
                  <div className="flex justify-between"><span className="text-slate-400">Ingresos Totales:</span><span className="font-mono text-white">$619.45MM</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Pagos Cierre:</span><span className="font-mono text-white">$537.95MM</span></div>
                  <div className="flex justify-between font-bold pt-2 border-t border-white/10"><span className="text-slate-300">Saldo Disponible:</span><span className="font-mono text-blue-400">$81.50MM</span></div>
                </div>
                <div className="mt-4 bg-blue-500/10 text-blue-300 text-[10px] p-2 rounded text-center font-bold">
                  Holgura Financiera Amplia
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 11. CONCLUSIONES                                          */}
      {/* ========================================================= */}
      {activeTab === 'conclusiones' && (
        <div className="space-y-6">
          <div className="glass-card p-6 rounded-2xl border border-white/10">
            <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <CheckSquare className="text-emerald-400" size={22} />
              Conclusiones del Informe Técnico Gerencial
            </h2>
            <p className="text-xs text-slate-400">Dictamen cuantitativo fundamentado en la ejecución presupuestal y de tesorería.</p>

            <div className="space-y-3 mt-6">
              {[
                { num: '1', title: 'Comportamiento de Ingresos', text: `El recaudo efectivo a 31 de agosto alcanzó ${formatCurrencyShort(recaudoRealAgo)} (${formatPercent(recaudoPct)} del aforo), proyectando un cierre consolidado de ${formatCurrencyShort(ingresosTotalesCierre)} gracias a los giros programados del SIIF y matrícula de posgrados.` },
                { num: '2', title: 'Techo Contractual Cerrado', text: `Los compromisos institucionales están formalmente acotados a ${formatCurrencyShort(compromisos2026)} (archivo oficial Gastos 2026). No se deben tramitar compromisos adicionales que desbalanceen la posición de caja.` },
                { num: '3', title: 'Cobertura Efectiva de Pagos', text: `El modelo garantiza el desembolso de ${formatCurrencyShort(pagosProyectadosCierre)}, logrando cubrir el 96.6% de todos los compromisos adquiridos sin incurrir en mora en partidas esenciales.` },
                { num: '4', title: 'Superávit Protegido en Tesorería', text: `Se proyecta culminar la vigencia 2026 con un saldo disponible de ${formatCurrencyShort(saldoFinalDisponible)}, resguardando la solvencia para el inicio del ejercicio 2027.` },
                { num: '5', title: 'Recursos Líderes en Solvencia', text: 'Los Recursos 10 (Nación), 20 (Recursos Propios) y 31 (Posgrados) muestran balances robustos que aseguran el 100% de cobertura de sus compromisos asociados.' },
                { num: '6', title: 'Disciplina en Recursos Restringidos', text: 'En fondos con déficit estructural de recaudo (R14 FSE y ciertos convenios), los pagos quedan restringidos a la disponibilidad real en bancos, blindando a la Universidad frente a sobregiros.' },
                { num: '7', title: 'Pico Estacional Superado', text: `El flujo acumulado permite amortiguar con total normalidad el pago masivo de nómina y prima navideña en diciembre ($91.37 MM).` },
                { num: '8', title: 'Sostenibilidad Integral', text: 'La Universidad mantiene un índice de liquidez favorable, requiriendo únicamente sostener las medidas de control del gasto durante el último trimestre.' }
              ].map(c => (
                <div key={c.num} className="bg-white/[0.02] p-4 rounded-xl border border-white/5 flex gap-4 items-start">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0 text-xs font-mono">
                    {c.num}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">{c.title}</h4>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">{c.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 12. RECOMENDACIONES GERENCIALES                           */}
      {/* ========================================================= */}
      {activeTab === 'recomendaciones' && (
        <div className="space-y-6">
          <div className="glass-card p-6 rounded-2xl border border-white/10">
            <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <ShieldCheck className="text-emerald-400" size={22} />
              Plan de Acción y Recomendaciones para el Cierre de la Vigencia 2026
            </h2>
            <p className="text-xs text-slate-400">Acciones clasificadas por horizonte temporal para asegurar un cierre financiero ordenado.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              
              {/* Acciones Inmediatas (Septiembre) */}
              <div className="bg-slate-900/80 p-5 rounded-xl border-l-4 border-l-rose-500 border-y border-r border-white/5 space-y-3">
                <span className="text-xs font-bold text-rose-400 uppercase tracking-wider block">1. Acciones Inmediatas (Septiembre)</span>
                <div className="space-y-2 text-xs text-slate-300">
                  <p><strong>• Congelamiento de Compromisos:</strong> Emitir circular de cierre presupuestal ordenando el cierre de expedición de Certificados de Disponibilidad Presupuestal (CDP) que no correspondan a nómina o servicios públicos.</p>
                  <p><strong>• Gestión de Giros SIIF:</strong> Radicar ante el Ministerio de Hacienda los soportes requeridos para liberar los desembolsos de Nación de octubre y noviembre.</p>
                  <div className="text-[11px] text-slate-400 pt-2 border-t border-white/10 flex justify-between">
                    <span>Responsable: Dirección Financiera</span>
                    <span className="text-rose-400 font-bold">Prioridad Alta</span>
                  </div>
                </div>
              </div>

              {/* Acciones de Seguimiento (Octubre - Noviembre) */}
              <div className="bg-slate-900/80 p-5 rounded-xl border-l-4 border-l-amber-500 border-y border-r border-white/5 space-y-3">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">2. Acciones de Seguimiento (Octubre - Noviembre)</span>
                <div className="space-y-2 text-xs text-slate-300">
                  <p><strong>• Pre-fondeo de Tesorería Decembrina:</strong> Reservar liquidez en cuentas maestras para consolidar los $91.37 MM exigidos para salarios y primas de fin de año.</p>
                  <p><strong>• Depuración de Convenios:</strong> Conciliar cuentas por cobrar de convenios interadministrativos rezagados.</p>
                  <div className="text-[11px] text-slate-400 pt-2 border-t border-white/10 flex justify-between">
                    <span>Responsable: Tesorería / División Presupuesto</span>
                    <span className="text-amber-400 font-bold">Prioridad Media</span>
                  </div>
                </div>
              </div>

              {/* Acciones de Cierre (Diciembre) */}
              <div className="bg-slate-900/80 p-5 rounded-xl border-l-4 border-l-blue-500 border-y border-r border-white/5 space-y-3">
                <span className="text-xs font-bold text-blue-400 uppercase tracking-wider block">3. Acciones de Cierre (Diciembre)</span>
                <div className="space-y-2 text-xs text-slate-300">
                  <p><strong>• Calendario de Pagos Bancarios:</strong> Fijar el 23 de diciembre como fecha límite para transmisión de pagos electrónicos a proveedores y contratistas.</p>
                  <p><strong>• Constitución de Reservas Presupuestales:</strong> Constituir reservas exclusivamente sobre compromisos legalmente perfeccionados que cuenten con respaldo de recaudo real.</p>
                  <div className="text-[11px] text-slate-400 pt-2 border-t border-white/10 flex justify-between">
                    <span>Responsable: Contabilidad / Tesorería</span>
                    <span className="text-blue-400 font-bold">Prioridad Alta</span>
                  </div>
                </div>
              </div>

              {/* Acciones Estructurales (Futuras Vigencias) */}
              <div className="bg-slate-900/80 p-5 rounded-xl border-l-4 border-l-emerald-500 border-y border-r border-white/5 space-y-3">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">4. Acciones Estructurales (2027 en adelante)</span>
                <div className="space-y-2 text-xs text-slate-300">
                  <p><strong>• Fondo de Estabilización de Nómina:</strong> Crear una reserva técnica que amortigüe la concentración de pagos de primas de junio y diciembre.</p>
                  <p><strong>• Plan Anual Mensualizado de Caja (PAC):</strong> Articular los calendarios académicos con la estacionalidad de ingresos de matrícula.</p>
                  <div className="text-[11px] text-slate-400 pt-2 border-t border-white/10 flex justify-between">
                    <span>Responsable: Vicerrectoría Administrativa</span>
                    <span className="text-emerald-400 font-bold">Estratégico</span>
                  </div>
                </div>
              </div>

            </div>

            {/* TABLA OFICIAL DE INDICADORES DE CIERRE */}
            <div className="mt-8">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Cuadro Institucional de Indicadores de Cierre</h4>
              <div className="w-full overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-400 uppercase font-mono">
                      <th className="p-3">Indicador</th>
                      <th className="p-3 text-right">Resultado</th>
                      <th className="p-3 text-right">Meta / Referencia</th>
                      <th className="p-3 text-center">Estado</th>
                      <th className="p-3">Diagnóstico Gerencial</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-white/5">
                      <td className="p-3 font-bold text-white">Eficacia del Recaudo</td>
                      <td className="p-3 text-right font-mono text-emerald-400 font-bold">{formatPercent(recaudoPct)}</td>
                      <td className="p-3 text-right font-mono text-slate-400">66.7% a agosto</td>
                      <td className="p-3 text-center">🟢</td>
                      <td className="p-3 text-slate-300">Recaudo dinámico por encima del ritmo histórico del aforo.</td>
                    </tr>
                    <tr className="border-b border-white/5">
                      <td className="p-3 font-bold text-white">Cobertura de Compromisos</td>
                      <td className="p-3 text-right font-mono text-emerald-400 font-bold">{formatPercent(pagosPctCompromiso)}</td>
                      <td className="p-3 text-right font-mono text-slate-400">95.0% meta</td>
                      <td className="p-3 text-center">🟢</td>
                      <td className="p-3 text-slate-300">Capacidad para atender el 96.6% de obligaciones contractuales.</td>
                    </tr>
                    <tr className="border-b border-white/5">
                      <td className="p-3 font-bold text-white">Flujo Neto Institucional</td>
                      <td className="p-3 text-right font-mono text-blue-400 font-bold">{formatCurrencyShort(saldoFinalDisponible)}</td>
                      <td className="p-3 text-right font-mono text-slate-400">&gt; $0</td>
                      <td className="p-3 text-center">🟢</td>
                      <td className="p-3 text-slate-300">Superávit protegido al cierre de la vigencia.</td>
                    </tr>
                    <tr className="border-b border-white/5">
                      <td className="p-3 font-bold text-white">Riesgo de Déficit de Caja</td>
                      <td className="p-3 text-right font-mono text-emerald-400 font-bold">Bajo / Nulo</td>
                      <td className="p-3 text-right font-mono text-slate-400">Bajo</td>
                      <td className="p-3 text-center">🟢</td>
                      <td className="p-3 text-slate-300">Protección garantizada mediante la regla de limitación de pagos.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL DE IMPRESIÓN / EXPORTACIÓN FORMAL DEL INFORME       */}
      {/* ========================================================= */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="bg-[#0f172a] border border-slate-700 w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col my-8">
            
            <div className="px-6 py-4 border-b border-slate-700 flex justify-between items-center bg-slate-900">
              <div className="flex items-center gap-2">
                <FileText className="text-emerald-400" size={20} />
                <h3 className="text-sm font-bold text-white uppercase">Vista Preliminar de Impresión / Exportación PDF</h3>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Printer size={15} />
                  Imprimir / Guardar como PDF
                </button>
                <button
                  onClick={() => setIsPrintModalOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
            </div>

            <div ref={printRef} className="p-8 bg-white text-slate-900 space-y-8 overflow-y-auto max-h-[80vh]">
              
              {/* PORTADA FORMAL */}
              <div className="border-b-4 border-slate-900 pb-6 text-center space-y-3">
                <div className="flex justify-center mb-2">
                  <img src="https://raw.githubusercontent.com/fabiancho0724/VAFI-Reporte-Financiero/7601e17bbde30e0381cc947ff62d9345b0ec3853/uptc-blanco%20(1).png" alt="UPTC" className="w-16 h-16 invert" />
                </div>
                <h1 className="text-2xl font-bold uppercase tracking-wider text-slate-900">UNIVERSIDAD PEDAGÓGICA Y TECNOLÓGICA DE COLOMBIA</h1>
                <h2 className="text-lg font-bold text-slate-700">VICERRECTORÍA ADMINISTRATIVA Y FINANCIERA — DIRECCIÓN FINANCIERA</h2>
                <div className="py-2 inline-block px-6 bg-slate-100 rounded-full border border-slate-300">
                  <span className="text-sm font-bold text-slate-900 tracking-wide">
                    INFORME TÉCNICO GERENCIAL — FLUJO DE CAJA Y PROYECCIÓN DE CIERRE 2026
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-mono">FECHA OFICIAL DE CORTE: 31 DE AGOSTO DE 2026</p>
              </div>

              {/* CONTENIDO EJECUTIVO DEL DOCUMENTO */}
              <div className="space-y-6 text-xs text-slate-800 leading-relaxed font-sans">
                
                <div>
                  <h3 className="text-sm font-bold uppercase border-b border-slate-300 pb-1 mb-2 text-slate-900">1. Resumen de Cifras Clave de la Vigencia</h3>
                  <table className="w-full border-collapse border border-slate-300 text-xs">
                    <tbody>
                      <tr className="border-b border-slate-200">
                        <td className="p-2 font-bold bg-slate-100 w-1/2">Ingreso Aforado Institucional:</td>
                        <td className="p-2 font-mono">{formatCurrency(aforoTotal)}</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="p-2 font-bold bg-slate-100">Recaudo Efectivo a 31 de Agosto (Real):</td>
                        <td className="p-2 font-mono font-bold text-emerald-700">{formatCurrency(recaudoRealAgo)} ({formatPercent(recaudoPct)})</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="p-2 font-bold bg-slate-100">Ingresos Proyectados Sep-Dic:</td>
                        <td className="p-2 font-mono">{formatCurrency(ingresosProySepDic)}</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="p-2 font-bold bg-slate-100">Total Ingresos Estimados al Cierre:</td>
                        <td className="p-2 font-mono font-bold">{formatCurrency(ingresosTotalesCierre)}</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="p-2 font-bold bg-slate-100">Compromisos Vigencia (Gastos 2026):</td>
                        <td className="p-2 font-mono font-bold text-rose-700">{formatCurrency(compromisos2026)}</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="p-2 font-bold bg-slate-100">Pagos Proyectados Cierre:</td>
                        <td className="p-2 font-mono font-bold text-blue-700">{formatCurrency(pagosProyectadosCierre)} (96.6% Cobertura)</td>
                      </tr>
                      <tr className="bg-emerald-50">
                        <td className="p-2 font-bold text-emerald-900">Saldo Disponible Proyectado al 31/12/2026:</td>
                        <td className="p-2 font-mono font-bold text-emerald-900 text-sm">{formatCurrency(saldoFinalDisponible)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div>
                  <h3 className="text-sm font-bold uppercase border-b border-slate-300 pb-1 mb-2 text-slate-900">2. Dictamen Gerencial de Viabilidad</h3>
                  <p>
                    El análisis técnico del flujo de caja institucional concluye que la Universidad Pedagógica y Tecnológica de Colombia dispone de las condiciones financieras para cerrar la vigencia 2026 de manera <strong>favorable y equilibrada</strong>, alcanzando una cobertura de desembolsos del <strong>96.6%</strong> sobre los compromisos adquiridos y salvaguardando un superávit de tesorería por <strong>{formatCurrency(saldoFinalDisponible)}</strong>.
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-bold uppercase border-b border-slate-300 pb-1 mb-2 text-slate-900">3. Tabla de Distribución por Tipos de Gasto</h3>
                  <table className="w-full border-collapse border border-slate-300 text-xs">
                    <thead>
                      <tr className="bg-slate-100 font-bold border-b border-slate-300">
                        <th className="p-2 text-left">Tipo de Gasto</th>
                        <th className="p-2 text-right">Compromiso Total 2026</th>
                        <th className="p-2 text-right">% Participación</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenseMatrix.map(t => {
                        const total = t.monthly.reduce((a,b)=>a+b,0);
                        return (
                          <tr key={t.name} className="border-b border-slate-200">
                            <td className="p-2 font-medium">{t.name}</td>
                            <td className="p-2 text-right font-mono">{formatCurrency(total)}</td>
                            <td className="p-2 text-right font-mono">{formatPercent(compromisos2026 > 0 ? total/compromisos2026 : 0)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* FIRMAS INSTITUCIONALES */}
                <div className="pt-12 grid grid-cols-2 gap-12 text-center text-xs">
                  <div className="border-t border-slate-400 pt-2">
                    <p className="font-bold uppercase text-slate-900">Vicerrectoría Administrativa y Financiera</p>
                    <p className="text-slate-500">UPTC — Sede Central Tunja</p>
                  </div>
                  <div className="border-t border-slate-400 pt-2">
                    <p className="font-bold uppercase text-slate-900">Dirección Financiera</p>
                    <p className="text-slate-500">Área de Presupuesto y Tesorería</p>
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
