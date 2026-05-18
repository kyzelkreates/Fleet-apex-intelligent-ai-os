// Fleet Apex Admin — White-Label Branding Control Panel
import React, { useState, useEffect } from "react";

interface BrandingState {
  appName: string;
  logo: string;
  logoDark: string;
  favicon: string;
  pwaIcon: string;
  splashScreen: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontPreference: string;
  darkMode: "dark" | "light" | "auto";
  welcomeMessage: string;
  supportEmail: string;
  supportPhone: string;
  websiteUrl: string;
  customCss: string;
}

const DEFAULT: BrandingState = {
  appName: "Fleet Apex",
  logo: "", logoDark: "", favicon: "", pwaIcon: "", splashScreen: "",
  primaryColor: "#0A1628",
  secondaryColor: "#1E3A5F",
  accentColor: "#00D4FF",
  fontPreference: "Inter",
  darkMode: "dark",
  welcomeMessage: "Welcome to your Fleet Dashboard",
  supportEmail: "", supportPhone: "", websiteUrl: "",
  customCss: "",
};

const FONTS = ["Inter", "Roboto", "Poppins", "DM Sans", "Nunito", "Source Sans Pro"];

export default function BrandingPage() {
  const [branding, setBranding] = useState<BrandingState>(DEFAULT);
  const [preview, setPreview] = useState<"dashboard" | "mobile" | "login" | "report">("dashboard");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<"identity" | "colors" | "assets" | "advanced">("identity");

  useEffect(() => {
    fetchBranding();
  }, []);

  async function fetchBranding() {
    try {
      const res = await fetch("/api/branding");
      if (res.ok) setBranding(await res.json());
    } catch {}
  }

  async function saveBranding() {
    setSaving(true);
    try {
      await fetch("/api/branding", {
        method: "PUT",
        body: JSON.stringify(branding),
        headers: { "Content-Type": "application/json" },
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {}
    setSaving(false);
  }

  function update(key: keyof BrandingState, value: string) {
    setBranding((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      {/* ── Left: Controls ── */}
      <div style={{ width: 420, flexShrink: 0, padding: 24, overflowY: "auto", borderRight: "1px solid rgba(255,255,255,0.06)" }}>
        <h2 style={{ color: "#fff", margin: "0 0 4px" }}>🎨 Branding</h2>
        <p style={{ color: "#8899AA", fontSize: 13, margin: "0 0 24px" }}>
          Customise the look and feel of your fleet platform.
        </p>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 24, background: "#0D1F35", borderRadius: 10, padding: 4 }}>
          {(["identity", "colors", "assets", "advanced"] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              flex: 1, background: activeTab === tab ? "rgba(0,212,255,0.15)" : "transparent",
              border: activeTab === tab ? "1px solid #00D4FF" : "1px solid transparent",
              color: activeTab === tab ? "#00D4FF" : "#8899AA",
              borderRadius: 8, padding: "8px 4px", fontSize: 11,
              cursor: "pointer", textTransform: "capitalize", fontFamily: "Inter, sans-serif",
            }}>{tab}</button>
          ))}
        </div>

        {/* ── Identity ── */}
        {activeTab === "identity" && (
          <div style={{ display: "grid", gap: 16 }}>
            <Field label="App / Platform Name">
              <input value={branding.appName} onChange={(e) => update("appName", e.target.value)} style={input} />
            </Field>
            <Field label="Welcome Message">
              <input value={branding.welcomeMessage} onChange={(e) => update("welcomeMessage", e.target.value)} style={input} />
            </Field>
            <Field label="Support Email">
              <input type="email" value={branding.supportEmail} onChange={(e) => update("supportEmail", e.target.value)} style={input} />
            </Field>
            <Field label="Support Phone">
              <input value={branding.supportPhone} onChange={(e) => update("supportPhone", e.target.value)} style={input} />
            </Field>
            <Field label="Website URL">
              <input value={branding.websiteUrl} onChange={(e) => update("websiteUrl", e.target.value)} style={input} />
            </Field>
            <Field label="Font">
              <select value={branding.fontPreference} onChange={(e) => update("fontPreference", e.target.value)} style={input}>
                {FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </Field>
            <Field label="Theme Mode">
              <select value={branding.darkMode} onChange={(e) => update("darkMode", e.target.value as any)} style={input}>
                <option value="dark">Dark Mode</option>
                <option value="light">Light Mode</option>
                <option value="auto">Auto (System)</option>
              </select>
            </Field>
          </div>
        )}

        {/* ── Colors ── */}
        {activeTab === "colors" && (
          <div style={{ display: "grid", gap: 16 }}>
            <ColorField label="Primary Color" value={branding.primaryColor} onChange={(v) => update("primaryColor", v)} />
            <ColorField label="Secondary Color" value={branding.secondaryColor} onChange={(v) => update("secondaryColor", v)} />
            <ColorField label="Accent Color" value={branding.accentColor} onChange={(v) => update("accentColor", v)} />

            {/* Preset themes */}
            <div>
              <div style={{ color: "#8899AA", fontSize: 12, marginBottom: 10 }}>Quick Presets</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {PRESETS.map((preset) => (
                  <button key={preset.name} onClick={() => {
                    update("primaryColor", preset.primary);
                    update("secondaryColor", preset.secondary);
                    update("accentColor", preset.accent);
                  }} style={{
                    borderRadius: 8, border: "none", cursor: "pointer",
                    overflow: "hidden", padding: 0,
                  }}>
                    <div style={{
                      display: "flex", width: 60, height: 32,
                      background: `linear-gradient(135deg, ${preset.primary}, ${preset.accent})`,
                    }} title={preset.name} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Assets ── */}
        {activeTab === "assets" && (
          <div style={{ display: "grid", gap: 16 }}>
            <UploadField label="Logo (Light background)" value={branding.logo} onChange={(v) => update("logo", v)} />
            <UploadField label="Logo (Dark background)" value={branding.logoDark} onChange={(v) => update("logoDark", v)} />
            <UploadField label="Favicon" value={branding.favicon} onChange={(v) => update("favicon", v)} />
            <UploadField label="PWA / App Icon" value={branding.pwaIcon} onChange={(v) => update("pwaIcon", v)} hint="512×512 PNG recommended" />
            <UploadField label="Splash Screen" value={branding.splashScreen} onChange={(v) => update("splashScreen", v)} hint="1242×2688 for full-screen" />
          </div>
        )}

        {/* ── Advanced ── */}
        {activeTab === "advanced" && (
          <div style={{ display: "grid", gap: 16 }}>
            <Field label="Custom CSS">
              <textarea
                value={branding.customCss}
                onChange={(e) => update("customCss", e.target.value)}
                rows={8}
                placeholder=":root { --my-custom-var: #fff; }"
                style={{ ...input, resize: "vertical", fontFamily: "monospace", fontSize: 12 }}
              />
            </Field>
            <div style={{ background: "rgba(255,149,0,0.08)", border: "1px solid #FF9500", borderRadius: 10, padding: 12 }}>
              <div style={{ color: "#FF9500", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>⚠️ Advanced Feature</div>
              <div style={{ color: "#8899AA", fontSize: 12 }}>Custom CSS is applied globally. Test in preview before saving.</div>
            </div>
          </div>
        )}

        {/* Save */}
        <button onClick={saveBranding} disabled={saving} style={{
          marginTop: 24, background: saved ? "#34C759" : "linear-gradient(135deg, #0A1628, #00D4FF)",
          color: "#fff", border: "none", borderRadius: 12, padding: "14px 24px",
          fontWeight: 700, fontSize: 14, cursor: "pointer", width: "100%",
          fontFamily: "Inter, sans-serif", transition: "all 0.3s ease",
        }}>
          {saving ? "Saving…" : saved ? "✅ Saved!" : "Save Branding"}
        </button>

        <button onClick={fetchBranding} style={{
          marginTop: 10, background: "transparent", border: "1px solid rgba(255,255,255,0.1)",
          color: "#8899AA", borderRadius: 12, padding: "10px 24px",
          fontWeight: 500, fontSize: 13, cursor: "pointer", width: "100%",
          fontFamily: "Inter, sans-serif",
        }}>
          ↩ Reset to Saved
        </button>
      </div>

      {/* ── Right: Live Preview ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Preview tabs */}
        <div style={{ display: "flex", gap: 4, padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          {(["dashboard", "mobile", "login", "report"] as const).map((tab) => (
            <button key={tab} onClick={() => setPreview(tab)} style={{
              background: preview === tab ? "rgba(0,212,255,0.1)" : "transparent",
              border: `1px solid ${preview === tab ? "#00D4FF" : "rgba(255,255,255,0.1)"}`,
              color: preview === tab ? "#00D4FF" : "#8899AA",
              borderRadius: 8, padding: "6px 16px", fontSize: 12,
              cursor: "pointer", textTransform: "capitalize", fontFamily: "Inter, sans-serif",
            }}>{tab}</button>
          ))}
          <span style={{ marginLeft: "auto", color: "#8899AA", fontSize: 11, alignSelf: "center" }}>
            🔴 Live Preview
          </span>
        </div>

        {/* Preview pane */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, overflow: "auto" }}>
          <BrandingPreview branding={branding} mode={preview} />
        </div>
      </div>
    </div>
  );
}

// ── Preview Components ────────────────────────────────────────────
function BrandingPreview({ branding, mode }: { branding: BrandingState; mode: string }) {
  const accent = branding.accentColor || "#00D4FF";
  const primary = branding.primaryColor || "#0A1628";

  if (mode === "dashboard") return (
    <div style={{ width: 680, background: primary, borderRadius: 16, overflow: "hidden", boxShadow: "0 24px 64px rgba(0,0,0,0.6)" }}>
      {/* Nav bar */}
      <div style={{ background: primary, padding: "12px 20px", display: "flex", alignItems: "center", gap: 12, borderBottom: `1px solid ${accent}22` }}>
        <div style={{ width: 28, height: 28, borderRadius: 6, background: `linear-gradient(135deg, ${primary}, ${accent})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, fontWeight: 700 }}>
          {branding.logo ? <img src={branding.logo} style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : "FA"}
        </div>
        <span style={{ color: "#fff", fontWeight: 700, fontSize: 13, fontFamily: branding.fontPreference }}>{branding.appName}</span>
        <span style={{ marginLeft: "auto", color: accent, fontSize: 11 }}>Intelligence Driving Every Journey</span>
      </div>
      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, padding: 16 }}>
        {["🚛 24 Active", "📍 6 Hazards", "✅ 98% On Time", "⚠️ 2 Alerts"].map((s, i) => (
          <div key={i} style={{ background: `${accent}0A`, border: `1px solid ${accent}22`, borderRadius: 10, padding: "12px 8px", textAlign: "center" }}>
            <div style={{ color: "#fff", fontSize: 11, fontFamily: branding.fontPreference }}>{s}</div>
          </div>
        ))}
      </div>
      {/* Map placeholder */}
      <div style={{ height: 140, background: `linear-gradient(135deg, #0D1F35, #1E3A5F)`, margin: "0 16px 16px", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: accent, fontSize: 28 }}>🗺️ Live Fleet Map</span>
      </div>
    </div>
  );

  if (mode === "login") return (
    <div style={{ width: 380, background: primary, borderRadius: 20, overflow: "hidden", boxShadow: "0 24px 64px rgba(0,0,0,0.6)" }}>
      <div style={{ background: `linear-gradient(135deg, ${primary}, ${branding.secondaryColor})`, padding: "40px 32px", textAlign: "center" }}>
        <div style={{ width: 64, height: 64, borderRadius: 16, background: accent, margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>
          {branding.logo ? <img src={branding.logo} style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : "🚛"}
        </div>
        <h2 style={{ color: "#fff", margin: "0 0 4px", fontFamily: branding.fontPreference }}>{branding.appName}</h2>
        <p style={{ color: accent, fontSize: 12, margin: 0 }}>{branding.welcomeMessage}</p>
      </div>
      <div style={{ padding: 24, display: "grid", gap: 12 }}>
        <div style={{ background: `${accent}0A`, border: `1px solid ${accent}22`, borderRadius: 10, padding: "12px 16px", color: "#8899AA", fontSize: 13 }}>Email address</div>
        <div style={{ background: `${accent}0A`, border: `1px solid ${accent}22`, borderRadius: 10, padding: "12px 16px", color: "#8899AA", fontSize: 13 }}>Password</div>
        <div style={{ background: accent, borderRadius: 10, padding: "12px 16px", color: primary, fontSize: 13, fontWeight: 700, textAlign: "center", fontFamily: branding.fontPreference }}>Sign In</div>
      </div>
    </div>
  );

  if (mode === "mobile") return (
    <div style={{ width: 280, background: primary, borderRadius: 24, overflow: "hidden", boxShadow: "0 24px 64px rgba(0,0,0,0.6)", border: "4px solid #333" }}>
      <div style={{ background: accent, padding: "8px 16px", textAlign: "center" }}>
        <span style={{ color: primary, fontSize: 11, fontWeight: 700 }}>{branding.appName} Driver</span>
      </div>
      <div style={{ padding: 16 }}>
        {["🗺️ Navigation", "⚠️ Report Hazard", "💬 Messages", "👤 Profile"].map((item, i) => (
          <div key={i} style={{ background: `${accent}0A`, border: `1px solid ${accent}15`, borderRadius: 10, padding: "12px 14px", marginBottom: 8, color: "#fff", fontSize: 13, fontFamily: branding.fontPreference }}>{item}</div>
        ))}
      </div>
      <div style={{ background: `${primary}EE`, borderTop: `1px solid ${accent}22`, display: "flex", justifyContent: "space-around", padding: "10px 0" }}>
        {["🗺️", "⚠️", "💬", "👤"].map((icon, i) => (
          <span key={i} style={{ fontSize: 20, color: i === 0 ? accent : "#8899AA" }}>{icon}</span>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ width: 600, background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 16px 48px rgba(0,0,0,0.4)" }}>
      <div style={{ background: primary, color: "#fff", padding: "16px 24px", display: "flex", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16, fontFamily: branding.fontPreference }}>{branding.appName}</div>
          <div style={{ color: accent, fontSize: 11 }}>Fleet Safety Report</div>
        </div>
        <div style={{ textAlign: "right", fontSize: 12, color: "#8899AA" }}>{new Date().toLocaleDateString("en-GB")}</div>
      </div>
      <div style={{ padding: 24, color: "#333" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
          {["24 Vehicles", "98% Compliance", "6 Hazards"].map((s, i) => (
            <div key={i} style={{ background: `${primary}08`, border: `1px solid ${primary}20`, borderRadius: 8, padding: "10px", textAlign: "center", fontSize: 12, fontFamily: branding.fontPreference }}>{s}</div>
          ))}
        </div>
        <div style={{ height: 80, background: `${primary}08`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#aaa", fontSize: 12 }}>Chart area</div>
      </div>
    </div>
  );
}

// ── Form helpers ──────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ color: "#8899AA", fontSize: 12, display: "block", marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label style={{ color: "#8899AA", fontSize: 12, display: "block", marginBottom: 6 }}>{label}</label>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} style={{ width: 48, height: 36, borderRadius: 8, border: "none", cursor: "pointer", background: "none" }} />
        <input value={value} onChange={(e) => onChange(e.target.value)} style={{ ...input, flex: 1, marginBottom: 0 }} />
      </div>
    </div>
  );
}

function UploadField({ label, value, onChange, hint }: { label: string; value: string; onChange: (v: string) => void; hint?: string }) {
  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => onChange(ev.target?.result as string);
    reader.readAsDataURL(f);
  }
  return (
    <div>
      <label style={{ color: "#8899AA", fontSize: 12, display: "block", marginBottom: 6 }}>{label}</label>
      {hint && <div style={{ color: "#556677", fontSize: 11, marginBottom: 6 }}>{hint}</div>}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        {value && <img src={value} alt="" style={{ width: 40, height: 40, objectFit: "contain", borderRadius: 6, background: "#1E3A5F" }} />}
        <label style={{
          flex: 1, background: "#0D1F35", border: "1px dashed rgba(0,212,255,0.3)",
          borderRadius: 10, padding: "10px 16px", color: "#00D4FF",
          fontSize: 12, cursor: "pointer", textAlign: "center",
        }}>
          📁 Upload Image
          <input type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
        </label>
      </div>
    </div>
  );
}

const PRESETS = [
  { name: "Fleet Apex", primary: "#0A1628", secondary: "#1E3A5F", accent: "#00D4FF" },
  { name: "Midnight", primary: "#0D0D0D", secondary: "#1A1A2E", accent: "#E94560" },
  { name: "Forest", primary: "#0B2A1A", secondary: "#1A4A2E", accent: "#4CAF50" },
  { name: "Corporate", primary: "#1C2B4A", secondary: "#2D3E6B", accent: "#4A90D9" },
  { name: "Amber", primary: "#1A0E00", secondary: "#2D1B00", accent: "#FF9500" },
  { name: "Purple", primary: "#12052E", secondary: "#1E0A4E", accent: "#9B59B6" },
];

const input: React.CSSProperties = {
  width: "100%", background: "#0D1F35",
  border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10,
  padding: "10px 14px", color: "#fff", fontSize: 13,
  fontFamily: "Inter, sans-serif", boxSizing: "border-box",
  marginBottom: 0, outline: "none",
};
