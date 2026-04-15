import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import { internalServerError } from '@/lib/api-errors';
import { clubRowSchema } from '@/lib/api-schemas';
import { addClub, deleteClub, getClubs, updateClub } from '@/lib/mongo-service';
import type { ClubRow } from '@/lib/types';

export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const parsed = clubRowSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message || 'Invalid payload' }, { status: 400 });
    }
    const body = parsed.data as ClubRow;
    
    const allClubs = await getClubs();
    if (allClubs.some(c => c.id === body.id)) {
      return NextResponse.json({ success: false, error: 'Club ID already exists' }, { status: 400 });
    }

    await addClub(body);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return internalServerError(error, 'admin.clubs.POST');
  }
}

export async function PUT(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const parsed = clubRowSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message || 'Invalid payload' }, { status: 400 });
    }
    const body = parsed.data as ClubRow;

    const allClubs = await getClubs();
    if (!allClubs.some(c => c.id === body.id)) {
      return NextResponse.json({ success: false, error: 'Club not found' }, { status: 404 });
    }
    
    await updateClub(body.id, body);
    return NextResponse.json({ success: true });
      } catch (error: unknown) {
        return internalServerError(error, 'admin.clubs.PUT');
  }
}

export async function DELETE(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id')?.trim();
    if (!id) return NextResponse.json({ success: false, error: 'ID required' }, { status: 400 });

    const allClubs = await getClubs();
    if (!allClubs.some(c => c.id === id)) {
      return NextResponse.json({ success: false, error: 'Club not found' }, { status: 404 });
    }

    await deleteClub(id);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return internalServerError(error, 'admin.clubs.DELETE');
  }
}
