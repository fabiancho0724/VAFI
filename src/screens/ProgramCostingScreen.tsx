import { useState, useMemo } from 'react';
import { 
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line, ReferenceLine
} from 'recharts';
import { 
  Filter, DollarSign, Activity, TrendingUp, RefreshCw, Compass,
  Layers, Wallet, HelpCircle, AlertTriangle, ShieldCheck, ArrowRight, 
  Download, Search, CheckCircle, Info, Users, GraduationCap, Percent, BookOpen, Settings, Save, Trash2, Printer
} from 'lucide-react';

interface SemesterData {
  semesterLabel: string; // e.g. "2026-1", "2026-2", "2027-1", ...
  newCohortStudents: number; // initial students entering this semester
  votacionDiscountCount: number; // students with voter discount (10%)
  monitoriaDiscountCount: number; // students with monitor discount (70%)
  honorDiscountCount: number; // students with honor discount (100%)
  res16DiscountCount: number; // students with Res 16 discount (50%)
  otherDiscountCount: number; // students with other discount
  otherDiscountPct: number; // other discount percentage
  
  // Other Income
  aspirantesCount: number; // for application fees
  graduandosCount: number; // for graduation fees
  otherRawIncome: number; // other income in COP
  
  // Staff inputs
  numDocentes: number; // number of teachers
  horasDocente: number; // hours per teacher
  coordinatorHours: number; // hours for coordinator
  supportStaffMonthlyCPS: number; // monthly CPS payment
  supportStaffMonths: number; // contract months
  
  // Operating inputs (Purchase of goods/services)
  operatingGoodsAndServices: number; // total goods and services in COP
}

interface SavedScenario {
  id: string;
  name: string;
  level: 'doctorado' | 'maestria' | 'especializacion';
  modality: 'presencial' | 'hibrido' | 'virtual';
  tuitionSMMLV: number;
  attritionPct: number;
  hasCoordinator: boolean;
  hasSupportStaff: boolean;
  semesters: SemesterData[];
  
  // Calculated summaries
  totalIncome: number;
  totalCosts: number;
  utility: number;
  breakEvenCredits: number;
  breakEvenStudents: number;
}

export function ProgramCostingScreen({ onNavigate }: { onNavigate: (s: string) => void }) {
  // Config state
  const [level, setLevel] = useState<'doctorado' | 'maestria' | 'especializacion'>('maestria');
  const [modality, setModality] = useState<'presencial' | 'hibrido' | 'virtual'>('presencial');
  const [tuitionSMMLV, setTuitionSMMLV] = useState<number>(7);
  const [attritionPct, setAttritionPct] = useState<number>(5);
  
  // Staff switches (optional components)
  const [hasCoordinator, setHasCoordinator] = useState<boolean>(true);
  const [hasSupportStaff, setHasSupportStaff] = useState<boolean>(true);

  // Financial base constants
  const [baseSMMLV2026, setBaseSMMLV2026] = useState<number>(1537380); // Base wage 2026
  const [annualWageIncreasePct, setAnnualWageIncreasePct] = useState<number>(8); // 8% annual wage increase
  const [parafiscalFactor, setParafiscalFactor] = useState<number>(37.03); // 37.03% social security
  
  // Hour multipliers based on degree type relative to SMMLV
  const degreeHourMultipliers = {
    especializacion: 0.10,
    maestria: 0.125,
    doctorado: 0.155
  };

  // Administrator manual override controls
  const [isAdminOverride, setIsAdminOverride] = useState<boolean>(false);
  const [customCreditValue, setCustomCreditValue] = useState<number>(650000);

  // 6 semesters labels definition
  const semestersLabels = ["2026-1", "2026-2", "2027-1", "2027-2", "2028-1", "2028-2"];

  // Default semesters state
  const [semesters, setSemesters] = useState<SemesterData[]>(() => {
    // Populate with a standard 3-cohort annual intake scenario
    return semestersLabels.map((label, idx) => {
      // Cohorts enter in odd semesters (2026-1 = 20 students, 2027-1 = 18 students, 2028-1 = 20 students)
      const isStartSemester = idx === 0 || idx === 2 || idx === 4;
      const initialSize = isStartSemester ? (idx === 0 ? 22 : idx === 2 ? 18 : 20) : 0;
      
      return {
        semesterLabel: label,
        newCohortStudents: initialSize,
        votacionDiscountCount: initialSize > 0 ? Math.ceil(initialSize * 0.3) : 0, // 30% have vote cards
        monitoriaDiscountCount: 0,
        honorDiscountCount: 0,
        res16DiscountCount: 0,
        otherDiscountCount: 0,
        otherDiscountPct: 50,
        aspirantesCount: initialSize > 0 ? Math.ceil(initialSize * 1.5) : 0,
        graduandosCount: idx === 3 ? 16 : idx === 5 ? 14 : 0,
        otherRawIncome: 0,
        
        // Staff inputs
        numDocentes: 4, // 4 teachers
        horasDocente: 45, // 45 hours each = 180 total hours
        coordinatorHours: 64, // 64 hours coordinate
        supportStaffMonthlyCPS: 3659400,
        supportStaffMonths: 4,
        
        // Operating inputs
        operatingGoodsAndServices: idx % 2 === 0 ? 12000000 : 9000000
      };
    });
  });

  const [activeSubTab, setActiveSubTab] = useState<'simulator' | 'staff' | 'report'>('simulator');
  const [newScenarioName, setNewScenarioName] = useState<string>("");
  
  // Preset scenarios list
  const [savedScenarios, setSavedScenarios] = useState<SavedScenario[]>([
    {
      id: 'scen_1',
      name: 'Simulación Maestría Esperada (3 Cohortes)',
      level: 'maestria',
      modality: 'presencial',
      tuitionSMMLV: 7,
      attritionPct: 5,
      hasCoordinator: true,
      hasSupportStaff: true,
      semesters: semestersLabels.map((label, idx) => ({
        semesterLabel: label,
        newCohortStudents: idx === 0 ? 20 : idx === 2 ? 18 : idx === 4 ? 20 : 0,
        votacionDiscountCount: idx === 0 ? 6 : idx === 2 ? 5 : idx === 4 ? 6 : 0,
        monitoriaDiscountCount: 0,
        honorDiscountCount: 0,
        res16DiscountCount: 0,
        otherDiscountCount: 0,
        otherDiscountPct: 50,
        aspirantesCount: idx === 0 ? 30 : idx === 2 ? 25 : idx === 4 ? 30 : 0,
        graduandosCount: idx === 3 ? 15 : idx === 5 ? 13 : 0,
        otherRawIncome: 0,
        numDocentes: 4,
        horasDocente: 40,
        coordinatorHours: 64,
        supportStaffMonthlyCPS: 3659400,
        supportStaffMonths: 4,
        operatingGoodsAndServices: 10000000
      })),
      totalIncome: 1215456200,
      totalCosts: 485124000,
      utility: 730332200,
      breakEvenCredits: 12,
      breakEvenStudents: 6
    },
    {
      id: 'scen_2',
      name: 'Especialización Corta (2 Cohortes, Virtual)',
      level: 'especializacion',
      modality: 'virtual',
      tuitionSMMLV: 5,
      attritionPct: 2,
      hasCoordinator: true,
      hasSupportStaff: false, // No support staff needed
      semesters: semestersLabels.map((label, idx) => ({
        semesterLabel: label,
        newCohortStudents: idx === 0 ? 25 : idx === 2 ? 25 : 0,
        votacionDiscountCount: idx === 0 ? 8 : idx === 2 ? 8 : 0,
        monitoriaDiscountCount: 0,
        honorDiscountCount: 0,
        res16DiscountCount: 0,
        otherDiscountCount: 0,
        otherDiscountPct: 50,
        aspirantesCount: idx === 0 ? 40 : idx === 2 ? 40 : 0,
        graduandosCount: idx === 1 ? 22 : idx === 3 ? 23 : 0,
        otherRawIncome: 0,
        numDocentes: 3,
        horasDocente: 36,
        coordinatorHours: 48,
        supportStaffMonthlyCPS: 3659400,
        supportStaffMonths: 0, // Disabled
        operatingGoodsAndServices: 6000000
      })),
      totalIncome: 452900000,
      totalCosts: 215000000,
      utility: 237900000,
      breakEvenCredits: 19,
      breakEvenStudents: 10
    }
  ]);

  // Helper: calculate SMMLV value for a given semester label
  const getSMMLVForSemester = (label: string): number => {
    if (label.startsWith("2026")) return baseSMMLV2026;
    if (label.startsWith("2027")) return baseSMMLV2026 * (1 + annualWageIncreasePct / 100);
    if (label.startsWith("2028")) return baseSMMLV2026 * Math.pow(1 + annualWageIncreasePct / 100, 2);
    return baseSMMLV2026;
  };

  // Base values mapping
  const baseCreditValue = useMemo(() => {
    switch (level) {
      case 'doctorado': return 900000;
      case 'maestria': return 630000;
      case 'especializacion': return 450000;
      default: return 450000;
    }
  }, [level]);

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

  // Validations
  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    if (tuitionSMMLV <= 0) errors.push("El costo de la matrícula en créditos debe ser mayor a 0.");
    if (attritionPct < 0 || attritionPct > 100) errors.push("La tasa de deserción debe estar entre 0% y 100%.");
    if (baseSMMLV2026 <= 0) errors.push("El valor base de SMMLV debe ser mayor a 0.");
    if (annualWageIncreasePct < 0) errors.push("El porcentaje de incremento anual no puede ser negativo.");
    if (parafiscalFactor < 0) errors.push("La carga prestacional no puede ser negativa.");
    if (isAdminOverride && customCreditValue <= 0) errors.push("El valor del crédito personalizado debe ser mayor a 0.");
    
    semesters.forEach((sem, idx) => {
      if (sem.newCohortStudents < 0) errors.push(`[Semestre ${sem.semesterLabel}] El ingreso de estudiantes no puede ser negativo.`);
      if (sem.numDocentes < 0) errors.push(`[Semestre ${sem.semesterLabel}] El número de docentes no puede ser negativo.`);
      if (sem.horasDocente < 0) errors.push(`[Semestre ${sem.semesterLabel}] Las horas de docencia no pueden ser negativas.`);
      if (sem.operatingGoodsAndServices < 0) errors.push(`[Semestre ${sem.semesterLabel}] Las compras de bienes y servicios no pueden ser negativas.`);
    });
    
    return errors;
  }, [semesters, tuitionSMMLV, attritionPct, baseSMMLV2026, annualWageIncreasePct, parafiscalFactor, isAdminOverride, customCreditValue]);

  // Semester calculations with overlapping cohorts
  const calculatedSemesters = useMemo(() => {
    // Cohorte duration based on level type
    const durationSemesters = level === 'especializacion' ? 2 : level === 'doctorado' ? 8 : 4;
    
    // Track active students from each cohort launched in semester i (0 to 5)
    const activeCohortStudents = Array.from({ length: 6 }, () => new Array(6).fill(0));
    
    for (let i = 0; i < 6; i++) {
      const initial = semesters[i].newCohortStudents;
      if (initial > 0) {
        activeCohortStudents[i][i] = initial;
        for (let t = i + 1; t < 6; t++) {
          const age = t - i;
          if (age < durationSemesters) {
            activeCohortStudents[i][t] = activeCohortStudents[i][t - 1] * (1 - attritionPct / 100);
          } else {
            activeCohortStudents[i][t] = 0; // graduated
          }
        }
      }
    }

    return semesters.map((sem, t) => {
      const smmlv = getSMMLVForSemester(sem.semesterLabel);
      const creditRate = finalCreditValue * (smmlv / baseSMMLV2026); // index credit value with inflation/SMMLV rate
      const programCreditsPerSemester = tuitionSMMLV; // credits taken in this semester
      
      // Calculate active student counts in this semester
      let totalActiveStudents = 0;
      for (let i = 0; i <= t; i++) {
        totalActiveStudents += activeCohortStudents[i][t];
      }

      // Gross tuition income: active_students * creditRate * programCreditsPerSemester
      const totalGrossIncome = totalActiveStudents * creditRate * programCreditsPerSemester;

      // Discounts counts capping
      const maxDiscountsStudents = Math.max(0, totalActiveStudents);
      const votCount = Math.min(sem.votacionDiscountCount, maxDiscountsStudents);
      const monCount = Math.min(sem.monitoriaDiscountCount, maxDiscountsStudents - votCount);
      const honCount = Math.min(sem.honorDiscountCount, maxDiscountsStudents - votCount - monCount);
      const resCount = Math.min(sem.res16DiscountCount, maxDiscountsStudents - votCount - monCount - honCount);
      const othCount = Math.min(sem.otherDiscountCount, maxDiscountsStudents - votCount - monCount - honCount - resCount);

      const votDiscountVal = votCount * creditRate * programCreditsPerSemester * 0.10;
      const monDiscountVal = monCount * creditRate * programCreditsPerSemester * 0.70;
      const honDiscountVal = honCount * creditRate * programCreditsPerSemester * 1.00;
      const resDiscountVal = resCount * creditRate * programCreditsPerSemester * 0.50;
      const othDiscountVal = othCount * creditRate * programCreditsPerSemester * (sem.otherDiscountPct / 100);

      const totalDiscounts = votDiscountVal + monDiscountVal + honDiscountVal + resDiscountVal + othDiscountVal;
      const totalNetIncome = totalGrossIncome - totalDiscounts;

      // UPTC Deductions (Administración Central 40%, Investigación 5%, MESI 0.5% = 45.5% Total)
      const deductionCentral = totalNetIncome * 0.40;
      const deductionResearch = totalNetIncome * 0.05;
      const deductionMesi = totalNetIncome * 0.005;
      const totalDeductions = deductionCentral + deductionResearch + deductionMesi;
      
      const functioningTuitionIncome = totalNetIncome - totalDeductions;

      // Other Income (Inscripciones = 0.25 SMMLV, Derechos Grado = 1.0 SMMLV)
      const inscriptionFee = smmlv * 0.25;
      const graduationFee = smmlv * 1.0;
      const applicationIncome = sem.aspirantesCount * inscriptionFee;
      const graduationIncome = sem.graduandosCount * graduationFee;
      const totalOtherIncome = applicationIncome + graduationIncome + sem.otherRawIncome;

      const totalFunctioningIncome = functioningTuitionIncome + totalOtherIncome;

      // Gastos de Personal (Staff Costs)
      // Docentes Hora Catedra
      const teachingHourBaseValue = smmlv * degreeHourMultipliers[level];
      const loadedHourValue = teachingHourBaseValue * (1 + parafiscalFactor / 100);
      const teachersCost = sem.numDocentes * sem.horasDocente * loadedHourValue;

      // Coordinador (indexed with inflation)
      const coordinatorHourRate = 65787.385 * (smmlv / baseSMMLV2026);
      const coordinatorCost = hasCoordinator ? sem.coordinatorHours * coordinatorHourRate : 0;
      
      // Personal de Apoyo CPS
      const supportStaffCPSRate = sem.supportStaffMonthlyCPS * (smmlv / baseSMMLV2026);
      const supportStaffCost = hasSupportStaff ? supportStaffCPSRate * sem.supportStaffMonths : 0;

      const totalStaffCosts = teachersCost + coordinatorCost + supportStaffCost;

      // Operating expenses
      const totalOperatingCosts = sem.operatingGoodsAndServices;

      // Net result
      const totalExpenses = totalStaffCosts + totalOperatingCosts;
      const budgetBalance = totalFunctioningIncome - totalExpenses;

      return {
        ...sem,
        smmlv,
        creditRate,
        activeStudents: totalActiveStudents,
        grossIncome: totalGrossIncome,
        totalDiscounts,
        netIncome: totalNetIncome,
        totalDeductions,
        functioningTuitionIncome,
        applicationIncome,
        graduationIncome,
        totalOtherIncome,
        totalFunctioningIncome,
        teachersCost,
        coordinatorCost,
        supportStaffCost,
        totalStaffCosts,
        totalExpenses,
        budgetBalance,
        loadedHourValue,
        activeCohortStudents: activeCohortStudents.map(cohort => cohort[t])
      };
    });
  }, [semesters, level, tuitionSMMLV, attritionPct, baseSMMLV2026, annualWageIncreasePct, parafiscalFactor, finalCreditValue, hasCoordinator, hasSupportStaff]);

  // Aggregated summaries
  const aggregatedTotals = useMemo(() => {
    let totalGrossIncome = 0;
    let totalDiscounts = 0;
    let totalNetIncome = 0;
    let totalDeductions = 0;
    let totalFunctioningIncome = 0;
    
    let totalTeachersCost = 0;
    let totalCoordinatorCost = 0;
    let totalSupportStaffCost = 0;
    let totalStaffCosts = 0;
    
    let totalOperatingCosts = 0;
    let totalExpenses = 0;
    let totalBalance = 0;
    let hasDeficitInAnySemester = false;
    let totalActiveStudentSemesters = 0;

    calculatedSemesters.forEach(sem => {
      totalGrossIncome += sem.grossIncome;
      totalDiscounts += sem.totalDiscounts;
      totalNetIncome += sem.netIncome;
      totalDeductions += sem.totalDeductions;
      totalFunctioningIncome += sem.totalFunctioningIncome;
      
      totalTeachersCost += sem.teachersCost;
      totalCoordinatorCost += sem.coordinatorCost;
      totalSupportStaffCost += sem.supportStaffCost;
      totalStaffCosts += sem.totalStaffCosts;
      
      totalOperatingCosts += sem.operatingGoodsAndServices;
      totalExpenses += sem.totalExpenses;
      totalBalance += sem.budgetBalance;
      totalActiveStudentSemesters += sem.activeStudents;
      
      if (sem.budgetBalance < 0) {
        hasDeficitInAnySemester = true;
      }
    });

    // Implicit cohorts count
    const numCohortes = semesters.filter(s => s.newCohortStudents > 0).length;

    // Break Even Credits Total
    // Costos Netos Totales a cubrir (descontando otros ingresos)
    const netCostsToCoverTotal = Math.max(0, totalExpenses + totalDeductions - (calculatedSemesters.reduce((sum, s) => sum + s.totalOtherIncome, 0)));
    const averageCreditRate = calculatedSemesters.reduce((sum, s) => sum + s.creditRate, 0) / 6;
    const averageDiscountMultiplier = 1 - discountPct / 100;
    const totalActiveNewStudents = semesters.reduce((sum, s) => sum + s.newCohortStudents, 0);

    // Minimum credits across all active students combined
    const denomCredits = averageCreditRate * averageDiscountMultiplier * totalActiveNewStudents;
    const breakEvenCredits = denomCredits > 0 ? Math.ceil(netCostsToCoverTotal / (averageCreditRate * averageDiscountMultiplier * (totalActiveStudentSemesters / (numCohortes || 1)))) : 0;
    
    // Minimum students with full credit charge to reach break even
    const denomStudents = averageCreditRate * averageDiscountMultiplier * tuitionSMMLV * (totalActiveStudentSemesters / (totalActiveNewStudents || 1));
    const breakEvenStudents = denomStudents > 0 ? Math.ceil(netCostsToCoverTotal / (averageCreditRate * averageDiscountMultiplier * tuitionSMMLV)) : 0;

    return {
      totalGrossIncome,
      totalDiscounts,
      totalNetIncome,
      totalDeductions,
      totalFunctioningIncome,
      totalTeachersCost,
      totalCoordinatorCost,
      totalSupportStaffCost,
      totalStaffCosts,
      totalOperatingCosts,
      totalExpenses,
      totalBalance,
      isBalanced: !hasDeficitInAnySemester,
      numCohortes,
      totalActiveStudentSemesters,
      breakEvenCredits: Math.max(0, breakEvenCredits),
      breakEvenStudents: Math.max(0, breakEvenStudents),
      totalActiveNewStudents
    };
  }, [calculatedSemesters, semesters, discountPct, tuitionSMMLV]);

  // Update semester inputs
  const handleUpdateSemester = (index: number, fields: Partial<SemesterData>) => {
    setSemesters(prev => prev.map((s, i) => i === index ? { ...s, ...fields } : s));
  };

  // Recharts graphics mapping
  const chartData = useMemo(() => {
    return calculatedSemesters.map(sem => ({
      name: sem.semesterLabel,
      'Ingresos Disponibles': Math.round(sem.totalFunctioningIncome / 1e6 * 100) / 100,
      'Gastos Personal': Math.round(sem.totalStaffCosts / 1e6 * 100) / 100,
      'Gastos Funcionamiento': Math.round(sem.operatingGoodsAndServices / 1e6 * 100) / 100,
      'Resultado Semestre': Math.round(sem.budgetBalance / 1e6 * 100) / 100
    }));
  }, [calculatedSemesters]);

  const expensePieChartData = useMemo(() => {
    return [
      { name: 'Gastos Docentes Cátedra', value: aggregatedTotals.totalTeachersCost },
      { name: 'Gastos Coordinación', value: aggregatedTotals.totalCoordinatorCost },
      { name: 'Gastos Apoyo CPS', value: aggregatedTotals.totalSupportStaffCost },
      { name: 'Gastos Adquisición (Bienes)', value: aggregatedTotals.totalOperatingCosts }
    ];
  }, [aggregatedTotals]);

  // Sensitivity Analysis graph data (varies new students per cohort from 5 to 40)
  const sensitivityChartData = useMemo(() => {
    if (validationErrors.length > 0) return [];
    
    // We assume cohort size scales uniformly
    const data = [];
    const step = 5;
    for (let cSize = 5; cSize <= 45; cSize += step) {
      // Recalculate whole cohorte path with cohort size = cSize
      let simulatedFunctioningIncome = 0;
      let simulatedTotalExpenses = 0;
      
      const durationSem = level === 'especializacion' ? 2 : level === 'doctorado' ? 8 : 4;
      const actCohort = Array.from({ length: 6 }, () => new Array(6).fill(0));
      
      for (let i = 0; i < 6; i++) {
        // If the original semester had students > 0, scale it to cSize
        const initial = semesters[i].newCohortStudents > 0 ? cSize : 0;
        if (initial > 0) {
          actCohort[i][i] = initial;
          for (let t = i + 1; t < 6; t++) {
            if (t - i < durationSem) {
              actCohort[i][t] = actCohort[i][t - 1] * (1 - attritionPct / 100);
            }
          }
        }
      }

      calculatedSemesters.forEach((sem, t) => {
        let activeStud = 0;
        let originalStudents = semesters.reduce((sum, s) => sum + s.newCohortStudents, 0);
        
        for (let i = 0; i <= t; i++) {
          activeStud += actCohort[i][t];
        }

        const gross = activeStud * sem.creditRate * tuitionSMMLV;
        // scale discounts proportionally
        const ratio = originalStudents > 0 ? activeStud / (sem.activeStudents || 1) : 1;
        const disc = sem.totalDiscounts * ratio;
        const net = gross - disc;
        const deduct = net * 0.455;
        const funcTuition = net - deduct;
        const totalFunc = funcTuition + sem.totalOtherIncome;
        
        simulatedFunctioningIncome += totalFunc;
        simulatedTotalExpenses += sem.totalExpenses; // fixed staffing / operating costs
      });

      data.push({
        cohortSize: cSize,
        'Ingresos de Operación': Math.round(simulatedFunctioningIncome / 1e6 * 100) / 100,
        'Gastos y Costos': Math.round(simulatedTotalExpenses / 1e6 * 100) / 100,
        'Margen Final (M)': Math.round((simulatedFunctioningIncome - simulatedTotalExpenses) / 1e6 * 100) / 100
      });
    }
    return data;
  }, [semesters, calculatedSemesters, level, attritionPct, tuitionSMMLV, validationErrors]);

  // Scenario management actions
  const handleSaveScenario = () => {
    if (!newScenarioName.trim()) return;
    
    const scenario: SavedScenario = {
      id: Date.now().toString(),
      name: newScenarioName,
      level,
      modality,
      tuitionSMMLV,
      attritionPct,
      hasCoordinator,
      hasSupportStaff,
      semesters: JSON.parse(JSON.stringify(semesters)),
      totalIncome: aggregatedTotals.totalFunctioningIncome,
      totalCosts: aggregatedTotals.totalExpenses,
      utility: aggregatedTotals.totalBalance,
      breakEvenCredits: aggregatedTotals.breakEvenCredits,
      breakEvenStudents: aggregatedTotals.breakEvenStudents
    };

    setSavedScenarios(prev => [scenario, ...prev]);
    setNewScenarioName("");
    setActiveSubTab('report'); // redirect to comparison/report
  };

  const handleLoadScenario = (scen: SavedScenario) => {
    setLevel(scen.level);
    setModality(scen.modality);
    setTuitionSMMLV(scen.tuitionSMMLV);
    setAttritionPct(scen.attritionPct);
    setHasCoordinator(scen.hasCoordinator);
    setHasSupportStaff(scen.hasSupportStaff);
    setSemesters(scen.semesters);
    setActiveSubTab('simulator');
  };

  const handleDeleteScenario = (id: string) => {
    setSavedScenarios(prev => prev.filter(s => s.id !== id));
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 print:space-y-4 print:text-black">
      
      {/* Header (Hidden on Print) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-6 print:hidden">
        <div>
          <div className="flex items-center gap-2 text-[#ffcc29] text-xs font-mono uppercase tracking-wider mb-1">
            <GraduationCap size={14} />
            <span>Planificación y Viabilidad Financiera de Posgrados</span>
          </div>
          <h1 className="text-3xl font-display font-bold text-white tracking-tight">
            Costeo de Posgrados por Créditos
          </h1>
          <p className="text-sm text-on-surface-variant max-w-2xl font-sans mt-1">
            Simulador presupuestal multicohorte homologado a la UPTC. Modifique estudiantes, docentes, coordinaciones y bienes para validar el punto de equilibrio en créditos.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button 
            onClick={handleExportCSV} 
            disabled={validationErrors.length > 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-xl text-xs font-semibold font-sans transition-all cursor-pointer disabled:opacity-50"
          >
            <Download size={14} className="text-[#ffcc29]" /> Exportar Presupuesto
          </button>
          <button 
            onClick={() => window.print()} 
            className="flex items-center gap-2 px-4 py-2.5 bg-[#ffcc29] hover:bg-[#ffcc29]/90 text-black rounded-xl text-xs font-bold font-sans transition-all cursor-pointer"
          >
            <Printer size={14} /> Imprimir Reporte PDF
          </button>
        </div>
      </div>

      {/* Validations errors list */}
      {validationErrors.length > 0 && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex gap-3 text-rose-400 print:hidden">
          <AlertTriangle className="shrink-0 mt-0.5" size={20} />
          <div className="text-xs space-y-1">
            <p className="font-bold">Por favor corrija los siguientes errores de configuración:</p>
            <ul className="list-disc list-inside space-y-0.5 font-mono">
              {validationErrors.map((err, idx) => (
                <li key={idx}>{err}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Top executive summary boxes (Hidden on Print) */}
      {validationErrors.length === 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 print:hidden">
          
          {/* Sostenibilidad / Balance general */}
          <div className={`p-5 rounded-2xl border transition-all duration-300 ${
            aggregatedTotals.isBalanced 
              ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400' 
              : 'border-rose-500/30 bg-rose-500/5 text-rose-400'
          }`}>
            <span className="text-[10px] font-mono uppercase tracking-wider text-white/55">Sostenibilidad Global</span>
            <div className="flex justify-between items-end mt-2">
              <h3 className="text-2xl font-display font-bold font-mono text-white">
                {aggregatedTotals.totalBalance >= 0 ? '+' : ''}{(aggregatedTotals.totalBalance / 1e6).toFixed(2)} M
              </h3>
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                aggregatedTotals.isBalanced ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
              }`}>
                {aggregatedTotals.isBalanced ? 'Equilibrio' : 'Déficit'}
              </span>
            </div>
            <p className="text-[10px] text-on-surface-variant font-sans mt-2">
              {aggregatedTotals.isBalanced 
                ? "El programa posee superávit o equilibrio en todos los semestres proyectados." 
                : "Se detectaron pérdidas en uno o más periodos semestrales."}
            </p>
          </div>

          {/* Break even créditos acumulados */}
          <div className="p-5 rounded-2xl border border-white/10 bg-white/5 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-white/55">Créditos Totales Req.</span>
              <h3 className="text-2xl font-display font-bold font-mono text-[#ffcc29] mt-2">
                {aggregatedTotals.breakEvenCredits} <span className="text-xs text-white/40 font-normal">créditos</span>
              </h3>
            </div>
            <span className="text-[9px] text-white/40 font-mono mt-3">
              Frente a {tuitionSMMLV * aggregatedTotals.totalActiveStudentSemesters} cr. facturados en cohorte.
            </span>
          </div>

          {/* Estudiantes requeridos por cohorte */}
          <div className="p-5 rounded-2xl border border-white/10 bg-white/5 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-white/55">Estudiantes Mínimos</span>
              <h3 className="text-2xl font-display font-bold font-mono text-white mt-2">
                {aggregatedTotals.breakEvenStudents} <span className="text-xs text-white/40 font-normal">estudiantes</span>
              </h3>
            </div>
            <span className="text-[9px] text-white/40 font-mono mt-3">
              Tamaño mínimo de cohorte con carga completa.
            </span>
          </div>

          {/* Resumen de cohortes proyectadas */}
          <div className="p-5 rounded-2xl border border-white/10 bg-white/5 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-white/55">Estructura Proyectada</span>
              <h3 className="text-2xl font-display font-bold font-mono text-white mt-2">
                {aggregatedTotals.numCohortes} <span className="text-xs text-white/40 font-normal">cohortes</span>
              </h3>
            </div>
            <span className="text-[9px] text-white/40 font-mono mt-3">
              {aggregatedTotals.totalActiveNewStudents} alumnos totales matriculados en cohorte.
            </span>
          </div>

        </div>
      )}

      {/* Sub tabs selector (Hidden on Print) */}
      <div className="flex border-b border-white/10 gap-2 overflow-x-auto print:hidden">
        {[
          { id: 'simulator', label: '1. Ingresos y Cohortes', icon: Users },
          { id: 'staff', label: '2. Nómina y Docentes', icon: Wallet },
          { id: 'report', label: '3. Presupuesto y Reportes', icon: Activity }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveSubTab(t.id as any)}
            className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
              activeSubTab === t.id 
                ? 'border-[#ffcc29] text-[#ffcc29]' 
                : 'border-transparent text-white/50 hover:text-white'
            }`}
          >
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      {/* TAB CONTENT: 1. Incomes, Levels and Modalities */}
      {activeSubTab === 'simulator' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:hidden">
          
          {/* Parameters block (Left) */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* General posgrad settings */}
            <div className="glass-card rounded-2xl border border-white/10 p-6 bg-white/5 space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-white/5 pb-2.5">
                Configuración Académica
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-mono text-on-surface-variant uppercase tracking-wider mb-1.5">Nivel del Posgrado</label>
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

                <div>
                  <label className="block text-[10px] font-mono text-on-surface-variant uppercase tracking-wider mb-1.5">Modalidad de Dictado</label>
                  <select 
                    value={modality} 
                    onChange={(e) => setModality(e.target.value as any)}
                    className="w-full bg-[#0f172a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-[#ffcc29] focus:outline-none"
                  >
                    <option value="presencial">Presencial (100% tarifa)</option>
                    <option value="hibrido">Híbrido (85% tarifa)</option>
                    <option value="virtual">Virtual (70% tarifa)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-mono text-on-surface-variant uppercase tracking-wider mb-1.5">Créditos / Semestre</label>
                    <input 
                      type="number" 
                      min="1"
                      value={tuitionSMMLV} 
                      onChange={(e) => setTuitionSMMLV(parseInt(e.target.value) || 0)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-on-surface-variant uppercase tracking-wider mb-1.5">Tasa Deserción (%)</label>
                    <input 
                      type="number" 
                      min="0"
                      max="100"
                      value={attritionPct} 
                      onChange={(e) => setAttritionPct(parseInt(e.target.value) || 0)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono text-rose-400"
                    />
                  </div>
                </div>

                <div className="border-t border-white/5 pt-3 mt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider">Ajustar Valor Crédito (Manual)</span>
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
                    <div className="mt-3 animate-in slide-in-from-top-1 duration-200">
                      <label className="block text-[9px] font-mono text-white/50 mb-1">Valor de Crédito Personalizado (COP)</label>
                      <input 
                        type="number" 
                        step="1000"
                        value={customCreditValue} 
                        onChange={(e) => setCustomCreditValue(parseInt(e.target.value) || 0)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
                      />
                    </div>
                  )}

                  <div className="mt-3 flex justify-between items-center text-xs bg-white/5 p-3 rounded-xl border border-white/5">
                    <span className="text-white/50">Valor Crédito Aplicado:</span>
                    <strong className="text-[#ffcc29] font-mono">${Math.round(finalCreditValue).toLocaleString()} COP</strong>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-on-surface-variant uppercase tracking-wider mb-1.5">Descuentos / Becas (%)</label>
                  <input 
                    type="number" 
                    min="0"
                    max="100"
                    value={discountPct} 
                    onChange={(e) => setDiscountPct(parseInt(e.target.value) || 0)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Macro constants settings */}
            <div className="glass-card rounded-2xl border border-white/10 p-5 bg-white/5 space-y-3">
              <h4 className="text-[10px] font-bold text-white uppercase tracking-wider">Variables Macroeconómicas</h4>
              
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[9px] text-white/55 font-mono mb-1">IPC / Alza Anual %</label>
                  <input 
                    type="number" 
                    step="0.5"
                    value={annualWageIncreasePct} 
                    onChange={(e) => setAnnualWageIncreasePct(parseFloat(e.target.value) || 0)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[9px] text-white/55 font-mono mb-1">Parafiscales %</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={parafiscalFactor} 
                    onChange={(e) => setParafiscalFactor(parseFloat(e.target.value) || 0)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1 text-white font-mono"
                  />
                </div>
              </div>
            </div>

          </div>

          {/* Semesters grid input (Right) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-card rounded-2xl border border-white/10 p-6 bg-white/5 space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-white/5 pb-2">
                Simulación de Estudiantes Nuevos (Cohortes) y Descuentos
              </h3>

              <div className="space-y-4">
                {semesters.map((sem, index) => (
                  <div key={index} className="bg-white/[0.02] border border-white/5 rounded-xl p-4.5 space-y-3.5">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-white/5 pb-1.5">
                      <span className="text-xs font-bold text-white font-mono flex items-center gap-2">
                        <span className="w-2 h-2 bg-[#ffcc29] rounded-full"></span> Periodo Semestral {sem.semesterLabel}
                      </span>
                      <div className="flex gap-3 text-[10px] font-mono text-white/40">
                        <span>Matrícula/Alumno: <strong className="text-white">${Math.round(calculatedSemesters[index].creditRate * tuitionSMMLV).toLocaleString()} COP</strong></span>
                        <span>Activos: <strong className="text-[#4ade80]">{calculatedSemesters[index].activeStudents.toFixed(1)}</strong></span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      
                      {/* Cohort size & application */}
                      <div className="space-y-2.5 bg-white/5 p-3 rounded-lg border border-white/5">
                        <h4 className="text-[9px] font-bold text-[#ffcc29] uppercase tracking-wider">Aforo de Cohorte</h4>
                        <div>
                          <label className="block text-[8px] font-mono text-white/55 mb-0.5">Nuevos Estudiantes Cohorte</label>
                          <input 
                            type="number"
                            min="0"
                            value={sem.newCohortStudents}
                            onChange={(e) => handleUpdateSemester(index, { newCohortStudents: parseInt(e.target.value) || 0 })}
                            className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[8px] font-mono text-white/55 mb-0.5">Inscritos (Aspirantes)</label>
                          <input 
                            type="number"
                            min="0"
                            value={sem.aspirantesCount}
                            onChange={(e) => handleUpdateSemester(index, { aspirantesCount: parseInt(e.target.value) || 0 })}
                            className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white font-mono"
                          />
                        </div>
                      </div>

                      {/* Discounts */}
                      <div className="space-y-2.5 bg-white/5 p-3 rounded-lg border border-white/5">
                        <h4 className="text-[9px] font-bold text-[#ffcc29] uppercase tracking-wider">Descuentos Específicos (Alumnos)</h4>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[8px] font-mono text-white/55 mb-0.5">Votación (10%)</label>
                            <input 
                              type="number"
                              min="0"
                              value={sem.votacionDiscountCount}
                              onChange={(e) => handleUpdateSemester(index, { votacionDiscountCount: parseInt(e.target.value) || 0 })}
                              className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-[8px] font-mono text-white/55 mb-0.5">Monitor (70%)</label>
                            <input 
                              type="number"
                              min="0"
                              value={sem.monitoriaDiscountCount}
                              onChange={(e) => handleUpdateSemester(index, { monitoriaDiscountCount: parseInt(e.target.value) || 0 })}
                              className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white font-mono"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Graduation */}
                      <div className="space-y-2.5 bg-white/5 p-3 rounded-lg border border-white/5 flex flex-col justify-between">
                        <div>
                          <h4 className="text-[9px] font-bold text-[#ffcc29] uppercase tracking-wider mb-1.5">Grado</h4>
                          <div>
                            <label className="block text-[8px] font-mono text-white/55 mb-0.5">Graduandos en Semestre</label>
                            <input 
                              type="number"
                              min="0"
                              value={sem.graduandosCount}
                              onChange={(e) => handleUpdateSemester(index, { graduandosCount: parseInt(e.target.value) || 0 })}
                              className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white font-mono"
                            />
                          </div>
                        </div>
                        <span className="text-[8px] text-white/30 block leading-tight mt-1">Calcula derechos de grado basados en el SMMLV vigente.</span>
                      </div>

                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      )}

      {/* TAB CONTENT: 2. Staffing and Teaching Expenses */}
      {activeSubTab === 'staff' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:hidden">
          
          {/* Toggles panel (Left) */}
          <div className="lg:col-span-1 space-y-6">
            <div className="glass-card rounded-2xl border border-white/10 p-6 bg-white/5 space-y-5">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-white/5 pb-2.5">
                Estructura de Egresos de Personal
              </h3>

              {/* Coordinator switch */}
              <div className="flex items-center justify-between p-3.5 bg-white/5 rounded-xl border border-white/5">
                <div>
                  <h4 className="text-xs font-bold text-white">Coordinador de Programa</h4>
                  <p className="text-[9px] text-white/40 font-sans mt-0.5">Cargar honorarios de dirección.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={hasCoordinator} 
                    onChange={(e) => setHasCoordinator(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#ffcc29]"></div>
                </label>
              </div>

              {/* Support CPS switch */}
              <div className="flex items-center justify-between p-3.5 bg-white/5 rounded-xl border border-white/5">
                <div>
                  <h4 className="text-xs font-bold text-white">Personal de Apoyo (CPS)</h4>
                  <p className="text-[9px] text-white/40 font-sans mt-0.5">Cargar gestor administrativo.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={hasSupportStaff} 
                    onChange={(e) => setHasSupportStaff(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#ffcc29]"></div>
                </label>
              </div>

              <div className="bg-white/5 border border-white/5 p-4 rounded-xl text-xs space-y-2">
                <span className="font-bold text-[#ffcc29] flex items-center gap-1.5 mb-1.5"><Info size={14} /> Fórmulas de Nómina:</span>
                <p className="text-white/70 leading-relaxed text-[11px]">
                  <strong>Docente hora:</strong> Tarifa base ({degreeHourMultipliers[level]} SMMLV) $\times$ (1 + {parafiscalFactor}% Parafiscales).
                </p>
                <p className="text-white/70 leading-relaxed text-[11px]">
                  <strong>Coordinadores:</strong> Horas $\times$ hora base de $\$65.787$ (indexado al salario mínimo).
                </p>
              </div>
            </div>
          </div>

          {/* Semesters grid input (Right) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-card rounded-2xl border border-white/10 p-6 bg-white/5 space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-white/5 pb-2">
                Simulación de Carga Docente, Apoyo y Bienes
              </h3>

              <div className="space-y-4">
                {semesters.map((sem, index) => (
                  <div key={index} className="bg-white/[0.02] border border-white/5 rounded-xl p-4.5 space-y-3.5">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-white/5 pb-1.5">
                      <span className="text-xs font-bold text-white font-mono flex items-center gap-2">
                        <span className="w-2 h-2 bg-red-400 rounded-full"></span> Periodo Semestral {sem.semesterLabel}
                      </span>
                      <div className="flex gap-3 text-[10px] font-mono text-white/40">
                        <span>Costo Hora Docente: <strong className="text-red-400">${Math.round(calculatedSemesters[index].loadedHourValue).toLocaleString()} COP</strong></span>
                        <span>Personal Semestre: <strong className="text-white">${Math.round(calculatedSemesters[index].totalStaffCosts / 1e6).toFixed(1)} M</strong></span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      
                      {/* Docentes hours */}
                      <div className="space-y-2 bg-white/5 p-3 rounded-lg border border-white/5">
                        <h4 className="text-[9px] font-bold text-[#ffcc29] uppercase tracking-wider mb-2">Docentes Hora Cátedra</h4>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[8px] font-mono text-white/55 mb-0.5">N. Docentes</label>
                            <input 
                              type="number"
                              min="0"
                              value={sem.numDocentes}
                              onChange={(e) => handleUpdateSemester(index, { numDocentes: parseInt(e.target.value) || 0 })}
                              className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-[8px] font-mono text-white/55 mb-0.5">Horas/Docente</label>
                            <input 
                              type="number"
                              min="0"
                              value={sem.horasDocente}
                              onChange={(e) => handleUpdateSemester(index, { horasDocente: parseInt(e.target.value) || 0 })}
                              className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white font-mono"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Coordinator & CPS support */}
                      <div className="space-y-2 bg-white/5 p-3 rounded-lg border border-white/5">
                        <h4 className="text-[9px] font-bold text-[#ffcc29] uppercase tracking-wider mb-2">Apoyo y Coordinación</h4>
                        {hasCoordinator ? (
                          <div>
                            <label className="block text-[8px] font-mono text-white/55 mb-0.5">Horas Coordinación</label>
                            <input 
                              type="number"
                              min="0"
                              value={sem.coordinatorHours}
                              onChange={(e) => handleUpdateSemester(index, { coordinatorHours: parseInt(e.target.value) || 0 })}
                              className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white font-mono"
                            />
                          </div>
                        ) : (
                          <div className="text-[10px] text-white/20 py-2.5 text-center">Coordinador inactivo</div>
                        )}
                      </div>

                      {/* Goods/Services and CPS payments */}
                      <div className="space-y-2 bg-white/5 p-3 rounded-lg border border-white/5">
                        <h4 className="text-[9px] font-bold text-[#ffcc29] uppercase tracking-wider mb-2">Funcionamiento e Insumos</h4>
                        <div>
                          <label className="block text-[8px] font-mono text-white/55 mb-0.5">Adquisición Bienes y Serv (COP)</label>
                          <input 
                            type="number"
                            min="0"
                            value={sem.operatingGoodsAndServices}
                            onChange={(e) => handleUpdateSemester(index, { operatingGoodsAndServices: parseInt(e.target.value) || 0 })}
                            className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white font-mono text-red-300"
                          />
                        </div>
                      </div>

                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      )}

      {/* TAB CONTENT: 3. General Budget and Printable PDF Report */}
      {activeSubTab === 'report' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          
          {/* Printable Report Wrapper */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8 space-y-6 bg-white/[0.01] print:bg-white print:border-none print:p-0 print:text-black">
            
            {/* Report Header (Stylized for institutions) */}
            <div className="border-b border-white/10 pb-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:border-black print:text-black">
              <div>
                <span className="text-[10px] font-mono font-bold text-[#ffcc29] uppercase tracking-wider print:text-[#ffcc29]">UNIVERSIDAD PEDAGÓGICA Y TECNOLÓGICA DE COLOMBIA</span>
                <h2 className="text-2xl font-display font-bold text-white mt-1 print:text-black">INFORME DE PRESUPUESTO GENERAL Y VIABILIDAD</h2>
                <p className="text-xs text-white/60 font-sans mt-0.5 print:text-black/60">
                  Estudio financiero de cohorte multicohorte - Nivel: <strong className="text-white print:text-black capitalize">{level.replace('_', ' ')}</strong> | Modalidad: <strong className="text-white print:text-black capitalize">{modality}</strong>
                </p>
              </div>
              <div className="text-right">
                <span className="text-[9px] font-mono text-white/40 block print:text-black/40">Fecha de Reporte:</span>
                <strong className="text-xs font-mono text-white print:text-black">{new Date().toLocaleDateString()}</strong>
              </div>
            </div>

            {/* General Info Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white/5 p-4 rounded-xl border border-white/5 print:bg-black/5 print:border-black/10 print:text-black">
              <div>
                <span className="text-[9px] font-mono text-white/40 uppercase block print:text-black/50">Programa Académico</span>
                <strong className="text-xs text-white print:text-black">{level === 'doctorado' ? 'Doctorado' : level === 'maestria' ? 'Maestría' : 'Especialización'}</strong>
              </div>
              <div>
                <span className="text-[9px] font-mono text-white/40 uppercase block print:text-black/50">Matrícula por Crédito</span>
                <strong className="text-xs text-white print:text-black font-mono">${Math.round(finalCreditValue).toLocaleString()} COP</strong>
              </div>
              <div>
                <span className="text-[9px] font-mono text-white/40 uppercase block print:text-black/50">Carga Académica</span>
                <strong className="text-xs text-white print:text-black font-mono">{tuitionSMMLV} créditos/semestre</strong>
              </div>
              <div>
                <span className="text-[9px] font-mono text-white/40 uppercase block print:text-black/50">Cohortes Proyectadas</span>
                <strong className="text-xs text-white print:text-black">{aggregatedTotals.numCohortes} activas</strong>
              </div>
            </div>

            {/* Main Report Table (Presupuesto General) */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5 text-white font-bold print:bg-black/5 print:text-black print:border-black/20">
                    <th className="p-3 w-64">Concepto Presupuestal / Renglón</th>
                    {calculatedSemesters.map(s => (
                      <th key={s.semesterLabel} className="p-3 text-right font-mono">{s.semesterLabel}</th>
                    ))}
                    <th className="p-3 text-right font-mono text-[#ffcc29] print:text-black">Acumulado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-white/80 print:divide-black/10 print:text-black">
                  
                  {/* Students stats */}
                  <tr className="hover:bg-white/[0.01]">
                    <td className="p-3 font-semibold text-white print:text-black">Aforo Nuevos Estudiantes</td>
                    {calculatedSemesters.map(s => (
                      <td key={s.semesterLabel} className="p-3 text-right font-mono text-emerald-400 print:text-black">{s.newCohortStudents}</td>
                    ))}
                    <td className="p-3 text-right font-mono text-emerald-400 font-bold print:text-black">
                      {aggregatedTotals.totalActiveNewStudents}
                    </td>
                  </tr>

                  <tr className="hover:bg-white/[0.01]">
                    <td className="p-3 pl-6">Estudiantes Activos Totales</td>
                    {calculatedSemesters.map(s => (
                      <td key={s.semesterLabel} className="p-3 text-right font-mono text-white/60 print:text-black/60">{s.activeStudents.toFixed(1)}</td>
                    ))}
                    <td className="p-3 text-right font-mono">-</td>
                  </tr>

                  {/* INCOMES ROWS */}
                  <tr className="hover:bg-white/[0.01] bg-white/[0.01] print:bg-black/5">
                    <td className="p-3 font-bold text-white print:text-black">1. INGRESO BRUTO MATRÍCULAS</td>
                    {calculatedSemesters.map(s => (
                      <td key={s.semesterLabel} className="p-3 text-right font-mono">${Math.round(s.grossIncome / 1e6).toLocaleString()} M</td>
                    ))}
                    <td className="p-3 text-right font-mono font-bold">${Math.round(aggregatedTotals.totalGrossIncome / 1e6).toLocaleString()} M</td>
                  </tr>

                  <tr className="hover:bg-white/[0.01] text-rose-300 print:text-black/80">
                    <td className="p-3 pl-6">Becas y Descuentos Aplicados ({discountPct}%)</td>
                    {calculatedSemesters.map(s => (
                      <td key={s.semesterLabel} className="p-3 text-right font-mono">- ${Math.round(s.totalDiscounts / 1e6).toLocaleString()} M</td>
                    ))}
                    <td className="p-3 text-right font-mono font-bold">- ${Math.round(aggregatedTotals.totalDiscounts / 1e6).toLocaleString()} M</td>
                  </tr>

                  <tr className="hover:bg-white/[0.01] text-white/50 print:text-black/60">
                    <td className="p-3 pl-6">Deducciones UPTC (Administración, MESI, Inv.)</td>
                    {calculatedSemesters.map(s => (
                      <td key={s.semesterLabel} className="p-3 text-right font-mono">- ${Math.round(s.totalDeductions / 1e6).toLocaleString()} M</td>
                    ))}
                    <td className="p-3 text-right font-mono font-bold">- ${Math.round(aggregatedTotals.totalDeductions / 1e6).toLocaleString()} M</td>
                  </tr>

                  <tr className="hover:bg-white/[0.01] font-semibold text-[#4ade80] print:text-black">
                    <td className="p-3 pl-6">Ingreso Matrículas Neto Funcionamiento</td>
                    {calculatedSemesters.map(s => (
                      <td key={s.semesterLabel} className="p-3 text-right font-mono">${Math.round(s.functioningTuitionIncome / 1e6).toLocaleString()} M</td>
                    ))}
                    <td className="p-3 text-right font-mono font-bold">${Math.round((aggregatedTotals.totalNetIncome - aggregatedTotals.totalDeductions) / 1e6).toLocaleString()} M</td>
                  </tr>

                  <tr className="hover:bg-white/[0.01]">
                    <td className="p-3 pl-6">Otros Ingresos (Inscripción y Grado)</td>
                    {calculatedSemesters.map(s => (
                      <td key={s.semesterLabel} className="p-3 text-right font-mono text-white/60 print:text-black/60">${Math.round(s.totalOtherIncome / 1e6).toLocaleString()} M</td>
                    ))}
                    <td className="p-3 text-right font-mono font-bold">
                      ${Math.round(calculatedSemesters.reduce((sum, s) => sum + s.totalOtherIncome, 0) / 1e6).toLocaleString()} M
                    </td>
                  </tr>

                  <tr className="hover:bg-white/[0.01] font-bold bg-[#4ade80]/5 text-[#4ade80] print:bg-emerald-500/10 print:text-black border-y border-white/10 print:border-black/20">
                    <td className="p-3">TOTAL INGRESOS FUNCIONAMIENTO</td>
                    {calculatedSemesters.map(s => (
                      <td key={s.semesterLabel} className="p-3 text-right font-mono">${Math.round(s.totalFunctioningIncome / 1e6).toLocaleString()} M</td>
                    ))}
                    <td className="p-3 text-right font-mono font-bold">${Math.round(aggregatedTotals.totalFunctioningIncome / 1e6).toLocaleString()} M</td>
                  </tr>

                  {/* EXPENSES ROWS */}
                  <tr className="hover:bg-white/[0.01] font-bold text-white print:text-black">
                    <td className="p-3">2. GASTOS DE PERSONAL</td>
                    {calculatedSemesters.map(s => (
                      <td key={s.semesterLabel} className="p-3 text-right font-mono">${Math.round(s.totalStaffCosts / 1e6).toLocaleString()} M</td>
                    ))}
                    <td className="p-3 text-right font-mono font-bold">${Math.round(aggregatedTotals.totalStaffCosts / 1e6).toLocaleString()} M</td>
                  </tr>

                  <tr className="hover:bg-white/[0.01] text-white/60 print:text-black/70">
                    <td className="p-3 pl-6">- Docentes cátedra posgrado</td>
                    {calculatedSemesters.map(s => (
                      <td key={s.semesterLabel} className="p-3 text-right font-mono">${Math.round(s.teachersCost / 1e6).toLocaleString()} M</td>
                    ))}
                    <td className="p-3 text-right font-mono">${Math.round(aggregatedTotals.totalTeachersCost / 1e6).toLocaleString()} M</td>
                  </tr>

                  <tr className="hover:bg-white/[0.01] text-white/60 print:text-black/70">
                    <td className="p-3 pl-6">- Coordinaciones (Programa/Prácticas)</td>
                    {calculatedSemesters.map(s => (
                      <td key={s.semesterLabel} className="p-3 text-right font-mono">${Math.round(s.coordinatorCost / 1e6).toLocaleString()} M</td>
                    ))}
                    <td className="p-3 text-right font-mono">${Math.round(aggregatedTotals.totalCoordinatorCost / 1e6).toLocaleString()} M</td>
                  </tr>

                  <tr className="hover:bg-white/[0.01] text-white/60 print:text-black/70">
                    <td className="p-3 pl-6">- Personal de apoyo administrativo (CPS)</td>
                    {calculatedSemesters.map(s => (
                      <td key={s.semesterLabel} className="p-3 text-right font-mono">${Math.round(s.supportStaffCost / 1e6).toLocaleString()} M</td>
                    ))}
                    <td className="p-3 text-right font-mono">${Math.round(aggregatedTotals.totalSupportStaffCost / 1e6).toLocaleString()} M</td>
                  </tr>

                  <tr className="hover:bg-white/[0.01] font-bold text-white print:text-black">
                    <td className="p-3">3. COMPRA DE BIENES Y SERVICIOS (OP.)</td>
                    {calculatedSemesters.map(s => (
                      <td key={s.semesterLabel} className="p-3 text-right font-mono">${Math.round(s.operatingGoodsAndServices / 1e6).toLocaleString()} M</td>
                    ))}
                    <td className="p-3 text-right font-mono font-bold">${Math.round(aggregatedTotals.totalOperatingCosts / 1e6).toLocaleString()} M</td>
                  </tr>

                  <tr className="hover:bg-white/[0.01] font-bold bg-rose-500/5 text-rose-300 print:bg-rose-500/10 print:text-black border-y border-white/10 print:border-black/20">
                    <td className="p-3">TOTAL EGRESOS Y COSTOS</td>
                    {calculatedSemesters.map(s => (
                      <td key={s.semesterLabel} className="p-3 text-right font-mono">${Math.round(s.totalExpenses / 1e6).toLocaleString()} M</td>
                    ))}
                    <td className="p-3 text-right font-mono font-bold">${Math.round(aggregatedTotals.totalExpenses / 1e6).toLocaleString()} M</td>
                  </tr>

                  {/* NET BALANCE */}
                  <tr className="hover:bg-white/[0.01] font-bold bg-white/5 text-white print:bg-black/5 print:text-black">
                    <td className="p-3 font-mono">BALANCE PRESUPUESTAL NETO</td>
                    {calculatedSemesters.map(s => (
                      <td key={s.semesterLabel} className={`p-3 text-right font-mono font-bold ${s.budgetBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'} print:text-black`}>
                        {s.budgetBalance >= 0 ? '+' : ''}
                        {Math.round(s.budgetBalance / 1e6).toLocaleString()} M
                      </td>
                    ))}
                    <td className={`p-3 text-right font-mono font-bold ${aggregatedTotals.totalBalance >= 0 ? 'text-[#ffcc29]' : 'text-rose-400'} print:text-black`}>
                      {aggregatedTotals.totalBalance >= 0 ? '+' : ''}
                      {Math.round(aggregatedTotals.totalBalance / 1e6).toLocaleString()} M
                    </td>
                  </tr>

                </tbody>
              </table>
            </div>

            {/* Diagnostic conclusions / signatures block (Styled for printing) */}
            <div className="pt-6 border-t border-white/10 flex flex-col md:flex-row justify-between gap-6 print:border-black print:text-black">
              <div className="max-w-xl text-[11px] text-white/60 leading-relaxed print:text-black/60">
                <span className="font-bold text-white block mb-1 print:text-black">Declaración de Viabilidad:</span>
                El presente informe certifica que el programa <strong className="text-white print:text-black">{level.toUpperCase()}</strong> en modalidad <strong className="text-white print:text-black">{modality.toUpperCase()}</strong> {
                  aggregatedTotals.isBalanced 
                    ? 'CUMPLE con el punto de equilibrio presupuestal. Los ingresos proyectados de la matrícula basados en créditos cubren holgadamente los costes de docencia y funcionamiento.' 
                    : 'NO CUMPLE con el punto de equilibrio en uno o más periodos semestrales. Se aconseja elevar la matrícula mínima por cohorte, ajustar las horas docentes o revaluar los egresos CPS.'
                }
              </div>
              
              <div className="w-56 space-y-8 pt-4">
                <div className="border-t border-white/20 pt-1 text-center font-mono text-[9px] text-white/40 print:border-black print:text-black">
                  Firma Coordinador Planeación UPTC
                </div>
              </div>
            </div>

          </div>

          {/* Scenario comparison tools (Hidden on Print) */}
          <div className="glass-card rounded-2xl border border-white/10 p-6 bg-white/5 space-y-4 print:hidden">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2">Guardar y Cargar Escenarios Comparativos</h3>
            
            <div className="flex gap-2 mb-4">
              <input 
                type="text" 
                placeholder="Nombre escenario..."
                value={newScenarioName}
                onChange={(e) => setNewScenarioName(e.target.value)}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/20"
              />
              <button
                onClick={handleSaveScenario}
                disabled={!newScenarioName.trim() || validationErrors.length > 0}
                className="px-4 bg-[#ffcc29] hover:bg-[#ffcc29]/90 text-black rounded-xl text-xs font-bold font-sans cursor-pointer transition-all disabled:opacity-50"
              >
                Guardar
              </button>
            </div>

            {savedScenarios.length > 0 && (
              <div className="space-y-3.5">
                {savedScenarios.map((scen) => (
                  <div key={scen.id} className="p-4 bg-white/5 border border-white/5 rounded-xl flex justify-between items-center hover:bg-white/10 transition-colors">
                    <div>
                      <h4 className="text-xs font-bold text-white">{scen.name}</h4>
                      <p className="text-[10px] text-white/50 font-mono mt-1">
                        Utilidad: <span className={scen.utility >= 0 ? 'text-[#4ade80]' : 'text-rose-400'}>
                          ${Math.round(scen.utility / 1e6)} M COP
                        </span> | Eq: <span className="text-[#ffcc29] font-bold">{scen.breakEvenCredits} cr.</span>
                      </p>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleLoadScenario(scen)}
                        className="px-2 py-1 bg-white/10 hover:bg-white/20 text-white rounded text-[10px] font-bold transition cursor-pointer"
                      >
                        Cargar
                      </button>
                      <button
                        onClick={() => handleDeleteScenario(scen.id)}
                        className="p-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded transition cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
