import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { signToken } from '@/lib/jwt';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Correo y contraseña son obligatorios' },
        { status: 400 }
      );
    }

    // Find merchant by email
    const merchant = await prisma.merchant.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!merchant) {
      return NextResponse.json(
        { error: 'Credenciales incorrectas' },
        { status: 401 }
      );
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, merchant.passwordHash);
    if (!passwordMatch) {
      return NextResponse.json(
        { error: 'Credenciales incorrectas' },
        { status: 401 }
      );
    }

    // Sign JWT
    const token = signToken({
      userId: merchant.id,
      email: merchant.email,
      username: merchant.username,
      country: merchant.country,
    });

    return NextResponse.json({
      message: 'Inicio de sesión exitoso',
      token,
      merchant: {
        id: merchant.id,
        email: merchant.email,
        username: merchant.username,
        businessName: merchant.businessName,
        country: merchant.country,
      },
    });
  } catch (error: any) {
    console.error('Error in login:', error);
    return NextResponse.json(
      { error: 'Ocurrió un error al procesar el inicio de sesión' },
      { status: 500 }
    );
  }
}
