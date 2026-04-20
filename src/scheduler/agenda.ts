import { Agenda, Job } from 'agenda';
import { MongoBackend } from '@agendajs/mongo-backend';
import { getSocket } from '../whatsapp/connection.js';
import { sendText } from '../whatsapp/sender.js';
import { User, Task, DayReport, Habit } from '../db/index.js';
import { askGemini } from '../ai/index.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/jpre';

let agenda: Agenda;

/**
 * Initialize Agenda — MongoDB-backed job scheduler.
 * Defines all recurring and one-off job types.
 */
export async function initScheduler(): Promise<Agenda> {
  const backend = new MongoBackend({
    address: MONGODB_URI,
    collection: 'agendaJobs',
  });

  agenda = new Agenda({
    backend,
    processEvery: '30 seconds',
    maxConcurrency: 5,
  });

  // ── Define Job Types ──
  defineJobs();

  await agenda.start();
  console.log('⏰ Agenda scheduler started');

  return agenda;
}

/**
 * Get the Agenda instance.
 */
export function getAgenda(): Agenda {
  return agenda;
}

// ── Job Definitions ──

function defineJobs(): void {
  // 1. Task Reminder — fires at the scheduled time of a task
  agenda.define('task-reminder', async (job: Job) => {
    const { userId, taskId, phone } = job.attrs.data as any;
    const sock = getSocket();
    if (!sock) return;

    const task = await Task.findById(taskId);
    if (!task || task.completed || task.missed) return;

    const priorityEmoji = task.priority === 'high' ? '🔴' : task.priority === 'medium' ? '🟡' : '🟢';
    await sendText(sock, phone, `${priorityEmoji} *Task Starting Now:*\n\n${task.description}\n\n⏱️ Duration: ${task.duration} min\n\nSend ✅ when done, or tell me if you need to reschedule.`);
  });

  // 2. Task Follow-up — fires 1 hour after task was supposed to start
  agenda.define('task-followup', async (job: Job) => {
    const { userId, taskId, phone } = job.attrs.data as any;
    const sock = getSocket();
    if (!sock) return;

    const task = await Task.findById(taskId);
    if (!task || task.completed) return;

    await sendText(sock, phone, `⏰ Hey! How's *${task.description}* going?\n\nDid you finish it? Reply:\n✅ Done\n🔄 Need more time\n❌ Couldn't do it (I'll ask why)`);

    // Mark as awaiting debrief if they reply ❌
    await User.updateOne(
      { _id: userId },
      { conversationState: 'idle', conversationStateData: { pendingTaskId: taskId } }
    );
  });

  // 3. Morning Kickoff — fires at user's wake time
  agenda.define('morning-kickoff', async (job: Job) => {
    const { userId, phone } = job.attrs.data as any;
    const sock = getSocket();
    if (!sock) return;

    const user = await User.findById(userId);
    if (!user) return;

    // Get streak info
    const streakEmoji = user.currentStreak > 0 ? '🔥' : '💪';
    const streakText = user.currentStreak > 0
      ? `\n${streakEmoji} *Streak: ${user.currentStreak} days*`
      : '';

    // Get pending habits
    const habits = await Habit.find({ userId });
    const habitList = habits.length > 0
      ? `\n\n🏋️ *Daily Habits:*\n${habits.map(h => `• ${h.name} (${h.currentStreak}🔥)`).join('\n')}`
      : '';

    await sendText(sock, phone,
      `☀️ *Good Morning, ${user.name}!*${streakText}\n\nReady to crush today? 💪\n\n📋 *Send me your plan for today!*\nJust list your tasks with times — I'll handle the rest.${habitList}`
    );

    // Reset daily flag
    await User.updateOne({ _id: userId }, { todayPlanSubmitted: false });
  });

  // 4. Plan Nudge — 10 AM if no plan submitted
  agenda.define('plan-nudge', async (job: Job) => {
    const { userId, phone } = job.attrs.data as any;
    const sock = getSocket();
    if (!sock) return;

    const user = await User.findById(userId);
    if (!user || user.todayPlanSubmitted) return;

    await sendText(sock, phone, `👀 Hey ${user.name}, it's 10 AM and I haven't seen your plan yet!\n\nA day without a plan = a wasted day.\n\n📋 Drop your tasks now — even a rough list helps.`);
  });

  // 5. Hourly Check-in — every hour during active hours
  agenda.define('hourly-checkin', async (job: Job) => {
    const { userId, phone } = job.attrs.data as any;
    const sock = getSocket();
    if (!sock) return;

    const user = await User.findById(userId);
    if (!user || !user.todayPlanSubmitted) return;

    // Check if within active hours
    const now = new Date();
    const currentHour = now.getHours();
    if (currentHour < user.activeHoursStart || currentHour >= user.activeHoursEnd) return;

    // Check focus/DND mode
    if (user.focusUntil && user.focusUntil > now) return;
    if (user.dndUntil && user.dndUntil > now) return;

    // Get today's task summary
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);

    const tasks = await Task.find({
      userId,
      scheduledTime: { $gte: todayStart, $lte: todayEnd },
    });

    const completed = tasks.filter(t => t.completed).length;
    const total = tasks.length;
    const upcoming = tasks.filter(t => !t.completed && !t.missed && new Date(t.scheduledTime) > now);
    const nextTask = upcoming[0];

    let msg = `📊 *Quick Check-in*\n\n✅ ${completed}/${total} tasks done`;

    if (nextTask) {
      msg += `\n\n⏭️ *Up Next:* ${nextTask.description}`;
    } else if (completed === total && total > 0) {
      msg += `\n\n🎉 All tasks done! Amazing work!`;
    }

    await sendText(sock, phone, msg);
  });

  // 6. End-of-Day Summary — fires at user's sleep time
  agenda.define('eod-summary', async (job: Job) => {
    const { userId, phone } = job.attrs.data as any;
    const sock = getSocket();
    if (!sock) return;

    const user = await User.findById(userId);
    if (!user) return;

    // Get today's tasks
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);

    const tasks = await Task.find({
      userId,
      scheduledTime: { $gte: todayStart, $lte: todayEnd },
    });

    const completed = tasks.filter(t => t.completed).length;
    const missed = tasks.filter(t => t.missed).length;
    const total = tasks.length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

    const highPriority = tasks.filter(t => t.priority === 'high');
    const hpCompleted = highPriority.filter(t => t.completed).length;
    const hpRate = highPriority.length > 0 ? Math.round((hpCompleted / highPriority.length) * 100) : 0;

    // Build summary
    let summary = `📊 *End of Day Report*\n\n`;
    summary += `✅ *Completed:* ${completed}/${total} (${rate}%)\n`;
    summary += `🔴 *High Priority:* ${hpCompleted}/${highPriority.length} (${hpRate}%)\n`;
    summary += `❌ *Missed:* ${missed}\n`;

    // Streak logic
    if (rate >= 70) {
      const newStreak = user.currentStreak + 1;
      const bestStreak = Math.max(newStreak, user.bestStreak);
      await User.updateOne({ _id: userId }, { currentStreak: newStreak, bestStreak });
      summary += `\n🔥 *Streak: ${newStreak} days!*`;
      if (newStreak > user.bestStreak) summary += ` (New record! 🏆)`;
    } else {
      if (user.currentStreak > 0) {
        await User.updateOne({ _id: userId }, { currentStreak: 0 });
        summary += `\n💔 Streak broken (was ${user.currentStreak} days). Let's bounce back tomorrow!`;
      }
    }

    // Points
    const points = completed * 10 + hpCompleted * 5;
    await User.updateOne({ _id: userId }, { $inc: { points } });
    summary += `\n\n⭐ *+${points} points* (Total: ${user.points + points})`;

    // Save DayReport
    const dateStr = todayStart.toISOString().split('T')[0];
    await DayReport.findOneAndUpdate(
      { userId, date: dateStr },
      {
        totalPlanned: total,
        totalCompleted: completed,
        completionRate: rate,
        highPriorityTotal: highPriority.length,
        highPriorityCompleted: hpCompleted,
        highPriorityCompletionRate: hpRate,
        pointsEarned: points,
      },
      { upsert: true }
    );

    await sendText(sock, phone, summary);
    await sendText(sock, phone, `Goodnight ${user.name} 🌙 See you tomorrow!`);
  });
}

/**
 * Schedule all recurring daily jobs for a user after onboarding completes.
 */
export async function scheduleUserDailyJobs(userId: string, phone: string, activeStart: number, activeEnd: number): Promise<void> {
  // Morning kickoff at user's wake time
  await agenda.every(`0 ${activeStart} * * *`, 'morning-kickoff', { userId, phone });

  // Plan nudge at 10 AM
  await agenda.every('0 10 * * *', 'plan-nudge', { userId, phone });

  // Hourly check-ins during active hours
  await agenda.every('0 * * * *', 'hourly-checkin', { userId, phone });

  // End of day summary at user's sleep time
  await agenda.every(`0 ${activeEnd} * * *`, 'eod-summary', { userId, phone });

  console.log(`📅 Scheduled daily jobs for ${phone} (${activeStart}:00 - ${activeEnd}:00)`);
}

/**
 * Schedule task-specific reminder + follow-up jobs when a plan is parsed.
 */
export async function scheduleTaskReminders(userId: string, phone: string, taskId: string, scheduledTime: Date, duration: number): Promise<void> {
  // Reminder at scheduled time
  await agenda.schedule(scheduledTime, 'task-reminder', { userId, taskId, phone });

  // Follow-up 1 hour after start (or after duration if shorter)
  const followUpTime = new Date(scheduledTime.getTime() + Math.max(duration, 60) * 60 * 1000);
  await agenda.schedule(followUpTime, 'task-followup', { userId, taskId, phone });
}
