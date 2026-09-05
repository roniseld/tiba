import { toE164 } from "./phone";
import { twilioMessage, type SendResult } from "./sms";

/**
 * וואטסאפ. כרגע נתמך דרך Twilio בלבד (WHATSAPP_PROVIDER=twilio).
 * שימו לב: שליחה יזומה בוואטסאפ מחוץ לחלון 24 שעות דורשת תבנית הודעה מאושרת אצל מטא.
 */
export async function sendWhatsapp(phone: string, text: string): Promise<SendResult> {
  const provider = (process.env.WHATSAPP_PROVIDER || "off").toLowerCase();
  if (provider === "off") return { ok: false, error: "וואטסאפ כבוי (WHATSAPP_PROVIDER=off)" };
  if (provider === "twilio") {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const tok = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_WHATSAPP_FROM;
    if (!sid || !tok || !from) return { ok: false, error: "חסרים פרטי Twilio לוואטסאפ" };
    return twilioMessage(sid, tok, from, `whatsapp:${toE164(phone)}`, text);
  }
  return { ok: false, error: `ספק וואטסאפ לא מוכר: ${provider}` };
}

export function whatsappEnabled() {
  return (process.env.WHATSAPP_PROVIDER || "off").toLowerCase() !== "off";
}
