import { useState, useMemo } from 'react';
import { 
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line, ReferenceLine
} from 'recharts';
import { 
  Filter, DollarSign, Activity, TrendingUp, RefreshCw, Compass,
  Layers, Wallet, HelpCircle, AlertTriangle, ShieldCheck, ArrowRight, 
  Download, Search, CheckCircle, Info, Users, GraduationCap, Percent, BookOpen, Settings, Save, Trash2, Printer, Plus, Bot, Send
} from 'lucide-react';

// Official UPTC Cost Tables (2025-2029) from the document
const UPTC_RATES = {
  // Valor hora cátedra posgrado
  pos_especializacion: { 2025: 142350, 2026: 150606, 2027: 161149, 2028: 172429, 2029: 184499 },
  pos_maestria: { 2025: 177938, 2026: 188258, 2027: 201436, 2028: 215536, 2029: 230624 },
  pos_doctorado: { 2025: 220643, 2026: 233440, 2027: 249781, 2028: 267265, 2029: 285974 },
  // Valor hora cátedra pregrado (puntos salariales)
  preg_auxiliar: { 2025: 55894, 2026: 59807, 2027: 63993, 2028: 68473, 2029: 73266 },
  preg_asistente: { 2025: 61484, 2026: 65787, 2027: 70393, 2028: 75320, 2029: 80592 },
  preg_asociado: { 2025: 67073, 2026: 71768, 2027: 76792, 2028: 82167, 2029: 87919 },
  preg_titular: { 2025: 78252, 2026: 83729, 2027: 89590, 2028: 95862, 2029: 102572 },
  // Valor punto
  valor_punto: { 2025: 22358, 2026: 23923, 2027: 25597, 2028: 27389, 2029: 29306 },
  // Administrativo mensual nómina pregrado
  adm_grado_14: { 2025: 2313840, 2026: 2475808, 2027: 2649115, 2028: 2834553, 2029: 3032972 },
  adm_grado_16: { 2025: 2491835, 2026: 2666264, 2027: 2852902, 2028: 3052605, 2029: 3266288 },
  sec_ejec_18: { 2025: 2607573, 2026: 2790103, 2027: 2985410, 2028: 3194389, 2029: 3417996 },
  sec_ejec_22: { 2025: 3049860, 2026: 3263350, 2027: 3491784, 2028: 3736209, 2029: 3997744 },
  // Profesional de apoyo posgrado
  prof_apoyo: { 2025: 3420000, 2026: 3659400, 2027: 3915558, 2028: 4189647, 2029: 4482922 }
};

type UPTCRateCategory = keyof typeof UPTC_RATES;

interface Asignatura {
  id: string;
  nombre: string;
  creditos: number;
  semestre: number; // 1 to 6
  teacherCategory: UPTCRateCategory; 
  teacherHours: number; 
  numTeachers: number; 
}

interface SemesterData {
  semesterLabel: string;
  newCohortStudents: number;
  votacionDiscountCount: number;
  monitoriaDiscountCount: number;
  honorDiscountCount: number;
  res16DiscountCount: number;
  otherDiscountCount: number;
  otherDiscountPct: number;
  
  // Other Income
  aspirantesCount: number;
  graduandosCount: number;
  otherRawIncome: number;
  
  // Staff quantities
  coordinatorMonths: number;
  supportStaffMonths: number;
  
  // Operating inputs
  goodsMaterials: number;
  goodsTravel: number;
  goodsSoftware: number;
  goodsLogistics: number;
  goodsOther: number;
}

interface SavedScenario {
  id: string;
  name: string;
  facultad: string;
  programa: string;
  anioInicio: number;
  minStudents: number;
  level: 'doctorado' | 'maestria' | 'especializacion' | 'medico_quirurgica';
  modality: 'presencial' | 'hibrido' | 'virtual';
  attritionPct: number;
  discountPct: number;
  hasCoordinator: boolean;
  coordinatorCategory: UPTCRateCategory;
  hasSupportStaff: boolean;
  supportStaffCategory: UPTCRateCategory;
  courses: Asignatura[];
  semesters: SemesterData[];
  
  // Calculated summaries
  totalIncome: number;
  totalCosts: number;
  utility: number;
  breakEvenCredits: number;
  breakEvenStudents: number;
}

// UPTC Article 21 Academic credit limits ranges configuration
const CREDIT_RANGES = {
  especializacion: { min: 24, max: 32, label: "Especialización" },
  medico_quirurgica: { min: 180, max: 250, label: "Especialidades Médico-Quirúrgicas" },
  maestria: { min: 40, max: 64, label: "Maestría" },
  doctorado: { min: 80, max: 150, label: "Doctorado" }
};

// Helper to retrieve and index rate
function getUPTCRate(category: UPTCRateCategory, year: number): number {
  const rates = UPTC_RATES[category];
  const targetYear = Math.max(2025, Math.min(2029, year));
  const baseVal = rates[targetYear as keyof typeof rates] || rates[2026 as keyof typeof rates];
  
  if (year > 2029) {
    return baseVal * Math.pow(1 + 0.08, year - 2029); 
  }
  return baseVal;
}

export function ProgramCostingScreen({ onNavigate }: { onNavigate: (s: string) => void }) {
  // Program Metadata
  const [facultad, setFacultad] = useState<string>("Facultad de Ciencias Económicas y Administrativas");
  const [programa, setPrograma] = useState<string>("Maestría en Administración de Empresas");
  const [anioInicio, setAnioInicio] = useState<number>(2026);
  const [minStudents, setMinStudents] = useState<number>(15);

  // Config state
  const [level, setLevel] = useState<'doctorado' | 'maestria' | 'especializacion' | 'medico_quirurgica'>('maestria');
  const [modality, setModality] = useState<'presencial' | 'hibrido' | 'virtual'>('presencial');
  const [attritionPct, setAttritionPct] = useState<number>(5);
  const [discountPct, setDiscountPct] = useState<number>(10);
  
  // Staff configuration
  const [hasCoordinator, setHasCoordinator] = useState<boolean>(true);
  const [coordinatorCategory, setCoordinatorCategory] = useState<UPTCRateCategory>("prof_apoyo");
  const [hasSupportStaff, setHasSupportStaff] = useState<boolean>(true);
  const [supportStaffCategory, setSupportStaffCategory] = useState<UPTCRateCategory>("adm_grado_14");

  // Financial base constants
  const [parafiscalFactor, setParafiscalFactor] = useState<number>(37.03); 

  // Administrator manual override controls
  const [isAdminOverride, setIsAdminOverride] = useState<boolean>(false);
  const [customCreditValue, setCustomCreditValue] = useState<number>(650000);

  // Malla Curricular (Courses)
  // Sum of credits: 3+4+4+4+4+3+4+3+3+4+3+3 = 42 credits (Satisfies Maestría Article 21 range 40-64 cr.)
  const [courses, setCourses] = useState<Asignatura[]>([
    // Semestre 1
    { id: 'c1', nombre: 'Metodología de la Investigación', creditos: 3, semestre: 1, teacherCategory: 'pos_maestria', teacherHours: 45, numTeachers: 1 },
    { id: 'c2', nombre: 'Fundamentos de Administración', creditos: 4, semestre: 1, teacherCategory: 'pos_maestria', teacherHours: 45, numTeachers: 1 },
    { id: 'c13', nombre: 'Microeconomía Aplicada', creditos: 4, semestre: 1, teacherCategory: 'pos_maestria', teacherHours: 40, numTeachers: 1 },
    // Semestre 2
    { id: 'c3', nombre: 'Gerencia Financiera', creditos: 4, semestre: 2, teacherCategory: 'pos_maestria', teacherHours: 45, numTeachers: 1 },
    { id: 'c4', nombre: 'Mercadeo Estratégico', creditos: 4, semestre: 2, teacherCategory: 'pos_maestria', teacherHours: 45, numTeachers: 1 },
    { id: 'c14', nombre: 'Macroeconomía Aplicada', creditos: 3, semestre: 2, teacherCategory: 'pos_maestria', teacherHours: 40, numTeachers: 1 },
    // Semestre 3
    { id: 'c5', nombre: 'Dirección de Operaciones', creditos: 4, semestre: 3, teacherCategory: 'pos_maestria', teacherHours: 45, numTeachers: 1 },
    { id: 'c6', nombre: 'Gestión del Talento Humano', creditos: 3, semestre: 3, teacherCategory: 'pos_especializacion', teacherHours: 45, numTeachers: 1 },
    { id: 'c15', nombre: 'Electiva de Énfasis I', creditos: 3, semestre: 3, teacherCategory: 'pos_especializacion', teacherHours: 36, numTeachers: 1 },
    // Semestre 4
    { id: 'c7', nombre: 'Seminario de Trabajo de Grado', creditos: 4, semestre: 4, teacherCategory: 'pos_doctorado', teacherHours: 45, numTeachers: 1 },
    { id: 'c8', nombre: 'Ética y Responsabilidad Social', creditos: 3, semestre: 4, teacherCategory: 'preg_titular', teacherHours: 45, numTeachers: 1 },
    { id: 'c16', nombre: 'Proyecto de Grado', creditos: 3, semestre: 4, teacherCategory: 'pos_doctorado', teacherHours: 36, numTeachers: 1 }
  ]);

  // Temp state for curriculum builder
  const [newCourseName, setNewCourseName] = useState<string>("");
  const [newCourseCredits, setNewCourseCredits] = useState<number>(3);
  const [newCourseSemester, setNewCourseSemester] = useState<number>(1);
  const [newCourseTeacherCategory, setNewCourseTeacherCategory] = useState<UPTCRateCategory>("pos_maestria");
  const [newCourseHours, setNewCourseHours] = useState<number>(45);

  const semestersLabels = ["2026-1", "2026-2", "2027-1", "2027-2", "2028-1", "2028-2"];

  // Default semesters state
  const [semesters, setSemesters] = useState<SemesterData[]>(() => {
    return semestersLabels.map((label, idx) => {
      const isStartSemester = idx === 0 || idx === 2;
      const initialSize = isStartSemester ? (idx === 0 ? 20 : 18) : 0;
      
      return {
        semesterLabel: label,
        newCohortStudents: initialSize,
        votacionDiscountCount: initialSize > 0 ? Math.ceil(initialSize * 0.3) : 0, 
        monitoriaDiscountCount: 0,
        honorDiscountCount: 0,
        res16DiscountCount: 0,
        otherDiscountCount: 0,
        otherDiscountPct: 50,
        aspirantesCount: initialSize > 0 ? Math.ceil(initialSize * 1.4) : 0,
        graduandosCount: idx === 3 ? 15 : idx === 5 ? 13 : 0,
        otherRawIncome: 0,
        
        coordinatorMonths: 6,
        supportStaffMonths: 6,
        
        // Operating inputs breakdown
        goodsMaterials: idx % 2 === 0 ? 3000000 : 2000000,
        goodsTravel: idx % 2 === 0 ? 2000000 : 1000000,
        goodsSoftware: idx % 2 === 0 ? 3000000 : 2500000,
        goodsLogistics: idx % 2 === 0 ? 2000000 : 1500000,
        goodsOther: idx % 2 === 0 ? 1000000 : 500000
      };
    });
  });

  const [activeSubTab, setActiveSubTab] = useState<'simulator' | 'pensum' | 'staff' | 'report' | 'assistant'>('simulator');
  const [newScenarioName, setNewScenarioName] = useState<string>("");

  // AI Assistant state
  const [chatMessages, setChatMessages] = useState<{ sender: 'user' | 'bot'; text: string }[]>([
    { sender: 'bot', text: '¡Hola! Soy tu asistente de costeo de posgrados UPTC. Pregúntame sobre el balance de este programa, el punto de equilibrio o cómo optimizar las variables financieras.' }
  ]);
  const [customQuestion, setCustomQuestion] = useState<string>("");

  // Base values mapping
  const baseCreditValue = useMemo(() => {
    switch (level) {
      case 'doctorado': return 900000;
      case 'maestria': return 630000;
      case 'especializacion': return 450000;
      case 'medico_quirurgica': return 500000; // default for medical specialties
      default: return 450000;
    }
  }, [level]);

  // Inscripcion is exactly 20% of a base Especializacion credit
  const valorInscripcion = useMemo(() => {
    return 450000 * 0.20; 
  }, []);

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

  // Credits map per semester
  const semesterCreditsMap = useMemo(() => {
    const map = new Map<number, number>();
    for (let sem = 1; sem <= 6; sem++) {
      const sum = courses.filter(c => c.semestre === sem).reduce((acc, curr) => acc + curr.creditos, 0);
      map.set(sem, sum);
    }
    return map;
  }, [courses]);

  // Validations & rules enforcement (including UPTC Article 21 credit limits)
  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    if (attritionPct < 0 || attritionPct > 100) errors.push("La tasa de deserción debe estar entre 0% y 100%.");
    if (discountPct < 0 || discountPct > 100) errors.push("El porcentaje de descuentos/becas debe estar entre 0% y 100%.");
    if (minStudents < 1) errors.push("El número mínimo de estudiantes debe ser al menos 1.");
    if (isAdminOverride && customCreditValue <= 0) errors.push("El valor del crédito personalizado debe ser mayor a 0.");
    
    // Check semester credit load minimum limit of 7 credits
    semesters.forEach((sem, idx) => {
      const semCredits = semesterCreditsMap.get(idx + 1) || 0;
      if (sem.newCohortStudents > 0 && semCredits < 7) {
        errors.push(`[Semestre ${sem.semesterLabel}] Ingreso de estudiantes programado pero la carga curricular (${semCredits} cr.) es inferior al mínimo institucional de 7 créditos por estudiante.`);
      }
    });

    // Check UPTC Article 21 credit range limits
    const totalProgramCredits = courses.reduce((sum, c) => sum + c.creditos, 0);
    const range = CREDIT_RANGES[level];
    if (range) {
      if (totalProgramCredits < range.min || totalProgramCredits > range.max) {
        errors.push(`[Artículo 21] El total de créditos del plan de estudios (${totalProgramCredits} cr.) está fuera del rango legal permitido para ${range.label} (${range.min} a ${range.max} créditos).`);
      }
    }

    return errors;
  }, [semesters, attritionPct, discountPct, minStudents, isAdminOverride, customCreditValue, semesterCreditsMap, courses, level]);

  // Semester Calculations
  const calculatedSemesters = useMemo(() => {
    const durationSemesters = level === 'especializacion' ? 2 : level === 'doctorado' ? 8 : level === 'medico_quirurgica' ? 6 : 4;
    const activeCohortStudents = Array.from({ length: 6 }, () => new Array(6).fill(0));
    
    // Cohorte modeling
    for (let i = 0; i < 6; i++) {
      const initial = semesters[i].newCohortStudents;
      if (initial > 0) {
        activeCohortStudents[i][i] = initial;
        for (let t = i + 1; t < 6; t++) {
          const age = t - i;
          if (age < durationSemesters) {
            activeCohortStudents[i][t] = activeCohortStudents[i][t - 1] * (1 - attritionPct / 100);
          }
        }
      }
    }

    return semesters.map((sem, t) => {
      const smmlv = getUPTCRate('adm_grado_14', anioInicio + Math.floor(t / 2)); 
      const currentYear = anioInicio + Math.floor(t / 2);
      
      const creditRate = finalCreditValue * (getUPTCRate('valor_punto', currentYear) / getUPTCRate('valor_punto', 2026)); 
      const programCreditsPerSemester = semesterCreditsMap.get(t + 1) || 0;
      
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

      // UPTC Deductions (45.5%)
      const deductionCentral = totalNetIncome * 0.40;
      const deductionResearch = totalNetIncome * 0.05;
      const deductionMesi = totalNetIncome * 0.005;
      const totalDeductions = deductionCentral + deductionResearch + deductionMesi;
      const functioningTuitionIncome = totalNetIncome - totalDeductions;

      // Other Income (Inscripción = 20% crédito Especialización, Grado = 1.0 SMMLV)
      const currentInscriptionFee = valorInscripcion * (getUPTCRate('valor_punto', currentYear) / getUPTCRate('valor_punto', 2026));
      const currentGraduationFee = getUPTCRate('valor_punto', currentYear) * 100; 
      
      const applicationIncome = sem.aspirantesCount * currentInscriptionFee;
      const graduationIncome = sem.graduandosCount * currentGraduationFee;
      const totalOtherIncome = applicationIncome + graduationIncome + sem.otherRawIncome;

      const totalFunctioningIncome = functioningTuitionIncome + totalOtherIncome;

      // Gastos Docencia: sum values from linked subjects belonging to this semester
      const semCourses = courses.filter(c => c.semestre === (t + 1));
      let semesterTeachersCost = 0;
      
      semCourses.forEach(c => {
        const ratePerHour = getUPTCRate(c.teacherCategory, currentYear);
        const singleCost = c.teacherHours * ratePerHour * (1 + parafiscalFactor / 100);
        semesterTeachersCost += c.numTeachers * singleCost;
      });

      // Coordinator Cost 
      let coordinatorCost = 0;
      if (hasCoordinator) {
        let coordMonthlyRate = 0;
        if (coordinatorCategory === 'doc_coordinador') {
          coordMonthlyRate = 7.0 * getUPTCRate('valor_punto', currentYear);
        } else {
          coordMonthlyRate = getUPTCRate(coordinatorCategory, currentYear);
        }
        coordinatorCost = coordMonthlyRate * sem.coordinatorMonths;
      }

      // Support Staff CPS Cost
      let supportStaffCost = 0;
      if (hasSupportStaff) {
        const supportCPSRate = getUPTCRate(supportStaffCategory, currentYear);
        supportStaffCost = supportCPSRate * sem.supportStaffMonths;
      }

      const totalStaffCosts = semesterTeachersCost + coordinatorCost + supportStaffCost;

      // Goods & Services Breakdown sum
      const totalOperatingCosts = sem.goodsMaterials + sem.goodsTravel + sem.goodsSoftware + sem.goodsLogistics + sem.goodsOther;

      const totalExpenses = totalStaffCosts + totalOperatingCosts;
      const budgetBalance = totalFunctioningIncome - totalExpenses;

      return {
        ...sem,
        currentYear,
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
        teachersCost: semesterTeachersCost,
        coordinatorCost,
        supportStaffCost,
        totalStaffCosts,
        totalOperatingCosts,
        totalExpenses,
        budgetBalance
      };
    });
  }, [semesters, level, attritionPct, finalCreditValue, courses, semesterCreditsMap, hasCoordinator, coordinatorCategory, hasSupportStaff, supportStaffCategory, parafiscalFactor, valorInscripcion, anioInicio]);

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

    let meetsMinStudentsEnrollment = true;
    semesters.forEach(s => {
      if (s.newCohortStudents > 0 && s.newCohortStudents < minStudents) {
        meetsMinStudentsEnrollment = false;
      }
    });

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
      isBalanced: !hasDeficitInAnySemester && meetsMinStudentsEnrollment && validationErrors.length === 0,
      numCohortes,
      totalActiveStudentSemesters,
      breakEvenCredits: Math.max(0, breakEvenCredits),
      breakEvenStudents: Math.max(0, breakEvenStudents),
      totalActiveNewStudents,
      programTotalCredits,
      meetsMinStudentsEnrollment
    };
  }, [calculatedSemesters, semesters, discountPct, courses, minStudents, validationErrors]);

  // Update semester inputs
  const handleUpdateSemester = (index: number, fields: Partial<SemesterData>) => {
    setSemesters(prev => prev.map((s, i) => i === index ? { ...s, ...fields } : s));
  };

  // Add course
  const handleAddCourse = () => {
    if (!newCourseName.trim()) return;
    const newCourse: Asignatura = {
      id: Date.now().toString(),
      nombre: newCourseName,
      creditos: newCourseCredits,
      semestre: newCourseSemester,
      teacherCategory: newCourseTeacherCategory,
      teacherHours: newCourseHours,
      numTeachers: 1
    };
    setCourses(prev => [...prev, newCourse]);
    setNewCourseName("");
  };

  // Delete course
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
    
    for (let cSize = 5; cSize <= 45; cSize += step) {
      let simulatedFunctioningIncome = 0;
      let simulatedTotalExpenses = 0;
      
      const durationSem = level === 'especializacion' ? 2 : level === 'doctorado' ? 8 : level === 'medico_quirurgica' ? 6 : 4;
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
  }, [semesters, calculatedSemesters, level, attritionPct, semesterCreditsMap, validationErrors]);

  // Scenario management actions
  const handleSaveScenario = () => {
    if (!newScenarioName.trim()) return;
    
    const scenario: SavedScenario = {
      id: Date.now().toString(),
      name: newScenarioName,
      facultad,
      programa,
      anioInicio,
      minStudents,
      level,
      modality,
      attritionPct,
      discountPct,
      hasCoordinator,
      coordinatorCategory,
      hasSupportStaff,
      supportStaffCategory,
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
    setMinStudents(scen.minStudents || 15);
    setLevel(scen.level);
    setModality(scen.modality);
    setAttritionPct(scen.attritionPct);
    setDiscountPct(scen.discountPct || 10);
    setHasCoordinator(scen.hasCoordinator);
    setCoordinatorCategory(scen.coordinatorCategory || 'prof_apoyo');
    setHasSupportStaff(scen.hasSupportStaff);
    setSupportStaffCategory(scen.supportStaffCategory || 'adm_grado_14');
    setCourses(scen.courses || []);
    setSemesters(scen.semesters);
    setActiveSubTab('simulator');
  };

  const handleDeleteScenario = (id: string) => {
    setSavedScenarios(prev => prev.filter(s => s.id !== id));
  };

  // AI Costing Assistant prompt triggers
  const handleAskQuestion = (questionText?: string) => {
    const q = questionText || customQuestion;
    if (!q.trim()) return;

    const newMsg = { sender: 'user' as const, text: q };
    setChatMessages(prev => [...prev, newMsg]);
    setCustomQuestion("");

    setTimeout(() => {
      let replyText = "";
      const qLower = q.toLowerCase();

      if (qLower.includes('margen') || qLower.includes('viabilidad') || qLower.includes('rentabilidad')) {
        replyText = `El programa '${programa}' en la facultad de '${facultad}' tiene una proyección de ingresos totales de $${Math.round(aggregatedTotals.totalFunctioningIncome).toLocaleString()} COP y egresos por $${Math.round(aggregatedTotals.totalExpenses).toLocaleString()} COP. La utilidad neta proyectada es de $${Math.round(aggregatedTotals.totalBalance).toLocaleString()} COP. ${
          aggregatedTotals.totalBalance > 10000000 
            ? "El programa es altamente viable con un margen del " + ((aggregatedTotals.totalBalance / aggregatedTotals.totalFunctioningIncome) * 100).toFixed(1) + "%." 
            : "El programa se encuentra en zona de riesgo o déficit. Se aconseja revisar los meses de apoyo CPS o aumentar la matrícula mínima."
        }`;
      } else if (qLower.includes('punto de equilibrio') || qLower.includes('equilibrio') || qLower.includes('estudiantes mínimos')) {
        replyText = `Para alcanzar el punto de equilibrio en la modalidad '${modality}', el programa requiere matricular un mínimo de ${aggregatedTotals.breakEvenCredits} créditos en total de manera agregada, lo que equivale a una cohorte mínima con carga completa de ${aggregatedTotals.breakEvenStudents} estudiantes pagando matrícula plena (con ${discountPct}% de descuentos promedio). Actualmente tienes simulada una cohorte inicial de ${semesters[0].newCohortStudents} alumnos.`;
      } else if (qLower.includes('docentes') || qLower.includes('nómina') || qLower.includes('horas')) {
        replyText = `El costo total docente del programa es de $${Math.round(aggregatedTotals.totalTeachersCost).toLocaleString()} COP. Tienes ${courses.length} asignaturas vinculadas. El docente más costoso pertenece a la categoría Cátedra Doctorado ($${getUPTCRate('pos_doctorado', anioInicio).toLocaleString()} COP/hora base). Para optimizar, podrías reasignar clases teóricas básicas a docentes de escalafón Maestría o Pregrado Titular para reducir el costo hora.`;
      } else if (qLower.includes('deducciones') || qLower.includes('central') || qLower.includes('45.5')) {
        replyText = `La UPTC aplica una retención legal total del 45.5% sobre la matrícula neta de posgrado: 40% para la Administración Central, 5% para Fomento de Investigación y 0.5% para MESI. Esto reduce tus ingresos de matrícula disponibles para funcionamiento a $${Math.round((aggregatedTotals.totalNetIncome - aggregatedTotals.totalDeductions)).toLocaleString()} COP en total.`;
      } else {
        replyText = `Basado en los metadatos de '${programa}' con inicio en ${anioInicio}: posees ${aggregatedTotals.numCohortes} cohortes y ${courses.length} asignaturas. El balance neto acumulado es de $${Math.round(aggregatedTotals.totalBalance).toLocaleString()} COP. Si posees dudas sobre rubros o personal, indícamelo y realizaré una corrida de sensibilidad.`;
      }

      setChatMessages(prev => [...prev, { sender: 'bot' as const, text: replyText }]);
    }, 450);
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
            Estructuración de matrículas y egresos homologado a la UPTC. Relacione el cuerpo docente directamente con las asignaturas de la malla curricular.
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

      {/* Warning: Minimum students not met in some cohorte */}
      {!aggregatedTotals.meetsMinStudentsEnrollment && validationErrors.length === 0 && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex gap-3 text-amber-400 print:hidden">
          <AlertTriangle className="shrink-0 mt-0.5" size={20} />
          <div className="text-xs">
            <p className="font-bold">Alerta de Sostenibilidad de Cohorte:</p>
            <p className="mt-0.5">Uno o más periodos semestrales simulados poseen una cohorte inferior al <strong>aforo mínimo de {minStudents} estudiantes</strong> configurado para el programa.</p>
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
            <span className="text-[10px] font-mono uppercase tracking-wider text-white/55">Viabilidad Presupuestal</span>
            <div className="flex justify-between items-end mt-2">
              <h3 className="text-2xl font-display font-bold font-mono text-white">
                {aggregatedTotals.totalBalance >= 0 ? '+' : ''}{(aggregatedTotals.totalBalance / 1e6).toFixed(2)} M
              </h3>
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                aggregatedTotals.isBalanced ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
              }`}>
                {aggregatedTotals.isBalanced ? 'Viable' : 'No Viable'}
              </span>
            </div>
            <p className="text-[10px] text-on-surface-variant font-sans mt-2">
              {aggregatedTotals.isBalanced 
                ? "El programa cubre sus costos y cumple con los aforos mínimos requeridos." 
                : "No cumple con balances positivos o cohorte mínima en semestres."}
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-white/10 bg-white/5 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-white/55">Pto de Equilibrio (Créditos)</span>
              <h3 className="text-2xl font-display font-bold font-mono text-[#ffcc29] mt-2">
                {aggregatedTotals.breakEvenCredits} <span className="text-xs text-white/40 font-normal">créditos</span>
              </h3>
            </div>
            <span className="text-[9px] text-white/40 font-mono mt-3">
              Malla curricular total: {aggregatedTotals.programTotalCredits} cr.
            </span>
          </div>

          <div className="p-5 rounded-2xl border border-white/10 bg-white/5 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-white/55">Aforo Mínimo Requerido</span>
              <h3 className="text-2xl font-display font-bold font-mono text-white mt-2">
                {minStudents} <span className="text-xs text-white/40 font-normal">alumnos</span>
              </h3>
            </div>
            <span className="text-[9px] text-white/40 font-mono mt-3">
              Frente a {aggregatedTotals.breakEvenStudents} estudiantes para punto de equilibrio.
            </span>
          </div>

          <div className="p-5 rounded-2xl border border-white/10 bg-white/5 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-white/55">Costo Inscripción</span>
              <h3 className="text-2xl font-display font-bold font-mono text-white mt-2">
                ${Math.round(valorInscripcion).toLocaleString()} <span className="text-xs text-white/40 font-normal">COP</span>
              </h3>
            </div>
            <span className="text-[9px] text-white/40 font-mono mt-3">
              Fijado en 20% de un crédito de Especialización.
            </span>
          </div>

        </div>
      )}

      {/* Sub tabs selector (Hidden on Print) */}
      <div className="flex border-b border-white/10 gap-2 overflow-x-auto print:hidden">
        {[
          { id: 'simulator', label: '1. Configuración e Ingresos', icon: Users },
          { id: 'pensum', label: '2. Pensum y Docentes Asignados', icon: BookOpen },
          { id: 'staff', label: '3. Administrativos y Apoyo', icon: Wallet },
          { id: 'report', label: '4. Presupuesto General', icon: Activity },
          { id: 'assistant', label: '5. Asistente IA Financiero', icon: Bot }
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

      {/* TAB 1: Configuration, Level & Overlapping Cohortes */}
      {activeSubTab === 'simulator' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:hidden">
          
          {/* Settings panel (Left) */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Metadata Fields */}
            <div className="glass-card rounded-2xl border border-white/10 p-6 bg-white/5 space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-white/5 pb-2.5">
                Metadatos del Programa
              </h3>

              <div className="space-y-3.5">
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
                  <label className="block text-[9px] font-mono text-white/55 uppercase tracking-wider mb-1">Nombre del Programa</label>
                  <input 
                    type="text" 
                    value={programa} 
                    onChange={(e) => setPrograma(e.target.value)}
                    className="w-full bg-[#0f172a] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-mono text-white/55 uppercase tracking-wider mb-1">Año Inicio</label>
                    <input 
                      type="number" 
                      value={anioInicio} 
                      onChange={(e) => setAnioInicio(parseInt(e.target.value) || 2026)}
                      className="w-full bg-[#0f172a] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-mono text-white/55 uppercase tracking-wider mb-1">Mín. Estudiantes</label>
                    <input 
                      type="number" 
                      value={minStudents} 
                      onChange={(e) => setMinStudents(parseInt(e.target.value) || 15)}
                      className="w-full bg-[#0f172a] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Level Settings */}
            <div className="glass-card rounded-2xl border border-white/10 p-6 bg-white/5 space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-white/5 pb-2.5">
                Variables de Proyección
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-mono text-on-surface-variant uppercase tracking-wider mb-1.5">Nivel</label>
                  <select 
                    value={level} 
                    onChange={(e) => setLevel(e.target.value as any)}
                    className="w-full bg-[#0f172a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="especializacion">Especialización (Base: $450.000 / Cred.)</option>
                    <option value="medico_quirurgica">Especialidad Médico-Quirúrgica (Base: $500.000 / Cred.)</option>
                    <option value="maestria">Maestría (Base: $630.000 / Cred.)</option>
                    <option value="doctorado">Doctorado (Base: $900.000 / Cred.)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-on-surface-variant uppercase tracking-wider mb-1.5">Modalidad</label>
                  <select 
                    value={modality} 
                    onChange={(e) => setModality(e.target.value as any)}
                    className="w-full bg-[#0f172a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="presencial">Presencial (100% tarifa)</option>
                    <option value="hibrido">Híbrido (85% tarifa)</option>
                    <option value="virtual">Virtual (70% tarifa)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-mono text-on-surface-variant uppercase tracking-wider mb-1.5">Deserción %</label>
                    <input 
                      type="number" 
                      min="0"
                      max="100"
                      value={attritionPct} 
                      onChange={(e) => setAttritionPct(parseInt(e.target.value) || 0)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-on-surface-variant uppercase tracking-wider mb-1.5">Descuentos %</label>
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
            </div>

          </div>

          {/* Semesters cohortes size input */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-card rounded-2xl border border-white/10 p-6 bg-white/5 space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-white/5 pb-2">
                Simulación de Ingreso por Semestre (Nuevos Alumnos)
              </h3>

              <div className="space-y-4">
                {semesters.map((sem, index) => {
                  const semCredits = semesterCreditsMap.get(index + 1) || 0;
                  const isLoadInvalid = sem.newCohortStudents > 0 && semCredits < 7;
                  const isCohortMinInvalid = sem.newCohortStudents > 0 && sem.newCohortStudents < minStudents;
                  
                  return (
                    <div key={index} className={`border rounded-xl p-4.5 space-y-3 transition-all ${
                      isLoadInvalid || isCohortMinInvalid 
                        ? 'bg-rose-500/5 border-rose-500/30' 
                        : 'bg-white/[0.02] border-white/5'
                    }`}>
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-white/5 pb-1">
                        <span className="text-xs font-bold text-white font-mono flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${isLoadInvalid || isCohortMinInvalid ? 'bg-rose-500' : 'bg-[#ffcc29]'}`}></span> Periodo Semestral {sem.semesterLabel}
                        </span>
                        <div className="flex gap-3 text-[10px] font-mono text-white/40">
                          <span>Créditos Semestre: <strong className={semCredits >= 7 ? 'text-[#ffcc29]' : 'text-rose-400 font-bold'}>{semCredits} cr.</strong></span>
                          <span>Est. Activos: <strong className="text-[#4ade80]">{calculatedSemesters[index].activeStudents.toFixed(1)}</strong></span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        
                        <div>
                          <label className="block text-[8px] font-mono text-white/55 mb-0.5">Estudiantes Nuevos (Cohorte)</label>
                          <input 
                            type="number"
                            min="0"
                            value={sem.newCohortStudents}
                            onChange={(e) => handleUpdateSemester(index, { newCohortStudents: parseInt(e.target.value) || 0 })}
                            className="w-full bg-white/5 border border-white/10 rounded px-2.5 py-1 text-xs text-white font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-[8px] font-mono text-white/55 mb-0.5">Descuento Votación (Alumnos)</label>
                          <input 
                            type="number"
                            min="0"
                            value={sem.votacionDiscountCount}
                            onChange={(e) => handleUpdateSemester(index, { votacionDiscountCount: parseInt(e.target.value) || 0 })}
                            className="w-full bg-white/5 border border-white/10 rounded px-2.5 py-1 text-xs text-white font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-[8px] font-mono text-white/55 mb-0.5">Aspirantes (Inscripciones)</label>
                          <input 
                            type="number"
                            min="0"
                            value={sem.aspirantesCount}
                            onChange={(e) => handleUpdateSemester(index, { aspirantesCount: parseInt(e.target.value) || 0 })}
                            className="w-full bg-white/5 border border-white/10 rounded px-2.5 py-1 text-xs text-white font-mono"
                          />
                        </div>

                      </div>

                      {isLoadInvalid && (
                        <div className="text-[10px] text-rose-400 font-bold bg-rose-500/10 p-2 rounded border border-rose-500/20">
                          ⚠️ Carga curricular semestral insuficiente ({semCredits} cr.). Vaya a la pestaña "Pensum" e ingrese asignaturas para cumplir con el mínimo de 7 créditos por estudiante.
                        </div>
                      )}

                      {isCohortMinInvalid && (
                        <div className="text-[10px] text-amber-400 font-bold bg-amber-500/10 p-2 rounded border border-amber-500/20">
                          ⚠️ El número de alumnos ingresados ({sem.newCohortStudents}) es inferior al mínimo definido para la viabilidad de la cohorte ({minStudents} alumnos).
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

      {/* TAB 2: Curriculum (Pensum) and Linked Docentes */}
      {activeSubTab === 'pensum' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:hidden">
          
          {/* Add asignatura and teacher panel */}
          <div className="lg:col-span-1 space-y-6">
            <div className="glass-card rounded-2xl border border-white/10 p-6 bg-white/5 space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-white/5 pb-2.5">
                Agregar Asignatura y Docente
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-mono text-white/55 uppercase mb-1">Nombre de Asignatura</label>
                  <input 
                    type="text" 
                    placeholder="ej. Mercadeo Estratégico"
                    value={newCourseName}
                    onChange={(e) => setNewCourseName(e.target.value)}
                    className="w-full bg-[#0f172a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
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
                      className="w-full bg-[#0f172a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
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

                <div>
                  <label className="block text-[10px] font-mono text-white/55 uppercase mb-1">Categoría del Docente</label>
                  <select 
                    value={newCourseTeacherCategory}
                    onChange={(e) => setNewCourseTeacherCategory(e.target.value as any)}
                    className="w-full bg-[#0f172a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="pos_especializacion">Posgrado Especialización (10% SMMLV)</option>
                    <option value="pos_maestria">Posgrado Maestría (12.5% SMMLV)</option>
                    <option value="pos_doctorado">Posgrado Doctorado (15.5% SMMLV)</option>
                    <option value="preg_auxiliar">Pregrado Auxiliar (2.5 Pts)</option>
                    <option value="preg_asistente">Pregrado Asistente (2.75 Pts)</option>
                    <option value="preg_asociado">Pregrado Asociado (3.0 Pts)</option>
                    <option value="preg_titular">Pregrado Titular (3.5 Pts)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-white/55 uppercase mb-1">Horas Cátedra Totales</label>
                  <input 
                    type="number" 
                    min="1"
                    value={newCourseHours}
                    onChange={(e) => setNewCourseHours(parseInt(e.target.value) || 45)}
                    className="w-full bg-[#0f172a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>

                <button
                  onClick={handleAddCourse}
                  disabled={!newCourseName.trim()}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#ffcc29] hover:bg-[#ffcc29]/90 text-black font-bold text-xs rounded-xl cursor-pointer transition-all disabled:opacity-50"
                >
                  <Plus size={14} /> Registrar Asignatura
                </button>
              </div>
            </div>
          </div>

          {/* Pensum Malla Curricular details list */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-card rounded-2xl border border-white/10 p-6 bg-white/5 space-y-4">
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Malla de Asignaturas y Docentes Vinculados
                </h3>
                <span className="text-[10px] text-white/40 font-mono">Plan Curricular y Horas</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/5 text-white font-bold font-sans">
                      <th className="p-3">Asignatura</th>
                      <th className="p-3 text-center">Sem.</th>
                      <th className="p-3 text-center">Créditos</th>
                      <th className="p-3">Docente Escalafón</th>
                      <th className="p-3 text-center">Horas</th>
                      <th className="p-3 text-right">Costo Cátedra (2026)</th>
                      <th className="p-3 text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-white/80 font-sans">
                    {courses.map((course) => {
                      const ratePerHour2026 = getUPTCRate(course.teacherCategory, 2026);
                      const loadedCost2026 = course.teacherHours * ratePerHour2026 * (1 + parafiscalFactor / 100);
                      
                      return (
                        <tr key={course.id} className="hover:bg-white/[0.02]">
                          <td className="p-3 font-semibold text-white">{course.nombre}</td>
                          <td className="p-3 text-center font-mono">{course.semestre}</td>
                          <td className="p-3 text-center font-mono text-[#ffcc29] font-bold">{course.creditos} cr.</td>
                          <td className="p-3 capitalize text-white/60">
                            {course.teacherCategory.replace('pos_', 'Posgrado ').replace('preg_', 'Pregrado ')}
                          </td>
                          <td className="p-3 text-center font-mono">{course.teacherHours} hrs</td>
                          <td className="p-3 text-right font-mono text-rose-300">
                            ${Math.round(loadedCost2026).toLocaleString()}
                          </td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => handleDeleteCourse(course.id)}
                              className="p-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded transition cursor-pointer"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* TAB 3: Administrative and Apoyo costs settings */}
      {activeSubTab === 'staff' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:hidden">
          
          {/* Apoyo Configuration */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Coordinator Settings */}
            <div className="glass-card rounded-2xl border border-white/10 p-6 bg-white/5 space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Docente Coordinador
                </h3>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={hasCoordinator} 
                    onChange={(e) => setHasCoordinator(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#ffcc29]"></div>
                </label>
              </div>

              {hasCoordinator && (
                <div className="space-y-4 animate-in slide-in-from-top-1 duration-200">
                  <div>
                    <label className="block text-[9px] font-mono text-white/55 uppercase mb-1">Escalafón Coordinación</label>
                    <select 
                      value={coordinatorCategory} 
                      onChange={(e) => setCoordinatorCategory(e.target.value as any)}
                      className="w-full bg-[#0f172a] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
                    >
                      <option value="doc_coordinador">Docente Coordinador (7 Puntos Incremento)</option>
                      <option value="prof_apoyo">Profesional de Apoyo Posgrado</option>
                      <option value="adm_grado_14">Auxiliar Grado 14</option>
                      <option value="adm_grado_16">Auxiliar Grado 16</option>
                      <option value="sec_ejec_18">Secretario/Auxiliar Grado 18</option>
                      <option value="sec_ejec_22">Secretario Grado 22</option>
                    </select>
                  </div>
                  
                  <div className="p-3 bg-white/5 rounded-xl text-xs font-mono text-white/60">
                    Sueldo Mensual (2026): <strong className="text-[#ffcc29]">${Math.round(coordinatorCategory === 'doc_coordinador' ? 7.0 * getUPTCRate('valor_punto', 2026) : getUPTCRate(coordinatorCategory, 2026)).toLocaleString()} COP</strong>
                  </div>
                </div>
              )}
            </div>

            {/* Support CPS Settings */}
            <div className="glass-card rounded-2xl border border-white/10 p-6 bg-white/5 space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Profesional de Apoyo (CPS)
                </h3>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={hasSupportStaff} 
                    onChange={(e) => setHasSupportStaff(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#ffcc29]"></div>
                </label>
              </div>

              {hasSupportStaff && (
                <div className="space-y-4 animate-in slide-in-from-top-1 duration-200">
                  <div>
                    <label className="block text-[9px] font-mono text-white/55 uppercase mb-1">Escalafón Apoyo CPS</label>
                    <select 
                      value={supportStaffCategory} 
                      onChange={(e) => setSupportStaffCategory(e.target.value as any)}
                      className="w-full bg-[#0f172a] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
                    >
                      <option value="prof_apoyo">Profesional de Apoyo Posgrado</option>
                      <option value="adm_grado_14">Auxiliar Grado 14</option>
                      <option value="adm_grado_16">Auxiliar Grado 16</option>
                      <option value="sec_ejec_18">Secretario/Auxiliar Grado 18</option>
                      <option value="sec_ejec_22">Secretario Grado 22</option>
                    </select>
                  </div>
                  
                  <div className="p-3 bg-white/5 rounded-xl text-xs font-mono text-white/60">
                    Sueldo Mensual (2026): <strong className="text-[#ffcc29]">${Math.round(getUPTCRate(supportStaffCategory, 2026)).toLocaleString()} COP</strong>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Semesters detailed goods breakdown */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-card rounded-2xl border border-white/10 p-6 bg-white/5 space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-white/5 pb-2">
                Adquisición de Bienes y Servicios Operativos
              </h3>

              <div className="space-y-4">
                {semesters.map((sem, index) => (
                  <div key={index} className="bg-white/[0.02] border border-white/5 rounded-xl p-4.5 space-y-3">
                    
                    <div className="flex justify-between items-center border-b border-white/5 pb-1">
                      <span className="text-xs font-bold text-white font-mono flex items-center gap-2">
                        <span className="w-2 h-2 bg-rose-400 rounded-full"></span> Adquisición Semestre {sem.semesterLabel}
                      </span>
                      <span className="text-[10px] font-mono text-white/40">
                        Total Compras: <strong className="text-rose-300">${Math.round(calculatedSemesters[index].totalOperatingCosts).toLocaleString()} COP</strong>
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      <div>
                        <label className="block text-[8px] font-mono text-white/55 mb-0.5">Materiales</label>
                        <input 
                          type="number"
                          min="0"
                          value={sem.goodsMaterials}
                          onChange={(e) => handleUpdateSemester(index, { goodsMaterials: parseInt(e.target.value) || 0 })}
                          className="w-full bg-white/5 border border-white/10 rounded px-2.5 py-0.5 text-xs text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[8px] font-mono text-white/55 mb-0.5">Viáticos/Transporte</label>
                        <input 
                          type="number"
                          min="0"
                          value={sem.goodsTravel}
                          onChange={(e) => handleUpdateSemester(index, { goodsTravel: parseInt(e.target.value) || 0 })}
                          className="w-full bg-white/5 border border-white/10 rounded px-2.5 py-0.5 text-xs text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[8px] font-mono text-white/55 mb-0.5">Licencias/Plataformas</label>
                        <input 
                          type="number"
                          min="0"
                          value={sem.goodsSoftware}
                          onChange={(e) => handleUpdateSemester(index, { goodsSoftware: parseInt(e.target.value) || 0 })}
                          className="w-full bg-white/5 border border-white/10 rounded px-2.5 py-0.5 text-xs text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[8px] font-mono text-white/55 mb-0.5">Logística/Eventos</label>
                        <input 
                          type="number"
                          min="0"
                          value={sem.goodsLogistics}
                          onChange={(e) => handleUpdateSemester(index, { goodsLogistics: parseInt(e.target.value) || 0 })}
                          className="w-full bg-white/5 border border-white/10 rounded px-2.5 py-0.5 text-xs text-white font-mono"
                        />
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      )}

      {/* TAB 4: Presupuesto General Consolidado */}
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
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 bg-white/5 p-4 rounded-xl border border-white/5 print:bg-black/5 print:border-black/10 print:text-black">
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
                <span className="text-[9px] font-mono text-white/40 uppercase block print:text-black/50">Mín. Estudiantes</span>
                <strong className="text-xs text-white print:text-black font-mono">{minStudents} alumnos</strong>
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

                  <tr className="hover:bg-white/[0.01] text-white/60 print:text-black/60">
                    <td className="p-3 pl-6">Otros Ingresos (Inscripción al 20%)</td>
                    {calculatedSemesters.map(s => (
                      <td key={s.semesterLabel} className="p-3 text-right font-mono">${Math.round(s.totalOtherIncome / 1e6).toLocaleString()} M</td>
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

            {/* Signature Block */}
            <div className="pt-6 border-t border-white/10 flex flex-col md:flex-row justify-between gap-6 print:border-black print:text-black">
              <div className="max-w-xl text-[11px] text-white/60 leading-relaxed print:text-black/60">
                <span className="font-bold text-white block mb-1 print:text-black">Declaración de Sostenibilidad de Cohorte:</span>
                El presente informe del plan presupuestal de <strong className="text-white print:text-black">{programa}</strong> {
                  aggregatedTotals.isBalanced 
                    ? 'CERTIFICA la viabilidad financiera institucional, alcanzando el punto de equilibrio en créditos y cumpliendo con el aforo mínimo de cohorte establecido.' 
                    : 'NO CERTIFICA viabilidad en las variables simuladas. Se sugiere un incremento de aranceles académicos, reducción de CPS de apoyo o incremento del aforo mínimo.'
                }
              </div>
              
              <div className="w-56 space-y-8 pt-4">
                <div className="border-t border-white/20 pt-1 text-center font-mono text-[9px] text-white/40 print:border-black print:text-black">
                  Firma Planeación VAFI UPTC
                </div>
              </div>
            </div>

          </div>

          {/* Recharts graphics (Hidden on Print) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:hidden">
            
            <div className="glass-card rounded-2xl border border-white/10 p-5 bg-white/5">
              <h4 className="text-[10px] font-bold text-white uppercase tracking-wider mb-4">Ingresos vs Costos de Operación (M COP)</h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" fontSize={9} />
                    <YAxis stroke="rgba(255,255,255,0.4)" fontSize={9} unit="M" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#09090b', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}
                    />
                    <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="Ingresos Disponibles" fill="#4ade80" name="Ingresos" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="Gastos Personal" fill="#f43f5e" name="Personal" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="Resultado Semestre" fill="#3b82f6" name="Balance" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass-card rounded-2xl border border-white/10 p-5 bg-white/5">
              <h4 className="text-[10px] font-bold text-white uppercase tracking-wider mb-4">Distribución del Estatus de Egresos</h4>
              <div className="h-64 flex flex-col justify-between">
                <div className="h-40 relative flex items-center justify-center">
                  <ResponsiveContainer width="100%" height={150}>
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
                      <Tooltip formatter={(val: number) => `$${Math.round(val / 1e6)} M`} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute text-center">
                    <span className="text-[8px] uppercase tracking-wider text-white/30 font-mono">Gastos</span>
                    <p className="text-sm font-bold text-white font-mono">
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
                      <span>Apoyo CPS</span>
                    </div>
                    <strong>${Math.round(aggregatedTotals.totalSupportStaffCost / 1e6)}M</strong>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Scenario Comparison Table */}
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

      {/* TAB 5: AI Assistant Tab */}
      {activeSubTab === 'assistant' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:hidden">
          
          {/* Preset Prompts Panel (Left) */}
          <div className="lg:col-span-1 space-y-4">
            <div className="glass-card rounded-2xl border border-white/10 p-6 bg-white/5 space-y-3.5">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-white/5 pb-2">
                Preguntas Frecuentes de Costeo
              </h3>
              
              <div className="flex flex-col gap-2">
                {[
                  "¿Cómo alcanzar el punto de equilibrio?",
                  "Analizar la viabilidad y el margen del programa",
                  "¿Qué pasa si asigno docentes categoría doctorado?",
                  "Explicar la retención del 45.5% de la UPTC"
                ].map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAskQuestion(prompt)}
                    className="w-full text-left p-3 bg-white/5 hover:bg-white/10 text-white border border-white/5 rounded-xl text-xs font-semibold font-sans cursor-pointer transition-all"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4.5 bg-[#ffcc29]/5 border border-[#ffcc29]/20 rounded-2xl text-xs space-y-2">
              <span className="font-bold text-[#ffcc29] flex items-center gap-1.5"><Info size={14} /> Asesor Curricular:</span>
              <p className="text-white/70 leading-relaxed text-[11px]">
                El Asistente analiza en tiempo real todas las variables locales (estudiantes mínimos, asignaturas, tipo de docente cátedra) y provee diagnósticos económicos instantáneos.
              </p>
            </div>
          </div>

          {/* Interactive Chat Console (Right) */}
          <div className="lg:col-span-2">
            <div className="glass-card rounded-2xl border border-white/10 bg-white/5 h-[480px] flex flex-col justify-between overflow-hidden">
              
              {/* Chat messages viewport */}
              <div className="flex-1 p-5 overflow-y-auto space-y-4">
                {chatMessages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-3.5 rounded-2xl text-xs leading-relaxed font-sans ${
                      msg.sender === 'user' 
                        ? 'bg-[#ffcc29] text-black font-bold rounded-tr-none' 
                        : 'bg-white/10 text-white rounded-tl-none border border-white/5'
                    }`}>
                      {msg.sender === 'bot' && (
                        <div className="flex items-center gap-1.5 text-[#ffcc29] font-mono text-[9px] uppercase tracking-wider mb-1 font-bold">
                          <Bot size={13} /> Asistente IA Costeo
                        </div>
                      )}
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>

              {/* Chat Input Bar */}
              <div className="p-4 border-t border-white/5 bg-[#0f172a]/60 flex gap-2">
                <input 
                  type="text"
                  placeholder="Escriba su consulta financiera..."
                  value={customQuestion}
                  onChange={(e) => setCustomQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAskQuestion()}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-[#ffcc29]"
                />
                <button
                  onClick={() => handleAskQuestion()}
                  disabled={!customQuestion.trim()}
                  className="p-3 bg-[#ffcc29] hover:bg-[#ffcc29]/90 disabled:opacity-50 text-black rounded-xl transition-all cursor-pointer"
                >
                  <Send size={15} />
                </button>
              </div>

            </div>
          </div>

        </div>
      )}

    </div>
  );
}
