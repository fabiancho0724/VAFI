import { useState, useEffect } from 'react';
import { 
  User, Shield, Bell, Network, ShieldCheck, Key, Save, Upload, Calendar, 
  FileSpreadsheet, CheckCircle, AlertCircle, Info, Download, RefreshCw, FileText, Check, Users, FolderSync, Activity
} from 'lucide-react';

export function SettingsScreen({ onNavigate }: { onNavigate: (s: string) => void }) {
  const [activeTab, setActiveTab] = useState<'upload' | 'templates' | 'profile' | 'api'>('upload');
  
  // Cutoff date state
  const [fechaCorte, setFechaCorte] = useState<string>(() => {
    return localStorage.getItem('vafi_fechaCorte') || '25 de Agosto de 2026';
  });
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Load sync_status.json
  useEffect(() => {
    async function loadSyncStatus() {
      try {
        const res = await fetch('/data/sync_status.json?t=' + Date.now());
        if (res.ok) {
          const data = await res.json();
          setSyncStatus(data);
          if (data.cutoffDate && data.cutoffDate.includes('/')) {
            setFechaCorte(data.cutoffDate);
          }
        }
      } catch (e) {}
    }
    loadSyncStatus();
  }, []);

  const handleSaveFechaCorte = (nuevaFecha: string) => {
    setFechaCorte(nuevaFecha);
    localStorage.setItem('vafi_fechaCorte', nuevaFecha);
    window.dispatchEvent(new Event('storage'));
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleFileUpload = (type: 'ingresos' | 'gastos' | 'nomina', file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        if (type === 'ingresos') {
          localStorage.setItem('vafi_uploaded_ingresos', content);
        } else if (type === 'gastos') {
          localStorage.setItem('vafi_uploaded_gastos', content);
        } else if (type === 'nomina') {
          localStorage.setItem('vafi_uploaded_nomina', content);
        }
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } catch (err) {
        alert('Error al leer el archivo. Verifique el formato.');
      }
    };
    reader.readAsText(file);
  };

  const downloadSampleTemplate = (type: string) => {
    let csvContent = "";
    let fileName = "";

    if (type === 'ingresos') {
      fileName = "Plantilla_Ingresos_Oficial_UPTC.csv";
      csvContent = "Unidad;Código concepto;Concepto;Recurso;Valor inicial;Valor aforo;Total recaudo;Fecha final\n" +
                 "01 - ADMINISTRATIVA Y FINANCIERA;10.0;Aportes Nación Funcionamiento;10.0-Aportes Nacion - Funcionamiento;315327817734;315327817734;315327817734;25/08/2026\n" +
                 "01 - ADMINISTRATIVA Y FINANCIERA;10.5;Política de Gratuidad Ley 2307;10.5-Aportes Nación - Política de gratuidad;20708427143;20708427143;20708427143;25/08/2026\n" +
                 "01 - ADMINISTRATIVA Y FINANCIERA;20;Venta de Pines y Matrículas Pregrado;20-Propios;11450000000;11450000000;11450000000;25/08/2026\n" +
                 "04 - CIENCIAS DE LA EDUCACION;31;Fondo Especial de Posgrados;31-Posgrados;19800000000;19800000000;19800000000;25/08/2026\n" +
                 "01 - ADMINISTRATIVA Y FINANCIERA;40;Estampilla Pro-UPTC;40-Estampilla UPTC;24500000000;24500000000;24500000000;25/08/2026";
    } else if (type === 'gastos') {
      fileName = "Plantilla_Gastos_Oficial_UPTC.csv";
      csvContent = "Unidad;Código concepto;Concepto;Recurso;Valor inicial;Valor apropiacion;Acumulado compromiso;Fecha final\n" +
                 "01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.01.01;Sueldos de Personal de Planta;10.0-Aportes Nacion - Funcionamiento;369650433862;369650433862;312078100000;25/08/2026\n" +
                 "01 - ADMINISTRATIVA Y FINANCIERA;2.1.2.02.01;Servicios Públicos, Aseo y Vigilancia;10.0-Aportes Nacion - Funcionamiento;124447130000;124447130000;115154400000;25/08/2026\n" +
                 "12 - SECCIONAL DUITAMA;2.3.1.01.01;Construcción Laboratorios;12-Estampillas Otras Universidades;19687140000;19687140000;19687140000;25/08/2026";
    } else if (type === 'nomina') {
      fileName = "Plantilla_Nomina_Oficial_UPTC.csv";
      csvContent = "Periodo;Numero;Concepto;Valor liquidacion;Objeto;Asignacion;Dedicacion;Vinculacion\n" +
                 "Enero;492-001;PERMANENTE - (PLANTA);2718350225;LIQUIDACION NOMINA PLANTA;ADMINISTRATIVO;ADMINISTRATIVO;ADMINISTRATIVO\n" +
                 "Enero;497-003;PREGRADO - CATEDRA;4556850;LIQUIDACION NOMINA CATEDRA;PREGRADO;HORA CATEDRA;CATEDRA\n" +
                 "Enero;497-002;OCASIONAL TIEMPO COMPLETO;23113511;LIQUIDACION NOMINA OCASIONAL;TECNICA;TIEMPO COMPLETO;OCASIONAL";
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col mb-20 max-w-6xl mx-auto px-4 md:px-0 text-white">
      
      {/* Title Header */}
      <div className="mb-8">
        <p className="text-[#4ade80] text-xs uppercase tracking-widest font-bold mb-1">UPTC - PLATAFORMA VAFI</p>
        <h2 className="text-3xl font-bold font-display text-white mb-2">Configuración & Sincronización de Datos</h2>
        <p className="text-on-surface-variant text-sm">
          Monitoreo automático de la carpeta local OneDrive `Bases de ingresos y gastos`, carga manual y especificación de plantillas.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        
        {/* Navigation Sidebar */}
        <div className="md:col-span-1 border-r border-white/10 pr-4 space-y-2">
          <button 
            onClick={() => setActiveTab('upload')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs uppercase transition-all ${activeTab === 'upload' ? 'bg-[#4ade80]/20 text-[#4ade80] border border-[#4ade80]/30 shadow-lg' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
          >
            <Upload size={16} /> 1. Sincronización & Carga
          </button>
          <button 
            onClick={() => setActiveTab('templates')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs uppercase transition-all ${activeTab === 'templates' ? 'bg-[#38bdf8]/20 text-[#38bdf8] border border-[#38bdf8]/30 shadow-lg' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
          >
            <FileSpreadsheet size={16} /> 2. Estructuras Excel Oficiales
          </button>
          <button 
            onClick={() => setActiveTab('profile')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs uppercase transition-all ${activeTab === 'profile' ? 'bg-[#ffcc29]/20 text-[#ffcc29] border border-[#ffcc29]/30 shadow-lg' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
          >
            <User size={16} /> 3. Perfil de Usuario
          </button>
          <button 
            onClick={() => setActiveTab('api')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs uppercase transition-all ${activeTab === 'api' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 shadow-lg' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
          >
            <Network size={16} /> 4. Integraciones SIAF
          </button>
        </div>

        {/* Main Content Area */}
        <div className="md:col-span-3 space-y-8">
          
          {/* TAB 1: AUTOMATED FOLDER SYNC & FILE UPLOAD */}
          {activeTab === 'upload' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* ONEDRIVE AUTOMATED SYNC CARD */}
              <div className="glass-card rounded-[32px] p-6 lg:p-8 border border-[#4ade80]/30 bg-gradient-to-r from-[#0f172a] via-[#11271b] to-[#0f172a] space-y-4 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-[#4ade80]"></div>
                
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#4ade80]/20 flex items-center justify-center text-[#4ade80] border border-[#4ade80]/30 shrink-0">
                      <Activity size={24} className="animate-pulse" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-[#4ade80] uppercase font-bold tracking-wider">Monitor Automático OneDrive Activo</span>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-mono bg-[#4ade80]/20 text-[#4ade80] font-bold">Auto-Sync</span>
                      </div>
                      <h3 className="text-xl font-display font-bold text-white mt-0.5">Sincronización Local: `Bases de ingresos y gastos`</h3>
                    </div>
                  </div>

                  <button 
                    onClick={async () => {
                      setIsSyncing(true);
                      try {
                        const res = await fetch('/data/sync_status.json?t=' + Date.now());
                        if (res.ok) {
                          const data = await res.json();
                          setSyncStatus(data);
                        }
                      } catch (e) {}
                      setTimeout(() => setIsSyncing(false), 1000);
                    }}
                    className="px-4 py-2.5 bg-[#4ade80] text-black hover:bg-[#4ade80]/90 rounded-xl font-mono font-bold text-xs transition flex items-center gap-2 shrink-0 shadow-lg"
                  >
                    <RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} />
                    {isSyncing ? "Verificando..." : "Verificar Nueva Versión"}
                  </button>
                </div>

                <div className="bg-black/30 border border-white/10 rounded-2xl p-4 space-y-2 text-xs font-mono">
                  <div className="flex justify-between items-center text-white/80">
                    <span className="text-white font-bold">Ruta de Carpeta Monitoreada:</span>
                    <span className="text-[#38bdf8] text-[11px] truncate max-w-md">C:\Users\COSTOS\OneDrive - uptc.edu.co\Documentos\VAFI\2026\VAFI Control\Bases de ingresos y gastos</span>
                  </div>
                  <div className="flex justify-between items-center text-white/80">
                    <span>Archivos Monitoreados:</span>
                    <span className="text-[#4ade80] font-bold">`Gastos.csv`, `Ingresos.csv`, `Nomina.csv`</span>
                  </div>
                  <div className="flex justify-between items-center text-white/80">
                    <span>Última Sincronización Automática:</span>
                    <span className="text-yellow-300 font-bold">{syncStatus?.lastSync || 'Hace un instante (Automática)'}</span>
                  </div>
                  <div className="flex justify-between items-center text-white/80">
                    <span>Fecha de Corte Detectada en CSV:</span>
                    <span className="text-[#4ade80] font-bold">{syncStatus?.cutoffDate || '25/08/2026'}</span>
                  </div>
                </div>
              </div>

              {/* Official Cutoff Date Card */}
              <div className="glass-card rounded-[32px] p-6 lg:p-8 border border-white/10 bg-surface/50 space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-white/10">
                  <Calendar className="text-[#4ade80]" size={22} />
                  <div>
                    <h3 className="text-lg font-bold text-white">Fecha de Corte Oficial del Sistema</h3>
                    <p className="text-xs text-on-surface-variant">Esta fecha se muestra en el encabezado global y en los informes ejecutivos de la plataforma.</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="flex-1 w-full">
                    <label className="block text-xs font-mono text-on-surface-variant uppercase mb-1 font-bold">Seleccionar / Escribir Fecha de Corte:</label>
                    <select
                      value={fechaCorte}
                      onChange={(e) => handleSaveFechaCorte(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-xs outline-none focus:border-[#4ade80]"
                    >
                      <option value="25 de Agosto de 2026" className="bg-[#0f172a]">📅 Corte al 25 de Agosto de 2026 (Oficial GOOBI)</option>
                      <option value="31 de Agosto de 2026" className="bg-[#0f172a]">📅 Corte al 31 de Agosto de 2026</option>
                      <option value="30 de Septiembre de 2026" className="bg-[#0f172a]">📅 Corte al 30 de Septiembre de 2026</option>
                      <option value="31 de Octubre de 2026" className="bg-[#0f172a]">📅 Corte al 31 de Octubre de 2026</option>
                      <option value="30 de Noviembre de 2026" className="bg-[#0f172a]">📅 Corte al 30 de Noviembre de 2026</option>
                      <option value="31 de Diciembre de 2026" className="bg-[#0f172a]">📅 Cierre Anual al 31 de Diciembre de 2026</option>
                    </select>
                  </div>
                  
                  <div className="bg-[#4ade80]/10 border border-[#4ade80]/30 p-3.5 rounded-2xl flex items-center gap-2 font-mono text-xs">
                    <CheckCircle className="text-[#4ade80]" size={16} />
                    <span>Fecha Activa: <strong>{fechaCorte}</strong></span>
                  </div>
                </div>
              </div>

              {/* Success Notification Banner */}
              {saveSuccess && (
                <div className="p-4 bg-[#4ade80]/10 border border-[#4ade80]/30 rounded-2xl text-[#4ade80] text-xs font-mono flex items-center gap-2 animate-in slide-in-from-top duration-200">
                  <CheckCircle size={16} />
                  <span>Los datos y fecha de corte han sido actualizados exitosamente en toda la plataforma.</span>
                </div>
              )}

              {/* MANUAL FILE UPLOAD FALLBACK */}
              <div className="glass-card rounded-[32px] p-6 lg:p-8 border border-white/10 space-y-6">
                <div className="flex justify-between items-center pb-4 border-b border-white/10">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Upload className="text-[#38bdf8]" size={20} />
                      Carga Manual de Archivos (Opcional)
                    </h3>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      Si lo prefiere, puede subir manualmente archivos CSV o Excel individuales.
                    </p>
                  </div>
                  <button 
                    onClick={() => setActiveTab('templates')}
                    className="px-3 py-1.5 bg-[#38bdf8]/10 text-[#38bdf8] border border-[#38bdf8]/30 rounded-xl text-xs font-mono font-bold hover:bg-[#38bdf8]/20 transition"
                  >
                    📘 Ver Estructuras Excel
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  {/* ARCHIVO DE INGRESOS */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
                    <span className="text-xs font-bold text-white flex items-center gap-2">
                      <FileSpreadsheet className="text-[#4ade80]" size={16} /> 1. Ingresos (`Ingresos.csv`)
                    </span>
                    <div className="flex items-center gap-4">
                      <input type="file" accept=".csv" onChange={(e) => e.target.files && handleFileUpload('ingresos', e.target.files[0])} className="text-xs font-mono text-white/70" />
                      <button onClick={() => downloadSampleTemplate('ingresos')} className="px-3 py-1.5 bg-white/10 rounded-xl text-xs font-mono text-white">Plantilla CSV</button>
                    </div>
                  </div>

                  {/* ARCHIVO DE GASTOS */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
                    <span className="text-xs font-bold text-white flex items-center gap-2">
                      <FileSpreadsheet className="text-[#ffcc29]" size={16} /> 2. Gastos (`Gastos.csv`)
                    </span>
                    <div className="flex items-center gap-4">
                      <input type="file" accept=".csv" onChange={(e) => e.target.files && handleFileUpload('gastos', e.target.files[0])} className="text-xs font-mono text-white/70" />
                      <button onClick={() => downloadSampleTemplate('gastos')} className="px-3 py-1.5 bg-white/10 rounded-xl text-xs font-mono text-white">Plantilla CSV</button>
                    </div>
                  </div>

                  {/* ARCHIVO DE NÓMINA */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
                    <span className="text-xs font-bold text-white flex items-center gap-2">
                      <Users className="text-[#38bdf8]" size={16} /> 3. Nómina (`Nomina.csv`)
                    </span>
                    <div className="flex items-center gap-4">
                      <input type="file" accept=".csv" onChange={(e) => e.target.files && handleFileUpload('nomina', e.target.files[0])} className="text-xs font-mono text-white/70" />
                      <button onClick={() => downloadSampleTemplate('nomina')} className="px-3 py-1.5 bg-white/10 rounded-xl text-xs font-mono text-white">Plantilla CSV</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ESTRUCTURAS EXCEL OFICIALES & FÓRMULAS */}
          {activeTab === 'templates' && (
            <div className="glass-card rounded-[32px] p-6 lg:p-8 border border-white/10 space-y-6 animate-in fade-in duration-200">
              <div className="pb-4 border-b border-white/10">
                <h3 className="text-xl font-display font-bold text-white flex items-center gap-2">
                  <FileSpreadsheet className="text-[#38bdf8]" size={22} />
                  Estructuras Oficiales de Excel para Ingresos, Gastos y Nómina
                </h3>
                <p className="text-xs text-on-surface-variant mt-1">
                  Especificación exacta de las 8 columnas (A a H) para cada tipo de dataset presupuestal.
                </p>
              </div>

              {/* 1. ESTRUCTURA DE INGRESOS */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
                <h4 className="text-sm font-bold text-[#4ade80]">1. Estructura de Ingresos (8 Columnas):</h4>
                <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/40">
                  <table className="w-full text-left text-[11px] font-mono">
                    <thead>
                      <tr className="bg-white/10 text-[#4ade80]">
                        <th className="p-2">Col.</th><th className="p-2">Campo</th><th className="p-2">Tipo</th><th className="p-2">Ejemplo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-white/80">
                      <tr><td className="p-2 font-bold text-[#4ade80]">A</td><td className="p-2 font-bold text-white">Unidad</td><td className="p-2 text-yellow-300">Texto</td><td className="p-2">`01 - ADMINISTRATIVA Y FINANCIERA`</td></tr>
                      <tr><td className="p-2 font-bold text-[#4ade80]">B</td><td className="p-2 font-bold text-white">Código concepto</td><td className="p-2 text-yellow-300">Texto</td><td className="p-2">`10.0`</td></tr>
                      <tr><td className="p-2 font-bold text-[#4ade80]">C</td><td className="p-2 font-bold text-white">Concepto</td><td className="p-2 text-yellow-300">Texto</td><td className="p-2">`Aportes Nación - Funcionamiento`</td></tr>
                      <tr><td className="p-2 font-bold text-[#4ade80]">D</td><td className="p-2 font-bold text-[#4ade80]">Recurso</td><td className="p-2 text-yellow-300">Texto Compuesto</td><td className="p-2 font-bold text-white">`10.0-Aportes Nacion - Funcionamiento`</td></tr>
                      <tr><td className="p-2 font-bold text-[#4ade80]">E</td><td className="p-2 font-bold text-white">Valor inicial</td><td className="p-2 text-sky-300">Numérico</td><td className="p-2">`315327817734`</td></tr>
                      <tr><td className="p-2 font-bold text-[#4ade80]">F</td><td className="p-2 font-bold text-white">Valor aforo</td><td className="p-2 text-sky-300">Numérico</td><td className="p-2">`315327817734`</td></tr>
                      <tr><td className="p-2 font-bold text-[#4ade80]">G</td><td className="p-2 font-bold text-white">Total recaudo</td><td className="p-2 text-sky-300">Numérico</td><td className="p-2">`315327817734`</td></tr>
                      <tr><td className="p-2 font-bold text-[#4ade80]">H</td><td className="p-2 font-bold text-white">Fecha final</td><td className="p-2 text-yellow-300">Fecha</td><td className="p-2">`25/08/2026`</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 2. ESTRUCTURA DE GASTOS */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
                <h4 className="text-sm font-bold text-[#ffcc29]">2. Estructura de Gastos (8 Columnas):</h4>
                <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/40">
                  <table className="w-full text-left text-[11px] font-mono">
                    <thead>
                      <tr className="bg-white/10 text-[#ffcc29]">
                        <th className="p-2">Col.</th><th className="p-2">Campo</th><th className="p-2">Tipo</th><th className="p-2">Ejemplo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-white/80">
                      <tr><td className="p-2 font-bold text-[#ffcc29]">A</td><td className="p-2 font-bold text-white">Unidad</td><td className="p-2 text-yellow-300">Texto</td><td className="p-2">`01 - ADMINISTRATIVA Y FINANCIERA`</td></tr>
                      <tr><td className="p-2 font-bold text-[#ffcc29]">B</td><td className="p-2 font-bold text-[#ffcc29]">Código concepto</td><td className="p-2 text-yellow-300">Texto Prefijo</td><td className="p-2 font-bold text-white">`2.1.1.01.01` (`2.1.1`, `2.1.2`, `2.1.3`, `2.1.8`, `2.2.2`, `2.3`)</td></tr>
                      <tr><td className="p-2 font-bold text-[#ffcc29]">C</td><td className="p-2 font-bold text-white">Concepto</td><td className="p-2 text-yellow-300">Texto</td><td className="p-2">`Sueldos de Personal de Planta`</td></tr>
                      <tr><td className="p-2 font-bold text-[#ffcc29]">D</td><td className="p-2 font-bold text-white">Recurso</td><td className="p-2 text-yellow-300">Texto Compuesto</td><td className="p-2">`10.0 - Aportes Nacion - Funcionamiento`</td></tr>
                      <tr><td className="p-2 font-bold text-[#ffcc29]">E</td><td className="p-2 font-bold text-white">Valor inicial</td><td className="p-2 text-sky-300">Numérico</td><td className="p-2">`369650433862`</td></tr>
                      <tr><td className="p-2 font-bold text-[#ffcc29]">F</td><td className="p-2 font-bold text-white">Valor apropiacion</td><td className="p-2 text-sky-300">Numérico</td><td className="p-2">`369650433862`</td></tr>
                      <tr><td className="p-2 font-bold text-[#ffcc29]">G</td><td className="p-2 font-bold text-white">Acumulado compromiso</td><td className="p-2 text-sky-300">Numérico</td><td className="p-2">`312078100000`</td></tr>
                      <tr><td className="p-2 font-bold text-[#ffcc29]">H</td><td className="p-2 font-bold text-white">Fecha final</td><td className="p-2 text-yellow-300">Fecha</td><td className="p-2">`25/08/2026`</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: PERFIL DE USUARIO */}
          {activeTab === 'profile' && (
            <div className="glass-card rounded-[32px] p-6 lg:p-8 border border-white/10 space-y-6 animate-in fade-in duration-200">
              <h3 className="text-xl font-display font-bold text-white flex items-center gap-2">
                <User className="text-[#ffcc29]" size={20} /> Perfil del Funcionario Financiero
              </h3>
              
              <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                <div>
                  <label className="block text-on-surface-variant uppercase font-bold mb-1">Nombre Completo</label>
                  <input type="text" defaultValue="Carlos Rodríguez V." className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white" />
                </div>
                <div>
                  <label className="block text-on-surface-variant uppercase font-bold mb-1">Cargo</label>
                  <input type="text" defaultValue="Director Financiero (VAFI UPTC)" disabled className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-2.5 text-white/50 cursor-not-allowed" />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: INTEGRACIONES SIAF */}
          {activeTab === 'api' && (
            <div className="glass-card rounded-[32px] p-6 lg:p-8 border border-white/10 space-y-6 animate-in fade-in duration-200">
              <h3 className="text-xl font-display font-bold text-white flex items-center gap-2">
                <Network className="text-purple-300" size={20} /> Conexión con SIAF / SIIF UPTC
              </h3>
              <p className="text-xs text-on-surface-variant">Sincronización en tiempo real habilitada con la base de datos de tesorería.</p>
              
              <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex justify-between items-center font-mono text-xs">
                <div>
                  <span className="font-bold text-white block">Servidor SIAF Central UPTC</span>
                  <span className="text-[#4ade80] text-[10px]">Conectado • Última sync: Hoy 08:00 AM</span>
                </div>
                <button className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-xl text-white font-bold text-xs">
                  Sincronizar Ahora
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
