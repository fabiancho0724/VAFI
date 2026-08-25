import { useState, useEffect } from 'react';
import { 
  User, Shield, Bell, Network, ShieldCheck, Key, Save, Upload, Calendar, 
  FileSpreadsheet, CheckCircle, AlertCircle, Info, Download, RefreshCw, FileText, Check
} from 'lucide-react';

export function SettingsScreen({ onNavigate }: { onNavigate: (s: string) => void }) {
  const [activeTab, setActiveTab] = useState<'upload' | 'templates' | 'profile' | 'api'>('upload');
  
  // Cutoff date state
  const [fechaCorte, setFechaCorte] = useState<string>(() => {
    return localStorage.getItem('vafi_fechaCorte') || '31 de Julio de 2026';
  });
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Upload status states
  const [uploadIngresosStatus, setUploadIngresosStatus] = useState<string>('cargado');
  const [uploadGastosStatus, setUploadGastosStatus] = useState<string>('cargado');
  const [uploadAcumuladoStatus, setUploadAcumuladoStatus] = useState<string>('cargado');

  const handleSaveFechaCorte = (nuevaFecha: string) => {
    setFechaCorte(nuevaFecha);
    localStorage.setItem('vafi_fechaCorte', nuevaFecha);
    window.dispatchEvent(new Event('storage'));
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleFileUpload = (type: 'ingresos_mensuales' | 'gastos' | 'ingresos_acumulado', file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        if (type === 'ingresos_mensuales') {
          localStorage.setItem('vafi_uploaded_ingresos_mensual', content);
          setUploadIngresosStatus(`Actualizado (${file.name})`);
        } else if (type === 'gastos') {
          localStorage.setItem('vafi_uploaded_gastos', content);
          setUploadGastosStatus(`Actualizado (${file.name})`);
        } else if (type === 'ingresos_acumulado') {
          localStorage.setItem('vafi_uploaded_ingresos_acumulado', content);
          setUploadAcumuladoStatus(`Actualizado (${file.name})`);
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
      fileName = "Plantilla_Ingresos_Mensuales_UPTC.csv";
      csvContent = "Vigencia;Codigo;Recurso;Valor ene;Valor feb;Valor mar;Valor abr;Valor may;Valor jun;Valor jul;Valor ago;Valor sep;Valor oct;Valor nov;Valor dic\n" +
                 "01 - ADMINISTRATIVA Y FINANCIERA;10.0;Aportes Nacion - Funcionamiento;26277318144;26277318144;26277318144;26277318144;26277318144;26277318144;26277318144;26277318144;26277318144;26277318144;26277318144;26277318144\n" +
                 "01 - ADMINISTRATIVA Y FINANCIERA;10.5;Aportes Nacion - Politica de gratuidad;1725702261.9;1725702261.9;1725702261.9;1725702261.9;1725702261.9;1725702261.9;1725702261.9;1725702261.9;1725702261.9;1725702261.9;1725702261.9;1725702261.9\n" +
                 "04 - CIENCIAS DE LA EDUCACION;31;Fondo Especial de Posgrados R31;1650000000;1650000000;1650000000;1650000000;1650000000;1650000000;1650000000;1650000000;1650000000;1650000000;1650000000;1650000000";
    } else if (type === 'gastos') {
      fileName = "Plantilla_Gastos_Ejecutados_UPTC.csv";
      csvContent = "dependencia;recurso;tipo;año;mes;compromiso;pago\n" +
                 "01 - ADMINISTRATIVA Y FINANCIERA;10.0;2.1.1 Gastos de Personal;2026;1;30804370000;30804370000\n" +
                 "01 - ADMINISTRATIVA Y FINANCIERA;10.0;2.1.2 Gastos de Funcionamiento;2026;1;10370000000;10370000000\n" +
                 "12 - SECCIONAL DUITAMA;12;2.3 Gastos de Inversion;2026;1;1100000000;770000000";
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
        <h2 className="text-3xl font-bold font-display text-white mb-2">Configuración & Gestión de Datos</h2>
        <p className="text-on-surface-variant text-sm">
          Defina la fecha de corte oficial del sistema, suba nuevos reportes de ingresos/gastos y consulte la guía de plantillas Excel.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        
        {/* Navigation Sidebar */}
        <div className="md:col-span-1 border-r border-white/10 pr-4 space-y-2">
          <button 
            onClick={() => setActiveTab('upload')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs uppercase transition-all ${activeTab === 'upload' ? 'bg-[#4ade80]/20 text-[#4ade80] border border-[#4ade80]/30 shadow-lg' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
          >
            <Upload size={16} /> 1. Carga de Datos & Fecha
          </button>
          <button 
            onClick={() => setActiveTab('templates')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs uppercase transition-all ${activeTab === 'templates' ? 'bg-[#38bdf8]/20 text-[#38bdf8] border border-[#38bdf8]/30 shadow-lg' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
          >
            <FileSpreadsheet size={16} /> 2. Estructura Excel
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
          
          {/* TAB 1: FECHA DE CORTE & CARGA DE ARCHIVOS */}
          {activeTab === 'upload' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* Official Cutoff Date Card */}
              <div className="glass-card rounded-[32px] p-6 lg:p-8 border border-white/10 bg-surface/50 space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-white/10">
                  <Calendar className="text-[#4ade80]" size={22} />
                  <div>
                    <h3 className="text-lg font-bold text-white">Fecha de Corte Oficial del Sistema</h3>
                    <p className="text-xs text-on-surface-variant">Esta fecha se muestra en el encabezado global y en los informes ejecutivos.</p>
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
                      <option value="31 de Julio de 2026" className="bg-[#0f172a]">📅 Corte al 31 de Julio de 2026 (Oficial Actual)</option>
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

              {/* UPLOAD CARDS FOR INGRESOS, GASTOS & INGRESOS MENSUALES */}
              <div className="glass-card rounded-[32px] p-6 lg:p-8 border border-white/10 space-y-6">
                <div className="flex justify-between items-center pb-4 border-b border-white/10">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Upload className="text-[#38bdf8]" size={20} />
                      Carga de Archivos Presupuestales (Excel / CSV / JSON)
                    </h3>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      Suba los reportes contables oficiales generados por la División Financiera.
                    </p>
                  </div>
                  <button 
                    onClick={() => setActiveTab('templates')}
                    className="px-3 py-1.5 bg-[#38bdf8]/10 text-[#38bdf8] border border-[#38bdf8]/30 rounded-xl text-xs font-mono font-bold hover:bg-[#38bdf8]/20 transition"
                  >
                    📘 Ver Estructura Excel
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  
                  {/* 1. ARCHIVO DE INGRESOS MENSUALES DETALLADOS */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3 hover:border-white/20 transition-all">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-xs font-bold text-white flex items-center gap-2">
                          <FileSpreadsheet className="text-[#4ade80]" size={16} />
                          1. Archivo de Ingresos Mensuales por Recurso (2026)
                        </span>
                        <p className="text-[11px] text-on-surface-variant mt-0.5">
                          CSV / Excel con las 12 columnas mensuales (`Valor ene` a `Valor dic`) por Unidad y Recurso.
                        </p>
                      </div>
                      <span className="text-[10px] font-mono px-2.5 py-0.5 rounded bg-[#4ade80]/20 text-[#4ade80] font-bold">
                        {uploadIngresosStatus}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 pt-1">
                      <input 
                        type="file" 
                        accept=".csv,.xlsx,.xls"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleFileUpload('ingresos_mensuales', e.target.files[0]);
                          }
                        }}
                        className="text-xs font-mono text-white/70 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-mono file:font-bold file:bg-[#4ade80] file:text-black hover:file:bg-[#4ade80]/90 cursor-pointer"
                      />
                      <button 
                        onClick={() => downloadSampleTemplate('ingresos')}
                        className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-mono text-white transition flex items-center gap-1.5 shrink-0"
                      >
                        <Download size={13} /> Plantilla CSV
                      </button>
                    </div>
                  </div>

                  {/* 2. ARCHIVO DE GASTOS E HISTÓRICO */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3 hover:border-white/20 transition-all">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-xs font-bold text-white flex items-center gap-2">
                          <FileSpreadsheet className="text-[#ffcc29]" size={16} />
                          2. Archivo de Gastos y Compromisos Ejecutados
                        </span>
                        <p className="text-[11px] text-on-surface-variant mt-0.5">
                          JSON o CSV conteniendo los registros de `dependencia`, `recurso`, `tipo`, `compromiso` y `pago`.
                        </p>
                      </div>
                      <span className="text-[10px] font-mono px-2.5 py-0.5 rounded bg-[#ffcc29]/20 text-[#ffcc29] font-bold">
                        {uploadGastosStatus}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 pt-1">
                      <input 
                        type="file" 
                        accept=".csv,.json"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleFileUpload('gastos', e.target.files[0]);
                          }
                        }}
                        className="text-xs font-mono text-white/70 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-mono file:font-bold file:bg-[#ffcc29] file:text-black hover:file:bg-[#ffcc29]/90 cursor-pointer"
                      />
                      <button 
                        onClick={() => downloadSampleTemplate('gastos')}
                        className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-mono text-white transition flex items-center gap-1.5 shrink-0"
                      >
                        <Download size={13} /> Plantilla CSV
                      </button>
                    </div>
                  </div>

                  {/* 3. ARCHIVO DE INGRESOS ACUMULADOS POR RECURSO */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3 hover:border-white/20 transition-all">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-xs font-bold text-white flex items-center gap-2">
                          <FileSpreadsheet className="text-[#38bdf8]" size={16} />
                          3. Archivo de Ingresos Acumulados (`Ingresos.csv`)
                        </span>
                        <p className="text-[11px] text-on-surface-variant mt-0.5">
                          Reporte consolidado del recaudo acumulado y apropiación por código de recurso.
                        </p>
                      </div>
                      <span className="text-[10px] font-mono px-2.5 py-0.5 rounded bg-[#38bdf8]/20 text-[#38bdf8] font-bold">
                        {uploadAcumuladoStatus}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 pt-1">
                      <input 
                        type="file" 
                        accept=".csv"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleFileUpload('ingresos_acumulado', e.target.files[0]);
                          }
                        }}
                        className="text-xs font-mono text-white/70 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-mono file:font-bold file:bg-[#38bdf8] file:text-black hover:file:bg-[#38bdf8]/90 cursor-pointer"
                      />
                    </div>
                  </div>

                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ESTRUCTURA EXCEL DIDÁCTICA Y DOCUMENTACIÓN DE COLUMNAS */}
          {activeTab === 'templates' && (
            <div className="glass-card rounded-[32px] p-6 lg:p-8 border border-white/10 space-y-6 animate-in fade-in duration-200">
              <div className="pb-4 border-b border-white/10">
                <h3 className="text-xl font-display font-bold text-white flex items-center gap-2">
                  <FileSpreadsheet className="text-[#38bdf8]" size={22} />
                  Estructura Oficial para Crear los Archivos Excel / CSV
                </h3>
                <p className="text-xs text-on-surface-variant mt-1">
                  Siga estas especificaciones exactas para garantizar que los reportes de la División Financiera se carguen sin errores.
                </p>
              </div>

              {/* Estructura 1: Ingresos Mensuales */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-bold text-[#4ade80] flex items-center gap-2">
                    Estructura 1: Ingresos Mensuales por Unidad y Recurso (`Ingreso Mensual 2026.csv`)
                  </h4>
                  <button 
                    onClick={() => downloadSampleTemplate('ingresos')}
                    className="px-3 py-1 bg-[#4ade80] text-black font-mono font-bold rounded-lg text-xs hover:bg-[#4ade80]/90 transition"
                  >
                    Descargar Ejemplo CSV
                  </button>
                </div>
                
                <p className="text-xs text-white/80 leading-relaxed">
                  Cada fila representa el recaudo mensual de un recurso presupuestal en una Unidad específica de la UPTC.
                </p>

                <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/40">
                  <table className="w-full text-left text-[11px] font-mono">
                    <thead>
                      <tr className="bg-white/10 text-[#4ade80]">
                        <th className="p-2.5">Nombre Columna</th>
                        <th className="p-2.5">Tipo de Dato</th>
                        <th className="p-2.5">Descripción & Ejemplo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-white/80">
                      <tr>
                        <td className="p-2.5 font-bold text-white">Vigencia / Unidad</td>
                        <td className="p-2.5 text-yellow-300">Texto</td>
                        <td className="p-2.5">Nombre oficial de la Unidad. Ej: `01 - ADMINISTRATIVA Y FINANCIERA`</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold text-white">Codigo</td>
                        <td className="p-2.5 text-yellow-300">Texto / Número</td>
                        <td className="p-2.5">Código presupuestal de la fuente. Ej: `10.0`, `10.5`, `31`, `40`</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold text-white">Recurso</td>
                        <td className="p-2.5 text-yellow-300">Texto</td>
                        <td className="p-2.5">Denominación del recurso. Ej: `Aportes Nacion - Funcionamiento`</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold text-white">Valor ene ... Valor dic</td>
                        <td className="p-2.5 text-sky-300">Numérico (Pesos)</td>
                        <td className="p-2.5">12 columnas para los meses de Enero a Diciembre en pesos colombianos sin formato.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Estructura 2: Gastos Ejecutados */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-bold text-[#ffcc29] flex items-center gap-2">
                    Estructura 2: Gastos y Compromisos Ejecutados (`historicalGastos.json` / CSV)
                  </h4>
                  <button 
                    onClick={() => downloadSampleTemplate('gastos')}
                    className="px-3 py-1 bg-[#ffcc29] text-black font-mono font-bold rounded-lg text-xs hover:bg-[#ffcc29]/90 transition"
                  >
                    Descargar Ejemplo CSV
                  </button>
                </div>

                <p className="text-xs text-white/80 leading-relaxed">
                  Contiene la ejecución mensual de compromisos y pagos agrupados por categoría y dependencia.
                </p>

                <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/40">
                  <table className="w-full text-left text-[11px] font-mono">
                    <thead>
                      <tr className="bg-white/10 text-[#ffcc29]">
                        <th className="p-2.5">Nombre Columna</th>
                        <th className="p-2.5">Tipo de Dato</th>
                        <th className="p-2.5">Descripción & Ejemplo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-white/80">
                      <tr>
                        <td className="p-2.5 font-bold text-white">dependencia</td>
                        <td className="p-2.5 text-yellow-300">Texto</td>
                        <td className="p-2.5">Nombre de la unidad. Ej: `01 - ADMINISTRATIVA Y FINANCIERA`</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold text-white">recurso</td>
                        <td className="p-2.5 text-yellow-300">Texto</td>
                        <td className="p-2.5">Código del recurso. Ej: `10.0`, `12`, `14`, `31`</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold text-white">tipo</td>
                        <td className="p-2.5 text-yellow-300">Texto</td>
                        <td className="p-2.5">Agrupación presupuestal. Ej: `2.1.1 Gastos de Personal`, `2.1.2 Funcionamiento`, `2.3 Inversión`</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold text-white">año / mes</td>
                        <td className="p-2.5 text-sky-300">Entero</td>
                        <td className="p-2.5">Vigencia (ej: `2026`) y Número de Mes (`1` a `12`).</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold text-white">compromiso</td>
                        <td className="p-2.5 text-sky-300">Numérico</td>
                        <td className="p-2.5">Valor total comprometido en pesos.</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold text-white">pago</td>
                        <td className="p-2.5 text-sky-300">Numérico</td>
                        <td className="p-2.5">Valor del giro o pago efectivo en pesos colombianos.</td>
                      </tr>
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
