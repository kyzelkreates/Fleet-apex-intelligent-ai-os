// Fleet Apex API — AI Chat Endpoint
// FLAT BUILD: imports resolved to same directory
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { FleetApexAICore, OpenAIProvider, OllamaProvider } from "./FleetApexAICore";

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const companyId = req.headers["x-company-id"] as string;
  if (!companyId) return res.status(401).json({ error: "Unauthorised" });

  const { message, module = "route", routeId, driverId, vehicleId } = req.body;
  if (!message) return res.status(400).json({ error: "message required" });

  const { data: company } = await supabase.from("companies").select("settings").eq("id", companyId).single();
  const aiConfig = company?.settings;

  let provider;
  if (aiConfig?.aiProvider === "ollama") {
    provider = new OllamaProvider(aiConfig.ollamaUrl);
  } else {
    const apiKey = process.env.OPENAI_API_KEY || aiConfig?.openaiKey;
    if (!apiKey) {
      return res.status(200).json({
        response: "AI provider not configured. Please add your OpenAI API key in Settings → AI Configuration.",
        status: "blocked", riskScore: 0,
      });
    }
    provider = new OpenAIProvider(apiKey);
  }

  const core = new FleetApexAICore(provider);
  const context: any = {};

  if (vehicleId) {
    const { data: vehicle } = await supabase.from("vehicles").select("type, width_m").eq("id", vehicleId).single();
    if (vehicle) { context.vehicleType = vehicle.type; context.vehicleWidth = vehicle.width_m; }
  }
  if (driverId) {
    const { data: driver } = await supabase.from("drivers").select("safety_score, hours_today").eq("id", driverId).single();
    if (driver) { context.driverSafetyScore = driver.safety_score; context.driverHours = driver.hours_today; }
  }
  if (routeId) {
    const { data: hazards } = await supabase.from("hazards").select("type, severity, lat, lng, road_name").eq("company_id", companyId).eq("resolved", false).limit(10);
    if (hazards) context.hazardReports = hazards;
  }

  const result = await core.processRequest(module as any, message, context, companyId);

  await supabase.from("ai_requests").insert({
    company_id: companyId, request_type: module, context_data: context,
    prompt: message, raw_response: result.response, final_response: result.response,
    validation_status: result.status, risk_score: result.riskScore,
    block_reason: result.reason, ai_provider: aiConfig?.aiProvider || "openai",
    audit_log: result.auditEntries,
  });

  return res.status(200).json({ response: result.response, status: result.status, riskScore: result.riskScore });
}
