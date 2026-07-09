import { randomBytes } from 'crypto';

export interface WebhookRegistration {
  ok: boolean;
  /** Secreto que Telegram reenviará en el header X-Telegram-Bot-Api-Secret-Token */
  secret?: string;
  error?: string;
  status?: number;
}

/**
 * Registra el webhook de Telegram para un agente. La URL lleva el ID del
 * agente y un secreto aleatorio que Telegram devuelve en cada update; así el
 * token del bot nunca viaja en la URL y nadie puede falsificar updates.
 *
 * Guarda el `secret` devuelto en `Agent.telegramSecret`: el webhook lo compara
 * contra el header en cada request.
 */
export async function registerTelegramWebhook(
  agentId: string,
  botToken: string
): Promise<WebhookRegistration> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tudominio.com';
  const secret = randomBytes(32).toString('hex');
  const webhookUrl = `${appUrl}/api/webhook/telegram?agent=${agentId}`;

  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: webhookUrl, secret_token: secret }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.ok) {
      console.error('Error de API de Telegram setWebhook:', data);
      return {
        ok: false,
        status: 400,
        error: `Telegram rechazó el token del bot: ${data.description || 'verifica que el token de @BotFather sea correcto'}`,
      };
    }

    return { ok: true, secret };
  } catch (err) {
    console.error('Error de conexión de Telegram setWebhook:', err);
    return {
      ok: false,
      status: 502,
      error: 'No se pudo conectar con Telegram para registrar el webhook. Inténtalo de nuevo.',
    };
  }
}
