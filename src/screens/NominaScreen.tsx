import React, { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, Legend, Line, LineChart } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Users, Calculator, Calendar, ToggleLeft, ToggleRight, ArrowLeft } from 'lucide-react';
import { budgetData } from '../data/budgetData';

const SPECIFIC_RESOURCES = Array.from(new Set(budgetData.filter(d => d.category === 'Ingresos').map(d => `${d.resourceCode} - ${d.description}`))).sort();
const MAIN_CATEGORIES = ['Recursos Nación', 'Recursos Propios'] as const;

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCurrencyShort(value: number) {
  if (value >= 1e12) return `$${(value / 1e12).toFixed(1)}B`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}MM`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  return `$${value}`;
}

const YEARS = [2020, 2021, 2022, 2023, 2024, 2025, 2026];

const INDICADORS_DATA: Record<number, { ipc: number; salarioMinimo: number; decreto1278: number }> = {
  2020: { ipc: 1.61, salarioMinimo: 6.0, decreto1278: 5.12 },
  2021: { ipc: 5.62, salarioMinimo: 3.5, decreto1278: 2.61 },
  2022: { ipc: 13.12, salarioMinimo: 10.07, decreto1278: 7.26 },
  2023: { ipc: 9.28, salarioMinimo: 16.0, decreto1278: 14.62 },
  2024: { ipc: 5.2, salarioMinimo: 12.0, decreto1278: 10.88 },
  2025: { ipc: 5.1, salarioMinimo: 9.5, decreto1278: 8.6 },
  2026: { ipc: 4.0, salarioMinimo: 23.0, decreto1278: 7.0 },
};

export function NominaScreen({ onNavigate }: { onNavigate: (s: string) => void }) {
  const [selectedYear, setSelectedYear] = useState<number>(2024);
  const [includeHonorarios, setIncludeHonorarios] = useState<boolean>(true);
  const [selectedResourceCategory, setSelectedResourceCategory] = useState<string>(SPECIFIC_RESOURCES[0] || '');
  const [selectedMainIncomeCategory, setSelectedMainIncomeCategory] = useState<string>('Todos');

  const [showVarGastos, setShowVarGastos] = useState<boolean>(true);
  const [showIpc, setShowIpc] = useState<boolean>(true);
  const [showSalarioMinimo, setShowSalarioMinimo] = useState<boolean>(true);
  const [showDecreto1278, setShowDecreto1278] = useState<boolean>(true);

  const resourceEvolutionData = useMemo(() => {
    return YEARS.map((year) => {
      const yearRecords = budgetData.filter(
        (d) =>
          d.year === year &&
          `${d.resourceCode} - ${d.description}` === selectedResourceCategory &&
          d.category === 'Ingresos'
      );

      const ingresos = yearRecords.reduce((acc, curr) => acc + curr.amount, 0);

      return {
        year,
        ingresos,
      };
    });
  }, [selectedResourceCategory]);

  const aggregatedData = useMemo(() => {
    return YEARS.map((year) => {
      const yearRecords = budgetData.filter((d) => d.year === year);
      
      const inRecords = yearRecords.filter((d) => d.category === 'Ingresos');
      const filteredInRecords = selectedMainIncomeCategory === 'Todos' 
        ? inRecords 
        : inRecords.filter(d => d.source === selectedMainIncomeCategory);
        
      const ingresos = filteredInRecords.reduce((acc, curr) => acc + curr.amount, 0);
      
      const outRecords = yearRecords.filter((d) => d.category !== 'Ingresos');
      
      const nomina = outRecords.filter((d) => d.category === 'Nómina').reduce((acc, curr) => acc + curr.amount, 0);
      const honorarios = outRecords.filter((d) => d.category === 'Honorarios').reduce((acc, curr) => acc + curr.amount, 0);

      const gastosTotales = includeHonorarios ? nomina + honorarios : nomina;
      const delta = ingresos - gastosTotales;

      return {
        year,
        ingresos,
        nomina,
        honorarios,
        gastosTotales,
        delta,
      };
    });
  }, [includeHonorarios, selectedMainIncomeCategory]);

  const currentYearData = aggregatedData.find((d) => d.year === selectedYear) || {
    year: selectedYear,
    ingresos: 0,
    nomina: 0,
    honorarios: 0,
    gastosTotales: 0,
    delta: 0,
  };
  const prevYearData = aggregatedData.find((d) => d.year === selectedYear - 1);

  const gastosVar =
    prevYearData && prevYearData.gastosTotales > 0
      ? ((currentYearData.gastosTotales - prevYearData.gastosTotales) / prevYearData.gastosTotales) * 100
      : 0;

  const comparativeData = useMemo(() => {
    return YEARS.map((year) => {
      const currentGastos = aggregatedData.find(d => d.year === year)?.gastosTotales || 0;
      const prevGastos = aggregatedData.find(d => d.year === year - 1)?.gastosTotales || 0;
      
      let varGastos = null;
      if (prevGastos > 0) {
         varGastos = Number((((currentGastos - prevGastos) / prevGastos) * 100).toFixed(2));
      }
      
      return {
        year,
        varGastos,
        ipc: INDICADORS_DATA[year].ipc,
        salarioMinimo: INDICADORS_DATA[year].salarioMinimo,
        decreto1278: INDICADORS_DATA[year].decreto1278
      };
    });
  }, [aggregatedData]);

  const breakdownData = useMemo(() => {
    let records = budgetData.filter(
      (d) => d.year === selectedYear && (d.category === 'Nómina' || (includeHonorarios && d.category === 'Honorarios'))
    );

    if (selectedMainIncomeCategory !== 'Todos') {
      records = records.filter(d => d.source === selectedMainIncomeCategory);
    }

    const categoryMap: Record<string, number> = {};
    records.forEach((r) => {
      const name = `${r.resourceCode} - ${r.description}`;
      categoryMap[name] = (categoryMap[name] || 0) + r.amount;
    });

    return Object.entries(categoryMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [selectedYear, includeHonorarios]);

  return (
    <div className="flex flex-col mb-20 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/10 pb-6">
        <div>
          <button 
             onClick={() => onNavigate('dashboard')} 
             className="text-on-surface-variant hover:text-white flex items-center gap-2 mb-4 transition-colors"
          >
             <ArrowLeft size={16} />
             <span className="text-sm font-bold">Volver al Tablero</span>
          </button>
          <p className="text-[#ffcc29] text-xs uppercase tracking-widest font-bold mb-1">MÓDULO DE RECURSOS HUMANOS</p>
          <div className="flex items-center gap-4">
            <h2 className="text-3xl font-bold font-display text-white">Nómina y Honorarios</h2>
          </div>
          <p className="text-on-surface-variant mt-2 text-sm max-w-2xl">
            Análisis del comportamiento del gasto de personal frente a los ingresos de funcionamiento (2020-2026).
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4 bg-surface-container-low p-2 rounded-xl border border-white/5">
          <div className="flex items-center gap-2 px-3">
            <Calendar className="w-4 h-4 text-on-surface-variant" />
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-transparent text-white font-medium text-sm focus:outline-none focus:ring-0 cursor-pointer"
            >
              {YEARS.map((y) => (
                <option key={y} value={y} className="bg-black text-white">
                  Vigencia {y}
                </option>
              ))}
            </select>
          </div>
          
          <div className="w-px h-6 bg-white/10 hidden sm:block" />

          <button
            onClick={() => setIncludeHonorarios(!includeHonorarios)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors focus:outline-none group"
          >
            {includeHonorarios ? (
              <ToggleRight className="w-6 h-6 text-primary-container transition-transform group-hover:scale-105" />
            ) : (
              <ToggleLeft className="w-6 h-6 text-on-surface-variant transition-transform group-hover:scale-105" />
            )}
            <span className={`text-sm font-medium ${includeHonorarios ? "text-white" : "text-on-surface-variant"}`}>
              Incluir Honorarios
            </span>
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Gasto Nómina"
          value={currentYearData.nomina}
          icon={<Users className="w-5 h-5 text-primary-container" />}
        />
        <KpiCard
          title="Total Honorarios"
          value={currentYearData.honorarios}
          icon={<Calculator className="w-5 h-5 text-on-surface-variant" />}
          dimmed={!includeHonorarios}
        />
        <KpiCard
          title="Delta (Ingresos - Gastos)"
          value={currentYearData.delta}
          icon={<DollarSign className={`w-5 h-5 ${currentYearData.delta >= 0 ? "text-[#4ade80]" : "text-[#ff5b5b]"}`} />}
          valueColor={currentYearData.delta >= 0 ? "text-[#4ade80]" : "text-[#ff5b5b]"}
        />
        <KpiCard
          title="Variación Gastos"
          value={`${gastosVar > 0 ? '+' : ''}${gastosVar.toFixed(2)}%`}
          icon={gastosVar > 0 ? <TrendingUp className="w-5 h-5 text-[#ffcc29]" /> : <TrendingDown className="w-5 h-5 text-white" />}
          valueColor={gastosVar > 0 ? "text-[#ffcc29]" : "text-white"}
          isCurrency={false}
          subtitle={`Vs. Vigencia ${selectedYear - 1}`}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Trend Chart */}
        <div className="lg:col-span-2 glass-card rounded-[24px] p-6 relative overflow-hidden flex flex-col h-[450px]">
          <div className="mb-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-display font-medium text-white">Evolución de Ingresos vs Gastos</h2>
              <p className="text-xs text-on-surface-variant mt-1">Comparativa histórica 2020-2026. Gastos de nómina vs Ingresos.</p>
            </div>
            <div className="flex items-center gap-2 bg-black/20 p-1.5 rounded-lg border border-white/5">
              <span className="text-xs font-medium text-on-surface-variant pl-2">Ingresos:</span>
              <select
                value={selectedMainIncomeCategory}
                onChange={(e) => setSelectedMainIncomeCategory(e.target.value)}
                className="bg-transparent text-primary-container font-semibold text-sm outline-none border-none py-1 mr-2 cursor-pointer"
              >
                <option value="Todos" className="bg-black hover:bg-white/10">Todos los recursos</option>
                {MAIN_CATEGORIES.map(cat => (
                  <option key={cat} value={cat} className="bg-black text-white hover:bg-white/10">
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex-1 w-full relative h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={aggregatedData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4ade80" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#4ade80" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorGastos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ff5b5b" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#ff5b5b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="year" stroke="currentColor" className="text-xs text-on-surface-variant font-mono" tick={{ fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis 
                  stroke="currentColor" 
                  className="text-xs text-on-surface-variant font-mono"
                  tick={{ fill: '#94a3b8' }} 
                  axisLine={false} 
                  tickLine={false}
                  tickFormatter={formatCurrencyShort}
                />
                <RechartsTooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1, strokeDasharray: '4 4' }} />
                <Legend wrapperStyle={{ fontSize: '12px', opacity: 0.8 }} />
                <Area
                  type="monotone"
                  name={`Ingresos (${selectedMainIncomeCategory})`}
                  dataKey="ingresos"
                  stroke="#4ade80"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorIngresos)"
                  activeDot={{ r: 6, strokeWidth: 0, fill: '#4ade80' }}
                />
                <Area
                  type="monotone"
                  name="Gastos (Nómina+Hon)"
                  dataKey="gastosTotales"
                  stroke="#ff5b5b"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorGastos)"
                  activeDot={{ r: 6, strokeWidth: 0, fill: '#ff5b5b' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Breakdown Bar Chart */}
        <div className="glass-card rounded-[24px] p-6 relative flex flex-col h-[450px]">
          <div className="mb-6">
            <h2 className="text-lg font-display font-medium text-white">
              Desglose de Gastos
            </h2>
            <p className="text-xs text-on-surface-variant mt-1">Vigencia {selectedYear}</p>
          </div>
          <div className="flex-1 w-full relative h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={breakdownData} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={true} vertical={false} />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  width={110}
                  className="font-mono text-[10px]"
                  tick={{ fill: '#a3a3a3' }}
                />
                <RechartsTooltip
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-[#0f172a]/95 backdrop-blur-md border border-white/10 p-3 rounded-lg shadow-xl shrink-0">
                          <p className="text-xs font-mono text-white mb-1 truncate max-w-[200px]">{payload[0].payload.name}</p>
                          <p className="text-[#ffcc29] font-bold text-sm">
                            {formatCurrency(Number(payload[0].value))}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  dataKey="value"
                  fill="#7bd0ff"
                  radius={[0, 4, 4, 0]}
                  barSize={16}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Comparative Indicators Section */}
      <div className="pt-4 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-display font-medium text-white">Comparativa vs Indicadores Macroeconómicos</h2>
            <p className="text-sm text-on-surface-variant mt-1">
              Variación de gastos frente a los indicadores clave (IPC, Salario Mínimo, etc).
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 bg-surface-container-low p-2 rounded-xl border border-white/5 py-3 px-4">
            <label className="flex items-center gap-2 cursor-pointer text-sm font-mono text-on-surface-variant hover:text-white transition-colors">
              <input type="checkbox" checked={showVarGastos} onChange={() => setShowVarGastos(!showVarGastos)} className="accent-[#ffcc29]" />
              Var. Gastos
            </label>
            <div className="w-[1px] h-4 bg-white/10 hidden sm:block"></div>
            <label className="flex items-center gap-2 cursor-pointer text-sm font-mono text-on-surface-variant hover:text-white transition-colors">
              <input type="checkbox" checked={showIpc} onChange={() => setShowIpc(!showIpc)} className="accent-[#60a5fa]" />
              IPC
            </label>
            <div className="w-[1px] h-4 bg-white/10 hidden sm:block"></div>
            <label className="flex items-center gap-2 cursor-pointer text-sm font-mono text-on-surface-variant hover:text-white transition-colors">
              <input type="checkbox" checked={showDecreto1278} onChange={() => setShowDecreto1278(!showDecreto1278)} className="accent-[#c084fc]" />
              Dcto 1278
            </label>
            <div className="w-[1px] h-4 bg-white/10 hidden sm:block"></div>
            <label className="flex items-center gap-2 cursor-pointer text-sm font-mono text-on-surface-variant hover:text-white transition-colors">
              <input type="checkbox" checked={showSalarioMinimo} onChange={() => setShowSalarioMinimo(!showSalarioMinimo)} className="accent-[#34d399]" />
              Salario Mín.
            </label>
          </div>
        </div>

        <div className="glass-card rounded-[24px] p-6 relative h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={comparativeData.filter(d => d.varGastos !== null)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="year" stroke="currentColor" className="text-xs text-on-surface-variant font-mono" tick={{ fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis 
                stroke="currentColor" 
                className="text-xs text-on-surface-variant font-mono"
                tick={{ fill: '#94a3b8' }} 
                axisLine={false} 
                tickLine={false}
                tickFormatter={(val) => `${val}%`}
              />
              <RechartsTooltip 
                cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1, strokeDasharray: '4 4' }} 
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-[#0f172a]/95 backdrop-blur-md border border-white/10 p-4 rounded-xl shadow-2xl min-w-[200px]">
                        <p className="text-on-surface-variant text-xs mb-3 font-mono uppercase tracking-wider">{label}</p>
                        <div className="space-y-2">
                          {payload.map((entry, index) => (
                            <div key={index} className="flex justify-between items-center text-sm gap-4">
                              <span className="flex items-center gap-2 text-white font-mono text-xs">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
                                {entry.name}
                              </span>
                              <span className="font-bold text-white text-xs">
                                {(entry.value as number).toFixed(2)}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', opacity: 0.8 }} />
              {showVarGastos && (
                <Line type="monotone" name="Variación Gastos" dataKey="varGastos" stroke="#ffcc29" strokeWidth={3} dot={{ r: 4, strokeWidth: 0, fill: '#ffcc29' }} activeDot={{ r: 6, strokeWidth: 0, fill: '#ffcc29' }} />
              )}
              {showIpc && (
                <Line type="monotone" name="IPC" dataKey="ipc" stroke="#60a5fa" strokeWidth={3} dot={{ r: 4, strokeWidth: 0, fill: '#60a5fa' }} activeDot={{ r: 6, strokeWidth: 0, fill: '#60a5fa' }} />
              )}
              {showDecreto1278 && (
                <Line type="monotone" name="Aumento Decreto 1278" dataKey="decreto1278" stroke="#c084fc" strokeWidth={3} dot={{ r: 4, strokeWidth: 0, fill: '#c084fc' }} activeDot={{ r: 6, strokeWidth: 0, fill: '#c084fc' }} />
              )}
              {showSalarioMinimo && (
                <Line type="monotone" name="Aumento Salario Mínimo" dataKey="salarioMinimo" stroke="#34d399" strokeWidth={3} dot={{ r: 4, strokeWidth: 0, fill: '#34d399' }} activeDot={{ r: 6, strokeWidth: 0, fill: '#34d399' }} />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Resource Analysis Section */}
      <div className="pt-4 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-display font-medium text-white">Evolución Detallada por Recurso (Ingresos)</h2>
            <p className="text-sm text-on-surface-variant mt-1">Histórico de ingresos filtrados por fuente de financiación específica.</p>
          </div>
          
          <div className="flex items-center gap-2 bg-surface-container-low p-2 rounded-xl border border-white/5 py-2 px-3">
            <span className="text-sm font-mono text-on-surface-variant">Filtrar:</span>
            <select
              value={selectedResourceCategory}
              onChange={(e) => setSelectedResourceCategory(e.target.value)}
              className="bg-transparent text-primary-container font-mono text-xs focus:outline-none focus:ring-0 cursor-pointer outline-none border-none py-1 max-w-[200px] sm:max-w-[400px] text-ellipsis overflow-hidden truncate"
            >
              {SPECIFIC_RESOURCES.map(cat => (
                <option key={cat} value={cat} className="bg-black text-white gap-2">
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="glass-card rounded-[24px] p-6 relative h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={resourceEvolutionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorResourceIngresos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7bd0ff" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#7bd0ff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="year" stroke="currentColor" className="text-xs text-on-surface-variant font-mono" tick={{ fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis 
                stroke="currentColor" 
                className="text-xs text-on-surface-variant font-mono"
                tick={{ fill: '#94a3b8' }} 
                axisLine={false} 
                tickLine={false}
                tickFormatter={formatCurrencyShort}
              />
              <RechartsTooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1, strokeDasharray: '4 4' }} />
              <Legend wrapperStyle={{ fontSize: '11px', opacity: 0.8 }} />
              <Area
                type="monotone"
                name={`Ingresos (${selectedResourceCategory})`}
                dataKey="ingresos"
                stroke="#7bd0ff"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorResourceIngresos)"
                activeDot={{ r: 6, strokeWidth: 0, fill: '#7bd0ff' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}

// Subcomponents
function KpiCard({ 
  title, 
  value, 
  icon, 
  dimmed = false,
  valueColor = "text-white",
  isCurrency = true,
  subtitle
}: { 
  title: string; 
  value: number | string; 
  icon: React.ReactNode; 
  dimmed?: boolean;
  valueColor?: string;
  isCurrency?: boolean;
  subtitle?: string;
}) {
  return (
    <div className={`glass-card rounded-[24px] p-6 relative overflow-hidden transition-all duration-300 ${dimmed ? "opacity-50 grayscale" : ""}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-black/20 rounded-xl">
          {icon}
        </div>
        <h3 className="text-xs font-mono tracking-widest uppercase text-on-surface-variant">{title}</h3>
      </div>
      <div>
        <div className={`text-3xl font-display font-bold ${valueColor}`}>
          {isCurrency && typeof value === 'number' ? formatCurrency(value) : value}
        </div>
        {subtitle && (
          <p className="text-[10px] text-on-surface-variant mt-2 font-mono uppercase opacity-80">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#0f172a]/95 backdrop-blur-md border border-white/10 p-4 rounded-xl shadow-2xl min-w-[200px]">
        <p className="text-on-surface-variant text-xs mb-3 font-mono uppercase tracking-wider border-b border-white/10 pb-2">Vigencia {label}</p>
        <div className="space-y-3">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-[10px] font-mono text-white">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.stroke || entry.fill }} />
                {entry.name}
              </div>
              <p className="text-sm font-semibold pl-4" style={{ color: entry.stroke || entry.fill }}>
                {formatCurrency(entry.value)}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};
