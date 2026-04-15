export type Discipline = '8-ball' | '9-ball' | '10-ball';

export type TablePhase = 'idle' | 'motion' | 'stabilizing' | 'stable_confirmed';

export type ConnectionState = 'connecting' | 'connected' | 'degraded' | 'disconnected';

export interface MatchParticipantState {
  id: string;
  name: string;
  score: number;
}

export interface ConfidenceSummary {
  min: number;
  max: number;
  average: number;
}

export interface BallConfidenceEntry {
  ball: number;
  confidence: number;
  missingFrames: number;
  presentFrames: number;
}

export interface StableStatePayload {
  presentBalls: number[];
  missingBalls: number[];
  confidenceByBall: Record<string, number>;
  confidenceSummary: ConfidenceSummary;
  stableFrames: number;
  snapshotId?: string;
}

export interface VisionEventBase {
  eventId?: string;
  matchId: string;
  emittedAt?: string;
  source?: 'vision-service' | 'operator' | 'system';
}

export interface TableMotionStartedEvent extends VisionEventBase {
  type: 'table_motion_started';
  motionScore: number;
}

export interface TableStableConfirmedEvent extends VisionEventBase {
  type: 'table_stable_confirmed';
  stableFrames: number;
  snapshotId?: string;
}

export interface BallPresenceUpdatedEvent extends VisionEventBase {
  type: 'ball_presence_updated';
  payload: StableStatePayload;
}

export interface BallMissingConfirmedEvent extends VisionEventBase {
  type: 'ball_missing_confirmed';
  missingBalls: number[];
  payload: StableStatePayload;
}

export interface ReviewRequiredEvent extends VisionEventBase {
  type: 'review_required';
  reason: string;
  payload?: Partial<StableStatePayload>;
}

export type VisionEvent =
  | TableMotionStartedEvent
  | TableStableConfirmedEvent
  | BallPresenceUpdatedEvent
  | BallMissingConfirmedEvent
  | ReviewRequiredEvent;

export interface StreamEventEntry {
  id: string;
  type: VisionEvent['type'] | 'match_state_updated';
  message: string;
  timestamp: string;
  payload?: Record<string, unknown>;
}

export interface MatchOverlayState {
  matchId: string;
  discipline: Discipline;
  tablePhase: TablePhase;
  connectionState: ConnectionState;
  status: 'scheduled' | 'live' | 'completed' | 'postponed' | 'waiting';
  frameNumber: number;
  currentPlayer: 1 | 2;
  player1: MatchParticipantState;
  player2: MatchParticipantState;
  ballsRemaining: number[];
  confidenceByBall: Record<string, number>;
  reviewRequired: boolean;
  reviewReason?: string;
  stableFrames: number;
  lastVisionAt?: string;
  lastSnapshotId?: string;
  updatedAt: string;
}

export interface MatchStateUpdatedMessage {
  type: 'match_state_updated';
  state: MatchOverlayState;
}

export interface StreamEventMessage {
  type: 'stream_event';
  event: StreamEventEntry;
}

export interface HeartbeatMessage {
  type: 'heartbeat';
  timestamp: string;
}

export type StreamSseMessage = MatchStateUpdatedMessage | StreamEventMessage | HeartbeatMessage;
