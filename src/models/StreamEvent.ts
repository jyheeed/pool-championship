import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IStreamEvent extends Document {
  matchId: string;
  type: string;
  message: string;
  payload?: Record<string, unknown>;
  timestamp: Date;
}

const StreamEventSchema = new Schema<IStreamEvent>(
  {
    matchId: { type: String, required: true, index: true },
    type: { type: String, required: true },
    message: { type: String, required: true },
    payload: { type: Schema.Types.Mixed },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

StreamEventSchema.index({ matchId: 1, timestamp: -1 });

const StreamEvent: Model<IStreamEvent> =
  mongoose.models.StreamEvent || mongoose.model<IStreamEvent>('StreamEvent', StreamEventSchema);

export default StreamEvent;
