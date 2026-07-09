import { 
  LayoutDashboard, 
  LineChart, 
  Users, 
  GraduationCap, 
  BarChart3, 
  Wallet, 
  FileText, 
  FolderOpen,
  ArrowRight,
  Bot
} from 'lucide-react';

const MODULES = [
  { id: 'dashboard', icon: LayoutDashboard, title: 'Tablero', desc: 'Resumen financiero general e indicadores clave.' },
  { id: 'historical', icon: LineChart, title: 'Histórico', desc: 'Evolución de ingresos y gastos en periodos anteriores.' },
  { id: 'nomina', icon: Users, title: 'Nómina', desc: 'Análisis de personal, salarios y prestaciones.' },
  { id: 'posgrados', icon: GraduationCap, title: 'Posgrados', desc: 'Matrículas, flexibilización y programas.' },
  { id: 'predictive', icon: BarChart3, title: 'Proyección', desc: 'Flujo de caja, simulador financiero y equilibrio.' },
  { id: 'budget', icon: Wallet, title: 'Alertas', desc: 'Control de ejecución presupuestal y anomalías.' },
  { id: 'reports', icon: FileText, title: 'Reportes', desc: 'Informes detallados listos para exportar.' },
  { id: 'repository', icon: FolderOpen, title: 'Repositorio', desc: 'Archivos y documentos financieros.' },
  { id: 'assistant', icon: Bot, title: 'Asistente IA', desc: 'Asistente virtual RAG para consultas del proyecto.' },
];

export function CoverScreen({ onNavigate }: { onNavigate: (s: string) => void }) {
  return (
    <div className="min-h-screen bg-[#070c19] text-on-surface flex flex-col relative overflow-hidden" 
         style={{ backgroundImage: 'radial-gradient(circle at 50% -20%, #16264c 0%, #070c19 75%)' }}>
      
      {/* Premium Decorative Glow Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary-container/8 blur-[130px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-[#7bd0ff]/5 blur-[120px]"></div>
      <div className="absolute top-[30%] right-[10%] w-[20%] h-[20%] rounded-full bg-secondary-container/5 blur-[100px]"></div>

      <div className="flex-1 max-w-7xl w-full mx-auto px-6 py-12 flex flex-col justify-between z-10">
        
        {/* Header Hero Section */}
        <div className="flex flex-col items-center text-center space-y-6 mt-10 mb-16">
          <div className="p-3 bg-white/5 rounded-3xl border border-white/10 shadow-2xl backdrop-blur-md mb-2">
            <img 
               src="https://www.uptc.edu.co/sitio/export/sites/default/portal/sitios/universidad/rectoria/comunicaciones/.content/doc/logos/uptc-blanco.png" 
               alt="UPTC Logo" 
               className="w-32 object-contain opacity-90 filter drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]"
            />
          </div>
          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl font-display font-extrabold tracking-tight text-white leading-tight">
              Consolidado y Proyección <span className="text-primary-container bg-gradient-to-r from-primary-container to-[#ffe385] bg-clip-text text-transparent">Financiera</span>
            </h1>
            <p className="text-base md:text-lg text-on-surface-variant max-w-2xl mx-auto font-light leading-relaxed">
              Plataforma institucional de inteligencia de datos financieros para el análisis retrospectivo, 
              seguimiento presupuestal y simulador del flujo de caja de la UPTC.
            </p>
          </div>
          
          <button 
            onClick={() => onNavigate('dashboard')}
            className="mt-6 px-8 py-3.5 bg-primary-container text-on-primary-container rounded-full font-bold text-base flex items-center justify-center gap-3 hover:scale-105 hover:bg-[#ffe385] hover:shadow-[0_0_30px_rgba(255,204,41,0.35)] transition-all duration-300 active:scale-95 cursor-pointer"
          >
            Ingresar al Sistema
            <ArrowRight size={18} />
          </button>
        </div>

        {/* Modules Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
           {MODULES.map((mod) => (
             <div 
               key={mod.id} 
               onClick={() => onNavigate(mod.id)}
               className="group relative glass-card rounded-[24px] p-6 cursor-pointer overflow-hidden transition-all duration-300 hover:scale-[1.03] hover:border-[#ffcc29]/30 hover:shadow-[0_12px_32px_rgba(0,0,0,0.5)]"
             >
                {/* Subtle top light bar */}
                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#ffcc29]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-white/5 border border-white/10 rounded-2xl text-[#ffcc29] group-hover:scale-110 group-hover:bg-[#ffcc29] group-hover:text-black group-hover:border-transparent transition-all shadow-inner">
                    <mod.icon size={22} />
                  </div>
                  <ArrowRight size={18} className="text-white/20 group-hover:text-[#ffcc29] -translate-x-3 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2 group-hover:text-[#ffcc29] transition-colors">{mod.title}</h3>
                <p className="text-xs text-on-surface-variant font-light leading-relaxed group-hover:text-white/80 transition-colors">
                  {mod.desc}
                </p>
             </div>
           ))}
        </div>

        {/* Footer */}
        <footer className="mt-16 text-center text-[#94a3b8]/50 font-mono text-xs py-4 border-t border-white/5 w-full">
            ©Fabián L. Cely – VAFI – Universidad Pedagógica y Tecnológica de Colombia
        </footer>
      </div>

    </div>
  );
}
