// Fleet Apex API — GPS Location Updates
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { driverId, companyId, lat, lng, speed_kmh, heading_deg, accuracy_m, altitude_m, battery_pct, routeId, recorded_at } = req.body;

  if (!driverId || !companyId || !lat || !lng) {
    return res.status(400).json({ error: "driverId, companyId, lat, lng required" });
  }

  // Upsert latest position (fast lookup table)
  const { error: posError } = await supabase.from("driver_positions").upsert({
    driver_id: driverId,
    company_id: companyId,
    lat, lng, speed_kmh, heading_deg,
    updated_at: new Date().toISOString(),
  }, { onConflict: "driver_id" });

  if (posError) console.error("[Location] Position upsert error:", posError);

  // Insert into full history (partitioned)
  const { error: histError } = await supabase.from("location_updates").insert({
    company_id: companyId,
    driver_id: driverId,
    route_id: routeId,
    lat, lng, accuracy_m, speed_kmh, heading_deg, altitude_m, battery_pct,
    recorded_at: recorded_at || new Date().toISOString(),
  });

  if (histError) console.error("[Location] History insert error:", histError);

  // Check speeding
  if (speed_kmh && speed_kmh > 80) {
    await checkSpeedCompliance(companyId, driverId, speed_kmh, supabase);
  }

  return res.status(200).json({ ok: true });
}

async function checkSpeedCompliance(companyId: string, driverId: string, speed: number, sb: any) {
  // Get company speed threshold
  const { data: settings } = await sb.from("companies").select("settings").eq("id", companyId).single();
  const threshold = settings?.settings?.speedThreshold || 80;

  if (speed > threshold + 10) {
    // Create compliance alert (avoid duplicates — check last 5 mins)
    const fiveMinsAgo = new Date(Date.now() - 300000).toISOString();
    const { data: existing } = await sb.from("compliance_alerts").select("id").eq("driver_id", driverId).eq("type", "speeding").gt("created_at", fiveMinsAgo).limit(1);

    if (!existing?.length) {
      await sb.from("compliance_alerts").insert({
        company_id: companyId,
        driver_id: driverId,
        type: "speeding",
        severity: speed > threshold + 20 ? "critical" : "warning",
        message: `Driver travelling at ${Math.round(speed)} km/h — exceeds ${threshold} km/h threshold`,
      });
    }
  }
}
