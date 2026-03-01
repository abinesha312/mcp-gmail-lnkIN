import type { ServiceInfo } from "../hooks/useApi.ts";

const COLORS: Record<string, string> = {
  google: "#4285f4", notion: "#e8e8e8", telegram: "#229ED9",
  whatsapp_twilio: "#25D366", whatsapp_meta: "#25D366",
  linkedin: "#0A66C2", outlook: "#0078d4",
  discord: "#5865F2", slack: "#4A154B", twitch: "#9146FF", github: "#181717",
};
const ICONS: Record<string, string> = {
  google: "G", notion: "N", telegram: "✈",
  whatsapp_twilio: "W", whatsapp_meta: "W",
  linkedin: "in", outlook: "O",
  discord: "D", slack: "S", twitch: "T", github: "GH",
};

export default function Dashboard({ services, onSelect, onRefresh }: {
  services:  ServiceInfo[];
  onSelect:  (id: string) => void;
  onRefresh: () => void;
}) {
  const configuredCount = services.filter(s => s.configured).length;
  const toolCount       = 80;

  return (
    <div style={{ flex:1, overflow:"auto", padding:"28px 32px" }}>

      {/* Stats */}
      <div style={{ display:"flex", gap:28, marginBottom:32, alignItems:"flex-end" }}>
        <div>
          <div style={{ fontFamily:"var(--mono)", fontSize:36, fontWeight:600, color:"var(--text)", lineHeight:1 }}>
            {configuredCount}<span style={{ fontSize:18, color:"var(--text3)" }}>/{services.length}</span>
          </div>
          <div style={{ color:"var(--text3)", fontSize:11, marginTop:4 }}>services configured</div>
        </div>
        <div style={{ width:1, height:36, background:"var(--border)" }} />
        <div>
          <div style={{ fontFamily:"var(--mono)", fontSize:36, fontWeight:600, color:"var(--text)", lineHeight:1 }}>{toolCount}</div>
          <div style={{ color:"var(--text3)", fontSize:11, marginTop:4 }}>MCP tools registered</div>
        </div>
        <div style={{ flex:1 }} />
        <button onClick={onRefresh} style={{ background:"transparent", border:"1px solid var(--border2)", color:"var(--text3)", padding:"7px 14px", borderRadius:6, fontSize:12 }}>
          ↻ Refresh
        </button>
      </div>

      {/* Grid */}
      <Label text="SERVICES" />
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))", gap:14, marginBottom:40 }}>
        {services.map(s => <Card key={s.id} s={s} onSelect={onSelect} />)}
      </div>

      {/* Claude Desktop config snippet */}
      <Label text="CLAUDE DESKTOP CONFIG" />
      <pre style={{ background:"var(--bg2)", border:"1px solid var(--border)", borderRadius:8, padding:"16px 20px", fontFamily:"var(--mono)", fontSize:11, color:"var(--green)", lineHeight:1.8, overflow:"auto" }}>
{`{
  "mcpServers": {
    "mcp-unified": {
      "command": "node",
      "args": ["./dist/index.js"],
      "env": { "MCP_DATA_DIR": "~/.mcp-unified" }
    }
  }
}`}
      </pre>
      <div style={{ marginTop:8, fontSize:11, color:"var(--text3)", fontFamily:"var(--mono)" }}>
        ~/Library/Application Support/Claude/claude_desktop_config.json
      </div>
    </div>
  );
}

function Label({ text }: { text: string }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
      <span style={{ fontFamily:"var(--mono)", fontSize:10, color:"var(--text3)", letterSpacing:"0.14em" }}>{text}</span>
      <div style={{ flex:1, height:1, background:"var(--border)" }} />
    </div>
  );
}

function Card({ s, onSelect }: { s: ServiceInfo; onSelect: (id:string) => void }) {
  const color = COLORS[s.id] || "var(--accent)";
  const icon  = ICONS[s.id]  || s.id[0].toUpperCase();
  const statusColor = s.configured ? (s.hasOAuth ? "var(--green)" : "var(--yellow)") : "var(--border2)";

  return (
    <div
      onClick={() => onSelect(s.id)}
      style={{
        background:"var(--bg2)", border:`1px solid var(--border)`,
        borderRadius:10, padding:20, cursor:"pointer",
        position:"relative", overflow:"hidden", transition:"all 0.15s",
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--accent)"; (e.currentTarget as HTMLDivElement).style.background = "var(--bg3)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLDivElement).style.background = "var(--bg2)"; }}
    >
      {/* top stripe */}
      <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background: s.configured ? color : "var(--border)", opacity: s.configured ? 0.7 : 0.3 }} />

      <div style={{ display:"flex", alignItems:"flex-start", gap:14 }}>
        {/* icon */}
        <div style={{ width:38, height:38, borderRadius:8, background: s.configured ? color+"18" : "var(--bg3)", border:`1px solid ${s.configured ? color+"30" : "var(--border)"}`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"var(--mono)", fontWeight:700, fontSize:13, color: s.configured ? color : "var(--text3)", flexShrink:0 }}>
          {icon}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontWeight:500, fontSize:13, color:"var(--text)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{s.label}</div>
          <div style={{ fontSize:10, color:"var(--text3)", fontFamily:"var(--mono)", marginTop:3 }}>{s.authType.toUpperCase()} · {s.keyCount} key{s.keyCount!==1?"s":""}</div>
        </div>
        {/* status dot */}
        <div style={{ width:7, height:7, borderRadius:"50%", background:statusColor, boxShadow: s.configured ? `0 0 6px ${statusColor}` : "none", flexShrink:0, marginTop:2 }} />
      </div>

      <div style={{ marginTop:14, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <span style={{ fontSize:11, color:"var(--text3)" }}>
          {s.configured ? (s.hasOAuth ? "✓ Authenticated" : "⚠ Needs OAuth") : "Not configured"}
        </span>
        <span style={{ fontSize:11, color:"var(--accent)", fontFamily:"var(--mono)" }}>Configure →</span>
      </div>
    </div>
  );
}
