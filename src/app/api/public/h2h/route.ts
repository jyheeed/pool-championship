import { NextRequest, NextResponse } from 'next/server';
import { getHeadToHead } from '@/lib/mongo-service';
import { internalServerError } from '@/lib/api-errors';

export async function GET(req: NextRequest) {
  const p1 = req.nextUrl.searchParams.get('p1');
  const p2 = req.nextUrl.searchParams.get('p2');

  if (!p1 || !p2) {
    return NextResponse.json({ success: false, error: 'Missing p1 or p2' }, { status: 400 });
  }

  try {
    const data = await getHeadToHead(p1, p2);
    if (!data) {
      return NextResponse.json({ success: false, error: 'Players not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    return internalServerError(error, 'public.h2h.GET');
  }
}
