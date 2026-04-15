import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import { internalServerError } from '@/lib/api-errors';
import { getMatches } from '@/lib/mongo-service';
import dbConnect from '@/lib/mongodb';
import MatchModel from '@/models/Match';
import { syncOverlayFromMatch } from '@/lib/stream-state-service';

export const runtime = 'nodejs';

function normalizeOptionalUrl(value?: string) {
  const raw = value?.trim();
  if (!raw || raw === 'undefined' || raw === 'null') {
    return '';
  }
  return raw;
}

type StreamAction = 'start_stream' | 'stop_stream';

type VisionControlPayload = {
  action: 'set_match' | 'clear_match';
  matchId?: string;
};

async function callVisionControl(payload: VisionControlPayload) {
  const baseUrl = normalizeOptionalUrl(process.env.VISION_SERVICE_INTERNAL_URL);
  if (!baseUrl) {
    return { configured: false, ok: true, message: 'Vision control URL not configured' };
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (process.env.VISION_SERVICE_KEY) {
    headers['x-vision-key'] = process.env.VISION_SERVICE_KEY;
  }

  try {
    const controlResponse = await fetch(`${baseUrl.replace(/\/$/, '')}/control/match`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      cache: 'no-store',
    });

    const controlBody = await controlResponse.json().catch(() => ({}));
    return {
      configured: true,
      ok: controlResponse.ok,
      status: controlResponse.status,
      data: controlBody,
    };
  } catch (error) {
    return {
      configured: true,
      ok: false,
      message: error instanceof Error ? error.message : 'Vision control request failed',
    };
  }
}

async function getVisionState() {
  const baseUrl = normalizeOptionalUrl(process.env.VISION_SERVICE_INTERNAL_URL);
  if (!baseUrl) {
    return {
      configured: false,
      healthOk: true,
      ready: false,
      activeMatchId: '',
      lastError: '',
    };
  }

  try {
    const [healthResponse, stateResponse] = await Promise.all([
      fetch(`${baseUrl.replace(/\/$/, '')}/health`, { cache: 'no-store' }),
      fetch(`${baseUrl.replace(/\/$/, '')}/control/state`, { cache: 'no-store' }),
    ]);

    const healthBody = await healthResponse.json().catch(() => ({}));
    const stateBody = await stateResponse.json().catch(() => ({}));

    return {
      configured: true,
      healthOk: healthResponse.ok,
      ready: !!stateBody?.ready,
      activeMatchId: String(stateBody?.matchId || ''),
      running: !!healthBody?.running,
      lastError: String(healthBody?.lastError || ''),
      tableState: String(healthBody?.tableState || ''),
    };
  } catch (error) {
    return {
      configured: true,
      healthOk: false,
      ready: false,
      activeMatchId: '',
      lastError: error instanceof Error ? error.message : 'Vision state request failed',
    };
  }
}

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const [matches, vision] = await Promise.all([getMatches(), getVisionState()]);
    const liveMatch = matches.find((m) => m.status === 'live');

    return NextResponse.json({
      success: true,
      data: {
        liveMatchId: liveMatch?.id || '',
        vision,
      },
    });
  } catch (error: unknown) {
    return internalServerError(error, 'admin.stream.control.GET');
  }
}

export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const body = (await req.json()) as {
      action?: StreamAction;
      matchId?: string;
      nextStatus?: 'scheduled' | 'postponed' | 'completed' | 'live';
    };

    const action = body.action;
    const matchId = body.matchId?.trim();

    if (action !== 'start_stream' && action !== 'stop_stream') {
      return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }

    await dbConnect();

    if (action === 'start_stream') {
      if (!matchId) {
        return NextResponse.json({ success: false, error: 'matchId is required' }, { status: 400 });
      }

      const targetMatch = await MatchModel.findOne({ id: matchId });
      if (!targetMatch) {
        return NextResponse.json({ success: false, error: 'Match not found' }, { status: 404 });
      }

      await MatchModel.updateMany({ status: 'live', id: { $ne: matchId } }, { $set: { status: 'scheduled' } });
      targetMatch.status = 'live';
      await targetMatch.save();

      await syncOverlayFromMatch(matchId, 'Live stream activated from admin dashboard');
      const visionResult = await callVisionControl({ action: 'set_match', matchId });

      return NextResponse.json({
        success: true,
        data: {
          action,
          matchId,
          vision: visionResult,
        },
      });
    }

    const activeMatchId =
      matchId ||
      (await MatchModel.findOne({ status: 'live' }, { id: 1 }).lean())?.id;

    if (activeMatchId) {
      const nextStatus = body.nextStatus || 'scheduled';
      await MatchModel.findOneAndUpdate({ id: activeMatchId }, { $set: { status: nextStatus } });
      await syncOverlayFromMatch(activeMatchId, 'Live stream stopped from admin dashboard');
    }

    const visionResult = await callVisionControl({ action: 'clear_match' });

    return NextResponse.json({
      success: true,
      data: {
        action,
        matchId: activeMatchId || '',
        vision: visionResult,
      },
    });
  } catch (error: unknown) {
    return internalServerError(error, 'admin.stream.control.POST');
  }
}
