"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [devCode, setDevCode] = useState("");

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const r = await fetch("/api/auth/send-code", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone }) });
    const j = await r.json();
    setBusy(false);
    if (!r.ok) return setError(j.error || "שגיאה");
    if (j.devCode) setDevCode(j.devCode);
    setStep("code");
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const r = await fetch("/api/auth/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone, code }) });
    const j = await r.json();
    setBusy(false);
    if (!r.ok) return setError(j.error || "שגיאה");
    router.replace(j.next || "/");
    router.refresh();
  }

  return (
    <div className="app">
      <div className="login">
        <h2>תיבת הדילמות</h2>
        <p>שאלות ודילמות מקצועיות מהשטח, ומענה מעונים מוסמכים. כניסה עם קוד חד-פעמי לטלפון.</p>
        {error ? <div className="error">{error}</div> : null}
        {step === "phone" ? (
          <form onSubmit={sendCode}>
            <div className="field">
              <label htmlFor="ph">מספר טלפון נייד</label>
              <input id="ph" inputMode="tel" autoComplete="tel" placeholder="05X-XXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} required />
            </div>
            <button className="btn" disabled={busy}>{busy ? "שולח…" : "שלח לי קוד ב-SMS"}</button>
          </form>
        ) : (
          <form onSubmit={verify}>
            <div className="field">
              <label htmlFor="code">הקוד שנשלח ל-{phone}</label>
              <input id="code" className="code num" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="••••••" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} autoFocus required />
              {devCode ? <span className="hint">מצב בדיקות (SMS_PROVIDER=log): הקוד הוא {devCode}</span> : <span className="hint">הקוד תקף ל-10 דקות.</span>}
            </div>
            <button className="btn" disabled={busy || code.length !== 6}>{busy ? "בודק…" : "כניסה"}</button>
            <div style={{ marginTop: 12, textAlign: "center" }}>
              <button type="button" className="back" style={{ background: "none", border: 0, cursor: "pointer" }} onClick={() => { setStep("phone"); setCode(""); }}>
                לשנות מספר / לבקש קוד חדש
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
