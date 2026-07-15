import { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ComposedChart, Line
} from 'recharts';
import { 
  Filter, DollarSign, Activity, TrendingUp, RefreshCw, Compass,
  Layers, Wallet, HelpCircle, AlertTriangle, ShieldCheck, ArrowRight, 
  Download, Search, CheckCircle, Info, Users, GraduationCap, Percent, BookOpen
} from 'lucide-react';

// Types for Semester Simulation Data
interface SemesterData {
  semesterLabel: string; // e.g. "2026-1", "2026-2", "2027-1", ...
  newCohortStudents: number; // yellow cell: initial students entering
  votacionDiscountCount: number; // yellow cell: students with voter discount
  monitoriaDiscountCount: number; // yellow cell: students with monitor discount
  honorDiscountCount: number; // yellow cell: students with honor discount
  res16DiscountCount: number; // yellow cell: students with Res 16 discount
  otherDiscountCount: number; // yellow cell: students with other discount
  otherDiscountPct: number; // other discount percentage (e.g. 50%)
  
  // Other Income
  aspirantesCount: number; // yellow cell: for application fees
  graduandosCount: number; // yellow cell: for graduation fees
  otherRawIncome: number; // other income in COP
  
  // Staff inputs
  teachingHours: number; // total hours for teachers
  coordinatorHours: number; // coordinator hours
  practicesHours: number; // practices coordinator hours
  supportStaffMonthlyCPS: number; // support staff monthly contract
  supportStaffMonths: number; // support staff contract months
  
  // Operating inputs (Purchase of goods/services)
  operatingGoodsAndServices: number; // total goods and services in COP
}

// Preset Programs structure
interface ProgramPreset {
  name: string;
  type: 'especializacion' | 'maestria_prof' | 'maestria_inv' | 'doctorado';
  faculty: string;
  tuitionSMMLV: number;
  attritionPct: number;
  cohortStudents: number[]; // 6 semesters
  teachingHours: number[];
  operatingCosts: number[];
}

const PROGRAM_PRESETS: ProgramPreset[] = [
  {
    name: "Maestría en Administración de Empresas (Estándar)",
    type: 'maestria_prof',
    faculty: "Ciencias Económicas y Administrativas",
    tuitionSMMLV: 7,
    attritionPct: 5,
    cohortStudents: [22, 0, 18, 0, 20, 0], // New cohort every odd semester
    teachingHours: [160, 160, 180, 180, 160, 160],
    operatingCosts: [12000000, 10000000, 14000000, 11000000, 13000000, 10000000]
  },
  {
    name: "Especialización en Salud Ocupacional (Cohorte Anual)",
    type: 'especializacion',
    faculty: "Ciencias de la Salud",
    tuitionSMMLV: 5,
    attritionPct: 2,
    cohortStudents: [30, 0, 30, 0, 30, 0],
    teachingHours: [120, 120, 120, 120, 120, 120],
    operatingCosts: [8000000, 6000000, 9000000, 7000000, 9000000, 7000000]
  },
  {
    name: "Doctorado en Ciencias de la Educación (Alta Intensidad)",
    type: 'doctorado',
    faculty: "Ciencias de la Educación",
    tuitionSMMLV: 10,
    attritionPct: 8,
    cohortStudents: [10, 0, 10, 0, 12, 0],
    teachingHours: [240, 240, 260, 260, 280, 280],
    operatingCosts: [20000000, 18000000, 22000000, 19000000, 24000000, 21000000]
  },
  {
    name: "Maestría Viabilidad Crítica (Poco Estudiantado)",
    type: 'maestria_prof',
    faculty: "Ingeniería",
    tuitionSMMLV: 6,
    attritionPct: 15, // High attrition
    cohortStudents: [12, 0, 10, 0, 8, 0], // Few students
    teachingHours: [160, 160, 160, 160, 160, 160],
    operatingCosts: [15000000, 12000000, 16000000, 13000000, 15000000, 12000000]
  }
];

export function ProgramCostingScreen({ onNavigate }: { onNavigate: (s: string) => void }) {
  // Config state
  const [selectedFaculty, setSelectedFaculty] = useState<string>("Ciencias Económicas y Administrativas");
  const [programName, setProgramName] = useState<string>("Maestría en Administración de Empresas (Estándar)");
  const [programType, setProgramType] = useState<'especializacion' | 'maestria_prof' | 'maestria_inv' | 'doctorado'>('maestria_prof');
  const [tuitionSMMLV, setTuitionSMMLV] = useState<number>(7);
  const [attritionPct, setAttritionPct] = useState<number>(5);
  
  // Financial base constants
  const [baseSMMLV2026, setBaseSMMLV2026] = useState<number>(1537380); // Base wage 2026
  const [annualWageIncreasePct, setAnnualWageIncreasePct] = useState<number>(8); // 8% annual wage increase
  const [parafiscalFactor, setParafiscalFactor] = useState<number>(37.03); // 37.03% social security
  
  // Hour multipliers based on degree type relative to SMMLV (e.g. Especializacion = 0.1, Maestria = 0.125, Doctorado = 0.155)
  const degreeHourMultipliers = {
    especializacion: 0.10,
    maestria_prof: 0.125,
    maestria_inv: 0.125,
    doctorado: 0.155
  };

  // 6 semesters data structure
  const semestersLabels = ["2026-1", "2026-2", "2027-1", "2027-2", "2028-1", "2028-2"];
  
  const [semesters, setSemesters] = useState<SemesterData[]>(() => {
    // Generate default populated values
    const preset = PROGRAM_PRESETS[0];
    return semestersLabels.map((label, idx) => ({
      semesterLabel: label,
      newCohortStudents: preset.cohortStudents[idx],
      votacionDiscountCount: preset.cohortStudents[idx] > 0 ? Math.ceil(preset.cohortStudents[idx] * 0.3) : 0, // 30% of students have vote card
      monitoriaDiscountCount: 0,
      honorDiscountCount: 0,
      res16DiscountCount: 0,
      otherDiscountCount: 0,
      otherDiscountPct: 50,
      aspirantesCount: preset.cohortStudents[idx] > 0 ? Math.ceil(preset.cohortStudents[idx] * 1.5) : 0,
      graduandosCount: idx === 3 ? 15 : idx === 5 ? 12 : 0, // assume graduates in later semesters
      otherRawIncome: 0,
      teachingHours: preset.teachingHours[idx],
      coordinatorHours: 64,
      practicesHours: 0,
      supportStaffMonthlyCPS: 3659400,
      supportStaffMonths: 4,
      operatingGoodsAndServices: preset.operatingCosts[idx]
    }));
  });

  const [activeSubTab, setActiveSubTab] = useState<'inputs' | 'costs' | 'results'>('results');
  
  // Apply a preset
  const handleApplyPreset = (preset: ProgramPreset) => {
    setProgramName(preset.name);
    setProgramType(preset.type);
    setSelectedFaculty(preset.faculty);
    setTuitionSMMLV(preset.tuitionSMMLV);
    setAttritionPct(preset.attritionPct);
    
    setSemesters(semestersLabels.map((label, idx) => ({
      semesterLabel: label,
      newCohortStudents: preset.cohortStudents[idx],
      votacionDiscountCount: preset.cohortStudents[idx] > 0 ? Math.ceil(preset.cohortStudents[idx] * 0.3) : 0,
      monitoriaDiscountCount: 0,
      honorDiscountCount: 0,
      res16DiscountCount: 0,
      otherDiscountCount: 0,
      otherDiscountPct: 50,
      aspirantesCount: preset.cohortStudents[idx] > 0 ? Math.ceil(preset.cohortStudents[idx] * 1.5) : 0,
      graduandosCount: idx === 3 ? Math.ceil(preset.cohortStudents[0] * 0.8) : 0, // estimate graduates
      otherRawIncome: 0,
      teachingHours: preset.teachingHours[idx],
      coordinatorHours: 64,
      practicesHours: 0,
      supportStaffMonthlyCPS: 3659400,
      supportStaffMonths: 4,
      operatingGoodsAndServices: preset.operatingCosts[idx]
    })));
  };

  // Helper: calculate SMMLV value for a given semester label
  const getSMMLVForSemester = (label: string): number => {
    // 2026: baseSMMLV2026
    // 2027: baseSMMLV2026 * (1 + annualWageIncreasePct/100)
    // 2028: baseSMMLV2026 * (1 + annualWageIncreasePct/100)^2
    if (label.startsWith("2026")) return baseSMMLV2026;
    if (label.startsWith("2027")) return baseSMMLV2026 * (1 + annualWageIncreasePct / 100);
    if (label.startsWith("2028")) return baseSMMLV2026 * Math.pow(1 + annualWageIncreasePct / 100, 2);
    return baseSMMLV2026;
  };

  // Calculated results
  const calculatedSemesters = useMemo(() => {
    // We need to project active students cohort by cohort
    // Program duration (how many semesters students study)
    const durationSemesters = programType === 'especializacion' ? 2 : programType === 'doctorado' ? 8 : 4;
    
    // Track active students from each cohorte launched at semester i (0 to 5)
    // activeCohortStudents[i][t] = active students of cohort launched at i in semester t >= i
    const activeCohortStudents = Array.from({ length: 6 }, () => new Array(6).fill(0));
    
    for (let i = 0; i < 6; i++) {
      const initial = semesters[i].newCohortStudents;
      if (initial > 0) {
        activeCohortStudents[i][i] = initial;
        // Project to subsequent semesters
        for (let t = i + 1; t < 6; t++) {
          const age = t - i;
          if (age < durationSemesters) {
            activeCohortStudents[i][t] = activeCohortStudents[i][t - 1] * (1 - attritionPct / 100);
          } else {
            activeCohortStudents[i][t] = 0; // graduated/finished
          }
        }
      }
    }

    // Now build semester-by-semester metrics
    return semesters.map((sem, t) => {
      const smmlv = getSMMLVForSemester(sem.semesterLabel);
      const tuitionValue = smmlv * tuitionSMMLV;
      
      // Total active students in semester t is the sum of active students in all cohorts
      let totalActiveStudents = 0;
      for (let i = 0; i <= t; i++) {
        totalActiveStudents += activeCohortStudents[i][t];
      }

      // Gross tuition income
      // To match the spreadsheet, gross income = sum over each cohort of (active_cohort_students * tuition_value)
      // Since tuition value is calculated on current SMMLV, it is active_students * tuitionValue
      const totalGrossIncome = totalActiveStudents * tuitionValue;

      // Discounts: voter (10%), monitor (70%), honor (100%), res 16 (50%), other (configurable)
      const maxDiscountsStudents = Math.max(0, totalActiveStudents);
      const votCount = Math.min(sem.votacionDiscountCount, maxDiscountsStudents);
      const monCount = Math.min(sem.monitoriaDiscountCount, maxDiscountsStudents - votCount);
      const honCount = Math.min(sem.honorDiscountCount, maxDiscountsStudents - votCount - monCount);
      const resCount = Math.min(sem.res16DiscountCount, maxDiscountsStudents - votCount - monCount - honCount);
      const othCount = Math.min(sem.otherDiscountCount, maxDiscountsStudents - votCount - monCount - honCount - resCount);

      const votDiscountVal = votCount * tuitionValue * 0.10;
      const monDiscountVal = monCount * tuitionValue * 0.70;
      const honDiscountVal = honCount * tuitionValue * 1.00;
      const resDiscountVal = resCount * tuitionValue * 0.50;
      const othDiscountVal = othCount * tuitionValue * (sem.otherDiscountPct / 100);

      const totalDiscounts = votDiscountVal + monDiscountVal + honDiscountVal + resDiscountVal + othDiscountVal;
      const totalNetIncome = totalGrossIncome - totalDiscounts;

      // Deductions (Central = 40%, Research = 5%, MESI = 0.5%)
      const deductionCentral = totalNetIncome * 0.40;
      const deductionResearch = totalNetIncome * 0.05;
      const deductionMesi = totalNetIncome * 0.005;
      const totalDeductions = deductionCentral + deductionResearch + deductionMesi;
      
      // Functioning tuition income
      const functioningTuitionIncome = totalNetIncome - totalDeductions; // 54.5% of net income

      // Other Income
      const inscriptionFee = smmlv * 0.25; // 0.25 SMMLV
      const graduationFee = smmlv * 1.0; // 1.0 SMMLV
      const applicationIncome = sem.aspirantesCount * inscriptionFee;
      const graduationIncome = sem.graduandosCount * graduationFee;
      const totalOtherIncome = applicationIncome + graduationIncome + sem.otherRawIncome;

      // Total Functioning Income
      const totalFunctioningIncome = functioningTuitionIncome + totalOtherIncome;

      // Gastos de Personal (Staff Costs)
      // Hour value is based on type: Especialización: 0.10 * SMMLV, Maestría: 0.125 * SMMLV, Doctorado: 0.155 * SMMLV
      const teachingHourMultiplier = degreeHourMultipliers[programType];
      const rawTeachingHourCost = smmlv * teachingHourMultiplier;
      const socialSecurityMultiplier = 1 + socialSecurityMultiplierForCalculation(parafiscalFactor);
      const loadedTeachingHourCost = rawTeachingHourCost * socialSecurityMultiplier;
      
      const teachersCost = sem.teachingHours * loadedTeachingHourCost;
      
      // Coordinator (Magister/Doctorate with point increments etc. - default base rate from spreadsheet around 70,400 COP)
      // Let's index coordinator/practice hour cost with inflation/SMMLV rate
      const baseHourRateCoordinators = 65787.385 * (smmlv / baseSMMLV2026); // dynamically adjusted to SMMLV
      const coordinatorCost = sem.coordinatorHours * baseHourRateCoordinators;
      const practicesCost = sem.practicesHours * baseHourRateCoordinators;
      
      // Support Staff: monthly cps * months
      // Let's index support staff contract rate with inflation
      const baseSupportCPS = sem.supportStaffMonthlyCPS * (smmlv / baseSMMLV2026);
      const supportStaffCost = baseSupportCPS * sem.supportStaffMonths;

      const totalStaffCosts = teachersCost + coordinatorCost + practicesCost + supportStaffCost;

      // Operating costs
      const totalOperatingCosts = sem.operatingGoodsAndServices;

      // Total Expenses
      const totalExpenses = totalStaffCosts + totalOperatingCosts;

      // Budget Balance
      const budgetBalance = totalFunctioningIncome - totalExpenses;

      return {
        ...sem,
        smmlv,
        tuitionValue,
        activeStudents: totalActiveStudents,
        activeCohortStudents: activeCohortStudents.map(cohort => cohort[t]),
        grossIncome: totalGrossIncome,
        totalDiscounts,
        netIncome: totalNetIncome,
        deductionCentral,
        deductionResearch,
        deductionMesi,
        totalDeductions,
        functioningTuitionIncome,
        applicationIncome,
        graduationIncome,
        totalOtherIncome,
        totalFunctioningIncome,
        teachersCost,
        coordinatorCost,
        practicesCost,
        supportStaffCost,
        totalStaffCosts,
        totalExpenses,
        budgetBalance,
        loadedTeachingHourCost
      };
    });
  }, [semesters, programType, tuitionSMMLV, attritionPct, baseSMMLV2026, annualWageIncreasePct, parafiscalFactor]);

  // Aggregated totals
  const aggregatedTotals = useMemo(() => {
    let totalGrossIncome = 0;
    let totalDiscounts = 0;
    let totalNetIncome = 0;
    let totalDeductions = 0;
    let totalFunctioningIncome = 0;
    let totalStaffCosts = 0;
    let totalOperatingCosts = 0;
    let totalExpenses = 0;
    let totalBalance = 0;
    let hasDeficitInAnySemester = false;

    calculatedSemesters.forEach(sem => {
      totalGrossIncome += sem.grossIncome;
      totalDiscounts += sem.totalDiscounts;
      totalNetIncome += sem.netIncome;
      totalDeductions += sem.totalDeductions;
      totalFunctioningIncome += sem.totalFunctioningIncome;
      totalStaffCosts += sem.totalStaffCosts;
      totalOperatingCosts += sem.operatingGoodsAndServices;
      totalExpenses += sem.totalExpenses;
      totalBalance += sem.budgetBalance;
      if (sem.budgetBalance < 0) {
        hasDeficitInAnySemester = true;
      }
    });

    return {
      totalGrossIncome,
      totalDiscounts,
      totalNetIncome,
      totalDeductions,
      totalFunctioningIncome,
      totalStaffCosts,
      totalOperatingCosts,
      totalExpenses,
      totalBalance,
      isBalanced: !hasDeficitInAnySemester
    };
  }, [calculatedSemesters]);

  const handleUpdateSemester = (index: number, fields: Partial<SemesterData>) => {
    setSemesters(prev => prev.map((s, i) => i === index ? { ...s, ...fields } : s));
  };

  // Helper for loaded cost calculation
  function socialSecurityMultiplierForCalculation(factor: number) {
    return factor / 100;
  }

  // Charts data mapping
  const chartData = useMemo(() => {
    return calculatedSemesters.map(sem => ({
      name: sem.semesterLabel,
      'Ingresos Funcionamiento': Math.round(sem.totalFunctioningIncome / 1e6 * 100) / 100,
      'Gastos Personal': Math.round(sem.totalStaffCosts / 1e6 * 100) / 100,
      'Gastos Adquisición': Math.round(sem.operatingGoodsAndServices / 1e6 * 100) / 100,
      'Gastos Totales': Math.round(sem.totalExpenses / 1e6 * 100) / 100,
      'Balance Presupuestal': Math.round(sem.budgetBalance / 1e6 * 100) / 100
    }));
  }, [calculatedSemesters]);

  const expenseDistributionChartData = useMemo(() => {
    return [
      { name: 'Gastos de Personal', value: Math.round(aggregatedTotals.totalStaffCosts) },
      { name: 'Gastos de Adquisición', value: Math.round(aggregatedTotals.totalOperatingCosts) },
      { name: 'Deducciones Institucionales', value: Math.round(aggregatedTotals.totalDeductions) }
    ];
  }, [aggregatedTotals]);

  // Export to CSV
  const handleExportCSV = () => {
    let csv = "Concepto;2026-1;2026-2;2027-1;2027-2;2028-1;2028-2\n";
    
    const rows = [
      { key: "Estudiantes Nuevos/Cohorte", fn: (s: any) => s.newCohortStudents },
      { key: "Estudiantes Activos Totales", fn: (s: any) => s.activeStudents },
      { key: "Valor Matrícula por Estudiante (COP)", fn: (s: any) => Math.round(s.tuitionValue) },
      { key: "TOTAL INGRESO BRUTO (COP)", fn: (s: any) => Math.round(s.grossIncome) },
      { key: "Total Descuentos (COP)", fn: (s: any) => Math.round(s.totalDiscounts) },
      { key: "INGRESOS NETOS (COP)", fn: (s: any) => Math.round(s.netIncome) },
      { key: "Deducción Administración Central (40%)", fn: (s: any) => Math.round(s.deductionCentral) },
      { key: "Deducción Investigación (5%)", fn: (s: any) => Math.round(s.deductionResearch) },
      { key: "Deducción MESI (0.5%)", fn: (s: any) => Math.round(s.deductionMesi) },
      { key: "TOTAL DEDUCCIÓN INSTITUCIONAL (COP)", fn: (s: any) => Math.round(s.totalDeductions) },
      { key: "Ingreso Matrículas para Funcionamiento (COP)", fn: (s: any) => Math.round(s.functioningTuitionIncome) },
      { key: "Otros Ingresos (Inscripciones, Grados, etc.) (COP)", fn: (s: any) => Math.round(s.totalOtherIncome) },
      { key: "INGRESOS TOTALES FUNCIONAMIENTO (COP)", fn: (s: any) => Math.round(s.totalFunctioningIncome) },
      { key: "Gastos de Docentes Cátedra (COP)", fn: (s: any) => Math.round(s.teachersCost) },
      { key: "Gastos Coordinador de Programa (COP)", fn: (s: any) => Math.round(s.coordinatorCost) },
      { key: "Gastos Coordinador de Prácticas (COP)", fn: (s: any) => Math.round(s.practicesCost) },
      { key: "Personal de Apoyo CPS (COP)", fn: (s: any) => Math.round(s.supportStaffCost) },
      { key: "TOTAL GASTOS DE PERSONAL (COP)", fn: (s: any) => Math.round(s.totalStaffCosts) },
      { key: "Adquisición de Bienes y Servicios (COP)", fn: (s: any) => Math.round(s.operatingGoodsAndServices) },
      { key: "TOTAL GASTOS DE FUNCIONAMIENTO (COP)", fn: (s: any) => Math.round(s.totalExpenses) },
      { key: "BALANCE PRESUPUESTAL (Punto de Equilibrio)", fn: (s: any) => Math.round(s.budgetBalance) }
    ];

    rows.forEach(r => {
      csv += `${r.key};` + calculatedSemesters.map(s => r.fn(s)).join(";") + "\n";
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `Costeo_Programa_${programName.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Header and Brand */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-6">
        <div>
          <div className="flex items-center gap-2 text-[#ffcc29] text-xs font-mono uppercase tracking-wider mb-1">
            <BookOpen size={14} />
            <span>Planificación y Costeo de Posgrados</span>
          </div>
          <h1 className="text-3xl font-display font-bold text-white tracking-tight">
            Costeo de Programa Académico
          </h1>
          <p className="text-sm text-on-surface-variant max-w-2xl font-sans mt-1">
            Estudio de viabilidad y punto de equilibrio financiero semestre a semestre. Homologado al régimen público de contabilidad pública de la UPTC.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button 
            onClick={handleExportCSV} 
            className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-xl text-xs font-semibold font-sans transition-all cursor-pointer"
          >
            <Download size={14} className="text-[#ffcc29]" /> Exportar CSV
          </button>
          <button 
            onClick={() => window.print()} 
            className="flex items-center gap-2 px-4 py-2.5 bg-[#ffcc29] hover:bg-[#ffcc29]/90 text-black rounded-xl text-xs font-bold font-sans transition-all cursor-pointer"
          >
            Imprimir Reporte (PDF)
          </button>
        </div>
      </div>

      {/* Preset Selectors */}
      <div className="glass-card rounded-2xl border border-white/10 p-5 bg-white/5">
        <div className="flex items-center gap-2 mb-4">
          <Layers size={16} className="text-[#ffcc29]" />
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">Presets de Simulación de Programas</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {PROGRAM_PRESETS.map((preset, index) => (
            <button
              key={index}
              onClick={() => handleApplyPreset(preset)}
              className={`p-4 text-left rounded-xl border transition-all flex flex-col justify-between h-28 cursor-pointer ${
                programName === preset.name 
                  ? 'border-[#ffcc29] bg-[#ffcc29]/5' 
                  : 'border-white/10 bg-white/5 hover:bg-white/10'
              }`}
            >
              <div>
                <span className="text-[9px] font-bold font-mono px-1.5 py-0.5 bg-white/10 rounded text-on-surface-variant uppercase tracking-wider">
                  {preset.type.replace('_', ' ')}
                </span>
                <h3 className="text-xs font-bold text-white mt-2 line-clamp-2">{preset.name}</h3>
              </div>
              <div className="flex justify-between items-center text-[10px] text-white/50 font-mono mt-2">
                <span>Tuition: {preset.tuitionSMMLV} SMMLV</span>
                <span className="text-[#ffcc29]">Aplicar</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Program Config Cards & Executive KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Basic Config */}
        <div className="lg:col-span-1 glass-card rounded-2xl border border-white/10 p-6 bg-white/5 space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-white/5 pb-3">
            Configuración del Programa
          </h2>
          
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-mono text-on-surface-variant uppercase tracking-wider mb-1.5">Nombre del Programa</label>
              <input 
                type="text" 
                value={programName} 
                onChange={(e) => setProgramName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-[#ffcc29] focus:outline-none"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-mono text-on-surface-variant uppercase tracking-wider mb-1.5">Tipo de Posgrado</label>
                <select 
                  value={programType} 
                  onChange={(e) => setProgramType(e.target.value as any)}
                  className="w-full bg-[#0f172a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-[#ffcc29] focus:outline-none font-sans"
                >
                  <option value="especializacion">Especialización</option>
                  <option value="maestria_prof">Maestría (Profund.)</option>
                  <option value="maestria_inv">Maestría (Investig.)</option>
                  <option value="doctorado">Doctorado</option>
                </select>
              </div>
              
              <div>
                <label className="block text-[10px] font-mono text-on-surface-variant uppercase tracking-wider mb-1.5">Facultad</label>
                <input 
                  type="text" 
                  value={selectedFaculty} 
                  onChange={(e) => setSelectedFaculty(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-[#ffcc29] focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-mono text-on-surface-variant uppercase tracking-wider mb-1.5">Costo Matrícula (SMMLV)</label>
                <div className="relative">
                  <input 
                    type="number" 
                    step="0.5"
                    value={tuitionSMMLV} 
                    onChange={(e) => setTuitionSMMLV(parseFloat(e.target.value) || 0)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-3 pr-8 py-2 text-xs text-white focus:border-[#ffcc29] focus:outline-none font-mono font-bold"
                  />
                  <span className="absolute right-3 top-2.5 text-[9px] font-mono text-white/40">salarios</span>
                </div>
              </div>
              
              <div>
                <label className="block text-[10px] font-mono text-on-surface-variant uppercase tracking-wider mb-1.5">Tasa Deserción (%)</label>
                <div className="relative">
                  <input 
                    type="number" 
                    step="1"
                    min="0"
                    max="100"
                    value={attritionPct} 
                    onChange={(e) => setAttritionPct(parseInt(e.target.value) || 0)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-3 pr-8 py-2 text-xs text-white focus:border-[#ffcc29] focus:outline-none font-mono font-bold text-red-400"
                  />
                  <span className="absolute right-3 top-2.5 text-[9px] font-mono text-white/40">%</span>
                </div>
              </div>
            </div>

            <div className="border-t border-white/5 pt-3 mt-3 space-y-3">
              <h3 className="text-[11px] font-bold text-[#ffcc29] uppercase tracking-wider">Parámetros Financieros</h3>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-mono text-on-surface-variant uppercase tracking-wider mb-1">SMMLV Base 2026</label>
                  <input 
                    type="number" 
                    value={baseSMMLV2026} 
                    onChange={(e) => setBaseSMMLV2026(parseInt(e.target.value) || 0)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:border-[#ffcc29] focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-mono text-on-surface-variant uppercase tracking-wider mb-1">IPC / Alza Anual (%)</label>
                  <input 
                    type="number" 
                    step="0.5"
                    value={annualWageIncreasePct} 
                    onChange={(e) => setAnnualWageIncreasePct(parseFloat(e.target.value) || 0)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:border-[#ffcc29] focus:outline-none font-mono"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-[9px] font-mono text-on-surface-variant uppercase tracking-wider mb-1">Carga Prestacional / Parafiscales (%)</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={parafiscalFactor} 
                  onChange={(e) => setParafiscalFactor(parseFloat(e.target.value) || 0)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:border-[#ffcc29] focus:outline-none font-mono"
                />
                <p className="text-[9px] text-white/40 mt-1 font-mono">Factor del 37.03% cargado a la hora cátedra docente.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Executive KPIs & Point of Equilibrium Status */}
        <div className="lg:col-span-2 flex flex-col justify-between gap-6">
          
          {/* Top Equilibrium Banner */}
          <div className={`p-6 rounded-2xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all duration-300 ${
            aggregatedTotals.isBalanced 
              ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400' 
              : 'border-rose-500/30 bg-rose-500/5 text-rose-400'
          }`}>
            <div>
              <div className="flex items-center gap-2">
                {aggregatedTotals.isBalanced ? (
                  <ShieldCheck className="text-emerald-400 animate-pulse" size={24} />
                ) : (
                  <AlertTriangle className="text-rose-400 animate-bounce" size={24} />
                )}
                <h2 className="text-xl font-display font-bold text-white tracking-tight">
                  {aggregatedTotals.isBalanced ? "Punto de Equilibrio Logrado" : "Déficit Presupuestal"}
                </h2>
              </div>
              <p className="text-xs text-on-surface-variant font-sans mt-1 max-w-md leading-relaxed">
                {aggregatedTotals.isBalanced 
                  ? "Excelente. El programa genera ingresos de funcionamiento superiores a la nómina y compras de bienes en todos los semestres de la cohorte." 
                  : "Atención. El programa posee egresos acumulados superiores a sus ingresos netos de funcionamiento en uno o más periodos semestrales."
                }
              </p>
            </div>
            
            <div className="text-right">
              <span className="text-[10px] font-mono uppercase tracking-wider text-on-surface-variant">Balance Acumulado Total</span>
              <p className={`text-2xl font-display font-bold font-mono mt-0.5 ${aggregatedTotals.totalBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {aggregatedTotals.totalBalance >= 0 ? '+' : ''}
                {(aggregatedTotals.totalBalance / 1e6).toFixed(2)} M COP
              </p>
            </div>
          </div>

          {/* Metric grids */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            
            <div className="glass-card rounded-2xl border border-white/10 p-5 bg-white/5 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider">Ingreso Bruto</span>
                <p className="text-xl font-display font-bold text-white mt-1.5 font-mono">
                  {(aggregatedTotals.totalGrossIncome / 1e6).toFixed(2)} M
                </p>
              </div>
              <span className="text-[9px] text-white/40 font-mono mt-3">Matrículas brutas</span>
            </div>

            <div className="glass-card rounded-2xl border border-white/10 p-5 bg-white/5 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider">Deducción UPTC</span>
                <p className="text-xl font-display font-bold text-[#ffcc29] mt-1.5 font-mono">
                  -{(aggregatedTotals.totalDeductions / 1e6).toFixed(2)} M
                </p>
              </div>
              <span className="text-[9px] text-[#ffcc29]/50 font-mono mt-3">45.5% retención</span>
            </div>

            <div className="glass-card rounded-2xl border border-white/10 p-5 bg-white/5 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider">Gasto Personal</span>
                <p className="text-xl font-display font-bold text-white mt-1.5 font-mono">
                  {(aggregatedTotals.totalStaffCosts / 1e6).toFixed(2)} M
                </p>
              </div>
              <span className="text-[9px] text-white/40 font-mono mt-3">
                {((aggregatedTotals.totalStaffCosts / (aggregatedTotals.totalExpenses || 1)) * 100).toFixed(1)}% del gasto
              </span>
            </div>

            <div className="glass-card rounded-2xl border border-white/10 p-5 bg-white/5 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider">Funcionamiento Neto</span>
                <p className="text-xl font-display font-bold text-[#4ade80] mt-1.5 font-mono">
                  {(aggregatedTotals.totalFunctioningIncome / 1e6).toFixed(2)} M
                </p>
              </div>
              <span className="text-[9px] text-[#4ade80]/50 font-mono mt-3">Disponible final</span>
            </div>

          </div>

          {/* Quick recommendations */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4.5 flex gap-3.5 items-start">
            <Info size={16} className="text-[#ffcc29] mt-0.5 shrink-0" />
            <div className="text-xs text-white/80 font-sans leading-relaxed">
              <span className="font-bold text-white">Observación analítica:</span> El docente hora cátedra de {programType.replace('_', ' ')} percibe un valor de hora base de <span className="font-bold text-[#ffcc29] font-mono">{Math.round(degreeHourMultipliers[programType] * getSMMLVForSemester("2026-1")).toLocaleString()} COP</span> en 2026. Con factor prestacional de parafiscales, el coste real cargado al presupuesto es de <span className="font-bold text-[#4ade80] font-mono">{Math.round(calculatedSemesters[0].loadedTeachingHourCost).toLocaleString()} COP</span>. Asegure de optimizar las horas dictadas para sostener la viabilidad.
            </div>
          </div>

        </div>

      </div>

      {/* Main Tab Switcher */}
      <div className="flex border-b border-white/10 gap-2 overflow-x-auto pb-px">
        {[
          { id: 'results', label: 'Dashboard & Gráficos', icon: Activity },
          { id: 'inputs', label: '1. Ingresos y Matrícula', icon: Users },
          { id: 'costs', label: '2. Gastos Docentes y Compras', icon: Wallet }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveSubTab(t.id as any)}
            className={`flex items-center gap-2 px-5 py-3.5 border-b-2 font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
              activeSubTab === t.id 
                ? 'border-[#ffcc29] text-[#ffcc29]' 
                : 'border-transparent text-white/50 hover:text-white'
            }`}
          >
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      {/* TAB CONTENT: dashboard and graphs */}
      {activeSubTab === 'results' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          
          {/* Charts section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Chart: Income vs Expenses */}
            <div className="lg:col-span-2 glass-card rounded-2xl border border-white/10 p-5 bg-white/5">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Ingresos de Funcionamiento vs Gastos Totales</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" fontSize={10} fontClassName="font-mono" />
                    <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} fontClassName="font-mono" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#09090b', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}
                      labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                    />
                    <Legend verticalAlign="top" height={36} iconSize={12} iconType="circle" wrapperStyle={{ fontSize: '11px', color: '#fff' }} />
                    <Bar dataKey="Ingresos Funcionamiento" fill="#4ade80" name="Ingresos (Disp.)" radius={[4, 4, 0, 0]} barSize={20} />
                    <Bar dataKey="Gastos Totales" fill="#f43f5e" name="Egresos Totales" radius={[4, 4, 0, 0]} barSize={20} />
                    <Line type="monotone" dataKey="Balance Presupuestal" stroke="#ffcc29" strokeWidth={2.5} name="Balance Neto" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart: Expenses structure */}
            <div className="lg:col-span-1 glass-card rounded-2xl border border-white/10 p-5 bg-white/5 flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Estructura Financiera del Programa</h3>
                <div className="h-60 relative flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expenseDistributionChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        <Cell fill="#ffcc29" />
                        <Cell fill="#3b82f6" />
                        <Cell fill="#a78bfa" />
                      </Pie>
                      <Tooltip 
                        formatter={(val: number) => `${Math.round(val / 1e6).toLocaleString()} M COP`}
                        contentStyle={{ backgroundColor: '#09090b', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  
                  {/* Absolute balance inside donut */}
                  <div className="absolute text-center">
                    <span className="text-[9px] uppercase tracking-wider text-white/40 font-mono">Egresos Est.</span>
                    <p className="text-lg font-bold text-white font-mono">
                      {Math.round(aggregatedTotals.totalExpenses / 1e6)}M
                    </p>
                  </div>
                </div>
              </div>

              {/* Legends */}
              <div className="space-y-2 border-t border-white/5 pt-4 text-xs font-sans">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#ffcc29]"></div>
                    <span className="text-white/60">Gastos Personal</span>
                  </div>
                  <span className="font-mono text-white font-bold">{Math.round(aggregatedTotals.totalStaffCosts / 1e6)}M</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#3b82f6]"></div>
                    <span className="text-white/60">Gastos Adquisición</span>
                  </div>
                  <span className="font-mono text-white font-bold">{Math.round(aggregatedTotals.totalOperatingCosts / 1e6)}M</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#a78bfa]"></div>
                    <span className="text-white/60">Deducción UPTC</span>
                  </div>
                  <span className="font-mono text-white font-bold">{Math.round(aggregatedTotals.totalDeductions / 1e6)}M</span>
                </div>
              </div>

            </div>

          </div>

          {/* Matrix sheet table */}
          <div className="glass-card rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
            <div className="p-5 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <Compass className="text-[#ffcc29]" size={16} />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Matriz Presupuestal Detallada del Posgrado (Millones COP)</h3>
              </div>
              <span className="text-[10px] text-white/55 font-mono">Semestres Proyectados</span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans border-collapse">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5 text-white font-bold">
                    <th className="p-4 w-60">Fila / Concepto Presupuestal</th>
                    {calculatedSemesters.map(s => (
                      <th key={s.semesterLabel} className="p-4 text-right font-mono">{s.semesterLabel}</th>
                    ))}
                    <th className="p-4 text-right font-mono text-[#ffcc29]">Total Cohorte</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-white/80">
                  
                  {/* Students counts */}
                  <tr className="hover:bg-white/[0.02]">
                    <td className="p-4 font-semibold text-white">Nuevos Estudiantes / Cohorte</td>
                    {calculatedSemesters.map(s => (
                      <td key={s.semesterLabel} className="p-4 text-right font-mono font-bold text-emerald-400">{s.newCohortStudents}</td>
                    ))}
                    <td className="p-4 text-right font-mono text-emerald-400 font-bold">
                      {calculatedSemesters.reduce((sum, s) => sum + s.newCohortStudents, 0)}
                    </td>
                  </tr>
                  
                  <tr className="hover:bg-white/[0.02]">
                    <td className="p-4">Estudiantes Activos Totales (Con deserción)</td>
                    {calculatedSemesters.map(s => (
                      <td key={s.semesterLabel} className="p-4 text-right font-mono">{s.activeStudents.toFixed(1)}</td>
                    ))}
                    <td className="p-4 text-right font-mono">-</td>
                  </tr>

                  <tr className="hover:bg-white/[0.02] border-b border-white/10 bg-white/[0.01]">
                    <td className="p-4">Valor Matrícula Vigente</td>
                    {calculatedSemesters.map(s => (
                      <td key={s.semesterLabel} className="p-4 text-right font-mono text-white/60">{(s.tuitionValue / 1e6).toFixed(2)} M</td>
                    ))}
                    <td className="p-4 text-right font-mono">-</td>
                  </tr>

                  {/* INCOMES ROWS */}
                  <tr className="hover:bg-white/[0.02]">
                    <td className="p-4 font-bold text-white">0. INGRESO BRUTO DE MATRÍCULAS</td>
                    {calculatedSemesters.map(s => (
                      <td key={s.semesterLabel} className="p-4 text-right font-mono">{(s.grossIncome / 1e6).toFixed(2)}</td>
                    ))}
                    <td className="p-4 text-right font-mono font-bold">{(aggregatedTotals.totalGrossIncome / 1e6).toFixed(2)}</td>
                  </tr>

                  <tr className="hover:bg-white/[0.02]">
                    <td className="p-4 text-rose-300">0.1 Descuentos Aplicados</td>
                    {calculatedSemesters.map(s => (
                      <td key={s.semesterLabel} className="p-4 text-right font-mono text-rose-300">-{(s.totalDiscounts / 1e6).toFixed(2)}</td>
                    ))}
                    <td className="p-4 text-right font-mono text-rose-300">-{(aggregatedTotals.totalDiscounts / 1e6).toFixed(2)}</td>
                  </tr>

                  <tr className="hover:bg-white/[0.02] font-semibold bg-white/[0.01]">
                    <td className="p-4 text-white">1. INGRESO NETO MATRÍCULAS</td>
                    {calculatedSemesters.map(s => (
                      <td key={s.semesterLabel} className="p-4 text-right font-mono">{(s.netIncome / 1e6).toFixed(2)}</td>
                    ))}
                    <td className="p-4 text-right font-mono">{(aggregatedTotals.totalNetIncome / 1e6).toFixed(2)}</td>
                  </tr>

                  <tr className="hover:bg-white/[0.02] text-xs text-white/50">
                    <td className="p-4 pl-8">Deducción Ley UPTC (45.5% Retención)</td>
                    {calculatedSemesters.map(s => (
                      <td key={s.semesterLabel} className="p-4 text-right font-mono">-{(s.totalDeductions / 1e6).toFixed(2)}</td>
                    ))}
                    <td className="p-4 text-right font-mono">-{(aggregatedTotals.totalDeductions / 1e6).toFixed(2)}</td>
                  </tr>

                  <tr className="hover:bg-white/[0.02] font-semibold">
                    <td className="p-4 text-white pl-6">II. Ingreso Matrículas Neto Funcionamiento</td>
                    {calculatedSemesters.map(s => (
                      <td key={s.semesterLabel} className="p-4 text-right font-mono text-[#4ade80]">{(s.functioningTuitionIncome / 1e6).toFixed(2)}</td>
                    ))}
                    <td className="p-4 text-right font-mono text-[#4ade80]">{( (aggregatedTotals.totalNetIncome - aggregatedTotals.totalDeductions) / 1e6).toFixed(2)}</td>
                  </tr>

                  <tr className="hover:bg-white/[0.02]">
                    <td className="p-4 text-white/70">III. Inscripciones, Grados y Otros Ingresos</td>
                    {calculatedSemesters.map(s => (
                      <td key={s.semesterLabel} className="p-4 text-right font-mono text-white/60">{(s.totalOtherIncome / 1e6).toFixed(2)}</td>
                    ))}
                    <td className="p-4 text-right font-mono">
                      {(calculatedSemesters.reduce((sum, s) => sum + s.totalOtherIncome, 0) / 1e6).toFixed(2)}
                    </td>
                  </tr>

                  <tr className="hover:bg-white/[0.02] font-bold bg-[#4ade80]/5 text-[#4ade80]">
                    <td className="p-4">TOTAL DISPONIBLE FUNCIONAMIENTO</td>
                    {calculatedSemesters.map(s => (
                      <td key={s.semesterLabel} className="p-4 text-right font-mono">{(s.totalFunctioningIncome / 1e6).toFixed(2)}</td>
                    ))}
                    <td className="p-4 text-right font-mono font-bold">{(aggregatedTotals.totalFunctioningIncome / 1e6).toFixed(2)}</td>
                  </tr>

                  {/* EXPENSES ROWS */}
                  <tr className="hover:bg-white/[0.02] font-semibold text-white">
                    <td className="p-4">2. GASTOS DE PERSONAL</td>
                    {calculatedSemesters.map(s => (
                      <td key={s.semesterLabel} className="p-4 text-right font-mono text-[#ff5555]">{(s.totalStaffCosts / 1e6).toFixed(2)}</td>
                    ))}
                    <td className="p-4 text-right font-mono text-[#ff5555]">{(aggregatedTotals.totalStaffCosts / 1e6).toFixed(2)}</td>
                  </tr>

                  <tr className="hover:bg-white/[0.02] text-[11px] text-white/50">
                    <td className="p-4 pl-8">- Docentes hora cátedra cargados</td>
                    {calculatedSemesters.map(s => (
                      <td key={s.semesterLabel} className="p-4 text-right font-mono">{(s.teachersCost / 1e6).toFixed(2)}</td>
                    ))}
                    <td className="p-4 text-right font-mono">
                      {(calculatedSemesters.reduce((sum, s) => sum + s.teachersCost, 0) / 1e6).toFixed(2)}
                    </td>
                  </tr>

                  <tr className="hover:bg-white/[0.02] text-[11px] text-white/50">
                    <td className="p-4 pl-8">- Coordinadores de programa / prácticas</td>
                    {calculatedSemesters.map(s => (
                      <td key={s.semesterLabel} className="p-4 text-right font-mono">{((s.coordinatorCost + s.practicesCost) / 1e6).toFixed(2)}</td>
                    ))}
                    <td className="p-4 text-right font-mono font-bold">
                      {((calculatedSemesters.reduce((sum, s) => sum + s.coordinatorCost + s.practicesCost, 0)) / 1e6).toFixed(2)}
                    </td>
                  </tr>

                  <tr className="hover:bg-white/[0.02] text-[11px] text-white/50 border-b border-white/5">
                    <td className="p-4 pl-8">- Personal de apoyo CPS</td>
                    {calculatedSemesters.map(s => (
                      <td key={s.semesterLabel} className="p-4 text-right font-mono">{(s.supportStaffCost / 1e6).toFixed(2)}</td>
                    ))}
                    <td className="p-4 text-right font-mono">
                      {(calculatedSemesters.reduce((sum, s) => sum + s.supportStaffCost, 0) / 1e6).toFixed(2)}
                    </td>
                  </tr>

                  <tr className="hover:bg-white/[0.02] font-semibold">
                    <td className="p-4 text-white">3. GASTOS DE ADQUISICIÓN (BIENES/SERV)</td>
                    {calculatedSemesters.map(s => (
                      <td key={s.semesterLabel} className="p-4 text-right font-mono text-[#ff5555]">{(s.operatingGoodsAndServices / 1e6).toFixed(2)}</td>
                    ))}
                    <td className="p-4 text-right font-mono text-[#ff5555]">{(aggregatedTotals.totalOperatingCosts / 1e6).toFixed(2)}</td>
                  </tr>

                  <tr className="hover:bg-white/[0.02] font-bold bg-[#ff5555]/5 text-red-400">
                    <td className="p-4">TOTAL COSTOS Y EGRESOS</td>
                    {calculatedSemesters.map(s => (
                      <td key={s.semesterLabel} className="p-4 text-right font-mono font-bold">{(s.totalExpenses / 1e6).toFixed(2)}</td>
                    ))}
                    <td className="p-4 text-right font-mono font-bold">{(aggregatedTotals.totalExpenses / 1e6).toFixed(2)}</td>
                  </tr>

                  {/* BALANCE ROW */}
                  <tr className="hover:bg-white/[0.02] font-bold bg-white/5 text-white">
                    <td className="p-4 font-mono font-bold">BALANCE PRESUPUESTAL NETO</td>
                    {calculatedSemesters.map(s => (
                      <td key={s.semesterLabel} className={`p-4 text-right font-mono font-bold text-[13px] ${s.budgetBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {s.budgetBalance >= 0 ? '+' : ''}
                        {(s.budgetBalance / 1e6).toFixed(2)}M
                      </td>
                    ))}
                    <td className={`p-4 text-right font-mono font-bold text-[14px] ${aggregatedTotals.totalBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {aggregatedTotals.totalBalance >= 0 ? '+' : ''}
                      {(aggregatedTotals.totalBalance / 1e6).toFixed(2)}M
                    </td>
                  </tr>

                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* TAB CONTENT: 1. Incomes & Tuition */}
      {activeSubTab === 'inputs' && (
        <div className="glass-card rounded-2xl border border-white/10 p-6 bg-white/5 space-y-6">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <Users size={16} className="text-[#ffcc29]" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Matrículas, Descuentos e Ingresos por Semestre</h2>
          </div>

          <div className="space-y-6">
            {semesters.map((sem, index) => (
              <div key={index} className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-white/5 pb-2">
                  <span className="text-sm font-bold text-white font-mono flex items-center gap-2">
                    <span className="w-2.5 h-2.5 bg-[#ffcc29] rounded-full"></span> Semestre {sem.semesterLabel}
                  </span>
                  
                  <div className="flex gap-4 text-[11px] font-mono text-white/50">
                    <span>SMMLV Proyectado: <strong className="text-white">${Math.round(getSMMLVForSemester(sem.semesterLabel)).toLocaleString()}</strong></span>
                    <span>Estudiantes Activos: <strong className="text-[#4ade80]">{calculatedSemesters[index].activeStudents.toFixed(1)}</strong></span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  
                  {/* Students entering & Application info */}
                  <div className="space-y-3 bg-white/5 p-4 rounded-xl">
                    <h4 className="text-[10px] font-bold text-[#ffcc29] uppercase tracking-wider mb-2">Ingresos Nuevos y Aspirantes</h4>
                    
                    <div>
                      <label className="block text-[9px] font-mono text-white/60 mb-1">Nuevos Estudiantes Cohorte</label>
                      <input 
                        type="number"
                        min="0"
                        value={sem.newCohortStudents}
                        onChange={(e) => handleUpdateSemester(index, { newCohortStudents: parseInt(e.target.value) || 0 })}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] font-mono text-white/60 mb-1">Inscritos (Aspirantes)</label>
                      <input 
                        type="number"
                        min="0"
                        value={sem.aspirantesCount}
                        onChange={(e) => handleUpdateSemester(index, { aspirantesCount: parseInt(e.target.value) || 0 })}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white font-mono"
                      />
                    </div>
                  </div>

                  {/* Discounts input */}
                  <div className="md:col-span-2 space-y-3 bg-white/5 p-4 rounded-xl">
                    <h4 className="text-[10px] font-bold text-[#ffcc29] uppercase tracking-wider mb-2">Cantidad de Alumnos con Descuento</h4>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] font-mono text-white/60 mb-1">Votación (10%)</label>
                        <input 
                          type="number"
                          min="0"
                          value={sem.votacionDiscountCount}
                          onChange={(e) => handleUpdateSemester(index, { votacionDiscountCount: parseInt(e.target.value) || 0 })}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] font-mono text-white/60 mb-1">Monitoría (70%)</label>
                        <input 
                          type="number"
                          min="0"
                          value={sem.monitoriaDiscountCount}
                          onChange={(e) => handleUpdateSemester(index, { monitoriaDiscountCount: parseInt(e.target.value) || 0 })}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] font-mono text-white/60 mb-1">Grado Honor (100%)</label>
                        <input 
                          type="number"
                          min="0"
                          value={sem.honorDiscountCount}
                          onChange={(e) => handleUpdateSemester(index, { honorDiscountCount: parseInt(e.target.value) || 0 })}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] font-mono text-white/60 mb-1">Resol. 16/2009 (50%)</label>
                        <input 
                          type="number"
                          min="0"
                          value={sem.res16DiscountCount}
                          onChange={(e) => handleUpdateSemester(index, { res16DiscountCount: parseInt(e.target.value) || 0 })}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Graduands and other raw income */}
                  <div className="space-y-3 bg-white/5 p-4 rounded-xl">
                    <h4 className="text-[10px] font-bold text-[#ffcc29] uppercase tracking-wider mb-2">Graduación y Otros</h4>
                    
                    <div>
                      <label className="block text-[9px] font-mono text-white/60 mb-1">Graduandos (Semestre)</label>
                      <input 
                        type="number"
                        min="0"
                        value={sem.graduandosCount}
                        onChange={(e) => handleUpdateSemester(index, { graduandosCount: parseInt(e.target.value) || 0 })}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] font-mono text-white/60 mb-1">Otros Ingresos (COP)</label>
                      <input 
                        type="number"
                        min="0"
                        value={sem.otherRawIncome}
                        onChange={(e) => handleUpdateSemester(index, { otherRawIncome: parseInt(e.target.value) || 0 })}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white font-mono text-[#4ade80]"
                      />
                    </div>
                  </div>

                </div>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* TAB CONTENT: 2. Staff and Operating Costs */}
      {activeSubTab === 'costs' && (
        <div className="glass-card rounded-2xl border border-white/10 p-6 bg-white/5 space-y-6">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <Wallet size={16} className="text-[#ffcc29]" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Carga Académica, Coordinación y Funcionamiento</h2>
          </div>

          <div className="space-y-6">
            {semesters.map((sem, index) => (
              <div key={index} className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-white/5 pb-2">
                  <span className="text-sm font-bold text-white font-mono flex items-center gap-2">
                    <span className="w-2.5 h-2.5 bg-red-400 rounded-full"></span> Semestre {sem.semesterLabel}
                  </span>
                  
                  <div className="flex gap-4 text-[11px] font-mono text-white/50">
                    <span>Costo Cátedra Cargado (Hora): <strong className="text-red-400">${Math.round(calculatedSemesters[index].loadedTeachingHourCost).toLocaleString()} COP</strong></span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  
                  {/* Teaching Hours */}
                  <div className="space-y-3 bg-white/5 p-4 rounded-xl">
                    <h4 className="text-[10px] font-bold text-[#ffcc29] uppercase tracking-wider mb-2">Docencia Hora Cátedra</h4>
                    
                    <div>
                      <label className="block text-[9px] font-mono text-white/60 mb-1">Horas Dictadas en Semestre</label>
                      <input 
                        type="number"
                        min="0"
                        value={sem.teachingHours}
                        onChange={(e) => handleUpdateSemester(index, { teachingHours: parseInt(e.target.value) || 0 })}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white font-mono"
                      />
                    </div>
                    <span className="text-[9px] text-white/40 block leading-tight">Valor por hora calculado automáticamente sobre el tipo de posgrado ({programType}).</span>
                  </div>

                  {/* Coordinators */}
                  <div className="space-y-3 bg-white/5 p-4 rounded-xl">
                    <h4 className="text-[10px] font-bold text-[#ffcc29] uppercase tracking-wider mb-2">Coordinación Académica</h4>
                    
                    <div>
                      <label className="block text-[9px] font-mono text-white/60 mb-1">Horas Coord. de Programa</label>
                      <input 
                        type="number"
                        min="0"
                        value={sem.coordinatorHours}
                        onChange={(e) => handleUpdateSemester(index, { coordinatorHours: parseInt(e.target.value) || 0 })}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] font-mono text-white/60 mb-1">Horas Coord. de Prácticas</label>
                      <input 
                        type="number"
                        min="0"
                        value={sem.practicesHours}
                        onChange={(e) => handleUpdateSemester(index, { practicesHours: parseInt(e.target.value) || 0 })}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white font-mono"
                      />
                    </div>
                  </div>

                  {/* Support Staff contracting */}
                  <div className="space-y-3 bg-white/5 p-4 rounded-xl">
                    <h4 className="text-[10px] font-bold text-[#ffcc29] uppercase tracking-wider mb-2">Personal de Apoyo (CPS)</h4>
                    
                    <div>
                      <label className="block text-[9px] font-mono text-white/60 mb-1">Valor Contrato Mensual (COP)</label>
                      <input 
                        type="number"
                        min="0"
                        value={sem.supportStaffMonthlyCPS}
                        onChange={(e) => handleUpdateSemester(index, { supportStaffMonthlyCPS: parseInt(e.target.value) || 0 })}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] font-mono text-white/60 mb-1">Meses a Contratar</label>
                      <input 
                        type="number"
                        min="0"
                        value={sem.supportStaffMonths}
                        onChange={(e) => handleUpdateSemester(index, { supportStaffMonths: parseInt(e.target.value) || 0 })}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white font-mono"
                      />
                    </div>
                  </div>

                  {/* Operating Goods and Services */}
                  <div className="space-y-3 bg-white/5 p-4 rounded-xl flex flex-col justify-between">
                    <div>
                      <h4 className="text-[10px] font-bold text-[#ffcc29] uppercase tracking-wider mb-2">Funcionamiento y Adquisición</h4>
                      
                      <div>
                        <label className="block text-[9px] font-mono text-white/60 mb-1">Compras Bienes y Servicios (COP)</label>
                        <input 
                          type="number"
                          min="0"
                          value={sem.operatingGoodsAndServices}
                          onChange={(e) => handleUpdateSemester(index, { operatingGoodsAndServices: parseInt(e.target.value) || 0 })}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white font-mono text-red-300"
                        />
                      </div>
                    </div>
                    <span className="text-[9px] text-white/40 block leading-tight mt-3">Suma de logística, licencias de software, viáticos de invitados, impresiones, etc.</span>
                  </div>

                </div>
              </div>
            ))}
          </div>

        </div>
      )}

    </div>
  );
}
