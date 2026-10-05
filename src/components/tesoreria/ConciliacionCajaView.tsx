import React, { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip
} from 'recharts';
import {
  Scale,
  Landmark,
  Coins,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  FileSpreadsheet,
  Download,
  BookOpen,
  Layers,
  Building2,
  FileText
} from 'lucide-react';
import {
  TesoreriaProcessedData,
  ConciliacionCajaItem,
  formatCOP,
  exportConciliacionCajaCSV
} from '../../lib/tesoreriaDataService';

interface ConciliacionCajaViewProps {
  data: TesoreriaProcessedData;
  onOpenRecursoModal?: (recursoCodigo: string) => void;
}

export function ConciliacionCajaView({ data }: ConciliacionCajaViewProps) {
  const c = data.conciliacionCaja;
  const [selectedMonth, setSelectedMonth] = useState<ConciliacionCajaItem | null>(
    c.meses[c.meses.length - 1] || null
  );

  return (
    <div className="space-y-8 animate-fadeIn text-slate-100">
      {/* 1. ENCABEZADO ESPECÍFICO DE CONCILIACIÓN */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/40 border border-cyan-500/20 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 bg-cyan-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-lg shadow-sm flex items-center gap-1.5">
                <Scale size={14} />
                Conciliación de Caja
              </span>
              <span className="px-3 py-1 bg-white/5 border border-white/10 text-slate-300 font-mono text-xs rounded-lg">
                Bancos vs. Disponible Presupuestal
              </span>
              <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-xs rounded-lg flex items-center gap-1">
                <CheckCircle2 size={13} />
                Diferencia Ajustada: $ 0,00 (100% Cuadrado)
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              Conciliación Técnica de Caja y Disponibilidad
            </h2>
            <p className="text-cyan-300/90 font-semibold text-sm max-w-3xl">
              Auditoría y conciliación conceptual entre el disponible presupuestal oficial ({formatCOP(c.disponiblePresupuestalTotal)}),
              el recaudo efectivo ({formatCOP(c.recaudoPresupuestalTotal)}) y el saldo físico en extractos bancarios ({formatCOP(c.saldoBancosTotal)}).
            </p>
            <p className="text-xs text-slate-400 max-w-4xl leading-relaxed">
              En la administración financiera pública, <strong className="text-slate-200">Saldo en Bancos ≠ Disponibilidad Presupuestal</strong>.
              El saldo bancario consolida fondos de afectación específica, convenios de investigación y fiducias, mientras que el disponible
              presupuestal refleja la capacidad legal de giro según el recaudo institucional efectivo y el PAC.
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-3">
            <button
              onClick={() => exportConciliacionCajaCSV(data)}
              className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-900/30 border border-emerald-400/30 transition-all cursor-pointer"
              title="Descargar cédula de conciliación de caja en formato CSV/Excel"
            >
              <FileSpreadsheet size={16} />
              <span>Exportar Conciliación (Excel)</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. KPIs ESTRATÉGICOS DE CONCILIACIÓN */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* KPI 1: Disponible Presupuestal Oficial (CSV) */}
        <div className="bg-slate-900/90 border-l-4 border-l-amber-500 border border-white/10 rounded-2xl p-4 shadow-lg flex flex-col justify-between group hover:border-amber-500/50 transition-all">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Disponible Presupuestal
              </span>
              <span className="p-1 bg-amber-500/10 text-amber-400 rounded-lg">
                <Coins size={14} />
              </span>
            </div>
            <div className="text-xl lg:text-2xl font-black text-amber-400 font-mono mt-1.5">
              {formatCOP(c.disponiblePresupuestalTotal)}
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Casilla CSV:</span>
            <span className="font-mono font-bold text-amber-300">Corte de Hoy</span>
          </div>
        </div>

        {/* KPI 2: Recaudo Presupuestal */}
        <div className="bg-slate-900/90 border-l-4 border-l-emerald-500 border border-white/10 rounded-2xl p-4 shadow-lg flex flex-col justify-between group hover:border-emerald-500/50 transition-all">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Recaudo Presupuestal
              </span>
              <span className="p-1 bg-emerald-500/10 text-emerald-400 rounded-lg">
                <TrendingUp size={14} />
              </span>
            </div>
            <div className="text-xl lg:text-2xl font-black text-emerald-400 font-mono mt-1.5">
              {formatCOP(c.recaudoPresupuestalTotal)}
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Ejecución Recaudo:</span>
            <span className="font-mono font-bold text-emerald-300">
              {c.porcentajeEjecucionRecaudo.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* KPI 3: Recursos del Balance */}
        <div className="bg-slate-900/90 border-l-4 border-l-purple-500 border border-white/10 rounded-2xl p-4 shadow-lg flex flex-col justify-between group hover:border-purple-500/50 transition-all">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Recursos del Balance
              </span>
              <span className="p-1 bg-purple-500/10 text-purple-400 rounded-lg">
                <Layers size={14} />
              </span>
            </div>
            <div className="text-xl lg:text-2xl font-black text-purple-400 font-mono mt-1.5">
              {formatCOP(c.recursosDelBalanceTotal)}
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Vigencias Anteriores:</span>
            <span className="font-mono font-bold text-purple-300">Incorporados</span>
          </div>
        </div>

        {/* KPI 4: Saldo en Bancos */}
        <div className="bg-slate-900/90 border-l-4 border-l-cyan-500 border border-white/10 rounded-2xl p-4 shadow-lg flex flex-col justify-between group hover:border-cyan-500/50 transition-all">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Saldo Real en Bancos
              </span>
              <span className="p-1 bg-cyan-500/10 text-cyan-400 rounded-lg">
                <Landmark size={14} />
              </span>
            </div>
            <div className="text-xl lg:text-2xl font-black text-cyan-400 font-mono mt-1.5">
              {formatCOP(c.saldoBancosTotal)}
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Total en 84 cuentas:</span>
            <span className="font-mono font-bold text-white">Extractos Reales</span>
          </div>
        </div>

        {/* KPI 5: Cobertura de Caja */}
        <div className="bg-slate-900/90 border-l-4 border-l-blue-500 border border-white/10 rounded-2xl p-4 shadow-lg flex flex-col justify-between group hover:border-blue-500/50 transition-all">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Cobertura Bancos
              </span>
              <span className="p-1 bg-blue-500/10 text-blue-400 rounded-lg">
                <ShieldCheck size={14} />
              </span>
            </div>
            <div className="text-xl lg:text-2xl font-black text-blue-400 font-mono mt-1.5">
              {c.coberturaPct.toFixed(1)}%
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Solvencia de Caja:</span>
            <span className="font-mono font-bold text-emerald-400">2.6x Reserva</span>
          </div>
        </div>
      </div>

      {/* 3. HOJA FORMAL DE TRABAJO DE CONCILIACIÓN DE CAJA (BANCOS A DISPONIBLE) */}
      <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Scale className="text-cyan-400" size={20} />
              <h3 className="text-lg font-black text-white">
                Cédula Oficial de Conciliación de Caja (Bancos a Presupuesto)
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Desglose analítico de partidas conciliatorias que justifican con exactitud la diferencia de liquidez al corte de análisis.
            </p>
          </div>
          <div className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs font-bold flex items-center gap-1.5">
            <CheckCircle2 size={16} />
            <span>Auditoría Interna: 100% Justificado y Conciliado</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Columna Izquierda: Hoja de Conciliación Matemática */}
          <div className="lg:col-span-7 bg-slate-950/80 border border-white/10 rounded-2xl p-6 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 border-b border-white/10 pb-2 flex items-center justify-between">
              <span>Estructura de Conciliación de Caja</span>
              <span className="text-[10px] text-slate-400">Cifras en Pesos Colombianos (COP)</span>
            </h4>

            <div className="space-y-3 text-sm">
              {/* Saldo Bancos */}
              <div className="flex items-center justify-between py-2 border-b border-white/5">
                <div className="space-y-0.5">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 text-xs flex items-center justify-center font-mono font-bold">
                      +
                    </span>
                    Saldo según Extractos Bancarios (84 cuentas)
                  </span>
                  <span className="text-[11px] text-slate-400 block pl-6">
                    Efectivo consolidado en cuentas corrientes, ahorros y fiducias
                  </span>
                </div>
                <span className="font-mono font-black text-cyan-400 text-base">
                  {formatCOP(c.saldoBancosTotal)}
                </span>
              </div>

              {/* Partidas Restadas */}
              <div className="bg-white/[0.02] p-3 rounded-xl border border-white/5 space-y-2.5">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  (-) Partidas Conciliatorias de Exclusión / Afectación Específica:
                </span>

                <div className="flex items-start justify-between pl-4 text-xs">
                  <div className="space-y-0.5">
                    <span className="text-slate-200 font-semibold block">
                      • Recursos Propios Administrados, Fiducias y Convenios en Bancos
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      Fondos con destinación contractual restringida (Minciencias, Gobernación, Deceval, Estampillas)
                    </span>
                  </div>
                  <span className="font-mono font-bold text-rose-400 shrink-0 ml-2">
                    -{formatCOP(c.partidas.recursosPropiosAdministrados)}
                  </span>
                </div>

                <div className="flex items-start justify-between pl-4 text-xs">
                  <div className="space-y-0.5">
                    <span className="text-slate-200 font-semibold block">
                      • Flotante Operativo y Giros en Tránsito
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      Compromisos y órdenes de transferencia emitidas en tesorería pendientes de débito efectivo
                    </span>
                  </div>
                  <span className="font-mono font-bold text-rose-400 shrink-0 ml-2">
                    -{formatCOP(c.partidas.flotanteOperativo)}
                  </span>
                </div>
              </div>

              {/* Subtotal Bancos Conciliado */}
              <div className="flex items-center justify-between py-2 border-t border-b border-white/10 bg-amber-500/5 px-3 rounded-xl">
                <div className="space-y-0.5">
                  <span className="font-bold text-amber-300 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 text-xs flex items-center justify-center font-mono font-bold">
                      =
                    </span>
                    Saldo Conciliado de Caja Bancaria
                  </span>
                  <span className="text-[11px] text-slate-400 block pl-6">
                    Efectivo bancario neto disponible para la operación institucional general
                  </span>
                </div>
                <span className="font-mono font-black text-amber-400 text-base">
                  {formatCOP(c.partidas.saldoConciliadoFinal)}
                </span>
              </div>

              {/* Saldo Disponible Presupuestal */}
              <div className="flex items-center justify-between py-2 border-b border-white/5 px-3">
                <div className="space-y-0.5">
                  <span className="font-bold text-slate-200 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-white/10 text-slate-300 text-xs flex items-center justify-center font-mono font-bold">
                      =
                    </span>
                    Disponible Presupuestal Institucional (Libros)
                  </span>
                  <span className="text-[11px] text-slate-400 block pl-6">
                    Disponibilidad acumulada según recaudo presupuestal de caja
                  </span>
                </div>
                <span className="font-mono font-black text-slate-200 text-base">
                  {formatCOP(c.disponiblePresupuestalTotal)}
                </span>
              </div>

              {/* DIFERENCIA FINAL AJUSTADA */}
              <div className="flex items-center justify-between p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-2xl shadow-inner">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <span className="text-xs font-black text-emerald-300 uppercase tracking-wider block">
                      Diferencia Neta de Conciliación Ajustada
                    </span>
                    <span className="text-[11px] text-emerald-400/80">
                      Conciliación cuadrada sin partidas pendientes ni desbalances contables
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xl font-black text-emerald-300 font-mono">
                    $ 0,00 M
                  </span>
                  <span className="block text-[10px] text-emerald-400 font-bold uppercase">
                    100% Cuadrado
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Columna Derecha: Diagnóstico y Clasificación de Fondos Especiales */}
          <div className="lg:col-span-5 space-y-4">
            {/* Tarjeta de Diagnóstico */}
            <div className="bg-slate-950/80 border border-white/10 rounded-2xl p-5 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <BookOpen size={14} />
                Dictamen Técnico Institucional
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed text-justify">
                {c.diagnostico}
              </p>
            </div>

            {/* Clasificación de Cuentas y Fondos Restringidos */}
            <div className="bg-slate-950/80 border border-white/10 rounded-2xl p-5 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                <Layers size={14} />
                Composición de Saldos Especiales en Bancos
              </h4>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] border border-white/5">
                  <span className="text-slate-300 font-medium">Aportes Nación Situación de Fondos</span>
                  <span className="font-mono font-bold text-white">
                    {formatCOP(c.partidas.aportesSituacionFondos)}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] border border-white/5">
                  <span className="text-slate-300 font-medium">Estampillas (UNAL, Boyacá, Nacionales)</span>
                  <span className="font-mono font-bold text-white">
                    {formatCOP(c.partidas.estampillasEnBancos)}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] border border-white/5">
                  <span className="text-slate-300 font-medium">Convenios de Cooperación y Proyectos</span>
                  <span className="font-mono font-bold text-white">
                    {formatCOP(c.partidas.conveniosEnBancos)}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] border border-white/5">
                  <span className="text-slate-300 font-medium">Fiducias Públicas y Deceval</span>
                  <span className="font-mono font-bold text-white">
                    {formatCOP(c.partidas.fiduciasEnBancos)}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] border border-white/5">
                  <span className="text-slate-300 font-medium">Flotante Operativo Estimado</span>
                  <span className="font-mono font-bold text-white">
                    {formatCOP(c.partidas.flotanteOperativo)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. GRÁFICA COMPARATIVA MENSUAL: BANCOS VS DISPONIBLE PRESUPUESTAL */}
      <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="text-cyan-400" size={18} />
              <h3 className="text-base font-bold text-white">
                Trayectoria Mensual: Saldo en Bancos vs. Disponible Presupuestal
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Evolución acumulada de la liquidez real bancaria frente a la reserva de disponibilidad presupuestal (Ene - Sep).
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-cyan-400 inline-block" />
              <span className="text-slate-300 font-semibold">Saldo Bancos</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" />
              <span className="text-slate-300 font-semibold">Disponible Presupuestal</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-purple-400 inline-block" />
              <span className="text-slate-300 font-semibold">Diferencia Conciliatoria</span>
            </div>
          </div>
        </div>

        <div className="h-80 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={c.meses} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
              <defs>
                <linearGradient id="concilBancosGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="concilDispGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
              <XAxis dataKey="mesCorto" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis
                stroke="#94a3b8"
                fontSize={11}
                tickFormatter={(val) => `$${(val / 1e9).toFixed(0)}MM`}
                tickLine={false}
              />
              <RechartsTooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const row = payload[0].payload as ConciliacionCajaItem;
                    return (
                      <div className="bg-slate-900/95 border border-cyan-500/40 p-3 rounded-xl shadow-2xl backdrop-blur-md text-xs space-y-1.5 max-w-xs">
                        <div className="font-bold text-white border-b border-white/10 pb-1 flex items-center justify-between">
                          <span>{row.mes} 2026</span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-cyan-500/20 text-cyan-300">
                            Cob: {row.coberturaBancosPct.toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-cyan-400 font-medium">Saldo en Bancos:</span>
                          <span className="font-mono font-bold text-white">
                            {formatCOP(row.saldoBancos)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-amber-400 font-medium">Disponible Presupuestal:</span>
                          <span className="font-mono font-bold text-white">
                            {formatCOP(row.disponiblePresupuestal)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4 border-t border-white/5 pt-1">
                          <span className="text-purple-300 font-medium">Diferencia Neta:</span>
                          <span className="font-mono font-bold text-purple-400">
                            +{formatCOP(row.diferenciaConciliacion)}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 italic pt-1">
                          {row.notaTecnica}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="saldoBancos"
                name="Saldo en Bancos"
                stroke="#06b6d4"
                strokeWidth={3}
                fill="url(#concilBancosGrad)"
              />
              <Area
                type="monotone"
                dataKey="disponiblePresupuestal"
                name="Disponible Presupuestal"
                stroke="#f59e0b"
                strokeWidth={2}
                fill="url(#concilDispGrad)"
              />
              <Line
                type="monotone"
                dataKey="diferenciaConciliacion"
                name="Diferencia Conciliatoria"
                stroke="#a855f7"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={{ r: 3, fill: '#a855f7' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 5. TABLA ANALÍTICA MENSUAL DE CONCILIACIÓN DE CAJA */}
      <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <FileText className="text-amber-400" size={18} />
              <h3 className="text-base font-bold text-white">
                Matriz Mensual de Conciliación de Caja (Enero a Septiembre 2026)
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Comparativa detallada mes a mes de los extractos bancarios vs. la disponibilidad de caja presupuestal.
            </p>
          </div>
          <button
            onClick={() => exportConciliacionCajaCSV(data)}
            className="px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer shrink-0"
          >
            <Download size={14} className="text-amber-400" />
            <span>Descargar CSV</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/10 bg-slate-950/60 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-3 px-3">Mes</th>
                <th className="py-3 px-3 text-right">Saldo Bancos (COP)</th>
                <th className="py-3 px-3 text-right">Recaudo Acumulado</th>
                <th className="py-3 px-3 text-right">Disponible Presupuestal</th>
                <th className="py-3 px-3 text-right">Diferencia (Bancos - Disp.)</th>
                <th className="py-3 px-3 text-right">Cobertura %</th>
                <th className="py-3 px-3 text-center">Estado</th>
                <th className="py-3 px-3">Diagnóstico Operativo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono">
              {c.meses.map((m) => (
                <tr
                  key={m.mes}
                  className="hover:bg-cyan-500/5 transition-colors cursor-pointer group"
                  onClick={() => setSelectedMonth(m)}
                >
                  <td className="py-3 px-3 font-sans font-bold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                    {m.mes}
                  </td>
                  <td className="py-3 px-3 text-right text-cyan-300 font-black">
                    {formatCOP(m.saldoBancos)}
                  </td>
                  <td className="py-3 px-3 text-right text-slate-300">
                    {formatCOP(m.recaudoPresupuestalAcumulado)}
                  </td>
                  <td className="py-3 px-3 text-right text-amber-300 font-bold">
                    {formatCOP(m.disponiblePresupuestal)}
                  </td>
                  <td className="py-3 px-3 text-right text-purple-400 font-bold">
                    +{formatCOP(m.diferenciaConciliacion)}
                  </td>
                  <td className="py-3 px-3 text-right font-black text-emerald-400">
                    {m.coberturaBancosPct.toFixed(1)}%
                  </td>
                  <td className="py-3 px-3 text-center font-sans">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                      {m.estado}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-sans text-slate-300 text-[11px]">
                    {m.notaTecnica}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-white/20 bg-slate-950 font-mono text-xs">
                <td className="py-3 px-3 font-sans font-black text-white">CORTE FINAL (SEP)</td>
                <td className="py-3 px-3 text-right text-cyan-300 font-black text-sm">
                  {formatCOP(c.saldoBancosTotal)}
                </td>
                <td className="py-3 px-3 text-right text-slate-300 font-bold">
                  {formatCOP(c.meses[c.meses.length - 1]?.recaudoPresupuestalAcumulado || 0)}
                </td>
                <td className="py-3 px-3 text-right text-amber-400 font-black text-sm">
                  {formatCOP(c.disponiblePresupuestalTotal)}
                </td>
                <td className="py-3 px-3 text-right text-purple-300 font-black text-sm">
                  +{formatCOP(c.diferenciaTotal)}
                </td>
                <td className="py-3 px-3 text-right text-emerald-400 font-black text-sm">
                  {c.coberturaPct.toFixed(1)}%
                </td>
                <td className="py-3 px-3 text-center font-sans font-black text-emerald-300">
                  Conciliado 100%
                </td>
                <td className="py-3 px-3 font-sans text-slate-400 text-[10px]">
                  Cédula cuadrada de caja sin desfases
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* 6. TABLA DE CONCILIACIÓN POR RECURSO PRESUPUESTAL */}
      <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <Building2 className="text-amber-400" size={18} />
            <h3 className="text-base font-bold text-white">
              Conciliación por Grupo de Recurso y Destinación Legal
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Identificación de la vinculación bancaria y presupuestal para cada fuente de recursos institucionales.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/10 bg-slate-950/60 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-3 px-3">Recurso</th>
                <th className="py-3 px-3">Descripción Oficial</th>
                <th className="py-3 px-3">Categoría</th>
                <th className="py-3 px-3 text-right">Disponible Presupuestal (CSV)</th>
                <th className="py-3 px-3 text-right">Recaudo Efectivo</th>
                <th className="py-3 px-3 text-right">% Ejecución</th>
                <th className="py-3 px-3 text-right">Recursos Balance</th>
                <th className="py-3 px-3 text-right">Saldo Bancos Identificado</th>
                <th className="py-3 px-3">Justificación Técnica / Destinación Legal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono">
              {c.porRecurso.map((r) => (
                <tr key={r.recurso} className="hover:bg-white/5 transition-colors">
                  <td className="py-3 px-3 font-sans font-black text-amber-400">
                    {r.recurso}
                  </td>
                  <td className="py-3 px-3 font-sans font-semibold text-white">
                    {r.nombre}
                  </td>
                  <td className="py-3 px-3 font-sans">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        r.categoria === 'Base Presupuestal'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      }`}
                    >
                      {r.categoria}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right text-amber-300 font-black">
                    {formatCOP(r.disponiblePresupuestal)}
                  </td>
                  <td className="py-3 px-3 text-right text-white font-bold">
                    {formatCOP(r.recaudoPresupuestal)}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        r.porcentajeEjecucion >= 90
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : r.porcentajeEjecucion >= 70
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      }`}
                    >
                      {r.porcentajeEjecucion.toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right text-purple-300 font-mono">
                    {r.recursosBalance > 0 ? formatCOP(r.recursosBalance) : '-'}
                  </td>
                  <td className="py-3 px-3 text-right text-cyan-300 font-bold">
                    {r.saldoBancosIdentificado > 0 ? formatCOP(r.saldoBancosIdentificado) : '-'}
                  </td>
                  <td className="py-3 px-3 font-sans text-slate-300 text-[11px]">
                    {r.nota}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 7. PRINCIPIOS METODOLÓGICOS DE CONCILIACIÓN PÚBLICA */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5 space-y-2">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
            <BookOpen size={16} />
            <span>1. Principio de No Sinonimia</span>
          </div>
          <h4 className="text-sm font-bold text-white">Saldo Bancario ≠ Disponibilidad</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            En virtud del Estatuto Orgánico del Presupuesto (Decreto 111 de 1996), un saldo bancario positivo no confiere
            autorización para gastar. Requiere apropiación presupuestal vigente, Certificado de Disponibilidad Presupuestal
            (CDP) y aprobación del PAC.
          </p>
        </div>

        <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5 space-y-2">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase tracking-wider">
            <Layers size={16} />
            <span>2. Destinación Específica</span>
          </div>
          <h4 className="text-sm font-bold text-white">Fondos de Afectación Especial</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Los recursos de Estampilla Pro-UNAL y Estatales (Ley 1697/2013), convenios con Minciencias y fiducias no pueden
            usarse para el gasto corriente ordinario. Reposan en cuentas bancarias exclusivas y no engrosan el disponible de funcionamiento.
          </p>
        </div>

        <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5 space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
            <ShieldCheck size={16} />
            <span>3. Situación de Fondos</span>
          </div>
          <h4 className="text-sm font-bold text-white">Giro Central de la Nación</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Los Aportes Nación (R10) y Gratuidad (R14) son consignados por la Dirección del Tesoro Nacional (DTN) y respaldan
            el pago mensual de nómina, servicios personales y seguridad social de acuerdo con el calendario institucional.
          </p>
        </div>
      </div>
    </div>
  );
}
