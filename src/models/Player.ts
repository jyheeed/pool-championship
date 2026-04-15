import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPlayer extends Document {
  id: string;
  name: string;
  nickname?: string;
  nationality: string;
  age?: number;
  club?: string;
  photoUrl?: string;
  poolGroup?: string;
  isSeeded?: boolean;
}

const PlayerSchema: Schema = new Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  nickname: { type: String },
  nationality: { type: String, default: 'Tunisia' },
  age: { type: Number },
  club: { type: String },
  photoUrl: { type: String },
  poolGroup: { type: String },
  isSeeded: { type: Boolean, default: false },
}, { timestamps: true });

const Player: Model<IPlayer> = mongoose.models.Player || mongoose.model<IPlayer>('Player', PlayerSchema);
export default Player;
