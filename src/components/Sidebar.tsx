import { useState } from 'react';
import { cn } from '../lib/utils';
import {
  LayoutDashboard,
  LineChart,
  BarChart3,
  Wallet,
  FileText,
  Settings,
  FolderOpen,
  Users,
  GraduationCap,
  Bot
} from 'lucide-react';

interface SidebarProps {
  currentScreen: string;
  onNavigate: (s: string) => void;
}

export function Sidebar({ currentScreen, onNavigate }: SidebarProps) {
  const [isHovered, setIsHovered] = useState(false);
  const isThin = !isHovered;

  const getNavClasses = (screen: string) => {
    const isActive = currentScreen === screen;
    if (isThin) {
      return cn(
        'w-11 h-11 flex items-center justify-center rounded-xl transition-all duration-200 cursor-pointer',
        isActive 
          ? 'bg-[#ffcc29] text-black shadow-[0_0_15px_rgba(255,204,41,0.25)] font-bold scale-105' 
          : 'text-on-surface-variant hover:text-white hover:bg-white/5'
      );
    }
    return cn(
      'flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 cursor-pointer w-full text-left',
      isActive
        ? 'bg-[#ffcc29] text-black font-extrabold shadow-[0_0_15px_rgba(255,204,41,0.25)] scale-[1.02]'
        : 'text-on-surface-variant hover:text-white hover:bg-white/5 font-medium'
    );
  };

  const menuItems = [
    { screen: 'dashboard', label: 'Tablero Principal', icon: LayoutDashboard },
    { screen: 'historical', label: 'Historial', icon: LineChart },
    { screen: 'nomina', label: 'Gestión Nómina', icon: Users },
    { screen: 'posgrados', label: 'Posgrados', icon: GraduationCap },
    { screen: 'predictive', label: 'Proyección Financiera', icon: BarChart3 },
    { screen: 'budget', label: 'Alertas', icon: Wallet },
    { screen: 'reports', label: 'Reportes', icon: FileText },
    { screen: 'repository', label: 'Repositorio', icon: FolderOpen },
    { screen: 'assistant', label: 'Asistente IA', icon: Bot },
  ];

  return (
    <aside
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        'fixed left-0 top-0 h-full flex flex-col z-40 bg-[#0a0f1d]/90 backdrop-blur-2xl border-r border-white/5 transition-all duration-300 shadow-2xl',
        isThin ? 'w-20 items-center py-6' : 'w-64 p-5'
      )}
    >
      {/* Brand Header */}
      <div 
        className={cn('mb-8 cursor-pointer transition-all duration-300', isThin ? 'mt-0' : 'mt-2 px-2.5 flex items-center gap-3')} 
        onClick={() => onNavigate('cover')}
      >
        {isThin ? (
          <img 
            src="https://raw.githubusercontent.com/fabiancho0724/VAFI-Reporte-Financiero/7601e17bbde30e0381cc947ff62d9345b0ec3853/uptc-blanco%20(1).png" 
            alt="UPTC" 
            className="w-10 h-10 object-contain mx-auto hover:scale-115 transition-transform" 
          />
        ) : (
          <>
            <img 
              src="https://raw.githubusercontent.com/fabiancho0724/VAFI-Reporte-Financiero/7601e17bbde30e0381cc947ff62d9345b0ec3853/uptc-blanco%20(1).png" 
              alt="UPTC" 
              className="w-9 object-contain hover:scale-110 transition-transform" 
            />
            <div>
              <h1 className="font-display font-extrabold text-base text-white tracking-wide leading-none">UPTC VAFI</h1>
              <p className="text-[9px] uppercase tracking-widest text-[#ffcc29] font-mono mt-0.5 font-bold">BI Enterprise</p>
            </div>
          </>
        )}
      </div>

      {/* Navigation Items */}
      <nav className={cn('flex flex-col w-full flex-1', isThin ? 'gap-6 items-center' : 'gap-1.5')}>
        {menuItems.map((item) => (
          <button 
            key={item.screen} 
            onClick={() => onNavigate(item.screen)} 
            className={getNavClasses(item.screen)}
          >
            <item.icon size={isThin ? 22 : 18} strokeWidth={currentScreen === item.screen ? 2.5 : 2} className="shrink-0" />
            {!isThin && <span className="text-xs tracking-wide">{item.label}</span>}
          </button>
        ))}
      </nav>

      {/* Footer / Setting button at the bottom */}
      <div className="w-full border-t border-white/5 pt-4 flex flex-col gap-2 items-center">
        <button 
          onClick={() => onNavigate('settings')} 
          className={getNavClasses('settings')}
        >
          <Settings size={isThin ? 22 : 18} strokeWidth={currentScreen === 'settings' ? 2.5 : 2} className="shrink-0" />
          {!isThin && <span className="text-xs tracking-wide">Configuración</span>}
        </button>
      </div>
    </aside>
  );
}
