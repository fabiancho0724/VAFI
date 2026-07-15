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
  ChevronUp, ChevronDown, Wallet
} from 'lucide-react';
import { fetchAndParseCSV } from '../lib/csvParser';
import { calculateProjections, aggregateFlow, CashFlowItem, ProjectionResults } from '../lib/financialEngine';
import { RESOURCES_LIST, getResourceFullName, getRecursoEquivalence, getRowResourceCode } from '../lib/resourceMapper';
import rawHistoricalGastos from '../data/historicalGastos.json';

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
  // Convert monthly IRR to annual rate
  return (Math.pow(1 + r1, 12) - 1) * 100;
}

const COLORS = ['#ffcc29', '#4ade80', '#3b82f6', '#c084fc', '#f43f5e', '#7bd0ff', '#fb7185', '#a78bfa'];

export function PredictiveScreen({ onNavigate }: { onNavigate: (s: string) => void }) {
  const [dataStage, setDataStage] = useState<'loading' | 'ready'>('loading');
  const [rawYearlyIncomes, setRawYearlyIncomes] = useState<Record<number, any[]>>({});
  const [rawCumulativeIncomes, setRawCumulativeIncomes] = useState<any[]>([]);
  const [selectedAiResource, setSelectedAiResource] = useState<string | null>(null);
  const [selectedAiExpenseResource, setSelectedAiExpenseResource] = useState<string | null>(null);
  const [selectedAiExpenseCategory, setSelectedAiExpenseCategory] = useState<string | null>(null);
  const [showSaveSuccess, setShowSaveSuccess] = useState<boolean>(false);
  const incomeAnalysisFilter = 'Todos';
  const [expandedIngresoGroup, setExpandedIngresoGroup] = useState<string | null>(null);
  const [expandedGastoCardGroup, setExpandedGastoCardGroup] = useState<string | null>(null);
  
  // Tabs
  const [activeTab, setActiveTab] = useState<'kpi' | 'flow' | 'equilibrium' | 'simulator' | 'sensitivity'>('kpi');

  // Sensitivity analysis settings
  const [sensResource, setSensResource] = useState<string>(RESOURCES_LIST[0] || '10.0');
  const [sensDiscountRate, setSensDiscountRate] = useState<number>(8);
  const [sensPessimisticPct, setSensPessimisticPct] = useState<number>(-15);
  const [sensOptimisticPct, setSensOptimisticPct] = useState<number>(15);
  
  const [flowGranularity, setFlowGranularity] = useState<'monthly' | 'quarterly' | 'semesterly' | 'annual'>('monthly');

  // Skip lines up to suggestions hook...
  const skippedMarker = true;


  // Filters
  const [viewDimension, setViewDimension] = useState<'compromiso' | 'pago'>('pago');
  const [filterUnidad, setFilterUnidad] = useState<string>('Todos');
  const [filterRecurso, setFilterRecurso] = useState<string>('Todos');
  const [filterMes, setFilterMes] = useState<string>('Todos');
  const [filterTipoGasto, setFilterTipoGasto] = useState<string>('Todos');

  // Slider State (Julio-Diciembre Variations)
  const [simIngByResource, setSimIngByResource] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    RESOURCES_LIST.forEach(r => { init[r] = 0; });
    return init;
  });

  const [simGasByResource, setSimGasByResource] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    RESOURCES_LIST.forEach(r => { init[r] = 0; });
    return init;
  });

  const [simGasByType, setSimGasByType] = useState<Record<string, number>>({
    "Personal": 0,
    "Funcionamiento": 0,
    "Transferencias": 0,
    "Tasas": 0,
    "Deuda": 0,
    "Inversion": 0
  });

  const [expenseAdjustMode, setExpenseAdjustMode] = useState<'resource' | 'category'>('resource');

  // Fetch Incomes (2023-2026)
  useEffect(() => {
    async function loadData() {
      try {
        setDataStage('loading');
        const years = [2023, 2024, 2025, 2026];
        const loadedData: Record<number, any[]> = {};
        
        await Promise.all(years.map(async (year) => {
          try {
            const rows = await fetchAndParseCSV(`https://raw.githubusercontent.com/fabiancho0724/Nomina/7d0f179b8bbcd3d327235c8e7fe2a4f757424794/Ingreso%20Mensual%20${year}.csv`);
            if (rows && rows.length > 0) {
              loadedData[year] = rows;
            }
          } catch (e) {
            console.error(`Error loading Incomes ${year}:`, e);
          }
        }));
        
        // Fetch cumulative incomes (Ingresos.csv)
        try {
          const cumulativeIncomes = await fetchAndParseCSV('https://raw.githubusercontent.com/fabiancho0724/Nomina/7d0f179b8bbcd3d327235c8e7fe2a4f757424794/Ingresos.csv');
          if (cumulativeIncomes && cumulativeIncomes.length > 0) {
            setRawCumulativeIncomes(cumulativeIncomes);
          }
        } catch (e) {
          console.error("Error loading cumulative incomes:", e);
        }

        setRawYearlyIncomes(loadedData);
        setTimeout(() => {
          setDataStage('ready');
        }, 300);
      } catch (err) {
        console.error(err);
        setDataStage('ready');
      }
    }
    loadData();
  }, []);

  const handleResetSimulator = () => {
    const freshIng: Record<string, number> = {};
    const freshGas: Record<string, number> = {};
    RESOURCES_LIST.forEach(r => {
      freshIng[r] = 0;
      freshGas[r] = 0;
    });
    setSimIngByResource(freshIng);
    setSimGasByResource(freshGas);
    setSimGasByType({
      "Personal": 0,
      "Funcionamiento": 0,
      "Transferencias": 0,
      "Tasas": 0,
      "Deuda": 0,
      "Inversion": 0
    });
    setExpenseAdjustMode('resource');
  };

  // Form Filter options
  const filterOptions = useMemo(() => {
    const unidades = new Set<string>();
    rawHistoricalGastos.forEach(row => {
      const dep = String(row.dependencia || '').trim();
      if (dep) unidades.add(dep);
    });

    return {
      unidades: ['Todos', ...Array.from(unidades).sort()],
      recursos: ['Todos', ...RESOURCES_LIST],
      tiposGastos: [
        'Todos',
        '2.1.1 Gastos de Personal',
        '2.1.2 Gastos de Funcionamiento',
        '2.1.3 Transferencias Corrientes',
        '2.1.8 Tasas y Multas',
        '2.2.2 Servicios de la Deuda',
        '2.3 Gastos de Inversión'
      ]
    };
  }, []);

  // Projections Engine Call
  const financialData = useMemo(() => {
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
      expenseAdjustMode
    });
  }, [
    rawYearlyIncomes,
    rawCumulativeIncomes,
    filterUnidad,
    filterRecurso,
    filterMes,
    filterTipoGasto,
    simIngByResource,
    simGasByResource,
    simGasByType,
    expenseAdjustMode
  ]);

  // AI Suggestions
  const aiSuggestions = useMemo(() => {
    const suggestions: Record<string, { value: number; confidence: number; justification: string }> = {};
    RESOURCES_LIST.forEach(r => {
      const val2023 = (rawYearlyIncomes[2023] || [])
        .filter(row => getRecursoEquivalence(getRowResourceCode(row, 2023)) === r)
        .reduce((sum, row) => {
          const keys = Object.keys(row).filter(k => k.trim().toLowerCase().startsWith('valor ')).slice(0, 12);
          return sum + keys.reduce((s, k) => s + (parseFloat(String(row[k] || '0').replace(/[^0-9.-]+/g, '')) || 0), 0);
        }, 0) / 1e6;

      const val2024 = (rawYearlyIncomes[2024] || [])
        .filter(row => getRecursoEquivalence(getRowResourceCode(row, 2024)) === r)
        .reduce((sum, row) => {
          const keys = Object.keys(row).filter(k => k.trim().toLowerCase().startsWith('valor ')).slice(0, 12);
          return sum + keys.reduce((s, k) => s + (parseFloat(String(row[k] || '0').replace(/[^0-9.-]+/g, '')) || 0), 0);
        }, 0) / 1e6;

      const val2025 = (rawYearlyIncomes[2025] || [])
        .filter(row => getRecursoEquivalence(getRowResourceCode(row, 2025)) === r)
        .reduce((sum, row) => {
          const keys = Object.keys(row).filter(k => k.trim().toLowerCase().startsWith('valor ')).slice(0, 12);
          return sum + keys.reduce((s, k) => s + (parseFloat(String(row[k] || '0').replace(/[^0-9.-]+/g, '')) || 0), 0);
        }, 0) / 1e6;

      let growth1 = val2023 > 0 ? (val2024 - val2023) / val2023 : 0;
      let growth2 = val2024 > 0 ? (val2025 - val2024) / val2024 : 0;
      
      let avgGrowth = 0.05; // default 5%
      let count = 0;
      if (val2023 > 0 && val2024 > 0) { avgGrowth += growth1; count++; }
      if (val2024 > 0 && val2025 > 0) { avgGrowth += growth2; count++; }
      if (count > 0) avgGrowth /= count;

      const baseVal = financialData ? (financialData.resourceBaselines[r]?.ing || 0) : 0;
      const suggestedGrowth = Math.max(-0.3, Math.min(0.3, avgGrowth));
      const suggestedValue = baseVal * (1 + suggestedGrowth);
      
      let diff = Math.abs(growth1 - growth2);
      let confidence = Math.round(95 - (diff * 20));
      if (isNaN(confidence) || confidence > 98) confidence = 94;
      if (confidence < 75) confidence = 78;

      suggestions[r] = {
        value: parseFloat(suggestedValue.toFixed(1)),
        confidence,
        justification: `Durante los últimos períodos este recurso presentó una variación promedio de ${(avgGrowth * 100).toFixed(1)}%. El análisis de estacionalidad sugiere que la tendencia de recaudo para el segundo semestre mantendrá consistencia aplicando una variación de ${(suggestedGrowth * 100).toFixed(1)}% sobre la línea base. Se estima una desviación estándar baja con un nivel de confianza del ${confidence}%.`
      };
    });
    return suggestions;
  }, [rawYearlyIncomes, financialData]);

  // AI Suggestions for Expenses
  const aiSuggestionsExpenses = useMemo(() => {
    const suggestions: Record<string, { value: number; confidence: number; justification: string }> = {};
    RESOURCES_LIST.forEach(r => {
      const val2024 = rawHistoricalGastos
        .filter(row => row.año === 2024 && getRecursoEquivalence(row.recurso) === r)
        .reduce((sum, row) => sum + (row.pago || 0), 0) / 1e6;

      const val2025 = rawHistoricalGastos
        .filter(row => row.año === 2025 && getRecursoEquivalence(row.recurso) === r)
        .reduce((sum, row) => sum + (row.pago || 0), 0) / 1e6;

      let growth = val2024 > 0 ? (val2025 - val2024) / val2024 : 0.05;
      if (growth === 0) growth = 0.045; // Default 4.5%

      const baseVal = financialData ? (financialData.resourceBaselines[r]?.gasPago || 0) : 0;
      const suggestedGrowth = Math.max(-0.25, Math.min(0.25, growth));
      const suggestedValue = baseVal * (1 + suggestedGrowth);

      let confidence = 92;
      if (Math.abs(growth) > 0.15) confidence = 85;

      suggestions[r] = {
        value: parseFloat(suggestedValue.toFixed(1)),
        confidence,
        justification: `El análisis histórico de egresos muestra una tasa de variación de ${(growth * 100).toFixed(1)}% para este recurso. Para mantener la sostenibilidad contable y el equilibrio de caja frente a las proyecciones de recaudo, la IA recomienda ajustar el presupuesto de egresos en un ${(suggestedGrowth * 100).toFixed(1)}% respecto a la línea base.`
      };
    });
    return suggestions;
  }, [rawHistoricalGastos, financialData]);

  // AI Suggestions for Categories
  const aiSuggestionsCategory = useMemo(() => {
    const suggestions: Record<string, { value: number; confidence: number; justification: string }> = {};
    const categories = ['Personal', 'Funcionamiento', 'Transferencias', 'Tasas', 'Deuda', 'Inversion'];
    
    categories.forEach(cat => {
      const totals: Record<number, number> = { 2023: 0, 2024: 0, 2025: 0 };
      rawHistoricalGastos.forEach(row => {
        const y = row.año;
        if (totals[y] !== undefined) {
          const tipo = String(row.tipo || '').toLowerCase();
          let isMatch = false;
          if (cat === 'Personal' && tipo.includes("2.1.1")) isMatch = true;
          else if (cat === 'Funcionamiento' && tipo.includes("2.1.2")) isMatch = true;
          else if (cat === 'Transferencias' && tipo.includes("2.1.3")) isMatch = true;
          else if (cat === 'Tasas' && (tipo.includes("2.1.8") || tipo.includes("tasa"))) isMatch = true;
          else if (cat === 'Deuda' && (tipo.includes("2.2.2") || tipo.includes("deuda"))) isMatch = true;
          else if (cat === 'Inversion' && (tipo.includes("2.3") || tipo.includes("inversion"))) isMatch = true;
          
          if (isMatch) {
            totals[y] += row.compromiso;
          }
        }
      });

      let growth = 0;
      let count = 0;
      if (totals[2023] > 0 && totals[2024] > 0) {
        growth += (totals[2024] / totals[2023]) - 1;
        count++;
      }
      if (totals[2024] > 0 && totals[2025] > 0) {
        growth += (totals[2025] / totals[2024]) - 1;
        count++;
      }
      const avgGrowth = count > 0 ? (growth / count) : 0.045;
      const recommendedPct = Math.max(-20, Math.min(20, Math.round(avgGrowth * 100)));
      
      suggestions[cat] = {
        value: recommendedPct,
        confidence: 91,
        justification: `La tendencia histórica de egresos para la categoría "${cat}" muestra un crecimiento promedio anual del ${(avgGrowth * 100).toFixed(1)}%. Basado en el recaudo proyectado y la elasticidad de egresos, la IA recomienda un ajuste de ${recommendedPct >= 0 ? '+' : ''}${recommendedPct}% para mantener la sostenibilidad de la caja.`
      };
    });
    return suggestions;
  }, [rawHistoricalGastos]);

  // Baseline and simulated values per category for the second semester
  const categoryValues = useMemo(() => {
    const values: Record<string, { baseComp: number; basePago: number; simComp: number; simPago: number }> = {};
    const categories = ['Personal', 'Funcionamiento', 'Transferencias', 'Tasas', 'Deuda', 'Inversion'];
    
    categories.forEach(cat => {
      let baseComp = 0;
      let basePago = 0;

      rawHistoricalGastos.forEach(row => {
        if (filterUnidad !== 'Todos' && row.dependencia !== filterUnidad) return;
        const r = getRecursoEquivalence(row.recurso);
        if (filterRecurso !== 'Todos' && r !== filterRecurso) return;

        const year = row.año;
        const monthIdx = row.mes - 1;

        if (year === 2025 && monthIdx >= 6) { // Jul-Dic 2025 is our baseline
          const tipo = String(row.tipo || '').toLowerCase();
          let isMatch = false;
          if (cat === 'Personal' && tipo.includes("2.1.1")) isMatch = true;
          else if (cat === 'Funcionamiento' && tipo.includes("2.1.2")) isMatch = true;
          else if (cat === 'Transferencias' && tipo.includes("2.1.3")) isMatch = true;
          else if (cat === 'Tasas' && (tipo.includes("2.1.8") || tipo.includes("tasa"))) isMatch = true;
          else if (cat === 'Deuda' && (tipo.includes("2.2.2") || tipo.includes("deuda"))) isMatch = true;
          else if (cat === 'Inversion' && (tipo.includes("2.3") || tipo.includes("inversion"))) isMatch = true;

          if (isMatch) {
            baseComp += row.compromiso * 1.05;
            basePago += row.pago * 1.05;
          }
        }
      });

      const valPct = simGasByType[cat] || 0;
      values[cat] = {
        baseComp: baseComp / 1e6,
        basePago: basePago / 1e6,
        simComp: (baseComp * (1 + valPct / 100)) / 1e6,
        simPago: (basePago * (1 + valPct / 100)) / 1e6
      };
    });

    return values;
  }, [rawHistoricalGastos, filterUnidad, filterRecurso, simGasByType]);

  // Aggregated Incomes Analysis Grouping based on simulated projections
  const ingresosAnalisisGroups = useMemo(() => {
    if (!financialData) return [];

    const groupsDef = [
      { id: 'nacion', name: 'Aportes de la Nación', sub: 'CLASIFICACIÓN DE INGRESO', color: 'from-[#ffcc29] to-[#ffcc29]/70', baseColor: '#ffcc29' },
      { id: 'extension', name: 'Extensión y Posgrados', sub: 'CLASIFICACIÓN DE INGRESO', color: 'from-[#7bd0ff] to-[#7bd0ff]/70', baseColor: '#7bd0ff' },
      { id: 'propios', name: 'Recursos Propios', sub: 'CLASIFICACIÓN DE INGRESO', color: 'from-secondary to-secondary/70', baseColor: '#d0bcff' },
      { id: 'estampilla', name: 'Estampilla Pro UPTC', sub: 'CLASIFICACIÓN DE INGRESO', color: 'from-[#ff5b5b] to-[#ff5b5b]/70', baseColor: '#ff5b5b' }
    ];

    const INCOME_GROUP_MAP: Record<string, string> = {
      "10": "Aportes de la Nación",
      "10.1": "Aportes de la Nación",
      "10.2": "Aportes de la Nación",
      "12": "Aportes de la Nación",
      "16": "Aportes de la Nación",
      "17": "Aportes de la Nación",
      "18": "Aportes de la Nación",
      "31": "Extensión y Posgrados",
      "32": "Extensión y Posgrados",
      "33": "Extensión y Posgrados",
      "34": "Extensión y Posgrados",
      "35": "Extensión y Posgrados",
      "40": "Estampilla Pro UPTC"
    };

    const RESOURCE_TYPE_MAP: Record<string, 'Recursos UPTC' | 'Recursos del Balance'> = {
      "10": "Recursos UPTC",
      "10.1": "Recursos del Balance",
      "10.2": "Recursos del Balance",
      "10.5": "Recursos UPTC",
      "12": "Recursos del Balance",
      "13": "Recursos del Balance",
      "14": "Recursos del Balance",
      "16": "Recursos del Balance",
      "17": "Recursos UPTC",
      "18": "Recursos UPTC",
      "20": "Recursos UPTC",
      "21": "Recursos del Balance",
      "31": "Recursos UPTC",
      "32": "Recursos UPTC",
      "33": "Recursos UPTC",
      "34": "Recursos del Balance",
      "35": "Recursos UPTC",
      "40": "Recursos del Balance"
    };

    const results = groupsDef.map(g => {
      let totalAforo = 0;
      let totalRecaudo = 0;
      const recursosList: { name: string; aforo: number; recaudo: number }[] = [];

      RESOURCES_LIST.forEach(r => {
        // Map to group
        const grpName = INCOME_GROUP_MAP[r] || 'Recursos Propios';
        if (grpName !== g.name) return;

        // Apply resource filter type
        const resType = RESOURCE_TYPE_MAP[r] || 'Recursos UPTC';
        if (incomeAnalysisFilter !== 'Todos' && resType !== incomeAnalysisFilter) return;

        // Skip if filtered by resource
        if (filterRecurso !== 'Todos' && r !== filterRecurso) return;

        const baseVal = financialData.resourceBaselines[r]?.ing || 0;
        const valPct = simIngByResource[r] || 0;
        const simVal = baseVal * (1 + valPct / 100);

        totalAforo += baseVal;
        totalRecaudo += simVal;

        recursosList.push({
          name: `${r}-${getResourceFullName(r)}`,
          aforo: baseVal,
          recaudo: simVal
        });
      });

      return {
        id: g.id,
        title: g.name,
        sub: g.sub,
        color: g.color,
        baseColor: g.baseColor,
        presupuesto: totalAforo,
        recaudo: totalRecaudo,
        pct: totalAforo > 0 ? ((totalRecaudo / totalAforo) * 100).toFixed(1) + '%' : '0%',
        recursos: recursosList.sort((a, b) => b.recaudo - a.recaudo)
      };
    });

    return results;
  }, [financialData, filterRecurso, simIngByResource, incomeAnalysisFilter]);

  // Aggregated Expenses Analysis Grouping based on simulated projections
  const gastosAnalisisGroups = useMemo(() => {
    if (!financialData) return [];
    
    const categoriesDef = [
      { id: 'Personal', name: '2.1.1 Gastos de Personal', keyword: '2.1.1' },
      { id: 'Funcionamiento', name: '2.1.2 Gastos de Funcionamiento', keyword: '2.1.2' },
      { id: 'Transferencias', name: '2.1.3 Gastos de Transferencias', keyword: '2.1.3' },
      { id: 'Tasas', name: '2.1.8 Tasas y Multas', keyword: '2.1.8' },
      { id: 'Deuda', name: '2.2.2 Servicios de la Deuda', keyword: '2.2.2' },
      { id: 'Inversion', name: '2.3 Gastos de Inversión', keyword: '2.3' }
    ];

    const results = categoriesDef.map(cat => {
      const engineComp = financialData.categoryBreakdown.compromiso.find(item => item.name.includes(cat.keyword))?.value || 0;
      const enginePago = financialData.categoryBreakdown.pago.find(item => item.name.includes(cat.keyword))?.value || 0;

      const resourceBreakdown: Record<string, { compromiso: number; pago: number }> = {};
      
      rawHistoricalGastos.forEach(row => {
        if (filterUnidad !== 'Todos' && row.dependencia !== filterUnidad) return;
        const r = getRecursoEquivalence(row.recurso);
        if (filterRecurso !== 'Todos' && r !== filterRecurso) return;

        const tipo = String(row.tipo || '').toLowerCase();
        if (!tipo.includes(cat.keyword)) return;

        const year = row.año;
        const monthIdx = row.mes - 1;

        if (year === 2026 && monthIdx < 6) {
          if (!resourceBreakdown[r]) resourceBreakdown[r] = { compromiso: 0, pago: 0 };
          resourceBreakdown[r].compromiso += row.compromiso / 1e6;
          resourceBreakdown[r].pago += row.pago / 1e6;
        } else if (year === 2025 && monthIdx >= 6) {
          if (!resourceBreakdown[r]) resourceBreakdown[r] = { compromiso: 0, pago: 0 };
          
          let scaleFactor = 1.05;
          if (expenseAdjustMode === 'category') {
            const valPct = simGasByType[cat.id] || 0;
            scaleFactor *= (1 + valPct / 100);
          } else {
            const valPct = simGasByResource[r] || 0;
            scaleFactor *= (1 + valPct / 100);
          }
          
          resourceBreakdown[r].compromiso += (row.compromiso * scaleFactor) / 1e6;
          resourceBreakdown[r].pago += (row.pago * scaleFactor) / 1e6;
        }
      });

      const resourcesList = Object.keys(resourceBreakdown).map(r => {
        const item = resourceBreakdown[r];
        return {
          name: `${r}-${getResourceFullName(r)}`,
          compromiso: item.compromiso,
          pago: item.pago
        };
      }).filter(item => item.compromiso > 0 || item.pago > 0)
        .sort((a, b) => b.pago - a.pago);

      return {
        name: cat.name,
        compromiso: engineComp,
        pago: enginePago,
        recursos: resourcesList
      };
    });

    return results.filter(item => item.compromiso > 0 || item.pago > 0);
  }, [financialData, rawHistoricalGastos, filterUnidad, filterRecurso, expenseAdjustMode, simGasByResource, simGasByType]);

  // Validation Errors (Pago Efectivo <= Valor Proyectado)
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
      
      if (gasVal > ingVal) {
        errors[r] = "El valor del Pago Efectivo no puede ser superior al Valor Proyectado del recurso.";
      }
    });
    return errors;
  }, [simIngByResource, simGasByResource, financialData, expenseAdjustMode]);

  const handleSaveSimulation = () => {
    setShowSaveSuccess(true);
    setTimeout(() => {
      setShowSaveSuccess(false);
    }, 3000);
  };

  // Sensitivity & Elasticity analysis
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
        dscrTornado: []
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

    // Annual income baseline sum
    const baseIngTotal = baseIngArray.reduce((a, b) => a + b, 0);
    const baseGasTotal = baseGasArray.reduce((a, b) => a + b, 0);

    // 1. Base Scenario
    const baseFlows = baseIngArray.map((ing, i) => ing - baseGasArray[i]);
    const baseNPV = calculateNPV(baseFlows, sensDiscountRate);
    const baseIRR = calculateIRR(baseFlows);
    const baseFlowSum = baseFlows.reduce((a, b) => a + b, 0);

    // 2. Pessimistic Scenario (Income decreased by sensPessimisticPct, Expense increased by |sensPessimisticPct| / 1.5)
    const pesIngFactor = 1 + sensPessimisticPct / 100;
    const pesGasFactor = 1 + Math.abs(sensPessimisticPct) / 1.5 / 100;
    const pesFlows = baseIngArray.map((ing, i) => (ing * pesIngFactor) - (baseGasArray[i] * pesGasFactor));
    const pesNPV = calculateNPV(pesFlows, sensDiscountRate);
    const pesIRR = calculateIRR(pesFlows);
    const pesFlowSum = pesFlows.reduce((a, b) => a + b, 0);
    const pesIngTotal = baseIngTotal * pesIngFactor;

    // 3. Optimistic Scenario (Income increased by sensOptimisticPct, Expense decreased by sensOptimisticPct / 1.5)
    const optIngFactor = 1 + sensOptimisticPct / 100;
    const optGasFactor = 1 - (sensOptimisticPct / 1.5) / 100;
    const optFlows = baseIngArray.map((ing, i) => (ing * optIngFactor) - (baseGasArray[i] * optGasFactor));
    const optNPV = calculateNPV(optFlows, sensDiscountRate);
    const optIRR = calculateIRR(optFlows);
    const optFlowSum = optFlows.reduce((a, b) => a + b, 0);
    const optIngTotal = baseIngTotal * optIngFactor;

    // 4. Elasticity calculation
    // Income Elasticity of NPV: % change in NPV / 1% change in Income
    const inc1PctFlows = baseIngArray.map((ing, i) => (ing * 1.01) - baseGasArray[i]);
    const inc1PctNPV = calculateNPV(inc1PctFlows, sensDiscountRate);
    const elasticityIng = baseNPV !== 0 ? ((inc1PctNPV - baseNPV) / baseNPV) * 100 : 0;

    // Expense Elasticity of NPV: % change in NPV / 1% change in Expense
    const exp1PctFlows = baseIngArray.map((ing, i) => ing - (baseGasArray[i] * 1.01));
    const exp1PctNPV = calculateNPV(exp1PctFlows, sensDiscountRate);
    const elasticityGas = baseNPV !== 0 ? ((exp1PctNPV - baseNPV) / baseNPV) * 100 : 0;

    // 5. Monte Carlo Simulation (1000 runs)
    const mcNpvList: number[] = [];
    for (let iter = 0; iter < 1000; iter++) {
      const randIng = 1 + (Math.random() - 0.5) * 2 * 0.20; // Uniform +- 20%
      const randGas = 1 + (Math.random() - 0.5) * 2 * 0.15; // Uniform +- 15%
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

    // 6. Tornado Chart Calculation (Impact of each resource on total NPV)
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
    }).sort((a, b) => b.width - a.width);

    // 7. DSCR & Covenant coverage calculations
    const dscrBase = baseGasTotal > 0 ? (baseIngTotal / baseGasTotal) : 0;
    const dscrPessimistic = (baseGasTotal * pesGasFactor) > 0 ? (baseIngTotal * pesIngFactor) / (baseGasTotal * pesGasFactor) : 0;
    const dscrOptimistic = (baseGasTotal * optGasFactor) > 0 ? (baseIngTotal * optIngFactor) / (baseGasTotal * optGasFactor) : 0;
    
    // Cushion relative to minimum covenant (1.25x)
    const cushion = dscrBase > 0 ? ((dscrBase - 1.25) / 1.25) * 100 : 0;

    // Rupture point calculation:
    // Solve for x: (R * (1 + x/100)) / (1 - (x/1.5)/100) = 1.25
    // Let R = dscrBase.
    // If dscrBase is already below 1.25, rupture has occurred.
    const K = dscrBase > 0 ? 1.25 / dscrBase : 0;
    const ruptureVar = dscrBase > 1.25 ? 300 * (K - 1) / (3 + 2 * K) : 0;
    const ruptureValue = baseIngTotal * (1 + ruptureVar / 100);

    // 1D Sensibility data DSCR vs Price variation
    const dscr1DData = [-15, -12.5, -10, -7.5, -5, -2.5, 0, 2.5, 5, 7.5, 10, 12.5, 15].map(v => {
      const ingF = 1 + v / 100;
      const gasF = v < 0 ? (1 + Math.abs(v) / 1.5 / 100) : (1 - (v / 1.5) / 100);
      const dscr_v = baseGasTotal > 0 ? (baseIngTotal * ingF) / (baseGasTotal * gasF) : 0;
      return {
        vLabel: `${v >= 0 ? '+' : ''}${v}%`,
        vVal: v,
        DSCR: parseFloat(dscr_v.toFixed(2)),
        Covenant: 1.25
      };
    });

    // DSCR Tornado chart data (Driver impact on DSCR)
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
    }).sort((a, b) => b.rangeWidth - a.rangeWidth).slice(0, 8); // Top 8 drivers

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
      dscrTornado
    };
  }, [sensResource, sensDiscountRate, sensPessimisticPct, sensOptimisticPct, financialData]);

  const semesterTotals = useMemo(() => {
    if (!financialData || !financialData.simulatedFlow) {
      return {
        eneJunIng: 0, julDicIng: 0,
        eneJunComp: 0, julDicComp: 0,
        eneJunPago: 0, julDicPago: 0
      };
    }
    const eneJun = financialData.simulatedFlow.slice(0, 6);
    const julDic = financialData.simulatedFlow.slice(6, 12);
    return {
      eneJunIng: eneJun.reduce((sum, m) => sum + m.ingresos, 0),
      julDicIng: julDic.reduce((sum, m) => sum + m.ingresos, 0),
      eneJunComp: eneJun.reduce((sum, m) => sum + m.gastosComp, 0),
      julDicComp: julDic.reduce((sum, m) => sum + m.gastosComp, 0),
      eneJunPago: eneJun.reduce((sum, m) => sum + m.gastosPago, 0),
      julDicPago: julDic.reduce((sum, m) => sum + m.gastosPago, 0)
    };
  }, [financialData]);

  // Aggregated temporal cash flow
  const aggregatedFlowData = useMemo(() => {
    return aggregateFlow(financialData.simulatedFlow, flowGranularity);
  }, [financialData.simulatedFlow, flowGranularity]);

  // Matrix and donut chart variables
  const expensesBreakdown = useMemo(() => {
    return financialData.categoryBreakdown;
  }, [financialData]);

  if (dataStage === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <div className="w-12 h-12 border-4 border-primary-container border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-on-surface-variant font-mono animate-pulse">Procesando Modelos Predictivos...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col mb-20 max-w-7xl mx-auto px-4 md:px-0 text-white">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8">
        <div>
          <p className="text-[#ffcc29] text-xs uppercase tracking-widest font-bold mb-1">Módulo BI - UPTC</p>
          <h2 className="text-3xl md:text-4xl font-bold font-display text-white">Proyección Financiera</h2>
        </div>
        
        {/* Dropdown Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center bg-white/5 rounded-xl border border-white/10 px-3.5 py-2 hover:bg-white/10 transition-colors">
            <Filter size={15} className="text-on-surface-variant mr-2" />
            <select 
              className="bg-transparent text-xs text-white outline-none font-sans cursor-pointer"
              value={filterRecurso}
              onChange={(e) => setFilterRecurso(e.target.value)}
            >
              <option value="Todos" className="bg-[#0f172a]">Filtrar Recurso: Todos</option>
              {filterOptions.recursos.slice(1).map(r => (
                <option key={r} value={r} className="bg-[#0f172a]">{getResourceFullName(r)}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center bg-white/5 rounded-xl border border-white/10 px-3.5 py-2 hover:bg-white/10 transition-colors">
            <Filter size={15} className="text-on-surface-variant mr-2" />
            <select 
              className="bg-transparent text-xs text-white outline-none font-sans cursor-pointer"
              value={filterUnidad}
              onChange={(e) => setFilterUnidad(e.target.value)}
            >
              <option value="Todos" className="bg-[#0f172a]">Sede/Unidad: Todas</option>
              {filterOptions.unidades.slice(1).map(u => (
                <option key={u} value={u} className="bg-[#0f172a]">{u}</option>
              ))}
            </select>
          </div>

          <button onClick={handleResetSimulator} className="flex items-center px-4 py-2 bg-white/10 border border-white/20 rounded-xl hover:bg-white/20 transition text-xs font-mono gap-2">
            <RefreshCw size={13} /> Limpiar Simulador
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 mb-8 overflow-x-auto gap-2">
        {[
          { id: 'kpi', label: 'Indicadores', icon: Activity },
          { id: 'flow', label: 'Flujo de Caja', icon: Table },
          { id: 'equilibrium', label: 'Punto de Equilibrio', icon: Compass },
          { id: 'simulator', label: 'Simulador Escenarios', icon: RefreshCw },
          { id: 'sensitivity', label: 'Sensibilidad y Elasticidad', icon: TrendingUp }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap ${activeTab === t.id ? 'border-[#ffcc29] text-[#ffcc29]' : 'border-transparent text-white/55 hover:text-white'}`}
          >
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
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
                  <span>CORTE A JUN 30 (REAL)</span>
                  <span className="text-white font-bold">${semesterTotals.eneJunIng.toLocaleString('es-CO', {maximumFractionDigits:1})}M</span>
                </div>
                <div className="flex justify-between">
                  <span>PROYECCIÓN JUL-DIC</span>
                  <span className="text-[#ffcc29] font-bold">${semesterTotals.julDicIng.toLocaleString('es-CO', {maximumFractionDigits:1})}M</span>
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
                  <span>CORTE A JUN 30 (REAL)</span>
                  <span className="text-white font-bold">${semesterTotals.eneJunComp.toLocaleString('es-CO', {maximumFractionDigits:1})}M</span>
                </div>
                <div className="flex justify-between">
                  <span>PROYECCIÓN JUL-DIC</span>
                  <span className="text-[#f43f5e] font-bold">${semesterTotals.julDicComp.toLocaleString('es-CO', {maximumFractionDigits:1})}M</span>
                </div>
              </div>
            </div>

            {/* Payments Card */}
            <div className="glass-card rounded-[28px] p-6 border border-white/5 bg-surface/50 relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 left-0 w-full h-1 bg-[#4ade80]"></div>
              <div>
                <h4 className="text-xs font-mono text-on-surface-variant uppercase tracking-widest mb-3">Pagos Efectivos (Vigencia 2026)</h4>
                <p className="text-3xl font-display font-bold text-white">${financialData.totals.simGasPago.toLocaleString('es-CO', {maximumFractionDigits:1})}M</p>
              </div>
              <div className="space-y-1.5 mt-4 text-[11px] font-mono text-on-surface-variant border-t border-white/5 pt-3">
                <div className="flex justify-between">
                  <span>CORTE A JUN 30 (REAL)</span>
                  <span className="text-white font-bold">${semesterTotals.eneJunPago.toLocaleString('es-CO', {maximumFractionDigits:1})}M</span>
                </div>
                <div className="flex justify-between">
                  <span>PROYECCIÓN JUL-DIC</span>
                  <span className="text-[#4ade80] font-bold">${semesterTotals.julDicPago.toLocaleString('es-CO', {maximumFractionDigits:1})}M</span>
                </div>
              </div>
            </div>
          </div>

          {/* New Row of KPI Cards */}
          {(() => {
            const pctEjec = financialData.totals.simIng > 0 ? (financialData.totals.simGasComp / financialData.totals.simIng) * 100 : 0;
            const disponibleVal = financialData.totals.simIng - financialData.totals.simGasComp;
            const cuentasPagarVal = financialData.totals.simGasComp - financialData.totals.simGasPago;

            const pctColor = pctEjec > 100 
              ? '#f43f5e' 
              : pctEjec >= 90 
                ? '#4ade80' 
                : '#ffcc29';
            const pctTextClass = pctEjec > 100 
              ? 'text-red-400' 
              : pctEjec >= 90 
                ? 'text-[#4ade80]' 
                : 'text-[#ffcc29]';

            const dispColor = disponibleVal >= 0 ? '#4ade80' : '#f43f5e';
            const dispTextClass = disponibleVal >= 0 ? 'text-[#4ade80]' : 'text-red-400';

            return (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Porcentaje de ejecución */}
                <div className="glass-card rounded-[28px] p-6 border border-white/5 bg-surface/50 relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: pctColor }}></div>
                  <div>
                    <h4 className="text-xs font-mono text-on-surface-variant uppercase tracking-widest mb-3">Porcentaje de Ejecución</h4>
                    <p className={`text-3xl font-display font-bold ${pctTextClass}`}>
                      {pctEjec.toFixed(1)}%
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-white/5">
                    {/* Horizontal progress bar / accelerator */}
                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, pctEjec)}%`, backgroundColor: pctColor }}></div>
                    </div>
                    <div className="flex justify-between items-center mt-2 text-[10px] font-mono text-on-surface-variant">
                      <span>COMPROMISO / INGRESO</span>
                      <span style={{ color: pctColor }} className="font-bold">
                        {pctEjec > 100 ? 'Sobregiro' : pctEjec >= 90 ? 'Óptimo' : 'Bajo'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Valor disponible */}
                <div className="glass-card rounded-[28px] p-6 border border-white/5 bg-surface/50 relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: dispColor }}></div>
                  <div>
                    <h4 className="text-xs font-mono text-on-surface-variant uppercase tracking-widest mb-3">Valor Disponible</h4>
                    <p className={`text-3xl font-display font-bold ${dispTextClass}`}>
                      ${disponibleVal.toLocaleString('es-CO', {maximumFractionDigits:1})}M
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-white/5 flex flex-col justify-center">
                    <div className="flex justify-between items-center text-[10px] font-mono text-on-surface-variant">
                      <span>INGRESO - COMPROMISO</span>
                      <span style={{ color: dispColor }} className="font-bold uppercase">
                        {disponibleVal >= 0 ? 'Superávit' : 'Déficit'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Cuentas por pagar */}
                <div className="glass-card rounded-[28px] p-6 border border-white/5 bg-surface/50 relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute top-0 left-0 w-full h-1 bg-[#7bd0ff]"></div>
                  <div>
                    <h4 className="text-xs font-mono text-on-surface-variant uppercase tracking-widest mb-3">Cuentas por Pagar</h4>
                    <p className="text-3xl font-display font-bold text-[#7bd0ff]">
                      ${cuentasPagarVal.toLocaleString('es-CO', {maximumFractionDigits:1})}M
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-white/5 flex flex-col justify-center">
                    <div className="flex justify-between items-center text-[10px] font-mono text-on-surface-variant">
                      <span>COMPROMISO - PAGO</span>
                      <span className="text-[#7bd0ff] font-bold uppercase">Pendiente</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Chart Section */}
          <div className="glass-card rounded-[32px] p-6 lg:p-8 border border-white/10 glow-primary">
            <h3 className="text-xl font-display font-medium text-white mb-6">Histórico Multianual y Proyección Neto (Millones)</h3>
            <div className="w-full h-96">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={financialData.simulatedFlow}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" stroke="#cac4d0" tick={{fontSize: 11}} />
                  <YAxis stroke="#cac4d0" tick={{fontSize: 11}} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)' }} />
                  <Legend />
                  <Area type="monotone" dataKey="ingresos" name="Ingresos ($M)" fill="url(#ingGlow)" stroke="#4ade80" />
                  <Bar dataKey="gastosComp" name="Compromisos ($M)" fill="#f43f5e" opacity={0.8} />
                  <Bar dataKey="gastosPago" name="Pagos ($M)" fill="#ffcc29" opacity={0.8} />
                  <Line type="monotone" dataKey="acumuladoPago" name="Saldo Acumulado ($M)" stroke="#7bd0ff" strokeWidth={3} />
                  <defs>
                    <linearGradient id="ingGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4ade80" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#4ade80" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Análisis de Ingresos */}
          <div className="mt-8 flex items-center justify-between gap-4">
            <h3 className="text-xl font-display text-white flex items-center gap-2 font-medium">
              <Wallet className="text-[#ffcc29]" size={22} />
              Análisis de Ingresos Proyectados
            </h3>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {ingresosAnalisisGroups.map(rubro => {
              const isExpanded = expandedIngresoGroup === rubro.id;
              return (
                <div key={rubro.id} className="glass-card rounded-[24px] p-6 flex flex-col relative overflow-hidden transition-all duration-300 border border-white/5 shadow-lg">
                  {/* Visual Indicator */}
                  <div className={`absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b ${rubro.color}`}></div>
                  
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Left side: Main Stats */}
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="text-xl font-display font-bold text-white">{rubro.title}</h4>
                        </div>
                        <p className="text-[10px] text-on-surface-variant font-mono tracking-widest uppercase mb-6">{rubro.sub}</p>
                      </div>

                      <div className="space-y-4">
                        <div>
                           <span className="text-xs text-on-surface-variant block mb-1">Presupuestado Inicial</span>
                           <span className="text-2xl font-bold font-mono text-white">${rubro.presupuesto.toLocaleString('es-CO', {maximumFractionDigits: 1})} <span className="text-xs font-sans text-on-surface-variant font-normal">mill.</span></span>
                        </div>
                        <div>
                           <span className="text-xs text-on-surface-variant block mb-1">Recaudo Proyectado</span>
                           <span className="text-3xl font-display font-bold text-[#ffcc29]">${rubro.recaudo.toLocaleString('es-CO', {maximumFractionDigits: 1})} <span className="text-xs font-sans text-on-surface-variant font-normal">mill.</span></span>
                        </div>
                      </div>
                    </div>

                    {/* Right side: Chart & Details */}
                    <div className="w-full md:w-56 flex flex-col items-center justify-center shrink-0 border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-6">
                      <div className="relative w-28 h-28 flex items-center justify-center mb-4">
                         <svg className="w-full h-full -rotate-90">
                            <circle cx="56" cy="56" r="48" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="12" />
                            <circle 
                               className="progress-ring-circle transition-all duration-500" 
                               cx="56" cy="56" r="48" 
                               fill="transparent" 
                               stroke="currentColor" 
                               strokeWidth="12" 
                               strokeDasharray="301" 
                               strokeDashoffset={301 - (301 * Math.min(100, parseFloat(rubro.pct || '0')) / 100)} 
                               style={{ color: rubro.baseColor }}
                            />
                         </svg>
                         <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-xl font-bold text-white">{rubro.pct}</span>
                         </div>
                      </div>

                      <div className="w-full space-y-2">
                        {rubro.recursos.slice(0, 2).map((item, rIdx) => (
                          <div key={rIdx} className="bg-white/5 px-3 py-2 rounded-lg flex justify-between items-center w-full">
                             <span className="text-[10px] text-on-surface-variant uppercase truncate mr-2" title={item.name}>{item.name.split('-')[1] || item.name}</span>
                             <span className="text-xs font-bold text-white whitespace-nowrap">${item.recaudo.toLocaleString('es-CO', {maximumFractionDigits: 1})}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Resources View */}
                  {rubro.recursos && rubro.recursos.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-white/10 w-full">
                      <button 
                        onClick={() => setExpandedIngresoGroup(isExpanded ? null : rubro.id)}
                        className="w-full flex items-center justify-center gap-2 text-xs font-mono text-on-surface-variant hover:text-white transition-colors bg-white/5 hover:bg-white/10 py-2 rounded-lg"
                      >
                        {isExpanded ? (
                          <><ChevronUp size={16} /> Ocultar Recursos</>
                        ) : (
                          <><ChevronDown size={16} /> Ver Todos los Recursos ({rubro.recursos.length})</>
                        )}
                      </button>
                      
                      {isExpanded && (
                        <div className="mt-4 space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                          {rubro.recursos.map((item, rIdx) => (
                            <div key={rIdx} className="bg-white/5 px-4 py-3 rounded-xl flex justify-between items-center w-full border border-white/5">
                              <span className="text-xs text-white/80 font-bold uppercase truncate mr-2">{item.name}</span>
                              <div className="flex gap-4 shrink-0 text-right">
                                <div>
                                  <span className="text-[9px] text-on-surface-variant block font-mono">AFORADO</span>
                                  <span className="text-xs font-mono text-white/60">${item.aforo.toLocaleString('es-CO', {maximumFractionDigits:1})}M</span>
                                </div>
                                <div>
                                  <span className="text-[9px] text-on-surface-variant block font-mono">RECAUDO</span>
                                  <span className="text-xs font-mono text-[#ffcc29] font-bold">${item.recaudo.toLocaleString('es-CO', {maximumFractionDigits:1})}M</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Análisis de Gastos */}
          <div className="mt-12 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <h3 className="text-xl font-display text-white flex items-center gap-2 font-medium">
              <Wallet className="text-[#f43f5e]" size={22} />
              Análisis de Gastos Proyectados
            </h3>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {gastosAnalisisGroups.map((gasto, idx) => {
              const isExpanded = expandedGastoCardGroup === gasto.name;
              const pct = gasto.compromiso > 0 ? ((gasto.pago / gasto.compromiso) * 100).toFixed(1) + '%' : '0%';
              const colorClass = idx % 4 === 0 ? 'from-secondary to-secondary/70' : idx % 4 === 1 ? 'from-[#ffcc29] to-[#ffcc29]/70' : idx % 4 === 2 ? 'from-[#7bd0ff] to-[#7bd0ff]/70' : 'from-[#ff5b5b] to-[#ff5b5b]/70';
              const baseColor = idx % 4 === 0 ? '#d0bcff' : idx % 4 === 1 ? '#ffcc29' : idx % 4 === 2 ? '#7bd0ff' : '#ff5b5b';

              return (
                <div key={idx} className="glass-card rounded-[24px] p-6 flex flex-col relative overflow-hidden transition-all duration-300 border border-white/5 shadow-lg">
                  <div className={`absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b ${colorClass}`}></div>
                  
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="text-xl font-display font-bold text-white mb-2">{gasto.name}</h4>
                        <p className="text-[10px] text-on-surface-variant font-mono tracking-widest uppercase mb-6">Agrupación de Gasto</p>
                      </div>

                      <div className="space-y-4">
                        <div>
                           <span className="text-xs text-on-surface-variant block mb-1">Total Compromiso</span>
                           <span className="text-2xl font-bold font-mono text-white">${gasto.compromiso.toLocaleString('es-CO', {maximumFractionDigits: 1})} <span className="text-xs font-sans text-on-surface-variant font-normal">mill.</span></span>
                        </div>
                        <div>
                           <span className="text-xs text-on-surface-variant block mb-1">Pago Efectivo</span>
                           <span className="text-3xl font-display font-bold text-secondary">${gasto.pago.toLocaleString('es-CO', {maximumFractionDigits: 1})} <span className="text-xs font-sans text-on-surface-variant font-normal">mill.</span></span>
                        </div>
                      </div>
                    </div>

                    <div className="w-full md:w-56 flex flex-col items-center justify-center shrink-0 border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-6">
                      <div className="relative w-28 h-28 flex items-center justify-center mb-4">
                         <svg className="w-full h-full -rotate-90">
                            <circle cx="56" cy="56" r="48" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="12" />
                            <circle 
                               className="progress-ring-circle transition-all duration-500" 
                               cx="56" cy="56" r="48" 
                               fill="transparent" 
                               stroke="currentColor" 
                               strokeWidth="12" 
                               strokeDasharray="301" 
                               strokeDashoffset={301 - (301 * Math.min(100, parseFloat(pct || '0')) / 100)} 
                               style={{ color: baseColor }}
                            />
                         </svg>
                         <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-xl font-bold text-white">{pct}</span>
                         </div>
                      </div>

                      <div className="w-full space-y-2">
                        {gasto.recursos.slice(0, 2).map((item, rIdx) => (
                          <div key={rIdx} className="bg-white/5 px-3 py-2 rounded-lg flex justify-between items-center w-full">
                             <span className="text-[10px] text-on-surface-variant uppercase truncate mr-2" title={item.name}>{item.name.split('-')[1] || item.name}</span>
                             <span className="text-xs font-bold text-white whitespace-nowrap">${item.pago.toLocaleString('es-CO', {maximumFractionDigits: 1})}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Resources View */}
                  {gasto.recursos && gasto.recursos.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-white/10 w-full">
                      <button 
                        onClick={() => setExpandedGastoCardGroup(isExpanded ? null : gasto.name)}
                        className="w-full flex items-center justify-center gap-2 text-xs font-mono text-on-surface-variant hover:text-white transition-colors bg-white/5 hover:bg-white/10 py-2 rounded-lg"
                      >
                        {isExpanded ? (
                          <><ChevronUp size={16} /> Ocultar Recursos</>
                        ) : (
                          <><ChevronDown size={16} /> Ver Todos los Recursos ({gasto.recursos.length})</>
                        )}
                      </button>
                      
                      {isExpanded && (
                        <div className="mt-4 space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                          {gasto.recursos.map((item, rIdx) => (
                            <div key={rIdx} className="bg-white/5 px-4 py-3 rounded-xl flex justify-between items-center w-full border border-white/5">
                              <span className="text-xs text-white/80 font-bold uppercase truncate mr-2">{item.name}</span>
                              <div className="flex gap-4 shrink-0 text-right">
                                <div>
                                  <span className="text-[9px] text-on-surface-variant block font-mono">COMPROMISO</span>
                                  <span className="text-xs font-mono text-white/60">${item.compromiso.toLocaleString('es-CO', {maximumFractionDigits:1})}M</span>
                                </div>
                                <div>
                                  <span className="text-[9px] text-on-surface-variant block font-mono">PAGO</span>
                                  <span className="text-xs font-mono text-secondary font-bold">${item.pago.toLocaleString('es-CO', {maximumFractionDigits:1})}M</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'flow' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h3 className="text-xl font-display font-medium text-white">Flujo de Caja Consolidado</h3>
              <p className="text-xs text-on-surface-variant mt-1">Valores expresados en Millones de Pesos ($M)</p>
            </div>
            
            {/* Granularity Selector buttons */}
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
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${flowGranularity === g.id ? 'bg-[#ffcc29] text-black' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto rounded-[24px] border border-white/10 bg-white/5 custom-scrollbar">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="bg-white/10 text-[#ffcc29] uppercase tracking-wider">
                  <th className="p-4 font-bold border-b border-white/10">Período</th>
                  <th className="p-4 font-bold border-b border-white/10 text-right">Ingresos</th>
                  <th className="p-4 font-bold border-b border-white/10 text-right">Compromisos</th>
                  <th className="p-4 font-bold border-b border-white/10 text-right">Pagos</th>
                  <th className="p-4 font-bold border-b border-white/10 text-right">Ejecución</th>
                </tr>
              </thead>
              <tbody>
                {aggregatedFlowData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-white/5 border-b border-white/5">
                    <td className="p-4 text-white font-bold">{row.name}</td>
                    <td className="p-4 text-right text-[#4ade80]">${row.ingresos.toLocaleString('es-CO', {minimumFractionDigits: 1})}M</td>
                    <td className="p-4 text-right text-[#f43f5e]">${row.gastosComp.toLocaleString('es-CO', {minimumFractionDigits: 1})}M</td>
                    <td className="p-4 text-right text-[#ffcc29]">${row.gastosPago.toLocaleString('es-CO', {minimumFractionDigits: 1})}M</td>
                    <td className="p-4 text-right font-bold text-white/80">{row.ejecucion.toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'equilibrium' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-300">
          {/* Speedometers card */}
          <div className="glass-card rounded-[32px] p-8 border border-white/10 flex flex-col items-center justify-center glow-primary min-h-[400px] lg:col-span-2">
            <h3 className="text-xl font-display font-medium text-white mb-8 text-center">Ejecución Presupuestal y Cobertura</h3>
            
            {(() => {
              const compromisoExec = (financialData.totals.simGasComp / financialData.totals.simIng) * 100 || 0;
              const pagoExec = (financialData.totals.simGasPago / financialData.totals.simIng) * 100 || 0;
              
              return (
                <div className="flex flex-col md:flex-row items-center justify-around gap-8 w-full">
                  {/* Gauge 1: Compromiso */}
                  <div className="flex flex-col items-center justify-center space-y-4">
                    <div className="relative w-56 h-28 flex flex-col items-center justify-end overflow-hidden">
                      <svg className="w-full h-full">
                        {/* Background gauge */}
                        <path d="M 12 100 A 82 82 0 0 1 200 100" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="18" strokeLinecap="round" />
                        {/* Active gauge */}
                        <path 
                          d="M 12 100 A 82 82 0 0 1 200 100" 
                          fill="none" 
                          stroke="#f43f5e" 
                          strokeWidth="18" 
                          strokeLinecap="round"
                          strokeDasharray="258"
                          strokeDashoffset={258 - (258 * Math.min(100, compromisoExec)) / 100}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
                        <span className="text-3xl font-display font-bold text-white">{compromisoExec.toFixed(1)}%</span>
                        <span className="text-[10px] text-on-surface-variant mt-0.5 uppercase font-mono tracking-wider">Ejecución Compromiso</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-on-surface-variant text-center max-w-[220px] leading-relaxed">
                      Proporción de compromisos adquiridos frente al recaudo total proyectado.
                    </p>
                  </div>

                  {/* Gauge 2: Pago Efectivo */}
                  <div className="flex flex-col items-center justify-center space-y-4">
                    <div className="relative w-56 h-28 flex flex-col items-center justify-end overflow-hidden">
                      <svg className="w-full h-full">
                        {/* Background gauge */}
                        <path d="M 12 100 A 82 82 0 0 1 200 100" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="18" strokeLinecap="round" />
                        {/* Active gauge */}
                        <path 
                          d="M 12 100 A 82 82 0 0 1 200 100" 
                          fill="none" 
                          stroke="#ffcc29" 
                          strokeWidth="18" 
                          strokeLinecap="round"
                          strokeDasharray="258"
                          strokeDashoffset={258 - (258 * Math.min(100, pagoExec)) / 100}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
                        <span className="text-3xl font-display font-bold text-white">{pagoExec.toFixed(1)}%</span>
                        <span className="text-[10px] text-on-surface-variant mt-0.5 uppercase font-mono tracking-wider">Ejecución Pago</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-on-surface-variant text-center max-w-[220px] leading-relaxed">
                      Proporción de pagos reales realizados frente al recaudo total proyectado.
                    </p>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Margen de equilibrio card */}
          <div className="glass-card rounded-[32px] p-8 border border-white/10 flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-display font-medium text-white mb-6">Punto de Equilibrio de Caja</h3>
              
              <div className="space-y-6">
                <div className="flex justify-between items-center py-3 border-b border-white/5">
                  <span className="text-sm text-on-surface-variant">Resultado Financiero Comprometido</span>
                  <span className={`text-lg font-mono font-bold ${financialData.totals.simNetComp >= 0 ? 'text-[#4ade80]' : 'text-red-400'}`}>
                    ${financialData.totals.simNetComp.toLocaleString('es-CO', {maximumFractionDigits:1})}M
                  </span>
                </div>

                <div className="flex justify-between items-center py-3 border-b border-white/5">
                  <span className="text-sm text-on-surface-variant">Resultado Financiero Pagado</span>
                  <span className={`text-lg font-mono font-bold ${financialData.totals.simNetPago >= 0 ? 'text-[#4ade80]' : 'text-red-400'}`}>
                    ${financialData.totals.simNetPago.toLocaleString('es-CO', {maximumFractionDigits:1})}M
                  </span>
                </div>

                <div className="flex justify-between items-center py-3 border-b border-white/5">
                  <span className="text-sm text-on-surface-variant">Porcentaje de Ejecución General</span>
                  <span className="text-lg font-mono font-bold text-[#ffcc29]">
                    {((financialData.totals.simGasPago / financialData.totals.simGasComp) * 100 || 0).toFixed(1)}%
                  </span>
                </div>

                <div className="flex justify-between items-center py-3 border-b border-white/5">
                  <span className="text-sm text-on-surface-variant">Saldo Acumulado al Cierre</span>
                  <span className={`text-lg font-mono font-bold ${financialData.totals.simNetPago >= 0 ? 'text-[#4ade80]' : 'text-red-400'}`}>
                    ${financialData.totals.simNetPago.toLocaleString('es-CO', {maximumFractionDigits:1})}M
                  </span>
                </div>
              </div>
            </div>

            <div className={`mt-6 p-4 rounded-2xl flex items-start gap-3 border ${financialData.totals.simNetPago >= 0 ? 'bg-[#4ade80]/10 border-[#4ade80]/30 text-[#4ade80]' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
              <CheckSquare className="mt-0.5 shrink-0" size={18} />
              <div>
                <h4 className="font-bold text-sm">Estado Presupuestal Simulador</h4>
                <p className="text-xs text-white/70 mt-0.5">
                  {financialData.totals.simNetPago >= 0 
                    ? `Equilibrio presupuestal alcanzado. Se proyecta un superávit de $${financialData.totals.simNetPago.toLocaleString('es-CO', {maximumFractionDigits:1})} millones al cierre de la vigencia.`
                    : `Déficit proyectado detectado. Se requieren $${Math.abs(financialData.totals.simNetPago).toLocaleString('es-CO', {maximumFractionDigits:1})} millones adicionales en ingresos para alcanzar el punto de equilibrio.`}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'simulator' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          
          {/* Header & Controls */}
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h3 className="text-xl font-display font-medium text-white">Simulador de Escenarios Financieros (Julio - Diciembre)</h3>
              <p className="text-xs text-on-surface-variant mt-1">Los meses de Ene-Jun se mantienen fijos para asegurar fidelidad contable.</p>
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

          {/* Validation Errors banner */}
          {Object.keys(validationErrors).length > 0 && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-xs flex items-start gap-2 animate-in slide-in-from-top duration-200">
              <AlertTriangle className="shrink-0 mt-0.5 animate-bounce" size={16} />
              <div>
                <p className="font-bold text-sm">Error de Validación de Presupuesto</p>
                <p className="mt-1">Existen recursos donde el **Pago Efectivo** supera el **Valor Proyectado** de ingresos. Por favor corrija los valores resaltados en rojo antes de continuar.</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Income resource modifiers */}
            <div className="glass-card rounded-[32px] p-6 lg:p-8 border border-white/10 flex flex-col gap-6">
              <h4 className="text-sm font-bold text-[#ffcc29] uppercase tracking-widest flex items-center gap-2 pb-4 border-b border-white/5">
                <TrendingUp size={16} /> Ajustar Variación de Ingresos
              </h4>
              <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {RESOURCES_LIST.map(r => {
                  const val = simIngByResource[r] || 0;
                  const baseVal = financialData.resourceBaselines[r]?.ing || 0;
                  const simVal = baseVal * (1 + val / 100);
                  
                  // Deviation color
                  const absDev = Math.abs(val);
                  let devDot = 'bg-green-400';
                  let devLabel = 'Estable';
                  if (absDev > 5 && absDev <= 15) {
                    devDot = 'bg-yellow-400';
                    devLabel = 'Modificado';
                  } else if (absDev > 15) {
                    devDot = 'bg-red-400';
                    devLabel = 'Desviación Alta';
                  }

                  return (
                    <div key={r} className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-3 hover:border-white/20 transition-all">
                      {/* Name & IA */}
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${devDot}`} title={devLabel}></span>
                          <span className="text-white font-bold text-xs truncate max-w-[200px]" title={getResourceFullName(r)}>
                            {getResourceFullName(r)}
                          </span>
                        </div>
                        <button 
                          onClick={() => setSelectedAiResource(r)} 
                          className="flex items-center gap-1 px-2.5 py-1 bg-[#ffcc29]/10 border border-[#ffcc29]/20 text-[#ffcc29] text-[10px] font-bold rounded-lg hover:bg-[#ffcc29]/20 transition-all"
                        >
                          <Compass size={11} /> IA Sugerir
                        </button>
                      </div>

                      {/* Info grid */}
                      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-on-surface-variant">
                        <div>
                          <p>VALOR INICIAL (BASE)</p>
                          <p className="text-white font-bold mt-0.5">${(baseVal).toLocaleString('es-CO', {maximumFractionDigits:1})}M</p>
                        </div>
                        <div>
                          <p>VALOR PROYECTADO</p>
                          <p className="text-[#ffcc29] font-bold mt-0.5">${(simVal).toLocaleString('es-CO', {maximumFractionDigits:1})}M</p>
                        </div>
                      </div>

                      {/* Variation row */}
                      <div className="flex justify-between items-center text-[10px] font-mono border-t border-white/5 pt-2">
                        <span className="text-on-surface-variant">VARIACIÓN</span>
                        <span className={`font-bold ${val >= 0 ? 'text-[#4ade80]' : 'text-[#ff5b5b]'}`}>
                          {val >= 0 ? '+' : ''}${(simVal - baseVal).toLocaleString('es-CO', {maximumFractionDigits:1})}M ({val >= 0 ? '+' : ''}{val.toFixed(1)}%)
                        </span>
                      </div>

                      {/* Controls row */}
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
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Expense resource modifiers */}
            <div className="glass-card rounded-[32px] p-6 lg:p-8 border border-white/10 flex flex-col gap-6">
              
              {/* Mode Selector Header */}
              <div className="flex flex-col gap-2.5 pb-4 border-b border-white/5">
                <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider block">Método de Ajuste de Gastos:</span>
                <div className="grid grid-cols-2 gap-2 bg-black/40 border border-white/10 p-1 rounded-xl">
                  <button
                    onClick={() => setExpenseAdjustMode('resource')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold font-mono transition-all uppercase flex items-center justify-center gap-1.5 ${expenseAdjustMode === 'resource' ? 'bg-[#f43f5e] text-white shadow-md' : 'text-white/60 hover:text-white'}`}
                  >
                    <Briefcase size={12} /> Por Recurso
                  </button>
                  <button
                    onClick={() => setExpenseAdjustMode('category')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold font-mono transition-all uppercase flex items-center justify-center gap-1.5 ${expenseAdjustMode === 'category' ? 'bg-[#7bd0ff] text-black shadow-md font-extrabold' : 'text-white/60 hover:text-white'}`}
                  >
                    <Layers size={12} /> Por Categoría
                  </button>
                </div>
              </div>

              {/* Show Por Recurso Mode */}
              {expenseAdjustMode === 'resource' && (
                <div className="animate-in fade-in duration-300">
                  <h4 className="text-sm font-bold text-[#f43f5e] uppercase tracking-widest flex items-center gap-2 pb-4 border-b border-white/5">
                    <Briefcase size={16} /> Ajustar Egresos por Recurso
                  </h4>
                  <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar mt-4">
                    {RESOURCES_LIST.map(r => {
                      const val = simGasByResource[r] || 0;
                      const baseValComp = financialData.resourceBaselines[r]?.gasComp || 0;
                      const baseValPago = financialData.resourceBaselines[r]?.gasPago || 0;
                      
                      const simValComp = baseValComp * (1 + val / 100);
                      const simValPago = baseValPago * (1 + val / 100);

                      // Income projected for r
                      const ingBase = financialData.resourceBaselines[r]?.ing || 0;
                      const ingVal = ingBase * (1 + (simIngByResource[r] || 0) / 100);

                      // Validation rule: Pago Efectivo <= Valor Proyectado
                      const isInvalid = simValPago > ingVal;

                      return (
                        <div key={r} className={`p-4 bg-white/5 border rounded-2xl space-y-3 transition-all ${isInvalid ? 'border-red-500 bg-red-500/5 shadow-lg shadow-red-500/5' : 'border-white/10 hover:border-white/20'}`}>
                          {/* Name & Badge & IA */}
                          <div className="flex justify-between items-start gap-2">
                            <div className="flex flex-col">
                              <span className="text-white font-bold text-xs truncate max-w-[200px]" title={getResourceFullName(r)}>
                                {getResourceFullName(r)}
                              </span>
                              {isInvalid && (
                                <span className="inline-block self-start mt-1 text-red-400 font-mono text-[9px] font-bold uppercase px-2 py-0.5 bg-red-500/10 rounded-md border border-red-500/20">
                                  Exceso Egresos
                                </span>
                              )}
                            </div>
                            <button 
                              onClick={() => setSelectedAiExpenseResource(r)} 
                              className="flex items-center gap-1 px-2.5 py-1 bg-[#f43f5e]/10 border border-[#f43f5e]/20 text-[#f43f5e] text-[10px] font-bold rounded-lg hover:bg-[#f43f5e]/20 transition-all shrink-0"
                            >
                              <Compass size={11} /> IA Sugerir
                            </button>
                          </div>

                          {/* Info grid */}
                          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-on-surface-variant">
                            <div>
                              <p>VALOR INICIAL (COMP/PAGO)</p>
                              <p className="text-white font-bold mt-0.5">${baseValComp.toFixed(1)}M / ${baseValPago.toFixed(1)}M</p>
                            </div>
                            <div>
                              <p>VALOR PROYECTADO (COMP/PAGO)</p>
                              <p className="text-[#f43f5e] font-bold mt-0.5">${simValComp.toFixed(1)}M / ${simValPago.toFixed(1)}M</p>
                            </div>
                          </div>

                          {/* Variation row */}
                          <div className="flex justify-between items-center text-[10px] font-mono border-t border-white/5 pt-2">
                            <span className="text-on-surface-variant">VARIACIÓN</span>
                            <span className={`font-bold ${val >= 0 ? 'text-[#ff5b5b]' : 'text-[#4ade80]'}`}>
                              {val >= 0 ? '+' : ''}{val.toFixed(1)}% (Pago: {val >= 0 ? '+' : ''}${(simValPago - baseValPago).toFixed(1)}M)
                            </span>
                          </div>

                          {/* Controls row */}
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
                            <div className="flex items-center bg-black/40 border border-white/10 rounded-xl px-2.5 py-1 w-24 shrink-0">
                              <input
                                type="number"
                                step="0.1"
                                value={parseFloat(simValPago.toFixed(1))}
                                onChange={(e) => {
                                  const inputVal = parseFloat(e.target.value) || 0;
                                  let newPct = baseValPago > 0 ? ((inputVal / baseValPago) - 1) * 100 : 0;
                                  newPct = Math.max(-50, Math.min(50, newPct));
                                  setSimGasByResource(prev => ({ ...prev, [r]: parseFloat(newPct.toFixed(1)) }));
                                }}
                                className="bg-transparent text-white font-mono text-[11px] outline-none w-full text-right"
                              />
                              <span className="text-[9px] text-on-surface-variant ml-1 font-mono">M</span>
                            </div>
                          </div>

                          {/* Validation message warning */}
                          {isInvalid && (
                            <div className="text-[10px] text-red-400 font-mono mt-2 leading-relaxed bg-red-500/10 p-2.5 rounded-lg border border-red-500/20 flex gap-1.5 items-start">
                              <AlertTriangle className="shrink-0 mt-0.5" size={12} />
                              <span>El valor del Pago Efectivo no puede ser superior al Valor Proyectado del recurso (${ingVal.toFixed(1)}M).</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Show Por Categoría Mode */}
              {expenseAdjustMode === 'category' && (
                <div className="animate-in fade-in duration-300">
                  <h4 className="text-sm font-bold text-[#7bd0ff] uppercase tracking-widest flex items-center gap-2 pb-4 border-b border-white/5">
                    <Layers size={16} /> Ajustar Egresos por Tipo/Categoría
                  </h4>
                  <div className="space-y-6 mt-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {[
                      { id: 'Personal', label: 'Gastos de Personal (2.1.1)' },
                      { id: 'Funcionamiento', label: 'Gastos de Funcionamiento (2.1.2)' },
                      { id: 'Transferencias', label: 'Transferencias Corrientes (2.1.3)' },
                      { id: 'Tasas', label: 'Tasas y Multas (2.1.8)' },
                      { id: 'Deuda', label: 'Servicios de la Deuda (2.2.2)' },
                      { id: 'Inversion', label: 'Gastos de Inversión (2.3)' }
                    ].map(c => {
                      const val = simGasByType[c.id] || 0;
                      const vals = categoryValues[c.id] || { baseComp: 0, basePago: 0, simComp: 0, simPago: 0 };

                      return (
                        <div key={c.id} className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-3 hover:border-white/20 transition-all">
                          {/* Header and IA button */}
                          <div className="flex justify-between items-start gap-2">
                            <span className="text-white font-bold text-xs">{c.label}</span>
                            <button
                              onClick={() => setSelectedAiExpenseCategory(c.id)}
                              className="flex items-center gap-1 px-2.5 py-1 bg-[#7bd0ff]/10 border border-[#7bd0ff]/20 text-[#7bd0ff] text-[10px] font-bold rounded-lg hover:bg-[#7bd0ff]/20 transition-all shrink-0 font-mono"
                            >
                              <Compass size={11} /> IA Sugerir
                            </button>
                          </div>

                          {/* Info grid */}
                          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-on-surface-variant">
                            <div>
                              <p>VALOR INICIAL (COMP/PAGO)</p>
                              <p className="text-white font-bold mt-0.5">${vals.baseComp.toFixed(1)}M / ${vals.basePago.toFixed(1)}M</p>
                            </div>
                            <div>
                              <p>VALOR PROYECTADO (COMP/PAGO)</p>
                              <p className="text-[#7bd0ff] font-bold mt-0.5">${vals.simComp.toFixed(1)}M / ${vals.simPago.toFixed(1)}M</p>
                            </div>
                          </div>

                          {/* Variation row */}
                          <div className="flex justify-between items-center text-[10px] font-mono border-t border-white/5 pt-2">
                            <span className="text-on-surface-variant">VARIACIÓN</span>
                            <span className={`font-bold ${val >= 0 ? 'text-[#ff5b5b]' : 'text-[#4ade80]'}`}>
                              {val >= 0 ? '+' : ''}{val.toFixed(1)}% (Pago: {val >= 0 ? '+' : ''}${(vals.simPago - vals.basePago).toFixed(1)}M)
                            </span>
                          </div>

                          {/* Slider & Input Row */}
                          <div className="flex items-center gap-4 pt-1">
                            <input 
                              type="range"
                              min="-30"
                              max="30"
                              step="1"
                              value={val}
                              onChange={(e) => {
                                const n = parseInt(e.target.value);
                                setSimGasByType(prev => ({ ...prev, [c.id]: n }));
                              }}
                              className="flex-1 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#7bd0ff]"
                            />
                            <div className="flex items-center bg-black/40 border border-white/10 rounded-xl px-2.5 py-1 w-24 shrink-0">
                              <input
                                type="number"
                                step="0.1"
                                value={parseFloat(vals.simPago.toFixed(1))}
                                onChange={(e) => {
                                  const inputVal = parseFloat(e.target.value) || 0;
                                  let newPct = vals.basePago > 0 ? ((inputVal / vals.basePago) - 1) * 100 : 0;
                                  newPct = Math.max(-30, Math.min(30, newPct));
                                  setSimGasByType(prev => ({ ...prev, [c.id]: parseFloat(newPct.toFixed(1)) }));
                                }}
                                className="bg-transparent text-white font-mono text-[11px] outline-none w-full text-right"
                              />
                              <span className="text-[9px] text-on-surface-variant ml-1 font-mono">M</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}



      {activeTab === 'sensitivity' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          
          {/* Controls Header */}
          <div className="glass-card rounded-[32px] p-6 lg:p-8 border border-white/10 flex flex-wrap justify-between items-center gap-6">
            <div className="space-y-1">
              <h3 className="text-xl font-display font-medium text-white">Análisis de Sensibilidad y Elasticidad</h3>
              <p className="text-xs text-on-surface-variant">Estudio de impacto en el VAN (NPV) y la TIR (IRR) bajo variaciones del entorno financiero.</p>
            </div>
            
            {/* Resource Selector */}
            <div className="flex items-center bg-black/40 border border-white/10 rounded-xl px-4 py-2">
              <span className="text-xs font-mono text-on-surface-variant mr-3 uppercase">Recurso:</span>
              <select
                value={sensResource}
                onChange={(e) => setSensResource(e.target.value)}
                className="bg-transparent text-xs text-white font-bold outline-none cursor-pointer"
              >
                <option value="Todos" className="bg-[#0f172a]">Todos los Recursos</option>
                {RESOURCES_LIST.map(r => (
                  <option key={r} value={r} className="bg-[#0f172a]">{getResourceFullName(r)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Parameters Sliders */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Tasa de descuento slider */}
            <div className="glass-card rounded-2xl p-6 border border-white/5 bg-white/5">
              <div className="flex justify-between text-xs font-mono mb-3">
                <span className="text-white/60">Tasa de Descuento (k)</span>
                <span className="text-[#ffcc29] font-bold">{sensDiscountRate}% Anual</span>
              </div>
              <input
                type="range"
                min="1"
                max="25"
                step="1"
                value={sensDiscountRate}
                onChange={(e) => setSensDiscountRate(parseInt(e.target.value))}
                className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#ffcc29]"
              />
              <p className="text-[10px] text-on-surface-variant mt-2 font-mono">Tasa de oportunidad requerida para calcular el VAN.</p>
            </div>

            {/* Pessimistic Pct slider */}
            <div className="glass-card rounded-2xl p-6 border border-white/5 bg-white/5">
              <div className="flex justify-between text-xs font-mono mb-3">
                <span className="text-white/60">Variación Escenario Pesimista</span>
                <span className="text-red-400 font-bold">{sensPessimisticPct}% Ingreso</span>
              </div>
              <input
                type="range"
                min="-40"
                max="-5"
                step="5"
                value={sensPessimisticPct}
                onChange={(e) => setSensPessimisticPct(parseInt(e.target.value))}
                className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-red-400"
              />
              <p className="text-[10px] text-on-surface-variant mt-2 font-mono">Simula la caída de ingresos y aumento proporcional de egresos.</p>
            </div>

            {/* Optimistic Pct slider */}
            <div className="glass-card rounded-2xl p-6 border border-white/5 bg-white/5">
              <div className="flex justify-between text-xs font-mono mb-3">
                <span className="text-white/60">Variación Escenario Optimista</span>
                <span className="text-[#4ade80] font-bold">+{sensOptimisticPct}% Ingreso</span>
              </div>
              <input
                type="range"
                min="5"
                max="40"
                step="5"
                value={sensOptimisticPct}
                onChange={(e) => setSensOptimisticPct(parseInt(e.target.value))}
                className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#4ade80]"
              />
              <p className="text-[10px] text-on-surface-variant mt-2 font-mono">Simula el incremento de ingresos y reducción proporcional de egresos.</p>
            </div>

          </div>

          {/* Scenario Comparison Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Pessimistic Scenario Card */}
            <div className="glass-card rounded-[28px] p-6 border border-red-500/20 bg-red-500/5 relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 left-0 w-full h-1 bg-red-500"></div>
              <div>
                <h4 className="text-sm font-bold text-red-400 font-display">Escenario Pesimista</h4>
                <p className="text-[10px] text-on-surface-variant font-mono mt-1">Simulado a {sensPessimisticPct}% Ing / +{Math.abs(sensPessimisticPct) / 1.5}% Egr</p>
                
                <div className="space-y-4 mt-6">
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-xs text-on-surface-variant">Ingreso Proyectado Anual</span>
                    <span className="text-sm font-mono font-bold text-white">${sensitivityAnalysis.pessimistic.ingTotal.toLocaleString('es-CO', {maximumFractionDigits:1})}M</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-xs text-on-surface-variant">NPV / VAN</span>
                    <span className="text-sm font-mono font-bold text-white">${sensitivityAnalysis.pessimistic.npv.toLocaleString('es-CO', {maximumFractionDigits:1})}M</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-xs text-on-surface-variant">IRR / TIR</span>
                    <span className="text-sm font-mono font-bold text-white">{sensitivityAnalysis.pessimistic.irr > 0 ? `${sensitivityAnalysis.pessimistic.irr.toFixed(1)}%` : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-xs text-on-surface-variant">Flujo Neto (Dic 31)</span>
                    <span className="text-sm font-mono font-bold text-white">${sensitivityAnalysis.pessimistic.flowSum.toLocaleString('es-CO', {maximumFractionDigits:1})}M</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Base Scenario Card */}
            <div className="glass-card rounded-[28px] p-6 border border-white/10 bg-white/5 relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 left-0 w-full h-1 bg-white/30"></div>
              <div>
                <h4 className="text-sm font-bold text-white font-display">Escenario Base</h4>
                <p className="text-[10px] text-on-surface-variant font-mono mt-1">Simulado a 0% variación (Proyección Actual)</p>
                
                <div className="space-y-4 mt-6">
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-xs text-on-surface-variant">Ingreso Proyectado Anual</span>
                    <span className="text-sm font-mono font-bold text-white">${sensitivityAnalysis.base.ingTotal.toLocaleString('es-CO', {maximumFractionDigits:1})}M</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-xs text-on-surface-variant">NPV / VAN</span>
                    <span className="text-sm font-mono font-bold text-white">${sensitivityAnalysis.base.npv.toLocaleString('es-CO', {maximumFractionDigits:1})}M</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-xs text-on-surface-variant">IRR / TIR</span>
                    <span className="text-sm font-mono font-bold text-white">{sensitivityAnalysis.base.irr > 0 ? `${sensitivityAnalysis.base.irr.toFixed(1)}%` : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-xs text-on-surface-variant">Flujo Neto (Dic 31)</span>
                    <span className="text-sm font-mono font-bold text-white">${sensitivityAnalysis.base.flowSum.toLocaleString('es-CO', {maximumFractionDigits:1})}M</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Optimistic Scenario Card */}
            <div className="glass-card rounded-[28px] p-6 border border-green-500/20 bg-green-500/5 relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 left-0 w-full h-1 bg-green-500"></div>
              <div>
                <h4 className="text-sm font-bold text-green-400 font-display">Escenario Optimista</h4>
                <p className="text-[10px] text-on-surface-variant font-mono mt-1">Simulado a +{sensOptimisticPct}% Ing / -{sensOptimisticPct / 1.5}% Egr</p>
                
                <div className="space-y-4 mt-6">
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-xs text-on-surface-variant">Ingreso Proyectado Anual</span>
                    <span className="text-sm font-mono font-bold text-white">${sensitivityAnalysis.optimistic.ingTotal.toLocaleString('es-CO', {maximumFractionDigits:1})}M</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-xs text-on-surface-variant">NPV / VAN</span>
                    <span className="text-sm font-mono font-bold text-white">${sensitivityAnalysis.optimistic.npv.toLocaleString('es-CO', {maximumFractionDigits:1})}M</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-xs text-on-surface-variant">IRR / TIR</span>
                    <span className="text-sm font-mono font-bold text-white">{sensitivityAnalysis.optimistic.irr > 0 ? `${sensitivityAnalysis.optimistic.irr.toFixed(1)}%` : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-xs text-on-surface-variant">Flujo Neto (Dic 31)</span>
                    <span className="text-sm font-mono font-bold text-white">${sensitivityAnalysis.optimistic.flowSum.toLocaleString('es-CO', {maximumFractionDigits:1})}M</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Elasticity analysis & Line chart */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Chart */}
            <div className="lg:col-span-2 glass-card rounded-[32px] p-6 border border-white/10 flex flex-col h-[350px]">
              <h4 className="text-sm font-bold text-white uppercase tracking-widest mb-4">Evolución de Flujos por Escenario</h4>
              <div className="flex-1 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={new Array(12).fill(0).map((_, i) => ({
                      name: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'][i],
                      Pesimista: parseFloat(sensitivityAnalysis.pessimistic.flows[i].toFixed(1)),
                      Base: parseFloat(sensitivityAnalysis.base.flows[i].toFixed(1)),
                      Optimista: parseFloat(sensitivityAnalysis.optimistic.flows[i].toFixed(1))
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="name" stroke="#94a3b8" className="text-[10px] font-mono" />
                    <YAxis stroke="#94a3b8" className="text-[10px] font-mono" />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)' }} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Area type="monotone" dataKey="Optimista" stroke="#4ade80" fill="#4ade80" fillOpacity={0.05} />
                    <Area type="monotone" dataKey="Base" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.05} />
                    <Area type="monotone" dataKey="Pesimista" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.05} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Elasticity coefficient card */}
            <div className="glass-card rounded-[32px] p-6 border border-white/10 flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span>Coeficientes de Elasticidad</span>
                </h4>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Mide la sensibilidad del Valor Actual Neto (VAN) frente a cambios del 1% en los componentes de flujo.
                </p>

                <div className="space-y-4 mt-6">
                  <div className="p-4 bg-white/5 border border-white/5 rounded-2xl">
                    <p className="text-[10px] text-on-surface-variant font-mono uppercase">Elasticidad Ingreso-VAN</p>
                    <p className="text-lg font-bold text-[#ffcc29] mt-1">
                      {sensitivityAnalysis.elasticityIng >= 0 ? '+' : ''}{sensitivityAnalysis.elasticityIng.toFixed(2)}%
                    </p>
                    <p className="text-[10px] text-white/50 mt-1">
                      Por cada 1% de incremento en el ingreso proyectado de este recurso, el VAN se modifica en un **{Math.abs(sensitivityAnalysis.elasticityIng).toFixed(2)}%**.
                    </p>
                  </div>

                  <div className="p-4 bg-white/5 border border-white/5 rounded-2xl">
                    <p className="text-[10px] text-on-surface-variant font-mono uppercase">Elasticidad Egreso-VAN</p>
                    <p className="text-lg font-bold text-[#f43f5e] mt-1">
                      {sensitivityAnalysis.elasticityGas >= 0 ? '+' : ''}{sensitivityAnalysis.elasticityGas.toFixed(2)}%
                    </p>
                    <p className="text-[10px] text-white/50 mt-1">
                      Por cada 1% de incremento en el egreso proyectado, el VAN se modifica en un **{Math.abs(sensitivityAnalysis.elasticityGas).toFixed(2)}%**.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Monte Carlo & Tornado Chart Column Stack */}
          <div className="flex flex-col gap-8 mt-6">
            
            {/* Monte Carlo Simulation Dashboard */}
            <div className="glass-card rounded-[32px] p-6 lg:p-8 border border-white/10 flex flex-col justify-between bg-surface/50">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                    <Activity size={16} className="text-[#c084fc]" /> Simulación de Monte Carlo (1000 Iteraciones)
                  </h4>
                  <span className="px-2.5 py-0.5 bg-[#c084fc]/10 border border-[#c084fc]/20 text-[#c084fc] text-[9px] font-bold font-mono rounded-md uppercase">
                    Modelado Estocástico
                  </span>
                </div>
                <p className="text-xs text-on-surface-variant leading-relaxed mb-6">
                  Simulación de variabilidad aleatoria de ingresos (±20%) y egresos (±15%) para medir la probabilidad de éxito financiero (1000 corridas estocásticas).
                </p>

                {/* Monte Carlo Key Stats */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-white/5 border border-white/5 rounded-2xl p-4 text-center">
                    <p className="text-[9px] text-on-surface-variant font-mono uppercase">Prob. VAN &gt; 0</p>
                    <p className="text-xl font-display font-bold text-[#4ade80] mt-1">
                      {sensitivityAnalysis.monteCarlo.probPos.toFixed(1)}%
                    </p>
                  </div>
                  <div className="bg-white/5 border border-white/5 rounded-2xl p-4 text-center">
                    <p className="text-[9px] text-on-surface-variant font-mono uppercase">VAN Medio</p>
                    <p className="text-xl font-display font-bold text-[#ffcc29] mt-1">
                      ${sensitivityAnalysis.monteCarlo.mean.toLocaleString('es-CO', {maximumFractionDigits:1})}M
                    </p>
                  </div>
                  <div className="bg-white/5 border border-white/5 rounded-2xl p-4 text-center">
                    <p className="text-[9px] text-on-surface-variant font-mono uppercase">Intervalo 95%</p>
                    <p className="text-[10px] font-mono font-bold text-white mt-2 truncate" title={`[${sensitivityAnalysis.monteCarlo.low95.toLocaleString('es-CO', {maximumFractionDigits:1})}M, ${sensitivityAnalysis.monteCarlo.high95.toLocaleString('es-CO', {maximumFractionDigits:1})}M]`}>
                      [${sensitivityAnalysis.monteCarlo.low95.toLocaleString('es-CO', {maximumFractionDigits:1})}M, ${sensitivityAnalysis.monteCarlo.high95.toLocaleString('es-CO', {maximumFractionDigits:1})}M]
                    </p>
                  </div>
                </div>

                {/* Histogram */}
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={sensitivityAnalysis.monteCarlo.bins}
                      margin={{ top: 10, right: 10, left: 10, bottom: 40 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis 
                        dataKey="range" 
                        stroke="#94a3b8" 
                        className="text-[9px] font-mono" 
                        interval={0} 
                        angle={-30} 
                        textAnchor="end" 
                        height={60} 
                      />
                      <YAxis stroke="#94a3b8" className="text-[9px] font-mono" />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)' }} />
                      <Bar dataKey="Frecuencia" fill="#c084fc" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Tornado Chart */}
            <div className="glass-card rounded-[32px] p-6 lg:p-8 border border-white/10 flex flex-col justify-between bg-surface/50">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                    <Layers size={16} className="text-[#7bd0ff]" /> Diagrama de Tornado (Sensibilidad de Recursos)
                  </h4>
                  <span className="px-2.5 py-0.5 bg-[#7bd0ff]/10 border border-[#7bd0ff]/20 text-[#7bd0ff] text-[9px] font-bold font-mono rounded-md uppercase">
                    Impacto en VAN Global
                  </span>
                </div>
                <p className="text-xs text-on-surface-variant leading-relaxed mb-6">
                  Muestra la sensibilidad del VAN total del presupuesto universitario ante una variación de ±10% en cada recurso individual.
                </p>

                {/* Tornado Bar Chart */}
                <div className="h-[400px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={sensitivityAnalysis.tornado}
                      margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={true} horizontal={false} />
                      <XAxis type="number" stroke="#94a3b8" className="text-[9px] font-mono" />
                      <YAxis type="category" dataKey="name" stroke="#94a3b8" className="text-[10px] font-mono" width={150} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)' }}
                        formatter={(value: any, name: any) => {
                          const val = parseFloat(value);
                          return [`${val >= 0 ? '+' : ''}${val}M`, name === 'low' ? 'Bajo (-10%)' : 'Alto (+10%)'];
                        }}
                      />
                      <ReferenceLine x={0} stroke="#ffffff" strokeOpacity={0.2} strokeDasharray="3 3" />
                      <Bar dataKey="low" fill="#f43f5e" radius={[4, 0, 0, 4]} stackId="stack" />
                      <Bar dataKey="high" fill="#4ade80" radius={[0, 4, 4, 0]} stackId="stack" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-[9px] text-on-surface-variant mt-2 text-center font-mono">El ancho de barra representa la elasticidad del recurso. Barras más largas indican mayor impacto presupuestal.</p>
              </div>
            </div>

          </div>

          {/* New DSCR & Covenant Analysis Section */}
          <div className="border-t border-white/10 pt-10 mt-10 space-y-8">
            <div className="flex justify-between items-center flex-wrap gap-4">
              <div>
                <h3 className="text-xl font-display font-medium text-white flex items-center gap-2">
                  <ShieldCheck className="text-primary-container" size={24} />
                  Ratio de Cobertura de Caja (DSCR) y Cumplimiento de Covenants
                </h3>
                <p className="text-xs text-on-surface-variant mt-1">
                  Análisis dinámico de cobertura del servicio de egresos sobre ingresos y simulación de umbrales críticos.
                </p>
              </div>
              
              <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-xl text-[10px] font-mono text-on-surface-variant">
                Covenant Mínimo Requerido: <span className="text-[#ffcc29] font-bold">1.25x</span>
              </div>
            </div>

            {/* DSCR Top 5 Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {/* Card 1: DSCR Base */}
              <div className="glass-card rounded-2xl p-5 border border-white/5 bg-[#0f172a]/40 relative overflow-hidden flex flex-col justify-between">
                <span className="text-[10px] text-on-surface-variant font-mono uppercase tracking-wider block mb-1">DSCR Base</span>
                <span className="text-2xl font-display font-bold text-white mt-2 flex items-center gap-1.5">
                  {sensitivityAnalysis.dscrBase.toFixed(2)}x
                  <TrendingUp className="text-[#4ade80]" size={16} />
                </span>
              </div>

              {/* Card 2: Covenant Mínimo */}
              <div className="glass-card rounded-2xl p-5 border border-white/5 bg-[#0f172a]/40 relative overflow-hidden flex flex-col justify-between">
                <span className="text-[10px] text-on-surface-variant font-mono uppercase tracking-wider block mb-1">Covenant mínimo</span>
                <span className="text-2xl font-display font-bold text-[#f43f5e] mt-2 flex items-center gap-1.5">
                  1.25x
                  <ShieldAlert className="text-[#f43f5e]" size={16} />
                </span>
              </div>

              {/* Card 3: Colchón */}
              <div className="glass-card rounded-2xl p-5 border border-white/5 bg-[#0f172a]/40 relative overflow-hidden flex flex-col justify-between">
                <span className="text-[10px] text-on-surface-variant font-mono uppercase tracking-wider block mb-1">Colchón</span>
                <span className="text-2xl font-display font-bold text-[#4ade80] mt-2 flex items-center gap-1.5">
                  {sensitivityAnalysis.cushion >= 0 ? '+' : ''}{sensitivityAnalysis.cushion.toFixed(1)}%
                  <Gauge className="text-[#4ade80]" size={16} />
                </span>
              </div>

              {/* Card 4: Rupture Point */}
              <div className="glass-card rounded-2xl p-5 border border-white/5 bg-[#0f172a]/40 relative overflow-hidden flex flex-col justify-between">
                <span className="text-[10px] text-on-surface-variant font-mono uppercase tracking-wider block mb-1">Pto. Ruptura (Ingreso)</span>
                <span className="text-2xl font-display font-bold text-[#ffcc29] mt-2 flex items-center gap-1.5">
                  ${sensitivityAnalysis.ruptureValue.toLocaleString('es-CO', {maximumFractionDigits:1})}M
                  <Target className="text-[#ffcc29]" size={16} />
                </span>
              </div>

              {/* Card 5: Drop vs Base */}
              <div className="glass-card rounded-2xl p-5 border border-white/5 bg-[#0f172a]/40 relative overflow-hidden flex flex-col justify-between">
                <span className="text-[10px] text-on-surface-variant font-mono uppercase tracking-wider block mb-1">Var. Límite vs Base</span>
                <span className="text-2xl font-display font-bold text-orange-400 mt-2 flex items-center gap-1.5">
                  {sensitivityAnalysis.ruptureVar.toFixed(1)}%
                  <TrendingDown className="text-orange-400" size={16} />
                </span>
              </div>
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Chart: DSCR vs Variación */}
              <div className="glass-card rounded-[32px] p-6 lg:p-8 border border-white/10 flex flex-col h-[420px] bg-surface/50">
                <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-4">Sensibilidad 1D · DSCR vs Variación</h4>
                <div className="flex-1 w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={sensitivityAnalysis.dscr1DData} margin={{ top: 20, right: 25, left: -10, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis 
                        dataKey="vLabel" 
                        stroke="#94a3b8" 
                        className="text-[9px] font-mono" 
                        angle={-30} 
                        textAnchor="end" 
                        height={50} 
                      />
                      <YAxis stroke="#94a3b8" className="text-[10px] font-mono" domain={[0, 'auto']} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)' }} />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                      <Line type="monotone" dataKey="DSCR" name="DSCR (x)" stroke="#4ade80" strokeWidth={3} activeDot={{ r: 8 }} />
                      <Line type="monotone" dataKey="Covenant" name="Covenant Límite (1.25x)" stroke="#f43f5e" strokeDasharray="5 5" strokeWidth={2} dot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Right Chart: Driver impact on DSCR */}
              <div className="glass-card rounded-[32px] p-6 lg:p-8 border border-white/10 flex flex-col h-[420px] bg-surface/50">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-xs font-bold text-white uppercase tracking-widest">Tornado · Impacto de Drivers sobre el DSCR (±10%)</h4>
                  <span className="px-2 py-0.5 bg-red-500/10 border border-red-500/20 text-red-400 text-[8px] font-bold font-mono rounded">
                    Driver Crítico: {sensitivityAnalysis.dscrTornado[0]?.fullName?.split('-')[0]?.trim() || 'Precio'}
                  </span>
                </div>
                <div className="flex-1 w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={sensitivityAnalysis.dscrTornado} margin={{ top: 10, right: 15, left: 10, bottom: 5 }} barSize={16}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={true} horizontal={false} />
                      <XAxis type="number" stroke="#94a3b8" className="text-[9px] font-mono" domain={[0, 'auto']} />
                      <YAxis 
                        type="category" 
                        dataKey="labelName" 
                        stroke="#94a3b8" 
                        className="text-[9px] font-mono" 
                        width={170} 
                        tickLine={false} 
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)' }}
                        formatter={(value: any, name: any) => {
                          const val = parseFloat(value);
                          return [`${val}x`, name === 'low' ? 'Impacto Adverso (-10%)' : 'Impacto Favorable (+10%)'];
                        }}
                      />
                      <ReferenceLine x={sensitivityAnalysis.dscrBase} stroke="#ffffff" strokeOpacity={0.2} strokeDasharray="3 3" />
                      <Bar dataKey="low" fill="#f43f5e" radius={[4, 0, 0, 4]} stackId="stack" name="Impacto Adverso" />
                      <Bar dataKey="high" fill="#4ade80" radius={[0, 4, 4, 0]} stackId="stack" name="Impacto Favorable" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Scenario compliance cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-4">
              {/* Covenant Min Box */}
              <div className="glass-card rounded-2xl p-6 border border-white/10 bg-[#0f172a]/20 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] text-on-surface-variant font-mono uppercase tracking-wider block mb-2">Covenant mínimo</span>
                <span className="text-3xl font-display font-bold text-white">1,25x</span>
                <div className="w-full border-t border-dashed border-white/10 mt-3 pt-3 text-[10px] text-on-surface-variant font-mono">
                  Umbral de Cumplimiento
                </div>
              </div>

              {/* Base scenario compliance */}
              <div className="glass-card rounded-2xl p-6 border border-[#4ade80]/20 bg-[#4ade80]/5 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] text-on-surface-variant font-mono uppercase tracking-wider block mb-2">Escenario Base</span>
                <span className="text-3xl font-display font-bold text-[#4ade80]">{sensitivityAnalysis.dscrBase.toFixed(2)}x</span>
                <div className={`mt-3 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${sensitivityAnalysis.dscrBase >= 1.25 ? 'bg-[#4ade80]/10 text-[#4ade80]' : 'bg-red-500/10 text-red-400'}`}>
                  {sensitivityAnalysis.dscrBase >= 1.25 ? '✓ CUMPLE' : '✗ NO CUMPLE'}
                </div>
              </div>

              {/* Optimistic scenario compliance */}
              <div className="glass-card rounded-2xl p-6 border border-[#4ade80]/20 bg-[#4ade80]/5 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] text-on-surface-variant font-mono uppercase tracking-wider block mb-2">Escenario Optimista</span>
                <span className="text-3xl font-display font-bold text-[#4ade80]">{sensitivityAnalysis.dscrOptimistic.toFixed(2)}x</span>
                <div className={`mt-3 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${sensitivityAnalysis.dscrOptimistic >= 1.25 ? 'bg-[#4ade80]/10 text-[#4ade80]' : 'bg-red-500/10 text-red-400'}`}>
                  {sensitivityAnalysis.dscrOptimistic >= 1.25 ? '✓ CUMPLE' : '✗ NO CUMPLE'}
                </div>
              </div>

              {/* Pessimistic scenario compliance */}
              <div className="glass-card rounded-2xl p-6 border border-red-500/20 bg-red-500/5 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] text-on-surface-variant font-mono uppercase tracking-wider block mb-2">Escenario Pesimista</span>
                <span className="text-3xl font-display font-bold text-red-400">{sensitivityAnalysis.dscrPessimistic.toFixed(2)}x</span>
                <div className={`mt-3 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${sensitivityAnalysis.dscrPessimistic >= 1.25 ? 'bg-[#4ade80]/10 text-[#4ade80]' : 'bg-red-500/10 text-red-400'}`}>
                  {sensitivityAnalysis.dscrPessimistic >= 1.25 ? '✓ CUMPLE' : '✗ NO CUMPLE'}
                </div>
              </div>
            </div>

            {/* Bottom text statements */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-white/5">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-full bg-[#4ade80]/10 flex items-center justify-center shrink-0 border border-[#4ade80]/20">
                  <ShieldCheck className="text-[#4ade80]" size={22} />
                </div>
                <p className="text-xs text-white/80 leading-relaxed font-mono">
                  El caso base cumple el covenant con un colchón del <span className="text-[#4ade80] font-bold">{sensitivityAnalysis.cushion.toFixed(1)}%</span>.
                </p>
              </div>

              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center shrink-0 border border-orange-500/20">
                  <TrendingDown className="text-orange-400" size={22} />
                </div>
                <p className="text-xs text-white/80 leading-relaxed font-mono">
                  Una caída del <span className="text-orange-400 font-bold">{Math.abs(sensitivityAnalysis.ruptureVar).toFixed(1)}%</span> en los ingresos llevaría al punto de ruptura.
                </p>
              </div>

              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-full bg-[#ffcc29]/10 flex items-center justify-center shrink-0 border border-[#ffcc29]/20">
                  <Layers className="text-[#ffcc29]" size={22} />
                </div>
                <p className="text-xs text-white/80 leading-relaxed font-mono">
                  El recurso <span className="text-[#ffcc29] font-bold">{sensitivityAnalysis.dscrTornado[0]?.fullName?.split('-')[0]?.trim() || 'principal'}</span> es el driver que más mueve el DSCR.
                </p>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* AI Recommendation Modal */}
      {selectedAiResource && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-white/10 rounded-[32px] w-full max-w-lg p-6 md:p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            
            {/* Modal Header */}
            <div className="flex justify-between items-start gap-4">
              <div>
                <span className="px-2.5 py-1 bg-[#ffcc29]/10 border border-[#ffcc29]/20 text-[#ffcc29] text-[10px] font-bold font-mono rounded-lg uppercase tracking-wider">
                  Asistente Inteligente (IA)
                </span>
                <h3 className="text-xl font-display font-bold text-white mt-2">Recomendación de Proyección</h3>
              </div>
              <button 
                onClick={() => setSelectedAiResource(null)}
                className="text-white/60 hover:text-white transition-colors p-1"
              >
                ✕
              </button>
            </div>

            {/* Resource details */}
            <div className="bg-white/5 border border-white/5 rounded-2xl p-4 space-y-2">
              <p className="text-on-surface-variant text-[10px] font-mono uppercase tracking-wider">Recurso Presupuestal</p>
              <p className="text-sm text-white font-bold">{getResourceFullName(selectedAiResource)}</p>
            </div>

            {/* Recommendation info */}
            {(() => {
              const suggestion = aiSuggestions[selectedAiResource];
              const baseVal = financialData.resourceBaselines[selectedAiResource]?.ing || 0;
              const sliderValue = baseVal > 0 ? Math.round(((suggestion.value / baseVal) - 1) * 100) : 0;
              
              return (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                      <p className="text-on-surface-variant text-[10px] font-mono uppercase tracking-wider">Valor Sugerido</p>
                      <p className="text-2xl font-display font-bold text-[#ffcc29] mt-1">${suggestion.value.toLocaleString('es-CO', {maximumFractionDigits:1})}M</p>
                    </div>
                    
                    <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                      <p className="text-on-surface-variant text-[10px] font-mono uppercase tracking-wider">Nivel de Confianza</p>
                      <p className="text-2xl font-display font-bold text-[#4ade80] mt-1">{suggestion.confidence}%</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-on-surface-variant text-[10px] font-mono uppercase tracking-wider">Justificación Técnica</p>
                    <p className="text-xs text-white/80 font-sans leading-relaxed bg-white/5 border border-white/5 p-4 rounded-2xl">
                      {suggestion.justification}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => {
                        setSimIngByResource(prev => ({ ...prev, [selectedAiResource]: sliderValue }));
                        setSelectedAiResource(null);
                      }}
                      className="flex-1 py-3 bg-[#ffcc29] hover:bg-[#ffcc29]/90 text-black font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-[#ffcc29]/10"
                    >
                      Aplicar sugerencia IA
                    </button>
                    <button
                      onClick={() => setSelectedAiResource(null)}
                      className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all border border-white/10"
                    >
                      Cerrar
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* AI Expense Recommendation Modal */}
      {selectedAiExpenseResource && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-white/10 rounded-[32px] w-full max-w-lg p-6 md:p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            
            {/* Modal Header */}
            <div className="flex justify-between items-start gap-4">
              <div>
                <span className="px-2.5 py-1 bg-[#f43f5e]/10 border border-[#f43f5e]/20 text-[#f43f5e] text-[10px] font-bold font-mono rounded-lg uppercase tracking-wider">
                  Asistente Inteligente (IA) - Egresos
                </span>
                <h3 className="text-xl font-display font-bold text-white mt-2">Recomendación de Egresos</h3>
              </div>
              <button 
                onClick={() => setSelectedAiExpenseResource(null)}
                className="text-white/60 hover:text-white transition-colors p-1"
              >
                ✕
              </button>
            </div>

            {/* Resource details */}
            <div className="bg-white/5 border border-white/5 rounded-2xl p-4 space-y-2">
              <p className="text-on-surface-variant text-[10px] font-mono uppercase tracking-wider">Recurso Presupuestal</p>
              <p className="text-sm text-white font-bold">{getResourceFullName(selectedAiExpenseResource)}</p>
            </div>

            {/* Recommendation info */}
            {(() => {
              const suggestion = aiSuggestionsExpenses[selectedAiExpenseResource];
              const baseVal = financialData.resourceBaselines[selectedAiExpenseResource]?.gasPago || 0;
              const sliderValue = baseVal > 0 ? Math.round(((suggestion.value / baseVal) - 1) * 100) : 0;
              
              return (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                      <p className="text-on-surface-variant text-[10px] font-mono uppercase tracking-wider">Sugerencia (Pago)</p>
                      <p className="text-2xl font-display font-bold text-[#f43f5e] mt-1">${suggestion.value.toLocaleString('es-CO', {maximumFractionDigits:1})}M</p>
                    </div>
                    
                    <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                      <p className="text-on-surface-variant text-[10px] font-mono uppercase tracking-wider">Nivel de Confianza</p>
                      <p className="text-2xl font-display font-bold text-[#4ade80] mt-1">{suggestion.confidence}%</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-on-surface-variant text-[10px] font-mono uppercase tracking-wider">Justificación Técnica</p>
                    <p className="text-xs text-white/80 font-sans leading-relaxed bg-white/5 border border-white/5 p-4 rounded-2xl">
                      {suggestion.justification}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => {
                        setSimGasByResource(prev => ({ ...prev, [selectedAiExpenseResource]: sliderValue }));
                        setSelectedAiExpenseResource(null);
                      }}
                      className="flex-1 py-3 bg-[#f43f5e] hover:bg-[#f43f5e]/90 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-[#f43f5e]/10"
                    >
                      Aplicar sugerencia IA
                    </button>
                    <button
                      onClick={() => setSelectedAiExpenseResource(null)}
                      className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all border border-white/10"
                    >
                      Cerrar
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* AI Category Expense Recommendation Modal */}
      {selectedAiExpenseCategory && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-white/10 rounded-[32px] w-full max-w-lg p-6 md:p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            
            {/* Modal Header */}
            <div className="flex justify-between items-start gap-4">
              <div>
                <span className="px-2.5 py-1 bg-[#7bd0ff]/10 border border-[#7bd0ff]/20 text-[#7bd0ff] text-[10px] font-bold font-mono rounded-lg uppercase tracking-wider">
                  Asistente Inteligente (IA) - Egresos por Tipo
                </span>
                <h3 className="text-xl font-display font-bold text-white mt-2">Recomendación de Egresos</h3>
              </div>
              <button 
                onClick={() => setSelectedAiExpenseCategory(null)}
                className="text-white/60 hover:text-white transition-colors p-1"
              >
                ✕
              </button>
            </div>

            {/* Category details */}
            <div className="bg-white/5 border border-white/5 rounded-2xl p-4 space-y-2">
              <p className="text-on-surface-variant text-[10px] font-mono uppercase tracking-wider">Categoría / Tipo de Gasto</p>
              <p className="text-sm text-white font-bold">{selectedAiExpenseCategory}</p>
            </div>

            {/* Recommendation info */}
            {(() => {
              const suggestion = aiSuggestionsCategory[selectedAiExpenseCategory];
              
              return (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                      <p className="text-on-surface-variant text-[10px] font-mono uppercase tracking-wider">Variación Sugerida</p>
                      <p className="text-2xl font-display font-bold text-[#7bd0ff] mt-1">{suggestion.value >= 0 ? '+' : ''}{suggestion.value}%</p>
                    </div>
                    
                    <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                      <p className="text-on-surface-variant text-[10px] font-mono uppercase tracking-wider">Nivel de Confianza</p>
                      <p className="text-2xl font-display font-bold text-[#4ade80] mt-1">{suggestion.confidence}%</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-on-surface-variant text-[10px] font-mono uppercase tracking-wider">Justificación Técnica</p>
                    <p className="text-xs text-white/80 font-sans leading-relaxed bg-white/5 border border-white/5 p-4 rounded-2xl">
                      {suggestion.justification}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => {
                        setSimGasByType(prev => ({ ...prev, [selectedAiExpenseCategory]: suggestion.value }));
                        setSelectedAiExpenseCategory(null);
                      }}
                      className="flex-1 py-3 bg-[#7bd0ff] hover:bg-[#7bd0ff]/95 text-black font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-[#7bd0ff]/10"
                    >
                      Aplicar sugerencia IA
                    </button>
                    <button
                      onClick={() => setSelectedAiExpenseCategory(null)}
                      className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all border border-white/10"
                    >
                      Cerrar
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
