/**
 * notionClient.ts
 * Notion API tools — reads credentials from credentialStore.
 */
import { Client } from "@notionhq/client";
import { getCredential } from "./credentialStore.js";

function getNotion(): Client {
  const key = getCredential("notion", "api_key");
  if (!key) throw new Error("Notion not configured. Open the dashboard → Notion → Configure.");
  return new Client({ auth: key });
}

// ── Notion tools ──────────────────────────────────────────────────────────────
export async function notionSearchPages(args: { query: string; maxResults?: number }) {
  const notion = getNotion();
  const res    = await notion.search({ query: args.query, page_size: args.maxResults || 10 });
  return res.results.map((r: any) => ({
    id:         r.id,
    type:       r.object,
    title:      r.properties?.title?.title?.[0]?.plain_text
                || r.properties?.Name?.title?.[0]?.plain_text
                || "(untitled)",
    url:        r.url,
    lastEdited: r.last_edited_time,
  }));
}

export async function notionGetPage(args: { pageId: string }) {
  const notion = getNotion();
  const [page, blocks] = await Promise.all([
    notion.pages.retrieve({ page_id: args.pageId }),
    notion.blocks.children.list({ block_id: args.pageId }),
  ]);
  return { page, blocks: blocks.results };
}

export async function notionCreatePage(args: {
  title:        string;
  content?:     string;
  parentPageId?: string;
  databaseId?:  string;
  properties?:  Record<string, any>;
}) {
  const notion  = getNotion();
  const parent: any = args.databaseId
    ? { type: "database_id", database_id: args.databaseId }
    : { type: "page_id",     page_id: args.parentPageId! };

  const children = args.content
    ? [{ object: "block", type: "paragraph", paragraph: { rich_text: [{ type: "text", text: { content: args.content } }] } }]
    : [];

  const res = await notion.pages.create({
    parent,
    properties: args.properties || {
      title: { title: [{ type: "text", text: { content: args.title } }] },
    },
    children: children as any,
  });
  return { id: (res as any).id, url: (res as any).url };
}

export async function notionUpdatePage(args: { pageId: string; properties: Record<string, any> }) {
  const notion = getNotion();
  const res    = await notion.pages.update({ page_id: args.pageId, properties: args.properties });
  return { id: (res as any).id, url: (res as any).url };
}

export async function notionAppendBlock(args: {
  blockId: string;
  content: string;
  type?:   string;
}) {
  const notion = getNotion();
  const t      = args.type || "paragraph";
  return notion.blocks.children.append({
    block_id: args.blockId,
    children: [{
      object: "block",
      type:   t as any,
      [t]:    { rich_text: [{ type: "text", text: { content: args.content } }] },
    }] as any,
  });
}

export async function notionQueryDatabase(args: {
  databaseId: string;
  filter?:    any;
  sorts?:     any[];
  maxResults?: number;
}) {
  const notion = getNotion();
  const res    = await notion.databases.query({
    database_id: args.databaseId,
    filter:      args.filter,
    sorts:       args.sorts,
    page_size:   args.maxResults || 20,
  });
  return res.results;
}

export async function notionListDatabases() {
  const notion = getNotion();
  const res    = await notion.search({ filter: { property: "object", value: "database" } });
  return res.results.map((r: any) => ({
    id:    r.id,
    title: r.title?.[0]?.plain_text || "(untitled)",
    url:   r.url,
  }));
}
