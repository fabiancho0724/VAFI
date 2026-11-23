import React, { useState, useEffect, useMemo } from 'react';
import {
  ResponsiveContainer,
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
  PieChart,
  Pie,
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
  ChevronRight,
  Info,
  DollarSign,
  Briefcase,
  PieChart as PieIcon,
  Activity,
  Award
} from 'lucide-react';
import {
  loadCajaHoyDatasets,
  calculateCajaHoyMetrics,
  filterCajaHoyData,
  runCajaHoyAudit,
  generateAutomatedFinancialDiagnosis,
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

const formatBillions = (val: number): string => {
  if (val === undefined || val === null || isNaN(val)) return '$ 0 MM';
  const inB = val / 1e9;
  return `$ ${inB.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MM`;
};

export function CajaHoyScreen({ onNavigate }: { onNavigate?: (s: string) => void }) {
  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [banks, setBanks] = useState<CajaHoyBankAccount[]>([]);
  const [incomes, setIncomes] = useState<CajaHoyIncome[]>([]);
  const [monthlyIncomes, setMonthlyIncomes] = useState<CajaHoyMonthlyIncome[]>([]);
  const [expenses, setExpenses] = useState<CajaHoyExpense[]>([]);

  // Subtabs
  const [activeTab, setActiveTab] = useState<
    'ejecutivo' | 'ingresos' | 'gastos' | 'bancos' | 'flujo' | 'auditoria' | 'reportes'
  >('ejecutivo');

  // Filters
  const [filters, setFilters] = useState<CajaHoyFilterState>({
    tipoRecurso: 'Todos',
    banco: 'Todos',
    unidad: 'Todas',
    recurso: 'Todos',
    scenario: 'base',
    useStrictRule3A: true,
  });

  // Search terms for tables
  const [searchBank, setSearchBank] = useState('');
  const [searchIncome, setSearchIncome] = useState('');
  const [searchExpense, setSearchExpense] = useState('');

  // Flow perspective in Flujo subtab
  const [flowTab, setFlowTab] = useState<'consolidado' | 'administracion' | 'inversion'>('consolidado');

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

  // Audit checks & diagnosis
  const auditChecks = useMemo(() => {
    return runCajaHoyAudit(banks, incomes, monthlyIncomes, expenses);
  }, [banks, incomes, monthlyIncomes, expenses]);

  const diagnosis = useMemo(() => {
    return generateAutomatedFinancialDiagnosis(generalMetrics, adminMetrics, invMetrics);
  }, [generalMetrics, adminMetrics, invMetrics]);

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
        <p className="text-white font-mono text-sm tracking-wide">Cargando Sistema Inteligente de Caja HOY (23 Nov 2026)...</p>
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
            className="px-6 py-2.5 bg-[#FFCC29] text-black font-bold text-xs rounded-xl hover:bg-[#FFCC29]/90"
          >
            Reintentar Carga
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-on-surface space-y-6 pb-20">
      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-surface-container-low/60 border border-white/5 p-6 rounded-3xl backdrop-blur-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full text-[11px] font-mono font-bold bg-[#FFCC29]/20 text-[#FFCC29] border border-[#FFCC29]/30 flex items-center gap-1.5 shadow-[0_0_12px_rgba(255,204,41,0.2)]">
              <span className="w-2 h-2 rounded-full bg-[#FFCC29] animate-pulse"></span>
              CORTE AL 23 DE NOVIEMBRE DE 2026
            </span>
            <span className="text-xs font-mono text-on-surface-variant/80 border border-white/10 px-2.5 py-0.5 rounded-lg">
              Vigencia Fiscal 2026
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <Coins className="text-[#FFCC29]" size={28} />
            CENTRO DE CONTROL FINANCIERO – ANÁLISIS DE CAJA UPTC
          </h1>
          <p className="text-xs sm:text-sm text-on-surface-variant max-w-3xl">
            Integración de ingresos presupuestales, compromisos, pagos y tesorería en bancos para evaluar la liquidez institucional y proyectar el cierre fiscal.
          </p>
        </div>

        {/* Global Controls & Scenario Badge */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-black/40 border border-white/10 rounded-2xl p-1.5 flex items-center gap-1">
            <span className="text-[10px] font-mono text-on-surface-variant px-2 uppercase">Escenario:</span>
            {(['conservador', 'base', 'optimista'] as ScenarioType[]).map((sc) => (
              <button
                key={sc}
                onClick={() => setFilters({ ...filters, scenario: sc })}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all ${
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
            Imprimir
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
            Clasificación 10.5
          </label>
          <button
            onClick={() => setFilters({ ...filters, useStrictRule3A: !filters.useStrictRule3A })}
            className={`w-full py-2 px-3 rounded-xl text-xs font-mono flex items-center justify-between border transition-all ${
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
            Restablecer
          </button>
        </div>
      </div>

      {/* SUBTABS NAVIGATION */}
      <div className="flex overflow-x-auto gap-2 border-b border-white/10 pb-2 scrollbar-none">
        {[
          { id: 'ejecutivo', label: '1. Control Ejecutivo', icon: Award },
          { id: 'ingresos', label: '2. Análisis de Ingresos', icon: TrendingUp },
          { id: 'gastos', label: '3. Gastos & Compromisos', icon: TrendingDown },
          { id: 'bancos', label: '4. Estado de Bancos', icon: Landmark },
          { id: 'flujo', label: '5. Flujo de Caja Integral', icon: Wallet },
          { id: 'auditoria', label: '6. Auditoría y Calidad', icon: ShieldCheck },
          { id: 'reportes', label: '7. Reporte y Exportación', icon: FileText },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-mono font-bold whitespace-nowrap transition-all cursor-pointer ${
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

      {/* TAB 1: CONTROL EJECUTIVO */}
      {activeTab === 'ejecutivo' && (
        <div className="space-y-6">
          {/* INSTITUTIONAL CORE QUESTION ANSWER VERDICT BANNER */}
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
                  DIAGNÓSTICO DIRECTIVO DE LIQUIDEZ Y SOSTENIBILIDAD
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-snug">
                {diagnosis.coreQuestionAnswer.answer}
              </h2>
              <p className="text-xs sm:text-sm text-gray-300 leading-relaxed font-light">
                {diagnosis.coreQuestionAnswer.summary}
              </p>
              <div className="pt-2 flex flex-wrap gap-4 text-xs font-mono">
                <div className="bg-black/40 border border-white/10 px-3 py-1.5 rounded-xl">
                  <span className="text-on-surface-variant">Cobertura Inmediata: </span>
                  <span className="text-emerald-400 font-bold">
                    {(generalMetrics.coberturaInmediata * 100).toFixed(1)}% ({generalMetrics.coberturaInmediata.toFixed(2)}x)
                  </span>
                </div>
                <div className="bg-black/40 border border-white/10 px-3 py-1.5 rounded-xl">
                  <span className="text-on-surface-variant">Margen de Holgura: </span>
                  <span className="text-[#FFCC29] font-bold">
                    {formatCOP(generalMetrics.margenHolguraInmediata)}
                  </span>
                </div>
                <div className="bg-black/40 border border-white/10 px-3 py-1.5 rounded-xl">
                  <span className="text-on-surface-variant">Cierre Proyectado ({filters.scenario}): </span>
                  <span className="text-white font-bold">
                    {formatCOP(generalMetrics.saldoCierreProyectado)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 10 MASTER KPI CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {/* 1. Aforo */}
            <div className="bg-surface-container-low/50 border border-white/5 p-4 rounded-2xl">
              <span className="text-[10px] font-mono text-on-surface-variant uppercase block">1. Aforo Definitivo</span>
              <div className="text-lg font-black text-white mt-1">{formatMillions(generalMetrics.aforoTotal)}</div>
              <div className="text-[10px] text-on-surface-variant font-mono mt-1">Presupuesto inicial + adiciones</div>
            </div>

            {/* 2. Recaudo */}
            <div className="bg-surface-container-low/50 border border-white/5 p-4 rounded-2xl">
              <span className="text-[10px] font-mono text-on-surface-variant uppercase block">2. Recaudo Total</span>
              <div className="text-lg font-black text-emerald-400 mt-1">{formatMillions(generalMetrics.recaudoTotal)}</div>
              <div className="text-[10px] text-emerald-400/90 font-mono mt-1">
                {generalMetrics.porcentajeRecaudo.toFixed(2)}% del aforo
              </div>
            </div>

            {/* 3. Saldo Pendiente Recaudo */}
            <div className="bg-surface-container-low/50 border border-white/5 p-4 rounded-2xl">
              <span className="text-[10px] font-mono text-on-surface-variant uppercase block">3. Pendiente Recaudo</span>
              <div className="text-lg font-black text-amber-400 mt-1">
                {formatMillions(generalMetrics.saldoPendienteRecaudo)}
              </div>
              <div className="text-[10px] text-amber-400/90 font-mono mt-1">
                {generalMetrics.porcentajePendienteRecaudo.toFixed(2)}% por recaudar
              </div>
            </div>

            {/* 4. Apropiación */}
            <div className="bg-surface-container-low/50 border border-white/5 p-4 rounded-2xl">
              <span className="text-[10px] font-mono text-on-surface-variant uppercase block">4. Apropiación Gastos</span>
              <div className="text-lg font-black text-white mt-1">{formatMillions(generalMetrics.apropiacionTotal)}</div>
              <div className="text-[10px] text-on-surface-variant font-mono mt-1">100% equilibrado con aforo</div>
            </div>

            {/* 5. Compromisos */}
            <div className="bg-surface-container-low/50 border border-white/5 p-4 rounded-2xl">
              <span className="text-[10px] font-mono text-on-surface-variant uppercase block">5. Compromisos</span>
              <div className="text-lg font-black text-sky-400 mt-1">{formatMillions(generalMetrics.compromisosTotal)}</div>
              <div className="text-[10px] text-sky-400/90 font-mono mt-1">
                {generalMetrics.porcentajeCompromiso.toFixed(2)}% de apropiación
              </div>
            </div>

            {/* 6. Pagos */}
            <div className="bg-surface-container-low/50 border border-white/5 p-4 rounded-2xl">
              <span className="text-[10px] font-mono text-on-surface-variant uppercase block">6. Pagos Efectivos</span>
              <div className="text-lg font-black text-purple-400 mt-1">{formatMillions(generalMetrics.pagosTotal)}</div>
              <div className="text-[10px] text-purple-400/90 font-mono mt-1">
                {generalMetrics.porcentajePago.toFixed(2)}% pagado s/ apropr.
              </div>
            </div>

            {/* 7. Saldo por Pagar */}
            <div className="bg-surface-container-low/50 border border-amber-500/20 p-4 rounded-2xl bg-amber-500/5">
              <span className="text-[10px] font-mono text-amber-400 uppercase block">7. Compromisos x Pagar</span>
              <div className="text-lg font-black text-amber-400 mt-1">{formatMillions(generalMetrics.saldoPorPagar)}</div>
              <div className="text-[10px] text-amber-300 font-mono mt-1">
                {(100 - generalMetrics.porcentajePagoSobreCompromiso).toFixed(1)}% compromisos pendientes
              </div>
            </div>

            {/* 8. Saldo Bancos */}
            <div className="bg-surface-container-low/50 border border-[#FFCC29]/20 p-4 rounded-2xl bg-[#FFCC29]/5">
              <span className="text-[10px] font-mono text-[#FFCC29] uppercase block">8. Saldo Bancos Hoy</span>
              <div className="text-lg font-black text-[#FFCC29] mt-1">{formatMillions(generalMetrics.saldoBancosTotal)}</div>
              <div className="text-[10px] text-[#FFCC29]/80 font-mono mt-1">85 cuentas en 10 bancos</div>
            </div>

            {/* 9. Cobertura Inmediata */}
            <div className="bg-surface-container-low/50 border border-emerald-500/20 p-4 rounded-2xl bg-emerald-500/5">
              <span className="text-[10px] font-mono text-emerald-400 uppercase block">9. Cobertura Inmediata</span>
              <div className="text-lg font-black text-emerald-400 mt-1">
                {generalMetrics.coberturaInmediata.toFixed(2)}x
              </div>
              <div className="text-[10px] text-emerald-400 font-mono mt-1">
                {(generalMetrics.coberturaInmediata * 100).toFixed(1)}% solvencia actual
              </div>
            </div>

            {/* 10. Saldo Cierre Proyectado */}
            <div className="bg-surface-container-low/50 border border-white/5 p-4 rounded-2xl">
              <span className="text-[10px] font-mono text-on-surface-variant uppercase block">10. Caja Cierre Dic</span>
              <div className="text-lg font-black text-white mt-1">
                {formatMillions(generalMetrics.saldoCierreProyectado)}
              </div>
              <div className="text-[10px] text-on-surface-variant font-mono mt-1">Escenario {filters.scenario}</div>
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

          {/* TREASURY CONCENTRATION & RECOMMENDATIONS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-1 bg-surface-container-low/40 border border-white/5 p-6 rounded-3xl space-y-3">
              <div className="flex items-center gap-2">
                <Landmark size={18} className="text-[#FFCC29]" />
                <h3 className="text-sm font-bold text-white uppercase font-mono">Estructura de Tesorería</h3>
              </div>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                {diagnosis.treasuryDiagnosis}
              </p>
              <div className="pt-2 border-t border-white/5 space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Itaú Corpbanca (50,4%):</span>
                  <span className="text-white font-bold">$ 72.813 M</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Banco de Bogotá (21,4%):</span>
                  <span className="text-white font-bold">$ 30.991 M</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Credicorp Capital (11,8%):</span>
                  <span className="text-white font-bold">$ 17.019 M</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Banco de Occidente (9,3%):</span>
                  <span className="text-white font-bold">$ 13.488 M</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 bg-surface-container-low/40 border border-white/5 p-6 rounded-3xl space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-emerald-400" />
                <h3 className="text-sm font-bold text-white uppercase font-mono">
                  Directrices y Recomendaciones de Gestión Financiera
                </h3>
              </div>
              <ul className="space-y-2.5 text-xs text-on-surface-variant">
                {diagnosis.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#FFCC29]/20 text-[#FFCC29] text-[10px] font-mono flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ANÁLISIS DE INGRESOS */}
      {activeTab === 'ingresos' && (
        <div className="space-y-6">
          {/* Metrics summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-surface-container-low/50 border border-white/5 p-4 rounded-2xl">
              <span className="text-[10px] font-mono text-on-surface-variant uppercase block">Aforo Total</span>
              <div className="text-lg font-black text-white mt-1">{formatCOP(generalMetrics.aforoTotal)}</div>
            </div>
            <div className="bg-surface-container-low/50 border border-white/5 p-4 rounded-2xl">
              <span className="text-[10px] font-mono text-on-surface-variant uppercase block">Recaudo Efectivo</span>
              <div className="text-lg font-black text-emerald-400 mt-1">{formatCOP(generalMetrics.recaudoTotal)}</div>
            </div>
            <div className="bg-surface-container-low/50 border border-white/5 p-4 rounded-2xl">
              <span className="text-[10px] font-mono text-on-surface-variant uppercase block">Saldo Pendiente</span>
              <div className="text-lg font-black text-amber-400 mt-1">
                {formatCOP(generalMetrics.saldoPendienteRecaudo)}
              </div>
            </div>
            <div className="bg-surface-container-low/50 border border-white/5 p-4 rounded-2xl">
              <span className="text-[10px] font-mono text-on-surface-variant uppercase block">Proyección Diciembre</span>
              <div className="text-lg font-black text-[#FFCC29] mt-1">
                {formatCOP(generalMetrics.recaudoEsperadoDiciembre)}
              </div>
            </div>
          </div>

          {/* Charts: Aforo vs Recaudo by Resource */}
          <div className="bg-surface-container-low/40 border border-white/5 p-6 rounded-3xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white font-mono uppercase">
                Aforo vs Recaudo por Recurso Presupuestal
              </h3>
              <span className="text-xs font-mono text-on-surface-variant">Valores en Millones de COP</span>
            </div>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={filteredIncomes.slice(0, 12).map((i) => ({
                    name: i.codigoRecurso || i.recurso.substring(0, 15),
                    aforo: Math.round(i.valorAforo / 1e6),
                    recaudo: Math.round(i.totalRecaudo / 1e6),
                  }))}
                  margin={{ top: 10, right: 10, left: 0, bottom: 30 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                  <XAxis dataKey="name" stroke="#888888" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" />
                  <YAxis stroke="#888888" tick={{ fontSize: 10 }} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', borderRadius: '12px' }}
                    formatter={(val: any) => [`$ ${Number(val).toLocaleString('es-CO')} M`, '']}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="aforo" name="Aforo" fill="#ffffff20" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="recaudo" name="Recaudo Efectivo" fill="#FFCC29" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Table of Incomes */}
          <div className="bg-surface-container-low/40 border border-white/5 p-6 rounded-3xl space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Search size={16} className="text-on-surface-variant" />
                <input
                  type="text"
                  placeholder="Buscar recurso o concepto..."
                  value={searchIncome}
                  onChange={(e) => setSearchIncome(e.target.value)}
                  className="bg-black/50 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-gray-500 w-64 focus:outline-none focus:border-[#FFCC29]"
                />
              </div>
              <button
                onClick={() => exportToCSV(filteredIncomes, 'Ingresos_UPTC_Caja_Hoy')}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 text-xs font-mono"
              >
                <Download size={14} />
                Exportar Ingresos (CSV)
              </button>
            </div>

            <div className="overflow-x-auto max-h-[450px] scrollbar-thin">
              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead className="sticky top-0 bg-zinc-900 border-b border-white/10 text-on-surface-variant text-[11px]">
                  <tr>
                    <th className="p-3">Recurso</th>
                    <th className="p-3">Concepto</th>
                    <th className="p-3">Tipo</th>
                    <th className="p-3 text-right">Aforo</th>
                    <th className="p-3 text-right">Recaudo</th>
                    <th className="p-3 text-right">Saldo Pend.</th>
                    <th className="p-3 text-right">% Recaudo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredIncomes
                    .filter(
                      (i) =>
                        i.recurso.toLowerCase().includes(searchIncome.toLowerCase()) ||
                        i.concepto.toLowerCase().includes(searchIncome.toLowerCase())
                    )
                    .map((item, idx) => (
                      <tr key={idx} className="hover:bg-white/5 transition-colors">
                        <td className="p-3 font-bold text-white">{item.recurso}</td>
                        <td className="p-3 text-on-surface-variant max-w-xs truncate" title={item.concepto}>
                          {item.concepto}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] ${
                              item.tipoRecurso === 'Recursos Administración'
                                ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                                : 'bg-sky-500/10 text-sky-300 border border-sky-500/20'
                            }`}
                          >
                            {item.tipoRecurso === 'Recursos Administración' ? 'Admin' : 'Inversión'}
                          </span>
                        </td>
                        <td className="p-3 text-right text-white">{formatCOP(item.valorAforo)}</td>
                        <td className="p-3 text-right text-emerald-400 font-bold">{formatCOP(item.totalRecaudo)}</td>
                        <td className="p-3 text-right text-amber-400">{formatCOP(item.saldoPendiente)}</td>
                        <td className="p-3 text-right">
                          <span
                            className={`font-bold ${
                              item.porcentajeRecaudo >= 90
                                ? 'text-emerald-400'
                                : item.porcentajeRecaudo >= 70
                                ? 'text-amber-400'
                                : 'text-rose-400'
                            }`}
                          >
                            {item.porcentajeRecaudo.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: GASTOS & COMPROMISOS */}
      {activeTab === 'gastos' && (
        <div className="space-y-6">
          {/* Summary metrics */}
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
                <p className="text-xs text-on-surface-variant">Concentración y nivel de exposición financiera</p>
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

      {/* TAB 4: ESTADO DE BANCOS */}
      {activeTab === 'bancos' && (
        <div className="space-y-6">
          {/* Summary metrics */}
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

          {/* Bank Distribution Chart */}
          <div className="bg-surface-container-low/40 border border-white/5 p-6 rounded-3xl space-y-4">
            <h3 className="text-sm font-bold text-white font-mono uppercase">
              Participación de Saldos por Entidad Financiera
            </h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={bankOptions.map((bName) => {
                    const sum = filteredBanks.filter((b) => b.banco === bName).reduce((s, b) => s + b.valorFinal, 0);
                    return {
                      name: bName.length > 20 ? bName.substring(0, 18) + '...' : bName,
                      fullName: bName,
                      saldo: Math.round(sum / 1e6),
                    };
                  })}
                  margin={{ top: 10, right: 10, left: 0, bottom: 40 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                  <XAxis dataKey="name" stroke="#888888" tick={{ fontSize: 9 }} angle={-25} textAnchor="end" />
                  <YAxis stroke="#888888" tick={{ fontSize: 10 }} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', borderRadius: '12px' }}
                    formatter={(val: any) => [`$ ${Number(val).toLocaleString('es-CO')} M`, 'Saldo Total']}
                  />
                  <Bar dataKey="saldo" fill="#FFCC29" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
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
                    <th className="p-3">Banco</th>
                    <th className="p-3">No. Cuenta</th>
                    <th className="p-3">Nombre de Cuenta</th>
                    <th className="p-3">Destino</th>
                    <th className="p-3 text-right">Saldo Inicial</th>
                    <th className="p-3 text-right">Ingresos</th>
                    <th className="p-3 text-right">Egresos</th>
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
                        <td className="p-3 text-gray-300 max-w-xs truncate" title={acc.nombreCuenta}>
                          {acc.nombreCuenta}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] ${
                              acc.destino.toLowerCase().includes('funcionamiento')
                                ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                                : acc.destino.toLowerCase().includes('inversión') || acc.destino.toLowerCase().includes('inversion')
                                ? 'bg-sky-500/10 text-sky-300 border border-sky-500/20'
                                : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                            }`}
                          >
                            {acc.destino}
                          </span>
                        </td>
                        <td className="p-3 text-right text-gray-400">{formatCOP(acc.valorInicial)}</td>
                        <td className="p-3 text-right text-emerald-400">{formatCOP(acc.valorIngreso)}</td>
                        <td className="p-3 text-right text-rose-400">{formatCOP(acc.valorEgreso)}</td>
                        <td className="p-3 text-right font-bold text-[#FFCC29]">{formatCOP(acc.valorFinal)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: FLUJO DE CAJA INTEGRAL */}
      {activeTab === 'flujo' && (
        <div className="space-y-6">
          {/* Sub-selector for Flujo */}
          <div className="flex gap-2">
            {[
              { id: 'consolidado', label: 'Flujo Consolidado Institucional' },
              { id: 'administracion', label: 'Flujo Recursos de Administración' },
              { id: 'inversion', label: 'Flujo Recursos de Inversión' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFlowTab(f.id as any)}
                className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                  flowTab === f.id
                    ? 'bg-[#FFCC29] text-black shadow-lg'
                    : 'bg-surface-container-low/40 text-on-surface-variant hover:text-white border border-white/5'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Integrated Cash Flow Statement Card */}
          {(() => {
            const currentM =
              flowTab === 'consolidado'
                ? generalMetrics
                : flowTab === 'administracion'
                ? adminMetrics
                : invMetrics;

            return (
              <div className="bg-surface-container-low/40 border border-white/5 p-6 rounded-3xl space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/5 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-white uppercase font-mono">
                      Estructura Financiera del Flujo de Efectivo – Corte 23 Noviembre a Cierre 2026
                    </h3>
                    <p className="text-xs text-on-surface-variant">
                      {flowTab === 'consolidado'
                        ? 'Consolidación Total Institucional (Administración + Inversión)'
                        : flowTab === 'administracion'
                        ? 'Recursos de Funcionamiento y Operación'
                        : 'Recursos con Destinación Específica para Inversión'}
                    </p>
                  </div>
                  <span className="text-xs font-mono text-[#FFCC29] font-bold bg-[#FFCC29]/10 px-3 py-1 rounded-xl border border-[#FFCC29]/30 mt-2 sm:mt-0">
                    Escenario: {filters.scenario.toUpperCase()}
                  </span>
                </div>

                {/* Cash Flow Mathematical Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  <div className="space-y-3 font-mono text-xs">
                    <div className="flex justify-between items-center p-3 rounded-xl bg-black/40 border border-white/5">
                      <span className="text-white font-bold">Saldo Bancario Inicial (01/01/2026):</span>
                      <span className="text-gray-300 font-bold">{formatCOP(currentM.saldoBancosInicial)}</span>
                    </div>

                    <div className="flex justify-between items-center p-3 rounded-xl bg-black/40 border border-white/5">
                      <span className="text-[#FFCC29] font-bold">(=) Saldo Bancario Disponible Hoy (23/11/2026):</span>
                      <span className="text-[#FFCC29] font-bold text-sm">{formatCOP(currentM.saldoBancosTotal)}</span>
                    </div>

                    <div className="flex justify-between items-center p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                      <span className="text-emerald-400 font-bold">(+) Recaudo Esperado a Diciembre (Proyectado):</span>
                      <span className="text-emerald-400 font-bold">+{formatCOP(currentM.recaudoEsperadoDiciembre)}</span>
                    </div>

                    <div className="flex justify-between items-center p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                      <span className="text-rose-400 font-bold">(-) Pagos Estimados de Cierre (Proyectados):</span>
                      <span className="text-rose-400 font-bold">-{formatCOP(currentM.pagosEsperadosDiciembre)}</span>
                    </div>

                    <div className="flex justify-between items-center p-4 rounded-xl bg-white/10 border border-white/20 shadow-lg">
                      <span className="text-white font-black text-sm uppercase">(=) Saldo Final de Caja Proyectado:</span>
                      <span className="text-emerald-400 font-black text-base">
                        {formatCOP(currentM.saldoCierreProyectado)}
                      </span>
                    </div>
                  </div>

                  {/* Liquidity Ratios Box */}
                  <div className="bg-black/30 border border-white/5 p-6 rounded-2xl space-y-4">
                    <h4 className="text-xs font-mono font-bold text-on-surface-variant uppercase tracking-wider">
                      Indicadores Clave de Liquidez y Tesorería
                    </h4>
                    <div className="space-y-3 font-mono text-xs">
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-gray-400">Cobertura Inmediata de Compromisos:</span>
                          <span className="text-emerald-400 font-bold">
                            {(currentM.coberturaInmediata * 100).toFixed(1)}% ({currentM.coberturaInmediata.toFixed(2)}x)
                          </span>
                        </div>
                        <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-400 h-full rounded-full"
                            style={{ width: `${Math.min(currentM.coberturaInmediata * 50, 100)}%` }}
                          ></div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-white/5">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Margen de Holgura Inmediata:</span>
                          <span className="text-[#FFCC29] font-bold">
                            {formatCOP(currentM.margenHolguraInmediata)}
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-white/5">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Compromisos Exigibles por Pagar:</span>
                          <span className="text-amber-400 font-bold">{formatCOP(currentM.saldoPorPagar)}</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-white/5">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Presión sobre Caja Disponible:</span>
                          <span className="text-white font-bold">
                            {currentM.saldoBancosTotal > 0
                              ? ((currentM.saldoPorPagar / currentM.saldoBancosTotal) * 100).toFixed(1)
                              : 0}
                            %
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* TAB 6: AUDITORÍA Y CALIDAD DE DATOS */}
      {activeTab === 'auditoria' && (
        <div className="space-y-6">
          <div className="border-b border-white/5 pb-2">
            <h3 className="text-base font-bold text-white font-mono uppercase">
              Módulo de Auditoría, Trazabilidad e Integridad de Datos
            </h3>
            <p className="text-xs text-on-surface-variant">
              Validación cruzada entre extractos de bancos, aforo de ingresos y apropiación presupuestal de gastos
            </p>
          </div>

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

      {/* TAB 7: REPORTES Y EXPORTACIÓN */}
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
                  <p className="text-[11px] font-mono text-[#FFCC29]">INFORME GERENCIAL DE CAJA, TESORERÍA Y LIQUIDEZ INSTITUCIONAL</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#FFCC29] text-black font-mono font-bold text-xs rounded-xl shadow-lg hover:bg-[#FFCC29]/90"
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
                  cuentas bancarias de <strong>{formatCOP(generalMetrics.saldoBancosTotal)}</strong> ({generalMetrics.totalCuentas} cuentas
                  activas en 10 entidades financieras). Dicha disponibilidad respalda plenamente los compromisos presupuestales
                  pendientes de pago por <strong>{formatCOP(generalMetrics.saldoPorPagar)}</strong>, lo que representa un índice
                  de cobertura inmediata del <strong>{(generalMetrics.coberturaInmediata * 100).toFixed(1)}%</strong> y un margen
                  de superávit de <strong>{formatCOP(generalMetrics.margenHolguraInmediata)}</strong>.
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

              <div className="bg-black/30 p-4 rounded-xl border border-white/5 space-y-3">
                <h4 className="font-bold text-white font-mono uppercase text-sm">4. EXPORTACIÓN DE BASES DE DATOS</h4>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => exportToCSV(filteredBanks, 'Cuentas_Bancarias_UPTC')}
                    className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-white font-mono text-[11px] border border-white/10"
                  >
                    <Download size={13} />
                    Exportar Bancos (CSV)
                  </button>
                  <button
                    onClick={() => exportToCSV(filteredIncomes, 'Ingresos_UPTC')}
                    className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-white font-mono text-[11px] border border-white/10"
                  >
                    <Download size={13} />
                    Exportar Ingresos (CSV)
                  </button>
                  <button
                    onClick={() => exportToCSV(filteredExpenses, 'Gastos_UPTC')}
                    className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-white font-mono text-[11px] border border-white/10"
                  >
                    <Download size={13} />
                    Exportar Gastos (CSV)
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
