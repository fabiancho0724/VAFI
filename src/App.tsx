import { useState } from 'react';
import { Layout } from './components/Layout';
import { DashboardScreen } from './screens/DashboardScreen';
import { PredictiveScreen } from './screens/PredictiveScreen';
import { HistoricalScreen } from './screens/HistoricalScreen';
import { BudgetScreen } from './screens/BudgetScreen';
import { CalendarScreen } from './screens/CalendarScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { RepositoryScreen } from './screens/RepositoryScreen';
import { ExportReportScreen } from './screens/ExportReportScreen';
import { NominaScreen } from './screens/NominaScreen';
import { PosgradosScreen } from './screens/PosgradosScreen';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('dashboard');
  
  const handleNavigate = (screen: string) => {
    setCurrentScreen(screen);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Layout currentScreen={currentScreen} onNavigate={handleNavigate}>
      {currentScreen === 'dashboard' && <DashboardScreen onNavigate={handleNavigate} />}
      {currentScreen === 'predictive' && <PredictiveScreen onNavigate={handleNavigate} />}
      {currentScreen === 'historical' && <HistoricalScreen onNavigate={handleNavigate} />}
      {currentScreen === 'budget' && <BudgetScreen onNavigate={handleNavigate} />}
      {currentScreen === 'calendar' && <CalendarScreen onNavigate={handleNavigate} />}
      {currentScreen === 'settings' && <SettingsScreen onNavigate={handleNavigate} />}
      {currentScreen === 'repository' && <RepositoryScreen onNavigate={handleNavigate} />}
      {currentScreen === 'reports' && <ExportReportScreen onNavigate={handleNavigate} />}
      {currentScreen === 'nomina' && <NominaScreen onNavigate={handleNavigate} />}
      {currentScreen === 'posgrados' && <PosgradosScreen onNavigate={handleNavigate} />}
    </Layout>
  );
}
