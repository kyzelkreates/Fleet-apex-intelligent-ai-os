// Fleet Apex Driver PWA — Navigation / Turn-by-Turn
import React, { useState, useEffect, useRef } from "react";

export default function NavigationPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [route, setRoute] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [hazards, setHazards] = useState<any[]>([]);
  const [mapInstance, setMapInstance] = useState<any>(null);

  useEffect(() => {
    loadMap();
    fetchRoute();
    startTracking();
  }, []);

  async function loadMap() {
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css"; link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }
    if (!(window as any).L) {
      await new Promise<void>((resolve) => {
        const script = document.createElement("script");
        script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        script.onload = () => resolve();
        document.body.appendChild(script);
      });
    }
    if (!mapRef.current) return;
    const L = (window as any).L;
    const map = L.map(mapRef.current, { center: [52.4862, -1.8904], zoom: 14, zoomControl: false });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", { subdomains: "abcd", maxZoom: 20 }).addTo(map);
    setMapInstance(map);
    setMapLoaded(true);
  }

  function startTracking() {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.watchPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        if (mapInstance) mapInstance.setView([loc.lat, loc.lng], 16);
        updateUserMarker(loc);
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 2000 }
    );
  }

  function updateUserMarker(loc: { lat: number; lng: number }) {
    const L = (window as any).L;
    if (!L || !mapInstance) return;
    mapInstance.eachLayer((layer: any) => { if (layer._userMarker) mapInstance.removeLayer(layer); });
    const icon = L.divIcon({ html: `<div style="background:#00D4FF;border:3px solid #fff;border-radius:50%;width:18px;height:18px;box-shadow:0 0 16px #00D4FF"></div>`, className: "", iconSize: [18, 18], iconAnchor: [9, 9] });
    const marker = L.marker([loc.lat, loc.lng], { icon });
    marker._userMarker = true;
    marker.addTo(mapInstance);
  }

  async function fetchRoute() {
    try {
      const res = await fetch("/api/driver/active-route");
      if (res.ok) setRoute(await res.json());
      const hazRes = await fetch("/api/hazards/nearby?radius=10");
      if (hazRes.ok) { const d = await hazRes.json(); setHazards(d.hazards || []); }
    } catch {}
  }

  const steps = route?.steps || [
    { instruction: "Head north on High Street", distance: "0.3 mi", direction: "⬆️" },
    { instruction: "Turn right onto London Road", distance: "1.2 mi", direction: "➡️" },
    { instruction: "Continue straight on A46", distance: "5.4 mi", direction: "⬆️" },
  ];

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#050E1A", paddingBottom: 72 }}>
      {/* Direction banner */}
      {steps[currentStep] && (
        <div style={{ background: "linear-gradient(135deg, #0A1628, #1E3A5F)", padding: "16px 20px", borderBottom: "1px solid rgba(0,212,255,0.15)", flexShrink: 0, zIndex: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ fontSize: 40, flexShrink: 0 }}>{steps[currentStep].direction}</div>
            <div>
              <div style={{ color: "#fff", fontSize: 17, fontWeight: 700, lineHeight: 1.3 }}>{steps[currentStep].instruction}</div>
              <div style={{ color: "#00D4FF", fontSize: 13, marginTop: 4 }}>{steps[currentStep].distance}</div>
            </div>
          </div>
          {/* Step progress */}
          <div style={{ display: "flex", gap: 4, marginTop: 10 }}>
            {steps.map((_: any, i: number) => (
              <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= currentStep ? "#00D4FF" : "rgba(255,255,255,0.1)" }} />
            ))}
          </div>
        </div>
      )}

      {/* Hazard alerts */}
      {hazards.filter((h: any) => h.severity === "red").map((h: any) => (
        <div key={h.id} style={{ background: "rgba(255,59,59,0.15)", border: "1px solid rgba(255,59,59,0.4)", padding: "10px 16px", display: "flex", gap: 10, alignItems: "center", flexShrink: 0 }}>
          <span style={{ fontSize: 20 }}>🚨</span>
          <div>
            <div style={{ color: "#FF3B3B", fontSize: 12, fontWeight: 700 }}>Hazard ahead: {h.type?.replace("_"," ")}</div>
            {h.roadName && <div style={{ color: "#8899AA", fontSize: 11 }}>{h.roadName}</div>}
          </div>
        </div>
      ))}

      {/* Map */}
      <div style={{ flex: 1, position: "relative" }}>
        <div ref={mapRef} style={{ width: "100%", height: "100%" }} />
        {!mapLoaded && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#050E1A", color: "#00D4FF", fontSize: 14 }}>
            🗺️ Loading map…
          </div>
        )}

        {/* Map controls */}
        <div style={{ position: "absolute", bottom: 16, right: 16, display: "flex", flexDirection: "column", gap: 8, zIndex: 500 }}>
          <button onClick={() => mapInstance?.setZoom((mapInstance.getZoom() || 14) + 1)} style={mapBtn}>+</button>
          <button onClick={() => mapInstance?.setZoom((mapInstance.getZoom() || 14) - 1)} style={mapBtn}>−</button>
          {userLocation && <button onClick={() => mapInstance?.setView([userLocation.lat, userLocation.lng], 16)} style={{ ...mapBtn, background: "rgba(0,212,255,0.2)", border: "1px solid #00D4FF" }}>◎</button>}
        </div>

        {/* Step nav buttons */}
        <div style={{ position: "absolute", bottom: 16, left: 16, display: "flex", gap: 8, zIndex: 500 }}>
          {currentStep > 0 && <button onClick={() => setCurrentStep(s => s - 1)} style={{ ...mapBtn, padding: "10px 14px", fontSize: 13 }}>← Prev</button>}
          {currentStep < steps.length - 1 && <button onClick={() => setCurrentStep(s => s + 1)} style={{ background: "#00D4FF", color: "#050E1A", border: "none", borderRadius: 10, padding: "10px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Next →</button>}
        </div>
      </div>
    </div>
  );
}

const mapBtn: React.CSSProperties = { background: "rgba(5,14,26,0.9)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", borderRadius: 10, padding: "10px 14px", cursor: "pointer", fontSize: 16, fontFamily: "Inter, sans-serif", backdropFilter: "blur(8px)" };
