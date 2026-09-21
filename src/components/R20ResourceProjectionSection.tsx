import React, { useState, useEffect, useMemo } from 'react';
import { 
  ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip as RechartsTooltip, Legend, BarChart, Bar, Cell 
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Calculator, BarChart3, Layers, Download, 
  RefreshCw, SlidersHorizontal, Sparkles, AlertTriangle, CheckCircle2, 
  Info, Building2, Table, Filter, ArrowUpRight, Scale, ChevronDown, ChevronUp 
} from 'lucide-react';
import { 
  R20Record, R20ForecastModelResult, R20ConceptForecast, 
  fetchAndParseR20, loadFallbackRecords, filterR20Data, runAllR20Models, 
  computeBottomUpConceptForecast, formatCurrencyCOP, formatCurrencyShortCOP, 
  exportProjectionCSV 
} from '../lib/r20ProjectionEngine';

export function R20ResourceProjectionSection() {
  const [records, setRecords] = useState<R20Record[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [selectedWindow, setSelectedWindow] = useState<'post-gratuidad' | 'all' | 'ultimos-5'>('post-gratuidad');
  const [selectedUnidad, setSelectedUnidad] = useState('Todas');
  const [selectedConcepto, setSelectedConcepto] = useState('Todos');
  const [selectedModelFilter, setSelectedModelFilter] = useState('all');
  const [showParamControls, setShowParamControls] = useState(false);

  // Parámetros de calibración
  const [ipcTarget, setIpcTarget] = useState(7.0);
  const [effortRate, setEffortRate] = useState(1.0);
  const [alpha, setAlpha] = useState(0.5);
  const [beta, setBeta] = useState(0.3);

  // Sub-vista
  const [activeSubTab, setActiveSubTab] = useState<'modelos' | 'conceptos' | 'unidades'>('modelos');

  // Carga inicial de datos
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);
      const data = await fetchAndParseR20();
      if (isMounted) {
        setRecords(data.length > 0 ? data : loadFallbackRecords());
        setLoading(false);
      }
    }
    loadData();
    return () => { isMounted = false; };
  }, []);

  // Filtrado y agregación de series temporales
  const { years, values, filteredRecords, allUnidades, allConceptos } = useMemo(() => {
    return filterR20Data(records, {
      unidad: selectedUnidad,
      concepto: selectedConcepto,
      window: selectedWindow
    });
  }, [records, selectedUnidad, selectedConcepto, selectedWindow]);

  // Ejecución de todos los modelos matemáticos
  const models = useMemo(() => {
    if (values.length < 2) return [];
    return runAllR20Models(years, values, { alpha, beta, ipcTarget, effortRate });
  }, [years, values, alpha, beta, ipcTarget, effortRate]);

  // Modelo óptimo recomendado (menor MAPE y R2 más alto)
  const bestModel = useMemo(() => {
    if (!models || models.length === 0) return null;
    // Si el usuario seleccionó un modelo específico
    if (selectedModelFilter !== 'all') {
      const found = models.find(m => m.modelId === selectedModelFilter);
      if (found) return found;
    }
    // Por defecto sugerir el modelo Macro MFMP o Holt
    const macroModel = models.find(m => m.modelId === 'macro');
    if (macroModel) return macroModel;
    return models[0];
  }, [models, selectedModelFilter]);

  // Desglose Bottom-Up por conceptos
  const bottomUpData = useMemo(() => {
    return computeBottomUpConceptForecast(filteredRecords, selectedWindow);
  }, [filteredRecords, selectedWindow]);

  // Desglose por Unidad
  const unitBreakdown = useMemo(() => {
    const unitMap = new Map<string, { rec2026: number; proj2027: number }>();
    const lastYear = years[years.length - 1] || 2026;

    for (const r of filteredRecords) {
      if (!unitMap.has(r.unidad)) {
        unitMap.set(r.unidad, { rec2026: 0, proj2027: 0 });
      }
      const item = unitMap.get(r.unidad)!;
      if (r.vigencia === lastYear) {
        item.rec2026 += r.totalRecaudo;
      }
    }

    const growth = bestModel ? (1 + bestModel.variationPct / 100) : 1.07;
    const list: { unidad: string; rec2026: number; proj2027: number; participacion: number }[] = [];
    let totProj = 0;

    for (const [u, vals] of unitMap.entries()) {
      const proj = vals.rec2026 * growth;
      totProj += proj;
      list.push({
        unidad: u,
        rec2026: vals.rec2026,
        proj2027: proj,
        participacion: 0
      });
    }

    list.sort((a, b) => b.proj2027 - a.proj2027);
    for (const l of list) {
      l.participacion = totProj > 0 ? (l.proj2027 / totProj) * 100 : 0;
    }

    return list;
  }, [filteredRecords, years, bestModel]);

  // Generación de puntos para la gráfica Recharts
  const chartSeries = useMemo(() => {
    if (!models || models.length === 0 || years.length === 0) return [];

    const lastIdx = years.length - 1;
    const lastYear = years[lastIdx];
    const lastVal = values[lastIdx];

    // Puntos históricos
    const series = years.map((y, idx) => {
      const isAnchor = idx === lastIdx;
      return {
        year: `${y}`,
        numericYear: y,
        real: values[idx],
        isProjection: false,
        // Conectar el punto de anclaje 2026 a cada modelo
        macro: isAnchor ? lastVal : null,
        holt: isAnchor ? lastVal : null,
        log: isAnchor ? lastVal : null,
        poly2: isAnchor ? lastVal : null,
        wma: isAnchor ? lastVal : null,
        ols: isAnchor ? lastVal : null,
        cagr: isAnchor ? lastVal : null,
        bandaMin: isAnchor ? lastVal : null,
        bandaMax: isAnchor ? lastVal : null
      };
    });

    // Model values en 2027
    const macroVal = models.find(m => m.modelId === 'macro')?.projected2027 ?? null;
    const holtVal = models.find(m => m.modelId === 'holt')?.projected2027 ?? null;
    const logVal = models.find(m => m.modelId === 'log')?.projected2027 ?? null;
    const poly2Val = models.find(m => m.modelId === 'poly2')?.projected2027 ?? null;
    const wmaVal = models.find(m => m.modelId === 'wma')?.projected2027 ?? null;
    const olsVal = models.find(m => m.modelId === 'ols')?.projected2027 ?? null;
    const cagrVal = models.find(m => m.modelId === 'cagr')?.projected2027 ?? null;

    const allProjs = [macroVal, holtVal, logVal, poly2Val, wmaVal, olsVal, cagrVal].filter((v): v is number => v !== null && v > 0);
    const minProj = allProjs.length > 0 ? Math.min(...allProjs) : lastVal;
    const maxProj = allProjs.length > 0 ? Math.max(...allProjs) : lastVal;

    // Punto 2027 Proyectado
    series.push({
      year: '2027 (Proy)',
      numericYear: 2027,
      real: null as any,
      isProjection: true,
      macro: macroVal,
      holt: holtVal,
      log: logVal,
      poly2: poly2Val,
      wma: wmaVal,
      ols: olsVal,
      cagr: cagrVal,
      bandaMin: minProj,
      bandaMax: maxProj
    });

    return series;
  }, [years, values, models]);

  // Manejo de exportación
  const handleExport = () => {
    const windowLabel = selectedWindow === 'post-gratuidad'
      ? 'Post-Gratuidad (2021-2026)'
      : selectedWindow === 'ultimos-5'
      ? 'Ultimos 5 Anos (2022-2026)'
      : '10 Anos Completos (2016-2026)';
    exportProjectionCSV(models, bottomUpData.concepts, windowLabel);
  };

  // Custom Tooltip para la gráfica
  const CustomChartTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0]?.payload;
    if (!data) return null;

    return (
      <div className="bg-slate-900/95 border border-white/20 p-4 rounded-xl shadow-2xl backdrop-blur-md text-xs min-w-[260px]">
        <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
          <span className="font-bold text-white text-sm font-display">Vigencia {label}</span>
          {data.isProjection && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
              Proyección 2027
            </span>
          )}
        </div>

        {data.real !== null && (
          <div className="flex justify-between items-center py-1 font-mono">
            <span className="text-sky-300 font-semibold">Recaudo Real:</span>
            <span className="font-bold text-white">{formatCurrencyCOP(data.real)}</span>
          </div>
        )}

        {data.isProjection && (
          <div className="space-y-1.5 pt-1">
            <p className="text-[10px] uppercase tracking-wider text-on-surface-variant font-semibold">
              Modelos Proyectados 2027:
            </p>
            {data.macro !== null && (
              <div className="flex justify-between items-center">
                <span className="text-amber-400 font-medium">Macro MFMP (7%):</span>
                <span className="font-mono font-bold text-white">{formatCurrencyShortCOP(data.macro)}</span>
              </div>
            )}
            {data.holt !== null && (
              <div className="flex justify-between items-center">
                <span className="text-emerald-400 font-medium">Holt Suavizado:</span>
                <span className="font-mono font-bold text-white">{formatCurrencyShortCOP(data.holt)}</span>
              </div>
            )}
            {data.log !== null && (
              <div className="flex justify-between items-center">
                <span className="text-teal-400 font-medium">Logarítmica:</span>
                <span className="font-mono font-bold text-white">{formatCurrencyShortCOP(data.log)}</span>
              </div>
            )}
            {data.poly2 !== null && (
              <div className="flex justify-between items-center">
                <span className="text-purple-400 font-medium">Cuadrática (Poly2):</span>
                <span className="font-mono font-bold text-white">{formatCurrencyShortCOP(data.poly2)}</span>
              </div>
            )}
            {data.wma !== null && (
              <div className="flex justify-between items-center">
                <span className="text-yellow-400 font-medium">Promedio Móvil (WMA):</span>
                <span className="font-mono font-bold text-white">{formatCurrencyShortCOP(data.wma)}</span>
              </div>
            )}
            {data.cagr !== null && (
              <div className="flex justify-between items-center">
                <span className="text-pink-400 font-medium">Tasa CAGR:</span>
                <span className="font-mono font-bold text-white">{formatCurrencyShortCOP(data.cagr)}</span>
              </div>
            )}
            {data.ols !== null && (
              <div className="flex justify-between items-center">
                <span className="text-blue-400 font-medium">Lineal OLS:</span>
                <span className="font-mono font-bold text-white">{formatCurrencyShortCOP(data.ols)}</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const lastYearValue = values[values.length - 1] || 0;
  const prevYearValue = values[values.length - 2] || 0;

  return (
    <div className="space-y-6 fade-in">
      {/* HEADER INSTITUCIONAL DEL APARTADO */}
      <div className="bg-gradient-to-br from-surface-container-high/90 to-background border border-amber-500/30 rounded-[32px] p-6 md:p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-amber-500/10 blur-[100px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-primary-container/10 blur-[100px] rounded-full pointer-events-none"></div>

        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-white/10">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0 border border-amber-500/30 shadow-lg">
                <Calculator size={28} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-bold bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                    Histórico 10 Años (2016–2026) • Recurso 20 Propios
                  </span>
                  <span className="text-[11px] font-mono text-on-surface-variant">
                    187 Registros de Recaudación
                  </span>
                </div>
                <h2 className="text-2xl md:text-3xl font-display text-white font-bold tracking-tight mt-1">
                  Proyección de Recursos Propios 2027
                </h2>
                <p className="text-on-surface-variant font-sans text-xs md:text-sm mt-1 max-w-3xl leading-relaxed">
                  Modelación matemática predictiva multimodelo con análisis de sensibilidad institucional. Permite calibrar la ventana temporal para aislar el cambio regulatorio de la Política de Gratuidad en Matrículas (Ley 2307 de 2023) y proyectar escenarios de recaudo para la vigencia 2027.
                </p>
              </div>
            </div>

            {/* Acciones de Cabecera */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold border border-white/10 transition-all shadow-md active:scale-95"
                title="Descargar matriz de proyecciones en CSV"
              >
                <Download size={16} className="text-amber-400" />
                <span>Exportar CSV</span>
              </button>

              <button
                onClick={async () => {
                  setLoading(true);
                  const data = await fetchAndParseR20();
                  setRecords(data);
                  setLoading(false);
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition-all shadow-md active:scale-95"
                title="Recargar base histórica"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                <span>Recargar Base</span>
              </button>
            </div>
          </div>

          {/* BARRA DE FILTROS Y VENTANA TEMPORAL */}
          <div className="mt-6 flex flex-col md:flex-row flex-wrap items-start md:items-center justify-between gap-4">
            {/* Selector de Ventana Histórica */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={14} className="text-amber-400" /> Ventana de Calibración:
              </span>
              <div className="inline-flex rounded-xl bg-black/40 p-1 border border-white/10">
                <button
                  onClick={() => setSelectedWindow('post-gratuidad')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    selectedWindow === 'post-gratuidad'
                      ? 'bg-amber-500 text-black font-bold shadow'
                      : 'text-on-surface-variant hover:text-white'
                  }`}
                  title="Calibra sobre 2021-2026, aislando el choque estructural de gratuidad"
                >
                  ⭐ Post-Gratuidad (2021–2026)
                </button>
                <button
                  onClick={() => setSelectedWindow('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    selectedWindow === 'all'
                      ? 'bg-amber-500 text-black font-bold shadow'
                      : 'text-on-surface-variant hover:text-white'
                  }`}
                  title="Serie completa de 10 años (2016-2026)"
                >
                  10 Años Completos (2016–2026)
                </button>
                <button
                  onClick={() => setSelectedWindow('ultimos-5')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    selectedWindow === 'ultimos-5'
                      ? 'bg-amber-500 text-black font-bold shadow'
                      : 'text-on-surface-variant hover:text-white'
                  }`}
                  title="Últimos 5 años (2022-2026)"
                >
                  Últimos 5 Años (2022–2026)
                </button>
              </div>
            </div>

            {/* Filtros de Unidad y Concepto */}
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              {/* Filtro Unidad */}
              <div className="flex items-center gap-2 bg-black/30 px-3 py-1.5 rounded-xl border border-white/10 text-xs">
                <Building2 size={14} className="text-primary-container shrink-0" />
                <span className="text-on-surface-variant">Unidad:</span>
                <select
                  value={selectedUnidad}
                  onChange={(e) => setSelectedUnidad(e.target.value)}
                  className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer max-w-[180px] truncate"
                >
                  <option value="Todas" className="bg-slate-900 text-white">Todas las Unidades (14)</option>
                  {allUnidades.map(u => (
                    <option key={u} value={u} className="bg-slate-900 text-white">{u}</option>
                  ))}
                </select>
              </div>

              {/* Filtro Concepto */}
              <div className="flex items-center gap-2 bg-black/30 px-3 py-1.5 rounded-xl border border-white/10 text-xs">
                <Filter size={14} className="text-amber-400 shrink-0" />
                <span className="text-on-surface-variant">Concepto:</span>
                <select
                  value={selectedConcepto}
                  onChange={(e) => setSelectedConcepto(e.target.value)}
                  className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer max-w-[180px] truncate"
                >
                  <option value="Todos" className="bg-slate-900 text-white">Todos los Conceptos (34)</option>
                  {allConceptos.map(c => (
                    <option key={c} value={c} className="bg-slate-900 text-white">{c}</option>
                  ))}
                </select>
              </div>

              {/* Botón de Parámetros */}
              <button
                onClick={() => setShowParamControls(!showParamControls)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                  showParamControls
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-black/30 text-on-surface-variant border-white/10 hover:text-white'
                }`}
              >
                <SlidersHorizontal size={14} />
                <span>Calibrar Supuestos</span>
                {showParamControls ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>
          </div>

          {/* PANEL EXPANDIBLE DE CALIBRACIÓN DE SUPUESTOS */}
          {showParamControls && (
            <div className="mt-5 p-4 rounded-2xl bg-black/40 border border-white/10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in">
              <div>
                <label className="text-[11px] font-semibold text-amber-300 block mb-1">
                  IPC Proyectado 2027: <span className="font-mono font-bold text-white">{ipcTarget.toFixed(1)}%</span>
                </label>
                <input
                  type="range"
                  min={3.0}
                  max={12.0}
                  step={0.1}
                  value={ipcTarget}
                  onChange={(e) => setIpcTarget(parseFloat(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
                <span className="text-[10px] text-on-surface-variant block mt-0.5">Meta oficial MFMP: 7,0%</span>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-emerald-300 block mb-1">
                  Esfuerzo Recaudo Propio: <span className="font-mono font-bold text-white">{effortRate.toFixed(1)}%</span>
                </label>
                <input
                  type="range"
                  min={0.0}
                  max={5.0}
                  step={0.5}
                  value={effortRate}
                  onChange={(e) => setEffortRate(parseFloat(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
                <span className="text-[10px] text-on-surface-variant block mt-0.5">Meta de gestión VAFI</span>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-sky-300 block mb-1">
                  Holt Nivel (α): <span className="font-mono font-bold text-white">{alpha.toFixed(2)}</span>
                </label>
                <input
                  type="range"
                  min={0.1}
                  max={0.9}
                  step={0.05}
                  value={alpha}
                  onChange={(e) => setAlpha(parseFloat(e.target.value))}
                  className="w-full accent-sky-500 cursor-pointer"
                />
                <span className="text-[10px] text-on-surface-variant block mt-0.5">Ponderación del nivel</span>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-purple-300 block mb-1">
                  Holt Tendencia (β): <span className="font-mono font-bold text-white">{beta.toFixed(2)}</span>
                </label>
                <input
                  type="range"
                  min={0.1}
                  max={0.9}
                  step={0.05}
                  value={beta}
                  onChange={(e) => setBeta(parseFloat(e.target.value))}
                  className="w-full accent-purple-500 cursor-pointer"
                />
                <span className="text-[10px] text-on-surface-variant block mt-0.5">Sensibilidad de pendiente</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* TARJETAS KPI DE PROYECCIÓN 2027 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Proyección Central */}
        <div className="glass-card p-5 rounded-2xl border border-amber-500/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-xl pointer-events-none"></div>
          <span className="text-xs font-mono uppercase tracking-wider text-amber-400 block mb-1">
            Proyección Central 2027 (R20)
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-display font-bold text-white tracking-tight">
              {bestModel ? formatCurrencyShortCOP(bestModel.projected2027) : '$0'}
            </span>
            {bestModel && (
              <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md ${
                bestModel.variationPct >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
              }`}>
                {bestModel.variationPct >= 0 ? '+' : ''}{bestModel.variationPct.toFixed(1)}% vs 2026
              </span>
            )}
          </div>
          <p className="text-[11px] font-mono text-on-surface-variant mt-2 truncate">
            {bestModel ? formatCurrencyCOP(bestModel.projected2027) : '$0 COP'}
          </p>
        </div>

        {/* KPI 2: Modelo Seleccionado */}
        <div className="glass-card p-5 rounded-2xl border border-white/10 relative overflow-hidden">
          <span className="text-xs font-mono uppercase tracking-wider text-on-surface-variant block mb-1">
            Modelo de Referencia Activo
          </span>
          <div className="text-lg font-bold text-white mt-1 truncate">
            {bestModel ? bestModel.shortName : 'Calculando...'}
          </div>
          <div className="flex items-center gap-3 mt-2 font-mono text-xs">
            <span className="text-emerald-400 font-semibold">
              R²: {bestModel ? `${bestModel.r2.toFixed(1)}%` : '0%'}
            </span>
            <span className="text-on-surface-variant">•</span>
            <span className="text-sky-400 font-semibold">
              MAPE: {bestModel ? `${bestModel.mape.toFixed(1)}%` : '0%'}
            </span>
          </div>
        </div>

        {/* KPI 3: Base 2026 vs 2025 */}
        <div className="glass-card p-5 rounded-2xl border border-white/10 relative overflow-hidden">
          <span className="text-xs font-mono uppercase tracking-wider text-on-surface-variant block mb-1">
            Recaudo Base 2026 (Corte Actual)
          </span>
          <div className="text-2xl font-display font-bold text-white mt-1">
            {formatCurrencyShortCOP(lastYearValue)}
          </div>
          <p className="text-[11px] text-on-surface-variant mt-2">
            Vigencia 2025: <strong className="text-white font-mono">{formatCurrencyShortCOP(prevYearValue)}</strong>
          </p>
        </div>

        {/* KPI 4: Banda de Incertidumbre */}
        <div className="glass-card p-5 rounded-2xl border border-white/10 relative overflow-hidden">
          <span className="text-xs font-mono uppercase tracking-wider text-on-surface-variant block mb-1">
            Banda de Incertidumbre (95%)
          </span>
          <div className="text-lg font-display font-bold text-white mt-1 truncate">
            {bestModel ? `${formatCurrencyShortCOP(bestModel.lowerBound95)} – ${formatCurrencyShortCOP(bestModel.upperBound95)}` : '$0'}
          </div>
          <p className="text-[11px] text-on-surface-variant mt-2 font-mono">
            Amplitud: {bestModel ? formatCurrencyShortCOP(bestModel.upperBound95 - bestModel.lowerBound95) : '$0'}
          </p>
        </div>
      </div>

      {/* NAVEGACIÓN SECUNDARIA DEL APARTADO (Pestañas internas) */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2">
        <button
          onClick={() => setActiveSubTab('modelos')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'modelos'
              ? 'bg-amber-500 text-black shadow'
              : 'text-on-surface-variant hover:text-white hover:bg-white/5'
          }`}
        >
          <BarChart3 size={15} />
          <span>Comparativa de Modelos y Curvas</span>
        </button>

        <button
          onClick={() => setActiveSubTab('conceptos')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'conceptos'
              ? 'bg-amber-500 text-black shadow'
              : 'text-on-surface-variant hover:text-white hover:bg-white/5'
          }`}
        >
          <Layers size={15} />
          <span>Desglose Bottom-Up por Concepto</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-black/20 font-bold">
            {bottomUpData.concepts.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('unidades')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'unidades'
              ? 'bg-amber-500 text-black shadow'
              : 'text-on-surface-variant hover:text-white hover:bg-white/5'
          }`}
        >
          <Building2 size={15} />
          <span>Distribución por Facultad / Sede</span>
        </button>
      </div>

      {/* VISTA 1: COMPARATIVA DE MODELOS MATEMÁTICOS & GRÁFICA */}
      {activeSubTab === 'modelos' && (
        <div className="space-y-6">
          {/* Gráfico Recharts */}
          <div className="glass-card p-6 md:p-8 rounded-[28px]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h3 className="text-xl font-display text-white font-bold flex items-center gap-2">
                  <TrendingUp size={20} className="text-amber-400" />
                  Curva Histórica y Trayectorias Proyectadas a 2027
                </h3>
                <p className="text-xs text-on-surface-variant mt-1">
                  Puntos reales {years[0]}–{years[years.length - 1]} vs convergencia de modelos matemáticos para 2027.
                </p>
              </div>

              {/* Selector de visualización en gráfica */}
              <div className="flex items-center gap-2 text-xs bg-black/30 px-3 py-1.5 rounded-xl border border-white/10">
                <span className="text-on-surface-variant font-semibold">Enfocar en Gráfica:</span>
                <select
                  value={selectedModelFilter}
                  onChange={(e) => setSelectedModelFilter(e.target.value)}
                  className="bg-transparent text-amber-400 font-bold focus:outline-none cursor-pointer"
                >
                  <option value="all" className="bg-slate-900 text-white">Todos los Modelos (Multi-Líneas)</option>
                  {models.map(m => (
                    <option key={m.modelId} value={m.modelId} className="bg-slate-900 text-white">
                      {m.shortName} ({formatCurrencyShortCOP(m.projected2027)})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="h-[380px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartSeries} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="r20RealGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="r20BandGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis 
                    dataKey="year" 
                    stroke="currentColor" 
                    className="text-xs text-on-surface-variant" 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <YAxis 
                    tickFormatter={(v) => formatCurrencyShortCOP(v)} 
                    stroke="currentColor" 
                    className="text-xs text-on-surface-variant font-mono" 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <RechartsTooltip content={<CustomChartTooltip />} />

                  {/* Sombreado de Banda 2026-2027 */}
                  <Area
                    type="monotone"
                    dataKey="bandaMax"
                    fill="url(#r20BandGrad)"
                    stroke="none"
                    name="Banda de Incertidumbre"
                  />

                  {/* Serie Real Histórica */}
                  <Area
                    type="monotone"
                    dataKey="real"
                    name="Recaudo Real Histórico"
                    fill="url(#r20RealGrad)"
                    stroke="#38bdf8"
                    strokeWidth={3.5}
                    dot={{ r: 5, fill: '#38bdf8', strokeWidth: 2, stroke: '#0f172a' }}
                    activeDot={{ r: 7 }}
                  />

                  {/* Líneas Proyectadas */}
                  {(selectedModelFilter === 'all' || selectedModelFilter === 'macro') && (
                    <Line
                      type="monotone"
                      dataKey="macro"
                      name="Macro MFMP (IPC 7%)"
                      stroke="#f59e0b"
                      strokeWidth={3}
                      strokeDasharray="5 5"
                      dot={{ r: 6, fill: '#f59e0b', strokeWidth: 2, stroke: '#0f172a' }}
                    />
                  )}

                  {(selectedModelFilter === 'all' || selectedModelFilter === 'holt') && (
                    <Line
                      type="monotone"
                      dataKey="holt"
                      name="Holt Suavizado"
                      stroke="#4ade80"
                      strokeWidth={3}
                      strokeDasharray="4 4"
                      dot={{ r: 6, fill: '#4ade80', strokeWidth: 2, stroke: '#0f172a' }}
                    />
                  )}

                  {(selectedModelFilter === 'all' || selectedModelFilter === 'log') && (
                    <Line
                      type="monotone"
                      dataKey="log"
                      name="Logarítmica"
                      stroke="#34d399"
                      strokeWidth={2}
                      strokeDasharray="3 3"
                      dot={{ r: 5, fill: '#34d399' }}
                    />
                  )}

                  {(selectedModelFilter === 'all' || selectedModelFilter === 'poly2') && (
                    <Line
                      type="monotone"
                      dataKey="poly2"
                      name="Cuadrática"
                      stroke="#c084fc"
                      strokeWidth={2}
                      strokeDasharray="3 3"
                      dot={{ r: 5, fill: '#c084fc' }}
                    />
                  )}

                  {(selectedModelFilter === 'all' || selectedModelFilter === 'wma') && (
                    <Line
                      type="monotone"
                      dataKey="wma"
                      name="WMA"
                      stroke="#fbbf24"
                      strokeWidth={2}
                      strokeDasharray="3 3"
                      dot={{ r: 5, fill: '#fbbf24' }}
                    />
                  )}

                  {(selectedModelFilter === 'all' || selectedModelFilter === 'ols') && (
                    <Line
                      type="monotone"
                      dataKey="ols"
                      name="Lineal OLS"
                      stroke="#60a5fa"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      dot={{ r: 5, fill: '#60a5fa' }}
                    />
                  )}

                  {(selectedModelFilter === 'all' || selectedModelFilter === 'cagr') && (
                    <Line
                      type="monotone"
                      dataKey="cagr"
                      name="CAGR"
                      stroke="#f472b6"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      dot={{ r: 5, fill: '#f472b6' }}
                    />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Leyenda y Notas del Gráfico */}
            <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs text-on-surface-variant">
              <div className="flex flex-wrap items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-1 bg-[#38bdf8] rounded-full"></span> Real Histórico
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-1 bg-[#f59e0b] rounded-full"></span> Macro MFMP (7%)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-1 bg-[#4ade80] rounded-full"></span> Holt Suavizado
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-1 bg-[#34d399] rounded-full"></span> Logarítmica
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-1 bg-[#c084fc] rounded-full"></span> Cuadrática
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-1 bg-[#fbbf24] rounded-full"></span> WMA Móvil
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-1 bg-[#f472b6] rounded-full"></span> CAGR
                </span>
              </div>
              <span className="font-mono text-white bg-white/5 px-2.5 py-1 rounded-lg">
                Convergencia Proyectada 2027
              </span>
            </div>
          </div>

          {/* TABLA COMPARATIVA DE LOS 7 MODELOS MATEMÁTICOS */}
          <div className="glass-card p-6 rounded-[28px]">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-display text-white font-bold flex items-center gap-2">
                  <Table size={18} className="text-amber-400" />
                  Evaluación Comparativa de Modelos Matemáticos
                </h3>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Racional matemático, bondad de ajuste (R²), tasa de error (MAPE) y valor proyectado para 2027.
                </p>
              </div>
              <span className="text-xs font-mono text-on-surface-variant bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
                {models.length} Modelos Evaluados
              </span>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/20">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-container-low text-on-surface-variant uppercase text-[11px] tracking-wider">
                  <tr>
                    <th className="p-4 font-semibold text-white">Modelo Matemático</th>
                    <th className="p-4 font-semibold text-amber-300">Fórmula / Mecanismo</th>
                    <th className="p-4 font-semibold text-right text-emerald-300">Proyección 2027 ($ COP)</th>
                    <th className="p-4 font-semibold text-right text-white">Millones ($M)</th>
                    <th className="p-4 font-semibold text-center text-sky-300">Var. vs 2026</th>
                    <th className="p-4 font-semibold text-center text-purple-300">R² (Ajuste)</th>
                    <th className="p-4 font-semibold text-center text-yellow-300">MAPE</th>
                    <th className="p-4 font-semibold text-center text-white">Criterio Institucional</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-sans">
                  {models.map((m) => {
                    const isSelected = selectedModelFilter === m.modelId;
                    return (
                      <tr 
                        key={m.modelId} 
                        onClick={() => setSelectedModelFilter(m.modelId)}
                        className={`hover:bg-white/5 transition-colors cursor-pointer ${
                          isSelected ? 'bg-amber-500/10 border-l-4 border-amber-400' : ''
                        }`}
                      >
                        <td className="p-4 font-bold text-white flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: m.color }}></span>
                          <span>{m.modelName}</span>
                        </td>
                        <td className="p-4 font-mono text-[11px] text-amber-200/90 max-w-[240px] truncate" title={m.formula}>
                          {m.formula}
                        </td>
                        <td className="p-4 text-right font-mono font-bold text-emerald-300">
                          {formatCurrencyCOP(m.projected2027)}
                        </td>
                        <td className="p-4 text-right font-mono font-bold text-white">
                          {formatCurrencyShortCOP(m.projected2027)}
                        </td>
                        <td className="p-4 text-center font-mono font-bold">
                          <span className={`px-2 py-0.5 rounded ${
                            m.variationPct >= 0 ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'
                          }`}>
                            {m.variationPct >= 0 ? '+' : ''}{m.variationPct.toFixed(2)}%
                          </span>
                        </td>
                        <td className="p-4 text-center font-mono font-bold text-purple-300">
                          {m.r2.toFixed(1)}%
                        </td>
                        <td className="p-4 text-center font-mono font-bold text-yellow-300">
                          {m.mape.toFixed(2)}%
                        </td>
                        <td className="p-4 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            m.tag === 'Recomendado'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : m.tag === 'Optimista'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : m.tag === 'Conservador'
                              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                              : 'bg-white/10 text-on-surface-variant'
                          }`}>
                            {m.tag}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <p className="text-[11px] text-on-surface-variant mt-3 italic flex items-center gap-1.5">
              <Info size={13} className="text-amber-400 shrink-0" />
              Haga clic sobre cualquier fila para enfocar la trayectoria de ese modelo en la gráfica interactiva superior.
            </p>
          </div>
        </div>
      )}

      {/* VISTA 2: DESGLOSE BOTTOM-UP POR CONCEPTO */}
      {activeSubTab === 'conceptos' && (
        <div className="glass-card p-6 md:p-8 rounded-[28px] space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-display text-white font-bold flex items-center gap-2">
                <Layers size={20} className="text-amber-400" />
                Proyección Bottom-Up por Concepto de Ingreso R20
              </h3>
              <p className="text-xs text-on-surface-variant mt-1">
                Estimación individual concepto por concepto sumada para contrastar con la proyección global Top-Down.
              </p>
            </div>

            <div className="flex items-center gap-3 bg-black/30 px-4 py-2 rounded-2xl border border-white/10">
              <span className="text-xs text-on-surface-variant">Suma Bottom-Up 2027:</span>
              <span className="text-lg font-mono font-bold text-emerald-400">
                {formatCurrencyShortCOP(bottomUpData.totalBottomUp2027)}
              </span>
              <span className="text-xs font-mono text-on-surface-variant">
                ({bottomUpData.growthPct >= 0 ? '+' : ''}{bottomUpData.growthPct.toFixed(1)}% vs 2026)
              </span>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/20">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-container-low text-on-surface-variant uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="p-4 font-semibold text-white">Concepto de Ingreso</th>
                  <th className="p-4 font-semibold text-right text-on-surface-variant">Recaudo 2024</th>
                  <th className="p-4 font-semibold text-right text-on-surface-variant">Recaudo 2025</th>
                  <th className="p-4 font-semibold text-right text-sky-300">Recaudo 2026</th>
                  <th className="p-4 font-semibold text-right text-emerald-300">Proyectado 2027</th>
                  <th className="p-4 font-semibold text-center text-white">Variación</th>
                  <th className="p-4 font-semibold text-center text-amber-300">Part. R20 (%)</th>
                  <th className="p-4 font-semibold text-center text-on-surface-variant">Método</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-sans">
                {bottomUpData.concepts.map((c, idx) => (
                  <tr key={idx} className="hover:bg-white/5 transition-colors">
                    <td className="p-4 font-semibold text-white max-w-[260px] truncate" title={c.concepto}>
                      {c.concepto}
                    </td>
                    <td className="p-4 text-right font-mono text-on-surface-variant">
                      {formatCurrencyShortCOP(c.recaudo2024)}
                    </td>
                    <td className="p-4 text-right font-mono text-on-surface-variant">
                      {formatCurrencyShortCOP(c.recaudo2025)}
                    </td>
                    <td className="p-4 text-right font-mono font-bold text-sky-300">
                      {formatCurrencyShortCOP(c.recaudo2026)}
                    </td>
                    <td className="p-4 text-right font-mono font-bold text-emerald-300">
                      {formatCurrencyShortCOP(c.recaudo2027Proyectado)}
                    </td>
                    <td className="p-4 text-center font-mono font-bold">
                      <span className={`px-2 py-0.5 rounded text-[11px] ${
                        c.variacionPct >= 0 ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'
                      }`}>
                        {c.variacionPct >= 0 ? '+' : ''}{c.variacionPct.toFixed(1)}%
                      </span>
                    </td>
                    <td className="p-4 text-center font-mono font-bold text-amber-300">
                      {c.participacionPct.toFixed(1)}%
                    </td>
                    <td className="p-4 text-center font-mono text-[10px] text-on-surface-variant">
                      {c.modeloUsado}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VISTA 3: DISTRIBUCIÓN POR FACULTAD / SEDE */}
      {activeSubTab === 'unidades' && (
        <div className="glass-card p-6 md:p-8 rounded-[28px] space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-display text-white font-bold flex items-center gap-2">
                <Building2 size={20} className="text-amber-400" />
                Distribución Proyectada por Unidad y Seccional (2027)
              </h3>
              <p className="text-xs text-on-surface-variant mt-1">
                Aportes de las 14 dependencias académicas y administrativas en la generación de Recursos Propios.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/20">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-container-low text-on-surface-variant uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="p-4 font-semibold text-white">Unidad Académica / Administrativa</th>
                  <th className="p-4 font-semibold text-right text-sky-300">Recaudo 2026</th>
                  <th className="p-4 font-semibold text-right text-emerald-300">Proyección 2027</th>
                  <th className="p-4 font-semibold text-center text-amber-300">Participación (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-sans">
                {unitBreakdown.map((u, idx) => (
                  <tr key={idx} className="hover:bg-white/5 transition-colors">
                    <td className="p-4 font-semibold text-white flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                      {u.unidad}
                    </td>
                    <td className="p-4 text-right font-mono font-bold text-sky-300">
                      {formatCurrencyCOP(u.rec2026)}
                    </td>
                    <td className="p-4 text-right font-mono font-bold text-emerald-300">
                      {formatCurrencyCOP(u.proj2027)}
                    </td>
                    <td className="p-4 text-center font-mono font-bold text-amber-300">
                      {u.participacion.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DICTAMEN TÉCNICO INSTITUCIONAL: IMPACTO DE LA GRATUIDAD */}
      <div className="bg-gradient-to-r from-amber-500/10 via-surface-container-high to-primary-container/10 border border-amber-500/30 rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-xl">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0 border border-amber-500/30">
            <Scale size={24} />
          </div>
          <div className="space-y-3">
            <h4 className="text-base font-bold text-white font-display">
              Dictamen Técnico Institucional — Análisis de Transición Estructural de R20
            </h4>
            <p className="text-xs md:text-sm text-on-surface-variant leading-relaxed">
              <strong className="text-white">Cambio de Paradigma Presupuestal:</strong> En el periodo 2016–2018, los Recursos Propios de la UPTC superaban los \$60.000 millones anuales debido al recaudo masivo directo por matrículas de pregrado. Con la sanción de la <strong>Política de Gratuidad en la Educación Superior (Ley 2307 de 2023 / Decreto 2271 de 2023)</strong>, la universidad dejó de cobrar directamente la matrícula a los estudiantes, recibiendo en su lugar transferencias directas de la Nación (recursos R10 / FES).
            </p>
            <p className="text-xs md:text-sm text-on-surface-variant leading-relaxed">
              <strong className="text-white">Criterio de Calibración:</strong> Por este motivo, proyectar 2027 con una regresión lineal simple sobre los 10 años completos arroja una falsa pendiente negativa pronunciada. La <strong>ventana Post-Gratuidad (2021–2026)</strong> refleja con precisión el nuevo piso estructural de R20 (\$16.000M a \$24.000M), estabilizado en certificaciones, servicios de alimentación, rendimientos de tesorería y otros ingresos de autogestión.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
