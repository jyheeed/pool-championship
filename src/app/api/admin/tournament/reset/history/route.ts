import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import dbConnect from '@/lib/mongodb';
import TournamentResetSnapshot from '@/models/TournamentResetSnapshot';
import { internalServerError } from '@/lib/api-errors';

export const dynamic = 'force-dynamic';

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    await dbConnect();

    const snapshots = await TournamentResetSnapshot.find({})
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    const data = snapshots.map((snapshot) => ({
      snapshotId: snapshot.snapshotId,
      reason: snapshot.reason || null,
      nextDiscipline: snapshot.nextDiscipline || null,
      counts: snapshot.counts,
      createdAt: snapshot.createdAt,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    return internalServerError(error, 'admin.tournament.reset.history.GET');
  }
}
