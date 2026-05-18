// Fleet Apex Admin — Top Bar
import React, { useState, useEffect } from "react";

export default function TopBar({ branding, onMenuToggle }: { branding: any; onMenuToggle: () => void }) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const tick = setInterval(() => setTime(new Date()), 60000);
    fetchNotifications();
    return () => clearInterval(tick);
  }, []);

  async function fetchNotifications() {
    try {
      const res = await fetch("/api/notifications?unread=true&limit=5");
      if (res.ok) setNotifications(await res.json());
    } catch {}
  }

  return (
    <header style={{ height: 60, background: "#0A1628", borderBottom: "1px solid rgba(0,212,255,0.08)", display: "flex", alignItems: "center", padding: "0 20px", gap: 12, flexShrink: 0 }}>
      <button onClick={onMenuToggle} style={{ background: "none", border: "none", color: "#8899AA", fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center" }}>☰</button>

      <div style={{ flex: 1 }} />

      {/* Clock */}
      <div style={{ color: "#8899AA", fontSize: 12 }}>
        {time.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} · {time.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
      </div>

      {/* Notifications */}
      <div style={{ position: "relative" }}>
        <button onClick={() => setShowNotifs(!showNotifs)} style={{ background: "none", border: "none", color: "#8899AA", fontSize: 20, cursor: "pointer", position: "relative" }}>
          🔔
          {notifications.length > 0 && (
            <span style={{ position: "absolute", top: -4, right: -4, background: "#FF3B3B", borderRadius: "50%", width: 16, height: 16, fontSize: 9, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700 }}>
              {notifications.length}
            </span>
          )}
        </button>
        {showNotifs && (
          <div style={{ position: "absolute", top: 36, right: 0, width: 320, background: "#0D1F35", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, boxShadow: "0 8px 32px rgba(0,0,0,0.4)", zIndex: 200 }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", color: "#fff", fontWeight: 700, fontSize: 13 }}>Notifications</div>
            {notifications.length === 0 ? (
              <div style={{ padding: 20, color: "#8899AA", fontSize: 13, textAlign: "center" }}>All clear</div>
            ) : notifications.map((n, i) => (
              <div key={i} style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", gap: 10 }}>
                <span>{n.icon || "📌"}</span>
                <div>
                  <div style={{ color: "#fff", fontSize: 12 }}>{n.message}</div>
                  <div style={{ color: "#556677", fontSize: 11, marginTop: 2 }}>{n.time}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Avatar */}
      <div style={{ width: 32, height: 32, borderRadius: "50%", background: `linear-gradient(135deg, #1E3A5F, #00D4FF)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, cursor: "pointer" }}>
        👤
      </div>
    </header>
  );
}
