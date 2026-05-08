import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import dbConnect from '@/lib/mongodb';
import PlayerModel from '@/models/Player';
import MatchModel from '@/models/Match';

export const dynamic = 'force-dynamic';

export async function POST() {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    await dbConnect();

    // Clear phase2Group from all players and delete phase='group2' matches
    const [playersReset, matchesReset] = await Promise.all([
      PlayerModel.updateMany(
        {},
        {
          $set: {
            phase2Group: '',
          },
        }
      ),
      MatchModel.deleteMany({ phase: 'group2' }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        playersUpdated: playersReset.modifiedCount,
        matchesDeleted: matchesReset.deletedCount,
        message: `Phase 2 reset completed: ${playersReset.modifiedCount} players cleared, ${matchesReset.deletedCount} matches deleted`,
      },
    });
  } catch (error: unknown) {
    console.error('Phase 2 reset error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reset Phase 2' },
      { status: 500 }
    );
  }
}
