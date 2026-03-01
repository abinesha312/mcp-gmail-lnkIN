/**
 * twitchClient.ts
 * Twitch Helix API tools — reads credentials from credentialStore.
 * Base URL: https://api.twitch.tv/helix
 * Auth: Authorization: Bearer YOUR_ACCESS_TOKEN
 * Required headers: Client-Id, Authorization
 */
import axios from "axios";
import { getCredential, getOAuthTokens, saveOAuthTokens } from "./credentialStore.js";

const BASE_URL = "https://api.twitch.tv/helix";
const TOKEN_URL = "https://id.twitch.tv/oauth2/token";

function getHeaders(): Record<string, string> {
  const clientId = getCredential("twitch", "client_id");
  const tokens = getOAuthTokens("twitch");
  const accessToken = tokens?.access_token || getCredential("twitch", "access_token");
  
  if (!clientId) throw new Error("Twitch not configured. Open the dashboard → Twitch → Configure.");
  if (!accessToken) throw new Error("Twitch access token not found. Complete OAuth flow or set access_token.");
  
  return {
    "Authorization": `Bearer ${accessToken}`,
    "Client-Id": clientId,
    "Content-Type": "application/json",
  };
}

async function twitchRequest(method: string, endpoint: string, data?: any, params?: any): Promise<any> {
  const config: any = {
    method,
    url: `${BASE_URL}${endpoint}`,
    headers: getHeaders(),
  };
  if (params) config.params = params;
  if (data && method !== "GET") config.data = data;
  const res = await axios(config);
  return res.data;
}

// ── Token Management ────────────────────────────────────────────────────────────
export async function twitchGetAppAccessToken(args: {
  clientId: string;
  clientSecret: string;
}): Promise<any> {
  const res = await axios.post(TOKEN_URL, null, {
    params: {
      client_id: args.clientId,
      client_secret: args.clientSecret,
      grant_type: "client_credentials",
    },
  });
  return res.data;
}

// ── Users ────────────────────────────────────────────────────────────────────────
export async function twitchGetUsers(args: {
  id?: string[];
  login?: string[];
}): Promise<any> {
  const params: any = {};
  if (args.id && args.id.length > 0) params.id = args.id;
  if (args.login && args.login.length > 0) params.login = args.login;
  return twitchRequest("GET", "/users", undefined, params);
}

export async function twitchGetUserFollows(args: {
  fromId?: string;
  toId?: string;
  first?: number;
  after?: string;
}): Promise<any> {
  const params: any = {};
  if (args.fromId) params.from_id = args.fromId;
  if (args.toId) params.to_id = args.toId;
  if (args.first) params.first = args.first;
  if (args.after) params.after = args.after;
  return twitchRequest("GET", "/users/follows", undefined, params);
}

export async function twitchUpdateUser(args: {
  description?: string;
}): Promise<any> {
  return twitchRequest("PUT", "/users", { description: args.description });
}

// ── Streams ────────────────────────────────────────────────────────────────────────
export async function twitchGetStreams(args: {
  userLogin?: string[];
  userId?: string[];
  gameId?: string[];
  type?: "all" | "live";
  first?: number;
  after?: string;
}): Promise<any> {
  const params: any = {};
  if (args.userLogin && args.userLogin.length > 0) params.user_login = args.userLogin;
  if (args.userId && args.userId.length > 0) params.user_id = args.userId;
  if (args.gameId && args.gameId.length > 0) params.game_id = args.gameId;
  if (args.type) params.type = args.type;
  if (args.first) params.first = args.first;
  if (args.after) params.after = args.after;
  return twitchRequest("GET", "/streams", undefined, params);
}

export async function twitchGetFollowedStreams(args: {
  userId: string;
  first?: number;
  after?: string;
}): Promise<any> {
  const params: any = { user_id: args.userId };
  if (args.first) params.first = args.first;
  if (args.after) params.after = args.after;
  return twitchRequest("GET", "/streams/followed", undefined, params);
}

// ── Channels ────────────────────────────────────────────────────────────────────────
export async function twitchGetChannelInfo(args: {
  broadcasterId: string;
}): Promise<any> {
  return twitchRequest("GET", "/channels", undefined, { broadcaster_id: args.broadcasterId });
}

export async function twitchUpdateChannel(args: {
  broadcasterId: string;
  gameId?: string;
  title?: string;
  delay?: number;
}): Promise<any> {
  return twitchRequest("PATCH", "/channels", {
    game_id: args.gameId,
    title: args.title,
    delay: args.delay,
  }, { broadcaster_id: args.broadcasterId });
}

export async function twitchGetChannelFollowers(args: {
  broadcasterId: string;
  first?: number;
  after?: string;
}): Promise<any> {
  const params: any = { broadcaster_id: args.broadcasterId };
  if (args.first) params.first = args.first;
  if (args.after) params.after = args.after;
  return twitchRequest("GET", "/channels/followers", undefined, params);
}

// ── Games / Categories ────────────────────────────────────────────────────────────
export async function twitchGetGames(args: {
  id?: string[];
  name?: string[];
}): Promise<any> {
  const params: any = {};
  if (args.id && args.id.length > 0) params.id = args.id;
  if (args.name && args.name.length > 0) params.name = args.name;
  return twitchRequest("GET", "/games", undefined, params);
}

export async function twitchGetTopGames(args: {
  first?: number;
  after?: string;
}): Promise<any> {
  const params: any = {};
  if (args.first) params.first = args.first;
  if (args.after) params.after = args.after;
  return twitchRequest("GET", "/games/top", undefined, params);
}

export async function twitchSearchCategories(args: {
  query: string;
  first?: number;
  after?: string;
}): Promise<any> {
  const params: any = { query: args.query };
  if (args.first) params.first = args.first;
  if (args.after) params.after = args.after;
  return twitchRequest("GET", "/search/categories", undefined, params);
}

export async function twitchSearchChannels(args: {
  query: string;
  first?: number;
  after?: string;
}): Promise<any> {
  const params: any = { query: args.query };
  if (args.first) params.first = args.first;
  if (args.after) params.after = args.after;
  return twitchRequest("GET", "/search/channels", undefined, params);
}

// ── Clips ────────────────────────────────────────────────────────────────────────
export async function twitchGetClips(args: {
  broadcasterId?: string;
  gameId?: string;
  id?: string[];
  first?: number;
  after?: string;
  startedAt?: string; // ISO 8601
  endedAt?: string; // ISO 8601
}): Promise<any> {
  const params: any = {};
  if (args.broadcasterId) params.broadcaster_id = args.broadcasterId;
  if (args.gameId) params.game_id = args.gameId;
  if (args.id && args.id.length > 0) params.id = args.id;
  if (args.first) params.first = args.first;
  if (args.after) params.after = args.after;
  if (args.startedAt) params.started_at = args.startedAt;
  if (args.endedAt) params.ended_at = args.endedAt;
  return twitchRequest("GET", "/clips", undefined, params);
}

export async function twitchCreateClip(args: {
  broadcasterId: string;
  hasDelay?: boolean;
}): Promise<any> {
  const params: any = { broadcaster_id: args.broadcasterId };
  if (args.hasDelay !== undefined) params.has_delay = args.hasDelay;
  return twitchRequest("POST", "/clips", undefined, params);
}

// ── Videos ────────────────────────────────────────────────────────────────────────
export async function twitchGetVideos(args: {
  id?: string[];
  userId?: string;
  gameId?: string;
  first?: number;
  after?: string;
  language?: string;
  period?: "all" | "day" | "week" | "month";
  sort?: "time" | "trending" | "views";
  type?: "all" | "upload" | "archive" | "highlight";
}): Promise<any> {
  const params: any = {};
  if (args.id && args.id.length > 0) params.id = args.id;
  if (args.userId) params.user_id = args.userId;
  if (args.gameId) params.game_id = args.gameId;
  if (args.first) params.first = args.first;
  if (args.after) params.after = args.after;
  if (args.language) params.language = args.language;
  if (args.period) params.period = args.period;
  if (args.sort) params.sort = args.sort;
  if (args.type) params.type = args.type;
  return twitchRequest("GET", "/videos", undefined, params);
}

export async function twitchDeleteVideo(args: {
  id: string[];
}): Promise<any> {
  return twitchRequest("DELETE", "/videos", undefined, { id: args.id });
}

// ── Chat ────────────────────────────────────────────────────────────────────────
export async function twitchGetChatEmotes(args: {
  broadcasterId: string;
}): Promise<any> {
  return twitchRequest("GET", "/chat/emotes", undefined, { broadcaster_id: args.broadcasterId });
}

export async function twitchGetGlobalChatEmotes(): Promise<any> {
  return twitchRequest("GET", "/chat/emotes/global");
}

export async function twitchGetChatBadges(args: {
  broadcasterId: string;
}): Promise<any> {
  return twitchRequest("GET", "/chat/badges", undefined, { broadcaster_id: args.broadcasterId });
}

export async function twitchGetChatSettings(args: {
  broadcasterId: string;
  moderatorId?: string;
}): Promise<any> {
  const params: any = { broadcaster_id: args.broadcasterId };
  if (args.moderatorId) params.moderator_id = args.moderatorId;
  return twitchRequest("GET", "/chat/settings", undefined, params);
}
