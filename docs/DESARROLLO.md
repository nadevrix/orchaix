# Guía de desarrollo

## Setup local

Requisitos: **Node 22+**, una base PostgreSQL (gratis en [Neon](https://neon.tech)), una API key de Gemini (gratis en [AI Studio](https://aistudio.google.com/apikey)).

```bash
git clone https://github.com/nadevrix/orchaix.git
cd orchaix
npm install            # postinstall corre `prisma generate` solo
cp .env.example .env   # completar variables (ver abajo)
npx prisma db push     # crea/actualiza las tablas
npm run dev            # http://localhost:3000
```

### Variables de entorno

| Variable | Obligatoria | Qué es |
|---|---|---|
| `DATABASE_URL` | sí | Connection string de PostgreSQL |
| `GEMINI_API_KEY` | sí | Sin ella, chat y orquestador devuelven error controlado |
| `JWT_SECRET` | en producción | `openssl rand -base64 32`. En dev usa un fallback inseguro con warning |
| `NEXT_PUBLIC_APP_URL` | para Telegram | URL pública HTTPS; Telegram no acepta `localhost` como webhook |
| `MAX_MESSAGES_PER_AGENT_PER_DAY` | no | Default 500 |

### Probar el flujo completo a mano

1. `http://localhost:3000/dashboard/register` → crear cuenta.
2. Crear proyecto → crear agente escribiendo una instrucción natural (necesita `GEMINI_API_KEY`).
3. En el agente: subir un documento con datos inventados (precios, etc.).
4. Abrir la URL pública del agente y preguntarle por esos datos → debe responder con ellos y declinar temas ajenos.
5. Verificar en el dashboard que el contador de consumo subió.

Para probar Telegram necesitas una URL pública (deploy en Vercel o un túnel tipo `cloudflared tunnel`/`ngrok` con `NEXT_PUBLIC_APP_URL` apuntando ahí).

## Cambios de esquema (Prisma)

```bash
# 1. Editar prisma/schema.prisma
# 2. Aplicar a la base de datos:
npx prisma db push
# (db push también regenera el cliente)
```

El proyecto usa `db push` (no migraciones versionadas). Regla: **solo cambios aditivos** (columnas nuevas opcionales, tablas nuevas) mientras producción y desarrollo compartan esquema — así el código viejo desplegado no se rompe. Si algún día se necesita renombrar/borrar columnas con datos reales, migrar a `prisma migrate`.

## Convenciones del proyecto

- **Español** en: textos de UI, mensajes de error de la API (`{ error: "..." }`), documentación y comentarios.
- **Ownership siempre**: toda query del dashboard incluye `merchantId: payload.userId` (o `project: { merchantId }`) en el `where`. Nunca confiar en un ID que manda el cliente sin verificar dueño. Recurso ajeno = `404`, no `403`.
- **Costo de IA**: ningún endpoint llama a Gemini sin pasar antes por `checkRateLimit()` **y** `isWithinDailyLimit()`, y sin registrar `recordUsage()` después.
- **`export const maxDuration = 60`** en toda ruta que llame a Gemini (Vercel corta a los 10s por defecto).
- **Webhook de Telegram**: responde `200` siempre, incluso ante errores (si no, Telegram reintenta en loop).
- Errores: `console.error` con contexto + respuesta genérica al cliente. No filtrar detalles internos en los mensajes de error.

## Verificación mínima antes de commitear

```bash
npm run lint && npm run build
```

Es exactamente lo que corre el CI (`.github/workflows/ci.yml`) en cada push y PR. No hay tests automatizados todavía (ver PENDIENTES.md).

## Deploy

**Producción = Vercel conectado a la rama `main`.** Cada push a `main` despliega automáticamente.

1. Variables de entorno se configuran en el proyecto de Vercel (Settings → Environment Variables).
2. Si el cambio incluye esquema: correr `npx prisma db push` contra la BD de producción **antes** de mergear (solo cambios aditivos, ver arriba).
3. Verificar el deploy en el dashboard de Vercel; los logs de las funciones están en la pestaña *Logs*.

## Apps móvil y escritorio (estado real)

- `mobile/` — app Expo/React Native completa (login, proyectos, agentes, chat) pero **nunca desplegada**; pide la URL del servidor a mano (default hardcodeado `https://tudominio.com` en `App.tsx`). Antes de invertir aquí: fijar la URL de producción y probar de punta a punta.
- `desktop/` — Electron mínimo: abre el dashboard web en una ventana (`main.js` carga `ORCHAIX_URL` o localhost). No aporta nada sobre el navegador hoy.

Decisión vigente: **no invertir en estas apps** hasta que la web tenga usuarios activos.
