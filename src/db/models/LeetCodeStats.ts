import mongoose, { Schema, Document } from 'mongoose';

// ── Interface ──
export interface ILeetCodeStats extends Document {
  userId: mongoose.Types.ObjectId;
  username: string;
  totalSolved: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  contestRating: number;
  recentSubmissions: Array<{
    title: string;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    timestamp: Date;
    status: string;
  }>;
  lastSynced: Date;
}

// ── Schema ──
const LeetCodeStatsSchema = new Schema<ILeetCodeStats>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    username: { type: String, required: true },
    totalSolved: { type: Number, default: 0 },
    easySolved: { type: Number, default: 0 },
    mediumSolved: { type: Number, default: 0 },
    hardSolved: { type: Number, default: 0 },
    contestRating: { type: Number, default: 0 },
    recentSubmissions: [
      {
        title: { type: String, required: true },
        difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], required: true },
        timestamp: { type: Date, required: true },
        status: { type: String, required: true },
      },
    ],
    lastSynced: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const LeetCodeStats = mongoose.model<ILeetCodeStats>('LeetCodeStats', LeetCodeStatsSchema);
