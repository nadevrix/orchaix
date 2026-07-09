# Orchaix

SaaS donde una PYME crea agentes de IA, los entrena con sus documentos (RAG por keywords) y los despliega en widget web, Telegram o API pública. Stack: Next.js 16 App Router + Prisma/Neon Postgres + Gemini 2.5 Flash, desplegado en Vercel.

## Mapa

- Jerarquía de datos: `Merchant → Project → Agent → Document/ChatSession/Message` (`prisma/schema.prisma`)
- `src/app/api/` — API REST. Auth por JWT en header `Authorization: Bearer` (`src/lib/jwt.ts`); toda ruta de dashboard verifica ownership vía `merchantId`
- `src/app/api/chat/route.ts` — endpoint público de conversación (widget, SDK, apps externas)
- `src/app/api/webhook/telegram/route.ts` — recibe updates; valida header `X-Telegram-Bot-Api-Secret-Token` contra `Agent.telegramSecret`
- `src/app/api/orchestrate/route.ts` — el "A2A": convierte instrucción en lenguaje natural en system prompt
- `src/lib/gemini.ts` — cliente Gemini + RAG por keywords con caps de tamaño de contexto
- `mobile/`, `desktop/` — prototipos no productivos; no invertir ahí sin pedido explícito

## Reglas

- Español en textos de UI, mensajes de error de API y documentación
- Rutas que llaman a Gemini declaran `export const maxDuration = 60` (timeout de Vercel)
- El webhook de Telegram siempre responde 200 (si no, Telegram reintenta en loop)
- Costos: todo endpoint que gaste tokens de Gemini debe pasar por rate limit + `isWithinDailyLimit`/`recordUsage` (`src/lib/usage.ts`)
- Verificación mínima antes de terminar: `npm run lint && npm run build` (es lo que corre el CI)

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
