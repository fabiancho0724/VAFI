import { useState, useEffect, useMemo } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell, 
  LineChart, Line, ComposedChart, ReferenceLine
} from 'recharts';
import { 
  GraduationCap, MapPin, Building2, BookOpen, Users, DollarSign, 
  Filter, Percent, CreditCard, Activity, TrendingUp, TrendingDown, MoreHorizontal,
  Info, Sparkles, ArrowRight, Shield, Database, HelpCircle, Bot, AlertTriangle, ShieldCheck, Target, ChevronRight
} from 'lucide-react';
import { fetchAndParseCSV } from '../lib/csvParser';

const URL_MATRICULAS = 'https://raw.githubusercontent.com/fabiancho0724/VAFI-Reporte-Financiero/5fd78e804688cdca1509f82da5f766b232d62c98/Resumen%20Posgrados.csv';
const URL_INGRESOS = 'https://raw.githubusercontent.com/fabiancho0724/VAFI-Reporte-Financiero/5fd78e804688cdca1509f82da5f766b232d62c98/Resumen%20Posgrados%20ingresos.csv';

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
  { anio: 2027, iaepPct: 4.14, fuente: "Proyeccion", estudiantes: 6887, estS1: 3445, estS2: 3442, recaudo: 43380775906 },
  { anio: 2028, iaepPct: 4.28, fuente: "Proyeccion", estudiantes: 6734, estS1: 3366, estS2: 3369, recaudo: 44213584770 },
  { anio: 2029, iaepPct: 4.43, fuente: "Proyeccion", estudiantes: 6633, estS1: 3312, estS2: 3321, recaudo: 45457668641 },
  { anio: 2030, iaepPct: 4.57, fuente: "Proyeccion", estudiantes: 6582, estS1: 3285, estS2: 3297, recaudo: 47153468033 }
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
}

function formatCurrencyShort(value: number) {
  if (value >= 1e12) return `$${(value / 1e12).toFixed(1)}B`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}MM`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
  return `$${value}`;
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

  // Sensitivity main tab settings
  const [activeSensSubTab, setActiveSensSubTab] = useState<'scenarios' | 'montecarlo' | 'dscr'>('scenarios');

  // Sliders state for Sensitivity & Elasticity analysis
  const [elasticity, setElasticity] = useState<number>(-1.19);
  const [priceVarPct, setPriceVarPct] = useState<number>(0);
  const [operatingCostPct, setOperatingCostPct] = useState<number>(35); 
  const [centralDeductionPct, setCentralDeductionPct] = useState<number>(45.5); 

  // Scenarios bounds
  const [sensPessimisticPct, setSensPessimisticPct] = useState<number>(-15);
  const [sensOptimisticPct, setSensOptimisticPct] = useState<number>(15);
  const [sensDiscountRate, setSensDiscountRate] = useState<number>(8);

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

  // SENSITIVITY AND ELASTICITY CALCULATIONS
  // Dynamically shifts credit-model projections based on user-controlled variables
  const sensitivityProjections = useMemo(() => {
    return PROJECTED_BASE.map(base => {
      // 1. Average price per student baseline
      const priceBase = base.recaudo / base.estudiantes;
      
      // 2. Adjust price ratio by slider variation
      const priceRatio = 1 + priceVarPct / 100;
      const simulatedPrice = priceBase * priceRatio;
      
      // 3. Elasticity effect: % Change in Q = elasticity * % Change in Price
      const qChangePct = (elasticity * priceVarPct) / 100;
      const simulatedEstudiantes = Math.max(0, Math.round(base.estudiantes * (1 + qChangePct)));
      
      // 4. Recalculated total revenue
      const simulatedRecaudo = simulatedEstudiantes * simulatedPrice;
      
      // 5. Expenditures: central legal deductions + direct program operating costs
      const deduccionCentral = simulatedRecaudo * (centralDeductionPct / 100);
      const gastoOperativo = simulatedRecaudo * (operatingCostPct / 100);
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
  }, [priceVarPct, elasticity, operatingCostPct, centralDeductionPct]);

  // Transition Analysis: Comparing Year 2026 (Historical vs New Credit Model)
  const comparison2026 = useMemo(() => {
    const historical2026 = HISTORICAL_DATA.find(h => h.vigencia === 2026) || {
      estudiantes: 5170,
      ingreso: 45472060134
    };
    
    const simulated = sensitivityProjections.find(p => p.anio === 2026) || {
      estudiantes: 7092,
      recaudo: 42925508467,
      precio: 42925508467 / 7092
    };

    const histPrice = historical2026.ingreso / historical2026.estudiantes;
    const simPrice = simulated.precio || (simulated.recaudo / simulated.estudiantes);

    const deltaRecaudo = simulated.recaudo - historical2026.ingreso;
    const deltaRecaudoPct = (deltaRecaudo / historical2026.ingreso) * 100;
    
    const deltaEstudiantes = simulated.estudiantes - historical2026.estudiantes;
    const deltaEstudiantesPct = (deltaEstudiantes / historical2026.estudiantes) * 100;
    
    const deltaPrecio = simPrice - histPrice;
    const deltaPrecioPct = (deltaPrecio / histPrice) * 100;

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
      deltaPrecioPct
    };
  }, [sensitivityProjections]);

  // FULL SENSITIVITY AND ELASTICITY REPORT MODULE
  // Implements the same calculations as PredictiveScreen.tsx but tailored to Posgrados R31
  const posgradSensitivityAnalysis = useMemo(() => {
    // 5 annual net cash flows: base timeline
    const baseIngArray = sensitivityProjections.map(p => p.recaudo);
    const baseGasArray = sensitivityProjections.map(p => p.totalGastos);
    const baseFlows = sensitivityProjections.map(p => p.margenNeto);
    
    // 1. NPV & IRR base
    const baseNPV = calculateNPV(baseFlows, sensDiscountRate);
    const baseIRR = calculateIRR(baseFlows);
    const baseFlowSum = baseFlows.reduce((a, b) => a + b, 0);
    const baseIngTotal = baseIngArray.reduce((a, b) => a + b, 0);
    const baseGasTotal = baseGasArray.reduce((a, b) => a + b, 0);
    
    // 2. Pessimistic Scenario: -15% Revenue, +10% Expenses
    const pesIngFactor = 1 + sensPessimisticPct / 100;
    const pesGasFactor = 1 + Math.abs(sensPessimisticPct) / 1.5 / 100;
    const pesIngArray = baseIngArray.map(v => v * pesIngFactor);
    const pesGasArray = baseGasArray.map(v => v * pesGasFactor);
    const pesFlows = pesIngArray.map((ing, i) => ing - pesGasArray[i]);
    const pesNPV = calculateNPV(pesFlows, sensDiscountRate);
    const pesIRR = calculateIRR(pesFlows);
    const pesFlowSum = pesFlows.reduce((a, b) => a + b, 0);
    const pesIngTotal = baseIngTotal * pesIngFactor;

    // 3. Optimistic Scenario: +15% Revenue, -10% Expenses
    const optIngFactor = 1 + sensOptimisticPct / 100;
    const optGasFactor = 1 - (sensOptimisticPct / 1.5) / 100;
    const optIngArray = baseIngArray.map(v => v * optIngFactor);
    const optGasArray = baseGasArray.map(v => v * optGasFactor);
    const optFlows = optIngArray.map((ing, i) => ing - optGasArray[i]);
    const optNPV = calculateNPV(optFlows, sensDiscountRate);
    const optIRR = calculateIRR(optFlows);
    const optFlowSum = optFlows.reduce((a, b) => a + b, 0);
    const optIngTotal = baseIngTotal * optIngFactor;

    // 4. Elasticity calculations
    const inc1PctFlows = baseIngArray.map((ing, i) => (ing * 1.01) - baseGasArray[i]);
    const inc1PctNPV = calculateNPV(inc1PctFlows, sensDiscountRate);
    const elasticityIng = baseNPV !== 0 ? ((inc1PctNPV - baseNPV) / baseNPV) * 100 : 0;

    const exp1PctFlows = baseIngArray.map((ing, i) => ing - (baseGasArray[i] * 1.01));
    const exp1PctNPV = calculateNPV(exp1PctFlows, sensDiscountRate);
    const elasticityGas = baseNPV !== 0 ? ((exp1PctNPV - baseNPV) / baseNPV) * 100 : 0;

    // 5. Monte Carlo Simulation (1000 runs)
    const mcNpvList: number[] = [];
    for (let iter = 0; iter < 1000; iter++) {
      const randIng = 1 + (Math.random() - 0.5) * 2 * 0.20; // +- 20%
      const randGas = 1 + (Math.random() - 0.5) * 2 * 0.15; // +- 15%
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
        range: `${formatCurrencyShort(start)} a ${formatCurrencyShort(end)}`,
        Frecuencia: count
      };
    });

    // 6. Tornado Diagram Data (Drivers: Elasticity, Credit cost variation, direct operating cost %, central retentions %)
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
        const simHigh = PROJECTED_BASE.map(b => {
          const qChangePct = ((elasticity + 0.2) * priceVarPct) / 100;
          const simEst = Math.round(b.estudiantes * (1 + qChangePct));
          const simPrice = (b.recaudo / b.estudiantes) * (1 + priceVarPct / 100);
          const simRec = simEst * simPrice;
          return simRec * (1 - centralDeductionPct / 100 - operatingCostPct / 100);
        });
        const simLow = PROJECTED_BASE.map(b => {
          const qChangePct = ((elasticity - 0.2) * priceVarPct) / 100;
          const simEst = Math.round(b.estudiantes * (1 + qChangePct));
          const simPrice = (b.recaudo / b.estudiantes) * (1 + priceVarPct / 100);
          const simRec = simEst * simPrice;
          return simRec * (1 - centralDeductionPct / 100 - operatingCostPct / 100);
        });
        highFlows = simHigh;
        lowFlows = simLow;
      } else if (d.key === 'priceVar') {
        const simHigh = PROJECTED_BASE.map(b => {
          const qChangePct = (elasticity * (priceVarPct + 5)) / 100;
          const simEst = Math.round(b.estudiantes * (1 + qChangePct));
          const simPrice = (b.recaudo / b.estudiantes) * (1 + (priceVarPct + 5) / 100);
          const simRec = simEst * simPrice;
          return simRec * (1 - centralDeductionPct / 100 - operatingCostPct / 100);
        });
        const simLow = PROJECTED_BASE.map(b => {
          const qChangePct = (elasticity * (priceVarPct - 5)) / 100;
          const simEst = Math.round(b.estudiantes * (1 + qChangePct));
          const simPrice = (b.recaudo / b.estudiantes) * (1 + (priceVarPct - 5) / 100);
          const simRec = simEst * simPrice;
          return simRec * (1 - centralDeductionPct / 100 - operatingCostPct / 100);
        });
        highFlows = simHigh;
        lowFlows = simLow;
      } else if (d.key === 'operatingCost') {
        const simHigh = baseIngArray.map(rec => rec * (1 - centralDeductionPct / 100 - (operatingCostPct + 5) / 100));
        const simLow = baseIngArray.map(rec => rec * (1 - centralDeductionPct / 100 - (operatingCostPct - 5) / 100));
        highFlows = simHigh;
        lowFlows = simLow;
      } else if (d.key === 'centralDeduction') {
        const simHigh = baseIngArray.map(rec => rec * (1 - (centralDeductionPct + 5) / 100 - operatingCostPct / 100));
        const simLow = baseIngArray.map(rec => rec * (1 - (centralDeductionPct - 5) / 100 - operatingCostPct / 100));
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

    // 7. DSCR Coverage Calculations
    // DSCR = (Revenue - Direct Expenses) / Central Deductions (45.5%)
    // Base formula fits: DSCR = (1 - OperatingCostPct/100) / (CentralDeductionPct/100)
    const dscrBase = (1 - operatingCostPct / 100) / (centralDeductionPct / 100);
    const dscrPessimistic = (1 - (operatingCostPct * pesGasFactor) / 100) / ((centralDeductionPct * pesGasFactor) / 100);
    const dscrOptimistic = (1 - (operatingCostPct * optGasFactor) / 100) / ((centralDeductionPct * optGasFactor) / 100);
    const cushion = ((dscrBase - 1.25) / 1.25) * 100;

    const G = 100 / (1.25 * centralDeductionPct + operatingCostPct);
    const ruptureVar = (G - 1) * 100;
    const ruptureValue = baseIngTotal * G;

    // DSCR vs Price variation curve data
    const dscr1DData = [-15, -12.5, -10, -7.5, -5, -2.5, 0, 2.5, 5, 7.5, 10, 12.5, 15].map(v => {
      const opCost_v = operatingCostPct / (1 + v / 100);
      const dscr_v = (1 - opCost_v / 100) / (centralDeductionPct / 100);
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
  }, [priceVarPct, elasticity, operatingCostPct, centralDeductionPct, sensDiscountRate, sensPessimisticPct, sensOptimisticPct, sensitivityProjections]);

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

    // Seamless connection at 2026
    const connectingPoint = {
      anio: "2026 (Créditos)",
      'Modelo Histórico (Recaudo M)': null,
      'Modelo por Créditos (Recaudo M)': Math.round(comparison2026.simulatedRecaudo / 1e6 * 100) / 100,
      'Estudiantes Históricos': null,
      'Estudiantes Créditos': comparison2026.simulatedEstudiantes
    };

    return [...histPart, connectingPoint, ...projPart.filter(p => p.anio !== "2026")];
  }, [sensitivityProjections, comparison2026]);

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
      diagnosis += " La demanda de matrícula es altamente elástica; variaciones mínimas en el costo del crédito detonarán una alta deserción o captación de estudiantes.";
    } else {
      diagnosis += " El comportamiento del alumnado ante precios es estable. Ajustes regulatorios de tarifa tendrán un efecto directo proporcional en el ingreso final.";
    }

    return diagnosis;
  }, [sensitivityProjections, elasticity, centralDeductionPct, operatingCostPct]);

  if (dataStage === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <div className="w-12 h-12 border-4 border-primary-container border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-on-surface-variant font-mono animate-pulse">Cargando módulo de posgrados...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col mb-20 max-w-7xl mx-auto px-4 md:px-0 space-y-6">
      
      {/* Header & Sub-Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-2">
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

      {/* TAB 1: EXECUTIVE DASHBOARD (ORIGINAL MODULE) */}
      {activeTab === 'dashboard' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 animate-in fade-in duration-300">
          
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
                 <div className="w-2 h-2 rounded-full bg-[#4ade80] animate-pulse"></div>
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

        </div>
      )}

      {/* TAB 2: SENSITIVITY AND ELASTICITY REPORT (NEW INTEGRATED MODULE WITH ALL ANALYTIC SECTIONS) */}
      {activeTab === 'sensitivity' && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-300">
          
          {/* TOP DYNAMIC CONTROLS SLIDERS BAR */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-5 bg-[#0f172a] border border-white/10 p-5 rounded-2xl shadow-2xl">
            
            {/* Elasticity */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-white/60 font-medium font-sans">Elasticidad Matrícula (ε)</span>
                <strong className="text-[#ffcc29] font-mono font-bold">{elasticity.toFixed(2)}</strong>
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
              <span className="text-[8px] text-white/40 font-mono block">Efecto del precio en inscritos</span>
            </div>

            {/* Price var */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-white/60 font-medium font-sans">Ajuste Valor de Crédito</span>
                <strong className={`font-mono font-bold ${priceVarPct >= 0 ? 'text-[#4ade80]' : 'text-rose-400'}`}>
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
              <span className="text-[8px] text-white/40 font-mono block">Desplazamiento de matrícula base</span>
            </div>

            {/* Cost var */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-white/60 font-medium font-sans">Gastos Directos Programas</span>
                <strong className="text-white font-mono font-bold">{operatingCostPct}%</strong>
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
              <span className="text-[8px] text-white/40 font-mono block"> CPS directos y docencia cátedra</span>
            </div>

            {/* Central deductions */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-white/60 font-medium font-sans">Deducción UPTC Central</span>
                <strong className="text-white font-mono font-bold">{centralDeductionPct}%</strong>
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
              <span className="text-[8px] text-white/40 font-mono block">Sobretasa obligatoria central</span>
            </div>

            {/* Discount Rate */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-white/60 font-medium font-sans">Tasa de Descuento Anual</span>
                <strong className="text-white font-mono font-bold">{sensDiscountRate}%</strong>
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
              <span className="text-[8px] text-white/40 font-mono block">Costo de oportunidad del capital</span>
            </div>

          </div>

          {/* INTERNAL SENSITIVITY SUB-TABS PILLS */}
          <div className="flex border-b border-white/5 pb-1 gap-4 text-xs font-bold uppercase tracking-wider mt-1">
            <button 
              onClick={() => setActiveSensSubTab('scenarios')}
              className={`pb-2 transition-all cursor-pointer border-b-2 ${
                activeSensSubTab === 'scenarios' 
                  ? 'border-[#ffcc29] text-[#ffcc29]' 
                  : 'border-transparent text-white/55 hover:text-white'
              }`}
            >
              1. Escenarios y Flujos
            </button>
            <button 
              onClick={() => setActiveSensSubTab('montecarlo')}
              className={`pb-2 transition-all cursor-pointer border-b-2 ${
                activeSensSubTab === 'montecarlo' 
                  ? 'border-[#ffcc29] text-[#ffcc29]' 
                  : 'border-transparent text-white/55 hover:text-white'
              }`}
            >
              2. Monte Carlo y Tornado
            </button>
            <button 
              onClick={() => setActiveSensSubTab('dscr')}
              className={`pb-2 transition-all cursor-pointer border-b-2 ${
                activeSensSubTab === 'dscr' 
                  ? 'border-[#ffcc29] text-[#ffcc29]' 
                  : 'border-transparent text-white/55 hover:text-white'
              }`}
            >
              3. Coberturas DSCR y Covenants
            </button>
          </div>

          {/* SUB-TAB 1: ESCENARIOS Y FLUJOS */}
          {activeSensSubTab === 'scenarios' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              
              {/* Scenarios Cards Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Pessimistic */}
                <div className="bg-[#0f172a] border border-rose-500/20 rounded-[28px] p-6 relative overflow-hidden flex flex-col justify-between shadow-2xl bg-gradient-to-br from-[#0f172a] to-[#220c11]">
                  <div className="absolute top-0 left-0 w-full h-1 bg-rose-500"></div>
                  <div>
                    <h4 className="text-sm font-bold text-rose-400 font-display">Escenario Pesimista</h4>
                    <p className="text-[10px] text-on-surface-variant font-mono mt-1">Simulado a -15% en Ingresos / +10% en Gastos</p>
                    
                    <div className="space-y-3 mt-6">
                      <div className="flex justify-between items-center py-2 border-b border-white/5 text-xs">
                        <span className="text-white/60">Ingreso Acumulado 5a</span>
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
                    <p className="text-[10px] text-on-surface-variant font-mono mt-1">Simulado con sliders actuales de créditos</p>
                    
                    <div className="space-y-3 mt-6">
                      <div className="flex justify-between items-center py-2 border-b border-white/5 text-xs">
                        <span className="text-white/60">Ingreso Acumulado 5a</span>
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
                    <p className="text-[10px] text-on-surface-variant font-mono mt-1">Simulado a +15% en Ingresos / -10% en Gastos</p>
                    
                    <div className="space-y-3 mt-6">
                      <div className="flex justify-between items-center py-2 border-b border-white/5 text-xs">
                        <span className="text-white/60">Ingreso Acumulado 5a</span>
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

              {/* Chart: Comparative cash flow of scenarios */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Evolution chart */}
                <div className="lg:col-span-2 bg-[#0f172a] border border-white/10 rounded-[32px] p-6 flex flex-col">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Evolución de Flujos por Escenario de Créditos (2026-2030)</h4>
                  <div className="h-72" style={{ width: '100%', height: 288, minWidth: 200 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={new Array(5).fill(0).map((_, i) => ({
                          name: (2026 + i).toString(),
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
                <div className="bg-[#0f172a] border border-white/10 rounded-[32px] p-6 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Elasticidad del Valor Actual Neto</h4>
                    
                    <div className="space-y-4">
                      <div className="bg-white/5 border border-white/5 rounded-xl p-3 flex items-start gap-3">
                        <TrendingUp className="w-5 h-5 text-[#4ade80] shrink-0 mt-0.5" />
                        <div>
                          <span className="text-[10px] text-white/50 block">Elasticidad Ingresos vs VAN</span>
                          <span className="text-sm font-bold text-white font-mono">
                            {posgradSensitivityAnalysis.elasticityIng >= 0 ? '+' : ''}{posgradSensitivityAnalysis.elasticityIng.toFixed(2)}%
                          </span>
                          <p className="text-[9px] text-white/40 mt-1 leading-normal">
                            Por cada 1% de incremento en el recaudo por créditos, el VAN aumenta en un <strong>{Math.abs(posgradSensitivityAnalysis.elasticityIng).toFixed(2)}%</strong>.
                          </p>
                        </div>
                      </div>

                      <div className="bg-white/5 border border-white/5 rounded-xl p-3 flex items-start gap-3">
                        <TrendingDown className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-[10px] text-white/50 block">Elasticidad Egresos vs VAN</span>
                          <span className="text-sm font-bold text-white font-mono">
                            {posgradSensitivityAnalysis.elasticityGas >= 0 ? '+' : ''}{posgradSensitivityAnalysis.elasticityGas.toFixed(2)}%
                          </span>
                          <p className="text-[9px] text-white/40 mt-1 leading-normal">
                            Por cada 1% de incremento en los egresos (directos o deducciones), el VAN cae en un <strong>{Math.abs(posgradSensitivityAnalysis.elasticityGas).toFixed(2)}%</strong>.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-[9px] text-white/40 font-mono mt-4 leading-normal bg-black/30 p-2.5 rounded-lg">
                    💡 La diferencia entre ambas magnitudes indica el apalancamiento operativo del recurso R31.
                  </div>
                </div>

              </div>

              {/* Timeline baseline */}
              <div className="bg-[#0f172a] border border-white/10 rounded-[32px] p-6">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Histórico vs Proyección Simulada (Línea de Tiempo Completa)</h4>
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

          {/* SUB-TAB 2: MONTE CARLO Y TORNADO */}
          {activeSensSubTab === 'montecarlo' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              
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

          {/* SUB-TAB 3: COBERTURAS DSCR */}
          {activeSensSubTab === 'dscr' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              
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
      )}

    </div>
  );
}
