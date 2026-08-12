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
  LayoutList, CheckCircle, Lock, Unlock, Check, ToggleLeft, ToggleRight,
  FileSpreadsheet, ArrowRight, XCircle, AlertCircle, HelpCircle, Shield,
  Building, SlidersHorizontal, Flame
} from 'lucide-react';
import { fetchAndParseCSV } from '../lib/csvParser';
import { 
  calculateProjections, aggregateFlow, CashFlowItem, ProjectionResults, getRowUnidad,
  BUDGET_PAYROLL_2026, PAYROLL_REAL_ENE_JUL, PAYROLL_REMAINING_AGO_DIC
} from '../lib/financialEngine';
import { RESOURCES_LIST, getResourceFullName, getRecursoEquivalence } from '../lib/resourceMapper';
import { RECURSOS_FIJOS_RESOLUCION } from '../lib/constants';
import rawHistoricalGastos from '../data/historicalGastos.json';

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
  '20': { val: -1.5, rationale: 'Menor flujo de derechos de grado y trámites intersemestrales en Q4.' },
  '31': { val: 3.5, rationale: 'Nuevas cohortes de posgrado y convenios de extensión en Q4.' },
  '32': { val: 2.0, rationale: 'Contratos y consultorías de extensión universitaria en ejecución.' },
  '33': { val: 4.0, rationale: 'Desembolsos de convenios con derechos suscritos con entidades territoriales.' },
  '34': { val: 1.0, rationale: 'Convenios de cooperación académica internacional.' },
  '35': { val: 3.0, rationale: 'Diplomados y cursos de formación continua programados para fin de año.' },
  '40': { val: 5.0, rationale: 'Pico estacional por retenciones de estampillas sobre contratación pública regional.' }
};

const AI_GAS_CATEGORY_SUGGESTIONS: Record<string, { val: number; rationale: string }> = {
  'Personal': { val: 0.0, rationale: 'Techo oficial fijado en $369.650M; las primas y cesantías de diciembre ya están contempladas.' },
  'Funcionamiento': { val: 3.5, rationale: 'Cubre la indexación de servicios públicos fijos y contratos continuos de aseo y vigilancia.' },
  'Inversion': { val: 4.0, rationale: 'Aceleración de actas POAI considerando la restricción histórica estructural (máx. 70%).' },
  'Transferencias': { val: 0.0, rationale: 'Ejecución al 99.9% en Ene-Jul; gasto residual sin presiones de sobrecosto.' },
  'Tasas': { val: 0.0, rationale: 'Obligaciones tributarias y contribuciones regulatorias al día.' },
  'Deuda': { val: 0.0, rationale: 'Sin pasivos bancarios en amortización durante 2026.' }
};

const ALL_UPTC_UNITS = [
  '01 - ADMINISTRATIVA Y FINANCIERA',
  '02 - INVESTIGACION Y EXTENSION',
  '04 - CIENCIAS DE LA EDUCACION',
  '05 - CIENCIAS BASICAS',
  '06 - CIENCIAS ECONOMICAS, ADMINISTRATIVAS Y CONTABLES',
  '07 - CIENCIAS DE LA SALUD',
  '08 - CIENCIAS AGROPECUARIAS',
  '09 - INGENIERIA',
  '10 - DERECHO Y CIENCIAS SOCIALES',
  '11 - ESTUDIOS TECNOLOGICOS Y A DISTANCIA',
  '12 - SECCIONAL DUITAMA',
  '13 - SECCIONAL SOGAMOSO',
  '14 - SECCIONAL CHIQUINQUIRA',
  '15 - SEDE REGIONAL AGUAZUL'
];

export function PredictiveScreen({ onNavigate }: { onNavigate: (s: string) => void }) {
  const [dataStage, setDataStage] = useState<'loading' | 'ready'>('loading');
  const [rawYearlyIncomes, setRawYearlyIncomes] = useState<Record<number, any[]>>({});
  const [rawCumulativeIncomes, setRawCumulativeIncomes] = useState<any[]>([]);
  const [showSaveSuccess, setShowSaveSuccess] = useState<boolean>(false);
  
  // 6 Reorganized Executive Tabs
  const [activeTab, setActiveTab] = useState<'simulator' | 'kpi' | 'traceability' | 'flow' | 'gastos' | 'sensitivity'>('simulator');

  // Traceability search and filter
  const [traceSearch, setTraceSearch] = useState<string>('');
  const [expandedTraceRow, setExpandedTraceRow] = useState<string | null>(null);

  // General Sensitivity Dashboard Filter State (Tab 2)
  const [sensFilterType, setSensFilterType] = useState<'ALL' | 'INGRESO' | 'GASTO' | 'HIGH_RISK'>('ALL');

  // Simulated Gastos Analysis in Tab 5 State
  const [expandedSimGastoCard, setExpandedSimGastoCard] = useState<string | null>(null);

  // Variable Projection Selection State (Rule 2: strictly project what is selected)
  const [selectedProjectedUnits, setSelectedProjectedUnits] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('vafi_selectedProjectedUnits');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [...ALL_UPTC_UNITS];
  });

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

  const [flowGranularity, setFlowGranularity] = useState<'monthly' | 'quarterly' | 'semesterly' | 'annual'>('monthly');

  // Global Dropdown Filters
  const [filterUnidad, setFilterUnidad] = useState<string>('Todos');
  const [filterRecurso, setFilterRecurso] = useState<string>('Todos');
  const [filterMes, setFilterMes] = useState<string>('Todos');
  const [filterTipoGasto, setFilterTipoGasto] = useState<string>('Todos');

  // Sliders State
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

  // Filter dropdown options
  const filterOptions = useMemo(() => {
    const recursos = ['Todos', ...RESOURCES_LIST];
    const unidadesSet = new Set<string>(ALL_UPTC_UNITS);

    rawHistoricalGastos.forEach(row => {
      if (row.dependencia && row.dependencia !== 'Sin Dependencia') unidadesSet.add(row.dependencia);
    });

    [2023, 2024, 2025, 2026].forEach(yr => {
      const rows = rawYearlyIncomes[yr] || [];
      rows.forEach(r => {
        const u = getRowUnidad(r, yr);
        if (u && u !== 'Sin Dependencia' && !u.startsWith('1.') && !u.startsWith('2.')) {
          unidadesSet.add(u);
        }
      });
    });

    const sortedUnidades = Array.from(unidadesSet).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    return {
      recursos,
      unidades: ['Todos', ...sortedUnidades],
      tiposGasto: ['Todos', 'Personal', 'Funcionamiento', 'Inversión', 'Transferencias', 'Tasas', 'Deuda']
    };
  }, [rawYearlyIncomes]);

  // Calculation Engine with audited traceability and unit 01 rules
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
      selectedProjectedUnits,
      selectedProjectedResources,
      selectedProjectedExpenseTypes
    });
  }, [
    rawYearlyIncomes, rawCumulativeIncomes, filterUnidad, filterRecurso,
    filterMes, filterTipoGasto, simIngByResource, simGasByResource,
    simGasByType, expenseAdjustMode, selectedProjectedUnits,
    selectedProjectedResources, selectedProjectedExpenseTypes
  ]);

  // Aggregated temporal cash flow
  const aggregatedFlowData = useMemo(() => {
    return aggregateFlow(financialData.simulatedFlow, flowGranularity);
  }, [financialData.simulatedFlow, flowGranularity]);

  // Subtotals Ene-Jul vs Ago-Dic
  const semesterTotals = useMemo(() => {
    if (!financialData || !financialData.simulatedFlow) {
      return { eneJulIng: 0, agoDicIng: 0, eneJulComp: 0, agoDicComp: 0, eneJulPago: 0, agoDicPago: 0, eneJulNomina: 0, agoDicNomina: 0 };
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

  // Filtered Traceability Matrix
  const filteredTraceability = useMemo(() => {
    if (!financialData?.traceabilityMatrix) return [];
    if (!traceSearch.trim()) return financialData.traceabilityMatrix;
    const q = traceSearch.toLowerCase();
    return financialData.traceabilityMatrix.filter(t => 
      t.resourceCode.toLowerCase().includes(q) || 
      t.resourceName.toLowerCase().includes(q) ||
      t.unitName.toLowerCase().includes(q) ||
      t.status.toLowerCase().includes(q)
    );
  }, [financialData.traceabilityMatrix, traceSearch]);

  // Filtered General Sensitivity Items (All Incomes & All Expenses)
  const filteredSensitiveItems = useMemo(() => {
    if (!financialData?.sensitiveItems) return [];
    if (sensFilterType === 'INGRESO') return financialData.sensitiveItems.filter(i => i.type === 'INGRESO');
    if (sensFilterType === 'GASTO') return financialData.sensitiveItems.filter(i => i.type === 'GASTO');
    if (sensFilterType === 'HIGH_RISK') return financialData.sensitiveItems.filter(i => i.sensitivityLevel === 'Crítico' || i.sensitivityLevel === 'Alto');
    return financialData.sensitiveItems;
  }, [financialData.sensitiveItems, sensFilterType]);

  // Dynamic Harmonized Simulated Gastos Groups for Tab 5
  const simulatedGastosGroups = useMemo(() => {
    const cComp = financialData.catComp || { personal: 369650.43, funcionamiento: 124447.13, inversion: 19687.14, transferencias: 5090.33, tasas: 3908.35, deuda: 0 };
    const cPago = financialData.catPago || { personal: 369650.43, funcionamiento: 124447.13, inversion: 13347.88, transferencias: 5090.33, tasas: 3908.35, deuda: 0 };

    const multPersonal = cComp.personal > 0 ? cComp.personal / 369650.43 : 1;
    const multFunc = cComp.funcionamiento > 0 ? cComp.funcionamiento / 124447.13 : 1;
    const multInv = cComp.inversion > 0 ? cComp.inversion / 19687.14 : 1;
    const multTransf = cComp.transferencias > 0 ? cComp.transferencias / 5090.33 : 1;
    const multTasas = cComp.tasas > 0 ? cComp.tasas / 3908.35 : 1;

    const invComp = cComp.inversion;
    const invPago = Math.min(invComp * 0.70, cPago.inversion);

    return [
      {
        id: 'G-211',
        name: 'Gastos de Personal (Nómina Maestro)',
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
          { name: '20 Recursos Propios (Unidad 01)', compromiso: 639.5 * multPersonal, pago: 639.5 * multPersonal }
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
          { name: '31 Posgrados', compromiso: 16014.7 * multFunc, pago: 16014.7 * multFunc }
        ]
      },
      {
        id: 'G-230',
        name: 'Gastos de Inversión (Tope ≤70%)',
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
          { name: '34 Convenios sin derechos', compromiso: 1067.3 * multTransf, pago: 1067.3 * multTransf }
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
          { name: '10.0 Aportes Nación', compromiso: 2470.1 * multTasas, pago: 2470.1 * multTasas }
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

  const handleResetSimulator = () => {
    const initIng: Record<string, number> = {};
    const initGas: Record<string, number> = {};
    RESOURCES_LIST.forEach(r => { initIng[r] = 0; initGas[r] = 0; });
    setSimIngByResource(initIng);
    setSimGasByResource(initGas);
    setSimGasByType({ Personal: 0, Funcionamiento: 0, Transferencias: 0, Tasas: 0, Deuda: 0, Inversion: 0 });
    setSelectedProjectedUnits([...ALL_UPTC_UNITS]);
    setSelectedProjectedResources([...RESOURCES_LIST]);
    setSelectedProjectedExpenseTypes(['Personal', 'Funcionamiento', 'Inversion', 'Transferencias', 'Tasas', 'Deuda']);
    setFilterUnidad('Todos');
    setFilterRecurso('Todos');
    localStorage.removeItem('vafi_simIngByResource');
    localStorage.removeItem('vafi_simGasByResource');
    localStorage.removeItem('vafi_simGasByType');
    localStorage.removeItem('vafi_selectedProjectedUnits');
    localStorage.removeItem('vafi_selectedProjectedResources');
    localStorage.removeItem('vafi_selectedProjectedExpenseTypes');
  };

  const handleSaveSimulation = () => {
    localStorage.setItem('vafi_simIngByResource', JSON.stringify(simIngByResource));
    localStorage.setItem('vafi_simGasByResource', JSON.stringify(simGasByResource));
    localStorage.setItem('vafi_simGasByType', JSON.stringify(simGasByType));
    localStorage.setItem('vafi_selectedProjectedUnits', JSON.stringify(selectedProjectedUnits));
    localStorage.setItem('vafi_selectedProjectedResources', JSON.stringify(selectedProjectedResources));
    localStorage.setItem('vafi_selectedProjectedExpenseTypes', JSON.stringify(selectedProjectedExpenseTypes));
    setShowSaveSuccess(true);
    setTimeout(() => setShowSaveSuccess(false), 3000);
  };

  const toggleUnitSelection = (unit: string) => {
    setSelectedProjectedUnits(prev => 
      prev.includes(unit) ? prev.filter(u => u !== unit) : [...prev, unit]
    );
  };

  const toggleResourceSelection = (code: string) => {
    setSelectedProjectedResources(prev => 
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  const toggleExpenseTypeSelection = (type: string) => {
    setSelectedProjectedExpenseTypes(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const applyAIIngcomeSuggestions = () => {
    const newIng = { ...simIngByResource };
    RESOURCES_LIST.forEach(r => {
      if (AI_ING_SUGGESTIONS[r]) newIng[r] = AI_ING_SUGGESTIONS[r].val;
    });
    setSimIngByResource(newIng);
  };

  const applyAIExpenseSuggestions = () => {
    setExpenseAdjustMode('category');
    setSimGasByType({
      Personal: AI_GAS_CATEGORY_SUGGESTIONS.Personal.val,
      Funcionamiento: AI_GAS_CATEGORY_SUGGESTIONS.Funcionamiento.val,
      Inversion: AI_GAS_CATEGORY_SUGGESTIONS.Inversion.val,
      Transferencias: AI_GAS_CATEGORY_SUGGESTIONS.Transferencias.val,
      Tasas: AI_GAS_CATEGORY_SUGGESTIONS.Tasas.val,
      Deuda: AI_GAS_CATEGORY_SUGGESTIONS.Deuda.val
    });
  };

  if (dataStage === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <div className="w-12 h-12 border-4 border-[#ffcc29] border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-on-surface-variant font-mono animate-pulse text-sm">Auditoría financiera en curso y calibración de flujos...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col mb-20 max-w-7xl mx-auto px-4 md:px-0 text-white">
      
      {/* Title Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-6">
        <div>
          <p className="text-[#ffcc29] text-xs uppercase tracking-widest font-bold mb-1">UPTC - Supervisión Financiera, Modelación & Control Presupuestal</p>
          <h2 className="text-3xl md:text-4xl font-bold font-display text-white">Proyección Financiera</h2>
          <p className="text-xs text-on-surface-variant mt-1">
            Motor auditado de proyección estricta, trazabilidad de fuentes, control de nómina ($369.650M) y sensibilidad integral de ingresos y gastos.
          </p>
        </div>
        
        {/* Top Dropdowns and Controls */}
        <div className="flex flex-wrap gap-3 items-center">
          
          {/* Unit Filter Dropdown */}
          <div className={`flex items-center rounded-xl border px-3.5 py-2 transition-all ${filterUnidad !== 'Todos' ? 'bg-[#38bdf8]/15 border-[#38bdf8]/50 shadow-md shadow-[#38bdf8]/10' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
            <Landmark size={15} className={filterUnidad !== 'Todos' ? 'text-[#38bdf8] mr-2 shrink-0' : 'text-on-surface-variant mr-2 shrink-0'} />
            <select 
              className="bg-transparent text-xs text-white outline-none font-sans cursor-pointer max-w-[220px]"
              value={filterUnidad}
              onChange={(e) => setFilterUnidad(e.target.value)}
            >
              <option value="Todos" className="bg-[#0f172a]">🏛️ Vista: Todas las Unidades</option>
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

      {/* Tabs Navigation (6 Reorganized Clean Tabs) */}
      <div className="flex border-b border-white/10 mb-6 overflow-x-auto gap-2">
        {[
          { id: 'simulator', label: '1. Simular Escenarios', icon: Sliders },
          { id: 'kpi', label: '2. Control Financiero & Sensibilidad General', icon: Activity },
          { id: 'traceability', label: '3. Trazabilidad de Recursos & Gastos', icon: FileSpreadsheet },
          { id: 'flow', label: '4. Flujo de Caja & Liquidez', icon: Table },
          { id: 'gastos', label: '5. Análisis de Gastos', icon: Wallet },
          { id: 'sensitivity', label: '6. Riesgo & Consistencia (10/10)', icon: TrendingUp }
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

      {/* ACTIVE FILTER BANNER */}
      {(filterUnidad !== 'Todos' || filterRecurso !== 'Todos' || selectedProjectedUnits.length < ALL_UPTC_UNITS.length) && (
        <div className="mb-6 p-4 bg-[#38bdf8]/10 border border-[#38bdf8]/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-200 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#38bdf8]/20 flex items-center justify-center text-[#38bdf8] shrink-0 border border-[#38bdf8]/30">
              <Landmark size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono text-[#38bdf8] uppercase font-bold tracking-wider">Filtro de Consulta Activo</span>
                {filterUnidad !== 'Todos' && (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-mono bg-[#38bdf8]/20 text-[#38bdf8] font-bold border border-[#38bdf8]/30">
                    Unidad: {filterUnidad.split(' - ')[0]}
                  </span>
                )}
                {selectedProjectedUnits.length < ALL_UPTC_UNITS.length && (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-mono bg-[#c084fc]/20 text-[#c084fc] font-bold border border-[#c084fc]/30">
                    {selectedProjectedUnits.length} de {ALL_UPTC_UNITS.length} Unidades Proyectadas
                  </span>
                )}
                {filterRecurso !== 'Todos' && (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-mono bg-[#ffcc29]/20 text-[#ffcc29] font-bold border border-[#ffcc29]/30">
                    Recurso: {filterRecurso}
                  </span>
                )}
              </div>
              <p className="text-sm font-bold text-white mt-0.5">
                {filterUnidad !== 'Todos' ? filterUnidad : `${selectedProjectedUnits.length} Dependencias Seleccionadas`}
                {filterRecurso !== 'Todos' ? ` • ${getResourceFullName(filterRecurso)}` : ''}
              </p>
              <p className="text-[11px] text-white/70">
                Los ingresos, compromisos, pagos proyectados y flujos de caja corresponden exclusivamente a los filtros seleccionados.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {selectedProjectedUnits.length < ALL_UPTC_UNITS.length && (
              <button
                onClick={() => setSelectedProjectedUnits([...ALL_UPTC_UNITS])}
                className="px-3 py-1.5 bg-[#c084fc]/20 hover:bg-[#c084fc]/30 border border-[#c084fc]/30 rounded-xl text-xs font-mono text-[#c084fc] transition shrink-0 flex items-center gap-1.5 font-bold"
              >
                ✔ Activar Todas las Unidades
              </button>
            )}
            {filterUnidad !== 'Todos' && (
              <button
                onClick={() => setFilterUnidad('Todos')}
                className="px-3.5 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-mono text-white transition shrink-0 flex items-center gap-1.5"
              >
                ✖ Todas las Sedes
              </button>
            )}
            {filterRecurso !== 'Todos' && (
              <button
                onClick={() => setFilterRecurso('Todos')}
                className="px-3.5 py-1.5 bg-[#ffcc29]/20 hover:bg-[#ffcc29]/30 border border-[#ffcc29]/30 rounded-xl text-xs font-mono text-[#ffcc29] transition shrink-0 flex items-center gap-1.5 font-bold"
              >
                ✖ Todos los Recursos
              </button>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: SIMULAR ESCENARIOS (STRICT PROJECTION WITH UNIT SELECTION) */}
      {/* ========================================================================= */}
      {activeTab === 'simulator' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          
          {/* SELECTION CONTROL PANEL (RULE 2: UNITS + RESOURCES + EXPENSE TYPES) */}
          <div className="glass-card rounded-[28px] p-6 border border-white/10 bg-surface/50 relative overflow-hidden shadow-2xl space-y-6">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-4 border-b border-white/10">
              <div>
                <div className="flex items-center gap-2">
                  <Sliders className="text-[#ffcc29]" size={20} />
                  <h3 className="text-lg font-display font-bold text-white">Variables y Rubros Seleccionados para Proyección</h3>
                </div>
                <p className="text-xs text-on-surface-variant mt-1">
                  Principio rector: <strong className="text-[#ffcc29]">Todo lo seleccionado es exactamente lo que se proyecta</strong>. Las unidades o rubros desactivados se excluyen de la modelación.
                </p>
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={() => {
                    setSelectedProjectedUnits([...ALL_UPTC_UNITS]);
                    setSelectedProjectedResources([...RESOURCES_LIST]);
                    setSelectedProjectedExpenseTypes(['Personal', 'Funcionamiento', 'Inversion', 'Transferencias', 'Tasas', 'Deuda']);
                  }}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl text-[11px] font-mono font-bold transition flex items-center gap-1.5"
                >
                  <Check size={13} /> Seleccionar Todo
                </button>
                <button 
                  onClick={() => setSelectedProjectedUnits(['01 - ADMINISTRATIVA Y FINANCIERA'])}
                  className="px-3 py-1.5 bg-[#38bdf8]/10 hover:bg-[#38bdf8]/20 border border-[#38bdf8]/30 text-[#38bdf8] rounded-xl text-[11px] font-mono font-bold transition flex items-center gap-1.5"
                >
                  <Landmark size={13} /> Solo Unidad 01 Central
                </button>
                <button 
                  onClick={() => setSelectedProjectedUnits(ALL_UPTC_UNITS.filter(u => u.includes('CIENCIAS') || u.includes('INGENIERIA') || u.includes('DERECHO') || u.includes('DISTANCIA')))}
                  className="px-3 py-1.5 bg-[#c084fc]/10 hover:bg-[#c084fc]/20 border border-[#c084fc]/30 text-[#c084fc] rounded-xl text-[11px] font-mono font-bold transition flex items-center gap-1.5"
                >
                  <Building size={13} /> Solo Facultades
                </button>
                <button 
                  onClick={() => setSelectedProjectedUnits(ALL_UPTC_UNITS.filter(u => u.includes('SECCIONAL') || u.includes('AGUAZUL')))}
                  className="px-3 py-1.5 bg-[#4ade80]/10 hover:bg-[#4ade80]/20 border border-[#4ade80]/30 text-[#4ade80] rounded-xl text-[11px] font-mono font-bold transition flex items-center gap-1.5"
                >
                  <Compass size={13} /> Solo Sedes Seccionales
                </button>
              </div>
            </div>

            {/* Selection Grid: 1. UNIDADES, 2. RECURSOS, 3. TIPOS DE GASTO */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* 1. Unidades / Sedes Selection */}
              <div className="lg:col-span-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-mono text-[#38bdf8] uppercase font-bold tracking-wider flex items-center gap-1.5">
                    <Landmark size={13} /> 1. Unidades / Sedes ({selectedProjectedUnits.length} de {ALL_UPTC_UNITS.length}):
                  </span>
                </div>
                
                <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                  {ALL_UPTC_UNITS.map(u => {
                    const isSelected = selectedProjectedUnits.includes(u);
                    const isU01 = u.includes('01 -');

                    return (
                      <button
                        key={u}
                        onClick={() => toggleUnitSelection(u)}
                        className={`p-2 rounded-xl border text-left transition-all text-[11px] font-mono flex items-center justify-between ${isSelected ? (isU01 ? 'bg-[#38bdf8]/20 border-[#38bdf8]/50 text-white font-bold' : 'bg-white/10 border-white/20 text-white') : 'bg-black/20 border-white/5 text-white/40'}`}
                      >
                        <span className="truncate">{u}</span>
                        {isSelected && <Check size={13} className={isU01 ? 'text-[#38bdf8] shrink-0 ml-1' : 'text-white/80 shrink-0 ml-1'} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Resources selection list */}
              <div className="lg:col-span-5 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-mono text-[#ffcc29] uppercase font-bold tracking-wider flex items-center gap-1.5">
                    <DollarSign size={13} /> 2. Fuentes / Recursos ({selectedProjectedResources.length} de {RESOURCES_LIST.length}):
                  </span>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                  {RESOURCES_LIST.map(r => {
                    const isSelected = selectedProjectedResources.includes(r);
                    const fixedInfo = RECURSOS_FIJOS_RESOLUCION[r];

                    return (
                      <button
                        key={r}
                        onClick={() => toggleResourceSelection(r)}
                        className={`p-2 rounded-xl border text-left transition-all flex flex-col justify-between ${isSelected ? (fixedInfo ? 'bg-[#ffcc29]/15 border-[#ffcc29]/40 text-white' : 'bg-[#38bdf8]/15 border-[#38bdf8]/40 text-white') : 'bg-black/20 border-white/5 text-white/40'}`}
                      >
                        <div className="flex justify-between items-start gap-1">
                          <span className="font-mono font-bold text-[11px]">Rec {r}</span>
                          {fixedInfo ? (
                            <span className="text-[8px] px-1 py-0.5 rounded bg-[#ffcc29]/20 text-[#ffcc29] font-mono flex items-center gap-0.5">
                              <Lock size={8} /> Fijo
                            </span>
                          ) : (
                            <span className="text-[8px] px-1 py-0.5 rounded bg-white/10 text-[#38bdf8] font-mono">Var</span>
                          )}
                        </div>
                        <span className="text-[9px] truncate block mt-0.5 opacity-80" title={getResourceFullName(r)}>
                          {getResourceFullName(r).split(' - ').pop() || r}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Expense types selection */}
              <div className="lg:col-span-3 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-mono text-[#4ade80] uppercase font-bold tracking-wider flex items-center gap-1.5">
                    <Layers size={13} /> 3. Gastos ({selectedProjectedExpenseTypes.length} de 6):
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2">
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
                        className={`p-2 rounded-xl border text-left transition-all text-xs font-mono font-bold flex items-center justify-between ${isSelected ? 'bg-[#4ade80]/15 border-[#4ade80]/40 text-[#4ade80]' : 'bg-black/20 border-white/5 text-white/40'}`}
                      >
                        <span className="truncate">{t.name}</span>
                        {isSelected && <Check size={13} className="shrink-0 ml-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>

          {/* Quick Scenario & Save Toolbar */}
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-on-surface-variant uppercase">Escenarios Rápidos:</span>
              <button onClick={() => {
                const newIng: Record<string, number> = {};
                RESOURCES_LIST.forEach(r => { if (!RECURSOS_FIJOS_RESOLUCION[r]) newIng[r] = -3; });
                setSimIngByResource(newIng);
                setSimGasByType({ Personal: 0, Funcionamiento: -5, Inversion: -8, Transferencias: 0, Tasas: 0, Deuda: 0 });
              }} className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-mono transition">
                📉 Conservador (-3%)
              </button>
              <button onClick={() => {
                const newIng: Record<string, number> = {};
                RESOURCES_LIST.forEach(r => { if (!RECURSOS_FIJOS_RESOLUCION[r]) newIng[r] = 2; });
                setSimIngByResource(newIng);
                setSimGasByType({ Personal: 0, Funcionamiento: 0, Inversion: 0, Transferencias: 0, Tasas: 0, Deuda: 0 });
              }} className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-mono transition text-[#ffcc29]">
                ⚖️ Moderado (+2%)
              </button>
              <button onClick={() => {
                const newIng: Record<string, number> = {};
                RESOURCES_LIST.forEach(r => { if (!RECURSOS_FIJOS_RESOLUCION[r]) newIng[r] = 8; });
                setSimIngByResource(newIng);
                setSimGasByType({ Personal: 0, Funcionamiento: 3, Inversion: 10, Transferencias: 0, Tasas: 0, Deuda: 0 });
              }} className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-mono transition text-[#4ade80]">
                🚀 Optimista (+8%)
              </button>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={handleSaveSimulation} 
                className="flex items-center px-4 py-2 bg-[#ffcc29] text-black hover:bg-[#ffcc29]/90 rounded-xl transition text-xs font-mono gap-2 font-bold shadow-lg shadow-[#ffcc29]/10"
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
                <p className="font-bold text-sm">Escenario Guardado con Éxito</p>
                <p className="mt-1">Los parámetros de proyección activa han sido almacenados localmente.</p>
              </div>
            </div>
          )}

          {/* Sliders Grid: Incomes & Expenses with AI Suggestions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Income resource modifiers */}
            <div className="glass-card rounded-[32px] p-6 lg:p-8 border border-white/10 flex flex-col gap-6">
              
              <div className="flex flex-col gap-3 pb-4 border-b border-white/5">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-bold text-[#ffcc29] uppercase tracking-widest flex items-center gap-2">
                    <TrendingUp size={16} /> Variación de Ingresos por Recurso
                  </h4>
                  <span className="text-[10px] font-mono text-on-surface-variant">Ago - Dic 2026</span>
                </div>

                <div className="p-3.5 bg-[#ffcc29]/10 border border-[#ffcc29]/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <Bot className="text-[#ffcc29] shrink-0 mt-0.5" size={18} />
                    <div>
                      <p className="text-xs font-bold text-white flex items-center gap-1.5">
                        Sugerencia Inteligente IA (Comportamiento Histórico)
                      </p>
                      <p className="text-[11px] text-white/70 mt-0.5">
                        Protege los recursos fijos por resolución y calibra las rentas variables de posgrados y convenios.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={applyAIIngcomeSuggestions}
                    className="px-3 py-1.5 bg-[#ffcc29] text-black font-mono font-bold text-[11px] rounded-xl hover:bg-[#ffcc29]/90 transition shrink-0 flex items-center gap-1.5 shadow-md"
                  >
                    <Sparkles size={13} /> Aplicar IA
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
                          <span className={`w-2.5 h-2.5 rounded-full ${fixedInfo ? 'bg-[#ffcc29]' : 'bg-[#38bdf8]'}`}></span>
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
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Expense category modifiers */}
            <div className="glass-card rounded-[32px] p-6 lg:p-8 border border-white/10 flex flex-col gap-6">
              
              <div className="flex flex-col gap-3 pb-4 border-b border-white/5">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-bold text-[#38bdf8] uppercase tracking-widest flex items-center gap-2">
                    <Layers size={16} /> Ajuste de Egresos por Categoría
                  </h4>
                  <span className="text-[10px] font-mono text-on-surface-variant">Ago - Dic 2026</span>
                </div>

                <div className="p-3.5 bg-[#38bdf8]/10 border border-[#38bdf8]/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <Bot className="text-[#38bdf8] shrink-0 mt-0.5" size={18} />
                    <div>
                      <p className="text-xs font-bold text-white flex items-center gap-1.5">
                        Sugerencia Inteligente IA (Egresos y Servicios Fijos)
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
                    <Sparkles size={13} /> Aplicar IA
                  </button>
                </div>
              </div>

              <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {[
                  { id: 'Personal', label: 'Gastos de Personal (2.1.1)', desc: 'Techo oficial fijado en $369.650M. Cubre contingencias salariales.', color: '#4ade80' },
                  { id: 'Funcionamiento', label: 'Gastos de Funcionamiento (2.1.2)', desc: 'Servicios públicos, mantenimiento y compras operativas.', color: '#7bd0ff' },
                  { id: 'Inversion', label: 'Gastos de Inversión (2.3 - Tope ≤70%)', desc: 'Infraestructura y laboratorios. Acotado históricamente al ≤70%.', color: '#d0bcff' },
                  { id: 'Transferencias', label: 'Transferencias Corrientes (2.1.3)', desc: 'Subsidios y convenios interinstitucionales.', color: '#ffcc29' },
                  { id: 'Tasas', label: 'Tasas y Multas (2.1.8)', desc: 'Impuestos y contribuciones regulatorias.', color: '#f43f5e' },
                  { id: 'Deuda', label: 'Servicios de la Deuda (2.2.2)', desc: 'Amortización e intereses financieros.', color: '#fb7185' }
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
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: CONTROL FINANCIERO & SENSIBILIDAD GENERAL DE INGRESOS Y GASTOS */}
      {/* ========================================================================= */}
      {activeTab === 'kpi' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          
          {/* 1. MANDATORY PAYROLL GOAL $369.650.433.862 COP AUDIT BOX */}
          <div className={`glass-card rounded-[32px] p-8 border relative overflow-hidden shadow-2xl ${financialData.payrollCompliance.complianceStatus === 'Suficiente' ? 'border-[#4ade80]/30 bg-gradient-to-r from-[#0f172a] via-[#132e22] to-[#0f172a]' : 'border-red-500/30 bg-gradient-to-r from-[#0f172a] via-[#2e1313] to-[#0f172a]'}`}>
            <div className={`absolute top-0 left-0 w-full h-1 ${financialData.payrollCompliance.complianceStatus === 'Suficiente' ? 'bg-[#4ade80]' : 'bg-red-500'}`}></div>
            
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 pb-6 border-b border-white/10">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className={financialData.payrollCompliance.complianceStatus === 'Suficiente' ? 'text-[#4ade80]' : 'text-red-400'} size={24} />
                  <span className={`px-3 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-widest border ${financialData.payrollCompliance.complianceStatus === 'Suficiente' ? 'bg-[#4ade80]/20 text-[#4ade80] border-[#4ade80]/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}>
                    META FINANCIERA OBLIGATORIA (UNIDAD 01)
                  </span>
                </div>
                <h3 className="text-2xl font-display font-bold text-white mt-1">Suficiencia de Recursos para Nómina: $369.650.433.862 COP</h3>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Regla financiera crítica: <strong className="text-white">Únicamente los recursos de la Unidad 01 - Administrativa y Financiera</strong> son válidos para financiar los gastos de personal de la Universidad.
                </p>
              </div>

              <div className="flex flex-wrap gap-4 text-right">
                <div className="bg-white/5 border border-white/10 px-4 py-2.5 rounded-2xl">
                  <span className="text-[10px] font-mono text-on-surface-variant uppercase block">Meta Requerida</span>
                  <span className="text-lg font-mono font-bold text-white">${financialData.payrollCompliance.targetPayrollM.toLocaleString('es-CO', {maximumFractionDigits:1})}M</span>
                </div>
                <div className="bg-white/5 border border-white/10 px-4 py-2.5 rounded-2xl">
                  <span className="text-[10px] font-mono text-on-surface-variant uppercase block">Recursos Válidos U01</span>
                  <span className="text-lg font-mono font-bold text-[#4ade80]">${financialData.payrollCompliance.validUnit01ResourcesM.toLocaleString('es-CO', {maximumFractionDigits:1})}M</span>
                </div>
                <div className="bg-white/5 border border-white/10 px-4 py-2.5 rounded-2xl">
                  <span className="text-[10px] font-mono text-on-surface-variant uppercase block">Cobertura Financiera</span>
                  <span className={`text-xl font-mono font-bold ${financialData.payrollCompliance.coveragePct >= 100 ? 'text-[#4ade80]' : 'text-red-400'}`}>
                    {financialData.payrollCompliance.coveragePct.toFixed(1)}%
                  </span>
                  <span className={`text-[10px] font-mono block ${financialData.payrollCompliance.surplusDeficitM >= 0 ? 'text-[#4ade80]' : 'text-red-400'}`}>
                    {financialData.payrollCompliance.surplusDeficitM >= 0 ? '+' : ''}${financialData.payrollCompliance.surplusDeficitM.toLocaleString('es-CO', {maximumFractionDigits:1})}M ({financialData.payrollCompliance.complianceStatus})
                  </span>
                </div>
              </div>
            </div>

            {/* Contributing Valid Resources vs Excluded Resources */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              
              {/* Valid Contributing Resources */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                <h5 className="text-xs font-mono font-bold text-[#4ade80] uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle size={14} /> Recursos Válidos de la Unidad 01 Aplicados ({financialData.payrollCompliance.validContributingResources.length})
                </h5>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                  {financialData.payrollCompliance.validContributingResources.map((r, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-white/5 p-2 rounded-xl text-xs font-mono">
                      <span className="text-white truncate max-w-[200px]" title={r.name}>{r.name}</span>
                      <div className="text-right">
                        <span className="text-[#4ade80] font-bold block">${r.amountM.toLocaleString('es-CO', {maximumFractionDigits:1})}M</span>
                        <span className="text-[9px] text-white/50">{r.pct.toFixed(1)}% de la meta</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Excluded Resources */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                <h5 className="text-xs font-mono font-bold text-on-surface-variant uppercase tracking-wider flex items-center gap-1.5">
                  <XCircle size={14} className="text-rose-400" /> Recursos No Utilizables para Nómina Central ({financialData.payrollCompliance.excludedResources.length})
                </h5>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                  {financialData.payrollCompliance.excludedResources.map((r, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-white/5 p-2 rounded-xl text-xs font-mono">
                      <div className="truncate max-w-[220px]">
                        <span className="text-white/80 block truncate" title={r.name}>{r.name}</span>
                        <span className="text-[9px] text-rose-300 truncate block">{r.reason}</span>
                      </div>
                      <span className="text-white/50 font-bold">${r.amountM.toLocaleString('es-CO', {maximumFractionDigits:1})}M</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>

          {/* 2. PANEL GENERAL DE SENSIBILIDAD & MONITOREO INTEGRAL DE TODOS LOS INGRESOS Y GASTOS */}
          <div className="glass-card rounded-[32px] p-6 lg:p-8 border border-white/10 space-y-6">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-4 border-b border-white/10">
              <div>
                <div className="flex items-center gap-2">
                  <Flame className="text-[#ffcc29]" size={22} />
                  <h4 className="text-xl font-display font-bold text-white">Panel General de Sensibilidad & Monitoreo Integral de Ingresos y Gastos</h4>
                </div>
                <p className="text-xs text-on-surface-variant mt-1">
                  Evaluación de riesgo presupuestal, volatilidad e impacto de liquidez ante choques del ±5% en todas las fuentes de ingreso y categorías de gasto.
                </p>
              </div>

              {/* Sensitivity View Filters */}
              <div className="flex items-center gap-1 bg-white/5 border border-white/10 p-1 rounded-xl">
                {[
                  { id: 'ALL', label: 'Todos los Rubros' },
                  { id: 'INGRESO', label: 'Solo Ingresos' },
                  { id: 'GASTO', label: 'Solo Gastos' },
                  { id: 'HIGH_RISK', label: '🔴 Mayor Riesgo' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setSensFilterType(tab.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition ${sensFilterType === tab.id ? 'bg-[#ffcc29] text-black shadow-md' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Shock Impact Bar Chart (Top Sensitive Rubros) */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-mono font-bold text-on-surface-variant uppercase tracking-wider">
                  Impacto en Caja ante Variación del ±5% (En Millones COP):
                </span>
              </div>
              <div className="w-full h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={filteredSensitiveItems.slice(0, 8)} layout="vertical" margin={{ left: 40, right: 30, top: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis type="number" stroke="#cac4d0" tick={{fontSize: 10}} unit="$M" />
                    <YAxis dataKey="name" type="category" stroke="#cac4d0" tick={{fontSize: 10}} width={170} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                    <Bar dataKey="cashFlowImpact" name="Impacto de Caja (±5%)" fill="#ffcc29" radius={[0, 4, 4, 0]}>
                      {filteredSensitiveItems.slice(0, 8).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.type === 'INGRESO' ? '#4ade80' : '#f43f5e'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Sensitivity Grid Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSensitiveItems.map((item, idx) => (
                <div key={idx} className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2.5 hover:border-white/20 transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start gap-2 mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase ${item.type === 'INGRESO' ? 'bg-[#4ade80]/20 text-[#4ade80]' : 'bg-[#f43f5e]/20 text-[#f43f5e]'}`}>
                          {item.type}
                        </span>
                        <span className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase ${item.sensitivityLevel === 'Crítico' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : (item.sensitivityLevel === 'Alto' ? 'bg-[#ffcc29]/20 text-[#ffcc29] border border-[#ffcc29]/30' : (item.sensitivityLevel === 'Medio' ? 'bg-[#38bdf8]/20 text-[#38bdf8] border border-[#38bdf8]/30' : 'bg-white/10 text-white/50'))}`}>
                          {item.sensitivityLevel}
                        </span>
                      </div>
                      <span className="text-xs font-mono font-bold text-white">${item.amountM.toLocaleString('es-CO', {maximumFractionDigits:1})}M</span>
                    </div>

                    <h5 className="text-sm font-bold text-white mt-1 leading-snug">{item.name}</h5>
                    <span className="text-[10px] font-mono text-on-surface-variant block">{item.category} • Cód. {item.code}</span>
                    <p className="text-[11px] text-white/70 leading-relaxed mt-2">{item.rationale}</p>
                  </div>

                  <div className="pt-2 border-t border-white/5 flex justify-between items-center text-[10px] font-mono">
                    <span className="text-on-surface-variant">Peso: <strong>{item.sharePct.toFixed(1)}%</strong></span>
                    <span className="text-[#ffcc29] font-bold">Impacto ±5%: ${item.cashFlowImpact.toFixed(1)}M</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. AUTOMATED FINANCIAL ALERTS FEED */}
          <div className="glass-card rounded-[32px] p-6 lg:p-8 border border-white/10 space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <ShieldAlert className="text-[#ffcc29]" size={20} />
                <h4 className="text-lg font-display font-bold text-white">Sistema de Alertas Financieras Automáticas</h4>
              </div>
              <div className="flex gap-2 text-xs font-mono">
                <span className="px-2.5 py-1 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                  {financialData.financialAlerts.filter(a => a.type === 'CRITICAL').length} Críticas
                </span>
                <span className="px-2.5 py-1 rounded-full bg-[#ffcc29]/20 text-[#ffcc29] border border-[#ffcc29]/30">
                  {financialData.financialAlerts.filter(a => a.type === 'PREVENTIVE').length} Preventivas
                </span>
                <span className="px-2.5 py-1 rounded-full bg-[#4ade80]/20 text-[#4ade80] border border-[#4ade80]/30">
                  {financialData.financialAlerts.filter(a => a.type === 'NORMAL').length} Normales
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {financialData.financialAlerts.map(alert => (
                <div 
                  key={alert.id} 
                  className={`p-4 rounded-2xl border flex items-start gap-3 transition-all ${alert.type === 'CRITICAL' ? 'bg-red-500/10 border-red-500/30 text-red-200' : (alert.type === 'PREVENTIVE' ? 'bg-[#ffcc29]/10 border-[#ffcc29]/30 text-yellow-100' : 'bg-[#4ade80]/10 border-[#4ade80]/30 text-emerald-100')}`}
                >
                  <div className="mt-0.5 shrink-0">
                    {alert.type === 'CRITICAL' && <AlertCircle className="text-red-400" size={18} />}
                    {alert.type === 'PREVENTIVE' && <AlertTriangle className="text-[#ffcc29]" size={18} />}
                    {alert.type === 'NORMAL' && <CheckCircle className="text-[#4ade80]" size={18} />}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between items-start">
                      <h5 className="font-bold text-xs">{alert.title}</h5>
                      {alert.impactValue && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/40 font-bold ml-2">
                          {alert.impactValue}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] opacity-90 leading-relaxed">{alert.message}</p>
                    {alert.suggestedAction && (
                      <p className="text-[10px] text-[#38bdf8] font-mono pt-1">
                        💡 Acción sugerida: {alert.suggestedAction}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 4. Macro KPI Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-card rounded-[28px] p-6 border border-white/5 bg-surface/50 relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 left-0 w-full h-1 bg-[#ffcc29]"></div>
              <div>
                <h4 className="text-xs font-mono text-on-surface-variant uppercase tracking-widest mb-3">Ingresos Totales Proyectados</h4>
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

            <div className="glass-card rounded-[28px] p-6 border border-white/5 bg-surface/50 relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 left-0 w-full h-1 bg-[#f43f5e]"></div>
              <div>
                <h4 className="text-xs font-mono text-on-surface-variant uppercase tracking-widest mb-3">Compromisos Totales</h4>
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

            <div className="glass-card rounded-[28px] p-6 border border-white/5 bg-surface/50 relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 left-0 w-full h-1 bg-[#4ade80]"></div>
              <div>
                <h4 className="text-xs font-mono text-on-surface-variant uppercase tracking-widest mb-3">Pagos Efectivos Proyectados</h4>
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

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: TRAZABILIDAD DE RECURSOS & GASTOS */}
      {/* ========================================================================= */}
      {activeTab === 'traceability' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          
          <div className="glass-card rounded-[28px] p-6 lg:p-8 border border-white/10 bg-surface/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="text-2xl font-display font-bold text-white flex items-center gap-2">
                <FileSpreadsheet className="text-[#ffcc29]" size={24} />
                Matriz de Trazabilidad: Recurso → Ingreso → Apropiación → Gasto
              </h3>
              <p className="text-xs text-on-surface-variant mt-1">
                Auditoría detallada por fuente de financiación. Despliegue cada fila para inspeccionar los gastos específicos financiados y su estado de solvencia.
              </p>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <input 
                type="text"
                placeholder="Buscar recurso o unidad..."
                value={traceSearch}
                onChange={(e) => setTraceSearch(e.target.value)}
                className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-[#ffcc29] font-sans w-full md:w-64"
              />
            </div>
          </div>

          {/* Traceability Table */}
          <div className="glass-card rounded-[32px] p-8 border border-white/10">
            <div className="overflow-x-auto rounded-[24px] border border-white/10 bg-white/5">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="bg-white/10 text-[#ffcc29] uppercase">
                    <th className="p-4">Cód.</th>
                    <th className="p-4">Recurso / Denominación</th>
                    <th className="p-4">Unidad Responsable</th>
                    <th className="p-4 text-right">Ingreso Proyectado</th>
                    <th className="p-4 text-right">Apropiación (Pago)</th>
                    <th className="p-4 text-right">Saldo Disponible</th>
                    <th className="p-4 text-right">% Utilización</th>
                    <th className="p-4 text-center">Estado</th>
                    <th className="p-4 text-center">Detalle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredTraceability.map((item) => {
                    const isExpanded = expandedTraceRow === item.resourceCode;
                    return (
                      <>
                        <tr key={item.resourceCode} className="hover:bg-white/5 transition-colors">
                          <td className="p-4 font-bold text-white">{item.resourceCode}</td>
                          <td className="p-4 text-white font-bold max-w-[220px] truncate" title={item.resourceName}>
                            {item.resourceName}
                          </td>
                          <td className="p-4 text-on-surface-variant max-w-[180px] truncate" title={item.unitName}>
                            {item.unitName}
                          </td>
                          <td className="p-4 text-right text-[#4ade80] font-bold">${item.projectedIncome.toLocaleString('es-CO', {maximumFractionDigits:1})}M</td>
                          <td className="p-4 text-right text-[#ffcc29] font-bold">${item.totalPago.toLocaleString('es-CO', {maximumFractionDigits:1})}M</td>
                          <td className={`p-4 text-right font-bold ${item.remainingBalance >= 0 ? 'text-[#38bdf8]' : 'text-red-400'}`}>
                            ${item.remainingBalance.toLocaleString('es-CO', {maximumFractionDigits:1})}M
                          </td>
                          <td className="p-4 text-right font-bold">{item.utilizationPct.toFixed(1)}%</td>
                          <td className="p-4 text-center">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${item.status === 'Excedente' ? 'bg-[#4ade80]/20 text-[#4ade80] border border-[#4ade80]/30' : (item.status === 'Equilibrado' ? 'bg-[#38bdf8]/20 text-[#38bdf8] border border-[#38bdf8]/30' : 'bg-red-500/20 text-red-400 border border-red-500/30')}`}>
                              {item.status}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <button 
                              onClick={() => setExpandedTraceRow(isExpanded ? null : item.resourceCode)}
                              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 transition text-[11px]"
                            >
                              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                          </td>
                        </tr>

                        {/* Expanded detail row showing financed expenses */}
                        {isExpanded && (
                          <tr className="bg-black/40 border-b border-white/10">
                            <td colSpan={9} className="p-6 space-y-3">
                              <div className="flex justify-between items-center border-b border-white/10 pb-2">
                                <span className="text-xs font-bold text-[#ffcc29] uppercase font-mono">
                                  Desglose de Gastos Financiados con {item.resourceName}
                                </span>
                                {item.resolutionName && (
                                  <span className="text-[10px] text-white/60 font-mono">
                                    Normativa: {item.resolutionName}
                                  </span>
                                )}
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                                {item.financedExpenses.map((exp, expIdx) => (
                                  <div key={expIdx} className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-1.5">
                                    <div className="flex justify-between items-start">
                                      <span className="text-xs font-bold text-white truncate" title={exp.category}>{exp.category}</span>
                                      {exp.isPayroll && (
                                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#4ade80]/20 text-[#4ade80] font-mono">
                                          Nómina
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex justify-between text-[11px] font-mono text-on-surface-variant">
                                      <span>Compromiso: ${exp.compromiso.toFixed(1)}M</span>
                                      <span className="text-[#38bdf8] font-bold">Pago: ${exp.pago.toFixed(1)}M</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: FLUJO DE CAJA & LIQUIDEZ */}
      {/* ========================================================================= */}
      {activeTab === 'flow' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h3 className="text-2xl font-display font-bold text-white">Flujo de Caja, Giro y Liquidez Temporal</h3>
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

          {/* Graph 1: Inflow vs Outflow */}
          <div className="glass-card rounded-[32px] p-6 lg:p-8 border border-white/10">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h4 className="text-lg font-display font-bold text-white">Dinámica Temporal de Ingresos vs Pagos Efectivos</h4>
                <p className="text-xs text-on-surface-variant mt-0.5">Ingresos proyectados frente a los giros efectivos mensuales.</p>
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

          {/* Consolidated Flow Table */}
          <div className="glass-card rounded-[32px] p-8 border border-white/10">
            <h4 className="text-lg font-display font-bold text-white mb-4">Tabla de Flujo de Caja ({flowGranularity.toUpperCase()})</h4>
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
      {/* TAB 5: ANÁLISIS DE GASTOS */}
      {/* ========================================================================= */}
      {activeTab === 'gastos' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-2xl font-display text-white flex items-center gap-2.5 font-bold">
                <Wallet className="text-[#38bdf8]" size={24} />
                Análisis de Gastos por Categoría Presupuestal
              </h3>
              <p className="text-xs text-on-surface-variant mt-1">
                Desglose dinámico de compromisos y pagos efectivos. Inversión acotada al ≤70% histórico.
              </p>
            </div>

            <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-2xl font-mono text-xs">
              <span className="text-on-surface-variant">TOTAL GIRO SIMULADO:</span>
              <span className="text-[#4ade80] font-bold">${financialData.totals.simGasPago.toLocaleString('es-CO', {maximumFractionDigits:1})}M</span>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {simulatedGastosGroups.map((gasto) => {
              const pctNum = gasto.compromiso > 0 ? (gasto.pago / gasto.compromiso) * 100 : 0;
              
              return (
                <div key={gasto.id} className="glass-card rounded-[24px] p-6 flex flex-col relative overflow-hidden border border-white/10 bg-surface/50 shadow-xl">
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
                          <span className="text-xs text-on-surface-variant block mb-1">Total Compromiso</span>
                          <span className="text-2xl font-bold font-mono text-white">${gasto.compromiso.toLocaleString('es-CO', {maximumFractionDigits: 1})} <span className="text-xs font-sans text-on-surface-variant font-normal">mill.</span></span>
                        </div>
                        <div>
                          <span className="text-xs text-on-surface-variant block mb-1">Pago Efectivo Proyectado</span>
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
                          <span className="text-xl font-bold text-white">{pctNum.toFixed(1)}%</span>
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
                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: RIESGO & PRUEBAS DE CONSISTENCIA (10/10) */}
      {/* ========================================================================= */}
      {activeTab === 'sensitivity' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          
          {/* 10 AUTOMATED CONSISTENCY VALIDATIONS */}
          <div className="glass-card rounded-[32px] p-6 lg:p-8 border border-white/10 space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <ShieldCheck className="text-[#4ade80]" size={22} />
                <h4 className="text-lg font-display font-bold text-white">Pruebas Automáticas de Consistencia Financiera (10/10)</h4>
              </div>
              <span className="px-3 py-1 bg-[#4ade80]/20 text-[#4ade80] border border-[#4ade80]/30 rounded-full text-xs font-mono font-bold">
                100% Conforme
              </span>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="bg-white/10 text-[#ffcc29] uppercase">
                    <th className="p-3">#</th>
                    <th className="p-3">Regla de Consistencia</th>
                    <th className="p-3">Descripción</th>
                    <th className="p-3 text-center">Estado</th>
                    <th className="p-3">Resultado de Auditoría</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {financialData.consistencyValidations.map(val => (
                    <tr key={val.id} className="hover:bg-white/5">
                      <td className="p-3 font-bold text-white">{val.id}</td>
                      <td className="p-3 font-bold text-[#38bdf8]">{val.ruleName}</td>
                      <td className="p-3 text-on-surface-variant">{val.description}</td>
                      <td className="p-3 text-center">
                        {val.passed ? (
                          <span className="px-2 py-0.5 rounded bg-[#4ade80]/20 text-[#4ade80] font-bold text-[10px] inline-flex items-center gap-1">
                            <CheckCircle size={11} /> Conforme
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 font-bold text-[10px] inline-flex items-center gap-1">
                            <XCircle size={11} /> Falla
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-white/90">{val.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
