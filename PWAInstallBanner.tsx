// Fleet Apex — Universal PWA Install Banner + Floating Button
// Works for Android, iPhone, iPad, Desktop, Windows

import React, { useState, useEffect } from "react";
import {
  initPWAInstall,
  triggerInstall,
  isInstalled,
  getDeviceInfo,
  getInstallInstructions,
  canInstallNatively,
} from "./pwaInstall";

interface PWAInstallBannerProps {
  appName?: string;
  appIcon?: string;
  accentColor?: string;
}

export default function PWAInstallBanner({
  appName = "Fleet Apex",
  appIcon = "/icons/icon-192.png",
  accentColor = "#00D4FF",
}: PWAInstallBannerProps) {
  const [installAvailable, setInstallAvailable] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showFloating, setShowFloating] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [device] = useState(getDeviceInfo);

  useEffect(() => {
    if (isInstalled()) return;

    // Check if already dismissed
    const dismissed = localStorage.getItem("pwa-install-dismissed");
    const dismissedAt = dismissed ? parseInt(dismissed) : 0;
    const daysSince = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);

    initPWAInstall(
      () => {
        setInstallAvailable(true);
        if (daysSince > 3) {
          setTimeout(() => setShowBanner(true), 2000);
          setTimeout(() => setShowFloating(true), 5000);
        } else {
          setShowFloating(true);
        }
      },
      () => {
        setInstalled(true);
        setShowBanner(false);
        setShowFloating(false);
      }
    );

    // For iOS Safari — show manual instructions after delay
    if (device.isIOS && device.isSafari && daysSince > 3) {
      setTimeout(() => setShowBanner(true), 2000);
    }
  }, []);

  const handleInstall = async () => {
    if (canInstallNatively()) {
      setInstalling(true);
      const result = await triggerInstall();
      setInstalling(false);
      if (result === "accepted") {
        setInstalled(true);
        setShowBanner(false);
        setShowFloating(false);
      }
    } else {
      setShowModal(true);
    }
  };

  const dismiss = () => {
    setShowBanner(false);
    localStorage.setItem("pwa-install-dismissed", Date.now().toString());
  };

  if (installed || isInstalled()) return null;

  return (
    <>
      {/* ── Install Banner ── */}
      {showBanner && (
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 9999,
          background: "linear-gradient(135deg, #0A1628 0%, #1E3A5F 100%)",
          borderTop: `2px solid ${accentColor}`,
          padding: "16px 20px",
          display: "flex", alignItems: "center", gap: 16,
          boxShadow: "0 -8px 32px rgba(0,212,255,0.2)",
          animation: "slideUp 0.4s ease",
        }}>
          <img src={appIcon} alt={appName} style={{ width: 52, height: 52, borderRadius: 12 }} />
          <div style={{ flex: 1 }}>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 15, fontFamily: "Inter, sans-serif" }}>
              Install {appName}
            </div>
            <div style={{ color: "#8899AA", fontSize: 12, marginTop: 2 }}>
              {device.isIOS ? "Add to Home Screen for the best experience" :
               device.isAndroid ? "Install for offline access & push alerts" :
               "Install as desktop app for faster access"}
            </div>
          </div>
          <button
            onClick={handleInstall}
            disabled={installing}
            style={{
              background: accentColor, color: "#050E1A", border: "none",
              borderRadius: 10, padding: "10px 20px", fontWeight: 700,
              fontSize: 14, cursor: "pointer", whiteSpace: "nowrap",
              fontFamily: "Inter, sans-serif",
            }}
          >
            {installing ? "Installing…" : "Install"}
          </button>
          <button
            onClick={dismiss}
            style={{
              background: "transparent", border: "none", color: "#8899AA",
              fontSize: 20, cursor: "pointer", padding: 4,
            }}
          >×</button>
        </div>
      )}

      {/* ── Floating Install Button ── */}
      {showFloating && !showBanner && (
        <button
          onClick={handleInstall}
          title={`Install ${appName}`}
          style={{
            position: "fixed", bottom: 24, right: 24, zIndex: 9998,
            background: `linear-gradient(135deg, ${accentColor}, #007AFF)`,
            color: "#050E1A", border: "none", borderRadius: "50%",
            width: 56, height: 56, fontSize: 24,
            cursor: "pointer", boxShadow: `0 4px 24px rgba(0,212,255,0.4)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            animation: "pulse 2s infinite",
          }}
        >
          ⬇
        </button>
      )}

      {/* ── Manual Install Modal ── */}
      {showModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 10000,
          background: "rgba(5,14,26,0.9)", display: "flex",
          alignItems: "flex-end", justifyContent: "center",
          padding: 20,
        }} onClick={() => setShowModal(false)}>
          <div
            style={{
              background: "#0D1F35", borderRadius: 20, padding: 28,
              border: `1px solid ${accentColor}`, maxWidth: 480, width: "100%",
              boxShadow: "0 8px 48px rgba(0,212,255,0.3)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <img src={appIcon} alt={appName} style={{ width: 64, height: 64, borderRadius: 16, marginBottom: 16 }} />
            <h3 style={{ color: "#fff", fontFamily: "Inter, sans-serif", margin: "0 0 8px" }}>
              Install {appName}
            </h3>
            <pre style={{
              color: "#8899AA", fontSize: 13, fontFamily: "Inter, sans-serif",
              lineHeight: 1.8, whiteSpace: "pre-wrap", margin: "16px 0",
            }}>
              {getInstallInstructions(appName)}
            </pre>
            <button
              onClick={() => setShowModal(false)}
              style={{
                background: accentColor, color: "#050E1A", border: "none",
                borderRadius: 10, padding: "12px 24px", fontWeight: 700,
                fontSize: 15, cursor: "pointer", width: "100%",
                fontFamily: "Inter, sans-serif",
              }}
            >
              Got it
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes pulse { 0%, 100% { box-shadow: 0 4px 24px rgba(0,212,255,0.4); } 50% { box-shadow: 0 4px 40px rgba(0,212,255,0.8); } }
      `}</style>
    </>
  );
}
