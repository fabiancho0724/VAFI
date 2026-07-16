import { useState, useMemo } from 'react';
import { 
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line, ReferenceLine
} from 'recharts';
import { 
  Filter, DollarSign, Activity, TrendingUp, RefreshCw, Compass,
  Layers, Wallet, HelpCircle, AlertTriangle, ShieldCheck, ArrowRight, 
  Download, Search, CheckCircle, Info, Users, GraduationCap, Percent, BookOpen, Settings, Save, Trash2, Printer, Plus
} from 'lucide-react';

interface Asignatura {
  id: string;
  nombre: string;
  creditos: number;
  semestre: number; // 1 to 6
}

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
  
  // Operating inputs (Purchase of goods/services detailed breakdown)
  goodsMaterials: number; // Materiales y Suministros
  goodsTravel: number; // Viáticos y Transportes
  goodsSoftware: number; // Licencias y Software
  goodsLogistics: number; // Logística y Eventos
  goodsOther: number; // Otros Servicios
}

interface SavedScenario {
  id: string;
  name: string;
  facultad: string;
  programa: string;
  anioInicio: number;
  level: 'doctorado' | 'maestria' | 'especializacion';
  modality: 'presencial' | 'hibrido' | 'virtual';
  attritionPct: number;
  discountPct: number;
  hasCoordinator: boolean;
  hasSupportStaff: boolean;
  courses: Asignatura[];
  semesters: SemesterData[];
  
  // Calculated summaries
  totalIncome: number;
  totalCosts: number;
  utility: number;
  breakEvenCredits: number;
  breakEvenStudents: number;
}

export function ProgramCostingScreen({ onNavigate }: { onNavigate: (s: string) => void }) {
  // Program Metadata
  const [facultad, setFacultad] = useState<string>("Facultad de Ciencias Económicas y Administrativas");
  const [programa, setPrograma] = useState<string>("Maestría en Administración de Empresas");
  const [anioInicio, setAnioInicio] = useState<number>(2026);

  // Config state
  const [level, setLevel] = useState<'doctorado' | 'maestria' | 'especializacion'>('maestria');
  const [modality, setModality] = useState<'presencial' | 'hibrido' | 'virtual'>('presencial');
  const [attritionPct, setAttritionPct] = useState<number>(5);
  const [discountPct, setDiscountPct] = useState<number>(10); // general discount rate (e.g. 10%)
  
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

  // Pensum (Curriculum) Asignaturas state
  const [courses, setCourses] = useState<Asignatura[]>([
    // Semester 1
    { id: 'c1', nombre: 'Metodología de la Investigación', creditos: 3, semestre: 1 },
    { id: 'c2', nombre: 'Fundamentos de Administración', creditos: 4, semestre: 1 },
    // Semester 2
    { id: 'c3', nombre: 'Gerencia Financiera', creditos: 4, semestre: 2 },
    { id: 'c4', nombre: 'Mercadeo Estratégico', creditos: 4, semestre: 2 },
    // Semester 3
    { id: 'c5', nombre: 'Dirección de Operaciones', creditos: 4, semestre: 3 },
    { id: 'c6', nombre: 'Gestión del Talento Humano', creditos: 3, semestre: 3 },
    // Semester 4
    { id: 'c7', nombre: 'Seminario de Trabajo de Grado', creditos: 4, semestre: 4 },
    { id: 'c8', nombre: 'Ética Empresarial y Sostenibilidad', creditos: 3, semestre: 4 },
    // Semester 5
    { id: 'c9', nombre: 'Electiva de Profundización I', creditos: 4, semestre: 5 },
    { id: 'c10', nombre: 'Proyecto de Grado', creditos: 4, semestre: 5 },
    // Semester 6
    { id: 'c11', nombre: 'Electiva de Profundización II', creditos: 4, semestre: 6 },
    { id: 'c12', nombre: 'Derecho Laboral y Comercial', creditos: 3, semestre: 6 }
  ]);

  // Temporary state for adding a new course
  const [newCourseName, setNewCourseName] = useState<string>("");
  const [newCourseCredits, setNewCourseCredits] = useState<number>(3);
  const [newCourseSemester, setNewCourseSemester] = useState<number>(1);

  // 6 semesters labels definition
  const semestersLabels = ["2026-1", "2026-2", "2027-1", "2027-2", "2028-1", "2028-2"];

  // Default semesters state
  const [semesters, setSemesters] = useState<SemesterData[]>(() => {
    return semestersLabels.map((label, idx) => {
      const isStartSemester = idx === 0 || idx === 2 || idx === 4;
      const initialSize = isStartSemester ? (idx === 0 ? 22 : idx === 2 ? 18 : 20) : 0;
      
      return {
        semesterLabel: label,
        newCohortStudents: initialSize,
        votacionDiscountCount: initialSize > 0 ? Math.ceil(initialSize * 0.3) : 0, 
        monitoriaDiscountCount: 0,
        honorDiscountCount: 0,
        res16DiscountCount: 0,
        otherDiscountCount: 0,
        otherDiscountPct: 50,
        aspirantesCount: initialSize > 0 ? Math.ceil(initialSize * 1.5) : 0,
        graduandosCount: idx === 3 ? 16 : idx === 5 ? 14 : 0,
        otherRawIncome: 0,
        
        // Staff inputs
        numDocentes: 4, 
        horasDocente: 45, 
        coordinatorHours: 64, 
        supportStaffMonthlyCPS: 3659400,
        supportStaffMonths: 4,
        
        // Operating inputs breakdown
        goodsMaterials: idx % 2 === 0 ? 4000000 : 3000000,
        goodsTravel: idx % 2 === 0 ? 2000000 : 1500000,
        goodsSoftware: idx % 2 === 0 ? 3000000 : 2500000,
        goodsLogistics: idx % 2 === 0 ? 2000000 : 1500000,
        goodsOther: idx % 2 === 0 ? 1000000 : 500000
      };
    });
  });

  const [activeSubTab, setActiveSubTab] = useState<'simulator' | 'pensum' | 'staff' | 'report'>('simulator');
  const [newScenarioName, setNewScenarioName] = useState<string>("");
  
  // Preset scenarios list
  const [savedScenarios, setSavedScenarios] = useState<SavedScenario[]>([
    {
      id: 'scen_1',
      name: 'Simulación Maestría Esperada (3 Cohortes)',
      facultad: "Facultad de Ciencias Económicas y Administrativas",
      programa: "Maestría en Administración de Empresas",
      anioInicio: 2026,
      level: 'maestria',
      modality: 'presencial',
      attritionPct: 5,
      discountPct: 10,
      hasCoordinator: true,
      hasSupportStaff: true,
      courses: [
        { id: 'c1', nombre: 'Metodología de la Investigación', creditos: 3, semestre: 1 },
        { id: 'c2', nombre: 'Fundamentos de Administración', creditos: 4, semestre: 1 },
        { id: 'c3', nombre: 'Gerencia Financiera', creditos: 4, semestre: 2 },
        { id: 'c4', nombre: 'Mercadeo Estratégico', creditos: 4, semestre: 2 },
        { id: 'c5', nombre: 'Dirección de Operaciones', creditos: 4, semestre: 3 },
        { id: 'c6', nombre: 'Gestión del Talento Humano', creditos: 3, semestre: 3 },
        { id: 'c7', nombre: 'Seminario de Trabajo de Grado', creditos: 4, semestre: 4 },
        { id: 'c8', nombre: 'Ética Empresarial y Sostenibilidad', creditos: 3, semestre: 4 },
        { id: 'c9', nombre: 'Electiva de Profundización I', creditos: 4, semestre: 5 },
        { id: 'c10', nombre: 'Proyecto de Grado', creditos: 4, semestre: 5 },
        { id: 'c11', nombre: 'Electiva de Profundización II', creditos: 4, semestre: 6 },
        { id: 'c12', nombre: 'Derecho Laboral y Comercial', creditos: 3, semestre: 6 }
      ],
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
        goodsMaterials: 3000000,
        goodsTravel: 2000000,
        goodsSoftware: 2000000,
        goodsLogistics: 2000000,
        goodsOther: 1000000
      })),
      totalIncome: 1215456200,
      totalCosts: 485124000,
      utility: 730332200,
      breakEvenCredits: 12,
      breakEvenStudents: 6
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

  // Dynamic credits per semester from pensum (curriculum)
  const semesterCreditsMap = useMemo(() => {
    const map = new Map<number, number>();
    for (let sem = 1; sem <= 6; sem++) {
      const sum = courses.filter(c => c.semestre === sem).reduce((acc, curr) => acc + curr.creditos, 0);
      map.set(sem, sum);
    }
    return map;
  }, [courses]);

  // Validations & rules enforcement
  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    if (attritionPct < 0 || attritionPct > 100) errors.push("La tasa de deserción debe estar entre 0% y 100%.");
    if (baseSMMLV2026 <= 0) errors.push("El valor base de SMMLV debe ser mayor a 0.");
    if (annualWageIncreasePct < 0) errors.push("El porcentaje de incremento anual no puede ser negativo.");
    if (parafiscalFactor < 0) errors.push("La carga prestacional no puede ser negativa.");
    if (isAdminOverride && customCreditValue <= 0) errors.push("El valor del crédito personalizado debe ser mayor a 0.");
    if (discountPct < 0 || discountPct > 100) errors.push("El porcentaje de descuentos/becas debe estar entre 0% y 100%.");

    // Enforce 7 credits minimum rule per active semester
    semesters.forEach((sem, idx) => {
      if (sem.newCohortStudents < 0) errors.push(`[Semestre ${sem.semesterLabel}] El ingreso de estudiantes no puede ser negativo.`);
      if (sem.numDocentes < 0) errors.push(`[Semestre ${sem.semesterLabel}] El número de docentes no puede ser negativo.`);
      if (sem.horasDocente < 0) errors.push(`[Semestre ${sem.semesterLabel}] Las horas de docencia no pueden ser negativas.`);
      if (sem.goodsMaterials < 0 || sem.goodsTravel < 0 || sem.goodsSoftware < 0 || sem.goodsLogistics < 0 || sem.goodsOther < 0) {
        errors.push(`[Semestre ${sem.semesterLabel}] Los gastos de adquisición no pueden ser negativos.`);
      }

      // Check if semester has new/active students and academic load
      const semCredits = semesterCreditsMap.get(idx + 1) || 0;
      const isCohortStart = sem.newCohortStudents > 0;
      if (isCohortStart && semCredits < 7) {
        errors.push(`[Semestre ${sem.semesterLabel}] Se programó el ingreso de cohorte pero la carga académica en el pensum (${semCredits} cr.) es inferior al mínimo de 7 créditos requerido por estudiante.`);
      }
    });
    
    return errors;
  }, [semesters, attritionPct, baseSMMLV2026, annualWageIncreasePct, parafiscalFactor, isAdminOverride, customCreditValue, semesterCreditsMap, discountPct]);

  // Semester calculations with overlapping cohorts
  const calculatedSemesters = useMemo(() => {
    const durationSemesters = level === 'especializacion' ? 2 : level === 'doctorado' ? 8 : 4;
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
            activeCohortStudents[i][t] = 0; 
          }
        }
      }
    }

    return semesters.map((sem, t) => {
      const smmlv = getSMMLVForSemester(sem.semesterLabel);
      const creditRate = finalCreditValue * (smmlv / baseSMMLV2026); 
      const programCreditsPerSemester = semesterCreditsMap.get(t + 1) || 0;
      
      // Calculate active student counts in this semester
      let totalActiveStudents = 0;
      for (let i = 0; i <= t; i++) {
        totalActiveStudents += activeCohortStudents[i][t];
      }

      // Gross tuition income
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

      // Deductions
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

      // Gastos de Personal
      const teachingHourBaseValue = smmlv * degreeHourMultipliers[level];
      const loadedHourValue = teachingHourBaseValue * (1 + parafiscalFactor / 100);
      const teachersCost = sem.numDocentes * sem.horasDocente * loadedHourValue;

      const coordinatorHourRate = 65787.385 * (smmlv / baseSMMLV2026);
      const coordinatorCost = hasCoordinator ? sem.coordinatorHours * coordinatorHourRate : 0;
      
      const supportStaffCPSRate = sem.supportStaffMonthlyCPS * (smmlv / baseSMMLV2026);
      const supportStaffCost = hasSupportStaff ? supportStaffCPSRate * sem.supportStaffMonths : 0;

      const totalStaffCosts = teachersCost + coordinatorCost + supportStaffCost;

      // Operating expenses detailed sum
      const totalOperatingCosts = sem.goodsMaterials + sem.goodsTravel + sem.goodsSoftware + sem.goodsLogistics + sem.goodsOther;

      const totalExpenses = totalStaffCosts + totalOperatingCosts;
      const budgetBalance = totalFunctioningIncome - totalExpenses;

      return {
        ...sem,
        smmlv,
        creditRate,
        programCreditsPerSemester,
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
        totalOperatingCosts,
        totalExpenses,
        budgetBalance,
        loadedHourValue,
        activeCohortStudents: activeCohortStudents.map(cohort => cohort[t])
      };
    });
  }, [semesters, level, attritionPct, baseSMMLV2026, annualWageIncreasePct, parafiscalFactor, finalCreditValue, hasCoordinator, hasSupportStaff, semesterCreditsMap]);

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
      
      totalOperatingCosts += sem.totalOperatingCosts;
      totalExpenses += sem.totalExpenses;
      totalBalance += sem.budgetBalance;
      totalActiveStudentSemesters += sem.activeStudents;
      
      if (sem.budgetBalance < 0) {
        hasDeficitInAnySemester = true;
      }
    });

    const numCohortes = semesters.filter(s => s.newCohortStudents > 0).length;
    const netCostsToCoverTotal = Math.max(0, totalExpenses + totalDeductions - (calculatedSemesters.reduce((sum, s) => sum + s.totalOtherIncome, 0)));
    const averageCreditRate = calculatedSemesters.reduce((sum, s) => sum + s.creditRate, 0) / 6;
    const averageDiscountMultiplier = 1 - discountPct / 100;
    const totalActiveNewStudents = semesters.reduce((sum, s) => sum + s.newCohortStudents, 0);

    const denomCredits = averageCreditRate * averageDiscountMultiplier * totalActiveNewStudents;
    const breakEvenCredits = denomCredits > 0 ? Math.ceil(netCostsToCoverTotal / (averageCreditRate * averageDiscountMultiplier * (totalActiveStudentSemesters / (numCohortes || 1)))) : 0;
    
    const programTotalCredits = courses.reduce((sum, c) => sum + c.creditos, 0);
    const denomStudents = averageCreditRate * averageDiscountMultiplier * (programTotalCredits / 6) * (totalActiveStudentSemesters / (totalActiveNewStudents || 1));
    const breakEvenStudents = denomStudents > 0 ? Math.ceil(netCostsToCoverTotal / (averageCreditRate * averageDiscountMultiplier * (programTotalCredits / 6))) : 0;

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
      totalActiveNewStudents,
      programTotalCredits
    };
  }, [calculatedSemesters, semesters, discountPct, courses]);

  // Update semester inputs
  const handleUpdateSemester = (index: number, fields: Partial<SemesterData>) => {
    setSemesters(prev => prev.map((s, i) => i === index ? { ...s, ...fields } : s));
  };

  // Add course to pensum
  const handleAddCourse = () => {
    if (!newCourseName.trim()) return;
    const newCourse: Asignatura = {
      id: Date.now().toString(),
      nombre: newCourseName,
      creditos: newCourseCredits,
      semestre: newCourseSemester
    };
    setCourses(prev => [...prev, newCourse]);
    setNewCourseName("");
  };

  // Delete course from pensum
  const handleDeleteCourse = (id: string) => {
    setCourses(prev => prev.filter(c => c.id !== id));
  };

  // Recharts graphics mapping
  const chartData = useMemo(() => {
    return calculatedSemesters.map(sem => ({
      name: sem.semesterLabel,
      'Ingresos Disponibles': Math.round(sem.totalFunctioningIncome / 1e6 * 100) / 100,
      'Gastos Personal': Math.round(sem.totalStaffCosts / 1e6 * 100) / 100,
      'Gastos Adquisición': Math.round(sem.totalOperatingCosts / 1e6 * 100) / 100,
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

  // Sensitivity Analysis graph data
  const sensitivityChartData = useMemo(() => {
    if (validationErrors.length > 0) return [];
    
    const data = [];
    const step = 5;
    const programTotalCredits = courses.reduce((sum, c) => sum + c.creditos, 0);
    
    for (let cSize = 5; cSize <= 45; cSize += step) {
      let simulatedFunctioningIncome = 0;
      let simulatedTotalExpenses = 0;
      
      const durationSem = level === 'especializacion' ? 2 : level === 'doctorado' ? 8 : 4;
      const actCohort = Array.from({ length: 6 }, () => new Array(6).fill(0));
      
      for (let i = 0; i < 6; i++) {
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

        const semCredits = semesterCreditsMap.get(t + 1) || 0;
        const gross = activeStud * sem.creditRate * semCredits;
        const ratio = originalStudents > 0 ? activeStud / (sem.activeStudents || 1) : 1;
        const disc = sem.totalDiscounts * ratio;
        const net = gross - disc;
        const deduct = net * 0.455;
        const funcTuition = net - deduct;
        const totalFunc = funcTuition + sem.totalOtherIncome;
        
        simulatedFunctioningIncome += totalFunc;
        simulatedTotalExpenses += sem.totalExpenses; 
      });

      data.push({
        cohortSize: cSize,
        'Ingresos de Operación': Math.round(simulatedFunctioningIncome / 1e6 * 100) / 100,
        'Gastos y Costos': Math.round(simulatedTotalExpenses / 1e6 * 100) / 100,
        'Margen Final (M)': Math.round((simulatedFunctioningIncome - simulatedTotalExpenses) / 1e6 * 100) / 100
      });
    }
    return data;
  }, [semesters, calculatedSemesters, level, attritionPct, courses, semesterCreditsMap, validationErrors]);

  // Scenario management actions
  const handleSaveScenario = () => {
    if (!newScenarioName.trim()) return;
    
    const scenario: SavedScenario = {
      id: Date.now().toString(),
      name: newScenarioName,
      facultad,
      programa,
      anioInicio,
      level,
      modality,
      attritionPct,
      discountPct,
      hasCoordinator,
      hasSupportStaff,
      courses: JSON.parse(JSON.stringify(courses)),
      semesters: JSON.parse(JSON.stringify(semesters)),
      totalIncome: aggregatedTotals.totalFunctioningIncome,
      totalCosts: aggregatedTotals.totalExpenses,
      utility: aggregatedTotals.totalBalance,
      breakEvenCredits: aggregatedTotals.breakEvenCredits,
      breakEvenStudents: aggregatedTotals.breakEvenStudents
    };

    setSavedScenarios(prev => [scenario, ...prev]);
    setNewScenarioName("");
    setActiveSubTab('report'); 
  };

  const handleLoadScenario = (scen: SavedScenario) => {
    setFacultad(scen.facultad);
    setPrograma(scen.programa);
    setAnioInicio(scen.anioInicio);
    setLevel(scen.level);
    setModality(scen.modality);
    setAttritionPct(scen.attritionPct);
    setDiscountPct(scen.discountPct || 10);
    setHasCoordinator(scen.hasCoordinator);
    setHasSupportStaff(scen.hasSupportStaff);
    setCourses(scen.courses || []);
    setSemesters(scen.semesters);
    setActiveSubTab('simulator');
  };

  const handleDeleteScenario = (id: string) => {
    setSavedScenarios(prev => prev.filter(s => s.id !== id));
  };

  const handleExportCSV = () => {
    let csv = "\uFEFFConcepto;Valor de Simulación\n";
    csv += `Facultad;${facultad}\n`;
    csv += `Programa;${programa}\n`;
    csv += `Año de Inicio;${anioInicio}\n`;
    csv += `Nivel Académico;${level.toUpperCase()}\n`;
    csv += `Modalidad;${modality.toUpperCase()}\n`;
    csv += `Tasa Deserción;${attritionPct}%\n`;
    csv += `Créditos Totales del Pensum;${aggregatedTotals.programTotalCredits} cr.\n`;
    csv += `Total Estudiantes Nuevos;${aggregatedTotals.totalActiveNewStudents}\n`;
    csv += `Total Ingresos Proyectados (COP);${aggregatedTotals.totalFunctioningIncome}\n`;
    csv += `Total Costos Proyectados (COP);${aggregatedTotals.totalExpenses}\n`;
    csv += `Utilidad/Déficit Neto (COP);${aggregatedTotals.totalBalance}\n`;
    csv += `Punto de Equilibrio en Créditos;${aggregatedTotals.breakEvenCredits} cr.\n`;
    csv += `Punto de Equilibrio en Estudiantes;${aggregatedTotals.breakEvenStudents} estudiantes\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `Reporte_Costeo_${programa.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
            Gestione metadatos, pensum académico, docentes hora cátedra y gastos de adquisición de bienes para emitir reportes firmables del Presupuesto General.
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

      {/* Executive stats (Hidden on Print) */}
      {validationErrors.length === 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 print:hidden">
          
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

          <div className="p-5 rounded-2xl border border-white/10 bg-white/5 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-white/55">Créditos Totales Req.</span>
              <h3 className="text-2xl font-display font-bold font-mono text-[#ffcc29] mt-2">
                {aggregatedTotals.breakEvenCredits} <span className="text-xs text-white/40 font-normal">créditos</span>
              </h3>
            </div>
            <span className="text-[9px] text-white/40 font-mono mt-3">
              Frente a {aggregatedTotals.programTotalCredits * aggregatedTotals.totalActiveNewStudents} cr. totales del pensum cohorte.
            </span>
          </div>

          <div className="p-5 rounded-2xl border border-white/10 bg-white/5 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-white/55">Estudiantes Mínimos</span>
              <h3 className="text-2xl font-display font-bold font-mono text-white mt-2">
                {aggregatedTotals.breakEvenStudents} <span className="text-xs text-white/40 font-normal">estudiantes</span>
              </h3>
            </div>
            <span className="text-[9px] text-white/40 font-mono mt-3">
              Carga promedio semestral: {(aggregatedTotals.programTotalCredits / 6).toFixed(1)} cr.
            </span>
          </div>

          <div className="p-5 rounded-2xl border border-white/10 bg-white/5 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-white/55">Estructura Académica</span>
              <h3 className="text-2xl font-display font-bold font-mono text-white mt-2">
                {aggregatedTotals.programTotalCredits} <span className="text-xs text-white/40 font-normal">créditos</span>
              </h3>
            </div>
            <span className="text-[9px] text-white/40 font-mono mt-3">
              {courses.length} asignaturas registradas en el pensum.
            </span>
          </div>

        </div>
      )}

      {/* Sub tabs selector (Hidden on Print) */}
      <div className="flex border-b border-white/10 gap-2 overflow-x-auto print:hidden">
        {[
          { id: 'simulator', label: '1. Ingresos y Cohortes', icon: Users },
          { id: 'pensum', label: '2. Plan de Estudios (Pensum)', icon: BookOpen },
          { id: 'staff', label: '3. Nómina y Bienes', icon: Wallet },
          { id: 'report', label: '4. Presupuesto y Reportes', icon: Activity }
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

      {/* TAB 1: Incomes, Levels and Metadata */}
      {activeSubTab === 'simulator' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:hidden">
          
          {/* Metadata & Config Panel (Left) */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Metadata Fields */}
            <div className="glass-card rounded-2xl border border-white/10 p-6 bg-white/5 space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-white/5 pb-2.5">
                Metadatos del Programa
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-[9px] font-mono text-white/55 uppercase tracking-wider mb-1">Facultad</label>
                  <input 
                    type="text" 
                    value={facultad} 
                    onChange={(e) => setFacultad(e.target.value)}
                    className="w-full bg-[#0f172a] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-mono text-white/55 uppercase tracking-wider mb-1">Programa Académico</label>
                  <input 
                    type="text" 
                    value={programa} 
                    onChange={(e) => setPrograma(e.target.value)}
                    className="w-full bg-[#0f172a] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-mono text-white/55 uppercase tracking-wider mb-1">Año de Inicio del Programa</label>
                  <input 
                    type="number" 
                    value={anioInicio} 
                    onChange={(e) => setAnioInicio(parseInt(e.target.value) || 2026)}
                    className="w-full bg-[#0f172a] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Level settings */}
            <div className="glass-card rounded-2xl border border-white/10 p-6 bg-white/5 space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-white/5 pb-2.5">
                Configuración del Posgrado
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-mono text-on-surface-variant uppercase tracking-wider mb-1.5">Nivel</label>
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
                  <label className="block text-[10px] font-mono text-on-surface-variant uppercase tracking-wider mb-1.5">Modalidad</label>
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
                  <div>
                    <label className="block text-[10px] font-mono text-on-surface-variant uppercase tracking-wider mb-1.5">Descuentos (%)</label>
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

                <div className="border-t border-white/5 pt-3 mt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider">Ajuste Manual Crédito</span>
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
                      <label className="block text-[9px] font-mono text-white/50 mb-1">Valor de Crédito Manual (COP)</label>
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
                    <span className="text-white/50">Valor Crédito Final:</span>
                    <strong className="text-[#ffcc29] font-mono">${Math.round(finalCreditValue).toLocaleString()} COP</strong>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Semesters grid input (Right) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-card rounded-2xl border border-white/10 p-6 bg-white/5 space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-white/5 pb-2">
                Simulación de Estudiantes Nuevos (Cohortes)
              </h3>

              <div className="space-y-4">
                {semesters.map((sem, index) => {
                  const semCredits = semesterCreditsMap.get(index + 1) || 0;
                  const isLoadInvalid = sem.newCohortStudents > 0 && semCredits < 7;
                  
                  return (
                    <div key={index} className={`border rounded-xl p-4.5 space-y-3.5 transition-all ${
                      isLoadInvalid 
                        ? 'bg-rose-500/5 border-rose-500/30' 
                        : 'bg-white/[0.02] border-white/5'
                    }`}>
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-white/5 pb-1.5">
                        <span className="text-xs font-bold text-white font-mono flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${isLoadInvalid ? 'bg-rose-500' : 'bg-[#ffcc29]'}`}></span> Periodo Semestral {sem.semesterLabel}
                        </span>
                        <div className="flex gap-3 text-[10px] font-mono text-white/40">
                          <span>Créditos Semestre: <strong className={semCredits >= 7 ? 'text-[#ffcc29]' : 'text-rose-400 font-bold'}>{semCredits} cr.</strong></span>
                          <span>Est. Activos: <strong className="text-[#4ade80]">{calculatedSemesters[index].activeStudents.toFixed(1)}</strong></span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        
                        <div className="space-y-2 bg-white/5 p-3 rounded-lg border border-white/5">
                          <h4 className="text-[9px] font-bold text-[#ffcc29] uppercase tracking-wider">Aforo de Cohorte</h4>
                          <div>
                            <label className="block text-[8px] font-mono text-white/55 mb-0.5">Estudiantes Nuevos</label>
                            <input 
                              type="number"
                              min="0"
                              value={sem.newCohortStudents}
                              onChange={(e) => handleUpdateSemester(index, { newCohortStudents: parseInt(e.target.value) || 0 })}
                              className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white font-mono"
                            />
                          </div>
                        </div>

                        <div className="space-y-2 bg-white/5 p-3 rounded-lg border border-white/5">
                          <h4 className="text-[9px] font-bold text-[#ffcc29] uppercase tracking-wider">Descuentos Aplicados</h4>
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

                        <div className="space-y-2 bg-white/5 p-3 rounded-lg border border-white/5 flex flex-col justify-between">
                          <div>
                            <h4 className="text-[9px] font-bold text-[#ffcc29] uppercase tracking-wider">Trámites</h4>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[8px] font-mono text-white/55 mb-0.5">Aspirantes</label>
                                <input 
                                  type="number"
                                  min="0"
                                  value={sem.aspirantesCount}
                                  onChange={(e) => handleUpdateSemester(index, { aspirantesCount: parseInt(e.target.value) || 0 })}
                                  className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white font-mono"
                                />
                              </div>
                              <div>
                                <label className="block text-[8px] font-mono text-white/55 mb-0.5">Graduandos</label>
                                <input 
                                  type="number"
                                  min="0"
                                  value={sem.graduandosCount}
                                  onChange={(e) => handleUpdateSemester(index, { graduandosCount: parseInt(e.target.value) || 0 })}
                                  className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white font-mono"
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                      </div>

                      {isLoadInvalid && (
                        <div className="text-[10px] text-rose-400 font-bold bg-rose-500/10 p-2 rounded border border-rose-500/20">
                          ⚠️ Carga semestral inválida ({semCredits} cr.). Ingrese asignaturas en el plan de estudios para este semestre (mínimo 7 créditos).
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

      {/* TAB 2: Curriculum (Pensum) Management */}
      {activeSubTab === 'pensum' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:hidden">
          
          {/* Add Asignatura panel */}
          <div className="lg:col-span-1 space-y-6">
            <div className="glass-card rounded-2xl border border-white/10 p-6 bg-white/5 space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-white/5 pb-2.5">
                Agregar Asignatura al Pensum
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-mono text-white/55 uppercase mb-1">Nombre de Asignatura</label>
                  <input 
                    type="text" 
                    placeholder="ej. Planeación Estratégica"
                    value={newCourseName}
                    onChange={(e) => setNewCourseName(e.target.value)}
                    className="w-full bg-[#0f172a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ffcc29]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-mono text-white/55 uppercase mb-1">Créditos</label>
                    <input 
                      type="number" 
                      min="1"
                      value={newCourseCredits}
                      onChange={(e) => setNewCourseCredits(parseInt(e.target.value) || 1)}
                      className="w-full bg-[#0f172a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-white/55 uppercase mb-1">Semestre</label>
                    <select 
                      value={newCourseSemester}
                      onChange={(e) => setNewCourseSemester(parseInt(e.target.value) || 1)}
                      className="w-full bg-[#0f172a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    >
                      {[1, 2, 3, 4, 5, 6].map(num => (
                        <option key={num} value={num}>Semestre {num}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  onClick={handleAddCourse}
                  disabled={!newCourseName.trim()}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#ffcc29] hover:bg-[#ffcc29]/90 text-black font-bold text-xs rounded-xl cursor-pointer transition-all disabled:opacity-50"
                >
                  <Plus size={14} /> Registrar en el Plan
                </button>
              </div>
            </div>

            <div className="bg-white/5 border border-white/5 p-4 rounded-xl text-xs space-y-2">
              <span className="font-bold text-[#ffcc29] flex items-center gap-1.5 mb-1.5"><Info size={14} /> Regla Curricular:</span>
              <p className="text-white/70 leading-relaxed text-[11px]">
                De acuerdo con los lineamientos, un estudiante de posgrado matriculado debe inscribir un <strong>mínimo de 7 créditos académicos</strong> por periodo semestral. El simulador arrojará alertas si algún semestre programado incumple esta condición.
              </p>
            </div>
          </div>

          {/* Pensum Table (Right) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-card rounded-2xl border border-white/10 p-6 bg-white/5 space-y-4">
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Plan de Estudios Vigente ({aggregatedTotals.programTotalCredits} Créditos Totales)
                </h3>
                <span className="text-[10px] text-white/40 font-mono">Malla Curricular</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/5 text-white font-bold font-sans">
                      <th className="p-3">Nombre Asignatura</th>
                      <th className="p-3 text-center">Semestre</th>
                      <th className="p-3 text-center">Créditos</th>
                      <th className="p-3 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-white/80 font-sans">
                    {courses.map((course) => (
                      <tr key={course.id} className="hover:bg-white/[0.02]">
                        <td className="p-3 font-semibold text-white">{course.nombre}</td>
                        <td className="p-3 text-center font-mono">Semestre {course.semestre}</td>
                        <td className="p-3 text-center font-mono text-[#ffcc29] font-bold">{course.creditos} cr.</td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleDeleteCourse(course.id)}
                            className="p-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded transition cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
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

      {/* TAB 3: Staffing and Goods/Services Breakdown */}
      {activeSubTab === 'staff' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:hidden">
          
          {/* Toggles Panel */}
          <div className="lg:col-span-1 space-y-6">
            <div className="glass-card rounded-2xl border border-white/10 p-6 bg-white/5 space-y-5">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-white/5 pb-2.5">
                Estructura de Egresos de Personal
              </h3>

              {/* Coordinator Switch */}
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

              {/* Support CPS Switch */}
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

              {/* Constants */}
              <div className="grid grid-cols-2 gap-3 text-xs bg-white/5 p-4 rounded-xl border border-white/5">
                <div>
                  <label className="block text-[8px] text-white/55 font-mono mb-0.5">IPC Anual %</label>
                  <input 
                    type="number" 
                    step="0.5"
                    value={annualWageIncreasePct} 
                    onChange={(e) => setAnnualWageIncreasePct(parseFloat(e.target.value) || 0)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-0.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[8px] text-white/55 font-mono mb-0.5">Parafiscales %</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={parafiscalFactor} 
                    onChange={(e) => setParafiscalFactor(parseFloat(e.target.value) || 0)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-0.5 text-white font-mono"
                  />
                </div>
              </div>

            </div>
          </div>

          {/* Semesters staffing & goods input */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-card rounded-2xl border border-white/10 p-6 bg-white/5 space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-white/5 pb-2">
                Simulación de Carga Docente, Apoyo y Adquisiciones
              </h3>

              <div className="space-y-4">
                {semesters.map((sem, index) => (
                  <div key={index} className="bg-white/[0.02] border border-white/5 rounded-xl p-4.5 space-y-3">
                    
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-white/5 pb-1">
                      <span className="text-xs font-bold text-white font-mono flex items-center gap-2">
                        <span className="w-2 h-2 bg-red-400 rounded-full"></span> Periodo Semestral {sem.semesterLabel}
                      </span>
                      <div className="flex gap-3 text-[10px] font-mono text-white/40">
                        <span>Costo Hora Docente: <strong className="text-red-300">${Math.round(calculatedSemesters[index].loadedHourValue).toLocaleString()} COP</strong></span>
                        <span>Total Bienes Semestre: <strong className="text-white">${Math.round(calculatedSemesters[index].totalOperatingCosts / 1e6).toFixed(1)} M</strong></span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      {/* Staff Costs */}
                      <div className="space-y-2 bg-white/5 p-3 rounded-lg border border-white/5">
                        <h4 className="text-[9px] font-bold text-[#ffcc29] uppercase tracking-wider mb-1">Cuerpo Docente y Apoyo</h4>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[8px] font-mono text-white/55 mb-0.5">N. Docentes</label>
                            <input 
                              type="number"
                              min="0"
                              value={sem.numDocentes}
                              onChange={(e) => handleUpdateSemester(index, { numDocentes: parseInt(e.target.value) || 0 })}
                              className="w-full bg-white/5 border border-white/10 rounded px-2 py-0.5 text-xs text-white font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-[8px] font-mono text-white/55 mb-0.5">Horas/Docente</label>
                            <input 
                              type="number"
                              min="0"
                              value={sem.horasDocente}
                              onChange={(e) => handleUpdateSemester(index, { horasDocente: parseInt(e.target.value) || 0 })}
                              className="w-full bg-white/5 border border-white/10 rounded px-2 py-0.5 text-xs text-white font-mono"
                            />
                          </div>
                        </div>

                        {hasCoordinator && (
                          <div className="mt-1">
                            <label className="block text-[8px] font-mono text-white/55 mb-0.5">Horas Coordinación</label>
                            <input 
                              type="number"
                              min="0"
                              value={sem.coordinatorHours}
                              onChange={(e) => handleUpdateSemester(index, { coordinatorHours: parseInt(e.target.value) || 0 })}
                              className="w-full bg-white/5 border border-white/10 rounded px-2 py-0.5 text-xs text-white font-mono"
                            />
                          </div>
                        )}
                      </div>

                      {/* Goods & Services Breakdown */}
                      <div className="space-y-2 bg-white/5 p-3 rounded-lg border border-white/5">
                        <h4 className="text-[9px] font-bold text-[#ffcc29] uppercase tracking-wider mb-1">Gastos de Adquisición de Bienes y Servicios</h4>
                        
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <label className="block text-[8px] font-mono text-white/55 mb-0.5">Materiales/Suministros</label>
                            <input 
                              type="number"
                              min="0"
                              value={sem.goodsMaterials}
                              onChange={(e) => handleUpdateSemester(index, { goodsMaterials: parseInt(e.target.value) || 0 })}
                              className="w-full bg-white/5 border border-white/10 rounded px-2 py-0.5 text-xs text-white font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-[8px] font-mono text-white/55 mb-0.5">Viáticos/Transporte</label>
                            <input 
                              type="number"
                              min="0"
                              value={sem.goodsTravel}
                              onChange={(e) => handleUpdateSemester(index, { goodsTravel: parseInt(e.target.value) || 0 })}
                              className="w-full bg-white/5 border border-white/10 rounded px-2 py-0.5 text-xs text-white font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-[8px] font-mono text-white/55 mb-0.5">Licencias/Plataformas</label>
                            <input 
                              type="number"
                              min="0"
                              value={sem.goodsSoftware}
                              onChange={(e) => handleUpdateSemester(index, { goodsSoftware: parseInt(e.target.value) || 0 })}
                              className="w-full bg-white/5 border border-white/10 rounded px-2 py-0.5 text-xs text-white font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-[8px] font-mono text-white/55 mb-0.5">Logística/Eventos</label>
                            <input 
                              type="number"
                              min="0"
                              value={sem.goodsLogistics}
                              onChange={(e) => handleUpdateSemester(index, { goodsLogistics: parseInt(e.target.value) || 0 })}
                              className="w-full bg-white/5 border border-white/10 rounded px-2 py-0.5 text-xs text-white font-mono"
                            />
                          </div>
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

      {/* TAB 4: General Budget Report, Charts & Scenarios */}
      {activeSubTab === 'report' && (
        <div className="space-y-8">
          
          {/* Printable Report Wrapper */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8 space-y-6 bg-white/[0.01] print:bg-white print:border-none print:p-0 print:text-black">
            
            {/* Report Header */}
            <div className="border-b border-white/10 pb-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:border-black print:text-black">
              <div>
                <span className="text-[10px] font-mono font-bold text-[#ffcc29] uppercase tracking-wider print:text-[#ffcc29]">UNIVERSIDAD PEDAGÓGICA Y TECNOLÓGICA DE COLOMBIA</span>
                <h2 className="text-2xl font-display font-bold text-white mt-1 print:text-black">PRESUPUESTO GENERAL DEL PROGRAMA</h2>
                <p className="text-xs text-white/60 font-sans mt-0.5 print:text-black/60">
                  Estudio de Viabilidad Financiera Académica - Malla de <strong className="text-white print:text-black font-mono">{aggregatedTotals.programTotalCredits} cr.</strong>
                </p>
              </div>
              <div className="text-right">
                <span className="text-[9px] font-mono text-white/40 block print:text-black/40">Fecha de Reporte:</span>
                <strong className="text-xs font-mono text-white print:text-black">{new Date().toLocaleDateString()}</strong>
              </div>
            </div>

            {/* General Metadata Info Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white/5 p-4 rounded-xl border border-white/5 print:bg-black/5 print:border-black/10 print:text-black">
              <div>
                <span className="text-[9px] font-mono text-white/40 uppercase block print:text-black/50">Facultad</span>
                <strong className="text-xs text-white print:text-black">{facultad}</strong>
              </div>
              <div>
                <span className="text-[9px] font-mono text-white/40 uppercase block print:text-black/50">Programa Académico</span>
                <strong className="text-xs text-white print:text-black">{programa} ({level.toUpperCase()})</strong>
              </div>
              <div>
                <span className="text-[9px] font-mono text-white/40 uppercase block print:text-black/50">Año de Inicio</span>
                <strong className="text-xs text-white print:text-black font-mono">{anioInicio}</strong>
              </div>
              <div>
                <span className="text-[9px] font-mono text-white/40 uppercase block print:text-black/50">Modalidad</span>
                <strong className="text-xs text-white print:text-black capitalize">{modality}</strong>
              </div>
            </div>

            {/* Main Report Table */}
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
                      <td key={s.semesterLabel} className="p-3 text-right font-mono text-[#ffcc29] print:text-black">{s.newCohortStudents}</td>
                    ))}
                    <td className="p-3 text-right font-mono text-[#ffcc29] font-bold print:text-black">
                      {aggregatedTotals.totalActiveNewStudents}
                    </td>
                  </tr>

                  <tr className="hover:bg-white/[0.01]">
                    <td className="p-3 pl-6">Créditos Programados Semestre</td>
                    {calculatedSemesters.map(s => (
                      <td key={s.semesterLabel} className="p-3 text-right font-mono text-white/60 print:text-black/60">{s.programCreditsPerSemester} cr.</td>
                    ))}
                    <td className="p-3 text-right font-mono font-bold">{aggregatedTotals.programTotalCredits} cr.</td>
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
                    <td className="p-3 pl-6">Deducciones UPTC (MESI, Inv, Admín)</td>
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
                    <td className="p-3 pl-6">- Docentes hora cátedra</td>
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
                      <td key={s.semesterLabel} className="p-3 text-right font-mono">${Math.round(s.totalOperatingCosts / 1e6).toLocaleString()} M</td>
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

            {/* Diagnostic conclusions / signatures block */}
            <div className="pt-6 border-t border-white/10 flex flex-col md:flex-row justify-between gap-6 print:border-black print:text-black">
              <div className="max-w-xl text-[11px] text-white/60 leading-relaxed print:text-black/60">
                <span className="font-bold text-white block mb-1 print:text-black">Declaración de Viabilidad Financiera:</span>
                El presente informe certifica que el programa <strong className="text-white print:text-black">{programa}</strong> {
                  aggregatedTotals.isBalanced 
                    ? 'CUMPLE con el punto de equilibrio presupuestal. Los ingresos proyectados de la matrícula basados en créditos cubren holgadamente los costes de docencia, personal de apoyo y funcionamiento.' 
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

          {/* Graphics and sensitivity (Hidden on Print) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:hidden">
            
            <div className="glass-card rounded-2xl border border-white/10 p-5 bg-white/5">
              <h4 className="text-[10px] font-bold text-white uppercase tracking-wider mb-4">Ingresos vs Costos de Operación (Millones COP)</h4>
              <div className="h-64 min-w-[200px]">
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" fontSize={10} />
                    <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} unit="M" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#09090b', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}
                      labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                    />
                    <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="Ingresos Disponibles" fill="#4ade80" name="Ingresos" radius={[4, 4, 0, 0]} barSize={25} />
                    <Bar dataKey="Gastos Personal" fill="#f43f5e" name="Pers. Egresos" radius={[4, 4, 0, 0]} barSize={25} />
                    <Bar dataKey="Resultado Semestre" fill="#3b82f6" name="Balance Neto" radius={[4, 4, 0, 0]} barSize={25} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass-card rounded-2xl border border-white/10 p-5 bg-white/5">
              <h4 className="text-[10px] font-bold text-white uppercase tracking-wider mb-4">Distribución del Estatus de Egresos</h4>
              <div className="h-64 min-w-[200px] flex flex-col justify-between">
                <div className="h-44 relative flex items-center justify-center">
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie
                        data={expensePieChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={65}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        <Cell fill="#a78bfa" />
                        <Cell fill="#f59e0b" />
                        <Cell fill="#3b82f6" />
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
                      {Math.round(aggregatedTotals.totalExpenses / 1e6)}M
                    </p>
                  </div>
                </div>
                
                <div className="space-y-1 text-[10px] font-mono border-t border-white/5 pt-2">
                  <div className="flex justify-between items-center text-white/60">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-[#a78bfa]"></div>
                      <span>Docentes</span>
                    </div>
                    <strong>${Math.round(aggregatedTotals.totalTeachersCost / 1e6)}M</strong>
                  </div>
                  <div className="flex justify-between items-center text-white/60">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-[#3b82f6]"></div>
                      <span>CPS Apoyo</span>
                    </div>
                    <strong>${Math.round(aggregatedTotals.totalSupportStaffCost / 1e6)}M</strong>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Sensitivity Graph */}
          {sensitivityChartData.length > 0 && (
            <div className="glass-card rounded-2xl border border-white/10 p-5 bg-white/5 print:hidden">
              <h4 className="text-[10px] font-bold text-white uppercase tracking-wider mb-4">Análisis de Sensibilidad: Alumnos por Cohorte vs Balance Neto (COP)</h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={sensitivityChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="cohortSize" stroke="rgba(255,255,255,0.4)" fontSize={10} />
                    <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} unit="M" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#09090b', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}
                      labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                    />
                    <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px' }} />
                    <ReferenceLine y={0} stroke="#f43f5e" strokeWidth={1.5} strokeDasharray="3 3" label={{ value: 'Equilibrio (0 COP)', fill: '#f43f5e', fontSize: 9, position: 'top' }} />
                    <Line type="monotone" dataKey="Ingresos de Operación" stroke="#4ade80" strokeWidth={2} name="Ingresos" dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="Margen Final (M)" stroke="#3b82f6" strokeWidth={2.5} name="Balance" dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Scenario Comparison Tools */}
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
