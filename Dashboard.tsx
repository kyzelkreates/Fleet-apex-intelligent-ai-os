// Fleet Apex Admin — Main Dashboard
import React, { useState, useEffect } from "react";

interface DashboardStats {
  activeDrivers: number;
  activeVehicles: number;
  activeRoutes: number;
  activeHazards: number;
  complianceAlerts: number;
  completedToday: number;
  onTimePercent: number;
  avgSafetyScore: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    activeDrivers: 0, activeVehicles: 0, activeRoutes: 0,
    activeHazards: 0, complianceAlerts: 0, completedToday: 0,
    onTimePercent: 0, avgSafetyScore: 0,
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  async function fetchDashboard() {
    try {
      const [statsRes, activityRes] = await Promise.all([
        fetch("/api/dashboard/stats"),
        fetch("/api/dashboard/activity?limit=8"),
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      if (activityRes.ok) setRecentActivity(await activityRes.json());
    } catch {}
    setLoading(false);
  }

  return (
    <div style={{ padding: 24, overflow: "auto", height: "100%" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ color: "#fff", fontSize: 24, fontWeight: 700, margin: 0 }}>Fleet Apex Dashboard</h1>
        <p style={{ color: "#8899AA", fontSize: 13, margin: "4px 0 0" }}>
          {new Date().toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* KPI Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 24 }}>
        <KPICard icon="👤" label="Active Drivers" value={stats.activeDrivers} color="#00D4FF" />
        <KPICard icon="🚛" label="Active Vehicles" value={stats.activeVehicles} color="#4A90D9" />
        <KPICard icon="📍" label="Active Routes" value={stats.activeRoutes} color="#34C759" />
        <KPICard icon="⚠️" label="Active Hazards" value={stats.activeHazards} color="#FF9500" alert={stats.activeHazards > 0} />
        <KPICard icon="✅" label="Completed Today" value={stats.completedToday} color="#34C759" />
        <KPICard icon="⏱️" label="On-Time Rate" value={`${stats.onTimePercent}%`} color="#00D4FF" />
        <KPICard icon="🛡️" label="Avg Safety Score" value={stats.avgSafetyScore} color={stats.avgSafetyScore > 80 ? "#34C759" : "#FF9500"} />
        <KPICard icon="🚨" label="Compliance Alerts" value={stats.complianceAlerts} color="#FF3B3B" alert={stats.complianceAlerts > 0} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 20 }}>
        {/* Recent Activity */}
        <div style={{ background: "#0D1F35", borderRadius: 16, padding: 20, border: "1px solid rgba(255,255,255,0.04)" }}>
          <h3 style={{ color: "#fff", margin: "0 0 16px", fontSize: 15 }}>⚡ Recent Activity</h3>
          {recentActivity.length === 0 && !loading && (
            <div style={{ color: "#556677", textAlign: "center", padding: 24 }}>No recent activity</div>
          )}
          {recentActivity.map((item, i) => (
            <ActivityItem key={i} item={item} />
          ))}
        </div>

        {/* Fleet Health */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: "#0D1F35", borderRadius: 16, padding: 20, border: "1px solid rgba(255,255,255,0.04)" }}>
            <h3 style={{ color: "#fff", margin: "0 0 16px", fontSize: 15 }}>🏥 Fleet Health</h3>
            <HealthBar label="Vehicles Active" value={75} color="#00D4FF" />
            <HealthBar label="Compliance Rate" value={98} color="#34C759" />
            <HealthBar label="Driver Safety Avg" value={stats.avgSafetyScore} color={stats.avgSafetyScore > 80 ? "#34C759" : "#FF9500"} />
            <HealthBar label="On-Time Delivery" value={stats.onTimePercent} color="#4A90D9" />
          </div>

          <div style={{ background: "rgba(0,212,255,0.05)", border: "1px solid rgba(0,212,255,0.15)", borderRadius: 16, padding: 20 }}>
            <div style={{ color: "#00D4FF", fontSize: 13, fontWeight: 700, marginBottom: 8 }}>🧠 AI Core Status</div>
            <div style={{ color: "#8899AA", fontSize: 12, lineHeight: 1.8 }}>
              <div>● Safety Validation: <span style={{ color: "#34C759" }}>Active</span></div>
              <div>● Route Intelligence: <span style={{ color: "#34C759" }}>Active</span></div>
              <div>● Compliance Monitor: <span style={{ color: "#34C759" }}>Active</span></div>
              <div>● Hazard Analysis: <span style={{ color: "#34C759" }}>Active</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KPICard({ icon, label, value, color, alert = false }) {
  return (
    <div style={{
      background: alert ? `rgba(${color === "#FF3B3B" ? "255,59,59" : "255,149,0"},.06)` : "#0D1F35",
      borderRadius: 14, padding: "18px 20px",
      border: `1px solid ${alert ? color + "44" : "rgba(255,255,255,0.04)"}`,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span style={{ fontSize: 22 }}>{icon}</span>
        {alert && <span style={{ background: color + "22", color, borderRadius: 6, padding: "2px 6px", fontSize: 10, fontWeight: 700 }}>!</span>}
      </div>
      <div style={{ color, fontSize: 28, fontWeight: 800, margin: "8px 0 4px" }}>{value}</div>
      <div style={{ color: "#8899AA", fontSize: 12 }}>{label}</div>
    </div>
  );
}

function ActivityItem({ item }) {
  const icons: Record<string, string> = { hazard: "⚠️", route: "📍", driver: "👤", compliance: "📋", emergency: "🚨", message: "💬" };
  return (
    <div style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <span style={{ fontSize: 16, flexShrink: 0 }}>{icons[item.type] || "📌"}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: "#fff", fontSize: 12, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.message}</div>
        <div style={{ color: "#556677", fontSize: 11, marginTop: 2 }}>{item.time}</div>
      </div>
    </div>
  );
}

function HealthBar({ label, value, color }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ color: "#8899AA", fontSize: 11 }}>{label}</span>
        <span style={{ color, fontSize: 11, fontWeight: 700 }}>{value}%</span>
      </div>
      <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 4, height: 6, overflow: "hidden" }}>
        <div style={{ width: `${value}%`, height: "100%", background: color, borderRadius: 4, transition: "width 0.6s ease" }} />
      </div>
    </div>
  );
}
