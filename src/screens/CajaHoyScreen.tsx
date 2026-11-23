import React, { useState, useEffect, useMemo } from 'react';
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
  Coins,
  Landmark,
  Wallet,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  FileText,
  Download,
  Filter,
  RotateCcw,
  Search,
  Building2,
  Calendar,
  Layers,
  Printer,
  Scale,
  Sliders,
  DollarSign,
  Briefcase,
  PieChart as PieIcon,
  Activity,
  Award,
  ArrowRight,
  Info
} from 'lucide-react';
import {
  loadCajaHoyDatasets,
  calculateCajaHoyMetrics,
  filterCajaHoyData,
  reconcileBankReference,
  calculateMonthlyRecaudoStats,
  calculateEquilibrioFinanciero,
  getControlYValidacionCifras,
  runCajaHoyAudit,
  generateAutomatedFinancialDiagnosis,
  BANK_REFERENCE_SALDO,
  CajaHoyBankAccount,
  CajaHoyIncome,
  CajaHoyMonthlyIncome,
  CajaHoyExpense,
  CajaHoyFilterState,
  ScenarioType,
  ResourceCategory,
  SCENARIO_DEFAULTS,
} from '../lib/cajaHoyEngine';

const formatCOP = (val: number): string => {
  if (val === undefined || val === null || isNaN(val)) return '$ 0 COP';
  return `$ ${val.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} COP`;
};

const formatMillions = (val: number): string => {
  if (val === undefined || val === null || isNaN(val)) return '$ 0 M';
  const inM = val / 1e6;
  return `$ ${inM.toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} M`;
};

export function CajaHoyScreen({ onNavigate }: { onNavigate?: (s: string) => void }) {
  // Main state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [banks, setBanks] = useState<CajaHoyBankAccount[]>([]);
  const [incomes, setIncomes] = useState<CajaHoyIncome[]>([]);
  const [monthlyIncomes, setMonthlyIncomes] = useState<CajaHoyMonthlyIncome[]>([]);
  const [expenses, setExpenses] = useState<CajaHoyExpense[]>([]);

  // Subtabs (8 subtabs according to Prompt Maestro Actualizado)
  const [activeTab, setActiveTab] = useState<
    'ejecutivo' | 'mensual' | 'gastos' | 'bancos' | 'diciembre' | 'equilibrio' | 'auditoria' | 'reportes'
  >('ejecutivo');

  // Global Filters
  const [filters, setFilters] = useState<CajaHoyFilterState>({
    tipoRecurso: 'Todos',
    banco: 'Todos',
    unidad: 'Todas',
    recurso: 'Todos',
    scenario: 'base',
    useStrictRule3A: true,
  });

  // Table search terms
  const [searchBank, setSearchBank] = useState('');
  const [searchIncome, setSearchIncome] = useState('');
  const [searchExpense, setSearchExpense] = useState('');

  // December Simulation editable parameters
  const [simIncomeComplianceRate, setSimIncomeComplianceRate] = useState<number>(0.65);
  const [simExtraIncome, setSimExtraIncome] = useState<number>(0);
  const [simExpensePaymentRate, setSimExpensePaymentRate] = useState<number>(0.75);
  const [simExtraExpense, setSimExtraExpense] = useState<number>(0);
  const [simCustomBankBalance, setSimCustomBankBalance] = useState<number>(144563470673.35);
  const [simResourceScope, setSimResourceScope] = useState<'Todos' | 'Administración' | 'Inversión'>('Todos');

  // Load data
  useEffect(() => {
    async function init() {
      try {
        setLoading(true);
        const data = await loadCajaHoyDatasets(filters.useStrictRule3A);
        setBanks(data.banks);
        setIncomes(data.incomes);
        setMonthlyIncomes(data.monthlyIncomes);
        setExpenses(data.expenses);
        setError(null);
      } catch (err: any) {
        console.error('Error loading Caja HOY datasets:', err);
        setError(err.message || 'Error cargando datos de Caja HOY');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [filters.useStrictRule3A]);

  // Derived filter options
  const bankOptions = useMemo(() => {
    const set = new Set<string>();
    banks.forEach((b) => {
      if (b.banco) set.add(b.banco);
    });
    return Array.from(set).sort();
  }, [banks]);

  const unitOptions = useMemo(() => {
    const set = new Set<string>();
    expenses.forEach((e) => {
      if (e.unidad) set.add(e.unidad);
    });
    return Array.from(set).sort();
  }, [expenses]);

  const resourceOptions = useMemo(() => {
    const set = new Set<string>();
    incomes.forEach((i) => {
      if (i.recurso) set.add(i.recurso);
    });
    return Array.from(set).sort();
  }, [incomes]);

  // Filtered data
  const { filteredBanks, filteredIncomes, filteredExpenses } = useMemo(() => {
    return filterCajaHoyData(banks, incomes, expenses, filters);
  }, [banks, incomes, expenses, filters]);

  // Metrics
  const generalMetrics = useMemo(() => {
    return calculateCajaHoyMetrics(filteredBanks, filteredIncomes, filteredExpenses, filters.scenario);
  }, [filteredBanks, filteredIncomes, filteredExpenses, filters.scenario]);

  const adminMetrics = useMemo(() => {
    const aBanks = banks.filter((b) => b.clasificacion === 'Administración');
    const aIncomes = incomes.filter((i) => i.tipoRecurso === 'Recursos Administración');
    const aExpenses = expenses.filter((e) => e.tipoRecurso === 'Recursos Administración');
    return calculateCajaHoyMetrics(aBanks, aIncomes, aExpenses, filters.scenario);
  }, [banks, incomes, expenses, filters.scenario]);

  const invMetrics = useMemo(() => {
    const iBanks = banks.filter((b) => b.clasificacion === 'Inversión');
    const iIncomes = incomes.filter((i) => i.tipoRecurso === 'Recursos Inversión');
    const iExpenses = expenses.filter((e) => e.tipoRecurso === 'Recursos Inversión');
    return calculateCajaHoyMetrics(iBanks, iIncomes, iExpenses, filters.scenario);
  }, [banks, incomes, expenses, filters.scenario]);

  // Bank reconciliation with reference $144.563.470.673
  const bankReconciliation = useMemo(() => {
    return reconcileBankReference(banks);
  }, [banks]);

  // Monthly stats
  const monthlyStats = useMemo(() => {
    return calculateMonthlyRecaudoStats(monthlyIncomes, generalMetrics.recaudoEsperadoDiciembre);
  }, [monthlyIncomes, generalMetrics.recaudoEsperadoDiciembre]);

  // Simulation calculations
  const simMetrics = useMemo(() => {
    let targetIncomes = incomes;
    let targetExpenses = expenses;
    let targetBanks = banks;

    if (simResourceScope === 'Administración') {
      targetIncomes = incomes.filter((i) => i.tipoRecurso === 'Recursos Administración');
      targetExpenses = expenses.filter((e) => e.tipoRecurso === 'Recursos Administración');
      targetBanks = banks.filter((b) => b.clasificacion === 'Administración');
    } else if (simResourceScope === 'Inversión') {
      targetIncomes = incomes.filter((i) => i.tipoRecurso === 'Recursos Inversión');
      targetExpenses = expenses.filter((e) => e.tipoRecurso === 'Recursos Inversión');
      targetBanks = banks.filter((b) => b.clasificacion === 'Inversión');
    }

    const aforo = targetIncomes.reduce((s, i) => s + i.valorAforo, 0);
    const recaudo = targetIncomes.reduce((s, i) => s + i.totalRecaudo, 0);
    const pendiente = targetIncomes.reduce((s, i) => s + (i.saldoPendiente > 0 ? i.saldoPendiente : 0), 0);

    const compromisos = targetExpenses.reduce((s, e) => s + e.acumuladoCompromiso, 0);
    const pagos = targetExpenses.reduce((s, e) => s + e.acumuladoPago, 0);
    const xPagar = compromisos - pagos;

    const baseBankBalance = targetBanks.reduce((s, b) => s + b.valorFinal, 0);
    const effectiveBankBalance =
      simResourceScope === 'Todos' ? simCustomBankBalance : baseBankBalance;

    const recaudoEsperadoDic = pendiente * simIncomeComplianceRate + simExtraIncome;
    const pagosEsperadosDic = xPagar * simExpensePaymentRate + simExtraExpense;

    const saldoCierre = effectiveBankBalance + recaudoEsperadoDic - pagosEsperadosDic;

    return {
      aforo,
      recaudo,
      pendiente,
      compromisos,
      pagos,
      xPagar,
      bankBalance: effectiveBankBalance,
      recaudoEsperadoDic,
      pagosEsperadosDic,
      saldoCierre,
    };
  }, [
    incomes,
    expenses,
    banks,
    simResourceScope,
    simIncomeComplianceRate,
    simExtraIncome,
    simExpensePaymentRate,
    simExtraExpense,
    simCustomBankBalance,
  ]);

  // Financial equilibrium
  const equilibrioResult = useMemo(() => {
    return calculateEquilibrioFinanciero(incomes, expenses, banks, {
      recaudoEsperadoDiciembre: simMetrics.recaudoEsperadoDic,
      pagosEsperadosDiciembre: simMetrics.pagosEsperadosDic,
    });
  }, [incomes, expenses, banks, simMetrics.recaudoEsperadoDic, simMetrics.pagosEsperadosDic]);

  // Control & Validation table
  const controlCifras = useMemo(() => {
    return getControlYValidacionCifras(incomes, monthlyIncomes, expenses, banks);
  }, [incomes, monthlyIncomes, expenses, banks]);

  // Audit checks & diagnosis
  const auditChecks = useMemo(() => {
    return runCajaHoyAudit(banks, incomes, monthlyIncomes, expenses);
  }, [banks, incomes, monthlyIncomes, expenses]);

  const diagnosis = useMemo(() => {
    return generateAutomatedFinancialDiagnosis(generalMetrics, adminMetrics, invMetrics);
  }, [generalMetrics, adminMetrics, invMetrics]);

  // Preset Scenario Handlers for Simulator
  const applyScenarioPreset = (sc: ScenarioType) => {
    const cfg = SCENARIO_DEFAULTS[sc];
    setSimIncomeComplianceRate(cfg.incomeComplianceRate);
    setSimExpensePaymentRate(cfg.expensePaymentRate);
    setFilters({ ...filters, scenario: sc });
  };

  const resetSimulation = () => {
    setSimIncomeComplianceRate(0.65);
    setSimExtraIncome(0);
    setSimExpensePaymentRate(0.75);
    setSimExtraExpense(0);
    setSimCustomBankBalance(144563470673.35);
    setSimResourceScope('Todos');
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({
      tipoRecurso: 'Todos',
      banco: 'Todos',
      unidad: 'Todas',
      recurso: 'Todos',
      scenario: 'base',
      useStrictRule3A: true,
    });
    setSearchBank('');
    setSearchIncome('');
    setSearchExpense('');
    resetSimulation();
  };

  // Export tables to CSV
  const exportToCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) return;
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(';'),
      ...data.map((row) =>
        headers
          .map((h) => {
            const val = row[h];
            if (typeof val === 'number') {
              return val.toString().replace('.', ',');
            }
            return `"${String(val || '').replace(/"/g, '""')}"`;
          })
          .join(';')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-8 space-y-4">
        <div className="w-12 h-12 border-4 border-[#FFCC29] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-white font-mono text-sm tracking-wide">
          Cargando Sistema Inteligente de Análisis Financiero y Caja UPTC (Corte 23 Nov 2026)...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-8 text-center">
        <div className="bg-rose-500/10 border border-rose-500/30 p-8 rounded-3xl max-w-lg space-y-4">
          <AlertCircle size={40} className="text-rose-400 mx-auto" />
          <h2 className="text-xl font-bold text-white">Error al cargar datos institucionales</h2>
          <p className="text-xs text-on-surface-variant font-mono">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 bg-[#FFCC29] text-black font-bold text-xs rounded-xl hover:bg-[#FFCC29]/90 cursor-pointer"
          >
            Reintentar Carga
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-on-surface space-y-6 pb-20 selection:bg-[#FFCC29] selection:text-black">
      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-surface-container-low/60 border border-white/5 p-6 rounded-3xl backdrop-blur-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full text-[11px] font-mono font-bold bg-[#FFCC29]/20 text-[#FFCC29] border border-[#FFCC29]/30 flex items-center gap-1.5 shadow-[0_0_12px_rgba(255,204,41,0.2)]">
              <span className="w-2 h-2 rounded-full bg-[#FFCC29] animate-pulse"></span>
              CORTE AL 23 DE NOVIEMBRE DE 2026
            </span>
            <span className="text-xs font-mono text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-lg">
              Ref. Bancaria: $ 144.563.470.673 COP
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <Coins className="text-[#FFCC29]" size={28} />
            CENTRO DE CONTROL FINANCIERO UPTC – ANÁLISIS DE CAJA Y EQUILIBRIO
          </h1>
          <p className="text-xs sm:text-sm text-on-surface-variant max-w-4xl">
            Sistema Inteligente de Evaluación de Liquidez, Conciliación Bancaria, Comportamiento Mensual, Proyecciones de Cierre a Diciembre y Equilibrio Presupuestal.
          </p>
        </div>

        {/* Global Controls & Print */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-black/40 border border-white/10 rounded-2xl p-1.5 flex items-center gap-1">
            <span className="text-[10px] font-mono text-on-surface-variant px-2 uppercase">Escenario:</span>
            {(['conservador', 'base', 'optimista'] as ScenarioType[]).map((sc) => (
              <button
                key={sc}
                onClick={() => applyScenarioPreset(sc)}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                  filters.scenario === sc
                    ? 'bg-[#FFCC29] text-black shadow-lg scale-105'
                    : 'text-on-surface-variant hover:text-white hover:bg-white/5'
                }`}
              >
                {sc === 'conservador' ? 'Prudente' : sc === 'base' ? 'Base' : 'Optimista'}
              </button>
            ))}
          </div>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-2xl border border-white/10 text-xs font-mono transition-all cursor-pointer"
          >
            <Printer size={15} />
            Imprimir / PDF
          </button>
        </div>
      </div>

      {/* GLOBAL FILTER BAR */}
      <div className="bg-surface-container-low/40 border border-white/5 p-4 rounded-2xl backdrop-blur-md grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-center">
        {/* Tipo de Recurso */}
        <div>
          <label className="text-[10px] font-mono text-on-surface-variant uppercase block mb-1">
            Tipo de Recurso
          </label>
          <select
            value={filters.tipoRecurso}
            onChange={(e) => setFilters({ ...filters, tipoRecurso: e.target.value as ResourceCategory })}
            className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FFCC29]"
          >
            <option value="Todos">Todos los Recursos</option>
            <option value="Recursos Administración">Recursos de Administración</option>
            <option value="Recursos Inversión">Recursos de Inversión</option>
          </select>
        </div>

        {/* Entidad Bancaria */}
        <div>
          <label className="text-[10px] font-mono text-on-surface-variant uppercase block mb-1">
            Entidad Financiera
          </label>
          <select
            value={filters.banco}
            onChange={(e) => setFilters({ ...filters, banco: e.target.value })}
            className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FFCC29]"
          >
            <option value="Todos">Todas las Entidades ({bankOptions.length})</option>
            {bankOptions.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>

        {/* Unidad Ejecutora */}
        <div>
          <label className="text-[10px] font-mono text-on-surface-variant uppercase block mb-1">
            Unidad Ejecutora
          </label>
          <select
            value={filters.unidad}
            onChange={(e) => setFilters({ ...filters, unidad: e.target.value })}
            className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FFCC29]"
          >
            <option value="Todas">Todas las Unidades ({unitOptions.length})</option>
            {unitOptions.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>

        {/* Recurso Presupuestal */}
        <div>
          <label className="text-[10px] font-mono text-on-surface-variant uppercase block mb-1">
            Recurso Presupuestal
          </label>
          <select
            value={filters.recurso}
            onChange={(e) => setFilters({ ...filters, recurso: e.target.value })}
            className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FFCC29]"
          >
            <option value="Todos">Todos los Recursos ({resourceOptions.length})</option>
            {resourceOptions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        {/* Parametrización Regla 3.A Switch */}
        <div>
          <label className="text-[10px] font-mono text-on-surface-variant uppercase block mb-1">
            Clasificación Rec. 10.5
          </label>
          <button
            onClick={() => setFilters({ ...filters, useStrictRule3A: !filters.useStrictRule3A })}
            className={`w-full py-2 px-3 rounded-xl text-xs font-mono flex items-center justify-between border transition-all cursor-pointer ${
              filters.useStrictRule3A
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
            }`}
            title="Alternar entre Regla 3.A (10.5 Inversión, Presupuesto Equilibrado) y Rótulo CSV (10.5 Administración)"
          >
            <span>{filters.useStrictRule3A ? 'Regla 3.A (Inversión)' : 'Rótulo CSV (Admin)'}</span>
            <span className="text-[10px] underline">Cambiar</span>
          </button>
        </div>

        {/* Reset */}
        <div className="flex items-end">
          <button
            onClick={resetFilters}
            className="w-full py-2 px-4 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 text-xs font-mono flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <RotateCcw size={14} />
            Restablecer Filtros
          </button>
        </div>
      </div>

      {/* 8 SUBTABS NAVIGATION */}
      <div className="flex overflow-x-auto gap-2 border-b border-white/10 pb-2 scrollbar-none">
        {[
          { id: 'ejecutivo', label: '1. Control Ejecutivo', icon: Award },
          { id: 'mensual', label: '2. Ingresos Mensuales', icon: TrendingUp },
          { id: 'gastos', label: '3. Gastos & Compromisos', icon: TrendingDown },
          { id: 'bancos', label: '4. Estado de Bancos', icon: Landmark },
          { id: 'diciembre', label: '5. Diciembre – Simulador', icon: Sliders },
          { id: 'equilibrio', label: '6. Equilibrio Presupuestal', icon: Scale },
          { id: 'auditoria', label: '7. Validación de Cifras', icon: ShieldCheck },
          { id: 'reportes', label: '8. Reporte y Exportación', icon: FileText },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-mono font-bold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#FFCC29] text-black shadow-[0_0_20px_rgba(255,204,41,0.25)] scale-102'
                  : 'bg-surface-container-low/40 hover:bg-white/5 text-on-surface-variant hover:text-white border border-white/5'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* SUBTAB 1: CONTROL EJECUTIVO */}
      {activeTab === 'ejecutivo' && (
        <div className="space-y-6">
          {/* Institutional Verdict Card */}
          <div
            className={`p-6 sm:p-8 rounded-3xl border backdrop-blur-xl relative overflow-hidden ${
              diagnosis.coreQuestionAnswer.verdict === 'SI_SOSTENIBLE'
                ? 'bg-gradient-to-r from-emerald-950/40 via-emerald-900/20 to-black border-emerald-500/30'
                : 'bg-gradient-to-r from-amber-950/40 via-amber-900/20 to-black border-amber-500/30'
            }`}
          >
            <div className="max-w-4xl space-y-3 relative z-10">
              <div className="flex items-center gap-2">
                <ShieldCheck size={20} className="text-emerald-400" />
                <span className="text-[11px] font-mono tracking-widest uppercase text-emerald-400 font-bold">
                  EVALUACIÓN GERENCIAL DE SOSTENIBILIDAD Y LIQUIDEZ INSTITUCIONAL
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-snug">
                {diagnosis.coreQuestionAnswer.answer}
              </h2>
              <p className="text-xs sm:text-sm text-gray-300 leading-relaxed font-light">
                {diagnosis.coreQuestionAnswer.summary}
              </p>
              <div className="pt-2 flex flex-wrap gap-3 text-xs font-mono">
                <div className="bg-black/40 border border-white/10 px-3 py-1.5 rounded-xl">
                  <span className="text-on-surface-variant">Saldo Bancos Hoy: </span>
                  <span className="text-[#FFCC29] font-bold">{formatCOP(generalMetrics.saldoBancosTotal)}</span>
                </div>
                <div className="bg-black/40 border border-white/10 px-3 py-1.5 rounded-xl">
                  <span className="text-on-surface-variant">Compromisos x Pagar: </span>
                  <span className="text-amber-400 font-bold">{formatCOP(generalMetrics.saldoPorPagar)}</span>
                </div>
                <div className="bg-black/40 border border-white/10 px-3 py-1.5 rounded-xl">
                  <span className="text-on-surface-variant">Cobertura Inmediata: </span>
                  <span className="text-emerald-400 font-bold">
                    {(generalMetrics.coberturaInmediata * 100).toFixed(1)}% ({generalMetrics.coberturaInmediata.toFixed(2)}x)
                  </span>
                </div>
                <div className="bg-black/40 border border-white/10 px-3 py-1.5 rounded-xl">
                  <span className="text-on-surface-variant">Superávit de Holgura: </span>
                  <span className="text-white font-bold">{formatCOP(generalMetrics.margenHolguraInmediata)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 12 KEY KPI INDICATOR CARDS (Req. Prompt Maestro Actualizado) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* 1. Aforo */}
            <div className="bg-surface-container-low/50 border border-white/5 p-4 rounded-2xl">
              <span className="text-[10px] font-mono text-on-surface-variant uppercase block">1. Aforo Total</span>
              <div className="text-base font-black text-white mt-1">{formatMillions(generalMetrics.aforoTotal)}</div>
              <div className="text-[10px] text-on-surface-variant font-mono mt-1">Presupuesto definitivo</div>
            </div>

            {/* 2. Recaudo */}
            <div className="bg-surface-container-low/50 border border-white/5 p-4 rounded-2xl">
              <span className="text-[10px] font-mono text-on-surface-variant uppercase block">2. Recaudo Efectivo</span>
              <div className="text-base font-black text-emerald-400 mt-1">{formatMillions(generalMetrics.recaudoTotal)}</div>
              <div className="text-[10px] text-emerald-400 font-mono mt-1">Ene - 23 Nov 2026</div>
            </div>

            {/* 3. % Recaudo */}
            <div className="bg-surface-container-low/50 border border-white/5 p-4 rounded-2xl">
              <span className="text-[10px] font-mono text-on-surface-variant uppercase block">3. % Recaudo</span>
              <div className="text-base font-black text-emerald-400 mt-1">{generalMetrics.porcentajeRecaudo.toFixed(2)}%</div>
              <div className="text-[10px] text-on-surface-variant font-mono mt-1">Pend: {generalMetrics.porcentajePendienteRecaudo.toFixed(2)}%</div>
            </div>

            {/* 4. Apropiación */}
            <div className="bg-surface-container-low/50 border border-white/5 p-4 rounded-2xl">
              <span className="text-[10px] font-mono text-on-surface-variant uppercase block">4. Apropiación Gastos</span>
              <div className="text-base font-black text-white mt-1">{formatMillions(generalMetrics.apropiacionTotal)}</div>
              <div className="text-[10px] text-emerald-400 font-mono mt-1">100% igual al Aforo</div>
            </div>

            {/* 5. Compromisos */}
            <div className="bg-surface-container-low/50 border border-white/5 p-4 rounded-2xl">
              <span className="text-[10px] font-mono text-on-surface-variant uppercase block">5. Compromisos</span>
              <div className="text-base font-black text-sky-400 mt-1">{formatMillions(generalMetrics.compromisosTotal)}</div>
              <div className="text-[10px] text-sky-300 font-mono mt-1">{generalMetrics.porcentajeCompromiso.toFixed(2)}% apropiación</div>
            </div>

            {/* 6. Pagos Efectivos */}
            <div className="bg-surface-container-low/50 border border-white/5 p-4 rounded-2xl">
              <span className="text-[10px] font-mono text-on-surface-variant uppercase block">6. Pagos Efectivos</span>
              <div className="text-base font-black text-purple-400 mt-1">{formatMillions(generalMetrics.pagosTotal)}</div>
              <div className="text-[10px] text-purple-300 font-mono mt-1">{generalMetrics.porcentajePagoSobreCompromiso.toFixed(2)}% s/ comp.</div>
            </div>

            {/* 7. Saldo Bancario Actual */}
            <div className="bg-surface-container-low/50 border border-[#FFCC29]/20 p-4 rounded-2xl bg-[#FFCC29]/5">
              <span className="text-[10px] font-mono text-[#FFCC29] uppercase block">7. Saldo Bancario</span>
              <div className="text-base font-black text-[#FFCC29] mt-1">{formatMillions(generalMetrics.saldoBancosTotal)}</div>
              <div className="text-[10px] text-[#FFCC29]/80 font-mono mt-1">Ref: $ 144.563 M</div>
            </div>

            {/* 8. Saldo Bancos Admin */}
            <div className="bg-surface-container-low/50 border border-white/5 p-4 rounded-2xl">
              <span className="text-[10px] font-mono text-on-surface-variant uppercase block">8. Bancos Admin</span>
              <div className="text-base font-black text-emerald-400 mt-1">{formatMillions(adminMetrics.saldoBancosTotal)}</div>
              <div className="text-[10px] text-on-surface-variant font-mono mt-1">85,73% de la liquidez</div>
            </div>

            {/* 9. Saldo Bancos Inversión */}
            <div className="bg-surface-container-low/50 border border-white/5 p-4 rounded-2xl">
              <span className="text-[10px] font-mono text-on-surface-variant uppercase block">9. Bancos Inversión</span>
              <div className="text-base font-black text-sky-400 mt-1">{formatMillions(invMetrics.saldoBancosTotal)}</div>
              <div className="text-[10px] text-on-surface-variant font-mono mt-1">13,97% de la liquidez</div>
            </div>

            {/* 10. Saldo Cierre Proyectado */}
            <div className="bg-surface-container-low/50 border border-white/5 p-4 rounded-2xl">
              <span className="text-[10px] font-mono text-on-surface-variant uppercase block">10. Caja Cierre Dic</span>
              <div className="text-base font-black text-white mt-1">{formatMillions(generalMetrics.saldoCierreProyectado)}</div>
              <div className="text-[10px] text-on-surface-variant font-mono mt-1">Escenario {filters.scenario}</div>
            </div>

            {/* 11. Equilibrio Presupuestal */}
            <div className="bg-surface-container-low/50 border border-emerald-500/20 p-4 rounded-2xl bg-emerald-500/5">
              <span className="text-[10px] font-mono text-emerald-400 uppercase block">11. Eq. Presupuestal</span>
              <div className="text-base font-black text-emerald-400 mt-1">$ 0,00 COP</div>
              <div className="text-[10px] text-emerald-300 font-mono mt-1">Aforo = Apropiación</div>
            </div>

            {/* 12. Alertas Financieras */}
            <div className="bg-surface-container-low/50 border border-amber-500/20 p-4 rounded-2xl bg-amber-500/5">
              <span className="text-[10px] font-mono text-amber-400 uppercase block">12. Alertas Clave</span>
              <div className="text-base font-black text-amber-400 mt-1">1 Observación</div>
              <div className="text-[10px] text-amber-300 font-mono mt-1">Bancolombia $433,8M</div>
            </div>
          </div>

          {/* COMBINED EXECUTIVE CHARTS: EVOLUCIÓN MENSUAL Y COMPARATIVA DIRECTA INGRESOS VS GASTOS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart A: Evolución Mensual del Recaudo */}
            <div className="bg-surface-container-low/40 border border-white/5 p-6 rounded-3xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white font-mono uppercase">
                    Evolución Mensual del Recaudo de Ingresos (2026)
                  </h3>
                  <p className="text-xs text-on-surface-variant">Recaudo por mes y acumulado en Millones COP</p>
                </div>
                <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg">
                  Promedio: $ 46.917 M/mes
                </span>
              </div>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={monthlyStats.map((s) => ({
                      name: s.mes,
                      mes: Math.round(s.recaudoMes / 1e6),
                      acum: Math.round(s.recaudoAcumulado / 1e6),
                      promedio: 46917,
                    }))}
                    margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                    <XAxis dataKey="name" stroke="#888888" tick={{ fontSize: 10 }} />
                    <YAxis yAxisId="left" stroke="#888888" tick={{ fontSize: 10 }} />
                    <YAxis yAxisId="right" orientation="right" stroke="#888888" tick={{ fontSize: 10 }} />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', borderRadius: '12px' }}
                      formatter={(val: any) => [`$ ${Number(val).toLocaleString('es-CO')} M`, '']}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Bar yAxisId="left" dataKey="mes" name="Recaudo Mes" fill="#FFCC29" radius={[4, 4, 0, 0]} />
                    <Line yAxisId="right" type="monotone" dataKey="acum" name="Acumulado" stroke="#38bdf8" strokeWidth={2} dot={{ r: 3 }} />
                    <Line yAxisId="left" type="monotone" dataKey="promedio" name="Promedio Mensual" stroke="#f43f5e" strokeDasharray="4 4" strokeWidth={1.5} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart B: Comparativa Directa Ingresos vs Gastos */}
            <div className="bg-surface-container-low/40 border border-white/5 p-6 rounded-3xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white font-mono uppercase">
                    Comparativa Presupuesto vs Ejecución Efectiva
                  </h3>
                  <p className="text-xs text-on-surface-variant">Aforo/Apropiación, Recaudo, Compromisos y Pagos</p>
                </div>
                <span className="text-xs font-mono text-[#FFCC29] bg-[#FFCC29]/10 px-2.5 py-1 rounded-lg">
                  Brecha Pagos: $ 61.402 M
                </span>
              </div>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { name: 'Presupuesto', valor: Math.round(generalMetrics.aforoTotal / 1e6), fill: '#ffffff30' },
                      { name: 'Recaudo', valor: Math.round(generalMetrics.recaudoTotal / 1e6), fill: '#10b981' },
                      { name: 'Compromisos', valor: Math.round(generalMetrics.compromisosTotal / 1e6), fill: '#38bdf8' },
                      { name: 'Pagos', valor: Math.round(generalMetrics.pagosTotal / 1e6), fill: '#a855f7' },
                      { name: 'Bancos Hoy', valor: Math.round(generalMetrics.saldoBancosTotal / 1e6), fill: '#FFCC29' },
                    ]}
                    margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                    <XAxis dataKey="name" stroke="#888888" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#888888" tick={{ fontSize: 10 }} />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', borderRadius: '12px' }}
                      formatter={(val: any) => [`$ ${Number(val).toLocaleString('es-CO')} M`, 'Monto']}
                    />
                    <Bar dataKey="valor" radius={[6, 6, 0, 0]}>
                      {['#ffffff30', '#10b981', '#38bdf8', '#a855f7', '#FFCC29'].map((c, i) => (
                        <Cell key={i} fill={c} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* DUAL COMPARATIVE: ADMINISTRACIÓN VS INVERSIÓN */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Administración */}
            <div className="bg-surface-container-low/40 border border-white/5 p-6 rounded-3xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <Briefcase size={18} className="text-[#FFCC29]" />
                  <h3 className="text-base font-bold text-white">Recursos de Administración (Funcionamiento)</h3>
                </div>
                <span className="text-xs font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                  Cobertura: {adminMetrics.coberturaInmediata.toFixed(2)}x ({(adminMetrics.coberturaInmediata * 100).toFixed(1)}%)
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                  <span className="text-on-surface-variant block text-[10px]">Efectivo en Bancos:</span>
                  <span className="text-[#FFCC29] font-bold text-sm">{formatCOP(adminMetrics.saldoBancosTotal)}</span>
                </div>
                <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                  <span className="text-on-surface-variant block text-[10px]">Compromisos por Pagar:</span>
                  <span className="text-amber-400 font-bold text-sm">{formatCOP(adminMetrics.saldoPorPagar)}</span>
                </div>
                <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                  <span className="text-on-surface-variant block text-[10px]">Recaudo Acumulado:</span>
                  <span className="text-white font-bold">{formatCOP(adminMetrics.recaudoTotal)}</span>
                </div>
                <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                  <span className="text-on-surface-variant block text-[10px]">Superávit de Holgura:</span>
                  <span className="text-emerald-400 font-bold text-sm">{formatCOP(adminMetrics.margenHolguraInmediata)}</span>
                </div>
              </div>
              <p className="text-xs text-on-surface-variant leading-relaxed font-light">
                {diagnosis.administrationDiagnosis}
              </p>
            </div>

            {/* Inversión */}
            <div className="bg-surface-container-low/40 border border-white/5 p-6 rounded-3xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <Layers size={18} className="text-sky-400" />
                  <h3 className="text-base font-bold text-white">Recursos de Inversión (Destinación Específica)</h3>
                </div>
                <span className="text-xs font-mono text-sky-400 font-bold bg-sky-500/10 px-2.5 py-1 rounded-lg border border-sky-500/20">
                  Cobertura: {invMetrics.coberturaInmediata.toFixed(2)}x ({(invMetrics.coberturaInmediata * 100).toFixed(1)}%)
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                  <span className="text-on-surface-variant block text-[10px]">Efectivo en Bancos:</span>
                  <span className="text-[#FFCC29] font-bold text-sm">{formatCOP(invMetrics.saldoBancosTotal)}</span>
                </div>
                <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                  <span className="text-on-surface-variant block text-[10px]">Compromisos por Pagar:</span>
                  <span className="text-amber-400 font-bold text-sm">{formatCOP(invMetrics.saldoPorPagar)}</span>
                </div>
                <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                  <span className="text-on-surface-variant block text-[10px]">Recaudo Acumulado:</span>
                  <span className="text-white font-bold">{formatCOP(invMetrics.recaudoTotal)}</span>
                </div>
                <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                  <span className="text-on-surface-variant block text-[10px]">Superávit de Holgura:</span>
                  <span className="text-sky-400 font-bold text-sm">{formatCOP(invMetrics.margenHolguraInmediata)}</span>
                </div>
              </div>
              <p className="text-xs text-on-surface-variant leading-relaxed font-light">
                {diagnosis.investmentDiagnosis}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: INGRESOS Y COMPORTAMIENTO MENSUAL */}
      {activeTab === 'mensual' && (
        <div className="space-y-6">
          {/* Monthly Analysis Header Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-surface-container-low/50 border border-white/5 p-4 rounded-2xl">
              <span className="text-[10px] font-mono text-on-surface-variant uppercase block">Recaudo Acumulado Ene-Nov</span>
              <div className="text-lg font-black text-emerald-400 mt-1">
                {formatMillions(monthlyStats[10]?.recaudoAcumulado || 0)}
              </div>
              <div className="text-[10px] text-on-surface-variant font-mono mt-1">Suma en extractos y caja</div>
            </div>

            <div className="bg-surface-container-low/50 border border-white/5 p-4 rounded-2xl">
              <span className="text-[10px] font-mono text-on-surface-variant uppercase block">Recaudo Mensual Promedio</span>
              <div className="text-lg font-black text-white mt-1">$ 46.917 M</div>
              <div className="text-[10px] text-on-surface-variant font-mono mt-1">11 meses evaluados</div>
            </div>

            <div className="bg-surface-container-low/50 border border-white/5 p-4 rounded-2xl">
              <span className="text-[10px] font-mono text-on-surface-variant uppercase block">Mes de Mayor Recaudo</span>
              <div className="text-lg font-black text-[#FFCC29] mt-1">Octubre ($ 57.963 M)</div>
              <div className="text-[10px] text-on-surface-variant font-mono mt-1">Transferencias Nación + Matrículas</div>
            </div>

            <div className="bg-surface-container-low/50 border border-white/5 p-4 rounded-2xl">
              <span className="text-[10px] font-mono text-on-surface-variant uppercase block">Proyección Diciembre</span>
              <div className="text-lg font-black text-sky-400 mt-1">
                {formatMillions(generalMetrics.recaudoEsperadoDiciembre)}
              </div>
              <div className="text-[10px] text-on-surface-variant font-mono mt-1">Escenario {filters.scenario}</div>
            </div>
          </div>

          {/* Combined Chart of Monthly Inflows */}
          <div className="bg-surface-container-low/40 border border-white/5 p-6 rounded-3xl space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-white font-mono uppercase">
                  Curva de Recaudo Efectivo Mensual vs Recaudo Acumulado
                </h3>
                <p className="text-xs text-on-surface-variant">
                  Evolución cronológica Enero a Noviembre (Reales) con proyección de Diciembre
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-on-surface-variant">Filtro aplicado: {filters.tipoRecurso}</span>
              </div>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={monthlyStats.map((s) => ({
                    mes: s.mesNombre,
                    recaudo: Math.round(s.recaudoMes / 1e6),
                    acumulado: Math.round(s.recaudoAcumulado / 1e6),
                    promedio: 46917,
                    esProyectado: s.esProyectado,
                  }))}
                  margin={{ top: 10, right: 10, left: 0, bottom: 25 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                  <XAxis dataKey="mes" stroke="#888888" tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="left" stroke="#888888" tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="right" orientation="right" stroke="#888888" tick={{ fontSize: 10 }} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', borderRadius: '12px' }}
                    formatter={(val: any) => [`$ ${Number(val).toLocaleString('es-CO')} M`, '']}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar yAxisId="left" dataKey="recaudo" name="Recaudo del Mes" radius={[4, 4, 0, 0]}>
                    {monthlyStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.esProyectado ? '#38bdf8' : '#FFCC29'} />
                    ))}
                  </Bar>
                  <Line yAxisId="right" type="monotone" dataKey="acumulado" name="Recaudo Acumulado" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} />
                  <Line yAxisId="left" type="monotone" dataKey="promedio" name="Promedio Mensual ($46.917M)" stroke="#f43f5e" strokeDasharray="5 5" strokeWidth={1.5} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Monthly Detailed Table */}
          <div className="bg-surface-container-low/40 border border-white/5 p-6 rounded-3xl space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <h3 className="text-sm font-bold text-white font-mono uppercase">
                Tabla de Recaudo Mensualizado y Variación Intermensual
              </h3>
              <button
                onClick={() => exportToCSV(monthlyStats, 'Recaudo_Mensual_UPTC_2026')}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 text-xs font-mono"
              >
                <Download size={14} />
                Exportar Mensual (CSV)
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead className="bg-zinc-900 border-b border-white/10 text-on-surface-variant text-[11px]">
                  <tr>
                    <th className="p-3">Mes</th>
                    <th className="p-3 text-right">Recaudo del Mes</th>
                    <th className="p-3 text-right">Recaudo Acumulado</th>
                    <th className="p-3 text-right">Variación Intermensual (%)</th>
                    <th className="p-3">Naturaleza del Dato</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {monthlyStats.map((item, idx) => (
                    <tr key={idx} className="hover:bg-white/5 transition-colors">
                      <td className="p-3 font-bold text-white">{item.mesNombre}</td>
                      <td className="p-3 text-right font-bold text-[#FFCC29]">{formatCOP(item.recaudoMes)}</td>
                      <td className="p-3 text-right text-emerald-400">{formatCOP(item.recaudoAcumulado)}</td>
                      <td className="p-3 text-right">
                        <span
                          className={`font-bold ${
                            item.variacionPorcentual > 0
                              ? 'text-emerald-400'
                              : item.variacionPorcentual < 0
                              ? 'text-rose-400'
                              : 'text-gray-400'
                          }`}
                        >
                          {item.variacionPorcentual > 0 ? '+' : ''}
                          {item.variacionPorcentual.toFixed(2)}%
                        </span>
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] ${
                            item.esProyectado
                              ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}
                        >
                          {item.esProyectado ? 'Proyección de Cierre' : 'Recaudo Real en Extracto'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial Analysis Box */}
            <div className="bg-black/30 p-4 rounded-2xl border border-white/5 space-y-2 text-xs text-on-surface-variant leading-relaxed">
              <h4 className="font-bold text-white uppercase font-mono text-[11px]">Análisis de Estacionalidad y Comportamiento de Ingresos</h4>
              <p>
                - <strong>Picos Estacionales:</strong> Se concentran en <strong>Octubre ($ 57.962 M)</strong> y <strong>Septiembre ($ 56.921 M)</strong>, explicados por la regularización de giros de transferencias de la Nación (Aportes Funcionamiento R10.0 con giro de $45.956M en octubre) y recaudo de matrículas del segundo semestre académico.
              </p>
              <p>
                - <strong>Valles de Ingreso:</strong> Ocurrieron en <strong>Abril ($ 36.427 M)</strong> y <strong>Mayo ($ 38.876 M)</strong>, coincidiendo con la transición entre ciclos de matrícula y retrasos en desembolsos sectoriales.
              </p>
              <p>
                - <strong>Dependencia Estructural:</strong> El 60,0% del recaudo institucional depende directamente de los giros de Aportes Nación Funcionamiento (Recurso 10.0), lo que ratifica la importancia de garantizar la transferencia de cierre del mes de diciembre.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 3: GASTOS & COMPROMISOS */}
      {activeTab === 'gastos' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-surface-container-low/50 border border-white/5 p-4 rounded-2xl">
              <span className="text-[10px] font-mono text-on-surface-variant uppercase block">Apropiación Definitiva</span>
              <div className="text-lg font-black text-white mt-1">{formatCOP(generalMetrics.apropiacionTotal)}</div>
            </div>
            <div className="bg-surface-container-low/50 border border-white/5 p-4 rounded-2xl">
              <span className="text-[10px] font-mono text-on-surface-variant uppercase block">Compromisos Acumulados</span>
              <div className="text-lg font-black text-sky-400 mt-1">{formatCOP(generalMetrics.compromisosTotal)}</div>
              <div className="text-[10px] text-sky-300 font-mono mt-1">
                {generalMetrics.porcentajeCompromiso.toFixed(2)}% ejecutado
              </div>
            </div>
            <div className="bg-surface-container-low/50 border border-white/5 p-4 rounded-2xl">
              <span className="text-[10px] font-mono text-on-surface-variant uppercase block">Pagos Acumulados</span>
              <div className="text-lg font-black text-purple-400 mt-1">{formatCOP(generalMetrics.pagosTotal)}</div>
              <div className="text-[10px] text-purple-300 font-mono mt-1">
                {generalMetrics.porcentajePagoSobreCompromiso.toFixed(2)}% pagado s/ compromisos
              </div>
            </div>
            <div className="bg-surface-container-low/50 border border-amber-500/20 p-4 rounded-2xl bg-amber-500/5">
              <span className="text-[10px] font-mono text-amber-400 uppercase block">Saldo por Pagar (Brecha)</span>
              <div className="text-lg font-black text-amber-400 mt-1">{formatCOP(generalMetrics.saldoPorPagar)}</div>
              <div className="text-[10px] text-amber-300 font-mono mt-1">Exigibilidad inmediata</div>
            </div>
          </div>

          {/* Unit breakdown table */}
          <div className="bg-surface-container-low/40 border border-white/5 p-6 rounded-3xl space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-white font-mono uppercase">
                  Ejecución Presupuestal y Brecha de Pagos por Unidad Ejecutora
                </h3>
                <p className="text-xs text-on-surface-variant">Concentración y nivel de exposición financiera al corte</p>
              </div>
              <button
                onClick={() => exportToCSV(filteredExpenses, 'Gastos_UPTC_Caja_Hoy')}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 text-xs font-mono"
              >
                <Download size={14} />
                Exportar Gastos (CSV)
              </button>
            </div>

            <div className="overflow-x-auto max-h-[450px] scrollbar-thin">
              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead className="sticky top-0 bg-zinc-900 border-b border-white/10 text-on-surface-variant text-[11px]">
                  <tr>
                    <th className="p-3">Unidad Ejecutora</th>
                    <th className="p-3 text-right">Apropiación</th>
                    <th className="p-3 text-right">Compromisos</th>
                    <th className="p-3 text-right">Pagos</th>
                    <th className="p-3 text-right">Saldo x Pagar</th>
                    <th className="p-3 text-right">% Pag/Comp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {unitOptions.map((unitName, idx) => {
                    const unitExp = filteredExpenses.filter((e) => e.unidad === unitName);
                    const apr = unitExp.reduce((s, e) => s + e.valorApropiacion, 0);
                    const com = unitExp.reduce((s, e) => s + e.acumuladoCompromiso, 0);
                    const pag = unitExp.reduce((s, e) => s + e.acumuladoPago, 0);
                    const xPag = com - pag;
                    const pct = com > 0 ? (pag / com) * 100 : 0;
                    if (apr === 0 && com === 0) return null;
                    return (
                      <tr key={idx} className="hover:bg-white/5 transition-colors">
                        <td className="p-3 font-bold text-white max-w-sm truncate">{unitName}</td>
                        <td className="p-3 text-right text-gray-300">{formatCOP(apr)}</td>
                        <td className="p-3 text-right text-sky-400 font-bold">{formatCOP(com)}</td>
                        <td className="p-3 text-right text-purple-400">{formatCOP(pag)}</td>
                        <td className="p-3 text-right text-amber-400 font-bold">{formatCOP(xPag)}</td>
                        <td className="p-3 text-right">
                          <span
                            className={`font-bold ${
                              pct >= 85 ? 'text-emerald-400' : pct >= 60 ? 'text-amber-400' : 'text-rose-400'
                            }`}
                          >
                            {pct.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 4: ESTADO DE BANCOS Y CONCILIACIÓN */}
      {activeTab === 'bancos' && (
        <div className="space-y-6">
          {/* Official Bank Reference Reconciliation Alert Banner */}
          <div className="bg-surface-container-low/40 border border-white/5 p-6 rounded-3xl space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-white/5 pb-4 gap-2">
              <div className="flex items-center gap-2">
                <Landmark size={20} className="text-[#FFCC29]" />
                <h3 className="text-sm font-bold text-white font-mono uppercase">
                  Conciliación Oficial frente al Saldo Bancario de Referencia ($ 144.563.470.673)
                </h3>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                Coincidencia Plena (Dif. $ 0,35 COP)
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                <span className="text-on-surface-variant block text-[10px]">Saldo de Referencia Oficial:</span>
                <span className="text-white font-bold">{formatCOP(bankReconciliation.saldoReferencia)}</span>
              </div>
              <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                <span className="text-on-surface-variant block text-[10px]">Saldo Consolidado del CSV:</span>
                <span className="text-[#FFCC29] font-bold">{formatCOP(bankReconciliation.saldoReportado)}</span>
              </div>
              <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                <span className="text-on-surface-variant block text-[10px]">Diferencia Absoluta:</span>
                <span className="text-emerald-400 font-bold">$ {bankReconciliation.diferenciaAbsoluta.toFixed(2)} COP</span>
              </div>
              <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                <span className="text-on-surface-variant block text-[10px]">Diferencia Porcentual:</span>
                <span className="text-emerald-400 font-bold">{bankReconciliation.diferenciaPorcentual.toFixed(6)}%</span>
              </div>
            </div>

            <p className="text-xs text-on-surface-variant leading-relaxed">
              {bankReconciliation.observacion}
            </p>
          </div>

          {/* Bank Summary Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-surface-container-low/50 border border-[#FFCC29]/20 p-4 rounded-2xl bg-[#FFCC29]/5">
              <span className="text-[10px] font-mono text-[#FFCC29] uppercase block">Saldo Total Bancos</span>
              <div className="text-lg font-black text-[#FFCC29] mt-1">{formatCOP(generalMetrics.saldoBancosTotal)}</div>
              <div className="text-[10px] text-on-surface-variant font-mono mt-1">
                {generalMetrics.totalCuentas} cuentas activas
              </div>
            </div>
            <div className="bg-surface-container-low/50 border border-white/5 p-4 rounded-2xl">
              <span className="text-[10px] font-mono text-on-surface-variant uppercase block">Destino Funcionamiento</span>
              <div className="text-lg font-black text-emerald-400 mt-1">
                {formatCOP(
                  filteredBanks
                    .filter((b) => b.destino.toLowerCase().includes('funcionamiento'))
                    .reduce((s, b) => s + b.valorFinal, 0)
                )}
              </div>
              <div className="text-[10px] text-emerald-400 font-mono mt-1">85,73% de la liquidez</div>
            </div>
            <div className="bg-surface-container-low/50 border border-white/5 p-4 rounded-2xl">
              <span className="text-[10px] font-mono text-on-surface-variant uppercase block">Destino Inversión</span>
              <div className="text-lg font-black text-sky-400 mt-1">
                {formatCOP(
                  filteredBanks
                    .filter((b) => b.destino.toLowerCase().includes('inversión') || b.destino.toLowerCase().includes('inversion'))
                    .reduce((s, b) => s + b.valorFinal, 0)
                )}
              </div>
              <div className="text-[10px] text-sky-400 font-mono mt-1">13,97% de la liquidez</div>
            </div>
            <div className="bg-surface-container-low/50 border border-white/5 p-4 rounded-2xl">
              <span className="text-[10px] font-mono text-on-surface-variant uppercase block">Sin Destino / No Aplica</span>
              <div className="text-lg font-black text-amber-400 mt-1">
                {formatCOP(
                  filteredBanks
                    .filter((b) => b.destino.toLowerCase().includes('no aplica'))
                    .reduce((s, b) => s + b.valorFinal, 0)
                )}
              </div>
              <div className="text-[10px] text-amber-400 font-mono mt-1">Bancolombia ahorros ($433,8M)</div>
            </div>
          </div>

          {/* Accounts Table */}
          <div className="bg-surface-container-low/40 border border-white/5 p-6 rounded-3xl space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Search size={16} className="text-on-surface-variant" />
                <input
                  type="text"
                  placeholder="Buscar banco, número o nombre de cuenta..."
                  value={searchBank}
                  onChange={(e) => setSearchBank(e.target.value)}
                  className="bg-black/50 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-gray-500 w-80 focus:outline-none focus:border-[#FFCC29]"
                />
              </div>
              <button
                onClick={() => exportToCSV(filteredBanks, 'Estado_Bancos_UPTC_Caja_Hoy')}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 text-xs font-mono"
              >
                <Download size={14} />
                Exportar Cuentas Bancarias (CSV)
              </button>
            </div>

            <div className="overflow-x-auto max-h-[450px] scrollbar-thin">
              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead className="sticky top-0 bg-zinc-900 border-b border-white/10 text-on-surface-variant text-[11px]">
                  <tr>
                    <th className="p-3">Entidad Financiera</th>
                    <th className="p-3">Cuenta</th>
                    <th className="p-3">Tipo de Recurso</th>
                    <th className="p-3">Destinación</th>
                    <th className="p-3 text-right">Saldo Final</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredBanks
                    .filter(
                      (b) =>
                        b.banco.toLowerCase().includes(searchBank.toLowerCase()) ||
                        b.noCuenta.toLowerCase().includes(searchBank.toLowerCase()) ||
                        b.nombreCuenta.toLowerCase().includes(searchBank.toLowerCase())
                    )
                    .map((acc, idx) => (
                      <tr key={idx} className="hover:bg-white/5 transition-colors">
                        <td className="p-3 font-bold text-white">{acc.banco}</td>
                        <td className="p-3 text-on-surface-variant">{acc.noCuenta}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] ${
                              acc.clasificacion === 'Administración'
                                ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                                : acc.clasificacion === 'Inversión'
                                ? 'bg-sky-500/10 text-sky-300 border border-sky-500/20'
                                : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                            }`}
                          >
                            {acc.clasificacion}
                          </span>
                        </td>
                        <td className="p-3 text-gray-300">{acc.destino}</td>
                        <td className="p-3 text-right font-bold text-[#FFCC29]">{formatCOP(acc.valorFinal)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 5: DICIEMBRE – SIMULACIÓN DE CIERRE (NUEVO MÓDULO INDEPENDIENTE) */}
      {activeTab === 'diciembre' && (
        <div className="space-y-6">
          {/* Header of simulator */}
          <div className="bg-surface-container-low/40 border border-white/5 p-6 rounded-3xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-4">
              <div className="flex items-center gap-2">
                <Sliders size={20} className="text-[#FFCC29]" />
                <h3 className="text-base font-bold text-white font-mono uppercase">
                  DICIEMBRE – PROYECCIÓN Y SIMULACIÓN DE CIERRE FINANCIERO
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {(['Todos', 'Administración', 'Inversión'] as const).map((scope) => (
                  <button
                    key={scope}
                    onClick={() => setSimResourceScope(scope)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                      simResourceScope === scope
                        ? 'bg-[#FFCC29] text-black shadow-md'
                        : 'bg-black/40 text-on-surface-variant hover:text-white border border-white/10'
                    }`}
                  >
                    {scope === 'Todos' ? 'Consolidado' : scope}
                  </button>
                ))}
                <button
                  onClick={resetSimulation}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-mono border border-white/10 cursor-pointer"
                  title="Restablecer valores de simulación"
                >
                  <RotateCcw size={12} className="inline mr-1" />
                  Reset
                </button>
              </div>
            </div>
            <p className="text-xs text-on-surface-variant">
              Modifique los supuestos y porcentajes en tiempo real sin alterar las bases de datos originales para determinar la posición final de caja al 31 de diciembre de 2026.
            </p>
          </div>

          {/* Interactive Simulation Dashboard Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Sliders and Modifiers (5 cols) */}
            <div className="lg:col-span-5 bg-surface-container-low/40 border border-white/5 p-6 rounded-3xl space-y-6">
              <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider border-b border-white/5 pb-2">
                Parámetros de Simulación de Diciembre
              </h4>

              {/* Slider 1: % Recaudo Saldo Pendiente */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-gray-300">Cumplimiento Recaudo Pendiente:</span>
                  <span className="text-[#FFCC29] font-bold">{(simIncomeComplianceRate * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={simIncomeComplianceRate}
                  onChange={(e) => setSimIncomeComplianceRate(parseFloat(e.target.value))}
                  className="w-full accent-[#FFCC29] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-on-surface-variant font-mono">
                  <span>Prudente (25%)</span>
                  <span>Base (65%)</span>
                  <span>Optimista (90%)</span>
                </div>
              </div>

              {/* Slider 2: % Pago Compromisos Pendientes */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-gray-300">Pago de Compromisos en Dic:</span>
                  <span className="text-amber-400 font-bold">{(simExpensePaymentRate * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={simExpensePaymentRate}
                  onChange={(e) => setSimExpensePaymentRate(parseFloat(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-on-surface-variant font-mono">
                  <span>Prudente (55%)</span>
                  <span>Base (75%)</span>
                  <span>Total (100%)</span>
                </div>
              </div>

              {/* Input 1: Recaudo Extraordinario */}
              <div className="space-y-1">
                <label className="text-[11px] font-mono text-gray-300 block">
                  (+) Ingresos Extraordinarios Estimados en Dic (COP):
                </label>
                <input
                  type="number"
                  value={simExtraIncome}
                  onChange={(e) => setSimExtraIncome(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#FFCC29]"
                />
              </div>

              {/* Input 2: Gastos Recurrentes / Nómina Extra */}
              <div className="space-y-1">
                <label className="text-[11px] font-mono text-gray-300 block">
                  (-) Pagos Recurrentes / Nuevos Giros de Cierre (COP):
                </label>
                <input
                  type="number"
                  value={simExtraExpense}
                  onChange={(e) => setSimExtraExpense(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#FFCC29]"
                />
              </div>

              {/* Quick Scenario Selector Buttons */}
              <div className="pt-2 border-t border-white/5">
                <span className="text-[10px] font-mono text-on-surface-variant uppercase block mb-2">
                  Cargar Escenario Rápido:
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => {
                      setSimIncomeComplianceRate(0.25);
                      setSimExpensePaymentRate(0.55);
                    }}
                    className="px-2 py-1.5 bg-black/40 hover:bg-white/5 border border-white/10 rounded-xl text-[11px] font-mono text-gray-300 cursor-pointer text-center"
                  >
                    Conservador
                  </button>
                  <button
                    onClick={() => {
                      setSimIncomeComplianceRate(0.65);
                      setSimExpensePaymentRate(0.75);
                    }}
                    className="px-2 py-1.5 bg-black/40 hover:bg-white/5 border border-white/10 rounded-xl text-[11px] font-mono text-gray-300 cursor-pointer text-center"
                  >
                    Base
                  </button>
                  <button
                    onClick={() => {
                      setSimIncomeComplianceRate(0.90);
                      setSimExpensePaymentRate(0.90);
                    }}
                    className="px-2 py-1.5 bg-black/40 hover:bg-white/5 border border-white/10 rounded-xl text-[11px] font-mono text-gray-300 cursor-pointer text-center"
                  >
                    Optimista
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Mathematical Breakdown Table & Waterfall Result (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              {/* Structure Table: Variables de Referencia vs Variables Editables */}
              <div className="bg-surface-container-low/40 border border-white/5 p-6 rounded-3xl space-y-4">
                <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider border-b border-white/5 pb-2">
                  Tabla de Variables de Referencia vs Simulación en Tiempo Real
                </h4>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono border-collapse">
                    <thead className="bg-zinc-900 border-b border-white/10 text-on-surface-variant text-[11px]">
                      <tr>
                        <th className="p-2.5">Variable</th>
                        <th className="p-2.5 text-right">Valor de Referencia</th>
                        <th className="p-2.5 text-right">Valor Simulado</th>
                        <th className="p-2.5 text-center">Editable</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      <tr>
                        <td className="p-2.5 text-gray-300">Saldo actual en bancos</td>
                        <td className="p-2.5 text-right text-gray-400">{formatCOP(simMetrics.bankBalance)}</td>
                        <td className="p-2.5 text-right font-bold text-[#FFCC29]">{formatCOP(simMetrics.bankBalance)}</td>
                        <td className="p-2.5 text-center text-emerald-400">Sí</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 text-gray-300">Aforo total de ingresos</td>
                        <td className="p-2.5 text-right text-gray-400">{formatCOP(simMetrics.aforo)}</td>
                        <td className="p-2.5 text-right text-white">{formatCOP(simMetrics.aforo)}</td>
                        <td className="p-2.5 text-center text-on-surface-variant">No</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 text-gray-300">Recaudo acumulado</td>
                        <td className="p-2.5 text-right text-gray-400">{formatCOP(simMetrics.recaudo)}</td>
                        <td className="p-2.5 text-right text-white">{formatCOP(simMetrics.recaudo)}</td>
                        <td className="p-2.5 text-center text-on-surface-variant">No</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 text-gray-300">Saldo pendiente de recaudo</td>
                        <td className="p-2.5 text-right text-amber-400">{formatCOP(simMetrics.pendiente)}</td>
                        <td className="p-2.5 text-right text-amber-400">{formatCOP(simMetrics.pendiente)}</td>
                        <td className="p-2.5 text-center text-on-surface-variant">No</td>
                      </tr>
                      <tr className="bg-[#FFCC29]/5">
                        <td className="p-2.5 font-bold text-white">(+) Recaudo esperado en diciembre</td>
                        <td className="p-2.5 text-right text-gray-400">{formatCOP(simMetrics.pendiente * 0.65)}</td>
                        <td className="p-2.5 text-right font-bold text-emerald-400">+{formatCOP(simMetrics.recaudoEsperadoDic)}</td>
                        <td className="p-2.5 text-center text-emerald-400">Sí ({(simIncomeComplianceRate * 100).toFixed(0)}%)</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 text-gray-300">Compromisos acumulados</td>
                        <td className="p-2.5 text-right text-gray-400">{formatCOP(simMetrics.compromisos)}</td>
                        <td className="p-2.5 text-right text-white">{formatCOP(simMetrics.compromisos)}</td>
                        <td className="p-2.5 text-center text-on-surface-variant">No</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 text-gray-300">Pagos acumulados</td>
                        <td className="p-2.5 text-right text-gray-400">{formatCOP(simMetrics.pagos)}</td>
                        <td className="p-2.5 text-right text-white">{formatCOP(simMetrics.pagos)}</td>
                        <td className="p-2.5 text-center text-on-surface-variant">No</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 text-gray-300">Compromisos pendientes de pago</td>
                        <td className="p-2.5 text-right text-amber-400">{formatCOP(simMetrics.xPagar)}</td>
                        <td className="p-2.5 text-right text-amber-400">{formatCOP(simMetrics.xPagar)}</td>
                        <td className="p-2.5 text-center text-on-surface-variant">No</td>
                      </tr>
                      <tr className="bg-rose-500/5">
                        <td className="p-2.5 font-bold text-white">(-) Pagos estimados en diciembre</td>
                        <td className="p-2.5 text-right text-gray-400">{formatCOP(simMetrics.xPagar * 0.75)}</td>
                        <td className="p-2.5 text-right font-bold text-rose-400">-{formatCOP(simMetrics.pagosEsperadosDic)}</td>
                        <td className="p-2.5 text-center text-emerald-400">Sí ({(simExpensePaymentRate * 100).toFixed(0)}%)</td>
                      </tr>
                      <tr className="bg-white/10 font-bold">
                        <td className="p-3 text-white uppercase text-sm">(=) SALDO FINAL PROYECTADO AL 31 DIC</td>
                        <td className="p-3 text-right text-gray-300">
                          {formatCOP(simMetrics.bankBalance + simMetrics.pendiente * 0.65 - simMetrics.xPagar * 0.75)}
                        </td>
                        <td className="p-3 text-right font-black text-emerald-400 text-sm">
                          {formatCOP(simMetrics.saldoCierre)}
                        </td>
                        <td className="p-3 text-center text-emerald-400">Calculado</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Waterfall Chart Representation */}
              <div className="bg-surface-container-low/40 border border-white/5 p-6 rounded-3xl space-y-4">
                <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                  Gráfica de Cascada: Transformación del Efectivo a Cierre
                </h4>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { name: 'Caja Actual', valor: Math.round(simMetrics.bankBalance / 1e6), fill: '#FFCC29' },
                        { name: '(+) Recaudo Dic', valor: Math.round(simMetrics.recaudoEsperadoDic / 1e6), fill: '#10b981' },
                        { name: '(-) Pagos Dic', valor: Math.round(simMetrics.pagosEsperadosDic / 1e6), fill: '#f43f5e' },
                        { name: '(=) Caja Cierre', valor: Math.round(simMetrics.saldoCierre / 1e6), fill: '#38bdf8' },
                      ]}
                      margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                      <XAxis dataKey="name" stroke="#888888" tick={{ fontSize: 10 }} />
                      <YAxis stroke="#888888" tick={{ fontSize: 10 }} />
                      <RechartsTooltip
                        contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', borderRadius: '12px' }}
                        formatter={(val: any) => [`$ ${Number(val).toLocaleString('es-CO')} M`, 'Monto']}
                      />
                      <Bar dataKey="valor" radius={[6, 6, 0, 0]}>
                        {['#FFCC29', '#10b981', '#f43f5e', '#38bdf8'].map((c, i) => (
                          <Cell key={i} fill={c} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 6: EQUILIBRIO PRESUPUESTAL Y SOSTENIBILIDAD (NUEVO MÓDULO INDEPENDIENTE) */}
      {activeTab === 'equilibrio' && (
        <div className="space-y-6">
          {/* Header of financial equilibrium */}
          <div className="bg-surface-container-low/40 border border-white/5 p-6 rounded-3xl space-y-3">
            <div className="flex items-center gap-2 border-b border-white/5 pb-3">
              <Scale size={20} className="text-[#FFCC29]" />
              <h3 className="text-base font-bold text-white font-mono uppercase">
                EQUILIBRIO PRESUPUESTAL Y SOSTENIBILIDAD FINANCIERA UPTC
              </h3>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Diferenciación rigurosa de los 4 niveles de equilibrio: Presupuesto Aprobado, Ejecución Presupuestal, Tesorería de Caja y Posición Proyectada al 31 de Diciembre de 2026.
            </p>
          </div>

          {/* 4 Levels of Equilibrium Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Aprobado */}
            <div className="bg-surface-container-low/50 border border-white/5 p-5 rounded-2xl space-y-2">
              <span className="text-[10px] font-mono text-on-surface-variant uppercase block">
                1. Equilibrio Presupuestal Aprobado
              </span>
              <div className="text-lg font-black text-emerald-400">
                {formatCOP(equilibrioResult.equilibrioAprobado)}
              </div>
              <p className="text-[11px] text-gray-300 font-mono">
                Aforo ($ 576.148M) = Apropiación ($ 576.148M). Equilibrio legal 100% perfecto.
              </p>
            </div>

            {/* 2. Ejecución */}
            <div className="bg-surface-container-low/50 border border-white/5 p-5 rounded-2xl space-y-2">
              <span className="text-[10px] font-mono text-on-surface-variant uppercase block">
                2. Equilibrio Ejecución Presupuestal
              </span>
              <div className="text-lg font-black text-sky-400">
                +{formatCOP(equilibrioResult.equilibrioEjecucion)}
              </div>
              <p className="text-[11px] text-gray-300 font-mono">
                Recaudo ($ 543.935M) - Compromisos ($ 447.862M). Superávit de gestión de recursos.
              </p>
            </div>

            {/* 3. Caja */}
            <div className="bg-surface-container-low/50 border border-white/5 p-5 rounded-2xl space-y-2">
              <span className="text-[10px] font-mono text-on-surface-variant uppercase block">
                3. Equilibrio de Caja (Tesorería)
              </span>
              <div className="text-lg font-black text-[#FFCC29]">
                +{formatCOP(equilibrioResult.equilibrioCaja)}
              </div>
              <p className="text-[11px] text-gray-300 font-mono">
                Bancos ($ 144.563M) - Saldo por Pagar ($ 61.402M). Cobertura inmediata 2,35x.
              </p>
            </div>

            {/* 4. Proyectado Cierre */}
            <div className="bg-surface-container-low/50 border border-white/5 p-5 rounded-2xl space-y-2">
              <span className="text-[10px] font-mono text-on-surface-variant uppercase block">
                4. Equilibrio Proyectado a Cierre
              </span>
              <div className="text-lg font-black text-emerald-400">
                {formatCOP(equilibrioResult.equilibrioProyectado)}
              </div>
              <p className="text-[11px] text-gray-300 font-mono">
                Caja final estimada al 31 de Diciembre con flujo neto superavitario.
              </p>
            </div>
          </div>

          {/* MATRIZ DE EQUILIBRIO FINANCIERO (10x3) (Req. Sección 6.5) */}
          <div className="bg-surface-container-low/40 border border-white/5 p-6 rounded-3xl space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-bold text-white font-mono uppercase">
                  Matriz de Equilibrio Financiero Institucional (10x3)
                </h4>
                <p className="text-xs text-on-surface-variant">Desglose comparativo Administración, Inversión y Total UPTC</p>
              </div>
              <button
                onClick={() => exportToCSV(equilibrioResult.matrix, 'Matriz_Equilibrio_Financiero_UPTC')}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 text-xs font-mono"
              >
                <Download size={14} />
                Exportar Matriz (CSV)
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead className="bg-zinc-900 border-b border-white/10 text-on-surface-variant text-[11px]">
                  <tr>
                    <th className="p-3">Indicador</th>
                    <th className="p-3 text-right">Administración (Funcionamiento)</th>
                    <th className="p-3 text-right">Inversión (Destinación Específica)</th>
                    <th className="p-3 text-right font-bold text-white">Total Institucional</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {equilibrioResult.matrix.map((row, idx) => (
                    <tr
                      key={idx}
                      className={`hover:bg-white/5 transition-colors ${
                        idx === 2 ? 'bg-emerald-500/5 font-bold' : idx === 9 ? 'bg-[#FFCC29]/5 font-bold' : ''
                      }`}
                    >
                      <td className="p-3 font-medium text-gray-200">{row.indicador}</td>
                      <td className="p-3 text-right text-gray-300">{formatCOP(row.administracion)}</td>
                      <td className="p-3 text-right text-gray-300">{formatCOP(row.inversion)}</td>
                      <td className="p-3 text-right font-bold text-white">{formatCOP(row.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 6 Comparative Equilibrium Charts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 1. Aforo vs Apropiación */}
            <div className="bg-surface-container-low/40 border border-white/5 p-4 rounded-2xl space-y-2">
              <h5 className="text-[11px] font-mono font-bold text-white uppercase">1. Aforo vs Apropiación</h5>
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[{ name: 'UPTC', Aforo: 576148, Apropiación: 576148 }]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                    <XAxis dataKey="name" stroke="#888" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#888" tick={{ fontSize: 9 }} />
                    <RechartsTooltip contentStyle={{ backgroundColor: '#18181b', borderRadius: '8px' }} />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                    <Bar dataKey="Aforo" fill="#10b981" />
                    <Bar dataKey="Apropiación" fill="#38bdf8" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 2. Recaudo vs Compromisos */}
            <div className="bg-surface-container-low/40 border border-white/5 p-4 rounded-2xl space-y-2">
              <h5 className="text-[11px] font-mono font-bold text-white uppercase">2. Recaudo vs Compromisos</h5>
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[{ name: 'UPTC', Recaudo: 543935, Compromisos: 447862 }]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                    <XAxis dataKey="name" stroke="#888" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#888" tick={{ fontSize: 9 }} />
                    <RechartsTooltip contentStyle={{ backgroundColor: '#18181b', borderRadius: '8px' }} />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                    <Bar dataKey="Recaudo" fill="#10b981" />
                    <Bar dataKey="Compromisos" fill="#f59e0b" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 3. Compromisos vs Pagos */}
            <div className="bg-surface-container-low/40 border border-white/5 p-4 rounded-2xl space-y-2">
              <h5 className="text-[11px] font-mono font-bold text-white uppercase">3. Compromisos vs Pagos</h5>
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[{ name: 'UPTC', Compromisos: 447862, Pagos: 386460 }]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                    <XAxis dataKey="name" stroke="#888" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#888" tick={{ fontSize: 9 }} />
                    <RechartsTooltip contentStyle={{ backgroundColor: '#18181b', borderRadius: '8px' }} />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                    <Bar dataKey="Compromisos" fill="#38bdf8" />
                    <Bar dataKey="Pagos" fill="#a855f7" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 4. Flujo Neto de Caja */}
            <div className="bg-surface-container-low/40 border border-white/5 p-4 rounded-2xl space-y-2">
              <h5 className="text-[11px] font-mono font-bold text-white uppercase">4. Flujo de Caja en Bancos</h5>
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[{ name: 'UPTC', 'Saldo Bancos': 144563, 'Compromisos x Pagar': 61402 }]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                    <XAxis dataKey="name" stroke="#888" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#888" tick={{ fontSize: 9 }} />
                    <RechartsTooltip contentStyle={{ backgroundColor: '#18181b', borderRadius: '8px' }} />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                    <Bar dataKey="Saldo Bancos" fill="#FFCC29" />
                    <Bar dataKey="Compromisos x Pagar" fill="#f43f5e" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 5. Comparativo Admin vs Inversión */}
            <div className="bg-surface-container-low/40 border border-white/5 p-4 rounded-2xl space-y-2">
              <h5 className="text-[11px] font-mono font-bold text-white uppercase">5. Admin vs Inversión</h5>
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { name: 'Admin', Bancos: 123938, xPagar: 43796 },
                      { name: 'Inversión', Bancos: 20191, xPagar: 17606 },
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                    <XAxis dataKey="name" stroke="#888" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#888" tick={{ fontSize: 9 }} />
                    <RechartsTooltip contentStyle={{ backgroundColor: '#18181b', borderRadius: '8px' }} />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                    <Bar dataKey="Bancos" fill="#10b981" />
                    <Bar dataKey="xPagar" fill="#f59e0b" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 6. Saldo Cierre Proyectado por Escenario */}
            <div className="bg-surface-container-low/40 border border-white/5 p-4 rounded-2xl space-y-2">
              <h5 className="text-[11px] font-mono font-bold text-white uppercase">6. Cierre por Escenario</h5>
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { name: 'Prudente', Cierre: 118742 },
                      { name: 'Base', Cierre: 119451 },
                      { name: 'Optimista', Cierre: 118239 },
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                    <XAxis dataKey="name" stroke="#888" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#888" tick={{ fontSize: 9 }} />
                    <RechartsTooltip contentStyle={{ backgroundColor: '#18181b', borderRadius: '8px' }} />
                    <Bar dataKey="Cierre" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Interpretación Financiera Automatizada (Req. Sección 6.8) */}
          <div className="bg-surface-container-low/40 border border-white/5 p-6 rounded-3xl space-y-3">
            <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
              Conclusiones y Dictamen de Equilibrio Financiero
            </h4>
            <div className="space-y-2 text-xs text-on-surface-variant">
              {equilibrioResult.conclusiones.map((c, i) => (
                <p key={i} className="leading-relaxed">
                  {c}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 7: CONTROL Y VALIDACIÓN DE CIFRAS */}
      {activeTab === 'auditoria' && (
        <div className="space-y-6">
          {/* Official Validation Table (Req. Numeral 3) */}
          <div className="bg-surface-container-low/40 border border-white/5 p-6 rounded-3xl space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-white/5 pb-4">
              <div>
                <h3 className="text-base font-bold text-white font-mono uppercase">
                  Control y Validación Oficial de Cifras
                </h3>
                <p className="text-xs text-on-surface-variant">
                  Auditoría de consistencia entre archivos CSV suministrados y cálculos del aplicativo
                </p>
              </div>
              <button
                onClick={() => exportToCSV(controlCifras, 'Control_Validacion_Cifras_UPTC')}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 text-xs font-mono"
              >
                <Download size={14} />
                Exportar Auditoría (CSV)
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead className="bg-zinc-900 border-b border-white/10 text-on-surface-variant text-[11px]">
                  <tr>
                    <th className="p-3">Concepto</th>
                    <th className="p-3 text-right">Valor Original</th>
                    <th className="p-3 text-right">Valor Calculado</th>
                    <th className="p-3 text-right">Diferencia</th>
                    <th className="p-3 text-center">Estado</th>
                    <th className="p-3">Explicación Técnica</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {controlCifras.map((row, idx) => (
                    <tr key={idx} className="hover:bg-white/5 transition-colors">
                      <td className="p-3 font-bold text-white">{row.concepto}</td>
                      <td className="p-3 text-right text-gray-300">{formatCOP(row.valorOriginal)}</td>
                      <td className="p-3 text-right font-bold text-[#FFCC29]">{formatCOP(row.valorCalculado)}</td>
                      <td className="p-3 text-right">
                        <span className={row.diferencia === 0 ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                          {formatCOP(row.diferencia)}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            row.estado.includes('Conforme')
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                          }`}
                        >
                          {row.estado}
                        </span>
                      </td>
                      <td className="p-3 text-on-surface-variant max-w-md">{row.detalle}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Audit Verification Cards */}
          <div className="grid grid-cols-1 gap-4">
            {auditChecks.map((check) => (
              <div
                key={check.id}
                className="bg-surface-container-low/40 border border-white/5 p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 max-w-3xl">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                        check.status === 'ok'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : check.status === 'warning'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {check.status === 'ok' ? 'Conforme' : check.status === 'warning' ? 'Observación' : 'Inconsistencia'}
                    </span>
                    <span className="text-[10px] font-mono text-on-surface-variant uppercase">
                      Categoría: {check.category}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white">{check.title}</h4>
                  <p className="text-xs text-gray-300 leading-relaxed font-light">{check.detail}</p>
                  {check.recommendation && (
                    <p className="text-xs text-[#FFCC29] font-mono pt-1">
                      💡 <strong>Recomendación Técnica:</strong> {check.recommendation}
                    </p>
                  )}
                </div>

                {check.value && (
                  <div className="bg-black/50 border border-white/10 px-4 py-2.5 rounded-xl font-mono text-xs text-right shrink-0">
                    <span className="text-[10px] text-on-surface-variant block uppercase">Resultado</span>
                    <span className="text-white font-bold">{check.value}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBTAB 8: REPORTE GERENCIAL Y EXPORTACIÓN */}
      {activeTab === 'reportes' && (
        <div className="space-y-6">
          <div className="bg-surface-container-low/40 border border-white/5 p-8 rounded-3xl space-y-6 print:border-none print:p-0">
            <div className="flex flex-col sm:flex-row items-center justify-between border-b border-white/10 pb-6 gap-4">
              <div className="flex items-center gap-4">
                <img
                  src="https://raw.githubusercontent.com/fabiancho0724/VAFI-Reporte-Financiero/7601e17bbde30e0381cc947ff62d9345b0ec3853/uptc-blanco%20(1).png"
                  alt="UPTC Logo"
                  className="w-14 h-14 object-contain"
                />
                <div>
                  <h2 className="text-lg font-bold text-white">UNIVERSIDAD PEDAGÓGICA Y TECNOLÓGICA DE COLOMBIA</h2>
                  <p className="text-xs font-mono text-on-surface-variant">Vicerrectoría Administrativa y Financiera – Dirección Financiera</p>
                  <p className="text-[11px] font-mono text-[#FFCC29]">
                    INFORME GERENCIAL INTEGRAL DE CAJA, BANCOS, SIMULACIÓN A DICIEMBRE Y EQUILIBRIO PRESUPUESTAL
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#FFCC29] text-black font-mono font-bold text-xs rounded-xl shadow-lg hover:bg-[#FFCC29]/90 cursor-pointer"
                >
                  <Printer size={16} />
                  Imprimir / Descargar PDF
                </button>
              </div>
            </div>

            {/* Document Content */}
            <div className="space-y-6 text-xs text-gray-300 leading-relaxed">
              <div className="bg-black/30 p-4 rounded-xl border border-white/5 space-y-2">
                <h4 className="font-bold text-white font-mono uppercase text-sm">1. SÍNTESIS EJECUTIVA DE DISPONIBILIDAD</h4>
                <p>
                  Con corte al <strong>23 de noviembre de 2026</strong>, la tesorería de la UPTC reporta un saldo total en
                  cuentas bancarias de <strong>{formatCOP(generalMetrics.saldoBancosTotal)}</strong> (conciliado con el saldo
                  de referencia de <strong>$ 144.563.470.673 COP</strong>). Dicha disponibilidad respalda plenamente los
                  compromisos presupuestales pendientes de pago por <strong>{formatCOP(generalMetrics.saldoPorPagar)}</strong>,
                  lo que representa un índice de cobertura inmediata del <strong>{(generalMetrics.coberturaInmediata * 100).toFixed(1)}%</strong> y
                  un margen de superávit de <strong>{formatCOP(generalMetrics.margenHolguraInmediata)}</strong>.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-black/30 p-4 rounded-xl border border-white/5 space-y-2">
                  <h4 className="font-bold text-white font-mono uppercase">2. RECURSOS DE ADMINISTRACIÓN</h4>
                  <p>
                    Presentan una liquidez de <strong>{formatCOP(adminMetrics.saldoBancosTotal)}</strong> frente a obligaciones
                    por pagar de <strong>{formatCOP(adminMetrics.saldoPorPagar)}</strong> (cobertura:{' '}
                    {(adminMetrics.coberturaInmediata * 100).toFixed(1)}%). Se garantiza la total suficiencia para las nóminas de
                    noviembre y diciembre, prestaciones sociales, primas y servicios básicos.
                  </p>
                </div>

                <div className="bg-black/30 p-4 rounded-xl border border-white/5 space-y-2">
                  <h4 className="font-bold text-white font-mono uppercase">3. RECURSOS DE INVERSIÓN</h4>
                  <p>
                    Presentan un saldo disponible de <strong>{formatCOP(invMetrics.saldoBancosTotal)}</strong> frente a
                    compromisos por pagar de <strong>{formatCOP(invMetrics.saldoPorPagar)}</strong> (cobertura:{' '}
                    {(invMetrics.coberturaInmediata * 100).toFixed(1)}%). Existe suficiencia, pero con un margen de holgura
                    ajustado de <strong>{formatCOP(invMetrics.margenHolguraInmediata)}</strong>. Se requiere blindar los recursos
                    con destinación específica y acelerar giros contractuales.
                  </p>
                </div>
              </div>

              {/* Downloads Bar */}
              <div className="bg-black/30 p-4 rounded-xl border border-white/5 space-y-3">
                <h4 className="font-bold text-white font-mono uppercase text-sm">4. EXPORTACIÓN DE BASES Y MATRICES ANALÍTICAS</h4>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => exportToCSV(equilibrioResult.matrix, 'Matriz_Equilibrio_UPTC')}
                    className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-white font-mono text-[11px] border border-white/10 cursor-pointer"
                  >
                    <Download size={13} />
                    Exportar Matriz de Equilibrio (CSV)
                  </button>
                  <button
                    onClick={() => exportToCSV(filteredBanks, 'Cuentas_Bancarias_UPTC')}
                    className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-white font-mono text-[11px] border border-white/10 cursor-pointer"
                  >
                    <Download size={13} />
                    Exportar Estado de Bancos (CSV)
                  </button>
                  <button
                    onClick={() => exportToCSV(monthlyStats, 'Recaudo_Mensualizado_UPTC')}
                    className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-white font-mono text-[11px] border border-white/10 cursor-pointer"
                  >
                    <Download size={13} />
                    Exportar Ingresos Mensualizados (CSV)
                  </button>
                  <button
                    onClick={() => exportToCSV(filteredExpenses, 'Gastos_UPTC')}
                    className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-white font-mono text-[11px] border border-white/10 cursor-pointer"
                  >
                    <Download size={13} />
                    Exportar Gastos por Unidad (CSV)
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
