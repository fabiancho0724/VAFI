import { Calendar as CalendarIcon, Clock, AlertCircle, ChevronLeft, ChevronRight, FileText } from 'lucide-react';

export function CalendarScreen({ onNavigate }: { onNavigate: (s: string) => void }) {
  return (
    <div className="flex flex-col mb-20 max-w-7xl mx-auto">
      <div className="mb-8">
        <p className="text-secondary text-xs uppercase tracking-widest font-bold mb-1">UPTC - CRONOGRAMA</p>
        <h2 className="text-3xl font-bold font-display text-white mb-2">Calendario Fiscal y Planeación</h2>
        <p className="text-on-surface-variant text-sm max-w-2xl">
          Cronograma de eventos presupuestales, cierres financieros y vencimientos de obligaciones.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 glass-card rounded-[32px] p-8 min-h-[600px]">
          <div className="flex justify-between items-center mb-8">
             <div className="flex items-center gap-4">
                <h3 className="text-2xl font-bold text-white">Mayo 2024</h3>
                <div className="flex gap-2">
                   <button className="p-2 hover:bg-white/10 rounded-lg text-on-surface-variant transition-colors"><ChevronLeft size={20} /></button>
                   <button className="p-2 hover:bg-white/10 rounded-lg text-on-surface-variant transition-colors"><ChevronRight size={20} /></button>
                </div>
             </div>
             <div className="flex gap-2">
                <button className="text-xs font-bold px-4 py-2 bg-white/10 text-white rounded-lg">Mes</button>
                <button className="text-xs font-bold px-4 py-2 text-on-surface-variant hover:bg-white/5 hover:text-white rounded-lg transition-colors">Semana</button>
             </div>
          </div>

          <div className="grid grid-cols-7 gap-px bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
             {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => (
               <div key={day} className="bg-[rgba(30,41,59,0.8)] p-3 text-center text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                 {day}
               </div>
             ))}
             {Array.from({ length: 35 }).map((_, i) => {
               const day = i - 1; // offset for May 2024 roughly
               const isCurrentMonth = day > 0 && day <= 31;
               const isToday = day === 19;
               const hasEvent = day === 5 || day === 15 || day === 28 || day === 30;
               return (
                 <div key={i} className={`bg-[rgba(30,41,59,0.4)] aspect-square p-2 border-t border-white/5 ${!isCurrentMonth ? 'opacity-30' : ''} ${isToday ? 'bg-primary-container/10' : 'hover:bg-white/5 transition-colors'} relative`}>
                    <span className={`text-sm font-mono ${isToday ? 'text-primary-container font-bold' : 'text-on-surface-variant'}`}>{isCurrentMonth ? day : ''}</span>
                    {hasEvent && (
                      <div className="absolute top-2 right-2 flex gap-1">
                        <div className={`w-2 h-2 rounded-full ${day === 30 ? 'bg-[#ff5b5b]' : 'bg-secondary'}`}></div>
                      </div>
                    )}
                 </div>
               )
             })}
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-card rounded-[32px] p-8">
            <h3 className="text-xl font-display font-medium text-white mb-6 flex items-center gap-2">
              <CalendarIcon className="text-primary-container" />
              Próximos Eventos
            </h3>
            
            <div className="space-y-4">
               <div className="p-4 bg-white/5 rounded-2xl border-l-4 border-l-[#ff5b5b]">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-white text-sm">Cierre Financiero Mensual</h4>
                    <span className="text-xs font-mono font-bold text-[#ff5b5b] bg-[#ff5b5b]/10 px-2 py-0.5 rounded">30 May</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                    <Clock size={12} /> 23:59
                    <span className="w-1 h-1 rounded-full bg-on-surface-variant"></span>
                    Vicerrectoría Administrativa
                  </div>
               </div>

               <div className="p-4 bg-white/5 rounded-2xl border-l-4 border-l-secondary">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-white text-sm">Comité Presupuestal</h4>
                    <span className="text-xs font-mono font-bold text-secondary bg-secondary/10 px-2 py-0.5 rounded">28 May</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                    <Clock size={12} /> 08:00 - 10:00
                    <span className="w-1 h-1 rounded-full bg-on-surface-variant"></span>
                    Sala de Juntas
                  </div>
               </div>

               <div className="p-4 bg-white/5 rounded-2xl border-l-4 border-l-primary-container">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-white text-sm">Reporte SIAF (Consolidado)</h4>
                    <span className="text-xs font-mono font-bold text-primary-container bg-primary-container/10 px-2 py-0.5 rounded">15 Jun</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                    <FileText size={12} /> Requiere firmas digitales
                  </div>
               </div>
            </div>
          </div>

          <div className="glass-card rounded-[32px] p-6 bg-secondary/10 border border-secondary/20 flex gap-4">
             <AlertCircle className="text-secondary shrink-0" size={24} />
             <div>
               <h4 className="text-sm font-bold text-white mb-1">Recordatorio de Cierre</h4>
               <p className="text-xs text-on-surface-variant mb-3">Faltan 11 días para el cierre fiscal de mes. Asegúrese de liquidar CDP temporales.</p>
               <button className="text-xs font-bold text-secondary hover:text-white transition-colors">Generar Alerta Automática &rarr;</button>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
