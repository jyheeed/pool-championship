import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import { internalServerError } from '@/lib/api-errors';
import { scoreUpdateSchema } from '@/lib/api-schemas';
import dbConnect from '@/lib/mongodb';
import MatchModel from '@/models/Match';

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

    return NextResponse.json({ success: true, data: match });
  } catch (error: unknown) {
    return internalServerError(error, 'admin.matches.score.PATCH');
  }
}
