/**
 * discordClient.ts
 * Discord REST API tools — reads credentials from credentialStore.
 * Base URL: https://discord.com/api/v10
 * Auth: Authorization: Bot YOUR_BOT_TOKEN
 */
import axios from "axios";
import { getCredential } from "./credentialStore.js";

const BASE_URL = "https://discord.com/api/v10";

function getHeaders(): Record<string, string> {
  const token = getCredential("discord", "bot_token");
  if (!token) throw new Error("Discord not configured. Open the dashboard → Discord → Configure.");
  return {
    "Authorization": `Bot ${token}`,
    "Content-Type": "application/json",
  };
}

async function discordRequest(method: string, endpoint: string, data?: any): Promise<any> {
  const config: any = {
    method,
    url: `${BASE_URL}${endpoint}`,
    headers: getHeaders(),
  };
  if (data) {
    if (method === "GET") {
      config.params = data;
    } else {
      config.data = data;
    }
  }
  const res = await axios(config);
  return res.data;
}

// ── Messages ─────────────────────────────────────────────────────────────────────
export async function discordGetMessages(args: {
  channelId: string;
  limit?: number;
  before?: string;
  after?: string;
  around?: string;
}): Promise<any> {
  const params: any = {};
  if (args.limit) params.limit = args.limit;
  if (args.before) params.before = args.before;
  if (args.after) params.after = args.after;
  if (args.around) params.around = args.around;
  return discordRequest("GET", `/channels/${args.channelId}/messages`, params);
}

export async function discordGetMessage(args: {
  channelId: string;
  messageId: string;
}): Promise<any> {
  return discordRequest("GET", `/channels/${args.channelId}/messages/${args.messageId}`);
}

export async function discordSendMessage(args: {
  channelId: string;
  content?: string;
  embeds?: any[];
  components?: any[];
  files?: any[];
  tts?: boolean;
}): Promise<any> {
  return discordRequest("POST", `/channels/${args.channelId}/messages`, {
    content: args.content,
    embeds: args.embeds,
    components: args.components,
    files: args.files,
    tts: args.tts,
  });
}

export async function discordEditMessage(args: {
  channelId: string;
  messageId: string;
  content?: string;
  embeds?: any[];
  components?: any[];
}): Promise<any> {
  return discordRequest("PATCH", `/channels/${args.channelId}/messages/${args.messageId}`, {
    content: args.content,
    embeds: args.embeds,
    components: args.components,
  });
}

export async function discordDeleteMessage(args: {
  channelId: string;
  messageId: string;
}): Promise<any> {
  return discordRequest("DELETE", `/channels/${args.channelId}/messages/${args.messageId}`);
}

export async function discordBulkDeleteMessages(args: {
  channelId: string;
  messageIds: string[];
}): Promise<any> {
  return discordRequest("POST", `/channels/${args.channelId}/messages/bulk-delete`, {
    messages: args.messageIds,
  });
}

// ── Reactions ────────────────────────────────────────────────────────────────────
export async function discordAddReaction(args: {
  channelId: string;
  messageId: string;
  emoji: string; // URL-encoded emoji or emoji name
}): Promise<any> {
  const emojiEncoded = encodeURIComponent(args.emoji);
  return discordRequest("PUT", `/channels/${args.channelId}/messages/${args.messageId}/reactions/${emojiEncoded}/@me`);
}

export async function discordRemoveReaction(args: {
  channelId: string;
  messageId: string;
  emoji: string;
  userId?: string; // If not provided, removes bot's reaction
}): Promise<any> {
  const emojiEncoded = encodeURIComponent(args.emoji);
  const path = args.userId
    ? `/channels/${args.channelId}/messages/${args.messageId}/reactions/${emojiEncoded}/${args.userId}`
    : `/channels/${args.channelId}/messages/${args.messageId}/reactions/${emojiEncoded}/@me`;
  return discordRequest("DELETE", path);
}

export async function discordGetReactions(args: {
  channelId: string;
  messageId: string;
  emoji: string;
  limit?: number;
  after?: string;
}): Promise<any> {
  const emojiEncoded = encodeURIComponent(args.emoji);
  const params: any = {};
  if (args.limit) params.limit = args.limit;
  if (args.after) params.after = args.after;
  return discordRequest("GET", `/channels/${args.channelId}/messages/${args.messageId}/reactions/${emojiEncoded}`, params);
}

// ── Channels ────────────────────────────────────────────────────────────────────
export async function discordGetChannel(args: { channelId: string }): Promise<any> {
  return discordRequest("GET", `/channels/${args.channelId}`);
}

export async function discordGetGuildChannels(args: { guildId: string }): Promise<any> {
  return discordRequest("GET", `/guilds/${args.guildId}/channels`);
}

export async function discordCreateChannel(args: {
  guildId: string;
  name: string;
  type?: number;
  topic?: string;
  nsfw?: boolean;
}): Promise<any> {
  return discordRequest("POST", `/guilds/${args.guildId}/channels`, {
    name: args.name,
    type: args.type,
    topic: args.topic,
    nsfw: args.nsfw,
  });
}

// ── Guilds (Servers) ────────────────────────────────────────────────────────────
export async function discordGetGuild(args: { guildId: string }): Promise<any> {
  return discordRequest("GET", `/guilds/${args.guildId}`);
}

export async function discordGetGuildMembers(args: {
  guildId: string;
  limit?: number;
  after?: string;
}): Promise<any> {
  const params: any = {};
  if (args.limit) params.limit = args.limit;
  if (args.after) params.after = args.after;
  return discordRequest("GET", `/guilds/${args.guildId}/members`, params);
}

export async function discordGetGuildMember(args: {
  guildId: string;
  userId: string;
}): Promise<any> {
  return discordRequest("GET", `/guilds/${args.guildId}/members/${args.userId}`);
}

// ── Users ────────────────────────────────────────────────────────────────────────
export async function discordGetCurrentUser(): Promise<any> {
  return discordRequest("GET", `/users/@me`);
}

export async function discordGetUser(args: { userId: string }): Promise<any> {
  return discordRequest("GET", `/users/${args.userId}`);
}

export async function discordGetUserGuilds(): Promise<any> {
  return discordRequest("GET", `/users/@me/guilds`);
}
