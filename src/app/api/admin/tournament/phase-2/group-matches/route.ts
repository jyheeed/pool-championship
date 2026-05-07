import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import { internalServerError } from '@/lib/api-errors';
import { generateGroupMatchesSchema } from '@/lib/api-schemas';
import { generatePhase2Matches } from '@/lib/tournament/phase-2-service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const parsed = generateGroupMatchesSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message || 'Invalid payload' }, { status: 400 });
    }

    const result = await generatePhase2Matches(parsed.data.replaceExisting);
    return NextResponse.json({ success: true, data: result });
  } catch (error: unknown) {
    return internalServerError(error, 'admin.tournament.phase-2.group-matches.POST');
  }
}
