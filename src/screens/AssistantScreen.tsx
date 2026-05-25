import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, FileText, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '../lib/utils';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isError?: boolean;
}

function CustomChart({ content }: { content: string }) {
  try {
    const config = JSON.parse(content);
    if (!config.type || !config.data) return null;

    if (config.type === 'bar') {
      return (
        <div className="w-full h-64 mt-4 bg-surface-container-high/30 rounded-xl p-4 border border-white/5">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={config.data}>
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `$${(val / 1e6).toFixed(0)}M`} />
              <RechartsTooltip 
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                contentStyle={{ backgroundColor: '#1a2a4c', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                formatter={(value: any) => [`$${(value as number).toLocaleString('es-CO')}`, 'Valor']}
              />
              <Bar dataKey="value" fill="#ffcc29" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      );
    }
    
    if (config.type === 'pie') {
       const COLORS = ['#ffcc29', '#4ade80', '#7bd0ff', '#f472b6', '#a78bfa'];
       return (
        <div className="w-full h-64 mt-4 bg-surface-container-high/30 rounded-xl p-4 border border-white/5">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={config.data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {config.data.map((_: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <RechartsTooltip 
                contentStyle={{ backgroundColor: '#1a2a4c', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                formatter={(value: any) => [value.toLocaleString('es-CO'), 'Cantidad/Valor']}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
       );
    }
  } catch (e) {
    return <code className="text-red-400 block p-2 bg-red-950/20 rounded">{content}</code>;
  }
  return null;
}

export function AssistantScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'greeting',
      role: 'assistant',
      content: '¿En qué te puedo ayudar hoy?'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim()
    };

    const currentMessages = [...messages, userMessage];
    setMessages(currentMessages);
    setInput('');
    setIsLoading(true);

    try {
      // Exclude greeting and format history
      const history = currentMessages
        .filter(m => m.id !== 'greeting' && m.role !== 'system')
        .map(m => ({ role: m.role, content: m.content }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userMessage.content, history: history.slice(0, -1) }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response');
      }

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.text
        }
      ]);
    } catch (error: any) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Lo siento, ocurrió un error al intentar conectarme con mi base de conocimientos. Por favor verifica tu llave de API de Gemini.',
          isError: true
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-4xl mx-auto bg-surface-container-low/30 backdrop-blur-md border border-white/10 rounded-[32px] overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="bg-primary-container/10 border-b border-white/5 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary-container text-black rounded-2xl">
            <Bot size={28} className="drop-shadow-lg" />
          </div>
          <div>
            <h2 className="text-2xl font-display font-bold text-white tracking-tight">Centavito Asistente VAFI</h2>
            <p className="text-sm text-primary-container/80 font-mono tracking-widest mt-1">
              CONSULTA DE PROYECTOS UPTC
            </p>
          </div>
        </div>
        <div className="flex bg-white/5 border border-white/10 rounded-full px-4 py-2 items-center gap-2 text-xs font-mono text-on-surface-variant">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          Sistema de Conocimiento Conectado
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 sm:px-8 space-y-6 scrollbar-thin scrollbar-thumb-white/10">
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={cn(
              "flex flex-col sm:max-w-[80%]",
              msg.role === 'user' ? "ml-auto" : "mr-auto"
            )}
            style={{ animationFillMode: 'forwards' }}
          >
            <div className={cn(
              "flex items-end gap-3",
              msg.role === 'user' ? "flex-row-reverse" : "flex-row"
            )}>
              <div className={cn(
                "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center border",
                msg.role === 'user' 
                  ? "bg-primary-container text-black border-primary-container/20" 
                  : msg.isError ? "bg-red-500/20 text-red-400 border-red-500/50" : "bg-surface-container-high/60 text-[#7bd0ff] border-[#7bd0ff]/20"
              )}>
                {msg.role === 'user' ? <User size={16} /> : msg.isError ? <AlertCircle size={16}/> : <Bot size={16} />}
              </div>
              <div 
                className={cn(
                  "p-4 rounded-2xl sm:p-5 shadow-lg relative w-full",
                  msg.role === 'user' 
                    ? "bg-primary-container text-black rounded-br-sm inline-block" 
                    : "bg-surface-container-high/40 text-on-surface border border-white/5 rounded-bl-sm backdrop-blur-sm"
                )}
              >
                {msg.role === 'user' ? (
                  <p className="text-[15px] leading-relaxed font-medium">{msg.content}</p>
                ) : (
                  <div className={cn(
                    "markdown-body text-[15px] leading-relaxed prose prose-invert max-w-none w-full",
                    msg.isError && "text-red-200"
                  )}>
                    <ReactMarkdown
                       components={{
                         code(props) {
                           const { children, className, node, ...rest } = props;
                           const match = /language-(\w+(?:-\w+)*)/.exec(className || '');
                           if (match && match[1] === 'json-chart') {
                              return <CustomChart content={String(children).replace(/\n$/, '')} />;
                           }
                           return <code {...rest} className={className}>{children}</code>;
                         }
                       }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
            <span className={cn(
              "text-[10px] font-mono mt-1 px-11 opacity-50",
              msg.role === 'user' ? "text-right text-primary-container" : "text-left text-[#7bd0ff]"
            )}>
             {msg.role === 'user' ? 'Tú' : 'Centavito Asistente VAFI'}
            </span>
          </div>
        ))}
        {isLoading && (
          <div className="flex w-full">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-surface-container-high/60 text-[#7bd0ff] border border-[#7bd0ff]/20">
                <Loader2 size={16} className="animate-spin" />
              </div>
              <div className="bg-surface-container-high/40 border border-white/5 rounded-2xl rounded-bl-sm p-4 px-5 flex gap-2 w-20">
                <div className="w-2 h-2 rounded-full bg-[#7bd0ff]/60 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 rounded-full bg-[#7bd0ff]/60 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 rounded-full bg-[#7bd0ff]/60 animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-surface-container-low border-t border-white/5 p-4 sm:p-6">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <div className="relative flex-1 group">
            <div className="absolute inset-y-0 left-4 items-center flex pointer-events-none text-white/30 group-focus-within:text-primary-container transition-colors">
              <FileText size={20} />
            </div>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ej: ¿Cuál es el presupuesto para Nómina Docente?"
              className="w-full bg-surface-container focus:bg-white/5 border border-white/10 rounded-full py-4 pl-12 pr-6 text-white placeholder-white/30 focus:outline-none focus:border-primary-container/50 focus:shadow-[0_0_15px_rgba(255,204,41,0.2)] transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="flex-shrink-0 bg-primary-container hover:bg-[#e6b825] disabled:opacity-50 disabled:hover:bg-primary-container text-black rounded-full h-[54px] w-[54px] flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-lg disabled:hover:scale-100"
          >
            <Send size={20} className="ml-1" />
          </button>
        </form>
        <p className="text-center text-[10px] uppercase font-mono tracking-widest text-on-surface-variant mt-4">
          Responde según directrices financieras de la UPTC / Versión 1.0 (RAG-Gemini)
        </p>
      </div>
    </div>
  );
}
