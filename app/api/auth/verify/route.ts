import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { normalizeIsraeliPhone } from "@/lib/phone";
import { createSession, hashCode, OTP_MAX_ATTEMPTS } from "@/lib/auth";
import type { User } from "@/lib/types";

export async function POST(req: Request) {
  const { phone: raw, code } = (await req.json().catch(() => ({}))) as { phone?: string; code?: string };
  const phone = raw ? normalizeIsraeliPhone(raw) : null;
  if (!phone || !code || !/^\d{6}$/.test(code)) return NextResponse.json({ error: "קוד לא תקין" }, { status: 400 });

  const { data: otp, error: otpErr } = await db()
    .from("otp_codes")
    .select("*")
    .eq("phone", phone)
    .eq("used", false)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (otpErr) return NextResponse.json({ error: "שגיאת מסד נתונים: " + otpErr.message }, { status: 500 });
  if (!otp) return NextResponse.json({ error: "לא נמצא קוד תקף למספר הזה. בקש קוד חדש." }, { status: 400 });
  if (otp.attempts >= OTP_MAX_ATTEMPTS) return NextResponse.json({ error: "יותר מדי ניסיונות. בקש קוד חדש." }, { status: 429 });

  if (otp.code_hash !== hashCode(phone, code)) {
    await db().from("otp_codes").update({ attempts: otp.attempts + 1 }).eq("id", otp.id);
    return NextResponse.json({ error: "הקוד שגוי" }, { status: 400 });
  }
  await db().from("otp_codes").update({ used: true }).eq("id", otp.id);

  // משתמש קיים?
  const { data: existing } = await db().from("users").select("*").eq("phone", phone).maybeSingle();
  let user = existing as User | null;

  if (!user) {
    // המנהל הראשון נוצר אוטומטית לפי MANAGER_PHONE; כל השאר עוברים לרישום
    const managerPhone = process.env.MANAGER_PHONE?.replace(/\D/g, "");
    if (managerPhone && managerPhone === phone) {
      const { data } = await db()
        .from("users")
        .insert({ phone, name: "מנהל האזור", role: "manager", status: "active" })
        .select("*")
        .single();
      user = data as User;
    }
  }

  if (!user) {
    // אין משתמש — נפתח סשן זמני על הטלפון בלבד לצורך הרישום
    const { data } = await db()
      .from("users")
      .insert({ phone, name: "", status: "pending" })
      .select("*")
      .single();
    user = data as User;
    await createSession(user.id);
    return NextResponse.json({ ok: true, next: "/register" });
  }

  await db().from("users").update({ last_login_at: new Date().toISOString() }).eq("id", user.id);
  await createSession(user.id);
  if (!user.name) return NextResponse.json({ ok: true, next: "/register" });
  if (user.status !== "active") return NextResponse.json({ ok: true, next: "/pending" });
  return NextResponse.json({ ok: true, next: user.role === "volunteer" ? "/" : "/queue" });
}
