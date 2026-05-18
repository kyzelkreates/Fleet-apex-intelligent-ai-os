// Fleet Apex Driver PWA — Login
import React, { useState } from "react";

export default function Login({ branding, onLogin }: { branding: any; onLogin: () => void }) {
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  const accent = branding.accentColor || "#00D4FF";

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      const res = await fetch("/api/auth/driver/login", { method: "POST", body: JSON.stringify({ email, password }), headers: { "Content-Type": "application/json" } });
      if (res.ok) onLogin();
      else setError("Invalid credentials. Contact your dispatcher.");
    } catch { setError("Connection error. Try again."); }
    setLoading(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(180deg, #050E1A 0%, #0A1628 100%)`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "Inter, sans-serif" }}>
      <div style={{ width: 72, height: 72, borderRadius: 18, background: `linear-gradient(135deg, #0A1628, ${accent})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, marginBottom: 16, boxShadow: `0 8px 32px ${accent}40` }}>🚛</div>
      <h1 style={{ color: "#fff", fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>{branding.appName}</h1>
      <p style={{ color: accent, fontSize: 12, margin: "0 0 36px" }}>Driver App</p>
      <div style={{ width: "100%", maxWidth: 380, background: "rgba(13,31,53,0.9)", borderRadius: 20, padding: 28, border: "1px solid rgba(255,255,255,0.07)" }}>
        <h2 style={{ color: "#fff", fontSize: 17, fontWeight: 700, margin: "0 0 20px" }}>Sign in</h2>
        <form onSubmit={handleLogin}>
          <label style={{ color: "#8899AA", fontSize: 12, display: "block", marginBottom: 6 }}>Email</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" style={{ width: "100%", background: "#050E1A", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 12, padding: "13px 16px", color: "#fff", fontSize: 14, boxSizing: "border-box", outline: "none", marginBottom: 14 }} />
          <label style={{ color: "#8899AA", fontSize: 12, display: "block", marginBottom: 6 }}>Password</label>
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" style={{ width: "100%", background: "#050E1A", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 12, padding: "13px 16px", color: "#fff", fontSize: 14, boxSizing: "border-box", outline: "none", marginBottom: 20 }} />
          {error && <div style={{ background: "rgba(255,59,59,0.1)", border: "1px solid #FF3B3B33", borderRadius: 10, padding: "10px 14px", color: "#FF3B3B", fontSize: 13, marginBottom: 16 }}>{error}</div>}
          <button type="submit" disabled={loading} style={{ width: "100%", background: `linear-gradient(135deg, #0A1628, ${accent})`, color: "#fff", border: "none", borderRadius: 12, padding: "14px", fontWeight: 700, fontSize: 15, cursor: loading ? "not-allowed" : "pointer", boxShadow: `0 4px 20px ${accent}40` }}>
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
