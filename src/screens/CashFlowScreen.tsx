import React, { useState, useMemo } from 'react';
import { 
  ResponsiveContainer, ComposedChart, AreaChart, Area, Line, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip as RechartsTooltip, Legend, Cell, Sankey, Treemap,
  BarChart
} from 'recharts';
import { 
  ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown, Wallet, 
  AlertCircle, AlertTriangle, CheckCircle, Info, Calendar, Filter, 
  ChevronDown, ChevronRight, Download, Maximize2, Coins, Activity, Target
} from 'lucide-react';
import { cn } from '../lib/utils';

// --- Formatters ---
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

const formatCurrencyShort = (value: number) => {
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}B`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}MM`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  return formatCurrency(value);
};

// --- Mock Data ---
const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const generateMonthlyData = () => {
  let balance = 15000000000; // Saldo inicial 15.000M
  return MONTHS.map((month, i) => {
    // Patrón simulado: Ingresos fuertes a principio de semestre (Feb, Ago)
    const baseIncome = 45000000000;
    const incomeSpike = (i === 1 || i === 7) ? 20000000000 : 0;
    const income = baseIncome + incomeSpike + (Math.random() * 5000000000);
    
    // Gastos tienen concentración en Jun y Dic (primas)
    const baseExpense = 46000000000;
    const expenseSpike = (i === 5 || i === 11) ? 18000000000 : 0;
    const expense = baseExpense + expenseSpike + (Math.random() * 3000000000);
    
    const netFlow = income - expense;
    const initialBalance = balance;
    balance += netFlow;
    
    return {
      month,
      income,
      expense,
      netFlow,
      initialBalance,
      finalBalance: balance,
      // Desagregación Gastos
      gPersonal: expense * 0.65,
      gFuncionamiento: expense * 0.25,
      gInversion: expense * 0.10,
      // Desagregación Ingresos
      rNacion: income * 0.70,
      rPropios: income * 0.30,
    };
  });
};

const monthlyData = generateMonthlyData();
const totalIncome = monthlyData.reduce((acc, curr) => acc + curr.income, 0);
const totalExpense = monthlyData.reduce((acc, curr) => acc + curr.expense, 0);
const finalBalance = monthlyData[monthlyData.length - 1].finalBalance;
const initialBalance = monthlyData[0].initialBalance;
const netFlowTotal = totalIncome - totalExpense;

// Sankey Data (Ingresos -> Gastos)
const sankeyData = {
  nodes: [
    { name: 'Nación (Art. 86)' },
    { name: 'Recursos Propios' },
    { name: 'Estampillas' },
    { name: 'Presupuesto Total' },
    { name: 'Gastos de Personal' },
    { name: 'Gastos Funcionamiento' },
    { name: 'Inversión' }
  ],
  links: [
    { source: 0, target: 3, value: totalIncome * 0.65 },
    { source: 1, target: 3, value: totalIncome * 0.25 },
    { source: 2, target: 3, value: totalIncome * 0.10 },
    { source: 3, target: 4, value: totalExpense * 0.65 },
    { source: 3, target: 5, value: totalExpense * 0.25 },
    { source: 3, target: 6, value: totalExpense * 0.10 }
  ]
};

// Heatmap Data (Rubro x Mes)
const heatmapData = [
  { rubro: 'Sueldos Básicos', data: monthlyData.map(m => m.gPersonal * 0.5) },
  { rubro: 'Primas (Jun/Dic)', data: monthlyData.map((m, i) => (i === 5 || i === 11) ? m.gPersonal * 0.4 : m.gPersonal * 0.05) },
  { rubro: 'Servicios Públicos', data: monthlyData.map(m => m.gFuncionamiento * 0.2) },
  { rubro: 'Mantenimiento', data: monthlyData.map(m => m.gFuncionamiento * 0.3) },
  { rubro: 'Proyectos Inversión', data: monthlyData.map(m => m.gInversion * 0.8) },
];

export function CashFlowScreen() {
  const [selectedPeriod, setSelectedPeriod] = useState('2026');
  const [selectedResource, setSelectedResource] = useState('Todos');
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-surface text-on-surface p-4 md:p-8 font-sans pb-24">
      {/* HEADER & FILTROS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-display text-white flex items-center gap-3">
            <Activity className="text-emerald-400" />
            Motor de Proyección Financiera Institucional
          </h1>
          <p className="text-on-surface-variant mt-1">Financial Command Center - Análisis y Control de Liquidez</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="glass-card px-4 py-2 rounded-xl flex items-center gap-2 cursor-pointer hover:bg-white/5 transition-colors">
            <Calendar size={16} className="text-primary-container" />
            <select className="bg-transparent text-white text-sm outline-none cursor-pointer appearance-none" value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)}>
              <option value="Todas" className="bg-surface">Todas las Unidades</option>
              <option value="Sede Central" className="bg-surface">Sede Central</option>
              <option value="Facultad Seccional Duitama" className="bg-surface">Facultad Seccional Duitama</option>
              <option value="Facultad Seccional Sogamoso" className="bg-surface">Facultad Seccional Sogamoso</option>
              <option value="Facultad Seccional Chiquinquirá" className="bg-surface">Facultad Seccional Chiquinquirá</option>
            </select>
            <ChevronDown size={14} className="text-on-surface-variant ml-2" />
          </div>

          <div className="glass-card px-4 py-2 rounded-xl flex items-center gap-2 cursor-pointer hover:bg-white/5 transition-colors">
            <Filter size={16} className="text-secondary-container" />
            <select className="bg-transparent text-white text-sm outline-none cursor-pointer appearance-none" value={selectedResource} onChange={(e) => setSelectedResource(e.target.value)}>
              <option value="Todos" className="bg-surface">Todos los Recursos</option>
              <option value="R10" className="bg-surface">R10 - Nación</option>
              <option value="R20" className="bg-surface">R20 - Propios</option>
            </select>
            <ChevronDown size={14} className="text-on-surface-variant ml-2" />
          </div>

          <button className="glass-card px-4 py-2 rounded-xl text-white hover:bg-white/10 transition-colors flex items-center gap-2">
            <Download size={16} />
            <span className="text-sm">Exportar</span>
          </button>
        </div>
      </div>

      {/* NIVEL 1: KPIs EJECUTIVOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Ingresos */}
        <div className="glass-card p-5 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all"></div>
          <p className="text-sm text-on-surface-variant mb-1 flex items-center gap-2">
            <TrendingUp size={16} className="text-emerald-400" /> Ingresos Proyectados
          </p>
          <p className="text-3xl font-display text-white">{formatCurrencyShort(totalIncome)}</p>
          <div className="mt-3 flex items-center gap-2 text-xs">
            <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded flex items-center gap-1">
              <ArrowUpRight size={12} /> 4.2%
            </span>
            <span className="text-on-surface-variant">vs. periodo anterior</span>
          </div>
        </div>

        {/* Gastos */}
        <div className="glass-card p-5 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-red-500/10 rounded-full blur-2xl group-hover:bg-red-500/20 transition-all"></div>
          <p className="text-sm text-on-surface-variant mb-1 flex items-center gap-2">
            <TrendingDown size={16} className="text-red-400" /> Gastos Proyectados
          </p>
          <p className="text-3xl font-display text-white">{formatCurrencyShort(totalExpense)}</p>
          <div className="mt-3 flex items-center gap-2 text-xs">
            <span className="bg-red-500/20 text-red-300 px-2 py-0.5 rounded flex items-center gap-1">
              <ArrowUpRight size={12} /> 8.1%
            </span>
            <span className="text-on-surface-variant">vs. periodo anterior</span>
          </div>
        </div>

        {/* Flujo Neto */}
        <div className="glass-card p-5 rounded-2xl relative overflow-hidden group">
          <div className={`absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full blur-2xl transition-all ${netFlowTotal >= 0 ? 'bg-blue-500/10 group-hover:bg-blue-500/20' : 'bg-orange-500/10 group-hover:bg-orange-500/20'}`}></div>
          <p className="text-sm text-on-surface-variant mb-1 flex items-center gap-2">
            <Activity size={16} className={netFlowTotal >= 0 ? "text-blue-400" : "text-orange-400"} /> Flujo Neto (Caja)
          </p>
          <p className={`text-3xl font-display ${netFlowTotal >= 0 ? 'text-blue-400' : 'text-orange-400'}`}>
            {formatCurrencyShort(netFlowTotal)}
          </p>
          <div className="mt-3 flex items-center gap-2 text-xs">
            <span className="text-on-surface-variant">
              Déficit operativo cubierto con saldos iniciales.
            </span>
          </div>
        </div>

        {/* Saldo Final */}
        <div className="glass-card p-5 rounded-2xl relative overflow-hidden group border border-primary-container/20">
          <div className="absolute inset-0 bg-gradient-to-br from-primary-container/5 to-transparent"></div>
          <p className="text-sm text-on-surface-variant mb-1 flex items-center gap-2 relative z-10">
            <Wallet size={16} className="text-primary-container" /> Saldo Final Estimado
          </p>
          <p className="text-3xl font-display text-white relative z-10">{formatCurrencyShort(finalBalance)}</p>
          <div className="mt-3 flex items-center justify-between text-xs relative z-10">
            <span className="text-on-surface-variant">Saldo inicial: {formatCurrencyShort(initialBalance)}</span>
            <span className={finalBalance >= initialBalance ? "text-emerald-400" : "text-orange-400"}>
              {finalBalance >= initialBalance ? '▲' : '▼'}
            </span>
          </div>
        </div>
      </div>

      {/* ALERTAS INTELIGENTES */}
      <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex gap-3">
          <AlertTriangle className="text-red-400 shrink-0 mt-0.5" size={20} />
          <div>
            <h4 className="text-red-300 font-bold text-sm">Alerta Crítica: Presión Jun/Dic</h4>
            <p className="text-xs text-red-200/70 mt-1 leading-relaxed">El pago de primas en junio y diciembre genera un flujo neto negativo superior a $10.000M. Requiere apalancamiento del saldo inicial.</p>
          </div>
        </div>
        <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 flex gap-3">
          <AlertCircle className="text-orange-400 shrink-0 mt-0.5" size={20} />
          <div>
            <h4 className="text-orange-300 font-bold text-sm">Atención: Crecimiento del Gasto</h4>
            <p className="text-xs text-orange-200/70 mt-1 leading-relaxed">Los gastos de funcionamiento presentan una variación intermensual anormal del +12% proyectado hacia el cierre de vigencia.</p>
          </div>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex gap-3">
          <CheckCircle className="text-emerald-400 shrink-0 mt-0.5" size={20} />
          <div>
            <h4 className="text-emerald-300 font-bold text-sm">Liquidez Estable</h4>
            <p className="text-xs text-emerald-200/70 mt-1 leading-relaxed">A pesar de los déficits mensuales, el saldo acumulado proyectado se mantiene positivo en todo el ciclo fiscal.</p>
          </div>
        </div>
      </div>

      {/* BLOQUE PRINCIPAL: COMPORTAMIENTO MENSUAL Y SALDO */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
        
        {/* Gráfico Principal Combinado */}
        <div className="glass-card p-6 rounded-[24px] xl:col-span-2 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-display text-white">Dinámica de Caja: Ingresos vs Gastos vs Flujo</h2>
              <p className="text-sm text-on-surface-variant">Comportamiento mensual y puntos de inflexión.</p>
            </div>
            <button className="text-on-surface-variant hover:text-white transition-colors">
              <Maximize2 size={18} />
            </button>
          </div>
          
          <div className="h-[350px] w-full mt-auto">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={monthlyData} margin={{ top: 20, right: 20, left: 20, bottom: 0 }}>
                <defs>
                  <linearGradient id="netFlowGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="month" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis 
                  yAxisId="left"
                  stroke="#94a3b8" 
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickFormatter={(val) => formatCurrencyShort(val)}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  stroke="#94a3b8" 
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickFormatter={(val) => formatCurrencyShort(val)}
                />
                <RechartsTooltip 
                  formatter={(value: number, name: string) => {
                    let label = name;
                    if(name === 'income') label = 'Ingresos';
                    if(name === 'expense') label = 'Gastos';
                    if(name === 'netFlow') label = 'Flujo Neto';
                    return [formatCurrency(value), label];
                  }}
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', color: '#fff', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)' }}
                  labelStyle={{ color: '#94a3b8', marginBottom: '8px', fontWeight: 'bold' }}
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                
                {/* Flujo Neto como Área en el eje secundario */}
                <Area yAxisId="right" type="monotone" dataKey="netFlow" name="Flujo Neto" fill="url(#netFlowGrad)" stroke="#38bdf8" strokeWidth={2} />
                
                {/* Ingresos y Gastos como Líneas principales */}
                <Line yAxisId="left" type="monotone" dataKey="income" name="Ingresos" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#1e293b' }} activeDot={{ r: 6 }} />
                <Line yAxisId="left" type="monotone" dataKey="expense" name="Gastos" stroke="#f43f5e" strokeWidth={3} dot={{ r: 4, fill: '#f43f5e', strokeWidth: 2, stroke: '#1e293b' }} activeDot={{ r: 6 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Evolución del Saldo Acumulado */}
        <div className="glass-card p-6 rounded-[24px] flex flex-col">
          <div className="mb-6">
            <h2 className="text-xl font-display text-white">Evolución de Saldo</h2>
            <p className="text-sm text-on-surface-variant">Disponibilidad acumulada en caja.</p>
          </div>
          <div className="h-[300px] w-full mt-auto relative">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="month" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis 
                  stroke="#94a3b8" 
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickFormatter={(val) => formatCurrencyShort(val)}
                  domain={['auto', 'auto']}
                />
                <RechartsTooltip 
                  formatter={(value: number) => [formatCurrency(value), 'Saldo Final']}
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px' }}
                />
                <Area type="monotone" dataKey="finalBalance" name="Saldo Acumulado" stroke="#f59e0b" strokeWidth={3} fill="url(#balanceGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* COMPOSICIÓN Y DESTINACIÓN */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        
        {/* Desagregación Gastos (Barras apiladas) */}
        <div className="glass-card p-6 rounded-[24px]">
          <div className="mb-6">
            <h2 className="text-xl font-display text-white">Estructura del Gasto Mensual</h2>
            <p className="text-sm text-on-surface-variant">Clasificación por macro-categoría presupuestal.</p>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="month" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={(val) => formatCurrencyShort(val)} />
                <RechartsTooltip 
                  formatter={(value: number, name: string) => [formatCurrency(value), name]}
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                />
                <Legend />
                <Bar dataKey="gPersonal" name="Personal" stackId="a" fill="#3b82f6" radius={[0, 0, 4, 4]} />
                <Bar dataKey="gFuncionamiento" name="Funcionamiento" stackId="a" fill="#8b5cf6" />
                <Bar dataKey="gInversion" name="Inversión" stackId="a" fill="#ec4899" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Mapa de Destinación de Recursos (Sankey / Treemap simulation) */}
        <div className="glass-card p-6 rounded-[24px]">
          <div className="mb-6">
            <h2 className="text-xl font-display text-white">Mapa de Destinación de Recursos</h2>
            <p className="text-sm text-on-surface-variant">Trazabilidad desde el origen hasta el uso de fondos.</p>
          </div>
          <div className="h-[300px] w-full flex items-center justify-center bg-surface-container-low rounded-xl border border-white/5 relative overflow-hidden">
            {/* Fallback to simple visualization since Recharts Sankey requires strict node/link structuring that is sometimes finicky in React without extra plugins, we will render a custom visual flow */}
            <div className="absolute inset-0 flex flex-col justify-center p-6 gap-6">
              <div className="flex justify-between items-center">
                
                {/* ORIGENES */}
                <div className="flex flex-col gap-4 w-[30%]">
                  <div className="bg-emerald-500/20 border border-emerald-500/30 p-3 rounded-lg text-center relative">
                    <span className="text-xs text-emerald-300 font-bold block mb-1">Aporte Nación</span>
                    <span className="text-sm font-mono text-white">{formatCurrencyShort(totalIncome * 0.7)}</span>
                    <div className="absolute right-0 top-1/2 w-8 h-[2px] bg-emerald-500/30 -mr-8"></div>
                  </div>
                  <div className="bg-blue-500/20 border border-blue-500/30 p-3 rounded-lg text-center relative">
                    <span className="text-xs text-blue-300 font-bold block mb-1">Recursos Propios</span>
                    <span className="text-sm font-mono text-white">{formatCurrencyShort(totalIncome * 0.3)}</span>
                    <div className="absolute right-0 top-1/2 w-8 h-[2px] bg-blue-500/30 -mr-8"></div>
                  </div>
                </div>

                {/* CENTRO */}
                <div className="w-[30%] flex justify-center relative">
                  <div className="w-24 h-24 rounded-full bg-primary-container/20 border-4 border-primary-container/30 flex items-center justify-center flex-col shadow-[0_0_30px_rgba(255,204,41,0.2)] z-10">
                    <Coins className="text-primary-container mb-1" size={24} />
                    <span className="text-[10px] uppercase font-bold text-primary-container tracking-wider">Caja Total</span>
                  </div>
                </div>

                {/* DESTINOS */}
                <div className="flex flex-col gap-3 w-[35%]">
                  <div className="bg-fuchsia-500/20 border border-fuchsia-500/30 p-2 rounded-lg relative">
                    <div className="absolute left-0 top-1/2 w-8 h-[2px] bg-fuchsia-500/30 -ml-8"></div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-fuchsia-300">Personal</span>
                      <span className="text-xs font-mono text-white">{formatCurrencyShort(totalExpense * 0.65)}</span>
                    </div>
                  </div>
                  <div className="bg-purple-500/20 border border-purple-500/30 p-2 rounded-lg relative">
                    <div className="absolute left-0 top-1/2 w-8 h-[2px] bg-purple-500/30 -ml-8"></div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-purple-300">Funcionamiento</span>
                      <span className="text-xs font-mono text-white">{formatCurrencyShort(totalExpense * 0.25)}</span>
                    </div>
                  </div>
                  <div className="bg-pink-500/20 border border-pink-500/30 p-2 rounded-lg relative">
                    <div className="absolute left-0 top-1/2 w-8 h-[2px] bg-pink-500/30 -ml-8"></div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-pink-300">Inversión</span>
                      <span className="text-xs font-mono text-white">{formatCurrencyShort(totalExpense * 0.10)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* HEATMAP / DATA TABLE (Nivel Operativo) */}
      <div className="glass-card p-6 rounded-[24px] overflow-hidden flex flex-col">
        <div className="mb-6 flex justify-between items-end">
          <div>
            <h2 className="text-xl font-display text-white">Matriz de Concentración del Gasto (Heatmap)</h2>
            <p className="text-sm text-on-surface-variant">Intensidad de ejecución por rubro y mes.</p>
          </div>
          <button className="text-sm text-primary-container hover:underline font-bold">Ver Tabla Completa</button>
        </div>
        
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[800px] text-sm text-left">
            <thead>
              <tr className="border-b border-white/10 text-on-surface-variant">
                <th className="py-3 px-4 font-medium sticky left-0 bg-[#0f172a] z-10 w-48">Rubro Presupuestal</th>
                {MONTHS.map(m => (
                  <th key={m} className="py-3 px-2 font-medium text-center">{m}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {heatmapData.map((row, idx) => (
                <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                  <td className="py-3 px-4 font-medium text-white sticky left-0 bg-[#0f172a] group-hover:bg-[#1e293b] transition-colors">{row.rubro}</td>
                  {row.data.map((val, i) => {
                    // Calculate intensity based on value vs max in row
                    const max = Math.max(...row.data);
                    const intensity = val / max; // 0 to 1
                    
                    // Colors based on rubro for visual distinction
                    let colorBase = '56, 189, 248'; // blue
                    if (idx === 1) colorBase = '244, 63, 94'; // red (primas)
                    if (idx >= 2) colorBase = '139, 92, 246'; // purple (funcionamiento)

                    return (
                      <td key={i} className="py-2 px-1 text-center">
                        <div 
                          className="w-full h-8 rounded flex items-center justify-center text-[10px] font-mono cursor-pointer hover:ring-2 hover:ring-white/50 transition-all"
                          style={{ 
                            backgroundColor: `rgba(${colorBase}, ${intensity * 0.8 + 0.1})`,
                            color: intensity > 0.5 ? '#fff' : 'rgba(255,255,255,0.7)'
                          }}
                          title={`Valor: ${formatCurrency(val)}`}
                        >
                          {formatCurrencyShort(val)}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>


      {/* TABLA DE BALANCE Y DETALLE (Con Despliegue de Recursos) */}
      <div className="glass-card p-6 rounded-[24px] overflow-hidden flex flex-col mt-8">
        <div className="mb-6 flex justify-between items-end">
          <div>
            <h2 className="text-xl font-display text-white">Balance Mensual y Detalle de Recursos</h2>
            <p className="text-sm text-on-surface-variant">Clic en un mes para ver la composición por tipo de gasto y recurso.</p>
          </div>
          <button className="glass-card px-4 py-2 rounded-xl text-white hover:bg-white/10 transition-colors flex items-center gap-2">
            <Download size={16} /> <span className="text-sm">XLSX</span>
          </button>
        </div>
        
        <div className="w-full overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-on-surface-variant bg-white/5">
                <th className="py-3 px-4 font-medium w-10"></th>
                <th className="py-3 px-4 font-medium">Mes</th>
                <th className="py-3 px-4 font-medium text-right">Personal</th>
                <th className="py-3 px-4 font-medium text-right">Funcionamiento</th>
                <th className="py-3 px-4 font-medium text-right">Inversión</th>
                <th className="py-3 px-4 font-medium text-right text-red-300">Total Gastos</th>
                <th className="py-3 px-4 font-medium text-right text-emerald-300">Total Ingresos</th>
                <th className="py-3 px-4 font-medium text-right text-blue-300">Flujo Neto</th>
              </tr>
            </thead>
            <tbody>
              {monthlyData.map((row, idx) => (
                <React.Fragment key={idx}>
                  <tr 
                    className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
                    onClick={() => setExpandedMonth(expandedMonth === row.month ? null : row.month)}
                  >
                    <td className="py-3 px-4 text-center text-on-surface-variant">
                      {expandedMonth === row.month ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </td>
                    <td className="py-3 px-4 font-bold text-white">{row.month}</td>
                    <td className="py-3 px-4 text-right text-on-surface-variant">{formatCurrencyShort(row.gPersonal)}</td>
                    <td className="py-3 px-4 text-right text-on-surface-variant">{formatCurrencyShort(row.gFuncionamiento)}</td>
                    <td className="py-3 px-4 text-right text-on-surface-variant">{formatCurrencyShort(row.gInversion)}</td>
                    <td className="py-3 px-4 text-right text-red-300 font-medium">{formatCurrencyShort(row.expense)}</td>
                    <td className="py-3 px-4 text-right text-emerald-300 font-medium">{formatCurrencyShort(row.income)}</td>
                    <td className={`py-3 px-4 text-right font-bold ${row.netFlow >= 0 ? 'text-blue-400' : 'text-orange-400'}`}>
                      {formatCurrencyShort(row.netFlow)}
                    </td>
                  </tr>
                  
                  {/* EXPANDED ROW (Recursos) */}
                  {expandedMonth === row.month && (
                    <tr className="bg-black/20 border-b border-primary-container/20">
                      <td colSpan={8} className="p-0">
                        <div className="p-4 pl-14">
                          <h4 className="text-xs uppercase tracking-widest text-primary-container mb-3 font-bold flex items-center gap-2">
                            <Target size={14} /> Desagregación por Recursos - {row.month}
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-sm text-emerald-200">Aporte Nación (R10)</span>
                                <span className="text-sm font-bold text-white">{formatCurrencyShort(row.rNacion)}</span>
                              </div>
                              <div className="w-full bg-surface-container h-1.5 rounded-full overflow-hidden">
                                <div className="bg-emerald-400 h-full" style={{ width: `${(row.rNacion / row.income) * 100}%` }}></div>
                              </div>
                            </div>
                            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-sm text-blue-200">Recursos Propios (R20/R31)</span>
                                <span className="text-sm font-bold text-white">{formatCurrencyShort(row.rPropios)}</span>
                              </div>
                              <div className="w-full bg-surface-container h-1.5 rounded-full overflow-hidden">
                                <div className="bg-blue-400 h-full" style={{ width: `${(row.rPropios / row.income) * 100}%` }}></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
