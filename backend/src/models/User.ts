import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  name: string;
  role: 'admin' | 'student';
  studentId?: string; // e.g. 24CSE001
  year?: number;
  department?: string;
  section?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    role: { type: String, enum: ['admin', 'student'], required: true, default: 'student' },
    studentId: { type: String, sparse: true, trim: true },
    year: { type: Number, default: 1 },
    department: { type: String, default: 'Computer Science & Engineering' },
    section: { type: String, default: 'D' },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>('User', UserSchema);
