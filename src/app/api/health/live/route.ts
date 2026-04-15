import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({
    success: true,
    service: 'pool-web',
    status: 'live',
    timestamp: new Date().toISOString(),
  });
}
