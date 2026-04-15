import dbConnect from '@/lib/mongodb';
import MatchModel from '@/models/Match';
import PlayerModel from '@/models/Player';
import OverlayStateModel from '@/models/OverlayState';
import StreamEventModel from '@/models/StreamEvent';
import DetectionSnapshotModel from '@/models/DetectionSnapshot';
import { getInitialRemainingBalls, normalizeDiscipline, normalizeRemainingBalls } from '@/lib/discipline-adapters';
import { publishToMatch } from '@/lib/stream-event-bus';
import type {
  MatchOverlayState,
  StreamEventEntry,
  StreamEventMessage,
  StreamSseMessage,
  VisionEvent,
} from '@/lib/stream-types';

function mapOverlay(doc: {
  matchId: string;
  discipline: '8-ball' | '9-ball' | '10-ball';
  tablePhase: 'idle' | 'motion' | 'stabilizing' | 'stable_confirmed';
  connectionState: 'connecting' | 'connected' | 'degraded' | 'disconnected';
  status: 'scheduled' | 'live' | 'completed' | 'postponed' | 'waiting';
  frameNumber: number;
  currentPlayer: 1 | 2;
  player1: { id: string; name: string; score: number };
  player2: { id: string; name: string; score: number };
  ballsRemaining: number[];
  confidenceByBall: Record<string, number>;
  reviewRequired: boolean;
  reviewReason?: string;
  stableFrames: number;
  lastVisionAt?: Date;
  lastSnapshotId?: string;
  updatedAt?: Date;
}): MatchOverlayState {
  return {
    matchId: doc.matchId,
    discipline: doc.discipline,
    tablePhase: doc.tablePhase,
    connectionState: doc.connectionState,
    status: doc.status,
    frameNumber: doc.frameNumber,
    currentPlayer: doc.currentPlayer,
    player1: doc.player1,
    player2: doc.player2,
    ballsRemaining: normalizeRemainingBalls(doc.discipline, doc.ballsRemaining),
    confidenceByBall: doc.confidenceByBall || {},
    reviewRequired: doc.reviewRequired,
    reviewReason: doc.reviewReason || undefined,
    stableFrames: doc.stableFrames || 0,
    lastVisionAt: doc.lastVisionAt ? doc.lastVisionAt.toISOString() : undefined,
    lastSnapshotId: doc.lastSnapshotId || undefined,
    updatedAt: (doc.updatedAt ?? new Date()).toISOString(),
  };
}

function eventLabel(event: VisionEvent): string {
  switch (event.type) {
    case 'table_motion_started':
      return `Table motion started (score=${event.motionScore.toFixed(3)})`;
    case 'table_stable_confirmed':
      return `Table stable confirmed after ${event.stableFrames} frames`;
    case 'ball_presence_updated':
      return `Ball presence updated (${event.payload.presentBalls.length} present)`;
    case 'ball_missing_confirmed':
      return `Ball missing confirmed: ${event.missingBalls.join(', ') || 'none'}`;
    case 'review_required':
      return `Review required: ${event.reason}`;
    default:
      return 'Vision event received';
  }
}

async function addStreamEvent(matchId: string, type: string, message: string, payload?: Record<string, unknown>) {
  const record = await StreamEventModel.create({
    matchId,
    type,
    message,
    payload,
    timestamp: new Date(),
  });

  const eventEntry: StreamEventEntry = {
    id: record._id.toString(),
    type: type as StreamEventEntry['type'],
    message,
    payload,
    timestamp: record.timestamp.toISOString(),
  };

  const messagePayload: StreamEventMessage = { type: 'stream_event', event: eventEntry };
  publishToMatch(matchId, messagePayload);

  return eventEntry;
}

async function pushState(matchId: string, state: MatchOverlayState) {
  const payload: StreamSseMessage = { type: 'match_state_updated', state };
  publishToMatch(matchId, payload);
}

async function resolvePlayerName(playerId: string): Promise<string> {
  const player = await PlayerModel.findOne({ id: playerId }, 'name').lean();
  return player?.name || playerId;
}

export async function ensureOverlayState(matchId: string): Promise<MatchOverlayState> {
  await dbConnect();
  const match = await MatchModel.findOne({ id: matchId }).lean();
  if (!match) {
    throw new Error(`Match not found: ${matchId}`);
  }

  const discipline = normalizeDiscipline(match.discipline);
  const defaultBalls = getInitialRemainingBalls(discipline);

  let overlay = await OverlayStateModel.findOne({ matchId });
  if (!overlay) {
    const player1Name = await resolvePlayerName(match.player1Id);
    const player2Name = await resolvePlayerName(match.player2Id);

    overlay = await OverlayStateModel.create({
      matchId,
      discipline,
      tablePhase: 'idle',
      connectionState: 'connecting',
      status: match.status,
      frameNumber: (match.score1 ?? 0) + (match.score2 ?? 0) + 1,
      currentPlayer: 1,
      player1: {
        id: match.player1Id,
        name: player1Name,
        score: match.score1 ?? 0,
      },
      player2: {
        id: match.player2Id,
        name: player2Name,
        score: match.score2 ?? 0,
      },
      ballsRemaining: defaultBalls,
      confidenceByBall: Object.fromEntries(defaultBalls.map((ball) => [String(ball), 1])),
      reviewRequired: false,
      stableFrames: 0,
    });
  } else {
    let changed = false;

    if (overlay.discipline !== discipline) {
      overlay.discipline = discipline;
      overlay.ballsRemaining = defaultBalls;
      changed = true;
    }

    const nextFrame = (match.score1 ?? 0) + (match.score2 ?? 0) + 1;
    if (overlay.frameNumber !== nextFrame) {
      overlay.frameNumber = nextFrame;
      changed = true;
    }

    if (overlay.status !== match.status) {
      overlay.status = match.status;
      changed = true;
    }

    if (overlay.player1.score !== (match.score1 ?? 0) || overlay.player2.score !== (match.score2 ?? 0)) {
      overlay.player1.score = match.score1 ?? 0;
      overlay.player2.score = match.score2 ?? 0;
      changed = true;
    }

    if (changed) {
      await overlay.save();
    }
  }

  return mapOverlay(overlay.toObject());
}

export async function getOverlayState(matchId: string): Promise<MatchOverlayState> {
  const state = await ensureOverlayState(matchId);
  return state;
}

export async function syncOverlayFromMatch(matchId: string, message = 'Match state synchronized'): Promise<MatchOverlayState> {
  const state = await ensureOverlayState(matchId);
  await addStreamEvent(matchId, 'match_state_updated', message, {
    score1: state.player1.score,
    score2: state.player2.score,
    status: state.status,
    frameNumber: state.frameNumber,
  });
  await pushState(matchId, state);
  return state;
}

export async function listRecentStreamEvents(matchId: string, limit = 20): Promise<StreamEventEntry[]> {
  await dbConnect();
  const docs = await StreamEventModel.find({ matchId }).sort({ timestamp: -1 }).limit(limit).lean();
  return docs.map((doc) => ({
    id: doc._id.toString(),
    type: doc.type as StreamEventEntry['type'],
    message: doc.message,
    timestamp: doc.timestamp.toISOString(),
    payload: (doc.payload as Record<string, unknown>) || undefined,
  }));
}

export async function applyVisionEvent(event: VisionEvent): Promise<MatchOverlayState> {
  await dbConnect();
  const overlay = await OverlayStateModel.findOne({ matchId: event.matchId });
  const state = overlay ? mapOverlay(overlay.toObject()) : await ensureOverlayState(event.matchId);

  const working = await OverlayStateModel.findOne({ matchId: event.matchId });
  if (!working) {
    throw new Error(`Overlay state not found for match ${event.matchId}`);
  }

  working.connectionState = 'connected';
  working.lastVisionAt = new Date();

  if (event.type === 'table_motion_started') {
    working.tablePhase = 'motion';
    working.reviewRequired = false;
    working.reviewReason = undefined;
  }

  if (event.type === 'table_stable_confirmed') {
    working.tablePhase = 'stable_confirmed';
    working.stableFrames = event.stableFrames;
    if (event.snapshotId) {
      working.lastSnapshotId = event.snapshotId;
    }
  }

  if (event.type === 'ball_presence_updated') {
    working.tablePhase = 'stable_confirmed';
    working.stableFrames = event.payload.stableFrames;
    working.ballsRemaining = normalizeRemainingBalls(working.discipline, event.payload.presentBalls);
    working.confidenceByBall = event.payload.confidenceByBall;
    working.reviewRequired = false;
    working.reviewReason = undefined;
    if (event.payload.snapshotId) {
      working.lastSnapshotId = event.payload.snapshotId;
    }

    await DetectionSnapshotModel.create({
      matchId: event.matchId,
      snapshotId: event.payload.snapshotId || `snapshot-${Date.now()}`,
      phase: 'after',
      presentBalls: event.payload.presentBalls,
      missingBalls: event.payload.missingBalls,
      confidenceByBall: event.payload.confidenceByBall,
      stableFrames: event.payload.stableFrames,
      metadata: {
        confidenceSummary: event.payload.confidenceSummary,
      },
      capturedAt: new Date(event.emittedAt || Date.now()),
    });
  }

  if (event.type === 'ball_missing_confirmed') {
    working.tablePhase = 'stable_confirmed';
    working.stableFrames = event.payload.stableFrames;
    working.ballsRemaining = normalizeRemainingBalls(working.discipline, event.payload.presentBalls);
    working.confidenceByBall = event.payload.confidenceByBall;
    working.reviewRequired = false;
    working.reviewReason = undefined;
    if (event.payload.snapshotId) {
      working.lastSnapshotId = event.payload.snapshotId;
    }

    await DetectionSnapshotModel.create({
      matchId: event.matchId,
      snapshotId: event.payload.snapshotId || `snapshot-${Date.now()}`,
      phase: 'after',
      presentBalls: event.payload.presentBalls,
      missingBalls: event.payload.missingBalls,
      confidenceByBall: event.payload.confidenceByBall,
      stableFrames: event.payload.stableFrames,
      metadata: {
        confirmedMissing: event.missingBalls,
        confidenceSummary: event.payload.confidenceSummary,
      },
      capturedAt: new Date(event.emittedAt || Date.now()),
    });
  }

  if (event.type === 'review_required') {
    working.tablePhase = 'stabilizing';
    working.reviewRequired = true;
    working.reviewReason = event.reason;
  }

  await working.save();

  const message = eventLabel(event);
  await addStreamEvent(event.matchId, event.type, message, event as unknown as Record<string, unknown>);

  const nextState = mapOverlay(working.toObject());
  await pushState(event.matchId, nextState);

  if (state.connectionState !== 'connected') {
    await addStreamEvent(event.matchId, 'match_state_updated', 'Vision stream connected');
  }

  return nextState;
}
