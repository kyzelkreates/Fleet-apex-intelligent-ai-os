// Fleet Apex Admin — Routes Management
import React, { useState, useEffect } from "react";

interface Route {
  id: string;
  name: string;
  driverName?: string;
  vehicleReg?: string;
  originAddress: string;
  destAddress: string;
  status: string;
  stopsTotal: number;
  stopsCompleted: number;
  estimatedKm?: number;
  estimatedMins?: number;
  riskScore?: number;
  aiOptimized?: boolean;
  startedAt?: string;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = { pending: "#8899AA", active: "#00D4FF", completed: "#34C759", cancelled: "#FF3B3B", suspended: "#FF9500" };

export default function RoutesPage() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [filter, setFilter] = useState("active");
  const [selected, setSelected] = useState<Route | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => { fetchRoutes(); }, [filter]);

  async function fetchRoutes() {
    setLoading(true);
    try {
      const res = await fetch(`/api/routes?status=${filter}`);
      if (res.ok) setRoutes(await res.json());
    } catch {}
    setLoading(false);
  }

  const filtered = routes.filter((r) => !search || r.name?.toLowerCase().includes(search.toLowerCase()) || r.driverName?.toLowerCase().includes(search.toLowerCase()) || r.vehicleReg?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ padding: 24, height: "100%", overflow: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ color: "#fff", fontSize: 24, fontWeight: 700, margin: 0 }}>📍 Routes</h1>
          <p style={{ color: "#8899AA", fontSize: 13, margin: "4px 0 0" }}>{routes.length} routes</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={{ ...secondaryBtn }}>🧠 AI Optimise</button>
          <button style={primaryBtn}>+ Create Route</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {["active","pending","completed","cancelled"].map((s) => (
          <button key={s} onClick={() => setFilter(s)} style={{ background: filter === s ? `${STATUS_COLORS[s]}20` : "rgba(255,255,255,0.04)", border: `1px solid ${filter === s ? STATUS_COLORS[s] : "rgba(255,255,255,0.08)"}`, color: filter === s ? STATUS_COLORS[s] : "#8899AA", borderRadius: 20, padding: "6px 16px", fontSize: 12, cursor: "pointer", fontFamily: "Inter, sans-serif", textTransform: "capitalize" }}>
            {s}
          </button>
        ))}
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search routes…" style={{ background: "#0D1F35", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "6px 14px", color: "#fff", fontSize: 12, fontFamily: "Inter, sans-serif", outline: "none", marginLeft: "auto" }} />
      </div>

      {loading ? <div style={{ color: "#8899AA", textAlign: "center", padding: 48 }}>Loading routes…</div> :
        filtered.length === 0 ? <div style={{ color: "#8899AA", textAlign: "center", padding: 48 }}>No {filter} routes</div> :
        <div style={{ display: "grid", gap: 10 }}>
          {filtered.map((r) => (
            <RouteCard key={r.id} route={r} onClick={() => setSelected(r)} />
          ))}
        </div>
      }

      {selected && (
        <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 420, background: "#0D1F35", borderLeft: "2px solid rgba(0,212,255,0.2)", zIndex: 100, overflowY: "auto", padding: 24, boxShadow: "-8px 0 32px rgba(0,0,0,0.4)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
            <h2 style={{ color: "#fff", margin: 0, fontSize: 18 }}>{selected.name || "Route"}</h2>
            <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: "#fff", fontSize: 22, cursor: "pointer" }}>×</button>
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            {[["Driver", selected.driverName || "Unassigned"], ["Vehicle", selected.vehicleReg || "N/A"], ["Origin", selected.originAddress], ["Destination", selected.destAddress], ["Distance", selected.estimatedKm ? `${selected.estimatedKm} km` : "N/A"], ["Est. Time", selected.estimatedMins ? `${Math.floor(selected.estimatedMins/60)}h ${selected.estimatedMins%60}m` : "N/A"], ["Started", selected.startedAt ? new Date(selected.startedAt).toLocaleString("en-GB") : "N/A"], ["AI Optimised", selected.aiOptimized ? "✅ Yes" : "No"]].map(([label, value]) => (
              <div key={label as string} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <span style={{ color: "#8899AA", fontSize: 13 }}>{label}</span>
                <span style={{ color: "#fff", fontSize: 13 }}>{value}</span>
              </div>
            ))}
          </div>
          {selected.riskScore !== undefined && (
            <div style={{ marginTop: 16, background: selected.riskScore > 50 ? "rgba(255,59,59,0.08)" : "rgba(52,199,89,0.08)", border: `1px solid ${selected.riskScore > 50 ? "#FF3B3B33" : "#34C75933"}`, borderRadius: 12, padding: 14 }}>
              <div style={{ color: "#8899AA", fontSize: 11, marginBottom: 4 }}>AI Risk Score</div>
              <div style={{ color: selected.riskScore > 50 ? "#FF3B3B" : "#34C759", fontSize: 28, fontWeight: 800 }}>{selected.riskScore}</div>
            </div>
          )}
          <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
            {selected.status === "active" && <button style={{ ...primaryBtn, flex: 1 }}>📍 Track Live</button>}
            <button style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", borderRadius: 10, padding: "10px", cursor: "pointer", fontFamily: "Inter, sans-serif" }}>📋 Details</button>
          </div>
        </div>
      )}
    </div>
  );
}

function RouteCard({ route, onClick }: { route: Route; onClick: () => void }) {
  const color = STATUS_COLORS[route.status] || "#8899AA";
  const progress = route.stopsTotal > 0 ? (route.stopsCompleted / route.stopsTotal) * 100 : 0;
  const riskColor = route.riskScore && route.riskScore > 70 ? "#FF3B3B" : route.riskScore && route.riskScore > 40 ? "#FF9500" : "#34C759";

  return (
    <div onClick={onClick} style={{ background: "#0D1F35", borderRadius: 14, padding: "14px 18px", cursor: "pointer", border: "1px solid rgba(255,255,255,0.05)", display: "flex", gap: 16, alignItems: "center" }}>
      <div style={{ width: 10, height: 10, borderRadius: "50%", background: color, flexShrink: 0, boxShadow: `0 0 8px ${color}` }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>{route.name || "Unnamed Route"}</span>
          {route.aiOptimized && <span style={{ color: "#00D4FF", fontSize: 10, fontWeight: 700 }}>🧠 AI</span>}
        </div>
        <div style={{ color: "#8899AA", fontSize: 12 }}>
          {route.originAddress ? `${route.originAddress.substring(0, 25)}…` : ""} → {route.destAddress ? `${route.destAddress.substring(0, 25)}…` : ""}
        </div>
        {route.driverName && <div style={{ color: "#556677", fontSize: 11, marginTop: 3 }}>👤 {route.driverName} · 🚛 {route.vehicleReg}</div>}
        {route.status === "active" && route.stopsTotal > 0 && (
          <div style={{ marginTop: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
              <span style={{ color: "#556677", fontSize: 10 }}>{route.stopsCompleted}/{route.stopsTotal} stops</span>
              <span style={{ color: "#00D4FF", fontSize: 10 }}>{Math.round(progress)}%</span>
            </div>
            <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 3, height: 4 }}>
              <div style={{ width: `${progress}%`, height: "100%", background: "#00D4FF", borderRadius: 3 }} />
            </div>
          </div>
        )}
      </div>
      {route.riskScore !== undefined && (
        <div style={{ background: `${riskColor}15`, border: `1px solid ${riskColor}33`, borderRadius: 8, padding: "6px 10px", textAlign: "center", flexShrink: 0 }}>
          <div style={{ color: riskColor, fontSize: 16, fontWeight: 800 }}>{route.riskScore}</div>
          <div style={{ color: "#556677", fontSize: 9 }}>RISK</div>
        </div>
      )}
    </div>
  );
}

const primaryBtn: React.CSSProperties = { background: "linear-gradient(135deg, #0A1628, #00D4FF)", color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontWeight: 600, cursor: "pointer", fontFamily: "Inter, sans-serif", fontSize: 13 };
const secondaryBtn: React.CSSProperties = { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", borderRadius: 10, padding: "10px 16px", fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif", fontSize: 13 };
