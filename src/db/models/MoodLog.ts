import mongoose, { Schema, Document } from 'mongoose';

// ── Interface ──
export interface IMoodLog extends Document {
  userId: mongoose.Types.ObjectId;
  date: string; // YYYY-MM-DD
  energy: number; // 1-10
  mood: number; // 1-10
  notes: string;
}

// ── Schema ──
const MoodLogSchema = new Schema<IMoodLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: String, required: true },
    energy: { type: Number, min: 1, max: 10, required: true },
    mood: { type: Number, min: 1, max: 10, required: true },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

// One log per user per day
MoodLogSchema.index({ userId: 1, date: 1 }, { unique: true });

export const MoodLog = mongoose.model<IMoodLog>('MoodLog', MoodLogSchema);
