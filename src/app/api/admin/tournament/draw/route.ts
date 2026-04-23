import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import { internalServerError } from '@/lib/api-errors';
import { tournamentDrawSchema } from '@/lib/api-schemas';
import { generateGroupDraw } from '@/lib/tournament/tournament-service';

export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const parsed = tournamentDrawSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message || 'Invalid payload' }, { status: 400 });
    }

    const { format, groupCount, groupNames, seededPlayerIds } = parsed.data;
    if (format !== 'groups') {
      return NextResponse.json({ success: false, error: 'Unsupported tournament format' }, { status: 400 });
    }

    if (groupNames.length !== groupCount) {
      return NextResponse.json({ success: false, error: 'groupCount must match groupNames length' }, { status: 400 });
    }

    if (seededPlayerIds.length !== groupCount) {
      return NextResponse.json({ success: false, error: 'Exactly one seed per group is required' }, { status: 400 });
    }

    const result = await generateGroupDraw({ groupNames, seededPlayerIds });
    return NextResponse.json({ success: true, data: result });
  } catch (error: unknown) {
    return internalServerError(error, 'admin.tournament.draw.POST');
  }
}
