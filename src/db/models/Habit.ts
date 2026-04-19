import mongoose, { Schema, Document } from 'mongoose';

// ── Interface ──
export interface IHabit extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  currentStreak: number;
  bestStreak: number;
  lastCompletedDate: string | null; // YYYY-MM-DD
}

// ── Schema ──
const HabitSchema = new Schema<IHabit>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true },
    currentStreak: { type: Number, default: 0 },
    bestStreak: { type: Number, default: 0 },
    lastCompletedDate: { type: String, default: null },
  },
  { timestamps: true }
);

// One habit name per user
HabitSchema.index({ userId: 1, name: 1 }, { unique: true });

export const Habit = mongoose.model<IHabit>('Habit', HabitSchema);
