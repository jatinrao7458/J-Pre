import { User, Habit, MoodLog } from '../db/index.js';
import { sendText } from '../whatsapp/sender.js';

/**
 * Handle mood/energy check-in messages.
 */
export async function handleMoodCheck(
  userId: string,
  phone: string,
  text: string,
  sock: any
): Promise<void> {
  const today = new Date().toISOString().split('T')[0];

  // Try to extract mood/energy numbers
  const numbers = text.match(/\d+/g)?.map(Number).filter(n => n >= 1 && n <= 10);

  if (!numbers || numbers.length < 2) {
    await sendText(sock, phone,
      `😊 *Mood & Energy Check-in*\n\nRate both on a scale of 1-10:\n\n_Example: "Mood 7, Energy 5" or just "7 5"_`
    );
    return;
  }

  const [mood, energy] = numbers;

  await MoodLog.findOneAndUpdate(
    { userId, date: today },
    { mood, energy, notes: text },
    { upsert: true }
  );

  const moodEmoji = mood >= 8 ? '😄' : mood >= 5 ? '😊' : mood >= 3 ? '😐' : '😔';
  const energyEmoji = energy >= 8 ? '⚡' : energy >= 5 ? '💪' : energy >= 3 ? '😴' : '🪫';

  await sendText(sock, phone,
    `Logged! ${moodEmoji} Mood: ${mood}/10 | ${energyEmoji} Energy: ${energy}/10\n\n${
      energy <= 3 ? '_Low energy day — I\'ll prioritize only your high-priority tasks._' :
      mood <= 3 ? '_Tough day. Remember: showing up is already a win._' :
      '✅ Keep it up!'
    }`
  );
}

/**
 * Handle habit completion reports.
 */
export async function handleHabitUpdate(
  userId: string,
  phone: string,
  text: string,
  sock: any
): Promise<void> {
  const habits = await Habit.find({ userId });

  if (habits.length === 0) {
    await sendText(sock, phone, '🏋️ You don\'t have any habits set up yet.\n\nSend me a list to track:\n_"Add habits: Gym, Read 30min, Meditate"_');
    return;
  }

  const lower = text.toLowerCase();
  const today = new Date().toISOString().split('T')[0];
  const completed: string[] = [];

  for (const habit of habits) {
    if (lower.includes(habit.name.toLowerCase()) || lower.includes('all')) {
      if (habit.lastCompletedDate !== today) {
        const newStreak = habit.currentStreak + 1;
        await Habit.updateOne(
          { _id: habit._id },
          {
            lastCompletedDate: today,
            currentStreak: newStreak,
            bestStreak: Math.max(newStreak, habit.bestStreak),
          }
        );
        completed.push(`${habit.name} (${newStreak}🔥)`);
      }
    }
  }

  if (completed.length > 0) {
    await sendText(sock, phone, `🏋️ *Habits Done:*\n${completed.map(h => `✅ ${h}`).join('\n')}`);
  } else {
    let msg = `🏋️ *Your Habits:*\n\n`;
    for (const h of habits) {
      const done = h.lastCompletedDate === today;
      msg += `${done ? '✅' : '⬜'} ${h.name} (${h.currentStreak}🔥)\n`;
    }
    msg += `\nTell me which ones you did! e.g. _"Done: Gym, Read"_`;
    await sendText(sock, phone, msg);
  }
}
