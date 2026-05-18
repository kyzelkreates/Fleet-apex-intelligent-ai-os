// Fleet Apex Admin — Sidebar Navigation
import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const NAV_ITEMS = [
  { path: "/dashboard", icon: "📊", label: "Dashboard" },
  { path: "/map", icon: "🗺️", label: "Live Map" },
  { path: "/drivers", icon: "👤", label: "Drivers" },
  { path: "/vehicles", icon: "🚛", label: "Vehicles" },
  { path: "/routes", icon: "📍", label: "Routes" },
  { path: "/hazards", icon: "⚠️", label: "Hazards" },
  { path: "/ai", icon: "🧠", label: "AI Command" },
  { path: "/compliance", icon: "📋", label: "Compliance" },
  { path: "/messages", icon: "💬", label: "Messages" },
];

const BOTTOM_ITEMS = [
  { path: "/branding", icon: "🎨", label: "Branding" },
  { path: "/settings", icon: "⚙️", label: "Settings" },
];

interface SidebarProps {
  open: boolean;
  onToggle: () => void;
  branding: { primaryColor: string; accentColor: string; appName: string; logo: string };
}

export default function Sidebar({ open, onToggle, branding }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const W = open ? 240 : 64;

  return (
    <aside style={{
      width: W, minWidth: W, height: "100vh",
      background: `linear-gradient(180deg, #0A1628 0%, #050E1A 100%)`,
      borderRight: `1px solid rgba(0,212,255,0.1)`,
      display: "flex", flexDirection: "column",
      transition: "width 0.25s ease",
      overflow: "hidden", flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{
        padding: open ? "20px 16px" : "20px 12px",
        borderBottom: "1px solid rgba(0,212,255,0.1)",
        display: "flex", alignItems: "center", gap: 12,
        cursor: "pointer", minHeight: 64,
      }} onClick={onToggle}>
        {branding.logo
          ? <img src={branding.logo} alt="" style={{ width: 36, height: 36, borderRadius: 8, flexShrink: 0 }} />
          : <div style={{
              width: 36, height: 36, borderRadius: 8, flexShrink: 0,
              background: `linear-gradient(135deg, #0A1628, #00D4FF)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, fontWeight: 700, color: "#fff",
            }}>FA</div>
        }
        {open && (
          <div>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 13, lineHeight: 1.2 }}>
              {branding.appName}
            </div>
            <div style={{ color: "#8899AA", fontSize: 10, marginTop: 2 }}>
              Intelligence Driving Every Journey
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "12px 8px", overflowY: "auto" }}>
        {NAV_ITEMS.map((item) => (
          <NavItem
            key={item.path}
            {...item}
            active={location.pathname === item.path}
            collapsed={!open}
            accentColor={branding.accentColor}
            onClick={() => navigate(item.path)}
          />
        ))}
      </nav>

      {/* Bottom */}
      <div style={{ padding: "12px 8px", borderTop: "1px solid rgba(0,212,255,0.1)" }}>
        {BOTTOM_ITEMS.map((item) => (
          <NavItem
            key={item.path}
            {...item}
            active={location.pathname === item.path}
            collapsed={!open}
            accentColor={branding.accentColor}
            onClick={() => navigate(item.path)}
          />
        ))}
      </div>
    </aside>
  );
}

function NavItem({ path, icon, label, active, collapsed, accentColor, onClick }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={collapsed ? label : undefined}
      style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: collapsed ? "10px 14px" : "10px 12px",
        borderRadius: 10, marginBottom: 4, cursor: "pointer",
        background: active ? `rgba(0,212,255,0.12)` :
                    hovered ? `rgba(255,255,255,0.05)` : "transparent",
        borderLeft: active ? `3px solid ${accentColor}` : "3px solid transparent",
        transition: "all 0.15s ease",
        justifyContent: collapsed ? "center" : "flex-start",
      }}
    >
      <span style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>
      {!collapsed && (
        <span style={{
          color: active ? "#fff" : "#8899AA",
          fontWeight: active ? 600 : 400,
          fontSize: 13, fontFamily: "Inter, sans-serif",
          whiteSpace: "nowrap",
        }}>{label}</span>
      )}
    </div>
  );
}
