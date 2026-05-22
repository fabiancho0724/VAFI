import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Topnav } from './Topnav';

interface LayoutProps {
  children: ReactNode;
  currentScreen: string;
  onNavigate: (screen: string) => void;
}

export function Layout({ children, currentScreen, onNavigate }: LayoutProps) {
  const isThin = currentScreen === 'dashboard';
  
  return (
    <div className="flex bg-background min-h-screen">
      <Sidebar isThin={isThin} currentScreen={currentScreen} onNavigate={onNavigate} />
      <div className={`flex-1 flex flex-col transition-all duration-300 ${isThin ? 'pl-20' : 'pl-64'}`}>
        <Topnav isThin={isThin} currentScreen={currentScreen} onNavigate={onNavigate} />
        <main className="flex-1 mt-16 p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
