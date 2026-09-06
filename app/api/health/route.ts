import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/** בדיקת תקינות: פותחים בדפדפן /api/health ורואים מה מוגדר ומה עובד. לא חושף סודות. */
function keyType(k: string) {
  if (!k) return "חסר";
  if (k.startsWith("sb_secret_")) return "secret key — תקין";
  if (k.startsWith("sb_publishable_")) return "publishable — לא נכון! צריך את ה-secret key";
  if (k.startsWith("eyJ")) {
    try {
      const payload = JSON.parse(Buffer.from(k.split(".")[1], "base64").toString());
      return payload.role === "service_role" ? "service_role — תקין" : `${payload.role} — לא נכון! צריך את service_role`;
    } catch {
      return "לא מזוהה";
    }
  }
  return "לא מזוהה";
}

export async function GET() {
  const env = {
    APP_URL: !!process.env.APP_URL,
    AUTH_SECRET: (process.env.AUTH_SECRET?.length ?? 0) >= 16,
    SUPABASE_URL: !!process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    MANAGER_PHONE: !!process.env.MANAGER_PHONE,
    CRON_SECRET: !!process.env.CRON_SECRET,
    SMS_PROVIDER: process.env.SMS_PROVIDER || "log",
    SUPABASE_URL_looks_right: /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test((process.env.SUPABASE_URL || "").trim()),
    SUPABASE_KEY_type: keyType(process.env.SUPABASE_SERVICE_ROLE_KEY || ""),
  };
  let database: string;
  try {
    const { error } = await db().from("otp_codes").select("id", { count: "exact", head: true });
    if (error) database = `שגיאה: ${error.message}. אם כתוב permission denied או row-level security — המפתח שהוזן הוא לא service_role/secret key. אם כתוב relation does not exist — schema.sql לא הורץ.`;
    else database = "תקין";
  } catch (e) {
    database = `שגיאה: ${e instanceof Error ? e.message : String(e)}`;
  }
  return NextResponse.json({ env, database }, { headers: { "Content-Type": "application/json; charset=utf-8" } });
}
