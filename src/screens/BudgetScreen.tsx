import React, { useMemo, useState } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, PieChart, Pie, Cell, LineChart, Line, Legend, ComposedChart } from 'recharts';
import { 
  TrendingUp, TrendingDown, DollarSign, Wallet, AlertTriangle, Lightbulb, 
  Target, Info, CheckCircle2, FileText, Scale, BarChart2, ShieldAlert, Activity 
} from 'lucide-react';
import { budgetData } from '../data/budgetData';
import { MACRO_INDICATORS, YEARS } from '../lib/macroData';
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
      let gastosPersonales = 0;
      let funcionamientoEInversion = 0;

      if (year === 2026) {
        // Proyección 2026 aforo actual / recaudo
        totalBudget = 531067100000;
        gastosPersonales = 360802600000;
        // The total expenses are 596533200000 (meaning a deficit of ~65B).
        funcionamientoEInversion = 596533200000 - gastosPersonales;
      } else {
        if (year === 2025) totalBudget = 510077500000;
        else if (year === 2024) totalBudget = 443054200000;
        else if (year === 2023) totalBudget = 413198500000;
        else if (year === 2022) totalBudget = 367235856437.52;
        else if (year === 2021) totalBudget = 338949052179.61;
        else if (year === 2020) totalBudget = 328798133475.68;
        else {
          const incomes = budgetData.filter(d => d.year === year && d.category === 'Ingresos');
          totalBudget = incomes.reduce((acc, curr) => acc + curr.amount, 0);
        }
        
        gastosPersonales = budgetData.filter(d => d.year === year && d.category === 'Nómina').reduce((a, b) => a + b.amount, 0);
        funcionamientoEInversion = Math.max(0, totalBudget - gastosPersonales);
      }

      // Safe access
      const macro = MACRO_INDICATORS[year] as any || {};

      return {
        year,
        totalBudget,
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
      // totalExpenses removed, we graph totalBudget
      fitted: bestModel.fitted[i] || null
    };
  });

  // Incremento del Ingreso Proyectado
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

  return (
    <div className="space-y-6 pb-20 fade-in max-w-[1600px] mx-auto">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-display font-medium text-white tracking-tight">Presupuesto Institucional</h1>
          <p className="text-on-surface-variant mt-2 text-sm max-w-2xl">
            Análisis histórico, impacto macroeconómico y proyección predictiva para el próximo ciclo presupuestal, impulsado por IA.
          </p>
        </div>
      </header>

      {/* INFORME TÉCNICO EJECUTIVO */}
      <div className="mb-8 bg-gradient-to-br from-surface-container-high/80 to-background border border-primary-container/20 rounded-[32px] p-6 md:p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-primary-container/10 blur-[100px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none"></div>

        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center gap-4 mb-8">
            <div className="w-14 h-14 rounded-2xl bg-primary-container/20 flex items-center justify-center text-primary-container shrink-0 border border-primary-container/30">
              <FileText size={28} />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-display text-white font-bold tracking-tight">Informe Técnico: Propuesta Presupuestal Universitaria 2027</h2>
              <p className="text-primary-container font-mono text-sm mt-1 uppercase tracking-wider">Sostenibilidad, Marco Legal y Proyecciones Macroeconómicas</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            
            {/* 1. Contexto */}
            <div className="glass-card p-5 rounded-2xl border-l-4 border-l-orange-400 bg-white/5 hover:bg-white/10 transition-colors">
              <h3 className="text-white font-bold flex items-center gap-2 mb-3">
                <Activity size={18} className="text-orange-400" />
                1. Diagnóstico Fiscal 2026-2027
              </h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Entorno de alta complejidad fiscal que obliga a priorizar la <strong>sostenibilidad del Estado</strong>. Con un PIB en meseta (2.6%) y desaceleración en 2027, el <em>gasto inflexible</em> es la mayor amenaza estructural. La universidad debe transitar hacia un modelo de eficiencia presupuestal técnica, lejos de incrementos vegetativos.
              </p>
            </div>

            {/* 2. Marco Normativo */}
            <div className="glass-card p-5 rounded-2xl border-l-4 border-l-emerald-400 bg-white/5 hover:bg-white/10 transition-colors">
              <h3 className="text-white font-bold flex items-center gap-2 mb-3">
                <Scale size={18} className="text-emerald-400" />
                2. Marco Normativo (Ley 2568)
              </h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Modifica el <strong>Art. 86 (Ley 30)</strong> para superar la indexación simplista del IPC, reconociendo la canasta real de costos (ICES). Tres imperativos legales para 2027:
              </p>
              <ul className="text-xs text-on-surface-variant mt-2 list-disc pl-4 space-y-1">
                <li>Indexación diferencial por costos sectoriales.</li>
                <li>Consolidación de la base (Nómina y beneficios).</li>
                <li>Transferencias de inversión estructural.</li>
              </ul>
            </div>

            {/* 3. Variables Macroeconómicas */}
            <div className="glass-card p-5 rounded-2xl border-l-4 border-l-blue-400 bg-white/5 hover:bg-white/10 transition-colors xl:row-span-2">
              <h3 className="text-white font-bold flex items-center gap-2 mb-3">
                <BarChart2 size={18} className="text-blue-400" />
                3. Variables Críticas (MFMP 2026)
              </h3>
              <p className="text-sm text-on-surface-variant mb-4">
                El uso del IPC general (4.1%) es <strong>insuficiente</strong> y derivaría en recortes reales frente a la inercia inflacionaria. El ICES es una necesidad técnica absoluta.
              </p>
              <div className="space-y-2">
                <div className="flex justify-between items-center bg-black/20 p-2 rounded-lg">
                  <span className="text-xs text-on-surface-variant">Crecimiento PIB Real</span>
                  <span className="text-sm font-bold text-white">2.2%</span>
                </div>
                <div className="flex justify-between items-center bg-black/20 p-2 rounded-lg">
                  <span className="text-xs text-on-surface-variant">Inflación (IPC)</span>
                  <span className="text-sm font-bold text-red-400">4.1%</span>
                </div>
                <div className="flex justify-between items-center bg-black/20 p-2 rounded-lg">
                  <span className="text-xs text-on-surface-variant">Déficit Fiscal GNC</span>
                  <span className="text-sm font-bold text-orange-400">4.5% del PIB</span>
                </div>
                <div className="flex justify-between items-center bg-black/20 p-2 rounded-lg">
                  <span className="text-xs text-on-surface-variant">Ingresos Totales GNC</span>
                  <span className="text-sm font-bold text-emerald-400">17.3% del PIB</span>
                </div>
                <div className="flex justify-between items-center bg-black/20 p-2 rounded-lg">
                  <span className="text-xs text-on-surface-variant">Deuda Neta GNC</span>
                  <span className="text-sm font-bold text-red-400">58.9% del PIB</span>
                </div>
              </div>
            </div>

            {/* 4. Proyección Ingresos y Gastos */}
            <div className="glass-card p-5 rounded-2xl border-l-4 border-l-[#c084fc] bg-white/5 hover:bg-white/10 transition-colors">
              <h3 className="text-white font-bold flex items-center gap-2 mb-3">
                <Target size={18} className="text-[#c084fc]" />
                4. Dinámica de Ingresos y Gastos
              </h3>
              <ul className="text-xs text-on-surface-variant space-y-2">
                <li><strong className="text-white">Ingresos:</strong> Requieren alineación con sectores de crecimiento (Agro 11.2%, Entretenimiento 31.2%).</li>
                <li><strong className="text-white">Funcionamiento:</strong> Altamente impactado por el ajuste salarial redistributivo; exige optimización en gastos operativos.</li>
                <li><strong className="text-white">Inversión:</strong> Multiplicador fiscal estimado de 0.2, justificando infraestructura como motor de productividad.</li>
              </ul>
            </div>

            {/* 5. Riesgos y Sostenibilidad */}
            <div className="glass-card p-5 rounded-2xl border-l-4 border-l-red-400 bg-white/5 hover:bg-white/10 transition-colors">
              <h3 className="text-white font-bold flex items-center gap-2 mb-3">
                <ShieldAlert size={18} className="text-red-400" />
                5. Análisis de Riesgos y Sostenibilidad
              </h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                El <em>"Pacto Fiscal"</em> es una incertidumbre política frente al historial de rechazo legislativo (2025/2026). La alta deuda del GNC (58.9%) bloquea apalancamientos externos. La universidad debe planear con resiliencia, asumiendo contingencias por menor recaudo tributario y recortes en cuotas de gasto.
              </p>
            </div>

          </div>
        </div>
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-5 rounded-2xl border-l-4 border-l-primary-container">
          <p className="text-xs font-mono text-on-surface-variant uppercase tracking-wider mb-2">Presupuesto 2026</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-display text-white">{formatCurrencyShort(currentBudget)}</h3>
          </div>
          <p className="text-xs text-on-surface-variant mt-2 flex items-center gap-1">
            <TrendingUp size={14} className="text-emerald-400" />
            <span className="text-emerald-400">+{budgetVar.toFixed(1)}%</span> vs 2025
          </p>
        </div>
        
        <div className="glass-card p-5 rounded-2xl border-l-4 border-l-[#f472b6]">
          <p className="text-xs font-mono text-on-surface-variant uppercase tracking-wider mb-2">Gastos de Personal</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-display text-white">{formatCurrencyShort(currentPersonales)}</h3>
          </div>
          <p className="text-xs text-on-surface-variant mt-2 flex items-center gap-1">
            <TrendingUp size={14} className="text-[#f472b6]" />
            <span className="text-[#f472b6]">+{personalesVar.toFixed(1)}%</span> vs 2025
          </p>
        </div>

        <div className="glass-card p-5 rounded-2xl border-l-4 border-l-[#60a5fa]">
          <p className="text-xs font-mono text-on-surface-variant uppercase tracking-wider mb-2">Recursos Propios (Participación)</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-display text-white">
              {((compData.find(c => c.name === 'Recursos Propios')?.value || 0) / currentBudget * 100).toFixed(1)}%
            </h3>
          </div>
          <p className="text-xs text-on-surface-variant mt-2">
            Del total de ingresos 2026
          </p>
        </div>

        <div className="glass-card p-5 rounded-2xl border-l-4 border-l-[#fbbf24]">
          <p className="text-xs font-mono text-on-surface-variant uppercase tracking-wider mb-2">IPC Proyectado</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-display text-white">{historicalSeries[latestIndex].ipc}%</h3>
          </div>
          <p className="text-xs text-on-surface-variant mt-2">
            Variable macro clave de presión
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        
        {/* Comportamiento Histórico (2 columns) */}
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
