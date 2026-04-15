import { NextResponse } from 'next/server';
import { getClubs } from '@/lib/mongo-service';
import { internalServerError } from '@/lib/api-errors';

export async function GET() {
  try {
    const clubs = await getClubs();
    return NextResponse.json({ success: true, data: clubs });
  } catch (error: unknown) {
    return internalServerError(error, 'public.clubs.GET');
  }
}
