import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import { internalServerError } from '@/lib/api-errors';
import { scheduleGenerationSchema } from '@/lib/api-schemas';
import { generateGroupSchedule } from '@/lib/tournament/tournament-service';

export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const parsed = scheduleGenerationSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message || 'Invalid payload' }, { status: 400 });
    }

    const result = await generateGroupSchedule(parsed.data);
    return NextResponse.json({ success: true, data: result });
  } catch (error: unknown) {
    return internalServerError(error, 'admin.tournament.schedule.POST');
  }
}
