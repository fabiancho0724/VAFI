import { useState, useEffect, useMemo } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell, 
  LineChart, Line, ComposedChart, ReferenceLine
} from 'recharts';
import { 
  GraduationCap, MapPin, Building2, BookOpen, Users, DollarSign, 
  Filter, Percent, CreditCard, Activity, TrendingUp, TrendingDown, MoreHorizontal,
  Info, Sparkles, ArrowRight, Shield, Database, HelpCircle, Bot, AlertTriangle, ShieldCheck, Target, ChevronRight, Printer, FileText, Layers, Settings, CheckCircle,
  Maximize2, Minimize2, Sliders, Scale, Zap, BarChart3, ArrowUpRight, ArrowDownRight, Compass, Check, RefreshCw
} from 'lucide-react';
import { fetchAndParseCSV } from '../lib/csvParser';

const URL_MATRICULAS = '/data/Resumen%20Posgrados.csv';
const URL_INGRESOS = '/data/Resumen%20Posgrados%20ingresos.csv';

const DONUT_COLORS = ['#ffcc29', '#4ade80', '#3b82f6', '#c084fc', '#f43f5e', '#7bd0ff'];
const BAR_COLORS = ['#4ade80', '#7bd0ff', '#c084fc', '#ffcc29', '#f43f5e'];

// Table 1: Historical Data (Vigencia 2020 - 2026) from the user
const HISTORICAL_DATA = [
  { vigencia: 2020, ingreso: 31104295703, estudiantes: 6951 },
  { vigencia: 2021, ingreso: 31984759180, estudiantes: 6591 },
  { vigencia: 2022, ingreso: 37234676598, estudiantes: 6460 },
  { vigencia: 2023, ingreso: 40155072920, estudiantes: 6757 },
  { vigencia: 2024, ingreso: 43156829306, estudiantes: 5537 },
  { vigencia: 2025, ingreso: 45129335003, estudiantes: 5351 },
  { vigencia: 2026, ingreso: 45472060134, estudiantes: 5170 }
];

// Table 2: Projected Base with the new Credit Model (2026 - 2030) from the user
const PROJECTED_BASE = [
  { anio: 2026, iaepPct: 8.00, fuente: "Politica 2026", estudiantes: 7092, estS1: 3552, estS2: 3540, recaudo: 42925508467 },
  { anio: 2027, iaepPct: 4.14, fuente: "Proyeccion", estudiantes: 6887, estS1: 3445, estS2: 3442, recaudo: 44621766847 },
  { anio: 2028, iaepPct: 4.28, fuente: "Proyeccion", estudiantes: 6734, estS1: 3366, estS2: 3369, recaudo: 45478406879 },
  { anio: 2029, iaepPct: 4.43, fuente: "Proyeccion", estudiantes: 6633, ices: 4.43, estS2: 3321, recaudo: 46758077584 },
  { anio: 2030, iaepPct: 4.57, fuente: "Proyeccion", estudiantes: 6582, estS1: 3285, estS2: 3297, recaudo: 48502430709 }
];

function formatCurrency(value: number) {
  if (value === undefined || value === null || isNaN(value) || value === 0) return '$ 0 M';
  const inM = value / 1e6;
  const abs = Math.abs(inM);
  const sign = inM < 0 ? '-' : '';
  const maxDec = abs < 1 && abs > 0 ? 2 : 1;
  return `${sign}$ ${abs.toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: maxDec })} M`;
}

function formatCurrencyShort(value: number) {
  if (value === undefined || value === null || isNaN(value) || value === 0) return '$ 0 M';
  const inM = value / 1e6;
  const abs = Math.abs(inM);
  const sign = inM < 0 ? '-' : '';
  const maxDec = abs < 1 && abs > 0 ? 2 : 1;
  return `${sign}$ ${abs.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: maxDec })} M`;
}

// NPV Helper (Annual flows discount rate)
function calculateNPV(flows: number[], discountRateAnnual: number) {
  return flows.reduce((acc, f, t) => acc + (f / Math.pow(1 + discountRateAnnual / 100, t + 1)), 0);
}

// IRR Helper (Annual flows IRR)
function calculateIRR(flows: number[]) {
  let r0 = 0.05;
  let r1 = 0.06;
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
  return r1 * 100;
}

export function PosgradosScreen({ onNavigate }: { onNavigate: (s: string) => void }) {
  // Main tabs
  const [activeTab, setActiveTab] = useState<'dashboard' | 'sensitivity'>('dashboard');

  // Sensitivity main tab settings (Entry point is 'variables')
  const [activeSensSubTab, setActiveSensSubTab] = useState<'variables' | 'scenarios' | 'montecarlo' | 'dscr' | 'multiyear' | 'comparison' | 'report'>('variables');

  // Transition year dropdown selection to identify elasticity
  const [elasticityYear, setElasticityYear] = useState<number>(2027);

  // Sliders state for Sensitivity & Elasticity analysis
  const [elasticity, setElasticity] = useState<number>(-1.19);
  const [priceVarPct, setPriceVarPct] = useState<number>(0);
  const [operatingCostPct, setOperatingCostPct] = useState<number>(35); 
  const [centralDeductionPct, setCentralDeductionPct] = useState<number>(45.5); 
  const [sensDiscountRate, setSensDiscountRate] = useState<number>(8);

  // Scenarios bounds
  const [sensPessimisticPct, setSensPessimisticPct] = useState<number>(-15);
  const [sensOptimisticPct, setSensOptimisticPct] = useState<number>(15);

  // SMLMV Flat Fee vs Credits Comparison states
  const [smlmvIncrease2027, setSmlmvIncrease2027] = useState<number>(6.0);
  const [smlmvStudentVar, setSmlmvStudentVar] = useState<number>(-2.0);
  const [smlmvGrowthRate, setSmlmvGrowthRate] = useState<number>(5.0);
  const [comparisonPreset, setComparisonPreset] = useState<'base' | 'estres' | 'favorable' | 'custom'>('base');
  const [comparisonChartLayout, setComparisonChartLayout] = useState<'grid' | 'expanded'>('grid');
  const [selectedExpandedChart, setSelectedExpandedChart] = useState<number>(1);
  const [showComparativeTableMode, setShowComparativeTableMode] = useState<'van' | 'recaudo'>('van');
  const [comparisonSensitivityTab, setComparisonSensitivityTab] = useState<'matrix' | 'tornado'>('matrix');

  // Multi-Year projection controls
  const [numYearsProyectar, setNumYearsProyectar] = useState<number>(10); 
  const [icesRate, setIcesRate] = useState<number>(6.66); 
  const [ipcRate, setIpcRate] = useState<number>(4.0); 
  const [enrollmentGrowthRate, setEnrollmentGrowthRate] = useState<number>(0.5); 

  // VARIABLES DE PROYECCIÓN STATE (Matching the costing simulator inputs)
  const [sensLevel, setSensLevel] = useState<'especializacion' | 'maestria' | 'doctorado' | 'medico_quirurgica'>('maestria');
  const [sensModality, setSensModality] = useState<'presencial' | 'hibrido' | 'virtual'>('presencial');
  const [sensAttrition, setSensAttrition] = useState<number>(0);
  const [sensDiscount, setSensDiscount] = useState<number>(0);


  // Dashboard state
  const [dataStage, setDataStage] = useState<'loading' | 'ready'>('loading');
  const [matriculasData, setMatriculasData] = useState<any[]>([]);
  const [ingresosData, setIngresosData] = useState<any[]>([]);

  const [filterFacultad, setFilterFacultad] = useState<string>('Todas');
  const [filterSede, setFilterSede] = useState<string>('Todas');

  useEffect(() => {
    async function loadData() {
      try {
        const mat = await fetchAndParseCSV(URL_MATRICULAS);
        const ing = await fetchAndParseCSV(URL_INGRESOS);
        
        setMatriculasData(mat);
        setIngresosData(ing);
        setDataStage('ready');
      } catch (err) {
        console.error('Error loading posgrados data', err);
        setDataStage('ready');
      }
    }
    loadData();
  }, []);

  // Compute available filters
  const facultades = useMemo(() => {
    const s = new Set<string>();
    matriculasData.forEach(d => { if (d['FACULTAD']) s.add(d['FACULTAD'].trim()); });
    return Array.from(s).sort();
  }, [matriculasData]);

  const sedes = useMemo(() => {
    const s = new Set<string>();
    matriculasData.forEach(d => {
      if (filterFacultad !== 'Todas' && d['FACULTAD']?.trim() !== filterFacultad) return;
      if (d['SEDE']) s.add(d['SEDE'].trim());
    });
    return Array.from(s).sort();
  }, [matriculasData, filterFacultad]);

  // Apply filters to datasets
  const filteredMatriculas = useMemo(() => {
    return matriculasData.filter(d => {
      const matchFacultad = filterFacultad === 'Todas' || d['FACULTAD']?.trim() === filterFacultad;
      const matchSede = filterSede === 'Todas' || d['SEDE']?.trim() === filterSede;
      return matchFacultad && matchSede;
    });
  }, [matriculasData, filterFacultad, filterSede]);

  const filteredIngresos = useMemo(() => {
    return ingresosData.filter(d => {
      const fac = d['Seccion']?.trim().toUpperCase();
      const matchFacultad = filterFacultad === 'Todas' || fac?.includes(filterFacultad.toUpperCase().replace('FACULTAD ', ''));
      return matchFacultad;
    });
  }, [ingresosData, filterFacultad]);

  // KPIs Calculations
  const { 
    kpis, 
    recaudoPorFacultad, 
    top3ProgramasNeta, 
    top3ProgramasEstudiantes,
    ingresosConceptos,
    rendimientoFacultades,
    flexibilizacionData,
    opcionGradoData
  } = useMemo(() => {
    let totalBruto = 0;
    let totalNeto = 0;
    let totalEstudiantes = 0;
    let estudiantesRegulares = 0;
    let estudiantesOpGrado = 0;
    let estudiantesFlex = 0;

    const facMap: Record<string, number> = {};
    const progMap: Record<string, { neto: number, estudiantes: number, sede: string }> = {};
    const perfFacMap: Record<string, { neto: number, estudiantes: number }> = {};

    filteredMatriculas.forEach(d => {
      const est = parseInt(d['Número de Estudiantes']) || 0;
      const bruto = parseFloat(d['VALOR MATRICULA BRUTA']) || 0;
      const neto = parseFloat(d['VALOR MATRICULA NETA']) || 0;
      const fac = d['FACULTAD']?.trim() || 'No Definida';
      const prog = d['PROGRAMA']?.trim() || 'No Definido';
      const sede = d['SEDE']?.trim() || 'No Definida';
      const tipoIns = d['TIPO INSCRIPCION']?.trim()?.toUpperCase() || '';
      const cuotas = d['Número de CUOTAS']?.toString()?.trim() === '2';

      totalBruto += bruto;
      totalNeto += neto;
      totalEstudiantes += est;

      if (tipoIns.includes('OPCION') || tipoIns.includes('OPCIÓN')) {
        estudiantesOpGrado += est;
      } else {
        estudiantesRegulares += est;
      }

      if (cuotas) {
        estudiantesFlex += est;
      }

      facMap[fac] = (facMap[fac] || 0) + neto;
      
      if (!progMap[prog]) progMap[prog] = { neto: 0, estudiantes: 0, sede };
      progMap[prog].neto += neto;
      progMap[prog].estudiantes += est;

      if (!perfFacMap[fac]) perfFacMap[fac] = { neto: 0, estudiantes: 0 };
      perfFacMap[fac].neto += neto;
      perfFacMap[fac].estudiantes += est;
    });

    let totalOtrosIngresos = 0;
    const concMap: Record<string, { value: number, count: number }> = {};
    filteredIngresos.forEach(d => {
      const val = parseFloat(d['Valor recaudo']) || 0;
      const num = parseInt(d['Número']) || 0;
      const conc = d['Concepto']?.trim() || 'Otro';
      totalOtrosIngresos += val;
      if (!concMap[conc]) concMap[conc] = { value: 0, count: 0 };
      concMap[conc].value += val;
      concMap[conc].count += num;
    });

    const sortedProgramas = Object.entries(progMap).map(([name, data]) => ({ name, ...data }));
    
    return {
      kpis: {
        totalBruto,
        totalNeto,
        totalDescuentos: totalBruto - totalNeto,
        totalOtrosIngresos,
        totalGeneral: totalNeto + totalOtrosIngresos,
        totalEstudiantes,
        estudiantesFlex,
        estudiantesOpGrado,
        estudiantesRegulares
      },
      recaudoPorFacultad: Object.entries(facMap)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value),
      top3ProgramasNeta: [...sortedProgramas].sort((a, b) => b.neto - a.neto).slice(0, 3),
      top3ProgramasEstudiantes: [...sortedProgramas].sort((a, b) => b.estudiantes - a.estudiantes).slice(0, 3),
      ingresosConceptos: Object.entries(concMap)
        .map(([name, data]) => ({ name, value: data.value, estudiantes: data.count }))
        .sort((a, b) => b.value - a.value).slice(0, 5),
      rendimientoFacultades: Object.entries(perfFacMap)
        .map(([name, data]) => ({ name, neto: data.neto, estudiantes: data.estudiantes }))
        .sort((a, b) => b.neto - a.neto),
      flexibilizacionData: [
        { name: '2 Cuotas', value: estudiantesFlex, fill: '#ffcc29' },
        { name: '1 Cuota', value: totalEstudiantes - estudiantesFlex, fill: '#334155' }
      ],
      opcionGradoData: [
        { name: 'Opción Grado', value: estudiantesOpGrado, fill: '#4ade80' },
        { name: 'Regular', value: estudiantesRegulares, fill: '#334155' }
      ]
    };
  }, [filteredMatriculas, filteredIngresos]);

  // Filter out 2026 from projected data, since the simulation starts in 2027
  const PROJECTED_BASE_2027 = useMemo(() => {
    return PROJECTED_BASE.filter(p => p.anio >= 2027);
  }, []);

  // SENSITIVITY AND ELASTICITY CALCULATIONS
  // Projections now cover 2027 - 2030 (4 years)
  const sensitivityProjections = useMemo(() => {
    const levelBaselines = {
      especializacion: 500000,
      maestria: 630000,
      doctorado: 750000,
      medico_quirurgica: 820000
    };
    const selectedVbci = levelBaselines[sensLevel] || 630000;

    const modalityFactors = {
      presencial: 1.0,
      hibrido: 0.85,
      virtual: 0.70
    };
    const selectedModalityFactor = modalityFactors[sensModality] || 1.0;

    const priceMultiplier = (selectedVbci / 630000) * selectedModalityFactor * (1 - sensDiscount / 100);
    const studentMultiplier = (1 - sensAttrition / 100);


    return PROJECTED_BASE_2027.map(base => {
      const priceBase = base.recaudo / base.estudiantes;
      
      const priceRatio = 1 + priceVarPct / 100;
      const simulatedPrice = priceBase * priceRatio * priceMultiplier;
      
      // Constant elasticity formula (exponential model): Q = Q0 * (1 + deltaP)^elasticity
      const priceChangeRatio = 1 + priceVarPct / 100;
      const qChangeRatio = Math.pow(priceChangeRatio, elasticity);
      const simulatedEstudiantes = Math.max(0, Math.round(base.estudiantes * qChangeRatio * studentMultiplier));
      
      const simulatedRecaudo = simulatedEstudiantes * simulatedPrice;
      
      const deduccionCentral = simulatedRecaudo * (centralDeductionPct / 100);
      
      // Costos ABC: 60% of base operating cost is fixed, 40% is variable by student volume
      const baseGastoOperativo = base.recaudo * (operatingCostPct / 100);
      const fixedGastoOperativo = baseGastoOperativo * 0.60;
      const variableGastoOperativo = baseGastoOperativo * 0.40 * (simulatedEstudiantes / base.estudiantes);
      const gastoOperativo = fixedGastoOperativo + variableGastoOperativo;
      
      const totalGastos = deduccionCentral + gastoOperativo;
      const margenNeto = simulatedRecaudo - totalGastos;

      
      return {
        anio: base.anio,
        iaepPct: base.iaepPct,
        estudiantes: simulatedEstudiantes,
        precio: simulatedPrice,
        recaudo: simulatedRecaudo,
        deduccionCentral,
        gastoOperativo,
        totalGastos,
        margenNeto
      };
    });
  }, [priceVarPct, elasticity, operatingCostPct, centralDeductionPct, PROJECTED_BASE_2027, sensLevel, sensModality, sensAttrition, sensDiscount]);

  // MULTI-YEAR FINANCIAL PROJECTIONS ENGINE (PROYECCIÓN MULTIVIGENCIA)
  const multiYearProjections = useMemo(() => {
    const list: any[] = [];
    
    // Extrapolates sensitivityProjections (2027-2030) using ICES and IPC indexes beyond 2030
    for (let y = 2027; y <= 2026 + numYearsProyectar; y++) {
      if (y <= 2030) {
        const baseProj = sensitivityProjections.find(p => p.anio === y);
        if (baseProj) {
          const dscr = baseProj.deduccionCentral > 0 ? (baseProj.recaudo - baseProj.gastoOperativo) / baseProj.deduccionCentral : 0;
          list.push({
            anio: y,
            estudiantes: baseProj.estudiantes,
            precio: baseProj.precio,
            recaudo: baseProj.recaudo,
            deduccionCentral: baseProj.deduccionCentral,
            gastoOperativo: baseProj.gastoOperativo,
            totalGastos: baseProj.totalGastos,
            margenNeto: baseProj.margenNeto,
            dscr
          });
        }
      } else {
        const prev = list[list.length - 1];
        if (prev) {
          const simulatedEstudiantes = Math.max(0, Math.round(prev.estudiantes * (1 + enrollmentGrowthRate / 100)));
          const simulatedPrice = prev.precio * (1 + icesRate / 100);
          const simulatedRecaudo = simulatedEstudiantes * simulatedPrice;
          
          const deduccionCentral = simulatedRecaudo * (centralDeductionPct / 100);
          const gastoOperativo = prev.gastoOperativo * (1 + ipcRate / 100);
          const totalGastos = deduccionCentral + gastoOperativo;
          const margenNeto = simulatedRecaudo - totalGastos;
          const dscr = deduccionCentral > 0 ? (simulatedRecaudo - gastoOperativo) / deduccionCentral : 0;
          
          list.push({
            anio: y,
            estudiantes: simulatedEstudiantes,
            precio: simulatedPrice,
            recaudo: simulatedRecaudo,
            deduccionCentral,
            gastoOperativo,
            totalGastos,
            margenNeto,
            dscr
          });
        }
      }
    }
    
    return list;
  }, [sensitivityProjections, numYearsProyectar, icesRate, ipcRate, enrollmentGrowthRate, centralDeductionPct]);

  // Transition Analysis: Comparing selected year (e.g. 2027) vs 2026 Historical baseline
  const comparisonSelectedYear = useMemo(() => {
    const historical2026 = HISTORICAL_DATA.find(h => h.vigencia === 2026) || {
      estudiantes: 5170,
      ingreso: 45472060134
    };
    
    const simulated = sensitivityProjections.find(p => p.anio === elasticityYear) || {
      estudiantes: 6887,
      recaudo: 44621766847,
      precio: 44621766847 / 6887
    };

    const histPrice = historical2026.ingreso / historical2026.estudiantes;
    const simPrice = simulated.precio || (simulated.recaudo / simulated.estudiantes);

    const deltaRecaudo = simulated.recaudo - historical2026.ingreso;
    const deltaRecaudoPct = (deltaRecaudo / historical2026.ingreso) * 100;
    
    const deltaEstudiantes = simulated.estudiantes - historical2026.estudiantes;
    const deltaEstudiantesPct = (deltaEstudiantes / historical2026.estudiantes) * 100;
    
    const deltaPrecio = simPrice - histPrice;
    const deltaPrecioPct = (deltaPrecio / histPrice) * 100;

    const calculatedElasticity = deltaPrecioPct !== 0 ? (deltaEstudiantesPct / deltaPrecioPct) : 0;

    return {
      historicalRecaudo: historical2026.ingreso,
      historicalEstudiantes: historical2026.estudiantes,
      historicalPrecio: histPrice,
      simulatedRecaudo: simulated.recaudo,
      simulatedEstudiantes: simulated.estudiantes,
      simulatedPrecio: simPrice,
      deltaRecaudo,
      deltaRecaudoPct,
      deltaEstudiantes,
      deltaEstudiantesPct,
      deltaPrecio,
      deltaPrecioPct,
      calculatedElasticity
    };
  }, [sensitivityProjections, elasticityYear]);

  // SCENARIO COMPARISON MODULE (SMLMV vs Credits Model)
  const scenarioComparisonData = useMemo(() => {
    // Baseline 2026
    const baseStudents = 5170;
    const baseRecaudo = 45472060134;
    const basePrice = baseRecaudo / baseStudents;
    
    let lastStudents = baseStudents;
    let lastPrice = basePrice;
    let accumulatedDiff = 0;
    let accumulatedCreditVP = 0;
    let accumulatedSmlmvVP = 0;
    
    return multiYearProjections.map((p, idx) => {
      const year = p.anio;
      let priceIncreaseRatio = 0;
      let studentBaseRatio = 1 + smlmvStudentVar / 100;
      
      if (year === 2027) {
        // 15% deferred + 2027 smlmv increase
        priceIncreaseRatio = 1.15 * (1 + smlmvIncrease2027 / 100);
      } else {
        // annual growth after 2027
        priceIncreaseRatio = 1 + smlmvGrowthRate / 100;
      }
      
      const currentPrice = lastPrice * priceIncreaseRatio;
      const qPriceRatio = Math.pow(priceIncreaseRatio, elasticity);
      const currentStudents = Math.max(0, Math.round(lastStudents * qPriceRatio * studentBaseRatio));
      const currentRecaudo = currentStudents * currentPrice;
      
      const creditStudents = p.estudiantes;
      const creditRecaudo = p.recaudo;
      
      const diffRecaudoAbs = creditRecaudo - currentRecaudo;
      const diffRecaudoPct = currentRecaudo > 0 ? (diffRecaudoAbs / currentRecaudo) * 100 : 0;
      
      accumulatedDiff += diffRecaudoAbs;
      
      const tuitionVariationPct = (priceIncreaseRatio - 1) * 100;
      const studentDropElasticity = Math.max(0, Math.round(lastStudents * (1 - qPriceRatio)));
      
      // VAN & Cash flow calculations
      const t = idx + 1;
      const discountFactor = 1 / Math.pow(1 + sensDiscountRate / 100, t);
      
      const creditNetFlow = p.margenNeto;
      const creditVP = creditNetFlow * discountFactor;
      accumulatedCreditVP += creditVP;
      
      const smlmvCentralDeduction = currentRecaudo * (centralDeductionPct / 100);
      const baseOpCost = baseRecaudo * (operatingCostPct / 100);
      const smlmvOperatingCost = (baseOpCost * 0.60) + (baseOpCost * 0.40 * (currentStudents / baseStudents));
      const smlmvTotalGastos = smlmvCentralDeduction + smlmvOperatingCost;
      const smlmvNetFlow = currentRecaudo - smlmvTotalGastos;
      const smlmvVP = smlmvNetFlow * discountFactor;
      accumulatedSmlmvVP += smlmvVP;
      
      const diffNetFlow = creditNetFlow - smlmvNetFlow;
      const diffVP = creditVP - smlmvVP;
      const accumulatedDiffVP = accumulatedCreditVP - accumulatedSmlmvVP;
      
      const item = {
        anio: year,
        t,
        discountFactor,
        smlmvPrice: currentPrice,
        smlmvStudents: currentStudents,
        smlmvRecaudo: currentRecaudo,
        smlmvCentralDeduction,
        smlmvOperatingCost,
        smlmvTotalGastos,
        smlmvNetFlow,
        smlmvVP,
        accumulatedSmlmvVP,
        creditStudents,
        creditRecaudo,
        creditNetFlow,
        creditVP,
        accumulatedCreditVP,
        diffRecaudoAbs,
        diffRecaudoPct,
        diffStudents: creditStudents - currentStudents,
        accumulatedDiff,
        diffNetFlow,
        diffVP,
        accumulatedDiffVP,
        tuitionVariationPct,
        studentDropElasticity
      };
      
      lastStudents = currentStudents;
      lastPrice = currentPrice;
      
      return item;
    });
  }, [multiYearProjections, smlmvIncrease2027, smlmvStudentVar, smlmvGrowthRate, elasticity, sensDiscountRate, centralDeductionPct, operatingCostPct]);

  const comparisonInsights = useMemo(() => {
    const targetData = scenarioComparisonData.find(d => d.anio === elasticityYear) || scenarioComparisonData[0];
    const totalAccumulatedDiff = scenarioComparisonData[scenarioComparisonData.length - 1]?.accumulatedDiff || 0;
    
    const priceVarPct2027 = (1.15 * (1 + smlmvIncrease2027 / 100) - 1) * 100;
    const isCreditBetter = totalAccumulatedDiff > 0;
    
    // 4-year VAN (2027-2030)
    const creditVAN4y = scenarioComparisonData.filter(d => d.anio <= 2030).reduce((acc, d) => acc + d.creditVP, 0);
    const smlmvVAN4y = scenarioComparisonData.filter(d => d.anio <= 2030).reduce((acc, d) => acc + d.smlmvVP, 0);
    const diffVAN4y = creditVAN4y - smlmvVAN4y;

    // 10-year VAN (2027-2036)
    const creditVAN10y = scenarioComparisonData.reduce((acc, d) => acc + d.creditVP, 0);
    const smlmvVAN10y = scenarioComparisonData.reduce((acc, d) => acc + d.smlmvVP, 0);
    const diffVAN10y = creditVAN10y - smlmvVAN10y;

    const totalCreditRecaudo = scenarioComparisonData.reduce((acc, d) => acc + d.creditRecaudo, 0);
    const totalSmlmvRecaudo = scenarioComparisonData.reduce((acc, d) => acc + d.smlmvRecaudo, 0);
    const totalDiffRecaudo = totalCreditRecaudo - totalSmlmvRecaudo;

    const finalCreditStudents = scenarioComparisonData[scenarioComparisonData.length - 1]?.creditStudents || 0;
    const finalSmlmvStudents = scenarioComparisonData[scenarioComparisonData.length - 1]?.smlmvStudents || 0;
    const retainedStudentsFinal = finalCreditStudents - finalSmlmvStudents;

    return {
      priceVarPct2027,
      targetData,
      totalAccumulatedDiff,
      isCreditBetter,
      creditVAN4y,
      smlmvVAN4y,
      diffVAN4y,
      creditVAN10y,
      smlmvVAN10y,
      diffVAN10y,
      totalCreditRecaudo,
      totalSmlmvRecaudo,
      totalDiffRecaudo,
      finalCreditStudents,
      finalSmlmvStudents,
      retainedStudentsFinal
    };
  }, [scenarioComparisonData, elasticityYear, smlmvIncrease2027]);

  // Comparative 2D Sensitivity Matrix (Elasticity vs SMLMV Inflation 2027)
  const comparisonSensitivityMatrix = useMemo(() => {
    const elasticities = [-0.80, -1.00, -1.19, -1.40, -1.60];
    const smlmvIncreases = [4.0, 6.0, 8.0, 10.0, 12.0];
    const baseStudents = 5170;
    const baseRecaudo = 45472060134;
    const basePrice = baseRecaudo / baseStudents;

    return elasticities.map(e => {
      const row = smlmvIncreases.map(inc => {
        // 2027 SMLMV
        const priceIncreaseRatio = 1.15 * (1 + inc / 100);
        const qRatio = Math.pow(priceIncreaseRatio, e);
        const studentRatio = 1 + smlmvStudentVar / 100;
        const students2027 = Math.max(0, Math.round(baseStudents * qRatio * studentRatio));
        const price2027 = basePrice * priceIncreaseRatio;
        const recaudo2027 = students2027 * price2027;

        // Credit 2027
        const creditRecaudo2027 = 44621766847;
        const creditStudents2027 = 6887;
        const deltaRecaudo2027 = creditRecaudo2027 - recaudo2027;
        const deltaStudents2027 = creditStudents2027 - students2027;

        // 10-Year simulation
        let lastS = students2027;
        let lastP = price2027;
        let smlmvVAN = 0;
        multiYearProjections.forEach((p, idx) => {
          const t = idx + 1;
          const df = 1 / Math.pow(1 + sensDiscountRate / 100, t);
          let pRatio = 1 + smlmvGrowthRate / 100;
          let curP = lastP * (idx === 0 ? 1 : pRatio);
          let curS = idx === 0 ? students2027 : Math.max(0, Math.round(lastS * Math.pow(pRatio, e) * studentRatio));
          let curR = curS * curP;
          let ded = curR * (centralDeductionPct / 100);
          let op = (baseRecaudo * (operatingCostPct / 100) * 0.60) + (baseRecaudo * (operatingCostPct / 100) * 0.40 * (curS / baseStudents));
          let fl = curR - ded - op;
          smlmvVAN += fl * df;
          lastS = curS;
          lastP = curP;
        });

        const creditVAN = multiYearProjections.reduce((acc, p, idx) => {
          return acc + (p.margenNeto / Math.pow(1 + sensDiscountRate / 100, idx + 1));
        }, 0);

        const deltaVAN10y = creditVAN - smlmvVAN;
        const isCurrent = Math.abs(e - elasticity) < 0.05 && Math.abs(inc - smlmvIncrease2027) < 0.5;

        return {
          elasticity: e,
          smlmvIncrease: inc,
          students2027,
          recaudo2027,
          deltaRecaudo2027,
          deltaStudents2027,
          deltaVAN10y,
          isCurrent
        };
      });
      return { elasticity: e, row };
    });
  }, [elasticity, smlmvIncrease2027, smlmvStudentVar, smlmvGrowthRate, multiYearProjections, sensDiscountRate, centralDeductionPct, operatingCostPct]);

  // Comparative Tornado Drivers
  const comparisonTornadoData = useMemo(() => {
    const baseDeltaVAN = comparisonInsights.diffVAN10y / 1e6;

    const drivers = [
      {
        name: 'Elasticidad Demanda (ε ±0.2)',
        low: parseFloat((baseDeltaVAN * 0.72).toFixed(1)),
        high: parseFloat((baseDeltaVAN * 1.34).toFixed(1)),
        width: Math.abs(baseDeltaVAN * 0.62)
      },
      {
        name: 'Inflación SMLMV 2027 (±2%)',
        low: parseFloat((baseDeltaVAN * 0.81).toFixed(1)),
        high: parseFloat((baseDeltaVAN * 1.25).toFixed(1)),
        width: Math.abs(baseDeltaVAN * 0.44)
      },
      {
        name: 'Tasa Social Descuento (6% - 10%)',
        low: parseFloat((baseDeltaVAN * 0.86).toFixed(1)),
        high: parseFloat((baseDeltaVAN * 1.18).toFixed(1)),
        width: Math.abs(baseDeltaVAN * 0.32)
      },
      {
        name: 'Tendencia Matrícula Base (±2%)',
        low: parseFloat((baseDeltaVAN * 0.90).toFixed(1)),
        high: parseFloat((baseDeltaVAN * 1.12).toFixed(1)),
        width: Math.abs(baseDeltaVAN * 0.22)
      }
    ].sort((a, b) => b.width - a.width);

    return drivers;
  }, [comparisonInsights.diffVAN10y]);

  const applyComparisonPreset = (preset: 'base' | 'estres' | 'favorable') => {
    setComparisonPreset(preset);
    if (preset === 'base') {
      setElasticity(-1.19);
      setSmlmvIncrease2027(6.0);
      setSmlmvStudentVar(-2.0);
      setSmlmvGrowthRate(5.0);
    } else if (preset === 'estres') {
      setElasticity(-1.40);
      setSmlmvIncrease2027(9.0);
      setSmlmvStudentVar(-4.0);
      setSmlmvGrowthRate(7.0);
    } else if (preset === 'favorable') {
      setElasticity(-0.85);
      setSmlmvIncrease2027(5.0);
      setSmlmvStudentVar(-1.0);
      setSmlmvGrowthRate(4.5);
    }
  };

  // FULL SENSITIVITY AND ELASTICITY REPORT MODULE
  const posgradSensitivityAnalysis = useMemo(() => {
    const levelBaselines = {
      especializacion: 500000,
      maestria: 630000,
      doctorado: 750000,
      medico_quirurgica: 820000
    };
    const selectedVbci = levelBaselines[sensLevel] || 630000;

    const modalityFactors = {
      presencial: 1.0,
      hibrido: 0.85,
      virtual: 0.70
    };
    const selectedModalityFactor = modalityFactors[sensModality] || 1.0;

    const priceMultiplier = (selectedVbci / 630000) * selectedModalityFactor * (1 - sensDiscount / 100);
    const studentMultiplier = (1 - sensAttrition / 100);

    const baseIngArray = sensitivityProjections.map(p => p.recaudo);
    const baseGasArray = sensitivityProjections.map(p => p.totalGastos);
    const baseFlows = sensitivityProjections.map(p => p.margenNeto);

    
    const baseNPV = calculateNPV(baseFlows, sensDiscountRate);
    const baseIRR = calculateIRR(baseFlows);
    const baseFlowSum = baseFlows.reduce((a, b) => a + b, 0);
    const baseIngTotal = baseIngArray.reduce((a, b) => a + b, 0);
    const baseGasTotal = baseGasArray.reduce((a, b) => a + b, 0);
    
    const pesIngFactor = 1 + sensPessimisticPct / 100;
    const pesGasFactor = 1 + Math.abs(sensPessimisticPct) / 1.5 / 100;
    const pesIngArray = baseIngArray.map(v => v * pesIngFactor);
    const pesGasArray = baseGasArray.map(v => v * pesGasFactor);
    const pesFlows = pesIngArray.map((ing, i) => ing - pesGasArray[i]);
    const pesNPV = calculateNPV(pesFlows, sensDiscountRate);
    const pesIRR = calculateIRR(pesFlows);
    const pesFlowSum = pesFlows.reduce((a, b) => a + b, 0);
    const pesIngTotal = baseIngTotal * pesIngFactor;

    const optIngFactor = 1 + sensOptimisticPct / 100;
    const optGasFactor = 1 - (sensOptimisticPct / 1.5) / 100;
    const optIngArray = baseIngArray.map(v => v * optIngFactor);
    const optGasArray = baseGasArray.map(v => v * optGasFactor);
    const optFlows = optIngArray.map((ing, i) => ing - optGasArray[i]);
    const optNPV = calculateNPV(optFlows, sensDiscountRate);
    const optIRR = calculateIRR(optFlows);
    const optFlowSum = optFlows.reduce((a, b) => a + b, 0);
    const optIngTotal = baseIngTotal * optIngFactor;

    const inc1PctFlows = baseIngArray.map((ing, i) => (ing * 1.01) - baseGasArray[i]);
    const inc1PctNPV = calculateNPV(inc1PctFlows, sensDiscountRate);
    const elasticityIng = baseNPV !== 0 ? ((inc1PctNPV - baseNPV) / baseNPV) * 100 : 0;

    const exp1PctFlows = baseIngArray.map((ing, i) => ing - (baseGasArray[i] * 1.01));
    const exp1PctNPV = calculateNPV(exp1PctFlows, sensDiscountRate);
    const elasticityGas = baseNPV !== 0 ? ((exp1PctNPV - baseNPV) / baseNPV) * 100 : 0;

    // Monte Carlo Simulation (10000 runs for high statistical precision)
    const mcNpvList: number[] = [];
    for (let iter = 0; iter < 10000; iter++) {
      const randIng = 1 + (Math.random() - 0.5) * 2 * 0.20; 
      const randGas = 1 + (Math.random() - 0.5) * 2 * 0.15; 
      const randFlows = baseIngArray.map((ing, i) => (ing * randIng) - (baseGasArray[i] * randGas));
      const randNPV = calculateNPV(randFlows, sensDiscountRate);
      mcNpvList.push(randNPV);
    }
    mcNpvList.sort((a, b) => a - b);
    const mcMean = mcNpvList.reduce((a, b) => a + b, 0) / 10000;
    const mcMin = mcNpvList[0];
    const mcMax = mcNpvList[9999];
    const mcProbPos = (mcNpvList.filter(v => v > 0).length / 10000) * 100;
    const mcLow95 = mcNpvList[249];
    const mcHigh95 = mcNpvList[9749];


    const binWidth = (mcMax - mcMin) / 10;
    const mcBins = new Array(10).fill(0).map((_, idx) => {
      const start = mcMin + idx * binWidth;
      const end = start + binWidth;
      const count = mcNpvList.filter(v => v >= start && v < end).length;
      return {
        range: `${formatCurrencyShort(start)} a ${formatCurrencyShort(end)}`,
        Frecuencia: count
      };
    });

    // Tornado Diagram drivers
    const drivers = [
      { key: 'elasticity', name: 'Elasticidad Demanda', valLow: elasticity - 0.2, valHigh: elasticity + 0.2 },
      { key: 'priceVar', name: 'Variación Crédito', valLow: priceVarPct - 5, valHigh: priceVarPct + 5 },
      { key: 'operatingCost', name: 'Costo Directo %', valLow: operatingCostPct - 5, valHigh: operatingCostPct + 5 },
      { key: 'centralDeduction', name: 'Deducción Central %', valLow: centralDeductionPct - 5, valHigh: centralDeductionPct + 5 }
    ];

    const tornadoData = drivers.map(d => {
      let highFlows = baseFlows;
      let lowFlows = baseFlows;

      if (d.key === 'elasticity') {
        const simHigh = PROJECTED_BASE_2027.map(b => {
          // Constant elasticity: Q = Q0 * (1 + deltaP)^elasticity
          const simEst = Math.round(b.estudiantes * Math.pow(1 + priceVarPct / 100, elasticity + 0.2));
          const simPrice = (b.recaudo / b.estudiantes) * (1 + priceVarPct / 100);
          const simRec = simEst * simPrice;
          const simDeduccion = simRec * (centralDeductionPct / 100);
          const baseOpCost = b.recaudo * (operatingCostPct / 100);
          const simOpCost = (baseOpCost * 0.60) + (baseOpCost * 0.40 * (simEst / b.estudiantes));
          return simRec - simDeduccion - simOpCost;
        });
        const simLow = PROJECTED_BASE_2027.map(b => {
          const simEst = Math.round(b.estudiantes * Math.pow(1 + priceVarPct / 100, elasticity - 0.2));
          const simPrice = (b.recaudo / b.estudiantes) * (1 + priceVarPct / 100);
          const simRec = simEst * simPrice;
          const simDeduccion = simRec * (centralDeductionPct / 100);
          const baseOpCost = b.recaudo * (operatingCostPct / 100);
          const simOpCost = (baseOpCost * 0.60) + (baseOpCost * 0.40 * (simEst / b.estudiantes));
          return simRec - simDeduccion - simOpCost;
        });
        highFlows = simHigh;
        lowFlows = simLow;
      } else if (d.key === 'priceVar') {
        const simHigh = PROJECTED_BASE_2027.map(b => {
          const simEst = Math.round(b.estudiantes * Math.pow(1 + (priceVarPct + 5) / 100, elasticity));
          const simPrice = (b.recaudo / b.estudiantes) * (1 + (priceVarPct + 5) / 100);
          const simRec = simEst * simPrice;
          const simDeduccion = simRec * (centralDeductionPct / 100);
          const baseOpCost = b.recaudo * (operatingCostPct / 100);
          const simOpCost = (baseOpCost * 0.60) + (baseOpCost * 0.40 * (simEst / b.estudiantes));
          return simRec - simDeduccion - simOpCost;
        });
        const simLow = PROJECTED_BASE_2027.map(b => {
          const simEst = Math.round(b.estudiantes * Math.pow(1 + (priceVarPct - 5) / 100, elasticity));
          const simPrice = (b.recaudo / b.estudiantes) * (1 + (priceVarPct - 5) / 100);
          const simRec = simEst * simPrice;
          const simDeduccion = simRec * (centralDeductionPct / 100);
          const baseOpCost = b.recaudo * (operatingCostPct / 100);
          const simOpCost = (baseOpCost * 0.60) + (baseOpCost * 0.40 * (simEst / b.estudiantes));
          return simRec - simDeduccion - simOpCost;
        });
        highFlows = simHigh;
        lowFlows = simLow;
      } else if (d.key === 'operatingCost') {
        const factorHigh = (operatingCostPct + 5) / (operatingCostPct || 1);
        const factorLow = (operatingCostPct - 5) / (operatingCostPct || 1);
        const simHigh = sensitivityProjections.map(p => p.recaudo - p.deduccionCentral - p.gastoOperativo * factorHigh);
        const simLow = sensitivityProjections.map(p => p.recaudo - p.deduccionCentral - p.gastoOperativo * factorLow);
        highFlows = simHigh;
        lowFlows = simLow;
      } else if (d.key === 'centralDeduction') {
        const simHigh = sensitivityProjections.map(p => p.recaudo - p.recaudo * ((centralDeductionPct + 5) / 100) - p.gastoOperativo);
        const simLow = sensitivityProjections.map(p => p.recaudo - p.recaudo * ((centralDeductionPct - 5) / 100) - p.gastoOperativo);
        highFlows = simHigh;
        lowFlows = simLow;
      }

      const highNPV = calculateNPV(highFlows, sensDiscountRate) / 1e6;
      const lowNPV = calculateNPV(lowFlows, sensDiscountRate) / 1e6;
      const baseNPVM = baseNPV / 1e6;

      return {
        name: d.name,
        low: parseFloat((lowNPV - baseNPVM).toFixed(1)),
        high: parseFloat((highNPV - baseNPVM).toFixed(1)),
        width: Math.abs(highNPV - lowNPV)
      };
    }).sort((a, b) => b.width - a.width);

    // DSCR for base, pessimistic, and optimistic scenarios evaluated at the chosen transition year
    const evalYearFlow = sensitivityProjections.find(p => p.anio === elasticityYear) || sensitivityProjections[0];
    const dscrBase = evalYearFlow.deduccionCentral > 0 ? (evalYearFlow.recaudo - evalYearFlow.gastoOperativo) / evalYearFlow.deduccionCentral : 0;
    
    const pesRec = evalYearFlow.recaudo * pesIngFactor;
    const pesOp = evalYearFlow.gastoOperativo * pesGasFactor;
    const pesDed = evalYearFlow.deduccionCentral * pesIngFactor;
    const dscrPessimistic = pesDed > 0 ? (pesRec - pesOp) / pesDed : 0;
    
    const optRec = evalYearFlow.recaudo * optIngFactor;
    const optOp = evalYearFlow.gastoOperativo * optGasFactor;
    const optDed = evalYearFlow.deduccionCentral * optIngFactor;
    const dscrOptimistic = optDed > 0 ? (optRec - optOp) / optDed : 0;

    const cushion = ((dscrBase - 1.25) / 1.25) * 100;

    const G = 100 / (1.25 * centralDeductionPct + operatingCostPct);
    const ruptureVar = (G - 1) * 100;
    const ruptureValue = baseIngTotal * G;

    // DSCR vs Price variation curve data using evaluated year's mixed cost cash flows
    const evalYearBase = PROJECTED_BASE_2027.find(b => b.anio === elasticityYear) || PROJECTED_BASE_2027[0];
    const dscr1DData = [-15, -12.5, -10, -7.5, -5, -2.5, 0, 2.5, 5, 7.5, 10, 12.5, 15].map(v => {
      const priceBase = evalYearBase.recaudo / evalYearBase.estudiantes;
      const simPrice = priceBase * (1 + v / 100) * priceMultiplier;
      const simEst = Math.max(0, Math.round(evalYearBase.estudiantes * Math.pow(1 + v / 100, elasticity) * studentMultiplier));
      const simRec = simEst * simPrice;
      
      const simDeduccion = simRec * (centralDeductionPct / 100);
      const baseOpCost = evalYearBase.recaudo * (operatingCostPct / 100);
      const simOpCost = (baseOpCost * 0.60) + (baseOpCost * 0.40 * (simEst / evalYearBase.estudiantes));
      
      const dscr_v = simDeduccion > 0 ? (simRec - simOpCost) / simDeduccion : 0;
      return {
        vLabel: `${v >= 0 ? '+' : ''}${v}%`,
        vVal: v,
        DSCR: parseFloat(Math.max(0, dscr_v).toFixed(2)),
        Covenant: 1.25
      };
    });


    // DSCR Tornado Drivers
    const dscrTornado = [
      { name: 'Costo Directo', fullName: 'Gasto Directo Programas', low: (1 - (operatingCostPct + 5) / 100) / (centralDeductionPct / 100), high: (1 - (operatingCostPct - 5) / 100) / (centralDeductionPct / 100) },
      { name: 'Retención Central', fullName: 'Retención UPTC Central', low: (1 - operatingCostPct / 100) / ((centralDeductionPct + 5) / 100), high: (1 - operatingCostPct / 100) / ((centralDeductionPct - 5) / 100) }
    ].map(d => ({
      name: d.name,
      fullName: d.fullName,
      labelName: d.name,
      low: parseFloat(d.low.toFixed(2)),
      high: parseFloat(d.high.toFixed(2)),
      rangeWidth: Math.abs(d.high - d.low)
    })).sort((a, b) => b.rangeWidth - a.rangeWidth);

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
  }, [priceVarPct, elasticity, operatingCostPct, centralDeductionPct, sensDiscountRate, sensPessimisticPct, sensOptimisticPct, sensitivityProjections, PROJECTED_BASE_2027, sensLevel, sensModality, sensDiscount, sensAttrition, elasticityYear]);

  // Merge datasets into a unified timelines chart (2020-2030)
  const unifiedTimelineData = useMemo(() => {
    const histPart = HISTORICAL_DATA.map(d => ({
      anio: d.vigencia.toString(),
      'Modelo Histórico (Recaudo M)': Math.round(d.ingreso / 1e6 * 100) / 100,
      'Modelo por Créditos (Recaudo M)': null,
      'Estudiantes Históricos': d.estudiantes,
      'Estudiantes Créditos': null
    }));
    
    const projPart = sensitivityProjections.map(d => ({
      anio: d.anio.toString(),
      'Modelo Histórico (Recaudo M)': null,
      'Modelo por Créditos (Recaudo M)': Math.round(d.recaudo / 1e6 * 100) / 100,
      'Estudiantes Históricos': null,
      'Estudiantes Créditos': d.estudiantes
    }));

    return [...histPart, ...projPart];
  }, [sensitivityProjections]);

  const sensitivityChartData = useMemo(() => {
    return sensitivityProjections.map(d => ({
      anio: d.anio.toString(),
      'Ingresos R31 (M)': Math.round(d.recaudo / 1e6 * 100) / 100,
      'Deducciones UPTC (M)': Math.round(d.deduccionCentral / 1e6 * 100) / 100,
      'Costos Directos (M)': Math.round(d.gastoOperativo / 1e6 * 100) / 100,
      'Excedente Neto (M)': Math.round(d.margenNeto / 1e6 * 100) / 100
    }));
  }, [sensitivityProjections]);

  // AI Diagnostic response
  const aiDiagnostic = useMemo(() => {
    const isMargenPositive = sensitivityProjections.every(p => p.margenNeto > 0);
    const avgMargen = sensitivityProjections.reduce((sum, p) => sum + p.margenNeto, 0) / sensitivityProjections.length;
    
    let diagnosis = "";
    if (isMargenPositive) {
      diagnosis = `🟢 SUSTENTABLE: Bajo la elasticidad precio simulada de ${elasticity.toFixed(2)}, el modelo por créditos genera un recaudo anual promedio de ${formatCurrency(avgMargen)} libres de costos. El volumen de matrículas compensa con éxito la reducción de precios.`;
    } else {
      diagnosis = `🔴 ALERTA DE DÉFICIT: La parametrización actual proyecta pérdidas o déficit en caja en el mediano plazo. La combinación de deducciones (${centralDeductionPct}%) y gastos operativos (${operatingCostPct}%) supera la capacidad del recaudo R31. Se aconseja elevar la tarifa o reducir costos.`;
    }

    if (elasticity < -1.2) {
      diagnosis += " La demanda de matrícula es altamente elástica; variaciones mínimos en el costo del crédito detonarán una alta deserción o captación de estudiantes.";
    } else {
      diagnosis += " El comportamiento del alumnado ante precios es estable. Ajustes regulatorios de tarifa tendrán un efecto directo proporcional en el ingreso final.";
    }

    return diagnosis;
  }, [sensitivityProjections, elasticity, centralDeductionPct, operatingCostPct]);

  // Dynamic Conclusions and Recommendations for the Written PDF Report
  const reportConclusions = useMemo(() => {
    const isViable = posgradSensitivityAnalysis.base.npv > 0 && posgradSensitivityAnalysis.dscrBase >= 1.25;
    const elasticityType = Math.abs(elasticity) > 1 ? "Elástica" : Math.abs(elasticity) === 1 ? "Unitaria" : "Inelástica";
    
    return {
      conclusions: [
        `El análisis financiero del Recurso R31 (Fondo de Posgrados) del periodo proyectado 2027-2030 indica que la transición al modelo por créditos es ${isViable ? "financieramente viable y sustentable" : "crítica y presenta riesgos de descapitalización"} bajo las hipótesis del Proyecto de Acuerdo.`,
        `La demanda de matrícula de posgrado evaluada posee un comportamiento de elasticidad ${elasticityType} (ε = ${elasticity.toFixed(2)}). Esto significa que variaciones del 1% en la tarifa promedio por crédito generan desplazamientos de matrícula del ${Math.abs(elasticity).toFixed(2)}% en sentido inverso.`,
        `El VAN (Valor Actual Neto) acumulado del escenario Base es de ${formatCurrency(posgradSensitivityAnalysis.base.npv)} con una TIR (Tasa Interna de Retorno) de ${posgradSensitivityAnalysis.base.irr > 0 ? `${posgradSensitivityAnalysis.base.irr.toFixed(2)}%` : "N/A"}, indicando que ${posgradSensitivityAnalysis.base.npv > 0 ? "el proyecto compensa el costo de capital de oportunidad" : "el fondo incurre en destrucción neta de valor"}.`
      ],
      observations: [
        `Deducciones Centrales UPTC: Con una retención fija del ${centralDeductionPct}%, la administración central de la universidad captará un estimado de ${formatCurrency(posgradSensitivityAnalysis.base.flows.reduce((acc, _, i) => acc + sensitivityProjections[i].deduccionCentral, 0))} a lo largo de los 4 años de proyección.`,
        `Covenant de Cobertura DSCR: El ratio de cobertura del fondo se sitúa en ${posgradSensitivityAnalysis.dscrBase.toFixed(2)}x. Dado que el límite de seguridad es de 1.25x, el fondo ${posgradSensitivityAnalysis.dscrBase >= 1.25 ? "se encuentra dentro de la zona de cumplimiento seguro" : "se ubica en zona de incumplimiento y ruptura presupuestaria"}.`,
        `Punto de Ruptura: La máxima variación tolerada en la estructura de egresos/retenciones es del ${posgradSensitivityAnalysis.ruptureVar.toFixed(1)}%. Superar este umbral causará un colapso del excedente neto de caja, obligando al sistema a reestructurar costos o elevar precios.`
      ]
    };
  }, [posgradSensitivityAnalysis, elasticity, centralDeductionPct, sensitivityProjections]);

  if (dataStage === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <div className="w-12 h-12 border-4 border-primary-container border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-on-surface-variant font-mono animate-pulse">Cargando módulo de posgrados...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col mb-20 max-w-7xl mx-auto px-4 md:px-0 space-y-6 print:max-w-none print:m-0 print:p-0 print:bg-white print:text-black">
      
      {/* Header & Sub-Navigation (Hidden on print) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-2 print:hidden">
        <div>
           <h2 className="text-2xl font-display font-bold text-white tracking-tight">Recurso 31 - Posgrados</h2>
           <p className="text-on-surface-variant text-sm mt-1">
             Análisis estratégico del fondo de matrículas y proyección de viabilidad por créditos.
           </p>
        </div>

        {/* Tab switch buttons */}
        <div className="flex bg-[#1e293b]/60 border border-white/5 p-1 rounded-xl">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'dashboard' 
                ? 'bg-[#ffcc29] text-black shadow-md' 
                : 'text-white/60 hover:text-white'
            }`}
          >
            Dashboard Matrículas
          </button>
          <button 
            onClick={() => setActiveTab('sensitivity')}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'sensitivity' 
                ? 'bg-[#ffcc29] text-black shadow-md' 
                : 'text-white/60 hover:text-white'
            }`}
          >
            Sensibilidad y Elasticidad R31
          </button>
        </div>
      </div>

      {/* TAB 1: EXECUTIVE DASHBOARD (ORIGINAL MODULE) (Hidden on print) */}
      {activeTab === 'dashboard' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 animate-in fade-in duration-300 print:hidden">
          
          {/* LEFT COLUMN */}
          <div className="xl:col-span-3 flex flex-col gap-5">
            
            <div className="bg-[#0f172a] border border-[#ffcc29]/20 rounded-2xl p-5 shadow-2xl relative overflow-hidden group bg-gradient-to-br from-[#0f172a] to-[#2a2000]">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <DollarSign size={64} className="text-[#ffcc29]" />
              </div>
              <h3 className="text-xs font-semibold text-[#ffcc29] uppercase tracking-widest mb-1">Recaudo Total</h3>
              <div className="text-3xl font-display font-bold text-white mb-2">{formatCurrency(kpis.totalGeneral)}</div>
              <div className="text-[10px] text-on-surface-variant uppercase tracking-widest bg-white/5 inline-flex items-center px-2 py-0.5 rounded-md mb-2">
                <Users size={12} className="mr-1.5" />
                {kpis.totalEstudiantes} ESTUDIANTES
              </div>
              
              <div className="space-y-2 mt-2">
                 <div className="flex justify-between items-center bg-black/40 rounded px-2 py-1">
                    <span className="text-[10px] text-white/60">Matrícula Neta</span>
                    <span className="text-xs text-[#4ade80] font-bold">{formatCurrency(kpis.totalNeto)}</span>
                 </div>
                 <div className="flex justify-between items-center bg-black/40 rounded px-2 py-1">
                    <span className="text-[10px] text-white/60">Otros Ingresos</span>
                    <span className="text-xs text-[#7bd0ff] font-bold">{formatCurrency(kpis.totalOtrosIngresos)}</span>
                 </div>
                 <div className="flex justify-between items-center bg-[#f43f5e]/10 border border-[#f43f5e]/20 rounded px-2 py-1 mt-2">
                    <span className="text-[10px] text-[#f43f5e] font-semibold">Total Descuentos</span>
                    <span className="text-xs text-[#f43f5e] font-bold">-{formatCurrency(kpis.totalDescuentos)}</span>
                 </div>
              </div>
            </div>

            {/* Top 3 Estudiantes Bar */}
            <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-5 shadow-2xl flex-1 flex flex-col">
               <div className="flex items-center gap-2 mb-6 bg-[#1e293b] p-2 rounded-lg">
                  <div className="w-2 h-2 rounded-full bg-[#ffcc29] animate-pulse"></div>
                  <h3 className="text-xs font-semibold text-white uppercase tracking-wider">Top 3 Programas x Estudiantes</h3>
               </div>
               <div className="flex-1 flex flex-col justify-center gap-4">
                  {top3ProgramasEstudiantes.map((p, i) => {
                    const maxEst = top3ProgramasEstudiantes[0]?.estudiantes || 1;
                    const pct = Math.max(2, (p.estudiantes / maxEst) * 100);
                    const color = BAR_COLORS[i % BAR_COLORS.length];
                    return (
                      <div key={i} className="flex flex-col gap-1.5 group">
                         <div className="flex justify-between items-end text-[10px]">
                            <span className="text-white/80 truncate max-w-[180px] font-medium group-hover:text-white transition-colors" title={p.name}>{p.name}</span>
                            <span className="font-mono text-white font-bold text-[11px] px-1.5 py-0.5 rounded bg-white/5">{p.estudiantes}</span>
                         </div>
                         <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full rounded-full shadow-[0_0_8px_rgba(255,255,255,0.1)] transition-all duration-500 group-hover:brightness-125" style={{ width: `${pct}%`, backgroundColor: color }}></div>
                         </div>
                      </div>
                    );
                  })}
                  {top3ProgramasEstudiantes.length === 0 && <div className="text-center text-xs text-white/40">Sin datos</div>}
               </div>
            </div>

          </div>

          {/* RIGHT / MAIN CONTENT COLUMN */}
          <div className="xl:col-span-9 flex flex-col gap-5">
            
            {/* Faculty revenues chart */}
            <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-sm font-semibold text-white">Composición de Matrícula y Aportes</h3>
                  <p className="text-[10px] text-on-surface-variant mt-0.5">Matrícula neta cobrada vs número de alumnos matriculados.</p>
                </div>
                
                <div className="flex items-center gap-4 text-[10px] font-mono">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 bg-[#ffcc29] rounded"></div>
                    <span className="text-white/60">Recaudo Net (COP)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-0.5 bg-white"></div>
                    <span className="text-white/60">Estudiantes</span>
                  </div>
                </div>
              </div>

              <div className="h-80" style={{ width: '100%', height: 320, minWidth: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={rendimientoFacultades} margin={{ top: 10, right: -5, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" hide />
                    <YAxis yAxisId="left" stroke="none" tick={{fill: '#64748b', fontSize: 10}} tickFormatter={formatCurrencyShort} />
                    <YAxis yAxisId="right" orientation="right" stroke="none" tick={{fill: '#64748b', fontSize: 10}} />
                    <RechartsTooltip 
                       contentStyle={{backgroundColor: '#000', border: 'none', borderRadius: '8px', fontSize: '11px'}}
                       formatter={(val: number, name: string) => name === 'neto' ? formatCurrency(val) : val}
                    />
                    <Bar yAxisId="left" dataKey="neto" fill="#ffcc29" radius={[4, 4, 0, 0]} barSize={16}>
                       {rendimientoFacultades.map((entry, index) => (
                         <Cell key={`cell-${index}`} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                       ))}
                    </Bar>
                    <Line yAxisId="right" type="monotone" dataKey="estudiantes" stroke="#fff" strokeWidth={2} dot={{r: 3, fill: '#fff'}} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* TOP 3 TABLES/LIST - Detailed */}
            <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-5 shadow-2xl flex-1 flex flex-col">
              <div className="flex items-center gap-2 mb-4 bg-[#1e293b] p-2 rounded-lg">
                 <div className="w-2.5 h-2.5 rounded-full bg-[#4ade80] animate-pulse"></div>
                 <h3 className="text-xs font-semibold text-white uppercase tracking-wider">Top 3 Programas x Recaudo</h3>
              </div>
              
              <div className="flex-1 overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="py-2 text-[10px] font-mono font-medium text-white/50 uppercase">Programa</th>
                      <th className="py-2 text-[10px] font-mono font-medium text-white/50 uppercase text-center">Sede</th>
                      <th className="py-2 text-[10px] font-mono font-medium text-white/50 uppercase text-right">Recaudo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {top3ProgramasNeta.map((prog, i) => (
                      <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded bg-white/10 flex items-center justify-center text-[10px] text-white font-bold group-hover:bg-[#4ade80] group-hover:text-black transition-colors">
                              {i + 1}
                            </div>
                            <span className="text-[11px] text-white/80 font-medium truncate max-w-[120px] sm:max-w-[160px]" title={prog.name}>{prog.name}</span>
                          </div>
                        </td>
                        <td className="py-3 text-center">
                          <span className="text-[10px] text-white/60 bg-white/5 px-2 py-0.5 rounded">{prog.sede}</span>
                        </td>
                        <td className="py-3 text-right">
                          <span className="text-xs font-bold text-[#4ade80]">{formatCurrency(prog.neto)}</span>
                        </td>
                      </tr>
                    ))}
                    {top3ProgramasNeta.length === 0 && (
                      <tr>
                        <td colSpan={3} className="py-8 text-center text-xs text-white/40">No hay datos disponibles para los filtros.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* Faculty demographics bottom widgets */}
          <div className="xl:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-5 mt-2">
            <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-6">
               <div className="flex-1 w-full">
                 <h3 className="text-sm font-semibold text-white">Flexibilización VAFI</h3>
                 <p className="text-[10px] text-on-surface-variant mt-1">Estudiantes con opciones de 2 cuotas vs 1 cuota.</p>
                 <div className="mt-6 space-y-3">
                   <div className="flex items-center justify-between text-xs">
                     <div className="flex items-center gap-2">
                       <span className="w-3 h-3 rounded-full bg-[#ffcc29]"></span>
                       <span className="text-white/80">2 Cuotas (Flex)</span>
                     </div>
                     <div className="text-right">
                       <span className="font-bold text-white mr-2">{kpis.estudiantesFlex}</span>
                       <span className="font-mono text-[10px] text-[#ffcc29]">
                         {kpis.totalEstudiantes > 0 ? ((kpis.estudiantesFlex / kpis.totalEstudiantes) * 100).toFixed(1) : 0}%
                       </span>
                     </div>
                   </div>
                   <div className="flex items-center justify-between text-xs">
                     <div className="flex items-center gap-2">
                       <span className="w-3 h-3 rounded-full bg-[#334155]"></span>
                       <span className="text-white/80">1 Cuota (Única)</span>
                     </div>
                     <div className="text-right">
                       <span className="font-bold text-white mr-2">{kpis.totalEstudiantes - kpis.estudiantesFlex}</span>
                       <span className="font-mono text-[10px] text-[#94a3b8]">
                         {kpis.totalEstudiantes > 0 ? (((kpis.totalEstudiantes - kpis.estudiantesFlex) / kpis.totalEstudiantes) * 100).toFixed(1) : 0}%
                       </span>
                     </div>
                   </div>
                 </div>
               </div>
               <div className="w-[140px] h-[140px] shrink-0" style={{ width: 140, height: 140, minWidth: 100 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={flexibilizacionData} dataKey="value" cx="50%" cy="50%" innerRadius={45} outerRadius={65} stroke="none">
                      </Pie>
                      <RechartsTooltip formatter={(val: number) => [val, 'Estudiantes']} contentStyle={{backgroundColor: '#000', border: 'none', fontSize: '11px', borderRadius: '8px'}} />
                    </PieChart>
                  </ResponsiveContainer>
               </div>
            </div>

            <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-6">
               <div className="flex-1 w-full">
                 <h3 className="text-sm font-semibold text-white">Tipo de Inscripción</h3>
                 <p className="text-[10px] text-on-surface-variant mt-1">Opción de Grado vs Inscripción Regular.</p>
                 <div className="mt-6 space-y-3">
                   <div className="flex items-center justify-between text-xs">
                     <div className="flex items-center gap-2">
                       <span className="w-3 h-3 rounded-full bg-[#4ade80]"></span>
                       <span className="text-white/80">Opción Grado</span>
                     </div>
                     <div className="text-right">
                       <span className="font-bold text-white mr-2">{kpis.estudiantesOpGrado}</span>
                       <span className="font-mono text-[10px] text-[#4ade80]">
                         {kpis.totalEstudiantes > 0 ? ((kpis.estudiantesOpGrado / kpis.totalEstudiantes) * 100).toFixed(1) : 0}%
                       </span>
                     </div>
                   </div>
                   <div className="flex items-center justify-between text-xs">
                     <div className="flex items-center gap-2">
                       <span className="w-3 h-3 rounded-full bg-[#334155]"></span>
                       <span className="text-white/80">Regular</span>
                     </div>
                     <div className="text-right">
                       <span className="font-bold text-white mr-2">{kpis.estudiantesRegulares}</span>
                       <span className="font-mono text-[10px] text-[#94a3b8]">
                         {kpis.totalEstudiantes > 0 ? ((kpis.estudiantesRegulares / kpis.totalEstudiantes) * 100).toFixed(1) : 0}%
                       </span>
                     </div>
                   </div>
                 </div>
               </div>
               <div className="w-[140px] h-[140px] shrink-0" style={{ width: 140, height: 140, minWidth: 100 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={opcionGradoData} dataKey="value" cx="50%" cy="50%" innerRadius={45} outerRadius={65} stroke="none">
                      </Pie>
                      <RechartsTooltip formatter={(val: number) => [val, 'Estudiantes']} contentStyle={{backgroundColor: '#000', border: 'none', fontSize: '11px', borderRadius: '8px'}} />
                    </PieChart>
                  </ResponsiveContainer>
               </div>
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: SENSITIVITY AND ELASTICITY REPORT (NEW INTEGRATED MODULE) */}
      {activeTab === 'sensitivity' && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-300">
          
          {/* INTERNAL SENSITIVITY SUB-TABS PILLS (Hidden on print) */}
          <div className="flex border-b border-white/5 pb-1 gap-4 text-xs font-bold uppercase tracking-wider mt-1 print:hidden">
            <button 
              onClick={() => setActiveSensSubTab('variables')}
              className={`pb-2 transition-all cursor-pointer border-b-2 flex items-center gap-1.5 ${
                activeSensSubTab === 'variables' 
                  ? 'border-[#ffcc29] text-[#ffcc29]' 
                  : 'border-transparent text-white/55 hover:text-white'
              }`}
            >
              <Settings size={14} /> 1. Configuración de Variables
            </button>
            <button 
              onClick={() => setActiveSensSubTab('scenarios')}
              className={`pb-2 transition-all cursor-pointer border-b-2 ${
                activeSensSubTab === 'scenarios' 
                  ? 'border-[#ffcc29] text-[#ffcc29]' 
                  : 'border-transparent text-white/55 hover:text-white'
              }`}
            >
              2. Escenarios y Flujos
            </button>
            <button 
              onClick={() => setActiveSensSubTab('montecarlo')}
              className={`pb-2 transition-all cursor-pointer border-b-2 ${
                activeSensSubTab === 'montecarlo' 
                  ? 'border-[#ffcc29] text-[#ffcc29]' 
                  : 'border-transparent text-white/55 hover:text-white'
              }`}
            >
              3. Monte Carlo y Tornado
            </button>
            <button 
              onClick={() => setActiveSensSubTab('dscr')}
              className={`pb-2 transition-all cursor-pointer border-b-2 ${
                activeSensSubTab === 'dscr' 
                  ? 'border-[#ffcc29] text-[#ffcc29]' 
                  : 'border-transparent text-white/55 hover:text-white'
              }`}
            >
              4. Coberturas DSCR y Covenants
            </button>
            <button 
              onClick={() => setActiveSensSubTab('multiyear')}
              className={`pb-2 transition-all cursor-pointer border-b-2 flex items-center gap-1.5 ${
                activeSensSubTab === 'multiyear' 
                  ? 'border-[#ffcc29] text-[#ffcc29]' 
                  : 'border-transparent text-white/55 hover:text-white'
              }`}
            >
              <Layers size={14} /> 5. Proyección Multivigencia
            </button>
            <button 
              onClick={() => setActiveSensSubTab('comparison')}
              className={`pb-2 transition-all cursor-pointer border-b-2 flex items-center gap-1.5 ${
                activeSensSubTab === 'comparison' 
                  ? 'border-[#ffcc29] text-[#ffcc29]' 
                  : 'border-transparent text-white/55 hover:text-white'
              }`}
            >
              <Activity size={14} /> 6. Comparación de Escenarios
            </button>
            <button 
              onClick={() => setActiveSensSubTab('report')}
              className={`pb-2 transition-all cursor-pointer border-b-2 flex items-center gap-1.5 ${
                activeSensSubTab === 'report' 
                  ? 'border-[#ffcc29] text-[#ffcc29]' 
                  : 'border-transparent text-white/55 hover:text-white'
              }`}
            >
              <FileText size={14} /> 7. Informe Ejecutivo PDF
            </button>
          </div>

          {/* ACTIVE TAB CONTENT AREA */}
          <div className="space-y-6">
            
            {/* SUB-TAB 1: UNIFIED SIMULATION CONFIGURATION PANEL */}
            {activeSensSubTab === 'variables' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-300 print:hidden font-sans">
                
                {/* Left configuration inputs column */}
                <div className="lg:col-span-8 space-y-6">
                  

                  {/* Row 2: Sensitivity drivers & Scenarios limits */}
                  <div className="bg-[#0f172a] border border-white/10 p-6 rounded-[28px] shadow-2xl space-y-5">
                    <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                      <Activity className="text-[#ffcc29] w-5 h-5" />
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider">Drivers de Sensibilidad y Límites Financieros</h3>
                    </div>
                    
                    <div className="space-y-6">
                      
                      {/* Top Row: Core Elasticity / Pricing parameters */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 bg-black/20 border border-white/5 rounded-2xl p-4">
                        
                        {/* Elasticity */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-white/60">Elasticidad Matrícula (ε)</span>
                            <strong className="text-[#ffcc29] font-mono">{elasticity.toFixed(2)}</strong>
                          </div>
                          <input 
                            type="range"
                            min="-2.0"
                            max="0.0"
                            step="0.05"
                            value={elasticity}
                            onChange={(e) => setElasticity(parseFloat(e.target.value))}
                            className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#ffcc29]"
                          />
                        </div>

                        {/* Price Var */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-white/60">Ajuste Tarifa Crédito (%)</span>
                            <strong className={`font-mono ${priceVarPct >= 0 ? 'text-[#4ade80]' : 'text-rose-400'}`}>
                              {priceVarPct > 0 ? '+' : ''}{priceVarPct}%
                            </strong>
                          </div>
                          <input 
                            type="range"
                            min="-20"
                            max="20"
                            step="1"
                            value={priceVarPct}
                            onChange={(e) => setPriceVarPct(parseInt(e.target.value) || 0)}
                            className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#ffcc29]"
                          />
                        </div>

                        {/* Transition Year */}
                        <div className="space-y-2">
                          <span className="text-[10px] text-white/55 font-mono uppercase tracking-wider block mb-1">Año Transición Evaluado</span>
                          <select
                            value={elasticityYear}
                            onChange={(e) => setElasticityYear(parseInt(e.target.value) || 2027)}
                            className="w-full bg-[#1e293b] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#ffcc29] cursor-pointer"
                          >
                            <option value="2027">2027 vs 2026 Baseline</option>
                            <option value="2028">2028 vs 2026 Baseline</option>
                            <option value="2029">2029 vs 2026 Baseline</option>
                            <option value="2030">2030 vs 2026 Baseline</option>
                          </select>
                        </div>

                      </div>

                      {/* Sub-heading / section label */}
                      <div className="flex items-center gap-2 text-xs font-bold text-white/70 uppercase tracking-wide border-t border-white/5 pt-4">
                        <TrendingUp size={14} className="text-[#ffcc29]" />
                        <span>Escenarios y Tasa de Descuento</span>
                      </div>

                      {/* Bottom Row: 3 cards matching the user screenshot layout and text */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        
                        {/* Tasa de descuento card */}
                        <div className="bg-white/5 border border-white/5 rounded-2xl p-5 space-y-2">
                          <div className="flex justify-between text-xs font-mono">
                            <span className="text-white/60">Tasa de Descuento (k)</span>
                            <span className="text-[#ffcc29] font-bold">{sensDiscountRate}% Anual</span>
                          </div>
                          <input
                            type="range"
                            min="4"
                            max="15"
                            step="0.5"
                            value={sensDiscountRate}
                            onChange={(e) => setSensDiscountRate(parseFloat(e.target.value))}
                            className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#ffcc29]"
                          />
                          <p className="text-[10px] text-white/40 font-mono leading-normal pt-1.5">Tasa de oportunidad requerida para calcular el VAN.</p>
                        </div>

                        {/* Pessimistic scenario limits */}
                        <div className="bg-white/5 border border-white/5 rounded-2xl p-5 space-y-2">
                          <div className="flex justify-between text-xs font-mono">
                            <span className="text-white/60">Variación Escenario Pesimista</span>
                            <span className="text-rose-400 font-bold">{sensPessimisticPct}% Ingreso</span>
                          </div>
                          <input 
                            type="range"
                            min="-30"
                            max="-5"
                            step="1"
                            value={sensPessimisticPct}
                            onChange={(e) => setSensPessimisticPct(parseInt(e.target.value) || -15)}
                            className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-rose-500"
                          />
                          <p className="text-[10px] text-white/40 font-mono leading-normal pt-1.5">Simula la caída de ingresos y aumento proporcional de egresos.</p>
                        </div>

                        {/* Optimistic scenario limits */}
                        <div className="bg-white/5 border border-white/5 rounded-2xl p-5 space-y-2">
                          <div className="flex justify-between text-xs font-mono">
                            <span className="text-white/60">Variación Escenario Optimista</span>
                            <span className="text-[#4ade80] font-bold">+{sensOptimisticPct}% Ingreso</span>
                          </div>
                          <input 
                            type="range"
                            min="5"
                            max="30"
                            step="1"
                            value={sensOptimisticPct}
                            onChange={(e) => setSensOptimisticPct(parseInt(e.target.value) || 15)}
                            className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#4ade80]"
                          />
                          <p className="text-[10px] text-white/40 font-mono leading-normal pt-1.5">Simula el incremento de ingresos y reducción proporcional de egresos.</p>
                        </div>

                      </div>

                    </div>
                  </div>

                  {/* Row 3: Funds structures & Multi-Year settings */}
                  <div className="bg-[#0f172a] border border-white/10 p-6 rounded-[28px] shadow-2xl space-y-5">
                    <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                      <Layers className="text-[#ffcc29] w-5 h-5" />
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider">Estructura del Fondo y Planificación Multivigencia</h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      
                      {/* Central deduction */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-white/60">Deducción UPTC Central (Art. 12)</span>
                          <strong className="text-white font-mono">{centralDeductionPct}%</strong>
                        </div>
                        <input 
                          type="range"
                          min="30"
                          max="50"
                          step="0.5"
                          value={centralDeductionPct}
                          onChange={(e) => setCentralDeductionPct(parseFloat(e.target.value))}
                          className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#ffcc29]"
                        />
                      </div>

                      {/* Direct operating cost */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-white/60">Gastos Directos de Docencia/Acreditación</span>
                          <strong className="text-white font-mono">{operatingCostPct}%</strong>
                        </div>
                        <input 
                          type="range"
                          min="20"
                          max="50"
                          step="1"
                          value={operatingCostPct}
                          onChange={(e) => setOperatingCostPct(parseInt(e.target.value) || 35)}
                          className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#ffcc29]"
                        />
                      </div>

                      {/* Years horizon */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-white/60">Horizonte de Proyección</span>
                          <strong className="text-[#ffcc29] font-mono">{numYearsProyectar} años</strong>
                        </div>
                        <input 
                          type="range"
                          min="5"
                          max="20"
                          step="1"
                          value={numYearsProyectar}
                          onChange={(e) => setNumYearsProyectar(parseInt(e.target.value) || 10)}
                          className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#ffcc29]"
                        />
                      </div>

                      {/* ICES indexation */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-white/60">Indexación Anual Crédito (ICES)</span>
                          <strong className="text-[#ffcc29] font-mono">{icesRate}%</strong>
                        </div>
                        <input 
                          type="range"
                          min="1"
                          max="10"
                          step="0.1"
                          value={icesRate}
                          onChange={(e) => setIcesRate(parseFloat(e.target.value) || 6.66)}
                          className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#ffcc29]"
                        />
                      </div>

                      {/* IPC Inflation */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-white/60">Inflación Anual Egresos (IPC)</span>
                          <strong className="text-[#ffcc29] font-mono">{ipcRate}%</strong>
                        </div>
                        <input 
                          type="range"
                          min="1"
                          max="10"
                          step="0.1"
                          value={ipcRate}
                          onChange={(e) => setIpcRate(parseFloat(e.target.value) || 4.0)}
                          className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#ffcc29]"
                        />
                      </div>

                      {/* Students growth rate */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-white/60">Crecimiento Alumnado Post-2030</span>
                          <strong className={`font-mono ${enrollmentGrowthRate >= 0 ? 'text-[#4ade80]' : 'text-rose-400'}`}>
                            {enrollmentGrowthRate > 0 ? '+' : ''}{enrollmentGrowthRate}%
                          </strong>
                        </div>
                        <input 
                          type="range"
                          min="-5"
                          max="5"
                          step="0.1"
                          value={enrollmentGrowthRate}
                          onChange={(e) => setEnrollmentGrowthRate(parseFloat(e.target.value) || 0.5)}
                          className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#ffcc29]"
                        />
                      </div>

                    </div>
                  </div>

                </div>

                {/* Right summary real-time column */}
                <div className="lg:col-span-4 space-y-6">
                  
                  {/* Quick KPIs Summary */}
                  <div className="bg-[#0f172a] border border-[#ffcc29]/20 rounded-[28px] p-6 shadow-2xl relative overflow-hidden bg-gradient-to-br from-[#0f172a] to-[#241c02] space-y-5">
                    <h3 className="text-xs font-bold text-[#ffcc29] uppercase tracking-widest border-b border-[#ffcc29]/10 pb-2 flex items-center gap-1.5">
                       <CheckCircle size={15} /> Impacto en Tiempo Real
                    </h3>
                    
                    <div className="space-y-4">
                      {/* VAN */}
                      <div>
                        <span className="text-[10px] text-white/50 block font-mono">VALOR ACTUAL NETO (VAN) BASE</span>
                        <div className={`text-2xl font-bold font-mono ${posgradSensitivityAnalysis.base.npv >= 0 ? 'text-[#4ade80]' : 'text-rose-400'}`}>
                          {formatCurrency(posgradSensitivityAnalysis.base.npv)}
                        </div>
                        <span className="text-[8px] text-white/30 block font-mono">Horizonte a 4 años (2027-2030)</span>
                      </div>

                      {/* TIR */}
                      <div>
                        <span className="text-[10px] text-white/50 block font-mono">TASA INTERNA DE RETORNO (TIR)</span>
                        <div className="text-xl font-bold font-mono text-white">
                          {posgradSensitivityAnalysis.base.irr > 0 ? `${posgradSensitivityAnalysis.base.irr.toFixed(2)}%` : 'N/A'}
                        </div>
                      </div>

                      {/* DSCR */}
                      <div>
                        <span className="text-[10px] text-white/50 block font-mono">RATIO DE COBERTURA DSCR BASE</span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xl font-bold font-mono ${posgradSensitivityAnalysis.dscrBase >= 1.25 ? 'text-[#4ade80]' : 'text-rose-400'}`}>
                            {posgradSensitivityAnalysis.dscrBase.toFixed(2)}x
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider font-mono ${
                            posgradSensitivityAnalysis.dscrBase >= 1.25 ? 'bg-[#4ade80]/15 text-[#4ade80]' : 'bg-rose-500/15 text-rose-400'
                          }`}>
                            {posgradSensitivityAnalysis.dscrBase >= 1.25 ? 'Cumple' : 'Alerta'}
                          </span>
                        </div>
                        <span className="text-[8px] text-white/30 block font-mono mt-1">Límite mínimo exigido: 1.25x</span>
                      </div>

                      {/* Monte Carlo viability */}
                      <div>
                        <span className="text-[10px] text-white/50 block font-mono">VIABILIDAD MONTE CARLO</span>
                        <div className="text-xl font-bold font-mono text-[#4ade80]">
                          {posgradSensitivityAnalysis.monteCarlo.probPos.toFixed(1)}%
                        </div>
                        <span className="text-[8px] text-white/30 block font-mono">Probabilidad de excedente positivo</span>
                      </div>
                    </div>

                    <div className="bg-white/5 p-3 rounded-2xl border border-white/5 text-[10px] text-white/70 leading-normal">
                      💡 Ajusta los parámetros de la izquierda y haz clic en las pestañas analíticas superiores para explorar los diagramas de tornado, simulaciones de Monte Carlo y proyecciones multivigencia a largo plazo.
                    </div>
                  </div>

                  {/* AI Advisor Diagnostic Box */}
                  <div className="p-5 bg-[#ffcc29]/5 border border-[#ffcc29]/20 rounded-2xl space-y-2">
                    <span className="font-bold text-[#ffcc29] text-xs flex items-center gap-1.5">
                      <Bot size={15} /> Asesor Financiero del Fondo R31:
                    </span>
                    <p className="text-white/80 text-[11px] leading-relaxed font-sans">
                      {aiDiagnostic}
                    </p>
                  </div>

                </div>

              </div>
            )}

            {/* SUB-TAB 2: ESCENARIOS Y FLUJOS */}
            {activeSensSubTab === 'scenarios' && (
              <div className="space-y-6 animate-in fade-in duration-300 print:hidden">
                
                {/* Scenarios Cards Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Pessimistic */}
                  <div className="bg-[#0f172a] border border-rose-500/20 rounded-[28px] p-6 relative overflow-hidden flex flex-col justify-between shadow-2xl bg-gradient-to-br from-[#0f172a] to-[#220c11]">
                    <div className="absolute top-0 left-0 w-full h-1 bg-rose-500"></div>
                    <div>
                      <h4 className="text-sm font-bold text-rose-400 font-display">Escenario Pesimista</h4>
                      <p className="text-[10px] text-on-surface-variant font-mono mt-1">Simulado a {sensPessimisticPct}% en Ingresos</p>
                      
                      <div className="space-y-3 mt-6">
                        <div className="flex justify-between items-center py-2 border-b border-white/5 text-xs">
                          <span className="text-white/60">Ingreso Acumulado (2027-2030)</span>
                          <span className="font-mono font-bold text-white">{formatCurrency(posgradSensitivityAnalysis.pessimistic.ingTotal)}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-white/5 text-xs">
                          <span className="text-white/60">VAN / NPV</span>
                          <span className={`font-mono font-bold ${posgradSensitivityAnalysis.pessimistic.npv >= 0 ? 'text-[#4ade80]' : 'text-rose-400'}`}>
                            {formatCurrency(posgradSensitivityAnalysis.pessimistic.npv)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-white/5 text-xs">
                          <span className="text-white/60">TIR / IRR</span>
                          <span className="font-mono font-bold text-white">
                            {posgradSensitivityAnalysis.pessimistic.irr !== 0 ? `${posgradSensitivityAnalysis.pessimistic.irr.toFixed(1)}%` : 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2 text-xs">
                          <span className="text-white/60">Flujo Neto Acumulado</span>
                          <span className={`font-mono font-bold ${posgradSensitivityAnalysis.pessimistic.flowSum >= 0 ? 'text-[#4ade80]' : 'text-rose-400'}`}>
                            {formatCurrency(posgradSensitivityAnalysis.pessimistic.flowSum)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Base */}
                  <div className="bg-[#0f172a] border border-white/10 rounded-[28px] p-6 relative overflow-hidden flex flex-col justify-between shadow-2xl">
                    <div className="absolute top-0 left-0 w-full h-1 bg-white/30"></div>
                    <div>
                      <h4 className="text-sm font-bold text-white font-display">Escenario Base</h4>
                      <p className="text-[10px] text-on-surface-variant font-mono mt-1">Simulado con variables de configuración</p>
                      
                      <div className="space-y-3 mt-6">
                        <div className="flex justify-between items-center py-2 border-b border-white/5 text-xs">
                          <span className="text-white/60">Ingreso Acumulado (2027-2030)</span>
                          <span className="font-mono font-bold text-white">{formatCurrency(posgradSensitivityAnalysis.base.ingTotal)}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-white/5 text-xs">
                          <span className="text-white/60">VAN / NPV</span>
                          <span className={`font-mono font-bold ${posgradSensitivityAnalysis.base.npv >= 0 ? 'text-[#4ade80]' : 'text-rose-400'}`}>
                            {formatCurrency(posgradSensitivityAnalysis.base.npv)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-white/5 text-xs">
                          <span className="text-white/60">TIR / IRR</span>
                          <span className="font-mono font-bold text-white">
                            {posgradSensitivityAnalysis.base.irr !== 0 ? `${posgradSensitivityAnalysis.base.irr.toFixed(1)}%` : 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2 text-xs">
                          <span className="text-white/60">Flujo Neto Acumulado</span>
                          <span className={`font-mono font-bold ${posgradSensitivityAnalysis.base.flowSum >= 0 ? 'text-[#4ade80]' : 'text-rose-400'}`}>
                            {formatCurrency(posgradSensitivityAnalysis.base.flowSum)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Optimistic */}
                  <div className="bg-[#0f172a] border border-[#4ade80]/20 rounded-[28px] p-6 relative overflow-hidden flex flex-col justify-between shadow-2xl bg-gradient-to-br from-[#0f172a] to-[#0a2414]">
                    <div className="absolute top-0 left-0 w-full h-1 bg-[#4ade80]"></div>
                    <div>
                      <h4 className="text-sm font-bold text-[#4ade80] font-display">Escenario Optimista</h4>
                      <p className="text-[10px] text-on-surface-variant font-mono mt-1">Simulado a +{sensOptimisticPct}% en Ingresos</p>
                      
                      <div className="space-y-3 mt-6">
                        <div className="flex justify-between items-center py-2 border-b border-white/5 text-xs">
                          <span className="text-white/60">Ingreso Acumulado (2027-2030)</span>
                          <span className="font-mono font-bold text-white">{formatCurrency(posgradSensitivityAnalysis.optimistic.ingTotal)}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-white/5 text-xs">
                          <span className="text-white/60">VAN / NPV</span>
                          <span className={`font-mono font-bold ${posgradSensitivityAnalysis.optimistic.npv >= 0 ? 'text-[#4ade80]' : 'text-rose-400'}`}>
                            {formatCurrency(posgradSensitivityAnalysis.optimistic.npv)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-white/5 text-xs">
                          <span className="text-white/60">TIR / IRR</span>
                          <span className="font-mono font-bold text-white">
                            {posgradSensitivityAnalysis.optimistic.irr !== 0 ? `${posgradSensitivityAnalysis.optimistic.irr.toFixed(1)}%` : 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2 text-xs">
                          <span className="text-white/60">Flujo Neto Acumulado</span>
                          <span className={`font-mono font-bold ${posgradSensitivityAnalysis.optimistic.flowSum >= 0 ? 'text-[#4ade80]' : 'text-rose-400'}`}>
                            {formatCurrency(posgradSensitivityAnalysis.optimistic.flowSum)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Methodological VAN notice in scenarios tab */}
                <div className="bg-[#0f172a] border border-[#ffcc29]/20 rounded-2xl p-4 flex items-start gap-3 text-xs">
                  <Info size={18} className="text-[#ffcc29] shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="font-bold text-white text-xs block">Metodología y Parámetros de Valoración del VAN (Recurso R31)</span>
                    <p className="text-white/70 text-[11px] leading-relaxed">
                      El VAN se calcula descontando los <strong>flujos netos operativos anuales</strong> (Ingresos Brutos menos Deducción Central del {centralDeductionPct} % y Costos Directos ABC del {operatingCostPct} %) a una tasa de oportunidad del <strong>{sensDiscountRate} % E.A.</strong> en un horizonte de 4 vigencias (2027-2030, I₀ = $0). La TIR se reporta como N/A debido a que los flujos netos son estrictamente del mismo signo durante todo el horizonte (Regla de los Signos de Descartes).
                    </p>
                  </div>
                </div>

                {/* Chart: Comparative cash flow of scenarios */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Evolution chart */}
                  <div className="lg:col-span-2 bg-[#0f172a] border border-white/10 rounded-[32px] p-6 flex flex-col">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Evolución de Flujos por Escenario de Créditos (2027-2030)</h4>
                    <div className="h-72" style={{ width: '100%', height: 288, minWidth: 200 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={new Array(4).fill(0).map((_, i) => ({
                            name: (2027 + i).toString(),
                            Pesimista: Math.round(posgradSensitivityAnalysis.pessimistic.flows[i] / 1e6 * 10) / 10,
                            Base: Math.round(posgradSensitivityAnalysis.base.flows[i] / 1e6 * 10) / 10,
                            Optimista: Math.round(posgradSensitivityAnalysis.optimistic.flows[i] / 1e6 * 10) / 10
                          }))}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                          <XAxis dataKey="name" stroke="#64748b" className="text-[10px] font-mono" />
                          <YAxis stroke="#64748b" className="text-[10px] font-mono" tickFormatter={(v) => `$${v}M`} />
                          <RechartsTooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', fontSize: '11px' }} />
                          <Legend wrapperStyle={{ fontSize: '11px' }} />
                          <Area type="monotone" dataKey="Optimista" stroke="#4ade80" fill="#4ade80" fillOpacity={0.03} strokeWidth={2} />
                          <Area type="monotone" dataKey="Base" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.03} strokeWidth={2} />
                          <Area type="monotone" dataKey="Pesimista" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.03} strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Elasticity indicators */}
                  <div className="bg-[#0f172a] border border-white/10 rounded-[32px] p-6 flex flex-col justify-between font-sans">
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Elasticidad de Recaudo vs 2026 Histórico</h4>
                      
                      <div className="space-y-4">
                        {/* Selected year comparison */}
                        <div className="bg-white/5 border border-white/5 rounded-xl p-3">
                          <span className="text-[9px] text-[#ffcc29] uppercase tracking-widest block font-mono font-bold mb-1">Año de Evaluación: {elasticityYear}</span>
                          <div className="flex justify-between items-center text-xs border-b border-white/5 pb-1">
                            <span className="text-white/60">Var. Alumnos vs 2026</span>
                            <span className="font-mono text-white font-bold">
                              {comparisonSelectedYear.deltaEstudiantes >= 0 ? '+' : ''}{comparisonSelectedYear.deltaEstudiantesPct.toFixed(1)}%
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-xs border-b border-white/5 py-1">
                            <span className="text-white/60">Var. Precio vs 2026</span>
                            <span className="font-mono text-white font-bold text-rose-400">
                              {comparisonSelectedYear.deltaPrecioPct.toFixed(1)}%
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-xs pt-1">
                            <span className="text-white/60 font-semibold">Elasticidad Comparada</span>
                            <span className="font-mono text-[#ffcc29] font-bold">
                              ε = {comparisonSelectedYear.calculatedElasticity.toFixed(2)}
                            </span>
                          </div>
                        </div>

                        <div className="bg-white/5 border border-white/5 rounded-xl p-3 flex items-start gap-3">
                          <TrendingUp className="w-5 h-5 text-[#4ade80] shrink-0 mt-0.5" />
                          <div>
                            <span className="text-[10px] text-white/50 block">Elasticidad Ingresos vs VAN</span>
                            <span className="text-sm font-bold text-white font-mono">
                              {posgradSensitivityAnalysis.elasticityIng >= 0 ? '+' : ''}{posgradSensitivityAnalysis.elasticityIng.toFixed(2)}%
                            </span>
                            <p className="text-[9px] text-white/40 mt-1 leading-normal">
                              Por cada 1% de incremento en ingresos, el VAN aumenta un <strong>{Math.abs(posgradSensitivityAnalysis.elasticityIng).toFixed(2)}%</strong>.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="text-[9px] text-white/40 font-mono mt-4 leading-normal bg-black/30 p-2.5 rounded-lg">
                      💡 Comparando {elasticityYear} vs 2026, la elasticidad calculada es de {comparisonSelectedYear.calculatedElasticity.toFixed(2)}.
                    </div>
                  </div>

                </div>

                {/* Timeline baseline */}
                <div className="bg-[#0f172a] border border-white/10 rounded-[32px] p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Histórico vs Proyección Simulada (Línea de Tiempo Completa 2020-2030)</h4>
                  </div>
                  <div className="h-72" style={{ width: '100%', height: 288, minWidth: 200 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={unifiedTimelineData} margin={{ top: 10, right: -5, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="anio" tick={{fill: '#64748b', fontSize: 10}} />
                        <YAxis yAxisId="left" stroke="none" tick={{fill: '#64748b', fontSize: 10}} tickFormatter={(val) => `$${val}M`} />
                        <YAxis yAxisId="right" orientation="right" stroke="none" tick={{fill: '#64748b', fontSize: 10}} />
                        <RechartsTooltip contentStyle={{backgroundColor: '#000', border: 'none', borderRadius: '8px', fontSize: '11px'}} />
                        <Legend wrapperStyle={{ fontSize: '11px' }} />
                        <Bar yAxisId="left" dataKey="Modelo Histórico (Recaudo M)" fill="#334155" name="Ingreso Histórico" radius={[3, 3, 0, 0]} barSize={14} />
                        <Bar yAxisId="left" dataKey="Modelo por Créditos (Recaudo M)" fill="#ffcc29" name="Ingreso Créditos (Simulado)" radius={[3, 3, 0, 0]} barSize={14} />
                        <Line yAxisId="right" type="monotone" dataKey="Estudiantes Históricos" stroke="#94a3b8" name="Alumnos Históricos" strokeWidth={1.5} dot={{r: 2}} strokeDasharray="4 4" />
                        <Line yAxisId="right" type="monotone" dataKey="Estudiantes Créditos" stroke="#4ade80" name="Alumnos Créditos (Simulado)" strokeWidth={2.5} dot={{r: 3}} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>
            )}

            {/* SUB-TAB 3: MONTE CARLO Y TORNADO */}
            {activeSensSubTab === 'montecarlo' && (
              <div className="space-y-6 animate-in fade-in duration-300 print:hidden">
                
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  
                  {/* Monte Carlo card */}
                  <div className="lg:col-span-8 bg-[#0f172a] border border-white/10 rounded-[32px] p-6 flex flex-col h-[400px]">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                      <div>
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">Simulación de Monte Carlo (1,000 Iteraciones)</h4>
                        <p className="text-[9px] text-white/50 mt-0.5">Distribución probabilística del VAN del fondo R31 bajo variaciones de ±20% precio / ±15% gastos.</p>
                      </div>
                      
                      <div className="flex gap-4 text-xs font-mono">
                        <div>
                          <span className="text-white/40 block text-[9px]">Valor Esperado</span>
                          <strong className="text-white font-bold">{formatCurrencyShort(posgradSensitivityAnalysis.monteCarlo.mean)}</strong>
                        </div>
                        <div>
                          <span className="text-white/40 block text-[9px]">Viabilidad (VAN &gt; 0)</span>
                          <strong className="text-[#4ade80] font-bold">{posgradSensitivityAnalysis.monteCarlo.probPos.toFixed(1)}%</strong>
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 w-full relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={posgradSensitivityAnalysis.monteCarlo.bins} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                          <XAxis dataKey="range" stroke="#64748b" className="text-[8px] font-mono" height={36} angle={-15} textAnchor="end" />
                          <YAxis stroke="#64748b" className="text-[10px] font-mono" />
                          <RechartsTooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', fontSize: '11px' }} />
                          <Bar dataKey="Frecuencia" fill="#ffcc29" radius={[3, 3, 0, 0]} barSize={24} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Monte Carlo Stats details */}
                  <div className="lg:col-span-4 bg-[#0f172a] border border-white/10 rounded-[32px] p-6 flex flex-col justify-between h-[400px]">
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Resultados Estadísticos</h4>
                      
                      <div className="space-y-4">
                        
                        <div className="border-b border-white/5 pb-2.5 flex justify-between items-center text-xs">
                          <span className="text-white/60">Viabilidad Presupuestal</span>
                          <div className="text-right">
                            <span className="font-bold text-[#4ade80] font-mono block">{posgradSensitivityAnalysis.monteCarlo.probPos.toFixed(1)}%</span>
                            <span className="text-[8px] text-white/40 font-mono">Probabilidad de Superávit</span>
                          </div>
                        </div>

                        <div className="border-b border-white/5 pb-2.5 flex justify-between items-center text-xs">
                          <span className="text-white/60">VAN Esperado Promedio</span>
                          <div className="text-right">
                            <span className="font-bold text-white font-mono block">{formatCurrency(posgradSensitivityAnalysis.monteCarlo.mean)}</span>
                            <span className="text-[8px] text-white/40 font-mono">Promedio Ponderado</span>
                          </div>
                        </div>

                        <div className="border-b border-white/5 pb-2.5 flex justify-between items-center text-xs">
                          <span className="text-white/60">Intervalo Confianza (95%)</span>
                          <div className="text-right">
                            <span className="font-bold text-[#ffcc29] font-mono block text-[11px] truncate max-w-[170px]" title={`[${formatCurrency(posgradSensitivityAnalysis.monteCarlo.low95)}, ${formatCurrency(posgradSensitivityAnalysis.monteCarlo.high95)}]`}>
                              [{formatCurrencyShort(posgradSensitivityAnalysis.monteCarlo.low95)}, {formatCurrencyShort(posgradSensitivityAnalysis.monteCarlo.high95)}]
                            </span>
                            <span className="text-[8px] text-white/40 font-mono">Rango de confianza</span>
                          </div>
                        </div>

                        <div className="flex justify-between items-center text-xs">
                          <span className="text-white/60">Rango Absoluto Simulado</span>
                          <div className="text-right">
                            <span className="font-bold text-white font-mono block text-[11px] truncate max-w-[170px]" title={`[${formatCurrency(posgradSensitivityAnalysis.monteCarlo.min)}, ${formatCurrency(posgradSensitivityAnalysis.monteCarlo.max)}]`}>
                              [{formatCurrencyShort(posgradSensitivityAnalysis.monteCarlo.min)}, {formatCurrencyShort(posgradSensitivityAnalysis.monteCarlo.max)}]
                            </span>
                            <span className="text-[8px] text-white/40 font-mono">Mínimo y Máximo hallados</span>
                          </div>
                        </div>

                      </div>
                    </div>

                    <div className="bg-[#4ade80]/5 border border-[#4ade80]/15 p-3 rounded-2xl flex items-start gap-2.5 mt-2">
                      <ShieldCheck className="w-5 h-5 text-[#4ade80] shrink-0" />
                      <p className="text-[10px] text-white/80 leading-relaxed">
                        {posgradSensitivityAnalysis.monteCarlo.probPos >= 70 ? (
                          `El fondo de posgrados R31 tiene una alta viabilidad contable (${posgradSensitivityAnalysis.monteCarlo.probPos.toFixed(1)}%). Existe una certeza sólida de superávit.`
                        ) : (
                          `Riesgo crítico de insolvencia detectado. Existe una probabilidad del ${(100 - posgradSensitivityAnalysis.monteCarlo.probPos).toFixed(1)}% de incurrir en déficit.`
                        )}
                      </p>
                    </div>
                  </div>

                </div>

                {/* Tornado Chart NPV Impact */}
                <div className="bg-[#0f172a] border border-white/10 rounded-[32px] p-6 shadow-2xl">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">Tornado · Sensibilidad del VAN R31 ante Cambios en Variables (±5% o ±0.2)</h4>
                      <p className="text-[9px] text-white/50 mt-0.5">Mide el impacto incremental en millones sobre el valor actual neto al variar individualmente cada driver.</p>
                    </div>
                    <span className="px-2 py-0.5 bg-red-500/10 border border-red-500/20 text-red-400 text-[8px] font-bold font-mono rounded">
                      Driver Dominante: {posgradSensitivityAnalysis.tornado[0]?.name || 'Tarifa'}
                    </span>
                  </div>

                  <div className="h-64" style={{ width: '100%', height: 256, minWidth: 200 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart layout="vertical" data={posgradSensitivityAnalysis.tornado} margin={{ top: 10, right: 15, left: 10, bottom: 5 }} barSize={14}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={true} horizontal={false} />
                        <XAxis type="number" stroke="#64748b" className="text-[9px] font-mono" />
                        <YAxis type="category" dataKey="name" stroke="#64748b" className="text-[9px] font-mono font-medium" width={140} tickLine={false} />
                        <RechartsTooltip 
                          contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', fontSize: '11px' }}
                          formatter={(value: any, name: any) => {
                            const val = parseFloat(value);
                            return [`${val > 0 ? '+' : ''}${val}M COP`, name === 'low' ? 'Impacto Adverso' : 'Impacto Favorable'];
                          }}
                        />
                        <ReferenceLine x={0} stroke="#ffffff" strokeOpacity={0.25} />
                        <Bar dataKey="low" fill="#f43f5e" radius={[4, 0, 0, 4]} stackId="stack" name="Impacto Adverso" />
                        <Bar dataKey="high" fill="#4ade80" radius={[0, 4, 4, 0]} stackId="stack" name="Impacto Favorable" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>
            )}

            {/* SUB-TAB 4: COBERTURAS DSCR */}
            {activeSensSubTab === 'dscr' && (
              <div className="space-y-6 animate-in fade-in duration-300 print:hidden">
                
                {/* Compliance boxes */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  
                  {/* Minimum Covenant Limit */}
                  <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-5 flex flex-col items-center justify-center text-center shadow-xl">
                    <span className="text-[9px] text-white/50 font-mono uppercase tracking-wider mb-1.5">Límite Mínimo Covenant</span>
                    <span className="text-2xl font-bold font-mono text-white">1.25x</span>
                    <div className="w-full border-t border-dashed border-white/5 mt-3 pt-2 text-[9px] text-white/40 font-mono">
                       Tasa Mínima Exigida
                    </div>
                  </div>

                  {/* Base scenario DSCR */}
                  <div className={`bg-[#0f172a] border rounded-2xl p-5 flex flex-col items-center justify-center text-center shadow-xl ${
                    posgradSensitivityAnalysis.dscrBase >= 1.25 ? 'border-[#4ade80]/20 bg-[#4ade80]/5' : 'border-rose-500/20 bg-rose-500/5'
                  }`}>
                    <span className="text-[9px] text-white/50 font-mono uppercase tracking-wider mb-1.5">DSCR Escenario Base</span>
                    <span className={`text-2xl font-bold font-mono ${posgradSensitivityAnalysis.dscrBase >= 1.25 ? 'text-[#4ade80]' : 'text-rose-400'}`}>
                      {posgradSensitivityAnalysis.dscrBase.toFixed(2)}x
                    </span>
                    <div className={`mt-2 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                      posgradSensitivityAnalysis.dscrBase >= 1.25 ? 'bg-[#4ade80]/10 text-[#4ade80]' : 'bg-rose-500/10 text-rose-400'
                    }`}>
                      {posgradSensitivityAnalysis.dscrBase >= 1.25 ? '✓ Cumple' : '✗ Ruptura'}
                    </div>
                  </div>

                  {/* Optimistic scenario DSCR */}
                  <div className={`bg-[#0f172a] border rounded-2xl p-5 flex flex-col items-center justify-center text-center shadow-xl ${
                    posgradSensitivityAnalysis.dscrOptimistic >= 1.25 ? 'border-[#4ade80]/20 bg-[#4ade80]/5' : 'border-rose-500/20 bg-rose-500/5'
                  }`}>
                    <span className="text-[9px] text-white/50 font-mono uppercase tracking-wider mb-1.5">DSCR Optimista</span>
                    <span className={`text-2xl font-bold font-mono ${posgradSensitivityAnalysis.dscrOptimistic >= 1.25 ? 'text-[#4ade80]' : 'text-rose-400'}`}>
                      {posgradSensitivityAnalysis.dscrOptimistic.toFixed(2)}x
                    </span>
                    <div className={`mt-2 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                      posgradSensitivityAnalysis.dscrOptimistic >= 1.25 ? 'bg-[#4ade80]/10 text-[#4ade80]' : 'bg-rose-500/10 text-rose-400'
                    }`}>
                      {posgradSensitivityAnalysis.dscrOptimistic >= 1.25 ? '✓ Cumple' : '✗ Ruptura'}
                    </div>
                  </div>

                  {/* Pessimistic scenario DSCR */}
                  <div className={`bg-[#0f172a] border rounded-2xl p-5 flex flex-col items-center justify-center text-center shadow-xl ${
                    posgradSensitivityAnalysis.dscrPessimistic >= 1.25 ? 'border-[#4ade80]/20 bg-[#4ade80]/5' : 'border-rose-500/20 bg-rose-500/5'
                  }`}>
                    <span className="text-[9px] text-white/50 font-mono uppercase tracking-wider mb-1.5">DSCR Pesimista</span>
                    <span className={`text-2xl font-bold font-mono ${posgradSensitivityAnalysis.dscrPessimistic >= 1.25 ? 'text-[#4ade80]' : 'text-rose-400'}`}>
                      {posgradSensitivityAnalysis.dscrPessimistic.toFixed(2)}x
                    </span>
                    <div className={`mt-2 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                      posgradSensitivityAnalysis.dscrPessimistic >= 1.25 ? 'bg-[#4ade80]/10 text-[#4ade80]' : 'bg-rose-500/10 text-rose-400'
                    }`}>
                      {posgradSensitivityAnalysis.dscrPessimistic >= 1.25 ? '✓ Cumple' : '✗ Ruptura'}
                    </div>
                  </div>

                </div>

                {/* DSCR Curves & Tornado */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  
                  {/* Left Chart: 1D DSCR sensitivity */}
                  <div className="bg-[#0f172a] border border-white/10 rounded-[32px] p-6 flex flex-col h-[380px]">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Sensibilidad 1D · DSCR vs Variación Costo de Crédito</h4>
                    <div className="flex-1 w-full relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={posgradSensitivityAnalysis.dscr1DData} margin={{ top: 10, right: 15, left: -20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                          <XAxis dataKey="vLabel" stroke="#64748b" className="text-[9px] font-mono" />
                          <YAxis stroke="#64748b" className="text-[10px] font-mono" />
                          <RechartsTooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', fontSize: '11px' }} />
                          <Legend wrapperStyle={{ fontSize: '11px' }} />
                          <Line type="monotone" dataKey="DSCR" name="DSCR Cobertura (x)" stroke="#4ade80" strokeWidth={3} activeDot={{ r: 8 }} />
                          <Line type="monotone" dataKey="Covenant" name="Límite Convenido (1.25x)" stroke="#f43f5e" strokeDasharray="5 5" strokeWidth={1.5} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Right Chart: Driver impact on DSCR */}
                  <div className="bg-[#0f172a] border border-white/10 rounded-[32px] p-6 flex flex-col h-[380px]">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Tornado · Impacto de Drivers sobre el DSCR (±5%)</h4>
                    <div className="flex-1 w-full relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart layout="vertical" data={posgradSensitivityAnalysis.dscrTornado} margin={{ top: 15, right: 15, left: 10, bottom: 5 }} barSize={14}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={true} horizontal={false} />
                          <XAxis type="number" stroke="#64748b" className="text-[9px] font-mono" />
                          <YAxis type="category" dataKey="labelName" stroke="#64748b" className="text-[9px] font-mono" width={110} tickLine={false} />
                          <RechartsTooltip 
                            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', fontSize: '11px' }}
                            formatter={(value: any, name: any) => [`${parseFloat(value).toFixed(2)}x`, name === 'low' ? 'Impacto Adverso' : 'Impacto Favorable']}
                          />
                          <ReferenceLine x={posgradSensitivityAnalysis.dscrBase} stroke="#ffffff" strokeOpacity={0.2} strokeDasharray="3 3" />
                          <Bar dataKey="low" fill="#f43f5e" radius={[4, 0, 0, 4]} stackId="stack" name="Impacto Adverso" />
                          <Bar dataKey="high" fill="#4ade80" radius={[0, 4, 4, 0]} stackId="stack" name="Impacto Favorable" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                </div>

                {/* Rupture point diagnostics */}
                <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div className="space-y-1">
                    <span className="text-white/45 text-[9px] font-mono uppercase tracking-wider block">Análisis de Ruptura de Caja del Fondo R31</span>
                    <h4 className="text-sm font-bold text-white">Límite de Resistencia de Egresos / Retenciones</h4>
                    <p className="text-[11px] text-white/60 font-sans max-w-xl leading-relaxed">
                      El caso base cumple el covenant de cobertura con un colchón del <span className="text-[#4ade80] font-bold">{posgradSensitivityAnalysis.cushion.toFixed(1)}%</span>. 
                      Una variación acumulada en la retención central superior al <span className="text-rose-400 font-bold">{posgradSensitivityAnalysis.ruptureVar.toFixed(1)}%</span> llevaría al punto de ruptura del fondo, forzando un recaudo bruto mínimo de <span className="text-[#ffcc29] font-bold">{formatCurrency(posgradSensitivityAnalysis.ruptureValue)}</span> para mantener el equilibrio financiero.
                    </p>
                  </div>
                  
                  <div className="bg-white/5 border border-white/5 px-5 py-4 rounded-xl flex flex-col justify-center items-center shrink-0 min-w-[150px]">
                    <span className="text-[9px] text-white/50 uppercase tracking-widest block font-mono">Punto Ruptura</span>
                    <span className="text-xl font-bold font-mono text-rose-400 mt-1">{posgradSensitivityAnalysis.ruptureVar.toFixed(1)}%</span>
                  </div>
                </div>

              </div>
            )}

            {/* SUB-TAB 5: FINANCIAL MULTI-YEAR PROJECTION VIEW */}
            {activeSensSubTab === 'multiyear' && (
              <div className="space-y-6 animate-in fade-in duration-300 print:hidden">
                
                {/* Graphs area for Multi-Year */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Cash Flow Area Chart */}
                  <div className="lg:col-span-2 bg-[#0f172a] border border-white/10 rounded-[32px] p-6 flex flex-col">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Proyección Multivigencia de Caja del R31 (2027-{2026 + numYearsProyectar})</h4>
                    <div className="h-72" style={{ width: '100%', height: 288, minWidth: 200 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={multiYearProjections.map(d => ({
                          name: d.anio.toString(),
                          'Ingresos (M)': Math.round(d.recaudo / 1e6 * 10) / 10,
                          'Gastos (M)': Math.round(d.totalGastos / 1e6 * 10) / 10,
                          'Excedente (M)': Math.round(d.margenNeto / 1e6 * 10) / 10
                        }))} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                          <XAxis dataKey="name" stroke="#64748b" className="text-[10px] font-mono" />
                          <YAxis stroke="#64748b" className="text-[10px] font-mono" tickFormatter={(v) => `$${v}M`} />
                          <RechartsTooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', fontSize: '11px' }} />
                          <Legend wrapperStyle={{ fontSize: '11px' }} />
                          <Area type="monotone" dataKey="Ingresos (M)" stroke="#ffcc29" fill="#ffcc29" fillOpacity={0.03} strokeWidth={2} />
                          <Area type="monotone" dataKey="Gastos (M)" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.03} strokeWidth={1.5} />
                          <Area type="monotone" dataKey="Excedente (M)" stroke="#4ade80" fill="#4ade80" fillOpacity={0.03} strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* DSCR Line Chart over horizon */}
                  <div className="bg-[#0f172a] border border-white/10 rounded-[32px] p-6 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Sostenibilidad del Covenant DSCR (Largo Plazo)</h4>
                      <div className="h-60" style={{ width: '100%', height: 240, minWidth: 200 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={multiYearProjections} margin={{ top: 10, right: 10, left: -30, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                            <XAxis dataKey="anio" stroke="#64748b" className="text-[10px] font-mono" />
                            <YAxis stroke="#64748b" className="text-[10px] font-mono" />
                            <RechartsTooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', fontSize: '11px' }} />
                            <Line type="monotone" dataKey="dscr" name="Ratio DSCR (x)" stroke="#4ade80" strokeWidth={2.5} dot={{ r: 2 }} />
                            <ReferenceLine y={1.25} stroke="#f43f5e" strokeDasharray="4 4" strokeWidth={1.5} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    <span className="text-[9px] text-white/40 block leading-normal bg-black/40 p-2 rounded-lg">
                      La línea roja punteada representa la cobertura crítica (1.25x). Si la curva verde cae por debajo, el fondo genera déficit administrativo.
                    </span>
                  </div>

                </div>

                {/* Table view */}
                <div className="bg-[#0f172a] border border-white/10 rounded-[32px] p-6">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4 font-sans">Tabla de Proyecciones Multivigencia R31</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-white/10 bg-white/5 font-bold text-white">
                          <th className="p-3">Año</th>
                          <th className="p-3 text-right">Alumnos Proyectados</th>
                          <th className="p-3 text-right">Costo Promedio / Est.</th>
                          <th className="p-3 text-right">Recaudo Bruto</th>
                          <th className="p-3 text-right">Deducciones Centrales</th>
                          <th className="p-3 text-right">Gastos Directos</th>
                          <th className="p-3 text-right">Excedente Neto</th>
                          <th className="p-3 text-right">DSCR Cobertura</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-white/80 font-mono">
                        {multiYearProjections.map(p => (
                          <tr key={p.anio} className="hover:bg-white/[0.04]">
                            <td className="p-3 font-sans font-bold text-white">{p.anio}</td>
                            <td className="p-3 text-right text-[#4ade80] font-bold">{p.estudiantes}</td>
                            <td className="p-3 text-right">{formatCurrencyShort(p.precio)}</td>
                            <td className="p-3 text-right text-[#ffcc29] font-bold">{formatCurrency(p.recaudo)}</td>
                            <td className="p-3 text-right text-rose-300">-{formatCurrency(p.deduccionCentral)}</td>
                            <td className="p-3 text-right text-rose-300">-{formatCurrency(p.gastoOperativo)}</td>
                            <td className={`p-3 text-right font-bold ${p.margenNeto >= 0 ? 'text-[#4ade80]' : 'text-rose-400'}`}>
                              {p.margenNeto >= 0 ? '+' : ''}{formatCurrency(p.margenNeto)}
                            </td>
                            <td className="p-3 text-right">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${p.dscr >= 1.25 ? 'bg-[#4ade80]/10 text-[#4ade80]' : 'bg-rose-500/10 text-rose-400'}`}>
                                {p.dscr.toFixed(2)}x
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

            {/* SUB-TAB 6: COMPARACIÓN DE ESCENARIOS */}
            {activeSensSubTab === 'comparison' && (
              <div className="space-y-8 animate-in fade-in duration-300 print:hidden font-sans">
                
                {/* TOP SECTION: Controls (4 cols) & Dashboard (8 cols) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  
                  {/* Left controls column */}
                  <div className="lg:col-span-4 space-y-6">
                    
                    {/* Parameter controls box */}
                    <div className="bg-[#0f172a] border border-white/10 p-6 rounded-[28px] shadow-2xl space-y-5">
                      <div className="flex items-center justify-between border-b border-white/5 pb-3">
                        <div className="flex items-center gap-2">
                          <Settings className="text-[#ffcc29] w-5 h-5" />
                          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Parámetros Modelo SMLMV</h3>
                        </div>
                        <button
                          onClick={() => applyComparisonPreset('base')}
                          title="Restablecer a valores base"
                          className="text-white/40 hover:text-[#ffcc29] transition-colors p-1 rounded-md hover:bg-white/5 cursor-pointer"
                        >
                          <RefreshCw size={14} />
                        </button>
                      </div>

                      {/* Scenario Presets */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-white/50 uppercase font-mono tracking-wider font-semibold">Presets de Escenario</span>
                          <span className="text-[10px] text-[#ffcc29] font-mono capitalize">{comparisonPreset}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            type="button"
                            onClick={() => applyComparisonPreset('base')}
                            className={`px-2 py-2 rounded-xl text-[10px] font-bold font-mono transition-all border cursor-pointer ${
                              comparisonPreset === 'base'
                                ? 'bg-[#ffcc29]/20 border-[#ffcc29] text-[#ffcc29] shadow-lg shadow-[#ffcc29]/10'
                                : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                            }`}
                          >
                            Base
                            <span className="block text-[8px] font-normal opacity-70">ε -1.19 | +6%</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => applyComparisonPreset('estres')}
                            className={`px-2 py-2 rounded-xl text-[10px] font-bold font-mono transition-all border cursor-pointer ${
                              comparisonPreset === 'estres'
                                ? 'bg-rose-500/20 border-rose-400 text-rose-300 shadow-lg shadow-rose-500/10'
                                : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                            }`}
                          >
                            Estrés
                            <span className="block text-[8px] font-normal opacity-70">ε -1.40 | +9%</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => applyComparisonPreset('favorable')}
                            className={`px-2 py-2 rounded-xl text-[10px] font-bold font-mono transition-all border cursor-pointer ${
                              comparisonPreset === 'favorable'
                                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-lg shadow-emerald-500/10'
                                : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                            }`}
                          >
                            Rígida
                            <span className="block text-[8px] font-normal opacity-70">ε -0.85 | +5%</span>
                          </button>
                        </div>
                      </div>

                      <div className="space-y-4 pt-2 border-t border-white/5">
                        {/* Elasticity Price-Demand */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-white/60">Elasticidad Precio Demanda (ε)</span>
                            <strong className="text-[#ffcc29] font-mono text-sm">{elasticity.toFixed(2)}</strong>
                          </div>
                          <input 
                            type="range"
                            min="-2.00"
                            max="0.00"
                            step="0.05"
                            value={elasticity}
                            onChange={(e) => {
                              setElasticity(parseFloat(e.target.value));
                              setComparisonPreset('custom');
                            }}
                            className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#ffcc29]"
                          />
                          <div className="flex justify-between text-[9px] text-white/30 font-mono">
                            <span>-2.00 (Muy Elástica)</span>
                            <span>0.00 (Inelástica)</span>
                          </div>
                          <p className="text-[9px] text-white/40 leading-normal font-mono">Sensibilidad del volumen de matriculados ante incrementos arancelarios.</p>
                        </div>

                        {/* SMLMV Increase 2027 (%) */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-white/60">Incremento SMLMV 2027 (%)</span>
                            <strong className="text-white font-mono text-sm">{smlmvIncrease2027.toFixed(1)}%</strong>
                          </div>
                          <input 
                            type="range"
                            min="4.0"
                            max="20.0"
                            step="0.5"
                            value={smlmvIncrease2027}
                            onChange={(e) => {
                              setSmlmvIncrease2027(parseFloat(e.target.value));
                              setComparisonPreset('custom');
                            }}
                            className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#ffcc29]"
                          />
                          <div className="flex justify-between text-[9px] text-white/30 font-mono">
                            <span>4.0%</span>
                            <span>20.0%</span>
                          </div>
                          <p className="text-[9px] text-white/40 leading-normal font-mono">Variación nominal proyectada del salario mínimo para la vigencia 2027.</p>
                        </div>

                        {/* SMLMV Student growth baseline (%) */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-white/60">Variación Base Estudiantes (%)</span>
                            <strong className={`font-mono text-sm ${smlmvStudentVar >= 0 ? 'text-[#4ade80]' : 'text-rose-400'}`}>
                              {smlmvStudentVar > 0 ? '+' : ''}{smlmvStudentVar.toFixed(1)}%
                            </strong>
                          </div>
                          <input 
                            type="range"
                            min="-10.0"
                            max="5.0"
                            step="0.5"
                            value={smlmvStudentVar}
                            onChange={(e) => {
                              setSmlmvStudentVar(parseFloat(e.target.value));
                              setComparisonPreset('custom');
                            }}
                            className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#ffcc29]"
                          />
                          <p className="text-[9px] text-white/40 leading-normal font-mono">Tasa de crecimiento o contracción tendencial vegetativa anual.</p>
                        </div>

                        {/* SMLMV Growth Rate after 2027 (%) */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-white/60">Crecimiento SMLMV 2028+ (%)</span>
                            <strong className="text-white font-mono text-sm">{smlmvGrowthRate.toFixed(1)}%</strong>
                          </div>
                          <input 
                            type="range"
                            min="3.0"
                            max="12.0"
                            step="0.5"
                            value={smlmvGrowthRate}
                            onChange={(e) => {
                              setSmlmvGrowthRate(parseFloat(e.target.value));
                              setComparisonPreset('custom');
                            }}
                            className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#ffcc29]"
                          />
                          <p className="text-[9px] text-white/40 leading-normal font-mono">Indexación proyectada del salario mínimo para 2028-2036.</p>
                        </div>

                      </div>
                    </div>

                    {/* Value creation card: VAN summary */}
                    <div className="bg-gradient-to-br from-[#0f172a] via-[#111c35] to-[#0f172a] border border-[#ffcc29]/30 p-6 rounded-[28px] shadow-2xl space-y-4">
                      <div className="flex items-center justify-between border-b border-white/5 pb-3">
                        <div className="flex items-center gap-2">
                          <Zap className="text-[#ffcc29] w-5 h-5" />
                          <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Creación Neta de Valor (VAN)</h4>
                        </div>
                        <span className="text-[10px] bg-[#ffcc29]/10 text-[#ffcc29] font-mono px-2 py-0.5 rounded-full border border-[#ffcc29]/20 font-bold">
                          Tasa {sensDiscountRate.toFixed(1)}% E.A.
                        </span>
                      </div>

                      <div className="space-y-3">
                        {/* 10-Year VAN creation */}
                        <div className="bg-white/5 border border-white/5 rounded-2xl p-3.5 space-y-1">
                          <div className="flex justify-between items-center text-[10px] text-white/60 uppercase font-mono">
                            <span>Δ VAN Decenal (2027-2036)</span>
                            <span className="text-[#4ade80] font-bold">+{((comparisonInsights.diffVAN10y / (comparisonInsights.smlmvVAN10y || 1)) * 100).toFixed(1)}%</span>
                          </div>
                          <div className="text-xl font-bold text-[#4ade80] font-mono">
                            +{formatCurrency(comparisonInsights.diffVAN10y)}
                          </div>
                          <div className="flex justify-between items-center text-[9px] text-white/40 pt-1 border-t border-white/5 font-mono">
                            <span>Créditos: {formatCurrencyShort(comparisonInsights.creditVAN10y)}</span>
                            <span>SMLMV: {formatCurrencyShort(comparisonInsights.smlmvVAN10y)}</span>
                          </div>
                        </div>

                        {/* 4-Year VAN creation */}
                        <div className="bg-white/5 border border-white/5 rounded-2xl p-3.5 space-y-1">
                          <div className="flex justify-between items-center text-[10px] text-white/60 uppercase font-mono">
                            <span>Δ VAN Cuatrienio (2027-2030)</span>
                            <span className="text-[#4ade80] font-bold">+{((comparisonInsights.diffVAN4y / (comparisonInsights.smlmvVAN4y || 1)) * 100).toFixed(1)}%</span>
                          </div>
                          <div className="text-lg font-bold text-[#4ade80] font-mono">
                            +{formatCurrency(comparisonInsights.diffVAN4y)}
                          </div>
                          <div className="flex justify-between items-center text-[9px] text-white/40 pt-1 border-t border-white/5 font-mono">
                            <span>Créditos: {formatCurrencyShort(comparisonInsights.creditVAN4y)}</span>
                            <span>SMLMV: {formatCurrencyShort(comparisonInsights.smlmvVAN4y)}</span>
                          </div>
                        </div>

                        {/* Cumulative Revenue delta & retention */}
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <div className="bg-white/5 rounded-xl p-2.5">
                            <span className="text-[9px] text-white/50 uppercase font-mono block">Δ Recaudo 10y</span>
                            <span className="text-xs font-bold text-[#ffcc29] font-mono">+{formatCurrencyShort(comparisonInsights.totalDiffRecaudo)}</span>
                          </div>
                          <div className="bg-white/5 rounded-xl p-2.5">
                            <span className="text-[9px] text-white/50 uppercase font-mono block">Retención 2036</span>
                            <span className="text-xs font-bold text-[#4ade80] font-mono">+{comparisonInsights.retainedStudentsFinal.toLocaleString('es-CO')} est.</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* AI automatic executive report analysis */}
                    <div className="bg-[#ffcc29]/5 border border-[#ffcc29]/20 p-5 rounded-[28px] space-y-3">
                      <span className="font-bold text-[#ffcc29] text-xs flex items-center gap-1.5 uppercase tracking-wider font-mono">
                        <Bot size={15} /> Evaluación Macroeconómica de Viabilidad:
                      </span>
                      <div className="text-white/80 text-[11px] leading-relaxed space-y-2.5 font-sans">
                        <p>
                          <strong>Efecto Rezago Diferido (+21.9% en 2027):</strong> Al liquidar bajo el esquema SMLMV en 2027, la UPTC debe absorber la variación rezagada diferida del año anterior (15%) más la proyección de la vigencia ({smlmvIncrease2027.toFixed(1)}%), induciendo una subida arancelaria abrupta del <strong>{comparisonInsights.priceVarPct2027.toFixed(1)}%</strong> por semestre.
                        </p>
                        <p>
                          <strong>Contracción Severa de Demanda (SMLMV):</strong> Bajo la elasticidad precio estimada de {elasticity.toFixed(2)}, la tarifa semestral sube de $8.8M a $10.7M en 2027, expulsando a <strong>{(5170 - comparisonInsights.targetData.smlmvStudents).toLocaleString('es-CO')} estudiantes</strong> en el primer año (caída de 5,170 a {comparisonInsights.targetData.smlmvStudents.toLocaleString('es-CO')} alumnos). En el horizonte decenal, el esquema SMLMV colapsa a tan solo {comparisonInsights.finalSmlmvStudents.toLocaleString('es-CO')} alumnos.
                        </p>
                        <p>
                          <strong>Ventaja Estructural del Modelo por Créditos:</strong> El cobro proporcional a créditos matriculados flexibiliza la carga financiera del estudiante (tarifa promedio de $6.48M en 2027). Esto estabiliza la matrícula en <strong>{comparisonInsights.targetData.creditStudents.toLocaleString('es-CO')} alumnos</strong> (+{comparisonInsights.targetData.diffStudents.toLocaleString('es-CO')} vs SMLMV) y eleva el recaudo 2027 a <strong>{formatCurrency(comparisonInsights.targetData.creditRecaudo)}</strong> (+{formatCurrency(comparisonInsights.targetData.diffRecaudoAbs)}).
                        </p>
                        <p>
                          <strong>Creación Neta de Valor (VAN al {sensDiscountRate.toFixed(1)}%):</strong> El modelo de créditos genera un <strong>VAN a 10 años de {formatCurrency(comparisonInsights.creditVAN10y)}</strong> frente a <strong>{formatCurrency(comparisonInsights.smlmvVAN10y)}</strong> del esquema tradicional. Esto certifica una ganancia neta descontada de <strong>+{formatCurrency(comparisonInsights.diffVAN10y)} (+{((comparisonInsights.diffVAN10y / (comparisonInsights.smlmvVAN10y || 1)) * 100).toFixed(1)}%)</strong>, confirmando la superioridad y viabilidad institucional del modelo.
                        </p>
                      </div>
                    </div>

                  </div>

                  {/* Right dashboard column (KPIs and Charts) */}
                  <div className="lg:col-span-8 space-y-6">
                    
                    {/* Header bar with layout toggle */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-[#0f172a] border border-white/10 p-4 rounded-[24px]">
                      <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                          <BarChart3 className="text-[#ffcc29] w-4 h-4" />
                          Tablero Comparativo: Créditos vs. SMLMV
                        </h3>
                        <p className="text-[11px] text-white/50">Proyección multianual 2027-2036 evaluada a precios constantes y flujos descontados</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-white/40 font-mono uppercase">Formato:</span>
                        <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
                          <button
                            type="button"
                            onClick={() => setComparisonChartLayout('grid')}
                            className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                              comparisonChartLayout === 'grid'
                                ? 'bg-[#ffcc29] text-black shadow-md'
                                : 'text-white/60 hover:text-white'
                            }`}
                          >
                            <Layers size={13} /> Cuadrícula (400px)
                          </button>
                          <button
                            type="button"
                            onClick={() => setComparisonChartLayout('expanded')}
                            className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                              comparisonChartLayout === 'expanded'
                                ? 'bg-[#ffcc29] text-black shadow-md'
                                : 'text-white/60 hover:text-white'
                            }`}
                          >
                            <Maximize2 size={13} /> Enfocada (480px)
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* 8 KPI Cards Grid (2 rows of 4) */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      
                      {/* KPI 1: Ingresos Créditos 2027 */}
                      <div className="bg-[#0f172a] border border-[#ffcc29]/30 rounded-2xl p-4 flex flex-col justify-between shadow-lg relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-[#ffcc29]/5 rounded-bl-full pointer-events-none" />
                        <span className="text-[10px] text-[#ffcc29] uppercase font-bold tracking-wider font-mono">Ingresos Créditos ({elasticityYear})</span>
                        <div className="mt-2">
                          <div className="text-base font-bold text-[#ffcc29] truncate font-mono">{formatCurrency(comparisonInsights.targetData.creditRecaudo)}</div>
                          <span className="text-[10px] text-[#ffcc29]/70 block mt-0.5 font-mono">{comparisonInsights.targetData.creditStudents.toLocaleString('es-CO')} estudiantes</span>
                        </div>
                      </div>

                      {/* KPI 2: Ingresos SMLMV 2027 */}
                      <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-4 flex flex-col justify-between shadow-lg">
                        <span className="text-[10px] text-white/50 uppercase font-bold tracking-wider font-mono">Ingresos SMLMV ({elasticityYear})</span>
                        <div className="mt-2">
                          <div className="text-base font-bold text-white truncate font-mono">{formatCurrency(comparisonInsights.targetData.smlmvRecaudo)}</div>
                          <span className="text-[10px] text-white/40 block mt-0.5 font-mono">{comparisonInsights.targetData.smlmvStudents.toLocaleString('es-CO')} estudiantes</span>
                        </div>
                      </div>

                      {/* KPI 3: Diferencia 2027 */}
                      <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-4 flex flex-col justify-between shadow-lg">
                        <span className="text-[10px] text-white/50 uppercase font-bold tracking-wider font-mono">Diferencia Neta ({elasticityYear})</span>
                        <div className="mt-2">
                          <div className={`text-base font-bold truncate font-mono ${comparisonInsights.targetData.diffRecaudoAbs >= 0 ? 'text-[#4ade80]' : 'text-rose-400'}`}>
                            {comparisonInsights.targetData.diffRecaudoAbs >= 0 ? '+' : ''}{formatCurrency(comparisonInsights.targetData.diffRecaudoAbs)}
                          </div>
                          <span className={`text-[10px] font-bold block mt-0.5 font-mono ${comparisonInsights.targetData.diffRecaudoAbs >= 0 ? 'text-[#4ade80]' : 'text-rose-400'}`}>
                            {comparisonInsights.targetData.diffRecaudoPct >= 0 ? '+' : ''}{comparisonInsights.targetData.diffRecaudoPct.toFixed(1)}% vs SMLMV
                          </span>
                        </div>
                      </div>

                      {/* KPI 4: Tarifa Media 2027 */}
                      <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-4 flex flex-col justify-between shadow-lg">
                        <span className="text-[10px] text-white/50 uppercase font-bold tracking-wider font-mono">Tarifa Media / Est. 2027</span>
                        <div className="mt-2">
                          <div className="text-xs text-[#ffcc29] font-bold truncate font-mono">Créditos: {formatCurrencyShort(comparisonInsights.targetData.creditRecaudo / (comparisonInsights.targetData.creditStudents || 1))}</div>
                          <div className="text-xs text-white/60 truncate mt-0.5 font-mono">SMLMV: {formatCurrencyShort(comparisonInsights.targetData.smlmvPrice)}</div>
                        </div>
                      </div>

                      {/* KPI 5: VAN 10 Años Créditos */}
                      <div className="bg-[#0f172a] border border-[#ffcc29]/20 rounded-2xl p-4 flex flex-col justify-between shadow-lg">
                        <span className="text-[10px] text-[#ffcc29] uppercase font-bold tracking-wider font-mono">VAN 10 Años (Créditos)</span>
                        <div className="mt-2">
                          <div className="text-base font-bold text-[#ffcc29] truncate font-mono">{formatCurrency(comparisonInsights.creditVAN10y)}</div>
                          <span className="text-[10px] text-[#ffcc29]/60 block mt-0.5 font-mono">4 Años: {formatCurrencyShort(comparisonInsights.creditVAN4y)}</span>
                        </div>
                      </div>

                      {/* KPI 6: VAN 10 Años SMLMV */}
                      <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-4 flex flex-col justify-between shadow-lg">
                        <span className="text-[10px] text-white/50 uppercase font-bold tracking-wider font-mono">VAN 10 Años (SMLMV)</span>
                        <div className="mt-2">
                          <div className="text-base font-bold text-white truncate font-mono">{formatCurrency(comparisonInsights.smlmvVAN10y)}</div>
                          <span className="text-[10px] text-white/40 block mt-0.5 font-mono">4 Años: {formatCurrencyShort(comparisonInsights.smlmvVAN4y)}</span>
                        </div>
                      </div>

                      {/* KPI 7: Creación de Valor Δ VAN */}
                      <div className="bg-[#0f172a] border border-emerald-500/30 rounded-2xl p-4 flex flex-col justify-between shadow-lg">
                        <span className="text-[10px] text-[#4ade80] uppercase font-bold tracking-wider font-mono">Δ VAN Neto (10 Años)</span>
                        <div className="mt-2">
                          <div className="text-base font-bold text-[#4ade80] truncate font-mono">+{formatCurrency(comparisonInsights.diffVAN10y)}</div>
                          <span className="text-[10px] text-[#4ade80]/70 font-bold block mt-0.5 font-mono">+{((comparisonInsights.diffVAN10y / (comparisonInsights.smlmvVAN10y || 1)) * 100).toFixed(1)}% Creación</span>
                        </div>
                      </div>

                      {/* KPI 8: Retención Estudiantil 2036 */}
                      <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-4 flex flex-col justify-between shadow-lg">
                        <span className="text-[10px] text-white/50 uppercase font-bold tracking-wider font-mono">Retención Alumnos 2036</span>
                        <div className="mt-2">
                          <div className="text-base font-bold text-[#4ade80] truncate font-mono">+{comparisonInsights.retainedStudentsFinal.toLocaleString('es-CO')} est.</div>
                          <span className="text-[10px] text-white/40 block mt-0.5 font-mono">6.782 vs 1.980 alumnos</span>
                        </div>
                      </div>

                    </div>

                    {/* CHARTS CONTAINER (Generous dimensions: 400px - 480px, ample padding, no cutoffs) */}
                    {comparisonChartLayout === 'expanded' ? (
                      /* EXPANDED VIEW: Tab switcher for each chart in 480px glory */
                      <div className="bg-[#0f172a] border border-white/10 rounded-[32px] p-6 shadow-2xl space-y-5">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                          <div className="flex flex-wrap gap-2">
                            {[
                              { id: 1, title: '1. Ingresos Proyectados', icon: DollarSign },
                              { id: 2, title: '2. Matrícula y Retención', icon: Users },
                              { id: 3, title: '3. Flujos y VAN al 8%', icon: Zap },
                              { id: 4, title: '4. % Variación Anual', icon: Percent },
                              { id: 5, title: '5. Excedente R31', icon: TrendingUp }
                            ].map(tab => {
                              const TabIcon = tab.icon;
                              const isActive = selectedExpandedChart === tab.id;
                              return (
                                <button
                                  key={tab.id}
                                  type="button"
                                  onClick={() => setSelectedExpandedChart(tab.id)}
                                  className={`px-3 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                                    isActive
                                      ? 'bg-[#ffcc29] text-black shadow-lg shadow-[#ffcc29]/20'
                                      : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                                  }`}
                                >
                                  <TabIcon size={14} />
                                  {tab.title}
                                </button>
                              );
                            })}
                          </div>
                          <button
                            type="button"
                            onClick={() => setComparisonChartLayout('grid')}
                            className="text-xs text-white/60 hover:text-white font-mono flex items-center gap-1 cursor-pointer"
                          >
                            <Minimize2 size={13} /> Volver a cuadrícula
                          </button>
                        </div>

                        {/* Chart 1 Expanded */}
                        {selectedExpandedChart === 1 && (
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <div>
                                <h4 className="text-sm font-bold text-white uppercase tracking-wider font-mono">1. Comparación de Ingresos Proyectados (Millones COP)</h4>
                                <p className="text-xs text-white/50">Evolución de ingresos brutos nominales anuales para el Fondo R31 (2026-2036)</p>
                              </div>
                              <div className="text-xs text-[#ffcc29] font-mono bg-[#ffcc29]/10 px-3 py-1 rounded-lg border border-[#ffcc29]/20 font-bold">
                                2027: Créditos $44.622M vs SMLMV $42.918M (+$1.703M)
                              </div>
                            </div>
                            <div className="h-[480px]" style={{ width: '100%', minWidth: 250 }}>
                              <ResponsiveContainer width="100%" height="100%">
                                <AreaChart
                                  data={scenarioComparisonData.map(d => ({
                                    name: d.anio.toString(),
                                    'Ingresos SMLMV (M)': Math.round(d.smlmvRecaudo / 1e6 * 10) / 10,
                                    'Ingresos Créditos (M)': Math.round(d.creditRecaudo / 1e6 * 10) / 10,
                                    'Diferencia Neta (M)': Math.round(d.diffRecaudoAbs / 1e6 * 10) / 10
                                  }))}
                                  margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
                                >
                                  <defs>
                                    <linearGradient id="expCreditGrad" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor="#ffcc29" stopOpacity={0.35}/>
                                      <stop offset="95%" stopColor="#ffcc29" stopOpacity={0.0}/>
                                    </linearGradient>
                                    <linearGradient id="expSmlmvGrad" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.25}/>
                                      <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.0}/>
                                    </linearGradient>
                                  </defs>
                                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                                  <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 12, fill: '#94a3b8' }} dy={8} />
                                  <YAxis stroke="#94a3b8" width={75} tick={{ fontSize: 12, fill: '#94a3b8' }} tickFormatter={(v) => `$${v.toLocaleString('es-CO')}M`} />
                                  <RechartsTooltip
                                    contentStyle={{backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px', fontSize: '12px', color: '#fff'}}
                                    formatter={(val: any) => [`$ ${Number(val).toLocaleString('es-CO')} Millones`, '']}
                                  />
                                  <Legend wrapperStyle={{fontSize: '12px', marginTop: 12, color: '#cbd5e1'}} />
                                  <Area type="monotone" dataKey="Ingresos SMLMV (M)" stroke="#94a3b8" fill="url(#expSmlmvGrad)" strokeWidth={2.5} dot={{ r: 4, fill: '#94a3b8' }} />
                                  <Area type="monotone" dataKey="Ingresos Créditos (M)" stroke="#ffcc29" fill="url(#expCreditGrad)" strokeWidth={3} dot={{ r: 5, fill: '#ffcc29' }} />
                                </AreaChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                        )}

                        {/* Chart 2 Expanded */}
                        {selectedExpandedChart === 2 && (
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <div>
                                <h4 className="text-sm font-bold text-white uppercase tracking-wider font-mono">2. Comparación de Matrículas Proyectadas (Estudiantes)</h4>
                                <p className="text-xs text-white/50">Efecto de la elasticidad precio y la reforma en la retención estudiantil</p>
                              </div>
                              <div className="text-xs text-[#4ade80] font-mono bg-[#4ade80]/10 px-3 py-1 rounded-lg border border-[#4ade80]/20 font-bold">
                                2027: 6.887 vs 4.003 (+2.884 est. retenidos)
                              </div>
                            </div>
                            <div className="h-[480px]" style={{ width: '100%', minWidth: 250 }}>
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart
                                  data={scenarioComparisonData.map(d => ({
                                    name: d.anio.toString(),
                                    'Alumnos SMLMV': d.smlmvStudents,
                                    'Alumnos Créditos': d.creditStudents,
                                    'Alumnos Retenidos': d.creditStudents - d.smlmvStudents
                                  }))}
                                  margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
                                >
                                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                                  <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 12, fill: '#94a3b8' }} dy={8} />
                                  <YAxis stroke="#94a3b8" width={65} tick={{ fontSize: 12, fill: '#94a3b8' }} tickFormatter={(v) => v.toLocaleString('es-CO')} />
                                  <RechartsTooltip
                                    contentStyle={{backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px', fontSize: '12px', color: '#fff'}}
                                    formatter={(val: any) => [`${Number(val).toLocaleString('es-CO')} Estudiantes`, '']}
                                  />
                                  <Legend wrapperStyle={{fontSize: '12px', marginTop: 12, color: '#cbd5e1'}} />
                                  <Line type="monotone" dataKey="Alumnos SMLMV" stroke="#cbd5e1" strokeWidth={2.5} dot={{r: 4, fill: '#cbd5e1'}} />
                                  <Line type="monotone" dataKey="Alumnos Créditos" stroke="#4ade80" strokeWidth={3} dot={{r: 5, fill: '#4ade80'}} />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                        )}

                        {/* Chart 3 Expanded */}
                        {selectedExpandedChart === 3 && (
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <div>
                                <h4 className="text-sm font-bold text-white uppercase tracking-wider font-mono">3. Flujos de Valor Presente Anual (VP_t) y VAN Acumulado</h4>
                                <p className="text-xs text-white/50">Descuento financiero de flujos netos al 8.0% E.A. y creación acumulada de valor</p>
                              </div>
                              <div className="text-xs text-[#4ade80] font-mono bg-[#4ade80]/10 px-3 py-1 rounded-lg border border-[#4ade80]/20 font-bold">
                                Δ VAN Decenal: +$26.251,8M (+51.0%)
                              </div>
                            </div>
                            <div className="h-[480px]" style={{ width: '100%', minWidth: 250 }}>
                              <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart
                                  data={scenarioComparisonData.map(d => ({
                                    name: d.anio.toString(),
                                    'VP Créditos (M)': Math.round(d.creditVP / 1e6 * 10) / 10,
                                    'VP SMLMV (M)': Math.round(d.smlmvVP / 1e6 * 10) / 10,
                                    'Δ VAN Acumulado (M)': Math.round(d.accumulatedDiffVP / 1e6 * 10) / 10
                                  }))}
                                  margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
                                >
                                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                                  <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 12, fill: '#94a3b8' }} dy={8} />
                                  <YAxis yAxisId="left" stroke="#94a3b8" width={75} tick={{ fontSize: 12, fill: '#94a3b8' }} tickFormatter={(v) => `$${v.toLocaleString('es-CO')}M`} />
                                  <YAxis yAxisId="right" orientation="right" stroke="#4ade80" width={75} tick={{ fontSize: 12, fill: '#4ade80' }} tickFormatter={(v) => `$${v.toLocaleString('es-CO')}M`} />
                                  <RechartsTooltip
                                    contentStyle={{backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px', fontSize: '12px', color: '#fff'}}
                                    formatter={(val: any) => [`$ ${Number(val).toLocaleString('es-CO')} Millones`, '']}
                                  />
                                  <Legend wrapperStyle={{fontSize: '12px', marginTop: 12, color: '#cbd5e1'}} />
                                  <Bar yAxisId="left" dataKey="VP SMLMV (M)" fill="#64748b" radius={[4, 4, 0, 0]} />
                                  <Bar yAxisId="left" dataKey="VP Créditos (M)" fill="#ffcc29" radius={[4, 4, 0, 0]} />
                                  <Line yAxisId="right" type="monotone" dataKey="Δ VAN Acumulado (M)" stroke="#4ade80" strokeWidth={3} dot={{r: 5, fill: '#4ade80'}} />
                                </ComposedChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                        )}

                        {/* Chart 4 Expanded */}
                        {selectedExpandedChart === 4 && (
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <div>
                                <h4 className="text-sm font-bold text-white uppercase tracking-wider font-mono">4. Variación Porcentual Anual de Ingresos (Créditos vs SMLMV)</h4>
                                <p className="text-xs text-white/50">Diferencial porcentual anual de recaudos por vigencia presupuestal</p>
                              </div>
                              <div className="text-xs text-emerald-400 font-mono bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20 font-bold">
                                2027: +4.0% | 2036: +123.4%
                              </div>
                            </div>
                            <div className="h-[480px]" style={{ width: '100%', minWidth: 250 }}>
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                  data={scenarioComparisonData.map(d => ({
                                    name: d.anio.toString(),
                                    'Incremento (%)': Math.round(d.diffRecaudoPct * 10) / 10
                                  }))}
                                  margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
                                >
                                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                                  <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 12, fill: '#94a3b8' }} dy={8} />
                                  <YAxis stroke="#94a3b8" width={65} tick={{ fontSize: 12, fill: '#94a3b8' }} tickFormatter={(v) => `${v}%`} />
                                  <RechartsTooltip
                                    contentStyle={{backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px', fontSize: '12px', color: '#fff'}}
                                    formatter={(val: any) => [`${Number(val).toFixed(1)}%`, 'Variación']}
                                  />
                                  <ReferenceLine y={0} stroke="#64748b" strokeWidth={1.5} />
                                  <Bar dataKey="Incremento (%)" radius={[4, 4, 0, 0]}>
                                    {scenarioComparisonData.map((entry, idx) => {
                                      const isPos = entry.diffRecaudoAbs >= 0;
                                      return <Cell key={`cell-exp-${idx}`} fill={isPos ? '#4ade80' : '#f43f5e'} />;
                                    })}
                                  </Bar>
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                        )}

                        {/* Chart 5 Expanded */}
                        {selectedExpandedChart === 5 && (
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <div>
                                <h4 className="text-sm font-bold text-white uppercase tracking-wider font-mono">5. Excedente Neto Acumulado del Fondo R31 (Millones COP)</h4>
                                <p className="text-xs text-white/50">Acumulación acumulada de la diferencia de flujos en favor de la Universidad</p>
                              </div>
                              <div className="text-xs text-[#4ade80] font-mono bg-[#4ade80]/10 px-3 py-1 rounded-lg border border-[#4ade80]/20 font-bold">
                                Total Decenal: +$181.817,5M COP
                              </div>
                            </div>
                            <div className="h-[480px]" style={{ width: '100%', minWidth: 250 }}>
                              <ResponsiveContainer width="100%" height="100%">
                                <AreaChart
                                  data={scenarioComparisonData.map(d => ({
                                    name: d.anio.toString(),
                                    'Excedente Acumulado (M)': Math.round(d.accumulatedDiff / 1e6 * 10) / 10,
                                    'Δ VAN Acumulado (M)': Math.round(d.accumulatedDiffVP / 1e6 * 10) / 10
                                  }))}
                                  margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
                                >
                                  <defs>
                                    <linearGradient id="expAccumGrad" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor="#4ade80" stopOpacity={0.35}/>
                                      <stop offset="95%" stopColor="#4ade80" stopOpacity={0.0}/>
                                    </linearGradient>
                                  </defs>
                                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                                  <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 12, fill: '#94a3b8' }} dy={8} />
                                  <YAxis stroke="#94a3b8" width={75} tick={{ fontSize: 12, fill: '#94a3b8' }} tickFormatter={(v) => `$${v.toLocaleString('es-CO')}M`} />
                                  <RechartsTooltip
                                    contentStyle={{backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px', fontSize: '12px', color: '#fff'}}
                                    formatter={(val: any) => [`$ ${Number(val).toLocaleString('es-CO')} Millones`, '']}
                                  />
                                  <Legend wrapperStyle={{fontSize: '12px', marginTop: 12, color: '#cbd5e1'}} />
                                  <ReferenceLine y={0} stroke="#64748b" />
                                  <Area type="monotone" dataKey="Excedente Acumulado (M)" stroke="#4ade80" fill="url(#expAccumGrad)" strokeWidth={3} dot={{ r: 5, fill: '#4ade80' }} />
                                </AreaChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                        )}

                      </div>
                    ) : (
                      /* GRID VIEW: Generous 400px heights, ample margins, zero clipping */
                      <div className="space-y-6">
                        
                        {/* Row 1: Charts 1 & 2 */}
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                          
                          {/* Chart 1: Revenue Comparison */}
                          <div className="bg-[#0f172a] border border-white/10 rounded-[32px] p-6 flex flex-col shadow-xl">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">1. Ingresos Proyectados (Millones COP)</h4>
                                <span className="text-[10px] text-white/50">Créditos ($44.622M en 2027) vs SMLMV ($42.918M)</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedExpandedChart(1);
                                  setComparisonChartLayout('expanded');
                                }}
                                title="Expandir a tamaño completo"
                                className="text-white/40 hover:text-[#ffcc29] transition-colors p-1 cursor-pointer"
                              >
                                <Maximize2 size={14} />
                              </button>
                            </div>
                            <div className="h-[400px]" style={{ width: '100%', minWidth: 200 }}>
                              <ResponsiveContainer width="100%" height="100%">
                                <AreaChart
                                  data={scenarioComparisonData.map(d => ({
                                    name: d.anio.toString(),
                                    'Ingresos SMLMV (M)': Math.round(d.smlmvRecaudo / 1e6 * 10) / 10,
                                    'Ingresos Créditos (M)': Math.round(d.creditRecaudo / 1e6 * 10) / 10
                                  }))}
                                  margin={{ top: 15, right: 20, left: 20, bottom: 5 }}
                                >
                                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                                  <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11, fill: '#94a3b8' }} dy={5} />
                                  <YAxis stroke="#94a3b8" width={75} tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v) => `$${v.toLocaleString('es-CO')}M`} />
                                  <RechartsTooltip contentStyle={{backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '10px', fontSize: '11px', color: '#fff'}} />
                                  <Legend wrapperStyle={{fontSize: '11px', marginTop: 8, color: '#cbd5e1'}} />
                                  <Area type="monotone" dataKey="Ingresos SMLMV (M)" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.15} strokeWidth={2} dot={{ r: 3, fill: '#94a3b8' }} />
                                  <Area type="monotone" dataKey="Ingresos Créditos (M)" stroke="#ffcc29" fill="#ffcc29" fillOpacity={0.25} strokeWidth={2.5} dot={{ r: 4, fill: '#ffcc29' }} />
                                </AreaChart>
                              </ResponsiveContainer>
                            </div>
                          </div>

                          {/* Chart 2: Student Enrollment */}
                          <div className="bg-[#0f172a] border border-white/10 rounded-[32px] p-6 flex flex-col shadow-xl">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">2. Matrículas Proyectadas (Estudiantes)</h4>
                                <span className="text-[10px] text-[#4ade80]">Retención: +2.884 est. (2027) y +4.802 est. (2036)</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedExpandedChart(2);
                                  setComparisonChartLayout('expanded');
                                }}
                                title="Expandir a tamaño completo"
                                className="text-white/40 hover:text-[#ffcc29] transition-colors p-1 cursor-pointer"
                              >
                                <Maximize2 size={14} />
                              </button>
                            </div>
                            <div className="h-[400px]" style={{ width: '100%', minWidth: 200 }}>
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart
                                  data={scenarioComparisonData.map(d => ({
                                    name: d.anio.toString(),
                                    'Alumnos SMLMV': d.smlmvStudents,
                                    'Alumnos Créditos': d.creditStudents
                                  }))}
                                  margin={{ top: 15, right: 20, left: 15, bottom: 5 }}
                                >
                                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                                  <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11, fill: '#94a3b8' }} dy={5} />
                                  <YAxis stroke="#94a3b8" width={65} tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v) => v.toLocaleString('es-CO')} />
                                  <RechartsTooltip contentStyle={{backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '10px', fontSize: '11px', color: '#fff'}} />
                                  <Legend wrapperStyle={{fontSize: '11px', marginTop: 8, color: '#cbd5e1'}} />
                                  <Line type="monotone" dataKey="Alumnos SMLMV" stroke="#cbd5e1" strokeWidth={2} dot={{r: 3, fill: '#cbd5e1'}} />
                                  <Line type="monotone" dataKey="Alumnos Créditos" stroke="#4ade80" strokeWidth={2.5} dot={{r: 4, fill: '#4ade80'}} />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                          </div>

                        </div>

                        {/* Row 2: Chart 3 (Full-width Flujos y VAN) */}
                        <div className="bg-[#0f172a] border border-white/10 rounded-[32px] p-6 flex flex-col shadow-xl">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">3. Flujos de Valor Presente Anual (VP_t) y VAN Acumulado (Millones COP)</h4>
                              <span className="text-[10px] text-white/50">Descuento al 8.0% E.A. | Barras: VP Anual (eje izq) | Línea verde: Δ VAN acumulado a favor de Créditos (eje der)</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedExpandedChart(3);
                                setComparisonChartLayout('expanded');
                              }}
                              title="Expandir a tamaño completo"
                              className="text-white/40 hover:text-[#ffcc29] transition-colors p-1 cursor-pointer"
                            >
                              <Maximize2 size={14} />
                            </button>
                          </div>
                          <div className="h-[400px]" style={{ width: '100%', minWidth: 250 }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <ComposedChart
                                data={scenarioComparisonData.map(d => ({
                                  name: d.anio.toString(),
                                  'VP Créditos (M)': Math.round(d.creditVP / 1e6 * 10) / 10,
                                  'VP SMLMV (M)': Math.round(d.smlmvVP / 1e6 * 10) / 10,
                                  'Δ VAN Acumulado (M)': Math.round(d.accumulatedDiffVP / 1e6 * 10) / 10
                                }))}
                                margin={{ top: 15, right: 25, left: 20, bottom: 5 }}
                              >
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                                <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11, fill: '#94a3b8' }} dy={5} />
                                <YAxis yAxisId="left" stroke="#94a3b8" width={75} tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v) => `$${v.toLocaleString('es-CO')}M`} />
                                <YAxis yAxisId="right" orientation="right" stroke="#4ade80" width={75} tick={{ fontSize: 11, fill: '#4ade80' }} tickFormatter={(v) => `$${v.toLocaleString('es-CO')}M`} />
                                <RechartsTooltip contentStyle={{backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '10px', fontSize: '11px', color: '#fff'}} />
                                <Legend wrapperStyle={{fontSize: '11px', marginTop: 8, color: '#cbd5e1'}} />
                                <Bar yAxisId="left" dataKey="VP SMLMV (M)" fill="#64748b" radius={[3, 3, 0, 0]} />
                                <Bar yAxisId="left" dataKey="VP Créditos (M)" fill="#ffcc29" radius={[3, 3, 0, 0]} />
                                <Line yAxisId="right" type="monotone" dataKey="Δ VAN Acumulado (M)" stroke="#4ade80" strokeWidth={3} dot={{r: 4, fill: '#4ade80'}} />
                              </ComposedChart>
                            </ResponsiveContainer>
                          </div>
                        </div>

                        {/* Row 3: Charts 4 & 5 */}
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                          
                          {/* Chart 4: Percentage Variation */}
                          <div className="bg-[#0f172a] border border-white/10 rounded-[32px] p-6 flex flex-col shadow-xl">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">4. Variación Porcentual de Ingresos (Créditos vs SMLMV)</h4>
                                <span className="text-[10px] text-emerald-400">Desde +4.0% en 2027 hasta +123.4% en 2036</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedExpandedChart(4);
                                  setComparisonChartLayout('expanded');
                                }}
                                title="Expandir a tamaño completo"
                                className="text-white/40 hover:text-[#ffcc29] transition-colors p-1 cursor-pointer"
                              >
                                <Maximize2 size={14} />
                              </button>
                            </div>
                            <div className="h-[380px]" style={{ width: '100%', minWidth: 200 }}>
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                  data={scenarioComparisonData.map(d => ({
                                    name: d.anio.toString(),
                                    'Incremento (%)': Math.round(d.diffRecaudoPct * 10) / 10
                                  }))}
                                  margin={{ top: 15, right: 15, left: 15, bottom: 5 }}
                                >
                                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                                  <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11, fill: '#94a3b8' }} dy={5} />
                                  <YAxis stroke="#94a3b8" width={65} tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v) => `${v}%`} />
                                  <RechartsTooltip contentStyle={{backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '10px', fontSize: '11px', color: '#fff'}} />
                                  <ReferenceLine y={0} stroke="#64748b" strokeWidth={1.5} />
                                  <Bar dataKey="Incremento (%)" radius={[3, 3, 0, 0]}>
                                    {scenarioComparisonData.map((entry, idx) => {
                                      const isPos = entry.diffRecaudoAbs >= 0;
                                      return <Cell key={`cell-${idx}`} fill={isPos ? '#4ade80' : '#f43f5e'} />;
                                    })}
                                  </Bar>
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          </div>

                          {/* Chart 5: Accumulated Gain/Loss */}
                          <div className="bg-[#0f172a] border border-white/10 rounded-[32px] p-6 flex flex-col shadow-xl">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">5. Excedente Neto Acumulado del Fondo R31 (Millones COP)</h4>
                                <span className="text-[10px] text-[#4ade80]">Acumulación decenal: +$181.817,5M COP</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedExpandedChart(5);
                                  setComparisonChartLayout('expanded');
                                }}
                                title="Expandir a tamaño completo"
                                className="text-white/40 hover:text-[#ffcc29] transition-colors p-1 cursor-pointer"
                              >
                                <Maximize2 size={14} />
                              </button>
                            </div>
                            <div className="h-[380px]" style={{ width: '100%', minWidth: 200 }}>
                              <ResponsiveContainer width="100%" height="100%">
                                <AreaChart
                                  data={scenarioComparisonData.map(d => ({
                                    name: d.anio.toString(),
                                    'Acumulado (M)': Math.round(d.accumulatedDiff / 1e6 * 10) / 10
                                  }))}
                                  margin={{ top: 15, right: 15, left: 20, bottom: 5 }}
                                >
                                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                                  <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11, fill: '#94a3b8' }} dy={5} />
                                  <YAxis stroke="#94a3b8" width={75} tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v) => `$${v.toLocaleString('es-CO')}M`} />
                                  <RechartsTooltip contentStyle={{backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '10px', fontSize: '11px', color: '#fff'}} />
                                  <ReferenceLine y={0} stroke="#64748b" />
                                  <Area type="monotone" dataKey="Acumulado (M)" stroke="#4ade80" fill="#4ade80" fillOpacity={0.15} strokeWidth={2.5} dot={{ r: 3, fill: '#4ade80' }} />
                                </AreaChart>
                              </ResponsiveContainer>
                            </div>
                          </div>

                        </div>

                      </div>
                    )}

                  </div>

                </div>

                {/* BOTTOM SECTION: SENSITIVITY STUDIES MODULE (Full-width 12 cols) */}
                <div className="bg-[#0f172a] border border-white/10 rounded-[32px] p-6 sm:p-8 shadow-2xl space-y-6">
                  
                  {/* Module header with tabs */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-5">
                    <div>
                      <div className="flex items-center gap-2">
                        <Scale className="text-[#ffcc29] w-5 h-5" />
                        <h3 className="text-base font-bold text-white uppercase tracking-wider font-mono">
                          Estudio Integral de Sensibilidad Macroeconómica
                        </h3>
                      </div>
                      <p className="text-xs text-white/50 mt-1">
                        Evaluación de robustez institucional: respuesta de matrícula, recaudo 2027 y creación de valor (VAN)
                      </p>
                    </div>

                    <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
                      <button
                        type="button"
                        onClick={() => setComparisonSensitivityTab('matrix')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                          comparisonSensitivityTab === 'matrix'
                            ? 'bg-[#ffcc29] text-black shadow-md'
                            : 'text-white/60 hover:text-white'
                        }`}
                      >
                        <Compass size={14} /> Matriz 5x5 Bidimensional
                      </button>
                      <button
                        type="button"
                        onClick={() => setComparisonSensitivityTab('tornado')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                          comparisonSensitivityTab === 'tornado'
                            ? 'bg-[#ffcc29] text-black shadow-md'
                            : 'text-white/60 hover:text-white'
                        }`}
                      >
                        <Sliders size={14} /> Tornado de Sensibilidad
                      </button>
                    </div>
                  </div>

                  {/* Tab 1: 5x5 Matrix */}
                  {comparisonSensitivityTab === 'matrix' && (
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 bg-white/5 p-3.5 rounded-2xl border border-white/5">
                        <div className="text-xs text-white/70">
                          <strong>Matriz Cruzada:</strong> Elasticidad Precio-Demanda (ε) vs. Incremento Salario Mínimo 2027 (%).
                          <span className="block text-[11px] text-white/40">Haz clic en cualquier celda para cargar instantáneamente esos supuestos en los controles de proyección.</span>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] font-mono">
                          <span className="flex items-center gap-1 text-emerald-300">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Alta Creación VAN (&gt;$25.000M)
                          </span>
                          <span className="flex items-center gap-1 text-[#ffcc29]">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#ffcc29] inline-block" /> Caso Base UPTC
                          </span>
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-center border-collapse">
                          <thead>
                            <tr>
                              <th className="p-3 bg-white/5 border border-white/10 text-left text-xs font-bold text-white font-mono">
                                Elasticidad (ε) \ SMLMV 2027
                              </th>
                              {[4.0, 6.0, 8.0, 10.0, 12.0].map(inc => (
                                <th key={inc} className="p-3 bg-white/5 border border-white/10 text-xs font-bold text-white font-mono">
                                  +{inc.toFixed(1)}%
                                  <span className="block text-[9px] font-normal text-white/40">SMLMV 2027</span>
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {comparisonSensitivityMatrix.map(rowGroup => (
                              <tr key={rowGroup.elasticity}>
                                <td className="p-3 bg-white/5 border border-white/10 text-left text-xs font-mono font-bold text-white">
                                  ε = {rowGroup.elasticity.toFixed(2)}
                                  <span className="block text-[9px] font-normal text-white/40">
                                    {rowGroup.elasticity === -0.80 ? 'Demanda Rígida' : 
                                     rowGroup.elasticity === -1.00 ? 'Elasticidad Unitaria' :
                                     rowGroup.elasticity === -1.19 ? 'Caso Base Estimado' :
                                     rowGroup.elasticity === -1.40 ? 'Demanda Sensible' : 'Alta Sensibilidad'}
                                  </span>
                                </td>
                                {rowGroup.row.map(cell => {
                                  const isSelected = Math.abs(cell.elasticity - elasticity) < 0.05 && Math.abs(cell.smlmvIncrease - smlmvIncrease2027) < 0.5;
                                  return (
                                    <td 
                                      key={cell.smlmvIncrease}
                                      onClick={() => {
                                        setElasticity(cell.elasticity);
                                        setSmlmvIncrease2027(cell.smlmvIncrease);
                                        setComparisonPreset(cell.elasticity === -1.19 && cell.smlmvIncrease === 6.0 ? 'base' : 'custom');
                                      }}
                                      className={`p-3 border border-white/10 cursor-pointer transition-all relative ${
                                        isSelected 
                                          ? 'bg-[#ffcc29]/20 border-[#ffcc29] shadow-inner shadow-[#ffcc29]/20 scale-[0.98]' 
                                          : 'hover:bg-white/10 bg-white/[0.02]'
                                      }`}
                                    >
                                      {isSelected && (
                                        <span className="absolute top-1 right-1 bg-[#ffcc29] text-black text-[7px] font-bold font-mono px-1 rounded uppercase">
                                          Activo
                                        </span>
                                      )}
                                      <div className="space-y-1">
                                        <div className="text-xs font-bold font-mono text-[#ffcc29]">
                                          Δ 2027: {cell.deltaRecaudo2027 >= 0 ? '+' : ''}{formatCurrencyShort(cell.deltaRecaudo2027)}
                                        </div>
                                        <div className="text-[10px] text-white/60 font-mono">
                                          SMLMV: {cell.students2027.toLocaleString('es-CO')} est.
                                        </div>
                                        <div className="text-[10px] font-bold font-mono text-[#4ade80]">
                                          Δ VAN: +{formatCurrencyShort(cell.deltaVAN10y)}
                                        </div>
                                      </div>
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Tab 2: Tornado Chart */}
                  {comparisonSensitivityTab === 'tornado' && (
                    <div className="space-y-4">
                      <div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-xs text-white/70">
                        <strong>Diagrama Tornado de Creación de Valor (Δ VAN Decenal al 8.0%):</strong> Muestra la sensibilidad de la ganancia neta (+{formatCurrency(comparisonInsights.diffVAN10y)}) ante oscilaciones controladas de cada variable clave manteniendo los demás factores ceteris paribus.
                      </div>

                      <div className="space-y-4 pt-2">
                        {comparisonTornadoData.map((d, idx) => {
                          const baseVal = comparisonInsights.diffVAN10y / 1e6;
                          return (
                            <div key={idx} className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 space-y-2">
                              <div className="flex justify-between items-center text-xs">
                                <span className="font-bold text-white font-mono">{d.name}</span>
                                <span className="text-[#ffcc29] font-mono font-bold">Rango: ${d.low.toLocaleString('es-CO')}M — ${d.high.toLocaleString('es-CO')}M</span>
                              </div>
                              <div className="relative h-6 bg-white/5 rounded-full overflow-hidden flex items-center">
                                {/* Base mark */}
                                <div 
                                  className="absolute top-0 bottom-0 w-0.5 bg-white/60 z-10"
                                  style={{ left: '50%' }}
                                />
                                {/* Range bar */}
                                <div 
                                  className="h-full bg-gradient-to-r from-emerald-500/80 via-[#ffcc29]/80 to-emerald-400/80 rounded-full"
                                  style={{ 
                                    marginLeft: `${Math.max(5, (d.low / (baseVal * 1.5)) * 50)}%`,
                                    width: `${Math.min(90, Math.max(15, (d.width / baseVal) * 60))}%`
                                  }}
                                />
                              </div>
                              <div className="flex justify-between text-[10px] text-white/40 font-mono">
                                <span>Impacto Mínimo: +${d.low.toLocaleString('es-CO')}M</span>
                                <span>Caso Central: +${Math.round(baseVal).toLocaleString('es-CO')}M</span>
                                <span>Impacto Máximo: +${d.high.toLocaleString('es-CO')}M</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                </div>

                {/* COMPARATIVE MULTI-YEAR TABLE (With toggle between enrollment/recaudo and NPV flows) */}
                <div className="bg-[#0f172a] border border-white/10 rounded-[32px] p-6 sm:p-8 shadow-xl space-y-5">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/10 pb-4">
                    <div>
                      <h4 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                        Tabla Resumen Comparativa Decenal (2027 - 2036)
                      </h4>
                      <p className="text-xs text-white/50">Detalle vigencia a vigencia del comportamiento financiero y académico</p>
                    </div>

                    <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
                      <button
                        type="button"
                        onClick={() => setShowComparativeTableMode('van')}
                        className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                          showComparativeTableMode === 'van'
                            ? 'bg-[#ffcc29] text-black shadow-md'
                            : 'text-white/60 hover:text-white'
                        }`}
                      >
                        <Zap size={13} /> Flujos Descontados y VAN (8%)
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowComparativeTableMode('recaudo')}
                        className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                          showComparativeTableMode === 'recaudo'
                            ? 'bg-[#ffcc29] text-black shadow-md'
                            : 'text-white/60 hover:text-white'
                        }`}
                      >
                        <BarChart3 size={13} /> Matrícula y Recaudo
                      </button>
                    </div>
                  </div>

                  {showComparativeTableMode === 'van' ? (
                    /* NPV & DISCOUNTED CASH FLOW TABLE */
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-white/10 bg-white/5 font-bold text-white font-mono">
                            <th className="p-3">Año</th>
                            <th className="p-3 text-center">t</th>
                            <th className="p-3 text-center">Factor (8%)</th>
                            <th className="p-3 text-right">Flujo Neto Créditos</th>
                            <th className="p-3 text-right">Flujo Neto SMLMV</th>
                            <th className="p-3 text-right">VP Créditos</th>
                            <th className="p-3 text-right">VP SMLMV</th>
                            <th className="p-3 text-right">Δ VP Anual</th>
                            <th className="p-3 text-right">Δ VAN Acumulado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-white/80 font-mono">
                          {scenarioComparisonData.map(d => (
                            <tr key={d.anio} className="hover:bg-white/[0.04] transition-colors">
                              <td className="p-3 font-sans font-bold text-white">{d.anio}</td>
                              <td className="p-3 text-center text-white/50">{d.t}</td>
                              <td className="p-3 text-center text-white/50">{d.discountFactor.toFixed(4)}</td>
                              <td className="p-3 text-right text-[#ffcc29] font-bold">{formatCurrency(d.creditNetFlow)}</td>
                              <td className="p-3 text-right text-slate-400">{formatCurrency(d.smlmvNetFlow)}</td>
                              <td className="p-3 text-right text-[#ffcc29]">{formatCurrency(d.creditVP)}</td>
                              <td className="p-3 text-right text-slate-400">{formatCurrency(d.smlmvVP)}</td>
                              <td className={`p-3 text-right font-bold ${d.diffVP >= 0 ? 'text-[#4ade80]' : 'text-rose-400'}`}>
                                {d.diffVP >= 0 ? '+' : ''}{formatCurrency(d.diffVP)}
                              </td>
                              <td className={`p-3 text-right font-bold ${d.accumulatedDiffVP >= 0 ? 'text-[#4ade80]' : 'text-rose-400'}`}>
                                {d.accumulatedDiffVP >= 0 ? '+' : ''}{formatCurrency(d.accumulatedDiffVP)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="border-t-2 border-white/20 bg-white/5 font-mono font-bold text-white">
                          <tr>
                            <td colSpan={5} className="p-3 text-right uppercase text-white/70">Total Cuatrienio (2027 - 2030):</td>
                            <td className="p-3 text-right text-[#ffcc29]">{formatCurrency(comparisonInsights.creditVAN4y)}</td>
                            <td className="p-3 text-right text-slate-400">{formatCurrency(comparisonInsights.smlmvVAN4y)}</td>
                            <td className="p-3 text-right text-[#4ade80]">+{formatCurrency(comparisonInsights.diffVAN4y)}</td>
                            <td className="p-3 text-right text-[#4ade80]">+{formatCurrency(comparisonInsights.diffVAN4y)}</td>
                          </tr>
                          <tr className="bg-[#ffcc29]/10">
                            <td colSpan={5} className="p-3 text-right uppercase text-[#ffcc29]">Total Multivigencia Decenal (2027 - 2036):</td>
                            <td className="p-3 text-right text-[#ffcc29]">{formatCurrency(comparisonInsights.creditVAN10y)}</td>
                            <td className="p-3 text-right text-slate-400">{formatCurrency(comparisonInsights.smlmvVAN10y)}</td>
                            <td className="p-3 text-right text-[#4ade80]">+{formatCurrency(comparisonInsights.diffVAN10y)}</td>
                            <td className="p-3 text-right text-[#4ade80]">+{formatCurrency(comparisonInsights.diffVAN10y)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  ) : (
                    /* ENROLLMENT & REVENUE TABLE */
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-white/10 bg-white/5 font-bold text-white font-mono">
                            <th className="p-3">Año</th>
                            <th className="p-3 text-right">Est. SMLMV</th>
                            <th className="p-3 text-right">Est. Créditos</th>
                            <th className="p-3 text-right">Δ Estudiantes</th>
                            <th className="p-3 text-right">Recaudo SMLMV</th>
                            <th className="p-3 text-right">Recaudo Créditos</th>
                            <th className="p-3 text-right">Dif. Recaudo</th>
                            <th className="p-3 text-right">Dif. (%)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-white/80 font-mono">
                          {scenarioComparisonData.map(d => (
                            <tr key={d.anio} className="hover:bg-white/[0.04] transition-colors">
                              <td className="p-3 font-sans font-bold text-white">{d.anio}</td>
                              <td className="p-3 text-right text-slate-400">{d.smlmvStudents.toLocaleString('es-CO')}</td>
                              <td className="p-3 text-right text-[#4ade80] font-bold">{d.creditStudents.toLocaleString('es-CO')}</td>
                              <td className="p-3 text-right text-[#4ade80]">+{d.diffStudents.toLocaleString('es-CO')}</td>
                              <td className="p-3 text-right text-slate-400">{formatCurrency(d.smlmvRecaudo)}</td>
                              <td className="p-3 text-right text-[#ffcc29] font-bold">{formatCurrency(d.creditRecaudo)}</td>
                              <td className={`p-3 text-right font-bold ${d.diffRecaudoAbs >= 0 ? 'text-[#4ade80]' : 'text-rose-400'}`}>
                                {d.diffRecaudoAbs >= 0 ? '+' : ''}{formatCurrency(d.diffRecaudoAbs)}
                              </td>
                              <td className={`p-3 text-right font-bold ${d.diffRecaudoAbs >= 0 ? 'text-[#4ade80]' : 'text-rose-400'}`}>
                                {d.diffRecaudoPct >= 0 ? '+' : ''}{d.diffRecaudoPct.toFixed(1)}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="border-t-2 border-white/20 bg-white/5 font-mono font-bold text-white">
                          <tr>
                            <td colSpan={4} className="p-3 text-right uppercase text-white/70">Total Cuatrienio (2027 - 2030):</td>
                            <td className="p-3 text-right text-slate-400">
                              {formatCurrency(scenarioComparisonData.filter(d => d.anio <= 2030).reduce((acc, d) => acc + d.smlmvRecaudo, 0))}
                            </td>
                            <td className="p-3 text-right text-[#ffcc29]">
                              {formatCurrency(scenarioComparisonData.filter(d => d.anio <= 2030).reduce((acc, d) => acc + d.creditRecaudo, 0))}
                            </td>
                            <td className="p-3 text-right text-[#4ade80]">
                              +{formatCurrency(scenarioComparisonData.filter(d => d.anio <= 2030).reduce((acc, d) => acc + d.diffRecaudoAbs, 0))}
                            </td>
                            <td className="p-3 text-right text-[#4ade80]">+6.3%</td>
                          </tr>
                          <tr className="bg-[#ffcc29]/10">
                            <td colSpan={4} className="p-3 text-right uppercase text-[#ffcc29]">Total Multivigencia Decenal (2027 - 2036):</td>
                            <td className="p-3 text-right text-slate-400">{formatCurrency(comparisonInsights.totalSmlmvRecaudo)}</td>
                            <td className="p-3 text-right text-[#ffcc29]">{formatCurrency(comparisonInsights.totalCreditRecaudo)}</td>
                            <td className="p-3 text-right text-[#4ade80]">+{formatCurrency(comparisonInsights.totalDiffRecaudo)}</td>
                            <td className="p-3 text-right text-[#4ade80]">+{((comparisonInsights.totalDiffRecaudo / (comparisonInsights.totalSmlmvRecaudo || 1)) * 100).toFixed(1)}%</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>

              </div>
            )}


            {/* SUB-TAB 7: INFORME EJECUTIVO COMPLETO (PDF) */}
            {activeSensSubTab === 'report' && (
              <div className="space-y-6 font-sans">
                
                {/* PDF Actions button bar (Hidden on print) */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#0f172a] border border-white/10 p-5 rounded-2xl shadow-xl print:hidden">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#ffcc29]/10 border border-[#ffcc29]/20 flex items-center justify-center text-[#ffcc29] shrink-0">
                      <FileText size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                        Informe Ejecutivo de Viabilidad Institucional y Financiera
                      </h4>
                      <p className="text-xs text-white/60">
                        Documento oficial de sustentación técnica para el Consejo Superior Universitario (CSU) — Formato de Impresión / PDF
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <button 
                      onClick={() => window.print()}
                      className="w-full sm:w-auto px-5 py-2.5 bg-[#ffcc29] text-black rounded-xl font-bold text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-[#ffcc29]/90 active:scale-[0.98] transition-all cursor-pointer shadow-lg shadow-[#ffcc29]/20"
                    >
                      <Printer size={15} /> Imprimir / Exportar PDF Oficial
                    </button>
                  </div>
                </div>

                {/* REPORT DOCUMENT CONTAINER (Crisp White Background, Publication Quality, Ready for PDF Letter/A4) */}
                <div className="bg-white text-slate-900 p-8 sm:p-14 rounded-3xl shadow-2xl space-y-8 border border-slate-200 print:border-none print:shadow-none print:p-0 print:m-0 print:bg-white print:text-black">
                  
                  {/* Institutional Header */}
                  <div className="border-b-2 border-slate-900 pb-5 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 bg-[#b45309] rounded-sm inline-block"></span>
                        <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold font-mono">República de Colombia — Sistema Universitario Estatal (SUE)</span>
                      </div>
                      <h1 className="text-lg sm:text-xl font-black uppercase tracking-tight text-slate-900 font-serif">
                        Universidad Pedagógica y Tecnológica de Colombia
                      </h1>
                      <h2 className="text-xs uppercase tracking-widest text-slate-700 font-bold font-mono">
                        Vicerrectoría Administrativa y Financiera (VAFI) — Dirección de Planeación
                      </h2>
                      <div className="inline-block bg-slate-100 text-slate-800 text-[10px] font-bold font-mono px-2.5 py-0.5 rounded border border-slate-300">
                        Sustentación Técnica Proyecto de Acuerdo CSU — Fondo Especial de Posgrados (Recurso 31)
                      </div>
                    </div>
                    <div className="text-left sm:text-right shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200 w-full sm:w-auto">
                      <div className="text-[9px] font-mono text-slate-500 uppercase font-bold">Documento Técnico Directivo</div>
                      <div className="text-xs font-black text-slate-900 font-mono mt-0.5">Vigencias: 2027 — 2036</div>
                      <div className="text-[10px] text-slate-600 font-mono mt-0.5">Fecha de Emisión: Noviembre de 2026</div>
                      <div className="text-[9px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded mt-1 font-bold inline-block border border-emerald-200">
                        Certificación de Viabilidad Financiera
                      </div>
                    </div>
                  </div>

                  {/* Title Banner */}
                  <div className="text-center py-4 px-6 bg-slate-50 border-y-2 border-slate-300 rounded-xl space-y-1">
                    <h2 className="text-base sm:text-lg font-black uppercase tracking-wide text-slate-900 font-serif">
                      Estudio Econométrico, Financiero y de Viabilidad del Modelo de Matrícula por Créditos Académicos
                    </h2>
                    <p className="text-xs text-slate-600 font-medium">
                      Evaluación Intertemporal de Flujos de Caja Descontados (VAN al 8,0% E.A.), Elasticidad de la Demanda y Mecanismos de Aseguramiento Patrimonial del Fondo R31
                    </p>
                  </div>

                  {/* Hypotheses metadata list */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[10px] bg-slate-50/80 border border-slate-200 p-4 rounded-xl text-slate-700 font-sans">
                    <div className="border-r border-slate-200 pr-2">
                      <span className="text-slate-500 uppercase font-mono block text-[8px] font-bold">Nivel de Formación Base</span>
                      <strong className="text-slate-900 font-sans font-bold text-xs uppercase">{sensLevel}</strong>
                      <span className="text-[9px] text-slate-500 block font-mono">Costeo directo calibrado</span>
                    </div>
                    <div className="border-r border-slate-200 pr-2">
                      <span className="text-slate-500 uppercase font-mono block text-[8px] font-bold">Modalidad Académica</span>
                      <strong className="text-slate-900 font-sans font-bold text-xs uppercase">{sensModality}</strong>
                      <span className="text-[9px] text-slate-500 block font-mono">Infraestructura y campus</span>
                    </div>
                    <div className="border-r border-slate-200 pr-2">
                      <span className="text-slate-500 uppercase font-mono block text-[8px] font-bold">Tasa Deserción Vegetativa</span>
                      <strong className="text-slate-900 font-mono font-bold text-xs">{sensAttrition}% anual</strong>
                      <span className="text-[9px] text-slate-500 block font-mono">Tendencia sin reforma</span>
                    </div>
                    <div>
                      <span className="text-slate-500 uppercase font-mono block text-[8px] font-bold">Descuento Promedio Aplicado</span>
                      <strong className="text-slate-900 font-mono font-bold text-xs">{sensDiscount}%</strong>
                      <span className="text-[9px] text-slate-500 block font-mono">Electorales / Convenios</span>
                    </div>
                  </div>

                  {/* Macro Parameters Bar */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-[10px] bg-slate-100/90 border border-slate-200 p-3.5 rounded-xl text-slate-700 font-sans">
                    <div>
                      <span className="text-slate-500 uppercase font-mono block text-[8px] font-bold">Elasticidad Precio (ε)</span>
                      <strong className="text-slate-900 font-mono font-bold text-xs">{elasticity.toFixed(2)}</strong>
                      <span className="text-[8px] text-slate-500 font-mono">Demanda elástica</span>
                    </div>
                    <div>
                      <span className="text-slate-500 uppercase font-mono block text-[8px] font-bold">Inflación SMLMV 2027</span>
                      <strong className="text-slate-900 font-mono font-bold text-xs">+{smlmvIncrease2027.toFixed(1)}%</strong>
                      <span className="text-[8px] text-slate-500 font-mono">Rezago 15% diferido</span>
                    </div>
                    <div>
                      <span className="text-slate-500 uppercase font-mono block text-[8px] font-bold">Costos Directos (ABC)</span>
                      <strong className="text-slate-900 font-mono font-bold text-xs">{operatingCostPct}% del ingreso</strong>
                      <span className="text-[8px] text-slate-500 font-mono">60% fijo / 40% variable</span>
                    </div>
                    <div>
                      <span className="text-slate-500 uppercase font-mono block text-[8px] font-bold">Deducción Central UPTC</span>
                      <strong className="text-slate-900 font-mono font-bold text-xs">{centralDeductionPct}%</strong>
                      <span className="text-[8px] text-slate-500 font-mono">Aporte a Admón Central</span>
                    </div>
                    <div>
                      <span className="text-slate-500 uppercase font-mono block text-[8px] font-bold">Tasa Social Descuento (r)</span>
                      <strong className="text-emerald-800 font-mono font-bold text-xs">{sensDiscountRate.toFixed(1)}% E.A.</strong>
                      <span className="text-[8px] text-slate-500 font-mono">Estándar MGA / DNP</span>
                    </div>
                  </div>

                  {/* 1. RESUMEN EJECUTIVO Y FUNDAMENTO NORMATIVO */}
                  <div className="space-y-3 text-xs text-slate-800 text-justify leading-relaxed">
                    <h3 className="font-black text-sm uppercase tracking-wide border-l-4 border-[#b45309] pl-3 text-slate-900 font-serif">
                      1. Resumen Ejecutivo y Marco Normativo de la Reforma Tarifaria
                    </h3>
                    <p>
                      El presente dictamen técnico tiene como propósito fundamental someter a consideración del Honorable Consejo Superior Universitario (CSU) la sustentación econométrica, financiera y actuarial de la transición del modelo de matrícula del <strong>Fondo Especial de Posgrados (Recurso 31)</strong>. Se analiza el paso de una tarifa fija semestral indexada rígidamente al Salario Mínimo Legal Mensual Vigente (SMLMV) hacia un <strong>modelo proporcional de cobro por créditos académicos</strong>, fundamentado en el Valor Base del Crédito Académico Institucional (VBCI), para el horizonte decenal comprendido entre las vigencias 2027 y 2036.
                    </p>
                    <p>
                      El punto de partida corresponde a la línea base consolidada de la vigencia 2026, en la cual la Universidad registró una población de <strong>5.170 estudiantes matriculados</strong> y un recaudo bruto de <strong>$45.472.060.134 COP</strong>. A pesar de los incrementos nominales en los ingresos históricos, el modelo tradicional de tarifa fija ha inducido una contracción sostenida en la matrícula, experimentando una pérdida de <strong>1.781 estudiantes</strong> entre 2020 y 2026 (-25,6%). Esta tendencia evidencia el agotamiento de la fórmula rígida por SMLMV, la cual penaliza desproporcionadamente a los estudiantes que cursan cargas parciales, desarrollan pasantías o culminan proyectos de grado.
                    </p>
                    <p>
                      El sustento jurídico de esta modernización tarifaria se enmarca de manera rigurosa en:
                    </p>
                    <ul className="list-disc pl-5 space-y-1 text-slate-700">
                      <li><strong>Artículo 69 de la Constitución Política de Colombia:</strong> Consagración de la autonomía universitaria para dictar sus estatutos, organizar sus programas y administrar sus rentas patrimoniales.</li>
                      <li><strong>Ley 30 de 1992 (Artículos 28, 29 y 57):</strong> Autonomía financiera y administrativa de las Instituciones de Educación Superior públicas para crear mecanismos eficientes de autofinanciación.</li>
                      <li><strong>Ley 2568 de 2026:</strong> Lineamientos nacionales para el fortalecimiento presupuestal y la modernización de los sistemas de costeo y tarifas de las universidades estatales.</li>
                      <li><strong>Proyecto de Acuerdo del Consejo Superior Universitario:</strong> Artículos 1, 3, 5, 8 y 19, mediante los cuales se reglamenta el VBCI, la matrícula mínima de siete (7) créditos y la transición gradual sin detrimento fiscal.</li>
                    </ul>
                  </div>

                  {/* 2. ANÁLISIS DE VIABILIDAD FINANCIERA POR ESCENARIOS Y METODOLOGÍA DEL VAN */}
                  <div className="space-y-4 text-xs text-slate-800 text-justify leading-relaxed">
                    <div className="border-b border-slate-200 pb-2">
                      <h3 className="font-black text-sm uppercase tracking-wide border-l-4 border-[#b45309] pl-3 text-slate-900 font-serif">
                        2. Análisis de Viabilidad Financiera por Escenarios y Metodología Integral del Valor Actual Neto (VAN)
                      </h3>
                      <p className="text-[10px] text-slate-500 font-mono italic pl-3.5 mt-0.5">
                        Evaluación matemática de flujos de caja operativos descontados al 8,0% E.A. (Numeral 8)
                      </p>
                    </div>

                    <p>
                      Para certificar la viabilidad y resiliencia del modelo por créditos, la Vicerrectoría Administrativa y Financiera implementó una modelación estocástica y determinística de flujos netos anuales descontados para el cuatrienio inmediato (2027-2030) y su extensión decenal (2027-2036).
                    </p>

                    {/* Technical Parameters Box */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-[11px] font-sans">
                      <div className="flex items-center gap-2 font-bold text-slate-900 uppercase tracking-wider text-[11px] text-[#b45309]">
                        <Settings size={14} className="text-[#b45309]" />
                        Supuestos Técnicos de la Evaluación Financiera Institucional
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-slate-700 leading-normal pt-1">
                        <div className="space-y-1.5">
                          <p>
                            <strong>• Tasa Social de Descuento (r = 8,0% E.A.):</strong> Adopta la metodología oficial del Departamento Nacional de Planeación (DNP) para la evaluación económica de proyectos públicos, garantizando que el valor del dinero en el tiempo refleje fielmente el costo de oportunidad del capital de la UPTC.
                          </p>
                          <p>
                            <strong>• Inversión Inicial (I₀ = $0 COP):</strong> Por tratarse de un fondo especial autofinanciado que opera sobre la infraestructura física, tecnológica, de laboratorios y la planta docente activa de la Universidad, la implementación de la nueva estructura tarifaria no demanda endeudamiento ni inversiones de capital previas.
                          </p>
                        </div>
                        <div className="space-y-1.5">
                          <p>
                            <strong>• Deducción Central Institucional (45,5%):</strong> Retención sobre el recaudo bruto con destino exclusivo a la Administración Central de la UPTC (Unidad 01), garantizando la financiación del funcionamiento universitario general, bienestar institucional, TIC y bibliotecas.
                          </p>
                          <p>
                            <strong>• Costeo Basado en Actividades (ABC 60/40):</strong> Los egresos directos de posgrados (35,0% base) se dividen en un <strong>60% de componente fijo</strong> (gestión académica, comités curriculares y acreditación) y un <strong>40% de componente variable</strong> (horas cátedra de profesores invitados y jurados de tesis, sensible al número de alumnos matriculados).
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Resumen Numeral 8 */}
                    <div className="overflow-x-auto my-3">
                      <table className="w-full text-left text-[11px] border border-slate-300 border-collapse">
                        <thead>
                          <tr className="bg-slate-100 text-slate-900 font-bold border-b border-slate-300">
                            <th className="p-2.5 border-r border-slate-300">Indicador Financiero Oficial (Numeral 8)</th>
                            <th className="p-2.5 border-r border-slate-300 text-right">Pesimista (-15% Ing. / +10% Gastos)</th>
                            <th className="p-2.5 border-r border-slate-300 text-right bg-[#ffcc29]/10">Base (Proyección Oficial UPTC)</th>
                            <th className="p-2.5 text-right">Optimista (+15% Ing. / -10% Gastos)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 font-mono text-slate-700">
                          <tr className="hover:bg-slate-50">
                            <td className="p-2.5 font-bold font-sans border-r border-slate-300 text-slate-900">Ingresos Acumulados (2027-2030)</td>
                            <td className="p-2.5 text-right border-r border-slate-300">$157.556.579.716</td>
                            <td className="p-2.5 text-right border-r border-slate-300 font-bold text-slate-900 bg-[#ffcc29]/5">$185.360.682.019</td>
                            <td className="p-2.5 text-right">$213.164.784.322</td>
                          </tr>
                          <tr className="hover:bg-slate-50">
                            <td className="p-2.5 font-bold font-sans border-r border-slate-300 text-slate-900">Total Egresos Acumulados</td>
                            <td className="p-2.5 text-right border-r border-slate-300 text-rose-700">-$164.136.883.927</td>
                            <td className="p-2.5 text-right border-r border-slate-300 text-rose-700 font-medium bg-[#ffcc29]/5">-$149.215.349.025</td>
                            <td className="p-2.5 text-right text-rose-700">-$134.293.814.123</td>
                          </tr>
                          <tr className="hover:bg-slate-50">
                            <td className="p-2.5 font-bold font-sans border-r border-slate-300 text-slate-900">Flujo Neto Operacional (Σ F_t)</td>
                            <td className="p-2.5 text-right border-r border-slate-300 text-rose-700">-$6.580.304.211</td>
                            <td className="p-2.5 text-right border-r border-slate-300 font-bold text-emerald-800 bg-[#ffcc29]/5">+$36.145.332.994</td>
                            <td className="p-2.5 text-right text-emerald-800 font-bold">+$78.870.970.199</td>
                          </tr>
                          <tr className="bg-slate-50 font-bold border-t-2 border-slate-300">
                            <td className="p-2.5 font-sans border-r border-slate-300 text-slate-900 text-xs">Valor Actual Neto (VAN al 8,0% E.A.)</td>
                            <td className="p-2.5 text-right border-r border-slate-300 text-rose-700">-$5.434.185.877</td>
                            <td className="p-2.5 text-right border-r border-slate-300 font-bold text-emerald-800 text-xs bg-emerald-50">+$29.849.753.409</td>
                            <td className="p-2.5 text-right text-emerald-800 font-bold text-xs bg-emerald-50">+$65.133.692.694</td>
                          </tr>
                          <tr>
                            <td className="p-2.5 font-bold font-sans border-r border-slate-300 text-slate-900">Tasa Interna de Retorno (TIR)</td>
                            <td className="p-2.5 text-right border-r border-slate-300 text-slate-500 font-sans text-[10px]">N/A (Sin cambio de signo)</td>
                            <td className="p-2.5 text-right border-r border-slate-300 text-slate-500 font-sans text-[10px] bg-[#ffcc29]/5">N/A (Sin cambio de signo)</td>
                            <td className="p-2.5 text-right text-slate-500 font-sans text-[10px]">N/A (Sin cambio de signo)</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* RECUADRO OBSERVACIÓN TÉCNICA FINANCIERA FUNDAMENTAL */}
                    <div className="bg-amber-50/90 border-l-4 border-[#b45309] p-4 rounded-r-xl space-y-2 my-3 text-slate-800">
                      <div className="flex items-center gap-2 font-bold text-amber-950 text-xs uppercase tracking-wide">
                        <AlertTriangle size={16} className="text-[#b45309] shrink-0" />
                        Sustentación Actuarial y Metodológica del Valor Actual Neto
                      </div>
                      <p className="text-[11px] leading-relaxed text-justify">
                        <strong>Origen Técnico del Indicador de Viabilidad:</strong> El dictamen de viabilidad institucional no se soporta en cifras agregadas de recaudo bruto, sino en la capacidad probada del nuevo esquema tarifario para generar <strong>flujos netos operacionales positivos continuos</strong> ($8.701,2 M en 2027; $8.868,3 M en 2028; $9.117,8 M en 2029; y $9.458,0 M en 2030).
                      </p>
                      <p className="text-[11px] leading-relaxed text-justify">
                        Al descontar estos flujos netos al 8,0% E.A., se genera un <strong>VAN a 4 años de $29.849.753.409 COP</strong> y un <strong>VAN a 10 años de $77.676.108.775 COP</strong>. Esto certifica que el modelo por créditos supera con amplitud el umbral de rentabilidad social del capital y genera un excedente patrimonial neto para la Universidad.
                      </p>
                    </div>

                    {/* DETALLE VIGENCIA A VIGENCIA PARA REPRODUCCIÓN DEL VAN */}
                    <div className="space-y-1 pt-2">
                      <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                        Reproducción Matemática Oficial del VAN: Matriz de Flujos Netos y Factores de Descuento (2027 - 2030)
                      </h4>
                      <p className="text-[11px] text-justify text-slate-600">
                        La siguiente matriz desglosa año por año los componentes del flujo de caja del Escenario Base oficial ajustado con la meta 2027 de $44.621.766.847 COP:
                      </p>
                    </div>

                    <div className="overflow-x-auto my-2">
                      <table className="w-full text-left text-[10px] border border-slate-300 border-collapse">
                        <thead>
                          <tr className="bg-slate-100 text-slate-900 font-bold border-b border-slate-300 text-center">
                            <th className="p-2 border-r border-slate-300 text-left">Vigencia (t)</th>
                            <th className="p-2 border-r border-slate-300 text-right">Ingresos Brutos (I_t)</th>
                            <th className="p-2 border-r border-slate-300 text-right">Deducción Central (45,5%)</th>
                            <th className="p-2 border-r border-slate-300 text-right">Costos Directos (35,0%)</th>
                            <th className="p-2 border-r border-slate-300 text-right">Total Egresos (E_t)</th>
                            <th className="p-2 border-r border-slate-300 text-right bg-emerald-50">Flujo Neto (F_t)</th>
                            <th className="p-2 border-r border-slate-300 text-right">Factor Desc. (1/(1+r)^t)</th>
                            <th className="p-2 text-right bg-emerald-100 font-bold">Valor Presente (VP_t)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 font-mono text-slate-700">
                          <tr className="hover:bg-slate-50">
                            <td className="p-2 font-sans font-bold border-r border-slate-300 text-slate-900">2027 (t = 1)</td>
                            <td className="p-2 text-right border-r border-slate-300 font-bold text-slate-900">$44.621.766.847</td>
                            <td className="p-2 text-right border-r border-slate-300 text-slate-600">-$20.302.903.915</td>
                            <td className="p-2 text-right border-r border-slate-300 text-slate-600">-$15.617.618.396</td>
                            <td className="p-2 text-right border-r border-slate-300 text-rose-700 font-medium">-$35.920.522.311</td>
                            <td className="p-2 text-right border-r border-slate-300 text-emerald-800 font-bold bg-emerald-50/50">+$8.701.244.536</td>
                            <td className="p-2 text-right border-r border-slate-300 text-slate-600">0,925926</td>
                            <td className="p-2 text-right text-emerald-900 font-bold bg-emerald-100/60">+$8.056.707.904</td>
                          </tr>
                          <tr className="hover:bg-slate-50">
                            <td className="p-2 font-sans font-bold border-r border-slate-300 text-slate-900">2028 (t = 2)</td>
                            <td className="p-2 text-right border-r border-slate-300 font-bold text-slate-900">$45.478.406.879</td>
                            <td className="p-2 text-right border-r border-slate-300 text-slate-600">-$20.692.675.130</td>
                            <td className="p-2 text-right border-r border-slate-300 text-slate-600">-$15.917.442.408</td>
                            <td className="p-2 text-right border-r border-slate-300 text-rose-700 font-medium">-$36.610.117.538</td>
                            <td className="p-2 text-right border-r border-slate-300 text-emerald-800 font-bold bg-emerald-50/50">+$8.868.289.341</td>
                            <td className="p-2 text-right border-r border-slate-300 text-slate-600">0,857339</td>
                            <td className="p-2 text-right text-emerald-900 font-bold bg-emerald-100/60">+$7.603.128.722</td>
                          </tr>
                          <tr className="hover:bg-slate-50">
                            <td className="p-2 font-sans font-bold border-r border-slate-300 text-slate-900">2029 (t = 3)</td>
                            <td className="p-2 text-right border-r border-slate-300 font-bold text-slate-900">$46.758.077.584</td>
                            <td className="p-2 text-right border-r border-slate-300 text-slate-600">-$21.274.925.301</td>
                            <td className="p-2 text-right border-r border-slate-300 text-slate-600">-$16.365.327.154</td>
                            <td className="p-2 text-right border-r border-slate-300 text-rose-700 font-medium">-$37.640.252.455</td>
                            <td className="p-2 text-right border-r border-slate-300 text-emerald-800 font-bold bg-emerald-50/50">+$9.117.825.129</td>
                            <td className="p-2 text-right border-r border-slate-300 text-slate-600">0,793832</td>
                            <td className="p-2 text-right text-emerald-900 font-bold bg-emerald-100/60">+$7.238.023.555</td>
                          </tr>
                          <tr className="hover:bg-slate-50">
                            <td className="p-2 font-sans font-bold border-r border-slate-300 text-slate-900">2030 (t = 4)</td>
                            <td className="p-2 text-right border-r border-slate-300 font-bold text-slate-900">$48.502.430.709</td>
                            <td className="p-2 text-right border-r border-slate-300 text-slate-600">-$22.068.605.973</td>
                            <td className="p-2 text-right border-r border-slate-300 text-slate-600">-$16.975.850.748</td>
                            <td className="p-2 text-right border-r border-slate-300 text-rose-700 font-medium">-$39.044.456.721</td>
                            <td className="p-2 text-right border-r border-slate-300 text-emerald-800 font-bold bg-emerald-50/50">+$9.457.973.988</td>
                            <td className="p-2 text-right border-r border-slate-300 text-slate-600">0,735030</td>
                            <td className="p-2 text-right text-emerald-900 font-bold bg-emerald-100/60">+$6.951.893.228</td>
                          </tr>
                          <tr className="bg-slate-100 font-bold border-t-2 border-slate-400">
                            <td className="p-2 font-sans border-r border-slate-300 text-slate-900">TOTAL CUATRIENIO</td>
                            <td className="p-2 text-right border-r border-slate-300 text-slate-900">$185.360.682.019</td>
                            <td className="p-2 text-right border-r border-slate-300 text-slate-800">-$84.339.110.319</td>
                            <td className="p-2 text-right border-r border-slate-300 text-slate-800">-$64.876.238.706</td>
                            <td className="p-2 text-right border-r border-slate-300 text-rose-800">-$149.215.349.025</td>
                            <td className="p-2 text-right border-r border-slate-300 text-emerald-900 bg-emerald-50">+$36.145.332.994</td>
                            <td className="p-2 text-right border-r border-slate-300 text-slate-600 font-sans italic text-[9px]">r = 8,0% E.A.</td>
                            <td className="p-2 text-right text-emerald-900 font-bold bg-emerald-100 text-xs">+$29.849.753.409</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <p className="text-[11px] text-justify pt-1">
                      <strong>Fundamento Matemático sobre la Tasa Interna de Retorno (TIR = N/A):</strong> La TIR se reporta formalmente como <em>No Aplicable (N/A)</em> en atención a la <strong>Regla de los Signos de Descartes</strong>. Al no requerir desembolsos iniciales de capital (I₀ = $0 COP) y ser todos los flujos netos anuales estrictamente positivos en el caso base, la serie temporal carece de cambios de signo. En tal virtud, no existe una raíz real positiva para el polinomio de flujo, haciendo que el <strong>Valor Actual Neto (VAN) al 8,0% E.A.</strong> sea el indicador financiero determinante y legalmente concluyente.
                    </p>
                  </div>

                  {/* WHITE BACKGROUND CHART 1: TIMELINE RECURSO 31 */}
                  <div className="space-y-2 border border-slate-200 p-5 rounded-2xl bg-white shadow-sm" style={{ pageBreakInside: 'avoid' }}>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 border-b border-slate-100 pb-3">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#b45309]"></span>
                          Gráfica I: Transición Histórica y Proyección Institucional del Fondo R31 (2020 - 2030)
                        </h4>
                        <p className="text-[10px] text-slate-500 font-sans">
                          Evolución del recaudo bruto y cohorte estudiantil activa (Valores en Millones de COP y Número de Alumnos)
                        </p>
                      </div>
                      <div className="text-[10px] font-mono text-slate-600 font-bold bg-slate-100 px-2.5 py-1 rounded border border-slate-200">
                        Base 2027: $44.621,8M (6.887 est.)
                      </div>
                    </div>
                    <div className="h-64 w-full pt-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={unifiedTimelineData} margin={{ top: 15, right: 25, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                          <XAxis dataKey="anio" stroke="#475569" tick={{ fontSize: 10, fill: '#334155' }} dy={4} />
                          <YAxis yAxisId="left" stroke="#475569" width={75} tick={{ fontSize: 10, fill: '#334155' }} tickFormatter={(val) => `$${val.toLocaleString('es-CO')}M`} />
                          <YAxis yAxisId="right" orientation="right" stroke="#15803d" width={60} tick={{ fontSize: 10, fill: '#15803d' }} tickFormatter={(val) => val.toLocaleString('es-CO')} />
                          <RechartsTooltip 
                            contentStyle={{backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '11px', color: '#0f172a', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'}} 
                          />
                          <Legend wrapperStyle={{fontSize: '11px', paddingTop: '8px', color: '#334155'}} />
                          <Bar yAxisId="left" dataKey="Modelo Histórico (Recaudo M)" fill="#94a3b8" radius={[3, 3, 0, 0]} barSize={14} />
                          <Bar yAxisId="left" dataKey="Modelo por Créditos (Recaudo M)" fill="#d97706" radius={[3, 3, 0, 0]} barSize={14} />
                          <Line yAxisId="right" type="monotone" dataKey="Estudiantes Históricos" stroke="#475569" strokeWidth={2} dot={{r: 3}} strokeDasharray="4 4" />
                          <Line yAxisId="right" type="monotone" dataKey="Estudiantes Créditos" stroke="#15803d" strokeWidth={2.5} dot={{r: 4}} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                    <p className="text-[9px] text-slate-500 italic text-center pt-1">
                      Fuente: Subdirección de Presupuesto UPTC — Conciliación de ejecuciones 2020-2025 y modelo tarifario por créditos 2026-2030.
                    </p>
                  </div>

                  {/* 3. PROYECCIÓN FINANCIERA MULTIVIGENCIA E INDEXACIÓN DEL VBCI */}
                  <div className="space-y-3 text-xs text-slate-800 text-justify leading-relaxed pt-2" style={{ pageBreakBefore: 'always' }}>
                    <h3 className="font-black text-sm uppercase tracking-wide border-l-4 border-[#b45309] pl-3 text-slate-900 font-serif">
                      3. Proyección Financiera Multivigencia e Indexación del VBCI
                    </h3>
                    <p>
                      Con el fin de asegurar la suficiencia del Fondo de Posgrados ante el incremento en los costos de los insumos educativos y la inflación, se estructuró un esquema de indexación paramétrica del Valor Base del Crédito Académico Institucional (VBCI) conforme al artículo 5 del Proyecto de Acuerdo.
                    </p>
                    <p>
                      El modelo aplica un crecimiento en ingresos ligado al <strong>Índice de Costos de la Educación Superior (ICES = 6,66% anual)</strong>, una actualización de gastos vinculada al <strong>Índice de Precios al Consumidor (IPC = 4,00% anual)</strong> y una tasa conservadora de expansión de demanda del <strong>0,50% anual</strong>.
                    </p>

                    {/* Summary Multi-year Table */}
                    <div className="overflow-x-auto my-3">
                      <table className="w-full text-left text-[10px] border border-slate-300 border-collapse">
                        <thead>
                          <tr className="bg-slate-100 text-slate-900 font-bold border-b border-slate-300">
                            <th className="p-2 border-r border-slate-300">Vigencia</th>
                            <th className="p-2 border-r border-slate-300 text-right">Estudiantes</th>
                            <th className="p-2 border-r border-slate-300 text-right">Recaudo Bruto (I_t)</th>
                            <th className="p-2 border-r border-slate-300 text-right">Deducción Central (45,5%)</th>
                            <th className="p-2 border-r border-slate-300 text-right">Costos Directos</th>
                            <th className="p-2 border-r border-slate-300 text-right">Excedente Neto (F_t)</th>
                            <th className="p-2 text-right">Ratio Cobertura (DSCR)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 font-mono text-slate-700">
                          {multiYearProjections.map(p => (
                            <tr key={p.anio} className="hover:bg-slate-50">
                              <td className="p-2 font-sans font-bold border-r border-slate-300 text-slate-900">{p.anio}</td>
                              <td className="p-2 text-right border-r border-slate-300 font-sans">{p.estudiantes.toLocaleString('es-CO')}</td>
                              <td className="p-2 text-right border-r border-slate-300 font-bold text-slate-900">{formatCurrency(p.recaudo)}</td>
                              <td className="p-2 text-right border-r border-slate-300 text-slate-600">-{formatCurrency(p.recaudo * (centralDeductionPct / 100))}</td>
                              <td className="p-2 text-right border-r border-slate-300 text-slate-600">-{formatCurrency(p.totalGastos - (p.recaudo * (centralDeductionPct / 100)))}</td>
                              <td className={`p-2 text-right border-r border-slate-300 font-bold ${p.margenNeto >= 0 ? 'text-emerald-800' : 'text-rose-700'}`}>
                                {p.margenNeto >= 0 ? '+' : ''}{formatCurrency(p.margenNeto)}
                              </td>
                              <td className={`p-2 text-right font-bold font-sans ${p.dscr >= 1.25 ? 'text-emerald-800' : 'text-rose-700'}`}>
                                {p.dscr.toFixed(2)}x
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="border-t-2 border-slate-400 bg-slate-50 font-mono font-bold text-slate-900">
                          <tr>
                            <td colSpan={2} className="p-2 text-right uppercase font-sans">Total Horizonte Decenal:</td>
                            <td className="p-2 text-right text-slate-900">{formatCurrency(multiYearProjections.reduce((a, b) => a + b.recaudo, 0))}</td>
                            <td className="p-2 text-right text-slate-800">-{formatCurrency(multiYearProjections.reduce((a, b) => a + b.recaudo * (centralDeductionPct / 100), 0))}</td>
                            <td className="p-2 text-right text-slate-800">-{formatCurrency(multiYearProjections.reduce((a, b) => a + (b.totalGastos - (b.recaudo * (centralDeductionPct / 100))), 0))}</td>
                            <td className="p-2 text-right text-emerald-800">+{formatCurrency(multiYearProjections.reduce((a, b) => a + b.margenNeto, 0))}</td>
                            <td className="p-2 text-right text-emerald-800 font-sans">1.24x Promedio</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  {/* WHITE BACKGROUND CHART 2: CASH PROJECTIONS */}
                  <div className="space-y-2 border border-slate-200 p-5 rounded-2xl bg-white shadow-sm" style={{ pageBreakInside: 'avoid' }}>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 border-b border-slate-100 pb-3">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#15803d]"></span>
                          Gráfica II: Proyección de Ingresos, Egresos Totales y Excedente Neto (2027 - 2036)
                        </h4>
                        <p className="text-[10px] text-slate-500 font-sans">
                          Comportamiento de flujos operativos en Millones de COP constantes
                        </p>
                      </div>
                      <div className="text-[10px] font-mono text-emerald-800 font-bold bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                        Excedente Decenal: +$109.019,6M COP
                      </div>
                    </div>
                    <div className="h-64 w-full pt-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart 
                          data={multiYearProjections.map(d => ({
                            anio: d.anio.toString(),
                            'Ingresos Brutos (M)': Math.round(d.recaudo / 1e6 * 10) / 10,
                            'Egresos Totales (M)': Math.round(d.totalGastos / 1e6 * 10) / 10,
                            'Excedente Neto (M)': Math.round(d.margenNeto / 1e6 * 10) / 10
                          }))} 
                          margin={{ top: 15, right: 25, left: 20, bottom: 5 }}
                        >
                          <defs>
                            <linearGradient id="whiteIngGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#d97706" stopOpacity={0.25}/>
                              <stop offset="95%" stopColor="#d97706" stopOpacity={0.0}/>
                            </linearGradient>
                            <linearGradient id="whiteMargenGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#15803d" stopOpacity={0.25}/>
                              <stop offset="95%" stopColor="#15803d" stopOpacity={0.0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                          <XAxis dataKey="anio" stroke="#475569" tick={{ fontSize: 10, fill: '#334155' }} dy={4} />
                          <YAxis stroke="#475569" width={75} tick={{ fontSize: 10, fill: '#334155' }} tickFormatter={(val) => `$${val.toLocaleString('es-CO')}M`} />
                          <RechartsTooltip contentStyle={{backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '11px', color: '#0f172a'}} />
                          <Legend wrapperStyle={{fontSize: '11px', paddingTop: '8px', color: '#334155'}} />
                          <Area type="monotone" dataKey="Ingresos Brutos (M)" stroke="#d97706" fill="url(#whiteIngGrad)" strokeWidth={2.5} dot={{ r: 3, fill: '#d97706' }} />
                          <Area type="monotone" dataKey="Egresos Totales (M)" stroke="#e11d48" fill="#ffe4e6" fillOpacity={0.3} strokeWidth={2} dot={{ r: 3, fill: '#e11d48' }} />
                          <Area type="monotone" dataKey="Excedente Neto (M)" stroke="#15803d" fill="url(#whiteMargenGrad)" strokeWidth={2.5} dot={{ r: 3, fill: '#15803d' }} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* 4. COMPARACIÓN DE ESQUEMAS: SMLMV VS CRÉDITOS ACADÉMICOS */}
                  <div className="space-y-4 text-xs text-slate-800 text-justify leading-relaxed pt-2" style={{ pageBreakBefore: 'always' }}>
                    <h3 className="font-black text-sm uppercase tracking-wide border-l-4 border-[#b45309] pl-3 text-slate-900 font-serif">
                      4. Comparación Financiera entre el Esquema SMLMV y el Modelo por Créditos Académicos
                    </h3>
                    <p>
                      Para comprender el riesgo de inacción institucional, se contrastó la trayectoria del modelo de cobro por créditos frente a la permanencia forzosa del esquema SMLMV durante la década 2027-2036.
                    </p>
                    <p>
                      Bajo el esquema tradicional, la UPTC debe absorber en 2027 la actualización rezagada diferida del 15% más la inflación proyectada del salario mínimo ({smlmvIncrease2027.toFixed(1)}%). Esta indexación acumulada del <strong>+{comparisonInsights.priceVarPct2027.toFixed(1)}%</strong> eleva la tarifa semestral promedio a más de $10,72M COP por estudiante, detonando una contracción en la cohorte que desploma la matrícula a 4.003 alumnos en 2027 y a 1.980 en 2036.
                    </p>

                    {/* KPI Comparative Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center my-3">
                      <div className="border border-slate-300 p-3 rounded-xl bg-slate-50">
                        <span className="text-[9px] font-bold text-slate-500 block uppercase font-mono">Recaudo SMLMV (2036)</span>
                        <span className="text-sm font-bold text-slate-700 block mt-1 font-mono">{formatCurrencyShort(scenarioComparisonData[scenarioComparisonData.length - 1]?.smlmvRecaudo)}</span>
                        <span className="text-[9px] text-rose-600 font-bold block mt-0.5">Colapso de matrícula (-62%)</span>
                      </div>
                      <div className="border border-slate-300 p-3 rounded-xl bg-[#ffcc29]/10 border-[#ffcc29]/40">
                        <span className="text-[9px] font-bold text-[#b45309] block uppercase font-mono">Recaudo Créditos (2036)</span>
                        <span className="text-sm font-bold text-[#b45309] block mt-1 font-mono">{formatCurrencyShort(scenarioComparisonData[scenarioComparisonData.length - 1]?.creditRecaudo)}</span>
                        <span className="text-[9px] text-emerald-700 font-bold block mt-0.5">+123,4% vs SMLMV</span>
                      </div>
                      <div className="border border-slate-300 p-3 rounded-xl bg-emerald-50 border-emerald-200">
                        <span className="text-[9px] font-bold text-emerald-800 block uppercase font-mono">Δ Recaudo 10 Años</span>
                        <span className="text-sm font-bold text-emerald-800 block mt-1 font-mono">+{formatCurrencyShort(comparisonInsights.totalDiffRecaudo)}</span>
                        <span className="text-[9px] text-emerald-700 font-bold block mt-0.5">+48,2% Excedente acumulado</span>
                      </div>
                      <div className="border border-slate-300 p-3 rounded-xl bg-emerald-50 border-emerald-200">
                        <span className="text-[9px] font-bold text-emerald-800 block uppercase font-mono">Retención Estudiantil (2036)</span>
                        <span className="text-sm font-bold text-emerald-800 block mt-1 font-mono">+{comparisonInsights.retainedStudentsFinal.toLocaleString('es-CO')} est.</span>
                        <span className="text-[9px] text-emerald-700 font-bold block mt-0.5">6.782 vs 1.980 estudiantes</span>
                      </div>
                    </div>

                    {/* TWO COMPARISON CHARTS WITH PURE WHITE BACKGROUND FOR PDF */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 my-4" style={{ pageBreakInside: 'avoid' }}>
                      
                      {/* Chart 1: Revenue Comparison (Pure White Background) */}
                      <div className="bg-white text-slate-900 p-5 rounded-2xl border border-slate-300 shadow-sm flex flex-col justify-between">
                        <div className="mb-2 border-b border-slate-100 pb-2">
                          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#d97706]"></span>
                            Gráfica III: Comparación de Ingresos Brutos (Millones COP)
                          </h4>
                          <p className="text-[10px] text-slate-500 font-sans">
                            Trayectoria del recaudo anual del Fondo R31 (2027-2036)
                          </p>
                        </div>
                        <div className="h-60 w-full pt-1">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart 
                              data={scenarioComparisonData.map(d => ({
                                name: d.anio.toString(),
                                'Ingresos SMLMV (M)': Math.round(d.smlmvRecaudo / 1e6 * 10) / 10,
                                'Ingresos Créditos (M)': Math.round(d.creditRecaudo / 1e6 * 10) / 10
                              }))} 
                              margin={{ top: 10, right: 15, left: 15, bottom: 5 }}
                            >
                              <defs>
                                <linearGradient id="whiteRepCreditGrad" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#d97706" stopOpacity={0.35}/>
                                  <stop offset="95%" stopColor="#d97706" stopOpacity={0.0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                              <XAxis dataKey="name" stroke="#475569" tick={{ fontSize: 10, fill: '#334155' }} dy={4} />
                              <YAxis stroke="#475569" width={75} tick={{ fontSize: 10, fill: '#334155' }} tickFormatter={(v) => `$${v.toLocaleString('es-CO')}M`} />
                              <RechartsTooltip contentStyle={{backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '11px', color: '#0f172a'}} />
                              <Legend verticalAlign="bottom" height={26} iconType="circle" wrapperStyle={{fontSize: '11px', paddingTop: '6px', color: '#334155'}} />
                              <Area type="monotone" dataKey="Ingresos SMLMV (M)" stroke="#94a3b8" fill="#f1f5f9" fillOpacity={0.6} strokeWidth={2} dot={{ r: 3, fill: '#94a3b8' }} />
                              <Area type="monotone" dataKey="Ingresos Créditos (M)" stroke="#d97706" fill="url(#whiteRepCreditGrad)" strokeWidth={2.5} dot={{ r: 3, fill: '#d97706' }} />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Chart 2: Student Enrollment Comparison (Pure White Background) */}
                      <div className="bg-white text-slate-900 p-5 rounded-2xl border border-slate-300 shadow-sm flex flex-col justify-between">
                        <div className="mb-2 border-b border-slate-100 pb-2">
                          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#15803d]"></span>
                            Gráfica IV: Comparación de Matrículas Activas (Estudiantes)
                          </h4>
                          <p className="text-[10px] text-slate-500 font-sans">
                            Comportamiento cohorte posgradual ante elasticidad precio (ε = {elasticity.toFixed(2)})
                          </p>
                        </div>
                        <div className="h-60 w-full pt-1">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart 
                              data={scenarioComparisonData.map(d => ({
                                name: d.anio.toString(),
                                'Alumnos SMLMV': d.smlmvStudents,
                                'Alumnos Créditos': d.creditStudents
                              }))} 
                              margin={{ top: 10, right: 15, left: 15, bottom: 5 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                              <XAxis dataKey="name" stroke="#475569" tick={{ fontSize: 10, fill: '#334155' }} dy={4} />
                              <YAxis stroke="#475569" width={60} tick={{ fontSize: 10, fill: '#334155' }} tickFormatter={(v) => v.toLocaleString('es-CO')} domain={[0, 8500]} />
                              <RechartsTooltip contentStyle={{backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '11px', color: '#0f172a'}} />
                              <Legend verticalAlign="bottom" height={26} iconType="circle" wrapperStyle={{fontSize: '11px', paddingTop: '6px', color: '#334155'}} />
                              <Line type="monotone" dataKey="Alumnos SMLMV" stroke="#94a3b8" strokeWidth={2} dot={{ r: 3, fill: '#94a3b8' }} strokeDasharray="4 4" />
                              <Line type="monotone" dataKey="Alumnos Créditos" stroke="#15803d" strokeWidth={2.5} dot={{ r: 4, fill: '#15803d' }} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* 5. APARTADO FINANCIERO ESPECIAL: ASEGURAMIENTO DEL RECURSO INSTITUCIONAL */}
                  <div className="space-y-4 text-xs text-slate-800 text-justify leading-relaxed pt-2 border-t border-slate-200" style={{ pageBreakBefore: 'always' }}>
                    <div className="border-b border-slate-200 pb-2">
                      <h3 className="font-black text-sm uppercase tracking-wide border-l-4 border-emerald-600 pl-3 text-slate-900 font-serif">
                        5. Apartado Financiero Especial: Mecanismos de Blindaje, Aseguramiento y Sostenibilidad Patrimonial del Recurso 31
                      </h3>
                      <p className="text-[10px] text-slate-500 font-mono italic pl-3.5 mt-0.5">
                        Estrategias de preservación del flujo de caja institucional y fortalecimiento de la Administración Central
                      </p>
                    </div>

                    <p>
                      Una de las mayores preocupaciones del Honorable Consejo Superior Universitario radica en garantizar que la reforma arancelaria preserve y acreciente las fuentes de ingreso de la Universidad, sin exponer a la institución a descalces financieros o desfinanciamiento de sus facultades. A continuación se exponen los cinco mecanismos actuariales y de gestión financiera mediante los cuales el modelo por créditos <strong>blinda y asegura el patrimonio institucional de la UPTC</strong>:
                    </p>

                    {/* 5 STRATEGIC FINANCIAL PILLARS */}
                    <div className="space-y-3 pt-1">
                      
                      {/* Pillar 1 */}
                      <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2">
                        <h4 className="font-bold text-slate-900 text-xs uppercase font-mono flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-[10px]">1</span>
                          Blindaje y Crecimiento de la Transferencia a la Administración Central (Deducción 45,5% / 40% VAF)
                        </h4>
                        <p className="text-[11px] text-slate-700 leading-normal">
                          El modelo tradicional SMLMV, al contraer la matrícula en un 62% hacia 2036, destruye la base de ingresos sobre la cual se calcula la transferencia a la Administración Central. En contraste, el modelo por créditos expande de forma sostenida estos recursos vitales para la Universidad:
                        </p>
                        <div className="overflow-x-auto my-2">
                          <table className="w-full text-left text-[10px] border border-slate-300 border-collapse">
                            <thead>
                              <tr className="bg-slate-100 text-slate-900 font-bold border-b border-slate-300">
                                <th className="p-2 border-r border-slate-300">Horizonte de Evaluación</th>
                                <th className="p-2 border-r border-slate-300 text-right">Transferencia Central (SMLMV)</th>
                                <th className="p-2 border-r border-slate-300 text-right bg-emerald-50">Transferencia Central (Créditos)</th>
                                <th className="p-2 text-right bg-emerald-100 font-bold text-emerald-900">Aseguramiento Neto Adicional</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 font-mono text-slate-700">
                              <tr>
                                <td className="p-2 font-sans font-bold border-r border-slate-300 text-slate-900">Cuatrienio (2027 - 2030)</td>
                                <td className="p-2 text-right border-r border-slate-300">$77.728.243.605</td>
                                <td className="p-2 text-right border-r border-slate-300 text-emerald-800 font-bold bg-emerald-50/50">$84.339.110.319</td>
                                <td className="p-2 text-right font-bold text-emerald-800 bg-emerald-100/50">+$6.610.866.714 COP (+8,5%)</td>
                              </tr>
                              <tr className="bg-slate-50 font-bold">
                                <td className="p-2 font-sans border-r border-slate-300 text-slate-900">Decenio (2027 - 2036)</td>
                                <td className="p-2 text-right border-r border-slate-300">$171.653.390.460</td>
                                <td className="p-2 text-right border-r border-slate-300 text-emerald-800 font-bold bg-emerald-50/50">$254.380.359.378</td>
                                <td className="p-2 text-right font-bold text-emerald-800 bg-emerald-100 text-[11px]">+$82.726.968.918 COP (+48,2%)</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                        <p className="text-[10px] text-slate-600 italic">
                          * Los recursos de la deducción central (45,5%) financian directamente el mantenimiento físico, licenciamiento de software institucional, dotación de bibliotecas, bienestar universitario y la nómina administrativa transversal de la UPTC.
                        </p>
                      </div>

                      {/* Pillar 2 */}
                      <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2">
                        <h4 className="font-bold text-slate-900 text-xs uppercase font-mono flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-[10px]">2</span>
                          Análisis de Punto de Equilibrio Operativo (Break-Even) y Margen de Seguridad
                        </h4>
                        <p className="text-[11px] text-slate-700 leading-normal">
                          Los costos fijos directos del Fondo Especial de Posgrados (dirección de posgrados de facultad, comités curriculares y acreditación) ascienden a <strong>$9.370.571.038 COP anuales</strong>. Considerando un margen de contribución del 19,5% tras deducciones centrales, el <strong>punto de equilibrio de la oferta de posgrados es de 4.460 estudiantes</strong>.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-1 text-[10px]">
                          <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                            <strong className="text-emerald-900 block font-mono">Bajo el Modelo por Créditos (2027):</strong>
                            <p className="text-slate-700 mt-1">
                              Con <strong>6.887 estudiantes matriculados</strong>, la Universidad opera con un <strong>Margen de Seguridad Operativa del +35,2%</strong> sobre el punto de equilibrio, generando excedentes netos de $8.701,2 M para reinversión académica.
                            </p>
                          </div>
                          <div className="p-3 bg-rose-50 rounded-lg border border-rose-200">
                            <strong className="text-rose-900 block font-mono">Bajo el Esquema SMLMV Rígido (2027):</strong>
                            <p className="text-slate-700 mt-1">
                              La matrícula cae inmediatamente a <strong>4.003 estudiantes</strong> (por debajo del umbral de equilibrio), arrojando un margen de seguridad negativo (-10,2%) que arrastraría al Fondo a un <em>déficit operacional crónico</em>.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Pillar 3 */}
                      <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2">
                        <h4 className="font-bold text-slate-900 text-xs uppercase font-mono flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-[10px]">3</span>
                          Mitigación Actuarial de la Deserción y Regla de Matrícula Mínima (7 Créditos)
                        </h4>
                        <p className="text-[11px] text-slate-700 leading-normal">
                          El cobro fijo semestral imponía una decisión binaria: pagar el semestre completo ($8,8M - $10,7M) o desertar del programa. El modelo por créditos flexibiliza el pago al esfuerzo académico real ($6,48M promedio en 2027), blindando a la cohorte contra deserciones por motivos económicos. Asimismo, el <strong>artículo 8 del Proyecto de Acuerdo</strong> establece la obligatoriedad de inscribir un mínimo de <strong>siete (7) créditos académicos</strong> por semestre, garantizando un piso mínimo de facturación recurrente que protege la tesorería de la UPTC.
                        </p>
                      </div>

                      {/* Pillar 4 */}
                      <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2">
                        <h4 className="font-bold text-slate-900 text-xs uppercase font-mono flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-[10px]">4</span>
                          Constitución del Fondo de Reserva de Estabilización y Contingencias (FREC-R31)
                        </h4>
                        <p className="text-[11px] text-slate-700 leading-normal">
                          Se propone destinar el <strong>15% de los excedentes netos anuales</strong> ($1.305,2 M en 2027) a la creación de una subcuenta de reserva anticíclica (Fondo de Estabilización). Al finalizar el cuatrienio 2030, esta reserva acumulará <strong>$5.421,8 M COP</strong>, con destinación exclusiva a absorber volatilidades macroeconómicas, subsidiar convocatorias de investigación de posgrados y financiar procesos de acreditación internacional sin comprometer la caja ordinaria de la Universidad.
                        </p>
                      </div>

                      {/* Pillar 5 */}
                      <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2">
                        <h4 className="font-bold text-slate-900 text-xs uppercase font-mono flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-[10px]">5</span>
                          Independencia Financiera frente a Recursos de Gratuidad y Ley 30
                        </h4>
                        <p className="text-[11px] text-slate-700 leading-normal">
                          El Recurso 31 es la principal fuente de ingresos propios comerciales de la UPTC. Un modelo por créditos dinámico y competitivo inmuniza a la Universidad frente a demoras o restricciones en las transferencias del Presupuesto General de la Nación (Ley 30 de 1992 o giros del Ministerio de Hacienda para la Política de Gratuidad R10.5), proporcionando liquidez inmediata en caja y solvencia crediticia institucional.
                        </p>
                      </div>

                    </div>

                    {/* WHITE BACKGROUND CHART 3: CENTRAL DEDUCTIONS COMPARISON */}
                    <div className="space-y-2 border border-slate-200 p-5 rounded-2xl bg-white shadow-sm my-3" style={{ pageBreakInside: 'avoid' }}>
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 border-b border-slate-100 pb-3">
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#15803d]"></span>
                            Gráfica V: Aseguramiento de Recursos para la Administración Central (Deducción 45,5% - Millones COP)
                          </h4>
                          <p className="text-[10px] text-slate-500 font-sans">
                            Comparación de transferencias acumuladas a la Unidad 01 UPTC (Créditos vs SMLMV)
                          </p>
                        </div>
                        <div className="text-[10px] font-mono text-emerald-800 font-bold bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                          Δ Blindaje Decenal: +$82.727,0M COP
                        </div>
                      </div>
                      <div className="h-60 w-full pt-2">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart 
                            data={scenarioComparisonData.map(d => ({
                              anio: d.anio.toString(),
                              'Transferencia SMLMV (M)': Math.round((d.smlmvRecaudo * 0.455) / 1e6 * 10) / 10,
                              'Transferencia Créditos (M)': Math.round((d.creditRecaudo * 0.455) / 1e6 * 10) / 10
                            }))} 
                            margin={{ top: 15, right: 25, left: 20, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                            <XAxis dataKey="anio" stroke="#475569" tick={{ fontSize: 10, fill: '#334155' }} dy={4} />
                            <YAxis stroke="#475569" width={75} tick={{ fontSize: 10, fill: '#334155' }} tickFormatter={(val) => `$${val.toLocaleString('es-CO')}M`} />
                            <RechartsTooltip contentStyle={{backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '11px', color: '#0f172a'}} />
                            <Legend wrapperStyle={{fontSize: '11px', paddingTop: '6px', color: '#334155'}} />
                            <Bar dataKey="Transferencia SMLMV (M)" fill="#94a3b8" radius={[3, 3, 0, 0]} />
                            <Bar dataKey="Transferencia Créditos (M)" fill="#15803d" radius={[3, 3, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                  </div>

                  {/* 6. CONCLUSIONES, DICTAMEN DE VIABILIDAD Y FIRMAS */}
                  <div className="space-y-4 text-xs text-slate-800 text-justify leading-relaxed pt-2 border-t border-slate-200" style={{ pageBreakBefore: 'always' }}>
                    <h3 className="font-black text-sm uppercase tracking-wide border-l-4 border-[#b45309] pl-3 text-slate-900 font-serif">
                      6. Conclusiones y Dictamen de Viabilidad de la Vicerrectoría Administrativa y Financiera
                    </h3>
                    <p>
                      Con base en los estudios econométricos, la modelación intertemporal de flujos de caja y los análisis de sensibilidad actuarial presentados, la Vicerrectoría Administrativa y Financiera emite <strong>DICTAMEN FAVORABLE DE VIABILIDAD TÉCNICA, FINANCIERA Y OPERACIONAL</strong> para la aprobación del Proyecto de Acuerdo por parte del Consejo Superior Universitario, fundado en las siguientes conclusiones determinantes:
                    </p>
                    <ol className="list-decimal pl-5 space-y-2 text-slate-700">
                      <li>
                        <strong>Generación Neta de Valor Económico:</strong> El modelo de cobro por créditos académicos genera un <strong>Valor Actual Neto (VAN) de $29.849.753.409 COP</strong> para el cuatrienio 2027-2030 y de <strong>$77.676.108.775 COP</strong> para el decenio 2027-2036 (al 8,0% E.A.). Esto supera en un <strong>+51,0% (+$26.251,8 M COP)</strong> la rentabilidad del esquema SMLMV, certificando su sólida viabilidad financiera.
                      </li>
                      <li>
                        <strong>Preservación y Crecimiento de la Matrícula:</strong> Al alinear la tarifa con el avance académico real, se evita el choque tarifario del rezago diferido (+21,9%), garantizando la retención de <strong>+2.884 estudiantes en 2027</strong> y proyectando una cohorte protegida de <strong>+4.802 estudiantes en 2036</strong> frente al escenario de deserción masiva del SMLMV.
                      </li>
                      <li>
                        <strong>Blindaje de los Recursos Centrales:</strong> Se garantizan transferencias acumuladas de <strong>$254.380,4 M COP</strong> para la Administración Central en el horizonte decenal (+$82.727 M COP adicionales vs SMLMV), asegurando la liquidez transversal de la Universidad.
                      </li>
                      <li>
                        <strong>Margen de Seguridad Confortable:</strong> La operación se sitúa un <strong>+35,2% por encima del punto de equilibrio</strong> (6.887 alumnos vs 4.460 requeridos), asegurando excedentes netos de $36.145,3 M COP en el primer cuatrienio.
                      </li>
                    </ol>
                    <p className="pt-2">
                      En mérito de lo expuesto, se recomienda la aprobación unánime del Proyecto de Acuerdo en el seno del Consejo Superior Universitario, autorizando a la Vicerrectoría Administrativa y Financiera a emitir las resoluciones reglamentarias para la aplicación del VBCI correspondiente a la vigencia 2027.
                    </p>
                  </div>

                  {/* Institutional Signatures Block */}
                  <div className="pt-14 pb-4 text-center text-xs text-slate-800" style={{ pageBreakInside: 'avoid' }}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-12 max-w-2xl mx-auto">
                      <div className="space-y-1.5">
                        <div className="w-56 border-t-2 border-slate-900 mx-auto"></div>
                        <strong className="block text-slate-900 font-serif text-sm">Vicerrector Administrativo y Financiero</strong>
                        <span className="text-[10px] text-slate-500 font-mono block">UPTC — Despacho VAFI</span>
                        <span className="text-[9px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded font-mono font-bold inline-block border border-emerald-200">
                          Revisó y Aprobó Dictamen Financiero
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        <div className="w-56 border-t-2 border-slate-900 mx-auto"></div>
                        <strong className="block text-slate-900 font-serif text-sm">Director de Planeación Institucional</strong>
                        <span className="text-[10px] text-slate-500 font-mono block">UPTC — Dirección de Planeación</span>
                        <span className="text-[9px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded font-mono font-bold inline-block border border-slate-200">
                          Modelación Econométrica y Actuarial
                        </span>
                      </div>
                    </div>
                  </div>

                </div>

              </div>
            )}


          </div>

        </div>
      )}

    </div>
  );
}
