/**
 * youtubeClient.ts
 * YouTube Data API tools — reads credentials from credentialStore.
 * Uses OAuth if available, falls back to API key for public queries.
 */
import { google } from "googleapis";
import { getCredential, getOAuthTokens, saveOAuthTokens } from "./credentialStore.js";

function buildClient() {
  const apiKey   = getCredential("google", "youtube_api_key");
  const clientId = getCredential("google", "client_id");
  const clientSecret = getCredential("google", "client_secret");
  const tokens   = getOAuthTokens("google");

  // Prefer OAuth (needed for user-specific endpoints like subscriptions)
  if (clientId && clientSecret && tokens) {
    const redirectUri = getCredential("google", "redirect_uri") || "http://localhost:3001/auth/google/callback";
    const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    oauth2.setCredentials(tokens);
    oauth2.on("tokens", (t) => saveOAuthTokens("google", { ...tokens, ...t }));
    return google.youtube({ version: "v3", auth: oauth2 as any });
  }

  // API key fallback for public search
  if (apiKey) return google.youtube({ version: "v3", key: apiKey } as any);

  throw new Error("YouTube not configured. Add Google OAuth or a YouTube API Key in the dashboard.");
}

// ── YouTube tools ─────────────────────────────────────────────────────────────
export async function youtubeSearch(args: {
  query:      string;
  maxResults?: number;
  type?:      "video" | "channel" | "playlist";
}) {
  const yt  = buildClient();
  const res = await (yt.search.list as any)({
    part:       ["snippet"],
    q:          args.query,
    maxResults: args.maxResults || 10,
    type:       [args.type || "video"],
  });
  return (res.data.items || []).map((item: any) => ({
    id:          item.id?.videoId || item.id?.channelId || item.id?.playlistId,
    title:       item.snippet?.title,
    description: item.snippet?.description,
    channel:     item.snippet?.channelTitle,
    publishedAt: item.snippet?.publishedAt,
    thumbnail:   item.snippet?.thumbnails?.medium?.url,
  }));
}

export async function youtubeGetVideoDetails(args: { videoId: string }) {
  const yt  = buildClient();
  const res = await (yt.videos.list as any)({
    part: ["snippet", "statistics", "contentDetails"],
    id:   [args.videoId],
  });
  return res.data.items?.[0] || null;
}

export async function youtubeGetMySubscriptions(args: { maxResults?: number }) {
  const yt  = buildClient();
  const res = await (yt.subscriptions.list as any)({
    part:       ["snippet"],
    mine:       true,
    maxResults: args.maxResults || 20,
  });
  return res.data.items || [];
}

export async function youtubeGetMyPlaylists(args: { maxResults?: number }) {
  const yt  = buildClient();
  const res = await (yt.playlists.list as any)({
    part:       ["snippet", "contentDetails"],
    mine:       true,
    maxResults: args.maxResults || 20,
  });
  return res.data.items || [];
}

export async function youtubeGetChannelDetails(args: { channelId: string }) {
  const yt  = buildClient();
  const res = await (yt.channels.list as any)({
    part: ["snippet", "statistics"],
    id:   [args.channelId],
  });
  return res.data.items?.[0] || null;
}
