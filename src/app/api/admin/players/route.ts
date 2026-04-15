import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import { internalServerError } from '@/lib/api-errors';
import { playerRowSchema } from '@/lib/api-schemas';
import { addPlayer, updatePlayer, deletePlayer, getPlayer } from '@/lib/mongo-service';
import type { PlayerRow } from '@/lib/types';

export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const parsed = playerRowSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message || 'Invalid payload' }, { status: 400 });
    }
    const body = { ...parsed.data, is_seeded: parsed.data.is_seeded ?? 'false' } as PlayerRow;
    
    const existing = await getPlayer(body.id);
    if (existing) return NextResponse.json({ success: false, error: 'Player ID already exists' }, { status: 400 });

    await addPlayer(body);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return internalServerError(error, 'admin.players.POST');
  }
}

export async function PUT(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const parsed = playerRowSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message || 'Invalid payload' }, { status: 400 });
    }
    const body = { ...parsed.data, is_seeded: parsed.data.is_seeded ?? 'false' } as PlayerRow;

    const existing = await getPlayer(body.id);
    if (!existing) return NextResponse.json({ success: false, error: 'Player not found' }, { status: 404 });
    
    await updatePlayer(body.id, body);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return internalServerError(error, 'admin.players.PUT');
  }
}

export async function DELETE(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id')?.trim();
    if (!id) return NextResponse.json({ success: false, error: 'ID required' }, { status: 400 });
    
    const existing = await getPlayer(id);
    if (!existing) return NextResponse.json({ success: false, error: 'Player not found' }, { status: 404 });
    
    await deletePlayer(id);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return internalServerError(error, 'admin.players.DELETE');
  }
}
