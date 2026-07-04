'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Logo from '@/components/Logo';
import Skeleton from '@/components/Skeleton';
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

    // localStorage solo existe en el cliente; hidratar aquí es el patrón SSR-safe
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
      <div className="min-h-screen bg-slate-50">
        <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16 items-center">
              <Logo size={32} showText={true} />
              <Skeleton className="h-8 w-48 rounded-lg" />
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-10">
            <div className="space-y-2">
              <Skeleton className="h-9 w-56" />
              <Skeleton className="h-4 w-80 max-w-full" />
            </div>
            <Skeleton className="h-11 w-44 rounded-xl" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-52 rounded-2xl" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Navbar */}
      <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2.5">
              <Logo size={32} showText={true} />
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-xs text-slate-700">
                <User className="w-3.5 h-3.5 text-[#0F766E]" />
                <span className="font-semibold">{merchant?.businessName}</span>
                <span className="text-slate-500">(@{merchant?.username})</span>
              </div>

              <button
                onClick={logout}
                className="p-2 rounded-lg hover:bg-red-50 border border-transparent hover:border-red-100 text-slate-400 hover:text-red-600 transition-all cursor-pointer"
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
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Mis Proyectos</h1>
            <p className="text-slate-500 text-sm mt-1">
              Organiza tus negocios o sucursales. Cada proyecto almacena sus datos y aloja múltiples chats de la IA especializados.
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-3 bg-[#0F766E] hover:bg-[#115E59] text-white font-bold rounded-xl text-sm transition-all shadow-md hover:shadow-lg cursor-pointer animate-fade-in"
          >
            <Plus className="w-4 h-4" />
            Nuevo Proyecto
          </button>
        </div>

        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#0F766E]/5 rounded-full blur-2xl" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Total Proyectos</span>
            <span className="text-3xl font-bold block mt-2 text-slate-900">{projects.length}</span>
          </div>

          <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#0F766E]/5 rounded-full blur-2xl" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Datos de Negocio Cargados</span>
            <span className="text-3xl font-bold block mt-2 text-slate-900">
              {projects.reduce((acc, p) => acc + (p._count?.documents || 0), 0)} <span className="text-sm text-slate-500 font-normal">documentos</span>
            </span>
          </div>

          <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#0F766E]/5 rounded-full blur-2xl" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Chats de la IA Creados</span>
            <span className="text-3xl font-bold block mt-2 text-slate-900">
              {projects.reduce((acc, p) => acc + (p._count?.agents || 0), 0)} <span className="text-sm text-slate-500 font-normal">chats de la IA activos</span>
            </span>
          </div>
        </div>

        {/* Projects Grid */}
        {projects.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center max-w-xl mx-auto border-dashed border-slate-300 shadow-sm mt-6 animate-fade-in">
            <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-4 border border-slate-200">
              <Folder className="w-6 h-6 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">No tienes proyectos creados</h3>
            <p className="text-slate-500 text-sm mt-1 max-w-xs mx-auto">
              Comienza creando tu primer proyecto para subir la información de tu negocio y luego añadir chats de la IA.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 mt-6 px-4 py-2 bg-[#0F766E] hover:bg-[#115E59] text-white font-bold rounded-xl text-sm transition-all shadow-sm cursor-pointer"
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
                className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group hover:border-[#0F766E]/30 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  {/* Top Header Card */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center group-hover:border-[#0F766E]/20 group-hover:bg-[#0F766E]/5 transition-colors">
                      <Folder className="w-5 h-5 text-slate-400 group-hover:text-[#0F766E] transition-colors" />
                    </div>
                    
                    <span className="text-[10px] text-slate-400 font-medium">
                      Creado: {new Date(project.createdAt).toLocaleDateString('es-ES')}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-[#0F766E] transition-colors">
                    {project.name}
                  </h3>
                  
                  <p className="text-sm text-slate-500 mt-1 line-clamp-2 h-10">
                    {project.description || 'Sin descripción disponible.'}
                  </p>
                </div>

                {/* Card Stats & Actions */}
                <div className="mt-6 border-t border-slate-100 pt-4 flex justify-between items-center">
                  <div className="flex gap-4 text-sm text-slate-500">
                    <span className="flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      {project._count?.documents || 0} datos
                    </span>
                    <span className="flex items-center gap-1">
                      <Bot className="w-3.5 h-3.5 text-slate-400" />
                      {project._count?.agents || 0} chats de la IA
                    </span>
                  </div>

                  <Link 
                    href={`/dashboard/project/${project.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 transition-all group-hover:border-[#0F766E]/30 group-hover:text-[#0F766E]"
                  >
                    Entrar al Proyecto
                    <ArrowRight className="w-3 h-3 text-slate-400 group-hover:translate-x-0.5 group-hover:text-[#0F766E] transition-all" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Pop-up Modal to Create Project */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-lg p-8 shadow-2xl border border-slate-200 relative overflow-hidden">
            <h2 className="text-xl font-bold text-slate-900 mb-2">Crear Nuevo Proyecto</h2>
            <p className="text-sm text-slate-500 mb-6">Un proyecto es una entidad de negocio (ej. Tienda Calzado) que almacena datos y aloja chats de la IA.</p>

            <form onSubmit={handleCreateProject} className="space-y-4">
              {modalError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-xs text-center">
                  {modalError}
                </div>
              )}

              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
                  Nombre del Proyecto
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Calzados Madrid, Orchaix Soporte"
                  value={newProjectName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0F766E] focus:ring-1 focus:ring-[#0F766E] transition-all text-sm"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
                  Descripción (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej: Sucursal principal de calzados y atención al cliente"
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0F766E] focus:ring-1 focus:ring-[#0F766E] transition-all text-sm"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-slate-100 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-sm transition-all border border-slate-300 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="flex-1 py-2.5 bg-[#0F766E] hover:bg-[#115E59] disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  {modalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Crear Proyecto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
