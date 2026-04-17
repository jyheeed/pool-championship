import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';

export const runtime = 'nodejs';

export async function GET() {
  try {
    await dbConnect();
    return NextResponse.json(
      {
        success: true,
        service: 'pool-web',
        status: 'ready',
        checks: {
          mongodb: true,
        },
        deploymentTag: 'vercel-ready-2026-04-15-a',
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        service: 'pool-web',
        status: 'not_ready',
        checks: {
          mongodb: false,
        },
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
