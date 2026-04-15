import { NextRequest, NextResponse } from 'next/server';
import { registerSchema } from '@/lib/api-schemas';
import { addRegistration } from '@/lib/mongo-service';
import type { RegistrationRow } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const parsed = registerSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message || 'Invalid payload' }, { status: 400 });
    }

    const body = parsed.data;

    const reg: RegistrationRow = {
      id: `reg-${Date.now()}`,
      name: body.name,
      nickname: body.nickname || '',
      nationality: body.nationality || 'Tunisia',
      age: body.age.toString(),
      email: body.email,
      phone: body.phone,
      city: body.city,
      cin: body.cin || '',
      club: body.club || '',
      photo_url: body.photoUrl || '',
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    await addRegistration(reg);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Registration error:', error);
    return error instanceof Error
      ? NextResponse.json({ success: false, error: error.message }, { status: 500 })
      : NextResponse.json({ success: false, error: 'An unknown error occurred' }, { status: 500 });
  }
}
