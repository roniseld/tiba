import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { appUrl, getAnswerers, getManagers, notifyMany } from "@/lib/notify";
import type { Question } from "@/lib/types";

/**
 * נקודת תזכורות. יש לקרוא לה כל 15–60 דקות משירות cron חיצוני (למשל cron-job.org)
 * עם הכותרת: Authorization: Bearer <CRON_SECRET>
 * או ?secret=<CRON_SECRET> בכתובת.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const auth = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || url.searchParams.get("secret");
  if (!process.env.CRON_SECRET || auth !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const remindH = Number(process.env.REMIND_AFTER_HOURS || 2);
  const escalateH = Number(process.env.ESCALATE_AFTER_HOURS || 24);
  const now = Date.now();
  const result = { reminded: 0, escalated: 0 };

  // 1) שאלות חדשות שלא נלקחו — תזכורת אחת לעונים
  const { data: unclaimed } = await db()
    .from("questions")
    .select("*")
    .eq("status", "new")
    .is("reminder_sent_at", null)
    .lte("created_at", new Date(now - remindH * 3600e3).toISOString());
  if (unclaimed?.length) {
    const answerers = await getAnswerers();
    for (const q of unclaimed as Question[]) {
      await notifyMany(answerers, {
        event: "reminder",
        subject: `תזכורת: שאלה ממתינה ${remindH} שעות`,
        text: `תזכורת: השאלה "${q.title}" ממתינה בתיבה כבר ${remindH} שעות ואף אחד לא לקח אותה.`,
        link: appUrl(`/q/${q.id}`),
        questionId: q.id,
      });
      await db().from("questions").update({ reminder_sent_at: new Date().toISOString() }).eq("id", q.id);
      result.reminded++;
    }
  }

  // 2) שאלות פתוחות (חדשות או בטיפול) מעל הסף — התראה למנהלים, פעם אחת
  const { data: stale } = await db()
    .from("questions")
    .select("*")
    .in("status", ["new", "claimed"])
    .is("escalated_at", null)
    .lte("created_at", new Date(now - escalateH * 3600e3).toISOString());
  if (stale?.length) {
    const managers = await getManagers();
    for (const q of stale as Question[]) {
      await notifyMany(managers, {
        event: "escalation",
        subject: `שאלה פתוחה מעל ${escalateH} שעות`,
        text: `השאלה "${q.title}" פתוחה כבר יותר מ-${escalateH} שעות (${q.status === "claimed" ? "בטיפול אך ללא תשובה" : "לא נלקחה"}).`,
        link: appUrl(`/q/${q.id}`),
        questionId: q.id,
      });
      await db().from("questions").update({ escalated_at: new Date().toISOString() }).eq("id", q.id);
      result.escalated++;
    }
  }

  // 3) ניקוי קודי כניסה ישנים
  await db().from("otp_codes").delete().lt("created_at", new Date(now - 24 * 3600e3).toISOString());

  return NextResponse.json({ ok: true, ...result });
}
