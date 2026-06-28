import { NextResponse } from 'next/server';
import { getMerchantFromRequest } from '@/lib/jwt';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const payload = getMerchantFromRequest(req);
    if (!payload) {
      return NextResponse.json(
        { error: 'No autorizado. Token inválido o expirado' },
        { status: 401 }
      );
    }

    const merchant = await prisma.merchant.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        username: true,
        businessName: true,
        createdAt: true,
      },
    });

    if (!merchant) {
      return NextResponse.json(
        { error: 'Comercio no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({ merchant });
  } catch (error) {
    console.error('Error in /api/auth/me:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
