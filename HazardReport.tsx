// Fleet Apex Driver PWA — Quick Hazard Report
// Voice-first, large buttons, minimal typing

import React, { useState, useRef, useEffect } from "react";
import { HAZARD_TYPES, VEHICLE_TYPES } from "./brand";

type Severity = "red" | "orange" | "yellow";

const SEV_CONFIG = {
  red:    { label: "Severe",   emoji: "🔴", color: "#FF3B3B" },
  orange: { label: "Caution",  emoji: "🟠", color: "#FF9500" },
  yellow: { label: "Advisory", emoji: "🟡", color: "#FFD60A" },
};

export default function HazardReport() {
  const [step, setStep] = useState<"type" | "severity" | "details" | "submitting" | "done">("type");
  const [selectedType, setSelectedType] = useState<string>("");
  const [severity, setSeverity] = useState<Severity>("orange");
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [voiceRecording, setVoiceRecording] = useState<Blob | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [location, setLocation] = useState<GeolocationCoordinates | null>(null);
  const [roadName, setRoadName] = useState("");
  const [isListening, setIsListening] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-get GPS on load
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation(pos.coords),
        (err) => console.warn("GPS unavailable:", err),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, []);

  const hazardInfo = HAZARD_TYPES.find((h) => h.id === selectedType);

  // ── Voice input ───────────────────────────────────────────────
  function startVoiceInput() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.lang = "en-GB";
    recognition.interimResults = false;
    recognition.onresult = (e: any) => {
      setDescription((prev) => prev + " " + e.results[0][0].transcript);
    };
    recognition.onend = () => setIsListening(false);
    recognition.start();
    setIsListening(true);
  }

  // ── Voice note recording ──────────────────────────────────────
  async function startVoiceNote() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobEvent["data"][] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        setVoiceRecording(new Blob(chunks, { type: "audio/webm" }));
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone access denied:", err);
    }
  }

  function stopVoiceNote() {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  }

  // ── Photo capture ─────────────────────────────────────────────
  function capturePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPhotos((prev) => [...prev, ev.target?.result as string]);
      };
      reader.readAsDataURL(file);
    }
  }

  // ── Submit ────────────────────────────────────────────────────
  async function submit() {
    setStep("submitting");
    const payload = {
      type: selectedType,
      severity,
      description,
      photos,
      hasVoiceNote: !!voiceRecording,
      location: location ? { lat: location.latitude, lng: location.longitude, accuracy: location.accuracy } : null,
      roadName,
      vehicleType: "large_van", // from driver profile
      reportedAt: new Date().toISOString(),
    };

    try {
      if (navigator.onLine) {
        await fetch("/api/hazards", {
          method: "POST",
          body: JSON.stringify(payload),
          headers: { "Content-Type": "application/json" },
        });
      } else {
        // Queue for background sync
        queueHazardOffline(payload);
        navigator.serviceWorker.ready.then((reg) => reg.sync.register("sync-hazards").catch(() => {}));
      }
      setStep("done");
      // Vibrate to confirm
      if ("vibrate" in navigator) navigator.vibrate([200, 100, 200]);
    } catch {
      queueHazardOffline(payload);
      setStep("done");
    }
  }

  function queueHazardOffline(payload: object) {
    const q = JSON.parse(localStorage.getItem("hazard-queue") || "[]");
    q.push({ ...payload, id: Date.now() });
    localStorage.setItem("hazard-queue", JSON.stringify(q));
  }

  // ─────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: 20, paddingBottom: 40, minHeight: "100vh", background: "#050E1A" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button onClick={() => window.history.back()} style={{ background: "none", border: "none", color: "#fff", fontSize: 24, cursor: "pointer" }}>←</button>
        <h1 style={{ color: "#fff", fontSize: 20, fontWeight: 700, margin: 0 }}>⚠️ Report Hazard</h1>
      </div>

      {/* GPS status */}
      <div style={{
        padding: "8px 12px", borderRadius: 8, marginBottom: 20,
        background: location ? "rgba(52,199,89,0.1)" : "rgba(255,149,0,0.1)",
        border: `1px solid ${location ? "#34C759" : "#FF9500"}`,
        color: location ? "#34C759" : "#FF9500", fontSize: 12,
      }}>
        {location ? `📍 GPS: ${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}` : "⏳ Getting GPS location…"}
      </div>

      {/* ── Step 1: Hazard Type ── */}
      {step === "type" && (
        <div>
          <p style={{ color: "#8899AA", fontSize: 14, marginBottom: 16 }}>What hazard are you reporting?</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {HAZARD_TYPES.map((ht) => (
              <button
                key={ht.id}
                onClick={() => { setSelectedType(ht.id); setStep("severity"); }}
                style={{
                  background: ht.critical ? "rgba(255,59,59,0.12)" : "#0D1F35",
                  border: `2px solid ${ht.critical ? "#FF3B3B" : "rgba(255,255,255,0.08)"}`,
                  borderRadius: 14, padding: "14px 10px", cursor: "pointer",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                }}
              >
                <span style={{ fontSize: 28 }}>{ht.icon}</span>
                <span style={{
                  color: ht.critical ? "#FF3B3B" : "#fff",
                  fontSize: 11, fontWeight: ht.critical ? 700 : 500,
                  textAlign: "center", lineHeight: 1.3,
                }}>{ht.label}</span>
                {ht.critical && (
                  <span style={{ background: "#FF3B3B", color: "#fff", borderRadius: 4, padding: "2px 6px", fontSize: 9, fontWeight: 700 }}>CRITICAL</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Step 2: Severity ── */}
      {step === "severity" && (
        <div>
          <p style={{ color: "#8899AA", fontSize: 14, marginBottom: 8 }}>
            {hazardInfo?.icon} {hazardInfo?.label}
          </p>
          <p style={{ color: "#fff", fontSize: 16, fontWeight: 600, marginBottom: 20 }}>
            How severe is this hazard?
          </p>
          <div style={{ display: "grid", gap: 12 }}>
            {(["red", "orange", "yellow"] as Severity[]).map((sev) => {
              const cfg = SEV_CONFIG[sev];
              return (
                <button
                  key={sev}
                  onClick={() => { setSeverity(sev); setStep("details"); }}
                  style={{
                    background: `rgba(${sev === "red" ? "255,59,59" : sev === "orange" ? "255,149,0" : "255,214,10"},.08)`,
                    border: `3px solid ${cfg.color}`,
                    borderRadius: 14, padding: 20, cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 16,
                  }}
                >
                  <span style={{ fontSize: 32 }}>{cfg.emoji}</span>
                  <div style={{ textAlign: "left" }}>
                    <div style={{ color: cfg.color, fontWeight: 700, fontSize: 16 }}>{cfg.label}</div>
                    <div style={{ color: "#8899AA", fontSize: 12, marginTop: 2 }}>
                      {sev === "red" ? "Immediate danger — road may be impassable" :
                       sev === "orange" ? "Exercise caution — may affect route" :
                       "Awareness only — minor issue"}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          <button onClick={() => setStep("type")} style={backBtn}>← Back</button>
        </div>
      )}

      {/* ── Step 3: Details ── */}
      {step === "details" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
            <span style={{ fontSize: 20 }}>{hazardInfo?.icon}</span>
            <span style={{ color: "#fff", fontWeight: 600 }}>{hazardInfo?.label}</span>
            <span style={{
              background: `${SEV_CONFIG[severity].color}22`,
              color: SEV_CONFIG[severity].color,
              borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700,
            }}>{SEV_CONFIG[severity].label}</span>
          </div>

          {/* Road name */}
          <input
            placeholder="Road name (optional)"
            value={roadName}
            onChange={(e) => setRoadName(e.target.value)}
            style={inputStyle}
          />

          {/* Description with voice input */}
          <div style={{ position: "relative", marginBottom: 12 }}>
            <textarea
              placeholder="Add details (optional)…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              style={{ ...inputStyle, resize: "none", paddingRight: 48 }}
            />
            <button
              onClick={startVoiceInput}
              style={{
                position: "absolute", right: 8, top: 8,
                background: isListening ? "#FF3B3B" : "rgba(0,212,255,0.15)",
                border: "none", borderRadius: 8, padding: 8,
                cursor: "pointer", fontSize: 18,
              }}
            >{isListening ? "🔴" : "🎙️"}</button>
          </div>

          {/* Photo capture */}
          <input ref={fileInputRef} type="file" accept="image/*,video/*" capture="environment" multiple onChange={capturePhoto} style={{ display: "none" }} />
          <button onClick={() => fileInputRef.current?.click()} style={actionBtn("rgba(0,212,255,0.1)", "#00D4FF")}>
            📷 Add Photo / Video
          </button>

          {photos.length > 0 && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
              {photos.map((p, i) => (
                <div key={i} style={{ position: "relative" }}>
                  <img src={p} alt="" style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 8 }} />
                  <button onClick={() => setPhotos((prev) => prev.filter((_, j) => j !== i))} style={{
                    position: "absolute", top: -6, right: -6, background: "#FF3B3B",
                    border: "none", borderRadius: "50%", width: 20, height: 20,
                    color: "#fff", cursor: "pointer", fontSize: 12,
                  }}>×</button>
                </div>
              ))}
            </div>
          )}

          {/* Voice note */}
          <button
            onClick={isRecording ? stopVoiceNote : startVoiceNote}
            style={actionBtn(isRecording ? "rgba(255,59,59,0.15)" : "rgba(255,255,255,0.05)", isRecording ? "#FF3B3B" : "#8899AA")}
          >
            {isRecording ? "⏹ Stop Voice Note" : "🎤 Record Voice Note"}
          </button>

          {voiceRecording && (
            <div style={{ color: "#34C759", fontSize: 12, marginBottom: 12 }}>✅ Voice note recorded</div>
          )}

          <button onClick={submit} style={{
            background: "linear-gradient(135deg, #FF3B3B, #FF9500)",
            color: "#fff", border: "none", borderRadius: 14,
            padding: "18px 24px", fontWeight: 700, fontSize: 16,
            cursor: "pointer", width: "100%", marginTop: 8,
            fontFamily: "Inter, sans-serif",
          }}>
            🚨 Submit Hazard Report
          </button>

          <button onClick={() => setStep("severity")} style={backBtn}>← Back</button>
        </div>
      )}

      {/* ── Submitting ── */}
      {step === "submitting" && (
        <div style={{ textAlign: "center", padding: 48 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
          <div style={{ color: "#fff", fontSize: 18, fontWeight: 600 }}>Submitting hazard…</div>
          <div style={{ color: "#8899AA", fontSize: 13, marginTop: 8 }}>
            {!navigator.onLine ? "Offline — will sync when connected" : "Sending to fleet dashboard"}
          </div>
        </div>
      )}

      {/* ── Done ── */}
      {step === "done" && (
        <div style={{ textAlign: "center", padding: 48 }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
          <div style={{ color: "#34C759", fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Hazard Reported!</div>
          <div style={{ color: "#8899AA", fontSize: 14, marginBottom: 8 }}>
            {navigator.onLine ? "Your report is live on the fleet dashboard." : "Saved offline — will sync automatically."}
          </div>
          <div style={{ color: "#8899AA", fontSize: 12, marginBottom: 32 }}>
            Nearby drivers have been notified.
          </div>
          <button
            onClick={() => { setStep("type"); setSelectedType(""); setDescription(""); setPhotos([]); setVoiceRecording(null); }}
            style={{ background: "#0D1F35", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", borderRadius: 12, padding: "14px 28px", cursor: "pointer", fontFamily: "Inter, sans-serif", fontWeight: 600 }}
          >
            Report Another
          </button>
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", background: "#0D1F35",
  border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12,
  padding: "14px 16px", color: "#fff", fontSize: 14,
  fontFamily: "Inter, sans-serif", boxSizing: "border-box", marginBottom: 12,
};

const backBtn: React.CSSProperties = {
  background: "none", border: "none", color: "#8899AA",
  padding: "16px 0", cursor: "pointer", fontSize: 14,
  fontFamily: "Inter, sans-serif",
};

function actionBtn(bg: string, color: string): React.CSSProperties {
  return {
    background: bg, border: `1px solid ${color}22`,
    color, borderRadius: 12, padding: "12px 16px",
    cursor: "pointer", width: "100%", fontWeight: 500,
    fontSize: 14, fontFamily: "Inter, sans-serif",
    marginBottom: 12, textAlign: "left" as const,
  };
}
