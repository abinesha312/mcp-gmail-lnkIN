#!/usr/bin/env tsx
/**
 * googleAuth.ts
 * Run: npx tsx src/auth/googleAuth.ts
 *
 * Opens the Google OAuth consent screen, captures the code,
 * saves tokens to the encrypted credential store.
 * Covers: Gmail + Drive + Calendar + YouTube (all in one flow).
 */
import { google }    from "googleapis";
import * as readline from "readline";
import * as dotenv   from "dotenv";
import { getCredential, saveOAuthTokens, DATA_DIR } from "../credentialStore.js";
dotenv.config();

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/youtube",
  "email",
  "profile",
];

const clientId     = getCredential("google", "client_id");
const clientSecret = getCredential("google", "client_secret");
const redirectUri  = getCredential("google", "redirect_uri") || "urn:ietf:wg:oauth:2.0:oob";

if (!clientId || !clientSecret) {
  console.error("❌ Google credentials not found in the encrypted store.");
  console.error("   → Open the dashboard (npm run dev) → Google → Configure → save Client ID + Secret first.");
  process.exit(1);
}

const oauth2   = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
const authUrl  = oauth2.generateAuthUrl({ access_type: "offline", scope: SCOPES, prompt: "consent" });

console.log("\n🔐 Open this URL in your browser:\n");
console.log(authUrl);
console.log("\n");

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question("Paste the authorization code: ", async (code) => {
  rl.close();
  try {
    const { tokens } = await oauth2.getToken(code.trim());
    saveOAuthTokens("google", tokens);
    console.log(`\n✅ Google OAuth tokens saved to encrypted store (${DATA_DIR}/credentials.db)`);
    console.log("   Gmail, Drive, Calendar, YouTube are now ready.\n");
  } catch (err: any) {
    console.error("❌ Token exchange failed:", err.message);
    process.exit(1);
  }
});
