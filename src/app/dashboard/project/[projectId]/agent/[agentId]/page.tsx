'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter as useAppRouter, useParams as useAppParams } from 'next/navigation';
import Link from 'next/link';
import Logo from '@/components/Logo';
import { 
  ArrowLeft, Settings, Code, Send, Loader2, Sparkles, Check, Copy, RefreshCw, MessageSquare, HelpCircle, FileText, Plus, Trash2
} from 'lucide-react';

interface Document {
  id: string;
  title: string;
  content: string;
  sourceType: string;
  createdAt: string;
}

interface Agent {
  id: string;
  projectId: string;
  name: string;
  slug: string;
  rawInstruction: string | null;
  systemInstruction: string;
  telegramToken: string | null;
  createdAt: string;
  project: {
    name: string;
    slug: string;
  };
}

export default function AgentDetailPage() {
  const router = useAppRouter();
  const params = useAppParams();
  const projectId = params?.projectId as string;
  const agentId = params?.agentId as string;

  const [agent, setAgent] = useState<Agent | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'config' | 'training' | 'sdk'>('config');

  // Form State - Agent settings
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [rawInstruction, setRawInstruction] = useState('');
  const [systemInstruction, setSystemInstruction] = useState('');
  const [telegramToken, setTelegramToken] = useState('');
  const [isOrchestrating, setIsOrchestrating] = useState(false);
  const [configLoading, setConfigLoading] = useState(false);
  const [configSuccess, setConfigSuccess] = useState(false);
  const [configError, setConfigError] = useState('');

  // Form State - Documents (RAG)
  const [docTitle, setDocTitle] = useState('');
  const [docContent, setDocContent] = useState('');
  const [docLoading, setDocLoading] = useState(false);
  const [docError, setDocError] = useState('');

  // Chat Playground State
  const [messages, setMessages] = useState<{ sender: 'user' | 'ai'; content: string }[]>([
    { sender: 'ai', content: '¡Hola! Soy tu asistente en modo de prueba. Hazme cualquier pregunta para validar mis respuestas con los datos de negocio y directrices que me has configurado.' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Merchant details
  const [merchantUsername, setMerchantUsername] = useState('username');
  const [merchantCountry, setMerchantCountry] = useState('es');

  const fetchAgentData = useCallback(async (token: string) => {
    try {
      // 1. Fetch agent details
      const res = await fetch(`/api/projects/${projectId}/agents/${agentId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (res.status === 401) {
        localStorage.removeItem('merchant_token');
        router.push('/dashboard/login');
        return;
      }

      const data = await res.json();
      if (res.ok && data.agent) {
        const ag = data.agent as Agent;
        setAgent(ag);
        setName(ag.name);
        setSlug(ag.slug);
        setRawInstruction(ag.rawInstruction || '');
        setSystemInstruction(ag.systemInstruction);
        setTelegramToken(ag.telegramToken || '');
      } else {
        router.push(`/dashboard/project/${projectId}`);
        return;
      }

      // 2. Fetch agent documents (RAG)
      const resDocs = await fetch(`/api/projects/${projectId}/agents/${agentId}/documents`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const dataDocs = await resDocs.json();
      if (resDocs.ok && dataDocs.documents) {
        setDocuments(dataDocs.documents);
      }
    } catch (err) {
      console.error('Error fetching agent:', err);
      router.push(`/dashboard/project/${projectId}`);
    } finally {
      setLoading(false);
    }
  }, [projectId, agentId, router]);

  useEffect(() => {
    const token = localStorage.getItem('merchant_token');
    const storedMerchant = localStorage.getItem('merchant_data');

    if (!token || !projectId || !agentId) {
      router.push('/dashboard/login');
      return;
    }

    if (storedMerchant) {
      const m = JSON.parse(storedMerchant);
      setMerchantUsername(m.username);
      setMerchantCountry(m.country || 'es');
    }

    fetchAgentData(token);
  }, [projectId, agentId, router, fetchAgentData]);

  // Update Config
  const handleUpdateConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setConfigError('');
    setConfigSuccess(false);
    setConfigLoading(true);

    const token = localStorage.getItem('merchant_token');
    if (!token) return;

    try {
      const res = await fetch(`/api/projects/${projectId}/agents/${agentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          slug,
          rawInstruction,
          systemInstruction,
          telegramToken: telegramToken || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'No se pudo actualizar el chat de la IA');
      }

      setAgent(data.agent);
      setConfigSuccess(true);
      setTimeout(() => setConfigSuccess(false), 3000);
    } catch (err: any) {
      setConfigError(err.message || 'Error al conectar con el servidor');
    } finally {
      setConfigLoading(false);
    }
  };

  // Orchestrate (Edit page)
  const handleOrchestrateAgent = async () => {
    if (!rawInstruction.trim()) return;
    setConfigError('');
    setIsOrchestrating(true);

    const token = localStorage.getItem('merchant_token');
    if (!token) return;

    try {
      const res = await fetch('/api/orchestrate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ rawInstruction }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al orquestar la IA');
      
      setSystemInstruction(data.prompt);
      alert('IA Optimizada: ' + data.summary + '\n\nRecuerda hacer clic en "Guardar Configuración" para aplicar los cambios.');
    } catch (err: any) {
      setConfigError(err.message || 'Error de conexión con el Orquestador');
    } finally {
      setIsOrchestrating(false);
    }
  };

  // Add Document (RAG)
  const handleAddDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    setDocError('');
    setDocLoading(true);

    const token = localStorage.getItem('merchant_token');
    if (!token) return;

    try {
      const res = await fetch(`/api/projects/${projectId}/agents/${agentId}/documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: docTitle,
          content: docContent,
          sourceType: 'text',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'No se pudo cargar la información');
      }

      setDocuments([data.document, ...documents]);
      setDocTitle('');
      setDocContent('');
    } catch (err: any) {
      setDocError(err.message || 'Error de conexión');
    } finally {
      setDocLoading(false);
    }
  };

  // Delete Document (RAG)
  const handleDeleteDocument = async (docId: string) => {
    const token = localStorage.getItem('merchant_token');
    if (!token) return;

    try {
      const res = await fetch(`/api/projects/${projectId}/agents/${agentId}/documents/${docId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (res.ok) {
        setDocuments(documents.filter((d) => d.id !== docId));
      }
    } catch (err) {
      console.error('Error deleting document:', err);
    }
  };

  // Chat Playground Send
  const handlePlaygroundSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || chatLoading) return;

    const userMsg = inputValue.trim();
    setInputValue('');
    setMessages((prev) => [...prev, { sender: 'user', content: userMsg }]);
    setChatLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId,
          clientIdentifier: 'dashboard-agent-playground',
          message: userMsg,
          platform: 'web',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error en la respuesta del bot');
      }

      setMessages((prev) => [...prev, { sender: 'ai', content: data.response }]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { sender: 'ai', content: `⚠️ Error de simulación: ${err.message}` },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090b11] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-[#00e5ff] animate-spin" />
          <p className="text-zinc-400 text-sm">Cargando configuración del chat...</p>
        </div>
      </div>
    );
  }

  // URLs
  const projectSlug = agent?.project?.slug || 'proyecto';
  const agentSlug = agent?.slug || 'chat';

  const publicUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/${merchantCountry}/${merchantUsername}/${projectSlug}/${agentSlug}`
    : `/${merchantCountry}/${merchantUsername}/${projectSlug}/${agentSlug}`;

  const shareCode = `${merchantCountry}/${merchantUsername}/${projectSlug}/${agentSlug}`;

  const sdkScriptSnippet = `<script
  src="${typeof window !== 'undefined' ? window.location.origin : 'https://tudominio.com'}/sdk/chat-widget.js"
  data-agent-id="${agent?.id}"
></script>`;

  const iframeSnippet = `<iframe
  src="${typeof window !== 'undefined' ? window.location.origin : 'https://tudominio.com'}/widget?agentId=${agent?.id}"
  width="100%"
  height="600"
  style="border: none; border-radius: 12px;"
></iframe>`;

  return (
    <div className="min-h-screen bg-[#090b11] text-white flex flex-col">
      {/* Navbar Detail */}
      <nav className="border-b border-zinc-900 bg-[#090b11]/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center gap-4">
            <Link 
              href={`/dashboard/project/${projectId}`}
              className="p-2 rounded-lg hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <div className="flex items-center gap-2.5">
              <Logo size={28} />
              <div className="flex flex-col">
                <span className="font-extrabold text-sm tracking-tight text-white leading-none">
                  {agent?.name}
                </span>
                <span className="text-[10px] text-zinc-400 mt-1">
                  Chat de la IA del proyecto: {agent?.project?.name}
                </span>
              </div>
              <span className="text-[10px] text-[#00e5ff] font-mono bg-zinc-950 border border-[#00e5ff]/10 px-2 py-0.5 rounded ml-2">
                ID: {agent?.id}
              </span>
            </div>
          </div>
        </div>
      </nav>

      {/* Split Screen Layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Side: Configs / Integration tabs */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 border-b lg:border-b-0 lg:border-r border-zinc-900">
          <div className="max-w-3xl mx-auto">
            {/* Tab navigation */}
            <div className="flex gap-2 p-1 bg-zinc-950 border border-zinc-850 rounded-xl mb-8">
              <button
                onClick={() => setActiveTab('config')}
                className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'config' 
                    ? 'bg-zinc-900 text-white shadow border border-zinc-800' 
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                Instrucciones y Ajustes del Chat de la IA
              </button>

              <button
                onClick={() => setActiveTab('training')}
                className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'training' 
                    ? 'bg-zinc-900 text-white shadow border border-zinc-800' 
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Datos del Comercio (Chat de la IA)
              </button>

              <button
                onClick={() => setActiveTab('sdk')}
                className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'sdk' 
                    ? 'bg-zinc-900 text-white shadow border border-zinc-800' 
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Code className="w-3.5 h-3.5" />
                Widget e Integraciones
              </button>
            </div>

            {/* TAB 1: CONFIG */}
            {activeTab === 'config' && (
              <form onSubmit={handleUpdateConfig} className="space-y-6 animate-fade-in">
                {configError && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                    {configError}
                  </div>
                )}
                
                {configSuccess && (
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-1.5">
                    <Check className="w-4 h-4" />
                    ¡Configuración del chat guardada correctamente!
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block">
                      Nombre del Chat de la IA
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-950/40 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-[#00e5ff]/50 transition-all text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block">
                      Slug URL del Chat de la IA
                    </label>
                    <input
                      type="text"
                      required
                      value={slug}
                      onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                      className="w-full px-3 py-2 bg-zinc-950/40 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-[#00e5ff]/50 transition-all text-xs font-mono"
                    />
                  </div>
                </div>

                {/* System instructions */}
                <div className="space-y-4">
                  <div className="space-y-1.5 p-4 rounded-xl border border-purple-500/30 bg-purple-500/5">
                    <label className="text-xs font-semibold text-purple-300 uppercase tracking-wider flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" /> Instrucciones Simples
                      </span>
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Ej: Quiero que venda zapatos..."
                      value={rawInstruction}
                      onChange={(e) => setRawInstruction(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-950/40 border border-purple-500/30 rounded-lg text-white focus:outline-none focus:border-purple-400 transition-all text-xs resize-none"
                    />
                    <button
                      type="button"
                      onClick={handleOrchestrateAgent}
                      disabled={isOrchestrating || !rawInstruction.trim()}
                      className="w-full mt-2 py-2 px-4 bg-gradient-to-r from-purple-500 to-[#00e5ff] hover:from-purple-400 hover:to-[#33ebff] disabled:opacity-50 text-white font-bold rounded-lg text-xs transition-all shadow flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {isOrchestrating ? <Loader2 className="w-3.5 h-3.5 animate-spin text-white" /> : <Sparkles className="w-3.5 h-3.5 text-white" />}
                      {isOrchestrating ? 'Orquestando IA...' : 'Re-Optimizar con Orquestador IA'}
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        Instrucciones Técnicas (System Prompt)
                        <span title="Este es el prompt avanzado generado por el Orquestador. Puedes editarlo manualmente.">
                          <HelpCircle className="w-3.5 h-3.5 text-zinc-500" />
                        </span>
                      </span>
                    </label>
                    <textarea
                      required
                      rows={6}
                      value={systemInstruction}
                      onChange={(e) => setSystemInstruction(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-950/40 border border-zinc-800 rounded-lg text-zinc-400 focus:text-white focus:outline-none focus:border-[#00e5ff]/50 transition-all text-xs resize-none font-mono"
                    />
                    <p className="text-[10px] text-zinc-500 leading-normal">
                      Este Chat de la IA consultará de forma autónoma los documentos cargados en su pestaña de "Datos del Comercio".
                    </p>
                  </div>
                </div>

                {/* Telegram Bot Token */}
                <div className="space-y-1.5 border-t border-zinc-805 pt-5">
                  <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block">
                    Token del Bot de Telegram para este Chat de la IA (Opcional)
                  </label>
                  <input
                    type="password"
                    placeholder="Ej: 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                    value={telegramToken}
                    onChange={(e) => setTelegramToken(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950/40 border border-zinc-800 rounded-lg text-white placeholder-zinc-650 focus:outline-none focus:border-[#00e5ff]/50 transition-all text-xs font-mono"
                  />
                  <p className="text-[10px] text-zinc-500 leading-normal">
                    Si asignas un token de Telegram para este Chat de la IA, este bot responderá automáticamente en los chats de Telegram usando la personalidad de este Chat de la IA y sus datos del comercio.
                  </p>
                </div>

                {/* Save button */}
                <button
                  type="submit"
                  disabled={configLoading}
                  className="w-full py-2.5 px-4 bg-[#00e5ff] hover:bg-[#33ebff] disabled:bg-[#00e5ff]/40 text-zinc-950 font-bold rounded-lg text-xs transition-all shadow flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {configLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-950" /> : <RefreshCw className="w-3.5 h-3.5 text-zinc-950" />}
                  Guardar Configuración
                </button>
              </form>
            )}

            {/* TAB 2: TRAINING DOCUMENTS (RAG) */}
            {activeTab === 'training' && (
              <div className="space-y-8 animate-fade-in">
                <div className="glass rounded-2xl p-6 border border-zinc-850 relative overflow-hidden">
                  <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#00e5ff]" />
                    Cargar Datos para este Chat de la IA
                  </h3>
                  <p className="text-xs text-zinc-400 mb-4">
                    Agrega catálogos de precios, FAQs o políticas específicas para este Chat de la IA. Este asistente interactuará con el usuario basándose únicamente en esta información.
                  </p>

                  <form onSubmit={handleAddDocument} className="space-y-4">
                    {docError && (
                      <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                        {docError}
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">
                        Título de la Sección / Documento
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: Políticas de Reembolso, Lista de Productos"
                        value={docTitle}
                        onChange={(e) => setDocTitle(e.target.value)}
                        className="w-full px-3 py-2 bg-zinc-950/40 border border-zinc-800 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:border-[#00e5ff]/50 transition-all text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">
                        Contenido Seco (RAG Context)
                      </label>
                      <textarea
                        required
                        rows={5}
                        placeholder="Escribe la información detallada aquí. La IA no inventará datos fuera de esto."
                        value={docContent}
                        onChange={(e) => setDocContent(e.target.value)}
                        className="w-full px-3 py-2 bg-zinc-950/40 border border-zinc-800 rounded-lg text-white placeholder-zinc-650 focus:outline-none focus:border-[#00e5ff]/50 transition-all text-xs resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={docLoading}
                      className="w-full py-2.5 px-4 bg-[#00e5ff] hover:bg-[#33ebff] disabled:bg-[#00e5ff]/40 text-zinc-950 font-bold rounded-lg text-xs transition-all shadow flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {docLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-950" /> : <Plus className="w-3.5 h-3.5" />}
                      Cargar Datos de Negocio
                    </button>
                  </form>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-zinc-400 mb-4 uppercase tracking-wider block">
                    Datos Cargados en este Chat de la IA ({documents.length})
                  </h3>

                  {documents.length === 0 ? (
                    <div className="text-center py-12 rounded-2xl border border-dashed border-zinc-800 text-zinc-550 text-xs">
                      Este chat de la IA no tiene información cargada. Responderá de forma genérica o indicará que no posee datos.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {documents.map((doc) => (
                        <div 
                          key={doc.id}
                          className="glass rounded-xl p-4 flex justify-between items-start gap-4 border border-zinc-855 hover:border-zinc-800 transition-all"
                        >
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-bold text-white truncate">{doc.title}</h4>
                            <p className="text-[11px] text-zinc-400 mt-1 line-clamp-3 leading-relaxed whitespace-pre-line">
                              {doc.content}
                            </p>
                          </div>

                          <button
                            onClick={() => handleDeleteDocument(doc.id)}
                            className="p-1.5 rounded bg-zinc-900 border border-zinc-850 text-zinc-500 hover:text-red-400 hover:border-red-500/20 transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: SDK / INTEGRACIONES */}
            {activeTab === 'sdk' && (
              <div className="space-y-6 animate-fade-in">
                {/* Public link */}
                <div className="glass rounded-xl p-5 border border-zinc-850">
                  <h3 className="text-xs font-bold text-white mb-2 uppercase tracking-wider block">Enlace del Chat de la IA Público</h3>
                  <p className="text-[11px] text-zinc-400 mb-3">
                    Comparte esta URL directamente con tus clientes para que chateen con este Chat de la IA en pantalla completa.
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={publicUrl}
                      className="flex-1 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-300 font-mono focus:outline-none"
                    />
                    <button
                      onClick={() => copyToClipboard(publicUrl)}
                      className="px-3 bg-zinc-900 border border-zinc-800 rounded-lg hover:border-[#00e5ff]/20 text-zinc-350 hover:text-white transition-all cursor-pointer flex items-center justify-center"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="mt-3">
                    <a
                      href={publicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-[#00e5ff] hover:text-[#33ebff] font-semibold"
                    >
                      Abrir Chat de la IA Público
                      <ArrowLeft className="w-3 h-3 rotate-180" />
                    </a>
                  </div>
                </div>

                {/* HTML SDK Script */}
                <div className="glass rounded-xl p-5 border border-zinc-850">
                  <h3 className="text-xs font-bold text-white mb-2 uppercase tracking-wider block">Widget Inyectable SDK No-Code</h3>
                  <p className="text-[11px] text-zinc-400 mb-3">
                    Inserta este script en cualquier sitio web antes de cerrar la etiqueta <code className="text-[#00e5ff] font-mono">&lt;/body&gt;</code> para habilitar la burbuja de chat flotante de este Chat de la IA.
                  </p>
                  <div className="relative">
                    <pre className="bg-zinc-950 p-4 rounded-lg border border-zinc-800 text-[10px] text-zinc-350 font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed">
                      {sdkScriptSnippet}
                    </pre>
                    <button
                      onClick={() => copyToClipboard(sdkScriptSnippet)}
                      className="absolute top-3 right-3 p-1.5 bg-zinc-900 border border-zinc-800 rounded hover:border-[#00e5ff]/20 text-zinc-300 hover:text-white transition-all cursor-pointer"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Iframe Widget */}
                <div className="glass rounded-xl p-5 border border-zinc-850">
                  <h3 className="text-xs font-bold text-white mb-2 uppercase tracking-wider block">Widget Iframe Directo</h3>
                  <p className="text-[11px] text-zinc-400 mb-3">
                    Si prefieres incrustar el Chat de la IA directamente como una caja interactiva en tu diseño, usa este iframe:
                  </p>
                  <div className="relative">
                    <pre className="bg-zinc-950 p-4 rounded-lg border border-zinc-800 text-[10px] text-zinc-350 font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed">
                      {iframeSnippet}
                    </pre>
                    <button
                      onClick={() => copyToClipboard(iframeSnippet)}
                      className="absolute top-3 right-3 p-1.5 bg-zinc-900 border border-zinc-800 rounded hover:border-[#00e5ff]/20 text-zinc-300 hover:text-white transition-all cursor-pointer"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Human-Readable Share Code */}
                <div className="glass rounded-xl p-5 border border-zinc-850">
                  <h3 className="text-xs font-bold text-white mb-2 uppercase tracking-wider block">Código para Apps (Móvil / Escritorio)</h3>
                  <p className="text-[11px] text-zinc-400 mb-3">
                    Usa este código en la aplicación móvil de **Orchaix** para acceder de manera rápida y directa al Chat de la IA nativo:
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={shareCode}
                      className="flex-1 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-[#00e5ff] font-mono font-bold text-center focus:outline-none"
                    />
                    <button
                      onClick={() => copyToClipboard(shareCode)}
                      className="px-3 bg-zinc-900 border border-zinc-800 rounded-lg hover:border-[#00e5ff]/20 text-zinc-350 hover:text-white transition-all cursor-pointer flex items-center justify-center"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="mt-3">
                    <p className="text-[10px] text-zinc-550 leading-normal">
                      También puedes ingresar el ID de base de datos (`{agent?.id}`) para integraciones con APIs externas.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Chat Playground */}
        <div className="w-full lg:w-96 bg-zinc-950 border-t lg:border-t-0 border-zinc-850 flex flex-col h-[600px] lg:h-auto">
          {/* Header Playground */}
          <div className="p-4 border-b border-zinc-850 bg-zinc-950 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4.5 h-4.5 text-[#00e5ff]" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">Playground del Chat de la IA</span>
            </div>
            
            <button
              onClick={() => setMessages([{ sender: 'ai', content: '¡Simulador reiniciado! Hazme preguntas para validar las respuestas.' }])}
              className="p-1 rounded hover:bg-zinc-900 text-zinc-500 hover:text-zinc-350 transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Chat area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
            {messages.map((msg, index) => (
              <div 
                key={index}
                className={`flex flex-col max-w-[85%] ${msg.sender === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'}`}
              >
                <span className="text-[9px] text-zinc-500 mb-0.5 px-1 uppercase tracking-wider">
                  {msg.sender === 'user' ? 'Tú' : agent?.name || 'IA'}
                </span>
                <div 
                  className={`p-3 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                    msg.sender === 'user' 
                      ? 'bg-zinc-800 text-white border border-zinc-700 rounded-tr-none' 
                      : 'bg-zinc-900 text-zinc-200 border border-zinc-800/80 rounded-tl-none'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {chatLoading && (
              <div className="flex flex-col max-w-[80%] mr-auto items-start">
                <span className="text-[9px] text-zinc-500 mb-0.5 px-1">{agent?.name || 'IA'}</span>
                <div className="p-3 rounded-2xl bg-zinc-900 text-zinc-400 border border-zinc-800 rounded-tl-none flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#00e5ff]" />
                  <span className="text-xs">Pensando...</span>
                </div>
              </div>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handlePlaygroundSend} className="p-4 border-t border-zinc-850 bg-zinc-950">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Pregúntale cosas al chat..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                disabled={chatLoading}
                className="flex-1 px-4 py-2.5 bg-zinc-900 border border-zinc-850 rounded-xl text-white placeholder-zinc-550 focus:outline-none focus:border-[#00e5ff]/50 transition-all text-xs"
              />
              <button
                type="submit"
                disabled={chatLoading || !inputValue.trim()}
                className="p-2.5 bg-[#00e5ff] hover:bg-[#33ebff] disabled:bg-[#00e5ff]/40 rounded-xl text-zinc-950 transition-all shadow shadow-[#00e5ff]/10 cursor-pointer flex items-center justify-center"
              >
                <Send className="w-4 h-4 text-zinc-950" />
              </button>
            </div>
            <p className="text-[9px] text-zinc-500 text-center mt-2 font-mono text-[9px]">
              Platform: web | Playground Session
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
