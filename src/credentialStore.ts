/**
 * credentialStore.ts
 * ─────────────────────────────────────────────────────────────
 * AES-256-GCM encrypted SQLite credential store.
 * All service credentials (API keys, tokens, passwords) are
 * encrypted before writing and decrypted on read.
 *
 * DB location: ~/.mcp-unified/credentials.db  (or MCP_DATA_DIR)
 * Master key:  ~/.mcp-unified/.master.key     (auto-generated)
 *              Override: set MASTER_SECRET env var
 * ─────────────────────────────────────────────────────────────
 */
import Database from "better-sqlite3";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// ── Config dir & DB path ─────────────────────────────────────────────────────
export const DATA_DIR = (process.env.MCP_DATA_DIR || path.join(os.homedir(), ".mcp-unified")).replace(
  "~",
  os.homedir()
);
const DB_PATH  = path.join(DATA_DIR, "credentials.db");
const KEY_PATH = path.join(DATA_DIR, ".master.key");

fs.mkdirSync(DATA_DIR, { recursive: true });

// ── Master encryption key ────────────────────────────────────────────────────
function getMasterKey(): Buffer {
  if (process.env.MASTER_SECRET) {
    return crypto.createHash("sha256").update(process.env.MASTER_SECRET).digest();
  }
  if (fs.existsSync(KEY_PATH)) {
    return Buffer.from(fs.readFileSync(KEY_PATH, "utf8").trim(), "hex");
  }
  const key = crypto.randomBytes(32);
  fs.writeFileSync(KEY_PATH, key.toString("hex"), { mode: 0o600 });
  console.error(`[credentialStore] Generated master key → ${KEY_PATH}`);
  return key;
}

const MASTER_KEY = getMasterKey();

// ── AES-256-GCM encrypt / decrypt ────────────────────────────────────────────
function encrypt(plaintext: string): string {
  const iv      = crypto.randomBytes(12);
  const cipher  = crypto.createCipheriv("aes-256-gcm", MASTER_KEY, iv);
  const enc     = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag     = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

function decrypt(ciphertext: string): string {
  const buf     = Buffer.from(ciphertext, "base64");
  const iv      = buf.subarray(0, 12);
  const tag     = buf.subarray(12, 28);
  const data    = buf.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", MASTER_KEY, iv);
  decipher.setAuthTag(tag);
  return decipher.update(data).toString("utf8") + decipher.final("utf8");
}

// ── SQLite schema ─────────────────────────────────────────────────────────────
const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.exec(`
  CREATE TABLE IF NOT EXISTS credentials (
    service TEXT NOT NULL,
    key     TEXT NOT NULL,
    value   TEXT NOT NULL,
    updated INTEGER NOT NULL DEFAULT (unixepoch()),
    PRIMARY KEY (service, key)
  );
  CREATE TABLE IF NOT EXISTS oauth_tokens (
    service TEXT    PRIMARY KEY,
    tokens  TEXT    NOT NULL,
    updated INTEGER NOT NULL DEFAULT (unixepoch())
  );
`);

// ── Service type ──────────────────────────────────────────────────────────────
export type Service =
  | "google"
  | "notion"
  | "telegram"
  | "whatsapp_twilio"
  | "whatsapp_meta"
  | "linkedin"
  | "outlook"
  | "discord"
  | "slack"
  | "twitch"
  | "github";

// ── Credential CRUD ───────────────────────────────────────────────────────────
export function setCredential(service: Service, key: string, value: string): void {
  db.prepare(`
    INSERT INTO credentials (service, key, value, updated)
    VALUES (?, ?, ?, unixepoch())
    ON CONFLICT(service, key) DO UPDATE SET value = excluded.value, updated = unixepoch()
  `).run(service, key, encrypt(value));
}

export function getCredential(service: Service, key: string): string | null {
  const row = db.prepare("SELECT value FROM credentials WHERE service = ? AND key = ?").get(service, key) as any;
  if (!row) return null;
  try { return decrypt(row.value); } catch { return null; }
}

export function getAllCredentials(service: Service): Record<string, string> {
  const rows   = db.prepare("SELECT key, value FROM credentials WHERE service = ?").all(service) as any[];
  const result: Record<string, string> = {};
  for (const row of rows) {
    try { result[row.key] = decrypt(row.value); } catch { /* skip corrupted */ }
  }
  return result;
}

export function deleteCredential(service: Service, key: string): void {
  db.prepare("DELETE FROM credentials WHERE service = ? AND key = ?").run(service, key);
}

export function clearService(service: Service): void {
  db.prepare("DELETE FROM credentials WHERE service = ?").run(service);
  db.prepare("DELETE FROM oauth_tokens WHERE service = ?").run(service);
}

// ── OAuth token storage ───────────────────────────────────────────────────────
export function saveOAuthTokens(service: Service, tokens: object): void {
  db.prepare(`
    INSERT INTO oauth_tokens (service, tokens, updated)
    VALUES (?, ?, unixepoch())
    ON CONFLICT(service) DO UPDATE SET tokens = excluded.tokens, updated = unixepoch()
  `).run(service, encrypt(JSON.stringify(tokens)));
}

export function getOAuthTokens(service: Service): any | null {
  const row = db.prepare("SELECT tokens FROM oauth_tokens WHERE service = ?").get(service) as any;
  if (!row) return null;
  try { return JSON.parse(decrypt(row.tokens)); } catch { return null; }
}

// ── Status helpers ────────────────────────────────────────────────────────────
export function isServiceConfigured(service: Service): boolean {
  const hasCreds = db.prepare("SELECT 1 FROM credentials  WHERE service = ? LIMIT 1").get(service);
  const hasOAuth = db.prepare("SELECT 1 FROM oauth_tokens WHERE service = ? LIMIT 1").get(service);
  return !!(hasCreds || hasOAuth);
}

export function listServices(): Array<{
  service: string;
  keyCount: number;
  hasOAuth: boolean;
  updated: number;
}> {
  const creds  = db.prepare(
    "SELECT service, COUNT(*) as keyCount, MAX(updated) as updated FROM credentials GROUP BY service"
  ).all() as any[];
  const oauths = new Set(
    (db.prepare("SELECT service FROM oauth_tokens").all() as any[]).map((r) => r.service)
  );
  return creds.map((r) => ({
    service:  r.service,
    keyCount: r.keyCount,
    hasOAuth: oauths.has(r.service),
    updated:  r.updated,
  }));
}
