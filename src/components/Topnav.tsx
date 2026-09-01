import { useState, useEffect } from 'react';
import { cn } from '../lib/utils';
import { Search, Calendar, Upload } from 'lucide-react';

interface TopnavProps {
  isThin: boolean;
  currentScreen: string;
  onNavigate: (s: string) => void;
}

export function Topnav({ isThin, currentScreen, onNavigate }: TopnavProps) {
  const [fechaCorte, setFechaCorte] = useState<string>(() => localStorage.getItem('vafi_fechaCorte') || '31 de Agosto de 2026');

  useEffect(() => {
    const updateFecha = () => {
      const saved = localStorage.getItem('vafi_fechaCorte');
      if (saved) setFechaCorte(saved);
    };

    updateFecha();
    window.addEventListener('storage', updateFecha);
    return () => window.removeEventListener('storage', updateFecha);
  }, []);

  return (
    <header className={cn(
      'fixed top-0 right-0 h-16 bg-background/80 backdrop-blur-md flex justify-between items-center px-6 md:px-8 z-30 transition-all duration-300 print:hidden border-b border-white/10',
      isThin ? 'left-20' : 'left-64'
    )}>
      <div className="flex items-center gap-6 flex-1">
        {isThin && (
          <h1 className="text-lg font-bold text-on-surface font-display">VAFI UPTC</h1>
        )}
        
        {/* Visible Official Cutoff Date Badge */}
        <div 
          onClick={() => onNavigate('settings')}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#4ade80]/10 border border-[#4ade80]/30 hover:bg-[#4ade80]/20 transition-all cursor-pointer shadow-sm group"
          title="Haga clic para cambiar la Fecha de Corte en Configuración"
        >
          <Calendar size={15} className="text-[#4ade80] group-hover:scale-110 transition-transform" />
          <span className="text-[10px] font-mono text-white/70 uppercase tracking-wider font-bold">Fecha de Corte:</span>
          <span className="text-xs font-mono font-bold text-[#4ade80]">{fechaCorte}</span>
        </div>

        <div className={cn("relative hidden lg:block", isThin ? 'w-64' : 'w-80')}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant w-4 h-4" />
          <input 
            type="text" 
            placeholder="Buscar en el sistema..." 
            className="w-full bg-white/5 border border-white/10 rounded-full pl-10 pr-4 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#4ade80] text-on-surface"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button 
          onClick={() => onNavigate('settings')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-white transition-all"
        >
          <Upload size={13} className="text-[#38bdf8]" />
          <span className="hidden sm:inline">Cargar Datos</span>
        </button>
      </div>
    </header>
  );
}
