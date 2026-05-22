import { cn } from '../lib/utils';
import { Search, Bell, HelpCircle } from 'lucide-react';

interface TopnavProps {
  isThin: boolean;
  currentScreen: string;
  onNavigate: (s: string) => void;
}

export function Topnav({ isThin, currentScreen, onNavigate }: TopnavProps) {
  return (
    <header className={cn(
      'fixed top-0 right-0 h-16 bg-background/80 backdrop-blur-md flex justify-between items-center px-6 md:px-8 z-30 transition-all duration-300',
      isThin ? 'left-20' : 'left-64'
    )}>
      <div className="flex items-center gap-6 flex-1">
        {isThin && (
          <h1 className="text-xl font-bold text-on-surface">Consolidado Financiero</h1>
        )}
        <div className={cn("relative hidden md:block", isThin ? 'w-64' : 'w-96')}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant w-4 h-4" />
          <input 
            type="text" 
            placeholder="Buscar..." 
            className="w-full bg-white/5 border border-white/10 rounded-full pl-10 pr-4 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-container text-on-surface"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        {isThin && (
          <nav className="hidden lg:flex gap-6 mr-4">
            <button onClick={() => onNavigate('dashboard')} className={`pb-1 text-sm font-medium ${currentScreen === 'dashboard' ? 'text-primary-container border-b-2 border-primary-container' : 'text-on-surface-variant hover:text-primary-container transition-all'}`}>Resumen</button>
            <button onClick={() => onNavigate('historical')} className={`pb-1 text-sm font-medium ${currentScreen === 'historical' ? 'text-primary-container border-b-2 border-primary-container' : 'text-on-surface-variant hover:text-primary-container transition-all'}`}>Histórico</button>
            <button onClick={() => onNavigate('reports')} className={`pb-1 text-sm font-medium ${currentScreen === 'reports' ? 'text-primary-container border-b-2 border-primary-container' : 'text-on-surface-variant hover:text-primary-container transition-all'}`}>Reportes</button>
          </nav>
        )}
        <div className="flex items-center gap-3 border-l border-white/10 pl-4 md:pl-6">
          <button className="p-2 -mr-2 rounded-full hover:bg-white/10 text-on-surface-variant relative transition-colors">
            <Bell size={20} />
            <span className="absolute top-1.5 right-2 w-2 h-2 bg-primary-container rounded-full ring-2 ring-background"></span>
          </button>
          <button className="p-2 rounded-full hover:bg-white/10 text-on-surface-variant transition-colors">
            <HelpCircle size={20} />
          </button>
          <div className="w-8 h-8 rounded-full overflow-hidden border border-primary-container/30 ml-2">
            <img 
              src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=150&auto=format&fit=crop" 
              alt="Profile" 
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
    </header>
  );
}
