import { useEffect, useRef } from 'react';
import { 
  BarChart3, LineChart, Wallet, Users, FileText, 
  Settings, FolderOpen, ArrowRight, GraduationCap, Bot
} from 'lucide-react';

const MODULES = [
  { id: 'dashboard', icon: BarChart3, title: 'Consolidado', desc: 'Resumen financiero, cumplimiento de aforos y ejecución.' },
  { id: 'historical', icon: LineChart, title: 'Histórico', desc: 'Evolución de ingresos y gastos en periodos anteriores.' },
  { id: 'nomina', icon: Users, title: 'Nómina', desc: 'Análisis de personal, salarios y prestaciones.' },
  { id: 'posgrados', icon: GraduationCap, title: 'Posgrados', desc: 'Matrículas, flexibilización y programas.' },
  { id: 'predictive', icon: BarChart3, title: 'Proyección Financiera', desc: 'Simulador, flujo de caja y escenarios futuros.' },
  { id: 'budget', icon: Wallet, title: 'Alertas', desc: 'Control de ejecución presupuestal y anomalías.' },
  { id: 'reports', icon: FileText, title: 'Reportes', desc: 'Informes detallados listos para exportar.' },
  { id: 'repository', icon: FolderOpen, title: 'Repositorio', desc: 'Archivos y documentos financieros.' },
  { id: 'assistant', icon: Bot, title: 'Asistente IA', desc: 'Consultas financieras mediante lenguaje natural.' },
  { id: 'settings', icon: Settings, title: 'Configuración', desc: 'Parametrización del sistema.' }
];

export function CoverScreen({ onNavigate }: { onNavigate: (s: string) => void }) {
  return (
    <div className="min-h-screen bg-black flex flex-col relative overflow-hidden">
      
      {/* Animated Gradient Background */}
      <div 
        className="absolute inset-0 z-0 opacity-80"
        style={{
          background: 'linear-gradient(-45deg, #0f172a, #1e293b, #000000, #334155)',
          backgroundSize: '400% 400%',
          animation: 'gradientBG 15s ease infinite',
        }}
      ></div>

      {/* Noise Overlay */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none mix-blend-overlay opacity-30"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
        }}
      ></div>

      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary-container/20 blur-[150px] pointer-events-none z-0"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-secondary/10 blur-[150px] pointer-events-none z-0"></div>
      
      <div className="flex-1 max-w-7xl w-full mx-auto px-6 py-12 flex flex-col z-10">
        
        {/* Header */}
        <div className="flex flex-col items-center text-center space-y-6 mt-8 mb-20 animate-fade-in-up">
          <img 
              src="https://raw.githubusercontent.com/fabiancho0724/VAFI-Reporte-Financiero/7601e17bbde30e0381cc947ff62d9345b0ec3853/uptc-blanco%20(1).png" 
              alt="UPTC Logo" 
              className="w-40 object-contain opacity-90 drop-shadow-2xl"
          />
          <div>
            <h1 className="text-4xl md:text-6xl font-display font-bold tracking-tight text-white mb-4 drop-shadow-lg">
              Consolidado y Proyección <span className="text-primary-container">Financiera</span>
            </h1>
            <p className="text-lg md:text-xl text-on-surface-variant max-w-3xl mx-auto font-light leading-relaxed drop-shadow-lg text-white/90">
              Plataforma integral para el análisis, seguimiento predictivo y visualización 
              de datos presupuestales de la Universidad Pedagógica y Tecnológica de Colombia.
            </p>
          </div>
          
          <button 
            onClick={() => onNavigate('dashboard')}
            className="mt-6 px-10 py-4 bg-primary-container text-on-primary-container rounded-full font-bold text-lg flex items-center justify-center gap-3 hover:scale-105 hover:bg-[#e6b825] hover:shadow-[0_0_30px_rgba(255,204,41,0.4)] transition-all duration-300"
          >
            Ingresar al Tablero
            <ArrowRight size={20} />
          </button>
        </div>

        {/* Modules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-fade-in-up animation-delay-300">
           {MODULES.map((mod, idx) => (
             <div 
               key={mod.id}
               onClick={() => onNavigate(mod.id)}
               className="group relative backdrop-blur-md bg-white/5 border border-white/10 p-6 rounded-[24px] cursor-pointer overflow-hidden transition-all duration-300 hover:bg-white/10 hover:border-primary-container/50 hover:-translate-y-2 hover:shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
             >
                <div className="absolute top-0 left-0 w-1 p-0 h-0 bg-primary-container transition-all duration-300 group-hover:h-full"></div>
                
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-primary-container/10 rounded-2xl text-primary-container group-hover:scale-110 group-hover:bg-primary-container group-hover:text-black transition-all">
                    <mod.icon size={24} />
                  </div>
                  <ArrowRight size={20} className="text-white/20 group-hover:text-primary-container -translate-x-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                </div>
                
                <h3 className="text-xl font-bold text-white mb-2">{mod.title}</h3>
                <p className="text-sm text-on-surface-variant font-light group-hover:text-white/90 transition-colors">
                  {mod.desc}
                </p>
             </div>
           ))}
        </div>

        <footer className="mt-20 text-center text-[#94a3b8] font-mono text-sm py-4 border-t border-white/10 w-full drop-shadow-md">
            ©Fabián L. Cely – VAFI – Universidad Pedagógica y Tecnológica de Colombia
        </footer>
      </div>

      <style>{`
        @keyframes gradientBG {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </div>
  );
}
