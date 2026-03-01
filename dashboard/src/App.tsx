import { useState, useEffect, createContext, useContext, useCallback } from "react";
import { fetchServices, type ServiceInfo } from "./hooks/useApi.ts";
import Dashboard    from "./pages/Dashboard.tsx";
import ServiceModal from "./components/ServiceModal.tsx";
import ToolTester   from "./components/ToolTester.tsx";
import DocumentationModal from "./components/DocumentationModal.tsx";
import { useTheme } from "./contexts/ThemeContext.tsx";

// ── Toast ─────────────────────────────────────────────────────────────────────
interface Toast { id: number; msg: string; type: "success" | "error" | "info" }
interface ToastCtx { toast: (msg: string, type?: Toast["type"]) => void }
export const ToastContext = createContext<ToastCtx>({ toast: () => {} });
export const useToast = () => useContext(ToastContext);

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const [services,      setServices]      = useState<ServiceInfo[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [selectedSvc,   setSelectedSvc]   = useState<string | null>(null);
  const [showTester,    setShowTester]    = useState(false);
  const [showDocs,      setShowDocs]      = useState(false);
  const [toasts,        setToasts]        = useState<Toast[]>([]);

  const toast = useCallback((msg: string, type: Toast["type"] = "info") => {
    const id = Date.now();
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3800);
  }, []);

  const load = useCallback(async () => {
    try {
      setServices(await fetchServices());
    } catch {
      toast("API not reachable. Run: npm run dev:api", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
    const p = new URLSearchParams(window.location.search);
    if (p.get("success")) { toast(p.get("success")!, "success"); window.history.replaceState({}, "", "/"); }
    if (p.get("error"))   { toast(p.get("error")!,   "error");   window.history.replaceState({}, "", "/"); }
  }, [load, toast]);

  return (
    <ToastContext.Provider value={{ toast }}>
      <div style={{ display:"flex", flexDirection:"column", height:"100vh", overflow:"hidden" }}>

        {/* Header */}
        <header style={{ background:"var(--bg2)", borderBottom:"1px solid var(--border)", padding:"0 28px", height:54, display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontFamily:"var(--mono)", fontSize:16, color:"var(--accent)", fontWeight:600 }}>⬡ MCP</span>
            <span style={{ color:"var(--text3)", fontSize:12 }}>Control Center</span>
          </div>
          <div style={{ display:"flex", gap:10, alignItems:"center" }}>
            <button 
              onClick={() => setShowDocs(true)}
              style={{ 
                background: "var(--bg3)", 
                border: "1px solid var(--border2)", 
                color: "var(--text2)", 
                padding: 0, 
                borderRadius: 6, 
                fontSize: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 36,
                height: 36,
                transition: "all 0.2s",
                cursor: "pointer",
                fontWeight: 600
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--bg2)";
                e.currentTarget.style.borderColor = "var(--accent)";
                e.currentTarget.style.color = "var(--accent)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--bg3)";
                e.currentTarget.style.borderColor = "var(--border2)";
                e.currentTarget.style.color = "var(--text2)";
              }}
              title="Documentation & Help"
              aria-label="Open documentation"
            >
              ℹ️
            </button>
            <button 
              onClick={toggleTheme}
              style={{ 
                background: "var(--bg3)", 
                border: "1px solid var(--border2)", 
                color: "var(--text2)", 
                padding: 0, 
                borderRadius: 6, 
                fontSize: 18,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 36,
                height: 36,
                transition: "all 0.2s",
                cursor: "pointer"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--bg2)";
                e.currentTarget.style.borderColor = "var(--accent)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--bg3)";
                e.currentTarget.style.borderColor = "var(--border2)";
              }}
              title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
            <button onClick={() => setShowTester(true)} style={{ background:"var(--bg3)", border:"1px solid var(--border2)", color:"var(--text2)", padding:"6px 14px", borderRadius:6, fontSize:12, fontFamily:"var(--mono)" }}>
              ▶ Tool Tester
            </button>
            <span style={{ fontFamily:"var(--mono)", fontSize:10, color:"var(--text3)" }}>:5173</span>
          </div>
        </header>

        {/* Body */}
        {loading
          ? <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:14 }}>
              <span style={{ fontFamily:"var(--mono)", fontSize:28, color:"var(--accent)", animation:"pulse 1.4s infinite" }}>⬡</span>
              <span style={{ color:"var(--text3)", fontSize:12 }}>Connecting to API…</span>
            </div>
          : <Dashboard services={services} onSelect={setSelectedSvc} onRefresh={load} />
        }

        {/* Modals */}
        {selectedSvc && (
          <ServiceModal
            serviceId={selectedSvc}
            onClose={() => setSelectedSvc(null)}
            onSave={() => { load(); toast("Credentials saved & encrypted ✓", "success"); }}
          />
        )}
        {showTester && <ToolTester services={services} onClose={() => setShowTester(false)} />}
        {showDocs && <DocumentationModal onClose={() => setShowDocs(false)} />}

        {/* Toasts */}
        <div style={{ position:"fixed", bottom:20, right:20, display:"flex", flexDirection:"column", gap:8, zIndex:9999 }}>
          {toasts.map(t => (
            <div key={t.id} className="fadeUp" style={{
              background: t.type==="success" ? "var(--green)" : t.type==="error" ? "var(--red)" : "var(--bg3)",
              color:      t.type==="info" ? "var(--text)" : "#000",
              padding:"10px 16px", borderRadius:8, fontSize:13, fontWeight:500,
              maxWidth:340, boxShadow:"0 4px 24px rgba(0,0,0,0.5)",
              border: t.type==="info" ? "1px solid var(--border2)" : "none",
            }}>{t.msg}</div>
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}
