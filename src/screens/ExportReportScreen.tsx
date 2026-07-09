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
        const ing = await fetchAndParseCSV('https://raw.githubusercontent.com/fabiancho0724/Nomina/7d0f179b8bbcd3d327235c8e7fe2a4f757424794/Ingresos.csv');
        const gas = await fetchAndParseCSV('https://raw.githubusercontent.com/fabiancho0724/Nomina/7d0f179b8bbcd3d327235c8e7fe2a4f757424794/Gastos.csv');
        const nom = await fetchAndParseCSV('https://raw.githubusercontent.com/fabiancho0724/Nomina/7d0f179b8bbcd3d327235c8e7fe2a4f757424794/Nomina.csv');
        
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
             src="https://raw.githubusercontent.com/fabiancho0724/VAFI-Reporte-Financiero/7601e17bbde30e0381cc947ff62d9345b0ec3853/uptc-blanco%20(1).png" 
             alt="UPTC Logo" 
             className="w-20 object-contain invert"
           />
        </div>

        <div className="space-y-10 font-serif leading-relaxed">
           <section className="mb-8">
             <h2 className="text-xl font-bold mb-4 font-sans uppercase tracking-wider text-black border-b border-gray-300 pb-2">
               Resumen Ejecutivo
             </h2>
             <p className="text-gray-800 text-justify mb-4">
               El presente informe tiene como propósito analizar el comportamiento financiero de la Universidad Pedagógica y Tecnológica de Colombia (UPTC) con corte al <strong>30 de junio de 2026</strong>. Se examina la incorporación y apropiación de los rubros de gasto conforme a lo establecido en los catálogos presupuestales No. 14 y 15.
             </p>
           </section>

           <section className="mb-8">
             <h2 className="text-xl font-bold mb-4 font-sans uppercase tracking-wider text-black border-b border-gray-300 pb-2">
               Metodología de Análisis
             </h2>
             <p className="text-gray-800 text-justify mb-4">
               Una vez consolidados los registros de ingresos y gastos de UPTC, se procede a su clasificación y organización conforme a las categorías definidas en el Catálogo Presupuestal vigente. Este proceso permite estructurar la información financiera de manera homogénea y facilitar su análisis.
             </p>
             <p className="text-gray-800 text-justify mb-4">
               Los ingresos se asignan a los conceptos correspondientes según el tipo de recurso, mientras que los gastos se agrupan en los rubros de Gastos de Personal, Gastos de Funcionamiento e Inversión. Posteriormente, se realiza un análisis de cada componente, teniendo en cuenta la unidad ejecutora y el recurso fuente de financiación asociado, lo cual permite una adecuada interpretación del comportamiento financiero institucional.
             </p>
             <p className="text-gray-800 text-justify mb-4">
               La información financiera se clasifica bajo la estructura del Catálogo Presupuestal, considerando los siguientes criterios:
             </p>
             <ul className="list-disc pl-5 space-y-2 text-gray-800 text-justify">
                <li><strong>Ingresos:</strong> Identificados bajo 18 tipos de recursos, excluyendo para este consolidado los correspondientes a Regalías (R15, SSF) y UNISALUD (R50).</li>
                <li><strong>Gastos:</strong> Agrupados en Gastos de Personal, Gastos de Funcionamiento e Inversión.</li>
                <li><strong>Procesamiento de la información:</strong> Los datos son extraídos del sistema GOOBI, lo que garantiza la trazabilidad entre el aforo inicial y el recaudo efectivo, así como la consistencia de los registros presupuestales y financieros.</li>
             </ul>
           </section>

           <section>
             <h2 className="text-xl font-bold mb-4 font-sans uppercase tracking-wider text-black border-b border-gray-300 pb-2">
               Análisis de Ingresos
             </h2>
             <p className="text-gray-800 text-justify mb-4">
               A continuación, se presenta el análisis comparativo entre el aforo y el recaudo, clasificado por tipo de recurso, con corte al <strong>30 de junio</strong>.
             </p>
             <p className="text-gray-800 text-justify mb-4">
               El recaudo total de la Universidad Pedagógica y Tecnológica de Colombia asciende a <strong>${ingresosTotal.toLocaleString('es-CO', {maximumFractionDigits: 1})} millones</strong>, lo que representa una ejecución del <strong>37,8 %</strong> frente al presupuesto aforado de <strong>$526.515,1 millones</strong>.
             </p>
             <p className="text-gray-800 text-justify mb-4">
               Del total recaudado, <strong>$25.958,7 millones</strong> corresponden a recursos del balance, el <strong>13%</strong> del ingreso.
             </p>
             
             <div className="flex flex-col sm:flex-row gap-6 mt-6 items-center">
                <div className="flex-1 bg-gray-50 border border-gray-200 p-4 rounded text-sm text-gray-700 w-full">
                   <ul className="list-disc pl-5 space-y-2">
                     <li><strong>Aportes de la Nación:</strong> $125.518,3 M (72,4% del total de ingresos)</li>
                     <li><strong>Matrículas Pregrado y Otras Rentas:</strong> $9.200,1 M</li>
                     <li><strong>Posgrados, Convenios y Extensión:</strong> $36.931,0 M</li>
                     <li><strong>Estampilla Pro UPTC:</strong> $1.605,1 M</li>
                     <li><strong>Recursos del balance:</strong> $25.958,7 M</li>
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
             <h2 className="text-xl font-bold mb-4 font-sans uppercase tracking-wider text-black border-b border-gray-300 pb-2">
               Análisis de Gasto
             </h2>
             <p className="text-gray-800 text-justify mb-4">
               Con corte al <strong>30 de junio</strong> y conforme a lo establecido en el Catálogo Presupuestal No. 14, que define la estructura del gasto, se incluyen los gastos de personal (2.1.1), los gastos de funcionamiento (2.1.2) y los gastos de inversión (2.3), entre otros conceptos.
             </p>
             <p className="text-gray-800 text-justify mb-4">
               El pago efectivo alcanza un valor total de <strong>${gastosTotal.toLocaleString('es-CO', {maximumFractionDigits: 1})} millones</strong> frente a una apropiación total de <strong>$526.515,1 millones</strong>. Se observa que la mayor participación corresponde a los gastos de personal, con <strong>$82.530,2 millones</strong>. Es importante mencionar de igual manera que a la fecha de corte de este informe el compromiso de los gastos de la universidad corresponde a <strong>$199.818,9 millones</strong>.
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
             <h2 className="text-xl font-bold mb-4 font-sans uppercase tracking-wider text-black border-b border-gray-300 pb-2">
               Gastos de Personal (2.1.1)
             </h2>
             <p className="text-gray-800 text-justify mb-4">
               Los gastos clasificados en el presupuesto como 2.1.1 Gastos de Personal registran un pago total de <strong>$82.530,2 millones</strong>, equivalente al <strong>22,3 %</strong> de la ejecución. El mayor volumen de pagos corresponde al personal docente de planta, alcanzando un valor de <strong>$23.680,0 millones</strong>; en segundo lugar, se encuentra el personal docente ocasional, con pagos por <strong>$21.773,8 millones</strong>.
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

           <section className="mb-8">
             <h2 className="text-xl font-bold mb-4 font-sans uppercase tracking-wider text-black border-b border-gray-300 pb-2">
               Gastos de Funcionamiento e Inversión
             </h2>
             <p className="text-gray-800 text-justify mb-4">
               <strong>Gastos de Funcionamiento (2.1.2):</strong> Los pagos efectivos a la fecha de corte ascienden a un total de <strong>$23.261,9 millones</strong>. La mayor participación se concentra en el rubro de contratos, con un valor de <strong>$9.174,6 millones</strong>. El compromiso de estos gastos asciende a <strong>$102.120,1 millones</strong>.
             </p>
             <p className="text-gray-800 text-justify mb-4">
               <strong>Gastos de Inversión (2.3):</strong> El componente de inversión presenta un pago efectivo de <strong>$2.986,9 millones</strong>, equivalente a una ejecución del <strong>16,9%</strong>. A la fecha de corte, los gastos de inversión registran un compromiso de <strong>$13.717,4 millones</strong>.
             </p>
           </section>

           {/* Signatures */}
           <div className="pt-20 pb-10 flex flex-col items-center">
              <div className="text-center w-64">
                 <div className="border-t border-black pt-2 w-full"></div>
                 <p className="font-bold font-sans text-sm mt-2">LUIS ÁNGEL LARA GONZÁLEZ</p>
                 <p className="text-xs font-sans text-gray-500">Vicerrector Administrativo y Financiero</p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
