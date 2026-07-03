import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { signToken } from '@/lib/jwt';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { email, password, country } = body;
    let { username, businessName } = body;

    // Simple validations
    if (!email || !password) {
      return NextResponse.json(
        { error: 'El correo y la contraseña son obligatorios' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (typeof email !== 'string' || !emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'El correo electrónico no tiene un formato válido' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 6 caracteres' },
        { status: 400 }
      );
    }

    // Validate and clean country code
    const merchantCountry = (country && country.trim().length === 2)
      ? country.trim().toLowerCase()
      : 'es';

    // Auto-generate username from email if not provided
    if (!username) {
      const emailPrefix = email.split('@')[0].toLowerCase().replace(/[^a-z0-9-]/g, '');
      let uniqueUsername = emailPrefix || 'user';
      let checkUser = await prisma.merchant.findUnique({
        where: { username: uniqueUsername },
      });
      while (checkUser) {
        uniqueUsername = `${emailPrefix}-${Math.floor(Math.random() * 900) + 100}`;
        checkUser = await prisma.merchant.findUnique({
          where: { username: uniqueUsername },
        });
      }
      username = uniqueUsername;
    } else {
      // Validate username format if provided
      const usernameRegex = /^[a-zA-Z0-9-_]+$/;
      if (!usernameRegex.test(username)) {
        return NextResponse.json(
          { error: 'El nombre de usuario solo puede contener letras, números, guiones (-) y guiones bajos (_)' },
          { status: 400 }
        );
      }
    }

    // Auto-generate businessName if not provided
    if (!businessName) {
      businessName = `Mi Negocio (${username})`;
    }

    // Check if email already exists
    const existingEmail = await prisma.merchant.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingEmail) {
      return NextResponse.json(
        { error: 'El correo electrónico ya está registrado' },
        { status: 400 }
      );
    }

    // Check if username already exists
    const existingUsername = await prisma.merchant.findUnique({
      where: { username: username.toLowerCase() },
    });

    if (existingUsername) {
      return NextResponse.json(
        { error: 'El nombre de usuario ya está en uso' },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create merchant
    const merchant = await prisma.merchant.create({
      data: {
        email: email.toLowerCase(),
        username: username.toLowerCase(),
        passwordHash,
        businessName,
        country: merchantCountry,
      },
    });

    // Sign JWT
    const token = signToken({
      userId: merchant.id,
      email: merchant.email,
      username: merchant.username,
      country: merchant.country,
    });

    return NextResponse.json({
      message: 'Comercio registrado con éxito',
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
    // Unique constraint violated (registro concurrente con mismo email/username)
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { error: 'El correo o nombre de usuario ya está registrado' },
        { status: 400 }
      );
    }
    console.error('Error in register:', error);
    return NextResponse.json(
      { error: 'Ocurrió un error al procesar el registro' },
      { status: 500 }
    );
  }
}
