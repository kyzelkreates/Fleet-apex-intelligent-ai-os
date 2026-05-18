// Fleet Apex Admin — Driver Management
import React, { useState, useEffect } from "react";

interface Driver {
  id: string;
  name: string;
  email: string;
  phone: string;
  licenseNumber: string;
  licenseExpiry: string;
  status: string;
  safetyScore: number;
  vehicleReg?: string;
  hoursToday: number;
  routeName?: string;
  avatar?: string;
}

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<Driver | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => { fetchDrivers(); }, []);

  async function fetchDrivers() {
    try {
      const res = await fetch("/api/drivers");
      if (res.ok) setDrivers(await res.json());
    } catch {}
    setLoading(false);
  }

  const filtered = drivers.filter((d) => {
    const matchSearch = !search || d.name.toLowerCase().includes(search.toLowerCase()) || d.licenseNumber?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || d.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const statusCounts = {
    active: drivers.filter((d) => d.status === "active").length,
    offline: drivers.filter((d) => d.status === "offline").length,
    on_break: drivers.filter((d) => d.status === "on_break").length,
    emergency: drivers.filter((d) => d.status === "emergency").length,
  };

  return (
    <div style={{ padding: 24, height: "100%", overflow: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ color: "#fff", fontSize: 24, fontWeight: 700, margin: 0 }}>👤 Drivers</h1>
          <p style={{ color: "#8899AA", fontSize: 13, margin: "4px 0 0" }}>{drivers.length} drivers registered</p>
        </div>
        <button onClick={() => setShowAddModal(true)} style={primaryBtn}>+ Add Driver</button>
      </div>

      {/* Status pills */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        {([["all","All", "#8899AA"],["active","Active","#34C759"],["offline","Offline","#556677"],["on_break","On Break","#FF9500"],["emergency","Emergency","#FF3B3B"]] as const).map(([val, label, color]) => (
          <button key={val} onClick={() => setStatusFilter(val)} style={{
            background: statusFilter === val ? `${color}22` : "rgba(255,255,255,0.04)",
            border: `1px solid ${statusFilter === val ? color : "rgba(255,255,255,0.08)"}`,
            color: statusFilter === val ? color : "#8899AA",
            borderRadius: 20, padding: "6px 14px", fontSize: 12,
            cursor: "pointer", fontFamily: "Inter, sans-serif",
          }}>
            {label} {val !== "all" ? `(${statusCounts[val] ?? 0})` : `(${drivers.length})`}
          </button>
        ))}
      </div>

      {/* Search */}
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search drivers by name or licence…"
        style={{ width: "100%", background: "#0D1F35", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "12px 16px", color: "#fff", fontSize: 13, fontFamily: "Inter, sans-serif", boxSizing: "border-box", marginBottom: 16, outline: "none" }}
      />

      {/* Driver grid */}
      {loading ? (
        <div style={{ color: "#8899AA", textAlign: "center", padding: 48 }}>Loading drivers…</div>
      ) : filtered.length === 0 ? (
        <div style={{ color: "#8899AA", textAlign: "center", padding: 48 }}>No drivers found</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
          {filtered.map((d) => (
            <DriverCard key={d.id} driver={d} onClick={() => setSelected(d)} />
          ))}
        </div>
      )}

      {selected && <DriverDetailPanel driver={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function DriverCard({ driver, onClick }) {
  const statusColor = { active: "#34C759", offline: "#556677", on_break: "#FF9500", emergency: "#FF3B3B", suspended: "#FF3B3B" }[driver.status] || "#8899AA";
  const scoreColor = driver.safetyScore >= 80 ? "#34C759" : driver.safetyScore >= 60 ? "#FF9500" : "#FF3B3B";
  const licenseWarning = new Date(driver.licenseExpiry) < new Date(Date.now() + 30 * 86400000);

  return (
    <div onClick={onClick} style={{ background: "#0D1F35", borderRadius: 14, padding: 18, cursor: "pointer", border: "1px solid rgba(255,255,255,0.05)", transition: "all 0.15s ease" }}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: `linear-gradient(135deg, #1E3A5F, #0A1628)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
          {driver.avatar ? <img src={driver.avatar} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 12 }} /> : "👤"}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>{driver.name}</span>
            <span style={{ background: `${statusColor}20`, color: statusColor, borderRadius: 6, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>{driver.status?.replace("_"," ").toUpperCase()}</span>
          </div>
          <div style={{ color: "#8899AA", fontSize: 12, marginTop: 3 }}>
            {driver.vehicleReg ? `🚛 ${driver.vehicleReg}` : "No vehicle assigned"}
          </div>
          {driver.routeName && <div style={{ color: "#8899AA", fontSize: 11, marginTop: 2 }}>📍 {driver.routeName}</div>}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 14 }}>
        <MiniStat label="Safety" value={`${driver.safetyScore}%`} color={scoreColor} />
        <MiniStat label="Hours Today" value={`${driver.hoursToday}h`} color={driver.hoursToday > 8 ? "#FF9500" : "#8899AA"} />
        <MiniStat label="Licence" value={licenseWarning ? "⚠️ Expiring" : "✓ Valid"} color={licenseWarning ? "#FF9500" : "#34C759"} />
      </div>
    </div>
  );
}

function MiniStat({ label, value, color }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "8px 10px", textAlign: "center" }}>
      <div style={{ color, fontSize: 12, fontWeight: 700 }}>{value}</div>
      <div style={{ color: "#556677", fontSize: 10, marginTop: 2 }}>{label}</div>
    </div>
  );
}

function DriverDetailPanel({ driver, onClose }) {
  const scoreColor = driver.safetyScore >= 80 ? "#34C759" : driver.safetyScore >= 60 ? "#FF9500" : "#FF3B3B";
  return (
    <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 420, background: "#0D1F35", borderLeft: "2px solid rgba(0,212,255,0.2)", zIndex: 100, overflowY: "auto", padding: 24, boxShadow: "-8px 0 32px rgba(0,0,0,0.4)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
        <h2 style={{ color: "#fff", margin: 0 }}>Driver Profile</h2>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "#fff", fontSize: 22, cursor: "pointer" }}>×</button>
      </div>

      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(135deg, #1E3A5F, #0A1628)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, margin: "0 auto 12px" }}>👤</div>
        <div style={{ color: "#fff", fontSize: 20, fontWeight: 700 }}>{driver.name}</div>
        <div style={{ color: "#8899AA", fontSize: 13, marginTop: 4 }}>{driver.email}</div>
      </div>

      {/* Safety score circle */}
      <div style={{ background: `${scoreColor}10`, border: `2px solid ${scoreColor}44`, borderRadius: 16, padding: 20, marginBottom: 20, textAlign: "center" }}>
        <div style={{ color: scoreColor, fontSize: 40, fontWeight: 800 }}>{driver.safetyScore}</div>
        <div style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>Safety Score</div>
        <div style={{ color: "#8899AA", fontSize: 11, marginTop: 4 }}>
          {driver.safetyScore >= 80 ? "Excellent — keep it up" : driver.safetyScore >= 60 ? "Moderate — coaching recommended" : "⚠️ High risk — urgent coaching needed"}
        </div>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {[
          ["Phone", driver.phone || "N/A"],
          ["Licence Number", driver.licenseNumber],
          ["Licence Expiry", new Date(driver.licenseExpiry).toLocaleDateString("en-GB")],
          ["Current Vehicle", driver.vehicleReg || "None"],
          ["Hours Today", `${driver.hoursToday}h`],
          ["Current Route", driver.routeName || "None"],
        ].map(([label, value]) => (
          <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
            <span style={{ color: "#8899AA", fontSize: 13 }}>{label}</span>
            <span style={{ color: "#fff", fontSize: 13, fontWeight: 500 }}>{value}</span>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
        <button style={{ ...primaryBtn, flex: 1 }}>📋 View History</button>
        <button style={{ ...primaryBtn, flex: 1, background: "rgba(0,212,255,0.1)", border: "1px solid #00D4FF22", color: "#00D4FF" }}>🎯 Coach</button>
      </div>
    </div>
  );
}

const primaryBtn: React.CSSProperties = { background: "linear-gradient(135deg, #0A1628, #00D4FF)", color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontWeight: 600, cursor: "pointer", fontFamily: "Inter, sans-serif", fontSize: 13 };
