import { useState, useEffect, useMemo } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell, 
  LineChart, Line, ComposedChart, RadialBarChart, RadialBar
} from 'recharts';
import { 
  GraduationCap, MapPin, Building2, BookOpen, Users, DollarSign, 
  Filter, Percent, CreditCard, Activity, TrendingUp, TrendingDown, MoreHorizontal,
  Info, Sparkles, ArrowRight, Shield, Database, HelpCircle, Bot
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

export function PosgradosScreen({ onNavigate }: { onNavigate: (s: string) => void }) {
  // Main tabs
  const [activeTab, setActiveTab] = useState<'dashboard' | 'sensitivity'>('dashboard');

  // Sliders state for Sensitivity & Elasticity analysis
  const [elasticity, setElasticity] = useState<number>(-1.19);
  const [priceVarPct, setPriceVarPct] = useState<number>(0);
  const [operatingCostPct, setOperatingCostPct] = useState<number>(35); 
  const [centralDeductionPct, setCentralDeductionPct] = useState<number>(45.5); 

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

      {/* TAB 2: SENSITIVITY AND ELASTICITY REPORT (NEW MODULE) */}
      {activeTab === 'sensitivity' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 animate-in fade-in duration-300">
          
          {/* LEFT COLUMN: INTERACTIVE CONTROLS */}
          <div className="xl:col-span-4 space-y-5">
            <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-6">
              
              <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                <Sparkles size={16} className="text-[#ffcc29]" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Simulación de Sensibilidad R31
                </h3>
              </div>

              <div className="space-y-5">
                
                {/* Elasticity Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-white/80 font-medium">Coeficiente de Elasticidad (ε)</span>
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
                  <div className="flex justify-between text-[9px] text-white/40 font-mono">
                    <span>-2.0 (Muy Elástica)</span>
                    <span>0.0 (Inelástica)</span>
                  </div>
                </div>

                {/* Credit Cost shift slider */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-white/80 font-medium">Ajuste Tarifa Crédito Académico</span>
                    <strong className={`${priceVarPct >= 0 ? 'text-[#4ade80]' : 'text-rose-400'} font-mono font-bold`}>
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
                  <div className="flex justify-between text-[9px] text-white/40 font-mono">
                    <span>-20% (Matrícula Económica)</span>
                    <span>+20% (Aumento)</span>
                  </div>
                </div>

                {/* Operating Direct Cost % */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-white/80 font-medium">Costos Operativos Directos</span>
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
                  <div className="flex justify-between text-[9px] text-white/40 font-mono">
                    <span>20% (Optimizado)</span>
                    <span>50% (Techo Operación)</span>
                  </div>
                </div>

                {/* Central Deductions % */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-white/80 font-medium">Retención Central UPTC</span>
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
                  <div className="flex justify-between text-[9px] text-white/40 font-mono">
                    <span>30.0% (Descentralizado)</span>
                    <span>50.0% (Alto)</span>
                  </div>
                </div>

              </div>

            </div>

            {/* AI Financial Diagnostic callout */}
            <div className="p-5 bg-[#ffcc29]/5 border border-[#ffcc29]/20 rounded-2xl space-y-2">
              <span className="font-bold text-[#ffcc29] text-xs flex items-center gap-1.5">
                <Bot size={15} /> Asesor Financiero Recurso 31:
              </span>
              <p className="text-white/80 text-[11px] leading-relaxed font-sans">
                {aiDiagnostic}
              </p>
            </div>
          </div>

          {/* RIGHT COLUMN: GRAPHS & DETAILED TRANSITION CARDS */}
          <div className="xl:col-span-8 space-y-6">
            
            {/* 2026 Transition comparative metrics cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Recaudo Comparison */}
              <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-4.5 flex flex-col justify-between">
                <div>
                  <span className="text-[9px] font-mono text-white/45 uppercase tracking-wider block">Recaudo R31 (2026)</span>
                  <h4 className="text-lg font-display font-bold text-white mt-1.5 font-mono">
                    {formatCurrencyShort(comparison2026.simulatedRecaudo)}
                  </h4>
                </div>
                <div className="mt-2.5 flex items-center gap-1">
                  {comparison2026.deltaRecaudo >= 0 ? (
                    <TrendingUp size={13} className="text-[#4ade80]" />
                  ) : (
                    <TrendingDown size={13} className="text-rose-400" />
                  )}
                  <span className={`text-[10px] font-bold font-mono ${comparison2026.deltaRecaudo >= 0 ? 'text-[#4ade80]' : 'text-rose-400'}`}>
                    {comparison2026.deltaRecaudoPct.toFixed(1)}% vs Hist.
                  </span>
                </div>
              </div>

              {/* Enrollment recovery */}
              <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-4.5 flex flex-col justify-between">
                <div>
                  <span className="text-[9px] font-mono text-white/45 uppercase tracking-wider block">Matrícula (2026)</span>
                  <h4 className="text-lg font-display font-bold text-white mt-1.5 font-mono">
                    {comparison2026.simulatedEstudiantes} <span className="text-xs text-white/40 font-normal">est.</span>
                  </h4>
                </div>
                <div className="mt-2.5 flex items-center gap-1">
                  <TrendingUp size={13} className="text-[#4ade80]" />
                  <span className="text-[10px] font-bold font-mono text-[#4ade80]">
                    +{comparison2026.deltaEstudiantesPct.toFixed(1)}% Recup.
                  </span>
                </div>
              </div>

              {/* Price Per Student */}
              <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-4.5 flex flex-col justify-between">
                <div>
                  <span className="text-[9px] font-mono text-white/45 uppercase tracking-wider block">Precio Promedio / Est.</span>
                  <h4 className="text-lg font-display font-bold text-white mt-1.5 font-mono">
                    {formatCurrencyShort(comparison2026.simulatedPrecio)}
                  </h4>
                </div>
                <div className="mt-2.5 flex items-center gap-1">
                  <TrendingDown size={13} className="text-rose-400" />
                  <span className="text-[10px] font-bold font-mono text-rose-400">
                    {comparison2026.deltaPrecioPct.toFixed(1)}% Precio
                  </span>
                </div>
              </div>

              {/* Elasticity Class */}
              <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-4.5 flex flex-col justify-between">
                <div>
                  <span className="text-[9px] font-mono text-white/45 uppercase tracking-wider block">Elasticidad Evaluada</span>
                  <h4 className="text-lg font-display font-bold text-[#ffcc29] mt-1.5 font-mono">
                    {elasticity.toFixed(2)}
                  </h4>
                </div>
                <span className="text-[9px] font-bold bg-[#ffcc29]/10 text-[#ffcc29] px-2 py-0.5 rounded self-start mt-2.5 uppercase tracking-widest">
                  {Math.abs(elasticity) > 1.0 ? 'Demanda Elástica' : Math.abs(elasticity) === 1.0 ? 'Unitaria' : 'Inelástica'}
                </span>
              </div>

            </div>

            {/* Combined timeline chart (Historical vs Projected Credit Model) */}
            <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-6 shadow-2xl">
              <div className="flex justify-between items-center border-b border-white/5 pb-3.5 mb-5">
                <div>
                  <h3 className="text-sm font-semibold text-white">Evolución de Ingresos y Alumnado del Recurso R31</h3>
                  <p className="text-[10px] text-on-surface-variant mt-0.5">Línea histórica 2020-2025 y transición simulada por créditos 2026-2030.</p>
                </div>
              </div>

              <div className="h-80" style={{ width: '100%', height: 320, minWidth: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={unifiedTimelineData} margin={{ top: 10, right: -5, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="anio" tick={{fill: '#64748b', fontSize: 10}} />
                    <YAxis yAxisId="left" stroke="none" tick={{fill: '#64748b', fontSize: 10}} tickFormatter={(val) => `$${val}M`} />
                    <YAxis yAxisId="right" orientation="right" stroke="none" tick={{fill: '#64748b', fontSize: 10}} />
                    <RechartsTooltip 
                       contentStyle={{backgroundColor: '#000', border: 'none', borderRadius: '8px', fontSize: '11px'}}
                    />
                    <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px' }} />
                    <Bar yAxisId="left" dataKey="Modelo Histórico (Recaudo M)" fill="#334155" name="Ingreso Histórico" radius={[3, 3, 0, 0]} barSize={14} />
                    <Bar yAxisId="left" dataKey="Modelo por Créditos (Recaudo M)" fill="#ffcc29" name="Ingreso Créditos (Simulado)" radius={[3, 3, 0, 0]} barSize={14} />
                    <Line yAxisId="right" type="monotone" dataKey="Estudiantes Históricos" stroke="#94a3b8" name="Alumnos Históricos" strokeWidth={1.5} dot={{r: 2}} strokeDasharray="4 4" />
                    <Line yAxisId="right" type="monotone" dataKey="Estudiantes Créditos" stroke="#4ade80" name="Alumnos Créditos (Simulado)" strokeWidth={2.5} dot={{r: 3}} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Sensitivity Analysis cash-flow structure chart */}
            <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-6 shadow-2xl">
              <div className="flex justify-between items-center border-b border-white/5 pb-3.5 mb-5">
                <div>
                  <h3 className="text-sm font-semibold text-white">Estructura Interna de Ingresos, Deducciones y Caja R31</h3>
                  <p className="text-[10px] text-on-surface-variant mt-0.5">Simulación interactiva de la distribución de egresos y margen neto acumulado (2026-2030).</p>
                </div>
              </div>

              <div className="h-80" style={{ width: '100%', height: 320, minWidth: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={sensitivityChartData} margin={{ top: 10, right: -5, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="anio" tick={{fill: '#64748b', fontSize: 10}} />
                    <YAxis stroke="none" tick={{fill: '#64748b', fontSize: 10}} tickFormatter={(val) => `$${val}M`} />
                    <RechartsTooltip contentStyle={{backgroundColor: '#000', border: 'none', borderRadius: '8px', fontSize: '11px'}} />
                    <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px' }} />
                    <Area type="monotone" dataKey="Ingresos R31 (M)" stackId="1" stroke="#ffcc29" fill="#ffcc29" fillOpacity={0.15} name="Recaudo R31" />
                    <Area type="monotone" dataKey="Deducciones UPTC (M)" stackId="2" stroke="#c084fc" fill="#c084fc" fillOpacity={0.1} name="Retenciones Centrales" />
                    <Area type="monotone" dataKey="Costos Directos (M)" stackId="3" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.1} name="Gastos Funcionamiento" />
                    <Area type="monotone" dataKey="Excedente Neto (M)" stroke="#4ade80" fill="#4ade80" fillOpacity={0.1} name="Margen Neto Libre" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Tabular Analysis details table */}
            <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-6 shadow-2xl">
              <h3 className="text-sm font-semibold text-white mb-4">Tabla General Comparativa del Recurso R31</h3>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/5 font-bold text-white">
                      <th className="p-3">Periodo / Modelo</th>
                      <th className="p-3 text-right">Alumnos</th>
                      <th className="p-3 text-right">Costo Promedio / Est.</th>
                      <th className="p-3 text-right">Recaudo Bruto</th>
                      <th className="p-3 text-right">Deducción Central</th>
                      <th className="p-3 text-right">Gastos Directos</th>
                      <th className="p-3 text-right">Excedente Neto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-white/80 font-mono">
                    
                    {/* Historical rows */}
                    {HISTORICAL_DATA.map(h => (
                      <tr key={h.vigencia} className="hover:bg-white/[0.02] text-white/55">
                        <td className="p-3 font-semibold text-white">{h.vigencia} (Histórico)</td>
                        <td className="p-3 text-right">{h.estudiantes}</td>
                        <td className="p-3 text-right">{formatCurrencyShort(h.ingreso / h.estudiantes)}</td>
                        <td className="p-3 text-right text-[#94a3b8]">{formatCurrency(h.ingreso)}</td>
                        <td className="p-3 text-right">-{formatCurrency(h.ingreso * 0.455)}</td>
                        <td className="p-3 text-right">-{formatCurrency(h.ingreso * 0.35)}</td>
                        <td className="p-3 text-right text-emerald-500/80">{formatCurrency(h.ingreso * 0.195)}</td>
                      </tr>
                    ))}

                    {/* Projected simulated rows */}
                    {sensitivityProjections.map(p => (
                      <tr key={p.anio} className="hover:bg-white/[0.04] bg-white/[0.01]">
                        <td className="p-3 font-semibold text-white">{p.anio} (Créditos Sim.)</td>
                        <td className="p-3 text-right text-[#4ade80] font-bold">{p.estudiantes}</td>
                        <td className="p-3 text-right">{formatCurrencyShort(p.precio)}</td>
                        <td className="p-3 text-right text-[#ffcc29] font-bold">{formatCurrency(p.recaudo)}</td>
                        <td className="p-3 text-right text-rose-300">-{formatCurrency(p.deduccionCentral)}</td>
                        <td className="p-3 text-right text-rose-300">-{formatCurrency(p.gastoOperativo)}</td>
                        <td className={`p-3 text-right font-bold ${p.margenNeto >= 0 ? 'text-[#4ade80]' : 'text-rose-400'}`}>
                          {p.margenNeto >= 0 ? '+' : ''}{formatCurrency(p.margenNeto)}
                        </td>
                      </tr>
                    ))}

                  </tbody>
                </table>
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
