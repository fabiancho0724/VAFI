import re

with open('src/screens/CajaHoyScreen.tsx', 'r') as f:
    content = f.read()

# Find the end of Tab 1: `{activeTab === 'ejecutivo' && (`
# It ends with:
#                 {diagnosis.investmentDiagnosis}
#               </p>
#             </div>
#           </div>
#         </div>
#       )}

target_marker = """                {diagnosis.investmentDiagnosis}
              </p>
            </div>
          </div>
        </div>
      )}"""

if target_marker not in content:
    print("ERROR: Target marker not found!")
    exit(1)

conciliacion_jsx = """
      {/* SUBTAB 2: CONCILIACIÓN PRESUPUESTAL Y TESORAL */}
      {activeTab === 'conciliacion' && (
        <div className="space-y-8">
          {/* Section Header & CSV Exports */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-gradient-to-r from-surface-container-high via-surface-container to-surface-container-low border border-white/10 p-6 rounded-3xl backdrop-blur-xl relative overflow-hidden">
            <div className="space-y-1 z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFCC29]/10 text-[#FFCC29] text-xs font-mono font-bold">
                <Scale size={14} />
                SISTEMA INTELIGENTE DE CONCILIACIÓN FINANCIERA – UPTC 2026
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Conciliación entre Ejecución Presupuestal y Disponibilidad Tesoral
              </h2>
              <p className="text-xs sm:text-sm text-on-surface-variant max-w-3xl leading-relaxed">
                Correspondencia oficial entre los recursos disponibles en el presupuesto ($ 128.286M COP) y los recursos líquidos efectivamente disponibles en tesorería ($ 144.563M COP), identificando restricciones, compromisos exigibles, brechas de liquidez y capacidad real de pago.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 z-10">
              <button
                onClick={() =>
                  exportToCSV(
                    conciliacionData.matrizIntegral.map((m) => ({
                      Variable: m.variable,
                      Administración: m.administracion,
                      Inversión: m.inversion,
                      Total: m.total,
                    })),
                    'UPTC_Matriz_Integral_Conciliacion'
                  )
                }
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-mono border border-white/10 transition-colors cursor-pointer"
              >
                <Download size={14} className="text-[#FFCC29]" />
                Matriz Integral (CSV)
              </button>
              <button
                onClick={() =>
                  exportToCSV(
                    conciliacionData.recursos.map((r) => ({
                      Código: r.codigo,
                      Recurso: r.nombre,
                      Tipo: r.tipo,
                      Apropiación: r.apropiacion,
                      Compromisos: r.compromisos,
                      Pagos: r.pagos,
                      'Disponible Presupuesto': r.disponiblePresupuestal,
                      'Saldo Bancos': r.saldoBancos,
                      'Saldo por Pagar': r.compromisosPendientesPago,
                      'Disponible Tesorería': r.disponibleTesoralEstimado,
                      'Diferencia (Brecha)': r.diferenciaDisponibilidades,
                      'Cobertura (veces)': r.coberturaObligaciones,
                      Escenario: r.escenario,
                    })),
                    'UPTC_Conciliacion_Por_Recurso'
                  )
                }
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-mono border border-white/10 transition-colors cursor-pointer"
              >
                <Download size={14} className="text-emerald-400" />
                Recursos (CSV)
              </button>
              <button
                onClick={() =>
                  exportToCSV(
                    conciliacionData.unidades.map((u) => ({
                      Unidad: u.unidad,
                      Apropiación: u.apropiacion,
                      Compromisos: u.compromisos,
                      Pagos: u.pagos,
                      'Saldo por Pagar': u.saldoPorPagar,
                      'Disponible Presupuestal': u.disponiblePresupuestal,
                      '% Compromiso': u.porcentajeCompromiso,
                      '% Pago': u.porcentajePago,
                    })),
                    'UPTC_Conciliacion_Por_Unidad'
                  )
                }
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-mono border border-white/10 transition-colors cursor-pointer"
              >
                <Download size={14} className="text-sky-400" />
                Unidades (CSV)
              </button>
            </div>
          </div>

          {/* 6 Core KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-surface-container-low/60 border border-white/5 p-4 rounded-2xl flex flex-col justify-between">
              <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider block">
                1. Disp. Presupuestal
              </span>
              <div className="my-1.5">
                <span className="text-lg lg:text-xl font-black text-amber-400 font-mono block">
                  {formatMillions(conciliacionData.totales.disponiblePresupuestal)}
                </span>
                <span className="text-[10px] text-on-surface-variant/80 font-mono">
                  $ 128.286M COP por comprometer
                </span>
              </div>
              <span className="text-[9px] text-emerald-400 font-mono">
                77,73% ya comprometido
              </span>
            </div>

            <div className="bg-surface-container-low/60 border border-white/5 p-4 rounded-2xl flex flex-col justify-between">
              <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider block">
                2. Saldo Bancos Conciliado
              </span>
              <div className="my-1.5">
                <span className="text-lg lg:text-xl font-black text-emerald-400 font-mono block">
                  {formatMillions(conciliacionData.totales.saldoBancosConciliado)}
                </span>
                <span className="text-[10px] text-on-surface-variant/80 font-mono">
                  $ 144.563M en 85 cuentas
                </span>
              </div>
              <span className="text-[9px] text-sky-400 font-mono">
                Coincidencia exacta con ref.
              </span>
            </div>

            <div className="bg-surface-container-low/60 border border-white/5 p-4 rounded-2xl flex flex-col justify-between">
              <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider block">
                3. Obligaciones / Por Pagar
              </span>
              <div className="my-1.5">
                <span className="text-lg lg:text-xl font-black text-rose-400 font-mono block">
                  {formatMillions(conciliacionData.totales.compromisosPendientesPago)}
                </span>
                <span className="text-[10px] text-on-surface-variant/80 font-mono">
                  $ 61.402M en trámite de giro
                </span>
              </div>
              <span className="text-[9px] text-rose-300 font-mono">
                42,47% del saldo en bancos
              </span>
            </div>

            <div className="bg-surface-container-low/60 border border-white/5 p-4 rounded-2xl flex flex-col justify-between">
              <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider block">
                4. Disp. Tesoral Libre
              </span>
              <div className="my-1.5">
                <span className="text-lg lg:text-xl font-black text-sky-400 font-mono block">
                  {formatMillions(conciliacionData.totales.disponibleTesoralEstimado)}
                </span>
                <span className="text-[10px] text-on-surface-variant/80 font-mono">
                  $ 83.162M caja no comprometida
                </span>
              </div>
              <span className="text-[9px] text-emerald-400 font-mono">
                Superávit de caja disponible
              </span>
            </div>

            <div className="bg-surface-container-low/60 border border-white/5 p-4 rounded-2xl flex flex-col justify-between">
              <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider block">
                5. Brecha Presup. - Tesor.
              </span>
              <div className="my-1.5">
                <span className="text-lg lg:text-xl font-black text-[#FFCC29] font-mono block">
                  {formatMillions(conciliacionData.totales.diferenciaDisponibilidades)}
                </span>
                <span className="text-[10px] text-on-surface-variant/80 font-mono">
                  Presupuesto &gt; Tesorería libre
                </span>
              </div>
              <span className="text-[9px] text-amber-300 font-mono">
                Exige recaudo para girarse
              </span>
            </div>

            <div className="bg-surface-container-low/60 border border-white/5 p-4 rounded-2xl flex flex-col justify-between">
              <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider block">
                6. Cobertura Inmediata
              </span>
              <div className="my-1.5">
                <span className="text-lg lg:text-xl font-black text-emerald-400 font-mono block">
                  {conciliacionData.totales.coberturaObligaciones.toFixed(2)}x
                </span>
                <span className="text-[10px] text-on-surface-variant/80 font-mono">
                  {(conciliacionData.totales.coberturaObligaciones * 100).toFixed(1)}% de respaldo
                </span>
              </div>
              <span className="text-[9px] text-emerald-400 font-mono">
                Solvencia inmediata demostrada
              </span>
            </div>
          </div>

          {/* Conceptual Principle Alert (Numeral 2 Prompt Maestro) */}
          <div className="bg-gradient-to-r from-amber-950/20 via-surface-container-low to-surface-container-low border border-amber-500/20 p-5 rounded-3xl flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="p-3 rounded-2xl bg-[#FFCC29]/10 text-[#FFCC29] shrink-0">
              <AlertCircle size={24} />
            </div>
            <div className="space-y-1 text-xs">
              <h4 className="font-bold text-white uppercase tracking-wider">
                Principio Fundamental de Auditoría: Diferenciación entre Presupuesto y Tesorería
              </h4>
              <p className="text-on-surface-variant leading-relaxed font-light">
                <strong className="text-white">Apropiación disponible NO es efectivo disponible:</strong> La UPTC tiene autorización legal para comprometer $ 128.286M COP adicionales, pero solo cuenta con $ 83.162M COP de caja libre en bancos. Si se expidieran CDP y contratos por el 100% de la apropiación libre sin recaudar los $ 32.213M pendientes de aforo en diciembre, se generaría un descalce financiero diferido. Asimismo, el saldo bancario de $ 144.563M COP incluye $ 48.513M en recursos restringidos (Convenios, Estampillas y Proyectos) que legalmente no pueden subsidiar gastos de funcionamiento corriente.
              </p>
            </div>
          </div>

          {/* Matriz Central de Conciliación & Matriz Integral 11x3 */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Matriz Central (Section 5.1) */}
            <div className="lg:col-span-5 bg-surface-container-low/50 border border-white/5 p-6 rounded-3xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-[#FFCC29]/10 text-[#FFCC29]">
                    <Layers size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Matriz Central de Conciliación</h3>
                    <span className="text-[11px] text-on-surface-variant">Presupuesto frente a Tesorería</span>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-on-surface-variant uppercase text-[10px]">
                      <th className="p-2.5">Concepto</th>
                      <th className="p-2.5 text-right">Presupuesto</th>
                      <th className="p-2.5 text-right">Tesorería</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {conciliacionData.matrizCentral.map((row, idx) => (
                      <tr key={idx} className="hover:bg-white/5 transition-colors">
                        <td className="p-2.5 text-white/90 font-medium">
                          <div className="flex flex-col">
                            <span>{row.concepto}</span>
                            <span className="text-[9px] text-on-surface-variant/70 font-sans">{row.observacion}</span>
                          </div>
                        </td>
                        <td className="p-2.5 text-right text-amber-300 font-bold whitespace-nowrap">
                          {row.presupuesto !== null ? formatCOP(row.presupuesto) : '—'}
                        </td>
                        <td className="p-2.5 text-right text-emerald-300 font-bold whitespace-nowrap">
                          {row.tesoreria !== null ? formatCOP(row.tesoreria) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Matriz Integral 11x3 (Section 13) */}
            <div className="lg:col-span-7 bg-surface-container-low/50 border border-white/5 p-6 rounded-3xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-emerald-400/10 text-emerald-400">
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Matriz Integral de Conciliación (11 Variables)</h3>
                    <span className="text-[11px] text-on-surface-variant">Administración, Inversión y Consolidado Institucional</span>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-[#FFCC29] bg-[#FFCC29]/10 px-2.5 py-1 rounded-full border border-[#FFCC29]/20">
                  Corte: 23 Nov 2026
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-on-surface-variant uppercase text-[10px]">
                      <th className="p-2.5">Variable</th>
                      <th className="p-2.5 text-right">Administración</th>
                      <th className="p-2.5 text-right">Inversión</th>
                      <th className="p-2.5 text-right text-[#FFCC29]">Total Institucional</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {conciliacionData.matrizIntegral.map((row, idx) => (
                      <tr key={idx} className="hover:bg-white/5 transition-colors">
                        <td className="p-2.5 text-white/90 font-medium">
                          {row.variable}
                        </td>
                        <td className="p-2.5 text-right text-sky-300 whitespace-nowrap font-medium">
                          {row.formato === 'moneda'
                            ? formatCOP(row.administracion)
                            : row.formato === 'ratio'
                            ? `${row.administracion.toFixed(2)}x`
                            : `${row.administracion.toFixed(2)}%`}
                        </td>
                        <td className="p-2.5 text-right text-emerald-300 whitespace-nowrap font-medium">
                          {row.formato === 'moneda'
                            ? formatCOP(row.inversion)
                            : row.formato === 'ratio'
                            ? `${row.inversion.toFixed(2)}x`
                            : `${row.inversion.toFixed(2)}%`}
                        </td>
                        <td className="p-2.5 text-right text-[#FFCC29] font-black whitespace-nowrap">
                          {row.formato === 'moneda'
                            ? formatCOP(row.total)
                            : row.formato === 'ratio'
                            ? `${row.total.toFixed(2)}x`
                            : `${row.total.toFixed(2)}%`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* 4 Scenarios Cards (Section 5.2) with Click-to-Filter */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Filter size={16} className="text-[#FFCC29]" />
                Clasificación de Recursos en los 4 Escenarios de Conciliación
              </h3>
              <span className="text-xs text-on-surface-variant">
                Haz clic en una tarjeta para filtrar los recursos detallados
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <button
                onClick={() => setFilterConcilEscenario(filterConcilEscenario === 'A' ? 'TODOS' : 'A')}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                  filterConcilEscenario === 'A'
                    ? 'bg-amber-500/20 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                    : 'bg-surface-container-low/40 border-white/5 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                    Escenario A ({conciliacionData.escenariosCount.escenarioA})
                  </span>
                  <span className="text-xs text-on-surface-variant font-mono">Presupuestal &gt; Tesoral</span>
                </div>
                <h4 className="text-xs font-bold text-white mb-1">Apropiación Libre sin Caja Inmediata</h4>
                <p className="text-[11px] text-on-surface-variant leading-relaxed">
                  Recursos con saldo por comprometer que superan el efectivo disponible. Requieren recaudo previo de aforo en diciembre para girarse.
                </p>
              </button>

              <button
                onClick={() => setFilterConcilEscenario(filterConcilEscenario === 'B' ? 'TODOS' : 'B')}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                  filterConcilEscenario === 'B'
                    ? 'bg-emerald-500/20 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                    : 'bg-surface-container-low/40 border-white/5 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                    Escenario B ({conciliacionData.escenariosCount.escenarioB})
                  </span>
                  <span className="text-xs text-on-surface-variant font-mono">Tesoral &gt; Presupuestal</span>
                </div>
                <h4 className="text-xs font-bold text-white mb-1">Excedentes de Caja o Restricciones</h4>
                <p className="text-[11px] text-on-surface-variant leading-relaxed">
                  Recursos líquidos superiores al saldo de apropiación: Fondos fiduciarios, Recursos del Balance, y Estampillas con reservas.
                </p>
              </button>

              <button
                onClick={() => setFilterConcilEscenario(filterConcilEscenario === 'C' ? 'TODOS' : 'C')}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                  filterConcilEscenario === 'C'
                    ? 'bg-sky-500/20 border-sky-500 shadow-[0_0_20px_rgba(56,189,248,0.2)]'
                    : 'bg-surface-container-low/40 border-white/5 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-bold">
                    Escenario C ({conciliacionData.escenariosCount.escenarioC})
                  </span>
                  <span className="text-xs text-on-surface-variant font-mono">Equilibrado</span>
                </div>
                <h4 className="text-xs font-bold text-white mb-1">Correspondencia Presupuesto - Tesorería</h4>
                <p className="text-[11px] text-on-surface-variant leading-relaxed">
                  Recursos donde la apropiación disponible coincide con el efectivo identificado o se encuentran 100% ejecutados y pagados.
                </p>
              </button>

              <button
                onClick={() => setFilterConcilEscenario(filterConcilEscenario === 'D' ? 'TODOS' : 'D')}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                  filterConcilEscenario === 'D'
                    ? 'bg-rose-500/20 border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.2)]'
                    : 'bg-surface-container-low/40 border-white/5 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold">
                    Escenario D ({conciliacionData.escenariosCount.escenarioD})
                  </span>
                  <span className="text-xs text-on-surface-variant font-mono">Cuentas Concentradoras</span>
                </div>
                <h4 className="text-xs font-bold text-white mb-1">Compromisos con Fondeo Centralizado</h4>
                <p className="text-[11px] text-on-surface-variant leading-relaxed">
                  Fuentes con compromisos por pagar sin cuenta bancaria individual asignada; respaldadas en cuentas de recaudo concentradoras.
                </p>
              </button>
            </div>
          </div>

          {/* 7 Specialized Charts Panel (Section 12) */}
          <div className="bg-surface-container-low/50 border border-white/5 p-6 rounded-3xl space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Activity size={18} className="text-[#FFCC29]" />
                  Dashboard Visual de Conciliación Presupuestal y Tesoral (7 Gráficas Oficiales)
                </h3>
                <span className="text-xs text-on-surface-variant">
                  Visualizaciones interactivas de descalces, cobertura y composición
                </span>
              </div>

              {/* Chart Selector Pills */}
              <div className="flex flex-wrap gap-1 bg-surface-container p-1 rounded-2xl border border-white/5">
                {[
                  { id: 'g1', label: 'G1. Disp. Presup. vs Tesoral' },
                  { id: 'g2', label: 'G2. Ejecución Presupuestal' },
                  { id: 'g3', label: 'G3. Composición Tesoral' },
                  { id: 'g4', label: 'G4. Brechas por Recurso' },
                  { id: 'g5', label: 'G5. Cobertura de Obligaciones' },
                  { id: 'g6', label: 'G6. Admin vs Inversión' },
                  { id: 'g7', label: 'G7. Conciliación Unidades' },
                ].map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setActiveConcilChart(c.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-mono transition-all cursor-pointer ${
                      activeConcilChart === c.id
                        ? 'bg-[#FFCC29] text-black font-bold shadow-md'
                        : 'text-on-surface-variant hover:text-white'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Render Selected Chart */}
            <div className="min-h-[350px]">
              {/* Gráfica 1: Disponible Presupuestal vs. Disponible Tesoral */}
              {activeConcilChart === 'g1' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono text-on-surface-variant">
                    <span>Comparativo por Código de Recurso (Millones COP)</span>
                    <span className="text-amber-300">Presupuesto (Amarillo) vs Tesorería (Verde)</span>
                  </div>
                  <div className="h-[340px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={conciliacionData.recursos
                          .filter((r) => r.disponiblePresupuestal > 0 || r.saldoBancos > 0)
                          .map((r) => ({
                            recurso: `Rec ${r.codigo}`,
                            nombre: r.nombre,
                            'Disponible Presupuesto': Math.round(r.disponiblePresupuestal / 1e6),
                            'Saldo en Bancos': Math.round(r.saldoBancos / 1e6),
                          }))}
                        margin={{ top: 10, right: 20, left: 10, bottom: 40 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <XAxis dataKey="recurso" stroke="#888" fontSize={11} angle={-30} textAnchor="end" />
                        <YAxis stroke="#888" fontSize={11} tickFormatter={(v) => `$${v}M`} />
                        <RechartsTooltip
                          contentStyle={{ backgroundColor: '#18181b', borderColor: '#333', borderRadius: '12px' }}
                          formatter={(value: any) => [`$ ${Number(value).toLocaleString()} M`, '']}
                        />
                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                        <Bar dataKey="Disponible Presupuesto" fill="#FFCC29" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Saldo en Bancos" fill="#10B981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Gráfica 2: Composición de la Ejecución Presupuestal */}
              {activeConcilChart === 'g2' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono text-on-surface-variant">
                    <span>Desglose de la Apropiación Definitiva ($ 576.148M COP)</span>
                    <span>Pagos (Verde) | Por Pagar (Rojo) | Disponible (Amarillo)</span>
                  </div>
                  <div className="h-[340px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          {
                            categoria: 'Administración',
                            'Pagos Realizados': Math.round(conciliacionData.totales.adminPagos / 1e6),
                            'Compromisos por Pagar': Math.round(conciliacionData.totales.adminSaldoPorPagar / 1e6),
                            'Disponible por Comprometer': Math.round(conciliacionData.totales.adminDisponiblePresupuestal / 1e6),
                          },
                          {
                            categoria: 'Inversión',
                            'Pagos Realizados': Math.round(conciliacionData.totales.invPagos / 1e6),
                            'Compromisos por Pagar': Math.round(conciliacionData.totales.invSaldoPorPagar / 1e6),
                            'Disponible por Comprometer': Math.round(conciliacionData.totales.invDisponiblePresupuestal / 1e6),
                          },
                          {
                            categoria: 'Total Institucional',
                            'Pagos Realizados': Math.round(conciliacionData.totales.pagosAcumulados / 1e6),
                            'Compromisos por Pagar': Math.round(conciliacionData.totales.compromisosPendientesPago / 1e6),
                            'Disponible por Comprometer': Math.round(conciliacionData.totales.disponiblePresupuestal / 1e6),
                          },
                        ]}
                        margin={{ top: 10, right: 20, left: 10, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <XAxis dataKey="categoria" stroke="#888" fontSize={12} />
                        <YAxis stroke="#888" fontSize={11} tickFormatter={(v) => `$${v}M`} />
                        <RechartsTooltip
                          contentStyle={{ backgroundColor: '#18181b', borderColor: '#333', borderRadius: '12px' }}
                          formatter={(value: any) => [`$ ${Number(value).toLocaleString()} M`, '']}
                        />
                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                        <Bar dataKey="Pagos Realizados" stackId="a" fill="#10B981" />
                        <Bar dataKey="Compromisos por Pagar" stackId="a" fill="#F43F5E" />
                        <Bar dataKey="Disponible por Comprometer" stackId="a" fill="#FFCC29" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Gráfica 3: Composición de la Disponibilidad Tesoral */}
              {activeConcilChart === 'g3' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono text-on-surface-variant">
                    <span>Afectación del Saldo en Bancos ($ 144.563M COP)</span>
                    <span>Caja Libre de Giro ($ 83.162M) vs Compromisos Radicados Exigibles ($ 61.402M)</span>
                  </div>
                  <div className="h-[340px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          {
                            categoria: 'Administración',
                            'Disponible Tesoral Libre': Math.round(conciliacionData.totales.adminDisponibleTesoral / 1e6),
                            'Compromisos Pendientes': Math.round(conciliacionData.totales.adminSaldoPorPagar / 1e6),
                          },
                          {
                            categoria: 'Inversión',
                            'Disponible Tesoral Libre': Math.round(conciliacionData.totales.invDisponibleTesoral / 1e6),
                            'Compromisos Pendientes': Math.round(conciliacionData.totales.invSaldoPorPagar / 1e6),
                          },
                          {
                            categoria: 'Total UPTC',
                            'Disponible Tesoral Libre': Math.round(conciliacionData.totales.disponibleTesoralEstimado / 1e6),
                            'Compromisos Pendientes': Math.round(conciliacionData.totales.compromisosPendientesPago / 1e6),
                          },
                        ]}
                        margin={{ top: 10, right: 20, left: 10, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <XAxis dataKey="categoria" stroke="#888" fontSize={12} />
                        <YAxis stroke="#888" fontSize={11} tickFormatter={(v) => `$${v}M`} />
                        <RechartsTooltip
                          contentStyle={{ backgroundColor: '#18181b', borderColor: '#333', borderRadius: '12px' }}
                          formatter={(value: any) => [`$ ${Number(value).toLocaleString()} M`, '']}
                        />
                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                        <Bar dataKey="Disponible Tesoral Libre" fill="#38BDF8" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Compromisos Pendientes" fill="#F43F5E" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Gráfica 4: Brecha Presupuestal - Tesoral */}
              {activeConcilChart === 'g4' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono text-on-surface-variant">
                    <span>Top Recursos con Mayor Brecha (Disponible Presupuesto - Disponible Tesorería)</span>
                    <span className="text-amber-300">Valores positivos indican apropiación que requiere recaudo</span>
                  </div>
                  <div className="h-[340px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={conciliacionData.recursos
                          .slice()
                          .sort((a, b) => Math.abs(b.diferenciaDisponibilidades) - Math.abs(a.diferenciaDisponibilidades))
                          .slice(0, 10)
                          .map((r) => ({
                            recurso: `Rec ${r.codigo}`,
                            nombre: r.nombre,
                            'Brecha Presupuesto-Tesorería': Math.round(r.diferenciaDisponibilidades / 1e6),
                          }))}
                        margin={{ top: 10, right: 20, left: 10, bottom: 40 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <XAxis dataKey="recurso" stroke="#888" fontSize={11} angle={-30} textAnchor="end" />
                        <YAxis stroke="#888" fontSize={11} tickFormatter={(v) => `$${v}M`} />
                        <RechartsTooltip
                          contentStyle={{ backgroundColor: '#18181b', borderColor: '#333', borderRadius: '12px' }}
                          formatter={(value: any) => [`$ ${Number(value).toLocaleString()} M`, 'Diferencia']}
                        />
                        <Bar dataKey="Brecha Presupuesto-Tesorería" radius={[4, 4, 0, 0]}>
                          {conciliacionData.recursos.slice(0, 10).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.diferenciaDisponibilidades >= 0 ? '#F59E0B' : '#10B981'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Gráfica 5: Cobertura de Obligaciones */}
              {activeConcilChart === 'g5' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono text-on-surface-variant">
                    <span>Ratios de Cobertura Inmediata (Saldo en Bancos / Compromisos por Pagar)</span>
                    <span className="text-emerald-400">Umbral mínimo óptimo: &ge; 1,0x</span>
                  </div>
                  <div className="h-[340px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          { fuente: 'Total Institucional', ratio: 2.35 },
                          { fuente: 'Rec 10.0 Aportes Nación', ratio: 7.3 },
                          { fuente: 'Rec 20 Recursos Propios', ratio: 10.38 },
                          { fuente: 'Rec 40 Estampilla UPTC', ratio: 7.49 },
                          { fuente: 'Rec 33 Convenios Terceros', ratio: 1.18 },
                          { fuente: 'Administración Global', ratio: 2.83 },
                          { fuente: 'Inversión Global', ratio: 1.15 },
                        ]}
                        margin={{ top: 10, right: 20, left: 10, bottom: 30 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <XAxis dataKey="fuente" stroke="#888" fontSize={11} angle={-15} textAnchor="end" />
                        <YAxis stroke="#888" fontSize={11} tickFormatter={(v) => `${v}x`} />
                        <RechartsTooltip
                          contentStyle={{ backgroundColor: '#18181b', borderColor: '#333', borderRadius: '12px' }}
                          formatter={(value: any) => [`${value}x (${(value * 100).toFixed(0)}%)`, 'Cobertura']}
                        />
                        <Bar dataKey="ratio" fill="#10B981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Gráfica 6: Administración vs. Inversión */}
              {activeConcilChart === 'g6' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono text-on-surface-variant">
                    <span>Comparativo Financiero Integral: Administración frente a Inversión</span>
                    <span>Millones COP</span>
                  </div>
                  <div className="h-[340px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          {
                            concepto: 'Apropiación',
                            Administración: Math.round(conciliacionData.totales.adminApropiacion / 1e6),
                            Inversión: Math.round(conciliacionData.totales.invApropiacion / 1e6),
                          },
                          {
                            concepto: 'Compromisos',
                            Administración: Math.round(conciliacionData.totales.adminCompromisos / 1e6),
                            Inversión: Math.round(conciliacionData.totales.invCompromisos / 1e6),
                          },
                          {
                            concepto: 'Pagos',
                            Administración: Math.round(conciliacionData.totales.adminPagos / 1e6),
                            Inversión: Math.round(conciliacionData.totales.invPagos / 1e6),
                          },
                          {
                            concepto: 'Disp. Presupuestal',
                            Administración: Math.round(conciliacionData.totales.adminDisponiblePresupuestal / 1e6),
                            Inversión: Math.round(conciliacionData.totales.invDisponiblePresupuestal / 1e6),
                          },
                          {
                            concepto: 'Saldo Bancos',
                            Administración: Math.round(conciliacionData.totales.adminSaldoBancos / 1e6),
                            Inversión: Math.round(conciliacionData.totales.invSaldoBancos / 1e6),
                          },
                          {
                            concepto: 'Por Pagar',
                            Administración: Math.round(conciliacionData.totales.adminSaldoPorPagar / 1e6),
                            Inversión: Math.round(conciliacionData.totales.invSaldoPorPagar / 1e6),
                          },
                        ]}
                        margin={{ top: 10, right: 20, left: 10, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <XAxis dataKey="concepto" stroke="#888" fontSize={11} />
                        <YAxis stroke="#888" fontSize={11} tickFormatter={(v) => `$${v}M`} />
                        <RechartsTooltip
                          contentStyle={{ backgroundColor: '#18181b', borderColor: '#333', borderRadius: '12px' }}
                          formatter={(value: any) => [`$ ${Number(value).toLocaleString()} M`, '']}
                        />
                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                        <Bar dataKey="Administración" fill="#38BDF8" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Inversión" fill="#10B981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Gráfica 7: Conciliación por Unidad */}
              {activeConcilChart === 'g7' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono text-on-surface-variant">
                    <span>Presupuesto por Comprometer vs. Saldo por Pagar en las Principales Unidades</span>
                    <span>Millones COP</span>
                  </div>
                  <div className="h-[340px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={conciliacionData.unidades.slice(0, 8).map((u) => ({
                          unidad: u.unidad.split(' - ')[0],
                          nombre: u.unidad,
                          'Disponible Presupuesto': Math.round(u.disponiblePresupuestal / 1e6),
                          'Saldo por Pagar': Math.round(u.saldoPorPagar / 1e6),
                        }))}
                        margin={{ top: 10, right: 20, left: 10, bottom: 30 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <XAxis dataKey="unidad" stroke="#888" fontSize={11} />
                        <YAxis stroke="#888" fontSize={11} tickFormatter={(v) => `$${v}M`} />
                        <RechartsTooltip
                          contentStyle={{ backgroundColor: '#18181b', borderColor: '#333', borderRadius: '12px' }}
                          formatter={(value: any) => [`$ ${Number(value).toLocaleString()} M`, '']}
                        />
                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                        <Bar dataKey="Disponible Presupuesto" fill="#FFCC29" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Saldo por Pagar" fill="#F43F5E" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Interactive Resource Conciliation Table (Section 5.3) */}
          <div className="bg-surface-container-low/50 border border-white/5 p-6 rounded-3xl space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FileSpreadsheet size={18} className="text-[#FFCC29]" />
                  Matriz de Conciliación Detallada por Código de Recurso (21 Fuentes)
                </h3>
                <span className="text-xs text-on-surface-variant">
                  Apropiación, compromisos, pagos, disponibilidad tesoral y ratios de cobertura individual
                </span>
              </div>

              {/* Filters for Resources Table */}
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                  <input
                    type="text"
                    value={searchConcilRecurso}
                    onChange={(e) => setSearchConcilRecurso(e.target.value)}
                    placeholder="Buscar recurso o código..."
                    className="w-full pl-9 pr-3 py-1.5 bg-surface-container border border-white/10 rounded-xl text-xs text-white placeholder-on-surface-variant focus:outline-none focus:border-[#FFCC29]"
                  />
                </div>

                <select
                  value={filterConcilTipo}
                  onChange={(e) => setFilterConcilTipo(e.target.value as any)}
                  className="bg-surface-container border border-white/10 text-white rounded-xl px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-[#FFCC29]"
                >
                  <option value="Todos">Todos los tipos</option>
                  <option value="Administración">Administración</option>
                  <option value="Inversión">Inversión</option>
                </select>

                {filterConcilEscenario !== 'TODOS' && (
                  <button
                    onClick={() => setFilterConcilEscenario('TODOS')}
                    className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 text-xs font-mono border border-amber-500/30 hover:bg-amber-500/30"
                  >
                    Escenario: {filterConcilEscenario} &times;
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-on-surface-variant uppercase text-[10px]">
                    <th className="p-2.5">Código</th>
                    <th className="p-2.5">Recurso</th>
                    <th className="p-2.5">Tipo</th>
                    <th className="p-2.5 text-right">Apropiación</th>
                    <th className="p-2.5 text-right">Compromisos</th>
                    <th className="p-2.5 text-right">Pagos</th>
                    <th className="p-2.5 text-right text-amber-300">Disp. Presup.</th>
                    <th className="p-2.5 text-right text-emerald-300">Saldo Bancos</th>
                    <th className="p-2.5 text-right text-rose-300">Por Pagar</th>
                    <th className="p-2.5 text-right text-sky-300">Disp. Tesorería</th>
                    <th className="p-2.5 text-right text-[#FFCC29]">Brecha</th>
                    <th className="p-2.5 text-center">Cobertura</th>
                    <th className="p-2.5">Escenario</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {conciliacionData.recursos
                    .filter((r) => {
                      if (filterConcilTipo !== 'Todos' && r.tipo !== filterConcilTipo) return false;
                      if (filterConcilEscenario === 'A' && !r.escenario.includes('Escenario A')) return false;
                      if (filterConcilEscenario === 'B' && !r.escenario.includes('Escenario B')) return false;
                      if (filterConcilEscenario === 'C' && !r.escenario.includes('Escenario C')) return false;
                      if (filterConcilEscenario === 'D' && !r.escenario.includes('Escenario D')) return false;
                      if (searchConcilRecurso) {
                        const q = searchConcilRecurso.toLowerCase();
                        return r.codigo.toLowerCase().includes(q) || r.nombre.toLowerCase().includes(q);
                      }
                      return true;
                    })
                    .map((r) => (
                      <tr key={r.codigo} className="hover:bg-white/5 transition-colors">
                        <td className="p-2.5 font-bold text-white whitespace-nowrap">{r.codigo}</td>
                        <td className="p-2.5 text-white/90 max-w-xs truncate" title={r.nombre}>
                          {r.nombre}
                        </td>
                        <td className="p-2.5 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              r.tipo === 'Administración'
                                ? 'bg-sky-400/10 text-sky-300 border border-sky-400/20'
                                : 'bg-emerald-400/10 text-emerald-300 border border-emerald-400/20'
                            }`}
                          >
                            {r.tipo}
                          </span>
                        </td>
                        <td className="p-2.5 text-right whitespace-nowrap">{formatMillions(r.apropiacion)}</td>
                        <td className="p-2.5 text-right whitespace-nowrap">{formatMillions(r.compromisos)}</td>
                        <td className="p-2.5 text-right whitespace-nowrap">{formatMillions(r.pagos)}</td>
                        <td className="p-2.5 text-right font-bold text-amber-300 whitespace-nowrap">
                          {formatMillions(r.disponiblePresupuestal)}
                        </td>
                        <td className="p-2.5 text-right font-bold text-emerald-300 whitespace-nowrap">
                          {r.saldoBancos > 0 ? formatMillions(r.saldoBancos) : '—'}
                        </td>
                        <td className="p-2.5 text-right text-rose-300 whitespace-nowrap">
                          {formatMillions(r.compromisosPendientesPago)}
                        </td>
                        <td className="p-2.5 text-right font-bold text-sky-300 whitespace-nowrap">
                          {formatMillions(r.disponibleTesoralEstimado)}
                        </td>
                        <td className="p-2.5 text-right font-black text-[#FFCC29] whitespace-nowrap">
                          {formatMillions(r.diferenciaDisponibilidades)}
                        </td>
                        <td className="p-2.5 text-center whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              r.coberturaObligaciones >= 2.0
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : r.coberturaObligaciones >= 1.0
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-rose-500/20 text-rose-300'
                            }`}
                          >
                            {r.coberturaObligaciones >= 900 ? 'N/A' : `${r.coberturaObligaciones.toFixed(1)}x`}
                          </span>
                        </td>
                        <td className="p-2.5 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[9px] font-mono ${
                              r.escenario.includes('A')
                                ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                                : r.escenario.includes('B')
                                ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                                : r.escenario.includes('C')
                                ? 'bg-sky-500/10 text-sky-300 border border-sky-500/20'
                                : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                            }`}
                            title={r.observacion}
                          >
                            {r.escenario.split(' ')[1]} {r.escenario.split(' ')[0]}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Conciliation by Executing Unit (Section 5.4) */}
          <div className="bg-surface-container-low/50 border border-white/5 p-6 rounded-3xl space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Building2 size={18} className="text-[#FFCC29]" />
                  Conciliación por Unidad Académica y Administrativa (14 Unidades)
                </h3>
                <span className="text-xs text-on-surface-variant">
                  Apropiación, ejecución contractual, compromisos pendientes y fondeo institucional centralizado
                </span>
              </div>

              <div className="relative w-full sm:w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                <input
                  type="text"
                  value={searchConcilUnidad}
                  onChange={(e) => setSearchConcilUnidad(e.target.value)}
                  placeholder="Buscar unidad ejecutora..."
                  className="w-full pl-9 pr-3 py-1.5 bg-surface-container border border-white/10 rounded-xl text-xs text-white placeholder-on-surface-variant focus:outline-none focus:border-[#FFCC29]"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-on-surface-variant uppercase text-[10px]">
                    <th className="p-2.5">Unidad</th>
                    <th className="p-2.5 text-right">Apropiación Definitiva</th>
                    <th className="p-2.5 text-right">Compromisos (% Comp.)</th>
                    <th className="p-2.5 text-right">Pagos (% Pago)</th>
                    <th className="p-2.5 text-right text-rose-300">Saldo por Pagar</th>
                    <th className="p-2.5 text-right text-amber-300">Disponible Presupuestal</th>
                    <th className="p-2.5 text-right text-emerald-300">Tesorería Centralizada</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {conciliacionData.unidades
                    .filter((u) => {
                      if (!searchConcilUnidad) return true;
                      return u.unidad.toLowerCase().includes(searchConcilUnidad.toLowerCase());
                    })
                    .map((u) => (
                      <tr key={u.unidad} className="hover:bg-white/5 transition-colors">
                        <td className="p-2.5 font-bold text-white max-w-sm truncate">{u.unidad}</td>
                        <td className="p-2.5 text-right whitespace-nowrap">{formatCOP(u.apropiacion)}</td>
                        <td className="p-2.5 text-right whitespace-nowrap">
                          <span className="font-medium text-white">{formatMillions(u.compromisos)}</span>
                          <span className="text-[10px] text-on-surface-variant block font-sans">
                            {u.porcentajeCompromiso.toFixed(1)}% comprometido
                          </span>
                        </td>
                        <td className="p-2.5 text-right whitespace-nowrap">
                          <span className="font-medium text-white">{formatMillions(u.pagos)}</span>
                          <span className="text-[10px] text-emerald-400 block font-sans">
                            {u.porcentajePago.toFixed(1)}% girado
                          </span>
                        </td>
                        <td className="p-2.5 text-right font-bold text-rose-300 whitespace-nowrap">
                          {formatCOP(u.saldoPorPagar)}
                        </td>
                        <td className="p-2.5 text-right font-black text-amber-300 whitespace-nowrap">
                          {formatCOP(u.disponiblePresupuestal)}
                        </td>
                        <td className="p-2.5 text-right text-emerald-400 font-mono text-[11px] whitespace-nowrap">
                          {u.saldoBancosDirecto > 0 ? 'Fondeo Institucional Central ($ 144.129M)' : 'Cuenta Concentradora'}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Module of Alerts & Financial Risks (Section 11) */}
          <div className="bg-surface-container-low/50 border border-white/5 p-6 rounded-3xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Módulo de Alertas y Riesgos Financieros Auditados</h3>
                  <span className="text-[11px] text-on-surface-variant">Riesgo de liquidez, presupuestal y de conciliación</span>
                </div>
              </div>
              <span className="text-xs font-mono text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20">
                {conciliacionData.alertas.length} Alertas Activas
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {conciliacionData.alertas.map((al) => (
                <div
                  key={al.id}
                  className="bg-surface-container/60 border border-white/5 p-4 rounded-2xl flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                          al.tipo === 'RIESGO_LIQUIDEZ'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : al.tipo === 'RIESGO_PRESUPUESTAL'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                        }`}
                      >
                        {al.tipo.replace('_', ' ')}
                      </span>
                      <span
                        className={`text-[10px] font-bold ${
                          al.nivel === 'ALTO'
                            ? 'text-rose-400'
                            : al.nivel === 'MEDIO'
                            ? 'text-amber-400'
                            : 'text-sky-400'
                        }`}
                      >
                        {al.nivel}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-white leading-snug">{al.titulo}</h4>
                    <p className="text-[11px] text-on-surface-variant font-light leading-relaxed">{al.descripcion}</p>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-white/5 text-[10px]">
                    <div className="bg-black/20 p-2 rounded-xl space-y-1">
                      <span className="text-on-surface-variant/70 block uppercase text-[9px] font-mono">
                        Causa Identificada:
                      </span>
                      <span className="text-white/80 font-sans block">{al.posibleCausa}</span>
                    </div>
                    <div className="bg-[#FFCC29]/5 border border-[#FFCC29]/10 p-2 rounded-xl space-y-1">
                      <span className="text-[#FFCC29] block uppercase text-[9px] font-mono font-bold">
                        Recomendación de Auditoría:
                      </span>
                      <span className="text-white/90 font-sans block">{al.recomendacion}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Answers to the 8 Institutional Management Questions (Section 20) */}
          <div className="bg-surface-container-low/50 border border-white/5 p-6 rounded-3xl space-y-6">
            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <div className="p-2.5 rounded-2xl bg-[#FFCC29] text-black">
                <Award size={20} />
              </div>
              <div>
                <h3 className="text-base font-black text-white">
                  Informe Ejecutivo: Respuestas Oficiales a las 8 Preguntas de Gestión Financiera
                </h3>
                <span className="text-xs text-on-surface-variant">
                  Diagnóstico técnico sustentado con rigor matemático para la Vicerrectoría Administrativa y Financiera
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {conciliacionData.preguntasClave.map((item) => (
                <div
                  key={item.numero}
                  className="bg-surface-container/60 border border-white/5 p-5 rounded-2xl space-y-3 flex flex-col justify-between hover:border-white/20 transition-colors"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-black text-[#FFCC29] px-2 py-0.5 rounded bg-[#FFCC29]/10 border border-[#FFCC29]/20">
                        PREGUNTA {item.numero}
                      </span>
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                          item.impacto === 'POSITIVO'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : item.impacto === 'ALERTA'
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-sky-500/20 text-sky-400'
                        }`}
                      >
                        {item.impacto}
                      </span>
                    </div>

                    <h4 className="text-xs sm:text-sm font-bold text-white leading-snug">{item.pregunta}</h4>

                    <div className="bg-white/5 p-2.5 rounded-xl border border-white/5">
                      <span className="text-xs font-black text-[#FFCC29] block mb-1">
                        {item.respuestaCorta}
                      </span>
                      <p className="text-[11px] text-on-surface-variant font-light leading-relaxed">
                        {item.respuestaDetallada}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5">
                    {item.indicadoresClave.map((kpi, kIdx) => (
                      <div key={kIdx} className="bg-black/30 p-2 rounded-xl text-center">
                        <span className="text-[9px] text-on-surface-variant block uppercase truncate">{kpi.label}</span>
                        <span className="text-xs font-black text-white font-mono block mt-0.5">{kpi.valor}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
"""

new_content = content.replace(target_marker, target_marker + "\n" + conciliacion_jsx)

with open('src/screens/CajaHoyScreen.tsx', 'w') as f:
    f.write(new_content)

print("Conciliación tab JSX successfully inserted into src/screens/CajaHoyScreen.tsx")
