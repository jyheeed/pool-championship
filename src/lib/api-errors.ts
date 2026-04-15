import { NextResponse } from 'next/server';

export function internalServerError(error: unknown, context: string) {
  console.error(`[${context}]`, error);
  return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
}
