import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IRegistration extends Document {
  id: string;
  name: string;
  nickname?: string;
  nationality: string;
  age?: number;
  email: string;
  phone: string;
  city: string;
  cin?: string;
  club?: string;
  photoUrl?: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedAt?: Date;
}

const RegistrationSchema: Schema = new Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  nickname: { type: String },
  nationality: { type: String, default: 'Tunisia' },
  age: { type: Number },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  city: { type: String, required: true },
  cin: { type: String },
  club: { type: String },
  photoUrl: { type: String },
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected'], 
    default: 'pending' 
  },
  approvedAt: { type: Date },
}, { timestamps: true });

const Registration: Model<IRegistration> = mongoose.models.Registration || mongoose.model<IRegistration>('Registration', RegistrationSchema);
export default Registration;
