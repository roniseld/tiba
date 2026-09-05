import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/** בדיקת תקינות: פותחים בדפדפן /api/health ורואים מה מוגדר ומה עובד. לא חושף סודות. */
export async function GET() {
  const env = {
    APP_URL: !!process.env.APP_URL,
    AUTH_SECRET: (process.env.AUTH_SECRET?.length ?? 0) >= 16,
    SUPABASE_URL: !!process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    MANAGER_PHONE: !!process.env.MANAGER_PHONE,
    CRON_SECRET: !!process.env.CRON_SECRET,
    SMS_PROVIDER: process.env.SMS_PROVIDER || "log",
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
