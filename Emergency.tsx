// Fleet Apex Driver PWA — Emergency / SOS Page
import React, { useState, useEffect } from "react";

export default function EmergencyPage() {
  const [sent, setSent] = useState(false);
  const [location, setLocation] = useState<GeolocationCoordinates | null>(null);
  const [sending, setSending] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    // Auto-get GPS immediately
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation(pos.coords),
        () => {},
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
    // Vibrate on load
    if ("vibrate" in navigator) navigator.vibrate([300, 100, 300, 100, 300]);
  }, []);

  async function sendSOS() {
    setSending(true);
    let count = 3;
    setCountdown(count);
    const timer = setInterval(() => {
      count--;
      setCountdown(count);
      if (count === 0) {
        clearInterval(timer);
        dispatchEmergency();
      }
    }, 1000);
  }

  function cancelSOS() {
    setCountdown(null);
    setSending(false);
  }

  async function dispatchEmergency() {
    try {
      await fetch("/api/emergency", {
        method: "POST",
        body: JSON.stringify({
          type: "sos",
          location: location ? { lat: location.latitude, lng: location.longitude } : null,
          timestamp: new Date().toISOString(),
        }),
        headers: { "Content-Type": "application/json" },
        keepalive: true,
      });
    } catch {
      // Store offline
      localStorage.setItem("pending-emergency", JSON.stringify({ ts: new Date().toISOString(), location }));
    }
    setSent(true);
    setSending(false);
    setCountdown(null);
    if ("vibrate" in navigator) navigator.vibrate([500, 200, 500]);
  }

  if (sent) {
    return (
      <div style={{ minHeight: "100vh", background: "#1A0000", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, textAlign: "center" }}>
        <div style={{ fontSize: 72, marginBottom: 20 }}>🆘</div>
        <h1 style={{ color: "#FF3B3B", fontSize: 28, fontWeight: 800, marginBottom: 12 }}>SOS Sent!</h1>
        <p style={{ color: "#fff", fontSize: 16, marginBottom: 8 }}>Your dispatcher has been alerted.</p>
        <p style={{ color: "#8899AA", fontSize: 13, marginBottom: 8 }}>
          {location ? `📍 Your location has been shared.` : "⚠️ Location unavailable — keep your phone on."}
        </p>
        <p style={{ color: "#8899AA", fontSize: 13, marginBottom: 32 }}>Stay calm. Help is on the way.</p>
        <a href="tel:999" style={{ background: "#FF3B3B", color: "#fff", borderRadius: 16, padding: "16px 32px", fontWeight: 800, fontSize: 18, textDecoration: "none", marginBottom: 16, display: "block", width: "100%", textAlign: "center", boxSizing: "border-box" }}>
          📞 Call 999
        </a>
        <button onClick={() => setSent(false)} style={{ background: "rgba(255,255,255,0.08)", border: "none", color: "#8899AA", borderRadius: 12, padding: "12px 24px", cursor: "pointer", fontFamily: "Inter, sans-serif", width: "100%" }}>
          Cancel Alert
        </button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0A0000", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
      <div style={{ fontSize: 64, marginBottom: 16, animation: "pulse 1s infinite" }}>🚨</div>
      <h1 style={{ color: "#FF3B3B", fontSize: 26, fontWeight: 800, marginBottom: 8 }}>Emergency Alert</h1>
      <p style={{ color: "#fff", fontSize: 14, marginBottom: 4 }}>This will immediately alert your dispatcher and share your location.</p>
      <p style={{ color: "#8899AA", fontSize: 12, marginBottom: 32 }}>Only use in a genuine emergency.</p>

      {location && (
        <div style={{ background: "rgba(52,199,89,0.1)", border: "1px solid rgba(52,199,89,0.3)", borderRadius: 10, padding: "8px 16px", marginBottom: 24, color: "#34C759", fontSize: 12 }}>
          📍 GPS ready: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
        </div>
      )}

      {/* Countdown */}
      {countdown !== null && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 72, fontWeight: 900, color: "#FF3B3B", lineHeight: 1 }}>{countdown}</div>
          <div style={{ color: "#FF9500", fontSize: 14, marginTop: 8 }}>Sending in {countdown}s…</div>
          <button onClick={cancelSOS} style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", borderRadius: 12, padding: "10px 24px", marginTop: 16, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
            Cancel
          </button>
        </div>
      )}

      {countdown === null && (
        <button
          onClick={sendSOS}
          disabled={sending}
          style={{
            width: 180, height: 180, borderRadius: "50%",
            background: "linear-gradient(135deg, #FF3B3B, #CC0000)",
            border: "6px solid rgba(255,59,59,0.4)",
            color: "#fff", fontSize: 48, fontWeight: 900,
            cursor: "pointer",
            boxShadow: "0 0 60px rgba(255,59,59,0.5), 0 0 120px rgba(255,59,59,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "Inter, sans-serif",
            animation: "pulse 2s infinite",
          }}
        >
          SOS
        </button>
      )}

      {countdown === null && (
        <div style={{ marginTop: 32, display: "flex", flexDirection: "column", gap: 12, width: "100%" }}>
          <a href="tel:999" style={{ background: "rgba(255,59,59,0.1)", border: "1px solid rgba(255,59,59,0.3)", color: "#FF3B3B", borderRadius: 14, padding: "14px", fontWeight: 700, textDecoration: "none", fontSize: 16, display: "block" }}>
            📞 Call 999 Directly
          </a>
          <button onClick={() => window.history.back()} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#8899AA", borderRadius: 14, padding: "14px", cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
            ← Back to App
          </button>
        </div>
      )}

      <style>{`@keyframes pulse { 0%,100%{box-shadow:0 0 60px rgba(255,59,59,0.5)} 50%{box-shadow:0 0 100px rgba(255,59,59,0.8)} }`}</style>
    </div>
  );
}
