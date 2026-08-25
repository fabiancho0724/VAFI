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
  AcreenciaASA, ActivoRealItem, AuditLogItem, TornadoVariable, FloatingVarianceItem,
  PayrollRigidityItem, WaterfallBrechaItem, PacControlBulletItem,
  GOOBI_REAL_RECAUDO_AGO25, GOOBI_REAL_COMPROMISOS_AGO25, GOOBI_REAL_PAGOS_AGO25, GOOBI_BRECHA_FUNCIONAMIENTO_AGO25,
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
  
  // Executive Tabs
  const [activeTab, setActiveTab] = useState<'corte_ago25' | 'simulator' | 'monthly_balance' | 'equilibrio' | 'traceability' | 'asa' | 'inventory' | 'audit'>('corte_ago25');

  // Sliders for Corte 25 de Agosto Sensitivity
  const [desercionPinesPct, setDesercionPinesPct] = useState<number>(0); // 0, -10%, -20%
  const [extensionSemestreDias, setExtensionSemestreDias] = useState<number>(0); // 0, 15, 30 days
  const [plazoProveedoresDias, setPlazoProveedoresDias] = useState<number>(30); // 30 to 60 days
  const [cupoPacAjustePct, setCupoPacAjustePct] = useState<number>(0); // -20% to +20%

  // Global Dropdown Filters
  const [filterUnidad, setFilterUnidad] = useState<string>('Todos');
  const [filterRecurso, setFilterRecurso] = useState<string>('Todos');

  // Sliders State for General Projections
  const [simIngByResource, setSimIngByResource] = useState<Record<string, number>>({});
  const [simGasByType, setSimGasByType] = useState<Record<string, number>>({
    Personal: 0, Funcionamiento: 0, Transferencias: 0, Tasas: 0, Deuda: 0, Inversion: 0
  });

  const [selectedProjectedUnits, setSelectedProjectedUnits] = useState<string[]>([...ALL_UPTC_UNITS]);
  const [selectedProjectedResources, setSelectedProjectedResources] = useState<string[]>([...RESOURCES_LIST]);
  const [selectedProjectedExpenseTypes, setSelectedProjectedExpenseTypes] = useState<string[]>(['Personal', 'Funcionamiento', 'Inversion', 'Transferencias', 'Tasas', 'Deuda']);

  // Fetch datasets
  useEffect(() => {
    async function loadAllData() {
      try {
        const years = [2023, 2024, 2025, 2026];
        const loadedData: Record<number, any[]> = {};
        
        await Promise.all(years.map(async (year) => {
          try {
            const rows = await fetchAndParseCSV(`/data/Ingreso%20Mensual%20${year}.csv`);
            if (rows && rows.length > 0) loadedData[year] = rows;
          } catch (e) {
            console.error(`Error loading Incomes ${year}:`, e);
          }
        }));
        
        setRawYearlyIncomes(loadedData);
        setDataStage('ready');
      } catch (err) {
        console.error("Critical error in loadData:", err);
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
      selectedProjectedExpenseTypes,
      desercionPinesPct,
      extensionSemestreDias,
      plazoProveedoresDias,
      cupoPacAjustePct
    });
  }, [
    rawYearlyIncomes, rawCumulativeIncomes, filterUnidad, filterRecurso,
    simIngByResource, simGasByType, selectedProjectedUnits,
    selectedProjectedResources, selectedProjectedExpenseTypes,
    desercionPinesPct, extensionSemestreDias, plazoProveedoresDias, cupoPacAjustePct
  ]);

  if (dataStage === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <div className="w-12 h-12 border-4 border-[#4ade80] border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-on-surface-variant font-mono animate-pulse text-sm">Cargando Datos GOOBI y Calibrando PAC SIIF (Corte 25 de Agosto)...</p>
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
              CORTE REAL: 25 DE AGOSTO DE 2026 (GOOBI)
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[9px] font-mono bg-white/10 text-white/70">
              SIIF MINHACIENDA • LEY 550
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold font-display text-white">Monitoreo de Caja & Sensibilidad</h2>
          <p className="text-xs text-on-surface-variant mt-1">
            Rolling Forecast Ene 1 - Ago 25 (Real GOOBI) $	o$ Ago 26 - Dic 31 (Proyección Dinámica) y Gráficas de Sensibilidad.
          </p>
        </div>
        
        {/* Top Dropdowns */}
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
        </div>
      </div>

      {/* Executive Navigation Tabs */}
      <div className="flex border-b border-white/10 mb-6 overflow-x-auto gap-2">
        {[
          { id: 'corte_ago25', label: '1. Tablero Corte 25 Agosto & 4 Gráficas', icon: Activity },
          { id: 'simulator', label: '2. Simular Escenarios (Recurso/Unidad)', icon: Sliders },
          { id: 'monthly_balance', label: '3. Balance Mensual & Flujo Caja', icon: Table },
          { id: 'equilibrio', label: '4. Tablero de Equilibrio Simulado', icon: Scale },
          { id: 'traceability', label: '5. Trazabilidad Recurso/Unidad', icon: FileSpreadsheet },
          { id: 'asa', label: '6. Aplicativo ASA MinHacienda', icon: FileText },
          { id: 'inventory', label: '7. Acreedores & Activos Reales', icon: Building },
          { id: 'audit', label: '8. Log Auditoría Res. 193', icon: History }
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

      {/* ========================================================================= */}
      {/* TAB 1: TABLERO DE CORTE AL 25 DE AGOSTO DE 2026 & 4 GRÁFICAS ESPECIALIZADAS */}
      {/* ========================================================================= */}
      {activeTab === 'corte_ago25' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          
          {/* BENTO GRID: HISTÓRICO GOOBI REAL & SEGREGACIÓN MULTIRECURSO */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Card 1: Recaudo Real GOOBI */}
            <div className="glass-card rounded-[24px] p-5 border border-white/10 bg-surface/50 space-y-2">
              <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-widest block font-bold">1. Histórico Real GOOBI (Ene 1 - Ago 25)</span>
              <div className="flex justify-between items-baseline">
                <span className="text-2xl font-mono font-bold text-[#4ade80]">${GOOBI_REAL_RECAUDO_AGO25.toLocaleString('es-CO')}M</span>
                <span className="text-[10px] font-mono text-white/60">Recaudo Efectivo</span>
              </div>
              <p className="text-[11px] text-white/70">
                Pagos Realizados: <strong>${GOOBI_REAL_PAGOS_AGO25.toLocaleString('es-CO')}M</strong> (Compromisos: ${GOOBI_REAL_COMPROMISOS_AGO25.toLocaleString('es-CO')}M).
              </p>
            </div>

            {/* Card 2: Caja Libre Destinación */}
            <div className="glass-card rounded-[24px] p-5 border border-[#38bdf8]/30 bg-[#38bdf8]/5 space-y-2">
              <span className="text-[10px] font-mono text-[#38bdf8] uppercase tracking-widest block font-bold">2. Caja Libre Destinación</span>
              <div className="flex justify-between items-baseline">
                <span className="text-2xl font-mono font-bold text-white">${financialData.totals.cajaLibreDestinacionM.toLocaleString('es-CO')}M</span>
                <span className="text-[10px] font-mono text-[#38bdf8]">Apto Nómina</span>
              </div>
              <p className="text-[11px] text-white/70">
                Recurso 20 Propios y Aportes Nación Funcionamiento. Disponible para gastos rígidos.
              </p>
            </div>

            {/* Card 3: Caja Restringida (Destinación Específica) */}
            <div className="glass-card rounded-[24px] p-5 border border-[#ffcc29]/30 bg-[#ffcc29]/5 space-y-2">
              <span className="text-[10px] font-mono text-[#ffcc29] uppercase tracking-widest block font-bold">3. Caja Destinación Específica</span>
              <div className="flex justify-between items-baseline">
                <span className="text-2xl font-mono font-bold text-[#ffcc29]">${financialData.totals.cajaDestinacionEspecificaM.toLocaleString('es-CO')}M</span>
                <span className="text-[10px] font-mono text-rose-400">NO Apto Nómina</span>
              </div>
              <p className="text-[11px] text-white/70">
                Recurso 40 Estampillas, Convenios y Recurso 16.0 Inversión. Restringido por Ley.
              </p>
            </div>

            {/* Card 4: Brecha Contractual (RPs por Pagar 2.1.2) */}
            <div className="glass-card rounded-[24px] p-5 border border-[#f43f5e]/30 bg-[#f43f5e]/5 space-y-2">
              <span className="text-[10px] font-mono text-rose-400 uppercase tracking-widest block font-bold">4. Brecha RPs Funcionamiento</span>
              <div className="flex justify-between items-baseline">
                <span className="text-2xl font-mono font-bold text-rose-400">${financialData.totals.brechaFuncionamientoRpM.toLocaleString('es-CO')}M</span>
                <span className="text-[10px] font-mono text-white/60">Por Desembolsar</span>
              </div>
              <p className="text-[11px] text-white/70">
                Comprometido: $115.154,4M vs Pagado: $47.737,2M. $17.958M en aseo/vigilancia.
              </p>
            </div>

          </div>

          {/* ========================================================================= */}
          {/* COMPONENTE 1: GRÁFICA DE VARIANZA FLOTANTE DE INGRESOS PROPIOS (REC 20 Y 30) */}
          {/* ========================================================================= */}
          <div className="glass-card rounded-[32px] p-6 lg:p-8 border border-white/10 space-y-6">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="text-[#4ade80]" size={22} />
                  <h3 className="text-xl font-display font-bold text-white">1. Varianza Flotante de Ingresos Propios (Recurso 20 y 30)</h3>
                </div>
                <p className="text-xs text-on-surface-variant mt-1">
                  Recaudo real de Matrículas de Pregrado, Pines y Posgrados vs curva estacional esperada.
                </p>
              </div>

              {/* Slider What-If: Deserción o caída en Venta de Pines */}
              <div className="bg-white/5 border border-white/10 p-3 rounded-2xl flex items-center gap-4 font-mono text-xs w-full lg:w-auto">
                <div>
                  <span className="text-on-surface-variant text-[10px] uppercase font-bold block">Simulación What-If (Venta Pines/Matrículas):</span>
                  <span className="text-[#4ade80] font-bold">{desercionPinesPct}% en Recaudo Q4</span>
                </div>
                <input 
                  type="range" min="-30" max="10" step="5"
                  value={desercionPinesPct}
                  onChange={(e) => setDesercionPinesPct(parseInt(e.target.value))}
                  className="w-32 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#4ade80]"
                />
              </div>
            </div>

            <div className="w-full h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={financialData.floatingVarianceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="month" stroke="#cac4d0" tick={{fontSize: 11}} />
                  <YAxis stroke="#cac4d0" tick={{fontSize: 11}} unit="$M" />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)' }} />
                  <Legend />
                  <Line type="monotone" dataKey="recaudoEsperado" name="Curva Estacional Base ($M)" stroke="#38bdf8" strokeWidth={2} strokeDasharray="5 5" />
                  <Bar dataKey="recaudoReal" name="Recaudo Real / Proyectado ($M)" fill="#4ade80" radius={[4, 4, 0, 0]} opacity={0.85}>
                    {financialData.floatingVarianceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.isPositive ? '#4ade80' : '#f43f5e'} />
                    ))}
                  </Bar>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* COMPONENTE 2: GRÁFICA DE ÁREA APILADA DE RIGIDEZ DE NÓMINA (2.1.1) */}
          {/* ========================================================================= */}
          <div className="glass-card rounded-[32px] p-6 lg:p-8 border border-white/10 space-y-6">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Layers className="text-[#38bdf8]" size={22} />
                  <h3 className="text-xl font-display font-bold text-white">2. Rigidez de Nómina Docente: Planta vs Ocasionales (2.1.1)</h3>
                </div>
                <p className="text-xs text-on-surface-variant mt-1">
                  Gasto rígido e inflexible de Docentes de Planta ($50.096,8M a julio) vs Capa variable de Ocasionales ($42.515,9M a julio).
                </p>
              </div>

              {/* Slider What-If: Extensión de Semestre */}
              <div className="bg-white/5 border border-white/10 p-3 rounded-2xl flex items-center gap-4 font-mono text-xs w-full lg:w-auto">
                <div>
                  <span className="text-on-surface-variant text-[10px] uppercase font-bold block">Simulación Extensión Semestre:</span>
                  <span className="text-[#38bdf8] font-bold">+{extensionSemestreDias} días en Vacaciones</span>
                </div>
                <div className="flex gap-1">
                  {[0, 15, 30].map(d => (
                    <button
                      key={d}
                      onClick={() => setExtensionSemestreDias(d)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold ${extensionSemestreDias === d ? 'bg-[#38bdf8] text-black' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}
                    >
                      +{d}d
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="w-full h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={financialData.payrollRigidityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="month" stroke="#cac4d0" tick={{fontSize: 11}} />
                  <YAxis stroke="#cac4d0" tick={{fontSize: 11}} unit="$M" />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)' }} />
                  <Legend />
                  <Area type="monotone" dataKey="plantaRigida" stackId="1" name="Docentes Planta (Rígido) ($M)" fill="#1e293b" stroke="#64748b" />
                  <Area type="monotone" dataKey="ocasionalesVariable" stackId="1" name="Docentes Ocasionales (Variable) ($M)" fill="#38bdf8" stroke="#38bdf8" opacity={0.8} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* COMPONENTE 3: GRÁFICA DE CASCADA (WATERFALL) BRECHA DE FUNCIONAMIENTO (2.1.2) */}
          {/* ========================================================================= */}
          <div className="glass-card rounded-[32px] p-6 lg:p-8 border border-white/10 space-y-6">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <BarChart2 className="text-[#ffcc29]" size={22} />
                  <h3 className="text-xl font-display font-bold text-white">3. Cascada de Liquidación de Brecha de Funcionamiento ($67.417,2M)</h3>
                </div>
                <p className="text-xs text-on-surface-variant mt-1">
                  Calendarización de desembolsos para cubrir los compromisos contractuales pendientes de pago de agosto a diciembre.
                </p>
              </div>

              {/* Slider What-If: Plazo Proveedores */}
              <div className="bg-white/5 border border-white/10 p-3 rounded-2xl flex items-center gap-4 font-mono text-xs w-full lg:w-auto">
                <div>
                  <span className="text-on-surface-variant text-[10px] uppercase font-bold block">Plazo de Pago a Proveedores:</span>
                  <span className="text-[#ffcc29] font-bold">{plazoProveedoresDias} días</span>
                </div>
                <input 
                  type="range" min="30" max="60" step="15"
                  value={plazoProveedoresDias}
                  onChange={(e) => setPlazoProveedoresDias(parseInt(e.target.value))}
                  className="w-28 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#ffcc29]"
                />
              </div>
            </div>

            <div className="w-full h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={financialData.waterfallBrechaData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="category" stroke="#cac4d0" tick={{fontSize: 10}} />
                  <YAxis stroke="#cac4d0" tick={{fontSize: 11}} unit="$M" />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)' }} />
                  <Bar dataKey="balanceRemaining" name="Saldo Pendiente Brecha ($M)" fill="#ffcc29" radius={[4, 4, 0, 0]}>
                    {financialData.waterfallBrechaData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.isTotal ? '#f43f5e' : (entry.isSubtotal ? '#4ade80' : '#ffcc29')} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* COMPONENTE 4: GRÁFICA DE BALA (BULLET CHART) DE CONTROL DEL PAC E INPANUT */}
          {/* ========================================================================= */}
          <div className="glass-card rounded-[32px] p-6 lg:p-8 border border-white/10 space-y-6">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Gauge className="text-rose-400" size={22} />
                  <h3 className="text-xl font-display font-bold text-white">4. Control del PAC Mensual (SIIF) y Prevención de INPANUT</h3>
                </div>
                <p className="text-xs text-on-surface-variant mt-1">
                  Comparativa de pagos proyectados vs cupo de PAC asignado por MinHacienda con zonas semafóricas de eficiencia.
                </p>
              </div>

              {/* Slider What-If: Ajuste Cupo PAC SIIF */}
              <div className="bg-white/5 border border-white/10 p-3 rounded-2xl flex items-center gap-4 font-mono text-xs w-full lg:w-auto">
                <div>
                  <span className="text-on-surface-variant text-[10px] uppercase font-bold block">Ajuste Cupo PAC SIIF:</span>
                  <span className="text-rose-400 font-bold">{cupoPacAjustePct >= 0 ? '+' : ''}{cupoPacAjustePct}%</span>
                </div>
                <input 
                  type="range" min="-20" max="20" step="5"
                  value={cupoPacAjustePct}
                  onChange={(e) => setCupoPacAjustePct(parseInt(e.target.value))}
                  className="w-28 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-rose-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {financialData.pacControlBulletData.map((item, idx) => (
                <div key={idx} className="bg-white/5 border border-white/10 p-5 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="text-white font-bold">{item.month} 2026</span>
                    <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${item.statusZone === 'VERDE_OPTIMO' ? 'bg-[#4ade80]/20 text-[#4ade80]' : (item.statusZone === 'ROJO_INPANUT' ? 'bg-red-500/20 text-red-400' : 'bg-orange-500/20 text-orange-300')}`}>
                      {item.statusZone === 'VERDE_OPTIMO' ? '🟢 Ejecución Óptima' : (item.statusZone === 'ROJO_INPANUT' ? '🔴 Riesgo INPANUT' : '🟠 Cuello Botella SIIF')}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs font-mono">
                    <div className="flex justify-between text-on-surface-variant">
                      <span>Pagos Proyectados: <strong>${item.pagosProyectados}M</strong></span>
                      <span>Cupo PAC SIIF: <strong>${item.cupoPacSiif}M</strong></span>
                    </div>

                    {/* Bullet Chart Bar */}
                    <div className="relative h-5 w-full bg-white/10 rounded-md overflow-hidden flex items-center">
                      <div className="absolute left-0 top-0 h-full bg-red-500/20" style={{ width: '70%' }}></div>
                      <div className="absolute left-[70%] top-0 h-full bg-emerald-500/20" style={{ width: '25%' }}></div>
                      <div className="absolute left-[95%] top-0 h-full bg-orange-500/20" style={{ width: '5%' }}></div>
                      
                      <div 
                        className="h-2.5 bg-white rounded-sm z-10 transition-all" 
                        style={{ width: `${Math.min(100, (item.pagosProyectados / item.cupoPacSiif) * 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/5 flex justify-between text-[10px] font-mono">
                    <span className="text-on-surface-variant">Índice INPANUT Proyectado:</span>
                    <span className={`font-bold ${item.inpanutPct > 20 ? 'text-red-400' : 'text-[#4ade80]'}`}>{item.inpanutPct.toFixed(1)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* OTHER EXISTING TABS (SIMULATOR, MONTHLY BALANCE, EQUILIBRIO, ASA, ETC.) */}
      {/* ========================================================================= */}
      {activeTab === 'simulator' && (
        <div className="glass-card rounded-[32px] p-8 border border-white/10 space-y-6">
          <h3 className="text-2xl font-bold text-white">Simulación Paramétrica por Recurso y Unidad</h3>
          <p className="text-xs text-on-surface-variant">Ajuste de parámetros y selección granular de 14 dependencias UPTC.</p>
        </div>
      )}

      {activeTab === 'monthly_balance' && (
        <div className="glass-card rounded-[32px] p-8 border border-white/10 space-y-6">
          <h3 className="text-2xl font-bold text-white font-display">Tabla de Balance Mensual (Ene - Dic 2026)</h3>
          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="bg-white/10 text-[#4ade80] uppercase">
                  <th className="p-4">Período</th>
                  <th className="p-4 text-right">Ingresos Proyectados</th>
                  <th className="p-4 text-right">Compromisos</th>
                  <th className="p-4 text-right">Pagos Efectivos</th>
                  <th className="p-4 text-right">Nómina ($M)</th>
                  <th className="p-4 text-right">Saldo Neto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {financialData.simulatedFlow.map((row, idx) => (
                  <tr key={idx} className="hover:bg-white/5">
                    <td className="p-4 text-white font-bold">{row.name}</td>
                    <td className="p-4 text-right text-[#4ade80]">${row.ingresos.toLocaleString('es-CO')}M</td>
                    <td className="p-4 text-right text-[#f43f5e]">${row.gastosComp.toLocaleString('es-CO')}M</td>
                    <td className="p-4 text-right text-[#ffcc29]">${row.gastosPago.toLocaleString('es-CO')}M</td>
                    <td className="p-4 text-right text-[#38bdf8]">${row.gastoPersonal.toLocaleString('es-CO')}M</td>
                    <td className={`p-4 text-right font-bold ${row.netoPago >= 0 ? 'text-[#4ade80]' : 'text-red-400'}`}>
                      ${row.netoPago.toLocaleString('es-CO')}M
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'equilibrio' && (
        <div className="glass-card rounded-[32px] p-8 border border-white/10 space-y-6">
          <h3 className="text-2xl font-bold text-white">Equilibrio Presupuestal Consolidado</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/5 p-6 rounded-2xl border border-white/10 space-y-2">
              <span className="text-xs font-mono text-on-surface-variant uppercase">Recaudo Total Proyectado</span>
              <span className="text-3xl font-bold font-mono text-[#4ade80]">${financialData.totals.simIng.toLocaleString('es-CO')}M</span>
            </div>
            <div className="bg-white/5 p-6 rounded-2xl border border-white/10 space-y-2">
              <span className="text-xs font-mono text-on-surface-variant uppercase">Pagos Efectivos Simulados</span>
              <span className="text-3xl font-bold font-mono text-[#ffcc29]">${financialData.totals.simGasPago.toLocaleString('es-CO')}M</span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'traceability' && (
        <div className="glass-card rounded-[32px] p-8 border border-white/10 space-y-6">
          <h3 className="text-2xl font-bold text-white">Matriz de Trazabilidad Recurso → Unidad</h3>
          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="bg-white/10 text-[#ffcc29] uppercase">
                  <th className="p-4">Cód.</th>
                  <th className="p-4">Recurso</th>
                  <th className="p-4">Unidad Responsable</th>
                  <th className="p-4 text-right">Ingreso Proyectado</th>
                  <th className="p-4 text-right">Pago Efectivo</th>
                  <th className="p-4 text-right">Saldo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {financialData.traceabilityMatrix.map((item) => (
                  <tr key={item.resourceCode} className="hover:bg-white/5">
                    <td className="p-4 font-bold text-white">{item.resourceCode}</td>
                    <td className="p-4 text-white font-bold">{item.resourceName}</td>
                    <td className="p-4 text-on-surface-variant">{item.unitName}</td>
                    <td className="p-4 text-right text-[#4ade80]">${item.projectedIncome.toLocaleString('es-CO')}M</td>
                    <td className="p-4 text-right text-[#ffcc29]">${item.totalPago.toLocaleString('es-CO')}M</td>
                    <td className="p-4 text-right font-bold text-[#38bdf8]">${item.remainingBalance.toLocaleString('es-CO')}M</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'asa' && (
        <div className="glass-card rounded-[32px] p-8 border border-white/10 space-y-6">
          <h3 className="text-2xl font-bold text-white">Aplicativo ASA (DAF MinHacienda)</h3>
          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="bg-white/10 text-[#4ade80] uppercase">
                  <th className="p-4">Subcuenta / ID</th>
                  <th className="p-4">Acreedor</th>
                  <th className="p-4">Grupo Ley 550</th>
                  <th className="p-4 text-right">Inicial ($M)</th>
                  <th className="p-4 text-right">Saldo Votación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {financialData.acreenciasASA.map(a => (
                  <tr key={a.id} className="hover:bg-white/5">
                    <td className="p-4 text-white font-bold">{a.subcuenta}</td>
                    <td className="p-4 text-white font-bold">{a.acreedorNombre}</td>
                    <td className="p-4 text-white/70">{a.grupoAcreencia}</td>
                    <td className="p-4 text-right">${a.saldoInicial}M</td>
                    <td className="p-4 text-right text-[#4ade80] font-bold">${a.saldoFinalVotacion}M</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'inventory' && (
        <div className="glass-card rounded-[32px] p-8 border border-white/10 space-y-6">
          <h3 className="text-2xl font-bold text-white">Inventario de Activos Reales y Contingentes</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {financialData.activosReales.map(a => (
              <div key={a.id} className="bg-white/5 p-4 rounded-2xl border border-white/10 font-mono text-xs space-y-1">
                <span className="text-[#38bdf8] font-bold">{a.tipo}</span>
                <h4 className="text-white font-bold text-sm">{a.nombre}</h4>
                <p className="text-white/70 text-[11px]">{a.detalles}</p>
                <span className="text-[#4ade80] font-bold block pt-1">Valor Neto Real: ${a.valorNetoReal}M</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="glass-card rounded-[32px] p-8 border border-white/10 space-y-6">
          <h3 className="text-2xl font-bold text-white">Log de Auditoría Inalterable (Res. 193/2016)</h3>
          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="bg-white/10 text-[#ffcc29] uppercase">
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Usuario / Rol</th>
                  <th className="p-3">Acción Contable</th>
                  <th className="p-3">Motivo Legal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {financialData.auditLogs.map(log => (
                  <tr key={log.id} className="hover:bg-white/5">
                    <td className="p-3 text-white/70">{log.timestamp}</td>
                    <td className="p-3 text-[#38bdf8] font-bold">{log.usuario}</td>
                    <td className="p-3 text-[#4ade80] font-bold">{log.accion}</td>
                    <td className="p-3 text-white/90">{log.motivo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
