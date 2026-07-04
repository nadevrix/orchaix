'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import AgentAvatar from '@/components/AgentAvatar';
import TypingIndicator from '@/components/TypingIndicator';
import MarkdownMessage from '@/components/MarkdownMessage';
import { Send, Loader2, AlertTriangle, ShieldAlert, CheckCircle, RefreshCw } from 'lucide-react';

interface AgentDetails {
  id: string;
  name: string;
  slug: string;
  projectId: string;
  projectName: string;
  restrictedCountries: string[];
  merchantUsername: string;
  merchantBusinessName: string;
}

export default function PublicAgentChatPage() {
  const params = useParams();
  const country = (params?.country as string || '').toLowerCase();
  const username = params?.username as string;
  const projectSlug = params?.project_slug as string;
  const agentSlug = params?.agent_slug as string;

  const [agent, setAgent] = useState<AgentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isRestricted, setIsRestricted] = useState(false);

  // Chat state
  const [messages, setMessages] = useState<{ sender: 'user' | 'ai'; content: string }[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [clientIdentifier, setClientIdentifier] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, chatLoading]);

  // Load agent details and check restrictions
  useEffect(() => {
    if (!username || !projectSlug || !agentSlug) return;

    const fetchAgent = async () => {
      try {
        const res = await fetch(`/api/public/agent?username=${username}&projectSlug=${projectSlug}&agentSlug=${agentSlug}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'No se pudo cargar el agente de IA');
        }

        const ag = data.agent as AgentDetails;
        setAgent(ag);

        // Check country restriction from parent project
        if (ag.restrictedCountries && ag.restrictedCountries.includes(country)) {
          setIsRestricted(true);
        } else {
          // Initialize or load client identifier for persistence per Agent
          const sessionKey = `orchaix_client_id_${ag.id}`;
          let id = localStorage.getItem(sessionKey);
          if (!id) {
            id = crypto.randomUUID();
            localStorage.setItem(sessionKey, id);
          }
          setClientIdentifier(id);

          // Add default welcome message
          setMessages([
            { 
              sender: 'ai', 
              content: `¡Hola! Bienvenido al canal de **${ag.name}** de **${ag.merchantBusinessName}**. ¿En qué puedo ayudarte hoy?` 
            }
          ]);
        }
      } catch (err: any) {
        setError(err.message || 'Error al conectar con el servidor');
      } finally {
        setLoading(false);
      }
    };

    fetchAgent();
  }, [country, username, projectSlug, agentSlug]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || chatLoading || !agent || !clientIdentifier) return;

    const text = inputValue.trim();
    setInputValue('');
    setMessages((prev) => [...prev, { sender: 'user', content: text }]);
    setChatLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: agent.id,
          clientIdentifier,
          message: text,
          platform: 'web',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'La IA no pudo procesar tu mensaje');
      }

      setMessages((prev) => [...prev, { sender: 'ai', content: data.response }]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { sender: 'ai', content: `⚠️ Error de conexión: ${err.message || 'Inténtalo de nuevo.'}` },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-[#0F766E] animate-spin" />
          <p className="text-slate-500 text-sm">Cargando chat seguro...</p>
        </div>
      </div>
    );
  }

  // Restricted Access Screen
  if (isRestricted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-red-500/5 blur-3xl" />
        
        <div className="bg-white shadow-xl rounded-3xl p-8 max-w-md w-full text-center relative z-10 border border-red-100">
          <div className="w-16 h-16 rounded-full bg-red-50 border border-red-200 flex items-center justify-center mx-auto mb-6">
            <ShieldAlert className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Contenido no disponible</h2>
          <p className="text-slate-600 text-sm leading-relaxed">
            Lo sentimos, el propietario de **{agent?.merchantBusinessName}** ha configurado restricciones de acceso que impiden cargar este chatbot en tu ubicación (<span className="uppercase text-red-500 font-bold font-mono">{country}</span>).
          </p>
        </div>
      </div>
    );
  }

  // Error Screen
  if (error || !agent) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
        <div className="bg-white shadow-xl rounded-3xl p-8 max-w-md w-full text-center border border-yellow-200">
          <div className="w-16 h-16 rounded-full bg-yellow-50 border border-yellow-200 flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-8 h-8 text-yellow-500" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-1">Enlace Inválido</h2>
          <p className="text-slate-600 text-sm mb-6">
            El agente de IA que intentas abrir no existe o el enlace está mal configurado.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-1.5 py-2 px-4 bg-white border border-slate-300 text-xs font-semibold rounded-xl text-slate-700 hover:bg-slate-50 cursor-pointer shadow-sm transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-slate-50 flex flex-col justify-between overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-96 bg-[#0F766E]/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-30 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <AgentAvatar name={agent.name} size={36} />
          <div>
            <h1 className="text-sm font-bold text-slate-900 leading-tight">{agent.name}</h1>
            <p className="text-[11px] text-slate-500">Proyecto: {agent.projectName} | {agent.merchantBusinessName}</p>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-[#0F766E]/10 border border-[#0F766E]/20 py-1 px-2.5 rounded-full text-[9px] font-bold text-[#0F766E] uppercase tracking-widest">
          <CheckCircle className="w-3 h-3 text-[#0F766E] mr-0.5" /> Oficial
        </div>
      </header>

      {/* Chat Messages Log */}
      <main className="flex-1 overflow-y-auto px-6 py-8 space-y-4 max-w-3xl w-full mx-auto scrollbar-thin">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex gap-2.5 max-w-[85%] animate-message-in ${
              msg.sender === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
            }`}
          >
            {msg.sender === 'ai' && <AgentAvatar name={agent.name} size={30} />}
            <div className={`flex flex-col min-w-0 ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
              <span className="text-[10px] text-slate-400 mb-0.5 px-1 uppercase tracking-wider">
                {msg.sender === 'user' ? 'Tú' : agent.name}
              </span>
              <div
                className={`p-3.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-sm ${
                  msg.sender === 'user'
                    ? 'bg-[#0F766E] text-white rounded-tr-none border border-[#115E59]'
                    : 'bg-white text-slate-700 border border-slate-200 rounded-tl-none'
                }`}
              >
                {msg.sender === 'ai' ? <MarkdownMessage content={msg.content} /> : msg.content}
              </div>
            </div>
          </div>
        ))}

        {chatLoading && (
          <div className="flex gap-2.5 max-w-[80%] mr-auto animate-message-in">
            <AgentAvatar name={agent.name} size={30} />
            <div className="flex flex-col items-start">
              <span className="text-[10px] text-slate-400 mb-0.5 px-1 uppercase tracking-wider">{agent.name}</span>
              <div className="px-4 py-3 rounded-2xl bg-white border border-slate-200 rounded-tl-none shadow-sm">
                <TypingIndicator />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </main>

      {/* Input Form */}
      <footer className="border-t border-slate-200 bg-white/80 backdrop-blur-md p-4 sticky bottom-0 shadow-[0_-4px_15px_-3px_rgba(0,0,0,0.05)]">
        <div className="max-w-3xl mx-auto w-full">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              placeholder="Escribe tu consulta aquí..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={chatLoading}
              className="flex-1 px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0F766E] focus:ring-1 focus:ring-[#0F766E] transition-all text-sm shadow-sm"
            />
            <button
              type="submit"
              disabled={chatLoading || !inputValue.trim()}
              className="p-3 bg-[#0F766E] hover:bg-[#115E59] disabled:opacity-50 rounded-xl text-white transition-all shadow-sm cursor-pointer flex items-center justify-center"
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </form>
          <div className="flex items-center justify-center gap-1 mt-3 text-[9px] text-slate-400">
            Powered by Orchaix Platform
          </div>
        </div>
      </footer>
    </div>
  );
}
