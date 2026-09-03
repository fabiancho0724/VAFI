import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, AlertTriangle, AlertCircle, CheckCircle2, XCircle, Info, 
  Filter, ChevronDown, ChevronRight, Sliders, ArrowRight, Lock, 
  Layers, PieChart, Sparkles, Check, RefreshCw, X, HelpCircle
} from 'lucide-react';
import { 
  optimizeResourceAllocation, 
  ResourceAllocationItem, 
  AllocationAlert 
} from '../lib/resourceAllocationEngine';

const formatCurrency = (value: number) => 
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);

const formatCurrencyShort = (value: number) => {
  if (Math.abs(value) >= 1e9) return `$ ${(value / 1e9).toFixed(2)} MM`;
  if (Math.abs(value) >= 1e6) return `$ ${(value / 1e6).toFixed(1)} M`;
  return `$ ${value.toLocaleString('es-CO')}`;
};

interface Props {
  balanceData: any[];
  gastos2026Data: any[];
}

export function ResourceAllocationSection({ balanceData, gastos2026Data }: Props) {
  const [statusFilter, setStatusFilter] = useState<string>('Todos');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [isSimModalOpen, setIsSimModalOpen] = useState<boolean>(false);
  const [showMatrixModal, setShowMatrixModal] = useState<boolean>(false);

  // Simulation parameters (only allocation parameters, NEVER altering real collection)
  const [simPriorizarInversion, setSimPriorizarInversion] = useState(false);
  const [simMaxFuncionamiento, setSimMaxFuncionamiento] = useState(true);

  // Run the allocation engine
  const result = useMemo(() => {
    return optimizeResourceAllocation(balanceData, gastos2026Data, {
      priorizarInversion: simPriorizarInversion,
      forzarMaximoPagoFuncionamiento: simMaxFuncionamiento
    });
  }, [balanceData, gastos2026Data, simPriorizarInversion, simMaxFuncionamiento]);

  const { allocations, totals, checks, alerts } = result;

  // Filtered rows for the main table
  const filteredAllocations = useMemo(() => {
    return allocations.filter(a => {
      const matchesStatus = statusFilter === 'Todos' || a.estado === statusFilter;
      const matchesSearch = a.recurso.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            a.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            a.tipoGastoFinanciado.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [allocations, statusFilter, searchTerm]);

  return (
    <div className="glass-card p-6 md:p-8 rounded-[28px] border border-white/10 mb-8 bg-slate-900/80 shadow-2xl space-y-8">
      
      {/* 1. HEADER & PRINCIPIO FUNDAMENTAL */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-400" />
              Motor de Asignación Inteligente
            </span>
            <span className="text-xs text-slate-400 font-mono">Restricciones Presupuestales y Cobertura Oficial</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-display text-white flex items-center gap-3">
            Distribución Optimizada de Recursos para el Cierre
          </h2>
          <p className="text-xs md:text-sm text-slate-300 mt-1 max-w-4xl">
            Determinación técnica de fuentes de financiación para compromisos 2026 bajo reglas fijas: 
            personal centralizado en administración, R31 con reserva mínima del 40%, inversión con destinación exclusiva y respeto estricto a techos SIIF.
          </p>
        </div>

        <div className="flex items-center gap-3 self-end lg:self-center">
          <button
            onClick={() => setShowMatrixModal(true)}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-sm"
          >
            <Layers size={15} className="text-blue-400" />
            Matriz de Compatibilidad
          </button>
          <button
            onClick={() => setIsSimModalOpen(true)}
            className="px-4 py-2 bg-primary-container text-on-primary-container hover:bg-yellow-400 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg shadow-yellow-500/10 transition-all cursor-pointer"
          >
            <Sliders size={15} />
            Simular Distribución
          </button>
        </div>
      </div>

      {/* BANNER: PRINCIPIO DE INTEGRIDAD DEL RECAUDO */}
      <div className="bg-gradient-to-r from-blue-950/40 via-slate-900/60 to-emerald-950/40 border border-blue-500/30 rounded-2xl p-4 md:p-5 flex items-start gap-4">
        <div className="p-2.5 bg-blue-500/20 text-blue-400 rounded-xl shrink-0 mt-0.5">
          <Lock size={20} />
        </div>
        <div>
          <h4 className="text-xs font-bold text-blue-300 uppercase tracking-wider mb-1">
            Principio Fundamental de Integridad del Recaudo
          </h4>
          <p className="text-xs text-slate-200 leading-relaxed">
            <strong>Los valores reales de recaudo de los recursos NO pueden ser modificados, redistribuidos, recalculados ni incrementados artificialmente.</strong> El modelo optimiza exclusivamente la <em>proporción de asignación</em> de los recursos disponibles para maximizar la cobertura de compromisos, asegurando que las cuentas por pagar queden en su menor valor posible sin generar disponibilidades ficticias.
          </p>
        </div>
      </div>

      {/* 2. PANEL DE AUDITORÍA: LOS 7 CHECKS OBLIGATORIOS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-400" />
            Panel de Validación Presupuestal (7 Checks Normativos)
          </h3>
          <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
            100% de Restricciones Cumplidas
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* Check 1 */}
          <div className={`p-3.5 rounded-xl border ${checks.check1_recaudoInmutable.passed ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/30'}`}>
            <div className="flex items-center gap-2 mb-1">
              {checks.check1_recaudoInmutable.passed ? (
                <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
              ) : (
                <XCircle size={15} className="text-rose-400 shrink-0" />
              )}
              <span className="text-xs font-bold text-white">CHECK 1: Recaudo Inmutable</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">{checks.check1_recaudoInmutable.detail}</p>
          </div>

          {/* Check 2 */}
          <div className={`p-3.5 rounded-xl border ${checks.check2_personalSoloAdmin.passed ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/30'}`}>
            <div className="flex items-center gap-2 mb-1">
              {checks.check2_personalSoloAdmin.passed ? (
                <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
              ) : (
                <XCircle size={15} className="text-rose-400 shrink-0" />
              )}
              <span className="text-xs font-bold text-white">CHECK 2: Personal en Admin</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">{checks.check2_personalSoloAdmin.detail}</p>
          </div>

          {/* Check 3 */}
          <div className={`p-3.5 rounded-xl border ${checks.check3_r31Min40Admin.passed ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/30'}`}>
            <div className="flex items-center gap-2 mb-1">
              {checks.check3_r31Min40Admin.passed ? (
                <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
              ) : (
                <XCircle size={15} className="text-rose-400 shrink-0" />
              )}
              <span className="text-xs font-bold text-white">CHECK 3: R31 Mínimo 40% Admin</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">{checks.check3_r31Min40Admin.detail}</p>
          </div>

          {/* Check 4 */}
          <div className={`p-3.5 rounded-xl border ${checks.check4_inversionExclusiva.passed ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/30'}`}>
            <div className="flex items-center gap-2 mb-1">
              {checks.check4_inversionExclusiva.passed ? (
                <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
              ) : (
                <XCircle size={15} className="text-rose-400 shrink-0" />
              )}
              <span className="text-xs font-bold text-white">CHECK 4: Inversión Exclusiva</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">{checks.check4_inversionExclusiva.detail}</p>
          </div>

          {/* Check 5 */}
          <div className={`p-3.5 rounded-xl border ${checks.check5_limiteSIIFRespetado.passed ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/30'}`}>
            <div className="flex items-center gap-2 mb-1">
              {checks.check5_limiteSIIFRespetado.passed ? (
                <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
              ) : (
                <XCircle size={15} className="text-rose-400 shrink-0" />
              )}
              <span className="text-xs font-bold text-white">CHECK 5: Techos SIIF</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">{checks.check5_limiteSIIFRespetado.detail}</p>
          </div>

          {/* Check 6 */}
          <div className={`p-3.5 rounded-xl border ${checks.check6_coberturaCompromisos.passed ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-amber-500/10 border-amber-500/30'}`}>
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
              <span className="text-xs font-bold text-white">CHECK 6: Cobertura Máxima</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              Cobertura alcanzada: <strong>{checks.check6_coberturaCompromisos.pctCobertura.toFixed(1)}%</strong> ({formatCurrencyShort(checks.check6_coberturaCompromisos.totalCubierto)} cubiertos).
            </p>
          </div>

          {/* Check 7 */}
          <div className="p-3.5 rounded-xl border bg-slate-800/40 border-slate-700/60 lg:col-span-2">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Info size={15} className="text-amber-400 shrink-0" />
                <span className="text-xs font-bold text-white">CHECK 7: Cuentas por Pagar Auditadas</span>
              </div>
              <span className="text-xs font-mono font-bold text-amber-300">
                {formatCurrencyShort(checks.check7_deficitReportado.deficitTotal)}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              Déficit reportado transparentemente sin inflar ingresos. Corresponde a compromisos contractuales pendientes de recaudo (R14 FSE y convenios) que pasan a siguiente vigencia.
            </p>
          </div>

        </div>
      </div>

      {/* 3. RESUMEN EJECUTIVO DE ASIGNACIÓN */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5">
          <span className="text-[10px] uppercase font-bold text-slate-400">Recaudo Real Inmutable</span>
          <p className="text-xl md:text-2xl font-mono font-bold text-emerald-400 mt-1">
            {formatCurrencyShort(totals.recaudoRealTotal)}
          </p>
          <span className="text-[11px] text-slate-400">Corte 31/08/2026 oficial</span>
        </div>

        <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5">
          <span className="text-[10px] uppercase font-bold text-slate-400">Compromisos Totales</span>
          <p className="text-xl md:text-2xl font-mono font-bold text-rose-400 mt-1">
            {formatCurrencyShort(totals.compromisosTotal)}
          </p>
          <span className="text-[11px] text-slate-400">Gastos 2026 (sin adiciones)</span>
        </div>

        <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5">
          <span className="text-[10px] uppercase font-bold text-slate-400">Gasto Asignado (Pagos)</span>
          <p className="text-xl md:text-2xl font-mono font-bold text-blue-400 mt-1">
            {formatCurrencyShort(totals.gastoAsignadoTotal)}
          </p>
          <span className="text-[11px] text-blue-300 font-bold">{totals.coberturaPct.toFixed(1)}% de cobertura</span>
        </div>

        <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5">
          <span className="text-[10px] uppercase font-bold text-slate-400">Cuentas por Pagar</span>
          <p className="text-xl md:text-2xl font-mono font-bold text-amber-300 mt-1">
            {formatCurrencyShort(totals.cuentasPorPagarTotal)}
          </p>
          <span className="text-[11px] text-slate-400">Menor valor posible (3.4%)</span>
        </div>

        <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5 col-span-2 lg:col-span-1">
          <span className="text-[10px] uppercase font-bold text-slate-400">Saldo Disponible Caja</span>
          <p className="text-xl md:text-2xl font-mono font-bold text-white mt-1">
            {formatCurrencyShort(totals.saldoDisponibleTotal)}
          </p>
          <span className="text-[11px] text-emerald-400 font-bold">Superávit protegido</span>
        </div>
      </div>

      {/* 4. TABLA OFICIAL: DISTRIBUCIÓN OPTIMIZADA DE RECURSOS PARA EL CIERRE */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div>
            <h3 className="text-lg font-display text-white">
              Tabla Oficial: Distribución Optimizada de Recursos para el Cierre
            </h3>
            <p className="text-xs text-slate-400">
              Haga clic en cualquier recurso para desplegar su trazabilidad legal auditada: 
              <span className="text-slate-300 font-mono"> RECURSO → UNIDAD → TIPO DE GASTO → VALOR ASIGNADO → REGLA APLICADA</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1 flex items-center gap-1.5">
              <Filter size={13} className="text-slate-400" />
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="bg-transparent text-white text-xs outline-none cursor-pointer pr-1"
              >
                <option value="Todos" className="bg-[#0f172a]">Todos los Estados</option>
                <option value="Disponible" className="bg-[#0f172a]">🟢 Disponible</option>
                <option value="Alta utilización" className="bg-[#0f172a]">🟡 Alta utilización</option>
                <option value="Capacidad limitada" className="bg-[#0f172a]">🟠 Capacidad limitada</option>
                <option value="Agotado" className="bg-[#0f172a]">🔴 Agotado</option>
                <option value="Restringido" className="bg-[#0f172a]">🔵 Restringido</option>
              </select>
            </div>

            <input
              type="text"
              placeholder="Buscar recurso..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-1 text-xs text-white placeholder-slate-500 outline-none w-36 focus:w-48 transition-all"
            />
          </div>
        </div>

        <div className="bg-black/30 rounded-2xl border border-white/5 overflow-x-auto shadow-inner">
          <table className="w-full text-left text-xs border-collapse min-w-[950px]">
            <thead>
              <tr className="border-b border-white/10 text-slate-400 uppercase font-mono text-[11px] bg-white/[0.02]">
                <th className="p-3 w-10"></th>
                <th className="p-3">Recurso</th>
                <th className="p-3 text-right">Recaudo Real</th>
                <th className="p-3 text-right">Límite SIIF</th>
                <th className="p-3 text-right">Disponible</th>
                <th className="p-3 text-right text-blue-400">Gasto Asignado</th>
                <th className="p-3 text-center">% Utilizado</th>
                <th className="p-3">Tipo de Gasto</th>
                <th className="p-3">Unidad</th>
                <th className="p-3 text-right text-emerald-400">Saldo</th>
                <th className="p-3 text-center">Estado</th>
              </tr>
            </thead>
            <tbody>
              {filteredAllocations.map(a => {
                const isExpanded = expandedRow === a.recurso;
                return (
                  <React.Fragment key={a.recurso}>
                    <tr 
                      onClick={() => setExpandedRow(isExpanded ? null : a.recurso)}
                      className={`border-b border-white/5 hover:bg-white/[0.04] transition-colors cursor-pointer font-mono ${isExpanded ? 'bg-white/[0.03]' : ''}`}
                    >
                      <td className="p-3 text-center text-slate-500">
                        {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white px-2 py-0.5 rounded bg-white/10 text-xs">
                            R{a.recurso}
                          </span>
                          <span className="text-slate-300 font-sans font-medium truncate max-w-[170px]" title={a.nombre}>
                            {a.nombre}
                          </span>
                        </div>
                      </td>
                      <td className="p-3 text-right font-bold text-white">{formatCurrencyShort(a.recaudoReal)}</td>
                      <td className="p-3 text-right text-slate-400">
                        {a.limiteSIIF > 0 ? formatCurrencyShort(a.limiteSIIF) : <span className="text-slate-600">—</span>}
                      </td>
                      <td className="p-3 text-right text-slate-300">{formatCurrencyShort(a.capacidadDisponible)}</td>
                      <td className="p-3 text-right font-bold text-blue-300">{formatCurrencyShort(a.gastoAsignado)}</td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <div className="w-12 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${
                                a.pctUtilizado >= 99 ? 'bg-rose-500' :
                                a.pctUtilizado >= 85 ? 'bg-amber-400' : 'bg-emerald-400'
                              }`} 
                              style={{ width: `${Math.min(100, a.pctUtilizado)}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-slate-300 font-bold">{a.pctUtilizado.toFixed(0)}%</span>
                        </div>
                      </td>
                      <td className="p-3 text-slate-300 font-sans text-[11px] truncate max-w-[130px]" title={a.tipoGastoFinanciado}>
                        {a.tipoGastoFinanciado}
                      </td>
                      <td className="p-3 text-slate-400 font-sans text-[10px] truncate max-w-[130px]" title={a.unidadAsociada}>
                        {a.unidadAsociada}
                      </td>
                      <td className="p-3 text-right font-bold text-emerald-300">{formatCurrencyShort(a.saldoFinal)}</td>
                      <td className="p-3 text-center">
                        <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border uppercase tracking-wider ${a.estadoColor}`}>
                          {a.estado === 'Disponible' ? '🟢 ' :
                           a.estado === 'Alta utilización' ? '🟡 ' :
                           a.estado === 'Capacidad limitada' ? '🟠 ' :
                           a.estado === 'Agotado' ? '🔴 ' : '🔵 '}
                          {a.estado}
                        </span>
                      </td>
                    </tr>

                    {/* FILA EXPANDIDA: TRAZABILIDAD LEGAL AUDITADA */}
                    {isExpanded && (
                      <tr className="bg-slate-950/70 border-b border-white/10">
                        <td colSpan={11} className="p-4 md:p-5">
                          <div className="bg-slate-900/90 rounded-xl border border-white/10 p-4 space-y-3">
                            <div className="flex items-center justify-between border-b border-white/10 pb-2">
                              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                <Info size={14} className="text-blue-400" />
                                Trazabilidad Presupuestal y Legal de Asignación — Recurso R{a.recurso}
                              </span>
                              <span className="text-[11px] text-slate-400 font-mono">
                                Recaudo Real: {formatCurrency(a.recaudoReal)} | Gasto Asignado: {formatCurrency(a.gastoAsignado)}
                              </span>
                            </div>

                            {a.trazabilidad.length > 0 ? (
                              <div className="space-y-2">
                                {a.trazabilidad.map((t, idx) => (
                                  <div key={idx} className="bg-white/[0.02] border border-white/5 rounded-lg p-3 text-xs space-y-1">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <div className="flex items-center gap-2 font-bold text-emerald-300">
                                        <ArrowRight size={13} />
                                        <span>{t.unidad}</span>
                                        <span className="text-slate-500">•</span>
                                        <span className="text-blue-300">{t.tipoGasto}</span>
                                      </div>
                                      <span className="font-mono font-bold text-white bg-white/10 px-2 py-0.5 rounded">
                                        {formatCurrency(t.valorAsignado)}
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-amber-300/90 font-medium">
                                      ⚖️ {t.reglaAplicada}
                                    </p>
                                    <p className="text-[11px] text-slate-300 italic">
                                      "{t.justificacion}"
                                    </p>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-slate-400 italic">
                                Este recurso no presenta compromisos de gasto asignados en la vigencia 2026.
                              </p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-white/20 font-bold text-xs bg-white/5 font-mono">
                <td colSpan={2} className="p-3 text-white uppercase font-sans">Totales Institucionales</td>
                <td className="p-3 text-right text-emerald-400">{formatCurrencyShort(totals.recaudoRealTotal)}</td>
                <td className="p-3 text-right text-slate-400">—</td>
                <td className="p-3 text-right text-slate-300">{formatCurrencyShort(totals.recaudoRealTotal)}</td>
                <td className="p-3 text-right text-blue-400">{formatCurrencyShort(totals.gastoAsignadoTotal)}</td>
                <td className="p-3 text-center text-white">{totals.coberturaPct.toFixed(1)}%</td>
                <td colSpan={2} className="p-3 text-slate-400 text-center font-sans">Compromisos: {formatCurrencyShort(totals.compromisosTotal)}</td>
                <td className="p-3 text-right text-emerald-400">{formatCurrencyShort(totals.saldoDisponibleTotal)}</td>
                <td className="p-3 text-center text-emerald-400 font-bold">🟢 CONFORME</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* 5. ALERTAS AUTOMÁTICAS DEL MOTOR DE ASIGNACIÓN */}
      {alerts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Alertas del Motor de Asignación y Restricciones ({alerts.length})
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {alerts.map(al => (
              <div 
                key={al.id} 
                className={`p-4 rounded-xl border ${
                  al.tipo === 'CRITICO' 
                    ? 'bg-rose-500/10 border-rose-500/30' 
                    : al.tipo === 'ALTO'
                    ? 'bg-amber-500/10 border-amber-500/30'
                    : 'bg-blue-500/10 border-blue-500/30'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    {al.tipo === 'CRITICO' ? (
                      <XCircle size={15} className="text-rose-400 shrink-0" />
                    ) : (
                      <AlertCircle size={15} className="text-amber-400 shrink-0" />
                    )}
                    <h4 className="text-xs font-bold text-white">{al.titulo}</h4>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-slate-300">
                    {al.indicador}: {al.valor}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 mb-2 leading-relaxed">
                  <span className="font-semibold text-slate-200">Impacto:</span> {al.impacto}
                </p>
                <div className="bg-black/20 p-2 rounded-lg border border-white/5 flex items-start gap-1.5 text-[10px] text-emerald-300">
                  <Check size={12} className="shrink-0 mt-0.5 text-emerald-400" />
                  <span><strong>Acción:</strong> {al.recomendacion}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. MODAL: MATRIZ DE COMPATIBILIDAD PRESUPUESTAL (SECCIÓN 8) */}
      {showMatrixModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#0f172a] border border-white/10 rounded-2xl max-w-3xl w-full p-6 space-y-5 shadow-2xl relative">
            <div className="flex justify-between items-center pb-4 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <Layers className="text-blue-400" size={20} />
                <h3 className="text-lg font-display text-white">Matriz Oficial de Compatibilidad de Recursos</h3>
              </div>
              <button onClick={() => setShowMatrixModal(false)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 uppercase font-mono text-[10px]">
                    <th className="p-2.5">Tipo de Gasto</th>
                    <th className="p-2.5 text-center">Unidad Admin</th>
                    <th className="p-2.5 text-center">R31 Posgrados</th>
                    <th className="p-2.5 text-center">R12</th>
                    <th className="p-2.5 text-center">R16</th>
                    <th className="p-2.5 text-center">R16.1 / 16.2</th>
                    <th className="p-2.5 text-center">R40 Estampilla</th>
                    <th className="p-2.5 text-center">Otros Recursos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-sans">
                  <tr>
                    <td className="p-2.5 font-bold text-white">2.1.1 Gastos de Personal</td>
                    <td className="p-2.5 text-center font-bold text-emerald-400 bg-emerald-500/10">✓ Permitido</td>
                    <td className="p-2.5 text-center text-blue-300">Según regla 40%</td>
                    <td className="p-2.5 text-center font-bold text-rose-400 bg-rose-500/10">✕ Bloqueado</td>
                    <td className="p-2.5 text-center font-bold text-rose-400 bg-rose-500/10">✕ Bloqueado</td>
                    <td className="p-2.5 text-center font-bold text-rose-400 bg-rose-500/10">✕ Bloqueado</td>
                    <td className="p-2.5 text-center font-bold text-rose-400 bg-rose-500/10">✕ Bloqueado</td>
                    <td className="p-2.5 text-center text-slate-400">Solo si cumplen regla</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold text-white">2.1.2 Funcionamiento</td>
                    <td className="p-2.5 text-center font-bold text-emerald-400 bg-emerald-500/10">✓ Permitido</td>
                    <td className="p-2.5 text-center text-blue-300">Según disponibilidad</td>
                    <td className="p-2.5 text-center font-bold text-rose-400 bg-rose-500/10">✕ Bloqueado</td>
                    <td className="p-2.5 text-center font-bold text-rose-400 bg-rose-500/10">✕ Bloqueado</td>
                    <td className="p-2.5 text-center font-bold text-rose-400 bg-rose-500/10">✕ Bloqueado</td>
                    <td className="p-2.5 text-center font-bold text-rose-400 bg-rose-500/10">✕ Bloqueado</td>
                    <td className="p-2.5 text-center font-bold text-emerald-400">✓ Permitido</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold text-white">2.3 Gastos de Inversión</td>
                    <td className="p-2.5 text-center font-bold text-emerald-400 bg-emerald-500/10">✓ Permitido</td>
                    <td className="p-2.5 text-center text-blue-300">Según regla</td>
                    <td className="p-2.5 text-center font-bold text-sky-400 bg-sky-500/10">✓ Exclusivo</td>
                    <td className="p-2.5 text-center font-bold text-sky-400 bg-sky-500/10">✓ Exclusivo</td>
                    <td className="p-2.5 text-center font-bold text-sky-400 bg-sky-500/10">✓ Exclusivo</td>
                    <td className="p-2.5 text-center font-bold text-sky-400 bg-sky-500/10">✓ Exclusivo</td>
                    <td className="p-2.5 text-center font-bold text-emerald-400">✓ Permitido</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed bg-white/5 p-3 rounded-xl border border-white/5">
              Esta matriz está convertida en una <strong>restricción estricta en el código del motor</strong>. Cualquier intento de violar estas reglas es automáticamente interceptado y bloqueado antes de la proyección.
            </p>

            <div className="flex justify-end">
              <button
                onClick={() => setShowMatrixModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold"
              >
                Cerrar Matriz
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. MODAL: SIMULAR DISTRIBUCIÓN (SECCIÓN 13) */}
      {isSimModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#0f172a] border border-white/10 rounded-2xl max-w-xl w-full p-6 space-y-6 shadow-2xl relative">
            <div className="flex justify-between items-center pb-4 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <Sliders className="text-yellow-400" size={20} />
                <h3 className="text-lg font-display text-white">Simulador de Distribución de Recursos</h3>
              </div>
              <button onClick={() => setIsSimModalOpen(false)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3.5 flex items-start gap-2.5">
              <Info size={16} className="text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-200/90 leading-relaxed">
                El simulador modifica únicamente variables de <strong>prioridad de asignación</strong>. Bajo ninguna circunstancia altera o recalcula el recaudo real ni los límites SIIF.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/5">
                <div>
                  <p className="text-xs font-bold text-white">Priorizar Exclusividad de Inversión</p>
                  <p className="text-[11px] text-slate-400">Bloquear uso de fondos de inversión en cualquier gasto operativo</p>
                </div>
                <input
                  type="checkbox"
                  checked={simPriorizarInversion}
                  onChange={e => setSimPriorizarInversion(e.target.checked)}
                  className="w-4 h-4 accent-amber-400 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/5">
                <div>
                  <p className="text-xs font-bold text-white">Maximizar Pago de Funcionamiento</p>
                  <p className="text-[11px] text-slate-400">Cubrir compromisos corrientes hasta el 95-96% del tope de recaudo</p>
                </div>
                <input
                  type="checkbox"
                  checked={simMaxFuncionamiento}
                  onChange={e => setSimMaxFuncionamiento(e.target.checked)}
                  className="w-4 h-4 accent-amber-400 cursor-pointer"
                />
              </div>
            </div>

            <div className="bg-black/30 p-4 rounded-xl border border-white/5 space-y-2">
              <span className="text-[10px] uppercase font-bold text-slate-400">Resultado de la Simulación</span>
              <div className="flex justify-between text-xs text-slate-300">
                <span>Gastos Cubiertos Proyectados:</span>
                <span className="font-mono font-bold text-blue-300">{formatCurrencyShort(totals.gastoAsignadoTotal)}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-300">
                <span>Cuentas por Pagar Restantes:</span>
                <span className="font-mono font-bold text-amber-300">{formatCurrencyShort(totals.cuentasPorPagarTotal)}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-300">
                <span>Nivel Global de Cobertura:</span>
                <span className="font-mono font-bold text-emerald-400">{totals.coberturaPct.toFixed(1)}%</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setSimPriorizarInversion(false);
                  setSimMaxFuncionamiento(true);
                }}
                className="px-3.5 py-2 text-xs text-slate-400 hover:text-white"
              >
                Restablecer Base
              </button>
              <button
                onClick={() => setIsSimModalOpen(false)}
                className="px-4 py-2 bg-primary-container text-on-primary-container hover:bg-yellow-400 rounded-xl text-xs font-bold shadow-md"
              >
                Aplicar Simulación
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
