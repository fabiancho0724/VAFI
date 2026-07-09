import { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ComposedChart, Line
} from 'recharts';
import { Filter, DollarSign, Activity, TrendingUp, Briefcase, RefreshCw, Layers } from 'lucide-react';
import { loadFinancialData, FinancialData } from '../lib/dataTransform';
import { RECURSOS_FINANCIEROS, TIPOS_GASTO } from '../lib/constants';

const COLORS = ['#ffcc29', '#4ade80', '#7bd0ff', '#f43f5e', '#d0bcff', '#ff9f43'];

export function PredictiveScreen({ onNavigate }: { onNavigate: (s: string) => void }) {
  const [dataStage, setDataStage] = useState<'loading' | 'ready'>('loading');
  const [data, setData] = useState<FinancialData | null>(null);
  
  // Filters
  const [filtroRecurso, setFiltroRecurso] = useState<string>('Todos');
  const [filtroMes, setFiltroMes] = useState<string>('Todos');

  // Simulation State
  const [simIngresos, setSimIngresos] = useState<Record<string, number>>({});
  const [simGastos, setSimGastos] = useState<Record<string, number>>({});

  useEffect(() => {
    async function init() {
      try {
        const financialData = await loadFinancialData();
        setData(financialData);
        
        // Init simulation with base values
        const initIng: Record<string, number> = {};
        RECURSOS_FINANCIEROS.forEach(r => {
           initIng[r.codigo] = financialData.ingresosPorRecurso[r.codigo] || 0;
        });
        setSimIngresos(initIng);

        const initGas: Record<string, number> = {};
        TIPOS_GASTO.forEach(t => {
           initGas[t] = financialData.gastosPorTipo[t] || 0;
        });
        setSimGastos(initGas);

      } catch (err) {
        console.error("Error loading financial data:", err);
      } finally {
        setDataStage('ready');
      }
    }
    init();
  }, []);

  const resetSimulation = () => {
    if (!data) return;
    const initIng: Record<string, number> = {};
    RECURSOS_FINANCIEROS.forEach(r => initIng[r.codigo] = data.ingresosPorRecurso[r.codigo] || 0);
    setSimIngresos(initIng);

    const initGas: Record<string, number> = {};
    TIPOS_GASTO.forEach(t => initGas[t] = data.gastosPorTipo[t] || 0);
    setSimGastos(initGas);
  };

  // Computed metrics based on simulation & filters
  const { 
    ingresoTotal, 
    gastoTotal, 
    resultadoNeto,
    flujoSimulado,
    gastosTipoData
  } = useMemo(() => {
    if (!data) return { ingresoTotal: 0, gastoTotal: 0, resultadoNeto: 0, flujoSimulado: [], gastosTipoData: [] };

    let iTotal = 0;
    let gTotal = 0;

    if (filtroRecurso === 'Todos') {
      iTotal = Object.values(simIngresos).reduce((a, b) => a + b, 0);
      gTotal = Object.values(simGastos).reduce((a, b) => a + b, 0);
    } else {
      iTotal = simIngresos[filtroRecurso] || 0;
      // Proporcional expenditure based on resource logic if available, otherwise just scale it
      const ratio = (data.gastosPorRecurso[filtroRecurso] || 0) / (data.gastosTotales || 1);
      gTotal = Object.values(simGastos).reduce((a, b) => a + b, 0) * ratio;
    }

    const resNeto = iTotal - gTotal;

    // Distribute simulated over months
    const iRatio = iTotal / (data.ingresosTotales || 1);
    const gRatio = gTotal / (data.gastosTotales || 1);

    let saldo = 0;
    const flujoSim = data.flujoMensual.map(m => {
      const simI = m.ingreso * iRatio;
      const simG = m.gasto * gRatio;
      saldo += (simI - simG);
      return {
        mes: m.mes,
        ingreso: parseFloat((simI / 1e6).toFixed(1)),
        gasto: parseFloat((simG / 1e6).toFixed(1)),
        saldo: parseFloat((saldo / 1e6).toFixed(1))
      };
    });

    const gTipoData = Object.entries(simGastos).map(([name, value]) => ({
       name,
       value: parseFloat((value / 1e6).toFixed(1))
    })).filter(x => x.value > 0);

    return {
      ingresoTotal: iTotal,
      gastoTotal: gTotal,
      resultadoNeto: resNeto,
      flujoSimulado: flujoSim,
      gastosTipoData: gTipoData
    };
  }, [data, simIngresos, simGastos, filtroRecurso, filtroMes]);


  if (dataStage === 'loading' || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <div className="w-12 h-12 border-4 border-primary-container border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-on-surface-variant font-mono animate-pulse">Cargando Modelo Financiero Institucional...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col mb-20 max-w-7xl mx-auto px-4 md:px-0 text-white">
      {/* Header and Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
        <div>
          <p className="text-primary-container text-xs uppercase tracking-widest font-bold mb-1">MÓDULO DE PLANEACIÓN</p>
          <h2 className="text-3xl md:text-4xl font-bold font-display text-white">Proyección Financiera</h2>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center bg-white/5 rounded-xl border border-white/10 px-3 py-1.5 hover:bg-white/10 transition-colors">
            <Filter size={16} className="text-on-surface-variant mr-2" />
            <select 
               className="bg-transparent text-sm text-white outline-none font-mono cursor-pointer"
               value={filtroRecurso}
               onChange={(e) => setFiltroRecurso(e.target.value)}
            >
               <option value="Todos" className="bg-[#0f172a]">Todos los Recursos</option>
               {RECURSOS_FINANCIEROS.map(r => (
                  <option key={r.codigo} value={r.codigo} className="bg-[#0f172a]">
                    {r.nombre.length > 50 ? r.nombre.substring(0, 50) + '...' : r.nombre}
                  </option>
               ))}
            </select>
          </div>
          
          <button onClick={resetSimulation} className="flex items-center px-4 py-1.5 bg-white/10 border border-white/20 rounded-xl hover:bg-white/20 transition text-sm font-mono gap-2">
             <RefreshCw size={14} /> Restaurar Simulación
          </button>
        </div>
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
         {[
           { title: 'Ingresos Proyectados', val: ingresoTotal, icon: TrendingUp, color: 'text-[#4ade80]', border: 'border-l-[#4ade80]' },
           { title: 'Gastos Proyectados', val: gastoTotal, icon: Briefcase, color: 'text-[#f43f5e]', border: 'border-l-[#f43f5e]' },
           { title: 'Resultado Neto', val: resultadoNeto, icon: Activity, color: resultadoNeto >= 0 ? 'text-[#ffcc29]' : 'text-red-400', border: 'border-l-[#ffcc29]' },
           { title: 'Punto Equilibrio (Cobertura)', val: (ingresoTotal/gastoTotal)*100 || 0, isPercent: true, icon: Layers, color: 'text-[#7bd0ff]', border: 'border-l-[#7bd0ff]' }
         ].map((kpi, i) => (
            <div key={i} className={`glass-card rounded-[24px] p-6 border-l-4 ${kpi.border} relative overflow-hidden group`}>
               <div className="flex justify-between items-start mb-4">
                  <h4 className="text-xs font-mono text-on-surface-variant uppercase tracking-widest">{kpi.title}</h4>
                  <kpi.icon size={18} className={`${kpi.color} opacity-80`} />
               </div>
               <div className="flex items-baseline gap-2">
                  <span className={`text-3xl font-display font-bold ${kpi.color}`}>
                     {kpi.isPercent 
                       ? `${kpi.val.toFixed(1)}%`
                       : `$${(kpi.val / 1e6).toLocaleString('es-CO', {maximumFractionDigits: 1})}`}
                  </span>
                  {!kpi.isPercent && <span className="text-[10px] font-mono text-on-surface-variant">mill</span>}
               </div>
            </div>
         ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        
        {/* Simulator Panel */}
        <div className="glass-card rounded-[32px] p-6 lg:p-8 flex flex-col min-h-[500px]">
           <h3 className="text-xl font-display font-medium text-white mb-6 border-b border-white/10 pb-4">
             Simulador de Escenarios
           </h3>
           
           <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6">
              
              <div>
                 <h4 className="text-sm font-bold text-primary-container uppercase tracking-widest mb-4 flex items-center gap-2">
                   <TrendingUp size={16} /> Ajuste de Ingresos (Millones)
                 </h4>
                 {RECURSOS_FINANCIEROS.map(r => {
                    const original = (data.ingresosPorRecurso[r.codigo] || 0) / 1e6;
                    const simulated = (simIngresos[r.codigo] || 0) / 1e6;
                    // Only show resources that have historical data to avoid clutter
                    if (original === 0) return null;

                    return (
                      <div key={r.codigo} className="mb-4">
                         <div className="flex justify-between text-xs mb-1 font-mono">
                            <span className="text-on-surface-variant truncate w-40" title={r.nombre}>{r.nombre}</span>
                            <span className={simulated !== original ? 'text-primary-container font-bold' : 'text-white'}>
                              ${simulated.toLocaleString('es-CO', {maximumFractionDigits:1})}
                            </span>
                         </div>
                         <input 
                            type="range" 
                            min="0" max={original * 2 || 1000} step={original * 0.05 || 1}
                            value={simulated}
                            onChange={(e) => setSimIngresos({...simIngresos, [r.codigo]: parseFloat(e.target.value) * 1e6})}
                            className="w-full accent-[#4ade80] h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                         />
                      </div>
                    )
                 })}
              </div>

              <div className="border-t border-white/10 pt-6">
                 <h4 className="text-sm font-bold text-[#f43f5e] uppercase tracking-widest mb-4 flex items-center gap-2">
                   <Briefcase size={16} /> Ajuste de Gastos (Millones)
                 </h4>
                 {TIPOS_GASTO.map(t => {
                    const original = (data.gastosPorTipo[t] || 0) / 1e6;
                    const simulated = (simGastos[t] || 0) / 1e6;
                    if (original === 0) return null;

                    return (
                      <div key={t} className="mb-4">
                         <div className="flex justify-between text-xs mb-1 font-mono">
                            <span className="text-on-surface-variant truncate w-40">{t}</span>
                            <span className={simulated !== original ? 'text-primary-container font-bold' : 'text-white'}>
                              ${simulated.toLocaleString('es-CO', {maximumFractionDigits:1})}
                            </span>
                         </div>
                         <input 
                            type="range" 
                            min="0" max={original * 2 || 1000} step={original * 0.05 || 1}
                            value={simulated}
                            onChange={(e) => setSimGastos({...simGastos, [t]: parseFloat(e.target.value) * 1e6})}
                            className="w-full accent-[#f43f5e] h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                         />
                      </div>
                    )
                 })}
              </div>
           </div>
        </div>

        {/* Charts Column */}
        <div className="lg:col-span-2 flex flex-col gap-8">
           
           {/* Cash Flow Area Chart */}
           <div className="glass-card rounded-[32px] p-6 lg:p-8 flex-1 min-h-[350px]">
             <h3 className="text-xl font-display font-medium text-white mb-6">Flujo de Caja Mensual (Simulado)</h3>
             <div className="w-full h-64">
               <ResponsiveContainer width="100%" height="100%">
                 <ComposedChart data={flujoSimulado} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                   <defs>
                      <linearGradient id="colorIngreso" x1="0" y1="0" x2="0" y2="1">
                         <stop offset="5%" stopColor="#4ade80" stopOpacity={0.3}/>
                         <stop offset="95%" stopColor="#4ade80" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorGasto" x1="0" y1="0" x2="0" y2="1">
                         <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                         <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                      </linearGradient>
                   </defs>
                   <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                   <XAxis dataKey="mes" stroke="#94a3b8" className="text-[10px] font-mono" tickLine={false} axisLine={false} />
                   <YAxis stroke="#94a3b8" className="text-[10px] font-mono" tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                   <Tooltip 
                      contentStyle={{ backgroundColor: 'rgba(15,23,42,0.9)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                      itemStyle={{ fontSize: '12px', fontFamily: 'monospace' }}
                      formatter={(val: number) => `$${val.toLocaleString()}M`}
                   />
                   <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }} />
                   <Area type="monotone" dataKey="ingreso" name="Ingresos" stroke="#4ade80" fill="url(#colorIngreso)" strokeWidth={2} />
                   <Area type="monotone" dataKey="gasto" name="Gastos" stroke="#f43f5e" fill="url(#colorGasto)" strokeWidth={2} />
                   <Line type="monotone" dataKey="saldo" name="Saldo Acum." stroke="#ffcc29" strokeWidth={3} dot={{r:4, fill:'#1e293b', strokeWidth:2}} />
                 </ComposedChart>
               </ResponsiveContainer>
             </div>
           </div>

           {/* Expense Breakdown Pie Chart */}
           <div className="glass-card rounded-[32px] p-6 lg:p-8 flex-1 min-h-[300px] flex flex-col md:flex-row items-center gap-8">
             <div className="flex-1 w-full h-56">
                <h3 className="text-lg font-display font-medium text-white mb-2 text-center md:text-left">Composición de Gastos</h3>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={gastosTipoData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
                       {gastosTipoData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                       ))}
                    </Pie>
                    <Tooltip 
                       contentStyle={{ backgroundColor: 'rgba(15,23,42,0.9)', border: 'none', borderRadius: '8px' }}
                       formatter={(val: number) => `$${val.toLocaleString()}M`}
                    />
                  </PieChart>
                </ResponsiveContainer>
             </div>
             
             <div className="flex-1 w-full space-y-3 font-mono text-xs">
                {gastosTipoData.map((g, i) => (
                   <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                         <div className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS[i % COLORS.length]}}></div>
                         <span className="text-on-surface-variant truncate max-w-[120px]" title={g.name}>{g.name}</span>
                      </div>
                      <span className="font-bold text-white">${g.value.toLocaleString()}M</span>
                   </div>
                ))}
             </div>
           </div>

        </div>
      </div>
    </div>
  );
}
