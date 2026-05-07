import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import { internalServerError } from '@/lib/api-errors';
import { generatePhase2Draw } from '@/lib/tournament/phase-2-service';

export const dynamic = 'force-dynamic';

export async function POST() {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const result = await generatePhase2Draw();
    return NextResponse.json({ success: true, data: result });
  } catch (error: unknown) {
    return internalServerError(error, 'admin.tournament.phase-2.draw.POST');
  }
}
