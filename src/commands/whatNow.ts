import { Task, User } from '../db/index.js';
import { sendText } from '../whatsapp/sender.js';
import { askGemini } from '../ai/index.js';

/**
 * "What should I do now?" — AI-powered recommendation
 * based on pending tasks, time of day, and energy level.
 */
export async function handleWhatNow(
  userId: string,
  phone: string,
  sock: any
): Promise<void> {
  const user = await User.findById(userId);
  if (!user) return;

  const now = new Date();
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);

  const pendingTasks = await Task.find({
    userId,
    scheduledTime: { $gte: todayStart, $lte: todayEnd },
    completed: false,
    missed: false,
  }).sort({ scheduledTime: 1 });

  if (pendingTasks.length === 0) {
    await sendText(sock, phone,
      `🎯 No pending tasks!\n\nOptions:\n• Send a new plan for the rest of the day\n• Work on a habit\n• Take a well-deserved break 😊`
    );
    return;
  }

  // Build context for Gemini
  const taskList = pendingTasks.map(t => {
    const time = new Date(t.scheduledTime).toLocaleTimeString('en-US', {
      hour: 'numeric', minute: '2-digit', hour12: true,
    });
    return `[${t.priority}] ${time} — ${t.description} (${t.duration}min)`;
  }).join('\n');

  const prompt = `Given these pending tasks and the current time (${now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}), recommend what the user should focus on right now.

Be specific and brief (3-4 lines max). Consider:
- Task priority
- Time sensitivity 
- Energy management (alternate between hard and easy tasks)

Pending tasks:
${taskList}

User's life goals: ${user.lifeMotivations.join(', ')}

Recommendation:`;

  const recommendation = await askGemini(prompt);
  await sendText(sock, phone, `🎯 *Right now, here's my take:*\n\n${recommendation}`);
}
