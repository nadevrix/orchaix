# API interna (dashboard)

Endpoints que usan el dashboard web y la app móvil. Salvo que se indique lo contrario, **todos requieren** el header:

```
Authorization: Bearer <token JWT>
```

El token se obtiene en register/login y dura 7 días. Todas las respuestas de error tienen la forma `{ "error": "mensaje en español" }`.

Códigos comunes: `401` sin token o token inválido · `404` el recurso no existe **o no pertenece al comercio autenticado** (a propósito no se distingue) · `400` validación · `500` error interno.

---

## Autenticación

### POST `/api/auth/register` (público)

| Campo | Requerido | Notas |
|---|---|---|
| `email` | sí | Se guarda en minúsculas |
| `password` | sí | Mínimo 6 caracteres |
| `username` | no | Solo `[a-zA-Z0-9-_]`. Si falta, se genera del email (con sufijo numérico si está tomado) |
| `businessName` | no | Default: `Mi Negocio (<username>)` |
| `country` | no | Código de 2 letras, default `es` |

**Respuesta:** `{ message, token, merchant: { id, email, username, businessName, country } }`

### POST `/api/auth/login` (público)

Body: `{ email, password }`. Respuesta igual a register. `401` con "Credenciales incorrectas" (sin distinguir si el email existe).

### GET `/api/auth/me`

Devuelve `{ merchant }` del token. Útil para validar sesión al cargar el dashboard.

---

## Proyectos

### GET `/api/projects`
Lista los proyectos del comercio con conteos: `{ projects: [{ id, name, description, slug, restrictedCountries, createdAt, _count: { agents, documents } }] }`

### POST `/api/projects`

| Campo | Requerido | Notas |
|---|---|---|
| `name` | sí | |
| `slug` | sí | Solo `[a-z0-9-]`, único por comercio. Forma la URL pública |
| `description` | no | |
| `restrictedCountries` | no | Array de códigos de país bloqueados |

### GET / PUT / DELETE `/api/projects/[projectId]`
CRUD estándar. PUT acepta los mismos campos que POST (todos opcionales). DELETE borra en cascada agentes, documentos, sesiones y mensajes (FK `onDelete: Cascade`).

### GET `/api/projects/[projectId]/public-details` (público)
Datos públicos del proyecto y sus agentes para las páginas de chat.

---

## Agentes

### GET `/api/projects/[projectId]/agents`
`{ agents: [...] }` ordenados por creación.

### POST `/api/projects/[projectId]/agents`

| Campo | Requerido | Notas |
|---|---|---|
| `name` | sí | |
| `slug` | sí | Solo `[a-z0-9-]`, único por proyecto |
| `systemInstruction` | sí | Normalmente lo genera `/api/orchestrate` |
| `rawInstruction` | no | La instrucción original del usuario |
| `telegramToken` | no | Ver comportamiento abajo |

**Telegram:** si viene `telegramToken`, el servidor registra el webhook ante Telegram (con secreto de validación) **antes** de confirmar. Si Telegram rechaza el token, la creación se revierte y responde `400` con el motivo. Lo mismo aplica al PUT.

### GET / PUT / DELETE `/api/projects/[projectId]/agents/[agentId]`
PUT acepta `name`, `slug`, `systemInstruction`, `rawInstruction`, `telegramToken` (todos opcionales). Enviar `telegramToken: ""` desconecta el bot. Cambiar el token re-registra el webhook.

---

## Documentos (datos de entrenamiento)

### GET `/api/projects/[projectId]/agents/[agentId]/documents`
`{ documents: [...] }` del agente.

### POST `/api/projects/[projectId]/agents/[agentId]/documents`

Dos modos según `Content-Type`:

**JSON** — texto pegado a mano:
```json
{ "title": "Precios", "content": "...", "sourceType": "text" }
```
`sourceType` debe ser `"text"` o `"url"`.

**multipart/form-data** — subida de archivo:
- campo `file`: PDF, DOCX, TXT, MD o CSV (máx. definido en `src/lib/extract-text.ts`)
- campo `title` (opcional): default el nombre del archivo

El texto se extrae en el servidor (unpdf para PDF, mammoth para DOCX) y se guarda como `sourceType: "file"`.

### DELETE `/api/projects/[projectId]/agents/[agentId]/documents/[documentId]`

---

## Orquestador A2A

### POST `/api/orchestrate`

Body: `{ rawInstruction: "quiero vender zapatos y agendar citas" }`

Gemini transforma la frase en un system prompt profesional. Respuesta:

```json
{
  "prompt": "system prompt largo y estructurado...",
  "summary": "He configurado un asistente de ventas experto para tu negocio."
}
```

El flujo del dashboard es: `orchestrate` → mostrar `summary` al usuario → `POST /agents` con `systemInstruction = prompt` y `rawInstruction` = lo que escribió.

---

## Consumo

### GET `/api/usage`

Consumo de mensajes de los últimos 30 días:

```json
{
  "totalMessages": 120,
  "todayMessages": 8,
  "dailyLimitPerAgent": 500,
  "days": [{ "date": "2026-07-01", "messages": 12 }],
  "byAgent": [{ "agentId": "...", "date": "...", "messages": 12 }]
}
```

---

## Endpoints públicos relacionados

Documentados en [API.md](API.md): `POST /api/chat`, `GET /api/public/agent`, `GET /api/public/project`, y el webhook `POST /api/webhook/telegram` (solo lo llama Telegram).
