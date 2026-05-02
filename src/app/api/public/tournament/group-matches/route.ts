import { NextRequest, NextResponse } from 'next/server';
import { internalServerError } from '@/lib/api-errors';
import { generateGroupMatchesSchema } from '@/lib/api-schemas';
import { generateGroupMatches } from '@/lib/tournament/tournament-service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const parsed = generateGroupMatchesSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message || 'Invalid payload' }, { status: 400 });
    }

    const result = await generateGroupMatches(parsed.data.replaceExisting);
    return NextResponse.json({ success: true, data: result });
  } catch (error: unknown) {
    return internalServerError(error, 'public.tournament.group-matches.POST');
  }
}
