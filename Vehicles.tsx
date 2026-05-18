// Fleet Apex Admin — Vehicle Management
import React, { useState, useEffect } from "react";

interface Vehicle {
  id: string;
  registration: string;
  type: string;
  make: string;
  model: string;
  year: number;
  colour: string;
  status: string;
  motExpiry: string;
  insuranceExpiry: string;
  driverName?: string;
  widthM?: number;
  weightKg?: number;
}

const STATUS_COLORS: Record<string, string> = {
  active: "#34C759", maintenance: "#FF9500", offline: "#556677", decommissioned: "#FF3B3B",
};
const TYPE_ICONS: Record<string, string> = {
  car: "🚗", van: "🚐", large_van: "🚐", hgv: "🚛", artic: "🚛", minibus: "🚌", coach: "🚌",
};

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selected, setSelected] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchVehicles(); }, []);

  async function fetchVehicles() {
    try {
      const res = await fetch("/api/vehicles");
      if (res.ok) setVehicles(await res.json());
    } catch {}
    setLoading(false);
  }

  const filtered = vehicles.filter((v) => {
    const matchSearch = !search || v.registration.toLowerCase().includes(search.toLowerCase()) || v.make?.toLowerCase().includes(search.toLowerCase()) || v.model?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || v.status === statusFilter;
    const matchType = typeFilter === "all" || v.type === typeFilter;
    return matchSearch && matchStatus && matchType;
  });

  const expiryWarning = (dateStr: string) => {
    if (!dateStr) return false;
    return new Date(dateStr) < new Date(Date.now() + 30 * 86400000);
  };

  return (
    <div style={{ padding: 24, height: "100%", overflow: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ color: "#fff", fontSize: 24, fontWeight: 700, margin: 0 }}>🚛 Vehicles</h1>
          <p style={{ color: "#8899AA", fontSize: 13, margin: "4px 0 0" }}>{vehicles.length} vehicles in fleet</p>
        </div>
        <button style={primaryBtn}>+ Add Vehicle</button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 20 }}>
        {(["active","maintenance","offline","decommissioned"] as const).map((s) => (
          <div key={s} onClick={() => setStatusFilter(statusFilter === s ? "all" : s)} style={{ background: statusFilter === s ? `${STATUS_COLORS[s]}15` : "#0D1F35", border: `1px solid ${statusFilter === s ? STATUS_COLORS[s] : "rgba(255,255,255,0.05)"}`, borderRadius: 12, padding: "14px 16px", cursor: "pointer" }}>
            <div style={{ color: STATUS_COLORS[s], fontSize: 22, fontWeight: 800 }}>{vehicles.filter(v => v.status === s).length}</div>
            <div style={{ color: "#8899AA", fontSize: 12, marginTop: 4, textTransform: "capitalize" }}>{s.replace("_"," ")}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by reg, make, model…" style={{ background: "#0D1F35", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "9px 14px", color: "#fff", fontSize: 13, fontFamily: "Inter, sans-serif", outline: "none", minWidth: 260 }} />
        {["all","car","van","large_van","hgv","artic","minibus"].map((t) => (
          <button key={t} onClick={() => setTypeFilter(t)} style={{ background: typeFilter === t ? "rgba(0,212,255,0.12)" : "rgba(255,255,255,0.04)", border: `1px solid ${typeFilter === t ? "#00D4FF" : "rgba(255,255,255,0.08)"}`, color: typeFilter === t ? "#00D4FF" : "#8899AA", borderRadius: 20, padding: "6px 14px", fontSize: 12, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
            {t === "all" ? "All" : t.replace("_"," ").replace(/\b\w/g, c => c.toUpperCase())}
          </button>
        ))}
      </div>

      {loading ? <div style={{ color: "#8899AA", textAlign: "center", padding: 48 }}>Loading vehicles…</div> :
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
          {filtered.map((v) => (
            <div key={v.id} onClick={() => setSelected(v)} style={{ background: "#0D1F35", borderRadius: 14, padding: 18, cursor: "pointer", border: `1px solid ${(expiryWarning(v.motExpiry) || expiryWarning(v.insuranceExpiry)) ? "#FF950033" : "rgba(255,255,255,0.05)"}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <span style={{ fontSize: 28 }}>{TYPE_ICONS[v.type] || "🚛"}</span>
                  <div>
                    <div style={{ color: "#fff", fontWeight: 800, fontSize: 16 }}>{v.registration}</div>
                    <div style={{ color: "#8899AA", fontSize: 12 }}>{v.make} {v.model} {v.year}</div>
                  </div>
                </div>
                <span style={{ background: `${STATUS_COLORS[v.status]}20`, color: STATUS_COLORS[v.status], borderRadius: 8, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>{v.status}</span>
              </div>
              {v.driverName && <div style={{ color: "#8899AA", fontSize: 12, marginBottom: 8 }}>👤 {v.driverName}</div>}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <ExpiryBadge label="MOT" date={v.motExpiry} />
                <ExpiryBadge label="Insurance" date={v.insuranceExpiry} />
              </div>
            </div>
          ))}
        </div>
      }

      {selected && (
        <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 400, background: "#0D1F35", borderLeft: "2px solid rgba(0,212,255,0.2)", zIndex: 100, overflowY: "auto", padding: 24, boxShadow: "-8px 0 32px rgba(0,0,0,0.4)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
            <h2 style={{ color: "#fff", margin: 0 }}>{selected.registration}</h2>
            <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: "#fff", fontSize: 22, cursor: "pointer" }}>×</button>
          </div>
          <div style={{ fontSize: 48, textAlign: "center", marginBottom: 16 }}>{TYPE_ICONS[selected.type] || "🚛"}</div>
          {[["Make / Model", `${selected.make} ${selected.model}`], ["Year", selected.year], ["Type", selected.type?.replace("_"," ").replace(/\b\w/g, c => c.toUpperCase())], ["Colour", selected.colour || "N/A"], ["Width", selected.widthM ? `${selected.widthM}m` : "N/A"], ["Max Weight", selected.weightKg ? `${selected.weightKg}kg` : "N/A"], ["MOT Expiry", selected.motExpiry ? new Date(selected.motExpiry).toLocaleDateString("en-GB") : "N/A"], ["Insurance Expiry", selected.insuranceExpiry ? new Date(selected.insuranceExpiry).toLocaleDateString("en-GB") : "N/A"], ["Assigned Driver", selected.driverName || "Unassigned"]].map(([label, value]) => (
            <div key={label as string} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <span style={{ color: "#8899AA", fontSize: 13 }}>{label}</span>
              <span style={{ color: "#fff", fontSize: 13 }}>{value}</span>
            </div>
          ))}
          <div style={{ marginTop: 20, display: "flex", gap: 10 }}>
            <button style={{ ...primaryBtn, flex: 1 }}>✏️ Edit</button>
            <button style={{ flex: 1, background: "rgba(255,149,0,0.1)", border: "1px solid #FF950033", color: "#FF9500", borderRadius: 10, padding: "10px", cursor: "pointer", fontFamily: "Inter, sans-serif" }}>🔧 Maintenance</button>
          </div>
        </div>
      )}
    </div>
  );
}

function ExpiryBadge({ label, date }: { label: string; date: string }) {
  const warn = date && new Date(date) < new Date(Date.now() + 30 * 86400000);
  const expired = date && new Date(date) < new Date();
  const color = expired ? "#FF3B3B" : warn ? "#FF9500" : "#34C759";
  return (
    <div style={{ background: `${color}10`, border: `1px solid ${color}30`, borderRadius: 8, padding: "6px 10px" }}>
      <div style={{ color: "#8899AA", fontSize: 10 }}>{label}</div>
      <div style={{ color, fontSize: 12, fontWeight: 600, marginTop: 2 }}>
        {date ? new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" }) : "N/A"}
      </div>
    </div>
  );
}

const primaryBtn: React.CSSProperties = { background: "linear-gradient(135deg, #0A1628, #00D4FF)", color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontWeight: 600, cursor: "pointer", fontFamily: "Inter, sans-serif", fontSize: 13 };
