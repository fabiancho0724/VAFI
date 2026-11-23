import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  FileSpreadsheet,
  Download,
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  FileCheck,
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
  Info,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  loadCajaHoyDatasets,
  calculateConciliacionPresupuestoTesoral,
  calculateProyeccionesDiciembreAvanzadas,
  IngresoAdicionalProyectado,
  Rubro211Proyeccion,
  ProyeccionDiciembreAvanzadaResult,
  ConciliacionPresupuestoTesoralResult,
  ConciliacionRecursoItem,
  ConciliacionUnidadItem,
  ConciliacionCentralRow,
  ConciliacionIntegralRow,
  EscenarioConciliacion,
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
    'ejecutivo' | 'conciliacion' | 'mensual' | 'gastos' | 'bancos' | 'diciembre' | 'equilibrio' | 'auditoria' | 'reportes'
  >('ejecutivo');

  // Tabs horizontal scroll navigation
  const tabsNavRef = useRef<HTMLDivElement>(null);
  const [tabsScrollProgress, setTabsScrollProgress] = useState<number>(0);
  const [canScrollLeft, setCanScrollLeft] = useState<boolean>(false);
  const [canScrollRight, setCanScrollRight] = useState<boolean>(true);

  const updateTabsScrollState = () => {
    if (!tabsNavRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = tabsNavRef.current;
    const maxScroll = scrollWidth - clientWidth;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft < maxScroll - 4);
    if (maxScroll > 0) {
      setTabsScrollProgress(Math.min(100, Math.max(0, (scrollLeft / maxScroll) * 100)));
    } else {
      setTabsScrollProgress(0);
    }
  };

  const handleScrollTabs = (direction: 'left' | 'right') => {
    if (!tabsNavRef.current) return;
    const scrollAmount = 280;
    tabsNavRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  const handleSliderScroll = (percentage: number) => {
    if (!tabsNavRef.current) return;
    const { scrollWidth, clientWidth } = tabsNavRef.current;
    const maxScroll = scrollWidth - clientWidth;
    tabsNavRef.current.scrollLeft = (percentage / 100) * maxScroll;
    setTabsScrollProgress(percentage);
  };

  const selectTab = (tabId: typeof activeTab) => {
    setActiveTab(tabId);
    setTimeout(() => {
      const activeEl = document.getElementById(`tab-btn-${tabId}`);
      if (activeEl && tabsNavRef.current) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
      updateTabsScrollState();
    }, 60);
  };

  useEffect(() => {
    updateTabsScrollState();
    const handleResize = () => updateTabsScrollState();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Conciliación filters state
  const [searchConcilRecurso, setSearchConcilRecurso] = useState('');
  const [searchConcilUnidad, setSearchConcilUnidad] = useState('');
  const [filterConcilEscenario, setFilterConcilEscenario] = useState<'TODOS' | 'A' | 'B' | 'C' | 'D'>('TODOS');
  const [filterConcilTipo, setFilterConcilTipo] = useState<'Todos' | 'Administración' | 'Inversión'>('Todos');
  const [activeConcilChart, setActiveConcilChart] = useState<'g1' | 'g2' | 'g3' | 'g4' | 'g5' | 'g6' | 'g7'>('g1');

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
  const [simExpensePaymentRate, setSimExpensePaymentRate] = useState<number>(0.75);
  const [simExtraIncome, setSimExtraIncome] = useState<number>(0);
  const [simExtraExpense, setSimExtraExpense] = useState<number>(0);
  const [simCustomBankBalance, setSimCustomBankBalance] = useState<number>(144563470673.35);
  const [simResourceScope, setSimResourceScope] = useState<'Todos' | 'Administración' | 'Inversión'>('Todos');

  // Requerimiento 1: Nómina de Diciembre en Rubro 2.1.1 (Gastos de Personal)
  const [simNominaDiciembre211, setSimNominaDiciembre211] = useState<number>(28500000000);

  // Requerimiento 2: Apartado Independiente de Ingresos Adicionales Proyectados
  const [simIngresosAdicionales, setSimIngresosAdicionales] = useState<IngresoAdicionalProyectado[]>([
    {
      id: 'ing-1',
      concepto: 'Giro MEN – Saldo Pendiente Política de Gratuidad (Recurso 10.5)',
      valor: 9500000000,
      recurso: '10.5',
      tipo: 'Inversión',
      naturaleza: 'Destinación Específica',
      observaciones: 'Transferencia programada cierre de vigencia Ministerio de Educación',
    },
    {
      id: 'ing-2',
      concepto: 'Recaudo Extraordinario Matrículas Posgrados y Extensión',
      valor: 2500000000,
      recurso: '20',
      tipo: 'Administración',
      naturaleza: 'Libre Destinación',
      observaciones: 'Cierre de ciclo académico y legalizaciones de matrícula extemporánea',
    },
  ]);

  const [showAddIncomeForm, setShowAddIncomeForm] = useState(false);
  const [editingIncomeId, setEditingIncomeId] = useState<string | null>(null);
  const [incomeForm, setIncomeForm] = useState<{
    concepto: string;
    valor: number;
    recurso: string;
    tipo: 'Administración' | 'Inversión';
    naturaleza: 'Libre Destinación' | 'Destinación Específica';
    observaciones: string;
  }>({
    concepto: '',
    valor: 0,
    recurso: '20',
    tipo: 'Administración',
    naturaleza: 'Libre Destinación',
    observaciones: '',
  });

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

    const totalIngresosAdicionales = simIngresosAdicionales
      .filter((i) => {
        if (simResourceScope === 'Todos') return true;
        return i.tipo === simResourceScope;
      })
      .reduce((s, i) => s + i.valor, 0);

    const nominaAfectada = simResourceScope === 'Inversión' ? 0 : simNominaDiciembre211;

    const recaudoEsperadoDic = pendiente * simIncomeComplianceRate + totalIngresosAdicionales + simExtraIncome;
    const pagosEsperadosDic = xPagar * simExpensePaymentRate + nominaAfectada + simExtraExpense;

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
    simIngresosAdicionales,
    simNominaDiciembre211,
  ]);

  // Financial equilibrium
  const equilibrioResult = useMemo(() => {
    const pendAdm = incomes.filter((i) => i.tipoRecurso === 'Recursos Administración').reduce((s, i) => s + (i.saldoPendiente > 0 ? i.saldoPendiente : 0), 0);
    const pendInv = incomes.filter((i) => i.tipoRecurso === 'Recursos Inversión').reduce((s, i) => s + (i.saldoPendiente > 0 ? i.saldoPendiente : 0), 0);
    const extraAdm = simIngresosAdicionales.filter((i) => i.tipo === 'Administración').reduce((s, i) => s + i.valor, 0);
    const extraInv = simIngresosAdicionales.filter((i) => i.tipo === 'Inversión').reduce((s, i) => s + i.valor, 0);

    const xPagAdm = expenses.filter((e) => e.tipoRecurso === 'Recursos Administración').reduce((s, e) => s + (e.acumuladoCompromiso - e.acumuladoPago), 0);
    const xPagInv = expenses.filter((e) => e.tipoRecurso === 'Recursos Inversión').reduce((s, e) => s + (e.acumuladoCompromiso - e.acumuladoPago), 0);

    const recProjAdm = pendAdm * simIncomeComplianceRate + extraAdm;
    const recProjInv = pendInv * simIncomeComplianceRate + extraInv;
    const pagProjAdm = xPagAdm * simExpensePaymentRate + simNominaDiciembre211;
    const pagProjInv = xPagInv * simExpensePaymentRate;

    return calculateEquilibrioFinanciero(incomes, expenses, banks, {
      recaudoEsperadoDiciembre: recProjAdm + recProjInv,
      pagosEsperadosDiciembre: pagProjAdm + pagProjInv,
      recaudoEsperadoAdmin: recProjAdm,
      recaudoEsperadoInv: recProjInv,
      pagosEsperadosAdmin: pagProjAdm,
      pagosEsperadosInv: pagProjInv,
    });
  }, [
    incomes,
    expenses,
    banks,
    simIncomeComplianceRate,
    simExpensePaymentRate,
    simIngresosAdicionales,
    simNominaDiciembre211,
  ]);

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

  // Conciliación Presupuesto vs Tesorería Engine Data
  const conciliacionData: ConciliacionPresupuestoTesoralResult = useMemo(() => {
    return calculateConciliacionPresupuestoTesoral(incomes, expenses, banks, filters.useStrictRule3A);
  }, [incomes, expenses, banks, filters.useStrictRule3A]);

  // Proyecciones Avanzadas de Diciembre (Nómina 2.1.1 + Ingresos Adicionales)
  const proyeccionDiciembre = useMemo(() => {
    return calculateProyeccionesDiciembreAvanzadas(
      incomes,
      expenses,
      banks,
      simNominaDiciembre211,
      simIngresosAdicionales,
      simIncomeComplianceRate,
      simExpensePaymentRate,
      simResourceScope,
      filters.useStrictRule3A
    );
  }, [
    incomes,
    expenses,
    banks,
    simNominaDiciembre211,
    simIngresosAdicionales,
    simIncomeComplianceRate,
    simExpensePaymentRate,
    simResourceScope,
    filters.useStrictRule3A,
  ]);

  // Handlers para el CRUD de Ingresos Adicionales Proyectados
  const handleSaveIncome = () => {
    if (!incomeForm.concepto.trim() || incomeForm.valor <= 0) return;

    if (editingIncomeId) {
      setSimIngresosAdicionales((prev) =>
        prev.map((item) =>
          item.id === editingIncomeId
            ? { ...item, ...incomeForm }
            : item
        )
      );
      setEditingIncomeId(null);
    } else {
      const newItem: IngresoAdicionalProyectado = {
        id: `ing-${Date.now()}`,
        ...incomeForm,
      };
      setSimIngresosAdicionales((prev) => [...prev, newItem]);
    }

    setIncomeForm({
      concepto: '',
      valor: 0,
      recurso: '20',
      tipo: 'Administración',
      naturaleza: 'Libre Destinación',
      observaciones: '',
    });
    setShowAddIncomeForm(false);
  };

  const handleEditIncome = (item: IngresoAdicionalProyectado) => {
    setEditingIncomeId(item.id);
    setIncomeForm({
      concepto: item.concepto,
      valor: item.valor,
      recurso: item.recurso,
      tipo: item.tipo,
      naturaleza: item.naturaleza,
      observaciones: item.observaciones || '',
    });
    setShowAddIncomeForm(true);
  };

  const handleDeleteIncome = (id: string) => {
    setSimIngresosAdicionales((prev) => prev.filter((item) => item.id !== id));
  };

  // Preset Scenario Handlers for Simulator
  const applyScenarioPreset = (sc: ScenarioType) => {
    const cfg = SCENARIO_DEFAULTS[sc];
    setSimIncomeComplianceRate(cfg.incomeComplianceRate);
    setSimExpensePaymentRate(cfg.expensePaymentRate);
    setFilters({ ...filters, scenario: sc });
  };

  const resetSimulation = () => {
    setSimIncomeComplianceRate(0.65);
    setSimExpensePaymentRate(0.75);
    setSimResourceScope('Todos');
    setSimNominaDiciembre211(28500000000);
    setSimIngresosAdicionales([
      {
        id: 'ing-1',
        concepto: 'Giro MEN – Saldo Pendiente Política de Gratuidad (Recurso 10.5)',
        valor: 9500000000,
        recurso: '10.5',
        tipo: 'Inversión',
        naturaleza: 'Destinación Específica',
        observaciones: 'Transferencia programada cierre de vigencia Ministerio de Educación',
      },
      {
        id: 'ing-2',
        concepto: 'Recaudo Extraordinario Matrículas Posgrados y Extensión',
        valor: 2500000000,
        recurso: '20',
        tipo: 'Administración',
        naturaleza: 'Libre Destinación',
        observaciones: 'Cierre de ciclo académico y legalizaciones de matrícula extemporánea',
      },
    ]);
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

      {/* 9 SUBTABS NAVIGATION BAR CON BARRA DE DESPLAZAMIENTO HORIZONTAL Y CONTROLES */}
      <div className="space-y-2 border-b border-white/10 pb-3">
        {/* Fila principal de navegación con botones laterales */}
        <div className="flex items-center gap-2">
          {/* Botón Scroll Izquierda */}
          <button
            type="button"
            onClick={() => handleScrollTabs('left')}
            disabled={!canScrollLeft}
            className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex-shrink-0 ${
              canScrollLeft
                ? 'bg-white/10 hover:bg-[#FFCC29] hover:text-black text-white border-white/20 shadow-md active:scale-95'
                : 'bg-white/5 text-gray-600 border-white/5 cursor-not-allowed opacity-30'
            }`}
            title="Desplazar pestañas hacia la izquierda"
            aria-label="Desplazar pestañas a la izquierda"
          >
            <ChevronLeft size={16} />
          </button>

          {/* Contenedor desplazable de pestañas con barra de desplazamiento visible estilizada */}
          <div
            ref={tabsNavRef}
            onScroll={updateTabsScrollState}
            className="flex-1 flex overflow-x-auto gap-2 py-1.5 horizontal-scrollbar"
          >
            {[
              { id: 'ejecutivo', label: '1. Control Ejecutivo', icon: Award },
              { id: 'conciliacion', label: '2. Conciliación Presupuesto vs Tesorería', icon: Scale },
              { id: 'mensual', label: '3. Ingresos Mensuales', icon: TrendingUp },
              { id: 'gastos', label: '4. Gastos & Compromisos', icon: TrendingDown },
              { id: 'bancos', label: '5. Estado de Bancos', icon: Landmark },
              { id: 'diciembre', label: '6. Proyecciones de Diciembre', icon: Sliders },
              { id: 'equilibrio', label: '7. Equilibrio Presupuestal', icon: DollarSign },
              { id: 'auditoria', label: '8. Validación de Cifras', icon: ShieldCheck },
              { id: 'reportes', label: '9. Reporte y Exportación', icon: FileText },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  id={`tab-btn-${tab.id}`}
                  key={tab.id}
                  onClick={() => selectTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-mono font-bold whitespace-nowrap transition-all cursor-pointer flex-shrink-0 ${
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

          {/* Botón Scroll Derecha */}
          <button
            type="button"
            onClick={() => handleScrollTabs('right')}
            disabled={!canScrollRight}
            className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex-shrink-0 ${
              canScrollRight
                ? 'bg-white/10 hover:bg-[#FFCC29] hover:text-black text-white border-white/20 shadow-md active:scale-95'
                : 'bg-white/5 text-gray-600 border-white/5 cursor-not-allowed opacity-30'
            }`}
            title="Desplazar pestañas hacia la derecha"
            aria-label="Desplazar pestañas a la derecha"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Barra interactiva inferior de desplazamiento horizontal */}
        <div className="flex items-center justify-between gap-3 px-3 py-1.5 bg-black/40 rounded-xl border border-white/5">
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-gray-400">
            <span className="w-2 h-2 rounded-full bg-[#FFCC29] inline-block animate-pulse"></span>
            <span className="text-gray-300 font-semibold">Barra de desplazamiento horizontal:</span>
            <span className="text-gray-500 hidden sm:inline">(desliza para navegar las 9 pestañas)</span>
          </div>

          <div className="flex-1 max-w-md mx-2 flex items-center">
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={tabsScrollProgress}
              onChange={(e) => handleSliderScroll(Number(e.target.value))}
              aria-label="Barra de desplazamiento horizontal de pestañas"
              className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-ew-resize accent-[#FFCC29] hover:bg-white/20 transition-all focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5 text-[11px] font-mono">
            <span className="text-[#FFCC29] font-bold">{Math.round(tabsScrollProgress)}%</span>
            <span className="text-gray-500 text-[10px]">avance</span>
          </div>
        </div>
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

      {/* SUBTAB 2: CONCILIACIÓN PRESUPUESTAL Y TESORAL */}
      {activeTab === 'conciliacion' && (
        <div className="space-y-8">
          {/* Section Header & CSV Exports */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-gradient-to-r from-surface-container-high via-surface-container to-surface-container-low border border-white/10 p-6 rounded-3xl backdrop-blur-xl relative overflow-hidden">
            <div className="space-y-1 z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFCC29]/10 text-[#FFCC29] text-xs font-mono font-bold">
                <Scale size={14} />
                SISTEMA INTELIGENTE DE CONCILIACIÓN FINANCIERA – UPTC 2026
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Conciliación entre Ejecución Presupuestal y Disponibilidad Tesoral
              </h2>
              <p className="text-xs sm:text-sm text-on-surface-variant max-w-3xl leading-relaxed">
                Correspondencia oficial entre los recursos disponibles en el presupuesto ($ 128.286M COP) y los recursos líquidos efectivamente disponibles en tesorería ($ 144.563M COP), identificando restricciones, compromisos exigibles, brechas de liquidez y capacidad real de pago.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 z-10">
              <button
                onClick={() =>
                  exportToCSV(
                    conciliacionData.matrizIntegral.map((m) => ({
                      Variable: m.variable,
                      Administración: m.administracion,
                      Inversión: m.inversion,
                      Total: m.total,
                    })),
                    'UPTC_Matriz_Integral_Conciliacion'
                  )
                }
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-mono border border-white/10 transition-colors cursor-pointer"
              >
                <Download size={14} className="text-[#FFCC29]" />
                Matriz Integral (CSV)
              </button>
              <button
                onClick={() =>
                  exportToCSV(
                    conciliacionData.recursos.map((r) => ({
                      Código: r.codigo,
                      Recurso: r.nombre,
                      Tipo: r.tipo,
                      Apropiación: r.apropiacion,
                      Compromisos: r.compromisos,
                      Pagos: r.pagos,
                      'Disponible Presupuesto': r.disponiblePresupuestal,
                      'Saldo Bancos': r.saldoBancos,
                      'Saldo por Pagar': r.compromisosPendientesPago,
                      'Disponible Tesorería': r.disponibleTesoralEstimado,
                      'Diferencia (Brecha)': r.diferenciaDisponibilidades,
                      'Cobertura (veces)': r.coberturaObligaciones,
                      Escenario: r.escenario,
                    })),
                    'UPTC_Conciliacion_Por_Recurso'
                  )
                }
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-mono border border-white/10 transition-colors cursor-pointer"
              >
                <Download size={14} className="text-emerald-400" />
                Recursos (CSV)
              </button>
              <button
                onClick={() =>
                  exportToCSV(
                    conciliacionData.unidades.map((u) => ({
                      Unidad: u.unidad,
                      Apropiación: u.apropiacion,
                      Compromisos: u.compromisos,
                      Pagos: u.pagos,
                      'Saldo por Pagar': u.saldoPorPagar,
                      'Disponible Presupuestal': u.disponiblePresupuestal,
                      '% Compromiso': u.porcentajeCompromiso,
                      '% Pago': u.porcentajePago,
                    })),
                    'UPTC_Conciliacion_Por_Unidad'
                  )
                }
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-mono border border-white/10 transition-colors cursor-pointer"
              >
                <Download size={14} className="text-sky-400" />
                Unidades (CSV)
              </button>
            </div>
          </div>

          {/* 6 Core KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-surface-container-low/60 border border-white/5 p-4 rounded-2xl flex flex-col justify-between">
              <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider block">
                1. Disp. Presupuestal
              </span>
              <div className="my-1.5">
                <span className="text-lg lg:text-xl font-black text-amber-400 font-mono block">
                  {formatMillions(conciliacionData.totales.disponiblePresupuestal)}
                </span>
                <span className="text-[10px] text-on-surface-variant/80 font-mono">
                  $ 128.286M COP por comprometer
                </span>
              </div>
              <span className="text-[9px] text-emerald-400 font-mono">
                77,73% ya comprometido
              </span>
            </div>

            <div className="bg-surface-container-low/60 border border-white/5 p-4 rounded-2xl flex flex-col justify-between">
              <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider block">
                2. Saldo Bancos Conciliado
              </span>
              <div className="my-1.5">
                <span className="text-lg lg:text-xl font-black text-emerald-400 font-mono block">
                  {formatMillions(conciliacionData.totales.saldoBancosConciliado)}
                </span>
                <span className="text-[10px] text-on-surface-variant/80 font-mono">
                  $ 144.563M en 85 cuentas
                </span>
              </div>
              <span className="text-[9px] text-sky-400 font-mono">
                Coincidencia exacta con ref.
              </span>
            </div>

            <div className="bg-surface-container-low/60 border border-white/5 p-4 rounded-2xl flex flex-col justify-between">
              <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider block">
                3. Obligaciones / Por Pagar
              </span>
              <div className="my-1.5">
                <span className="text-lg lg:text-xl font-black text-rose-400 font-mono block">
                  {formatMillions(conciliacionData.totales.compromisosPendientesPago)}
                </span>
                <span className="text-[10px] text-on-surface-variant/80 font-mono">
                  $ 61.402M en trámite de giro
                </span>
              </div>
              <span className="text-[9px] text-rose-300 font-mono">
                42,47% del saldo en bancos
              </span>
            </div>

            <div className="bg-surface-container-low/60 border border-white/5 p-4 rounded-2xl flex flex-col justify-between">
              <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider block">
                4. Disp. Tesoral Libre
              </span>
              <div className="my-1.5">
                <span className="text-lg lg:text-xl font-black text-sky-400 font-mono block">
                  {formatMillions(conciliacionData.totales.disponibleTesoralEstimado)}
                </span>
                <span className="text-[10px] text-on-surface-variant/80 font-mono">
                  $ 83.162M caja no comprometida
                </span>
              </div>
              <span className="text-[9px] text-emerald-400 font-mono">
                Superávit de caja disponible
              </span>
            </div>

            <div className="bg-surface-container-low/60 border border-white/5 p-4 rounded-2xl flex flex-col justify-between">
              <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider block">
                5. Brecha Presup. - Tesor.
              </span>
              <div className="my-1.5">
                <span className="text-lg lg:text-xl font-black text-[#FFCC29] font-mono block">
                  {formatMillions(conciliacionData.totales.diferenciaDisponibilidades)}
                </span>
                <span className="text-[10px] text-on-surface-variant/80 font-mono">
                  Presupuesto &gt; Tesorería libre
                </span>
              </div>
              <span className="text-[9px] text-amber-300 font-mono">
                Exige recaudo para girarse
              </span>
            </div>

            <div className="bg-surface-container-low/60 border border-white/5 p-4 rounded-2xl flex flex-col justify-between">
              <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider block">
                6. Cobertura Inmediata
              </span>
              <div className="my-1.5">
                <span className="text-lg lg:text-xl font-black text-emerald-400 font-mono block">
                  {conciliacionData.totales.coberturaObligaciones.toFixed(2)}x
                </span>
                <span className="text-[10px] text-on-surface-variant/80 font-mono">
                  {(conciliacionData.totales.coberturaObligaciones * 100).toFixed(1)}% de respaldo
                </span>
              </div>
              <span className="text-[9px] text-emerald-400 font-mono">
                Solvencia inmediata demostrada
              </span>
            </div>
          </div>

          {/* Conceptual Principle Alert (Numeral 2 Prompt Maestro) */}
          <div className="bg-gradient-to-r from-amber-950/20 via-surface-container-low to-surface-container-low border border-amber-500/20 p-5 rounded-3xl flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="p-3 rounded-2xl bg-[#FFCC29]/10 text-[#FFCC29] shrink-0">
              <AlertCircle size={24} />
            </div>
            <div className="space-y-1 text-xs">
              <h4 className="font-bold text-white uppercase tracking-wider">
                Principio Fundamental de Auditoría: Diferenciación entre Presupuesto y Tesorería
              </h4>
              <p className="text-on-surface-variant leading-relaxed font-light">
                <strong className="text-white">Apropiación disponible NO es efectivo disponible:</strong> La UPTC tiene autorización legal para comprometer $ 128.286M COP adicionales, pero solo cuenta con $ 83.162M COP de caja libre en bancos. Si se expidieran CDP y contratos por el 100% de la apropiación libre sin recaudar los $ 32.213M pendientes de aforo en diciembre, se generaría un descalce financiero diferido. Asimismo, el saldo bancario de $ 144.563M COP incluye $ 48.513M en recursos restringidos (Convenios, Estampillas y Proyectos) que legalmente no pueden subsidiar gastos de funcionamiento corriente.
              </p>
            </div>
          </div>

          {/* Matriz Central de Conciliación & Matriz Integral 11x3 */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Matriz Central (Section 5.1) */}
            <div className="lg:col-span-5 bg-surface-container-low/50 border border-white/5 p-6 rounded-3xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-[#FFCC29]/10 text-[#FFCC29]">
                    <Layers size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Matriz Central de Conciliación</h3>
                    <span className="text-[11px] text-on-surface-variant">Presupuesto frente a Tesorería</span>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-on-surface-variant uppercase text-[10px]">
                      <th className="p-2.5">Concepto</th>
                      <th className="p-2.5 text-right">Presupuesto</th>
                      <th className="p-2.5 text-right">Tesorería</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {conciliacionData.matrizCentral.map((row, idx) => (
                      <tr key={idx} className="hover:bg-white/5 transition-colors">
                        <td className="p-2.5 text-white/90 font-medium">
                          <div className="flex flex-col">
                            <span>{row.concepto}</span>
                            <span className="text-[9px] text-on-surface-variant/70 font-sans">{row.observacion}</span>
                          </div>
                        </td>
                        <td className="p-2.5 text-right text-amber-300 font-bold whitespace-nowrap">
                          {row.presupuesto !== null ? formatCOP(row.presupuesto) : '—'}
                        </td>
                        <td className="p-2.5 text-right text-emerald-300 font-bold whitespace-nowrap">
                          {row.tesoreria !== null ? formatCOP(row.tesoreria) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Matriz Integral 11x3 (Section 13) */}
            <div className="lg:col-span-7 bg-surface-container-low/50 border border-white/5 p-6 rounded-3xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-emerald-400/10 text-emerald-400">
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Matriz Integral de Conciliación (11 Variables)</h3>
                    <span className="text-[11px] text-on-surface-variant">Administración, Inversión y Consolidado Institucional</span>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-[#FFCC29] bg-[#FFCC29]/10 px-2.5 py-1 rounded-full border border-[#FFCC29]/20">
                  Corte: 23 Nov 2026
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-on-surface-variant uppercase text-[10px]">
                      <th className="p-2.5">Variable</th>
                      <th className="p-2.5 text-right">Administración</th>
                      <th className="p-2.5 text-right">Inversión</th>
                      <th className="p-2.5 text-right text-[#FFCC29]">Total Institucional</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {conciliacionData.matrizIntegral.map((row, idx) => (
                      <tr key={idx} className="hover:bg-white/5 transition-colors">
                        <td className="p-2.5 text-white/90 font-medium">
                          {row.variable}
                        </td>
                        <td className="p-2.5 text-right text-sky-300 whitespace-nowrap font-medium">
                          {row.formato === 'moneda'
                            ? formatCOP(row.administracion)
                            : row.formato === 'ratio'
                            ? `${row.administracion.toFixed(2)}x`
                            : `${row.administracion.toFixed(2)}%`}
                        </td>
                        <td className="p-2.5 text-right text-emerald-300 whitespace-nowrap font-medium">
                          {row.formato === 'moneda'
                            ? formatCOP(row.inversion)
                            : row.formato === 'ratio'
                            ? `${row.inversion.toFixed(2)}x`
                            : `${row.inversion.toFixed(2)}%`}
                        </td>
                        <td className="p-2.5 text-right text-[#FFCC29] font-black whitespace-nowrap">
                          {row.formato === 'moneda'
                            ? formatCOP(row.total)
                            : row.formato === 'ratio'
                            ? `${row.total.toFixed(2)}x`
                            : `${row.total.toFixed(2)}%`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* 4 Scenarios Cards (Section 5.2) with Click-to-Filter */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Filter size={16} className="text-[#FFCC29]" />
                Clasificación de Recursos en los 4 Escenarios de Conciliación
              </h3>
              <span className="text-xs text-on-surface-variant">
                Haz clic en una tarjeta para filtrar los recursos detallados
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <button
                onClick={() => setFilterConcilEscenario(filterConcilEscenario === 'A' ? 'TODOS' : 'A')}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                  filterConcilEscenario === 'A'
                    ? 'bg-amber-500/20 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                    : 'bg-surface-container-low/40 border-white/5 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                    Escenario A ({conciliacionData.escenariosCount.escenarioA})
                  </span>
                  <span className="text-xs text-on-surface-variant font-mono">Presupuestal &gt; Tesoral</span>
                </div>
                <h4 className="text-xs font-bold text-white mb-1">Apropiación Libre sin Caja Inmediata</h4>
                <p className="text-[11px] text-on-surface-variant leading-relaxed">
                  Recursos con saldo por comprometer que superan el efectivo disponible. Requieren recaudo previo de aforo en diciembre para girarse.
                </p>
              </button>

              <button
                onClick={() => setFilterConcilEscenario(filterConcilEscenario === 'B' ? 'TODOS' : 'B')}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                  filterConcilEscenario === 'B'
                    ? 'bg-emerald-500/20 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                    : 'bg-surface-container-low/40 border-white/5 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                    Escenario B ({conciliacionData.escenariosCount.escenarioB})
                  </span>
                  <span className="text-xs text-on-surface-variant font-mono">Tesoral &gt; Presupuestal</span>
                </div>
                <h4 className="text-xs font-bold text-white mb-1">Excedentes de Caja o Restricciones</h4>
                <p className="text-[11px] text-on-surface-variant leading-relaxed">
                  Recursos líquidos superiores al saldo de apropiación: Fondos fiduciarios, Recursos del Balance, y Estampillas con reservas.
                </p>
              </button>

              <button
                onClick={() => setFilterConcilEscenario(filterConcilEscenario === 'C' ? 'TODOS' : 'C')}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                  filterConcilEscenario === 'C'
                    ? 'bg-sky-500/20 border-sky-500 shadow-[0_0_20px_rgba(56,189,248,0.2)]'
                    : 'bg-surface-container-low/40 border-white/5 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-bold">
                    Escenario C ({conciliacionData.escenariosCount.escenarioC})
                  </span>
                  <span className="text-xs text-on-surface-variant font-mono">Equilibrado</span>
                </div>
                <h4 className="text-xs font-bold text-white mb-1">Correspondencia Presupuesto - Tesorería</h4>
                <p className="text-[11px] text-on-surface-variant leading-relaxed">
                  Recursos donde la apropiación disponible coincide con el efectivo identificado o se encuentran 100% ejecutados y pagados.
                </p>
              </button>

              <button
                onClick={() => setFilterConcilEscenario(filterConcilEscenario === 'D' ? 'TODOS' : 'D')}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                  filterConcilEscenario === 'D'
                    ? 'bg-rose-500/20 border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.2)]'
                    : 'bg-surface-container-low/40 border-white/5 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold">
                    Escenario D ({conciliacionData.escenariosCount.escenarioD})
                  </span>
                  <span className="text-xs text-on-surface-variant font-mono">Cuentas Concentradoras</span>
                </div>
                <h4 className="text-xs font-bold text-white mb-1">Compromisos con Fondeo Centralizado</h4>
                <p className="text-[11px] text-on-surface-variant leading-relaxed">
                  Fuentes con compromisos por pagar sin cuenta bancaria individual asignada; respaldadas en cuentas de recaudo concentradoras.
                </p>
              </button>
            </div>
          </div>

          {/* 7 Specialized Charts Panel (Section 12) */}
          <div className="bg-surface-container-low/50 border border-white/5 p-6 rounded-3xl space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Activity size={18} className="text-[#FFCC29]" />
                  Dashboard Visual de Conciliación Presupuestal y Tesoral (7 Gráficas Oficiales)
                </h3>
                <span className="text-xs text-on-surface-variant">
                  Visualizaciones interactivas de descalces, cobertura y composición
                </span>
              </div>

              {/* Chart Selector Pills */}
              <div className="flex flex-wrap gap-1 bg-surface-container p-1 rounded-2xl border border-white/5">
                {[
                  { id: 'g1', label: 'G1. Disp. Presup. vs Tesoral' },
                  { id: 'g2', label: 'G2. Ejecución Presupuestal' },
                  { id: 'g3', label: 'G3. Composición Tesoral' },
                  { id: 'g4', label: 'G4. Brechas por Recurso' },
                  { id: 'g5', label: 'G5. Cobertura de Obligaciones' },
                  { id: 'g6', label: 'G6. Admin vs Inversión' },
                  { id: 'g7', label: 'G7. Conciliación Unidades' },
                ].map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setActiveConcilChart(c.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-mono transition-all cursor-pointer ${
                      activeConcilChart === c.id
                        ? 'bg-[#FFCC29] text-black font-bold shadow-md'
                        : 'text-on-surface-variant hover:text-white'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Render Selected Chart */}
            <div className="min-h-[350px]">
              {/* Gráfica 1: Disponible Presupuestal vs. Disponible Tesoral */}
              {activeConcilChart === 'g1' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono text-on-surface-variant">
                    <span>Comparativo por Código de Recurso (Millones COP)</span>
                    <span className="text-amber-300">Presupuesto (Amarillo) vs Tesorería (Verde)</span>
                  </div>
                  <div className="h-[340px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={conciliacionData.recursos
                          .filter((r) => r.disponiblePresupuestal > 0 || r.saldoBancos > 0)
                          .map((r) => ({
                            recurso: `Rec ${r.codigo}`,
                            nombre: r.nombre,
                            'Disponible Presupuesto': Math.round(r.disponiblePresupuestal / 1e6),
                            'Saldo en Bancos': Math.round(r.saldoBancos / 1e6),
                          }))}
                        margin={{ top: 10, right: 20, left: 10, bottom: 40 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <XAxis dataKey="recurso" stroke="#888" fontSize={11} angle={-30} textAnchor="end" />
                        <YAxis stroke="#888" fontSize={11} tickFormatter={(v) => `$${v}M`} />
                        <RechartsTooltip
                          contentStyle={{ backgroundColor: '#18181b', borderColor: '#333', borderRadius: '12px' }}
                          formatter={(value: any) => [`$ ${Number(value).toLocaleString()} M`, '']}
                        />
                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                        <Bar dataKey="Disponible Presupuesto" fill="#FFCC29" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Saldo en Bancos" fill="#10B981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Gráfica 2: Composición de la Ejecución Presupuestal */}
              {activeConcilChart === 'g2' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono text-on-surface-variant">
                    <span>Desglose de la Apropiación Definitiva ($ 576.148M COP)</span>
                    <span>Pagos (Verde) | Por Pagar (Rojo) | Disponible (Amarillo)</span>
                  </div>
                  <div className="h-[340px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          {
                            categoria: 'Administración',
                            'Pagos Realizados': Math.round(conciliacionData.totales.adminPagos / 1e6),
                            'Compromisos por Pagar': Math.round(conciliacionData.totales.adminSaldoPorPagar / 1e6),
                            'Disponible por Comprometer': Math.round(conciliacionData.totales.adminDisponiblePresupuestal / 1e6),
                          },
                          {
                            categoria: 'Inversión',
                            'Pagos Realizados': Math.round(conciliacionData.totales.invPagos / 1e6),
                            'Compromisos por Pagar': Math.round(conciliacionData.totales.invSaldoPorPagar / 1e6),
                            'Disponible por Comprometer': Math.round(conciliacionData.totales.invDisponiblePresupuestal / 1e6),
                          },
                          {
                            categoria: 'Total Institucional',
                            'Pagos Realizados': Math.round(conciliacionData.totales.pagosAcumulados / 1e6),
                            'Compromisos por Pagar': Math.round(conciliacionData.totales.compromisosPendientesPago / 1e6),
                            'Disponible por Comprometer': Math.round(conciliacionData.totales.disponiblePresupuestal / 1e6),
                          },
                        ]}
                        margin={{ top: 10, right: 20, left: 10, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <XAxis dataKey="categoria" stroke="#888" fontSize={12} />
                        <YAxis stroke="#888" fontSize={11} tickFormatter={(v) => `$${v}M`} />
                        <RechartsTooltip
                          contentStyle={{ backgroundColor: '#18181b', borderColor: '#333', borderRadius: '12px' }}
                          formatter={(value: any) => [`$ ${Number(value).toLocaleString()} M`, '']}
                        />
                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                        <Bar dataKey="Pagos Realizados" stackId="a" fill="#10B981" />
                        <Bar dataKey="Compromisos por Pagar" stackId="a" fill="#F43F5E" />
                        <Bar dataKey="Disponible por Comprometer" stackId="a" fill="#FFCC29" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Gráfica 3: Composición de la Disponibilidad Tesoral */}
              {activeConcilChart === 'g3' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono text-on-surface-variant">
                    <span>Afectación del Saldo en Bancos ($ 144.563M COP)</span>
                    <span>Caja Libre de Giro ($ 83.162M) vs Compromisos Radicados Exigibles ($ 61.402M)</span>
                  </div>
                  <div className="h-[340px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          {
                            categoria: 'Administración',
                            'Disponible Tesoral Libre': Math.round(conciliacionData.totales.adminDisponibleTesoral / 1e6),
                            'Compromisos Pendientes': Math.round(conciliacionData.totales.adminSaldoPorPagar / 1e6),
                          },
                          {
                            categoria: 'Inversión',
                            'Disponible Tesoral Libre': Math.round(conciliacionData.totales.invDisponibleTesoral / 1e6),
                            'Compromisos Pendientes': Math.round(conciliacionData.totales.invSaldoPorPagar / 1e6),
                          },
                          {
                            categoria: 'Total UPTC',
                            'Disponible Tesoral Libre': Math.round(conciliacionData.totales.disponibleTesoralEstimado / 1e6),
                            'Compromisos Pendientes': Math.round(conciliacionData.totales.compromisosPendientesPago / 1e6),
                          },
                        ]}
                        margin={{ top: 10, right: 20, left: 10, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <XAxis dataKey="categoria" stroke="#888" fontSize={12} />
                        <YAxis stroke="#888" fontSize={11} tickFormatter={(v) => `$${v}M`} />
                        <RechartsTooltip
                          contentStyle={{ backgroundColor: '#18181b', borderColor: '#333', borderRadius: '12px' }}
                          formatter={(value: any) => [`$ ${Number(value).toLocaleString()} M`, '']}
                        />
                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                        <Bar dataKey="Disponible Tesoral Libre" fill="#38BDF8" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Compromisos Pendientes" fill="#F43F5E" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Gráfica 4: Brecha Presupuestal - Tesoral */}
              {activeConcilChart === 'g4' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono text-on-surface-variant">
                    <span>Top Recursos con Mayor Brecha (Disponible Presupuesto - Disponible Tesorería)</span>
                    <span className="text-amber-300">Valores positivos indican apropiación que requiere recaudo</span>
                  </div>
                  <div className="h-[340px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={conciliacionData.recursos
                          .slice()
                          .sort((a, b) => Math.abs(b.diferenciaDisponibilidades) - Math.abs(a.diferenciaDisponibilidades))
                          .slice(0, 10)
                          .map((r) => ({
                            recurso: `Rec ${r.codigo}`,
                            nombre: r.nombre,
                            'Brecha Presupuesto-Tesorería': Math.round(r.diferenciaDisponibilidades / 1e6),
                          }))}
                        margin={{ top: 10, right: 20, left: 10, bottom: 40 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <XAxis dataKey="recurso" stroke="#888" fontSize={11} angle={-30} textAnchor="end" />
                        <YAxis stroke="#888" fontSize={11} tickFormatter={(v) => `$${v}M`} />
                        <RechartsTooltip
                          contentStyle={{ backgroundColor: '#18181b', borderColor: '#333', borderRadius: '12px' }}
                          formatter={(value: any) => [`$ ${Number(value).toLocaleString()} M`, 'Diferencia']}
                        />
                        <Bar dataKey="Brecha Presupuesto-Tesorería" radius={[4, 4, 0, 0]}>
                          {conciliacionData.recursos.slice(0, 10).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.diferenciaDisponibilidades >= 0 ? '#F59E0B' : '#10B981'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Gráfica 5: Cobertura de Obligaciones */}
              {activeConcilChart === 'g5' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono text-on-surface-variant">
                    <span>Ratios de Cobertura Inmediata (Saldo en Bancos / Compromisos por Pagar)</span>
                    <span className="text-emerald-400">Umbral mínimo óptimo: &ge; 1,0x</span>
                  </div>
                  <div className="h-[340px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          { fuente: 'Total Institucional', ratio: 2.35 },
                          { fuente: 'Rec 10.0 Aportes Nación', ratio: 7.3 },
                          { fuente: 'Rec 20 Recursos Propios', ratio: 10.38 },
                          { fuente: 'Rec 40 Estampilla UPTC', ratio: 7.49 },
                          { fuente: 'Rec 33 Convenios Terceros', ratio: 1.18 },
                          { fuente: 'Administración Global', ratio: 2.83 },
                          { fuente: 'Inversión Global', ratio: 1.15 },
                        ]}
                        margin={{ top: 10, right: 20, left: 10, bottom: 30 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <XAxis dataKey="fuente" stroke="#888" fontSize={11} angle={-15} textAnchor="end" />
                        <YAxis stroke="#888" fontSize={11} tickFormatter={(v) => `${v}x`} />
                        <RechartsTooltip
                          contentStyle={{ backgroundColor: '#18181b', borderColor: '#333', borderRadius: '12px' }}
                          formatter={(value: any) => [`${value}x (${(value * 100).toFixed(0)}%)`, 'Cobertura']}
                        />
                        <Bar dataKey="ratio" fill="#10B981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Gráfica 6: Administración vs. Inversión */}
              {activeConcilChart === 'g6' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono text-on-surface-variant">
                    <span>Comparativo Financiero Integral: Administración frente a Inversión</span>
                    <span>Millones COP</span>
                  </div>
                  <div className="h-[340px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          {
                            concepto: 'Apropiación',
                            Administración: Math.round(conciliacionData.totales.adminApropiacion / 1e6),
                            Inversión: Math.round(conciliacionData.totales.invApropiacion / 1e6),
                          },
                          {
                            concepto: 'Compromisos',
                            Administración: Math.round(conciliacionData.totales.adminCompromisos / 1e6),
                            Inversión: Math.round(conciliacionData.totales.invCompromisos / 1e6),
                          },
                          {
                            concepto: 'Pagos',
                            Administración: Math.round(conciliacionData.totales.adminPagos / 1e6),
                            Inversión: Math.round(conciliacionData.totales.invPagos / 1e6),
                          },
                          {
                            concepto: 'Disp. Presupuestal',
                            Administración: Math.round(conciliacionData.totales.adminDisponiblePresupuestal / 1e6),
                            Inversión: Math.round(conciliacionData.totales.invDisponiblePresupuestal / 1e6),
                          },
                          {
                            concepto: 'Saldo Bancos',
                            Administración: Math.round(conciliacionData.totales.adminSaldoBancos / 1e6),
                            Inversión: Math.round(conciliacionData.totales.invSaldoBancos / 1e6),
                          },
                          {
                            concepto: 'Por Pagar',
                            Administración: Math.round(conciliacionData.totales.adminSaldoPorPagar / 1e6),
                            Inversión: Math.round(conciliacionData.totales.invSaldoPorPagar / 1e6),
                          },
                        ]}
                        margin={{ top: 10, right: 20, left: 10, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <XAxis dataKey="concepto" stroke="#888" fontSize={11} />
                        <YAxis stroke="#888" fontSize={11} tickFormatter={(v) => `$${v}M`} />
                        <RechartsTooltip
                          contentStyle={{ backgroundColor: '#18181b', borderColor: '#333', borderRadius: '12px' }}
                          formatter={(value: any) => [`$ ${Number(value).toLocaleString()} M`, '']}
                        />
                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                        <Bar dataKey="Administración" fill="#38BDF8" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Inversión" fill="#10B981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Gráfica 7: Conciliación por Unidad */}
              {activeConcilChart === 'g7' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono text-on-surface-variant">
                    <span>Presupuesto por Comprometer vs. Saldo por Pagar en las Principales Unidades</span>
                    <span>Millones COP</span>
                  </div>
                  <div className="h-[340px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={conciliacionData.unidades.slice(0, 8).map((u) => ({
                          unidad: u.unidad.split(' - ')[0],
                          nombre: u.unidad,
                          'Disponible Presupuesto': Math.round(u.disponiblePresupuestal / 1e6),
                          'Saldo por Pagar': Math.round(u.saldoPorPagar / 1e6),
                        }))}
                        margin={{ top: 10, right: 20, left: 10, bottom: 30 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <XAxis dataKey="unidad" stroke="#888" fontSize={11} />
                        <YAxis stroke="#888" fontSize={11} tickFormatter={(v) => `$${v}M`} />
                        <RechartsTooltip
                          contentStyle={{ backgroundColor: '#18181b', borderColor: '#333', borderRadius: '12px' }}
                          formatter={(value: any) => [`$ ${Number(value).toLocaleString()} M`, '']}
                        />
                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                        <Bar dataKey="Disponible Presupuesto" fill="#FFCC29" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Saldo por Pagar" fill="#F43F5E" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Interactive Resource Conciliation Table (Section 5.3) */}
          <div className="bg-surface-container-low/50 border border-white/5 p-6 rounded-3xl space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FileSpreadsheet size={18} className="text-[#FFCC29]" />
                  Matriz de Conciliación Detallada por Código de Recurso (21 Fuentes)
                </h3>
                <span className="text-xs text-on-surface-variant">
                  Apropiación, compromisos, pagos, disponibilidad tesoral y ratios de cobertura individual
                </span>
              </div>

              {/* Filters for Resources Table */}
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                  <input
                    type="text"
                    value={searchConcilRecurso}
                    onChange={(e) => setSearchConcilRecurso(e.target.value)}
                    placeholder="Buscar recurso o código..."
                    className="w-full pl-9 pr-3 py-1.5 bg-surface-container border border-white/10 rounded-xl text-xs text-white placeholder-on-surface-variant focus:outline-none focus:border-[#FFCC29]"
                  />
                </div>

                <select
                  value={filterConcilTipo}
                  onChange={(e) => setFilterConcilTipo(e.target.value as any)}
                  className="bg-surface-container border border-white/10 text-white rounded-xl px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-[#FFCC29]"
                >
                  <option value="Todos">Todos los tipos</option>
                  <option value="Administración">Administración</option>
                  <option value="Inversión">Inversión</option>
                </select>

                {filterConcilEscenario !== 'TODOS' && (
                  <button
                    onClick={() => setFilterConcilEscenario('TODOS')}
                    className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 text-xs font-mono border border-amber-500/30 hover:bg-amber-500/30"
                  >
                    Escenario: {filterConcilEscenario} &times;
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-on-surface-variant uppercase text-[10px]">
                    <th className="p-2.5">Código</th>
                    <th className="p-2.5">Recurso</th>
                    <th className="p-2.5">Tipo</th>
                    <th className="p-2.5 text-right">Apropiación</th>
                    <th className="p-2.5 text-right">Compromisos</th>
                    <th className="p-2.5 text-right">Pagos</th>
                    <th className="p-2.5 text-right text-amber-300">Disp. Presup.</th>
                    <th className="p-2.5 text-right text-emerald-300">Saldo Bancos</th>
                    <th className="p-2.5 text-right text-rose-300">Por Pagar</th>
                    <th className="p-2.5 text-right text-sky-300">Disp. Tesorería</th>
                    <th className="p-2.5 text-right text-[#FFCC29]">Brecha</th>
                    <th className="p-2.5 text-center">Cobertura</th>
                    <th className="p-2.5">Escenario</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {conciliacionData.recursos
                    .filter((r) => {
                      if (filterConcilTipo !== 'Todos' && r.tipo !== filterConcilTipo) return false;
                      if (filterConcilEscenario === 'A' && !r.escenario.includes('Escenario A')) return false;
                      if (filterConcilEscenario === 'B' && !r.escenario.includes('Escenario B')) return false;
                      if (filterConcilEscenario === 'C' && !r.escenario.includes('Escenario C')) return false;
                      if (filterConcilEscenario === 'D' && !r.escenario.includes('Escenario D')) return false;
                      if (searchConcilRecurso) {
                        const q = searchConcilRecurso.toLowerCase();
                        return r.codigo.toLowerCase().includes(q) || r.nombre.toLowerCase().includes(q);
                      }
                      return true;
                    })
                    .map((r) => (
                      <tr key={r.codigo} className="hover:bg-white/5 transition-colors">
                        <td className="p-2.5 font-bold text-white whitespace-nowrap">{r.codigo}</td>
                        <td className="p-2.5 text-white/90 max-w-xs truncate" title={r.nombre}>
                          {r.nombre}
                        </td>
                        <td className="p-2.5 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              r.tipo === 'Administración'
                                ? 'bg-sky-400/10 text-sky-300 border border-sky-400/20'
                                : 'bg-emerald-400/10 text-emerald-300 border border-emerald-400/20'
                            }`}
                          >
                            {r.tipo}
                          </span>
                        </td>
                        <td className="p-2.5 text-right whitespace-nowrap">{formatMillions(r.apropiacion)}</td>
                        <td className="p-2.5 text-right whitespace-nowrap">{formatMillions(r.compromisos)}</td>
                        <td className="p-2.5 text-right whitespace-nowrap">{formatMillions(r.pagos)}</td>
                        <td className="p-2.5 text-right font-bold text-amber-300 whitespace-nowrap">
                          {formatMillions(r.disponiblePresupuestal)}
                        </td>
                        <td className="p-2.5 text-right font-bold text-emerald-300 whitespace-nowrap">
                          {r.saldoBancos > 0 ? formatMillions(r.saldoBancos) : '—'}
                        </td>
                        <td className="p-2.5 text-right text-rose-300 whitespace-nowrap">
                          {formatMillions(r.compromisosPendientesPago)}
                        </td>
                        <td className="p-2.5 text-right font-bold text-sky-300 whitespace-nowrap">
                          {formatMillions(r.disponibleTesoralEstimado)}
                        </td>
                        <td className="p-2.5 text-right font-black text-[#FFCC29] whitespace-nowrap">
                          {formatMillions(r.diferenciaDisponibilidades)}
                        </td>
                        <td className="p-2.5 text-center whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              r.coberturaObligaciones >= 2.0
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : r.coberturaObligaciones >= 1.0
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-rose-500/20 text-rose-300'
                            }`}
                          >
                            {r.coberturaObligaciones >= 900 ? 'N/A' : `${r.coberturaObligaciones.toFixed(1)}x`}
                          </span>
                        </td>
                        <td className="p-2.5 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[9px] font-mono ${
                              r.escenario.includes('A')
                                ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                                : r.escenario.includes('B')
                                ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                                : r.escenario.includes('C')
                                ? 'bg-sky-500/10 text-sky-300 border border-sky-500/20'
                                : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                            }`}
                            title={r.observacion}
                          >
                            {r.escenario.split(' ')[1]} {r.escenario.split(' ')[0]}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Conciliation by Executing Unit (Section 5.4) */}
          <div className="bg-surface-container-low/50 border border-white/5 p-6 rounded-3xl space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Building2 size={18} className="text-[#FFCC29]" />
                  Conciliación por Unidad Académica y Administrativa (14 Unidades)
                </h3>
                <span className="text-xs text-on-surface-variant">
                  Apropiación, ejecución contractual, compromisos pendientes y fondeo institucional centralizado
                </span>
              </div>

              <div className="relative w-full sm:w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                <input
                  type="text"
                  value={searchConcilUnidad}
                  onChange={(e) => setSearchConcilUnidad(e.target.value)}
                  placeholder="Buscar unidad ejecutora..."
                  className="w-full pl-9 pr-3 py-1.5 bg-surface-container border border-white/10 rounded-xl text-xs text-white placeholder-on-surface-variant focus:outline-none focus:border-[#FFCC29]"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-on-surface-variant uppercase text-[10px]">
                    <th className="p-2.5">Unidad</th>
                    <th className="p-2.5 text-right">Apropiación Definitiva</th>
                    <th className="p-2.5 text-right">Compromisos (% Comp.)</th>
                    <th className="p-2.5 text-right">Pagos (% Pago)</th>
                    <th className="p-2.5 text-right text-rose-300">Saldo por Pagar</th>
                    <th className="p-2.5 text-right text-amber-300">Disponible Presupuestal</th>
                    <th className="p-2.5 text-right text-emerald-300">Tesorería Centralizada</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {conciliacionData.unidades
                    .filter((u) => {
                      if (!searchConcilUnidad) return true;
                      return u.unidad.toLowerCase().includes(searchConcilUnidad.toLowerCase());
                    })
                    .map((u) => (
                      <tr key={u.unidad} className="hover:bg-white/5 transition-colors">
                        <td className="p-2.5 font-bold text-white max-w-sm truncate">{u.unidad}</td>
                        <td className="p-2.5 text-right whitespace-nowrap">{formatCOP(u.apropiacion)}</td>
                        <td className="p-2.5 text-right whitespace-nowrap">
                          <span className="font-medium text-white">{formatMillions(u.compromisos)}</span>
                          <span className="text-[10px] text-on-surface-variant block font-sans">
                            {u.porcentajeCompromiso.toFixed(1)}% comprometido
                          </span>
                        </td>
                        <td className="p-2.5 text-right whitespace-nowrap">
                          <span className="font-medium text-white">{formatMillions(u.pagos)}</span>
                          <span className="text-[10px] text-emerald-400 block font-sans">
                            {u.porcentajePago.toFixed(1)}% girado
                          </span>
                        </td>
                        <td className="p-2.5 text-right font-bold text-rose-300 whitespace-nowrap">
                          {formatCOP(u.saldoPorPagar)}
                        </td>
                        <td className="p-2.5 text-right font-black text-amber-300 whitespace-nowrap">
                          {formatCOP(u.disponiblePresupuestal)}
                        </td>
                        <td className="p-2.5 text-right text-emerald-400 font-mono text-[11px] whitespace-nowrap">
                          {u.saldoBancosDirecto > 0 ? 'Fondeo Institucional Central ($ 144.129M)' : 'Cuenta Concentradora'}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Module of Alerts & Financial Risks (Section 11) */}
          <div className="bg-surface-container-low/50 border border-white/5 p-6 rounded-3xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Módulo de Alertas y Riesgos Financieros Auditados</h3>
                  <span className="text-[11px] text-on-surface-variant">Riesgo de liquidez, presupuestal y de conciliación</span>
                </div>
              </div>
              <span className="text-xs font-mono text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20">
                {conciliacionData.alertas.length} Alertas Activas
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {conciliacionData.alertas.map((al) => (
                <div
                  key={al.id}
                  className="bg-surface-container/60 border border-white/5 p-4 rounded-2xl flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                          al.tipo === 'RIESGO_LIQUIDEZ'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : al.tipo === 'RIESGO_PRESUPUESTAL'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                        }`}
                      >
                        {al.tipo.replace('_', ' ')}
                      </span>
                      <span
                        className={`text-[10px] font-bold ${
                          al.nivel === 'ALTO'
                            ? 'text-rose-400'
                            : al.nivel === 'MEDIO'
                            ? 'text-amber-400'
                            : 'text-sky-400'
                        }`}
                      >
                        {al.nivel}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-white leading-snug">{al.titulo}</h4>
                    <p className="text-[11px] text-on-surface-variant font-light leading-relaxed">{al.descripcion}</p>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-white/5 text-[10px]">
                    <div className="bg-black/20 p-2 rounded-xl space-y-1">
                      <span className="text-on-surface-variant/70 block uppercase text-[9px] font-mono">
                        Causa Identificada:
                      </span>
                      <span className="text-white/80 font-sans block">{al.posibleCausa}</span>
                    </div>
                    <div className="bg-[#FFCC29]/5 border border-[#FFCC29]/10 p-2 rounded-xl space-y-1">
                      <span className="text-[#FFCC29] block uppercase text-[9px] font-mono font-bold">
                        Recomendación de Auditoría:
                      </span>
                      <span className="text-white/90 font-sans block">{al.recomendacion}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Answers to the 8 Institutional Management Questions (Section 20) */}
          <div className="bg-surface-container-low/50 border border-white/5 p-6 rounded-3xl space-y-6">
            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <div className="p-2.5 rounded-2xl bg-[#FFCC29] text-black">
                <Award size={20} />
              </div>
              <div>
                <h3 className="text-base font-black text-white">
                  Informe Ejecutivo: Respuestas Oficiales a las 8 Preguntas de Gestión Financiera
                </h3>
                <span className="text-xs text-on-surface-variant">
                  Diagnóstico técnico sustentado con rigor matemático para la Vicerrectoría Administrativa y Financiera
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {conciliacionData.preguntasClave.map((item) => (
                <div
                  key={item.numero}
                  className="bg-surface-container/60 border border-white/5 p-5 rounded-2xl space-y-3 flex flex-col justify-between hover:border-white/20 transition-colors"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-black text-[#FFCC29] px-2 py-0.5 rounded bg-[#FFCC29]/10 border border-[#FFCC29]/20">
                        PREGUNTA {item.numero}
                      </span>
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                          item.impacto === 'POSITIVO'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : item.impacto === 'ALERTA'
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-sky-500/20 text-sky-400'
                        }`}
                      >
                        {item.impacto}
                      </span>
                    </div>

                    <h4 className="text-xs sm:text-sm font-bold text-white leading-snug">{item.pregunta}</h4>

                    <div className="bg-white/5 p-2.5 rounded-xl border border-white/5">
                      <span className="text-xs font-black text-[#FFCC29] block mb-1">
                        {item.respuestaCorta}
                      </span>
                      <p className="text-[11px] text-on-surface-variant font-light leading-relaxed">
                        {item.respuestaDetallada}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5">
                    {item.indicadoresClave.map((kpi, kIdx) => (
                      <div key={kIdx} className="bg-black/30 p-2 rounded-xl text-center">
                        <span className="text-[9px] text-on-surface-variant block uppercase truncate">{kpi.label}</span>
                        <span className="text-xs font-black text-white font-mono block mt-0.5">{kpi.valor}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
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
        <div className="space-y-8">
          {/* Header of simulator */}
          <div className="bg-gradient-to-r from-surface-container-high via-surface-container to-surface-container-low border border-white/10 p-6 rounded-3xl backdrop-blur-xl relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1 z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFCC29]/10 text-[#FFCC29] text-xs font-mono font-bold">
                <Sliders size={14} />
                PROYECCIONES DE DICIEMBRE Y SIMULADOR DE CIERRE FINANCIERO UPTC
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Simulación de Cierre Presupuestal y Tesoral 2026
              </h2>
              <p className="text-xs sm:text-sm text-on-surface-variant max-w-3xl leading-relaxed">
                Modelo interactivo de cierre con incorporación exclusiva de la nómina de diciembre en el <strong className="text-white">Rubro 2.1.1 (Gastos de Personal)</strong> y registro de <strong className="text-white">Ingresos Adicionales Proyectados</strong> sin alterar las bases de datos históricas originales.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 z-10">
              {(['Todos', 'Administración', 'Inversión'] as const).map((scope) => (
                <button
                  key={scope}
                  onClick={() => setSimResourceScope(scope)}
                  className={`px-3 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
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
                className="px-3 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-mono border border-white/10 cursor-pointer flex items-center gap-1.5"
                title="Restablecer valores de simulación"
              >
                <RotateCcw size={14} className="text-[#FFCC29]" />
                Reset
              </button>
            </div>
          </div>

          {/* 6 Projected KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-surface-container-low/60 border border-white/5 p-4 rounded-2xl flex flex-col justify-between">
              <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider block">
                1. Recaudo Proyectado Cierre
              </span>
              <div className="my-1.5">
                <span className="text-lg lg:text-xl font-black text-emerald-400 font-mono block">
                  {formatMillions(proyeccionDiciembre.recaudoTotalProyectadoCierre)}
                </span>
                <span className="text-[10px] text-on-surface-variant/80 font-mono">
                  {proyeccionDiciembre.porcentajeRecaudoProyectadoCierre.toFixed(1)}% de aforo
                </span>
              </div>
              <span className="text-[9px] text-emerald-400 font-mono">
                +{formatMillions(proyeccionDiciembre.recaudoEsperadoDiciembreTotal)} en Dic
              </span>
            </div>

            <div className="bg-surface-container-low/60 border border-white/5 p-4 rounded-2xl flex flex-col justify-between">
              <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider block">
                2. Pagos Proyectados Cierre
              </span>
              <div className="my-1.5">
                <span className="text-lg lg:text-xl font-black text-rose-400 font-mono block">
                  {formatMillions(proyeccionDiciembre.pagosTotalesProyectadosCierre)}
                </span>
                <span className="text-[10px] text-on-surface-variant/80 font-mono">
                  {proyeccionDiciembre.porcentajePagoProyectadoCierre.toFixed(1)}% de apropiación
                </span>
              </div>
              <span className="text-[9px] text-rose-300 font-mono">
                +{formatMillions(proyeccionDiciembre.pagosEsperadosDiciembreTotal)} en Dic
              </span>
            </div>

            <div className="bg-surface-container-low/60 border border-white/5 p-4 rounded-2xl flex flex-col justify-between">
              <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider block">
                3. Compromisos Proyectados
              </span>
              <div className="my-1.5">
                <span className="text-lg lg:text-xl font-black text-amber-400 font-mono block">
                  {formatMillions(proyeccionDiciembre.compromisosTotalesProyectadosCierre)}
                </span>
                <span className="text-[10px] text-on-surface-variant/80 font-mono">
                  {proyeccionDiciembre.porcentajeCompromisoProyectadoCierre.toFixed(1)}% comprometido
                </span>
              </div>
              <span className="text-[9px] text-amber-300 font-mono">
                Incluye nómina Dic 2.1.1
              </span>
            </div>

            <div className="bg-surface-container-low/60 border border-white/5 p-4 rounded-2xl flex flex-col justify-between">
              <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider block">
                4. Disp. Presupuestal Libre
              </span>
              <div className="my-1.5">
                <span className="text-lg lg:text-xl font-black text-sky-400 font-mono block">
                  {formatMillions(proyeccionDiciembre.saldoPresupuestalDisponibleCierre)}
                </span>
                <span className="text-[10px] text-on-surface-variant/80 font-mono">
                  Apropiación no comprometida
                </span>
              </div>
              <span className="text-[9px] text-sky-300 font-mono">
                Tras imputar nómina Dic
              </span>
            </div>

            <div className="bg-surface-container-low/60 border border-white/5 p-4 rounded-2xl flex flex-col justify-between">
              <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider block">
                5. Balance Presupuestal Cierre
              </span>
              <div className="my-1.5">
                <span className={`text-lg lg:text-xl font-black font-mono block ${
                  proyeccionDiciembre.balancePresupuestalCierre >= 0 ? 'text-[#FFCC29]' : 'text-rose-400'
                }`}>
                  {formatMillions(proyeccionDiciembre.balancePresupuestalCierre)}
                </span>
                <span className="text-[10px] text-on-surface-variant/80 font-mono">
                  Recaudo proy. - Compromisos
                </span>
              </div>
              <span className="text-[9px] text-emerald-400 font-mono">
                Superávit proyectado
              </span>
            </div>

            <div className="bg-surface-container-low/60 border border-white/5 p-4 rounded-2xl flex flex-col justify-between">
              <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider block">
                6. Saldo Bancos 31 Diciembre
              </span>
              <div className="my-1.5">
                <span className="text-lg lg:text-xl font-black text-emerald-400 font-mono block">
                  {formatMillions(proyeccionDiciembre.saldoBancosProyectadoCierre)}
                </span>
                <span className="text-[10px] text-on-surface-variant/80 font-mono">
                  Posición de caja al cierre
                </span>
              </div>
              <span className="text-[9px] text-sky-400 font-mono">
                Flujo neto Dic: {formatMillions(proyeccionDiciembre.flujoNetoDiciembre)}
              </span>
            </div>
          </div>

          {/* REQUERIMIENTO 1: Nómina de Diciembre en Rubro 2.1.1 (Gastos de Personal) */}
          <div className="bg-surface-container-low/50 border border-white/5 p-6 rounded-3xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-[#FFCC29]/10 text-[#FFCC29]">
                  <Briefcase size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    1. Nómina Pendiente de Apropiación – Rubro 2.1.1 (Gastos de Personal)
                  </h3>
                  <span className="text-xs text-on-surface-variant">
                    Único compromiso pendiente de apropiación presupuestal al cierre de la vigencia 2026
                  </span>
                </div>
              </div>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                Rubro: 2.1.1 Gastos de Personal
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              {/* Input & Presets (5 cols) */}
              <div className="lg:col-span-5 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-gray-300 block font-medium">
                    Valor Estimado de la Nómina de Diciembre (COP):
                  </label>
                  <div className="relative">
                    <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#FFCC29]" />
                    <input
                      type="number"
                      value={simNominaDiciembre211}
                      onChange={(e) => setSimNominaDiciembre211(parseFloat(e.target.value) || 0)}
                      className="w-full pl-9 pr-3 py-2.5 bg-black/60 border border-white/10 rounded-xl text-sm font-mono font-bold text-white focus:outline-none focus:border-[#FFCC29]"
                      placeholder="28500000000"
                    />
                  </div>
                  <div className="flex justify-between items-center text-[11px] font-mono text-on-surface-variant">
                    <span>Equivalente:</span>
                    <span className="text-[#FFCC29] font-bold">{formatCOP(simNominaDiciembre211)}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] font-mono text-on-surface-variant uppercase block">
                    Presets de Nómina Institucional:
                  </span>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: '$ 25.000M', val: 25000000000 },
                      { label: '$ 28.500M', val: 28500000000 },
                      { label: '$ 32.000M', val: 32000000000 },
                      { label: '$ 0 M', val: 0 },
                    ].map((btn) => (
                      <button
                        key={btn.label}
                        onClick={() => setSimNominaDiciembre211(btn.val)}
                        className={`py-1.5 rounded-xl text-[11px] font-mono border transition-all cursor-pointer ${
                          simNominaDiciembre211 === btn.val
                            ? 'bg-[#FFCC29] text-black font-bold border-[#FFCC29]'
                            : 'bg-black/40 text-gray-300 border-white/10 hover:bg-white/5'
                        }`}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>

                <p className="text-[11px] text-on-surface-variant leading-relaxed font-light">
                  * Este registro se imputa automáticamente al componente de funcionamiento en el rubro 2.1.1, evitando que se duplique con los compromisos ya adquiridos o con los gastos recurrentes operativos.
                </p>
              </div>

              {/* Rubro 2.1.1 Diagnostics Card (7 cols) */}
              <div className="lg:col-span-7 bg-surface-container/60 border border-white/5 p-5 rounded-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                    Diagnóstico Presupuestal Específico del Rubro 2.1.1
                  </span>
                  <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded font-bold ${
                    proyeccionDiciembre.rubro211.suficienciaApropiacion
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}>
                    {proyeccionDiciembre.rubro211.suficienciaApropiacion ? 'SUFICIENCIA GARANTIZADA' : 'INSUFICIENCIA PRESUPUESTAL'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                  <div className="bg-black/30 p-2.5 rounded-xl">
                    <span className="text-[10px] text-on-surface-variant block uppercase truncate">Apropiación 2.1.1</span>
                    <span className="font-bold text-white block mt-1">{formatMillions(proyeccionDiciembre.rubro211.apropiacionActual)}</span>
                  </div>
                  <div className="bg-black/30 p-2.5 rounded-xl">
                    <span className="text-[10px] text-on-surface-variant block uppercase truncate">Compromisos a Nov</span>
                    <span className="font-bold text-amber-300 block mt-1">{formatMillions(proyeccionDiciembre.rubro211.compromisosActuales)}</span>
                  </div>
                  <div className="bg-black/30 p-2.5 rounded-xl">
                    <span className="text-[10px] text-on-surface-variant block uppercase truncate">(+) Nómina Dic</span>
                    <span className="font-bold text-[#FFCC29] block mt-1">{formatMillions(proyeccionDiciembre.rubro211.nominaDiciembreEstimada)}</span>
                  </div>
                  <div className="bg-black/30 p-2.5 rounded-xl">
                    <span className="text-[10px] text-on-surface-variant block uppercase truncate">Disp. Restante 2.1.1</span>
                    <span className="font-bold text-emerald-400 block mt-1">{formatMillions(proyeccionDiciembre.rubro211.disponibleProyectadoCierre)}</span>
                  </div>
                </div>

                <div className="bg-black/20 p-3 rounded-xl border border-white/5 space-y-1.5 text-xs">
                  <div className="flex justify-between items-center font-mono">
                    <span className="text-on-surface-variant">Ejecución Proyectada de Personal (2.1.1):</span>
                    <span className="text-white font-bold">{proyeccionDiciembre.rubro211.porcentajeCompromisoProyectado.toFixed(2)}% de apropiación</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-emerald-500 to-[#FFCC29] h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, proyeccionDiciembre.rubro211.porcentajeCompromisoProyectado)}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-on-surface-variant leading-relaxed font-light">
                    {proyeccionDiciembre.rubro211.suficienciaApropiacion
                      ? `La UPTC cuenta con apropiación disponible de ${formatMillions(proyeccionDiciembre.rubro211.disponibleActual)} en el Rubro 2.1.1, suficiente para amparar el 100% de la nómina de diciembre (${formatMillions(proyeccionDiciembre.rubro211.nominaDiciembreEstimada)}), conservando un margen libre no comprometido de ${formatMillions(proyeccionDiciembre.rubro211.holguraApropiacion211)} COP.`
                      : `ALERTA: La nómina estimada supera la disponibilidad presupuestal libre del rubro 2.1.1 en ${formatMillions(Math.abs(proyeccionDiciembre.rubro211.holguraApropiacion211))} COP, requiriendo un traslado presupuestal interno.`}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* REQUERIMIENTO 2: Apartado Independiente «Ingresos Adicionales Proyectados» */}
          <div className="bg-surface-container-low/50 border border-white/5 p-6 rounded-3xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400">
                  <TrendingUp size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    2. Apartado Independiente: Ingresos Adicionales Proyectados
                  </h3>
                  <span className="text-xs text-on-surface-variant">
                    Registro de recaudos extraordinarios, transferencias pendientes y nuevos recursos para el cierre
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="text-right mr-1">
                  <span className="text-[10px] font-mono text-on-surface-variant uppercase block">Total Adicionales:</span>
                  <span className="text-sm font-black text-emerald-400 font-mono">
                    +{formatMillions(proyeccionDiciembre.totalIngresosAdicionalesManuales)}
                  </span>
                </div>
                <button
                  onClick={() => exportToCSV(simIngresosAdicionales, 'Ingresos_Adicionales_Proyectados_UPTC')}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-mono border border-white/10 transition-all cursor-pointer"
                  title="Exportar listado de ingresos adicionales a CSV"
                >
                  <Download size={14} className="text-emerald-400" />
                  Exportar CSV
                </button>
                <button
                  onClick={() => {
                    setEditingIncomeId(null);
                    setIncomeForm({
                      concepto: '',
                      valor: 0,
                      recurso: '20',
                      tipo: 'Administración',
                      naturaleza: 'Libre Destinación',
                      observaciones: '',
                    });
                    setShowAddIncomeForm(!showAddIncomeForm);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-mono border border-emerald-500/30 transition-all cursor-pointer"
                >
                  <Plus size={14} />
                  {showAddIncomeForm ? 'Cerrar Formulario' : 'Nuevo Ingreso'}
                </button>
              </div>
            </div>

            {/* Formulario de Agregar / Editar Ingreso Adicional */}
            {showAddIncomeForm && (
              <div className="bg-surface-container/80 border border-emerald-500/30 p-5 rounded-2xl space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <span className="text-xs font-mono font-bold text-emerald-300 uppercase">
                    {editingIncomeId ? 'Editar Ingreso Adicional Proyectado' : 'Registrar Nuevo Ingreso Adicional Proyectado'}
                  </span>
                  <button
                    onClick={() => setShowAddIncomeForm(false)}
                    className="text-on-surface-variant hover:text-white"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs font-mono">
                  <div className="space-y-1">
                    <label className="text-gray-300 block">Concepto o Descripción:</label>
                    <input
                      type="text"
                      value={incomeForm.concepto}
                      onChange={(e) => setIncomeForm({ ...incomeForm, concepto: e.target.value })}
                      placeholder="Ej. Giro MEN Política de Gratuidad"
                      className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-on-surface-variant focus:outline-none focus:border-emerald-400"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-gray-300 block">Valor Estimado (COP):</label>
                    <input
                      type="number"
                      value={incomeForm.valor || ''}
                      onChange={(e) => setIncomeForm({ ...incomeForm, valor: parseFloat(e.target.value) || 0 })}
                      placeholder="Monto en COP"
                      className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-on-surface-variant focus:outline-none focus:border-emerald-400"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-gray-300 block">Recurso Presupuestal:</label>
                    <select
                      value={incomeForm.recurso}
                      onChange={(e) => setIncomeForm({ ...incomeForm, recurso: e.target.value })}
                      className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-400"
                    >
                      <option value="10.0">10.0 - Aportes Nación Funcionamiento</option>
                      <option value="10.5">10.5 - Política de Gratuidad</option>
                      <option value="12">12 - Estampillas Otras Universidades</option>
                      <option value="13">13 - Cooperativas</option>
                      <option value="14">14 - Matrículas FSE</option>
                      <option value="16.0">16.0 - Aportes Inversión</option>
                      <option value="20">20 - Recursos Propios</option>
                      <option value="31">31 - Posgrados</option>
                      <option value="33">33 - Convenios con Derechos</option>
                      <option value="34">34 - Convenios sin Derechos</option>
                      <option value="40">40 - Estampilla UPTC</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-gray-300 block">Tipo de Recurso:</label>
                    <select
                      value={incomeForm.tipo}
                      onChange={(e) => setIncomeForm({ ...incomeForm, tipo: e.target.value as any })}
                      className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-400"
                    >
                      <option value="Administración">Administración</option>
                      <option value="Inversión">Inversión</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-gray-300 block">Naturaleza del Recurso:</label>
                    <select
                      value={incomeForm.naturaleza}
                      onChange={(e) => setIncomeForm({ ...incomeForm, naturaleza: e.target.value as any })}
                      className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-400"
                    >
                      <option value="Libre Destinación">Libre Destinación</option>
                      <option value="Destinación Específica">Destinación Específica</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-gray-300 block">Observaciones / Justificación:</label>
                    <input
                      type="text"
                      value={incomeForm.observaciones}
                      onChange={(e) => setIncomeForm({ ...incomeForm, observaciones: e.target.value })}
                      placeholder="Soporte o justificación del giro"
                      className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-on-surface-variant focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setShowAddIncomeForm(false)}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-mono border border-white/10 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveIncome}
                    className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-black font-bold rounded-xl text-xs font-mono shadow-md cursor-pointer flex items-center gap-1.5"
                  >
                    <Check size={14} />
                    {editingIncomeId ? 'Actualizar Ingreso' : 'Guardar Ingreso'}
                  </button>
                </div>
              </div>
            )}

            {/* Tabla de Ingresos Adicionales Registrados */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-on-surface-variant uppercase text-[10px]">
                    <th className="p-2.5">Concepto / Descripción</th>
                    <th className="p-2.5 text-right">Valor Estimado</th>
                    <th className="p-2.5 text-center">Recurso</th>
                    <th className="p-2.5 text-center">Tipo</th>
                    <th className="p-2.5 text-center">Naturaleza</th>
                    <th className="p-2.5">Observaciones</th>
                    <th className="p-2.5 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {simIngresosAdicionales.map((item) => (
                    <tr key={item.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-2.5 font-bold text-white max-w-xs">{item.concepto}</td>
                      <td className="p-2.5 text-right font-black text-emerald-400 whitespace-nowrap">
                        {formatCOP(item.valor)}
                      </td>
                      <td className="p-2.5 text-center whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-[#FFCC29]/10 text-[#FFCC29] border border-[#FFCC29]/20 font-bold">
                          Rec {item.recurso}
                        </span>
                      </td>
                      <td className="p-2.5 text-center whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.tipo === 'Administración'
                              ? 'bg-sky-400/10 text-sky-300 border border-sky-400/20'
                              : 'bg-emerald-400/10 text-emerald-300 border border-emerald-400/20'
                          }`}
                        >
                          {item.tipo}
                        </span>
                      </td>
                      <td className="p-2.5 text-center whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] ${
                            item.naturaleza === 'Libre Destinación'
                              ? 'bg-amber-400/10 text-amber-300 border border-amber-400/20'
                              : 'bg-purple-400/10 text-purple-300 border border-purple-400/20'
                          }`}
                        >
                          {item.naturaleza}
                        </span>
                      </td>
                      <td className="p-2.5 text-on-surface-variant text-[11px] max-w-xs truncate" title={item.observaciones}>
                        {item.observaciones || '—'}
                      </td>
                      <td className="p-2.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleEditIncome(item)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-sky-300 transition-colors"
                            title="Editar ingreso"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteIncome(item.id)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-rose-400 transition-colors"
                            title="Eliminar ingreso"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {simIngresosAdicionales.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-on-surface-variant font-mono">
                        No hay ingresos adicionales registrados. Haz clic en "+ Nuevo Ingreso" para agregar recaudos proyectados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Interactive Simulation Parameters & Reference vs Projected Comparison */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Sliders (5 cols) */}
            <div className="lg:col-span-5 bg-surface-container-low/40 border border-white/5 p-6 rounded-3xl space-y-6">
              <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider border-b border-white/5 pb-2">
                Curvas de Recaudo y Pago en Diciembre
              </h4>

              {/* Slider 1: % Recaudo Saldo Pendiente */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-gray-300">Cumplimiento Recaudo Aforo Base:</span>
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
                  <span className="text-gray-300">Giro Compromisos Existentes Dic:</span>
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

            {/* Right Column: Comparative Reference Table (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              <div className="bg-surface-container-low/40 border border-white/5 p-6 rounded-3xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/5 pb-2 gap-2">
                  <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                    Tabla de Variables: Ejecutado Real (23 Nov) vs Ajustes Dic vs Cierre Proyectado
                  </h4>
                  <button
                    onClick={() => {
                      const exportData = [
                        { Variable: 'Saldo en cuentas bancarias', Real_23Nov: proyeccionDiciembre.bancosActuales, Ajuste_Dic: proyeccionDiciembre.flujoNetoDiciembre, Proyectado_Cierre: proyeccionDiciembre.saldoBancosProyectadoCierre },
                        { Variable: 'Aforo de ingresos', Real_23Nov: proyeccionDiciembre.aforoTotal, Ajuste_Dic: 0, Proyectado_Cierre: proyeccionDiciembre.aforoTotal },
                        { Variable: 'Recaudo de ingresos', Real_23Nov: proyeccionDiciembre.recaudoHistoricoEneNov, Ajuste_Dic: proyeccionDiciembre.recaudoEsperadoDiciembreTotal, Proyectado_Cierre: proyeccionDiciembre.recaudoTotalProyectadoCierre },
                        { Variable: 'Apropiación presupuestal total', Real_23Nov: proyeccionDiciembre.apropiacionTotal, Ajuste_Dic: 0, Proyectado_Cierre: proyeccionDiciembre.apropiacionTotal },
                        { Variable: 'Compromisos presupuestales', Real_23Nov: proyeccionDiciembre.compromisosHistoricosEneNov, Ajuste_Dic: proyeccionDiciembre.nominaDiciembreAfectada, Proyectado_Cierre: proyeccionDiciembre.compromisosTotalesProyectadosCierre },
                        { Variable: 'Saldo de apropiación disponible', Real_23Nov: proyeccionDiciembre.apropiacionTotal - proyeccionDiciembre.compromisosHistoricosEneNov, Ajuste_Dic: -proyeccionDiciembre.nominaDiciembreAfectada, Proyectado_Cierre: proyeccionDiciembre.saldoPresupuestalDisponibleCierre },
                        { Variable: 'Pagos acumulados efectivos', Real_23Nov: proyeccionDiciembre.pagosHistoricosEneNov, Ajuste_Dic: proyeccionDiciembre.pagosEsperadosDiciembreTotal, Proyectado_Cierre: proyeccionDiciembre.pagosTotalesProyectadosCierre },
                        { Variable: 'Balance Presupuestal de Cierre', Real_23Nov: proyeccionDiciembre.recaudoHistoricoEneNov - proyeccionDiciembre.compromisosHistoricosEneNov, Ajuste_Dic: proyeccionDiciembre.recaudoEsperadoDiciembreTotal - proyeccionDiciembre.nominaDiciembreAfectada, Proyectado_Cierre: proyeccionDiciembre.balancePresupuestalCierre },
                      ];
                      exportToCSV(exportData, 'Proyecciones_Cierre_Diciembre_UPTC');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-mono text-[11px] border border-white/10 transition-colors cursor-pointer self-start sm:self-auto"
                  >
                    <Download size={13} className="text-[#FFCC29]" />
                    Exportar Tabla (CSV)
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono border-collapse">
                    <thead className="bg-zinc-900 border-b border-white/10 text-on-surface-variant text-[11px]">
                      <tr>
                        <th className="p-2.5">Variable Financiera</th>
                        <th className="p-2.5 text-right">Real (23 Nov)</th>
                        <th className="p-2.5 text-right">Ajuste Dic</th>
                        <th className="p-2.5 text-right font-bold text-[#FFCC29]">Proyectado Cierre</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      <tr>
                        <td className="p-2.5 text-gray-300">Saldo en cuentas bancarias</td>
                        <td className="p-2.5 text-right text-gray-400">{formatCOP(proyeccionDiciembre.bancosActuales)}</td>
                        <td className={`p-2.5 text-right font-bold ${proyeccionDiciembre.flujoNetoDiciembre >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {formatCOP(proyeccionDiciembre.flujoNetoDiciembre)}
                        </td>
                        <td className="p-2.5 text-right font-bold text-emerald-400">{formatCOP(proyeccionDiciembre.saldoBancosProyectadoCierre)}</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 text-gray-300">Aforo de ingresos</td>
                        <td className="p-2.5 text-right text-gray-400">{formatCOP(proyeccionDiciembre.aforoTotal)}</td>
                        <td className="p-2.5 text-right text-on-surface-variant">—</td>
                        <td className="p-2.5 text-right text-white">{formatCOP(proyeccionDiciembre.aforoTotal)}</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 text-gray-300">Recaudo de ingresos</td>
                        <td className="p-2.5 text-right text-gray-400">{formatCOP(proyeccionDiciembre.recaudoHistoricoEneNov)}</td>
                        <td className="p-2.5 text-right text-emerald-300">+{formatCOP(proyeccionDiciembre.recaudoEsperadoDiciembreTotal)}</td>
                        <td className="p-2.5 text-right font-bold text-emerald-400">{formatCOP(proyeccionDiciembre.recaudoTotalProyectadoCierre)}</td>
                      </tr>
                      <tr className="bg-white/5">
                        <td className="p-2.5 text-gray-300">Apropiación presupuestal total</td>
                        <td className="p-2.5 text-right text-gray-400">{formatCOP(proyeccionDiciembre.apropiacionTotal)}</td>
                        <td className="p-2.5 text-right text-on-surface-variant">—</td>
                        <td className="p-2.5 text-right text-white">{formatCOP(proyeccionDiciembre.apropiacionTotal)}</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 text-gray-300">Compromisos presupuestales</td>
                        <td className="p-2.5 text-right text-gray-400">{formatCOP(proyeccionDiciembre.compromisosHistoricosEneNov)}</td>
                        <td className="p-2.5 text-right text-[#FFCC29]">+{formatCOP(proyeccionDiciembre.nominaDiciembreAfectada)}</td>
                        <td className="p-2.5 text-right font-bold text-amber-300">{formatCOP(proyeccionDiciembre.compromisosTotalesProyectadosCierre)}</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 text-gray-300">Saldo de apropiación disponible</td>
                        <td className="p-2.5 text-right text-gray-400">{formatCOP(proyeccionDiciembre.apropiacionTotal - proyeccionDiciembre.compromisosHistoricosEneNov)}</td>
                        <td className="p-2.5 text-right text-rose-300">-{formatCOP(proyeccionDiciembre.nominaDiciembreAfectada)}</td>
                        <td className="p-2.5 text-right font-black text-sky-400">{formatCOP(proyeccionDiciembre.saldoPresupuestalDisponibleCierre)}</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 text-gray-300">Pagos acumulados efectivos</td>
                        <td className="p-2.5 text-right text-gray-400">{formatCOP(proyeccionDiciembre.pagosHistoricosEneNov)}</td>
                        <td className="p-2.5 text-right text-rose-300">+{formatCOP(proyeccionDiciembre.pagosEsperadosDiciembreTotal)}</td>
                        <td className="p-2.5 text-right font-bold text-rose-400">{formatCOP(proyeccionDiciembre.pagosTotalesProyectadosCierre)}</td>
                      </tr>
                      <tr className="bg-[#FFCC29]/10">
                        <td className="p-2.5 font-bold text-white">Balance Presupuestal de Cierre</td>
                        <td className="p-2.5 text-right text-gray-400">{formatCOP(proyeccionDiciembre.recaudoHistoricoEneNov - proyeccionDiciembre.compromisosHistoricosEneNov)}</td>
                        <td className="p-2.5 text-right text-emerald-300">
                          {formatCOP(proyeccionDiciembre.recaudoEsperadoDiciembreTotal - proyeccionDiciembre.nominaDiciembreAfectada)}
                        </td>
                        <td className="p-2.5 text-right font-black text-[#FFCC29]">{formatCOP(proyeccionDiciembre.balancePresupuestalCierre)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Waterfall Chart Representation */}
              <div className="bg-surface-container-low/40 border border-white/5 p-6 rounded-3xl space-y-4">
                <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                  Gráfica de Cascada: Transformación del Efectivo en Diciembre
                </h4>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { name: 'Caja Actual', valor: Math.round(proyeccionDiciembre.bancosActuales / 1e6), fill: '#FFCC29' },
                        { name: '(+) Recaudo Base', valor: Math.round(proyeccionDiciembre.recaudoEsperadoAforoBase / 1e6), fill: '#10b981' },
                        { name: '(+) Adicionales', valor: Math.round(proyeccionDiciembre.totalIngresosAdicionalesManuales / 1e6), fill: '#38bdf8' },
                        { name: '(-) Giros Exist.', valor: Math.round(proyeccionDiciembre.pagosEsperadosCompromisosExistentes / 1e6), fill: '#f43f5e' },
                        { name: '(-) Nómina 2.1.1', valor: Math.round(proyeccionDiciembre.nominaDiciembreAfectada / 1e6), fill: '#e11d48' },
                        { name: '(=) Caja Cierre', valor: Math.round(proyeccionDiciembre.saldoBancosProyectadoCierre / 1e6), fill: '#10B981' },
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
                        {['#FFCC29', '#10b981', '#38bdf8', '#f43f5e', '#e11d48', '#10B981'].map((c, i) => (
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

              {/* Seccion 4: Proyecciones de Cierre a Diciembre */}
              <div className="bg-black/30 p-4 rounded-xl border border-white/5 space-y-2">
                <h4 className="font-bold text-white font-mono uppercase text-sm">4. ESCENARIO PROYECTADO DE CIERRE A DICIEMBRE</h4>
                <p>
                  Con la incorporación de la nómina de diciembre estimada en <strong>{formatCOP(proyeccionDiciembre.rubro211.nominaDiciembreEstimada)}</strong> (clasificada como el único gasto pendiente de apropiación en el <strong>Rubro 2.1.1 Gastos de Personal</strong>, el cual conserva una holgura libre de <strong>+{formatCOP(proyeccionDiciembre.rubro211.holguraApropiacion211)}</strong>) e ingresos adicionales proyectados por <strong>+{formatCOP(proyeccionDiciembre.totalIngresosAdicionalesManuales)}</strong>, la UPTC proyecta cerrar la vigencia 2026 con un <strong>Recaudo Total de {formatCOP(proyeccionDiciembre.recaudoTotalProyectadoCierre)}</strong> ({proyeccionDiciembre.porcentajeRecaudoProyectadoCierre.toFixed(1)}% de aforo), <strong>Compromisos Totales de {formatCOP(proyeccionDiciembre.compromisosTotalesProyectadosCierre)}</strong> ({proyeccionDiciembre.porcentajeCompromisoProyectadoCierre.toFixed(1)}% de apropiación), un <strong>Superávit Presupuestal Proyectado de {formatCOP(proyeccionDiciembre.balancePresupuestalCierre)}</strong> y un <strong>Saldo Final en Bancos de {formatCOP(proyeccionDiciembre.saldoBancosProyectadoCierre)}</strong>.
                </p>
              </div>

              {/* Downloads Bar */}
              <div className="bg-black/30 p-4 rounded-xl border border-white/5 space-y-3">
                <h4 className="font-bold text-white font-mono uppercase text-sm">5. EXPORTACIÓN DE BASES Y MATRICES ANALÍTICAS</h4>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => {
                      const exportData = [
                        { Variable: 'Saldo en cuentas bancarias', Real_23Nov: proyeccionDiciembre.bancosActuales, Ajuste_Dic: proyeccionDiciembre.flujoNetoDiciembre, Proyectado_Cierre: proyeccionDiciembre.saldoBancosProyectadoCierre },
                        { Variable: 'Aforo de ingresos', Real_23Nov: proyeccionDiciembre.aforoTotal, Ajuste_Dic: 0, Proyectado_Cierre: proyeccionDiciembre.aforoTotal },
                        { Variable: 'Recaudo de ingresos', Real_23Nov: proyeccionDiciembre.recaudoHistoricoEneNov, Ajuste_Dic: proyeccionDiciembre.recaudoEsperadoDiciembreTotal, Proyectado_Cierre: proyeccionDiciembre.recaudoTotalProyectadoCierre },
                        { Variable: 'Apropiación presupuestal total', Real_23Nov: proyeccionDiciembre.apropiacionTotal, Ajuste_Dic: 0, Proyectado_Cierre: proyeccionDiciembre.apropiacionTotal },
                        { Variable: 'Compromisos presupuestales', Real_23Nov: proyeccionDiciembre.compromisosHistoricosEneNov, Ajuste_Dic: proyeccionDiciembre.nominaDiciembreAfectada, Proyectado_Cierre: proyeccionDiciembre.compromisosTotalesProyectadosCierre },
                        { Variable: 'Saldo de apropiación disponible', Real_23Nov: proyeccionDiciembre.apropiacionTotal - proyeccionDiciembre.compromisosHistoricosEneNov, Ajuste_Dic: -proyeccionDiciembre.nominaDiciembreAfectada, Proyectado_Cierre: proyeccionDiciembre.saldoPresupuestalDisponibleCierre },
                        { Variable: 'Pagos acumulados efectivos', Real_23Nov: proyeccionDiciembre.pagosHistoricosEneNov, Ajuste_Dic: proyeccionDiciembre.pagosEsperadosDiciembreTotal, Proyectado_Cierre: proyeccionDiciembre.pagosTotalesProyectadosCierre },
                        { Variable: 'Balance Presupuestal de Cierre', Real_23Nov: proyeccionDiciembre.recaudoHistoricoEneNov - proyeccionDiciembre.compromisosHistoricosEneNov, Ajuste_Dic: proyeccionDiciembre.recaudoEsperadoDiciembreTotal - proyeccionDiciembre.nominaDiciembreAfectada, Proyectado_Cierre: proyeccionDiciembre.balancePresupuestalCierre },
                      ];
                      exportToCSV(exportData, 'Proyecciones_Diciembre_UPTC');
                    }}
                    className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-white font-mono text-[11px] border border-white/10 cursor-pointer"
                  >
                    <Download size={13} className="text-[#FFCC29]" />
                    Exportar Proyecciones Cierre (CSV)
                  </button>
                  <button
                    onClick={() => exportToCSV(simIngresosAdicionales, 'Ingresos_Adicionales_Proyectados_UPTC')}
                    className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-white font-mono text-[11px] border border-white/10 cursor-pointer"
                  >
                    <Download size={13} className="text-emerald-400" />
                    Exportar Ingresos Adicionales (CSV)
                  </button>
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
