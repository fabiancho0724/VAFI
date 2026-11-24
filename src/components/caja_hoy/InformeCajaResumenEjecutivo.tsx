import React from 'react';
import {
  Award,
  Landmark,
  Wallet,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  AlertTriangle,
  Scale,
  DollarSign,
  ArrowRight,
  CheckCircle,
  FileText,
  Percent,
  Activity,
  Layers,
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

export const InformeCajaResumenEjecutivo: React.FC<Props> = ({ data, onNavigateTab }) => {
  const { totalesFuentes, resumenRecursos, conclusionVAFI, nivelesLiquidez } = data;

  return (
    <div className="space-y-6">
      {/* 1. BANNER DE DICTAMEN DIRECTIVO VAFI */}
      <div className="bg-gradient-to-r from-emerald-950/50 via-surface-container-low/60 to-surface-container-low/40 border border-emerald-500/30 p-6 rounded-3xl backdrop-blur-xl relative overflow-hidden shadow-[0_0_30px_rgba(16,185,129,0.1)]">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-2 max-w-4xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-[11px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1.5 shadow-sm">
                <ShieldCheck size={14} className="text-emerald-400" />
                DICTAMEN DE LIQUIDEZ: SOLVENTE Y SOSTENIBLE (COBERTURA 2,35x)
              </span>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold bg-white/5 text-gray-300 border border-white/10">
                CORTE OFICIAL: 23 DE NOVIEMBRE DE 2026
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <Award className="text-[#FFCC29]" size={24} />
              Diagnóstico General: Posición de Tesorería Robusta y Superavitaria
            </h2>
            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
              La Universidad Pedagógica y Tecnológica de Colombia (UPTC) cuenta con un saldo bancario consolidado de{' '}
              <strong className="text-emerald-400 font-mono font-bold">{formatMillions(totalesFuentes.saldoBancos)}</strong>{' '}
              para amparar obligaciones causadas por{' '}
              <strong className="text-amber-300 font-mono font-bold">{formatMillions(totalesFuentes.saldoPorPagar)}</strong>,
              garantizando una cobertura inmediata de{' '}
              <strong className="text-white font-mono font-bold">2,35 veces (235,43%)</strong> y una disponibilidad neta libre de{' '}
              <strong className="text-emerald-400 font-mono font-bold">{formatMillions(totalesFuentes.disponibilidadEfectiva)}</strong>.
              El flujo neto acumulado del año asciende a{' '}
              <strong className="text-[#FFCC29] font-mono font-bold">+{formatMillions(totalesFuentes.totalRecaudo - totalesFuentes.pagos)}</strong>.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col gap-2 w-full md:w-auto flex-shrink-0">
            <button
              onClick={() => onNavigateTab('conclusion')}
              className="px-4 py-2.5 bg-[#FFCC29] hover:bg-[#FFCC29]/90 text-black font-mono font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <span>Ver Dictamen VAFI</span>
              <ArrowRight size={14} />
            </button>
            <button
              onClick={() => onNavigateTab('indicadores')}
              className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white font-mono font-semibold text-xs rounded-xl flex items-center justify-center gap-2 border border-white/15 transition-all cursor-pointer"
            >
              <Activity size={14} />
              <span>9 Indicadores Oficiales</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. LOS 10 INDICADORES CLAVE DEL RESUMEN EJECUTIVO DE CAJA */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
            <Landmark size={16} className="text-[#FFCC29]" />
            10 Indicadores Clave de Liquidez, Disponibilidad y Ejecución
          </h3>
          <span className="text-[11px] font-mono text-on-surface-variant">Valores Oficiales al Centavo</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* 1. Saldo Bancos */}
          <div className="bg-surface-container-low/50 border border-sky-500/20 p-4 rounded-2xl relative overflow-hidden">
            <div className="flex items-center justify-between text-on-surface-variant text-[11px] font-mono uppercase">
              <span>1. Saldo Bancos</span>
              <Landmark size={14} className="text-sky-400" />
            </div>
            <div className="text-xl font-black text-white font-mono mt-1">
              {formatMillions(totalesFuentes.saldoBancos)}
            </div>
            <div className="text-[10px] text-gray-400 font-mono mt-1">
              {formatCOP(totalesFuentes.saldoBancos)}
            </div>
            <div className="mt-2 text-[10px] text-sky-400 font-medium">
              85 cuentas bancarias conciliadas
            </div>
          </div>

          {/* 2. Saldo por Pagar */}
          <div className="bg-surface-container-low/50 border border-rose-500/20 p-4 rounded-2xl relative overflow-hidden">
            <div className="flex items-center justify-between text-on-surface-variant text-[11px] font-mono uppercase">
              <span>2. Cuentas por Pagar</span>
              <AlertTriangle size={14} className="text-rose-400" />
            </div>
            <div className="text-xl font-black text-rose-400 font-mono mt-1">
              {formatMillions(totalesFuentes.saldoPorPagar)}
            </div>
            <div className="text-[10px] text-gray-400 font-mono mt-1">
              {formatCOP(totalesFuentes.saldoPorPagar)}
            </div>
            <div className="mt-2 text-[10px] text-rose-300 font-medium">
              Compromisos sin giro ({((totalesFuentes.saldoPorPagar / totalesFuentes.saldoBancos) * 100).toFixed(1)}% de bancos)
            </div>
          </div>

          {/* 3. Disponibilidad Efectiva Neta */}
          <div className="bg-surface-container-low/50 border border-emerald-500/30 p-4 rounded-2xl relative overflow-hidden shadow-[0_0_15px_rgba(16,185,129,0.08)]">
            <div className="flex items-center justify-between text-on-surface-variant text-[11px] font-mono uppercase">
              <span>3. Disponibilidad Neta</span>
              <Wallet size={14} className="text-emerald-400" />
            </div>
            <div className="text-xl font-black text-emerald-400 font-mono mt-1">
              {formatMillions(totalesFuentes.disponibilidadEfectiva)}
            </div>
            <div className="text-[10px] text-gray-400 font-mono mt-1">
              {formatCOP(totalesFuentes.disponibilidadEfectiva)}
            </div>
            <div className="mt-2 text-[10px] text-emerald-300 font-medium">
              Excedente libre tras atender obligaciones
            </div>
          </div>

          {/* 4. Cobertura de Obligaciones */}
          <div className="bg-surface-container-low/50 border border-[#FFCC29]/30 p-4 rounded-2xl relative overflow-hidden">
            <div className="flex items-center justify-between text-on-surface-variant text-[11px] font-mono uppercase">
              <span>4. Cobertura Global</span>
              <ShieldCheck size={14} className="text-[#FFCC29]" />
            </div>
            <div className="text-xl font-black text-[#FFCC29] font-mono mt-1">
              {(totalesFuentes.coberturaGlobal / 100).toFixed(2)}x
            </div>
            <div className="text-[10px] text-gray-400 font-mono mt-1">
              {totalesFuentes.coberturaGlobal.toFixed(2)}% de solvencia
            </div>
            <div className="mt-2 text-[10px] text-emerald-400 font-medium">
              Óptimo (&gt; 1,5x normativo)
            </div>
          </div>

          {/* 5. Total Recaudo Acumulado */}
          <div className="bg-surface-container-low/50 border border-white/10 p-4 rounded-2xl relative overflow-hidden">
            <div className="flex items-center justify-between text-on-surface-variant text-[11px] font-mono uppercase">
              <span>5. Recaudo Acumulado</span>
              <TrendingUp size={14} className="text-emerald-400" />
            </div>
            <div className="text-xl font-black text-white font-mono mt-1">
              {formatMillions(totalesFuentes.totalRecaudo)}
            </div>
            <div className="text-[10px] text-gray-400 font-mono mt-1">
              {totalesFuentes.porcentajeRecaudoGlobal.toFixed(2)}% del aforo
            </div>
            <div className="mt-2 text-[10px] text-emerald-400 font-medium">
              Cumplimiento institucional alto
            </div>
          </div>

          {/* 6. Total Pagos Efectivos */}
          <div className="bg-surface-container-low/50 border border-white/10 p-4 rounded-2xl relative overflow-hidden">
            <div className="flex items-center justify-between text-on-surface-variant text-[11px] font-mono uppercase">
              <span>6. Pagos Efectivos</span>
              <TrendingDown size={14} className="text-rose-400" />
            </div>
            <div className="text-xl font-black text-white font-mono mt-1">
              {formatMillions(totalesFuentes.pagos)}
            </div>
            <div className="text-[10px] text-gray-400 font-mono mt-1">
              {totalesFuentes.porcentajeGiroGlobal.toFixed(2)}% del aforo girado
            </div>
            <div className="mt-2 text-[10px] text-gray-300 font-medium">
              86,29% de compromisos pagados
            </div>
          </div>

          {/* 7. Flujo Neto Acumulado */}
          <div className="bg-surface-container-low/50 border border-emerald-500/20 p-4 rounded-2xl relative overflow-hidden">
            <div className="flex items-center justify-between text-on-surface-variant text-[11px] font-mono uppercase">
              <span>7. Flujo Neto Caja</span>
              <DollarSign size={14} className="text-emerald-400" />
            </div>
            <div className="text-xl font-black text-emerald-400 font-mono mt-1">
              +{formatMillions(totalesFuentes.totalRecaudo - totalesFuentes.pagos)}
            </div>
            <div className="text-[10px] text-gray-400 font-mono mt-1">
              Recaudo menos Pagos Ene-Nov
            </div>
            <div className="mt-2 text-[10px] text-emerald-300 font-medium">
              Generación de liquidez positiva
            </div>
          </div>

          {/* 8. Destinación Específica */}
          <div className="bg-surface-container-low/50 border border-amber-500/20 p-4 rounded-2xl relative overflow-hidden">
            <div className="flex items-center justify-between text-on-surface-variant text-[11px] font-mono uppercase">
              <span>8. Dest. Específica</span>
              <Layers size={14} className="text-amber-400" />
            </div>
            <div className="text-xl font-black text-amber-400 font-mono mt-1">
              {formatMillions(resumenRecursos.bancosDestinacionEspecifica)}
            </div>
            <div className="text-[10px] text-gray-400 font-mono mt-1">
              {resumenRecursos.porcentajeEspecifica.toFixed(2)}% del saldo bancario
            </div>
            <div className="mt-2 text-[10px] text-amber-300 font-medium">
              Inversión, estampillas y convenios
            </div>
          </div>

          {/* 9. Espejismo Presupuestal */}
          <div className="bg-surface-container-low/50 border border-fuchsia-500/20 p-4 rounded-2xl relative overflow-hidden">
            <div className="flex items-center justify-between text-on-surface-variant text-[11px] font-mono uppercase">
              <span>9. Espejismo Presup.</span>
              <Scale size={14} className="text-fuchsia-400" />
            </div>
            <div className="text-xl font-black text-fuchsia-400 font-mono mt-1">
              {formatMillions(Math.abs(totalesFuentes.disponibilidadPresupuestal - totalesFuentes.disponibilidadEfectiva))}
            </div>
            <div className="text-[10px] text-gray-400 font-mono mt-1">
              Aprop. Disponible vs Caja Libre
            </div>
            <div className="mt-2 text-[10px] text-fuchsia-300 font-medium">
              Brecha no financiada en bancos
            </div>
          </div>

          {/* 10. Rendimientos Financieros */}
          <div className="bg-surface-container-low/50 border border-white/10 p-4 rounded-2xl relative overflow-hidden">
            <div className="flex items-center justify-between text-on-surface-variant text-[11px] font-mono uppercase">
              <span>10. Rendimientos</span>
              <Percent size={14} className="text-[#FFCC29]" />
            </div>
            <div className="text-xl font-black text-white font-mono mt-1">
              {formatMillions(totalesFuentes.rendimientosFinancieros)}
            </div>
            <div className="text-[10px] text-gray-400 font-mono mt-1">
              Intereses percibidos en bancos
            </div>
            <div className="mt-2 text-[10px] text-gray-300 font-medium">
              Rentas de tesorería institucional
            </div>
          </div>
        </div>
      </div>

      {/* 3. ESTRUCTURA DE LOS 6 NIVELES DE LIQUIDEZ INSTITUCIONAL */}
      <div className="bg-surface-container-low/40 border border-white/5 p-6 rounded-3xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
              <Layers size={16} className="text-[#FFCC29]" />
              Estructura Jerárquica de los 6 Niveles de Saldo y Liquidez
            </h3>
            <p className="text-xs text-on-surface-variant">
              Diferenciación técnica estricta entre el presupuesto en papel, los extractos bancarios y el efectivo disponible
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('disponibilidad')}
            className="text-xs font-mono text-[#FFCC29] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Ver Análisis Detallado (Módulo D)</span>
            <ArrowRight size={13} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
          {nivelesLiquidez.map((item) => (
            <div
              key={item.nivel}
              className="bg-black/30 border border-white/10 p-4 rounded-2xl flex flex-col justify-between hover:border-white/20 transition-all"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: `${item.color}20`, color: item.color, border: `1px solid ${item.color}40` }}
                  >
                    Nivel {item.nivel}: {item.naturaleza}
                  </span>
                  <span className="text-[11px] font-mono text-gray-400">
                    {item.porcentajeDelTotal.toFixed(1)}%
                  </span>
                </div>
                <h4 className="text-xs font-bold text-white mt-2 leading-snug">{item.nombre}</h4>
                <p className="text-[11px] text-gray-400 mt-1">{item.descripcion}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-white/5 flex items-baseline justify-between">
                <span className="text-base font-black font-mono" style={{ color: item.color }}>
                  {formatMillions(item.valor)}
                </span>
                <span className="text-[10px] font-mono text-gray-400">
                  {formatCOP(item.valor)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. MATRIZ DE ACCESOS RÁPIDOS A MÓDULOS TEMÁTICOS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => onNavigateTab('fuentes')}
          className="bg-surface-container-low/40 hover:bg-surface-container-low/70 border border-white/5 hover:border-[#FFCC29]/30 p-4 rounded-2xl text-left transition-all group cursor-pointer"
        >
          <div className="text-[10px] font-mono text-on-surface-variant group-hover:text-[#FFCC29] uppercase">Módulo B</div>
          <div className="text-xs font-bold text-white mt-1">Composición por Fuentes (R10 a R40)</div>
          <div className="text-[10px] text-gray-400 mt-1">Desglose de los 22 recursos y rendimientos</div>
        </button>

        <button
          onClick={() => onNavigateTab('mensual')}
          className="bg-surface-container-low/40 hover:bg-surface-container-low/70 border border-white/5 hover:border-[#FFCC29]/30 p-4 rounded-2xl text-left transition-all group cursor-pointer"
        >
          <div className="text-[10px] font-mono text-on-surface-variant group-hover:text-[#FFCC29] uppercase">Módulo C</div>
          <div className="text-xs font-bold text-white mt-1">Comportamiento Mensual & Flujo</div>
          <div className="text-[10px] text-gray-400 mt-1">Evolución de recaudo, giros y estacionalidad</div>
        </button>

        <button
          onClick={() => onNavigateTab('conciliacion')}
          className="bg-surface-container-low/40 hover:bg-surface-container-low/70 border border-white/5 hover:border-[#FFCC29]/30 p-4 rounded-2xl text-left transition-all group cursor-pointer"
        >
          <div className="text-[10px] font-mono text-on-surface-variant group-hover:text-[#FFCC29] uppercase">Módulo E</div>
          <div className="text-xs font-bold text-white mt-1">Conciliación Presupuesto vs Tesorería</div>
          <div className="text-[10px] text-gray-400 mt-1">Matrices de cruce y los 4 escenarios A/B/C/D</div>
        </button>

        <button
          onClick={() => onNavigateTab('conclusion')}
          className="bg-surface-container-low/40 hover:bg-surface-container-low/70 border border-white/5 hover:border-[#FFCC29]/30 p-4 rounded-2xl text-left transition-all group cursor-pointer"
        >
          <div className="text-[10px] font-mono text-on-surface-variant group-hover:text-[#FFCC29] uppercase">Módulo H</div>
          <div className="text-xs font-bold text-white mt-1">Conclusión Directiva VAFI</div>
          <div className="text-[10px] text-gray-400 mt-1">Respuestas a las 7 preguntas estratégicas</div>
        </button>
      </div>
    </div>
  );
};
