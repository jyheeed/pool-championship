import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IDetectionSnapshot extends Document {
  matchId: string;
  snapshotId: string;
  phase: 'before' | 'after';
  presentBalls: number[];
  missingBalls: number[];
  confidenceByBall: Record<string, number>;
  stableFrames: number;
  metadata?: Record<string, unknown>;
  capturedAt: Date;
}

const DetectionSnapshotSchema = new Schema<IDetectionSnapshot>(
  {
    matchId: { type: String, required: true, index: true },
    snapshotId: { type: String, required: true, index: true },
    phase: { type: String, enum: ['before', 'after'], required: true },
    presentBalls: [{ type: Number }],
    missingBalls: [{ type: Number }],
    confidenceByBall: { type: Schema.Types.Mixed, default: {} },
    stableFrames: { type: Number, default: 0 },
    metadata: { type: Schema.Types.Mixed },
    capturedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

DetectionSnapshotSchema.index({ matchId: 1, capturedAt: -1 });

const DetectionSnapshot: Model<IDetectionSnapshot> =
  mongoose.models.DetectionSnapshot ||
  mongoose.model<IDetectionSnapshot>('DetectionSnapshot', DetectionSnapshotSchema);

export default DetectionSnapshot;
