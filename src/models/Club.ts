import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IClub extends Document {
  id: string;
  name: string;
  city?: string;
  logoUrl?: string;
}

const ClubSchema: Schema = new Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  city: { type: String },
  logoUrl: { type: String },
}, { timestamps: true });

const Club: Model<IClub> = mongoose.models.Club || mongoose.model<IClub>('Club', ClubSchema);
export default Club;
