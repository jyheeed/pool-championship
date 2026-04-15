import { NextResponse } from 'next/server';
import { getPlayers } from '@/lib/mongo-service';
import { internalServerError } from '@/lib/api-errors';

export async function GET() {
  try {
    const players = await getPlayers();
    return NextResponse.json({ success: true, data: players });
  } catch (error: unknown) {
    return internalServerError(error, 'public.players.GET');
  }
}
