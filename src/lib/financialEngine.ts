import { getRecursoEquivalence, RESOURCES_LIST, getTipoRecursoBalance } from './resourceMapper';
import { RECURSOS_FIJOS_RESOLUCION } from './constants';

export const BUDGET_PAYROLL_2026 = 369650433862; // Master Budget for Payroll ($369.650,4M COP)
export const PAYROLL_REAL_ENE_JUL = 172115462719.57; // Paid Payroll Ene-Jul ($172.115,5M)
export const PAYROLL_REMAINING_AGO_DIC = 197534971142.43; // Remaining Payroll Ago-Dic ($197.535,0M)

// GOOBI REAL DATA TO AUGUST 25, 2026
export const GOOBI_REAL_RECAUDO_AGO25 = 338186.9; // $338.186,9M COP
export const GOOBI_REAL_COMPROMISOS_AGO25 = 312078.1; // $312.078,1M COP
export const GOOBI_REAL_PAGOS_AGO25 = 246751.6; // $246.751,6M COP
export const GOOBI_BRECHA_FUNCIONAMIENTO_AGO25 = 67417.2; // $67.417,2M COP (Comprometido $115.154,4M vs Pagado $47.737,2M)

export function getRowUnidad(row: any, year: number): string {
  if (year === 2026) {
    const vig = String(row['Vigencia'] || '').trim();
    if (vig.includes(' - ') || vig.toLowerCase().includes('administrativa') || vig.toLowerCase().includes('seccional') || vig.toLowerCase().includes('ciencias') || vig.toLowerCase().includes('educacion') || vig.toLowerCase().includes('ingenieria') || vig.toLowerCase().includes('aguazul') || vig.toLowerCase().includes('investigacion')) {
      return vig;
    }
  }
  return String(row['Unidad'] || row['Dependencia'] || row['dependencia'] || '').trim();
}

export const PAYROLL_AGO_DIC_WEIGHTS = [
  0.1555, // Ago (15.55%)
  0.1585, // Sep (15.85%)
  0.1610, // Oct (16.10%)
  0.1650, // Nov (16.50%)
  0.3600  // Dic (36.00%)
];

// --- EICE-2026 & CORTE AGOSTO 25 INTERFACES ---

export interface RentItem {
  code: string;
  name: string;
  rentA_Actuals: number;
  rentB_Budget: number;
  varianceM: number;
  variancePct: number;
  qualitativeThreshold: 'OPTIMO' | 'ALERTA' | 'DEFICIT';
}

export interface AcreenciaASA {
  id: string;
  subcuenta: string;
  acreedorNombre: string;
  acreedorNit: string;
  acreedorEmail: string;
  acreedorTelefono: string;
  acreedorDomicilio: string;
  grupoAcreencia: '1. Laboral' | '2. Pública' | '3. Financiera' | '4. Comercial' | '5. Otros';
  concepto: string;
  documentoSoporte: string;
  cdpNumero: string;
  rpNumero: string;
  fechaVencimiento: string;
  valorBruto: number;
  descuentosDeducciones: number;
  saldoInicial: number;
  ajustesCapital: number;
  depuracionesCapital: number;
  saldoFinalVotacion: number;
  derechosVoto: number;
  interesesMora: number;
  ajustesIntereses: number;
  depuracionesIntereses: number;
  sancionesOtros: number;
  tieneCdpRp: boolean;
  estadoConciliacion: 'Pendiente' | 'Conciliado' | 'Depurado' | 'Condonado' | 'Extinguido';
}

export interface ActivoRealItem {
  id: string;
  tipo: 'Efectivo' | 'Inversion' | 'CuentaPorCobrar' | 'PPE';
  nombre: string;
  detalles: string;
  valorBook: number;
  deterioroConciliacion: number;
  valorNetoReal: number;
  estadoUbicacion: string;
  origenDestinacion: string;
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  usuario: string;
  rol: string;
  subcuenta: string;
  acreedor: string;
  accion: string;
  valorAnterior: number;
  valorNuevo: number;
  cdpRpRef: string;
  motivo: string;
}

export interface FloatingVarianceItem {
  month: string;
  recaudoEsperado: number;
  recaudoReal: number;
  varianceM: number;
  isPositive: boolean;
  resourceType: string;
}

export interface PayrollRigidityItem {
  month: string;
  plantaRigida: number; // Docentes de Planta ($50.096,8M a julio)
  ocasionalesVariable: number; // Docentes Ocasionales ($42.515,9M a julio)
  totalPayroll: number;
  isVacationPeriod: boolean;
}

export interface WaterfallBrechaItem {
  category: string;
  amountM: number;
  isTotal?: boolean;
  isSubtotal?: boolean;
  balanceRemaining: number;
}

export interface TornadoVariable {
  variableName: string;
  minVanM: number;
  baseVanM: number;
  maxVanM: number;
  swingM: number;
  riskLevel: 'Crítico' | 'Alto' | 'Medio' | 'Bajo';
}

export interface PacControlBulletItem {
  month: string;
  pagosProyectados: number; // $M
  cupoPacSiif: number; // $M
  inpanutPct: number; // % PAC No Utilizado
  statusZone: 'ROJO_INPANUT' | 'VERDE_OPTIMO' | 'NARANJA_CUELLO_BOTELLA';
}

export interface CashFlowItem {
  name: string;
  ingresos: number;
  gastosComp: number;
  gastosPago: number;
  gastoPersonal: number;
  otrosGastosPago: number;
  netoComp: number;
  netoPago: number;
  acumuladoComp: number;
  acumuladoPago: number;
  acumuladoIng: number;
  saldoCajaAcumulado: number;
  rezagoCompromiso: number;
  coberturaNomina: number;
  ejecucion: number;
}

export interface ResourceTraceabilityItem {
  resourceCode: string;
  resourceName: string;
  unitName: string;
  isUnit01: boolean;
  isFixedResolution: boolean;
  resolutionName?: string;
  projectedIncome: number;
  availableIncome: number;
  financedExpenses: {
    category: string;
    compromiso: number;
    pago: number;
    isPayroll: boolean;
  }[];
  totalCompromiso: number;
  totalPago: number;
  remainingBalance: number;
  utilizationPct: number;
  status: 'Excedente' | 'Equilibrado' | 'Déficit';
}

export interface PayrollComplianceModel {
  targetPayrollCOP: number;
  targetPayrollM: number;
  validUnit01ResourcesCOP: number;
  validUnit01ResourcesM: number;
  nonUnit01ResourcesM: number;
  coveragePct: number;
  surplusDeficitM: number;
  complianceStatus: 'Suficiente' | 'Preventiva' | 'Déficit Crítico';
  validContributingResources: {
    code: string;
    name: string;
    amountM: number;
    pct: number;
  }[];
  excludedResources: {
    code: string;
    name: string;
    amountM: number;
    reason: string;
  }[];
}

export interface FinancialAlertItem {
  id: string;
  type: 'CRITICAL' | 'PREVENTIVE' | 'NORMAL';
  title: string;
  message: string;
  impactValue?: string;
  suggestedAction?: string;
}

export interface FinancialTotals {
  baselineIng: number;
  baselineGasComp: number;
  baselineGasPago: number;
  baselineNetComp: number;
  baselineNetPago: number;

  simIng: number;
  simGasComp: number;
  simGasPago: number;
  simNetComp: number;
  simNetPago: number;

  officialPayrollBudget: number;
  realPayrollPaid: number;
  remainingPayrollToProject: number;
  simulatedPayrollTotal: number;
  payrollCoverageRatio: number;
  payrollSurplus: number;
  unpaidCommitments: number;

  // GOOBI Agosto 25 Multirecurso Totals
  cajaLibreDestinacionM: number;
  cajaDestinacionEspecificaM: number;
  brechaFuncionamientoRpM: number;
  promedioInpanutPct: number;
  superavitPrimarioM: number;
  ratioLey617Pct: number;
  cumpleLey617: boolean;
  cumpleLey819: boolean;
}

export interface ProjectionResults {
  simulatedFlow: CashFlowItem[];
  totals: FinancialTotals;
  resourceBaselines: Record<string, { ing: number; gasComp: number; gasPago: number }>;
  monthlySimIngByRes: Record<string, number[]>;
  monthlySimGasPagoByRes: Record<string, number[]>;
  monthlySimGasCompByRes: Record<string, number[]>;
  monthlyBaseIngByRes: Record<string, number[]>;
  monthlyBaseGasPagoByRes: Record<string, number[]>;
  monthlyPayroll: number[];
  traceabilityMatrix: ResourceTraceabilityItem[];
  payrollCompliance: PayrollComplianceModel;
  financialAlerts: FinancialAlertItem[];
  
  // EICE & Corte Agosto 25 Data
  rentComparison: RentItem[];
  acreenciasASA: AcreenciaASA[];
  activosReales: ActivoRealItem[];
  auditLogs: AuditLogItem[];
  floatingVarianceData: FloatingVarianceItem[];
  payrollRigidityData: PayrollRigidityItem[];
  waterfallBrechaData: WaterfallBrechaItem[];
  pacControlBulletData: PacControlBulletItem[];
  vanBaseM: number;
  tirBasePct: number;

  catComp: Record<string, number>;
  catPago: Record<string, number>;
}

// SAMPLE ASA ACREENCIAS
export const INITIAL_ACREENCIAS_ASA: AcreenciaASA[] = [
  {
    id: 'ACR-001',
    subcuenta: '240101',
    acreedorNombre: 'Sindicato SintraUPTC',
    acreedorNit: '891.800.123-1',
    acreedorEmail: 'juridica@sintrauptc.org',
    acreedorTelefono: '310 456 7890',
    acreedorDomicilio: 'Calle 14 No. 2-15, Tunja, Boyacá',
    grupoAcreencia: '1. Laboral',
    concepto: 'Primas extralegales y retroactivo salarial pendiente 2024-2025',
    documentoSoporte: 'Convención Colectiva Act-044 / Acta de Liquidación 2025',
    cdpNumero: 'CDP-2026-0891',
    rpNumero: 'RP-2026-1142',
    fechaVencimiento: '2025-12-31',
    valorBruto: 4580.0,
    descuentosDeducciones: 120.0,
    saldoInicial: 4460.0,
    ajustesCapital: -200.0,
    depuracionesCapital: -150.0,
    saldoFinalVotacion: 4110.0,
    derechosVoto: 32.4,
    interesesMora: 185.0,
    ajustesIntereses: -25.0,
    depuracionesIntereses: -10.0,
    sancionesOtros: 0,
    tieneCdpRp: true,
    estadoConciliacion: 'Conciliado'
  },
  {
    id: 'ACR-002',
    subcuenta: '242405',
    acreedorNombre: 'DIAN - Dirección de Impuestos y Aduanas Nacionales',
    acreedorNit: '800.197.268-4',
    acreedorEmail: 'recaudo_tunja@dian.gov.co',
    acreedorTelefono: '608 742 3000',
    acreedorDomicilio: 'Carrera 10 No. 20-40, Tunja, Boyacá',
    grupoAcreencia: '2. Pública',
    concepto: 'Retención en la fuente e IVA vigencia 2025 sujeta a acuerdo Ley 550',
    documentoSoporte: 'Declaración DIAN Form-350 / Resolución Liquidación',
    cdpNumero: 'CDP-2026-0412',
    rpNumero: 'RP-2026-0520',
    fechaVencimiento: '2025-11-15',
    valorBruto: 3250.0,
    descuentosDeducciones: 0,
    saldoInicial: 3250.0,
    ajustesCapital: 0,
    depuracionesCapital: 0,
    saldoFinalVotacion: 3250.0,
    derechosVoto: 25.6,
    interesesMora: 310.0,
    ajustesIntereses: -80.0,
    depuracionesIntereses: -50.0,
    sancionesOtros: 45.0,
    tieneCdpRp: true,
    estadoConciliacion: 'Conciliado'
  },
  {
    id: 'ACR-003',
    subcuenta: '243001',
    acreedorNombre: 'Banco Agrario de Colombia S.A.',
    acreedorNit: '800.037.800-8',
    acreedorEmail: 'estructuracion@bancoagrario.gov.co',
    acreedorTelefono: '601 594 8500',
    acreedorDomicilio: 'Carrera 8 No. 15-43, Bogotá D.C.',
    grupoAcreencia: '3. Financiera',
    concepto: 'Pagaré sustitutivo de amortización rotativa infraestructura',
    documentoSoporte: 'Contrato Crédito No. 550-2023 / Pagaré 8812',
    cdpNumero: 'CDP-2026-0105',
    rpNumero: 'RP-2026-0180',
    fechaVencimiento: '2026-06-30',
    valorBruto: 2800.0,
    descuentosDeducciones: 0,
    saldoInicial: 2800.0,
    ajustesCapital: -300.0,
    depuracionesCapital: 0,
    saldoFinalVotacion: 2500.0,
    derechosVoto: 19.7,
    interesesMora: 140.0,
    ajustesIntereses: -40.0,
    depuracionesIntereses: 0,
    sancionesOtros: 0,
    tieneCdpRp: true,
    estadoConciliacion: 'Conciliado'
  },
  {
    id: 'ACR-004',
    subcuenta: '240301',
    acreedorNombre: 'Servicios de Seguridad Boyacá Ltda.',
    acreedorNit: '891.805.991-2',
    acreedorEmail: 'gerencia@segboyaca.com',
    acreedorTelefono: '315 789 1234',
    acreedorDomicilio: 'Avenida Universitaria No. 45-12, Tunja',
    grupoAcreencia: '4. Comercial',
    concepto: 'Servicio de vigilancia y monitoreo sedes Tunja, Duitama y Sogamoso',
    documentoSoporte: 'Contrato Licitación 012-2024 / Facturas 4410-4425',
    cdpNumero: 'CDP-2026-0920',
    rpNumero: 'RP-2026-1055',
    fechaVencimiento: '2025-10-31',
    valorBruto: 1950.0,
    descuentosDeducciones: 85.0,
    saldoInicial: 1865.0,
    ajustesCapital: 0,
    depuracionesCapital: -120.0,
    saldoFinalVotacion: 1745.0,
    derechosVoto: 13.8,
    interesesMora: 65.0,
    ajustesIntereses: -20.0,
    depuracionesIntereses: -15.0,
    sancionesOtros: 0,
    tieneCdpRp: true,
    estadoConciliacion: 'Depurado'
  },
  {
    id: 'ACR-005',
    subcuenta: '249090',
    acreedorNombre: 'Consorcio Edificaciones Universitarias 2024',
    acreedorNit: '901.442.110-5',
    acreedorEmail: 'representacion@consorcioedificos.com',
    acreedorTelefono: '311 234 5678',
    acreedorDomicilio: 'Carrera 7 No. 71-21, Bogotá D.C.',
    grupoAcreencia: '5. Otros',
    concepto: 'Reclamación de acta final sin respaldo de RP presupuestal formalizado',
    documentoSoporte: 'Solicitud de cobro judicial no ejecutoriada',
    cdpNumero: 'SIN_CDP',
    rpNumero: 'SIN_RP',
    fechaVencimiento: '2025-08-30',
    valorBruto: 1200.0,
    descuentosDeducciones: 0,
    saldoInicial: 1200.0,
    ajustesCapital: 0,
    depuracionesCapital: -1200.0,
    saldoFinalVotacion: 0,
    derechosVoto: 0,
    interesesMora: 110.0,
    ajustesIntereses: 0,
    depuracionesIntereses: -110.0,
    sancionesOtros: 0,
    tieneCdpRp: false,
    estadoConciliacion: 'Extinguido'
  }
];

export const INITIAL_ACTIVOS_REALES: ActivoRealItem[] = [
  {
    id: 'ACT-001',
    tipo: 'Efectivo',
    nombre: 'Cuenta Corriente Davivienda No. 0012-8819 (Caja Libre Destinación)',
    detalles: 'Cuenta operativa central (Recurso 20 e Ingresos Corrientes). Incluye embargos preventivos de $420M.',
    valorBook: 18500.0,
    deterioroConciliacion: -420.0,
    valorNetoReal: 18080.0,
    estadoUbicacion: 'Activo / Conciliado Ago 25',
    origenDestinacion: 'Fondo de Tesorería General (Libre Destinación - Nómina)'
  },
  {
    id: 'ACT-002',
    tipo: 'Efectivo',
    nombre: 'Cuenta Fiduciaria Bancolombia No. 4410 (Caja Restringida Estampillas)',
    detalles: 'Recursos con destinación específica (Recurso 40 Estampillas & Recurso 16.0 Inversión).',
    valorBook: 24500.0,
    deterioroConciliacion: 0,
    valorNetoReal: 24500.0,
    estadoUbicacion: 'Activo / Fiduciaria Restringida',
    origenDestinacion: 'Destinación Específica Inversión No Disponible para Nómina'
  },
  {
    id: 'ACT-003',
    tipo: 'Inversion',
    nombre: 'Participación Accionaria Lotería de Boyacá S.A.',
    detalles: '1.250.000 acciones ordinarias con dividendo estipulado anualmente.',
    valorBook: 4200.0,
    deterioroConciliacion: 0,
    valorNetoReal: 4200.0,
    estadoUbicacion: 'Vigente / Depósito Deceval',
    origenDestinacion: 'Inversión Institucional Patrimonial'
  },
  {
    id: 'ACT-004',
    tipo: 'CuentaPorCobrar',
    nombre: 'Cartera por Matrículas y Deudores Extensión (Vigencias 2022-2025)',
    detalles: 'Cobro persuasivo y jurisdicción coactiva en curso.',
    valorBook: 8900.0,
    deterioroConciliacion: -2670.0,
    valorNetoReal: 6230.0,
    estadoUbicacion: 'Cobro Coactivo / Res 193 Depuración 30%',
    origenDestinacion: 'Recursos Propios (Servicios Académicos)'
  }
];

export const INITIAL_AUDIT_LOGS: AuditLogItem[] = [
  {
    id: 'LOG-2026-001',
    timestamp: '2026-08-25 10:15:22',
    usuario: 'Dr. Carlos Mendoza (Promotor DAF)',
    rol: 'Promotor DAF MinHacienda',
    subcuenta: '240301',
    acreedor: 'Servicios de Seguridad Boyacá Ltda.',
    accion: 'Depuración de Capital Res 193/2016',
    valorAnterior: 1865.0,
    valorNuevo: 1745.0,
    cdpRpRef: 'CDP-2026-0920 / RP-2026-1055',
    motivo: 'Ajuste por acta de conciliación y condonación voluntaria a corte de 25 de agosto.'
  }
];

export function calculateProjections({
  rawYearlyIncomes,
  rawCumulativeIncomes,
  rawHistoricalGastos,
  filterUnidad = 'Todos',
  filterRecurso = 'Todos',
  filterMes = 'Todos',
  filterTipoGasto = 'Todos',
  simIngByResource = {},
  simGasByResource = {},
  simGasByType = {},
  expenseAdjustMode = 'category',
  selectedProjectedUnits = undefined,
  selectedProjectedResources = undefined,
  selectedProjectedExpenseTypes = undefined,

  // Corte 25 de Agosto Sliders
  desercionPinesPct = 0, // -10% or -20%
  extensionSemestreDias = 0, // +15 or +30 days
  plazoProveedoresDias = 30, // 30 to 60 days
  cupoPacAjustePct = 0 // % adjustment to SIIF PAC
}: {
  rawYearlyIncomes: Record<number, any[]>;
  rawCumulativeIncomes: any[];
  rawHistoricalGastos: any[];
  filterUnidad?: string;
  filterRecurso?: string;
  filterMes?: string;
  filterTipoGasto?: string;
  simIngByResource?: Record<string, number>;
  simGasByResource?: Record<string, number>;
  simGasByType?: Record<string, number>;
  expenseAdjustMode?: 'resource' | 'category';
  selectedProjectedUnits?: string[];
  selectedProjectedResources?: string[];
  selectedProjectedExpenseTypes?: string[];

  desercionPinesPct?: number;
  extensionSemestreDias?: number;
  plazoProveedoresDias?: number;
  cupoPacAjustePct?: number;
}): ProjectionResults {

  const isUnitSelected = (u: string) => {
    if (filterUnidad !== 'Todos' && u !== filterUnidad) return false;
    if (selectedProjectedUnits && !selectedProjectedUnits.includes(u)) return false;
    return true;
  };

  const isResSelected = (r: string, conceptoOrRow?: any) => {
    if (filterRecurso !== 'Todos') {
      if (filterRecurso === 'Recursos del Balance' || filterRecurso === 'Recursos UPTC') {
        if (conceptoOrRow && getTipoRecursoBalance(conceptoOrRow) !== filterRecurso) return false;
      } else if (r !== filterRecurso) {
        return false;
      }
    }
    if (selectedProjectedResources && !selectedProjectedResources.includes(r)) return false;
    return true;
  };

  const isExpenseTypeSelected = (type: string) => {
    if (selectedProjectedExpenseTypes && !selectedProjectedExpenseTypes.includes(type)) return false;
    return true;
  };

  // 1. Process Incomes
  const incomesByYearRes: Record<number, Record<string, number[]>> = {
    2023: {}, 2024: {}, 2025: {}, 2026: {}
  };
  const expensesCompByYearRes: Record<number, Record<string, number[]>> = {
    2023: {}, 2024: {}, 2025: {}, 2026: {}
  };
  const expensesPagoByYearRes: Record<number, Record<string, number[]>> = {
    2023: {}, 2024: {}, 2025: {}, 2026: {}
  };

  [2023, 2024, 2025, 2026].forEach(yr => {
    RESOURCES_LIST.forEach(r => {
      incomesByYearRes[yr][r] = new Array(12).fill(0);
      expensesCompByYearRes[yr][r] = new Array(12).fill(0);
      expensesPagoByYearRes[yr][r] = new Array(12).fill(0);
    });
  });

  const MONTH_KEYS = [
    'Valor ene', 'Valor feb', 'Valor mar', 'Valor abr', 'Valor may', 'Valor jun',
    'Valor jul', 'Valor ago', 'Valor sep', 'Valor oct', 'Valor nov', 'Valor dic'
  ];

  [2023, 2024, 2025, 2026].forEach(year => {
    const rows = rawYearlyIncomes[year] || [];
    rows.forEach(row => {
      const rowUnidad = getRowUnidad(row, year);
      if (!isUnitSelected(rowUnidad)) return;

      const recRaw = String(row['Recurso'] || row['Codigo'] || row['Código recurso'] || '').trim();
      const recMapped = getRecursoEquivalence(recRaw);
      
      if (incomesByYearRes[year] && incomesByYearRes[year][recMapped]) {
        MONTH_KEYS.forEach((mKey, mIdx) => {
          let val = typeof row[mKey] === 'number' ? row[mKey] : parseFloat(String(row[mKey] || 0).replace(/[^0-9.-]+/g, '')) || 0;
          incomesByYearRes[year][recMapped][mIdx] += val;
        });
      }
    });
  });

  // 2. Process Expenses
  rawHistoricalGastos.forEach(row => {
    const dep = String(row.dependencia || row.Unidad || '').trim();
    if (!isUnitSelected(dep)) return;

    const year = row.año;
    const monthIdx = row.mes - 1;
    const recMapped = getRecursoEquivalence(row.recurso);
    
    if (monthIdx >= 0 && monthIdx < 12 && expensesCompByYearRes[year] && expensesCompByYearRes[year][recMapped]) {
      expensesCompByYearRes[year][recMapped][monthIdx] += row.compromiso;
      expensesPagoByYearRes[year][recMapped][monthIdx] += row.pago;
    }
  });

  // 3. Baselines
  const resourceBaselines: Record<string, { ing: number; gasComp: number; gasPago: number }> = {};
  RESOURCES_LIST.forEach(r => {
    if (!isResSelected(r)) {
      resourceBaselines[r] = { ing: 0, gasComp: 0, gasPago: 0 };
      return;
    }
    let totIng = 0, totGasComp = 0, totGasPago = 0;
    const fixedObj = RECURSOS_FIJOS_RESOLUCION[r];

    for (let i = 0; i < 12; i++) {
      const useReal = i < 7 && incomesByYearRes[2026][r].reduce((a,b)=>a+b, 0) > 0;
      if (useReal) {
        totIng += incomesByYearRes[2026][r][i];
        totGasComp += expensesCompByYearRes[2026][r][i];
        totGasPago += expensesPagoByYearRes[2026][r][i];
      } else {
        totIng += incomesByYearRes[2025][r][i] * 1.05;
        totGasComp += expensesCompByYearRes[2025][r][i] * 1.05;
        totGasPago += expensesCompByYearRes[2025][r][i] * 1.05 * 0.992;
      }
    }
    if (fixedObj && fixedObj.valorCOP > 0 && filterUnidad === 'Todos') {
      totIng = fixedObj.valorCOP;
    }
    resourceBaselines[r] = { ing: totIng / 1e6, gasComp: totGasComp / 1e6, gasPago: totGasPago / 1e6 };
  });

  // 4. Monthly Arrays
  const monthlySimIngByRes: Record<string, number[]> = {};
  const monthlySimGasCompByRes: Record<string, number[]> = {};
  const monthlySimGasPagoByRes: Record<string, number[]> = {};
  const monthlyBaseIngByRes: Record<string, number[]> = {};
  const monthlyBaseGasPagoByRes: Record<string, number[]> = {};

  RESOURCES_LIST.forEach(r => {
    monthlySimIngByRes[r] = new Array(12).fill(0);
    monthlySimGasCompByRes[r] = new Array(12).fill(0);
    monthlySimGasPagoByRes[r] = new Array(12).fill(0);
    monthlyBaseIngByRes[r] = new Array(12).fill(0);
    monthlyBaseGasPagoByRes[r] = new Array(12).fill(0);
  });

  for (let i = 0; i < 12; i++) {
    RESOURCES_LIST.forEach(r => {
      if (!isResSelected(r)) return;
      const ingBaseVal = incomesByYearRes[2026][r][i] || (incomesByYearRes[2025][r][i] * 1.05);
      const gasCompVal = expensesCompByYearRes[2026][r][i] || (expensesCompByYearRes[2025][r][i] * 1.05);
      const gasPagoVal = expensesPagoByYearRes[2026][r][i] || (gasCompVal * 0.992);

      const ingMod = (simIngByResource[r] || 0) / 100;
      let shockDesercion = 0;
      if ((r === '20' || r === '31') && i >= 7) {
        shockDesercion = desercionPinesPct / 100;
      }

      monthlyBaseIngByRes[r][i] = ingBaseVal;
      monthlyBaseGasPagoByRes[r][i] = gasPagoVal;

      monthlySimIngByRes[r][i] = ingBaseVal * (1 + ingMod + shockDesercion);
      monthlySimGasCompByRes[r][i] = gasCompVal;
      monthlySimGasPagoByRes[r][i] = gasPagoVal;
    });
  }

  // Monthly Payroll Array
  const monthlyPayroll: number[] = new Array(12).fill(0);
  PAYROLL_AGO_DIC_WEIGHTS.forEach((weight, idx) => {
    const monthIdx = idx + 7;
    monthlyPayroll[monthIdx] = PAYROLL_REMAINING_AGO_DIC * weight;
  });

  // 5. Consolidated Cash Flow
  const simulatedFlow: CashFlowItem[] = [];
  const MONTHS_STR = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  let totalSimIng = 0, totalSimGasComp = 0, totalSimGasPago = 0;
  let totalBaseIng = 0, totalBaseGasComp = 0, totalBaseGasPago = 0;
  let accumComp = 0, accumPago = 0, accumIng = 0;

  for (let i = 0; i < 12; i++) {
    let mSimIng = 0, mSimGasComp = 0, mSimGasPago = 0;
    let mBaseIng = 0, mBaseGasPago = 0;

    RESOURCES_LIST.forEach(r => {
      if (!isResSelected(r)) return;
      mSimIng += monthlySimIngByRes[r][i];
      mSimGasComp += monthlySimGasCompByRes[r][i];
      mSimGasPago += monthlySimGasPagoByRes[r][i];
      mBaseIng += monthlyBaseIngByRes[r][i];
      mBaseGasPago += monthlyBaseGasPagoByRes[r][i];
    });

    const gastoPersonalM = isExpenseTypeSelected('Personal') ? (monthlyPayroll[i] / 1e6) : 0;
    const otrosGastosPagoM = Math.max(0, (mSimGasPago / 1e6) - gastoPersonalM);

    const mSimIngM = mSimIng / 1e6;
    const mSimGasCompM = mSimGasComp / 1e6;
    const mSimGasPagoM = mSimGasPago / 1e6;

    totalSimIng += mSimIng; totalSimGasComp += mSimGasComp; totalSimGasPago += mSimGasPago;
    totalBaseIng += mBaseIng; totalBaseGasComp += mSimGasComp; totalBaseGasPago += mBaseGasPago;

    accumComp += mSimGasCompM; accumPago += mSimGasPagoM; accumIng += mSimIngM;

    simulatedFlow.push({
      name: MONTHS_STR[i],
      ingresos: parseFloat(mSimIngM.toFixed(1)),
      gastosComp: parseFloat(mSimGasCompM.toFixed(1)),
      gastosPago: parseFloat(mSimGasPagoM.toFixed(1)),
      gastoPersonal: parseFloat(gastoPersonalM.toFixed(1)),
      otrosGastosPago: parseFloat(otrosGastosPagoM.toFixed(1)),
      netoComp: parseFloat((mSimIngM - mSimGasCompM).toFixed(1)),
      netoPago: parseFloat((mSimIngM - mSimGasPagoM).toFixed(1)),
      acumuladoComp: parseFloat(accumComp.toFixed(1)),
      acumuladoPago: parseFloat(accumPago.toFixed(1)),
      acumuladoIng: parseFloat(accumIng.toFixed(1)),
      saldoCajaAcumulado: parseFloat((accumIng - accumPago).toFixed(1)),
      rezagoCompromiso: parseFloat((accumComp - accumPago).toFixed(1)),
      coberturaNomina: parseFloat((gastoPersonalM > 0 ? (mSimIngM / gastoPersonalM) * 100 : 100).toFixed(1)),
      ejecucion: parseFloat((mSimGasCompM > 0 ? (mSimGasPagoM / mSimGasCompM) * 100 : 0).toFixed(2))
    });
  }

  // 6. Traceability Matrix
  const traceabilityMatrix: ResourceTraceabilityItem[] = [];
  RESOURCES_LIST.forEach(r => {
    if (!isResSelected(r)) return;
    const resTotIngM = (monthlySimIngByRes[r].reduce((a,b)=>a+b, 0)) / 1e6;
    const resTotCompM = (monthlySimGasCompByRes[r].reduce((a,b)=>a+b, 0)) / 1e6;
    const resTotPagoM = (monthlySimGasPagoByRes[r].reduce((a,b)=>a+b, 0)) / 1e6;

    const fixedObj = RECURSOS_FIJOS_RESOLUCION[r];
    const isU01 = ['10', '10.1', '10.2', '10.5', '12', '13', '14', '16', '17', '18', '20', '21'].includes(r);

    traceabilityMatrix.push({
      resourceCode: r,
      resourceName: fixedObj ? fixedObj.nombre : `Recurso ${r}`,
      unitName: isU01 ? '01 - ADMINISTRATIVA Y FINANCIERA' : 'UNIDADES DESCENTRALIZADAS',
      isUnit01: isU01,
      isFixedResolution: !!fixedObj,
      resolutionName: fixedObj?.resolucion,
      projectedIncome: parseFloat(resTotIngM.toFixed(1)),
      availableIncome: parseFloat(resTotIngM.toFixed(1)),
      financedExpenses: [
        { category: 'Gastos de Personal & Operación', compromiso: resTotCompM, pago: resTotPagoM, isPayroll: isU01 }
      ],
      totalCompromiso: parseFloat(resTotCompM.toFixed(1)),
      totalPago: parseFloat(resTotPagoM.toFixed(1)),
      remainingBalance: parseFloat((resTotIngM - resTotPagoM).toFixed(1)),
      utilizationPct: parseFloat((resTotIngM > 0 ? (resTotPagoM / resTotIngM) * 100 : 0).toFixed(1)),
      status: (resTotIngM - resTotPagoM) > 0.5 ? 'Excedente' : ((resTotIngM - resTotPagoM) < -0.5 ? 'Déficit' : 'Equilibrado')
    });
  });

  // 7. Payroll Compliance
  const targetPayrollM = BUDGET_PAYROLL_2026 / 1e6;
  const validUnit01ResourcesM = traceabilityMatrix.filter(t => t.isUnit01).reduce((acc, t) => acc + t.projectedIncome, 0);
  const payrollCoveragePct = (validUnit01ResourcesM / targetPayrollM) * 100;

  const payrollCompliance: PayrollComplianceModel = {
    targetPayrollCOP: BUDGET_PAYROLL_2026,
    targetPayrollM: parseFloat(targetPayrollM.toFixed(1)),
    validUnit01ResourcesCOP: validUnit01ResourcesM * 1e6,
    validUnit01ResourcesM: parseFloat(validUnit01ResourcesM.toFixed(1)),
    nonUnit01ResourcesM: parseFloat((totalSimIng / 1e6 - validUnit01ResourcesM).toFixed(1)),
    coveragePct: parseFloat(payrollCoveragePct.toFixed(1)),
    surplusDeficitM: parseFloat((validUnit01ResourcesM - targetPayrollM).toFixed(1)),
    complianceStatus: payrollCoveragePct >= 100 ? 'Suficiente' : (payrollCoveragePct >= 90 ? 'Preventiva' : 'Déficit Crítico'),
    validContributingResources: traceabilityMatrix.filter(t => t.isUnit01).map(t => ({ code: t.resourceCode, name: t.resourceName, amountM: t.projectedIncome, pct: (t.projectedIncome / targetPayrollM) * 100 })),
    excludedResources: traceabilityMatrix.filter(t => !t.isUnit01).map(t => ({ code: t.resourceCode, name: t.resourceName, amountM: t.projectedIncome, reason: 'Recurso de unidad descentralizada / destinación específica' }))
  };

  // 8. DATA FOR THE 4 SPECIALIZED CORTE AGOSTO 25 CHARTS

  // Component 1: Floating Variance (Rec. 20 & 30)
  const floatingVarianceData: FloatingVarianceItem[] = MONTHS_STR.map((m, idx) => {
    const baseRecaudo = (idx < 7 ? 4200 : 3800);
    const varPct = desercionPinesPct / 100;
    const realRecaudo = idx < 7 ? (baseRecaudo * (1 + (idx % 2 === 0 ? 0.04 : -0.02))) : (baseRecaudo * (1 + varPct));
    const varianceM = realRecaudo - baseRecaudo;
    return {
      month: m,
      recaudoEsperado: parseFloat(baseRecaudo.toFixed(1)),
      recaudoReal: parseFloat(realRecaudo.toFixed(1)),
      varianceM: parseFloat(varianceM.toFixed(1)),
      isPositive: varianceM >= 0,
      resourceType: 'Recurso 20 / 30 Propios & Posgrados'
    };
  });

  // Component 2: Stacked Payroll Rigidity (Planta vs Ocasionales)
  const payrollRigidityData: PayrollRigidityItem[] = MONTHS_STR.map((m, idx) => {
    const plantaBase = 7156.7; // Docentes de Planta ($50.096,8M / 7 meses)
    let ocasionalBase = 6073.7; // Docentes Ocasionales ($42.515,9M / 7 meses)

    // Extensión de semestre simulation impact
    const isVacation = idx === 11; // Diciembre receso
    if (isVacation) {
      if (extensionSemestreDias > 0) {
        ocasionalBase = (extensionSemestreDias / 30) * 6073.7; // Extensions in vacation period
      } else {
        ocasionalBase = 0; // Drops to zero in vacation
      }
    }

    return {
      month: m,
      plantaRigida: parseFloat(plantaBase.toFixed(1)),
      ocasionalesVariable: parseFloat(ocasionalBase.toFixed(1)),
      totalPayroll: parseFloat((plantaBase + ocasionalBase).toFixed(1)),
      isVacationPeriod: isVacation
    };
  });

  // Component 3: Waterfall Brecha de Funcionamiento ($67.417,2M)
  let currentBalance = GOOBI_BRECHA_FUNCIONAMIENTO_AGO25;
  const waterfallBrechaData: WaterfallBrechaItem[] = [
    { category: 'Brecha Inicial (RPs por Pagar)', amountM: GOOBI_BRECHA_FUNCIONAMIENTO_AGO25, isTotal: true, balanceRemaining: GOOBI_BRECHA_FUNCIONAMIENTO_AGO25 },
    { category: 'Desembolso Agosto 26-31', amountM: -8500.0 * (30 / plazoProveedoresDias), balanceRemaining: (currentBalance -= 8500.0 * (30 / plazoProveedoresDias)) },
    { category: 'Desembolso Septiembre', amountM: -14500.0 * (30 / plazoProveedoresDias), balanceRemaining: (currentBalance -= 14500.0 * (30 / plazoProveedoresDias)) },
    { category: 'Desembolso Octubre', amountM: -15200.0 * (30 / plazoProveedoresDias), balanceRemaining: (currentBalance -= 15200.0 * (30 / plazoProveedoresDias)) },
    { category: 'Desembolso Noviembre', amountM: -14800.0 * (30 / plazoProveedoresDias), balanceRemaining: (currentBalance -= 14800.0 * (30 / plazoProveedoresDias)) },
    { category: 'Desembolso Diciembre', amountM: -14417.2 * (30 / plazoProveedoresDias), balanceRemaining: (currentBalance -= 14417.2 * (30 / plazoProveedoresDias)) },
    { category: 'Saldo Final Remanente', amountM: Math.max(0, currentBalance), isSubtotal: true, balanceRemaining: Math.max(0, currentBalance) }
  ];

  // Component 4: Bullet Chart for SIIF PAC & INPANUT Control
  const pacControlBulletData: PacControlBulletItem[] = ['Sep', 'Oct', 'Nov', 'Dic'].map((m, idx) => {
    const basePacCupo = 42000.0 * (1 + cupoPacAjustePct / 100);
    const pagosProyectados = 36500.0 + (idx * 1200.0);
    const inpanutPct = ((basePacCupo - pagosProyectados) / basePacCupo) * 100;
    
    let statusZone: 'ROJO_INPANUT' | 'VERDE_OPTIMO' | 'NARANJA_CUELLO_BOTELLA' = 'VERDE_OPTIMO';
    const execPct = (pagosProyectados / basePacCupo) * 100;
    if (execPct < 70) statusZone = 'ROJO_INPANUT';
    else if (execPct > 95) statusZone = 'NARANJA_CUELLO_BOTELLA';
    else statusZone = 'VERDE_OPTIMO';

    return {
      month: m,
      pagosProyectados: parseFloat(pagosProyectados.toFixed(1)),
      cupoPacSiif: parseFloat(basePacCupo.toFixed(1)),
      inpanutPct: parseFloat(inpanutPct.toFixed(1)),
      statusZone
    };
  });

  const totalSimIngM = totalSimIng / 1e6;
  const totalSimGasPagoM = totalSimGasPago / 1e6;

  return {
    simulatedFlow,
    totals: {
      baselineIng: totalBaseIng / 1e6,
      baselineGasComp: totalBaseGasComp / 1e6,
      baselineGasPago: totalBaseGasPago / 1e6,
      baselineNetComp: (totalBaseIng - totalBaseGasComp) / 1e6,
      baselineNetPago: (totalBaseIng - totalBaseGasPago) / 1e6,

      simIng: totalSimIngM,
      simGasComp: totalSimGasComp / 1e6,
      simGasPago: totalSimGasPagoM,
      simNetComp: (totalSimIng - totalSimGasComp) / 1e6,
      simNetPago: (totalSimIng - totalSimGasPago) / 1e6,

      officialPayrollBudget: parseFloat(targetPayrollM.toFixed(1)),
      realPayrollPaid: parseFloat((PAYROLL_REAL_ENE_JUL / 1e6).toFixed(1)),
      remainingPayrollToProject: parseFloat((PAYROLL_REMAINING_AGO_DIC / 1e6).toFixed(1)),
      simulatedPayrollTotal: parseFloat(targetPayrollM.toFixed(1)),
      payrollCoverageRatio: parseFloat(payrollCoveragePct.toFixed(1)),
      payrollSurplus: parseFloat((validUnit01ResourcesM - targetPayrollM).toFixed(1)),
      unpaidCommitments: parseFloat(((totalSimGasComp - totalSimGasPago) / 1e6).toFixed(1)),

      // GOOBI Multirecurso Totals
      cajaLibreDestinacionM: 18080.0, // Rec 20 + Aportes Nación
      cajaDestinacionEspecificaM: 24500.0, // Estampillas & Inversión PGN
      brechaFuncionamientoRpM: GOOBI_BRECHA_FUNCIONAMIENTO_AGO25,
      promedioInpanutPct: parseFloat((pacControlBulletData.reduce((acc, p) => acc + p.inpanutPct, 0) / 4).toFixed(1)),
      superavitPrimarioM: parseFloat((totalSimIngM - totalSimGasPagoM).toFixed(1)),
      ratioLey617Pct: parseFloat((((totalSimGasPagoM * 0.235) / (totalSimIngM * 0.35)) * 100).toFixed(1)),
      cumpleLey617: (((totalSimGasPagoM * 0.235) / (totalSimIngM * 0.35)) * 100) <= 50.0,
      cumpleLey819: (totalSimIngM - totalSimGasPagoM) >= 0
    },
    resourceBaselines,
    monthlySimIngByRes,
    monthlySimGasPagoByRes,
    monthlySimGasCompByRes,
    monthlyBaseIngByRes,
    monthlyBaseGasPagoByRes,
    monthlyPayroll,
    traceabilityMatrix,
    payrollCompliance,
    financialAlerts: [
      {
        id: 'ALT-AGO25-01',
        type: 'NORMAL',
        title: 'Línea de Corte Oficial: 25 de Agosto de 2026 (GOOBI)',
        message: `Recaudo Real GOOBI: $338.186,9M | Compromisos: $312.078,1M | Pagos Realizados: $246.751,6M.`
      },
      {
        id: 'ALT-BRECHA-01',
        type: 'PREVENTIVE',
        title: 'Mapeo de Brecha Contractual (RPs por Pagar)',
        message: `Pendiente de desembolso en Funcionamiento (2.1.2): $67.417,2M (Comprometido $115.154,4M vs Pagado $47.737,2M).`
      }
    ],
    rentComparison: [],
    acreenciasASA: INITIAL_ACREENCIAS_ASA,
    activosReales: INITIAL_ACTIVOS_REALES,
    auditLogs: INITIAL_AUDIT_LOGS,
    floatingVarianceData,
    payrollRigidityData,
    waterfallBrechaData,
    pacControlBulletData,
    vanBaseM: parseFloat(((totalSimIngM - totalSimGasPagoM) * 3.8).toFixed(1)),
    tirBasePct: 14.5,
    catComp: { personal: 369650.4, funcionamiento: 124447.1, inversion: 19687.1, transferencias: 5090.3, tasas: 3908.3, deuda: 0 },
    catPago: { personal: 369650.4, funcionamiento: 124447.1, inversion: 13347.9, transferencias: 5090.3, tasas: 3908.3, deuda: 0 }
  };
}

export function aggregateFlow(monthlyFlow: CashFlowItem[], granularity: 'monthly' | 'quarterly' | 'semesterly' | 'annual'): CashFlowItem[] {
  if (granularity === 'monthly') return monthlyFlow;
  const aggregated: CashFlowItem[] = [];
  let ingSum = 0, compSum = 0, pagoSum = 0, personalSum = 0, otrosSum = 0;
  let currentGroup = "";

  monthlyFlow.forEach((item, idx) => {
    ingSum += item.ingresos; compSum += item.gastosComp; pagoSum += item.gastosPago;
    personalSum += item.gastoPersonal; otrosSum += item.otrosGastosPago;

    let isEnd = false;
    if (granularity === 'quarterly') { currentGroup = `Trimestre ${Math.floor(idx / 3) + 1}`; isEnd = (idx % 3 === 2); }
    else if (granularity === 'semesterly') { currentGroup = `Semestre ${Math.floor(idx / 6) + 1}`; isEnd = (idx % 6 === 5); }
    else if (granularity === 'annual') { currentGroup = `Vigencia Anual`; isEnd = (idx === 11); }

    if (isEnd) {
      aggregated.push({
        name: currentGroup,
        ingresos: parseFloat(ingSum.toFixed(1)),
        gastosComp: parseFloat(compSum.toFixed(1)),
        gastosPago: parseFloat(pagoSum.toFixed(1)),
        gastoPersonal: parseFloat(personalSum.toFixed(1)),
        otrosGastosPago: parseFloat(otrosSum.toFixed(1)),
        netoComp: parseFloat((ingSum - compSum).toFixed(1)),
        netoPago: parseFloat((ingSum - pagoSum).toFixed(1)),
        acumuladoComp: item.acumuladoComp,
        acumuladoPago: item.acumuladoPago,
        acumuladoIng: item.acumuladoIng,
        saldoCajaAcumulado: item.saldoCajaAcumulado,
        rezagoCompromiso: item.rezagoCompromiso,
        coberturaNomina: parseFloat((personalSum > 0 ? (ingSum / personalSum) * 100 : 100).toFixed(1)),
        ejecucion: parseFloat((ingSum > 0 ? (compSum / ingSum) * 100 : 0).toFixed(2))
      });
      ingSum = 0; compSum = 0; pagoSum = 0; personalSum = 0; otrosSum = 0;
    }
  });
  return aggregated;
}
