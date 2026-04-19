import mongoose, { Schema, Document } from 'mongoose';

// ── Interface ──
export interface IDayReport extends Document {
  userId: mongoose.Types.ObjectId;
  date: string; // YYYY-MM-DD format
  totalPlanned: number;
  totalCompleted: number;
  completionRate: number;
  highPriorityTotal: number;
  highPriorityCompleted: number;
  highPriorityCompletionRate: number;
  moodScore: number;
  energyScore: number;
  screenTimeMinutes: number;
  screenTimeByApp: Record<string, number>;
  pointsEarned: number;
}

// ── Schema ──
const DayReportSchema = new Schema<IDayReport>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: String, required: true },
    totalPlanned: { type: Number, default: 0 },
    totalCompleted: { type: Number, default: 0 },
    completionRate: { type: Number, default: 0 },
    highPriorityTotal: { type: Number, default: 0 },
    highPriorityCompleted: { type: Number, default: 0 },
    highPriorityCompletionRate: { type: Number, default: 0 },
    moodScore: { type: Number, default: 0 },
    energyScore: { type: Number, default: 0 },
    screenTimeMinutes: { type: Number, default: 0 },
    screenTimeByApp: { type: Schema.Types.Mixed, default: {} },
    pointsEarned: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// One report per user per day
DayReportSchema.index({ userId: 1, date: 1 }, { unique: true });

export const DayReport = mongoose.model<IDayReport>('DayReport', DayReportSchema);
