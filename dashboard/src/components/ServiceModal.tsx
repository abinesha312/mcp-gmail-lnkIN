import { useState, useEffect } from "react";
import { fetchService, saveService, deleteService } from "../hooks/useApi.ts";
import type { ServiceInfo, Field } from "../hooks/useApi.ts";
import { useToast } from "../App.tsx";

export default function ServiceModal({ serviceId, onClose, onSave }: {
  serviceId: string;
  onClose:   () => void;
  onSave:    () => void;
}) {
  const { toast } = useToast();
  const [svc,     setSvc]     = useState<(ServiceInfo & { credentials: Record<string,string> }) | null>(null);
  const [vals,    setVals]    = useState<Record<string,string>>({});
  const [saving,  setSaving]  = useState(false);
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    fetchService(serviceId)
      .then(s => { setSvc(s); setVals(s.credentials || {}); })
      .catch(() => toast("Failed to load service", "error"));
  }, [serviceId, toast]);

  const handleSave = async () => {
    if (!svc) return;
    setSaving(true);
    try {
      await saveService(serviceId, vals);
      onSave(); onClose();
    } catch (e: any) {
      toast(e.response?.data?.error || "Save failed", "error");
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    await deleteService(serviceId).catch(() => {});
    toast("Credentials removed", "info");
    onSave(); onClose();
  };

  if (!svc) return (
    <Overlay onClick={onClose}>
      <Box onClick={e => e.stopPropagation()}>
        <div style={{ padding:40, textAlign:"center", color:"var(--text3)", fontFamily:"var(--mono)" }}>Loading…</div>
      </Box>
    </Overlay>
  );

  return (
    <Overlay onClick={onClose}>
      <Box onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding:"22px 26px 18px", borderBottom:"1px solid var(--border)", display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div>
            <div style={{ fontWeight:600, fontSize:15 }}>{svc.label}</div>
            <div style={{ fontFamily:"var(--mono)", fontSize:10, color:"var(--text3)", marginTop:3 }}>
              {svc.authType.toUpperCase()} · {svc.configured ? "Configured" : "Not set up"}
            </div>
          </div>
          <button onClick={onClose} style={{ background:"none", color:"var(--text3)", fontSize:18, lineHeight:1 }}>✕</button>
        </div>

        {/* OAuth banner */}
        {svc.authType === "oauth" && (
          <div style={{ margin:"18px 26px 0", background: svc.hasOAuth ? "rgba(34,217,138,.07)" : "rgba(245,197,24,.07)", border:`1px solid ${svc.hasOAuth ? "rgba(34,217,138,.2)" : "rgba(245,197,24,.2)"}`, borderRadius:8, padding:"12px 16px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div>
              <div style={{ fontSize:13, fontWeight:500, color: svc.hasOAuth ? "var(--green)" : "var(--yellow)" }}>
                {svc.hasOAuth ? "✓ OAuth Connected" : "⚠ OAuth Required"}
              </div>
              <div style={{ fontSize:11, color:"var(--text3)", marginTop:2 }}>
                {svc.hasOAuth ? "Token encrypted in DB" : "Save credentials first, then connect"}
              </div>
            </div>
            {svc.oauthUrl && (
              <a href={svc.oauthUrl} target="_blank" rel="noreferrer" style={{
                background: svc.hasOAuth ? "var(--bg3)" : "var(--accent)",
                color: svc.hasOAuth ? "var(--text2)" : "#fff",
                padding:"7px 14px", borderRadius:6, fontSize:12, fontWeight:500, whiteSpace:"nowrap"
              }}>
                {svc.hasOAuth ? "Re-connect" : "Connect →"}
              </a>
            )}
          </div>
        )}

        {/* Fields */}
        <div style={{ padding:"20px 26px", display:"flex", flexDirection:"column", gap:16, overflowY:"auto", maxHeight:"52vh" }}>
          {svc.fields.map(f => (
            <FieldRow key={f.key} field={f} value={vals[f.key] || ""} onChange={v => setVals(p => ({ ...p, [f.key]: v }))} />
          ))}
          <SetupGuide id={serviceId} />
        </div>

        {/* Footer */}
        <div style={{ padding:"14px 26px", borderTop:"1px solid var(--border)", display:"flex", alignItems:"center", gap:10 }}>
          <button onClick={handleSave} disabled={saving} style={{ background:"var(--accent)", color:"#fff", padding:"8px 18px", borderRadius:7, fontSize:13, fontWeight:600, opacity:saving?0.6:1 }}>
            {saving ? "Saving…" : "Save Encrypted"}
          </button>
          {svc.configured && !confirm && (
            <button onClick={() => setConfirm(true)} style={{ background:"transparent", border:"1px solid var(--border2)", color:"var(--text3)", padding:"8px 14px", borderRadius:7, fontSize:12 }}>
              Remove
            </button>
          )}
          {confirm && (
            <>
              <button onClick={handleDelete} style={{ background:"var(--red)", color:"#fff", padding:"8px 14px", borderRadius:7, fontSize:12, fontWeight:600 }}>Confirm Remove</button>
              <button onClick={() => setConfirm(false)} style={{ background:"transparent", border:"1px solid var(--border2)", color:"var(--text3)", padding:"8px 14px", borderRadius:7, fontSize:12 }}>Cancel</button>
            </>
          )}
          <div style={{ flex:1 }} />
          <span style={{ fontSize:11, color:"var(--text3)" }}>🔒 AES-256-GCM</span>
        </div>
      </Box>
    </Overlay>
  );
}

function FieldRow({ field, value, onChange }: { field: Field; value: string; onChange: (v:string) => void }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label style={{ fontSize:11, color:"var(--text2)", display:"block", marginBottom:5, fontWeight:500 }}>{field.label}</label>
      <div style={{ position:"relative" }}>
        <input type={field.secret && !show ? "password" : "text"} value={value} onChange={e => onChange(e.target.value)}
          placeholder={field.hint || ""} autoComplete="off" spellCheck={false}
          style={{ paddingRight: field.secret ? 48 : 12 }} />
        {field.secret && (
          <button onClick={() => setShow(!show)} style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", background:"none", color:"var(--text3)", fontSize:11 }}>
            {show ? "hide" : "show"}
          </button>
        )}
      </div>
      {field.hint && !value && (
        <div style={{ fontSize:11, color:"var(--text3)", marginTop:4, fontFamily:"var(--mono)" }}>↳ {field.hint}</div>
      )}
    </div>
  );
}

const GUIDES: Record<string, Array<{ step: string; url?: string }>> = {
  google: [
    { step: "Go to Google Cloud Console → APIs & Services → Credentials", url: "https://console.cloud.google.com" },
    { step: "Create OAuth 2.0 Client ID (Desktop app) → Download JSON" },
    { step: "Enable: Gmail API, Drive API, Calendar API, YouTube Data API v3" },
    { step: "Set Redirect URI: http://localhost:3001/auth/google/callback" },
  ],
  notion: [
    { step: "Go to notion.so/my-integrations → New integration", url: "https://www.notion.so/my-integrations" },
    { step: "Copy the Internal Integration Token" },
    { step: "Share your pages/databases with the integration from the Notion sidebar" },
  ],
  telegram: [
    { step: "Message @BotFather on Telegram → /newbot", url: "https://t.me/botfather" },
    { step: "Copy the token after bot creation" },
    { step: "To get your chat_id: message your bot, then call getUpdates" },
  ],
  whatsapp_twilio: [
    { step: "Sign up at twilio.com → Console → Messaging → WhatsApp Sandbox", url: "https://www.twilio.com/console" },
    { step: "Copy Account SID and Auth Token from dashboard" },
  ],
  whatsapp_meta: [
    { step: "Go to developers.facebook.com → WhatsApp Business API", url: "https://developers.facebook.com" },
    { step: "Get a permanent access token and your Phone Number ID" },
  ],
  linkedin: [
    { step: "Use your LinkedIn email + LinkedIn password (not Google SSO)" },
    { step: "If you only use Google SSO, add a LinkedIn password in Account Settings", url: "https://www.linkedin.com/mypreferences/d/security" },
  ],
};

function SetupGuide({ id }: { id: string }) {
  const guide = GUIDES[id];
  if (!guide) return null;
  return (
    <div style={{ background:"var(--bg)", border:"1px solid var(--border)", borderRadius:8, padding:"12px 14px", marginTop:4 }}>
      <div style={{ fontSize:10, color:"var(--text3)", fontFamily:"var(--mono)", letterSpacing:"0.1em", marginBottom:10 }}>SETUP GUIDE</div>
      {guide.map((g, i) => (
        <div key={i} style={{ display:"flex", gap:8, marginBottom:7 }}>
          <span style={{ fontFamily:"var(--mono)", color:"var(--accent)", fontSize:11, flexShrink:0 }}>{i+1}.</span>
          <span style={{ fontSize:12, color:"var(--text2)" }}>
            {g.step}
            {g.url && <> · <a href={g.url} target="_blank" rel="noreferrer" style={{ fontSize:11 }}>Open ↗</a></>}
          </span>
        </div>
      ))}
    </div>
  );
}

function Overlay({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <div onClick={onClick} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", backdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:20 }}>
      {children}
    </div>
  );
}

function Box({ children, onClick }: { children: React.ReactNode; onClick: (e:React.MouseEvent) => void }) {
  return (
    <div onClick={onClick} style={{ background:"var(--bg2)", border:"1px solid var(--border2)", borderRadius:12, width:"100%", maxWidth:540, maxHeight:"90vh", display:"flex", flexDirection:"column", boxShadow:"0 24px 64px rgba(0,0,0,0.7)" }}>
      {children}
    </div>
  );
}
