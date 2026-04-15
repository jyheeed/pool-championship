import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IMatch extends Document {
  id: string;
  round: string;
  date: string;
  time?: string;
  venue?: string;
  player1Id: string;
  player2Id: string;
  score1: number | null;
  score2: number | null;
  status: 'scheduled' | 'live' | 'completed' | 'postponed';
  frameScores?: string;
  notes?: string;
  discipline?: '8-ball' | '9-ball' | '10-ball';
}

const MatchSchema: Schema = new Schema({
  id: { type: String, required: true, unique: true },
  round: { type: String, required: true },
  date: { type: String, required: true },
  time: { type: String },
  venue: { type: String },
  player1Id: { type: String, required: true },
  player2Id: { type: String, required: true },
  score1: { type: Number, default: null },
  score2: { type: Number, default: null },
  status: { 
    type: String, 
    enum: ['scheduled', 'live', 'completed', 'postponed'], 
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
