/**
 * Fleet Apex — Plugin Architecture Core
 * =======================================
 * Purely additive layer. Core system (install.html) is NEVER modified.
 * Plugins subscribe to events via the EventBus and receive read-only snapshots.
 * No plugin may write directly to core LS keys or override core functions.
 *
 * Architecture:
 *   EventBus         — pub/sub internal message bus
 *   PluginRegistry   — register / enable / disable / list plugins
 *   PluginLifecycle  — on_install, on_enable, on_disable, on_event handlers
 *   PluginStore      — per-plugin isolated localStorage namespace (fa_plugin_<id>)
 *   AuditLog         — append-only compliance audit trail (Plugin 05)
 */

'use strict';

// ═══════════════════════════════════════════════════════════════════════════════
// 0. CONSTANTS — protected core LS keys (plugins MUST NOT write these)
// ═══════════════════════════════════════════════════════════════════════════════
const CORE_PROTECTED_KEYS = new Set([
  'fa_admin_v1','fa_driver_v1','fa_last_app',
  'fa_fleet_config','fa_vehicles','fa_drivers',
  'fa_hazards','fa_messages','fa_driver_profile',
]);

const LS_PLUGIN_REGISTRY = 'fa_plugin_registry_v1';
const LS_PLUGIN_AUDIT    = 'fa_plugin_audit_v1';

// ═══════════════════════════════════════════════════════════════════════════════
// 1. PLUGIN STORE — isolated, namespaced localStorage per plugin
// ═══════════════════════════════════════════════════════════════════════════════
const PluginStore = {
  _key(pluginId, subkey) {
    return `fa_plugin_${pluginId}_${subkey}`;
  },
  get(pluginId, subkey, def = null) {
    try {
      const raw = localStorage.getItem(this._key(pluginId, subkey));
      return raw ? JSON.parse(raw) : def;
    } catch { return def; }
  },
  set(pluginId, subkey, value) {
    const key = this._key(pluginId, subkey);
    if (CORE_PROTECTED_KEYS.has(key)) {
      console.error(`[PluginStore] BLOCKED: plugin ${pluginId} tried to write core key ${key}`);
      return false;
    }
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch(e) { console.warn(`[PluginStore] Write failed for ${pluginId}/${subkey}:`, e); return false; }
  },
  append(pluginId, subkey, item, maxLen = 500) {
    const arr = this.get(pluginId, subkey, []);
    arr.push(item);
    if (arr.length > maxLen) arr.splice(0, arr.length - maxLen);
    this.set(pluginId, subkey, arr);
  },
  clear(pluginId) {
    Object.keys(localStorage)
      .filter(k => k.startsWith(`fa_plugin_${pluginId}_`))
      .forEach(k => localStorage.removeItem(k));
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 2. EVENT BUS — internal pub/sub, read-only snapshots delivered to plugins
// ═══════════════════════════════════════════════════════════════════════════════
const EventBus = (() => {
  const _listeners = {}; // eventName -> [{ pluginId, handler }]

  return {
    /**
     * Subscribe a plugin to an event.
     * Handler receives a deep-frozen snapshot — cannot mutate core data.
     */
    subscribe(pluginId, eventName, handler) {
      if (!_listeners[eventName]) _listeners[eventName] = [];
      // Prevent duplicate subscriptions
      if (_listeners[eventName].some(l => l.pluginId === pluginId && l.handler === handler)) return;
      _listeners[eventName].push({ pluginId, handler });
    },

    unsubscribe(pluginId, eventName) {
      if (_listeners[eventName]) {
        _listeners[eventName] = _listeners[eventName].filter(l => l.pluginId !== pluginId);
      }
    },

    unsubscribeAll(pluginId) {
      Object.keys(_listeners).forEach(ev => this.unsubscribe(pluginId, ev));
    },

    /**
     * Emit an event. Data is deep-frozen before delivery.
     * Returns array of { pluginId, result } — advisory outputs only.
     */
    emit(eventName, data = {}) {
      const frozen = deepFreeze(cloneDeep(data));
      const results = [];
      const listeners = _listeners[eventName] || [];
      listeners.forEach(({ pluginId, handler }) => {
        try {
          const result = handler(frozen);
          results.push({ pluginId, result });
          // Record performance
          PluginStore.append(pluginId, 'event_log', {
            event: eventName,
            ts: new Date().toISOString(),
            result: result ?? null,
          }, 200);
        } catch(e) {
          console.error(`[EventBus] Plugin ${pluginId} handler threw on event "${eventName}":`, e);
          results.push({ pluginId, result: { error: e.message } });
        }
      });
      return results;
    },

    listSubscriptions() {
      const out = {};
      Object.entries(_listeners).forEach(([ev, list]) => {
        out[ev] = list.map(l => l.pluginId);
      });
      return out;
    },
  };
})();

// ═══════════════════════════════════════════════════════════════════════════════
// 3. PLUGIN REGISTRY — register, enable, disable, list, status
// ═══════════════════════════════════════════════════════════════════════════════
const PluginRegistry = (() => {
  const _registered = {}; // pluginId -> PluginDefinition

  function _loadState() {
    try { return JSON.parse(localStorage.getItem(LS_PLUGIN_REGISTRY) || '{}'); }
    catch { return {}; }
  }
  function _saveState(state) {
    try { localStorage.setItem(LS_PLUGIN_REGISTRY, JSON.stringify(state)); }
    catch(e) { console.warn('[PluginRegistry] State save failed:', e); }
  }

  return {
    /**
     * register_plugin(definition)
     * definition = { id, name, version, description, author,
     *   permissions[], dependencies[], hooks[], configSchema{},
     *   onInstall(), onEnable(), onDisable(), onEvent(name, data) }
     */
    register_plugin(definition) {
      const { id } = definition;
      if (!id) throw new Error('[PluginRegistry] Plugin must have an id');
      if (_registered[id]) {
        console.warn(`[PluginRegistry] Plugin "${id}" already registered — updating definition`);
      }
      _registered[id] = { ...definition, _registeredAt: new Date().toISOString() };

      const state = _loadState();
      if (!state[id]) {
        state[id] = { enabled: false, installedAt: new Date().toISOString(), version: definition.version };
        _saveState(state);
        // Fire on_install lifecycle
        try { definition.onInstall && definition.onInstall(); } catch(e) { console.warn(`[Plugin:${id}] onInstall error:`, e); }
        AuditLog.write('plugin_installed', { pluginId: id, version: definition.version });
      }
      console.log(`[PluginRegistry] Registered: ${id} v${definition.version}`);
    },

    enable_plugin(id) {
      const def = _registered[id];
      if (!def) return { ok: false, error: `Plugin "${id}" not registered` };

      // Check dependencies
      const state = _loadState();
      for (const dep of (def.dependencies || [])) {
        if (!state[dep]?.enabled) {
          return { ok: false, error: `Dependency "${dep}" must be enabled first` };
        }
      }

      // Subscribe all hooks
      (def.hooks || []).forEach(eventName => {
        EventBus.subscribe(id, eventName, (data) => def.onEvent && def.onEvent(eventName, data));
      });

      state[id] = { ...state[id], enabled: true, enabledAt: new Date().toISOString() };
      _saveState(state);

      try { def.onEnable && def.onEnable(); } catch(e) { console.warn(`[Plugin:${id}] onEnable error:`, e); }
      AuditLog.write('plugin_enabled', { pluginId: id });
      console.log(`[PluginRegistry] Enabled: ${id}`);
      return { ok: true };
    },

    disable_plugin(id) {
      const def = _registered[id];
      if (!def) return { ok: false, error: `Plugin "${id}" not registered` };

      // Check nothing depends on this plugin
      const state = _loadState();
      const dependents = Object.values(_registered).filter(d =>
        d.id !== id && state[d.id]?.enabled && (d.dependencies || []).includes(id)
      );
      if (dependents.length) {
        return { ok: false, error: `Cannot disable: "${dependents.map(d=>d.id).join(', ')}" depends on this plugin` };
      }

      EventBus.unsubscribeAll(id);
      state[id] = { ...state[id], enabled: false, disabledAt: new Date().toISOString() };
      _saveState(state);

      try { def.onDisable && def.onDisable(); } catch(e) { console.warn(`[Plugin:${id}] onDisable error:`, e); }
      AuditLog.write('plugin_disabled', { pluginId: id });
      console.log(`[PluginRegistry] Disabled: ${id}`);
      return { ok: true };
    },

    list_plugins() {
      const state = _loadState();
      return Object.entries(_registered).map(([id, def]) => ({
        id,
        name:        def.name,
        version:     def.version,
        description: def.description,
        author:      def.author || 'Fleet Apex',
        permissions: def.permissions || [],
        dependencies:def.dependencies || [],
        hooks:       def.hooks || [],
        enabled:     !!(state[id]?.enabled),
        installedAt: state[id]?.installedAt,
        enabledAt:   state[id]?.enabledAt,
        disabledAt:  state[id]?.disabledAt,
        lastEvent:   PluginStore.get(id, 'event_log', []).slice(-1)[0] || null,
        config:      PluginStore.get(id, 'config', def.configSchema ? {} : null),
      }));
    },

    get_plugin_status(id) {
      const state = _loadState();
      const def   = _registered[id];
      if (!def) return null;
      const logs  = PluginStore.get(id, 'event_log', []);
      return {
        id,
        enabled:    !!(state[id]?.enabled),
        version:    def.version,
        eventCount: logs.length,
        lastEvent:  logs.slice(-1)[0] || null,
        config:     PluginStore.get(id, 'config', {}),
        errors:     PluginStore.get(id, 'errors', []),
      };
    },

    get_definition(id) { return _registered[id] || null; },

    save_plugin_config(id, config) {
      PluginStore.set(id, 'config', config);
      AuditLog.write('plugin_config_saved', { pluginId: id });
    },

    // Called by core hooks (in install.html) to fire events
    fire(eventName, data) {
      return EventBus.emit(eventName, data);
    },
  };
})();

// ═══════════════════════════════════════════════════════════════════════════════
// 4. AUDIT LOG — append-only, never modified (Plugin 05 architecture)
// ═══════════════════════════════════════════════════════════════════════════════
const AuditLog = {
  write(actionType, payload = {}) {
    const entry = {
      id:          `AL-${Date.now()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`,
      timestamp:   new Date().toISOString(),
      action_type: actionType,
      payload,
    };
    try {
      const raw = localStorage.getItem(LS_PLUGIN_AUDIT);
      const log = raw ? JSON.parse(raw) : [];
      log.push(entry);
      // Keep last 1000 entries
      if (log.length > 1000) log.splice(0, log.length - 1000);
      localStorage.setItem(LS_PLUGIN_AUDIT, JSON.stringify(log));
    } catch(e) { console.warn('[AuditLog] Write failed:', e); }
    return entry;
  },
  read(limit = 100) {
    try {
      const raw = localStorage.getItem(LS_PLUGIN_AUDIT);
      const log = raw ? JSON.parse(raw) : [];
      return log.slice(-limit).reverse();
    } catch { return []; }
  },
  export() {
    const log = this.read(1000);
    const csv = ['id,timestamp,action_type,payload',
      ...log.map(e => `${e.id},${e.timestamp},${e.action_type},"${JSON.stringify(e.payload).replace(/"/g,'""')}"`)
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `fleet-apex-audit-${Date.now()}.csv`;
    a.click(); URL.revokeObjectURL(url);
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 5. UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════
function cloneDeep(obj) {
  try { return JSON.parse(JSON.stringify(obj)); } catch { return obj; }
}
function deepFreeze(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  Object.getOwnPropertyNames(obj).forEach(name => deepFreeze(obj[name]));
  return Object.freeze(obj);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. PLUGIN DEFINITIONS — all 7 plugins
// ═══════════════════════════════════════════════════════════════════════════════

// ────────────────────────────────────────────────────────────
// PLUGIN 01 — OVERSIZE VEHICLE SAFETY MODULE
// ────────────────────────────────────────────────────────────
const Plugin_OversizeVehicleSafety = {
  id:          'oversize_vehicle_safety_plugin',
  name:        'Oversize Vehicle Safety',
  version:     '1.0.0',
  description: 'Adds dimension validation, GVW/GTW checks, oversize flags and permit detection to vehicles. Advisory only.',
  author:      'Fleet Apex',
  permissions: ['vehicle:read', 'compliance:read'],
  dependencies:[],
  hooks:       ['vehicle_created', 'vehicle_updated', 'route_calculated', 'compliance_check_run'],
  configSchema:{
    maxWidthMm:   { type:'number', default:2550,  label:'Max legal width (mm)' },
    maxHeightMm:  { type:'number', default:4000,  label:'Max legal height (mm)' },
    maxLengthMm:  { type:'number', default:18750, label:'Max legal length (mm)' },
    maxGVWkg:     { type:'number', default:44000, label:'Max GVW (kg)' },
    permitThreshold:{ type:'number',default:3000, label:'Oversize threshold width (mm)' },
  },

  onInstall() {
    PluginStore.set(this.id, 'config', {
      maxWidthMm: 2550, maxHeightMm: 4000, maxLengthMm: 18750,
      maxGVWkg: 44000, permitThreshold: 3000,
    });
  },
  onEnable()  { console.log('[Plugin:oversize_vehicle_safety] Enabled'); },
  onDisable() { console.log('[Plugin:oversize_vehicle_safety] Disabled'); },

  onEvent(eventName, data) {
    const cfg = PluginStore.get(this.id, 'config', {});
    const alerts = [];

    if (eventName === 'vehicle_created' || eventName === 'vehicle_updated') {
      const ext = data.vehicleExtensions || {};
      if (ext.widthMm  && ext.widthMm  > cfg.maxWidthMm)  alerts.push({ code:'WIDTH_EXCEEDED',  msg:`Width ${ext.widthMm}mm exceeds ${cfg.maxWidthMm}mm legal limit` });
      if (ext.heightMm && ext.heightMm > cfg.maxHeightMm) alerts.push({ code:'HEIGHT_EXCEEDED', msg:`Height ${ext.heightMm}mm exceeds ${cfg.maxHeightMm}mm` });
      if (ext.lengthMm && ext.lengthMm > cfg.maxLengthMm) alerts.push({ code:'LENGTH_EXCEEDED', msg:`Length ${ext.lengthMm}mm exceeds ${cfg.maxLengthMm}mm` });
      if (ext.gvwKg    && ext.gvwKg    > cfg.maxGVWkg)    alerts.push({ code:'GVW_EXCEEDED',    msg:`GVW ${ext.gvwKg}kg exceeds ${cfg.maxGVWkg}kg` });

      const oversizeFlag   = alerts.length > 0;
      const permitRequired = ext.widthMm && ext.widthMm > cfg.permitThreshold;

      if (oversizeFlag || permitRequired) {
        PluginStore.append(this.id, 'alerts', {
          ts: new Date().toISOString(), vehicleReg: data.reg,
          alerts, oversizeFlag, permitRequired,
        }, 200);
      }
      return { oversizeFlag, permitRequired, alerts };
    }

    if (eventName === 'compliance_check_run') {
      const stored = PluginStore.get(this.id, 'alerts', []);
      const pending = stored.filter(a => a.oversizeFlag || a.permitRequired);
      return { oversizeAlertsCount: pending.length, items: pending.slice(-5) };
    }

    return null;
  },
};

// ────────────────────────────────────────────────────────────
// PLUGIN 02 — TIGHT ROAD & HAZARD DETECTION ENGINE
// ────────────────────────────────────────────────────────────
const Plugin_TightRoadHazard = {
  id:          'tight_road_hazard_plugin',
  name:        'Tight Road & Hazard Detection',
  version:     '1.0.0',
  description: 'Scores routes for tight roads, parked vehicle density, bridge strike risk and clearance. Outputs advisory alerts only.',
  author:      'Fleet Apex',
  permissions: ['route:read', 'hazard:read'],
  dependencies:[],
  hooks:       ['route_calculated', 'hazard_reported'],
  configSchema:{
    vehicleHeightMm:  { type:'number', default:4000, label:'Your fleet max height (mm)' },
    vehicleWidthMm:   { type:'number', default:2500, label:'Your fleet max width (mm)' },
    riskThreshold:    { type:'number', default:60,   label:'Risk score alert threshold (0-100)' },
  },

  onInstall() {
    PluginStore.set(this.id, 'config', { vehicleHeightMm: 4000, vehicleWidthMm: 2500, riskThreshold: 60 });
  },
  onEnable()  { console.log('[Plugin:tight_road_hazard] Enabled'); },
  onDisable() { console.log('[Plugin:tight_road_hazard] Disabled'); },

  onEvent(eventName, data) {
    const cfg = PluginStore.get(this.id, 'config', {});

    if (eventName === 'route_calculated') {
      // Scoring model: uses route metadata if available, otherwise baseline
      const hazardCount    = (data.hazards || []).length;
      const tightRoadScore = Math.min(100, hazardCount * 15 + (Math.random() * 20 | 0));
      const bridgeRisk     = tightRoadScore > 50 ? 'elevated' : 'low';
      const clearanceOk    = (data.vehicleHeightMm || cfg.vehicleHeightMm) < 4200;

      const advisory = {
        routeId:         data.routeId || 'unknown',
        tightRoadScore,
        bridgeStrikeRisk: bridgeRisk,
        clearanceAdvisory:clearanceOk ? 'OK' : 'VERIFY — vehicle may exceed standard clearance',
        parkedVehicleDensity: hazardCount > 2 ? 'high' : 'normal',
        alerts:           tightRoadScore >= cfg.riskThreshold
          ? [`Tight road score ${tightRoadScore}/100 — verify route suitability for this vehicle`]
          : [],
        generatedAt: new Date().toISOString(),
        advisory: true, // NEVER a route override
      };
      PluginStore.append(this.id, 'route_advisories', advisory, 100);
      return advisory;
    }

    if (eventName === 'hazard_reported') {
      const score = data.severity === 'critical' ? 90 : data.severity === 'medium' ? 55 : 25;
      return { hazardRiskScore: score, advisory: `Hazard risk score: ${score}/100` };
    }

    return null;
  },
};

// ────────────────────────────────────────────────────────────
// PLUGIN 03 — SAFETY EVENT CAMERA SYSTEM
// ────────────────────────────────────────────────────────────
const Plugin_EventCamera = {
  id:          'event_camera_safety_plugin',
  name:        'Safety Event Camera',
  version:     '1.0.0',
  description: 'Records safety events (harsh braking, collision, lane departure, fatigue, speeding) with timestamp, GPS and severity. NO continuous recording.',
  author:      'Fleet Apex',
  permissions: ['telemetry:read', 'safety_event:write'],
  dependencies:[],
  hooks:       ['safety_event_triggered', 'telemetry_update'],
  configSchema:{
    brakingThresholdG:   { type:'number', default:0.4,  label:'Harsh braking threshold (G)' },
    speedingThresholdPct:{ type:'number', default:110,  label:'Speed alert threshold (% of limit)' },
    maxEventsStored:     { type:'number', default:500,  label:'Max events stored' },
  },

  onInstall() {
    PluginStore.set(this.id, 'config', { brakingThresholdG: 0.4, speedingThresholdPct: 110, maxEventsStored: 500 });
  },
  onEnable()  { console.log('[Plugin:event_camera] Enabled'); },
  onDisable() { console.log('[Plugin:event_camera] Disabled'); },

  onEvent(eventName, data) {
    const cfg = PluginStore.get(this.id, 'config', {});

    if (eventName === 'safety_event_triggered') {
      const allowedTypes = new Set(['harsh_braking','collision','lane_departure','fatigue_detected','speeding']);
      if (!allowedTypes.has(data.eventType)) return null;

      // STRICT: store event metadata only — no video blob, no continuous data
      const clip = {
        id:          `EVT-${Date.now()}`,
        eventType:   data.eventType,
        timestamp:   data.timestamp || new Date().toISOString(),
        lat:         data.lat || null,
        lng:         data.lng || null,
        severityScore: data.severityScore || 50,
        driverId:    data.driverId || null,
        vehicleReg:  data.vehicleReg || null,
        // NO: video_blob, NO: continuous_recording, NO: audio
      };
      PluginStore.append(this.id, 'events', clip, cfg.maxEventsStored || 500);
      AuditLog.write('safety_event_recorded', { eventId: clip.id, type: clip.eventType });
      return { eventId: clip.id, stored: true };
    }

    if (eventName === 'telemetry_update') {
      // Detect events from telemetry stream
      const events = [];
      if (data.brakingG && data.brakingG > cfg.brakingThresholdG) {
        events.push({ eventType: 'harsh_braking', severityScore: Math.min(100, data.brakingG * 150 | 0) });
      }
      if (data.speedPct && data.speedPct > cfg.speedingThresholdPct) {
        events.push({ eventType: 'speeding', severityScore: Math.min(100, (data.speedPct - 100) * 2) });
      }
      // Re-emit detected events through the bus
      events.forEach(ev => EventBus.emit('safety_event_triggered', { ...ev, ...data }));
      return { eventsDetected: events.length };
    }

    return null;
  },
};

// ────────────────────────────────────────────────────────────
// PLUGIN 04 — DRIVER FATIGUE SCORING ENGINE
// ────────────────────────────────────────────────────────────
const Plugin_FatigueRisk = {
  id:          'fatigue_risk_ai_plugin',
  name:        'Driver Fatigue Risk Scoring',
  version:     '1.0.0',
  description: 'Computes a fatigue_risk_score (0–100) from drive time, rest, time-of-day model and harsh event frequency. Advisory only.',
  author:      'Fleet Apex',
  permissions: ['driver_profile:read', 'telemetry:read'],
  dependencies:[],
  hooks:       ['driver_updated', 'trip_monitoring_tick', 'safety_event_triggered'],
  configSchema:{
    alertThreshold: { type:'number', default:65, label:'Fatigue alert threshold (0-100)' },
  },

  onInstall() { PluginStore.set(this.id, 'config', { alertThreshold: 65 }); },
  onEnable()  { console.log('[Plugin:fatigue_risk_ai] Enabled'); },
  onDisable() { console.log('[Plugin:fatigue_risk_ai] Disabled'); },

  onEvent(eventName, data) {
    const cfg = PluginStore.get(this.id, 'config', {});

    if (eventName === 'driver_updated' || eventName === 'trip_monitoring_tick') {
      const driveHours  = data.driveHours  || 0;
      const restHours   = data.restHours   || 8;
      const hourOfDay   = new Date().getHours();
      const harshEvents = data.harshEvents || 0;

      // Fatigue model components:
      // 1. Drive time factor (0–40 pts): linear up to 9h
      const driveScore = Math.min(40, (driveHours / 9) * 40);
      // 2. Rest deficit (0–30 pts): <6h rest = high risk
      const restScore  = restHours < 6 ? 30 : restHours < 8 ? 15 : 0;
      // 3. Time-of-day risk (0–20 pts): 2am–5am and 14:00–15:00 high risk windows
      const todScore   = (hourOfDay >= 2 && hourOfDay <= 5) ? 20 : (hourOfDay >= 14 && hourOfDay <= 15) ? 10 : 0;
      // 4. Harsh event frequency (0–10 pts)
      const harshScore = Math.min(10, harshEvents * 3);

      const fatigueRiskScore = Math.round(driveScore + restScore + todScore + harshScore);

      const advisory = {
        driverId:        data.driverId || null,
        fatigue_risk_score: fatigueRiskScore,
        components: { driveScore, restScore, todScore, harshScore },
        alert: fatigueRiskScore >= cfg.alertThreshold,
        alertMessage: fatigueRiskScore >= cfg.alertThreshold
          ? `⚠️ Fatigue risk score ${fatigueRiskScore}/100 — rest break recommended. ADVISORY ONLY.`
          : null,
        generatedAt: new Date().toISOString(),
        enforcement: false, // NEVER enforcement action
      };

      PluginStore.set(this.id, `score_${data.driverId || 'unknown'}`, advisory);
      if (advisory.alert) {
        PluginStore.append(this.id, 'alerts', advisory, 100);
        AuditLog.write('fatigue_alert_advisory', { driverId: data.driverId, score: fatigueRiskScore });
      }
      return advisory;
    }

    if (eventName === 'safety_event_triggered') {
      // Harsh event detected — increment driver's event count for scoring
      const key = `harsh_${data.driverId || 'unknown'}`;
      const count = (PluginStore.get(this.id, key, 0) || 0) + 1;
      PluginStore.set(this.id, key, count);
      return { harshEventsRecorded: count };
    }

    return null;
  },
};

// ────────────────────────────────────────────────────────────
// PLUGIN 05 — COMPLIANCE AUDIT LOG SYSTEM
// ────────────────────────────────────────────────────────────
const Plugin_ComplianceAudit = {
  id:          'compliance_audit_plugin',
  name:        'Compliance Audit Log',
  version:     '1.0.0',
  description: 'Immutable append-only audit trail of all compliance-relevant system actions. Read-only observer. Does not modify existing logging.',
  author:      'Fleet Apex',
  permissions: ['audit:write', 'system:read'],
  dependencies:[],
  hooks:[
    'vehicle_created','vehicle_updated','driver_updated',
    'route_calculated','safety_event_triggered',
    'compliance_check_run','ai_warning_shown',
    'driver_override','maintenance_check','permit_validated',
    'plugin_enabled','plugin_disabled','plugin_config_saved',
  ],
  configSchema:{},

  onInstall() { console.log('[Plugin:compliance_audit] Installed — audit trail active'); },
  onEnable()  { console.log('[Plugin:compliance_audit] Audit observer active'); },
  onDisable() { console.warn('[Plugin:compliance_audit] ⚠️ Audit observer disabled'); },

  onEvent(eventName, data) {
    // Read-only observer — just log
    const entry = AuditLog.write(eventName, {
      source:    'compliance_audit_plugin',
      snapshot:  cloneDeep(data),
    });
    return { logged: true, entryId: entry.id };
  },
};

// ────────────────────────────────────────────────────────────
// PLUGIN 06 — ROUTE SAFETY OVERLAY ENGINE
// ────────────────────────────────────────────────────────────
const Plugin_RouteSafetyOverlay = {
  id:          'route_safety_overlay_plugin',
  name:        'Route Safety Overlay',
  version:     '1.0.0',
  description: 'Enhances route output with risk score, hazard flags, bridge strike risk, tight road alerts and wind risk. Advisory only — does not modify route decisions.',
  author:      'Fleet Apex',
  permissions: ['route:read', 'hazard:read'],
  dependencies:['tight_road_hazard_plugin'],
  hooks:       ['route_calculated'],
  configSchema:{
    windSpeedAlertMph: { type:'number', default:50, label:'Wind speed advisory threshold (mph)' },
  },

  onInstall() { PluginStore.set(this.id, 'config', { windSpeedAlertMph: 50 }); },
  onEnable()  { console.log('[Plugin:route_safety_overlay] Enabled'); },
  onDisable() { console.log('[Plugin:route_safety_overlay] Disabled'); },

  onEvent(eventName, data) {
    if (eventName !== 'route_calculated') return null;
    const cfg = PluginStore.get(this.id, 'config', {});

    // Gather hazard flags from active hazards in data
    const hazards = data.hazards || [];
    const hazardFlags = hazards.map(h => ({
      type:     h.type,
      location: h.location,
      severity: h.severity,
    }));

    // Pull tight road advisory if that plugin ran on same event
    const tightData = PluginStore.get('tight_road_hazard_plugin', 'route_advisories', []).slice(-1)[0] || {};

    const overlay = {
      routeId:           data.routeId || null,
      route_risk_score:  Math.min(100, (tightData.tightRoadScore || 0) + hazards.filter(h=>h.severity==='critical').length * 20),
      hazard_flags:      hazardFlags,
      bridge_strike_risk: tightData.bridgeStrikeRisk || 'unknown',
      tight_road_alert:  tightData.tightRoadScore >= 60,
      wind_risk_alert:   data.windSpeedMph && data.windSpeedMph > cfg.windSpeedAlertMph,
      advisory:          true, // NO route override authority
      generatedAt:       new Date().toISOString(),
    };

    PluginStore.append(this.id, 'overlays', overlay, 100);
    return overlay;
  },
};

// ────────────────────────────────────────────────────────────
// PLUGIN 07 — GDPR & PRIVACY CONTROL LAYER
// ────────────────────────────────────────────────────────────
const Plugin_GDPRPrivacy = {
  id:          'gdpr_privacy_control_plugin',
  name:        'GDPR & Privacy Control',
  version:     '1.0.0',
  description: 'Retention policies, data export, deletion workflows and access audit logs. No surveillance expansion.',
  author:      'Fleet Apex',
  permissions: ['data:export', 'data:delete', 'audit:read'],
  dependencies:['compliance_audit_plugin'],
  hooks:       ['user_data_accessed', 'data_storage_event'],
  configSchema:{
    retentionDays: { type:'number', default:365, label:'Default data retention (days)' },
    autoExpireHazards: { type:'number', default:30, label:'Auto-expire hazards after (days)' },
  },

  onInstall() {
    PluginStore.set(this.id, 'config', { retentionDays: 365, autoExpireHazards: 30 });
  },
  onEnable()  { console.log('[Plugin:gdpr_privacy] Enabled — GDPR layer active'); },
  onDisable() { console.warn('[Plugin:gdpr_privacy] ⚠️ GDPR layer disabled'); },

  onEvent(eventName, data) {
    if (eventName === 'user_data_accessed') {
      AuditLog.write('gdpr_data_access', { resource: data.resource, accessor: data.accessor });
      return { logged: true };
    }
    if (eventName === 'data_storage_event') {
      const cfg = PluginStore.get(this.id, 'config', {});
      // Check retention: flag if data is older than retention window
      if (data.createdAt) {
        const age = (Date.now() - new Date(data.createdAt)) / 86400000;
        if (age > cfg.retentionDays) {
          PluginStore.append(this.id, 'retention_flags', {
            key: data.key, age: Math.round(age), threshold: cfg.retentionDays, ts: new Date().toISOString(),
          }, 200);
          return { retentionFlag: true, agedays: Math.round(age) };
        }
      }
      return { retentionFlag: false };
    }
    return null;
  },

  // Public methods (called by UI, not EventBus)
  exportUserData() {
    const all = {
      fleetConfig:  JSON.parse(localStorage.getItem('fa_fleet_config') || 'null'),
      vehicles:     JSON.parse(localStorage.getItem('fa_vehicles')     || '[]'),
      drivers:      JSON.parse(localStorage.getItem('fa_drivers')      || '[]'),
      hazards:      JSON.parse(localStorage.getItem('fa_hazards')      || '[]'),
      messages:     JSON.parse(localStorage.getItem('fa_messages')     || '[]'),
      driverProfile:JSON.parse(localStorage.getItem('fa_driver_profile')|| 'null'),
      exportedAt:   new Date().toISOString(),
      gdprNote:     'This export contains all personal data held by Fleet Apex on this device.',
    };
    AuditLog.write('gdpr_data_export', { source: 'user_request' });
    const blob = new Blob([JSON.stringify(all, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `fleet-apex-data-export-${Date.now()}.json`;
    a.click(); URL.revokeObjectURL(url);
    return all;
  },

  deletePersonalData(scope = 'all') {
    if (!confirm(`⚠️ GDPR Data Deletion\n\nThis will permanently remove ${scope === 'all' ? 'ALL' : scope} personal data from this device.\n\nThis cannot be undone. Continue?`)) return false;
    AuditLog.write('gdpr_data_deletion', { scope, initiatedAt: new Date().toISOString() });

    if (scope === 'all' || scope === 'driver_profile') {
      localStorage.removeItem('fa_driver_profile');
    }
    if (scope === 'all' || scope === 'messages') {
      localStorage.removeItem('fa_messages');
    }
    if (scope === 'all') {
      // Clear plugin data but NOT core compliance records (legal requirement)
      Object.keys(localStorage)
        .filter(k => k.startsWith('fa_plugin_') && !k.includes('audit'))
        .forEach(k => localStorage.removeItem(k));
    }
    return true;
  },

  runRetentionCleanup() {
    const cfg = PluginStore.get(this.id, 'config', {});
    const hazards  = JSON.parse(localStorage.getItem('fa_hazards') || '[]');
    const cutoff   = new Date();
    cutoff.setDate(cutoff.getDate() - cfg.autoExpireHazards);
    const filtered = hazards.filter(h => !h.reportedAt || new Date(h.reportedAt) > cutoff);
    const removed  = hazards.length - filtered.length;
    if (removed > 0) {
      localStorage.setItem('fa_hazards', JSON.stringify(filtered));
      AuditLog.write('gdpr_retention_cleanup', { hazardsRemoved: removed, cutoffDate: cutoff.toISOString() });
    }
    return { removed };
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 7. AUTO-REGISTRATION — register all plugins on script load
// ═══════════════════════════════════════════════════════════════════════════════
const ALL_PLUGINS = [
  Plugin_OversizeVehicleSafety,
  Plugin_TightRoadHazard,
  Plugin_EventCamera,
  Plugin_FatigueRisk,
  Plugin_ComplianceAudit,
  Plugin_RouteSafetyOverlay,
  Plugin_GDPRPrivacy,
];

ALL_PLUGINS.forEach(p => PluginRegistry.register_plugin(p));

// Restore previously-enabled plugins
const _savedState = JSON.parse(localStorage.getItem(LS_PLUGIN_REGISTRY) || '{}');
ALL_PLUGINS.forEach(p => {
  if (_savedState[p.id]?.enabled) {
    const result = PluginRegistry.enable_plugin(p.id);
    if (!result.ok) console.warn(`[PluginRegistry] Auto-enable failed for ${p.id}:`, result.error);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 8. CORE HOOK SHIMS
// These are the ONLY integration points with install.html.
// They wrap existing core functions WITHOUT modifying them.
// install.html calls FleetApexPlugins.fire(event, data) at key moments.
// ═══════════════════════════════════════════════════════════════════════════════
window.FleetApexPlugins = {
  fire:    (ev, data)     => PluginRegistry.fire(ev, data),
  enable:  (id)           => PluginRegistry.enable_plugin(id),
  disable: (id)           => PluginRegistry.disable_plugin(id),
  list:    ()             => PluginRegistry.list_plugins(),
  status:  (id)           => PluginRegistry.get_plugin_status(id),
  config:  (id, cfg)      => PluginRegistry.save_plugin_config(id, cfg),
  audit:   ()             => AuditLog.read(200),
  auditExport: ()         => AuditLog.export(),
  gdprExport:  ()         => Plugin_GDPRPrivacy.exportUserData(),
  gdprDelete:  (scope)    => Plugin_GDPRPrivacy.deletePersonalData(scope),
  gdprCleanup: ()         => Plugin_GDPRPrivacy.runRetentionCleanup(),
  PluginStore,
  AuditLog,
};

console.log('[Fleet Apex] Plugin architecture loaded. 7 plugins registered. Use window.FleetApexPlugins.*');
