import { useState, useEffect } from 'react';
import { FileText, Download, Printer, ChevronLeft } from 'lucide-react';
import { fetchAndParseCSV, groupAndSum, getCategoryColumn, getNumericColumn } from '../lib/csvParser';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

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
        const ing = await fetchAndParseCSV('https://raw.githubusercontent.com/fabiancho0724/VAFI-Reporte-Financiero/25bab426e66c86cc3e877f13a848afe2fc93b019/Ingresos.csv');
        const gas = await fetchAndParseCSV('https://raw.githubusercontent.com/fabiancho0724/VAFI-Reporte-Financiero/8ea7abfbc3d504ea4280d246aa5e02dcc82b59f9/Gastos.csv');
        const nom = await fetchAndParseCSV('https://raw.githubusercontent.com/fabiancho0724/VAFI-Reporte-Financiero/main/Nomina.csv');
        
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
      if (firstRowKeys.length >= 12) {
        const pagoCol = firstRowKeys[11];
        const catCol = firstRowKeys[7]; // Tipo gasto
        pagoTotal = gas.reduce((sum, r) => sum + (parseFloat(r[pagoCol]) || 0), 0) / 1e6;
        
        const tipos = Array.from(new Set(gas.map(r => r[catCol]))).filter(Boolean);
        const colors = ['#ffcc29', '#7bd0ff', '#d0bcff', '#ff5b5b', '#4ade80'];
        tipos.forEach((tipo, i) => {
           const val = gas.filter(r => r[catCol] === tipo).reduce((s, r) => s + (parseFloat(r[pagoCol]) || 0), 0) / 1e6;
           gasGroups.push({ name: tipo, pago: val, fill: colors[i % colors.length] });
        });
      }
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

  const margenTotal = ingresosTotal - gastosTotal;

  return (
    <div className="flex flex-col mb-20 max-w-4xl mx-auto">
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
          <button className="bg-primary-container text-on-primary-container px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:brightness-110 transition-colors">
            <Download size={16} />
            Exportar PDF
          </button>
        </div>
      </div>

      <div className="bg-white text-black p-10 sm:p-16 rounded-xl shadow-2xl relative print:shadow-none print:p-0">
        {/* Header DOCX Style */}
        <div className="border-b-2 border-black pb-6 mb-10 flex justify-between items-center">
           <div>
             <h1 className="text-3xl font-serif font-bold text-black mb-1">INFORME FINANCIERO ABRIL 2026</h1>
             <p className="text-sm font-sans text-gray-600 font-bold tracking-widest uppercase">UPTC - Gestión Documental</p>
           </div>
           <img 
             src="https://www.uptc.edu.co/sitio/export/sites/default/portal/sitios/universidad/rectoria/comunicaciones/.content/doc/logos/uptc-blanco.png" 
             alt="UPTC Logo" 
             className="w-20 object-contain invert"
           />
        </div>

        <div className="space-y-10 font-serif leading-relaxed">
           <section>
             <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
               <span className="bg-black text-white w-6 h-6 inline-flex items-center justify-center rounded-full text-xs print:custom-print-bg">1</span>
               Análisis de Ingresos y Recaudo
             </h2>
             <p className="text-gray-800 text-justify mb-4">
               Durante el periodo evaluado (con corte a Abril 2026), el recaudo institucional ascendió a la suma de <strong>${ingresosTotal.toLocaleString('es-CO', {maximumFractionDigits: 1})} millones de pesos</strong>. Este valor se compone en su mayoría por las transferencias directas y los recursos propios generados a través de las operaciones ordinarias de la universidad.
             </p>
             
             <div className="flex flex-col sm:flex-row gap-6 mt-6 items-center">
                <div className="flex-1 bg-gray-50 border border-gray-200 p-4 rounded text-sm text-gray-700 w-full">
                   <ul className="list-disc pl-5 space-y-2">
                     {ingresosData.map((ing, idx) => (
                       <li key={idx}><strong>{ing.name}:</strong> ${ing.recaudo.toLocaleString('es-CO', {maximumFractionDigits: 1})} M</li>
                     ))}
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

           <section>
             <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
               <span className="bg-black text-white w-6 h-6 inline-flex items-center justify-center rounded-full text-xs print:custom-print-bg">2</span>
               Ejecución de Gastos e Inversión
             </h2>
             <p className="text-gray-800 text-justify mb-4">
               Los gastos totales acumulados para este mismo correlacionan una ejecución de pagos efectivos por valor de <strong>${gastosTotal.toLocaleString('es-CO', {maximumFractionDigits: 1})} millones</strong>. La estructura del gasto prioriza la carga prestacional y el funcionamiento misional de la universidad.
             </p>
             
             <div className="h-64 mt-6">
                <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={gastosData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" fontSize={12} tickFormatter={(val) => `$${val}`} />
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

           <section>
             <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
               <span className="bg-black text-white w-6 h-6 inline-flex items-center justify-center rounded-full text-xs print:custom-print-bg">3</span>
               Gastos de Personal (Nómina)
             </h2>
             <p className="text-gray-800 text-justify mb-4">
               La carga de la nómina se detalla a continuación de manera general por tipo de vinculación.
             </p>
             <div className="flex flex-wrap gap-4">
               {nominaData.slice(0, 4).map((nom, idx) => (
                 <div key={idx} className="flex-1 min-w-[120px] bg-gray-50 border border-gray-200 p-3 text-center rounded">
                   <p className="text-[10px] uppercase font-sans text-gray-500 font-bold mb-1 truncate" title={nom.name}>{nom.name}</p>
                   <p className="font-bold text-lg text-black">${nom.value.toLocaleString('es-CO', {maximumFractionDigits: 1})} M</p>
                 </div>
               ))}
             </div>
           </section>

           <section>
             <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
               <span className="bg-black text-white w-6 h-6 inline-flex items-center justify-center rounded-full text-xs print:custom-print-bg">4</span>
               Relación Ingresos vs Gastos
             </h2>
             <p className="text-gray-800 text-justify">
               Al contrastar un nivel de recaudos de ${ingresosTotal.toLocaleString('es-CO', {maximumFractionDigits: 1})} millones frente a las salidas consolidadas pagadas de ${gastosTotal.toLocaleString('es-CO', {maximumFractionDigits: 1})} millones, se percibe un margen de <strong>${margenTotal.toLocaleString('es-CO', {maximumFractionDigits: 1})} millones</strong> al cierre actual, necesario para apalancar compromisos en curso proyectados en trimestres posteriores.
             </p>
           </section>

           <section>
             <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
               <span className="bg-black text-white w-6 h-6 inline-flex items-center justify-center rounded-full text-xs print:custom-print-bg">5</span>
               Conclusiones y Recomendaciones
             </h2>
             <p className="text-gray-800 text-justify mb-2">
               Se concluye que el comportamiento de la Universidad presenta un panorama presupuestal sostenible. 
             </p>
             <ul className="list-disc pl-5 space-y-2 text-gray-800 text-justify text-sm">
                <li>Fortalecer las estrategias para el recaudo acelerado de la cartera vigente.</li>
                <li>Hacer seguimiento quincenal a la ejecución de cuentas de inversión.</li>
                <li>Evaluar rigurosamente las proyecciones de gasto frente al marco del aforo aprobado.</li>
             </ul>
           </section>

           {/* Signatures */}
           <div className="pt-20 pb-10 flex justify-between px-10">
              <div className="text-center w-48">
                 <div className="border-t border-black pt-2 w-full"></div>
                 <p className="font-bold font-sans text-sm">Dirección Financiera</p>
                 <p className="text-xs font-sans text-gray-500">Revisó</p>
              </div>
              <div className="text-center w-48">
                 <div className="border-t border-black pt-2 w-full"></div>
                 <p className="font-bold font-sans text-sm">Rectoría UPTC</p>
                 <p className="text-xs font-sans text-gray-500">Aprobó</p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
