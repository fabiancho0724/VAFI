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
  GraduationCap
} from 'lucide-react';

interface SidebarProps {
  isThin: boolean;
  currentScreen: string;
  onNavigate: (s: string) => void;
}

export function Sidebar({ isThin, currentScreen, onNavigate }: SidebarProps) {
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
         screen === 'budget' ? 'Presupuesto' :
         screen === 'predictive' ? 'Proyección' :
         screen === 'reports' ? 'Reportes' :
         screen === 'repository' ? 'Repositorio' :
         'Configuración'}
      </span>}
    </button>
  );

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-full flex flex-col z-40 bg-surface-container-low/50 backdrop-blur-xl border-r border-white/5 transition-all duration-300',
        isThin ? 'w-20 items-center py-4' : 'w-64 p-4'
      )}
    >
      <div className={cn('mb-10', isThin ? 'mt-0' : 'mt-4 px-2 flex items-center gap-3')}>
        {isThin ? (
           <img src="https://www.uptc.edu.co/sitio/export/sites/default/portal/sitios/universidad/rectoria/comunicaciones/.content/doc/logos/uptc-blanco.png" alt="UPTC Logo" className="w-10 h-10 object-contain mx-auto" />
        ) : (
          <>
            <img src="https://www.uptc.edu.co/sitio/export/sites/default/portal/sitios/universidad/rectoria/comunicaciones/.content/doc/logos/uptc-blanco.png" alt="UPTC Logo" className="w-10 object-contain" />
            <div>
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
        <IconWrapper icon={Wallet} screen="budget" />
        <IconWrapper icon={FileText} screen="reports" />
        <IconWrapper icon={FolderOpen} screen="repository" />
      </nav>

      <div className={cn('mt-auto', isThin ? 'mb-6 flex justify-center' : 'px-2 pb-4')}>
        {isThin ? (
          <button onClick={() => onNavigate('settings')} className={getNavClasses('settings')}>
            <Settings size={24} />
          </button>
        ) : (
          <>
            <IconWrapper icon={Settings} screen="settings" />
            <button className="w-full mt-4 py-3 bg-primary-container text-on-primary-container rounded-xl font-bold flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all text-sm">
                Nueva Solicitud
            </button>
          </>
        )}
      </div>
    </aside>
  );
}
