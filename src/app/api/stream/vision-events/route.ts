import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { internalServerError } from '@/lib/api-errors';
import { applyVisionEvent } from '@/lib/stream-state-service';
import type { VisionEvent } from '@/lib/stream-types';

export const runtime = 'nodejs';

const stablePayloadSchema = z.object({
  presentBalls: z.array(z.number().int().min(1).max(15)),
  missingBalls: z.array(z.number().int().min(1).max(15)),
  confidenceByBall: z.record(z.string(), z.number().min(0).max(1)),
  confidenceSummary: z.object({
    min: z.number().min(0).max(1),
    max: z.number().min(0).max(1),
    average: z.number().min(0).max(1),
  }),
  stableFrames: z.number().int().min(0),
  snapshotId: z.string().optional(),
});

const visionEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('table_motion_started'),
    matchId: z.string().min(1),
    emittedAt: z.string().optional(),
    source: z.enum(['vision-service', 'operator', 'system']).optional(),
    eventId: z.string().optional(),
    motionScore: z.number().min(0),
  }),
  z.object({
    type: z.literal('table_stable_confirmed'),
    matchId: z.string().min(1),
    emittedAt: z.string().optional(),
    source: z.enum(['vision-service', 'operator', 'system']).optional(),
    eventId: z.string().optional(),
    stableFrames: z.number().int().min(1),
    snapshotId: z.string().optional(),
  }),
  z.object({
    type: z.literal('ball_presence_updated'),
    matchId: z.string().min(1),
    emittedAt: z.string().optional(),
    source: z.enum(['vision-service', 'operator', 'system']).optional(),
    eventId: z.string().optional(),
    payload: stablePayloadSchema,
  }),
  z.object({
    type: z.literal('ball_missing_confirmed'),
    matchId: z.string().min(1),
    emittedAt: z.string().optional(),
    source: z.enum(['vision-service', 'operator', 'system']).optional(),
    eventId: z.string().optional(),
    missingBalls: z.array(z.number().int().min(1).max(15)),
    payload: stablePayloadSchema,
  }),
  z.object({
    type: z.literal('review_required'),
    matchId: z.string().min(1),
    emittedAt: z.string().optional(),
    source: z.enum(['vision-service', 'operator', 'system']).optional(),
    eventId: z.string().optional(),
    reason: z.string().min(1),
    payload: stablePayloadSchema.partial().optional(),
  }),
]);

function isVisionAuthorized(req: NextRequest): boolean {
  const configured = process.env.VISION_SERVICE_KEY;
  if (!configured) {
    return process.env.NODE_ENV !== 'production';
  }

  const token = req.headers.get('x-vision-key');
  return token === configured;
}

export async function POST(req: NextRequest) {
  if (!isVisionAuthorized(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized vision publisher' }, { status: 401 });
  }

  try {
    const payload = visionEventSchema.safeParse(await req.json());
    if (!payload.success) {
      return NextResponse.json({ success: false, error: payload.error.issues[0]?.message || 'Invalid vision event' }, { status: 400 });
    }

    const state = await applyVisionEvent(payload.data as VisionEvent);
    return NextResponse.json({ success: true, data: state });
  } catch (error: unknown) {
    return internalServerError(error, 'stream.vision-events.POST');
  }
}
