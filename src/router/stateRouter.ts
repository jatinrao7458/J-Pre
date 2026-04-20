import { User, IUser, Conversation } from '../db/index.js';
import { classifyIntent, askGemini } from '../ai/index.js';
import { handleOnboardingStep } from '../flows/onboarding.js';
import { handleDailyPlan, handleTaskUpdate, handleDebriefReason, handleMoodCheck, handleHabitUpdate, handleWhatNow } from '../commands/index.js';
import { sendText } from '../whatsapp/sender.js';
import { Content } from '@google/generative-ai';

/**
 * State Router — Central message routing logic.
 *
 * 1. Look up (or create) the user in MongoDB
 * 2. If user is mid-onboarding → route to onboarding handler
 * 3. If user is in a special state (debrief, approval, etc.) → route to that handler
 * 4. Otherwise → classify intent → dispatch to the right command handler
 */
export async function routeMessage(phone: string, text: string, sock: any): Promise<void> {
  try {
    // ── 1. Get or create user ──
    let user = await User.findOne({ phone });

    if (!user) {
      user = await User.create({ phone });
      await Conversation.create({ userId: user._id, messages: [] });
      console.log(`👤 New user registered: ${phone}`);
    }

    const userId = user._id.toString();

    // ── 2. Log incoming message ──
    await Conversation.findOneAndUpdate(
      { userId: user._id },
      {
        $push: {
          messages: {
            role: 'user',
            content: text,
            timestamp: new Date(),
          },
        },
      }
    );

    // ── 3. Route based on conversation state ──
    const state = user.conversationState;

    // Onboarding states
    if (state.startsWith('onboarding_step_')) {
      await handleOnboardingStep(user, text, sock);
      return;
    }

    // Special mid-flow states
    switch (state) {
      case 'awaiting_debrief_reason':
        await handleDebriefReason(userId, phone, text, sock);
        return;

      case 'awaiting_post_approval':
        // TODO: Phase 4
        await sendText(sock, phone, '📣 Post approval handler coming in Phase 4!');
        await User.updateOne({ _id: user._id }, { conversationState: 'idle' });
        return;

      case 'awaiting_reschedule_confirm':
        // TODO: Phase 4
        await sendText(sock, phone, '🔄 Reschedule confirmation coming soon!');
        await User.updateOne({ _id: user._id }, { conversationState: 'idle' });
        return;

      case 'awaiting_plan_confirm':
        // TODO: Phase 4
        await sendText(sock, phone, '📋 Plan confirmation coming soon!');
        await User.updateOne({ _id: user._id }, { conversationState: 'idle' });
        return;

      case 'awaiting_draft_approval':
        // TODO: Phase 4
        await sendText(sock, phone, '✍️ Draft approval coming in Phase 4!');
        await User.updateOne({ _id: user._id }, { conversationState: 'idle' });
        return;
    }

    // ── 4. Idle state — classify intent and dispatch ──
    if (!user.onboardingComplete) {
      await User.updateOne({ _id: user._id }, { conversationState: 'onboarding_step_1' });
      await handleOnboardingStep(user, text, sock);
      return;
    }

    const intent = await classifyIntent(text);
    console.log(`🎯 Intent classified: ${intent} (from: ${phone})`);

    // Dispatch to command handlers
    switch (intent) {
      case 'daily_plan':
        await handleDailyPlan(userId, phone, text, sock);
        break;

      case 'task_update':
        await handleTaskUpdate(userId, phone, text, sock);
        break;

      case 'mood_check':
        await handleMoodCheck(userId, phone, text, sock);
        break;

      case 'what_now':
        await handleWhatNow(userId, phone, sock);
        break;

      case 'habit_update':
        await handleHabitUpdate(userId, phone, text, sock);
        break;

      // ── Phase 4+ stubs ──
      case 'research_request':
        await sendText(sock, phone, '🔍 Web research coming in Phase 4.5!');
        break;

      case 'url_summarize':
        await sendText(sock, phone, '📄 URL summarizer coming in Phase 4.5!');
        break;

      case 'youtube_recommend':
        await sendText(sock, phone, '🎥 YouTube recommendations coming in Phase 4.5!');
        break;

      case 'leetcode_check':
        await sendText(sock, phone, '💻 LeetCode sync coming in Phase 4.5!');
        break;

      case 'calendar_event':
        await sendText(sock, phone, '📅 Calendar integration coming in Phase 4.5!');
        break;

      case 'draft_request':
        await sendText(sock, phone, '✍️ Draft writer coming in Phase 4!');
        break;

      case 'accountability_post':
        await sendText(sock, phone, '📣 Accountability posting coming in Phase 4!');
        break;

      case 'monthly_goal':
        await sendText(sock, phone, '🗺️ Monthly goals coming in Phase 4!');
        break;

      case 'screen_time':
        await sendText(sock, phone, '📱 Screen time parser coming in Phase 4!');
        break;

      case 'general_chat':
      default: {
        const history = await getConversationHistory(user._id);
        const reply = await askGemini(text, history);
        await sendText(sock, phone, reply);
        await logAssistantMessage(user._id, reply);
        break;
      }
    }
  } catch (error) {
    console.error(`❌ routeMessage error for ${phone}:`, error);
    await sendText(sock, phone, '⚠️ Something went wrong on my end. Try again in a moment.');
  }
}

/**
 * Get recent conversation history formatted for Gemini.
 * Uses a sliding window of the last 20 messages.
 */
async function getConversationHistory(userId: any): Promise<Content[]> {
  const convo = await Conversation.findOne({ userId });
  if (!convo || convo.messages.length === 0) return [];

  const recent = convo.messages.slice(-20);

  return recent.map((msg) => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }],
  })) as Content[];
}

/**
 * Log an assistant response to the conversation history.
 */
async function logAssistantMessage(userId: any, content: string): Promise<void> {
  await Conversation.findOneAndUpdate(
    { userId },
    {
      $push: {
        messages: {
          role: 'assistant',
          content,
          timestamp: new Date(),
        },
      },
    }
  );
}
