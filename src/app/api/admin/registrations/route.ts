import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import { internalServerError } from '@/lib/api-errors';
import { registrationStatusUpdateSchema } from '@/lib/api-schemas';
import { deleteRegistration, getRegistrations, updateRegistrationStatus } from '@/lib/mongo-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    console.log('[GET /api/admin/registrations] Fetching registrations...');
    const regs = await getRegistrations();
    console.log(`[GET /api/admin/registrations] Success: ${regs.length} registrations fetched`);
    return NextResponse.json({ success: true, data: regs });
  } catch (error: unknown) {
    console.error('[GET /api/admin/registrations] Error:', error instanceof Error ? error.message : String(error));
    return internalServerError(error, 'admin.registrations.GET');
  }
}

export async function PUT(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    console.log('[PUT /api/admin/registrations] Parsing request body...');
    const parsed = registrationStatusUpdateSchema.safeParse(await req.json());
    if (!parsed.success) {
      console.warn('[PUT /api/admin/registrations] Validation error:', parsed.error.issues[0]?.message);
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message || 'Invalid payload' }, { status: 400 });
    }

    const { id, status } = parsed.data;
    console.log(`[PUT /api/admin/registrations] Updating registration ${id} to status ${status}`);
    await updateRegistrationStatus(id, status);
    console.log(`[PUT /api/admin/registrations] Successfully updated registration ${id}`);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('[PUT /api/admin/registrations] Error:', error instanceof Error ? error.message : String(error));
    return internalServerError(error, 'admin.registrations.PUT');
  }
}

export async function DELETE(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const id = req.nextUrl.searchParams.get('id');
    if (!id) {
      console.warn('[DELETE /api/admin/registrations] Missing ID parameter');
      return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });
    }

    console.log(`[DELETE /api/admin/registrations] Deleting registration ${id}`);
    await deleteRegistration(id);
    console.log(`[DELETE /api/admin/registrations] Successfully deleted registration ${id}`);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('[DELETE /api/admin/registrations] Error:', error instanceof Error ? error.message : String(error));
    return internalServerError(error, 'admin.registrations.DELETE');
  }
}
