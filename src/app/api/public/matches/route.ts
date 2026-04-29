import { NextResponse } from 'next/server';
import { getMatches } from '@/lib/mongo-service';
import { internalServerError } from '@/lib/api-errors';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const matches = await getMatches();
    return NextResponse.json({ success: true, data: matches });
  } catch (error: unknown) {
    return internalServerError(error, 'public.matches.GET');
  }
}
