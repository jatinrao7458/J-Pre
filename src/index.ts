import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import { initWhatsApp } from './whatsapp/connection.js';
import { setupMessageListener } from './whatsapp/listener.js';

const app = express();
const PORT = process.env.PORT || 3000;

// ── Health Check (for Railway) ──
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'alive',
    bot: 'J-pre 🤖',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// ── OAuth callback routes (Phase 4+) ──
// app.get('/auth/google', ...);
// app.get('/auth/google/callback', ...);

async function main() {
  try {
    console.log('🚀 Starting J-pre...');

    // Start Express
    app.listen(PORT, () => {
      console.log(`🌐 Express server running on port ${PORT}`);
      console.log(`   Health check: http://localhost:${PORT}/health`);
    });

    // Connect WhatsApp
    const sock = await initWhatsApp();

    // Set up message listener
    setupMessageListener(sock);

    console.log('✅ J-pre is ready!');
  } catch (error) {
    console.error('❌ Fatal error starting J-pre:', error);
    process.exit(1);
  }
}

main();
