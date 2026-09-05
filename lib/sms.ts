import { toE164 } from "./phone";

export interface SendResult {
  ok: boolean;
  error?: string;
}

/**
 * שליחת SMS דרך הספק שנבחר ב-SMS_PROVIDER.
 * phone בפורמט 05XXXXXXXX.
 */
export async function sendSms(phone: string, text: string): Promise<SendResult> {
  const provider = (process.env.SMS_PROVIDER || "log").toLowerCase();
  try {
    switch (provider) {
      case "019":
        return await send019(phone, text);
      case "inforu":
        return await sendInforu(phone, text);
      case "twilio":
        return await sendTwilio(phone, text);
      case "log":
      default:
        console.log(`[SMS:log] → ${phone}: ${text}`);
        return { ok: true };
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ---- 019sms.co.il ----
// תיעוד: https://docs.019sms.co.il/sms/send-sms.html
// טוקן: באתר 019 → הגדרות → ניהול טוקנים. אם הפעלתם "בדיקת IP מורשה" — לכבות (ל-Vercel אין IP קבוע).
async function send019(phone: string, text: string): Promise<SendResult> {
  const username = process.env.SMS_019_USERNAME;
  const token = process.env.SMS_019_TOKEN;
  if (!username || !token) return { ok: false, error: "חסרים SMS_019_USERNAME / SMS_019_TOKEN" };
  const res = await fetch("https://019sms.co.il/api", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      sms: {
        user: { username },
        source: process.env.SMS_SENDER || "Tiba",
        destinations: { phone: [{ _: phone }] },
        message: text,
      },
    }),
  });
  const json = (await res.json().catch(() => ({}))) as { status?: number; message?: string };
  if (res.ok && json.status === 0) return { ok: true };
  return { ok: false, error: `019: ${json.message || res.status}` };
}

// ---- InforUMobile ----
// מבוסס על ה-API הציבורי של Inforu (v2 JSON). אם הפורמט אצלכם שונה — לעדכן כאן לפי המסמך שמקבלים מהספק.
async function sendInforu(phone: string, text: string): Promise<SendResult> {
  const username = process.env.SMS_INFORU_USERNAME;
  const token = process.env.SMS_INFORU_TOKEN;
  if (!username || !token) return { ok: false, error: "חסרים SMS_INFORU_USERNAME / SMS_INFORU_TOKEN" };
  const auth = Buffer.from(`${username}:${token}`).toString("base64");
  const res = await fetch("https://capi.inforu.co.il/api/v2/SMS/SendSms", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Basic ${auth}` },
    body: JSON.stringify({
      Data: {
        Message: text,
        Recipients: [{ Phone: phone }],
        Settings: { Sender: process.env.SMS_SENDER || "Tiba" },
      },
    }),
  });
  const json = (await res.json().catch(() => ({}))) as { StatusId?: number; StatusDescription?: string };
  if (res.ok && (json.StatusId === 1 || json.StatusId === undefined)) return { ok: true };
  return { ok: false, error: `Inforu: ${json.StatusDescription || res.status}` };
}

// ---- Twilio ----
async function sendTwilio(phone: string, text: string): Promise<SendResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const tok = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM;
  if (!sid || !tok || !from) return { ok: false, error: "חסרים פרטי Twilio" };
  return twilioMessage(sid, tok, from, toE164(phone), text);
}

export async function twilioMessage(sid: string, tok: string, from: string, to: string, text: string): Promise<SendResult> {
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${sid}:${tok}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ From: from, To: to, Body: text }),
  });
  if (res.ok) return { ok: true };
  const json = (await res.json().catch(() => ({}))) as { message?: string };
  return { ok: false, error: `Twilio: ${json.message || res.status}` };
}
