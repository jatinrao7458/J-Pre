import mongoose, { Schema, Document } from 'mongoose';

// ── Priority Levels ──
export const PRIORITY_LEVELS = ['high', 'medium', 'low'] as const;
export type Priority = typeof PRIORITY_LEVELS[number];

// ── Interface ──
export interface ITask extends Document {
  userId: mongoose.Types.ObjectId;
  description: string;
  scheduledTime: Date;
  duration: number; // in minutes
  priority: Priority;
  completed: boolean;
  completedAt: Date | null;
  missed: boolean;
  failureReason: string;
  rescheduled: boolean;
  rescheduledTo: Date | null;
  linkedMonthlyGoal: mongoose.Types.ObjectId | null;
  createdAt: Date;
}

// ── Schema ──
const TaskSchema = new Schema<ITask>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    description: { type: String, required: true },
    scheduledTime: { type: Date, required: true },
    duration: { type: Number, default: 60 },
    priority: {
      type: String,
      enum: PRIORITY_LEVELS,
      default: 'medium',
    },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
    missed: { type: Boolean, default: false },
    failureReason: { type: String, default: '' },
    rescheduled: { type: Boolean, default: false },
    rescheduledTo: { type: Date, default: null },
    linkedMonthlyGoal: { type: Schema.Types.ObjectId, ref: 'MonthlyGoal', default: null },
  },
  { timestamps: true }
);

// Compound index for querying today's tasks efficiently
TaskSchema.index({ userId: 1, scheduledTime: 1 });

export const Task = mongoose.model<ITask>('Task', TaskSchema);
