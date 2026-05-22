import { useState, useEffect } from 'react';
import { Download, Filter, Wallet, Component, Network, Layers, LayoutList, Settings, TrendingUp, CheckCircle, Clock, Upload, AlertTriangle, PieChart as PieChartIcon, ChevronDown, ChevronUp } from 'lucide-react';
import { fetchAndParseCSV, groupAndSum, getNumericColumn, getCategoryColumn } from '../lib/csvParser';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

export function DashboardScreen({ onNavigate }: { onNavigate: (s: string) => void }) {
  const [dataStage, setDataStage] = useState<'loading' | 'ready'>('loading');
  
  const [ingresosTotal, setIngresosTotal] = useState(173254.7);
  const [ingresosAforado, setIngresosAforado] = useState(170665.2);
  const [ingresosRecaudado, setIngresosRecaudado] = useState(173254.7);
  const [gastosTotal, setGastosTotal] = useState(110225.5);
  const [gastosComprometido, setGastosComprometido] = useState(199818.9);
  const [gastosPagado, setGastosPagado] = useState(110225.5);
  
  const [ingresosGroups, setIngresosGroups] = useState<any[]>([]);
  const [gastosGroups, setGastosGroups] = useState<any[]>([]);
  const [gastosRecursosGroups, setGastosRecursosGroups] = useState<any[]>([]);
  const [gastosTiposGroups, setGastosTiposGroups] = useState<any[]>([]);
  const [gastosReferenciasGroups, setGastosReferenciasGroups] = useState<any[]>([]);
  const [expandedGastoGroup, setExpandedGastoGroup] = useState<string | null>(null);
  const [expandedGastoCardGroup, setExpandedGastoCardGroup] = useState<string | null>(null);
  const [nominaGroups, setNominaGroups] = useState<any[]>([]);
  const [rawIngresos, setRawIngresos] = useState<any[]>([]);
  const [ingresosTiposGroups, setIngresosTiposGroups] = useState<any[]>([]);
  const [expandedIngresoGroup, setExpandedIngresoGroup] = useState<string | null>(null);
  const [expandedPieGroup, setExpandedPieGroup] = useState<string | null>(null); // New state for interactive pie
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined); // New state for pie hover
  const [recursoFiltro, setRecursoFiltro] = useState<string>('Todos'); // 'Todos' | 'Recursos UPTC' | 'Recursos del Balance'

  // Keep track of loaded files for manual uploads
  const [manualData, setManualData] = useState<{ingresos: any[], gastos: any[], nomina: any[]}>({
    ingresos: [], gastos: [], nomina: []
  });

  useEffect(() => {
    if (rawIngresos && rawIngresos.length > 0) {
      const firstRowKeysDef = Object.keys(rawIngresos[0]);
      if (firstRowKeysDef.length >= 10) {
        const aforoCol = firstRowKeysDef[5]; // index 5 for col 6
        const recaudoCol = firstRowKeysDef[6]; // index 6 for col 7
        const tipoCol = firstRowKeysDef[3]; // index 3 for col 4 (agrupación Análisis) 
        const filterCol = firstRowKeysDef[9]; // index 9 for col 10 (filtro general)
        const recursoCol = firstRowKeysDef[2]; // index 2 for col 3 Recurso (used for details)

        const filteredData = recursoFiltro === 'Todos' ? rawIngresos : rawIngresos.filter(r => r[filterCol] === recursoFiltro);

        const aforoSum = filteredData.reduce((acc, row) => acc + (parseFloat(row[aforoCol]) || 0), 0);
        const recaudoSum = filteredData.reduce((acc, row) => acc + (parseFloat(row[recaudoCol]) || 0), 0);
        
        if (aforoSum > 0) setIngresosAforado(aforoSum / 1e6);
        if (recaudoSum > 0) {
           setIngresosRecaudado(recaudoSum / 1e6);
           setIngresosTotal(recaudoSum / 1e6); 
        }

        // Group by Tipo de Ingreso
        const tipos = Array.from(new Set(filteredData.map(r => r[tipoCol]))).filter(Boolean);
        const parsedTiposGroups = tipos.map(tipo => {
           const rows = filteredData.filter(r => r[tipoCol] === tipo);
           const tAforo = rows.reduce((acc, r) => acc + (parseFloat(r[aforoCol]) || 0), 0) / 1e6;
           const tRecaudo = rows.reduce((acc, r) => acc + (parseFloat(r[recaudoCol]) || 0), 0) / 1e6;
           
           const recursosKeys = Array.from(new Set(rows.map(r => r[recursoCol]))).filter(Boolean);
           const recursosItems = recursosKeys.map(rec => {
               const recRows = rows.filter(r => r[recursoCol] === rec);
               const rAforo = recRows.reduce((acc, r) => acc + (parseFloat(r[aforoCol]) || 0), 0) / 1e6;
               const rRecaudo = recRows.reduce((acc, r) => acc + (parseFloat(r[recaudoCol]) || 0), 0) / 1e6;
               return { name: rec, aforo: rAforo, recaudo: rRecaudo };
           }).sort((a, b) => b.recaudo - a.recaudo);

           return { 
               name: tipo, 
               aforo: tAforo, 
               recaudo: tRecaudo, 
               recursos: recursosItems 
           };
        }).sort((a,b) => b.recaudo - a.recaudo);
        setIngresosTiposGroups(parsedTiposGroups);
      }
    }
  }, [rawIngresos, recursoFiltro]);

  useEffect(() => {
    async function loadData() {
      try {
        const ingresosData = await fetchAndParseCSV('https://raw.githubusercontent.com/fabiancho0724/VAFI-Reporte-Financiero/25bab426e66c86cc3e877f13a848afe2fc93b019/Ingresos.csv');
        const gastosData = await fetchAndParseCSV('https://raw.githubusercontent.com/fabiancho0724/VAFI-Reporte-Financiero/8ea7abfbc3d504ea4280d246aa5e02dcc82b59f9/Gastos.csv');
        const nominaData = await fetchAndParseCSV('https://raw.githubusercontent.com/fabiancho0724/VAFI-Reporte-Financiero/main/Nomina.csv');
        
        processData(ingresosData, gastosData, nominaData);
      } catch (err: any) {
        console.warn('Network fetch failed (likely private repo), falling back to simulated data.', err);
        const fallbackIngresos = [
          { concepto: 'Aportes de la Nación', valor: 110500000000 },
          { concepto: 'Recursos Propios (Matrículas)', valor: 42000000000 },
          { concepto: 'Estampilla Pro-UPTC', valor: 15500000000 },
          { concepto: 'Otros Ingresos', valor: 5254700000 },
        ];
        const fallbackGastos = [
          { concepto: 'Gastos Generales y Servicios', valor: 15238600000 },
          { concepto: 'Inversión y Proyectos', valor: 2986900000 },
        ];
        const fallbackNomina = [
          { tipo_vinculacion: 'Docentes de Planta', valor: 45000000000 },
          { tipo_vinculacion: 'Docentes Ocasionales', valor: 22000000000 },
          { tipo_vinculacion: 'Personal Administrativo', valor: 13000000000 },
          { tipo_vinculacion: 'Docentes Catedráticos', valor: 12000000000 },
        ];
        processData(fallbackIngresos, fallbackGastos, fallbackNomina);
      }
    }
    loadData();
  }, []);

  const processData = (ingresosData: any[], gastosData: any[], nominaData: any[]) => {
    let ingSum = 0, gasSum = 0, nomSum = 0;
    
    if (ingresosData && ingresosData.length > 0) {
      setRawIngresos(ingresosData);
    }
    
    if (gastosData && gastosData.length > 0) {
      const gasNumCol = getNumericColumn(gastosData) || 'valor';
      const gasCatCol = getCategoryColumn(gastosData) || 'concepto';
      gasSum = gastosData.reduce((acc, row) => acc + (parseFloat(row[gasNumCol]) || 0), 0);
      setGastosGroups(groupAndSum(gastosData, gasCatCol, gasNumCol));

      const firstRowKeys = Object.keys(gastosData[0]);
      if (firstRowKeys.length >= 12) {
        const compCol = firstRowKeys[10]; // index 10 for col K
        const pagoCol = firstRowKeys[11]; // index 11 for col L
        const apropCol = firstRowKeys[10]; // fallback
        const catCol9 = firstRowKeys[7];  // index 7 for col H
        const catCol10 = firstRowKeys[8]; // index 8 for col I

        const compSum = gastosData.reduce((acc, row) => acc + (parseFloat(row[compCol]) || 0), 0);
        const pagoSum = gastosData.reduce((acc, row) => acc + (parseFloat(row[pagoCol]) || 0), 0);
        
        if (compSum > 0) setGastosComprometido(compSum / 1e6);
        if (pagoSum > 0) setGastosPagado(pagoSum / 1e6);

        // create custom group by col 10 (Recursos), summing pagoCol (Pagado)
        setGastosRecursosGroups(groupAndSum(gastosData, catCol10, pagoCol).sort((a: any, b: any) => b.value - a.value));
        
        // custom grouping for categorisation from col 9
        setGastosGroups(groupAndSum(gastosData, catCol9, pagoCol).sort((a: any, b: any) => b.value - a.value));

        // Group by Tipo de Gasto (Clasificacion)
        const gTipos = Array.from(new Set(gastosData.map(r => r[catCol9]))).filter(Boolean);
        const parsedGastoTiposGroups = gTipos.map(tipo => {
           const rows = gastosData.filter(r => r[catCol9] === tipo);
           const tComp = rows.reduce((acc, r) => acc + (parseFloat(r[compCol]) || 0), 0) / 1e6;
           const tPago = rows.reduce((acc, r) => acc + (parseFloat(r[pagoCol]) || 0), 0) / 1e6;
           
           const recursosKeys = Array.from(new Set(rows.map(r => r[catCol10]))).filter(Boolean);
           const recursosItems = recursosKeys.map(rec => {
               const recRows = rows.filter(r => r[catCol10] === rec);
               const rComp = recRows.reduce((acc, r) => acc + (parseFloat(r[compCol]) || 0), 0) / 1e6;
               const rPago = recRows.reduce((acc, r) => acc + (parseFloat(r[pagoCol]) || 0), 0) / 1e6;
               return { name: rec, compromiso: rComp, pago: rPago };
           }).sort((a, b) => b.pago - a.pago);

           return { 
               name: tipo, 
               compromiso: tComp, 
               pago: tPago, 
               recursos: recursosItems 
           };
        }).sort((a,b) => b.pago - a.pago);
        setGastosTiposGroups(parsedGastoTiposGroups);

        // Group by Referencia (col 2)
        const catCol2 = firstRowKeys[2];
        const gRef = Array.from(new Set(gastosData.map(r => r[catCol2]))).filter(Boolean);
        const parsedGastoReferenciasGroups = gRef.map(ref => {
           const rows = gastosData.filter(r => r[catCol2] === ref);
           const tComp = rows.reduce((acc, r) => acc + (parseFloat(r[compCol]) || 0), 0) / 1e6;
           const tPago = rows.reduce((acc, r) => acc + (parseFloat(r[pagoCol]) || 0), 0) / 1e6;
           
           const recursosKeys = Array.from(new Set(rows.map(r => r[catCol10]))).filter(Boolean);
           const recursosItems = recursosKeys.map(rec => {
               const recRows = rows.filter(r => r[catCol10] === rec);
               const rComp = recRows.reduce((acc, r) => acc + (parseFloat(r[compCol]) || 0), 0) / 1e6;
               const rPago = recRows.reduce((acc, r) => acc + (parseFloat(r[pagoCol]) || 0), 0) / 1e6;
               return { name: rec, compromiso: rComp, pago: rPago };
           }).sort((a, b) => b.pago - a.pago);

           return { 
               name: ref, 
               compromiso: tComp, 
               pago: tPago, 
               recursos: recursosItems 
           };
        }).sort((a,b) => b.pago - a.pago);
        setGastosReferenciasGroups(parsedGastoReferenciasGroups);
      }
    }
    
    if (nominaData && nominaData.length > 0) {
      const nomNumCol = getNumericColumn(nominaData) || 'valor';
      const nomCatCol = getCategoryColumn(nominaData) || 'tipo_vinculacion';
      nomSum = nominaData.reduce((acc, row) => acc + (parseFloat(row[nomNumCol]) || 0), 0);
      setNominaGroups(groupAndSum(nominaData, nomCatCol, nomNumCol));
    }
    
    if (ingSum > 0) setIngresosTotal(ingSum / 1e6); // Scale to millions
    if (gasSum > 0 || nomSum > 0) setGastosTotal((gasSum + nomSum) / 1e6); // Nomina is part of expenses
    
    setDataStage('ready');
  };

  const handleManualUpload = async (name: string, file: File) => {
    const { parseLocalCSV } = await import('../lib/csvParser');
    const parsed = await parseLocalCSV(file);
    const newData = { ...manualData, [name.toLowerCase()]: parsed };
    setManualData(newData);
    processData(newData.ingresos, newData.gastos, newData.nomina);
  };

  if (dataStage === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <div className="w-12 h-12 border-4 border-primary-container border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-on-surface-variant font-mono animate-pulse">Cargando orígenes de datos...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col mb-20 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <p className="text-primary-container text-xs uppercase tracking-widest font-bold mb-1">UPTC - VAFI</p>
          <h2 className="text-[32px] md:text-4xl font-bold font-display text-white">Consolidado Financiero - Corte 30 de Abril</h2>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => onNavigate('reports')}
            className="bg-primary-container text-on-primary-container px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:brightness-110 shadow-[0_4px_15px_rgba(255,204,41,0.2)] transition-all active:scale-95"
          >
            <Download size={18} />
            Exportar PDF
          </button>
          <button className="bg-surface-container-high/50 text-white border border-white/10 px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-surface-container-highest transition-all">
            <Filter size={18} />
          </button>
        </div>
      </div>

      {/* Equilibrio Presupuestal */}
      <div className="mb-10 glass-card rounded-[32px] p-8 border border-white/10 glow-primary relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary-container via-secondary to-[#4ade80]"></div>
        
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
          <div>
            <h3 className="text-2xl font-display font-bold text-white flex items-center gap-2">
              <PieChartIcon className="text-primary-container" size={24} />
              Equilibrio Presupuestal
            </h3>
            <p className="text-on-surface-variant text-sm mt-1">Relación entre recaudo total, compromisos y pagos efectivos</p>
          </div>
          
          <div className="bg-white/5 rounded-2xl p-6 border border-white/10 text-center min-w-[250px] shadow-lg">
            <span className="text-xs text-on-surface-variant uppercase tracking-widest font-bold block mb-2">Recaudo Total</span>
            <span className="text-4xl font-display font-bold text-white">${ingresosRecaudado.toLocaleString('es-CO', {maximumFractionDigits: 1})} <span className="text-base font-sans text-on-surface-variant font-normal">mill</span></span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Relación con Compromisos */}
          <div className="bg-surface/50 rounded-2xl p-6 border border-white/5 flex flex-col justify-between">
            <div className="flex justify-between items-start mb-6">
              <div>
                <span className="text-xs text-secondary uppercase tracking-widest font-bold flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full bg-secondary"></span>
                  Frente al Compromiso
                </span>
                <span className="text-2xl font-bold text-white">${gastosComprometido.toLocaleString('es-CO', {maximumFractionDigits: 1})} <span className="text-xs font-normal">mill</span></span>
              </div>
              <div className="text-right">
                <span className="text-xs text-on-surface-variant block mb-1">Ejecución</span>
                <span className="text-xl font-mono font-bold text-white">{ingresosRecaudado > 0 ? ((gastosComprometido / ingresosRecaudado) * 100).toFixed(1) : '0'}%</span>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full h-3 bg-white/10 rounded-full mb-6 overflow-hidden flex">
              <div className="h-full bg-secondary rounded-full" style={{ width: `${Math.min(100, ingresosRecaudado > 0 ? (gastosComprometido / ingresosRecaudado) * 100 : 0)}%` }}></div>
            </div>
            
            <div className="pt-4 flex justify-between items-center text-sm">
              <span className="text-on-surface-variant">Valor Disponible (Comprometido)</span>
              <span className={`font-bold px-3 py-1 rounded-lg ${ingresosRecaudado - gastosComprometido >= 0 ? "text-[#4ade80] bg-[#4ade80]/10" : "text-[#ff5b5b] bg-[#ff5b5b]/10"}`}>${(ingresosRecaudado - gastosComprometido).toLocaleString('es-CO', {maximumFractionDigits: 1})} mill</span>
            </div>
          </div>

          {/* Relación con Pagos */}
          <div className="bg-surface/50 rounded-2xl p-6 border border-white/5 flex flex-col justify-between">
            <div className="flex justify-between items-start mb-6">
              <div>
                <span className="text-xs text-[#ffcc29] uppercase tracking-widest font-bold flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full bg-[#ffcc29]"></span>
                  Frente al Pago Efectivo
                </span>
                <span className="text-2xl font-bold text-white">${gastosPagado.toLocaleString('es-CO', {maximumFractionDigits: 1})} <span className="text-xs font-normal">mill</span></span>
              </div>
              <div className="text-right">
                <span className="text-xs text-on-surface-variant block mb-1">Ejecución</span>
                <span className="text-xl font-mono font-bold text-white">{ingresosRecaudado > 0 ? ((gastosPagado / ingresosRecaudado) * 100).toFixed(1) : '0'}%</span>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full h-3 bg-white/10 rounded-full mb-6 overflow-hidden flex">
              <div className="h-full bg-[#ffcc29] rounded-full" style={{ width: `${Math.min(100, ingresosRecaudado > 0 ? (gastosPagado / ingresosRecaudado) * 100 : 0)}%` }}></div>
            </div>
            
            <div className="pt-4 flex justify-between items-center text-sm">
              <span className="text-on-surface-variant">Valor Disponible (Caja)</span>
              <span className={`font-bold px-3 py-1 rounded-lg ${ingresosRecaudado - gastosPagado >= 0 ? "text-[#4ade80] bg-[#4ade80]/10" : "text-[#ff5b5b] bg-[#ff5b5b]/10"}`}>${(ingresosRecaudado - gastosPagado).toLocaleString('es-CO', {maximumFractionDigits: 1})} mill</span>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-10">
        <div className="glass-card rounded-[32px] p-8 flex flex-col sm:flex-row items-center gap-8 glow-primary">
          <div className="relative w-40 h-40 flex items-center justify-center shrink-0">
            <svg className="w-full h-full">
              <circle cx="80" cy="80" r="70" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="12" />
              <circle className="progress-ring-circle" cx="80" cy="80" r="70" fill="transparent" stroke="#ffcc29" strokeWidth="12" strokeDasharray="440" strokeDashoffset="288" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-white">34.6%</span>
              <span className="text-xs text-on-surface-variant font-medium">Meta</span>
            </div>
          </div>
          <div className="flex-1 w-full">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-primary-container"></span>
              <span className="text-xs text-primary-container uppercase font-bold tracking-widest">Recaudo Total</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 mt-4">
              <div>
                <span className="text-xs text-on-surface-variant uppercase tracking-widest block mb-1">Valor Aforado</span>
                <span className="text-3xl font-display font-bold text-white">${ingresosAforado.toLocaleString('es-CO', {maximumFractionDigits: 1})} <span className="text-sm font-sans text-on-surface-variant font-normal">mill</span></span>
              </div>
              <div className="pl-0 sm:pl-8 sm:border-l border-white/10">
                <span className="text-xs text-on-surface-variant uppercase tracking-widest block mb-1">Recaudado</span>
                <span className="text-3xl font-display font-bold text-primary-container">${ingresosRecaudado.toLocaleString('es-CO', {maximumFractionDigits: 1})} <span className="text-sm font-sans text-on-surface-variant font-normal">mill</span></span>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-[32px] p-8 flex flex-col sm:flex-row items-center gap-8">
          <div className="relative w-40 h-40 flex items-center justify-center shrink-0">
            <svg className="w-full h-full">
              <circle cx="80" cy="80" r="70" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="12" />
              <circle className="progress-ring-circle" cx="80" cy="80" r="70" fill="transparent" stroke="#7bd0ff" strokeWidth="12" strokeDasharray="440" strokeDashoffset="341" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-white">22.5%</span>
              <span className="text-xs text-on-surface-variant font-medium">Ejecutado</span>
            </div>
          </div>
          <div className="flex-1 w-full">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-secondary"></span>
              <span className="text-xs text-secondary uppercase font-bold tracking-widest">Total Gasto</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 mt-4">
              <div>
                <span className="text-xs text-on-surface-variant uppercase tracking-widest block mb-1">Comprometido</span>
                <span className="text-3xl font-display font-bold text-white">${gastosComprometido.toLocaleString('es-CO', {maximumFractionDigits: 1})} <span className="text-sm font-sans text-on-surface-variant font-normal">mill</span></span>
              </div>
              <div className="pl-0 sm:pl-8 sm:border-l border-white/10">
                <span className="text-xs text-on-surface-variant uppercase tracking-widest block mb-1">Pago Efectivo</span>
                <span className="text-3xl font-display font-bold text-secondary">${gastosPagado.toLocaleString('es-CO', {maximumFractionDigits: 1})} <span className="text-sm font-sans text-on-surface-variant font-normal">mill</span></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Rubros Section Header */}
      <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h3 className="text-xl font-display text-white flex items-center gap-2 font-medium">
          <Wallet className="text-primary-container" size={24} />
          Análisis de Ingresos
        </h3>
        <div className="flex bg-white/5 rounded-lg p-1 border border-white/10">
          <button 
            onClick={() => setRecursoFiltro('Todos')}
            className={`px-3 py-1 text-xs font-mono rounded-md transition-colors ${recursoFiltro === 'Todos' ? 'bg-primary-container text-on-primary-container font-bold' : 'text-on-surface-variant hover:text-white'}`}>
            Todos
          </button>
          <button 
             onClick={() => setRecursoFiltro('Recursos UPTC')}
             className={`px-3 py-1 text-xs font-mono rounded-md transition-colors ${recursoFiltro === 'Recursos UPTC' ? 'bg-primary-container text-on-primary-container font-bold' : 'text-on-surface-variant hover:text-white'}`}>
             Recursos UPTC
          </button>
          <button 
             onClick={() => setRecursoFiltro('Recursos del Balance')}
             className={`px-3 py-1 text-xs font-mono rounded-md transition-colors ${recursoFiltro === 'Recursos del Balance' ? 'bg-primary-container text-on-primary-container font-bold' : 'text-on-surface-variant hover:text-white'}`}>
             Recursos del Balance
          </button>
        </div>
      </div>

      {/* Ingresos Analysis (Recursos y Conceptos) */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-10">
        {(ingresosTiposGroups.length > 0 ? ingresosTiposGroups.map((g, idx) => ({
           id: `R-${(idx+1)*10}`,
           title: g.name,
           sub: 'CLASIFICACIÓN DE INGRESO',
           presupuesto: g.aforo.toLocaleString('es-CO', {maximumFractionDigits: 1}),
           recaudo: g.recaudo.toLocaleString('es-CO', {maximumFractionDigits: 1}),
           pct: g.aforo > 0 ? ((g.recaudo / g.aforo) * 100).toFixed(1) + '%' : '0%',
           color: idx % 4 === 0 ? 'from-[#ffcc29] to-[#ffcc29]/70' : idx % 4 === 1 ? 'from-[#7bd0ff] to-[#7bd0ff]/70' : idx % 4 === 2 ? 'from-secondary to-secondary/70' : 'from-[#ff5b5b] to-[#ff5b5b]/70',
           baseColor: idx % 4 === 0 ? '#ffcc29' : idx % 4 === 1 ? '#7bd0ff' : idx % 4 === 2 ? '#d0bcff' : '#ff5b5b',
           recursos: g.recursos || [],
           subItems: (g.recursos || []).slice(0, 2).map((r: any) => ({ label: r.name, value: r.recaudo.toLocaleString('es-CO', {maximumFractionDigits: 1}) }))
        })) : [
           { 
              id: 'R-10', 
              title: 'Recursos Nación', 
              sub: 'APORTES DE LA NACIÓN', 
              presupuesto: '375.664,4', 
              recaudo: '125.518,3', 
              pct: '33.4%', 
              color: 'from-[#ffcc29] to-[#ffcc29]/70',
              baseColor: '#ffcc29',
              recursos: [],
              subItems: [
                { label: 'Funcionamiento', value: '115.282,8' },
                { label: 'Inversión', value: '7.745,0' }
              ]
           },
           { 
              id: 'R-20', 
              title: 'Recursos Propios', 
              sub: 'MATRÍCULAS PREGRADO / OTRAS RENTAS', 
              presupuesto: '21.887,5', 
              recaudo: '9.200,1', 
              pct: '48.0%', 
              color: 'from-[#7bd0ff] to-[#7bd0ff]/70',
              baseColor: '#7bd0ff',
              recursos: [],
              subItems: [
                { label: 'Pregrado', value: '4.737,0' },
                { label: 'Otros Ingresos Propios', value: '4.949,4' }
              ]
           },
           { 
              id: 'R-30', 
              title: 'Extensión y Posgrados', 
              sub: 'POSGRADOS, CONVENIOS Y EDUCACIÓN CONTINUADA', 
              presupuesto: '87.508,6', 
              recaudo: '36.931,0', 
              pct: '38.0%', 
              color: 'from-secondary to-secondary/70',
              baseColor: '#d0bcff',
              recursos: [],
              subItems: [
                { label: 'Posgrados', value: '18.466,2' },
                { label: 'Convenios', value: '15.154,2' }
              ]
           },
           { 
              id: 'R-40', 
              title: 'Estampilla PRO-UPTC', 
              sub: 'PRO DESARROLLO DE LA UPTC', 
              presupuesto: '4.206,4', 
              recaudo: '1.605,1', 
              pct: '38.1%', 
              color: 'from-[#ff5b5b] to-[#ff5b5b]/70',
              baseColor: '#ff5b5b',
              recursos: [],
              subItems: [
                { label: 'Recaudo Total', value: '1.605,1' }
              ]
           },
        ]).map((rubro) => {
           const isExpanded = expandedIngresoGroup === rubro.id;
           return (
           <div key={rubro.id} className="glass-card rounded-[24px] p-6 flex flex-col relative overflow-hidden transition-all duration-300">
             {/* Visual Indicator */}
             <div className={`absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b ${rubro.color}`}></div>
             
             <div className="flex flex-col md:flex-row gap-6">
                {/* Left side: Main Stats */}
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-xl font-display font-bold text-white">{String(rubro.title || '')}</h4>
                    </div>
                    <p className="text-[10px] text-on-surface-variant font-mono tracking-widest uppercase mb-6 truncate" title={rubro.sub}>{rubro.sub}</p>
                  </div>

                  <div className="space-y-4">
                    <div>
                       <span className="text-xs text-on-surface-variant block mb-1">Presupuestado Inicial</span>
                       <span className="text-2xl font-bold font-mono text-white">${rubro.presupuesto} <span className="text-xs font-sans text-on-surface-variant font-normal">mill.</span></span>
                    </div>
                    <div>
                       <span className="text-xs text-on-surface-variant block mb-1">Recaudo</span>
                       <span className="text-3xl font-display font-bold text-primary-container">${rubro.recaudo} <span className="text-xs font-sans text-on-surface-variant font-normal">mill.</span></span>
                    </div>
                  </div>
                </div>

                {/* Right side: Chart & Details */}
                <div className="w-full md:w-56 flex flex-col items-center justify-center shrink-0 border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-6">
                  <div className="relative w-28 h-28 flex items-center justify-center mb-4">
                     <svg className="w-full h-full -rotate-90">
                        <circle cx="56" cy="56" r="48" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="12" />
                        <circle 
                           className="progress-ring-circle" 
                           cx="56" cy="56" r="48" 
                           fill="transparent" 
                           stroke="currentColor" 
                           strokeWidth="12" 
                           strokeDasharray="301" 
                           strokeDashoffset={301 - (301 * parseFloat(rubro.pct || '0') / 100)} 
                           style={{ color: rubro.baseColor }}
                        />
                     </svg>
                     <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-xl font-bold text-white">{rubro.pct}</span>
                     </div>
                  </div>

                  <div className="w-full space-y-2">
                    {rubro.subItems.map((item: any, idx: number) => (
                      <div key={idx} className="bg-white/5 px-3 py-2 rounded-lg flex justify-between items-center w-full">
                         <span className="text-[10px] text-on-surface-variant uppercase truncate mr-2" title={item.label}>{String(item.label || '')}</span>
                         <span className="text-xs font-bold text-white whitespace-nowrap">${item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
             </div>

             {/* Expanded Resources View */}
             {rubro.recursos && rubro.recursos.length > 0 && (
               <div className="mt-4 pt-4 border-t border-white/10 w-full">
                 <button 
                   onClick={() => setExpandedIngresoGroup(isExpanded ? null : rubro.id)}
                   className="w-full flex items-center justify-center gap-2 text-xs font-mono text-on-surface-variant hover:text-white transition-colors bg-white/5 hover:bg-white/10 py-2 rounded-lg"
                 >
                   {isExpanded ? (
                     <><ChevronUp size={16} /> Ocultar Recursos</>
                   ) : (
                     <><ChevronDown size={16} /> Ver Todos los Recursos ({rubro.recursos.length})</>
                   )}
                 </button>
                 
                 {isExpanded && (
                   <div className="mt-4 space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                     <div className="flex justify-between items-center px-4 py-2 text-[10px] font-mono text-on-surface-variant/70 uppercase">
                       <span className="flex-1">Nombre del Recurso</span>
                       <span className="w-24 text-right">Inicial</span>
                       <span className="w-24 text-right">Recaudo</span>
                     </div>
                     {rubro.recursos.map((rec: any, idx: number) => (
                       <div key={idx} className="flex justify-between items-center bg-white/5 hover:bg-white/10 transition-colors px-4 py-3 rounded-lg w-full">
                         <span className="text-xs text-white truncate flex-1 mr-4" title={rec.name}>{String(rec.name || '')}</span>
                         <span className="text-xs font-mono text-on-surface-variant w-24 text-right">${rec.aforo.toLocaleString('es-CO', {maximumFractionDigits: 1})}</span>
                         <span className="text-xs font-bold text-primary-container w-24 text-right">${rec.recaudo.toLocaleString('es-CO', {maximumFractionDigits: 1})}</span>
                       </div>
                     ))}
                   </div>
                 )}
               </div>
             )}
           </div>
        )}
        )}
      </div>

      <div className="w-full mb-12">
        <div className="w-full min-h-[500px] glass-card rounded-[32px] p-8 md:p-12 border border-white/10 glow-secondary bg-[#1a1a1a] relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-container via-secondary to-[#4ade80]"></div>
             <h3 className="text-3xl font-display font-medium text-white mb-2 text-center uppercase tracking-wider">Peso de Ingresos por Recurso</h3>
             <p className="text-sm font-mono text-on-surface-variant text-center mb-10 mt-4">Selecciona un segmento para ver los recursos que lo componen</p>
             
             {(() => {
                const pieData = ingresosTiposGroups.length > 0 ? ingresosTiposGroups.map((g, idx) => ({
                    name: String(g.name || ''),
                    value: g.recaudo,
                    pct: g.aforo > 0 ? (g.recaudo / g.aforo) * 100 : 0,
                    recursos: g.recursos || [],
                    fill: idx % 4 === 0 ? '#4ade80' : idx % 4 === 1 ? '#f43f5e' : idx % 4 === 2 ? '#8b5cf6' : '#ffcc29'
                })) : [
                    { name: 'Nación', value: 125518.3, pct: 33.4, fill: '#4ade80', recursos: [] },
                    { name: 'Propios', value: 9200.1, pct: 48.0, fill: '#f43f5e', recursos: [] },
                    { name: 'Posgrados/Extensión', value: 36931.0, pct: 38.0, fill: '#8b5cf6', recursos: [] },
                    { name: 'Estampilla', value: 1605.1, pct: 38.1, fill: '#ffcc29', recursos: [] },
                ];
                
                const activeItem = expandedPieGroup ? pieData.find(d => d.name === expandedPieGroup) : null;
                const totalRecaudo = pieData.reduce((acc, curr) => acc + curr.value, 0);

                return (
                  <div className={`grid grid-cols-1 ${expandedPieGroup ? 'lg:grid-cols-2' : ''} gap-12 transition-all duration-500 items-center`}>
                     <div className="h-[400px] w-full cursor-pointer relative flex items-center justify-center">
                         <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={0}
                                outerRadius={expandedPieGroup ? 140 : 180}
                                paddingAngle={2}
                                dataKey="value"
                                stroke="none"
                                onClick={(data) => setExpandedPieGroup(data.name === expandedPieGroup ? null : data.name)}
                                onMouseEnter={(_, index) => setActiveIndex(index)}
                                onMouseLeave={() => setActiveIndex(undefined)}
                              >
                                {pieData.map((entry, index) => (
                                   <Cell 
                                      key={`cell-${index}`} 
                                      fill={entry.fill} 
                                      className="transition-all duration-300 hover:brightness-110"
                                      style={{
                                        filter: activeIndex === index || expandedPieGroup === entry.name ? `drop-shadow(0px 10px 20px ${entry.fill}80)` : 'drop-shadow(0px 4px 8px rgba(0,0,0,0.5))',
                                        opacity: expandedPieGroup && expandedPieGroup !== entry.name ? 0.3 : 1,
                                        transform: activeIndex === index ? 'scale(1.05)' : 'scale(1)',
                                        transformOrigin: 'center'
                                      }}
                                   />
                                ))}
                              </Pie>
                              <Tooltip 
                                formatter={(value: number, name: string, props: any) => [`$${value.toLocaleString('es-CO', {maximumFractionDigits: 1})} mill (${((value/totalRecaudo)*100).toFixed(1)}%)`, name]}
                                contentStyle={{ backgroundColor: 'rgba(20,20,20,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', backdropFilter: 'blur(10px)' }}
                                itemStyle={{ color: '#fff', fontSize: '13px', fontFamily: 'Inter', fontWeight: 'bold' }}
                                wrapperStyle={{ zIndex: 100 }}
                              />
                              <Legend 
                                verticalAlign="bottom" 
                                height={36} 
                                iconType="circle" 
                                wrapperStyle={{ fontSize: '14px', fontFamily: 'JetBrains Mono', color: '#cac4d0', paddingTop: '30px' }}
                                onClick={(e) => setExpandedPieGroup(e.value === expandedPieGroup ? null : e.value)}
                              />
                            </PieChart>
                         </ResponsiveContainer>
                     </div>

                     {/* Details Sidebar */}
                     {expandedPieGroup && activeItem && (
                        <div className="h-full flex flex-col justify-center animate-in slide-in-from-right-8 fade-in duration-500">
                           <div className="border-l-4 pl-6 py-2 mb-6" style={{ borderColor: activeItem.fill }}>
                              <h4 className="text-4xl font-display font-bold text-white mb-2">{activeItem.name}</h4>
                              <p className="text-2xl font-mono" style={{ color: activeItem.fill }}>
                                ${activeItem.value.toLocaleString('es-CO', {maximumFractionDigits: 1})} <span className="text-base font-sans text-on-surface-variant text-white/70">millones</span>
                              </p>
                              <p className="text-sm text-on-surface-variant mt-3 mb-6 bg-white/5 py-1.5 px-4 rounded-full inline-block font-medium">
                                Representa el <strong className="text-white">{((activeItem.value / totalRecaudo) * 100).toFixed(1)}%</strong> del ingreso total
                              </p>
                           </div>

                           <div className="bg-white/5 rounded-3xl p-8 border border-white/5 max-h-[300px] overflow-y-auto custom-scrollbar shadow-inner">
                              <h5 className="text-sm font-mono text-on-surface-variant uppercase tracking-widest mb-6">Desglose de Recursos</h5>
                              {activeItem.recursos && activeItem.recursos.length > 0 ? (
                                <div className="space-y-4">
                                   {[...activeItem.recursos].sort((a: any, b: any) => b.recaudo - a.recaudo).map((rec: any, idx: number) => {
                                      const pct = (rec.recaudo / activeItem.value) * 100;
                                      return (
                                        <div key={idx} className="flex flex-col gap-2 group">
                                           <div className="flex justify-between items-end text-sm">
                                              <span className="text-white/90 font-medium truncate flex-1 pr-4 text-base" title={rec.name}>{String(rec.name || '')}</span>
                                              <div className="text-right">
                                                <span className="font-bold text-white whitespace-nowrap block">${rec.recaudo.toLocaleString('es-CO', {maximumFractionDigits: 1})}</span>
                                                <span className="text-[10px] text-on-surface-variant font-mono">{pct.toFixed(1)}%</span>
                                              </div>
                                           </div>
                                           <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden">
                                              <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${pct}%`, backgroundColor: activeItem.fill }}></div>
                                           </div>
                                        </div>
                                      );
                                   })}
                                </div>
                              ) : (
                                <p className="text-sm text-on-surface-variant flex items-center justify-center h-24 opacity-50">No hay detalles adicionales</p>
                              )}
                           </div>
                        </div>
                     )}
                  </div>
                );
             })()}
          </div>
        </div>

      {/* Gastos Analysis Section */}
      <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h3 className="text-xl font-display text-white flex items-center gap-2 font-medium">
          <Wallet className="text-secondary" size={24} />
          Análisis de Gastos
        </h3>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-10">
        {(gastosTiposGroups.length > 0 ? gastosTiposGroups.slice(0, 5) : [
           { 
              name: 'Gastos de Personal', 
              compromiso: 83500.0, 
              pago: 82530.2, 
              recursos: [
                { name: 'Nación', compromiso: 80000.0, pago: 79000.0 },
                { name: 'Propios', compromiso: 3500.0, pago: 3530.2 }
              ]
           },
           { 
              name: 'Gastos de Funcionamiento', 
              compromiso: 25000.0, 
              pago: 23261.9, 
              recursos: []
           },
           { 
              name: 'Gastos de Inversión', 
              compromiso: 3500.0, 
              pago: 2986.9, 
              recursos: []
           },
           { 
              name: 'Transferencias Corrientes', 
              compromiso: 1000.0, 
              pago: 851.4, 
              recursos: []
           },
           { 
              name: 'Tasas y Multas', 
              compromiso: 600.0, 
              pago: 595.1, 
              recursos: []
           },
        ]).map((gasto, idx) => {
           const isExpanded = expandedGastoCardGroup === gasto.name;
           const pct = gasto.compromiso > 0 ? ((gasto.pago / gasto.compromiso) * 100).toFixed(1) + '%' : '0%';
           const colorClass = idx % 4 === 0 ? 'from-secondary to-secondary/70' : idx % 4 === 1 ? 'from-[#ffcc29] to-[#ffcc29]/70' : idx % 4 === 2 ? 'from-[#7bd0ff] to-[#7bd0ff]/70' : 'from-[#ff5b5b] to-[#ff5b5b]/70';
           const baseColor = idx % 4 === 0 ? '#d0bcff' : idx % 4 === 1 ? '#ffcc29' : idx % 4 === 2 ? '#7bd0ff' : '#ff5b5b';
           
           return (
           <div key={idx} className="glass-card rounded-[24px] p-6 flex flex-col relative overflow-hidden transition-all duration-300 border border-white/5 shadow-lg">
             <div className={`absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b ${colorClass}`}></div>
             
             <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xl font-display font-bold text-white mb-2">{gasto.name}</h4>
                    <p className="text-[10px] text-on-surface-variant font-mono tracking-widest uppercase mb-6 truncate">Agrupación de Gasto</p>
                  </div>

                  <div className="space-y-4">
                    <div>
                       <span className="text-xs text-on-surface-variant block mb-1">Total Compromiso</span>
                       <span className="text-2xl font-bold font-mono text-white">${gasto.compromiso.toLocaleString('es-CO', {maximumFractionDigits: 1})} <span className="text-xs font-sans text-on-surface-variant font-normal">mill.</span></span>
                    </div>
                    <div>
                       <span className="text-xs text-on-surface-variant block mb-1">Pago Efectivo</span>
                       <span className="text-3xl font-display font-bold text-secondary">${gasto.pago.toLocaleString('es-CO', {maximumFractionDigits: 1})} <span className="text-xs font-sans text-on-surface-variant font-normal">mill.</span></span>
                    </div>
                  </div>
                </div>

                <div className="w-full md:w-56 flex flex-col items-center justify-center shrink-0 border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-6">
                  <div className="relative w-28 h-28 flex items-center justify-center mb-4">
                     <svg className="w-full h-full -rotate-90">
                        <circle cx="56" cy="56" r="48" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="12" />
                        <circle 
                           className="progress-ring-circle" 
                           cx="56" cy="56" r="48" 
                           fill="transparent" 
                           stroke="currentColor" 
                           strokeWidth="12" 
                           strokeDasharray="301" 
                           strokeDashoffset={301 - (301 * parseFloat(pct || '0') / 100)} 
                           style={{ color: baseColor }}
                        />
                     </svg>
                     <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-xl font-bold text-white">{pct}</span>
                     </div>
                  </div>

                  <div className="w-full space-y-2">
                    {gasto.recursos.slice(0, 2).map((item: any, rIdx: number) => (
                      <div key={rIdx} className="bg-white/5 px-3 py-2 rounded-lg flex justify-between items-center w-full">
                         <span className="text-[10px] text-on-surface-variant uppercase truncate mr-2" title={item.name}>{String(item.name || '')}</span>
                         <span className="text-xs font-bold text-white whitespace-nowrap">${item.pago.toLocaleString('es-CO', {maximumFractionDigits: 1})}</span>
                      </div>
                    ))}
                  </div>
                </div>
             </div>

             {/* Expanded Resources View */}
             {gasto.recursos && gasto.recursos.length > 0 && (
               <div className="mt-4 pt-4 border-t border-white/10 w-full">
                 <button 
                   onClick={() => setExpandedGastoCardGroup(isExpanded ? null : gasto.name)}
                   className="w-full flex items-center justify-center gap-2 text-xs font-mono text-on-surface-variant hover:text-white transition-colors bg-white/5 hover:bg-white/10 py-2 rounded-lg"
                 >
                   {isExpanded ? (
                     <><ChevronUp size={16} /> Ocultar Recursos</>
                   ) : (
                     <><ChevronDown size={16} /> Ver Todos los Recursos ({gasto.recursos.length})</>
                   )}
                 </button>
                 
                 {isExpanded && (
                   <div className="mt-4 space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                     <div className="flex justify-between items-center px-4 py-2 text-[10px] font-mono text-on-surface-variant/70 uppercase">
                       <span className="flex-1">Nombre del Recurso</span>
                       <span className="w-24 text-right">Compromiso</span>
                       <span className="w-24 text-right">Pago Efectivo</span>
                     </div>
                     {gasto.recursos.map((rec: any, recIdx: number) => (
                       <div key={recIdx} className="flex justify-between items-center bg-white/5 hover:bg-white/10 transition-colors px-4 py-3 rounded-lg w-full">
                         <span className="text-xs text-white truncate flex-1 mr-4" title={rec.name}>{String(rec.name || '')}</span>
                         <span className="text-xs font-mono text-on-surface-variant w-24 text-right">${rec.compromiso.toLocaleString('es-CO', {maximumFractionDigits: 1})}</span>
                         <span className="text-xs font-bold text-secondary w-24 text-right">${rec.pago.toLocaleString('es-CO', {maximumFractionDigits: 1})}</span>
                       </div>
                     ))}
                   </div>
                 )}
               </div>
             )}
           </div>
         )})}
      </div>

      {/* Breakdown and Insights - Exact Image Implementations */}
      <div className="flex flex-col gap-8 mb-8">
        {/* Gastos Totales Dynamic Equivalent */}
        <div className="glass-card rounded-[32px] p-8 border border-white/5 shadow-2xl">
          <div className="text-center mb-10 border-b border-white/10 pb-6">
            <h3 className="text-3xl font-display font-bold text-white mb-2">Gastos con corte de <span className="underline decoration-primary-container">Abril</span></h3>
            <p className="text-on-surface-variant font-mono">Clasificación por tipo de gasto (Millones)</p>
          </div>

          <div className="space-y-6 max-w-4xl mx-auto">
             {(gastosTiposGroups.length > 0 ? gastosTiposGroups.slice(0, 5) : [
               { name: 'Gastos de Personal', compromiso: 83500.0, pago: 82530.2, recursos: [] },
               { name: 'Gastos de Funcionamiento', compromiso: 25000.0, pago: 23261.9, recursos: [] },
               { name: 'Gastos de Inversión', compromiso: 3500.0, pago: 2986.9, recursos: [] },
               { name: 'Transferencias Corrientes', compromiso: 1000.0, pago: 851.4, recursos: [] },
               { name: 'Tasas y Multas', compromiso: 600.0, pago: 595.1, recursos: [] },
             ]).map((item, i) => {
                const maxValue = gastosTiposGroups.length > 0 ? Math.max(...gastosTiposGroups.map(g => g.compromiso)) : 83500.0;
                const colors = ['#ffcc29', '#7bd0ff', '#d0bcff', '#ff5b5b', '#4ade80'];
                const color = colors[i % colors.length];
                const isExpanded = expandedGastoGroup === item.name;

                return (
                  <div key={i} className="flex flex-col gap-4 bg-white/5 rounded-2xl p-4 transition-all">
                    <div 
                      className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6 cursor-pointer group"
                      onClick={() => setExpandedGastoGroup(isExpanded ? null : item.name)}
                    >
                       <div className="md:w-64 flex flex-col justify-center text-right shrink-0">
                         <div className="font-bold text-sm md:text-base font-sans text-white truncate group-hover:text-primary-container transition-colors" title={item.name}>{String(item.name || '')}</div>
                         <div className="text-[10px] text-on-surface-variant flex flex-col sm:flex-row justify-end sm:gap-2 mt-1">
                            <span>Comp: ${item.compromiso.toLocaleString('es-CO', {maximumFractionDigits: 1})}</span>
                            <span className="hidden sm:inline">•</span>
                            <span>Pago: ${item.pago.toLocaleString('es-CO', {maximumFractionDigits: 1})}</span>
                         </div>
                       </div>
                       
                       <div className="flex-1 flex flex-col justify-center gap-1.5 border-l border-white/10 pl-4 py-1">
                          {/* Compromiso Bar */}
                          <div className="flex items-center h-4 relative">
                             <div className="h-full border border-white/20 rounded-r-md flex items-center pr-2" style={{ width: `${Math.max(1, (item.compromiso / maxValue) * 100)}%`, backgroundColor: 'rgba(255,255,255,0.05)' }}>
                             </div>
                             <span className="ml-2 text-xs text-on-surface-variant whitespace-nowrap">Compromiso</span>
                          </div>
                          {/* Pago Bar */}
                          <div className="flex items-center h-4 relative">
                             <div className="h-full rounded-r-md flex items-center pr-4 shadow-[2px_0_10px_rgba(0,0,0,0.5)]" style={{ width: `${Math.max(1, (item.pago / maxValue) * 100)}%`, backgroundColor: color }}>
                             </div>
                             <span className="ml-2 text-xs font-bold text-white whitespace-nowrap">${item.pago.toLocaleString('es-CO', {maximumFractionDigits: 1})} mill</span>
                          </div>
                       </div>
                       
                       <div className="text-on-surface-variant flex items-center justify-center shrink-0 w-8">
                         {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                       </div>
                    </div>
                    
                    {/* Expanded Charts Area */}
                    {isExpanded && item.recursos && item.recursos.length > 0 && (() => {
                      const RESOURCE_COLORS_PALETTE = ['#ffcc29', '#7bd0ff', '#d0bcff', '#ff5b5b', '#4ade80', '#fbbf24', '#34d399', '#f87171', '#818cf8', '#c084fc'];
                      const allRecursos = [...item.recursos].sort((a: any, b: any) => b.pago - a.pago).slice(0, 10);
                      
                      const chartDataCompromiso = [...allRecursos].sort((a: any, b: any) => a.compromiso - b.compromiso);
                      const chartDataPago = [...allRecursos].sort((a: any, b: any) => a.pago - b.pago);

                      return (
                      <div className="mt-4 pt-4 border-t border-white/10 animate-in fade-in slide-in-from-top-4 duration-300">
                        <div className="flex flex-wrap gap-2 justify-center mb-6">
                          {allRecursos.map((rec, rIdx) => (
                            <div key={rIdx} className="flex items-center gap-1.5 text-[10px] text-white bg-white/5 px-2 py-1 rounded-md">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: RESOURCE_COLORS_PALETTE[rIdx % 10] }}></span>
                              {String(rec.name || '').substring(0, 25)}
                            </div>
                          ))}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                          {/* Chart 1: Compromiso */}
                          <div className="h-64 flex flex-col">
                             <h4 className="text-xs font-mono text-on-surface-variant uppercase tracking-widest text-center mb-4">Recursos por Compromiso</h4>
                             <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartDataCompromiso} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
                                  <XAxis type="number" tick={{fill: '#888', fontSize: 10}} tickFormatter={(v) => `$${v}`} />
                                  <YAxis dataKey="name" type="category" width={100} tick={{fill: '#ccc', fontSize: 9}} tickFormatter={(v) => String(v || '').substring(0, 15) + '...'} />
                                  <Tooltip 
                                    cursor={{fill: 'rgba(255,255,255,0.05)'}} 
                                    contentStyle={{backgroundColor: '#1e1e1e', borderColor: '#333', borderRadius: '8px', color: '#fff'}}
                                    formatter={(value: number) => [`$${value.toLocaleString('es-CO', {maximumFractionDigits: 1})} mill`, 'Compromiso']}
                                  />
                                  <Bar dataKey="compromiso" radius={[0, 4, 4, 0]}>
                                    {chartDataCompromiso.map((entry, index) => {
                                      const colorIdx = allRecursos.findIndex(r => r.name === entry.name);
                                      return <Cell key={`cell-${index}`} fill={RESOURCE_COLORS_PALETTE[colorIdx % 10] || 'rgba(255,255,255,0.2)'} />;
                                    })}
                                  </Bar>
                                </BarChart>
                             </ResponsiveContainer>
                          </div>
                          {/* Chart 2: Pago */}
                          <div className="h-64 flex flex-col">
                             <h4 className="text-xs font-mono text-secondary uppercase tracking-widest text-center mb-4">Recursos por Pago Efectivo</h4>
                             <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartDataPago} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
                                  <XAxis type="number" tick={{fill: '#888', fontSize: 10}} tickFormatter={(v) => `$${v}`} />
                                  <YAxis dataKey="name" type="category" width={100} tick={{fill: '#ccc', fontSize: 9}} tickFormatter={(v) => String(v || '').substring(0, 15) + '...'} />
                                  <Tooltip 
                                    cursor={{fill: 'rgba(255,255,255,0.05)'}} 
                                    contentStyle={{backgroundColor: '#1e1e1e', borderColor: '#333', borderRadius: '8px', color: '#fff'}}
                                    formatter={(value: number) => [`$${value.toLocaleString('es-CO', {maximumFractionDigits: 1})} mill`, 'Pago Efectivo']}
                                  />
                                  <Bar dataKey="pago" radius={[0, 4, 4, 0]}>
                                    {chartDataPago.map((entry, index) => {
                                      const colorIdx = allRecursos.findIndex(r => r.name === entry.name);
                                      return <Cell key={`cell-${index}`} fill={RESOURCE_COLORS_PALETTE[colorIdx % 10] || color} />;
                                    })}
                                  </Bar>
                                </BarChart>
                             </ResponsiveContainer>
                          </div>
                        </div>
                      </div>
                      );
                    })()}
                  </div>
                )
             })}
          </div>

          <div className="flex flex-col items-center justify-center mt-16 pt-8 border-t border-white/10">
             <h4 className="text-sm font-mono text-on-surface-variant uppercase tracking-widest mb-6">Totales Generales</h4>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl">
                <div className="bg-white/5 backdrop-blur-sm rounded-[24px] p-6 border border-white/10 text-center flex flex-col justify-center">
                   <p className="text-3xl font-bold font-display text-white mb-2">${gastosComprometido.toLocaleString('es-CO', {maximumFractionDigits: 1})} <span className="text-sm text-on-surface-variant font-sans font-normal">mill</span></p>
                   <p className="text-xs text-on-surface-variant uppercase tracking-widest font-bold">Total Compromiso</p>
                </div>
                <div className="bg-white/5 backdrop-blur-sm rounded-[24px] p-6 border border-white/10 border-b-4 border-b-secondary text-center flex flex-col justify-center">
                   <p className="text-3xl font-bold font-display text-white mb-2">${gastosPagado.toLocaleString('es-CO', {maximumFractionDigits: 1})} <span className="text-sm text-on-surface-variant font-sans font-normal">mill</span></p>
                   <p className="text-xs text-secondary uppercase tracking-widest font-bold">Total Pago Efectivo</p>
                </div>
             </div>
          </div>
        </div>

        {/* Breakdown row: Personal & Funcionamiento */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
           {/* Gastos de Personal Dynamic Equivalent */}
           <div className="glass-card rounded-[32px] p-8 border border-white/5">
              <h3 className="text-xl font-display font-bold text-white mb-8 text-center border-b border-white/10 pb-4">Gastos de Personal</h3>
              <div className="space-y-4">
                 {(nominaGroups.length > 0 ? nominaGroups.slice(0, 6) : [
                   { name: 'PLANTA', value: 23680000000 },
                   { name: 'OCASIONAL', value: 21773800000 },
                   { name: 'ADMINISTRATIVO', value: 16126100000 },
                   { name: 'CÁTEDRA POSGRADO', value: 2933000000 },
                   { name: 'CÁTEDRA', value: 2159000000 },
                   { name: 'SUPERNUMERARIO', value: 359700000 },
                 ]).map((item, i) => {
                    const valMill = item.value / 1e6;
                    const maxValue = nominaGroups.length > 0 ? Math.max(...nominaGroups.map(g => g.value / 1e6)) : 23680.0;
                    return (
                      <div key={i} className="flex items-center gap-4">
                         <span className="w-32 text-right text-[10px] font-bold text-on-surface-variant uppercase shrink-0 truncate" title={item.name}>{String(item.name || '')}</span>
                         <div className="flex-1 flex items-center h-10 border-l border-white/10 pl-1 group">
                            <div className="h-full bg-[#ffcc29] flex items-center relative transition-all group-hover:brightness-110" style={{ width: `${Math.max(1.5, (valMill / maxValue) * 100)}%` }}>
                               <span className="absolute left-full ml-3 font-bold text-white text-sm whitespace-nowrap">
                                 ${valMill.toLocaleString('es-CO', {maximumFractionDigits: 1})} mill.
                               </span>
                            </div>
                         </div>
                      </div>
                    )
                 })}
              </div>
           </div>

           {/* Análisis de Ejecución (Moved here) */}
           <div className="glass-card rounded-[32px] p-8 border border-white/5 flex flex-col justify-center bg-[url('https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=800&auto=format&fit=crop')] bg-cover bg-center relative overflow-hidden group min-h-[350px]">
             <div className="absolute inset-0 bg-black/80 group-hover:bg-black/70 transition-colors"></div>
             <div className="relative z-10">
                <h3 className="text-3xl font-display font-medium text-white mb-2">Análisis de<br/>Ejecución</h3>
                <p className="text-sm text-gray-300 font-mono mb-8 max-w-xs">Informes detallados y consolidados de órdenes de compra, O.P.S y arrendamientos.</p>
                <button className="bg-[#ffcc29] text-black font-bold uppercase tracking-widest text-xs px-6 py-3 rounded-full hover:bg-white transition-colors">Generar Reporte Completo</button>
             </div>
           </div>
        </div>

        {/* Gastos por Referencia - Full Width */}
        <div className="mt-8 glass-card rounded-[32px] p-8 md:p-12 border border-white/10 glow-primary bg-[#1a1a1a]">
           <h3 className="text-3xl font-display font-medium text-white mb-2 text-center uppercase tracking-wider">Gastos por Referencia</h3>
           <p className="text-sm font-mono text-on-surface-variant text-center mb-12 mt-4">Compromiso y Pago Efectivo agrupado por referencia. Haz clic en un segmento para ver recursos asociados.</p>
           
           {(() => {
              const refData = gastosReferenciasGroups.length > 0 ? gastosReferenciasGroups.slice(0, 15) : [
                 { name: 'SERVICIOS PROFESIONALES', compromiso: 15400, pago: 12000, recursos: [] },
                 { name: 'MANTENIMIENTO', compromiso: 8400, pago: 7200, recursos: [] }
              ];
              
              if (refData.length === 0) return <div className="h-64 flex items-center justify-center text-on-surface-variant">No hay datos de referencia disponibles.</div>;

              return (
                 <div className="flex flex-col gap-6">
                    {refData.map((ref, idx) => {
                       const isExpanded = expandedGastoGroup === ref.name;
                       const pctCompromiso = ref.compromiso > 0 ? (ref.pago / ref.compromiso) * 100 : 0;
                       
                       return (
                         <div key={idx} className="bg-white/5 rounded-[24px] p-6 md:p-8 border border-white/10 transition-all duration-300 hover:bg-white/10">
                            <div className="flex flex-col md:flex-row justify-between md:items-center gap-6 cursor-pointer" onClick={() => setExpandedGastoGroup(isExpanded ? null : ref.name)}>
                               <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                     <h4 className="text-xl font-bold text-white font-display">{ref.name}</h4>
                                     <span className="text-[10px] bg-white/10 text-white px-2 py-0.5 rounded uppercase font-bold">{ref.recursos ? ref.recursos.length : 0} recursos</span>
                                  </div>
                               </div>
                               <div className="flex items-center gap-6 md:gap-12">
                                  <div className="text-right">
                                     <span className="text-[10px] text-on-surface-variant uppercase tracking-widest block mb-1">Compromiso</span>
                                     <span className="text-xl font-mono text-white">${ref.compromiso.toLocaleString('es-CO', {maximumFractionDigits:1})} <span className="text-xs">mill</span></span>
                                  </div>
                                  <div className="text-right">
                                     <span className="text-[10px] text-on-surface-variant uppercase tracking-widest block mb-1">Pago Efectivo</span>
                                     <span className="text-xl font-mono text-[#ffcc29]">${ref.pago.toLocaleString('es-CO', {maximumFractionDigits:1})} <span className="text-xs">mill</span></span>
                                  </div>
                                  <div className="w-20 text-right">
                                     <span className="text-xs text-on-surface-variant uppercase tracking-widest block mb-1">Ejecución</span>
                                     <span className="text-xl font-bold text-[#4ade80]">{pctCompromiso.toFixed(0)}%</span>
                                  </div>
                                  <div className="text-on-surface-variant bg-white/5 p-3 rounded-full hover:bg-white/10 transition">
                                     {isExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                                  </div>
                               </div>
                            </div>

                            {isExpanded && ref.recursos && ref.recursos.length > 0 && (
                               <div className="mt-8 pt-8 border-t border-white/10 grid grid-cols-1 lg:grid-cols-2 gap-12 animate-in slide-in-from-top-4 fade-in duration-300">
                                  <div className="h-[300px]">
                                     <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={ref.recursos} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                                           <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
                                           <XAxis type="number" tick={{fill: '#888', fontSize: 10}} tickFormatter={(v) => `$${v}`} />
                                           <YAxis dataKey="name" type="category" width={140} tick={{fill: '#ccc', fontSize: 10}} tickFormatter={(v: any) => String(v || '').substring(0, 22) + '...'} />
                                           <Tooltip 
                                             cursor={{fill: 'rgba(255,255,255,0.05)'}} 
                                             contentStyle={{backgroundColor: '#1e1b21', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px'}}
                                             formatter={(value: number, name: string) => [`$${value.toLocaleString('es-CO', {maximumFractionDigits:1})} mill`, name === 'compromiso' ? 'Compromiso' : 'Pago Efectivo']}
                                           />
                                           <Legend wrapperStyle={{fontSize: '12px', paddingTop: '10px'}} />
                                           <Bar dataKey="compromiso" name="Compromiso" fill="rgba(255,204,41,0.3)" radius={[0, 4, 4, 0]} />
                                           <Bar dataKey="pago" name="Pago Efectivo" fill="#ffcc29" radius={[0, 4, 4, 0]} />
                                        </BarChart>
                                     </ResponsiveContainer>
                                  </div>
                                  <div className="flex flex-col justify-center">
                                     <h5 className="text-sm font-mono text-on-surface-variant uppercase tracking-widest mb-6">Desglose de Recursos</h5>
                                     <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-4">
                                        {ref.recursos.map((rec: any, rIdx: number) => {
                                           const recPct = rec.compromiso > 0 ? (rec.pago / rec.compromiso) * 100 : 0;
                                           return (
                                           <div key={rIdx} className="bg-black/40 p-4 rounded-xl border border-white/5">
                                              <p className="text-base text-white font-medium mb-3 truncate" title={rec.name}>{String(rec.name || '')}</p>
                                              <div className="grid grid-cols-3 gap-4 text-sm font-mono items-center">
                                                 <div className="flex flex-col">
                                                    <span className="text-[10px] text-on-surface-variant uppercase">Compromiso</span>
                                                    <span className="text-white">${rec.compromiso.toLocaleString('es-CO', {maximumFractionDigits:1})}</span>
                                                 </div>
                                                 <div className="flex flex-col">
                                                    <span className="text-[10px] text-on-surface-variant uppercase">Pago</span>
                                                    <span className="text-[#ffcc29]">${rec.pago.toLocaleString('es-CO', {maximumFractionDigits:1})}</span>
                                                 </div>
                                                 <div className="flex flex-col text-right">
                                                    <span className="text-[10px] text-on-surface-variant uppercase">Eje.</span>
                                                    <span className="text-[#4ade80]">{recPct.toFixed(1)}%</span>
                                                 </div>
                                              </div>
                                              {/* Mini progress bar */}
                                              <div className="w-full h-1.5 bg-white/5 rounded-full mt-3 overflow-hidden">
                                                 <div className="h-full bg-[#ffcc29] rounded-full" style={{width: `${Math.min(100, recPct)}%`}}></div>
                                              </div>
                                           </div>
                                        )})}
                                     </div>
                                  </div>
                               </div>
                            )}
                         </div>
                       );
                    })}
                 </div>
              );
           })()}
        </div>
      </div>
    </div>
  );
}
