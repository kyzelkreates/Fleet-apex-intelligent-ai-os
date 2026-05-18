// Fleet Apex — Dynamic Branding Engine
// Applies per-tenant branding to the full UI

import type { BrandingProfile } from "./index";

export class BrandingEngine {
  private profile: BrandingProfile;

  constructor(profile: BrandingProfile) {
    this.profile = profile;
  }

  // Apply branding to CSS custom properties + document
  apply() {
    const p = this.profile;
    const root = document.documentElement;

    // Colors
    root.style.setProperty("--color-primary", p.primaryColor);
    root.style.setProperty("--color-secondary", p.secondaryColor);
    root.style.setProperty("--color-accent", p.accentColor);

    // Derived shades
    root.style.setProperty("--color-primary-10", this.withAlpha(p.primaryColor, 0.1));
    root.style.setProperty("--color-accent-10", this.withAlpha(p.accentColor, 0.1));
    root.style.setProperty("--color-accent-30", this.withAlpha(p.accentColor, 0.3));

    // Typography
    root.style.setProperty("--font-primary", p.fontPreference || "Inter, sans-serif");

    // Dark mode
    document.documentElement.setAttribute("data-theme",
      p.darkMode === "auto"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
        : p.darkMode
    );

    // Title
    document.title = p.appName;

    // Favicon
    if (p.favicon) this.setFavicon(p.favicon);

    // Meta theme-color
    this.setMetaThemeColor(p.primaryColor);

    // Inject custom CSS if provided
    if (p.custom_css) this.injectCustomCSS(p.custom_css);

    // Dynamic manifest update for PWA icon
    if (p.pwaIcon) this.updatePWAManifest(p);
  }

  // Generate branded CSS string
  generateCSS(): string {
    const p = this.profile;
    return `
      :root {
        --color-primary: ${p.primaryColor};
        --color-secondary: ${p.secondaryColor};
        --color-accent: ${p.accentColor};
        --font-primary: ${p.fontPreference || "Inter, sans-serif"};
      }
    `;
  }

  private setFavicon(url: string) {
    let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = url;
  }

  private setMetaThemeColor(color: string) {
    let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "theme-color";
      document.head.appendChild(meta);
    }
    meta.content = color;
  }

  private injectCustomCSS(css: string) {
    const id = "fleet-apex-custom-css";
    let style = document.getElementById(id) as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement("style");
      style.id = id;
      document.head.appendChild(style);
    }
    style.textContent = css;
  }

  private updatePWAManifest(p: BrandingProfile) {
    // Dynamically update manifest link to branded version
    const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (link) {
      // Create dynamic manifest blob
      const manifest = {
        name: p.appName,
        short_name: p.appName.split(" ")[0],
        theme_color: p.primaryColor,
        background_color: p.primaryColor,
        icons: p.pwaIcon ? [
          { src: p.pwaIcon, sizes: "192x192", type: "image/png", purpose: "any maskable" },
          { src: p.pwaIcon, sizes: "512x512", type: "image/png", purpose: "any maskable" },
        ] : [],
      };
      const blob = new Blob([JSON.stringify(manifest)], { type: "application/json" });
      link.href = URL.createObjectURL(blob);
    }
  }

  private withAlpha(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  // Server-side: generate branded email HTML header
  generateEmailHeader(): string {
    const p = this.profile;
    return `
      <div style="background:${p.primaryColor};padding:24px;text-align:center;font-family:${p.fontPreference || "Inter, sans-serif"}">
        ${p.logo ? `<img src="${p.logo}" alt="${p.appName}" style="height:48px;margin-bottom:12px">` : ""}
        <h1 style="color:#fff;font-size:20px;margin:0">${p.appName}</h1>
        <p style="color:${p.accentColor};font-size:12px;margin:4px 0 0">Intelligence Driving Every Journey</p>
      </div>
    `;
  }

  // Generate PDF report header HTML
  generatePDFHeader(reportTitle: string): string {
    const p = this.profile;
    return `
      <div style="background:${p.primaryColor};color:#fff;padding:20px;display:flex;justify-content:space-between;align-items:center">
        <div>
          ${p.logo ? `<img src="${p.logo}" alt="${p.appName}" style="height:36px">` : `<h2 style="margin:0">${p.appName}</h2>`}
          <p style="margin:4px 0 0;font-size:11px;color:${p.accentColor}">${p.appName}</p>
        </div>
        <div style="text-align:right">
          <h3 style="margin:0;font-size:16px">${reportTitle}</h3>
          <p style="margin:4px 0 0;font-size:11px">${new Date().toLocaleDateString("en-GB")}</p>
        </div>
      </div>
    `;
  }
}

// Load branding for a tenant from subdomain or custom domain
export async function loadTenantBranding(identifier: string): Promise<BrandingProfile | null> {
  try {
    const res = await fetch(`/api/branding/tenant/${identifier}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// Auto-detect tenant from current URL
export function detectTenant(): string {
  const hostname = window.location.hostname;
  // fleet.clientname.com → clientname
  const parts = hostname.split(".");
  if (parts.length >= 3 && parts[0] !== "www") return parts[0];
  return "default";
}
