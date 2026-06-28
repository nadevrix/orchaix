'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Logo from '@/components/Logo';
import { KeyRound, Mail, Loader2, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // If already logged in, redirect to dashboard
  useEffect(() => {
    const token = localStorage.getItem('merchant_token');
    if (token) {
      router.push('/dashboard');
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Algo salió mal. Inténtalo de nuevo.');
      }

      // Save token and merchant data in localStorage
      localStorage.setItem('merchant_token', data.token);
      localStorage.setItem('merchant_data', JSON.stringify(data.merchant));

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#090b11] px-4 overflow-hidden">
      {/* Decorative Blur Spheres in Cyan */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-[#00e5ff]/5 blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 rounded-full bg-[#00e5ff]/3 blur-3xl" />

      <div className="w-full max-w-md animate-fade-in z-10">
        {/* Logo Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="mb-3">
            <Logo size={56} />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Orchaix</h1>
          <p className="text-xs text-zinc-400 mt-1">Ingresa a tu plataforma multi-agente No-Code</p>
        </div>

        {/* Card */}
        <div className="glass rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#00e5ff]/40 to-transparent" />
          
          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                {error}
              </div>
            )}

            {/* Email input */}
            <div className="space-y-2">
              <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">
                Correo Electrónico
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Mail className="w-5 h-5 text-zinc-500" />
                </span>
                <input
                  type="email"
                  required
                  placeholder="tu@negocio.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-zinc-950/40 border border-zinc-800 rounded-xl text-white placeholder-zinc-650 focus:outline-none focus:border-[#00e5ff]/50 focus:ring-1 focus:ring-[#00e5ff]/50 transition-all text-xs"
                />
              </div>
            </div>

            {/* Password input */}
            <div className="space-y-2">
              <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">
                Contraseña
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <KeyRound className="w-5 h-5 text-zinc-500" />
                </span>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-zinc-950/40 border border-zinc-800 rounded-xl text-white placeholder-zinc-650 focus:outline-none focus:border-[#00e5ff]/50 focus:ring-1 focus:ring-[#00e5ff]/50 transition-all text-xs"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-[#00e5ff] hover:bg-[#33ebff] disabled:bg-[#00e5ff]/40 text-zinc-950 font-bold rounded-xl transition-all shadow-lg shadow-[#00e5ff]/10 flex items-center justify-center gap-2 group cursor-pointer text-xs"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Iniciar Sesión
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Footer Link */}
          <div className="mt-8 text-center border-t border-zinc-850/50 pt-6">
            <p className="text-xs text-zinc-400">
              ¿No tienes cuenta?{' '}
              <Link href="/dashboard/register" className="text-[#00e5ff] hover:text-[#33ebff] font-semibold transition-colors">
                Crea una cuenta gratis
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
