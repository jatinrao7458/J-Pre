import { sendText } from './whatsapp/sender.js';
import { routeMessage } from './router/index.js';

/**
 * Main message handler — entry point from whatsapp/listener.ts
 *
 * Routes all incoming messages through the state machine.
 * Image/audio handling will be added in later phases.
 */
export async function handleIncomingMessage(
  sock: any,
  phone: string,
  messageContent: { type: string; text?: string; caption?: string; imageBuffer?: Buffer; audioBuffer?: Buffer }
): Promise<void> {
  const { type, text, caption, imageBuffer } = messageContent;

  switch (type) {
    case 'text': {
      if (!text) return;
      await routeMessage(phone, text, sock);
      break;
    }

    case 'image': {
      // TODO: Phase 4 — send image to Gemini Vision for screen time parsing
      const prompt = caption || 'What do you see in this image?';
      await sendText(sock, phone, '📷 Image analysis coming in Phase 4! For now, I got your image.');
      break;
    }

    case 'audio': {
      // TODO: Phase 4 — transcribe audio via Gemini
      await sendText(sock, phone, '🎤 Audio transcription coming in Phase 4!');
      break;
    }

    default:
      await sendText(sock, phone, 'I can handle text, images, and audio — send me something!');
  }
}
