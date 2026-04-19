// ── Database Barrel Export ──
// Re-exports all models and the DB connection for clean imports.

export { connectDB } from './connection.js';
export { User } from './models/User.js';
export type { IUser, ConversationState } from './models/User.js';
export { Task } from './models/Task.js';
export type { ITask, Priority } from './models/Task.js';
export { Conversation } from './models/Conversation.js';
export type { IConversation } from './models/Conversation.js';
export { DayReport } from './models/DayReport.js';
export type { IDayReport } from './models/DayReport.js';
export { Habit } from './models/Habit.js';
export type { IHabit } from './models/Habit.js';
export { MoodLog } from './models/MoodLog.js';
export type { IMoodLog } from './models/MoodLog.js';
export { MonthlyGoal } from './models/MonthlyGoal.js';
export type { IMonthlyGoal } from './models/MonthlyGoal.js';
export { LeetCodeStats } from './models/LeetCodeStats.js';
export type { ILeetCodeStats } from './models/LeetCodeStats.js';
