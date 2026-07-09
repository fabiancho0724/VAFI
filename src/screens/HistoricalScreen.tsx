import { useState, useEffect, useMemo } from 'react';
import { ResponsiveContainer, LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell } from 'recharts';
import { Filter, TrendingUp, DollarSign, Calendar, TrendingDown, ArrowUpRight } from 'lucide-react';
import { fetchAndParseCSV } from '../lib/csvParser';
import { getRowResourceCode, getRecursoEquivalence, getResourceFullName } from '../lib/resourceMapper';

const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const DATA_URLS: Record<string, string> = {
  '2023': 'https://raw.githubusercontent.com/fabiancho0724/Nomina/7d0f179b8bbcd3d327235c8e7fe2a4f757424794/Ingreso%20Mensual%202023.csv',
  '2024': 'https://raw.githubusercontent.com/fabiancho0724/Nomina/7d0f179b8bbcd3d327235c8e7fe2a4f757424794/Ingreso%20Mensual%202024.csv',
  '2025': 'https://raw.githubusercontent.com/fabiancho0724/Nomina/7d0f179b8bbcd3d327235c8e7fe2a4f757424794/Ingreso%20Mensual%202025.csv',
  '2026': 'https://raw.githubusercontent.com/fabiancho0724/Nomina/7d0f179b8bbcd3d327235c8e7fe2a4f757424794/Ingreso%20Mensual%202026.csv',
};

const URL_RESUMEN_PIC = 'https://raw.githubusercontent.com/fabiancho0724/VAFI-Reporte-Financiero/main/Resumen%20PIC.csv';

interface HistoricalScreenProps {
  onNavigate: (screen: string) => void;
}

export function HistoricalScreen({ onNavigate }: HistoricalScreenProps) {
  const [dataSources, setDataSources] = useState<Record<string, any[]>>({});
  const [picData, setPicData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedResources, setSelectedResources] = useState<string[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  useEffect(() => {
    const loadAllData = async () => {
      try {
        setLoading(true);
        const results: Record<string, any[]> = {};
        for (const [year, url] of Object.entries(DATA_URLS)) {
          results[year] = await fetchAndParseCSV(url);
        }
        setDataSources(results);

        const picParsed = await fetchAndParseCSV(URL_RESUMEN_PIC);
        setPicData(picParsed);
      } catch (err: any) {
        setError(err.message || 'Error loading historical data');
      } finally {
        setLoading(false);
      }
    };
    loadAllData();
  }, []);

  // Process and consolidate data
  const { allResources, compiledData, totalByYear, aggregatedResourceStats } = useMemo(() => {
    if (!dataSources || Object.keys(dataSources).length === 0) {
      return { allResources: [], compiledData: [], totalByYear: {}, aggregatedResourceStats: {} };
    }

    const resourcesSet = new Set<string>();
    const byYearMonth: Record<string, Record<number, number>> = {};
    const totalYearly: Record<string, number> = {};
    const resStats: Record<string, { total: number; byYear: Record<string, number> }> = {};

    Object.keys(DATA_URLS).forEach(y => {
      byYearMonth[y] = {};
      totalYearly[y] = 0;
      for (let i = 0; i < 12; i++) byYearMonth[y][i] = 0;
    });

    for (const [year, rowsAny] of Object.entries(dataSources)) {
      const rows = rowsAny as any[];
      if (!rows || rows.length === 0) continue;
      
      const firstRow = rows[0];
      const keys = Object.keys(firstRow);
      
      // Encontrar las columnas dinámicamente
      const recursoKey = keys.find(k => k.trim().toLowerCase() === 'recurso') || keys[2];
      const conceptoKey = keys.find(k => k.trim().toLowerCase() === 'concepto') || keys[keys.length - 1];
      const monthKeys = keys.filter(k => k.trim().toLowerCase().startsWith('valor ')).slice(0, 12);

      rows.forEach(row => {
        let resCode = getRowResourceCode(row, Number(year));
        let resConcept = String(row[conceptoKey] || '').trim();
        
        if (!resCode || resCode === 'undefined' || resCode === 'null') return;
        
        // El usuario solicitó explícitamente que el filtro sea esta columna ("10, 10.1, 10.2")
        const filterName = getRecursoEquivalence(resCode);
        
        resourcesSet.add(filterName);

        if (!resStats[filterName]) {
          resStats[filterName] = { total: 0, byYear: {} };
        }
        if (!resStats[filterName].byYear[year]) {
          resStats[filterName].byYear[year] = 0;
        }

        // Apply filter
        if (selectedResources.length > 0 && !selectedResources.includes(filterName)) {
           return;
        }

        let rowTotal = 0;
        monthKeys.forEach((mKey, idx) => {
          if (idx >= 12) return;
          const val = parseFloat(String(row[mKey]).replace(/[^0-9.-]+/g, '')) || 0;
          byYearMonth[year][idx] += val;
          rowTotal += val;
        });

        totalYearly[year] += rowTotal;
        resStats[filterName].total += rowTotal;
        resStats[filterName].byYear[year] += rowTotal;
      });
    }

    const compiled = [];
    let accByYear: Record<string, number> = {};
    Object.keys(DATA_URLS).forEach(y => accByYear[y] = 0);

    for (let i = 0; i < 12; i++) {
       const mData: any = { month: MONTH_NAMES[i] };
       Object.keys(DATA_URLS).forEach(y => {
          const mVal = byYearMonth[y][i] || 0;
          mData[y] = mVal;
          accByYear[y] += mVal;
          mData[`${y}_acc`] = accByYear[y];
       });
       compiled.push(mData);
    }

    return { 
      allResources: Array.from(resourcesSet).sort(), 
      compiledData: compiled,
      totalByYear: totalYearly,
      aggregatedResourceStats: resStats
    };
  }, [dataSources, selectedResources]);

  // Process PIC Summary Data
  const { picSummary, picYears } = useMemo(() => {
     if (!picData || picData.length === 0) return { picSummary: [], picYears: [] };

     const byYear: Record<string, any> = {};
     const yearsSet = new Set<string>();

     picData.forEach(row => {
        const year = String(row['Vigencia '] || '').trim();
        const codeName = String(row['Concepto'] || '').trim();
        let valueStr = String(row[' Valor Recaudo '] || '').replace(/[^0-9.-]+/g, '');
        const value = parseFloat(valueStr) || 0;

        if (year && year !== 'null' && codeName && codeName !== 'null' && codeName !== 'Recursos Nación') {
           yearsSet.add(year);
           if (!byYear[year]) byYear[year] = { name: year, totalPIC: 0 };
           byYear[year][codeName] = value;
           byYear[year].totalPIC += value;
        }
     });

     const summaryArray = Array.from(yearsSet).sort().map(y => byYear[y]);
     return { picSummary: summaryArray, picYears: Array.from(yearsSet).sort() };
  }, [picData]);


  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-primary-container border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-on-surface-variant font-mono">Cargando datos históricos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-2xl text-center">
        <p className="text-red-400 font-bold mb-2">Error</p>
        <p className="text-sm text-red-300">{error}</p>
      </div>
    );
  }

  const years = Object.keys(DATA_URLS);
  const colors = ['#4ade80', '#ffcc29', '#ff5b5b', '#7bd0ff'];

  // Metrics calculation
  const activeYears = years.filter(y => totalByYear[y] > 0);
  const latestYear = activeYears.length > 0 ? activeYears[activeYears.length - 1] : years[years.length - 1];
  const prevYear = activeYears.length > 1 ? activeYears[activeYears.length - 2] : years[0];
  
  const totalLatest = totalByYear[latestYear] || 0;
  const totalPrev = totalByYear[prevYear] || 0;
  
  const growthPct = totalPrev > 0 ? ((totalLatest - totalPrev) / totalPrev) * 100 : 0;
  const avgMonthly = totalLatest / 12;

  let bestMonth = '';
  let bestMonthVal = 0;
  compiledData.forEach(d => {
     if (d[latestYear] > bestMonthVal) {
        bestMonthVal = d[latestYear];
        bestMonth = d.month;
     }
  });

  let maxGrowth = -Infinity;
  let maxGrowthResource = '';
  let maxGrowthValLatest = 0;
  
  Object.entries(aggregatedResourceStats).forEach(([name, statsAny]) => {
     const stats = statsAny as { byYear: Record<string, number> };
     const valLatest = stats.byYear[latestYear] || 0;
     const valPrev = stats.byYear[prevYear] || 0;
     // Consider only resources that had at least some meaningful base value
     if (valPrev > 1000) {
        const growth = ((valLatest - valPrev) / valPrev) * 100;
        if (growth > maxGrowth) {
           maxGrowth = growth;
           maxGrowthResource = name;
           maxGrowthValLatest = valLatest;
        }
     }
  });

  const topResource = maxGrowthResource || 'N/A';
  const topResourceVal = maxGrowthValLatest;
  const partPct = totalLatest > 0 ? (topResourceVal / totalLatest) * 100 : 0;

  const toggleResource = (res: string) => {
    if (selectedResources.includes(res)) {
       setSelectedResources(selectedResources.filter(r => r !== res));
    } else {
       setSelectedResources([...selectedResources, res]);
    }
  };

  const clearFilters = () => {
    setSelectedResources([]);
  };

  const isFiltered = selectedResources.length > 0;

  return (
    <div className="max-w-7xl mx-auto animate-in fade-in zoom-in-95 duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
        <div>
          <h2 className="text-4xl md:text-5xl font-display font-medium text-white tracking-tight mb-3">Histórico Financiero</h2>
          <p className="text-on-surface-variant font-mono">Evolución mensual y anual de ingresos institucionales</p>
        </div>
        
        <div className="relative">
           <button 
             onClick={() => setIsFilterOpen(!isFilterOpen)} 
             className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm transition-all ${isFiltered ? 'bg-primary-container text-on-primary-container shadow-[0_0_15px_rgba(255,204,41,0.3)]' : 'bg-white/5 text-white hover:bg-white/10'}`}
           >
              <Filter size={18} />
              {isFiltered ? `Filtrado (${selectedResources.length})` : 'Filtrar Recursos'}
           </button>

           {isFilterOpen && (
             <div className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto custom-scrollbar bg-surface-container border border-white/10 rounded-2xl p-4 z-50 shadow-2xl">
                <div className="flex justify-between items-center mb-4">
                   <h4 className="text-white font-bold">Recursos</h4>
                   {isFiltered && (
                     <button onClick={clearFilters} className="text-xs text-primary-container hover:underline">Limpiar</button>
                   )}
                </div>
                <div className="space-y-2">
                   {allResources.map(res => (
                     <label key={res} className="flex items-start gap-3 p-2 hover:bg-white/5 rounded-lg cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={selectedResources.includes(res)}
                          onChange={() => toggleResource(res)}
                          className="mt-1"
                        />
                        <span className="text-sm text-white/90 leading-tight">{getResourceFullName(res)}</span>
                     </label>
                   ))}
                </div>
             </div>
           )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="glass-card rounded-[24px] p-6 border border-white/5 bg-surface/50 hover:bg-surface transition-colors relative overflow-hidden">
          <div className="flex items-center gap-3 text-on-surface-variant mb-4">
            <DollarSign size={20} className="text-[#ffcc29]" />
            <h4 className="text-xs font-mono uppercase tracking-widest">Total {latestYear}</h4>
          </div>
          <p className="text-3xl font-display font-medium text-white mb-2">${(totalLatest / 1e6).toLocaleString('es-CO', {maximumFractionDigits:1})}M</p>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold px-2 py-0.5 rounded ${growthPct >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
               {growthPct >= 0 ? '+' : ''}{growthPct.toFixed(1)}%
            </span>
            <span className="text-xs text-on-surface-variant font-mono">vs {prevYear}</span>
          </div>
        </div>

        <div className="glass-card rounded-[24px] p-6 border border-white/5 bg-surface/50 hover:bg-surface transition-colors relative overflow-hidden">
          <div className="flex items-center gap-3 text-on-surface-variant mb-4">
            <Calendar size={20} className="text-[#4ade80]" />
            <h4 className="text-xs font-mono uppercase tracking-widest">Promedio Mensual</h4>
          </div>
          <p className="text-3xl font-display font-medium text-white mb-2">${(avgMonthly / 1e6).toLocaleString('es-CO', {maximumFractionDigits:1})}M</p>
          <div className="flex items-center gap-2 mt-auto">
            <span className="text-xs text-on-surface-variant font-mono">Mes pico: <strong className="text-white">{bestMonth}</strong> (${(bestMonthVal / 1e6).toLocaleString('es-CO', {maximumFractionDigits:1})}M)</span>
          </div>
        </div>

        <div className="glass-card rounded-[32px] p-6 md:p-8 border border-white/10 glow-primary bg-[#1a1a1a] lg:col-span-2 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#7bd0ff] via-secondary to-[#ffcc29]"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#7bd0ff]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="flex items-center gap-3 text-on-surface-variant mb-4">
            <TrendingUp size={20} className="text-[#7bd0ff]" />
            <h4 className="text-xs font-mono uppercase tracking-widest">Mayor Crecimiento ({latestYear})</h4>
          </div>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
             <div>
                <p className="text-xl md:text-2xl font-display font-medium text-white mb-1 truncate max-w-sm" title={topResource}>{topResource}</p>
                <div className="flex items-center gap-3">
                   <span className="text-[#7bd0ff] font-mono font-bold">${(topResourceVal / 1e6).toLocaleString('es-CO', {maximumFractionDigits:1})}M</span>
                   <span className={`text-xs font-bold px-2 py-0.5 rounded ${maxGrowth >= 0 ? 'bg-green-500/20 text-[#4ade80]' : 'bg-red-500/20 text-[#ff5b5b]'}`}>
                      {maxGrowth > -Infinity ? `${maxGrowth >= 0 ? '+' : ''}${maxGrowth.toFixed(1)}%` : '0%'}
                   </span>
                   <span className="text-xs text-on-surface-variant font-mono">({partPct.toFixed(1)}% participación)</span>
                </div>
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
         <div className="glass-card rounded-[32px] p-8 border border-white/10 glow-secondary bg-[#1a1a1a]">
            <h3 className="text-xl font-display font-medium text-white mb-8 border-b border-white/10 pb-4">Evolución Mensual</h3>
            <div className="h-[350px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                 <LineChart data={compiledData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                   <XAxis dataKey="month" tick={{fill: '#888', fontSize: 12, fontFamily: 'JetBrains Mono'}} axisLine={false} tickLine={false} />
                   <YAxis tickFormatter={(val) => `$${(val/1e6).toLocaleString('es-CO', {maximumFractionDigits:0})}M`} tick={{fill: '#888', fontSize: 12, fontFamily: 'JetBrains Mono'}} axisLine={false} tickLine={false} />
                   <Tooltip 
                     contentStyle={{backgroundColor: '#1e1b21', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px'}}
                     formatter={(val: number) => [`$${(val/1e6).toLocaleString('es-CO', {maximumFractionDigits:1})}M`, '']}
                     labelStyle={{color: '#fff', fontWeight: 'bold'}}
                   />
                   <Legend wrapperStyle={{fontSize: '12px', fontFamily: 'JetBrains Mono', paddingTop: '20px'}} />
                   {years.map((y, i) => (
                     <Line key={y} type="monotone" dataKey={y} name={y} stroke={colors[i]} strokeWidth={3} dot={{r: 4, fill: '#1a1a1a', strokeWidth: 2}} activeDot={{r: 6}} />
                   ))}
                 </LineChart>
               </ResponsiveContainer>
            </div>
         </div>

         <div className="glass-card rounded-[32px] p-8 border border-white/10 glow-secondary bg-[#1a1a1a]">
            <h3 className="text-xl font-display font-medium text-white mb-8 border-b border-white/10 pb-4">Crecimiento Acumulado</h3>
            <div className="h-[350px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={compiledData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                   <defs>
                     {years.map((y, i) => (
                       <linearGradient key={`color-${y}`} id={`color-${y}`} x1="0" y1="0" x2="0" y2="1">
                         <stop offset="5%" stopColor={colors[i]} stopOpacity={0.3}/>
                         <stop offset="95%" stopColor={colors[i]} stopOpacity={0}/>
                       </linearGradient>
                     ))}
                   </defs>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                   <XAxis dataKey="month" tick={{fill: '#888', fontSize: 12, fontFamily: 'JetBrains Mono'}} axisLine={false} tickLine={false} />
                   <YAxis tickFormatter={(val) => `$${(val/1e6).toLocaleString('es-CO', {maximumFractionDigits:0})}M`} tick={{fill: '#888', fontSize: 12, fontFamily: 'JetBrains Mono'}} axisLine={false} tickLine={false} />
                   <Tooltip 
                     contentStyle={{backgroundColor: '#1e1b21', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px'}}
                     formatter={(val: number, name: string) => [`$${(val/1e6).toLocaleString('es-CO', {maximumFractionDigits:1})}M`, name.replace('_acc', '')]}
                     labelStyle={{color: '#fff', fontWeight: 'bold'}}
                   />
                   <Legend wrapperStyle={{fontSize: '12px', fontFamily: 'JetBrains Mono', paddingTop: '20px'}} formatter={(val) => val.replace('_acc', '')} />
                   {years.map((y, i) => (
                     <Area key={y} type="monotone" dataKey={`${y}_acc`} name={`${y} Acumulado`} stroke={colors[i]} fillOpacity={1} fill={`url(#color-${y})`} strokeWidth={2} />
                   ))}
                 </AreaChart>
               </ResponsiveContainer>
            </div>
         </div>
      </div>

      <div className="glass-card rounded-[32px] p-8 md:p-12 border border-white/10 glow-primary bg-[#1a1a1a] relative overflow-hidden mt-8">
         <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-container via-secondary to-[#4ade80]"></div>
         <h3 className="text-3xl font-display font-medium text-white mb-2 text-center uppercase tracking-wider">Comparativa Anual Total</h3>
         <p className="text-sm font-mono text-on-surface-variant text-center mb-10 mt-4">Ingresos totales consolidados por año</p>
         
         <div className="h-[300px] w-full max-w-3xl mx-auto">
            <ResponsiveContainer width="100%" height="100%">
               <BarChart data={years.map(y => ({ name: y, total: totalByYear[y] }))} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" tick={{fill: '#fff', fontSize: 14, fontWeight: 'bold'}} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip 
                     cursor={{fill: 'rgba(255,255,255,0.05)'}} 
                     contentStyle={{backgroundColor: '#1e1b21', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px'}}
                     formatter={(val: number) => [`$${(val/1e6).toLocaleString('es-CO', {maximumFractionDigits:1})}M`, 'Total']}
                  />
                  <Bar dataKey="total" radius={[8, 8, 8, 8]}>
                     {years.map((y, index) => (
                        <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                     ))}
                  </Bar>
               </BarChart>
            </ResponsiveContainer>
         </div>
      </div>

      {picSummary.length > 0 && (
         <div className="glass-card rounded-[32px] p-8 md:p-12 border border-white/10 glow-secondary bg-[#1a1a1a] relative overflow-hidden mt-8 mb-8">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#7bd0ff] via-secondary to-primary-container"></div>
            <h3 className="text-3xl font-display font-medium text-white mb-2 text-center uppercase tracking-wider text-[#7bd0ff]">Resumen Histórico Planes Integrales (PIC)</h3>
            <p className="text-sm font-mono text-on-surface-variant text-center mb-10 mt-4">Evolución de recursos asignados a cobertura y equidad (ET, CO)</p>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
               <div className="lg:col-span-2 h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                     <BarChart data={picSummary} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="name" tick={{fill: '#fff', fontSize: 14, fontWeight: 'bold'}} axisLine={false} tickLine={false} />
                        <YAxis tickFormatter={(val) => `$${(val/1e6).toLocaleString('es-CO', {maximumFractionDigits:0})}M`} tick={{fill: '#888', fontSize: 12, fontFamily: 'JetBrains Mono'}} axisLine={false} tickLine={false} />
                        <Tooltip 
                           cursor={{fill: 'rgba(255,255,255,0.05)'}} 
                           contentStyle={{backgroundColor: '#1e1b21', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px'}}
                           formatter={(val: number, name: string) => [`$${(val/1e6).toLocaleString('es-CO', {maximumFractionDigits:1})}M`, name]}
                           labelStyle={{color: '#fff', fontWeight: 'bold'}}
                        />
                        <Legend wrapperStyle={{fontSize: '12px', fontFamily: 'JetBrains Mono', paddingTop: '20px'}} />
                        <Bar dataKey="PIC-CO" name="PIC-CO" stackId="a" fill="#ffcc29" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="PIC-ET" name="PIC-ET" stackId="a" fill="#4ade80" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="PIC-CO - Indexado" name="PIC-CO Index." stackId="a" fill="#ff5b5b" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="PIC-ET - Indexado" name="PIC-ET Index." stackId="a" fill="#7bd0ff" radius={[4, 4, 0, 0]} />
                     </BarChart>
                  </ResponsiveContainer>
               </div>
               
               <div className="flex flex-col gap-4 justify-center">
                  {picYears.map(year => {
                     const totalByYr = picSummary.find(s => s.name === year)?.totalPIC || 0;
                     return (
                        <div key={year} className="bg-white/5 border border-white/10 rounded-2xl p-4 transition hover:bg-white/10">
                           <div className="flex justify-between items-center mb-1">
                              <span className="text-sm font-bold text-white font-display">{year}</span>
                              <TrendingUp size={16} className="text-[#7bd0ff] opacity-50" />
                           </div>
                           <p className="text-[10px] font-mono text-on-surface-variant uppercase tracking-widest mb-1">Total PIC</p>
                           <p className="text-base font-mono text-white">${(totalByYr / 1e6).toLocaleString('es-CO', {maximumFractionDigits:1})} <span className="text-[10px] text-on-surface-variant">Mill.</span></p>
                        </div>
                     )
                  })}
               </div>
            </div>
         </div>
      )}

    </div>
  );
}
