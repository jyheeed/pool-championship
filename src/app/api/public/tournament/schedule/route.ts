import { NextResponse } from 'next/server';
import { internalServerError } from '@/lib/api-errors';
import { getScheduleView } from '@/lib/tournament/tournament-service';

export async function GET() {
  try {
    const schedule = await getScheduleView();
    return NextResponse.json({ success: true, data: schedule });
  } catch (error: unknown) {
    return internalServerError(error, 'public.tournament.schedule.GET');
  }
}
