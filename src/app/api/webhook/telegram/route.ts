import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getRelevantContext, askGemini } from '@/lib/gemini';
import { checkRateLimit } from '@/lib/rate-limit';
import { isWithinDailyLimit, recordUsage } from '@/lib/usage';

// Máximo de mensajes por minuto por chat de Telegram
const RATE_LIMIT_PER_MINUTE = 15;

export async function POST(req: Request) {
  try {
    // 1. Get token from query parameters
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      console.warn('Webhook Telegram llamado sin token query param.');
      return NextResponse.json({ ok: false, error: 'Token no especificado' }, { status: 200 });
    }

    const body = await req.json().catch(() => null);
    if (!body || !body.message) {
      // Return 200 OK so Telegram stops sending this update
      return NextResponse.json({ ok: true });
    }

    const { chat, text, from } = body.message;
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

    // 2. Find the agent registered with this telegram bot token
    const agent = await prisma.agent.findFirst({
      where: { telegramToken: token },
      include: {
        documents: true,
        project: { select: { merchantId: true } },
      },
    });

    if (!agent) {
      console.error(`Ningún agente registrado con el token de Telegram: ${token}`);
      return NextResponse.json({ ok: true });
    }

    // 2b. Tope diario persistente por agente (control de costos)
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
    const telegramUrl = `https://api.telegram.org/bot${token}/sendMessage`;
    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: aiResponse,
        parse_mode: 'Markdown', // Gemini responds in Markdown, which Telegram renders beautifully
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error al enviar mensaje a Telegram (chat_id: ${chatId}):`, errorText);
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Error general en Webhook de Telegram:', error);
    // Always return 200 OK to Telegram webhooks so they don't block the endpoint
    return NextResponse.json({ ok: true });
  }
}
