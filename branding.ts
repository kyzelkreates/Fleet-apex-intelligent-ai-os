// Fleet Apex API — Branding Endpoints (Multi-tenant)
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method } = req;

  // Resolve tenant from subdomain, custom domain, or header
  const host = req.headers.host || "";
  const companyId = req.headers["x-company-id"] as string || await resolveCompanyFromHost(host);

  if (!companyId) return res.status(404).json({ error: "Company not found" });

  // GET /api/branding
  if (method === "GET") {
    const { data, error } = await supabase.from("branding_profiles").select("*").eq("company_id", companyId).single();
    if (error || !data) {
      // Return defaults
      return res.status(200).json({
        appName: "Fleet Apex", primaryColor: "#0A1628", secondaryColor: "#1E3A5F",
        accentColor: "#00D4FF", darkMode: "dark", fontPreference: "Inter",
      });
    }
    // Map to camelCase for frontend
    return res.status(200).json({
      appName: data.app_name, logo: data.logo_url, logoDark: data.logo_dark_url,
      favicon: data.favicon_url, pwaIcon: data.pwa_icon_url, splashScreen: data.splash_screen_url,
      primaryColor: data.primary_color, secondaryColor: data.secondary_color,
      accentColor: data.accent_color, fontPreference: data.font_preference,
      darkMode: data.dark_mode, welcomeMessage: data.welcome_message,
      supportEmail: data.support_email, supportPhone: data.support_phone,
      websiteUrl: data.website_url, customCss: data.custom_css,
    });
  }

  // PUT /api/branding — Update branding
  if (method === "PUT") {
    const b = req.body;
    const { error } = await supabase.from("branding_profiles").upsert({
      company_id: companyId,
      app_name: b.appName, logo_url: b.logo, logo_dark_url: b.logoDark,
      favicon_url: b.favicon, pwa_icon_url: b.pwaIcon, splash_screen_url: b.splashScreen,
      primary_color: b.primaryColor, secondary_color: b.secondaryColor,
      accent_color: b.accentColor, font_preference: b.fontPreference,
      dark_mode: b.darkMode, welcome_message: b.welcomeMessage,
      support_email: b.supportEmail, support_phone: b.supportPhone,
      website_url: b.websiteUrl, custom_css: b.customCss,
      updated_at: new Date().toISOString(),
    }, { onConflict: "company_id" });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  res.status(405).json({ error: "Method not allowed" });
}

async function resolveCompanyFromHost(host: string): Promise<string | null> {
  // fleet.client.com → custom domain lookup
  const { data: byDomain } = await supabase.from("companies").select("id").eq("custom_domain", host).single();
  if (byDomain) return byDomain.id;

  // clientname.fleetapex.ai → subdomain lookup
  const subdomain = host.split(".")[0];
  if (subdomain && subdomain !== "www" && subdomain !== "fleetapex") {
    const { data: bySub } = await supabase.from("companies").select("id").eq("subdomain", subdomain).single();
    if (bySub) return bySub.id;
  }

  return null;
}
