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
  
  // 6 Executive EICE-2026 Core Tabs
  const [activeTab, setActiveTab] = useState<'dashboard' | 'asa' | 'inventory' | 'mfmp' | 'sensitivity' | 'audit'>('dashboard');

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
  const [auditSearch, setAuditSearch] = useState<string>('');

  // Signature and Radicación Cert state
  const [repLegalSigned, setRepLegalSigned] = useState<boolean>(true);
  const [contadorSigned, setContadorSigned] = useState<boolean>(true);
  const [radicationStatus, setRadicationStatus] = useState<string>('RADICADO_OK');

  // Simulation Sliders State
  const [selectedProjectedUnits, setSelectedProjectedUnits] = useState<string[]>([...ALL_UPTC_UNITS]);
  const [selectedProjectedResources, setSelectedProjectedResources] = useState<string[]>([...RESOURCES_LIST]);
  const [selectedProjectedExpenseTypes, setSelectedProjectedExpenseTypes] = useState<string[]>(['Personal', 'Funcionamiento', 'Inversion', 'Transferencias', 'Tasas', 'Deuda']);

  const [simIngByResource, setSimIngByResource] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    RESOURCES_LIST.forEach(r => { init[r] = 0; });
    return init;
  });

  const [simGasByType, setSimGasByType] = useState<Record<string, number>>({
    "Personal": 0, "Funcionamiento": 0, "Transferencias": 0, "Tasas": 0, "Deuda": 0, "Inversion": 0
  });

  // Global Dropdown Filters
  const [filterUnidad, setFilterUnidad] = useState<string>('Todos');
  const [filterRecurso, setFilterRecurso] = useState<string>('Todos');
  const [flowGranularity, setFlowGranularity] = useState<'monthly' | 'quarterly' | 'semesterly' | 'annual'>('monthly');

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

  // Initialize ASA and Activos List on load
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

  if (dataStage === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <div className="w-12 h-12 border-4 border-[#4ade80] border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-on-surface-variant font-mono animate-pulse text-sm">Cargando Memoria Financiera EICE-2026 y Registros DAF...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col mb-20 max-w-7xl mx-auto px-4 md:px-0 text-white">
      
      {/* Title Header (Vaulto / OpsPulse 2026 Style) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#4ade80]/20 text-[#4ade80] border border-[#4ade80]/30">
              EICE-2026 • LEY 550 DE 1999
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[9px] font-mono bg-white/10 text-white/70">
              MINHACIENDA DAF
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold font-display text-white">Gestión Financiera & Saneamiento Fiscal</h2>
          <p className="text-xs text-on-surface-variant mt-1">
            Memoria Financiera Institucional, Registro ASA DAF, Depuración Contable Res. 193/2016 y Sensibilidad Ley 617 / Ley 819.
          </p>
        </div>
        
        {/* Top Dropdowns and Controls */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center bg-white/5 rounded-xl border border-white/10 px-3.5 py-2 hover:bg-white/10 transition-colors">
            <Landmark size={15} className="text-[#38bdf8] mr-2 shrink-0" />
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

          <div className="flex items-center bg-white/5 rounded-xl border border-white/10 px-3.5 py-2 hover:bg-white/10 transition-colors">
            <Filter size={15} className="text-[#ffcc29] mr-2 shrink-0" />
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
        </div>
      </div>

      {/* Navigation Tabs (6 Executive Core Modules) */}
      <div className="flex border-b border-white/10 mb-6 overflow-x-auto gap-2">
        {[
          { id: 'dashboard', label: '1. Dashboard & Salud Fiscal', icon: Activity },
          { id: 'asa', label: '2. Aplicativo ASA MinHacienda', icon: FileSpreadsheet },
          { id: 'inventory', label: '3. Acreedores & Activos Reales', icon: Building },
          { id: 'mfmp', label: '4. Proyecciones MFMP & Ley 617', icon: Table },
          { id: 'sensitivity', label: '5. Sensibilidad (VAN, TIR & Tornado)', icon: Flame },
          { id: 'audit', label: '6. Conciliación & Log Res. 193', icon: History }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap ${activeTab === t.id ? 'border-[#4ade80] text-[#4ade80] bg-[#4ade80]/5' : 'border-transparent text-white/55 hover:text-white hover:bg-white/5'}`}
          >
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: DASHBOARD DE CONTROL FINANCIERO (VAULTO / OPSPULSE 2026) */}
      {/* ========================================================================= */}
      {activeTab === 'dashboard' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          
          {/* Hyid Proactive Fiscal Health Banner */}
          <div className="glass-card rounded-[32px] p-6 lg:p-8 border border-white/10 bg-gradient-to-r from-[#0f172a] via-[#11241a] to-[#0f172a] relative overflow-hidden shadow-2xl space-y-4">
            <div className="absolute top-0 left-0 w-full h-1 bg-[#4ade80]"></div>
            
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#4ade80]/20 flex items-center justify-center text-[#4ade80] shrink-0 border border-[#4ade80]/30">
                  <ShieldAlert size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-[#4ade80] uppercase font-bold tracking-wider">Asistente de Salud Fiscal Hyid</span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-mono bg-[#4ade80]/20 text-[#4ade80] font-bold">Diagnóstico 2026</span>
                  </div>
                  <h3 className="text-xl font-display font-bold text-white mt-0.5">Estado del Plan de Saneamiento y Ley 819</h3>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-2xl">
                  <span className="text-[9px] font-mono text-on-surface-variant uppercase block">Superávit Primario (Ley 819)</span>
                  <span className={`text-base font-mono font-bold ${financialData.totals.cumpleLey819 ? 'text-[#4ade80]' : 'text-red-400'}`}>
                    ${financialData.totals.superavitPrimarioM.toLocaleString('es-CO', {maximumFractionDigits:1})}M
                  </span>
                </div>
                <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-2xl">
                  <span className="text-[9px] font-mono text-on-surface-variant uppercase block">Gastos Func / ICLD (Ley 617)</span>
                  <span className={`text-base font-mono font-bold ${financialData.totals.cumpleLey617 ? 'text-[#4ade80]' : 'text-[#ffcc29]'}`}>
                    {financialData.totals.ratioLey617Pct.toFixed(1)}% <span className="text-[10px] font-sans font-normal text-white/60">(Límite ≤50%)</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
              <div className="p-3 bg-white/5 border border-white/5 rounded-xl flex items-start gap-2">
                <CheckCircle size={15} className="text-[#4ade80] shrink-0 mt-0.5" />
                <div>
                  <span className="text-white font-bold block">Sostenibilidad Ley 819</span>
                  <span className="text-white/70 text-[11px]">Superávit primario positivo garantizado en la vigencia.</span>
                </div>
              </div>
              <div className="p-3 bg-white/5 border border-white/5 rounded-xl flex items-start gap-2">
                <AlertTriangle size={15} className="text-[#ffcc29] shrink-0 mt-0.5" />
                <div>
                  <span className="text-white font-bold block">Alerta Intereses de Mora ASA</span>
                  <span className="text-white/70 text-[11px]">${asaTotals.totalInteresesMora.toFixed(1)}M pendientes de ajuste legal.</span>
                </div>
              </div>
              <div className="p-3 bg-white/5 border border-white/5 rounded-xl flex items-start gap-2">
                <Lock size={15} className="text-[#38bdf8] shrink-0 mt-0.5" />
                <div>
                  <span className="text-white font-bold block">Firma Digital Radicada</span>
                  <span className="text-white/70 text-[11px]">Certificado de Representante Legal y Contador al día.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Stephen Few Bullet Charts Panel */}
          <div className="glass-card rounded-[32px] p-6 lg:p-8 border border-white/10 space-y-6">
            <div>
              <h3 className="text-xl font-display font-bold text-white flex items-center gap-2">
                <BarChart2 className="text-[#4ade80]" size={22} />
                Stephen Few Bullet Charts: Presupuesto Planeado (Rent B) vs Ejecución Real (Rent A)
              </h3>
              <p className="text-xs text-on-surface-variant mt-1">
                Comparativa de desempeño con umbrales cualitativos al 60% (alerta) y 100% (meta de eficiencia).
              </p>
            </div>

            <div className="space-y-6">
              {financialData.rentComparison.map((item, idx) => {
                const maxVal = Math.max(item.rentA_Actuals, item.rentB_Budget) * 1.2;
                const pctOfBudget = item.rentB_Budget > 0 ? (item.rentA_Actuals / item.rentB_Budget) * 100 : 0;
                
                return (
                  <div key={idx} className="bg-white/5 border border-white/10 p-4 rounded-2xl space-y-2">
                    <div className="flex justify-between items-center text-xs font-mono">
                      <div>
                        <span className="text-white font-bold">{item.name}</span>
                        <span className="text-on-surface-variant text-[10px] ml-2">({item.code})</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-white font-bold font-mono">Real (Rent A): ${item.rentA_Actuals.toLocaleString('es-CO', {maximumFractionDigits:1})}M</span>
                        <span className="text-on-surface-variant font-mono">Meta (Rent B): ${item.rentB_Budget.toLocaleString('es-CO', {maximumFractionDigits:1})}M</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${pctOfBudget >= 100 ? 'bg-[#4ade80]/20 text-[#4ade80]' : 'bg-[#ffcc29]/20 text-[#ffcc29]'}`}>
                          {pctOfBudget.toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    {/* Bullet Bar Visual */}
                    <div className="relative h-6 w-full bg-white/10 rounded-lg overflow-hidden flex items-center">
                      {/* Qualitative Zones */}
                      <div className="absolute left-0 top-0 h-full bg-red-500/20" style={{ width: '60%' }}></div>
                      <div className="absolute left-[60%] top-0 h-full bg-yellow-500/20" style={{ width: '40%' }}></div>
                      
                      {/* Actual Performance Bar (Rent A) */}
                      <div 
                        className="h-3 bg-[#4ade80] rounded-sm transition-all relative z-10" 
                        style={{ width: `${Math.min(100, (item.rentA_Actuals / maxVal) * 100)}%` }}
                      ></div>

                      {/* Target Marker (Rent B) */}
                      <div 
                        className="absolute top-0 bottom-0 w-1 bg-[#ffcc29] z-20" 
                        style={{ left: `${Math.min(100, (item.rentB_Budget / maxVal) * 100)}%` }}
                        title={`Presupuesto Planeado: $${item.rentB_Budget}M`}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Diagrama de Sankey: Rentas Territoriales -> Fondos -> Acreencias Ley 550 */}
          <div className="glass-card rounded-[32px] p-6 lg:p-8 border border-white/10 space-y-6">
            <div>
              <h3 className="text-xl font-display font-bold text-white flex items-center gap-2">
                <Layers className="text-[#38bdf8]" size={22} />
                Flujo de Activos y Distribución Ley 550 (Diagrama Sankey)
              </h3>
              <p className="text-xs text-on-surface-variant mt-1">
                Trazabilidad del flujo de recursos desde rentas territoriales hacia el servicio de acreencias en fiducias de saneamiento.
              </p>
            </div>

            <div className="bg-black/30 border border-white/10 rounded-2xl p-6 grid grid-cols-1 md:grid-cols-3 gap-6 relative">
              
              {/* Column 1: Rentas */}
              <div className="space-y-3">
                <span className="text-[10px] font-mono text-[#4ade80] uppercase font-bold tracking-widest block">1. Rentas Territoriales</span>
                <div className="p-3 bg-white/5 border border-[#4ade80]/30 rounded-xl space-y-1">
                  <span className="text-xs font-bold text-white block">Aportes Nación Ley 30</span>
                  <span className="text-sm font-mono text-[#4ade80] font-bold">$315.327,8M</span>
                </div>
                <div className="p-3 bg-white/5 border border-[#38bdf8]/30 rounded-xl space-y-1">
                  <span className="text-xs font-bold text-white block">Recursos Propios & Derechos</span>
                  <span className="text-sm font-mono text-[#38bdf8] font-bold">$51.250,0M</span>
                </div>
                <div className="p-3 bg-white/5 border border-[#ffcc29]/30 rounded-xl space-y-1">
                  <span className="text-xs font-bold text-white block">Estampillas & Fondos Ley</span>
                  <span className="text-sm font-mono text-[#ffcc29] font-bold">$42.750,0M</span>
                </div>
              </div>

              {/* Column 2: Fiducias / Fondos */}
              <div className="space-y-3">
                <span className="text-[10px] font-mono text-[#38bdf8] uppercase font-bold tracking-widest block">2. Fondos / Encargos Fiduciarios</span>
                <div className="p-3 bg-white/5 border border-[#38bdf8]/30 rounded-xl space-y-1">
                  <span className="text-xs font-bold text-white block">Encargo Fiduciario Ley 550 DAF</span>
                  <span className="text-sm font-mono text-white font-bold">$18.500,0M</span>
                </div>
                <div className="p-3 bg-white/5 border border-white/10 rounded-xl space-y-1">
                  <span className="text-xs font-bold text-white block">Fondo de Reservas Contingentes</span>
                  <span className="text-sm font-mono text-white font-bold">$6.230,0M</span>
                </div>
              </div>

              {/* Column 3: Acreencias Ley 550 */}
              <div className="space-y-3">
                <span className="text-[10px] font-mono text-[#f43f5e] uppercase font-bold tracking-widest block">3. Pasivos Ley 550</span>
                <div className="p-3 bg-white/5 border border-red-500/30 rounded-xl space-y-1">
                  <span className="text-xs font-bold text-white block">Grupo 1: Laborales (Sintras)</span>
                  <span className="text-sm font-mono text-red-400 font-bold">$4.110,0M</span>
                </div>
                <div className="p-3 bg-white/5 border border-yellow-500/30 rounded-xl space-y-1">
                  <span className="text-xs font-bold text-white block">Grupo 2: Públicas (DIAN)</span>
                  <span className="text-sm font-mono text-yellow-400 font-bold">$3.250,0M</span>
                </div>
                <div className="p-3 bg-white/5 border border-blue-500/30 rounded-xl space-y-1">
                  <span className="text-xs font-bold text-white block">Grupo 3: Financieras (Banco Agrario)</span>
                  <span className="text-sm font-mono text-blue-400 font-bold">$2.500,0M</span>
                </div>
              </div>

            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: APLICATIVO DE SEGUIMIENTO DE ACREENCIAS (ASA - DAF MINHACIENDA) */}
      {/* ========================================================================= */}
      {activeTab === 'asa' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          
          {/* Header & Totals Card */}
          <div className="glass-card rounded-[32px] p-6 lg:p-8 border border-white/10 space-y-6">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
              <div>
                <h3 className="text-2xl font-display font-bold text-white flex items-center gap-2">
                  <FileSpreadsheet className="text-[#4ade80]" size={24} />
                  Hoja de Ajustes y Depuraciones ASA (DAF MinHacienda)
                </h3>
                <p className="text-xs text-on-surface-variant mt-1">
                  Estructura oficial Anexo No. 1 DAF para la determinación de acreencias, depuración contable y asignación de derechos de voto.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <input 
                  type="text"
                  placeholder="Buscar por acreedor, NIT o CDP..."
                  value={asaSearch}
                  onChange={(e) => setAsaSearch(e.target.value)}
                  className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-[#4ade80] font-sans w-64"
                />
              </div>
            </div>

            {/* ASA Totals Metrics Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
              <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                <span className="text-[10px] font-mono text-on-surface-variant uppercase block">Capital Cargue Inicial</span>
                <span className="text-xl font-mono font-bold text-white">${asaTotals.totalInicial.toLocaleString('es-CO', {maximumFractionDigits:1})}M</span>
              </div>
              <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                <span className="text-[10px] font-mono text-on-surface-variant uppercase block">Depuraciones de Capital</span>
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

          {/* ASA Main Data Table */}
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
                    <th className="p-4 text-right">Ajustes ($M)</th>
                    <th className="p-4 text-right">Depuración</th>
                    <th className="p-4 text-right">Saldo Votación</th>
                    <th className="p-4 text-center">Voto %</th>
                    <th className="p-4 text-center">Estado Legal</th>
                    <th className="p-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredASA.map((item) => (
                    <tr key={item.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-4">
                        <span className="font-bold text-white block">{item.subcuenta}</span>
                        <span className="text-[9px] text-white/50">{item.id}</span>
                      </td>
                      <td className="p-4 max-w-[200px]">
                        <span className="font-bold text-white block truncate" title={item.acreedorNombre}>{item.acreedorNombre}</span>
                        <span className="text-[10px] text-on-surface-variant">{item.acreedorNit}</span>
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-white/10 text-white">
                          {item.grupoAcreencia}
                        </span>
                      </td>
                      <td className="p-4">
                        {item.tieneCdpRp ? (
                          <div className="text-[10px] text-[#4ade80]">
                            <span className="block font-bold">{item.cdpNumero}</span>
                            <span className="block text-white/60">{item.rpNumero}</span>
                          </div>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 font-bold text-[9px] flex items-center gap-1 w-max">
                            <Lock size={10} /> Sin CDP/RP (Bloqueado)
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right text-white">${item.saldoInicial.toFixed(1)}M</td>
                      <td className="p-4 text-right text-yellow-300">${item.ajustesCapital.toFixed(1)}M</td>
                      <td className="p-4 text-right text-rose-400">${item.depuracionesCapital.toFixed(1)}M</td>
                      <td className="p-4 text-right text-[#4ade80] font-bold">${item.saldoFinalVotacion.toFixed(1)}M</td>
                      <td className="p-4 text-center font-bold text-white">{item.derechosVoto.toFixed(1)}%</td>
                      <td className="p-4 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${item.estadoConciliacion === 'Conciliado' ? 'bg-[#4ade80]/20 text-[#4ade80]' : (item.estadoConciliacion === 'Depurado' ? 'bg-yellow-500/20 text-yellow-300' : 'bg-red-500/20 text-red-400')}`}>
                          {item.estadoConciliacion}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        {item.tieneCdpRp ? (
                          <button
                            onClick={() => setEditingAsa(item)}
                            className="px-2.5 py-1 rounded bg-[#4ade80]/20 hover:bg-[#4ade80]/30 text-[#4ade80] text-[10px] font-bold transition flex items-center gap-1 mx-auto"
                          >
                            <Edit3 size={12} /> Depurar
                          </button>
                        ) : (
                          <span className="text-[10px] text-white/30">Inexigible</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Modal for Depuración Contable (Res. 193/2016) */}
          {editingAsa && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
              <div className="glass-card rounded-[32px] p-6 lg:p-8 max-w-lg w-full border border-white/20 bg-[#0f172a] space-y-6">
                <div className="flex justify-between items-center border-b border-white/10 pb-4">
                  <h4 className="text-lg font-bold text-white flex items-center gap-2">
                    <Edit3 className="text-[#4ade80]" size={20} />
                    Depuración Contable (Res. 193/2016)
                  </h4>
                  <button onClick={() => setEditingAsa(null)} className="text-white/60 hover:text-white">✕</button>
                </div>

                <div className="space-y-3 text-xs font-mono">
                  <p className="text-white font-bold">{editingAsa.acreedorNombre} ({editingAsa.acreedorNit})</p>
                  <p className="text-on-surface-variant">Subcuenta: {editingAsa.subcuenta} • Saldo Votación Actual: ${editingAsa.saldoFinalVotacion}M</p>

                  <div className="space-y-2 pt-2">
                    <label className="block text-white font-bold">Monto a Depurar ($M):</label>
                    <input 
                      type="number"
                      id="montoDepurarInput"
                      defaultValue={100}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white font-mono outline-none focus:border-[#4ade80]"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-white font-bold">Motivo Legal (Res. 193/2016):</label>
                    <textarea 
                      id="motivoInput"
                      rows={3}
                      defaultValue="Ajuste por condonación o falta de exigibilidad según acta de fiscalización DAF."
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white font-sans text-xs outline-none focus:border-[#4ade80]"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                  <button 
                    onClick={() => setEditingAsa(null)}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-mono"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={() => {
                      const montoEl = document.getElementById('montoDepurarInput') as HTMLInputElement;
                      const motivoEl = document.getElementById('motivoInput') as HTMLTextAreaElement;
                      handleApplyDepuracion(editingAsa.id, parseFloat(montoEl?.value || '0'), motivoEl?.value || '');
                    }}
                    className="px-4 py-2 bg-[#4ade80] text-black font-bold font-mono rounded-xl hover:bg-[#4ade80]/90"
                  >
                    Aplicar Depuración
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: INVENTARIO DE ACREEDORES & ACTIVOS REALES */}
      {/* ========================================================================= */}
      {activeTab === 'inventory' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          
          <div className="glass-card rounded-[32px] p-6 lg:p-8 border border-white/10 space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-display font-bold text-white flex items-center gap-2">
                  <Building className="text-[#38bdf8]" size={24} />
                  Inventario de Activos Reales y Contingentes (Sección 2.2)
                </h3>
                <p className="text-xs text-on-surface-variant mt-1">
                  Valoración contable de respaldo del acuerdo Ley 550: Efectivo, Inversiones, Cartera y PPE.
                </p>
              </div>

              <div className="flex gap-2">
                {['ALL', 'Efectivo', 'Inversion', 'CuentaPorCobrar', 'PPE'].map(t => (
                  <button
                    key={t}
                    onClick={() => setActivoTabType(t)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition ${activoTabType === t ? 'bg-[#38bdf8] text-black' : 'bg-white/5 text-white/70 hover:bg-white/10'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {activosList.filter(a => activoTabType === 'ALL' || a.tipo === activoTabType).map(activo => (
                <div key={activo.id} className="bg-white/5 border border-white/10 p-5 rounded-2xl space-y-3 hover:border-white/20 transition-all">
                  <div className="flex justify-between items-start">
                    <span className="px-2.5 py-0.5 rounded text-[9px] font-mono font-bold bg-[#38bdf8]/20 text-[#38bdf8] border border-[#38bdf8]/30 uppercase">
                      {activo.tipo}
                    </span>
                    <span className="text-sm font-mono font-bold text-[#4ade80]">${activo.valorNetoReal.toLocaleString('es-CO', {maximumFractionDigits:1})}M</span>
                  </div>

                  <div>
                    <h4 className="font-bold text-white text-sm">{activo.nombre}</h4>
                    <p className="text-xs text-white/70 mt-1 leading-relaxed">{activo.detalles}</p>
                  </div>

                  <div className="pt-2 border-t border-white/5 grid grid-cols-2 gap-2 text-[10px] font-mono text-on-surface-variant">
                    <div>
                      <span>Valor Libros:</span>
                      <span className="text-white font-bold block">${activo.valorBook.toLocaleString('es-CO')}M</span>
                    </div>
                    <div>
                      <span>Estado / Conciliación:</span>
                      <span className="text-[#38bdf8] font-bold block">{activo.estadoUbicacion}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: PROYECCIONES MFMP & LEY 617 */}
      {/* ========================================================================= */}
      {activeTab === 'mfmp' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          
          <div className="glass-card rounded-[32px] p-6 lg:p-8 border border-white/10 space-y-6">
            <div>
              <h3 className="text-2xl font-display font-bold text-white flex items-center gap-2">
                <Table className="text-[#ffcc29]" size={24} />
                Marco Fiscal de Mediano Plazo (MFMP) & Cumplimiento Ley 617
              </h3>
              <p className="text-xs text-on-surface-variant mt-1">
                Proyección plurianual de flujos de caja y ratio de gastos de funcionamiento sobre ICLD (Límite legal ≤50%).
              </p>
            </div>

            <div className="w-full h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={aggregatedFlowData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" stroke="#cac4d0" tick={{fontSize: 11}} />
                  <YAxis stroke="#cac4d0" tick={{fontSize: 11}} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)' }} />
                  <Area type="monotone" dataKey="ingresos" name="Ingresos ($M)" fill="#4ade80" stroke="#4ade80" opacity={0.3} />
                  <Area type="monotone" dataKey="gastosPago" name="Exigibilidades ($M)" fill="#f43f5e" stroke="#f43f5e" opacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: SENSIBILIDAD (VAN, TIR & TORNADO) */}
      {/* ========================================================================= */}
      {activeTab === 'sensitivity' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          
          {/* Header VAN/TIR */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-card rounded-[28px] p-6 border border-white/10 flex justify-between items-center">
              <div>
                <span className="text-xs text-on-surface-variant font-mono uppercase block">Valor Actual Neto (VAN) Saneamiento</span>
                <span className="text-3xl font-display font-bold text-[#4ade80]">${financialData.vanBaseM.toLocaleString('es-CO', {maximumFractionDigits:1})}M</span>
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

          {/* Diagrama de Tornado Obligatorio */}
          <div className="glass-card rounded-[32px] p-6 lg:p-8 border border-white/10 space-y-6">
            <div>
              <h3 className="text-xl font-display font-bold text-white flex items-center gap-2">
                <Flame className="text-rose-400" size={22} />
                Diagrama de Tornado: Jerarquización de Variables de Mayor Riesgo
              </h3>
              <p className="text-xs text-on-surface-variant mt-1">
                Impacto sobre el VAN ante variaciones del ±10% en cada variable crítica.
              </p>
            </div>

            <div className="space-y-4">
              {financialData.tornadoVariables.map((v, idx) => (
                <div key={idx} className="bg-white/5 border border-white/10 p-4 rounded-2xl space-y-2">
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="text-white font-bold">{v.variableName}</span>
                    <span className="text-[#4ade80] font-bold">Rango VAN: ${v.minVanM.toFixed(0)}M a ${v.maxVanM.toFixed(0)}M (Oscilación ${v.swingM.toFixed(0)}M)</span>
                  </div>
                  <div className="w-full h-4 bg-white/10 rounded-full overflow-hidden relative flex items-center">
                    <div className="h-full bg-rose-500 rounded-full mx-auto" style={{ width: `${Math.min(100, (v.swingM / 100000) * 100)}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: CONCILIACIÓN & LOG AUDITORÍA (RES. 193/2016) */}
      {/* ========================================================================= */}
      {activeTab === 'audit' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          
          {/* Digital Signatures and Certifications */}
          <div className="glass-card rounded-[32px] p-6 lg:p-8 border border-white/10 space-y-6">
            <div>
              <h3 className="text-xl font-display font-bold text-white flex items-center gap-2">
                <Key className="text-[#4ade80]" size={22} />
                Certificación y Radicación Digital Sede Electrónica MinHacienda
              </h3>
              <p className="text-xs text-on-surface-variant mt-1">
                Autenticidad y no repudio firmado por Representante Legal y Contador Público DAF.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">Representante Legal</span>
                  <span className="text-[10px] text-white/60 font-mono block mt-0.5">Certificado RSA-4096 Activo</span>
                </div>
                <span className="px-3 py-1 bg-[#4ade80]/20 text-[#4ade80] rounded-full text-xs font-mono font-bold flex items-center gap-1">
                  <CheckCircle size={13} /> Firmado
                </span>
              </div>
              <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">Contador Público DAF</span>
                  <span className="text-[10px] text-white/60 font-mono block mt-0.5">T.P. 18842-T Certificado</span>
                </div>
                <span className="px-3 py-1 bg-[#4ade80]/20 text-[#4ade80] rounded-full text-xs font-mono font-bold flex items-center gap-1">
                  <CheckCircle size={13} /> Firmado
                </span>
              </div>
            </div>
          </div>

          {/* Log de Auditoría Inalterable Res 193/2016 */}
          <div className="glass-card rounded-[32px] p-6 lg:p-8 border border-white/10 space-y-4">
            <div>
              <h3 className="text-xl font-display font-bold text-white flex items-center gap-2">
                <History className="text-[#ffcc29]" size={22} />
                Log de Auditoría Inalterable (Resolución No. 193 de 2016)
              </h3>
              <p className="text-xs text-on-surface-variant mt-1">
                Trazabilidad contable con fecha, hora, usuario, subcuenta y justificación legal de cada ajuste.
              </p>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="bg-white/10 text-[#ffcc29] uppercase">
                    <th className="p-3">ID Log</th>
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">Usuario / Rol</th>
                    <th className="p-3">Subcuenta</th>
                    <th className="p-3">Acción Contable</th>
                    <th className="p-3 font-bold">CDP / RP</th>
                    <th className="p-3">Motivo Legal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {auditLogsList.map(log => (
                    <tr key={log.id} className="hover:bg-white/5">
                      <td className="p-3 font-bold text-white">{log.id}</td>
                      <td className="p-3 text-white/70">{log.timestamp}</td>
                      <td className="p-3 text-[#38bdf8] font-bold">{log.usuario}</td>
                      <td className="p-3 text-white">{log.subcuenta}</td>
                      <td className="p-3 text-[#4ade80] font-bold">{log.accion}</td>
                      <td className="p-3 text-white/80">{log.cdpRpRef}</td>
                      <td className="p-3 text-white/90 max-w-xs truncate" title={log.motivo}>{log.motivo}</td>
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
