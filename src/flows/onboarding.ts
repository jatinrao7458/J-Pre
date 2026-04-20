import { User, IUser, Habit } from '../db/index.js';
import { sendText } from '../whatsapp/sender.js';
import { scheduleUserDailyJobs } from '../scheduler/index.js';

/**
 * 8-Step Onboarding Flow
 *
 * Step 1: Welcome + ask name
 * Step 2: Ask timezone
 * Step 3: Ask active hours (wake/sleep)
 * Step 4: Ask life motivations / goals
 * Step 5: Ask for recurring daily habits
 * Step 6: Ask LeetCode username (optional)
 * Step 7: Ask about social media accounts (optional)
 * Step 8: Confirm & finish
 */
export async function handleOnboardingStep(
  user: IUser,
  text: string,
  sock: any
): Promise<void> {
  const phone = user.phone;
  const step = user.conversationState;

  switch (step) {
    // ── STEP 1: Welcome & Name ──
    case 'onboarding_step_1': {
      await sendText(
        sock,
        phone,
        `Hey there! 👋 I'm *J-pre*, your productivity coach.\n\nI'll help you plan your days, track tasks, stay accountable, and crush your goals.\n\nLet's get to know each other!\n\n*What's your name?*`
      );
      await User.updateOne({ _id: user._id }, { conversationState: 'onboarding_step_2' });
      break;
    }

    // ── STEP 2: Save name, ask timezone ──
    case 'onboarding_step_2': {
      const name = text.trim();
      await User.updateOne({ _id: user._id }, { name, conversationState: 'onboarding_step_3' });
      await sendText(
        sock,
        phone,
        `Nice to meet you, *${name}*! 🙌\n\n*What's your timezone?*\n\nJust type it like: \`Asia/Kolkata\`, \`US/Eastern\`, \`Europe/London\`\n\n(If you're in India, just say "IST" and I'll get it)`
      );
      break;
    }

    // ── STEP 3: Save timezone, ask active hours ──
    case 'onboarding_step_3': {
      let tz = text.trim();
      // Common shorthand mappings
      const tzMap: Record<string, string> = {
        ist: 'Asia/Kolkata',
        pst: 'US/Pacific',
        est: 'US/Eastern',
        cst: 'US/Central',
        gmt: 'Europe/London',
        cet: 'Europe/Berlin',
      };
      tz = tzMap[tz.toLowerCase()] || tz;

      await User.updateOne({ _id: user._id }, { timezone: tz, conversationState: 'onboarding_step_4' });
      await sendText(
        sock,
        phone,
        `Got it — *${tz}* ⏰\n\n*What time do you usually wake up and sleep?*\n\nFormat: \`6 AM - 11 PM\` or just \`6-23\``
      );
      break;
    }

    // ── STEP 4: Save active hours, ask motivations ──
    case 'onboarding_step_4': {
      const { start, end } = parseActiveHours(text);
      await User.updateOne(
        { _id: user._id },
        { activeHoursStart: start, activeHoursEnd: end, conversationState: 'onboarding_step_5' }
      );
      await sendText(
        sock,
        phone,
        `Active hours: *${formatHour(start)} → ${formatHour(end)}* ✅\n\nNow the important one 🎯\n\n*What are your life goals / motivations?*\n\nShare 2-3 things that drive you. I'll use these to keep you on track when things get tough.\n\n_Example: "Get into FAANG, build a startup, fitness"_`
      );
      break;
    }

    // ── STEP 5: Save motivations, ask habits ──
    case 'onboarding_step_5': {
      const motivations = text
        .split(/[,\n]/)
        .map((m) => m.trim())
        .filter((m) => m.length > 0);

      await User.updateOne(
        { _id: user._id },
        { lifeMotivations: motivations, conversationState: 'onboarding_step_6' }
      );
      await sendText(
        sock,
        phone,
        `Love it 🔥\n\nYour motivations:\n${motivations.map((m) => `• ${m}`).join('\n')}\n\n*Do you have any daily habits you want me to track?*\n\nList them separated by commas.\n_Example: "Gym, Read 30 min, Meditate, LeetCode"_\n\n(Type "skip" if none)`
      );
      break;
    }

    // ── STEP 6: Save habits, ask LeetCode ──
    case 'onboarding_step_6': {
      if (text.trim().toLowerCase() !== 'skip') {
        const habits = text
          .split(/[,\n]/)
          .map((h) => h.trim())
          .filter((h) => h.length > 0);

        for (const habitName of habits) {
          const habit = await Habit.create({ userId: user._id, name: habitName });
          await User.updateOne(
            { _id: user._id },
            { $push: { recurringHabits: habit._id } }
          );
        }

        await sendText(sock, phone, `Tracking *${habits.length}* habits ✅`);
      }

      await User.updateOne({ _id: user._id }, { conversationState: 'onboarding_step_7' });
      await sendText(
        sock,
        phone,
        `*What's your LeetCode username?*\n\nI'll track your problems solved, streaks, and contest rating.\n\n(Type "skip" if you don't use LeetCode)`
      );
      break;
    }

    // ── STEP 7: Save LeetCode, ask social ──
    case 'onboarding_step_7': {
      if (text.trim().toLowerCase() !== 'skip') {
        await User.updateOne({ _id: user._id }, { leetcodeUsername: text.trim() });
        await sendText(sock, phone, `LeetCode: *${text.trim()}* 💻`);
      }

      await User.updateOne({ _id: user._id }, { conversationState: 'onboarding_step_8' });
      await sendText(
        sock,
        phone,
        `Last one! 📣\n\n*Want me to post daily accountability updates on Twitter/X or LinkedIn?*\n\nI'll always draft the post and ask for your approval first — nothing goes out without you saying yes.\n\nType "yes" to set up later, or "skip" to disable.`
      );
      break;
    }

    // ── STEP 8: Finish onboarding ──
    case 'onboarding_step_8': {
      const wantsSocial = text.trim().toLowerCase() !== 'skip';

      await User.updateOne(
        { _id: user._id },
        {
          onboardingComplete: true,
          conversationState: 'idle',
          conversationStateData: wantsSocial ? { socialSetupPending: true } : {},
        }
      );

      const updatedUser = await User.findById(user._id);
      const name = updatedUser?.name || 'friend';

      await sendText(
        sock,
        phone,
        `You're all set, *${name}*! 🎉\n\n` +
          `Here's what I'll do for you:\n` +
          `📋 Parse your daily plan\n` +
          `⏰ Send task reminders\n` +
          `📊 Track your progress\n` +
          `💪 Keep you accountable\n\n` +
          `*Send me your plan for today anytime!*\n\n` +
          `Format it however you want — I'll figure out the tasks, times, and priorities.\n\n` +
          `_Tip: Type "help" anytime to see what I can do._`
      );

      // Schedule recurring daily jobs for this user
      const finalUser = await User.findById(user._id);
      if (finalUser) {
        await scheduleUserDailyJobs(
          finalUser._id.toString(),
          phone,
          finalUser.activeHoursStart,
          finalUser.activeHoursEnd
        );
      }

      console.log(`✅ Onboarding complete for ${name} (${phone})`);
      break;
    }

    default:
      break;
  }
}

// ── Helpers ──

function parseActiveHours(text: string): { start: number; end: number } {
  // Handle formats: "6 AM - 11 PM", "6-23", "6am to 11pm"
  const cleaned = text.toLowerCase().replace(/to/g, '-').replace(/\s+/g, '');
  const parts = cleaned.split('-');

  if (parts.length !== 2) return { start: 6, end: 23 };

  return {
    start: parseHour(parts[0]),
    end: parseHour(parts[1]),
  };
}

function parseHour(s: string): number {
  const isPM = s.includes('pm');
  const isAM = s.includes('am');
  const num = parseInt(s.replace(/[^\d]/g, ''), 10);

  if (isNaN(num)) return 6;

  if (isPM && num < 12) return num + 12;
  if (isAM && num === 12) return 0;
  return num;
}

function formatHour(h: number): string {
  if (h === 0) return '12 AM';
  if (h < 12) return `${h} AM`;
  if (h === 12) return '12 PM';
  return `${h - 12} PM`;
}
