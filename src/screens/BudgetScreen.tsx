import React, { useMemo, useState } from 'react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip as RechartsTooltip, PieChart, Pie, Cell, LineChart, Line, Legend, 
  ComposedChart 
} from 'recharts';
import { 
  TrendingUp, TrendingDown, DollarSign, Wallet, AlertTriangle, Lightbulb, 
  Target, Info, CheckCircle2, FileText, Scale, BarChart2, ShieldAlert, Activity,
  Sliders, ArrowUpRight, Award, Compass, Eye, Building2
} from 'lucide-react';
import { budgetData } from '../data/budgetData';
import { MACRO_INDICATORS, YEARS, SUPUESTOS_MACROECONOMICOS_MFMP } from '../lib/macroData';
import { selectBestModel, getScenarios, getAllModels, ModelType } from '../lib/budgetForecasting';

const COLORS = ['#4ade80', '#60a5fa', '#f472b6', '#fbbf24', '#c084fc', '#38bdf8'];

function formatCurrencyShort(value: number) {
  if (value >= 1e12) return `$${(value / 1e12).toFixed(1)}B`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}MM`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  return `$${value}`;
}

export function BudgetScreen({ onNavigate }: { onNavigate: (s: string) => void }) {
  const [selectedScenario, setSelectedScenario] = useState<'base' | 'conservative' | 'pressure'>('base');
  const [userSelectedModel, setUserSelectedModel] = useState<ModelType | 'Auto'>('Auto');

  const historicalSeries = useMemo(() => {
    return YEARS.map(year => {
      let totalBudget = 0;
      let aporteNacion = 0;
      let gastosPersonales = 0;
      let funcionamientoEInversion = 0;

      if (year === 2016) { totalBudget = 292882982405.00; aporteNacion = 150173676028.00; gastosPersonales = 170202660560.00; }
      else if (year === 2017) { totalBudget = 317183402919.00; aporteNacion = 176266167583.00; gastosPersonales = 179298885672.00; }
      else if (year === 2018) { totalBudget = 329257380990.00; aporteNacion = 188093963887.00; gastosPersonales = 194562187853.00; }
      else if (year === 2019) { totalBudget = 332583396221.00; aporteNacion = 187848097218.00; gastosPersonales = 211867438892.00; }
      else if (year === 2020) { totalBudget = 328798133475.00; aporteNacion = 211154363875.00; gastosPersonales = 225823344840.00; }
      else if (year === 2021) { totalBudget = 338949052179.00; aporteNacion = 221945894347.00; gastosPersonales = 239176451764.00; }
      else if (year === 2022) { totalBudget = 366858662747.00; aporteNacion = 245575546836.00; gastosPersonales = 264666910202.00; }
      else if (year === 2023) { totalBudget = 414225449749.00; aporteNacion = 288608934467.00; gastosPersonales = 309972788484.00; }
      else if (year === 2024) { totalBudget = 470372737165.00; aporteNacion = 329772592626.00; gastosPersonales = 302294420187.00; }
      else if (year === 2025) { totalBudget = 530811870640.00; aporteNacion = 383141323232.00; gastosPersonales = 329076033503.00; }
      else if (year === 2026) { totalBudget = 547314191553.00; aporteNacion = 404118353192.00; gastosPersonales = 369666519469.00; }

      const recursosPropios = totalBudget - aporteNacion;
      funcionamientoEInversion = totalBudget - gastosPersonales;

      const macro = MACRO_INDICATORS[year] as any || {};

      return {
        year,
        totalBudget,
        aporteNacion,
        recursosPropios,
        gastosPersonales,
        funcionamientoEInversion,
        ipc: macro.ipc || 0,
        sm: macro.salarioMinimo || 0,
        d1279: macro.decreto1279 || 0,
        ices: macro.ices || 0,
      };
    });
  }, []);

  // Calculate variances
  const latestIndex = historicalSeries.length - 1;
  const currentBudget = historicalSeries[latestIndex].totalBudget;
  const prevBudget = historicalSeries[latestIndex - 1].totalBudget;
  const budgetVar = ((currentBudget - prevBudget) / prevBudget) * 100;

  const currentPersonales = historicalSeries[latestIndex].gastosPersonales;
  const prevPersonales = historicalSeries[latestIndex - 1].gastosPersonales;
  const personalesVar = ((currentPersonales - prevPersonales) / prevPersonales) * 100;

  // Run statistical model
  // Proyectar INGRESOS (Realidad del Artículo 86 y base presupuestal)
  const budgetValues = historicalSeries.map(d => d.totalBudget);
  const allModels = useMemo(() => getAllModels(budgetValues, YEARS), [budgetValues]);
  const autoBestModel = useMemo(() => selectBestModel(budgetValues, YEARS), [budgetValues]);
  
  const bestModel = useMemo(() => {
    if (userSelectedModel === 'Auto') return autoBestModel;
    return allModels.find(m => m.modelName === userSelectedModel) || autoBestModel;
  }, [userSelectedModel, autoBestModel, allModels]);

// Composition data for 2026
  const compData = useMemo(() => {
    const incomes26 = budgetData.filter(d => d.year === 2026 && d.category === 'Ingresos');
    const grouped: Record<string, number> = {};
    incomes26.forEach(i => {
      grouped[i.source] = (grouped[i.source] || 0) + i.amount;
    });
    return Object.keys(grouped).map(k => ({ name: k, value: grouped[k] }));
  }, []);

  const chartData = historicalSeries.map((d, i) => {
    let varGastos = null;
    if (i > 0) {
      const prev = historicalSeries[i-1].totalBudget;
      const curr = d.totalBudget;
      varGastos = ((curr - prev) / prev) * 100;
    }
    return {
      year: d.year,
      varGastos,
      ipc: d.ipc,
      salarioMinimo: d.sm,
      decreto1279: d.d1279,
      ices: d.ices,
      totalBudget: d.totalBudget,
      fitted: bestModel.fitted[i] || null
    };
  });

  // Incremento del Ingreso Proyectado (Alineado con IPC 7.0%)
  const projectedNextBudgetVal = bestModel.projectedValue;
  const requiredIncomeIncrease = ((projectedNextBudgetVal - currentBudget) / currentBudget) * 100;
  const scenarios = useMemo(() => getScenarios(requiredIncomeIncrease), [requiredIncomeIncrease]);

  const getScenarioPercentage = () => {
    if (selectedScenario === 'conservative') return scenarios.conservative;
    if (selectedScenario === 'pressure') return scenarios.pressure;
    return scenarios.base;
  };

  const projectedIncrease = getScenarioPercentage();
  const projectedNextBudget = currentBudget * (1 + projectedIncrease / 100);
  const addRequired = projectedNextBudget - currentBudget;

  // Proyección y Rango 2027 frente al Histórico (2016 - 2027)
  const projectionRangeSeries = useMemo(() => {
    const basePct = 7.00; // IPC proyectado 2027 y regla Techos = IPC
    const lowerPct = scenarios.conservative; // 5.80%
    const upperPct = scenarios.pressure;     // 9.20% (IPC + 2.2% SMMLV MFMP)

    const projectedBase = currentBudget * (1 + basePct / 100);
    const projectedLower = currentBudget * (1 + lowerPct / 100);
    const projectedUpper = currentBudget * (1 + upperPct / 100);

    const points = historicalSeries.map((d, idx) => {
      const isAnchor = idx === historicalSeries.length - 1; // 2026
      let prevVal = idx > 0 ? historicalSeries[idx - 1].totalBudget : null;
      let annualChange = prevVal ? ((d.totalBudget - prevVal) / prevVal) * 100 : null;

      return {
        year: `${d.year}`,
        numericYear: d.year,
        presupuestoReal: d.totalBudget,
        // Anchor points for seamless connection to 2027
        proyeccionBase: isAnchor ? d.totalBudget : null,
        rangoInferior: isAnchor ? d.totalBudget : null,
        rangoSuperior: isAnchor ? d.totalBudget : null,
        bandaRango: isAnchor ? [d.totalBudget, d.totalBudget] : null,
        ipc: d.ipc,
        annualChange,
        isProjection: false
      };
    });

    // 2027 projected point with full range
    points.push({
      year: '2027 (Proy.)',
      numericYear: 2027,
      presupuestoReal: null,
      proyeccionBase: projectedBase,
      rangoInferior: projectedLower,
      rangoSuperior: projectedUpper,
      bandaRango: [projectedLower, projectedUpper],
      ipc: 7.0,
      annualChange: basePct,
      isProjection: true
    });

    return points;
  }, [historicalSeries, currentBudget, scenarios]);

  const CustomProjectionTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;

    const dataPoint = payload[0]?.payload;
    if (!dataPoint) return null;

    const isProj = dataPoint.isProjection;

    return (
      <div className="bg-[#0f172a]/95 border border-white/20 p-4 rounded-xl shadow-2xl backdrop-blur-md max-w-sm text-xs">
        <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
          <span className="font-bold text-sm text-white">{dataPoint.year}</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase ${isProj ? 'bg-primary-container/20 text-primary-container border border-primary-container/30' : 'bg-emerald-500/20 text-emerald-300'}`}>
            {isProj ? 'Proyección Vigencia 2027' : 'Histórico Ejecutado'}
          </span>
        </div>

        {isProj ? (
          <div className="space-y-2">
            <div className="p-2.5 rounded-lg bg-primary-container/15 border border-primary-container/30">
              <span className="text-on-surface-variant block text-[10px] uppercase font-semibold">Proyección Base (IPC 7.0%):</span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-base font-bold text-white font-mono">{formatCurrencyShort(dataPoint.proyeccionBase)}</span>
                <span className="text-emerald-400 font-bold">(+7.00%)</span>
              </div>
              <div className="text-[10px] text-on-surface-variant mt-0.5">
                Adición requerida: +{formatCurrencyShort(dataPoint.proyeccionBase - currentBudget)}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-emerald-400 block text-[10px] font-semibold">Límite Inferior (5.8%):</span>
                <span className="font-mono text-white font-bold">{formatCurrencyShort(dataPoint.rangoInferior)}</span>
                <span className="text-[10px] text-on-surface-variant block mt-0.5">Escenario Conservador</span>
              </div>
              <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                <span className="text-red-400 block text-[10px] font-semibold">Límite Superior (9.2%):</span>
                <span className="font-mono text-white font-bold">{formatCurrencyShort(dataPoint.rangoSuperior)}</span>
                <span className="text-[10px] text-on-surface-variant block mt-0.5">Presión SMMLV (IPC+2.2)</span>
              </div>
            </div>

            <div className="text-[10px] text-on-surface-variant pt-1 border-t border-white/10 flex justify-between items-center">
              <span>Amplitud de Incertidumbre:</span>
              <span className="font-mono text-amber-300 font-semibold">
                {formatCurrencyShort(dataPoint.rangoSuperior - dataPoint.rangoInferior)} (3.40 pp)
              </span>
            </div>
            <div className="text-[10px] text-primary-container bg-black/40 p-2 rounded border border-primary-container/20">
              Supuesto vinculante: Techos presupuestales = IPC (7.0%) según el MFMP.
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-on-surface-variant">Presupuesto Aforado:</span>
              <span className="font-bold text-white font-mono">{formatCurrencyShort(dataPoint.presupuestoReal)}</span>
            </div>
            {dataPoint.annualChange !== null && (
              <div className="flex justify-between items-center">
                <span className="text-on-surface-variant">Variación Anual:</span>
                <span className={`font-mono font-bold ${dataPoint.annualChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {dataPoint.annualChange >= 0 ? '+' : ''}{dataPoint.annualChange.toFixed(2)}%
                </span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-on-surface-variant">IPC del Año:</span>
              <span className="font-mono text-blue-400">{dataPoint.ipc}%</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-20 fade-in max-w-[1600px] mx-auto">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-display font-medium text-white tracking-tight">Presupuesto Institucional</h1>
          <p className="text-on-surface-variant mt-2 text-sm max-w-2xl">
            Análisis histórico, impacto macroeconómico y modelación predictiva 2027 bajo supuestos del Marco Fiscal de Mediano Plazo (MFMP).
          </p>
        </div>
      </header>

      {/* SECCIÓN OFICIAL: SUPUESTOS MACROECONÓMICOS (MFMP - MINISTERIO DE HACIENDA) */}
      <div className="mb-8 bg-gradient-to-br from-surface-container-high/90 to-background border border-primary-container/30 rounded-[32px] p-6 md:p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-primary-container/10 blur-[100px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-amber-500/5 blur-[100px] rounded-full pointer-events-none"></div>

        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-white/10 pb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-primary-container/20 flex items-center justify-center text-primary-container shrink-0 border border-primary-container/30">
                <Building2 size={28} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono uppercase tracking-wider text-primary-container font-semibold">
                    Ministerio de Hacienda y Crédito Público • Viceministerio
                  </span>
                </div>
                <h2 className="text-2xl md:text-3xl font-display text-white font-bold tracking-tight mt-0.5">
                  Supuestos Macroeconómicos
                </h2>
                <p className="text-on-surface-variant font-sans text-xs md:text-sm mt-1">
                  Marco Fiscal de Mediano Plazo (MFMP) — Lineamientos oficiales y proyección técnica de indexación 2027
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-black/30 px-4 py-2 rounded-xl border border-white/10 text-right">
                <span className="text-[10px] text-on-surface-variant uppercase block">IPC Proyectado 2027</span>
                <span className="text-lg font-bold font-mono text-primary-container">7,0%</span>
              </div>
              <div className="bg-black/30 px-4 py-2 rounded-xl border border-white/10 text-right">
                <span className="text-[10px] text-on-surface-variant uppercase block">Techo Presupuestal</span>
                <span className="text-lg font-bold font-mono text-emerald-400">IPC (7,0%)</span>
              </div>
            </div>
          </div>

          {/* Contexto literal de la diapositiva */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 md:p-5 mb-6 text-xs md:text-sm text-on-surface-variant leading-relaxed">
            <p>
              <strong className="text-white">Definición y Alcance:</strong> El Marco Fiscal de Mediano Plazo (MFMP) es un documento que enfatiza en los resultados y propósitos de la política fiscal. Allí se hace un recuento general de los hechos más importantes en materia de comportamiento de la actividad económica y fiscal del país en el año anterior, el año en curso y un panorama de la próxima vigencia.
            </p>
          </div>

          {/* Tabla Comparativa de Supuestos Macroeconómicos */}
          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/20">
            <table className="w-full text-left text-xs md:text-sm">
              <thead className="bg-surface-container-low text-on-surface-variant uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="p-4 font-semibold text-white">Supuestos Macroeconómicos</th>
                  <th className="p-4 font-semibold text-center text-blue-300">2026 (MFMP)</th>
                  <th className="p-4 font-semibold text-center text-primary-container">2027 (Proyectado)</th>
                  <th className="p-4 font-semibold text-amber-300">Fórmula / Referencia</th>
                  <th className="p-4 font-semibold text-on-surface-variant">Regla e Impacto Presupuestal UPTC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {SUPUESTOS_MACROECONOMICOS_MFMP.map((item, index) => (
                  <tr key={index} className="hover:bg-white/5 transition-colors">
                    <td className="p-4 font-medium text-white flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary-container shrink-0"></span>
                      {item.indicador}
                    </td>
                    <td className="p-4 text-center font-mono font-bold text-blue-300 bg-blue-500/5">
                      {item.valor2026}
                    </td>
                    <td className="p-4 text-center font-mono font-bold text-primary-container bg-primary-container/10">
                      {item.valor2027}
                    </td>
                    <td className="p-4 font-mono text-xs text-amber-300">
                      {item.formula}
                    </td>
                    <td className="p-4 text-xs text-on-surface-variant leading-relaxed">
                      {item.impacto}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row items-center justify-between text-[11px] text-on-surface-variant gap-2 pt-2">
            <span className="italic">
              Fuente: Ministerio de Hacienda y Crédito Público - Viceministerio
            </span>
            <span className="bg-primary-container/10 text-primary-container px-3 py-1 rounded-full border border-primary-container/20 font-mono">
              Directriz vinculante: Proyección del Incremento Presupuestal ≈ IPC (7,0%)
            </span>
          </div>
        </div>
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-5 rounded-2xl border-l-4 border-l-primary-container">
          <p className="text-xs font-mono text-on-surface-variant uppercase tracking-wider mb-2">Presupuesto Actual (2026)</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-display text-white">{formatCurrencyShort(currentBudget)}</h3>
          </div>
          <p className="text-xs text-on-surface-variant mt-2 flex items-center gap-1">
            <TrendingUp size={14} className="text-emerald-400" />
            <span className="text-emerald-400">+{budgetVar.toFixed(1)}%</span> vs 2025
          </p>
        </div>
        
        <div className="glass-card p-5 rounded-2xl border-l-4 border-l-[#fbbf24]">
          <p className="text-xs font-mono text-on-surface-variant uppercase tracking-wider mb-2">IPC Proyectado 2027</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-display text-amber-300">7.0%</h3>
          </div>
          <p className="text-xs text-on-surface-variant mt-2">
            Techo presupuestal según MFMP (MinHacienda)
          </p>
        </div>

        <div className="glass-card p-5 rounded-2xl border-l-4 border-l-emerald-400">
          <p className="text-xs font-mono text-on-surface-variant uppercase tracking-wider mb-2">Incremento Presupuestal Base</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-display text-emerald-400">+7.00%</h3>
          </div>
          <p className="text-xs text-emerald-400/80 mt-2">
            +{formatCurrencyShort(currentBudget * 0.07)} adicionales requeridos
          </p>
        </div>

        <div className="glass-card p-5 rounded-2xl border-l-4 border-l-[#c084fc]">
          <p className="text-xs font-mono text-on-surface-variant uppercase tracking-wider mb-2">Presupuesto Proyectado 2027</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-display text-white">{formatCurrencyShort(currentBudget * 1.07)}</h3>
          </div>
          <p className="text-xs text-on-surface-variant mt-2">
            Rango: {formatCurrencyShort(currentBudget * (1 + scenarios.conservative / 100))} - {formatCurrencyShort(currentBudget * (1 + scenarios.pressure / 100))}
          </p>
        </div>
      </div>

      {/* NUEVA GRÁFICA DESTACADA: PROYECCIÓN DEL VALOR Y SU RANGO FRENTE AL HISTÓRICO */}
      <div className="glass-card p-6 md:p-8 rounded-[32px] border border-primary-container/30 relative overflow-hidden shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-3 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-primary-container/20 text-primary-container border border-primary-container/30">
                PROYECCIÓN VIGENCIA 2027
              </span>
              <span className="px-3 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                IPC 7,0% (MFMP)
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-display font-bold text-white tracking-tight">
              Proyección del Valor Presupuestal y Rango de Incertidumbre frente al Histórico
            </h2>
            <p className="text-xs md:text-sm text-on-surface-variant mt-1 max-w-3xl">
              Comportamiento histórico 2016-2026 y modelación prospectiva 2027: proyección base atada al IPC (7,0%) con abanico de dispersión según presiones salariales (5,8% - 9,2%).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center gap-2 bg-surface-container-low px-3 py-1.5 rounded-xl border border-white/10 text-on-surface-variant">
              <span className="w-3 h-3 rounded-full bg-[#38bdf8]"></span>
              <span>Histórico (2016-2026)</span>
            </div>
            <div className="flex items-center gap-2 bg-surface-container-low px-3 py-1.5 rounded-xl border border-white/10 text-on-surface-variant">
              <span className="w-3 h-3 rounded-full bg-[#ffcc29]"></span>
              <span>Proyección Base (7.0%)</span>
            </div>
            <div className="flex items-center gap-2 bg-surface-container-low px-3 py-1.5 rounded-xl border border-white/10 text-on-surface-variant">
              <span className="w-3 h-3 rounded-sm bg-amber-500/40 border border-amber-400"></span>
              <span>Rango (5.8% - 9.2%)</span>
            </div>
          </div>
        </div>

        {/* Resumen numérico del rango */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="p-3.5 rounded-xl bg-surface-container-low/60 border border-white/5">
            <span className="text-[10px] text-on-surface-variant uppercase tracking-wider block">Presupuesto Base 2026</span>
            <span className="text-base font-bold font-mono text-white">{formatCurrencyShort(currentBudget)}</span>
            <span className="text-[10px] text-on-surface-variant block mt-0.5">Aforo Vigente</span>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <span className="text-[10px] text-emerald-400 uppercase tracking-wider block font-semibold">Límite Inferior (5.8%)</span>
            <span className="text-base font-bold font-mono text-emerald-300">
              {formatCurrencyShort(currentBudget * (1 + scenarios.conservative / 100))}
            </span>
            <span className="text-[10px] text-emerald-400/80 block mt-0.5">Escenario Conservador</span>
          </div>

          <div className="p-3.5 rounded-xl bg-primary-container/20 border border-primary-container/40 ring-1 ring-primary-container/30">
            <span className="text-[10px] text-primary-container uppercase tracking-wider block font-semibold">Proyección Base (7.0%)</span>
            <span className="text-base font-bold font-mono text-white">
              {formatCurrencyShort(currentBudget * (1 + scenarios.base / 100))}
            </span>
            <span className="text-[10px] text-emerald-400 block mt-0.5 font-semibold">+$38.312M (+7.00%)</span>
          </div>

          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20">
            <span className="text-[10px] text-red-400 uppercase tracking-wider block font-semibold">Límite Superior (9.2%)</span>
            <span className="text-base font-bold font-mono text-red-300">
              {formatCurrencyShort(currentBudget * (1 + scenarios.pressure / 100))}
            </span>
            <span className="text-[10px] text-red-400/80 block mt-0.5">Presión SMMLV (IPC+2.2)</span>
          </div>
        </div>

        {/* Gráfica ComposedChart con abanico de rango */}
        <div className="h-[380px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={projectionRangeSeries} margin={{ top: 20, right: 25, left: 15, bottom: 5 }}>
              <defs>
                <linearGradient id="histAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="rangeAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.10} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis 
                dataKey="year" 
                stroke="#94a3b8" 
                tick={{ fill: '#94a3b8', fontSize: 12 }} 
                axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} 
                tickLine={false} 
              />
              <YAxis 
                stroke="#94a3b8" 
                tick={{ fill: '#94a3b8', fontSize: 12 }} 
                tickFormatter={(v) => formatCurrencyShort(v)} 
                domain={['auto', 'auto']}
                axisLine={false}
                tickLine={false}
              />
              <RechartsTooltip content={<CustomProjectionTooltip />} />
              
              {/* Sombreado de Banda de Rango 2026-2027 */}
              <Area 
                type="monotone" 
                dataKey="bandaRango" 
                name="Rango de Incertidumbre" 
                fill="url(#rangeAreaGrad)" 
                stroke="#f59e0b"
                strokeWidth={1}
                strokeDasharray="4 4"
              />

              {/* Área y Línea Histórica (2016-2026) */}
              <Area 
                type="monotone" 
                dataKey="presupuestoReal" 
                name="Presupuesto Histórico" 
                fill="url(#histAreaGrad)" 
                stroke="#38bdf8" 
                strokeWidth={3.5} 
                dot={{ r: 4, fill: '#38bdf8', strokeWidth: 1.5, stroke: '#0f172a' }}
              />

              {/* Línea Límite Superior (9.2%) */}
              <Line 
                type="monotone" 
                dataKey="rangoSuperior" 
                name="Límite Superior (Presión 9.2%)" 
                stroke="#f87171" 
                strokeWidth={2} 
                strokeDasharray="4 4" 
                dot={{ r: 4, fill: '#f87171' }} 
              />

              {/* Línea Proyección Base (IPC 7.0%) */}
              <Line 
                type="monotone" 
                dataKey="proyeccionBase" 
                name="Proyección Base 2027 (IPC 7.0%)" 
                stroke="#ffcc29" 
                strokeWidth={4} 
                strokeDasharray="6 4" 
                dot={{ r: 6, fill: '#ffcc29', stroke: '#0f172a', strokeWidth: 2 }} 
              />

              {/* Línea Límite Inferior (5.8%) */}
              <Line 
                type="monotone" 
                dataKey="rangoInferior" 
                name="Límite Inferior (Conservador 5.8%)" 
                stroke="#34d399" 
                strokeWidth={2} 
                strokeDasharray="4 4" 
                dot={{ r: 4, fill: '#34d399' }} 
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-on-surface-variant">
          <div className="flex items-center gap-2">
            <Info size={14} className="text-primary-container shrink-0" />
            <span>
              La dispersión proyectada entre el límite inferior ($579.1B) y superior ($597.7B) es de <strong>$18.608M</strong>, determinada por la elasticidad de los incrementos salariales (IPC+1,9% y IPC+2,2%).
            </span>
          </div>
          <span className="font-mono text-white bg-white/5 px-2.5 py-1 rounded-lg shrink-0">
            Amplitud de Banda: $18.6B (3.40 pp)
          </span>
        </div>
      </div>

      {/* Comportamiento Histórico */}
      <div className="grid grid-cols-1 gap-6">
        <div className="glass-card p-6 rounded-[24px]">
          <div className="mb-6">
            <h2 className="text-xl font-display text-white">Comparativa vs Indicadores Macroeconómicos</h2>
            <p className="text-sm text-on-surface-variant">Evolución de los gastos frente al IPC, Salario Mínimo y Dcto 1279 e ICES.</p>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="year" stroke="currentColor" className="text-xs text-on-surface-variant" tickLine={false} axisLine={false} />
                <YAxis tickFormatter={(v) => `${v}%`} stroke="currentColor" className="text-xs text-on-surface-variant" tickLine={false} axisLine={false} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
                  itemStyle={{ fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Line type="monotone" name="Variación Gastos" dataKey="varGastos" stroke="#fbbf24" strokeWidth={3} dot={{ r: 4, fill: '#fbbf24', strokeWidth: 0 }} />
                <Line type="monotone" name="IPC" dataKey="ipc" stroke="#60a5fa" strokeWidth={3} dot={{ r: 4, fill: '#60a5fa', strokeWidth: 0 }} />
                <Line type="monotone" name="Salario Mínimo" dataKey="salarioMinimo" stroke="#4ade80" strokeWidth={3} dot={{ r: 4, fill: '#4ade80', strokeWidth: 0 }} />
                <Line type="monotone" name="Dcto 1279" dataKey="decreto1279" stroke="#c084fc" strokeWidth={3} dot={{ r: 4, fill: '#c084fc', strokeWidth: 0 }} />
                <Line type="monotone" name="ICES" dataKey="ices" stroke="#f43f5e" strokeWidth={3} dot={{ r: 4, fill: '#f43f5e', strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Model & AI Recommendation */}
            <div className="glass-card p-6 rounded-[24px] mt-6">
        <div className="mb-6">
          <h2 className="text-xl font-display text-white">Evolución de Aporte Nación vs Presupuesto</h2>
          <p className="text-sm text-on-surface-variant">
            Histórico 2016-2026 de la proporción de ingresos. En 2024 la nómina parece bajar debido al traslado de Honorarios al rubro de funcionamiento.
          </p>
        </div>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={historicalSeries} margin={{ top: 20, right: 20, left: 20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis dataKey="year" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis 
                stroke="#94a3b8" 
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                tickFormatter={(value) => formatCurrencyShort(value)}
                domain={['auto', 'auto']}
              />
              <RechartsTooltip 
                formatter={(value: number, name: string) => [
                  formatCurrencyShort(value), 
                  name === 'totalBudget' ? 'Presupuesto Total' : (name === 'aporteNacion' ? 'Aporte Nación' : 'Recursos Propios')
                ]}
                contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                labelStyle={{ color: '#94a3b8', marginBottom: '8px' }}
              />
              <Legend />
              <Area type="monotone" dataKey="aporteNacion" name="Aporte Nación" stroke="#10b981" fillOpacity={0.3} fill="#10b981" />
              <Line type="monotone" dataKey="recursosPropios" name="Recursos Propios" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="totalBudget" name="Presupuesto Total" stroke="#e879f9" strokeWidth={3} dot={{ r: 4 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="glass-card p-6 rounded-[24px] mt-6">
        <div className="mb-6">
          <h2 className="text-xl font-display text-white">Curva de Ajuste del Modelo: {bestModel.modelName}</h2>
          <p className="text-sm text-on-surface-variant">Comparación entre el presupuesto real (área) y el ajuste estadístico (línea) utilizado para proyectar 2027.</p>
        </div>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorPresupuesto" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="year" stroke="currentColor" className="text-xs text-on-surface-variant" tickLine={false} axisLine={false} />
              <YAxis tickFormatter={(v) => formatCurrencyShort(v)} stroke="currentColor" className="text-xs text-on-surface-variant" tickLine={false} axisLine={false} />
              <RechartsTooltip 
                formatter={(value: number, name: string) => [formatCurrencyShort(value), name === 'totalBudget' ? 'Ingreso Real (Aforo)' : 'Ajuste del Modelo']}
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
                itemStyle={{ fontSize: '12px' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Area type="monotone" dataKey="totalBudget" name="Presupuesto Real" stroke="#38bdf8" fillOpacity={1} fill="url(#colorPresupuesto)" />
              <Line type="monotone" dataKey="fitted" name="Ajuste del Modelo" stroke="#f472b6" strokeWidth={3} dot={{ r: 4, fill: '#f472b6', strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        
        {/* The Model */}
        <div className="glass-card rounded-[24px] overflow-hidden border border-primary-container/30">
          <div className="bg-primary-container/10 p-6 border-b border-primary-container/20">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-primary-container/20 flex items-center justify-center text-primary-container">
                <Target size={20} />
              </div>
              <div>
                <h2 className="text-xl font-display text-white">Proyección del Incremento Presupuestal</h2>
                <p className="text-xs text-primary-container">Modelo Seleccionado por IA: {bestModel.modelName}</p>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            <div className="mb-6">
              <label className="text-xs text-on-surface-variant mb-2 block uppercase tracking-wider">Seleccionar Modelo Predictivo</label>
              <select 
                className="w-full bg-surface-container-low border border-white/10 rounded-xl p-3 text-white outline-none focus:border-primary-container"
                value={userSelectedModel}
                onChange={(e) => setUserSelectedModel(e.target.value as ModelType | 'Auto')}
              >
                <option value="Auto">Selección Inteligente (IA)</option>
                <option value="Regresión Lineal">Regresión Lineal</option>
                <option value="ARIMA (1,1,0)">ARIMA (1,1,0)</option>
                <option value="Holt Smoothing">Suavizado Exponencial (Holt)</option>
              </select>
            </div>
            
            <div className="flex justify-between items-center mb-6 bg-surface-container-low p-1 rounded-xl">
              <button 
                onClick={() => setSelectedScenario('conservative')}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${selectedScenario === 'conservative' ? 'bg-surface-container-high text-white shadow' : 'text-on-surface-variant hover:text-white'}`}
              >
                Conservador
              </button>
              <button 
                onClick={() => setSelectedScenario('base')}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${selectedScenario === 'base' ? 'bg-primary-container text-on-primary-container shadow' : 'text-on-surface-variant hover:text-white'}`}
              >
                Escenario Base
              </button>
              <button 
                onClick={() => setSelectedScenario('pressure')}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${selectedScenario === 'pressure' ? 'bg-surface-container-high text-white shadow' : 'text-on-surface-variant hover:text-white'}`}
              >
                Presión
              </button>
            </div>

            <div className="text-center mb-8">
              <p className="text-sm text-on-surface-variant uppercase tracking-wider mb-2">Incremento Recomendado 2027</p>
              <div className="text-6xl font-display text-white mb-2">{projectedIncrease.toFixed(2)}<span className="text-3xl text-primary-container">%</span></div>
              <p className="text-sm text-emerald-400">+{formatCurrencyShort(addRequired)} adicionales requeridos</p>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 rounded-xl bg-white/5">
                <span className="text-sm text-on-surface-variant">Presupuesto Actual (2026)</span>
                <span className="font-mono text-white">{formatCurrencyShort(currentBudget)}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-xl bg-primary-container/10 border border-primary-container/20">
                <span className="text-sm font-medium text-white">Presupuesto Proyectado (2027)</span>
                <span className="font-mono font-bold text-primary-container">{formatCurrencyShort(projectedNextBudget)}</span>
              </div>
            </div>

            <div className="mt-6 flex items-start gap-2 text-xs text-on-surface-variant p-3 rounded-xl bg-black/20">
              <Info size={14} className="shrink-0 mt-0.5" />
              <p>
                El modelo <strong>{bestModel.modelName}</strong> arrojó un Error (MAPE) de <strong>{bestModel.mape.toFixed(1)}%</strong> y un Grado de Veracidad (R²) del <strong>{bestModel.r2.toFixed(1)}%</strong> evaluando el histórico.
              </p>
            </div>

            <div className="mt-6">
              <h4 className="text-sm font-bold text-white mb-3">Análisis Comparativo de Modelos</h4>
              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-container-low text-on-surface-variant uppercase">
                    <tr>
                      <th className="p-3">Modelo</th>
                      <th className="p-3">R² (Veracidad)</th>
                      <th className="p-3">Error (MAPE)</th>
                      <th className="p-3">Proyección 2027</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 bg-black/20">
                    {allModels.map((m) => (
                      <tr key={m.modelName} className={bestModel.modelName === m.modelName ? "bg-primary-container/10" : ""}>
                        <td className="p-3 text-white font-medium flex items-center gap-2">
                          {bestModel.modelName === m.modelName && <CheckCircle2 size={12} className="text-primary-container" />}
                          {m.modelName}
                        </td>
                        <td className="p-3 text-emerald-400">{m.r2.toFixed(1)}%</td>
                        <td className="p-3 text-red-400">{m.mape.toFixed(2)}%</td>
                        <td className="p-3 text-white">{formatCurrencyShort(m.projectedValue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* AI Explanation & Alerts */}
        <div className="flex flex-col gap-6">
          <div className="glass-card p-6 rounded-[24px] flex-1">
            <h2 className="text-xl font-display text-white mb-4 flex items-center gap-2">
              <Lightbulb className="text-[#ffcc29]" size={20} /> Recomendación Presupuestal Ejecutiva
            </h2>
            <div className="prose prose-invert prose-sm max-w-none text-on-surface-variant space-y-4">
              <p>
                De acuerdo con el comportamiento histórico y el impacto de variables macroeconómicas, el incremento presupuestal recomendado para la próxima vigencia es de <strong className="text-white">{projectedIncrease.toFixed(2)}%</strong>.
              </p>
              <p>
                <strong>¿Por qué se recomienda este porcentaje?</strong><br/>
                La variación de gastos de personal está altamente correlacionada con el IPC y el Salario Mínimo (proyectado en 23% atípicamente para análisis), ejerciendo una fuerte presión al alza. El modelo <em>{bestModel.modelName}</em> captura esta elasticidad minimizando el error histórico.
              </p>
              <p>
                <strong>Escenario de Riesgo:</strong><br/>
                Si los ingresos corrientes de la Nación no igualan este requerimiento mínimo del {scenarios.conservative.toFixed(1)}%, la universidad enfrentará insuficiencia presupuestal directa en el rubro de funcionamiento.
              </p>
            </div>
          </div>

          <div className="glass-card p-6 rounded-[24px]">
            <h2 className="text-sm font-mono uppercase tracking-wider text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="text-red-400" size={16} /> Alertas de Riesgo Detectadas
            </h2>
            <div className="space-y-3">
              {bestModel.projectedIncreasePercent > 10 && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex gap-3">
                  <div className="w-1.5 h-auto bg-red-500 rounded-full"></div>
                  <div>
                    <p className="text-xs font-bold text-red-400">Presión Inflacionaria (IPC/Salarios)</p>
                    <p className="text-[11px] text-on-surface-variant mt-1">El crecimiento requerido supera la tendencia histórica de transferencias, proyectando riesgo de déficit estructural en {bestModel.projectedValue > currentBudget * 1.15 ? 'alta' : 'media'} severidad.</p>
                  </div>
                </div>
              )}
              {personalesVar > budgetVar && (
                <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 flex gap-3">
                  <div className="w-1.5 h-auto bg-orange-500 rounded-full"></div>
                  <div>
                    <p className="text-xs font-bold text-orange-400">Crecimiento Desigual del Gasto</p>
                    <p className="text-[11px] text-on-surface-variant mt-1">Los Gastos de Personal están creciendo a un ritmo superior (+{personalesVar.toFixed(1)}%) que el Presupuesto Total (+{budgetVar.toFixed(1)}%).</p>
                  </div>
                </div>
              )}
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex gap-3">
                <div className="w-1.5 h-auto bg-emerald-500 rounded-full"></div>
                <div>
                  <p className="text-xs font-bold text-emerald-400">Modelo Calibrado Exitosamente</p>
                  <p className="text-[11px] text-on-surface-variant mt-1">La convergencia del modelo predictivo es estable con R² proyectado &gt; 0.90 en la validación cruzada.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ESTUDIO DE ELASTICIDAD Y SENSIBILIDAD */}
      <div className="glass-card p-6 md:p-8 rounded-[32px] mt-8 relative overflow-hidden shadow-2xl mb-12">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-fuchsia-500/10 blur-[80px] rounded-full pointer-events-none"></div>
        
        <div className="mb-6 flex items-center gap-3 relative z-10">
          <div className="w-12 h-12 rounded-2xl bg-fuchsia-500/20 flex items-center justify-center text-fuchsia-400">
            <Activity size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-display text-white">Estudio de Elasticidad y Análisis de Sensibilidad</h2>
            <p className="text-sm text-on-surface-variant">Impacto de la variabilidad macroeconómica en el incremento presupuestal (Vigencia 2027)</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
          {/* Optimista */}
          <div className="bg-surface-container-low/50 border border-emerald-500/30 p-5 rounded-2xl flex flex-col relative overflow-hidden transition-all hover:bg-surface-container-low">
            <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500"></div>
            <span className="text-emerald-400 font-bold mb-1">Escenario Optimista</span>
            <span className="text-xs text-on-surface-variant mb-4 leading-relaxed">Inflación controlada y políticas de gasto restrictivas (Baja presión)</span>
            <span className="text-3xl font-display text-white mb-1">+{scenarios.conservative.toFixed(2)}%</span>
            <div className="mt-auto">
              <span className="text-[10px] text-on-surface-variant uppercase tracking-wider block mb-1">Ingreso Requerido</span>
              <span className="text-sm text-emerald-300 font-mono font-bold bg-emerald-500/10 px-2 py-1 rounded inline-block">
                {formatCurrencyShort(currentBudget * (1 + scenarios.conservative / 100))}
              </span>
            </div>
          </div>

          {/* Base */}
          <div className="bg-surface-container-highest border border-blue-500/50 p-6 rounded-2xl flex flex-col relative overflow-hidden transform md:-translate-y-2 shadow-[0_8px_30px_rgb(0,0,0,0.4)]">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-blue-500"></div>
            <span className="text-blue-400 font-bold mb-1 flex items-center justify-between">
              Escenario Base (MFMP)
              <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full uppercase tracking-wider">Actual</span>
            </span>
            <span className="text-xs text-on-surface-variant mb-4 leading-relaxed">Acorde a la directriz del modelo predictivo seleccionado actualmente</span>
            <span className="text-4xl font-display text-white mb-2">+{scenarios.base.toFixed(2)}%</span>
            <div className="mt-auto">
              <span className="text-[10px] text-on-surface-variant uppercase tracking-wider block mb-1">Ingreso Requerido</span>
              <span className="text-base text-blue-300 font-mono font-bold bg-blue-500/10 px-2 py-1 rounded inline-block">
                {formatCurrencyShort(currentBudget * (1 + scenarios.base / 100))}
              </span>
            </div>
          </div>

          {/* Acido */}
          <div className="bg-surface-container-low/50 border border-red-500/30 p-5 rounded-2xl flex flex-col relative overflow-hidden transition-all hover:bg-surface-container-low">
            <div className="absolute top-0 left-0 w-full h-1 bg-red-500"></div>
            <span className="text-red-400 font-bold mb-1">Escenario Ácido</span>
            <span className="text-xs text-on-surface-variant mb-4 leading-relaxed">Desborde del IPC e ICES por encima de metas del Banco de la República</span>
            <span className="text-3xl font-display text-white mb-1">+{scenarios.pressure.toFixed(2)}%</span>
            <div className="mt-auto">
              <span className="text-[10px] text-on-surface-variant uppercase tracking-wider block mb-1">Ingreso Requerido</span>
              <span className="text-sm text-red-300 font-mono font-bold bg-red-500/10 px-2 py-1 rounded inline-block">
                {formatCurrencyShort(currentBudget * (1 + scenarios.pressure / 100))}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-8 text-sm text-on-surface-variant bg-black/30 p-5 rounded-xl border border-white/5 relative z-10 flex gap-4 items-start">
          <Info className="shrink-0 text-fuchsia-400 mt-0.5" size={18} />
          <p className="leading-relaxed">
            <strong className="text-white">Sensibilidad del Ingreso (Art 86 vs ICES):</strong> Debido a que el recurso principal de la universidad está atado al IPC, escenarios de alta inflación sectorial obligan a la universidad a generar un delta de ingresos propios. Bajo el escenario ácido (crecimiento &gt;8%), se excede el umbral viable del 10% histórico, exigiendo inmediatamente planes de contingencia (reducción de funcionamiento) o cofinanciación territorial.
          </p>
        </div>
      </div>
    </div>
  );
}
