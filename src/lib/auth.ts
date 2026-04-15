import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';

const isProd = process.env.NODE_ENV === 'production';
const COOKIE_NAME = 'pool-admin-token';

function getJwtSecretKey(): Uint8Array {
  const jwtSecret = process.env.JWT_SECRET || (isProd ? '' : 'dev-secret-change-me');
  if (isProd && !jwtSecret) {
    throw new Error('JWT_SECRET is required in production');
  }
  return new TextEncoder().encode(jwtSecret);
}

export async function signToken(payload: { username: string }): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('8h')
    .setIssuedAt()
    .sign(getJwtSecretKey());
}

export async function verifyToken(token: string): Promise<{ username: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey());
    return payload as { username: string };
  } catch {
    return null;
  }
}

export async function verifyPassword(password: string): Promise<boolean> {
  const hash = process.env.ADMIN_PASSWORD_HASH;
  if (!hash) {
    if (isProd) {
      throw new Error('ADMIN_PASSWORD_HASH is missing in production');
    }
    return password === 'admin';
  }
  return bcrypt.compare(password, hash);
}

export async function getAdminSession(): Promise<{ username: string } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export { COOKIE_NAME };
