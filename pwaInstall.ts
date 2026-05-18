// Fleet Apex — Universal PWA Install System

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let deferredPrompt: BeforeInstallPromptEvent | null = null;

export function initPWAInstall(onInstallAvailable: () => void, onInstalled: () => void) {
  // Capture the install prompt
  window.addEventListener("beforeinstallprompt", (e: Event) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    onInstallAvailable();
  });

  // After install
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    onInstalled();
    trackInstallEvent();
  });
}

export async function triggerInstall(): Promise<"accepted" | "dismissed" | "unsupported"> {
  if (!deferredPrompt) return "unsupported";
  await deferredPrompt.prompt();
  const choice = await deferredPrompt.userChoice;
  deferredPrompt = null;
  return choice.outcome;
}

export function isInstalled(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes("android-app://")
  );
}

export function getDeviceInfo() {
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
  const isAndroid = /Android/.test(ua);
  const isMac = /Macintosh/.test(ua);
  const isWindows = /Windows/.test(ua);
  const isChrome = /Chrome/.test(ua) && !/Edg/.test(ua);
  const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua);
  const isEdge = /Edg/.test(ua);
  const isFirefox = /Firefox/.test(ua);

  const isTablet = /iPad/.test(ua) || (isAndroid && !/Mobile/.test(ua));
  const isMobile = (isIOS || isAndroid) && !isTablet;
  const isDesktop = !isMobile && !isTablet;

  return { isIOS, isAndroid, isMac, isWindows, isChrome, isSafari, isEdge, isFirefox, isTablet, isMobile, isDesktop };
}

export function getInstallInstructions(appName = "Fleet Apex"): string {
  const d = getDeviceInfo();

  if (d.isIOS && d.isSafari) {
    return `To install ${appName} on your iPhone:\n1. Tap the Share button (□↑) at the bottom of Safari\n2. Scroll down and tap "Add to Home Screen"\n3. Tap "Add" in the top right\n✅ ${appName} will appear on your home screen`;
  }
  if (d.isIOS && !d.isSafari) {
    return `For best installation on iPhone, open this page in Safari, then tap Share → Add to Home Screen`;
  }
  if (d.isAndroid && d.isChrome) {
    return `To install ${appName} on Android:\n1. Tap the menu (⋮) in Chrome\n2. Tap "Add to Home Screen" or "Install App"\n3. Tap "Install"\n✅ ${appName} will appear on your home screen`;
  }
  if (d.isWindows && d.isChrome) {
    return `To install ${appName} on Windows:\n1. Click the install icon (⊕) in the address bar\n2. Click "Install"\n✅ ${appName} will open as a desktop app`;
  }
  if (d.isWindows && d.isEdge) {
    return `To install ${appName} on Windows Edge:\n1. Click the install icon in the address bar\n2. Click "Install"\n✅ ${appName} will be added to your Start menu`;
  }
  if (d.isMac && d.isSafari) {
    return `To install ${appName} on Mac:\n1. Open File menu in Safari\n2. Click "Add to Dock"\n✅ ${appName} will appear in your Dock`;
  }
  return `To install ${appName}:\nLook for the install icon in your browser's address bar and click it.`;
}

export function canInstallNatively(): boolean {
  return deferredPrompt !== null;
}

function trackInstallEvent() {
  try {
    const d = getDeviceInfo();
    console.log("[Fleet Apex PWA] App installed", { device: d, ts: new Date().toISOString() });
    // Post to analytics endpoint
    fetch("/api/analytics/install", {
      method: "POST",
      body: JSON.stringify({ event: "pwa_install", device: d, timestamp: new Date().toISOString() }),
      headers: { "Content-Type": "application/json" },
    }).catch(() => {});
  } catch {}
}

export function registerServiceWorker(swPath: string) {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", async () => {
      try {
        const reg = await navigator.serviceWorker.register(swPath, { scope: "/" });
        console.log("[Fleet Apex] Service worker registered:", reg.scope);

        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                // New version available
                dispatchEvent(new CustomEvent("sw-update-available"));
              }
            });
          }
        });
      } catch (err) {
        console.error("[Fleet Apex] SW registration failed:", err);
      }
    });
  }
}

export async function requestPushPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) return "denied";
  if (Notification.permission === "granted") return "granted";
  return await Notification.requestPermission();
}

export async function subscribeToPush(vapidPublicKey: string): Promise<PushSubscription | null> {
  const reg = await navigator.serviceWorker.ready;
  const perm = await requestPushPermission();
  if (perm !== "granted") return null;

  const subscription = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
  });
  return subscription;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}
