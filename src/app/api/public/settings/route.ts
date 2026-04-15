import { NextResponse } from 'next/server';
import { getSettings } from '@/lib/mongo-service';
import { internalServerError } from '@/lib/api-errors';

export async function GET() {
  try {
    const settings = await getSettings();
    return NextResponse.json({ success: true, data: settings });
  } catch (error: unknown) {
    return internalServerError(error, 'public.settings.GET');
  }
}
