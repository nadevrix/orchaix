import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getRelevantContext, askGemini } from '@/lib/gemini';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { agentId, clientIdentifier, message, platform } = body;

    if (!agentId || !clientIdentifier || !message || !platform) {
      return NextResponse.json(
        { error: 'Faltan parámetros obligatorios: agentId, clientIdentifier, message, platform' },
        { status: 400 }
      );
    }

    if (typeof message !== 'string' || message.trim() === '') {
      return NextResponse.json(
        { error: 'El mensaje no puede estar vacío' },
        { status: 400 }
      );
    }

    if (message.length > 4000) {
      return NextResponse.json(
        { error: 'El mensaje supera el límite de 4000 caracteres' },
        { status: 400 }
      );
    }

    // 1. Fetch agent along with its own training documents
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      include: {
        documents: true,
      },
    });

    if (!agent) {
      return NextResponse.json(
        { error: 'El agente especificado no existe' },
        { status: 404 }
      );
    }

    // 2. Find or create the chat session
    let session = await prisma.chatSession.findFirst({
      where: {
        agentId,
        clientIdentifier,
        platform,
      },
    });

    if (!session) {
      session = await prisma.chatSession.create({
        data: {
          agentId,
          clientIdentifier,
          platform,
        },
      });
    }

    // 3. Retrieve recent history (last 20 messages) to keep context light
    const dbMessages = (
      await prisma.message.findMany({
        where: { chatSessionId: session.id },
        orderBy: { createdAt: 'desc' },
        take: 20,
      })
    ).reverse();

    // Format database messages to match Gemini's expectations (sender: "user" | "ai")
    const chatHistory = dbMessages.map((msg) => ({
      sender: msg.sender, // "user" or "ai"
      content: msg.content,
    }));

    // 4. Retrieve matching RAG context
    const context = getRelevantContext(message, agent.documents);

    // 5. Ask Gemini for the response
    const aiResponse = await askGemini(
      agent.systemInstruction,
      context,
      chatHistory,
      message
    );

    // 6. Save user message and AI response to the database
    await prisma.$transaction([
      prisma.message.create({
        data: {
          chatSessionId: session.id,
          sender: 'user',
          content: message,
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

    // Return the response and session ID
    return NextResponse.json({
      response: aiResponse,
      sessionId: session.id,
    });
  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json(
      { error: 'Error interno al procesar el mensaje' },
      { status: 500 }
    );
  }
}
