import { NextResponse } from 'next/server';
import { getStandings } from '@/lib/mongo-service';
import { internalServerError } from '@/lib/api-errors';

export async function GET() {
  try {
    const standings = await getStandings();
    return NextResponse.json({ success: true, data: standings });
  } catch (error: unknown) {
    return internalServerError(error, 'public.standings.GET');
  }
}
