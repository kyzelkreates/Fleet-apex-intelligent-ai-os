// Fleet Apex API — Hazard Endpoints
// Vercel serverless function

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method, query, body } = req;
  const companyId = req.headers["x-company-id"] as string;

  if (!companyId) return res.status(401).json({ error: "Unauthorised" });

  // GET /api/hazards
  if (method === "GET") {
    const resolved = query.resolved === "true";
    const limit = parseInt(query.limit as string) || 100;

    let q = supabase
      .from("hazards")
      .select("*")
      .eq("company_id", companyId)
      .eq("resolved", resolved)
      .order("reported_at", { ascending: false })
      .limit(limit);

    if (query.severity) q = q.eq("severity", query.severity);
    if (query.type) q = q.eq("type", query.type);

    const { data, error } = await q;
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ hazards: data, count: data?.length });
  }

  // POST /api/hazards — Create new hazard
  if (method === "POST") {
    const { type, severity, description, photos, location, roadName, vehicleType, voiceNote } = body;

    if (!type || !location) return res.status(400).json({ error: "type and location required" });

    // Get driver info from session
    const driverId = req.headers["x-driver-id"] as string;
    const vehicleId = req.headers["x-vehicle-id"] as string;

    const { data: hazard, error } = await supabase.from("hazards").insert({
      company_id: companyId,
      driver_id: driverId,
      vehicle_id: vehicleId,
      type,
      severity: severity || "orange",
      lat: location.lat,
      lng: location.lng,
      road_name: roadName,
      description,
      photos: photos || [],
      voice_note_url: voiceNote,
      vehicle_type: vehicleType,
      reported_at: new Date().toISOString(),
      verified: false,
      resolved: false,
    }).select().single();

    if (error) return res.status(500).json({ error: error.message });

    // Notify nearby drivers
    await notifyNearbyDrivers(companyId, hazard, supabase);

    return res.status(201).json(hazard);
  }

  res.status(405).json({ error: "Method not allowed" });
}

async function notifyNearbyDrivers(companyId: string, hazard: any, sb: any) {
  try {
    // Get drivers within 10km
    const { data: positions } = await sb
      .from("driver_positions")
      .select("driver_id, lat, lng")
      .eq("company_id", companyId);

    if (!positions) return;

    const nearby = positions.filter((p: any) => {
      const dist = getDistanceKm(p.lat, p.lng, hazard.lat, hazard.lng);
      return dist <= 10;
    });

    // Broadcast realtime notification
    await sb.channel(`emergency-${companyId}`).send({
      type: "broadcast",
      event: "hazard",
      payload: {
        id: hazard.id,
        type: hazard.type,
        severity: hazard.severity,
        lat: hazard.lat,
        lng: hazard.lng,
        roadName: hazard.road_name,
        nearbyDriverIds: nearby.map((p: any) => p.driver_id),
      },
    });
  } catch (err) {
    console.error("[Hazard] Failed to notify nearby drivers:", err);
  }
}

function getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
