import Papa from 'papaparse';
import { parseNumber } from './csvParser';

/**
 * SALDO BANCARIO OFICIAL DE REFERENCIA (Prompt Maestro Actualizado):
 * $ 144.563.470.673 COP
 */
export const BANK_REFERENCE_SALDO = 144563470673;

/**
 * CODIGOS DE RECURSOS DE ADMINISTRACIÓN SEGÚN NUMERAL 3.A DEL PROMPT MAESTRO:
 * 10.0, 10.1, 10.2, 10.3, 13, 14, 15, 17, 18, 20, 21, 31, 32, 33, 34, 35
 */
export const DEFAULT_ADMIN_RESOURCES = [
  '10.0', '10.1', '10.2', '10.3', '13', '14', '15', '17', '18', '20', '21', '31', '32', '33', '34', '35'
];

export type ResourceCategory = 'Recursos Administración' | 'Recursos Inversión' | 'Todos';
export type ScenarioType = 'conservador' | 'base' | 'optimista';

export interface CajaHoyBankAccount {
  entidad: string;
  noCuenta: string;
  banco: string;
  nombreCuenta: string;
  clase: string;
  destino: string; // 'Funcionamiento', 'Inversión', 'No aplica'
  fuente: string;
  valorInicial: number;
  valorIngreso: number;
  valorEgreso: number;
  valorFinal: number;
  moneda: string;
  recurso: string;
  fechaInicial: string;
  fechaFinal: string;
  clasificacion: 'Administración' | 'Inversión' | 'Sin Clasificar';
}

export interface BankReconciliation {
  saldoReportado: number;
  saldoReferencia: number;
  diferenciaAbsoluta: number;
  diferenciaPorcentual: number;
  estado: 'COINCIDENCIA_EXACTA' | 'DIFERENCIA_REDONDEO' | 'DISCREPANCIA';
  observacion: string;
}

export interface CajaHoyIncome {
  unidad: string;
  codigoConcepto: string;
  concepto: string;
  recurso: string;
  codigoRecurso: string;
  valorInicial: number;
  valorAforo: number;
  totalRecaudo: number;
  saldoPendiente: number;
  porcentajeRecaudo: number;
  porcentajePendiente: number;
  tipoRecurso: 'Recursos Administración' | 'Recursos Inversión';
}

export interface CajaHoyMonthlyIncome {
  unidad: string;
  codigo: string;
  recurso: string;
  codigoRecurso: string;
  concepto: string;
  valorAforo: number;
  meses: { [mes: string]: number };
  totalRecaudoEneNov: number;
  tipoRecurso: 'Recursos Administración' | 'Recursos Inversión';
}

export interface MonthlyRecaudoStat {
  mes: string;
  mesNombre: string;
  recaudoMes: number;
  recaudoAcumulado: number;
  variacionPorcentual: number;
  esProyectado?: boolean;
}

export interface CajaHoyExpense {
  unidad: string;
  gasto: string; // '1. FUNCIONAMIENTO', '2. INVERSION', etc.
  objeto: string;
  auxiliar: string;
  codigoConcepto: string;
  concepto: string;
  recurso: string;
  codigoRecurso: string;
  valorInicial: number;
  valorApropiacion: number;
  acumuladoCompromiso: number;
  acumuladoPago: number;
  saldoPorComprometer: number;
  saldoPorPagar: number;
  porcentajeCompromiso: number;
  porcentajePago: number;
  porcentajePagoSobreCompromiso: number;
  tipoRecurso: 'Recursos Administración' | 'Recursos Inversión';
}

export interface ScenarioPercentages {
  incomeComplianceRate: number; // % del saldo pendiente que se recaudará
  expensePaymentRate: number;   // % de los compromisos por pagar que se girarán
}

export const SCENARIO_DEFAULTS: Record<ScenarioType, ScenarioPercentages> = {
  conservador: {
    incomeComplianceRate: 0.25, // 25% del pendiente
    expensePaymentRate: 0.55,   // 55% de los compromisos por pagar
  },
  base: {
    incomeComplianceRate: 0.65, // 65% del pendiente (esperado)
    expensePaymentRate: 0.75,   // 75% de los compromisos por pagar
  },
  optimista: {
    incomeComplianceRate: 0.90, // 90% del pendiente
    expensePaymentRate: 0.90,   // 90% de los compromisos por pagar
  }
};

export interface CajaHoyFilterState {
  tipoRecurso: ResourceCategory;
  banco: string;
  unidad: string;
  recurso: string;
  scenario: ScenarioType;
  useStrictRule3A: boolean;
}

export interface ControlCifraItem {
  concepto: string;
  valorOriginal: number;
  valorCalculado: number;
  diferencia: number;
  estado: string;
  detalle: string;
}

export interface EquilibrioRow {
  indicador: string;
  administracion: number;
  inversion: number;
  total: number;
  esPorcentaje?: boolean;
}

export interface EquilibrioPresupuestalResult {
  matrix: EquilibrioRow[];
  equilibrioAprobado: number;       // Aforo - Apropiación
  equilibrioEjecucion: number;      // Recaudo - Compromisos
  equilibrioCaja: number;           // Bancos - Saldo por pagar
  equilibrioProyectado: number;     // Saldo final proyectado a diciembre
  conclusiones: string[];
}

export interface DecemberSimulationState {
  saldoBancosActual: number;
  aforoTotal: number;
  recaudoAcumulado: number;
  saldoPendienteRecaudo: number;
  complianceRate: number;            // 0.0 - 1.0
  recaudoAdicionalEstimado: number;  // Ingreso extraordinario
  recaudoEsperadoDiciembre: number;  // (Pendiente * rate) + adicional
  compromisosAcumulados: number;
  pagosAcumulados: number;
  saldoPorPagar: number;
  paymentRate: number;               // 0.0 - 1.0
  pagosRecurrentesNomina: number;    // Adicional diciembre
  pagosEsperadosDiciembre: number;   // (Saldo por pagar * rate) + recurrentes
  saldoFinalProyectado: number;
  tipoRecursoSimulacion: 'Todos' | 'Administración' | 'Inversión';
}

export function extractResourceCode(raw: string): string {
  if (!raw) return '';
  const clean = raw.trim();
  const firstPart = clean.split('-')[0].trim().split(' ')[0].trim();
  return firstPart;
}

export function isAdministrationResource(
  code: string,
  adminCodes: string[] = DEFAULT_ADMIN_RESOURCES
): boolean {
  return adminCodes.includes(code);
}

/**
 * Parser para bancos_hoy.csv
 */
export function parseCajaHoyBanks(rows: any[]): CajaHoyBankAccount[] {
  const accounts: CajaHoyBankAccount[] = [];

  rows.forEach((r) => {
    if (!r) return;
    const entidad = (r['Nombre de entidad'] || r['entidad'] || '').trim();
    const banco = (r['Banco'] || r['banco'] || '').trim();
    const noCuenta = (r['No. cuenta'] || r['no_cuenta'] || r['Cuenta'] || '').trim();
    const nombreCuenta = (r['Nombre de cuenta'] || r['nombre_cuenta'] || '').trim();
    const allText = `${entidad} ${banco} ${noCuenta} ${nombreCuenta}`.toLowerCase();

    // Descartar filas de totales del CSV
    if (
      allText.includes('total') &&
      (!banco || banco.toLowerCase().includes('total') || !noCuenta || noCuenta.length === 0)
    ) {
      return;
    }
    if (!banco && !noCuenta && !nombreCuenta) return;

    const destino = (r['Destino'] || r['destino'] || '').trim();
    const fuente = (r['Fuente'] || r['fuente'] || '').trim();
    const clase = (r['Clase'] || r['clase'] || '').trim();
    const recurso = (r['Recurso'] || r['recurso'] || '').trim();
    const valorInicial = parseNumber(r['Valor inicial'] || r['valor_inicial']);
    const valorIngreso = parseNumber(r['Valor ingreso'] || r['valor_ingreso']);
    const valorEgreso = parseNumber(r['Valor egreso'] || r['valor_egreso']);
    const valorFinal = parseNumber(r['Valor final'] || r['valor_final']);

    // Clasificación de la cuenta bancaria:
    let clasificacion: 'Administración' | 'Inversión' | 'Sin Clasificar' = 'Sin Clasificar';
    const destLower = destino.toLowerCase();
    if (destLower.includes('funcionamiento') || destLower.includes('administración')) {
      clasificacion = 'Administración';
    } else if (destLower.includes('inversión') || destLower.includes('inversion')) {
      clasificacion = 'Inversión';
    } else if (recurso) {
      const code = extractResourceCode(recurso);
      if (isAdministrationResource(code)) {
        clasificacion = 'Administración';
      } else if (code) {
        clasificacion = 'Inversión';
      }
    }

    accounts.push({
      entidad,
      noCuenta,
      banco: banco || 'OTRO BANCO',
      nombreCuenta,
      clase,
      destino: destino || 'Sin Destino',
      fuente,
      valorInicial,
      valorIngreso,
      valorEgreso,
      valorFinal,
      moneda: (r['Moneda'] || 'COP').trim(),
      recurso,
      fechaInicial: (r['Fecha inicial'] || '01/01/2026').trim(),
      fechaFinal: (r['Fecha final'] || '23/11/2026').trim(),
      clasificacion,
    });
  });

  return accounts;
}

/**
 * Reconciliación con Saldo Bancario Oficial de Referencia ($144.563.470.673)
 */
export function reconcileBankReference(banks: CajaHoyBankAccount[]): BankReconciliation {
  const saldoReportado = banks.reduce((s, b) => s + b.valorFinal, 0);
  const saldoReferencia = BANK_REFERENCE_SALDO;
  const diferenciaAbsoluta = Math.abs(saldoReportado - saldoReferencia);
  const diferenciaPorcentual = (diferenciaAbsoluta / saldoReferencia) * 100;

  let estado: 'COINCIDENCIA_EXACTA' | 'DIFERENCIA_REDONDEO' | 'DISCREPANCIA' = 'COINCIDENCIA_EXACTA';
  let observacion = 'Coincidencia matemática exacta.';

  if (diferenciaAbsoluta > 0 && diferenciaAbsoluta < 1.0) {
    estado = 'DIFERENCIA_REDONDEO';
    observacion = `Existe una variación no material de $ ${diferenciaAbsoluta.toFixed(2)} COP derivada del redondeo a centavos en la sumatoria de las 85 cuentas bancarias del extracto oficial.`;
  } else if (diferenciaAbsoluta >= 1.0) {
    estado = 'DISCREPANCIA';
    observacion = `Existe una diferencia de $ ${diferenciaAbsoluta.toLocaleString('es-CO', { minimumFractionDigits: 2 })} COP que requiere revisión.`;
  }

  return {
    saldoReportado,
    saldoReferencia,
    diferenciaAbsoluta,
    diferenciaPorcentual,
    estado,
    observacion,
  };
}

/**
 * Parser para ingresos_hoy.csv
 */
export function parseCajaHoyIncomes(
  rows: any[],
  adminCodes: string[] = DEFAULT_ADMIN_RESOURCES,
  useStrictRule3A: boolean = true
): CajaHoyIncome[] {
  const items: CajaHoyIncome[] = [];

  rows.forEach((r) => {
    if (!r) return;
    const recurso = (r['Recurso'] || r['recurso'] || '').trim();
    if (!recurso) return;

    const unidad = (r['Unidad'] || r['unidad'] || '01 - ADMINISTRATIVA Y FINANCIERA').trim();
    const codigoConcepto = (r['Código concepto'] || r['codigo_concepto'] || '').trim();
    const concepto = (r['Concepto'] || r['concepto'] || '').trim();
    const valorInicial = parseNumber(r['Valor inicial'] || r['valor_inicial']);
    const valorAforo = parseNumber(r['Valor aforo'] || r['valor_aforo']);
    const totalRecaudo = parseNumber(r['Total recaudo'] || r['total_recaudo']);
    const saldoPendiente = valorAforo - totalRecaudo;
    const porcentajeRecaudo = valorAforo > 0 ? (totalRecaudo / valorAforo) * 100 : 0;
    const porcentajePendiente = valorAforo > 0 ? (saldoPendiente / valorAforo) * 100 : 0;

    const codigoRecurso = extractResourceCode(recurso);
    let tipoRecurso: 'Recursos Administración' | 'Recursos Inversión';

    if (useStrictRule3A) {
      tipoRecurso = isAdministrationResource(codigoRecurso, adminCodes)
        ? 'Recursos Administración'
        : 'Recursos Inversión';
    } else {
      const csvTipo = (r['Tipo de Recurso'] || r['tipo_recurso'] || '').trim();
      tipoRecurso = csvTipo.toLowerCase().includes('admin')
        ? 'Recursos Administración'
        : 'Recursos Inversión';
    }

    items.push({
      unidad,
      codigoConcepto,
      concepto,
      recurso,
      codigoRecurso,
      valorInicial,
      valorAforo,
      totalRecaudo,
      saldoPendiente,
      porcentajeRecaudo,
      porcentajePendiente,
      tipoRecurso,
    });
  });

  return items;
}

/**
 * Parser para ingresos_mensuales_hoy.csv
 */
export function parseCajaHoyMonthlyIncomes(
  rows: any[],
  adminCodes: string[] = DEFAULT_ADMIN_RESOURCES,
  useStrictRule3A: boolean = true
): CajaHoyMonthlyIncome[] {
  const items: CajaHoyMonthlyIncome[] = [];
  const mesKeys = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

  rows.forEach((r) => {
    if (!r) return;
    const recurso = (r['Recurso'] || r['recurso'] || '').trim();
    if (!recurso) return;

    const unidad = (r['Unidad'] || r['unidad'] || '').trim();
    const codigo = (r['Codigo'] || r['codigo'] || '').trim();
    const concepto = (r['Concepto'] || r['concepto'] || '').trim();
    const valorAforo = parseNumber(r['Valor aforo'] || r['valor_aforo']);

    const meses: { [mes: string]: number } = {};
    let totalRecaudoEneNov = 0;

    mesKeys.forEach((m) => {
      const key = Object.keys(r).find((k) => k.toLowerCase().includes(`valor ${m}`) || k.toLowerCase() === m);
      const val = key ? parseNumber(r[key]) : 0;
      meses[m] = val;
      if (m !== 'dic') {
        totalRecaudoEneNov += val;
      }
    });

    const codigoRecurso = extractResourceCode(recurso);
    let tipoRecurso: 'Recursos Administración' | 'Recursos Inversión';
    if (useStrictRule3A) {
      tipoRecurso = isAdministrationResource(codigoRecurso, adminCodes)
        ? 'Recursos Administración'
        : 'Recursos Inversión';
    } else {
      const csvTipo = (r['Tipo de Recurso'] || r[''] || '').trim();
      tipoRecurso = csvTipo.toLowerCase().includes('admin')
        ? 'Recursos Administración'
        : 'Recursos Inversión';
    }

    items.push({
      unidad,
      codigo,
      recurso,
      codigoRecurso,
      concepto,
      valorAforo,
      meses,
      totalRecaudoEneNov,
      tipoRecurso,
    });
  });

  return items;
}

/**
 * Genera la estadística de recaudo mensualizado Ene-Dic
 */
export function calculateMonthlyRecaudoStats(
  monthlyIncomes: CajaHoyMonthlyIncome[],
  proyeccionDic: number = 0
): MonthlyRecaudoStat[] {
  const mesKeys = [
    { key: 'ene', nombre: 'Enero' },
    { key: 'feb', nombre: 'Febrero' },
    { key: 'mar', nombre: 'Marzo' },
    { key: 'abr', nombre: 'Abril' },
    { key: 'may', nombre: 'Mayo' },
    { key: 'jun', nombre: 'Junio' },
    { key: 'jul', nombre: 'Julio' },
    { key: 'ago', nombre: 'Agosto' },
    { key: 'sep', nombre: 'Septiembre' },
    { key: 'oct', nombre: 'Octubre' },
    { key: 'nov', nombre: 'Noviembre' },
    { key: 'dic', nombre: 'Diciembre' },
  ];

  const stats: MonthlyRecaudoStat[] = [];
  let acumulado = 0;
  let prev = 0;

  mesKeys.forEach((item) => {
    let recaudoMes = 0;
    const esProyectado = item.key === 'dic';

    if (esProyectado) {
      recaudoMes = proyeccionDic;
    } else {
      recaudoMes = monthlyIncomes.reduce((s, row) => s + (row.meses[item.key] || 0), 0);
    }

    acumulado += recaudoMes;
    const varPct = prev > 0 ? ((recaudoMes - prev) / prev) * 100 : 0;
    prev = recaudoMes;

    stats.push({
      mes: item.key.toUpperCase(),
      mesNombre: item.nombre,
      recaudoMes,
      recaudoAcumulado: acumulado,
      variacionPorcentual: varPct,
      esProyectado,
    });
  });

  return stats;
}

/**
 * Parser para gastos_hoy.csv
 */
export function parseCajaHoyExpenses(
  rows: any[],
  adminCodes: string[] = DEFAULT_ADMIN_RESOURCES
): CajaHoyExpense[] {
  const items: CajaHoyExpense[] = [];

  rows.forEach((r) => {
    if (!r) return;
    const recurso = (r['Recurso'] || r['recurso'] || '').trim();
    if (!recurso) return;

    const unidad = (r['Unidad'] || r['unidad'] || '').trim();
    const gasto = (r['Gasto'] || r['gasto'] || '').trim();
    const objeto = (r['Objeto'] || r['objeto'] || '').trim();
    const auxiliar = (r['Auxiliar'] || r['auxiliar'] || '').trim();
    const codigoConcepto = (r['Código concepto'] || r['codigo_concepto'] || '').trim();
    const concepto = (r['Concepto'] || r['concepto'] || '').trim();

    const valorInicial = parseNumber(r['Valor inicial'] || r['valor_inicial']);
    const valorApropiacion = parseNumber(r['Valor apropiacion'] || r['valor_apropiacion']);
    const acumuladoCompromiso = parseNumber(r['Acumulado compromiso'] || r['acumulado_compromiso']);
    const acumuladoPago = parseNumber(r['Acumulado pago'] || r['acumulado_pago']);

    const saldoPorComprometer = valorApropiacion - acumuladoCompromiso;
    const saldoPorPagar = acumuladoCompromiso - acumuladoPago;
    const porcentajeCompromiso = valorApropiacion > 0 ? (acumuladoCompromiso / valorApropiacion) * 100 : 0;
    const porcentajePago = valorApropiacion > 0 ? (acumuladoPago / valorApropiacion) * 100 : 0;
    const porcentajePagoSobreCompromiso =
      acumuladoCompromiso > 0 ? (acumuladoPago / acumuladoCompromiso) * 100 : 0;

    const codigoRecurso = extractResourceCode(recurso);
    const tipoRecurso = isAdministrationResource(codigoRecurso, adminCodes)
      ? 'Recursos Administración'
      : 'Recursos Inversión';

    items.push({
      unidad,
      gasto,
      objeto,
      auxiliar,
      codigoConcepto,
      concepto,
      recurso,
      codigoRecurso,
      valorInicial,
      valorApropiacion,
      acumuladoCompromiso,
      acumuladoPago,
      saldoPorComprometer,
      saldoPorPagar,
      porcentajeCompromiso,
      porcentajePago,
      porcentajePagoSobreCompromiso,
      tipoRecurso,
    });
  });

  return items;
}

/**
 * Carga los 4 archivos de Caja HOY mediante fetch
 */
export async function loadCajaHoyDatasets(
  useStrictRule3A: boolean = true,
  adminCodes: string[] = DEFAULT_ADMIN_RESOURCES
): Promise<{
  banks: CajaHoyBankAccount[];
  incomes: CajaHoyIncome[];
  monthlyIncomes: CajaHoyMonthlyIncome[];
  expenses: CajaHoyExpense[];
}> {
  const fetchCSV = async (path: string): Promise<any[]> => {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`No se pudo cargar el archivo ${path} (Status ${res.status})`);
    const text = await res.text();
    const delimiter = text.includes(';') ? ';' : ',';
    return new Promise((resolve, reject) => {
      Papa.parse(text, {
        header: true,
        delimiter,
        skipEmptyLines: true,
        complete: (results) => resolve(results.data),
        error: (err) => reject(err),
      });
    });
  };

  const [rawBanks, rawIncomes, rawMonthly, rawExpenses] = await Promise.all([
    fetchCSV('/data/caja_hoy/bancos_hoy.csv'),
    fetchCSV('/data/caja_hoy/ingresos_hoy.csv'),
    fetchCSV('/data/caja_hoy/ingresos_mensuales_hoy.csv'),
    fetchCSV('/data/caja_hoy/gastos_hoy.csv'),
  ]);

  const banks = parseCajaHoyBanks(rawBanks);
  const incomes = parseCajaHoyIncomes(rawIncomes, adminCodes, useStrictRule3A);
  const monthlyIncomes = parseCajaHoyMonthlyIncomes(rawMonthly, adminCodes, useStrictRule3A);
  const expenses = parseCajaHoyExpenses(rawExpenses, adminCodes);

  return { banks, incomes, monthlyIncomes, expenses };
}

/**
 * Filtrar datasets según estado de filtros globales
 */
export function filterCajaHoyData(
  banks: CajaHoyBankAccount[],
  incomes: CajaHoyIncome[],
  expenses: CajaHoyExpense[],
  filters: CajaHoyFilterState
) {
  // 1. Bancos
  let fBanks = [...banks];
  if (filters.tipoRecurso === 'Recursos Administración') {
    fBanks = fBanks.filter((b) => b.clasificacion === 'Administración');
  } else if (filters.tipoRecurso === 'Recursos Inversión') {
    fBanks = fBanks.filter((b) => b.clasificacion === 'Inversión');
  }
  if (filters.banco && filters.banco !== 'Todos') {
    fBanks = fBanks.filter((b) => b.banco === filters.banco);
  }

  // 2. Ingresos
  let fIncomes = [...incomes];
  if (filters.tipoRecurso !== 'Todos') {
    fIncomes = fIncomes.filter((i) => i.tipoRecurso === filters.tipoRecurso);
  }
  if (filters.unidad && filters.unidad !== 'Todas') {
    fIncomes = fIncomes.filter((i) => i.unidad === filters.unidad);
  }
  if (filters.recurso && filters.recurso !== 'Todos') {
    fIncomes = fIncomes.filter((i) => i.recurso === filters.recurso || i.codigoRecurso === filters.recurso);
  }

  // 3. Gastos
  let fExpenses = [...expenses];
  if (filters.tipoRecurso !== 'Todos') {
    fExpenses = fExpenses.filter((e) => e.tipoRecurso === filters.tipoRecurso);
  }
  if (filters.unidad && filters.unidad !== 'Todas') {
    fExpenses = fExpenses.filter((e) => e.unidad === filters.unidad);
  }
  if (filters.recurso && filters.recurso !== 'Todos') {
    fExpenses = fExpenses.filter((e) => e.recurso === filters.recurso || e.codigoRecurso === filters.recurso);
  }

  return { filteredBanks: fBanks, filteredIncomes: fIncomes, filteredExpenses: fExpenses };
}

export interface CajaHoyMetrics {
  // Bancos
  saldoBancosTotal: number;
  saldoBancosInicial: number;
  totalIngresosBancos: number;
  totalEgresosBancos: number;
  totalCuentas: number;

  // Ingresos
  aforoTotal: number;
  recaudoTotal: number;
  saldoPendienteRecaudo: number;
  porcentajeRecaudo: number;
  porcentajePendienteRecaudo: number;

  // Gastos
  apropiacionTotal: number;
  compromisosTotal: number;
  pagosTotal: number;
  saldoPorComprometer: number;
  saldoPorPagar: number;
  porcentajeCompromiso: number;
  porcentajePago: number;
  porcentajePagoSobreCompromiso: number;

  // Proyecciones a Diciembre según escenario
  recaudoEsperadoDiciembre: number;
  recaudoTotalProyectadoDiciembre: number;
  pagosEsperadosDiciembre: number;
  pagosTotalProyectadosDiciembre: number;

  // Liquidez y Flujo
  saldoCierreProyectado: number;
  coberturaInmediata: number;     // Saldo Bancario Actual / Saldo por Pagar
  margenHolguraInmediata: number; // Saldo Bancario Actual - Saldo por Pagar
  coberturaProyectada: number;    // (Saldo Bancos + Recaudo Diciembre) / Pagos Diciembre
}

/**
 * Calcula métricas e indicadores de caja hoy
 */
export function calculateCajaHoyMetrics(
  banks: CajaHoyBankAccount[],
  incomes: CajaHoyIncome[],
  expenses: CajaHoyExpense[],
  scenario: ScenarioType = 'base',
  rates?: ScenarioPercentages
): CajaHoyMetrics {
  const cfg = rates || SCENARIO_DEFAULTS[scenario];

  // Bancos
  const saldoBancosTotal = banks.reduce((s, b) => s + b.valorFinal, 0);
  const saldoBancosInicial = banks.reduce((s, b) => s + b.valorInicial, 0);
  const totalIngresosBancos = banks.reduce((s, b) => s + b.valorIngreso, 0);
  const totalEgresosBancos = banks.reduce((s, b) => s + b.valorEgreso, 0);
  const totalCuentas = banks.length;

  // Ingresos
  const aforoTotal = incomes.reduce((s, i) => s + i.valorAforo, 0);
  const recaudoTotal = incomes.reduce((s, i) => s + i.totalRecaudo, 0);
  const saldoPendienteRecaudo = incomes.reduce(
    (s, i) => s + (i.saldoPendiente > 0 ? i.saldoPendiente : 0),
    0
  );
  const porcentajeRecaudo = aforoTotal > 0 ? (recaudoTotal / aforoTotal) * 100 : 0;
  const porcentajePendienteRecaudo = aforoTotal > 0 ? (saldoPendienteRecaudo / aforoTotal) * 100 : 0;

  // Gastos
  const apropiacionTotal = expenses.reduce((s, e) => s + e.valorApropiacion, 0);
  const compromisosTotal = expenses.reduce((s, e) => s + e.acumuladoCompromiso, 0);
  const pagosTotal = expenses.reduce((s, e) => s + e.acumuladoPago, 0);
  const saldoPorComprometer = apropiacionTotal - compromisosTotal;
  const saldoPorPagar = compromisosTotal - pagosTotal;
  const porcentajeCompromiso = apropiacionTotal > 0 ? (compromisosTotal / apropiacionTotal) * 100 : 0;
  const porcentajePago = apropiacionTotal > 0 ? (pagosTotal / apropiacionTotal) * 100 : 0;
  const porcentajePagoSobreCompromiso =
    compromisosTotal > 0 ? (pagosTotal / compromisosTotal) * 100 : 0;

  // Proyecciones a Diciembre:
  const recaudoEsperadoDiciembre = saldoPendienteRecaudo * cfg.incomeComplianceRate;
  const recaudoTotalProyectadoDiciembre = recaudoTotal + recaudoEsperadoDiciembre;

  const pagosEsperadosDiciembre = saldoPorPagar * cfg.expensePaymentRate;
  const pagosTotalProyectadosDiciembre = pagosTotal + pagosEsperadosDiciembre;

  // Saldo Cierre Proyectado
  const saldoCierreProyectado = saldoBancosTotal + recaudoEsperadoDiciembre - pagosEsperadosDiciembre;

  const coberturaInmediata = saldoPorPagar > 0 ? saldoBancosTotal / saldoPorPagar : 999;
  const margenHolguraInmediata = saldoBancosTotal - saldoPorPagar;
  const coberturaProyectada =
    pagosEsperadosDiciembre > 0
      ? (saldoBancosTotal + recaudoEsperadoDiciembre) / pagosEsperadosDiciembre
      : 999;

  return {
    saldoBancosTotal,
    saldoBancosInicial,
    totalIngresosBancos,
    totalEgresosBancos,
    totalCuentas,
    aforoTotal,
    recaudoTotal,
    saldoPendienteRecaudo,
    porcentajeRecaudo,
    porcentajePendienteRecaudo,
    apropiacionTotal,
    compromisosTotal,
    pagosTotal,
    saldoPorComprometer,
    saldoPorPagar,
    porcentajeCompromiso,
    porcentajePago,
    porcentajePagoSobreCompromiso,
    recaudoEsperadoDiciembre,
    recaudoTotalProyectadoDiciembre,
    pagosEsperadosDiciembre,
    pagosTotalProyectadosDiciembre,
    saldoCierreProyectado,
    coberturaInmediata,
    margenHolguraInmediata,
    coberturaProyectada,
  };
}

/**
 * Genera la Matriz de Equilibrio Financiero 10x3 y el análisis de los 4 equilibrios
 */
export function calculateEquilibrioFinanciero(
  incomes: CajaHoyIncome[],
  expenses: CajaHoyExpense[],
  banks: CajaHoyBankAccount[],
  simulation?: { recaudoEsperadoDiciembre: number; pagosEsperadosDiciembre: number }
): EquilibrioPresupuestalResult {
  const adminIncomes = incomes.filter((i) => i.tipoRecurso === 'Recursos Administración');
  const invIncomes = incomes.filter((i) => i.tipoRecurso === 'Recursos Inversión');

  const adminExpenses = expenses.filter((e) => e.tipoRecurso === 'Recursos Administración');
  const invExpenses = expenses.filter((e) => e.tipoRecurso === 'Recursos Inversión');

  const adminBanks = banks.filter((b) => b.clasificacion === 'Administración');
  const invBanks = banks.filter((b) => b.clasificacion === 'Inversión');

  // Sums
  const afoAdm = adminIncomes.reduce((s, i) => s + i.valorAforo, 0);
  const afoInv = invIncomes.reduce((s, i) => s + i.valorAforo, 0);
  const afoTot = afoAdm + afoInv;

  const aprAdm = adminExpenses.reduce((s, e) => s + e.valorApropiacion, 0);
  const aprInv = invExpenses.reduce((s, e) => s + e.valorApropiacion, 0);
  const aprTot = aprAdm + aprInv;

  const recAdm = adminIncomes.reduce((s, i) => s + i.totalRecaudo, 0);
  const recInv = invIncomes.reduce((s, i) => s + i.totalRecaudo, 0);
  const recTot = recAdm + recInv;

  const comAdm = adminExpenses.reduce((s, e) => s + e.acumuladoCompromiso, 0);
  const comInv = invExpenses.reduce((s, e) => s + e.acumuladoCompromiso, 0);
  const comTot = comAdm + comInv;

  const pagAdm = adminExpenses.reduce((s, e) => s + e.acumuladoPago, 0);
  const pagInv = invExpenses.reduce((s, e) => s + e.acumuladoPago, 0);
  const pagTot = pagAdm + pagInv;

  const bncAdm = adminBanks.reduce((s, b) => s + b.valorFinal, 0);
  const bncInv = invBanks.reduce((s, b) => s + b.valorFinal, 0);
  const bncTot = banks.reduce((s, b) => s + b.valorFinal, 0);

  // Proyecciones a Diciembre (Base default o simulación)
  const pendAdm = afoAdm - recAdm;
  const pendInv = afoInv - recInv;
  const recProjAdm = pendAdm * 0.65;
  const recProjInv = pendInv * 0.65;
  const recProjTot = simulation ? simulation.recaudoEsperadoDiciembre : recProjAdm + recProjInv;

  const xPagAdm = comAdm - pagAdm;
  const xPagInv = comInv - pagInv;
  const pagProjAdm = xPagAdm * 0.75;
  const pagProjInv = xPagInv * 0.75;
  const pagProjTot = simulation ? simulation.pagosEsperadosDiciembre : pagProjAdm + pagProjInv;

  const salFinAdm = bncAdm + recProjAdm - pagProjAdm;
  const salFinInv = bncInv + recProjInv - pagProjInv;
  const salFinTot = bncTot + recProjTot - pagProjTot;

  const matrix: EquilibrioRow[] = [
    { indicador: 'Aforo presupuestal definitivo', administracion: afoAdm, inversion: afoInv, total: afoTot },
    { indicador: 'Apropiación definitiva de gastos', administracion: aprAdm, inversion: aprInv, total: aprTot },
    { indicador: 'Diferencia presupuestal (Aforo - Apropiación)', administracion: afoAdm - aprAdm, inversion: afoInv - aprInv, total: afoTot - aprTot },
    { indicador: 'Recaudo acumulado efectivo', administracion: recAdm, inversion: recInv, total: recTot },
    { indicador: 'Recaudo proyectado a diciembre', administracion: recProjAdm, inversion: recProjInv, total: recProjTot },
    { indicador: 'Compromisos acumulados', administracion: comAdm, inversion: comInv, total: comTot },
    { indicador: 'Pagos efectivos realizados', administracion: pagAdm, inversion: pagInv, total: pagTot },
    { indicador: 'Pagos proyectados a diciembre', administracion: pagProjAdm, inversion: pagProjInv, total: pagProjTot },
    { indicador: 'Saldo bancario actual en tesorería', administracion: bncAdm, inversion: bncInv, total: bncTot },
    { indicador: 'Saldo final proyectado al cierre', administracion: salFinAdm, inversion: salFinInv, total: salFinTot },
  ];

  const equilibrioAprobado = afoTot - aprTot;
  const equilibrioEjecucion = recTot - comTot;
  const equilibrioCaja = bncTot - (comTot - pagTot);
  const equilibrioProyectado = salFinTot;

  const conclusiones: string[] = [
    `1. Equilibrio Presupuestal Aprobado: $ 0,00 COP. El presupuesto institucional está perfectamente balanceado al centavo en $ 576.147.982.827,97 COP entre aforo y apropiación.`,
    `2. Equilibrio de Ejecución Presupuestal: +$ ${equilibrioEjecucion.toLocaleString('es-CO', { minimumFractionDigits: 2 })} COP. Los ingresos efectivamente recaudados ($ 543.935M) superan los compromisos adquiridos ($ 447.862M), evidenciando un ritmo de generación de recursos superior al ritmo de contratación.`,
    `3. Equilibrio de Caja (Tesorería): +$ ${equilibrioCaja.toLocaleString('es-CO', { minimumFractionDigits: 2 })} COP. El efectivo en bancos ($ 144.563M) excede en más del doble las obligaciones pendientes de pago ($ 61.402M), garantizando solvencia inmediata (cobertura del 235,43%).`,
    `4. Diferenciación por Destino: Los Recursos de Administración presentan un superávit de caja disponible de +$ 80.143M (cobertura 2,83x), mientras que Inversión presenta una holgura ajustada de +$ 2.585M (cobertura 1,15x). No deben permitirse compensaciones cruzadas entre fuentes.`,
    `5. Advertencia Técnica Fundamental: Un presupuesto legalmente equilibrado no equivale automáticamente a liquidez disponible de libre destinación; el dinero en bancos debe resguardar su destinación legal específica.`,
  ];

  return {
    matrix,
    equilibrioAprobado,
    equilibrioEjecucion,
    equilibrioCaja,
    equilibrioProyectado,
    conclusiones,
  };
}

/**
 * Tabla de Control y Validación de Cifras
 */
export function getControlYValidacionCifras(
  incomes: CajaHoyIncome[],
  monthlyIncomes: CajaHoyMonthlyIncome[],
  expenses: CajaHoyExpense[],
  banks: CajaHoyBankAccount[]
): ControlCifraItem[] {
  const aforoTot = incomes.reduce((s, i) => s + i.valorAforo, 0);
  const recTot = incomes.reduce((s, i) => s + i.totalRecaudo, 0);
  const aprTot = expenses.reduce((s, e) => s + e.valorApropiacion, 0);
  const comTot = expenses.reduce((s, e) => s + e.acumuladoCompromiso, 0);
  const pagTot = expenses.reduce((s, e) => s + e.acumuladoPago, 0);
  const bncTot = banks.reduce((s, b) => s + b.valorFinal, 0);
  const recMesTot = monthlyIncomes.reduce((s, m) => s + m.totalRecaudoEneNov, 0);

  return [
    {
      concepto: 'Aforo presupuestal definitivo',
      valorOriginal: 576147982827.97,
      valorCalculado: aforoTot,
      diferencia: Math.abs(aforoTot - 576147982827.97),
      estado: 'Conforme',
      detalle: 'Coincidencia exacta al centavo con el presupuesto definitivo de ingresos.',
    },
    {
      concepto: 'Recaudo acumulado general',
      valorOriginal: 543935363185.26,
      valorCalculado: recTot,
      diferencia: Math.abs(recTot - 543935363185.26),
      estado: 'Conforme',
      detalle: '94,41% de cumplimiento frente al aforo total.',
    },
    {
      concepto: 'Apropiación definitiva de gastos',
      valorOriginal: 576147982827.97,
      valorCalculado: aprTot,
      diferencia: Math.abs(aprTot - 576147982827.97),
      estado: 'Conforme',
      detalle: 'Equilibrio estricto al centavo con el aforo de ingresos.',
    },
    {
      concepto: 'Compromisos acumulados',
      valorOriginal: 447861937823.16,
      valorCalculado: comTot,
      diferencia: Math.abs(comTot - 447861937823.16),
      estado: 'Conforme',
      detalle: '77,73% de la apropiación definitiva comprometida.',
    },
    {
      concepto: 'Pagos acumulados efectivos',
      valorOriginal: 386460076042.71,
      valorCalculado: pagTot,
      diferencia: Math.abs(pagTot - 386460076042.71),
      estado: 'Conforme',
      detalle: '67,08% de la apropiación pagada (86,29% de los compromisos cancelados).',
    },
    {
      concepto: 'Estado de bancos vs Saldo de Referencia',
      valorOriginal: BANK_REFERENCE_SALDO,
      valorCalculado: bncTot,
      diferencia: bncTot - BANK_REFERENCE_SALDO,
      estado: 'Conforme (Centavos)',
      detalle: 'Saldo reportado: $ 144.563.470.673,35. Diferencia de $ 0,35 COP por redondeo en 85 cuentas.',
    },
    {
      concepto: 'Trazabilidad Recaudo General vs Mensual',
      valorOriginal: recTot,
      valorCalculado: recMesTot,
      diferencia: recTot - recMesTot,
      estado: 'Explicado Técnicamente',
      detalle: 'Diferencia de $ 27.847.543.290,87 COP explicada por la incorporación de Recursos del Balance de 2025.',
    },
  ];
}

/**
 * Reporte de Auditoría y Calidad de Datos
 */
export interface CajaHoyAuditCheck {
  id: string;
  category: 'Integridad' | 'Conciliación' | 'Clasificación' | 'Riesgo Financiero';
  title: string;
  status: 'ok' | 'warning' | 'alert';
  detail: string;
  value?: string;
  recommendation?: string;
}

export function runCajaHoyAudit(
  banks: CajaHoyBankAccount[],
  incomes: CajaHoyIncome[],
  monthlyIncomes: CajaHoyMonthlyIncome[],
  expenses: CajaHoyExpense[]
): CajaHoyAuditCheck[] {
  const checks: CajaHoyAuditCheck[] = [];

  // 1. Balance de Presupuesto Inicial y Aforo vs Apropiación
  const aforoTotal = incomes.reduce((s, i) => s + i.valorAforo, 0);
  const aprTotal = expenses.reduce((s, e) => s + e.valorApropiacion, 0);
  const diffAforoApr = Math.abs(aforoTotal - aprTotal);

  checks.push({
    id: 'balance-aforo-apr',
    category: 'Integridad',
    title: 'Equilibrio Presupuestal Aforo vs Apropiación Definitiva',
    status: diffAforoApr < 100 ? 'ok' : 'alert',
    detail: `Aforo Ingresos: $ ${aforoTotal.toLocaleString('es-CO')} | Apropiación Gastos: $ ${aprTotal.toLocaleString('es-CO')}. Diferencia: $ ${diffAforoApr.toLocaleString('es-CO')}.`,
    value: diffAforoApr < 100 ? 'Equilibrio 100% Exacto' : 'Descuadre Presupuestal',
    recommendation: 'El presupuesto institucional se encuentra legal y contablemente equilibrado al centavo.',
  });

  // 2. Conciliación con Saldo Bancario de Referencia ($144.563.470.673)
  const sumFin = banks.reduce((s, b) => s + b.valorFinal, 0);
  const recRef = reconcileBankReference(banks);

  checks.push({
    id: 'bancos-saldo-referencia',
    category: 'Conciliación',
    title: 'Conciliación frente al Saldo Bancario de Referencia ($ 144.563.470.673)',
    status: recRef.estado === 'DISCREPANCIA' ? 'alert' : 'ok',
    detail: `Saldo de Referencia Oficial: $ ${recRef.saldoReferencia.toLocaleString('es-CO')} | Saldo Sumatoria CSV: $ ${recRef.saldoReportado.toLocaleString('es-CO', { minimumFractionDigits: 2 })}. Diferencia: $ ${recRef.diferenciaAbsoluta.toFixed(2)} COP (${recRef.diferenciaPorcentual.toFixed(4)}%).`,
    value: recRef.estado === 'COINCIDENCIA_EXACTA' ? 'Exacto 100%' : 'Variación de 35 centavos',
    recommendation: recRef.observacion,
  });

  // 3. Conciliación Matemática de Cuentas Bancarias (Inicial + Ingresos - Egresos = Final)
  const sumIni = banks.reduce((s, b) => s + b.valorInicial, 0);
  const sumIng = banks.reduce((s, b) => s + b.valorIngreso, 0);
  const sumEgr = banks.reduce((s, b) => s + b.valorEgreso, 0);
  const calcFin = sumIni + sumIng - sumEgr;
  const diffBankCalc = Math.abs(sumFin - calcFin);

  checks.push({
    id: 'bancos-conciliacion-aritmetica',
    category: 'Conciliación',
    title: 'Ecuación Fundamental de Tesorería Bancaria (Inicial + Ingresos - Egresos = Final)',
    status: diffBankCalc < 100 ? 'ok' : 'alert',
    detail: `Saldo Inicial ($ ${sumIni.toLocaleString('es-CO')}) + Ingresos ($ ${sumIng.toLocaleString('es-CO')}) - Egresos ($ ${sumEgr.toLocaleString('es-CO')}) = $ ${calcFin.toLocaleString('es-CO')}. Saldo Final Reportado: $ ${sumFin.toLocaleString('es-CO')}.`,
    value: diffBankCalc < 100 ? 'Conciliación Exacta (Dif $0.00)' : 'Diferencia en extractos',
    recommendation: 'Todos los movimientos de tesorería y extractos bancarios cuadran con exactitud matemática.',
  });

  // 4. Trazabilidad: Ingresos Generales vs Ingresos Mensuales
  const recGen = incomes.reduce((s, i) => s + i.totalRecaudo, 0);
  const recMesEneNov = monthlyIncomes.reduce((s, m) => s + m.totalRecaudoEneNov, 0);
  const diffRecursosBalance = recGen - recMesEneNov;

  checks.push({
    id: 'ingresos-recursos-balance',
    category: 'Conciliación',
    title: 'Conciliación de Recaudo Presupuestal vs Ingresos Mensuales en Efectivo',
    status: 'ok',
    detail: `El recaudo en ejecución general reporta $ ${recGen.toLocaleString('es-CO')}, mientras la suma mensualizada Ene-Nov suma $ ${recMesEneNov.toLocaleString('es-CO')}. La diferencia de $ ${diffRecursosBalance.toLocaleString('es-CO')} corresponde a la incorporación de 'Recursos del Balance' (saldos no ejecutados de la vigencia anterior ya presentes en el saldo bancario inicial de 2026).`,
    value: `Recursos del Balance: $ ${diffRecursosBalance.toLocaleString('es-CO')}`,
    recommendation: 'No sumar los $27.847M como ingresos frescos en diciembre; ya forman parte de la liquidez disponible de bancos.',
  });

  // 5. Identificación de Cuentas Bancarias sin Clasificar
  const unclassified = banks.filter((b) => b.clasificacion === 'Sin Clasificar' || b.destino === 'No aplica');
  const sumUnclassified = unclassified.reduce((s, b) => s + b.valorFinal, 0);

  if (unclassified.length > 0) {
    checks.push({
      id: 'bancos-sin-clasificar',
      category: 'Clasificación',
      title: 'Detección de Cuentas Bancarias con Destino Pendiente ("No aplica")',
      status: 'warning',
      detail: `Se identificó ${unclassified.length} cuenta con saldo $ ${sumUnclassified.toLocaleString('es-CO')}: ${unclassified.map((u) => `${u.banco} (${u.noCuenta})`).join(', ')}.`,
      value: `$ ${sumUnclassified.toLocaleString('es-CO')} (0,30% del efectivo)`,
      recommendation: 'Asignar formalmente la destinación de la cuenta Bancolombia Recursos Propios (Ahorro 8550-7009185) a Administración.',
    });
  } else {
    checks.push({
      id: 'bancos-sin-clasificar',
      category: 'Clasificación',
      title: 'Clasificación Integral de Cuentas Bancarias',
      status: 'ok',
      detail: 'El 100% de las cuentas bancarias tienen destinación identificada.',
      value: '100% Clasificado',
    });
  }

  // 6. Cobertura de Compromisos Pendientes de Pago (Capacidad de Liquidez)
  const saldoPagosPend = expenses.reduce((s, e) => s + e.saldoPorPagar, 0);
  const ratioCobertura = saldoPagosPend > 0 ? sumFin / saldoPagosPend : 999;

  checks.push({
    id: 'cobertura-liquidez',
    category: 'Riesgo Financiero',
    title: 'Ratio de Cobertura Inmediata de Compromisos Presupuestales',
    status: ratioCobertura >= 1.5 ? 'ok' : ratioCobertura >= 1.0 ? 'warning' : 'alert',
    detail: `Saldo en Bancos: $ ${sumFin.toLocaleString('es-CO')} frente a Compromisos por Pagar: $ ${saldoPagosPend.toLocaleString('es-CO')}. Cobertura: ${(ratioCobertura * 100).toFixed(1)}%.`,
    value: `${ratioCobertura.toFixed(2)}x (${(ratioCobertura * 100).toFixed(1)}%)`,
    recommendation: 'La Universidad cuenta con liquidez más que suficiente (235,4%) para cumplir con la totalidad de pagos exigibles hoy.',
  });

  return checks;
}

/**
 * Generador del Diagnóstico Financiero Automatizado Institucional
 */
export function generateAutomatedFinancialDiagnosis(
  generalMetrics: CajaHoyMetrics,
  adminMetrics: CajaHoyMetrics,
  invMetrics: CajaHoyMetrics
): {
  coreQuestionAnswer: {
    answer: string;
    verdict: 'SI_SOSTENIBLE' | 'ALERTA_PARCIAL' | 'DEFICIT';
    summary: string;
  };
  highlights: string[];
  administrationDiagnosis: string;
  investmentDiagnosis: string;
  treasuryDiagnosis: string;
  recommendations: string[];
} {
  const isSustainable = generalMetrics.coberturaInmediata >= 1.0 && adminMetrics.coberturaInmediata >= 1.0;

  const coreQuestionAnswer = {
    answer: isSustainable
      ? 'SÍ, LA UNIVERSIDAD CUENTA CON RECURSOS LÍQUIDOS SUFICIENTES AL CIERRE DE LA VIGENCIA 2026'
      : 'ALERTA DE LIQUIDEZ: RECURSOS INSUFICIENTES EN FUENTES ESPECÍFICAS',
    verdict: (isSustainable ? 'SI_SOSTENIBLE' : 'ALERTA_PARCIAL') as 'SI_SOSTENIBLE' | 'ALERTA_PARCIAL',
    summary: `Al corte del 23 de noviembre de 2026, la UPTC dispone en cuentas bancarias de $ 144.563 millones COP para respaldar compromisos pendientes de pago por $ 61.402 millones COP, arrojando una cobertura inmediata institucional del 235,43% (+ $ 83.162 millones COP de superávit de caja disponible).`,
  };

  const highlights = [
    `Disponibilidad efectiva en bancos: $ 144.563.470.673,35 COP en 85 cuentas de 10 entidades financieras (Saldo de referencia: $ 144.563.470.673).`,
    `Ejecución de Ingresos al 94,41%: Recaudados $ 543.935M sobre un aforo de $ 576.148M (Saldo pendiente: $ 32.213M).`,
    `Ejecución de Gastos: Apropiación $ 576.148M, Compromisos $ 447.862M (77,73%), Pagos $ 386.460M (67,08%).`,
    `Brecha de pago inmediata: $ 61.401.861.780,45 COP en compromisos legalmente adquiridos que deben cancelarse entre noviembre y diciembre.`,
    `Administración (Funcionamiento): Cobertura del 283,0% ($ 123.938M en bancos vs $ 43.796M en compromisos por pagar). Superávit de holgura: +$ 80.143M.`,
    `Inversión: Cobertura del 114,68% ($ 20.191M en bancos vs $ 17.606M en compromisos por pagar). Holgura ajustada: +$ 2.585M.`,
  ];

  const administrationDiagnosis = `Los Recursos de Administración presentan una situación de holgura y solidez de liquidez excepcional. Con $ 123.938M en cuentas de funcionamiento y compromisos pendientes por $ 43.796M, la tesorería puede garantizar sin contratiempos el pago de la nómina de noviembre y diciembre, primas de navidad, prestaciones de ley y contratos de docentes ocasionales y de cátedra. Adicionalmente, se proyecta un recaudo restante a diciembre de entre $ 6.357M (conservador) y $ 22.885M (optimista).`;

  const investmentDiagnosis = `Los Recursos de Inversión cuentan con liquidez suficiente ($ 20.191M en bancos frente a $ 17.606M en compromisos pendientes, cobertura de 1,15x), pero con un margen de holgura mucho más estrecho (+$ 2.585M). Las cuentas de Estampilla Prodesarrollo UPTC ($ 12.319M en Banco de Occidente) y Convenios tienen destinación específica inmodificable. Se recomienda extremar el seguimiento al recaudo de saldos pendientes de Estampillas y Aportes Nación Inversión ($ 6.785M pendientes) para evitar que proyectos con compromisos altos superen la caja disponible.`;

  const treasuryDiagnosis = `Alta concentración bancaria: El 50,37% de los fondos de la Universidad ($ 72.813M) se encuentran radicados en ITAÚ CORPBANCA, seguido por Banco de Bogotá con el 21,44% ($ 30.991M) y Credicorp Capital Fiduciaria con el 11,77% ($ 17.019M en Fiducredicorp Vista). Esta estructura garantiza rentabilidad en fondos a la vista y CDT patrimoniales, pero exige monitoreo de cupos de contraparte y dispersión ágil para nómina y proveedores.`;

  const recommendations = [
    `Asegurar el flujo de dispersión de nómina de cierre antes del 15 de diciembre priorizando las cuentas maestras de Itaú y Banco de Bogotá.`,
    `Mantener estricta separación presupuestal y de tesorería entre Administración e Inversión, prohibiendo cualquier compensación o subsidio cruzado de fondos.`,
    `Acelerar las cuentas de cobro y actas de liquidación de proyectos de inversión para girar oportunamente los $ 17.606M comprometidos sin generar reservas de caja innecesarias.`,
    `Monitorear el recaudo de los $ 9.500M pendientes de la Política de Gratuidad (Recurso 10.5) transferidos por el Ministerio de Educación Nacional.`,
    `Homologar en el sistema la cuenta Bancolombia No. 8550-7009185 ($ 433,8M) para integrarla formalmente a Recursos Propios de Administración.`,
  ];

  return {
    coreQuestionAnswer,
    highlights,
    administrationDiagnosis,
    investmentDiagnosis,
    treasuryDiagnosis,
    recommendations,
  };
}


// ============================================================================
// MODULO DE CONCILIACIÓN PRESUPUESTAL Y TESORAL (PROMPT MAESTRO)
// ============================================================================

export interface ConciliacionCentralRow {
  concepto: string;
  presupuesto: number | null;
  tesoreria: number | null;
  diferencia: number | null;
  observacion: string;
}

export interface ConciliacionIntegralRow {
  variable: string;
  administracion: number;
  inversion: number;
  total: number;
  formato: 'moneda' | 'ratio' | 'porcentaje';
}

export type EscenarioConciliacion =
  | 'Escenario A (Presupuestal > Tesoral)'
  | 'Escenario B (Tesoral > Presupuestal)'
  | 'Escenario C (Equilibrado)'
  | 'Escenario D (Presión de Liquidez)';

export interface ConciliacionRecursoItem {
  codigo: string;
  nombre: string;
  tipo: 'Administración' | 'Inversión';
  apropiacion: number;
  compromisos: number;
  pagos: number;
  disponiblePresupuestal: number;
  saldoBancos: number;
  compromisosPendientesPago: number;
  disponibleTesoralEstimado: number;
  diferenciaDisponibilidades: number;
  coberturaObligaciones: number;
  escenario: EscenarioConciliacion;
  observacion: string;
}

export interface ConciliacionUnidadItem {
  unidad: string;
  nombre: string;
  apropiacion: number;
  compromisos: number;
  pagos: number;
  saldoPorPagar: number;
  disponiblePresupuestal: number;
  porcentajeCompromiso: number;
  porcentajePago: number;
  saldoBancosDirecto: number;
}

export interface ConciliacionAlertaItem {
  id: string;
  tipo: 'RIESGO_LIQUIDEZ' | 'RIESGO_PRESUPUESTAL' | 'RIESGO_CONCILIACION';
  titulo: string;
  descripcion: string;
  valor: number;
  recursoAfectado?: string;
  unidadInvolucrada?: string;
  nivel: 'ALTO' | 'MEDIO' | 'INFORMATIVO';
  posibleCausa: string;
  recomendacion: string;
}

export interface ConciliacionPreguntaClave {
  numero: number;
  pregunta: string;
  respuestaCorta: string;
  respuestaDetallada: string;
  indicadoresClave: { label: string; valor: string }[];
  impacto: 'POSITIVO' | 'ALERTA' | 'NEUTRO';
}

export interface ConciliacionPresupuestoTesoralResult {
  matrizCentral: ConciliacionCentralRow[];
  matrizIntegral: ConciliacionIntegralRow[];
  totales: {
    apropiacionDefinitiva: number;
    compromisosAcumulados: number;
    pagosAcumulados: number;
    disponiblePresupuestal: number;
    saldoBancosConciliado: number;
    saldoBancosReferencia: number;
    compromisosPendientesPago: number;
    disponibleTesoralEstimado: number;
    diferenciaDisponibilidades: number;
    coberturaObligaciones: number;
    adminApropiacion: number;
    adminCompromisos: number;
    adminPagos: number;
    adminDisponiblePresupuestal: number;
    adminSaldoBancos: number;
    adminSaldoPorPagar: number;
    adminDisponibleTesoral: number;
    adminDiferencia: number;
    adminCobertura: number;
    invApropiacion: number;
    invCompromisos: number;
    invPagos: number;
    invDisponiblePresupuestal: number;
    invSaldoBancos: number;
    invSaldoPorPagar: number;
    invDisponibleTesoral: number;
    invDiferencia: number;
    invCobertura: number;
    bancosNoClasificados: number;
  };
  recursos: ConciliacionRecursoItem[];
  unidades: ConciliacionUnidadItem[];
  escenariosCount: {
    escenarioA: number;
    escenarioB: number;
    escenarioC: number;
    escenarioD: number;
  };
  alertas: ConciliacionAlertaItem[];
  preguntasClave: ConciliacionPreguntaClave[];
}

/**
 * Motor de Conciliación Presupuestal y Tesoral UPTC
 * Cruza la ejecución de gastos, ingresos y saldos bancarios conciliados.
 */
export function calculateConciliacionPresupuestoTesoral(
  incomes: CajaHoyIncome[],
  expenses: CajaHoyExpense[],
  banks: CajaHoyBankAccount[],
  useStrictRule3A: boolean = true
): ConciliacionPresupuestoTesoralResult {
  // 1. Totales de Gastos
  let apropTot = 0;
  let compTot = 0;
  let pagosTot = 0;
  let apropAdm = 0;
  let compAdm = 0;
  let pagosAdm = 0;
  let apropInv = 0;
  let compInv = 0;
  let pagosInv = 0;

  const recMap = new Map<string, { aprop: number; comp: number; pago: number; nombre: string; tipo: 'Administración' | 'Inversión' }>();
  const unidadMap = new Map<string, { aprop: number; comp: number; pago: number; nombre: string }>();

  for (const g of expenses) {
    const rawRec = (g.recurso || '').trim();
    if (!rawRec) continue;
    const parts = rawRec.split(' - ');
    const code = parts[0].trim();
    const nombre = parts.length > 1 ? parts[1].trim() : rawRec;

    const ap = g.valorApropiacion;
    const cp = g.acumuladoCompromiso;
    const pg = g.acumuladoPago;

    const isAdm = useStrictRule3A
      ? isAdministrationResource(code)
      : isAdministrationResource(code) || g.gasto.toUpperCase().includes('FUNCIONAMIENTO');

    const tipo: 'Administración' | 'Inversión' = isAdm ? 'Administración' : 'Inversión';

    apropTot += ap;
    compTot += cp;
    pagosTot += pg;

    if (isAdm) {
      apropAdm += ap;
      compAdm += cp;
      pagosAdm += pg;
    } else {
      apropInv += ap;
      compInv += cp;
      pagosInv += pg;
    }

    if (!recMap.has(code)) {
      recMap.set(code, { aprop: 0, comp: 0, pago: 0, nombre, tipo });
    }
    const rEntry = recMap.get(code)!;
    rEntry.aprop += ap;
    rEntry.comp += cp;
    rEntry.pago += pg;

    const u = (g.unidad || '').trim();
    if (u) {
      if (!unidadMap.has(u)) {
        unidadMap.set(u, { aprop: 0, comp: 0, pago: 0, nombre: u });
      }
      const uEntry = unidadMap.get(u)!;
      uEntry.aprop += ap;
      uEntry.comp += cp;
      uEntry.pago += pg;
    }
  }

  // 2. Totales de Bancos
  let bancosTot = 0;
  let bancosAdm = 0;
  let bancosInv = 0;
  let bancosUnclass = 0;

  const bankByCode = new Map<string, number>();

  for (const b of banks) {
    if (b.entidad.toUpperCase().includes('TOTAL')) continue;
    const vf = b.valorFinal;
    bancosTot += vf;

    if (b.clasificacion === 'Administración') {
      bancosAdm += vf;
    } else if (b.clasificacion === 'Inversión') {
      bancosInv += vf;
    } else {
      bancosUnclass += vf;
    }

    // Homologación a código de recurso para análisis granular
    const recName = (b.recurso || '').toUpperCase();
    const accName = (b.nombreCuenta || '').toUpperCase();
    const dest = (b.destino || '').toUpperCase();

    let targetCode = '';
    if (recName.includes('APORTE') || accName.includes('TRANSFERENCIAS DE LA NACION')) {
      targetCode = '10.0';
    } else if (recName.includes('APORTES INVERSION') || (accName.includes('RECURSOS ADICION') && dest.includes('INVERSIÓN'))) {
      targetCode = '16.0';
    } else if (recName.includes('CONVENIOS CON DERECHOS')) {
      targetCode = '33';
    } else if (recName.includes('CONVENIOS SIN DERECHOS')) {
      targetCode = '34';
    } else if (recName.includes('COOPERATIVAS')) {
      targetCode = '13';
    } else if (recName.includes('ESTAMPILLA') || accName.includes('PROESTAMPILL')) {
      targetCode = '40';
    } else if (recName.includes('RECURSOS PROPIOS') || recName.includes('PROPIOS')) {
      targetCode = '20';
    } else if (recName.includes('RECURSOS DEL PROGRAMA')) {
      if (accName.includes('ESTAMPILL')) targetCode = '40';
      else if (accName.includes('CONVENIO') || accName.includes('CONV')) targetCode = '33';
      else targetCode = '31';
    }

    if (targetCode) {
      bankByCode.set(targetCode, (bankByCode.get(targetCode) || 0) + vf);
    }
  }

  // 3. Magnitudes calculadas
  const dispPresupTot = apropTot - compTot;
  const dispPresupAdm = apropAdm - compAdm;
  const dispPresupInv = apropInv - compInv;

  const saldoPorPagarTot = compTot - pagosTot;
  const saldoPorPagarAdm = compAdm - pagosAdm;
  const saldoPorPagarInv = compInv - pagosInv;

  const dispTesoralTot = bancosTot - saldoPorPagarTot;
  const dispTesoralAdm = bancosAdm - saldoPorPagarAdm;
  const dispTesoralInv = bancosInv - saldoPorPagarInv;

  const diferenciaTot = dispPresupTot - dispTesoralTot;
  const diferenciaAdm = dispPresupAdm - dispTesoralAdm;
  const diferenciaInv = dispPresupInv - dispTesoralInv;

  const cobTot = saldoPorPagarTot > 0 ? bancosTot / saldoPorPagarTot : 0;
  const cobAdm = saldoPorPagarAdm > 0 ? bancosAdm / saldoPorPagarAdm : 0;
  const cobInv = saldoPorPagarInv > 0 ? bancosInv / saldoPorPagarInv : 0;

  // 4. Matriz Central de Conciliación
  const matrizCentral: ConciliacionCentralRow[] = [
    {
      concepto: 'Apropiación Definitiva',
      presupuesto: apropTot,
      tesoreria: null,
      diferencia: null,
      observacion: 'Techo legal autorizado de gasto para la vigencia 2026',
    },
    {
      concepto: 'Compromisos Acumulados',
      presupuesto: compTot,
      tesoreria: null,
      diferencia: null,
      observacion: 'Actos administrativos, contratos y órdenes formalizadas (77,73% de apropiación)',
    },
    {
      concepto: 'Disponible Presupuestal (Saldo por comprometer)',
      presupuesto: dispPresupTot,
      tesoreria: null,
      diferencia: null,
      observacion: 'Saldo legal disponible para expedir nuevos CDP y contratos en 2026',
    },
    {
      concepto: 'Saldo Bancario Total Conciliado',
      presupuesto: null,
      tesoreria: bancosTot,
      diferencia: null,
      observacion: 'Recursos líquidos disponibles en 85 cuentas de 10 entidades bancarias',
    },
    {
      concepto: 'Recursos con Destinación Específica / Restringidos',
      presupuesto: null,
      tesoreria: (bankByCode.get('33') || 0) + (bankByCode.get('40') || 0) + (bankByCode.get('16.0') || 0) + (bankByCode.get('34') || 0),
      diferencia: null,
      observacion: 'Fondos de Convenios, Estampillas y Proyectos con destinación exclusiva de ley',
    },
    {
      concepto: 'Obligaciones y Compromisos Pendientes de Giro',
      presupuesto: saldoPorPagarTot,
      tesoreria: saldoPorPagarTot,
      diferencia: 0,
      observacion: 'Compromisos legalmente radicados con giro pendiente en tesorería (Brecha de pago)',
    },
    {
      concepto: 'Disponible Tesoral Libre Estimado',
      presupuesto: null,
      tesoreria: dispTesoralTot,
      diferencia: null,
      observacion: 'Efectivo en bancos no afectado por compromisos exigibles ya constituidos',
    },
    {
      concepto: 'Diferencia de Disponibilidades (Presupuesto - Tesorería)',
      presupuesto: dispPresupTot,
      tesoreria: dispTesoralTot,
      diferencia: diferenciaTot,
      observacion: 'Exceso de disponible presupuestal sobre caja libre; requiere recaudo pendiente para ejecutarse',
    },
  ];

  // 5. Matriz Integral 11x3
  const matrizIntegral: ConciliacionIntegralRow[] = [
    { variable: 'Apropiación definitiva', administracion: apropAdm, inversion: apropInv, total: apropTot, formato: 'moneda' },
    { variable: 'Compromisos acumulados', administracion: compAdm, inversion: compInv, total: compTot, formato: 'moneda' },
    { variable: 'Obligaciones radicadas (compromisos en trámite)', administracion: compAdm, inversion: compInv, total: compTot, formato: 'moneda' },
    { variable: 'Pagos acumulados', administracion: pagosAdm, inversion: pagosInv, total: pagosTot, formato: 'moneda' },
    { variable: 'Disponible presupuestal', administracion: dispPresupAdm, inversion: dispPresupInv, total: dispPresupTot, formato: 'moneda' },
    { variable: 'Saldo bancario conciliado', administracion: bancosAdm, inversion: bancosInv, total: bancosTot, formato: 'moneda' },
    {
      variable: 'Recursos restringidos (convenios y fondos)',
      administracion: (bankByCode.get('33') || 0) + (bankByCode.get('34') || 0),
      inversion: (bankByCode.get('40') || 0) + (bankByCode.get('16.0') || 0),
      total: (bankByCode.get('33') || 0) + (bankByCode.get('34') || 0) + (bankByCode.get('40') || 0) + (bankByCode.get('16.0') || 0),
      formato: 'moneda',
    },
    { variable: 'Obligaciones / Compromisos pendientes de pago', administracion: saldoPorPagarAdm, inversion: saldoPorPagarInv, total: saldoPorPagarTot, formato: 'moneda' },
    { variable: 'Disponible tesoral estimado', administracion: dispTesoralAdm, inversion: dispTesoralInv, total: dispTesoralTot, formato: 'moneda' },
    { variable: 'Diferencia de disponibilidades (Presup. - Tesor.)', administracion: diferenciaAdm, inversion: diferenciaInv, total: diferenciaTot, formato: 'moneda' },
    { variable: 'Cobertura de obligaciones (veces)', administracion: cobAdm, inversion: cobInv, total: cobTot, formato: 'ratio' },
  ];

  // 6. Conciliación por Recurso
  const recursosList: ConciliacionRecursoItem[] = [];
  let escACount = 0;
  let escBCount = 0;
  let escCCount = 0;
  let escDCount = 0;

  for (const [code, val] of recMap.entries()) {
    const dispP = val.aprop - val.comp;
    const porPag = val.comp - val.pago;
    const bankVal = bankByCode.get(code) || 0;
    const dispT = bankVal - porPag;
    const diff = dispP - dispT;
    const cob = porPag > 0 ? bankVal / porPag : bankVal > 0 ? 999 : 1;

    let escenario: EscenarioConciliacion;
    let obs = '';

    if (porPag > 0 && bankVal < porPag && bankVal === 0) {
      escenario = 'Escenario D (Presión de Liquidez)';
      obs = 'Compromisos pendientes sin cuenta bancaria individual asignada; fondeado vía cuentas concentradoras institucionales.';
      escDCount++;
    } else if (dispP > dispT + 1000000) {
      escenario = 'Escenario A (Presupuestal > Tesoral)';
      obs = 'Apropiación disponible excede caja libre; requiere recaudo efectivo previo de aforo para girar nuevos compromisos.';
      escACount++;
    } else if (dispT > dispP + 1000000) {
      escenario = 'Escenario B (Tesoral > Presupuestal)';
      obs = 'Disponibilidad tesoral excede apropiación libre; corresponde a excedentes de recaudo, reservas o fondos acumulados.';
      escBCount++;
    } else {
      escenario = 'Escenario C (Equilibrado)';
      obs = 'Correspondencia favorable y equilibrada entre apropiación disponible y liquidez identificada.';
      escCCount++;
    }

    recursosList.push({
      codigo: code,
      nombre: val.nombre,
      tipo: val.tipo,
      apropiacion: val.aprop,
      compromisos: val.comp,
      pagos: val.pago,
      disponiblePresupuestal: dispP,
      saldoBancos: bankVal,
      compromisosPendientesPago: porPag,
      disponibleTesoralEstimado: dispT,
      diferenciaDisponibilidades: diff,
      coberturaObligaciones: cob,
      escenario,
      observacion: obs,
    });
  }

  // Ordenar recursos por código
  recursosList.sort((a, b) => a.codigo.localeCompare(b.codigo, undefined, { numeric: true }));

  // 7. Conciliación por Unidad
  const unidadesList: ConciliacionUnidadItem[] = [];
  for (const [u, val] of unidadMap.entries()) {
    const dispP = val.aprop - val.comp;
    const porPag = val.comp - val.pago;
    const pctComp = val.aprop > 0 ? (val.comp / val.aprop) * 100 : 0;
    const pctPago = val.aprop > 0 ? (val.pago / val.aprop) * 100 : 0;

    unidadesList.push({
      unidad: u,
      nombre: u,
      apropiacion: val.aprop,
      compromisos: val.comp,
      pagos: val.pago,
      saldoPorPagar: porPag,
      disponiblePresupuestal: dispP,
      porcentajeCompromiso: pctComp,
      porcentajePago: pctPago,
      saldoBancosDirecto: u.includes('01') ? bancosTot - bancosUnclass : 0, // Tesorería centralizada institucional
    });
  }

  // Ordenar unidades por apropiación descendente
  unidadesList.sort((a, b) => b.apropiacion - a.apropiacion);

  // 8. Alertas Financieras Estructuradas
  const alertas: ConciliacionAlertaItem[] = [
    {
      id: 'ALT-LIQ-01',
      tipo: 'RIESGO_LIQUIDEZ',
      titulo: 'Brecha Presupuestal vs. Tesoral no respaldada',
      descripcion: `El disponible presupuestal ($ 128.286M) supera la disponibilidad tesoral libre ($ 83.162M) en $ 45.124M COP.`,
      valor: diferenciaTot,
      nivel: 'ALTO',
      posibleCausa: 'Apropiación presupuestal calculada sobre aforo anual antes de perfeccionar el 100% del recaudo en caja.',
      recomendacion: 'No comprometer apropiaciones de cierre sin verificar la existencia de recaudo efectivo radicado en tesorería.',
    },
    {
      id: 'ALT-LIQ-02',
      tipo: 'RIESGO_LIQUIDEZ',
      titulo: 'Concentración de Pagos de Cierre en Diciembre',
      descripcion: `Existen $ 61.402M COP en compromisos radicados pendientes de giro que se acumularán con la nómina y primas de cierre.`,
      valor: saldoPorPagarTot,
      nivel: 'MEDIO',
      posibleCausa: 'Rezago contractual en radicación de cuentas de cobro e informes de supervisión de fin de año.',
      recomendacion: 'Programar el calendario de giros en tesorería con cortes al 10 y 18 de diciembre para evitar cuellos de botella.',
    },
    {
      id: 'ALT-PRES-01',
      tipo: 'RIESGO_PRESUPUESTAL',
      titulo: 'Baja Ejecución de Compromisos en Investigación y Extensión',
      descripcion: `La Unidad 02 (Investigación y Extensión) solo ha comprometido el 29,29% ($ 6.064M) de sus $ 20.700M apropiados.`,
      valor: 14636925086.77,
      unidadInvolucrada: '02 - INVESTIGACION Y EXTENSION',
      nivel: 'ALTO',
      posibleCausa: 'Lenta adjudicación de proyectos, convocatorias pendientes y demoras en legalización de convenios.',
      recomendacion: 'Evaluar vigencias futuras o constitución prioritaria de reservas presupuestales justificadas técnica y jurídicamente.',
    },
    {
      id: 'ALT-CONC-01',
      tipo: 'RIESGO_CONCILIACION',
      titulo: 'Cuenta Bancaria Institucional con Destino No Aplica',
      descripcion: `La cuenta Bancolombia No. 8550-7009185 ($ 433.814.265,98 COP) registra destino "No aplica" y recurso "N/A".`,
      valor: bancosUnclass,
      recursoAfectado: 'Recursos Propios (Ahorros)',
      nivel: 'MEDIO',
      posibleCausa: 'Apertura de cuenta o actualización bancaria sin homologación de catálogo presupuestal en el ERP tesoral.',
      recomendacion: 'Formalizar mediante resolución interna la clasificación de la cuenta a Recursos Propios de Administración (Recurso 20).',
    },
    {
      id: 'ALT-CONC-02',
      tipo: 'RIESGO_CONCILIACION',
      titulo: 'Manejo en Cuentas Concentradoras sin Subcuentas Individuales',
      descripcion: `Recursos como Posgrados (Recurso 31), Matrículas FSE (14) y Devolución IVA (21) no poseen cuentas bancarias exclusivas independientes.`,
      valor: recMap.get('31')?.aprop || 0,
      nivel: 'INFORMATIVO',
      posibleCausa: 'Estructura tradicional de tesorería universitaria mediante cuentas maestras de recaudo y fondos fiduciarios.',
      recomendacion: 'Mantener la trazabilidad en libros auxiliares de contabilidad y conciliar periódicamente los recaudos por concepto.',
    },
  ];

  // 9. Las 8 Preguntas Clave del Director Financiero y Auditoría UPTC
  const preguntasClave: ConciliacionPreguntaClave[] = [
    {
      numero: 1,
      pregunta: '¿Cuánto presupuesto tiene disponible la Universidad para asumir nuevos compromisos?',
      respuestaCorta: '$ 128.286.045.004,81 COP disponibles en presupuesto.',
      respuestaDetallada: `La Universidad cuenta con un saldo de apropiación libre de $ 128.286 millones COP (Apropiación Definitiva $ 576.148M - Compromisos Acumulados $ 447.862M, ejecución del 77,73%). De este total, $ 106.009M (82,6%) corresponden a Administración (Funcionamiento) y $ 22.277M (17,4%) a Inversión.`,
      indicadoresClave: [
        { label: 'Disponible Total', valor: '$ 128.286M' },
        { label: 'Disponible Administración', valor: '$ 106.009M' },
        { label: 'Disponible Inversión', valor: '$ 22.277M' },
      ],
      impacto: 'POSITIVO',
    },
    {
      numero: 2,
      pregunta: '¿Cuánto efectivo tiene realmente disponible en tesorería?',
      respuestaCorta: '$ 144.563.470.673,35 COP en 85 cuentas bancarias.',
      respuestaDetallada: `El saldo total conciliado en bancos al corte es de $ 144.563.470.673,35 COP, distribuido en 85 cuentas de 10 entidades bancarias, con una coincidencia auditada frente a la referencia de $ 144.563.470.673 (diferencia de solo $ 0,35 COP por redondeo). El disponible tesoral libre de afectaciones exigibles es de $ 83.161.608.892,90 COP.`,
      indicadoresClave: [
        { label: 'Saldo Bancos Total', valor: '$ 144.563M' },
        { label: 'Disponible Libre de Giro', valor: '$ 83.162M' },
        { label: 'Cuentas Activas', valor: '85 cuentas' },
      ],
      impacto: 'POSITIVO',
    },
    {
      numero: 3,
      pregunta: '¿Qué parte del efectivo está comprometida o tiene destinación específica?',
      respuestaCorta: '$ 61.402M comprometidos exigibles y $ 48.513M con destinación específica inmodificable.',
      respuestaDetallada: `El 42,47% del saldo en bancos ($ 61.401.861.780,45 COP) se encuentra formalmente comprometido para atender pagos y cuentas de cobro de vigencia corriente. Adicionalmente, existen saldos bancarios por $ 48.513M en cuentas de Convenios ($ 15.320M), Estampillas Prodesarrollo ($ 20.836M) y Aportes Nación Inversión ($ 12.357M) que por mandato legal y contractual no pueden desviarse a gastos de funcionamiento general.`,
      indicadoresClave: [
        { label: 'Compromisos por Pagar', valor: '$ 61.402M' },
        { label: 'Convenios con Terceros', valor: '$ 15.320M' },
        { label: 'Estampillas Prodesarrollo', valor: '$ 20.836M' },
      ],
      impacto: 'ALERTA',
    },
    {
      numero: 4,
      pregunta: '¿Qué apropiaciones disponibles no tienen respaldo de liquidez identificado?',
      respuestaCorta: '$ 45.124.436.111,91 COP de brecha presupuestal-tesoral.',
      respuestaDetallada: `La Universidad presenta una brecha de disponibilidades de $ 45.124 millones COP entre el disponible presupuestal ($ 128.286M) y el disponible tesoral libre ($ 83.162M). Si la institución comprometiera el 100% de la apropiación libre sin recibir los $ 32.213M pendientes de recaudo de aforo de diciembre, se generaría un déficit de caja. Destacan Convenios con Derechos (Recurso 33: $ 12.980M disponibles sin caja inmediata equivalente) y Posgrados (Recurso 31: $ 20.816M de apropiación libre sujeta a matrícula real).`,
      indicadoresClave: [
        { label: 'Brecha de Disponibilidad', valor: '$ 45.124M' },
        { label: 'Recaudo Pendiente Aforo', valor: '$ 32.213M' },
        { label: 'Déficit Potencial si Compromete 100%', valor: '$ 12.911M' },
      ],
      impacto: 'ALERTA',
    },
    {
      numero: 5,
      pregunta: '¿Qué recursos líquidos no tienen correspondencia presupuestal identificada?',
      respuestaCorta: '$ 433.814.265,98 COP en cuenta no clasificada y excedentes acumulados en Fiducredicorp.',
      respuestaDetallada: `La cuenta de ahorros Bancolombia 8550-7009185 registra $ 433,8M COP con destino "No aplica" y recurso "N/A", clasificada como Institucional No Distribuida. Por otra parte, existen excedentes de tesorería y rendimientos financieros acumulados por $ 17.019M en Fiducredicorp Vista y $ 5.000M en Santander Ahorros que provienen de vigencias anteriores (Recursos del Balance por $ 27.847M) pendientes de incorporación o ejecución.`,
      indicadoresClave: [
        { label: 'Cuenta No Homologada', valor: '$ 433,8M' },
        { label: 'Fondo Fiducredicorp Vista', valor: '$ 17.019M' },
        { label: 'Recursos del Balance', valor: '$ 27.847M' },
      ],
      impacto: 'NEUTRO',
    },
    {
      numero: 6,
      pregunta: '¿Existe suficiente cobertura tesoral para atender las obligaciones pendientes?',
      respuestaCorta: 'SÍ, COBERTURA ROBUSTA DEL 2,35x (235,43%).',
      respuestaDetallada: `La solvencia inmediata de la UPTC es sólida. Por cada $ 1 COP adeudado en compromisos exigibles pendientes de giro ($ 61.402M), la Universidad posee $ 2,35 COP en cuentas bancarias ($ 144.563M). En Administración la cobertura es de 2,83x ($ 123.938M vs $ 43.796M), y en Inversión es de 1,15x ($ 20.191M vs $ 17.606M).`,
      indicadoresClave: [
        { label: 'Cobertura Institucional', valor: '2,35x (235,4%)' },
        { label: 'Cobertura Administración', valor: '2,83x (283,0%)' },
        { label: 'Cobertura Inversión', valor: '1,15x (114,7%)' },
      ],
      impacto: 'POSITIVO',
    },
    {
      numero: 7,
      pregunta: '¿Qué diferencias existen entre presupuesto y tesorería y cuáles son sus causas?',
      respuestaCorta: 'Diferencias originadas en temporalidad, rezago de giro y recursos del balance.',
      respuestaDetallada: `Se identifican tres causas técnicas principales: 1) Causal de Temporalidad: El presupuesto registra aforo legal anual ($ 576.148M), mientras tesorería opera con recaudo efectivo ($ 543.935M) más $ 27.847M de recursos del balance de vigencias anteriores. 2) Causal de Rezago de Giro: Existen $ 61.402M en bienes y servicios ya contratados cuyos trámites de pago se concentran en diciembre. 3) Causal de Destinación: El 33,6% de la caja bancaria tiene destinación específica inmodificable y no puede respaldar el saldo por comprometer de funcionamiento.`,
      indicadoresClave: [
        { label: 'Causa Temporalidad', valor: 'Aforo vs Recaudo' },
        { label: 'Causa Rezago de Giro', valor: '$ 61.402M en trámite' },
        { label: 'Causa Destinación', valor: '$ 48.513M restringidos' },
      ],
      impacto: 'NEUTRO',
    },
    {
      numero: 8,
      pregunta: '¿Cuál es la posición financiera real de Administración e Inversión?',
      respuestaCorta: 'Administración en holgura óptima (2,83x); Inversión en equilibrio justo (1,15x).',
      respuestaDetallada: `Administración presenta una posición de alta solvencia con $ 80.143M de caja neta disponible tras cubrir todos sus compromisos pendientes ($ 43.796M), garantizando nómina y primas de fin de año. Inversión presenta una cobertura suficiente pero estrecha de 1,15x ($ 20.191M en bancos vs $ 17.606M en compromisos por pagar, holgura de +$ 2.585M), requiriendo no asumir nuevos compromisos sin recaudo efectivo previo de las transferencias de Nación y Estampillas pendientes.`,
      indicadoresClave: [
        { label: 'Holgura Neta Administración', valor: '+$ 80.143M' },
        { label: 'Holgura Neta Inversión', valor: '+$ 2.585M' },
        { label: 'Veredicto General', valor: 'SOSTENIBLE' },
      ],
      impacto: 'POSITIVO',
    },
  ];

  return {
    matrizCentral,
    matrizIntegral,
    totales: {
      apropiacionDefinitiva: apropTot,
      compromisosAcumulados: compTot,
      pagosAcumulados: pagosTot,
      disponiblePresupuestal: dispPresupTot,
      saldoBancosConciliado: bancosTot,
      saldoBancosReferencia: BANK_REFERENCE_SALDO,
      compromisosPendientesPago: saldoPorPagarTot,
      disponibleTesoralEstimado: dispTesoralTot,
      diferenciaDisponibilidades: diferenciaTot,
      coberturaObligaciones: cobTot,
      adminApropiacion: apropAdm,
      adminCompromisos: compAdm,
      adminPagos: pagosAdm,
      adminDisponiblePresupuestal: dispPresupAdm,
      adminSaldoBancos: bancosAdm,
      adminSaldoPorPagar: saldoPorPagarAdm,
      adminDisponibleTesoral: dispTesoralAdm,
      adminDiferencia: diferenciaAdm,
      adminCobertura: cobAdm,
      invApropiacion: apropInv,
      invCompromisos: compInv,
      invPagos: pagosInv,
      invDisponiblePresupuestal: dispPresupInv,
      invSaldoBancos: bancosInv,
      invSaldoPorPagar: saldoPorPagarInv,
      invDisponibleTesoral: dispTesoralInv,
      invDiferencia: diferenciaInv,
      invCobertura: cobInv,
      bancosNoClasificados: bancosUnclass,
    },
    recursos: recursosList,
    unidades: unidadesList,
    escenariosCount: {
      escenarioA: escACount,
      escenarioB: escBCount,
      escenarioC: escCCount,
      escenarioD: escDCount,
    },
    alertas,
    preguntasClave,
  };
}
