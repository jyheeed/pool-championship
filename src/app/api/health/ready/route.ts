import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';

export const runtime = 'nodejs';

function normalizeOptionalUrl(value?: string) {
  const raw = value?.trim();
  if (!raw || raw === 'undefined' || raw === 'null') {
    return '';
  }
  return raw;
}

async function checkVisionService() {
  const base = normalizeOptionalUrl(process.env.VISION_SERVICE_INTERNAL_URL);
  if (!base) {
    return { configured: false, ok: true };
  }

  try {
    const res = await fetch(`${base.replace(/\/$/, '')}/health`, { cache: 'no-store' });
    return { configured: true, ok: res.ok, status: res.status };
  } catch {
    return { configured: true, ok: false };
  }
}

export async function GET() {
  try {
    await dbConnect();
    const vision = await checkVisionService();

    const ready = vision.ok;
    return NextResponse.json(
      {
        success: ready,
        service: 'pool-web',
        status: ready ? 'ready' : 'degraded',
        checks: {
          mongodb: true,
          vision,
        },
        deploymentTag: 'vercel-ready-2026-04-15-a',
        timestamp: new Date().toISOString(),
      },
      { status: ready ? 200 : 503 }
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
