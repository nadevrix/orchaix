import { NextResponse } from 'next/server';
import { getMerchantFromRequest } from '@/lib/jwt';
import { prisma } from '@/lib/prisma';

// GET /api/projects/[projectId]/agents - List all agents of a project
export async function GET(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const payload = getMerchantFromRequest(req);
    if (!payload) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { projectId } = await params;

    // Check project belongs to merchant
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        merchantId: payload.userId,
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Proyecto no encontrado' },
        { status: 404 }
      );
    }

    const agents = await prisma.agent.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ agents });
  } catch (error) {
    console.error('Error fetching agents:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST /api/projects/[projectId]/agents - Create a new agent inside a project
export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const payload = getMerchantFromRequest(req);
    if (!payload) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { projectId } = await params;
    const body = await req.json().catch(() => ({}));
    const { name, slug, systemInstruction, rawInstruction, telegramToken } = body;

    if (!name || !slug || !systemInstruction) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios (nombre, slug, instrucciones)' },
        { status: 400 }
      );
    }

    // Check project belongs to merchant
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        merchantId: payload.userId,
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Proyecto no encontrado' },
        { status: 404 }
      );
    }

    // Validate slug format
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(slug)) {
      return NextResponse.json(
        { error: 'El slug debe contener únicamente letras minúsculas, números y guiones (-)' },
        { status: 400 }
      );
    }

    // Check slug uniqueness per project
    const existingAgent = await prisma.agent.findFirst({
      where: {
        projectId,
        slug: slug.toLowerCase(),
      },
    });

    if (existingAgent) {
      return NextResponse.json(
        { error: 'Ya existe un agente en este proyecto con ese mismo slug' },
        { status: 400 }
      );
    }

    const agent = await prisma.agent.create({
      data: {
        projectId,
        name,
        slug: slug.toLowerCase(),
        systemInstruction,
        rawInstruction,
        telegramToken: telegramToken || null,
      },
    });

    // If telegram token is provided, set webhook
    if (telegramToken) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tudominio.com';
      const webhookUrl = `${appUrl}/api/webhook/telegram?token=${telegramToken}`;
      const telegramSetWebhookUrl = `https://api.telegram.org/bot${telegramToken}/setWebhook?url=${encodeURIComponent(webhookUrl)}`;

      fetch(telegramSetWebhookUrl)
        .then(async (res) => {
          const data = await res.json().catch(() => ({}));
          if (res.ok && data.ok) {
            console.log(`Telegram Webhook configurado con éxito para el agente ${agent.id}`);
          } else {
            console.error('Error de API de Telegram setWebhook:', data);
          }
        })
        .catch((err) => {
          console.error('Error de conexión de Telegram setWebhook:', err);
        });
    }

    return NextResponse.json({
      message: 'Agente creado con éxito',
      agent,
    });
  } catch (error) {
    console.error('Error creating agent:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
