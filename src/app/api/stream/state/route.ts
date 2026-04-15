import { NextRequest, NextResponse } from 'next/server';
import { internalServerError } from '@/lib/api-errors';
import { getOverlayState, listRecentStreamEvents } from '@/lib/stream-state-service';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const matchId = req.nextUrl.searchParams.get('matchId')?.trim();
    if (!matchId) {
      return NextResponse.json({ success: false, error: 'matchId is required' }, { status: 400 });
    }

    const [state, events] = await Promise.all([
      getOverlayState(matchId),
      listRecentStreamEvents(matchId, 20),
    ]);

    return NextResponse.json({ success: true, data: { state, events } });
  } catch (error: unknown) {
    return internalServerError(error, 'stream.state.GET');
  }
}
