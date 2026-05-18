// Fleet Apex Driver PWA — Messages
import React, { useState, useEffect, useRef } from "react";

interface Message { id: string; fromName: string; fromRole: string; content: string; isUrgent: boolean; createdAt: string; type: string; }

export default function DriverMessages() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { fetchMessages(); }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function fetchMessages() {
    try {
      const res = await fetch("/api/driver/messages");
      if (res.ok) setMessages(await res.json());
    } catch {}
  }

  async function sendMessage() {
    if (!input.trim()) return;
    const msg = input.trim(); setInput("");
    setMessages((prev) => [...prev, { id: Date.now().toString(), fromName: "You", fromRole: "driver", content: msg, isUrgent: false, createdAt: new Date().toISOString(), type: "text" }]);
    await fetch("/api/driver/messages", { method: "POST", body: JSON.stringify({ content: msg }), headers: { "Content-Type": "application/json" } }).catch(() => {});
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#050E1A", paddingBottom: 72 }}>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 10 }}>
        <button onClick={() => window.history.back()} style={{ background: "none", border: "none", color: "#fff", fontSize: 22, cursor: "pointer" }}>←</button>
        <h1 style={{ color: "#fff", fontSize: 18, fontWeight: 700, margin: 0 }}>💬 Dispatcher</h1>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        {messages.length === 0 && <div style={{ color: "#556677", textAlign: "center", padding: 32, fontSize: 13 }}>No messages yet. Say hi to your dispatcher!</div>}
        {messages.map((m) => {
          const isMine = m.fromRole === "driver";
          return (
            <div key={m.id} style={{ display: "flex", justifyContent: isMine ? "flex-end" : "flex-start" }}>
              <div style={{ maxWidth: "80%", background: isMine ? "linear-gradient(135deg, #1E3A5F, #2A4F7A)" : m.isUrgent ? "rgba(255,59,59,0.15)" : "#1A2E42", borderRadius: isMine ? "14px 14px 0 14px" : "0 14px 14px 14px", padding: "12px 16px" }}>
                {m.isUrgent && <div style={{ color: "#FF3B3B", fontSize: 10, fontWeight: 700, marginBottom: 4 }}>🚨 URGENT MESSAGE</div>}
                <div style={{ color: "#fff", fontSize: 14, lineHeight: 1.5 }}>{m.content}</div>
                <div style={{ color: "#556677", fontSize: 10, marginTop: 4, textAlign: "right" }}>{new Date(m.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      <div style={{ position: "fixed", bottom: 72, left: 0, right: 0, padding: "10px 16px", borderTop: "1px solid rgba(255,255,255,0.06)", background: "rgba(5,14,26,0.95)", display: "flex", gap: 8 }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendMessage()} placeholder="Message dispatcher…" style={{ flex: 1, background: "#0D1F35", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "12px 16px", color: "#fff", fontSize: 14, fontFamily: "Inter, sans-serif", outline: "none" }} />
        <button onClick={sendMessage} disabled={!input.trim()} style={{ background: input.trim() ? "linear-gradient(135deg, #0A1628, #00D4FF)" : "rgba(255,255,255,0.05)", border: "none", borderRadius: 12, padding: "12px 16px", color: input.trim() ? "#fff" : "#556677", cursor: "pointer", fontSize: 18 }}>➤</button>
      </div>
    </div>
  );
}
