// Fleet Apex Admin — Login Page (White-label aware)
import React, { useState } from "react";

interface LoginProps {
  branding: { primaryColor: string; accentColor: string; appName: string; logo: string };
  onLogin: () => void;
}

export default function LoginPage({ branding, onLogin }: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"login" | "forgot">("login");

  const accent = branding.accentColor || "#00D4FF";
  const primary = branding.primaryColor || "#0A1628";

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        onLogin();
      } else {
        const data = await res.json();
        setError(data.error || "Invalid email or password");
      }
    } catch {
      setError("Connection error. Please try again.");
    }
    setLoading(false);
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
      headers: { "Content-Type": "application/json" },
    });
    setError("If that email exists, a reset link has been sent.");
    setLoading(false);
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: `linear-gradient(135deg, ${primary} 0%, #0D1F35 50%, #050E1A 100%)`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "Inter, sans-serif", padding: 20,
    }}>
      {/* Background glow */}
      <div style={{ position: "fixed", top: "20%", left: "50%", transform: "translateX(-50%)", width: 600, height: 300, background: `radial-gradient(ellipse, ${accent}15 0%, transparent 70%)`, pointerEvents: "none" }} />

      <div style={{ width: "100%", maxWidth: 420, position: "relative" }}>
        {/* Logo / Brand */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          {branding.logo ? (
            <img src={branding.logo} alt={branding.appName} style={{ height: 64, marginBottom: 16 }} />
          ) : (
            <div style={{ width: 72, height: 72, borderRadius: 18, background: `linear-gradient(135deg, ${primary}, ${accent})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, margin: "0 auto 16px", boxShadow: `0 8px 32px ${accent}40` }}>
              🚛
            </div>
          )}
          <h1 style={{ color: "#fff", fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>{branding.appName}</h1>
          <p style={{ color: accent, fontSize: 12, margin: 0 }}>Intelligence Driving Every Journey</p>
        </div>

        {/* Card */}
        <div style={{ background: "rgba(13,31,53,0.9)", borderRadius: 20, padding: 32, border: `1px solid rgba(255,255,255,0.08)`, backdropFilter: "blur(20px)", boxShadow: "0 24px 64px rgba(0,0,0,0.4)" }}>
          <h2 style={{ color: "#fff", fontSize: 18, fontWeight: 700, margin: "0 0 24px" }}>
            {mode === "login" ? "Sign in to your fleet" : "Reset your password"}
          </h2>

          <form onSubmit={mode === "login" ? handleLogin : handleForgot}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ color: "#8899AA", fontSize: 12, display: "block", marginBottom: 6 }}>Email address</label>
              <input
                type="email" required value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                style={{ width: "100%", background: "#050E1A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "12px 16px", color: "#fff", fontSize: 14, boxSizing: "border-box", outline: "none" }}
              />
            </div>

            {mode === "login" && (
              <div style={{ marginBottom: 20 }}>
                <label style={{ color: "#8899AA", fontSize: 12, display: "block", marginBottom: 6 }}>Password</label>
                <input
                  type="password" required value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ width: "100%", background: "#050E1A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "12px 16px", color: "#fff", fontSize: 14, boxSizing: "border-box", outline: "none" }}
                />
              </div>
            )}

            {error && (
              <div style={{ background: error.includes("sent") ? "rgba(52,199,89,0.1)" : "rgba(255,59,59,0.1)", border: `1px solid ${error.includes("sent") ? "#34C759" : "#FF3B3B"}33`, borderRadius: 10, padding: "10px 14px", color: error.includes("sent") ? "#34C759" : "#FF3B3B", fontSize: 13, marginBottom: 16 }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} style={{
              width: "100%", background: loading ? "rgba(255,255,255,0.1)" : `linear-gradient(135deg, ${primary}, ${accent})`,
              color: "#fff", border: "none", borderRadius: 12,
              padding: "14px 24px", fontWeight: 700, fontSize: 15,
              cursor: loading ? "not-allowed" : "pointer", fontFamily: "Inter, sans-serif",
              boxShadow: loading ? "none" : `0 4px 24px ${accent}40`,
            }}>
              {loading ? "Please wait…" : mode === "login" ? "Sign In" : "Send Reset Link"}
            </button>
          </form>

          <div style={{ textAlign: "center", marginTop: 16 }}>
            <button onClick={() => { setMode(mode === "login" ? "forgot" : "login"); setError(""); }} style={{ background: "none", border: "none", color: accent, fontSize: 13, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
              {mode === "login" ? "Forgot your password?" : "← Back to sign in"}
            </button>
          </div>
        </div>

        {/* Driver app link */}
        <div style={{ textAlign: "center", marginTop: 20 }}>
          <a href="/driver" style={{ color: "#556677", fontSize: 12, textDecoration: "none" }}>
            Are you a driver? → Open Driver App
          </a>
        </div>
      </div>
    </div>
  );
}
