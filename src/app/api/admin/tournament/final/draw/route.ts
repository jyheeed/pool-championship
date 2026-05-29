import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import { internalServerError } from '@/lib/api-errors';
import { finalDrawSchema } from '@/lib/api-schemas';
import { generateFinalBracket } from '@/lib/tournament/final-phase-service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const parsed = finalDrawSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message || 'Invalid payload' }, { status: 400 });
    }

    const result = await generateFinalBracket(parsed.data.replaceExisting, parsed.data.source, {
      protectedPlayerNames: parsed.data.protectedPlayerNames,
    });
    return NextResponse.json({ success: true, data: result });
  } catch (error: unknown) {
    return internalServerError(error, 'admin.tournament.final.draw.POST');
  }
}
