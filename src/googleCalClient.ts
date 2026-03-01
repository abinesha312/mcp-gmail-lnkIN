/**
 * googleCalClient.ts
 * Google Calendar tools — reads credentials from credentialStore.
 */
import { google } from "googleapis";
import { getCredential, getOAuthTokens, saveOAuthTokens } from "./credentialStore.js";

function buildAuth() {
  const clientId     = getCredential("google", "client_id");
  const clientSecret = getCredential("google", "client_secret");
  const redirectUri  = getCredential("google", "redirect_uri") || "http://localhost:3001/auth/google/callback";
  const tokens       = getOAuthTokens("google");

  if (!clientId || !clientSecret) throw new Error("Google not configured. Open the dashboard → Google → Configure.");
  if (!tokens)                    throw new Error("Google OAuth not completed. Open the dashboard → Google → Connect.");

  const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  oauth2.setCredentials(tokens);
  oauth2.on("tokens", (t) => saveOAuthTokens("google", { ...tokens, ...t }));
  return oauth2;
}

// ── Calendar tools ────────────────────────────────────────────────────────────
export async function calendarListEvents(args: {
  calendarId?: string;
  maxResults?: number;
  timeMin?: string;
  timeMax?: string;
}) {
  const cal = google.calendar({ version: "v3", auth: buildAuth() });
  const res = await cal.events.list({
    calendarId:  args.calendarId || "primary",
    maxResults:  args.maxResults || 10,
    timeMin:     args.timeMin || new Date().toISOString(),
    timeMax:     args.timeMax,
    singleEvents: true,
    orderBy:     "startTime",
  });
  return res.data.items || [];
}

export async function calendarCreateEvent(args: {
  summary:     string;
  start:       string;
  end:         string;
  description?: string;
  location?:   string;
  attendees?:  string[];
  calendarId?: string;
  timezone?:   string;
}) {
  const cal = google.calendar({ version: "v3", auth: buildAuth() });
  const tz  = args.timezone || "UTC";
  const res = await cal.events.insert({
    calendarId:  args.calendarId || "primary",
    requestBody: {
      summary:     args.summary,
      description: args.description,
      location:    args.location,
      start:       { dateTime: args.start, timeZone: tz },
      end:         { dateTime: args.end,   timeZone: tz },
      attendees:   (args.attendees || []).map((e) => ({ email: e })),
    },
  });
  return res.data;
}

export async function calendarUpdateEvent(args: {
  eventId:     string;
  summary?:    string;
  start?:      string;
  end?:        string;
  description?: string;
  calendarId?: string;
}) {
  const cal      = google.calendar({ version: "v3", auth: buildAuth() });
  const existing = await cal.events.get({ calendarId: args.calendarId || "primary", eventId: args.eventId });
  const patch: any = {};
  if (args.summary)     patch.summary     = args.summary;
  if (args.description) patch.description = args.description;
  if (args.start) patch.start = { dateTime: args.start, timeZone: existing.data.start?.timeZone || "UTC" };
  if (args.end)   patch.end   = { dateTime: args.end,   timeZone: existing.data.end?.timeZone   || "UTC" };
  const res = await cal.events.patch({ calendarId: args.calendarId || "primary", eventId: args.eventId, requestBody: patch });
  return res.data;
}

export async function calendarDeleteEvent(args: { eventId: string; calendarId?: string }) {
  const cal = google.calendar({ version: "v3", auth: buildAuth() });
  await cal.events.delete({ calendarId: args.calendarId || "primary", eventId: args.eventId });
  return { success: true };
}

export async function calendarListCalendars() {
  const cal = google.calendar({ version: "v3", auth: buildAuth() });
  const res = await cal.calendarList.list();
  return res.data.items || [];
}
