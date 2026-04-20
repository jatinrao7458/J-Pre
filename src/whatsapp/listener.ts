import { WASocket, WAMessage } from '@whiskeysockets/baileys';
import { handleIncomingMessage } from '../handler.js';

/**
 * Set up the inbound message listener on the Baileys socket.
 *
 * Listens for `messages.upsert` events, extracts the message metadata,
 * and routes it to the main message handler.
 */
export function setupMessageListener(sock: WASocket): void {
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    // Only process new messages (not history sync)
    if (type !== 'notify') return;

    for (const msg of messages) {
      try {
        // Skip messages sent by us (the bot)
        if (msg.key.fromMe) continue;

        // Skip status broadcasts
        if (msg.key.remoteJid === 'status@broadcast') continue;

        // Skip group messages (personal bot — DMs only)
        if (msg.key.remoteJid?.endsWith('@g.us')) continue;

        // Extract message data
        const parsed = extractMessageData(msg);
        if (!parsed) continue;

        console.log(`📩 Message from ${parsed.phone}: ${parsed.text || '[media]'}`);

        // Route to the main handler — pass sock so it can reply
        await handleIncomingMessage(sock, parsed.phone, {
          type: parsed.type,
          text: parsed.text || undefined,
          caption: parsed.caption || undefined,
          imageBuffer: undefined, // Downloaded lazily in Phase 4
          audioBuffer: undefined,
        });
      } catch (error) {
        console.error('❌ Error processing message:', error);
      }
    }
  });

  console.log('👂 Message listener active — listening for incoming messages...');
}

// ── Parsed Message Shape ──

interface ParsedMessage {
  phone: string;
  type: 'text' | 'image' | 'audio' | 'unknown';
  text: string | null;
  caption: string | null;
  rawMessage: WAMessage;
}

/**
 * Extract useful data from a raw Baileys WAMessage.
 */
function extractMessageData(msg: WAMessage): ParsedMessage | null {
  const senderJid = msg.key.remoteJid;
  if (!senderJid) return null;

  const messageContent = msg.message;
  if (!messageContent) return null;

  // Determine message type and extract content
  let type: ParsedMessage['type'] = 'unknown';
  let text: string | null = null;
  let caption: string | null = null;

  if (messageContent.conversation) {
    type = 'text';
    text = messageContent.conversation;
  } else if (messageContent.extendedTextMessage?.text) {
    type = 'text';
    text = messageContent.extendedTextMessage.text;
  } else if (messageContent.imageMessage) {
    type = 'image';
    caption = messageContent.imageMessage.caption || null;
  } else if (messageContent.audioMessage) {
    type = 'audio';
  }

  return {
    phone: senderJid,
    type,
    text,
    caption,
    rawMessage: msg,
  };
}
