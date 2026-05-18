// Fleet Apex Admin — Compliance & Safety Intelligence
import React, { useState, useEffect } from "react";

interface ComplianceAlert {
  id: string;
  type: string;
  severity: "critical" | "warning" | "info";
  message: string;
  entityName?: string;
  entityType: "driver" | "vehicle" | "route";
  resolved: boolean;
  createdAt: string;
}

interface ComplianceStat {
  label: string;
  value: number;
  total: number;
  color: string;
}

const ALERT_ICONS: Record<string, string> = {
  license_expiry: "🪪", insurance_expiry: "📄", mot_expiry: "🔧",
  tachograph: "⏱️", driver_fatigue: "😴", speeding: "🚗",
  inspection_due: "📋", break_violation: "☕", document_missing: "📁",
};

export default function CompliancePage() {
  const [alerts, setAlerts] = useState<ComplianceAlert[]>([]);
  const [stats, setStats] = useState<ComplianceStat[]>([]);
  const [filter, setFilter] = useState<"all" | "critical" | "warning" | "info">("all");
  const [entityFilter, setEntityFilter] = useState<"all" | "driver" | "vehicle">("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCompliance();
  }, []);

  async function fetchCompliance() {
    try {
      const [alertsRes, statsRes] = await Promise.all([
        fetch("/api/compliance/alerts?resolved=false"),
        fetch("/api/compliance/stats"),
      ]);
      if (alertsRes.ok) setAlerts(await alertsRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
    } catch {}
    setLoading(false);
  }

  async function resolveAlert(id: string) {
    await fetch(`/api/compliance/alerts/${id}/resolve`, { method: "POST" });
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }

  const filtered = alerts.filter((a) => {
    if (filter !== "all" && a.severity !== filter) return false;
    if (entityFilter !== "all" && a.entityType !== entityFilter) return false;
    return true;
  });

  const criticalCount = alerts.filter((a) => a.severity === "critical").length;
  const warningCount = alerts.filter((a) => a.severity === "warning").length;

  return (
    <div style={{ padding: 24, overflow: "auto", height: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ color: "#fff", fontSize: 24, fontWeight: 700, margin: 0 }}>📋 Compliance & Safety</h1>
          <p style={{ color: "#8899AA", fontSize: 13, margin: "4px 0 0" }}>Driver hours, vehicle documents, and policy enforcement</p>
        </div>
        <button onClick={() => window.open("/api/compliance/report/pdf")} style={primaryBtn}>
          📥 Export PDF Report
        </button>
      </div>

      {/* Summary row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 24 }}>
        <SummaryCard label="Critical Alerts" value={criticalCount} color="#FF3B3B" icon="🚨" />
        <SummaryCard label="Warnings" value={warningCount} color="#FF9500" icon="⚠️" />
        <SummaryCard label="Licenses Expiring" value={alerts.filter((a) => a.type === "license_expiry").length} color="#FF9500" icon="🪪" />
        <SummaryCard label="MOTs Due" value={alerts.filter((a) => a.type === "mot_expiry").length} color="#FF9500" icon="🔧" />
      </div>

      {/* Compliance bars */}
      {stats.length > 0 && (
        <div style={{ background: "#0D1F35", borderRadius: 16, padding: 20, marginBottom: 24, border: "1px solid rgba(255,255,255,0.04)" }}>
          <h3 style={{ color: "#fff", margin: "0 0 16px", fontSize: 14 }}>Fleet Compliance Overview</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {stats.map((s) => (
              <ComplianceBar key={s.label} {...s} />
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {(["all", "critical", "warning", "info"] as const).map((f) => (
          <FilterChip key={f} label={f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)} active={filter === f} onClick={() => setFilter(f)} />
        ))}
        <div style={{ borderLeft: "1px solid rgba(255,255,255,0.1)", margin: "0 4px" }} />
        <FilterChip label="All Types" active={entityFilter === "all"} onClick={() => setEntityFilter("all")} />
        <FilterChip label="👤 Drivers" active={entityFilter === "driver"} onClick={() => setEntityFilter("driver")} />
        <FilterChip label="🚛 Vehicles" active={entityFilter === "vehicle"} onClick={() => setEntityFilter("vehicle")} />
      </div>

      {/* Alert list */}
      {loading ? (
        <div style={{ color: "#8899AA", textAlign: "center", padding: 48 }}>Loading compliance data…</div>
      ) : filtered.length === 0 ? (
        <div style={{ color: "#8899AA", textAlign: "center", padding: 48 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
          No active compliance alerts{filter !== "all" ? ` (${filter})` : ""}.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {filtered.map((alert) => (
            <AlertCard key={alert.id} alert={alert} onResolve={() => resolveAlert(alert.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, color, icon }) {
  return (
    <div style={{ background: value > 0 ? `rgba(${color === "#FF3B3B" ? "255,59,59" : "255,149,0"},.06)` : "#0D1F35", borderRadius: 14, padding: "16px 18px", border: `1px solid ${value > 0 ? color + "33" : "rgba(255,255,255,0.04)"}` }}>
      <div style={{ color, fontSize: 24, fontWeight: 800 }}>{value}</div>
      <div style={{ color: "#fff", fontSize: 12, fontWeight: 500, marginTop: 4 }}>{icon} {label}</div>
    </div>
  );
}

function ComplianceBar({ label, value, total, color }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ color: "#8899AA", fontSize: 12 }}>{label}</span>
        <span style={{ color, fontSize: 12, fontWeight: 700 }}>{pct}%</span>
      </div>
      <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 4, height: 8, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 4, transition: "width 0.6s" }} />
      </div>
    </div>
  );
}

function AlertCard({ alert, onResolve }) {
  const sevColor = alert.severity === "critical" ? "#FF3B3B" : alert.severity === "warning" ? "#FF9500" : "#4A90D9";
  const icon = ALERT_ICONS[alert.type] || "⚠️";
  return (
    <div style={{ background: "#0D1F35", borderRadius: 12, padding: "14px 18px", border: `1px solid ${alert.severity === "critical" ? "#FF3B3B33" : "rgba(255,255,255,0.05)"}`, display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{ width: 44, height: 44, borderRadius: 10, background: `${sevColor}15`, border: `1px solid ${sevColor}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>{alert.message}</span>
          <span style={{ background: `${sevColor}20`, color: sevColor, borderRadius: 6, padding: "2px 8px", fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>{alert.severity}</span>
        </div>
        {alert.entityName && <div style={{ color: "#8899AA", fontSize: 12, marginTop: 3 }}>
          {alert.entityType === "driver" ? "👤" : "🚛"} {alert.entityName}
        </div>}
        <div style={{ color: "#556677", fontSize: 11, marginTop: 3 }}>{new Date(alert.createdAt).toLocaleString("en-GB")}</div>
      </div>
      <button onClick={onResolve} style={{ background: "rgba(52,199,89,0.1)", border: "1px solid rgba(52,199,89,0.3)", color: "#34C759", borderRadius: 8, padding: "8px 14px", fontSize: 12, cursor: "pointer", fontFamily: "Inter, sans-serif", whiteSpace: "nowrap" }}>
        ✓ Resolve
      </button>
    </div>
  );
}

function FilterChip({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{ background: active ? "rgba(0,212,255,0.12)" : "rgba(255,255,255,0.04)", border: `1px solid ${active ? "#00D4FF" : "rgba(255,255,255,0.08)"}`, color: active ? "#00D4FF" : "#8899AA", borderRadius: 20, padding: "6px 14px", fontSize: 12, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>{label}</button>
  );
}

const primaryBtn: React.CSSProperties = { background: "linear-gradient(135deg, #0A1628, #00D4FF)", color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontWeight: 600, cursor: "pointer", fontFamily: "Inter, sans-serif", fontSize: 13 };
