import { NextRequest, NextResponse } from 'next/server';
import { internalServerError } from '@/lib/api-errors';
import { consumeRateLimit, resetRateLimit } from '@/lib/api-rate-limit';
import { loginSchema } from '@/lib/api-schemas';
import { signToken, verifyPassword, COOKIE_NAME } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const forwardedFor = req.headers.get('x-forwarded-for');
    const clientIp = forwardedFor?.split(',')[0]?.trim() || 'unknown';
    const rateLimitKey = `auth:login:${clientIp}`;
    const rateLimitResult = consumeRateLimit(rateLimitKey, 5, 15 * 60 * 1000);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Too many login attempts. Please try again later.',
          retryAfterSeconds: rateLimitResult.retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfterSeconds),
          },
        }
      );
    }

    const parsed = loginSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message || 'Invalid payload' }, { status: 400 });
    }

    const { username, password } = parsed.data;
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';

    if (process.env.NODE_ENV === 'production' && !process.env.ADMIN_USERNAME) {
      return NextResponse.json({ success: false, error: 'ADMIN_USERNAME is missing in production' }, { status: 500 });
    }

    if (username !== adminUsername) {
      return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
    }

    const valid = await verifyPassword(password);
    if (!valid) {
      return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
    }

    const token = await signToken({ username });

    const res = NextResponse.json({ success: true });
    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 8, // 8 hours
      path: '/',
    });

    resetRateLimit(rateLimitKey);

    return res;
  } catch (error: unknown) {
    return internalServerError(error, 'auth.login.POST');
  }
}
