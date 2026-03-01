import fs from 'fs';
import path from 'path';
import { lookup as mimeLookup } from 'mime-types';
import nodemailer from 'nodemailer';
import { google } from 'googleapis';
import { getCredential, getOAuthTokens, saveOAuthTokens } from './credentialStore.js';

function encodeEmailHeader(text: string): string {
    if (/[^\x00-\x7F]/.test(text)) {
        return '=?UTF-8?B?' + Buffer.from(text).toString('base64') + '?=';
    }
    return text;
}

export const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

export function createEmailMessage(validatedArgs: any): string {
    const encodedSubject = encodeEmailHeader(validatedArgs.subject);
    let mimeType = validatedArgs.mimeType || 'text/plain';

    if (validatedArgs.htmlBody && mimeType !== 'text/plain') {
        mimeType = 'multipart/alternative';
    }

    const boundary = `----=_NextPart_${Math.random().toString(36).substring(2)}`;

    (validatedArgs.to as string[]).forEach(email => {
        if (!validateEmail(email)) {
            throw new Error(`Recipient email address is invalid: ${email}`);
        }
    });

    const emailParts = [
        'From: me',
        `To: ${validatedArgs.to.join(', ')}`,
        validatedArgs.cc ? `Cc: ${validatedArgs.cc.join(', ')}` : '',
        validatedArgs.bcc ? `Bcc: ${validatedArgs.bcc.join(', ')}` : '',
        `Subject: ${encodedSubject}`,
        validatedArgs.inReplyTo ? `In-Reply-To: ${validatedArgs.inReplyTo}` : '',
        validatedArgs.inReplyTo ? `References: ${validatedArgs.inReplyTo}` : '',
        'MIME-Version: 1.0',
    ].filter(Boolean);

    if (mimeType === 'multipart/alternative') {
        emailParts.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
        emailParts.push('');

        emailParts.push(`--${boundary}`);
        emailParts.push('Content-Type: text/plain; charset=UTF-8');
        emailParts.push('Content-Transfer-Encoding: 7bit');
        emailParts.push('');
        emailParts.push(validatedArgs.body);
        emailParts.push('');

        emailParts.push(`--${boundary}`);
        emailParts.push('Content-Type: text/html; charset=UTF-8');
        emailParts.push('Content-Transfer-Encoding: 7bit');
        emailParts.push('');
        emailParts.push(validatedArgs.htmlBody || validatedArgs.body);
        emailParts.push('');

        emailParts.push(`--${boundary}--`);
    } else if (mimeType === 'text/html') {
        emailParts.push('Content-Type: text/html; charset=UTF-8');
        emailParts.push('Content-Transfer-Encoding: 7bit');
        emailParts.push('');
        emailParts.push(validatedArgs.htmlBody || validatedArgs.body);
    } else {
        emailParts.push('Content-Type: text/plain; charset=UTF-8');
        emailParts.push('Content-Transfer-Encoding: 7bit');
        emailParts.push('');
        emailParts.push(validatedArgs.body);
    }

    return emailParts.join('\r\n');
}

export async function createEmailWithNodemailer(validatedArgs: any): Promise<string> {
    (validatedArgs.to as string[]).forEach(email => {
        if (!validateEmail(email)) {
            throw new Error(`Recipient email address is invalid: ${email}`);
        }
    });

    const transporter = nodemailer.createTransport({
        streamTransport: true,
        newline: 'unix',
        buffer: true
    });

    const attachments = [];
    for (const filePath of validatedArgs.attachments) {
        if (!fs.existsSync(filePath)) {
            throw new Error(`File does not exist: ${filePath}`);
        }

        const fileName = path.basename(filePath);

        attachments.push({
            filename: fileName,
            path: filePath
        });
    }

    const mailOptions = {
        from: 'me',
        to: validatedArgs.to.join(', '),
        cc: validatedArgs.cc?.join(', '),
        bcc: validatedArgs.bcc?.join(', '),
        subject: validatedArgs.subject,
        text: validatedArgs.body,
        html: validatedArgs.htmlBody,
        attachments: attachments,
        inReplyTo: validatedArgs.inReplyTo,
        references: validatedArgs.inReplyTo
    };

    const info = await transporter.sendMail(mailOptions);
    const rawMessage = info.message.toString();

    return rawMessage;
}

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

// ── Gmail API functions ──────────────────────────────────────────────────────────
export async function sendEmail(args: {
  to:      string[];
  subject: string;
  body:    string;
  cc?:     string[];
  bcc?:    string[];
  isHtml?: boolean;
}) {
  const gmail = buildGmail();
  const email = createEmailMessage({
    to: args.to,
    subject: args.subject,
    body: args.body,
    cc: args.cc,
    bcc: args.bcc,
    htmlBody: args.isHtml ? args.body : undefined,
    mimeType: args.isHtml ? 'text/html' : 'text/plain',
  });

  const res = await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: Buffer.from(email).toString('base64url'),
    },
  });

  return { id: res.data.id, threadId: res.data.threadId };
}

export async function draftEmail(args: {
  to:      string[];
  subject: string;
  body:    string;
}) {
  const gmail = buildGmail();
  const email = createEmailMessage({
    to: args.to,
    subject: args.subject,
    body: args.body,
  });

  const res = await gmail.users.drafts.create({
    userId: 'me',
    requestBody: {
      message: {
        raw: Buffer.from(email).toString('base64url'),
      },
    },
  });

  return { id: res.data.id, message: res.data.message };
}

export async function readEmail(args: { messageId: string }) {
  const gmail = buildGmail();
  const res = await gmail.users.messages.get({
    userId: 'me',
    id: args.messageId,
    format: 'full',
  });

  const headers = res.data.payload?.headers || [];
  const getHeader = (name: string) => headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

  const getBody = (part: any): string => {
    if (part.body?.data) {
      return Buffer.from(part.body.data, 'base64url').toString('utf-8');
    }
    if (part.parts) {
      return part.parts.map((p: any) => getBody(p)).join('\n');
    }
    return '';
  };

  return {
    id: res.data.id,
    threadId: res.data.threadId,
    snippet: res.data.snippet,
    from: getHeader('from'),
    to: getHeader('to'),
    subject: getHeader('subject'),
    date: getHeader('date'),
    body: getBody(res.data.payload),
    labels: res.data.labelIds || [],
  };
}

export async function searchEmails(args: {
  query:      string;
  maxResults?: number;
}) {
  const gmail = buildGmail();
  const res = await gmail.users.messages.list({
    userId: 'me',
    q: args.query,
    maxResults: args.maxResults || 10,
  });

  const messages = res.data.messages || [];
  const details = await Promise.all(
    messages.map(async (msg: any) => {
      const full = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id,
        format: 'metadata',
        metadataHeaders: ['From', 'To', 'Subject', 'Date'],
      });

      const headers = full.data.payload?.headers || [];
      const getHeader = (name: string) => headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

      return {
        id: msg.id,
        threadId: full.data.threadId,
        snippet: full.data.snippet,
        from: getHeader('from'),
        to: getHeader('to'),
        subject: getHeader('subject'),
        date: getHeader('date'),
        labels: full.data.labelIds || [],
      };
    })
  );

  return details;
}

export async function modifyEmail(args: {
  messageId:      string;
  addLabelIds?:   string[];
  removeLabelIds?: string[];
}) {
  const gmail = buildGmail();
  const res = await gmail.users.messages.modify({
    userId: 'me',
    id: args.messageId,
    requestBody: {
      addLabelIds: args.addLabelIds || [],
      removeLabelIds: args.removeLabelIds || [],
    },
  });

  return { id: res.data.id, labelIds: res.data.labelIds };
}

export async function deleteEmail(args: { messageId: string }) {
  const gmail = buildGmail();
  await gmail.users.messages.delete({
    userId: 'me',
    id: args.messageId,
  });

  return { success: true };
}

export async function batchModifyEmails(args: {
  messageIds:     string[];
  addLabelIds?:   string[];
  removeLabelIds?: string[];
}) {
  const gmail = buildGmail();
  const res = await gmail.users.messages.batchModify({
    userId: 'me',
    requestBody: {
      ids: args.messageIds,
      addLabelIds: args.addLabelIds || [],
      removeLabelIds: args.removeLabelIds || [],
    },
  });

  return { success: true };
}

export async function batchDeleteEmails(args: { messageIds: string[] }) {
  const gmail = buildGmail();
  await gmail.users.messages.batchDelete({
    userId: 'me',
    requestBody: {
      ids: args.messageIds,
    },
  });

  return { success: true };
}

export async function downloadAttachment(args: {
  messageId:    string;
  attachmentId: string;
}) {
  const gmail = buildGmail();
  const res = await gmail.users.messages.attachments.get({
    userId: 'me',
    messageId: args.messageId,
    id: args.attachmentId,
  });

  return {
    size: res.data.size,
    data: res.data.data,
    attachmentId: res.data.attachmentId,
  };
}