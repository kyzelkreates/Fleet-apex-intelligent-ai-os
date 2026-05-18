// Fleet Apex Driver PWA — Main App
// FLAT BUILD: all imports resolved to same directory
import React, { useEffect, useState, Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { registerServiceWorker, requestPushPermission } from "./pwaInstall";
import InstallPrompt from "./InstallPrompt";
import DriverBottomNav from "./DriverBottomNav";
import LoadingScreen from "./LoadingScreen_driver-pwa_src_components";
import EmergencyButton from "./EmergencyButton";
import OnlineStatus from "./OnlineStatus";

const NavigationPage  = lazy(() => import("./Navigation"));
const HazardReport    = lazy(() => import("./HazardReport"));
const DriverDashboard = lazy(() => import("./DriverDashboard"));
const Messages        = lazy(() => import("./Messages_driver-pwa_src_pages"));
const Profile         = lazy(() => import("./Profile"));
const Emergency       = lazy(() => import("./Emergency"));
const Login           = lazy(() => import("./Login_driver-pwa_src_pages"));

export default function DriverApp() {
  const [authed, setAuthed] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const [branding, setBranding] = useState({
    accentColor: "#00D4FF", appName: "Fleet Apex Driver",
    logo: "", primaryColor: "#0A1628",
  });

  useEffect(() => {
    registerServiceWorker("/sw_driver-pwa_public.js");
    loadBranding();
    checkAuth();
    requestPushPermission();

    const goOnline  = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online",  goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online",  goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  async function loadBranding() {
    try {
      const res = await fetch("/api/branding/driver");
      if (res.ok) setBranding(await res.json());
    } catch {}
  }

  async function checkAuth() {
    setAuthed(true); // replace with Supabase session check
  }

  if (!authed) {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <Login branding={branding} onLogin={() => setAuthed(true)} />
        <InstallPrompt
          appName={branding.appName}
          appIcon={branding.logo || "/driver-icon-192.png"}
          accentColor={branding.accentColor}
          primaryColor={branding.primaryColor}
          isDriverApp={true}
        />
      </Suspense>
    );
  }

  return (
    <BrowserRouter>
      <div style={{ height: "100vh", background: "#050E1A", color: "#fff", fontFamily: "Inter, system-ui, sans-serif", display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
        {!online && <OnlineStatus />}
        <main style={{ flex: 1, overflow: "auto", paddingBottom: 72 }}>
          <Suspense fallback={<LoadingScreen />}>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DriverDashboard branding={branding} />} />
              <Route path="/navigation" element={<NavigationPage />} />
              <Route path="/hazard" element={<HazardReport />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/emergency" element={<Emergency />} />
            </Routes>
          </Suspense>
        </main>
        <DriverBottomNav accentColor={branding.accentColor} />
        <EmergencyButton />
        <InstallPrompt
          appName={branding.appName}
          appIcon={branding.logo || "/driver-icon-192.png"}
          accentColor={branding.accentColor}
          primaryColor={branding.primaryColor}
          isDriverApp={true}
        />
      </div>
    </BrowserRouter>
  );
}
