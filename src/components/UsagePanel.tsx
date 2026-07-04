'use client';

import { useEffect, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import Skeleton from './Skeleton';

interface UsageData {
  totalMessages: number;
  todayMessages: number;
  dailyLimitPerAgent: number;
  days: { date: string; messages: number }[];
}

// Barras en teal-600 (#0D9488): más cromático que el teal de marca para que
// las marcas de datos no se lean grises (validado sobre superficie clara).

// Serie continua de 30 días (UTC, como el API): rellena con 0 los días sin registro.
function buildLast30Days(days: { date: string; messages: number }[]) {
  const byDate = new Map(days.map((d) => [d.date, d.messages]));
  const series: { date: string; messages: number }[] = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i));
    const key = day.toISOString().slice(0, 10);
    series.push({ date: key, messages: byDate.get(key) ?? 0 });
  }
  return series;
}

function formatDay(iso: string) {
  return new Date(iso + 'T00:00:00Z').toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
}

export default function UsagePanel() {
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('merchant_token');
    const request = token
      ? fetch('/api/usage', { headers: { 'Authorization': `Bearer ${token}` } })
      : Promise.reject(new Error('sin sesión'));

    request
      .then(async (res) => {
        if (!res.ok) throw new Error();
        setUsage(await res.json());
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <Skeleton className="h-64 rounded-2xl mb-10" />;
  }

  if (error || !usage) {
    return null;
  }

  const series = buildLast30Days(usage.days);
  const maxMessages = Math.max(...series.map((d) => d.messages), 1);
  const firstDay = series[0].date;
  const middleDay = series[15].date;
  const lastDay = series[series.length - 1].date;

  return (
    <section className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 mb-10 animate-fade-in">
      {/* Encabezado + cifras */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-4.5 h-4.5 text-[#0F766E]" />
            Consumo de Mensajes
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Mensajes respondidos por tus chats de la IA en los últimos 30 días.
          </p>
        </div>

        <div className="flex gap-8">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Hoy</span>
            <span className="text-2xl font-bold text-slate-900">{usage.todayMessages.toLocaleString('es-ES')}</span>
            <span className="text-[11px] text-slate-400 block">límite {usage.dailyLimitPerAgent.toLocaleString('es-ES')}/día por chat</span>
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Últimos 30 días</span>
            <span className="text-2xl font-bold text-slate-900">{usage.totalMessages.toLocaleString('es-ES')}</span>
            <span className="text-[11px] text-slate-400 block">mensajes en total</span>
          </div>
        </div>
      </div>

      {/* Gráfico de barras */}
      <div>
        <span className="text-[11px] text-slate-400 block mb-1">máx. {maxMessages.toLocaleString('es-ES')}</span>
        <div
          className="flex items-end gap-[2px] h-32 border-b border-slate-200"
          role="img"
          aria-label={`Mensajes por día en los últimos 30 días. Hoy: ${usage.todayMessages}. Total: ${usage.totalMessages}.`}
        >
          {series.map((day) => (
            <div key={day.date} className="relative flex-1 h-full flex items-end group">
              <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 rounded-md bg-slate-900 text-white text-[11px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-md">
                {formatDay(day.date)}: <span className="font-bold">{day.messages.toLocaleString('es-ES')}</span>
              </div>
              <div
                className="w-full rounded-t-[4px] transition-colors bg-[#0D9488] group-hover:bg-[#0F766E]"
                style={{
                  height: day.messages > 0 ? `${Math.max((day.messages / maxMessages) * 100, 3)}%` : '0%',
                }}
              />
              {/* Zona de hover completa, también para días en cero */}
              <div className="absolute inset-0" />
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-1.5 text-[11px] text-slate-400">
          <span>{formatDay(firstDay)}</span>
          <span>{formatDay(middleDay)}</span>
          <span>{formatDay(lastDay)}</span>
        </div>

        {usage.totalMessages === 0 && (
          <p className="text-sm text-slate-500 text-center mt-4">
            Aún no hay mensajes registrados. Cuando tus clientes chateen con tus chats de la IA, verás aquí el consumo diario.
          </p>
        )}
      </div>

      {/* Tabla accesible para lectores de pantalla */}
      <table className="sr-only">
        <caption>Mensajes por día, últimos 30 días</caption>
        <thead>
          <tr><th>Fecha</th><th>Mensajes</th></tr>
        </thead>
        <tbody>
          {series.map((day) => (
            <tr key={day.date}><td>{day.date}</td><td>{day.messages}</td></tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
