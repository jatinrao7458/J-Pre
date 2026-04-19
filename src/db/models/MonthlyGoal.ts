import mongoose, { Schema, Document } from 'mongoose';

// ── Interface ──
export interface IMonthlyGoal extends Document {
  userId: mongoose.Types.ObjectId;
  month: number; // 1-12
  year: number;
  description: string;
  weeklyMilestones: Array<{
    week: number;
    milestone: string;
    completed: boolean;
  }>;
  status: 'active' | 'completed' | 'abandoned';
}

// ── Schema ──
const MonthlyGoalSchema = new Schema<IMonthlyGoal>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },
    description: { type: String, required: true },
    weeklyMilestones: [
      {
        week: { type: Number, required: true },
        milestone: { type: String, required: true },
        completed: { type: Boolean, default: false },
      },
    ],
    status: {
      type: String,
      enum: ['active', 'completed', 'abandoned'],
      default: 'active',
    },
  },
  { timestamps: true }
);

MonthlyGoalSchema.index({ userId: 1, month: 1, year: 1 });

export const MonthlyGoal = mongoose.model<IMonthlyGoal>('MonthlyGoal', MonthlyGoalSchema);
