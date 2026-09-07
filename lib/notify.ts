import { db } from "./db";
import { sendSms } from "./sms";
import { sendEmail } from "./email";
import { sendWhatsapp, whatsappEnabled } from "./whatsapp";
import type { Channel, User } from "./types";

export function appUrl(path = "") {
  const base = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
  return base + path;
}

interface NotifyOptions {
  event: string;
  text: string;
  subject?: string;
  questionId?: string | null;
  link?: string;
  /** אם לא צוין — לפי העדפות המשתמש */
  channels?: Channel[];
}

/** שליחת הודעה למשתמש אחד בכל הערוצים המתאימים, עם רישום ביומן. */
export async function notifyUser(user: Pick<User, "id" | "phone" | "email" | "notify_sms" | "notify_email" | "notify_whatsapp">, opts: NotifyOptions) {
  const channels: Channel[] = opts.channels ?? [
    ...(user.notify_sms ? (["sms"] as Channel[]) : []),
    ...(user.notify_email && user.email ? (["email"] as Channel[]) : []),
    ...(user.notify_whatsapp && whatsappEnabled() ? (["whatsapp"] as Channel[]) : []),
  ];
  const fullText = opts.link ? `${opts.text}\n${opts.link}` : opts.text;
  const rows = [];
  for (const ch of channels) {
    let res;
    let destination = user.phone;
    if (ch === "sms") res = await sendSms(user.phone, fullText);
    else if (ch === "whatsapp") res = await sendWhatsapp(user.phone, fullText);
    else {
      if (!user.email) continue;
      destination = user.email;
      res = await sendEmail(user.email, opts.subject || "אני רק שאלה...", opts.text, opts.link);
    }
    rows.push({
      user_id: user.id,
      channel: ch,
      destination,
      event: opts.event,
      question_id: opts.questionId ?? null,
      body: fullText,
      ok: res.ok,
      error: res.error ?? null,
    });
  }
  if (rows.length) await db().from("notifications").insert(rows);
  return rows;
}

/** כל העונים והמנהלים הפעילים */
export async function getAnswerers(): Promise<User[]> {
  const { data } = await db()
    .from("users")
    .select("*")
    .in("role", ["answerer", "manager"])
    .eq("status", "active");
  return (data as User[]) ?? [];
}

export async function getManagers(): Promise<User[]> {
  const { data } = await db().from("users").select("*").eq("role", "manager").eq("status", "active");
  return (data as User[]) ?? [];
}

export async function notifyMany(users: User[], opts: NotifyOptions, exceptId?: string) {
  await Promise.all(users.filter((u) => u.id !== exceptId).map((u) => notifyUser(u, opts)));
}
