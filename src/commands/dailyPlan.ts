import { askGemini } from '../ai/index.js';
import { Task, User } from '../db/index.js';
import { sendText } from '../whatsapp/sender.js';
import { scheduleTaskReminders } from '../scheduler/index.js';

interface ParsedTask {
  description: string;
  time: string; // HH:MM 24hr format
  duration: number; // minutes
  priority: 'high' | 'medium' | 'low';
}

/**
 * Parse a user's daily plan via Gemini and create Task documents.
 * Also schedules reminders for each task.
 */
export async function handleDailyPlan(
  userId: string,
  phone: string,
  planText: string,
  sock: any
): Promise<void> {
  try {
    await sendText(sock, phone, '📋 Parsing your plan...');

    // Ask Gemini to extract tasks
    const extracted = await extractTasksFromPlan(planText);

    if (extracted.length === 0) {
      await sendText(sock, phone, `Hmm, I couldn't extract any tasks from that.\n\nTry a format like:\n_9 AM - DSA practice (2hr, high)\n11 AM - System design study (1hr)\n2 PM - Project work (3hr, high)_`);
      return;
    }

    // Create Task documents and schedule reminders
    const today = new Date();
    const taskDocs = [];

    for (const t of extracted) {
      const [hours, minutes] = t.time.split(':').map(Number);
      const scheduledTime = new Date(today);
      scheduledTime.setHours(hours, minutes, 0, 0);

      // If time already passed today, still log it (user may be planning retroactively)
      const task = await Task.create({
        userId,
        description: t.description,
        scheduledTime,
        duration: t.duration,
        priority: t.priority,
      });

      taskDocs.push(task);

      // Only schedule reminders for future tasks
      if (scheduledTime > new Date()) {
        await scheduleTaskReminders(userId, phone, task._id.toString(), scheduledTime, t.duration);
      }
    }

    // Mark plan as submitted
    await User.updateOne({ _id: userId }, { todayPlanSubmitted: true });

    // Build confirmation message
    const priorityEmoji = { high: '🔴', medium: '🟡', low: '🟢' };
    let msg = `✅ *Plan locked in!* ${taskDocs.length} tasks:\n\n`;

    for (const task of taskDocs) {
      const time = new Date(task.scheduledTime).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      const emoji = priorityEmoji[task.priority as keyof typeof priorityEmoji];
      msg += `${emoji} *${time}* — ${task.description} (${task.duration}min)\n`;
    }

    msg += `\nI'll remind you when each task starts ⏰`;

    await sendText(sock, phone, msg);
  } catch (error) {
    console.error('❌ Plan parsing error:', error);
    await sendText(sock, phone, '⚠️ Had trouble parsing your plan. Can you try again?');
  }
}

/**
 * Use Gemini to extract structured tasks from natural language.
 */
async function extractTasksFromPlan(planText: string): Promise<ParsedTask[]> {
  const prompt = `Extract tasks from this daily plan. Return ONLY a valid JSON array, no markdown, no explanation.

Each task object must have:
- "description": string (short, clear task name)
- "time": string (HH:MM in 24-hour format)
- "duration": number (estimated minutes, default 60 if not specified)
- "priority": "high" | "medium" | "low" (infer from context — exams, deadlines, interviews = high; study, practice = medium; leisure = low)

User's plan:
"${planText}"

JSON:`;

  const response = await askGemini(prompt);

  // Extract JSON from response (handle markdown code blocks)
  let cleaned = response.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
  }

  try {
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (t: any) => t.description && t.time && typeof t.duration === 'number'
    ) as ParsedTask[];
  } catch {
    console.error('❌ Failed to parse Gemini task JSON:', cleaned);
    return [];
  }
}
