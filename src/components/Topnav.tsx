import { cn } from '../lib/utils';
import { Search } from 'lucide-react';

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
    </header>
  );
}
