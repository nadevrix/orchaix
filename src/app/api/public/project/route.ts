import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/public/project?username=xxx&slug=yyy
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const username = searchParams.get('username');
    const slug = searchParams.get('slug');

    if (!username || !slug) {
      return NextResponse.json(
        { error: 'Faltan parámetros username y slug' },
        { status: 400 }
      );
    }

    // Find the merchant first
    const merchant = await prisma.merchant.findUnique({
      where: { username: username.toLowerCase() },
    });

    if (!merchant) {
      return NextResponse.json(
        { error: 'Comercio no encontrado' },
        { status: 404 }
      );
    }

    // Find the project belonging to that merchant
    const project = await prisma.project.findUnique({
      where: {
        merchantId_slug: {
          merchantId: merchant.id,
          slug: slug.toLowerCase(),
        },
      },
      select: {
        id: true,
        name: true,
        description: true,
        restrictedCountries: true,
        createdAt: true,
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Proyecto no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      project,
      merchant: {
        businessName: merchant.businessName,
        username: merchant.username,
      },
    });
  } catch (error) {
    console.error('Error fetching public project:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
