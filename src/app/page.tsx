'use client';

import React from 'react';
import Link from 'next/link';
import Logo from '@/components/Logo';
import { Sparkles, Terminal, Shield, Smartphone, Send, ArrowRight } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="relative min-h-screen bg-slate-50 text-slate-900 overflow-hidden flex flex-col justify-between">
      {/* Background Decorative Blur Gradients in Teal/Green */}
      <div className="absolute top-0 left-1/4 -translate-x-1/2 w-96 h-96 rounded-full bg-[#0F766E]/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 w-96 h-96 rounded-full bg-[#10b981]/5 blur-3xl pointer-events-none" />

      {/* Navbar */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-40 px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Logo size={32} showText={true} />
        </div>

        <div className="flex items-center gap-4">
          <Link 
            href="/dashboard/login"
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            Iniciar Sesión
          </Link>
          <Link 
            href="/dashboard/register"
            className="px-4 py-2 bg-[#0F766E] hover:bg-[#115E59] text-white font-bold rounded-xl text-xs transition-all shadow-sm"
          >
            Registrarse
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col justify-center max-w-5xl mx-auto px-6 py-20 text-center relative z-10">
        <div className="inline-flex items-center gap-1.5 py-1 px-3 rounded-full bg-[#0F766E]/10 border border-[#0F766E]/20 text-[10px] font-bold text-[#0F766E] uppercase tracking-widest mb-6 mx-auto animate-pulse">
          <Sparkles className="w-3.5 h-3.5" /> Chatbots Basados en Datos Secos
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 max-w-3xl mx-auto leading-tight">
          Sube los datos de tu negocio y tu chatbot inteligente responderá{' '}
          <span className="bg-gradient-to-r from-[#0F766E] via-[#10b981] to-[#0F766E] bg-clip-text text-transparent">
            Estrictamente
          </span>{' '}
          sobre ellos
        </h1>

        <p className="text-sm sm:text-base text-slate-600 mt-6 max-w-2xl mx-auto leading-relaxed">
          Carga la información de tu comercio (productos, precios, FAQ). Generamos una IA que interactúa con tus clientes basándose únicamente en tus datos provistos, evitando respuestas incorrectas o inventadas.
        </p>

        {/* CTA Buttons */}
        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/dashboard/register"
            className="px-8 py-4 bg-[#0F766E] hover:bg-[#115E59] text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-[#0F766E]/20 flex items-center justify-center gap-2 group cursor-pointer"
          >
            Comenzar Gratis
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            href="/dashboard/login"
            className="px-8 py-4 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 font-semibold rounded-xl text-sm transition-all cursor-pointer shadow-sm"
          >
            Ver mi Panel
          </Link>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-24">
          <div className="bg-white rounded-2xl p-6 text-left relative overflow-hidden group hover:border-[#0F766E]/30 border border-slate-200 shadow-sm transition-all">
            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-4 text-[#0F766E]">
              <Terminal className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Widget SDK Inyectable</h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Copia e inserta un script HTML simple para inyectar una ventana flotante de chat en cualquier sitio web externo de forma instantánea.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 text-left relative overflow-hidden group hover:border-[#0F766E]/30 border border-slate-200 shadow-sm transition-all">
            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-4 text-[#0F766E]">
              <Send className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Bot de Telegram</h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Configuramos de forma no-code un webhook para que tus clientes chateen con tu base de datos directamente desde tu bot de Telegram.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 text-left relative overflow-hidden group hover:border-[#0F766E]/30 border border-slate-200 shadow-sm transition-all">
            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-4 text-[#0F766E]">
              <Smartphone className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">App Móvil y Escritorio</h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Permite a los usuarios acceder al chat nativo escaneando el código de tu chatbot en la app móvil o gestiona todo desde la app de escritorio.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        &copy; {new Date().getFullYear()} Orchaix Platform. Todos los derechos reservados.
      </footer>
    </div>
  );
}
