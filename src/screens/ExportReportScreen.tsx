import { useState, useEffect, useMemo } from 'react';
import { FileText, Download, Printer, ChevronLeft, TrendingUp, Users, DollarSign, Award, Bot, Sparkles, BarChart2, ShieldCheck } from 'lucide-react';
import { fetchAndParseCSV, groupAndSum, getCategoryColumn, getNumericColumn } from '../lib/csvParser';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, 
  CartesianGrid, AreaChart, Area, LineChart, Line, Legend 
} from 'recharts';

// Multi-year comparison dataset (2026 - 2036) for Credits vs SMLMV
const PROJECTION_COMPARISON_DATA = [
  { anio: 2026, name: '2026', 'Ingresos SMLMV (M)': 45472.1, 'Ingresos Créditos (M)': 45472.1, 'Alumnos SMLMV': 5170, 'Alumnos Créditos': 5170 },
  { anio: 2027, name: '2027', 'Ingresos SMLMV (M)': 50789.6, 'Ingresos Créditos (M)': 48427.7, 'Alumnos SMLMV': 4628, 'Alumnos Créditos': 5186 },
  { anio: 2028, name: '2028', 'Ingresos SMLMV (M)': 52038.5, 'Ingresos Créditos (M)': 51575.5, 'Alumnos SMLMV': 4516, 'Alumnos Créditos': 5201 },
  { anio: 2029, name: '2029', 'Ingresos SMLMV (M)': 53321.6, 'Ingresos Créditos (M)': 54928.0, 'Alumnos SMLMV': 4407, 'Alumnos Créditos': 5217 },
  { anio: 2030, name: '2030', 'Ingresos SMLMV (M)': 54641.0, 'Ingresos Créditos (M)': 58498.3, 'Alumnos SMLMV': 4301, 'Alumnos Créditos': 5232 },
  { anio: 2031, name: '2031', 'Ingresos SMLMV (M)': 55985.8, 'Ingresos Créditos (M)': 62300.7, 'Alumnos SMLMV': 4197, 'Alumnos Créditos': 5248 },
  { anio: 2032, name: '2032', 'Ingresos SMLMV (M)': 57370.4, 'Ingresos Créditos (M)': 66350.2, 'Alumnos SMLMV': 4096, 'Alumnos Créditos': 5263 },
  { anio: 2033, name: '2033', 'Ingresos SMLMV (M)': 58783.0, 'Ingresos Créditos (M)': 70663.0, 'Alumnos SMLMV': 3997, 'Alumnos Créditos': 5279 },
  { anio: 2034, name: '2034', 'Ingresos SMLMV (M)': 60239.7, 'Ingresos Créditos (M)': 75256.1, 'Alumnos SMLMV': 3901, 'Alumnos Créditos': 5294 },
  { anio: 2035, name: '2035', 'Ingresos SMLMV (M)': 61727.5, 'Ingresos Créditos (M)': 80147.7, 'Alumnos SMLMV': 3807, 'Alumnos Créditos': 5310 },
  { anio: 2036, name: '2036', 'Ingresos SMLMV (M)': 63247.6, 'Ingresos Créditos (M)': 85357.3, 'Alumnos SMLMV': 3715, 'Alumnos Créditos': 5325 }
];

export function ExportReportScreen({ onNavigate }: { onNavigate: (s: string) => void }) {
  const [dataStage, setDataStage] = useState<'loading' | 'ready'>('loading');
  const [ingresosTotal, setIngresosTotal] = useState(173254.7);
  const [gastosTotal, setGastosTotal] = useState(110225.5);
  
  const [ingresosData, setIngresosData] = useState<any[]>([]);
  const [gastosData, setGastosData] = useState<any[]>([]);
  const [nominaData, setNominaData] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const ing = await fetchAndParseCSV('/data/Ingresos.csv');
        const gas = await fetchAndParseCSV('/data/Gastos.csv');
        const nom = await fetchAndParseCSV('/data/Nomina.csv');
        
        processData(ing, gas, nom);
      } catch (err) {
        // Fallbacks
        const fallbackIngresos = [
          { name: 'Aportes de la Nación', recaudo: 125518.3, fill: '#4ade80' },
          { name: 'Recursos Propios', recaudo: 9200.1, fill: '#f43f5e' },
          { name: 'Estampilla Pro-UPTC', recaudo: 1605.1, fill: '#ffcc29' },
          { name: 'Posgrados/Extensión', recaudo: 36931.0, fill: '#8b5cf6' },
        ];
        const fallbackGastos = [
          { name: 'Gastos de Personal', pago: 82530.2, fill: '#ffcc29' },
          { name: 'Funcionamiento', pago: 23261.9, fill: '#7bd0ff' },
          { name: 'Inversión', pago: 2986.9, fill: '#d0bcff' },
        ];
        const fallbackNomina = [
          { name: 'Docentes de Planta', value: 45000 },
          { name: 'Ocasionales', value: 22000 },
          { name: 'Administrativos', value: 13000 },
        ];
        setIngresosData(fallbackIngresos);
        setGastosData(fallbackGastos);
        setNominaData(fallbackNomina);
        setDataStage('ready');
      }
    }
    loadData();
  }, []);

  const processData = (ing: any[], gas: any[], nom: any[]) => {
    let recaudoTotal = 0;
    const ingresosGroups: any[] = [];
    if (ing && ing.length > 0) {
      const firstRowKeys = Object.keys(ing[0]);
      if (firstRowKeys.length >= 10) {
        const recaudoCol = firstRowKeys[6];
        const tipoCol = firstRowKeys[3];
        recaudoTotal = ing.reduce((sum, r) => sum + (parseFloat(r[recaudoCol]) || 0), 0) / 1e6;
        
        const tipos = Array.from(new Set(ing.map(r => r[tipoCol]))).filter(Boolean);
        const colors = ['#4ade80', '#f43f5e', '#8b5cf6', '#ffcc29', '#3b82f6'];
        tipos.forEach((tipo, i) => {
          const val = ing.filter(r => r[tipoCol] === tipo).reduce((s, r) => s + (parseFloat(r[recaudoCol]) || 0), 0) / 1e6;
          ingresosGroups.push({ name: tipo, recaudo: val, fill: colors[i % colors.length] });
        });
      }
    }

    let pagoTotal = 0;
    const gasGroups: any[] = [];
    if (gas && gas.length > 0) {
      const firstRowKeys = Object.keys(gas[0]);
      const pagoCol = firstRowKeys.find(k => k.toLowerCase().includes('pago') && k.toLowerCase().includes('valor')) || firstRowKeys[10] || 'Valor pago';
      const catCol = firstRowKeys.find(k => k.toLowerCase().includes('código recurso') || k.toLowerCase().includes('codigo recurso') || k.toLowerCase().includes('cã³digo recurso') || k.toLowerCase().includes('cdigo recurso')) || firstRowKeys[7] || 'Código recurso';
      
      pagoTotal = gas.reduce((sum, r) => sum + (parseFloat(String(r[pagoCol]).replace(/[^0-9.-]+/g, '')) || 0), 0) / 1e6;
      
      const tipos = Array.from(new Set(gas.map(r => r[catCol]))).filter(Boolean);
      const colors = ['#ffcc29', '#7bd0ff', '#d0bcff', '#ff5b5b', '#4ade80'];
      tipos.forEach((tipo, i) => {
         const val = gas.filter(r => r[catCol] === tipo).reduce((s, r) => s + (parseFloat(String(r[pagoCol]).replace(/[^0-9.-]+/g, '')) || 0), 0) / 1e6;
         gasGroups.push({ name: tipo, pago: val, fill: colors[i % colors.length] });
      });
    }

    const nomGroups: any[] = [];
    if (nom && nom.length > 0) {
      const numCol = getNumericColumn(nom) || 'valor';
      const catCol = getCategoryColumn(nom) || 'tipo_vinculacion';
      const groups = groupAndSum(nom, catCol, numCol);
      groups.forEach((g: any) => {
         nomGroups.push({ name: g.name, value: g.value / 1e6 });
      });
    }

    setIngresosData(ingresosGroups.sort((a,b) => b.recaudo - a.recaudo));
    setGastosData(gasGroups.sort((a,b) => b.pago - a.pago));
    setNominaData(nomGroups.sort((a,b) => b.value - a.value));
    if (recaudoTotal > 0) setIngresosTotal(recaudoTotal);
    if (pagoTotal > 0) setGastosTotal(pagoTotal);
    
    setDataStage('ready');
  };

  if (dataStage === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <div className="w-12 h-12 border-4 border-primary-container border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-on-surface-variant font-mono animate-pulse">Generando reporte dinámico...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col mb-20 max-w-5xl mx-auto px-4 md:px-0">
      
      {/* Top action bar */}
      <div className="flex justify-between items-center mb-8">
        <button onClick={() => onNavigate('dashboard')} className="flex items-center gap-2 text-on-surface-variant hover:text-white transition-colors">
           <ChevronLeft size={20} />
           <span className="text-sm font-bold">Volver al Tablero</span>
        </button>
        <div className="flex gap-3">
          <button className="bg-white/5 border border-white/10 px-4 py-2 rounded-lg text-sm font-bold text-white flex items-center gap-2 hover:bg-white/10 transition-colors" onClick={() => window.print()}>
            <Printer size={16} />
            Imprimir
          </button>
          <button className="bg-primary-container text-on-primary-container px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:brightness-110 transition-colors" onClick={() => window.print()}>
            <Download size={16} />
            Exportar PDF
          </button>
        </div>
      </div>

      {/* Main Report Document */}
      <div className="bg-white text-black p-8 sm:p-14 md:p-16 rounded-[28px] shadow-2xl relative print:shadow-none print:p-0 print:rounded-none">
        
        {/* Header DOCX Style */}
        <div className="border-b-2 border-black pb-6 mb-10 flex justify-between items-center">
           <div>
             <h1 className="text-2xl sm:text-3xl font-serif font-bold text-black mb-1">INFORME FINANCIERO Y PROYECCIÓN INSTITUCIONAL</h1>
             <p className="text-xs sm:text-sm font-sans text-gray-600 font-bold tracking-widest uppercase">UPTC - Vicerrectoría Administrativa y Financiera (VAFI)</p>
           </div>
           <img 
             src="https://raw.githubusercontent.com/fabiancho0724/VAFI-Reporte-Financiero/7601e17bbde30e0381cc947ff62d9345b0ec3853/uptc-blanco%20(1).png" 
             alt="UPTC Logo" 
             className="w-16 sm:w-20 object-contain invert"
           />
        </div>

        <div className="space-y-10 font-serif leading-relaxed text-sm">
           
           {/* Section 1: Executive Summary */}
           <section className="mb-8">
              <h2 className="text-lg sm:text-xl font-bold mb-4 font-sans uppercase tracking-wider text-black border-b border-gray-300 pb-2">
                1. Resumen Ejecutivo
              </h2>
              <p className="text-gray-800 text-justify mb-4">
                El presente informe consolida el comportamiento financiero y presupuestal de la Universidad Pedagógica y Tecnológica de Colombia (UPTC) con corte oficial al <strong>31 de julio de 2026</strong>. Se analiza la ejecución de ingresos y egresos conforme a los catálogos presupuestales No. 14 y 15, así como la modelación prospectiva de largo plazo de las fuentes de matrícula bajo esquemas comparativos.
              </p>
           </section>

           {/* Section 2: Methodology */}
           <section className="mb-8">
              <h2 className="text-lg sm:text-xl font-bold mb-4 font-sans uppercase tracking-wider text-black border-b border-gray-300 pb-2">
                2. Metodología de Análisis
              </h2>
              <p className="text-gray-800 text-justify mb-4">
                Una vez consolidados los registros de ingresos y gastos de la UPTC, se procede a su clasificación y organización conforme a las categorías definidas en el Catálogo Presupuestal vigente. Este proceso permite estructurar la información financiera de manera homogénea y facilitar su análisis prospectivo.
              </p>
              <ul className="list-disc pl-5 space-y-2 text-gray-800 text-justify">
                 <li><strong>Ingresos:</strong> Identificados bajo 18 tipos de recursos, monitoreados a través del aforo y recaudo mensual.</li>
                 <li><strong>Gastos:</strong> Agrupados en Gastos de Personal (2.1.1), Gastos de Funcionamiento (2.1.2) e Inversión (2.3).</li>
                 <li><strong>Proyecciones:</strong> Modelación plurianual mediante indexadores macroeconómicos (IPC, ICES, SMLMV) y elasticidad precio de demanda.</li>
              </ul>
           </section>

           {/* Section 3: Revenue Analysis */}
           <section>
              <h2 className="text-lg sm:text-xl font-bold mb-4 font-sans uppercase tracking-wider text-black border-b border-gray-300 pb-2">
                3. Análisis de Ingresos (Corte Julio 2026)
              </h2>
              <p className="text-gray-800 text-justify mb-4">
                El recaudo acumulado a la fecha de corte asciende a <strong>${ingresosTotal.toLocaleString('es-CO', {maximumFractionDigits: 1})} millones</strong>, con una alta participación de las transferencias de la Nación y la gestión de recursos propios.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-6 mt-6 items-center">
                 <div className="flex-1 bg-gray-50 border border-gray-200 p-4 rounded text-xs text-gray-700 w-full font-sans">
                    <ul className="list-disc pl-5 space-y-2">
                      <li><strong>Aportes de la Nación (Funcionamiento y Gratuidad):</strong> $205.457,7 M (60,9% del total)</li>
                      <li><strong>Posgrados, Convenios y Extensión:</strong> $67.236,3 M (19,9% del total)</li>
                      <li><strong>Estampillas y Devoluciones (IVA / Votación):</strong> $27.831,3 M (8,3% del total)</li>
                      <li><strong>Recursos Propios (Rentas y Servicios):</strong> $14.316,3 M (4,2% del total)</li>
                      <li><strong>Aportes para Inversión:</strong> $12.889,2 M (3,8% del total)</li>
                    </ul>
                 </div>
                 <div className="w-full sm:w-64 h-48">
                    <ResponsiveContainer width="100%" height="100%">
                       <PieChart>
                          <Pie data={ingresosData} dataKey="recaudo" nameKey="name" cx="50%" cy="50%" outerRadius={70} stroke="none">
                             {ingresosData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill || '#000'} />
                             ))}
                          </Pie>
                          <Tooltip formatter={(value: number) => `$${value.toLocaleString('es-CO', {maximumFractionDigits: 1})} M`} />
                       </PieChart>
                    </ResponsiveContainer>
                 </div>
              </div>
           </section>

           {/* Section 4: Expenses Analysis */}
           <section>
              <h2 className="text-lg sm:text-xl font-bold mb-4 font-sans uppercase tracking-wider text-black border-b border-gray-300 pb-2">
                4. Análisis de Egresos y Compromisos
              </h2>
              <p className="text-gray-800 text-justify mb-4">
                El pago efectivo totaliza <strong>${gastosTotal.toLocaleString('es-CO', {maximumFractionDigits: 1})} millones</strong>, liderado por la ejecución de la nómina docente y administrativa ($146.943,8M), seguido de los gastos de funcionamiento ($23.261,9M) y proyectos de inversión ($2.986,9M).
              </p>
              
              <div className="h-64 mt-6">
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={gastosData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                       <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                       <XAxis type="number" fontSize={11} tickFormatter={(val) => `$${val}`} />
                       <YAxis dataKey="name" type="category" width={150} fontSize={11} />
                       <Tooltip formatter={(value: number) => `$${value.toLocaleString('es-CO', {maximumFractionDigits: 1})} M`} cursor={{fill: 'rgba(0,0,0,0.05)'}} />
                       <Bar dataKey="pago" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                          {gastosData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill || '#3b82f6'} />
                          ))}
                       </Bar>
                    </BarChart>
                 </ResponsiveContainer>
              </div>
           </section>

           {/* ========================================================================= */}
           {/* SECTION 5: PROYECCIÓN PLURIANUAL Y COMPARACIÓN DE ESCENARIOS (CRÉDITOS VS SMLMV) */}
           {/* ========================================================================= */}
           <section className="pt-6 border-t border-gray-300 space-y-6">
              <div>
                <h2 className="text-lg sm:text-xl font-bold font-sans uppercase tracking-wider text-black border-b border-gray-300 pb-2">
                  5. Proyección Plurianual: Modelo por Créditos vs. Modelo SMLMV (2026 - 2036)
                </h2>
                <p className="text-gray-800 text-justify mt-3">
                  A continuación se presentan las proyecciones comparativas de mediano y largo plazo entre la reforma tarifaria por <strong>Créditos Académicos</strong> y el esquema tradicional indexado al <strong>SMLMV</strong>. Se evalúa el impacto del incremento diferido del 15% en 2027 y la elasticidad precio de demanda sobre la matrícula y el recaudo institucional.
                </p>
              </div>

              {/* Comparative Executive KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-sans">
                 <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl text-center">
                    <span className="text-[10px] uppercase font-bold text-gray-500 block">Recaudo Créditos (2036)</span>
                    <span className="text-xl font-bold text-amber-600 block mt-1">$85.357,3 M</span>
                    <span className="text-[10px] text-gray-500">+35,0% vs SMLMV</span>
                 </div>
                 <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl text-center">
                    <span className="text-[10px] uppercase font-bold text-gray-500 block">Recaudo SMLMV (2036)</span>
                    <span className="text-xl font-bold text-gray-700 block mt-1">$63.247,6 M</span>
                    <span className="text-[10px] text-red-500">Contracción por deserción</span>
                 </div>
                 <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl text-center">
                    <span className="text-[10px] uppercase font-bold text-gray-500 block">Diferencial Acumulado (10 Años)</span>
                    <span className="text-xl font-bold text-emerald-600 block mt-1">+$74.928,5 M</span>
                    <span className="text-[10px] text-emerald-600">Sostenibilidad R31</span>
                 </div>
              </div>

              {/* TWO COMPARISON CHARTS WITH FULL VISIBILITY OF AXES AND LEGENDS */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
                 
                 {/* Chart 1: Revenue Comparison */}
                 <div className="bg-[#0b1329] text-white p-6 rounded-2xl border border-slate-700 shadow-xl flex flex-col justify-between print:bg-gray-50 print:text-black print:border-gray-300">
                    <div className="mb-4">
                       <h3 className="text-xs font-bold uppercase tracking-wider font-sans text-white print:text-black flex items-center gap-2">
                         <DollarSign size={14} className="text-[#ffcc29]" />
                         1. Comparación de Ingresos Proyectados (Millones COP)
                       </h3>
                       <p className="text-[11px] text-slate-400 print:text-gray-600 font-sans mt-0.5">
                         Evolución del recaudo anual proyectado 2026 - 2036.
                       </p>
                    </div>

                    <div className="h-64 w-full">
                       <ResponsiveContainer width="100%" height="100%">
                          <AreaChart 
                             data={PROJECTION_COMPARISON_DATA} 
                             margin={{ top: 10, right: 15, left: 15, bottom: 5 }}
                          >
                             <defs>
                                <linearGradient id="reportCreditosGrad" x1="0" y1="0" x2="0" y2="1">
                                   <stop offset="5%" stopColor="#ffcc29" stopOpacity={0.4}/>
                                   <stop offset="95%" stopColor="#ffcc29" stopOpacity={0.02}/>
                                </linearGradient>
                                <linearGradient id="reportSmlmvGrad" x1="0" y1="0" x2="0" y2="1">
                                   <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.25}/>
                                   <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.01}/>
                                </linearGradient>
                             </defs>
                             <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
                             <XAxis 
                                dataKey="name" 
                                stroke="#94a3b8" 
                                tick={{ fontSize: 11, fill: '#94a3b8' }} 
                                dy={5}
                             />
                             <YAxis 
                                stroke="#94a3b8" 
                                width={65} 
                                tick={{ fontSize: 11, fill: '#94a3b8' }} 
                                tickFormatter={(v) => `$${v.toLocaleString('es-CO')}M`}
                                domain={[0, 95000]}
                             />
                             <Tooltip 
                                formatter={(value: number, name: string) => [`$${value.toLocaleString('es-CO', {minimumFractionDigits: 1})}M`, name]}
                                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', fontSize: '11px', color: '#fff' }}
                             />
                             <Legend 
                                verticalAlign="bottom" 
                                height={30} 
                                iconType="circle" 
                                wrapperStyle={{ fontSize: '11px', paddingTop: '10px', color: '#cbd5e1' }}
                             />
                             <Area 
                                type="monotone" 
                                dataKey="Ingresos Créditos (M)" 
                                stroke="#ffcc29" 
                                strokeWidth={2.5} 
                                fill="url(#reportCreditosGrad)" 
                                dot={{ r: 3, fill: '#ffcc29' }}
                             />
                             <Area 
                                type="monotone" 
                                dataKey="Ingresos SMLMV (M)" 
                                stroke="#94a3b8" 
                                strokeWidth={2} 
                                fill="url(#reportSmlmvGrad)" 
                                dot={{ r: 3, fill: '#94a3b8' }}
                             />
                          </AreaChart>
                       </ResponsiveContainer>
                    </div>
                 </div>

                 {/* Chart 2: Student Enrollment Comparison */}
                 <div className="bg-[#0b1329] text-white p-6 rounded-2xl border border-slate-700 shadow-xl flex flex-col justify-between print:bg-gray-50 print:text-black print:border-gray-300">
                    <div className="mb-4">
                       <h3 className="text-xs font-bold uppercase tracking-wider font-sans text-white print:text-black flex items-center gap-2">
                         <Users size={14} className="text-[#4ade80]" />
                         2. Comparación de Matrículas Proyectadas (Estudiantes)
                       </h3>
                       <p className="text-[11px] text-slate-400 print:text-gray-600 font-sans mt-0.5">
                         Volumen de estudiantes matriculados en posgrados.
                       </p>
                    </div>

                    <div className="h-64 w-full">
                       <ResponsiveContainer width="100%" height="100%">
                          <LineChart 
                             data={PROJECTION_COMPARISON_DATA} 
                             margin={{ top: 10, right: 15, left: 15, bottom: 5 }}
                          >
                             <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
                             <XAxis 
                                dataKey="name" 
                                stroke="#94a3b8" 
                                tick={{ fontSize: 11, fill: '#94a3b8' }} 
                                dy={5}
                             />
                             <YAxis 
                                stroke="#94a3b8" 
                                width={55} 
                                tick={{ fontSize: 11, fill: '#94a3b8' }} 
                                tickFormatter={(v) => v.toLocaleString('es-CO')}
                                domain={[0, 6000]}
                             />
                             <Tooltip 
                                formatter={(value: number, name: string) => [`${value.toLocaleString('es-CO')} estudiantes`, name]}
                                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', fontSize: '11px', color: '#fff' }}
                             />
                             <Legend 
                                verticalAlign="bottom" 
                                height={30} 
                                iconType="circle" 
                                wrapperStyle={{ fontSize: '11px', paddingTop: '10px', color: '#cbd5e1' }}
                             />
                             <Line 
                                type="monotone" 
                                dataKey="Alumnos Créditos" 
                                stroke="#4ade80" 
                                strokeWidth={2.5} 
                                dot={{ r: 3, fill: '#4ade80' }}
                             />
                             <Line 
                                type="monotone" 
                                dataKey="Alumnos SMLMV" 
                                stroke="#cbd5e1" 
                                strokeWidth={2} 
                                dot={{ r: 3, fill: '#cbd5e1' }}
                             />
                          </LineChart>
                       </ResponsiveContainer>
                    </div>
                 </div>

              </div>

              {/* Explanatory Narrative for the Charts */}
              <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl text-gray-800 text-xs text-justify space-y-2">
                 <p>
                   <strong>Análisis de Demanda y Deserción:</strong> El modelo tarifario por créditos permite ajustar el cobro al avance curricular real del estudiante, manteniendo la retención estudiantil por encima de los 5.300 alumnos anuales. Por el contrario, el esquema rígido en SMLMV, al sumar el incremento diferido del 15% en 2027 más la inflación salarial, induce una deserción que reduce la matrícula a 3.715 alumnos hacia 2036.
                 </p>
                 <p>
                   <strong>Sostenibilidad Presupuestal:</strong> La mayor retención de alumnos bajo el modelo de créditos compensa holgadamente el valor unitario de la matrícula, asegurando un ingreso superior en $22.109,7 millones en la vigencia 2036 y consolidando la viabilidad del Fondo Especial de Posgrados (R31).
                 </p>
              </div>

           </section>

           {/* Signatures */}
           <div className="pt-16 pb-6 flex flex-col items-center">
              <div className="text-center w-72">
                 <div className="border-t border-black pt-2 w-full"></div>
                 <p className="font-bold font-sans text-sm mt-2">LUIS ÁNGEL LARA GONZÁLEZ</p>
                 <p className="text-xs font-sans text-gray-500">Vicerrector Administrativo y Financiero</p>
                 <p className="text-[10px] font-mono text-gray-400 mt-1">Universidad Pedagógica y Tecnológica de Colombia</p>
              </div>
           </div>

        </div>
      </div>
    </div>
  );
}
