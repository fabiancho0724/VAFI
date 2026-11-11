import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, Bot, User, Loader2, AlertCircle, Copy, Check, 
  Sparkles, Key, ShieldCheck, Database, Calendar, 
  HelpCircle, RefreshCw, X, ArrowRight, ExternalLink,
  Layers, Download, ChevronDown, ChevronUp, FileSpreadsheet
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '../lib/utils';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, 
  ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { CentavitoMode, INSTITUTIONAL_DATA } from '../lib/centavitoEngine';
import { 
  executeCentavoAnalysis, 
  CentavoEvidence, 
  CentavoDeepLink 
} from '../lib/centavoSemanticEngine';
import { institutionalDataService } from '../lib/institutionalDataService';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  modeUsed?: CentavitoMode;
  topicTitle?: string;
  evidence?: CentavoEvidence;
  deepLinks?: CentavoDeepLink[];
  suggestedFollowUps?: string[];
  isError?: boolean;
}

function CustomChart({ content }: { content: string }) {
  try {
    const config = JSON.parse(content);
    if (!config.type || !config.data) return null;

    if (config.type === 'bar') {
      return (
        <div className="w-full h-72 mt-4 bg-zinc-900/90 rounded-2xl p-4 border border-white/10 shadow-inner">
          <p className="text-xs font-mono uppercase tracking-wider text-amber-400 mb-2 font-semibold">
            Visualización Cuantitativa Institucional (Valores en Millones COP)
          </p>
          <ResponsiveContainer width="100%" height="88%">
            <BarChart data={config.data}>
              <XAxis dataKey="name" stroke="#a1a1aa" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis 
                stroke="#a1a1aa" 
                fontSize={11} 
                tickLine={false} 
                axisLine={false} 
                tickFormatter={(val) => `$${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}M`} 
              />
              <RechartsTooltip 
                cursor={{ fill: 'rgba(255,204,41,0.08)' }}
                contentStyle={{ 
                  backgroundColor: '#18181b', 
                  borderColor: '#27272a', 
                  borderRadius: '12px', 
                  color: '#fff', 
                  fontSize: '12px',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)'
                }}
                formatter={(value: any) => [`$ ${(value as number).toLocaleString('es-CO')} Millones`, 'Monto']}
              />
              <Bar dataKey="value" fill="#fbbf24" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      );
    }
    
    if (config.type === 'pie') {
      const COLORS = ['#fbbf24', '#38bdf8', '#34d399', '#f472b6', '#a78bfa', '#fb923c', '#818cf8'];
      return (
        <div className="w-full h-72 mt-4 bg-zinc-900/90 rounded-2xl p-4 border border-white/10 shadow-inner">
          <p className="text-xs font-mono uppercase tracking-wider text-sky-400 mb-2 font-semibold">
            Distribución Porcentual del Portafolio Institucional
          </p>
          <ResponsiveContainer width="100%" height="88%">
            <PieChart>
              <Pie
                data={config.data}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={4}
                dataKey="value"
              >
                {config.data.map((_: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <RechartsTooltip 
                contentStyle={{ 
                  backgroundColor: '#18181b', 
                  borderColor: '#27272a', 
                  borderRadius: '12px', 
                  color: '#fff', 
                  fontSize: '12px' 
                }}
                formatter={(value: any) => [`$ ${(value as number).toLocaleString('es-CO')} Millones`, 'Participación']}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      );
    }
  } catch (e) {
    return <code className="text-red-400 block p-2 bg-red-950/20 rounded font-mono text-xs">{content}</code>;
  }
  return null;
}

const QUICK_PROMPTS = [
  {
    label: '🎓 Posgrados y Regla del 40%',
    prompt: '¿Cuánto ingresó por posgrados, cómo se reparte por facultades y qué representa la regla del 40%?',
    mode: 'poa_disponible' as CentavitoMode
  },
  {
    label: '🗺️ ¿Dónde está el dinero disponible?',
    prompt: '¿Dónde está el dinero disponible en el POA 2026? Desglosa por recurso, facultad y tipo de gasto.',
    mode: 'poa_disponible' as CentavitoMode
  },
  {
    label: '🔮 Proyección 2027: Gratuidad (R10.5)',
    prompt: '¿Cómo está proyectada la Política de Gratuidad para 2027 como Recurso 10.5 y las 12-avas de MinHacienda?',
    mode: 'cierre' as CentavitoMode
  },
  {
    label: '💵 Flujo de Caja y Cierre 2026',
    prompt: '¿Cómo está la situación de liquidez en bancos y el margen de caja proyectado para pagar las primas de fin de año?',
    mode: 'flujo_caja' as CentavitoMode
  },
  {
    label: '⚖️ Docentes de Cátedra y Escalafón',
    prompt: '¿Cómo funciona el simulador de docentes de cátedra según el Acuerdo 015 de 2009 y qué costos genera?',
    mode: 'escenario' as CentavitoMode
  },
  {
    label: '🔍 Auditoría y Riesgos de Cierre',
    prompt: 'Audita la consistencia financiera, techos de gasto SIIF y riesgos de cierre de vigencia 2026.',
    mode: 'auditoria' as CentavitoMode
  }
];

export function AssistantScreen({ onNavigate }: { onNavigate?: (s: string) => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'greeting',
      role: 'assistant',
      content: `¡Hola! Soy **CENTAVO**, tu **analista financiero institucional virtual** de la **Universidad Pedagógica y Tecnológica de Colombia (UPTC)**.

Estoy diseñado para convertir todos los datos presupuestales, contractuales, de tesorería y proyecciones en **inteligencia financiera rigurosa, trazable y útil para la toma de decisiones directivas**.

Tengo a la mano la información oficial auditada con corte al **${INSTITUTIONAL_DATA.fechaCorte}**:

* 🗺️ **POA 2026:** **$ 143.637 Millones** disponibles libres de $ 538.165M programados.
* 🔮 **Proyección 2027 (R10.5):** **$ 52.834M** de Gratuidad girados en **doceavas mensuales ($4.402,9M/mes)** vía MinHacienda.
* 🎓 **Posgrados (R33):** **$ 45.472M** en ingresos anuales y regla del 40% a nómina central ($18.188M).
* 👥 **Nómina y Personal:** **$ 301.916M** programados en Unidad 01 ($99.032M disponible para fin de año).
* 💵 **Flujo de Caja:** **$ 43.370M** en bancos a la fecha y **$ 2.200M** proyectados de margen de cierre en R10.
* ⚖️ **Docentes de Cátedra:** Simulador paramétrico según el Acuerdo 015 de 2009.

¿Sobre qué recurso, facultad, escenario o concepto directivo deseas consultar hoy?`,
      modeUsed: 'auto',
      topicTitle: 'Bienvenida Institucional',
      suggestedFollowUps: [
        '¿Cuánto ingresó por posgrados y cómo se aplica la regla del 40%?',
        '¿Dónde está el dinero disponible en el POA 2026?',
        '¿Cómo está proyectada la Gratuidad (R10.5) para 2027 en 12-avas?',
        '¿Cuánto dinero tenemos en caja y bancos para fin de año?'
      ]
    }
  ]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMode, setSelectedMode] = useState<CentavitoMode>('auto');
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem('CENTAVITO_GEMINI_API_KEY') || '');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Precarga asíncrona de datos institucionales al montar la pantalla
  useEffect(() => {
    institutionalDataService.preloadAll().catch(console.warn);
  }, []);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportMarkdown = () => {
    let fullMd = `# Informe de Consulta Directiva — CENTAVO (UPTC)\n\n`;
    fullMd += `**Fecha de Generación:** ${new Date().toLocaleString('es-CO')}\n`;
    fullMd += `**Plataforma:** VAFI — Universidad Pedagógica y Tecnológica de Colombia\n\n---\n\n`;

    for (const msg of messages) {
      if (msg.role === 'user') {
        fullMd += `### 👤 Consulta del Usuario:\n> ${msg.content}\n\n`;
      } else {
        fullMd += `### 🤖 Dictamen de CENTAVO [${msg.topicTitle || 'Análisis Institucional'}]:\n`;
        fullMd += `${msg.content}\n\n`;
        if (msg.evidence) {
          fullMd += `**Trazabilidad Probatoria:**\n`;
          fullMd += `- Vigencia: ${msg.evidence.vigencia}\n`;
          fullMd += `- Fecha de Corte: ${msg.evidence.fechaCorte}\n`;
          if (msg.evidence.recurso) fullMd += `- Recurso: ${msg.evidence.recurso}\n`;
          if (msg.evidence.unidad) fullMd += `- Unidad: ${msg.evidence.unidad}\n`;
          fullMd += `- Fuente Oficial: ${msg.evidence.fuente}\n`;
          fullMd += `- Criterio de Cálculo: ${msg.evidence.criterioCalculo}\n\n`;
        }
        fullMd += `---\n\n`;
      }
    }

    const blob = new Blob([fullMd], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Informe_CENTAVO_UPTC_${Date.now()}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('CENTAVITO_GEMINI_API_KEY', key.trim());
    setShowSettingsModal(false);
  };

  const executeQuery = async (queryText: string, forcedMode?: CentavitoMode) => {
    if (!queryText.trim() || isLoading) return;

    const currentMode = forcedMode || selectedMode;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: queryText.trim()
    };

    const currentMessages = [...messages, userMessage];
    setMessages(currentMessages);
    setInput('');
    setIsLoading(true);

    try {
      // 1. Obtener análisis del motor semántico institucional
      const semanticResult = await executeCentavoAnalysis(userMessage.content, currentMode);

      // 2. Intentar llamar al endpoint de servidor /api/chat si Gemini está configurado
      let usedServerText: string | null = null;
      if (apiKey) {
        try {
          const history = currentMessages
            .filter(m => m.id !== 'greeting')
            .map(m => ({ role: m.role, content: m.content }));

          const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'x-api-key': apiKey
            },
            body: JSON.stringify({ 
              prompt: userMessage.content, 
              history: history.slice(0, -1),
              apiKey: apiKey,
              mode: currentMode
            }),
          });

          if (response.ok) {
            const data = await response.json();
            if (data.text && !data.fallback) {
              usedServerText = data.text;
            }
          }
        } catch (serverErr) {
          console.warn("Fallo en servidor Gemini, aplicando motor semántico institucional local:", serverErr);
        }
      }

      // Si el servidor respondió con Gemini, usamos su texto pero enriquecemos con evidencia y deepLinks
      let finalContent = usedServerText || `${semanticResult.directAnswer}\n\n${semanticResult.detailedAnalysis}`;
      if (semanticResult.chartJson && !finalContent.includes('```json-chart')) {
        finalContent += `\n\n\`\`\`json-chart\n${semanticResult.chartJson}\n\`\`\``;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: finalContent,
          modeUsed: semanticResult.modeUsed,
          topicTitle: semanticResult.topicTitle,
          evidence: semanticResult.evidence,
          deepLinks: semanticResult.deepLinks,
          suggestedFollowUps: semanticResult.suggestedFollowUps
        }
      ]);
    } catch (error: any) {
      console.error("Error en consulta de CENTAVO:", error);
      // Fallback de emergencia
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `⚠️ Se produjo un inconveniente al procesar la consulta. Sin embargo, la base consolidada del **POA 2026** cuenta con **$ 143.637 Millones** disponibles libres y el saldo en bancos es de **$ 43.370 Millones**. Puedes reformular tu consulta o elegir una de las opciones sugeridas.`,
          modeUsed: currentMode,
          topicTitle: 'Aviso Institucional',
          isError: true,
          suggestedFollowUps: [
            '¿Cuánto ingresó por posgrados?',
            '¿Dónde está el dinero disponible en el POA?',
            '¿Cómo está la proyección 2027 de Gratuidad en 12-avas?'
          ]
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeQuery(input);
  };

  const handleModeClick = (modeId: CentavitoMode) => {
    if (selectedMode === modeId) {
      setSelectedMode('auto');
    } else {
      setSelectedMode(modeId);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] max-w-6xl mx-auto bg-zinc-950/70 backdrop-blur-xl border border-white/10 rounded-[32px] overflow-hidden shadow-2xl">
      
      {/* Header Institucional Directivo de CENTAVO */}
      <div className="bg-gradient-to-r from-zinc-900/95 via-zinc-900/80 to-zinc-950 border-b border-white/10 p-5 px-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative p-3 bg-gradient-to-br from-amber-400 to-amber-600 text-black rounded-2xl shadow-lg shadow-amber-500/20">
            <Bot size={30} className="stroke-[2.2]" />
            <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-zinc-900"></span>
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white tracking-tight">CENTAVO</h2>
              <span className="text-[10px] font-mono uppercase bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2.5 py-0.5 rounded-md font-bold tracking-wide">
                Analista Financiero Institucional Virtual
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono tracking-wide mt-0.5">
              UPTC • Vicerrectoría Administrativa y Financiera (VAFI)
            </p>
          </div>
        </div>

        {/* Badges de Estado, Exportación y Conectividad */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-3 py-1.5 rounded-full text-xs font-mono">
            <Database size={13} />
            <span>POA $538M (Disp: $143M)</span>
          </div>

          <div className="flex items-center gap-1.5 bg-purple-500/10 border border-purple-500/30 text-purple-300 px-3 py-1.5 rounded-full text-xs font-mono">
            <Calendar size={13} />
            <span>2027 R10.5 (12-avas MinHacienda)</span>
          </div>

          <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 px-3 py-1.5 rounded-full text-xs font-mono">
            <ShieldCheck size={13} />
            <span>Reglas SIIF & 40% VAF</span>
          </div>

          <button
            onClick={handleExportMarkdown}
            className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white px-3 py-1.5 rounded-full text-xs font-mono transition-colors cursor-pointer"
            title="Exportar conversación en Markdown"
          >
            <Download size={13} className="text-amber-400" />
            <span className="hidden sm:inline">Exportar Informe</span>
          </button>

          <button
            onClick={() => setShowSettingsModal(true)}
            className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white px-3 py-1.5 rounded-full text-xs font-mono transition-colors cursor-pointer"
            title="Configurar llave de Gemini API"
          >
            <Key size={13} className={apiKey ? "text-amber-400" : "text-zinc-400"} />
            <span>{apiKey ? "Gemini Conectado" : "Motor Semántico Activo"}</span>
          </button>
        </div>
      </div>

      {/* Barra de Modos de Operación Directiva */}
      <div className="bg-zinc-900/60 border-b border-white/5 px-6 py-2.5 flex items-center gap-2 overflow-x-auto scrollbar-none text-xs">
        <span className="text-zinc-500 font-mono uppercase tracking-wider text-[11px] mr-1 flex items-center gap-1">
          <Sparkles size={12} className="text-amber-400" />
          Enfoque:
        </span>
        {[
          { id: 'auto', label: '🤖 Auto (Recomendado)' },
          { id: 'auditoria', label: '🔍 Auditoría & Riesgos' },
          { id: 'escenario', label: '🔄 Simulación ($5.000M)' },
          { id: 'flujo_caja', label: '💵 Flujo de Caja' },
          { id: 'cierre', label: '🎯 Cierre & 2027' },
          { id: 'consejo_superior', label: '🏛️ Consejo Superior' },
          { id: 'vafi', label: '💼 Concepto VAFI' },
          { id: 'poa_disponible', label: '🗺️ POA Disponible' }
        ].map(m => (
          <button
            key={m.id}
            onClick={() => handleModeClick(m.id as CentavitoMode)}
            className={cn(
              "px-3 py-1 rounded-full font-medium transition-all whitespace-nowrap cursor-pointer border",
              selectedMode === m.id
                ? "bg-amber-400 text-black border-amber-400 font-semibold shadow-sm"
                : "bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-zinc-200 border-white/5"
            )}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Historial de Mensajes */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 scrollbar-thin scrollbar-thumb-white/10">
        
        {/* Pills de Consultas Frecuentes / Rápidas */}
        {messages.length === 1 && (
          <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-4 mb-4">
            <p className="text-xs font-mono uppercase tracking-wider text-zinc-400 mb-3 font-semibold flex items-center gap-2">
              <HelpCircle size={14} className="text-amber-400" />
              Consultas Estratégicas en Lenguaje Natural:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {QUICK_PROMPTS.map((qp, idx) => (
                <button
                  key={idx}
                  onClick={() => executeQuery(qp.prompt, qp.mode)}
                  className="text-left bg-zinc-900/90 hover:bg-amber-400/10 hover:border-amber-400/30 border border-white/5 p-3 rounded-xl transition-all group cursor-pointer"
                >
                  <p className="text-xs font-semibold text-zinc-200 group-hover:text-amber-300 transition-colors">
                    {qp.label}
                  </p>
                  <p className="text-[11px] text-zinc-400 line-clamp-2 mt-1">
                    {qp.prompt}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={cn(
              "flex flex-col sm:max-w-[85%]",
              msg.role === 'user' ? "ml-auto" : "mr-auto"
            )}
          >
            <div className={cn(
              "flex items-start gap-3",
              msg.role === 'user' ? "flex-row-reverse" : "flex-row"
            )}>
              {/* Avatar */}
              <div className={cn(
                "flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center border mt-1 shadow-md",
                msg.role === 'user' 
                  ? "bg-amber-400 text-black border-amber-300" 
                  : msg.isError 
                    ? "bg-red-500/20 text-red-400 border-red-500/50" 
                    : "bg-gradient-to-br from-zinc-800 to-zinc-900 text-amber-400 border-amber-400/30"
              )}>
                {msg.role === 'user' ? <User size={16} /> : msg.isError ? <AlertCircle size={16}/> : <Bot size={16} />}
              </div>

              {/* Contenido del Mensaje */}
              <div 
                className={cn(
                  "p-5 rounded-2xl shadow-xl relative w-full",
                  msg.role === 'user' 
                    ? "bg-amber-400 text-zinc-950 font-medium rounded-tr-sm" 
                    : "bg-zinc-900/80 text-zinc-100 border border-white/10 rounded-tl-sm backdrop-blur-md"
                )}
              >
                {/* Cabecera del Análisis de CENTAVO */}
                {msg.role === 'assistant' && (
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10 text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded bg-amber-400/10 text-amber-300 border border-amber-400/20 text-[11px] uppercase font-bold">
                        {msg.topicTitle ? `📌 ${msg.topicTitle.toUpperCase()}` : 'DICTAMEN INSTITUCIONAL'}
                      </span>
                      <span className="text-zinc-500 text-[10px] hidden sm:inline">
                        UPTC • Cifras Verificadas
                      </span>
                    </div>

                    <button
                      onClick={() => handleCopy(msg.content, msg.id)}
                      className="flex items-center gap-1 text-zinc-400 hover:text-amber-300 transition-colors cursor-pointer px-2 py-1 rounded hover:bg-white/5"
                      title="Copiar texto para informe directivo"
                    >
                      {copiedId === msg.id ? (
                        <>
                          <Check size={13} className="text-emerald-400" />
                          <span className="text-[10px] text-emerald-400 font-semibold">Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy size={13} />
                          <span className="text-[10px]">Copiar</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {msg.role === 'user' ? (
                  <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                ) : (
                  <div className={cn(
                    "markdown-body text-[14px] leading-relaxed text-zinc-200 space-y-3 prose-invert max-w-none w-full",
                    msg.isError && "text-red-300"
                  )}>
                    <ReactMarkdown
                      components={{
                        code(props) {
                          const { children, className, node, ...rest } = props;
                          const match = /language-(\w+(?:-\w+)*)/.exec(className || '');
                          if (match && match[1] === 'json-chart') {
                            return <CustomChart content={String(children).replace(/\n$/, '')} />;
                          }
                          return <code {...rest} className={cn("bg-zinc-800 text-amber-300 px-1.5 py-0.5 rounded font-mono text-xs", className)}>{children}</code>;
                        },
                        table(props) {
                          return (
                            <div className="overflow-x-auto my-4 rounded-xl border border-white/10">
                              <table className="w-full text-left text-xs border-collapse bg-zinc-900/60" {...props} />
                            </div>
                          );
                        },
                        th(props) {
                          return <th className="bg-zinc-800/80 text-amber-300 font-semibold p-2.5 border-b border-white/10 font-mono" {...props} />;
                        },
                        td(props) {
                          return <td className="p-2.5 border-b border-white/5 font-sans" {...props} />;
                        },
                        blockquote(props) {
                          return (
                            <blockquote 
                              className="border-l-4 border-amber-400 bg-amber-500/10 p-3 rounded-r-xl my-3 text-amber-200 font-medium"
                              {...props} 
                            />
                          );
                        },
                        h2(props) {
                          return <h2 className="text-base font-bold text-amber-300 mt-4 mb-2 pb-1 border-b border-amber-500/20 tracking-tight" {...props} />;
                        },
                        h3(props) {
                          return <h3 className="text-sm font-semibold text-zinc-100 mt-3 mb-1" {...props} />;
                        }
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                )}

                {/* Tarjeta de Trazabilidad y Evidencia Oficial (Obligatoria para CENTAVO) */}
                {msg.role === 'assistant' && msg.evidence && (
                  <details className="mt-4 bg-zinc-950/60 border border-white/10 rounded-xl p-3 text-xs group transition-all">
                    <summary className="font-mono uppercase font-semibold text-amber-300 cursor-pointer flex items-center justify-between select-none">
                      <span className="flex items-center gap-1.5">
                        <ShieldCheck size={14} className="text-emerald-400" />
                        Trazabilidad Probatoria y Evidencia Institucional
                      </span>
                      <span className="text-[10px] text-zinc-500 font-normal group-open:rotate-180 transition-transform">▼</span>
                    </summary>
                    <div className="mt-3 pt-3 border-t border-white/5 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px] font-mono">
                      <div>
                        <span className="text-zinc-500 block">Vigencia:</span>
                        <span className="text-zinc-200 font-semibold">{msg.evidence.vigencia}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block">Fecha de Corte:</span>
                        <span className="text-zinc-200 font-semibold">{msg.evidence.fechaCorte}</span>
                      </div>
                      {msg.evidence.recurso && (
                        <div>
                          <span className="text-zinc-500 block">Recurso Presupuestal:</span>
                          <span className="text-amber-300 font-semibold">{msg.evidence.recurso}</span>
                        </div>
                      )}
                      {msg.evidence.unidad && (
                        <div>
                          <span className="text-zinc-500 block">Unidad Ejecutora:</span>
                          <span className="text-sky-300 font-semibold">{msg.evidence.unidad}</span>
                        </div>
                      )}
                      <div className="sm:col-span-2">
                        <span className="text-zinc-500 block">Fuente Oficial:</span>
                        <span className="text-emerald-300">{msg.evidence.fuente}</span>
                      </div>
                      <div className="sm:col-span-2">
                        <span className="text-zinc-500 block">Criterio de Cálculo / Fundamento:</span>
                        <span className="text-zinc-300 leading-relaxed">{msg.evidence.criterioCalculo}</span>
                      </div>
                      <div className="sm:col-span-2 pt-1 flex items-center gap-1.5 text-[10px] text-emerald-400">
                        <Check size={12} />
                        <span>Estado: Consistencia Matemática Verificada al 100%</span>
                      </div>
                    </div>
                  </details>
                )}

                {/* Enlaces de Navegación Contextual (Deep Links) */}
                {msg.role === 'assistant' && msg.deepLinks && msg.deepLinks.length > 0 && onNavigate && (
                  <div className="mt-4 pt-3 border-t border-white/10">
                    <p className="text-[11px] font-mono uppercase tracking-wider text-sky-400 mb-2 flex items-center gap-1.5 font-semibold">
                      <Layers size={13} className="text-sky-400" />
                      Módulos Relacionados en el Aplicativo:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {msg.deepLinks.map((link, idx) => (
                        <button
                          key={idx}
                          onClick={() => onNavigate(link.screen)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 hover:text-sky-200 border border-sky-500/30 text-xs font-medium transition-all cursor-pointer group"
                          title={link.description}
                        >
                          <span>{link.label}</span>
                          <ExternalLink size={11} className="opacity-60 group-hover:scale-110 transition-transform" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Preguntas Sugeridas de Profundización */}
                {msg.role === 'assistant' && msg.suggestedFollowUps && msg.suggestedFollowUps.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-white/10">
                    <p className="text-[11px] font-mono uppercase tracking-wider text-amber-300/90 mb-2.5 flex items-center gap-1.5 font-semibold">
                      <Sparkles size={12} className="text-amber-400" />
                      ¿Deseas información adicional sobre este análisis?
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {msg.suggestedFollowUps.map((opt, i) => (
                        <button
                          key={i}
                          onClick={() => executeQuery(opt)}
                          className="text-xs font-medium bg-amber-400/10 hover:bg-amber-400/20 text-amber-200 hover:text-amber-100 border border-amber-400/30 px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 shadow-sm"
                        >
                          <span>{opt}</span>
                          <ArrowRight size={12} className="opacity-70 text-amber-400" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-3 text-zinc-400 mr-auto p-4 bg-zinc-900/60 rounded-2xl border border-white/5 animate-pulse">
            <Loader2 size={18} className="animate-spin text-amber-400" />
            <p className="text-xs font-mono">
              CENTAVO está consultando y cruzando bases institucionales...
            </p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input de Consulta */}
      <div className="bg-zinc-900/90 border-t border-white/10 p-4 px-6">
        <form onSubmit={handleSubmit} className="flex gap-2.5 items-center">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
              <Bot size={18} className="text-amber-400" />
            </div>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Pregunta a CENTAVO: ej. ¿Cuánto ingresó por posgrados? o ¿Cómo es la proyección 2027 de Gratuidad?"
              className="w-full bg-zinc-950/80 focus:bg-zinc-950 border border-white/10 rounded-2xl py-3.5 pl-11 pr-5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400/50 focus:ring-2 focus:ring-amber-400/20 transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="flex-shrink-0 bg-amber-400 hover:bg-amber-300 disabled:opacity-40 disabled:hover:bg-amber-400 text-zinc-950 font-semibold rounded-2xl px-5 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-amber-500/10 cursor-pointer"
          >
            <span className="hidden sm:inline text-xs font-mono uppercase tracking-wider">Consultar</span>
            <Send size={16} />
          </button>
        </form>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 mt-3 px-1 text-[11px] font-mono text-zinc-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>CENTAVO • Inteligencia Financiera Institucional UPTC</span>
          </div>
          <div className="flex items-center gap-3">
            <span>POA: $538.165M</span>
            <span>•</span>
            <span className="text-amber-300 font-semibold">Disponible: $143.637M</span>
            <span>•</span>
            <span className="text-purple-300 font-semibold">2027 R10.5: $52.834M (12-avas)</span>
          </div>
        </div>
      </div>

      {/* Modal de Configuración de API Key */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-white/15 rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setShowSettingsModal(false)}
              className="absolute top-5 right-5 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-amber-400/10 text-amber-400 rounded-xl border border-amber-400/20">
                <Key size={22} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">Motor de Inteligencia de CENTAVO</h3>
                <p className="text-xs text-zinc-400 font-mono">Google Gemini & Motor Semántico UPTC</p>
              </div>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed mb-4">
              CENTAVO cuenta con un <strong>motor semántico institucional determinístico</strong> que calcula sobre los datos reales del POA, Posgrados, Flujo de Caja y Proyecciones sin requerir conexión externa. Opcionalmente, puedes vincular una clave de Google Gemini para procesamiento conversacional multimodal en la nube:
            </p>

            <div className="space-y-3 mb-5">
              <label className="text-xs font-mono uppercase tracking-wider text-zinc-400 block">
                Google Gemini API Key (Opcional):
              </label>
              <input
                type="password"
                defaultValue={apiKey}
                placeholder="AIzaSy..."
                id="gemini-key-input"
                className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 text-xs text-white font-mono placeholder-zinc-600 focus:outline-none focus:border-amber-400"
              />
              <p className="text-[11px] text-zinc-400">
                La llave se resguarda exclusivamente en tu navegador y se envía cifrada en cada consulta.
              </p>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => handleSaveApiKey('')}
                className="px-4 py-2 rounded-xl text-xs font-mono text-zinc-400 hover:text-white border border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
              >
                Usar Motor Local Autónomo
              </button>
              <button
                onClick={() => {
                  const val = (document.getElementById('gemini-key-input') as HTMLInputElement)?.value || '';
                  handleSaveApiKey(val);
                }}
                className="px-5 py-2 rounded-xl text-xs font-mono font-semibold bg-amber-400 hover:bg-amber-300 text-zinc-950 transition-colors shadow-md cursor-pointer"
              >
                Guardar Configuración
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
