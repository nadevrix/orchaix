<div align="center">
  <h1>Orchaix</h1>
  <p><strong>Crea un agente de IA para tu negocio, entrénalo con tus datos y despliégalo en tu web, Telegram o por API — sin escribir código.</strong></p>
</div>

---

## ¿Qué hace?

1. **Regístrate** y crea un proyecto para tu negocio.
2. **Describe tu agente en lenguaje natural** ("quiero vender zapatos y agendar citas"). El orquestador A2A convierte esa frase en un system prompt profesional usando Gemini.
3. **Súbele tus datos** (texto, PDF, DOCX, TXT, MD, CSV): precios, catálogo, políticas. El agente responde basándose solo en esa información.
4. **Despliégalo** donde lo necesites:
   - **Página pública**: cada agente tiene URL propia (`/{país}/{usuario}/{proyecto}/{agente}`)
   - **Widget embebible**: un `<script>` en cualquier web
   - **Telegram**: pega el token de @BotFather y listo
   - **API REST**: para integrarlo en cualquier app ([documentación](docs/API.md))

## Stack

| Capa | Tecnología |
|---|---|
| Web + API | Next.js 16 (App Router), Tailwind 4 |
| Base de datos | PostgreSQL (Neon) + Prisma |
| IA | Google Gemini 2.5 Flash |
| Auth | JWT + bcrypt |
| Hosting | Vercel |

Incluye rate limiting por IP, tope diario de mensajes por agente (control de costos) y contador de consumo por comercio.

## Correr en local

Requisitos: Node 22+, una base PostgreSQL (gratis en [Neon](https://neon.tech)) y una API key de Gemini (gratis en [AI Studio](https://aistudio.google.com/apikey)).

```bash
git clone https://github.com/nadevrix/orchaix.git
cd orchaix
npm install
cp .env.example .env   # y completa las variables
npx prisma db push     # crea las tablas en tu base de datos
npm run dev            # http://localhost:3000
```

Variables de entorno (ver `.env.example`):

| Variable | Qué es |
|---|---|
| `DATABASE_URL` | Connection string de PostgreSQL |
| `GEMINI_API_KEY` | API key de Google Gemini |
| `JWT_SECRET` | Secreto para las sesiones (`openssl rand -base64 32`). Obligatorio en producción |
| `NEXT_PUBLIC_APP_URL` | URL pública de la app; se usa para registrar los webhooks de Telegram |
| `MAX_MESSAGES_PER_AGENT_PER_DAY` | Tope diario por agente (opcional, default 500) |

> **Nota:** la conexión con Telegram requiere que `NEXT_PUBLIC_APP_URL` sea una URL HTTPS pública (Telegram no acepta `localhost` como webhook).

## Deploy en Vercel

1. Importa el repo en Vercel.
2. Configura las variables de entorno de la tabla anterior.
3. Deploy. El `postinstall` genera el cliente de Prisma automáticamente.
4. Tras cambios de esquema, corre `npx prisma db push` apuntando a la base de producción.

## Estructura del repo

```
src/app/api/          # API REST (auth, projects, agents, documents, chat, webhook)
src/app/dashboard/    # Panel del comercio
src/app/[country]/    # Páginas públicas de cada agente
src/app/widget/       # Chat embebible (iframe del SDK)
src/lib/              # Gemini + RAG, JWT, rate limit, contadores de uso
public/sdk/           # Widget JS embebible
prisma/               # Esquema de base de datos
docs/                 # Documentación de la API pública
mobile/, desktop/     # Prototipos (Expo / Electron) — no productivos aún
```

## Documentación

Documentación completa en [`docs/`](docs/README.md):

- [Arquitectura y modelo de datos](docs/ARQUITECTURA.md)
- [Flujos principales paso a paso](docs/FLUJOS.md)
- [API pública para integraciones](docs/API.md)
- [API interna del dashboard](docs/API-INTERNA.md)
- [Guía de desarrollo y deploy](docs/DESARROLLO.md)
- [Pendientes y deuda técnica](docs/PENDIENTES.md)

## Roadmap

- [ ] API keys por agente para integraciones externas
- [ ] WhatsApp (Cloud API)
- [ ] Recuperación de contraseña
- [ ] Facturación pay-as-you-go (wallet)
- [ ] RAG con embeddings (pgvector)
