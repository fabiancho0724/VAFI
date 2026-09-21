import React, { useState, useEffect, useMemo } from 'react';
import { 
  ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip as RechartsTooltip, Legend, BarChart, Bar, Cell 
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Calculator, BarChart3, Layers, Download, 
  RefreshCw, SlidersHorizontal, Sparkles, AlertTriangle, CheckCircle2, 
  Info, Building2, Table, Filter, ArrowUpRight, Scale, ChevronDown, ChevronUp,
  Search, CheckCheck, Landmark, DollarSign, Wallet
} from 'lucide-react';
import { 
  R20Record, R20ForecastModelResult, R20ConceptForecast, 
  R20ConceptMatrixSummary, R20ConceptMatrixRow,
  fetchAndParseR20, loadFallbackRecords, filterR20Data, runAllR20Models, 
  computeConceptMatrix, computeBottomUpConceptForecast, 
  formatCurrencyCOP, formatCurrencyShortCOP, exportProjectionCSV 
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
  const [conceptSearch, setConceptSearch] = useState('');
  const [matrixViewMode, setMatrixViewMode] = useState<'recent' | 'all'>('recent');

  // Parámetros de calibración
  const [ipcTarget, setIpcTarget] = useState(7.0);
  const [effortRate, setEffortRate] = useState(1.0);
  const [alpha, setAlpha] = useState(0.5);
  const [beta, setBeta] = useState(0.3);

  // Sub-vista: Modelos & Curvas | Matriz de Conceptos y Total R20 | Unidades
  const [activeSubTab, setActiveSubTab] = useState<'modelos' | 'matriz-conceptos' | 'unidades'>('matriz-conceptos');

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

  // Ejecución de todos los modelos matemáticos (incluyendo ARIMA)
  const models = useMemo(() => {
    if (values.length < 2) return [];
    return runAllR20Models(years, values, { alpha, beta, ipcTarget, effortRate });
  }, [years, values, alpha, beta, ipcTarget, effortRate]);

  // Modelo óptimo recomendado
  const bestModel = useMemo(() => {
    if (!models || models.length === 0) return null;
    if (selectedModelFilter !== 'all') {
      const found = models.find(m => m.modelId === selectedModelFilter);
      if (found) return found;
    }
    const macroModel = models.find(m => m.modelId === 'macro');
    if (macroModel) return macroModel;
    return models[0];
  }, [models, selectedModelFilter]);

  // Matriz completa concepto a concepto con Total R20
  const matrixSummary: R20ConceptMatrixSummary = useMemo(() => {
    return computeConceptMatrix(filteredRecords, selectedWindow, ipcTarget);
  }, [filteredRecords, selectedWindow, ipcTarget]);

  // Conceptos filtrados por búsqueda
  const filteredMatrixRows = useMemo(() => {
    if (!conceptSearch.trim()) return matrixSummary.rows;
    return matrixSummary.rows.filter(r => 
      r.concepto.toLowerCase().includes(conceptSearch.toLowerCase())
    );
  }, [matrixSummary.rows, conceptSearch]);

  // Años a mostrar en la tabla de la matriz
  const displayYears = useMemo(() => {
    if (matrixViewMode === 'recent') {
      return matrixSummary.years.filter(y => y >= 2021);
    }
    return matrixSummary.years;
  }, [matrixSummary.years, matrixViewMode]);

  // Desglose Bottom-Up por conceptos (para exportación y KPIs)
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

  // Generación de puntos para la gráfica Recharts (incluye ARIMA)
  const chartSeries = useMemo(() => {
    if (!models || models.length === 0 || years.length === 0) return [];

    const lastIdx = years.length - 1;
    const lastYear = years[lastIdx];
    const lastVal = values[lastIdx];

    const series = years.map((y, idx) => {
      const isAnchor = idx === lastIdx;
      return {
        year: `${y}`,
        numericYear: y,
        real: values[idx],
        isProjection: false,
        macro: isAnchor ? lastVal : null,
        holt: isAnchor ? lastVal : null,
        arima: isAnchor ? lastVal : null,
        log: isAnchor ? lastVal : null,
        poly2: isAnchor ? lastVal : null,
        wma: isAnchor ? lastVal : null,
        ols: isAnchor ? lastVal : null,
        cagr: isAnchor ? lastVal : null,
        bandaMin: isAnchor ? lastVal : null,
        bandaMax: isAnchor ? lastVal : null
      };
    });

    const macroVal = models.find(m => m.modelId === 'macro')?.projected2027 ?? null;
    const holtVal = models.find(m => m.modelId === 'holt')?.projected2027 ?? null;
    const arimaVal = models.find(m => m.modelId === 'arima')?.projected2027 ?? null;
    const logVal = models.find(m => m.modelId === 'log')?.projected2027 ?? null;
    const poly2Val = models.find(m => m.modelId === 'poly2')?.projected2027 ?? null;
    const wmaVal = models.find(m => m.modelId === 'wma')?.projected2027 ?? null;
    const olsVal = models.find(m => m.modelId === 'ols')?.projected2027 ?? null;
    const cagrVal = models.find(m => m.modelId === 'cagr')?.projected2027 ?? null;

    const allProjs = [macroVal, holtVal, arimaVal, logVal, poly2Val, wmaVal, olsVal, cagrVal]
      .filter((v): v is number => v !== null && v > 0);
    const minProj = allProjs.length > 0 ? Math.min(...allProjs) : lastVal;
    const maxProj = allProjs.length > 0 ? Math.max(...allProjs) : lastVal;

    series.push({
      year: '2027 (Proy)',
      numericYear: 2027,
      real: null as any,
      isProjection: true,
      macro: macroVal,
      holt: holtVal,
      arima: arimaVal,
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
      <div className="bg-slate-900/95 border border-white/20 p-4 rounded-xl shadow-2xl backdrop-blur-md text-xs min-w-[280px]">
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
              Modelos Evaluados 2027:
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
            {data.arima !== null && (
              <div className="flex justify-between items-center">
                <span className="text-indigo-400 font-medium">ARIMA (1,1,0):</span>
                <span className="font-mono font-bold text-white">{formatCurrencyShortCOP(data.arima)}</span>
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
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-bold bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                    Histórico Actualizado • Recurso 20 Propios
                  </span>
                  <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 font-bold">
                    ✓ CSV Sincronizado ({records.length} Registros)
                  </span>
                  <span className="text-[11px] font-mono text-indigo-300 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
                    ARIMA(1,1,0) Activo
                  </span>
                </div>
                <h2 className="text-2xl md:text-3xl font-display text-white font-bold tracking-tight mt-1.5">
                  Proyección de Recursos Propios 2027 (R20)
                </h2>
                <p className="text-on-surface-variant font-sans text-xs md:text-sm mt-1 max-w-3xl leading-relaxed">
                  Modelación predictiva multimodelo (incluyendo ARIMA, Holt, OLS y Macro MFMP) con tabla integral que detalla el histórico y la proyección concepto por concepto, consolidando el <strong>Total General de la Proyección de R20</strong> para la vigencia 2027.
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
                title="Sincronizar base histórica"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                <span>Recargar CSV</span>
              </button>
            </div>
          </div>

          {/* BARRA DE FILTROS Y VENTANA TEMPORAL */}
          <div className="mt-6 flex flex-col md:flex-row flex-wrap items-start md:items-center justify-between gap-4">
            {/* Selector de Ventana Histórica */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={14} className="text-amber-400" /> Calibración:
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
              <div className="flex items-center gap-2 bg-black/30 px-3 py-1.5 rounded-xl border border-white/10 text-xs">
                <Building2 size={14} className="text-primary-container shrink-0" />
                <span className="text-on-surface-variant">Unidad:</span>
                <select
                  value={selectedUnidad}
                  onChange={(e) => setSelectedUnidad(e.target.value)}
                  className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer max-w-[180px] truncate"
                >
                  <option value="Todas" className="bg-slate-900 text-white">Todas las Unidades</option>
                  {allUnidades.map(u => (
                    <option key={u} value={u} className="bg-slate-900 text-white">{u}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 bg-black/30 px-3 py-1.5 rounded-xl border border-white/10 text-xs">
                <Filter size={14} className="text-amber-400 shrink-0" />
                <span className="text-on-surface-variant">Concepto:</span>
                <select
                  value={selectedConcepto}
                  onChange={(e) => setSelectedConcepto(e.target.value)}
                  className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer max-w-[180px] truncate"
                >
                  <option value="Todos" className="bg-slate-900 text-white">Todos los Conceptos ({allConceptos.length})</option>
                  {allConceptos.map(c => (
                    <option key={c} value={c} className="bg-slate-900 text-white">{c}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => setShowParamControls(!showParamControls)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                  showParamControls
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-black/30 text-on-surface-variant border-white/10 hover:text-white'
                }`}
              >
                <SlidersHorizontal size={14} />
                <span>Supuestos</span>
                {showParamControls ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>
          </div>

          {/* PANEL EXPANDIBLE DE CALIBRACIÓN */}
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
                <span className="text-[10px] text-on-surface-variant block mt-0.5">Ponderación de nivel</span>
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
        {/* KPI 1: Total Proyección R20 */}
        <div className="glass-card p-5 rounded-2xl border border-amber-500/40 relative overflow-hidden bg-gradient-to-br from-amber-500/10 to-transparent">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-xl pointer-events-none"></div>
          <span className="text-xs font-mono uppercase tracking-wider text-amber-400 font-bold block mb-1 flex items-center justify-between">
            <span>Total Proyección R20 (2027)</span>
            <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full">Bottom-Up</span>
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-display font-bold text-white tracking-tight">
              {formatCurrencyShortCOP(matrixSummary.totalProyeccion2027)}
            </span>
            <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md ${
              matrixSummary.variacionTotalPct >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
            }`}>
              {matrixSummary.variacionTotalPct >= 0 ? '+' : ''}{matrixSummary.variacionTotalPct.toFixed(1)}%
            </span>
          </div>
          <p className="text-[11px] font-mono text-on-surface-variant mt-2 truncate">
            {formatCurrencyCOP(matrixSummary.totalProyeccion2027)}
          </p>
        </div>

        {/* KPI 2: Modelo Óptimo (Incluye ARIMA) */}
        <div className="glass-card p-5 rounded-2xl border border-white/10 relative overflow-hidden">
          <span className="text-xs font-mono uppercase tracking-wider text-on-surface-variant block mb-1">
            Modelo de Referencia Global
          </span>
          <div className="text-lg font-bold text-white mt-1 truncate flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: bestModel?.color || '#38bdf8' }}></span>
            <span>{bestModel ? bestModel.shortName : 'Calculando...'}</span>
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

        {/* KPI 3: Recaudo 2026 Real */}
        <div className="glass-card p-5 rounded-2xl border border-white/10 relative overflow-hidden">
          <span className="text-xs font-mono uppercase tracking-wider text-on-surface-variant block mb-1">
            Recaudo Base 2026 (Corte Vigencia)
          </span>
          <div className="text-2xl font-display font-bold text-white mt-1">
            {formatCurrencyShortCOP(matrixSummary.total2026)}
          </div>
          <p className="text-[11px] text-on-surface-variant mt-2 font-mono">
            COP: <strong className="text-white">{formatCurrencyCOP(matrixSummary.total2026)}</strong>
          </p>
        </div>

        {/* KPI 4: Incremento Neto Proyectado */}
        <div className="glass-card p-5 rounded-2xl border border-white/10 relative overflow-hidden">
          <span className="text-xs font-mono uppercase tracking-wider text-on-surface-variant block mb-1">
            Incremento Neto Proyectado (Δ)
          </span>
          <div className="text-2xl font-display font-bold text-emerald-400 mt-1">
            +{formatCurrencyShortCOP(matrixSummary.totalProyeccion2027 - matrixSummary.total2026)}
          </div>
          <p className="text-[11px] text-on-surface-variant mt-2">
            Proyección basada en {matrixSummary.rows.length} conceptos activos
          </p>
        </div>
      </div>

      {/* NAVEGACIÓN SECUNDARIA DEL APARTADO (Pestañas internas) */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2">
        <button
          onClick={() => setActiveSubTab('matriz-conceptos')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'matriz-conceptos'
              ? 'bg-amber-500 text-black shadow-lg scale-[1.02]'
              : 'text-on-surface-variant hover:text-white hover:bg-white/5'
          }`}
        >
          <Table size={16} />
          <span>📋 Matriz Detallada de Conceptos y Total R20</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-black/20 font-bold">
            {matrixSummary.rows.length} Conceptos
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('modelos')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'modelos'
              ? 'bg-amber-500 text-black shadow-lg scale-[1.02]'
              : 'text-on-surface-variant hover:text-white hover:bg-white/5'
          }`}
        >
          <BarChart3 size={16} />
          <span>📊 Comparativa de Modelos Matemáticos (Incluye ARIMA)</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-black/20 font-bold">
            {models.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('unidades')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'unidades'
              ? 'bg-amber-500 text-black shadow-lg scale-[1.02]'
              : 'text-on-surface-variant hover:text-white hover:bg-white/5'
          }`}
        >
          <Building2 size={16} />
          <span>🏛️ Distribución por Facultad / Sede</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* VISTA A: MATRIZ DETALLADA DE CONCEPTOS UNO A UNO Y TOTAL R20              */}
      {/* ========================================================================= */}
      {activeSubTab === 'matriz-conceptos' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Tarjeta Ejecutiva de Resumen del Total R20 */}
          <div className="glass-card p-6 md:p-8 rounded-[28px] border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-surface-container-high/90 to-background shadow-xl">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono uppercase tracking-wider font-bold text-amber-400 bg-amber-500/20 px-3 py-1 rounded-full border border-amber-500/30">
                    Consolidado Institucional de Recursos Propios
                  </span>
                </div>
                <h3 className="text-2xl md:text-3xl font-display font-bold text-white tracking-tight">
                  Total de la Proyección de Recursos Propios (R20) — Vigencia 2027
                </h3>
                <p className="text-xs md:text-sm text-on-surface-variant max-w-2xl leading-relaxed">
                  Cifra calculada mediante modelación desagregada concepto a concepto (Bottom-Up) para los <strong>{matrixSummary.rows.length} conceptos presupuestales</strong> de la universidad, indexando el esfuerzo propio y los supuestos macroeconómicos del MFMP.
                </p>
              </div>

              {/* Bloque Destacado de Totales */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-black/40 p-5 rounded-2xl border border-white/15">
                <div className="text-left sm:text-right pr-0 sm:pr-4 border-b sm:border-b-0 sm:border-r border-white/10 pb-3 sm:pb-0">
                  <span className="text-[11px] uppercase tracking-wider text-on-surface-variant block font-medium">Recaudo Base 2026</span>
                  <span className="text-xl font-mono font-bold text-sky-300">{formatCurrencyShortCOP(matrixSummary.total2026)}</span>
                  <span className="text-[10px] font-mono text-on-surface-variant block">{formatCurrencyCOP(matrixSummary.total2026)}</span>
                </div>

                <div className="text-left sm:text-right">
                  <span className="text-[11px] uppercase tracking-wider text-amber-400 block font-bold">TOTAL PROYECTADO 2027 (R20)</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-mono font-extrabold text-emerald-400">
                      {formatCurrencyShortCOP(matrixSummary.totalProyeccion2027)}
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded">
                      +{matrixSummary.variacionTotalPct.toFixed(2)}%
                    </span>
                  </div>
                  <span className="text-[11px] font-mono font-semibold text-white block">
                    {formatCurrencyCOP(matrixSummary.totalProyeccion2027)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* TABLA PRINCIPAL: TODOS LOS VALORES DE LOS CONCEPTOS UNO A UNO Y EL TOTAL R20 */}
          <div className="glass-card p-6 md:p-8 rounded-[28px] border border-white/10 space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h4 className="text-lg font-display text-white font-bold flex items-center gap-2">
                  <Table size={18} className="text-amber-400" />
                  Tabla Detallada de Conceptos de Ingreso R20
                </h4>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Histórico por vigencias y proyección individual 2027 para cada concepto con fila de Total General.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Buscador de concepto */}
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                  <input
                    type="text"
                    placeholder="Buscar concepto..."
                    value={conceptSearch}
                    onChange={(e) => setConceptSearch(e.target.value)}
                    className="bg-black/30 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-on-surface-variant focus:outline-none focus:border-amber-400 w-[180px]"
                  />
                </div>

                {/* Toggle de columnas de años */}
                <div className="inline-flex rounded-xl bg-black/40 p-1 border border-white/10 text-xs">
                  <button
                    onClick={() => setMatrixViewMode('recent')}
                    className={`px-3 py-1 rounded-lg font-medium transition-all ${
                      matrixViewMode === 'recent' ? 'bg-amber-500 text-black font-bold' : 'text-on-surface-variant hover:text-white'
                    }`}
                  >
                    2021–2027 (Post-Gratuidad)
                  </button>
                  <button
                    onClick={() => setMatrixViewMode('all')}
                    className={`px-3 py-1 rounded-lg font-medium transition-all ${
                      matrixViewMode === 'all' ? 'bg-amber-500 text-black font-bold' : 'text-on-surface-variant hover:text-white'
                    }`}
                  >
                    10 Años Completos (2016–2027)
                  </button>
                </div>
              </div>
            </div>

            {/* TABLA PRINCIPAL RESPONSIVE */}
            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/20">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-container-low text-on-surface-variant uppercase text-[11px] tracking-wider">
                  <tr>
                    <th className="p-3.5 font-semibold text-white sticky left-0 bg-surface-container-low z-10">
                      Concepto de Ingreso R20 ({filteredMatrixRows.length})
                    </th>
                    {displayYears.map(y => (
                      <th 
                        key={y} 
                        className={`p-3.5 font-semibold text-right font-mono ${
                          y === 2026 ? 'text-sky-300 bg-sky-500/10' : 'text-on-surface-variant'
                        }`}
                      >
                        {y} {y === 2026 ? '(Real)' : ''}
                      </th>
                    ))}
                    <th className="p-3.5 font-bold text-right text-emerald-300 bg-emerald-500/10 font-mono">
                      Proyección 2027 ($ COP)
                    </th>
                    <th className="p-3.5 font-bold text-right text-white font-mono">
                      Proy ($M)
                    </th>
                    <th className="p-3.5 font-semibold text-center text-amber-300">
                      Var vs 2026
                    </th>
                    <th className="p-3.5 font-semibold text-center text-purple-300">
                      Part. R20 (%)
                    </th>
                    <th className="p-3.5 font-semibold text-center text-on-surface-variant">
                      Método
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-sans">
                  {filteredMatrixRows.map((row, idx) => {
                    return (
                      <tr key={idx} className="hover:bg-white/5 transition-colors">
                        <td className="p-3.5 font-semibold text-white max-w-[280px] truncate sticky left-0 bg-slate-900/90 backdrop-blur z-10" title={row.concepto}>
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"></span>
                            <span className="truncate">{row.concepto}</span>
                          </div>
                        </td>

                        {displayYears.map(y => {
                          const val = row.valoresPorAno[y] || 0;
                          return (
                            <td 
                              key={y} 
                              className={`p-3.5 text-right font-mono ${
                                y === 2026 
                                  ? 'text-sky-300 font-bold bg-sky-500/5' 
                                  : val > 0 ? 'text-on-surface-variant' : 'text-white/20'
                              }`}
                            >
                              {val > 0 ? formatCurrencyShortCOP(val) : '—'}
                            </td>
                          );
                        })}

                        <td className="p-3.5 text-right font-mono font-bold text-emerald-300 bg-emerald-500/5">
                          {formatCurrencyCOP(row.proyeccion2027)}
                        </td>
                        <td className="p-3.5 text-right font-mono font-bold text-white">
                          {formatCurrencyShortCOP(row.proyeccion2027)}
                        </td>
                        <td className="p-3.5 text-center font-mono font-bold">
                          <span className={`px-2 py-0.5 rounded text-[11px] ${
                            row.variacionPct >= 0 ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'
                          }`}>
                            {row.variacionPct >= 0 ? '+' : ''}{row.variacionPct.toFixed(1)}%
                          </span>
                        </td>
                        <td className="p-3.5 text-center font-mono font-bold text-purple-300">
                          {row.participacionPct.toFixed(1)}%
                        </td>
                        <td className="p-3.5 text-center font-mono text-[10px] text-on-surface-variant">
                          {row.modeloUtilizado}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                {/* FILA DE TOTAL DE LA PROYECCIÓN DE R20 (SOLICITADA POR EL USUARIO) */}
                <tfoot className="border-t-2 border-amber-500/40 bg-black/40 font-bold text-white text-xs sticky bottom-0">
                  <tr className="shadow-lg">
                    <td className="p-4 font-extrabold text-amber-400 uppercase tracking-wider sticky left-0 bg-slate-900 z-10 flex items-center gap-2">
                      <Landmark size={16} className="text-amber-400 shrink-0" />
                      <span>TOTAL GENERAL RECURSOS PROPIOS (R20)</span>
                    </td>

                    {displayYears.map(y => {
                      const colTotal = matrixSummary.totalesPorAno[y] || 0;
                      return (
                        <td 
                          key={y} 
                          className={`p-4 text-right font-mono font-extrabold ${
                            y === 2026 ? 'text-sky-300 bg-sky-500/20' : 'text-white'
                          }`}
                        >
                          {formatCurrencyShortCOP(colTotal)}
                        </td>
                      );
                    })}

                    <td className="p-4 text-right font-mono font-extrabold text-emerald-300 bg-emerald-500/20 text-sm">
                      {formatCurrencyCOP(matrixSummary.totalProyeccion2027)}
                    </td>

                    <td className="p-4 text-right font-mono font-extrabold text-white text-sm">
                      {formatCurrencyShortCOP(matrixSummary.totalProyeccion2027)}
                    </td>

                    <td className="p-4 text-center font-mono font-extrabold text-emerald-400 bg-emerald-500/10">
                      +{matrixSummary.variacionTotalPct.toFixed(2)}%
                    </td>

                    <td className="p-4 text-center font-mono font-extrabold text-purple-300">
                      100.0%
                    </td>

                    <td className="p-4 text-center font-mono text-[10px] text-amber-400 font-bold">
                      Consolidado Total R20
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Sub-notas de la tabla */}
            <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[11px] text-on-surface-variant">
              <span className="flex items-center gap-1.5">
                <CheckCheck size={14} className="text-emerald-400" />
                Los valores históricos provienen fielmente de los 124 registros consolidados de <strong>Historico Ingresos.csv</strong>.
              </span>
              <button
                onClick={handleExport}
                className="text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 transition-colors"
              >
                <Download size={13} />
                Descargar esta matriz en CSV
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VISTA B: COMPARATIVA DE MODELOS MATEMÁTICOS & GRÁFICA (INCLUYE ARIMA)      */}
      {/* ========================================================================= */}
      {activeSubTab === 'modelos' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Gráfico Recharts con Línea ARIMA */}
          <div className="glass-card p-6 md:p-8 rounded-[28px]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h3 className="text-xl font-display text-white font-bold flex items-center gap-2">
                  <TrendingUp size={20} className="text-amber-400" />
                  Curva Histórica y Modelos Predictivos a 2027 (Incluye ARIMA)
                </h3>
                <p className="text-xs text-on-surface-variant mt-1">
                  Puntos reales {years[0]}–{years[years.length - 1]} vs proyección 2027 con ARIMA, Holt, OLS, Macro MFMP y polinomial.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs bg-black/30 px-3 py-1.5 rounded-xl border border-white/10">
                <span className="text-on-surface-variant font-semibold">Enfocar en Gráfica:</span>
                <select
                  value={selectedModelFilter}
                  onChange={(e) => setSelectedModelFilter(e.target.value)}
                  className="bg-transparent text-amber-400 font-bold focus:outline-none cursor-pointer"
                >
                  <option value="all" className="bg-slate-900 text-white">Todos los Modelos ({models.length})</option>
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

                  {/* Línea ARIMA (1,1,0) */}
                  {(selectedModelFilter === 'all' || selectedModelFilter === 'arima') && (
                    <Line
                      type="monotone"
                      dataKey="arima"
                      name="ARIMA (1,1,0)"
                      stroke="#818cf8"
                      strokeWidth={3}
                      strokeDasharray="4 4"
                      dot={{ r: 6, fill: '#818cf8', strokeWidth: 2, stroke: '#0f172a' }}
                    />
                  )}

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

            {/* Leyenda de la gráfica */}
            <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs text-on-surface-variant">
              <div className="flex flex-wrap items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-1 bg-[#38bdf8] rounded-full"></span> Real Histórico
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-1 bg-[#818cf8] rounded-full"></span> ARIMA (1,1,0)
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
                  <span className="w-3 h-1 bg-[#60a5fa] rounded-full"></span> Lineal OLS
                </span>
              </div>
              <span className="font-mono text-white bg-white/5 px-2.5 py-1 rounded-lg">
                {models.length} Modelos Evaluados
              </span>
            </div>
          </div>

          {/* TABLA COMPARATIVA DE LOS 8 MODELOS MATEMÁTICOS */}
          <div className="glass-card p-6 rounded-[28px]">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-display text-white font-bold flex items-center gap-2">
                  <Table size={18} className="text-amber-400" />
                  Evaluación Comparativa de Modelos Matemáticos (Incluye ARIMA)
                </h3>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Racional matemático, ecuación, bondad de ajuste (R²), tasa de error (MAPE) y valor proyectado para 2027.
                </p>
              </div>
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
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VISTA C: DISTRIBUCIÓN POR FACULTAD / SEDE                                 */}
      {/* ========================================================================= */}
      {activeSubTab === 'unidades' && (
        <div className="glass-card p-6 md:p-8 rounded-[28px] space-y-6 animate-in fade-in">
          <div>
            <h3 className="text-xl font-display text-white font-bold flex items-center gap-2">
              <Building2 size={20} className="text-amber-400" />
              Distribución Proyectada por Unidad y Seccional (2027)
            </h3>
            <p className="text-xs text-on-surface-variant mt-1">
              Aportes de las dependencias académicas y administrativas en la generación de Recursos Propios.
            </p>
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
              Dictamen Técnico Institucional — Transición Estructural de R20 y Conclusión
            </h4>
            <p className="text-xs md:text-sm text-on-surface-variant leading-relaxed">
              <strong className="text-white">Cambio de Paradigma Presupuestal:</strong> En el periodo 2016–2018, los Recursos Propios de la UPTC superaban los \$60.000 millones anuales debido al recaudo masivo directo por matrículas de pregrado. Con la sanción de la <strong>Política de Gratuidad en la Educación Superior (Ley 2307 de 2023 / Decreto 2271 de 2023)</strong>, la universidad dejó de cobrar directamente la matrícula a los estudiantes, recibiendo en su lugar transferencias directas de la Nación (recursos R10 / FES).
            </p>
            <p className="text-xs md:text-sm text-on-surface-variant leading-relaxed">
              <strong className="text-white">Total Proyectado 2027:</strong> La suma desagregada concepto a concepto arroja un <strong>Total de Proyección R20 para 2027 de {formatCurrencyShortCOP(matrixSummary.totalProyeccion2027)}</strong> ({formatCurrencyCOP(matrixSummary.totalProyeccion2027)}), lo que representa un crecimiento saludable y prudente de <strong>+{matrixSummary.variacionTotalPct.toFixed(2)}%</strong> frente al cierre de 2026, alineado con las directrices del Consejo Superior y la Vicerrectoría Administrativa y Financiera (VAFI).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
