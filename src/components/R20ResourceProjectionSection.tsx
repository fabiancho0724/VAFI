import React, { useState, useEffect, useMemo } from 'react';
import { 
  ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip as RechartsTooltip, Legend, BarChart, Bar, Cell 
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Calculator, BarChart3, Layers, Download, 
  RefreshCw, SlidersHorizontal, Sparkles, AlertTriangle, CheckCircle2, 
  Info, Building2, Table, Filter, ArrowUpRight, Scale, ChevronDown, ChevronUp,
  Search, CheckCheck, Landmark, DollarSign, Wallet, FileText
} from 'lucide-react';
import { 
  R20Record, R20ForecastModelResult, R20ConceptForecast, 
  R20ConceptMatrixSummary, R20ConceptMatrixRow,
  fetchAndParseR20, loadFallbackRecords, filterR20Data, runAllR20Models, 
  computeConceptMatrix, computeBottomUpConceptForecast, 
  formatCurrencyCOP, formatCurrencyShortCOP, exportProjectionCSV,
  R21_HISTORICAL_RECORDS, fetchAndParseR21, exportR21CSV
} from '../lib/r20ProjectionEngine';

export function R20ResourceProjectionSection() {
  // Selector de Recurso Principal: R20 (Propios) | R21 (Devolución IVA) | Consolidado
  const [selectedRecursoTab, setSelectedRecursoTab] = useState<'r20' | 'r21' | 'consolidado'>('r20');

  // Datos R20
  const [records, setRecords] = useState<R20Record[]>([]);
  const [loading, setLoading] = useState(true);

  // Datos R21
  const [r21Records, setR21Records] = useState<R20Record[]>(R21_HISTORICAL_RECORDS);

  // Filtros R20
  const [selectedWindow, setSelectedWindow] = useState<'post-gratuidad' | 'all' | 'ultimos-5'>('post-gratuidad');
  const [selectedUnidad, setSelectedUnidad] = useState('Todas');
  const [selectedConcepto, setSelectedConcepto] = useState('Todos');
  const [selectedModelFilter, setSelectedModelFilter] = useState('all');
  const [showParamControls, setShowParamControls] = useState(false);
  const [conceptSearch, setConceptSearch] = useState('');
  const [matrixViewMode, setMatrixViewMode] = useState<'recent' | 'all'>('recent');

  // Filtros R21
  const [r21ModelFilter, setR21ModelFilter] = useState('all');

  // Parámetros de calibración
  const [ipcTarget, setIpcTarget] = useState(7.0);
  const [effortRate, setEffortRate] = useState(1.0);
  const [alpha, setAlpha] = useState(0.5);
  const [beta, setBeta] = useState(0.3);

  // Sub-vista en R20: Modelos & Curvas | Matriz de Conceptos y Total R20 | Unidades
  const [activeSubTab, setActiveSubTab] = useState<'modelos' | 'matriz-conceptos' | 'unidades'>('matriz-conceptos');

  // Carga inicial de datos R20 y R21
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);
      const dataR20 = await fetchAndParseR20();
      const dataR21 = await fetchAndParseR21();
      if (isMounted) {
        setRecords(dataR20.length > 0 ? dataR20 : loadFallbackRecords());
        setR21Records(dataR21.length > 0 ? dataR21 : R21_HISTORICAL_RECORDS);
        setLoading(false);
      }
    }
    loadData();
    return () => { isMounted = false; };
  }, []);

  // Filtrado y agregación de series temporales R20
  const { years, values, filteredRecords, allUnidades, allConceptos } = useMemo(() => {
    return filterR20Data(records, {
      unidad: selectedUnidad,
      concepto: selectedConcepto,
      window: selectedWindow
    });
  }, [records, selectedUnidad, selectedConcepto, selectedWindow]);

  // Modelos matemáticos R20 (incluyendo ARIMA)
  const models = useMemo(() => {
    if (values.length < 2) return [];
    return runAllR20Models(years, values, { alpha, beta, ipcTarget, effortRate });
  }, [years, values, alpha, beta, ipcTarget, effortRate]);

  // Modelo óptimo R20
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

  // Años a mostrar en la tabla de la matriz R20
  const displayYears = useMemo(() => {
    if (matrixViewMode === 'recent') {
      return matrixSummary.years.filter(y => y >= 2021);
    }
    return matrixSummary.years;
  }, [matrixSummary.years, matrixViewMode]);

  // Desglose Bottom-Up por conceptos R20
  const bottomUpData = useMemo(() => {
    return computeBottomUpConceptForecast(filteredRecords, selectedWindow);
  }, [filteredRecords, selectedWindow]);

  // =========================================================================
  // MODELACIÓN MATEMÁTICA Y SERIES PARA RECURSO 21 (DEVOLUCIÓN IVA)
  // =========================================================================
  const r21Years = useMemo(() => r21Records.map(r => r.vigencia), [r21Records]);
  const r21Values = useMemo(() => r21Records.map(r => r.totalRecaudo), [r21Records]);

  const r21Models = useMemo(() => {
    if (r21Values.length < 2) return [];
    return runAllR20Models(r21Years, r21Values, { alpha, beta, ipcTarget, effortRate: 0.0 });
  }, [r21Years, r21Values, alpha, beta, ipcTarget]);

  const r21BestModel = useMemo(() => {
    if (!r21Models || r21Models.length === 0) return null;
    if (r21ModelFilter !== 'all') {
      const found = r21Models.find(m => m.modelId === r21ModelFilter);
      if (found) return found;
    }
    const macroM = r21Models.find(m => m.modelId === 'macro');
    if (macroM) return macroM;
    return r21Models[0];
  }, [r21Models, r21ModelFilter]);

  const r21ChartSeries = useMemo(() => {
    if (!r21Models || r21Models.length === 0 || r21Years.length === 0) return [];
    const lastIdx = r21Years.length - 1;
    const lastVal = r21Values[lastIdx];

    const series = r21Years.map((y, idx) => {
      const isAnchor = idx === lastIdx;
      return {
        year: `${y}`,
        numericYear: y,
        real: r21Values[idx],
        isProjection: false,
        macro: isAnchor ? lastVal : null,
        holt: isAnchor ? lastVal : null,
        arima: isAnchor ? lastVal : null,
        wma: isAnchor ? lastVal : null,
        ols: isAnchor ? lastVal : null,
        bandaMin: isAnchor ? lastVal : null,
        bandaMax: isAnchor ? lastVal : null
      };
    });

    const macroVal = r21Models.find(m => m.modelId === 'macro')?.projected2027 ?? null;
    const holtVal = r21Models.find(m => m.modelId === 'holt')?.projected2027 ?? null;
    const arimaVal = r21Models.find(m => m.modelId === 'arima')?.projected2027 ?? null;
    const wmaVal = r21Models.find(m => m.modelId === 'wma')?.projected2027 ?? null;
    const olsVal = r21Models.find(m => m.modelId === 'ols')?.projected2027 ?? null;

    const projs = [macroVal, holtVal, arimaVal, wmaVal, olsVal].filter((v): v is number => v !== null && v > 0);
    const minP = projs.length > 0 ? Math.min(...projs) : lastVal;
    const maxP = projs.length > 0 ? Math.max(...projs) : lastVal;

    series.push({
      year: '2027 (Proy)',
      numericYear: 2027,
      real: null as any,
      isProjection: true,
      macro: macroVal,
      holt: holtVal,
      arima: arimaVal,
      wma: wmaVal,
      ols: olsVal,
      bandaMin: minP,
      bandaMax: maxP
    });

    return series;
  }, [r21Years, r21Values, r21Models]);

  // =========================================================================
  // MODELACIÓN COMBINADA (R20 + R21)
  // =========================================================================
  const combinedSummary = useMemo(() => {
    const r20_2024 = matrixSummary.totalesPorAno[2024] || 0;
    const r20_2025 = matrixSummary.totalesPorAno[2025] || 0;
    const r20_2026 = matrixSummary.total2026;
    const r20_2027 = matrixSummary.totalProyeccion2027;

    const r21_2024 = r21Records.find(r => r.vigencia === 2024)?.totalRecaudo || 0;
    const r21_2025 = r21Records.find(r => r.vigencia === 2025)?.totalRecaudo || 0;
    const r21_2026 = r21Records.find(r => r.vigencia === 2026)?.totalRecaudo || 0;
    const r21_2027 = r21BestModel ? r21BestModel.projected2027 : r21_2026 * 1.07;

    const total_2024 = r20_2024 + r21_2024;
    const total_2025 = r20_2025 + r21_2025;
    const total_2026 = r20_2026 + r21_2026;
    const total_2027 = r20_2027 + r21_2027;

    const varTotal = total_2026 > 0 ? ((total_2027 - total_2026) / total_2026) * 100 : 0;

    return {
      r20: { y24: r20_2024, y25: r20_2025, y26: r20_2026, y27: r20_2027, part: (r20_2027 / total_2027) * 100 },
      r21: { y24: r21_2024, y25: r21_2025, y26: r21_2026, y27: r21_2027, part: (r21_2027 / total_2027) * 100 },
      total: { y24: total_2024, y25: total_2025, y26: total_2026, y27: total_2027, varPct: varTotal }
    };
  }, [matrixSummary, r21Records, r21BestModel]);

  // Generación de puntos para gráfica R20 (incluye ARIMA)
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

  // Manejadores de exportación
  const handleExportR20 = () => {
    const windowLabel = selectedWindow === 'post-gratuidad'
      ? 'Post-Gratuidad (2021-2026)'
      : selectedWindow === 'ultimos-5'
      ? 'Ultimos 5 Anos (2022-2026)'
      : '10 Anos Completos (2016-2026)';
    exportProjectionCSV(models, bottomUpData.concepts, windowLabel);
  };

  const handleExportR21 = () => {
    exportR21CSV(r21Models, r21Records);
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

  return (
    <div className="space-y-6 fade-in">
      {/* ========================================================================= */}
      {/* BARRA SUPERIOR: SELECTOR DE RECURSO PRESUPUESTAL (R20, R21, CONSOLIDADO) */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-surface-container-high/90 to-background p-3.5 rounded-3xl border border-white/10 shadow-lg">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider pl-2 pr-1 flex items-center gap-1.5">
            <Landmark size={14} className="text-amber-400" /> Fuente Presupuestal:
          </span>

          <button
            onClick={() => setSelectedRecursoTab('r20')}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-bold text-xs transition-all ${
              selectedRecursoTab === 'r20'
                ? 'bg-amber-500 text-black shadow-lg scale-[1.02]'
                : 'text-on-surface-variant hover:text-white hover:bg-white/5'
            }`}
          >
            <Landmark size={15} />
            <span>Recurso 20 (Recursos Propios)</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-black/20 text-white font-bold">
              $13.188M Base
            </span>
          </button>

          <button
            onClick={() => setSelectedRecursoTab('r21')}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-bold text-xs transition-all ${
              selectedRecursoTab === 'r21'
                ? 'bg-emerald-500 text-black shadow-lg scale-[1.02]'
                : 'text-on-surface-variant hover:text-white hover:bg-white/5'
            }`}
          >
            <DollarSign size={15} />
            <span>Recurso 21 (Devolución IVA)</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-black/20 text-white font-bold">
              $4.672M Base
            </span>
          </button>

          <button
            onClick={() => setSelectedRecursoTab('consolidado')}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-bold text-xs transition-all ${
              selectedRecursoTab === 'consolidado'
                ? 'bg-indigo-500 text-white shadow-lg scale-[1.02]'
                : 'text-on-surface-variant hover:text-white hover:bg-white/5'
            }`}
          >
            <Layers size={15} />
            <span>Consolidado Global (R20 + R21)</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-black/30 text-white font-bold">
              $17.860M Total
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2 pr-2">
          <span className="text-[11px] font-mono text-on-surface-variant">
            Vigencia Proyectada: <strong className="text-white">2027</strong>
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECCIÓN 1: RECURSO 20 (RECURSOS PROPIOS)                                   */}
      {/* ========================================================================= */}
      {selectedRecursoTab === 'r20' && (
        <div className="space-y-6 animate-in fade-in">
          {/* HEADER R20 */}
          <div className="bg-gradient-to-br from-surface-container-high/90 to-background border border-amber-500/30 rounded-[32px] p-6 md:p-8 relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-amber-500/10 blur-[100px] rounded-full pointer-events-none"></div>

            <div className="relative z-10">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-white/10">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0 border border-amber-500/30 shadow-lg">
                    <Calculator size={28} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-bold bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                        Histórico 2016–2026 • Recurso 20 Propios
                      </span>
                      <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 font-bold">
                        ✓ 124 Registros Consolidados
                      </span>
                      <span className="text-[11px] font-mono text-indigo-300 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
                        ARIMA(1,1,0) Activo
                      </span>
                    </div>
                    <h2 className="text-2xl md:text-3xl font-display text-white font-bold tracking-tight mt-1.5">
                      Proyección de Recursos Propios 2027 (R20)
                    </h2>
                    <p className="text-on-surface-variant font-sans text-xs md:text-sm mt-1 max-w-3xl leading-relaxed">
                      Modelación predictiva multimodelo con tabla integral que detalla el histórico y la proyección concepto por concepto, consolidando el <strong>Total General de la Proyección de R20</strong> para 2027.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={handleExportR20}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold border border-white/10 transition-all shadow-md active:scale-95"
                  >
                    <Download size={16} className="text-amber-400" />
                    <span>Exportar CSV R20</span>
                  </button>
                </div>
              </div>

              {/* BARRA DE FILTROS Y VENTANA TEMPORAL R20 */}
              <div className="mt-6 flex flex-col md:flex-row flex-wrap items-start md:items-center justify-between gap-4">
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
                    >
                      Últimos 5 Años (2022–2026)
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
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

              {/* PANEL DE SUPUESTOS */}
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
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* TARJETAS KPI R20 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-card p-5 rounded-2xl border border-amber-500/40 relative overflow-hidden bg-gradient-to-br from-amber-500/10 to-transparent">
              <span className="text-xs font-mono uppercase tracking-wider text-amber-400 font-bold block mb-1">
                Total Proyección R20 (2027)
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-display font-bold text-white tracking-tight">
                  {formatCurrencyShortCOP(matrixSummary.totalProyeccion2027)}
                </span>
                <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md ${
                  matrixSummary.variacionTotalPct >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                }`}>
                  +{matrixSummary.variacionTotalPct.toFixed(1)}%
                </span>
              </div>
              <p className="text-[11px] font-mono text-on-surface-variant mt-2 truncate">
                {formatCurrencyCOP(matrixSummary.totalProyeccion2027)}
              </p>
            </div>

            <div className="glass-card p-5 rounded-2xl border border-white/10 relative overflow-hidden">
              <span className="text-xs font-mono uppercase tracking-wider text-on-surface-variant block mb-1">
                Modelo Óptimo R20
              </span>
              <div className="text-lg font-bold text-white mt-1 truncate flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: bestModel?.color || '#38bdf8' }}></span>
                <span>{bestModel ? bestModel.shortName : 'Calculando...'}</span>
              </div>
              <div className="flex items-center gap-3 mt-2 font-mono text-xs">
                <span className="text-emerald-400 font-semibold">R²: {bestModel ? `${bestModel.r2.toFixed(1)}%` : '0%'}</span>
                <span>•</span>
                <span className="text-sky-400 font-semibold">MAPE: {bestModel ? `${bestModel.mape.toFixed(1)}%` : '0%'}</span>
              </div>
            </div>

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

            <div className="glass-card p-5 rounded-2xl border border-white/10 relative overflow-hidden">
              <span className="text-xs font-mono uppercase tracking-wider text-on-surface-variant block mb-1">
                Incremento Neto Proyectado (Δ)
              </span>
              <div className="text-2xl font-display font-bold text-emerald-400 mt-1">
                +{formatCurrencyShortCOP(matrixSummary.totalProyeccion2027 - matrixSummary.total2026)}
              </div>
              <p className="text-[11px] text-on-surface-variant mt-2">
                {matrixSummary.rows.length} Conceptos activos consolidados
              </p>
            </div>
          </div>

          {/* NAVEGACIÓN SECUNDARIA INTERNA R20 */}
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
              <span>📊 Modelos Predictivos y Curvas (Incluye ARIMA)</span>
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

          {/* SUB-VISTA A: MATRIZ DETALLADA CON TOTAL R20 */}
          {activeSubTab === 'matriz-conceptos' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="glass-card p-6 md:p-8 rounded-[28px] border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-surface-container-high/90 to-background shadow-xl">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div>
                    <span className="text-xs font-mono uppercase tracking-wider font-bold text-amber-400 bg-amber-500/20 px-3 py-1 rounded-full border border-amber-500/30">
                      Consolidado Institucional de Recursos Propios
                    </span>
                    <h3 className="text-2xl md:text-3xl font-display font-bold text-white tracking-tight mt-2">
                      Total de la Proyección de Recursos Propios (R20) — Vigencia 2027
                    </h3>
                    <p className="text-xs md:text-sm text-on-surface-variant max-w-2xl mt-1 leading-relaxed">
                      Cálculo resultante de la suma agregada concepto a concepto para los <strong>{matrixSummary.rows.length} conceptos presupuestales</strong> de la universidad.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-black/40 p-5 rounded-2xl border border-white/15">
                    <div className="text-left sm:text-right pr-0 sm:pr-4 border-b sm:border-b-0 sm:border-r border-white/10 pb-3 sm:pb-0">
                      <span className="text-[11px] uppercase tracking-wider text-on-surface-variant block font-medium">Recaudo Base 2026</span>
                      <span className="text-xl font-mono font-bold text-sky-300">{formatCurrencyShortCOP(matrixSummary.total2026)}</span>
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

              {/* TABLA PRINCIPAL UNO A UNO R20 */}
              <div className="glass-card p-6 md:p-8 rounded-[28px] border border-white/10 space-y-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-lg font-display text-white font-bold flex items-center gap-2">
                      <Table size={18} className="text-amber-400" />
                      Tabla Detallada de Conceptos de Ingreso R20
                    </h4>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      Histórico anual y proyección individual 2027 para cada concepto con fila de Total General.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
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
                        10 Años (2016–2027)
                      </button>
                    </div>
                  </div>
                </div>

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
                      {filteredMatrixRows.map((row, idx) => (
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
                      ))}
                    </tbody>

                    {/* FILA DE TOTAL PROYECCIÓN R20 */}
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
              </div>
            </div>
          )}

          {/* SUB-VISTA B: MODELOS PREDICTIVOS Y GRÁFICA (INCLUYE ARIMA) */}
          {activeSubTab === 'modelos' && (
            <div className="space-y-6 animate-in fade-in">
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
                      <XAxis dataKey="year" stroke="currentColor" className="text-xs text-on-surface-variant" tickLine={false} axisLine={false} />
                      <YAxis tickFormatter={(v) => formatCurrencyShortCOP(v)} stroke="currentColor" className="text-xs text-on-surface-variant font-mono" tickLine={false} axisLine={false} />
                      <RechartsTooltip content={<CustomChartTooltip />} />

                      <Area type="monotone" dataKey="bandaMax" fill="url(#r20BandGrad)" stroke="none" name="Banda de Incertidumbre" />
                      <Area type="monotone" dataKey="real" name="Recaudo Real Histórico" fill="url(#r20RealGrad)" stroke="#38bdf8" strokeWidth={3.5} dot={{ r: 5, fill: '#38bdf8' }} />

                      {(selectedModelFilter === 'all' || selectedModelFilter === 'arima') && (
                        <Line type="monotone" dataKey="arima" name="ARIMA (1,1,0)" stroke="#818cf8" strokeWidth={3} strokeDasharray="4 4" dot={{ r: 6, fill: '#818cf8' }} />
                      )}
                      {(selectedModelFilter === 'all' || selectedModelFilter === 'macro') && (
                        <Line type="monotone" dataKey="macro" name="Macro MFMP (7%)" stroke="#f59e0b" strokeWidth={3} strokeDasharray="5 5" dot={{ r: 6, fill: '#f59e0b' }} />
                      )}
                      {(selectedModelFilter === 'all' || selectedModelFilter === 'holt') && (
                        <Line type="monotone" dataKey="holt" name="Holt Suavizado" stroke="#4ade80" strokeWidth={3} strokeDasharray="4 4" dot={{ r: 6, fill: '#4ade80' }} />
                      )}
                      {(selectedModelFilter === 'all' || selectedModelFilter === 'log') && (
                        <Line type="monotone" dataKey="log" name="Logarítmica" stroke="#34d399" strokeWidth={2} strokeDasharray="3 3" dot={{ r: 5, fill: '#34d399' }} />
                      )}
                      {(selectedModelFilter === 'all' || selectedModelFilter === 'poly2') && (
                        <Line type="monotone" dataKey="poly2" name="Cuadrática" stroke="#c084fc" strokeWidth={2} strokeDasharray="3 3" dot={{ r: 5, fill: '#c084fc' }} />
                      )}
                      {(selectedModelFilter === 'all' || selectedModelFilter === 'wma') && (
                        <Line type="monotone" dataKey="wma" name="WMA" stroke="#fbbf24" strokeWidth={2} strokeDasharray="3 3" dot={{ r: 5, fill: '#fbbf24' }} />
                      )}
                      {(selectedModelFilter === 'all' || selectedModelFilter === 'ols') && (
                        <Line type="monotone" dataKey="ols" name="Lineal OLS" stroke="#60a5fa" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 5, fill: '#60a5fa' }} />
                      )}
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* TABLA COMPARATIVA DE MODELOS R20 */}
              <div className="glass-card p-6 rounded-[28px]">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-display text-white font-bold flex items-center gap-2">
                    <Table size={18} className="text-amber-400" />
                    Evaluación de Modelos Matemáticos R20 (Incluye ARIMA)
                  </h3>
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
                      {models.map((m) => (
                        <tr 
                          key={m.modelId} 
                          onClick={() => setSelectedModelFilter(m.modelId)}
                          className="hover:bg-white/5 transition-colors cursor-pointer"
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
                                : 'bg-white/10 text-on-surface-variant'
                            }`}>
                              {m.tag}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SUB-VISTA C: UNIDADES */}
          {activeSubTab === 'unidades' && (
            <div className="glass-card p-6 md:p-8 rounded-[28px] space-y-6 animate-in fade-in">
              <h3 className="text-xl font-display text-white font-bold flex items-center gap-2">
                <Building2 size={20} className="text-amber-400" />
                Distribución Proyectada por Unidad y Seccional (2027)
              </h3>
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
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECCIÓN 2: ESPACIO DEDICADO PARA RECURSO 21 (DEVOLUCIÓN IVA - IES)        */}
      {/* ========================================================================= */}
      {selectedRecursoTab === 'r21' && (
        <div className="space-y-6 animate-in fade-in">
          {/* HEADER R21 */}
          <div className="bg-gradient-to-br from-surface-container-high/90 to-background border border-emerald-500/30 rounded-[32px] p-6 md:p-8 relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none"></div>

            <div className="relative z-10">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-white/10">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 border border-emerald-500/30 shadow-lg">
                    <DollarSign size={28} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                        Recurso 21: Devolución IVA (IES)
                      </span>
                      <span className="text-[11px] font-mono text-white/80 bg-white/10 px-2.5 py-0.5 rounded-full border border-white/15">
                        Art. 92 Ley 30 de 1992 • Art. 481 E.T.
                      </span>
                      <span className="text-[11px] font-mono text-amber-300 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                        11 Vigencias Históricas (2016–2026)
                      </span>
                    </div>
                    <h2 className="text-2xl md:text-3xl font-display text-white font-bold tracking-tight mt-1.5">
                      Proyección Recurso 21 — Devolución de IVA 2027
                    </h2>
                    <p className="text-on-surface-variant font-sans text-xs md:text-sm mt-1 max-w-3xl leading-relaxed">
                      Flujo de recursos transferidos por la Dirección de Impuestos y Aduanas Nacionales (DIAN) en virtud del beneficio tributario de exención y devolución del IVA para Instituciones de Educación Superior públicas.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleExportR21}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold border border-white/10 transition-all shadow-md active:scale-95"
                  >
                    <Download size={16} className="text-emerald-400" />
                    <span>Exportar CSV R21</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* TARJETAS KPI R21 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-card p-5 rounded-2xl border border-emerald-500/40 relative overflow-hidden bg-gradient-to-br from-emerald-500/10 to-transparent">
              <span className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-bold block mb-1">
                Proyección Central R21 (2027)
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-display font-bold text-white tracking-tight">
                  {r21BestModel ? formatCurrencyShortCOP(r21BestModel.projected2027) : '$0'}
                </span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400">
                  +{r21BestModel ? r21BestModel.variationPct.toFixed(1) : 7.0}% vs 2026
                </span>
              </div>
              <p className="text-[11px] font-mono text-on-surface-variant mt-2 truncate">
                {r21BestModel ? formatCurrencyCOP(r21BestModel.projected2027) : '$0'}
              </p>
            </div>

            <div className="glass-card p-5 rounded-2xl border border-white/10 relative overflow-hidden">
              <span className="text-xs font-mono uppercase tracking-wider text-on-surface-variant block mb-1">
                Recaudo Base 2026
              </span>
              <div className="text-2xl font-display font-bold text-white mt-1">
                {formatCurrencyShortCOP(4672202857)}
              </div>
              <p className="text-[11px] text-on-surface-variant mt-2 font-mono">
                $ 4.672.202.857 COP
              </p>
            </div>

            <div className="glass-card p-5 rounded-2xl border border-white/10 relative overflow-hidden">
              <span className="text-xs font-mono uppercase tracking-wider text-on-surface-variant block mb-1">
                Promedio Histórico (11 Años)
              </span>
              <div className="text-2xl font-display font-bold text-white mt-1">
                $4.726M
              </div>
              <p className="text-[11px] text-on-surface-variant mt-2 font-mono">
                Línea base natural de la universidad
              </p>
            </div>

            <div className="glass-card p-5 rounded-2xl border border-white/10 relative overflow-hidden">
              <span className="text-xs font-mono uppercase tracking-wider text-amber-400 block mb-1">
                Pico Extraordinario (2025)
              </span>
              <div className="text-2xl font-display font-bold text-amber-300 mt-1">
                $7.982M
              </div>
              <p className="text-[11px] text-on-surface-variant mt-2">
                Resoluciones DIAN acumuladas
              </p>
            </div>
          </div>

          {/* GRÁFICA HISTÓRICA Y PROYECCIÓN R21 */}
          <div className="glass-card p-6 md:p-8 rounded-[28px]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h3 className="text-xl font-display text-white font-bold flex items-center gap-2">
                  <TrendingUp size={20} className="text-emerald-400" />
                  Evolución Histórica (2016–2026) y Proyección 2027 (R21)
                </h3>
                <p className="text-xs text-on-surface-variant mt-1">
                  Comportamiento de las devoluciones de IVA tramitadas ante la DIAN y abanico de modelos proyectados.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs bg-black/30 px-3 py-1.5 rounded-xl border border-white/10">
                <span className="text-on-surface-variant font-semibold">Enfocar Modelo:</span>
                <select
                  value={r21ModelFilter}
                  onChange={(e) => setR21ModelFilter(e.target.value)}
                  className="bg-transparent text-emerald-400 font-bold focus:outline-none cursor-pointer"
                >
                  <option value="all" className="bg-slate-900 text-white">Todos los Modelos ({r21Models.length})</option>
                  {r21Models.map(m => (
                    <option key={m.modelId} value={m.modelId} className="bg-slate-900 text-white">
                      {m.shortName} ({formatCurrencyShortCOP(m.projected2027)})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="h-[360px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={r21ChartSeries} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="r21RealGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="year" stroke="currentColor" className="text-xs text-on-surface-variant" tickLine={false} axisLine={false} />
                  <YAxis tickFormatter={(v) => formatCurrencyShortCOP(v)} stroke="currentColor" className="text-xs text-on-surface-variant font-mono" tickLine={false} axisLine={false} />
                  <RechartsTooltip content={<CustomChartTooltip />} />

                  <Area type="monotone" dataKey="real" name="Recaudo Real IVA" fill="url(#r21RealGrad)" stroke="#10b981" strokeWidth={3.5} dot={{ r: 5, fill: '#10b981' }} />

                  {(r21ModelFilter === 'all' || r21ModelFilter === 'macro') && (
                    <Line type="monotone" dataKey="macro" name="Macro MFMP (7%)" stroke="#f59e0b" strokeWidth={3} strokeDasharray="5 5" dot={{ r: 6, fill: '#f59e0b' }} />
                  )}
                  {(r21ModelFilter === 'all' || r21ModelFilter === 'arima') && (
                    <Line type="monotone" dataKey="arima" name="ARIMA (1,1,0)" stroke="#818cf8" strokeWidth={3} strokeDasharray="4 4" dot={{ r: 6, fill: '#818cf8' }} />
                  )}
                  {(r21ModelFilter === 'all' || r21ModelFilter === 'holt') && (
                    <Line type="monotone" dataKey="holt" name="Holt Suavizado" stroke="#34d399" strokeWidth={3} strokeDasharray="4 4" dot={{ r: 6, fill: '#34d399' }} />
                  )}
                  {(r21ModelFilter === 'all' || r21ModelFilter === 'wma') && (
                    <Line type="monotone" dataKey="wma" name="WMA (3 años)" stroke="#fbbf24" strokeWidth={2} strokeDasharray="3 3" dot={{ r: 5, fill: '#fbbf24' }} />
                  )}
                  {(r21ModelFilter === 'all' || r21ModelFilter === 'ols') && (
                    <Line type="monotone" dataKey="ols" name="Lineal OLS" stroke="#60a5fa" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 5, fill: '#60a5fa' }} />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* TABLA HISTÓRICA COMPLETA DE LOS 11 AÑOS DE R21 Y PROYECCIÓN 2027 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Tabla Histórica Año a Año */}
            <div className="glass-card p-6 rounded-[28px]">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h4 className="text-base font-display text-white font-bold flex items-center gap-2">
                    <Table size={16} className="text-emerald-400" />
                    Histórico Anual Oficial R21 (2016–2026)
                  </h4>
                  <p className="text-xs text-on-surface-variant">Valores certificados de Devolución IVA de la UPTC.</p>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/20">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-container-low text-on-surface-variant uppercase text-[11px]">
                    <tr>
                      <th className="p-3 font-semibold text-white">Vigencia</th>
                      <th className="p-3 font-semibold text-right text-emerald-300">Total Recaudo ($ COP)</th>
                      <th className="p-3 font-semibold text-right text-white">Millones</th>
                      <th className="p-3 font-semibold text-center text-on-surface-variant">Variación</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-sans">
                    {r21Records.map((r, idx) => {
                      const prev = idx > 0 ? r21Records[idx - 1].totalRecaudo : null;
                      const varP = prev ? ((r.totalRecaudo - prev) / prev) * 100 : null;
                      const isLast = idx === r21Records.length - 1;

                      return (
                        <tr key={r.vigencia} className={`hover:bg-white/5 ${isLast ? 'bg-sky-500/10 font-bold' : ''}`}>
                          <td className="p-3 font-mono font-bold text-white flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            <span>{r.vigencia}</span>
                            {isLast && <span className="text-[10px] bg-sky-500/20 text-sky-300 px-1.5 py-0.2 rounded">Corte Base</span>}
                          </td>
                          <td className="p-3 text-right font-mono text-emerald-300 font-semibold">
                            {formatCurrencyCOP(r.totalRecaudo)}
                          </td>
                          <td className="p-3 text-right font-mono text-white font-bold">
                            {formatCurrencyShortCOP(r.totalRecaudo)}
                          </td>
                          <td className="p-3 text-center font-mono">
                            {varP !== null ? (
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                varP >= 0 ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'
                              }`}>
                                {varP >= 0 ? '+' : ''}{varP.toFixed(1)}%
                              </span>
                            ) : '—'}
                          </td>
                        </tr>
                      );
                    })}

                    {/* Fila Proyectada 2027 */}
                    <tr className="bg-emerald-500/15 border-t-2 border-emerald-500/40 font-bold">
                      <td className="p-3 font-mono font-extrabold text-emerald-400 flex items-center gap-2">
                        <Sparkles size={14} />
                        <span>2027 (Proyección)</span>
                      </td>
                      <td className="p-3 text-right font-mono text-emerald-300 text-sm font-extrabold">
                        {r21BestModel ? formatCurrencyCOP(r21BestModel.projected2027) : '$0'}
                      </td>
                      <td className="p-3 text-right font-mono text-white text-sm font-extrabold">
                        {r21BestModel ? formatCurrencyShortCOP(r21BestModel.projected2027) : '$0'}
                      </td>
                      <td className="p-3 text-center font-mono">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold text-emerald-300 bg-emerald-500/30">
                          +{r21BestModel ? r21BestModel.variationPct.toFixed(1) : 7.0}%
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modelos Matemáticos Evaluados para R21 */}
            <div className="glass-card p-6 rounded-[28px] space-y-4">
              <div>
                <h4 className="text-base font-display text-white font-bold flex items-center gap-2">
                  <Calculator size={16} className="text-emerald-400" />
                  Modelos Matemáticos Proyectados R21 (2027)
                </h4>
                <p className="text-xs text-on-surface-variant">Comparación de estimaciones bajo distintos criterios analíticos.</p>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/20">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-container-low text-on-surface-variant uppercase text-[11px]">
                    <tr>
                      <th className="p-3 font-semibold text-white">Modelo</th>
                      <th className="p-3 font-semibold text-right text-emerald-300">Proy 2027 ($M)</th>
                      <th className="p-3 font-semibold text-center text-white">Var %</th>
                      <th className="p-3 font-semibold text-center text-yellow-300">MAPE</th>
                      <th className="p-3 font-semibold text-center text-white">Tag</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-sans">
                    {r21Models.map(m => (
                      <tr key={m.modelId} className="hover:bg-white/5">
                        <td className="p-3 font-bold text-white flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }}></span>
                          <span>{m.shortName}</span>
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-emerald-300">
                          {formatCurrencyShortCOP(m.projected2027)}
                        </td>
                        <td className="p-3 text-center font-mono">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            m.variationPct >= 0 ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'
                          }`}>
                            {m.variationPct >= 0 ? '+' : ''}{m.variationPct.toFixed(1)}%
                          </span>
                        </td>
                        <td className="p-3 text-center font-mono text-yellow-300">
                          {m.mape.toFixed(1)}%
                        </td>
                        <td className="p-3 text-center">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-on-surface-variant">
                            {m.tag}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Dictamen Técnico R21 */}
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-on-surface-variant leading-relaxed">
                <p>
                  <strong className="text-white">Criterio Institucional para Devolución IVA:</strong> En 2025 la DIAN emitió resoluciones extraordinarias acumuladas (\$7.981M). Para 2027, el modelo más prudente es la <strong>Indexación Macroeconómica MFMP al 7.0% (\$4.999M)</strong> o el promedio trienal <strong>WMA-3 (\$5.561M)</strong>, blindando a la universidad contra rezagos en la expedición de resoluciones tributarias.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECCIÓN 3: CONSOLIDADO GLOBAL (R20 PROPIOS + R21 DEVOLUCIÓN IVA)          */}
      {/* ========================================================================= */}
      {selectedRecursoTab === 'consolidado' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="glass-card p-6 md:p-8 rounded-[28px] border border-indigo-500/30 bg-gradient-to-br from-indigo-500/10 via-surface-container-high/90 to-background shadow-xl">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider font-bold text-indigo-400 bg-indigo-500/20 px-3 py-1 rounded-full border border-indigo-500/30">
                  Autogestión Institucional Consolidada
                </span>
                <h3 className="text-2xl md:text-3xl font-display font-bold text-white tracking-tight mt-2">
                  Consolidado Global: Recursos Propios (R20) + Devolución IVA (R21)
                </h3>
                <p className="text-xs md:text-sm text-on-surface-variant max-w-2xl mt-1 leading-relaxed">
                  Integración total de las dos fuentes de recursos generados por la gestión propia y beneficios tributarios de la Universidad Pedagógica y Tecnológica de Colombia para la vigencia 2027.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-black/40 p-5 rounded-2xl border border-white/15">
                <div className="text-left sm:text-right pr-0 sm:pr-4 border-b sm:border-b-0 sm:border-r border-white/10 pb-3 sm:pb-0">
                  <span className="text-[11px] uppercase tracking-wider text-on-surface-variant block font-medium">Recaudo Combinado 2026</span>
                  <span className="text-xl font-mono font-bold text-sky-300">{formatCurrencyShortCOP(combinedSummary.total.y26)}</span>
                  <span className="text-[10px] font-mono text-on-surface-variant block">{formatCurrencyCOP(combinedSummary.total.y26)}</span>
                </div>

                <div className="text-left sm:text-right">
                  <span className="text-[11px] uppercase tracking-wider text-indigo-400 block font-bold">TOTAL COMBINADO 2027 (R20 + R21)</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-mono font-extrabold text-emerald-400">
                      {formatCurrencyShortCOP(combinedSummary.total.y27)}
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded">
                      +{combinedSummary.total.varPct.toFixed(2)}%
                    </span>
                  </div>
                  <span className="text-[11px] font-mono font-semibold text-white block">
                    {formatCurrencyCOP(combinedSummary.total.y27)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* TABLA COMPARATIVA R20 vs R21 */}
          <div className="glass-card p-6 md:p-8 rounded-[28px]">
            <h4 className="text-lg font-display text-white font-bold mb-4 flex items-center gap-2">
              <Table size={18} className="text-indigo-400" />
              Matriz Comparativa de Composición de Recursos de Autogestión (2024–2027)
            </h4>

            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/20">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-container-low text-on-surface-variant uppercase text-[11px] tracking-wider">
                  <tr>
                    <th className="p-4 font-semibold text-white">Fuente / Recurso Presupuestal</th>
                    <th className="p-4 font-semibold text-right text-on-surface-variant">Recaudo 2024</th>
                    <th className="p-4 font-semibold text-right text-on-surface-variant">Recaudo 2025</th>
                    <th className="p-4 font-semibold text-right text-sky-300">Recaudo 2026 (Base)</th>
                    <th className="p-4 font-semibold text-right text-emerald-300">Proyección 2027 ($ COP)</th>
                    <th className="p-4 font-semibold text-right text-white">Proy 2027 ($M)</th>
                    <th className="p-4 font-semibold text-center text-amber-300">Variación %</th>
                    <th className="p-4 font-semibold text-center text-purple-300">Participación (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-sans">
                  {/* Fila R20 */}
                  <tr className="hover:bg-white/5 transition-colors">
                    <td className="p-4 font-bold text-white flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                      <span>Recurso 20 — Recursos Propios</span>
                    </td>
                    <td className="p-4 text-right font-mono text-on-surface-variant">
                      {formatCurrencyShortCOP(combinedSummary.r20.y24)}
                    </td>
                    <td className="p-4 text-right font-mono text-on-surface-variant">
                      {formatCurrencyShortCOP(combinedSummary.r20.y25)}
                    </td>
                    <td className="p-4 text-right font-mono font-bold text-sky-300">
                      {formatCurrencyShortCOP(combinedSummary.r20.y26)}
                    </td>
                    <td className="p-4 text-right font-mono font-bold text-emerald-300">
                      {formatCurrencyCOP(combinedSummary.r20.y27)}
                    </td>
                    <td className="p-4 text-right font-mono font-bold text-white">
                      {formatCurrencyShortCOP(combinedSummary.r20.y27)}
                    </td>
                    <td className="p-4 text-center font-mono font-bold text-emerald-400">
                      +{matrixSummary.variacionTotalPct.toFixed(2)}%
                    </td>
                    <td className="p-4 text-center font-mono font-bold text-amber-300">
                      {combinedSummary.r20.part.toFixed(1)}%
                    </td>
                  </tr>

                  {/* Fila R21 */}
                  <tr className="hover:bg-white/5 transition-colors">
                    <td className="p-4 font-bold text-white flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                      <span>Recurso 21 — Devolución IVA (IES)</span>
                    </td>
                    <td className="p-4 text-right font-mono text-on-surface-variant">
                      {formatCurrencyShortCOP(combinedSummary.r21.y24)}
                    </td>
                    <td className="p-4 text-right font-mono text-on-surface-variant">
                      {formatCurrencyShortCOP(combinedSummary.r21.y25)}
                    </td>
                    <td className="p-4 text-right font-mono font-bold text-sky-300">
                      {formatCurrencyShortCOP(combinedSummary.r21.y26)}
                    </td>
                    <td className="p-4 text-right font-mono font-bold text-emerald-300">
                      {formatCurrencyCOP(combinedSummary.r21.y27)}
                    </td>
                    <td className="p-4 text-right font-mono font-bold text-white">
                      {formatCurrencyShortCOP(combinedSummary.r21.y27)}
                    </td>
                    <td className="p-4 text-center font-mono font-bold text-emerald-400">
                      +{r21BestModel ? r21BestModel.variationPct.toFixed(2) : 7.00}%
                    </td>
                    <td className="p-4 text-center font-mono font-bold text-emerald-300">
                      {combinedSummary.r21.part.toFixed(1)}%
                    </td>
                  </tr>
                </tbody>

                {/* Total Combinado */}
                <tfoot className="border-t-2 border-indigo-500/40 bg-black/40 font-bold text-white text-xs">
                  <tr className="shadow-lg">
                    <td className="p-4 font-extrabold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                      <Landmark size={16} className="text-indigo-400 shrink-0" />
                      <span>TOTAL COMBINADO (R20 + R21)</span>
                    </td>
                    <td className="p-4 text-right font-mono font-extrabold text-white">
                      {formatCurrencyShortCOP(combinedSummary.total.y24)}
                    </td>
                    <td className="p-4 text-right font-mono font-extrabold text-white">
                      {formatCurrencyShortCOP(combinedSummary.total.y25)}
                    </td>
                    <td className="p-4 text-right font-mono font-extrabold text-sky-300 bg-sky-500/20">
                      {formatCurrencyShortCOP(combinedSummary.total.y26)}
                    </td>
                    <td className="p-4 text-right font-mono font-extrabold text-emerald-300 bg-emerald-500/20 text-sm">
                      {formatCurrencyCOP(combinedSummary.total.y27)}
                    </td>
                    <td className="p-4 text-right font-mono font-extrabold text-white text-sm">
                      {formatCurrencyShortCOP(combinedSummary.total.y27)}
                    </td>
                    <td className="p-4 text-center font-mono font-extrabold text-emerald-400 bg-emerald-500/10">
                      +{combinedSummary.total.varPct.toFixed(2)}%
                    </td>
                    <td className="p-4 text-center font-mono font-extrabold text-indigo-300">
                      100.0%
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
