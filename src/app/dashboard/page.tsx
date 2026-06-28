'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Logo from '@/components/Logo';
import { 
  Plus, Folder, PlusCircle, Bot, 
  FileText, LogOut, Loader2, ArrowRight, User 
} from 'lucide-react';

interface Project {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  createdAt: string;
  _count: {
    documents: number;
    agents: number;
  };
}

interface Merchant {
  id: string;
  email: string;
  username: string;
  businessName: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectSlug, setNewProjectSlug] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');

  // Auto-generate slug from name
  const handleNameChange = (name: string) => {
    setNewProjectName(name);
    const generated = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-');
    setNewProjectSlug(generated);
  };

  const logout = useCallback(() => {
    localStorage.removeItem('merchant_token');
    localStorage.removeItem('merchant_data');
    router.push('/dashboard/login');
  }, [router]);

  const fetchDashboardData = useCallback(async (token: string) => {
    try {
      const res = await fetch('/api/projects', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (res.status === 401) {
        logout();
        return;
      }

      const data = await res.json();
      if (res.ok) {
        setProjects(data.projects || []);
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
    } finally {
      setLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    const token = localStorage.getItem('merchant_token');
    const storedMerchant = localStorage.getItem('merchant_data');

    if (!token || !storedMerchant) {
      router.push('/dashboard/login');
      return;
    }

    setMerchant(JSON.parse(storedMerchant));
    fetchDashboardData(token);
  }, [router, fetchDashboardData]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');
    setModalLoading(true);

    const token = localStorage.getItem('merchant_token');
    if (!token) return;

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newProjectName,
          slug: newProjectSlug,
          description: newProjectDesc,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'No se pudo crear el proyecto');
      }

      // Format count correctly for client-side list append
      const prependedProject = {
        ...data.project,
        _count: {
          documents: 0,
          agents: 0,
        }
      };

      setProjects([prependedProject, ...projects]);
      
      // Reset & close modal
      setIsModalOpen(false);
      setNewProjectName('');
      setNewProjectSlug('');
      setNewProjectDesc('');
    } catch (err: any) {
      setModalError(err.message || 'Error al conectar con el servidor');
    } finally {
      setModalLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090b11] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-[#00e5ff] animate-spin" />
          <p className="text-zinc-400 text-sm">Cargando tu dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090b11] text-white">
      {/* Navbar */}
      <nav className="border-b border-zinc-900 bg-[#090b11]/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2.5">
              <Logo size={32} />
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-zinc-200 to-[#00e5ff] bg-clip-text text-transparent">
                Orchaix
              </span>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-850 text-xs text-zinc-300">
                <User className="w-3.5 h-3.5 text-[#00e5ff]" />
                <span className="font-semibold">{merchant?.businessName}</span>
                <span className="text-zinc-500">(@{merchant?.username})</span>
              </div>

              <button
                onClick={logout}
                className="p-2 rounded-lg hover:bg-red-500/10 border border-transparent hover:border-red-500/20 text-zinc-400 hover:text-red-400 transition-all cursor-pointer"
                title="Cerrar Sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-10">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Mis Proyectos</h1>
            <p className="text-zinc-400 text-sm mt-1">
              Organiza tus negocios o sucursales. Cada proyecto almacena sus datos y aloja múltiples chats de la IA especializados.
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#00e5ff] hover:bg-[#33ebff] text-zinc-950 font-bold rounded-xl text-sm transition-all shadow-lg shadow-[#00e5ff]/10 cursor-pointer animate-fade-in"
          >
            <Plus className="w-4 h-4" />
            Nuevo Proyecto
          </button>
        </div>

        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="glass rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#00e5ff]/5 rounded-full blur-2xl" />
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">Total Proyectos</span>
            <span className="text-3xl font-bold block mt-2">{projects.length}</span>
          </div>

          <div className="glass rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#00e5ff]/5 rounded-full blur-2xl" />
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">Datos de Negocio Cargados</span>
            <span className="text-3xl font-bold block mt-2">
              {projects.reduce((acc, p) => acc + (p._count?.documents || 0), 0)} <span className="text-sm text-zinc-500 font-normal">documentos</span>
            </span>
          </div>

          <div className="glass rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#00e5ff]/5 rounded-full blur-2xl" />
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">Chats de la IA Creados</span>
            <span className="text-3xl font-bold block mt-2">
              {projects.reduce((acc, p) => acc + (p._count?.agents || 0), 0)} <span className="text-sm text-zinc-500 font-normal">chats de la IA activos</span>
            </span>
          </div>
        </div>

        {/* Projects Grid */}
        {projects.length === 0 ? (
          <div className="glass rounded-3xl p-12 text-center max-w-xl mx-auto border-dashed border-zinc-800 mt-6 animate-fade-in">
            <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center mx-auto mb-4 border border-zinc-850">
              <Folder className="w-6 h-6 text-zinc-500" />
            </div>
            <h3 className="text-lg font-semibold text-white">No tienes proyectos creados</h3>
            <p className="text-zinc-400 text-sm mt-1 max-w-xs mx-auto">
              Comienza creando tu primer proyecto para subir la información de tu negocio y luego añadir chats de la IA.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 mt-6 px-4 py-2 bg-[#00e5ff] hover:bg-[#33ebff] text-zinc-950 font-bold rounded-xl text-sm transition-all shadow-md shadow-[#00e5ff]/10 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              Crear primer proyecto
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
            {projects.map((project) => (
              <div 
                key={project.id} 
                className="glass rounded-2xl p-6 shadow-xl relative overflow-hidden group hover:border-[#00e5ff]/35 transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  {/* Top Header Card */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center group-hover:border-[#00e5ff]/20 group-hover:bg-[#00e5ff]/5 transition-colors">
                      <Folder className="w-5 h-5 text-zinc-400 group-hover:text-[#00e5ff] transition-colors" />
                    </div>
                    
                    <span className="text-[10px] text-zinc-500 font-medium">
                      Creado: {new Date(project.createdAt).toLocaleDateString('es-ES')}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white group-hover:text-[#00e5ff] transition-colors">
                    {project.name}
                  </h3>
                  
                  <p className="text-xs text-zinc-400 mt-1 line-clamp-2 h-8">
                    {project.description || 'Sin descripción disponible.'}
                  </p>
                </div>

                {/* Card Stats & Actions */}
                <div className="mt-6 border-t border-zinc-850/50 pt-4 flex justify-between items-center">
                  <div className="flex gap-4 text-xs text-zinc-400">
                    <span className="flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-zinc-500" />
                      {project._count?.documents || 0} datos
                    </span>
                    <span className="flex items-center gap-1">
                      <Bot className="w-3.5 h-3.5 text-zinc-500" />
                      {project._count?.agents || 0} chats de la IA
                    </span>
                  </div>

                  <Link 
                    href={`/dashboard/project/${project.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 rounded-lg text-xs font-semibold text-white transition-all group-hover:border-[#00e5ff]/20"
                  >
                    Entrar al Proyecto
                    <ArrowRight className="w-3 h-3 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Pop-up Modal to Create Project */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="glass rounded-2xl w-full max-w-lg p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#00e5ff]/40 to-transparent" />
            
            <h2 className="text-xl font-bold text-white mb-2">Crear Nuevo Proyecto</h2>
            <p className="text-xs text-zinc-400 mb-6">Un proyecto es una entidad de negocio (ej. Tienda Calzado) que almacena datos y aloja chats de la IA.</p>

            <form onSubmit={handleCreateProject} className="space-y-4">
              {modalError && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center">
                  {modalError}
                </div>
              )}

              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block">
                  Nombre del Proyecto
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Calzados Madrid, Orchaix Soporte"
                  value={newProjectName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full px-4 py-2.5 bg-zinc-950/40 border border-zinc-800 rounded-xl text-white placeholder-zinc-550 focus:outline-none focus:border-[#00e5ff]/50 focus:ring-1 focus:ring-[#00e5ff]/50 transition-all text-sm"
                />
              </div>

              {/* Slug auto-generado en segundo plano */}

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block">
                  Descripción (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej: Sucursal principal de calzados y atención al cliente"
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  className="w-full px-4 py-2.5 bg-zinc-950/40 border border-zinc-800 rounded-xl text-white placeholder-zinc-550 focus:outline-none focus:border-[#00e5ff]/50 focus:ring-1 focus:ring-[#00e5ff]/50 transition-all text-sm"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-zinc-850/50 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-semibold rounded-xl text-sm transition-all border border-zinc-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="flex-1 py-2.5 bg-[#00e5ff] hover:bg-[#33ebff] disabled:bg-[#00e5ff]/40 text-zinc-950 font-bold rounded-xl text-sm transition-all shadow-lg shadow-[#00e5ff]/10 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {modalLoading ? <Loader2 className="w-4 h-4 animate-spin text-zinc-950" /> : 'Crear Proyecto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
