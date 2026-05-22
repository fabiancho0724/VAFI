import { Folder, FileText, Search, Download, Filter, MoreVertical, FileCode, FileSpreadsheet } from 'lucide-react';

export function RepositoryScreen({ onNavigate }: { onNavigate: (s: string) => void }) {
  return (
    <div className="flex flex-col mb-20 max-w-7xl mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <p className="text-primary-container text-xs uppercase tracking-widest font-bold mb-1">UPTC - GESTIÓN DOCUMENTAL</p>
          <h2 className="text-3xl font-bold font-display text-white mb-2">Repositorio de Documentos</h2>
          <p className="text-on-surface-variant text-sm max-w-2xl">
            Acceso seguro a reportes históricos, resoluciones y fuentes de datos originales.
          </p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant w-4 h-4" />
            <input 
              type="text" 
              placeholder="Buscar documento..." 
              className="bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-container text-on-surface w-64"
            />
          </div>
          <button className="bg-surface-container-high/50 text-white border border-white/10 px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-surface-container-highest transition-all text-sm">
            <Filter size={16} />
            Filtrar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="glass-card rounded-[24px] p-6 hover:bg-white/10 transition-colors cursor-pointer border border-primary-container/30">
          <div className="w-12 h-12 bg-primary-container/10 rounded-xl flex items-center justify-center text-primary-container mb-4">
            <FileText size={24} />
          </div>
          <h4 className="font-bold text-white mb-1">Histórico de Reportes (PDF)</h4>
          <p className="text-xs text-on-surface-variant font-mono">245 archivos • 1.2 GB</p>
        </div>
        
        <div className="glass-card rounded-[24px] p-6 hover:bg-white/10 transition-colors cursor-pointer border border-white/5 opacity-80">
          <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center text-white mb-4">
            <Folder size={24} />
          </div>
          <h4 className="font-bold text-white mb-1">Resoluciones Presupuestales</h4>
          <p className="text-xs text-on-surface-variant font-mono">1.024 archivos • 850 MB</p>
        </div>

        <div className="glass-card rounded-[24px] p-6 hover:bg-white/10 transition-colors cursor-pointer border border-secondary/30">
          <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center text-secondary mb-4">
            <FileCode size={24} />
          </div>
          <h4 className="font-bold text-white mb-1">Archivos Fuente ML (CSV)</h4>
          <p className="text-xs text-on-surface-variant font-mono">12 conjuntos • 3.5 GB</p>
        </div>
      </div>

      <div className="glass-card rounded-[32px] overflow-hidden border border-white/5">
        <div className="px-8 py-6 border-b border-white/5 flex justify-between items-center bg-white/5">
          <h3 className="text-lg font-bold text-white">Archivos Recientes</h3>
          <button className="text-xs font-bold text-primary-container hover:text-white transition-colors">Ver todos</button>
        </div>
        
        <div className="divide-y divide-white/5">
          {[
            { name: 'Consolidado_Financiero_Q1_2024.pdf', type: 'PDF', date: 'Hace 2 horas', size: '2.4 MB', icon: FileText, color: 'text-[#ff5b5b]' },
            { name: 'Dataset_Ejecucion_2019_2024.csv', type: 'CSV', date: 'Ayer', size: '15.8 MB', icon: FileSpreadsheet, color: 'text-[#4ade80]' },
            { name: 'Resolucion_045_Adicion_Presupuestal.pdf', type: 'PDF', date: '15 May 2024', size: '1.1 MB', icon: FileText, color: 'text-[#ff5b5b]' },
            { name: 'Proyecciones_Ingreso_Estampilla_v2.xlsx', type: 'XLSX', date: '12 May 2024', size: '3.2 MB', icon: FileSpreadsheet, color: 'text-[#4ade80]' },
            { name: 'Reporte_Auditoria_Interna_2023.pdf', type: 'PDF', date: '10 May 2024', size: '8.5 MB', icon: FileText, color: 'text-[#ff5b5b]' },
          ].map((file, i) => (
            <div key={i} className="px-8 py-4 flex items-center justify-between hover:bg-white/5 transition-colors group">
              <div className="flex items-center gap-4">
                 <div className={`p-2 bg-white/5 rounded-lg ${file.color}`}>
                   <file.icon size={20} />
                 </div>
                 <div>
                   <h5 className="font-medium text-sm text-white group-hover:text-primary-container transition-colors">{file.name}</h5>
                   <p className="text-xs text-on-surface-variant font-mono">{file.type} • {file.size}</p>
                 </div>
              </div>
              <div className="flex items-center gap-6 text-xs text-on-surface-variant">
                 <span className="font-mono w-24 text-right">{file.date}</span>
                 <div className="flex gap-2">
                   <button className="p-2 hover:bg-white/10 rounded-full transition-colors text-white">
                     <Download size={16} />
                   </button>
                   <button className="p-2 hover:bg-white/10 rounded-full transition-colors text-white">
                     <MoreVertical size={16} />
                   </button>
                 </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
