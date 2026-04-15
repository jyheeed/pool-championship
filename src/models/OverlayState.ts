import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IOverlayState extends Document {
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
}

const OverlayStateSchema = new Schema<IOverlayState>(
  {
    matchId: { type: String, required: true, unique: true, index: true },
    discipline: { type: String, enum: ['8-ball', '9-ball', '10-ball'], default: '8-ball' },
    tablePhase: { type: String, enum: ['idle', 'motion', 'stabilizing', 'stable_confirmed'], default: 'idle' },
    connectionState: {
      type: String,
      enum: ['connecting', 'connected', 'degraded', 'disconnected'],
      default: 'connecting',
    },
    status: { type: String, enum: ['scheduled', 'live', 'completed', 'postponed', 'waiting'], default: 'waiting' },
    frameNumber: { type: Number, default: 1 },
    currentPlayer: { type: Number, enum: [1, 2], default: 1 },
    player1: {
      id: { type: String, default: '' },
      name: { type: String, default: 'Player 1' },
      score: { type: Number, default: 0 },
    },
    player2: {
      id: { type: String, default: '' },
      name: { type: String, default: 'Player 2' },
      score: { type: Number, default: 0 },
    },
    ballsRemaining: [{ type: Number }],
    confidenceByBall: { type: Schema.Types.Mixed, default: {} },
    reviewRequired: { type: Boolean, default: false },
    reviewReason: { type: String },
    stableFrames: { type: Number, default: 0 },
    lastVisionAt: { type: Date },
    lastSnapshotId: { type: String },
  },
  { timestamps: true }
);

OverlayStateSchema.index({ updatedAt: -1 });

const OverlayState: Model<IOverlayState> =
  mongoose.models.OverlayState || mongoose.model<IOverlayState>('OverlayState', OverlayStateSchema);

export default OverlayState;
