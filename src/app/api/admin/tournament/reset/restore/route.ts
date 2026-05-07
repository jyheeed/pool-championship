import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import dbConnect from '@/lib/mongodb';
import TournamentResetSnapshot from '@/models/TournamentResetSnapshot';
import { internalServerError } from '@/lib/api-errors';
import mongoose from 'mongoose';

type RestorePayload = {
  snapshotId?: string;
};

function stripSystemFields<T extends Record<string, unknown>>(doc: T): Record<string, unknown> {
  const { _id, __v, createdAt, updatedAt, ...rest } = doc;
  void _id;
  void __v;
  void createdAt;
  void updatedAt;
  return rest;
}

async function replaceCollection(name: string, docs: Record<string, unknown>[]) {
  const collection = mongoose.connection.collection(name);
  await collection.deleteMany({});
  if (docs.length > 0) {
    await collection.insertMany(docs, { ordered: true });
  }
}

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const payload = (await req.json().catch(() => ({}))) as RestorePayload;
    const snapshotId = (payload.snapshotId || '').trim();

    if (!snapshotId) {
      return NextResponse.json({ success: false, error: 'snapshotId is required' }, { status: 400 });
    }

    await dbConnect();

    const snapshot = await TournamentResetSnapshot.findOne({ snapshotId }).lean();
    if (!snapshot) {
      return NextResponse.json({ success: false, error: 'Snapshot not found' }, { status: 404 });
    }

    const players = (snapshot.data.players || []).map((doc) => stripSystemFields(doc as Record<string, unknown>));
    const matches = (snapshot.data.matches || []).map((doc) => stripSystemFields(doc as Record<string, unknown>));
    const settings = (snapshot.data.settings || []).map((doc) => stripSystemFields(doc as Record<string, unknown>));
    const clubs = (snapshot.data.clubs || []).map((doc) => stripSystemFields(doc as Record<string, unknown>));
    const registrations = (snapshot.data.registrations || []).map((doc) => stripSystemFields(doc as Record<string, unknown>));

    await replaceCollection('players', players);
    await replaceCollection('matches', matches);
    await replaceCollection('settings', settings);
    await replaceCollection('clubs', clubs);
    await replaceCollection('registrations', registrations);

    return NextResponse.json({
      success: true,
      data: {
        snapshotId,
        restored: {
          players: players.length,
          matches: matches.length,
          settings: settings.length,
          clubs: clubs.length,
          registrations: registrations.length,
        },
      },
    });
  } catch (error: unknown) {
    return internalServerError(error, 'admin.tournament.reset.restore.POST');
  }
}
