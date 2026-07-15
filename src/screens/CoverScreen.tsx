import { useState, useEffect } from 'react';
import { 
  BarChart3, LineChart, Wallet, Users, FileText, 
  Settings, FolderOpen, ArrowRight, GraduationCap, Bot,
  TrendingUp, Activity, CheckCircle, Database, HelpCircle, Shield, Sparkles, Layers
} from 'lucide-react';

const MODULES = [
  { id: 'dashboard', icon: BarChart3, title: 'Consolidado', desc: 'Resumen financiero, cumplimiento de aforos y ejecución.' },
  { id: 'historical', icon: LineChart, title: 'Histórico', desc: 'Evolución de ingresos y gastos en periodos anteriores.' },
  { id: 'nomina', icon: Users, title: 'Nómina', desc: 'Análisis de personal, salarios y prestaciones.' },
  { id: 'posgrados', icon: GraduationCap, title: 'Posgrados', desc: 'Matrículas, flexibilización y programas.' },
  { id: 'predictive', icon: BarChart3, title: 'Proyección Financiera', desc: 'Simulador, flujo de caja y escenarios futuros.' },
  { id: 'multiyear', icon: Layers, title: 'Proyección Multivigencia', desc: 'Simulación presupuestal de mediano y largo plazo (1 a 20 años) con indexadores IPC/ICES.' },
  { id: 'budget', icon: Wallet, title: 'Alertas', desc: 'Control de ejecución presupuestal y anomalías.' },
  { id: 'reports', icon: FileText, title: 'Reportes', desc: 'Informes detallados listos para exportar.' },
  { id: 'repository', icon: FolderOpen, title: 'Repositorio', desc: 'Archivos y documentos financieros.' },
  { id: 'assistant', icon: Bot, title: 'Asistente IA', desc: 'Consultas financieras mediante lenguaje natural.' },
  { id: 'settings', icon: Settings, title: 'Configuración', desc: 'Parametrización del sistema.' }
];

export function CoverScreen({ onNavigate }: { onNavigate: (s: string) => void }) {
  const [activeFeature, setActiveFeature] = useState(0);

  const features = [
    { title: "Control de Caja en Tiempo Real", desc: "Monitoree el ingreso, compromiso y pago con validaciones matemáticas automatizadas y alertas de liquidez." },
    { title: "Escenarios Predictivos por IA", desc: "Simule variaciones de ingresos y egresos para predecir déficits de caja y proyectar balances anuales." },
    { title: "Desglose por Fuente de Recurso", desc: "Análisis pormenorizado de las 18 fuentes de ingresos y las 6 categorías de gastos principales." }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature(prev => (prev + 1) % features.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#09090b] text-on-surface flex flex-col relative overflow-x-hidden selection:bg-[#ffcc29] selection:text-black">
      
      {/* Background Glow Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#ffcc29]/5 blur-[160px] pointer-events-none z-0"></div>
      <div className="absolute top-[30%] right-[-10%] w-[40%] h-[40%] rounded-full bg-[#38bdf8]/5 blur-[180px] pointer-events-none z-0"></div>
      <div className="absolute bottom-[-10%] left-[20%] w-[50%] h-[40%] rounded-full bg-secondary/5 blur-[160px] pointer-events-none z-0"></div>

      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-[#09090b]/80 border-b border-white/5 transition-all">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src="https://raw.githubusercontent.com/fabiancho0724/VAFI-Reporte-Financiero/7601e17bbde30e0381cc947ff62d9345b0ec3853/uptc-blanco%20(1).png" 
              alt="UPTC Logo" 
              className="h-9 object-contain"
            />
            <div className="w-[1px] h-6 bg-white/10 hidden sm:block"></div>
            <span className="text-sm font-mono font-bold tracking-widest text-[#ffcc29] uppercase hidden sm:block">
              VAFI Control
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-6">
            <button onClick={() => onNavigate('dashboard')} className="text-xs font-mono text-on-surface-variant hover:text-white transition-colors uppercase tracking-wider cursor-pointer">Tablero</button>
            <button onClick={() => onNavigate('historical')} className="text-xs font-mono text-on-surface-variant hover:text-white transition-colors uppercase tracking-wider cursor-pointer">Histórico</button>
            <button onClick={() => onNavigate('predictive')} className="text-xs font-mono text-on-surface-variant hover:text-white transition-colors uppercase tracking-wider cursor-pointer">Proyecciones</button>
            <button onClick={() => onNavigate('assistant')} className="text-xs font-mono text-on-surface-variant hover:text-white transition-colors uppercase tracking-wider cursor-pointer">IA Asistente</button>
          </nav>

          <button 
            onClick={() => onNavigate('dashboard')}
            className="px-5 py-2.5 bg-[#ffcc29] text-black rounded-xl font-bold text-xs font-mono uppercase tracking-wider hover:bg-[#ffcc29]/90 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 shadow-[0_4px_20px_rgba(255,204,41,0.15)] cursor-pointer"
          >
            Ingresar
          </button>
        </div>
      </header>

      {/* Main Cover Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-12 flex flex-col z-10 space-y-24">
        
        {/* HERO SECTION */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center pt-8">
          
          {/* Hero Details */}
          <div className="lg:col-span-7 flex flex-col space-y-8 text-left animate-in fade-in slide-in-from-bottom-6 duration-700">
            {/* Announcement Badge */}
            <div className="inline-flex items-center gap-2 self-start bg-white/5 border border-white/10 px-4 py-1.5 rounded-full">
              <Sparkles size={14} className="text-[#ffcc29] animate-pulse" />
              <span className="text-[10px] font-mono text-white/80 uppercase tracking-widest">
                Plataforma de Analítica Avanzada UPTC
              </span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-display font-extrabold tracking-tight text-white leading-[1.1] max-w-2xl">
              Control Inteligente, <br className="hidden sm:inline" />
              Decisiones <span className="text-[#ffcc29] relative inline-block">Estratégicas</span>
            </h1>

            <p className="text-base sm:text-lg text-on-surface-variant max-w-xl font-light leading-relaxed">
              Consolide, visualice y proyecte el presupuesto de la Universidad Pedagógica y Tecnológica de Colombia con analítica de precisión y soporte cognitivo avanzado.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <button 
                onClick={() => onNavigate('dashboard')}
                className="px-8 py-4 bg-[#ffcc29] text-black rounded-2xl font-bold text-sm font-mono uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-[#ffcc29]/95 hover:scale-[1.03] active:scale-[0.97] transition-all duration-300 shadow-[0_8px_30px_rgba(255,204,41,0.2)] cursor-pointer"
              >
                Ingresar al Tablero
                <ArrowRight size={18} />
              </button>
              
              <a 
                href="#modules-section"
                className="px-8 py-4 bg-white/5 text-white border border-white/10 rounded-2xl font-bold text-sm font-mono uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-white/10 hover:border-white/20 transition-all duration-300"
              >
                Explorar Módulos
              </a>
            </div>

            {/* Micro Trust Indicators */}
            <div className="pt-6 border-t border-white/5 grid grid-cols-3 gap-6 text-left">
              <div>
                <span className="text-2xl font-bold font-mono text-white tracking-tight">100%</span>
                <span className="text-[10px] text-on-surface-variant block uppercase tracking-wider font-mono mt-1">Transparente</span>
              </div>
              <div>
                <span className="text-2xl font-bold font-mono text-white tracking-tight">18+</span>
                <span className="text-[10px] text-on-surface-variant block uppercase tracking-wider font-mono mt-1">Recursos</span>
              </div>
              <div>
                <span className="text-2xl font-bold font-mono text-white tracking-tight">Real-Time</span>
                <span className="text-[10px] text-on-surface-variant block uppercase tracking-wider font-mono mt-1">Escenarios</span>
              </div>
            </div>
          </div>

          {/* Hero Illustration Graphic */}
          <div className="lg:col-span-5 flex justify-center relative animate-in fade-in slide-in-from-right-6 duration-1000">
            {/* Accent Glowing Aura */}
            <div className="absolute inset-0 bg-gradient-to-tr from-[#ffcc29]/10 to-cyan-500/10 rounded-[32px] blur-2xl z-0 scale-95 pointer-events-none"></div>
            
            <div className="relative glass-card rounded-[32px] border border-white/10 p-2 overflow-hidden shadow-2xl z-10 w-full max-w-[450px]">
              <img 
                src="/financial_hero.png" 
                alt="VAFI Analítica Financiera" 
                className="w-full h-auto object-cover rounded-[24px] shadow-2xl hover:scale-[1.02] transition-transform duration-500"
              />
            </div>
          </div>

        </section>

        {/* FINANCIAL REAL-TIME METRICS BANNER */}
        <section className="glass-card rounded-[28px] border border-white/5 p-8 relative overflow-hidden bg-surface/40 shadow-xl">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
          
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <span className="inline-flex items-center gap-1.5 bg-[#ffcc29]/10 text-[#ffcc29] px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase tracking-widest mb-2">
                Corte Real 30 de Junio
              </span>
              <h3 className="text-lg font-bold text-white tracking-tight">Ejecución Consolidada Actual</h3>
              <p className="text-xs text-on-surface-variant mt-1">Línea base registrada y auditada de la vigencia actual.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full md:w-auto shrink-0 md:border-l border-white/5 md:pl-8">
              <div className="bg-white/5 px-4 py-3 rounded-xl border border-white/5">
                <span className="text-[10px] text-on-surface-variant uppercase tracking-wider font-mono block">Recaudo Real</span>
                <span className="text-xl font-bold font-mono text-[#4ade80]">$282.995,4M</span>
              </div>
              <div className="bg-white/5 px-4 py-3 rounded-xl border border-white/5">
                <span className="text-[10px] text-on-surface-variant uppercase tracking-wider font-mono block">Compromisos</span>
                <span className="text-xl font-bold font-mono text-[#f43f5e]">$276.110,9M</span>
              </div>
              <div className="bg-white/5 px-4 py-3 rounded-xl border border-white/5">
                <span className="text-[10px] text-on-surface-variant uppercase tracking-wider font-mono block">Pago Efectivo</span>
                <span className="text-xl font-bold font-mono text-[#38bdf8]">$205.394,3M</span>
              </div>
            </div>
          </div>
        </section>

        {/* BENEFICIOS / VALORES CLAVE */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
          <div className="glass-card rounded-[24px] p-6 border border-white/5 bg-surface/30 hover:border-[#ffcc29]/20 hover:shadow-[0_4px_25px_rgba(251,191,36,0.05)] transition-all duration-300">
            <div className="w-10 h-10 rounded-xl bg-[#ffcc29]/10 text-[#ffcc29] flex items-center justify-center mb-6">
              <Database size={20} />
            </div>
            <h4 className="text-lg font-bold text-white mb-2">Centralización y Automatización</h4>
            <p className="text-sm text-on-surface-variant font-light leading-relaxed">
              Importación instantánea de reportes de ejecución presupuestal de ingresos y gastos directamente desde bases de datos financieras de la universidad.
            </p>
          </div>

          <div className="glass-card rounded-[24px] p-6 border border-white/5 bg-surface/30 hover:border-[#38bdf8]/20 hover:shadow-[0_4px_25px_rgba(56,189,248,0.05)] transition-all duration-300">
            <div className="w-10 h-10 rounded-xl bg-[#38bdf8]/10 text-[#38bdf8] flex items-center justify-center mb-6">
              <TrendingUp size={20} />
            </div>
            <h4 className="text-lg font-bold text-white mb-2">Simulación Contable Avanzada</h4>
            <p className="text-sm text-on-surface-variant font-light leading-relaxed">
              Motor predictivo de flujo de caja que ajusta automáticamente los pagos del segundo semestre para cumplir con los techos presupuestales y de liquidez.
            </p>
          </div>

          <div className="glass-card rounded-[24px] p-6 border border-white/5 bg-surface/30 hover:border-purple-400/20 hover:shadow-[0_4px_25px_rgba(167,139,250,0.05)] transition-all duration-300">
            <div className="w-10 h-10 rounded-xl bg-purple-400/10 text-purple-400 flex items-center justify-center mb-6">
              <Sparkles size={20} />
            </div>
            <h4 className="text-lg font-bold text-white mb-2">Soporte Inteligente Integrado</h4>
            <p className="text-sm text-on-surface-variant font-light leading-relaxed">
              Asistente virtual de Inteligencia Artificial que interpreta el estado presupuestal, genera justificaciones contables y realiza análisis rápidos en lenguaje natural.
            </p>
          </div>
        </section>

        {/* INTERACTIVE MODULES LIST SECTION */}
        <section id="modules-section" className="space-y-8 scroll-mt-20">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <h2 className="text-3xl font-display font-extrabold text-white">Módulos de la Plataforma</h2>
            <p className="text-sm text-on-surface-variant">Explore las herramientas disponibles para el análisis detallado y control de la ejecución presupuestal.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
             {MODULES.map((mod) => (
                <div 
                  key={mod.id}
                  onClick={() => {
                    if (mod.id === 'multiyear') {
                      localStorage.setItem('vafi_activePredictiveTab', 'multiyear');
                      onNavigate('predictive');
                    } else {
                      onNavigate(mod.id);
                    }
                  }}
                  className="group relative glass-card p-5 cursor-pointer overflow-hidden transition-all duration-300 hover:bg-white/5 hover:border-[#ffcc29]/30 hover:-translate-y-1.5 hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)]"
                >
                  {/* Hover Left Stripe */}
                  <div className="absolute top-0 left-0 w-[2px] h-0 bg-[#ffcc29] transition-all duration-300 group-hover:h-full"></div>
                  
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2.5 bg-white/5 rounded-xl text-on-surface-variant group-hover:scale-105 group-hover:bg-[#ffcc29] group-hover:text-black transition-all">
                      <mod.icon size={20} />
                    </div>
                    <ArrowRight size={16} className="text-white/20 group-hover:text-[#ffcc29] -translate-x-3 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                  </div>
                  
                  <h3 className="text-base font-bold text-white mb-1.5">{mod.title}</h3>
                  <p className="text-xs text-on-surface-variant font-light line-clamp-3 leading-relaxed group-hover:text-white/80 transition-colors">
                    {mod.desc}
                  </p>
               </div>
             ))}
          </div>
        </section>

        {/* CORE SHOWCASE SECTION */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center bg-white/[0.02] border border-white/5 rounded-[32px] p-8 lg:p-12 relative overflow-hidden">
          <div className="absolute top-[-20%] right-[-20%] w-[50%] h-[50%] rounded-full bg-[#38bdf8]/5 blur-[120px] pointer-events-none"></div>

          {/* Left Description */}
          <div className="lg:col-span-5 flex flex-col space-y-6">
            <span className="text-[10px] font-mono text-[#ffcc29] font-bold uppercase tracking-wider">
              Seguridad y Control
            </span>
            <h3 className="text-2xl sm:text-3xl font-display font-extrabold text-white">
              Herramienta de Gestión Financiera Corporativa
            </h3>
            
            <div className="space-y-4">
              {features.map((feat, idx) => (
                <div 
                  key={idx}
                  onClick={() => setActiveFeature(idx)}
                  className={`p-4 rounded-2xl cursor-pointer border transition-all duration-300 ${activeFeature === idx ? 'bg-white/5 border-white/10 shadow-lg' : 'bg-transparent border-transparent hover:bg-white/[0.02]'}`}
                >
                  <div className="flex gap-3">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${activeFeature === idx ? 'bg-[#ffcc29] text-black' : 'bg-white/10 text-white/40'}`}>
                      <CheckCircle size={12} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{feat.title}</h4>
                      {activeFeature === idx && (
                        <p className="text-xs text-on-surface-variant mt-1.5 leading-relaxed animate-in fade-in duration-300">
                          {feat.desc}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Showcase Graphic */}
          <div className="lg:col-span-7 flex justify-center">
            <div className="w-full max-w-[500px] glass-card rounded-2xl border border-white/10 bg-[#0c0c0e] p-5 shadow-2xl relative overflow-hidden flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/80"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/80"></div>
                </div>
                <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider">AI CONTABLE PRO</span>
              </div>
              
              <div className="space-y-3 flex-1 font-mono text-xs text-white/80">
                <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                  <span className="text-[9px] text-[#ffcc29] uppercase font-bold block mb-1">PROMPT INGRESO</span>
                  <span>"¿Cuál es el estado del recurso 32-Extension para el cierre de la vigencia?"</span>
                </div>
                
                <div className="bg-white/5 p-3 rounded-lg border border-white/5 text-[#38bdf8]">
                  <span className="text-[9px] text-[#38bdf8] uppercase font-bold block mb-1">PROCESANDO MODELO...</span>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-[#38bdf8] rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-[#38bdf8] rounded-full animate-bounce delay-100"></div>
                    <div className="w-1.5 h-1.5 bg-[#38bdf8] rounded-full animate-bounce delay-200"></div>
                  </div>
                </div>

                <div className="bg-white/5 p-4 rounded-lg border border-white/5 text-white/90 font-sans leading-relaxed text-xs">
                  <span className="text-[9px] text-purple-400 uppercase font-bold font-mono block mb-1">RESPUESTA IA</span>
                  El recurso **32-Extensión** presenta un presupuesto inicial (Aforado) de **$87.508,6M** con un recaudo actual a Junio de **$36.931,0M** (38.0%). Se estima que la proyección lineal Jul-Dic alcanzará **$43.080,0M** adicionales para un consolidado anual de **$80.011,0M**.
                </div>
              </div>
            </div>
          </div>

        </section>

      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-white/5 bg-[#09090b]">
        <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <img 
              src="https://raw.githubusercontent.com/fabiancho0724/VAFI-Reporte-Financiero/7601e17bbde30e0381cc947ff62d9345b0ec3853/uptc-blanco%20(1).png" 
              alt="UPTC Logo" 
              className="h-8 object-contain opacity-60"
            />
            <div className="w-[1px] h-4 bg-white/10"></div>
            <span className="text-xs font-mono text-on-surface-variant uppercase tracking-widest">
              VAFI Control UPTC
            </span>
          </div>

          <div className="text-center md:text-right font-mono text-[10px] text-on-surface-variant leading-relaxed">
            <p>©Fabián L. Cely – VAFI – Universidad Pedagógica y Tecnológica de Colombia</p>
            <p className="text-[9px] opacity-40 mt-1">Plataforma Financiera Institucional - Todos los derechos reservados</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
