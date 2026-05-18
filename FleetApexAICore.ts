// ═══════════════════════════════════════════════════════════════
// Fleet Apex Intelligent AI Core — Orchestration Engine
// "Intelligence Driving Every Journey"
// ═══════════════════════════════════════════════════════════════
// Architecture:
//   User Request → AI Core → Context Injection → Provider
//              → Safety Validation → Output
// ═══════════════════════════════════════════════════════════════

import type { AIRequest, AIContext, AIAuditEntry, Hazard, Route, Driver, Vehicle } from "./index";

// ─── AI Provider Interface ────────────────────────────────────────
interface AIProvider {
  name: string;
  chat(messages: AIMessage[], options?: AIOptions): Promise<string>;
  available(): Promise<boolean>;
}

interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface AIOptions {
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

// ─── Validation Result ────────────────────────────────────────────
interface ValidationResult {
  status: "approved" | "modified" | "flagged" | "blocked";
  response: string;
  riskScore: number;
  reason?: string;
  auditEntries: AIAuditEntry[];
}

// ─── Safety Rule ──────────────────────────────────────────────────
interface SafetyRule {
  id: string;
  name: string;
  check: (context: AIContext, response: string) => { triggered: boolean; reason: string };
  action: "block" | "flag" | "modify" | "warn";
}

// ═══════════════════════════════════════════════════════════════
// FLEET APEX AI CORE
// ═══════════════════════════════════════════════════════════════
export class FleetApexAICore {
  private provider: AIProvider;
  private safetyRules: SafetyRule[] = [];
  private companyRules: SafetyRule[] = [];
  private auditLog: AIAuditEntry[] = [];

  constructor(provider: AIProvider) {
    this.provider = provider;
    this.loadBuiltInSafetyRules();
  }

  // ── Core: Process Request ──────────────────────────────────────
  async processRequest(
    requestType: AIRequest["type"],
    userInput: string,
    context: AIContext,
    companyId: string
  ): Promise<ValidationResult> {
    this.auditLog = [];
    this.log("REQUEST_RECEIVED", `Type: ${requestType}`);

    // 1. Build enriched system prompt
    const systemPrompt = this.buildSystemPrompt(requestType, context);

    // 2. Inject operational context
    const contextualInput = this.injectContext(userInput, context);

    // 3. Send to AI provider
    let rawResponse: string;
    try {
      rawResponse = await this.provider.chat([
        { role: "system", content: systemPrompt },
        { role: "user", content: contextualInput },
      ], { temperature: 0.3, maxTokens: 1000 });
      this.log("AI_RESPONSE_RECEIVED", `Length: ${rawResponse.length}`);
    } catch (err) {
      this.log("AI_PROVIDER_ERROR", String(err));
      return {
        status: "blocked",
        response: "AI service temporarily unavailable. Please retry.",
        riskScore: 0,
        reason: "provider_error",
        auditEntries: this.auditLog,
      };
    }

    // 4. Run safety validation
    return this.validateResponse(rawResponse, context);
  }

  // ── Safety Validation Layer ─────────────────────────────────────
  private validateResponse(response: string, context: AIContext): ValidationResult {
    this.log("VALIDATION_START", "Running safety checks...");
    let currentResponse = response;
    let riskScore = 0;
    const violations: string[] = [];

    const allRules = [...this.safetyRules, ...this.companyRules];

    for (const rule of allRules) {
      const result = rule.check(context, currentResponse);
      if (result.triggered) {
        this.log(`RULE_TRIGGERED`, `${rule.name}: ${result.reason}`);
        violations.push(result.reason);

        if (rule.action === "block") {
          this.log("RESPONSE_BLOCKED", rule.name);
          return {
            status: "blocked",
            response: `⚠️ Recommendation blocked for safety: ${result.reason}. Please contact your dispatcher.`,
            riskScore: 100,
            reason: result.reason,
            auditEntries: this.auditLog,
          };
        }
        if (rule.action === "flag") {
          riskScore += 30;
        }
        if (rule.action === "modify") {
          currentResponse = this.addSafetyDisclaimer(currentResponse, result.reason);
          riskScore += 15;
        }
      }
    }

    // Calculate final risk score
    riskScore = Math.min(riskScore, 100);

    const status: ValidationResult["status"] =
      violations.length === 0 ? "approved" :
      riskScore >= 80 ? "flagged" :
      "modified";

    this.log("VALIDATION_COMPLETE", `Status: ${status}, Risk: ${riskScore}`);

    return {
      status,
      response: currentResponse,
      riskScore,
      auditEntries: this.auditLog,
    };
  }

  // ── Built-in Safety Rules ───────────────────────────────────────
  private loadBuiltInSafetyRules() {
    this.safetyRules = [
      {
        id: "no_low_bridge_hgv",
        name: "HGV Low Bridge Block",
        action: "block",
        check: (ctx, res) => ({
          triggered: ctx.vehicleType === "hgv" && /low bridge/i.test(res) && !/avoid/i.test(res),
          reason: "HGV routing through low bridge is prohibited",
        }),
      },
      {
        id: "no_weight_restriction",
        name: "Weight Restriction Block",
        action: "block",
        check: (ctx, res) => ({
          triggered: /weight restriction/i.test(res) && !/avoid/i.test(res) &&
                     (ctx.vehicleType === "hgv" || ctx.vehicleType === "artic"),
          reason: "Vehicle exceeds weight restriction on suggested road",
        }),
      },
      {
        id: "driver_fatigue_block",
        name: "Driver Fatigue Block",
        action: "block",
        check: (ctx, res) => ({
          triggered: typeof ctx.driverHours === "number" && ctx.driverHours >= 9 && /continue/i.test(res),
          reason: "Driver has exceeded safe driving hours. Rest break mandatory.",
        }),
      },
      {
        id: "tight_road_large_vehicle",
        name: "Tight Road Large Vehicle Warning",
        action: "flag",
        check: (ctx, res) => ({
          triggered: (["van", "large_van", "hgv", "artic"].includes(ctx.vehicleType || "")) &&
                     /tight road|parked both sides|narrow lane/i.test(res),
          reason: "Route passes tight road with parking — unsuitable for this vehicle type",
        }),
      },
      {
        id: "no_autonomous_control",
        name: "No Autonomous Control",
        action: "block",
        check: (_, res) => ({
          triggered: /take control|override driver|force route|auto.*drive/i.test(res),
          reason: "AI cannot override driver or take autonomous control",
        }),
      },
      {
        id: "no_legal_violations",
        name: "Legal Compliance Block",
        action: "block",
        check: (_, res) => ({
          triggered: /ignore speed limit|break the law|bypass restriction/i.test(res),
          reason: "Recommendation involves illegal action",
        }),
      },
      {
        id: "advisory_disclaimer",
        name: "Advisory Disclaimer",
        action: "modify",
        check: (_, res) => ({
          triggered: res.length > 100 && !/advisory|driver.*discretion|verify.*route/i.test(res),
          reason: "Missing advisory disclaimer",
        }),
      },
    ];
  }

  // ── System Prompt Builder ───────────────────────────────────────
  private buildSystemPrompt(requestType: string, context: AIContext): string {
    return `You are Fleet Apex Intelligent AI — an operational intelligence system for commercial fleet management.

ROLE: Advisory assistant for fleet dispatchers and drivers. You ASSIST humans — you do NOT control vehicles or make autonomous decisions.

OPERATING CONTEXT:
- Vehicle Type: ${context.vehicleType || "unknown"}
- Vehicle Width: ${context.vehicleWidth ? context.vehicleWidth + "m" : "unknown"}
- Driver Safety Score: ${context.driverSafetyScore || "N/A"}/100
- Driver Hours Today: ${context.driverHours || 0}h
- Weather: ${context.weatherConditions || "unknown"}
- Active Hazards: ${context.hazardReports?.length || 0}

HARD RULES — NEVER VIOLATE:
1. Never route HGVs or large vehicles through low bridges
2. Never suggest ignoring weight restrictions, speed limits, or legal requirements
3. Never recommend continuing driving if driver hours exceed 9h
4. Always flag tight roads for large vehicles
5. Always include advisory disclaimers — AI recommendations require human verification
6. Never take or suggest autonomous control of any vehicle
7. Protect driver privacy — never expose personal data unnecessarily

REQUEST TYPE: ${requestType}

Respond concisely, practically, and with commercial vehicle safety as the highest priority.`;
  }

  // ── Context Injection ───────────────────────────────────────────
  private injectContext(input: string, context: AIContext): string {
    const hazardSummary = context.hazardReports?.length
      ? `\n\nACTIVE HAZARDS ON ROUTE:\n${context.hazardReports
          .slice(0, 5)
          .map((h) => `- ${h.type}: ${h.roadName || "location"} [${h.severity.toUpperCase()}]`)
          .join("\n")}`
      : "";

    const policyNote = context.companyRules?.length
      ? `\n\nCOMPANY POLICIES:\n${context.companyRules.join("\n")}`
      : "";

    return `${input}${hazardSummary}${policyNote}`;
  }

  // ── Helpers ─────────────────────────────────────────────────────
  private addSafetyDisclaimer(response: string, reason: string): string {
    return `${response}\n\n⚠️ Advisory Note: ${reason}. Please verify with your dispatcher before proceeding.`;
  }

  private log(action: string, reason?: string) {
    this.auditLog.push({
      timestamp: new Date().toISOString(),
      action,
      reason,
      validator: "Fleet Apex AI Core v1.0",
    });
  }

  // ── Public: Load company rules ──────────────────────────────────
  loadCompanyRules(rules: SafetyRule[]) {
    this.companyRules = rules;
  }
}

// ─── OpenAI Provider ─────────────────────────────────────────────
export class OpenAIProvider implements AIProvider {
  name = "openai";
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model = "gpt-4o-mini") {
    this.apiKey = apiKey;
    this.model = model;
  }

  async available(): Promise<boolean> {
    return !!this.apiKey;
  }

  async chat(messages: AIMessage[], options: AIOptions = {}): Promise<string> {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: options.model || this.model,
        messages,
        temperature: options.temperature ?? 0.3,
        max_tokens: options.maxTokens ?? 1000,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || "OpenAI error");
    return data.choices[0].message.content;
  }
}

// ─── Ollama Provider (Future local AI) ───────────────────────────
export class OllamaProvider implements AIProvider {
  name = "ollama";
  private baseUrl: string;
  private model: string;

  constructor(baseUrl = "http://localhost:11434", model = "mistral") {
    this.baseUrl = baseUrl;
    this.model = model;
  }

  async available(): Promise<boolean> {
    try {
      const r = await fetch(`${this.baseUrl}/api/tags`);
      return r.ok;
    } catch { return false; }
  }

  async chat(messages: AIMessage[], options: AIOptions = {}): Promise<string> {
    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: options.model || this.model,
        messages,
        stream: false,
      }),
    });
    const data = await res.json();
    return data.message?.content || "";
  }
}

// ─── Factory ─────────────────────────────────────────────────────
export function createAICore(config: {
  provider: "openai" | "ollama" | "local";
  apiKey?: string;
  ollamaUrl?: string;
  model?: string;
}): FleetApexAICore {
  let provider: AIProvider;

  if (config.provider === "openai" && config.apiKey) {
    provider = new OpenAIProvider(config.apiKey, config.model);
  } else if (config.provider === "ollama") {
    provider = new OllamaProvider(config.ollamaUrl, config.model);
  } else {
    // Fallback stub
    provider = {
      name: "stub",
      available: async () => true,
      chat: async () => "AI provider not configured. Please set up your AI provider in company settings.",
    };
  }

  return new FleetApexAICore(provider);
}
