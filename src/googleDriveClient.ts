/**
 * googleDriveClient.ts
 * Google Drive tools — reads credentials from credentialStore.
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

// ── Drive tools ───────────────────────────────────────────────────────────────
export async function driveListFiles(args: {
  query?: string;
  maxResults?: number;
  folderId?: string;
}) {
  const drive = google.drive({ version: "v3", auth: buildAuth() });
  let q = args.query || "";
  if (args.folderId) q = `'${args.folderId}' in parents${q ? " and " + q : ""}`;
  const res = await drive.files.list({
    q: q || undefined,
    pageSize: args.maxResults || 20,
    fields: "files(id,name,mimeType,size,modifiedTime,webViewLink)",
  });
  return res.data.files || [];
}

export async function driveGetFile(args: { fileId: string }) {
  const drive = google.drive({ version: "v3", auth: buildAuth() });
  const res = await drive.files.get({
    fileId: args.fileId,
    fields: "id,name,mimeType,size,modifiedTime,webViewLink,description",
  });
  return res.data;
}

export async function driveCreateFolder(args: { name: string; parentId?: string }) {
  const drive = google.drive({ version: "v3", auth: buildAuth() });
  const res = await drive.files.create({
    requestBody: {
      name:     args.name,
      mimeType: "application/vnd.google-apps.folder",
      parents:  args.parentId ? [args.parentId] : undefined,
    },
    fields: "id,name,webViewLink",
  });
  return res.data;
}

export async function driveMoveFile(args: { fileId: string; newParentId: string }) {
  const drive = google.drive({ version: "v3", auth: buildAuth() });
  const file  = await drive.files.get({ fileId: args.fileId, fields: "parents" });
  const prev  = (file.data.parents || []).join(",");
  const res   = await drive.files.update({
    fileId:      args.fileId,
    addParents:  args.newParentId,
    removeParents: prev,
    fields: "id,parents",
  });
  return res.data;
}

export async function driveDeleteFile(args: { fileId: string }) {
  const drive = google.drive({ version: "v3", auth: buildAuth() });
  await drive.files.delete({ fileId: args.fileId });
  return { success: true };
}

export async function driveShareFile(args: {
  fileId: string;
  email:  string;
  role:   "reader" | "writer" | "commenter";
}) {
  const drive = google.drive({ version: "v3", auth: buildAuth() });
  const res = await drive.permissions.create({
    fileId:      args.fileId,
    requestBody: { type: "user", role: args.role, emailAddress: args.email },
  });
  return res.data;
}
