import { randomBytes } from 'crypto';
import { NextResponse } from 'next/server';
import { getMerchantFromRequest } from '@/lib/jwt';
import { prisma } from '@/lib/prisma';

// GET /api/projects/[projectId]/agents/[agentId] - Retrieve agent details
export async function GET(
  req: Request,
  { params }: { params: Promise<{ projectId: string; agentId: string }> }
) {
  try {
    const payload = getMerchantFromRequest(req);
    if (!payload) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { projectId, agentId } = await params;

    // Check project belongs to merchant and agent belongs to project
    const agent = await prisma.agent.findFirst({
      where: {
        id: agentId,
        projectId,
        project: {
          merchantId: payload.userId,
        },
      },
    });

    if (!agent) {
      return NextResponse.json(
        { error: 'Agente no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({ agent });
  } catch (error) {
    console.error('Error fetching agent:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PUT /api/projects/[projectId]/agents/[agentId] - Update agent details
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ projectId: string; agentId: string }> }
) {
  try {
    const payload = getMerchantFromRequest(req);
    if (!payload) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { projectId, agentId } = await params;
    const body = await req.json().catch(() => ({}));
    const { name, slug, systemInstruction, rawInstruction, telegramToken } = body;

    // Check project belongs to merchant and agent belongs to project
    const agent = await prisma.agent.findFirst({
      where: {
        id: agentId,
        projectId,
        project: {
          merchantId: payload.userId,
        },
      },
    });

    if (!agent) {
      return NextResponse.json(
        { error: 'Agente no encontrado' },
        { status: 404 }
      );
    }

    const updateData: any = {};

    if (name !== undefined) updateData.name = name;
    if (systemInstruction !== undefined) updateData.systemInstruction = systemInstruction;
    if (rawInstruction !== undefined) updateData.rawInstruction = rawInstruction;
    if (telegramToken !== undefined) {
      updateData.telegramToken = telegramToken || null;

      // If token is updated and not empty, register the Telegram webhook.
      // El webhook lleva el ID del agente en la URL y un secreto que Telegram
      // reenvía en cada update (header X-Telegram-Bot-Api-Secret-Token); así el
      // token del bot nunca viaja en la URL y nadie puede falsificar updates.
      if (telegramToken && telegramToken !== agent.telegramToken) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tudominio.com';
        const webhookSecret = randomBytes(32).toString('hex');
        const webhookUrl = `${appUrl}/api/webhook/telegram?agent=${agentId}`;

        try {
          const res = await fetch(`https://api.telegram.org/bot${telegramToken}/setWebhook`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: webhookUrl, secret_token: webhookSecret }),
          });
          const data = await res.json().catch(() => ({}));

          if (!res.ok || !data.ok) {
            console.error('Error de API de Telegram setWebhook:', data);
            return NextResponse.json(
              {
                error: `Telegram rechazó el token del bot: ${data.description || 'verifica que el token de @BotFather sea correcto'}`,
              },
              { status: 400 }
            );
          }
        } catch (err) {
          console.error('Error de conexión de Telegram setWebhook:', err);
          return NextResponse.json(
            { error: 'No se pudo conectar con Telegram para registrar el webhook. Inténtalo de nuevo.' },
            { status: 502 }
          );
        }

        updateData.telegramSecret = webhookSecret;
      } else if (!telegramToken) {
        updateData.telegramSecret = null;
      }
    }

    if (slug !== undefined && slug !== agent.slug) {
      // Validate slug format
      const slugRegex = /^[a-z0-9-]+$/;
      if (!slugRegex.test(slug)) {
        return NextResponse.json(
          { error: 'El slug debe contener únicamente letras minúsculas, números y guiones (-)' },
          { status: 400 }
        );
      }

      // Check slug uniqueness within project
      const existingSlug = await prisma.agent.findFirst({
        where: {
          projectId,
          slug: slug.toLowerCase(),
          id: { not: agentId },
        },
      });

      if (existingSlug) {
        return NextResponse.json(
          { error: 'Ya existe otro agente en este proyecto con ese mismo slug' },
          { status: 400 }
        );
      }

      updateData.slug = slug.toLowerCase();
    }

    const updatedAgent = await prisma.agent.update({
      where: { id: agentId },
      data: updateData,
    });

    return NextResponse.json({
      message: 'Agente actualizado con éxito',
      agent: updatedAgent,
    });
  } catch (error) {
    console.error('Error updating agent:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[projectId]/agents/[agentId] - Delete agent
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ projectId: string; agentId: string }> }
) {
  try {
    const payload = getMerchantFromRequest(req);
    if (!payload) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { projectId, agentId } = await params;

    // Check project belongs to merchant and agent belongs to project
    const agent = await prisma.agent.findFirst({
      where: {
        id: agentId,
        projectId,
        project: {
          merchantId: payload.userId,
        },
      },
    });

    if (!agent) {
      return NextResponse.json(
        { error: 'Agente no encontrado' },
        { status: 404 }
      );
    }

    await prisma.agent.delete({
      where: { id: agentId },
    });

    return NextResponse.json({
      message: 'Agente eliminado con éxito',
    });
  } catch (error) {
    console.error('Error deleting agent:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
