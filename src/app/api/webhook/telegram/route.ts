import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getRelevantContext, askGemini } from '@/lib/gemini';
import { checkRateLimit } from '@/lib/rate-limit';
import { isWithinDailyLimit, recordUsage } from '@/lib/usage';

// Gemini + la respuesta a Telegram pueden superar los 10s por defecto de Vercel
export const maxDuration = 60;

// Máximo de mensajes por minuto por chat de Telegram
const RATE_LIMIT_PER_MINUTE = 15;

/**
 * Envía un mensaje a Telegram. Intenta primero con Markdown; si Telegram
 * rechaza el formato (pasa seguido: la IA genera Markdown que el parser
 * legacy de Telegram no acepta), reintenta como texto plano para que el
 * mensaje siempre llegue.
 */
async function sendTelegramMessage(botToken: string, chatId: number | string, text: string) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const send = (parseMode?: string) =>
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        ...(parseMode ? { parse_mode: parseMode } : {}),
      }),
    });

  let response = await send('Markdown');
  if (!response.ok) {
    response = await send();
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Error al enviar mensaje a Telegram (chat_id: ${chatId}):`, errorText);
  }
}

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const agentIdParam = searchParams.get('agent');
    const legacyToken = searchParams.get('token');

    // 1. Resolver el agente destino.
    //    Modo actual: ?agent=<id> + header secreto que solo Telegram conoce.
    //    Modo legado: ?token=<botToken> (webhooks registrados antes del cambio).
    let agent = null;
    if (agentIdParam) {
      agent = await prisma.agent.findUnique({
        where: { id: agentIdParam },
        include: {
          documents: true,
          project: { select: { merchantId: true } },
        },
      });

      const secretHeader = req.headers.get('x-telegram-bot-api-secret-token');
      if (!agent || !agent.telegramSecret || secretHeader !== agent.telegramSecret) {
        console.warn(`Webhook Telegram rechazado para agente ${agentIdParam}: secreto inválido o ausente.`);
        return NextResponse.json({ ok: true });
      }
    } else if (legacyToken) {
      agent = await prisma.agent.findFirst({
        where: { telegramToken: legacyToken },
        include: {
          documents: true,
          project: { select: { merchantId: true } },
        },
      });
    }

    if (!agent || !agent.telegramToken) {
      console.warn('Webhook Telegram llamado sin agente válido.');
      // Return 200 OK so Telegram stops retrying this update
      return NextResponse.json({ ok: true });
    }

    const body = await req.json().catch(() => null);
    if (!body || !body.message) {
      return NextResponse.json({ ok: true });
    }

    const { chat, text } = body.message;
    const chatId = chat?.id;
    const userText = text?.trim();

    if (!chatId || !userText) {
      return NextResponse.json({ ok: true });
    }

    // 1b. Rate limit por chat de Telegram (las peticiones vienen de Telegram,
    // así que la IP no identifica al usuario final)
    const rate = checkRateLimit(`tg:${chatId}`, RATE_LIMIT_PER_MINUTE);
    if (!rate.allowed) {
      return NextResponse.json({ ok: true });
    }

    // 2. Tope diario persistente por agente (control de costos)
    if (!(await isWithinDailyLimit(agent.id))) {
      return NextResponse.json({ ok: true });
    }

    // 3. Find or create the ChatSession for this Telegram User
    const clientIdentifier = String(chatId);
    let session = await prisma.chatSession.findFirst({
      where: {
        agentId: agent.id,
        clientIdentifier,
        platform: 'telegram',
      },
    });

    if (!session) {
      session = await prisma.chatSession.create({
        data: {
          agentId: agent.id,
          clientIdentifier,
          platform: 'telegram',
        },
      });
    }

    // 4. Retrieve recent history (last 20 messages)
    const dbMessages = (
      await prisma.message.findMany({
        where: { chatSessionId: session.id },
        orderBy: { createdAt: 'desc' },
        take: 20,
      })
    ).reverse();

    const chatHistory = dbMessages.map((msg) => ({
      sender: msg.sender,
      content: msg.content,
    }));

    // 5. Get relevant context (RAG)
    const context = getRelevantContext(userText, agent.documents);

    // 6. Get Gemini's response
    let aiResponse = '';
    try {
      aiResponse = await askGemini(
        agent.systemInstruction,
        context,
        chatHistory,
        userText
      );
    } catch (geminiError: any) {
      console.error('Error in askGemini for Telegram webhook:', geminiError);
      aiResponse = 'Lo siento, en este momento tengo problemas para procesar tu consulta. Inténtalo más tarde.';
    }

    // 7. Save messages in DB
    await prisma.$transaction([
      prisma.message.create({
        data: {
          chatSessionId: session.id,
          sender: 'user',
          content: userText,
        },
      }),
      prisma.message.create({
        data: {
          chatSessionId: session.id,
          sender: 'ai',
          content: aiResponse,
        },
      }),
    ]);

    // 7b. Register consumption in the merchant's daily usage counter
    await recordUsage(agent.id, agent.project.merchantId);

    // 8. Reply back to Telegram
    await sendTelegramMessage(agent.telegramToken, chatId, aiResponse);

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Error general en Webhook de Telegram:', error);
    // Always return 200 OK to Telegram webhooks so they don't block the endpoint
    return NextResponse.json({ ok: true });
  }
}
