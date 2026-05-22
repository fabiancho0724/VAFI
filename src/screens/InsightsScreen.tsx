import { AlertTriangle, TrendingUp, Target, Plus, Download, LineChart as LineChartIcon } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { name: 'Mayo', ejecutado: 120, proyectado: 120, ideal: 100 },
  { name: 'Junio', ejecutado: 135, proyectado: 130, ideal: 110 },
  { name: 'Julio', ejecutado: null, proyectado: 145, ideal: 120 },
  { name: 'Agosto', ejecutado: null, proyectado: 130, ideal: 130 },
  { name: 'Septiembre', ejecutado: null, proyectado: 160, ideal: 140 },
  { name: 'Octubre', ejecutado: null, proyectado: 155, ideal: 150 },
];

export function InsightsScreen({ onNavigate }: { onNavigate: (s: string) => void }) {
  return (
    <div className="flex flex-col mb-20 max-w-7xl mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <p className="text-primary-container text-xs uppercase tracking-widest font-bold mb-1">UPTC - INTELIGENCIA FINANCIERA</p>
          <div className="flex items-center gap-4">
            <h2 className="text-3xl font-bold font-display text-white">Análisis Predictivo e Insights</h2>
            <div className="px-3 py-1 bg-white/10 rounded-full border border-white/10 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary-container"></div>
              <span className="text-[10px] font-mono text-on-surface-variant">Actualizado: hace 2h</span>
            </div>
          </div>
          <p className="text-on-surface-variant mt-2 text-sm max-w-2xl">
            Proyecciones basadas en modelos de Machine Learning entrenados con datos históricos de los últimos 5 años de la universidad.
          </p>
        </div>
        <div className="flex gap-3">
          <button className="bg-surface-container-high/50 text-white border border-white/10 px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-surface-container-highest transition-all text-sm">
            <Download size={16} />
            Exportar Datos
          </button>
          <button className="bg-primary-container text-on-primary-container px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:brightness-110 shadow-[0_4px_15px_rgba(255,204,41,0.2)] transition-all text-sm">
            <Plus size={16} />
            Nuevo Modelo
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="glass-card rounded-[24px] p-6 border-l-4 border-l-[#ff5b5b]">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-[#ff5b5b]/10 rounded-lg text-[#ff5b5b]">
              <AlertTriangle size={20} />
            </div>
            <h4 className="text-sm font-bold text-white">Riesgo de Déficit Q3</h4>
          </div>
          <div className="flex items-end gap-2 mb-2">
            <span className="text-3xl font-display font-bold text-[#ff5b5b]">Moderado</span>
            <span className="text-white font-mono opacity-80">(15%)</span>
          </div>
          <p className="text-xs text-on-surface-variant">Alta probabilidad en rubros de funcionamiento por inflación.</p>
        </div>

        <div className="glass-card rounded-[24px] p-6 border-l-4 border-l-secondary glow-primary">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-secondary/10 rounded-lg text-secondary">
              <TrendingUp size={20} />
            </div>
            <h4 className="text-sm font-bold text-white">Oportunidad de Ahorro</h4>
          </div>
          <div className="flex items-end gap-2 mb-2">
            <span className="text-3xl font-display font-bold text-secondary">+$2.5M</span>
            <span className="text-white font-mono opacity-80">(Funcionamiento)</span>
          </div>
          <p className="text-xs text-on-surface-variant">Detectada en optimización de contratos de servicios TIC.</p>
        </div>

        <div className="glass-card rounded-[24px] p-6 border-l-4 border-l-primary-container">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary-container/10 rounded-lg text-primary-container">
              <Target size={20} />
            </div>
            <h4 className="text-sm font-bold text-white">Proyección de Recaudo</h4>
          </div>
          <div className="flex items-end gap-2 mb-2">
            <span className="text-3xl font-display font-bold text-primary-container">95%</span>
            <span className="text-white font-mono opacity-80">(Cierre 2024)</span>
          </div>
          <p className="text-xs text-on-surface-variant">Tendencia positiva en matrículas de posgrado y extensión.</p>
        </div>
      </div>

      <div className="glass-card rounded-[32px] p-1 flex items-center gap-1 w-max mb-8 border border-white/10 bg-black/20">
        <button className="px-6 py-2 rounded-[28px] bg-white/10 text-white text-sm font-bold shadow-sm">Proyecciones a Corto Plazo</button>
        <button className="px-6 py-2 rounded-[28px] text-on-surface-variant hover:text-white hover:bg-white/5 text-sm font-medium transition-all">Proyecciones a Largo Plazo</button>
      </div>

      <div className="glass-card rounded-[32px] p-8 min-h-[500px] flex flex-col">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h3 className="text-xl font-display font-medium text-white mb-2 flex items-center gap-2">
              <LineChartIcon className="text-primary-container" size={20} />
              Flujo de Caja Proyectado (Próximos 6 Meses)
            </h3>
            <p className="text-sm text-on-surface-variant max-w-xl">
              Comparación de ejecución real vs modelo predictivo vs escenario ideal presupuestado.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-primary-container"></span> Ejecutado</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-secondary opacity-50 border border-secondary border-dashed"></span> Proyectado (ML)</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-white/20"></span> Ideal</div>
          </div>
        </div>
        
        <div className="flex-1 w-full h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorEjecutado" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ffcc29" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#ffcc29" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorProyectado" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7bd0ff" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#7bd0ff" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="name" stroke="currentColor" className="text-xs text-on-surface-variant font-mono" tick={{fill: '#94a3b8'}} tickLine={false} axisLine={false} dy={10} />
              <YAxis stroke="currentColor" className="text-xs text-on-surface-variant font-mono" tick={{fill: '#94a3b8'}} tickLine={false} axisLine={false} dx={-10} tickFormatter={(value) => `$${value}M`} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'rgba(15,23,42,0.9)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                itemStyle={{ color: '#fff', fontSize: '12px', fontFamily: 'monospace' }}
              />
              <Area type="monotone" dataKey="ideal" stroke="rgba(255,255,255,0.2)" strokeWidth={2} fill="transparent" strokeDasharray="5 5" />
              <Area type="monotone" dataKey="proyectado" stroke="#7bd0ff" strokeWidth={3} fill="url(#colorProyectado)" strokeDasharray="5 5" />
              <Area type="monotone" dataKey="ejecutado" stroke="#ffcc29" strokeWidth={3} fill="url(#colorEjecutado)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
