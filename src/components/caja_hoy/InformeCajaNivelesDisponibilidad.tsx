import React from 'react';
import {
  Wallet,
  ShieldCheck,
  AlertTriangle,
  Scale,
  CheckCircle,
  TrendingDown,
  Layers,
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

export const InformeCajaNivelesDisponibilidad: React.FC<Props> = ({ data, onNavigateTab }) => {
  const { totalesFuentes, nivelesLiquidez, resumenRecursos } = data;

  const pctCompromisosEnBancos = (totalesFuentes.saldoPorPagar / totalesFuentes.saldoBancos) * 100;
  const pctDestinacionEnBancos = (resumenRecursos.bancosDestinacionEspecifica / totalesFuentes.saldoBancos) * 100;
  const pctLibreEnBancos = (totalesFuentes.disponibilidadEfectiva / totalesFuentes.saldoBancos) * 100;

  return (
    <div className="space-y-6">
      {/* 1. Encabezado Explicativo */}
      <div className="bg-surface-container-low/50 border border-white/5 p-6 rounded-3xl space-y-2">
        <h3 className="text-base font-bold text-white font-mono uppercase tracking-tight flex items-center gap-2">
          <Wallet size={18} className="text-[#FFCC29]" />
          D. Análisis de Disponibilidad y Diferenciación de los 6 Niveles de Saldo
        </h3>
        <p className="text-xs sm:text-sm text-gray-300 max-w-4xl leading-relaxed">
          Para garantizar la disciplina fiscal y evitar decisiones erróneas de gasto, la administración universitaria
          debe distinguir de manera rigurosa entre el presupuesto asignado en papel y los fondos efectivamente disponibles
          en las cuentas bancarias de tesorería.
        </p>
      </div>

      {/* 2. Visualización de los 6 Niveles de Saldo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {nivelesLiquidez.map((item) => (
          <div
            key={item.nivel}
            className="bg-surface-container-low/40 border border-white/10 p-5 rounded-3xl flex flex-col justify-between hover:border-white/25 transition-all shadow-sm"
          >
            <div>
              <div className="flex items-center justify-between">
                <span
                  className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase"
                  style={{ backgroundColor: `${item.color}20`, color: item.color, border: `1px solid ${item.color}40` }}
                >
                  Nivel {item.nivel}: {item.naturaleza}
                </span>
                <span className="text-xs font-mono font-bold text-gray-400">
                  {item.porcentajeDelTotal.toFixed(1)}%
                </span>
              </div>
              <h4 className="text-sm font-bold text-white mt-3">{item.nombre}</h4>
              <p className="text-xs text-gray-400 mt-2 leading-relaxed">{item.descripcion}</p>
            </div>

            <div className="mt-5 pt-4 border-t border-white/5">
              <div className="text-xl font-black font-mono" style={{ color: item.color }}>
                {formatMillions(item.valor)}
              </div>
              <div className="text-[10px] font-mono text-gray-400 mt-0.5">
                {formatCOP(item.valor)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 3. Descomposición de la Caja Bancaria Total */}
      <div className="bg-surface-container-low/40 border border-white/5 p-6 rounded-3xl space-y-5">
        <div>
          <h3 className="text-sm font-bold text-white font-mono uppercase">
            Estructura de Absorción del Saldo Bancario ($ 144.563 M COP)
          </h3>
          <p className="text-xs text-on-surface-variant">
            ¿Qué parte del saldo en bancos está verdaderamente libre y qué parte está comprometida o restringida?
          </p>
        </div>

        {/* Barra de Distribución Porcentual */}
        <div className="space-y-2">
          <div className="h-6 w-full rounded-xl overflow-hidden flex bg-white/5 border border-white/10">
            <div
              style={{ width: `${pctCompromisosEnBancos}%` }}
              className="bg-rose-500 h-full flex items-center justify-center text-[10px] font-mono font-bold text-white"
              title={`Compromisos sin giro: ${pctCompromisosEnBancos.toFixed(1)}%`}
            >
              {pctCompromisosEnBancos.toFixed(1)}%
            </div>
            <div
              style={{ width: `${pctDestinacionEnBancos}%` }}
              className="bg-amber-500 h-full flex items-center justify-center text-[10px] font-mono font-bold text-black"
              title={`Destinación específica: ${pctDestinacionEnBancos.toFixed(1)}%`}
            >
              {pctDestinacionEnBancos.toFixed(1)}%
            </div>
            <div
              style={{ width: `${Math.max(5, 100 - pctCompromisosEnBancos - pctDestinacionEnBancos)}%` }}
              className="bg-emerald-500 h-full flex items-center justify-center text-[10px] font-mono font-bold text-black"
              title={`Disponibilidad libre: ${pctLibreEnBancos.toFixed(1)}%`}
            >
              {pctLibreEnBancos.toFixed(1)}%
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 text-xs font-mono pt-1">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-md bg-rose-500"></span>
              <span className="text-gray-300">Cuentas por Pagar (Compromisos Exigibles):</span>
              <strong className="text-rose-400">{formatMillions(totalesFuentes.saldoPorPagar)} ({pctCompromisosEnBancos.toFixed(1)}%)</strong>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-md bg-amber-500"></span>
              <span className="text-gray-300">Destinación Específica (Inversión / Estampillas):</span>
              <strong className="text-amber-400">{formatMillions(resumenRecursos.bancosDestinacionEspecifica)} ({pctDestinacionEnBancos.toFixed(1)}%)</strong>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-md bg-emerald-500"></span>
              <span className="text-gray-300">Libre Disponibilidad Operativa:</span>
              <strong className="text-emerald-400">{formatMillions(totalesFuentes.disponibilidadEfectiva)} ({pctLibreEnBancos.toFixed(1)}%)</strong>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Test de Estrés y Cobertura de Cuentas por Pagar */}
      <div className="bg-surface-container-low/40 border border-white/5 p-6 rounded-3xl space-y-4">
        <h3 className="text-sm font-bold text-white font-mono uppercase">
          Evaluación de Estrés y Capacidad de Cobertura de Cuentas por Pagar
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-black/30 border border-emerald-500/20 p-4 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase">Escenario Base Actual</span>
              <CheckCircle size={14} className="text-emerald-400" />
            </div>
            <div className="text-lg font-black text-white font-mono">
              2,35 veces cubierto
            </div>
            <p className="text-[11px] text-gray-300 leading-snug">
              Si hoy se cancelara el 100% de las obligaciones pendientes ($ 61.402 M), la tesorería conservaría{' '}
              <strong className="text-emerald-400 font-mono">{formatMillions(totalesFuentes.disponibilidadEfectiva)}</strong>{' '}
              en efectivo disponible.
            </p>
          </div>

          <div className="bg-black/30 border border-amber-500/20 p-4 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-amber-400 font-bold uppercase">Con Nómina de Diciembre</span>
              <AlertTriangle size={14} className="text-amber-400" />
            </div>
            <div className="text-lg font-black text-white font-mono">
              1,73 veces cubierto
            </div>
            <p className="text-[11px] text-gray-300 leading-snug">
              Pagando las cuentas por pagar actuales más la nómina proyectada de diciembre ($ 22.000 M), el saldo restante
              asciende a <strong className="text-[#FFCC29] font-mono">$ 61.161 M</strong>, manteniendo holgura total.
            </p>
          </div>

          <div className="bg-black/30 border border-sky-500/20 p-4 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-sky-400 font-bold uppercase">Cierre sin Recaudo Nuevo</span>
              <ShieldCheck size={14} className="text-sky-400" />
            </div>
            <div className="text-lg font-black text-white font-mono">
              Solvencia 100% Sin Deuda
            </div>
            <p className="text-[11px] text-gray-300 leading-snug">
              Incluso sin recibir un solo peso nuevo en diciembre, la Universidad tiene asegurado el cierre de la vigencia
              con caja positiva y sin necesidad de sobregiros bancarios.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
