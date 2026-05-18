// Fleet Apex Admin — Dispatcher Messaging
import React, { useState, useEffect, useRef } from "react";

interface Message { id: string; fromName: string; fromRole: string; content: string; type: string; isRead: boolean; isUrgent: boolean; createdAt: string; }
interface Conversation { driverId: string; driverName: string; vehicleReg?: string; lastMessage: string; lastAt: string; unread: number; }

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { fetchConversations(); }, []);
  useEffect(() => { if (selectedConv) fetchMessages(selectedConv.driverId); }, [selectedConv]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function fetchConversations() {
    try {
      const res = await fetch("/api/messages/conversations");
      if (res.ok) setConversations(await res.json());
    } catch {}
  }

  async function fetchMessages(driverId: string) {
    try {
      const res = await fetch(`/api/messages?driverId=${driverId}`);
      if (res.ok) setMessages(await res.json());
    } catch {}
  }

  async function sendMessage(urgent = false) {
    if (!input.trim() || !selectedConv) return;
    setSending(true);
    const msg = input.trim();
    setInput("");
    try {
      await fetch("/api/messages", {
        method: "POST",
        body: JSON.stringify({ toId: selectedConv.driverId, content: msg, isUrgent: urgent }),
        headers: { "Content-Type": "application/json" },
      });
      setMessages((prev) => [...prev, { id: Date.now().toString(), fromName: "You (Dispatcher)", fromRole: "dispatcher", content: msg, type: "text", isRead: true, isUrgent: urgent, createdAt: new Date().toISOString() }]);
    } catch {}
    setSending(false);
  }

  async function broadcastAll() {
    if (!input.trim()) return;
    await fetch("/api/messages/broadcast", { method: "POST", body: JSON.stringify({ content: input, isUrgent: true }), headers: { "Content-Type": "application/json" } });
    setInput("");
  }

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      {/* Conversations list */}
      <div style={{ width: 300, flexShrink: 0, borderRight: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <h2 style={{ color: "#fff", margin: "0 0 10px", fontSize: 16 }}>💬 Messages</h2>
          <button onClick={broadcastAll} style={{ width: "100%", background: "rgba(255,59,59,0.1)", border: "1px solid rgba(255,59,59,0.3)", color: "#FF3B3B", borderRadius: 10, padding: "8px", fontSize: 12, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
            📢 Broadcast All Drivers
          </button>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {conversations.length === 0 && <div style={{ color: "#556677", textAlign: "center", padding: 24, fontSize: 13 }}>No conversations yet</div>}
          {conversations.map((c) => (
            <div key={c.driverId} onClick={() => setSelectedConv(c)} style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)", cursor: "pointer", background: selectedConv?.driverId === c.driverId ? "rgba(0,212,255,0.06)" : "transparent", borderLeft: selectedConv?.driverId === c.driverId ? "3px solid #00D4FF" : "3px solid transparent" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                <span style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>{c.driverName}</span>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  {c.unread > 0 && <span style={{ background: "#00D4FF", color: "#050E1A", borderRadius: "50%", width: 18, height: 18, fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>{c.unread}</span>}
                  <span style={{ color: "#556677", fontSize: 10 }}>{new Date(c.lastAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              </div>
              {c.vehicleReg && <div style={{ color: "#556677", fontSize: 11 }}>🚛 {c.vehicleReg}</div>}
              <div style={{ color: "#8899AA", fontSize: 12, marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.lastMessage}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Message thread */}
      {selectedConv ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #1E3A5F, #00D4FF)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>👤</div>
            <div>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>{selectedConv.driverName}</div>
              {selectedConv.vehicleReg && <div style={{ color: "#8899AA", fontSize: 11 }}>🚛 {selectedConv.vehicleReg}</div>}
            </div>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
            {messages.map((m) => {
              const isMine = m.fromRole === "dispatcher" || m.fromRole === "admin";
              return (
                <div key={m.id} style={{ display: "flex", justifyContent: isMine ? "flex-end" : "flex-start", gap: 8 }}>
                  {!isMine && <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#1E3A5F", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0, alignSelf: "flex-end" }}>👤</div>}
                  <div style={{ maxWidth: "70%" }}>
                    {m.isUrgent && <div style={{ color: "#FF3B3B", fontSize: 10, fontWeight: 700, marginBottom: 2, textAlign: isMine ? "right" : "left" }}>🚨 URGENT</div>}
                    <div style={{ background: isMine ? "linear-gradient(135deg, #1E3A5F, #2A4F7A)" : m.type === "hazard" ? "rgba(255,149,0,0.15)" : m.type === "emergency" ? "rgba(255,59,59,0.15)" : "#1A2E42", borderRadius: isMine ? "12px 12px 0 12px" : "0 12px 12px 12px", padding: "10px 14px" }}>
                      <div style={{ color: "#fff", fontSize: 13, lineHeight: 1.5 }}>{m.content}</div>
                    </div>
                    <div style={{ color: "#556677", fontSize: 10, marginTop: 3, textAlign: isMine ? "right" : "left" }}>{new Date(m.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
          <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", gap: 8 }}>
            <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendMessage()} placeholder="Message driver…" style={{ flex: 1, background: "#0D1F35", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "10px 14px", color: "#fff", fontSize: 13, fontFamily: "Inter, sans-serif", outline: "none" }} />
            <button onClick={() => sendMessage(true)} style={{ background: "rgba(255,59,59,0.1)", border: "1px solid rgba(255,59,59,0.3)", color: "#FF3B3B", borderRadius: 10, padding: "10px 14px", cursor: "pointer", fontSize: 12, fontFamily: "Inter, sans-serif" }}>🚨</button>
            <button onClick={() => sendMessage(false)} disabled={!input.trim() || sending} style={{ background: input.trim() ? "linear-gradient(135deg, #0A1628, #00D4FF)" : "rgba(255,255,255,0.05)", border: "none", borderRadius: 10, padding: "10px 16px", color: input.trim() ? "#fff" : "#556677", cursor: "pointer", fontSize: 16 }}>➤</button>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#556677", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 40 }}>💬</div>
          <div style={{ fontSize: 14 }}>Select a driver to message</div>
        </div>
      )}
    </div>
  );
}
