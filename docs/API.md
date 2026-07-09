# API pública de Orchaix

Esta es la API que una app externa usa para conversar con un agente. No requiere autenticación por ahora (está protegida por rate limit y tope diario); el sistema de API keys está en el roadmap.

Base URL: la URL donde esté desplegada tu instancia (ej. `https://orchaix.vercel.app`).

---

## Conversar con un agente

```
POST /api/chat
Content-Type: application/json
```

| Campo | Tipo | Descripción |
|---|---|---|
| `agentId` | string | ID del agente (visible en el dashboard) |
| `clientIdentifier` | string | ID estable del usuario final (device id, browser id, número, etc.). Define la sesión: mismo identifier = misma conversación con historial |
| `message` | string | Mensaje del usuario (máx. 4000 caracteres) |
| `platform` | string | Origen: `"web"`, `"mobile"`, `"sdk"` u otro identificador de tu app |

### Ejemplo

```bash
curl -X POST https://TU-DOMINIO/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "e1b2c3d4-...",
    "clientIdentifier": "usuario-123",
    "message": "¿Qué precios tienen?",
    "platform": "mi-app"
  }'
```

### Respuesta

```json
{
  "response": "¡Hola! Estos son nuestros precios...",
  "sessionId": "a9f8e7d6-..."
}
```

### Errores

| Código | Significado |
|---|---|
| `400` | Faltan parámetros o el mensaje supera 4000 caracteres |
| `404` | El `agentId` no existe |
| `429` | Rate limit (20 msg/min por IP) o el agente alcanzó su tope diario. Revisa el header `Retry-After` |
| `500` | Error interno (p. ej. fallo de la IA) |

---

## Obtener datos públicos de un agente

Útil para mostrar el nombre del negocio/agente en tu UI, o para resolver el `agentId` a partir de la URL pública.

```
GET /api/public/agent?agentId=<id>
GET /api/public/agent?username=<usuario>&projectSlug=<proyecto>&agentSlug=<agente>
```

### Respuesta

```json
{
  "agent": {
    "id": "e1b2c3d4-...",
    "name": "Ventas",
    "slug": "ventas",
    "projectId": "...",
    "projectName": "Mi Tienda",
    "restrictedCountries": [],
    "merchantUsername": "mitienda",
    "merchantBusinessName": "Mi Tienda S.R.L.",
    "merchantCountry": "bo"
  }
}
```

---

## Widget embebible (para páginas web)

En vez de consumir la API a mano, cualquier web puede incrustar el chat con una línea:

```html
<script src="https://TU-DOMINIO/sdk/chat-widget.js" data-agent-id="AGENT_ID"></script>
```

Aparece un botón flotante con el chat del agente. El widget maneja la sesión del visitante automáticamente.

---

## Telegram

No requiere API: en el dashboard, edita el agente y pega el token que te da [@BotFather](https://t.me/BotFather). Orchaix registra el webhook automáticamente y valida cada update con un secreto, así que nadie puede falsificar mensajes. Si el token es inválido, el dashboard te lo dice al guardar.

---

## Límites vigentes

| Límite | Valor | Dónde se configura |
|---|---|---|
| Mensajes por minuto por IP (chat) | 20 | `src/app/api/chat/route.ts` |
| Mensajes por minuto por chat de Telegram | 15 | `src/app/api/webhook/telegram/route.ts` |
| Mensajes por día por agente | 500 | env `MAX_MESSAGES_PER_AGENT_PER_DAY` |
| Tamaño máximo de mensaje | 4000 caracteres | `src/app/api/chat/route.ts` |
