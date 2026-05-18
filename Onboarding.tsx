// Fleet Apex Admin — White Glove Onboarding Wizard
import React, { useState } from "react";

const STEPS = [
  { id: "company", label: "Company Setup", icon: "🏢" },
  { id: "branding", label: "Brand & Logo", icon: "🎨" },
  { id: "fleet", label: "Fleet Setup", icon: "🚛" },
  { id: "drivers", label: "Add Drivers", icon: "👤" },
  { id: "domain", label: "Domain Setup", icon: "🌐" },
  { id: "complete", label: "Go Live", icon: "🚀" },
];

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState({
    companyName: "", tradingName: "", supportEmail: "", supportPhone: "", websiteUrl: "",
    logo: "", primaryColor: "#0A1628", accentColor: "#00D4FF", appName: "",
    vehicleCount: "", fleetTypes: [] as string[],
    drivers: [] as { name: string; email: string; license: string }[],
    subdomain: "", customDomain: "",
  });

  function update(key: string, value: any) {
    setData((prev) => ({ ...prev, [key]: value }));
  }

  async function complete() {
    try {
      await fetch("/api/onboarding/complete", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });
      setStep(5);
    } catch {}
  }

  const currentStep = STEPS[step];

  return (
    <div style={{ minHeight: "100%", background: "#050E1A", padding: 32, display: "flex", flexDirection: "column", alignItems: "center" }}>
      {/* Progress */}
      <div style={{ width: "100%", maxWidth: 720, marginBottom: 40 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
          {STEPS.map((s, i) => (
            <div key={s.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flex: 1 }}>
              <div style={{
                width: 40, height: 40, borderRadius: "50%",
                background: i < step ? "#34C759" : i === step ? "#00D4FF" : "rgba(255,255,255,0.06)",
                border: `2px solid ${i < step ? "#34C759" : i === step ? "#00D4FF" : "transparent"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: i < step ? 16 : 18, cursor: i < step ? "pointer" : "default",
              }} onClick={() => i < step && setStep(i)}>
                {i < step ? "✓" : s.icon}
              </div>
              <span style={{ color: i === step ? "#fff" : "#556677", fontSize: 10, textAlign: "center", display: step > 2 ? "none" : "block" }}>{s.label}</span>
              {i < STEPS.length - 1 && (
                <div style={{ position: "absolute", display: "none" }} />
              )}
            </div>
          ))}
        </div>
        {/* Progress bar */}
        <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 4, height: 4 }}>
          <div style={{ width: `${(step / (STEPS.length - 1)) * 100}%`, height: "100%", background: "#00D4FF", borderRadius: 4, transition: "width 0.4s ease" }} />
        </div>
      </div>

      {/* Step content */}
      <div style={{ width: "100%", maxWidth: 560 }}>
        {step === 0 && <CompanyStep data={data} update={update} />}
        {step === 1 && <BrandingStep data={data} update={update} />}
        {step === 2 && <FleetStep data={data} update={update} />}
        {step === 3 && <DriversStep data={data} update={update} />}
        {step === 4 && <DomainStep data={data} update={update} />}
        {step === 5 && <CompleteStep appName={data.appName || data.companyName} subdomain={data.subdomain} />}

        {step < 5 && (
          <div style={{ display: "flex", gap: 12, marginTop: 32 }}>
            {step > 0 && (
              <button onClick={() => setStep(step - 1)} style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", borderRadius: 12, padding: "14px", fontWeight: 600, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
                ← Back
              </button>
            )}
            <button
              onClick={() => step === 4 ? complete() : setStep(step + 1)}
              style={{ flex: 2, background: "linear-gradient(135deg, #0A1628, #00D4FF)", color: "#fff", border: "none", borderRadius: 12, padding: "14px", fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: "Inter, sans-serif" }}
            >
              {step === 4 ? "🚀 Launch Fleet Apex" : "Continue →"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function StepHeader({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return (
    <div style={{ textAlign: "center", marginBottom: 32 }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>{icon}</div>
      <h2 style={{ color: "#fff", fontSize: 22, fontWeight: 800, margin: "0 0 8px" }}>{title}</h2>
      <p style={{ color: "#8899AA", fontSize: 14, margin: 0 }}>{subtitle}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ color: "#8899AA", fontSize: 12, display: "block", marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = { width: "100%", background: "#0D1F35", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "12px 16px", color: "#fff", fontSize: 14, boxSizing: "border-box", outline: "none", fontFamily: "Inter, sans-serif" };

function CompanyStep({ data, update }) {
  return (
    <div>
      <StepHeader icon="🏢" title="Set up your company" subtitle="Tell us about your fleet operation." />
      <Field label="Company Name *"><input value={data.companyName} onChange={(e) => update("companyName", e.target.value)} style={inputStyle} placeholder="e.g. Acme Logistics Ltd" /></Field>
      <Field label="Trading Name"><input value={data.tradingName} onChange={(e) => update("tradingName", e.target.value)} style={inputStyle} placeholder="If different from company name" /></Field>
      <Field label="Support Email"><input type="email" value={data.supportEmail} onChange={(e) => update("supportEmail", e.target.value)} style={inputStyle} placeholder="fleet@company.com" /></Field>
      <Field label="Support Phone"><input value={data.supportPhone} onChange={(e) => update("supportPhone", e.target.value)} style={inputStyle} placeholder="+44 7xxx xxxxxx" /></Field>
      <Field label="Website URL"><input value={data.websiteUrl} onChange={(e) => update("websiteUrl", e.target.value)} style={inputStyle} placeholder="https://yourcompany.com" /></Field>
    </div>
  );
}

function BrandingStep({ data, update }) {
  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => update("logo", ev.target?.result);
    reader.readAsDataURL(f);
  }
  return (
    <div>
      <StepHeader icon="🎨" title="Brand your platform" subtitle="Make it look and feel like yours." />
      <Field label="Platform / App Name"><input value={data.appName} onChange={(e) => update("appName", e.target.value)} style={inputStyle} placeholder={`${data.companyName || "Your Company"} Fleet`} /></Field>
      <Field label="Upload Logo">
        <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
          {data.logo && <img src={data.logo} alt="" style={{ width: 48, height: 48, objectFit: "contain", borderRadius: 8, background: "#1E3A5F" }} />}
          <div style={{ ...inputStyle, textAlign: "center", color: "#00D4FF", cursor: "pointer" }}>
            📁 {data.logo ? "Change Logo" : "Upload Logo (PNG recommended)"}
          </div>
          <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: "none" }} />
        </label>
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Field label="Primary Colour">
          <div style={{ display: "flex", gap: 8 }}>
            <input type="color" value={data.primaryColor} onChange={(e) => update("primaryColor", e.target.value)} style={{ width: 48, height: 44, borderRadius: 8, border: "none", cursor: "pointer" }} />
            <input value={data.primaryColor} onChange={(e) => update("primaryColor", e.target.value)} style={{ ...inputStyle, flex: 1 }} />
          </div>
        </Field>
        <Field label="Accent Colour">
          <div style={{ display: "flex", gap: 8 }}>
            <input type="color" value={data.accentColor} onChange={(e) => update("accentColor", e.target.value)} style={{ width: 48, height: 44, borderRadius: 8, border: "none", cursor: "pointer" }} />
            <input value={data.accentColor} onChange={(e) => update("accentColor", e.target.value)} style={{ ...inputStyle, flex: 1 }} />
          </div>
        </Field>
      </div>
    </div>
  );
}

function FleetStep({ data, update }) {
  const TYPES = ["Cars", "Vans", "Large Vans", "HGVs", "Articulated Lorries", "Minibuses", "Coaches"];
  return (
    <div>
      <StepHeader icon="🚛" title="Set up your fleet" subtitle="Tell us about the vehicles you operate." />
      <Field label="Approximate Vehicle Count"><input type="number" value={data.vehicleCount} onChange={(e) => update("vehicleCount", e.target.value)} style={inputStyle} placeholder="e.g. 24" /></Field>
      <Field label="Vehicle Types Operated">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
          {TYPES.map((t) => {
            const active = data.fleetTypes.includes(t);
            return (
              <button key={t} onClick={() => update("fleetTypes", active ? data.fleetTypes.filter((x: string) => x !== t) : [...data.fleetTypes, t])} style={{ background: active ? "rgba(0,212,255,0.15)" : "rgba(255,255,255,0.05)", border: `1px solid ${active ? "#00D4FF" : "rgba(255,255,255,0.1)"}`, color: active ? "#00D4FF" : "#8899AA", borderRadius: 20, padding: "6px 14px", fontSize: 13, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>{t}</button>
            );
          })}
        </div>
      </Field>
    </div>
  );
}

function DriversStep({ data, update }) {
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [license, setLicense] = useState("");
  function addDriver() {
    if (!name || !email) return;
    update("drivers", [...data.drivers, { name, email, license }]);
    setName(""); setEmail(""); setLicense("");
  }
  return (
    <div>
      <StepHeader icon="👤" title="Add your drivers" subtitle="Add a few now or skip and do it later." />
      <div style={{ background: "#0D1F35", borderRadius: 14, padding: 16, marginBottom: 16 }}>
        <Field label="Driver Name"><input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} placeholder="Full name" /></Field>
        <Field label="Email"><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} placeholder="driver@company.com" /></Field>
        <Field label="Licence Number (optional)"><input value={license} onChange={(e) => setLicense(e.target.value)} style={inputStyle} placeholder="e.g. SMITH801152JA9XF" /></Field>
        <button onClick={addDriver} style={{ background: "rgba(0,212,255,0.1)", border: "1px solid #00D4FF44", color: "#00D4FF", borderRadius: 10, padding: "10px 20px", cursor: "pointer", fontFamily: "Inter, sans-serif", width: "100%" }}>+ Add Driver</button>
      </div>
      {data.drivers.length > 0 && (
        <div style={{ display: "grid", gap: 8 }}>
          {data.drivers.map((d: any, i: number) => (
            <div key={i} style={{ background: "#0D1F35", borderRadius: 10, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ color: "#fff", fontSize: 13 }}>{d.name}</div>
                <div style={{ color: "#8899AA", fontSize: 11 }}>{d.email}</div>
              </div>
              <button onClick={() => update("drivers", data.drivers.filter((_: any, j: number) => j !== i))} style={{ background: "none", border: "none", color: "#FF3B3B", cursor: "pointer" }}>×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DomainStep({ data, update }) {
  return (
    <div>
      <StepHeader icon="🌐" title="Set your domain" subtitle="Your drivers and admins will access Fleet Apex via this URL." />
      <Field label="Subdomain (provided free)">
        <div style={{ display: "flex", gap: 0 }}>
          <input value={data.subdomain} onChange={(e) => update("subdomain", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} style={{ ...inputStyle, borderRadius: "12px 0 0 12px", borderRight: "none" }} placeholder="yourcompany" />
          <div style={{ background: "rgba(0,212,255,0.08)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "0 12px 12px 0", padding: "12px 16px", color: "#8899AA", fontSize: 13, whiteSpace: "nowrap" }}>.fleetapex.ai</div>
        </div>
      </Field>
      <Field label="Custom Domain (optional)">
        <input value={data.customDomain} onChange={(e) => update("customDomain", e.target.value)} style={inputStyle} placeholder="fleet.yourcompany.com" />
        <div style={{ color: "#556677", fontSize: 11, marginTop: 6 }}>Point a CNAME to our servers — instructions sent by email after setup.</div>
      </Field>
    </div>
  );
}

function CompleteStep({ appName, subdomain }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 72, marginBottom: 20 }}>🚀</div>
      <h2 style={{ color: "#fff", fontSize: 26, fontWeight: 800, marginBottom: 12 }}>You're live!</h2>
      <p style={{ color: "#8899AA", fontSize: 15, marginBottom: 32 }}>
        {appName || "Your fleet platform"} is ready. Your team can start using it right now.
      </p>
      {subdomain && (
        <div style={{ background: "rgba(0,212,255,0.08)", border: "1px solid #00D4FF33", borderRadius: 14, padding: 20, marginBottom: 24 }}>
          <div style={{ color: "#8899AA", fontSize: 12, marginBottom: 4 }}>Your platform URL</div>
          <div style={{ color: "#00D4FF", fontWeight: 700, fontSize: 16 }}>https://{subdomain}.fleetapex.ai</div>
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <a href="/dashboard" style={{ background: "linear-gradient(135deg, #0A1628, #00D4FF)", color: "#fff", borderRadius: 12, padding: "14px 24px", fontWeight: 700, fontSize: 15, textDecoration: "none", display: "block" }}>Open Dashboard →</a>
        <a href="/drivers" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", borderRadius: 12, padding: "14px 24px", fontWeight: 500, fontSize: 14, textDecoration: "none", display: "block" }}>Add More Drivers</a>
      </div>
    </div>
  );
}
