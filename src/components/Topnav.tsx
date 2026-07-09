import { cn } from '../lib/utils';
import { Search, HelpCircle, BellRing, User } from 'lucide-react';

interface TopnavProps {
  isThin: boolean;
  currentScreen: string;
  onNavigate: (s: string) => void;
}

export function Topnav({ isThin, currentScreen, onNavigate }: TopnavProps) {
  const getScreenTitle = (screen: string) => {
    switch (screen) {
      case 'dashboard': return 'Tablero Principal de Indicadores';
      case 'historical': return 'Historial y Tendencias de Ingresos';
      case 'nomina': return 'Gestión y Análisis de Nómina';
      case 'posgrados': return 'Análisis de Programas de Posgrados';
      case 'predictive': return 'Proyección Financiera y Planeación';
      case 'budget': return 'Alertas de Ejecución Presupuestal';
      case 'reports': return 'Generador de Reportes y Exportes';
      case 'repository': return 'Repositorio de Bases de Datos';
      case 'assistant': return 'Asistente de Inteligencia Artificial';
      case 'settings': return 'Configuración de Parámetros';
      default: return 'Consolidado Financiero UPTC';
    }
  };

  return (
    <header className={cn(
      'fixed top-0 right-0 h-16 bg-[#070c19]/80 backdrop-blur-md flex justify-between items-center px-6 md:px-8 z-30 transition-all duration-300 border-b border-white/5',
      isThin ? 'left-20' : 'left-64'
    )}>
      <div className="flex items-center gap-6 flex-1">
        <h1 className="text-sm font-bold text-white font-display tracking-wide uppercase">{getScreenTitle(currentScreen)}</h1>
        
        {/* Modern Search bar */}
        <div className="relative hidden md:block w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant w-3.5 h-3.5" />
          <input 
            type="text" 
            placeholder="Buscar filtros o rubros..." 
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-1.5 text-xs focus:outline-none focus:border-[#ffcc29]/50 transition-colors text-white"
          />
        </div>
      </div>

      {/* Header Utilities */}
      <div className="flex items-center gap-4 text-on-surface-variant">
        <button className="p-1.5 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer" title="Alertas de ejecución">
          <BellRing size={16} />
        </button>
        <button className="p-1.5 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer" title="Ayuda y documentación">
          <HelpCircle size={16} />
        </button>
        <div className="w-[1px] h-4 bg-white/10 mx-1"></div>
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 py-1 px-2.5 rounded-xl">
          <div className="w-5 h-5 rounded-full bg-[#ffcc29] flex items-center justify-center text-black font-extrabold text-[10px]">
            <User size={10} />
          </div>
          <span className="text-[10px] font-mono text-white font-bold hidden sm:inline">Admin VAFI</span>
        </div>
      </div>
    </header>
  );
}
