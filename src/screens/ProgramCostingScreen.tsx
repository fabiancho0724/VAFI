import { useState, useMemo } from 'react';
import { 
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line, ReferenceLine
} from 'recharts';
import { 
  Filter, DollarSign, Activity, TrendingUp, RefreshCw, Compass,
  Layers, Wallet, HelpCircle, AlertTriangle, ShieldCheck, ArrowRight, 
  Download, Search, CheckCircle, Info, Users, GraduationCap, Percent, BookOpen, Settings, Save, Trash2
} from 'lucide-react';

interface SavedScenario {
  id: string;
  name: string;
  level: 'doctorado' | 'maestria' | 'especializacion';
  modality: 'presencial' | 'hibrido' | 'virtual';
  studentsCount: number;
  programCredits: number;
  fixedCosts: number;
  variableCosts: number;
  otherIncome: number;
  discountPct: number;
  isAdminOverride: boolean;
  customCreditValue: number;
  // Calculated summaries for quick comparison
  totalIncome: number;
  totalCosts: number;
  utility: number;
  breakEvenCredits: number;
  breakEvenStudents: number;
}

export function ProgramCostingScreen({ onNavigate }: { onNavigate: (s: string) => void }) {
  // Input parameters state
  const [level, setLevel] = useState<'doctorado' | 'maestria' | 'especializacion'>('maestria');
  const [modality, setModality] = useState<'presencial' | 'hibrido' | 'virtual'>('presencial');
  const [studentsCount, setStudentsCount] = useState<number>(20);
  const [programCredits, setProgramCredits] = useState<number>(36);
  const [fixedCosts, setFixedCosts] = useState<number>(140000000);
  const [variableCosts, setVariableCosts] = useState<number>(60000000);
  const [otherIncome, setOtherIncome] = useState<number>(15000000);
  const [discountPct, setDiscountPct] = useState<number>(10); // average scholarship/discount rate (e.g. 10%)
  
  // Administrator manual override controls
  const [isAdminOverride, setIsAdminOverride] = useState<boolean>(false);
  const [customCreditValue, setCustomCreditValue] = useState<number>(650000);

  // Scenario management
  const [newScenarioName, setNewScenarioName] = useState<string>("");
  const [savedScenarios, setSavedScenarios] = useState<SavedScenario[]>([
    {
      id: 'default_esperado',
      name: 'Escenario Esperado (Presencial)',
      level: 'maestria',
      modality: 'presencial',
      studentsCount: 20,
      programCredits: 36,
      fixedCosts: 140000000,
      variableCosts: 60000000,
      otherIncome: 15000000,
      discountPct: 10,
      isAdminOverride: false,
      customCreditValue: 650000,
      totalIncome: 423900000,
      totalCosts: 200000000,
      utility: 223900000,
      breakEvenCredits: 17,
      breakEvenStudents: 10
    },
    {
      id: 'default_conservador',
      name: 'Escenario Híbrido Conservador',
      level: 'maestria',
      modality: 'hibrido',
      studentsCount: 15,
      programCredits: 36,
      fixedCosts: 140000000,
      variableCosts: 50000000,
      otherIncome: 10000000,
      discountPct: 15,
      isAdminOverride: false,
      customCreditValue: 650000,
      totalIncome: 255721500,
      totalCosts: 190000000,
      utility: 65721500,
      breakEvenCredits: 26,
      breakEvenStudents: 11
    },
    {
      id: 'default_pesimista',
      name: 'Escenario Crítico (Virtual Bajo Aforo)',
      level: 'maestria',
      modality: 'virtual',
      studentsCount: 8,
      programCredits: 36,
      fixedCosts: 120000000,
      variableCosts: 40000000,
      otherIncome: 5000000,
      discountPct: 20,
      isAdminOverride: false,
      customCreditValue: 650000,
      totalIncome: 106673600,
      totalCosts: 160000000,
      utility: -53326400,
      breakEvenCredits: 55, // exceeds program credits
      breakEvenStudents: 13
    }
  ]);

  // Tab navigation
  const [activeTab, setActiveTab] = useState<'simulator' | 'scenarios'>('simulator');

  // Base Credit Value calculation
  const baseCreditValue = useMemo(() => {
    switch (level) {
      case 'doctorado': return 900000;
      case 'maestria': return 630000;
      case 'especializacion': return 450000;
      default: return 450000;
    }
  }, [level]);

  // Modality multiplier calculation
  const modalityMultiplier = useMemo(() => {
    switch (modality) {
      case 'presencial': return 1.0;
      case 'hibrido': return 0.85;
      case 'virtual': return 0.70;
      default: return 1.0;
    }
  }, [modality]);

  const calculatedCreditValue = useMemo(() => {
    return baseCreditValue * modalityMultiplier;
  }, [baseCreditValue, modalityMultiplier]);

  const finalCreditValue = useMemo(() => {
    return isAdminOverride ? customCreditValue : calculatedCreditValue;
  }, [isAdminOverride, customCreditValue, calculatedCreditValue]);

  // Validations check
  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    if (studentsCount < 1) errors.push("El número de estudiantes debe ser al menos 1.");
    if (programCredits <= 0) errors.push("El número de créditos del programa debe ser mayor que 0.");
    if (fixedCosts < 0) errors.push("Los costos fijos no pueden ser negativos.");
    if (variableCosts < 0) errors.push("Los costos variables no pueden ser negativos.");
    if (otherIncome < 0) errors.push("Otros ingresos institucionales no pueden ser negativos.");
    if (discountPct < 0 || discountPct > 100) errors.push("El porcentaje de descuentos/becas debe estar entre 0% y 100%.");
    if (isAdminOverride && customCreditValue <= 0) errors.push("El valor del crédito personalizado debe ser mayor que 0.");
    return errors;
  }, [studentsCount, programCredits, fixedCosts, variableCosts, otherIncome, discountPct, isAdminOverride, customCreditValue]);

  // Financial calculations
  const financials = useMemo(() => {
    if (validationErrors.length > 0) {
      return {
        grossIncome: 0,
        discounts: 0,
        netTuitionIncome: 0,
        totalIncome: 0,
        totalCosts: 0,
        utility: 0,
        marginPct: 0,
        profitabilityPct: 0,
        breakEvenCredits: 0,
        breakEvenStudents: 0,
        avgRevenuePerStudent: 0,
        avgCostPerStudent: 0
      };
    }

    const grossIncome = finalCreditValue * programCredits * studentsCount;
    const discounts = grossIncome * (discountPct / 100);
    const netTuitionIncome = grossIncome - discounts;
    const totalIncome = netTuitionIncome + otherIncome;
    
    const totalCosts = fixedCosts + variableCosts;
    const utility = totalIncome - totalCosts;
    const marginPct = totalIncome > 0 ? (utility / totalIncome) * 100 : 0;
    const profitabilityPct = totalCosts > 0 ? (utility / totalCosts) * 100 : 0;
    
    const avgRevenuePerStudent = studentsCount > 0 ? totalIncome / studentsCount : 0;
    const avgCostPerStudent = studentsCount > 0 ? totalCosts / studentsCount : 0;

    // Break Even calculations
    // Costos netos a cubrir = Costos Totales - Otros Ingresos
    const netCostsToCover = Math.max(0, totalCosts - otherIncome);
    const netRevenuePerCreditStudent = finalCreditValue * (1 - discountPct / 100);

    // Break Even Credits = netCostsToCover / (finalCreditValue * studentsCount * (1 - discountPct/100))
    const creditsDenom = netRevenuePerCreditStudent * studentsCount;
    const breakEvenCredits = creditsDenom > 0 ? Math.ceil(netCostsToCover / creditsDenom) : 0;

    // Break Even Students = netCostsToCover / (finalCreditValue * programCredits * (1 - discountPct/100))
    const studentsDenom = netRevenuePerCreditStudent * programCredits;
    const breakEvenStudents = studentsDenom > 0 ? Math.ceil(netCostsToCover / studentsDenom) : 0;

    return {
      grossIncome,
      discounts,
      netTuitionIncome,
      totalIncome,
      totalCosts,
      utility,
      marginPct,
      profitabilityPct,
      breakEvenCredits,
      breakEvenStudents,
      avgRevenuePerStudent,
      avgCostPerStudent
    };
  }, [finalCreditValue, programCredits, studentsCount, fixedCosts, variableCosts, otherIncome, discountPct, validationErrors]);

  // Color-coding based on net utility result (Green = surplus, Yellow = break even, Red = deficit)
  const financialStatus = useMemo(() => {
    if (validationErrors.length > 0) return 'neutral';
    if (financials.utility > 5000000) return 'surplus'; // surplus greater than 5m COP
    if (financials.utility < -5000000) return 'deficit'; // deficit greater than 5m COP
    return 'equilibrium'; // close to zero
  }, [financials.utility, validationErrors]);

  // Sensitivity analysis data mapping (varies number of students from 5 to 40)
  const sensitivityChartData = useMemo(() => {
    if (validationErrors.length > 0) return [];
    
    const data = [];
    const step = 5;
    for (let sCount = 5; sCount <= 40; sCount += step) {
      const gIncome = finalCreditValue * programCredits * sCount;
      const disc = gIncome * (discountPct / 100);
      const nTuition = gIncome - disc;
      const tIncome = nTuition + otherIncome;
      const tCosts = fixedCosts + variableCosts;
      const ut = tIncome - tCosts;
      
      data.push({
        students: sCount,
        'Ingresos Proyectados': Math.round(tIncome / 1e6 * 100) / 100,
        'Costos Fijos + Variables': Math.round(tCosts / 1e6 * 100) / 100,
        'Resultado Neto (COP)': Math.round(ut / 1e6 * 100) / 100
      });
    }
    return data;
  }, [finalCreditValue, programCredits, discountPct, otherIncome, fixedCosts, variableCosts, validationErrors]);

  // General chart comparison data
  const mainBarChartData = useMemo(() => {
    return [
      {
        name: 'Simulación Actual',
        'Ingresos Totales': Math.round(financials.totalIncome / 1e6 * 100) / 100,
        'Costos Totales': Math.round(financials.totalCosts / 1e6 * 100) / 100,
        'Utilidad/Déficit': Math.round(financials.utility / 1e6 * 100) / 100
      }
    ];
  }, [financials]);

  // Cost structure pie chart
  const costDistributionChartData = useMemo(() => {
    return [
      { name: 'Costos Fijos', value: fixedCosts },
      { name: 'Costos Variables', value: variableCosts }
    ];
  }, [fixedCosts, variableCosts]);

  // Scenario management actions
  const handleSaveScenario = () => {
    if (!newScenarioName.trim()) return;
    
    const scenario: SavedScenario = {
      id: Date.now().toString(),
      name: newScenarioName,
      level,
      modality,
      studentsCount,
      programCredits,
      fixedCosts,
      variableCosts,
      otherIncome,
      discountPct,
      isAdminOverride,
      customCreditValue,
      totalIncome: financials.totalIncome,
      totalCosts: financials.totalCosts,
      utility: financials.utility,
      breakEvenCredits: financials.breakEvenCredits,
      breakEvenStudents: financials.breakEvenStudents
    };

    setSavedScenarios(prev => [scenario, ...prev]);
    setNewScenarioName("");
    setActiveTab('scenarios'); // switch to comparison view
  };

  const handleLoadScenario = (scenario: SavedScenario) => {
    setLevel(scenario.level);
    setModality(scenario.modality);
    setStudentsCount(scenario.studentsCount);
    setProgramCredits(scenario.programCredits);
    setFixedCosts(scenario.fixedCosts);
    setVariableCosts(scenario.variableCosts);
    setOtherIncome(scenario.otherIncome);
    setDiscountPct(scenario.discountPct);
    setIsAdminOverride(scenario.isAdminOverride);
    setCustomCreditValue(scenario.customCreditValue);
    setActiveTab('simulator');
  };

  const handleDeleteScenario = (id: string) => {
    setSavedScenarios(prev => prev.filter(s => s.id !== id));
  };

  // Scenario comparison chart mapping
  const scenarioComparisonChartData = useMemo(() => {
    return savedScenarios.map(s => ({
      name: s.name,
      'Ingresos': Math.round(s.totalIncome / 1e6),
      'Costos': Math.round(s.totalCosts / 1e6),
      'Margen Neto': Math.round(s.utility / 1e6)
    }));
  }, [savedScenarios]);

  // Export to CSV Function
  const handleExportCSV = () => {
    let csv = "\uFEFFConcepto;Valor de Simulación\n";
    csv += `Nivel Académico;${level.toUpperCase()}\n`;
    csv += `Modalidad;${modality.toUpperCase()}\n`;
    csv += `Número de Estudiantes;${studentsCount}\n`;
    csv += `Créditos del Programa;${programCredits}\n`;
    csv += `Valor Crédito Aplicado (COP);${finalCreditValue}\n`;
    csv += `Porcentaje Descuentos/Becas;${discountPct}%\n`;
    csv += `Otros Ingresos (COP);${otherIncome}\n`;
    csv += `Costos Fijos (COP);${fixedCosts}\n`;
    csv += `Costos Variables (COP);${variableCosts}\n`;
    csv += `Total Ingresos Proyectados (COP);${financials.totalIncome}\n`;
    csv += `Total Costos Proyectados (COP);${financials.totalCosts}\n`;
    csv += `Utilidad/Déficit Neto (COP);${financials.utility}\n`;
    csv += `Punto de Equilibrio en Créditos;${financials.breakEvenCredits} créditos\n`;
    csv += `Punto de Equilibrio en Estudiantes;${financials.breakEvenStudents} estudiantes\n`;
    csv += `Ingreso Promedio por Estudiante (COP);${financials.avgRevenuePerStudent.toFixed(0)}\n`;
    csv += `Costo Promedio por Estudiante (COP);${financials.avgCostPerStudent.toFixed(0)}\n`;
    csv += `Margen Financiero;${financials.marginPct.toFixed(1)}%\n`;
    csv += `Rentabilidad;${financials.profitabilityPct.toFixed(1)}%\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `Costeo_Posgrados_Creditos_${programCredits}cr.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-6">
        <div>
          <div className="flex items-center gap-2 text-[#ffcc29] text-xs font-mono uppercase tracking-wider mb-1">
            <BookOpen size={14} />
            <span>Simulador Financiero UPTC</span>
          </div>
          <h1 className="text-3xl font-display font-bold text-white tracking-tight">
            Costeo de Posgrados por Créditos
          </h1>
          <p className="text-sm text-on-surface-variant max-w-2xl font-sans mt-1">
            Herramienta interactiva para calcular el valor de matrícula por créditos académicos de posgrado, determinar el punto de equilibrio financiero y evaluar la sostenibilidad de programas.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button 
            onClick={handleExportCSV} 
            disabled={validationErrors.length > 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-xl text-xs font-semibold font-sans transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={14} className="text-[#ffcc29]" /> Exportar CSV
          </button>
          <button 
            onClick={() => window.print()} 
            className="flex items-center gap-2 px-4 py-2.5 bg-[#ffcc29] hover:bg-[#ffcc29]/90 text-black rounded-xl text-xs font-bold font-sans transition-all cursor-pointer"
          >
            Imprimir Reporte
          </button>
        </div>
      </div>

      {/* Validations warnings */}
      {validationErrors.length > 0 && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex gap-3 text-rose-400">
          <AlertTriangle className="shrink-0 mt-0.5" size={20} />
          <div className="text-xs space-y-1">
            <p className="font-bold">Error de Validación en Parámetros:</p>
            <ul className="list-disc list-inside space-y-0.5">
              {validationErrors.map((err, idx) => (
                <li key={idx}>{err}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Main KPI Bar */}
      {validationErrors.length === 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          
          {/* Net balance result card */}
          <div className={`p-5 rounded-2xl border transition-all duration-300 ${
            financialStatus === 'surplus' ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400' :
            financialStatus === 'deficit' ? 'border-rose-500/30 bg-rose-500/5 text-rose-400' :
            'border-amber-500/30 bg-amber-500/5 text-amber-400'
          }`}>
            <span className="text-[10px] font-mono uppercase tracking-wider text-white/50">Resultado Financiero</span>
            <div className="flex justify-between items-end mt-2">
              <h3 className="text-2xl font-display font-bold font-mono tracking-tight text-white">
                {financials.utility >= 0 ? '+' : ''}{(financials.utility / 1e6).toFixed(2)} M
              </h3>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                financialStatus === 'surplus' ? 'bg-emerald-500/10 text-emerald-400' :
                financialStatus === 'deficit' ? 'bg-rose-500/10 text-rose-400' :
                'bg-amber-500/10 text-amber-400'
              }`}>
                {financialStatus === 'surplus' ? 'Superávit' :
                 financialStatus === 'deficit' ? 'Déficit' :
                 'Equilibrio'}
              </span>
            </div>
            <p className="text-[10px] text-on-surface-variant font-sans mt-2.5 leading-snug">
              {financialStatus === 'surplus' ? "El programa cubre la totalidad de sus costos y genera utilidad." :
               financialStatus === 'deficit' ? "El programa genera pérdidas presupuestales en esta cohorte." :
               "El programa se encuentra cercano al equilibrio financiero."}
            </p>
          </div>

          {/* Break-even Credits card */}
          <div className="p-5 rounded-2xl border border-white/10 bg-white/5 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-mono uppercase tracking-wider text-white/50">Equilibrio (Créditos)</span>
                <HelpCircle size={14} className="text-white/30 cursor-help" title="Número mínimo de créditos totales que deben matricularse para cubrir costos." />
              </div>
              <h3 className="text-2xl font-display font-bold font-mono tracking-tight text-white mt-2">
                {financials.breakEvenCredits} <span className="text-xs text-white/40 font-normal">créditos</span>
              </h3>
            </div>
            <p className="text-[10px] text-on-surface-variant font-sans mt-2.5">
              De un total de <strong className="text-[#ffcc29]">{programCredits * studentsCount}</strong> créditos potenciales matriculados.
            </p>
          </div>

          {/* Break-even Students card */}
          <div className="p-5 rounded-2xl border border-white/10 bg-white/5 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-mono uppercase tracking-wider text-white/50">Estudiantes Mínimos</span>
                <HelpCircle size={14} className="text-white/30 cursor-help" title="Número mínimo de alumnos con la carga de créditos completa para llegar al equilibrio." />
              </div>
              <h3 className="text-2xl font-display font-bold font-mono tracking-tight text-[#ffcc29] mt-2">
                {financials.breakEvenStudents} <span className="text-xs text-[#ffcc29]/50 font-normal">alumnos</span>
              </h3>
            </div>
            <p className="text-[10px] text-on-surface-variant font-sans mt-2.5">
              Frente a los <strong className="text-white">{studentsCount}</strong> estudiantes simulados actualmente.
            </p>
          </div>

          {/* Margin & Profitability card */}
          <div className="p-5 rounded-2xl border border-white/10 bg-white/5 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-white/50">Margen & Rentabilidad</span>
              <div className="flex gap-4 mt-2">
                <div>
                  <span className="text-[9px] font-mono text-white/30 uppercase block">Margen</span>
                  <span className={`text-lg font-bold font-mono ${financials.marginPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {financials.marginPct.toFixed(1)}%
                  </span>
                </div>
                <div className="border-l border-white/5 pl-4">
                  <span className="text-[9px] font-mono text-white/30 uppercase block">Rentabilidad</span>
                  <span className={`text-lg font-bold font-mono ${financials.profitabilityPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {financials.profitabilityPct.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
            <span className="text-[9px] text-white/30 font-mono mt-3">Rendimiento de los recursos invertidos</span>
          </div>

        </div>
      )}

      {/* Main layout switcher */}
      <div className="flex border-b border-white/10 gap-2">
        <button
          onClick={() => setActiveTab('simulator')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === 'simulator' ? 'border-[#ffcc29] text-[#ffcc29]' : 'border-transparent text-white/50 hover:text-white'
          }`}
        >
          <Activity size={15} /> Simulador y Gráficos
        </button>
        <button
          onClick={() => setActiveTab('scenarios')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === 'scenarios' ? 'border-[#ffcc29] text-[#ffcc29]' : 'border-transparent text-white/50 hover:text-white'
          }`}
        >
          <Layers size={15} /> Comparativa de Escenarios ({savedScenarios.length})
        </button>
      </div>

      {/* Tab 1: Simulator main view */}
      {activeTab === 'simulator' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Controls Column (Left) */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Input Variables panel */}
            <div className="glass-card rounded-2xl border border-white/10 p-6 bg-white/5 space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-white/5 pb-2.5">
                Variables de Simulación
              </h3>

              <div className="space-y-4">
                
                {/* Level selection */}
                <div>
                  <label className="block text-[10px] font-mono text-on-surface-variant uppercase tracking-wider mb-1.5">Nivel Académico (Posgrado)</label>
                  <select 
                    value={level} 
                    onChange={(e) => setLevel(e.target.value as any)}
                    className="w-full bg-[#0f172a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-[#ffcc29] focus:outline-none"
                  >
                    <option value="especializacion">Especialización (Base: $450.000 / Cred.)</option>
                    <option value="maestria">Maestría (Base: $630.000 / Cred.)</option>
                    <option value="doctorado">Doctorado (Base: $900.000 / Cred.)</option>
                  </select>
                </div>

                {/* Modality selection */}
                <div>
                  <label className="block text-[10px] font-mono text-on-surface-variant uppercase tracking-wider mb-1.5">Modalidad de Dictado</label>
                  <select 
                    value={modality} 
                    onChange={(e) => setModality(e.target.value as any)}
                    className="w-full bg-[#0f172a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-[#ffcc29] focus:outline-none"
                  >
                    <option value="presencial">Presencial (100% Tarifa)</option>
                    <option value="hibrido">Híbrido (85% Tarifa)</option>
                    <option value="virtual">Virtual (70% Tarifa)</option>
                  </select>
                </div>

                {/* Slider: Students */}
                <div>
                  <div className="flex justify-between text-xs font-mono mb-1.5">
                    <span className="text-white/60">Número de Estudiantes</span>
                    <span className="text-white font-bold">{studentsCount} alumnos</span>
                  </div>
                  <input 
                    type="range" 
                    min="1" 
                    max="60" 
                    step="1"
                    value={studentsCount} 
                    onChange={(e) => setStudentsCount(parseInt(e.target.value) || 1)}
                    className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#ffcc29]"
                  />
                </div>

                {/* Slider: Program Credits */}
                <div>
                  <div className="flex justify-between text-xs font-mono mb-1.5">
                    <span className="text-white/60">Créditos del Programa</span>
                    <span className="text-white font-bold">{programCredits} créditos</span>
                  </div>
                  <input 
                    type="range" 
                    min="6" 
                    max="90" 
                    step="1"
                    value={programCredits} 
                    onChange={(e) => setProgramCredits(parseInt(e.target.value) || 1)}
                    className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#ffcc29]"
                  />
                </div>

                {/* Slider: Discount / Becas */}
                <div>
                  <div className="flex justify-between text-xs font-mono mb-1.5">
                    <span className="text-white/60">Porcentaje Promedio Becas/Descuentos</span>
                    <span className="text-red-400 font-bold">{discountPct}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="60" 
                    step="5"
                    value={discountPct} 
                    onChange={(e) => setDiscountPct(parseInt(e.target.value) || 0)}
                    className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#ffcc29]"
                  />
                </div>

                {/* Admin override panel */}
                <div className="border-t border-white/5 pt-3 mt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider">Ajuste Manual de Crédito (Admin)</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={isAdminOverride} 
                        onChange={(e) => setIsAdminOverride(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#ffcc29]"></div>
                    </label>
                  </div>

                  {isAdminOverride && (
                    <div className="mt-3">
                      <label className="block text-[9px] font-mono text-white/50 mb-1">Valor de Crédito Manual (COP)</label>
                      <input 
                        type="number" 
                        step="5000"
                        value={customCreditValue} 
                        onChange={(e) => setCustomCreditValue(parseInt(e.target.value) || 0)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
                      />
                    </div>
                  )}

                  <div className="mt-3 flex justify-between items-center text-xs bg-white/5 p-3 rounded-xl border border-white/5">
                    <span className="text-white/50">Valor del Crédito Final:</span>
                    <strong className="text-[#ffcc29] font-mono">${Math.round(finalCreditValue).toLocaleString()} COP</strong>
                  </div>
                </div>

              </div>
            </div>

            {/* Financial cost config panel */}
            <div className="glass-card rounded-2xl border border-white/10 p-6 bg-white/5 space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-white/5 pb-2.5">
                Presupuesto de Costos y Otros
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-mono text-on-surface-variant uppercase tracking-wider mb-1.5">Costos Fijos del Programa</label>
                  <input 
                    type="number" 
                    step="1000000"
                    value={fixedCosts} 
                    onChange={(e) => setFixedCosts(parseInt(e.target.value) || 0)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                  <p className="text-[9px] text-white/40 mt-1">Coordinaciones, personal de apoyo, licencias fijas, hosting, etc.</p>
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-on-surface-variant uppercase tracking-wider mb-1.5">Costos Variables del Programa</label>
                  <input 
                    type="number" 
                    step="1000000"
                    value={variableCosts} 
                    onChange={(e) => setVariableCosts(parseInt(e.target.value) || 0)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                  <p className="text-[9px] text-white/40 mt-1">Nómina docente, material de clases por alumno, laboratorios.</p>
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-on-surface-variant uppercase tracking-wider mb-1.5">Otros Ingresos Institucionales</label>
                  <input 
                    type="number" 
                    step="1000000"
                    value={otherIncome} 
                    onChange={(e) => setOtherIncome(parseInt(e.target.value) || 0)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono text-[#4ade80]"
                  />
                  <p className="text-[9px] text-white/40 mt-1">Inscripciones, derechos de grado, convenios o aportes centrales.</p>
                </div>
              </div>
            </div>

            {/* Scenario saver card */}
            <div className="glass-card rounded-2xl border border-white/10 p-5 bg-white/5 space-y-3">
              <h4 className="text-[10px] font-bold text-white uppercase tracking-wider">Guardar Escenario Actual</h4>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Nombre de escenario..."
                  value={newScenarioName}
                  onChange={(e) => setNewScenarioName(e.target.value)}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/20"
                />
                <button
                  onClick={handleSaveScenario}
                  disabled={!newScenarioName.trim() || validationErrors.length > 0}
                  className="px-3 bg-[#ffcc29] hover:bg-[#ffcc29]/90 text-black rounded-xl text-xs font-bold font-sans cursor-pointer transition-all disabled:opacity-50"
                >
                  <Save size={15} />
                </button>
              </div>
            </div>

          </div>

          {/* Graphs and Detailed Tables (Right) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Visual Charts section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Financial comparison bar */}
              <div className="glass-card rounded-2xl border border-white/10 p-5 bg-white/5">
                <h4 className="text-[10px] font-bold text-white uppercase tracking-wider mb-4">Ingresos vs Costos de Operación</h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={mainBarChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" fontSize={10} />
                      <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} unit="M" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#09090b', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}
                        labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                      />
                      <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px' }} />
                      <Bar dataKey="Ingresos Totales" fill="#4ade80" name="Ingresos Neto" radius={[4, 4, 0, 0]} barSize={35} />
                      <Bar dataKey="Costos Totales" fill="#f43f5e" name="Costos Totales" radius={[4, 4, 0, 0]} barSize={35} />
                      <Bar dataKey="Utilidad/Déficit" fill="#3b82f6" name="Margen Neto" radius={[4, 4, 0, 0]} barSize={35} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Costs Breakdown Donut */}
              <div className="glass-card rounded-2xl border border-white/10 p-5 bg-white/5 flex flex-col justify-between">
                <h4 className="text-[10px] font-bold text-white uppercase tracking-wider mb-4">Distribución de Costos del Programa</h4>
                <div className="h-44 relative flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={costDistributionChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        <Cell fill="#a78bfa" />
                        <Cell fill="#fb7185" />
                      </Pie>
                      <Tooltip 
                        formatter={(val: number) => `${Math.round(val / 1e6).toLocaleString()} M COP`}
                        contentStyle={{ backgroundColor: '#09090b', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute text-center">
                    <span className="text-[8px] uppercase tracking-wider text-white/30 font-mono">Egresos</span>
                    <p className="text-base font-bold text-white font-mono">
                      {Math.round(financials.totalCosts / 1e6)}M
                    </p>
                  </div>
                </div>
                
                {/* Cost legends */}
                <div className="space-y-1.5 border-t border-white/5 pt-3 text-xs">
                  <div className="flex justify-between items-center text-white/60">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#a78bfa]"></div>
                      <span>Fijos (Inst., Coord.)</span>
                    </div>
                    <strong className="font-mono text-white">${Math.round(fixedCosts).toLocaleString()}</strong>
                  </div>
                  <div className="flex justify-between items-center text-white/60">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#fb7185]"></div>
                      <span>Variables (Docencia, Lab)</span>
                    </div>
                    <strong className="font-mono text-white">${Math.round(variableCosts).toLocaleString()}</strong>
                  </div>
                </div>
              </div>

            </div>

            {/* Chart: Break-even Sensitivity graph */}
            {sensitivityChartData.length > 0 && (
              <div className="glass-card rounded-2xl border border-white/10 p-5 bg-white/5">
                <h4 className="text-[10px] font-bold text-white uppercase tracking-wider mb-4">Análisis de Sensibilidad: Estudiantes vs Balance Neto</h4>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={sensitivityChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="students" stroke="rgba(255,255,255,0.4)" fontSize={10} label={{ value: 'Número de Estudiantes', position: 'bottom', offset: -10, fill: 'rgba(255,255,255,0.4)', fontSize: 9 }} />
                      <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} unit="M" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#09090b', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}
                        labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                      />
                      <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px' }} />
                      <ReferenceLine y={0} stroke="#f43f5e" strokeWidth={1.5} strokeDasharray="3 3" label={{ value: 'Equilibrio (0 COP)', fill: '#f43f5e', fontSize: 9, position: 'top' }} />
                      <Line type="monotone" dataKey="Ingresos Proyectados" stroke="#4ade80" strokeWidth={2} name="Ingresos" dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="Resultado Neto (COP)" stroke="#3b82f6" strokeWidth={2.5} name="Resultado Neto" dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Detailed summary card grid */}
            <div className="glass-card rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-white/5 pb-2.5">
                Resumen Presupuestal Detallado (COP)
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
                
                <div className="space-y-2 border-r border-white/5 pr-4">
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-white/60">Matrículas Brutas Proyectadas:</span>
                    <strong className="font-mono text-white">${Math.round(financials.grossIncome).toLocaleString()}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5 text-rose-300">
                    <span>Becas / Descuentos ({discountPct}%):</span>
                    <strong className="font-mono">- ${Math.round(financials.discounts).toLocaleString()}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-white/60">Matrículas Netas:</span>
                    <strong className="font-mono text-white">${Math.round(financials.netTuitionIncome).toLocaleString()}</strong>
                  </div>
                  <div className="flex justify-between py-1 text-[#4ade80] font-bold">
                    <span>INGRESOS TOTALES DISPONIBLES:</span>
                    <strong className="font-mono">${Math.round(financials.totalIncome).toLocaleString()}</strong>
                  </div>
                </div>

                <div className="space-y-2 pl-0 md:pl-4">
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-white/60">Costos de Operación Fijos:</span>
                    <strong className="font-mono text-white">${Math.round(fixedCosts).toLocaleString()}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-white/60">Costos de Operación Variables:</span>
                    <strong className="font-mono text-white">${Math.round(variableCosts).toLocaleString()}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-white/60">Ingreso Central Promedio / Estudiante:</span>
                    <strong className="font-mono text-white">${Math.round(financials.avgRevenuePerStudent).toLocaleString()}</strong>
                  </div>
                  <div className="flex justify-between py-1 text-red-300">
                    <span>Costo Central Promedio / Estudiante:</span>
                    <strong className="font-mono">${Math.round(financials.avgCostPerStudent).toLocaleString()}</strong>
                  </div>
                </div>

              </div>
            </div>

          </div>

        </div>
      )}

      {/* Tab 2: Scenario Comparison View */}
      {activeTab === 'scenarios' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          
          {/* Comparison bar chart */}
          {savedScenarios.length > 0 ? (
            <div className="glass-card rounded-2xl border border-white/10 p-5 bg-white/5">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Comparativa de Escenarios Financieros (Millones COP)</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={scenarioComparisonChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" fontSize={9} />
                    <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} unit="M" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#09090b', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}
                      labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                    />
                    <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="Ingresos" fill="#4ade80" name="Ingresos" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Costos" fill="#f43f5e" name="Costos" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Margen Neto" fill="#3b82f6" name="Balance Neto" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 bg-white/5 border border-white/10 rounded-2xl">
              <AlertTriangle className="mx-auto text-white/20 mb-3" size={36} />
              <p className="text-sm text-white/50">No hay escenarios guardados para comparar. Ajusta parámetros y guarda algunos escenarios.</p>
            </div>
          )}

          {/* Saved scenarios table */}
          {savedScenarios.length > 0 && (
            <div className="glass-card rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
              <div className="p-4 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Listado de Escenarios Guardados</h3>
                <span className="text-[10px] text-white/40 font-mono">Simulados y Comparados</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/5 text-white font-bold font-sans">
                      <th className="p-4">Nombre Escenario</th>
                      <th className="p-4">Programa / Modalidad</th>
                      <th className="p-4 text-center">Alumnos</th>
                      <th className="p-4 text-center">Créditos</th>
                      <th className="p-4 text-right">Ingresos</th>
                      <th className="p-4 text-right">Costos</th>
                      <th className="p-4 text-right">Margen Neto</th>
                      <th className="p-4 text-center">Eq. Créditos</th>
                      <th className="p-4 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-white/80 font-sans">
                    {savedScenarios.map((scen) => (
                      <tr key={scen.id} className="hover:bg-white/[0.02]">
                        <td className="p-4 font-bold text-white">{scen.name}</td>
                        <td className="p-4 capitalize text-white/60">
                          {scen.level.replace('_', ' ')} ({scen.modality})
                        </td>
                        <td className="p-4 text-center font-mono">{scen.studentsCount}</td>
                        <td className="p-4 text-center font-mono">{scen.programCredits}</td>
                        <td className="p-4 text-right font-mono text-[#4ade80]">${Math.round(scen.totalIncome).toLocaleString()}</td>
                        <td className="p-4 text-right font-mono text-rose-300">${Math.round(scen.totalCosts).toLocaleString()}</td>
                        <td className={`p-4 text-right font-mono font-bold ${scen.utility >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {scen.utility >= 0 ? '+' : ''}${Math.round(scen.utility).toLocaleString()}
                        </td>
                        <td className="p-4 text-center font-mono text-[#ffcc29] font-bold">{scen.breakEvenCredits} cr.</td>
                        <td className="p-4 text-center">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => handleLoadScenario(scen)}
                              className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[10px] font-bold transition cursor-pointer"
                            >
                              Cargar
                            </button>
                            <button
                              onClick={() => handleDeleteScenario(scen.id)}
                              className="p-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg transition cursor-pointer"
                              title="Eliminar"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
