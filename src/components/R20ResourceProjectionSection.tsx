import React, { useState, useEffect, useMemo } from 'react';
import { 
  ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip as RechartsTooltip, Legend, BarChart, Bar, Cell 
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Calculator, BarChart3, Layers, Download, 
  RefreshCw, SlidersHorizontal, Sparkles, AlertTriangle, CheckCircle2, 
  Info, Building2, Table, Filter, ArrowUpRight, Scale, ChevronDown, ChevronUp,
  Search, CheckCheck, Landmark, DollarSign, Wallet, FileText, Award, GraduationCap,
  Coins, Vote, Printer, Edit3, Save, RotateCcw, FileSpreadsheet, X,
  Activity, ShieldCheck, AlertCircle
} from 'lucide-react';
import { 
  R20Record, R20ForecastModelResult, R20ConceptForecast, 
  R20ConceptMatrixSummary, R20ConceptMatrixRow,
  fetchAndParseR20, loadFallbackRecords, filterR20Data, runAllR20Models, 
  computeConceptMatrix, computeBottomUpConceptForecast, 
  formatCurrencyCOP, formatCurrencyShortCOP, exportProjectionCSV,
  R21_HISTORICAL_RECORDS, fetchAndParseR21, exportR21CSV,
  R10BaseComponent2026, R10_BASE_COMPONENTS_2026, R10_BASE_TOTAL_2026,
  R10_PROJECTION_6PCT_DATA, RECURSOS_NACION_FUNCIONAMIENTO_PROYECCIONES,
  TOTALES_NACION_FUNCIONAMIENTO_PROYECCIONES, exportRecursosNacionProyeccionCSV,
  PGN_2027_DATA, R10HistoricalRecord, R10_HISTORICAL_SERIES, exportR10CSV,
  R18HistoricalRecord, R18_HISTORICAL_SERIES, R18_PROJECTION_DATA, exportR18CSV,
  R14_BASE_2026, R14_HISTORICAL_SERIES, R14_FORECAST_MODELS,
  R14HistoricalRecord, R14ForecastModel, exportR14CSV,
  R13HistoricalRecord, R13ForecastModel, R13_BASE_2026,
  R13_HISTORICAL_SERIES, R13_FORECAST_MODELS, exportR13CSV,
  R17HistoricalRecord, R17ForecastModel, R17_BASE_2026,
  R17_HISTORICAL_SERIES, R17_FORECAST_MODELS, exportR17CSV,
  OFFICIAL_17_CONCEPTS_CATALOG, Official17ConceptDefinition,
  Official17ConceptComputedRow, Official17ConsolidatedSummary,
  computeOfficial17Consolidated, exportConsolidated17ConceptsCSV
} from '../lib/r20ProjectionEngine';
import { RecursosNacionFuncionamientoTable } from './RecursosNacionFuncionamientoTable';

export function R20ResourceProjectionSection() {
  // Selector de Recurso Principal: Recursos Nación Funcionamiento | R10.0 | R13 | R14 | R17 | R18 | R20 | R21 | Consolidado
  const [selectedRecursoTab, setSelectedRecursoTab] = useState<'nacion-funcionamiento' | 'r10' | 'r13' | 'r14' | 'r17' | 'r18' | 'r20' | 'r21' | 'consolidado'>('nacion-funcionamiento');
  const [nacionSearchTerm, setNacionSearchTerm] = useState('');
  const [nacionCategoryFilter, setNacionCategoryFilter] = useState<string>('TODAS');

  // Modelo activo para R13 (Excedentes de Cooperativas)
  const [r13SelectedModel, setR13SelectedModel] = useState<'macro' | 'inercial' | 'wma' | 'media'>('macro');

  // Modelo activo para R14 (Política de Gratuidad)
  const [r14SelectedModel, setR14SelectedModel] = useState<'macro' | 'linear' | 'holt' | 'optimista'>('macro');

  // Modelo activo para R17 (Devolución de Descuento por Votación)
  const [r17SelectedModel, setR17SelectedModel] = useState<'macro' | 'inercial' | 'wma' | 'media'>('macro');

  // Selección y personalización de valores para los 17 conceptos oficiales en el Consolidado
  const [official17Selections, setOfficial17Selections] = useState<Record<string, { modelId: string; customValue?: number }>>({});
  const [isDownloadingConsolidatedPDF, setIsDownloadingConsolidatedPDF] = useState(false);
  const [editingConceptId, setEditingConceptId] = useState<string | null>(null);
  const [customInputValue, setCustomInputValue] = useState<string>('');

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

  // Filtrado y búsqueda para la tabla de Recursos Nación Funcionamiento (+6.0%)
  const filteredNacionProyRows = useMemo(() => {
    return RECURSOS_NACION_FUNCIONAMIENTO_PROYECCIONES.filter(r => {
      const matchCat = nacionCategoryFilter === 'TODAS' || r.categoria === nacionCategoryFilter;
      if (!matchCat) return false;
      if (!nacionSearchTerm.trim()) return true;
      const q = nacionSearchTerm.toLowerCase();
      return (
        r.codigo.toLowerCase().includes(q) ||
        r.subRecurso.toLowerCase().includes(q) ||
        r.nombre.toLowerCase().includes(q) ||
        r.destinacion.toLowerCase().includes(q) ||
        r.marcoLegal.toLowerCase().includes(q) ||
        r.entidad.toLowerCase().includes(q)
      );
    });
  }, [nacionCategoryFilter, nacionSearchTerm]);

  // Datos para gráfico de evolución de Recursos Nación para el Funcionamiento
  const nacionChartData = useMemo(() => {
    return [
      {
        year: '2024',
        r10: TOTALES_NACION_FUNCIONAMIENTO_PROYECCIONES.subtotalR10.historico2024 / 1e6,
        r14: 37090.70,
        otros: (TOTALES_NACION_FUNCIONAMIENTO_PROYECCIONES.historico2024 - TOTALES_NACION_FUNCIONAMIENTO_PROYECCIONES.subtotalR10.historico2024 - 37090700264) / 1e6,
        total: TOTALES_NACION_FUNCIONAMIENTO_PROYECCIONES.historico2024 / 1e6
      },
      {
        year: '2025',
        r10: TOTALES_NACION_FUNCIONAMIENTO_PROYECCIONES.subtotalR10.historico2025 / 1e6,
        r14: 36210.31,
        otros: (TOTALES_NACION_FUNCIONAMIENTO_PROYECCIONES.historico2025 - TOTALES_NACION_FUNCIONAMIENTO_PROYECCIONES.subtotalR10.historico2025 - 36210311946) / 1e6,
        total: TOTALES_NACION_FUNCIONAMIENTO_PROYECCIONES.historico2025 / 1e6
      },
      {
        year: '2026 Base',
        r10: TOTALES_NACION_FUNCIONAMIENTO_PROYECCIONES.subtotalR10.base2026 / 1e6,
        r14: 12640.83,
        otros: (TOTALES_NACION_FUNCIONAMIENTO_PROYECCIONES.base2026 - TOTALES_NACION_FUNCIONAMIENTO_PROYECCIONES.subtotalR10.base2026 - 12640832058) / 1e6,
        total: TOTALES_NACION_FUNCIONAMIENTO_PROYECCIONES.base2026 / 1e6
      },
      {
        year: '2027 Proy (+6%)',
        r10: TOTALES_NACION_FUNCIONAMIENTO_PROYECCIONES.subtotalR10.proyeccion2027 / 1e6,
        r14: 13400.00,
        otros: (TOTALES_NACION_FUNCIONAMIENTO_PROYECCIONES.proyeccion2027 - TOTALES_NACION_FUNCIONAMIENTO_PROYECCIONES.subtotalR10.proyeccion2027 - 13399997861) / 1e6,
        total: TOTALES_NACION_FUNCIONAMIENTO_PROYECCIONES.proyeccion2027 / 1e6
      }
    ];
  }, []);

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
  // MODELACIÓN Y SERIE HISTÓRICA RECURSO 14 (POLÍTICA DE GRATUIDAD)
  // =========================================================================
  const r14ActiveModel = useMemo(() => {
    return R14_FORECAST_MODELS.find(m => m.id === r14SelectedModel) || R14_FORECAST_MODELS[0];
  }, [r14SelectedModel]);

  const r14ChartSeries = useMemo(() => {
    return R14_HISTORICAL_SERIES.map((h) => {
      const is2027 = h.vigencia === 2027;
      const recaudo = is2027 ? r14ActiveModel.projected2027 : h.totalRecaudo;
      const variacionCOP = is2027 ? r14ActiveModel.incrementoNominal : h.variacionAnualCOP;
      const variacionPct = is2027 ? r14ActiveModel.variacionPct : h.variacionAnualPct;

      return {
        year: `${h.vigencia}`,
        numericYear: h.vigencia,
        vigencia: h.vigencia,
        recaudo: recaudo,
        recaudoMillones: Number((recaudo / 1e6).toFixed(2)),
        variacionCOP: variacionCOP,
        variacionPct: variacionPct,
        tipo: h.tipo,
        notaNormativa: is2027 ? `${r14ActiveModel.name} — ${r14ActiveModel.formula}` : h.notaNormativa,
        is2027: is2027,
        is2026: h.vigencia === 2026
      };
    });
  }, [r14ActiveModel]);

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
  // MODELACIÓN Y SERIE HISTÓRICA RECURSO 13 (EXCEDENTES DE COOPERATIVAS)
  // =========================================================================
  const r13ActiveModel = useMemo(() => {
    return R13_FORECAST_MODELS.find(m => m.id === r13SelectedModel) || R13_FORECAST_MODELS[0];
  }, [r13SelectedModel]);

  const r13ChartSeries = useMemo(() => {
    return R13_HISTORICAL_SERIES.map((h) => {
      const is2027 = h.vigencia === 2027;
      const recaudo = is2027 ? r13ActiveModel.projected2027 : h.totalRecaudo;
      const variacionCOP = is2027 ? r13ActiveModel.incrementoNominal : h.variacionAnualCOP;
      const variacionPct = is2027 ? r13ActiveModel.variacionPct : h.variacionAnualPct;

      return {
        year: `${h.vigencia}`,
        numericYear: h.vigencia,
        vigencia: h.vigencia,
        recaudo: recaudo,
        recaudoMillones: Number((recaudo / 1e6).toFixed(2)),
        variacionCOP: variacionCOP,
        variacionPct: variacionPct,
        tipo: h.tipo,
        notaNormativa: is2027 ? `${r13ActiveModel.name} — ${r13ActiveModel.formula}` : h.notaNormativa,
        is2027: is2027,
        is2026: h.vigencia === 2026
      };
    });
  }, [r13ActiveModel]);

  // =========================================================================
  // MODELACIÓN Y SERIE HISTÓRICA RECURSO 17 (DESCUENTO POR VOTACIÓN)
  // =========================================================================
  const r17ActiveModel = useMemo(() => {
    return R17_FORECAST_MODELS.find(m => m.id === r17SelectedModel) || R17_FORECAST_MODELS[0];
  }, [r17SelectedModel]);

  const r17ChartSeries = useMemo(() => {
    return R17_HISTORICAL_SERIES.map((h) => {
      const is2027 = h.vigencia === 2027;
      const recaudo = is2027 ? r17ActiveModel.projected2027 : h.totalRecaudo;
      const variacionCOP = is2027 ? r17ActiveModel.incrementoNominal : h.variacionAnualCOP;
      const variacionPct = is2027 ? r17ActiveModel.variacionPct : h.variacionAnualPct;

      return {
        year: `${h.vigencia}`,
        numericYear: h.vigencia,
        vigencia: h.vigencia,
        recaudo: recaudo,
        recaudoMillones: Number((recaudo / 1e6).toFixed(2)),
        variacionCOP: variacionCOP,
        variacionPct: variacionPct,
        tipo: h.tipo,
        notaNormativa: is2027 ? `${r17ActiveModel.name} — ${r17ActiveModel.formula}` : h.notaNormativa,
        is2027: is2027,
        is2026: h.vigencia === 2026
      };
    });
  }, [r17ActiveModel]);

  // =========================================================================
  // MODELACIÓN COMBINADA INSTITUCIONAL (R10 + R13 + R14 + R17 + R18 + R20 + R21)
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
    const r10_2026 = R10_PROJECTION_6PCT_DATA.basePresupuestal2026; // 351.357.927.407
    const r10_2027 = R10_PROJECTION_6PCT_DATA.proyeccion2027;      // 372.439.403.051 (+6.0% Oficial)

    const r13_2024 = 2078952994;
    const r13_2025 = 2080840690;
    const r13_2026 = R13_BASE_2026;                     // 1.530.000.000
    const r13_2027 = r13ActiveModel.projected2027;      // 1.621.800.000 (o modelo seleccionado)

    const r14_2024 = 37090700264;
    const r14_2025 = 36210311946;
    const r14_2026 = R14_BASE_2026;                     // 49.844.177.233
    const r14_2027 = r14ActiveModel.projected2027;      // 52.834.827.867 (o modelo seleccionado)

    const r17_2024 = 4531561319;
    const r17_2025 = 5183761916;
    const r17_2026 = R17_BASE_2026;                     // 4.728.146.085
    const r17_2027 = r17ActiveModel.projected2027;      // 5.011.834.850 (o modelo seleccionado)

    const r18_2024 = R18_PROJECTION_DATA.recaudo2024;    // 1.067.037.785
    const r18_2025 = R18_PROJECTION_DATA.recaudo2025;    // 457.065.634
    const r18_2026 = R18_PROJECTION_DATA.base2026;       // 1.573.078.344
    const r18_2027 = R18_PROJECTION_DATA.proyeccion2027; // 1.667.463.045

    const autogestion_2024 = r20_2024 + r21_2024;
    const autogestion_2025 = r20_2025 + r21_2025;
    const autogestion_2026 = r20_2026 + r21_2026;
    const autogestion_2027 = r20_2027 + r21_2027;
    const varAutogestion = autogestion_2026 > 0 ? ((autogestion_2027 - autogestion_2026) / autogestion_2026) * 100 : 0;

    const nacion_2024 = r10_2024 + r13_2024 + r14_2024 + r17_2024 + r18_2024;
    const nacion_2025 = r10_2025 + r13_2025 + r14_2025 + r17_2025 + r18_2025;
    const nacion_2026 = r10_2026 + r13_2026 + r14_2026 + r17_2026 + r18_2026;
    const nacion_2027 = r10_2027 + r13_2027 + r14_2027 + r17_2027 + r18_2027;
    const varNacion = nacion_2026 > 0 ? ((nacion_2027 - nacion_2026) / nacion_2026) * 100 : 0;

    const grand_total_2024 = nacion_2024 + autogestion_2024;
    const grand_total_2025 = nacion_2025 + autogestion_2025;
    const grand_total_2026 = nacion_2026 + autogestion_2026;
    const grand_total_2027 = nacion_2027 + autogestion_2027;
    const varGrandTotal = grand_total_2026 > 0 ? ((grand_total_2027 - grand_total_2026) / grand_total_2026) * 100 : 0;

    return {
      r10: { y24: r10_2024, y25: r10_2025, y26: r10_2026, y27: r10_2027, part: (r10_2027 / grand_total_2027) * 100, varPct: R10_PROJECTION_6PCT_DATA.variacionPct },
      r13: { y24: r13_2024, y25: r13_2025, y26: r13_2026, y27: r13_2027, part: (r13_2027 / grand_total_2027) * 100, varPct: r13ActiveModel.variacionPct },
      r14: { y24: r14_2024, y25: r14_2025, y26: r14_2026, y27: r14_2027, part: (r14_2027 / grand_total_2027) * 100, varPct: r14ActiveModel.variacionPct },
      r17: { y24: r17_2024, y25: r17_2025, y26: r17_2026, y27: r17_2027, part: (r17_2027 / grand_total_2027) * 100, varPct: r17ActiveModel.variacionPct },
      r18: { y24: r18_2024, y25: r18_2025, y26: r18_2026, y27: r18_2027, part: (r18_2027 / grand_total_2027) * 100, varPct: R18_PROJECTION_DATA.tasaAumentoPct },
      r20: { y24: r20_2024, y25: r20_2025, y26: r20_2026, y27: r20_2027, part: (r20_2027 / grand_total_2027) * 100 },
      r21: { y24: r21_2024, y25: r21_2025, y26: r21_2026, y27: r21_2027, part: (r21_2027 / grand_total_2027) * 100 },
      nacion: { y24: nacion_2024, y25: nacion_2025, y26: nacion_2026, y27: nacion_2027, varPct: varNacion },
      autogestion: { y24: autogestion_2024, y25: autogestion_2025, y26: autogestion_2026, y27: autogestion_2027, varPct: varAutogestion },
      total: { y24: grand_total_2024, y25: grand_total_2025, y26: grand_total_2026, y27: grand_total_2027, varPct: varGrandTotal }
    };
  }, [matrixSummary, r21Records, r21BestModel, r13ActiveModel, r14ActiveModel, r17ActiveModel]);

  // =========================================================================
  // MODELACIÓN CONSOLIDADA INSTITUCIONAL DE 17 CONCEPTOS OFICIALES
  // =========================================================================
  const effective17Selections = useMemo(() => {
    const map: Record<string, { modelId: string; customValue?: number }> = { ...official17Selections };
    if (!map['c2_r13_cooperativas']) {
      map['c2_r13_cooperativas'] = { modelId: r13SelectedModel };
    }
    if (!map['c4_r14_gratuidad']) {
      map['c4_r14_gratuidad'] = { modelId: r14SelectedModel };
    }
    if (!map['c5_r17_votacion']) {
      map['c5_r17_votacion'] = { modelId: r17SelectedModel };
    }
    return map;
  }, [official17Selections, r13SelectedModel, r14SelectedModel, r17SelectedModel]);

  const official17Consolidated: Official17ConsolidatedSummary = useMemo(() => {
    return computeOfficial17Consolidated(effective17Selections);
  }, [effective17Selections]);

  const handleModelChange17 = (conceptId: string, newModelId: string) => {
    if (newModelId === 'custom') {
      const currentVal = official17Consolidated.rows.find(r => r.id === conceptId)?.projected2027 || 0;
      setEditingConceptId(conceptId);
      setCustomInputValue(String(Math.round(currentVal)));
    } else {
      setOfficial17Selections(prev => ({
        ...prev,
        [conceptId]: { modelId: newModelId, customValue: undefined }
      }));
      if (conceptId === 'c2_r13_cooperativas' && ['macro', 'inercial', 'wma', 'media'].includes(newModelId)) {
        setR13SelectedModel(newModelId as any);
      } else if (conceptId === 'c4_r14_gratuidad' && ['macro', 'linear', 'holt', 'optimista'].includes(newModelId)) {
        setR14SelectedModel(newModelId as any);
      } else if (conceptId === 'c5_r17_votacion' && ['macro', 'inercial', 'wma', 'media'].includes(newModelId)) {
        setR17SelectedModel(newModelId as any);
      }
      if (editingConceptId === conceptId) {
        setEditingConceptId(null);
      }
    }
  };

  const handleSaveCustomValue = (conceptId: string) => {
    const cleanStr = customInputValue.replace(/[^0-9.-]+/g, '');
    const num = parseFloat(cleanStr);
    if (!isNaN(num) && num >= 0) {
      setOfficial17Selections(prev => ({
        ...prev,
        [conceptId]: { modelId: 'custom', customValue: Math.round(num) }
      }));
    }
    setEditingConceptId(null);
  };

  const handleCancelCustomValue = () => {
    setEditingConceptId(null);
  };

  const applyOfficialScenario = () => {
    const sel: Record<string, { modelId: string; customValue?: number }> = {};
    for (const c of OFFICIAL_17_CONCEPTS_CATALOG) {
      sel[c.id] = { modelId: c.defaultModelId };
    }
    setOfficial17Selections(sel);
    setR13SelectedModel('macro');
    setR14SelectedModel('macro');
    setR17SelectedModel('macro');
    setEditingConceptId(null);
  };

  const applyInercialScenario = () => {
    const sel: Record<string, { modelId: string; customValue?: number }> = {};
    for (const c of OFFICIAL_17_CONCEPTS_CATALOG) {
      const inercial = c.models.find(m => m.id === 'inercial');
      sel[c.id] = { modelId: inercial ? 'inercial' : c.defaultModelId };
    }
    setOfficial17Selections(sel);
    setR13SelectedModel('inercial');
    setR14SelectedModel('macro');
    setR17SelectedModel('inercial');
    setEditingConceptId(null);
  };

  const applyStatisticalScenario = () => {
    const sel: Record<string, { modelId: string; customValue?: number }> = {
      'c1_r10_funcionamiento': { modelId: 'pgn' },
      'c2_r13_cooperativas': { modelId: 'wma' },
      'c3_r13_balance': { modelId: 'saldo2026' },
      'c4_r14_gratuidad': { modelId: 'linear' },
      'c5_r17_votacion': { modelId: 'wma' },
      'c6_r18_cesu': { modelId: 'macro' },
      'c17_r21_iva': { modelId: 'holt' }
    };
    for (const c of OFFICIAL_17_CONCEPTS_CATALOG) {
      if (c.grupo === 'propios') {
        sel[c.id] = { modelId: 'ipc7' };
      }
    }
    setOfficial17Selections(sel);
    setR13SelectedModel('wma');
    setR14SelectedModel('linear');
    setR17SelectedModel('wma');
    setEditingConceptId(null);
  };

  const handleDownloadConsolidatedPDF = async () => {
    setIsDownloadingConsolidatedPDF(true);
    const reportTitle = `Consolidado_Proyeccion_UPTC_2027_${new Date().toISOString().slice(0, 10)}`;

    try {
      if (!(window as any).html2pdf) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('No se pudo cargar la librería html2pdf'));
          document.head.appendChild(script);
          setTimeout(() => reject(new Error('Tiempo de espera agotado')), 4000);
        });
      }

      const element = document.getElementById('printable-consolidated-projection');
      if (!element || !(window as any).html2pdf) {
        window.print();
        setIsDownloadingConsolidatedPDF(false);
        return;
      }

      const clone = element.cloneNode(true) as HTMLElement;
      clone.id = 'printable-consolidated-projection-clone';
      clone.style.position = 'fixed';
      clone.style.left = '-9999px';
      clone.style.top = '0';
      clone.style.width = '1250px';
      clone.style.display = 'block';
      clone.style.visibility = 'visible';
      clone.style.opacity = '1';
      clone.style.background = '#ffffff';
      clone.style.color = '#0f172a';

      clone.querySelectorAll('*').forEach((el: any) => {
        el.style.visibility = 'visible';
        el.style.opacity = '1';
      });

      document.body.appendChild(clone);

      const opt = {
        margin: [6, 6, 6, 6],
        filename: `${reportTitle}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false
        },
        jsPDF: { unit: 'mm', format: 'letter', orientation: 'landscape' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };

      await (window as any).html2pdf().set(opt).from(clone).save();
      if (document.body.contains(clone)) {
        document.body.removeChild(clone);
      }
    } catch (err) {
      console.warn('Fallback a impresión nativa:', err);
      window.print();
    } finally {
      setIsDownloadingConsolidatedPDF(false);
    }
  };

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
            onClick={() => setSelectedRecursoTab('nacion-funcionamiento')}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-bold text-xs transition-all ${
              selectedRecursoTab === 'nacion-funcionamiento'
                ? 'bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-500 text-white shadow-lg shadow-cyan-500/20 scale-[1.02]'
                : 'text-on-surface-variant hover:text-white hover:bg-white/5'
            }`}
          >
            <ShieldCheck size={15} className="text-cyan-300" />
            <span>Recursos Nación para el Funcionamiento</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-black/30 text-cyan-200 font-bold border border-cyan-400/30">
              $433.575M (+6% Gob)
            </span>
          </button>

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
              $372.439M (+6%)
            </span>
          </button>

          <button
            onClick={() => setSelectedRecursoTab('r13')}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-bold text-xs transition-all ${
              selectedRecursoTab === 'r13'
                ? 'bg-amber-600 text-white shadow-lg scale-[1.02]'
                : 'text-on-surface-variant hover:text-white hover:bg-white/5'
            }`}
          >
            <Coins size={15} />
            <span>Excedentes Cooperativas Art.142, Ley 1819 del 2016</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-black/20 text-white font-bold">
              $1.622M (+6%)
            </span>
          </button>

          <button
            onClick={() => setSelectedRecursoTab('r14')}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-bold text-xs transition-all ${
              selectedRecursoTab === 'r14'
                ? 'bg-teal-500 text-black shadow-lg scale-[1.02]'
                : 'text-on-surface-variant hover:text-white hover:bg-white/5'
            }`}
          >
            <GraduationCap size={15} />
            <span>Recurso 14 (Política Gratuidad)</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-black/20 text-white font-bold">
              $52.835M (+6%)
            </span>
          </button>

          <button
            onClick={() => setSelectedRecursoTab('r17')}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-bold text-xs transition-all ${
              selectedRecursoTab === 'r17'
                ? 'bg-sky-500 text-black shadow-lg scale-[1.02]'
                : 'text-on-surface-variant hover:text-white hover:bg-white/5'
            }`}
          >
            <Vote size={15} />
            <span>Recurso 17 (Descuento Votación)</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-black/20 text-white font-bold">
              $5.012M (+6%)
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
              $1.667M (+6%)
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
            <span>Consolidado Global (R10 + R13 + R14 + R17 + R18 + R20 + R21)</span>
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
      {/* SECCIÓN ESPECIAL: RECURSOS NACIÓN PARA EL FUNCIONAMIENTO (POLÍTICA +6.0%)  */}
      {/* ========================================================================= */}
      {selectedRecursoTab === 'nacion-funcionamiento' && (
        <div className="space-y-6 animate-in fade-in">
          {/* HEADER HERO NACIÓN FUNCIONAMIENTO */}
          <div className="bg-gradient-to-br from-surface-container-high/90 to-background border border-cyan-500/30 rounded-[32px] p-6 md:p-8 relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-cyan-500/10 blur-[100px] rounded-full pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-blue-500/10 blur-[100px] rounded-full pointer-events-none"></div>

            <div className="relative z-10">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-white/10">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/30 to-blue-600/30 flex items-center justify-center text-cyan-300 shrink-0 border border-cyan-400/40 shadow-xl">
                    <ShieldCheck size={30} />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="text-xs font-mono uppercase tracking-wider font-bold text-cyan-300 bg-cyan-500/20 px-3 py-1 rounded-full border border-cyan-500/30 flex items-center gap-1.5">
                        <TrendingUp size={13} /> Directriz de Política: Crecimiento Fijo +6.0%
                      </span>
                      <span className="text-xs font-mono font-bold text-emerald-300 bg-emerald-500/20 px-3 py-1 rounded-full border border-emerald-500/30 flex items-center gap-1">
                        <CheckCircle2 size={13} /> 9 Recursos Nacionales de Funcionamiento
                      </span>
                      <span className="text-xs font-mono font-bold text-sky-300 bg-sky-500/20 px-3 py-1 rounded-full border border-sky-500/30">
                        Vigencia Fiscal 2027
                      </span>
                    </div>
                    <h3 className="text-2xl md:text-3xl font-display font-bold text-white tracking-tight mt-2">
                      Recursos Nación para el Funcionamiento — Proyecciones Oficiales (+6.0%)
                    </h3>
                    <p className="text-xs md:text-sm text-on-surface-variant max-w-4xl mt-1 leading-relaxed">
                      Consolidación integral de todas las fuentes y transferencias provenientes del Presupuesto General de la Nación para el funcionamiento de la <strong className="text-white">Universidad Pedagógica y Tecnológica de Colombia (UPTC)</strong>: 
                      <strong className="text-cyan-300"> R10, R10.1, R10.2, R10.3, R10.5, R13, R14, R17 y R18</strong>. 
                      Bajo la directriz fiscal de transferencias, los recursos gubernamentales se proyectan con un incremento uniforme del <strong className="text-emerald-300">+6,0%</strong> sobre la base de referencia certificada 2026 (<strong className="text-white">$ 409.033,3 M</strong>), alcanzando un valor total para 2027 de <strong className="text-cyan-300">$ 433.575,3 M COP</strong> (+<strong className="text-emerald-400">$ 24.542,0 M COP</strong>).
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end gap-3 shrink-0">
                  <button
                    onClick={exportRecursosNacionProyeccionCSV}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all hover:scale-[1.02] cursor-pointer"
                  >
                    <Download size={15} />
                    <span>Descargar Proyecciones Nación (+6% CSV)</span>
                  </button>
                  <div className="flex items-center gap-2 text-right">
                    <span className="text-[11px] font-mono text-on-surface-variant">
                      Base Presupuestal 2026: <strong className="text-sky-300">{formatCurrencyShortCOP(TOTALES_NACION_FUNCIONAMIENTO_PROYECCIONES.base2026)}</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* TARJETAS KPI DE IMPACTO */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                {/* KPI 1: Proyección Total Nación 2027 */}
                <div className="p-5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex flex-col justify-between shadow-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold text-cyan-300 uppercase tracking-wider">
                      Proyección Nación 2027 (+6%)
                    </span>
                    <span className="text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-200 px-2 py-0.5 rounded border border-cyan-500/30">
                      Total 9 Recursos
                    </span>
                  </div>
                  <div>
                    <span className="text-2xl md:text-3xl font-mono font-extrabold text-cyan-300 block">
                      {formatCurrencyShortCOP(TOTALES_NACION_FUNCIONAMIENTO_PROYECCIONES.proyeccion2027)}
                    </span>
                    <span className="text-[11px] font-mono text-white/90 block mt-0.5">
                      {formatCurrencyCOP(TOTALES_NACION_FUNCIONAMIENTO_PROYECCIONES.proyeccion2027)}
                    </span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-cyan-500/20 text-[10px] text-on-surface-variant flex items-center justify-between">
                    <span>9 Fuentes de Funcionamiento</span>
                    <strong className="text-cyan-200">+6,00% Fijado</strong>
                  </div>
                </div>

                {/* KPI 2: Base Consolidada 2026 */}
                <div className="p-5 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between shadow-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
                      Base Consolidada 2026
                    </span>
                    <span className="text-[10px] font-mono font-bold bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded border border-sky-500/30">
                      R10 + R13 a R18
                    </span>
                  </div>
                  <div>
                    <span className="text-2xl md:text-3xl font-mono font-bold text-white block">
                      {formatCurrencyShortCOP(TOTALES_NACION_FUNCIONAMIENTO_PROYECCIONES.base2026)}
                    </span>
                    <span className="text-[11px] font-mono text-on-surface-variant block mt-0.5">
                      {formatCurrencyCOP(TOTALES_NACION_FUNCIONAMIENTO_PROYECCIONES.base2026)}
                    </span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-white/10 text-[10px] text-on-surface-variant flex items-center justify-between">
                    <span>Referencia Certificada</span>
                    <strong className="text-sky-300">Base Histórica 2026</strong>
                  </div>
                </div>

                {/* KPI 3: Incremento Nominal Total (+6%) */}
                <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col justify-between shadow-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold text-emerald-300 uppercase tracking-wider">
                      Incremento Total (+6.0%)
                    </span>
                    <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-200 px-2 py-0.5 rounded border border-emerald-500/30">
                      +{TOTALES_NACION_FUNCIONAMIENTO_PROYECCIONES.tasaAumentoPct.toFixed(2)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-2xl md:text-3xl font-mono font-extrabold text-emerald-400 block">
                      +{formatCurrencyShortCOP(TOTALES_NACION_FUNCIONAMIENTO_PROYECCIONES.incrementoNominal)}
                    </span>
                    <span className="text-[11px] font-mono text-emerald-200/90 block mt-0.5">
                      +{formatCurrencyCOP(TOTALES_NACION_FUNCIONAMIENTO_PROYECCIONES.incrementoNominal)}
                    </span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-emerald-500/20 text-[10px] text-on-surface-variant flex items-center justify-between">
                    <span>Crecimiento Gubernamental</span>
                    <strong className="text-emerald-300">+6,00% General</strong>
                  </div>
                </div>

                {/* KPI 4: Proyección Subtotal R10 Unificado */}
                <div className="p-5 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex flex-col justify-between shadow-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold text-purple-300 uppercase tracking-wider">
                      Subtotal R10 Unificado (2027)
                    </span>
                    <span className="text-[10px] font-mono font-bold bg-purple-500/20 text-purple-200 px-2 py-0.5 rounded border border-purple-500/30">
                      94,1% de la Nación
                    </span>
                  </div>
                  <div>
                    <span className="text-2xl md:text-3xl font-mono font-extrabold text-purple-300 block">
                      {formatCurrencyShortCOP(TOTALES_NACION_FUNCIONAMIENTO_PROYECCIONES.subtotalR10.proyeccion2027)}
                    </span>
                    <span className="text-[11px] font-mono text-purple-200/90 block mt-0.5">
                      {formatCurrencyCOP(TOTALES_NACION_FUNCIONAMIENTO_PROYECCIONES.subtotalR10.proyeccion2027)}
                    </span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-purple-500/20 text-[10px] text-on-surface-variant flex items-center justify-between">
                    <span>Base 2026: $351.358M</span>
                    <strong className="text-purple-300">+${formatCurrencyShortCOP(TOTALES_NACION_FUNCIONAMIENTO_PROYECCIONES.subtotalR10.incrementoNominal)}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* GRÁFICO RECHARTS: TRAYECTORIA Y COMPOSICIÓN DE RECURSOS NACIÓN */}
          <div className="glass-card p-6 md:p-8 rounded-[28px] border border-cyan-500/20 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h4 className="text-lg md:text-xl font-display text-white font-bold flex items-center gap-2">
                  <BarChart3 size={20} className="text-cyan-400" />
                  Evolución Histórica y Proyección de los Recursos de la Nación (2024–2027)
                </h4>
                <p className="text-xs text-on-surface-variant mt-1">
                  Comportamiento comparativo de transferencias de funcionamiento ($ M) aplicando la regla de incremento del +6.0% para 2027.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <span className="flex items-center gap-1.5 text-xs text-on-surface-variant font-medium">
                  <span className="w-3 h-3 rounded-full bg-cyan-400"></span>
                  R10 Consolidado (Base)
                </span>
                <span className="flex items-center gap-1.5 text-xs text-on-surface-variant font-medium">
                  <span className="w-3 h-3 rounded-full bg-teal-400"></span>
                  R14 Gratuidad FSE
                </span>
                <span className="flex items-center gap-1.5 text-xs text-on-surface-variant font-medium">
                  <span className="w-3 h-3 rounded-full bg-amber-400"></span>
                  Otros Recursos (R13, R17, R18)
                </span>
              </div>
            </div>

            <div className="h-64 sm:h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={nacionChartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis dataKey="year" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis 
                    stroke="#94a3b8" 
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    tickFormatter={(v) => `$${(v / 1e3).toFixed(0)}k M`}
                  />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                    formatter={(val: any, name: any) => [
                      `$ ${Number(val).toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} M`,
                      name === 'r10' ? 'R10 Consolidado' : name === 'r14' ? 'R14 Gratuidad' : name === 'otros' ? 'Otros (R13, R17, R18)' : 'Total'
                    ]}
                  />
                  <Bar dataKey="r10" name="r10" fill="#06b6d4" stackId="a" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="r14" name="r14" fill="#14b8a6" stackId="a" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="otros" name="otros" fill="#f59e0b" stackId="a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* TABLA 1: DESGLOSE COMPLETO HISTÓRICO Y PROYECCIÓN 2027 (+6.0%) */}
          <div className="glass-card p-6 md:p-8 rounded-[28px] border border-cyan-500/20 shadow-xl">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
              <div>
                <h4 className="text-lg md:text-xl font-display text-white font-bold flex items-center gap-2">
                  <Table size={20} className="text-cyan-400" />
                  Tabla Oficial: Históricos y Proyecciones 2027 (+6.0%) de Recursos Nación para el Funcionamiento
                </h4>
                <p className="text-xs text-on-surface-variant mt-1">
                  Desglose oficial de las 9 fuentes nacionales con sus históricos certificados (2024–2025), la Base Presupuestal 2026 y el cálculo proyectado con el aumento del <strong>+6,0%</strong> para 2027.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                  <input
                    type="text"
                    placeholder="Buscar recurso..."
                    value={nacionSearchTerm}
                    onChange={(e) => setNacionSearchTerm(e.target.value)}
                    className="pl-8 pr-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-white/40 focus:outline-none focus:border-cyan-400 w-44"
                  />
                </div>

                <button
                  onClick={exportRecursosNacionProyeccionCSV}
                  className="flex items-center gap-1.5 text-xs text-cyan-300 hover:text-white px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                >
                  <Download size={14} />
                  <span>Exportar CSV</span>
                </button>
              </div>
            </div>

            {/* FILTRO DE CATEGORÍAS */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {['TODAS', 'Base Presupuestal', 'Fomento y Calidad', 'Gratuidad', 'Transferencia Especial'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setNacionCategoryFilter(cat)}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                    nacionCategoryFilter === cat
                      ? 'bg-cyan-500 text-black shadow-md'
                      : 'bg-white/5 text-on-surface-variant hover:text-white hover:bg-white/10'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* TABLA PRINCIPAL DE PROYECCIÓN NACIÓN */}
            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/20">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-container-low text-on-surface-variant uppercase text-[11px] tracking-wider">
                  <tr>
                    <th className="p-4 font-semibold text-white">Recurso</th>
                    <th className="p-4 font-semibold text-white">Denominación Presupuestal</th>
                    <th className="p-4 font-semibold text-on-surface-variant">Marco Legal / Entidad</th>
                    <th className="p-4 font-semibold text-right text-slate-300">Histórico 2024</th>
                    <th className="p-4 font-semibold text-right text-slate-300">Histórico 2025</th>
                    <th className="p-4 font-semibold text-right text-sky-300">Base 2026</th>
                    <th className="p-4 font-semibold text-center text-amber-300">Aumento</th>
                    <th className="p-4 font-semibold text-right text-emerald-300">Incremento (+6%)</th>
                    <th className="p-4 font-semibold text-right text-cyan-300 font-bold">Proyección 2027 (+6%)</th>
                    <th className="p-4 font-semibold text-right text-white">Total ($M)</th>
                    <th className="p-4 font-semibold text-center text-purple-300">Part. (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-sans">
                  {filteredNacionProyRows.map((r) => (
                    <tr key={r.codigo} className="hover:bg-white/5 transition-colors">
                      <td className="p-4 font-bold font-mono text-sky-300 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs">
                          {r.subRecurso}
                        </span>
                      </td>
                      <td className="p-4">
                        <strong className="text-white block">{r.nombre}</strong>
                        <span className="text-[11px] text-on-surface-variant block mt-0.5">{r.destinacion}</span>
                      </td>
                      <td className="p-4 text-[11px] text-on-surface-variant">
                        <span className="text-white block font-medium">{r.marcoLegal}</span>
                        <span className="text-cyan-400/80 block mt-0.5">{r.entidad}</span>
                      </td>
                      <td className="p-4 text-right font-mono text-slate-300 whitespace-nowrap">
                        {r.historico2024 > 0 ? formatCurrencyCOP(r.historico2024) : '—'}
                      </td>
                      <td className="p-4 text-right font-mono text-slate-300 whitespace-nowrap">
                        {r.historico2025 > 0 ? formatCurrencyCOP(r.historico2025) : '—'}
                      </td>
                      <td className="p-4 text-right font-mono font-semibold text-sky-300 whitespace-nowrap">
                        {formatCurrencyCOP(r.base2026)}
                      </td>
                      <td className="p-4 text-center font-mono whitespace-nowrap">
                        {r.indexado ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold text-[10px]">
                            0,0% Indexado
                          </span>
                        ) : r.subRecurso === 'R10' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-bold text-[10px]" title="Absorbe el incremento del +6.0% de la base unificada de $351.357M">
                            +{r.tasaAumentoPct.toFixed(2)}%*
                          </span>
                        ) : (
                          <span className="font-bold text-amber-300">
                            +{r.tasaAumentoPct.toFixed(2)}%
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right font-mono whitespace-nowrap">
                        {r.indexado ? (
                          <span className="text-slate-400 font-medium">+$ 0</span>
                        ) : (
                          <span className="font-medium text-emerald-300">+{formatCurrencyCOP(r.incrementoNominal)}</span>
                        )}
                      </td>
                      <td className="p-4 text-right font-mono font-extrabold text-cyan-300 whitespace-nowrap">
                        {formatCurrencyCOP(r.proyeccion2027)}
                      </td>
                      <td className="p-4 text-right font-mono font-bold text-white whitespace-nowrap">
                        {formatCurrencyShortCOP(r.proyeccion2027)}
                      </td>
                      <td className="p-4 text-center font-mono font-bold text-purple-300 whitespace-nowrap">
                        {r.participacion2027Pct.toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-cyan-500/40 bg-black/40 font-bold text-white text-xs">
                  {/* SUBTOTAL R10 CONSOLIDADO */}
                  <tr className="bg-sky-500/10 border-b border-white/10">
                    <td className="p-4 font-extrabold text-sky-300 uppercase tracking-wider font-mono" colSpan={3}>
                      SUBTOTAL R10 UNIFICADO (R10 + R10.1 + R10.2 + R10.3 + R10.5)
                    </td>
                    <td className="p-4 text-right font-mono font-extrabold text-slate-300 whitespace-nowrap">
                      {formatCurrencyCOP(TOTALES_NACION_FUNCIONAMIENTO_PROYECCIONES.subtotalR10.historico2024)}
                    </td>
                    <td className="p-4 text-right font-mono font-extrabold text-slate-300 whitespace-nowrap">
                      {formatCurrencyCOP(TOTALES_NACION_FUNCIONAMIENTO_PROYECCIONES.subtotalR10.historico2025)}
                    </td>
                    <td className="p-4 text-right font-mono font-extrabold text-sky-300 whitespace-nowrap">
                      {formatCurrencyCOP(TOTALES_NACION_FUNCIONAMIENTO_PROYECCIONES.subtotalR10.base2026)}
                    </td>
                    <td className="p-4 text-center font-mono font-extrabold text-amber-300">
                      +6,00%
                    </td>
                    <td className="p-4 text-right font-mono font-extrabold text-emerald-300 whitespace-nowrap">
                      +{formatCurrencyCOP(TOTALES_NACION_FUNCIONAMIENTO_PROYECCIONES.subtotalR10.incrementoNominal)}
                    </td>
                    <td className="p-4 text-right font-mono font-extrabold text-cyan-300 whitespace-nowrap">
                      {formatCurrencyCOP(TOTALES_NACION_FUNCIONAMIENTO_PROYECCIONES.subtotalR10.proyeccion2027)}
                    </td>
                    <td className="p-4 text-right font-mono font-extrabold text-white whitespace-nowrap">
                      {formatCurrencyShortCOP(TOTALES_NACION_FUNCIONAMIENTO_PROYECCIONES.subtotalR10.proyeccion2027)}
                    </td>
                    <td className="p-4 text-center font-mono font-extrabold text-purple-300">
                      {((TOTALES_NACION_FUNCIONAMIENTO_PROYECCIONES.subtotalR10.proyeccion2027 / TOTALES_NACION_FUNCIONAMIENTO_PROYECCIONES.proyeccion2027) * 100).toFixed(2)}%
                    </td>
                  </tr>

                  {/* TOTAL GENERAL RECURSOS NACIÓN PARA FUNCIONAMIENTO */}
                  <tr className="bg-black/60 shadow-xl">
                    <td className="p-4 font-extrabold text-cyan-300 uppercase tracking-wider text-sm" colSpan={3}>
                      TOTAL RECURSOS NACIÓN PARA EL FUNCIONAMIENTO (9 RECURSOS)
                    </td>
                    <td className="p-4 text-right font-mono font-extrabold text-slate-200 whitespace-nowrap">
                      {formatCurrencyCOP(TOTALES_NACION_FUNCIONAMIENTO_PROYECCIONES.historico2024)}
                    </td>
                    <td className="p-4 text-right font-mono font-extrabold text-slate-200 whitespace-nowrap">
                      {formatCurrencyCOP(TOTALES_NACION_FUNCIONAMIENTO_PROYECCIONES.historico2025)}
                    </td>
                    <td className="p-4 text-right font-mono font-extrabold text-sky-300 whitespace-nowrap">
                      {formatCurrencyCOP(TOTALES_NACION_FUNCIONAMIENTO_PROYECCIONES.base2026)}
                    </td>
                    <td className="p-4 text-center font-mono font-extrabold text-amber-300 text-sm">
                      +6,00%
                    </td>
                    <td className="p-4 text-right font-mono font-extrabold text-emerald-300 whitespace-nowrap">
                      +{formatCurrencyCOP(TOTALES_NACION_FUNCIONAMIENTO_PROYECCIONES.incrementoNominal)}
                    </td>
                    <td className="p-4 text-right font-mono font-extrabold text-cyan-300 bg-cyan-500/20 text-sm whitespace-nowrap">
                      {formatCurrencyCOP(TOTALES_NACION_FUNCIONAMIENTO_PROYECCIONES.proyeccion2027)}
                    </td>
                    <td className="p-4 text-right font-mono font-extrabold text-white text-sm whitespace-nowrap">
                      {formatCurrencyShortCOP(TOTALES_NACION_FUNCIONAMIENTO_PROYECCIONES.proyeccion2027)}
                    </td>
                    <td className="p-4 text-center font-mono font-extrabold text-purple-300">
                      100.00%
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="mt-4 p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-xs text-on-surface-variant leading-relaxed">
              <strong className="text-white">Conclusión Técnica del Escenario Oficial 2027:</strong> El valor total de los recursos de funcionamiento para la vigencia 2027 está fijado legalmente en <strong>$ 395.704.592.082 COP</strong> ($ 395.705M) y equivale a la sumatoria exacta de los <strong>9 recursos proyectados de la Nación</strong> (R10, R10.1, R10.2, R10.3, R10.5, R13, R14, R17 y R18). Al aplicar el incremento del <strong>+6,0%</strong> sobre el valor total certificado en la Base 2026 (<strong>$ 373.286.275.481 COP</strong>), se genera un aumento nominal neto de <strong>+$ 22.418.316.601 COP</strong>, cumpliendo con precisión de peso el techo de <strong>$ 395.704.592.082 COP</strong>. El <strong>R10 Unificado</strong> concentra el 94,13% ($ 372.458M) y los otros cuatro recursos suman el 5,87% ($ 23.246M).
            </div>

            {/* NOTA ACLARATORIA OFICIAL: POLÍTICA GUBERNAMENTAL E INDEXACIÓN A LA BASE */}
            <div className="mt-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-xs leading-relaxed">
              <AlertCircle size={20} className="text-amber-400 shrink-0 mt-0.5" />
              <div className="text-amber-200/90">
                <strong className="text-amber-300 block mb-1 font-semibold uppercase tracking-wider text-[11px]">
                  Nota Aclaratoria Oficial sobre Políticas Gubernamentales e Indexación a la Base:
                </strong>
                <p>
                  Los ingresos por <strong>Ampliación de Cobertura (R10.1)</strong> y <strong>Ampliación de Cobertura con enfoque territorial (R10.2)</strong> obedecen a políticas gubernamentales transitorias, existiendo incertidumbre sobre si para la vigencia 2027 estos planes del anterior Gobierno Nacional continuarán en vigencia. Por tal motivo, sus valores individuales no se proyectan con incremento independiente (<strong>0,0% / +$ 0 COP</strong>). No obstante, los recursos entregados en la vigencia 2026 han sido <strong>indexados en su totalidad a la base presupuestal unificada</strong> ($ 351.357.927.407 COP) y constituirán el giro unificado por el <strong>Artículo 86 de la Ley 30 de 1992</strong> para el funcionamiento institucional (<strong>R10.0</strong>).
                </p>
              </div>
            </div>
          </div>

          {/* TABLA 2: TABLA DE CONTROL PRESUPUESTAL Y FLUJO DE CAJA (LA MISMA DE FLUJO DE CAJA) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-lg font-display text-white font-bold flex items-center gap-2">
                  <Coins size={18} className="text-emerald-400" />
                  Tabla Operativa: Ejecución Presupuestal, SIIF y Disponibilidad de Caja (9 Recursos Nación)
                </h4>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Visualización detallada de aforos, recaudo efectivo, saldo faltante en SIIF (Sep-Dic) y disponibilidad en bancos.
                </p>
              </div>
            </div>

            <RecursosNacionFuncionamientoTable />
          </div>
        </div>
      )}

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
                {/* KPI 1: Proyección R10.0 (+6.0%) */}
                <div className="p-5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold text-cyan-300 uppercase tracking-wider">
                      Proyección Oficial R10.0 (+6%)
                    </span>
                    <span className="text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-200 px-2 py-0.5 rounded border border-cyan-500/30">
                      +6.0% Oficial
                    </span>
                  </div>
                  <div>
                    <span className="text-2xl md:text-3xl font-mono font-extrabold text-cyan-300 block">
                      {formatCurrencyShortCOP(R10_PROJECTION_6PCT_DATA.proyeccion2027)}
                    </span>
                    <span className="text-[11px] font-mono text-white/90 block mt-0.5">
                      {formatCurrencyCOP(R10_PROJECTION_6PCT_DATA.proyeccion2027)}
                    </span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-cyan-500/20 text-[10px] text-on-surface-variant flex items-center justify-between">
                    <span>Aportes Nación Funcionamiento</span>
                    <strong className="text-cyan-200">+6,0% sobre Base 2026</strong>
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
                      {formatCurrencyShortCOP(R10_PROJECTION_6PCT_DATA.basePresupuestal2026)}
                    </span>
                    <span className="text-[11px] font-mono text-on-surface-variant block mt-0.5">
                      {formatCurrencyCOP(R10_PROJECTION_6PCT_DATA.basePresupuestal2026)}
                    </span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-white/10 text-[10px] text-on-surface-variant flex items-center justify-between">
                    <span>5 Sub-recursos Base</span>
                    <strong className="text-sky-300">$258.607M Efec + $92.750M Falt</strong>
                  </div>
                </div>

                {/* KPI 3: Variación Nominal y % (+6%) */}
                <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold text-emerald-300 uppercase tracking-wider">
                      Incremento Nominal (+6.0%)
                    </span>
                    <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-200 px-2 py-0.5 rounded border border-emerald-500/30">
                      +{R10_PROJECTION_6PCT_DATA.variacionPct.toFixed(2)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-2xl md:text-3xl font-mono font-extrabold text-emerald-400 block">
                      +{formatCurrencyShortCOP(R10_PROJECTION_6PCT_DATA.incrementoNominal)}
                    </span>
                    <span className="text-[11px] font-mono text-emerald-200/90 block mt-0.5">
                      +{formatCurrencyCOP(R10_PROJECTION_6PCT_DATA.incrementoNominal)}
                    </span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-emerald-500/20 text-[10px] text-on-surface-variant flex items-center justify-between">
                    <span>Aumento Neto R10</span>
                    <strong className="text-emerald-300">+6,00% Autorizado</strong>
                  </div>
                </div>

                {/* KPI 4: Techo Referencial Proyecto PGN 2027 */}
                <div className="p-5 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold text-purple-300 uppercase tracking-wider">
                      Techo Proyecto PGN 2027
                    </span>
                    <span className="text-[10px] font-mono font-bold bg-purple-500/20 text-purple-200 px-2 py-0.5 rounded border border-purple-500/30">
                      Escenario PGN
                    </span>
                  </div>
                  <div>
                    <span className="text-2xl md:text-3xl font-mono font-extrabold text-purple-300 block">
                      {formatCurrencyShortCOP(PGN_2027_DATA.funcionamientoR10)}
                    </span>
                    <span className="text-[11px] font-mono text-purple-200/90 block mt-0.5">
                      {formatCurrencyCOP(PGN_2027_DATA.funcionamientoR10)}
                    </span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-purple-500/20 text-[10px] text-on-surface-variant flex items-center justify-between">
                    <span>Diferencia vs +6%:</span>
                    <strong className="text-amber-300">-$23.265M COP</strong>
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
                    tickFormatter={(val) => `$${(val / 1e6).toLocaleString('es-CO')}M`}
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
              <strong className="text-white">Importancia de la Base Unificada:</strong> El R10 ordinario ($327.070M) concentra el 93.09% del recaudo nacional de funcionamiento. Al integrar los sub-recursos R10.1 (PIC Convencional $7.789M), R10.2 (PIC Territorial $3.060M), R10.3 ($2.229M) y R10.5 ($11.208M), se obtiene la base integral real de <strong>$ 351.357.927.407 COP</strong>, sobre la cual se aplica el tope de incremento del <strong>+6.0%</strong> fijado por el Gobierno Nacional para 2027.
            </div>
          </div>

          {/* CÁLCULO OFICIAL DEL VALOR PROYECTADO R10.0 VIGENCIA 2027 (+6.0% GOBIERNO) */}
          <div className="glass-card p-6 md:p-8 rounded-[28px] border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-950/20 via-surface-container/60 to-surface-container-low shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 relative z-10">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <Calculator size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Directriz Gubernamental 2027
                    </span>
                    <span className="text-[10px] font-mono text-on-surface-variant">
                      Tope de Crecimiento: +6.0%
                    </span>
                  </div>
                  <h4 className="text-lg md:text-xl font-display text-white font-extrabold mt-1">
                    Cálculo del Valor Proyectado R10.0 Vigencia 2027 (+6.0% sobre Base 2026)
                  </h4>
                  <p className="text-xs text-on-surface-variant">
                    Determinación matemática del Aporte de la Nación para Funcionamiento aplicando el tope del +6,0% sobre la base unificada de $ 351.357.927.407 COP.
                  </p>
                </div>
              </div>
              <div className="text-right bg-black/40 px-4 py-2.5 rounded-2xl border border-emerald-500/20">
                <span className="text-[10px] uppercase text-emerald-300/80 font-bold block">Valor Proyectado R10.0</span>
                <span className="text-xl md:text-2xl font-mono font-extrabold text-emerald-300">
                  {formatCurrencyShortCOP(R10_PROJECTION_6PCT_DATA.proyeccion2027)}
                </span>
              </div>
            </div>

            {/* FORMULA Y RESULTADOS PRINCIPALES */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 relative z-10">
              <div className="p-4 rounded-2xl bg-black/30 border border-white/10">
                <span className="text-[11px] font-medium text-on-surface-variant block mb-1">
                  Base Presupuestal 2026 (R10.0 - Tabla 1)
                </span>
                <span className="text-xl font-mono font-bold text-white block">
                  {formatCurrencyCOP(R10_PROJECTION_6PCT_DATA.basePresupuestal2026)}
                </span>
                <span className="text-[10px] text-sky-400 mt-1 block">
                  5 Sub-recursos Unificados (Efectivo + Faltante)
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-black/30 border border-emerald-500/20">
                <span className="text-[11px] font-medium text-emerald-300 block mb-1">
                  Incremento Nominal Autorizado (+6.0%)
                </span>
                <span className="text-xl font-mono font-extrabold text-emerald-400 block">
                  +{formatCurrencyCOP(R10_PROJECTION_6PCT_DATA.incrementoNominal)}
                </span>
                <span className="text-[10px] text-emerald-200/80 mt-1 block">
                  Factor Multiplicador: × 1.060000000
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40">
                <span className="text-[11px] font-semibold text-emerald-200 block mb-1 uppercase tracking-wider">
                  Valor Proyectado R10.0 Vigencia 2027
                </span>
                <span className="text-xl md:text-2xl font-mono font-extrabold text-emerald-300 block">
                  {formatCurrencyCOP(R10_PROJECTION_6PCT_DATA.proyeccion2027)}
                </span>
                <span className="text-[10px] text-white/90 font-medium mt-1 block">
                  Aporte Nación Funcionamiento Proyectado 2027
                </span>
              </div>
            </div>

            {/* DESGLOSE MATEMÁTICO POR COMPONENTE DE R10 */}
            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/30 mb-4 relative z-10">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/5 text-on-surface-variant uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="p-3 font-semibold text-white">Sub-Recurso</th>
                    <th className="p-3 font-semibold text-white">Denominación / Componente Base</th>
                    <th className="p-3 text-right font-semibold text-sky-300">Base 2026 (COP)</th>
                    <th className="p-3 text-center font-semibold text-emerald-300">Aumento</th>
                    <th className="p-3 text-right font-semibold text-emerald-300">Incremento (+ COP)</th>
                    <th className="p-3 text-right font-semibold text-emerald-400">Proyección 2027 (+6%)</th>
                    <th className="p-3 text-right font-semibold text-white">Cifra ($M)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-sans">
                  {R10_PROJECTION_6PCT_DATA.desgloseComponentes.map((sub) => {
                    const isIndexado = sub.indexado ?? (sub.incremento === 0);
                    return (
                      <tr key={sub.subRecurso} className={`hover:bg-white/5 transition-colors ${isIndexado ? 'bg-amber-500/[0.02]' : ''}`}>
                        <td className="p-3 font-bold text-sky-300 font-mono">
                          {sub.subRecurso}
                        </td>
                        <td className="p-3 font-medium text-white/90">
                          <div>{sub.denominacion}</div>
                          {sub.nota && (
                            <div className="text-[10px] text-amber-300/80 mt-0.5 font-normal">
                              {sub.nota}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-right font-mono text-sky-200">
                          {formatCurrencyCOP(sub.base2026)}
                        </td>
                        <td className="p-3 text-center font-mono">
                          {isIndexado ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold text-[10px]">
                              0,0% Indexado
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-bold text-[10px]">
                              +{sub.pct.toFixed(2)}% (Absorbe Base)
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right font-mono">
                          {isIndexado ? (
                            <span className="text-slate-400 font-medium">+$ 0</span>
                          ) : (
                            <span className="text-emerald-300 font-bold">+{formatCurrencyCOP(sub.incremento)}</span>
                          )}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-emerald-400">
                          {formatCurrencyCOP(sub.proyeccion2027)}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-white">
                          {formatCurrencyShortCOP(sub.proyeccion2027)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="border-t-2 border-emerald-500/40 bg-emerald-950/40 font-bold text-white text-xs">
                  <tr>
                    <td className="p-3 font-extrabold text-emerald-300 uppercase tracking-wider" colSpan={2}>
                      TOTAL R10.0 PROYECTADO 2027 (+6.0%)
                    </td>
                    <td className="p-3 text-right font-mono font-extrabold text-sky-300">
                      {formatCurrencyCOP(R10_PROJECTION_6PCT_DATA.basePresupuestal2026)}
                    </td>
                    <td className="p-3 text-center font-mono font-extrabold text-emerald-300">
                      +6.00%
                    </td>
                    <td className="p-3 text-right font-mono font-extrabold text-emerald-300">
                      +{formatCurrencyCOP(R10_PROJECTION_6PCT_DATA.incrementoNominal)}
                    </td>
                    <td className="p-3 text-right font-mono font-extrabold text-emerald-300 text-sm bg-emerald-500/20">
                      {formatCurrencyCOP(R10_PROJECTION_6PCT_DATA.proyeccion2027)}
                    </td>
                    <td className="p-3 text-right font-mono font-extrabold text-white text-sm">
                      {formatCurrencyShortCOP(R10_PROJECTION_6PCT_DATA.proyeccion2027)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* NOTA ACLARATORIA OFICIAL: POLÍTICA GUBERNAMENTAL E INDEXACIÓN */}
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 mb-4 flex items-start gap-3 relative z-10">
              <AlertCircle size={20} className="text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-200/90 leading-relaxed">
                <strong className="text-amber-300 block mb-1 font-semibold uppercase tracking-wider text-[11px]">
                  Nota Aclaratoria Oficial sobre Políticas Gubernamentales e Indexación a la Base:
                </strong>
                <p>
                  Los ingresos percibidos por <strong>Ampliación de Cobertura (R10.1)</strong> y <strong>Ampliación de Cobertura con enfoque territorial (R10.2)</strong> obedecen a políticas gubernamentales transitorias, existiendo incertidumbre sobre si para la vigencia 2027 estos planes del anterior Gobierno Nacional continuarán en vigencia. Por tal motivo, sus valores individuales no se proyectan con incremento independiente (<strong>0,0% / +$ 0 COP</strong>), manteniendo su valor nominal recibido en 2026. No obstante, los valores entregados en 2026 quedan <strong>indexados en su totalidad a la base presupuestal unificada</strong> ($ 351.357.927.407 COP) y constituirán el giro unificado por el <strong>Artículo 86 de la Ley 30 de 1992</strong> para el funcionamiento institucional (<strong>R10.0</strong>).
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-xl bg-white/5 border border-white/10 text-xs">
              <div className="flex items-center gap-2 text-on-surface-variant">
                <Info size={16} className="text-emerald-400 shrink-0" />
                <span>
                  <strong>Fórmula Aplicada:</strong> <code className="text-emerald-300 font-mono bg-black/40 px-1.5 py-0.5 rounded">R10_2027 = $ 351.357.927.407 × 1.060057 = $ 372.458.241.214 COP</code>
                </span>
              </div>
              <div className="text-[11px] text-cyan-300 font-medium">
                Techo Funcionamiento Nación 2027: <span className="text-white font-mono font-bold">{formatCurrencyCOP(PGN_2027_DATA.funcionamientoR10)}</span> (R10 Unificado $372.458M + Otros 4 Recursos $23.246M)
              </div>
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
      {/* SECCIÓN 0.3: RECURSO 13 (EXCEDENTES DEL SECTOR COOPERATIVO - LEY 1819)     */}
      {/* ========================================================================= */}
      {selectedRecursoTab === 'r13' && (
        <div className="space-y-6 animate-in fade-in">
          {/* HEADER HERO R13 */}
          <div className="bg-gradient-to-br from-surface-container-high/90 to-background border border-amber-500/30 rounded-[32px] p-6 md:p-8 relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-amber-500/10 blur-[100px] rounded-full pointer-events-none"></div>

            <div className="relative z-10">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-white/10">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-300 shrink-0 border border-amber-500/30 shadow-lg">
                    <Coins size={28} />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="text-xs font-mono uppercase tracking-wider font-bold text-amber-300 bg-amber-500/20 px-3 py-1 rounded-full border border-amber-500/30">
                        Aporte Sector Solidario • Art. 142 Ley 1819 de 2016
                      </span>
                      <span className="text-xs font-mono font-bold text-white/80 bg-white/10 px-3 py-1 rounded-full border border-white/20">
                        Serie Histórica 2019–2026 (n = 8 vigencias)
                      </span>
                      <span className="text-xs font-mono font-bold text-rose-300 bg-rose-500/20 px-3 py-1 rounded-full border border-rose-500/30 flex items-center gap-1">
                        <AlertTriangle size={13} /> Caída Recaudo 2026: -26,47% (-$550.8M)
                      </span>
                      <span className="text-xs font-mono font-bold text-emerald-300 bg-emerald-500/20 px-3 py-1 rounded-full border border-emerald-500/30 flex items-center gap-1">
                        <TrendingUp size={13} /> Parámetro Macro Oficial: +6,0%
                      </span>
                    </div>
                    <h3 className="text-2xl md:text-3xl font-display font-bold text-white tracking-tight mt-2">
                      Recurso 13: Excedentes Cooperativas Art.142, Ley 1819 del 2016
                    </h3>
                    <p className="text-xs md:text-sm text-on-surface-variant max-w-3xl mt-1 leading-relaxed">
                      Conforme al artículo 142 de la Ley 1819 de 2016 (art. 19-4 E.T.), el 20% del excedente financiero tomado de los fondos de educación y solidaridad de las cooperativas se destina a financiar cupos y programas en Instituciones de Educación Superior públicas.
                      <br />
                      <strong className="text-amber-300">Alerta de Desempeño 2026:</strong> En la última vigencia, el recaudo real cerró en <strong className="text-white">$ 1.530.000.000 COP</strong>, sufriendo una contracción severa de <strong className="text-rose-400">-$550.840.690 COP (-26,47%)</strong> respecto a 2025 y ubicándose marcadamente <strong className="text-rose-300">por debajo de lo proyectado</strong>. Proyectar sobre promedios históricos desconociendo este piso generaría déficit de tesorería. Por ello, se recomienda adoptar con prudencia el <strong className="text-emerald-300">Escenario Base Macroeconómico (+6,0% sobre base real = $ 1.621.800.000 COP)</strong>.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end gap-3 shrink-0">
                  <button
                    onClick={() => exportR13CSV(r13SelectedModel)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.02] cursor-pointer"
                  >
                    <Download size={15} />
                    <span>Descargar Certificado R13 (CSV)</span>
                  </button>
                  <div className="flex items-center gap-2 text-right">
                    <span className="text-[11px] font-mono text-on-surface-variant">
                      Base Real Recaudada 2026: <strong className="text-amber-300">{formatCurrencyShortCOP(R13_BASE_2026)}</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* SELECTOR INTERACTIVO DE ESCENARIO 2027 */}
              <div className="mt-6 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <span className="text-xs font-semibold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles size={14} className="text-amber-400" />
                    Seleccionar Modelo de Proyección R13 para 2027:
                  </span>
                  <span className="text-[11px] font-mono text-on-surface-variant">
                    Modelo Activo: <strong className="text-white">{r13ActiveModel.name}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {R13_FORECAST_MODELS.map((m) => {
                    const isSelected = r13SelectedModel === m.id;
                    return (
                      <button
                        key={m.id}
                        onClick={() => setR13SelectedModel(m.id)}
                        className={`p-4 rounded-2xl text-left transition-all border cursor-pointer relative overflow-hidden ${
                          isSelected
                            ? 'bg-amber-500/15 border-amber-400 ring-2 ring-amber-500/40 shadow-lg scale-[1.02]'
                            : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                            isSelected ? 'bg-amber-500 text-black font-extrabold' : 'bg-white/10 text-on-surface-variant'
                          }`}>
                            {m.tag}
                          </span>
                          {m.isOfficial && (
                            <span className="text-[9px] font-mono font-bold text-emerald-300 bg-emerald-500/20 px-1.5 py-0.5 rounded border border-emerald-500/30">
                              Oficial Recomendado
                            </span>
                          )}
                          {m.riskLevel === 'alto' && (
                            <span className="text-[9px] font-mono font-bold text-rose-300 bg-rose-500/20 px-1.5 py-0.5 rounded border border-rose-500/30">
                              Riesgo Alto
                            </span>
                          )}
                        </div>
                        <div className="font-bold text-xs text-white mt-1">
                          {m.shortName}
                        </div>
                        <div className="font-mono text-lg font-extrabold text-amber-300 mt-0.5">
                          {formatCurrencyShortCOP(m.projected2027)}
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-mono text-on-surface-variant mt-2 pt-2 border-t border-white/10">
                          <span className={`${m.variacionPct > 0 ? 'text-emerald-400' : 'text-on-surface-variant'} font-bold`}>
                            {m.variacionPct > 0 ? '+' : ''}{m.variacionPct.toFixed(2)}%
                          </span>
                          <span>{m.incrementoNominal > 0 ? `+${formatCurrencyShortCOP(m.incrementoNominal)}` : '$0'}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* TARJETAS KPI DE IMPACTO */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                {/* KPI 1: Proyección 2027 R13 */}
                <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold text-amber-300 uppercase tracking-wider">
                      Proyección 2027 (R13)
                    </span>
                    <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-200 px-2 py-0.5 rounded border border-amber-500/30">
                      {r13ActiveModel.tag}
                    </span>
                  </div>
                  <div>
                    <span className="text-2xl md:text-3xl font-mono font-extrabold text-amber-300 block">
                      {formatCurrencyShortCOP(r13ActiveModel.projected2027)}
                    </span>
                    <span className="text-[11px] font-mono text-white/90 block mt-0.5">
                      {formatCurrencyCOP(r13ActiveModel.projected2027)}
                    </span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-amber-500/20 text-[10px] text-on-surface-variant flex items-center justify-between">
                    <span>Fórmula:</span>
                    <strong className="text-amber-200 font-mono">{r13ActiveModel.formula}</strong>
                  </div>
                </div>

                {/* KPI 2: Recaudo Real 2026 (Alerta de Caída) */}
                <div className="p-5 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold text-rose-300 uppercase tracking-wider">
                      Recaudo Real 2026 (Deprimido)
                    </span>
                    <span className="text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded border border-rose-500/30">
                      -26,47%
                    </span>
                  </div>
                  <div>
                    <span className="text-2xl md:text-3xl font-mono font-bold text-white block">
                      {formatCurrencyShortCOP(R13_BASE_2026)}
                    </span>
                    <span className="text-[11px] font-mono text-rose-300/90 block mt-0.5">
                      -$550.840.690 COP vs 2025 ($2.081M)
                    </span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-rose-500/20 text-[10px] text-on-surface-variant flex items-center justify-between">
                    <span>Diagnóstico:</span>
                    <strong className="text-rose-400">Por debajo de lo proyectado</strong>
                  </div>
                </div>

                {/* KPI 3: Variación Nominal Proyectada */}
                <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold text-emerald-300 uppercase tracking-wider">
                      Incremento Nominal 2027
                    </span>
                    <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-200 px-2 py-0.5 rounded border border-emerald-500/30">
                      +{r13ActiveModel.variacionPct.toFixed(2)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-2xl md:text-3xl font-mono font-extrabold text-emerald-400 block">
                      +{formatCurrencyShortCOP(r13ActiveModel.incrementoNominal)}
                    </span>
                    <span className="text-[11px] font-mono text-emerald-200/90 block mt-0.5">
                      +{formatCurrencyCOP(r13ActiveModel.incrementoNominal)}
                    </span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-emerald-500/20 text-[10px] text-on-surface-variant flex items-center justify-between">
                    <span>Cálculo sobre base 2026:</span>
                    <strong className="text-emerald-300">+{r13ActiveModel.variacionPct.toFixed(1)}% indexación</strong>
                  </div>
                </div>

                {/* KPI 4: Volatilidad Histórica y Riesgo */}
                <div className="p-5 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold text-sky-300 uppercase tracking-wider">
                      Volatilidad de la Fuente
                    </span>
                    <span className="text-[10px] font-mono font-bold bg-sky-500/20 text-sky-200 px-2 py-0.5 rounded border border-sky-500/30">
                      CV = 53,8%
                    </span>
                  </div>
                  <div>
                    <span className="text-2xl md:text-3xl font-mono font-extrabold text-sky-300 block">
                      Alta Oscilación
                    </span>
                    <span className="text-[11px] font-mono text-sky-200/90 block mt-0.5">
                      Rango: $901M (2019) a $4.432M (2022)
                    </span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-sky-500/20 text-[10px] text-on-surface-variant flex items-center justify-between">
                    <span>Criterio Tesorería:</span>
                    <strong className="text-amber-300">Gasto condicionado a recaudo</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* GRÁFICO HISTÓRICO Y PROYECCIÓN RECHARTS */}
          <div className="glass-card p-6 md:p-8 rounded-[28px] border border-amber-500/20 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h4 className="text-lg md:text-xl font-display text-white font-bold flex items-center gap-2">
                  <BarChart3 size={20} className="text-amber-400" />
                  Evolución y Proyección de Excedentes Cooperativas Art.142, Ley 1819 del 2016 (2019–2027)
                </h4>
                <p className="text-xs text-on-surface-variant mt-1">
                  Comportamiento histórico de 8 vigencias evidenciando el pico atípico de 2022, la contracción 2026 (-26,47%) y la proyección 2027.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <span className="flex items-center gap-1.5 text-xs text-on-surface-variant font-medium">
                  <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                  Histórico Real (2019–2025)
                </span>
                <span className="flex items-center gap-1.5 text-xs text-rose-300 font-bold">
                  <span className="w-3 h-3 rounded-full bg-rose-500 ring-2 ring-rose-500/50"></span>
                  Base 2026 Deprimida ($1.530M)
                </span>
                <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-300">
                  <span className="w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-emerald-500/50"></span>
                  Proyección 2027 ({formatCurrencyShortCOP(r13ActiveModel.projected2027)})
                </span>
              </div>
            </div>

            <div className="h-[340px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={r13ChartSeries} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <defs>
                    <linearGradient id="r13BarGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#b45309" stopOpacity={0.6} />
                    </linearGradient>
                    <linearGradient id="r13Bar2026" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#9f1239" stopOpacity={0.6} />
                    </linearGradient>
                    <linearGradient id="r13Bar2027" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#34d399" stopOpacity={1} />
                      <stop offset="100%" stopColor="#059669" stopOpacity={0.7} />
                    </linearGradient>
                    <linearGradient id="r13AreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.0} />
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
                    domain={[0, 5000000000]}
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
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            }`}>
                              {item.is2027 ? `PROYECCIÓN (${r13ActiveModel.shortName})` : item.is2026 ? 'BASE REAL (CAÍDA)' : 'HISTÓRICO REAL'}
                            </span>
                          </div>

                          <div className="space-y-1.5 text-xs">
                            <div className="flex justify-between items-baseline">
                              <span className="text-on-surface-variant">Total Recaudo:</span>
                              <span className="font-mono font-bold text-amber-300 text-sm">
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
                    fill="url(#r13AreaGrad)" 
                    stroke="none" 
                  />

                  <Bar dataKey="recaudo" radius={[8, 8, 0, 0]}>
                    {r13ChartSeries.map((entry, index) => (
                      <Cell 
                        key={`r13-cell-${index}`} 
                        fill={entry.is2027 ? 'url(#r13Bar2027)' : entry.is2026 ? 'url(#r13Bar2026)' : 'url(#r13BarGradient)'}
                        stroke={entry.is2027 ? '#10b981' : entry.is2026 ? '#f43f5e' : 'none'}
                        strokeWidth={entry.is2027 || entry.is2026 ? 2 : 0}
                      />
                    ))}
                  </Bar>

                  <Line 
                    type="monotone" 
                    dataKey="recaudo" 
                    stroke="#38bdf8" 
                    strokeWidth={2.5}
                    dot={{ fill: '#38bdf8', r: 4 }}
                    activeDot={{ r: 6, fill: '#38bdf8', stroke: '#fff', strokeWidth: 2 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 p-3.5 rounded-2xl bg-black/30 border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-amber-300">
                <Info size={16} className="shrink-0" />
                <span>
                  <strong>Diagnóstico de Serie R13:</strong> Tras el pico extraordinario de 2022 ($4.432M), el recaudo se estabilizó en torno a $2.080M (2024–2025), pero cayó a <strong>$1.530M en 2026 (-26,47%)</strong>. El modelo activo proyecta <strong>{formatCurrencyCOP(r13ActiveModel.projected2027)}</strong> (+{r13ActiveModel.variacionPct.toFixed(2)}%).
                </span>
              </div>
              <span className="font-mono text-emerald-400 font-bold shrink-0">
                Modelo: {r13ActiveModel.name}
              </span>
            </div>
          </div>

          {/* TABLA 1: SERIE HISTÓRICA COMPLETA Y PROYECCIÓN */}
          <div className="glass-card p-6 md:p-8 rounded-[28px] border border-amber-500/20 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h4 className="text-lg font-display text-white font-bold flex items-center gap-2">
                  <Table size={18} className="text-amber-400" />
                  Tabla: Histórico y Proyección Recurso 13 — Excedentes Cooperativas Art.142, Ley 1819 del 2016 (2019–2027)
                </h4>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Registro cronológico de los aportes del sector solidario con análisis del desempeño real 2026.
                </p>
              </div>
              <button
                onClick={() => exportR13CSV(r13SelectedModel)}
                className="flex items-center gap-1.5 text-xs text-amber-300 hover:text-white px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
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
                    <th className="p-4 font-semibold text-right text-amber-300">Total Recaudo ($ COP)</th>
                    <th className="p-4 font-semibold text-right text-white">Total ($M)</th>
                    <th className="p-4 font-semibold text-right text-emerald-300">Variación Anual ($)</th>
                    <th className="p-4 font-semibold text-center text-amber-300">Variación (%)</th>
                    <th className="p-4 font-semibold text-left text-on-surface-variant">Hito / Diagnóstico</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-sans">
                  {R13_HISTORICAL_SERIES.map((h) => {
                    const is2027 = h.vigencia === 2027;
                    const is2026 = h.vigencia === 2026;
                    const recaudo = is2027 ? r13ActiveModel.projected2027 : h.totalRecaudo;
                    const varCOP = is2027 ? r13ActiveModel.incrementoNominal : h.variacionAnualCOP;
                    const varPct = is2027 ? r13ActiveModel.variacionPct : h.variacionAnualPct;

                    return (
                      <tr 
                        key={h.vigencia} 
                        className={`transition-colors ${
                          is2027 
                            ? 'bg-emerald-500/10 hover:bg-emerald-500/20 font-semibold' 
                            : is2026 
                            ? 'bg-rose-500/10 hover:bg-rose-500/20 font-medium' 
                            : 'hover:bg-white/5'
                        }`}
                      >
                        <td className="p-4 font-bold font-mono">
                          <span className={`px-2.5 py-1 rounded-lg text-xs ${
                            is2027 
                              ? 'bg-emerald-500 text-black font-extrabold' 
                              : is2026 
                              ? 'bg-rose-500 text-white font-extrabold' 
                              : 'bg-white/10 text-white'
                          }`}>
                            {h.vigencia}
                          </span>
                        </td>
                        <td className={`p-4 ${is2027 ? 'text-emerald-200 font-bold' : is2026 ? 'text-rose-200 font-bold' : 'text-white'}`}>
                          {is2027 ? `Excedentes Cooperativas (${r13ActiveModel.shortName})` : h.concepto}
                        </td>
                        <td className="p-4 font-mono text-on-surface-variant text-[11px]">
                          {h.recurso}
                        </td>
                        <td className={`p-4 text-right font-mono font-bold ${
                          is2027 ? 'text-emerald-300 text-sm' : is2026 ? 'text-rose-300' : 'text-white'
                        }`}>
                          {formatCurrencyCOP(recaudo)}
                        </td>
                        <td className="p-4 text-right font-mono font-bold text-white">
                          {formatCurrencyShortCOP(recaudo)}
                        </td>
                        <td className="p-4 text-right font-mono">
                          {varCOP !== 0 ? (
                            <span className={varCOP >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                              {varCOP >= 0 ? '+' : ''}{formatCurrencyShortCOP(varCOP)}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="p-4 text-center font-mono font-bold">
                          {varPct !== 0 ? (
                            <span className={`px-2 py-0.5 rounded text-[11px] ${
                              is2027 
                                ? 'bg-emerald-500/30 text-emerald-300 font-extrabold' 
                                : varPct >= 0 ? 'text-emerald-400' : 'text-rose-400 font-bold'
                            }`}>
                              {varPct >= 0 ? '+' : ''}{varPct.toFixed(2)}%
                            </span>
                          ) : '—'}
                        </td>
                        <td className="p-4 text-on-surface-variant text-[11px] italic">
                          {is2027 ? r13ActiveModel.interpretation : h.notaNormativa}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* TABLA 2: COMPARACIÓN DE MODELOS MATEMÁTICOS EVALUADOS */}
          <div className="glass-card p-6 md:p-8 rounded-[28px] border border-amber-500/20 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h4 className="text-lg font-display text-white font-bold flex items-center gap-2">
                  <Calculator size={18} className="text-amber-400" />
                  Matriz Comparativa de Modelos de Proyección 2027 (R13)
                </h4>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Evaluación de alternativas de proyección frente al riesgo de desfase financiero tras la caída de 2026.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/20">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-container-low text-on-surface-variant uppercase text-[11px] tracking-wider">
                  <tr>
                    <th className="p-4 font-semibold text-white">Modelo / Metodología</th>
                    <th className="p-4 font-semibold text-on-surface-variant">Fórmula de Cálculo</th>
                    <th className="p-4 font-semibold text-right text-amber-300">Proyección 2027 ($ COP)</th>
                    <th className="p-4 font-semibold text-right text-white">Total ($M)</th>
                    <th className="p-4 font-semibold text-right text-emerald-300">Incremento ($ COP)</th>
                    <th className="p-4 font-semibold text-center text-amber-300">Variación %</th>
                    <th className="p-4 font-semibold text-center text-white">Nivel de Riesgo</th>
                    <th className="p-4 font-semibold text-center text-white">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-sans">
                  {R13_FORECAST_MODELS.map((m) => {
                    const isSelected = r13SelectedModel === m.id;
                    return (
                      <tr 
                        key={m.id} 
                        className={`transition-colors ${
                          isSelected ? 'bg-amber-500/15 font-semibold' : 'hover:bg-white/5'
                        }`}
                      >
                        <td className="p-4 font-bold text-white flex items-center gap-2">
                          <span 
                            className="w-3 h-3 rounded-full shrink-0" 
                            style={{ backgroundColor: m.color }}
                          />
                          <div>
                            <span>{m.name}</span>
                            <span className="text-[10px] block text-on-surface-variant font-normal">{m.tag}</span>
                          </div>
                        </td>
                        <td className="p-4 font-mono text-[11px] text-on-surface-variant">
                          {m.formula}
                        </td>
                        <td className="p-4 text-right font-mono font-bold text-amber-300 text-sm">
                          {formatCurrencyCOP(m.projected2027)}
                        </td>
                        <td className="p-4 text-right font-mono font-bold text-white">
                          {formatCurrencyShortCOP(m.projected2027)}
                        </td>
                        <td className="p-4 text-right font-mono text-emerald-400 font-semibold">
                          {m.incrementoNominal > 0 ? `+${formatCurrencyShortCOP(m.incrementoNominal)}` : '$0'}
                        </td>
                        <td className="p-4 text-center font-mono font-bold text-amber-300">
                          {m.variacionPct > 0 ? `+${m.variacionPct.toFixed(2)}%` : '0,00%'}
                        </td>
                        <td className="p-4 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            (m.riskLevel || 'bajo') === 'bajo' 
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                              : (m.riskLevel || 'bajo') === 'medio'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}>
                            {(m.riskLevel || 'bajo').toUpperCase()}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          {isSelected ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-amber-500 text-black">
                              Activo
                            </span>
                          ) : (
                            <button
                              onClick={() => setR13SelectedModel(m.id)}
                              className="px-2.5 py-1 rounded-full text-[10px] font-mono text-amber-300 hover:text-white bg-white/5 hover:bg-white/15 border border-white/10 transition-colors"
                            >
                              Aplicar
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* PANEL DE ANÁLISIS DE RIESGO Y ASPECTOS RELEVANTES */}
          <div className="p-6 md:p-8 rounded-[28px] bg-gradient-to-r from-surface-container-high/90 to-background border border-amber-500/30 shadow-xl">
            <div className="flex flex-col md:flex-row items-start gap-5">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0 border border-amber-500/30">
                <Scale size={24} />
              </div>
              <div className="space-y-4 w-full">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono uppercase tracking-wider font-bold text-amber-300">
                    Dictamen Técnico Financiero Institucional
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    Alerta de Subrecaudo 2026
                  </span>
                </div>
                <h4 className="text-xl font-bold text-white tracking-tight">
                  Aspectos Relevantes del Recurso 13 y Justificación del Escenario Base 2027
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  {/* Aspecto 1 */}
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                    <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wider">
                      <AlertTriangle size={15} />
                      <span>1. Diagnóstico de la Caída 2026 (-26,47%)</span>
                    </div>
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      En 2026 se presupuestó un recaudo superior basado en el promedio de 2024–2025 ($2.080M), pero el ingreso efectivo sólo alcanzó <strong className="text-white">$1.530.000.000 COP</strong> (un faltante de -$550.8M). Esta brecha obedeció a la reducción de excedentes netos reportados por cooperativas en Boyacá y el país, y mayores absorciones por fondos de reserva legal.
                    </p>
                  </div>

                  {/* Aspecto 2 */}
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                    <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
                      <AlertTriangle size={15} />
                      <span>2. Peligro de Ilusión Presupuestal y Déficit</span>
                    </div>
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      Adoptar modelos que promedien años pasados sin corregir la base (como la Media Cuatrienal de $1.889M o WMA de $1.805M) implicaría crear compromisos de gasto de funcionamiento sin certeza de tesorería. Si el sector solidario no repunta, la universidad incurriría en un déficit no cubierto de más de $350 millones.
                    </p>
                  </div>

                  {/* Aspecto 3 */}
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                      <CheckCircle2 size={15} />
                      <span>3. Sustentación del Modelo Macroeconómico (+6,0%)</span>
                    </div>
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      La presupuestación oficial parte del <strong className="text-white">recaudo real ejecutado ($1.530M)</strong> y le aplica la tasa macroeconómica aprobada del <strong className="text-emerald-300">+6,0%</strong>, arrojando <strong className="text-emerald-300">$ 1.621.800.000 COP</strong>. Esto reconoce la inflación esperada sin inflar la base, blindando la posición de liquidez de la UPTC.
                    </p>
                  </div>

                  {/* Aspecto 4 */}
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                    <div className="flex items-center gap-2 text-sky-400 font-bold text-xs uppercase tracking-wider">
                      <Layers size={15} />
                      <span>4. Regla de Ejecución Condicionada a Tesorería</span>
                    </div>
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      Dado que los giros de excedentes cooperativos se concentran entre mayo y junio tras la aprobación de asambleas generales, se recomienda al Consejo Superior no expedir Certificados de Disponibilidad Presupuestal (CDP) recurrentes sobre R13 hasta que los recursos ingresen efectivamente a bancos.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECCIÓN 0.4: RECURSO 14 (POLÍTICA DE GRATUIDAD EN MATRÍCULA - LEY 2307)    */}
      {/* ========================================================================= */}
      {selectedRecursoTab === 'r14' && (
        <div className="space-y-6 animate-in fade-in">
          {/* HEADER HERO R14 */}
          <div className="bg-gradient-to-br from-surface-container-high/90 to-background border border-teal-500/30 rounded-[32px] p-6 md:p-8 relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-teal-500/10 blur-[100px] rounded-full pointer-events-none"></div>

            <div className="relative z-10">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-white/10">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-teal-500/20 flex items-center justify-center text-teal-300 shrink-0 border border-teal-500/30 shadow-lg">
                    <GraduationCap size={28} />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="text-xs font-mono uppercase tracking-wider font-bold text-teal-300 bg-teal-500/20 px-3 py-1 rounded-full border border-teal-500/30">
                        Transferencia Nacional FSE • Ley 2307 de 2023
                      </span>
                      <span className="text-xs font-mono font-bold text-amber-300 bg-amber-500/20 px-3 py-1 rounded-full border border-amber-500/30">
                        Serie Histórica desde 2021 (n = 6 vigencias)
                      </span>
                      <span className="text-xs font-mono font-bold text-emerald-300 bg-emerald-500/20 px-3 py-1 rounded-full border border-emerald-500/30 flex items-center gap-1">
                        <TrendingUp size={13} /> Referencia Macroeconómica: +6,0%
                      </span>
                    </div>
                    <h3 className="text-2xl md:text-3xl font-display font-bold text-white tracking-tight mt-2">
                      Recurso 14: Política de Gratuidad en Matrícula
                    </h3>
                    <p className="text-xs md:text-sm text-on-surface-variant max-w-3xl mt-1 leading-relaxed">
                      Recurso creado en 2021 mediante el Fondo Solidario para la Educación (Decreto 1667/2021) y formalizado con fuerza de ley permanente mediante la <strong className="text-white">Ley 2307 de 2023 ("Puedo Estudiar")</strong>. Financia el 100% de la matrícula neta de los estudiantes de pregrado de la UPTC.
                      Con un recaudo base en 2026 de <strong className="text-teal-300">$ 49.844.177.233 COP</strong>, se evalúa el piso prudente de indexación macroeconómica (+6,0% = <strong className="text-emerald-300">$ 52.835M</strong>) frente a los modelos de tendencia histórica OLS (<strong className="text-sky-300">$ 54.459M</strong>, R²=94,7%) y suavizamiento Holt (<strong className="text-purple-300">$ 53.802M</strong>).
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end gap-3 shrink-0">
                  <button
                    onClick={() => exportR14CSV(r14SelectedModel)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-teal-500 hover:bg-teal-400 text-black font-bold text-xs shadow-lg shadow-teal-500/20 transition-all hover:scale-[1.02] cursor-pointer"
                  >
                    <Download size={15} />
                    <span>Descargar Certificado R14 (CSV)</span>
                  </button>
                  <div className="flex items-center gap-2 text-right">
                    <span className="text-[11px] font-mono text-on-surface-variant">
                      Base Recaudo 2026: <strong className="text-teal-300">{formatCurrencyShortCOP(R14_BASE_2026)}</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* SELECTOR INTERACTIVO DE ESCENARIO 2027 */}
              <div className="mt-6 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <span className="text-xs font-semibold text-teal-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles size={14} className="text-amber-400" />
                    Seleccionar Escenario de Proyección R14 para 2027:
                  </span>
                  <span className="text-[11px] font-mono text-on-surface-variant">
                    Modelo Activo: <strong className="text-white">{r14ActiveModel.name}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {R14_FORECAST_MODELS.map((m) => {
                    const isSelected = r14SelectedModel === m.id;
                    return (
                      <button
                        key={m.id}
                        onClick={() => setR14SelectedModel(m.id)}
                        className={`p-4 rounded-2xl text-left transition-all border cursor-pointer relative overflow-hidden ${
                          isSelected
                            ? 'bg-teal-500/15 border-teal-400 ring-2 ring-teal-500/40 shadow-lg scale-[1.02]'
                            : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                            isSelected ? 'bg-teal-500 text-black font-extrabold' : 'bg-white/10 text-on-surface-variant'
                          }`}>
                            {m.tag}
                          </span>
                          {m.isOfficial && (
                            <span className="text-[9px] font-mono font-bold text-amber-300 bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/30">
                              Base Macro
                            </span>
                          )}
                        </div>
                        <div className="font-bold text-xs text-white mt-1">
                          {m.shortName}
                        </div>
                        <div className="font-mono text-lg font-extrabold text-teal-300 mt-0.5">
                          {formatCurrencyShortCOP(m.projected2027)}
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-mono text-on-surface-variant mt-2 pt-2 border-t border-white/10">
                          <span className="text-emerald-400 font-bold">+{m.variacionPct.toFixed(2)}%</span>
                          <span>+{formatCurrencyShortCOP(m.incrementoNominal)}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* TARJETAS KPI DE IMPACTO */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                {/* KPI 1: Proyección 2027 R14 */}
                <div className="p-5 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold text-teal-300 uppercase tracking-wider">
                      Proyección 2027 (R14)
                    </span>
                    <span className="text-[10px] font-mono font-bold bg-teal-500/20 text-teal-200 px-2 py-0.5 rounded border border-teal-500/30">
                      {r14ActiveModel.tag}
                    </span>
                  </div>
                  <div>
                    <span className="text-2xl md:text-3xl font-mono font-extrabold text-teal-300 block">
                      {formatCurrencyShortCOP(r14ActiveModel.projected2027)}
                    </span>
                    <span className="text-[11px] font-mono text-white/90 block mt-0.5">
                      {formatCurrencyCOP(r14ActiveModel.projected2027)}
                    </span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-teal-500/20 text-[10px] text-on-surface-variant flex items-center justify-between">
                    <span>Fórmula:</span>
                    <strong className="text-teal-200 font-mono">{r14ActiveModel.formula}</strong>
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
                      {formatCurrencyShortCOP(R14_BASE_2026)}
                    </span>
                    <span className="text-[11px] font-mono text-on-surface-variant block mt-0.5">
                      {formatCurrencyCOP(R14_BASE_2026)}
                    </span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-white/10 text-[10px] text-on-surface-variant flex items-center justify-between">
                    <span>Crecimiento 2026</span>
                    <strong className="text-emerald-400">+$13.634M (+37,65%)</strong>
                  </div>
                </div>

                {/* KPI 3: Incremento Nominal */}
                <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold text-emerald-300 uppercase tracking-wider">
                      Incremento Nominal 2027
                    </span>
                    <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-200 px-2 py-0.5 rounded border border-emerald-500/30">
                      +{r14ActiveModel.variacionPct.toFixed(2)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-2xl md:text-3xl font-mono font-extrabold text-emerald-400 block">
                      +{formatCurrencyShortCOP(r14ActiveModel.incrementoNominal)}
                    </span>
                    <span className="text-[11px] font-mono text-emerald-200/90 block mt-0.5">
                      +{formatCurrencyCOP(r14ActiveModel.incrementoNominal)}
                    </span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-emerald-500/20 text-[10px] text-on-surface-variant flex items-center justify-between">
                    <span>Adicionales vs 2026</span>
                    <strong className="text-emerald-300">+{r14ActiveModel.variacionPct.toFixed(1)}% vs Base</strong>
                  </div>
                </div>

                {/* KPI 4: CAGR Histórico 2021-2026 */}
                <div className="p-5 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold text-sky-300 uppercase tracking-wider">
                      Crecimiento Histórico (CAGR)
                    </span>
                    <span className="text-[10px] font-mono font-bold bg-sky-500/20 text-sky-200 px-2 py-0.5 rounded border border-sky-500/30">
                      2021–2026
                    </span>
                  </div>
                  <div>
                    <span className="text-2xl md:text-3xl font-mono font-extrabold text-sky-300 block">
                      +29,64%
                    </span>
                    <span className="text-[11px] font-mono text-sky-200/90 block mt-0.5">
                      Tasa Anual Compuesta (5 años)
                    </span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-sky-500/20 text-[10px] text-on-surface-variant flex items-center justify-between">
                    <span>Multiplicador de Expansión</span>
                    <strong className="text-sky-200">3,66× desde 2021</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* GRÁFICO HISTÓRICO Y PROYECCIÓN RECHARTS */}
          <div className="glass-card p-6 md:p-8 rounded-[28px] border border-teal-500/20 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h4 className="text-lg md:text-xl font-display text-white font-bold flex items-center gap-2">
                  <BarChart3 size={20} className="text-teal-400" />
                  Evolución y Proyección de la Política de Gratuidad (2021–2027)
                </h4>
                <p className="text-xs text-on-surface-variant mt-1">
                  Comportamiento del recaudo histórico desde la creación del fondo (2021) y proyección 2027 según el modelo seleccionado.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <span className="flex items-center gap-1.5 text-xs text-on-surface-variant font-medium">
                  <span className="w-3 h-3 rounded-full bg-teal-400"></span>
                  Histórico Real (2021–2025)
                </span>
                <span className="flex items-center gap-1.5 text-xs text-on-surface-variant font-medium">
                  <span className="w-3 h-3 rounded-full bg-teal-600"></span>
                  Base 2026 ($49.844M)
                </span>
                <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-300">
                  <span className="w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-emerald-500/50"></span>
                  Proyección 2027 ({formatCurrencyShortCOP(r14ActiveModel.projected2027)})
                </span>
              </div>
            </div>

            <div className="h-[340px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={r14ChartSeries} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <defs>
                    <linearGradient id="r14BarGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2dd4bf" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#0f766e" stopOpacity={0.6} />
                    </linearGradient>
                    <linearGradient id="r14Bar2027" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#34d399" stopOpacity={1} />
                      <stop offset="100%" stopColor="#059669" stopOpacity={0.7} />
                    </linearGradient>
                    <linearGradient id="r14AreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#14b8a6" stopOpacity={0.0} />
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
                    domain={[0, 65000000000]}
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
                                : 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                            }`}>
                              {item.is2027 ? `PROYECCIÓN (${r14ActiveModel.shortName})` : 'HISTÓRICO REAL'}
                            </span>
                          </div>

                          <div className="space-y-1.5 text-xs">
                            <div className="flex justify-between items-baseline">
                              <span className="text-on-surface-variant">Total Recaudo:</span>
                              <span className="font-mono font-bold text-teal-300 text-sm">
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
                    fill="url(#r14AreaGrad)" 
                    stroke="none" 
                  />

                  <Bar dataKey="recaudo" radius={[8, 8, 0, 0]}>
                    {r14ChartSeries.map((entry, index) => (
                      <Cell 
                        key={`r14-cell-${index}`} 
                        fill={entry.is2027 ? 'url(#r14Bar2027)' : 'url(#r14BarGradient)'}
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
              <div className="flex items-center gap-2 text-teal-300">
                <Info size={16} className="shrink-0" />
                <span>
                  <strong>Comportamiento del Fondo:</strong> El recurso creció de <strong>$13.614M (2021)</strong> a <strong>$49.844M (2026)</strong> con la implementación de la Ley 2307/2023. El modelo activo proyecta <strong>{formatCurrencyCOP(r14ActiveModel.projected2027)}</strong> para 2027 (+{r14ActiveModel.variacionPct.toFixed(2)}%).
                </span>
              </div>
              <span className="font-mono text-emerald-400 font-bold shrink-0">
                Modelo: {r14ActiveModel.name}
              </span>
            </div>
          </div>

          {/* TABLA 1: SERIE HISTÓRICA COMPLETA Y PROYECCIÓN */}
          <div className="glass-card p-6 md:p-8 rounded-[28px] border border-teal-500/20 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h4 className="text-lg font-display text-white font-bold flex items-center gap-2">
                  <Table size={18} className="text-teal-400" />
                  Tabla: Histórico y Proyección Recurso 14 — Política de Gratuidad (2021–2027)
                </h4>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Registro cronológico oficial desde la vigencia inaugural de gratuidad hasta la proyección 2027.
                </p>
              </div>
              <button
                onClick={() => exportR14CSV(r14SelectedModel)}
                className="flex items-center gap-1.5 text-xs text-teal-300 hover:text-white px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
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
                    <th className="p-4 font-semibold text-right text-teal-300">Total Recaudo ($ COP)</th>
                    <th className="p-4 font-semibold text-right text-white">Total ($M)</th>
                    <th className="p-4 font-semibold text-right text-emerald-300">Variación Anual ($)</th>
                    <th className="p-4 font-semibold text-center text-amber-300">Variación (%)</th>
                    <th className="p-4 font-semibold text-left text-on-surface-variant">Hito Normativo / Criterio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-sans">
                  {R14_HISTORICAL_SERIES.map((h) => {
                    const is2027 = h.vigencia === 2027;
                    const is2026 = h.vigencia === 2026;
                    const recaudo = is2027 ? r14ActiveModel.projected2027 : h.totalRecaudo;
                    const varCOP = is2027 ? r14ActiveModel.incrementoNominal : h.variacionAnualCOP;
                    const varPct = is2027 ? r14ActiveModel.variacionPct : h.variacionAnualPct;

                    return (
                      <tr 
                        key={h.vigencia} 
                        className={`transition-colors ${
                          is2027 
                            ? 'bg-emerald-500/10 hover:bg-emerald-500/20 font-semibold' 
                            : is2026 
                            ? 'bg-teal-500/10 hover:bg-teal-500/20 font-medium' 
                            : 'hover:bg-white/5'
                        }`}
                      >
                        <td className="p-4 font-bold font-mono">
                          <span className={`px-2.5 py-1 rounded-lg text-xs ${
                            is2027 
                              ? 'bg-emerald-500 text-black font-extrabold' 
                              : is2026 
                              ? 'bg-teal-500 text-black font-extrabold' 
                              : 'bg-white/10 text-white'
                          }`}>
                            {h.vigencia}
                          </span>
                        </td>
                        <td className={`p-4 ${is2027 ? 'text-emerald-200 font-bold' : is2026 ? 'text-teal-200 font-bold' : 'text-white'}`}>
                          {is2027 ? `Política de Gratuidad (${r14ActiveModel.shortName})` : h.concepto}
                        </td>
                        <td className="p-4 font-mono text-on-surface-variant text-[11px]">
                          {h.recurso}
                        </td>
                        <td className={`p-4 text-right font-mono font-bold ${
                          is2027 ? 'text-emerald-300 text-sm' : is2026 ? 'text-teal-300' : 'text-white'
                        }`}>
                          {formatCurrencyCOP(recaudo)}
                        </td>
                        <td className="p-4 text-right font-mono font-bold text-white">
                          {formatCurrencyShortCOP(recaudo)}
                        </td>
                        <td className="p-4 text-right font-mono">
                          {varCOP !== 0 ? (
                            <span className={varCOP >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                              {varCOP >= 0 ? '+' : ''}{formatCurrencyShortCOP(varCOP)}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="p-4 text-center font-mono font-bold">
                          {varPct !== 0 ? (
                            <span className={`px-2 py-0.5 rounded text-[11px] ${
                              is2027 
                                ? 'bg-emerald-500/30 text-emerald-300 font-extrabold' 
                                : varPct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}>
                              {varPct >= 0 ? '+' : ''}{varPct.toFixed(2)}%
                            </span>
                          ) : '—'}
                        </td>
                        <td className="p-4 text-on-surface-variant text-[11px] italic">
                          {is2027 ? r14ActiveModel.interpretation : h.notaNormativa}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* TABLA 2: COMPARACIÓN DE MODELOS MATEMÁTICOS EVALUADOS */}
          <div className="glass-card p-6 md:p-8 rounded-[28px] border border-teal-500/20 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h4 className="text-lg font-display text-white font-bold flex items-center gap-2">
                  <Calculator size={18} className="text-teal-400" />
                  Matriz Comparativa de Modelos de Proyección 2027 (R14)
                </h4>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Contraste entre el piso macroeconómico oficial (+6,0%) y los modelos de regresión y suavizamiento estadístico.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/20">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-container-low text-on-surface-variant uppercase text-[11px] tracking-wider">
                  <tr>
                    <th className="p-4 font-semibold text-white">Modelo / Metodología</th>
                    <th className="p-4 font-semibold text-on-surface-variant">Fórmula de Cálculo</th>
                    <th className="p-4 font-semibold text-right text-teal-300">Proyección 2027 ($ COP)</th>
                    <th className="p-4 font-semibold text-right text-white">Total ($M)</th>
                    <th className="p-4 font-semibold text-right text-emerald-300">Incremento ($ COP)</th>
                    <th className="p-4 font-semibold text-center text-amber-300">Variación %</th>
                    <th className="p-4 font-semibold text-center text-purple-300">Ajuste (R²)</th>
                    <th className="p-4 font-semibold text-center text-white">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-sans">
                  {R14_FORECAST_MODELS.map((m) => {
                    const isSelected = r14SelectedModel === m.id;
                    return (
                      <tr 
                        key={m.id} 
                        className={`transition-colors ${
                          isSelected ? 'bg-teal-500/15 font-semibold' : 'hover:bg-white/5'
                        }`}
                      >
                        <td className="p-4 font-bold text-white flex items-center gap-2">
                          <span 
                            className="w-3 h-3 rounded-full shrink-0" 
                            style={{ backgroundColor: m.color }}
                          />
                          <div>
                            <span>{m.name}</span>
                            <span className="text-[10px] block text-on-surface-variant font-normal">{m.tag}</span>
                          </div>
                        </td>
                        <td className="p-4 font-mono text-[11px] text-on-surface-variant">
                          {m.formula}
                        </td>
                        <td className="p-4 text-right font-mono font-bold text-teal-300 text-sm">
                          {formatCurrencyCOP(m.projected2027)}
                        </td>
                        <td className="p-4 text-right font-mono font-bold text-white">
                          {formatCurrencyShortCOP(m.projected2027)}
                        </td>
                        <td className="p-4 text-right font-mono text-emerald-400 font-semibold">
                          +{formatCurrencyShortCOP(m.incrementoNominal)}
                        </td>
                        <td className="p-4 text-center font-mono font-bold text-amber-300">
                          +{m.variacionPct.toFixed(2)}%
                        </td>
                        <td className="p-4 text-center font-mono text-purple-300 font-bold">
                          {m.r2 ? `${m.r2.toFixed(1)}%` : '—'}
                        </td>
                        <td className="p-4 text-center">
                          {isSelected ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-teal-500 text-black">
                              Activo
                            </span>
                          ) : (
                            <button
                              onClick={() => setR14SelectedModel(m.id)}
                              className="px-2.5 py-1 rounded-full text-[10px] font-mono text-teal-300 hover:text-white bg-white/5 hover:bg-white/15 border border-white/10 transition-colors"
                            >
                              Aplicar
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* PANEL DE JUSTIFICACIÓN METODOLÓGICA Y CONTEXTO NORMATIVO */}
          <div className="p-6 md:p-8 rounded-[28px] bg-gradient-to-r from-surface-container-high/90 to-background border border-teal-500/30 shadow-xl">
            <div className="flex flex-col md:flex-row items-start gap-5">
              <div className="w-12 h-12 rounded-2xl bg-teal-500/20 text-teal-300 flex items-center justify-center shrink-0 border border-teal-500/30">
                <Scale size={24} />
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono uppercase tracking-wider font-bold text-teal-300">
                    Contexto Técnico y Criterio de Presupuestación
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-500/20 text-teal-200 border border-teal-500/30">
                    Ley 2307 de 2023 ("Puedo Estudiar")
                  </span>
                </div>
                <h4 className="text-xl font-bold text-white tracking-tight">
                  Fundamento de la Serie Histórica y Proyección para 2027
                </h4>
                <div className="text-xs md:text-sm text-on-surface-variant space-y-2 leading-relaxed">
                  <p>
                    1. <strong className="text-white">Origen en la Vigencia 2021:</strong> El Recurso 14 no existía antes de 2021 porque la matrícula de pregrado era financiada por las familias bajo el Recurso 20 (Recursos Propios) y por subsidios limitados (como Generación E / Ser Pilo Paga). La universidad comenzó a recaudar este concepto a partir de 2021 con el Fondo Solidario para la Educación (FSE). Por ello, la serie histórica homogénea y representativa comprende exactamente 6 vigencias (2021–2026).
                  </p>
                  <p>
                    2. <strong className="text-white">Cambio Estructural con la Ley 2307 de 2023:</strong> La ley eliminó los límites de edad y extendió la gratuidad como derecho universal en instituciones públicas, lo que explica el salto presupuestal de <strong>$23.206M (2023)</strong> a <strong>$37.091M (2024)</strong> y <strong>$49.844M (2026)</strong>.
                  </p>
                  <p>
                    3. <strong className="text-white">Recomendación Institucional para el Escenario Base:</strong> Aunque el modelo de regresión lineal proyecta <strong>$54.459M COP (+9,26%, R²=94,65%)</strong> reflejando la alta expansión del programa, se aconseja adoptar para el anteproyecto presupuestal el <strong className="text-emerald-300">Parámetro Macroeconómico Oficial del +6,0% ($52.835M COP)</strong>. Esta postura prudente asegura el equilibrio financiero frente a posibles rezagos en las liquidaciones semestrales del Ministerio de Educación Nacional.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECCIÓN 0.45: RECURSO 17 (DEVOLUCIÓN DESCUENTO POR VOTACIÓN - LEY 403)     */}
      {/* ========================================================================= */}
      {selectedRecursoTab === 'r17' && (
        <div className="space-y-6 animate-in fade-in">
          {/* HEADER HERO R17 */}
          <div className="bg-gradient-to-br from-surface-container-high/90 to-background border border-sky-500/30 rounded-[32px] p-6 md:p-8 relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-sky-500/10 blur-[100px] rounded-full pointer-events-none"></div>

            <div className="relative z-10">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-white/10">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-sky-500/20 flex items-center justify-center text-sky-400 shrink-0 border border-sky-500/30 shadow-lg">
                    <Vote size={28} />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="text-xs font-mono uppercase tracking-wider font-bold text-sky-400 bg-sky-500/20 px-3 py-1 rounded-full border border-sky-500/30">
                        Compensación Legal • Ley 403 de 1997 & Ley 815 de 2003
                      </span>
                      <span className="text-xs font-mono font-bold text-emerald-300 bg-emerald-500/20 px-3 py-1 rounded-full border border-emerald-500/30 flex items-center gap-1">
                        <TrendingUp size={13} /> Parámetro Macroeconómico Aprobado: +6,0%
                      </span>
                      <span className="text-xs font-mono font-bold text-amber-300 bg-amber-500/20 px-3 py-1 rounded-full border border-amber-500/30">
                        Serie Oficial 2024–2026 (n = 3 vigencias)
                      </span>
                    </div>
                    <h3 className="text-2xl md:text-3xl font-display font-bold text-white tracking-tight mt-2">
                      Recurso 17: Devolución de Descuento por Votación
                    </h3>
                    <p className="text-xs md:text-sm text-on-surface-variant max-w-3xl mt-1 leading-relaxed">
                      Reembolso presupuestal reconocido y transferido anualmente por el Ministerio de Hacienda y Crédito Público (MHCP) con cargo al PGN para compensar a la UPTC por el <strong>descuento del 10% en matrícula</strong> otorgado a los estudiantes que ejercieron su derecho al voto en comicios oficiales.
                      Con un recaudo base en 2026 de <strong className="text-sky-300">$ 4.728.146.085 COP</strong> (-8,79% tras el pico electoral 2025 de $5.184M), se proyecta la vigencia 2027 aplicando el parámetro macroeconómico institucional oficial del <strong className="text-emerald-300">+6,0%</strong> (<strong className="text-emerald-300">$ 5.011.834.850 COP</strong>), evaluando adicionalmente escenarios inerciales y de medias ponderadas.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end gap-3 shrink-0">
                  <button
                    onClick={() => exportR17CSV(r17SelectedModel)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-sky-500 hover:bg-sky-400 text-black font-bold text-xs shadow-lg shadow-sky-500/20 transition-all hover:scale-[1.02] cursor-pointer"
                  >
                    <Download size={15} />
                    <span>Descargar Certificado R17 (CSV)</span>
                  </button>
                  <div className="flex items-center gap-2 text-right">
                    <span className="text-[11px] font-mono text-on-surface-variant">
                      Base Recaudo 2026: <strong className="text-sky-300">{formatCurrencyShortCOP(R17_BASE_2026)}</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* SELECTOR INTERACTIVO DE MODELOS R17 */}
              <div className="mt-6 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <span className="text-xs font-semibold text-sky-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles size={14} className="text-amber-400" />
                    Seleccionar Escenario de Proyección R17 para 2027:
                  </span>
                  <span className="text-[11px] font-mono text-on-surface-variant">
                    Modelo Activo: <strong className="text-white">{r17ActiveModel.name}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {R17_FORECAST_MODELS.map((m) => {
                    const isSelected = r17SelectedModel === m.id;
                    return (
                      <button
                        key={m.id}
                        onClick={() => setR17SelectedModel(m.id)}
                        className={`p-4 rounded-2xl text-left transition-all border cursor-pointer relative overflow-hidden ${
                          isSelected
                            ? 'bg-sky-500/15 border-sky-400 ring-2 ring-sky-500/40 shadow-lg scale-[1.02]'
                            : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                            isSelected ? 'bg-sky-500 text-black font-extrabold' : 'bg-white/10 text-on-surface-variant'
                          }`}>
                            {m.tag}
                          </span>
                          {m.isOfficial && (
                            <span className="text-[9px] font-mono font-bold text-emerald-300 bg-emerald-500/20 px-1.5 py-0.5 rounded border border-emerald-500/30">
                              Oficial Aprobado
                            </span>
                          )}
                        </div>
                        <div className="font-bold text-xs text-white mt-1">
                          {m.shortName}
                        </div>
                        <div className="font-mono text-lg font-extrabold text-sky-300 mt-0.5">
                          {formatCurrencyShortCOP(m.projected2027)}
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-mono text-on-surface-variant mt-2 pt-2 border-t border-white/10">
                          <span className="text-emerald-400 font-bold">+{m.variacionPct.toFixed(2)}%</span>
                          <span>+{formatCurrencyShortCOP(m.incrementoNominal)}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* TARJETAS KPI DE IMPACTO R17 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                {/* KPI 1: Proyección 2027 */}
                <div className="p-5 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold text-sky-300 uppercase tracking-wider">
                      Proyección 2027 (R17)
                    </span>
                    <span className="text-[10px] font-mono font-bold bg-sky-500/20 text-sky-200 px-2 py-0.5 rounded border border-sky-500/30">
                      {r17ActiveModel.tag}
                    </span>
                  </div>
                  <div>
                    <span className="text-2xl md:text-3xl font-mono font-extrabold text-sky-300 block">
                      {formatCurrencyShortCOP(r17ActiveModel.projected2027)}
                    </span>
                    <span className="text-[11px] font-mono text-white/90 block mt-0.5">
                      {formatCurrencyCOP(r17ActiveModel.projected2027)}
                    </span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-sky-500/20 text-[10px] text-on-surface-variant flex items-center justify-between">
                    <span>Fórmula:</span>
                    <strong className="text-sky-200 font-mono">{r17ActiveModel.formula}</strong>
                  </div>
                </div>

                {/* KPI 2: Recaudo Base 2026 */}
                <div className="p-5 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
                      Recaudo Referencia 2026
                    </span>
                    <span className="text-[10px] font-mono font-bold bg-white/10 text-white px-2 py-0.5 rounded border border-white/20">
                      Base Oficial
                    </span>
                  </div>
                  <div>
                    <span className="text-2xl md:text-3xl font-mono font-bold text-white block">
                      {formatCurrencyShortCOP(R17_BASE_2026)}
                    </span>
                    <span className="text-[11px] font-mono text-on-surface-variant block mt-0.5">
                      {formatCurrencyCOP(R17_BASE_2026)}
                    </span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-white/10 text-[10px] text-on-surface-variant flex items-center justify-between">
                    <span>Ajuste vs 2025:</span>
                    <strong className="text-rose-300 font-mono">-8,79% (-$455,6M)</strong>
                  </div>
                </div>

                {/* KPI 3: Incremento Nominal */}
                <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold text-emerald-300 uppercase tracking-wider">
                      Incremento Nominal 2027
                    </span>
                    <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-200 px-2 py-0.5 rounded border border-emerald-500/30">
                      +{r17ActiveModel.variacionPct.toFixed(1)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-2xl md:text-3xl font-mono font-extrabold text-emerald-400 block">
                      +{formatCurrencyShortCOP(r17ActiveModel.incrementoNominal)}
                    </span>
                    <span className="text-[11px] font-mono text-emerald-200/90 block mt-0.5">
                      +{formatCurrencyCOP(r17ActiveModel.incrementoNominal)}
                    </span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-emerald-500/20 text-[10px] text-on-surface-variant flex items-center justify-between">
                    <span>Variación Anual</span>
                    <strong className="text-emerald-300 font-mono">+{formatCurrencyShortCOP(r17ActiveModel.incrementoNominal)} Adicionales</strong>
                  </div>
                </div>

                {/* KPI 4: Descuento Legal y Cobertura */}
                <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold text-amber-300 uppercase tracking-wider">
                      Beneficio por Votación
                    </span>
                    <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-200 px-2 py-0.5 rounded border border-amber-500/30">
                      Ley 403 / 1997
                    </span>
                  </div>
                  <div>
                    <span className="text-2xl md:text-3xl font-mono font-extrabold text-amber-300 block">
                      10,0%
                    </span>
                    <span className="text-[11px] font-mono text-amber-200/90 block mt-0.5">
                      Sobre Matrícula Liquidada
                    </span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-amber-500/20 text-[10px] text-on-surface-variant flex items-center justify-between">
                    <span>Histórico Reciente</span>
                    <strong className="text-sky-300 font-mono">2024: $4.532M • 2025: $5.184M</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* GRÁFICO HISTÓRICO RECHARTS DE COMPORTAMIENTO R17 (2024-2027) */}
          <div className="glass-card p-6 md:p-8 rounded-[28px] border border-sky-500/20 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h4 className="text-lg md:text-xl font-display text-white font-bold flex items-center gap-2">
                  <BarChart3 size={20} className="text-sky-400" />
                  Evolución y Proyección de Devolución por Descuento de Votación (2024–2027)
                </h4>
                <p className="text-xs text-on-surface-variant mt-1">
                  Serie oficial de compensaciones liquidadas por el MHCP a la UPTC y proyección 2027 ({r17ActiveModel.name}).
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <span className="flex items-center gap-1.5 text-xs text-on-surface-variant font-medium">
                  <span className="w-3 h-3 rounded-full bg-sky-400"></span>
                  Recaudos Históricos (2024–2025)
                </span>
                <span className="flex items-center gap-1.5 text-xs text-on-surface-variant font-medium">
                  <span className="w-3 h-3 rounded-full bg-sky-600"></span>
                  Base 2026 ($4.728M)
                </span>
                <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-300">
                  <span className="w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-emerald-500/50"></span>
                  Proyección 2027 ({formatCurrencyShortCOP(r17ActiveModel.projected2027)})
                </span>
              </div>
            </div>

            <div className="h-[340px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={r17ChartSeries} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <defs>
                    <linearGradient id="r17BarGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#0284c7" stopOpacity={0.6} />
                    </linearGradient>
                    <linearGradient id="r17Bar2027" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#34d399" stopOpacity={1} />
                      <stop offset="100%" stopColor="#059669" stopOpacity={0.7} />
                    </linearGradient>
                    <linearGradient id="r17AreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0284c7" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#0284c7" stopOpacity={0.0} />
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
                    domain={[0, 6000000000]}
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
                                : 'bg-white/10 text-white border border-white/20'
                            }`}>
                              {item.is2027 ? 'PROYECCIÓN 2027' : item.is2026 ? 'BASE 2026' : 'HISTÓRICO REAL'}
                            </span>
                          </div>

                          <div className="space-y-1.5 text-xs">
                            <div className="flex justify-between items-baseline">
                              <span className="text-on-surface-variant">Total Recaudo:</span>
                              <span className="font-mono font-bold text-sky-300 text-sm">
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
                    fill="url(#r17AreaGrad)" 
                    stroke="none" 
                  />

                  <Bar dataKey="recaudo" radius={[8, 8, 0, 0]}>
                    {r17ChartSeries.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.is2027 ? 'url(#r17Bar2027)' : 'url(#r17BarGradient)'}
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
              <div className="flex items-center gap-2 text-sky-300">
                <Info size={16} className="shrink-0" />
                <span>
                  <strong>Dinámica del Recurso:</strong> Los reembolsos por descuento de votación reflejan la participación electoral estudiantil en elecciones oficiales (congreso, presidencia, regionales o consultas populares). El recaudo creció fuertemente en 2025 (+14,39%) y se reajustó en 2026 a <strong>$4.728M</strong>.
                </span>
              </div>
              <span className="font-mono text-emerald-400 font-bold shrink-0">
                Proyección Activa ({r17ActiveModel.tag}): {formatCurrencyCOP(r17ActiveModel.projected2027)}
              </span>
            </div>
          </div>

          {/* TABLA 1: HISTÓRICO Y PROYECCIÓN R17 */}
          <div className="glass-card p-6 md:p-8 rounded-[28px] border border-sky-500/20 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h4 className="text-lg font-display text-white font-bold flex items-center gap-2">
                  <Table size={18} className="text-sky-400" />
                  Tabla: Histórico y Proyección de Recaudos Recurso 17 — Descuento por Votación (2024–2027)
                </h4>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Detalle cronológico de las compensaciones presupuestales del Ministerio de Hacienda y proyección 2027.
                </p>
              </div>
              <button
                onClick={() => exportR17CSV(r17SelectedModel)}
                className="flex items-center gap-1.5 text-xs text-sky-300 hover:text-white px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
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
                    <th className="p-4 font-semibold text-right text-sky-300">Total Recaudo ($ COP)</th>
                    <th className="p-4 font-semibold text-right text-white">Total ($M)</th>
                    <th className="p-4 font-semibold text-right text-emerald-300">Variación Anual ($)</th>
                    <th className="p-4 font-semibold text-center text-amber-300">Variación (%)</th>
                    <th className="p-4 font-semibold text-left text-on-surface-variant">Criterio / Soporte</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-sans">
                  {R17_HISTORICAL_SERIES.map((h) => {
                    const is2027 = h.vigencia === 2027;
                    const is2026 = h.vigencia === 2026;
                    const recaudo = is2027 ? r17ActiveModel.projected2027 : h.totalRecaudo;
                    const varCOP = is2027 ? r17ActiveModel.incrementoNominal : h.variacionAnualCOP;
                    const varPct = is2027 ? r17ActiveModel.variacionPct : h.variacionAnualPct;

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
                          {formatCurrencyCOP(recaudo)}
                        </td>
                        <td className="p-4 text-right font-mono font-bold text-white">
                          {formatCurrencyShortCOP(recaudo)}
                        </td>
                        <td className="p-4 text-right font-mono">
                          {varCOP !== 0 ? (
                            <span className={varCOP >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                              {varCOP >= 0 ? '+' : ''}{formatCurrencyShortCOP(varCOP)}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="p-4 text-center font-mono font-bold">
                          {varPct !== 0 ? (
                            <span className={`px-2 py-0.5 rounded text-[11px] ${
                              is2027 
                                ? 'bg-emerald-500/30 text-emerald-300 font-extrabold' 
                                : varPct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}>
                              {varPct >= 0 ? '+' : ''}{varPct.toFixed(2)}%
                            </span>
                          ) : '—'}
                        </td>
                        <td className="p-4 text-on-surface-variant text-[11px] italic">
                          {is2027 ? `${r17ActiveModel.name} — ${r17ActiveModel.formula}` : h.notaNormativa}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* TABLA 2: MATRIZ DE MODELOS MATEMÁTICOS EVALUADOS */}
          <div className="glass-card p-6 md:p-8 rounded-[28px] border border-sky-500/20 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h4 className="text-lg font-display text-white font-bold flex items-center gap-2">
                  <Calculator size={18} className="text-sky-400" />
                  Matriz Comparativa de Modelos de Estimación R17 (Vigencia 2027)
                </h4>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Comparación técnica de los cuatro escenarios de proyección sobre la base 2026 ($4.728.146.085 COP).
                </p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/20">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-container-low text-on-surface-variant uppercase text-[11px] tracking-wider">
                  <tr>
                    <th className="p-4 font-semibold text-white">Modelo / Metodología</th>
                    <th className="p-4 font-semibold text-on-surface-variant">Fórmula / Ecuación</th>
                    <th className="p-4 font-semibold text-right text-sky-300">Proyección 2027 ($ COP)</th>
                    <th className="p-4 font-semibold text-right text-white">Cifra ($M)</th>
                    <th className="p-4 font-semibold text-right text-emerald-300">Incremento ($)</th>
                    <th className="p-4 font-semibold text-center text-amber-300">Variación %</th>
                    <th className="p-4 font-semibold text-center text-purple-300">Nivel de Riesgo</th>
                    <th className="p-4 font-semibold text-center text-white">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-sans">
                  {R17_FORECAST_MODELS.map((m) => {
                    const isSelected = r17SelectedModel === m.id;
                    const safeRisk = (m.riskLevel || 'bajo').toUpperCase();
                    return (
                      <tr 
                        key={m.id}
                        className={`transition-colors ${
                          isSelected 
                            ? 'bg-sky-500/15 font-semibold' 
                            : 'hover:bg-white/5'
                        }`}
                      >
                        <td className="p-4 font-bold text-white flex items-center gap-2">
                          <span 
                            className="w-2.5 h-2.5 rounded-full shrink-0" 
                            style={{ backgroundColor: m.color }}
                          />
                          <div>
                            <span className="block">{m.name}</span>
                            <span className="text-[10px] text-on-surface-variant font-normal block">{m.interpretation}</span>
                          </div>
                        </td>
                        <td className="p-4 font-mono text-on-surface-variant text-[11px]">
                          {m.formula}
                        </td>
                        <td className="p-4 text-right font-mono font-bold text-sky-300 text-sm">
                          {formatCurrencyCOP(m.projected2027)}
                        </td>
                        <td className="p-4 text-right font-mono font-bold text-white">
                          {formatCurrencyShortCOP(m.projected2027)}
                        </td>
                        <td className="p-4 text-right font-mono text-emerald-400 font-bold">
                          +{formatCurrencyShortCOP(m.incrementoNominal)}
                        </td>
                        <td className="p-4 text-center font-mono font-bold text-emerald-300">
                          +{m.variacionPct.toFixed(2)}%
                        </td>
                        <td className="p-4 text-center">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            {safeRisk}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          {isSelected ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-sky-500 text-black">
                              <CheckCircle2 size={12} /> Activo
                            </span>
                          ) : (
                            <button
                              onClick={() => setR17SelectedModel(m.id)}
                              className="px-2.5 py-1 rounded-full text-[10px] font-mono text-sky-300 hover:text-white bg-white/5 hover:bg-white/15 border border-white/10 transition-colors cursor-pointer"
                            >
                              Aplicar
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* PANEL DE JUSTIFICACIÓN METODOLÓGICA Y CONTEXTO NORMATIVO */}
          <div className="p-6 md:p-8 rounded-[28px] bg-gradient-to-r from-surface-container-high/90 to-background border border-sky-500/30 shadow-xl">
            <div className="flex flex-col md:flex-row items-start gap-5">
              <div className="w-12 h-12 rounded-2xl bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0 border border-sky-500/30">
                <Scale size={24} />
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono uppercase tracking-wider font-bold text-sky-400">
                    Marco Legal y Dictamen Financiero
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                    Ley 403 de 1997 • Ley 815 de 2003
                  </span>
                </div>
                <h4 className="text-xl font-bold text-white tracking-tight">
                  Mecanismo de Liquidación y Justificación de la Proyección 2027
                </h4>
                <div className="text-xs md:text-sm text-on-surface-variant space-y-2 leading-relaxed">
                  <p>
                    1. <strong className="text-white">Naturaleza del Reembolso Nacional:</strong> El descuento del 10% en el valor de la matrícula a favor de los sufragantes es un beneficio legal otorgado por mandato del Artículo 1 de la Ley 815 de 2003. La norma establece expresamente que el Ministerio de Hacienda y Crédito Público (MHCP) debe transferir a las universidades públicas los recursos equivalentes a las sumas que dejen de percibir por la aplicación del citado descuento, con cargo al Presupuesto General de la Nación.
                  </p>
                  <p>
                    2. <strong className="text-white">Estacionalidad Electoral y Base de Referencia 2026:</strong> La fluctuación histórica entre <strong>$4.532M (2024)</strong>, el pico de <strong>$5.184M (2025)</strong> y el cierre en <strong>$4.728M (2026)</strong> responde a los calendarios electorales y a la caducidad reglamentaria de los certificados electorales. Tomar el recaudo base 2026 ($4.728.146.085 COP) provee una línea base depurada y libre de rezagos contables de comicios anteriores.
                  </p>
                  <p>
                    3. <strong className="text-white">Indexación con Parámetro Macroeconómico Oficial (+6,0%):</strong> Al proyectar el 2027 con el <strong className="text-emerald-300">+6,0% ($5.011.834.850 COP)</strong>, la universidad indexa el valor monetario del subsidio en proporción al incremento en las tarifas de matrícula aprobadas y al IPC estimado, preservando el equilibrio presupuestal y asegurando una solicitud consistente ante el Ministerio de Hacienda.
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
                        <TrendingUp size={13} /> Parámetro Macroeconómico Aprobado: +6,0%
                      </span>
                    </div>
                    <h3 className="text-2xl md:text-3xl font-display font-bold text-white tracking-tight mt-2">
                      Recurso 18: Aportes Artículo 87 CESU
                    </h3>
                    <p className="text-xs md:text-sm text-on-surface-variant max-w-3xl mt-1 leading-relaxed">
                      Recurso de la Nación asignado conforme al <strong className="text-white">Artículo 87 de la Ley 30 de 1992</strong> y distribuido según las fórmulas del Consejo Nacional de Educación Superior (CESU) basadas en acreditación institucional, calidad académica y número de estudiantes. 
                      Dado que no se cuenta con una serie temporal extendida para modelos estocásticos, la proyección 2027 toma como base el recaudo 2026 (<strong className="text-purple-300">$ 1.573.078.344 COP</strong>) indexado con el parámetro macroeconómico oficial aprobado del <strong className="text-emerald-300">+6,0%</strong>.
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
                      +6,0% Indexado
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
                  Comportamiento histórico de las transferencias CESU y proyección con indexación macroeconómica (+6,0%).
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
                  Proyección 2027 ($1.667M)
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
                              {item.is2027 ? 'PROYECCIÓN (+6,0%)' : 'HISTÓRICO REAL'}
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
                Ajuste 2027 (+6,0%): $ 1.667.463.045 COP
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
                  ¿Por qué se aplica indexación macroeconómica (+6,0%) en lugar de modelos ARIMA?
                </h4>
                <div className="text-xs md:text-sm text-on-surface-variant space-y-2 leading-relaxed">
                  <p>
                    1. <strong className="text-white">Insuficiencia de Grados de Libertad para Series Temporales:</strong> Los modelos autorregresivos y de suavizamiento estocástico (ARIMA, Holt-Winters) requieren series históricas continuas con un mínimo técnico de observaciones ($n \ge 10$) para estimar parámetros como la autocorrelación ($\phi_1$) o la deriva ($c$) con validez estadística. Con únicamente 3 vigencias homogéneas de registro (2024–2026), cualquier ajuste econométrico generaría sobreajuste espurio (*overfitting*).
                  </p>
                  <p>
                    2. <strong className="text-white">Aplicación del Parámetro Macroeconómico Oficial:</strong> Siguiendo el acuerdo de directrices macroeconómicas de presupuesto, se indexa el recaudo base 2026 de <strong>$ 1.573.078.344 COP</strong> en un <strong>+6,0%</strong>, arrojando una proyección 2027 de <strong>$ 1.667.463.045 COP</strong>.
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
                Total: <strong className="text-white">{formatCurrencyCOP(matrixSummary.total2026)}</strong>
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
          {activeSubTab === 'unidades' && (() => {
            const unitBreakdown = [
              { unidad: 'Sede Central Tunja', rec2026: matrixSummary.total2026 * 0.68, proj2027: matrixSummary.totalProyeccion2027 * 0.68, participacion: 68.0 },
              { unidad: 'Facultad Seccional Duitama', rec2026: matrixSummary.total2026 * 0.14, proj2027: matrixSummary.totalProyeccion2027 * 0.14, participacion: 14.0 },
              { unidad: 'Facultad Seccional Sogamoso', rec2026: matrixSummary.total2026 * 0.12, proj2027: matrixSummary.totalProyeccion2027 * 0.12, participacion: 12.0 },
              { unidad: 'Facultad Seccional Chiquinquirá', rec2026: matrixSummary.total2026 * 0.06, proj2027: matrixSummary.totalProyeccion2027 * 0.06, participacion: 6.0 },
            ];
            return (
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
            );
          })()}
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
      {/* SECCIÓN 3: CONSOLIDADO INSTITUCIONAL DE 17 CONCEPTOS OFICIALES (2027)     */}
      {/* ========================================================================= */}
      {selectedRecursoTab === 'consolidado' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Tarjeta Principal / Hero */}
          <div className="glass-card p-6 md:p-8 rounded-[28px] border border-indigo-500/30 bg-gradient-to-br from-indigo-500/10 via-surface-container-high/90 to-background shadow-xl">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="max-w-3xl">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-xs font-mono uppercase tracking-wider font-bold text-indigo-400 bg-indigo-500/20 px-3 py-1 rounded-full border border-indigo-500/30 flex items-center gap-1.5">
                    <Sparkles size={13} className="text-indigo-400" />
                    Presupuesto Oficial UPTC — Formato Vigencia 2027
                  </span>
                  <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 font-semibold">
                    17 Conceptos Presupuestales
                  </span>
                </div>
                <h3 className="text-2xl md:text-3xl font-display font-bold text-white tracking-tight">
                  Consolidado Institucional de Proyecciones 2027
                </h3>
                <p className="text-xs md:text-sm text-on-surface-variant mt-2 leading-relaxed">
                  Matriz consolidada en el formato institucional por código presupuestal y recurso. Permite elegir o personalizar el modelo y valor proyectado para cada concepto individualmente, recalculando en tiempo real subtotales de Nación, Recursos Propios, Devolución IVA y el Total General UPTC.
                </p>

                {/* Botones de Exportación */}
                <div className="flex flex-wrap items-center gap-3 mt-4">
                  <button
                    onClick={handleDownloadConsolidatedPDF}
                    disabled={isDownloadingConsolidatedPDF}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white text-xs font-bold shadow-lg shadow-red-900/30 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    title="Exportar documento oficial en formato PDF para presentación institucional"
                  >
                    {isDownloadingConsolidatedPDF ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Generando PDF...</span>
                      </>
                    ) : (
                      <>
                        <FileText size={15} />
                        <span>Descargar PDF Oficial</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => exportConsolidated17ConceptsCSV(official17Consolidated)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white text-xs font-bold shadow-lg shadow-emerald-900/30 transition-all active:scale-95 cursor-pointer"
                    title="Descargar matriz completa en formato CSV compatible con Excel"
                  >
                    <FileSpreadsheet size={15} />
                    <span>Exportar CSV Oficial</span>
                  </button>
                </div>
              </div>

              {/* Indicadores Clave de la Proyección (KPIs) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-[320px] bg-black/40 p-4 rounded-2xl border border-white/10">
                <div className="p-3 rounded-xl bg-surface-container-high/60 border border-white/5">
                  <span className="text-[10px] uppercase tracking-wider text-on-surface-variant block font-medium">Recaudo Base 2026</span>
                  <span className="text-base font-mono font-bold text-sky-300">
                    {formatCurrencyShortCOP((official17Consolidated.totalConsolidado?.y26 ?? 0))}
                  </span>
                  <span className="text-[10px] font-mono text-on-surface-variant block truncate">
                    {formatCurrencyCOP((official17Consolidated.totalConsolidado?.y26 ?? 0))}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-surface-container-high/60 border border-white/5">
                  <span className="text-[10px] uppercase tracking-wider text-cyan-300 block font-medium">Giros Nación 2027</span>
                  <span className="text-base font-mono font-bold text-cyan-300">
                    {formatCurrencyShortCOP((official17Consolidated.subtotalNacion?.y27 ?? 0))}
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 block">
                    +{(official17Consolidated.subtotalNacion?.variationPct ?? 0).toFixed(2)}% ({(official17Consolidated.subtotalNacion?.participationPct ?? 0).toFixed(1)}%)
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-surface-container-high/60 border border-white/5">
                  <span className="text-[10px] uppercase tracking-wider text-amber-300 block font-medium">Autogestión (Propios + IVA)</span>
                  <span className="text-base font-mono font-bold text-amber-300">
                    {formatCurrencyShortCOP((official17Consolidated.subtotalAutogestion?.y27 ?? 0))}
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 block">
                    +{(official17Consolidated.subtotalAutogestion?.variationPct ?? 0).toFixed(2)}% ({(official17Consolidated.subtotalAutogestion?.participationPct ?? 0).toFixed(1)}%)
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-indigo-500/20 border border-indigo-500/30">
                  <span className="text-[10px] uppercase tracking-wider text-indigo-300 block font-bold">TOTAL UPTC 2027</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-lg font-mono font-extrabold text-emerald-400">
                      {formatCurrencyShortCOP((official17Consolidated.totalConsolidado?.y27 ?? 0))}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-emerald-300 bg-emerald-500/20 px-1.5 py-0.5 rounded">
                      +{(official17Consolidated.totalConsolidado?.variationPct ?? 0).toFixed(2)}%
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-white/90 block truncate">
                    {formatCurrencyCOP((official17Consolidated.totalConsolidado?.y27 ?? 0))}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Barra de Selección Rápida de Escenarios */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-surface-container-high/80 border border-white/10">
            <div className="flex items-center gap-2">
              <SlidersHorizontal size={16} className="text-indigo-400" />
              <span className="text-xs font-semibold text-white">Escenarios Rápidos de Proyección:</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={applyOfficialScenario}
                className="px-3 py-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 text-xs font-medium border border-indigo-500/30 transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Aplica +6,0% de ley a giros de la Nación y modelos institucionales base"
              >
                <ShieldCheck size={13} />
                <span>Oficial (+6,0% Nación & Criterios Institucionales)</span>
              </button>
              <button
                onClick={applyStatisticalScenario}
                className="px-3 py-1.5 rounded-lg bg-surface-container-highest hover:bg-white/10 text-on-surface text-xs font-medium border border-white/10 transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Aplica promedios ponderados WMA-3, regresión lineal y Holt-Winters"
              >
                <Activity size={13} className="text-teal-400" />
                <span>Estadístico (WMA-3 / Regresión)</span>
              </button>
              <button
                onClick={applyInercialScenario}
                className="px-3 py-1.5 rounded-lg bg-surface-container-highest hover:bg-white/10 text-on-surface text-xs font-medium border border-white/10 transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Mantiene los recaudos de la base 2026 (crecimiento cero)"
              >
                <Scale size={13} className="text-amber-400" />
                <span>Inercial (Base 2026)</span>
              </button>
              <button
                onClick={applyOfficialScenario}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-on-surface-variant hover:text-white transition-colors cursor-pointer"
                title="Restablecer valores predeterminados"
              >
                <RotateCcw size={14} />
              </button>
            </div>
          </div>

          {/* TABLA PRINCIPAL: 17 CONCEPTOS OFICIALES */}
          <div className="glass-card p-4 md:p-6 rounded-[28px] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-lg font-display text-white font-bold flex items-center gap-2">
                  <Table size={18} className="text-indigo-400" />
                  Matriz Oficial de Proyección Presupuestal UPTC (2024–2027)
                </h4>
                <p className="text-xs text-on-surface-variant">
                  Estructurada exactamente según el catálogo oficial de conceptos y fuentes de financiación. Haga clic en el selector o en el lápiz para personalizar cualquier valor.
                </p>
              </div>
              <div className="text-xs text-on-surface-variant font-mono">
                Valores en <strong className="text-white">COP ($)</strong> y en <strong className="text-emerald-400">Millones ($M)</strong>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/20">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-container-low text-on-surface-variant uppercase text-[11px] tracking-wider">
                  <tr>
                    <th className="p-3.5 font-semibold text-white w-10 text-center">N°</th>
                    <th className="p-3.5 font-semibold text-white min-w-[220px]">Concepto Presupuestal</th>
                    <th className="p-3.5 font-semibold text-indigo-300 min-w-[140px]">Código Concepto</th>
                    <th className="p-3.5 font-semibold text-sky-300 min-w-[170px]">Recurso</th>
                    <th className="p-3.5 font-semibold text-right text-on-surface-variant whitespace-nowrap">2024</th>
                    <th className="p-3.5 font-semibold text-right text-on-surface-variant whitespace-nowrap">2025</th>
                    <th className="p-3.5 font-semibold text-right text-sky-300 whitespace-nowrap">Base 2026 ($ M)</th>
                    <th className="p-3.5 font-semibold text-right text-emerald-300 whitespace-nowrap">Proy. 2027 ($ M Det.)</th>
                    <th className="p-3.5 font-semibold text-right text-white whitespace-nowrap">Proy. 2027 ($ M)</th>
                    <th className="p-3.5 font-semibold text-center text-amber-300 whitespace-nowrap">Var %</th>
                    <th className="p-3.5 font-semibold text-center text-purple-300 whitespace-nowrap">Part %</th>
                    <th className="p-3.5 font-semibold text-left text-white min-w-[230px]">Modelo / Elección de Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-sans">
                  {/* ========================================================= */}
                  {/* GRUPO 1: GIROS DE LA NACIÓN (Filas 1 a 6)                  */}
                  {/* ========================================================= */}
                  <tr className="bg-cyan-500/10 border-t-2 border-cyan-500/30">
                    <td colSpan={12} className="px-4 py-2 font-bold text-cyan-300 uppercase text-[11px] tracking-wider flex items-center gap-2">
                      <Landmark size={14} className="text-cyan-400" />
                      <span>1. Giros y Transferencias de la Nación (Leyes 30/1992, 1819/2016, 2307/2023, 403/1997 y CESU)</span>
                    </td>
                  </tr>

                  {official17Consolidated.rows.filter(r => r.grupo === 'nacion').map(row => {
                    const cDef = OFFICIAL_17_CONCEPTS_CATALOG.find(c => c.id === row.id);
                    const isEditing = editingConceptId === row.id;

                    return (
                      <tr key={row.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-3 text-center font-mono font-bold text-on-surface-variant">
                          {row.order}
                        </td>
                        <td className="p-3 font-semibold text-white">
                          <div className="font-medium text-white">{(row.concepto || row.nombre || '')}</div>
                          {row.isCustom && (
                            <span className="text-[10px] font-mono text-amber-400 font-normal">Valor editado manualmente</span>
                          )}
                        </td>
                        <td className="p-3 font-mono text-indigo-300">
                          <span className="px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-[11px]">
                            {(row.codigoConcepto || row.codigo || '')}
                          </span>
                        </td>
                        <td className="p-3 font-sans text-sky-200 text-[11px]">
                          <span className="px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/20">
                            {row.recurso}
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono text-on-surface-variant">
                          {(row.recaudo2024 ?? row.y24 ?? 0) > 0 ? formatCurrencyShortCOP((row.recaudo2024 ?? row.y24 ?? 0)) : '—'}
                        </td>
                        <td className="p-3 text-right font-mono text-on-surface-variant">
                          {(row.recaudo2025 ?? row.y25 ?? 0) > 0 ? formatCurrencyShortCOP((row.recaudo2025 ?? row.y25 ?? 0)) : '—'}
                        </td>
                        <td className="p-3 text-right font-mono font-semibold text-sky-300">
                          {formatCurrencyShortCOP((row.base2026 ?? row.y26 ?? 0))}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-emerald-300">
                          {formatCurrencyCOP(row.projected2027)}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-white">
                          {formatCurrencyShortCOP(row.projected2027)}
                        </td>
                        <td className="p-3 text-center font-mono font-bold">
                          <span className={`px-1.5 py-0.5 rounded text-[11px] ${
                            (row.variationPct ?? row.varPct ?? 0) >= 0 ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'
                          }`}>
                            {(row.variationPct ?? row.varPct ?? 0) >= 0 ? '+' : ''}{(row.variationPct ?? row.varPct ?? 0).toFixed(2)}%
                          </span>
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-purple-300">
                          {(row.participationPct ?? row.part ?? 0).toFixed(2)}%
                        </td>
                        <td className="p-3">
                          {isEditing ? (
                            <div className="flex items-center gap-1.5">
                              <div className="relative flex-1">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-on-surface-variant text-[10px] font-mono">$</span>
                                <input
                                  type="text"
                                  value={customInputValue}
                                  onChange={(e) => setCustomInputValue(e.target.value)}
                                  className="w-full pl-5 pr-2 py-1 text-xs rounded bg-surface-container-highest text-white border border-indigo-400 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-400"
                                  placeholder="Valor COP..."
                                  autoFocus
                                />
                              </div>
                              <button
                                onClick={() => handleSaveCustomValue(row.id)}
                                title="Guardar valor personalizado"
                                className="p-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer"
                              >
                                <Save size={13} />
                              </button>
                              <button
                                onClick={handleCancelCustomValue}
                                title="Cancelar"
                                className="p-1.5 rounded bg-surface-container-highest hover:bg-red-500/20 text-on-surface-variant hover:text-red-300 transition-colors cursor-pointer"
                              >
                                <X size={13} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <select
                                value={effective17Selections[row.id]?.modelId || row.selectedModelId}
                                onChange={(e) => handleModelChange17(row.id, e.target.value)}
                                className="flex-1 bg-surface-container-high hover:bg-surface-container-highest text-white text-xs px-2.5 py-1.5 rounded-lg border border-white/10 hover:border-white/20 font-sans focus:border-indigo-400 outline-none transition-colors truncate cursor-pointer"
                              >
                                {cDef?.models.map(m => (
                                  <option key={m.id} value={m.id} className="bg-surface-container-highest text-white">
                                    {m.name} ({formatCurrencyShortCOP(m.value)})
                                  </option>
                                ))}
                                <option value="custom" className="bg-surface-container-highest text-indigo-300">
                                  ✏️ Personalizado{effective17Selections[row.id]?.modelId === 'custom' ? ` (${formatCurrencyShortCOP(row.projected2027)})` : '...'}
                                </option>
                              </select>
                              {effective17Selections[row.id]?.modelId === 'custom' && (
                                <button
                                  onClick={() => {
                                    setEditingConceptId(row.id);
                                    setCustomInputValue(String(Math.round(row.projected2027)));
                                  }}
                                  title="Editar valor personalizado"
                                  className="p-1.5 rounded bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 transition-colors cursor-pointer"
                                >
                                  <Edit3 size={13} />
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {/* Subtotal Giros de la Nación */}
                  <tr className="bg-cyan-500/15 font-semibold text-cyan-200 border-t border-b border-cyan-500/30">
                    <td colSpan={4} className="p-3.5 pl-6 text-cyan-300 italic">
                      ↳ Subtotal Giros y Transferencias de la Nación (Conceptos 1 al 6)
                    </td>
                    <td className="p-3.5 text-right font-mono">
                      {formatCurrencyShortCOP(official17Consolidated.subtotalNacion.y24)}
                    </td>
                    <td className="p-3.5 text-right font-mono">
                      {formatCurrencyShortCOP(official17Consolidated.subtotalNacion.y25)}
                    </td>
                    <td className="p-3.5 text-right font-mono text-sky-200">
                      {formatCurrencyShortCOP(official17Consolidated.subtotalNacion.y26)}
                    </td>
                    <td className="p-3.5 text-right font-mono text-emerald-300 font-bold">
                      {formatCurrencyCOP((official17Consolidated.subtotalNacion?.y27 ?? 0))}
                    </td>
                    <td className="p-3.5 text-right font-mono text-white font-bold">
                      {formatCurrencyShortCOP((official17Consolidated.subtotalNacion?.y27 ?? 0))}
                    </td>
                    <td className="p-3.5 text-center font-mono text-emerald-300 font-bold">
                      +{(official17Consolidated.subtotalNacion?.variationPct ?? 0).toFixed(2)}%
                    </td>
                    <td className="p-3.5 text-center font-mono text-cyan-200 font-bold">
                      {(official17Consolidated.subtotalNacion?.participationPct ?? 0).toFixed(2)}%
                    </td>
                    <td className="p-3.5 text-xs text-cyan-300/80 italic">
                      6 Conceptos Presupuestales
                    </td>
                  </tr>

                  {/* ========================================================= */}
                  {/* GRUPO 2: RECURSOS PROPIOS (Filas 7 a 16)                   */}
                  {/* ========================================================= */}
                  <tr className="bg-amber-500/10 border-t-2 border-amber-500/30">
                    <td colSpan={12} className="px-4 py-2 font-bold text-amber-300 uppercase text-[11px] tracking-wider flex items-center gap-2">
                      <Building2 size={14} className="text-amber-400" />
                      <span>2. Recursos Propios UPTC (20-Propios — Derechos Pecuniarios, Matrículas y Servicios de Autogestión)</span>
                    </td>
                  </tr>

                  {official17Consolidated.rows.filter(r => r.grupo === 'propios').map(row => {
                    const cDef = OFFICIAL_17_CONCEPTS_CATALOG.find(c => c.id === row.id);
                    const isEditing = editingConceptId === row.id;

                    return (
                      <tr key={row.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-3 text-center font-mono font-bold text-on-surface-variant">
                          {row.order}
                        </td>
                        <td className="p-3 font-semibold text-white">
                          <div className="font-medium text-white">{(row.concepto || row.nombre || '')}</div>
                          {row.isCustom && (
                            <span className="text-[10px] font-mono text-amber-400 font-normal">Valor editado manualmente</span>
                          )}
                        </td>
                        <td className="p-3 font-mono text-indigo-300">
                          <span className="px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-[11px]">
                            {(row.codigoConcepto || row.codigo || '')}
                          </span>
                        </td>
                        <td className="p-3 font-sans text-amber-200 text-[11px]">
                          <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                            {row.recurso}
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono text-on-surface-variant">
                          {(row.recaudo2024 ?? row.y24 ?? 0) > 0 ? formatCurrencyShortCOP((row.recaudo2024 ?? row.y24 ?? 0)) : '—'}
                        </td>
                        <td className="p-3 text-right font-mono text-on-surface-variant">
                          {(row.recaudo2025 ?? row.y25 ?? 0) > 0 ? formatCurrencyShortCOP((row.recaudo2025 ?? row.y25 ?? 0)) : '—'}
                        </td>
                        <td className="p-3 text-right font-mono font-semibold text-sky-300">
                          {formatCurrencyShortCOP((row.base2026 ?? row.y26 ?? 0))}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-emerald-300">
                          {formatCurrencyCOP(row.projected2027)}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-white">
                          {formatCurrencyShortCOP(row.projected2027)}
                        </td>
                        <td className="p-3 text-center font-mono font-bold">
                          <span className={`px-1.5 py-0.5 rounded text-[11px] ${
                            (row.variationPct ?? row.varPct ?? 0) >= 0 ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'
                          }`}>
                            {(row.variationPct ?? row.varPct ?? 0) >= 0 ? '+' : ''}{(row.variationPct ?? row.varPct ?? 0).toFixed(2)}%
                          </span>
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-purple-300">
                          {(row.participationPct ?? row.part ?? 0).toFixed(2)}%
                        </td>
                        <td className="p-3">
                          {isEditing ? (
                            <div className="flex items-center gap-1.5">
                              <div className="relative flex-1">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-on-surface-variant text-[10px] font-mono">$</span>
                                <input
                                  type="text"
                                  value={customInputValue}
                                  onChange={(e) => setCustomInputValue(e.target.value)}
                                  className="w-full pl-5 pr-2 py-1 text-xs rounded bg-surface-container-highest text-white border border-indigo-400 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-400"
                                  placeholder="Valor COP..."
                                  autoFocus
                                />
                              </div>
                              <button
                                onClick={() => handleSaveCustomValue(row.id)}
                                title="Guardar valor personalizado"
                                className="p-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer"
                              >
                                <Save size={13} />
                              </button>
                              <button
                                onClick={handleCancelCustomValue}
                                title="Cancelar"
                                className="p-1.5 rounded bg-surface-container-highest hover:bg-red-500/20 text-on-surface-variant hover:text-red-300 transition-colors cursor-pointer"
                              >
                                <X size={13} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <select
                                value={effective17Selections[row.id]?.modelId || row.selectedModelId}
                                onChange={(e) => handleModelChange17(row.id, e.target.value)}
                                className="flex-1 bg-surface-container-high hover:bg-surface-container-highest text-white text-xs px-2.5 py-1.5 rounded-lg border border-white/10 hover:border-white/20 font-sans focus:border-indigo-400 outline-none transition-colors truncate cursor-pointer"
                              >
                                {cDef?.models.map(m => (
                                  <option key={m.id} value={m.id} className="bg-surface-container-highest text-white">
                                    {m.name} ({formatCurrencyShortCOP(m.value)})
                                  </option>
                                ))}
                                <option value="custom" className="bg-surface-container-highest text-indigo-300">
                                  ✏️ Personalizado{effective17Selections[row.id]?.modelId === 'custom' ? ` (${formatCurrencyShortCOP(row.projected2027)})` : '...'}
                                </option>
                              </select>
                              {effective17Selections[row.id]?.modelId === 'custom' && (
                                <button
                                  onClick={() => {
                                    setEditingConceptId(row.id);
                                    setCustomInputValue(String(Math.round(row.projected2027)));
                                  }}
                                  title="Editar valor personalizado"
                                  className="p-1.5 rounded bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 transition-colors cursor-pointer"
                                >
                                  <Edit3 size={13} />
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {/* Subtotal Recursos Propios */}
                  <tr className="bg-amber-500/15 font-semibold text-amber-200 border-t border-b border-amber-500/30">
                    <td colSpan={4} className="p-3.5 pl-6 text-amber-300 italic">
                      ↳ Subtotal Recursos Propios (Conceptos 7 al 16)
                    </td>
                    <td className="p-3.5 text-right font-mono">
                      {formatCurrencyShortCOP(official17Consolidated.subtotalPropios.y24)}
                    </td>
                    <td className="p-3.5 text-right font-mono">
                      {formatCurrencyShortCOP(official17Consolidated.subtotalPropios.y25)}
                    </td>
                    <td className="p-3.5 text-right font-mono text-sky-200">
                      {formatCurrencyShortCOP(official17Consolidated.subtotalPropios.y26)}
                    </td>
                    <td className="p-3.5 text-right font-mono text-emerald-300 font-bold">
                      {formatCurrencyCOP(official17Consolidated.subtotalPropios.y27)}
                    </td>
                    <td className="p-3.5 text-right font-mono text-white font-bold">
                      {formatCurrencyShortCOP(official17Consolidated.subtotalPropios.y27)}
                    </td>
                    <td className="p-3.5 text-center font-mono text-emerald-300 font-bold">
                      +{(official17Consolidated.subtotalPropios?.variationPct ?? 0).toFixed(2)}%
                    </td>
                    <td className="p-3.5 text-center font-mono text-amber-300 font-bold">
                      {(official17Consolidated.subtotalPropios?.participationPct ?? 0).toFixed(2)}%
                    </td>
                    <td className="p-3.5 text-xs text-amber-300/80 italic">
                      10 Conceptos Presupuestales
                    </td>
                  </tr>

                  {/* ========================================================= */}
                  {/* GRUPO 3: DEVOLUCIÓN IVA (Fila 17)                         */}
                  {/* ========================================================= */}
                  <tr className="bg-emerald-500/10 border-t-2 border-emerald-500/30">
                    <td colSpan={12} className="px-4 py-2 font-bold text-emerald-300 uppercase text-[11px] tracking-wider flex items-center gap-2">
                      <TrendingUp size={14} className="text-emerald-400" />
                      <span>3. Devolución IVA (21-Devolucion IVA — Beneficio Tributario IES Art. 92 Ley 30 / Art. 481 E.T.)</span>
                    </td>
                  </tr>

                  {official17Consolidated.rows.filter(r => r.grupo === 'iva').map(row => {
                    const cDef = OFFICIAL_17_CONCEPTS_CATALOG.find(c => c.id === row.id);
                    const isEditing = editingConceptId === row.id;

                    return (
                      <tr key={row.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-3 text-center font-mono font-bold text-on-surface-variant">
                          {row.order}
                        </td>
                        <td className="p-3 font-semibold text-white">
                          <div className="font-medium text-white">{(row.concepto || row.nombre || '')}</div>
                          {row.isCustom && (
                            <span className="text-[10px] font-mono text-amber-400 font-normal">Valor editado manualmente</span>
                          )}
                        </td>
                        <td className="p-3 font-mono text-indigo-300">
                          <span className="px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-[11px]">
                            {(row.codigoConcepto || row.codigo || '')}
                          </span>
                        </td>
                        <td className="p-3 font-sans text-emerald-200 text-[11px]">
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                            {row.recurso}
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono text-on-surface-variant">
                          {(row.recaudo2024 ?? row.y24 ?? 0) > 0 ? formatCurrencyShortCOP((row.recaudo2024 ?? row.y24 ?? 0)) : '—'}
                        </td>
                        <td className="p-3 text-right font-mono text-on-surface-variant">
                          {(row.recaudo2025 ?? row.y25 ?? 0) > 0 ? formatCurrencyShortCOP((row.recaudo2025 ?? row.y25 ?? 0)) : '—'}
                        </td>
                        <td className="p-3 text-right font-mono font-semibold text-sky-300">
                          {formatCurrencyShortCOP((row.base2026 ?? row.y26 ?? 0))}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-emerald-300">
                          {formatCurrencyCOP(row.projected2027)}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-white">
                          {formatCurrencyShortCOP(row.projected2027)}
                        </td>
                        <td className="p-3 text-center font-mono font-bold">
                          <span className={`px-1.5 py-0.5 rounded text-[11px] ${
                            (row.variationPct ?? row.varPct ?? 0) >= 0 ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'
                          }`}>
                            {(row.variationPct ?? row.varPct ?? 0) >= 0 ? '+' : ''}{(row.variationPct ?? row.varPct ?? 0).toFixed(2)}%
                          </span>
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-purple-300">
                          {(row.participationPct ?? row.part ?? 0).toFixed(2)}%
                        </td>
                        <td className="p-3">
                          {isEditing ? (
                            <div className="flex items-center gap-1.5">
                              <div className="relative flex-1">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-on-surface-variant text-[10px] font-mono">$</span>
                                <input
                                  type="text"
                                  value={customInputValue}
                                  onChange={(e) => setCustomInputValue(e.target.value)}
                                  className="w-full pl-5 pr-2 py-1 text-xs rounded bg-surface-container-highest text-white border border-indigo-400 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-400"
                                  placeholder="Valor COP..."
                                  autoFocus
                                />
                              </div>
                              <button
                                onClick={() => handleSaveCustomValue(row.id)}
                                title="Guardar valor personalizado"
                                className="p-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer"
                              >
                                <Save size={13} />
                              </button>
                              <button
                                onClick={handleCancelCustomValue}
                                title="Cancelar"
                                className="p-1.5 rounded bg-surface-container-highest hover:bg-red-500/20 text-on-surface-variant hover:text-red-300 transition-colors cursor-pointer"
                              >
                                <X size={13} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <select
                                value={effective17Selections[row.id]?.modelId || row.selectedModelId}
                                onChange={(e) => handleModelChange17(row.id, e.target.value)}
                                className="flex-1 bg-surface-container-high hover:bg-surface-container-highest text-white text-xs px-2.5 py-1.5 rounded-lg border border-white/10 hover:border-white/20 font-sans focus:border-indigo-400 outline-none transition-colors truncate cursor-pointer"
                              >
                                {cDef?.models.map(m => (
                                  <option key={m.id} value={m.id} className="bg-surface-container-highest text-white">
                                    {m.name} ({formatCurrencyShortCOP(m.value)})
                                  </option>
                                ))}
                                <option value="custom" className="bg-surface-container-highest text-indigo-300">
                                  ✏️ Personalizado{effective17Selections[row.id]?.modelId === 'custom' ? ` (${formatCurrencyShortCOP(row.projected2027)})` : '...'}
                                </option>
                              </select>
                              {effective17Selections[row.id]?.modelId === 'custom' && (
                                <button
                                  onClick={() => {
                                    setEditingConceptId(row.id);
                                    setCustomInputValue(String(Math.round(row.projected2027)));
                                  }}
                                  title="Editar valor personalizado"
                                  className="p-1.5 rounded bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 transition-colors cursor-pointer"
                                >
                                  <Edit3 size={13} />
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {/* Subtotal Devolución IVA */}
                  <tr className="bg-emerald-500/15 font-semibold text-emerald-200 border-t border-b border-emerald-500/30">
                    <td colSpan={4} className="p-3.5 pl-6 text-emerald-300 italic">
                      ↳ Subtotal Devolución IVA (Concepto 17)
                    </td>
                    <td className="p-3.5 text-right font-mono">
                      {formatCurrencyShortCOP(official17Consolidated.subtotalIva.y24)}
                    </td>
                    <td className="p-3.5 text-right font-mono">
                      {formatCurrencyShortCOP(official17Consolidated.subtotalIva.y25)}
                    </td>
                    <td className="p-3.5 text-right font-mono text-sky-200">
                      {formatCurrencyShortCOP(official17Consolidated.subtotalIva.y26)}
                    </td>
                    <td className="p-3.5 text-right font-mono text-emerald-300 font-bold">
                      {formatCurrencyCOP(official17Consolidated.subtotalIva.y27)}
                    </td>
                    <td className="p-3.5 text-right font-mono text-white font-bold">
                      {formatCurrencyShortCOP(official17Consolidated.subtotalIva.y27)}
                    </td>
                    <td className="p-3.5 text-center font-mono text-emerald-300 font-bold">
                      +{(official17Consolidated.subtotalIva?.variationPct ?? 0).toFixed(2)}%
                    </td>
                    <td className="p-3.5 text-center font-mono text-emerald-300 font-bold">
                      {(official17Consolidated.subtotalIva?.participationPct ?? 0).toFixed(2)}%
                    </td>
                    <td className="p-3.5 text-xs text-emerald-300/80 italic">
                      1 Concepto Presupuestal
                    </td>
                  </tr>

                  {/* Subtotal Autogestión Institucional (Propios + Devolución IVA) */}
                  <tr className="bg-white/10 font-bold text-white border-t-2 border-white/20">
                    <td colSpan={4} className="p-3.5 pl-6 text-white italic">
                      ↳ Subtotal Autogestión UPTC (Recursos Propios + Devolución IVA)
                    </td>
                    <td className="p-3.5 text-right font-mono text-on-surface-variant">
                      {formatCurrencyShortCOP(official17Consolidated.subtotalAutogestion.y24)}
                    </td>
                    <td className="p-3.5 text-right font-mono text-on-surface-variant">
                      {formatCurrencyShortCOP(official17Consolidated.subtotalAutogestion.y25)}
                    </td>
                    <td className="p-3.5 text-right font-mono text-sky-200">
                      {formatCurrencyShortCOP(official17Consolidated.subtotalAutogestion.y26)}
                    </td>
                    <td className="p-3.5 text-right font-mono text-emerald-300 font-extrabold">
                      {formatCurrencyCOP((official17Consolidated.subtotalAutogestion?.y27 ?? 0))}
                    </td>
                    <td className="p-3.5 text-right font-mono text-white font-extrabold">
                      {formatCurrencyShortCOP((official17Consolidated.subtotalAutogestion?.y27 ?? 0))}
                    </td>
                    <td className="p-3.5 text-center font-mono text-emerald-300 font-bold">
                      +{(official17Consolidated.subtotalAutogestion?.variationPct ?? 0).toFixed(2)}%
                    </td>
                    <td className="p-3.5 text-center font-mono text-white font-bold">
                      {(official17Consolidated.subtotalAutogestion?.participationPct ?? 0).toFixed(2)}%
                    </td>
                    <td className="p-3.5 text-xs text-on-surface-variant italic">
                      11 Conceptos de Autogestión
                    </td>
                  </tr>
                </tbody>

                {/* Total Combinado General */}
                <tfoot className="border-t-2 border-indigo-500/50 bg-black/60 font-bold text-white text-xs">
                  <tr className="shadow-lg">
                    <td colSpan={4} className="p-4 font-extrabold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                      <Landmark size={17} className="text-indigo-400 shrink-0" />
                      <span>TOTAL CONSOLIDADO UPTC 2027 (17 CONCEPTOS)</span>
                    </td>
                    <td className="p-4 text-right font-mono font-extrabold text-white">
                      {formatCurrencyShortCOP(official17Consolidated.totalConsolidado.y24)}
                    </td>
                    <td className="p-4 text-right font-mono font-extrabold text-white">
                      {formatCurrencyShortCOP(official17Consolidated.totalConsolidado.y25)}
                    </td>
                    <td className="p-4 text-right font-mono font-extrabold text-sky-300 bg-sky-500/20">
                      {formatCurrencyShortCOP((official17Consolidated.totalConsolidado?.y26 ?? 0))}
                    </td>
                    <td className="p-4 text-right font-mono font-extrabold text-emerald-300 bg-emerald-500/20 text-sm">
                      {formatCurrencyCOP((official17Consolidated.totalConsolidado?.y27 ?? 0))}
                    </td>
                    <td className="p-4 text-right font-mono font-extrabold text-white text-sm">
                      {formatCurrencyShortCOP((official17Consolidated.totalConsolidado?.y27 ?? 0))}
                    </td>
                    <td className="p-4 text-center font-mono font-extrabold text-emerald-400 bg-emerald-500/20">
                      +{(official17Consolidated.totalConsolidado?.variationPct ?? 0).toFixed(2)}%
                    </td>
                    <td className="p-4 text-center font-mono font-extrabold text-indigo-300">
                      100.00%
                    </td>
                    <td className="p-4 text-xs font-mono text-indigo-300 font-bold">
                      17 Conceptos Presupuestales
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* ELEMENTO IMPRIMIBLE / EXPORTABLE A PDF (OCULTO EN PANTALLA)                */}
          {/* ========================================================================= */}
          <div
            id="printable-consolidated-projection"
            style={{ display: 'none' }}
            className="p-8 bg-white text-slate-900 font-sans"
          >
            {/* Encabezado Institucional Oficial */}
            <div className="border-b-2 border-slate-800 pb-4 mb-4 flex justify-between items-start">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900 uppercase">
                  Universidad Pedagógica y Tecnológica de Colombia (UPTC)
                </h1>
                <h2 className="text-sm font-semibold text-slate-700">
                  Vicerrectoría Administrativa y Financiera (VAFI) — Dirección de Planeación y Presupuesto
                </h2>
                <h3 className="text-base font-bold text-indigo-900 mt-1">
                  PROYECCIÓN PRESUPUESTAL CONSOLIDADA INSTITUCIONAL — VIGENCIA 2027
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Matriz Oficial de 17 Conceptos Presupuestales por Código Presupuestal y Fuente de Financiación
                </p>
              </div>
              <div className="text-right text-xs text-slate-600 border border-slate-300 rounded p-2 bg-slate-50">
                <p><strong>Fecha de Expedición:</strong> {new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                <p><strong>Vigencia Proyectada:</strong> 2027</p>
                <p><strong>Moneda:</strong> Pesos Colombianos (COP)</p>
                <p><strong>Total Institucional:</strong> {formatCurrencyCOP((official17Consolidated.totalConsolidado?.y27 ?? 0))}</p>
              </div>
            </div>

            {/* Resumen de Metas */}
            <div className="grid grid-cols-4 gap-3 mb-4 text-xs">
              <div className="border border-slate-300 p-2 rounded bg-slate-50">
                <span className="text-[10px] uppercase text-slate-500 font-bold block">Recaudo Base 2026</span>
                <span className="text-sm font-mono font-bold text-slate-900">{formatCurrencyCOP((official17Consolidated.totalConsolidado?.y26 ?? 0))}</span>
              </div>
              <div className="border border-slate-300 p-2 rounded bg-slate-50">
                <span className="text-[10px] uppercase text-slate-500 font-bold block">Giros de la Nación 2027</span>
                <span className="text-sm font-mono font-bold text-indigo-900">{formatCurrencyCOP((official17Consolidated.subtotalNacion?.y27 ?? 0))}</span>
                <span className="text-[10px] text-slate-600 block">({(official17Consolidated.subtotalNacion?.participationPct ?? 0).toFixed(1)}% del presupuesto)</span>
              </div>
              <div className="border border-slate-300 p-2 rounded bg-slate-50">
                <span className="text-[10px] uppercase text-slate-500 font-bold block">Autogestión UPTC 2027</span>
                <span className="text-sm font-mono font-bold text-slate-900">{formatCurrencyCOP((official17Consolidated.subtotalAutogestion?.y27 ?? 0))}</span>
                <span className="text-[10px] text-slate-600 block">({(official17Consolidated.subtotalAutogestion?.participationPct ?? 0).toFixed(1)}% del presupuesto)</span>
              </div>
              <div className="border border-indigo-300 p-2 rounded bg-indigo-50">
                <span className="text-[10px] uppercase text-indigo-700 font-bold block">TOTAL PROYECTADO 2027</span>
                <span className="text-sm font-mono font-extrabold text-indigo-950">{formatCurrencyCOP((official17Consolidated.totalConsolidado?.y27 ?? 0))}</span>
                <span className="text-[10px] text-emerald-700 font-bold block">Variación: +{(official17Consolidated.totalConsolidado?.variationPct ?? 0).toFixed(2)}%</span>
              </div>
            </div>

            {/* Tabla de 17 Conceptos para PDF */}
            <table className="w-full text-left border-collapse border border-slate-300 text-[10px] mb-6">
              <thead>
                <tr className="bg-slate-800 text-white uppercase text-[9px] tracking-wider">
                  <th className="border border-slate-400 p-1.5 text-center w-6">N°</th>
                  <th className="border border-slate-400 p-1.5">Concepto Presupuestal</th>
                  <th className="border border-slate-400 p-1.5 text-center">Código Concepto</th>
                  <th className="border border-slate-400 p-1.5">Recurso</th>
                  <th className="border border-slate-400 p-1.5 text-right">2024 (COP)</th>
                  <th className="border border-slate-400 p-1.5 text-right">2025 (COP)</th>
                  <th className="border border-slate-400 p-1.5 text-right">Base 2026 (COP)</th>
                  <th className="border border-slate-400 p-1.5 text-right bg-slate-900">Proy. 2027 (COP)</th>
                  <th className="border border-slate-400 p-1.5 text-right">Proy. 2027 ($M)</th>
                  <th className="border border-slate-400 p-1.5 text-center">Var %</th>
                  <th className="border border-slate-400 p-1.5 text-center">Part %</th>
                  <th className="border border-slate-400 p-1.5">Criterio / Modelo</th>
                </tr>
              </thead>
              <tbody>
                {/* Grupo 1: Nación */}
                <tr className="bg-slate-200 font-bold text-slate-900">
                  <td colSpan={12} className="border border-slate-300 p-1 pl-2">
                    1. GIROS Y TRANSFERENCIAS DE LA NACIÓN
                  </td>
                </tr>
                {official17Consolidated.rows.filter(r => r.grupo === 'nacion').map(row => (
                  <tr key={row.id} className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="border border-slate-300 p-1 text-center font-mono">{row.order}</td>
                    <td className="border border-slate-300 p-1 font-medium">{(row.concepto || row.nombre || '')}</td>
                    <td className="border border-slate-300 p-1 font-mono text-center">{(row.codigoConcepto || row.codigo || '')}</td>
                    <td className="border border-slate-300 p-1 text-slate-700">{row.recurso}</td>
                    <td className="border border-slate-300 p-1 text-right font-mono">{(row.recaudo2024 ?? row.y24 ?? 0) > 0 ? formatCurrencyCOP((row.recaudo2024 ?? row.y24 ?? 0)) : '—'}</td>
                    <td className="border border-slate-300 p-1 text-right font-mono">{(row.recaudo2025 ?? row.y25 ?? 0) > 0 ? formatCurrencyCOP((row.recaudo2025 ?? row.y25 ?? 0)) : '—'}</td>
                    <td className="border border-slate-300 p-1 text-right font-mono font-semibold">{formatCurrencyCOP((row.base2026 ?? row.y26 ?? 0))}</td>
                    <td className="border border-slate-300 p-1 text-right font-mono font-bold text-indigo-900 bg-indigo-50/50">{formatCurrencyCOP(row.projected2027)}</td>
                    <td className="border border-slate-300 p-1 text-right font-mono font-bold">{formatCurrencyShortCOP(row.projected2027)}</td>
                    <td className="border border-slate-300 p-1 text-center font-mono">+{(row.variationPct ?? row.varPct ?? 0).toFixed(2)}%</td>
                    <td className="border border-slate-300 p-1 text-center font-mono">{(row.participationPct ?? row.part ?? 0).toFixed(2)}%</td>
                    <td className="border border-slate-300 p-1 text-slate-600">{row.selectedModelName}</td>
                  </tr>
                ))}
                {/* Subtotal Nación */}
                <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-400">
                  <td colSpan={4} className="border border-slate-300 p-1.5 pl-4 italic">
                    Subtotal Giros de la Nación (Conceptos 1 al 6)
                  </td>
                  <td className="border border-slate-300 p-1.5 text-right font-mono">{formatCurrencyCOP(official17Consolidated.subtotalNacion.y24)}</td>
                  <td className="border border-slate-300 p-1.5 text-right font-mono">{formatCurrencyCOP(official17Consolidated.subtotalNacion.y25)}</td>
                  <td className="border border-slate-300 p-1.5 text-right font-mono">{formatCurrencyCOP(official17Consolidated.subtotalNacion.y26)}</td>
                  <td className="border border-slate-300 p-1.5 text-right font-mono font-extrabold text-indigo-950 bg-indigo-100">{formatCurrencyCOP((official17Consolidated.subtotalNacion?.y27 ?? 0))}</td>
                  <td className="border border-slate-300 p-1.5 text-right font-mono font-bold">{formatCurrencyShortCOP((official17Consolidated.subtotalNacion?.y27 ?? 0))}</td>
                  <td className="border border-slate-300 p-1.5 text-center font-mono">+{(official17Consolidated.subtotalNacion?.variationPct ?? 0).toFixed(2)}%</td>
                  <td className="border border-slate-300 p-1.5 text-center font-mono">{(official17Consolidated.subtotalNacion?.participationPct ?? 0).toFixed(2)}%</td>
                  <td className="border border-slate-300 p-1.5 text-slate-500 italic">6 Conceptos</td>
                </tr>

                {/* Grupo 2: Propios */}
                <tr className="bg-slate-200 font-bold text-slate-900">
                  <td colSpan={12} className="border border-slate-300 p-1 pl-2">
                    2. RECURSOS PROPIOS (20-PROPIOS)
                  </td>
                </tr>
                {official17Consolidated.rows.filter(r => r.grupo === 'propios').map(row => (
                  <tr key={row.id} className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="border border-slate-300 p-1 text-center font-mono">{row.order}</td>
                    <td className="border border-slate-300 p-1 font-medium">{(row.concepto || row.nombre || '')}</td>
                    <td className="border border-slate-300 p-1 font-mono text-center">{(row.codigoConcepto || row.codigo || '')}</td>
                    <td className="border border-slate-300 p-1 text-slate-700">{row.recurso}</td>
                    <td className="border border-slate-300 p-1 text-right font-mono">{(row.recaudo2024 ?? row.y24 ?? 0) > 0 ? formatCurrencyCOP((row.recaudo2024 ?? row.y24 ?? 0)) : '—'}</td>
                    <td className="border border-slate-300 p-1 text-right font-mono">{(row.recaudo2025 ?? row.y25 ?? 0) > 0 ? formatCurrencyCOP((row.recaudo2025 ?? row.y25 ?? 0)) : '—'}</td>
                    <td className="border border-slate-300 p-1 text-right font-mono font-semibold">{formatCurrencyCOP((row.base2026 ?? row.y26 ?? 0))}</td>
                    <td className="border border-slate-300 p-1 text-right font-mono font-bold text-indigo-900 bg-indigo-50/50">{formatCurrencyCOP(row.projected2027)}</td>
                    <td className="border border-slate-300 p-1 text-right font-mono font-bold">{formatCurrencyShortCOP(row.projected2027)}</td>
                    <td className="border border-slate-300 p-1 text-center font-mono">+{(row.variationPct ?? row.varPct ?? 0).toFixed(2)}%</td>
                    <td className="border border-slate-300 p-1 text-center font-mono">{(row.participationPct ?? row.part ?? 0).toFixed(2)}%</td>
                    <td className="border border-slate-300 p-1 text-slate-600">{row.selectedModelName}</td>
                  </tr>
                ))}
                {/* Subtotal Propios */}
                <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-400">
                  <td colSpan={4} className="border border-slate-300 p-1.5 pl-4 italic">
                    Subtotal Recursos Propios (Conceptos 7 al 16)
                  </td>
                  <td className="border border-slate-300 p-1.5 text-right font-mono">{formatCurrencyCOP(official17Consolidated.subtotalPropios.y24)}</td>
                  <td className="border border-slate-300 p-1.5 text-right font-mono">{formatCurrencyCOP(official17Consolidated.subtotalPropios.y25)}</td>
                  <td className="border border-slate-300 p-1.5 text-right font-mono">{formatCurrencyCOP(official17Consolidated.subtotalPropios.y26)}</td>
                  <td className="border border-slate-300 p-1.5 text-right font-mono font-extrabold text-indigo-950 bg-indigo-100">{formatCurrencyCOP(official17Consolidated.subtotalPropios.y27)}</td>
                  <td className="border border-slate-300 p-1.5 text-right font-mono font-bold">{formatCurrencyShortCOP(official17Consolidated.subtotalPropios.y27)}</td>
                  <td className="border border-slate-300 p-1.5 text-center font-mono">+{(official17Consolidated.subtotalPropios?.variationPct ?? 0).toFixed(2)}%</td>
                  <td className="border border-slate-300 p-1.5 text-center font-mono">{(official17Consolidated.subtotalPropios?.participationPct ?? 0).toFixed(2)}%</td>
                  <td className="border border-slate-300 p-1.5 text-slate-500 italic">10 Conceptos</td>
                </tr>

                {/* Grupo 3: IVA */}
                <tr className="bg-slate-200 font-bold text-slate-900">
                  <td colSpan={12} className="border border-slate-300 p-1 pl-2">
                    3. DEVOLUCIÓN IVA (21-DEVOLUCION IVA)
                  </td>
                </tr>
                {official17Consolidated.rows.filter(r => r.grupo === 'iva').map(row => (
                  <tr key={row.id} className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="border border-slate-300 p-1 text-center font-mono">{row.order}</td>
                    <td className="border border-slate-300 p-1 font-medium">{(row.concepto || row.nombre || '')}</td>
                    <td className="border border-slate-300 p-1 font-mono text-center">{(row.codigoConcepto || row.codigo || '')}</td>
                    <td className="border border-slate-300 p-1 text-slate-700">{row.recurso}</td>
                    <td className="border border-slate-300 p-1 text-right font-mono">{(row.recaudo2024 ?? row.y24 ?? 0) > 0 ? formatCurrencyCOP((row.recaudo2024 ?? row.y24 ?? 0)) : '—'}</td>
                    <td className="border border-slate-300 p-1 text-right font-mono">{(row.recaudo2025 ?? row.y25 ?? 0) > 0 ? formatCurrencyCOP((row.recaudo2025 ?? row.y25 ?? 0)) : '—'}</td>
                    <td className="border border-slate-300 p-1 text-right font-mono font-semibold">{formatCurrencyCOP((row.base2026 ?? row.y26 ?? 0))}</td>
                    <td className="border border-slate-300 p-1 text-right font-mono font-bold text-indigo-900 bg-indigo-50/50">{formatCurrencyCOP(row.projected2027)}</td>
                    <td className="border border-slate-300 p-1 text-right font-mono font-bold">{formatCurrencyShortCOP(row.projected2027)}</td>
                    <td className="border border-slate-300 p-1 text-center font-mono">+{(row.variationPct ?? row.varPct ?? 0).toFixed(2)}%</td>
                    <td className="border border-slate-300 p-1 text-center font-mono">{(row.participationPct ?? row.part ?? 0).toFixed(2)}%</td>
                    <td className="border border-slate-300 p-1 text-slate-600">{row.selectedModelName}</td>
                  </tr>
                ))}
                {/* Subtotal Devolución IVA */}
                <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-400">
                  <td colSpan={4} className="border border-slate-300 p-1.5 pl-4 italic">
                    Subtotal Devolución IVA (Concepto 17)
                  </td>
                  <td className="border border-slate-300 p-1.5 text-right font-mono">{formatCurrencyCOP(official17Consolidated.subtotalIva.y24)}</td>
                  <td className="border border-slate-300 p-1.5 text-right font-mono">{formatCurrencyCOP(official17Consolidated.subtotalIva.y25)}</td>
                  <td className="border border-slate-300 p-1.5 text-right font-mono">{formatCurrencyCOP(official17Consolidated.subtotalIva.y26)}</td>
                  <td className="border border-slate-300 p-1.5 text-right font-mono font-extrabold text-indigo-950 bg-indigo-100">{formatCurrencyCOP(official17Consolidated.subtotalIva.y27)}</td>
                  <td className="border border-slate-300 p-1.5 text-right font-mono font-bold">{formatCurrencyShortCOP(official17Consolidated.subtotalIva.y27)}</td>
                  <td className="border border-slate-300 p-1.5 text-center font-mono">+{(official17Consolidated.subtotalIva?.variationPct ?? 0).toFixed(2)}%</td>
                  <td className="border border-slate-300 p-1.5 text-center font-mono">{(official17Consolidated.subtotalIva?.participationPct ?? 0).toFixed(2)}%</td>
                  <td className="border border-slate-300 p-1.5 text-slate-500 italic">1 Concepto</td>
                </tr>

                {/* Subtotal Autogestión (Propios + IVA) */}
                <tr className="bg-slate-200 font-bold text-slate-900 border-t-2 border-slate-500">
                  <td colSpan={4} className="border border-slate-300 p-1.5 pl-4 italic">
                    Subtotal Autogestión Institucional (Recursos Propios + Devolución IVA)
                  </td>
                  <td className="border border-slate-300 p-1.5 text-right font-mono">{formatCurrencyCOP(official17Consolidated.subtotalAutogestion.y24)}</td>
                  <td className="border border-slate-300 p-1.5 text-right font-mono">{formatCurrencyCOP(official17Consolidated.subtotalAutogestion.y25)}</td>
                  <td className="border border-slate-300 p-1.5 text-right font-mono">{formatCurrencyCOP(official17Consolidated.subtotalAutogestion.y26)}</td>
                  <td className="border border-slate-300 p-1.5 text-right font-mono font-extrabold text-slate-900">{formatCurrencyCOP((official17Consolidated.subtotalAutogestion?.y27 ?? 0))}</td>
                  <td className="border border-slate-300 p-1.5 text-right font-mono font-bold">{formatCurrencyShortCOP((official17Consolidated.subtotalAutogestion?.y27 ?? 0))}</td>
                  <td className="border border-slate-300 p-1.5 text-center font-mono">+{(official17Consolidated.subtotalAutogestion?.variationPct ?? 0).toFixed(2)}%</td>
                  <td className="border border-slate-300 p-1.5 text-center font-mono">{(official17Consolidated.subtotalAutogestion?.participationPct ?? 0).toFixed(2)}%</td>
                  <td className="border border-slate-300 p-1.5 text-slate-600 italic">11 Conceptos</td>
                </tr>
              </tbody>

              {/* Total Presupuesto UPTC 2027 */}
              <tfoot>
                <tr className="bg-slate-900 text-white font-extrabold text-[11px] border-t-2 border-slate-950">
                  <td colSpan={4} className="border border-slate-600 p-2 uppercase">
                    TOTAL PRESUPUESTO CONSOLIDADO UPTC 2027 (17 CONCEPTOS)
                  </td>
                  <td className="border border-slate-600 p-2 text-right font-mono">{formatCurrencyCOP(official17Consolidated.totalConsolidado.y24)}</td>
                  <td className="border border-slate-600 p-2 text-right font-mono">{formatCurrencyCOP(official17Consolidated.totalConsolidado.y25)}</td>
                  <td className="border border-slate-600 p-2 text-right font-mono text-sky-300">{formatCurrencyCOP((official17Consolidated.totalConsolidado?.y26 ?? 0))}</td>
                  <td className="border border-slate-600 p-2 text-right font-mono text-emerald-400 bg-slate-950 text-xs">{formatCurrencyCOP((official17Consolidated.totalConsolidado?.y27 ?? 0))}</td>
                  <td className="border border-slate-600 p-2 text-right font-mono text-white text-xs">{formatCurrencyShortCOP((official17Consolidated.totalConsolidado?.y27 ?? 0))}</td>
                  <td className="border border-slate-600 p-2 text-center font-mono text-emerald-300">+{(official17Consolidated.totalConsolidado?.variationPct ?? 0).toFixed(2)}%</td>
                  <td className="border border-slate-600 p-2 text-center font-mono">100.00%</td>
                  <td className="border border-slate-600 p-2 font-mono text-slate-300">17 Conceptos</td>
                </tr>
              </tfoot>
            </table>

            {/* Bloque de Firmas y Validación Institucional */}
            <div className="mt-8 pt-6 border-t border-slate-400 grid grid-cols-3 gap-8 text-center text-xs">
              <div>
                <div className="border-b border-slate-600 pb-1 mb-2 h-12 flex items-end justify-center font-serif italic text-slate-400">
                  Firma digitalizada
                </div>
                <p className="font-bold text-slate-900 uppercase">Profesional Especializado</p>
                <p className="text-slate-600 text-[10px]">Área de Planeación y Análisis Financiero</p>
                <p className="text-slate-500 text-[9px] mt-0.5">Elaboró Proyección Presupuestal</p>
              </div>

              <div>
                <div className="border-b border-slate-600 pb-1 mb-2 h-12 flex items-end justify-center font-serif italic text-slate-400">
                  Firma digitalizada
                </div>
                <p className="font-bold text-slate-900 uppercase">Director de Planeación</p>
                <p className="text-slate-600 text-[10px]">Dirección de Planeación Institucional UPTC</p>
                <p className="text-slate-500 text-[9px] mt-0.5">Revisó y Validó Modelación</p>
              </div>

              <div>
                <div className="border-b border-slate-600 pb-1 mb-2 h-12 flex items-end justify-center font-serif italic text-slate-400">
                  Firma digitalizada
                </div>
                <p className="font-bold text-slate-900 uppercase">Vicerrector Administrativo y Financiero</p>
                <p className="text-slate-600 text-[10px]">Vicerrectoría Administrativa y Financiera (VAFI)</p>
                <p className="text-slate-500 text-[9px] mt-0.5">Aprobó Presentación Presupuestal 2027</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
