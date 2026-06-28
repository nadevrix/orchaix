import { NextResponse } from 'next/server';
import { getMerchantFromRequest } from '@/lib/jwt';
import { prisma } from '@/lib/prisma';

// GET /api/projects - List all projects for the authenticated merchant
export async function GET(req: Request) {
  try {
    const payload = getMerchantFromRequest(req);
    if (!payload) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const projects = await prisma.project.findMany({
      where: { merchantId: payload.userId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { agents: true },
        },
        agents: {
          select: {
            _count: {
              select: { documents: true }
            }
          }
        }
      },
    });

    const projectsWithDocCount = projects.map(p => {
      const documentsCount = p.agents.reduce((sum, a) => sum + a._count.documents, 0);
      return {
        id: p.id,
        name: p.name,
        description: p.description,
        slug: p.slug,
        restrictedCountries: p.restrictedCountries,
        createdAt: p.createdAt,
        _count: {
          agents: p._count.agents,
          documents: documentsCount
        }
      };
    });

    return NextResponse.json({ projects: projectsWithDocCount });
  } catch (error) {
    console.error('Error listing projects:', error);
    return NextResponse.json(
      { error: 'Error interno al listar proyectos' },
      { status: 500 }
    );
  }
}

// POST /api/projects - Create a new project for the authenticated merchant
export async function POST(req: Request) {
  try {
    const payload = getMerchantFromRequest(req);
    if (!payload) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { name, description, slug, restrictedCountries } = body;

    if (!name || !slug) {
      return NextResponse.json(
        { error: 'El nombre y el slug son obligatorios' },
        { status: 400 }
      );
    }

    // Validate slug format (alphanumeric and hyphens only, no spaces or special chars)
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(slug)) {
      return NextResponse.json(
        { error: 'El slug debe contener únicamente letras minúsculas, números y guiones (-)' },
        { status: 400 }
      );
    }

    // Check if slug is unique for this merchant
    const existingProject = await prisma.project.findUnique({
      where: {
        merchantId_slug: {
          merchantId: payload.userId,
          slug: slug.toLowerCase(),
        },
      },
    });

    if (existingProject) {
      return NextResponse.json(
        { error: 'Ya tienes un proyecto registrado con ese mismo slug' },
        { status: 400 }
      );
    }

    // Create the project
    const project = await prisma.project.create({
      data: {
        merchantId: payload.userId,
        name,
        description: description || null,
        slug: slug.toLowerCase(),
        restrictedCountries: Array.isArray(restrictedCountries) ? restrictedCountries : [],
      },
    });

    return NextResponse.json({
      message: 'Proyecto creado con éxito',
      project,
    });
  } catch (error: any) {
    console.error('Error creating project:', error);
    return NextResponse.json(
      { error: 'Error interno al crear el proyecto' },
      { status: 500 }
    );
  }
}
