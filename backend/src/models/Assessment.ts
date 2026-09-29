import mongoose, { Document, Schema } from 'mongoose';

export type AssessmentStatus = 'DRAFT' | 'READY' | 'LIVE' | 'ENDED' | 'RESULT_PUBLISHED';

export interface IAssessment extends Document {
  title: string;
  description: string;
  totalQuestions: number;
  durationMinutes: number;
  status: AssessmentStatus;
  startsAt?: Date;
  endsAt?: Date;
  questionPool: mongoose.Types.ObjectId[];
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AssessmentSchema = new Schema<IAssessment>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    totalQuestions: { type: Number, required: true, default: 6 },
    durationMinutes: { type: Number, required: true, default: 60 },
    status: {
      type: String,
      enum: ['DRAFT', 'READY', 'LIVE', 'ENDED', 'RESULT_PUBLISHED'],
      default: 'LIVE'
    },
    startsAt: { type: Date },
    endsAt: { type: Date },
    questionPool: [{ type: Schema.Types.ObjectId, ref: 'Question' }],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

export const Assessment = mongoose.model<IAssessment>('Assessment', AssessmentSchema);
