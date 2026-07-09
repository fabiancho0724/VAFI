import { useState, useEffect, useMemo } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell, 
  LineChart, Line, ComposedChart, RadialBarChart, RadialBar
} from 'recharts';
import { 
  GraduationCap, MapPin, Building2, BookOpen, Users, DollarSign, 
  Filter, Percent, CreditCard, Activity, TrendingUp, TrendingDown, MoreHorizontal 
} from 'lucide-react';
import { fetchAndParseCSV } from '../lib/csvParser';

const URL_MATRICULAS = 'https://raw.githubusercontent.com/fabiancho0724/VAFI-Reporte-Financiero/5fd78e804688cdca1509f82da5f766b232d62c98/Resumen%20Posgrados.csv';
const URL_INGRESOS = 'https://raw.githubusercontent.com/fabiancho0724/VAFI-Reporte-Financiero/5fd78e804688cdca1509f82da5f766b232d62c98/Resumen%20Posgrados%20ingresos.csv';

const DONUT_COLORS = ['#ffcc29', '#4ade80', '#3b82f6', '#c084fc', '#f43f5e', '#7bd0ff'];
const BAR_COLORS = ['#4ade80', '#7bd0ff', '#c084fc', '#ffcc29', '#f43f5e'];

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
}

function formatCurrencyShort(value: number) {
  if (value >= 1e12) return `$${(value / 1e12).toFixed(1)}B`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}MM`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
  return `$${value}`;
}

export function PosgradosScreen({ onNavigate }: { onNavigate: (s: string) => void }) {
  const [dataStage, setDataStage] = useState<'loading' | 'ready'>('loading');
  const [matriculasData, setMatriculasData] = useState<any[]>([]);
  const [ingresosData, setIngresosData] = useState<any[]>([]);

  const [filterFacultad, setFilterFacultad] = useState<string>('Todas');
  const [filterSede, setFilterSede] = useState<string>('Todas');

  useEffect(() => {
    async function loadData() {
      try {
        const mat = await fetchAndParseCSV(URL_MATRICULAS);
        const ing = await fetchAndParseCSV(URL_INGRESOS);
        
        setMatriculasData(mat);
        setIngresosData(ing);
        setDataStage('ready');
      } catch (err) {
        console.error('Error loading posgrados data', err);
        setDataStage('ready');
      }
    }
    loadData();
  }, []);

  // Compute available filters
  const facultades = useMemo(() => {
    const s = new Set<string>();
    matriculasData.forEach(d => { if (d['FACULTAD']) s.add(d['FACULTAD'].trim()); });
    return Array.from(s).sort();
  }, [matriculasData]);

  const sedes = useMemo(() => {
    const s = new Set<string>();
    matriculasData.forEach(d => {
      if (filterFacultad !== 'Todas' && d['FACULTAD']?.trim() !== filterFacultad) return;
      if (d['SEDE']) s.add(d['SEDE'].trim());
    });
    return Array.from(s).sort();
  }, [matriculasData, filterFacultad]);

  // Apply filters to datasets
  const filteredMatriculas = useMemo(() => {
    return matriculasData.filter(d => {
      const matchFacultad = filterFacultad === 'Todas' || d['FACULTAD']?.trim() === filterFacultad;
      const matchSede = filterSede === 'Todas' || d['SEDE']?.trim() === filterSede;
      return matchFacultad && matchSede;
    });
  }, [matriculasData, filterFacultad, filterSede]);

  const filteredIngresos = useMemo(() => {
    return ingresosData.filter(d => {
      const fac = d['Seccion']?.trim().toUpperCase();
      const matchFacultad = filterFacultad === 'Todas' || fac?.includes(filterFacultad.toUpperCase().replace('FACULTAD ', ''));
      return matchFacultad;
    });
  }, [ingresosData, filterFacultad]);

  // KPIs Calculations
  const { 
    kpis, 
    recaudoPorFacultad, 
    top3ProgramasNeta, 
    top3ProgramasEstudiantes,
    ingresosConceptos,
    rendimientoFacultades,
    flexibilizacionData,
    opcionGradoData
  } = useMemo(() => {
    let totalBruto = 0;
    let totalNeto = 0;
    let totalEstudiantes = 0;
    let estudiantesRegulares = 0;
    let estudiantesOpGrado = 0;
    let estudiantesFlex = 0;

    const facMap: Record<string, number> = {};
    const progMap: Record<string, { neto: number, estudiantes: number, sede: string }> = {};
    const perfFacMap: Record<string, { neto: number, estudiantes: number }> = {};

    filteredMatriculas.forEach(d => {
      const est = parseInt(d['Número de Estudiantes']) || 0;
      const bruto = parseFloat(d['VALOR MATRICULA BRUTA']) || 0;
      const neto = parseFloat(d['VALOR MATRICULA NETA']) || 0;
      const fac = d['FACULTAD']?.trim() || 'No Definida';
      const prog = d['PROGRAMA']?.trim() || 'No Definido';
      const sede = d['SEDE']?.trim() || 'No Definida';
      const tipoIns = d['TIPO INSCRIPCION']?.trim()?.toUpperCase() || '';
      const cuotas = d['Número de CUOTAS']?.toString()?.trim() === '2';

      totalBruto += bruto;
      totalNeto += neto;
      totalEstudiantes += est;

      if (tipoIns.includes('OPCION') || tipoIns.includes('OPCIÓN')) {
        estudiantesOpGrado += est;
      } else {
        estudiantesRegulares += est;
      }

      if (cuotas) {
        estudiantesFlex += est;
      }

      facMap[fac] = (facMap[fac] || 0) + neto;
      
      if (!progMap[prog]) progMap[prog] = { neto: 0, estudiantes: 0, sede };
      progMap[prog].neto += neto;
      progMap[prog].estudiantes += est;

      if (!perfFacMap[fac]) perfFacMap[fac] = { neto: 0, estudiantes: 0 };
      perfFacMap[fac].neto += neto;
      perfFacMap[fac].estudiantes += est;
    });

    let totalOtrosIngresos = 0;
    const concMap: Record<string, { value: number, count: number }> = {};
    filteredIngresos.forEach(d => {
      const val = parseFloat(d['Valor recaudo']) || 0;
      const num = parseInt(d['Número']) || 0;
      const conc = d['Concepto']?.trim() || 'Otro';
      totalOtrosIngresos += val;
      if (!concMap[conc]) concMap[conc] = { value: 0, count: 0 };
      concMap[conc].value += val;
      concMap[conc].count += num;
    });

    const sortedProgramas = Object.entries(progMap).map(([name, data]) => ({ name, ...data }));
    
    return {
      kpis: {
        totalBruto,
        totalNeto,
        totalDescuentos: totalBruto - totalNeto,
        totalOtrosIngresos,
        totalGeneral: totalNeto + totalOtrosIngresos,
        totalEstudiantes,
        estudiantesFlex,
        estudiantesOpGrado,
        estudiantesRegulares
      },
      recaudoPorFacultad: Object.entries(facMap)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value),
      top3ProgramasNeta: [...sortedProgramas].sort((a, b) => b.neto - a.neto).slice(0, 3),
      top3ProgramasEstudiantes: [...sortedProgramas].sort((a, b) => b.estudiantes - a.estudiantes).slice(0, 3),
      ingresosConceptos: Object.entries(concMap)
        .map(([name, data]) => ({ name, value: data.value, estudiantes: data.count }))
        .sort((a, b) => b.value - a.value).slice(0, 5),
      rendimientoFacultades: Object.entries(perfFacMap)
        .map(([name, data]) => ({ name, neto: data.neto, estudiantes: data.estudiantes }))
        .sort((a, b) => b.neto - a.neto),
      flexibilizacionData: [
        { name: '2 Cuotas', value: estudiantesFlex, fill: '#ffcc29' },
        { name: '1 Cuota', value: totalEstudiantes - estudiantesFlex, fill: '#334155' }
      ],
      opcionGradoData: [
        { name: 'Opción Grado', value: estudiantesOpGrado, fill: '#4ade80' },
        { name: 'Regular', value: estudiantesRegulares, fill: '#334155' }
      ]
    };
  }, [filteredMatriculas, filteredIngresos]);

  if (dataStage === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <div className="w-12 h-12 border-4 border-primary-container border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-on-surface-variant font-mono animate-pulse">Cargando dashboard ejecutivo...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col mb-20 max-w-7xl mx-auto px-4 md:px-0 space-y-6">
      
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-2">
        <div>
           <h2 className="text-2xl font-display font-bold text-white tracking-tight">Dashboard Posgrados</h2>
           <p className="text-on-surface-variant text-sm mt-1">Rentabilidad y rendimiento por facultades y programas.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-[#1e293b]/80 border border-white/5 rounded-lg px-3 py-1.5 flex items-center gap-2">
             <Building2 className="w-4 h-4 text-secondary" />
             <select 
                value={filterFacultad} 
                onChange={(e) => {
                  setFilterFacultad(e.target.value);
                  setFilterSede('Todas');
                }}
                className="bg-transparent text-white text-xs font-medium focus:outline-none cursor-pointer max-w-[150px] truncate"
             >
                <option value="Todas" className="bg-black">Fltrar x Facultad</option>
                {facultades.map(f => <option key={f} value={f} className="bg-black">{f}</option>)}
             </select>
          </div>
          <div className="bg-[#1e293b]/80 border border-white/5 rounded-lg px-3 py-1.5 flex items-center gap-2">
             <MapPin className="w-4 h-4 text-secondary" />
             <select 
                value={filterSede} 
                onChange={(e) => setFilterSede(e.target.value)}
                className="bg-transparent text-white text-xs font-medium focus:outline-none cursor-pointer max-w-[150px] truncate"
                disabled={filterFacultad === 'Todas' && sedes.length > 5}
             >
                <option value="Todas" className="bg-black">Filtrar x Sede</option>
                {sedes.map(s => <option key={s} value={s} className="bg-black">{s}</option>)}
             </select>
          </div>
        </div>
      </div>

      {/* Main Grid Layout inspired by reference image */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        
        {/* LEFT COLUMN */}
        <div className="xl:col-span-3 flex flex-col gap-5">
          
          <div className="bg-[#0f172a] border border-[#ffcc29]/20 rounded-2xl p-5 shadow-2xl relative overflow-hidden group bg-gradient-to-br from-[#0f172a] to-[#2a2000]">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <DollarSign size={64} className="text-[#ffcc29]" />
            </div>
            <h3 className="text-xs font-semibold text-[#ffcc29] uppercase tracking-widest mb-1">Recaudo Total</h3>
            <div className="text-3xl font-display font-bold text-white mb-2">{formatCurrency(kpis.totalGeneral)}</div>
            <div className="text-[10px] text-on-surface-variant uppercase tracking-widest bg-white/5 inline-flex items-center px-2 py-0.5 rounded-md mb-2">
              <Users size={12} className="mr-1.5" />
              {kpis.totalEstudiantes} ESTUDIANTES
            </div>
            
            <div className="space-y-2 mt-2">
               <div className="flex justify-between items-center bg-black/40 rounded px-2 py-1">
                  <span className="text-[10px] text-white/60">Matrícula Neta</span>
                  <span className="text-xs text-[#4ade80] font-bold">{formatCurrency(kpis.totalNeto)}</span>
               </div>
               <div className="flex justify-between items-center bg-black/40 rounded px-2 py-1">
                  <span className="text-[10px] text-white/60">Otros Ingresos</span>
                  <span className="text-xs text-[#7bd0ff] font-bold">{formatCurrency(kpis.totalOtrosIngresos)}</span>
               </div>
               <div className="flex justify-between items-center bg-[#f43f5e]/10 border border-[#f43f5e]/20 rounded px-2 py-1 mt-2">
                  <span className="text-[10px] text-[#f43f5e] font-semibold">Total Descuentos</span>
                  <span className="text-xs text-[#f43f5e] font-bold">-{formatCurrency(kpis.totalDescuentos)}</span>
               </div>
            </div>
          </div>

          {/* Top 3 Estudiantes Bar */}
          <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-5 shadow-2xl flex-1 flex flex-col">
             <div className="flex items-center gap-2 mb-6 bg-[#1e293b] p-2 rounded-lg">
                <div className="w-2 h-2 rounded-full bg-[#ffcc29] animate-pulse"></div>
                <h3 className="text-xs font-semibold text-white uppercase tracking-wider">Top 3 Programas x Estudiantes</h3>
             </div>
             <div className="flex-1 flex flex-col justify-center gap-4">
                {top3ProgramasEstudiantes.map((p, i) => {
                  const maxEst = top3ProgramasEstudiantes[0]?.estudiantes || 1;
                  const pct = Math.max(2, (p.estudiantes / maxEst) * 100);
                  const color = BAR_COLORS[i % BAR_COLORS.length];
                  return (
                    <div key={i} className="flex flex-col gap-1.5 group">
                       <div className="flex justify-between items-end text-[10px]">
                          <span className="text-white/80 truncate max-w-[180px] font-medium group-hover:text-white transition-colors" title={p.name}>{p.name}</span>
                          <span className="font-mono text-white font-bold text-[11px] px-1.5 py-0.5 rounded bg-white/5">{p.estudiantes}</span>
                       </div>
                       <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full rounded-full shadow-[0_0_8px_rgba(255,255,255,0.1)] transition-all duration-500 group-hover:brightness-125" style={{ width: `${pct}%`, backgroundColor: color }}></div>
                       </div>
                    </div>
                  );
                })}
                {top3ProgramasEstudiantes.length === 0 && <div className="text-center text-xs text-white/40">Sin datos</div>}
             </div>
          </div>
        </div>

        {/* CENTER COLUMN */}
        <div className="xl:col-span-5 flex flex-col gap-5">
           
           {/* Center Giant Donut */}
           <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col items-center justify-center flex-1 relative">
              <h3 className="text-sm font-semibold text-white absolute top-6 left-6">Participación Matrícula Neta</h3>
              <p className="text-xs text-on-surface-variant absolute top-12 left-6">Porcentaje por facultad</p>
              
              <div className="w-full h-[300px] mt-8 relative">
                 <ResponsiveContainer width="100%" height="100%">
                   <PieChart>
                     <Pie
                       data={recaudoPorFacultad}
                       cx="50%"
                       cy="50%"
                       innerRadius={85}
                       outerRadius={110}
                       paddingAngle={3}
                       dataKey="value"
                       stroke="none"
                       cornerRadius={4}
                     >
                       {recaudoPorFacultad.map((entry, index) => (
                         <Cell key={`cell-${index}`} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                       ))}
                     </Pie>
                     <RechartsTooltip 
                        formatter={(val: number) => formatCurrency(val)} 
                        contentStyle={{backgroundColor: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px'}}
                     />
                   </PieChart>
                 </ResponsiveContainer>
                 {/* Center Text overlay */}
                 <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xs text-white/60 font-mono tracking-widest uppercase mb-1">TOTAL NETA</span>
                    <span className="text-2xl font-bold text-white drop-shadow-md">
                       {formatCurrencyShort(kpis.totalNeto)}
                    </span>
                    <span className="text-[10px] text-white/50 mt-1">{recaudoPorFacultad.length} Facultades</span>
                 </div>
              </div>
              
              {/* Legend Bottom */}
              <div className="w-full mt-4 flex flex-wrap justify-center gap-3">
                 {recaudoPorFacultad.slice(0, 5).map((entry, i) => (
                   <div key={i} className="flex items-center gap-1.5 text-[10px] text-white/70">
                      <span className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length]}}></span>
                      <span className="truncate max-w-[80px]" title={entry.name}>{entry.name.replace('FACULTAD DE ', '').replace('FACULTAD ', '')}</span>
                   </div>
                 ))}
                 {recaudoPorFacultad.length > 5 && <span className="text-[10px] text-white/40">+{recaudoPorFacultad.length - 5} más</span>}
              </div>
           </div>

           {/* Small Distribution Chart (Otros Ingresos) */}
           <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-5 shadow-2xl h-[240px] flex flex-col">
              <h3 className="text-xs font-semibold text-white mb-1">Composición Otros Ingresos (Top 5)</h3>
              <p className="text-[10px] text-on-surface-variant mb-4">Inscripciones, constancias, certificaciones</p>
              <div className="flex-1 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={ingresosConceptos} margin={{top: 0, right: 0, left: -20, bottom: 0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="name" hide />
                    <YAxis yAxisId="left" stroke="currentColor" className="text-[10px] text-on-surface-variant font-mono" tick={{fill: '#64748b'}} axisLine={false} tickLine={false} tickFormatter={formatCurrencyShort} />
                    <YAxis yAxisId="right" orientation="right" stroke="none" tick={{fill: '#64748b', fontSize: 10}} />
                    <RechartsTooltip 
                        contentStyle={{backgroundColor: '#000', border: 'none', borderRadius: '8px', fontSize: '11px'}}
                        formatter={(val: number, name: string) => name === 'value' ? formatCurrency(val) : val}
                        labelFormatter={(lbl) => <span className="font-bold block max-w-[200px] whitespace-normal">{lbl}</span>}
                    />
                    <Bar yAxisId="left" dataKey="value" name="Recaudo" fill="#c084fc" radius={[4, 4, 0, 0]} barSize={20} />
                    <Line yAxisId="right" type="monotone" dataKey="estudiantes" name="N° Estudiantes" stroke="#4ade80" strokeWidth={2} dot={{r: 3, fill: '#4ade80'}} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
           </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="xl:col-span-4 flex flex-col gap-5">
           
           {/* MIXED CHART - Performance */}
           <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-5 shadow-2xl h-[320px] flex flex-col">
             <div className="flex justify-between items-center mb-6">
                <div>
                   <h3 className="text-xs font-semibold text-white">Rendimiento Financiero</h3>
                   <p className="text-[10px] text-on-surface-variant">Matrícula vs Estudiantes por Facultad</p>
                </div>
                <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                  <TrendingUp className="w-3.5 h-3.5 text-white" />
                </div>
             </div>
             
             <div className="flex-1 w-full">
               <ResponsiveContainer width="100%" height="100%">
                 <ComposedChart data={rendimientoFacultades.slice(0,8)} margin={{top: 10, right: 0, left: -20, bottom: 0}}>
                   <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" vertical={false} />
                   <XAxis dataKey="name" hide />
                   <YAxis yAxisId="left" stroke="none" tick={{fill: '#64748b', fontSize: 10}} tickFormatter={formatCurrencyShort} />
                   <YAxis yAxisId="right" orientation="right" stroke="none" tick={{fill: '#64748b', fontSize: 10}} />
                   <RechartsTooltip 
                      contentStyle={{backgroundColor: '#000', border: 'none', borderRadius: '8px', fontSize: '11px'}}
                      formatter={(val: number, name: string) => name === 'neto' ? formatCurrency(val) : val}
                   />
                   <Bar yAxisId="left" dataKey="neto" fill="#ffcc29" radius={[4, 4, 0, 0]} barSize={16}>
                      {rendimientoFacultades.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                      ))}
                   </Bar>
                   <Line yAxisId="right" type="monotone" dataKey="estudiantes" stroke="#fff" strokeWidth={2} dot={{r: 3, fill: '#fff'}} />
                 </ComposedChart>
               </ResponsiveContainer>
             </div>
           </div>

           {/* TOP 3 TABLES/LIST - Detailed */}
           <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-5 shadow-2xl flex-1 flex flex-col">
             <div className="flex items-center gap-2 mb-4 bg-[#1e293b] p-2 rounded-lg">
                <div className="w-2 h-2 rounded-full bg-[#4ade80] animate-pulse"></div>
                <h3 className="text-xs font-semibold text-white uppercase tracking-wider">Top 3 Programas x Recaudo</h3>
             </div>
             
             <div className="flex-1 overflow-x-auto">
               <table className="w-full text-left border-collapse">
                 <thead>
                   <tr className="border-b border-white/10">
                     <th className="py-2 text-[10px] font-mono font-medium text-white/50 uppercase">Programa</th>
                     <th className="py-2 text-[10px] font-mono font-medium text-white/50 uppercase text-center">Sede</th>
                     <th className="py-2 text-[10px] font-mono font-medium text-white/50 uppercase text-right">Recaudo</th>
                   </tr>
                 </thead>
                 <tbody>
                   {top3ProgramasNeta.map((prog, i) => (
                     <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                       <td className="py-3">
                         <div className="flex items-center gap-2">
                           <div className="w-5 h-5 rounded bg-white/10 flex items-center justify-center text-[10px] text-white font-bold group-hover:bg-[#4ade80] group-hover:text-black transition-colors">
                             {i + 1}
                           </div>
                           <span className="text-[11px] text-white/80 font-medium truncate max-w-[120px] sm:max-w-[160px]" title={prog.name}>{prog.name}</span>
                         </div>
                       </td>
                       <td className="py-3 text-center">
                         <span className="text-[10px] text-white/60 bg-white/5 px-2 py-0.5 rounded">{prog.sede}</span>
                       </td>
                       <td className="py-3 text-right">
                         <span className="text-xs font-bold text-[#4ade80]">{formatCurrency(prog.neto)}</span>
                       </td>
                     </tr>
                   ))}
                   {top3ProgramasNeta.length === 0 && (
                     <tr>
                       <td colSpan={3} className="py-8 text-center text-xs text-white/40">No hay datos disponibles para los filtros.</td>
                     </tr>
                   )}
                 </tbody>
               </table>
             </div>
           </div>

        </div>

      </div>

      {/* Bottom Grid for Demographics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
        <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-6">
           <div className="flex-1 w-full">
             <h3 className="text-sm font-semibold text-white">Flexibilización VAFI</h3>
             <p className="text-[10px] text-on-surface-variant mt-1">Estudiantes con opciones de 2 cuotas vs 1 cuota.</p>
             <div className="mt-6 space-y-3">
               <div className="flex items-center justify-between text-xs">
                 <div className="flex items-center gap-2">
                   <span className="w-3 h-3 rounded-full bg-[#ffcc29]"></span>
                   <span className="text-white/80">2 Cuotas (Flex)</span>
                 </div>
                 <div className="text-right">
                   <span className="font-bold text-white mr-2">{kpis.estudiantesFlex}</span>
                   <span className="font-mono text-[10px] text-[#ffcc29]">
                     {kpis.totalEstudiantes > 0 ? ((kpis.estudiantesFlex / kpis.totalEstudiantes) * 100).toFixed(1) : 0}%
                   </span>
                 </div>
               </div>
               <div className="flex items-center justify-between text-xs">
                 <div className="flex items-center gap-2">
                   <span className="w-3 h-3 rounded-full bg-[#334155]"></span>
                   <span className="text-white/80">1 Cuota (Única)</span>
                 </div>
                 <div className="text-right">
                   <span className="font-bold text-white mr-2">{kpis.totalEstudiantes - kpis.estudiantesFlex}</span>
                   <span className="font-mono text-[10px] text-[#94a3b8]">
                     {kpis.totalEstudiantes > 0 ? (((kpis.totalEstudiantes - kpis.estudiantesFlex) / kpis.totalEstudiantes) * 100).toFixed(1) : 0}%
                   </span>
                 </div>
               </div>
             </div>
           </div>
           <div className="w-[140px] h-[140px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={flexibilizacionData} dataKey="value" cx="50%" cy="50%" innerRadius={45} outerRadius={65} stroke="none">
                  </Pie>
                  <RechartsTooltip formatter={(val: number) => [val, 'Estudiantes']} contentStyle={{backgroundColor: '#000', border: 'none', fontSize: '11px', borderRadius: '8px'}} />
                </PieChart>
              </ResponsiveContainer>
           </div>
        </div>

        <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-6">
           <div className="flex-1 w-full">
             <h3 className="text-sm font-semibold text-white">Tipo de Inscripción</h3>
             <p className="text-[10px] text-on-surface-variant mt-1">Opción de Grado vs Inscripción Regular.</p>
             <div className="mt-6 space-y-3">
               <div className="flex items-center justify-between text-xs">
                 <div className="flex items-center gap-2">
                   <span className="w-3 h-3 rounded-full bg-[#4ade80]"></span>
                   <span className="text-white/80">Opción Grado</span>
                 </div>
                 <div className="text-right">
                   <span className="font-bold text-white mr-2">{kpis.estudiantesOpGrado}</span>
                   <span className="font-mono text-[10px] text-[#4ade80]">
                     {kpis.totalEstudiantes > 0 ? ((kpis.estudiantesOpGrado / kpis.totalEstudiantes) * 100).toFixed(1) : 0}%
                   </span>
                 </div>
               </div>
               <div className="flex items-center justify-between text-xs">
                 <div className="flex items-center gap-2">
                   <span className="w-3 h-3 rounded-full bg-[#334155]"></span>
                   <span className="text-white/80">Regular</span>
                 </div>
                 <div className="text-right">
                   <span className="font-bold text-white mr-2">{kpis.estudiantesRegulares}</span>
                   <span className="font-mono text-[10px] text-[#94a3b8]">
                     {kpis.totalEstudiantes > 0 ? ((kpis.estudiantesRegulares / kpis.totalEstudiantes) * 100).toFixed(1) : 0}%
                   </span>
                 </div>
               </div>
             </div>
           </div>
           <div className="w-[140px] h-[140px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={opcionGradoData} dataKey="value" cx="50%" cy="50%" innerRadius={45} outerRadius={65} stroke="none">
                  </Pie>
                  <RechartsTooltip formatter={(val: number) => [val, 'Estudiantes']} contentStyle={{backgroundColor: '#000', border: 'none', fontSize: '11px', borderRadius: '8px'}} />
                </PieChart>
              </ResponsiveContainer>
           </div>
        </div>
      </div>
    </div>
  );
}

