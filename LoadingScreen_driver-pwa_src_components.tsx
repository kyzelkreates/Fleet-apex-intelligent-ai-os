import React from "react";
export default function LoadingScreen() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", background: "#050E1A" }}>
      <div style={{ width: 56, height: 56, borderRadius: 14, background: "linear-gradient(135deg, #0A1628, #00D4FF)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, marginBottom: 20 }}>🚛</div>
      <div style={{ color: "#00D4FF", fontSize: 14, fontFamily: "Inter, sans-serif", fontWeight: 600 }}>Fleet Apex</div>
      <div style={{ color: "#556677", fontSize: 11, marginTop: 4 }}>Intelligence Driving Every Journey</div>
    </div>
  );
}
