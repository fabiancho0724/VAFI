import { useState, useEffect } from 'react';
import { Folder, FileText, Search, Download, Filter, MoreVertical, FileCode, FileSpreadsheet, LogIn, ExternalLink, LogOut, Loader2 } from 'lucide-react';
import { initAuth, googleSignIn, getAccessToken, logout } from '../lib/auth';
import { User } from 'firebase/auth';

export function RepositoryScreen({ onNavigate }: { onNavigate: (s: string) => void }) {
  const [needsAuth, setNeedsAuth] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  const [files, setFiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const unsubscribe = initAuth(
      (u, t) => {
        setUser(u);
        setToken(t);
        setNeedsAuth(false);
        fetchFiles(t);
      },
      () => setNeedsAuth(true)
    );
    return () => {
      // Firebase listener return a function, just making sure we don't crash
      if (typeof unsubscribe === 'function') {
        unsubscribe(); 
      }
    };
  }, []);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setToken(result.accessToken);
        setUser(result.user);
        setNeedsAuth(false);
        fetchFiles(result.accessToken);
      }
    } catch (err) {
      console.error('Login failed:', err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setToken(null);
    setUser(null);
    setFiles([]);
    setNeedsAuth(true);
  };

  const fetchFiles = async (accessToken: string, query: string = '') => {
    setIsLoading(true);
    try {
      let q = "mimeType != 'application/vnd.google-apps.folder' and trashed = false";
      if (query) {
        q += ` and name contains '${query.replace(/'/g, "\\'")}'`;
      }
      const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType,size,modifiedTime,webViewLink)&orderBy=modifiedTime desc&pageSize=15`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (data.files) {
        setFiles(data.files);
      }
    } catch (err) {
      console.error('Error fetching files:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (token) {
      fetchFiles(token, searchQuery);
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('pdf')) return { icon: FileText, color: 'text-[#ff5b5b]' };
    if (mimeType.includes('spreadsheet') || mimeType.includes('csv') || mimeType.includes('excel')) return { icon: FileSpreadsheet, color: 'text-[#4ade80]' };
    if (mimeType.includes('json') || mimeType.includes('xml')) return { icon: FileCode, color: 'text-secondary' };
    return { icon: FileText, color: 'text-[#7bd0ff]' };
  };

  const formatSize = (bytes: string | undefined) => {
    if (!bytes) return '-- MB';
    const num = parseInt(bytes, 10);
    if (isNaN(num)) return '-- MB';
    if (num < 1024) return `${num} B`;
    if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
    const mb = num / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString();
  };

  return (
    <div className="flex flex-col mb-20 max-w-7xl mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <p className="text-primary-container text-xs uppercase tracking-widest font-bold mb-1">UPTC - GESTIÓN DOCUMENTAL</p>
          <h2 className="text-3xl font-bold font-display text-white mb-2">Repositorio de Documentos</h2>
          <p className="text-on-surface-variant text-sm max-w-2xl flex items-center gap-2">
            Integración con Google Drive para acceso seguro a reportes históricos y resoluciones.
            {user && <span className="text-primary-container bg-primary-container/10 px-2 py-0.5 rounded text-xs">Conectado como {user.displayName}</span>}
          </p>
        </div>
        <div className="flex gap-3">
          {user && (
            <button 
              onClick={handleLogout}
              className="bg-red-500/10 text-red-400 border border-red-500/20 px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-red-500/20 transition-all text-sm"
            >
              <LogOut size={16} />
              Desconectar
            </button>
          )}
        </div>
      </div>

      {needsAuth ? (
        <div className="flex flex-col items-center justify-center p-12 glass-card rounded-[32px] border border-white/5 text-center">
          <div className="w-20 h-20 bg-surface-container-highest rounded-full flex items-center justify-center mb-6">
            <Folder size={40} className="text-on-surface-variant" />
          </div>
          <h3 className="text-2xl font-display font-medium text-white mb-3">Conectar Google Drive</h3>
          <p className="text-on-surface-variant max-w-md mx-auto mb-8">
            Para acceder al repositorio de documentos institucionales, necesitas conectar tu cuenta de Google.
          </p>
          
          <button 
            onClick={handleLogin}
            disabled={isLoggingIn}
            className="gsi-material-button bg-white text-black hover:bg-gray-100 flex items-center gap-3 px-6 py-3 rounded-full font-medium transition-all"
          >
            {isLoggingIn ? <Loader2 className="animate-spin" size={24} /> : (
              <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="24" height="24" style={{ display: 'block' }}>
                 <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                 <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                 <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                 <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                 <path fill="none" d="M0 0h48v48H0z"></path>
               </svg>
            )}
            <span className="text-[14px]">Iniciar sesión con Google</span>
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="glass-card rounded-[24px] p-6 hover:bg-white/10 transition-colors cursor-pointer border border-primary-container/30">
              <div className="w-12 h-12 bg-primary-container/10 rounded-xl flex items-center justify-center text-primary-container mb-4">
                <Folder size={24} />
              </div>
              <h4 className="font-bold text-white mb-1">Mi Unidad Drive</h4>
              <p className="text-xs text-on-surface-variant font-mono">Archivos conectados</p>
            </div>
            
            <div className="glass-card rounded-[24px] p-6 hover:bg-white/10 transition-colors cursor-pointer border border-white/5 opacity-80">
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center text-white mb-4">
                <FileSpreadsheet size={24} />
              </div>
              <h4 className="font-bold text-white mb-1">Hojas de Cálculo</h4>
              <p className="text-xs text-on-surface-variant font-mono">Datos estructurados</p>
            </div>

            <div className="glass-card rounded-[24px] p-6 hover:bg-white/10 transition-colors cursor-pointer border border-secondary/30">
              <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center text-secondary mb-4">
                <FileText size={24} />
              </div>
              <h4 className="font-bold text-white mb-1">Resoluciones</h4>
              <p className="text-xs text-on-surface-variant font-mono">PDFs en Drive</p>
            </div>
          </div>

          <div className="glass-card rounded-[32px] overflow-hidden border border-white/5">
            <div className="px-8 py-6 border-b border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white/5 gap-4">
              <h3 className="text-lg font-bold text-white">Documentos de Drive</h3>
              <form onSubmit={handleSearch} className="flex gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant w-4 h-4" />
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar en Drive..." 
                    className="bg-surface-container border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-container text-white w-64"
                  />
                </div>
                <button type="submit" className="bg-primary-container text-black px-4 py-2 rounded-xl text-sm font-bold">
                  Buscar
                </button>
              </form>
            </div>
            
            <div className="divide-y divide-white/5">
              {isLoading ? (
                <div className="p-12 flex justify-center items-center text-primary-container">
                  <Loader2 className="animate-spin" size={32} />
                </div>
              ) : files.length > 0 ? (
                files.map((file, i) => {
                  const ui = getFileIcon(file.mimeType);
                  return (
                    <div key={file.id} className="px-8 py-4 flex items-center justify-between hover:bg-white/5 transition-colors group">
                      <div className="flex items-center gap-4">
                         <div className={`p-2 bg-white/5 rounded-lg ${ui.color}`}>
                           <ui.icon size={20} />
                         </div>
                         <div>
                           <h5 className="font-medium text-sm text-white group-hover:text-primary-container transition-colors max-w-sm truncate" title={file.name}>
                             {file.name}
                           </h5>
                           <p className="text-xs text-on-surface-variant font-mono truncate max-w-xs">{file.mimeType.replace('application/vnd.google-apps.', '')} • {formatSize(file.size)}</p>
                         </div>
                      </div>
                      <div className="flex items-center gap-6 text-xs text-on-surface-variant">
                         <span className="font-mono w-24 text-right hidden sm:block">{formatDate(file.modifiedTime)}</span>
                         <div className="flex gap-2">
                           <a 
                             href={file.webViewLink} 
                             target="_blank" 
                             rel="noopener noreferrer"
                             title="Abrir en Drive"
                             className="p-2 hover:bg-white/10 rounded-full transition-colors text-white tooltip-trigger"
                           >
                             <ExternalLink size={16} />
                           </a>
                         </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-12 text-center text-on-surface-variant">
                   <p>No se encontraron documentos en Drive.</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
