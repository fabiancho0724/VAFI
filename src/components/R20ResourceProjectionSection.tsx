import React, { useState, useEffect, useMemo } from 'react';
import { 
  ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip as RechartsTooltip, Legend, BarChart, Bar, Cell 
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Calculator, BarChart3, Layers, Download, 
  RefreshCw, SlidersHorizontal, Sparkles, AlertTriangle, CheckCircle2, 
  Info, Building2, Table, Filter, ArrowUpRight, Scale, ChevronDown, ChevronUp,
  Search, CheckCheck, Landmark, DollarSign, Wallet, FileText, Award
} from 'lucide-react';
import { 
  R20Record, R20ForecastModelResult, R20ConceptForecast, 
  R20ConceptMatrixSummary, R20ConceptMatrixRow,
  fetchAndParseR20, loadFallbackRecords, filterR20Data, runAllR20Models, 
  computeConceptMatrix, computeBottomUpConceptForecast, 
  formatCurrencyCOP, formatCurrencyShortCOP, exportProjectionCSV,
  R21_HISTORICAL_RECORDS, fetchAndParseR21, exportR21CSV,
  R10BaseComponent2026, R10_BASE_COMPONENTS_2026, R10_BASE_TOTAL_2026,
  PGN_2027_DATA, R10HistoricalRecord, R10_HISTORICAL_SERIES, exportR10CSV,
  R18HistoricalRecord, R18_HISTORICAL_SERIES, R18_PROJECTION_DATA, exportR18CSV
} from '../lib/r20ProjectionEngine';

export function R20ResourceProjectionSection() {
  // Selector de Recurso Principal: R10.0 (Aportes Nación) | R18 (Art. 87 CESU) | R20 (Propios) | R21 (Devolución IVA) | Consolidado
  const [selectedRecursoTab, setSelectedRecursoTab] = useState<'r10' | 'r18' | 'r20' | 'r21' | 'consolidado'>('r10');

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
  // SERIE DE DATOS PARA GRÁFICO HISTÓRICO RECURSO 10.0 (APORTES NACIÓN)
  // =========================================================================
  const r10ChartSeries = useMemo(() => {
    return R10_HISTORICAL_SERIES.map((h) => ({
      year: `${h.vigencia}`,
      numericYear: h.vigencia,
      vigencia: h.vigencia,
      recaudo: h.totalRecaudo,
      recaudoMillones: Number((h.totalRecaudo / 1e6).toFixed(2)),
      recaudoMilesMillones: Number((h.totalRecaudo / 1e9).toFixed(2)),
      variacionCOP: h.variacionAnualCOP,
      variacionPct: h.variacionAnualPct,
      tipo: h.tipo,
      notaNormativa: h.notaNormativa,
      is2027: h.vigencia === 2027,
      is2026: h.vigencia === 2026
    }));
  }, []);

  // =========================================================================
  // SERIE DE DATOS PARA GRÁFICO HISTÓRICO RECURSO 18 (ART. 87 CESU)
  // =========================================================================
  const r18ChartSeries = useMemo(() => {
    return R18_HISTORICAL_SERIES.map((h) => ({
      year: `${h.vigencia}`,
      numericYear: h.vigencia,
      vigencia: h.vigencia,
      recaudo: h.totalRecaudo,
      recaudoMillones: Number((h.totalRecaudo / 1e6).toFixed(2)),
      variacionCOP: h.variacionAnualCOP,
      variacionPct: h.variacionAnualPct,
      tipo: h.tipo,
      notaNormativa: h.notaNormativa,
      is2027: h.vigencia === 2027
    }));
  }, []);

  // =========================================================================
  // MODELACIÓN COMBINADA INSTITUCIONAL (R10 + R18 + R20 + R21)
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

    const r10_2024 = 252310024180;
    const r10_2025 = 287156616808;
    const r10_2026 = PGN_2027_DATA.basePresupuestal2026; // 351.357.927.407
    const r10_2027 = PGN_2027_DATA.funcionamientoR10;    // 395.704.592.082

    const r18_2024 = R18_PROJECTION_DATA.recaudo2024;    // 1.067.037.785
    const r18_2025 = R18_PROJECTION_DATA.recaudo2025;    // 457.065.634
    const r18_2026 = R18_PROJECTION_DATA.base2026;       // 1.573.078.344
    const r18_2027 = R18_PROJECTION_DATA.proyeccion2027; // 1.676.901.515

    const autogestion_2024 = r20_2024 + r21_2024;
    const autogestion_2025 = r20_2025 + r21_2025;
    const autogestion_2026 = r20_2026 + r21_2026;
    const autogestion_2027 = r20_2027 + r21_2027;
    const varAutogestion = autogestion_2026 > 0 ? ((autogestion_2027 - autogestion_2026) / autogestion_2026) * 100 : 0;

    const nacion_2024 = r10_2024 + r18_2024;
    const nacion_2025 = r10_2025 + r18_2025;
    const nacion_2026 = r10_2026 + r18_2026;
    const nacion_2027 = r10_2027 + r18_2027;
    const varNacion = nacion_2026 > 0 ? ((nacion_2027 - nacion_2026) / nacion_2026) * 100 : 0;

    const grand_total_2024 = nacion_2024 + autogestion_2024;
    const grand_total_2025 = nacion_2025 + autogestion_2025;
    const grand_total_2026 = nacion_2026 + autogestion_2026;
    const grand_total_2027 = nacion_2027 + autogestion_2027;
    const varGrandTotal = grand_total_2026 > 0 ? ((grand_total_2027 - grand_total_2026) / grand_total_2026) * 100 : 0;

    return {
      r10: { y24: r10_2024, y25: r10_2025, y26: r10_2026, y27: r10_2027, part: (r10_2027 / grand_total_2027) * 100, varPct: PGN_2027_DATA.variacionPct },
      r18: { y24: r18_2024, y25: r18_2025, y26: r18_2026, y27: r18_2027, part: (r18_2027 / grand_total_2027) * 100, varPct: R18_PROJECTION_DATA.tasaAumentoPct },
      r20: { y24: r20_2024, y25: r20_2025, y26: r20_2026, y27: r20_2027, part: (r20_2027 / grand_total_2027) * 100 },
      r21: { y24: r21_2024, y25: r21_2025, y26: r21_2026, y27: r21_2027, part: (r21_2027 / grand_total_2027) * 100 },
      nacion: { y24: nacion_2024, y25: nacion_2025, y26: nacion_2026, y27: nacion_2027, varPct: varNacion },
      autogestion: { y24: autogestion_2024, y25: autogestion_2025, y26: autogestion_2026, y27: autogestion_2027, varPct: varAutogestion },
      total: { y24: grand_total_2024, y25: grand_total_2025, y26: grand_total_2026, y27: grand_total_2027, varPct: varGrandTotal }
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
      {/* BARRA SUPERIOR: SELECTOR DE RECURSO PRESUPUESTAL (R10, R20, R21, CONSOLIDADO) */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-surface-container-high/90 to-background p-3.5 rounded-3xl border border-white/10 shadow-lg">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider pl-2 pr-1 flex items-center gap-1.5">
            <Landmark size={14} className="text-cyan-400" /> Fuente Presupuestal:
          </span>

          <button
            onClick={() => setSelectedRecursoTab('r10')}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-bold text-xs transition-all ${
              selectedRecursoTab === 'r10'
                ? 'bg-cyan-500 text-black shadow-lg scale-[1.02]'
                : 'text-on-surface-variant hover:text-white hover:bg-white/5'
            }`}
          >
            <Building2 size={15} />
            <span>Recurso 10.0 (Aportes Nación)</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-black/20 text-white font-bold">
              $395.705M PGN Fijo
            </span>
          </button>

          <button
            onClick={() => setSelectedRecursoTab('r18')}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-bold text-xs transition-all ${
              selectedRecursoTab === 'r18'
                ? 'bg-purple-500 text-white shadow-lg scale-[1.02]'
                : 'text-on-surface-variant hover:text-white hover:bg-white/5'
            }`}
          >
            <Award size={15} />
            <span>Recurso 18 (Art. 87 CESU)</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-black/20 text-white font-bold">
              $1.677M (+6,6%)
            </span>
          </button>

          <button
            onClick={() => setSelectedRecursoTab('r20')}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-bold text-xs transition-all ${
              selectedRecursoTab === 'r20'
                ? 'bg-amber-500 text-black shadow-lg scale-[1.02]'
                : 'text-on-surface-variant hover:text-white hover:bg-white/5'
            }`}
          >
            <Calculator size={15} />
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
            <span>Consolidado Global (R10 + R20 + R21)</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-black/30 text-white font-bold">
              Total Institucional
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
      {/* SECCIÓN 0: RECURSO 10.0 (APORTES DE LA NACIÓN - FUNCIONAMIENTO)           */}
      {/* ========================================================================= */}
      {selectedRecursoTab === 'r10' && (
        <div className="space-y-6 animate-in fade-in">
          {/* HEADER HERO R10 */}
          <div className="bg-gradient-to-br from-surface-container-high/90 to-background border border-cyan-500/30 rounded-[32px] p-6 md:p-8 relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-cyan-500/10 blur-[100px] rounded-full pointer-events-none"></div>

            <div className="relative z-10">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-white/10">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0 border border-cyan-500/30 shadow-lg">
                    <Building2 size={28} />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="text-xs font-mono uppercase tracking-wider font-bold text-cyan-400 bg-cyan-500/20 px-3 py-1 rounded-full border border-cyan-500/30">
                        Presupuesto General de la Nación (PGN 2027)
                      </span>
                      <span className="text-xs font-mono font-bold text-emerald-300 bg-emerald-500/20 px-3 py-1 rounded-full border border-emerald-500/30 flex items-center gap-1">
                        <CheckCircle2 size={13} /> Asignación Fija Garantizada por Ley
                      </span>
                    </div>
                    <h3 className="text-2xl md:text-3xl font-display font-bold text-white tracking-tight mt-2">
                      Recurso 10.0: Aportes de la Nación — Funcionamiento
                    </h3>
                    <p className="text-xs md:text-sm text-on-surface-variant max-w-3xl mt-1 leading-relaxed">
                      Transferencia pública nacional obligatoria decretada en el Presupuesto General de la Nación (PGN 2027) para la 
                      <strong className="text-white"> Universidad Pedagógica y Tecnológica de Colombia (UPTC)</strong>. Al tratarse de una partida legalmente asignada por el Gobierno Nacional bajo los Arts. 86 y 87 de la Ley 30 de 1992, 
                      su valor para 2027 <strong className="text-cyan-300">es fijo y cierto</strong>, sin sujeción a estimaciones probabilísticas ni riesgo de mercado.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end gap-3 shrink-0">
                  <button
                    onClick={exportR10CSV}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all hover:scale-[1.02] cursor-pointer"
                  >
                    <Download size={15} />
                    <span>Descargar Certificado R10 (CSV)</span>
                  </button>
                  <div className="flex items-center gap-2 text-right">
                    <span className="text-[11px] font-mono text-on-surface-variant">
                      Base Presupuestal 2026: <strong className="text-sky-300">{formatCurrencyShortCOP(PGN_2027_DATA.basePresupuestal2026)}</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* TARJETAS KPI DE IMPACTO */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                {/* KPI 1: PGN 2027 Funcionamiento */}
                <div className="p-5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold text-cyan-300 uppercase tracking-wider">
                      Asignación PGN 2027 (R10.0)
                    </span>
                    <span className="text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-200 px-2 py-0.5 rounded border border-cyan-500/30">
                      Fijo por Ley
                    </span>
                  </div>
                  <div>
                    <span className="text-2xl md:text-3xl font-mono font-extrabold text-cyan-300 block">
                      {formatCurrencyShortCOP(PGN_2027_DATA.funcionamientoR10)}
                    </span>
                    <span className="text-[11px] font-mono text-white/90 block mt-0.5">
                      {formatCurrencyCOP(PGN_2027_DATA.funcionamientoR10)}
                    </span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-cyan-500/20 text-[10px] text-on-surface-variant flex items-center justify-between">
                    <span>A. Funcionamiento PGN</span>
                    <strong className="text-cyan-200">100% Garantizado</strong>
                  </div>
                </div>

                {/* KPI 2: Base Presupuestal 2026 */}
                <div className="p-5 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
                      Base Presupuestal 2026
                    </span>
                    <span className="text-[10px] font-mono font-bold bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded border border-sky-500/30">
                      R10.0 a R10.5
                    </span>
                  </div>
                  <div>
                    <span className="text-2xl md:text-3xl font-mono font-bold text-white block">
                      {formatCurrencyShortCOP(PGN_2027_DATA.basePresupuestal2026)}
                    </span>
                    <span className="text-[11px] font-mono text-on-surface-variant block mt-0.5">
                      {formatCurrencyCOP(PGN_2027_DATA.basePresupuestal2026)}
                    </span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-white/10 text-[10px] text-on-surface-variant flex items-center justify-between">
                    <span>5 Sub-recursos Base</span>
                    <strong className="text-sky-300">$258.607M Efec + $92.750M Falt</strong>
                  </div>
                </div>

                {/* KPI 3: Variación Nominal y % */}
                <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold text-emerald-300 uppercase tracking-wider">
                      Crecimiento vs. Base 2026
                    </span>
                    <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-200 px-2 py-0.5 rounded border border-emerald-500/30">
                      +{PGN_2027_DATA.variacionPct.toFixed(2)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-2xl md:text-3xl font-mono font-extrabold text-emerald-400 block">
                      +{formatCurrencyShortCOP(PGN_2027_DATA.variacionNominal)}
                    </span>
                    <span className="text-[11px] font-mono text-emerald-200/90 block mt-0.5">
                      +{formatCurrencyCOP(PGN_2027_DATA.variacionNominal)}
                    </span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-emerald-500/20 text-[10px] text-on-surface-variant flex items-center justify-between">
                    <span>vs. R10 Ordinario 2026</span>
                    <strong className="text-emerald-300">+{PGN_2027_DATA.variacionVsR10OrdinarioPct.toFixed(2)}% (+{formatCurrencyShortCOP(PGN_2027_DATA.variacionVsR10Ordinario)})</strong>
                  </div>
                </div>

                {/* KPI 4: Total PGN Unidad Ejecutora (Incluye Inversión) */}
                <div className="p-5 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold text-purple-300 uppercase tracking-wider">
                      Total Presupuesto PGN 2027
                    </span>
                    <span className="text-[10px] font-mono font-bold bg-purple-500/20 text-purple-200 px-2 py-0.5 rounded border border-purple-500/30">
                      Unidad UPTC
                    </span>
                  </div>
                  <div>
                    <span className="text-2xl md:text-3xl font-mono font-extrabold text-purple-300 block">
                      {formatCurrencyShortCOP(PGN_2027_DATA.totalPresupuestoEjecutora)}
                    </span>
                    <span className="text-[11px] font-mono text-purple-200/90 block mt-0.5">
                      {formatCurrencyCOP(PGN_2027_DATA.totalPresupuestoEjecutora)}
                    </span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-purple-500/20 text-[10px] text-on-surface-variant flex items-center justify-between">
                    <span>Inversión Calidad (2202)</span>
                    <strong className="text-purple-300">{formatCurrencyShortCOP(PGN_2027_DATA.inversion)}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* GRÁFICO HISTÓRICO RECHARTS DE COMPORTAMIENTO (2016-2027) */}
          <div className="glass-card p-6 md:p-8 rounded-[28px] border border-cyan-500/20 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h4 className="text-lg md:text-xl font-display text-white font-bold flex items-center gap-2">
                  <BarChart3 size={20} className="text-cyan-400" />
                  Comportamiento Histórico y Asignación Legal de Aportes de la Nación (2016–2027)
                </h4>
                <p className="text-xs text-on-surface-variant mt-1">
                  Trayectoria anual de transferencias para funcionamiento y salto presupuestal decretado en el PGN 2027 (12 Años).
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <span className="flex items-center gap-1.5 text-xs text-on-surface-variant font-medium">
                  <span className="w-3 h-3 rounded-full bg-cyan-400"></span>
                  Histórico Certificado (2016–2025)
                </span>
                <span className="flex items-center gap-1.5 text-xs text-on-surface-variant font-medium">
                  <span className="w-3 h-3 rounded-full bg-sky-500"></span>
                  Base 2026 ($351.358M)
                </span>
                <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-300">
                  <span className="w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-emerald-500/50"></span>
                  Fijo Ley PGN 2027 ($395.705M)
                </span>
              </div>
            </div>

            <div className="h-[380px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={r10ChartSeries} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <defs>
                    <linearGradient id="r10BarGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#0284c7" stopOpacity={0.5} />
                    </linearGradient>
                    <linearGradient id="r10Bar2027" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#34d399" stopOpacity={1} />
                      <stop offset="100%" stopColor="#059669" stopOpacity={0.7} />
                    </linearGradient>
                    <linearGradient id="r10AreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  
                  <XAxis 
                    dataKey="year" 
                    stroke="#94a3b8" 
                    tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
                    tickLine={{ stroke: '#ffffff20' }}
                  />
                  
                  <YAxis 
                    stroke="#94a3b8" 
                    tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
                    tickLine={{ stroke: '#ffffff20' }}
                    tickFormatter={(val) => `$${(val / 1e9).toFixed(0)}B`}
                    domain={[0, 420000000000]}
                  />

                  <RechartsTooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const item = payload[0].payload;
                      return (
                        <div className="bg-surface-container-high/95 backdrop-blur-md p-4 rounded-2xl border border-white/20 shadow-2xl min-w-[280px]">
                          <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
                            <span className="font-mono font-bold text-white text-sm">
                              Vigencia {item.vigencia}
                            </span>
                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                              item.is2027 
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                                : item.is2026 
                                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                                : 'bg-white/10 text-on-surface-variant'
                            }`}>
                              {item.is2027 ? 'PGN 2027 FIJO POR LEY' : item.is2026 ? 'BASE CONSOLIDADA 2026' : 'CERTIFICADO'}
                            </span>
                          </div>

                          <div className="space-y-1.5 text-xs">
                            <div className="flex justify-between items-baseline">
                              <span className="text-on-surface-variant">Total Recaudo:</span>
                              <span className="font-mono font-bold text-cyan-300 text-sm">
                                {formatCurrencyShortCOP(item.recaudo)}
                              </span>
                            </div>
                            <div className="text-right text-[11px] font-mono text-white/80">
                              {formatCurrencyCOP(item.recaudo)}
                            </div>

                            {item.variacionCOP > 0 && (
                              <div className="flex justify-between items-baseline pt-2 border-t border-white/10">
                                <span className="text-on-surface-variant">Variación vs. año ant:</span>
                                <span className="font-mono font-bold text-emerald-400">
                                  +{formatCurrencyShortCOP(item.variacionCOP)} (+{item.variacionPct.toFixed(2)}%)
                                </span>
                              </div>
                            )}

                            <div className="pt-2 border-t border-white/10 text-[10px] text-on-surface-variant italic">
                              {item.notaNormativa}
                            </div>
                          </div>
                        </div>
                      );
                    }}
                  />

                  <Area 
                    type="monotone" 
                    dataKey="recaudo" 
                    fill="url(#r10AreaGrad)" 
                    stroke="none" 
                  />

                  <Bar dataKey="recaudo" radius={[8, 8, 0, 0]}>
                    {r10ChartSeries.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.is2027 ? 'url(#r10Bar2027)' : entry.is2026 ? '#0284c7' : 'url(#r10BarGradient)'}
                        stroke={entry.is2027 ? '#10b981' : 'none'}
                        strokeWidth={entry.is2027 ? 2 : 0}
                      />
                    ))}
                  </Bar>

                  <Line 
                    type="monotone" 
                    dataKey="recaudo" 
                    stroke="#f59e0b" 
                    strokeWidth={2.5}
                    dot={{ fill: '#f59e0b', r: 4 }}
                    activeDot={{ r: 6, fill: '#f59e0b', stroke: '#fff', strokeWidth: 2 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 p-3.5 rounded-2xl bg-black/30 border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-cyan-300">
                <Info size={16} className="shrink-0" />
                <span>
                  <strong>Análisis de Tendencia:</strong> La curva histórica muestra un crecimiento nominal continuo de <strong>$118.125M (2016)</strong> a <strong>$395.705M (2027)</strong>, multiplicándose por <strong>3.35x</strong> debido a ajustes de IPC salarial, transferencias de fomento y expansión de la gratuidad.
                </span>
              </div>
              <span className="font-mono text-emerald-400 font-bold shrink-0">
                Tasa Crec. 2026 $\rightarrow$ 2027: +12.62%
              </span>
            </div>
          </div>

          {/* TABLA 1: DESGLOSE DE LA BASE PRESUPUESTAL 2026 */}
          <div className="glass-card p-6 md:p-8 rounded-[28px] border border-sky-500/20 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h4 className="text-lg font-display text-white font-bold flex items-center gap-2">
                  <Table size={18} className="text-sky-400" />
                  Tabla 1: Desglose de la Base Presupuestal de Referencia Vigencia 2026 (Recursos R10)
                </h4>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Conformación de la base de comparación de <strong>$ 351.357.927.407 COP</strong> a partir de los componentes ordinarios, PIC y fomento.
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-sky-300 bg-sky-500/10 px-3 py-1.5 rounded-xl border border-sky-500/30">
                Total Base: $ 351.357.927.407 COP
              </span>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/20">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-container-low text-on-surface-variant uppercase text-[11px] tracking-wider">
                  <tr>
                    <th className="p-4 font-semibold text-white">Sub-Recurso</th>
                    <th className="p-4 font-semibold text-white">Denominación Presupuestal</th>
                    <th className="p-4 font-semibold text-right text-emerald-300">Recaudo Efectivo 2026</th>
                    <th className="p-4 font-semibold text-right text-amber-300">Ingreso Faltante 2026</th>
                    <th className="p-4 font-semibold text-right text-sky-300">Total Recaudo 2026 (Base)</th>
                    <th className="p-4 font-semibold text-right text-white">Total ($M)</th>
                    <th className="p-4 font-semibold text-center text-purple-300">Participación (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-sans">
                  {R10_BASE_COMPONENTS_2026.map((comp) => (
                    <tr key={comp.subRecurso} className="hover:bg-white/5 transition-colors">
                      <td className="p-4 font-bold text-sky-300 font-mono">
                        {comp.subRecurso}
                      </td>
                      <td className="p-4 font-medium text-white">
                        {comp.denominacion}
                      </td>
                      <td className="p-4 text-right font-mono text-emerald-300">
                        {formatCurrencyCOP(comp.recaudoEfectivo)}
                      </td>
                      <td className="p-4 text-right font-mono text-amber-300">
                        {comp.ingresoFaltante > 0 ? formatCurrencyCOP(comp.ingresoFaltante) : '$ 0'}
                      </td>
                      <td className="p-4 text-right font-mono font-bold text-sky-300">
                        {formatCurrencyCOP(comp.totalRecaudo)}
                      </td>
                      <td className="p-4 text-right font-mono font-bold text-white">
                        {formatCurrencyShortCOP(comp.totalRecaudo)}
                      </td>
                      <td className="p-4 text-center font-mono font-bold text-purple-300">
                        {comp.participacionPct.toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-sky-500/40 bg-black/40 font-bold text-white text-xs">
                  <tr className="shadow-lg">
                    <td className="p-4 font-extrabold text-sky-400 uppercase tracking-wider" colSpan={2}>
                      TOTAL BASE PRESUPUESTAL 2026 (R10 CONSOLIDADO)
                    </td>
                    <td className="p-4 text-right font-mono font-extrabold text-emerald-300">
                      $ 258.606.602.253
                    </td>
                    <td className="p-4 text-right font-mono font-extrabold text-amber-300">
                      $ 92.750.325.154
                    </td>
                    <td className="p-4 text-right font-mono font-extrabold text-sky-300 bg-sky-500/20 text-sm">
                      $ 351.357.927.407
                    </td>
                    <td className="p-4 text-right font-mono font-extrabold text-white text-sm">
                      $ 351.358M
                    </td>
                    <td className="p-4 text-center font-mono font-extrabold text-purple-300">
                      100.00%
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="mt-4 p-4 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-xs text-on-surface-variant leading-relaxed">
              <strong className="text-white">Importancia de la Base Unificada:</strong> El R10 ordinario (\$327.070M) concentra el 93.09% del recaudo nacional de funcionamiento. Al integrar los sub-recursos R10.1 (PIC Convencional \$7.789M), R10.2 (PIC Territorial \$3.060M), R10.3 (\$2.229M) y R10.5 (\$11.208M), se obtiene la base integral real de <strong>\$ 351.357.927.407 COP</strong>, que sirve de referencia oficial para cuantificar el incremento del <strong>+12.62%</strong> otorgado en el PGN 2027.
            </div>
          </div>

          {/* TABLA 2: SERIE HISTÓRICA OFICIAL CERTIFICADA (2016-2027) */}
          <div className="glass-card p-6 md:p-8 rounded-[28px] border border-cyan-500/20 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h4 className="text-lg font-display text-white font-bold flex items-center gap-2">
                  <Table size={18} className="text-cyan-400" />
                  Tabla 2: Serie Histórica Oficial Certificada de Aportes de la Nación (2016–2027)
                </h4>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Registro oficial año a año de transferencias nacionales para funcionamiento con sus variaciones nominales y porcentuales.
                </p>
              </div>
              <button
                onClick={exportR10CSV}
                className="flex items-center gap-1.5 text-xs text-cyan-300 hover:text-white px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
              >
                <Download size={14} />
                <span>Exportar Tabla CSV</span>
              </button>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/20">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-container-low text-on-surface-variant uppercase text-[11px] tracking-wider">
                  <tr>
                    <th className="p-4 font-semibold text-white">Vigencia</th>
                    <th className="p-4 font-semibold text-on-surface-variant">Concepto Presupuestal</th>
                    <th className="p-4 font-semibold text-on-surface-variant">Recurso</th>
                    <th className="p-4 font-semibold text-right text-cyan-300">Total Recaudo ($ COP)</th>
                    <th className="p-4 font-semibold text-right text-white">Total ($M)</th>
                    <th className="p-4 font-semibold text-right text-emerald-300">Variación Anual ($)</th>
                    <th className="p-4 font-semibold text-center text-amber-300">Variación (%)</th>
                    <th className="p-4 font-semibold text-left text-on-surface-variant">Marco Legal / Nota</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-sans">
                  {R10_HISTORICAL_SERIES.map((h) => {
                    const is2027 = h.vigencia === 2027;
                    const is2026 = h.vigencia === 2026;
                    return (
                      <tr 
                        key={h.vigencia} 
                        className={`transition-colors ${
                          is2027 
                            ? 'bg-emerald-500/10 hover:bg-emerald-500/20 font-semibold' 
                            : is2026 
                            ? 'bg-sky-500/10 hover:bg-sky-500/20 font-medium' 
                            : 'hover:bg-white/5'
                        }`}
                      >
                        <td className="p-4 font-bold font-mono">
                          <span className={`px-2.5 py-1 rounded-lg text-xs ${
                            is2027 
                              ? 'bg-emerald-500 text-black font-extrabold' 
                              : is2026 
                              ? 'bg-sky-500 text-black font-extrabold' 
                              : 'bg-white/10 text-white'
                          }`}>
                            {h.vigencia}
                          </span>
                        </td>
                        <td className={`p-4 ${is2027 ? 'text-emerald-200 font-bold' : is2026 ? 'text-sky-200 font-bold' : 'text-white'}`}>
                          {h.concepto}
                        </td>
                        <td className="p-4 font-mono text-on-surface-variant text-[11px]">
                          {h.recurso}
                        </td>
                        <td className={`p-4 text-right font-mono font-bold ${
                          is2027 ? 'text-emerald-300 text-sm' : is2026 ? 'text-sky-300' : 'text-white'
                        }`}>
                          {formatCurrencyCOP(h.totalRecaudo)}
                        </td>
                        <td className="p-4 text-right font-mono font-bold text-white">
                          {formatCurrencyShortCOP(h.totalRecaudo)}
                        </td>
                        <td className="p-4 text-right font-mono text-emerald-400">
                          {h.variacionAnualCOP > 0 ? `+${formatCurrencyShortCOP(h.variacionAnualCOP)}` : '—'}
                        </td>
                        <td className="p-4 text-center font-mono font-bold">
                          {h.variacionAnualPct > 0 ? (
                            <span className={`px-2 py-0.5 rounded text-[11px] ${
                              is2027 ? 'bg-emerald-500/30 text-emerald-300 font-extrabold' : 'text-emerald-400'
                            }`}>
                              +{h.variacionAnualPct.toFixed(2)}%
                            </span>
                          ) : '—'}
                        </td>
                        <td className="p-4 text-on-surface-variant text-[11px] italic">
                          {h.notaNormativa}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* PANEL DE DICTAMEN TÉCNICO Y MARCO LEGAL */}
          <div className="p-6 md:p-8 rounded-[28px] bg-gradient-to-r from-surface-container-high/90 to-background border border-cyan-500/30 shadow-xl">
            <div className="flex flex-col md:flex-row items-start gap-5">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 border border-cyan-500/30">
                <Scale size={24} />
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono uppercase tracking-wider font-bold text-cyan-400">
                    Dictamen Técnico Financiero Institucional
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Certidumbre 100%
                  </span>
                </div>
                <h4 className="text-xl font-bold text-white tracking-tight">
                  Naturaleza Jurídica y Financiera del Recurso R10.0 en el Presupuesto 2027
                </h4>
                <div className="text-xs md:text-sm text-on-surface-variant space-y-2 leading-relaxed">
                  <p>
                    1. <strong className="text-white">Asignación Fija Garantizada por Ley:</strong> El monto de <strong>$ 395.704.592.082 COP</strong> no constituye una estimación interna ni una meta de gestión comercial, sino una transferencia legal decretada por el Gobierno Nacional en la Ley del Presupuesto General de la Nación (PGN 2027) para la Unidad Ejecutora UPTC (Sub-rubro <em>A. Presupuesto de Funcionamiento</em>).
                  </p>
                  <p>
                    2. <strong className="text-white">Crecimiento Presupuestal:</strong> Frente a la base consolidada de 2026 ($351.358M, que reúne los sub-recursos R10.0 a R10.5), el crecimiento es de <strong>+$ 44.346.664.675 COP (+12.62%)</strong>. Si se compara exclusivamente con el R10 ordinario de 2026 ($327.070M), el incremento real es de <strong>+$ 68.634.424.713 COP (+20.98%)</strong>.
                  </p>
                  <p>
                    3. <strong className="text-white">Inversión Complementaria:</strong> El PGN 2027 asigna adicionalmente a la UPTC la suma de <strong>$ 8.310.959.010 COP</strong> para Inversión en Calidad y Fomento de la Educación Superior (Rubro 2202 / 0700 Intersubsectorial), elevando el total de la unidad ejecutora a <strong>$ 404.015.551.092 COP</strong>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECCIÓN 0.5: RECURSO 18 (ARTÍCULO 87 CESU - CALIDAD Y FOMENTO)            */}
      {/* ========================================================================= */}
      {selectedRecursoTab === 'r18' && (
        <div className="space-y-6 animate-in fade-in">
          {/* HEADER HERO R18 */}
          <div className="bg-gradient-to-br from-surface-container-high/90 to-background border border-purple-500/30 rounded-[32px] p-6 md:p-8 relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-purple-500/10 blur-[100px] rounded-full pointer-events-none"></div>

            <div className="relative z-10">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-white/10">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-purple-500/20 flex items-center justify-center text-purple-400 shrink-0 border border-purple-500/30 shadow-lg">
                    <Award size={28} />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="text-xs font-mono uppercase tracking-wider font-bold text-purple-400 bg-purple-500/20 px-3 py-1 rounded-full border border-purple-500/30">
                        Transferencia con Destinación Específica • CESU
                      </span>
                      <span className="text-xs font-mono font-bold text-emerald-300 bg-emerald-500/20 px-3 py-1 rounded-full border border-emerald-500/30 flex items-center gap-1">
                        <TrendingUp size={13} /> Parámetro Macroeconómico Aprobado: +6,6%
                      </span>
                    </div>
                    <h3 className="text-2xl md:text-3xl font-display font-bold text-white tracking-tight mt-2">
                      Recurso 18: Aportes Artículo 87 CESU
                    </h3>
                    <p className="text-xs md:text-sm text-on-surface-variant max-w-3xl mt-1 leading-relaxed">
                      Recurso de la Nación asignado conforme al <strong className="text-white">Artículo 87 de la Ley 30 de 1992</strong> y distribuido según las fórmulas del Consejo Nacional de Educación Superior (CESU) basadas en acreditación institucional, calidad académica y número de estudiantes. 
                      Dado que no se cuenta con una serie temporal extendida para modelos estocásticos, la proyección 2027 toma como base el recaudo 2026 (<strong className="text-purple-300">$ 1.573.078.344 COP</strong>) indexado con el parámetro macroeconómico oficial aprobado del <strong className="text-emerald-300">+6,6%</strong>.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end gap-3 shrink-0">
                  <button
                    onClick={exportR18CSV}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-purple-500 hover:bg-purple-400 text-white font-bold text-xs shadow-lg shadow-purple-500/20 transition-all hover:scale-[1.02] cursor-pointer"
                  >
                    <Download size={15} />
                    <span>Descargar Certificado R18 (CSV)</span>
                  </button>
                  <div className="flex items-center gap-2 text-right">
                    <span className="text-[11px] font-mono text-on-surface-variant">
                      Base Recaudo 2026: <strong className="text-purple-300">{formatCurrencyShortCOP(R18_PROJECTION_DATA.base2026)}</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* TARJETAS KPI DE IMPACTO */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                {/* KPI 1: Proyección 2027 */}
                <div className="p-5 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold text-purple-300 uppercase tracking-wider">
                      Proyección 2027 (R18)
                    </span>
                    <span className="text-[10px] font-mono font-bold bg-purple-500/20 text-purple-200 px-2 py-0.5 rounded border border-purple-500/30">
                      +6,6% Indexado
                    </span>
                  </div>
                  <div>
                    <span className="text-2xl md:text-3xl font-mono font-extrabold text-purple-300 block">
                      {formatCurrencyShortCOP(R18_PROJECTION_DATA.proyeccion2027)}
                    </span>
                    <span className="text-[11px] font-mono text-white/90 block mt-0.5">
                      {formatCurrencyCOP(R18_PROJECTION_DATA.proyeccion2027)}
                    </span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-purple-500/20 text-[10px] text-on-surface-variant flex items-center justify-between">
                    <span>Base 2026 × 1,066</span>
                    <strong className="text-purple-200">Parámetro Oficial</strong>
                  </div>
                </div>

                {/* KPI 2: Recaudo de Referencia 2026 */}
                <div className="p-5 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
                      Recaudo Referencia 2026
                    </span>
                    <span className="text-[10px] font-mono font-bold bg-white/10 text-white px-2 py-0.5 rounded border border-white/20">
                      Vigencia Base
                    </span>
                  </div>
                  <div>
                    <span className="text-2xl md:text-3xl font-mono font-bold text-white block">
                      {formatCurrencyShortCOP(R18_PROJECTION_DATA.base2026)}
                    </span>
                    <span className="text-[11px] font-mono text-on-surface-variant block mt-0.5">
                      {formatCurrencyCOP(R18_PROJECTION_DATA.base2026)}
                    </span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-white/10 text-[10px] text-on-surface-variant flex items-center justify-between">
                    <span>Recaudo Efectivo</span>
                    <strong className="text-sky-300">$ 1.573.078.344 COP</strong>
                  </div>
                </div>

                {/* KPI 3: Crecimiento Nominal */}
                <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold text-emerald-300 uppercase tracking-wider">
                      Incremento Nominal 2027
                    </span>
                    <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-200 px-2 py-0.5 rounded border border-emerald-500/30">
                      +{R18_PROJECTION_DATA.tasaAumentoPct.toFixed(1)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-2xl md:text-3xl font-mono font-extrabold text-emerald-400 block">
                      +{formatCurrencyShortCOP(R18_PROJECTION_DATA.incrementoNominal)}
                    </span>
                    <span className="text-[11px] font-mono text-emerald-200/90 block mt-0.5">
                      +{formatCurrencyCOP(R18_PROJECTION_DATA.incrementoNominal)}
                    </span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-emerald-500/20 text-[10px] text-on-surface-variant flex items-center justify-between">
                    <span>Variación Anual</span>
                    <strong className="text-emerald-300">+$103,82M Adicionales</strong>
                  </div>
                </div>

                {/* KPI 4: Histórico Reciente */}
                <div className="p-5 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold text-sky-300 uppercase tracking-wider">
                      Histórico Reciente (2024–2025)
                    </span>
                    <span className="text-[10px] font-mono font-bold bg-sky-500/20 text-sky-200 px-2 py-0.5 rounded border border-sky-500/30">
                      Antecedentes
                    </span>
                  </div>
                  <div>
                    <span className="text-2xl md:text-3xl font-mono font-extrabold text-sky-300 block">
                      {formatCurrencyShortCOP(R18_PROJECTION_DATA.recaudo2024)}
                    </span>
                    <span className="text-[11px] font-mono text-sky-200/90 block mt-0.5">
                      2024: $1.067M • 2025: $457M
                    </span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-sky-500/20 text-[10px] text-on-surface-variant flex items-center justify-between">
                    <span>Recaudo 2025</span>
                    <strong className="text-amber-300">{formatCurrencyShortCOP(R18_PROJECTION_DATA.recaudo2025)}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* GRÁFICO HISTÓRICO RECHARTS DE COMPORTAMIENTO (2024-2027) */}
          <div className="glass-card p-6 md:p-8 rounded-[28px] border border-purple-500/20 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h4 className="text-lg md:text-xl font-display text-white font-bold flex items-center gap-2">
                  <BarChart3 size={20} className="text-purple-400" />
                  Evolución y Proyección de Aportes Artículo 87 CESU (2024–2027)
                </h4>
                <p className="text-xs text-on-surface-variant mt-1">
                  Comportamiento histórico de las transferencias CESU y proyección con indexación macroeconómica (+6,6%).
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <span className="flex items-center gap-1.5 text-xs text-on-surface-variant font-medium">
                  <span className="w-3 h-3 rounded-full bg-purple-400"></span>
                  Recaudos Anteriores (2024–2025)
                </span>
                <span className="flex items-center gap-1.5 text-xs text-on-surface-variant font-medium">
                  <span className="w-3 h-3 rounded-full bg-purple-600"></span>
                  Base 2026 ($1.573M)
                </span>
                <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-300">
                  <span className="w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-emerald-500/50"></span>
                  Proyección 2027 ($1.677M)
                </span>
              </div>
            </div>

            <div className="h-[340px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={r18ChartSeries} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <defs>
                    <linearGradient id="r18BarGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#c084fc" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#7e22ce" stopOpacity={0.6} />
                    </linearGradient>
                    <linearGradient id="r18Bar2027" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#34d399" stopOpacity={1} />
                      <stop offset="100%" stopColor="#059669" stopOpacity={0.7} />
                    </linearGradient>
                    <linearGradient id="r18AreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#a855f7" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#a855f7" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  
                  <XAxis 
                    dataKey="year" 
                    stroke="#94a3b8" 
                    tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
                    tickLine={{ stroke: '#ffffff20' }}
                  />
                  
                  <YAxis 
                    stroke="#94a3b8" 
                    tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
                    tickLine={{ stroke: '#ffffff20' }}
                    tickFormatter={(val) => `$${(val / 1e6).toFixed(0)}M`}
                    domain={[0, 2000000000]}
                  />

                  <RechartsTooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const item = payload[0].payload;
                      return (
                        <div className="bg-surface-container-high/95 backdrop-blur-md p-4 rounded-2xl border border-white/20 shadow-2xl min-w-[280px]">
                          <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
                            <span className="font-mono font-bold text-white text-sm">
                              Vigencia {item.vigencia}
                            </span>
                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                              item.is2027 
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                                : 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                            }`}>
                              {item.is2027 ? 'PROYECCIÓN (+6,6%)' : 'HISTÓRICO REAL'}
                            </span>
                          </div>

                          <div className="space-y-1.5 text-xs">
                            <div className="flex justify-between items-baseline">
                              <span className="text-on-surface-variant">Total Recaudo:</span>
                              <span className="font-mono font-bold text-purple-300 text-sm">
                                {formatCurrencyShortCOP(item.recaudo)}
                              </span>
                            </div>
                            <div className="text-right text-[11px] font-mono text-white/80">
                              {formatCurrencyCOP(item.recaudo)}
                            </div>

                            {item.variacionCOP !== 0 && (
                              <div className="flex justify-between items-baseline pt-2 border-t border-white/10">
                                <span className="text-on-surface-variant">Variación vs. año ant:</span>
                                <span className={`font-mono font-bold ${item.variacionCOP >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                  {item.variacionCOP >= 0 ? '+' : ''}{formatCurrencyShortCOP(item.variacionCOP)} ({item.variacionPct >= 0 ? '+' : ''}{item.variacionPct.toFixed(2)}%)
                                </span>
                              </div>
                            )}

                            <div className="pt-2 border-t border-white/10 text-[10px] text-on-surface-variant italic">
                              {item.notaNormativa}
                            </div>
                          </div>
                        </div>
                      );
                    }}
                  />

                  <Area 
                    type="monotone" 
                    dataKey="recaudo" 
                    fill="url(#r18AreaGrad)" 
                    stroke="none" 
                  />

                  <Bar dataKey="recaudo" radius={[8, 8, 0, 0]}>
                    {r18ChartSeries.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.is2027 ? 'url(#r18Bar2027)' : 'url(#r18BarGradient)'}
                        stroke={entry.is2027 ? '#10b981' : 'none'}
                        strokeWidth={entry.is2027 ? 2 : 0}
                      />
                    ))}
                  </Bar>

                  <Line 
                    type="monotone" 
                    dataKey="recaudo" 
                    stroke="#f59e0b" 
                    strokeWidth={2.5}
                    dot={{ fill: '#f59e0b', r: 4 }}
                    activeDot={{ r: 6, fill: '#f59e0b', stroke: '#fff', strokeWidth: 2 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 p-3.5 rounded-2xl bg-black/30 border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-purple-300">
                <Info size={16} className="shrink-0" />
                <span>
                  <strong>Dinámica del Recurso:</strong> Los giros del Artículo 87 CESU dependen de las evaluaciones periódicas de acreditación y calidad de las universidades públicas, oscilando entre <strong>$1.067M (2024)</strong> y <strong>$457M (2025)</strong>, recuperándose fuertemente en <strong>2026 ($1.573M)</strong>.
                </span>
              </div>
              <span className="font-mono text-emerald-400 font-bold shrink-0">
                Ajuste 2027 (+6,6%): $ 1.676.901.515 COP
              </span>
            </div>
          </div>

          {/* TABLA HISTÓRICO Y PROYECCIÓN R18 */}
          <div className="glass-card p-6 md:p-8 rounded-[28px] border border-purple-500/20 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h4 className="text-lg font-display text-white font-bold flex items-center gap-2">
                  <Table size={18} className="text-purple-400" />
                  Tabla: Histórico y Proyección de Recaudos Recurso 18 — Art. 87 CESU (2024–2027)
                </h4>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Detalle cronológico de recaudos certificados y proyección con indexación macroeconómica.
                </p>
              </div>
              <button
                onClick={exportR18CSV}
                className="flex items-center gap-1.5 text-xs text-purple-300 hover:text-white px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
              >
                <Download size={14} />
                <span>Exportar Tabla CSV</span>
              </button>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/20">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-container-low text-on-surface-variant uppercase text-[11px] tracking-wider">
                  <tr>
                    <th className="p-4 font-semibold text-white">Vigencia</th>
                    <th className="p-4 font-semibold text-on-surface-variant">Concepto Presupuestal</th>
                    <th className="p-4 font-semibold text-on-surface-variant">Recurso</th>
                    <th className="p-4 font-semibold text-right text-purple-300">Total Recaudo ($ COP)</th>
                    <th className="p-4 font-semibold text-right text-white">Total ($M)</th>
                    <th className="p-4 font-semibold text-right text-emerald-300">Variación Anual ($)</th>
                    <th className="p-4 font-semibold text-center text-amber-300">Variación (%)</th>
                    <th className="p-4 font-semibold text-left text-on-surface-variant">Criterio / Soporte</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-sans">
                  {R18_HISTORICAL_SERIES.map((h) => {
                    const is2027 = h.vigencia === 2027;
                    const is2026 = h.vigencia === 2026;
                    return (
                      <tr 
                        key={h.vigencia} 
                        className={`transition-colors ${
                          is2027 
                            ? 'bg-emerald-500/10 hover:bg-emerald-500/20 font-semibold' 
                            : is2026 
                            ? 'bg-purple-500/10 hover:bg-purple-500/20 font-medium' 
                            : 'hover:bg-white/5'
                        }`}
                      >
                        <td className="p-4 font-bold font-mono">
                          <span className={`px-2.5 py-1 rounded-lg text-xs ${
                            is2027 
                              ? 'bg-emerald-500 text-black font-extrabold' 
                              : is2026 
                              ? 'bg-purple-500 text-white font-extrabold' 
                              : 'bg-white/10 text-white'
                          }`}>
                            {h.vigencia}
                          </span>
                        </td>
                        <td className={`p-4 ${is2027 ? 'text-emerald-200 font-bold' : is2026 ? 'text-purple-200 font-bold' : 'text-white'}`}>
                          {h.concepto}
                        </td>
                        <td className="p-4 font-mono text-on-surface-variant text-[11px]">
                          {h.recurso}
                        </td>
                        <td className={`p-4 text-right font-mono font-bold ${
                          is2027 ? 'text-emerald-300 text-sm' : is2026 ? 'text-purple-300' : 'text-white'
                        }`}>
                          {formatCurrencyCOP(h.totalRecaudo)}
                        </td>
                        <td className="p-4 text-right font-mono font-bold text-white">
                          {formatCurrencyShortCOP(h.totalRecaudo)}
                        </td>
                        <td className="p-4 text-right font-mono">
                          {h.variacionAnualCOP !== 0 ? (
                            <span className={h.variacionAnualCOP >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                              {h.variacionAnualCOP >= 0 ? '+' : ''}{formatCurrencyShortCOP(h.variacionAnualCOP)}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="p-4 text-center font-mono font-bold">
                          {h.variacionAnualPct !== 0 ? (
                            <span className={`px-2 py-0.5 rounded text-[11px] ${
                              is2027 
                                ? 'bg-emerald-500/30 text-emerald-300 font-extrabold' 
                                : h.variacionAnualPct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}>
                              {h.variacionAnualPct >= 0 ? '+' : ''}{h.variacionAnualPct.toFixed(2)}%
                            </span>
                          ) : '—'}
                        </td>
                        <td className="p-4 text-on-surface-variant text-[11px] italic">
                          {h.notaNormativa}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* PANEL DE JUSTIFICACIÓN METODOLÓGICA */}
          <div className="p-6 md:p-8 rounded-[28px] bg-gradient-to-r from-surface-container-high/90 to-background border border-purple-500/30 shadow-xl">
            <div className="flex flex-col md:flex-row items-start gap-5">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/30">
                <Scale size={24} />
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono uppercase tracking-wider font-bold text-purple-400">
                    Justificación Metodológica Financiera
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    Indexación Macroeconómica Directa
                  </span>
                </div>
                <h4 className="text-xl font-bold text-white tracking-tight">
                  ¿Por qué se aplica indexación macroeconómica (+6,6%) en lugar de modelos ARIMA?
                </h4>
                <div className="text-xs md:text-sm text-on-surface-variant space-y-2 leading-relaxed">
                  <p>
                    1. <strong className="text-white">Insuficiencia de Grados de Libertad para Series Temporales:</strong> Los modelos autorregresivos y de suavizamiento estocástico (ARIMA, Holt-Winters) requieren series históricas continuas con un mínimo técnico de observaciones ($n \ge 10$) para estimar parámetros como la autocorrelación ($\phi_1$) o la deriva ($c$) con validez estadística. Con únicamente 3 vigencias homogéneas de registro (2024–2026), cualquier ajuste econométrico generaría sobreajuste espurio (*overfitting*).
                  </p>
                  <p>
                    2. <strong className="text-white">Aplicación del Parámetro Macroeconómico Oficial:</strong> Siguiendo el acuerdo de directrices macroeconómicas de presupuesto, se indexa el recaudo base 2026 de <strong>$ 1.573.078.344 COP</strong> en un <strong>+6,6%</strong>, arrojando una proyección 2027 de <strong>$ 1.676.901.515 COP</strong>.
                  </p>
                  <p>
                    3. <strong className="text-white">Certeza para la Junta Directiva:</strong> Este método proporciona una cifra prudente, técnicamente defendible y alineada con los parámetros aprobados de política fiscal institucional.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
                  Presupuesto Global Consolidado UPTC
                </span>
                <h3 className="text-2xl md:text-3xl font-display font-bold text-white tracking-tight mt-2">
                  Consolidado Global: Aportes Nación (R10 + R18) + Propios (R20) + Devolución IVA (R21)
                </h3>
                <p className="text-xs md:text-sm text-on-surface-variant max-w-2xl mt-1 leading-relaxed">
                  Visión unificada del presupuesto de ingresos institucional 2027. Integra las asignaciones de la Nación (PGN 2027 y Art. 87 CESU) junto con las proyecciones de autogestión de la UPTC.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-black/40 p-5 rounded-2xl border border-white/15">
                <div className="text-left sm:text-right pr-0 sm:pr-4 border-b sm:border-b-0 sm:border-r border-white/10 pb-3 sm:pb-0">
                  <span className="text-[11px] uppercase tracking-wider text-on-surface-variant block font-medium">Recaudo Total Base 2026</span>
                  <span className="text-xl font-mono font-bold text-sky-300">{formatCurrencyShortCOP(combinedSummary.total.y26)}</span>
                  <span className="text-[10px] font-mono text-on-surface-variant block">{formatCurrencyCOP(combinedSummary.total.y26)}</span>
                </div>

                <div className="text-left sm:text-right">
                  <span className="text-[11px] uppercase tracking-wider text-indigo-400 block font-bold">TOTAL INSTITUCIONAL 2027 (R10+R18+R20+R21)</span>
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

          {/* TABLA COMPARATIVA R10 vs R18 vs R20 vs R21 */}
          <div className="glass-card p-6 md:p-8 rounded-[28px]">
            <h4 className="text-lg font-display text-white font-bold mb-4 flex items-center gap-2">
              <Table size={18} className="text-indigo-400" />
              Matriz Consolidada de Recursos Presupuestales Institucionales (2024–2027)
            </h4>

            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/20">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-container-low text-on-surface-variant uppercase text-[11px] tracking-wider">
                  <tr>
                    <th className="p-4 font-semibold text-white">Fuente / Recurso Presupuestal</th>
                    <th className="p-4 font-semibold text-right text-on-surface-variant">Recaudo 2024</th>
                    <th className="p-4 font-semibold text-right text-on-surface-variant">Recaudo 2025</th>
                    <th className="p-4 font-semibold text-right text-sky-300">Recaudo 2026 (Base)</th>
                    <th className="p-4 font-semibold text-right text-emerald-300">Total 2027 ($ COP)</th>
                    <th className="p-4 font-semibold text-right text-white">Total 2027 ($M)</th>
                    <th className="p-4 font-semibold text-center text-amber-300">Variación %</th>
                    <th className="p-4 font-semibold text-center text-purple-300">Participación (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-sans">
                  {/* Fila R10.0 */}
                  <tr className="hover:bg-white/5 transition-colors bg-cyan-500/5">
                    <td className="p-4 font-bold text-white flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
                      <div>
                        <span>Recurso 10.0 — Aportes de la Nación (Funcionamiento)</span>
                        <span className="text-[10px] block text-cyan-300 font-normal">Fijado por Ley (Presupuesto General de la Nación 2027)</span>
                      </div>
                    </td>
                    <td className="p-4 text-right font-mono text-on-surface-variant">
                      {formatCurrencyShortCOP(combinedSummary.r10.y24)}
                    </td>
                    <td className="p-4 text-right font-mono text-on-surface-variant">
                      {formatCurrencyShortCOP(combinedSummary.r10.y25)}
                    </td>
                    <td className="p-4 text-right font-mono font-bold text-sky-300">
                      {formatCurrencyShortCOP(combinedSummary.r10.y26)}
                    </td>
                    <td className="p-4 text-right font-mono font-bold text-emerald-300">
                      {formatCurrencyCOP(combinedSummary.r10.y27)}
                    </td>
                    <td className="p-4 text-right font-mono font-bold text-white">
                      {formatCurrencyShortCOP(combinedSummary.r10.y27)}
                    </td>
                    <td className="p-4 text-center font-mono font-bold text-emerald-400">
                      +{combinedSummary.r10.varPct.toFixed(2)}%
                    </td>
                    <td className="p-4 text-center font-mono font-bold text-cyan-300">
                      {combinedSummary.r10.part.toFixed(1)}%
                    </td>
                  </tr>

                  {/* Fila R18 */}
                  <tr className="hover:bg-white/5 transition-colors bg-purple-500/5">
                    <td className="p-4 font-bold text-white flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-400"></span>
                      <div>
                        <span>Recurso 18 — Aportes Artículo 87 CESU</span>
                        <span className="text-[10px] block text-purple-300 font-normal">Fondo de calidad CESU (Base 2026 indexada +6,6%)</span>
                      </div>
                    </td>
                    <td className="p-4 text-right font-mono text-on-surface-variant">
                      {formatCurrencyShortCOP(combinedSummary.r18.y24)}
                    </td>
                    <td className="p-4 text-right font-mono text-on-surface-variant">
                      {formatCurrencyShortCOP(combinedSummary.r18.y25)}
                    </td>
                    <td className="p-4 text-right font-mono font-bold text-sky-300">
                      {formatCurrencyShortCOP(combinedSummary.r18.y26)}
                    </td>
                    <td className="p-4 text-right font-mono font-bold text-emerald-300">
                      {formatCurrencyCOP(combinedSummary.r18.y27)}
                    </td>
                    <td className="p-4 text-right font-mono font-bold text-white">
                      {formatCurrencyShortCOP(combinedSummary.r18.y27)}
                    </td>
                    <td className="p-4 text-center font-mono font-bold text-emerald-400">
                      +{combinedSummary.r18.varPct.toFixed(2)}%
                    </td>
                    <td className="p-4 text-center font-mono font-bold text-purple-300">
                      {combinedSummary.r18.part.toFixed(1)}%
                    </td>
                  </tr>

                  {/* Subtotal Aportes Nación (R10 + R18) */}
                  <tr className="bg-cyan-500/10 font-semibold text-cyan-200 border-t border-cyan-500/20">
                    <td className="p-4 pl-8 text-cyan-300 italic flex items-center gap-2">
                      <span>↳ Subtotal Giros de la Nación (R10 + R18)</span>
                    </td>
                    <td className="p-4 text-right font-mono">
                      {formatCurrencyShortCOP(combinedSummary.nacion.y24)}
                    </td>
                    <td className="p-4 text-right font-mono">
                      {formatCurrencyShortCOP(combinedSummary.nacion.y25)}
                    </td>
                    <td className="p-4 text-right font-mono text-sky-200">
                      {formatCurrencyShortCOP(combinedSummary.nacion.y26)}
                    </td>
                    <td className="p-4 text-right font-mono text-emerald-300 font-bold">
                      {formatCurrencyCOP(combinedSummary.nacion.y27)}
                    </td>
                    <td className="p-4 text-right font-mono text-white font-bold">
                      {formatCurrencyShortCOP(combinedSummary.nacion.y27)}
                    </td>
                    <td className="p-4 text-center font-mono text-emerald-300">
                      +{combinedSummary.nacion.varPct.toFixed(2)}%
                    </td>
                    <td className="p-4 text-center font-mono text-cyan-200 font-bold">
                      {(combinedSummary.r10.part + combinedSummary.r18.part).toFixed(1)}%
                    </td>
                  </tr>

                  {/* Fila R20 */}
                  <tr className="hover:bg-white/5 transition-colors">
                    <td className="p-4 font-bold text-white flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                      <div>
                        <span>Recurso 20 — Recursos Propios</span>
                        <span className="text-[10px] block text-amber-300 font-normal">Gestión académica y administrativa (Matrículas, servicios)</span>
                      </div>
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
                      <div>
                        <span>Recurso 21 — Devolución IVA (IES)</span>
                        <span className="text-[10px] block text-emerald-300 font-normal">Beneficio tributario Art. 92 Ley 30 / Art. 481 E.T.</span>
                      </div>
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

                  {/* Subtotal Autogestión (R20 + R21) */}
                  <tr className="bg-white/5 font-semibold text-on-surface-variant border-t border-white/10">
                    <td className="p-4 pl-8 text-on-surface-variant italic flex items-center gap-2">
                      <span>↳ Subtotal Autogestión Institucional (R20 + R21)</span>
                    </td>
                    <td className="p-4 text-right font-mono">
                      {formatCurrencyShortCOP(combinedSummary.autogestion.y24)}
                    </td>
                    <td className="p-4 text-right font-mono">
                      {formatCurrencyShortCOP(combinedSummary.autogestion.y25)}
                    </td>
                    <td className="p-4 text-right font-mono text-sky-200">
                      {formatCurrencyShortCOP(combinedSummary.autogestion.y26)}
                    </td>
                    <td className="p-4 text-right font-mono text-emerald-200">
                      {formatCurrencyCOP(combinedSummary.autogestion.y27)}
                    </td>
                    <td className="p-4 text-right font-mono text-white">
                      {formatCurrencyShortCOP(combinedSummary.autogestion.y27)}
                    </td>
                    <td className="p-4 text-center font-mono text-emerald-300">
                      +{combinedSummary.autogestion.varPct.toFixed(2)}%
                    </td>
                    <td className="p-4 text-center font-mono text-white">
                      {(combinedSummary.r20.part + combinedSummary.r21.part).toFixed(1)}%
                    </td>
                  </tr>
                </tbody>

                {/* Total Combinado General */}
                <tfoot className="border-t-2 border-indigo-500/40 bg-black/40 font-bold text-white text-xs">
                  <tr className="shadow-lg">
                    <td className="p-4 font-extrabold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                      <Landmark size={16} className="text-indigo-400 shrink-0" />
                      <span>TOTAL CONSOLIDADO UPTC (R10 + R18 + R20 + R21)</span>
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
