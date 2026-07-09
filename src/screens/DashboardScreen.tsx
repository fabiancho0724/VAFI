import { useState, useEffect, useMemo } from 'react';
import { Download, Filter, Wallet, Component, Network, Layers, LayoutList, Settings, TrendingUp, CheckCircle, Clock, Upload, AlertTriangle, PieChart as PieChartIcon, ChevronDown, ChevronUp } from 'lucide-react';
import { fetchAndParseCSV, groupAndSum, getNumericColumn, getCategoryColumn } from '../lib/csvParser';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ComposedChart, Line, AreaChart, Area, LabelList } from 'recharts';

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
  const [filtroReferencia, setFiltroReferencia] = useState<string>('Todas');
  const [filtroOperacionesLimit, setFiltroOperacionesLimit] = useState<string>('Top 5');

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
        const ingresosData = await fetchAndParseCSV('https://raw.githubusercontent.com/fabiancho0724/Nomina/7d0f179b8bbcd3d327235c8e7fe2a4f757424794/Ingresos.csv');
        const gastosData = await fetchAndParseCSV('https://raw.githubusercontent.com/fabiancho0724/Nomina/7d0f179b8bbcd3d327235c8e7fe2a4f757424794/Gastos.csv');
        const nominaData = await fetchAndParseCSV('https://raw.githubusercontent.com/fabiancho0724/Nomina/7d0f179b8bbcd3d327235c8e7fe2a4f757424794/Nomina.csv');
        
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

           const catCol3 = firstRowKeys[3]; // Operacion
           const operacionesKeys = Array.from(new Set(rows.map(r => r[catCol3]))).filter(Boolean);
           const operacionesItems = operacionesKeys.map(op => {
               const opRows = rows.filter(r => r[catCol3] === op);
               const oComp = opRows.reduce((acc, r) => acc + (parseFloat(r[compCol]) || 0), 0) / 1e6;
               const oPago = opRows.reduce((acc, r) => acc + (parseFloat(r[pagoCol]) || 0), 0) / 1e6;
               return { name: op, compromiso: oComp, pago: oPago };
           }).sort((a, b) => b.pago - a.pago);

           return { 
               name: ref, 
               compromiso: tComp, 
               pago: tPago, 
               recursos: recursosItems,
               operaciones: operacionesItems
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

  const { opReferences, operacionesData, totalOpCompromiso, totalOpPago } = useMemo(() => {
    const refs = gastosReferenciasGroups.map(g => g.name).filter(Boolean).sort();
    
    let opMap: Record<string, { name: string, compromiso: number, pago: number }> = {};
    let tComp = 0;
    let tPago = 0;
    
    gastosReferenciasGroups.forEach(g => {
      if (filtroReferencia !== 'Todas' && g.name !== filtroReferencia) return;
      if (!g.operaciones) return;
      g.operaciones.forEach((op: any) => {
        if (!opMap[op.name]) opMap[op.name] = { name: op.name, compromiso: 0, pago: 0 };
        opMap[op.name].compromiso += op.compromiso;
        opMap[op.name].pago += op.pago;
        tComp += op.compromiso;
        tPago += op.pago;
      });
    });

    let data = Object.values(opMap).sort((a, b) => b.compromiso - a.compromiso);
    
    // Add execution percentage calculated field for labels
    data = data.map(item => ({
       ...item,
       ejecucionPct: item.compromiso > 0 ? Math.round((item.pago / item.compromiso) * 100) : 0
    }));

    if (filtroOperacionesLimit === 'Top 5') {
       data = data.slice(0, 5);
    } // si es 'Todas', no hace slice

    return { opReferences: refs, operacionesData: data, totalOpCompromiso: tComp, totalOpPago: tPago };
  }, [gastosReferenciasGroups, filtroReferencia, filtroOperacionesLimit]);

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

      {/* Interactive Chart - Gastos x Referencia y Operación */}
      <div className="glass-card rounded-[24px] p-8 mb-10 border border-white/5 shadow-2xl relative overflow-hidden">
         {/* Top Gradient Border */}
         <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary-container via-secondary to-[#4ade80]"></div>
         
         {/* Ambient Background Glow */}
         <div className="absolute top-0 right-0 w-96 h-96 bg-[#ffcc29]/5 blur-[120px] rounded-full pointer-events-none"></div>
         
         <div className="flex flex-col lg:flex-row justify-between items-start mb-8 gap-6 z-10 relative">
            <div className="flex-1">
               <h3 className="text-2xl font-display font-medium text-white flex items-center gap-3">
                  <CheckCircle className="text-[#4ade80] w-6 h-6" />
                  Ejecución de Operaciones
               </h3>
               <p className="text-xs text-on-surface-variant mt-2 mb-6 max-w-2xl leading-relaxed">
                  Monitoreo de compromisos y pagos efectivos agrupados por referencia.
                  Analiza el nivel de ejecución presupuestal de las operaciones principales.
               </p>

               <div className="flex flex-wrap items-center gap-4">
                  <div className="bg-[#1e293b]/70 border border-white/10 rounded-xl p-3 px-6 flex flex-col min-w-[180px]">
                     <span className="text-[10px] uppercase font-mono tracking-widest text-[#94a3b8] mb-1">Total Compromiso</span>
                     <span className="text-2xl font-mono font-bold text-white">${totalOpCompromiso.toLocaleString('es-CO', {maximumFractionDigits: 1})} <span className="text-xs font-sans text-on-surface-variant font-normal">mill.</span></span>
                  </div>
                  <div className="bg-[#ffcc29]/10 border border-[#ffcc29]/30 rounded-xl p-3 px-6 flex flex-col min-w-[180px]">
                     <span className="text-[10px] uppercase font-mono tracking-widest text-[#ffcc29] mb-1">Pago Efectivo</span>
                     <span className="text-2xl font-display font-bold text-[#ffcc29]">${totalOpPago.toLocaleString('es-CO', {maximumFractionDigits: 1})} <span className="text-xs font-sans text-on-surface-variant font-normal">mill.</span></span>
                  </div>
               </div>
            </div>
            
            <div className="flex flex-col gap-3 w-full lg:w-auto">
               <div className="flex items-center gap-2 bg-[#0f172a]/80 border border-white/10 rounded-lg px-4 py-2.5 w-full">
                  <LayoutList className="w-4 h-4 text-secondary shrink-0" />
                  <select 
                     value={filtroOperacionesLimit} 
                     onChange={(e) => setFiltroOperacionesLimit(e.target.value)}
                     className="bg-transparent text-white text-xs font-medium focus:outline-none cursor-pointer w-full"
                  >
                     <option value="Top 5" className="bg-black">Top 5 Operaciones (Mayor Compromiso)</option>
                     <option value="Todas" className="bg-black">Visualizar Todas</option>
                  </select>
               </div>
               <div className="flex items-center gap-2 bg-[#0f172a]/80 border border-white/10 rounded-lg px-4 py-2.5 w-full">
                  <Filter className="w-4 h-4 text-secondary shrink-0" />
                  <select 
                     value={filtroReferencia} 
                     onChange={(e) => setFiltroReferencia(e.target.value)}
                     className="bg-transparent text-white text-xs font-medium focus:outline-none cursor-pointer w-full truncate max-w-[250px]"
                  >
                     <option value="Todas" className="bg-black">Todas las Referencias</option>
                     {opReferences.map(ref => <option key={ref} value={ref} className="bg-black">{ref}</option>)}
                  </select>
               </div>
            </div>
         </div>

         <div className="w-full h-[500px]">
            {operacionesData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                 <ComposedChart data={operacionesData} margin={{top: 30, right: 20, left: 20, bottom: 80}}>
                   <defs>
                      <linearGradient id="barGrad-0" x1="0" y1="0" x2="1" y2="0"><stop offset="50%" stopColor="#f97316"/><stop offset="50%" stopColor="#c2410c"/></linearGradient>
                      <linearGradient id="barGrad-1" x1="0" y1="0" x2="1" y2="0"><stop offset="50%" stopColor="#4ade80"/><stop offset="50%" stopColor="#16a34a"/></linearGradient>
                      <linearGradient id="barGrad-2" x1="0" y1="0" x2="1" y2="0"><stop offset="50%" stopColor="#f43f5e"/><stop offset="50%" stopColor="#be123c"/></linearGradient>
                      <linearGradient id="barGrad-3" x1="0" y1="0" x2="1" y2="0"><stop offset="50%" stopColor="#22d3ee"/><stop offset="50%" stopColor="#0e7490"/></linearGradient>
                      <linearGradient id="barGrad-4" x1="0" y1="0" x2="1" y2="0"><stop offset="50%" stopColor="#c084fc"/><stop offset="50%" stopColor="#7e22ce"/></linearGradient>
                   </defs>
                   <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                   
                   <XAxis 
                      dataKey="name" 
                      stroke="#94a3b8" 
                      tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 500}} 
                      axisLine={false} 
                      tickLine={false} 
                      interval={0} 
                      angle={-30} 
                      textAnchor="end"
                      height={90}
                      tickFormatter={(val) => val.length > 30 ? val.substring(0, 30) + '...' : val} 
                   />
                   
                   <YAxis yAxisId="left" stroke="none" tick={{fill: '#64748b', fontSize: 10}} tickFormatter={(val) => `$${val.toLocaleString('es-CO')}`} />
                   <YAxis yAxisId="right" orientation="right" stroke="none" hide domain={[0, 'dataMax + 20']} />
                   
                   <Tooltip 
                      cursor={{fill: 'rgba(255,255,255,0.03)'}}
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                           const item = payload[0].payload;
                           return (
                             <div className="bg-[#0f172a] border border-white/10 rounded-xl p-4 shadow-2xl max-w-[280px]">
                               <p className="font-bold text-white text-[13px] mb-3 leading-tight whitespace-normal">{label}</p>
                               <div className="space-y-2">
                                 <div className="flex justify-between items-center text-sm gap-4">
                                   <span className="text-[#94a3b8] font-mono uppercase tracking-wider text-[10px]">Compromiso:</span>
                                   <span className="font-bold text-[#e2e8f0]">${item.compromiso.toLocaleString('es-CO', {maximumFractionDigits: 1})} mill.</span>
                                 </div>
                                 <div className="flex justify-between items-center text-sm gap-4">
                                   <span className="text-[#94a3b8] font-mono uppercase tracking-wider text-[10px]">Pago Efectivo:</span>
                                   <span className="font-bold text-[#ffcc29]">${item.pago.toLocaleString('es-CO', {maximumFractionDigits: 1})} mill.</span>
                                 </div>
                                 <div className="flex justify-between items-center text-sm mt-3 pt-3 border-t border-white/10 gap-4">
                                   <span className="text-[#94a3b8] font-mono uppercase tracking-wider text-[10px]">Ejecución:</span>
                                   <span className="font-bold text-[#22d3ee]">{item.ejecucionPct}%</span>
                                 </div>
                               </div>
                             </div>
                           );
                        }
                        return null;
                      }}
                   />
                   
                   <Legend wrapperStyle={{fontSize: "12px", opacity: 0.8}} verticalAlign="top" height={40} />
                   
                   {/* Background Bar for Compromiso */}
                   <Bar yAxisId="left" dataKey="compromiso" name="Compromiso Total" fill="#1e293b" radius={[0, 0, 0, 0]} barSize={55} stroke="#334155" strokeWidth={1} />
                   
                   {/* Foreground Bar for Pago Efectivo with Folded Gradients */}
                   <Bar yAxisId="left" dataKey="pago" name="Pago Efectivo" barSize={55} radius={[0, 0, 0, 0]}>
                      {operacionesData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={`url(#barGrad-${index % 5})`} />
                      ))}
                      <LabelList 
                         dataKey="ejecucionPct" 
                         position="top" 
                         offset={15}
                         formatter={(val: number) => `${val}%`}
                         style={{ fill: '#fff', fontSize: '13px', fontWeight: 'bold', fontFamily: 'monospace', fontStyle: 'italic', textShadow: '0px 2px 4px rgba(0,0,0,0.8)' }} 
                      />
                   </Bar>
                   
                   {/* Trend Line representing Execution Level */}
                   <Line 
                      yAxisId="right" 
                      type="monotone" 
                      dataKey="ejecucionPct" 
                      name="Ejecución (%)" 
                      stroke="#22d3ee" 
                      strokeWidth={3} 
                      dot={{r: 5, fill: '#0f172a', stroke: '#22d3ee', strokeWidth: 2}} 
                      activeDot={{r: 8, fill: '#fff'}}
                      isAnimationActive={true}
                   />
                 </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center border-t border-white/5">
                 <p className="text-white/40 text-sm font-mono tracking-widest uppercase flex items-center gap-2">
                   <AlertTriangle size={16} /> No hay operaciones en esta referencia.
                 </p>
              </div>
            )}
         </div>
         
         <div className="mt-4 flex flex-wrap gap-4 items-center justify-center border-t border-white/5 pt-4">
           {operacionesData.slice(0, 5).map((entry, idx) => (
              <div key={idx} className="flex items-center gap-2 text-[10px] text-white/60">
                 <div className="w-3 h-3" style={{ background: `linear-gradient(to right, ${['#f97316, #c2410c', '#4ade80, #16a34a', '#f43f5e, #be123c', '#22d3ee, #0e7490', '#c084fc, #7e22ce'][idx % 5]})` }}></div>
                 <span className="truncate max-w-[120px]" title={entry.name}>
                   {entry.name.replace('LIQUIDACION DE', 'LIQ.').replace('CONSTITUCIÓN', 'CONST.')}
                 </span>
              </div>
           ))}
         </div>
      </div>

      {/* Gastos Personal */}
      <div className="flex flex-col gap-8 mb-8">
         <div className="glass-card rounded-[32px] p-8 md:p-12 border border-white/5 relative overflow-hidden shadow-2xl">
            {/* Top Gradient Border */}
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary-container via-secondary to-[#4ade80]"></div>
            
            {/* Ambient Background Glow */}
            <div className="absolute top-0 left-0 w-96 h-96 bg-[#ffcc29]/5 blur-[120px] rounded-full pointer-events-none"></div>

            <div className="text-center border-b border-white/10 pb-6 mb-12 z-10 relative">
               <h3 className="text-3xl font-display font-medium text-white mb-2">Gastos de Personal</h3>
               <p className="text-on-surface-variant font-mono">Valores en millones</p>
            </div>

            <div className="space-y-6 max-w-4xl mx-auto z-10 relative">
               {[
                 { name: 'PLANTA', valueMill: 23680.0 },
                 { name: 'OCASIONAL', valueMill: 21773.8 },
                 { name: 'ADMINISTRATIVO', valueMill: 16126.1 },
                 { name: 'CATEDRA POSGRADO', valueMill: 2933.0 },
                 { name: 'CATEDRA', valueMill: 2159.0 },
                 { name: 'SUPERNUMERARIO', valueMill: 359.7 },
               ].map((item, i) => {
                  const valMill = item.valueMill;
                  const maxValue = 24000.0;
                  return (
                    <div key={i} className="flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-6">
                       <span className="md:w-56 text-left md:text-right text-xs md:text-sm font-bold text-white uppercase shrink-0 tracking-widest">
                         {item.name}
                       </span>
                       <div className="flex-1 w-full flex items-center h-10 md:h-12 md:border-l border-white/10 md:pl-2 group">
                          <div className="h-full bg-gradient-to-r from-[#cc9a00] to-[#ffcc29] flex items-center relative transition-all duration-500 ease-out group-hover:brightness-125 shadow-[0_0_15px_rgba(255,204,41,0.2)]" style={{ width: `${Math.max(1, (valMill / maxValue) * 100)}%`, minWidth: '4px' }}>
                             <span className="absolute left-full ml-4 font-bold text-white text-sm md:text-base whitespace-nowrap drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                               ${valMill.toLocaleString('es-CO', {maximumFractionDigits: 1})} mill.
                             </span>
                          </div>
                       </div>
                    </div>
                  )
               })}
            </div>

            {/* Totales Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 pt-10 border-t border-white/10 z-10 relative max-w-5xl mx-auto">
               <div className="bg-white/5 backdrop-blur-md rounded-[24px] p-6 border border-white/10 text-center hover:bg-white/10 transition-colors duration-300">
                  <p className="text-3xl font-display font-bold text-white mb-2">${(313365.6).toLocaleString('es-CO', {maximumFractionDigits: 1})} <span className="text-sm font-sans font-normal text-on-surface-variant">mill.</span></p>
                  <p className="text-xs text-on-surface-variant font-mono uppercase tracking-widest italic">Apropiacion</p>
               </div>
               <div className="bg-white/5 backdrop-blur-md rounded-[24px] p-6 border border-white/10 text-center hover:bg-white/10 transition-colors duration-300">
                  <p className="text-3xl font-display font-bold text-white mb-2">${(82530.2).toLocaleString('es-CO', {maximumFractionDigits: 1})} <span className="text-sm font-sans font-normal text-on-surface-variant">mill.</span></p>
                  <p className="text-xs text-on-surface-variant font-mono uppercase tracking-widest italic">Compromiso</p>
               </div>
               <div className="bg-white/5 backdrop-blur-md rounded-[24px] p-6 border border-white/10 text-center border-b-4 border-b-primary-container hover:bg-white/10 transition-colors duration-300">
                  <p className="text-3xl font-display font-bold text-white mb-2">${(82530.2).toLocaleString('es-CO', {maximumFractionDigits: 1})} <span className="text-sm font-sans font-normal text-on-surface-variant">mill.</span></p>
                  <p className="text-xs text-on-surface-variant font-mono uppercase tracking-widest italic text-primary-container">Total Pago</p>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}
