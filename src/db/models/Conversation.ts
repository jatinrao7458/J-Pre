import mongoose, { Schema, Document } from 'mongoose';

// ── Interface ──
export interface IConversation extends Document {
  userId: mongoose.Types.ObjectId;
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
  }>;
  summarizedContext: string;
  lastSummarizedAt: Date | null;
}

// ── Schema ──
const ConversationSchema = new Schema<IConversation>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    messages: [
      {
        role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
        content: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    summarizedContext: { type: String, default: '' },
    lastSummarizedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export const Conversation = mongoose.model<IConversation>('Conversation', ConversationSchema);
