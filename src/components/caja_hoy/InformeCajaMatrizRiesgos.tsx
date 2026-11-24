import React from 'react';
import {
  AlertTriangle,
  AlertCircle,
  ShieldCheck,
  CheckCircle,
  Info,
  ArrowRight,
  TrendingUp,
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

export const InformeCajaMatrizRiesgos: React.FC<Props> = ({ data, onNavigateTab }) => {
  const { riesgos } = data;

  const countCritica = riesgos.filter((r) => r.materialidad === 'CRÍTICA').length;
  const countAlta = riesgos.filter((r) => r.materialidad === 'ALTA').length;
  const countMedia = riesgos.filter((r) => r.materialidad === 'MEDIA').length;
  const countBaja = riesgos.filter((r) => r.materialidad === 'BAJA').length;

  return (
    <div className="space-y-6">
      {/* 1. Header con Contador de Materialidad */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-rose-500/10 border border-rose-500/30 p-4 rounded-2xl">
          <span className="text-[10px] font-mono text-rose-300 uppercase block">Materialidad Crítica</span>
          <div className="text-2xl font-black text-rose-400 mt-1">{countCritica} Riesgo</div>
          <div className="text-[10px] text-gray-400 font-mono mt-1">Espejismo Presupuestal ($ 45.125 M)</div>
        </div>

        <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-2xl">
          <span className="text-[10px] font-mono text-amber-300 uppercase block">Materialidad Alta</span>
          <div className="text-2xl font-black text-amber-400 mt-1">{countAlta} Riesgos</div>
          <div className="text-[10px] text-gray-400 font-mono mt-1">Concentración Nación & Cierre</div>
        </div>

        <div className="bg-sky-500/10 border border-sky-500/30 p-4 rounded-2xl">
          <span className="text-[10px] font-mono text-sky-300 uppercase block">Materialidad Media</span>
          <div className="text-2xl font-black text-sky-400 mt-1">{countMedia} Riesgo</div>
          <div className="text-[10px] text-gray-400 font-mono mt-1">Inversión inmovilizada</div>
        </div>

        <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-2xl">
          <span className="text-[10px] font-mono text-emerald-300 uppercase block">Materialidad Baja</span>
          <div className="text-2xl font-black text-emerald-400 mt-1">{countBaja} Riesgo</div>
          <div className="text-[10px] text-gray-400 font-mono mt-1">Rendimientos por legalizar</div>
        </div>
      </div>

      {/* 2. Matriz Detallada de Riesgos */}
      <div className="space-y-4">
        {riesgos.map((r) => {
          const isCritica = r.materialidad === 'CRÍTICA';
          const isAlta = r.materialidad === 'ALTA';
          const isMedia = r.materialidad === 'MEDIA';

          return (
            <div
              key={r.id}
              className={`border p-6 rounded-3xl backdrop-blur-xl transition-all ${
                isCritica
                  ? 'bg-rose-950/20 border-rose-500/40 shadow-[0_0_20px_rgba(244,63,94,0.08)]'
                  : isAlta
                  ? 'bg-amber-950/20 border-amber-500/30'
                  : isMedia
                  ? 'bg-sky-950/20 border-sky-500/30'
                  : 'bg-surface-container-low/40 border-white/10'
              }`}
            >
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span
                    className={`px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase ${
                      isCritica
                        ? 'bg-rose-500 text-white'
                        : isAlta
                        ? 'bg-amber-500 text-black'
                        : isMedia
                        ? 'bg-sky-500 text-white'
                        : 'bg-emerald-500 text-black'
                    }`}
                  >
                    Riesgo #{r.numero} | {r.materialidad}
                  </span>
                  <h4 className="text-base font-bold text-white tracking-tight">{r.titulo}</h4>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-mono text-gray-400 uppercase block">Valor Involucrado:</span>
                  <span
                    className={`text-lg font-black font-mono ${
                      isCritica ? 'text-rose-400' : isAlta ? 'text-amber-400' : 'text-sky-400'
                    }`}
                  >
                    {formatMillions(r.valorInvolucrado)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-white/5 text-xs">
                <div>
                  <span className="text-[10px] font-mono text-gray-400 uppercase block">Fuente Oficial:</span>
                  <p className="text-gray-300 mt-1">{r.fuenteInformacion}</p>
                </div>

                <div>
                  <span className="text-[10px] font-mono text-rose-300 uppercase block">Efecto sobre Liquidez:</span>
                  <p className="text-gray-300 mt-1 leading-relaxed">{r.efectoSobreLiquidez}</p>
                </div>

                <div>
                  <span className="text-[10px] font-mono text-emerald-300 uppercase block">Estrategia de Mitigación:</span>
                  <p className="text-emerald-400 mt-1 leading-relaxed">{r.estrategiaMitigacion}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
