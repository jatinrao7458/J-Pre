import { ParsedMessage } from './whatsapp/listener.js';
import { sendText } from './whatsapp/sender.js';

/**
 * Main message handler — the central routing point for all incoming messages.
 * 
 * Phase 1: Simple echo for testing.
 * Phase 2+: This will check conversationState → route to state machine or intent classifier.
 */
export async function handleIncomingMessage(msg: ParsedMessage): Promise<void> {
  const { senderJid, text, hasImage, hasAudio } = msg;

  // ── Phase 1: Echo Test ──
  // Simply echo back whatever text is received, to verify two-way messaging works.
  // This will be replaced by the full state machine router in Phase 2.

  if (text) {
    const echoResponse = `🤖 J-pre received: "${text}"\n\n(Echo mode — full intelligence coming in Phase 2!)`;
    await sendText(senderJid, echoResponse);
    return;
  }

  if (hasImage) {
    await sendText(senderJid, '🖼️ Got your image! (Image processing coming in Phase 2)');
    return;
  }

  if (hasAudio) {
    await sendText(senderJid, '🎤 Got your voice note! (Voice processing coming in Phase 2)');
    return;
  }

  await sendText(senderJid, '🤔 Received something, but I couldn\'t parse it. Try sending text!');
}
