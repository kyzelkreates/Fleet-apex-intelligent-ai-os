// Fleet Apex — One-Touch PWA Install Prompt
// FLAT BUILD: all imports resolved to same directory
import React, { useState, useEffect, useCallback } from "react";
import {
  initPWAInstall, triggerInstall, isInstalled,
  getDeviceInfo, canInstallNatively,
} from "./pwaInstall";

interface InstallPromptProps {
  appName?: string;
  appIcon?: string;
  accentColor?: string;
  primaryColor?: string;
  isDriverApp?: boolean;
}

export default function InstallPrompt({
  appName = "Fleet Apex",
  appIcon = "/icon-192.png",
  accentColor = "#00D4FF",
  primaryColor = "#0A1628",
  isDriverApp = false,
}: InstallPromptProps) {
  const [show, setShow] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [device] = useState(getDeviceInfo);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (isInstalled()) return;
    const dismissedAt = parseInt(localStorage.getItem("pwa-dismissed") || "0");
    const daysSince = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);
    if (daysSince < 7) return;

    initPWAInstall(
      () => { setReady(true); setTimeout(() => setShow(true), 3000); },
      () => { setInstalled(true); setShow(false); }
    );
    if (device.isIOS) { setReady(true); setTimeout(() => setShow(true), 3000); }
  }, []);

  const handleInstall = useCallback(async () => {
    if (device.isIOS) { setShowIOSGuide(true); return; }
    if (canInstallNatively()) {
      setInstalling(true);
      const result = await triggerInstall();
      setInstalling(false);
      if (result === "accepted") {
        setInstalled(true); setShow(false);
        if ("vibrate" in navigator) navigator.vibrate([200, 100, 200]);
      }
      return;
    }
    setShowIOSGuide(true);
  }, [device]);

  const dismiss = useCallback(() => {
    setShow(false);
    localStorage.setItem("pwa-dismissed", Date.now().toString());
  }, []);

  if (installed || isInstalled() || !ready || !show) return null;

  return (
    <>
      <div style={{
        position: "fixed",
        bottom: isDriverApp ? 80 : 0,
        left: 0, right: 0,
        zIndex: 9999,
        padding: "12px 16px 16px",
        background: `linear-gradient(135deg, ${primaryColor} 0%, #0D1F35 100%)`,
        borderTop: `3px solid ${accentColor}`,
        boxShadow: `0 -8px 40px ${accentColor}25`,
        animation: "slideUp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
        fontFamily: "Inter, system-ui, sans-serif",
      }}>
        <div style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
            <img src={appIcon} alt={appName} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              style={{ width: 54, height: 54, borderRadius: 14, flexShrink: 0, background: `${accentColor}20`, objectFit: "cover" }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: "#fff", fontWeight: 800, fontSize: 15, marginBottom: 2 }}>Install {appName}</div>
              <div style={{ color: "#8899AA", fontSize: 12, lineHeight: 1.4 }}>
                {device.isIOS ? "Add to your Home Screen — works offline, no app store needed"
                  : device.isAndroid ? "Install as an app — offline access & instant notifications"
                  : "Install as a desktop app for faster access"}
              </div>
            </div>
            <button onClick={dismiss} style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: "50%", width: 30, height: 30, color: "#8899AA", cursor: "pointer", fontSize: 16, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
          </div>
          <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
            {["⚡ Instant access", "📶 Works offline", "🔔 Live alerts", "📍 GPS tracking"].map((b) => (
              <span key={b} style={{ background: `${accentColor}15`, border: `1px solid ${accentColor}30`, color: accentColor, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 600 }}>{b}</span>
            ))}
          </div>
          <button onClick={handleInstall} disabled={installing} style={{
            width: "100%",
            background: installing ? "rgba(255,255,255,0.1)" : `linear-gradient(135deg, ${accentColor}, #007AFF)`,
            color: installing ? "#8899AA" : "#050E1A",
            border: "none", borderRadius: 14, padding: "15px 24px",
            fontWeight: 800, fontSize: 16, cursor: installing ? "not-allowed" : "pointer",
            fontFamily: "Inter, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            boxShadow: installing ? "none" : `0 4px 20px ${accentColor}40`,
          }}>
            {installing ? <>⏳ Installing…</> : device.isIOS ? <>📲 Add to Home Screen</> : <>⬇️ Install App — It's Free</>}
          </button>
          {device.isIOS && <div style={{ color: "#556677", fontSize: 11, textAlign: "center", marginTop: 8 }}>Tap then look for "Add to Home Screen" ↓</div>}
        </div>
      </div>

      {showIOSGuide && (
        <div style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(0,0,0,0.7)", display: "flex", flexDirection: "column", justifyContent: "flex-end" }} onClick={() => setShowIOSGuide(false)}>
          <div style={{ background: "#0D1F35", borderRadius: "20px 20px 0 0", padding: 24, paddingBottom: 40, border: `2px solid ${accentColor}`, fontFamily: "Inter, sans-serif" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ width: 40, height: 4, background: "rgba(255,255,255,0.2)", borderRadius: 2, margin: "0 auto 20px" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
              <img src={appIcon} alt="" style={{ width: 52, height: 52, borderRadius: 12 }} />
              <div>
                <div style={{ color: "#fff", fontWeight: 800, fontSize: 17 }}>Install {appName}</div>
                <div style={{ color: "#8899AA", fontSize: 12 }}>Follow these 3 quick steps</div>
              </div>
            </div>
            <div style={{ display: "grid", gap: 16 }}>
              {device.isIOS ? <>
                <IOSStep num={1} icon="⬆️" title="Tap the Share button" desc="The box with an arrow at the bottom of your browser" accentColor={accentColor} />
                <IOSStep num={2} icon="➕" title='Tap "Add to Home Screen"' desc="Scroll down in the share sheet to find it" accentColor={accentColor} />
                <IOSStep num={3} icon="✅" title='Tap "Add"' desc="The app will appear on your home screen instantly" accentColor={accentColor} />
              </> : <>
                <IOSStep num={1} icon="🌐" title="Look in your browser's address bar" desc='Find the install icon (⊕) or "Install app" in the browser menu' accentColor={accentColor} />
                <IOSStep num={2} icon="📲" title='Click "Install"' desc="Confirm the installation when prompted" accentColor={accentColor} />
                <IOSStep num={3} icon="🚀" title="Done!" desc={`${appName} will open as a standalone app`} accentColor={accentColor} />
              </>}
            </div>
            <button onClick={() => setShowIOSGuide(false)} style={{ width: "100%", marginTop: 24, background: accentColor, color: "#050E1A", border: "none", borderRadius: 14, padding: "15px", fontWeight: 800, fontSize: 15, cursor: "pointer" }}>Got it!</button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </>
  );
}

function IOSStep({ num, icon, title, desc, accentColor }: { num: number; icon: string; title: string; desc: string; accentColor: string }) {
  return (
    <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
      <div style={{ width: 36, height: 36, borderRadius: "50%", background: `${accentColor}20`, border: `2px solid ${accentColor}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: accentColor, fontWeight: 800, fontSize: 14 }}>{num}</div>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
          <span style={{ fontSize: 18 }}>{icon}</span>
          <span style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>{title}</span>
        </div>
        <div style={{ color: "#8899AA", fontSize: 12, lineHeight: 1.5 }}>{desc}</div>
      </div>
    </div>
  );
}
