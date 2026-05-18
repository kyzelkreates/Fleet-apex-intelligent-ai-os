// Fleet Apex Driver PWA — Emergency / SOS Button
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function EmergencyButton() {
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const navigate = useNavigate();
  let holdTimer: ReturnType<typeof setInterval> | null = null;
  let progressTimer: ReturnType<typeof setInterval> | null = null;

  function startHold() {
    setHolding(true);
    setProgress(0);

    // Progress bar
    progressTimer = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(progressTimer!);
          return 100;
        }
        return p + 5;
      });
    }, 100);

    // Trigger after 2s hold
    holdTimer = setTimeout(() => {
      if ("vibrate" in navigator) navigator.vibrate([400, 200, 400]);
      navigate("/emergency");
      setHolding(false);
      setProgress(0);
    }, 2000);
  }

  function cancelHold() {
    setHolding(false);
    setProgress(0);
    if (holdTimer) clearTimeout(holdTimer);
    if (progressTimer) clearInterval(progressTimer);
  }

  return (
    <div style={{
      position: "fixed", bottom: 84, left: "50%", transform: "translateX(-50%)",
      zIndex: 200,
    }}>
      {holding && (
        <div style={{ marginBottom: 8, textAlign: "center" }}>
          <div style={{ color: "#FF3B3B", fontSize: 11, fontWeight: 700, marginBottom: 4 }}>Hold to activate SOS…</div>
          <div style={{ background: "rgba(255,59,59,0.2)", borderRadius: 10, height: 6, width: 120, overflow: "hidden" }}>
            <div style={{ width: `${progress}%`, height: "100%", background: "#FF3B3B", borderRadius: 10, transition: "width 0.1s linear" }} />
          </div>
        </div>
      )}
      <button
        onPointerDown={startHold}
        onPointerUp={cancelHold}
        onPointerLeave={cancelHold}
        style={{
          background: holding ? "rgba(255,59,59,0.9)" : "rgba(255,59,59,0.15)",
          border: `2px solid #FF3B3B`,
          borderRadius: "50%",
          width: holding ? 64 : 48,
          height: holding ? 64 : 48,
          color: "#FF3B3B",
          fontSize: holding ? 22 : 18,
          cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: holding ? "0 0 30px rgba(255,59,59,0.6)" : "0 4px 16px rgba(255,59,59,0.3)",
          transition: "all 0.2s ease",
          userSelect: "none",
        }}
        title="Hold for SOS Emergency"
      >
        {holding ? "🆘" : "SOS"}
      </button>
    </div>
  );
}
