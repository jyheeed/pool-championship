import { NextRequest, NextResponse } from 'next/server';
import { internalServerError } from '@/lib/api-errors';
import { getGroupDetail } from '@/lib/tournament/tournament-service';

type Params = {
  params: Promise<{ group: string }>;
};

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { group } = await params;
    const groupName = decodeURIComponent(group);
    const data = await getGroupDetail(groupName);
    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    return internalServerError(error, 'public.tournament.group.GET');
  }
}
