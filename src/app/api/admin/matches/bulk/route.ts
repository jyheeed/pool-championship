import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import { deleteMatches } from '@/lib/mongo-service';

type BulkAction = {
  action: 'delete';
  ids: string[];
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
      await deleteMatches(ids);
      return NextResponse.json({ success: true, deleted: ids.length });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Bulk match action error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
