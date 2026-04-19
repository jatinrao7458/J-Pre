# J-pre 🤖

**Your autonomous WhatsApp productivity coach, AI assistant & accountability partner.**

J-pre lives on WhatsApp and acts as your personal coach — tracking daily plans, nudging you through the day, analysing patterns, executing tasks on your behalf (web research, calendar, LeetCode tracking, YouTube recommendations), and holding you publicly accountable on Twitter/X and LinkedIn.

---

## Features (41)

### Core Loop
- 📋 **Daily Plan Parsing** — Send your plan in natural language, J-pre extracts tasks with priorities
- ⏰ **Task Reminders** — Get notified at the exact start time of each task
- 🔁 **1-Hour Follow-ups** — "Did you complete it?" with logging
- 📊 **Hourly Check-ins** — What's done, what's next, AI-recommended optimal action
- 📈 **End-of-Day Summary** — Planned vs achieved, completion %, screen time, mood

### Intelligence
- 🧠 **Knowledge Graph** — Obsidian-style network mapping goals → tasks → progress
- 🔄 **Smart Re-scheduling** — Auto-detect gaps and offer to re-slot missed tasks
- 💬 **Conversation Memory** — Sliding window + summarized context for long-term memory
- 🎯 **"What should I do now?"** — AI recommendation based on priorities + energy
- ⚠️ **Conflict Detection** — Warns about overlapping task times

### Coaching & Motivation
- 🗺️ **Monthly Roadmaps** — Break monthly goals into weekly milestones
- 💪 **Deep Motivation** — Personal encouragement rooted in your life goals
- 🔍 **Failure Debrief** — Root cause analysis for incomplete tasks
- 🌅 **Morning Kickoff** — Top priorities + quote + streak at 6 AM
- ⏰ **Plan Nudge** — Reminder at 10 AM if no plan submitted

### Personal Assistant
- 🔍 **Web Research** — "Research X" → summarized answer with sources
- 🎥 **YouTube Recommendations** — Goal-aligned video suggestions
- 💻 **LeetCode Sync** — Track solved problems, difficulty breakdown, contest rating
- 📅 **Google Calendar** — Create events and detect scheduling conflicts
- 📄 **URL Summarizer** — Send any link → get key takeaways
- ✍️ **Draft Writer** — Email, LinkedIn, tweet drafts on command

### Tracking & Analytics
- 📱 **Screen Time Tracking** — Screenshot → AI-parsed usage data
- 😊 **Mood & Energy Journal** — Daily tracking with pattern detection
- 🏋️ **Habit Tracker** — Auto-inject daily habits, track streaks
- 📊 **Visual Charts** — Compliance graphs, trend lines, streak calendars
- 🏆 **Gamification** — Points, streaks, milestone celebrations
- 📣 **Public Accountability** — Auto-drafted Twitter/LinkedIn posts

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Runtime | Node.js + TypeScript (ESM) |
| WhatsApp | Baileys (`@whiskeysockets/baileys`) |
| AI Brain | Google Gemini API (text, vision, audio, search grounding) |
| Database | MongoDB Atlas (Mongoose) |
| Scheduling | Agenda (MongoDB-backed) |
| Charts | QuickChart.io API |
| Social Media | Twitter API v2, LinkedIn API |
| YouTube | YouTube Data API v3 |
| LeetCode | Public GraphQL API |
| Calendar | Google Calendar API (OAuth 2.0) |
| Backup | GitHub API (`@octokit/rest`) |
| Deployment | Railway.app (always-on) |

---

## Quick Start

### Prerequisites
- Node.js 20+
- MongoDB (local or Atlas)
- A WhatsApp account
- Google Gemini API key

### Setup

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/jpre-bot.git
cd jpre-bot

# Install dependencies
npm install

# Copy environment template and fill in your keys
cp .env.example .env

# Start in development mode
npm run dev
```

On first run, a QR code will appear in the terminal. Scan it with WhatsApp (Settings → Linked Devices → Link a Device). Session persists after the first scan.

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start with hot-reload (tsx) |
| `npm run build` | Compile TypeScript to JavaScript |
| `npm start` | Run compiled production build |

---

## Project Structure

```
src/
├── index.ts                    # Entry point: Express + Baileys init
├── handler.ts                  # Main message router
├── whatsapp/
│   ├── connection.ts           # Baileys socket, QR, auto-reconnect
│   ├── sender.ts               # sendText, sendImage, sendDocument
│   └── listener.ts             # Inbound message parsing & routing
├── types/
│   └── qrcode-terminal.d.ts    # Type declarations
├── db/                         # MongoDB schemas & connection (Phase 2)
├── ai/                         # Gemini AI modules (Phase 2)
├── router/                     # State machine & routing (Phase 2)
├── flows/                      # Multi-step conversation flows (Phase 2-3)
├── scheduler/                  # Agenda jobs & cron (Phase 3)
├── commands/                   # Command handlers (Phase 2-3)
├── charts/                     # QuickChart integration (Phase 4)
├── social/                     # Twitter/LinkedIn posting (Phase 4)
├── assistant/                  # Personal assistant tools (Phase 4.5)
│   └── tools/                  # Individual tool implementations
└── gamification/               # Points & streaks engine (Phase 4)
```

---

## Environment Variables

See [`.env.example`](.env.example) for all required variables. Key ones:

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | ✅ | Google Gemini API key |
| `MONGODB_URI` | ✅ | MongoDB connection string |
| `PORT` | ✅ | Express server port (default: 3000) |
| `YOUTUBE_API_KEY` | Phase 4.5 | YouTube Data API v3 |
| `GOOGLE_CLIENT_ID` | Phase 4.5 | Google OAuth for Calendar |
| `GOOGLE_CLIENT_SECRET` | Phase 4.5 | Google OAuth for Calendar |
| `LEETCODE_USERNAME` | Phase 4.5 | Your LeetCode profile |
| `TWITTER_*` | Phase 4 | Twitter/X API credentials |
| `LINKEDIN_*` | Phase 4 | LinkedIn API credentials |
| `GITHUB_TOKEN` | Phase 4 | PAT for backup repo |

---

## Deployment (Railway)

1. Push to GitHub
2. Connect repo in [Railway.app](https://railway.app)
3. Set all env vars in Railway dashboard
4. On first deploy, check logs for QR code → scan once
5. Session persists forever — J-pre runs 24/7

---

## Security Notes

> ⚠️ **Never commit `.env` or `auth_state/`** — they contain API keys and WhatsApp session credentials.

The `.gitignore` is configured to exclude both. If you accidentally committed them, rotate all keys immediately.

---

## License

Private — Personal use only.

---

*Built with ❤️ by Jatin. Coached by J-pre 🤖*
