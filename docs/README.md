# Documentación de Orchaix

Guía completa del proyecto, pensada para que cualquier desarrollador pueda entenderlo y continuarlo sin contexto previo.

## Índice

| Documento | Qué contiene | Léelo si... |
|---|---|---|
| [ARQUITECTURA.md](ARQUITECTURA.md) | Qué es Orchaix, cómo está construido, modelo de datos y decisiones de diseño | Es tu primer día en el proyecto |
| [FLUJOS.md](FLUJOS.md) | Los 5 flujos principales paso a paso, con los archivos involucrados | Vas a tocar una funcionalidad y quieres entenderla primero |
| [API.md](API.md) | API pública para integraciones externas (chat, widget, Telegram) | Vas a integrar Orchaix en otra app, o se la vas a pasar a un cliente |
| [API-INTERNA.md](API-INTERNA.md) | Todos los endpoints del dashboard (auth, proyectos, agentes, documentos) | Vas a tocar el backend o construir otro frontend |
| [DESARROLLO.md](DESARROLLO.md) | Setup local, convenciones del código, deploy y cómo probar | Vas a escribir código |
| [PENDIENTES.md](PENDIENTES.md) | Deuda técnica conocida y roadmap priorizado, con contexto de cada ítem | Quieres saber qué falta y en qué orden atacarlo |

## Resumen en 30 segundos

Orchaix es un SaaS donde una PYME crea agentes de IA sin código:

1. El comercio se registra y crea un **proyecto** (su negocio).
2. Dentro crea **agentes** (ventas, soporte...) describiendo en lenguaje natural qué quiere; un orquestador convierte eso en un system prompt profesional (`/api/orchestrate`).
3. Sube **documentos** con la info de su negocio (precios, catálogo); el agente responde basándose solo en eso (RAG por keywords).
4. Despliega el agente en: página pública propia, widget embebible, bot de Telegram, o API REST.

**Stack:** Next.js 16 (App Router) · Prisma + PostgreSQL (Neon) · Google Gemini 2.5 Flash · JWT · Vercel.
