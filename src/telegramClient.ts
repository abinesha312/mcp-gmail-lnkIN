/**
 * telegramClient.ts
 * Telegram Bot API tools — reads credentials from credentialStore.
 */
import axios from "axios";
import { getCredential } from "./credentialStore.js";

function base(): string {
  const token = getCredential("telegram", "bot_token");
  if (!token) throw new Error("Telegram not configured. Open the dashboard → Telegram → Configure.");
  return `https://api.telegram.org/bot${token}`;
}

async function tg(method: string, data?: Record<string, any>): Promise<any> {
  const res = await axios.post(`${base()}/${method}`, data);
  if (!res.data.ok) throw new Error(`Telegram API error: ${res.data.description}`);
  return res.data.result;
}

// ── Telegram tools ────────────────────────────────────────────────────────────
export async function telegramSendMessage(args: {
  chatId:     string | number;
  text:       string;
  parseMode?: "HTML" | "Markdown";
}) {
  return tg("sendMessage", { chat_id: args.chatId, text: args.text, parse_mode: args.parseMode });
}

export async function telegramGetUpdates(args: { limit?: number; offset?: number }) {
  return tg("getUpdates", { limit: args.limit || 10, offset: args.offset });
}

export async function telegramSendPhoto(args: {
  chatId:   string | number;
  photoUrl: string;
  caption?: string;
}) {
  return tg("sendPhoto", { chat_id: args.chatId, photo: args.photoUrl, caption: args.caption });
}

export async function telegramSendDocument(args: {
  chatId:      string | number;
  documentUrl: string;
  caption?:    string;
}) {
  return tg("sendDocument", { chat_id: args.chatId, document: args.documentUrl, caption: args.caption });
}

export async function telegramGetChatInfo(args: { chatId: string | number }) {
  return tg("getChat", { chat_id: args.chatId });
}

export async function telegramGetBotInfo() {
  return tg("getMe");
}

export async function telegramForwardMessage(args: {
  fromChatId: string | number;
  toChatId:   string | number;
  messageId:  number;
}) {
  return tg("forwardMessage", {
    from_chat_id: args.fromChatId,
    chat_id:      args.toChatId,
    message_id:   args.messageId,
  });
}

export async function telegramPinMessage(args: { chatId: string | number; messageId: number }) {
  return tg("pinChatMessage", { chat_id: args.chatId, message_id: args.messageId });
}

export async function telegramDeleteMessage(args: { chatId: string | number; messageId: number }) {
  return tg("deleteMessage", { chat_id: args.chatId, message_id: args.messageId });
}
