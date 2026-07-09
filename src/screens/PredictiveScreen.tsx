import { useState, useEffect, useMemo } from 'react';
import { 
  BrainCircuit, 
  Filter, 
  BarChart as BarChartIcon, 
  Settings, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  PieChart as PieChartIcon, 
  Wallet, 
  RotateCcw, 
  DollarSign, 
  CheckCircle2, 
  AlertTriangle,
  Info,
  Calendar,
  Layers,
  ChevronRight,
  ClipboardList
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  AreaChart, 
  Area, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend,
  LineChart,
  Line
} from 'recharts';
import { fetchAndParseCSV } from '../lib/csvParser';
import historicalGastosData from '../data/historicalGastos.json';

const MONTHS_STR = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const COLORS = ['#ffcc29', '#7bd0ff', '#4ade80', '#c084fc', '#f43f5e', '#ff8b3d'];

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

// Cast JSON import
const rawHistoricalGastos = historicalGastosData as GastoRecord[];

// Helper to classify resource code types
export function getResourceLabel(recursoStr: string): string {
  const cleanStr = recursoStr.trim();
  // Extract number prefix if present, e.g. "10.0 - Aportes" -> "10.0"
  const match = cleanStr.match(/^(\d+(?:\.\d+)?)/);
  const code = match ? match[1] : cleanStr;
  
  if (code.startsWith('1')) {
    return 'Recursos Nación';
  } else if (code.startsWith('2')) {
    return 'Recursos Propios';
  } else if (code.startsWith('3')) {
    return 'Convenios y Posgrados';
  }
  return 'Otros Recursos';
}

// Custom SVG Speedometer Gauge Component
function SpeedometerGauge({ value, title, subtitle }: { value: number; title: string; subtitle: string }) {
  const clampedValue = Math.min(Math.max(value, 0), 150);
  const angle = (clampedValue / 150) * 180 - 180; // Map 0-150% to -180 to 0 degrees
  
  return (
    <div className="glass-card rounded-[24px] p-6 border border-white/5 flex flex-col items-center justify-center text-center">
      <h4 className="text-sm font-bold text-white mb-1">{title}</h4>
      <p className="text-[10px] text-on-surface-variant uppercase font-mono tracking-widest mb-4">{subtitle}</p>
      
      <div className="relative w-48 h-28 flex items-center justify-center overflow-hidden">
        <svg className="w-40 h-40 absolute top-0" viewBox="0 0 200 200">
          {/* Background Arc */}
          <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="16" strokeLinecap="round" />
          
          {/* Color Arc Segments */}
          <path d="M 20 100 A 80 80 0 0 1 84 48" fill="none" stroke="#f43f5e" strokeWidth="16" /> {/* Red: 0-60% */}
          <path d="M 84 48 A 80 80 0 0 1 124 48" fill="none" stroke="#eab308" strokeWidth="16" />  {/* Yellow: 60-100% */}
          <path d="M 124 48 A 80 80 0 0 1 180 100" fill="none" stroke="#4ade80" strokeWidth="16" strokeLinecap="round" /> {/* Green: 100-150% */}
          
          {/* Needle Indicator */}
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
  
  // Toggle Dimension display (Compromiso vs Pago efectivo)
  const [viewDimension, setViewDimension] = useState<'compromiso' | 'pago'>('pago');
  
  // Data State
  const [rawYearlyIncomes, setRawYearlyIncomes] = useState<Record<number, any[]>>({});
  
  // General Filters
  const [filterUnidad, setFilterUnidad] = useState<string>('Todos');
  const [filterRecurso, setFilterRecurso] = useState<string>('Todos');
  const [filterMes, setFilterMes] = useState<string>('Todos');

  // Simulator Sliders State
  // 1. Incomes Variables
  const [simMatricula, setSimMatricula] = useState<number>(1350000); // Base Matrícula COP
  const [simEstudiantes, setSimEstudiantes] = useState<number>(18700); // Students pregrado
  const [simIncrementoIngresos, setSimIncrementoIngresos] = useState<number>(5); // Other Incomes growth rate %
  const [simNuevosIngresos, setSimNuevosIngresos] = useState<number>(0); // Flat millions of COP added

  // 2. Expenses Variables
  const [simTalentoHumano, setSimTalentoHumano] = useState<number>(0); // Personnel change %
  const [simFuncionamiento, setSimFuncionamiento] = useState<number>(0); // Functioning change %
  const [simInversion, setSimInversion] = useState<number>(0); // Investment change %
  const [simContratacion, setSimContratacion] = useState<number>(0); // OPS/Contracts change %
  const [simOtrosGastos, setSimOtrosGastos] = useState<number>(0); // Other expenses change %

  // Load Incomes CSV Data
  useEffect(() => {
    async function loadData() {
      try {
        const years = [2023, 2024, 2025, 2026];
        const loadedData: Record<number, any[]> = {};
        
        await Promise.all(years.map(async (year) => {
          try {
            const rows = await fetchAndParseCSV(`https://raw.githubusercontent.com/fabiancho0724/VAFI-Reporte-Financiero/main/Ingreso%20Mensual%20${year}.csv`);
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

  // Reset all simulator sliders to default baseline values
  const handleResetSimulator = () => {
    setSimMatricula(1350000);
    setSimEstudiantes(18700);
    setSimIncrementoIngresos(5);
    setSimNuevosIngresos(0);
    setSimTalentoHumano(0);
    setSimFuncionamiento(0);
    setSimInversion(0);
    setSimContratacion(0);
    setSimOtrosGastos(0);
  };

  // Get unique options for filters
  const filterOptions = useMemo(() => {
    const unidades = new Set<string>();
    const recursos = new Set<string>();
    
    // Incomes recursos
    if (rawYearlyIncomes[2026]) {
      rawYearlyIncomes[2026].forEach(row => {
        const rec = String(row['Recurso'] || '').trim();
        if (rec) recursos.add(rec);
      });
    }

    // Expenses dependencias
    rawHistoricalGastos.forEach(row => {
      const dep = String(row.dependencia || '').trim();
      const rec = String(row.recurso || '').trim();
      if (dep) unidades.add(dep);
      
      const codeMatch = rec.match(/^(\d+(?:\.\d+)?)/);
      if (codeMatch) {
        recursos.add(codeMatch[1]);
      }
    });

    return {
      unidades: ['Todos', ...Array.from(unidades).sort()],
      recursos: ['Todos', ...Array.from(recursos).sort((a,b) => a.localeCompare(b, undefined, {numeric: true}))]
    };
  }, [rawYearlyIncomes]);

  // Compute baseline and simulated data
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
        categoriesBaseline: [],
        categoriesSimulated: [],
        resourcesBaseline: [],
        resourcesSimulated: [],
        historicalYearsSummary: []
      };
    }

    const incomesByYear: Record<number, number[]> = {};
    const expensesCompByYear: Record<number, number[]> = {};
    const expensesPagoByYear: Record<number, number[]> = {};

    [2023, 2024, 2025, 2026].forEach(year => {
      incomesByYear[year] = new Array(12).fill(0);
      expensesCompByYear[year] = new Array(12).fill(0);
      expensesPagoByYear[year] = new Array(12).fill(0);
      
      // Process Incomes
      const rows = rawYearlyIncomes[year] || [];
      rows.forEach(row => {
        const rec = String(row['Recurso'] || '').trim();
        if (filterRecurso !== 'Todos' && rec !== filterRecurso) return;

        const monthKeys = Object.keys(row).filter(k => k.trim().toLowerCase().startsWith('valor ')).slice(0, 12);
        monthKeys.forEach((key, i) => {
          const val = parseFloat(String(row[key] || '0').replace(/[^0-9.-]+/g, '')) || 0;
          incomesByYear[year][i] += val;
        });
      });
    });

    // Process Expenses (Gastos) from consolidated JSON
    rawHistoricalGastos.forEach(row => {
      if (filterUnidad !== 'Todos' && row.dependencia !== filterUnidad) return;
      
      // Filter by Recurso code
      if (filterRecurso !== 'Todos') {
        const rec = String(row.recurso || '').trim();
        const codeMatch = rec.match(/^(\d+(?:\.\d+)?)/);
        if (!codeMatch || codeMatch[1] !== filterRecurso) return;
      }

      const year = row.año;
      const monthIdx = row.mes - 1;
      if (monthIdx >= 0 && monthIdx < 12 && expensesCompByYear[year]) {
        expensesCompByYear[year][monthIdx] += row.compromiso;
        expensesPagoByYear[year][monthIdx] += row.pago;
      }
    });

    // 2. COMPUTE FLOW (BASELINE VS SIMULATED)
    const baselineFlow = [];
    const simulatedFlow = [];

    let baseIngAccum = 0;
    let baseGasCompAccum = 0;
    let baseGasPagoAccum = 0;
    
    let simIngAccum = 0;
    let simGasCompAccum = 0;
    let simGasPagoAccum = 0;

    let totBaseIng = 0;
    let totBaseGasComp = 0;
    let totBaseGasPago = 0;
    
    let totSimIng = 0;
    let totSimGasComp = 0;
    let totSimGasPago = 0;

    // Tracker for category charts
    let catBaseComp = { personal: 0, funcionamiento: 0, inversion: 0, otros: 0 };
    let catBasePago = { personal: 0, funcionamiento: 0, inversion: 0, otros: 0 };
    let catSimComp = { personal: 0, funcionamiento: 0, inversion: 0, otros: 0 };
    let catSimPago = { personal: 0, funcionamiento: 0, inversion: 0, otros: 0 };

    // Tracker for Resource Breakdown
    let resBaseIng = { nacion: 0, propios: 0, convenios: 0, otros: 0 };
    let resSimIng = { nacion: 0, propios: 0, convenios: 0, otros: 0 };
    let resBaseGasComp = { nacion: 0, propios: 0, convenios: 0, otros: 0 };
    let resBaseGasPago = { nacion: 0, propios: 0, convenios: 0, otros: 0 };
    let resSimGasComp = { nacion: 0, propios: 0, convenios: 0, otros: 0 };
    let resSimGasPago = { nacion: 0, propios: 0, convenios: 0, otros: 0 };

    // Group revenues by resource type to get baseline shares
    if (rawYearlyIncomes[2026]) {
      rawYearlyIncomes[2026].forEach(row => {
        const rec = String(row['Recurso'] || '').trim();
        const label = getResourceLabel(rec);
        const monthKeys = Object.keys(row).filter(k => k.trim().toLowerCase().startsWith('valor ')).slice(0, 12);
        
        monthKeys.forEach((key) => {
          const val = parseFloat(String(row[key] || '0').replace(/[^0-9.-]+/g, '')) || 0;
          if (label === 'Recursos Nación') resBaseIng.nacion += val;
          else if (label === 'Recursos Propios') resBaseIng.propios += val;
          else if (label === 'Convenios y Posgrados') resBaseIng.convenios += val;
          else resBaseIng.otros += val;
        });
      });
    }

    for (let i = 0; i < 12; i++) {
      // A. INCOMES
      let real2026Ing = incomesByYear[2026][i];
      let isIngReal = real2026Ing > 0;
      
      let histSum = 0;
      let histCount = 0;
      if (incomesByYear[2023][i] > 0) { histSum += incomesByYear[2023][i]; histCount++; }
      if (incomesByYear[2024][i] > 0) { histSum += incomesByYear[2024][i]; histCount++; }
      if (incomesByYear[2025][i] > 0) { histSum += incomesByYear[2025][i]; histCount++; }
      const averageHistIng = histCount > 0 ? histSum / histCount : 0;
      
      let baseIng = isIngReal ? real2026Ing : averageHistIng * 1.05;
      let simIng = baseIng;

      if (!isIngReal) {
        simIng = averageHistIng * (1 + simIncrementoIngresos / 100);
        simIng += (simNuevosIngresos * 1e6) / 8;
      }

      // Enrollment simulation impact
      const baselineMatriculaAnnual = 18700 * 1350000;
      const simulatedMatriculaAnnual = simEstudiantes * simMatricula;
      const matriculaDiffMonthly = (simulatedMatriculaAnnual - baselineMatriculaAnnual) / 12;
      simIng += matriculaDiffMonthly;

      // Add to simulated resource share
      const nacionPct = resBaseIng.nacion / (resBaseIng.nacion + resBaseIng.propios + resBaseIng.convenios + resBaseIng.otros || 1);
      const conveniosPct = resBaseIng.convenios / (resBaseIng.nacion + resBaseIng.propios + resBaseIng.convenios + resBaseIng.otros || 1);
      
      resSimIng.nacion += simIng * nacionPct;
      resSimIng.convenios += simIng * conveniosPct;
      resSimIng.propios += simIng * (1 - nacionPct - conveniosPct);

      // B. EXPENSES
      let real2026GasComp = expensesCompByYear[2026][i];
      let real2026GasPago = expensesPagoByYear[2026][i];
      let isGasReal = real2026GasComp > 0 || real2026GasPago > 0;
      
      let baseGasComp = isGasReal ? real2026GasComp : (expensesCompByYear[2025][i] || 0) * 1.05;
      let baseGasPago = isGasReal ? real2026GasPago : (expensesPagoByYear[2025][i] || 0) * 1.05;

      let monthlyRows = rawHistoricalGastos.filter(r => r.año === (isGasReal ? 2026 : 2025) && r.mes === (i+1));
      
      let pBaseComp = 0, pBasePago = 0;
      let fBaseComp = 0, fBasePago = 0;
      let iBaseComp = 0, iBasePago = 0;
      let oBaseComp = 0, oBasePago = 0;

      // Track by Resource
      let resMonthlyBaseComp = { nacion: 0, propios: 0, convenios: 0, otros: 0 };
      let resMonthlyBasePago = { nacion: 0, propios: 0, convenios: 0, otros: 0 };

      monthlyRows.forEach(r => {
        if (filterUnidad !== 'Todos' && r.dependencia !== filterUnidad) return;
        if (filterRecurso !== 'Todos') {
          const codeMatch = r.recurso.match(/^(\d+(?:\.\d+)?)/);
          if (!codeMatch || codeMatch[1] !== filterRecurso) return;
        }

        const comp = r.compromiso;
        const pago = r.pago;
        const typeLabel = r.tipo;

        // Categorize by Type (tipo)
        if (typeLabel.includes('Gastos de Personal') || typeLabel.includes('Personal')) {
          pBaseComp += comp;
          pBasePago += pago;
        } else if (typeLabel.includes('Gastos de Funcionamiento') || typeLabel.includes('Funcionamiento')) {
          fBaseComp += comp;
          fBasePago += pago;
        } else if (typeLabel.includes('Gastos de Inversión') || typeLabel.includes('Inversión') || typeLabel.includes('Inversion')) {
          iBaseComp += comp;
          iBasePago += pago;
        } else {
          oBaseComp += comp;
          oBasePago += pago;
        }

        // Categorize by Resource (recurso)
        const resType = getResourceLabel(r.recurso);
        if (resType === 'Recursos Nación') {
          resMonthlyBaseComp.nacion += comp;
          resMonthlyBasePago.nacion += pago;
        } else if (resType === 'Recursos Propios') {
          resMonthlyBaseComp.propios += comp;
          resMonthlyBasePago.propios += pago;
        } else if (resType === 'Convenios y Posgrados') {
          resMonthlyBaseComp.convenios += comp;
          resMonthlyBasePago.convenios += pago;
        } else {
          resMonthlyBaseComp.otros += comp;
          resMonthlyBasePago.otros += pago;
        }
      });

      // Scaling factor
      const sumBaseComp = pBaseComp + fBaseComp + iBaseComp + oBaseComp;
      const scaleComp = sumBaseComp > 0 ? baseGasComp / sumBaseComp : 1;
      
      const sumBasePago = pBasePago + fBasePago + iBasePago + oBasePago;
      const scalePago = sumBasePago > 0 ? baseGasPago / sumBasePago : 1;

      pBaseComp *= scaleComp; fBaseComp *= scaleComp; iBaseComp *= scaleComp; oBaseComp *= scaleComp;
      pBasePago *= scalePago; fBasePago *= scalePago; iBasePago *= scalePago; oBasePago *= scalePago;

      // Apply scale to resources
      resMonthlyBaseComp.nacion *= scaleComp; resMonthlyBaseComp.propios *= scaleComp; resMonthlyBaseComp.convenios *= scaleComp; resMonthlyBaseComp.otros *= scaleComp;
      resMonthlyBasePago.nacion *= scalePago; resMonthlyBasePago.propios *= scalePago; resMonthlyBasePago.convenios *= scalePago; resMonthlyBasePago.otros *= scalePago;

      // Apply simulator to simulated variables (compromiso and pago)
      let pSimComp = pBaseComp, pSimPago = pBasePago;
      let fSimComp = fBaseComp, fSimPago = fBasePago;
      let iSimComp = iBaseComp, iSimPago = iBasePago;
      let oSimComp = oBaseComp, oSimPago = oBasePago;

      let resMonthlySimComp = { ...resMonthlyBaseComp };
      let resMonthlySimPago = { ...resMonthlyBasePago };

      if (!isGasReal) {
        const pScale = (1 + simTalentoHumano / 100);
        const fScale = (1 + simFuncionamiento / 100) * (1 + simContratacion / 100);
        const iScale = (1 + simInversion / 100);
        const oScale = (1 + simOtrosGastos / 100);

        pSimComp *= pScale; pSimPago *= pScale;
        fSimComp *= fScale; fSimPago *= fScale;
        iSimComp *= iScale; iSimPago *= iScale;
        oSimComp *= oScale; oSimPago *= oScale;

        // Apply same scale to resources
        const globalScale = (pScale + fScale + iScale + oScale) / 4;
        resMonthlySimComp.nacion *= globalScale; resMonthlySimComp.propios *= globalScale; resMonthlySimComp.convenios *= globalScale; resMonthlySimComp.otros *= globalScale;
        resMonthlySimPago.nacion *= globalScale; resMonthlySimPago.propios *= globalScale; resMonthlySimPago.convenios *= globalScale; resMonthlySimPago.otros *= globalScale;
      }

      let simGasComp = pSimComp + fSimComp + iSimComp + oSimComp;
      let simGasPago = pSimPago + fSimPago + iSimPago + oSimPago;

      totBaseIng += baseIng;
      totBaseGasComp += baseGasComp;
      totBaseGasPago += baseGasPago;

      totSimIng += simIng;
      totSimGasComp += simGasComp;
      totSimGasPago += simGasPago;

      baseIngAccum += baseIng;
      baseGasCompAccum += baseGasComp;
      baseGasPagoAccum += baseGasPago;

      simIngAccum += simIng;
      simGasCompAccum += simGasComp;
      simGasPagoAccum += simGasPago;

      // Save category YTDs
      catBaseComp.personal += pBaseComp; catBasePago.personal += pBasePago;
      catBaseComp.funcionamiento += fBaseComp; catBasePago.funcionamiento += fBasePago;
      catBaseComp.inversion += iBaseComp; catBasePago.inversion += iBasePago;
      catBaseComp.otros += oBaseComp; catBasePago.otros += oBasePago;

      catSimComp.personal += pSimComp; catSimPago.personal += pSimPago;
      catSimComp.funcionamiento += fSimComp; catSimPago.funcionamiento += fSimPago;
      catSimComp.inversion += iSimComp; catSimPago.inversion += iSimPago;
      catSimComp.otros += oSimComp; catSimPago.otros += oSimPago;

      // Save Resource YTDs
      resBaseGasComp.nacion += resMonthlyBaseComp.nacion; resBaseGasPago.nacion += resMonthlyBasePago.nacion;
      resBaseGasComp.propios += resMonthlyBaseComp.propios; resBaseGasPago.propios += resMonthlyBasePago.propios;
      resBaseGasComp.convenios += resMonthlyBaseComp.convenios; resBaseGasPago.convenios += resMonthlyBasePago.convenios;
      resBaseGasComp.otros += resMonthlyBaseComp.otros; resBaseGasPago.otros += resMonthlyBasePago.otros;

      resSimGasComp.nacion += resMonthlySimComp.nacion; resSimGasPago.nacion += resMonthlySimPago.nacion;
      resSimGasComp.propios += resMonthlySimComp.propios; resSimGasPago.propios += resMonthlySimPago.propios;
      resSimGasComp.convenios += resMonthlySimComp.convenios; resSimGasPago.convenios += resMonthlySimPago.convenios;
      resSimGasComp.otros += resMonthlySimComp.otros; resSimGasPago.otros += resMonthlySimPago.otros;

      if (filterMes === 'Todos' || filterMes === MONTHS_STR[i]) {
        baselineFlow.push({
          name: MONTHS_STR[i],
          ingresos: parseFloat((baseIng / 1e6).toFixed(1)),
          gastosComp: parseFloat((baseGasComp / 1e6).toFixed(1)),
          gastosPago: parseFloat((baseGasPago / 1e6).toFixed(1)),
          netoComp: parseFloat(((baseIng - baseGasComp) / 1e6).toFixed(1)),
          netoPago: parseFloat(((baseIng - baseGasPago) / 1e6).toFixed(1)),
          acumuladoComp: parseFloat(((baseIngAccum - baseGasCompAccum) / 1e6).toFixed(1)),
          acumuladoPago: parseFloat(((baseIngAccum - baseGasPagoAccum) / 1e6).toFixed(1)),
          isProjected: !isIngReal
        });

        simulatedFlow.push({
          name: MONTHS_STR[i],
          ingresos: parseFloat((simIng / 1e6).toFixed(1)),
          gastosComp: parseFloat((simGasComp / 1e6).toFixed(1)),
          gastosPago: parseFloat((simGasPago / 1e6).toFixed(1)),
          netoComp: parseFloat(((simIng - simGasComp) / 1e6).toFixed(1)),
          netoPago: parseFloat(((simIng - simGasPago) / 1e6).toFixed(1)),
          acumuladoComp: parseFloat(((simIngAccum - simGasCompAccum) / 1e6).toFixed(1)),
          acumuladoPago: parseFloat(((simIngAccum - simGasPagoAccum) / 1e6).toFixed(1)),
          isProjected: !isIngReal
        });
      }
    }

    // Historical summary
    const historicalYearsSummary = [2023, 2024, 2025].map(year => {
      const ing = incomesByYear[year].reduce((a,b) => a+b, 0);
      const gasComp = expensesCompByYear[year].reduce((a,b) => a+b, 0);
      const gasPago = expensesPagoByYear[year].reduce((a,b) => a+b, 0);
      return {
        name: String(year),
        ingresos: parseFloat((ing / 1e6).toFixed(1)),
        gastosComp: parseFloat((gasComp / 1e6).toFixed(1)),
        gastosPago: parseFloat((gasPago / 1e6).toFixed(1)),
        netoComp: parseFloat(((ing - gasComp) / 1e6).toFixed(1)),
        netoPago: parseFloat(((ing - gasPago) / 1e6).toFixed(1))
      };
    });

    historicalYearsSummary.push({
      name: '2026 (Base)',
      ingresos: parseFloat((totBaseIng / 1e6).toFixed(1)),
      gastosComp: parseFloat((totBaseGasComp / 1e6).toFixed(1)),
      gastosPago: parseFloat((totBaseGasPago / 1e6).toFixed(1)),
      netoComp: parseFloat(((totBaseIng - totBaseGasComp) / 1e6).toFixed(1)),
      netoPago: parseFloat(((totBaseIng - totBaseGasPago) / 1e6).toFixed(1))
    });

    return {
      baselineFlow,
      simulatedFlow,
      totals: {
        baselineIng: totBaseIng / 1e6,
        baselineGasComp: totBaseGasComp / 1e6,
        baselineGasPago: totBaseGasPago / 1e6,
        baselineNetComp: (totBaseIng - totBaseGasComp) / 1e6,
        baselineNetPago: (totBaseIng - totBaseGasPago) / 1e6,
        
        simIng: totSimIng / 1e6,
        simGasComp: totSimGasComp / 1e6,
        simGasPago: totSimGasPago / 1e6,
        simNetComp: (totSimIng - totSimGasComp) / 1e6,
        simNetPago: (totSimIng - totSimGasPago) / 1e6
      },
      categoriesBaseline: {
        compromiso: [
          { name: 'Talento Humano', value: parseFloat((catBaseComp.personal / 1e6).toFixed(1)) },
          { name: 'Funcionamiento', value: parseFloat((catBaseComp.funcionamiento / 1e6).toFixed(1)) },
          { name: 'Inversión', value: parseFloat((catBaseComp.inversion / 1e6).toFixed(1)) },
          { name: 'Otros Egresos', value: parseFloat((catBaseComp.otros / 1e6).toFixed(1)) }
        ],
        pago: [
          { name: 'Talento Humano', value: parseFloat((catBasePago.personal / 1e6).toFixed(1)) },
          { name: 'Funcionamiento', value: parseFloat((catBasePago.funcionamiento / 1e6).toFixed(1)) },
          { name: 'Inversión', value: parseFloat((catBasePago.inversion / 1e6).toFixed(1)) },
          { name: 'Otros Egresos', value: parseFloat((catBasePago.otros / 1e6).toFixed(1)) }
        ]
      },
      categoriesSimulated: {
        compromiso: [
          { name: 'Talento Humano', value: parseFloat((catSimComp.personal / 1e6).toFixed(1)) },
          { name: 'Funcionamiento', value: parseFloat((catSimComp.funcionamiento / 1e6).toFixed(1)) },
          { name: 'Inversión', value: parseFloat((catSimComp.inversion / 1e6).toFixed(1)) },
          { name: 'Otros Egresos', value: parseFloat((catSimComp.otros / 1e6).toFixed(1)) }
        ],
        pago: [
          { name: 'Talento Humano', value: parseFloat((catSimPago.personal / 1e6).toFixed(1)) },
          { name: 'Funcionamiento', value: parseFloat((catSimPago.funcionamiento / 1e6).toFixed(1)) },
          { name: 'Inversión', value: parseFloat((catSimPago.inversion / 1e6).toFixed(1)) },
          { name: 'Otros Egresos', value: parseFloat((catSimPago.otros / 1e6).toFixed(1)) }
        ]
      },
      resourcesBaseline: {
        ingresos: [
          { name: 'Recursos Nación', value: parseFloat((resBaseIng.nacion / 1e6).toFixed(1)) },
          { name: 'Recursos Propios', value: parseFloat((resBaseIng.propios / 1e6).toFixed(1)) },
          { name: 'Convenios y Posgrados', value: parseFloat((resBaseIng.convenios / 1e6).toFixed(1)) }
        ],
        gastosComp: [
          { name: 'Recursos Nación', value: parseFloat((resBaseGasComp.nacion / 1e6).toFixed(1)) },
          { name: 'Recursos Propios', value: parseFloat((resBaseGasComp.propios / 1e6).toFixed(1)) },
          { name: 'Convenios y Posgrados', value: parseFloat((resBaseGasComp.convenios / 1e6).toFixed(1)) }
        ],
        gastosPago: [
          { name: 'Recursos Nación', value: parseFloat((resBaseGasPago.nacion / 1e6).toFixed(1)) },
          { name: 'Recursos Propios', value: parseFloat((resBaseGasPago.propios / 1e6).toFixed(1)) },
          { name: 'Convenios y Posgrados', value: parseFloat((resBaseGasPago.convenios / 1e6).toFixed(1)) }
        ]
      },
      resourcesSimulated: {
        ingresos: [
          { name: 'Recursos Nación', value: parseFloat((resSimIng.nacion / 1e6).toFixed(1)) },
          { name: 'Recursos Propios', value: parseFloat((resSimIng.propios / 1e6).toFixed(1)) },
          { name: 'Convenios y Posgrados', value: parseFloat((resSimIng.convenios / 1e6).toFixed(1)) }
        ],
        gastosComp: [
          { name: 'Recursos Nación', value: parseFloat((resSimGasComp.nacion / 1e6).toFixed(1)) },
          { name: 'Recursos Propios', value: parseFloat((resSimGasComp.propios / 1e6).toFixed(1)) },
          { name: 'Convenios y Posgrados', value: parseFloat((resSimGasComp.convenios / 1e6).toFixed(1)) }
        ],
        gastosPago: [
          { name: 'Recursos Nación', value: parseFloat((resSimGasPago.nacion / 1e6).toFixed(1)) },
          { name: 'Recursos Propios', value: parseFloat((resSimGasPago.propios / 1e6).toFixed(1)) },
          { name: 'Convenios y Posgrados', value: parseFloat((resSimGasPago.convenios / 1e6).toFixed(1)) }
        ]
      },
      historicalYearsSummary
    };
  }, [
    rawYearlyIncomes, 
    filterUnidad, 
    filterRecurso, 
    filterMes,
    simMatricula, 
    simEstudiantes, 
    simIncrementoIngresos, 
    simNuevosIngresos,
    simTalentoHumano, 
    simFuncionamiento, 
    simInversion, 
    simContratacion, 
    simOtrosGastos
  ]);

  if (dataStage === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <div className="w-12 h-12 border-4 border-[#ffcc29] border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-on-surface-variant font-mono animate-pulse">Iniciando modelo de proyección financiera...</p>
      </div>
    );
  }

  // Break-even and KPIs variables based on selected view dimension
  const isPago = viewDimension === 'pago';
  const currentGas = isPago ? financialData.totals.simGasPago : financialData.totals.simGasComp;
  const baseGas = isPago ? financialData.totals.baselineGasPago : financialData.totals.baselineGasComp;
  const currentNet = isPago ? financialData.totals.simNetPago : financialData.totals.simNetComp;
  const baseNet = isPago ? financialData.totals.baselineNetPago : financialData.totals.baselineNetComp;

  const breakEvenCoverage = currentGas > 0 ? (financialData.totals.simIng / currentGas) * 100 : 0;

  // Year over year variance
  const prevYearNet = isPago 
    ? (financialData.historicalYearsSummary.find(y => y.name === '2025')?.netoPago || 0)
    : (financialData.historicalYearsSummary.find(y => y.name === '2025')?.netoComp || 0);
  const varianceYoY = prevYearNet !== 0 ? ((currentNet - prevYearNet) / Math.abs(prevYearNet)) * 100 : 0;

  return (
    <div className="flex flex-col mb-20 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
        <div>
          <p className="text-[#ffcc29] text-xs uppercase tracking-widest font-bold mb-1">MÓDULO FINANCIERO AVANZADO V3.0</p>
          <div className="flex items-center gap-4">
            <h2 className="text-3xl font-bold font-display text-white">Proyección Financiera (Ingresos y Gastos)</h2>
            <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-full flex items-center gap-2">
              <BrainCircuit size={14} className="text-[#ffcc29]" />
              <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider">Cálculo en Tiempo Real</span>
            </div>
          </div>
        </div>

        {/* Global Toolbar Filters & Dimension Selector */}
        <div className="flex flex-wrap gap-3 items-center">
          {/* Dimension Selector (Compromiso vs Pago) */}
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
              className="bg-transparent text-xs text-white outline-none w-32"
              value={filterRecurso}
              onChange={(e) => setFilterRecurso(e.target.value)}
            >
              <option value="Todos" className="bg-[#0f172a] text-white">Todos los Recursos</option>
              {filterOptions.recursos.filter(r => r !== 'Todos').map(r => (
                <option key={r} value={r} className="bg-[#0f172a] text-white">Recurso {r}</option>
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

      {/* Module Navigation Tabs */}
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
          {/* Dimension Alert Banner */}
          <div className="glass-card rounded-[18px] px-6 py-4 border border-white/5 flex items-center gap-4 bg-white/5">
            <ClipboardList className="text-[#ffcc29]" size={24} />
            <div>
              <span className="text-xs text-on-surface-variant uppercase font-mono tracking-wider font-bold">Dimensión de Análisis Activa:</span>
              <p className="text-sm font-bold text-white">
                {isPago 
                  ? 'Pagos Efectivos (Caja real de la Universidad)' 
                  : 'Compromisos Presupuestales (Reservas y contratos asignados)'}
              </p>
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
                Límite base: ${financialData.totals.baselineIng.toLocaleString('es-CO', {maximumFractionDigits: 1})} mill.
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
                Límite base: ${baseGas.toLocaleString('es-CO', {maximumFractionDigits: 1})} mill.
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
                {currentNet >= 0 ? <CheckCircle2 size={10} /> : <AlertTriangle size={10} />}
                {currentNet >= 0 ? 'Superávit' : 'Déficit'}
              </span>
            </div>

            <div className="glass-card rounded-[24px] p-6 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-[#ffcc29]"></div>
              <h4 className="text-xs font-mono text-on-surface-variant uppercase tracking-widest mb-2">Desempeño YoY</h4>
              <div className="flex items-baseline gap-2">
                <span className={`text-3xl font-display font-bold ${varianceYoY >= 0 ? 'text-[#4ade80]' : 'text-[#f43f5e]'}`}>
                  {varianceYoY >= 0 ? '+' : ''}{varianceYoY.toFixed(1)}%
                </span>
              </div>
              <p className="text-[10px] text-on-surface-variant mt-2">
                vs 2025 (${prevYearNet.toLocaleString('es-CO', {maximumFractionDigits: 0})}M)
              </p>
            </div>
          </div>

          {/* Core Analytics Panels */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Cash Flow Comparison Chart */}
            <div className="glass-card rounded-[32px] p-8 flex flex-col min-h-[400px]">
              <h3 className="text-lg font-display font-bold text-white mb-6 flex items-center gap-2">
                <BarChartIcon size={20} className="text-[#ffcc29]" />
                Ingreso vs Gasto Mensual ({isPago ? 'Pagos' : 'Compromisos'}) (Millones)
              </h3>
              <div className="flex-1 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={financialData.simulatedFlow} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" tick={{fontSize: 10, fontFamily: 'monospace'}} />
                    <YAxis stroke="rgba(255,255,255,0.4)" tick={{fontSize: 10, fontFamily: 'monospace'}} tickFormatter={(v) => `$${v}`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                      itemStyle={{ color: '#fff', fontSize: '12px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', opacity: 0.8 }} />
                    <Bar dataKey="ingresos" name="Ingresos" fill="#4ade80" radius={[4, 4, 0, 0]} />
                    <Bar dataKey={isPago ? 'gastosPago' : 'gastosComp'} name={isPago ? 'Gastos (Pagos)' : 'Gastos (Compromisos)'} fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Historical Trend comparison chart */}
            <div className="glass-card rounded-[32px] p-8 flex flex-col min-h-[400px]">
              <h3 className="text-lg font-display font-bold text-white mb-6 flex items-center gap-2">
                <TrendingUp size={20} className="text-[#7bd0ff]" />
                Histórico Multianual y Proyección Neto (Millones)
              </h3>
              <div className="flex-1 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={financialData.historicalYearsSummary} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#7bd0ff" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#7bd0ff" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" tick={{fontSize: 10, fontFamily: 'monospace'}} />
                    <YAxis stroke="rgba(255,255,255,0.4)" tick={{fontSize: 10, fontFamily: 'monospace'}} tickFormatter={(v) => `$${v}`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                      itemStyle={{ color: '#fff', fontSize: '12px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', opacity: 0.8 }} />
                    <Area type="monotone" dataKey={isPago ? 'netoPago' : 'netoComp'} name="Resultado Neto" stroke="#7bd0ff" strokeWidth={3} fillOpacity={1} fill="url(#colorNet)" />
                    <Line type="monotone" dataKey="ingresos" name="Ingresos" stroke="#4ade80" strokeDasharray="5 5" dot={false} />
                    <Line type="monotone" dataKey={isPago ? 'gastosPago' : 'gastosComp'} name={isPago ? 'Gastos (Pago)' : 'Gastos (Compromiso)'} stroke="#f43f5e" strokeDasharray="5 5" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: CASH FLOW DETAILS */}
      {activeTab === 'flow' && (
        <div className="space-y-8 animate-fade-in">
          {/* Cash Flow Table */}
          <div className="glass-card rounded-[32px] overflow-hidden border border-white/5">
            <div className="px-8 py-6 border-b border-white/5 bg-white/5 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-white">Consolidado Mensual de Compromisos y Pagos</h3>
                <p className="text-xs text-on-surface-variant mt-1">Corte financiero 2026 en millones de COP. Se contrastan los compromisos adquiridos con los desembolsos reales.</p>
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
                    <th className="px-4 py-4 text-center">Tipo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs">
                  {financialData.simulatedFlow.map((row, idx) => {
                    return (
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
                        <td className="px-4 py-4 text-center">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-mono uppercase tracking-wider ${row.isProjected ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-green-500/10 text-green-400 border border-green-500/20'}`}>
                            {row.isProjected ? 'Proy' : 'Real'}
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
                  <span className="font-bold">{currentNet >= 0 ? 'Superávit Financiero' : 'Déficit Financiero'}</span>
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
                  {/* Progress Indicators */}
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

          {/* Gasto Composition and Comparison */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Composition Pie Chart */}
            <div className="glass-card rounded-[32px] p-8 flex flex-col min-h-[350px]">
              <h3 className="text-base font-bold text-white mb-6">Composición del Gasto Simulado ({isPago ? 'Pago' : 'Compromiso'})</h3>
              <div className="flex-1 flex flex-col sm:flex-row items-center gap-6 justify-center">
                <div className="w-48 h-48 relative shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie 
                        data={isPago ? financialData.categoriesSimulated.pago : financialData.categoriesSimulated.compromiso} 
                        dataKey="value" 
                        cx="50%" 
                        cy="50%" 
                        innerRadius={50} 
                        outerRadius={70} 
                        paddingAngle={4}
                        stroke="none"
                      >
                        {(isPago ? financialData.categoriesSimulated.pago : financialData.categoriesSimulated.compromiso).map((entry, idx) => (
                          <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => `$${v.toLocaleString('es-CO')}M`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2 w-full">
                  {(isPago ? financialData.categoriesSimulated.pago : financialData.categoriesSimulated.compromiso).map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-white/5 p-2 rounded-lg text-xs">
                      <span className="flex items-center gap-2 text-on-surface-variant">
                        <span className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: COLORS[idx % COLORS.length]}}></span>
                        {item.name}
                      </span>
                      <span className="font-bold text-white">${item.value.toLocaleString('es-CO')}M</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Simulated vs baseline comparative bar chart */}
            <div className="glass-card rounded-[32px] p-8 flex flex-col min-h-[350px]">
              <h3 className="text-base font-bold text-white mb-6">Simulación vs Escenario Base (Millones)</h3>
              <div className="flex-1 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    { name: 'Ingresos', Base: financialData.totals.baselineIng, Simulado: financialData.totals.simIng },
                    { name: 'Gastos', Base: baseGas, Simulado: currentGas },
                    { name: 'Resultado Neto', Base: baseNet, Simulado: currentNet }
                  ]} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" tick={{fontSize: 10}} />
                    <YAxis stroke="rgba(255,255,255,0.4)" tick={{fontSize: 10}} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                      itemStyle={{ color: '#fff', fontSize: '12px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="Base" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Simulado" fill="#ffcc29" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: FINANCIAL SIMULATOR */}
      {activeTab === 'simulator' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 animate-fade-in">
          {/* Left Panel: Sliders */}
          <div className="xl:col-span-1 space-y-6">
            {/* Header Simulator Controls */}
            <div className="glass-card rounded-[24px] p-6 border border-[#ffcc29]/20 bg-surface-container-low/40">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                  <Settings className="text-[#ffcc29]" size={20} />
                  <h3 className="font-bold text-white text-base">Parámetros</h3>
                </div>
                <button 
                  onClick={handleResetSimulator}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-on-surface-variant hover:text-white transition-colors flex items-center gap-1.5 text-xs font-semibold"
                  title="Restablecer valores"
                >
                  <RotateCcw size={14} />
                  Reiniciar
                </button>
              </div>

              {/* SECTION: REVENUES */}
              <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-mono text-[#ffcc29] uppercase tracking-widest mb-4 pb-1 border-b border-white/10">Variables de Ingresos</h4>
                  
                  {/* Tarifa Matrícula */}
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-xs">
                      <span className="text-on-surface-variant">Valor Matrícula (COP)</span>
                      <span className="font-bold text-white">${simMatricula.toLocaleString('es-CO')}</span>
                    </div>
                    <input 
                      type="range" 
                      min="800000" 
                      max="2500000" 
                      step="50000"
                      value={simMatricula} 
                      onChange={(e) => setSimMatricula(parseInt(e.target.value))}
                      className="w-full accent-[#ffcc29]"
                    />
                  </div>

                  {/* Cantidad Alumnos */}
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-xs">
                      <span className="text-on-surface-variant">Estudiantes Matrículas</span>
                      <span className="font-bold text-white">{simEstudiantes.toLocaleString('es-CO')} alumnos</span>
                    </div>
                    <input 
                      type="range" 
                      min="14000" 
                      max="22000" 
                      step="100"
                      value={simEstudiantes} 
                      onChange={(e) => setSimEstudiantes(parseInt(e.target.value))}
                      className="w-full accent-[#ffcc29]"
                    />
                  </div>

                  {/* Crecimiento Otros Ingresos */}
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-xs">
                      <span className="text-on-surface-variant">Crecimiento otros Ingresos (%)</span>
                      <span className="font-bold text-[#ffcc29]">{simIncrementoIngresos}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="-10" 
                      max="30" 
                      step="1"
                      value={simIncrementoIngresos} 
                      onChange={(e) => setSimIncrementoIngresos(parseFloat(e.target.value))}
                      className="w-full accent-[#ffcc29]"
                    />
                  </div>

                  {/* Nuevas Fuentes */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-on-surface-variant">Nuevos Ingresos (M)</span>
                      <span className="font-bold text-white">${simNuevosIngresos}M</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max="15000" 
                      step="500"
                      value={simNuevosIngresos} 
                      onChange={(e) => setSimNuevosIngresos(parseInt(e.target.value))}
                      className="w-full accent-[#ffcc29]"
                    />
                  </div>
                </div>

                {/* SECTION: EXPENSES */}
                <div className="space-y-6 pt-4 border-t border-white/5">
                  <h4 className="text-xs font-mono text-[#7bd0ff] uppercase tracking-widest mb-4 pb-1 border-b border-white/10">Variables de Gastos</h4>
                  
                  {/* Talento Humano */}
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-xs">
                      <span className="text-on-surface-variant">Talento Humano / Personal (%)</span>
                      <span className="font-bold text-[#7bd0ff]">{simTalentoHumano}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="-20" 
                      max="30" 
                      step="1"
                      value={simTalentoHumano} 
                      onChange={(e) => setSimTalentoHumano(parseFloat(e.target.value))}
                      className="w-full accent-[#7bd0ff]"
                    />
                  </div>

                  {/* Funcionamiento */}
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-xs">
                      <span className="text-on-surface-variant">Gastos Funcionamiento (%)</span>
                      <span className="font-bold text-[#7bd0ff]">{simFuncionamiento}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="-20" 
                      max="30" 
                      step="1"
                      value={simFuncionamiento} 
                      onChange={(e) => setSimFuncionamiento(parseFloat(e.target.value))}
                      className="w-full accent-[#7bd0ff]"
                    />
                  </div>

                  {/* Inversión */}
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-xs">
                      <span className="text-on-surface-variant">Inversión y Proyectos (%)</span>
                      <span className="font-bold text-[#7bd0ff]">{simInversion}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="-30" 
                      max="50" 
                      step="1"
                      value={simInversion} 
                      onChange={(e) => setSimInversion(parseFloat(e.target.value))}
                      className="w-full accent-[#7bd0ff]"
                    />
                  </div>

                  {/* Contratación OPS */}
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-xs">
                      <span className="text-on-surface-variant">Contratación Servicios OPS (%)</span>
                      <span className="font-bold text-[#7bd0ff]">{simContratacion}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="-30" 
                      max="40" 
                      step="1"
                      value={simContratacion} 
                      onChange={(e) => setSimContratacion(parseFloat(e.target.value))}
                      className="w-full accent-[#7bd0ff]"
                    />
                  </div>

                  {/* Otros Gastos */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-on-surface-variant">Otros Gastos y Tasas (%)</span>
                      <span className="font-bold text-[#7bd0ff]">{simOtrosGastos}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="-20" 
                      max="30" 
                      step="1"
                      value={simOtrosGastos} 
                      onChange={(e) => setSimOtrosGastos(parseFloat(e.target.value))}
                      className="w-full accent-[#7bd0ff]"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panels: Real-time Reactors */}
          <div className="xl:col-span-2 space-y-6">
            {/* mini KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="glass-card rounded-2xl p-5 border border-white/5">
                <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-widest block mb-1">Ingresos (Sim)</span>
                <span className="text-2xl font-bold font-display text-[#4ade80]">${financialData.totals.simIng.toLocaleString('es-CO', {maximumFractionDigits:1})}M</span>
                <span className={`text-[10px] font-mono block mt-1 ${financialData.totals.simIng >= financialData.totals.baselineIng ? 'text-[#4ade80]' : 'text-[#f43f5e]'}`}>
                  {financialData.totals.simIng >= financialData.totals.baselineIng ? '▲' : '▼'}
                  {Math.abs(financialData.totals.simIng - financialData.totals.baselineIng).toLocaleString('es-CO', {maximumFractionDigits:1})}M vs base
                </span>
              </div>

              <div className="glass-card rounded-2xl p-5 border border-white/5">
                <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-widest block mb-1">Gastos (Sim)</span>
                <span className="text-2xl font-bold font-display text-[#f43f5e]">${currentGas.toLocaleString('es-CO', {maximumFractionDigits:1})}M</span>
                <span className={`text-[10px] font-mono block mt-1 ${currentGas <= baseGas ? 'text-[#4ade80]' : 'text-[#f43f5e]'}`}>
                  {currentGas > baseGas ? '▲' : '▼'}
                  {Math.abs(currentGas - baseGas).toLocaleString('es-CO', {maximumFractionDigits:1})}M vs base
                </span>
              </div>

              <div className="glass-card rounded-2xl p-5 border border-white/5">
                <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-widest block mb-1">Resultado (Sim)</span>
                <span className={`text-2xl font-bold font-display ${currentNet >= 0 ? 'text-[#4ade80]' : 'text-[#f43f5e]'}`}>${currentNet.toLocaleString('es-CO', {maximumFractionDigits:1})}M</span>
                <span className={`text-[10px] font-mono block mt-1 ${currentNet >= baseNet ? 'text-[#4ade80]' : 'text-[#f43f5e]'}`}>
                  {currentNet >= baseNet ? '▲' : '▼'}
                  {Math.abs(currentNet - baseNet).toLocaleString('es-CO', {maximumFractionDigits:1})}M vs base
                </span>
              </div>
            </div>

            {/* Resource Breakdown Card */}
            <div className="glass-card rounded-[24px] p-6 border border-white/5">
              <h4 className="text-xs font-mono text-[#ffcc29] uppercase tracking-widest mb-4">Desglose de Ingresos y Gastos por Tipo de Recurso (Simulado)</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {financialData.resourcesSimulated.ingresos.map((res, idx) => {
                  const simulatedExpenseVal = isPago 
                    ? (financialData.resourcesSimulated.gastosPago.find(g => g.name === res.name)?.value || 0)
                    : (financialData.resourcesSimulated.gastosComp.find(g => g.name === res.name)?.value || 0);
                  const netVal = res.value - simulatedExpenseVal;
                  
                  return (
                    <div key={idx} className="bg-white/5 p-4 rounded-xl border border-white/5 flex flex-col justify-between">
                      <span className="text-xs font-bold text-white block mb-2">{res.name}</span>
                      <div className="space-y-1 text-[11px] font-mono">
                        <div className="flex justify-between">
                          <span className="text-on-surface-variant">Ingreso:</span>
                          <span className="text-[#4ade80]">${res.value.toLocaleString('es-CO')}M</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-on-surface-variant">Egreso:</span>
                          <span className="text-[#f43f5e]">${simulatedExpenseVal.toLocaleString('es-CO')}M</span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-white/10 font-bold">
                          <span>Neto:</span>
                          <span className={netVal >= 0 ? 'text-[#4ade80]' : 'text-[#f43f5e]'}>${netVal.toLocaleString('es-CO')}M</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Simulated Live Flow Chart */}
            <div className="glass-card rounded-[32px] p-6 border border-white/5 flex flex-col min-h-[300px]">
              <h3 className="text-sm font-bold text-white mb-4">Simulación Reactiva del Flujo Mensual (Ingreso vs Gasto)</h3>
              <div className="flex-1 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={financialData.simulatedFlow} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorIngSim" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4ade80" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#4ade80" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorGasSim" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" tick={{fontSize: 9}} />
                    <YAxis stroke="rgba(255,255,255,0.4)" tick={{fontSize: 9}} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                    <Area type="monotone" dataKey="ingresos" name="Ingreso Simulado" stroke="#4ade80" fillOpacity={1} fill="url(#colorIngSim)" strokeWidth={2} />
                    <Area type="monotone" dataKey={isPago ? 'gastosPago' : 'gastosComp'} name={isPago ? 'Gasto (Pago Simulado)' : 'Gasto (Compromiso Simulado)'} stroke="#f43f5e" fillOpacity={1} fill="url(#colorGasSim)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
