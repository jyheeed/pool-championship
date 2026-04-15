import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import { internalServerError } from '@/lib/api-errors';
import { tournamentSettingsSchema } from '@/lib/api-schemas';
import { getSettings, updateSettings } from '@/lib/mongo-service';
import type { TournamentSettings } from '@/lib/types';

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const settings = await getSettings();
    return NextResponse.json({ success: true, data: settings });
  } catch (error: unknown) {
    return internalServerError(error, 'admin.settings.GET');
  }
}

export async function PUT(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const parsed = tournamentSettingsSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message || 'Invalid payload' }, { status: 400 });
    }
    const body = parsed.data as TournamentSettings;

    await updateSettings(body);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return internalServerError(error, 'admin.settings.PUT');
  }
}
