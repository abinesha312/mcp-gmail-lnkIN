/**
 * api.ts — Dashboard REST API (Express, port 3001)
 * ─────────────────────────────────────────────────────────────
 * Endpoints:
 *   GET    /api/services           list all services + status
 *   GET    /api/services/:id       get service (masked creds)
 *   POST   /api/services/:id       save credentials
 *   DELETE /api/services/:id       remove all credentials
 *   POST   /api/tools/invoke       invoke any tool by name
 *   GET    /auth/google            start Google OAuth
 *   GET    /auth/google/callback   Google OAuth callback
 * ─────────────────────────────────────────────────────────────
 */
import express   from "express";
import cors      from "cors";
import rateLimit from "express-rate-limit";
import { google } from "googleapis";
import * as dotenv from "dotenv";
dotenv.config();

import {
  setCredential,
  getCredential,
  getAllCredentials,
  clearService,
  saveOAuthTokens,
  getOAuthTokens,
  listServices,
  isServiceConfigured,
  type Service,
} from "./credentialStore.js";

// ── Gmail client builder ─────────────────────────────────────────────────────────
function buildGmail() {
  const clientId     = getCredential("google", "client_id");
  const clientSecret = getCredential("google", "client_secret");
  const redirectUri  = getCredential("google", "redirect_uri") || "http://localhost:3001/auth/google/callback";
  const tokens       = getOAuthTokens("google");

  if (!clientId || !clientSecret) throw new Error("Google not configured. Open the dashboard → Google → Configure.");
  if (!tokens)                    throw new Error("Google OAuth not completed. Open the dashboard → Google → Connect.");

  const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  oauth2.setCredentials(tokens);
  oauth2.on("tokens", (t) => saveOAuthTokens("google", { ...tokens, ...t }));
  return google.gmail({ version: "v1", auth: oauth2 });
}

const app  = express();
const PORT = Number(process.env.API_PORT) || 3001;

app.use(cors({ 
  origin: process.env.CORS_ORIGINS 
    ? process.env.CORS_ORIGINS.split(",") 
    : ["http://localhost:5173", "http://localhost:3000", "http://localhost:80"]
}));
app.use(express.json());

// ── Rate Limiting ───────────────────────────────────────────────────────────────
// General API rate limit: 100 requests per 15 minutes per IP
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_GENERAL || "100"), // Limit each IP to 100 requests per windowMs
  message: {
    error: "Too many requests from this IP, please try again later.",
    retryAfter: "15 minutes"
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === "/api/services" && req.method === "GET";
  }
});

// Tool invocation rate limit: 30 requests per minute per IP (more restrictive)
const toolInvocationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: parseInt(process.env.RATE_LIMIT_TOOLS || "30"), // Limit each IP to 30 tool invocations per minute
  message: {
    error: `Too many tool invocations. Limit: ${parseInt(process.env.RATE_LIMIT_TOOLS || "30")} per minute. Please slow down and try again in a moment.`,
    retryAfter: "1 minute",
    limit: parseInt(process.env.RATE_LIMIT_TOOLS || "30"),
    window: "1 minute"
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false, // Count all requests, including successful ones
  // Allow configuration to disable rate limiting (for development)
  skip: (req) => process.env.DISABLE_RATE_LIMIT === "true",
});

// OAuth endpoints rate limit: 10 requests per 15 minutes per IP
const oauthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_OAUTH || "10"), // Limit OAuth attempts
  message: {
    error: "Too many OAuth attempts. Please wait before trying again.",
    retryAfter: "15 minutes"
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply general rate limiting to all API routes
app.use("/api", generalLimiter);

// ── Service metadata (what the dashboard renders) ─────────────────────────────
const SERVICE_META: Record<string, {
  label:    string;
  authType: "oauth" | "apikey" | "credentials";
  fields:   Array<{ key: string; label: string; secret?: boolean; hint?: string }>;
  oauthUrl?: string;
}> = {
  google: {
    label:    "Google  (Gmail · Drive · Calendar · YouTube)",
    authType: "oauth",
    oauthUrl: "/auth/google",
    fields: [
      { key: "client_id",     label: "Client ID",     hint: "Google Cloud Console → OAuth 2.0 Credentials" },
      { key: "client_secret", label: "Client Secret", secret: true },
      { key: "redirect_uri",  label: "Redirect URI",  hint: "http://localhost:3001/auth/google/callback" },
      { key: "youtube_api_key", label: "YouTube API Key (optional)", secret: true, hint: "For public search without OAuth" },
    ],
  },
  notion: {
    label:    "Notion",
    authType: "apikey",
    fields: [
      { key: "api_key", label: "Integration Token", secret: true, hint: "notion.so/my-integrations → New integration" },
    ],
  },
  telegram: {
    label:    "Telegram",
    authType: "credentials",
    fields: [
      { key: "bot_token", label: "Bot Token", secret: true, hint: "Message @BotFather → /newbot" },
    ],
  },
  whatsapp_twilio: {
    label:    "WhatsApp — Twilio",
    authType: "credentials",
    fields: [
      { key: "account_sid",  label: "Account SID",  hint: "twilio.com/console" },
      { key: "auth_token",   label: "Auth Token",   secret: true },
      { key: "from_number",  label: "From Number",  hint: "whatsapp:+14155238886" },
    ],
  },
  whatsapp_meta: {
    label:    "WhatsApp — Meta Cloud API",
    authType: "credentials",
    fields: [
      { key: "token",           label: "Access Token",    secret: true, hint: "developers.facebook.com → WhatsApp" },
      { key: "phone_number_id", label: "Phone Number ID" },
    ],
  },
  linkedin: {
    label:    "LinkedIn",
    authType: "credentials",
    fields: [
      { key: "email",    label: "LinkedIn Email" },
      { key: "password", label: "LinkedIn Password", secret: true, hint: "Must be LinkedIn password, not Google SSO" },
    ],
  },
  outlook: {
    label:    "Outlook / Microsoft 365 (optional)",
    authType: "oauth",
    oauthUrl: "/auth/outlook",
    fields: [
      { key: "client_id",     label: "Client ID",     hint: "portal.azure.com → App registrations" },
      { key: "client_secret", label: "Client Secret", secret: true },
      { key: "tenant_id",     label: "Tenant ID",     hint: "Use 'common' for personal accounts" },
    ],
  },
  discord: {
    label:    "Discord",
    authType: "credentials",
    fields: [
      { key: "bot_token", label: "Bot Token", secret: true, hint: "discord.com/developers → Bot tab" },
    ],
  },
  slack: {
    label:    "Slack",
    authType: "credentials",
    fields: [
      { key: "bot_token", label: "Bot User OAuth Token", secret: true, hint: "api.slack.com/apps → OAuth & Permissions" },
    ],
  },
  twitch: {
    label:    "Twitch",
    authType: "credentials",
    fields: [
      { key: "client_id", label: "Client ID", hint: "dev.twitch.tv/console/apps" },
      { key: "client_secret", label: "Client Secret", secret: true },
      { key: "access_token", label: "Access Token (optional)", secret: true, hint: "Get from OAuth flow or client_credentials" },
    ],
  },
  github: {
    label:    "GitHub",
    authType: "apikey",
    fields: [
      { key: "access_token", label: "Personal Access Token", secret: true, hint: "github.com/settings/tokens" },
    ],
  },
};

// ── GET /api/services ─────────────────────────────────────────────────────────
app.get("/api/services", (_req, res) => {
  const stored    = listServices();
  const storedMap = new Map(stored.map((s) => [s.service, s]));

  const services = Object.entries(SERVICE_META).map(([id, meta]) => {
    const s = storedMap.get(id);
    return {
      id,
      ...meta,
      configured:  isServiceConfigured(id as Service),
      hasOAuth:    !!getOAuthTokens(id as Service),
      keyCount:    s?.keyCount || 0,
      lastUpdated: s?.updated  || null,
    };
  });
  res.json(services);
});

// ── GET /api/services/:id ─────────────────────────────────────────────────────
app.get("/api/services/:id", (req, res) => {
  const id   = req.params.id as Service;
  const meta = SERVICE_META[id];
  if (!meta) return res.status(404).json({ error: "Unknown service" });

  const raw    = getAllCredentials(id);
  const masked: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    const field = meta.fields.find((f) => f.key === k);
    masked[k]   = field?.secret ? "••••" + v.slice(-4) : v;
  }

  res.json({
    id,
    ...meta,
    credentials: masked,
    hasOAuth:    !!getOAuthTokens(id),
    configured:  isServiceConfigured(id),
  });
});

// ── POST /api/services/:id ────────────────────────────────────────────────────
app.post("/api/services/:id", (req, res) => {
  const id   = req.params.id as Service;
  const meta = SERVICE_META[id];
  if (!meta) return res.status(404).json({ error: "Unknown service" });

  const { credentials } = req.body as { credentials: Record<string, string> };
  if (!credentials) return res.status(400).json({ error: "'credentials' object required" });

  for (const [key, value] of Object.entries(credentials)) {
    // Skip masked values (user didn't change them)
    if (value && !value.startsWith("••••")) {
      setCredential(id, key, value);
    }
  }
  res.json({ success: true, message: `${meta.label} saved (AES-256-GCM encrypted).` });
});

// ── DELETE /api/services/:id ──────────────────────────────────────────────────
app.delete("/api/services/:id", (req, res) => {
  clearService(req.params.id as Service);
  res.json({ success: true });
});

// ── POST /api/tools/invoke ────────────────────────────────────────────────────
app.post("/api/tools/invoke", toolInvocationLimiter, async (req, res) => {
  // Validate request body
  if (!req.body) {
    return res.status(400).json({ success: false, error: "Request body is required" });
  }

  const { tool, args = {} } = req.body as { tool: string; args: Record<string, any> };

  if (!tool) {
    return res.status(400).json({ success: false, error: "Tool name is required" });
  }

  try {
    let result: any;

    if (["sendEmail","draftEmail","readEmail","searchEmails","modifyEmail","deleteEmail","batchModifyEmails","batchDeleteEmails","downloadAttachment"].includes(tool)) {
      const m = await import("./emailUtils.js");
      if (typeof (m as any)[tool] !== "function") {
        return res.status(400).json({ success: false, error: `Function ${tool} not found in emailUtils` });
      }
      result = await (m as any)[tool](args);
    } else if (["listEmailLabels","createLabel","updateLabel","deleteLabel","getOrCreateLabel"].includes(tool)) {
      const m = await import("./labelManager.js");
      const gmail = buildGmail();
      // Map API tool names to actual function names
      if (tool === "listEmailLabels") {
        result = await (m as any).listLabels(gmail);
      } else if (tool === "createLabel") {
        result = await (m as any).createLabel(gmail, args.name || args.labelName, args);
      } else if (tool === "updateLabel") {
        result = await (m as any).updateLabel(gmail, args.labelId, args);
      } else if (tool === "deleteLabel") {
        result = await (m as any).deleteLabel(gmail, args.labelId);
      } else if (tool === "getOrCreateLabel") {
        result = await (m as any).getOrCreateLabel(gmail, args.name || args.labelName, args);
      }
    } else if (["createFilter","listFilters","getFilter","deleteFilter","createFilterFromTemplate"].includes(tool)) {
      const m = await import("./filterManager.js");
      const gmail = buildGmail();
      if (tool === "createFilter") {
        result = await (m as any).createFilter(gmail, args.criteria, args.action);
      } else if (tool === "listFilters") {
        result = await (m as any).listFilters(gmail);
      } else if (tool === "getFilter") {
        result = await (m as any).getFilter(gmail, args.filterId);
      } else if (tool === "deleteFilter") {
        result = await (m as any).deleteFilter(gmail, args.filterId);
      } else if (tool === "createFilterFromTemplate") {
        // This function doesn't exist, need to implement it or return error
        return res.status(400).json({ success: false, error: `createFilterFromTemplate is not yet implemented in the API` });
      }
    } else if (["getFeedPosts","searchJobs","searchPeople","getLinkedInProfile"].includes(tool)) {
      const m = await import("./linkedinClient.js");
      if (tool === "getFeedPosts") {
        if (typeof (m as any).getFeedPosts !== "function") {
          return res.status(400).json({ success: false, error: `Function getFeedPosts not found in linkedinClient` });
        }
        result = await (m as any).getFeedPosts(args.limit || 10, args.offset || 0);
      } else if (tool === "searchJobs") {
        if (typeof (m as any).searchJobs !== "function") {
          return res.status(400).json({ success: false, error: `Function searchJobs not found in linkedinClient` });
        }
        result = await (m as any).searchJobs(args.keywords, args.limit || 3, args.offset || 0, args.location || "");
      } else if (tool === "searchPeople") {
        if (typeof (m as any).searchPeople !== "function") {
          return res.status(400).json({ success: false, error: `Function searchPeople not found in linkedinClient` });
        }
        result = await (m as any).searchPeople(args.keywords, args.limit || 3, args.offset || 0);
      } else if (tool === "getLinkedInProfile") {
        if (typeof (m as any).getProfile !== "function") {
          return res.status(400).json({ success: false, error: `Function getProfile not found in linkedinClient` });
        }
        result = await (m as any).getProfile(args);
      }
    } else if (tool.startsWith("drive")) {
      const m = await import("./googleDriveClient.js");
      if (typeof (m as any)[tool] !== "function") {
        return res.status(400).json({ success: false, error: `Function ${tool} not found in googleDriveClient` });
      }
      result = await (m as any)[tool](args);
    } else if (tool.startsWith("calendar")) {
      const m = await import("./googleCalClient.js");
      if (typeof (m as any)[tool] !== "function") {
        return res.status(400).json({ success: false, error: `Function ${tool} not found in googleCalClient` });
      }
      result = await (m as any)[tool](args);
    } else if (tool.startsWith("youtube")) {
      const m = await import("./youtubeClient.js");
      if (typeof (m as any)[tool] !== "function") {
        return res.status(400).json({ success: false, error: `Function ${tool} not found in youtubeClient` });
      }
      result = await (m as any)[tool](args);
    } else if (tool.startsWith("notion")) {
      const m = await import("./notionClient.js");
      if (typeof (m as any)[tool] !== "function") {
        return res.status(400).json({ success: false, error: `Function ${tool} not found in notionClient` });
      }
      result = await (m as any)[tool](args);
    } else if (tool.startsWith("telegram")) {
      const m = await import("./telegramClient.js");
      if (typeof (m as any)[tool] !== "function") {
        return res.status(400).json({ success: false, error: `Function ${tool} not found in telegramClient` });
      }
      result = await (m as any)[tool](args);
    } else if (tool.startsWith("whatsapp")) {
      const m = await import("./whatsappClient.js");
      if (typeof (m as any)[tool] !== "function") {
        return res.status(400).json({ success: false, error: `Function ${tool} not found in whatsappClient` });
      }
      result = await (m as any)[tool](args);
    } else if (tool.startsWith("discord")) {
      const m = await import("./discordClient.js");
      // Tool names match function names exactly (e.g., discordSendMessage -> discordSendMessage)
      if (typeof (m as any)[tool] !== "function") {
        return res.status(400).json({ success: false, error: `Function ${tool} not found in discordClient` });
      }
      result = await (m as any)[tool](args);
    } else if (tool.startsWith("slack")) {
      const m = await import("./slackClient.js");
      // Tool names match function names exactly (e.g., slackPostMessage -> slackPostMessage)
      if (typeof (m as any)[tool] !== "function") {
        return res.status(400).json({ success: false, error: `Function ${tool} not found in slackClient` });
      }
      result = await (m as any)[tool](args);
    } else if (tool.startsWith("twitch")) {
      const m = await import("./twitchClient.js");
      // Tool names match function names exactly (e.g., twitchGetUsers -> twitchGetUsers)
      if (typeof (m as any)[tool] !== "function") {
        return res.status(400).json({ success: false, error: `Function ${tool} not found in twitchClient` });
      }
      result = await (m as any)[tool](args);
    } else if (tool.startsWith("github")) {
      const m = await import("./githubClient.js");
      // Tool names match function names exactly (e.g., githubGetUserRepos -> githubGetUserRepos)
      if (typeof (m as any)[tool] !== "function") {
        return res.status(400).json({ success: false, error: `Function ${tool} not found in githubClient` });
      }
      result = await (m as any)[tool](args);
    } else {
      return res.status(404).json({ success: false, error: `Unknown tool: ${tool}` });
    }

    res.json({ success: true, result });
  } catch (err: any) {
    // Provide more detailed error information
    const errorMessage = err.message || err.toString() || "Unknown error occurred";
    const statusCode = err.statusCode || err.status || 400;
    
    console.error(`[API] Tool invocation error for "${tool}":`, errorMessage);
    
    res.status(statusCode).json({ 
      success: false, 
      error: errorMessage,
      tool: tool,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// ── Google OAuth flow ─────────────────────────────────────────────────────────
const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/youtube",
  "email", "profile",
];

app.get("/auth/google", oauthLimiter, (_req, res) => {
  const clientId     = getCredential("google", "client_id");
  const clientSecret = getCredential("google", "client_secret");
  if (!clientId || !clientSecret) {
    return res.redirect(`http://localhost:5173?error=${encodeURIComponent("Add Google Client ID + Secret first")}`);
  }
  const redirectUri = getCredential("google", "redirect_uri") || "http://localhost:3001/auth/google/callback";
  const oauth2      = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  const url         = oauth2.generateAuthUrl({ access_type: "offline", scope: GOOGLE_SCOPES, prompt: "consent" });
  res.redirect(url);
});

app.get("/auth/google/callback", oauthLimiter, async (req, res) => {
  const code         = req.query.code as string;
  const clientId     = getCredential("google", "client_id");
  const clientSecret = getCredential("google", "client_secret");
  const redirectUri  = getCredential("google", "redirect_uri") || "http://localhost:3001/auth/google/callback";

  if (!code || !clientId || !clientSecret) {
    return res.redirect(`http://localhost:5173?error=${encodeURIComponent("OAuth failed — missing code or credentials")}`);
  }
  try {
    const oauth2      = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    const { tokens }  = await oauth2.getToken(code);
    saveOAuthTokens("google", tokens);
    res.redirect("http://localhost:5173?success=Google+connected+%E2%9C%93");
  } catch (err: any) {
    res.redirect(`http://localhost:5173?error=${encodeURIComponent(err.message)}`);
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🌐 Dashboard API → http://localhost:${PORT}`);
});
