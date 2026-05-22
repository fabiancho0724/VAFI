import { User, Shield, Bell, Network, ShieldCheck, Key, Save } from 'lucide-react';

export function SettingsScreen({ onNavigate }: { onNavigate: (s: string) => void }) {
  return (
    <div className="flex flex-col mb-20 max-w-5xl mx-auto">
      <div className="mb-8">
        <p className="text-primary-container text-xs uppercase tracking-widest font-bold mb-1">UPTC - PLATAFORMA</p>
        <h2 className="text-3xl font-bold font-display text-white mb-2">Configuración del Sistema</h2>
        <p className="text-on-surface-variant text-sm">Gestiona tus preferencias, accesos e integraciones con sistemas externos.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="md:col-span-1 border-r border-white/10 pr-6">
          <nav className="flex flex-col gap-2">
            <button className="flex items-center gap-3 px-4 py-3 rounded-lg bg-white/10 text-white font-bold transition-all">
              <User size={18} /> Perfil
            </button>
            <button className="flex items-center gap-3 px-4 py-3 rounded-lg text-on-surface-variant hover:bg-white/5 hover:text-white transition-all font-medium">
              <Shield size={18} /> Seguridad
            </button>
            <button className="flex items-center gap-3 px-4 py-3 rounded-lg text-on-surface-variant hover:bg-white/5 hover:text-white transition-all font-medium">
              <Bell size={18} /> Alertas
            </button>
            <button className="flex items-center gap-3 px-4 py-3 rounded-lg text-on-surface-variant hover:bg-white/5 hover:text-white transition-all font-medium">
              <Network size={18} /> API & Integraciones
            </button>
          </nav>
        </div>

        <div className="md:col-span-3 space-y-8">
          <div className="glass-card rounded-[32px] p-8">
            <h3 className="text-xl font-display font-medium text-white mb-6 flex items-center gap-2">
              <User className="text-primary-container" />
              Perfil de Usuario
            </h3>
            
            <div className="flex items-center gap-6 mb-8">
              <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-primary-container/30">
                <img 
                  src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=200&auto=format&fit=crop" 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <button className="px-4 py-2 border border-white/10 rounded-lg text-sm font-bold text-white mb-2 hover:bg-white/5">Cambiar Foto</button>
                <p className="text-xs text-on-surface-variant font-mono">JPG, GIF o PNG. Tamaño máx. de 800K</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Nombre Completo</label>
                <input type="text" defaultValue="Carlos Rodríguez V." className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary-container/50" />
              </div>
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Cargo</label>
                <input type="text" defaultValue="Director Financiero (VAFI)" disabled className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-on-surface-variant cursor-not-allowed" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Correo Institucional</label>
                <input type="email" defaultValue="carlos.rodriguez@uptc.edu.co" disabled className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-on-surface-variant cursor-not-allowed" />
              </div>
            </div>
            
            <div className="mt-8 flex justify-end">
              <button className="bg-primary-container text-on-primary-container px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:brightness-110 shadow-[0_4px_15px_rgba(255,204,41,0.2)]">
                <Save size={18} /> Guardar Cambios
              </button>
            </div>
          </div>

          <div className="glass-card rounded-[32px] p-8">
            <h3 className="text-xl font-display font-medium text-white mb-6 flex items-center gap-2">
              <Network className="text-secondary" />
              Integraciones Internas
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center font-bold text-xl text-white">S</div>
                  <div>
                    <h5 className="font-bold text-white mb-1">SIAF - Sistema de Información Financiera</h5>
                    <p className="text-xs text-on-surface-variant font-mono">Sincronización en tiempo real activa.</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-secondary text-sm font-bold bg-secondary/10 px-3 py-1.5 rounded-lg border border-secondary/20">
                  <ShieldCheck size={16} /> Conectado
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 opacity-70">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center font-bold text-xl text-white">S</div>
                  <div>
                    <h5 className="font-bold text-white mb-1">SIU - Sistema de Información Universitaria</h5>
                    <p className="text-xs text-on-surface-variant font-mono">Ultima sinc: Hoy, 08:00 AM</p>
                  </div>
                </div>
                <button className="text-xs font-bold px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-white flex items-center gap-2">
                  <Key size={14} /> Renovar Token
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
