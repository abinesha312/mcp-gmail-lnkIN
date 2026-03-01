import { useState } from "react";
import { invokeTool, type ServiceInfo } from "../hooks/useApi.ts";

interface ToolDef {
  label: string;
  args:  Array<{ key: string; label: string; default?: string; required?: boolean }>;
}

const TOOLS: Record<string, ToolDef> = {
  // Gmail
  searchEmails:       { label: "Gmail · Search",          args: [{ key:"query", label:"Query", default:"is:unread", required:true }, { key:"maxResults", label:"Max", default:"5" }] },
  sendEmail:          { label: "Gmail · Send",            args: [{ key:"to", label:"To (comma sep)", required:true }, { key:"subject", label:"Subject", required:true }, { key:"body", label:"Body", required:true }] },
  listEmailLabels:    { label: "Gmail · List Labels",     args: [] },
  // Drive
  driveListFiles:     { label: "Drive · List Files",      args: [{ key:"query", label:"Query" }, { key:"maxResults", label:"Max", default:"10" }] },
  driveCreateFolder:  { label: "Drive · Create Folder",   args: [{ key:"name", label:"Folder Name", required:true }] },
  // Calendar
  calendarListEvents: { label: "Calendar · List Events",  args: [{ key:"maxResults", label:"Max", default:"5" }] },
  calendarListCalendars: { label: "Calendar · List Cals", args: [] },
  calendarCreateEvent:{ label: "Calendar · Create Event", args: [{ key:"summary", label:"Title", required:true }, { key:"start", label:"Start ISO", required:true, default: new Date().toISOString().slice(0,16) }, { key:"end", label:"End ISO", required:true, default: new Date(Date.now()+3600000).toISOString().slice(0,16) }] },
  // YouTube
  youtubeSearch:      { label: "YouTube · Search",        args: [{ key:"query", label:"Query", required:true }, { key:"maxResults", label:"Max", default:"5" }] },
  youtubeGetVideoDetails: { label: "YouTube · Video",    args: [{ key:"videoId", label:"Video ID", required:true }] },
  // Notion
  notionListDatabases:{ label: "Notion · List DBs",       args: [] },
  notionSearchPages:  { label: "Notion · Search",         args: [{ key:"query", label:"Query", required:true }] },
  notionCreatePage:   { label: "Notion · Create Page",    args: [{ key:"title", label:"Title", required:true }, { key:"parentPageId", label:"Parent Page ID" }, { key:"content", label:"Content" }] },
  // Telegram
  telegramGetBotInfo: { label: "Telegram · Bot Info",     args: [] },
  telegramGetUpdates: { label: "Telegram · Get Updates",  args: [{ key:"limit", label:"Limit", default:"10" }] },
  telegramSendMessage:{ label: "Telegram · Send Message", args: [{ key:"chatId", label:"Chat ID / @username", required:true }, { key:"text", label:"Text", required:true }] },
  // WhatsApp
  whatsappSendMessage:{ label: "WhatsApp · Send",         args: [{ key:"to", label:"To (+xx...)", required:true }, { key:"message", label:"Message", required:true }] },
  whatsappGetMessages:{ label: "WhatsApp · History",      args: [{ key:"limit", label:"Limit", default:"10" }] },
  // LinkedIn
  getLinkedInProfile: { label: "LinkedIn · My Profile",   args: [] },
  searchJobs:         { label: "LinkedIn · Jobs",         args: [{ key:"keywords", label:"Keywords", required:true }, { key:"location", label:"Location" }] },
  searchPeople:       { label: "LinkedIn · People",       args: [{ key:"keywords", label:"Keywords", required:true }] },
  getFeedPosts:       { label: "LinkedIn · Feed",         args: [{ key:"limit", label:"Limit", default:"5" }] },
  // Discord
  discordSendMessage: { label: "Discord · Send Message", args: [{ key:"channelId", label:"Channel ID", required:true }, { key:"content", label:"Message Content", required:true }] },
  discordGetMessages: { label: "Discord · Get Messages", args: [{ key:"channelId", label:"Channel ID", required:true }, { key:"limit", label:"Limit", default:"50" }] },
  discordGetChannel: { label: "Discord · Get Channel", args: [{ key:"channelId", label:"Channel ID", required:true }] },
  discordGetGuildChannels: { label: "Discord · List Channels", args: [{ key:"guildId", label:"Guild (Server) ID", required:true }] },
  discordGetCurrentUser: { label: "Discord · Bot Info", args: [] },
  // Slack
  slackPostMessage: { label: "Slack · Send Message", args: [{ key:"channel", label:"Channel (#general or ID)", required:true }, { key:"text", label:"Message Text", required:true }] },
  slackListConversations: { label: "Slack · List Channels", args: [{ key:"types", label:"Types", default:"public_channel,private_channel" }, { key:"limit", label:"Limit", default:"100" }] },
  slackGetConversationHistory: { label: "Slack · Channel History", args: [{ key:"channel", label:"Channel ID", required:true }, { key:"limit", label:"Limit", default:"100" }] },
  slackListUsers: { label: "Slack · List Users", args: [{ key:"limit", label:"Limit", default:"100" }] },
  slackTestAuth: { label: "Slack · Test Auth", args: [] },
  // Twitch
  twitchGetUsers: { label: "Twitch · Get Users", args: [{ key:"login", label:"Usernames (comma sep)", required:true }] },
  twitchGetStreams: { label: "Twitch · Get Streams", args: [{ key:"userLogin", label:"Usernames (comma sep)" }, { key:"first", label:"Limit", default:"20" }] },
  twitchGetChannelInfo: { label: "Twitch · Channel Info", args: [{ key:"broadcasterId", label:"Broadcaster ID", required:true }] },
  twitchSearchChannels: { label: "Twitch · Search Channels", args: [{ key:"query", label:"Search Query", required:true }, { key:"first", label:"Limit", default:"20" }] },
  twitchGetTopGames: { label: "Twitch · Top Games", args: [{ key:"first", label:"Limit", default:"20" }] },
  // GitHub
  githubGetUserRepos: { label: "GitHub · My Repos", args: [{ key:"type", label:"Type", default:"all" }, { key:"perPage", label:"Per Page", default:"30" }] },
  githubGetRepo: { label: "GitHub · Get Repo", args: [{ key:"owner", label:"Owner", required:true }, { key:"repo", label:"Repo Name", required:true }] },
  githubCreateRepo: { label: "GitHub · Create Repo", args: [{ key:"name", label:"Repo Name", required:true }, { key:"description", label:"Description" }, { key:"private", label:"Private", default:"false" }] },
  githubGetIssues: { label: "GitHub · List Issues", args: [{ key:"owner", label:"Owner", required:true }, { key:"repo", label:"Repo", required:true }, { key:"state", label:"State", default:"open" }, { key:"perPage", label:"Per Page", default:"30" }] },
  githubCreateIssue: { label: "GitHub · Create Issue", args: [{ key:"owner", label:"Owner", required:true }, { key:"repo", label:"Repo", required:true }, { key:"title", label:"Title", required:true }, { key:"body", label:"Body" }] },
  githubGetPullRequests: { label: "GitHub · List PRs", args: [{ key:"owner", label:"Owner", required:true }, { key:"repo", label:"Repo", required:true }, { key:"state", label:"State", default:"open" }, { key:"perPage", label:"Per Page", default:"30" }] },
  githubCreatePullRequest: { label: "GitHub · Create PR", args: [{ key:"owner", label:"Owner", required:true }, { key:"repo", label:"Repo", required:true }, { key:"title", label:"Title", required:true }, { key:"head", label:"Head Branch", required:true }, { key:"base", label:"Base Branch", required:true }, { key:"body", label:"Body" }] },
  githubSearchRepositories: { label: "GitHub · Search Repos", args: [{ key:"query", label:"Search Query", required:true }, { key:"sort", label:"Sort", default:"stars" }, { key:"perPage", label:"Per Page", default:"30" }] },
  githubGetCurrentUser: { label: "GitHub · My Profile", args: [] },
};

export default function ToolTester({ services, onClose }: { services: ServiceInfo[]; onClose: () => void }) {
  const [selected, setSelected] = useState("searchEmails");
  const [vals,     setVals]     = useState<Record<string,string>>({});
  const [result,   setResult]   = useState<any>(null);
  const [err,      setErr]      = useState<string|null>(null);
  const [loading,  setLoading]  = useState(false);

  const tool = TOOLS[selected];
  if (!tool) {
    return <div>Error: Tool "{selected}" not found</div>;
  }

  const run = async () => {
    setLoading(true); setErr(null); setResult(null);
    try {
      const args: Record<string,any> = {};
      for (const f of tool.args) {
        const v = vals[f.key] ?? f.default ?? "";
        if (!v && f.required) { setErr(`${f.label} is required`); setLoading(false); return; }
        if (f.key === "to" && selected === "sendEmail") { args[f.key] = v.split(",").map(s => s.trim()); }
        else if (f.key === "login" && selected === "twitchGetUsers") { args[f.key] = v.split(",").map(s => s.trim()); }
        else if (f.key === "userLogin" && selected === "twitchGetStreams") { args[f.key] = v.split(",").map(s => s.trim()); }
        else if (f.key === "id" && selected === "twitchGetUsers") { args[f.key] = v.split(",").map(s => s.trim()); }
        else if (f.key === "types" && selected === "slackListConversations") { args[f.key] = v; }
        else if (f.key === "private" && selected === "githubCreateRepo") { args[f.key] = v === "true" || v === "1"; }
        else if (f.key === "labels" && selected === "githubCreateIssue") { args[f.key] = v ? v.split(",").map(s => s.trim()) : undefined; }
        else if (!isNaN(Number(v)) && v !== "" && f.key !== "channelId" && f.key !== "guildId" && f.key !== "messageId" && f.key !== "channel" && f.key !== "owner" && f.key !== "repo" && f.key !== "broadcasterId" && f.key !== "ts" && f.key !== "head" && f.key !== "base") { args[f.key] = Number(v); }
        else if (v) { args[f.key] = v; }
      }
      
      // Make request with rate limit handling
      let retries = 3;
      let waitTime = 1000; // Start with 1 second
      
      while (retries > 0) {
        try {
          const response = await fetch('/api/tools/invoke', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tool: selected, args })
          });
          
          // Check rate limit headers
          const remaining = response.headers.get('RateLimit-Remaining');
          const resetTime = response.headers.get('RateLimit-Reset');
          
          if (response.status === 429) {
            const data = await response.json();
            const resetTimestamp = resetTime ? parseInt(resetTime) * 1000 : Date.now() + 60000;
            const waitMs = Math.max(1000, resetTimestamp - Date.now());
            
            if (retries > 1) {
              setErr(`⏳ Rate limit exceeded. Waiting ${Math.ceil(waitMs/1000)}s before retry... (${retries-1} retries left)`);
              await new Promise(resolve => setTimeout(resolve, waitMs));
              retries--;
              waitTime *= 2; // Exponential backoff
              continue;
            }
            throw new Error(data.error || 'Rate limit exceeded. Please wait before trying again.');
          }
          
          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || `HTTP ${response.status}`);
          }
          
          const data = await response.json();
          setResult(data);
          
          // Show rate limit info if low
          if (remaining && parseInt(remaining) < 5) {
            console.warn(`Rate limit low: ${remaining} requests remaining`);
          }
          
          return; // Success, exit retry loop
        } catch (e: any) {
          if (e.message?.includes('Rate limit') && retries > 1) {
            retries--;
            await new Promise(resolve => setTimeout(resolve, waitTime));
            waitTime *= 2;
            continue;
          }
          throw e; // Re-throw if not rate limit or out of retries
        }
      }
    } catch (e: any) {
      // Extract error message from axios error response
      const errorMsg = e.response?.data?.error || e.response?.data?.message || e.message || "Unknown error occurred";
      const toolName = e.response?.data?.tool || selected;
      
      // Provide more context in error message
      let fullError = errorMsg;
      if (toolName && toolName !== selected) {
        fullError = `[${toolName}] ${errorMsg}`;
      }
      
      // Add helpful hints for common errors
      if (errorMsg.includes("OAuth") || errorMsg.includes("not configured") || errorMsg.includes("not completed")) {
        fullError += "\n\n💡 Tip: Configure the service in the dashboard first, then try again.";
      } else if (errorMsg.includes("Rate limit") || errorMsg.includes("429") || errorMsg.includes("too many")) {
        fullError += "\n\n💡 Tip: Rate limit resets automatically. Wait a moment and try again, or increase limits in .env file.";
      }
      
      setErr(fullError);
    } finally { setLoading(false); }
  };

  return (
    <div 
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", backdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:20 }}
    >
      <div style={{ background:"var(--bg2)", border:"1px solid var(--border2)", borderRadius:12, width:"100%", maxWidth:820, maxHeight:"90vh", display:"flex", flexDirection:"column", boxShadow:"0 24px 64px rgba(0,0,0,0.7)" }}>

        {/* Header */}
        <div style={{ padding:"18px 22px", borderBottom:"1px solid var(--border)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontFamily:"var(--mono)", fontWeight:600, color:"var(--accent)", fontSize:14 }}>▶ Tool Tester</span>
          <button onClick={onClose} style={{ background:"none", color:"var(--text3)", fontSize:18 }}>✕</button>
        </div>

        <div style={{ display:"flex", flex:1, overflow:"hidden" }}>

          {/* Sidebar */}
          <div style={{ width:210, borderRight:"1px solid var(--border)", overflowY:"auto", padding:"8px 0" }}>
            {Object.entries(TOOLS).map(([key, t]) => (
              <button key={key} onClick={() => { setSelected(key); setVals({}); setResult(null); setErr(null); }}
                style={{ display:"block", width:"100%", textAlign:"left", padding:"8px 14px", background: selected===key ? "var(--bg3)" : "none", color: selected===key ? "var(--accent)" : "var(--text3)", borderLeft: `2px solid ${selected===key ? "var(--accent)" : "transparent"}`, fontSize:11, fontFamily:"var(--mono)" }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Right panel */}
          <div style={{ flex:1, overflowY:"auto", padding:22, display:"flex", flexDirection:"column", gap:16 }}>
            <div style={{ fontFamily:"var(--mono)", fontSize:13, fontWeight:600, color:"var(--text)" }}>{tool.label}</div>

            {tool.args.length > 0 && (
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                {tool.args.map(f => (
                  <div key={f.key}>
                    <label style={{ fontSize:11, color:"var(--text2)", display:"block", marginBottom:5 }}>
                      {f.label} {f.required && <span style={{ color:"var(--red)" }}>*</span>}
                    </label>
                    <input value={vals[f.key] !== undefined ? vals[f.key] : (f.default || "")} onChange={e => setVals(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.default || ""} />
                  </div>
                ))}
              </div>
            )}

            <button onClick={run} disabled={loading} style={{ background:"var(--accent)", color:"#fff", padding:"9px 20px", borderRadius:7, fontFamily:"var(--mono)", fontSize:13, fontWeight:700, alignSelf:"flex-start", opacity:loading?0.6:1 }}>
              {loading ? "Running…" : "▶ Run"}
            </button>

            {err && (
              <div style={{ background:"rgba(239,68,68,.1)", border:"1px solid rgba(239,68,68,.3)", borderRadius:8, padding:"12px 14px", color:"var(--red)", fontSize:12, fontFamily:"var(--mono)", whiteSpace:"pre-wrap", lineHeight:1.6 }}>
                ❌ {err}
              </div>
            )}

            {result && (
              <div>
                <div style={{ fontSize:10, color:"var(--green)", fontFamily:"var(--mono)", marginBottom:6 }}>✓ RESULT</div>
                <pre style={{ background:"var(--bg)", border:"1px solid var(--border)", borderRadius:8, padding:14, fontSize:11, fontFamily:"var(--mono)", color:"var(--text2)", overflow:"auto", maxHeight:280, lineHeight:1.7 }}>
                  {JSON.stringify(result.result ?? result, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
