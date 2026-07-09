# Pendientes y deuda técnica

Priorizado según el objetivo actual: **dejar la plataforma sólida para los primeros clientes y luego escalar**. Última revisión: 2026-07-08.

---

## P0 — Antes de entregar a clientes

### Rotar credenciales
- [ ] Contraseña de la BD Neon (se compartió por chat durante el desarrollo). Neon dashboard → Roles → Reset password → actualizar `DATABASE_URL` en Vercel → redeploy.
- [ ] Regenerar `JWT_SECRET` de producción si alguna vez se compartió.
- [ ] Verificar que `GEMINI_API_KEY` no esté expuesta en ningún lado.

### Re-registrar bots de Telegram existentes
Los agentes conectados a Telegram antes del cambio de seguridad (julio 2026) usan el webhook legado (`?token=`). Basta re-guardar el token en el dashboard para migrarlos al modo seguro. Cuando no queden bots legados, eliminar la rama `legacyToken` de `src/app/api/webhook/telegram/route.ts`.

### Monitoreo básico
No hay visibilidad de errores en producción: si a un cliente le falla el bot, nadie se entera.
- [ ] Sentry (plan gratis) para errores de servidor y frontend.
- [ ] UptimeRobot (gratis) haciendo ping al sitio cada 5 min con alerta a Telegram/email.

---

## P1 — Primeras semanas con clientes

### API keys por agente
Hoy `/api/chat` es público: cualquiera con un `agentId` (visible en el widget) consume la cuota del comercio. Diseño propuesto:
- Tabla `ApiKey`: `id, agentId, name, keyHash (sha256), lastUsedAt, createdAt, revokedAt`.
- La key en claro (`oxk_...`) se muestra una sola vez al crearla.
- `/api/chat` acepta `Authorization: Bearer oxk_...`: con key válida → sin rate limit por IP y consumo atribuible; sin key → comportamiento actual (widget siguen funcionando).
- CRUD de keys en el dashboard del agente.
Esto habilita además la medición por integración, base del modelo wallet.

### WhatsApp (Cloud API de Meta)
La feature más pedida. El código es análogo al webhook de Telegram (GET de verificación + POST de mensajes + responder vía Graph API). Lo lento es el trámite: cuenta Meta Business, número dedicado y verificación (días/semanas) — **empezar el trámite antes de escribir código**. Campos nuevos en `Agent`: `whatsappPhoneNumberId`, `whatsappAccessToken` (cifrado).

### Recuperación de contraseña
Un cliente que la olvida queda bloqueado para siempre. Necesita: proveedor de email (Resend, gratis hasta 3k/mes), tabla `PasswordResetToken` con expiración, endpoint + 2 pantallas.

### Documentos grandes
`extract-text.ts` guarda todo el texto extraído sin límite superior razonable por documento en la BD. Definir tope de caracteres por documento y por agente, y mostrar el uso en el dashboard.

---

## P2 — Escalar

### Facturación pay-as-you-go (wallet)
El modelo de negocio planeado. `DailyUsage` ya registra el consumo por comercio/agente. Falta: tabla de saldo y transacciones, integración de pagos (revisar opciones locales según país de los clientes), bloqueo suave al agotar saldo, y reemplazar el tope fijo de 500/día por el saldo.

### RAG con embeddings
El keyword matching falla con sinónimos ("¿cuánto cuesta?" no matchea "precio"). Neon soporta pgvector. Plan: trocear documentos en chunks al subirlos → embeddings (Gemini `text-embedding-004`) → búsqueda por similitud coseno. Mantener el keyword como fallback.

### Endurecimiento de sesiones
JWT en `localStorage` es vulnerable a XSS. Migrar a cookie `httpOnly` + `SameSite=Lax` (implica mover la verificación a un middleware y cambiar los `fetch` del dashboard). Añadir revocación (tabla de sesiones o token versioning).

### Tests
No hay ninguno. Prioridad de cobertura: (1) `getRelevantContext` y `docExcerpt` (lógica pura, fácil), (2) helpers de `usage.ts`, (3) tests de integración de `/api/chat` con Gemini mockeado.

---

## Deuda menor conocida (documentada, no urgente)

| Ítem | Dónde | Nota |
|---|---|---|
| Rate limit por instancia | `lib/rate-limit.ts` | En serverless cada instancia cuenta aparte; el límite efectivo puede ser mayor. El tope diario en BD es la barrera real. Upgrade: Upstash Redis |
| Carrera al crear sesiones | `api/chat`, webhook | Dos mensajes simultáneos del mismo cliente pueden crear 2 `ChatSession`. Inofensivo (se divide el historial). Fix: unique compuesto + upsert |
| Carrera en tope diario | `lib/usage.ts` | check-then-act no atómico; con tráfico alto se puede pasar el límite por unos pocos mensajes. Aceptable |
| Historial de git pesado (~100MB) | repo | `node_modules` quedó en commits viejos. Limpiable con `git filter-repo` (reescribe historia: coordinar con todos los clones) |
| `parse_mode` legado | webhook Telegram | Se usa Markdown legacy con fallback a texto plano. Upgrade: convertir a HTML de Telegram para formato consistente |
| Sesión no expira en UI | dashboard | Si el JWT (7d) expira con el dashboard abierto, las llamadas fallan con 401 pero la UI no siempre redirige a login |
