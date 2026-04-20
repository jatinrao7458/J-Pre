import { WASocket } from '@whiskeysockets/baileys';

/**
 * Send a text message to a WhatsApp JID.
 */
export async function sendText(sock: WASocket, jid: string, text: string): Promise<void> {
  if (!sock) {
    console.error('❌ Cannot send message: WhatsApp not connected');
    return;
  }

  try {
    await sock.sendMessage(jid, { text });
  } catch (error) {
    console.error(`❌ Failed to send text to ${jid}:`, error);
    // Retry once after 2 seconds
    setTimeout(async () => {
      try {
        await sock.sendMessage(jid, { text });
        console.log(`🔄 Retry successful for ${jid}`);
      } catch (retryError) {
        console.error(`❌ Retry also failed for ${jid}:`, retryError);
      }
    }, 2000);
  }
}

/**
 * Send an image with an optional caption to a WhatsApp JID.
 */
export async function sendImage(
  sock: WASocket,
  jid: string,
  imageBuffer: Buffer,
  caption?: string
): Promise<void> {
  if (!sock) {
    console.error('❌ Cannot send image: WhatsApp not connected');
    return;
  }

  try {
    await sock.sendMessage(jid, {
      image: imageBuffer,
      caption: caption || '',
    });
  } catch (error) {
    console.error(`❌ Failed to send image to ${jid}:`, error);
  }
}

/**
 * Send a document/file to a WhatsApp JID.
 */
export async function sendDocument(
  sock: WASocket,
  jid: string,
  fileBuffer: Buffer,
  filename: string,
  mimetype: string = 'application/octet-stream'
): Promise<void> {
  if (!sock) {
    console.error('❌ Cannot send document: WhatsApp not connected');
    return;
  }

  try {
    await sock.sendMessage(jid, {
      document: fileBuffer,
      fileName: filename,
      mimetype: mimetype,
    });
  } catch (error) {
    console.error(`❌ Failed to send document to ${jid}:`, error);
  }
}
