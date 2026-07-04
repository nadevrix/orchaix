'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Logo from '@/components/Logo';
import AgentAvatar from '@/components/AgentAvatar';
import TypingIndicator from '@/components/TypingIndicator';
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
      <div className="w-full h-screen bg-white flex items-center justify-center border border-slate-200 rounded-2xl overflow-hidden shadow-md">
        <Loader2 className="w-8 h-8 text-[#0F766E] animate-spin" />
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="w-full h-screen bg-white flex items-center justify-center p-4 border border-slate-200 rounded-2xl text-center shadow-md">
        <div>
          <p className="text-red-600 text-xs mb-2">⚠️ {error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="py-1.5 px-3 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-[10px] text-slate-700 font-semibold rounded cursor-pointer transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-white text-slate-900 flex flex-col border border-slate-200 rounded-2xl overflow-hidden shadow-2xl">
      {/* Header Widget */}
      <header className="px-4 py-3 border-b border-slate-100 bg-white flex items-center gap-2.5 shadow-sm z-10">
        <AgentAvatar name={agent.name} size={30} />
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-bold text-slate-900 leading-tight truncate">{agent.name}</h1>
          <p className="text-[10px] text-slate-500 truncate">Proyecto: {agent.projectName}</p>
        </div>
        <Logo size={20} showText={false} />
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin bg-white">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex gap-2 max-w-[85%] animate-message-in ${msg.sender === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
          >
            {msg.sender === 'ai' && <AgentAvatar name={agent.name} size={24} />}
            <div
              className={`p-2.5 rounded-xl text-sm leading-normal whitespace-pre-wrap shadow-sm min-w-0 ${
                msg.sender === 'user'
                  ? 'bg-[#0F766E] text-white rounded-tr-none'
                  : 'bg-slate-50 text-slate-700 border border-slate-200 rounded-tl-none'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {chatLoading && (
          <div className="flex gap-2 max-w-[80%] mr-auto animate-message-in">
            <AgentAvatar name={agent.name} size={24} />
            <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 rounded-tl-none shadow-sm">
              <TypingIndicator />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </main>

      {/* Input */}
      <footer className="p-3 border-t border-slate-200 bg-slate-50">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            placeholder="Pregúntame algo..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={chatLoading}
            className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0F766E] focus:ring-1 focus:ring-[#0F766E] transition-all text-sm shadow-sm"
          />
          <button
            type="submit"
            disabled={chatLoading || !inputValue.trim()}
            className="p-2 bg-[#0F766E] hover:bg-[#115E59] disabled:opacity-50 rounded-lg text-white transition-all cursor-pointer flex items-center justify-center shadow-sm"
          >
            <Send className="w-3.5 h-3.5 text-white" />
          </button>
        </form>
      </footer>
    </div>
  );
}

export default function WidgetChatPage() {
  return (
    <Suspense fallback={
      <div className="w-full h-screen bg-white flex items-center justify-center border border-slate-200 rounded-2xl overflow-hidden shadow-md">
        <Loader2 className="w-8 h-8 text-[#0F766E] animate-spin" />
      </div>
    }>
      <WidgetChatContent />
    </Suspense>
  );
}
