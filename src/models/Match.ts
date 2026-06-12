import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IMatch extends Document {
  id: string;
  tournamentId?: string;
  round: string;
  matchNumber?: number;
  date: string;
  time?: string;
  venue?: string;
  phase?: 'group' | 'group2' | 'knockout';
  groupName?: string;
  roundNumber?: number;
  scheduledAt?: Date;
  tableNumber?: number;
  player1Id: string;
  player2Id: string;
  winnerId?: string | null;
  score1: number | null;
  score2: number | null;
  status: 'scheduled' | 'live' | 'completed' | 'postponed' | 'pending' | 'bye';
  frameScores?: string;
  notes?: string;
  discipline?: '8-ball' | '9-ball' | '10-ball';
}

const MatchSchema: Schema = new Schema({
  id: { type: String, required: true, unique: true },
  tournamentId: { type: String },
  round: { type: String, required: true },
  matchNumber: { type: Number },
  date: { type: String, required: true },
  time: { type: String },
  venue: { type: String },
  phase: {
    type: String,
    enum: ['group', 'group2', 'knockout'],
    default: 'group',
  },
  groupName: { type: String },
  roundNumber: { type: Number },
  scheduledAt: { type: Date },
  tableNumber: { type: Number },
  player1Id: { type: String, required: true },
  player2Id: { type: String, required: true },
  winnerId: { type: String, default: null },
  score1: { type: Number, default: null },
  score2: { type: Number, default: null },
  status: { 
    type: String, 
    enum: ['scheduled', 'live', 'completed', 'postponed', 'pending', 'bye'], 
    default: 'scheduled' 
  },
  frameScores: { type: String },
  notes: { type: String },
  discipline: { 
    type: String, 
    enum: ['8-ball', '9-ball', '10-ball'],
    default: '8-ball'
  },
}, { timestamps: true });

const Match: Model<IMatch> = mongoose.models.Match || mongoose.model<IMatch>('Match', MatchSchema);
export default Match;
