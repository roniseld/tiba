import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { normalizeIsraeliPhone } from "@/lib/phone";
import { generateCode, hashCode, OTP_MIN_INTERVAL_SECONDS, OTP_TTL_MINUTES } from "@/lib/auth";
import { sendSms } from "@/lib/sms";

export async function POST(req: Request) {
  const { phone: raw } = (await req.json().catch(() => ({}))) as { phone?: string };
  const phone = raw ? normalizeIsraeliPhone(raw) : null;
  if (!phone) return NextResponse.json({ error: "מספר הטלפון לא תקין. צריך מספר נייד ישראלי." }, { status: 400 });

  // חסום משתמשים חסומים
  const { data: user } = await db().from("users").select("status").eq("phone", phone).maybeSingle();
  if (user?.status === "blocked") return NextResponse.json({ error: "החשבון חסום. פנה למנהל האזור." }, { status: 403 });

  // הגבלת קצב: לא יותר מקוד אחד בכל 45 שניות, ולא יותר מ-6 בשעה
  const { data: recent } = await db()
    .from("otp_codes")
    .select("created_at")
    .eq("phone", phone)
    .gte("created_at", new Date(Date.now() - 3600e3).toISOString())
    .order("created_at", { ascending: false });
  if (recent && recent.length >= 6) return NextResponse.json({ error: "יותר מדי ניסיונות. נסה שוב בעוד שעה." }, { status: 429 });
  if (recent?.[0] && Date.now() - new Date(recent[0].created_at).getTime() < OTP_MIN_INTERVAL_SECONDS * 1000) {
    return NextResponse.json({ error: `כבר נשלח קוד. אפשר לבקש קוד חדש בעוד ${OTP_MIN_INTERVAL_SECONDS} שניות.` }, { status: 429 });
  }

  const code = generateCode();
  await db().from("otp_codes").insert({
    phone,
    code_hash: hashCode(phone, code),
    expires_at: new Date(Date.now() + OTP_TTL_MINUTES * 60e3).toISOString(),
  });

  const res = await sendSms(phone, `קוד הכניסה שלך לתיבת הדילמות: ${code}\nתקף ל-${OTP_TTL_MINUTES} דקות.`);
  await db().from("notifications").insert({
    channel: "sms",
    destination: phone,
    event: "otp",
    body: "קוד כניסה (מוסתר)",
    ok: res.ok,
    error: res.error ?? null,
  });
  if (!res.ok) return NextResponse.json({ error: "שליחת ה-SMS נכשלה: " + res.error }, { status: 502 });

  // במצב log (בדיקות) מחזירים את הקוד כדי שאפשר יהיה להיכנס בלי SMS
  const devCode = (process.env.SMS_PROVIDER || "log") === "log" ? code : undefined;
  return NextResponse.json({ ok: true, devCode });
}
