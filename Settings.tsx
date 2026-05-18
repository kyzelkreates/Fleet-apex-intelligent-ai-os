// Fleet Apex Admin — Settings Page
import React, { useState } from "react";

export default function SettingsPage() {
  const [tab, setTab] = useState<"ai"|"notifications"|"security"|"api">("ai");
  const [aiKey, setAiKey] = useState("");
  const [aiProvider, setAiProvider] = useState("openai");
  const [ollamaUrl, setOllamaUrl] = useState("http://localhost:11434");
  const [speedThreshold, setSpeedThreshold] = useState("80");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    await fetch("/api/settings", { method: "PUT", body: JSON.stringify({ aiProvider, openaiKey: aiKey, ollamaUrl, speedThreshold: parseInt(speedThreshold) }), headers: { "Content-Type": "application/json" } });
    setSaved(true); setTimeout(() => setSaved(false), 3000);
    setSaving(false);
  }

  const TABS = [{ id: "ai", label: "🧠 AI Config" }, { id: "notifications", label: "🔔 Notifications" }, { id: "security", label: "🔒 Security" }, { id: "api", label: "🔗 API Keys" }];

  return (
    <div style={{ padding: 24, maxWidth: 720, overflow: "auto", height: "100%" }}>
      <h1 style={{ color: "#fff", fontSize: 24, fontWeight: 700, margin: "0 0 24px" }}>⚙️ Settings</h1>
      <div style={{ display: "flex", gap: 4, marginBottom: 28, background: "#0D1F35", borderRadius: 10, padding: 4 }}>
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id as any)} style={{ flex: 1, background: tab === t.id ? "rgba(0,212,255,0.15)" : "transparent", border: tab === t.id ? "1px solid #00D4FF" : "1px solid transparent", color: tab === t.id ? "#00D4FF" : "#8899AA", borderRadius: 8, padding: "9px 4px", fontSize: 12, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>{t.label}</button>
        ))}
      </div>

      {tab === "ai" && (
        <div style={{ display: "grid", gap: 20 }}>
          <Section title="AI Provider">
            <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
              {["openai","ollama"].map((p) => (
                <button key={p} onClick={() => setAiProvider(p)} style={{ flex: 1, background: aiProvider === p ? "rgba(0,212,255,0.1)" : "rgba(255,255,255,0.04)", border: `1px solid ${aiProvider === p ? "#00D4FF" : "rgba(255,255,255,0.08)"}`, color: aiProvider === p ? "#00D4FF" : "#8899AA", borderRadius: 10, padding: "12px", cursor: "pointer", fontFamily: "Inter, sans-serif", fontWeight: aiProvider === p ? 700 : 400 }}>
                  {p === "openai" ? "☁️ OpenAI" : "🏠 Ollama (Local)"}
                </button>
              ))}
            </div>
            {aiProvider === "openai" && (
              <Field label="OpenAI API Key"><input type="password" value={aiKey} onChange={(e) => setAiKey(e.target.value)} placeholder="sk-..." style={inputStyle} /></Field>
            )}
            {aiProvider === "ollama" && (
              <Field label="Ollama Server URL"><input value={ollamaUrl} onChange={(e) => setOllamaUrl(e.target.value)} placeholder="http://localhost:11434" style={inputStyle} /></Field>
            )}
            <div style={{ background: "rgba(0,212,255,0.06)", border: "1px solid rgba(0,212,255,0.15)", borderRadius: 10, padding: 12 }}>
              <div style={{ color: "#00D4FF", fontSize: 11, fontWeight: 700, marginBottom: 4 }}>⚡ Fleet Apex AI Safety Layer</div>
              <div style={{ color: "#8899AA", fontSize: 11, lineHeight: 1.6 }}>All AI outputs are validated by the Fleet Apex safety layer before reaching users. Hard rules prevent dangerous routing recommendations.</div>
            </div>
          </Section>

          <Section title="Safety & Compliance Thresholds">
            <Field label="Speed Alert Threshold (km/h)">
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <input type="number" value={speedThreshold} onChange={(e) => setSpeedThreshold(e.target.value)} style={{ ...inputStyle, width: 120 }} />
                <span style={{ color: "#8899AA", fontSize: 13 }}>Alerts generated above this speed</span>
              </div>
            </Field>
          </Section>
        </div>
      )}

      {tab === "notifications" && (
        <div style={{ display: "grid", gap: 16 }}>
          <Section title="Push Notifications">
            {[["Emergency SOS alerts", true], ["Hazard reports", true], ["Compliance warnings", true], ["Route completions", false], ["Driver status changes", false]].map(([label, defaultOn]) => (
              <Toggle key={label as string} label={label as string} defaultOn={defaultOn as boolean} />
            ))}
          </Section>
          <Section title="Email Notifications">
            <Field label="Daily summary email"><input placeholder="admin@company.com" style={inputStyle} /></Field>
            {[["Critical compliance alerts", true], ["Weekly safety report", true], ["New hazard reports", false]].map(([label, defaultOn]) => (
              <Toggle key={label as string} label={label as string} defaultOn={defaultOn as boolean} />
            ))}
          </Section>
        </div>
      )}

      {tab === "security" && (
        <div style={{ display: "grid", gap: 16 }}>
          <Section title="Authentication">
            {[["Require 2FA for admins", false], ["Require 2FA for dispatchers", false], ["Auto-logout after 8 hours", true]].map(([label, defaultOn]) => (
              <Toggle key={label as string} label={label as string} defaultOn={defaultOn as boolean} />
            ))}
          </Section>
          <Section title="Driver App Security">
            {[["Require PIN to access driver app", false], ["Prevent screenshots in driver app", true], ["Lock app if SIM removed", false]].map(([label, defaultOn]) => (
              <Toggle key={label as string} label={label as string} defaultOn={defaultOn as boolean} />
            ))}
          </Section>
        </div>
      )}

      {tab === "api" && (
        <Section title="Webhook & API Access">
          <Field label="Webhook URL (for real-time events)"><input placeholder="https://your-system.com/webhook" style={inputStyle} /></Field>
          <div style={{ background: "#0D1F35", borderRadius: 12, padding: 16, marginTop: 8 }}>
            <div style={{ color: "#8899AA", fontSize: 12, marginBottom: 8 }}>Your API Key</div>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ flex: 1, background: "#050E1A", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: "10px 14px", color: "#00D4FF", fontSize: 12, fontFamily: "monospace" }}>fa_sk_••••••••••••••••</div>
              <button style={{ background: "rgba(0,212,255,0.1)", border: "1px solid #00D4FF22", color: "#00D4FF", borderRadius: 8, padding: "10px 14px", cursor: "pointer", fontSize: 12, fontFamily: "Inter, sans-serif" }}>Reveal</button>
            </div>
          </div>
        </Section>
      )}

      <button onClick={save} disabled={saving} style={{ marginTop: 32, background: saved ? "#34C759" : "linear-gradient(135deg, #0A1628, #00D4FF)", color: "#fff", border: "none", borderRadius: 12, padding: "14px 32px", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
        {saving ? "Saving…" : saved ? "✅ Saved!" : "Save Settings"}
      </button>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#0D1F35", borderRadius: 16, padding: 20, border: "1px solid rgba(255,255,255,0.04)" }}>
      <h3 style={{ color: "#fff", margin: "0 0 16px", fontSize: 14 }}>{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ color: "#8899AA", fontSize: 12, display: "block", marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}

function Toggle({ label, defaultOn }: { label: string; defaultOn: boolean }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <span style={{ color: "#fff", fontSize: 13 }}>{label}</span>
      <div onClick={() => setOn(!on)} style={{ width: 44, height: 24, borderRadius: 12, background: on ? "#00D4FF" : "rgba(255,255,255,0.1)", cursor: "pointer", position: "relative", transition: "background 0.2s" }}>
        <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: on ? 23 : 3, transition: "left 0.2s" }} />
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = { width: "100%", background: "#050E1A", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "10px 14px", color: "#fff", fontSize: 13, fontFamily: "Inter, sans-serif", boxSizing: "border-box", outline: "none" };
