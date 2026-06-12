import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import { internalServerError } from '@/lib/api-errors';
import { matchRowSchema } from '@/lib/api-schemas';
import dbConnect from '@/lib/mongodb';
import MatchModel from '@/models/Match';
import { addMatch, deleteMatch, getMatches } from '@/lib/mongo-service';
import { advanceKnockoutBracket } from '@/lib/tournament/final-phase-service';
import type { MatchRow } from '@/lib/types';

export const dynamic = 'force-dynamic';

type MatchStatus = 'scheduled' | 'live' | 'completed' | 'postponed' | 'pending' | 'bye';

type ExistingMatchDoc = {
  id: string;
  round: string;
  date: string;
  time?: string;
  venue?: string;
  phase?: 'group' | 'group2' | 'knockout';
  player1Id: string;
  player2Id: string;
  score1?: number | null;
  score2?: number | null;
  status: MatchStatus;
  winnerId?: string | null;
  frameScores?: string;
  notes?: string;
  discipline?: '8-ball' | '9-ball' | '10-ball';
};

function parseScoreValue(value: string | number | null | undefined): number | null {
  if (value === undefined || value === null || value === '') return null;

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;

  return parsed;
}

function isPlaceholderPlayer(playerId?: string | null): boolean {
  if (!playerId) return true;
  if (playerId === 'X') return true;
  return /^WINNER[_-]ko/i.test(playerId);
}

export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const parsed = matchRowSchema.safeParse(await req.json());

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Invalid payload' },
        { status: 400 }
      );
    }

    const body = parsed.data as MatchRow;

    const allMatches = await getMatches();

    if (allMatches.some((match) => match.id === body.id)) {
      return NextResponse.json(
        { success: false, error: 'Match ID already exists' },
        { status: 400 }
      );
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
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Invalid payload' },
        { status: 400 }
      );
    }

    const body = parsed.data as MatchRow;

    await dbConnect();

    const existingMatchRaw = await MatchModel.findOne({ id: body.id }).lean();
    const existingMatch = existingMatchRaw as ExistingMatchDoc | null;

    if (!existingMatch) {
      return NextResponse.json(
        { success: false, error: 'Match not found' },
        { status: 404 }
      );
    }

    const score1 = parseScoreValue(body.score1);
    const score2 = parseScoreValue(body.score2);

    const nextPlayer1Id = body.player1_id || existingMatch.player1Id;
    const nextPlayer2Id = body.player2_id || existingMatch.player2Id;
    const nextStatus = (body.status || existingMatch.status || 'scheduled') as MatchStatus;

    let winnerId: string | null = existingMatch.winnerId ?? null;

    if (existingMatch.phase === 'knockout' && nextStatus === 'completed') {
      if (score1 === null || score2 === null) {
        return NextResponse.json(
          {
            success: false,
            error: 'Both scores are required for a completed knockout match',
          },
          { status: 400 }
        );
      }

      if (score1 === score2) {
        return NextResponse.json(
          {
            success: false,
            error: 'Knockout matches cannot end in a draw',
          },
          { status: 400 }
        );
      }

      if (isPlaceholderPlayer(nextPlayer1Id) || isPlaceholderPlayer(nextPlayer2Id)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Cannot complete a knockout match before both players are known',
          },
          { status: 400 }
        );
      }

      winnerId = score1 > score2 ? nextPlayer1Id : nextPlayer2Id;
    }

    const updatedMatch = await MatchModel.findOneAndUpdate(
      { id: body.id },
      {
        $set: {
          round: body.round,
          date: body.date,
          time: body.time,
          venue: body.venue,
          player1Id: nextPlayer1Id,
          player2Id: nextPlayer2Id,
          score1,
          score2,
          status: nextStatus,
          frameScores: body.frame_scores,
          notes: body.notes,
          discipline: body.discipline || existingMatch.discipline || '8-ball',
          winnerId,
        },
      },
      { new: true }
    );

    let bracketUpdate = null;

    if (existingMatch.phase === 'knockout' && nextStatus === 'completed') {
      bracketUpdate = await advanceKnockoutBracket(body.id, {
        allowOverwrite: true,
      });
    }

    return NextResponse.json({
      success: true,
      data: updatedMatch,
      bracketUpdate,
    });
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

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID required' },
        { status: 400 }
      );
    }

    const allMatches = await getMatches();

    if (!allMatches.some((match) => match.id === id)) {
      return NextResponse.json(
        { success: false, error: 'Match not found' },
        { status: 404 }
      );
    }

    await deleteMatch(id);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return internalServerError(error, 'admin.matches.DELETE');
  }
}