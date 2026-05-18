/**
 * Fleet Apex Native Experience v1.0
 * ─────────────────────────────────────────────────────────────────
 * Handles native app experience features:
 *   - StatusBar colour management (synced to active page theme)
 *   - SplashScreen hide (after app is ready)
 *   - Fullscreen / immersive mode handling
 *   - Orientation locking (driver = portrait, admin = free)
 *   - Safe area insets (iPhone notch / Dynamic Island)
 *   - App resume / pause lifecycle
 *   - Back button (Android)
 *   - Keyboard behaviour
 *
 * Loaded AFTER fa-native-bridge.js, BEFORE main app JS.
 */

(function() {
  'use strict';

  const isNative   = window.__FA_NATIVE__;
  const appType    = window.__FA_APP__ || 'admin';   // 'admin' | 'driver'
  const platform   = window.__FA_PLATFORM__ || 'web';

  // ── Theme colours per app ───────────────────────────────────────────────────
  const THEMES = {
    admin: {
      default:    '#050E1A',
      dashboard:  '#050E1A',
      map:        '#050E1A',
      vehicles:   '#050E1A',
      drivers:    '#050E1A',
      hazards:    '#050E1A',
      messages:   '#050E1A',
      routes:     '#050E1A',
      plugins:    '#050E1A',
      setup:      '#050E1A',
    },
    driver: {
      default:    '#050E1A',
      dashboard:  '#050E1A',
      nav:        '#0A1628',  // slightly different for nav page
      map:        '#050E1A',
      messages:   '#050E1A',
      profile:    '#050E1A',
    }
  };

  // ── StatusBar ────────────────────────────────────────────────────────────────
  function setStatusBar(colour) {
    if (!isNative) return;
    const { StatusBar } = (window.Capacitor && window.Capacitor.Plugins) || {};
    if (!StatusBar) return;
    StatusBar.setStyle({ style: 'DARK' }).catch(() => {});
    StatusBar.setBackgroundColor({ color: colour || '#050E1A' }).catch(() => {});
    StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});
  }

  // ── SplashScreen ─────────────────────────────────────────────────────────────
  function hideSplash() {
    if (!isNative) return;
    const { SplashScreen } = (window.Capacitor && window.Capacitor.Plugins) || {};
    if (!SplashScreen) return;
    SplashScreen.hide({ fadeOutDuration: 300 }).catch(() => {});
  }

  // ── Orientation ──────────────────────────────────────────────────────────────
  function lockOrientation() {
    if (!isNative) return;
    // Driver app: lock portrait
    if (appType === 'driver') {
      try {
        screen.orientation && screen.orientation.lock('portrait').catch(() => {});
      } catch(e) {}
    }
    // Admin app: allow all orientations (landscape for map/dashboard)
  }

  // ── Safe area insets (CSS vars) ───────────────────────────────────────────────
  function applySafeAreaVars() {
    // CSS env() safe areas already work via viewport-fit=cover.
    // We also expose JS-readable vars for any custom components.
    const root = document.documentElement;
    root.style.setProperty('--fa-safe-top',    'env(safe-area-inset-top, 0px)');
    root.style.setProperty('--fa-safe-bottom', 'env(safe-area-inset-bottom, 0px)');
    root.style.setProperty('--fa-safe-left',   'env(safe-area-inset-left, 0px)');
    root.style.setProperty('--fa-safe-right',  'env(safe-area-inset-right, 0px)');

    // Inject CSS to make sure bottom nav respects safe area
    const style = document.createElement('style');
    style.id = 'fa-native-safe-area';
    style.textContent = `
      /* Fleet Apex — Native safe area CSS */
      @supports (padding: env(safe-area-inset-bottom)) {
        .driver-bottom-nav,
        #driver-bottom-nav,
        .fa-bottom-nav {
          padding-bottom: calc(8px + env(safe-area-inset-bottom));
        }
        .fa-top-bar,
        .admin-top-bar,
        #topbar {
          padding-top: calc(8px + env(safe-area-inset-top));
        }
      }
      /* Fullscreen immersive — extend under status bar */
      body.fa-native {
        background-color: #050E1A;
        -webkit-tap-highlight-color: transparent;
        -webkit-touch-callout: none;
        user-select: none;
      }
      /* Prevent text selection during scroll */
      body.fa-native * {
        -webkit-user-select: none;
        user-select: none;
      }
      /* Allow selection in inputs only */
      body.fa-native input,
      body.fa-native textarea {
        -webkit-user-select: text;
        user-select: text;
      }
    `;
    document.head.appendChild(style);
  }

  // ── Page-change hook (sync status bar to active page) ─────────────────────────
  // Intercepts calls to showAdminPage() / showDriverPage() by wrapping them
  // after the original functions are defined.
  function hookPageNavigation() {
    const themes = THEMES[appType] || THEMES.admin;

    function onPageChange(pageName) {
      const colour = themes[pageName] || themes.default;
      setStatusBar(colour);
    }

    // Wait for original functions to be defined, then wrap them
    const MAX_WAIT = 5000;
    const START    = Date.now();

    function tryHook() {
      const showFn = appType === 'driver' ? 'showDriverPage' : 'showAdminPage';
      if (typeof window[showFn] === 'function') {
        const original = window[showFn];
        window[showFn] = function(page, ...args) {
          onPageChange(page);
          return original.call(this, page, ...args);
        };
        console.log(`[FA Experience] Hooked ${showFn}() for StatusBar sync`);
      } else if (Date.now() - START < MAX_WAIT) {
        setTimeout(tryHook, 100);
      }
    }
    tryHook();
  }

  // ── Back button (Android) ────────────────────────────────────────────────────
  function handleBackButton() {
    window.addEventListener('fa:backButton', () => {
      // Try to go back within the app's own nav
      const backBtn = document.querySelector('[data-back], .btn-back, #btn-back');
      if (backBtn) {
        backBtn.click();
        return;
      }
      // If on a sub-page, go to dashboard
      if (typeof window.showAdminPage === 'function') {
        window.showAdminPage('dashboard');
        return;
      }
      if (typeof window.showDriverPage === 'function') {
        window.showDriverPage('dashboard');
        return;
      }
    });
  }

  // ── Keyboard handling ────────────────────────────────────────────────────────
  function handleKeyboard() {
    if (!isNative) return;
    const { Keyboard } = (window.Capacitor && window.Capacitor.Plugins) || {};
    if (!Keyboard) return;

    Keyboard.addListener('keyboardWillShow', info => {
      document.body.classList.add('keyboard-open');
      document.body.style.setProperty('--fa-keyboard-height', `${info.keyboardHeight}px`);
    });
    Keyboard.addListener('keyboardWillHide', () => {
      document.body.classList.remove('keyboard-open');
      document.body.style.setProperty('--fa-keyboard-height', '0px');
    });
  }

  // ── App lifecycle ────────────────────────────────────────────────────────────
  function handleAppLifecycle() {
    if (!isNative) return;
    const { App } = (window.Capacitor && window.Capacitor.Plugins) || {};
    if (!App) return;

    App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        // App resumed — refresh status bar
        setStatusBar(THEMES[appType].default);
        // Restart GPS if it was running
        if (typeof window.startGPSTracker === 'function' && appType === 'driver') {
          window.startGPSTracker && window.startGPSTracker();
        }
      } else {
        // App paused — nothing to do, GPS continues via background location
      }
    });
  }

  // ── Viewport meta (ensure proper fullscreen) ─────────────────────────────────
  function fixViewport() {
    let vp = document.querySelector('meta[name="viewport"]');
    if (!vp) {
      vp = document.createElement('meta');
      vp.name = 'viewport';
      document.head.appendChild(vp);
    }
    vp.content = 'width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
  }

  // ── Initialise everything ────────────────────────────────────────────────────
  function init() {
    // Always apply (works in both native and PWA)
    fixViewport();
    applySafeAreaVars();

    if (isNative) {
      document.body.classList.add('fa-native');
      document.body.classList.add(`fa-${platform}`);
      document.body.classList.add(`fa-app-${appType}`);
    }

    // Native-only features
    setStatusBar(THEMES[appType].default);
    lockOrientation();
    handleBackButton();
    handleKeyboard();
    handleAppLifecycle();
    hookPageNavigation();

    // Hide splash after a short delay to ensure WebView is painted
    setTimeout(hideSplash, 500);

    console.log(`[FA Experience] Initialised — app=${appType} platform=${platform} native=${isNative}`);
    window.dispatchEvent(new CustomEvent('fa:experienceReady', {
      detail: { appType, platform, isNative }
    }));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
