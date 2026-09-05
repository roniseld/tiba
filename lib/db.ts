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
  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
