import { NextResponse } from 'next/server';
import { getMerchantFromRequest } from '@/lib/jwt';
import { prisma } from '@/lib/prisma';

// DELETE /api/projects/[projectId]/agents/[agentId]/documents/[documentId] - Remove a document
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ projectId: string; agentId: string; documentId: string }> }
) {
  try {
    const payload = getMerchantFromRequest(req);
    if (!payload) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { projectId, agentId, documentId } = await params;

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

    // Verify document exists and belongs to this agent
    const document = await prisma.document.findFirst({
      where: { id: documentId, agentId },
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Documento no encontrado en este agente' },
        { status: 404 }
      );
    }

    // Delete the document
    await prisma.document.delete({
      where: { id: documentId },
    });

    return NextResponse.json({
      message: 'Documento de entrenamiento eliminado con éxito',
    });
  } catch (error) {
    console.error('Error deleting agent document:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
