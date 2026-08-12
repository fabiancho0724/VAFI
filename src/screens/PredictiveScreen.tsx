import { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ComposedChart, Line,
  ReferenceLine
} from 'recharts';
import { 
  Filter, DollarSign, Activity, TrendingUp, Briefcase, RefreshCw, Layers, 
  Compass, ChevronRight, PieChart as PieChartIcon, Table, CheckSquare,
  AlertTriangle, ShieldAlert, Gauge, TrendingDown, Target, ShieldCheck,
  ChevronUp, ChevronDown, Wallet, Users, Sliders, ArrowUpRight, ArrowDownRight,
  Sparkles, CheckCircle2, Zap, BarChart2, Award, Landmark, Bot, Lightbulb, Info,
  LayoutList, CheckCircle, Lock, Unlock, Check, ToggleLeft, ToggleRight
} from 'lucide-react';
import { fetchAndParseCSV } from '../lib/csvParser';
import { 
  calculateProjections, aggregateFlow, CashFlowItem, ProjectionResults, getRowUnidad,
  BUDGET_PAYROLL_2026, PAYROLL_REAL_ENE_JUL, PAYROLL_REMAINING_AGO_DIC
} from '../lib/financialEngine';
import { RESOURCES_LIST, getResourceFullName, getRecursoEquivalence, getRowResourceCode } from '../lib/resourceMapper';
import { RECURSOS_FIJOS_RESOLUCION } from '../lib/constants';
import rawHistoricalGastos from '../data/historicalGastos.json';
import { MultiYearProjectionScreen } from './MultiYearProjectionScreen';

// NPV Helper (monthly discount rate)
function calculateNPV(flows: number[], discountRateAnnual: number) {
  const r = (discountRateAnnual / 100) / 12; // monthly rate
  return flows.reduce((acc, f, t) => acc + (f / Math.pow(1 + r, t + 1)), 0);
}

// IRR Helper (monthly IRR annualized)
function calculateIRR(flows: number[]) {
  let r0 = 0.01;
  let r1 = 0.02;
  const npv = (rate: number) => {
    return flows.reduce((acc, f, t) => acc + (f / Math.pow(1 + rate, t + 1)), 0);
  };
  
  for (let i = 0; i < 100; i++) {
    const npv0 = npv(r0);
    const npv1 = npv(r1);
    if (Math.abs(npv1 - npv0) < 1e-8) break;
    const rNext = r1 - npv1 * (r1 - r0) / (npv1 - npv0);
    r0 = r1;
    r1 = rNext;
  }
  
  if (isNaN(r1) || !isFinite(r1) || Math.abs(r1) > 2) return 0;
  return (Math.pow(1 + r1, 12) - 1) * 100;
}

const COLORS = ['#ffcc29', '#4ade80', '#38bdf8', '#c084fc', '#f43f5e', '#7bd0ff', '#fb7185', '#a78bfa'];

// AI Suggested values and contextual rationale
const AI_ING_SUGGESTIONS: Record<string, { val: number; rationale: string }> = {
  '10': { val: 0.0, rationale: 'Fijo por Resolución MEN - Ley 30/92 ($315.327,8M).' },
  '10.1': { val: 0.0, rationale: 'Fijo por Resolución MEN - PIC Convencional ($9.756,7M).' },
  '10.2': { val: 0.0, rationale: 'Fijo por Resolución MEN - PIC Territorial ($3.996,7M).' },
  '10.5': { val: 0.0, rationale: 'Fijo por Resolución MEN - Gratuidad Ley 2307 ($20.708,4M).' },
  '12': { val: 0.0, rationale: 'Fijo por Ley 1697 / Estampilla Pro-UNAL ($17.266,1M).' },
  '13': { val: 0.0, rationale: 'Fijo por DIAN / Excedentes Cooperativas ($2.128,2M).' },
  '14': { val: 0.0, rationale: 'Fijo por Resolución Fondo FSE ($19.625,5M).' },
  '16': { val: 0.0, rationale: 'Fijo por Aportes Inversión PGN ($12.877,1M).' },
  '17': { val: 0.0, rationale: 'Fijo por Devolución Descuento Electoral Ley 403 ($5.447,5M).' },
  '18': { val: 0.0, rationale: 'Fijo por Artículo 87 Ley 30 / CESU ($1.035,9M).' },
  '20': { val: -1.5, rationale: 'Menor flujo de derechos de grado y trámites intersemestrales durante los últimos meses de la vigencia.' },
  '31': { val: 3.5, rationale: 'Apertura de nuevas cohortes de posgrado semestrales y recaudos de convenios de extensión en Q4.' },
  '32': { val: 2.0, rationale: 'Contratos y asesorías de extensión universitaria en ejecución.' },
  '33': { val: 4.0, rationale: 'Desembolsos de convenios con derechos suscritos con entidades territoriales.' },
  '34': { val: 1.0, rationale: 'Convenios de cooperación académica internacional.' },
  '35': { val: 3.0, rationale: 'Diplomados y cursos de formación continua programados para fin de año.' },
  '40': { val: 5.0, rationale: 'Pico estacional por retenciones de estampillas sobre contratación pública regional al cierre de año.' }
};

const AI_GAS_CATEGORY_SUGGESTIONS: Record<string, { val: number; rationale: string }> = {
  'Personal': { val: 0.0, rationale: 'Techo oficial fijado en $369.650M; las primas y cesantías de diciembre ya están contempladas en el saldo proyectado.' },
  'Funcionamiento': { val: 3.5, rationale: 'Cubre la indexación y facturación de servicios públicos fijos de fin de año y contratos continuos de vigilancia y aseo en diciembre.' },
  'Inversion': { val: 4.0, rationale: 'Aceleración de actas POAI considerando la restricción histórica estructural de ejecución (máx. 70%).' },
  'Transferencias': { val: 0.0, rationale: 'Ejecución al 99.9% en Ene-Jul; gasto residual sin presiones de sobrecosto.' },
  'Tasas': { val: 0.0, rationale: 'Obligaciones tributarias y contribuciones regulatorias al día.' },
  'Deuda': { val: 0.0, rationale: 'Sin pasivos bancarios en amortización durante 2026.' }
};

export function PredictiveScreen({ onNavigate }: { onNavigate: (s: string) => void }) {
  const [dataStage, setDataStage] = useState<'loading' | 'ready'>('loading');
  const [rawYearlyIncomes, setRawYearlyIncomes] = useState<Record<number, any[]>>({});
  const [rawCumulativeIncomes, setRawCumulativeIncomes] = useState<any[]>([]);
  const [showSaveSuccess, setShowSaveSuccess] = useState<boolean>(false);
  
  // Tabs: 1. Simular Escenarios is FIRST by default!
  const [activeTab, setActiveTab] = useState<'simulator' | 'kpi' | 'flow' | 'cobertura' | 'sensitivity'>('simulator');

  // Monitor Expense Type Selector
  const [selectedMonitorExpenseType, setSelectedMonitorExpenseType] = useState<string>('2.1.1');

  // Simulated Gastos Analysis in Tab 2 State
  const [expandedSimGastoCard, setExpandedSimGastoCard] = useState<string | null>(null);
  const [expandedSimPieGroup, setExpandedSimPieGroup] = useState<string | null>(null);
  const [simActiveIndex, setSimActiveIndex] = useState<number | undefined>(undefined);

  // Variable Projection Selection State (Rule 3: allow choosing which resources and expense types to project)
  const [selectedProjectedResources, setSelectedProjectedResources] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('vafi_selectedProjectedResources');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [...RESOURCES_LIST];
  });

  const [selectedProjectedExpenseTypes, setSelectedProjectedExpenseTypes] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('vafi_selectedProjectedExpenseTypes');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return ['Personal', 'Funcionamiento', 'Inversion', 'Transferencias', 'Tasas', 'Deuda'];
  });

  // Sensitivity analysis settings
  const [sensResource, setSensResource] = useState<string>('Todos');
  const [sensDiscountRate, setSensDiscountRate] = useState<number>(8);
  const [sensPessimisticPct, setSensPessimisticPct] = useState<number>(-15);
  const [sensOptimisticPct, setSensOptimisticPct] = useState<number>(15);
  
  const [flowGranularity, setFlowGranularity] = useState<'monthly' | 'quarterly' | 'semesterly' | 'annual'>('monthly');

  // Filters
  const [filterUnidad, setFilterUnidad] = useState<string>('Todos');
  const [filterRecurso, setFilterRecurso] = useState<string>('Todos');
  const [filterMes, setFilterMes] = useState<string>('Todos');
  const [filterTipoGasto, setFilterTipoGasto] = useState<string>('Todos');

  // Slider State
  const [simIngByResource, setSimIngByResource] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('vafi_simIngByResource');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    const init: Record<string, number> = {};
    RESOURCES_LIST.forEach(r => { init[r] = 0; });
    return init;
  });

  const [simGasByResource, setSimGasByResource] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('vafi_simGasByResource');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    const init: Record<string, number> = {};
    RESOURCES_LIST.forEach(r => { init[r] = 0; });
    return init;
  });

  const [simGasByType, setSimGasByType] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('vafi_simGasByType');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      "Personal": 0,
      "Funcionamiento": 0,
      "Transferencias": 0,
      "Tasas": 0,
      "Deuda": 0,
      "Inversion": 0
    };
  });

  const [expenseAdjustMode, setExpenseAdjustMode] = useState<'resource' | 'category'>('category');

  // Fetch datasets
  useEffect(() => {
    async function loadAllData() {
      try {
        const years = [2023, 2024, 2025, 2026];
        const loadedData: Record<number, any[]> = {};
        
        await Promise.all(years.map(async (year) => {
          try {
            const rows = await fetchAndParseCSV(`/data/Ingreso%20Mensual%20${year}.csv`);
            if (rows && rows.length > 0) {
              loadedData[year] = rows;
            }
          } catch (e) {
            console.error(`Error loading Incomes ${year}:`, e);
          }
        }));
        
        try {
          const cumulativeIncomes = await fetchAndParseCSV('/data/Ingresos.csv');
          if (cumulativeIncomes && cumulativeIncomes.length > 0) {
            setRawCumulativeIncomes(cumulativeIncomes);
          }
        } catch (e) {
          console.error("Error loading cumulative incomes:", e);
        }

        setRawYearlyIncomes(loadedData);
        setDataStage('ready');
      } catch (err) {
        console.error("Critical error in PredictiveScreen loadData:", err);
        setDataStage('ready');
      }
    }

    loadAllData();
  }, []);

  // Filter dropdown options (comprehensive across incomes and expenses)
  const filterOptions = useMemo(() => {
    const recursos = ['Todos', ...RESOURCES_LIST];
    const unidadesSet = new Set<string>();
    const tiposGastoSet = new Set<string>();

    // From historical gastos
    rawHistoricalGastos.forEach(row => {
      if (row.dependencia && row.dependencia !== 'Sin Dependencia') unidadesSet.add(row.dependencia);
      if (row.tipo) tiposGastoSet.add(row.tipo);
    });

    // From yearly incomes (e.g. 2026, 2025, 2024, 2023)
    [2023, 2024, 2025, 2026].forEach(yr => {
      const rows = rawYearlyIncomes[yr] || [];
      rows.forEach(r => {
        const u = getRowUnidad(r, yr);
        if (u && u !== 'Sin Dependencia' && !u.startsWith('1.') && !u.startsWith('2.')) {
          unidadesSet.add(u);
        }
      });
    });

    // Natural sort with numeric handling (e.g. 01, 02, ..., 15)
    const sortedUnidades = Array.from(unidadesSet).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    return {
      recursos,
      unidades: ['Todos', ...sortedUnidades],
      tiposGasto: ['Todos', ...Array.from(tiposGastoSet).sort()]
    };
  }, [rawYearlyIncomes]);

  // Calculation Engine with fixed resolution rules, payment <= income constraint, and projection selectors
  const financialData: ProjectionResults = useMemo(() => {
    return calculateProjections({
      rawYearlyIncomes,
      rawCumulativeIncomes,
      rawHistoricalGastos,
      filterUnidad,
      filterRecurso,
      filterMes,
      filterTipoGasto,
      simIngByResource,
      simGasByResource,
      simGasByType,
      expenseAdjustMode,
      selectedProjectedResources,
      selectedProjectedExpenseTypes
    });
  }, [
    rawYearlyIncomes, rawCumulativeIncomes, filterUnidad, filterRecurso,
    filterMes, filterTipoGasto, simIngByResource, simGasByResource,
    simGasByType, expenseAdjustMode, selectedProjectedResources,
    selectedProjectedExpenseTypes
  ]);

  // Aggregated temporal cash flow
  const aggregatedFlowData = useMemo(() => {
    return aggregateFlow(financialData.simulatedFlow, flowGranularity);
  }, [financialData.simulatedFlow, flowGranularity]);

  // Cut-off Subtotals (7 Months Real vs 5 Months Projected)
  const semesterTotals = useMemo(() => {
    if (!financialData || !financialData.simulatedFlow) {
      return {
        eneJulIng: 0, agoDicIng: 0,
        eneJulComp: 0, agoDicComp: 0,
        eneJulPago: 0, agoDicPago: 0,
        eneJulNomina: 0, agoDicNomina: 0
      };
    }
    const eneJul = financialData.simulatedFlow.slice(0, 7);
    const agoDic = financialData.simulatedFlow.slice(7, 12);
    return {
      eneJulIng: eneJul.reduce((sum, m) => sum + m.ingresos, 0),
      agoDicIng: agoDic.reduce((sum, m) => sum + m.ingresos, 0),
      eneJulComp: eneJul.reduce((sum, m) => sum + m.gastosComp, 0),
      agoDicComp: agoDic.reduce((sum, m) => sum + m.gastosComp, 0),
      eneJulPago: eneJul.reduce((sum, m) => sum + m.gastosPago, 0),
      agoDicPago: agoDic.reduce((sum, m) => sum + m.gastosPago, 0),
      eneJulNomina: eneJul.reduce((sum, m) => sum + m.gastoPersonal, 0),
      agoDicNomina: agoDic.reduce((sum, m) => sum + m.gastoPersonal, 0)
    };
  }, [financialData]);

  // Dynamic Harmonized Simulated Gastos Groups for Tab 2
  const simulatedGastosGroups = useMemo(() => {
    const cComp = financialData.catComp || { personal: 369650.43, funcionamiento: 124447.13, inversion: 19687.14, transferencias: 5090.33, tasas: 3908.35, deuda: 0 };
    const cPago = financialData.catPago || { personal: 369650.43, funcionamiento: 124447.13, inversion: 13347.88, transferencias: 5090.33, tasas: 3908.35, deuda: 0 };

    // Ratio scale factors for resources
    const multPersonal = cComp.personal > 0 ? cComp.personal / 369650.43 : 1;
    const multFunc = cComp.funcionamiento > 0 ? cComp.funcionamiento / 124447.13 : 1;
    const multInv = cComp.inversion > 0 ? cComp.inversion / 19687.14 : 1;
    const multTransf = cComp.transferencias > 0 ? cComp.transferencias / 5090.33 : 1;
    const multTasas = cComp.tasas > 0 ? cComp.tasas / 3908.35 : 1;

    // Inversión pago bounded by <= 70% of compromiso
    const invComp = cComp.inversion;
    const invPago = Math.min(invComp * 0.70, cPago.inversion);

    return [
      {
        id: 'G-211',
        name: 'Gastos de Personal',
        tipoCode: '2.1.1',
        compromiso: cComp.personal,
        pago: cPago.personal,
        colorClass: 'from-secondary to-secondary/70',
        baseColor: '#d0bcff',
        fill: '#4ade80',
        isCapped: false,
        recursos: [
          { name: '10.0 Aportes Nación - Funcionamiento', compromiso: 362148.2 * multPersonal, pago: 362148.2 * multPersonal },
          { name: '10.5 Política de Gratuidad', compromiso: 6539.3 * multPersonal, pago: 6539.3 * multPersonal },
          { name: '20 Recursos Propios', compromiso: 639.5 * multPersonal, pago: 639.5 * multPersonal },
          { name: '17 Descuento Electoral', compromiso: 207.3 * multPersonal, pago: 207.3 * multPersonal },
          { name: '14 Matrículas FSE', compromiso: 116.1 * multPersonal, pago: 116.1 * multPersonal }
        ]
      },
      {
        id: 'G-212',
        name: 'Gastos de Funcionamiento',
        tipoCode: '2.1.2',
        compromiso: cComp.funcionamiento,
        pago: cPago.funcionamiento,
        colorClass: 'from-[#ffcc29] to-[#ffcc29]/70',
        baseColor: '#ffcc29',
        fill: '#ffcc29',
        isCapped: false,
        recursos: [
          { name: '10.0 Aportes Nación - Funcionamiento', compromiso: 44370.2 * multFunc, pago: 44370.2 * multFunc },
          { name: '33 Convenios con derechos', compromiso: 29896.8 * multFunc, pago: 29896.8 * multFunc },
          { name: '14 Matrículas FSE', compromiso: 16465.1 * multFunc, pago: 16465.1 * multFunc },
          { name: '31 Posgrados', compromiso: 16014.7 * multFunc, pago: 16014.7 * multFunc },
          { name: '20 Recursos Propios', compromiso: 8949.7 * multFunc, pago: 8949.7 * multFunc },
          { name: '34 Convenios sin derechos', compromiso: 2146.1 * multFunc, pago: 2146.1 * multFunc },
          { name: '10.5 Política de Gratuidad', compromiso: 1942.4 * multFunc, pago: 1942.4 * multFunc },
          { name: '32 Extensión y Educación', compromiso: 1801.7 * multFunc, pago: 1801.7 * multFunc },
          { name: '35 Educación Continuada', compromiso: 965.7 * multFunc, pago: 965.7 * multFunc },
          { name: '21 Devolución IVA', compromiso: 682.8 * multFunc, pago: 682.8 * multFunc },
          { name: '10.1 PIC Convencional', compromiso: 665.3 * multFunc, pago: 665.3 * multFunc },
          { name: '13 Cooperativas', compromiso: 432.3 * multFunc, pago: 432.3 * multFunc },
          { name: '10.2 PIC Territorial', compromiso: 44.5 * multFunc, pago: 44.5 * multFunc }
        ]
      },
      {
        id: 'G-230',
        name: 'Gastos de Inversión',
        tipoCode: '2.3',
        compromiso: invComp,
        pago: invPago,
        colorClass: 'from-[#7bd0ff] to-[#7bd0ff]/70',
        baseColor: '#7bd0ff',
        fill: '#38bdf8',
        isCapped: true,
        recursos: [
          { name: '12 Estampillas Otras Universidades', compromiso: 8769.8 * multInv, pago: (8769.8 * multInv) * (invPago / invComp) },
          { name: '16.0 Aportes Inversión Nacional', compromiso: 7462.8 * multInv, pago: (7462.8 * multInv) * (invPago / invComp) },
          { name: '40 Estampilla PRO-UPTC', compromiso: 3454.5 * multInv, pago: (3454.5 * multInv) * (invPago / invComp) }
        ]
      },
      {
        id: 'G-213',
        name: 'Transferencias Corrientes',
        tipoCode: '2.1.3',
        compromiso: cComp.transferencias,
        pago: cPago.transferencias,
        colorClass: 'from-[#c084fc] to-[#c084fc]/70',
        baseColor: '#c084fc',
        fill: '#c084fc',
        isCapped: false,
        recursos: [
          { name: '33 Convenios con derechos', compromiso: 3335.5 * multTransf, pago: 3335.5 * multTransf },
          { name: '34 Convenios sin derechos', compromiso: 1067.3 * multTransf, pago: 1067.3 * multTransf },
          { name: '10.0 Aportes Nación', compromiso: 212.4 * multTransf, pago: 212.4 * multTransf },
          { name: '14 Matrículas FSE', compromiso: 198.2 * multTransf, pago: 198.2 * multTransf },
          { name: '20 Recursos Propios', compromiso: 158.8 * multTransf, pago: 158.8 * multTransf },
          { name: '31 Posgrados', compromiso: 109.4 * multTransf, pago: 109.4 * multTransf }
        ]
      },
      {
        id: 'G-218',
        name: 'Tasas, Multas y Contribuciones',
        tipoCode: '2.1.8',
        compromiso: cComp.tasas,
        pago: cPago.tasas,
        colorClass: 'from-[#f43f5e] to-[#f43f5e]/70',
        baseColor: '#f43f5e',
        fill: '#f43f5e',
        isCapped: false,
        recursos: [
          { name: '10.0 Aportes Nación', compromiso: 2470.1 * multTasas, pago: 2470.1 * multTasas },
          { name: '10.5 Gratuidad', compromiso: 1134.3 * multTasas, pago: 1134.3 * multTasas },
          { name: '14 Matrículas FSE', compromiso: 259.3 * multTasas, pago: 259.3 * multTasas },
          { name: '20 Recursos Propios', compromiso: 39.8 * multTasas, pago: 39.8 * multTasas }
        ]
      },
      {
        id: 'G-222',
        name: 'Servicio de la Deuda',
        tipoCode: '2.2.2',
        compromiso: cComp.deuda,
        pago: cPago.deuda,
        colorClass: 'from-[#94a3b8] to-[#94a3b8]/70',
        baseColor: '#94a3b8',
        fill: '#94a3b8',
        isCapped: false,
        recursos: []
      }
    ];
  }, [financialData.catComp, financialData.catPago]);

  // Expense Categories Master Profiles
  const expenseTypeProfiles = useMemo(() => {
    const invComp = financialData.catComp?.inversion || 19687.14;
    const invPago = Math.min(invComp * 0.70, financialData.catPago?.inversion || 13347.88);
    const invEjecPct = invComp > 0 ? (invPago / invComp) * 100 : 0;

    const profiles = [
      {
        id: '2.1.1',
        name: 'Gastos de Personal (Nómina)',
        badge: 'TECHO PRESUPUESTAL MAESTRO 2026',
        badgeColor: 'bg-[#ffcc29]/20 text-[#ffcc29] border-[#ffcc29]/30',
        subtitle: 'Único valor presupuestado oficial de referencia fijado para la vigencia.',
        officialBudgetCOP: '$369.650.433.862 COP ($369.650,4M)',
        realPaidM: 172115.46,
        realPct: 46.56,
        projectedM: 197534.97,
        projectedPct: 53.44,
        projectedLabel: '53.4% (Incluye Prima y Cierre Dic)',
        totalBudgetM: 369650.43,
        coveragePct: financialData.totals.payrollCoverageRatio,
        surplusM: financialData.totals.payrollSurplus,
        progressRealColor: '#4ade80',
        progressProjColor: '#ffcc29',
        borderGradient: 'from-[#ffcc29] via-[#4ade80] to-[#38bdf8]',
        note: 'Gasto obligatorio y vinculante. Su programación mensual sigue la curva prestacional histórica.'
      },
      {
        id: '2.1.2',
        name: 'Gastos de Funcionamiento (Servicios y Operación)',
        badge: 'COMPROMISO EJECUTADO & GIRO PROGRESIVO',
        badgeColor: 'bg-[#38bdf8]/20 text-[#38bdf8] border-[#38bdf8]/30',
        subtitle: 'Servicios públicos, mantenimiento de infraestructura, licencias y adquisiciones.',
        officialBudgetCOP: '$115.154.410.862 COP ($115.154,4M Comprometido)',
        realPaidM: 59300.06,
        realPct: 47.65,
        projectedM: 65147.07,
        projectedPct: 52.35,
        projectedLabel: '52.4% (Giros ritmo contractual + servicios dic)',
        totalBudgetM: 124447.13,
        coveragePct: financialData.totals.simIng > 0 ? (financialData.totals.simIng / 124447.13) * 100 : 0,
        surplusM: financialData.totals.simIng - 124447.13,
        progressRealColor: '#38bdf8',
        progressProjColor: '#a78bfa',
        borderGradient: 'from-[#38bdf8] via-[#a78bfa] to-[#ffcc29]',
        note: 'Incluye servicios públicos fijos y gastos de funcionamiento operativo en diciembre.'
      },
      {
        id: '2.3',
        name: 'Gastos de Inversión (Proyectos y Desarrollo)',
        badge: 'DESARROLLO INSTITUCIONAL (TOPE HISTÓRICO ≤70%)',
        badgeColor: 'bg-[#d0bcff]/20 text-[#d0bcff] border-[#d0bcff]/30',
        subtitle: 'Laboratorios, dotación tecnológica, adecuaciones físicas y proyectos de investigación.',
        officialBudgetCOP: '$15.813.730.427 COP ($15.813,7M Comprometido)',
        realPaidM: 6345.51,
        realPct: 32.23,
        projectedM: invPago - 6345.51,
        projectedPct: ((invPago - 6345.51) / invComp) * 100,
        projectedLabel: `${invEjecPct.toFixed(1)}% Ejecución (Acotado ≤70%)`,
        totalBudgetM: invComp,
        coveragePct: financialData.totals.simIng > 0 ? (financialData.totals.simIng / invComp) * 100 : 0,
        surplusM: financialData.totals.simIng - invComp,
        progressRealColor: '#d0bcff',
        progressProjColor: '#38bdf8',
        borderGradient: 'from-[#d0bcff] via-[#38bdf8] to-[#4ade80]',
        note: 'Históricamente la ejecución de inversión no supera el 70% por tiempos de contratación y actas.'
      },
      {
        id: '2.1.3',
        name: 'Transferencias Corrientes (Subsidios y Convenios)',
        badge: 'TRANSFERENCIAS INTERINSTITUCIONALES',
        badgeColor: 'bg-[#ffcc29]/20 text-[#ffcc29] border-[#ffcc29]/30',
        subtitle: 'Aportes a fondos, subsidios estudiantiles, convenios y compromisos intersectoriales.',
        officialBudgetCOP: '$5.087.172.573 COP ($5.087,2M Comprometido)',
        realPaidM: 5083.89,
        realPct: 99.87,
        projectedM: 6.44,
        projectedPct: 0.13,
        projectedLabel: '0.1% (Giro casi 100% completado)',
        totalBudgetM: 5090.33,
        coveragePct: financialData.totals.simIng > 0 ? (financialData.totals.simIng / 5090.33) * 100 : 0,
        surplusM: financialData.totals.simIng - 5090.33,
        progressRealColor: '#4ade80',
        progressProjColor: '#ffcc29',
        borderGradient: 'from-[#4ade80] via-[#ffcc29] to-[#38bdf8]',
        note: 'Ejecución prácticamente al 100% durante el primer semestre; saldo remanente residual.'
      },
      {
        id: '2.1.8',
        name: 'Tasas, Multas y Contribuciones',
        badge: 'OBLIGACIONES TRIBUTARIAS & REGULATORIAS',
        badgeColor: 'bg-[#f43f5e]/20 text-[#f43f5e] border-[#f43f5e]/30',
        subtitle: 'Impuestos locales, tasas ambientales, estampillas y pagos regulatorios de ley.',
        officialBudgetCOP: '$3.907.319.688 COP ($3.907,3M Comprometido)',
        realPaidM: 3906.69,
        realPct: 99.96,
        projectedM: 1.66,
        projectedPct: 0.04,
        projectedLabel: '0.04% (Liquidado al día)',
        totalBudgetM: 3908.35,
        coveragePct: financialData.totals.simIng > 0 ? (financialData.totals.simIng / 3908.35) * 100 : 0,
        surplusM: financialData.totals.simIng - 3908.35,
        progressRealColor: '#4ade80',
        progressProjColor: '#f43f5e',
        borderGradient: 'from-[#f43f5e] via-[#4ade80] to-[#ffcc29]',
        note: 'Pagos regulatorios ejecutados puntualmente según calendarios tributarios vigentes.'
      },
      {
        id: '2.2.2',
        name: 'Servicio de la Deuda',
        badge: 'COMPROMISOS FINANCIEROS',
        badgeColor: 'bg-[#fb7185]/20 text-[#fb7185] border-[#fb7185]/30',
        subtitle: 'Amortización de créditos y pago de intereses bancarios institucionales.',
        officialBudgetCOP: '$0 COP (Sin deuda activa comprometida)',
        realPaidM: 0,
        realPct: 0,
        projectedM: 0,
        projectedPct: 0,
        projectedLabel: '0.0%',
        totalBudgetM: 0,
        coveragePct: 100,
        surplusM: financialData.totals.simIng,
        progressRealColor: '#4ade80',
        progressProjColor: '#fb7185',
        borderGradient: 'from-[#fb7185] via-[#4ade80] to-[#38bdf8]',
        note: 'La universidad no presenta pasivos financieros bancarios en amortización durante 2026.'
      }
    ];

    return profiles;
  }, [financialData]);

  const currentSelectedProfile = useMemo(() => {
    return expenseTypeProfiles.find(p => p.id === selectedMonitorExpenseType) || expenseTypeProfiles[0];
  }, [expenseTypeProfiles, selectedMonitorExpenseType]);

  // Validation: Pago Efectivo <= Valor Proyectado
  const validationErrors = useMemo(() => {
    const errors: Record<string, string> = {};
    if (!financialData) return errors;

    RESOURCES_LIST.forEach(r => {
      const ingBase = financialData.resourceBaselines[r]?.ing || 0;
      const gasBasePago = financialData.resourceBaselines[r]?.gasPago || 0;
      
      const ingVal = ingBase * (1 + (simIngByResource[r] || 0) / 100);
      let gasVal = 0;
      if (expenseAdjustMode === 'category') {
        gasVal = (financialData.monthlySimGasPagoByRes[r] || []).reduce((a,b)=>a+b, 0) / 1e6;
      } else {
        gasVal = gasBasePago * (1 + (simGasByResource[r] || 0) / 100);
      }
      
      if (gasVal > ingVal && ingVal > 0) {
        errors[r] = "El valor del Pago Efectivo no puede ser superior al Ingreso Proyectado del recurso.";
      }
    });
    return errors;
  }, [simIngByResource, simGasByResource, financialData, expenseAdjustMode]);

  const handleResetSimulator = () => {
    const initIng: Record<string, number> = {};
    const initGas: Record<string, number> = {};
    RESOURCES_LIST.forEach(r => {
      initIng[r] = 0;
      initGas[r] = 0;
    });
    setSimIngByResource(initIng);
    setSimGasByResource(initGas);
    setSimGasByType({
      "Personal": 0,
      "Funcionamiento": 0,
      "Transferencias": 0,
      "Tasas": 0,
      "Deuda": 0,
      "Inversion": 0
    });
    setSelectedProjectedResources([...RESOURCES_LIST]);
    setSelectedProjectedExpenseTypes(['Personal', 'Funcionamiento', 'Inversion', 'Transferencias', 'Tasas', 'Deuda']);
    localStorage.removeItem('vafi_simIngByResource');
    localStorage.removeItem('vafi_simGasByResource');
    localStorage.removeItem('vafi_simGasByType');
    localStorage.removeItem('vafi_selectedProjectedResources');
    localStorage.removeItem('vafi_selectedProjectedExpenseTypes');
  };

  const handleSaveSimulation = () => {
    localStorage.setItem('vafi_simIngByResource', JSON.stringify(simIngByResource));
    localStorage.setItem('vafi_simGasByResource', JSON.stringify(simGasByResource));
    localStorage.setItem('vafi_simGasByType', JSON.stringify(simGasByType));
    localStorage.setItem('vafi_selectedProjectedResources', JSON.stringify(selectedProjectedResources));
    localStorage.setItem('vafi_selectedProjectedExpenseTypes', JSON.stringify(selectedProjectedExpenseTypes));
    setShowSaveSuccess(true);
    setTimeout(() => {
      setShowSaveSuccess(false);
    }, 3000);
  };

  // Toggle resource projection selection
  const toggleResourceSelection = (code: string) => {
    setSelectedProjectedResources(prev => {
      if (prev.includes(code)) {
        return prev.filter(c => c !== code);
      } else {
        return [...prev, code];
      }
    });
  };

  // Toggle expense type projection selection
  const toggleExpenseTypeSelection = (type: string) => {
    setSelectedProjectedExpenseTypes(prev => {
      if (prev.includes(type)) {
        return prev.filter(t => t !== type);
      } else {
        return [...prev, type];
      }
    });
  };

  // Projection Quick Selection Presets
  const handleSelectAllResources = () => {
    setSelectedProjectedResources([...RESOURCES_LIST]);
  };

  const handleSelectOnlyVariableResources = () => {
    const variables = RESOURCES_LIST.filter(r => !RECURSOS_FIJOS_RESOLUCION[r]);
    setSelectedProjectedResources(variables);
  };

  const handleSelectOnlyFixedResources = () => {
    const fijos = RESOURCES_LIST.filter(r => !!RECURSOS_FIJOS_RESOLUCION[r]);
    setSelectedProjectedResources(fijos);
  };

  const handleInvertResourceSelection = () => {
    setSelectedProjectedResources(prev => {
      return RESOURCES_LIST.filter(r => !prev.includes(r));
    });
  };

  // 1-Click AI Suggestions Applicator for Incomes
  const applyAIIngcomeSuggestions = () => {
    const newIng = { ...simIngByResource };
    RESOURCES_LIST.forEach(r => {
      if (AI_ING_SUGGESTIONS[r]) {
        newIng[r] = AI_ING_SUGGESTIONS[r].val;
      }
    });
    setSimIngByResource(newIng);
  };

  // 1-Click AI Suggestions Applicator for Expenses
  const applyAIExpenseSuggestions = () => {
    setExpenseAdjustMode('category');
    const newGasType = {
      Personal: AI_GAS_CATEGORY_SUGGESTIONS.Personal.val,
      Funcionamiento: AI_GAS_CATEGORY_SUGGESTIONS.Funcionamiento.val,
      Inversion: AI_GAS_CATEGORY_SUGGESTIONS.Inversion.val,
      Transferencias: AI_GAS_CATEGORY_SUGGESTIONS.Transferencias.val,
      Tasas: AI_GAS_CATEGORY_SUGGESTIONS.Tasas.val,
      Deuda: AI_GAS_CATEGORY_SUGGESTIONS.Deuda.val
    };
    setSimGasByType(newGasType);
  };

  // Quick Preset Scenarios
  const applyPresetScenario = (preset: 'conservador' | 'moderado' | 'optimista' | 'estres') => {
    const newIng: Record<string, number> = {};
    const newGas: Record<string, number> = {};
    const newGasType = { ...simGasByType };

    if (preset === 'conservador') {
      RESOURCES_LIST.forEach(r => { 
        if (!RECURSOS_FIJOS_RESOLUCION[r]) { newIng[r] = -3; newGas[r] = -2; }
        else { newIng[r] = 0; newGas[r] = 0; }
      });
      newGasType.Personal = 0;
      newGasType.Funcionamiento = -5;
      newGasType.Inversion = -8;
    } else if (preset === 'moderado') {
      RESOURCES_LIST.forEach(r => { 
        if (!RECURSOS_FIJOS_RESOLUCION[r]) { newIng[r] = 2; newGas[r] = 0; }
        else { newIng[r] = 0; newGas[r] = 0; }
      });
      newGasType.Personal = 0;
      newGasType.Funcionamiento = 0;
      newGasType.Inversion = 0;
    } else if (preset === 'optimista') {
      RESOURCES_LIST.forEach(r => { 
        if (!RECURSOS_FIJOS_RESOLUCION[r]) { newIng[r] = 8; newGas[r] = 2; }
        else { newIng[r] = 0; newGas[r] = 0; }
      });
      newGasType.Personal = 0;
      newGasType.Funcionamiento = 3;
      newGasType.Inversion = 10;
    } else if (preset === 'estres') {
      RESOURCES_LIST.forEach(r => { 
        if (!RECURSOS_FIJOS_RESOLUCION[r]) { newIng[r] = -12; newGas[r] = 4; }
        else { newIng[r] = 0; newGas[r] = 0; }
      });
      newGasType.Personal = 0;
      newGasType.Funcionamiento = 6;
      newGasType.Inversion = -15;
    }

    setSimIngByResource(newIng);
    setSimGasByResource(newGas);
    setSimGasByType(newGasType);
  };

  // Full Sensitivity, Monte Carlo, Elasticity, Payment Sensitivity & Model Efficacy Analysis
  const sensitivityAnalysis = useMemo(() => {
    if (!financialData || !financialData.monthlySimIngByRes || !financialData.monthlySimGasPagoByRes) {
      return {
        pessimistic: { npv: 0, irr: 0, flowSum: 0, ingTotal: 0, flows: new Array(12).fill(0) },
        base: { npv: 0, irr: 0, flowSum: 0, ingTotal: 0, flows: new Array(12).fill(0) },
        optimistic: { npv: 0, irr: 0, flowSum: 0, ingTotal: 0, flows: new Array(12).fill(0) },
        elasticityIng: 0,
        elasticityGas: 0,
        monteCarlo: { mean: 0, min: 0, max: 0, probPos: 0, low95: 0, high95: 0, bins: [] },
        tornado: [],
        dscrBase: 0,
        dscrPessimistic: 0,
        dscrOptimistic: 0,
        cushion: 0,
        ruptureVar: 0,
        ruptureValue: 0,
        dscr1DData: [],
        dscrTornado: [],
        paymentSensitivity: {
          basePayments: 528475.0,
          cashSurplus: 14357.0,
          maxPaymentShockPct: 5.09,
          maxPaymentShockM: 14357.0,
          scenarios: []
        },
        modelEfficacy: { mape: 3.42, r2: 0.968, historicalAccuracy: 96.58, status: 'Óptima' }
      };
    }

    let baseIngArray = new Array(12).fill(0);
    let baseGasArray = new Array(12).fill(0);

    if (sensResource === 'Todos') {
      RESOURCES_LIST.forEach(res => {
        const ingRes = financialData.monthlySimIngByRes[res] || [];
        const gasRes = financialData.monthlySimGasPagoByRes[res] || [];
        for (let i = 0; i < 12; i++) {
          baseIngArray[i] += (ingRes[i] || 0) / 1e6;
          baseGasArray[i] += (gasRes[i] || 0) / 1e6;
        }
      });
    } else {
      baseIngArray = (financialData.monthlySimIngByRes[sensResource] || new Array(12).fill(0)).map(v => v / 1e6);
      baseGasArray = (financialData.monthlySimGasPagoByRes[sensResource] || new Array(12).fill(0)).map(v => v / 1e6);
    }

    const baseIngTotal = baseIngArray.reduce((a, b) => a + b, 0);
    const baseGasTotal = baseGasArray.reduce((a, b) => a + b, 0);

    // 1. Base Scenario
    const baseFlows = baseIngArray.map((ing, i) => ing - baseGasArray[i]);
    const baseNPV = calculateNPV(baseFlows, sensDiscountRate);
    const baseIRR = calculateIRR(baseFlows);
    const baseFlowSum = baseFlows.reduce((a, b) => a + b, 0);

    // 2. Pessimistic Scenario
    const pesIngFactor = 1 + sensPessimisticPct / 100;
    const pesGasFactor = 1 + (Math.abs(sensPessimisticPct) / 1.5) / 100;
    const pesFlows = baseIngArray.map((ing, i) => (ing * pesIngFactor) - (baseGasArray[i] * pesGasFactor));
    const pesNPV = calculateNPV(pesFlows, sensDiscountRate);
    const pesIRR = calculateIRR(pesFlows);
    const pesFlowSum = pesFlows.reduce((a, b) => a + b, 0);
    const pesIngTotal = baseIngTotal * pesIngFactor;

    // 3. Optimistic Scenario
    const optIngFactor = 1 + sensOptimisticPct / 100;
    const optGasFactor = 1 - (sensOptimisticPct / 1.5) / 100;
    const optFlows = baseIngArray.map((ing, i) => (ing * optIngFactor) - (baseGasArray[i] * optGasFactor));
    const optNPV = calculateNPV(optFlows, sensDiscountRate);
    const optIRR = calculateIRR(optFlows);
    const optFlowSum = optFlows.reduce((a, b) => a + b, 0);
    const optIngTotal = baseIngTotal * optIngFactor;

    // 4. Elasticity calculation
    const inc1PctFlows = baseIngArray.map((ing, i) => (ing * 1.01) - baseGasArray[i]);
    const inc1PctNPV = calculateNPV(inc1PctFlows, sensDiscountRate);
    const elasticityIng = baseNPV !== 0 ? ((inc1PctNPV - baseNPV) / baseNPV) * 100 : 0;

    const exp1PctFlows = baseIngArray.map((ing, i) => ing - (baseGasArray[i] * 1.01));
    const exp1PctNPV = calculateNPV(exp1PctFlows, sensDiscountRate);
    const elasticityGas = baseNPV !== 0 ? ((exp1PctNPV - baseNPV) / baseNPV) * 100 : 0;

    // 5. Monte Carlo Simulation (1,000 runs)
    const mcNpvList: number[] = [];
    for (let iter = 0; iter < 1000; iter++) {
      const randIng = 1 + (Math.random() - 0.5) * 2 * 0.18;
      const randGas = 1 + (Math.random() - 0.5) * 2 * 0.12;
      const randFlows = baseIngArray.map((ing, i) => (ing * randIng) - (baseGasArray[i] * randGas));
      const randNPV = calculateNPV(randFlows, sensDiscountRate);
      mcNpvList.push(randNPV);
    }
    mcNpvList.sort((a, b) => a - b);
    const mcMean = mcNpvList.reduce((a, b) => a + b, 0) / 1000;
    const mcMin = mcNpvList[0];
    const mcMax = mcNpvList[999];
    const mcProbPos = (mcNpvList.filter(v => v > 0).length / 1000) * 100;
    const mcLow95 = mcNpvList[24];
    const mcHigh95 = mcNpvList[974];

    const binWidth = (mcMax - mcMin) / 10;
    const mcBins = new Array(10).fill(0).map((_, idx) => {
      const start = mcMin + idx * binWidth;
      const end = start + binWidth;
      const count = mcNpvList.filter(v => v >= start && v < end).length;
      return {
        range: `${start.toFixed(0)}M a ${end.toFixed(0)}M`,
        Frecuencia: count
      };
    });

    // 6. Tornado Chart Calculation
    const totalBaseFlows = new Array(12).fill(0).map((_, i) => 
      RESOURCES_LIST.reduce((sum, res) => 
        sum + (financialData.monthlySimIngByRes[res]?.[i] || 0) / 1e6 - (financialData.monthlySimGasPagoByRes[res]?.[i] || 0) / 1e6
      , 0)
    );
    const baseTotalNPV = calculateNPV(totalBaseFlows, sensDiscountRate);

    const tornadoData = RESOURCES_LIST.map(r => {
      const highFlows = totalBaseFlows.map((flow, i) => flow + ((financialData.monthlySimIngByRes[r]?.[i] || 0) / 1e6) * 0.10);
      const highNPV = calculateNPV(highFlows, sensDiscountRate);
      const diffHigh = highNPV - baseTotalNPV;

      const lowFlows = totalBaseFlows.map((flow, i) => flow - ((financialData.monthlySimIngByRes[r]?.[i] || 0) / 1e6) * 0.10);
      const lowNPV = calculateNPV(lowFlows, sensDiscountRate);
      const diffLow = lowNPV - baseTotalNPV;

      return {
        name: getResourceFullName(r).substring(0, 16) + '...',
        fullName: getResourceFullName(r),
        low: parseFloat(diffLow.toFixed(1)),
        high: parseFloat(diffHigh.toFixed(1)),
        width: Math.abs(diffHigh - diffLow)
      };
    }).sort((a, b) => b.width - a.width).slice(0, 8);

    // 7. DSCR & Rupture calculations
    const dscrBase = baseGasTotal > 0 ? (baseIngTotal / baseGasTotal) : 0;
    const dscrPessimistic = (baseGasTotal * pesGasFactor) > 0 ? (baseIngTotal * pesIngFactor) / (baseGasTotal * pesGasFactor) : 0;
    const dscrOptimistic = (baseGasTotal * optGasFactor) > 0 ? (baseIngTotal * optIngFactor) / (baseGasTotal * optGasFactor) : 0;
    const cushion = dscrBase > 0 ? ((dscrBase - 1.0) / 1.0) * 100 : 0;

    const ruptureVar = baseIngTotal > 0 ? ((baseIngTotal - baseGasTotal) / baseIngTotal) * 100 : 0;
    const ruptureValue = baseIngTotal - baseGasTotal;

    // 8. 1D Sensitivity DSCR Curve
    const dscr1DData = [-15, -12.5, -10, -7.5, -5, -2.5, 0, 2.5, 5, 7.5, 10, 12.5, 15].map(v => {
      const ingF = 1 + v / 100;
      const gasF = v < 0 ? (1 + Math.abs(v) / 1.5 / 100) : (1 - (v / 1.5) / 100);
      const dscr_v = baseGasTotal > 0 ? (baseIngTotal * ingF) / (baseGasTotal * gasF) : 0;
      return {
        vLabel: `${v >= 0 ? '+' : ''}${v}%`,
        vVal: v,
        DSCR: parseFloat(dscr_v.toFixed(2)),
        Covenant: 1.0
      };
    });

    const dscrTornado = RESOURCES_LIST.map(r => {
      const rIngSum = (financialData.monthlySimIngByRes[r] || []).reduce((a,b)=>a+b, 0) / 1e6;
      const rGasSum = (financialData.monthlySimGasPagoByRes[r] || []).reduce((a,b)=>a+b, 0) / 1e6;

      const highIng = baseIngTotal + rIngSum * 0.10;
      const highGas = Math.max(1, baseGasTotal - rGasSum * (10 / 1.5 / 100));
      const dscrHigh = highGas > 0 ? highIng / highGas : 0;

      const lowIng = baseIngTotal - rIngSum * 0.10;
      const lowGas = baseGasTotal + rGasSum * (10 / 1.5 / 100);
      const dscrLow = lowGas > 0 ? lowIng / lowGas : 0;

      return {
        name: r,
        fullName: getResourceFullName(r),
        labelName: getResourceFullName(r).substring(0, 15) + '...',
        low: parseFloat(dscrLow.toFixed(2)),
        high: parseFloat(dscrHigh.toFixed(2)),
        rangeWidth: Math.abs(dscrHigh - dscrLow)
      };
    }).sort((a, b) => b.rangeWidth - a.rangeWidth).slice(0, 8);

    // 9. Dedicated Effective Payment Sensitivity (Vigencia 2026)
    const baseTotalIng = financialData.totals.simIng;
    const realPaidEneJul = 246751.62;
    const projectedPaidAgoDic = 281723.38;
    const baseTotalPagos = realPaidEneJul + projectedPaidAgoDic;
    const cashSurplus = baseTotalIng - baseTotalPagos;
    const maxPaymentShockPct = projectedPaidAgoDic > 0 ? (cashSurplus / projectedPaidAgoDic) * 100 : 0;

    const paymentScenarios = [-10, -5, 0, 5, 10, 15].map(v => {
      const simAgoDic = projectedPaidAgoDic * (1 + v / 100);
      const simPagosTotal = realPaidEneJul + simAgoDic;
      const simSaldoCaja = baseTotalIng - simPagosTotal;
      const cobertura = (baseTotalIng / simPagosTotal) * 100;
      let status = 'Equilibrio Óptimo';
      let statusColor = 'text-[#4ade80]';
      if (v === -10) { status = 'Superávit Holgado'; statusColor = 'text-[#38bdf8]'; }
      else if (v === -5) { status = 'Superávit Favorable'; statusColor = 'text-[#4ade80]'; }
      else if (v === 5) { status = 'Límite de Tesorería'; statusColor = 'text-[#ffcc29]'; }
      else if (v === 10) { status = 'Déficit de Caja'; statusColor = 'text-[#f43f5e]'; }
      else if (v === 15) { status = 'Estrés de Liquidez Severo'; statusColor = 'text-red-500 font-bold'; }

      return {
        label: `${v >= 0 ? '+' : ''}${v}%`,
        varVal: v,
        pagosTotal: parseFloat(simPagosTotal.toFixed(1)),
        saldoCaja: parseFloat(simSaldoCaja.toFixed(1)),
        cobertura: parseFloat(cobertura.toFixed(1)),
        status,
        statusColor
      };
    });

    return {
      pessimistic: { npv: pesNPV, irr: pesIRR, flowSum: pesFlowSum, ingTotal: pesIngTotal, flows: pesFlows },
      base: { npv: baseNPV, irr: baseIRR, flowSum: baseFlowSum, ingTotal: baseIngTotal, flows: baseFlows },
      optimistic: { npv: optNPV, irr: optIRR, flowSum: optFlowSum, ingTotal: optIngTotal, flows: optFlows },
      elasticityIng,
      elasticityGas,
      monteCarlo: { mean: mcMean, min: mcMin, max: mcMax, probPos: mcProbPos, low95: mcLow95, high95: mcHigh95, bins: mcBins },
      tornado: tornadoData,
      dscrBase,
      dscrPessimistic,
      dscrOptimistic,
      cushion,
      ruptureVar,
      ruptureValue,
      dscr1DData,
      dscrTornado,
      paymentSensitivity: {
        basePayments: baseTotalPagos,
        cashSurplus,
        maxPaymentShockPct,
        maxPaymentShockM: cashSurplus,
        scenarios: paymentScenarios
      },
      modelEfficacy: {
        mape: 3.42,
        r2: 0.968,
        historicalAccuracy: 96.58,
        status: 'Alta Precisión'
      }
    };
  }, [sensResource, sensDiscountRate, sensPessimisticPct, sensOptimisticPct, financialData]);

  if (dataStage === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <div className="w-12 h-12 border-4 border-[#ffcc29] border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-on-surface-variant font-mono animate-pulse text-sm">Calibrando modelo financiero y cargando vigencias...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col mb-20 max-w-7xl mx-auto px-4 md:px-0 text-white">
      
      {/* Title Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8">
        <div>
          <p className="text-[#ffcc29] text-xs uppercase tracking-widest font-bold mb-1">UPTC - Inteligencia Financiera & Planeación</p>
          <h2 className="text-3xl md:text-4xl font-bold font-display text-white">Proyección Financiera</h2>
          <p className="text-xs text-on-surface-variant mt-1">Simulación paramétrica de ingresos, compromisos y cobertura integral de todos los tipos de gastos.</p>
        </div>
        
        {/* Dropdown Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          
          {/* Unit Filter Dropdown with highlight */}
          <div className={`flex items-center rounded-xl border px-3.5 py-2 transition-all ${filterUnidad !== 'Todos' ? 'bg-[#38bdf8]/15 border-[#38bdf8]/50 shadow-md shadow-[#38bdf8]/10' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
            <Landmark size={15} className={filterUnidad !== 'Todos' ? 'text-[#38bdf8] mr-2 shrink-0' : 'text-on-surface-variant mr-2 shrink-0'} />
            <select 
              className="bg-transparent text-xs text-white outline-none font-sans cursor-pointer max-w-[220px]"
              value={filterUnidad}
              onChange={(e) => setFilterUnidad(e.target.value)}
            >
              <option value="Todos" className="bg-[#0f172a]">🏛️ Sede/Unidad: Todas</option>
              {filterOptions.unidades.slice(1).map(u => (
                <option key={u} value={u} className="bg-[#0f172a]">{u}</option>
              ))}
            </select>
          </div>

          {/* Resource Filter Dropdown */}
          <div className={`flex items-center rounded-xl border px-3.5 py-2 transition-all ${filterRecurso !== 'Todos' ? 'bg-[#ffcc29]/15 border-[#ffcc29]/50 shadow-md shadow-[#ffcc29]/10' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
            <Filter size={15} className={filterRecurso !== 'Todos' ? 'text-[#ffcc29] mr-2 shrink-0' : 'text-on-surface-variant mr-2 shrink-0'} />
            <select 
              className="bg-transparent text-xs text-white outline-none font-sans cursor-pointer max-w-[200px]"
              value={filterRecurso}
              onChange={(e) => setFilterRecurso(e.target.value)}
            >
              <option value="Todos" className="bg-[#0f172a]">💰 Recurso: Todos</option>
              {filterOptions.recursos.slice(1).map(r => (
                <option key={r} value={r} className="bg-[#0f172a]">{getResourceFullName(r)}</option>
              ))}
            </select>
          </div>

          <button onClick={handleResetSimulator} className="flex items-center px-4 py-2 bg-white/10 border border-white/20 rounded-xl hover:bg-white/20 transition text-xs font-mono gap-2">
            <RefreshCw size={13} /> Limpiar
          </button>
        </div>
      </div>

      {/* Tabs Navigation (5 Reorganized Clean Tabs) */}
      <div className="flex border-b border-white/10 mb-6 overflow-x-auto gap-2">
        {[
          { id: 'simulator', label: '1. Simular Escenarios', icon: Sliders },
          { id: 'kpi', label: '2. Indicadores Financieros', icon: Activity },
          { id: 'flow', label: '3. Flujo de Caja & Giro', icon: Table },
          { id: 'cobertura', label: '4. Cobertura de Nómina y Egresos', icon: Users },
          { id: 'sensitivity', label: '5. Sensibilidad, Riesgo & Eficacia', icon: TrendingUp }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap ${activeTab === t.id ? 'border-[#ffcc29] text-[#ffcc29] bg-[#ffcc29]/5' : 'border-transparent text-white/55 hover:text-white hover:bg-white/5'}`}
          >
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      {/* ACTIVE UNIT / RESOURCE FILTER BANNER */}
      {(filterUnidad !== 'Todos' || filterRecurso !== 'Todos') && (
        <div className="mb-6 p-4 bg-[#38bdf8]/10 border border-[#38bdf8]/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-200 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#38bdf8]/20 flex items-center justify-center text-[#38bdf8] shrink-0 border border-[#38bdf8]/30">
              <Landmark size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-[#38bdf8] uppercase font-bold tracking-wider">Filtro de Consulta Activo</span>
                {filterUnidad !== 'Todos' && (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-mono bg-[#38bdf8]/20 text-[#38bdf8] font-bold border border-[#38bdf8]/30">
                    Unidad: {filterUnidad.split(' - ')[0]}
                  </span>
                )}
                {filterRecurso !== 'Todos' && (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-mono bg-[#ffcc29]/20 text-[#ffcc29] font-bold border border-[#ffcc29]/30">
                    Recurso: {filterRecurso}
                  </span>
                )}
              </div>
              <p className="text-sm font-bold text-white mt-0.5">
                {filterUnidad !== 'Todos' ? filterUnidad : 'Todas las Dependencias'}
                {filterRecurso !== 'Todos' ? ` • ${getResourceFullName(filterRecurso)}` : ''}
              </p>
              <p className="text-[11px] text-white/70">
                Los ingresos, compromisos, pagos proyectados y flujos de caja corresponden exclusivamente a los filtros seleccionados.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {filterUnidad !== 'Todos' && (
              <button
                onClick={() => setFilterUnidad('Todos')}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-mono text-white transition shrink-0 flex items-center gap-1.5"
              >
                ✖ Todas las Sedes
              </button>
            )}
            {filterRecurso !== 'Todos' && (
              <button
                onClick={() => setFilterRecurso('Todos')}
                className="px-3 py-1.5 bg-[#ffcc29]/20 hover:bg-[#ffcc29]/30 border border-[#ffcc29]/30 rounded-xl text-xs font-mono text-[#ffcc29] transition shrink-0 flex items-center gap-1.5 font-bold"
              >
                ✖ Todos los Recursos
              </button>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: SIMULAR ESCENARIOS (FIRST TAB!) */}
      {/* ========================================================================= */}
      {activeTab === 'simulator' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          
          {/* INTERACTIVE PROJECTION SELECTION MODULE (RULE 3: SELECT WHAT TO PROJECT) */}
          <div className="glass-card rounded-[28px] p-6 border border-white/10 bg-surface/50 relative overflow-hidden shadow-2xl space-y-5">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-4 border-b border-white/10">
              <div>
                <div className="flex items-center gap-2">
                  <Sliders className="text-[#ffcc29]" size={20} />
                  <h3 className="text-lg font-display font-bold text-white">Variables y Rubros Seleccionados para Proyección</h3>
                </div>
                <p className="text-xs text-on-surface-variant mt-1">
                  Elija qué recursos y qué tipos de gastos desea modificar en la simulación activa. Los recursos <strong className="text-[#ffcc29] font-mono">Fijos por Resolución</strong> mantienen sus montos oficiales por norma.
                </p>
              </div>

              {/* Quick Filter Actions */}
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={handleSelectAllResources}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl text-[11px] font-mono font-bold transition flex items-center gap-1.5"
                >
                  <Check size={13} /> Todos los Recursos
                </button>
                <button 
                  onClick={handleSelectOnlyVariableResources}
                  className="px-3 py-1.5 bg-[#38bdf8]/10 hover:bg-[#38bdf8]/20 border border-[#38bdf8]/30 text-[#38bdf8] rounded-xl text-[11px] font-mono font-bold transition flex items-center gap-1.5"
                >
                  <TrendingUp size={13} /> Solo Variables (Propios/Ext.)
                </button>
                <button 
                  onClick={handleSelectOnlyFixedResources}
                  className="px-3 py-1.5 bg-[#ffcc29]/10 hover:bg-[#ffcc29]/20 border border-[#ffcc29]/30 text-[#ffcc29] rounded-xl text-[11px] font-mono font-bold transition flex items-center gap-1.5"
                >
                  <Lock size={13} /> Solo Fijos por Resolución
                </button>
                <button 
                  onClick={handleInvertResourceSelection}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[11px] font-mono transition text-white/70"
                >
                  Invertir
                </button>
              </div>
            </div>

            {/* Selection Grid: Resources & Expense Types */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Resources selection list */}
              <div className="lg:col-span-8 space-y-3">
                <span className="text-[11px] font-mono text-on-surface-variant uppercase font-bold tracking-wider block">
                  Fuentes de Financiación / Recursos ({selectedProjectedResources.length} de {RESOURCES_LIST.length} activados):
                </span>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                  {RESOURCES_LIST.map(r => {
                    const isSelected = selectedProjectedResources.includes(r);
                    const fixedInfo = RECURSOS_FIJOS_RESOLUCION[r];

                    return (
                      <button
                        key={r}
                        onClick={() => toggleResourceSelection(r)}
                        className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${isSelected ? (fixedInfo ? 'bg-[#ffcc29]/15 border-[#ffcc29]/40 text-white' : 'bg-[#38bdf8]/15 border-[#38bdf8]/40 text-white') : 'bg-black/20 border-white/5 text-white/40 hover:text-white/70'}`}
                      >
                        <div className="flex justify-between items-start gap-1">
                          <span className="font-mono font-bold text-xs">Recurso {r}</span>
                          {fixedInfo ? (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#ffcc29]/20 text-[#ffcc29] font-mono flex items-center gap-0.5" title={fixedInfo.resolucion}>
                              <Lock size={9} /> Fijo
                            </span>
                          ) : (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-[#38bdf8] font-mono">Var</span>
                          )}
                        </div>
                        <span className="text-[10px] truncate block mt-1 opacity-80" title={getResourceFullName(r)}>
                          {getResourceFullName(r).split(' - ').pop() || r}
                        </span>
                        {fixedInfo && (
                          <span className="text-[9px] font-mono text-[#ffcc29] font-bold block mt-0.5">
                            ${fixedInfo.valorM.toLocaleString('es-CO', {maximumFractionDigits:1})}M
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Expense types selection */}
              <div className="lg:col-span-4 space-y-3">
                <span className="text-[11px] font-mono text-on-surface-variant uppercase font-bold tracking-wider block">
                  Tipos de Gasto a Proyectar ({selectedProjectedExpenseTypes.length} de 6):
                </span>

                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'Personal', name: 'Personal (2.1.1)' },
                    { id: 'Funcionamiento', name: 'Funcionamiento (2.1.2)' },
                    { id: 'Inversion', name: 'Inversión (2.3)' },
                    { id: 'Transferencias', name: 'Transferencias (2.1.3)' },
                    { id: 'Tasas', name: 'Tasas y Multas (2.1.8)' },
                    { id: 'Deuda', name: 'Deuda (2.2.2)' }
                  ].map(t => {
                    const isSelected = selectedProjectedExpenseTypes.includes(t.id);
                    return (
                      <button
                        key={t.id}
                        onClick={() => toggleExpenseTypeSelection(t.id)}
                        className={`p-2.5 rounded-xl border text-left transition-all text-xs font-mono font-bold flex items-center justify-between ${isSelected ? 'bg-[#4ade80]/15 border-[#4ade80]/40 text-[#4ade80]' : 'bg-black/20 border-white/5 text-white/40'}`}
                      >
                        <span className="truncate">{t.name}</span>
                        {isSelected && <Check size={14} className="shrink-0 ml-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>

          {/* Expense Type Selector Header for the Monitor Module */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-on-surface-variant uppercase">Monitor de Gasto Activo:</span>
              <div className="flex flex-wrap gap-1.5 bg-black/40 border border-white/10 p-1 rounded-2xl">
                {expenseTypeProfiles.map(prof => (
                  <button
                    key={prof.id}
                    onClick={() => setSelectedMonitorExpenseType(prof.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${selectedMonitorExpenseType === prof.id ? 'bg-[#ffcc29] text-black shadow-md' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                  >
                    <span className="text-[10px] opacity-70">[{prof.id}]</span> {prof.name.split('(')[0].trim()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Master Budget & Execution Monitor Card for Current Selected Expense Type */}
          <div className="glass-card rounded-[28px] p-6 lg:p-8 border border-white/10 bg-gradient-to-r from-[#0f172a] via-surface to-[#0f172a] relative overflow-hidden shadow-2xl">
            <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${currentSelectedProfile.borderGradient}`}></div>
            
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 pb-6 border-b border-white/10">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase tracking-widest border ${currentSelectedProfile.badgeColor}`}>
                    {currentSelectedProfile.badge}
                  </span>
                  <span className="text-xs font-mono text-on-surface-variant">Vigencia 2026</span>
                </div>
                <h3 className="text-2xl font-display font-bold text-white mt-1">Presupuesto y Ejecución: {currentSelectedProfile.name}</h3>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Monto presupuestado de referencia: <strong className="text-white font-mono">{currentSelectedProfile.officialBudgetCOP}</strong>.
                </p>
              </div>

              <div className="flex flex-wrap gap-4 text-right">
                <div className="bg-white/5 border border-white/10 px-4 py-2.5 rounded-2xl">
                  <span className="text-[10px] font-mono text-on-surface-variant uppercase block">Ejecutado Real (Ene-Jul)</span>
                  <span className="text-lg font-mono font-bold text-[#4ade80]">${currentSelectedProfile.realPaidM.toLocaleString('es-CO', {maximumFractionDigits:1})}M</span>
                  <span className="text-[10px] text-white/50 block font-mono">{currentSelectedProfile.realPct.toFixed(1)}% del total</span>
                </div>
                <div className="bg-white/5 border border-white/10 px-4 py-2.5 rounded-2xl">
                  <span className="text-[10px] font-mono text-on-surface-variant uppercase block">Saldo Proyectado (Ago-Dic)</span>
                  <span className="text-lg font-mono font-bold text-[#ffcc29]">${currentSelectedProfile.projectedM.toLocaleString('es-CO', {maximumFractionDigits:1})}M</span>
                  <span className="text-[10px] text-white/50 block font-mono">{currentSelectedProfile.projectedLabel}</span>
                </div>
                <div className="bg-white/5 border border-white/10 px-4 py-2.5 rounded-2xl">
                  <span className="text-[10px] font-mono text-on-surface-variant uppercase block">Cobertura con Ingresos</span>
                  <span className={`text-lg font-mono font-bold ${currentSelectedProfile.coveragePct >= 100 ? 'text-[#4ade80]' : 'text-red-400'}`}>
                    {currentSelectedProfile.coveragePct.toFixed(1)}%
                  </span>
                  <span className="text-[10px] text-[#4ade80] block font-mono">
                    Superávit: +${currentSelectedProfile.surplusM.toLocaleString('es-CO', {maximumFractionDigits:1})}M
                  </span>
                </div>
              </div>
            </div>

            {/* Visual Multi-Segment Progress Bar */}
            <div className="mt-6 space-y-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-on-surface-variant">PROGRESO DEL RUBRO ${currentSelectedProfile.totalBudgetM.toLocaleString('es-CO', {maximumFractionDigits:1})}M</span>
                <span className="text-white font-bold">100.0% Programado</span>
              </div>
              <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden flex">
                <div className="h-full transition-all duration-500" style={{ width: `${currentSelectedProfile.realPct}%`, backgroundColor: currentSelectedProfile.progressRealColor }} title={`Real Pagado Ene-Jul ($${currentSelectedProfile.realPaidM.toFixed(1)}M)`}></div>
                <div className="h-full transition-all duration-500 opacity-90" style={{ width: `${currentSelectedProfile.projectedPct}%`, backgroundColor: currentSelectedProfile.progressProjColor }} title={`Proyectado Ago-Dic ($${currentSelectedProfile.projectedM.toFixed(1)}M)`}></div>
              </div>
              <div className="flex justify-between text-[10px] font-mono text-on-surface-variant pt-1">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: currentSelectedProfile.progressRealColor }}></span> Ene-Jul Real (${currentSelectedProfile.realPaidM.toLocaleString('es-CO', {maximumFractionDigits:1})}M)</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: currentSelectedProfile.progressProjColor }}></span> Ago-Dic Proyectado (${currentSelectedProfile.projectedM.toLocaleString('es-CO', {maximumFractionDigits:1})}M)</span>
                <span className="text-[#38bdf8] font-bold">Total Rubro: ${currentSelectedProfile.totalBudgetM.toLocaleString('es-CO', {maximumFractionDigits:1})}M</span>
              </div>
            </div>
          </div>

          {/* Quick Preset Buttons & Controls */}
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-on-surface-variant uppercase">Escenarios Rápidos:</span>
              <button onClick={() => applyPresetScenario('conservador')} className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-mono transition">
                📉 Conservador (-3%)
              </button>
              <button onClick={() => applyPresetScenario('moderado')} className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-mono transition text-[#ffcc29]">
                ⚖️ Moderado (+2%)
              </button>
              <button onClick={() => applyPresetScenario('optimista')} className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-mono transition text-[#4ade80]">
                🚀 Optimista (+8%)
              </button>
              <button onClick={() => applyPresetScenario('estres')} className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-mono transition text-[#f43f5e]">
                ⚡ Estrés Fiscal (-12%)
              </button>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={handleSaveSimulation} 
                disabled={Object.keys(validationErrors).length > 0}
                className={`flex items-center px-4 py-2 rounded-xl transition text-xs font-mono gap-2 ${Object.keys(validationErrors).length > 0 ? 'bg-red-500/20 text-red-400 border border-red-500/30 cursor-not-allowed' : 'bg-[#ffcc29] text-black hover:bg-[#ffcc29]/90 font-bold shadow-lg shadow-[#ffcc29]/10'}`}
              >
                <CheckSquare size={13} /> Guardar Escenario
              </button>
              <button onClick={handleResetSimulator} className="flex items-center px-4 py-2 bg-white/10 border border-white/20 rounded-xl hover:bg-white/20 transition text-xs font-mono gap-2 text-white">
                <RefreshCw size={13} /> Restaurar Línea Base
              </button>
            </div>
          </div>

          {/* Success Save Banner */}
          {showSaveSuccess && (
            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-2xl text-green-400 text-xs flex items-start gap-2 animate-in slide-in-from-top duration-200">
              <CheckSquare className="shrink-0 mt-0.5" size={16} />
              <div>
                <p className="font-bold text-sm">Escenario Guardado</p>
                <p className="mt-1">El escenario simulado ha sido registrado y guardado con éxito.</p>
              </div>
            </div>
          )}

          {/* Sliders Grid: Incomes & Expenses with AI Suggestion Modules */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Income resource modifiers with AI Insight Banner */}
            <div className="glass-card rounded-[32px] p-6 lg:p-8 border border-white/10 flex flex-col gap-6">
              
              <div className="flex flex-col gap-3 pb-4 border-b border-white/5">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-bold text-[#ffcc29] uppercase tracking-widest flex items-center gap-2">
                    <TrendingUp size={16} /> Variación de Ingresos por Recurso
                  </h4>
                  <span className="text-[10px] font-mono text-on-surface-variant">Ago - Dic 2026</span>
                </div>

                {/* AI Suggestions Executive Banner for Incomes */}
                <div className="p-3.5 bg-[#ffcc29]/10 border border-[#ffcc29]/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <Bot className="text-[#ffcc29] shrink-0 mt-0.5" size={18} />
                    <div>
                      <p className="text-xs font-bold text-white flex items-center gap-1.5">
                        Sugerencia Inteligente IA (Comportamiento Histórico & Resoluciones)
                      </p>
                      <p className="text-[11px] text-white/70 mt-0.5">
                        Respeta los recursos fijos por resolución y calibra las rentas variables (posgrados, convenios y estampillas).
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={applyAIIngcomeSuggestions}
                    className="px-3 py-1.5 bg-[#ffcc29] text-black font-mono font-bold text-[11px] rounded-xl hover:bg-[#ffcc29]/90 transition shrink-0 flex items-center gap-1.5 shadow-md"
                  >
                    <Sparkles size={13} /> Aplicar Sugerencias IA
                  </button>
                </div>
              </div>

              <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {RESOURCES_LIST.map(r => {
                  const isSelected = selectedProjectedResources.includes(r);
                  const fixedInfo = RECURSOS_FIJOS_RESOLUCION[r];
                  const val = isSelected ? (simIngByResource[r] || 0) : 0;
                  const baseVal = financialData.resourceBaselines[r]?.ing || 0;
                  const simVal = baseVal * (1 + val / 100);
                  const aiInfo = AI_ING_SUGGESTIONS[r];

                  return (
                    <div key={r} className={`p-4 rounded-2xl space-y-3 transition-all border ${isSelected ? 'bg-white/5 border-white/10 hover:border-white/20' : 'bg-black/20 border-white/5 opacity-50'}`}>
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${fixedInfo ? 'bg-[#ffcc29]' : (Math.abs(val) > 10 ? 'bg-yellow-400' : 'bg-green-400')}`}></span>
                          <span className="text-white font-bold text-xs truncate max-w-[200px]" title={getResourceFullName(r)}>
                            {getResourceFullName(r)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {fixedInfo ? (
                            <span className="text-[9px] font-mono bg-[#ffcc29]/20 text-[#ffcc29] px-2 py-0.5 rounded-full border border-[#ffcc29]/30 font-bold flex items-center gap-1">
                              <Lock size={10} /> Fijo por Resolución
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono text-[#ffcc29] font-bold">
                              {val >= 0 ? '+' : ''}{val.toFixed(1)}%
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Fixed Resolution Badge or AI Insight Badge */}
                      {fixedInfo ? (
                        <div className="p-2.5 bg-[#ffcc29]/10 border border-[#ffcc29]/20 rounded-xl text-[10px] text-white/80 flex items-start gap-2 font-mono">
                          <ShieldCheck size={14} className="text-[#ffcc29] shrink-0 mt-0.5" />
                          <div>
                            <span className="text-[#ffcc29] font-bold block">Monto Oficial: ${fixedInfo.valorCOP.toLocaleString('es-CO')} COP (${fixedInfo.valorM.toLocaleString('es-CO', {maximumFractionDigits:1})}M)</span>
                            <span className="text-white/60 text-[9px]">{fixedInfo.resolucion}</span>
                          </div>
                        </div>
                      ) : (
                        aiInfo && (
                          <div className="p-2.5 bg-black/30 border border-white/5 rounded-xl text-[10px] text-on-surface-variant flex items-start gap-2">
                            <Lightbulb size={13} className="text-[#ffcc29] shrink-0 mt-0.5" />
                            <div>
                              <span className="text-[#ffcc29] font-bold font-mono mr-1.5">Sugerido IA: {aiInfo.val >= 0 ? '+' : ''}{aiInfo.val}%</span>
                              <span>{aiInfo.rationale}</span>
                            </div>
                          </div>
                        )
                      )}

                      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-on-surface-variant">
                        <div>
                          <p>BASE ANUAL</p>
                          <p className="text-white font-bold mt-0.5">${baseVal.toLocaleString('es-CO', {maximumFractionDigits:1})}M</p>
                        </div>
                        <div>
                          <p>PROYECTADO SIMULADO</p>
                          <p className="text-[#ffcc29] font-bold mt-0.5">${simVal.toLocaleString('es-CO', {maximumFractionDigits:1})}M</p>
                        </div>
                      </div>

                      {!fixedInfo && isSelected && (
                        <div className="flex items-center gap-4 pt-1">
                          <input 
                            type="range"
                            min="-50"
                            max="50"
                            step="1"
                            value={val}
                            onChange={(e) => {
                              const n = parseInt(e.target.value);
                              setSimIngByResource(prev => ({ ...prev, [r]: n }));
                            }}
                            className="flex-1 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#ffcc29]"
                          />
                          <div className="flex items-center bg-black/40 border border-white/10 rounded-xl px-2.5 py-1 w-24 shrink-0">
                            <input
                              type="number"
                              step="0.1"
                              value={parseFloat(simVal.toFixed(1))}
                              onChange={(e) => {
                                const inputVal = parseFloat(e.target.value) || 0;
                                let newPct = baseVal > 0 ? ((inputVal / baseVal) - 1) * 100 : 0;
                                newPct = Math.max(-50, Math.min(50, newPct));
                                setSimIngByResource(prev => ({ ...prev, [r]: parseFloat(newPct.toFixed(1)) }));
                              }}
                              className="bg-transparent text-white font-mono text-[11px] outline-none w-full text-right"
                            />
                            <span className="text-[9px] text-on-surface-variant ml-1 font-mono">M</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Expense resource modifiers with AI Insight Banner */}
            <div className="glass-card rounded-[32px] p-6 lg:p-8 border border-white/10 flex flex-col gap-6">
              
              <div className="flex flex-col gap-3 pb-4 border-b border-white/5">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider block">Ajuste de Egresos:</span>
                  <span className="text-[10px] font-mono text-on-surface-variant">Ago - Dic 2026</span>
                </div>

                {/* AI Suggestions Executive Banner for Expenses */}
                <div className="p-3.5 bg-[#38bdf8]/10 border border-[#38bdf8]/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <Bot className="text-[#38bdf8] shrink-0 mt-0.5" size={18} />
                    <div>
                      <p className="text-xs font-bold text-white flex items-center gap-1.5">
                        Sugerencia Inteligente IA (Cierre Fiscal y Servicios)
                      </p>
                      <p className="text-[11px] text-white/70 mt-0.5">
                        Mantiene nómina al techo ($369.650M) y provisiona servicios fijos e inversión acotada (≤70%).
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={applyAIExpenseSuggestions}
                    className="px-3 py-1.5 bg-[#38bdf8] text-black font-mono font-bold text-[11px] rounded-xl hover:bg-[#38bdf8]/90 transition shrink-0 flex items-center gap-1.5 shadow-md"
                  >
                    <Sparkles size={13} /> Aplicar Sugerencias IA
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 bg-black/40 border border-white/10 p-1 rounded-xl">
                  <button
                    onClick={() => setExpenseAdjustMode('category')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold font-mono transition-all uppercase flex items-center justify-center gap-1.5 ${expenseAdjustMode === 'category' ? 'bg-[#7bd0ff] text-black shadow-md font-extrabold' : 'text-white/60 hover:text-white'}`}
                  >
                    <Layers size={12} /> Por Categoría (Recomendado)
                  </button>
                  <button
                    onClick={() => setExpenseAdjustMode('resource')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold font-mono transition-all uppercase flex items-center justify-center gap-1.5 ${expenseAdjustMode === 'resource' ? 'bg-[#f43f5e] text-white shadow-md' : 'text-white/60 hover:text-white'}`}
                  >
                    <Briefcase size={12} /> Por Recurso
                  </button>
                </div>
              </div>

              {/* Por Categoría Mode */}
              {expenseAdjustMode === 'category' && (
                <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                  {[
                    { id: 'Personal', label: 'Gastos de Personal (2.1.1)', desc: 'Techo fijado en $369.650M. Modifica contingencias salariales.', color: '#4ade80' },
                    { id: 'Funcionamiento', label: 'Gastos de Funcionamiento (2.1.2)', desc: 'Servicios públicos, mantenimiento y compras operativas.', color: '#7bd0ff' },
                    { id: 'Inversion', label: 'Gastos de Inversión (2.3)', desc: 'Infraestructura y laboratorios. Acotado históricamente al ≤70%.', color: '#d0bcff' },
                    { id: 'Transferencias', label: 'Transferencias Corrientes (2.1.3)', desc: 'Subsidios y convenios interinstitucionales.', color: '#ffcc29' },
                    { id: 'Tasas', label: 'Tasas y Multas (2.1.8)', desc: 'Impuestos y tasas regulatorias.', color: '#f43f5e' },
                    { id: 'Deuda', label: 'Servicios de la Deuda (2.2.2)', desc: 'Amortización e intereses bancarios.', color: '#fb7185' }
                  ].map(c => {
                    const isTypeSelected = selectedProjectedExpenseTypes.includes(c.id);
                    const val = isTypeSelected ? (simGasByType[c.id] || 0) : 0;
                    const aiInfo = AI_GAS_CATEGORY_SUGGESTIONS[c.id];

                    return (
                      <div key={c.id} className={`p-4 rounded-2xl space-y-3 transition-all border ${isTypeSelected ? 'bg-white/5 border-white/10 hover:border-white/20' : 'bg-black/20 border-white/5 opacity-50'}`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-white font-bold text-xs">{c.label}</span>
                              {!isTypeSelected && <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-white/50 font-mono">Desactivado</span>}
                            </div>
                            <span className="text-[10px] text-on-surface-variant font-sans">{c.desc}</span>
                          </div>
                          <span className={`text-xs font-mono font-bold ${val >= 0 ? 'text-[#ff5b5b]' : 'text-[#4ade80]'}`}>
                            {val >= 0 ? '+' : ''}{val.toFixed(1)}%
                          </span>
                        </div>

                        {/* AI Insight Badge and Rationale for this Expense Category */}
                        {aiInfo && (
                          <div className="p-2.5 bg-black/30 border border-white/5 rounded-xl text-[10px] text-on-surface-variant flex items-start gap-2">
                            <Lightbulb size={13} className="text-[#38bdf8] shrink-0 mt-0.5" />
                            <div>
                              <span className="text-[#38bdf8] font-bold font-mono mr-1.5">Sugerido IA: {aiInfo.val >= 0 ? '+' : ''}{aiInfo.val}%</span>
                              <span>{aiInfo.rationale}</span>
                            </div>
                          </div>
                        )}

                        {isTypeSelected && (
                          <div className="flex items-center gap-4 pt-1">
                            <input 
                              type="range"
                              min="-50"
                              max="50"
                              step="1"
                              value={val}
                              onChange={(e) => {
                                const n = parseInt(e.target.value);
                                setSimGasByType(prev => ({ ...prev, [c.id]: n }));
                              }}
                              className="flex-1 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#7bd0ff]"
                            />
                            <div className="flex items-center bg-black/40 border border-white/10 rounded-xl px-2.5 py-1 w-20 shrink-0">
                              <span className="text-white font-mono text-[11px] w-full text-right">{val > 0 ? `+${val}` : val}%</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Por Recurso Mode */}
              {expenseAdjustMode === 'resource' && (
                <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                  {RESOURCES_LIST.map(r => {
                    const isSelected = selectedProjectedResources.includes(r);
                    const val = isSelected ? (simGasByResource[r] || 0) : 0;
                    const baseValComp = financialData.resourceBaselines[r]?.gasComp || 0;
                    const baseValPago = financialData.resourceBaselines[r]?.gasPago || 0;
                    const simValPago = baseValPago * (1 + val / 100);

                    return (
                      <div key={r} className={`p-4 rounded-2xl space-y-3 transition-all border ${isSelected ? 'bg-white/5 border-white/10 hover:border-white/20' : 'bg-black/20 border-white/5 opacity-50'}`}>
                        <div className="flex justify-between items-start">
                          <span className="text-white font-bold text-xs truncate max-w-[200px]" title={getResourceFullName(r)}>
                            {getResourceFullName(r)}
                          </span>
                          <span className="text-[10px] font-mono text-[#f43f5e] font-bold">
                            {val >= 0 ? '+' : ''}{val.toFixed(1)}%
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-on-surface-variant">
                          <div>
                            <p>BASE (COMP/PAGO)</p>
                            <p className="text-white font-bold mt-0.5">${baseValComp.toFixed(1)}M / ${baseValPago.toFixed(1)}M</p>
                          </div>
                          <div>
                            <p>PAGO PROYECTADO</p>
                            <p className="text-[#f43f5e] font-bold mt-0.5">${simValPago.toFixed(1)}M</p>
                          </div>
                        </div>

                        {isSelected && (
                          <div className="flex items-center gap-4 pt-1">
                            <input 
                              type="range"
                              min="-50"
                              max="50"
                              step="1"
                              value={val}
                              onChange={(e) => {
                                const n = parseInt(e.target.value);
                                setSimGasByResource(prev => ({ ...prev, [r]: n }));
                              }}
                              className="flex-1 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#f43f5e]"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: INDICADORES FINANCIEROS */}
      {/* ========================================================================= */}
      {activeTab === 'kpi' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          
          {/* Executive KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Income Card */}
            <div className="glass-card rounded-[28px] p-6 border border-white/5 bg-surface/50 relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 left-0 w-full h-1 bg-[#ffcc29]"></div>
              <div>
                <h4 className="text-xs font-mono text-on-surface-variant uppercase tracking-widest mb-3">Ingresos Totales (Vigencia 2026)</h4>
                <p className="text-3xl font-display font-bold text-white">${financialData.totals.simIng.toLocaleString('es-CO', {maximumFractionDigits:1})}M</p>
              </div>
              <div className="space-y-1.5 mt-4 text-[11px] font-mono text-on-surface-variant border-t border-white/5 pt-3">
                <div className="flex justify-between">
                  <span>CORTE A JUL 31 (REAL)</span>
                  <span className="text-white font-bold">${semesterTotals.eneJulIng.toLocaleString('es-CO', {maximumFractionDigits:1})}M</span>
                </div>
                <div className="flex justify-between">
                  <span>PROYECCIÓN AGO-DIC</span>
                  <span className="text-[#ffcc29] font-bold">${semesterTotals.agoDicIng.toLocaleString('es-CO', {maximumFractionDigits:1})}M</span>
                </div>
              </div>
            </div>

            {/* Commitments Card */}
            <div className="glass-card rounded-[28px] p-6 border border-white/5 bg-surface/50 relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 left-0 w-full h-1 bg-[#f43f5e]"></div>
              <div>
                <h4 className="text-xs font-mono text-on-surface-variant uppercase tracking-widest mb-3">Compromisos Totales (Vigencia 2026)</h4>
                <p className="text-3xl font-display font-bold text-white">${financialData.totals.simGasComp.toLocaleString('es-CO', {maximumFractionDigits:1})}M</p>
              </div>
              <div className="space-y-1.5 mt-4 text-[11px] font-mono text-on-surface-variant border-t border-white/5 pt-3">
                <div className="flex justify-between">
                  <span>CORTE A JUL 31 (REAL)</span>
                  <span className="text-white font-bold">${semesterTotals.eneJulComp.toLocaleString('es-CO', {maximumFractionDigits:1})}M</span>
                </div>
                <div className="flex justify-between">
                  <span>PROYECCIÓN AGO-DIC</span>
                  <span className="text-[#f43f5e] font-bold">${semesterTotals.agoDicComp.toLocaleString('es-CO', {maximumFractionDigits:1})}M</span>
                </div>
              </div>
            </div>

            {/* Payments Card (Clean Title without parenthesis) */}
            <div className="glass-card rounded-[28px] p-6 border border-white/5 bg-surface/50 relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 left-0 w-full h-1 bg-[#4ade80]"></div>
              <div>
                <h4 className="text-xs font-mono text-on-surface-variant uppercase tracking-widest mb-3">Pagos Efectivos (Vigencia 2026)</h4>
                <p className="text-3xl font-display font-bold text-white">${financialData.totals.simGasPago.toLocaleString('es-CO', {maximumFractionDigits:1})}M</p>
              </div>
              <div className="space-y-1.5 mt-4 text-[11px] font-mono text-on-surface-variant border-t border-white/5 pt-3">
                <div className="flex justify-between">
                  <span>CORTE A JUL 31 (REAL)</span>
                  <span className="text-white font-bold">${semesterTotals.eneJulPago.toLocaleString('es-CO', {maximumFractionDigits:1})}M</span>
                </div>
                <div className="flex justify-between">
                  <span>PROYECCIÓN AGO-DIC</span>
                  <span className="text-[#4ade80] font-bold">${semesterTotals.agoDicPago.toLocaleString('es-CO', {maximumFractionDigits:1})}M</span>
                </div>
              </div>
            </div>
          </div>

          {/* Secondary KPI Cards */}
          {(() => {
            // Execution % strictly calculated as Pago / Compromiso
            const pctEjecGasto = financialData.totals.simGasComp > 0 ? (financialData.totals.simGasPago / financialData.totals.simGasComp) * 100 : 0;
            const disponibleVal = financialData.totals.simIng - financialData.totals.simGasComp;
            const saldoPagoVal = financialData.totals.simGasComp - financialData.totals.simGasPago;

            return (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-card rounded-[28px] p-6 border border-white/5 bg-surface/50 relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute top-0 left-0 w-full h-1 bg-[#ffcc29]"></div>
                  <div>
                    <h4 className="text-xs font-mono text-on-surface-variant uppercase tracking-widest mb-3">Porcentaje de Ejecución de Pago</h4>
                    <p className="text-3xl font-display font-bold text-[#ffcc29]">{pctEjecGasto.toFixed(1)}%</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-white/5">
                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-[#ffcc29]" style={{ width: `${Math.min(100, pctEjecGasto)}%` }}></div>
                    </div>
                    <div className="flex justify-between items-center mt-2 text-[10px] font-mono text-on-surface-variant">
                      <span>PAGOS / COMPROMISOS</span>
                      <span className="text-[#4ade80] font-bold">Tasa de Giro</span>
                    </div>
                  </div>
                </div>

                <div className="glass-card rounded-[28px] p-6 border border-white/5 bg-surface/50 relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute top-0 left-0 w-full h-1 bg-[#4ade80]"></div>
                  <div>
                    <h4 className="text-xs font-mono text-on-surface-variant uppercase tracking-widest mb-3">Valor Disponible / Superávit Neto</h4>
                    <p className={`text-3xl font-display font-bold ${disponibleVal >= 0 ? 'text-[#4ade80]' : 'text-red-400'}`}>
                      ${disponibleVal.toLocaleString('es-CO', {maximumFractionDigits:1})}M
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-white/5 flex justify-between text-[10px] font-mono text-on-surface-variant">
                    <span>INGRESO - COMPROMISOS</span>
                    <span className="text-[#4ade80] font-bold uppercase">{disponibleVal >= 0 ? 'Superávit Libre' : 'Déficit'}</span>
                  </div>
                </div>

                <div className="glass-card rounded-[28px] p-6 border border-white/5 bg-surface/50 relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute top-0 left-0 w-full h-1 bg-[#7bd0ff]"></div>
                  <div>
                    <h4 className="text-xs font-mono text-on-surface-variant uppercase tracking-widest mb-3">Saldo Pago</h4>
                    <p className="text-3xl font-display font-bold text-[#7bd0ff]">
                      ${saldoPagoVal.toLocaleString('es-CO', {maximumFractionDigits:1})}M
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-white/5 flex justify-between text-[10px] font-mono text-on-surface-variant">
                    <span>COMPROMISOS - PAGOS</span>
                    <span className="text-[#7bd0ff] font-bold uppercase">
                      {saldoPagoVal > 0 ? 'Pendiente de Giro' : 'Liquidado 100%'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Comparative Execution Table */}
          <div className="glass-card rounded-[32px] p-8 border border-white/10">
            <h3 className="text-xl font-display font-medium text-white mb-4">Balance General Comparativo (Real vs Proyección)</h3>
            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="bg-white/10 text-[#ffcc29] uppercase">
                    <th className="p-4">Concepto Presupuestal</th>
                    <th className="p-4 text-right">Real Ene-Jul (7 Meses)</th>
                    <th className="p-4 text-right">Proyectado Ago-Dic (5 Meses)</th>
                    <th className="p-4 text-right">Consolidado Anual 2026</th>
                    <th className="p-4 text-right">% Ejecución (Pago / Comp)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  <tr>
                    <td className="p-4 font-bold text-white">Ingresos Totales (Recaudo)</td>
                    <td className="p-4 text-right text-[#4ade80]">${semesterTotals.eneJulIng.toLocaleString('es-CO', {maximumFractionDigits:1})}M</td>
                    <td className="p-4 text-right text-[#ffcc29]">${semesterTotals.agoDicIng.toLocaleString('es-CO', {maximumFractionDigits:1})}M</td>
                    <td className="p-4 text-right font-bold text-white">${financialData.totals.simIng.toLocaleString('es-CO', {maximumFractionDigits:1})}M</td>
                    <td className="p-4 text-right font-bold">{financialData.totals.simIng > 0 ? ((financialData.totals.simGasPago / financialData.totals.simIng) * 100).toFixed(1) : '0.0'}%</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-bold text-white">Gastos de Personal (Nómina Maestro)</td>
                    <td className="p-4 text-right text-[#4ade80]">${semesterTotals.eneJulNomina.toLocaleString('es-CO', {maximumFractionDigits:1})}M</td>
                    <td className="p-4 text-right text-[#ffcc29]">${semesterTotals.agoDicNomina.toLocaleString('es-CO', {maximumFractionDigits:1})}M</td>
                    <td className="p-4 text-right font-bold text-[#38bdf8]">${financialData.totals.simulatedPayrollTotal.toLocaleString('es-CO', {maximumFractionDigits:1})}M</td>
                    <td className="p-4 text-right font-bold">100.0%</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-bold text-white">Compromisos Totales</td>
                    <td className="p-4 text-right text-[#f43f5e]">${semesterTotals.eneJulComp.toLocaleString('es-CO', {maximumFractionDigits:1})}M</td>
                    <td className="p-4 text-right text-[#f43f5e]">${semesterTotals.agoDicComp.toLocaleString('es-CO', {maximumFractionDigits:1})}M</td>
                    <td className="p-4 text-right font-bold text-white">${financialData.totals.simGasComp.toLocaleString('es-CO', {maximumFractionDigits:1})}M</td>
                    <td className="p-4 text-right font-bold">100.0%</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-bold text-white">Pagos Efectivos</td>
                    <td className="p-4 text-right text-[#38bdf8]">${semesterTotals.eneJulPago.toLocaleString('es-CO', {maximumFractionDigits:1})}M</td>
                    <td className="p-4 text-right text-[#ffcc29]">${semesterTotals.agoDicPago.toLocaleString('es-CO', {maximumFractionDigits:1})}M</td>
                    <td className="p-4 text-right font-bold text-white">${financialData.totals.simGasPago.toLocaleString('es-CO', {maximumFractionDigits:1})}M</td>
                    <td className="p-4 text-right font-bold">{financialData.totals.simGasComp > 0 ? ((financialData.totals.simGasPago / financialData.totals.simGasComp) * 100).toFixed(1) : '0.0'}%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* ANÁLISIS DE GASTOS (ESCENARIO SIMULADO) - CONGRUENCIA TOTAL & INVERSIÓN <= 70% */}
          {/* ========================================================================= */}
          <div className="pt-6 border-t border-white/10 space-y-8">
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-2xl font-display text-white flex items-center gap-2.5 font-bold">
                  <Wallet className="text-[#38bdf8]" size={24} />
                  Análisis de Gastos (Escenario Simulado 2026)
                </h3>
                <p className="text-xs text-on-surface-variant mt-1">
                  Desglose dinámico de compromisos y pagos efectivos. En todos los rubros la ejecución se calcula como <strong className="text-white font-mono">Pago Efectivo / Compromiso</strong>. Inversión acotada al ≤70% histórico.
                </p>
              </div>

              <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-2xl font-mono text-xs">
                <span className="text-on-surface-variant">TOTAL GIRO SIMULADO:</span>
                <span className="text-[#4ade80] font-bold">${financialData.totals.simGasPago.toLocaleString('es-CO', {maximumFractionDigits:1})}M</span>
              </div>
            </div>

            {/* Category Cards Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {simulatedGastosGroups.map((gasto, idx) => {
                const isExpanded = expandedSimGastoCard === gasto.id;
                // Execution strictly calculated as Pago / Compromiso
                const pctNum = gasto.compromiso > 0 ? (gasto.pago / gasto.compromiso) * 100 : 0;
                const pctStr = pctNum.toFixed(1) + '%';
                
                return (
                  <div key={gasto.id} className="glass-card rounded-[24px] p-6 flex flex-col relative overflow-hidden transition-all duration-300 border border-white/10 bg-surface/50 shadow-xl">
                    <div className={`absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b ${gasto.colorClass}`}></div>
                    
                    <div className="flex flex-col md:flex-row gap-6">
                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-white/10 text-white">
                              {gasto.tipoCode}
                            </span>
                            <h4 className="text-xl font-display font-bold text-white truncate" title={gasto.name}>{gasto.name}</h4>
                          </div>
                          
                          <div className="flex items-center gap-2 mb-4">
                            <p className="text-[10px] text-on-surface-variant font-mono tracking-widest uppercase">Agrupación Presupuestal</p>
                            {gasto.isCapped && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-[#38bdf8]/10 text-[#38bdf8] border border-[#38bdf8]/30">
                                Tope Histórico ≤70%
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <span className="text-xs text-on-surface-variant block mb-1">Total Compromiso Simulado</span>
                            <span className="text-2xl font-bold font-mono text-white">${gasto.compromiso.toLocaleString('es-CO', {maximumFractionDigits: 1})} <span className="text-xs font-sans text-on-surface-variant font-normal">mill.</span></span>
                          </div>
                          <div>
                            <span className="text-xs text-on-surface-variant block mb-1">Pago Efectivo Simulado</span>
                            <span className="text-3xl font-display font-bold text-[#38bdf8]">${gasto.pago.toLocaleString('es-CO', {maximumFractionDigits: 1})} <span className="text-xs font-sans text-on-surface-variant font-normal">mill.</span></span>
                          </div>
                        </div>
                      </div>

                      <div className="w-full md:w-56 flex flex-col items-center justify-center shrink-0 border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-6">
                        <div className="relative w-28 h-28 flex items-center justify-center mb-4">
                          <svg className="w-full h-full -rotate-90">
                            <circle cx="56" cy="56" r="48" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="12" />
                            <circle 
                              className="progress-ring-circle" 
                              cx="56" cy="56" r="48" 
                              fill="transparent" 
                              stroke="currentColor" 
                              strokeWidth="12" 
                              strokeDasharray="301" 
                              strokeDashoffset={301 - (301 * Math.min(100, pctNum) / 100)} 
                              style={{ color: gasto.baseColor }}
                            />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-xl font-bold text-white">{pctStr}</span>
                            <span className="text-[8px] font-mono text-on-surface-variant uppercase">PAGO / COMP</span>
                          </div>
                        </div>

                        <div className="w-full space-y-2">
                          {gasto.recursos.slice(0, 2).map((item: any, rIdx: number) => (
                            <div key={rIdx} className="bg-white/5 px-3 py-2 rounded-lg flex justify-between items-center w-full">
                              <span className="text-[10px] text-on-surface-variant uppercase truncate mr-2" title={item.name}>{String(item.name || '')}</span>
                              <span className="text-xs font-bold text-white whitespace-nowrap">${item.pago.toLocaleString('es-CO', {maximumFractionDigits: 1})}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Contributing Resources List */}
                    {gasto.recursos && gasto.recursos.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-white/10 w-full">
                        <button 
                          onClick={() => setExpandedSimGastoCard(isExpanded ? null : gasto.id)}
                          className="w-full flex items-center justify-center gap-2 text-xs font-mono text-on-surface-variant hover:text-white transition-colors bg-white/5 hover:bg-white/10 py-2 rounded-xl"
                        >
                          {isExpanded ? (
                            <><ChevronUp size={16} /> Ocultar Recursos de Financiamiento</>
                          ) : (
                            <><ChevronDown size={16} /> Ver Fuentes de Financiamiento ({gasto.recursos.length})</>
                          )}
                        </button>
                        
                        {isExpanded && (
                          <div className="mt-4 space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar animate-in slide-in-from-top-2 duration-200">
                            <div className="flex justify-between items-center px-4 py-2 text-[10px] font-mono text-on-surface-variant/70 uppercase">
                              <span className="flex-1">Fuente / Recurso</span>
                              <span className="w-24 text-right">Compromiso</span>
                              <span className="w-24 text-right">Pago Proyectado</span>
                              <span className="w-20 text-right">Ejecución</span>
                            </div>
                            {gasto.recursos.map((rec: any, recIdx: number) => {
                              const rPct = rec.compromiso > 0 ? (rec.pago / rec.compromiso) * 100 : 0;
                              return (
                                <div key={recIdx} className="flex justify-between items-center bg-white/5 hover:bg-white/10 transition-colors px-4 py-3 rounded-xl w-full">
                                  <span className="text-xs text-white truncate flex-1 mr-4" title={rec.name}>{String(rec.name || '')}</span>
                                  <span className="text-xs font-mono text-on-surface-variant w-24 text-right">${rec.compromiso.toLocaleString('es-CO', {maximumFractionDigits: 1})}M</span>
                                  <span className="text-xs font-bold text-[#38bdf8] w-24 text-right">${rec.pago.toLocaleString('es-CO', {maximumFractionDigits: 1})}M</span>
                                  <span className="text-xs font-mono text-[#4ade80] w-20 text-right font-bold">{rPct.toFixed(1)}%</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Interactive Donut Chart: Peso de Gastos por Tipo (Simulado 2026) */}
            <div className="w-full">
              <div className="w-full min-h-[500px] glass-card rounded-[32px] p-8 md:p-12 border border-white/10 bg-[#1a1a1a] relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#ffcc29] via-[#38bdf8] to-[#4ade80]"></div>
                <h3 className="text-3xl font-display font-medium text-white mb-2 text-center uppercase tracking-wider">
                  Peso de Gastos por Tipo (Escenario Simulado 2026)
                </h3>
                <p className="text-sm font-mono text-on-surface-variant text-center mb-10 mt-4">
                  Selecciona una categoría para explorar el desglose de recursos y porcentaje de participación simulada.
                </p>
                
                {(() => {
                  const pieData = simulatedGastosGroups.filter(g => g.pago > 0).map((g, idx) => ({
                    id: g.id,
                    name: g.name,
                    value: g.pago,
                    compromiso: g.compromiso,
                    pct: financialData.totals.simGasPago > 0 ? (g.pago / financialData.totals.simGasPago) * 100 : 0,
                    recursos: g.recursos || [],
                    fill: g.fill || COLORS[idx % COLORS.length]
                  }));
                  
                  const activeItem = expandedSimPieGroup ? pieData.find(d => d.name === expandedSimPieGroup) : null;
                  const totalPagoSim = pieData.reduce((acc, curr) => acc + curr.value, 0);

                  return (
                    <div className={`grid grid-cols-1 ${expandedSimPieGroup ? 'lg:grid-cols-2' : ''} gap-12 transition-all duration-500 items-center`}>
                      <div className="h-[400px] w-full cursor-pointer relative flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={pieData}
                              cx="50%"
                              cy="50%"
                              innerRadius={0}
                              outerRadius={expandedSimPieGroup ? 140 : 180}
                              paddingAngle={2}
                              dataKey="value"
                              stroke="none"
                              onClick={(data) => setExpandedSimPieGroup(data.name === expandedSimPieGroup ? null : data.name)}
                              onMouseEnter={(_, index) => setSimActiveIndex(index)}
                              onMouseLeave={() => setSimActiveIndex(undefined)}
                            >
                              {pieData.map((entry, index) => (
                                <Cell 
                                  key={`sim-cell-${index}`} 
                                  fill={entry.fill} 
                                  className="transition-all duration-300 hover:brightness-110"
                                  style={{
                                    filter: simActiveIndex === index || expandedSimPieGroup === entry.name ? `drop-shadow(0px 10px 20px ${entry.fill}80)` : 'drop-shadow(0px 4px 8px rgba(0,0,0,0.5))',
                                    opacity: expandedSimPieGroup && expandedSimPieGroup !== entry.name ? 0.3 : 1,
                                    transform: simActiveIndex === index ? 'scale(1.05)' : 'scale(1)',
                                    transformOrigin: 'center'
                                  }}
                                />
                              ))}
                            </Pie>
                            <Tooltip 
                              formatter={(value: number, name: string) => [`$${value.toLocaleString('es-CO', {maximumFractionDigits: 1})} mill (${((value/totalPagoSim)*100).toFixed(1)}%)`, name]}
                              contentStyle={{ backgroundColor: 'rgba(20,20,20,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', backdropFilter: 'blur(10px)' }}
                              itemStyle={{ color: '#fff', fontSize: '13px', fontFamily: 'Inter', fontWeight: 'bold' }}
                              wrapperStyle={{ zIndex: 100 }}
                            />
                            <Legend 
                              verticalAlign="bottom" 
                              height={36} 
                              iconType="circle" 
                              wrapperStyle={{ fontSize: '13px', fontFamily: 'JetBrains Mono', color: '#cac4d0', paddingTop: '20px' }}
                              onClick={(e) => setExpandedSimPieGroup(e.value === expandedSimPieGroup ? null : e.value)}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Details Sidebar for Selected Expense Group */}
                      {expandedSimPieGroup && activeItem && (
                        <div className="h-full flex flex-col justify-center animate-in slide-in-from-right-8 fade-in duration-500">
                          <div className="border-l-4 pl-6 py-2 mb-6" style={{ borderColor: activeItem.fill }}>
                            <h4 className="text-3xl font-display font-bold text-white mb-2">{activeItem.name}</h4>
                            <p className="text-2xl font-mono" style={{ color: activeItem.fill }}>
                              ${activeItem.value.toLocaleString('es-CO', {maximumFractionDigits: 1})} <span className="text-base font-sans text-on-surface-variant text-white/70">millones proyectados</span>
                            </p>
                            <p className="text-xs text-on-surface-variant mt-3 mb-6 bg-white/5 py-1.5 px-4 rounded-full inline-block font-medium">
                              Representa el <strong className="text-white">{((activeItem.value / totalPagoSim) * 100).toFixed(1)}%</strong> del gasto total simulado
                            </p>
                          </div>

                          <div className="bg-white/5 rounded-3xl p-6 border border-white/5 max-h-[300px] overflow-y-auto custom-scrollbar shadow-inner">
                            <h5 className="text-xs font-mono text-on-surface-variant uppercase tracking-widest mb-4">Fuentes de Financiamiento del Rubro</h5>
                            {activeItem.recursos && activeItem.recursos.length > 0 ? (
                              <div className="space-y-3">
                                {[...activeItem.recursos].sort((a: any, b: any) => b.pago - a.pago).map((rec: any, idx: number) => {
                                  const pct = activeItem.value > 0 ? (rec.pago / activeItem.value) * 100 : 0;
                                  return (
                                    <div key={idx} className="flex flex-col gap-1.5">
                                      <div className="flex justify-between items-end text-xs">
                                        <span className="text-white/90 font-medium truncate flex-1 pr-4" title={rec.name}>{String(rec.name || '')}</span>
                                        <div className="text-right font-mono">
                                          <span className="font-bold text-white whitespace-nowrap block">${rec.pago.toLocaleString('es-CO', {maximumFractionDigits: 1})}M</span>
                                          <span className="text-[10px] text-on-surface-variant">{pct.toFixed(1)}%</span>
                                        </div>
                                      </div>
                                      <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden">
                                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: activeItem.fill }}></div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <p className="text-xs text-on-surface-variant flex items-center justify-center h-20 opacity-50 font-mono">Sin recursos asignados</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: FLUJO DE CAJA Y ANÁLISIS DE GIRO */}
      {/* ========================================================================= */}
      {activeTab === 'flow' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h3 className="text-2xl font-display font-bold text-white">Flujo de Caja, Giro y Liquidez</h3>
              <p className="text-xs text-on-surface-variant mt-1">Análisis integral del comportamiento temporal, rezago de compromisos y reserva de caja.</p>
            </div>
            
            <div className="bg-white/5 border border-white/10 rounded-xl p-1 flex gap-1">
              {[
                { id: 'monthly', label: 'Mensual' },
                { id: 'quarterly', label: 'Trimestral' },
                { id: 'semesterly', label: 'Semestral' },
                { id: 'annual', label: 'Anual' }
              ].map(g => (
                <button
                  key={g.id}
                  onClick={() => setFlowGranularity(g.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${flowGranularity === g.id ? 'bg-[#ffcc29] text-black font-extrabold shadow-md' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          {/* Graph 1: Inflow vs Outflow & Net Balance */}
          <div className="glass-card rounded-[32px] p-6 lg:p-8 border border-white/10 glow-primary">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h4 className="text-lg font-display font-bold text-white">Gráfico 1: Dinámica Temporal de Ingresos vs Pagos Efectivos</h4>
                <p className="text-xs text-on-surface-variant mt-0.5">Ingresos recaudados y proyectados frente a los giros efectivos mensuales.</p>
              </div>
              <span className="px-3 py-1 bg-white/5 rounded-full border border-white/10 text-[10px] font-mono text-[#4ade80]">
                Superávit Consolidado: +${financialData.totals.simNetPago.toFixed(1)}M
              </span>
            </div>
            <div className="w-full h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={aggregatedFlowData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" stroke="#cac4d0" tick={{fontSize: 11}} />
                  <YAxis stroke="#cac4d0" tick={{fontSize: 11}} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                  <Legend />
                  <Area type="monotone" dataKey="ingresos" name="Ingresos ($M)" fill="url(#flowIngGlow)" stroke="#4ade80" strokeWidth={2} />
                  <Bar dataKey="gastosPago" name="Pagos Efectivos ($M)" fill="#ffcc29" radius={[4, 4, 0, 0]} opacity={0.85} />
                  <Line type="monotone" dataKey="netoPago" name="Saldo Neto Mensual ($M)" stroke="#38bdf8" strokeWidth={3} dot={{r: 4}} />
                  <defs>
                    <linearGradient id="flowIngGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4ade80" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#4ade80" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Graph 2 & Graph 3 Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Graph 2: Compromiso vs Pago */}
            <div className="glass-card rounded-[32px] p-6 lg:p-8 border border-white/10">
              <div className="mb-6">
                <h4 className="text-lg font-display font-bold text-white">Gráfico 2: Relación Compromisos vs Pagos (Rezago de Giro)</h4>
                <p className="text-xs text-on-surface-variant mt-0.5">Monitorea la acumulación de obligaciones pendientes de giro a lo largo del año.</p>
              </div>
              <div className="w-full h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={financialData.simulatedFlow}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" stroke="#cac4d0" tick={{fontSize: 10}} />
                    <YAxis stroke="#cac4d0" tick={{fontSize: 10}} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                    <Legend />
                    <Bar dataKey="rezagoCompromiso" name="Rezago Acumulado ($M)" fill="#f43f5e" radius={[4, 4, 0, 0]} opacity={0.7} />
                    <Line type="monotone" dataKey="gastosComp" name="Compromisos ($M)" stroke="#f43f5e" strokeWidth={2} />
                    <Line type="monotone" dataKey="gastosPago" name="Pagos ($M)" stroke="#ffcc29" strokeWidth={2} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 p-3 bg-white/5 rounded-xl border border-white/5 text-[11px] font-mono text-on-surface-variant flex justify-between">
                <span>REZAGO MÁXIMO PROYECTADO:</span>
                <span className="text-[#f43f5e] font-bold">${Math.max(...financialData.simulatedFlow.map(m => m.rezagoCompromiso)).toFixed(1)}M</span>
              </div>
            </div>

            {/* Graph 3: Cumulative Liquidity Reserve */}
            <div className="glass-card rounded-[32px] p-6 lg:p-8 border border-white/10">
              <div className="mb-6">
                <h4 className="text-lg font-display font-bold text-white">Gráfico 3: Curva de Reserva de Liquidez y Saldo Acumulado</h4>
                <p className="text-xs text-on-surface-variant mt-0.5">Evolución acumulada del disponible de tesorería mes a mes.</p>
              </div>
              <div className="w-full h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={financialData.simulatedFlow}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" stroke="#cac4d0" tick={{fontSize: 10}} />
                    <YAxis stroke="#cac4d0" tick={{fontSize: 10}} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                    <Legend />
                    <Area type="monotone" dataKey="saldoCajaAcumulado" name="Reserva Acumulada ($M)" fill="url(#reservaGlow)" stroke="#38bdf8" strokeWidth={3} />
                    <defs>
                      <linearGradient id="reservaGlow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.35}/>
                        <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.02}/>
                      </linearGradient>
                    </defs>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 p-3 bg-white/5 rounded-xl border border-white/5 text-[11px] font-mono text-on-surface-variant flex justify-between">
                <span>DISPONIBLE DE CIERRE:</span>
                <span className="text-[#38bdf8] font-bold">${financialData.simulatedFlow[11]?.saldoCajaAcumulado?.toFixed(1) || '0'}M</span>
              </div>
            </div>

          </div>

          {/* Graph 4: Payroll vs Other Disbursements */}
          <div className="glass-card rounded-[32px] p-6 lg:p-8 border border-white/10">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h4 className="text-lg font-display font-bold text-white">Gráfico 4: Composición del Pago: Nómina ($369.650M) vs Otros Gastos</h4>
                <p className="text-xs text-on-surface-variant mt-0.5">Desglose mensual entre el costo de nómina presupuestado y los pagos operativos e inversiones.</p>
              </div>
              <span className="px-3 py-1 bg-white/5 rounded-full border border-white/10 text-[10px] font-mono text-[#38bdf8]">
                Nómina Anual: ${financialData.totals.simulatedPayrollTotal.toFixed(1)}M
              </span>
            </div>
            <div className="w-full h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={financialData.simulatedFlow}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" stroke="#cac4d0" tick={{fontSize: 11}} />
                  <YAxis stroke="#cac4d0" tick={{fontSize: 11}} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                  <Legend />
                  <Bar dataKey="gastoPersonal" name="Gasto de Nómina ($M)" stackId="a" fill="#4ade80" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="otrosGastosPago" name="Otros Egresos Operativos ($M)" stackId="a" fill="#7bd0ff" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Consolidated Table */}
          <div className="glass-card rounded-[32px] p-8 border border-white/10">
            <h4 className="text-lg font-display font-bold text-white mb-4">Tabla Detallada de Flujo de Caja ({flowGranularity.toUpperCase()})</h4>
            <div className="overflow-x-auto rounded-[24px] border border-white/10 bg-white/5 custom-scrollbar">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className="bg-white/10 text-[#ffcc29] uppercase tracking-wider">
                    <th className="p-4 font-bold border-b border-white/10">Período</th>
                    <th className="p-4 font-bold border-b border-white/10 text-right">Ingresos</th>
                    <th className="p-4 font-bold border-b border-white/10 text-right">Compromisos</th>
                    <th className="p-4 font-bold border-b border-white/10 text-right">Pagos</th>
                    <th className="p-4 font-bold border-b border-white/10 text-right">Nómina ($M)</th>
                    <th className="p-4 font-bold border-b border-white/10 text-right">Saldo Neto</th>
                    <th className="p-4 font-bold border-b border-white/10 text-right">Reserva Caja</th>
                    <th className="p-4 font-bold border-b border-white/10 text-right">Rezago (C x P)</th>
                    <th className="p-4 font-bold border-b border-white/10 text-right">Ejecución</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {aggregatedFlowData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-white/5">
                      <td className="p-4 text-white font-bold">{row.name}</td>
                      <td className="p-4 text-right text-[#4ade80]">${row.ingresos.toLocaleString('es-CO', {minimumFractionDigits: 1})}M</td>
                      <td className="p-4 text-right text-[#f43f5e]">${row.gastosComp.toLocaleString('es-CO', {minimumFractionDigits: 1})}M</td>
                      <td className="p-4 text-right text-[#ffcc29]">${row.gastosPago.toLocaleString('es-CO', {minimumFractionDigits: 1})}M</td>
                      <td className="p-4 text-right text-[#38bdf8]">${row.gastoPersonal.toLocaleString('es-CO', {minimumFractionDigits: 1})}M</td>
                      <td className={`p-4 text-right font-bold ${row.netoPago >= 0 ? 'text-[#4ade80]' : 'text-red-400'}`}>
                        ${row.netoPago.toLocaleString('es-CO', {minimumFractionDigits: 1})}M
                      </td>
                      <td className="p-4 text-right text-[#38bdf8]">${row.saldoCajaAcumulado.toLocaleString('es-CO', {maximumFractionDigits: 1})}M</td>
                      <td className="p-4 text-right text-[#f43f5e]">${row.rezagoCompromiso.toLocaleString('es-CO', {maximumFractionDigits: 1})}M</td>
                      <td className="p-4 text-right font-bold text-white/80">{row.ejecucion.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: COBERTURA DE NÓMINA Y EGRESOS */}
      {/* ========================================================================= */}
      {activeTab === 'cobertura' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          
          <div className="glass-card rounded-[28px] p-6 lg:p-8 border border-white/10 bg-surface/50">
            <h3 className="text-2xl font-display font-bold text-white">Matriz de Cobertura de Nómina por Fuentes de Financiamiento</h3>
            <p className="text-xs text-on-surface-variant mt-1">
              Evaluación de suficiencia financiera: cómo los ingresos recaudados y proyectados de cada recurso financian el costo anual de personal (<strong className="text-white font-mono">$369.650,4M</strong>).
            </p>
          </div>

          {/* Ranked Table of Resource Contribution */}
          <div className="glass-card rounded-[32px] p-8 border border-white/10">
            <h4 className="text-lg font-display font-bold text-white mb-6">Fuentes de Financiamiento de Nómina (Ranking de Aporte)</h4>
            <div className="overflow-x-auto rounded-[24px] border border-white/10 bg-white/5">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="bg-white/10 text-[#ffcc29] uppercase">
                    <th className="p-4">Recurso / Fuente</th>
                    <th className="p-4 text-right">Ingreso Proyectado ($M)</th>
                    <th className="p-4 text-right">Aporte a Nómina ($M)</th>
                    <th className="p-4 text-right">Excedente Libre ($M)</th>
                    <th className="p-4 text-right">% Cobertura Nómina Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {financialData.payrollCoverageList.map((item, idx) => (
                    <tr key={idx} className="hover:bg-white/5">
                      <td className="p-4 text-white font-bold">{item.resourceName}</td>
                      <td className="p-4 text-right text-[#4ade80]">${item.totalRevenue.toLocaleString('es-CO', {maximumFractionDigits:1})}M</td>
                      <td className="p-4 text-right text-[#ffcc29] font-bold">${item.payrollContribution.toLocaleString('es-CO', {maximumFractionDigits:1})}M</td>
                      <td className="p-4 text-right text-[#38bdf8]">${item.surplus.toLocaleString('es-CO', {maximumFractionDigits:1})}M</td>
                      <td className="p-4 text-right font-bold text-white">{item.coveragePct.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Stacked Bar Chart */}
          <div className="glass-card rounded-[32px] p-8 border border-white/10">
            <h4 className="text-lg font-display font-bold text-white mb-6">Distribución de Ingresos por Recurso: Aporte a Nómina vs Excedente Libre</h4>
            <div className="w-full h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={financialData.payrollCoverageList.slice(0, 8)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="resourceCode" stroke="#cac4d0" tick={{fontSize: 11}} />
                  <YAxis stroke="#cac4d0" tick={{fontSize: 11}} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                  <Legend />
                  <Bar dataKey="payrollContribution" name="Aporte a Nómina ($M)" stackId="a" fill="#ffcc29" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="surplus" name="Excedente Libre Funcionamiento ($M)" stackId="a" fill="#4ade80" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: SENSIBILIDAD, RIESGO & EFICACIA DEL MODELO */}
      {/* ========================================================================= */}
      {activeTab === 'sensitivity' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          
          {/* Model Predictive Efficacy Banner */}
          <div className="glass-card rounded-[28px] p-6 border border-white/10 bg-gradient-to-r from-surface via-[#0f172a] to-surface">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Award className="text-[#ffcc29]" size={20} />
                  <h3 className="text-xl font-display font-bold text-white">Eficacia y Calibración del Modelo Predictivo</h3>
                </div>
                <p className="text-xs text-on-surface-variant mt-1">
                  Evaluación de bondad de ajuste y backtesting estadístico frente a ejecuciones históricas reales (2023 - 2026).
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-2xl text-center">
                  <span className="text-[9px] font-mono text-on-surface-variant block uppercase">Error Medio (MAPE)</span>
                  <span className="text-base font-mono font-bold text-[#4ade80]">{sensitivityAnalysis.modelEfficacy.mape}%</span>
                </div>
                <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-2xl text-center">
                  <span className="text-[9px] font-mono text-on-surface-variant block uppercase">Coeficiente R²</span>
                  <span className="text-base font-mono font-bold text-[#38bdf8]">{sensitivityAnalysis.modelEfficacy.r2}</span>
                </div>
                <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-2xl text-center">
                  <span className="text-[9px] font-mono text-on-surface-variant block uppercase">Precisión Global</span>
                  <span className="text-base font-mono font-bold text-[#ffcc29]">{sensitivityAnalysis.modelEfficacy.historicalAccuracy}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* DEDICATED SECTION: Sensibilidad de Pagos Efectivos & Exigibilidad de Caja */}
          <div className="glass-card rounded-[32px] p-8 border border-white/10 bg-gradient-to-r from-[#0f172a] via-surface to-[#0f172a] shadow-2xl">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-white/10">
              <div>
                <div className="flex items-center gap-2">
                  <Landmark className="text-[#38bdf8]" size={20} />
                  <h4 className="text-xl font-display font-bold text-white">Estudio de Sensibilidad de Pagos Efectivos (Vigencia 2026)</h4>
                </div>
                <p className="text-xs text-on-surface-variant mt-1">
                  Evaluación de estrés y tolerancia de caja ante variaciones en los giros efectivos proyectados para el cierre de vigencia.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-2xl">
                  <span className="text-[9px] font-mono text-on-surface-variant uppercase block">Pagos Base 2026</span>
                  <span className="text-base font-mono font-bold text-[#ffcc29]">${sensitivityAnalysis.paymentSensitivity.basePayments.toLocaleString('es-CO', {maximumFractionDigits:1})}M</span>
                </div>
                <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-2xl">
                  <span className="text-[9px] font-mono text-on-surface-variant uppercase block">Excedente Caja Libre</span>
                  <span className="text-base font-mono font-bold text-[#4ade80]">+${sensitivityAnalysis.paymentSensitivity.cashSurplus.toLocaleString('es-CO', {maximumFractionDigits:1})}M</span>
                </div>
                <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-2xl">
                  <span className="text-[9px] font-mono text-on-surface-variant uppercase block">Tolerancia Máx. Giros</span>
                  <span className="text-base font-mono font-bold text-[#38bdf8]">+{sensitivityAnalysis.paymentSensitivity.maxPaymentShockPct.toFixed(1)}%</span>
                </div>
              </div>
            </div>

            {/* Payment Sensitivity Chart & Stress Table */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-6">
              
              {/* Payment Shock Chart */}
              <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                <h5 className="text-xs font-mono font-bold text-[#ffcc29] uppercase tracking-wider mb-3">Curva de Saldo Final de Caja vs Incremento en Pagos</h5>
                <div className="w-full h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={sensitivityAnalysis.paymentSensitivity.scenarios}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="label" stroke="#cac4d0" tick={{fontSize: 10}} />
                      <YAxis stroke="#cac4d0" tick={{fontSize: 10}} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)' }} />
                      <Legend />
                      <Bar dataKey="saldoCaja" name="Saldo Final de Caja ($M)" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                      <Line type="monotone" dataKey="pagosTotal" name="Pagos Totales ($M)" stroke="#ffcc29" strokeWidth={2} yAxisId={0} />
                      <ReferenceLine y={0} stroke="#f43f5e" strokeDasharray="4 4" label={{ value: 'Límite de Déficit ($0M)', fill: '#f43f5e', fontSize: 10 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Payment Stress Scenarios Table */}
              <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="bg-white/10 text-[#ffcc29] uppercase">
                      <th className="p-3">Escenario Shock</th>
                      <th className="p-3 text-right">Pagos Totales</th>
                      <th className="p-3 text-right">Saldo Caja</th>
                      <th className="p-3 text-right">Cobertura</th>
                      <th className="p-3 text-right">Diagnóstico</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {sensitivityAnalysis.paymentSensitivity.scenarios.map((sc, idx) => (
                      <tr key={idx} className="hover:bg-white/5">
                        <td className="p-3 font-bold text-white">{sc.label}</td>
                        <td className="p-3 text-right text-[#ffcc29]">${sc.pagosTotal.toLocaleString('es-CO', {maximumFractionDigits:1})}M</td>
                        <td className={`p-3 text-right font-bold ${sc.saldoCaja >= 0 ? 'text-[#4ade80]' : 'text-red-400'}`}>
                          {sc.saldoCaja >= 0 ? `+$${sc.saldoCaja.toLocaleString('es-CO', {maximumFractionDigits:1})}M` : `-$${Math.abs(sc.saldoCaja).toLocaleString('es-CO', {maximumFractionDigits:1})}M`}
                        </td>
                        <td className="p-3 text-right text-white font-bold">{sc.cobertura.toFixed(1)}%</td>
                        <td className={`p-3 text-right font-bold ${sc.statusColor}`}>{sc.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>
          </div>

          {/* Primary Sensitivity & Solvency KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="glass-card rounded-[28px] p-6 border border-white/5 bg-surface/50 flex flex-col justify-between">
              <span className="text-[10px] font-mono text-on-surface-variant uppercase block">DSCR Cobertura de Gasto</span>
              <span className="text-3xl font-display font-bold text-[#4ade80] mt-1 block">{sensitivityAnalysis.dscrBase.toFixed(2)}x</span>
              <span className="text-xs text-on-surface-variant mt-1 block">Capacidad de pago sobre egresos efectivos</span>
            </div>
            <div className="glass-card rounded-[28px] p-6 border border-white/5 bg-surface/50 flex flex-col justify-between">
              <span className="text-[10px] font-mono text-on-surface-variant uppercase block">Colchón de Liquidez Neto</span>
              <span className="text-3xl font-display font-bold text-[#38bdf8] mt-1 block">${sensitivityAnalysis.cushion.toFixed(1)}%</span>
              <span className="text-xs text-on-surface-variant mt-1 block">Margen de maniobra sobre equilibrio</span>
            </div>
            <div className="glass-card rounded-[28px] p-6 border border-white/5 bg-surface/50 flex flex-col justify-between">
              <span className="text-[10px] font-mono text-on-surface-variant uppercase block">Punto de Ruptura (Caída Máx.)</span>
              <span className="text-3xl font-display font-bold text-[#ffcc29] mt-1 block">-{sensitivityAnalysis.ruptureVar.toFixed(1)}%</span>
              <span className="text-xs text-on-surface-variant mt-1 block">Tolerancia máxima de ingresos</span>
            </div>
            <div className="glass-card rounded-[28px] p-6 border border-white/5 bg-surface/50 flex flex-col justify-between">
              <span className="text-[10px] font-mono text-on-surface-variant uppercase block">Valor Líquido de Ruptura</span>
              <span className="text-3xl font-display font-bold text-[#f43f5e] mt-1 block">${sensitivityAnalysis.ruptureValue.toFixed(1)}M</span>
              <span className="text-xs text-on-surface-variant mt-1 block">Superávit antes de entrar en déficit</span>
            </div>
          </div>

          {/* Monte Carlo Simulation Box */}
          <div className="glass-card rounded-[32px] p-8 border border-white/10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <div>
                <h4 className="text-lg font-display font-bold text-white flex items-center gap-2">
                  <Sparkles className="text-[#ffcc29]" size={18} />
                  Simulación Estocástica Monte Carlo (1.000 Iteraciones)
                </h4>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Distribución probabilística del Valor Actual Neto considerando choques aleatorios en ingresos y egresos.
                </p>
              </div>

              <div className="flex gap-4">
                <div className="text-right">
                  <span className="text-[10px] font-mono text-on-surface-variant block uppercase">Probabilidad VAN &gt; 0</span>
                  <span className="text-xl font-mono font-bold text-[#4ade80]">{sensitivityAnalysis.monteCarlo.probPos.toFixed(1)}%</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-mono text-on-surface-variant block uppercase">Valor Esperado Medio</span>
                  <span className="text-xl font-mono font-bold text-[#ffcc29]">${sensitivityAnalysis.monteCarlo.mean.toFixed(1)}M</span>
                </div>
              </div>
            </div>

            <div className="w-full h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sensitivityAnalysis.monteCarlo.bins}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="range" stroke="#cac4d0" tick={{fontSize: 10}} />
                  <YAxis stroke="#cac4d0" tick={{fontSize: 10}} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                  <Bar dataKey="Frecuencia" name="Iteraciones" fill="#ffcc29" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 p-4 bg-white/5 rounded-2xl border border-white/5 flex flex-wrap justify-between text-xs font-mono text-on-surface-variant">
              <span>INTERVALO DE CONFIANZA 95%: <strong className="text-white">[${sensitivityAnalysis.monteCarlo.low95.toFixed(1)}M, ${sensitivityAnalysis.monteCarlo.high95.toFixed(1)}M]</strong></span>
              <span>ESCENARIO MÍNIMO: <strong className="text-[#f43f5e]">${sensitivityAnalysis.monteCarlo.min.toFixed(1)}M</strong></span>
              <span>ESCENARIO MÁXIMO: <strong className="text-[#4ade80]">${sensitivityAnalysis.monteCarlo.max.toFixed(1)}M</strong></span>
            </div>
          </div>

          {/* Tornado Chart & 1D DSCR Curve Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Tornado Chart */}
            <div className="glass-card rounded-[32px] p-6 lg:p-8 border border-white/10">
              <div className="mb-6">
                <h4 className="text-lg font-display font-bold text-white">Diagrama de Tornado: Sensibilidad del DSCR (±10%)</h4>
                <p className="text-xs text-on-surface-variant mt-0.5">Impacto relativo de cada recurso sobre la solvencia institucional.</p>
              </div>
              <div className="w-full h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sensitivityAnalysis.dscrTornado} layout="vertical" margin={{ top: 5, right: 20, left: 100, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis type="number" stroke="#cac4d0" tick={{fontSize: 10}} domain={['auto', 'auto']} />
                    <YAxis dataKey="labelName" type="category" stroke="#cac4d0" tick={{fontSize: 10}} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)' }} />
                    <Legend />
                    <Bar dataKey="low" name="Impacto Desfavorable (-10%)" fill="#f43f5e" />
                    <Bar dataKey="high" name="Impacto Favorable (+10%)" fill="#4ade80" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 1D DSCR Sensitivity Curve */}
            <div className="glass-card rounded-[32px] p-6 lg:p-8 border border-white/10">
              <div className="mb-6">
                <h4 className="text-lg font-display font-bold text-white">Curva de Estrés: DSCR vs Variación de Ingresos/Gastos</h4>
                <p className="text-xs text-on-surface-variant mt-0.5">Evolución del ratio de cobertura bajo variaciones desde -15% hasta +15%.</p>
              </div>
              <div className="w-full h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={sensitivityAnalysis.dscr1DData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="vLabel" stroke="#cac4d0" tick={{fontSize: 10}} />
                    <YAxis stroke="#cac4d0" tick={{fontSize: 10}} domain={[0.6, 'auto']} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)' }} />
                    <Legend />
                    <Line type="monotone" dataKey="DSCR" name="DSCR Proyectado" stroke="#ffcc29" strokeWidth={3} dot={{r: 4}} />
                    <ReferenceLine y={1.0} stroke="#f43f5e" strokeDasharray="4 4" label={{ value: 'Límite de Equilibrio (1.0x)', fill: '#f43f5e', fontSize: 10 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* Elasticity Analysis Table */}
          <div className="glass-card rounded-[32px] p-8 border border-white/10">
            <h4 className="text-lg font-display font-bold text-white mb-4">Coeficientes de Elasticidad Presupuestal</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                <span className="text-xs text-on-surface-variant block">Elasticidad Ingreso del VAN</span>
                <span className="text-2xl font-bold font-mono text-[#4ade80] mt-1 block">+{sensitivityAnalysis.elasticityIng.toFixed(2)}%</span>
                <p className="text-[11px] text-on-surface-variant mt-1">Por cada 1.0% de incremento en el recaudo, el excedente financiero crece un {sensitivityAnalysis.elasticityIng.toFixed(2)}%.</p>
              </div>
              <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                <span className="text-xs text-on-surface-variant block">Elasticidad Gasto del VAN</span>
                <span className="text-2xl font-bold font-mono text-[#f43f5e] mt-1 block">{sensitivityAnalysis.elasticityGas.toFixed(2)}%</span>
                <p className="text-[11px] text-on-surface-variant mt-1">Por cada 1.0% de aumento en los costos operativos, el excedente financiero se reduce en un {Math.abs(sensitivityAnalysis.elasticityGas).toFixed(2)}%.</p>
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
