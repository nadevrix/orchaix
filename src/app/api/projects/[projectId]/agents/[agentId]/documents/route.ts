import { NextResponse } from 'next/server';
import { getMerchantFromRequest } from '@/lib/jwt';
import { prisma } from '@/lib/prisma';

// GET /api/projects/[projectId]/agents/[agentId]/documents - List all documents for an agent
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

    // Check project and agent ownership
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
        { error: 'Agente no encontrado o no autorizado' },
        { status: 404 }
      );
    }

    const documents = await prisma.document.findMany({
      where: { agentId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ documents });
  } catch (error) {
    console.error('Error listing agent documents:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST /api/projects/[projectId]/agents/[agentId]/documents - Add training document to the agent
export async function POST(
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
    const { title, content, sourceType } = body;

    if (!title || !content || !sourceType) {
      return NextResponse.json(
        { error: 'Título, contenido y tipo de fuente son obligatorios' },
        { status: 400 }
      );
    }

    if (sourceType !== 'text' && sourceType !== 'url') {
      return NextResponse.json(
        { error: 'El tipo de fuente debe ser "text" o "url"' },
        { status: 400 }
      );
    }

    // Verify project and agent ownership
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
        { error: 'Agente no encontrado o no autorizado' },
        { status: 404 }
      );
    }

    // Create the document linked to the agent
    const document = await prisma.document.create({
      data: {
        agentId,
        title,
        content,
        sourceType,
      },
    });

    return NextResponse.json({
      message: 'Documento de entrenamiento guardado con éxito',
      document,
    });
  } catch (error) {
    console.error('Error adding agent document:', error);
    return NextResponse.json(
      { error: 'Error interno al guardar el documento' },
      { status: 500 }
    );
  }
}
