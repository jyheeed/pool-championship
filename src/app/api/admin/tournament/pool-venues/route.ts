import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import { internalServerError } from '@/lib/api-errors';
import { assignGroupVenuesFromExistingGroups } from '@/lib/tournament/tournament-service';

export const dynamic = 'force-dynamic';

export async function POST() {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const result = await assignGroupVenuesFromExistingGroups();
    return NextResponse.json({ success: true, data: result });
  } catch (error: unknown) {
    return internalServerError(error, 'admin.tournament.pool-venues.POST');
  }
}