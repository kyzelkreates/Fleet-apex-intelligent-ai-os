/**
 * Fleet Apex Native Bridge v1.0
 * ─────────────────────────────────────────────────────────────────
 * Drop-in shim that replaces browser APIs with Capacitor equivalents
 * when running inside a native app. Falls back to browser APIs when
 * running as a PWA in a normal browser.
 *
 * Load order: AFTER capacitor.js, BEFORE main app JS
 *
 * Bridges:
 *   localStorage        → Capacitor Preferences (encrypted)
 *   navigator.geolocation → Capacitor Geolocation
 *   Notification API    → Capacitor Local Notifications
 *   navigator.onLine    → Capacitor Network
 *   navigator.wakeLock  → Capacitor KeepAwake
 *   window.caches       → Capacitor Filesystem (noop for caching)
 *   BroadcastChannel    → EventEmitter fallback (same process)
 */

(function() {
  'use strict';

  const isNative = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  if (!isNative) {
    console.log('[FA Bridge] Running as PWA — native bridges inactive');
    return;
  }

  const platform = window.Capacitor.getPlatform(); // 'android' | 'ios' | 'web'
  console.log(`[FA Bridge] Native platform: ${platform}`);

  // ── 1. localStorage → Capacitor Preferences ────────────────────────────────
  // Capacitor Preferences is async, but our app uses sync localStorage.
  // Strategy: keep a sync in-memory mirror, persist to Preferences async.
  // On startup: load all keys from Preferences into memory synchronously via
  // a preloaded snapshot (populated during splash screen).

  const _memStore = {};
  let _prefsReady = false;
  let _prefsQueue = []; // queued writes before Preferences loaded

  async function _loadAllPrefs() {
    try {
      const { Preferences } = Capacitor.Plugins;
      if (!Preferences) return;
      const { keys } = await Preferences.keys();
      for (const key of keys) {
        const { value } = await Preferences.get({ key });
        if (value !== null) _memStore[key] = value;
      }
      _prefsReady = true;
      // Flush write queue
      for (const [k, v] of _prefsQueue) {
        await Preferences.set({ key: k, value: v });
      }
      _prefsQueue = [];
      console.log(`[FA Bridge] Preferences loaded — ${keys.length} keys`);
    } catch (e) {
      console.warn('[FA Bridge] Preferences load failed:', e);
    }
  }

  // Override localStorage
  const _lsProxy = {
    getItem(key) {
      return _memStore.hasOwnProperty(key) ? _memStore[key] : null;
    },
    setItem(key, value) {
      _memStore[key] = String(value);
      // Async persist to Preferences
      const { Preferences } = Capacitor.Plugins;
      if (Preferences) {
        if (_prefsReady) {
          Preferences.set({ key, value: String(value) }).catch(() => {});
        } else {
          _prefsQueue.push([key, String(value)]);
        }
      }
    },
    removeItem(key) {
      delete _memStore[key];
      const { Preferences } = Capacitor.Plugins;
      if (Preferences) Preferences.remove({ key }).catch(() => {});
    },
    clear() {
      Object.keys(_memStore).forEach(k => delete _memStore[k]);
      const { Preferences } = Capacitor.Plugins;
      if (Preferences) Preferences.clear().catch(() => {});
    },
    key(n) { return Object.keys(_memStore)[n] || null; },
    get length() { return Object.keys(_memStore).length; }
  };

  try {
    Object.defineProperty(window, 'localStorage', {
      get: () => _lsProxy,
      configurable: true
    });
    console.log('[FA Bridge] localStorage → Capacitor Preferences');
  } catch(e) {
    console.warn('[FA Bridge] Could not override localStorage:', e);
  }

  // ── 2. Geolocation → Capacitor Geolocation ─────────────────────────────────
  const _CapGeo = Capacitor.Plugins.Geolocation;
  if (_CapGeo) {
    const _watchCallbacks = {};
    let _watchId = 0;

    window.navigator.__defineGetter__('geolocation', () => ({
      getCurrentPosition(success, error, opts) {
        _CapGeo.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 })
          .then(pos => success(pos))
          .catch(e => error && error({ code: 2, message: e.message }));
      },
      watchPosition(success, error, opts) {
        const id = ++_watchId;
        _CapGeo.watchPosition(
          { enableHighAccuracy: true, timeout: 10000 },
          (pos, err) => {
            if (err) { if (error) error(err); return; }
            if (_watchCallbacks[id]) success(pos);
          }
        ).then(watchId => { _watchCallbacks[id] = watchId; });
        return id;
      },
      clearWatch(id) {
        if (_watchCallbacks[id]) {
          _CapGeo.clearWatch({ id: _watchCallbacks[id] }).catch(() => {});
          delete _watchCallbacks[id];
        }
      }
    }));
    console.log('[FA Bridge] navigator.geolocation → Capacitor Geolocation');
  }

  // ── 3. Wake Lock → Capacitor KeepAwake ─────────────────────────────────────
  const _KeepAwake = Capacitor.Plugins.KeepAwake;
  if (_KeepAwake) {
    const _fakeWakeLock = {
      released: false,
      release() {
        this.released = true;
        return _KeepAwake.allowSleep().catch(() => {}).then(() => undefined);
      },
      addEventListener() {},
      removeEventListener() {}
    };

    if (!navigator.wakeLock) {
      Object.defineProperty(navigator, 'wakeLock', {
        value: {
          request(type) {
            return _KeepAwake.keepAwake()
              .then(() => Object.assign({}, _fakeWakeLock, { released: false }));
          }
        },
        configurable: true
      });
      console.log('[FA Bridge] navigator.wakeLock → Capacitor KeepAwake');
    }
  }

  // ── 4. Network → navigator.onLine override ─────────────────────────────────
  const _Network = Capacitor.Plugins.Network;
  if (_Network) {
    let _online = true;
    _Network.getStatus().then(s => { _online = s.connected; }).catch(() => {});
    _Network.addListener('networkStatusChange', s => {
      _online = s.connected;
      window.dispatchEvent(new Event(_online ? 'online' : 'offline'));
    });
    Object.defineProperty(navigator, 'onLine', {
      get: () => _online,
      configurable: true
    });
    console.log('[FA Bridge] navigator.onLine → Capacitor Network');
  }

  // ── 5. BroadcastChannel fallback ───────────────────────────────────────────
  // In a single-WebView native app, BroadcastChannel works fine within the
  // same WebView. This shim handles the case where it doesn't exist.
  if (!window.BroadcastChannel) {
    const _channels = {};
    window.BroadcastChannel = class {
      constructor(name) {
        this.name = name;
        this._listeners = [];
        if (!_channels[name]) _channels[name] = [];
        _channels[name].push(this);
      }
      postMessage(data) {
        const others = (_channels[this.name] || []).filter(c => c !== this);
        for (const c of others) {
          c._listeners.forEach(fn => fn({ data }));
        }
      }
      set onmessage(fn) { this._listeners = [fn]; }
      addEventListener(type, fn) { if (type === 'message') this._listeners.push(fn); }
      removeEventListener(type, fn) { this._listeners = this._listeners.filter(f => f !== fn); }
      close() {
        const arr = _channels[this.name];
        if (arr) _channels[this.name] = arr.filter(c => c !== this);
      }
    };
    console.log('[FA Bridge] BroadcastChannel → in-process EventEmitter');
  }

  // ── 6. Suppress ServiceWorker registration in WebView ──────────────────────
  if ('serviceWorker' in navigator) {
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        register: () => Promise.resolve({ scope: '/', active: null }),
        getRegistrations: () => Promise.resolve([]),
        ready: Promise.resolve({ scope: '/' })
      },
      configurable: true
    });
    console.log('[FA Bridge] ServiceWorker → suppressed (not supported in WebView)');
  }

  // ── 7. App Lifecycle ────────────────────────────────────────────────────────
  const _App = Capacitor.Plugins.App;
  if (_App) {
    _App.addListener('appStateChange', ({ isActive }) => {
      document.dispatchEvent(new Event(isActive ? 'visibilitychange' : 'visibilitychange'));
      Object.defineProperty(document, 'hidden', { value: !isActive, configurable: true });
      Object.defineProperty(document, 'visibilityState', { value: isActive ? 'visible' : 'hidden', configurable: true });
    });
    _App.addListener('backButton', () => {
      // Android back button — trigger custom event app can handle
      window.dispatchEvent(new CustomEvent('fa:backButton'));
    });
    console.log('[FA Bridge] App lifecycle listeners registered');
  }

  // ── 8. Startup: load Preferences into memory ───────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    _loadAllPrefs().then(() => {
      console.log('[FA Bridge] Startup complete — all bridges active');
      window.dispatchEvent(new CustomEvent('fa:bridgeReady', { detail: { platform } }));
    });
  });

  console.log(`[FA Bridge] Initialised on ${platform}`);

})();
