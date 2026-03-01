#!/usr/bin/env tsx
/**
 * outlookAuth.ts
 * Run: npx tsx src/auth/outlookAuth.ts
 *
 * Starts a local HTTP server on port 3002, opens Microsoft OAuth,
 * captures the token and saves it to the encrypted credential store.
 */
import axios   from "axios";
import * as http from "http";
import { URL }   from "url";
import * as dotenv from "dotenv";
import { getCredential, saveOAuthTokens, DATA_DIR } from "../credentialStore.js";
dotenv.config();

const clientId    = getCredential("outlook", "client_id")    || process.env.MS_CLIENT_ID;
const clientSecret= getCredential("outlook", "client_secret") || process.env.MS_CLIENT_SECRET;
const tenantId    = getCredential("outlook", "tenant_id")    || process.env.MS_TENANT_ID || "common";
const redirectUri = "http://localhost:3002/auth/callback";
const SCOPES      = "offline_access Mail.ReadWrite Mail.Send Calendars.ReadWrite";

if (!clientId || !clientSecret) {
  console.error("❌ Outlook credentials not found.");
  console.error("   → Open the dashboard → Outlook → Configure → save Client ID + Secret first.");
  process.exit(1);
}

const authUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`
  + `?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}`
  + `&scope=${encodeURIComponent(SCOPES)}&response_mode=query`;

console.log("\n🔐 Open this URL in your browser:\n");
console.log(authUrl);
console.log("\nWaiting for redirect on http://localhost:3002 ...\n");

const server = http.createServer(async (req, res) => {
  if (!req.url?.includes("/auth/callback")) return;
  const url  = new URL(req.url, "http://localhost:3002");
  const code = url.searchParams.get("code");
  if (!code) { res.end("❌ No code in redirect."); server.close(); return; }

  try {
    const tokenRes = await axios.post(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      new URLSearchParams({
        grant_type:    "authorization_code",
        client_id:     clientId!,
        client_secret: clientSecret!,
        code,
        redirect_uri:  redirectUri,
        scope:         SCOPES,
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );
    const tokens = { ...tokenRes.data, expires_at: Date.now() + tokenRes.data.expires_in * 1000 };
    saveOAuthTokens("outlook", tokens);
    console.log(`✅ Outlook tokens saved to encrypted store (${DATA_DIR}/credentials.db)`);
    res.end("✅ Outlook authenticated! You can close this window.");
  } catch (err: any) {
    res.end(`❌ ${err.response?.data?.error_description || err.message}`);
    console.error("❌ Token error:", err.response?.data || err.message);
  }
  server.close();
});

server.listen(3002);
