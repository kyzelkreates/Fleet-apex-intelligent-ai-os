import React from "react";
export default function LoadingScreen() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", minHeight: 300, background: "#050E1A" }}>
      <div style={{ width: 48, height: 48, borderRadius: 12, background: "linear-gradient(135deg, #0A1628, #00D4FF)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, marginBottom: 16, animation: "spin 2s linear infinite" }}>🚛</div>
      <div style={{ color: "#00D4FF", fontSize: 13, fontFamily: "Inter, sans-serif" }}>Loading…</div>
      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}
