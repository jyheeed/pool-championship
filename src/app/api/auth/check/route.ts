import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getAdminSession();
  return NextResponse.json({ authenticated: !!session, username: session?.username || null });
}
