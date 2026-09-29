import mongoose, { Document, Schema } from 'mongoose';

export type SubmissionStatus = 'NOT_SUBMITTED' | 'SUBMITTED' | 'UNDER_REVIEW' | 'EVALUATED' | 'REJECTED';

export interface ISubmission extends Document {
  assessmentId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  questionId: mongoose.Types.ObjectId;
  screenshotUrl: string;
  screenshotFileName?: string;
  storageKey?: string;
  codeSnippet?: string;
  attemptNumber: number;
  submittedAt: Date;
  status: SubmissionStatus;
  createdAt: Date;
  updatedAt: Date;
}

const SubmissionSchema = new Schema<ISubmission>(
  {
    assessmentId: { type: Schema.Types.ObjectId, ref: 'Assessment', required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true, index: true },
    screenshotUrl: { type: String, required: true },
    screenshotFileName: { type: String },
    storageKey: { type: String },
    codeSnippet: { type: String },
    attemptNumber: { type: Number, default: 1 },
    submittedAt: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ['NOT_SUBMITTED', 'SUBMITTED', 'UNDER_REVIEW', 'EVALUATED', 'REJECTED'],
      default: 'SUBMITTED'
    }
  },
  { timestamps: true }
);

// One active submission per student per question per assessment
SubmissionSchema.index({ assessmentId: 1, studentId: 1, questionId: 1 }, { unique: true });

export const Submission = mongoose.model<ISubmission>('Submission', SubmissionSchema);
