import re

with open('src/screens/CajaHoyScreen.tsx', 'r') as f:
    content = f.read()

start_marker = "{activeTab === 'diciembre' && ("
end_marker = "{activeTab === 'equilibrio' && ("

start_pos = content.find(start_marker)
end_pos = content.find(end_marker)

if start_pos == -1 or end_pos == -1:
    print("ERROR: Markers not found!")
    exit(1)

new_diciembre_jsx = """{activeTab === 'diciembre' && (
        <div className="space-y-8">
          {/* Header of simulator */}
          <div className="bg-gradient-to-r from-surface-container-high via-surface-container to-surface-container-low border border-white/10 p-6 rounded-3xl backdrop-blur-xl relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1 z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFCC29]/10 text-[#FFCC29] text-xs font-mono font-bold">
                <Sliders size={14} />
                PROYECCIONES DE DICIEMBRE Y SIMULADOR DE CIERRE FINANCIERO UPTC
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Simulación de Cierre Presupuestal y Tesoral 2026
              </h2>
              <p className="text-xs sm:text-sm text-on-surface-variant max-w-3xl leading-relaxed">
                Modelo interactivo de cierre con incorporación exclusiva de la nómina de diciembre en el <strong className="text-white">Rubro 2.1.1 (Gastos de Personal)</strong> y registro de <strong className="text-white">Ingresos Adicionales Proyectados</strong> sin alterar las bases de datos históricas originales.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 z-10">
              {(['Todos', 'Administración', 'Inversión'] as const).map((scope) => (
                <button
                  key={scope}
                  onClick={() => setSimResourceScope(scope)}
                  className={`px-3 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                    simResourceScope === scope
                      ? 'bg-[#FFCC29] text-black shadow-md'
                      : 'bg-black/40 text-on-surface-variant hover:text-white border border-white/10'
                  }`}
                >
                  {scope === 'Todos' ? 'Consolidado' : scope}
                </button>
              ))}
              <button
                onClick={resetSimulation}
                className="px-3 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-mono border border-white/10 cursor-pointer flex items-center gap-1.5"
                title="Restablecer valores de simulación"
              >
                <RotateCcw size={14} className="text-[#FFCC29]" />
                Reset
              </button>
            </div>
          </div>

          {/* 6 Projected KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-surface-container-low/60 border border-white/5 p-4 rounded-2xl flex flex-col justify-between">
              <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider block">
                1. Recaudo Proyectado Cierre
              </span>
              <div className="my-1.5">
                <span className="text-lg lg:text-xl font-black text-emerald-400 font-mono block">
                  {formatMillions(proyeccionDiciembre.recaudoTotalProyectadoCierre)}
                </span>
                <span className="text-[10px] text-on-surface-variant/80 font-mono">
                  {proyeccionDiciembre.porcentajeRecaudoProyectadoCierre.toFixed(1)}% de aforo
                </span>
              </div>
              <span className="text-[9px] text-emerald-400 font-mono">
                +{formatMillions(proyeccionDiciembre.recaudoEsperadoDiciembreTotal)} en Dic
              </span>
            </div>

            <div className="bg-surface-container-low/60 border border-white/5 p-4 rounded-2xl flex flex-col justify-between">
              <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider block">
                2. Pagos Proyectados Cierre
              </span>
              <div className="my-1.5">
                <span className="text-lg lg:text-xl font-black text-rose-400 font-mono block">
                  {formatMillions(proyeccionDiciembre.pagosTotalesProyectadosCierre)}
                </span>
                <span className="text-[10px] text-on-surface-variant/80 font-mono">
                  {proyeccionDiciembre.porcentajePagoProyectadoCierre.toFixed(1)}% de apropiación
                </span>
              </div>
              <span className="text-[9px] text-rose-300 font-mono">
                +{formatMillions(proyeccionDiciembre.pagosEsperadosDiciembreTotal)} en Dic
              </span>
            </div>

            <div className="bg-surface-container-low/60 border border-white/5 p-4 rounded-2xl flex flex-col justify-between">
              <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider block">
                3. Compromisos Proyectados
              </span>
              <div className="my-1.5">
                <span className="text-lg lg:text-xl font-black text-amber-400 font-mono block">
                  {formatMillions(proyeccionDiciembre.compromisosTotalesProyectadosCierre)}
                </span>
                <span className="text-[10px] text-on-surface-variant/80 font-mono">
                  {proyeccionDiciembre.porcentajeCompromisoProyectadoCierre.toFixed(1)}% comprometido
                </span>
              </div>
              <span className="text-[9px] text-amber-300 font-mono">
                Incluye nómina Dic 2.1.1
              </span>
            </div>

            <div className="bg-surface-container-low/60 border border-white/5 p-4 rounded-2xl flex flex-col justify-between">
              <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider block">
                4. Disp. Presupuestal Libre
              </span>
              <div className="my-1.5">
                <span className="text-lg lg:text-xl font-black text-sky-400 font-mono block">
                  {formatMillions(proyeccionDiciembre.saldoPresupuestalDisponibleCierre)}
                </span>
                <span className="text-[10px] text-on-surface-variant/80 font-mono">
                  Apropiación no comprometida
                </span>
              </div>
              <span className="text-[9px] text-sky-300 font-mono">
                Tras imputar nómina Dic
              </span>
            </div>

            <div className="bg-surface-container-low/60 border border-white/5 p-4 rounded-2xl flex flex-col justify-between">
              <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider block">
                5. Balance Presupuestal Cierre
              </span>
              <div className="my-1.5">
                <span className={`text-lg lg:text-xl font-black font-mono block ${
                  proyeccionDiciembre.balancePresupuestalCierre >= 0 ? 'text-[#FFCC29]' : 'text-rose-400'
                }`}>
                  {formatMillions(proyeccionDiciembre.balancePresupuestalCierre)}
                </span>
                <span className="text-[10px] text-on-surface-variant/80 font-mono">
                  Recaudo proy. - Compromisos
                </span>
              </div>
              <span className="text-[9px] text-emerald-400 font-mono">
                Superávit proyectado
              </span>
            </div>

            <div className="bg-surface-container-low/60 border border-white/5 p-4 rounded-2xl flex flex-col justify-between">
              <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider block">
                6. Saldo Bancos 31 Diciembre
              </span>
              <div className="my-1.5">
                <span className="text-lg lg:text-xl font-black text-emerald-400 font-mono block">
                  {formatMillions(proyeccionDiciembre.saldoBancosProyectadoCierre)}
                </span>
                <span className="text-[10px] text-on-surface-variant/80 font-mono">
                  Posición de caja al cierre
                </span>
              </div>
              <span className="text-[9px] text-sky-400 font-mono">
                Flujo neto Dic: {formatMillions(proyeccionDiciembre.flujoNetoDiciembre)}
              </span>
            </div>
          </div>

          {/* REQUERIMIENTO 1: Nómina de Diciembre en Rubro 2.1.1 (Gastos de Personal) */}
          <div className="bg-surface-container-low/50 border border-white/5 p-6 rounded-3xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-[#FFCC29]/10 text-[#FFCC29]">
                  <Briefcase size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    1. Nómina Pendiente de Apropiación – Rubro 2.1.1 (Gastos de Personal)
                  </h3>
                  <span className="text-xs text-on-surface-variant">
                    Único compromiso pendiente de apropiación presupuestal al cierre de la vigencia 2026
                  </span>
                </div>
              </div>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                Rubro: 2.1.1 Gastos de Personal
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              {/* Input & Presets (5 cols) */}
              <div className="lg:col-span-5 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-gray-300 block font-medium">
                    Valor Estimado de la Nómina de Diciembre (COP):
                  </label>
                  <div className="relative">
                    <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#FFCC29]" />
                    <input
                      type="number"
                      value={simNominaDiciembre211}
                      onChange={(e) => setSimNominaDiciembre211(parseFloat(e.target.value) || 0)}
                      className="w-full pl-9 pr-3 py-2.5 bg-black/60 border border-white/10 rounded-xl text-sm font-mono font-bold text-white focus:outline-none focus:border-[#FFCC29]"
                      placeholder="28500000000"
                    />
                  </div>
                  <div className="flex justify-between items-center text-[11px] font-mono text-on-surface-variant">
                    <span>Equivalente:</span>
                    <span className="text-[#FFCC29] font-bold">{formatCOP(simNominaDiciembre211)}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] font-mono text-on-surface-variant uppercase block">
                    Presets de Nómina Institucional:
                  </span>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: '$ 25.000M', val: 25000000000 },
                      { label: '$ 28.500M', val: 28500000000 },
                      { label: '$ 32.000M', val: 32000000000 },
                      { label: '$ 0 M', val: 0 },
                    ].map((btn) => (
                      <button
                        key={btn.label}
                        onClick={() => setSimNominaDiciembre211(btn.val)}
                        className={`py-1.5 rounded-xl text-[11px] font-mono border transition-all cursor-pointer ${
                          simNominaDiciembre211 === btn.val
                            ? 'bg-[#FFCC29] text-black font-bold border-[#FFCC29]'
                            : 'bg-black/40 text-gray-300 border-white/10 hover:bg-white/5'
                        }`}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>

                <p className="text-[11px] text-on-surface-variant leading-relaxed font-light">
                  * Este registro se imputa automáticamente al componente de funcionamiento en el rubro 2.1.1, evitando que se duplique con los compromisos ya adquiridos o con los gastos recurrentes operativos.
                </p>
              </div>

              {/* Rubro 2.1.1 Diagnostics Card (7 cols) */}
              <div className="lg:col-span-7 bg-surface-container/60 border border-white/5 p-5 rounded-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                    Diagnóstico Presupuestal Específico del Rubro 2.1.1
                  </span>
                  <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded font-bold ${
                    proyeccionDiciembre.rubro211.suficienciaApropiacion
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}>
                    {proyeccionDiciembre.rubro211.suficienciaApropiacion ? 'SUFICIENCIA GARANTIZADA' : 'INSUFICIENCIA PRESUPUESTAL'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                  <div className="bg-black/30 p-2.5 rounded-xl">
                    <span className="text-[10px] text-on-surface-variant block uppercase truncate">Apropiación 2.1.1</span>
                    <span className="font-bold text-white block mt-1">{formatMillions(proyeccionDiciembre.rubro211.apropiacionActual)}</span>
                  </div>
                  <div className="bg-black/30 p-2.5 rounded-xl">
                    <span className="text-[10px] text-on-surface-variant block uppercase truncate">Compromisos a Nov</span>
                    <span className="font-bold text-amber-300 block mt-1">{formatMillions(proyeccionDiciembre.rubro211.compromisosActuales)}</span>
                  </div>
                  <div className="bg-black/30 p-2.5 rounded-xl">
                    <span className="text-[10px] text-on-surface-variant block uppercase truncate">(+) Nómina Dic</span>
                    <span className="font-bold text-[#FFCC29] block mt-1">{formatMillions(proyeccionDiciembre.rubro211.nominaDiciembreEstimada)}</span>
                  </div>
                  <div className="bg-black/30 p-2.5 rounded-xl">
                    <span className="text-[10px] text-on-surface-variant block uppercase truncate">Disp. Restante 2.1.1</span>
                    <span className="font-bold text-emerald-400 block mt-1">{formatMillions(proyeccionDiciembre.rubro211.disponibleProyectadoCierre)}</span>
                  </div>
                </div>

                <div className="bg-black/20 p-3 rounded-xl border border-white/5 space-y-1.5 text-xs">
                  <div className="flex justify-between items-center font-mono">
                    <span className="text-on-surface-variant">Ejecución Proyectada de Personal (2.1.1):</span>
                    <span className="text-white font-bold">{proyeccionDiciembre.rubro211.porcentajeCompromisoProyectado.toFixed(2)}% de apropiación</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-emerald-500 to-[#FFCC29] h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, proyeccionDiciembre.rubro211.porcentajeCompromisoProyectado)}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-on-surface-variant leading-relaxed font-light">
                    {proyeccionDiciembre.rubro211.suficienciaApropiacion
                      ? `La UPTC cuenta con apropiación disponible de ${formatMillions(proyeccionDiciembre.rubro211.disponibleActual)} en el Rubro 2.1.1, suficiente para amparar el 100% de la nómina de diciembre (${formatMillions(proyeccionDiciembre.rubro211.nominaDiciembreEstimada)}), conservando un margen libre no comprometido de ${formatMillions(proyeccionDiciembre.rubro211.holguraApropiacion211)} COP.`
                      : `ALERTA: La nómina estimada supera la disponibilidad presupuestal libre del rubro 2.1.1 en ${formatMillions(Math.abs(proyeccionDiciembre.rubro211.holguraApropiacion211))} COP, requiriendo un traslado presupuestal interno.`}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* REQUERIMIENTO 2: Apartado Independiente «Ingresos Adicionales Proyectados» */}
          <div className="bg-surface-container-low/50 border border-white/5 p-6 rounded-3xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400">
                  <TrendingUp size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    2. Apartado Independiente: Ingresos Adicionales Proyectados
                  </h3>
                  <span className="text-xs text-on-surface-variant">
                    Registro de recaudos extraordinarios, transferencias pendientes y nuevos recursos para el cierre
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-[10px] font-mono text-on-surface-variant uppercase block">Total Adicionales:</span>
                  <span className="text-sm font-black text-emerald-400 font-mono">
                    +{formatMillions(proyeccionDiciembre.totalIngresosAdicionalesManuales)}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setEditingIncomeId(null);
                    setIncomeForm({
                      concepto: '',
                      valor: 0,
                      recurso: '20',
                      tipo: 'Administración',
                      naturaleza: 'Libre Destinación',
                      observaciones: '',
                    });
                    setShowAddIncomeForm(!showAddIncomeForm);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-mono border border-emerald-500/30 transition-all cursor-pointer"
                >
                  <Plus size={14} />
                  {showAddIncomeForm ? 'Cerrar Formulario' : 'Nuevo Ingreso'}
                </button>
              </div>
            </div>

            {/* Formulario de Agregar / Editar Ingreso Adicional */}
            {showAddIncomeForm && (
              <div className="bg-surface-container/80 border border-emerald-500/30 p-5 rounded-2xl space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <span className="text-xs font-mono font-bold text-emerald-300 uppercase">
                    {editingIncomeId ? 'Editar Ingreso Adicional Proyectado' : 'Registrar Nuevo Ingreso Adicional Proyectado'}
                  </span>
                  <button
                    onClick={() => setShowAddIncomeForm(false)}
                    className="text-on-surface-variant hover:text-white"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs font-mono">
                  <div className="space-y-1">
                    <label className="text-gray-300 block">Concepto o Descripción:</label>
                    <input
                      type="text"
                      value={incomeForm.concepto}
                      onChange={(e) => setIncomeForm({ ...incomeForm, concepto: e.target.value })}
                      placeholder="Ej. Giro MEN Política de Gratuidad"
                      className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-on-surface-variant focus:outline-none focus:border-emerald-400"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-gray-300 block">Valor Estimado (COP):</label>
                    <input
                      type="number"
                      value={incomeForm.valor || ''}
                      onChange={(e) => setIncomeForm({ ...incomeForm, valor: parseFloat(e.target.value) || 0 })}
                      placeholder="Monto en COP"
                      className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-on-surface-variant focus:outline-none focus:border-emerald-400"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-gray-300 block">Recurso Presupuestal:</label>
                    <select
                      value={incomeForm.recurso}
                      onChange={(e) => setIncomeForm({ ...incomeForm, recurso: e.target.value })}
                      className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-400"
                    >
                      <option value="10.0">10.0 - Aportes Nación Funcionamiento</option>
                      <option value="10.5">10.5 - Política de Gratuidad</option>
                      <option value="12">12 - Estampillas Otras Universidades</option>
                      <option value="13">13 - Cooperativas</option>
                      <option value="14">14 - Matrículas FSE</option>
                      <option value="16.0">16.0 - Aportes Inversión</option>
                      <option value="20">20 - Recursos Propios</option>
                      <option value="31">31 - Posgrados</option>
                      <option value="33">33 - Convenios con Derechos</option>
                      <option value="34">34 - Convenios sin Derechos</option>
                      <option value="40">40 - Estampilla UPTC</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-gray-300 block">Tipo de Recurso:</label>
                    <select
                      value={incomeForm.tipo}
                      onChange={(e) => setIncomeForm({ ...incomeForm, tipo: e.target.value as any })}
                      className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-400"
                    >
                      <option value="Administración">Administración</option>
                      <option value="Inversión">Inversión</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-gray-300 block">Naturaleza del Recurso:</label>
                    <select
                      value={incomeForm.naturaleza}
                      onChange={(e) => setIncomeForm({ ...incomeForm, naturaleza: e.target.value as any })}
                      className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-400"
                    >
                      <option value="Libre Destinación">Libre Destinación</option>
                      <option value="Destinación Específica">Destinación Específica</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-gray-300 block">Observaciones / Justificación:</label>
                    <input
                      type="text"
                      value={incomeForm.observaciones}
                      onChange={(e) => setIncomeForm({ ...incomeForm, observaciones: e.target.value })}
                      placeholder="Soporte o justificación del giro"
                      className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-on-surface-variant focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setShowAddIncomeForm(false)}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-mono border border-white/10 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveIncome}
                    className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-black font-bold rounded-xl text-xs font-mono shadow-md cursor-pointer flex items-center gap-1.5"
                  >
                    <Check size={14} />
                    {editingIncomeId ? 'Actualizar Ingreso' : 'Guardar Ingreso'}
                  </button>
                </div>
              </div>
            )}

            {/* Tabla de Ingresos Adicionales Registrados */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-on-surface-variant uppercase text-[10px]">
                    <th className="p-2.5">Concepto / Descripción</th>
                    <th className="p-2.5 text-right">Valor Estimado</th>
                    <th className="p-2.5 text-center">Recurso</th>
                    <th className="p-2.5 text-center">Tipo</th>
                    <th className="p-2.5 text-center">Naturaleza</th>
                    <th className="p-2.5">Observaciones</th>
                    <th className="p-2.5 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {simIngresosAdicionales.map((item) => (
                    <tr key={item.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-2.5 font-bold text-white max-w-xs">{item.concepto}</td>
                      <td className="p-2.5 text-right font-black text-emerald-400 whitespace-nowrap">
                        {formatCOP(item.valor)}
                      </td>
                      <td className="p-2.5 text-center whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-[#FFCC29]/10 text-[#FFCC29] border border-[#FFCC29]/20 font-bold">
                          Rec {item.recurso}
                        </span>
                      </td>
                      <td className="p-2.5 text-center whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.tipo === 'Administración'
                              ? 'bg-sky-400/10 text-sky-300 border border-sky-400/20'
                              : 'bg-emerald-400/10 text-emerald-300 border border-emerald-400/20'
                          }`}
                        >
                          {item.tipo}
                        </span>
                      </td>
                      <td className="p-2.5 text-center whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] ${
                            item.naturaleza === 'Libre Destinación'
                              ? 'bg-amber-400/10 text-amber-300 border border-amber-400/20'
                              : 'bg-purple-400/10 text-purple-300 border border-purple-400/20'
                          }`}
                        >
                          {item.naturaleza}
                        </span>
                      </td>
                      <td className="p-2.5 text-on-surface-variant text-[11px] max-w-xs truncate" title={item.observaciones}>
                        {item.observaciones || '—'}
                      </td>
                      <td className="p-2.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleEditIncome(item)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-sky-300 transition-colors"
                            title="Editar ingreso"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteIncome(item.id)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-rose-400 transition-colors"
                            title="Eliminar ingreso"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {simIngresosAdicionales.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-on-surface-variant font-mono">
                        No hay ingresos adicionales registrados. Haz clic en "+ Nuevo Ingreso" para agregar recaudos proyectados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Interactive Simulation Parameters & Reference vs Projected Comparison */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Sliders (5 cols) */}
            <div className="lg:col-span-5 bg-surface-container-low/40 border border-white/5 p-6 rounded-3xl space-y-6">
              <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider border-b border-white/5 pb-2">
                Curvas de Recaudo y Pago en Diciembre
              </h4>

              {/* Slider 1: % Recaudo Saldo Pendiente */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-gray-300">Cumplimiento Recaudo Aforo Base:</span>
                  <span className="text-[#FFCC29] font-bold">{(simIncomeComplianceRate * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={simIncomeComplianceRate}
                  onChange={(e) => setSimIncomeComplianceRate(parseFloat(e.target.value))}
                  className="w-full accent-[#FFCC29] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-on-surface-variant font-mono">
                  <span>Prudente (25%)</span>
                  <span>Base (65%)</span>
                  <span>Optimista (90%)</span>
                </div>
              </div>

              {/* Slider 2: % Pago Compromisos Pendientes */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-gray-300">Giro Compromisos Existentes Dic:</span>
                  <span className="text-amber-400 font-bold">{(simExpensePaymentRate * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={simExpensePaymentRate}
                  onChange={(e) => setSimExpensePaymentRate(parseFloat(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-on-surface-variant font-mono">
                  <span>Prudente (55%)</span>
                  <span>Base (75%)</span>
                  <span>Total (100%)</span>
                </div>
              </div>

              {/* Quick Scenario Selector Buttons */}
              <div className="pt-2 border-t border-white/5">
                <span className="text-[10px] font-mono text-on-surface-variant uppercase block mb-2">
                  Cargar Escenario Rápido:
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => {
                      setSimIncomeComplianceRate(0.25);
                      setSimExpensePaymentRate(0.55);
                    }}
                    className="px-2 py-1.5 bg-black/40 hover:bg-white/5 border border-white/10 rounded-xl text-[11px] font-mono text-gray-300 cursor-pointer text-center"
                  >
                    Conservador
                  </button>
                  <button
                    onClick={() => {
                      setSimIncomeComplianceRate(0.65);
                      setSimExpensePaymentRate(0.75);
                    }}
                    className="px-2 py-1.5 bg-black/40 hover:bg-white/5 border border-white/10 rounded-xl text-[11px] font-mono text-gray-300 cursor-pointer text-center"
                  >
                    Base
                  </button>
                  <button
                    onClick={() => {
                      setSimIncomeComplianceRate(0.90);
                      setSimExpensePaymentRate(0.90);
                    }}
                    className="px-2 py-1.5 bg-black/40 hover:bg-white/5 border border-white/10 rounded-xl text-[11px] font-mono text-gray-300 cursor-pointer text-center"
                  >
                    Optimista
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Comparative Reference Table (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              <div className="bg-surface-container-low/40 border border-white/5 p-6 rounded-3xl space-y-4">
                <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider border-b border-white/5 pb-2">
                  Tabla de Variables: Ejecutado Real (23 Nov) vs Ajustes Dic vs Cierre Proyectado
                </h4>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono border-collapse">
                    <thead className="bg-zinc-900 border-b border-white/10 text-on-surface-variant text-[11px]">
                      <tr>
                        <th className="p-2.5">Variable Financiera</th>
                        <th className="p-2.5 text-right">Real (23 Nov)</th>
                        <th className="p-2.5 text-right">Ajuste Dic</th>
                        <th className="p-2.5 text-right font-bold text-[#FFCC29]">Proyectado Cierre</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      <tr>
                        <td className="p-2.5 text-gray-300">Saldo en cuentas bancarias</td>
                        <td className="p-2.5 text-right text-gray-400">{formatCOP(proyeccionDiciembre.bancosActuales)}</td>
                        <td className={`p-2.5 text-right font-bold ${proyeccionDiciembre.flujoNetoDiciembre >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {formatCOP(proyeccionDiciembre.flujoNetoDiciembre)}
                        </td>
                        <td className="p-2.5 text-right font-bold text-emerald-400">{formatCOP(proyeccionDiciembre.saldoBancosProyectadoCierre)}</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 text-gray-300">Aforo de ingresos</td>
                        <td className="p-2.5 text-right text-gray-400">{formatCOP(proyeccionDiciembre.aforoTotal)}</td>
                        <td className="p-2.5 text-right text-on-surface-variant">—</td>
                        <td className="p-2.5 text-right text-white">{formatCOP(proyeccionDiciembre.aforoTotal)}</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 text-gray-300">Recaudo de ingresos</td>
                        <td className="p-2.5 text-right text-gray-400">{formatCOP(proyeccionDiciembre.recaudoHistoricoEneNov)}</td>
                        <td className="p-2.5 text-right text-emerald-300">+{formatCOP(proyeccionDiciembre.recaudoEsperadoDiciembreTotal)}</td>
                        <td className="p-2.5 text-right font-bold text-emerald-400">{formatCOP(proyeccionDiciembre.recaudoTotalProyectadoCierre)}</td>
                      </tr>
                      <tr className="bg-white/5">
                        <td className="p-2.5 text-gray-300">Apropiación presupuestal total</td>
                        <td className="p-2.5 text-right text-gray-400">{formatCOP(proyeccionDiciembre.apropiacionTotal)}</td>
                        <td className="p-2.5 text-right text-on-surface-variant">—</td>
                        <td className="p-2.5 text-right text-white">{formatCOP(proyeccionDiciembre.apropiacionTotal)}</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 text-gray-300">Compromisos presupuestales</td>
                        <td className="p-2.5 text-right text-gray-400">{formatCOP(proyeccionDiciembre.compromisosHistoricosEneNov)}</td>
                        <td className="p-2.5 text-right text-[#FFCC29]">+{formatCOP(proyeccionDiciembre.nominaDiciembreAfectada)}</td>
                        <td className="p-2.5 text-right font-bold text-amber-300">{formatCOP(proyeccionDiciembre.compromisosTotalesProyectadosCierre)}</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 text-gray-300">Saldo de apropiación disponible</td>
                        <td className="p-2.5 text-right text-gray-400">{formatCOP(proyeccionDiciembre.apropiacionTotal - proyeccionDiciembre.compromisosHistoricosEneNov)}</td>
                        <td className="p-2.5 text-right text-rose-300">-{formatCOP(proyeccionDiciembre.nominaDiciembreAfectada)}</td>
                        <td className="p-2.5 text-right font-black text-sky-400">{formatCOP(proyeccionDiciembre.saldoPresupuestalDisponibleCierre)}</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 text-gray-300">Pagos acumulados efectivos</td>
                        <td className="p-2.5 text-right text-gray-400">{formatCOP(proyeccionDiciembre.pagosHistoricosEneNov)}</td>
                        <td className="p-2.5 text-right text-rose-300">+{formatCOP(proyeccionDiciembre.pagosEsperadosDiciembreTotal)}</td>
                        <td className="p-2.5 text-right font-bold text-rose-400">{formatCOP(proyeccionDiciembre.pagosTotalesProyectadosCierre)}</td>
                      </tr>
                      <tr className="bg-[#FFCC29]/10">
                        <td className="p-2.5 font-bold text-white">Balance Presupuestal de Cierre</td>
                        <td className="p-2.5 text-right text-gray-400">{formatCOP(proyeccionDiciembre.recaudoHistoricoEneNov - proyeccionDiciembre.compromisosHistoricosEneNov)}</td>
                        <td className="p-2.5 text-right text-emerald-300">
                          {formatCOP(proyeccionDiciembre.recaudoEsperadoDiciembreTotal - proyeccionDiciembre.nominaDiciembreAfectada)}
                        </td>
                        <td className="p-2.5 text-right font-black text-[#FFCC29]">{formatCOP(proyeccionDiciembre.balancePresupuestalCierre)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Waterfall Chart Representation */}
              <div className="bg-surface-container-low/40 border border-white/5 p-6 rounded-3xl space-y-4">
                <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                  Gráfica de Cascada: Transformación del Efectivo en Diciembre
                </h4>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { name: 'Caja Actual', valor: Math.round(proyeccionDiciembre.bancosActuales / 1e6), fill: '#FFCC29' },
                        { name: '(+) Recaudo Base', valor: Math.round(proyeccionDiciembre.recaudoEsperadoAforoBase / 1e6), fill: '#10b981' },
                        { name: '(+) Adicionales', valor: Math.round(proyeccionDiciembre.totalIngresosAdicionalesManuales / 1e6), fill: '#38bdf8' },
                        { name: '(-) Giros Exist.', valor: Math.round(proyeccionDiciembre.pagosEsperadosCompromisosExistentes / 1e6), fill: '#f43f5e' },
                        { name: '(-) Nómina 2.1.1', valor: Math.round(proyeccionDiciembre.nominaDiciembreAfectada / 1e6), fill: '#e11d48' },
                        { name: '(=) Caja Cierre', valor: Math.round(proyeccionDiciembre.saldoBancosProyectadoCierre / 1e6), fill: '#10B981' },
                      ]}
                      margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                      <XAxis dataKey="name" stroke="#888888" tick={{ fontSize: 10 }} />
                      <YAxis stroke="#888888" tick={{ fontSize: 10 }} />
                      <RechartsTooltip
                        contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', borderRadius: '12px' }}
                        formatter={(val: any) => [`$ ${Number(val).toLocaleString('es-CO')} M`, 'Monto']}
                      />
                      <Bar dataKey="valor" radius={[6, 6, 0, 0]}>
                        {['#FFCC29', '#10b981', '#38bdf8', '#f43f5e', '#e11d48', '#10B981'].map((c, i) => (
                          <Cell key={i} fill={c} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}"""

new_content = content[:start_pos] + new_diciembre_jsx + "\n\n      " + content[end_pos:]

with open('src/screens/CajaHoyScreen.tsx', 'w') as f:
    f.write(new_content)

print("Successfully replaced Subtab Diciembre in CajaHoyScreen.tsx")

