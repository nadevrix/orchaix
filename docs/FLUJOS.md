# Flujos principales

Cada flujo indica los archivos involucrados en orden. Léelos con el código al lado.

---

## 1. Registro y sesión

```
dashboard/register/page.tsx → POST /api/auth/register → localStorage
```

1. El formulario solo pide email y contraseña; `username` y `businessName` se autogeneran en el servidor (`api/auth/register/route.ts`).
2. La respuesta trae un JWT (7 días) que el frontend guarda en `localStorage` (`merchant_token` y `merchant_data`).
3. Cada página del dashboard valida la sesión con `GET /api/auth/me` al montar; si falla, redirige a `/dashboard/login`.

---

## 2. Crear un agente con el orquestador A2A

```
dashboard → POST /api/orchestrate → POST /api/projects/[id]/agents
```

1. El usuario escribe en lenguaje natural qué quiere ("vendo zapatos, atiende con amabilidad y agenda citas").
2. `api/orchestrate/route.ts` se lo pasa a Gemini con un prompt de "prompt engineer experto" que devuelve JSON: `{ prompt, summary }`. El `prompt` es un system prompt de 3+ párrafos con personalidad, tono, manejo de objeciones y qué hacer ante lo desconocido.
3. El dashboard muestra el `summary` amigable y crea el agente con `systemInstruction = prompt` y `rawInstruction` = el texto original (por si se quiere regenerar después).

---

## 3. Conversación (web, widget o API) — el flujo más importante

```
POST /api/chat  →  rate limit  →  tope diario  →  sesión  →  historial
              →  RAG  →  Gemini  →  persistir  →  contar consumo
```

Archivo: `src/app/api/chat/route.ts`. Paso a paso:

1. **Validación**: `agentId`, `clientIdentifier`, `message` (≤4000 chars), `platform`.
2. **Rate limit** en memoria: 20 msg/min por `IP+agente` (`lib/rate-limit.ts`). Excedido → `429` con `Retry-After`.
3. **Tope diario** persistente: si el agente ya consumió `MAX_MESSAGES_PER_AGENT_PER_DAY` (default 500) hoy → `429` (`lib/usage.ts`).
4. **Sesión**: busca o crea `ChatSession` por `(agentId, clientIdentifier, platform)`. Mismo identifier = misma conversación con memoria.
5. **Historial**: últimos 20 mensajes de la sesión (mantiene el contexto liviano).
6. **RAG** (`lib/gemini.ts:getRelevantContext`): puntúa los documentos del agente por keywords de la consulta (título ×5), toma los 3 mejores, recorta a 8k chars/doc y 20k total.
7. **Gemini** (`lib/gemini.ts:askGemini`): arma el prompt maestro (reglas de comercio + `systemInstruction` del agente + contexto RAG) y llama a `gemini-2.5-flash` con el historial.
8. **Persistencia**: guarda pregunta y respuesta en una transacción.
9. **Consumo**: `recordUsage()` incrementa el contador diario del agente.
10. Respuesta: `{ response, sessionId }`.

El widget (`public/sdk/chat-widget.js`) y la página pública usan exactamente este endpoint; solo cambia el `platform`.

---

## 4. Telegram

### Conexión (una vez)

```
dashboard (pegar token de @BotFather) → PUT /api/.../agents/[id]
    → lib/telegram.ts: setWebhook(url + secret_token) → guarda telegramSecret
```

- La URL registrada es `/api/webhook/telegram?agent=<agentId>` — el token del bot **no** viaja en la URL.
- Se genera un secreto aleatorio de 64 hex chars que Telegram devolverá en cada update.
- Si Telegram rechaza el token, el endpoint responde `400` con el motivo y no guarda nada (en creación de agente, se revierte el agente entero).

### Cada mensaje

Archivo: `src/app/api/webhook/telegram/route.ts`.

1. Telegram hace POST al webhook con el update.
2. Se resuelve el agente por `?agent=` y se compara el header `X-Telegram-Bot-Api-Secret-Token` contra `Agent.telegramSecret`. No coincide → se ignora (siempre respondiendo `200`, ver abajo). Existe un modo legado `?token=` para bots registrados antes del cambio de seguridad.
3. Rate limit por `chat_id` (15/min) + tope diario del agente.
4. Mismo pipeline que el chat web (sesión con `clientIdentifier = chat_id`, `platform = "telegram"`, historial, RAG, Gemini, persistencia, consumo).
5. **Respuesta a Telegram** (`sendTelegramMessage`): intenta con `parse_mode: Markdown`; si Telegram rechaza el formato (típico con Markdown generado por IA), reintenta como texto plano. El mensaje siempre llega.

**Regla crítica:** el webhook responde `200 {ok:true}` incluso ante errores. Si respondiera 4xx/5xx, Telegram reintenta el mismo update en loop y bloquea la cola del bot.

---

## 5. Páginas públicas y widget

### Página pública de un agente

```
/[country]/[username]/[project_slug]/[agent_slug]
```

`src/app/[country]/[username]/[project_slug]/[agent_slug]/page.tsx` resuelve el agente vía `GET /api/public/agent?username=...&projectSlug=...&agentSlug=...`, respeta `restrictedCountries` del proyecto, y monta un chat que usa `POST /api/chat` con un `clientIdentifier` generado en el navegador.

### Widget embebible

```html
<script src="https://TU-DOMINIO/sdk/chat-widget.js" data-agent-id="AGENT_ID"></script>
```

`public/sdk/chat-widget.js` (vanilla JS, sin build): inyecta un botón flotante + iframe que carga `/widget?agentId=...`. Detecta la URL base desde su propio `src`, así el mismo archivo funciona en cualquier despliegue.
