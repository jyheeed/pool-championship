import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import { internalServerError } from '@/lib/api-errors';
import { scheduleManualEditSchema } from '@/lib/api-schemas';
import { updateGroupMatchSchedule } from '@/lib/tournament/tournament-service';

type Params = {
  params: Promise<{ id: string }>;
};

export async function PUT(req: NextRequest, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { id } = await params;
    const matchId = id.trim();
    if (!matchId) {
      return NextResponse.json({ success: false, error: 'Match ID is required' }, { status: 400 });
    }

    const parsed = scheduleManualEditSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message || 'Invalid payload' }, { status: 400 });
    }

    const result = await updateGroupMatchSchedule(
      matchId,
      parsed.data.scheduledAt,
      parsed.data.venue,
      parsed.data.tableNumber
    );
    return NextResponse.json({ success: true, data: result });
  } catch (error: unknown) {
    return internalServerError(error, 'admin.tournament.match-schedule.PUT');
  }
}
