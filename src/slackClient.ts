/**
 * slackClient.ts
 * Slack Web API tools — reads credentials from credentialStore.
 * Base URL: https://slack.com/api/
 * Auth: Authorization: Bearer xoxb-YOUR-BOT-TOKEN
 * All methods are POST requests
 */
import axios from "axios";
import { getCredential } from "./credentialStore.js";

const BASE_URL = "https://slack.com/api";

function getHeaders(): Record<string, string> {
  const token = getCredential("slack", "bot_token");
  if (!token) throw new Error("Slack not configured. Open the dashboard → Slack → Configure.");
  return {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

async function slackRequest(method: string, data?: Record<string, any>): Promise<any> {
  const res = await axios.post(`${BASE_URL}/${method}`, data || {}, { headers: getHeaders() });
  if (!res.data.ok) {
    throw new Error(`Slack API error: ${res.data.error || "Unknown error"}`);
  }
  return res.data;
}

// ── Messaging ────────────────────────────────────────────────────────────────────
export async function slackPostMessage(args: {
  channel: string; // Channel ID or name (e.g., "#general" or "C1234567890")
  text?: string;
  blocks?: any[];
  attachments?: any[];
  thread_ts?: string; // Timestamp of parent message for threading
}): Promise<any> {
  return slackRequest("chat.postMessage", {
    channel: args.channel,
    text: args.text,
    blocks: args.blocks,
    attachments: args.attachments,
    thread_ts: args.thread_ts,
  });
}

export async function slackUpdateMessage(args: {
  channel: string;
  ts: string; // Message timestamp
  text?: string;
  blocks?: any[];
  attachments?: any[];
}): Promise<any> {
  return slackRequest("chat.update", {
    channel: args.channel,
    ts: args.ts,
    text: args.text,
    blocks: args.blocks,
    attachments: args.attachments,
  });
}

export async function slackDeleteMessage(args: {
  channel: string;
  ts: string; // Message timestamp
}): Promise<any> {
  return slackRequest("chat.delete", {
    channel: args.channel,
    ts: args.ts,
  });
}

export async function slackScheduleMessage(args: {
  channel: string;
  text: string;
  post_at: number; // Unix timestamp
  blocks?: any[];
}): Promise<any> {
  return slackRequest("chat.scheduleMessage", {
    channel: args.channel,
    text: args.text,
    post_at: args.post_at,
    blocks: args.blocks,
  });
}

export async function slackGetPermalink(args: {
  channel: string;
  message_ts: string;
}): Promise<any> {
  return slackRequest("chat.getPermalink", {
    channel: args.channel,
    message_ts: args.message_ts,
  });
}

// ── Conversations (Channels/DMs) ────────────────────────────────────────────────
export async function slackListConversations(args: {
  types?: string; // Comma-separated: "public_channel,private_channel,mpim,im"
  exclude_archived?: boolean;
  limit?: number;
  cursor?: string;
}): Promise<any> {
  return slackRequest("conversations.list", {
    types: args.types || "public_channel,private_channel",
    exclude_archived: args.exclude_archived !== false,
    limit: args.limit || 100,
    cursor: args.cursor,
  });
}

export async function slackGetConversationInfo(args: {
  channel: string;
}): Promise<any> {
  return slackRequest("conversations.info", {
    channel: args.channel,
  });
}

export async function slackCreateConversation(args: {
  name: string;
  is_private?: boolean;
}): Promise<any> {
  return slackRequest("conversations.create", {
    name: args.name,
    is_private: args.is_private || false,
  });
}

export async function slackGetConversationHistory(args: {
  channel: string;
  cursor?: string;
  limit?: number;
  oldest?: string; // Unix timestamp
  latest?: string; // Unix timestamp
}): Promise<any> {
  return slackRequest("conversations.history", {
    channel: args.channel,
    cursor: args.cursor,
    limit: args.limit || 100,
    oldest: args.oldest,
    latest: args.latest,
  });
}

export async function slackGetConversationReplies(args: {
  channel: string;
  ts: string; // Thread timestamp
  cursor?: string;
  limit?: number;
}): Promise<any> {
  return slackRequest("conversations.replies", {
    channel: args.channel,
    ts: args.ts,
    cursor: args.cursor,
    limit: args.limit || 100,
  });
}

export async function slackJoinConversation(args: {
  channel: string;
}): Promise<any> {
  return slackRequest("conversations.join", {
    channel: args.channel,
  });
}

export async function slackLeaveConversation(args: {
  channel: string;
}): Promise<any> {
  return slackRequest("conversations.leave", {
    channel: args.channel,
  });
}

// ── Users ────────────────────────────────────────────────────────────────────────
export async function slackListUsers(args: {
  cursor?: string;
  limit?: number;
}): Promise<any> {
  return slackRequest("users.list", {
    cursor: args.cursor,
    limit: args.limit || 100,
  });
}

export async function slackGetUserInfo(args: {
  user: string; // User ID
}): Promise<any> {
  return slackRequest("users.info", {
    user: args.user,
  });
}

export async function slackLookupUserByEmail(args: {
  email: string;
}): Promise<any> {
  return slackRequest("users.lookupByEmail", {
    email: args.email,
  });
}

// ── Files ────────────────────────────────────────────────────────────────────────
export async function slackUploadFile(args: {
  channels?: string; // Comma-separated channel IDs
  content?: string; // File contents as string
  filename?: string;
  title?: string;
  initial_comment?: string;
}): Promise<any> {
  return slackRequest("files.upload", {
    channels: args.channels,
    content: args.content,
    filename: args.filename,
    title: args.title,
    initial_comment: args.initial_comment,
  });
}

export async function slackListFiles(args: {
  channel?: string;
  user?: string;
  ts_from?: number;
  ts_to?: number;
  cursor?: string;
  limit?: number;
}): Promise<any> {
  return slackRequest("files.list", {
    channel: args.channel,
    user: args.user,
    ts_from: args.ts_from,
    ts_to: args.ts_to,
    cursor: args.cursor,
    limit: args.limit || 100,
  });
}

export async function slackGetFileInfo(args: {
  file: string; // File ID
}): Promise<any> {
  return slackRequest("files.info", {
    file: args.file,
  });
}

export async function slackDeleteFile(args: {
  file: string; // File ID
}): Promise<any> {
  return slackRequest("files.delete", {
    file: args.file,
  });
}

// ── Reactions ────────────────────────────────────────────────────────────────────
export async function slackAddReaction(args: {
  name: string; // Emoji name (without colons)
  channel: string;
  timestamp: string; // Message timestamp
}): Promise<any> {
  return slackRequest("reactions.add", {
    name: args.name,
    channel: args.channel,
    timestamp: args.timestamp,
  });
}

export async function slackRemoveReaction(args: {
  name: string;
  channel: string;
  timestamp: string;
}): Promise<any> {
  return slackRequest("reactions.remove", {
    name: args.name,
    channel: args.channel,
    timestamp: args.timestamp,
  });
}

// ── Search ────────────────────────────────────────────────────────────────────────
export async function slackSearchAll(args: {
  query: string;
  count?: number;
  page?: number;
  sort?: string; // "score" or "timestamp"
}): Promise<any> {
  return slackRequest("search.all", {
    query: args.query,
    count: args.count || 20,
    page: args.page || 1,
    sort: args.sort || "score",
  });
}

export async function slackSearchMessages(args: {
  query: string;
  count?: number;
  page?: number;
}): Promise<any> {
  return slackRequest("search.messages", {
    query: args.query,
    count: args.count || 20,
    page: args.page || 1,
  });
}

// ── Auth / Team ──────────────────────────────────────────────────────────────────
export async function slackTestAuth(): Promise<any> {
  return slackRequest("auth.test");
}

export async function slackGetTeamInfo(): Promise<any> {
  return slackRequest("team.info");
}
