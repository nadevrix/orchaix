import { NextResponse } from 'next/server';
import { getMerchantFromRequest } from '@/lib/jwt';
import { prisma } from '@/lib/prisma';
import {
  extractTextFromFile,
  isSupportedFile,
  SUPPORTED_EXTENSIONS,
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_LABEL,
} from '@/lib/extract-text';

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
// Acepta JSON ({ title, content, sourceType }) o multipart/form-data con un
// archivo (PDF, DOCX, TXT, MD, CSV) del que se extrae el texto en el servidor.
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

    let title: string;
    let content: string;
    let sourceType: string;

    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      // Subida de archivo
      const formData = await req.formData();
      const file = formData.get('file');

      if (!(file instanceof File)) {
        return NextResponse.json(
          { error: 'No se recibió ningún archivo' },
          { status: 400 }
        );
      }

      if (!isSupportedFile(file.name)) {
        return NextResponse.json(
          { error: `Formato no soportado. Formatos permitidos: ${SUPPORTED_EXTENSIONS.map((e) => '.' + e).join(', ')}` },
          { status: 400 }
        );
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          { error: `El archivo supera el tamaño máximo de ${MAX_FILE_SIZE_LABEL}` },
          { status: 400 }
        );
      }

      try {
        content = await extractTextFromFile(file);
      } catch (extractError) {
        const msg = extractError instanceof Error
          ? extractError.message
          : 'No se pudo procesar el archivo';
        return NextResponse.json({ error: msg }, { status: 400 });
      }

      const customTitle = formData.get('title');
      title = typeof customTitle === 'string' && customTitle.trim()
        ? customTitle.trim()
        : file.name.replace(/\.[^.]+$/, '');
      sourceType = 'file';
    } else {
      // Carga manual de texto (JSON)
      const body = await req.json().catch(() => ({}));
      ({ title, content, sourceType } = body);

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
