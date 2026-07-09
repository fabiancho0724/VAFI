import { useState, useEffect, useMemo } from 'react';
import { 
  BrainCircuit, 
  Filter, 
  BarChart as BarChartIcon, 
  Settings, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Wallet, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle,
  Info,
  Layers,
  ChevronRight,
  ClipboardList
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend,
  Line,
  ComposedChart
} from 'recharts';
import { fetchAndParseCSV } from '../lib/csvParser';
import historicalGastosData from '../data/historicalGastos.json';

const MONTHS_STR = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

interface GastoRecord {
  año: number;
  mes: number;
  tipo: string;
  dependencia: string;
  categoria: string;
  recurso: string;
  compromiso: number;
  pago: number;
}

const rawHistoricalGastos = historicalGastosData as GastoRecord[];

export const RESOURCES_LIST = [
  "10.0-Aportes Nacion - Funcionamiento",
  "10.1-Aportes Nación - PIC Convencional",
  "10.2-Aportes Nación - PIC Territorial",
  "10.5-Aportes Nación - Política de gratuidad",
  "12-Estampillas Otras Universidades",
  "13-Cooperativas",
  "14-Matriculas FSE",
  "16.0-Aportes inversion",
  "17-Devolucion descuento electoral",
  "20-Propios",
  "21-Devolucion IVA",
  "31-Posgrados",
  "32-Extension",
  "33-Convenios con derechos",
  "34-Convenios sin derechos",
  "35-Educacion continuada",
  "40-Estampilla UPTC"
];

export function getRecursoEquivalence(recursoStr: string): string {
  const clean = String(recursoStr || '').trim();
  const match = clean.match(/^(\d+(?:\.\d+)?)/);
  const code = match ? match[1] : clean;
  
  if (code === "10" || code === "10.0") return "10.0-Aportes Nacion - Funcionamiento";
  if (code === "10.1") return "10.1-Aportes Nación - PIC Convencional";
  if (code === "10.2") return "10.2-Aportes Nación - PIC Territorial";
  if (code === "10.5") return "10.5-Aportes Nación - Política de gratuidad";
  if (code === "12") return "12-Estampillas Otras Universidades";
  if (code === "13") return "13-Cooperativas";
  if (code === "14") return "14-Matriculas FSE";
  if (code === "16" || code === "16.0") return "16.0-Aportes inversion";
  if (code === "17") return "17-Devolucion descuento electoral";
  if (code === "20") return "20-Propios";
  if (code === "21") return "21-Devolucion IVA";
  if (code === "31") return "31-Posgrados";
  if (code === "32") return "32-Extension";
  if (code === "33") return "33-Convenios con derechos";
  if (code === "34") return "34-Convenios sin derechos";
  if (code === "35") return "35-Educacion continuada";
  if (code === "40") return "40-Estampilla UPTC";
  
  const lower = clean.toLowerCase();
  if (lower.includes("gratuidad")) return "10.5-Aportes Nación - Política de gratuidad";
  if (lower.includes("cooperativa")) return "13-Cooperativas";
  if (lower.includes("fse") || lower.includes("fondo de solidaridad")) return "14-Matriculas FSE";
  if (lower.includes("descuento electoral")) return "17-Devolucion descuento electoral";
  if (lower.includes("iva")) return "21-Devolucion IVA";
  if (lower.includes("posgrado")) return "31-Posgrados";
  if (lower.includes("extension") || lower.includes("extensión")) return "32-Extension";
  if (lower.includes("estampilla uptc") || lower.includes("estampilla u.p.t.c.")) return "40-Estampilla UPTC";
  if (lower.includes("aportes nacion") || lower.includes("aportes nación")) return "10.0-Aportes Nacion - Funcionamiento";
  if (lower.includes("propios")) return "20-Propios";
  
  return clean;
}

function SpeedometerGauge({ value, title, subtitle }: { value: number; title: string; subtitle: string }) {
  const clampedValue = Math.min(Math.max(value, 0), 150);
  const angle = (clampedValue / 150) * 180 - 180;
  
  return (
    <div className="glass-card rounded-[24px] p-6 border border-white/5 flex flex-col items-center justify-center text-center">
      <h4 className="text-sm font-bold text-white mb-1">{title}</h4>
      <p className="text-[10px] text-on-surface-variant uppercase font-mono tracking-widest mb-4">{subtitle}</p>
      
      <div className="relative w-48 h-28 flex items-center justify-center overflow-hidden">
        <svg className="w-40 h-40 absolute top-0" viewBox="0 0 200 200">
          <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="16" strokeLinecap="round" />
          <path d="M 20 100 A 80 80 0 0 1 84 48" fill="none" stroke="#f43f5e" strokeWidth="16" />
          <path d="M 84 48 A 80 80 0 0 1 124 48" fill="none" stroke="#eab308" strokeWidth="16" />
          <path d="M 124 48 A 80 80 0 0 1 180 100" fill="none" stroke="#4ade80" strokeWidth="16" strokeLinecap="round" />
          <g transform={`translate(100, 100) rotate(${angle})`}>
            <line x1="0" y1="0" x2="-65" y2="0" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" className="drop-shadow-lg" />
            <circle cx="0" cy="0" r="7" fill="#ffffff" />
            <circle cx="0" cy="0" r="3" fill="#0b1326" />
          </g>
        </svg>
        <div className="absolute bottom-1 flex flex-col items-center">
          <span className="text-3xl font-display font-bold text-white">{value.toFixed(1)}%</span>
        </div>
      </div>
      
      <div className="flex gap-4 mt-2 text-[10px] font-mono text-on-surface-variant">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> Déficit</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500"></span> Alerta</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> Superávit</span>
      </div>
    </div>
  );
}

export function PredictiveScreen({ onNavigate }: { onNavigate: (s: string) => void }) {
  const [activeTab, setActiveTab] = useState<'kpi' | 'flow' | 'equilibrium' | 'simulator'>('kpi');
  const [dataStage, setDataStage] = useState<'loading' | 'ready'>('loading');
  const [viewDimension, setViewDimension] = useState<'compromiso' | 'pago'>('pago');
  const [rawYearlyIncomes, setRawYearlyIncomes] = useState<Record<number, any[]>>({});
  
  const [filterUnidad, setFilterUnidad] = useState<string>('Todos');
  const [filterRecurso, setFilterRecurso] = useState<string>('Todos');
  const [filterMes, setFilterMes] = useState<string>('Todos');
  const [filterTipoGasto, setFilterTipoGasto] = useState<string>('Todos');

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

  useEffect(() => {
    async function loadData() {
      try {
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
        
        setRawYearlyIncomes(loadedData);
        setDataStage('ready');
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
  };

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

  const financialData = useMemo(() => {
    if (Object.keys(rawYearlyIncomes).length === 0) {
      return {
        baselineFlow: [],
        simulatedFlow: [],
        totals: { 
          baselineIng: 0, 
          baselineGasComp: 0, baselineGasPago: 0,
          baselineNetComp: 0, baselineNetPago: 0,
          simIng: 0, 
          simGasComp: 0, simGasPago: 0,
          simNetComp: 0, simNetPago: 0
        },
        resourceBaselines: {},
        categoryBreakdown: { compromiso: [], pago: [] }
      };
    }

    // Structures to hold values broken down by year, resource, and month index
    const incomesByYearRes: Record<number, Record<string, number[]>> = {};
    const expensesCompByYearRes: Record<number, Record<string, number[]>> = {};
    const expensesPagoByYearRes: Record<number, Record<string, number[]>> = {};

    [2023, 2024, 2025, 2026].forEach(year => {
      incomesByYearRes[year] = {};
      expensesCompByYearRes[year] = {};
      expensesPagoByYearRes[year] = {};
      
      RESOURCES_LIST.forEach(r => {
        incomesByYearRes[year][r] = new Array(12).fill(0);
        expensesCompByYearRes[year][r] = new Array(12).fill(0);
        expensesPagoByYearRes[year][r] = new Array(12).fill(0);
      });
    });

    // Populate Incomes
    [2023, 2024, 2025, 2026].forEach(year => {
      const rows = rawYearlyIncomes[year] || [];
      rows.forEach(row => {
        const recRaw = String(row['Recurso'] || '').trim();
        const recMapped = getRecursoEquivalence(recRaw);
        if (!incomesByYearRes[year][recMapped]) return;

        const monthKeys = Object.keys(row).filter(k => k.trim().toLowerCase().startsWith('valor ')).slice(0, 12);
        monthKeys.forEach((key, i) => {
          const val = parseFloat(String(row[key] || '0').replace(/[^0-9.-]+/g, '')) || 0;
          incomesByYearRes[year][recMapped][i] += val;
        });
      });
    });

    // Populate Expenses
    rawHistoricalGastos.forEach(row => {
      if (filterUnidad !== 'Todos' && row.dependencia !== filterUnidad) return;
      if (filterTipoGasto !== 'Todos' && row.tipo !== filterTipoGasto) return;

      const year = row.año;
      const monthIdx = row.mes - 1;
      const recMapped = getRecursoEquivalence(row.recurso);
      
      if (monthIdx >= 0 && monthIdx < 12 && expensesCompByYearRes[year] && expensesCompByYearRes[year][recMapped]) {
        expensesCompByYearRes[year][recMapped][monthIdx] += row.compromiso;
        expensesPagoByYearRes[year][recMapped][monthIdx] += row.pago;
      }
    });

    // Calculate baseline totals for the whole year by resource
    const resourceBaselines: Record<string, { ing: number; gasComp: number; gasPago: number }> = {};
    RESOURCES_LIST.forEach(r => {
      let totIng = 0;
      let totGasComp = 0;
      let totGasPago = 0;

      for (let i = 0; i < 12; i++) {
        // Ene-Jun (2026 real)
        const is2026RealIng = incomesByYearRes[2026][r].reduce((a,b)=>a+b, 0) > 0;
        const is2026RealGas = (expensesCompByYearRes[2026][r].reduce((a,b)=>a+b, 0) + expensesPagoByYearRes[2026][r].reduce((a,b)=>a+b, 0)) > 0;

        const useRealIng = i < 6 && is2026RealIng;
        const useRealGas = i < 6 && is2026RealGas;

        if (useRealIng) {
          totIng += incomesByYearRes[2026][r][i];
        } else {
          let histSum = 0, histCount = 0;
          if (incomesByYearRes[2023][r][i] > 0) { histSum += incomesByYearRes[2023][r][i]; histCount++; }
          if (incomesByYearRes[2024][r][i] > 0) { histSum += incomesByYearRes[2024][r][i]; histCount++; }
          if (incomesByYearRes[2025][r][i] > 0) { histSum += incomesByYearRes[2025][r][i]; histCount++; }
          totIng += (histCount > 0 ? histSum / histCount : 0) * 1.05;
        }

        if (useRealGas) {
          totGasComp += expensesCompByYearRes[2026][r][i];
          totGasPago += expensesPagoByYearRes[2026][r][i];
        } else {
          totGasComp += expensesCompByYearRes[2025][r][i] * 1.05;
          totGasPago += expensesPagoByYearRes[2025][r][i] * 1.05;
        }
      }

      resourceBaselines[r] = {
        ing: totIng / 1e6,
        gasComp: totGasComp / 1e6,
        gasPago: totGasPago / 1e6
      };
    });

    // Category breakdown totals (compromiso vs pago) over the entire simulated year
    let catComp = { personal: 0, funcionamiento: 0, transferencias: 0, tasas: 0, deuda: 0, inversion: 0 };
    let catPago = { personal: 0, funcionamiento: 0, transferencias: 0, tasas: 0, deuda: 0, inversion: 0 };

    for (let i = 0; i < 12; i++) {
      const isGasReal = i < 6; // Jan-Jun is real
      const targetYear = isGasReal ? 2026 : 2025;

      const monthlyRows = rawHistoricalGastos.filter(row => row.año === targetYear && row.mes === (i + 1));
      
      monthlyRows.forEach(row => {
        if (filterUnidad !== 'Todos' && row.dependencia !== filterUnidad) return;
        const recMapped = getRecursoEquivalence(row.recurso);
        if (filterRecurso !== 'Todos' && recMapped !== filterRecurso) return;

        // Apply simulator scale factor ONLY to projected months (Jul-Dic)
        const scaleFactor = isGasReal ? 1 : (1 + (simGasByResource[recMapped] || 0) / 100);
        const baselineMultiplier = isGasReal ? 1 : 1.05;

        const compVal = row.compromiso * baselineMultiplier * scaleFactor;
        const pagoVal = row.pago * baselineMultiplier * scaleFactor;

        const tipo = row.tipo;
        if (tipo.includes("2.1.1")) {
          catComp.personal += compVal; catPago.personal += pagoVal;
        } else if (tipo.includes("2.1.2")) {
          catComp.funcionamiento += compVal; catPago.funcionamiento += pagoVal;
        } else if (tipo.includes("2.1.3")) {
          catComp.transferencias += compVal; catPago.transferencias += pagoVal;
        } else if (tipo.includes("2.1.8")) {
          catComp.tasas += compVal; catPago.tasas += pagoVal;
        } else if (tipo.includes("2.2.2")) {
          catComp.deuda += compVal; catPago.deuda += pagoVal;
        } else {
          catComp.inversion += compVal; catPago.inversion += pagoVal;
        }
      });
    }

    // Build flow and totals
    const simulatedFlow = [];
    
    let baseIngAccum = 0;
    let baseGasCompAccum = 0;
    let baseGasPagoAccum = 0;

    let simIngAccum = 0;
    let simGasCompAccum = 0;
    let simGasPagoAccum = 0;

    let totalBaseIng = 0;
    let totalBaseGasComp = 0;
    let totalBaseGasPago = 0;

    let totalSimIng = 0;
    let totalSimGasComp = 0;
    let totalSimGasPago = 0;

    for (let i = 0; i < 12; i++) {
      const isReal = i < 6; // Jan-Jun is real

      let monthBaseIng = 0;
      let monthBaseGasComp = 0;
      let monthBaseGasPago = 0;

      let monthSimIng = 0;
      let monthSimGasComp = 0;
      let monthSimGasPago = 0;

      RESOURCES_LIST.forEach(r => {
        if (filterRecurso !== 'Todos' && r !== filterRecurso) return;

        // A. Baseline values
        let ingBase = 0;
        let gasCompBase = 0;
        let gasPagoBase = 0;

        if (isReal) {
          ingBase = incomesByYearRes[2026][r][i];
          gasCompBase = expensesCompByYearRes[2026][r][i];
          gasPagoBase = expensesPagoByYearRes[2026][r][i];
        } else {
          // Incomes: historical average * 1.05
          let histSum = 0, histCount = 0;
          if (incomesByYearRes[2023][r][i] > 0) { histSum += incomesByYearRes[2023][r][i]; histCount++; }
          if (incomesByYearRes[2024][r][i] > 0) { histSum += incomesByYearRes[2024][r][i]; histCount++; }
          if (incomesByYearRes[2025][r][i] > 0) { histSum += incomesByYearRes[2025][r][i]; histCount++; }
          ingBase = (histCount > 0 ? histSum / histCount : 0) * 1.05;

          // Expenses: 2025 * 1.05
          gasCompBase = expensesCompByYearRes[2025][r][i] * 1.05;
          gasPagoBase = expensesPagoByYearRes[2025][r][i] * 1.05;
        }

        // B. Simulated values: apply simulation factor ONLY if it is projected month
        const simIng = isReal ? ingBase : ingBase * (1 + (simIngByResource[r] || 0) / 100);
        const simGasComp = isReal ? gasCompBase : gasCompBase * (1 + (simGasByResource[r] || 0) / 100);
        const simGasPago = isReal ? gasPagoBase : gasPagoBase * (1 + (simGasByResource[r] || 0) / 100);

        monthBaseIng += ingBase;
        monthBaseGasComp += gasCompBase;
        monthBaseGasPago += gasPagoBase;

        monthSimIng += simIng;
        monthSimGasComp += simGasComp;
        monthSimGasPago += simGasPago;
      });

      totalBaseIng += monthBaseIng;
      totalBaseGasComp += monthBaseGasComp;
      totalBaseGasPago += monthBaseGasPago;

      totalSimIng += monthSimIng;
      totalSimGasComp += monthSimGasComp;
      totalSimGasPago += monthSimGasPago;

      baseIngAccum += monthBaseIng;
      baseGasCompAccum += monthBaseGasComp;
      baseGasPagoAccum += monthBaseGasPago;

      simIngAccum += monthSimIng;
      simGasCompAccum += monthSimGasComp;
      simGasPagoAccum += monthSimGasPago;

      if (filterMes === 'Todos' || filterMes === MONTHS_STR[i]) {
        const activeMonthlyGasto = viewDimension === 'pago' ? monthSimGasPago : monthSimGasComp;
        const executionPct = monthSimIng > 0 ? (activeMonthlyGasto / monthSimIng) * 100 : 0;

        simulatedFlow.push({
          name: MONTHS_STR[i],
          ingresos: parseFloat((monthSimIng / 1e6).toFixed(1)),
          gastosComp: parseFloat((monthSimGasComp / 1e6).toFixed(1)),
          gastosPago: parseFloat((monthSimGasPago / 1e6).toFixed(1)),
          netoComp: parseFloat(((monthSimIng - monthSimGasComp) / 1e6).toFixed(1)),
          netoPago: parseFloat(((monthSimIng - monthSimGasPago) / 1e6).toFixed(1)),
          acumuladoComp: parseFloat(((simIngAccum - simGasCompAccum) / 1e6).toFixed(1)),
          acumuladoPago: parseFloat(((simIngAccum - simGasPagoAccum) / 1e6).toFixed(1)),
          ejecucion: parseFloat(executionPct.toFixed(1))
        });
      }
    }

    return {
      simulatedFlow,
      totals: {
        baselineIng: totalBaseIng / 1e6,
        baselineGasComp: totalBaseGasComp / 1e6,
        baselineGasPago: totalBaseGasPago / 1e6,
        baselineNetComp: (totalBaseIng - totalBaseGasComp) / 1e6,
        baselineNetPago: (totalBaseIng - totalBaseGasPago) / 1e6,

        simIng: totalSimIng / 1e6,
        simGasComp: totalSimGasComp / 1e6,
        simGasPago: totalSimGasPago / 1e6,
        simNetComp: (totalSimIng - totalSimGasComp) / 1e6,
        simNetPago: (totalSimIng - totalSimGasPago) / 1e6
      },
      resourceBaselines,
      categoryBreakdown: {
        compromiso: [
          { name: 'Gastos de Personal (2.1.1)', value: parseFloat((catComp.personal / 1e6).toFixed(1)) },
          { name: 'Gastos de Funcionamiento (2.1.2)', value: parseFloat((catComp.funcionamiento / 1e6).toFixed(1)) },
          { name: 'Transferencias Corrientes (2.1.3)', value: parseFloat((catComp.transferencias / 1e6).toFixed(1)) },
          { name: 'Tasas y Multas (2.1.8)', value: parseFloat((catComp.tasas / 1e6).toFixed(1)) },
          { name: 'Servicios de la Deuda (2.2.2)', value: parseFloat((catComp.deuda / 1e6).toFixed(1)) },
          { name: 'Gastos de Inversión (2.3)', value: parseFloat((catComp.inversion / 1e6).toFixed(1)) }
        ],
        pago: [
          { name: 'Gastos de Personal (2.1.1)', value: parseFloat((catPago.personal / 1e6).toFixed(1)) },
          { name: 'Gastos de Funcionamiento (2.1.2)', value: parseFloat((catPago.funcionamiento / 1e6).toFixed(1)) },
          { name: 'Transferencias Corrientes (2.1.3)', value: parseFloat((catPago.transferencias / 1e6).toFixed(1)) },
          { name: 'Tasas y Multas (2.1.8)', value: parseFloat((catPago.tasas / 1e6).toFixed(1)) },
          { name: 'Servicios de la Deuda (2.2.2)', value: parseFloat((catPago.deuda / 1e6).toFixed(1)) },
          { name: 'Gastos de Inversión (2.3)', value: parseFloat((catPago.inversion / 1e6).toFixed(1)) }
        ]
      }
    };
  }, [
    rawYearlyIncomes,
    filterUnidad,
    filterRecurso,
    filterMes,
    filterTipoGasto,
    simIngByResource,
    simGasByResource,
    viewDimension
  ]);

  const isPago = viewDimension === 'pago';
  const currentGas = isPago ? financialData.totals.simGasPago : financialData.totals.simGasComp;
  const baseGas = isPago ? financialData.totals.baselineGasPago : financialData.totals.baselineGasComp;
  const currentNet = isPago ? financialData.totals.simNetPago : financialData.totals.simNetComp;

  const breakEvenCoverage = currentGas > 0 ? (financialData.totals.simIng / currentGas) * 100 : 0;
  
  const totalComp = financialData.totals.simGasComp;
  const totalPago = financialData.totals.simGasPago;
  const totalIng = financialData.totals.simIng;
  
  const executionRatio = totalComp > 0 ? (totalPago / totalComp) : 0;
  const executionPercent = totalIng > 0 ? (executionRatio / totalIng) * 100 : 0;
  
  const rawExecutionRatio = totalComp > 0 ? (totalPago / totalComp) * 100 : 0;
  const expenseToIncomeRatio = totalIng > 0 ? (currentGas / totalIng) * 100 : 0;

  return (
    <div className="flex flex-col mb-20 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
        <div>
          <p className="text-[#ffcc29] text-xs uppercase tracking-widest font-bold mb-1">MÓDULO FINANCIERO AVANZADO V4.1</p>
          <div className="flex items-center gap-4">
            <h2 className="text-3xl font-bold font-display text-white">Proyección Financiera (Ingresos y Gastos)</h2>
            <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-full flex items-center gap-2">
              <BrainCircuit size={14} className="text-[#ffcc29]" />
              <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider">Cálculo de Proyección Histórica</span>
            </div>
          </div>
        </div>

        {/* Global Toolbar Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex bg-white/5 rounded-xl p-1 border border-white/10 shrink-0">
            <button 
              onClick={() => setViewDimension('compromiso')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${!isPago ? 'bg-primary-container text-black' : 'text-on-surface-variant hover:text-white'}`}
            >
              Compromisos
            </button>
            <button 
              onClick={() => setViewDimension('pago')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${isPago ? 'bg-primary-container text-black' : 'text-on-surface-variant hover:text-white'}`}
            >
              Pagos Efectivos
            </button>
          </div>

          <div className="flex items-center bg-white/5 rounded-xl border border-white/10 px-3 py-1.5 focus-within:border-[#ffcc29]/50 transition-colors">
            <Filter size={14} className="text-on-surface-variant mr-2" />
            <select 
              className="bg-transparent text-xs text-white outline-none w-40 truncate"
              value={filterUnidad}
              onChange={(e) => setFilterUnidad(e.target.value)}
            >
              <option value="Todos" className="bg-[#0f172a] text-white">Todas las Dependencias</option>
              {filterOptions.unidades.filter(u => u !== 'Todos').map(u => (
                <option key={u} value={u} className="bg-[#0f172a] text-white">{u}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center bg-white/5 rounded-xl border border-white/10 px-3 py-1.5 focus-within:border-[#ffcc29]/50 transition-colors">
            <Filter size={14} className="text-on-surface-variant mr-2" />
            <select 
              className="bg-transparent text-xs text-white outline-none w-36 truncate"
              value={filterTipoGasto}
              onChange={(e) => setFilterTipoGasto(e.target.value)}
            >
              <option value="Todos" className="bg-[#0f172a] text-white">Todos los Gastos</option>
              {filterOptions.tiposGastos.filter(t => t !== 'Todos').map(t => (
                <option key={t} value={t} className="bg-[#0f172a] text-white">{t}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center bg-white/5 rounded-xl border border-white/10 px-3 py-1.5 focus-within:border-[#ffcc29]/50 transition-colors">
            <Filter size={14} className="text-on-surface-variant mr-2" />
            <select 
              className="bg-transparent text-xs text-white outline-none w-44 truncate"
              value={filterRecurso}
              onChange={(e) => setFilterRecurso(e.target.value)}
            >
              <option value="Todos" className="bg-[#0f172a] text-white">Todos los Recursos</option>
              {filterOptions.recursos.filter(r => r !== 'Todos').map(r => (
                <option key={r} value={r} className="bg-[#0f172a] text-white">{r}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center bg-white/5 rounded-xl border border-white/10 px-3 py-1.5 focus-within:border-[#ffcc29]/50 transition-colors">
            <Filter size={14} className="text-on-surface-variant mr-2" />
            <select 
              className="bg-transparent text-xs text-white outline-none w-28"
              value={filterMes}
              onChange={(e) => setFilterMes(e.target.value)}
            >
              <option value="Todos" className="bg-[#0f172a] text-white">Todos los Meses</option>
              {MONTHS_STR.map(m => (
                <option key={m} value={m} className="bg-[#0f172a] text-white">{m}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-white/10 mb-8 bg-white/5 p-1 rounded-xl w-fit">
        <button 
          onClick={() => setActiveTab('kpi')}
          className={`px-5 py-2 text-sm font-medium rounded-lg flex items-center gap-2 transition-all ${activeTab === 'kpi' ? 'bg-[#ffcc29] text-black font-bold' : 'text-on-surface-variant hover:text-white'}`}
        >
          <Activity size={16} />
          Tablero Ejecutivo
        </button>
        <button 
          onClick={() => setActiveTab('flow')}
          className={`px-5 py-2 text-sm font-medium rounded-lg flex items-center gap-2 transition-all ${activeTab === 'flow' ? 'bg-[#ffcc29] text-black font-bold' : 'text-on-surface-variant hover:text-white'}`}
        >
          <Wallet size={16} />
          Flujo de Caja
        </button>
        <button 
          onClick={() => setActiveTab('equilibrium')}
          className={`px-5 py-2 text-sm font-medium rounded-lg flex items-center gap-2 transition-all ${activeTab === 'equilibrium' ? 'bg-[#ffcc29] text-black font-bold' : 'text-on-surface-variant hover:text-white'}`}
        >
          <Layers size={16} />
          Equilibrio Presupuestal
        </button>
        <button 
          onClick={() => setActiveTab('simulator')}
          className={`px-5 py-2 text-sm font-medium rounded-lg flex items-center gap-2 transition-all ${activeTab === 'simulator' ? 'bg-[#ffcc29] text-black font-bold' : 'text-on-surface-variant hover:text-white'}`}
        >
          <Settings size={16} />
          Simulador Financiero
        </button>
      </div>

      {/* TAB CONTENT: EXECUTIVE DASHBOARD */}
      {activeTab === 'kpi' && (
        <div className="space-y-8 animate-fade-in">
          {/* Active Settings Banner */}
          <div className="glass-card rounded-[18px] px-6 py-4 border border-white/5 flex flex-wrap gap-6 items-center justify-between bg-white/5 text-xs text-on-surface-variant">
            <div className="flex items-center gap-2">
              <ClipboardList className="text-[#ffcc29]" size={20} />
              <span>
                <strong>Nota:</strong> Los valores de <strong>Enero a Junio</strong> corresponden a los datos contables reales y no son modificados por el simulador. La proyección y simulación se aplica a <strong>Julio-Diciembre</strong>.
              </span>
            </div>
            <div className="px-3 py-1 rounded bg-[#ffcc29]/10 text-[#ffcc29] font-mono">
              Vista: {isPago ? 'Pagos Efectivos' : 'Compromisos'}
            </div>
          </div>

          {/* Main KPI Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="glass-card rounded-[24px] p-6 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-[#4ade80]"></div>
              <h4 className="text-xs font-mono text-on-surface-variant uppercase tracking-widest mb-2 flex justify-between">
                Ingresos Totales (Sim)
                <TrendingUp size={12} className="text-[#4ade80]" />
              </h4>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-display font-bold text-white">${financialData.totals.simIng.toLocaleString('es-CO', {maximumFractionDigits: 1})}</span>
                <span className="text-[10px] font-mono text-on-surface-variant">mill.</span>
              </div>
              <p className="text-[10px] text-on-surface-variant mt-2">
                Inicial: ${financialData.totals.baselineIng.toLocaleString('es-CO', {maximumFractionDigits: 1})} mill.
              </p>
            </div>

            <div className="glass-card rounded-[24px] p-6 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-[#f43f5e]"></div>
              <h4 className="text-xs font-mono text-on-surface-variant uppercase tracking-widest mb-2 flex justify-between">
                Gastos Totales ({isPago ? 'Pagos' : 'Compromisos'})
                <TrendingDown size={12} className="text-[#f43f5e]" />
              </h4>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-display font-bold text-white">${currentGas.toLocaleString('es-CO', {maximumFractionDigits: 1})}</span>
                <span className="text-[10px] font-mono text-on-surface-variant">mill.</span>
              </div>
              <p className="text-[10px] text-on-surface-variant mt-2">
                Inicial: ${baseGas.toLocaleString('es-CO', {maximumFractionDigits: 1})} mill.
              </p>
            </div>

            <div className="glass-card rounded-[24px] p-6 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-[#7bd0ff]"></div>
              <h4 className="text-xs font-mono text-on-surface-variant uppercase tracking-widest mb-2">Resultado Neto</h4>
              <div className="flex items-baseline gap-2">
                <span className={`text-3xl font-display font-bold ${currentNet >= 0 ? 'text-[#4ade80]' : 'text-[#f43f5e]'}`}>
                  ${currentNet.toLocaleString('es-CO', {maximumFractionDigits: 1})}
                </span>
                <span className="text-[10px] font-mono text-on-surface-variant">mill.</span>
              </div>
              <span className={`inline-flex items-center gap-1 text-[10px] font-bold mt-2 px-2 py-0.5 rounded-full ${currentNet >= 0 ? 'bg-[#4ade80]/10 text-[#4ade80]' : 'bg-[#f43f5e]/10 text-[#f43f5e]'}`}>
                {currentNet >= 0 ? 'Superávit' : 'Déficit'}
              </span>
            </div>

            <div className="glass-card rounded-[24px] p-6 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-[#ffcc29]"></div>
              <h4 className="text-xs font-mono text-on-surface-variant uppercase tracking-widest mb-2 flex justify-between">
                % de Ejecución
                <span className="text-[#ffcc29] font-sans text-[10px] font-bold">Pago/Comp / Ingresos</span>
              </h4>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-display font-bold text-white">{executionPercent.toFixed(2)}%</span>
              </div>
              <div className="text-[9px] text-on-surface-variant mt-2 font-mono flex flex-col gap-0.5">
                <span>Pago vs Compromiso: <strong>{rawExecutionRatio.toFixed(1)}%</strong></span>
                <span>Gastos vs Ingresos: <strong>{expenseToIncomeRatio.toFixed(1)}%</strong></span>
              </div>
            </div>
          </div>

          {/* Monthly Composed Chart */}
          <div className="grid grid-cols-1 gap-8">
            <div className="glass-card rounded-[32px] p-8 flex flex-col min-h-[450px]">
              <h3 className="text-lg font-display font-bold text-white mb-6 flex items-center gap-2">
                <BarChartIcon size={20} className="text-[#ffcc29]" />
                Flujo Mensual de Caja e Indicador de Ejecución (Ene-Jun Real / Jul-Dic Proy)
              </h3>
              <div className="flex-1 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={financialData.simulatedFlow} margin={{ top: 20, right: -5, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" tick={{fontSize: 10, fontFamily: 'monospace'}} />
                    <YAxis yAxisId="left" stroke="rgba(255,255,255,0.4)" tick={{fontSize: 10, fontFamily: 'monospace'}} tickFormatter={(v) => `$${v}`} />
                    <YAxis yAxisId="right" orientation="right" stroke="#ffcc29" tick={{fontSize: 10, fontFamily: 'monospace'}} tickFormatter={(v) => `${v}%`} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                    <Legend wrapperStyle={{ fontSize: '11px', opacity: 0.8 }} />
                    
                    <Bar yAxisId="left" dataKey="ingresos" name="Ingresos" fill="#4ade80" radius={[4, 4, 0, 0]} maxBarSize={30} />
                    <Bar yAxisId="left" dataKey={isPago ? 'gastosPago' : 'gastosComp'} name={isPago ? 'Gastos (Pagos)' : 'Gastos (Compromisos)'} fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={30} />
                    <Line yAxisId="right" type="monotone" dataKey="ejecucion" name="Tasa Ejecución (%)" stroke="#ffcc29" strokeWidth={3} dot={{ r: 4, fill: '#ffcc29', strokeWidth: 0 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Expenses Breakdown */}
          <div className="glass-card rounded-[32px] p-8">
            <h3 className="text-base font-bold text-white mb-6">Desglose de Gastos por Tipo (Millones)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(isPago ? financialData.categoryBreakdown.pago : financialData.categoryBreakdown.compromiso).map((cat, idx) => (
                <div key={idx} className="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono text-on-surface-variant uppercase block mb-1">Gasto Contable</span>
                    <span className="text-xs font-bold text-white truncate max-w-[200px] block">{cat.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-white font-mono">${cat.value.toLocaleString('es-CO')}M</span>
                    <span className="text-[9px] text-on-surface-variant block mt-0.5">
                      {totalComp > 0 ? ((cat.value / (isPago ? totalPago : totalComp)) * 100).toFixed(1) : 0}% del total
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: CASH FLOW DETAILS */}
      {activeTab === 'flow' && (
        <div className="space-y-8 animate-fade-in">
          <div className="glass-card rounded-[32px] overflow-hidden border border-white/5">
            <div className="px-8 py-6 border-b border-white/5 bg-white/5 flex flex-wrap gap-4 justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-white">Consolidado Mensual de Caja</h3>
                <p className="text-xs text-on-surface-variant mt-1">Enero-Junio: Histórico Real. Julio-Diciembre: Proyección Simulada. Valores en millones de pesos ($M).</p>
              </div>
              <div className="px-3 py-1 rounded bg-[#ffcc29]/10 text-[#ffcc29] text-xs font-mono">Tabla Comparativa</div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-[10px] font-mono text-on-surface-variant uppercase bg-white/5">
                    <th className="px-4 py-4">Mes</th>
                    <th className="px-4 py-4 text-right">Ingresos (M)</th>
                    <th className="px-4 py-4 text-right">Gastos Comp (M)</th>
                    <th className="px-4 py-4 text-right">Gastos Pago (M)</th>
                    <th className="px-4 py-4 text-right">Neto Comp (M)</th>
                    <th className="px-4 py-4 text-right">Neto Pago (M)</th>
                    <th className="px-4 py-4 text-right">Acumulado Comp (M)</th>
                    <th className="px-4 py-4 text-right">Acumulado Pago (M)</th>
                    <th className="px-4 py-4 text-right">Tasa Ejecución (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs">
                  {financialData.simulatedFlow.map((row, idx) => (
                    <tr key={idx} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-4 font-bold text-white">{row.name}</td>
                      <td className="px-4 py-4 text-right text-[#4ade80] font-mono">${row.ingresos.toLocaleString('es-CO')}</td>
                      <td className="px-4 py-4 text-right text-orange-400 font-mono">${row.gastosComp.toLocaleString('es-CO')}</td>
                      <td className="px-4 py-4 text-right text-[#f43f5e] font-mono">${row.gastosPago.toLocaleString('es-CO')}</td>
                      <td className={`px-4 py-4 text-right font-mono font-bold ${row.netoComp >= 0 ? 'text-[#4ade80]' : 'text-orange-400'}`}>
                        ${row.netoComp.toLocaleString('es-CO')}
                      </td>
                      <td className={`px-4 py-4 text-right font-mono font-bold ${row.netoPago >= 0 ? 'text-[#4ade80]' : 'text-[#f43f5e]'}`}>
                        ${row.netoPago.toLocaleString('es-CO')}
                      </td>
                      <td className="px-4 py-4 text-right text-orange-200 font-mono">${row.acumuladoComp.toLocaleString('es-CO')}</td>
                      <td className="px-4 py-4 text-right text-white font-mono">${row.acumuladoPago.toLocaleString('es-CO')}</td>
                      <td className="px-4 py-4 text-right text-[#ffcc29] font-mono font-bold">{row.ejecucion}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: BREAK-EVEN EQUILIBRIUM */}
      {activeTab === 'equilibrium' && (
        <div className="space-y-8 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <SpeedometerGauge 
              value={breakEvenCoverage} 
              title="Equilibrio Presupuestal" 
              subtitle={`Basado en ${isPago ? 'Pagos' : 'Compromisos'}`} 
            />
            
            <div className="glass-card rounded-[24px] p-6 border border-white/5 flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-bold text-white mb-1">Capacidad Financiera ({isPago ? 'Caja' : 'Presupuesto'})</h4>
                <p className="text-[10px] text-on-surface-variant uppercase font-mono tracking-widest mb-4">Estado del Margen</p>
                <div className="mt-4 space-y-4">
                  <div>
                    <span className="text-xs text-on-surface-variant block mb-1">Resultado Neto Simulado</span>
                    <span className={`text-2xl font-bold font-mono ${currentNet >= 0 ? 'text-[#4ade80]' : 'text-[#f43f5e]'}`}>
                      ${currentNet.toLocaleString('es-CO', {maximumFractionDigits: 1})} <span className="text-xs font-sans text-on-surface-variant font-normal">mill.</span>
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-on-surface-variant block mb-1">Ingresos necesarios para equilibrio</span>
                    <span className="text-xl font-bold font-mono text-white">
                      ${currentGas.toLocaleString('es-CO', {maximumFractionDigits: 1})} <span className="text-xs font-sans text-on-surface-variant font-normal">mill.</span>
                    </span>
                  </div>
                </div>
              </div>
              <div className={`mt-6 p-4 rounded-xl text-xs flex gap-2 items-center ${currentNet >= 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                {currentNet >= 0 ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                <div>
                  <span className="font-bold">{currentNet >= 0 ? 'Superávit' : 'Déficit'}</span>
                  <p className="text-[10px] opacity-80 mt-0.5">
                    {currentNet >= 0 
                      ? 'Los ingresos superan los gastos simulados.' 
                      : 'Se requieren nuevas fuentes de ingresos o reducción de gastos.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="glass-card rounded-[24px] p-6 border border-white/5 flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-bold text-white mb-1">Ejecución del Presupuesto</h4>
                <p className="text-[10px] text-on-surface-variant uppercase font-mono tracking-widest mb-4">Utilización Relativa</p>
                <div className="mt-4 space-y-4">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-on-surface-variant">Gastos vs Aforado</span>
                      <span className="font-bold text-white">{(currentGas / (financialData.totals.simIng || 1) * 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${isPago ? 'bg-gradient-to-r from-[#ffcc29] to-[#f43f5e]' : 'bg-gradient-to-r from-orange-400 to-[#f43f5e]'}`} 
                        style={{width: `${Math.min(100, (currentGas / (financialData.totals.simIng || 1) * 100))}%`}}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-on-surface-variant">Ejecución de Ingresos Recaudados</span>
                      <span className="font-bold text-white">{(financialData.totals.baselineIng > 0 ? (financialData.totals.simIng / financialData.totals.baselineIng) * 100 : 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#4ade80]" 
                        style={{width: `${Math.min(100, (financialData.totals.simIng / (financialData.totals.baselineIng || 1)) * 100)}%`}}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-white/5 p-4 rounded-xl text-[10px] text-on-surface-variant flex gap-2 items-start mt-6">
                <Info size={16} className="text-secondary shrink-0" />
                <p>El punto de equilibrio se recalcula dinámicamente con los parámetros modificados en el simulador.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: RESOURCE-BASED SIMULATOR */}
      {activeTab === 'simulator' && (
        <div className="space-y-8 animate-fade-in">
          <div className="glass-card rounded-[24px] p-6 border border-[#ffcc29]/20 bg-[#0c1527] flex justify-between items-center">
            <div>
              <h3 className="font-bold text-white text-lg flex items-center gap-2">
                <Settings className="text-[#ffcc29]" size={20} />
                Simulación Financiera Detallada por Recurso UPTC
              </h3>
              <p className="text-xs text-on-surface-variant mt-1">
                Ajusta las tasas de variación porcentual de ingresos y gastos para cada una de las 17 fuentes presupuestarias. **Afecta únicamente la proyección de Julio a Diciembre**.
              </p>
            </div>
            <button 
              onClick={handleResetSimulator}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-on-surface-variant hover:text-white transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
            >
              <RotateCcw size={14} />
              Reiniciar Simulador
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {RESOURCES_LIST.map((resName) => {
              const baseline = financialData.resourceBaselines[resName] || { ing: 0, gasComp: 0, gasPago: 0 };
              const currentGasBaseline = isPago ? baseline.gasPago : baseline.gasComp;

              const valIng = simIngByResource[resName] || 0;
              const valGas = simGasByResource[resName] || 0;

              const simIngValue = baseline.ing * (1 + valIng / 100);
              const simGasValue = currentGasBaseline * (1 + valGas / 100);
              const simNetValue = simIngValue - simGasValue;

              return (
                <div key={resName} className="glass-card rounded-[24px] p-6 border border-white/5 flex flex-col justify-between space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-sm font-bold text-white">{resName}</h4>
                      <p className="text-[10px] text-on-surface-variant uppercase font-mono tracking-wider mt-0.5">
                        Línea de Proyección Anual (Base)
                      </p>
                    </div>
                    <span className="text-[10px] font-mono bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-full text-white">
                      Neto: ${(baseline.ing - currentGasBaseline).toFixed(1)}M
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 bg-white/5 p-3 rounded-xl text-center text-xs">
                    <div>
                      <span className="text-on-surface-variant text-[10px] block">Ingreso Proyectado Base</span>
                      <strong className="text-[#4ade80] font-mono">${baseline.ing.toFixed(1)}M</strong>
                    </div>
                    <div>
                      <span className="text-on-surface-variant text-[10px] block">Gasto Proyectado Base</span>
                      <strong className="text-[#f43f5e] font-mono">${currentGasBaseline.toFixed(1)}M</strong>
                    </div>
                  </div>

                  <div className="space-y-4 pt-2">
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-on-surface-variant">Simular Proyección Ingreso: {valIng > 0 ? '+' : ''}{valIng}%</span>
                        <span className="font-bold text-[#4ade80] font-mono">${simIngValue.toFixed(1)}M</span>
                      </div>
                      <input 
                        type="range" 
                        min="-100" 
                        max="100" 
                        step="5"
                        value={valIng} 
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setSimIngByResource(prev => ({ ...prev, [resName]: val }));
                        }}
                        className="w-full accent-[#4ade80]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-on-surface-variant">Simular Proyección Gasto: {valGas > 0 ? '+' : ''}{valGas}%</span>
                        <span className="font-bold text-[#f43f5e] font-mono">${simGasValue.toFixed(1)}M</span>
                      </div>
                      <input 
                        type="range" 
                        min="-100" 
                        max="100" 
                        step="5"
                        value={valGas} 
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setSimGasByResource(prev => ({ ...prev, [resName]: val }));
                        }}
                        className="w-full accent-[#f43f5e]"
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/5 flex justify-between items-center text-xs font-mono">
                    <span className="text-on-surface-variant">Resultado Proyectado Simulado:</span>
                    <strong className={simNetValue >= 0 ? 'text-[#4ade80]' : 'text-[#f43f5e]'}>
                      ${simNetValue.toFixed(1)}M
                    </strong>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
