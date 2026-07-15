import { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ComposedChart, Line, LineChart
} from 'recharts';
import { 
  Filter, DollarSign, Activity, TrendingUp, RefreshCw, Compass,
  Layers, Wallet, HelpCircle, AlertTriangle, ShieldCheck, ArrowRight, Download, Search, CheckCircle, FlameKindling
} from 'lucide-react';
import { fetchAndParseCSV } from '../lib/csvParser';
import { calculateProjections } from '../lib/financialEngine';
import { RESOURCES_LIST, getResourceFullName } from '../lib/resourceMapper';
import rawHistoricalGastos from '../data/historicalGastos.json';

const COLORS = ['#ffcc29', '#4ade80', '#3b82f6', '#c084fc', '#f43f5e', '#7bd0ff', '#fb7185', '#a78bfa'];

interface ScenarioData {
  ipc: number[];
  ices: number[];
  otherGrowth: number[];
}

export function MultiYearProjectionScreen({ onNavigate }: { onNavigate: (s: string) => void }) {
  const [dataStage, setDataStage] = useState<'loading' | 'ready'>('loading');
  const [rawYearlyIncomes, setRawYearlyIncomes] = useState<Record<number, any[]>>({});
  const [rawCumulativeIncomes, setRawCumulativeIncomes] = useState<any[]>([]);

  // Simulation Controls
  const [startYear, setStartYear] = useState<number>(2027);
  const [numYears, setNumYears] = useState<number>(5);
  const [activeScenario, setActiveScenario] = useState<'base' | 'conservador' | 'optimista' | 'personalizado'>('base');
  const [selectedResource, setSelectedResource] = useState<string>('Todos');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Table search and sorting
  const [sortField, setSortField] = useState<string>('year');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  // Scenario states containing IPC, ICES and Growth of other resources for up to 20 years
  const [scenarios, setScenarios] = useState<Record<'base' | 'conservador' | 'optimista' | 'personalizado', ScenarioData>>(() => {
    const makeDefault = (ipcVal: number, icesVal: number, otherVal: number): ScenarioData => ({
      ipc: new Array(20).fill(ipcVal),
      ices: new Array(20).fill(icesVal),
      otherGrowth: new Array(20).fill(otherVal)
    });
    return {
      base: makeDefault(4.0, 4.5, 4.0),
      conservador: makeDefault(3.0, 3.2, 2.0),
      optimista: makeDefault(5.5, 6.0, 6.0),
      personalizado: makeDefault(4.0, 4.5, 4.0)
    };
  });

  // Load simulator parameters from localStorage
  const simulatorSettings = useMemo(() => {
    try {
      const ing = localStorage.getItem('vafi_simIngByResource');
      const gas = localStorage.getItem('vafi_simGasByResource');
      const type = localStorage.getItem('vafi_simGasByType');
      const mode = localStorage.getItem('vafi_expenseAdjustMode');
      return {
        simIngByResource: ing ? JSON.parse(ing) : {},
        simGasByResource: gas ? JSON.parse(gas) : {},
        simGasByType: type ? JSON.parse(type) : {},
        expenseAdjustMode: (mode as any) || 'resource'
      };
    } catch (e) {
      return { simIngByResource: {}, simGasByResource: {}, simGasByType: {}, expenseAdjustMode: 'resource' as const };
    }
  }, []);

  // Fetch Incomes (2023-2026) for Baseline
  useEffect(() => {
    async function loadData() {
      try {
        setDataStage('loading');
        const years = [2023, 2024, 2025, 2026];
        const loadedData: Record<number, any[]> = {};
        
        await Promise.all(years.map(async (year) => {
          try {
            const rows = await fetchAndParseCSV(`https://raw.githubusercontent.com/fabiancho0724/Nomina/7d0f179b8bbcd3d327235c8e7fe2a4f757424794/Ingreso%20Mensual%20${year}.csv`);
            if (rows && rows.length > 0) {
              loadedData[year] = rows;
            }
          } catch (e) {
            console.error(`Error loading CSV for year ${year}:`, e);
          }
        }));

        const cumRows = await fetchAndParseCSV(`https://raw.githubusercontent.com/fabiancho0724/Nomina/7d0f179b8bbcd3d327235c8e7fe2a4f757424794/Ingresos.csv`);
        
        setRawYearlyIncomes(loadedData);
        setRawCumulativeIncomes(cumRows || []);
        setDataStage('ready');
      } catch (error) {
        console.error("Error loading CSV files in Multivigencia:", error);
        setDataStage('ready');
      }
    }
    loadData();
  }, []);

  // 1. Calculate 2026 Simulated baseline using simulator parameters
  const baseline2026 = useMemo(() => {
    if (Object.keys(rawYearlyIncomes).length === 0) {
      return { totals: { ing: 0, gasComp: 0, gasPago: 0 }, byResource: {} as Record<string, { ing: number; gasComp: number; gasPago: number }> };
    }
    
    // Fill sliders with defaults if they are missing
    const simIng = { ...simulatorSettings.simIngByResource };
    const simGas = { ...simulatorSettings.simGasByResource };
    RESOURCES_LIST.forEach(r => {
      if (simIng[r] === undefined) simIng[r] = 0;
      if (simGas[r] === undefined) simGas[r] = 0;
    });

    const res = calculateProjections({
      rawYearlyIncomes,
      rawCumulativeIncomes,
      rawHistoricalGastos,
      filterUnidad: 'Todos',
      filterRecurso: 'Todos',
      filterMes: 'Todos',
      filterTipoGasto: 'Todos',
      simIngByResource: simIng,
      simGasByResource: simGas,
      simGasByType: simulatorSettings.simGasByType,
      expenseAdjustMode: simulatorSettings.expenseAdjustMode
    });

    const byResource: Record<string, { ing: number; gasComp: number; gasPago: number }> = {};
    RESOURCES_LIST.forEach(r => {
      const ingSum = (res.monthlySimIngByRes[r] || []).reduce((a, b) => a + b, 0) / 1e6;
      const gasCompSum = (res.monthlySimGasCompByRes[r] || []).reduce((a, b) => a + b, 0) / 1e6;
      const gasPagoSum = (res.monthlySimGasPagoByRes[r] || []).reduce((a, b) => a + b, 0) / 1e6;
      byResource[r] = { ing: ingSum, gasComp: gasCompSum, gasPago: gasPagoSum };
    });

    return {
      totals: {
        ing: res.totals.simIng,
        gasComp: res.totals.simGasComp,
        gasPago: res.totals.simGasPago
      },
      byResource
    };
  }, [rawYearlyIncomes, rawCumulativeIncomes, simulatorSettings]);

  // Handle cell modification for personalizado scenario
  const handleIndexChange = (field: 'ipc' | 'ices' | 'otherGrowth', index: number, val: number) => {
    setScenarios(prev => {
      const copy = { ...prev };
      const scenCopy = { ...copy.personalizado };
      const arrCopy = [...scenCopy[field]];
      arrCopy[index] = val;
      scenCopy[field] = arrCopy;
      copy.personalizado = scenCopy;
      return copy;
    });
    if (activeScenario !== 'personalizado') {
      setActiveScenario('personalizado');
    }
  };

  // 2. Perform projection recursively for all N years and all scenarios
  const projectionResults = useMemo(() => {
    const results: Record<'base' | 'conservador' | 'optimista' | 'personalizado', any[]> = {
      base: [],
      conservador: [],
      optimista: [],
      personalizado: []
    };

    const scenarioKeys = ['base', 'conservador', 'optimista', 'personalizado'] as const;
    
    scenarioKeys.forEach(scen => {
      const scenData = scenarios[scen];
      const yearsArray: any[] = [];
      
      // Let's track values per resource for each year
      let prevYearResourceVals = { ...baseline2026.byResource };

      for (let t = 1; t <= numYears; t++) {
        const year = startYear + t - 1;
        const ipc = scenData.ipc[t - 1] || 0;
        const ices = scenData.ices[t - 1] || 0;
        const otherGrowth = scenData.otherGrowth[t - 1] || 0;
        
        const nationGrowth = Math.max(ipc, ices);
        const appliedIndexNation = nationGrowth;
        const justificationNation = ices > ipc 
          ? `ICES (${ices.toFixed(1)}%) > IPC (${ipc.toFixed(1)}%)`
          : `IPC (${ipc.toFixed(1)}%) >= ICES (${ices.toFixed(1)}%)`;

        const currentYearResourceVals: Record<string, { ing: number; gasComp: number; gasPago: number }> = {};
        
        let totalIng = 0;
        let totalGasComp = 0;
        let totalGasPago = 0;

        RESOURCES_LIST.forEach(r => {
          const prev = prevYearResourceVals[r] || { ing: 0, gasComp: 0, gasPago: 0 };
          const isNation = r === '10' || r === '10.1' || r === '10.2' || r === '10.5';
          const rate = isNation ? nationGrowth : otherGrowth;

          const ing = prev.ing * (1 + rate / 100);
          const gasComp = prev.gasComp * (1 + rate / 100);
          const gasPago = prev.gasPago * (1 + rate / 100);

          currentYearResourceVals[r] = { ing, gasComp, gasPago };
          
          totalIng += ing;
          totalGasComp += gasComp;
          totalGasPago += gasPago;
        });

        yearsArray.push({
          year,
          totals: {
            ing: totalIng,
            gasComp: totalGasComp,
            gasPago: totalGasPago,
            balanceComp: totalIng - totalGasComp,
            balancePago: totalIng - totalGasPago
          },
          byResource: currentYearResourceVals,
          ipc,
          ices,
          otherGrowth,
          nationGrowth,
          justificationNation
        });

        prevYearResourceVals = currentYearResourceVals;
      }
      results[scen] = yearsArray;
    });

    return results;
  }, [baseline2026, numYears, startYear, scenarios]);

  // Active projection data based on selected scenario
  const activeProjectionData = useMemo(() => {
    return projectionResults[activeScenario];
  }, [projectionResults, activeScenario]);

  // 3. Process data for Executive Dashboard and Charts (taking filters into account)
  const filteredDashboardData = useMemo(() => {
    return activeProjectionData.map((yearData, index) => {
      const year = yearData.year;
      let ing = 0;
      let gasComp = 0;
      let gasPago = 0;

      if (selectedResource === 'Todos') {
        ing = yearData.totals.ing;
        gasComp = yearData.totals.gasComp;
        gasPago = yearData.totals.gasPago;
      } else {
        const resData = yearData.byResource[selectedResource] || { ing: 0, gasComp: 0, gasPago: 0 };
        ing = resData.ing;
        gasComp = resData.gasComp;
        gasPago = resData.gasPago;
      }

      const prevYearData = index === 0 
        ? (selectedResource === 'Todos' 
            ? baseline2026.totals 
            : (baseline2026.byResource[selectedResource] || { ing: 0, gasComp: 0, gasPago: 0 }))
        : (selectedResource === 'Todos' 
            ? activeProjectionData[index - 1].totals
            : activeProjectionData[index - 1].byResource[selectedResource] || { ing: 0, gasComp: 0, gasPago: 0 });

      const prevIng = prevYearData.ing;
      const prevGasComp = prevYearData.gasComp;

      const ingGrowth = prevIng > 0 ? ((ing - prevIng) / prevIng) * 100 : 0;
      const gasGrowth = prevGasComp > 0 ? ((gasComp - prevGasComp) / prevGasComp) * 100 : 0;

      return {
        year,
        ingresos: parseFloat(ing.toFixed(2)),
        gastos: parseFloat(gasComp.toFixed(2)),
        gastosPago: parseFloat(gasPago.toFixed(2)),
        balance: parseFloat((ing - gasComp).toFixed(2)),
        balancePago: parseFloat((ing - gasPago).toFixed(2)),
        crecimientoIng: parseFloat(ingGrowth.toFixed(2)),
        crecimientoGas: parseFloat(gasGrowth.toFixed(2)),
        ipc: yearData.ipc,
        ices: yearData.ices,
        nationGrowth: yearData.nationGrowth,
        justification: yearData.justificationNation
      };
    });
  }, [activeProjectionData, selectedResource, baseline2026]);

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    if (filteredDashboardData.length === 0) return { ingFinal: 0, gasFinal: 0, balanceFinal: 0, ingGrowthAccum: 0, isDeficit: false };
    const first = selectedResource === 'Todos' 
      ? baseline2026.totals.ing 
      : (baseline2026.byResource[selectedResource]?.ing || 0);
    const lastIng = filteredDashboardData[filteredDashboardData.length - 1].ingresos;
    const lastGas = filteredDashboardData[filteredDashboardData.length - 1].gastos;

    const ingGrowthAccum = first > 0 ? ((lastIng - first) / first) * 100 : 0;
    const anyDeficit = filteredDashboardData.some(d => d.balance < 0);

    return {
      ingFinal: lastIng,
      gasFinal: lastGas,
      balanceFinal: lastIng - lastGas,
      ingGrowthAccum,
      isDeficit: anyDeficit
    };
  }, [filteredDashboardData, selectedResource, baseline2026]);

  // Scenario Comparison Data for Chart
  const scenarioComparisonChartData = useMemo(() => {
    return new Array(numYears).fill(0).map((_, idx) => {
      const year = startYear + idx;
      
      const getValForScenario = (scen: 'base' | 'conservador' | 'optimista' | 'personalizado') => {
        const yearData = projectionResults[scen][idx];
        if (!yearData) return 0;
        if (selectedResource === 'Todos') {
          return yearData.totals.ing - yearData.totals.gasComp;
        } else {
          const res = yearData.byResource[selectedResource] || { ing: 0, gasComp: 0 };
          return res.ing - res.gasComp;
        }
      };

      return {
        year,
        Base: parseFloat(getValForScenario('base').toFixed(2)),
        Conservador: parseFloat(getValForScenario('conservador').toFixed(2)),
        Optimista: parseFloat(getValForScenario('optimista').toFixed(2)),
        Personalizado: parseFloat(getValForScenario('personalizado').toFixed(2))
      };
    });
  }, [projectionResults, numYears, startYear, selectedResource]);

  // Resource Share distribution (Final projected year)
  const resourceShareData = useMemo(() => {
    if (activeProjectionData.length === 0) return [];
    const finalYearData = activeProjectionData[activeProjectionData.length - 1];
    
    const shares = RESOURCES_LIST.map((r, idx) => {
      const val = finalYearData.byResource[r]?.ing || 0;
      return {
        name: r,
        fullName: getResourceFullName(r),
        value: parseFloat(val.toFixed(2))
      };
    })
    .filter(s => s.value > 0.01)
    .sort((a, b) => b.value - a.value);

    // Limit to top 7 and group others
    if (shares.length > 7) {
      const top = shares.slice(0, 6);
      const otherVal = shares.slice(6).reduce((acc, s) => acc + s.value, 0);
      top.push({ name: 'Otros', fullName: 'Otras fuentes agrupadas', value: parseFloat(otherVal.toFixed(2)) });
      return top;
    }
    return shares;
  }, [activeProjectionData]);

  // Table Data Flat Representation
  const flatTableData = useMemo(() => {
    const list: any[] = [];
    activeProjectionData.forEach((yearData) => {
      const year = yearData.year;
      RESOURCES_LIST.forEach((r) => {
        if (selectedResource !== 'Todos' && r !== selectedResource) return;
        
        const isNation = r === '10' || r === '10.1' || r === '10.2' || r === '10.5';
        const rate = isNation ? yearData.nationGrowth : yearData.otherGrowth;
        const resData = yearData.byResource[r] || { ing: 0, gasComp: 0, gasPago: 0 };

        // Find baseline previous year value (or 2026 baseline if first year)
        const idx = activeProjectionData.findIndex(y => y.year === year);
        let prevVal = 0;
        if (idx === 0) {
          prevVal = baseline2026.byResource[r]?.ing || 0;
        } else {
          prevVal = activeProjectionData[idx - 1].byResource[r]?.ing || 0;
        }

        list.push({
          year,
          resource: r,
          resourceName: getResourceFullName(r),
          baseVal: prevVal,
          ipc: yearData.ipc,
          ices: yearData.ices,
          indexApplied: rate,
          projVal: resData.ing,
          projGas: resData.gasComp,
          incAbs: resData.ing - prevVal,
          incPct: rate,
          justification: isNation ? yearData.justificationNation : 'Crecimiento Recursos Propios/Otros'
        });
      });
    });

    // Apply text search
    let filtered = list;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      filtered = list.filter(row => 
        row.resource.toLowerCase().includes(q) || 
        row.resourceName.toLowerCase().includes(q) ||
        row.year.toString().includes(q)
      );
    }

    // Apply sorting
    return [...filtered].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }
      if (aVal < bVal) return sortAsc ? -1 : 1;
      if (aVal > bVal) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [activeProjectionData, selectedResource, baseline2026, searchQuery, sortField, sortAsc]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // AI-Powered Automated Observations
  const automaticObservations = useMemo(() => {
    const obs: string[] = [];
    if (filteredDashboardData.length === 0) return [];

    // Observation 1: Deficit warnings
    const deficitYears = filteredDashboardData.filter(d => d.balance < 0);
    if (deficitYears.length > 0) {
      obs.push(`⚠️ Se proyecta **Déficit Financiero** en las vigencias: **${deficitYears.map(d => d.year).join(', ')}** donde los gastos comprometidos estimados superan al recaudo de ingresos.`);
    } else {
      obs.push(`✅ Estabilidad Presupuestal: El escenario mantiene **superávit financiero** (ingresos > compromisos) durante todo el periodo proyectado.`);
    }

    // Observation 2: Impact of IPC vs ICES
    const totalSavingDueToICES = activeProjectionData.reduce((acc, y) => {
      const diff = Math.max(y.ipc, y.ices) - y.ipc;
      if (diff <= 0) return acc;
      // Get baseline nation resources sum
      let nationBase = 0;
      RESOURCES_LIST.forEach(r => {
        if (r === '10' || r === '10.1' || r === '10.2' || r === '10.5') {
          nationBase += baseline2026.byResource[r]?.ing || 0;
        }
      });
      return acc + (nationBase * (diff / 100));
    }, 0);

    if (totalSavingDueToICES > 0) {
      obs.push(`📈 Regla de Salvaguarda Nación: La aplicación de **MAX(IPC, ICES)** (donde el ICES superó al IPC) representa un incremento adicional acumulado estimado de **$${totalSavingDueToICES.toFixed(1)}M** para los Recursos Nación en comparación con una indexación estándar por IPC.`);
    }

    // Observation 3: Growth warning
    const lastYearData = filteredDashboardData[filteredDashboardData.length - 1];
    if (lastYearData.crecimientoGas > lastYearData.crecimientoIng) {
      obs.push(`🚨 Riesgo de Sostenibilidad: Hacia el año final (${lastYearData.year}), la tasa de crecimiento del gasto (**${lastYearData.crecimientoGas}%**) es superior a la del ingreso (**${lastYearData.crecimientoIng}%**). Se sugiere recortar egresos no indexados.`);
    }

    // Observation 4: Dominant resource
    if (resourceShareData.length > 0) {
      const top = resourceShareData[0];
      obs.push(`💼 Concentración de Aportes: El recurso **${top.name} (${top.fullName.split(' - ').pop()})** sigue siendo la fuente de financiación dominante en el largo plazo con una participación del **${((top.value / summaryMetrics.ingFinal) * 100).toFixed(1)}%** del total de ingresos.`);
    }

    return obs;
  }, [filteredDashboardData, activeProjectionData, resourceShareData, baseline2026, summaryMetrics]);

  // Export functions
  const exportToCSV = () => {
    const headers = ['Vigencia', 'Recurso', 'Nombre Recurso', 'Valor Base (M)', 'IPC Proyectado (%)', 'ICES Proyectado (%)', 'Tasa Aplicada (%)', 'Valor Proyectado (M)', 'Incremento Absoluto (M)', 'Justificacion'];
    const csvRows = [headers.join(',')];
    
    flatTableData.forEach(row => {
      const line = [
        row.year,
        `"${row.resource}"`,
        `"${row.resourceName}"`,
        row.baseVal.toFixed(2),
        row.ipc.toFixed(2),
        row.ices.toFixed(2),
        row.indexApplied.toFixed(2),
        row.projVal.toFixed(2),
        row.incAbs.toFixed(2),
        `"${row.justification}"`
      ];
      csvRows.push(line.join(','));
    });

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Proyeccion_Multivigencia_Escenario_${activeScenario}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToExcelDummy = () => {
    // Generate simple HTML table which Excel can open cleanly
    let html = `<table><thead><tr><th>Vigencia</th><th>Recurso</th><th>Nombre Recurso</th><th>Valor Base (M)</th><th>IPC (%)</th><th>ICES (%)</th><th>Tasa Aplicada (%)</th><th>Valor Proyectado (M)</th><th>Incremento Absoluto (M)</th><th>Justificacion</th></tr></thead><tbody>`;
    flatTableData.forEach(row => {
      html += `<tr><td>${row.year}</td><td>${row.resource}</td><td>${row.resourceName}</td><td>${row.baseVal.toFixed(2)}</td><td>${row.ipc.toFixed(2)}</td><td>${row.ices.toFixed(2)}</td><td>${row.indexApplied.toFixed(2)}</td><td>${row.projVal.toFixed(2)}</td><td>${row.incAbs.toFixed(2)}</td><td>${row.justification}</td></tr>`;
    });
    html += '</tbody></table>';

    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Proyeccion_Multivigencia_${activeScenario}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  if (dataStage === 'loading') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <RefreshCw className="animate-spin text-[#ffcc29]" size={40} />
        <p className="text-on-surface-variant font-mono text-sm">Cargando línea base y consolidando vigencia 2026...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300 print:bg-white print:text-black">
      
      {/* Header and Controls */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 print:hidden">
        <div>
          <h2 className="text-3xl font-display font-extrabold text-white flex items-center gap-3">
            <Layers className="text-[#ffcc29]" size={30} />
            Proyección Financiera Multivigencia
          </h2>
          <p className="text-sm text-on-surface-variant mt-1.5 font-light">
            Planificación prospectiva de mediano y largo plazo basada en la ejecución simulada de la vigencia 2026.
          </p>
        </div>

        {/* Global Action Bar */}
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={exportToCSV}
            className="px-4 py-2 bg-white/5 border border-white/10 hover:border-[#ffcc29]/30 rounded-xl font-bold text-xs font-mono uppercase tracking-wider flex items-center gap-2 text-white hover:bg-white/10 transition-all cursor-pointer"
          >
            <Download size={14} /> Exportar CSV
          </button>
          <button 
            onClick={exportToExcelDummy}
            className="px-4 py-2 bg-white/5 border border-white/10 hover:border-[#ffcc29]/30 rounded-xl font-bold text-xs font-mono uppercase tracking-wider flex items-center gap-2 text-white hover:bg-white/10 transition-all cursor-pointer"
          >
            <Download size={14} /> Exportar Excel
          </button>
          <button 
            onClick={handlePrint}
            className="px-4 py-2 bg-white/5 border border-white/10 hover:border-[#ffcc29]/30 rounded-xl font-bold text-xs font-mono uppercase tracking-wider flex items-center gap-2 text-white hover:bg-white/10 transition-all cursor-pointer"
          >
            Imprimir Reporte (PDF)
          </button>
        </div>
      </div>

      {/* Configuration Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 print:hidden">
        
        {/* Parametric selectors */}
        <div className="xl:col-span-8 glass-card rounded-[32px] p-6 lg:p-8 border border-white/10 space-y-6">
          <div className="flex items-center gap-2 pb-4 border-b border-white/5">
            <Compass className="text-[#ffcc29]" size={20} />
            <h3 className="text-lg font-display font-medium text-white">Parámetros del Modelo Prospectivo</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Year Input */}
            <div className="space-y-2">
              <label className="text-xs font-bold font-mono text-on-surface-variant uppercase">Año Inicial</label>
              <input 
                type="number"
                min={2027}
                max={2035}
                value={startYear}
                onChange={(e) => setStartYear(Math.max(2027, parseInt(e.target.value) || 2027))}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary-container text-on-surface font-mono"
              />
            </div>

            {/* Slider Duration */}
            <div className="space-y-2 col-span-1 md:col-span-2">
              <div className="flex justify-between">
                <label className="text-xs font-bold font-mono text-on-surface-variant uppercase">Periodo a Proyectar</label>
                <span className="text-xs font-bold font-mono text-[#ffcc29]">{numYears} años (hasta {startYear + numYears - 1})</span>
              </div>
              <input 
                type="range"
                min={1}
                max={20}
                value={numYears}
                onChange={(e) => setNumYears(parseInt(e.target.value))}
                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#ffcc29] mt-3"
              />
              <div className="flex justify-between text-[10px] text-white/40 font-mono">
                <span>1 año</span>
                <span>10 años</span>
                <span>20 años</span>
              </div>
            </div>
          </div>

          {/* Scenarios select buttons */}
          <div className="space-y-3 pt-2">
            <label className="text-xs font-bold font-mono text-on-surface-variant uppercase block">Escenario Macroeconómico</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(['base', 'conservador', 'optimista', 'personalizado'] as const).map(scen => (
                <button
                  key={scen}
                  onClick={() => setActiveScenario(scen)}
                  className={`p-3 rounded-2xl border font-bold text-xs uppercase font-mono tracking-wider transition-all cursor-pointer ${activeScenario === scen ? 'bg-[#ffcc29] border-[#ffcc29] text-black shadow-lg shadow-[#ffcc29]/15' : 'bg-white/5 border-white/10 text-white hover:bg-white/10'}`}
                >
                  {scen}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Filters and Base Reference */}
        <div className="xl:col-span-4 glass-card rounded-[32px] p-6 lg:p-8 border border-white/10 flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Filter className="text-[#ffcc29]" size={20} />
                <h3 className="text-base font-display font-medium text-white">Segmentación</h3>
              </div>
              <span className="text-[10px] font-mono bg-white/5 px-2.5 py-1 rounded-full border border-white/10 text-[#ffcc29] uppercase">Línea Base: 2026</span>
            </div>

            {/* Resources Filter */}
            <div className="space-y-2">
              <label className="text-xs font-bold font-mono text-on-surface-variant uppercase block">Fuente de Financiación</label>
              <select
                value={selectedResource}
                onChange={(e) => setSelectedResource(e.target.value)}
                className="w-full bg-[#0c0c0e] border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary-container text-on-surface custom-scrollbar"
              >
                <option value="Todos">Todas las Fuentes (Agrupado)</option>
                {RESOURCES_LIST.map(r => (
                  <option key={r} value={r}>{r} - {getResourceFullName(r).split(' - ').pop()}</option>
                ))}
              </select>
            </div>

            {/* Micro Stats baseline info */}
            <div className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-2 text-xs font-mono">
              <span className="text-[10px] text-white/40 block">CONSOLIDADO SIMULADO baseline (2026)</span>
              <div className="flex justify-between">
                <span className="text-white/60">Ingresos Base:</span>
                <span className="text-white font-bold">${(selectedResource === 'Todos' ? baseline2026.totals.ing : (baseline2026.byResource[selectedResource]?.ing || 0)).toLocaleString('es-CO', {maximumFractionDigits:1})}M</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Gastos Base:</span>
                <span className="text-white font-bold">${(selectedResource === 'Todos' ? baseline2026.totals.gasComp : (baseline2026.byResource[selectedResource]?.gasComp || 0)).toLocaleString('es-CO', {maximumFractionDigits:1})}M</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Scorecard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* KPI 1 */}
        <div className="glass-card rounded-[24px] p-6 border border-white/10 bg-surface/30 relative overflow-hidden flex flex-col justify-between min-h-[120px]">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-[#ffcc29]"></div>
          <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider block">Ingresos Finales ({startYear + numYears - 1})</span>
          <span className="text-3xl font-display font-extrabold text-white mt-2">${summaryMetrics.ingFinal.toLocaleString('es-CO', {maximumFractionDigits:1})}M</span>
          <span className="text-[10px] font-mono text-[#4ade80] mt-1">Crecimiento del ingreso acumulado</span>
        </div>

        {/* KPI 2 */}
        <div className="glass-card rounded-[24px] p-6 border border-white/10 bg-surface/30 relative overflow-hidden flex flex-col justify-between min-h-[120px]">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-[#f43f5e]"></div>
          <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider block">Gastos Finales ({startYear + numYears - 1})</span>
          <span className="text-3xl font-display font-extrabold text-white mt-2">${summaryMetrics.gasFinal.toLocaleString('es-CO', {maximumFractionDigits:1})}M</span>
          <span className="text-[10px] font-mono text-white/50 mt-1">Gastos proyectados comprometidos</span>
        </div>

        {/* KPI 3 */}
        <div className="glass-card rounded-[24px] p-6 border border-white/10 bg-surface/30 relative overflow-hidden flex flex-col justify-between min-h-[120px]">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500"></div>
          <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider block">Balance en Año Final</span>
          <span className={`text-3xl font-display font-extrabold mt-2 ${summaryMetrics.balanceFinal >= 0 ? 'text-[#4ade80]' : 'text-red-400'}`}>
            ${summaryMetrics.balanceFinal.toLocaleString('es-CO', {maximumFractionDigits:1})}M
          </span>
          <span className="text-[10px] font-mono text-white/50 mt-1">{summaryMetrics.balanceFinal >= 0 ? 'Superávit Financiero' : 'Déficit Estimado'}</span>
        </div>

        {/* KPI 4 */}
        <div className="glass-card rounded-[24px] p-6 border border-white/10 bg-surface/30 relative overflow-hidden flex flex-col justify-between min-h-[120px]">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-[#4ade80]"></div>
          <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider block">Crecimiento Acumulado</span>
          <span className="text-3xl font-display font-extrabold text-white mt-2">+{summaryMetrics.ingGrowthAccum.toFixed(1)}%</span>
          <span className="text-[10px] font-mono text-white/50 mt-1">Respecto al baseline (2026)</span>
        </div>
      </div>

      {/* IPC / ICES Edit Grid */}
      <div className="glass-card rounded-[32px] p-6 lg:p-8 border border-white/10 space-y-6 print:hidden">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Activity className="text-[#ffcc29]" size={20} />
            <div>
              <h3 className="text-lg font-display font-medium text-white">Indexadores Macroeconómicos</h3>
              <p className="text-xs text-white/50 mt-0.5 font-light">
                Los Recursos Nación se indexan automáticamente por el **MAX(IPC, ICES)**. Modifique los porcentajes para simular escenarios.
              </p>
            </div>
          </div>
          {activeScenario !== 'personalizado' && (
            <span className="text-[10px] font-mono bg-[#ffcc29]/10 px-3 py-1 rounded-full border border-[#ffcc29]/30 text-[#ffcc29] font-bold">
              Modo Solo Lectura ({activeScenario})
            </span>
          )}
        </div>

        {/* Scrollable grid to adjust IPC/ICES for each year */}
        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#0c0c0e] custom-scrollbar">
          <table className="w-full border-collapse text-xs font-mono text-left">
            <thead>
              <tr className="bg-white/5 text-[#ffcc29] border-b border-white/10 uppercase tracking-wider">
                <th className="p-4 font-bold">Vigencia</th>
                <th className="p-4 font-bold text-center">IPC Proyectado (%)</th>
                <th className="p-4 font-bold text-center">ICES Proyectado (%)</th>
                <th className="p-4 font-bold text-center">Tasa Aplicada (Nación)</th>
                <th className="p-4 font-bold text-center">Crecimiento Propios/Otros (%)</th>
                <th className="p-4 font-bold">Justificación / Cálculo de Indexación</th>
              </tr>
            </thead>
            <tbody>
              {activeProjectionData.map((yData, idx) => (
                <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="p-4 text-white font-bold">{yData.year}</td>
                  
                  {/* IPC Input */}
                  <td className="p-2 text-center">
                    <input 
                      type="number"
                      step={0.1}
                      min={0}
                      max={25}
                      value={yData.ipc}
                      onChange={(e) => handleIndexChange('ipc', idx, parseFloat(e.target.value) || 0)}
                      className="w-20 bg-white/5 border border-white/10 rounded-lg p-1.5 text-center text-white focus:outline-none focus:ring-1 focus:ring-[#ffcc29] font-mono text-xs focus:bg-[#09090b]"
                    />
                  </td>

                  {/* ICES Input */}
                  <td className="p-2 text-center">
                    <input 
                      type="number"
                      step={0.1}
                      min={0}
                      max={25}
                      value={yData.ices}
                      onChange={(e) => handleIndexChange('ices', idx, parseFloat(e.target.value) || 0)}
                      className="w-20 bg-white/5 border border-white/10 rounded-lg p-1.5 text-center text-white focus:outline-none focus:ring-1 focus:ring-[#ffcc29] font-mono text-xs focus:bg-[#09090b]"
                    />
                  </td>

                  {/* Nation growth indicator */}
                  <td className="p-4 text-center font-bold text-[#ffcc29]">
                    {yData.nationGrowth.toFixed(1)}%
                  </td>

                  {/* Other growth input */}
                  <td className="p-2 text-center">
                    <input 
                      type="number"
                      step={0.1}
                      min={0}
                      max={25}
                      value={yData.otherGrowth}
                      onChange={(e) => handleIndexChange('otherGrowth', idx, parseFloat(e.target.value) || 0)}
                      className="w-20 bg-white/5 border border-white/10 rounded-lg p-1.5 text-center text-white focus:outline-none focus:ring-1 focus:ring-[#ffcc29] font-mono text-xs focus:bg-[#09090b]"
                    />
                  </td>

                  {/* Nation growth calculation justification */}
                  <td className="p-4 text-white/70 italic text-[11px]">
                    {yData.justificationNation}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 print:grid-cols-1 print:gap-12">
        
        {/* Chart 1: Evolución Temporal */}
        <div className="glass-card rounded-[32px] p-6 lg:p-8 border border-white/10 flex flex-col justify-between glow-primary min-h-[400px]">
          <h3 className="text-xl font-display font-medium text-white mb-6">Evolución de Ingresos y Gastos Proyectados</h3>
          <div className="w-full h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={filteredDashboardData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="year" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)' }} />
                <Legend />
                <Bar dataKey="ingresos" name="Ingresos (M)" fill="#ffcc29" radius={[4, 4, 0, 0]} barSize={35} />
                <Line type="monotone" dataKey="gastos" name="Compromisos (M)" stroke="#f43f5e" strokeWidth={3} dot={{ r: 5 }} />
                <Line type="monotone" dataKey="gastosPago" name="Pagos Efectivos (M)" stroke="#4ade80" strokeWidth={2} strokeDasharray="5 5" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Flujo Proyectado */}
        <div className="glass-card rounded-[32px] p-6 lg:p-8 border border-white/10 flex flex-col justify-between glow-primary min-h-[400px]">
          <h3 className="text-xl font-display font-medium text-white mb-6">Flujo de Caja y Balance Proyectado Anual</h3>
          <div className="w-full h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={filteredDashboardData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="year" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)' }} />
                <Legend />
                <Area type="monotone" dataKey="balance" name="Balance Neto Comp. (M)" fill="rgba(74, 222, 128, 0.1)" stroke="#4ade80" strokeWidth={2} />
                <Area type="monotone" dataKey="balancePago" name="Balance Neto Pago (M)" fill="rgba(59, 130, 246, 0.1)" stroke="#3b82f6" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Nación vs IPC vs ICES */}
        <div className="glass-card rounded-[32px] p-6 lg:p-8 border border-white/10 flex flex-col justify-between glow-primary min-h-[400px]">
          <h3 className="text-xl font-display font-medium text-white mb-6">Indexadores de Recursos Nación: IPC vs ICES</h3>
          <div className="w-full h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={filteredDashboardData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="year" stroke="#94a3b8" />
                <YAxis unit="%" stroke="#94a3b8" />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)' }} />
                <Legend />
                <Bar dataKey="nationGrowth" name="Tasa Aplicada Max(IPC, ICES) (%)" fill="#ffcc29" radius={[4, 4, 0, 0]} opacity={0.85} barSize={25} />
                <Line type="monotone" dataKey="ipc" name="IPC (%)" stroke="#38bdf8" strokeWidth={2.5} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="ices" name="ICES (%)" stroke="#c084fc" strokeWidth={2.5} dot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Comparativo de Escenarios */}
        <div className="glass-card rounded-[32px] p-6 lg:p-8 border border-white/10 flex flex-col justify-between glow-primary min-h-[400px]">
          <h3 className="text-xl font-display font-medium text-white mb-6">Comparativa de Escenarios: Balance Neto (M)</h3>
          <div className="w-full h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={scenarioComparisonChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="year" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)' }} />
                <Legend />
                <Line type="monotone" dataKey="Base" stroke="#ffcc29" strokeWidth={2.5} />
                <Line type="monotone" dataKey="Conservador" stroke="#f43f5e" strokeWidth={2} strokeDasharray="4 4" />
                <Line type="monotone" dataKey="Optimista" stroke="#4ade80" strokeWidth={2} />
                <Line type="monotone" dataKey="Personalizado" stroke="#c084fc" strokeWidth={2.5} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Mid row: share distribution and AI Observations */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Pie share */}
        <div className="xl:col-span-5 glass-card rounded-[32px] p-6 lg:p-8 border border-white/10 flex flex-col justify-between min-h-[400px]">
          <h3 className="text-xl font-display font-medium text-white mb-4">Participación de Recursos (Año {startYear + numYears - 1})</h3>
          <div className="w-full h-64 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={resourceShareData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {resourceShareData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono mt-4">
            {resourceShareData.map((item, idx) => (
              <div key={idx} className="flex items-center gap-1.5 text-white/80">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                <span className="truncate" title={item.fullName}>{item.name}: ${item.value.toFixed(1)}M</span>
              </div>
            ))}
          </div>
        </div>

        {/* AI Observations Panel */}
        <div className="xl:col-span-7 glass-card rounded-[32px] p-6 lg:p-8 border border-white/10 flex flex-col justify-between min-h-[400px]">
          <div>
            <div className="flex items-center gap-2 pb-4 border-b border-white/5 mb-6">
              <FlameKindling className="text-[#ffcc29]" size={22} />
              <h3 className="text-xl font-display font-medium text-white">Análisis Financiero de Sostenibilidad</h3>
            </div>
            
            <div className="space-y-4">
              {automaticObservations.map((obs, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-white/5 border border-white/5 text-xs text-white/90 leading-relaxed">
                  <div className="flex items-start gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#ffcc29] shrink-0 mt-1"></div>
                    <p dangerouslySetInnerHTML={{ __html: obs.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}></p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 p-4 bg-[#ffcc29]/5 border border-[#ffcc29]/20 rounded-2xl flex items-start gap-3 text-xs text-[#ffcc29]/95 leading-relaxed">
            <CheckCircle className="shrink-0 mt-0.5" size={16} />
            <div>
              <span className="font-bold block">Recomendación Presupuestaria:</span>
              <span>
                Para compensar el efecto inflacionario acumulado, se sugerirá crear planes de ahorro institucional en recursos propios e indexar las matrículas de posgrado y convenios con una tasa de crecimiento de al menos el 4.5% anual.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Data Table */}
      <div className="glass-card rounded-[32px] p-6 lg:p-8 border border-white/10 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h3 className="text-xl font-display font-medium text-white">Matriz de Valores Proyectados</h3>
            <p className="text-xs text-white/50 mt-0.5">Valores proyectados año a año expresados en Millones de pesos COP.</p>
          </div>
          
          {/* Table Controls (Search and Filters) */}
          <div className="flex items-center gap-3 w-full md:w-auto shrink-0 print:hidden">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant w-4 h-4" />
              <input 
                type="text"
                placeholder="Buscar por recurso o año..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#0c0c0e] border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#ffcc29] text-on-surface"
              />
            </div>
          </div>
        </div>

        {/* Scrollable table grid */}
        <div className="overflow-x-auto rounded-[24px] border border-white/10 bg-white/5 custom-scrollbar">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="bg-white/10 text-[#ffcc29] uppercase tracking-wider border-b border-white/10 select-none">
                <th className="p-4 font-bold border-r border-white/5 cursor-pointer hover:bg-white/5" onClick={() => handleSort('year')}>
                  Vigencia {sortField === 'year' && (sortAsc ? '▲' : '▼')}
                </th>
                <th className="p-4 font-bold border-r border-white/5 cursor-pointer hover:bg-white/5" onClick={() => handleSort('resource')}>
                  Recurso {sortField === 'resource' && (sortAsc ? '▲' : '▼')}
                </th>
                <th className="p-4 font-bold border-r border-white/5 cursor-pointer hover:bg-white/5" onClick={() => handleSort('resourceName')}>
                  Nombre Fuente {sortField === 'resourceName' && (sortAsc ? '▲' : '▼')}
                </th>
                <th className="p-4 font-bold border-r border-white/5 text-right cursor-pointer hover:bg-white/5" onClick={() => handleSort('baseVal')}>
                  Valor Base (M) {sortField === 'baseVal' && (sortAsc ? '▲' : '▼')}
                </th>
                <th className="p-4 font-bold border-r border-white/5 text-center cursor-pointer hover:bg-white/5" onClick={() => handleSort('indexApplied')}>
                  Tasa Aplicada {sortField === 'indexApplied' && (sortAsc ? '▲' : '▼')}
                </th>
                <th className="p-4 font-bold border-r border-white/5 text-right cursor-pointer hover:bg-white/5" onClick={() => handleSort('projVal')}>
                  Ingreso Proyectado (M) {sortField === 'projVal' && (sortAsc ? '▲' : '▼')}
                </th>
                <th className="p-4 font-bold border-r border-white/5 text-right cursor-pointer hover:bg-white/5" onClick={() => handleSort('projGas')}>
                  Gasto Proyectado (M) {sortField === 'projGas' && (sortAsc ? '▲' : '▼')}
                </th>
                <th className="p-4 font-bold border-r border-white/5 text-right cursor-pointer hover:bg-white/5" onClick={() => handleSort('incAbs')}>
                  Incremento (M) {sortField === 'incAbs' && (sortAsc ? '▲' : '▼')}
                </th>
                <th className="p-4">Escenario</th>
              </tr>
            </thead>
            <tbody>
              {flatTableData.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-6 text-center text-white/40 italic">Ningún registro coincide con la búsqueda.</td>
                </tr>
              ) : (
                flatTableData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-white/5 border-b border-white/5 transition-colors">
                    <td className="p-4 border-r border-white/5 text-white font-bold">{row.year}</td>
                    <td className="p-4 border-r border-white/5 font-bold text-white/80">{row.resource}</td>
                    <td className="p-4 border-r border-white/5 text-white/60 truncate max-w-[200px]" title={row.resourceName}>{row.resourceName}</td>
                    <td className="p-4 border-r border-white/5 text-right font-bold text-white/70">${row.baseVal.toLocaleString('es-CO', {minimumFractionDigits: 2, maximumFractionDigits:2})}</td>
                    <td className="p-4 border-r border-white/5 text-center font-bold text-[#ffcc29]">{row.indexApplied.toFixed(2)}%</td>
                    <td className="p-4 border-r border-white/5 text-right font-bold text-[#4ade80]">${row.projVal.toLocaleString('es-CO', {minimumFractionDigits: 2, maximumFractionDigits:2})}</td>
                    <td className="p-4 border-r border-white/5 text-right font-bold text-[#f43f5e]">${row.projGas.toLocaleString('es-CO', {minimumFractionDigits: 2, maximumFractionDigits:2})}</td>
                    <td className={`p-4 border-r border-white/5 text-right font-bold ${row.incAbs >= 0 ? 'text-[#4ade80]' : 'text-red-400'}`}>
                      ${row.incAbs.toLocaleString('es-CO', {minimumFractionDigits: 2, maximumFractionDigits:2})}
                    </td>
                    <td className="p-4 text-[10px] font-bold uppercase tracking-wider text-white/45">{activeScenario}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
    </div>
  );
}
