import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import dbConnect from '@/lib/mongodb';
import PlayerModel from '@/models/Player';
import MatchModel from '@/models/Match';
import SettingsModel from '@/models/Settings';
import ClubModel from '@/models/Club';
import RegistrationModel from '@/models/Registration';
import TournamentResetSnapshot from '@/models/TournamentResetSnapshot';
import { internalServerError } from '@/lib/api-errors';

export const dynamic = 'force-dynamic';

type ResetPayload = {
  reason?: string;
  nextDiscipline?: string;
};

export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const payload = (await req.json().catch(() => ({}))) as ResetPayload;
    const reason = (payload.reason || '').trim();
    const nextDiscipline = (payload.nextDiscipline || '').trim();

    await dbConnect();

    const [players, matches, settings, clubs, registrations] = await Promise.all([
      PlayerModel.find({}).lean(),
      MatchModel.find({}).lean(),
      SettingsModel.find({}).lean(),
      ClubModel.find({}).lean(),
      RegistrationModel.find({}).lean(),
    ]);

    const snapshotId = `reset-${new Date().toISOString().replace(/[:.]/g, '-')}`;

    await TournamentResetSnapshot.create({
      snapshotId,
      reason: reason || undefined,
      nextDiscipline: nextDiscipline || undefined,
      counts: {
        players: players.length,
        matches: matches.length,
        settings: settings.length,
        clubs: clubs.length,
        registrations: registrations.length,
      },
      data: {
        players,
        matches,
        settings,
        clubs,
        registrations,
      },
    });

    const [playersReset, matchesReset] = await Promise.all([
      PlayerModel.updateMany(
        {},
        {
          $set: {
            poolGroup: '',
            phase2Group: '',
            poolVenue: '',
            isSeeded: false,
          },
        }
      ),
      MatchModel.deleteMany({}),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        snapshotId,
        archived: {
          players: players.length,
          matches: matches.length,
          settings: settings.length,
          clubs: clubs.length,
          registrations: registrations.length,
        },
        reset: {
          playersUpdated: playersReset.modifiedCount,
          tournamentMatchesDeleted: matchesReset.deletedCount,
        },
      },
    });
  } catch (error: unknown) {
    return internalServerError(error, 'admin.tournament.reset.POST');
  }
}
