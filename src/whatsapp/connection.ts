import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  WASocket,
  fetchLatestBaileysVersion,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import { createRequire } from 'module';
import path from 'path';

const require = createRequire(import.meta.url);
const qrcode = require('qrcode-terminal');

const AUTH_DIR = path.join(process.cwd(), 'auth_state');

const logger = pino({ level: 'silent' }); // Suppress Baileys verbose logs

let sock: WASocket | null = null;

/**
 * Initialize the WhatsApp connection via Baileys.
 * 
 * Auth state is persisted to local files (will migrate to MongoDB in Phase 2).
 * On first run, a QR code is displayed in the terminal — scan once, session persists.
 */
export async function initWhatsApp(): Promise<WASocket> {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();

  console.log('📱 Connecting to WhatsApp...');
  console.log(`   Baileys version: ${version.join('.')}`);

  sock = makeWASocket({
    version,
    auth: state,
    logger,
    printQRInTerminal: false, // We'll handle QR manually for better UX
    browser: ['J-pre Bot', 'Chrome', '1.0.0'],
    syncFullHistory: false,
  });

  // ── Connection Events ──
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    // Display QR code for first-time auth
    if (qr) {
      console.log('\n🔐 Scan this QR code with your WhatsApp:\n');
      qrcode.generate(qr, { small: true });
      console.log('\n   Open WhatsApp → Settings → Linked Devices → Link a Device\n');
    }

    if (connection === 'close') {
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      console.log(
        `⚠️  Connection closed. Status: ${statusCode}. ${shouldReconnect ? 'Reconnecting...' : 'Logged out — delete auth_state and restart to re-scan QR.'}`
      );

      if (shouldReconnect) {
        // Reconnect with a small delay to avoid hammering
        setTimeout(() => {
          initWhatsApp();
        }, 3000);
      }
    }

    if (connection === 'open') {
      console.log('✅ WhatsApp connected successfully!');
    }
  });

  // ── Save credentials on update ──
  sock.ev.on('creds.update', saveCreds);

  return sock;
}

/**
 * Get the current active WhatsApp socket instance.
 */
export function getSocket(): WASocket | null {
  return sock;
}
