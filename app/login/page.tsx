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

  // קריאה לשרת עם טיפול בשגיאות: גם אם השרת מחזיר עמוד שגיאה (לא JSON) או לא עונה, המשתמש יראה הודעה
  async function call(path: string, body: unknown): Promise<{ ok: boolean; data: Record<string, string> }> {
    try {
      const r = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(25000),
      });
      const text = await r.text();
      let data: Record<string, string> = {};
      try {
        data = JSON.parse(text);
      } catch {
        data = { error: `השרת החזיר שגיאה ${r.status}. בדוק את /api/health ואת ה-Logs ב-Vercel.` };
      }
      return { ok: r.ok, data };
    } catch (e) {
      const timedOut = e instanceof Error && e.name === "TimeoutError";
      return { ok: false, data: { error: timedOut ? "השרת לא ענה בזמן. בדרך כלל: כתובת Supabase שגויה או פרויקט Supabase מושהה. בדוק את /api/health." : "אין חיבור לשרת. בדוק את החיבור לאינטרנט ונסה שוב." } };
    }
  }

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { ok, data } = await call("/api/auth/send-code", { phone });
    setBusy(false);
    if (!ok) return setError(data.error || "שגיאה");
    if (data.devCode) setDevCode(data.devCode);
    setStep("code");
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { ok, data } = await call("/api/auth/verify", { phone, code });
    setBusy(false);
    if (!ok) return setError(data.error || "שגיאה");
    router.replace(data.next || "/");
    router.refresh();
  }

  return (
    <div className="app">
      <div className="login">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="איחוד הצלה" style={{ width: 84, height: 84, objectFit: "contain", marginBottom: 12 }} />
        <h2>אני רק שאלה...</h2>
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
