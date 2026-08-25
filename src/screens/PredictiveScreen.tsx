import { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ComposedChart, Line,
  ReferenceLine
} from 'recharts';
import { 
  Filter, DollarSign, Activity, TrendingUp, Briefcase, RefreshCw, Layers, 
  Compass, ChevronRight, PieChart as PieChartIcon, Table, CheckSquare,
  AlertTriangle, ShieldAlert, Gauge, TrendingDown, Target, ShieldCheck,
  ChevronUp, ChevronDown, Wallet, Users, Sliders, ArrowUpRight, ArrowDownRight,
  Sparkles, CheckCircle2, Zap, BarChart2, Award, Landmark, Bot, Lightbulb, Info,
  LayoutList, CheckCircle, Lock, Unlock, Check, ToggleLeft, ToggleRight,
  FileSpreadsheet, ArrowRight, XCircle, AlertCircle, HelpCircle, Shield,
  Building, SlidersHorizontal, Flame, Scale, FileText, UserCheck, Key, FileCheck,
  History, Eye, Search, Plus, Edit3, Trash2, ArrowUpDown
} from 'lucide-react';
import { fetchAndParseCSV } from '../lib/csvParser';
import { 
  calculateProjections, aggregateFlow, CashFlowItem, ProjectionResults, getRowUnidad,
  AcreenciaASA, ActivoRealItem, AuditLogItem, TornadoVariable, SensitivityScenario, RentItem,
  BUDGET_PAYROLL_2026, PAYROLL_REAL_ENE_JUL, PAYROLL_REMAINING_AGO_DIC
} from '../lib/financialEngine';
import { RESOURCES_LIST, getResourceFullName, getRecursoEquivalence } from '../lib/resourceMapper';
import { RECURSOS_FIJOS_RESOLUCION } from '../lib/constants';
import rawHistoricalGastos from '../data/historicalGastos.json';

const AI_ING_SUGGESTIONS: Record<string, { val: number; rationale: string }> = {
  '10': { val: 0.0, rationale: 'Fijo por Resolución MEN - Ley 30/92 ($315.327,8M).' },
  '10.1': { val: 0.0, rationale: 'Fijo por Resolución MEN - PIC Convencional ($9.756,7M).' },
  '10.2': { val: 0.0, rationale: 'Fijo por Resolución MEN - PIC Territorial ($3.996,7M).' },
  '10.5': { val: 0.0, rationale: 'Fijo por Resolución MEN - Gratuidad Ley 2307 ($20.708,4M).' },
  '12': { val: 0.0, rationale: 'Fijo por Ley 1697 / Estampilla Pro-UNAL ($17.266,1M).' },
  '13': { val: 0.0, rationale: 'Fijo por DIAN / Excedentes Cooperativas ($2.128,2M).' },
  '14': { val: 0.0, rationale: 'Fijo por Resolución Fondo FSE ($19.625,5M).' },
  '16': { val: 0.0, rationale: 'Fijo por Aportes Inversión PGN ($12.877,1M).' },
  '17': { val: 0.0, rationale: 'Fijo por Devolución Descuento Electoral Ley 403 ($5.447,5M).' },
  '18': { val: 0.0, rationale: 'Fijo por Artículo 87 Ley 30 / CESU ($1.035,9M).' },
  '20': { val: -1.5, rationale: 'Menor flujo de derechos de grado y trámites intersemestrales en Q4.' },
  '31': { val: 3.5, rationale: 'Nuevas cohortes de posgrado y convenios de extensión en Q4.' },
  '32': { val: 2.0, rationale: 'Contratos y consultorías de extensión universitaria en ejecución.' },
  '33': { val: 4.0, rationale: 'Desembolsos de convenios con derechos suscritos con entidades territoriales.' },
  '34': { val: 1.0, rationale: 'Convenios de cooperación académica internacional.' },
  '35': { val: 3.0, rationale: 'Diplomados y cursos de formación continua programados para fin de año.' },
  '40': { val: 5.0, rationale: 'Pico estacional por retenciones de estampillas sobre contratación pública regional.' }
};

const AI_GAS_CATEGORY_SUGGESTIONS: Record<string, { val: number; rationale: string }> = {
  'Personal': { val: 0.0, rationale: 'Techo oficial fijado en $369.650M; las primas y cesantías de diciembre ya están contempladas.' },
  'Funcionamiento': { val: 3.5, rationale: 'Cubre la indexación de servicios públicos fijos y contratos continuos de aseo y vigilancia.' },
  'Inversion': { val: 4.0, rationale: 'Aceleración de actas POAI considerando la restricción histórica estructural (máx. 70%).' },
  'Transferencias': { val: 0.0, rationale: 'Ejecución al 99.9% en Ene-Jul; gasto residual sin presiones de sobrecosto.' },
  'Tasas': { val: 0.0, rationale: 'Obligaciones tributarias y contribuciones regulatorias al día.' },
  'Deuda': { val: 0.0, rationale: 'Sin pasivos bancarios en amortización durante 2026.' }
};

const ALL_UPTC_UNITS = [
  '01 - ADMINISTRATIVA Y FINANCIERA',
  '02 - INVESTIGACION Y EXTENSION',
  '04 - CIENCIAS DE LA EDUCACION',
  '05 - CIENCIAS BASICAS',
  '06 - CIENCIAS ECONOMICAS, ADMINISTRATIVAS Y CONTABLES',
  '07 - CIENCIAS DE LA SALUD',
  '08 - CIENCIAS AGROPECUARIAS',
  '09 - INGENIERIA',
  '10 - DERECHO Y CIENCIAS SOCIALES',
  '11 - ESTUDIOS TECNOLOGICOS Y A DISTANCIA',
  '12 - SECCIONAL DUITAMA',
  '13 - SECCIONAL SOGAMOSO',
  '14 - SECCIONAL CHIQUINQUIRA',
  '15 - SEDE REGIONAL AGUAZUL'
];

export function PredictiveScreen({ onNavigate }: { onNavigate: (s: string) => void }) {
  const [dataStage, setDataStage] = useState<'loading' | 'ready'>('loading');
  const [rawYearlyIncomes, setRawYearlyIncomes] = useState<Record<number, any[]>>({});
  const [rawCumulativeIncomes, setRawCumulativeIncomes] = useState<any[]>([]);
  const [showSaveSuccess, setShowSaveSuccess] = useState<boolean>(false);
  
  // 8 Executive Tabs Combining Interactive Projections & EICE-2026 Ley 550
  const [activeTab, setActiveTab] = useState<'simulator' | 'monthly_balance' | 'equilibrio' | 'traceability' | 'asa' | 'inventory' | 'sensitivity' | 'audit'>('simulator');

  // Search & Filter States
  const [traceSearch, setTraceSearch] = useState<string>('');
  const [expandedTraceRow, setExpandedTraceRow] = useState<string | null>(null);

  // Interactive ASA State
  const [asaList, setAsaList] = useState<AcreenciaASA[]>([]);
  const [asaSearch, setAsaSearch] = useState<string>('');
  const [asaFilterGroup, setAsaFilterGroup] = useState<string>('TODOS');
  const [editingAsa, setEditingAsa] = useState<AcreenciaASA | null>(null);

  // Active Assets State
  const [activosList, setActivosList] = useState<ActivoRealItem[]>([]);
  const [activoTabType, setActivoTabType] = useState<string>('ALL');

  // Audit Log State
  const [auditLogsList, setAuditLogsList] = useState<AuditLogItem[]>([]);

  // Variable Projection Selection State (Rule: strictly project what is selected)
  const [selectedProjectedUnits, setSelectedProjectedUnits] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('vafi_selectedProjectedUnits');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [...ALL_UPTC_UNITS];
  });

  const [selectedProjectedResources, setSelectedProjectedResources] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('vafi_selectedProjectedResources');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [...RESOURCES_LIST];
  });

  const [selectedProjectedExpenseTypes, setSelectedProjectedExpenseTypes] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('vafi_selectedProjectedExpenseTypes');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return ['Personal', 'Funcionamiento', 'Inversion', 'Transferencias', 'Tasas', 'Deuda'];
  });

  const [flowGranularity, setFlowGranularity] = useState<'monthly' | 'quarterly' | 'semesterly' | 'annual'>('monthly');

  // Global Dropdown Filters
  const [filterUnidad, setFilterUnidad] = useState<string>('Todos');
  const [filterRecurso, setFilterRecurso] = useState<string>('Todos');

  // Sliders State
  const [simIngByResource, setSimIngByResource] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('vafi_simIngByResource');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    const init: Record<string, number> = {};
    RESOURCES_LIST.forEach(r => { init[r] = 0; });
    return init;
  });

  const [simGasByType, setSimGasByType] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('vafi_simGasByType');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      "Personal": 0, "Funcionamiento": 0, "Transferencias": 0, "Tasas": 0, "Deuda": 0, "Inversion": 0
    };
  });

  // Fetch datasets
  useEffect(() => {
    async function loadAllData() {
      try {
        const years = [2023, 2024, 2025, 2026];
        const loadedData: Record<number, any[]> = {};
        
        await Promise.all(years.map(async (year) => {
          try {
            const rows = await fetchAndParseCSV(`/data/Ingreso%20Mensual%20${year}.csv`);
            if (rows && rows.length > 0) {
              loadedData[year] = rows;
            }
          } catch (e) {
            console.error(`Error loading Incomes ${year}:`, e);
          }
        }));
        
        try {
          const cumulativeIncomes = await fetchAndParseCSV('/data/Ingresos.csv');
          if (cumulativeIncomes && cumulativeIncomes.length > 0) {
            setRawCumulativeIncomes(cumulativeIncomes);
          }
        } catch (e) {
          console.error("Error loading cumulative incomes:", e);
        }

        setRawYearlyIncomes(loadedData);
        setDataStage('ready');
      } catch (err) {
        console.error("Critical error in PredictiveScreen loadData:", err);
        setDataStage('ready');
      }
    }

    loadAllData();
  }, []);

  // Filter dropdown options
  const filterOptions = useMemo(() => {
    const recursos = ['Todos', ...RESOURCES_LIST];
    const unidadesSet = new Set<string>(ALL_UPTC_UNITS);

    rawHistoricalGastos.forEach(row => {
      if (row.dependencia && row.dependencia !== 'Sin Dependencia') unidadesSet.add(row.dependencia);
    });

    return {
      recursos,
      unidades: ['Todos', ...Array.from(unidadesSet).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))],
      tiposGasto: ['Todos', 'Personal', 'Funcionamiento', 'Inversión', 'Transferencias', 'Tasas', 'Deuda']
    };
  }, [rawYearlyIncomes]);

  // Calculation Engine
  const financialData: ProjectionResults = useMemo(() => {
    return calculateProjections({
      rawYearlyIncomes,
      rawCumulativeIncomes,
      rawHistoricalGastos,
      filterUnidad,
      filterRecurso,
      simIngByResource,
      simGasByType,
      selectedProjectedUnits,
      selectedProjectedResources,
      selectedProjectedExpenseTypes
    });
  }, [
    rawYearlyIncomes, rawCumulativeIncomes, filterUnidad, filterRecurso,
    simIngByResource, simGasByType, selectedProjectedUnits,
    selectedProjectedResources, selectedProjectedExpenseTypes
  ]);

  // Sync EICE datasets on engine calculate
  useEffect(() => {
    if (financialData) {
      setAsaList(financialData.acreenciasASA);
      setActivosList(financialData.activosReales);
      setAuditLogsList(financialData.auditLogs);
    }
  }, [financialData]);

  // Aggregated temporal cash flow
  const aggregatedFlowData = useMemo(() => {
    return aggregateFlow(financialData.simulatedFlow, flowGranularity);
  }, [financialData.simulatedFlow, flowGranularity]);

  // Filtered Traceability Matrix
  const filteredTraceability = useMemo(() => {
    if (!financialData?.traceabilityMatrix) return [];
    if (!traceSearch.trim()) return financialData.traceabilityMatrix;
    const q = traceSearch.toLowerCase();
    return financialData.traceabilityMatrix.filter(t => 
      t.resourceCode.toLowerCase().includes(q) || 
      t.resourceName.toLowerCase().includes(q) ||
      t.unitName.toLowerCase().includes(q) ||
      t.status.toLowerCase().includes(q)
    );
  }, [financialData.traceabilityMatrix, traceSearch]);

  // Filtered ASA List
  const filteredASA = useMemo(() => {
    return asaList.filter(item => {
      if (asaFilterGroup !== 'TODOS' && !item.grupoAcreencia.startsWith(asaFilterGroup)) return false;
      if (asaSearch.trim()) {
        const q = asaSearch.toLowerCase();
        return (
          item.acreedorNombre.toLowerCase().includes(q) ||
          item.acreedorNit.toLowerCase().includes(q) ||
          item.subcuenta.toLowerCase().includes(q) ||
          item.concepto.toLowerCase().includes(q) ||
          item.cdpNumero.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [asaList, asaFilterGroup, asaSearch]);

  // ASA Totals Summary
  const asaTotals = useMemo(() => {
    const totalInicial = asaList.reduce((acc, a) => acc + a.saldoInicial, 0);
    const totalAjustes = asaList.reduce((acc, a) => acc + a.ajustesCapital, 0);
    const totalDepuraciones = asaList.reduce((acc, a) => acc + a.depuracionesCapital, 0);
    const totalVotacion = asaList.reduce((acc, a) => acc + a.saldoFinalVotacion, 0);
    const totalInteresesMora = asaList.reduce((acc, a) => acc + a.interesesMora + a.ajustesIntereses + a.depuracionesIntereses, 0);
    const exigiblesConCdpRp = asaList.filter(a => a.tieneCdpRp).reduce((acc, a) => acc + a.saldoFinalVotacion, 0);
    const bloqueadasSinCdpRp = asaList.filter(a => !a.tieneCdpRp).reduce((acc, a) => acc + a.saldoInicial, 0);

    return {
      totalInicial,
      totalAjustes,
      totalDepuraciones,
      totalVotacion,
      totalInteresesMora,
      exigiblesConCdpRp,
      bloqueadasSinCdpRp
    };
  }, [asaList]);

  // Handle ASA Depuración Action
  const handleApplyDepuracion = (id: string, montoDepurar: number, motivo: string) => {
    setAsaList(prev => prev.map(a => {
      if (a.id === id) {
        const nuevoDep = a.depuracionesCapital - montoDepurar;
        const nuevoSaldoVot = Math.max(0, a.saldoInicial + a.ajustesCapital + nuevoDep);
        
        // Add Audit Log
        const newLog: AuditLogItem = {
          id: `LOG-2026-${Date.now().toString().slice(-4)}`,
          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
          usuario: 'Dra. Elena Ramos (Contadora General)',
          rol: 'Contador Público DAF',
          subcuenta: a.subcuenta,
          acreedor: a.acreedorNombre,
          accion: 'Depuración Contable (Res. 193/2016)',
          valorAnterior: a.saldoFinalVotacion,
          valorNuevo: nuevoSaldoVot,
          cdpRpRef: `${a.cdpNumero} / ${a.rpNumero}`,
          motivo: motivo || 'Depuración contable aprobada según marco Res. 193/2016 DAF'
        };
        setAuditLogsList(logs => [newLog, ...logs]);

        return {
          ...a,
          depuracionesCapital: nuevoDep,
          saldoFinalVotacion: nuevoSaldoVot,
          estadoConciliacion: nuevoSaldoVot === 0 ? 'Depurado' : 'Conciliado'
        };
      }
      return a;
    }));
    setEditingAsa(null);
  };

  const handleResetSimulator = () => {
    const initIng: Record<string, number> = {};
    RESOURCES_LIST.forEach(r => { initIng[r] = 0; });
    setSimIngByResource(initIng);
    setSimGasByType({ Personal: 0, Funcionamiento: 0, Transferencias: 0, Tasas: 0, Deuda: 0, Inversion: 0 });
    setSelectedProjectedUnits([...ALL_UPTC_UNITS]);
    setSelectedProjectedResources([...RESOURCES_LIST]);
    setSelectedProjectedExpenseTypes(['Personal', 'Funcionamiento', 'Inversion', 'Transferencias', 'Tasas', 'Deuda']);
    setFilterUnidad('Todos');
    setFilterRecurso('Todos');
    localStorage.removeItem('vafi_simIngByResource');
    localStorage.removeItem('vafi_simGasByType');
    localStorage.removeItem('vafi_selectedProjectedUnits');
    localStorage.removeItem('vafi_selectedProjectedResources');
    localStorage.removeItem('vafi_selectedProjectedExpenseTypes');
  };

  const handleSaveSimulation = () => {
    localStorage.setItem('vafi_simIngByResource', JSON.stringify(simIngByResource));
    localStorage.setItem('vafi_simGasByType', JSON.stringify(simGasByType));
    localStorage.setItem('vafi_selectedProjectedUnits', JSON.stringify(selectedProjectedUnits));
    localStorage.setItem('vafi_selectedProjectedResources', JSON.stringify(selectedProjectedResources));
    localStorage.setItem('vafi_selectedProjectedExpenseTypes', JSON.stringify(selectedProjectedExpenseTypes));
    setShowSaveSuccess(true);
    setTimeout(() => setShowSaveSuccess(false), 3000);
  };

  const toggleUnitSelection = (unit: string) => {
    setSelectedProjectedUnits(prev => 
      prev.includes(unit) ? prev.filter(u => u !== unit) : [...prev, unit]
    );
  };

  const toggleResourceSelection = (code: string) => {
    setSelectedProjectedResources(prev => 
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  const toggleExpenseTypeSelection = (type: string) => {
    setSelectedProjectedExpenseTypes(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  if (dataStage === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <div className="w-12 h-12 border-4 border-[#4ade80] border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-on-surface-variant font-mono animate-pulse text-sm">Cargando Memoria Financiera, Proyecciones y Registros ASA DAF...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col mb-20 max-w-7xl mx-auto px-4 md:px-0 text-white">
      
      {/* Title Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#4ade80]/20 text-[#4ade80] border border-[#4ade80]/30">
              EICE-2026 • LEY 550 DE 1999
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[9px] font-mono bg-white/10 text-white/70">
              SANEAMIENTO & PROYECCIÓN INTEGRAL
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold font-display text-white">Proyección Financiera & Saneamiento</h2>
          <p className="text-xs text-on-surface-variant mt-1">
            Simulador paramétrico por Recurso y Unidad, Balance Mensual, Trazabilidad, Registro ASA DAF, Sensibilidad y Res. 193/2016.
          </p>
        </div>
        
        {/* Top Dropdowns and Controls */}
        <div className="flex flex-wrap gap-3 items-center">
          
          {/* Unit Filter Dropdown */}
          <div className={`flex items-center rounded-xl border px-3.5 py-2 transition-all ${filterUnidad !== 'Todos' ? 'bg-[#38bdf8]/15 border-[#38bdf8]/50 shadow-md' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
            <Landmark size={15} className={filterUnidad !== 'Todos' ? 'text-[#38bdf8] mr-2 shrink-0' : 'text-on-surface-variant mr-2 shrink-0'} />
            <select 
              className="bg-transparent text-xs text-white outline-none font-sans cursor-pointer max-w-[200px]"
              value={filterUnidad}
              onChange={(e) => setFilterUnidad(e.target.value)}
            >
              <option value="Todos" className="bg-[#0f172a]">🏛️ Vista: Todas las Unidades</option>
              {filterOptions.unidades.slice(1).map(u => (
                <option key={u} value={u} className="bg-[#0f172a]">{u}</option>
              ))}
            </select>
          </div>

          {/* Resource Filter Dropdown */}
          <div className={`flex items-center rounded-xl border px-3.5 py-2 transition-all ${filterRecurso !== 'Todos' ? 'bg-[#ffcc29]/15 border-[#ffcc29]/50 shadow-md' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
            <Filter size={15} className={filterRecurso !== 'Todos' ? 'text-[#ffcc29] mr-2 shrink-0' : 'text-on-surface-variant mr-2 shrink-0'} />
            <select 
              className="bg-transparent text-xs text-white outline-none font-sans cursor-pointer max-w-[180px]"
              value={filterRecurso}
              onChange={(e) => setFilterRecurso(e.target.value)}
            >
              <option value="Todos" className="bg-[#0f172a]">💰 Recurso: Todos</option>
              {filterOptions.recursos.slice(1).map(r => (
                <option key={r} value={r} className="bg-[#0f172a]">{getResourceFullName(r)}</option>
              ))}
            </select>
          </div>

          <button onClick={handleResetSimulator} className="flex items-center px-3.5 py-2 bg-white/10 border border-white/20 rounded-xl hover:bg-white/20 transition text-xs font-mono gap-1.5">
            <RefreshCw size={13} /> Limpiar
          </button>
        </div>
      </div>

      {/* Navigation Tabs (8 Complete Executive Core Tabs) */}
      <div className="flex border-b border-white/10 mb-6 overflow-x-auto gap-2">
        {[
          { id: 'simulator', label: '1. Simular Escenarios (Recurso/Unidad)', icon: Sliders },
          { id: 'monthly_balance', label: '2. Balance Mensual & Flujo de Caja', icon: Table },
          { id: 'equilibrio', label: '3. Tablero de Equilibrio Simulado', icon: Scale },
          { id: 'traceability', label: '4. Trazabilidad Recurso/Unidad', icon: FileSpreadsheet },
          { id: 'asa', label: '5. Aplicativo ASA MinHacienda', icon: FileText },
          { id: 'inventory', label: '6. Acreedores & Activos Reales', icon: Building },
          { id: 'sensitivity', label: '7. Sensibilidad (VAN, TIR & Tornado)', icon: Flame },
          { id: 'audit', label: '8. Conciliación & Log Res. 193', icon: History }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap ${activeTab === t.id ? 'border-[#4ade80] text-[#4ade80] bg-[#4ade80]/5' : 'border-transparent text-white/55 hover:text-white hover:bg-white/5'}`}
          >
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {/* ACTIVE FILTER BANNER */}
      {(filterUnidad !== 'Todos' || filterRecurso !== 'Todos' || selectedProjectedUnits.length < ALL_UPTC_UNITS.length) && (
        <div className="mb-6 p-4 bg-[#38bdf8]/10 border border-[#38bdf8]/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#38bdf8]/20 flex items-center justify-center text-[#38bdf8] shrink-0 border border-[#38bdf8]/30">
              <Landmark size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono text-[#38bdf8] uppercase font-bold tracking-wider">Filtro de Consulta Activo</span>
                {filterUnidad !== 'Todos' && (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-mono bg-[#38bdf8]/20 text-[#38bdf8] font-bold border border-[#38bdf8]/30">
                    Unidad: {filterUnidad.split(' - ')[0]}
                  </span>
                )}
                {selectedProjectedUnits.length < ALL_UPTC_UNITS.length && (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-mono bg-[#c084fc]/20 text-[#c084fc] font-bold border border-[#c084fc]/30">
                    {selectedProjectedUnits.length} de {ALL_UPTC_UNITS.length} Unidades Proyectadas
                  </span>
                )}
                {filterRecurso !== 'Todos' && (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-mono bg-[#ffcc29]/20 text-[#ffcc29] font-bold border border-[#ffcc29]/30">
                    Recurso: {filterRecurso}
                  </span>
                )}
              </div>
              <p className="text-sm font-bold text-white mt-0.5">
                {filterUnidad !== 'Todos' ? filterUnidad : `${selectedProjectedUnits.length} Dependencias Seleccionadas`}
                {filterRecurso !== 'Todos' ? ` • ${getResourceFullName(filterRecurso)}` : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {selectedProjectedUnits.length < ALL_UPTC_UNITS.length && (
              <button
                onClick={() => setSelectedProjectedUnits([...ALL_UPTC_UNITS])}
                className="px-3 py-1.5 bg-[#c084fc]/20 hover:bg-[#c084fc]/30 border border-[#c084fc]/30 rounded-xl text-xs font-mono text-[#c084fc] transition shrink-0 flex items-center gap-1.5 font-bold"
              >
                ✔ Activar Todas las Unidades
              </button>
            )}
            {filterUnidad !== 'Todos' && (
              <button
                onClick={() => setFilterUnidad('Todos')}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-mono text-white transition shrink-0 flex items-center gap-1.5"
              >
                ✖ Todas las Sedes
              </button>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: SIMULAR ESCENARIOS POR RECURSO Y UNIDAD */}
      {/* ========================================================================= */}
      {activeTab === 'simulator' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          
          {/* SELECTION CONTROL PANEL */}
          <div className="glass-card rounded-[28px] p-6 border border-white/10 bg-surface/50 relative overflow-hidden shadow-2xl space-y-6">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-4 border-b border-white/10">
              <div>
                <div className="flex items-center gap-2">
                  <Sliders className="text-[#4ade80]" size={20} />
                  <h3 className="text-lg font-display font-bold text-white">Variables y Rubros Seleccionados para Proyección</h3>
                </div>
                <p className="text-xs text-on-surface-variant mt-1">
                  Principio rector: <strong className="text-[#4ade80]">Todo lo seleccionado por Recurso y Unidad es lo que se proyecta</strong>.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={() => {
                    setSelectedProjectedUnits([...ALL_UPTC_UNITS]);
                    setSelectedProjectedResources([...RESOURCES_LIST]);
                    setSelectedProjectedExpenseTypes(['Personal', 'Funcionamiento', 'Inversion', 'Transferencias', 'Tasas', 'Deuda']);
                  }}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl text-[11px] font-mono font-bold transition flex items-center gap-1.5"
                >
                  <Check size={13} /> Seleccionar Todo
                </button>
                <button 
                  onClick={() => setSelectedProjectedUnits(['01 - ADMINISTRATIVA Y FINANCIERA'])}
                  className="px-3 py-1.5 bg-[#38bdf8]/10 hover:bg-[#38bdf8]/20 border border-[#38bdf8]/30 text-[#38bdf8] rounded-xl text-[11px] font-mono font-bold transition flex items-center gap-1.5"
                >
                  <Landmark size={13} /> Solo Unidad 01 Central
                </button>
              </div>
            </div>

            {/* Selection Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* 1. Unidades Selection */}
              <div className="lg:col-span-4 space-y-3">
                <span className="text-[11px] font-mono text-[#38bdf8] uppercase font-bold tracking-wider flex items-center gap-1.5">
                  <Landmark size={13} /> 1. Unidades / Sedes ({selectedProjectedUnits.length} de {ALL_UPTC_UNITS.length}):
                </span>
                
                <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                  {ALL_UPTC_UNITS.map(u => {
                    const isSelected = selectedProjectedUnits.includes(u);
                    return (
                      <button
                        key={u}
                        onClick={() => toggleUnitSelection(u)}
                        className={`p-2 rounded-xl border text-left transition-all text-[11px] font-mono flex items-center justify-between ${isSelected ? 'bg-[#38bdf8]/20 border-[#38bdf8]/50 text-white font-bold' : 'bg-black/20 border-white/5 text-white/40'}`}
                      >
                        <span className="truncate">{u}</span>
                        {isSelected && <Check size={13} className="text-[#38bdf8] shrink-0 ml-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Resources selection */}
              <div className="lg:col-span-5 space-y-3">
                <span className="text-[11px] font-mono text-[#ffcc29] uppercase font-bold tracking-wider flex items-center gap-1.5">
                  <DollarSign size={13} /> 2. Fuentes / Recursos ({selectedProjectedResources.length} de {RESOURCES_LIST.length}):
                </span>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                  {RESOURCES_LIST.map(r => {
                    const isSelected = selectedProjectedResources.includes(r);
                    const fixedInfo = RECURSOS_FIJOS_RESOLUCION[r];

                    return (
                      <button
                        key={r}
                        onClick={() => toggleResourceSelection(r)}
                        className={`p-2 rounded-xl border text-left transition-all flex flex-col justify-between ${isSelected ? (fixedInfo ? 'bg-[#ffcc29]/15 border-[#ffcc29]/40 text-white' : 'bg-[#38bdf8]/15 border-[#38bdf8]/40 text-white') : 'bg-black/20 border-white/5 text-white/40'}`}
                      >
                        <div className="flex justify-between items-start gap-1">
                          <span className="font-mono font-bold text-[11px]">Rec {r}</span>
                          {fixedInfo && <span className="text-[8px] px-1 py-0.5 rounded bg-[#ffcc29]/20 text-[#ffcc29] font-mono">Fijo</span>}
                        </div>
                        <span className="text-[9px] truncate block mt-0.5 opacity-80" title={getResourceFullName(r)}>
                          {getResourceFullName(r).split(' - ').pop() || r}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Expense types selection */}
              <div className="lg:col-span-3 space-y-3">
                <span className="text-[11px] font-mono text-[#4ade80] uppercase font-bold tracking-wider flex items-center gap-1.5">
                  <Layers size={13} /> 3. Gastos ({selectedProjectedExpenseTypes.length} de 6):
                </span>

                <div className="grid grid-cols-1 gap-2">
                  {[
                    { id: 'Personal', name: 'Personal (2.1.1)' },
                    { id: 'Funcionamiento', name: 'Funcionamiento (2.1.2)' },
                    { id: 'Inversion', name: 'Inversión (2.3)' },
                    { id: 'Transferencias', name: 'Transferencias (2.1.3)' },
                    { id: 'Tasas', name: 'Tasas y Multas (2.1.8)' },
                    { id: 'Deuda', name: 'Deuda (2.2.2)' }
                  ].map(t => {
                    const isSelected = selectedProjectedExpenseTypes.includes(t.id);
                    return (
                      <button
                        key={t.id}
                        onClick={() => toggleExpenseTypeSelection(t.id)}
                        className={`p-2 rounded-xl border text-left transition-all text-xs font-mono font-bold flex items-center justify-between ${isSelected ? 'bg-[#4ade80]/15 border-[#4ade80]/40 text-[#4ade80]' : 'bg-black/20 border-white/5 text-white/40'}`}
                      >
                        <span className="truncate">{t.name}</span>
                        {isSelected && <Check size={13} className="shrink-0 ml-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>

          {/* Toolbar */}
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-on-surface-variant uppercase">Escenarios Rápidos:</span>
              <button onClick={() => {
                const newIng: Record<string, number> = {};
                RESOURCES_LIST.forEach(r => { if (!RECURSOS_FIJOS_RESOLUCION[r]) newIng[r] = -3; });
                setSimIngByResource(newIng);
                setSimGasByType({ Personal: 0, Funcionamiento: -5, Inversion: -8, Transferencias: 0, Tasas: 0, Deuda: 0 });
              }} className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-mono transition">
                📉 Conservador (-3%)
              </button>
              <button onClick={() => {
                const newIng: Record<string, number> = {};
                RESOURCES_LIST.forEach(r => { if (!RECURSOS_FIJOS_RESOLUCION[r]) newIng[r] = 2; });
                setSimIngByResource(newIng);
                setSimGasByType({ Personal: 0, Funcionamiento: 0, Inversion: 0, Transferencias: 0, Tasas: 0, Deuda: 0 });
              }} className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-mono transition text-[#ffcc29]">
                ⚖️ Moderado (+2%)
              </button>
              <button onClick={() => {
                const newIng: Record<string, number> = {};
                RESOURCES_LIST.forEach(r => { if (!RECURSOS_FIJOS_RESOLUCION[r]) newIng[r] = 8; });
                setSimIngByResource(newIng);
                setSimGasByType({ Personal: 0, Funcionamiento: 3, Inversion: 10, Transferencias: 0, Tasas: 0, Deuda: 0 });
              }} className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-mono transition text-[#4ade80]">
                🚀 Optimista (+8%)
              </button>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={handleSaveSimulation} 
                className="flex items-center px-4 py-2 bg-[#4ade80] text-black hover:bg-[#4ade80]/90 rounded-xl transition text-xs font-mono gap-2 font-bold shadow-lg"
              >
                <CheckSquare size={13} /> Guardar Escenario
              </button>
              <button onClick={handleResetSimulator} className="flex items-center px-4 py-2 bg-white/10 border border-white/20 rounded-xl hover:bg-white/20 transition text-xs font-mono gap-2 text-white">
                <RefreshCw size={13} /> Restaurar Línea Base
              </button>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: BALANCE MENSUAL & FLUJO DE CAJA */}
      {/* ========================================================================= */}
      {activeTab === 'monthly_balance' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h3 className="text-2xl font-display font-bold text-white">Balance Mensual, Flujo de Caja & Liquidez</h3>
              <p className="text-xs text-on-surface-variant mt-1">
                Comportamiento temporal mes a mes (Ene-Dic) por recurso y unidad de la vigencia 2026.
              </p>
            </div>
            
            <div className="bg-white/5 border border-white/10 rounded-xl p-1 flex gap-1">
              {[
                { id: 'monthly', label: 'Mensual' },
                { id: 'quarterly', label: 'Trimestral' },
                { id: 'semesterly', label: 'Semestral' },
                { id: 'annual', label: 'Anual' }
              ].map(g => (
                <button
                  key={g.id}
                  onClick={() => setFlowGranularity(g.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${flowGranularity === g.id ? 'bg-[#4ade80] text-black font-extrabold shadow-md' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          {/* Consolidated Flow Chart */}
          <div className="glass-card rounded-[32px] p-6 lg:p-8 border border-white/10">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h4 className="text-lg font-display font-bold text-white">Dinámica Temporal de Ingresos vs Pagos Efectivos</h4>
                <p className="text-xs text-on-surface-variant mt-0.5">Ingresos proyectados frente a los giros efectivos mensuales.</p>
              </div>
              <span className="px-3 py-1 bg-white/5 rounded-full border border-white/10 text-[10px] font-mono text-[#4ade80]">
                Superávit Consolidado: +${financialData.totals.simNetPago.toFixed(1)}M
              </span>
            </div>
            <div className="w-full h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={aggregatedFlowData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" stroke="#cac4d0" tick={{fontSize: 11}} />
                  <YAxis stroke="#cac4d0" tick={{fontSize: 11}} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                  <Legend />
                  <Area type="monotone" dataKey="ingresos" name="Ingresos ($M)" fill="#4ade80" stroke="#4ade80" opacity={0.25} />
                  <Bar dataKey="gastosPago" name="Pagos Efectivos ($M)" fill="#ffcc29" radius={[4, 4, 0, 0]} opacity={0.85} />
                  <Line type="monotone" dataKey="netoPago" name="Saldo Neto Mensual ($M)" stroke="#38bdf8" strokeWidth={3} dot={{r: 4}} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Consolidated Monthly Balance Table */}
          <div className="glass-card rounded-[32px] p-8 border border-white/10">
            <h4 className="text-lg font-display font-bold text-white mb-4">Tabla de Balance Mensual ({flowGranularity.toUpperCase()})</h4>
            <div className="overflow-x-auto rounded-[24px] border border-white/10 bg-white/5 custom-scrollbar">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className="bg-white/10 text-[#4ade80] uppercase tracking-wider">
                    <th className="p-4 font-bold border-b border-white/10">Período</th>
                    <th className="p-4 font-bold border-b border-white/10 text-right">Ingresos Proyectados</th>
                    <th className="p-4 font-bold border-b border-white/10 text-right">Compromisos</th>
                    <th className="p-4 font-bold border-b border-white/10 text-right">Pagos Efectivos</th>
                    <th className="p-4 font-bold border-b border-white/10 text-right">Nómina ($M)</th>
                    <th className="p-4 font-bold border-b border-white/10 text-right">Saldo Neto</th>
                    <th className="p-4 font-bold border-b border-white/10 text-right">Reserva Caja</th>
                    <th className="p-4 font-bold border-b border-white/10 text-right">Ejecución %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {aggregatedFlowData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-white/5">
                      <td className="p-4 text-white font-bold">{row.name}</td>
                      <td className="p-4 text-right text-[#4ade80]">${row.ingresos.toLocaleString('es-CO', {minimumFractionDigits: 1})}M</td>
                      <td className="p-4 text-right text-[#f43f5e]">${row.gastosComp.toLocaleString('es-CO', {minimumFractionDigits: 1})}M</td>
                      <td className="p-4 text-right text-[#ffcc29]">${row.gastosPago.toLocaleString('es-CO', {minimumFractionDigits: 1})}M</td>
                      <td className="p-4 text-right text-[#38bdf8]">${row.gastoPersonal.toLocaleString('es-CO', {minimumFractionDigits: 1})}M</td>
                      <td className={`p-4 text-right font-bold ${row.netoPago >= 0 ? 'text-[#4ade80]' : 'text-red-400'}`}>
                        ${row.netoPago.toLocaleString('es-CO', {minimumFractionDigits: 1})}M
                      </td>
                      <td className="p-4 text-right text-[#38bdf8]">${row.saldoCajaAcumulado.toLocaleString('es-CO', {maximumFractionDigits: 1})}M</td>
                      <td className="p-4 text-right font-bold text-white/80">{row.ejecucion.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: TABLERO DE EQUILIBRIO PRESUPUESTAL SIMULADO */}
      {/* ========================================================================= */}
      {activeTab === 'equilibrio' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          
          <div className="glass-card rounded-[32px] p-8 border border-white/10 glow-primary relative overflow-hidden shadow-2xl">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8">
              <div>
                <div className="flex items-center gap-2">
                  <Scale className="text-[#4ade80]" size={24} />
                  <h3 className="text-2xl font-display font-bold text-white">Equilibrio Presupuestal Consolidado (Escenario Simulado)</h3>
                </div>
                <p className="text-on-surface-variant text-xs mt-1">
                  Relación entre recaudo proyectado total, compromisos y pagos efectivos simulados.
                </p>
              </div>
              
              <div className="bg-white/5 rounded-2xl p-5 border border-white/10 text-center min-w-[260px]">
                <span className="text-[10px] text-[#4ade80] uppercase tracking-widest font-bold block mb-1">Recaudo Total Proyectado</span>
                <span className="text-3xl font-display font-bold text-white">
                  ${financialData.totals.simIng.toLocaleString('es-CO', {maximumFractionDigits: 1})} <span className="text-sm font-sans text-on-surface-variant font-normal">mill</span>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-surface/50 rounded-2xl p-6 border border-white/5 space-y-4">
                <span className="text-xs text-[#c084fc] font-bold uppercase tracking-wider block">Frente al Compromiso Simulado</span>
                <span className="text-2xl font-bold font-mono text-white">${financialData.totals.simGasComp.toLocaleString('es-CO', {maximumFractionDigits: 1})}M</span>
                <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-[#c084fc] rounded-full" style={{ width: `${Math.min(100, (financialData.totals.simGasComp / (financialData.totals.simIng || 1)) * 100)}%` }}></div>
                </div>
              </div>

              <div className="bg-surface/50 rounded-2xl p-6 border border-white/5 space-y-4">
                <span className="text-xs text-[#ffcc29] font-bold uppercase tracking-wider block">Frente al Pago Efectivo Simulado</span>
                <span className="text-2xl font-bold font-mono text-white">${financialData.totals.simGasPago.toLocaleString('es-CO', {maximumFractionDigits: 1})}M</span>
                <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-[#ffcc29] rounded-full" style={{ width: `${Math.min(100, (financialData.totals.simGasPago / (financialData.totals.simIng || 1)) * 100)}%` }}></div>
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: TRAZABILIDAD POR RECURSO Y UNIDAD */}
      {/* ========================================================================= */}
      {activeTab === 'traceability' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          
          <div className="glass-card rounded-[28px] p-6 lg:p-8 border border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="text-2xl font-display font-bold text-white flex items-center gap-2">
                <FileSpreadsheet className="text-[#ffcc29]" size={24} />
                Matriz de Trazabilidad: Recurso → Ingreso → Apropiación → Gasto por Unidad
              </h3>
              <p className="text-xs text-on-surface-variant mt-1">
                Auditoría detallada por fuente de financiación. Despliegue cada fila para inspeccionar los gastos específicos financiados.
              </p>
            </div>

            <input 
              type="text"
              placeholder="Buscar recurso o unidad..."
              value={traceSearch}
              onChange={(e) => setTraceSearch(e.target.value)}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-[#ffcc29] font-sans w-64"
            />
          </div>

          <div className="glass-card rounded-[32px] p-8 border border-white/10">
            <div className="overflow-x-auto rounded-[24px] border border-white/10 bg-white/5">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="bg-white/10 text-[#ffcc29] uppercase">
                    <th className="p-4">Cód.</th>
                    <th className="p-4">Recurso / Denominación</th>
                    <th className="p-4">Unidad Responsable</th>
                    <th className="p-4 text-right">Ingreso Proyectado</th>
                    <th className="p-4 text-right">Apropiación (Pago)</th>
                    <th className="p-4 text-right">Saldo Disponible</th>
                    <th className="p-4 text-right">% Utilización</th>
                    <th className="p-4 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredTraceability.map((item) => (
                    <tr key={item.resourceCode} className="hover:bg-white/5 transition-colors">
                      <td className="p-4 font-bold text-white">{item.resourceCode}</td>
                      <td className="p-4 text-white font-bold max-w-[220px] truncate" title={item.resourceName}>{item.resourceName}</td>
                      <td className="p-4 text-on-surface-variant max-w-[180px] truncate" title={item.unitName}>{item.unitName}</td>
                      <td className="p-4 text-right text-[#4ade80] font-bold">${item.projectedIncome.toLocaleString('es-CO', {maximumFractionDigits:1})}M</td>
                      <td className="p-4 text-right text-[#ffcc29] font-bold">${item.totalPago.toLocaleString('es-CO', {maximumFractionDigits:1})}M</td>
                      <td className={`p-4 text-right font-bold ${item.remainingBalance >= 0 ? 'text-[#38bdf8]' : 'text-red-400'}`}>
                        ${item.remainingBalance.toLocaleString('es-CO', {maximumFractionDigits:1})}M
                      </td>
                      <td className="p-4 text-right font-bold">{item.utilizationPct.toFixed(1)}%</td>
                      <td className="p-4 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${item.status === 'Excedente' ? 'bg-[#4ade80]/20 text-[#4ade80]' : (item.status === 'Equilibrado' ? 'bg-[#38bdf8]/20 text-[#38bdf8]' : 'bg-red-500/20 text-red-400')}`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: APLICATIVO ASA (DAF MINHACIENDA) & LEY 550 */}
      {/* ========================================================================= */}
      {activeTab === 'asa' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          
          <div className="glass-card rounded-[32px] p-6 lg:p-8 border border-white/10 space-y-6">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
              <div>
                <h3 className="text-2xl font-display font-bold text-white flex items-center gap-2">
                  <FileText className="text-[#4ade80]" size={24} />
                  Hoja de Ajustes y Depuraciones ASA (DAF MinHacienda)
                </h3>
                <p className="text-xs text-on-surface-variant mt-1">
                  Estructura oficial Anexo No. 1 DAF para la determinación de acreencias, depuración contable y derechos de voto.
                </p>
              </div>

              <input 
                type="text"
                placeholder="Buscar acreedor o CDP..."
                value={asaSearch}
                onChange={(e) => setAsaSearch(e.target.value)}
                className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-[#4ade80] font-sans w-64"
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
              <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                <span className="text-[10px] font-mono text-on-surface-variant uppercase block">Capital Cargue Inicial</span>
                <span className="text-xl font-mono font-bold text-white">${asaTotals.totalInicial.toLocaleString('es-CO', {maximumFractionDigits:1})}M</span>
              </div>
              <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                <span className="text-[10px] font-mono text-on-surface-variant uppercase block">Depuraciones Capital</span>
                <span className="text-xl font-mono font-bold text-rose-400">${asaTotals.totalDepuraciones.toLocaleString('es-CO', {maximumFractionDigits:1})}M</span>
              </div>
              <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                <span className="text-[10px] font-mono text-on-surface-variant uppercase block">Saldo Exigible Votación</span>
                <span className="text-xl font-mono font-bold text-[#4ade80]">${asaTotals.totalVotacion.toLocaleString('es-CO', {maximumFractionDigits:1})}M</span>
              </div>
              <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                <span className="text-[10px] font-mono text-on-surface-variant uppercase block">Bloqueadas Sin CDP/RP</span>
                <span className="text-xl font-mono font-bold text-red-500">${asaTotals.bloqueadasSinCdpRp.toLocaleString('es-CO', {maximumFractionDigits:1})}M</span>
              </div>
            </div>
          </div>

          {/* ASA Data Table */}
          <div className="glass-card rounded-[32px] p-8 border border-white/10">
            <div className="overflow-x-auto rounded-[24px] border border-white/10 bg-white/5">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="bg-white/10 text-[#4ade80] uppercase">
                    <th className="p-4">Subcuenta / ID</th>
                    <th className="p-4">Acreedor / NIT</th>
                    <th className="p-4">Grupo Ley 550</th>
                    <th className="p-4">CDP / RP Soporte</th>
                    <th className="p-4 text-right">Inicial ($M)</th>
                    <th className="p-4 text-right">Depuración</th>
                    <th className="p-4 text-right">Saldo Votación</th>
                    <th className="p-4 text-center">Voto %</th>
                    <th className="p-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredASA.map((item) => (
                    <tr key={item.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-4"><span className="font-bold text-white">{item.subcuenta}</span></td>
                      <td className="p-4 max-w-[200px] font-bold text-white truncate" title={item.acreedorNombre}>{item.acreedorNombre}</td>
                      <td className="p-4"><span className="px-2 py-0.5 bg-white/10 rounded text-[9px]">{item.grupoAcreencia}</span></td>
                      <td className="p-4 text-[#4ade80]">{item.tieneCdpRp ? item.cdpNumero : 'Sin CDP/RP'}</td>
                      <td className="p-4 text-right">${item.saldoInicial.toFixed(1)}M</td>
                      <td className="p-4 text-right text-rose-400">${item.depuracionesCapital.toFixed(1)}M</td>
                      <td className="p-4 text-right text-[#4ade80] font-bold">${item.saldoFinalVotacion.toFixed(1)}M</td>
                      <td className="p-4 text-center font-bold">{item.derechosVoto.toFixed(1)}%</td>
                      <td className="p-4 text-center">
                        {item.tieneCdpRp ? (
                          <button onClick={() => setEditingAsa(item)} className="px-2.5 py-1 bg-[#4ade80]/20 text-[#4ade80] rounded font-bold text-[10px]">
                            Depurar
                          </button>
                        ) : <span className="text-white/30 text-[10px]">Inexigible</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Modal for Depuración */}
          {editingAsa && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
              <div className="glass-card rounded-[32px] p-6 max-w-lg w-full bg-[#0f172a] space-y-4">
                <h4 className="text-lg font-bold text-white">Depuración Contable (Res. 193/2016)</h4>
                <p className="text-xs text-white/70">{editingAsa.acreedorNombre} - Saldo: ${editingAsa.saldoFinalVotacion}M</p>
                <input type="number" id="montoDepurarInput" defaultValue={100} className="w-full p-2 bg-white/5 border border-white/10 rounded text-white text-xs font-mono" />
                <textarea id="motivoInput" rows={3} defaultValue="Ajuste por condonación o depuración legal" className="w-full p-2 bg-white/5 border border-white/10 rounded text-white text-xs font-sans" />
                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={() => setEditingAsa(null)} className="px-3 py-1.5 bg-white/10 rounded text-xs">Cancelar</button>
                  <button onClick={() => {
                    const m = parseFloat((document.getElementById('montoDepurarInput') as any)?.value || '0');
                    const r = (document.getElementById('motivoInput') as any)?.value || '';
                    handleApplyDepuracion(editingAsa.id, m, r);
                  }} className="px-3 py-1.5 bg-[#4ade80] text-black font-bold rounded text-xs">Aplicar</button>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: ACREEDORES & ACTIVOS REALES */}
      {/* ========================================================================= */}
      {activeTab === 'inventory' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          <div className="glass-card rounded-[32px] p-6 lg:p-8 border border-white/10 space-y-6">
            <h3 className="text-2xl font-display font-bold text-white flex items-center gap-2">
              <Building className="text-[#38bdf8]" size={24} />
              Inventario de Activos Reales y Contingentes (Sección 2.2)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {activosList.map(a => (
                <div key={a.id} className="bg-white/5 border border-white/10 p-5 rounded-2xl space-y-2">
                  <div className="flex justify-between font-mono">
                    <span className="text-[#38bdf8] font-bold text-xs">{a.tipo}</span>
                    <span className="text-[#4ade80] font-bold">${a.valorNetoReal.toLocaleString('es-CO')}M</span>
                  </div>
                  <h4 className="font-bold text-white text-sm">{a.nombre}</h4>
                  <p className="text-xs text-white/70">{a.detalles}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: SENSIBILIDAD (VAN, TIR & TORNADO) */}
      {/* ========================================================================= */}
      {activeTab === 'sensitivity' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-card rounded-[28px] p-6 border border-white/10 flex justify-between items-center">
              <div>
                <span className="text-xs text-on-surface-variant font-mono uppercase block">Valor Actual Neto (VAN)</span>
                <span className="text-3xl font-display font-bold text-[#4ade80]">${financialData.vanBaseM.toLocaleString('es-CO')}M</span>
              </div>
              <Award size={32} className="text-[#4ade80]" />
            </div>
            <div className="glass-card rounded-[28px] p-6 border border-white/10 flex justify-between items-center">
              <div>
                <span className="text-xs text-on-surface-variant font-mono uppercase block">Tasa Interna de Retorno (TIR)</span>
                <span className="text-3xl font-display font-bold text-[#ffcc29]">{financialData.tirBasePct.toFixed(1)}%</span>
              </div>
              <TrendingUp size={32} className="text-[#ffcc29]" />
            </div>
          </div>

          <div className="glass-card rounded-[32px] p-6 lg:p-8 border border-white/10 space-y-4">
            <h3 className="text-xl font-display font-bold text-white flex items-center gap-2">
              <Flame className="text-rose-400" size={22} />
              Diagrama de Tornado: Variables de Mayor Riesgo
            </h3>
            {financialData.tornadoVariables.map((v, i) => (
              <div key={i} className="bg-white/5 border border-white/10 p-4 rounded-2xl font-mono text-xs space-y-1">
                <div className="flex justify-between font-bold">
                  <span>{v.variableName}</span>
                  <span className="text-[#4ade80]">Oscilación VAN: ${v.swingM.toFixed(0)}M</span>
                </div>
                <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-rose-500 rounded-full mx-auto" style={{ width: `${Math.min(100, (v.swingM / 80000) * 100)}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 8: CONCILIACIÓN & LOG RES. 193 */}
      {/* ========================================================================= */}
      {activeTab === 'audit' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          <div className="glass-card rounded-[32px] p-6 lg:p-8 border border-white/10 space-y-4">
            <h3 className="text-xl font-display font-bold text-white flex items-center gap-2">
              <History className="text-[#ffcc29]" size={22} />
              Log de Auditoría Inalterable (Resolución No. 193 de 2016)
            </h3>
            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="bg-white/10 text-[#ffcc29] uppercase">
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">Usuario / Rol</th>
                    <th className="p-3">Subcuenta</th>
                    <th className="p-3">Acción Contable</th>
                    <th className="p-3">Motivo Legal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {auditLogsList.map(log => (
                    <tr key={log.id} className="hover:bg-white/5">
                      <td className="p-3 text-white/70">{log.timestamp}</td>
                      <td className="p-3 text-[#38bdf8] font-bold">{log.usuario}</td>
                      <td className="p-3 text-white">{log.subcuenta}</td>
                      <td className="p-3 text-[#4ade80] font-bold">{log.accion}</td>
                      <td className="p-3 text-white/90">{log.motivo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
