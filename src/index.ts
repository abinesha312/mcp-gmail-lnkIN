#!/usr/bin/env node
/**
 * index.ts — MCP Unified Server (SINGLE ENTRY POINT)
 * ─────────────────────────────────────────────────────────────
 * ALL tools from every service are registered here.
 * Credentials are read from the AES-256-GCM encrypted SQLite store.
 *
 * Services:
 *   Gmail        → emailUtils.ts + labelManager.ts + filterManager.ts
 *   LinkedIn     → linkedinClient.ts
 *   Google Drive → googleDriveClient.ts
 *   Google Cal   → googleCalClient.ts
 *   YouTube      → youtubeClient.ts
 *   Notion       → notionClient.ts
 *   Telegram     → telegramClient.ts
 *   WhatsApp     → whatsappClient.ts
 *   Discord      → discordClient.ts
 *   Slack        → slackClient.ts
 *   Twitch       → twitchClient.ts
 *   GitHub       → githubClient.ts
 * ─────────────────────────────────────────────────────────────
 */
import { McpServer }          from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z }                  from "zod";
import * as dotenv            from "dotenv";
dotenv.config();

// ── Lazy imports — one module per service ─────────────────────────────────────
// (lazy so a missing credential for one service never crashes the whole server)
const Drive    = () => import("./googleDriveClient.js");
const Cal      = () => import("./googleCalClient.js");
const YT       = () => import("./youtubeClient.js");
const Notion   = () => import("./notionClient.js");
const TG       = () => import("./telegramClient.js");
const WA       = () => import("./whatsappClient.js");
const LinkedIn = () => import("./linkedinClient.js");
const Discord  = () => import("./discordClient.js");
const Slack    = () => import("./slackClient.js");
const Twitch   = () => import("./twitchClient.js");
const GitHub   = () => import("./githubClient.js");

// NOTE: Gmail tools (sendEmail, readEmail, etc.) live in the existing modules:
//   emailUtils.ts / labelManager.ts / filterManager.ts
// Those are imported directly because they already existed in this repo.
// We import them at the top (non-lazy) since they were always here.
import * as EmailUtils   from "./emailUtils.js";
import * as LabelMgr     from "./labelManager.js";
import * as FilterMgr    from "./filterManager.js";

// ── Safe wrapper — tool errors return as text, never crash the server ─────────
function safe(fn: () => Promise<any>) {
  return fn()
    .then((result) => ({
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    }))
    .catch((err: Error) => ({
      content: [{ type: "text" as const, text: `❌ Error: ${err.message}` }],
      isError: true,
    }));
}

// ── MCP Server ────────────────────────────────────────────────────────────────
const server = new McpServer({
  name:    "mcp-unified",
  version: "2.0.0",
});

// ════════════════════════════════════════════════════════════════════════════
//  GMAIL  (existing tools from emailUtils / labelManager / filterManager)
// ════════════════════════════════════════════════════════════════════════════

server.tool(
  "sendEmail",
  "Send an email via Gmail",
  {
    to:      z.array(z.string()).describe("Recipient email addresses"),
    subject: z.string(),
    body:    z.string(),
    cc:      z.array(z.string()).optional(),
    bcc:     z.array(z.string()).optional(),
    isHtml:  z.boolean().optional().default(false),
  },
  (args) => safe(() => EmailUtils.sendEmail(args))
);

server.tool(
  "draftEmail",
  "Create a Gmail draft",
  {
    to:      z.array(z.string()),
    subject: z.string(),
    body:    z.string(),
  },
  (args) => safe(() => EmailUtils.draftEmail(args))
);

server.tool(
  "readEmail",
  "Read a Gmail email by message ID",
  { messageId: z.string() },
  (args) => safe(() => EmailUtils.readEmail(args))
);

server.tool(
  "searchEmails",
  "Search Gmail using query syntax (e.g. 'from:user@example.com is:unread')",
  {
    query:      z.string(),
    maxResults: z.number().optional().default(10),
  },
  (args) => safe(() => EmailUtils.searchEmails(args))
);

server.tool(
  "modifyEmail",
  "Add or remove Gmail labels from a message",
  {
    messageId:      z.string(),
    addLabelIds:    z.array(z.string()).optional(),
    removeLabelIds: z.array(z.string()).optional(),
  },
  (args) => safe(() => EmailUtils.modifyEmail(args))
);

server.tool(
  "deleteEmail",
  "Permanently delete a Gmail message",
  { messageId: z.string() },
  (args) => safe(() => EmailUtils.deleteEmail(args))
);

server.tool(
  "batchModifyEmails",
  "Modify labels on multiple Gmail messages at once",
  {
    messageIds:     z.array(z.string()),
    addLabelIds:    z.array(z.string()).optional(),
    removeLabelIds: z.array(z.string()).optional(),
  },
  (args) => safe(() => EmailUtils.batchModifyEmails(args))
);

server.tool(
  "batchDeleteEmails",
  "Delete multiple Gmail messages at once",
  { messageIds: z.array(z.string()) },
  (args) => safe(() => EmailUtils.batchDeleteEmails(args))
);

server.tool(
  "downloadAttachment",
  "Download a Gmail email attachment",
  { messageId: z.string(), attachmentId: z.string() },
  (args) => safe(() => EmailUtils.downloadAttachment(args))
);

// ── Gmail Labels ──────────────────────────────────────────────────────────────

server.tool(
  "listEmailLabels",
  "List all Gmail labels",
  {},
  () => safe(() => LabelMgr.listEmailLabels())
);

server.tool(
  "createLabel",
  "Create a new Gmail label",
  {
    name:                 z.string(),
    labelListVisibility?: z.string().optional(),
    messageListVisibility?: z.string().optional(),
  } as any,
  (args) => safe(() => LabelMgr.createLabel(args))
);

server.tool(
  "updateLabel",
  "Update an existing Gmail label",
  {
    labelId: z.string(),
    name:    z.string().optional(),
  },
  (args) => safe(() => LabelMgr.updateLabel(args))
);

server.tool(
  "deleteLabel",
  "Delete a Gmail label",
  { labelId: z.string() },
  (args) => safe(() => LabelMgr.deleteLabel(args))
);

server.tool(
  "getOrCreateLabel",
  "Get an existing Gmail label by name, or create it if it doesn't exist",
  { name: z.string() },
  (args) => safe(() => LabelMgr.getOrCreateLabel(args))
);

// ── Gmail Filters ─────────────────────────────────────────────────────────────

server.tool(
  "createFilter",
  "Create a Gmail filter",
  {
    criteria:  z.record(z.any()).describe("Filter criteria object"),
    action:    z.record(z.any()).describe("Filter action object"),
  },
  (args) => safe(() => FilterMgr.createFilter(args))
);

server.tool(
  "listFilters",
  "List all Gmail filters",
  {},
  () => safe(() => FilterMgr.listFilters())
);

server.tool(
  "getFilter",
  "Get details of a specific Gmail filter",
  { filterId: z.string() },
  (args) => safe(() => FilterMgr.getFilter(args))
);

server.tool(
  "deleteFilter",
  "Delete a Gmail filter",
  { filterId: z.string() },
  (args) => safe(() => FilterMgr.deleteFilter(args))
);

server.tool(
  "createFilterFromTemplate",
  "Create a Gmail filter from a pre-defined template",
  {
    template:   z.string().describe("Template name: fromSender | toRecipient | hasWords | subject"),
    parameters: z.record(z.any()),
  },
  (args) => safe(() => FilterMgr.createFilterFromTemplate(args))
);

// ════════════════════════════════════════════════════════════════════════════
//  LINKEDIN  (existing linkedinClient.ts)
// ════════════════════════════════════════════════════════════════════════════

server.tool(
  "getFeedPosts",
  "Get LinkedIn home feed posts",
  { limit: z.number().optional().default(10) },
  (args) => safe(async () => { const m = await LinkedIn(); return m.getFeedPosts(args); })
);

server.tool(
  "searchJobs",
  "Search for jobs on LinkedIn",
  {
    keywords: z.string(),
    location: z.string().optional(),
    limit:    z.number().optional().default(10),
    remote:   z.boolean().optional(),
  },
  (args) => safe(async () => { const m = await LinkedIn(); return m.searchJobs(args); })
);

server.tool(
  "searchPeople",
  "Search people on LinkedIn",
  {
    keywords: z.string(),
    limit:    z.number().optional().default(10),
  },
  (args) => safe(async () => { const m = await LinkedIn(); return m.searchPeople(args); })
);

server.tool(
  "getLinkedInProfile",
  "Get a LinkedIn profile (leave publicId empty for your own profile)",
  { publicId: z.string().optional() },
  (args) => safe(async () => { const m = await LinkedIn(); return m.getProfile(args); })
);

// ════════════════════════════════════════════════════════════════════════════
//  GOOGLE DRIVE
// ════════════════════════════════════════════════════════════════════════════

server.tool(
  "driveListFiles",
  "List files in Google Drive",
  {
    query:      z.string().optional().describe("Drive query e.g. \"name contains 'report'\""),
    maxResults: z.number().optional().default(20),
    folderId:   z.string().optional(),
  },
  (args) => safe(async () => { const m = await Drive(); return m.driveListFiles(args); })
);

server.tool(
  "driveGetFile",
  "Get Google Drive file metadata by file ID",
  { fileId: z.string() },
  (args) => safe(async () => { const m = await Drive(); return m.driveGetFile(args); })
);

server.tool(
  "driveCreateFolder",
  "Create a folder in Google Drive",
  {
    name:     z.string(),
    parentId: z.string().optional(),
  },
  (args) => safe(async () => { const m = await Drive(); return m.driveCreateFolder(args); })
);

server.tool(
  "driveMoveFile",
  "Move a file to a different folder in Google Drive",
  {
    fileId:      z.string(),
    newParentId: z.string(),
  },
  (args) => safe(async () => { const m = await Drive(); return m.driveMoveFile(args); })
);

server.tool(
  "driveDeleteFile",
  "Delete a file from Google Drive",
  { fileId: z.string() },
  (args) => safe(async () => { const m = await Drive(); return m.driveDeleteFile(args); })
);

server.tool(
  "driveShareFile",
  "Share a Google Drive file with a user",
  {
    fileId: z.string(),
    email:  z.string(),
    role:   z.enum(["reader", "writer", "commenter"]).default("reader"),
  },
  (args) => safe(async () => { const m = await Drive(); return m.driveShareFile(args); })
);

// ════════════════════════════════════════════════════════════════════════════
//  GOOGLE CALENDAR
// ════════════════════════════════════════════════════════════════════════════

server.tool(
  "calendarListEvents",
  "List upcoming Google Calendar events",
  {
    calendarId: z.string().optional().default("primary"),
    maxResults: z.number().optional().default(10),
    timeMin:    z.string().optional().describe("ISO datetime — defaults to now"),
    timeMax:    z.string().optional().describe("ISO datetime"),
  },
  (args) => safe(async () => { const m = await Cal(); return m.calendarListEvents(args); })
);

server.tool(
  "calendarCreateEvent",
  "Create a Google Calendar event",
  {
    summary:     z.string(),
    start:       z.string().describe("ISO datetime e.g. 2026-03-01T10:00:00"),
    end:         z.string().describe("ISO datetime"),
    description: z.string().optional(),
    location:    z.string().optional(),
    attendees:   z.array(z.string()).optional(),
    calendarId:  z.string().optional().default("primary"),
    timezone:    z.string().optional().default("UTC"),
  },
  (args) => safe(async () => { const m = await Cal(); return m.calendarCreateEvent(args); })
);

server.tool(
  "calendarUpdateEvent",
  "Update an existing Google Calendar event",
  {
    eventId:     z.string(),
    summary:     z.string().optional(),
    start:       z.string().optional(),
    end:         z.string().optional(),
    description: z.string().optional(),
    calendarId:  z.string().optional().default("primary"),
  },
  (args) => safe(async () => { const m = await Cal(); return m.calendarUpdateEvent(args); })
);

server.tool(
  "calendarDeleteEvent",
  "Delete a Google Calendar event",
  {
    eventId:    z.string(),
    calendarId: z.string().optional().default("primary"),
  },
  (args) => safe(async () => { const m = await Cal(); return m.calendarDeleteEvent(args); })
);

server.tool(
  "calendarListCalendars",
  "List all Google Calendars in this account",
  {},
  () => safe(async () => { const m = await Cal(); return m.calendarListCalendars(); })
);

// ════════════════════════════════════════════════════════════════════════════
//  YOUTUBE
// ════════════════════════════════════════════════════════════════════════════

server.tool(
  "youtubeSearch",
  "Search YouTube for videos, channels, or playlists",
  {
    query:      z.string(),
    maxResults: z.number().optional().default(10),
    type:       z.enum(["video", "channel", "playlist"]).optional().default("video"),
  },
  (args) => safe(async () => { const m = await YT(); return m.youtubeSearch(args); })
);

server.tool(
  "youtubeGetVideoDetails",
  "Get YouTube video details including stats and content info",
  { videoId: z.string() },
  (args) => safe(async () => { const m = await YT(); return m.youtubeGetVideoDetails(args); })
);

server.tool(
  "youtubeGetMySubscriptions",
  "Get your YouTube channel subscriptions (OAuth required)",
  { maxResults: z.number().optional().default(20) },
  (args) => safe(async () => { const m = await YT(); return m.youtubeGetMySubscriptions(args); })
);

server.tool(
  "youtubeGetMyPlaylists",
  "Get your YouTube playlists (OAuth required)",
  { maxResults: z.number().optional().default(20) },
  (args) => safe(async () => { const m = await YT(); return m.youtubeGetMyPlaylists(args); })
);

server.tool(
  "youtubeGetChannelDetails",
  "Get details and statistics for a YouTube channel",
  { channelId: z.string() },
  (args) => safe(async () => { const m = await YT(); return m.youtubeGetChannelDetails(args); })
);

// ════════════════════════════════════════════════════════════════════════════
//  NOTION
// ════════════════════════════════════════════════════════════════════════════

server.tool(
  "notionSearchPages",
  "Search Notion pages and databases",
  {
    query:      z.string(),
    maxResults: z.number().optional().default(10),
  },
  (args) => safe(async () => { const m = await Notion(); return m.notionSearchPages(args); })
);

server.tool(
  "notionGetPage",
  "Get a Notion page with all its content blocks",
  { pageId: z.string() },
  (args) => safe(async () => { const m = await Notion(); return m.notionGetPage(args); })
);

server.tool(
  "notionCreatePage",
  "Create a new Notion page inside a parent page or database",
  {
    title:        z.string(),
    content:      z.string().optional(),
    parentPageId: z.string().optional(),
    databaseId:   z.string().optional(),
    properties:   z.record(z.any()).optional(),
  },
  (args) => safe(async () => { const m = await Notion(); return m.notionCreatePage(args); })
);

server.tool(
  "notionUpdatePage",
  "Update a Notion page's properties",
  {
    pageId:     z.string(),
    properties: z.record(z.any()),
  },
  (args) => safe(async () => { const m = await Notion(); return m.notionUpdatePage(args); })
);

server.tool(
  "notionAppendBlock",
  "Append a content block to a Notion page",
  {
    blockId: z.string(),
    content: z.string(),
    type:    z.string().optional().default("paragraph")
              .describe("paragraph | heading_1 | heading_2 | bulleted_list_item | numbered_list_item | to_do | quote | code"),
  },
  (args) => safe(async () => { const m = await Notion(); return m.notionAppendBlock(args); })
);

server.tool(
  "notionQueryDatabase",
  "Query a Notion database with optional filters and sorts",
  {
    databaseId: z.string(),
    filter:     z.any().optional(),
    sorts:      z.array(z.any()).optional(),
    maxResults: z.number().optional().default(20),
  },
  (args) => safe(async () => { const m = await Notion(); return m.notionQueryDatabase(args); })
);

server.tool(
  "notionListDatabases",
  "List all Notion databases the integration has access to",
  {},
  () => safe(async () => { const m = await Notion(); return m.notionListDatabases(); })
);

// ════════════════════════════════════════════════════════════════════════════
//  TELEGRAM
// ════════════════════════════════════════════════════════════════════════════

server.tool(
  "telegramSendMessage",
  "Send a Telegram message to a chat or user",
  {
    chatId:    z.union([z.string(), z.number()]).describe("Chat ID or @username"),
    text:      z.string(),
    parseMode: z.enum(["HTML", "Markdown"]).optional(),
  },
  (args) => safe(async () => { const m = await TG(); return m.telegramSendMessage(args); })
);

server.tool(
  "telegramGetUpdates",
  "Get recent Telegram updates (incoming messages)",
  {
    limit:  z.number().optional().default(10),
    offset: z.number().optional(),
  },
  (args) => safe(async () => { const m = await TG(); return m.telegramGetUpdates(args); })
);

server.tool(
  "telegramSendPhoto",
  "Send a photo to a Telegram chat",
  {
    chatId:   z.union([z.string(), z.number()]),
    photoUrl: z.string(),
    caption:  z.string().optional(),
  },
  (args) => safe(async () => { const m = await TG(); return m.telegramSendPhoto(args); })
);

server.tool(
  "telegramSendDocument",
  "Send a document/file to a Telegram chat",
  {
    chatId:      z.union([z.string(), z.number()]),
    documentUrl: z.string(),
    caption:     z.string().optional(),
  },
  (args) => safe(async () => { const m = await TG(); return m.telegramSendDocument(args); })
);

server.tool(
  "telegramGetChatInfo",
  "Get information about a Telegram chat",
  { chatId: z.union([z.string(), z.number()]) },
  (args) => safe(async () => { const m = await TG(); return m.telegramGetChatInfo(args); })
);

server.tool(
  "telegramGetBotInfo",
  "Get info about the configured Telegram bot",
  {},
  () => safe(async () => { const m = await TG(); return m.telegramGetBotInfo(); })
);

server.tool(
  "telegramForwardMessage",
  "Forward a Telegram message to another chat",
  {
    fromChatId: z.union([z.string(), z.number()]),
    toChatId:   z.union([z.string(), z.number()]),
    messageId:  z.number(),
  },
  (args) => safe(async () => { const m = await TG(); return m.telegramForwardMessage(args); })
);

server.tool(
  "telegramPinMessage",
  "Pin a message in a Telegram chat",
  {
    chatId:    z.union([z.string(), z.number()]),
    messageId: z.number(),
  },
  (args) => safe(async () => { const m = await TG(); return m.telegramPinMessage(args); })
);

server.tool(
  "telegramDeleteMessage",
  "Delete a message from a Telegram chat",
  {
    chatId:    z.union([z.string(), z.number()]),
    messageId: z.number(),
  },
  (args) => safe(async () => { const m = await TG(); return m.telegramDeleteMessage(args); })
);

// ════════════════════════════════════════════════════════════════════════════
//  WHATSAPP
// ════════════════════════════════════════════════════════════════════════════

server.tool(
  "whatsappSendMessage",
  "Send a WhatsApp message (via Twilio sandbox or Meta Cloud API)",
  {
    to:      z.string().describe("Phone number with country code e.g. +14155238886"),
    message: z.string(),
  },
  (args) => safe(async () => { const m = await WA(); return m.whatsappSendMessage(args); })
);

server.tool(
  "whatsappSendTemplate",
  "Send a WhatsApp template message (Meta Cloud API only)",
  {
    to:           z.string(),
    templateName: z.string(),
    languageCode: z.string().optional().default("en_US"),
    components:   z.array(z.any()).optional(),
  },
  (args) => safe(async () => { const m = await WA(); return m.whatsappSendTemplate(args); })
);

server.tool(
  "whatsappGetMessages",
  "Get recent WhatsApp message history (Twilio only)",
  { limit: z.number().optional().default(20) },
  (args) => safe(async () => { const m = await WA(); return m.whatsappGetMessages(args); })
);

// ════════════════════════════════════════════════════════════════════════════
//  DISCORD
// ════════════════════════════════════════════════════════════════════════════

server.tool(
  "discordSendMessage",
  "Send a message to a Discord channel",
  {
    channelId: z.string().describe("Discord channel ID"),
    content: z.string().optional().describe("Message content"),
    embeds: z.array(z.any()).optional(),
    components: z.array(z.any()).optional(),
    tts: z.boolean().optional(),
  },
  (args) => safe(async () => { const m = await Discord(); return m.discordSendMessage(args); })
);

server.tool(
  "discordGetMessages",
  "Get messages from a Discord channel",
  {
    channelId: z.string(),
    limit: z.number().optional().default(50),
    before: z.string().optional(),
    after: z.string().optional(),
  },
  (args) => safe(async () => { const m = await Discord(); return m.discordGetMessages(args); })
);

server.tool(
  "discordGetChannel",
  "Get Discord channel information",
  { channelId: z.string() },
  (args) => safe(async () => { const m = await Discord(); return m.discordGetChannel(args); })
);

server.tool(
  "discordGetGuildChannels",
  "List all channels in a Discord guild (server)",
  { guildId: z.string() },
  (args) => safe(async () => { const m = await Discord(); return m.discordGetGuildChannels(args); })
);

server.tool(
  "discordGetCurrentUser",
  "Get current Discord bot user information",
  {},
  () => safe(async () => { const m = await Discord(); return m.discordGetCurrentUser(); })
);

// ════════════════════════════════════════════════════════════════════════════
//  SLACK
// ════════════════════════════════════════════════════════════════════════════

server.tool(
  "slackPostMessage",
  "Send a message to a Slack channel",
  {
    channel: z.string().describe("Channel ID or name (e.g., '#general' or 'C1234567890')"),
    text: z.string().optional(),
    blocks: z.array(z.any()).optional(),
    thread_ts: z.string().optional().describe("Thread timestamp for replies"),
  },
  (args) => safe(async () => { const m = await Slack(); return m.slackPostMessage(args); })
);

server.tool(
  "slackListConversations",
  "List all Slack conversations (channels)",
  {
    types: z.string().optional().describe("Comma-separated: 'public_channel,private_channel,mpim,im'"),
    exclude_archived: z.boolean().optional().default(true),
    limit: z.number().optional().default(100),
  },
  (args) => safe(async () => { const m = await Slack(); return m.slackListConversations(args); })
);

server.tool(
  "slackGetConversationHistory",
  "Get message history from a Slack channel",
  {
    channel: z.string(),
    limit: z.number().optional().default(100),
    oldest: z.string().optional().describe("Unix timestamp"),
    latest: z.string().optional().describe("Unix timestamp"),
  },
  (args) => safe(async () => { const m = await Slack(); return m.slackGetConversationHistory(args); })
);

server.tool(
  "slackListUsers",
  "List all users in Slack workspace",
  {
    limit: z.number().optional().default(100),
  },
  (args) => safe(async () => { const m = await Slack(); return m.slackListUsers(args); })
);

server.tool(
  "slackTestAuth",
  "Test Slack authentication and get bot info",
  {},
  () => safe(async () => { const m = await Slack(); return m.slackTestAuth(); })
);

// ════════════════════════════════════════════════════════════════════════════
//  TWITCH
// ════════════════════════════════════════════════════════════════════════════

server.tool(
  "twitchGetUsers",
  "Get Twitch user information by ID or login",
  {
    id: z.array(z.string()).optional(),
    login: z.array(z.string()).optional(),
  },
  (args) => safe(async () => { const m = await Twitch(); return m.twitchGetUsers(args); })
);

server.tool(
  "twitchGetStreams",
  "Get Twitch streams",
  {
    userLogin: z.array(z.string()).optional(),
    userId: z.array(z.string()).optional(),
    gameId: z.array(z.string()).optional(),
    type: z.enum(["all", "live"]).optional(),
    first: z.number().optional().default(20),
  },
  (args) => safe(async () => { const m = await Twitch(); return m.twitchGetStreams(args); })
);

server.tool(
  "twitchGetChannelInfo",
  "Get Twitch channel information",
  { broadcasterId: z.string() },
  (args) => safe(async () => { const m = await Twitch(); return m.twitchGetChannelInfo(args); })
);

server.tool(
  "twitchSearchChannels",
  "Search Twitch channels",
  {
    query: z.string(),
    first: z.number().optional().default(20),
  },
  (args) => safe(async () => { const m = await Twitch(); return m.twitchSearchChannels(args); })
);

server.tool(
  "twitchGetTopGames",
  "Get top games on Twitch",
  {
    first: z.number().optional().default(20),
  },
  (args) => safe(async () => { const m = await Twitch(); return m.twitchGetTopGames(args); })
);

// ════════════════════════════════════════════════════════════════════════════
//  GITHUB
// ════════════════════════════════════════════════════════════════════════════

server.tool(
  "githubGetUserRepos",
  "List GitHub repositories for authenticated user",
  {
    type: z.enum(["all", "owner", "member"]).optional(),
    sort: z.enum(["created", "updated", "pushed", "full_name"]).optional(),
    perPage: z.number().optional().default(30),
    page: z.number().optional().default(1),
  },
  (args) => safe(async () => { const m = await GitHub(); return m.githubGetUserRepos(args); })
);

server.tool(
  "githubGetRepo",
  "Get GitHub repository information",
  {
    owner: z.string(),
    repo: z.string(),
  },
  (args) => safe(async () => { const m = await GitHub(); return m.githubGetRepo(args); })
);

server.tool(
  "githubCreateRepo",
  "Create a new GitHub repository",
  {
    name: z.string(),
    description: z.string().optional(),
    private: z.boolean().optional().default(false),
    hasIssues: z.boolean().optional().default(true),
  },
  (args) => safe(async () => { const m = await GitHub(); return m.githubCreateRepo(args); })
);

server.tool(
  "githubGetIssues",
  "List GitHub issues for a repository",
  {
    owner: z.string(),
    repo: z.string(),
    state: z.enum(["open", "closed", "all"]).optional().default("open"),
    labels: z.string().optional(),
    perPage: z.number().optional().default(30),
    page: z.number().optional().default(1),
  },
  (args) => safe(async () => { const m = await GitHub(); return m.githubGetIssues(args); })
);

server.tool(
  "githubCreateIssue",
  "Create a new GitHub issue",
  {
    owner: z.string(),
    repo: z.string(),
    title: z.string(),
    body: z.string().optional(),
    labels: z.array(z.string()).optional(),
  },
  (args) => safe(async () => { const m = await GitHub(); return m.githubCreateIssue(args); })
);

server.tool(
  "githubGetPullRequests",
  "List GitHub pull requests for a repository",
  {
    owner: z.string(),
    repo: z.string(),
    state: z.enum(["open", "closed", "all"]).optional().default("open"),
    perPage: z.number().optional().default(30),
    page: z.number().optional().default(1),
  },
  (args) => safe(async () => { const m = await GitHub(); return m.githubGetPullRequests(args); })
);

server.tool(
  "githubCreatePullRequest",
  "Create a new GitHub pull request",
  {
    owner: z.string(),
    repo: z.string(),
    title: z.string(),
    head: z.string().describe("Branch to merge FROM"),
    base: z.string().describe("Branch to merge INTO"),
    body: z.string().optional(),
  },
  (args) => safe(async () => { const m = await GitHub(); return m.githubCreatePullRequest(args); })
);

server.tool(
  "githubSearchRepositories",
  "Search GitHub repositories",
  {
    query: z.string(),
    sort: z.enum(["stars", "forks", "help-wanted-issues", "updated"]).optional(),
    order: z.enum(["desc", "asc"]).optional().default("desc"),
    perPage: z.number().optional().default(30),
  },
  (args) => safe(async () => { const m = await GitHub(); return m.githubSearchRepositories(args); })
);

server.tool(
  "githubGetCurrentUser",
  "Get current GitHub user information",
  {},
  () => safe(async () => { const m = await GitHub(); return m.githubGetCurrentUser(); })
);

// ════════════════════════════════════════════════════════════════════════════
//  START SERVER
// ════════════════════════════════════════════════════════════════════════════

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write(
    "✅ MCP Unified Server v2.0 — 80+ tools across 12 services\n" +
    "   Gmail · LinkedIn · Drive · Calendar · YouTube · Notion · Telegram · WhatsApp · Discord · Slack · Twitch · GitHub\n"
  );
}

main().catch((err) => {
  process.stderr.write(`❌ Fatal: ${err.message}\n`);
  process.exit(1);
});
