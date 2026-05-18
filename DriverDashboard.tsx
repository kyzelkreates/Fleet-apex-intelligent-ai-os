// Fleet Apex Driver PWA — Driver Home Dashboard
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { GPSTracker } from "./realtimeEngine";

interface RouteInfo {
  id: string;
  name: string;
  origin: string;
  destination: string;
  stopsTotal: number;
  stopsCompleted: number;
  estimatedMins: number;
  status: string;
}

interface DriverInfo {
  name: string;
  vehicleReg: string;
  vehicleType: string;
  safetyScore: number;
  hoursToday: number;
  status: string;
}

export default function DriverDashboard({ branding }: { branding: any }) {
  const navigate = useNavigate();
  const [driver, setDriver] = useState<DriverInfo | null>(null);
  const [activeRoute, setActiveRoute] = useState<RouteInfo | null>(null);
  const [hazardCount, setHazardCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const accent = branding.accentColor || "#00D4FF";

  useEffect(() => {
    fetchDriverData();
    // Start GPS tracking
    const tracker = new GPSTracker("current-driver-id", "current-company-id", null);
    tracker.start();
    window.addEventListener("online", () => setIsOnline(true));
    window.addEventListener("offline", () => setIsOnline(false));
    return () => {
      tracker.stop();
      window.removeEventListener("online", () => setIsOnline(true));
      window.removeEventListener("offline", () => setIsOnline(false));
    };
  }, []);

  async function fetchDriverData() {
    try {
      const [driverRes, routeRes, hazardRes] = await Promise.all([
        fetch("/api/driver/me"),
        fetch("/api/driver/active-route"),
        fetch("/api/hazards/nearby?radius=5"),
      ]);
      if (driverRes.ok) setDriver(await driverRes.json());
      if (routeRes.ok) setActiveRoute(await routeRes.json());
      if (hazardRes.ok) { const d = await hazardRes.json(); setHazardCount(d.count || 0); }
    } catch {}
  }

  const timeOfDay = new Date().getHours();
  const greeting = timeOfDay < 12 ? "Good morning" : timeOfDay < 17 ? "Good afternoon" : "Good evening";

  return (
    <div style={{ padding: 20, paddingBottom: 100, minHeight: "100vh", background: "#050E1A" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <p style={{ color: "#8899AA", fontSize: 12, margin: "0 0 2px" }}>{greeting},</p>
          <h1 style={{ color: "#fff", fontSize: 20, fontWeight: 800, margin: 0 }}>{driver?.name || "Driver"}</h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ background: isOnline ? "rgba(52,199,89,0.15)" : "rgba(255,149,0,0.15)", border: `1px solid ${isOnline ? "#34C759" : "#FF9500"}33`, borderRadius: 20, padding: "4px 10px", fontSize: 11, color: isOnline ? "#34C759" : "#FF9500" }}>
            {isOnline ? "● Online" : "● Offline"}
          </div>
          {unreadMessages > 0 && (
            <div style={{ background: accent, borderRadius: "50%", width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#050E1A" }}>{unreadMessages}</div>
          )}
        </div>
      </div>

      {/* Vehicle status */}
      {driver && (
        <div style={{ background: "#0D1F35", borderRadius: 16, padding: 16, marginBottom: 16, border: "1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: 16 }}>🚛 {driver.vehicleReg}</div>
              <div style={{ color: "#8899AA", fontSize: 12, marginTop: 2 }}>{driver.vehicleType}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ color: driver.safetyScore >= 80 ? "#34C759" : driver.safetyScore >= 60 ? "#FF9500" : "#FF3B3B", fontSize: 22, fontWeight: 800 }}>{driver.safetyScore}</div>
              <div style={{ color: "#8899AA", fontSize: 10 }}>Safety Score</div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 14 }}>
            <MiniCard label="Hours Today" value={`${driver.hoursToday}h`} warn={driver.hoursToday > 7} />
            <MiniCard label="Break Due" value={driver.hoursToday >= 4.5 ? "⚠️ Now" : `${Math.max(0, 4.5 - driver.hoursToday).toFixed(1)}h`} warn={driver.hoursToday >= 4.5} />
          </div>
        </div>
      )}

      {/* Active route */}
      {activeRoute ? (
        <div style={{ background: `linear-gradient(135deg, #0A1628, #1E3A5F)`, borderRadius: 16, padding: 18, marginBottom: 16, border: `1px solid ${accent}33` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <div>
              <div style={{ color: accent, fontSize: 11, fontWeight: 600, marginBottom: 4 }}>ACTIVE ROUTE</div>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>{activeRoute.name}</div>
            </div>
            <div style={{ background: "#34C75920", border: "1px solid #34C75944", borderRadius: 8, padding: "3px 10px", color: "#34C759", fontSize: 11, fontWeight: 700 }}>IN PROGRESS</div>
          </div>
          <div style={{ color: "#8899AA", fontSize: 12, marginBottom: 12 }}>
            📍 {activeRoute.origin} → {activeRoute.destination}
          </div>
          {/* Progress */}
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ color: "#8899AA", fontSize: 11 }}>Stops completed</span>
            <span style={{ color: "#fff", fontSize: 11, fontWeight: 600 }}>{activeRoute.stopsCompleted}/{activeRoute.stopsTotal}</span>
          </div>
          <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 6, height: 8, marginBottom: 14 }}>
            <div style={{ width: `${(activeRoute.stopsCompleted / activeRoute.stopsTotal) * 100}%`, height: "100%", background: accent, borderRadius: 6, transition: "width 0.4s" }} />
          </div>
          <button onClick={() => navigate("/navigation")} style={{ width: "100%", background: accent, border: "none", borderRadius: 12, padding: "14px", fontWeight: 700, fontSize: 15, cursor: "pointer", color: "#050E1A", fontFamily: "Inter, sans-serif" }}>
            🗺️ Open Navigation
          </button>
        </div>
      ) : (
        <div style={{ background: "#0D1F35", borderRadius: 16, padding: 20, marginBottom: 16, textAlign: "center", border: "1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>📍</div>
          <div style={{ color: "#fff", fontSize: 14, fontWeight: 600 }}>No active route</div>
          <div style={{ color: "#8899AA", fontSize: 12, marginTop: 4 }}>Waiting for dispatcher to assign a route</div>
        </div>
      )}

      {/* Quick actions */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        <QuickAction icon="⚠️" label="Report Hazard" color="#FF9500" onClick={() => navigate("/hazard")} />
        <QuickAction icon="💬" label={`Messages${unreadMessages > 0 ? ` (${unreadMessages})` : ""}`} color={accent} onClick={() => navigate("/messages")} />
        <QuickAction icon="📋" label="Inspection" color="#4A90D9" onClick={() => {}} />
        <QuickAction icon="☕" label="Start Break" color="#34C759" onClick={() => {}} />
      </div>

      {/* Nearby hazards */}
      {hazardCount > 0 && (
        <div style={{ background: "rgba(255,149,0,0.08)", border: "1px solid rgba(255,149,0,0.3)", borderRadius: 14, padding: 16, display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 28 }}>⚠️</span>
          <div>
            <div style={{ color: "#FF9500", fontWeight: 700, fontSize: 14 }}>{hazardCount} hazard{hazardCount > 1 ? "s" : ""} nearby</div>
            <div style={{ color: "#8899AA", fontSize: 12, marginTop: 2 }}>Check your route before proceeding</div>
          </div>
        </div>
      )}
    </div>
  );
}

function MiniCard({ label, value, warn = false }) {
  return (
    <div style={{ background: warn ? "rgba(255,149,0,0.08)" : "rgba(255,255,255,0.03)", border: `1px solid ${warn ? "rgba(255,149,0,0.3)" : "transparent"}`, borderRadius: 10, padding: "10px 12px", textAlign: "center" }}>
      <div style={{ color: warn ? "#FF9500" : "#fff", fontSize: 14, fontWeight: 700 }}>{value}</div>
      <div style={{ color: "#556677", fontSize: 10, marginTop: 2 }}>{label}</div>
    </div>
  );
}

function QuickAction({ icon, label, color, onClick }) {
  return (
    <button onClick={onClick} style={{ background: "#0D1F35", border: `1px solid ${color}22`, borderRadius: 14, padding: "16px 12px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, fontFamily: "Inter, sans-serif" }}>
      <span style={{ fontSize: 26 }}>{icon}</span>
      <span style={{ color: "#fff", fontSize: 12, fontWeight: 600, textAlign: "center" }}>{label}</span>
    </button>
  );
}
