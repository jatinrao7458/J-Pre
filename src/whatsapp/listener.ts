import { WASocket, proto, WAMessage, MessageUpsertType } from '@whiskeysockets/baileys';
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

        console.log(`📩 Message from ${parsed.senderJid}: ${parsed.text || '[media]'}`);

        // Route to the main handler
        await handleIncomingMessage(parsed);
      } catch (error) {
        console.error('❌ Error processing message:', error);
      }
    }
  });

  console.log('👂 Message listener active — listening for incoming messages...');
}

// ── Message Data Types ──

export interface ParsedMessage {
  /** The sender's WhatsApp JID (e.g., "919876543210@s.whatsapp.net") */
  senderJid: string;
  /** The text content of the message (null if media-only) */
  text: string | null;
  /** Whether the message contains an image */
  hasImage: boolean;
  /** Whether the message contains an audio/voice note */
  hasAudio: boolean;
  /** The raw Baileys message object (for downloading media later) */
  rawMessage: WAMessage;
  /** Message timestamp */
  timestamp: number;
}

/**
 * Extract useful data from a raw Baileys WAMessage.
 */
function extractMessageData(msg: WAMessage): ParsedMessage | null {
  const senderJid = msg.key.remoteJid;
  if (!senderJid) return null;

  const messageContent = msg.message;
  if (!messageContent) return null;

  // Extract text from various message types
  let text: string | null = null;
  if (messageContent.conversation) {
    text = messageContent.conversation;
  } else if (messageContent.extendedTextMessage?.text) {
    text = messageContent.extendedTextMessage.text;
  } else if (messageContent.imageMessage?.caption) {
    text = messageContent.imageMessage.caption;
  }

  // Check for media
  const hasImage = !!(messageContent.imageMessage);
  const hasAudio = !!(messageContent.audioMessage);

  return {
    senderJid,
    text,
    hasImage,
    hasAudio,
    rawMessage: msg,
    timestamp: msg.messageTimestamp as number || Math.floor(Date.now() / 1000),
  };
}
