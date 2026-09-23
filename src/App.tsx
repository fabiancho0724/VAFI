import React, { Component, ErrorInfo, ReactNode, useState } from 'react';
import { Layout } from './components/Layout';
import { DashboardScreen } from './screens/DashboardScreen';
import { PredictiveScreen } from './screens/PredictiveScreen';
import { HistoricalScreen } from './screens/HistoricalScreen';
import { ProgramCostingScreen } from './screens/ProgramCostingScreen';
import { BudgetScreen } from './screens/BudgetScreen';
import { CalendarScreen } from './screens/CalendarScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { RepositoryScreen } from './screens/RepositoryScreen';
import { ExportReportScreen } from './screens/ExportReportScreen';
import { NominaScreen } from './screens/NominaScreen';
import { PosgradosScreen } from './screens/PosgradosScreen';
import { CoverScreen } from './screens/CoverScreen';
import { AssistantScreen } from './screens/AssistantScreen';
import { CashFlowScreen } from './screens/CashFlowScreen';
import { ExecutiveReportScreen } from './screens/ExecutiveReportScreen';
import { PoaScreen } from './screens/PoaScreen';

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md bg-surface-container-high/90 border border-rose-500/30 rounded-3xl p-8 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto text-xl font-bold">
              ⚠️
            </div>
            <h2 className="text-xl font-bold text-white">Se presentó un error en la vista</h2>
            <p className="text-xs text-on-surface-variant font-mono text-left bg-black/40 p-3 rounded-xl border border-white/10 overflow-x-auto max-h-32">
              {this.state.error?.message || 'Error de renderizado'}
            </p>
            <div className="flex gap-3 justify-center pt-2">
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.reload();
                }}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition-colors cursor-pointer"
              >
                Recargar Aplicación
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('cover');
  
  const handleNavigate = (screen: string) => {
    setCurrentScreen(screen);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (currentScreen === 'cover') {
    return <CoverScreen onNavigate={handleNavigate} />;
  }

  return (
    <ErrorBoundary>
      <Layout currentScreen={currentScreen} onNavigate={handleNavigate}>
        {currentScreen === 'dashboard' && <DashboardScreen onNavigate={handleNavigate} />}
        {currentScreen === 'predictive' && <PredictiveScreen onNavigate={handleNavigate} />}
        {currentScreen === 'cashflow' && <CashFlowScreen onNavigate={handleNavigate} />}
        {currentScreen === 'informe-gerencial' && <ExecutiveReportScreen onNavigate={handleNavigate} />}
        {currentScreen === 'poa' && <PoaScreen onNavigate={handleNavigate} />}
        {currentScreen === 'presupuesto' && <BudgetScreen onNavigate={handleNavigate} />}
        {currentScreen === 'historical' && <HistoricalScreen onNavigate={handleNavigate} />}
        {currentScreen === 'budget' && <ProgramCostingScreen onNavigate={handleNavigate} />}
        {currentScreen === 'calendar' && <CalendarScreen onNavigate={handleNavigate} />}
        {currentScreen === 'settings' && <SettingsScreen onNavigate={handleNavigate} />}
        {currentScreen === 'repository' && <RepositoryScreen onNavigate={handleNavigate} />}
        {currentScreen === 'reports' && <ExportReportScreen onNavigate={handleNavigate} />}
        {currentScreen === 'nomina' && <NominaScreen onNavigate={handleNavigate} />}
        {currentScreen === 'posgrados' && <PosgradosScreen onNavigate={handleNavigate} />}
        {currentScreen === 'assistant' && <AssistantScreen />}
      </Layout>
    </ErrorBoundary>
  );
}
