import { NextResponse } from 'next/server';
import { getAdminSession } from './auth';

export async function requireAdmin() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}
