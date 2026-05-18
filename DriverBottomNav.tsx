// Fleet Apex Driver PWA — Bottom Navigation
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

const NAV_ITEMS = [
  { path: "/dashboard", icon: "🏠", label: "Home" },
  { path: "/navigation", icon: "🗺️", label: "Navigate" },
  { path: "/hazard", icon: "⚠️", label: "Hazard" },
  { path: "/messages", icon: "💬", label: "Messages" },
  { path: "/profile", icon: "👤", label: "Profile" },
];

export default function DriverBottomNav({ accentColor = "#00D4FF" }: { accentColor?: string }) {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100,
      background: "rgba(5,14,26,0.95)",
      backdropFilter: "blur(12px)",
      borderTop: "1px solid rgba(255,255,255,0.06)",
      display: "flex", height: 72,
      paddingBottom: "env(safe-area-inset-bottom, 0)",
    }}>
      {NAV_ITEMS.map((item) => {
        const active = location.pathname === item.path;
        const isHazard = item.path === "/hazard";
        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            style={{
              flex: 1, background: "transparent", border: "none",
              display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", gap: 4, cursor: "pointer",
              position: "relative",
            }}
          >
            {active && !isHazard && (
              <div style={{
                position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
                width: 32, height: 3, background: accentColor, borderRadius: "0 0 4px 4px",
              }} />
            )}
            <span style={{
              fontSize: isHazard ? 26 : 20,
              filter: active ? "none" : "grayscale(60%) opacity(0.6)",
              background: isHazard ? "rgba(255,149,0,0.15)" : "transparent",
              borderRadius: isHazard ? "50%" : 0,
              padding: isHazard ? "4px" : 0,
              border: isHazard ? "1px solid rgba(255,149,0,0.3)" : "none",
            }}>{item.icon}</span>
            <span style={{
              color: active ? accentColor : "#556677",
              fontSize: 10, fontWeight: active ? 700 : 400,
              fontFamily: "Inter, sans-serif",
            }}>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
