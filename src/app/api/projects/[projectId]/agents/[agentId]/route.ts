import { NextResponse } from 'next/server';
import { getMerchantFromRequest } from '@/lib/jwt';
import { prisma } from '@/lib/prisma';
import { registerTelegramWebhook } from '@/lib/telegram';

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

      // If token is updated and not empty, register the Telegram webhook
      if (telegramToken && telegramToken !== agent.telegramToken) {
        const registration = await registerTelegramWebhook(agentId, telegramToken);
        if (!registration.ok) {
          return NextResponse.json({ error: registration.error }, { status: registration.status });
        }
        updateData.telegramSecret = registration.secret;
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
