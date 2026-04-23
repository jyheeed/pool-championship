import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import { internalServerError } from '@/lib/api-errors';
import { getTournamentState } from '@/lib/tournament/tournament-service';

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const state = await getTournamentState();
    return NextResponse.json({ success: true, data: state });
  } catch (error: unknown) {
    return internalServerError(error, 'admin.tournament.state.GET');
  }
}
