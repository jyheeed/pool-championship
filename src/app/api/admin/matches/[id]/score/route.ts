import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import { internalServerError } from '@/lib/api-errors';
import { scoreUpdateSchema } from '@/lib/api-schemas';
import dbConnect from '@/lib/mongodb';
import MatchModel from '@/models/Match';
import { advanceKnockoutBracket } from '@/lib/tournament/final-phase-service';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { id } = await params;
    const parsed = scoreUpdateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message || 'Invalid payload' }, { status: 400 });
    }

    const { score1, score2, status, frameScores } = parsed.data;

    await dbConnect();
    const existingMatch = await MatchModel.findOne({ id }).lean();
    if (!existingMatch) {
      return NextResponse.json({ success: false, error: 'Match not found' }, { status: 404 });
    }

    if (existingMatch.phase === 'knockout' && status === 'completed' && score1 === score2) {
      return NextResponse.json(
        { success: false, error: 'Knockout matches cannot end in a draw' },
        { status: 400 }
      );
    }

    const match = await MatchModel.findOneAndUpdate(
      { id },
      { 
        $set: { 
          score1, 
          score2, 
          status, 
          frameScores 
        } 
      },
      { new: true }
    );

    if (!match) {
      return NextResponse.json({ success: false, error: 'Match not found' }, { status: 404 });
    }

    let bracketUpdate: {
      advanced: boolean;
      winnerId?: string;
      fromMatchId?: string;
      toMatchId?: string;
      slot?: 'player1Id' | 'player2Id';
      reason?: string;
    } | null = null;

    if (match.phase === 'knockout' && status === 'completed') {
      bracketUpdate = await advanceKnockoutBracket(id);
    }

    return NextResponse.json({ success: true, data: match, bracketUpdate });
  } catch (error: unknown) {
    return internalServerError(error, 'admin.matches.score.PATCH');
  }
}
