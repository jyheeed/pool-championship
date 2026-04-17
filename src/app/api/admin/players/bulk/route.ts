import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import { deletePlayers, updatePlayersBulk } from '@/lib/mongo-service';

type BulkAction = {
  action: 'seed' | 'unseed' | 'delete';
  ids: string[];
  poolGroup?: string;
};

export async function POST(req: NextRequest) {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const body: BulkAction = await req.json();
    const { action, ids = [] } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ success: false, error: 'Invalid ids array' }, { status: 400 });
    }

    if (action === 'delete') {
      await deletePlayers(ids);
      return NextResponse.json({ success: true, deleted: ids.length });
    }

    if (action === 'seed') {
      const poolGroup = body.poolGroup?.trim();
      if (!poolGroup) {
        return NextResponse.json({ success: false, error: 'poolGroup is required for seed' }, { status: 400 });
      }
      await updatePlayersBulk(ids, { pool_group: poolGroup, is_seeded: true });
      return NextResponse.json({ success: true, updated: ids.length });
    }

    if (action === 'unseed') {
      await updatePlayersBulk(ids, { is_seeded: false });
      return NextResponse.json({ success: true, updated: ids.length });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Bulk player action error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
