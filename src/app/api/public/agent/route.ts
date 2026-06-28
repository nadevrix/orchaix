import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/public/agent?agentId=xxx
// GET /api/public/agent?username=xxx&projectSlug=yyy&agentSlug=zzz
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get('agentId');
    const username = searchParams.get('username');
    const projectSlug = searchParams.get('projectSlug');
    const agentSlug = searchParams.get('agentSlug');

    if (agentId) {
      const agent = await prisma.agent.findUnique({
        where: { id: agentId },
        include: {
          project: {
            include: {
              merchant: {
                select: {
                  username: true,
                  businessName: true,
                  country: true,
                },
              },
            },
          },
        },
      });

      if (!agent) {
        return NextResponse.json({ error: 'Agente no encontrado' }, { status: 404 });
      }

      return NextResponse.json({
        agent: {
          id: agent.id,
          name: agent.name,
          slug: agent.slug,
          projectId: agent.projectId,
          projectName: agent.project.name,
          restrictedCountries: agent.project.restrictedCountries,
          merchantUsername: agent.project.merchant.username,
          merchantBusinessName: agent.project.merchant.businessName,
          merchantCountry: agent.project.merchant.country,
        },
      });
    }

    if (username && projectSlug && agentSlug) {
      const merchant = await prisma.merchant.findUnique({
        where: { username: username.toLowerCase() },
      });

      if (!merchant) {
        return NextResponse.json({ error: 'Comercio no encontrado' }, { status: 404 });
      }

      const project = await prisma.project.findUnique({
        where: {
          merchantId_slug: {
            merchantId: merchant.id,
            slug: projectSlug.toLowerCase(),
          },
        },
      });

      if (!project) {
        return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 });
      }

      const agent = await prisma.agent.findUnique({
        where: {
          projectId_slug: {
            projectId: project.id,
            slug: agentSlug.toLowerCase(),
          },
        },
      });

      if (!agent) {
        return NextResponse.json({ error: 'Agente no encontrado' }, { status: 404 });
      }

      return NextResponse.json({
        agent: {
          id: agent.id,
          name: agent.name,
          slug: agent.slug,
          projectId: project.id,
          projectName: project.name,
          restrictedCountries: project.restrictedCountries,
          merchantUsername: merchant.username,
          merchantBusinessName: merchant.businessName,
          merchantCountry: merchant.country,
        },
      });
    }

    return NextResponse.json(
      { error: 'Debe proveer agentId o la combinación de username, projectSlug y agentSlug' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error resolving public agent:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
