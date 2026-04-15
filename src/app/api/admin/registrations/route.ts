import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import { internalServerError } from '@/lib/api-errors';
import { registrationStatusUpdateSchema } from '@/lib/api-schemas';
import { deleteRegistration, getRegistrations, updateRegistrationStatus } from '@/lib/mongo-service';

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const regs = await getRegistrations();
    return NextResponse.json({ success: true, data: regs });
  } catch (error: unknown) {
    return internalServerError(error, 'admin.registrations.GET');
  }
}

export async function PUT(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const parsed = registrationStatusUpdateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message || 'Invalid payload' }, { status: 400 });
    }

    const { id, status } = parsed.data;
    await updateRegistrationStatus(id, status);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return internalServerError(error, 'admin.registrations.PUT');
  }
}

export async function DELETE(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const id = req.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });
    }

    await deleteRegistration(id);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return internalServerError(error, 'admin.registrations.DELETE');
  }
}
