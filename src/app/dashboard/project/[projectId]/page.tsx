'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Logo from '@/components/Logo';
import { 
  ArrowLeft, Bot, Plus, Loader2, Sparkles, Trash2, ArrowRight, Check, AlertCircle, MessageSquare
} from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  slug: string;
  systemInstruction: string;
  telegramToken: string | null;
  createdAt: string;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  createdAt: string;
}

export default function ProjectDetailPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params?.projectId as string;

  const [project, setProject] = useState<Project | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Agent Form State
  const [agentName, setAgentName] = useState('');
  const [agentSlug, setAgentSlug] = useState('');
  const [agentInstruction, setAgentInstruction] = useState('');
  const [agentLoading, setAgentLoading] = useState(false);
  const [agentError, setAgentError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Auto-generate agent slug from name
  const handleAgentNameChange = (val: string) => {
    setAgentName(val);
    const generated = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-');
    setAgentSlug(generated);
  };

  const fetchProjectData = useCallback(async (token: string) => {
    try {
      // 1. Fetch project details
      const resProj = await fetch(`/api/projects/${projectId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (resProj.status === 401) {
        localStorage.removeItem('merchant_token');
        router.push('/dashboard/login');
        return;
      }

      const dataProj = await resProj.json();
      if (resProj.ok && dataProj.project) {
        setProject(dataProj.project);
      } else {
        router.push('/dashboard');
        return;
      }

      // 2. Fetch project agents (Chats de la IA)
      const resAgents = await fetch(`/api/projects/${projectId}/agents`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const dataAgents = await resAgents.json();
      if (resAgents.ok && dataAgents.agents) {
        setAgents(dataAgents.agents);
      }
    } catch (err) {
      console.error('Error fetching project data:', err);
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  }, [projectId, router]);

  useEffect(() => {
    const token = localStorage.getItem('merchant_token');
    if (!token || !projectId) {
      router.push('/dashboard/login');
      return;
    }
    fetchProjectData(token);
  }, [projectId, router, fetchProjectData]);

  // Create Agent (Chat de la IA)
  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    setAgentError('');
    setAgentLoading(true);

    const token = localStorage.getItem('merchant_token');
    if (!token) return;

    const defaultInstruction = agentInstruction || `Eres el chatbot oficial de este proyecto. Sé amable y responde basándote en los datos de negocio que cargaremos en tu sección.`;

    try {
      const res = await fetch(`/api/projects/${projectId}/agents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: agentName,
          slug: agentSlug.toLowerCase(),
          systemInstruction: defaultInstruction,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'No se pudo crear el chat de la IA');
      }

      setAgents([...agents, data.agent]);
      setAgentName('');
      setAgentSlug('');
      setAgentInstruction('');
      setShowCreateForm(false);
    } catch (err: any) {
      setAgentError(err.message || 'Error de conexión');
    } finally {
      setAgentLoading(false);
    }
  };

  // Delete Agent (Chat de la IA)
  const handleDeleteAgent = async (agentId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este chat de la IA? Se borrarán de forma permanente sus configuraciones, datos de entrenamiento cargados y sesiones de conversación.')) return;

    const token = localStorage.getItem('merchant_token');
    if (!token) return;

    try {
      const res = await fetch(`/api/projects/${projectId}/agents/${agentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (res.ok) {
        setAgents(agents.filter((a) => a.id !== agentId));
      }
    } catch (err) {
      console.error('Error deleting agent:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090b11] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-[#00e5ff] animate-spin" />
          <p className="text-zinc-400 text-sm">Cargando proyecto...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090b11] text-white flex flex-col">
      {/* Navbar */}
      <nav className="border-b border-zinc-900 bg-[#090b11]/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center gap-4">
            <Link 
              href="/dashboard"
              className="p-2 rounded-lg hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <div className="flex items-center gap-2.5">
              <Logo size={28} />
              <span className="font-extrabold text-sm tracking-tight text-white">
                {project?.name}
              </span>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
        <div className="space-y-6">
          {/* Header section & Create button */}
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-zinc-900 pb-6">
            <div>
              <h1 className="text-2xl font-extrabold text-white">Chats de la IA</h1>
              <p className="text-xs text-zinc-400 mt-1">
                Administra los chats de la IA independientes de este proyecto. Cada chat puede tener su personalidad, sus propios datos y su URL única.
              </p>
            </div>

            {!showCreateForm && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="py-2.5 px-4 bg-[#00e5ff] hover:bg-[#33ebff] text-zinc-950 font-bold rounded-xl text-xs transition-all shadow flex items-center justify-center gap-1.5 cursor-pointer self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                Nuevo Chat de la IA
              </button>
            )}
          </div>

          {/* Create Agent Form */}
          {showCreateForm && (
            <div className="glass rounded-2xl p-6 border border-zinc-850 animate-fade-in">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Registrar Nuevo Chat de la IA</h4>
                <button 
                  onClick={() => setShowCreateForm(false)}
                  className="text-xs text-zinc-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
              </div>

              <form onSubmit={handleCreateAgent} className="space-y-4">
                {agentError && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                    {agentError}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">
                      Nombre del Chat de la IA
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Asistente Ventas, Soporte Tecnico"
                      value={agentName}
                      onChange={(e) => handleAgentNameChange(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-950/40 border border-zinc-800 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:border-[#00e5ff]/50 transition-all text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">
                      Slug URL del Chat de la IA
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: ventas, soporte"
                      value={agentSlug}
                      onChange={(e) => setAgentSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                      className="w-full px-3 py-2 bg-zinc-950/40 border border-zinc-800 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:border-[#00e5ff]/50 transition-all text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">
                    Instrucciones de comportamiento (System Prompt)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Ej: Eres un experto en ventas de calzado deportivo. Saluda y guía al usuario para realizar su compra..."
                    value={agentInstruction}
                    onChange={(e) => setAgentInstruction(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950/40 border border-zinc-800 rounded-lg text-white placeholder-zinc-655 focus:outline-none focus:border-[#00e5ff]/50 transition-all text-xs resize-none"
                  />
                  <p className="text-[10px] text-zinc-500">
                    Al crear este chat de la IA, podrás ingresar a su configuración para cargar los datos del comercio y FAQs específicos que usará para responder.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={agentLoading}
                  className="w-full py-2.5 px-4 bg-[#00e5ff] hover:bg-[#33ebff] disabled:bg-[#00e5ff]/40 text-zinc-950 font-bold rounded-lg text-xs transition-all shadow flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {agentLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-950" /> : <Plus className="w-3.5 h-3.5" />}
                  Crear Chat de la IA
                </button>
              </form>
            </div>
          )}

          {/* List of Agents (Chats de la IA) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            {agents.length === 0 ? (
              <div className="col-span-2 text-center py-16 rounded-3xl border border-dashed border-zinc-850 text-zinc-500 text-xs">
                <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-3">
                  <MessageSquare className="w-5 h-5 text-zinc-550" />
                </div>
                No hay chats de la IA creados en este proyecto. Haz clic en "Nuevo Chat de la IA" para dar de alta el primero.
              </div>
            ) : (
              agents.map((agent) => (
                <div 
                  key={agent.id}
                  className="glass rounded-2xl p-5 border border-zinc-850 hover:border-zinc-800 transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-zinc-950 border border-[#00e5ff]/15 flex items-center justify-center group-hover:border-[#00e5ff]/25 transition-colors">
                        <Bot className="w-4 h-4 text-[#00e5ff]" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">{agent.name}</h4>
                        <span className="text-[10px] text-[#00e5ff]/80 font-mono">slug: {agent.slug}</span>
                      </div>
                    </div>

                    <p className="text-[11px] text-zinc-400 line-clamp-3 leading-relaxed mt-2.5 mb-4 h-12">
                      {agent.systemInstruction}
                    </p>
                  </div>

                  <div className="flex gap-2 border-t border-zinc-850/50 pt-4 mt-2">
                    <Link
                      href={`/dashboard/project/${projectId}/agent/${agent.id}`}
                      className="flex-1 py-1.5 px-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-xs font-semibold text-center text-white flex items-center justify-center gap-1 transition-all cursor-pointer"
                    >
                      Configurar Chat de la IA
                      <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
                    </Link>

                    <button
                      onClick={() => handleDeleteAgent(agent.id)}
                      className="p-2 bg-zinc-950 border border-zinc-850 hover:border-red-500/20 text-zinc-500 hover:text-red-400 rounded-lg transition-all cursor-pointer"
                      title="Eliminar Chat de la IA"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
