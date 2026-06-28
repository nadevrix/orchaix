import { NextResponse } from 'next/server';
import { getMerchantFromRequest } from '@/lib/jwt';
import { prisma } from '@/lib/prisma';

// GET /api/projects/[projectId] - Retrieve project details including documents
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

    return NextResponse.json({ project });
  } catch (error) {
    console.error('Error fetching project:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PUT /api/projects/[projectId] - Update project details
export async function PUT(
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
    const { name, description, slug, restrictedCountries } = body;

    // Check project exists and belongs to merchant
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

    const updateData: any = {};

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description || null;
    if (restrictedCountries !== undefined) {
      updateData.restrictedCountries = Array.isArray(restrictedCountries) ? restrictedCountries : [];
    }

    if (slug !== undefined && slug !== project.slug) {
      // Validate slug format
      const slugRegex = /^[a-z0-9-]+$/;
      if (!slugRegex.test(slug)) {
        return NextResponse.json(
          { error: 'El slug debe contener únicamente letras minúsculas, números y guiones (-)' },
          { status: 400 }
        );
      }

      // Check slug uniqueness
      const existingSlug = await prisma.project.findFirst({
        where: {
          merchantId: payload.userId,
          slug: slug.toLowerCase(),
          id: { not: projectId },
        },
      });

      if (existingSlug) {
        return NextResponse.json(
          { error: 'Ya tienes otro proyecto registrado con ese mismo slug' },
          { status: 400 }
        );
      }

      updateData.slug = slug.toLowerCase();
    }

    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: updateData,
    });

    return NextResponse.json({
      message: 'Proyecto actualizado con éxito',
      project: updatedProject,
    });
  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[projectId] - Delete project
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const payload = getMerchantFromRequest(req);
    if (!payload) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { projectId } = await params;

    // Check project exists and belongs to merchant
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

    await prisma.project.delete({
      where: { id: projectId },
    });

    return NextResponse.json({
      message: 'Proyecto eliminado con éxito',
    });
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
