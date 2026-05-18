// Fleet Apex Driver PWA — Driver Profile
import React, { useState, useEffect } from "react";

export default function DriverProfile() {
  const [driver, setDriver] = useState<any>(null);

  useEffect(() => { fetch("/api/driver/me").then(r => r.ok ? r.json() : null).then(d => d && setDriver(d)).catch(() => {}); }, []);

  const scoreColor = !driver ? "#8899AA" : driver.safetyScore >= 80 ? "#34C759" : driver.safetyScore >= 60 ? "#FF9500" : "#FF3B3B";

  return (
    <div style={{ padding: 20, paddingBottom: 100, minHeight: "100vh", background: "#050E1A" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button onClick={() => window.history.back()} style={{ background: "none", border: "none", color: "#fff", fontSize: 22, cursor: "pointer" }}>←</button>
        <h1 style={{ color: "#fff", fontSize: 20, fontWeight: 700, margin: 0 }}>👤 My Profile</h1>
      </div>

      {/* Avatar + name */}
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ width: 80, height: 80, borderRadius: "50%", background: "linear-gradient(135deg, #1E3A5F, #00D4FF)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, margin: "0 auto 12px" }}>👤</div>
        <div style={{ color: "#fff", fontSize: 20, fontWeight: 700 }}>{driver?.name || "Loading…"}</div>
        <div style={{ color: "#8899AA", fontSize: 13, marginTop: 4 }}>{driver?.vehicleReg ? `🚛 ${driver.vehicleReg}` : "No vehicle assigned"}</div>
      </div>

      {/* Safety score */}
      <div style={{ background: `${scoreColor}10`, border: `2px solid ${scoreColor}33`, borderRadius: 16, padding: 20, marginBottom: 20, textAlign: "center" }}>
        <div style={{ color: scoreColor, fontSize: 52, fontWeight: 900 }}>{driver?.safetyScore ?? "--"}</div>
        <div style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>Safety Score</div>
        <div style={{ color: "#8899AA", fontSize: 12, marginTop: 4 }}>
          {!driver ? "" : driver.safetyScore >= 90 ? "🏆 Excellent driver!" : driver.safetyScore >= 80 ? "✅ Great work, keep it up" : driver.safetyScore >= 60 ? "⚠️ Room to improve" : "🔴 Coaching recommended"}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
        {[["Hours Today", `${driver?.hoursToday ?? 0}h`, driver?.hoursToday > 7 ? "#FF9500" : "#fff"], ["Hazards Reported", driver?.hazardsReported ?? 0, "#00D4FF"], ["Routes Completed", driver?.routesCompleted ?? 0, "#34C759"], ["Licence Expiry", driver?.licenseExpiry ? new Date(driver.licenseExpiry).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "N/A", "#fff"]].map(([label, value, color]) => (
          <div key={label as string} style={{ background: "#0D1F35", borderRadius: 12, padding: 14, textAlign: "center" }}>
            <div style={{ color: color as string, fontSize: 18, fontWeight: 800 }}>{value}</div>
            <div style={{ color: "#8899AA", fontSize: 11, marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: "grid", gap: 10 }}>
        <button style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#fff", borderRadius: 12, padding: "14px 18px", cursor: "pointer", fontFamily: "Inter, sans-serif", fontSize: 14, textAlign: "left" }}>📋 View Driving History</button>
        <button style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#fff", borderRadius: 12, padding: "14px 18px", cursor: "pointer", fontFamily: "Inter, sans-serif", fontSize: 14, textAlign: "left" }}>🪪 View Licence Details</button>
        <button style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#fff", borderRadius: 12, padding: "14px 18px", cursor: "pointer", fontFamily: "Inter, sans-serif", fontSize: 14, textAlign: "left" }}>🔒 Change Password</button>
        <button style={{ background: "rgba(255,59,59,0.08)", border: "1px solid rgba(255,59,59,0.2)", color: "#FF3B3B", borderRadius: 12, padding: "14px 18px", cursor: "pointer", fontFamily: "Inter, sans-serif", fontSize: 14, textAlign: "left" }}>↩ Sign Out</button>
      </div>
    </div>
  );
}
