// Fleet Apex Admin — Hazard Management Page
import React, { useState, useEffect, useCallback } from "react";
import { HAZARD_TYPES } from "./brand";
import type { Hazard } from "./index";

const SEVERITY_COLORS = { red: "#FF3B3B", orange: "#FF9500", yellow: "#FFD60A" };

export default function HazardsPage() {
  const [hazards, setHazards] = useState<Hazard[]>([]);
  const [filter, setFilter] = useState<"all" | "red" | "orange" | "yellow">("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selected, setSelected] = useState<Hazard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHazards();
    // Subscribe to realtime updates
    const channel = subscribeToHazards();
    return () => { channel?.unsubscribe?.(); };
  }, []);

  async function fetchHazards() {
    try {
      const res = await fetch("/api/hazards?resolved=false");
      const data = await res.json();
      setHazards(data.hazards || []);
    } catch {}
    setLoading(false);
  }

  function subscribeToHazards() {
    // Supabase realtime subscription
    return null; // placeholder — connected via supabase client
  }

  const filtered = hazards.filter((h) => {
    if (filter !== "all" && h.severity !== filter) return false;
    if (typeFilter !== "all" && h.type !== typeFilter) return false;
    return true;
  });

  const counts = {
    red: hazards.filter((h) => h.severity === "red").length,
    orange: hazards.filter((h) => h.severity === "orange").length,
    yellow: hazards.filter((h) => h.severity === "yellow").length,
  };

  return (
    <div style={{ padding: 24, height: "100%", overflow: "auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ color: "#fff", fontSize: 24, fontWeight: 700, margin: 0 }}>⚠️ Hazard Management</h1>
          <p style={{ color: "#8899AA", fontSize: 13, margin: "4px 0 0" }}>
            Live hazard reports from fleet drivers
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={fetchHazards} style={secondaryBtn}>🔄 Refresh</button>
          <button style={primaryBtn}>+ Add Hazard</button>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
        {(["red", "orange", "yellow"] as const).map((sev) => (
          <SeverityCard
            key={sev}
            severity={sev}
            count={counts[sev]}
            label={sev === "red" ? "Severe" : sev === "orange" ? "Caution" : "Advisory"}
            active={filter === sev}
            onClick={() => setFilter(filter === sev ? "all" : sev)}
          />
        ))}
      </div>

      {/* Type filter bar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        <TypeChip label="All Types" value="all" current={typeFilter} onClick={setTypeFilter} />
        {HAZARD_TYPES.map((ht) => (
          <TypeChip key={ht.id} label={ht.icon + " " + ht.label} value={ht.id} current={typeFilter} onClick={setTypeFilter} />
        ))}
      </div>

      {/* Hazard list */}
      {loading ? (
        <div style={{ color: "#8899AA", textAlign: "center", padding: 48 }}>Loading hazards…</div>
      ) : filtered.length === 0 ? (
        <div style={{ color: "#8899AA", textAlign: "center", padding: 48 }}>
          No active hazards{filter !== "all" ? ` (${filter})` : ""}
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {filtered.map((hazard) => (
            <HazardCard
              key={hazard.id}
              hazard={hazard}
              onClick={() => setSelected(hazard)}
              onVerify={() => verifyHazard(hazard.id)}
              onResolve={() => resolveHazard(hazard.id)}
            />
          ))}
        </div>
      )}

      {/* Detail panel */}
      {selected && (
        <HazardDetailPanel
          hazard={selected}
          onClose={() => setSelected(null)}
          onVerify={() => verifyHazard(selected.id)}
          onResolve={() => resolveHazard(selected.id)}
        />
      )}
    </div>
  );

  async function verifyHazard(id: string) {
    await fetch(`/api/hazards/${id}/verify`, { method: "POST" });
    fetchHazards();
  }

  async function resolveHazard(id: string) {
    await fetch(`/api/hazards/${id}/resolve`, { method: "POST" });
    setHazards((prev) => prev.filter((h) => h.id !== id));
    setSelected(null);
  }
}

function SeverityCard({ severity, count, label, active, onClick }) {
  const color = SEVERITY_COLORS[severity];
  return (
    <div onClick={onClick} style={{
      background: active ? `rgba(${severity === "red" ? "255,59,59" : severity === "orange" ? "255,149,0" : "255,214,10"},.15)` : "#0D1F35",
      border: `2px solid ${active ? color : "rgba(255,255,255,0.05)"}`,
      borderRadius: 12, padding: "16px 20px", cursor: "pointer",
      transition: "all 0.2s ease",
    }}>
      <div style={{ color, fontSize: 28, fontWeight: 800 }}>{count}</div>
      <div style={{ color: "#fff", fontWeight: 600, fontSize: 14, marginTop: 4 }}>{label}</div>
      <div style={{ color: "#8899AA", fontSize: 11, marginTop: 2 }}>Active hazards</div>
    </div>
  );
}

function TypeChip({ label, value, current, onClick }) {
  return (
    <button onClick={() => onClick(value)} style={{
      background: current === value ? "rgba(0,212,255,0.15)" : "rgba(255,255,255,0.05)",
      border: `1px solid ${current === value ? "#00D4FF" : "rgba(255,255,255,0.1)"}`,
      color: current === value ? "#00D4FF" : "#8899AA",
      borderRadius: 20, padding: "6px 14px", fontSize: 12,
      cursor: "pointer", fontFamily: "Inter, sans-serif",
      whiteSpace: "nowrap",
    }}>{label}</button>
  );
}

function HazardCard({ hazard, onClick, onVerify, onResolve }) {
  const color = SEVERITY_COLORS[hazard.severity];
  const hazardType = HAZARD_TYPES.find((h) => h.id === hazard.type);
  const isCritical = hazardType?.critical;

  return (
    <div style={{
      background: "#0D1F35", borderRadius: 12, padding: 16,
      border: `1px solid ${isCritical ? color : "rgba(255,255,255,0.06)"}`,
      cursor: "pointer", transition: "all 0.15s ease",
      display: "flex", gap: 16, alignItems: "flex-start",
    }} onClick={onClick}>
      <div style={{
        width: 48, height: 48, borderRadius: 10, background: `${color}22`,
        border: `2px solid ${color}`, display: "flex", alignItems: "center",
        justifyContent: "center", fontSize: 22, flexShrink: 0,
      }}>{hazardType?.icon || "⚠️"}</div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ color: "#fff", fontWeight: 600, fontSize: 14 }}>
            {hazardType?.label || hazard.type}
          </span>
          <span style={{
            background: `${color}22`, color, borderRadius: 6, padding: "2px 8px",
            fontSize: 11, fontWeight: 700, textTransform: "uppercase",
          }}>{hazard.severity}</span>
          {isCritical && <span style={{
            background: "#FF3B3B22", color: "#FF3B3B", borderRadius: 6,
            padding: "2px 8px", fontSize: 11, fontWeight: 700,
          }}>⚡ CRITICAL</span>}
          {!hazard.verified && <span style={{
            background: "rgba(255,149,0,.15)", color: "#FF9500", borderRadius: 6,
            padding: "2px 8px", fontSize: 11,
          }}>Unverified</span>}
        </div>

        {hazard.roadName && (
          <div style={{ color: "#8899AA", fontSize: 12, marginTop: 4 }}>📍 {hazard.roadName}</div>
        )}
        {hazard.description && (
          <div style={{ color: "#CDD6E4", fontSize: 13, marginTop: 6 }}>{hazard.description}</div>
        )}
        {hazard.vehicleType && (
          <div style={{ color: "#8899AA", fontSize: 11, marginTop: 4 }}>🚛 {hazard.vehicleType}</div>
        )}

        <div style={{ color: "#556677", fontSize: 11, marginTop: 6 }}>
          {new Date(hazard.reportedAt).toLocaleString("en-GB")}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {!hazard.verified && (
          <button onClick={(e) => { e.stopPropagation(); onVerify(); }} style={{
            ...secondaryBtn, padding: "6px 12px", fontSize: 11,
          }}>✓ Verify</button>
        )}
        <button onClick={(e) => { e.stopPropagation(); onResolve(); }} style={{
          background: "rgba(52,199,89,0.1)", border: "1px solid rgba(52,199,89,0.3)",
          color: "#34C759", borderRadius: 8, padding: "6px 12px",
          fontSize: 11, cursor: "pointer",
        }}>Resolved</button>
      </div>
    </div>
  );
}

function HazardDetailPanel({ hazard, onClose, onVerify, onResolve }) {
  const hazardType = HAZARD_TYPES.find((h) => h.id === hazard.type);
  const color = SEVERITY_COLORS[hazard.severity];

  return (
    <div style={{
      position: "fixed", top: 0, right: 0, bottom: 0, width: 440,
      background: "#0D1F35", borderLeft: `2px solid ${color}`,
      zIndex: 100, overflowY: "auto", padding: 24,
      boxShadow: "-8px 0 32px rgba(0,0,0,0.4)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
        <h2 style={{ color: "#fff", margin: 0 }}>{hazardType?.icon} {hazardType?.label}</h2>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "#fff", fontSize: 22, cursor: "pointer" }}>×</button>
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        <DetailRow label="Severity" value={<SevBadge sev={hazard.severity} />} />
        <DetailRow label="Road" value={hazard.roadName || "Unknown"} />
        <DetailRow label="Location" value={`${hazard.location?.lat?.toFixed(5)}, ${hazard.location?.lng?.toFixed(5)}`} />
        <DetailRow label="Vehicle Type" value={hazard.vehicleType || "N/A"} />
        <DetailRow label="Reported" value={new Date(hazard.reportedAt).toLocaleString("en-GB")} />
        <DetailRow label="Verified" value={hazard.verified ? "✅ Yes" : "❌ No"} />
        {hazard.description && <DetailRow label="Notes" value={hazard.description} />}
        {hazard.photos?.length > 0 && (
          <div>
            <div style={{ color: "#8899AA", fontSize: 12, marginBottom: 8 }}>Photos</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {hazard.photos.map((p, i) => (
                <img key={i} src={p} alt="" style={{ width: 120, height: 80, objectFit: "cover", borderRadius: 8 }} />
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
        {!hazard.verified && (
          <button onClick={onVerify} style={{ ...primaryBtn, flex: 1 }}>✓ Verify Hazard</button>
        )}
        <button onClick={onResolve} style={{
          flex: 1, background: "rgba(52,199,89,0.1)", border: "1px solid #34C759",
          color: "#34C759", borderRadius: 10, padding: "12px 20px",
          fontWeight: 600, cursor: "pointer", fontFamily: "Inter, sans-serif",
        }}>✅ Mark Resolved</button>
      </div>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
      <span style={{ color: "#8899AA", fontSize: 13 }}>{label}</span>
      <span style={{ color: "#fff", fontSize: 13, fontWeight: 500, textAlign: "right", maxWidth: "60%" }}>{value}</span>
    </div>
  );
}

function SevBadge({ sev }) {
  const color = SEVERITY_COLORS[sev];
  return (
    <span style={{ background: `${color}22`, color, borderRadius: 6, padding: "2px 10px", fontSize: 12, fontWeight: 700, textTransform: "uppercase" }}>
      {sev}
    </span>
  );
}

const primaryBtn: React.CSSProperties = {
  background: "linear-gradient(135deg, #0A1628, #00D4FF)",
  color: "#fff", border: "none", borderRadius: 10,
  padding: "10px 20px", fontWeight: 600, cursor: "pointer",
  fontFamily: "Inter, sans-serif", fontSize: 13,
};

const secondaryBtn: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
  color: "#fff", borderRadius: 10, padding: "10px 16px",
  fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif", fontSize: 13,
};
