import mongoose, { Schema, Document } from 'mongoose';

// ── Conversation State Enum ──
export const CONVERSATION_STATES = [
  'idle',
  'onboarding_step_1',
  'onboarding_step_2',
  'onboarding_step_3',
  'onboarding_step_4',
  'onboarding_step_5',
  'onboarding_step_6',
  'onboarding_step_7',
  'onboarding_step_8',
  'awaiting_debrief_reason',
  'awaiting_post_approval',
  'awaiting_reschedule_confirm',
  'awaiting_plan_confirm',
  'awaiting_draft_approval',
] as const;

export type ConversationState = typeof CONVERSATION_STATES[number];

// ── Interface ──
export interface IUser extends Document {
  phone: string;
  name: string;
  timezone: string;
  activeHoursStart: number;
  activeHoursEnd: number;
  lifeMotivations: string[];
  recurringHabits: mongoose.Types.ObjectId[];
  twitterTokens: {
    clientId?: string;
    clientSecret?: string;
    accessToken?: string;
    accessTokenSecret?: string;
  };
  linkedinTokens: {
    clientId?: string;
    clientSecret?: string;
    accessToken?: string;
  };
  googleRefreshToken: string;
  leetcodeUsername: string;
  points: number;
  currentStreak: number;
  bestStreak: number;
  onboardingComplete: boolean;
  conversationState: ConversationState;
  conversationStateData: Record<string, any>;
  focusUntil: Date | null;
  dndUntil: Date | null;
  todayPlanSubmitted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ──
const UserSchema = new Schema<IUser>(
  {
    phone: { type: String, required: true, unique: true, index: true },
    name: { type: String, default: '' },
    timezone: { type: String, default: 'Asia/Kolkata' },
    activeHoursStart: { type: Number, default: 6 },
    activeHoursEnd: { type: Number, default: 23 },
    lifeMotivations: { type: [String], default: [] },
    recurringHabits: [{ type: Schema.Types.ObjectId, ref: 'Habit' }],
    twitterTokens: {
      clientId: String,
      clientSecret: String,
      accessToken: String,
      accessTokenSecret: String,
    },
    linkedinTokens: {
      clientId: String,
      clientSecret: String,
      accessToken: String,
    },
    googleRefreshToken: { type: String, default: '' },
    leetcodeUsername: { type: String, default: '' },
    points: { type: Number, default: 0 },
    currentStreak: { type: Number, default: 0 },
    bestStreak: { type: Number, default: 0 },
    onboardingComplete: { type: Boolean, default: false },
    conversationState: {
      type: String,
      enum: CONVERSATION_STATES,
      default: 'idle',
    },
    conversationStateData: { type: Schema.Types.Mixed, default: {} },
    focusUntil: { type: Date, default: null },
    dndUntil: { type: Date, default: null },
    todayPlanSubmitted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>('User', UserSchema);
