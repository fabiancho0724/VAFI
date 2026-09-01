import { useState, useEffect, useMemo } from 'react';
import { Download, Filter, Wallet, Component, Network, Layers, LayoutList, Settings, TrendingUp, CheckCircle, Clock, Upload, AlertTriangle, PieChart as PieChartIcon, ChevronDown, ChevronUp } from 'lucide-react';
import { fetchAndParseCSV, groupAndSum, getNumericColumn, getCategoryColumn, parseNumber, formatFechaCorte } from '../lib/csvParser';
import { RECURSOS_FINANCIEROS } from '../lib/constants';
import { getTipoRecursoBalance } from '../lib/resourceMapper';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ComposedChart, Line, AreaChart, Area, LabelList } from 'recharts';

export function DashboardScreen({ onNavigate }: { onNavigate: (s: string) => void }) {
  const [dataStage, setDataStage] = useState<'loading' | 'ready'>('loading');
  
  const [ingresosTotal, setIngresosTotal] = useState(387794.0);
  const [ingresosAforado, setIngresosAforado] = useState(512232.6);
  const [ingresosRecaudado, setIngresosRecaudado] = useState(387794.0);
  const [gastosTotal, setGastosTotal] = useState(282311.9);
  const [gastosComprometido, setGastosComprometido] = useState(345068.5);
  const [gastosPagado, setGastosPagado] = useState(282311.9);
  
  const [ingresosGroups, setIngresosGroups] = useState<any[]>([]);
  const [gastosGroups, setGastosGroups] = useState<any[]>([]);
  const [gastosRecursosGroups, setGastosRecursosGroups] = useState<any[]>([]);
  const [gastosTiposGroups, setGastosTiposGroups] = useState<any[]>([]);
  const [gastosReferenciasGroups, setGastosReferenciasGroups] = useState<any[]>([]);
  const [expandedGastoGroup, setExpandedGastoGroup] = useState<string | null>(null);
  const [expandedGastoCardGroup, setExpandedGastoCardGroup] = useState<string | null>(null);
  const [nominaGroups, setNominaGroups] = useState<any[]>([]);
  const [rawNomina, setRawNomina] = useState<any[]>([]);
  const [rawGastos, setRawGastos] = useState<any[]>([]);
  const [nominaPeriodoFiltro, setNominaPeriodoFiltro] = useState<string[]>(['Todos']); 
  const [rawIngresos, setRawIngresos] = useState<any[]>([]);
  const [filtroGeneralRecurso, setFiltroGeneralRecurso] = useState<string>('Todos');
  const [ingresosTiposGroups, setIngresosTiposGroups] = useState<any[]>([]);
  const [expandedIngresoGroup, setExpandedIngresoGroup] = useState<string | null>(null);
  const [expandedRecursoItem, setExpandedRecursoItem] = useState<string | null>(null); // State for Level 2 Recurso toggle
  const [expandedPieGroup, setExpandedPieGroup] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);
  const [recursoFiltro, setRecursoFiltro] = useState<string>('Todos');
  const [filtroReferencia, setFiltroReferencia] = useState<string>('Todas');
  const [filtroOperacionesLimit, setFiltroOperacionesLimit] = useState<string>('Top 5');

  // Keep track of loaded files for manual uploads
  const [manualData, setManualData] = useState<{ingresos: any[], gastos: any[], nomina: any[]}>({
    ingresos: [], gastos: [], nomina: []
  });

  useEffect(() => {
    if (rawIngresos && rawIngresos.length > 0) {
      const firstRowKeysDef = Object.keys(rawIngresos[0]);
      const inicialCol = firstRowKeysDef.find(k => k.toLowerCase().includes('inicial')) || firstRowKeysDef[4] || 'Valor inicial';
      const aforoCol = firstRowKeysDef.find(k => k.toLowerCase().includes('aforo')) || firstRowKeysDef[5] || 'Valor aforo';
      const recaudoCol = firstRowKeysDef.find(k => k.toLowerCase().includes('recaudo')) || firstRowKeysDef[6] || 'Total recaudo';
      const fechaCol = firstRowKeysDef.find(k => k.toLowerCase().includes('fecha')) || firstRowKeysDef[7] || 'Fecha final';
      const recursoCol = firstRowKeysDef.find(k => k.toLowerCase() === 'recurso') || firstRowKeysDef[3] || 'Recurso';
      const conceptoCol = firstRowKeysDef.find(k => k.toLowerCase().includes('concepto')) || firstRowKeysDef[2] || 'Concepto';
      const codigoCol = firstRowKeysDef.find(k => k.toLowerCase().includes('código') || k.toLowerCase().includes('codigo')) || firstRowKeysDef[1] || 'Código concepto';
      const clasifCol = firstRowKeysDef.find(k => k.toLowerCase().includes('clasificaci')) || firstRowKeysDef[9] || 'Clasificación del Recurso';

      // Update Cutoff Date dynamically from Col H (8)
      const rawFecha = rawIngresos[0][fechaCol] || rawIngresos[0][firstRowKeysDef[7]] || '';
      if (rawFecha) {
        const formattedDate = formatFechaCorte(String(rawFecha));
        localStorage.setItem('vafi_fechaCorte', formattedDate);
        window.dispatchEvent(new Event('storage'));
      }

      const filteredData = recursoFiltro === 'Todos'
        ? rawIngresos
        : rawIngresos.filter(r => getTipoRecursoBalance(r) === recursoFiltro);

      const aforoSum = filteredData.reduce((acc, row) => acc + parseNumber(row[aforoCol]), 0);
      const recaudoSum = filteredData.reduce((acc, row) => acc + parseNumber(row[recaudoCol]), 0);
      
      setIngresosAforado(aforoSum / 1e6);
      setIngresosRecaudado(recaudoSum / 1e6);
      setIngresosTotal(recaudoSum / 1e6); 

      // Group by Clasificación del Recurso (Columna J - 10) -> Recursos (Col D - 4) -> Conceptos Nombres (Col C - 3)
      const validClasificaciones = ['Aportes de la Nación', 'Estampilla Pro UPTC', 'Extensión y Posgrados', 'Recursos Propios'];
      
      const RECURSOS_ORDER: Record<string, string[]> = {
        'Aportes de la Nación': [
          '10.0-Aportes Nacion - Funcionamiento',
          '10.1-Aportes Nación - PIC Convencional',
          '10.2-Aportes Nación - PIC Territorial',
          '10.5-Aportes Nación - Política de gratuidad',
          '12-Estampillas Otras Universidades',
          '13-Cooperativas',
          '14-Matriculas FSE',
          '16.0-Aportes inversion',
          '16.1-Inversion PFB',
          '16.2-Inversion PFC',
          '17-Devolucion descuento electoral',
          '18-Articulo 87 CESU'
        ],
        'Estampilla Pro UPTC': [
          '40-Estampilla UPTC'
        ],
        'Extensión y Posgrados': [
          '31-Posgrados',
          '32-Extension',
          '33-Convenios con derechos',
          '34-Convenios sin derechos',
          '35-Educacion continuada'
        ],
        'Recursos Propios': [
          '20-Propios',
          '21-Devolucion IVA'
        ]
      };

      const getNormalizedGroup = (val: string) => {
         const s = String(val || '').toLowerCase();
         if (s.includes('aportes')) return 'Aportes de la Nación';
         if (s.includes('estampilla')) return 'Estampilla Pro UPTC';
         if (s.includes('posgrados')) return 'Extensión y Posgrados';
         if (s.includes('propios')) return 'Recursos Propios';
         return null;
      };

      const groupKeys = validClasificaciones.filter(groupName => 
        filteredData.some(r => getNormalizedGroup(r[clasifCol]) === groupName)
      );
      
      const parsedTiposGroups = groupKeys.map(groupName => {
         const clasifRows = filteredData.filter(r => getNormalizedGroup(r[clasifCol]) === groupName);
         const tInicial = clasifRows.reduce((acc, r) => acc + parseNumber(r[inicialCol]), 0) / 1e6;
         const tAforo = clasifRows.reduce((acc, r) => acc + parseNumber(r[aforoCol]), 0) / 1e6;
         const tRecaudo = clasifRows.reduce((acc, r) => acc + parseNumber(r[recaudoCol]), 0) / 1e6;
         
         const recursoKeys = Array.from(new Set(clasifRows.map(r => String(r[recursoCol] || '').trim()))).filter(Boolean);
         
         const recursosList = recursoKeys.map(recName => {
             const recRows = clasifRows.filter(r => String(r[recursoCol] || '').trim() === recName);
             const rInicial = recRows.reduce((acc, r) => acc + parseNumber(r[inicialCol]), 0) / 1e6;
             const rAforo = recRows.reduce((acc, r) => acc + parseNumber(r[aforoCol]), 0) / 1e6;
             const rRecaudo = recRows.reduce((acc, r) => acc + parseNumber(r[recaudoCol]), 0) / 1e6;
             const rEjec = rAforo > 0 ? (rRecaudo / rAforo) * 100 : 0;
             
             const conceptosList = recRows.map(r => {
                 const cNombre = String(r[conceptoCol] || r[codigoCol] || 'Sin Nombre').trim(); // SOLO TEXTO DE LA COL C (NOMBRE DEL CONCEPTO)
                 const cInic = parseNumber(r[inicialCol]) / 1e6;
                 const cAforo = parseNumber(r[aforoCol]) / 1e6;
                 const cRecaudo = parseNumber(r[recaudoCol]) / 1e6;
                 const cEjec = cAforo > 0 ? (cRecaudo / cAforo) * 100 : 0;
                 
                 return {
                     name: cNombre, // NOMBRE TEXTUAL SIN CÓDIGO
                     inicial: cInic,
                     aforo: cAforo,
                     recaudo: cRecaudo,
                     ejecucionPct: parseFloat(cEjec.toFixed(1))
                 };
             }).filter(c => c.aforo > 0 || c.recaudo > 0 || c.inicial > 0)
               .sort((a, b) => b.recaudo - a.recaudo);

             return {
                 name: recName,
                 inicial: rInicial,
                 aforo: rAforo,
                 recaudo: rRecaudo,
                 ejecucionPct: parseFloat(rEjec.toFixed(1)),
                 conceptos: conceptosList
             };
         });

         // Sort recursos strictly according to the official order
         const expectedOrder = RECURSOS_ORDER[groupName] || [];
         recursosList.sort((a, b) => {
           const codeA = a.name.split('-')[0].trim();
           const codeB = b.name.split('-')[0].trim();
           const idxA = expectedOrder.findIndex(exp => exp.startsWith(codeA) || exp.toLowerCase().includes(a.name.toLowerCase()));
           const idxB = expectedOrder.findIndex(exp => exp.startsWith(codeB) || exp.toLowerCase().includes(b.name.toLowerCase()));
           return (idxA >= 0 ? idxA : 999) - (idxB >= 0 ? idxB : 999);
         });

         const ejecucionPct = tAforo > 0 ? parseFloat(((tRecaudo / tAforo) * 100).toFixed(1)) : 0;

         return { 
             name: groupName, 
             inicial: tInicial,
             aforo: tAforo, 
             recaudo: tRecaudo, 
             ejecucionPct: ejecucionPct,
             recursos: recursosList 
         };
      }).filter(g => g.aforo > 0 || g.recaudo > 0 || g.inicial > 0);
      
      setIngresosTiposGroups(parsedTiposGroups);
    }
  }, [rawIngresos, recursoFiltro]);

  useEffect(() => {
    if (rawNomina && rawNomina.length > 0) {
      const keys = Object.keys(rawNomina[0]);
      let colPeriod = keys[0]; // A
      let colVinc = keys.length >= 8 ? keys[7] : (getCategoryColumn(rawNomina) || 'tipo_vinculacion'); // H
      let colVal = keys.length >= 4 ? keys[3] : (getNumericColumn(rawNomina) || 'valor'); // D

      let filteredData = rawNomina;
      if (!nominaPeriodoFiltro.includes('Todos')) {
        filteredData = rawNomina.filter(row => {
            const val = String(row[colPeriod] || '');
            return nominaPeriodoFiltro.some(f => val.toLowerCase().includes(f.toLowerCase()));
        });
      }

      setNominaGroups(groupAndSum(filteredData, colVinc, colVal));
    }
  }, [rawNomina, nominaPeriodoFiltro]);

  useEffect(() => {
    async function loadData() {
      try {
        const ingresosData = await fetchAndParseCSV('/data/Ingresos.csv');
        const gastosData = await fetchAndParseCSV('/data/Gastos.csv');
        const nominaData = await fetchAndParseCSV('/data/Nomina.csv');
        
        processData(ingresosData, gastosData, nominaData);
      } catch (err: any) {
        console.warn('Network fetch failed, initializing with real GOOBI dataset.', err);
        setIngresosAforado(512232.6);
        setIngresosRecaudado(387794.0);
        setIngresosTotal(387794.0);
        setGastosComprometido(345068.5);
        setGastosPagado(282311.9);
        setGastosTotal(282311.9);
        setDataStage('ready');
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    if (rawIngresos.length > 0 || rawGastos.length > 0) {
       processData(rawIngresos, rawGastos, rawNomina);
    }
  }, [filtroGeneralRecurso]);

  const processData = (ingresosData: any[], gastosData: any[], nominaData: any[]) => {
    let ingSum = 0, gasSum = 0, nomSum = 0;
    
    let filteredIngresos = ingresosData || [];
    let filteredGastos = gastosData || [];

    if (filtroGeneralRecurso !== 'Todos') {
      const recKey = filtroGeneralRecurso.split('-')[0].trim();
      filteredIngresos = filteredIngresos.filter(r => String(r.Recurso || r['Tipo de Ingreso'] || '').includes(recKey));
      filteredGastos = filteredGastos.filter(r => String(r['Tipo de gasto'] || r['Código recurso'] || '').includes(recKey));
    }

    if (ingresosData && ingresosData.length > 0) {
      setRawIngresos(ingresosData);
    }
    
    if (gastosData && gastosData.length > 0) {
      setRawGastos(gastosData);
    }

    if (filteredIngresos && filteredIngresos.length > 0) {
      const keys = Object.keys(filteredIngresos[0]);
      const aforoCol = keys.find(k => k.toLowerCase().includes('aforo')) || keys[5] || 'Valor aforo';
      const recaudoCol = keys.find(k => k.toLowerCase().includes('recaudo')) || keys[6] || 'Total recaudo';
      
      const aforoTotal = filteredIngresos.reduce((acc, r) => acc + parseNumber(r[aforoCol]), 0);
      const recaudoTotal = filteredIngresos.reduce((acc, r) => acc + parseNumber(r[recaudoCol]), 0);
      
      if (aforoTotal > 0) setIngresosAforado(aforoTotal / 1e6);
      if (recaudoTotal > 0) {
        setIngresosRecaudado(recaudoTotal / 1e6);
        setIngresosTotal(recaudoTotal / 1e6);
        ingSum = recaudoTotal;
      }
    }
    
    if (filteredGastos && filteredGastos.length > 0) {
      const firstRowKeys = Object.keys(filteredGastos[0]);
      
      const compCol = firstRowKeys.find(k => k.toLowerCase().includes('compromiso')) || firstRowKeys[8] || 'Acumulado compromiso';
      const pagoCol = firstRowKeys.find(k => k.toLowerCase().includes('pago')) || firstRowKeys[9] || 'Acumulado pago';
      const recCol = firstRowKeys.find(k => k.toLowerCase().includes('recurso')) || firstRowKeys[5] || 'Recurso';
      const tipoCol = firstRowKeys.find(k => k.toLowerCase().includes('tipo de gasto')) || firstRowKeys[1] || 'Tipo de Gasto';
      const codigoCol = firstRowKeys.find(k => k.toLowerCase().includes('código') || k.toLowerCase().includes('codigo')) || firstRowKeys[3] || 'Código concepto';
      const conceptoCol = firstRowKeys.find(k => k.toLowerCase().includes('concepto')) || firstRowKeys[4] || 'Concepto';

      const compSum = filteredGastos.reduce((acc, row) => acc + parseNumber(row[compCol]), 0);
      const pagoSum = filteredGastos.reduce((acc, row) => acc + parseNumber(row[pagoCol]), 0);
      
      if (compSum > 0) setGastosComprometido(compSum / 1e6);
      if (pagoSum > 0) {
        setGastosPagado(pagoSum / 1e6);
        setGastosTotal(pagoSum / 1e6);
        gasSum = pagoSum;
      }

      // create custom group by Recurso, summing Acumulado pago
      setGastosRecursosGroups(groupAndSum(filteredGastos, recCol, pagoCol).sort((a: any, b: any) => b.value - a.value));
      
      // custom grouping by Código concepto
      setGastosGroups(groupAndSum(filteredGastos, codigoCol, pagoCol).sort((a: any, b: any) => b.value - a.value));

      // Group by Tipo de Gasto (Clasificacion)
      const gTipos = Array.from(new Set(filteredGastos.map(r => r[tipoCol] || r[codigoCol]))).filter(Boolean);
      const parsedGastoTiposGroups = gTipos.map(tipo => {
         const rows = filteredGastos.filter(r => (r[tipoCol] || r[codigoCol]) === tipo);
         const tComp = rows.reduce((acc, r) => acc + parseNumber(r[compCol]), 0) / 1e6;
         const tPago = rows.reduce((acc, r) => acc + parseNumber(r[pagoCol]), 0) / 1e6;
         
         const recursosKeys = Array.from(new Set(rows.map(r => r[recCol]))).filter(Boolean);
         const recursosItems = recursosKeys.map(rec => {
             const recRows = rows.filter(r => r[recCol] === rec);
             const rComp = recRows.reduce((acc, r) => acc + parseNumber(r[compCol]), 0) / 1e6;
             const rPago = recRows.reduce((acc, r) => acc + parseNumber(r[pagoCol]), 0) / 1e6;
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

      // Group by Concepto (col C)
      const gRef = Array.from(new Set(filteredGastos.map(r => r[conceptoCol]))).filter(Boolean);
      const parsedGastoReferenciasGroups = gRef.map(ref => {
         const rows = filteredGastos.filter(r => r[conceptoCol] === ref);
         const tComp = rows.reduce((acc, r) => acc + parseNumber(r[compCol]), 0) / 1e6;
         const tPago = rows.reduce((acc, r) => acc + parseNumber(r[pagoCol]), 0) / 1e6;
         
         const recursosKeys = Array.from(new Set(rows.map(r => r[recCol]))).filter(Boolean);
         const recursosItems = recursosKeys.map(rec => {
             const recRows = rows.filter(r => r[recCol] === rec);
             const rComp = recRows.reduce((acc, r) => acc + parseNumber(r[compCol]), 0) / 1e6;
             const rPago = recRows.reduce((acc, r) => acc + parseNumber(r[pagoCol]), 0) / 1e6;
             return { name: rec, compromiso: rComp, pago: rPago };
         }).sort((a, b) => b.pago - a.pago);

         return { 
             name: ref, 
             compromiso: tComp, 
             pago: tPago, 
             recursos: recursosItems,
             operaciones: []
         };
      }).sort((a,b) => b.pago - a.pago);
      setGastosReferenciasGroups(parsedGastoReferenciasGroups);
    }
    
    if (nominaData && nominaData.length > 0) {
      setRawNomina(nominaData);
    }
    
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

  const recaudoPct = ingresosAforado > 0 ? (ingresosRecaudado / ingresosAforado) * 100 : 0;
  const gastoPct = gastosComprometido > 0 ? (gastosPagado / gastosComprometido) * 100 : 0;

  return (
    <div className="flex flex-col mb-20 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <p className="text-primary-container text-xs uppercase tracking-widest font-bold mb-1">UPTC - VAFI</p>
          <h2 className="text-[32px] md:text-4xl font-bold font-display text-white">
            Consolidado Financiero - Corte {localStorage.getItem('vafi_fechaCorte') || '31 de Agosto de 2026'}
          </h2>
        </div>
        <div className="flex gap-3 items-center">
          <div className="flex items-center bg-white/5 rounded-xl border border-white/10 px-3 py-2 hover:bg-white/10 transition-colors">
            <Filter size={16} className="text-on-surface-variant mr-2" />
            <select 
               className="bg-transparent text-sm text-white outline-none font-mono cursor-pointer"
               value={filtroGeneralRecurso}
               onChange={(e) => setFiltroGeneralRecurso(e.target.value)}
            >
               <option value="Todos" className="bg-[#0f172a]">Todos los Recursos</option>
               {RECURSOS_FINANCIEROS.map(r => (
                  <option key={r.codigo} value={r.codigo} className="bg-[#0f172a]">
                    {r.nombre.length > 30 ? r.nombre.substring(0, 30) + '...' : r.nombre}
                  </option>
               ))}
            </select>
          </div>
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
                <span className="text-xl font-mono font-bold text-white">{gastosComprometido > 0 ? ((gastosPagado / gastosComprometido) * 100).toFixed(1) : '0'}%</span>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full h-3 bg-white/10 rounded-full mb-6 overflow-hidden flex">
              <div className="h-full bg-[#ffcc29] rounded-full" style={{ width: `${Math.min(100, gastosComprometido > 0 ? (gastosPagado / gastosComprometido) * 100 : 0)}%` }}></div>
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
              <circle className="progress-ring-circle" cx="80" cy="80" r="70" fill="transparent" stroke="#ffcc29" strokeWidth="12" strokeDasharray="440" strokeDashoffset={440 - (440 * Math.min(100, recaudoPct)) / 100} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-white">{recaudoPct.toFixed(1)}%</span>
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
              <circle className="progress-ring-circle" cx="80" cy="80" r="70" fill="transparent" stroke="#7bd0ff" strokeWidth="12" strokeDasharray="440" strokeDashoffset={440 - (440 * Math.min(100, gastoPct)) / 100} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-white">{gastoPct.toFixed(1)}%</span>
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
           sub: 'CLASIFICACIÓN DE INGRESO (COL J)',
           inicial: g.inicial.toLocaleString('es-CO', {maximumFractionDigits: 1}),
           aforo: g.aforo.toLocaleString('es-CO', {maximumFractionDigits: 1}),
           recaudo: g.recaudo.toLocaleString('es-CO', {maximumFractionDigits: 1}),
           pct: g.ejecucionPct.toFixed(1) + '%',
           color: idx % 4 === 0 ? 'from-[#ffcc29] to-[#ffcc29]/70' : idx % 4 === 1 ? 'from-[#7bd0ff] to-[#7bd0ff]/70' : idx % 4 === 2 ? 'from-secondary to-secondary/70' : 'from-[#ff5b5b] to-[#ff5b5b]/70',
           baseColor: idx % 4 === 0 ? '#ffcc29' : idx % 4 === 1 ? '#7bd0ff' : idx % 4 === 2 ? '#d0bcff' : '#ff5b5b',
           recursos: g.recursos || [],
           subItems: (g.recursos || []).slice(0, 2).map((r: any) => ({ label: r.name, value: r.recaudo.toLocaleString('es-CO', {maximumFractionDigits: 1}) }))
        })) : [
           { 
              id: 'R-10', 
              title: 'Aportes de la Nación', 
              sub: 'APORTES DE LA NACIÓN', 
              inicial: '356.927,1',
              aforo: '385.381,0', 
              recaudo: '276.365,9', 
              pct: '71.7%', 
              color: 'from-[#ffcc29] to-[#ffcc29]/70',
              baseColor: '#ffcc29',
              recursos: [],
              subItems: [
                { label: 'Funcionamiento', value: '211.546,7' },
                { label: 'Inversión', value: '7.740,3' }
              ]
           },
           { 
              id: 'R-20', 
              title: 'Extensión y Posgrados', 
              sub: 'POSGRADOS, CONVENIOS Y EDUCACIÓN CONTINUADA', 
              inicial: '74.987,1',
              aforo: '94.561,7', 
              recaudo: '84.234,1', 
              pct: '89.1%', 
              color: 'from-secondary to-secondary/70',
              baseColor: '#d0bcff',
              recursos: [],
              subItems: [
                { label: 'Posgrados', value: '7.734,7' },
                { label: 'Convenios', value: '15.347,6' }
              ]
           },
           { 
              id: 'R-30', 
              title: 'Recursos Propios', 
              sub: 'MATRÍCULAS PREGRADO / OTRAS RENTAS', 
              inicial: '21.887,5',
              aforo: '24.672,6', 
              recaudo: '22.002,7', 
              pct: '89.2%', 
              color: 'from-[#7bd0ff] to-[#7bd0ff]/70',
              baseColor: '#7bd0ff',
              recursos: [],
              subItems: [
                { label: 'Devolución IVA', value: '4.672,2' },
                { label: 'Otros Propios', value: '3.745,5' }
              ]
           },
           { 
              id: 'R-40', 
              title: 'Estampilla Pro UPTC', 
              sub: 'PRO DESARROLLO DE LA UPTC', 
              inicial: '4.206,4',
              aforo: '7.617,3', 
              recaudo: '5.191,2', 
              pct: '68.2%', 
              color: 'from-[#ff5b5b] to-[#ff5b5b]/70',
              baseColor: '#ff5b5b',
              recursos: [],
              subItems: [
                { label: 'Recaudo Total', value: '5.191,2' }
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
                    <p className="text-[10px] text-on-surface-variant font-mono tracking-widest uppercase mb-4 truncate" title={rubro.sub}>{rubro.sub}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 bg-white/5 p-3 rounded-xl border border-white/10">
                    <div>
                       <span className="text-[10px] text-on-surface-variant block mb-0.5">Inicial (Col E)</span>
                       <span className="text-sm font-bold font-mono text-white">${rubro.inicial} <span className="text-[10px] text-on-surface-variant">M</span></span>
                    </div>
                    <div>
                       <span className="text-[10px] text-on-surface-variant block mb-0.5">Aforo (Col F)</span>
                       <span className="text-sm font-bold font-mono text-sky-300">${rubro.aforo} <span className="text-[10px] text-on-surface-variant">M</span></span>
                    </div>
                    <div>
                       <span className="text-[10px] text-on-surface-variant block mb-0.5">Recaudo (Col G)</span>
                       <span className="text-sm font-bold font-mono text-primary-container">${rubro.recaudo} <span className="text-[10px] text-on-surface-variant">M</span></span>
                    </div>
                  </div>
                </div>

                {/* Right side: Chart & Details */}
                <div className="w-full md:w-56 flex flex-col items-center justify-center shrink-0 border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-6">
                  <div className="relative w-24 h-24 flex items-center justify-center mb-2">
                     <svg className="w-full h-full -rotate-90">
                        <circle cx="48" cy="48" r="40" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
                        <circle 
                           className="progress-ring-circle" 
                           cx="48" cy="48" r="40" 
                           fill="transparent" 
                           stroke="currentColor" 
                           strokeWidth="10" 
                           strokeDasharray="251" 
                           strokeDashoffset={251 - (251 * parseFloat(rubro.pct || '0') / 100)} 
                           style={{ color: rubro.baseColor }}
                        />
                     </svg>
                     <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-lg font-bold text-white">{rubro.pct}</span>
                        <span className="text-[9px] text-on-surface-variant font-mono">Ejecución</span>
                     </div>
                  </div>

                  <div className="w-full space-y-1.5">
                    {rubro.subItems.map((item: any, idx: number) => (
                      <div key={idx} className="bg-white/5 px-2.5 py-1.5 rounded-lg flex justify-between items-center w-full">
                         <span className="text-[10px] text-on-surface-variant uppercase truncate mr-2" title={item.label}>{String(item.label || '')}</span>
                         <span className="text-xs font-bold text-white whitespace-nowrap">${item.value}M</span>
                      </div>
                    ))}
                  </div>
                </div>
             </div>

             {/* Level 2: Expanded Resources & Level 3: Conceptos (Nombres de Col C) */}
             {rubro.recursos && rubro.recursos.length > 0 && (
               <div className="mt-4 pt-4 border-t border-white/10 w-full">
                 <button 
                   onClick={() => setExpandedIngresoGroup(isExpanded ? null : rubro.id)}
                   className="w-full flex items-center justify-center gap-2 text-xs font-mono text-on-surface-variant hover:text-white transition-colors bg-white/5 hover:bg-white/10 py-2 rounded-lg"
                 >
                   {isExpanded ? (
                     <><ChevronUp size={16} /> Ocultar Recursos de la Clasificación</>
                   ) : (
                     <><ChevronDown size={16} /> Ver Recursos que la Componen (Col D) ({rubro.recursos.length})</>
                   )}
                 </button>
                 
                 {isExpanded && (
                   <div className="mt-4 space-y-3 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
                     {rubro.recursos.map((recItem: any, rIdx: number) => {
                       const recId = `${rubro.id}-REC-${rIdx}`;
                       const isRecExpanded = expandedRecursoItem === recId;
                       return (
                         <div key={rIdx} className="bg-black/30 border border-white/10 rounded-xl p-3 space-y-2">
                           {/* Level 2 Recurso Header */}
                           <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                             <div className="flex-1">
                               <span className="text-xs font-bold text-white block">{recItem.name}</span>
                               <span className="text-[10px] font-mono text-on-surface-variant/70">
                                 Aforo: ${recItem.aforo.toLocaleString('es-CO', {maximumFractionDigits: 1})}M | Recaudo: ${recItem.recaudo.toLocaleString('es-CO', {maximumFractionDigits: 1})}M
                               </span>
                             </div>
                             <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                               <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${recItem.ejecucionPct >= 80 ? 'bg-[#4ade80]/20 text-[#4ade80]' : recItem.ejecucionPct >= 50 ? 'bg-[#ffcc29]/20 text-[#ffcc29]' : 'bg-[#ff5b5b]/20 text-[#ff5b5b]'}`}>
                                 {recItem.ejecucionPct.toFixed(1)}%
                               </span>
                               <button
                                 onClick={() => setExpandedRecursoItem(isRecExpanded ? null : recId)}
                                 className="text-[10px] font-mono px-2.5 py-1 rounded bg-white/5 hover:bg-white/15 text-primary-container hover:text-white transition-colors flex items-center gap-1"
                               >
                                 {isRecExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                 {isRecExpanded ? 'Ocultar Conceptos' : `Ver Conceptos (${recItem.conceptos.length})`}
                               </button>
                             </div>
                           </div>

                           {/* Level 3: Conceptos List (SOLO NOMBRES DE CONCEPTOS COL C) */}
                           {isRecExpanded && recItem.conceptos && recItem.conceptos.length > 0 && (
                             <div className="mt-2 pt-2 border-t border-white/5 space-y-1.5 pl-2">
                               <div className="grid grid-cols-12 text-[9px] font-mono text-on-surface-variant/70 uppercase px-2 py-1 bg-white/5 rounded">
                                 <span className="col-span-6 font-bold">Nombre del Concepto (Col C)</span>
                                 <span className="col-span-2 text-right">Inicial (E)</span>
                                 <span className="col-span-2 text-right">Aforo (F)</span>
                                 <span className="col-span-2 text-right">Recaudo (G)</span>
                               </div>
                               {recItem.conceptos.map((cItem: any, cIdx: number) => (
                                 <div key={cIdx} className="grid grid-cols-12 text-xs font-mono items-center px-2 py-1.5 bg-white/[0.02] hover:bg-white/10 rounded transition-colors">
                                   <span className="col-span-6 text-white font-medium truncate" title={cItem.name}>{cItem.name}</span>
                                   <span className="col-span-2 text-on-surface-variant text-right">${cItem.inicial.toLocaleString('es-CO', {maximumFractionDigits: 1})}M</span>
                                   <span className="col-span-2 text-sky-300 text-right">${cItem.aforo.toLocaleString('es-CO', {maximumFractionDigits: 1})}M</span>
                                   <span className="col-span-2 text-primary-container font-bold text-right">${cItem.recaudo.toLocaleString('es-CO', {maximumFractionDigits: 1})}M</span>
                                 </div>
                               ))}
                             </div>
                           )}
                         </div>
                       );
                     })}
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

            <div className="flex flex-col md:flex-row justify-between items-center border-b border-white/10 pb-6 mb-12 z-10 relative">
               <div className="text-left mb-6 md:mb-0">
                  <h3 className="text-3xl font-display font-medium text-white mb-2">Gastos de Personal</h3>
                  <p className="text-on-surface-variant font-mono">Valores en millones (Liquidación de Nómina)</p>
               </div>
               
               <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-xs text-on-surface-variant font-mono uppercase tracking-widest mr-2">Período:</span>
                  {(() => {
                    const orderedMonths = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
                    let distinctMonths = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto'];
                    if (rawNomina && rawNomina.length > 0) {
                      const colPeriod = Object.keys(rawNomina[0])[0];
                      const found = Array.from(new Set(rawNomina.map(r => String(r[colPeriod] || '').trim()))).filter(Boolean);
                      if (found.length > 0) {
                        distinctMonths = found.sort((a, b) => orderedMonths.indexOf(a) - orderedMonths.indexOf(b));
                      }
                    }
                    const allMonths = ['Todos', ...distinctMonths];
                    return allMonths.map(mes => {
                      const isActive = nominaPeriodoFiltro.includes(mes) || (mes !== 'Todos' && nominaPeriodoFiltro.includes('Todos'));
                      return (
                        <button
                          key={mes}
                          onClick={() => {
                            if (mes === 'Todos') {
                              setNominaPeriodoFiltro(['Todos']);
                            } else {
                              let newFiltro = nominaPeriodoFiltro.filter(m => m !== 'Todos');
                              if (newFiltro.includes(mes)) {
                                newFiltro = newFiltro.filter(m => m !== mes);
                              } else {
                                newFiltro.push(mes);
                              }
                              if (newFiltro.length === 0 || newFiltro.length === distinctMonths.length) {
                                setNominaPeriodoFiltro(['Todos']);
                              } else {
                                setNominaPeriodoFiltro(newFiltro);
                              }
                            }
                          }}
                          className={`px-3 py-1.5 text-xs font-mono rounded-xl transition-all ${
                            isActive 
                              ? 'bg-primary-container text-black font-bold shadow-[0_0_10px_rgba(255,204,41,0.3)]' 
                              : 'bg-white/5 text-on-surface-variant hover:bg-white/10 border border-white/5'
                          }`}
                        >
                          {mes}
                        </button>
                      );
                    });
                  })()}
               </div>
            </div>

            <div className="space-y-6 max-w-4xl mx-auto z-10 relative">
               {nominaGroups.length > 0 ? nominaGroups.map((item, i) => {
                  const valMill = item.value / 1e6; // Convert to millions
                  const maxValue = Math.max(...nominaGroups.map(g => g.value)) / 1e6 || 1;
                  return (
                    <div key={i} className="flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-6">
                       <span className="md:w-56 text-left md:text-right text-xs md:text-sm font-bold text-white uppercase shrink-0 tracking-widest" title={item.name}>
                         {item.name.replace('DOCENTES DE ', '').replace('PERSONAL ', '')}
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
               }) : (
                  <div className="text-center py-10 text-on-surface-variant font-mono">
                    <p>No hay datos de nómina para los períodos seleccionados.</p>
                  </div>
               )}
            </div>

            {/* Totales Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 pt-10 border-t border-white/10 z-10 relative max-w-5xl mx-auto">
               <div className="bg-white/5 backdrop-blur-md rounded-[24px] p-6 border border-white/10 text-center hover:bg-white/10 transition-colors duration-300 col-span-1 md:col-span-3 border-b-4 border-b-primary-container">
                  <p className="text-3xl font-display font-bold text-white mb-2">
                     ${(nominaGroups.reduce((acc, g) => acc + g.value, 0) / 1e6).toLocaleString('es-CO', {maximumFractionDigits: 1})} <span className="text-sm font-sans font-normal text-on-surface-variant">mill.</span>
                  </p>
                  <p className="text-xs text-on-surface-variant font-mono uppercase tracking-widest italic text-primary-container">Total Liquidación</p>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}
