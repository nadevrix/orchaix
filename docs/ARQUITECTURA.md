# Arquitectura

## Visión general

Orchaix es una única aplicación Next.js que sirve tres cosas a la vez:

```
                        ┌─────────────────────────────────────────┐
                        │           Next.js (Vercel)              │
                        │                                         │
 Comercio (dueño) ────▶ │  /dashboard        Panel de gestión     │
                        │                                         │
 Cliente final ───────▶ │  /[país]/[user]/   Páginas públicas     │
 (web)                  │  /widget           Chat embebible       │
                        │                                         │
 Cliente final ───────▶ │  /api/webhook/     Webhook de updates   │
 (Telegram)             │     telegram                            │
                        │                                         │
 App externa ─────────▶ │  /api/chat         API de conversación  │
                        │                                         │
                        │  /api/*            API REST (JWT)       │
                        └────────┬──────────────────┬─────────────┘
                                 │                  │
                          ┌──────▼──────┐    ┌──────▼──────────┐
                          │ PostgreSQL  │    │  Google Gemini  │
                          │   (Neon)    │    │   2.5 Flash     │
                          └─────────────┘    └─────────────────┘
```

No hay servidores propios ni colas: todo es serverless en Vercel, la base de datos es Neon (Postgres administrado) y la IA es la API de Gemini. El costo fijo de infraestructura es $0; el costo variable son los tokens de Gemini.

## Jerarquía de datos

```
Merchant (el comercio que se registra)
└── Project (un negocio/marca; define la URL pública)
    └── Agent (un asistente con personalidad propia: ventas, soporte...)
        ├── Document (datos del negocio para RAG)
        └── ChatSession (una conversación con un cliente final)
            └── Message (cada mensaje user/ai)

DailyUsage (consumo diario por agente; sin FK a propósito —
            el historial sobrevive si borran el agente)
```

## Modelo de datos (`prisma/schema.prisma`)

### Merchant
El usuario que paga. `email` y `username` únicos; `username` forma parte de las URLs públicas. `country` es código de 2 letras (default `es`). Password con bcrypt (`passwordHash`).

### Project
Agrupa agentes bajo un negocio. `slug` único por merchant (URL pública: `/{country}/{username}/{project_slug}`). `restrictedCountries` bloquea el acceso a la página pública desde ciertos países.

### Agent
El asistente de IA. Campos clave:
- `rawInstruction` — lo que el usuario escribió en lenguaje natural
- `systemInstruction` — el prompt profesional que generó el orquestador (es lo que se usa en cada chat)
- `slug` — único por proyecto (URL: `.../{agent_slug}`)
- `telegramToken` — token de @BotFather si el agente está conectado a Telegram
- `telegramSecret` — secreto aleatorio para validar que los updates del webhook vienen realmente de Telegram

### Document
Texto plano con información del negocio. `sourceType`: `"text"` (pegado a mano), `"url"` o `"file"` (extraído de PDF/DOCX/TXT/MD/CSV en `src/lib/extract-text.ts`). No hay embeddings: la búsqueda es por keywords (ver abajo).

### ChatSession / Message
Una sesión se identifica por `(agentId, clientIdentifier, platform)`. El `clientIdentifier` lo define el cliente: browser id en web, `chat_id` en Telegram, device id en apps. Así el historial persiste entre visitas sin necesidad de login del cliente final.

### DailyUsage
Contador `(agentId, date) → messages`. Un intercambio (pregunta + respuesta) cuenta 1. Es la base del control de costos hoy y de la facturación pay-as-you-go mañana.

## Decisiones de diseño (y por qué)

**Auth con JWT stateless (`src/lib/jwt.ts`).** El token (7 días) viaja en `Authorization: Bearer` y se guarda en `localStorage`. No hay tabla de sesiones ni revocación — simple y suficiente para esta etapa. Toda ruta del dashboard verifica ownership: el `where` de Prisma siempre incluye `merchantId: payload.userId`, nunca se confía en IDs sueltos del cliente.

**RAG por keywords, no embeddings (`src/lib/gemini.ts`).** `getRelevantContext()` puntúa documentos por frecuencia de las palabras de la consulta (título pesa ×5) y mete los 3 mejores al prompt, recortados a 8.000 caracteres por documento y 20.000 en total. Cero dependencias, cero infra extra. El upgrade natural es pgvector en Neon (ver PENDIENTES.md).

**Un solo prompt maestro.** `askGemini()` envuelve el `systemInstruction` del agente en un prompt universal que fuerza el comportamiento comercial: solo responde sobre el negocio, no inventa datos, declina temas ajenos. Esto evita que cada comercio tenga que saber prompt engineering defensivo.

**Control de costos en dos capas.** (1) Rate limit en memoria por IP/chat (`src/lib/rate-limit.ts`) — en serverless cada instancia cuenta por separado, así que es una barrera blanda; (2) tope diario persistente por agente en la BD (`src/lib/usage.ts`, default 500, env `MAX_MESSAGES_PER_AGENT_PER_DAY`) — esta es la barrera dura. Regla del proyecto: **ningún endpoint gasta tokens de Gemini sin pasar por ambas.**

**Webhook de Telegram con secreto.** Al registrar el bot, se genera un secreto aleatorio y se pasa a Telegram (`setWebhook` con `secret_token`, ver `src/lib/telegram.ts`). Telegram lo devuelve en el header `X-Telegram-Bot-Api-Secret-Token` de cada update y el webhook rechaza lo que no coincida. El token del bot nunca aparece en la URL. Existe un modo legado (`?token=`) para bots registrados antes de este cambio; se puede eliminar cuando todos los agentes re-guarden su token.

**El webhook siempre responde 200.** Si Telegram recibe un error, reintenta el mismo update en loop y bloquea la cola del bot. Los errores se loguean pero se responde `{ok: true}`.

**Respuestas a Telegram con fallback.** Se intenta `parse_mode: Markdown`; si Telegram rechaza el formato (pasa seguido con Markdown generado por IA), se reenvía como texto plano. El mensaje siempre llega.

**`maxDuration = 60`** en toda ruta que llama a Gemini (`/api/chat`, `/api/orchestrate`, webhook). Sin esto Vercel corta la función a los 10s.

## Estructura del repo

```
src/
  app/
    api/                    # Backend (route handlers)
      auth/                 #   register, login, me
      projects/             #   CRUD proyectos → agentes → documentos
      orchestrate/          #   A2A: instrucción natural → system prompt
      chat/                 #   endpoint público de conversación
      public/               #   resolución pública de agentes/proyectos
      usage/                #   consumo de mensajes del comercio
      webhook/telegram/     #   updates de Telegram
    dashboard/              # Panel del comercio (login, proyectos, agentes)
    [country]/[username]/[project_slug]/[agent_slug]/
                            # Página pública de chat de cada agente
    widget/                 # Página que carga el iframe del widget
  components/               # UI compartida (avatar, markdown, skeletons...)
  lib/
    gemini.ts               # Cliente Gemini + RAG + prompt maestro
    telegram.ts             # Registro de webhooks de Telegram
    jwt.ts                  # Firma/verificación de sesiones
    prisma.ts               # Singleton del cliente Prisma
    rate-limit.ts           # Rate limit en memoria
    usage.ts                # Tope diario y contador de consumo
    extract-text.ts         # Extracción de texto de PDF/DOCX/etc.
public/sdk/chat-widget.js   # Widget embebible (vanilla JS, sin build)
prisma/schema.prisma        # Esquema de la base de datos
mobile/                     # Prototipo Expo/React Native (no productivo)
desktop/                    # Prototipo Electron: webview del dashboard (no productivo)
.github/workflows/ci.yml    # CI: npm ci + lint + build
```
