import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Topnav } from './Topnav';

interface LayoutProps {
  children: ReactNode;
  currentScreen: string;
  onNavigate: (screen: string) => void;
}

export function Layout({ children, currentScreen, onNavigate }: LayoutProps) {
  return (
    <div className="flex bg-background min-h-screen">
      <Sidebar currentScreen={currentScreen} onNavigate={onNavigate} />
      <div className={`flex-1 flex flex-col transition-all duration-300 pl-20`}>
        <Topnav isThin={true} currentScreen={currentScreen} onNavigate={onNavigate} />
        <main className="flex-1 mt-16 p-6 md:p-8 flex flex-col">
          <div className="flex-1">
            {children}
          </div>
          <footer className="mt-8 text-center text-[#94a3b8] font-mono text-sm py-4 border-t border-white/10">
            ©Fabián L. Cely – VAFI – Universidad Pedagógica y Tecnológica de Colombia
          </footer>
        </main>
      </div>
    </div>
  );
}
