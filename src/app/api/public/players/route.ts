import { NextResponse } from 'next/server';
import { getPlayers } from '@/lib/mongo-service';
import { internalServerError } from '@/lib/api-errors';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    console.log('📥 GET /api/public/players');
    const players = await getPlayers();
    console.log(`✅ Returned ${players.length} players`);
    return NextResponse.json({ success: true, data: players });
  } catch (error: unknown) {
    console.error('❌ Error fetching players:', error);
    if (error instanceof Error) {
      console.error('  Message:', error.message);
      console.error('  Stack:', error.stack);
    }
    return internalServerError(error, 'public.players.GET');
  }
}
