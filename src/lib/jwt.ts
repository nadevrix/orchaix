import jwt from 'jsonwebtoken';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET no está configurado. Define esta variable de entorno en producción.');
    }
    console.warn('ADVERTENCIA: JWT_SECRET no está configurado. Usando secreto de desarrollo inseguro.');
    return 'dev-only-insecure-secret';
  }
  return secret;
}

export interface TokenPayload {
  userId: string;
  email: string;
  username: string;
  country: string;
}

/**
 * Sign a new token for a merchant
 */
export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '7d' });
}

/**
 * Verify a token and return the payload or null if invalid
 */
export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as TokenPayload;
  } catch {
    return null;
  }
}

/**
 * Extract token from Authorization header and verify it
 */
export function getMerchantFromRequest(req: Request): TokenPayload | null {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  return verifyToken(token);
}
