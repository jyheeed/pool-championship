import { NextRequest, NextResponse } from 'next/server';
import { getPlayerProfile } from '@/lib/mongo-service';
import { internalServerError } from '@/lib/api-errors';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const profile = await getPlayerProfile(id);

    if (!profile) {
      return NextResponse.json({ success: false, error: 'Player not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: profile });
  } catch (error: unknown) {
    return internalServerError(error, 'public.player.GET');
  }
}
