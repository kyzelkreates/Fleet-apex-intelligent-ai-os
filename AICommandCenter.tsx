// Fleet Apex Admin — AI Command Center
import React, { useState, useEffect, useRef } from "react";

interface AIInsight {
  id: string;
  type: "route" | "safety" | "compliance" | "maintenance" | "coaching" | "executive";
  title: string;
  summary: string;
  riskScore: number;
  status: "approved" | "flagged" | "blocked";
  generatedAt: string;
}

const MODULE_ICONS: Record<string, string> = {
  route: "🗺️", safety: "🛡️", compliance: "📋",
  maintenance: "🔧", coaching: "🎯", executive: "📊",
};

export default function AICommandCenter() {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeModule, setActiveModule] = useState("route");
  const [chatMessages, setChatMessages] = useState<{ role: string; content: string }[]>([]);
  const [inputText, setInputText] = useState("");
  const [thinking, setThinking] = useState(false);
  const [riskStats, setRiskStats] = useState({ fleet: 0, routes: 0, drivers: 0 });
  const chatRef = useRef<HTMLDivElement>(null);
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    fetchInsights();
    fetchRiskStats();
  }, []);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [chatMessages]);

  async function fetchInsights() {
    try {
      const res = await fetch(`/api/ai/insights?module=${activeModule}&limit=10`);
      if (res.ok) setInsights(await res.json());
    } catch {}
  }

  async function fetchRiskStats() {
    try {
      const res = await fetch("/api/ai/risk-stats");
      if (res.ok) setRiskStats(await res.json());
    } catch {}
  }

  async function sendMessage() {
    if (!inputText.trim() || thinking) return;
    const userMsg = inputText.trim();
    setInputText("");
    setChatMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setThinking(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        body: JSON.stringify({ message: userMsg, module: activeModule }),
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      setChatMessages((prev) => [...prev, {
        role: "assistant",
        content: data.response || "No response from AI. Please check your AI provider configuration.",
      }]);
    } catch {
      setChatMessages((prev) => [...prev, {
        role: "assistant",
        content: "⚠️ AI service unavailable. Check your provider settings in Admin → Settings.",
      }]);
    }
    setThinking(false);
  }

  function startVoiceInput() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.lang = "en-GB";
    r.onresult = (e: any) => setInputText(e.results[0][0].transcript);
    r.onend = () => setIsListening(false);
    r.start();
    setIsListening(true);
  }

  const MODULES = [
    { id: "route", label: "Route Intelligence" },
    { id: "safety", label: "Safety Intelligence" },
    { id: "compliance", label: "Compliance Intelligence" },
    { id: "maintenance", label: "Maintenance Intelligence" },
    { id: "coaching", label: "Driver Coaching" },
    { id: "executive", label: "Executive Reports" },
  ];

  return (
    <div style={{ padding: 24, height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ color: "#fff", fontSize: 24, fontWeight: 700, margin: 0 }}>🧠 AI Command Center</h1>
        <p style={{ color: "#8899AA", fontSize: 13, margin: "4px 0 0" }}>
          Fleet Apex Intelligent AI Core — Advisory Engine
        </p>
      </div>

      {/* Risk Scores */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 20 }}>
        <RiskCard label="Fleet Risk Score" score={riskStats.fleet} icon="🚛" />
        <RiskCard label="Route Risk Score" score={riskStats.routes} icon="🗺️" />
        <RiskCard label="Driver Risk Score" score={riskStats.drivers} icon="👤" />
      </div>

      <div style={{ display: "flex", gap: 20, flex: 1, overflow: "hidden" }}>
        {/* Left: Module selector + insights */}
        <div style={{ width: 360, flexShrink: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Module selector */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ color: "#8899AA", fontSize: 11, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>AI Modules</div>
            <div style={{ display: "grid", gap: 4 }}>
              {MODULES.map((m) => (
                <button key={m.id} onClick={() => { setActiveModule(m.id); fetchInsights(); }} style={{
                  background: activeModule === m.id ? "rgba(0,212,255,0.12)" : "transparent",
                  border: `1px solid ${activeModule === m.id ? "#00D4FF" : "rgba(255,255,255,0.06)"}`,
                  color: activeModule === m.id ? "#00D4FF" : "#8899AA",
                  borderRadius: 10, padding: "10px 14px", cursor: "pointer",
                  textAlign: "left", fontSize: 13, display: "flex", alignItems: "center", gap: 8,
                  fontFamily: "Inter, sans-serif",
                }}>
                  <span>{MODULE_ICONS[m.id]}</span> {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* AI Disclaimer */}
          <div style={{ background: "rgba(0,212,255,0.05)", border: "1px solid rgba(0,212,255,0.15)", borderRadius: 10, padding: 12, marginBottom: 16 }}>
            <div style={{ color: "#00D4FF", fontSize: 11, fontWeight: 700, marginBottom: 4 }}>⚡ Advisory System</div>
            <div style={{ color: "#8899AA", fontSize: 11, lineHeight: 1.6 }}>
              All AI recommendations require human review. Fleet Apex AI never overrides drivers or takes autonomous control.
            </div>
          </div>

          {/* Recent insights */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            <div style={{ color: "#8899AA", fontSize: 11, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Recent Insights</div>
            {insights.map((insight) => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
            {insights.length === 0 && (
              <div style={{ color: "#556677", fontSize: 13, textAlign: "center", padding: 24 }}>
                No recent AI insights for this module.
              </div>
            )}
          </div>
        </div>

        {/* Right: AI Chat */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#0D1F35", borderRadius: 16, overflow: "hidden", border: "1px solid rgba(0,212,255,0.1)" }}>
          {/* Chat header */}
          <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #0A1628, #00D4FF)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🧠</div>
            <div>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>Fleet Apex AI Core</div>
              <div style={{ color: "#34C759", fontSize: 11 }}>● {MODULE_ICONS[activeModule]} {MODULES.find((m) => m.id === activeModule)?.label}</div>
            </div>
            <div style={{ marginLeft: "auto", background: "rgba(52,199,89,0.1)", border: "1px solid #34C75944", color: "#34C759", borderRadius: 6, padding: "3px 10px", fontSize: 11 }}>
              Safety Validated
            </div>
          </div>

          {/* Messages */}
          <div ref={chatRef} style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
            {chatMessages.length === 0 && (
              <WelcomePrompts module={activeModule} onSelect={(p) => { setInputText(p); }} />
            )}
            {chatMessages.map((msg, i) => (
              <ChatBubble key={i} role={msg.role} content={msg.content} />
            ))}
            {thinking && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, #0A1628, #00D4FF)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🧠</div>
                <div style={{ background: "#1E3A5F", borderRadius: "0 12px 12px 12px", padding: "10px 16px" }}>
                  <span style={{ color: "#00D4FF" }}>Analysing</span>
                  <span style={{ animation: "pulse 1s infinite", color: "#8899AA" }}> …</span>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", gap: 8 }}>
            <button onClick={startVoiceInput} style={{
              background: isListening ? "rgba(255,59,59,0.2)" : "rgba(0,212,255,0.1)",
              border: `1px solid ${isListening ? "#FF3B3B" : "#00D4FF22"}`,
              borderRadius: 10, padding: "10px 12px", cursor: "pointer", fontSize: 16,
            }}>{isListening ? "🔴" : "🎙️"}</button>
            <input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder={`Ask about ${MODULES.find((m) => m.id === activeModule)?.label.toLowerCase()}…`}
              style={{
                flex: 1, background: "#050E1A", border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 10, padding: "10px 16px", color: "#fff",
                fontSize: 13, fontFamily: "Inter, sans-serif", outline: "none",
              }}
            />
            <button onClick={sendMessage} disabled={!inputText.trim() || thinking} style={{
              background: inputText.trim() ? "linear-gradient(135deg, #0A1628, #00D4FF)" : "rgba(255,255,255,0.05)",
              border: "none", borderRadius: 10, padding: "10px 16px",
              color: inputText.trim() ? "#fff" : "#556677", cursor: "pointer", fontSize: 16,
            }}>➤</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RiskCard({ label, score, icon }: { label: string; score: number; icon: string }) {
  const color = score > 70 ? "#FF3B3B" : score > 40 ? "#FF9500" : "#34C759";
  return (
    <div style={{ background: "#0D1F35", borderRadius: 12, padding: 16, border: "1px solid rgba(255,255,255,0.05)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ color: "#8899AA", fontSize: 12 }}>{icon} {label}</span>
        <span style={{ color, fontSize: 18, fontWeight: 800 }}>{score}</span>
      </div>
      <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 4, height: 6, overflow: "hidden" }}>
        <div style={{ width: `${score}%`, height: "100%", background: color, borderRadius: 4, transition: "width 0.6s ease" }} />
      </div>
    </div>
  );
}

function InsightCard({ insight }: { insight: AIInsight }) {
  const statusColor = insight.status === "approved" ? "#34C759" : insight.status === "flagged" ? "#FF9500" : "#FF3B3B";
  return (
    <div style={{ background: "#050E1A", borderRadius: 10, padding: 12, marginBottom: 8, border: "1px solid rgba(255,255,255,0.04)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ color: "#fff", fontSize: 12, fontWeight: 600 }}>{MODULE_ICONS[insight.type]} {insight.title}</span>
        <span style={{ color: statusColor, fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>{insight.status}</span>
      </div>
      <p style={{ color: "#8899AA", fontSize: 11, margin: 0, lineHeight: 1.6 }}>{insight.summary}</p>
    </div>
  );
}

function ChatBubble({ role, content }: { role: string; content: string }) {
  const isUser = role === "user";
  return (
    <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", gap: 8 }}>
      {!isUser && (
        <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, #0A1628, #00D4FF)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0, alignSelf: "flex-end" }}>🧠</div>
      )}
      <div style={{
        maxWidth: "75%", background: isUser ? "linear-gradient(135deg, #1E3A5F, #2A4F7A)" : "#1A2E42",
        borderRadius: isUser ? "12px 12px 0 12px" : "0 12px 12px 12px",
        padding: "12px 16px",
      }}>
        <div style={{ color: "#fff", fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{content}</div>
      </div>
    </div>
  );
}

function WelcomePrompts({ module, onSelect }: { module: string; onSelect: (p: string) => void }) {
  const prompts: Record<string, string[]> = {
    route: ["What's the safest route for a large van today?", "Which routes have active hazards?", "Optimise tomorrow's deliveries"],
    safety: ["Which drivers have a low safety score?", "What are the highest-risk roads this week?", "Generate a safety summary"],
    compliance: ["Who has a driving licence expiring soon?", "Are there any MOT alerts?", "Generate compliance report"],
    maintenance: ["Which vehicles need service soon?", "Predict maintenance issues for the fleet", "List overdue inspections"],
    coaching: ["Which drivers need coaching?", "Generate a coaching report for Driver A", "Identify fatigue risks"],
    executive: ["Generate a weekly executive summary", "What's our fleet performance this month?", "Produce a board-ready safety report"],
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "20px 0" }}>
      <div style={{ fontSize: 40 }}>🧠</div>
      <div style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>Fleet Apex AI Core</div>
      <div style={{ color: "#8899AA", fontSize: 12, textAlign: "center" }}>Ask me anything about your fleet intelligence.</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
        {(prompts[module] || []).map((p) => (
          <button key={p} onClick={() => onSelect(p)} style={{
            background: "rgba(0,212,255,0.05)", border: "1px solid rgba(0,212,255,0.15)",
            color: "#00D4FF", borderRadius: 10, padding: "10px 16px",
            cursor: "pointer", textAlign: "left", fontSize: 13,
            fontFamily: "Inter, sans-serif",
          }}>💡 {p}</button>
        ))}
      </div>
    </div>
  );
}
