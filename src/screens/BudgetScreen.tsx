import { BellRing, Bell, BellOff, Plus, FileText, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';

export function BudgetScreen({ onNavigate }: { onNavigate: (s: string) => void }) {
  return (
    <div className="flex flex-col mb-20 max-w-7xl mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <p className="text-secondary text-xs uppercase tracking-widest font-bold mb-1">UPTC - PLANEACIÓN ESTRATÉGICA</p>
          <div className="flex items-center gap-4">
            <h2 className="text-3xl font-bold font-display text-white">Configuración de Alertas y Planeación</h2>
          </div>
          <p className="text-on-surface-variant mt-2 text-sm max-w-2xl">
            Centro de notificaciones y gestión proactiva de riesgos presupuestales. Define umbrales y acciones.
          </p>
        </div>
        <div className="flex gap-3">
          <button className="bg-secondary text-on-primary-container px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:brightness-110 shadow-[0_4px_15px_rgba(123,208,255,0.2)] transition-all text-sm">
            <Plus size={16} />
            Crear Nueva Alerta
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
        <div className="xl:col-span-2 glass-card rounded-[32px] p-8 flex flex-col min-h-[500px]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-display font-medium text-white flex items-center gap-2">
              <BellRing className="text-secondary" size={20} />
              Alertas Activas
            </h3>
            <div className="flex gap-2">
              <button className="text-xs font-mono font-medium px-4 py-1.5 rounded-full bg-secondary/20 text-secondary border border-secondary/30">Todas (12)</button>
              <button className="text-xs font-mono font-medium px-4 py-1.5 rounded-full text-on-surface-variant hover:bg-white/5 transition-colors">Críticas (3)</button>
              <button className="text-xs font-mono font-medium px-4 py-1.5 rounded-full text-on-surface-variant hover:bg-white/5 transition-colors">Advertencias (9)</button>
            </div>
          </div>

          <div className="space-y-4">
            {/* Alert 1 */}
            <div className="bg-white/5 border border-[#ff5b5b]/30 rounded-[24px] p-6 hover:bg-white/10 transition-colors relative overflow-hidden group">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#ff5b5b]"></div>
              <div className="flex justify-between items-start">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#ff5b5b]/10 flex items-center justify-center text-[#ff5b5b] shrink-0 mt-1">
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-mono font-bold text-[#ff5b5b] bg-[#ff5b5b]/10 px-2 py-0.5 rounded uppercase tracking-wider">Crítica</span>
                      <span className="text-[10px] font-mono text-on-surface-variant">Hace 2 horas</span>
                    </div>
                    <h4 className="text-base font-bold text-white mb-1">Sobregiro en Rubro de Funcionamiento</h4>
                    <p className="text-sm text-on-surface-variant max-w-xl">
                      El rubro A-01-02 (Gastos de Personal) ha superado el 95% de su apropiación anual. Se requiere adición presupuestal inmediata para garantizar nómina.
                    </p>
                  </div>
                </div>
                <button className="text-xs font-bold text-white bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg transition-all opacity-0 group-hover:opacity-100 flex items-center gap-2">
                  Gestionar <ArrowRight size={14} />
                </button>
              </div>
            </div>

            {/* Alert 2 */}
            <div className="bg-white/5 border border-primary-container/30 rounded-[24px] p-6 hover:bg-white/10 transition-colors relative overflow-hidden group">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary-container"></div>
              <div className="flex justify-between items-start">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary-container/10 flex items-center justify-center text-primary-container shrink-0 mt-1">
                    <Bell size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-mono font-bold text-primary-container bg-primary-container/10 px-2 py-0.5 rounded uppercase tracking-wider">Advertencia</span>
                      <span className="text-[10px] font-mono text-on-surface-variant">Hace 1 día</span>
                    </div>
                    <h4 className="text-base font-bold text-white mb-1">Desviación en Recaudo Q2</h4>
                    <p className="text-sm text-on-surface-variant max-w-xl">
                      Se detecta una desviación del -8% en el recaudo proyectado para Estampilla Pro-UPTC. Sugerimos revisar proyecciones de flujo de caja libre.
                    </p>
                  </div>
                </div>
                <button className="text-xs font-bold text-white bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg transition-all opacity-0 group-hover:opacity-100 flex items-center gap-2">
                  Revisar Datos <ArrowRight size={14} />
                </button>
              </div>
            </div>

            {/* Alert 3 */}
            <div className="bg-white/5 border border-white/10 rounded-[24px] p-6 opacity-70">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-white/20"></div>
              <div className="flex justify-between items-start">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/50 shrink-0 mt-1">
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-mono font-bold text-white/50 bg-white/5 px-2 py-0.5 rounded uppercase tracking-wider">Resuelta</span>
                      <span className="text-[10px] font-mono text-on-surface-variant">Hace 3 días</span>
                    </div>
                    <h4 className="text-base font-bold text-white/70 mb-1 line-through decoration-white/20">Alerta Histórica: Déficit Q3</h4>
                    <p className="text-sm text-on-surface-variant/70 max-w-xl">
                      El modelo predictivo generó una alerta temprana de déficit que fue gestionada mediante traslado presupuestal.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="glass-card rounded-[32px] p-8 flex-1">
             <h3 className="text-xl font-display font-medium text-white mb-6">Reglas de Sistema</h3>
             <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl">
                  <div>
                    <h5 className="font-bold text-sm text-white mb-1">Umbral Ejecución</h5>
                    <p className="text-xs text-on-surface-variant font-mono">Alertar al 90%</p>
                  </div>
                  <div className="w-10 h-6 bg-secondary/40 rounded-full relative cursor-pointer">
                    <div className="w-5 h-5 bg-secondary rounded-full absolute right-0.5 top-0.5"></div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl">
                  <div>
                    <h5 className="font-bold text-sm text-white mb-1">Desviación ML</h5>
                    <p className="text-xs text-on-surface-variant font-mono">± 5% del proyectado</p>
                  </div>
                  <div className="w-10 h-6 bg-secondary/40 rounded-full relative cursor-pointer">
                    <div className="w-5 h-5 bg-secondary rounded-full absolute right-0.5 top-0.5"></div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl opacity-50">
                  <div>
                    <h5 className="font-bold text-sm text-white mb-1">Vencimiento CDP</h5>
                    <p className="text-xs text-on-surface-variant font-mono">15 días antes</p>
                  </div>
                  <div className="w-10 h-6 bg-white/10 rounded-full relative cursor-pointer">
                    <div className="w-5 h-5 bg-white/30 rounded-full absolute left-0.5 top-0.5"></div>
                  </div>
                </div>
             </div>
          </div>
          
          <div className="glass-card rounded-[32px] p-8 flex-1 flex flex-col justify-center items-center text-center">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
              <FileText className="text-on-surface-variant" size={24} />
            </div>
            <h4 className="font-bold text-white mb-2">Simulador de Escenarios</h4>
            <p className="text-xs text-on-surface-variant mb-6 px-4">
              Crea escenarios hipotéticos variando inflación, incrementos salariales y aportes de la nación.
            </p>
            <button className="w-full py-3 rounded-xl border border-white/10 text-sm font-bold hover:bg-white/5 transition-colors">
              Abrir Simulador
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
