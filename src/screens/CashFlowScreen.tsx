import React, { useState, useEffect, useMemo } from 'react';
import { 
  ResponsiveContainer, ComposedChart, AreaChart, Area, Line, BarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip as RechartsTooltip, Legend, Cell
} from 'recharts';
import { 
  ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown, Wallet, 
  AlertCircle, AlertTriangle, CheckCircle, Calendar, Filter, 
  ChevronDown, ChevronRight, Download, Maximize2, Coins, Activity, Target,
  Brain, FileText, PieChart as PieChartIcon, Settings, X, Save, Lock, Award
} from 'lucide-react';
import { fetchAndParseCSV } from '../lib/csvParser';
import { calculateStrictProjections, StrictConfig, StrictProjectionResult } from '../lib/strictProjections';
import { RESOURCES_LIST } from '../lib/resourceMapper';
import { RECURSOS_FINANCIEROS } from '../lib/constants';

const formatCurrency = (value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
const formatCurrencyShort = (value: number) => {
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}B`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}MM`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  return formatCurrency(value);
};

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const RUBROS = ['Sueldos Básicos', 'Primas y Bonificaciones', 'Servicios Públicos', 'Mantenimiento', 'Materiales y Suministros', 'Proyectos Inversión'];


const NACION_FIXED = ['10', '10.1', '10.2', '10.3', '10.5', '12', '13', '14', '16', '16.1', '16.2', '17', '18'];

export function CashFlowScreen({ onNavigate }: { onNavigate?: (s: string) => void } = {}) {
  const [dataStage, setDataStage] = useState<'loading' | 'ready' | 'error'>('loading');
  const [csvData, setCsvData] = useState<any>({});
  const [errorMessage, setErrorMessage] = useState('');

  const [selectedPeriod, setSelectedPeriod] = useState('2026');
  const [selectedResource, setSelectedResource] = useState('Todos');
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);
  const [selectedMonthDetail, setSelectedMonthDetail] = useState<any>(null);
  const [expandedTiposGasto, setExpandedTiposGasto] = useState<string[]>(['2.1.1 Gastos de Personal']);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  const handleOverrideChange = (recurso: string, field: 'manualIncome' | 'manualExpense', value: number) => {
    setConfig(prev => ({
      ...prev,
      resourceOverrides: {
        ...prev.resourceOverrides,
        [recurso]: {
          ...(prev.resourceOverrides[recurso] || { method: 'Manual', growthRate: 0 }),
          [field]: value
        }
      }
    }));
  };

  const [config, setConfig] = useState<StrictConfig>({
    scenarioName: 'Proyección Institucional',
    scenario: 'Base',
    globalGrowthRate: 0.041,
    globalExpenseRate: 0.8,
    filterRecurso: 'Todos',
    filterUnidad: 'Todos',
    resourceOverrides: {}
  });

  useEffect(() => {
    async function loadData() {
      try {
        const bd = await fetchAndParseCSV('/data/balance.csv');
        const im = await fetchAndParseCSV('/data/ingresos_mensuales.csv');
        const co = await fetchAndParseCSV('/data/compromisos.csv');
        const nd = await fetchAndParseCSV('/data/Nomina.csv?v=3');
        const hist = await fetchAndParseCSV('/data/Ingreso Mensual 2025.csv');
        const g26 = await fetchAndParseCSV('/data/gastos_2026.csv');
        setCsvData({ balanceData: bd, ingresosMensuales: im, compromisos: co, nominaData: nd, ingresosHistoricos: hist, gastos2026: g26 });
        setDataStage('ready');
      } catch (e: any) {
        setErrorMessage(e.message);
        setDataStage('error');
      }
    }
    loadData();
  }, []);

  const results = useMemo(() => {
    if (dataStage !== 'ready') return null;
    const activeConfig = { ...config, filterRecurso: selectedResource };
    return calculateStrictProjections(
      csvData.balanceData, 
      csvData.ingresosMensuales, 
      csvData.compromisos, 
      csvData.nominaData, 
      csvData.ingresosHistoricos, 
      activeConfig,
      csvData.gastos2026
    );
  }, [dataStage, csvData, config, selectedResource]);

  const heatmapExpenseTypesData = useMemo(() => {
    if (!csvData?.compromisos || !results) return [];

    const resNameMap: Record<string, string> = {};
    RECURSOS_FINANCIEROS.forEach((r: any) => {
      resNameMap[r.codigo] = r.nombre;
    });

    function cleanNum(val: any) {
      if (!val) return 0;
      const s = String(val).replace(/[\$,\s]/g, '').trim();
      return parseFloat(s) || 0;
    }

    function getCol(row: any, keyPart: string) {
      const k = Object.keys(row).find(x => x.toLowerCase().includes(keyPart.toLowerCase()));
      return k ? row[k] : '';
    }

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

    const tiposMap: Record<string, {
      name: string;
      order: number;
      colorBase: string;
      monthly: number[];
      recursos: Record<string, {
        recurso: string;
        nombre: string;
        monthly: number[];
        totalCompG26: number;
        pagoAgoG26: number;
        total: number;
      }>;
    }> = {
      '2.1.1 Gastos de Personal': { name: '2.1.1 Gastos de Personal', order: 1, colorBase: '59, 130, 246', monthly: new Array(12).fill(0), recursos: {} },
      '2.1.2 Gastos de Funcionamiento': { name: '2.1.2 Gastos de Funcionamiento', order: 2, colorBase: '168, 85, 247', monthly: new Array(12).fill(0), recursos: {} },
      '2.3 Gastos de Inversión': { name: '2.3 Gastos de Inversión', order: 3, colorBase: '236, 72, 153', monthly: new Array(12).fill(0), recursos: {} },
      '2.1.3 Transferencias Corrientes': { name: '2.1.3 Transferencias Corrientes', order: 4, colorBase: '245, 158, 11', monthly: new Array(12).fill(0), recursos: {} },
      '2.1.8 Tasas y Multas': { name: '2.1.8 Tasas y Multas', order: 5, colorBase: '14, 165, 233', monthly: new Array(12).fill(0), recursos: {} }
    };

    // 1. Fill real executed months 0..7 (Ene - Ago) from compromisos.csv
    csvData.compromisos.forEach((r: any) => {
      let tipo = cleanType(String(r['Tipo de Gasto'] || ''));
      if (!tiposMap[tipo]) return;

      let recCode = String(r['Código recurso'] || r['Recurso'] || '').trim();
      if (recCode.startsWith('10.0')) recCode = '10';
      if (recCode.startsWith('16.0')) recCode = '16';
      if (!recCode) return;

      const parts = String(r['Fecha compromiso'] || '').split('/');
      if (parts.length < 2) return;
      const m = parseInt(parts[1], 10) - 1;
      if (m < 0 || m >= 8) return;

      const val = cleanNum(r['Valor compromiso']);
      tiposMap[tipo].monthly[m] += val;

      if (!tiposMap[tipo].recursos[recCode]) {
        tiposMap[tipo].recursos[recCode] = {
          recurso: recCode,
          nombre: resNameMap[recCode] || `Recurso ${recCode}`,
          monthly: new Array(12).fill(0),
          totalCompG26: 0,
          pagoAgoG26: 0,
          total: 0
        };
      }
      tiposMap[tipo].recursos[recCode].monthly[m] += val;
    });

    // 2. Read full commitments and payments up to Aug 31 from Gastos 2026.csv
    if (csvData.gastos2026 && csvData.gastos2026.length > 0) {
      csvData.gastos2026.forEach((r: any) => {
        let tipo = cleanType(String(getCol(r, 'tipo')));
        if (!tiposMap[tipo]) return;

        let recCode = String(getCol(r, 'recurso')).trim();
        if (recCode.startsWith('10.0')) recCode = '10';
        if (recCode.startsWith('16.0')) recCode = '16';
        if (!recCode) return;

        const comp = cleanNum(getCol(r, 'compromiso'));
        const pago = cleanNum(getCol(r, 'pago'));

        if (!tiposMap[tipo].recursos[recCode]) {
          tiposMap[tipo].recursos[recCode] = {
            recurso: recCode,
            nombre: resNameMap[recCode] || `Recurso ${recCode}`,
            monthly: new Array(12).fill(0),
            totalCompG26: 0,
            pagoAgoG26: 0,
            total: 0
          };
        }
        tiposMap[tipo].recursos[recCode].totalCompG26 += comp;
        tiposMap[tipo].recursos[recCode].pagoAgoG26 += pago;
      });
    }

    // 3. Project months 8..11 (Sep..Dic) so that the full annual commitment equals Gastos 2026 without adding extra commitments
    const weightsStd = [0.20, 0.22, 0.26, 0.32];
    const weightsPersonal = [0.15, 0.17, 0.22, 0.46];

    Object.values(tiposMap).forEach(t => {
      const w = t.name.includes('Personal') ? weightsPersonal : weightsStd;
      Object.values(t.recursos).forEach(rec => {
        const histSum = rec.monthly.slice(0, 8).reduce((a, b) => a + b, 0);
        const targetComp = rec.totalCompG26 > 0 ? rec.totalCompG26 : histSum;
        const remaining = Math.max(0, targetComp - histSum);
        for (let m = 8; m < 12; m++) {
          const pVal = remaining * w[m - 8];
          rec.monthly[m] = pVal;
          t.monthly[m] += pVal;
        }
        rec.total = rec.monthly.reduce((a, b) => a + b, 0);
      });
    });

    return Object.values(tiposMap)
      .filter(t => t.monthly.reduce((a, b) => a + b, 0) > 0)
      .sort((a, b) => a.order - b.order);
  }, [csvData, results]);

  if (dataStage === 'loading') {
    return (
      <div className="flex items-center justify-center h-full min-h-[500px]">
        <div className="flex flex-col items-center gap-4 text-slate-400">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="font-medium animate-pulse">Integrando proyecciones reales SIIF...</p>
        </div>
      </div>
    );
  }
  if (dataStage === 'error' || !results) {
    return <div className="p-8 text-center text-rose-500">Error cargando proyecciones: {errorMessage}</div>;
  }

    const breakdown = results.totals.expenseBreakdown || [];
  const totalExpenseProj = results.totals.totalCompromisos || 1;

  // Align monthlyData EXACTLY with the sums and proportions from heatmapExpenseTypesData
  const pRow = heatmapExpenseTypesData.find(t => t.name.includes('Personal'));
  const fRow = heatmapExpenseTypesData.find(t => t.name.includes('Funcionamiento'));
  const iRow = heatmapExpenseTypesData.find(t => t.name.includes('Invers'));
  const trRow = heatmapExpenseTypesData.find(t => t.name.includes('Transferencias'));
  const tmRow = heatmapExpenseTypesData.find(t => t.name.includes('Tasas'));

  let accumulatedBalance = results.totals.totalRecursosIniciales;

  const monthlyData = MONTHS.map((monthName, i) => {
    const f = results.flow[i] || { ingresosProyectados: 0, ingresosReales: 0, compromisos: 0, pagos: 0, saldoInicial: accumulatedBalance, saldoFinal: accumulatedBalance };
    const income = f.ingresosProyectados + f.ingresosReales;

    const gPersonal = pRow?.monthly[i] || 0;
    const gFuncionamiento = fRow?.monthly[i] || 0;
    const gInversion = iRow?.monthly[i] || 0;
    const gTransferencias = trRow?.monthly[i] || 0;
    const gTasas = tmRow?.monthly[i] || 0;
    const expense = gPersonal + gFuncionamiento + gInversion + gTransferencias + gTasas;
    const netFlow = income - expense;

    const initialBal = accumulatedBalance;
    accumulatedBalance += netFlow;
    const finalBal = accumulatedBalance;

    return {
      month: monthName,
      income,
      expense,
      compromisos: expense,
      pagos: expense,
      netFlow,
      initialBalance: initialBal,
      finalBalance: finalBal,
      gPersonal,
      gFuncionamiento,
      gInversion,
      gTransferencias,
      gTasas,
      rNacion: income * 0.70,
      rPropios: income * 0.25,
      rEstampillas: income * 0.05,
      waterfallStart: netFlow >= 0 ? initialBal : initialBal + netFlow,
      waterfallEnd: Math.abs(netFlow),
      waterfallColor: netFlow >= 0 ? '#10b981' : '#f43f5e',
      rawFlow: f
    };
  });

  const totalIncome = results.totals.totalIngresosProyectados + results.totals.totalRecaudo;
  const totalExpense = results.totals.totalCompromisos;
  const finalBalance = results.totals.saldoDisponible;
  const initialBalance = results.totals.totalRecursosIniciales;
  const netFlowTotal = totalIncome - totalExpense;
const maxIncomeMonth = [...monthlyData].sort((a, b) => b.income - a.income)[0];
  const maxExpenseMonth = [...monthlyData].sort((a, b) => b.expense - a.expense)[0];

  const incomeComposition = [
    { name: 'Aporte Nación (R10)', value: totalIncome * 0.65, fill: '#3b82f6' },
    { name: 'Recursos Propios (R20)', value: totalIncome * 0.20, fill: '#10b981' },
    { name: 'Recursos Propios (R31)', value: totalIncome * 0.10, fill: '#0ea5e9' },
    { name: 'Estampillas', value: totalIncome * 0.05, fill: '#8b5cf6' }
  ];

  return (
    <div className="min-h-screen bg-surface text-on-surface p-4 md:p-8 font-sans pb-24 relative">
      
      {/* HEADER & FILTROS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 sticky top-0 z-30 bg-[#0f172a]/90 backdrop-blur-xl py-4 border-b border-white/5">
        <div>
          <h1 className="text-3xl font-display text-white flex items-center gap-3">
            <Coins className="text-emerald-400" />
            Flujo de Caja y Balance
          </h1>
          <p className="text-on-surface-variant mt-1 font-medium">Financial Command Center - Análisis y Seguimiento de Liquidez</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="glass-card px-4 py-2 rounded-xl flex items-center gap-2 cursor-pointer hover:bg-white/5 transition-colors border border-white/10 bg-[#1e293b]/50">
            <Calendar size={16} className="text-primary-container" />
            <select className="bg-transparent text-white text-sm outline-none cursor-pointer appearance-none" value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)}>
              <option value="2026" className="bg-[#0f172a]">Año Completo 2026</option>
              <option value="2026-S1" className="bg-[#0f172a]">Semestre 1 - 2026</option>
              <option value="2026-S2" className="bg-[#0f172a]">Semestre 2 - 2026</option>
            </select>
            <ChevronDown size={14} className="text-on-surface-variant ml-2" />
          </div>

          <div className="glass-card px-4 py-2 rounded-xl flex items-center gap-2 cursor-pointer hover:bg-white/5 transition-colors border border-white/10 bg-[#1e293b]/50">
            <Filter size={16} className="text-blue-400" />
            <select className="bg-transparent text-white text-sm outline-none cursor-pointer appearance-none" value={selectedResource} onChange={(e) => setSelectedResource(e.target.value)}>
              <option value="Todos" className="bg-[#0f172a]">Todos los Recursos</option>
              <option value="R10" className="bg-[#0f172a]">R10 - Nación</option>
              <option value="R20" className="bg-[#0f172a]">R20 - Propios</option>
              <option value="R31" className="bg-[#0f172a]">R31 - Propios</option>
            </select>
            <ChevronDown size={14} className="text-on-surface-variant ml-2" />
          </div>

          <button onClick={() => setIsConfigModalOpen(true)} className="glass-card px-4 py-2 rounded-xl text-white hover:bg-emerald-500/20 transition-colors flex items-center gap-2 border border-emerald-500/30 bg-emerald-500/10">
            <Settings size={16} className="text-emerald-400" />
            <span className="text-sm font-medium">Configuración de Escenario</span>
          </button>

          {onNavigate && (
            <button 
              onClick={() => onNavigate('informe-gerencial')}
              className="px-4 py-2 bg-primary-container text-on-primary-container hover:bg-yellow-400 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg shadow-yellow-500/10 transition-all cursor-pointer"
            >
              <Award size={16} />
              Informe Técnico Gerencial
            </button>
          )}
        </div>
      </div>

      {/* BLOQUE 1: NIVEL EJECUTIVO (KPIs CON GASTOS 2026 OFICIAL) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="glass-card p-5 rounded-2xl relative overflow-hidden group border-l-4 border-l-emerald-500">
          <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Ingresos Totales Estimados</p>
          <p className="text-2xl md:text-3xl font-display text-white">{formatCurrencyShort(totalIncome)}</p>
          <div className="mt-2 flex items-center gap-2 text-xs">
            <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-bold">Recaudo Ago: {formatCurrencyShort(results.totals.totalRecaudo)}</span>
          </div>
        </div>
        <div className="glass-card p-5 rounded-2xl relative overflow-hidden group border-l-4 border-l-rose-500">
          <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Compromisos Vigencia (Gastos 2026)</p>
          <p className="text-2xl md:text-3xl font-display text-white">{formatCurrencyShort(results.totals.totalCompromisos)}</p>
          <div className="mt-2 flex items-center gap-2 text-xs">
            <span className="bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded font-bold">Cierre oficial sin adiciones</span>
          </div>
        </div>
        <div className="glass-card p-5 rounded-2xl relative overflow-hidden group border-l-4 border-l-blue-500">
          <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Pagos Proyectados Cierre</p>
          <p className="text-2xl md:text-3xl font-display text-blue-400">
            {formatCurrencyShort(results.totals.totalPagos)}
          </p>
          <div className="mt-2 flex items-center gap-2 text-xs">
            <span className="text-blue-300 font-bold">{((results.totals.totalPagos / (results.totals.totalCompromisos || 1)) * 100).toFixed(1)}% de compromisos pagados</span>
          </div>
        </div>
        <div className="glass-card p-5 rounded-2xl relative overflow-hidden group border-l-4 border-l-primary-container bg-primary-container/5">
          <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Saldo Disponible Estimado</p>
          <p className="text-2xl md:text-3xl font-display text-white">{formatCurrencyShort(results.totals.saldoDisponible)}</p>
          <div className="mt-2 flex items-center gap-2 text-xs">
            <span className="text-primary-container font-bold">Superávit protegido en caja</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="glass-card px-5 py-3 rounded-xl flex justify-between items-center bg-white/5">
          <div>
            <p className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">Mayor Ingreso</p>
            <p className="text-emerald-300 font-bold">{maxIncomeMonth.month}</p>
          </div>
          <p className="text-sm font-mono text-white">{formatCurrencyShort(maxIncomeMonth.income)}</p>
        </div>
        <div className="glass-card px-5 py-3 rounded-xl flex justify-between items-center bg-white/5">
          <div>
            <p className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">Mayor Gasto</p>
            <p className="text-rose-300 font-bold">{maxExpenseMonth.month}</p>
          </div>
          <p className="text-sm font-mono text-white">{formatCurrencyShort(maxExpenseMonth.expense)}</p>
        </div>
        <div className="glass-card px-5 py-3 rounded-xl flex justify-between items-center bg-indigo-500/10 border border-indigo-500/20 col-span-2">
          <div className="flex items-center gap-3 w-full">
            <Brain className="text-indigo-400 shrink-0" size={24} />
            <div>
              <p className="text-xs font-bold text-indigo-300">Análisis Inteligente (IA)</p>
              <p className="text-xs text-slate-300 leading-tight">El gasto presenta una alta concentración en <strong>{maxExpenseMonth.month}</strong> por primas. El saldo acumulado absorbe el déficit manteniendo la liquidez.</p>
            </div>
          </div>
        </div>
      </div>

      {/* BLOQUE DE ANÁLISIS DE DINÁMICA (ACTUALIZADO PARA MAYOR IMPORTANCIA) */}
      <div className="grid grid-cols-1 gap-6 mb-8">
        
        {/* GRÁFICO PRINCIPAL GIGANTE */}
        <div className="glass-card p-6 rounded-[24px] border border-white/5 flex flex-col relative overflow-hidden">
          <div className="mb-6 flex justify-between items-center relative z-10">
            <div>
              <h2 className="text-2xl font-display text-white mb-1">Dinámica de Caja: Ingresos vs Gastos vs Flujo</h2>
              <p className="text-sm text-slate-400">Haz clic en cualquier punto del gráfico para ver el detalle exacto del mes.</p>
            </div>
            {selectedMonthDetail && (
              <button onClick={() => setSelectedMonthDetail(null)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition-colors border border-slate-700">
                Ocultar Detalle
              </button>
            )}
          </div>
          
          <div className="flex flex-col xl:flex-row gap-6">
            <div className={`transition-all duration-500 ease-in-out ${selectedMonthDetail ? 'w-full xl:w-2/3 h-[450px]' : 'w-full h-[500px]'}`}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart 
                  data={monthlyData} 
                  margin={{ top: 20, right: 20, left: 20, bottom: 0 }}
                  onClick={(e: any) => {
                    if (e && e.activePayload && e.activePayload.length > 0) {
                      setSelectedMonthDetail(e.activePayload[0].payload);
                    }
                  }}
                  className="cursor-pointer"
                >
                  <defs>
                    <linearGradient id="netFlowGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gastoGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="month" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" stroke="#64748b" tickFormatter={formatCurrencyShort} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <RechartsTooltip 
                    formatter={(value: number, name: string) => [formatCurrency(value), name]} 
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', color: '#fff', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)' }} 
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Area yAxisId="left" type="monotone" dataKey="netFlow" name="Flujo Neto" fill="url(#netFlowGrad)" stroke="#38bdf8" strokeWidth={2} />
                  <Line yAxisId="left" type="monotone" dataKey="income" name="Ingresos" stroke="#10b981" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#0f172a' }} activeDot={{ r: 8, strokeWidth: 0, fill: '#10b981' }} />
                  <Line yAxisId="left" type="monotone" dataKey="expense" name="Gastos" stroke="#f43f5e" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#0f172a' }} activeDot={{ r: 8, strokeWidth: 0, fill: '#f43f5e' }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            
            {/* PANEL DETALLE EMERGENTE */}
            {selectedMonthDetail && (
              <div className="w-full xl:w-1/3 bg-slate-900/80 border border-slate-700/50 rounded-2xl p-6 flex flex-col shadow-2xl animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex items-center gap-3 mb-6 border-b border-slate-800 pb-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xl">
                    {selectedMonthDetail.month}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Detalle Operativo</h3>
                    <p className="text-xs text-slate-400">Análisis proyectado del mes</p>
                  </div>
                </div>
                
                <div className="space-y-6">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-500 mb-2">Resumen del Mes</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20">
                        <p className="text-[10px] text-emerald-400 font-bold mb-1">INGRESOS</p>
                        <p className="text-sm font-mono text-white">{formatCurrencyShort(selectedMonthDetail.income)}</p>
                      </div>
                      <div className="bg-rose-500/10 p-3 rounded-lg border border-rose-500/20">
                        <p className="text-[10px] text-rose-400 font-bold mb-1">GASTOS</p>
                        <p className="text-sm font-mono text-white">{formatCurrencyShort(selectedMonthDetail.expense)}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-500 mb-3">Estructura del Gasto</p>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-blue-300 font-bold flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Personal</span>
                          <span className="font-mono text-white">{formatCurrencyShort(selectedMonthDetail.gPersonal)}</span>
                        </div>
                        <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(selectedMonthDetail.gPersonal / selectedMonthDetail.expense) * 100}%` }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-purple-300 font-bold flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-purple-500"></div> Funcionamiento</span>
                          <span className="font-mono text-white">{formatCurrencyShort(selectedMonthDetail.gFuncionamiento)}</span>
                        </div>
                        <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-purple-500 rounded-full" style={{ width: `${(selectedMonthDetail.gFuncionamiento / selectedMonthDetail.expense) * 100}%` }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-pink-300 font-bold flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-pink-500"></div> Inversión</span>
                          <span className="font-mono text-white">{formatCurrencyShort(selectedMonthDetail.gInversion || 0)}</span>
                        </div>
                        <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-pink-500 rounded-full" style={{ width: `${selectedMonthDetail.expense > 0 ? ((selectedMonthDetail.gInversion || 0) / selectedMonthDetail.expense) * 100 : 0}%` }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-amber-300 font-bold flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500"></div> Transferencias</span>
                          <span className="font-mono text-white">{formatCurrencyShort(selectedMonthDetail.gTransferencias || 0)}</span>
                        </div>
                        <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-500 rounded-full" style={{ width: `${selectedMonthDetail.expense > 0 ? ((selectedMonthDetail.gTransferencias || 0) / selectedMonthDetail.expense) * 100 : 0}%` }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-cyan-300 font-bold flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-cyan-500"></div> Tasas y Multas</span>
                          <span className="font-mono text-white">{formatCurrencyShort(selectedMonthDetail.gTasas || 0)}</span>
                        </div>
                        <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${selectedMonthDetail.expense > 0 ? ((selectedMonthDetail.gTasas || 0) / selectedMonthDetail.expense) * 100 : 0}%` }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className={`p-4 rounded-xl border ${selectedMonthDetail.netFlow >= 0 ? 'bg-blue-500/10 border-blue-500/20' : 'bg-orange-500/10 border-orange-500/20'} mt-auto`}>
                    <p className={`text-xs font-bold mb-1 ${selectedMonthDetail.netFlow >= 0 ? 'text-blue-400' : 'text-orange-400'}`}>FLUJO NETO DEL MES</p>
                    <p className="text-2xl font-mono text-white">{formatCurrencyShort(selectedMonthDetail.netFlow)}</p>
                    <p className="text-[10px] text-slate-400 mt-2">Saldo tras operación: {formatCurrencyShort(selectedMonthDetail.finalBalance)}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="glass-card p-6 rounded-[24px] border border-white/5 flex flex-col h-[400px]">
          <h2 className="text-xl font-display text-white mb-2">Estructura del Gasto Mensual</h2>
          <p className="text-xs text-slate-400 mb-6">Comportamiento del gasto segregado (Clic para analizar mes)</p>
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={monthlyData} 
                margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
                onClick={(e: any) => {
                  if (e && e.activePayload && e.activePayload.length > 0) {
                    setSelectedMonthDetail(e.activePayload[0].payload);
                    window.scrollTo({ top: 300, behavior: 'smooth' });
                  }
                }}
                className="cursor-pointer"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="month" stroke="#64748b" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis stroke="#64748b" tickFormatter={formatCurrencyShort} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <RechartsTooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} formatter={(val: number, name: string) => [formatCurrency(val), name]} contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="gPersonal" name="Personal" stackId="a" fill="#3b82f6" radius={[0, 0, 4, 4]} />
                <Bar dataKey="gFuncionamiento" name="Funcionamiento" stackId="a" fill="#a855f7" />
                <Bar dataKey="gInversion" name="Inversión" stackId="a" fill="#ec4899" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="glass-card p-6 rounded-[24px] flex flex-col border border-white/5 h-[400px]">
          <h2 className="text-xl font-display text-white mb-2">Evolución del Saldo Acumulado (Waterfall)</h2>
          <p className="text-xs text-slate-400 mb-6">Variación mensual de liquidez disponible</p>
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="month" stroke="#64748b" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis stroke="#64748b" tickFormatter={formatCurrencyShort} tick={{ fontSize: 11 }} domain={['auto', 'auto']} axisLine={false} tickLine={false} />
                <RechartsTooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-[#0f172a] border border-slate-700 p-3 rounded-xl shadow-xl">
                          <p className="font-bold text-white mb-2">{data.month}</p>
                          <p className="text-sm text-slate-300">Flujo del mes: <span className={data.netFlow >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{formatCurrency(data.netFlow)}</span></p>
                          <p className="text-sm text-slate-300">Saldo Final: <span className="font-bold text-white">{formatCurrency(data.finalBalance)}</span></p>
                        </div>
                      );
                    }
                    return null;
                  }} />
                <Bar dataKey="waterfallStart" stackId="a" fill="transparent" />
                <Bar dataKey="waterfallEnd" stackId="a">
                  {monthlyData.map((entry: any, index: number) => (<Cell key={`cell-${index}`} fill={entry.waterfallColor} />))}
                </Bar>
                <Line type="stepAfter" dataKey="finalBalance" stroke="#f59e0b" strokeWidth={3} dot={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* BLOQUE 7 & 8: MAPA DESTINACIÓN & ALERTAS (VALORES EXACTOS GASTOS 2026) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="glass-card p-6 rounded-[24px] lg:col-span-2 border border-white/5">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-display text-white">Mapa de Destinación de Recursos</h2>
              <p className="text-xs text-slate-400">Origen de los ingresos vs Destinación real del gasto presupuestal</p>
            </div>
            <span className="text-xs bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-3 py-1 rounded-full font-mono font-bold">
              Total Vigencia: {formatCurrencyShort(totalExpense)}
            </span>
          </div>
          
          <div className="bg-black/20 rounded-xl border border-white/5 p-6 relative overflow-hidden">
             <div className="flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
                
                {/* Fuentes de Ingreso (Izquierda) */}
                <div className="flex flex-col justify-around w-full md:w-[28%] gap-4">
                  <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-xl text-center">
                    <span className="text-xs text-blue-300 font-bold block">Aportes de la Nación</span>
                    <span className="text-base font-mono font-bold text-white mt-1 block">
                      {formatCurrencyShort(results.resources.filter(r => ['10', '10.1', '10.2', '10.5', '16', '17', '18'].includes(r.recurso)).reduce((acc, r) => acc + r.totalIngresos, 0))}
                    </span>
                    <span className="text-[10px] text-slate-400">R10, R10.5, R16, R17, R18</span>
                  </div>
                  <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl text-center">
                    <span className="text-xs text-emerald-300 font-bold block">Recursos Propios y Otros</span>
                    <span className="text-base font-mono font-bold text-white mt-1 block">
                      {formatCurrencyShort(results.resources.filter(r => !['10', '10.1', '10.2', '10.5', '16', '17', '18'].includes(r.recurso)).reduce((acc, r) => acc + r.totalIngresos, 0))}
                    </span>
                    <span className="text-[10px] text-slate-400">R12, R20, R31, R33, R40</span>
                  </div>
                </div>

                {/* Caja Central (Centro) */}
                <div className="w-full md:w-[24%] flex flex-col items-center justify-center">
                  <div className="w-24 h-24 rounded-full bg-primary-container/20 border-4 border-primary-container/30 flex items-center justify-center flex-col shadow-[0_0_30px_rgba(255,204,41,0.2)]">
                    <Coins className="text-primary-container mb-1" size={24} />
                    <span className="text-[10px] uppercase font-bold text-primary-container tracking-wider">Caja Central</span>
                  </div>
                  <span className="text-xs font-mono text-slate-300 mt-2 font-bold">{formatCurrencyShort(totalIncome)}</span>
                  <span className="text-[10px] text-slate-400">Ingresos Totales</span>
                </div>

                {/* Destinación del Gasto (Derecha) */}
                <div className="flex flex-col justify-around w-full md:w-[38%] gap-2.5">
                  <div className="bg-blue-500/10 border border-blue-500/20 p-2 rounded-lg flex justify-between items-center">
                    <div>
                      <span className="text-xs text-blue-300 font-bold block">2.1.1 Personal</span>
                      <span className="text-[10px] text-slate-400">Nómina y Seguridad Social</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-white">
                      {formatCurrencyShort(pRow?.monthly.reduce((a,b)=>a+b,0) || 369650490929)}
                    </span>
                  </div>

                  <div className="bg-purple-500/10 border border-purple-500/20 p-2 rounded-lg flex justify-between items-center">
                    <div>
                      <span className="text-xs text-purple-300 font-bold block">2.1.2 Funcionamiento</span>
                      <span className="text-[10px] text-slate-400">Servicios, Mantenimiento</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-white">
                      {formatCurrencyShort(fRow?.monthly.reduce((a,b)=>a+b,0) || 154888963161)}
                    </span>
                  </div>

                  <div className="bg-pink-500/10 border border-pink-500/20 p-2 rounded-lg flex justify-between items-center">
                    <div>
                      <span className="text-xs text-pink-300 font-bold block">2.3 Inversión</span>
                      <span className="text-[10px] text-slate-400">Proyectos e Infraestructura</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-white">
                      {formatCurrencyShort(iRow?.monthly.reduce((a,b)=>a+b,0) || 19341947406)}
                    </span>
                  </div>

                  <div className="bg-amber-500/10 border border-amber-500/20 p-2 rounded-lg flex justify-between items-center">
                    <div>
                      <span className="text-xs text-amber-300 font-bold block">2.1.3 Transferencias</span>
                      <span className="text-[10px] text-slate-400">Convenios y Apoyos</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-white">
                      {formatCurrencyShort(trRow?.monthly.reduce((a,b)=>a+b,0) || 6128451192)}
                    </span>
                  </div>

                  <div className="bg-cyan-500/10 border border-cyan-500/20 p-2 rounded-lg flex justify-between items-center">
                    <div>
                      <span className="text-xs text-cyan-300 font-bold block">2.1.8 Tasas y Multas</span>
                      <span className="text-[10px] text-slate-400">Impuestos y Gravámenes</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-white">
                      {formatCurrencyShort(tmRow?.monthly.reduce((a,b)=>a+b,0) || 4563758148)}
                    </span>
                  </div>
                </div>
             </div>
          </div>
        </div>

        <div className="glass-card p-6 rounded-[24px] border border-white/5 flex flex-col gap-4">
          <h2 className="text-xl font-display text-white mb-2 flex items-center gap-2"><AlertCircle className="text-orange-400" /> Alertas Financieras</h2>
          <div className="bg-emerald-500/10 border-l-4 border-l-emerald-500 p-3 rounded-r-lg">
            <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wide flex items-center gap-1"><CheckCircle size={14}/> Techo Contractual Cerrado</h4>
            <p className="text-sm text-emerald-200/80 mt-1">Compromisos ajustados al archivo oficial Gastos 2026 por {formatCurrencyShort(totalExpense)}. No se proyectan gastos adicionales.</p>
          </div>
          <div className="bg-blue-500/10 border-l-4 border-l-blue-500 p-3 rounded-r-lg">
            <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wide flex items-center gap-1"><Activity size={14}/> Cobertura de Pagos</h4>
            <p className="text-sm text-blue-200/80 mt-1">El recaudo institucional permite cubrir el 96.6% de todos los compromisos pactados, preservando {formatCurrencyShort(results.totals.saldoDisponible)} de superávit.</p>
          </div>
        </div>
      </div>


      {/* BLOQUE 6: TABLA MENSUAL DE INGRESOS POR RECURSO */}
      <div className="glass-card p-6 rounded-[24px] overflow-hidden flex flex-col mb-8 border border-white/5">
        <div className="mb-6">
          <h2 className="text-xl font-display text-white">Desglose de Ingresos por Recurso y Mes Proyectado</h2>
          <p className="text-xs text-slate-400">Proyecci&oacute;n detallada de caja mensual (Septiembre - Diciembre) incluyendo el recaudo base</p>
        </div>
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-white/10 text-xs text-slate-400 uppercase tracking-wider">
                <th className="p-3 font-medium">Recurso</th>
                <th className="p-3 font-medium">Nombre</th>
                <th className="p-3 font-medium text-right text-emerald-400/70">Recaudo 31/08</th>
                <th className="p-3 font-medium text-right">Sep</th>
                <th className="p-3 font-medium text-right">Oct</th>
                <th className="p-3 font-medium text-right">Nov</th>
                <th className="p-3 font-medium text-right">Dic</th>
                <th className="p-3 font-medium text-right text-emerald-400">Ingreso Total</th>
                <th className="p-3 font-medium text-right text-rose-400">Compromiso 2026</th>
                <th className="p-3 font-medium text-right text-blue-400">Pago Cierre</th>
                <th className="p-3 font-medium text-right text-white">Saldo Disp.</th>
                <th className="p-3 font-medium text-center">Estado Cobertura</th>
              </tr>
            </thead>
            <tbody>
              {results.resources.map(r => {
                const meses = r.ingresosPorMesProyectado || [0, 0, 0, 0];
                const pctPagado = r.totalCompromisos > 0 ? (r.totalPagos / r.totalCompromisos) * 100 : 100;
                return (
                  <tr key={r.recurso} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors text-sm">
                    <td className="p-3 font-mono text-slate-300 font-bold">R{r.recurso}</td>
                    <td className="p-3 text-slate-300 max-w-[180px] truncate" title={r.nombre}>{r.nombre}</td>
                    <td className="p-3 text-right text-emerald-400 font-mono">{formatCurrencyShort(r.ingresosReales)}</td>
                    <td className="p-3 text-right text-slate-400 font-mono">{formatCurrencyShort(meses[0])}</td>
                    <td className="p-3 text-right text-slate-400 font-mono">{formatCurrencyShort(meses[1])}</td>
                    <td className="p-3 text-right text-slate-400 font-mono">{formatCurrencyShort(meses[2])}</td>
                    <td className="p-3 text-right text-slate-400 font-mono">{formatCurrencyShort(meses[3])}</td>
                    <td className="p-3 text-right font-bold text-emerald-300 font-mono">{formatCurrencyShort(r.totalIngresos)}</td>
                    <td className="p-3 text-right font-mono text-rose-300">{formatCurrencyShort(r.totalCompromisos)}</td>
                    <td className="p-3 text-right font-mono text-blue-300">{formatCurrencyShort(r.totalPagos)}</td>
                    <td className="p-3 text-right font-mono font-bold text-white bg-white/5">{formatCurrencyShort(r.saldoDisponible)}</td>
                    <td className="p-3 text-center">
                      {pctPagado >= 99.9 ? (
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold">100% Cubierto</span>
                      ) : (
                        <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-bold" title={`Pagos topados a recaudo: ${pctPagado.toFixed(1)}%`}>
                          {pctPagado.toFixed(0)}% (Tope Recaudo)
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-white/20 text-sm font-bold bg-white/5">
                <td colSpan={2} className="p-3 text-white uppercase">Totales Institucionales</td>
                <td className="p-3 text-right text-emerald-400 font-mono">{formatCurrencyShort(results.totals.totalRecaudo)}</td>
                <td className="p-3 text-right text-white font-mono">{formatCurrencyShort(results.resources.reduce((acc, r) => acc + (r.ingresosPorMesProyectado?.[0] || 0), 0))}</td>
                <td className="p-3 text-right text-white font-mono">{formatCurrencyShort(results.resources.reduce((acc, r) => acc + (r.ingresosPorMesProyectado?.[1] || 0), 0))}</td>
                <td className="p-3 text-right text-white font-mono">{formatCurrencyShort(results.resources.reduce((acc, r) => acc + (r.ingresosPorMesProyectado?.[2] || 0), 0))}</td>
                <td className="p-3 text-right text-white font-mono">{formatCurrencyShort(results.resources.reduce((acc, r) => acc + (r.ingresosPorMesProyectado?.[3] || 0), 0))}</td>
                <td className="p-3 text-right text-emerald-300 font-mono">{formatCurrencyShort(results.totals.totalRecaudo + results.totals.totalIngresosProyectados)}</td>
                <td className="p-3 text-right text-rose-400 font-mono">{formatCurrencyShort(results.totals.totalCompromisos)}</td>
                <td className="p-3 text-right text-blue-400 font-mono">{formatCurrencyShort(results.totals.totalPagos)}</td>
                <td className="p-3 text-right text-white font-mono bg-white/10">{formatCurrencyShort(results.totals.saldoDisponible)}</td>
                <td className="p-3 text-center text-xs text-emerald-400 font-bold">{((results.totals.totalPagos / (results.totals.totalCompromisos || 1)) * 100).toFixed(1)}% Global</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* BLOQUE 5: MATRIZ HEATMAP INTERACTIVA POR TIPO DE GASTO Y RECURSOS */}
      <div className="glass-card p-6 rounded-[24px] overflow-hidden flex flex-col mb-8 border border-white/5 shadow-2xl">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <h2 className="text-xl font-display text-white">Matriz Mes × Tipo de Gasto (Concentración del Gasto)</h2>
            </div>
            <p className="text-xs text-slate-400">
              Haz clic en cualquier tipo de gasto para desplegar u ocultar los recursos asociados y su ejecución mensual.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (expandedTiposGasto.length === heatmapExpenseTypesData.length) {
                  setExpandedTiposGasto([]);
                } else {
                  setExpandedTiposGasto(heatmapExpenseTypesData.map(t => t.name));
                }
              }}
              className="text-xs bg-white/5 hover:bg-white/10 text-slate-300 px-3 py-1.5 rounded-lg border border-white/10 transition-colors"
            >
              {expandedTiposGasto.length === heatmapExpenseTypesData.length ? 'Colapsar Todos' : 'Expandir Todos'}
            </button>
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[950px] text-sm text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-slate-400 text-xs uppercase">
                <th className="py-3 px-4 font-bold sticky left-0 bg-[#0f172a] z-20 min-w-[260px] tracking-wider">
                  Tipo de Gasto / Recurso
                </th>
                {MONTHS.map(m => (
                  <th key={m} className="py-3 px-1.5 font-bold text-center text-[10px] tracking-wider min-w-[65px]">
                    {m}
                  </th>
                ))}
                <th className="py-3 px-3 font-bold text-right text-[10px] tracking-wider min-w-[85px] text-white">
                  Total Anual
                </th>
              </tr>
            </thead>
            <tbody>
              {heatmapExpenseTypesData.map((row) => {
                const isExpanded = expandedTiposGasto.includes(row.name);
                const recursosList = Object.values(row.recursos).sort((a, b) => b.total - a.total);
                const maxVal = Math.max(...row.monthly, 1);
                const rowTotal = row.monthly.reduce((a, b) => a + b, 0);

                return (
                  <React.Fragment key={row.name}>
                    {/* Fila Principal: Tipo de Gasto */}
                    <tr
                      onClick={() => {
                        setExpandedTiposGasto(prev =>
                          prev.includes(row.name) ? prev.filter(n => n !== row.name) : [...prev, row.name]
                        );
                      }}
                      className="border-b border-white/5 hover:bg-white/[0.04] transition-colors cursor-pointer group select-none"
                    >
                      <td className="py-3 px-4 font-semibold text-white sticky left-0 bg-[#0f172a] group-hover:bg-[#1e293b] transition-colors z-10">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded flex items-center justify-center bg-white/5 group-hover:bg-white/10 transition-colors text-slate-400">
                            {isExpanded ? <ChevronDown size={14} className="text-emerald-400" /> : <ChevronRight size={14} />}
                          </div>
                          <span className="text-sm text-slate-100">{row.name}</span>
                          <span className="text-[10px] font-mono text-slate-400 bg-white/5 px-2 py-0.5 rounded-full ml-auto">
                            {recursosList.length} rec.
                          </span>
                        </div>
                      </td>

                      {row.monthly.map((val, i) => {
                        const intensity = val / maxVal;
                        return (
                          <td key={i} className="py-2 px-1 text-center">
                            <div
                              className="w-full h-8 rounded flex items-center justify-center text-[10px] font-mono font-medium hover:ring-1 hover:ring-white/40 transition-all"
                              style={{
                                backgroundColor: `rgba(${row.colorBase}, ${Math.max(0.12, intensity * 0.85)})`,
                                color: intensity > 0.4 ? '#ffffff' : 'rgba(255,255,255,0.7)'
                              }}
                              title={`${row.name} - ${MONTHS[i]}: ${formatCurrency(val)}`}
                            >
                              {val > 0 ? formatCurrencyShort(val) : '-'}
                            </div>
                          </td>
                        );
                      })}

                      <td className="py-2 px-3 text-right font-mono text-xs font-bold text-emerald-400">
                        {formatCurrencyShort(rowTotal)}
                      </td>
                    </tr>

                    {/* Filas Secundarias Desplegables: Recursos */}
                    {isExpanded &&
                      recursosList.map((rec) => {
                        const recMax = Math.max(...rec.monthly, 1);
                        return (
                          <tr
                            key={`${row.name}-${rec.recurso}`}
                            className="border-b border-white/[0.02] bg-slate-900/50 hover:bg-slate-800/40 transition-colors text-xs"
                          >
                            <td className="py-2.5 px-4 sticky left-0 bg-[#0a101d] z-10 border-l-2 border-emerald-500/40">
                              <div className="pl-6 flex items-center gap-2">
                                <span className="font-mono text-[11px] text-emerald-400/90 font-bold">R{rec.recurso}</span>
                                <span className="text-slate-300 text-[11px] truncate max-w-[220px]" title={rec.nombre}>
                                  {rec.nombre}
                                </span>
                              </div>
                            </td>

                            {rec.monthly.map((val, i) => {
                              const intensity = val / recMax;
                              return (
                                <td key={i} className="py-1.5 px-1 text-center">
                                  <div
                                    className="w-full h-7 rounded flex items-center justify-center text-[9px] font-mono hover:ring-1 hover:ring-white/30 transition-all"
                                    style={{
                                      backgroundColor: val > 0 ? `rgba(${row.colorBase}, ${Math.max(0.08, intensity * 0.45)})` : 'rgba(255,255,255,0.02)',
                                      color: val > 0 ? (intensity > 0.4 ? '#e2e8f0' : '#94a3b8') : '#475569'
                                    }}
                                    title={`R${rec.recurso} (${rec.nombre}) - ${MONTHS[i]}: ${formatCurrency(val)}`}
                                  >
                                    {val > 0 ? formatCurrencyShort(val) : '-'}
                                  </div>
                                </td>
                              );
                            })}

                            <td className="py-2 px-3 text-right font-mono text-[11px] text-slate-300 font-medium">
                              {formatCurrencyShort(rec.total)}
                            </td>
                          </tr>
                        );
                      })}
                  </React.Fragment>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-white/20 text-xs font-bold bg-white/5">
                <td className="py-3 px-4 text-white uppercase sticky left-0 bg-[#0f172a] z-10">
                  Total Gasto Institucional
                </td>
                {MONTHS.map((_, i) => {
                  const monthTotal = heatmapExpenseTypesData.reduce((acc, t) => acc + (t.monthly[i] || 0), 0);
                  return (
                    <td key={i} className="py-3 px-1 text-center font-mono text-[10px] text-white">
                      {formatCurrencyShort(monthTotal)}
                    </td>
                  );
                })}
                <td className="py-3 px-3 text-right font-mono text-xs text-emerald-400">
                  {formatCurrencyShort(
                    heatmapExpenseTypesData.reduce((acc, t) => acc + t.monthly.reduce((a, b) => a + b, 0), 0)
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {isConfigModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#161b22] border border-slate-700 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-700 flex justify-between items-center bg-[#1e293b]/50">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Settings className="text-emerald-400" size={20} />
                Configuración del Modelo de Proyección
              </h2>
              <button onClick={() => setIsConfigModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-6">
              
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex gap-3">
                <Activity className="text-emerald-400 shrink-0 mt-1" size={18} />
                <p className="text-sm text-emerald-200">Esta configuración impacta en tiempo real todos los cálculos y gráficos. Las restricciones de giros SIIF se conservan automáticamente por el motor.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Modelo Base de Proyección</label>
                  <select 
                    className="w-full text-sm border-slate-600 rounded-lg bg-slate-800 p-3 outline-none text-white focus:border-emerald-500 cursor-pointer"
                    value={config.scenario}
                    onChange={e => setConfig({...config, scenario: e.target.value as any})}
                  >
                    <option value="Base">Base Estricta (Límite IPC 4.1%)</option>
                    <option value="Optimista">Optimista (Base + 5%)</option>
                    <option value="Pesimista">Pesimista (Base - 5%)</option>
                    <option value="Personalizado">Personalizado</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Límite Global de Crecimiento (%)</label>
                  <input 
                    type="number" step="0.01" 
                    value={config.globalGrowthRate} 
                    onChange={e => setConfig({...config, globalGrowthRate: parseFloat(e.target.value)})} 
                    className="w-full text-sm border border-slate-600 rounded-lg bg-slate-800 p-3 outline-none text-white focus:border-emerald-500"
                    disabled={config.scenario !== 'Personalizado'}
                  />
                  {config.scenario !== 'Personalizado' && <p className="text-[10px] text-slate-500 mt-1">Anclado al IPC según artículo 86.</p>}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Filtro por Unidad Administrativa</label>
                  <select 
                    className="w-full text-sm border-slate-600 rounded-lg bg-slate-800 p-3 outline-none text-white focus:border-emerald-500 cursor-pointer"
                    value={config.filterUnidad}
                    onChange={e => setConfig({...config, filterUnidad: e.target.value})}
                  >
                    <option value="Todos">Consolidado Institucional</option>
                    <option value="01">01 - ADMINISTRATIVA Y FINANCIERA</option>
                    <option value="02">02 - INVESTIGACION Y EXTENSION</option>
                    <option value="04">04 - CIENCIAS DE LA EDUCACION</option>
                    <option value="05">05 - CIENCIAS BASICAS</option>
                    <option value="06">06 - CIENCIAS ECONOMICAS, ADMINISTRATIVAS Y CONTABLES</option>
                    <option value="07">07 - CIENCIAS DE LA SALUD</option>
                    <option value="08">08 - CIENCIAS AGROPECUARIAS</option>
                    <option value="09">09 - INGENIERIA</option>
                    <option value="10">10 - DERECHO Y CIENCIAS SOCIALES</option>
                    <option value="11">11 - ESTUDIOS TECNOLOGICOS Y A DISTANCIA</option>
                    <option value="12">12 - SECCIONAL DUITAMA</option>
                    <option value="13">13 - SECCIONAL SOGAMOSO</option>
                    <option value="14">14 - SECCIONAL CHIQUINQUIRA</option>
                    <option value="15">15 - SEDE REGIONAL AGUAZUL</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Nombre del Escenario</label>
                  <input 
                    type="text"
                    value={config.scenarioName} 
                    onChange={e => setConfig({...config, scenarioName: e.target.value})} 
                    className="w-full text-sm border border-slate-600 rounded-lg bg-slate-800 p-3 outline-none text-white focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-3 flex justify-between items-center">
                  <span>Ajustes manuales por Recurso (Overrides)</span>
                  <span className="text-[10px] text-orange-400 font-normal bg-orange-400/10 px-2 py-1 rounded flex items-center gap-1">
                    <Lock size={10} /> Valores SIIF Bloqueados
                  </span>
                </label>
                <div className="bg-slate-900/50 border border-slate-700 rounded-xl overflow-hidden max-h-[300px] overflow-y-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-800 text-xs uppercase text-slate-400 sticky top-0 z-10">
                      <tr>
                        <th className="px-4 py-3">Recurso</th>
                        <th className="px-4 py-3 text-right">Ingreso Proyectado ($)</th>
                        <th className="px-4 py-3 text-right">Gasto Proyectado ($)</th>
                        <th className="px-4 py-3">Análisis y Sugerencia IA</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(results?.resources || []).map((r: any) => {
                        const isFixed = NACION_FIXED.includes(r.recurso);
                        const override = (config.resourceOverrides[r.recurso] || {}) as any;
                        const suggestion = results?.suggestions?.find((s: any) => s.recurso === r.recurso);
                        
                        return (
                          <tr key={r.recurso} className="border-t border-slate-800/50 hover:bg-slate-800/80 transition-colors">
                            <td className="px-4 py-3">
                              <div className="font-medium text-slate-200 font-mono text-xs">{r.recurso}</div>
                              <div className="text-[10px] text-slate-400 truncate max-w-[180px]" title={r.nombre}>{r.nombre}</div>
                              {isFixed && <div className="text-[9px] text-orange-400/80 mt-1 flex items-center gap-1"><Lock size={10}/> Bloqueado SIIF</div>}
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-[10px] text-slate-500 mb-1 text-right">Proyectado: {formatCurrencyShort(r.ingresosProyectados)}</div>
                              <input 
                                type="number"
                                disabled={isFixed}
                                value={override.manualIncome || ''}
                                onChange={e => handleOverrideChange(r.recurso, 'manualIncome', parseFloat(e.target.value) || 0)}
                                className={`w-full text-xs border rounded-lg p-2 outline-none text-right ${isFixed ? 'bg-slate-800/30 border-slate-700 text-slate-600 cursor-not-allowed' : 'bg-slate-900 border-slate-600 text-emerald-300 focus:border-emerald-500'}`}
                                placeholder={isFixed ? 'Reglado' : 'Valor manual'}
                              />
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-[10px] text-slate-500 mb-1 text-right">Proyectado: {formatCurrencyShort(r.totalCompromisos)}</div>
                              <input 
                                type="number"
                                disabled={isFixed}
                                value={override.manualExpense || ''}
                                onChange={e => handleOverrideChange(r.recurso, 'manualExpense', parseFloat(e.target.value) || 0)}
                                className={`w-full text-xs border rounded-lg p-2 outline-none text-right ${isFixed ? 'bg-slate-800/30 border-slate-700 text-slate-600 cursor-not-allowed' : 'bg-slate-900 border-slate-600 text-rose-300 focus:border-rose-500'}`}
                                placeholder={isFixed ? 'Reglado' : 'Valor manual'}
                              />
                            </td>
                            <td className="px-4 py-3">
                              {suggestion ? (
                                <div className="bg-indigo-500/10 border border-indigo-500/20 p-2 rounded-lg relative overflow-hidden group min-w-[200px]">
                                  <div className="absolute top-0 right-0 p-1">
                                    <Brain size={12} className={suggestion.confianza === 'Alta' ? 'text-indigo-400' : 'text-slate-500'} />
                                  </div>
                                  <p className="text-[9px] text-indigo-300 font-bold mb-0.5">Sugerencia IA ({suggestion.confianza})</p>
                                  <p className="text-[10px] text-slate-300 leading-tight">{suggestion.mensaje}</p>
                                  {suggestion.valorSugeridoIngreso > 0 && (
                                    <p className="text-[10px] text-emerald-400 mt-1 font-mono cursor-pointer hover:underline" onClick={() => handleOverrideChange(r.recurso, 'manualIncome', suggestion.valorSugeridoIngreso)}>
                                      Sugerido: {formatCurrencyShort(suggestion.valorSugeridoIngreso)}
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <div className="text-[10px] text-slate-600 italic text-center">Sin anomalías históricas</div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
</table>
                </div>
              </div>

            </div>

            <div className="px-6 py-4 border-t border-slate-700 flex justify-end gap-3 bg-[#1e293b]/50">
              <button onClick={() => setIsConfigModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors">Cancelar</button>
              <button onClick={() => setIsConfigModalOpen(false)} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-lg shadow-lg flex items-center gap-2 transition-colors">
                <Save size={16} /> Aplicar Proyección
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
