import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITournamentResetSnapshot extends Document {
  snapshotId: string;
  reason?: string;
  nextDiscipline?: string;
  counts: {
    players: number;
    matches: number;
    settings: number;
    clubs: number;
    registrations: number;
  };
  data: {
    players: unknown[];
    matches: unknown[];
    settings: unknown[];
    clubs: unknown[];
    registrations: unknown[];
  };
  createdAt: Date;
}

const TournamentResetSnapshotSchema: Schema = new Schema(
  {
    snapshotId: { type: String, required: true, unique: true },
    reason: { type: String },
    nextDiscipline: { type: String },
    counts: {
      players: { type: Number, required: true },
      matches: { type: Number, required: true },
      settings: { type: Number, required: true },
      clubs: { type: Number, required: true },
      registrations: { type: Number, required: true },
    },
    data: {
      players: { type: [Schema.Types.Mixed], default: [] },
      matches: { type: [Schema.Types.Mixed], default: [] },
      settings: { type: [Schema.Types.Mixed], default: [] },
      clubs: { type: [Schema.Types.Mixed], default: [] },
      registrations: { type: [Schema.Types.Mixed], default: [] },
    },
  },
  { timestamps: true }
);

const TournamentResetSnapshot: Model<ITournamentResetSnapshot> =
  mongoose.models.TournamentResetSnapshot ||
  mongoose.model<ITournamentResetSnapshot>('TournamentResetSnapshot', TournamentResetSnapshotSchema);

export default TournamentResetSnapshot;
