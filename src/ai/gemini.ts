import { GoogleGenerativeAI, GenerativeModel, Content } from '@google/generative-ai';
import { PERSONA_PROMPT } from './persona.js';
import { rateLimitedRequest } from './rateLimiter.js';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

if (!GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY is not set in .env');
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// ── Available Models ──
const textModel: GenerativeModel = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash',
});

const visionModel: GenerativeModel = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash',
});

/**
 * Send a text prompt to Gemini with J-pre's persona prepended.
 * All calls are rate-limited through the request queue.
 */
export async function askGemini(
  userMessage: string,
  conversationHistory: Content[] = []
): Promise<string> {
  return rateLimitedRequest(async () => {
    const chat = textModel.startChat({
      history: [
        {
          role: 'user',
          parts: [{ text: 'System instruction: ' + PERSONA_PROMPT }],
        },
        {
          role: 'model',
          parts: [{ text: 'Understood. I am J-pre. Ready to assist.' }],
        },
        ...conversationHistory,
      ],
    });

    const result = await chat.sendMessage(userMessage);
    const response = result.response;
    return response.text();
  });
}

/**
 * Send an image (as base64) + text prompt to Gemini Vision.
 * Used for screen time parsing and other image analysis.
 */
export async function askGeminiVision(
  prompt: string,
  imageBase64: string,
  mimeType: string = 'image/jpeg'
): Promise<string> {
  return rateLimitedRequest(async () => {
    const result = await visionModel.generateContent([
      { text: PERSONA_PROMPT + '\n\n' + prompt },
      {
        inlineData: {
          mimeType,
          data: imageBase64,
        },
      },
    ]);
    return result.response.text();
  });
}

/**
 * Classify user intent from their message.
 * Returns a machine-readable intent string for the state router.
 */
export async function classifyIntent(userMessage: string): Promise<string> {
  return rateLimitedRequest(async () => {
    const result = await textModel.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `You are an intent classifier. Classify the following user message into exactly ONE of these intents. Return ONLY the intent string, nothing else.

Intents:
- daily_plan (user is sending their daily plan/schedule)
- task_update (user is reporting task completion or asking to reschedule)
- mood_check (user is reporting mood or energy or feelings)
- research_request (user wants you to research something)
- url_summarize (user sent a URL to summarize)
- youtube_recommend (user wants video recommendations)
- leetcode_check (user wants LeetCode stats)
- calendar_event (user wants to add/check calendar events)
- draft_request (user wants a draft written — email, tweet, post)
- accountability_post (user wants to post their daily update)
- habit_update (user is reporting on a habit)
- monthly_goal (user wants to set/review monthly goals)
- screen_time (user sent a screenshot of screen time)
- what_now (user is asking what to do next)
- general_chat (anything else — general conversation)

User message: "${userMessage}"

Intent:`,
            },
          ],
        },
      ],
    });

    const intent = result.response.text().trim().toLowerCase();
    // Validate the intent is one we recognize
    const validIntents = [
      'daily_plan', 'task_update', 'mood_check', 'research_request',
      'url_summarize', 'youtube_recommend', 'leetcode_check', 'calendar_event',
      'draft_request', 'accountability_post', 'habit_update', 'monthly_goal',
      'screen_time', 'what_now', 'general_chat',
    ];

    return validIntents.includes(intent) ? intent : 'general_chat';
  });
}
