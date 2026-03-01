/**
 * whatsappClient.ts
 * WhatsApp tools — supports Twilio (sandbox/prod) and Meta Cloud API.
 * Provider selected by WHATSAPP_PROVIDER env or whichever creds are present.
 * Reads credentials from credentialStore.
 */
import axios from "axios";
import { getCredential } from "./credentialStore.js";

function getProvider(): "twilio" | "meta" {
  if (process.env.WHATSAPP_PROVIDER === "meta") return "meta";
  if (process.env.WHATSAPP_PROVIDER === "twilio") return "twilio";
  // Auto-detect from stored credentials
  return getCredential("whatsapp_twilio", "account_sid") ? "twilio" : "meta";
}

// ── WhatsApp tools ────────────────────────────────────────────────────────────
export async function whatsappSendMessage(args: { to: string; message: string }) {
  const provider = getProvider();

  if (provider === "twilio") {
    const sid   = getCredential("whatsapp_twilio", "account_sid");
    const token = getCredential("whatsapp_twilio", "auth_token");
    const from  = getCredential("whatsapp_twilio", "from_number") || "whatsapp:+14155238886";
    if (!sid || !token) throw new Error("Twilio WhatsApp not configured. Open the dashboard → WhatsApp (Twilio) → Configure.");

    const to  = args.to.startsWith("whatsapp:") ? args.to : `whatsapp:${args.to}`;
    const res = await axios.post(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      new URLSearchParams({ From: from, To: to, Body: args.message }),
      {
        auth:    { username: sid, password: token },
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );
    return { sid: res.data.sid, status: res.data.status, to: res.data.to };
  }

  // Meta Cloud API
  const metaToken     = getCredential("whatsapp_meta", "token");
  const phoneNumberId = getCredential("whatsapp_meta", "phone_number_id");
  if (!metaToken || !phoneNumberId) throw new Error("Meta WhatsApp not configured. Open the dashboard → WhatsApp (Meta) → Configure.");

  const res = await axios.post(
    `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
    { messaging_product: "whatsapp", to: args.to, type: "text", text: { body: args.message } },
    { headers: { Authorization: `Bearer ${metaToken}`, "Content-Type": "application/json" } }
  );
  return res.data;
}

export async function whatsappSendTemplate(args: {
  to:            string;
  templateName:  string;
  languageCode?: string;
  components?:   any[];
}) {
  const metaToken     = getCredential("whatsapp_meta", "token");
  const phoneNumberId = getCredential("whatsapp_meta", "phone_number_id");
  if (!metaToken || !phoneNumberId) throw new Error("Meta WhatsApp not configured. Required for template messages.");

  const res = await axios.post(
    `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
    {
      messaging_product: "whatsapp",
      to:   args.to,
      type: "template",
      template: {
        name:       args.templateName,
        language:   { code: args.languageCode || "en_US" },
        components: args.components || [],
      },
    },
    { headers: { Authorization: `Bearer ${metaToken}`, "Content-Type": "application/json" } }
  );
  return res.data;
}

export async function whatsappGetMessages(args: { limit?: number }) {
  const sid   = getCredential("whatsapp_twilio", "account_sid");
  const token = getCredential("whatsapp_twilio", "auth_token");
  if (!sid || !token) throw new Error("Twilio not configured. Message history requires Twilio credentials.");

  const res = await axios.get(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json?PageSize=${args.limit || 20}`,
    { auth: { username: sid, password: token } }
  );
  return res.data.messages || [];
}
