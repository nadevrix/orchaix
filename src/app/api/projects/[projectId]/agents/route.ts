import { NextResponse } from 'next/server';
import { getMerchantFromRequest } from '@/lib/jwt';
import { prisma } from '@/lib/prisma';
import { registerTelegramWebhook } from '@/lib/telegram';

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

    let agent = await prisma.agent.create({
      data: {
        projectId,
        name,
        slug: slug.toLowerCase(),
        systemInstruction,
        rawInstruction,
      },
    });

    // Si viene token de Telegram, registrar el webhook. El registro necesita el
    // ID del agente, por eso se crea primero; si Telegram rechaza el token se
    // revierte la creación para no dejar un agente con un bot muerto.
    if (telegramToken) {
      const registration = await registerTelegramWebhook(agent.id, telegramToken);
      if (!registration.ok) {
        await prisma.agent.delete({ where: { id: agent.id } });
        return NextResponse.json({ error: registration.error }, { status: registration.status });
      }
      agent = await prisma.agent.update({
        where: { id: agent.id },
        data: { telegramToken, telegramSecret: registration.secret },
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
