import React, { useState, useMemo } from 'react';
import {
  Activity,
  Download,
  Search,
  CheckCircle,
  AlertTriangle,
  Info,
  Scale,
  Award,
} from 'lucide-react';
import { InformeCajaIndicadorItem, InformeCajaResult } from '../../lib/cajaHoyEngine';

interface Props {
  data: InformeCajaResult;
  onExportCSV: () => void;
}

const formatCOP = (val: number): string => {
  if (val === undefined || val === null || isNaN(val)) return '$ 0 COP';
  return `$ ${val.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} COP`;
};

export const InformeCajaIndicadoresSostenibilidad: React.FC<Props> = ({ data, onExportCSV }) => {
  const { indicadores } = data;
  const [searchTerm, setSearchTerm] = useState('');

  const filteredIndicadores = useMemo(() => {
    return indicadores.filter(
      (ind) =>
        ind.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ind.formula.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ind.interpretacion.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [indicadores, searchTerm]);

  return (
    <div className="space-y-6">
      {/* 1. Header con Controles */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-surface-container-low/50 border border-white/5 p-6 rounded-3xl">
        <div>
          <h3 className="text-base font-bold text-white font-mono uppercase tracking-tight flex items-center gap-2">
            <Activity size={18} className="text-[#FFCC29]" />
            F. Indicadores Oficiales de Liquidez y Sostenibilidad Financiera
          </h3>
          <p className="text-xs text-on-surface-variant mt-1">
            Fórmulas matemáticas formales, valores de auditoría, interpretación directa y relevancia institucional
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={14} />
            <input
              type="text"
              placeholder="Buscar indicador..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#FFCC29]"
            />
          </div>

          <button
            onClick={onExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-[#FFCC29] hover:bg-[#FFCC29]/90 text-black font-mono font-bold text-xs rounded-xl transition-all cursor-pointer shadow-sm active:scale-95 flex-shrink-0"
          >
            <Download size={14} />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* 2. Grid de los 9 Indicadores */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredIndicadores.map((ind) => (
          <div
            key={ind.id}
            className={`border p-5 rounded-3xl flex flex-col justify-between transition-all bg-surface-container-low/40 ${
              ind.semaforo === 'OPTIMO'
                ? 'border-emerald-500/30 hover:border-emerald-500/50'
                : ind.semaforo === 'ALERTA'
                ? 'border-amber-500/30 hover:border-amber-500/50'
                : 'border-rose-500/30 hover:border-rose-500/50'
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white/5 text-gray-300 border border-white/10">
                  Indicador #{ind.numero}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase flex items-center gap-1 ${
                    ind.semaforo === 'OPTIMO'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : ind.semaforo === 'ALERTA'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  }`}
                >
                  {ind.semaforo === 'OPTIMO' ? <CheckCircle size={10} /> : <AlertTriangle size={10} />}
                  {ind.semaforo}
                </span>
              </div>

              <h4 className="text-sm font-bold text-white mt-3 leading-snug">{ind.nombre}</h4>

              {/* Fórmula */}
              <div className="bg-black/50 border border-white/5 p-2.5 rounded-xl mt-3 font-mono text-xs">
                <span className="text-[10px] text-gray-400 block uppercase font-sans">Fórmula Matemática:</span>
                <span className="text-[#FFCC29] font-bold">{ind.formula}</span>
              </div>

              {/* Componentes */}
              <div className="mt-3 space-y-1 text-[11px] font-mono">
                <div className="flex items-center justify-between text-gray-400">
                  <span className="truncate max-w-[170px]" title={ind.numeradorDesc}>{ind.numeradorDesc}:</span>
                  <span className="text-white font-bold">{formatCOP(ind.numeradorValor)}</span>
                </div>
                <div className="flex items-center justify-between text-gray-400">
                  <span className="truncate max-w-[170px]" title={ind.denominadorDesc}>{ind.denominadorDesc}:</span>
                  <span className="text-white font-bold">{formatCOP(ind.denominadorValor)}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-white/5 space-y-3">
              {/* Resultado */}
              <div>
                <span className="text-[10px] font-mono text-gray-400 uppercase">Resultado Calculado:</span>
                <div
                  className={`text-2xl font-black font-mono tracking-tight ${
                    ind.semaforo === 'OPTIMO'
                      ? 'text-emerald-400'
                      : ind.semaforo === 'ALERTA'
                      ? 'text-amber-400'
                      : 'text-rose-400'
                  }`}
                >
                  {ind.resultadoFormateado}
                </div>
              </div>

              {/* Interpretación */}
              <div className="text-[11px] text-gray-300 leading-snug">
                <strong className="text-white">Interpretación: </strong>
                {ind.interpretacion}
              </div>

              {/* Relevancia */}
              <div className="text-[10px] text-gray-400 leading-tight bg-white/5 p-2 rounded-xl border border-white/5">
                <span className="text-gray-300 font-semibold block">Relevancia Financiera:</span>
                {ind.relevancia}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
