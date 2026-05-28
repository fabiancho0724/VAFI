import { useState, useEffect, useMemo } from 'react';
import { BrainCircuit, Filter, BarChart as BarChartIcon, Settings, TrendingUp, Activity, PieChart as PieChartIcon } from 'lucide-react';
import { BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { fetchAndParseCSV } from '../lib/csvParser';

const MONTHS_STR = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export function PredictiveScreen({ onNavigate }: { onNavigate: (s: string) => void }) {
  const [dataStage, setDataStage] = useState<'loading' | 'ready'>('loading');
  const [rawYearlyData, setRawYearlyData] = useState<Record<number, any[]>>({});
  
  const [filterRecurso, setFilterRecurso] = useState<string>('Todos');
  const [filterMes, setFilterMes] = useState<string>('Todos');
  const [growthRate, setGrowthRate] = useState<number>(5); // Default 5%
  const [baseYear, setBaseYear] = useState<number>(2026); // To dynamically point to current year

  useEffect(() => {
    async function loadData() {
      try {
        const years = [2023, 2024, 2025, 2026];
        const loadedData: Record<number, any[]> = {};
        
        await Promise.all(years.map(async (year) => {
          try {
            const rows = await fetchAndParseCSV(`https://raw.githubusercontent.com/fabiancho0724/VAFI-Reporte-Financiero/main/Ingreso%20Mensual%20${year}.csv`);
            if (rows && rows.length > 0) {
              loadedData[year] = rows;
            }
          } catch (e) {
            console.error(`Error loading ${year}:`, e);
          }
        }));
        
        setRawYearlyData(loadedData);
        setDataStage('ready');
      } catch (err) {
        console.error(err);
        setDataStage('ready');
      }
    }
    loadData();
  }, []);

  const filterColumnName = useMemo(() => {
    if (rawYearlyData[2026] && rawYearlyData[2026].length > 0) {
       const keys = Object.keys(rawYearlyData[2026][0]);
       const recursoKey = keys.find(k => k.toLowerCase().includes('recurso') || k.toLowerCase().includes('rubro') || k.toLowerCase().includes('concepto'));
       if (recursoKey) return recursoKey;
       
       // Fallbacks if named something else, let's filter out code looking columns
       for(const k of keys) {
           const val = String(rawYearlyData[2026][0][k]);
           if (val && !val.match(/^[0-9.]+$/) && typeof val === 'string') {
               if (k.toLowerCase() !== 'mes' && k.toLowerCase() !== 'fecha') {
                   return k;
               }
           }
       }
       return keys[2]; 
    }
    return 'Concepto';
  }, [rawYearlyData]);

  // Extract unique resources from 2026 data
  const availableRecursos = useMemo(() => {
    if (!rawYearlyData[2026] || rawYearlyData[2026].length === 0) return [];
    
    const keys = Object.keys(rawYearlyData[2026][0]);
    const conceptoCol = keys.find(k => k.toLowerCase().includes('concepto')) || keys[4] || 'Concepto';

    const map = new Map<string, string>();
    rawYearlyData[2026].forEach(r => {
      const recValue = r[filterColumnName];
      const conceptValue = r[conceptoCol];
      if (recValue) {
        if (!map.has(String(recValue))) {
          // Si el concepto ya incluye el número o es muy largo
          const label = conceptValue ? `${recValue} - ${conceptValue}` : String(recValue);
          map.set(String(recValue), label);
        }
      }
    });

    return Array.from(map.entries())
       .map(([value, label]) => ({ value, label }))
       .sort((a, b) => a.value.localeCompare(b.value, undefined, { numeric: true }));
  }, [rawYearlyData, filterColumnName]);

  // Compute projection and totals
  const { projSeries, totalReal, totalProyectado, totalEstimado, histSeries } = useMemo(() => {
    if (Object.keys(rawYearlyData).length === 0) return { projSeries: [], totalReal: 0, totalProyectado: 0, totalEstimado: 0, histSeries: [] };

    const yearlyTotals: Record<number, number[]> = {};
    [2023, 2024, 2025, 2026].forEach(year => {
      const rows = rawYearlyData[year] || [];
      const filteredRows = filterRecurso === 'Todos' ? rows : rows.filter(r => String(r[filterColumnName]) === filterRecurso);
      
      const monthlySum = new Array(12).fill(0);
      if (filteredRows.length > 0) {
        const firstRow = filteredRows[0];
        const monthKeys = Object.keys(firstRow).filter(k => k.trim().toLowerCase().startsWith('valor ')).slice(0, 12);
        
        filteredRows.forEach((row) => {
          monthKeys.forEach((key, i) => {
            const val = String(row[key] || '0').replace(/[^0-9.-]+/g, '');
            monthlySum[i] += parseFloat(val) || 0;
          });
        });
      }
      yearlyTotals[year] = monthlySum;
    });

    const series = [];
    let tReal = 0;
    let tProy = 0;
    const hSeries = [];

    for (let i = 0; i < 12; i++) {
      let sum = 0;
      let count = 0;
      
      if (yearlyTotals[2023] && yearlyTotals[2023][i] > 0) { sum += yearlyTotals[2023][i]; count++; }
      if (yearlyTotals[2024] && yearlyTotals[2024][i] > 0) { sum += yearlyTotals[2024][i]; count++; }
      if (yearlyTotals[2025] && yearlyTotals[2025][i] > 0) { sum += yearlyTotals[2025][i]; count++; }
      
      const average = count > 0 ? sum / count : 0;
      
      let real2026 = 0;
      if (yearlyTotals[2026]) {
        real2026 = yearlyTotals[2026][i] || 0;
      }

      let isReal = real2026 > 0;
      let proy = isReal ? real2026 : average * (1 + growthRate / 100);

      const matchMonth = filterMes === 'Todos' || filterMes === MONTHS_STR[i];

      if (matchMonth) {
        if (isReal) tReal += proy;
        else tProy += proy;
      }

      series.push({
        name: MONTHS_STR[i],
        real: isReal ? parseFloat((real2026 / 1e6).toFixed(1)) : null,
        proyeccion: !isReal ? parseFloat((proy / 1e6).toFixed(1)) : null,
        isProjected: !isReal
      });

      hSeries.push({
        name: MONTHS_STR[i],
        '2023': yearlyTotals[2023] ? parseFloat((yearlyTotals[2023][i] / 1e6).toFixed(1)) : 0,
        '2024': yearlyTotals[2024] ? parseFloat((yearlyTotals[2024][i] / 1e6).toFixed(1)) : 0,
        '2025': yearlyTotals[2025] ? parseFloat((yearlyTotals[2025][i] / 1e6).toFixed(1)) : 0,
        'Promedio': parseFloat((average / 1e6).toFixed(1))
      });
    }

    return { 
      projSeries: series, 
      totalReal: tReal / 1e6, 
      totalProyectado: tProy / 1e6, 
      totalEstimado: (tReal + tProy) / 1e6,
      histSeries: hSeries
    };
  }, [rawYearlyData, filterRecurso, filterMes, growthRate, filterColumnName]);

  if (dataStage === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <div className="w-12 h-12 border-4 border-primary-container border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-on-surface-variant font-mono animate-pulse">Generando modelo predictivo avanzado...</p>
      </div>
    );
  }

  const chartData = filterMes === 'Todos' ? projSeries : projSeries.filter(p => p.name === filterMes);

  return (
    <div className="flex flex-col mb-20 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <p className="text-[#ffcc29] text-xs uppercase tracking-widest font-bold mb-1">MOTOR DE INFERENCIA V 2.5 - VIGENCIA 2026</p>
          <div className="flex items-center gap-4">
            <h2 className="text-3xl font-bold font-display text-white">Proyección de Ingresos</h2>
            <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-full flex items-center gap-2">
              <BrainCircuit size={14} className="text-[#ffcc29]" />
              <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider">Machine Learning + Ajustes</span>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center bg-white/5 rounded-xl border border-white/10 px-3 py-1.5 focus-within:border-primary-container/50 transition-colors">
            <Filter size={16} className="text-on-surface-variant mr-2 shrink-0" />
            <select 
               className="bg-transparent text-sm text-white outline-none w-48 font-mono truncate"
               value={filterRecurso}
               onChange={(e) => setFilterRecurso(e.target.value)}
            >
               <option value="Todos" className="bg-[#0f172a] text-white">Todos los Recursos</option>
               {availableRecursos.map(r => (
                  <option key={String(r.value)} value={String(r.value)} className="bg-[#0f172a] text-white">
                    {r.label.length > 60 ? r.label.substring(0, 60) + '...' : r.label}
                  </option>
               ))}
            </select>
          </div>

          <div className="flex items-center bg-white/5 rounded-xl border border-white/10 px-3 py-1.5 focus-within:border-primary-container/50 transition-colors">
            <Filter size={16} className="text-on-surface-variant mr-2 shrink-0" />
            <select 
               className="bg-transparent text-sm text-white outline-none w-32 font-mono"
               value={filterMes}
               onChange={(e) => setFilterMes(e.target.value)}
            >
               <option value="Todos" className="bg-[#0f172a] text-white">Todos los Meses</option>
               {MONTHS_STR.map(m => (
                  <option key={m} value={m} className="bg-[#0f172a] text-white">{m}</option>
               ))}
            </select>
          </div>
        </div>
      </div>

      {/* Adjustments Panel */}
      <div className="mb-8 glass-card rounded-[24px] p-6 border border-white/10 flex flex-col sm:flex-row items-center gap-6 justify-between bg-surface-container-low">
        <div className="flex items-center gap-3 text-white">
          <Settings size={20} className="text-secondary" />
          <div>
            <h3 className="font-bold text-sm">Parámetros de Proyección</h3>
            <p className="text-xs text-on-surface-variant">Ajusta la tasa de crecimiento estimada sobre promedios históricos</p>
          </div>
        </div>
        <div className="flex-1 max-w-md w-full flex items-center gap-4">
           <span className="text-sm font-mono text-on-surface-variant whitespace-nowrap">Tasa (%):</span>
           <input 
             type="range" 
             min="-20" 
             max="50" 
             value={growthRate} 
             onChange={(e) => setGrowthRate(parseFloat(e.target.value))}
             className="w-full accent-primary-container"
           />
           <span className="text-sm font-bold text-primary-container w-12 text-right">{growthRate}%</span>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="glass-card rounded-[24px] p-6 relative overflow-hidden group">
           <div className="absolute top-0 left-0 w-1 h-full bg-[#4ade80]"></div>
           <h4 className="text-xs font-mono text-on-surface-variant uppercase tracking-widest mb-2">Ingreso Real Recaudado</h4>
           <div className="flex items-baseline gap-2">
              <span className="text-3xl font-display font-bold text-white">${totalReal.toLocaleString('es-CO', {maximumFractionDigits: 1})}</span>
              <span className="text-[10px] font-mono text-on-surface-variant">mill</span>
           </div>
        </div>

        <div className="glass-card rounded-[24px] p-6 relative overflow-hidden group">
           <div className="absolute top-0 left-0 w-1 h-full bg-[#ffcc29]"></div>
           <h4 className="text-xs font-mono text-[#ffcc29] uppercase tracking-widest mb-2">Ingreso Proyectado</h4>
           <div className="flex items-baseline gap-2">
              <span className="text-3xl font-display font-bold text-[#ffcc29]">${totalProyectado.toLocaleString('es-CO', {maximumFractionDigits: 1})}</span>
              <span className="text-[10px] font-mono text-[#ffcc29]/70">mill</span>
           </div>
        </div>

        <div className="glass-card rounded-[24px] p-6 relative overflow-hidden group">
           <div className="absolute top-0 left-0 w-1 h-full bg-[#7bd0ff]"></div>
           <h4 className="text-xs font-mono text-on-surface-variant uppercase tracking-widest mb-2">Total Estimado Cierre</h4>
           <div className="flex items-baseline gap-2">
              <span className="text-3xl font-display font-bold text-white">${totalEstimado.toLocaleString('es-CO', {maximumFractionDigits: 1})}</span>
              <span className="text-[10px] font-mono text-on-surface-variant">mill</span>
           </div>
        </div>

        <div className="glass-card rounded-[24px] p-6 relative overflow-hidden group flex items-center justify-center flex-col">
           <h4 className="text-xs font-mono text-on-surface-variant uppercase tracking-widest mb-2">Proporción</h4>
           <div className="h-16 w-full relative">
             <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                 <Pie data={[
                   {name: 'Real', value: totalReal, fill: '#4ade80'}, 
                   {name: 'Proyectado', value: totalProyectado, fill: '#ffcc29'}
                 ]} dataKey="value" cx="50%" cy="50%" innerRadius={20} outerRadius={30} paddingAngle={5} stroke="none">
                 </Pie>
                 <Tooltip formatter={(value: number) => `$${value.toLocaleString('es-CO', {maximumFractionDigits: 0})}M`} contentStyle={{backgroundColor:'#000', border:'none'}}/>
               </PieChart>
             </ResponsiveContainer>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Main Projection Chart */}
        <div className="glass-card rounded-[32px] p-8 flex flex-col min-h-[400px]">
          <h3 className="text-xl font-display font-medium text-white mb-6 flex items-center gap-2">
            <BarChartIcon className="text-primary-container" size={20} />
            Modelado Serie de Tiempo (Millones)
          </h3>
          <div className="flex-1 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="currentColor" className="text-xs text-on-surface-variant font-mono" tick={{fill: '#94a3b8'}} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="currentColor" className="text-xs text-on-surface-variant font-mono" tick={{fill: '#94a3b8'}} tickLine={false} axisLine={false} dx={-10} tickFormatter={(v) => `$${v}`} />
                <Tooltip 
                  cursor={{fill: 'rgba(255,255,255,0.05)'}}
                  contentStyle={{ backgroundColor: 'rgba(15,23,42,0.9)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff', fontSize: '12px', fontFamily: 'monospace' }}
                  formatter={(val: number, name: string) => {
                     if (name === 'real') return [`$${val.toLocaleString('es-CO', {maximumFractionDigits:1})}M`, 'Real Recaudado'];
                     return [`$${val.toLocaleString('es-CO', {maximumFractionDigits:1})}M`, 'Proyección'];
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', opacity: 0.8 }} formatter={(val) => val === 'real' ? 'Ingreso Real' : 'Proyección'} />
                <Bar dataKey="real" name="real" fill="#4ade80" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="proyeccion" name="proyeccion" fill="#ffcc29" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Historical Context Chart */}
        <div className="glass-card rounded-[32px] p-8 flex flex-col min-h-[400px]">
          <h3 className="text-xl font-display font-medium text-white mb-6 flex items-center gap-2">
            <TrendingUp className="text-[#7bd0ff]" size={20} />
            Tendencia Histórica Comparada (Millones)
          </h3>
          <div className="flex-1 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={histSeries} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="color23" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#94a3b8" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorPromedio" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7bd0ff" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#7bd0ff" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="currentColor" className="text-xs text-on-surface-variant font-mono" tick={{fill: '#94a3b8'}} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="currentColor" className="text-xs text-on-surface-variant font-mono" tick={{fill: '#94a3b8'}} tickLine={false} axisLine={false} dx={-10} tickFormatter={(v) => `$${v}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(15,23,42,0.9)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff', fontSize: '11px', fontFamily: 'monospace' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', opacity: 0.8 }} />
                <Area type="monotone" dataKey="2023" stroke="#94a3b8" strokeDasharray="5 5" fillOpacity={1} fill="url(#color23)" />
                <Area type="monotone" dataKey="2024" stroke="#d0bcff" strokeDasharray="5 5" fillOpacity={0} />
                <Area type="monotone" dataKey="2025" stroke="#f43f5e" strokeDasharray="5 5" fillOpacity={0} />
                <Area type="monotone" dataKey="Promedio" stroke="#7bd0ff" strokeWidth={3} fillOpacity={1} fill="url(#colorPromedio)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

    </div>
  );
}

