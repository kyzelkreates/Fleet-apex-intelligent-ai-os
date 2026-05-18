// Fleet Apex API — Emergency SOS Handler
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const companyId = req.headers["x-company-id"] as string;
  const driverId = req.headers["x-driver-id"] as string;
  const { type, location, timestamp } = req.body;

  // 1. Create incident record
  const { data: incident } = await supabase.from("incidents").insert({
    company_id: companyId,
    driver_id: driverId,
    type: "emergency_sos",
    severity: "critical",
    lat: location?.lat,
    lng: location?.lng,
    description: "Emergency SOS activated by driver",
    status: "open",
    escalated: true,
    occurred_at: timestamp || new Date().toISOString(),
  }).select().single();

  // 2. Update driver status to emergency
  if (driverId) {
    await supabase.from("drivers").update({ status: "emergency" }).eq("id", driverId);
  }

  // 3. Create critical compliance alert
  await supabase.from("compliance_alerts").insert({
    company_id: companyId,
    driver_id: driverId,
    type: "emergency_sos",
    severity: "critical",
    message: `🚨 EMERGENCY SOS activated by driver${location ? ` at ${location.lat?.toFixed(4)}, ${location.lng?.toFixed(4)}` : ""}`,
  });

  // 4. Broadcast to all admin users via realtime
  await supabase.channel(`emergency-${companyId}`).send({
    type: "broadcast",
    event: "emergency",
    payload: { driverId, location, incidentId: incident?.id, timestamp },
  });

  // 5. Send push to all admins/dispatchers
  const { data: admins } = await supabase.from("fleet_users").select("push_token").eq("company_id", companyId).in("role", ["admin", "dispatcher"]);
  if (admins?.length) {
    await Promise.allSettled(admins.filter((a: any) => a.push_token).map((admin: any) =>
      sendPushNotification(admin.push_token, {
        title: "🚨 EMERGENCY SOS",
        body: "A driver has activated an emergency alert",
        type: "emergency",
        url: `/map`,
        requireInteraction: true,
      })
    ));
  }

  return res.status(200).json({ ok: true, incidentId: incident?.id });
}

async function sendPushNotification(token: string, payload: object) {
  // Web Push via VAPID — implementation depends on push service
  // Using a generic push service endpoint
  try {
    await fetch(`${process.env.PUSH_SERVICE_URL}/send`, {
      method: "POST",
      body: JSON.stringify({ token, payload }),
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.PUSH_SERVICE_KEY}` },
    });
  } catch (err) {
    console.error("[Push] Failed to send notification:", err);
  }
}
