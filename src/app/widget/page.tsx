'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Logo from '@/components/Logo';
import { Send, Loader2 } from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  projectName: string;
}

function WidgetChatContent() {
  const searchParams = useSearchParams();
  const agentId = searchParams.get('agentId');

  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  // Load agent details
  useEffect(() => {
    if (!agentId) {
      setError('ID de agente faltante');
      setLoading(false);
      return;
    }

    const fetchAgent = async () => {
      try {
        const res = await fetch(`/api/public/agent?agentId=${agentId}`);
        if (!res.ok) {
          throw new Error('Agente no encontrado');
        }
        const data = await res.json();
        setAgent(data.agent);

        // Persistent browser-level device ID for session
        const sessionKey = `orchaix_widget_id_${agentId}`;
        let id = localStorage.getItem(sessionKey);
        if (!id) {
          id = crypto.randomUUID();
          localStorage.setItem(sessionKey, id);
        }
        setClientIdentifier(id);

        setMessages([
          { 
            sender: 'ai', 
            content: `¡Hola! ¿En qué puedo ayudarte hoy? Conversas con **${data.agent.name}**.` 
          }
        ]);
      } catch (err: any) {
        setError(err.message || 'Error al cargar el chatbot');
      } finally {
        setLoading(false);
      }
    };

    fetchAgent();
  }, [agentId]);

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
          platform: 'sdk',
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
        { sender: 'ai', content: `⚠️ Error: ${err.message || 'Inténtalo de nuevo.'}` },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full h-screen bg-[#18181b] flex items-center justify-center border border-zinc-800 rounded-2xl overflow-hidden">
        <Loader2 className="w-8 h-8 text-[#00e5ff] animate-spin" />
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="w-full h-screen bg-[#18181b] flex items-center justify-center p-4 border border-zinc-800 rounded-2xl text-center">
        <div>
          <p className="text-red-400 text-xs mb-2">⚠️ {error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="py-1 px-3 bg-zinc-900 border border-zinc-800 text-[10px] text-white rounded cursor-pointer"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-[#18181b] text-white flex flex-col border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
      {/* Header Widget */}
      <header className="px-4 py-3 border-b border-zinc-800 bg-[#18181b] flex items-center gap-2">
        <Logo size={24} />
        <div className="flex-1 min-w-0">
          <h1 className="text-xs font-bold text-white leading-tight truncate">{agent.name}</h1>
          <p className="text-[9px] text-zinc-500 truncate">Proyecto: {agent.projectName}</p>
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
        {messages.map((msg, index) => (
          <div 
            key={index}
            className={`flex flex-col max-w-[85%] ${msg.sender === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'}`}
          >
            <div 
              className={`p-2.5 rounded-xl text-xs leading-normal whitespace-pre-wrap ${
                msg.sender === 'user' 
                  ? 'bg-indigo-600 text-white rounded-tr-none' 
                  : 'bg-zinc-900 text-zinc-200 border border-zinc-800/80 rounded-tl-none'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {chatLoading && (
          <div className="flex flex-col max-w-[80%] mr-auto items-start">
            <div className="p-2.5 rounded-xl bg-zinc-900 text-zinc-400 border border-zinc-800 rounded-tl-none flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#00e5ff]" />
              <span className="text-[11px]">Escribiendo...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </main>

      {/* Input */}
      <footer className="p-3 border-t border-zinc-800 bg-[#18181b]">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            placeholder="Pregúntame algo..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={chatLoading}
            className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-[#00e5ff]/50 transition-all text-xs"
          />
          <button
            type="submit"
            disabled={chatLoading || !inputValue.trim()}
            className="p-2 bg-[#00e5ff] hover:bg-[#33ebff] disabled:bg-[#00e5ff]/40 rounded-lg text-zinc-950 transition-all cursor-pointer flex items-center justify-center"
          >
            <Send className="w-3.5 h-3.5 text-zinc-950" />
          </button>
        </form>
      </footer>
    </div>
  );
}

export default function WidgetChatPage() {
  return (
    <Suspense fallback={
      <div className="w-full h-screen bg-[#18181b] flex items-center justify-center border border-zinc-800 rounded-2xl overflow-hidden">
        <Loader2 className="w-8 h-8 text-[#00e5ff] animate-spin" />
      </div>
    }>
      <WidgetChatContent />
    </Suspense>
  );
}
