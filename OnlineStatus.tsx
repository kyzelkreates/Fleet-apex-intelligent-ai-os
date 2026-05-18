import React from "react";
export default function OnlineStatus() {
  return (
    <div style={{ background: "rgba(255,149,0,0.12)", borderBottom: "1px solid rgba(255,149,0,0.3)", padding: "8px 16px", textAlign: "center", color: "#FF9500", fontSize: 12, fontFamily: "Inter, sans-serif", fontWeight: 600 }}>
      ⚠️ You're offline — data will sync when you reconnect
    </div>
  );
}
