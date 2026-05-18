// Fleet Apex Admin — Live Fleet Map
import React, { useState, useEffect, useRef } from "react";
import type { Driver, Hazard, Vehicle } from "./index";
import { HAZARD_TYPES } from "./brand";

const SEVERITY_COLORS = { red: "#FF3B3B", orange: "#FF9500", yellow: "#FFD60A" };

interface DriverPosition {
  driverId: string;
  name: string;
  vehicleReg: string;
  lat: number;
  lng: number;
  speed: number;
  status: string;
  heading: number;
  routeName?: string;
}

export default function LiveMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [drivers, setDrivers] = useState<DriverPosition[]>([]);
  const [hazards, setHazards] = useState<Hazard[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<DriverPosition | null>(null);
  const [selectedHazard, setSelectedHazard] = useState<Hazard | null>(null);
  const [showHazards, setShowHazards] = useState(true);
  const [showDrivers, setShowDrivers] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [mapInstance, setMapInstance] = useState<any>(null);

  useEffect(() => {
    loadLeaflet();
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  async function loadLeaflet() {
    // Load Leaflet CSS
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }
    // Load Leaflet JS
    if (!(window as any).L) {
      await new Promise<void>((resolve) => {
        const script = document.createElement("script");
        script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        script.onload = () => resolve();
        document.body.appendChild(script);
      });
    }
    initMap();
  }

  function initMap() {
    const L = (window as any).L;
    if (!mapRef.current || mapInstance) return;

    const map = L.map(mapRef.current, {
      center: [52.4862, -1.8904], // UK centre
      zoom: 7,
      zoomControl: true,
    });

    // Dark map tiles
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: "© OpenStreetMap contributors © CARTO",
      subdomains: "abcd",
      maxZoom: 20,
    }).addTo(map);

    setMapInstance(map);
    setMapLoaded(true);
  }

  async function fetchData() {
    try {
      const [driversRes, hazardsRes] = await Promise.all([
        fetch("/api/drivers/positions"),
        fetch("/api/hazards?resolved=false"),
      ]);
      if (driversRes.ok) setDrivers(await driversRes.json());
      if (hazardsRes.ok) {
        const data = await hazardsRes.json();
        setHazards(data.hazards || []);
      }
    } catch {}
  }

  // Update markers when data changes
  useEffect(() => {
    if (!mapInstance || !mapLoaded) return;
    updateMapMarkers();
  }, [drivers, hazards, showDrivers, showHazards, mapInstance]);

  function updateMapMarkers() {
    const L = (window as any).L;
    if (!L || !mapInstance) return;

    // Clear existing markers
    mapInstance.eachLayer((layer: any) => {
      if (layer._fleetApexMarker) mapInstance.removeLayer(layer);
    });

    // Driver markers
    if (showDrivers) {
      drivers.forEach((d) => {
        if (!d.lat || !d.lng) return;
        const statusColor = d.status === "active" ? "#34C759" : d.status === "emergency" ? "#FF3B3B" : "#FF9500";
        const icon = L.divIcon({
          html: `<div style="background:${statusColor};border:2px solid #fff;border-radius:50%;width:14px;height:14px;box-shadow:0 0 8px ${statusColor}"></div>`,
          className: "",
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });
        const marker = L.marker([d.lat, d.lng], { icon });
        marker._fleetApexMarker = true;
        marker.bindPopup(`
          <div style="font-family:Inter,sans-serif;min-width:180px">
            <div style="font-weight:700;margin-bottom:4px">🚛 ${d.vehicleReg}</div>
            <div style="color:#666;font-size:12px">${d.name}</div>
            <div style="font-size:12px;margin-top:6px">Speed: <b>${d.speed || 0} km/h</b></div>
            <div style="font-size:12px">Route: <b>${d.routeName || "N/A"}</b></div>
            <div style="font-size:11px;color:${statusColor};margin-top:4px;font-weight:700">${d.status?.toUpperCase()}</div>
          </div>
        `);
        marker.on("click", () => setSelectedDriver(d));
        marker.addTo(mapInstance);
      });
    }

    // Hazard markers
    if (showHazards) {
      hazards.forEach((h) => {
        if (!h.location?.lat || !h.location?.lng) return;
        const color = SEVERITY_COLORS[h.severity];
        const hazardType = HAZARD_TYPES.find((ht) => ht.id === h.type);
        const icon = L.divIcon({
          html: `<div style="background:${color};border-radius:50%;width:16px;height:16px;border:2px solid #fff;display:flex;align-items:center;justify-content:center;font-size:9px;box-shadow:0 0 8px ${color}"></div>`,
          className: "",
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        });
        const marker = L.marker([h.location.lat, h.location.lng], { icon });
        marker._fleetApexMarker = true;
        marker.bindPopup(`
          <div style="font-family:Inter,sans-serif;min-width:180px">
            <div style="font-weight:700;margin-bottom:4px">${hazardType?.icon || "⚠️"} ${hazardType?.label || h.type}</div>
            <div style="font-size:12px;color:${color};font-weight:700">${h.severity.toUpperCase()}</div>
            ${h.roadName ? `<div style="font-size:12px;margin-top:4px">📍 ${h.roadName}</div>` : ""}
            ${h.description ? `<div style="font-size:12px;color:#666;margin-top:4px">${h.description}</div>` : ""}
            <div style="font-size:11px;color:#999;margin-top:4px">${new Date(h.reportedAt).toLocaleString("en-GB")}</div>
          </div>
        `);
        marker.on("click", () => setSelectedHazard(h));
        marker.addTo(mapInstance);
      });
    }
  }

  const filteredDrivers = filterStatus === "all" ? drivers : drivers.filter((d) => d.status === filterStatus);

  return (
    <div style={{ height: "100%", display: "flex", overflow: "hidden", position: "relative" }}>
      {/* Map */}
      <div ref={mapRef} style={{ flex: 1, background: "#050E1A" }} />

      {!mapLoaded && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#050E1A", color: "#00D4FF", fontSize: 14 }}>
          🗺️ Loading map…
        </div>
      )}

      {/* Map controls overlay */}
      <div style={{ position: "absolute", top: 16, left: 16, display: "flex", flexDirection: "column", gap: 8, zIndex: 500 }}>
        <MapToggle label="🚛 Vehicles" active={showDrivers} onClick={() => setShowDrivers(!showDrivers)} />
        <MapToggle label="⚠️ Hazards" active={showHazards} onClick={() => setShowHazards(!showHazards)} />
      </div>

      {/* Stats overlay */}
      <div style={{ position: "absolute", top: 16, right: 16, zIndex: 500, display: "flex", flexDirection: "column", gap: 8 }}>
        <StatBadge label="Active" value={drivers.filter((d) => d.status === "active").length} color="#34C759" />
        <StatBadge label="Hazards" value={hazards.length} color="#FF9500" />
        {drivers.filter((d) => d.status === "emergency").length > 0 && (
          <StatBadge label="🚨 SOS" value={drivers.filter((d) => d.status === "emergency").length} color="#FF3B3B" pulse />
        )}
      </div>

      {/* Driver list panel */}
      <div style={{
        width: 300, background: "rgba(5,14,26,0.95)", borderLeft: "1px solid rgba(255,255,255,0.06)",
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ color: "#fff", fontWeight: 700, fontSize: 14, marginBottom: 10 }}>Fleet Status</div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{ width: "100%", background: "#0D1F35", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "6px 10px", color: "#fff", fontSize: 12, fontFamily: "Inter, sans-serif" }}
          >
            <option value="all">All Drivers</option>
            <option value="active">Active</option>
            <option value="on_break">On Break</option>
            <option value="offline">Offline</option>
            <option value="emergency">Emergency</option>
          </select>
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {filteredDrivers.length === 0 ? (
            <div style={{ color: "#556677", textAlign: "center", padding: 24, fontSize: 13 }}>No drivers matching filter</div>
          ) : filteredDrivers.map((d) => (
            <DriverListItem
              key={d.driverId}
              driver={d}
              selected={selectedDriver?.driverId === d.driverId}
              onClick={() => {
                setSelectedDriver(d);
                if (mapInstance && d.lat && d.lng) {
                  mapInstance.setView([d.lat, d.lng], 14);
                }
              }}
            />
          ))}
        </div>
      </div>

      {/* Selected hazard detail */}
      {selectedHazard && (
        <div style={{
          position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)",
          background: "#0D1F35", borderRadius: 14, padding: 16,
          border: `2px solid ${SEVERITY_COLORS[selectedHazard.severity]}`,
          zIndex: 500, minWidth: 320, boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ color: "#fff", fontWeight: 700 }}>
              {HAZARD_TYPES.find((h) => h.id === selectedHazard.type)?.icon} {HAZARD_TYPES.find((h) => h.id === selectedHazard.type)?.label}
            </span>
            <button onClick={() => setSelectedHazard(null)} style={{ background: "none", border: "none", color: "#fff", fontSize: 18, cursor: "pointer" }}>×</button>
          </div>
          <div style={{ color: "#8899AA", fontSize: 12 }}>{selectedHazard.roadName || "Unknown road"}</div>
          {selectedHazard.description && <div style={{ color: "#cdd", fontSize: 13, marginTop: 6 }}>{selectedHazard.description}</div>}
        </div>
      )}
    </div>
  );
}

function MapToggle({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      background: active ? "rgba(0,212,255,0.15)" : "rgba(5,14,26,0.85)",
      border: `1px solid ${active ? "#00D4FF" : "rgba(255,255,255,0.1)"}`,
      color: active ? "#00D4FF" : "#8899AA",
      borderRadius: 8, padding: "6px 12px", fontSize: 12,
      cursor: "pointer", fontFamily: "Inter, sans-serif",
      backdropFilter: "blur(8px)",
    }}>{label}</button>
  );
}

function StatBadge({ label, value, color, pulse = false }) {
  return (
    <div style={{
      background: "rgba(5,14,26,0.85)", border: `1px solid ${color}44`,
      borderRadius: 8, padding: "6px 12px", textAlign: "center",
      backdropFilter: "blur(8px)",
      animation: pulse ? "pulse 1s infinite" : "none",
    }}>
      <div style={{ color, fontSize: 18, fontWeight: 800 }}>{value}</div>
      <div style={{ color: "#8899AA", fontSize: 10 }}>{label}</div>
    </div>
  );
}

function DriverListItem({ driver, selected, onClick }) {
  const statusColor = driver.status === "active" ? "#34C759" : driver.status === "emergency" ? "#FF3B3B" : driver.status === "on_break" ? "#FF9500" : "#556677";
  return (
    <div onClick={onClick} style={{
      padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)",
      cursor: "pointer", background: selected ? "rgba(0,212,255,0.06)" : "transparent",
      borderLeft: selected ? "3px solid #00D4FF" : "3px solid transparent",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>{driver.name}</div>
          <div style={{ color: "#8899AA", fontSize: 11, marginTop: 2 }}>🚛 {driver.vehicleReg}</div>
        </div>
        <div style={{ background: `${statusColor}22`, color: statusColor, borderRadius: 6, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>
          {driver.status?.replace("_", " ").toUpperCase()}
        </div>
      </div>
      {driver.routeName && <div style={{ color: "#556677", fontSize: 11, marginTop: 4 }}>📍 {driver.routeName}</div>}
      {driver.speed > 0 && <div style={{ color: "#556677", fontSize: 11 }}>⚡ {driver.speed} km/h</div>}
    </div>
  );
}
