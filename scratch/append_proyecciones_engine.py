code_to_append = '''

// ============================================================================
// MODULO AVANZADO: PROYECCIONES DE DICIEMBRE (NÓMINA 2.1.1 E INGRESOS ADICIONALES)
// ============================================================================

export interface IngresoAdicionalProyectado {
  id: string;
  concepto: string;
  valor: number;
  recurso: string;
  tipo: 'Administración' | 'Inversión';
  naturaleza: 'Libre Destinación' | 'Destinación Específica';
  observaciones?: string;
}

export interface Rubro211Proyeccion {
  apropiacionActual: number;
  compromisosActuales: number;
  pagosActuales: number;
  disponibleActual: number;
  nominaDiciembreEstimada: number;
  compromisosProyectadosCierre: number;
  disponibleProyectadoCierre: number;
  porcentajeCompromisoProyectado: number;
  suficienciaApropiacion: boolean;
  holguraApropiacion211: number;
}

export interface ProyeccionDiciembreAvanzadaResult {
  // Ingresos
  aforoTotal: number;
  recaudoHistoricoEneNov: number;
  saldoPendienteRecaudo: number;
  recaudoEsperadoAforoBase: number;
  totalIngresosAdicionalesManuales: number;
  recaudoEsperadoDiciembreTotal: number;
  recaudoTotalProyectadoCierre: number;
  porcentajeRecaudoProyectadoCierre: number;

  // Gastos
  apropiacionTotal: number;
  compromisosHistoricosEneNov: number;
  pagosHistoricosEneNov: number;
  saldoPorPagarActual: number;
  pagosEsperadosCompromisosExistentes: number;
  nominaDiciembreAfectada: number;
  pagosEsperadosDiciembreTotal: number;
  pagosTotalesProyectadosCierre: number;
  compromisosTotalesProyectadosCierre: number;
  saldoPresupuestalDisponibleCierre: number;
  porcentajeCompromisoProyectadoCierre: number;
  porcentajePagoProyectadoCierre: number;

  // Rubro 2.1.1 Detalle
  rubro211: Rubro211Proyeccion;

  // Tesorería & Bancos
  bancosActuales: number;
  flujoNetoDiciembre: number;
  saldoBancosProyectadoCierre: number;
  coberturaProyectadaCierre: number;
  balancePresupuestalCierre: number;
  superavitDeficitCierre: number;
}

/**
 * Motor de Proyecciones Avanzadas de Cierre de Diciembre UPTC
 * Incorpora la Nómina de Diciembre imputada al Rubro 2.1.1 y el CRUD de Ingresos Adicionales Proyectados.
 */
export function calculateProyeccionesDiciembreAvanzadas(
  incomes: CajaHoyIncome[],
  expenses: CajaHoyExpense[],
  banks: CajaHoyBankAccount[],
  nominaDiciembre211: number,
  ingresosAdicionales: IngresoAdicionalProyectado[],
  incomeComplianceRate: number = 0.65,
  expensePaymentRate: number = 0.75,
  scope: 'Todos' | 'Administración' | 'Inversión' = 'Todos',
  useStrictRule3A: boolean = true
): ProyeccionDiciembreAvanzadaResult {
  // Filtrar según alcance (scope)
  const fIncomes = incomes.filter((i) => {
    if (scope === 'Todos') return true;
    return i.tipoRecurso === (scope === 'Administración' ? 'Recursos Administración' : 'Recursos Inversión');
  });

  const fExpenses = expenses.filter((e) => {
    if (scope === 'Todos') return true;
    const isAdm = useStrictRule3A
      ? isAdministrationResource(extractResourceCode(e.recurso))
      : isAdministrationResource(extractResourceCode(e.recurso)) || e.gasto.toUpperCase().includes('FUNCIONAMIENTO');
    return scope === 'Administración' ? isAdm : !isAdm;
  });

  const fBanks = banks.filter((b) => {
    if (b.entidad.toUpperCase().includes('TOTAL')) return false;
    if (scope === 'Todos') return true;
    return b.clasificacion === scope;
  });

  const fIngresosAdicionales = ingresosAdicionales.filter((ing) => {
    if (scope === 'Todos') return true;
    return ing.tipo === scope;
  });

  // 1. Ingresos
  const aforoTotal = fIncomes.reduce((s, i) => s + i.valorAforo, 0);
  const recaudoHistoricoEneNov = fIncomes.reduce((s, i) => s + i.totalRecaudo, 0);
  const saldoPendienteRecaudo = fIncomes.reduce((s, i) => s + (i.saldoPendiente > 0 ? i.saldoPendiente : 0), 0);
  const recaudoEsperadoAforoBase = saldoPendienteRecaudo * incomeComplianceRate;
  const totalIngresosAdicionalesManuales = fIngresosAdicionales.reduce((s, ing) => s + ing.valor, 0);
  const recaudoEsperadoDiciembreTotal = recaudoEsperadoAforoBase + totalIngresosAdicionalesManuales;
  const recaudoTotalProyectadoCierre = recaudoHistoricoEneNov + recaudoEsperadoDiciembreTotal;
  const porcentajeRecaudoProyectadoCierre = aforoTotal > 0 ? (recaudoTotalProyectadoCierre / aforoTotal) * 100 : 0;

  // 2. Rubro 2.1.1 - Gastos de Personal (se calcula siempre sobre gastos de funcionamiento)
  const expenses211 = expenses.filter((e) => {
    const conc = (e.codigoConcepto || '').trim();
    const nombre = (e.concepto || '').toUpperCase();
    return conc.startsWith('2.1.1') || conc.includes('2.1.1') || nombre.includes('GASTOS DE PERSONAL') || nombre.includes('SERVICIOS PERSONALES');
  });

  const aprop211 = expenses211.reduce((s, e) => s + e.valorApropiacion, 0);
  const comp211 = expenses211.reduce((s, e) => s + e.acumuladoCompromiso, 0);
  const pagos211 = expenses211.reduce((s, e) => s + e.acumuladoPago, 0);
  const disp211Actual = aprop211 - comp211;

  // Nómina de diciembre afecta a Administración y Todos, pero no a Inversión
  const nominaAfectada = scope === 'Inversión' ? 0 : nominaDiciembre211;
  const comp211Proyectado = comp211 + nominaDiciembre211;
  const disp211Proyectado = aprop211 - comp211Proyectado;
  const pctComp211Proyectado = aprop211 > 0 ? (comp211Proyectado / aprop211) * 100 : 0;

  const rubro211: Rubro211Proyeccion = {
    apropiacionActual: aprop211,
    compromisosActuales: comp211,
    pagosActuales: pagos211,
    disponibleActual: disp211Actual,
    nominaDiciembreEstimada: nominaDiciembre211,
    compromisosProyectadosCierre: comp211Proyectado,
    disponibleProyectadoCierre: disp211Proyectado,
    porcentajeCompromisoProyectado: pctComp211Proyectado,
    suficienciaApropiacion: disp211Proyectado >= 0,
    holguraApropiacion211: disp211Proyectado,
  };

  // 3. Gastos Totales
  const apropiacionTotal = fExpenses.reduce((s, e) => s + e.valorApropiacion, 0);
  const compromisosHistoricosEneNov = fExpenses.reduce((s, e) => s + e.acumuladoCompromiso, 0);
  const pagosHistoricosEneNov = fExpenses.reduce((s, e) => s + e.acumuladoPago, 0);
  const saldoPorPagarActual = compromisosHistoricosEneNov - pagosHistoricosEneNov;

  const pagosEsperadosCompromisosExistentes = saldoPorPagarActual * expensePaymentRate;
  const compromisosTotalesProyectadosCierre = compromisosHistoricosEneNov + nominaAfectada;
  const saldoPresupuestalDisponibleCierre = apropiacionTotal - compromisosTotalesProyectadosCierre;
  const pagosEsperadosDiciembreTotal = pagosEsperadosCompromisosExistentes + nominaAfectada;
  const pagosTotalesProyectadosCierre = pagosHistoricosEneNov + pagosEsperadosDiciembreTotal;

  const porcentajeCompromisoProyectadoCierre =
    apropiacionTotal > 0 ? (compromisosTotalesProyectadosCierre / apropiacionTotal) * 100 : 0;
  const porcentajePagoProyectadoCierre =
    apropiacionTotal > 0 ? (pagosTotalesProyectadosCierre / apropiacionTotal) * 100 : 0;

  // 4. Bancos & Flujo de Caja al 31 de Diciembre
  const bancosActuales = fBanks.reduce((s, b) => s + b.valorFinal, 0);
  const flujoNetoDiciembre = recaudoEsperadoDiciembreTotal - pagosEsperadosDiciembreTotal;
  const saldoBancosProyectadoCierre = bancosActuales + flujoNetoDiciembre;
  const coberturaProyectadaCierre =
    pagosEsperadosDiciembreTotal > 0
      ? (bancosActuales + recaudoEsperadoDiciembreTotal) / pagosEsperadosDiciembreTotal
      : 999;

  const balancePresupuestalCierre = recaudoTotalProyectadoCierre - compromisosTotalesProyectadosCierre;
  const superavitDeficitCierre = balancePresupuestalCierre;

  return {
    aforoTotal,
    recaudoHistoricoEneNov,
    saldoPendienteRecaudo,
    recaudoEsperadoAforoBase,
    totalIngresosAdicionalesManuales,
    recaudoEsperadoDiciembreTotal,
    recaudoTotalProyectadoCierre,
    porcentajeRecaudoProyectadoCierre,
    apropiacionTotal,
    compromisosHistoricosEneNov,
    pagosHistoricosEneNov,
    saldoPorPagarActual,
    pagosEsperadosCompromisosExistentes,
    nominaDiciembreAfectada: nominaAfectada,
    pagosEsperadosDiciembreTotal,
    pagosTotalesProyectadosCierre,
    compromisosTotalesProyectadosCierre,
    saldoPresupuestalDisponibleCierre,
    porcentajeCompromisoProyectadoCierre,
    porcentajePagoProyectadoCierre,
    rubro211,
    bancosActuales,
    flujoNetoDiciembre,
    saldoBancosProyectadoCierre,
    coberturaProyectadaCierre,
    balancePresupuestalCierre,
    superavitDeficitCierre,
  };
}
'''

with open('src/lib/cajaHoyEngine.ts', 'r') as f:
    current = f.read()

new_content = current + code_to_append

with open('src/lib/cajaHoyEngine.ts', 'w') as f:
    f.write(new_content)

print("Proyecciones engine appended successfully to src/lib/cajaHoyEngine.ts")
