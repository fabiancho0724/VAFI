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
  Bot,
  Layers
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
        'w-12 h-12 flex items-center justify-center rounded-xl transition-all',
        isActive ? 'bg-primary-container text-on-primary-container shadow-[0_0_15px_rgba(255,204,41,0.3)]' : 'text-on-surface-variant hover:text-primary-container'
      );
    }
    return cn(
      'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200',
      isActive
        ? 'bg-primary-container text-on-primary-container font-bold shadow-[0_0_15px_rgba(255,204,41,0.3)]'
        : 'text-on-surface-variant hover:text-primary-container hover:bg-white/5 font-medium'
    );
  };

  const IconWrapper = ({ icon: Icon, screen }: { icon: any, screen: string }) => (
    <button onClick={() => onNavigate(screen)} className={getNavClasses(screen)}>
      <Icon size={isThin ? 24 : 20} strokeWidth={currentScreen === screen ? 2.5 : 2} />
      {!isThin && <span className="text-sm">
        {screen === 'dashboard' ? 'Tablero' :
         screen === 'historical' ? 'Histórico' :
         screen === 'nomina' ? 'Nómina' :
         screen === 'posgrados' ? 'Posgrados' :
         screen === 'predictive' ? 'Proyección Financiera' :
         screen === 'multiyear' ? 'Multivigencia' :
         screen === 'budget' ? 'Alertas' :
         screen === 'reports' ? 'Reportes' :
         screen === 'repository' ? 'Repositorio' :
         screen === 'assistant' ? 'Asistente IA' :
         'Configuración'}
      </span>}
    </button>
  );

  return (
    <aside
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        'fixed left-0 top-0 h-full flex flex-col z-40 bg-surface-container-low/50 backdrop-blur-xl border-r border-white/5 transition-all duration-300',
        isThin ? 'w-20 items-center py-4' : 'w-64 p-4'
      )}
    >
      <div className={cn('mb-10', isThin ? 'mt-0' : 'mt-4 px-2 flex items-center gap-3')} onClick={() => onNavigate('cover')}>
        {isThin ? (
           <img src="https://raw.githubusercontent.com/fabiancho0724/VAFI-Reporte-Financiero/7601e17bbde30e0381cc947ff62d9345b0ec3853/uptc-blanco%20(1).png" alt="UPTC Logo" className="w-10 h-10 object-contain mx-auto cursor-pointer hover:scale-110 transition-transform" />
        ) : (
          <>
            <img src="https://raw.githubusercontent.com/fabiancho0724/VAFI-Reporte-Financiero/7601e17bbde30e0381cc947ff62d9345b0ec3853/uptc-blanco%20(1).png" alt="UPTC Logo" className="w-10 object-contain cursor-pointer hover:scale-110 transition-transform" />
            <div className="cursor-pointer">
              <h1 className="font-headline-lg text-lg text-primary-container leading-none">UPTC</h1>
              <p className="font-label-sm text-[10px] uppercase tracking-widest text-on-surface-variant opacity-70">Admin Financiero</p>
            </div>
          </>
        )}
      </div>

      <nav className={cn('flex flex-col', isThin ? 'gap-8 flex-1' : 'gap-1 px-2 flex-1')}>
        <IconWrapper icon={LayoutDashboard} screen="dashboard" />
        <IconWrapper icon={LineChart} screen="historical" />
        <IconWrapper icon={Users} screen="nomina" />
        <IconWrapper icon={GraduationCap} screen="posgrados" />
        <IconWrapper icon={BarChart3} screen="predictive" />
        <IconWrapper icon={Layers} screen="multiyear" />
        <IconWrapper icon={Wallet} screen="budget" />
        <IconWrapper icon={FileText} screen="reports" />
        <IconWrapper icon={FolderOpen} screen="repository" />
        <IconWrapper icon={Bot} screen="assistant" />
      </nav>
    </aside>
  );
}
