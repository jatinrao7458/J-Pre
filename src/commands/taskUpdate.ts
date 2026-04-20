import { Task, User } from '../db/index.js';
import { sendText } from '../whatsapp/sender.js';

/**
 * Handle task completion/update messages.
 * Supports: ✅, done, completed, ❌, couldn't, skip, reschedule
 */
export async function handleTaskUpdate(
  userId: string,
  phone: string,
  text: string,
  sock: any
): Promise<void> {
  const lower = text.toLowerCase().trim();

  // Get today's incomplete tasks
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);

  const pendingTasks = await Task.find({
    userId,
    scheduledTime: { $gte: todayStart, $lte: todayEnd },
    completed: false,
    missed: false,
  }).sort({ scheduledTime: 1 });

  if (pendingTasks.length === 0) {
    await sendText(sock, phone, '🎉 You have no pending tasks! All done for today.');
    return;
  }

  // Check for completion markers
  if (lower.includes('✅') || lower.includes('done') || lower.includes('completed') || lower.includes('finished')) {
    // Complete the most recent/current task
    const currentTask = pendingTasks[0];
    await Task.updateOne(
      { _id: currentTask._id },
      { completed: true, completedAt: new Date() }
    );

    // Award points
    const pointsForTask = currentTask.priority === 'high' ? 15 : currentTask.priority === 'medium' ? 10 : 5;
    await User.updateOne({ _id: userId }, { $inc: { points: pointsForTask } });

    const remaining = pendingTasks.length - 1;
    let msg = `✅ *${currentTask.description}* — Done! (+${pointsForTask} ⭐)\n`;

    if (remaining > 0) {
      const nextTask = pendingTasks[1];
      const nextTime = new Date(nextTask.scheduledTime).toLocaleTimeString('en-US', {
        hour: 'numeric', minute: '2-digit', hour12: true,
      });
      msg += `\n⏭️ *Next:* ${nextTask.description} at ${nextTime}\n${remaining} task${remaining > 1 ? 's' : ''} remaining.`;
    } else {
      msg += `\n🎉 *All tasks done for today!* Incredible work!`;
    }

    await sendText(sock, phone, msg);
    return;
  }

  // Check for failure markers
  if (lower.includes('❌') || lower.includes("couldn't") || lower.includes('skip') || lower.includes('missed')) {
    const currentTask = pendingTasks[0];

    // Ask for reason
    await User.updateOne(
      { _id: userId },
      {
        conversationState: 'awaiting_debrief_reason',
        conversationStateData: { pendingTaskId: currentTask._id.toString() },
      }
    );

    await sendText(sock, phone, `Got it — marking *${currentTask.description}* as missed.\n\n*Quick — what happened?*\n\n_e.g. "ran out of time", "wasn't feeling well", "got distracted"_`);
    return;
  }

  // List pending tasks if unclear
  let msg = `📋 *Pending Tasks:*\n\n`;
  const priorityEmoji = { high: '🔴', medium: '🟡', low: '🟢' };

  for (const task of pendingTasks) {
    const time = new Date(task.scheduledTime).toLocaleTimeString('en-US', {
      hour: 'numeric', minute: '2-digit', hour12: true,
    });
    const emoji = priorityEmoji[task.priority as keyof typeof priorityEmoji];
    msg += `${emoji} *${time}* — ${task.description}\n`;
  }

  msg += `\nReply ✅ to complete the current task or ❌ to mark it missed.`;
  await sendText(sock, phone, msg);
}

/**
 * Handle the debrief reason (when user responds to "why did you miss X?")
 */
export async function handleDebriefReason(
  userId: string,
  phone: string,
  reason: string,
  sock: any
): Promise<void> {
  const user = await User.findById(userId);
  if (!user) return;

  const taskId = user.conversationStateData?.pendingTaskId;
  if (!taskId) {
    await User.updateOne({ _id: userId }, { conversationState: 'idle', conversationStateData: {} });
    return;
  }

  // Mark task as missed with reason
  await Task.updateOne(
    { _id: taskId },
    { missed: true, failureReason: reason }
  );

  // Reset state
  await User.updateOne(
    { _id: userId },
    { conversationState: 'idle', conversationStateData: {} }
  );

  await sendText(sock, phone, `📝 Logged: *"${reason}"*\n\nNo worries — let's make sure the next one counts 💪`);
}
