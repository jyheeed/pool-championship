import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import { internalServerError } from '@/lib/api-errors';
import { matchRowSchema } from '@/lib/api-schemas';
import { addMatch, updateMatch, deleteMatch, getMatches } from '@/lib/mongo-service';
import type { MatchRow } from '@/lib/types';

export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const parsed = matchRowSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message || 'Invalid payload' }, { status: 400 });
    }
    const body = parsed.data as MatchRow;
    
    const allMatches = await getMatches();
    if (allMatches.some(m => m.id === body.id)) {
      return NextResponse.json({ success: false, error: 'Match ID already exists' }, { status: 400 });
    }

    await addMatch(body);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return internalServerError(error, 'admin.matches.POST');
  }
}

export async function PUT(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const parsed = matchRowSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message || 'Invalid payload' }, { status: 400 });
    }
    const body = parsed.data as MatchRow;

    const allMatches = await getMatches();
    if (!allMatches.some(m => m.id === body.id)) {
      return NextResponse.json({ success: false, error: 'Match not found' }, { status: 404 });
    }
    
    await updateMatch(body.id, body);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return internalServerError(error, 'admin.matches.PUT');
  }
}

export async function DELETE(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id')?.trim();
    if (!id) return NextResponse.json({ success: false, error: 'ID required' }, { status: 400 });
    
    const allMatches = await getMatches();
    if (!allMatches.some(m => m.id === id)) {
      return NextResponse.json({ success: false, error: 'Match not found' }, { status: 404 });
    }
    
    await deleteMatch(id);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return internalServerError(error, 'admin.matches.DELETE');
  }
}
