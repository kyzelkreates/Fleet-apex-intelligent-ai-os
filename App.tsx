// Fleet Apex Admin Dashboard — Main App
// FLAT BUILD: all imports resolved to same directory
import React, { useEffect, useState, Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { registerServiceWorker } from "./pwaInstall";
import InstallPrompt from "./InstallPrompt";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import LoadingScreen from "./LoadingScreen";

const LiveMap         = lazy(() => import("./LiveMap"));
const Dashboard       = lazy(() => import("./Dashboard"));
const DriversPage     = lazy(() => import("./Drivers"));
const VehiclesPage    = lazy(() => import("./Vehicles"));
const RoutesPage      = lazy(() => import("./Routes"));
const HazardsPage     = lazy(() => import("./HazardsPage"));
const AICommandCenter = lazy(() => import("./AICommandCenter"));
const CompliancePage  = lazy(() => import("./Compliance"));
const MessagesPage    = lazy(() => import("./Messages"));
const BrandingPage    = lazy(() => import("./Branding"));
const SettingsPage    = lazy(() => import("./Settings"));
const LoginPage       = lazy(() => import("./Login"));
const OnboardingPage  = lazy(() => import("./Onboarding"));

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [branding, setBranding] = useState({
    primaryColor: "#0A1628", accentColor: "#00D4FF",
    appName: "Fleet Apex", logo: "",
  });
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    registerServiceWorker("/sw.js");
    loadBranding();
    checkAuth();
  }, []);

  async function loadBranding() {
    try {
      const res = await fetch("/api/branding");
      if (res.ok) {
        const data = await res.json();
        setBranding(data);
        applyBrandingToDOM(data);
      }
    } catch {}
  }

  function applyBrandingToDOM(b: typeof branding) {
    document.documentElement.style.setProperty("--color-primary", b.primaryColor);
    document.documentElement.style.setProperty("--color-accent", b.accentColor);
    document.title = `${b.appName} — Fleet Dashboard`;
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (meta) meta.content = b.primaryColor;
  }

  async function checkAuth() {
    setIsAuthenticated(true); // replace with Supabase session check
  }

  if (!isAuthenticated) {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <LoginPage branding={branding} onLogin={() => setIsAuthenticated(true)} />
        <InstallPrompt appName={branding.appName} appIcon={branding.logo || "/icon-192.png"} accentColor={branding.accentColor} primaryColor={branding.primaryColor} />
      </Suspense>
    );
  }

  return (
    <BrowserRouter>
      <div style={{ display: "flex", height: "100vh", background: "#050E1A", color: "#fff", fontFamily: "Inter, system-ui, sans-serif", overflow: "hidden" }}>
        <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} branding={branding} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <TopBar branding={branding} onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
          <main style={{ flex: 1, overflow: "auto", position: "relative" }}>
            <Suspense fallback={<LoadingScreen />}>
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/map" element={<LiveMap />} />
                <Route path="/drivers" element={<DriversPage />} />
                <Route path="/vehicles" element={<VehiclesPage />} />
                <Route path="/routes" element={<RoutesPage />} />
                <Route path="/hazards" element={<HazardsPage />} />
                <Route path="/ai" element={<AICommandCenter />} />
                <Route path="/compliance" element={<CompliancePage />} />
                <Route path="/messages" element={<MessagesPage />} />
                <Route path="/branding" element={<BrandingPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/onboarding" element={<OnboardingPage />} />
              </Routes>
            </Suspense>
          </main>
        </div>
        <InstallPrompt
          appName={branding.appName}
          appIcon={branding.logo || "/icon-192.png"}
          accentColor={branding.accentColor}
          primaryColor={branding.primaryColor}
        />
      </div>
    </BrowserRouter>
  );
}
