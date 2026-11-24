import React from 'react';
import {
  FileCheck,
  CheckCircle,
  AlertTriangle,
  Award,
  ShieldCheck,
  Printer,
  TrendingUp,
  DollarSign,
  ArrowRight,
} from 'lucide-react';
import { InformeCajaResult } from '../../lib/cajaHoyEngine';

interface Props {
  data: InformeCajaResult;
  onNavigateTab: (tabId: string) => void;
}

const formatCOP = (val: number): string => {
  if (val === undefined || val === null || isNaN(val)) return '$ 0 COP';
  return `$ ${val.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} COP`;
};

const formatMillions = (val: number): string => {
  if (val === undefined || val === null || isNaN(val)) return '$ 0 M';
  const inM = val / 1e6;
  return `$ ${inM.toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} M`;
};

export const InformeCajaConclusionDirectiva: React.FC<Props> = ({ data, onNavigateTab }) => {
  const { conclusionVAFI, totalesFuentes } = data;

  return (
    <div className="space-y-6">
      {/* 1. Header con Dictamen Oficial */}
      <div className="bg-gradient-to-r from-emerald-950/60 via-surface-container-low/80 to-surface-container-low/50 border border-emerald-500/40 p-6 rounded-3xl backdrop-blur-xl space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-[#FFCC29] text-black">
              DICTAMEN DIRECTIVO VAFI
            </span>
            <span className="text-xs font-mono text-emerald-400 font-bold bg-emerald-500/20 px-3 py-1 rounded-full border border-emerald-500/40">
              CONFORMIDAD FINANCIERA TOTAL
            </span>
          </div>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/15 text-white font-mono text-xs rounded-xl border border-white/15 transition-all cursor-pointer"
          >
            <Printer size={14} />
            <span>Imprimir Conclusión Oficial</span>
          </button>
        </div>

        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
          Conclusión Financiera del Estado de Caja UPTC – Vigencia 2026
        </h2>
        <p className="text-xs sm:text-sm text-gray-300 leading-relaxed max-w-4xl">
          Respuestas técnicas y fundamentadas a las 7 preguntas estratégicas de la Alta Dirección, con base en los
          registros presupuestales de ingresos y gastos, estados bancarios y conciliaciones de tesorería al 23 de noviembre de 2026.
        </p>
      </div>

      {/* 2. Las 7 Preguntas Estratégicas */}
      <div className="space-y-4">
        {/* Pregunta 1 */}
        <div className="bg-surface-container-low/40 border border-white/10 p-5 rounded-3xl space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-[#FFCC29] text-black font-bold font-mono text-xs flex items-center justify-center">
              1
            </span>
            <h4 className="text-sm font-bold text-white">
              ¿Tiene la Universidad suficiente liquidez para cerrar la vigencia?
            </h4>
          </div>
          <div className="pl-8 space-y-2">
            <div className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20 w-fit">
              {conclusionVAFI.q1_suficienciaLiquidez.dictamen}
            </div>
            <p className="text-xs text-gray-300 leading-relaxed">
              {conclusionVAFI.q1_suficienciaLiquidez.detalle}
            </p>
          </div>
        </div>

        {/* Pregunta 2 */}
        <div className="bg-surface-container-low/40 border border-white/10 p-5 rounded-3xl space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-[#FFCC29] text-black font-bold font-mono text-xs flex items-center justify-center">
              2
            </span>
            <h4 className="text-sm font-bold text-white">
              ¿Qué parte del saldo en bancos está verdaderamente disponible?
            </h4>
          </div>
          <div className="pl-8 space-y-2">
            <p className="text-xs text-gray-300 leading-relaxed">
              {conclusionVAFI.q2_saldoVerdaderamenteDisponible.detalle}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 font-mono text-xs">
              <div className="bg-black/30 p-2.5 rounded-xl border border-white/5">
                <span className="text-[10px] text-gray-400 block">Saldo en Bancos:</span>
                <span className="font-bold text-sky-400">{formatMillions(conclusionVAFI.q2_saldoVerdaderamenteDisponible.saldoBancosTotal)}</span>
              </div>
              <div className="bg-black/30 p-2.5 rounded-xl border border-white/5">
                <span className="text-[10px] text-gray-400 block">Cuentas por Pagar:</span>
                <span className="font-bold text-rose-400">{formatMillions(conclusionVAFI.q2_saldoVerdaderamenteDisponible.cuentasPorPagar)}</span>
              </div>
              <div className="bg-black/30 p-2.5 rounded-xl border border-emerald-500/20">
                <span className="text-[10px] text-emerald-400 block">Libre Disponibilidad Real:</span>
                <span className="font-bold text-emerald-400">{formatMillions(conclusionVAFI.q2_saldoVerdaderamenteDisponible.disponibilidadRealNeta)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Pregunta 3 */}
        <div className="bg-surface-container-low/40 border border-rose-500/20 p-5 rounded-3xl space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-rose-500 text-white font-bold font-mono text-xs flex items-center justify-center">
              3
            </span>
            <h4 className="text-sm font-bold text-white">
              ¿Cuál es el riesgo de ejecutar presupuesto basado en apropiaciones y no en recaudo real?
            </h4>
          </div>
          <div className="pl-8 space-y-2">
            <div className="text-xs font-mono font-bold text-rose-400 bg-rose-500/10 px-3 py-1.5 rounded-xl border border-rose-500/20 w-fit">
              {conclusionVAFI.q3_riesgoApropiacionVsRecaudo.dictamen}
            </div>
            <p className="text-xs text-gray-300 leading-relaxed">
              {conclusionVAFI.q3_riesgoApropiacionVsRecaudo.detalle}
            </p>
          </div>
        </div>

        {/* Pregunta 4 */}
        <div className="bg-surface-container-low/40 border border-white/10 p-5 rounded-3xl space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-[#FFCC29] text-black font-bold font-mono text-xs flex items-center justify-center">
              4
            </span>
            <h4 className="text-sm font-bold text-white">
              ¿Cómo impactan los compromisos adquiridos la liquidez inmediata?
            </h4>
          </div>
          <div className="pl-8 space-y-2">
            <p className="text-xs text-gray-300 leading-relaxed">
              {conclusionVAFI.q4_impactoCompromisos.detalle}
            </p>
          </div>
        </div>

        {/* Pregunta 5 */}
        <div className="bg-surface-container-low/40 border border-white/10 p-5 rounded-3xl space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-[#FFCC29] text-black font-bold font-mono text-xs flex items-center justify-center">
              5
            </span>
            <h4 className="text-sm font-bold text-white">
              ¿Qué fuentes de financiación presentan superávit y cuáles déficit?
            </h4>
          </div>
          <div className="pl-8 space-y-2">
            <p className="text-xs text-gray-300 leading-relaxed">
              {conclusionVAFI.q5_fuentesSuperavitDeficit.analisis}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="bg-black/30 p-3 rounded-2xl border border-emerald-500/20">
                <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase block mb-1">
                  Fuentes con Alto Superávit de Caja:
                </span>
                <ul className="text-xs space-y-1">
                  {conclusionVAFI.q5_fuentesSuperavitDeficit.fuentesSuperavit.map((f) => (
                    <li key={f.codigo} className="flex justify-between text-gray-300">
                      <span>R{f.codigo} - {f.nombre.slice(0, 25)}</span>
                      <strong className="text-emerald-400 font-mono">+{formatMillions(f.superavit)}</strong>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-black/30 p-3 rounded-2xl border border-amber-500/20">
                <span className="text-[10px] font-mono text-amber-400 font-bold uppercase block mb-1">
                  Fuentes con Mayor Exigibilidad de Giros:
                </span>
                <p className="text-xs text-gray-300">
                  Convenios y contratos administrativos (Recursos 31, 33 y 34), los cuales exigen agilizar las actas de
                  recibido a satisfacción para evitar reintegros al Tesoro Nacional.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Pregunta 6 */}
        <div className="bg-surface-container-low/40 border border-white/10 p-5 rounded-3xl space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-[#FFCC29] text-black font-bold font-mono text-xs flex items-center justify-center">
              6
            </span>
            <h4 className="text-sm font-bold text-white">
              ¿Es sostenible el ritmo actual de gasto frente al recaudo efectivo?
            </h4>
          </div>
          <div className="pl-8 space-y-2">
            <p className="text-xs text-gray-300 leading-relaxed">
              {conclusionVAFI.q6_sostenibilidadRitmoGasto.detalle}
            </p>
          </div>
        </div>

        {/* Pregunta 7: Tres Decisiones Prioritarias */}
        <div className="bg-gradient-to-r from-amber-950/30 via-surface-container-low/40 to-surface-container-low/30 border border-amber-500/30 p-5 rounded-3xl space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-[#FFCC29] text-black font-bold font-mono text-xs flex items-center justify-center">
              7
            </span>
            <h4 className="text-sm font-bold text-white">
              ¿Cuáles son las tres decisiones financieras prioritarias que debe tomar la administración?
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pl-8 pt-2">
            {conclusionVAFI.q7_tresDecisionesPrioritarias.map((dec) => (
              <div
                key={dec.prioridad}
                className="bg-black/40 border border-white/10 p-4 rounded-2xl flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-amber-300 uppercase">
                    <span>Prioridad #{dec.prioridad}</span>
                    <span className="text-gray-400">{dec.plazo}</span>
                  </div>
                  <h5 className="text-xs font-bold text-white mt-1.5 leading-snug">{dec.titulo}</h5>
                  <p className="text-[11px] text-gray-300 mt-2 leading-relaxed">{dec.decision}</p>
                </div>

                <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[10px] font-mono">
                  <span className="text-gray-400">Impacto Estimado:</span>
                  <span className="font-bold text-[#FFCC29]">{formatMillions(dec.impactoCOP)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
