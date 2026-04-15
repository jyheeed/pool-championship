import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import { internalServerError } from '@/lib/api-errors';
import { drawSchema } from '@/lib/api-schemas';
import { drawPools } from '@/lib/mongo-service';

export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const parsed = drawSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message || 'Invalid payload' }, { status: 400 });
    }

    const { groupNames } = parsed.data;
    await drawPools(groupNames);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return internalServerError(error, 'admin.draw.POST');
  }
}
