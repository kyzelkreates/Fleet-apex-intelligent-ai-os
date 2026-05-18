// Fleet Apex — Supabase Realtime Engine
// Handles: vehicle locations, hazards, messages, route updates, driver status, alerts

import type { LocationUpdate, Hazard, Driver, Route } from "./index";

type EventHandler<T> = (data: T) => void;

interface RealtimeEngine {
  onLocationUpdate: (cb: EventHandler<LocationUpdate>) => void;
  onHazardReport: (cb: EventHandler<Hazard>) => void;
  onHazardResolved: (cb: EventHandler<{ id: string }>) => void;
  onDriverStatusChange: (cb: EventHandler<Partial<Driver>>) => void;
  onRouteUpdate: (cb: EventHandler<Partial<Route>>) => void;
  onMessage: (cb: EventHandler<any>) => void;
  onComplianceAlert: (cb: EventHandler<any>) => void;
  onEmergency: (cb: EventHandler<any>) => void;
  disconnect: () => void;
}

export class FleetApexRealtime implements RealtimeEngine {
  private supabase: any;
  private companyId: string;
  private channels: any[] = [];

  constructor(supabaseClient: any, companyId: string) {
    this.supabase = supabaseClient;
    this.companyId = companyId;
  }

  // ── Driver Positions (high-frequency) ───────────────────────
  onLocationUpdate(cb: EventHandler<LocationUpdate>) {
    const channel = this.supabase
      .channel(`driver-positions-${this.companyId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "driver_positions",
        filter: `company_id=eq.${this.companyId}`,
      }, (payload: any) => cb(payload.new))
      .subscribe();
    this.channels.push(channel);
  }

  // ── Hazard Reports ────────────────────────────────────────────
  onHazardReport(cb: EventHandler<Hazard>) {
    const channel = this.supabase
      .channel(`hazards-new-${this.companyId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "hazards",
        filter: `company_id=eq.${this.companyId}`,
      }, (payload: any) => cb(payload.new))
      .subscribe();
    this.channels.push(channel);
  }

  onHazardResolved(cb: EventHandler<{ id: string }>) {
    const channel = this.supabase
      .channel(`hazards-resolved-${this.companyId}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "hazards",
        filter: `company_id=eq.${this.companyId}`,
      }, (payload: any) => {
        if (payload.new.resolved && !payload.old.resolved) cb({ id: payload.new.id });
      })
      .subscribe();
    this.channels.push(channel);
  }

  // ── Driver Status ─────────────────────────────────────────────
  onDriverStatusChange(cb: EventHandler<Partial<Driver>>) {
    const channel = this.supabase
      .channel(`driver-status-${this.companyId}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "drivers",
        filter: `company_id=eq.${this.companyId}`,
      }, (payload: any) => cb(payload.new))
      .subscribe();
    this.channels.push(channel);
  }

  // ── Route Updates ─────────────────────────────────────────────
  onRouteUpdate(cb: EventHandler<Partial<Route>>) {
    const channel = this.supabase
      .channel(`routes-${this.companyId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "routes",
        filter: `company_id=eq.${this.companyId}`,
      }, (payload: any) => cb(payload.new))
      .subscribe();
    this.channels.push(channel);
  }

  // ── Messages ──────────────────────────────────────────────────
  onMessage(cb: EventHandler<any>) {
    const channel = this.supabase
      .channel(`messages-${this.companyId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `company_id=eq.${this.companyId}`,
      }, (payload: any) => cb(payload.new))
      .subscribe();
    this.channels.push(channel);
  }

  // ── Compliance Alerts ─────────────────────────────────────────
  onComplianceAlert(cb: EventHandler<any>) {
    const channel = this.supabase
      .channel(`compliance-${this.companyId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "compliance_alerts",
        filter: `company_id=eq.${this.companyId}`,
      }, (payload: any) => cb(payload.new))
      .subscribe();
    this.channels.push(channel);
  }

  // ── Emergency Events ──────────────────────────────────────────
  onEmergency(cb: EventHandler<any>) {
    const channel = this.supabase
      .channel(`emergency-${this.companyId}`)
      .on("broadcast", { event: "emergency" }, ({ payload }) => cb(payload))
      .subscribe();
    this.channels.push(channel);
  }

  // ── Send emergency broadcast ──────────────────────────────────
  async broadcastEmergency(driverId: string, location: any) {
    await this.supabase.channel(`emergency-${this.companyId}`).send({
      type: "broadcast",
      event: "emergency",
      payload: { driverId, location, timestamp: new Date().toISOString() },
    });
  }

  // ── Cleanup ───────────────────────────────────────────────────
  disconnect() {
    for (const channel of this.channels) {
      this.supabase.removeChannel(channel);
    }
    this.channels = [];
  }
}

// ── GPS Background Tracker (Driver PWA) ──────────────────────────
export class GPSTracker {
  private watchId: number | null = null;
  private lastSent: number = 0;
  private queuedUpdates: any[] = [];
  private readonly SEND_INTERVAL = 5000; // 5 seconds

  constructor(
    private driverId: string,
    private companyId: string,
    private routeId: string | null
  ) {}

  start() {
    if (!("geolocation" in navigator)) {
      console.warn("[GPS] Geolocation not available");
      return;
    }

    this.watchId = navigator.geolocation.watchPosition(
      (pos) => this.handlePosition(pos),
      (err) => console.warn("[GPS] Error:", err),
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 2000,
      }
    );
    console.log("[GPS] Tracking started");
  }

  stop() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  private async handlePosition(pos: GeolocationPosition) {
    const now = Date.now();
    const update = {
      driverId: this.driverId,
      companyId: this.companyId,
      routeId: this.routeId,
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy_m: pos.coords.accuracy,
      speed_kmh: pos.coords.speed ? pos.coords.speed * 3.6 : null,
      heading_deg: pos.coords.heading,
      altitude_m: pos.coords.altitude,
      battery_pct: await this.getBatteryLevel(),
      recorded_at: new Date(pos.timestamp).toISOString(),
    };

    // Throttle sends
    if (now - this.lastSent < this.SEND_INTERVAL) {
      this.queuedUpdates.push(update);
      return;
    }

    this.lastSent = now;
    this.sendUpdate(update);
  }

  private async sendUpdate(update: any) {
    if (!navigator.onLine) {
      // Store in IndexedDB for background sync
      this.queueForSync(update);
      return;
    }

    try {
      await fetch("/api/location", {
        method: "POST",
        body: JSON.stringify(update),
        headers: { "Content-Type": "application/json" },
        keepalive: true, // Works when page is closing
      });
    } catch {
      this.queueForSync(update);
    }
  }

  private queueForSync(update: any) {
    const q = JSON.parse(localStorage.getItem("location-queue") || "[]");
    q.push(update);
    // Keep max 500 points
    if (q.length > 500) q.splice(0, q.length - 500);
    localStorage.setItem("location-queue", JSON.stringify(q));

    // Register background sync
    navigator.serviceWorker.ready.then((reg) => {
      reg.sync.register("sync-locations").catch(() => {});
    });
  }

  private async getBatteryLevel(): Promise<number | null> {
    try {
      const battery = await (navigator as any).getBattery?.();
      return battery ? Math.round(battery.level * 100) : null;
    } catch { return null; }
  }
}
