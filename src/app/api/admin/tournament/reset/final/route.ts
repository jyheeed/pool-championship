import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import dbConnect from '@/lib/mongodb';
import MatchModel from '@/models/Match';

export const dynamic = 'force-dynamic';

export async function POST() {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    await dbConnect();

    const matchesReset = await MatchModel.deleteMany({ phase: 'knockout' });

    return NextResponse.json({
      success: true,
      data: {
        matchesDeleted: matchesReset.deletedCount,
        message: `Final bracket reset completed: ${matchesReset.deletedCount} matches deleted`,
      },
    });
  } catch (error: unknown) {
    console.error('Final bracket reset error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reset final bracket' },
      { status: 500 }
    );
  }
}