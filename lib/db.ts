import { createClient, SupabaseClient } from "@supabase/supabase-js";

// לקוח שרת בלבד (service role). לעולם לא לייבא מקובץ client component.
let client: SupabaseClient | null = null;

export function db(): SupabaseClient {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("חסרים SUPABASE_URL או SUPABASE_SERVICE_ROLE_KEY בהגדרות הסביבה");
  }
  // סלחנות לכתובת שהודבקה עם נתיב מיותר (למשל .../rest/v1) — משאירים רק את הדומיין
  let base = url.trim();
  try {
    base = new URL(base.startsWith("http") ? base : "https://" + base).origin;
  } catch {
    throw new Error("SUPABASE_URL לא תקין. צריך להיראות כך: https://xxxx.supabase.co");
  }
  client = createClient(base, key.trim(), {
    auth: { persistSession: false, autoRefreshToken: false },
    // לא לחכות לנצח למסד נתונים שלא עונה
    global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(8000) }) },
  });
  return client;
}
