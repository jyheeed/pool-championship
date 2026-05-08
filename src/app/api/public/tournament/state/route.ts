import { NextResponse } from 'next/server';
import { internalServerError } from '@/lib/api-errors';
import { getTournamentState } from '@/lib/tournament/tournament-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const state = await getTournamentState();
    return NextResponse.json({ success: true, data: state });
  } catch (error: unknown) {
    return internalServerError(error, 'public.tournament.state.GET');
  }
}
