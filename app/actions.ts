"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser, requireActiveUser } from "@/lib/auth";
import { appUrl, getAnswerers, getManagers, notifyMany, notifyUser } from "@/lib/notify";
import { normalizeIsraeliPhone } from "@/lib/phone";
import { CATEGORIES, TEAMS, type Question, type Role, type User, type UserStatus } from "@/lib/types";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const bool = (fd: FormData, k: string) => fd.get(k) === "on";

// ---------- רישום והגדרות ----------

export async function registerAction(fd: FormData) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  const name = str(fd, "name");
  const team = str(fd, "team");
  const email = str(fd, "email").toLowerCase() || null;
  if (name.length < 2) redirect("/register?error=name");
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) redirect("/register?error=email");

  const firstTime = !me.name;
  await db().from("users").update({ name, team: team || null, email }).eq("id", me.id);

  if (firstTime && me.status === "pending") {
    const managers = await getManagers();
    await notifyMany(managers, {
      event: "registration",
      subject: "מתנדב חדש ממתין לאישור",
      text: `${name}${team ? ` (${team})` : ""} נרשם לתיבת הדילמות וממתין לאישורך.`,
      link: appUrl("/admin"),
    });
  }
  redirect(me.status === "active" ? "/" : "/pending");
}

export async function updateMeAction(fd: FormData) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  const email = str(fd, "email").toLowerCase() || null;
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) redirect("/me?error=email");
  await db()
    .from("users")
    .update({
      name: str(fd, "name") || me.name,
      team: str(fd, "team") || null,
      email,
      notify_sms: bool(fd, "notify_sms"),
      notify_email: bool(fd, "notify_email"),
      notify_whatsapp: bool(fd, "notify_whatsapp"),
    })
    .eq("id", me.id);
  redirect("/me?saved=1");
}

// ---------- שאלות ----------

export async function askAction(fd: FormData) {
  const me = await requireActiveUser();
  if (!me) redirect("/login");
  const category = str(fd, "category");
  const title = str(fd, "title");
  const body = str(fd, "body");
  if (!(CATEGORIES as readonly string[]).includes(category) || title.length < 3 || body.length < 10) redirect("/ask?error=1");

  const { data: q } = await db()
    .from("questions")
    .insert({ asker_id: me.id, category, title, body, notify_sms: bool(fd, "notify_sms"), notify_email: bool(fd, "notify_email") })
    .select("id")
    .single();
  if (!q) redirect("/ask?error=2");

  const answerers = await getAnswerers();
  await notifyMany(
    answerers,
    {
      event: "new_question",
      subject: `שאלה חדשה בתיבה: ${title}`,
      text: `שאלה חדשה בתיבת הדילמות (${category}) מאת ${me.name}${me.team ? ` · ${me.team}` : ""}:\n"${title}"`,
      link: appUrl(`/q/${q.id}`),
      questionId: q.id,
    },
    me.id,
  );
  revalidatePath("/queue");
  redirect(`/q/${q.id}?sent=1`);
}

async function loadQ(id: string): Promise<Question | null> {
  const { data } = await db().from("questions").select("*, asker:users!questions_asker_id_fkey(*)").eq("id", id).maybeSingle();
  return (data as Question) ?? null;
}

export async function claimAction(fd: FormData) {
  const me = await requireActiveUser();
  if (!me || me.role === "volunteer") redirect("/login");
  const id = str(fd, "id");
  // תפיסה אטומית: רק אם עדיין 'new'
  const { data } = await db()
    .from("questions")
    .update({ status: "claimed", claimed_by: me.id, claimed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "new")
    .select("title")
    .maybeSingle();
  if (data) {
    const others = (await getAnswerers()).filter((u) => u.id !== me.id);
    await notifyMany(others, {
      event: "claimed",
      subject: `השאלה "${data.title}" נלקחה`,
      text: `${me.name} לקח/ה את השאלה "${data.title}". אין צורך לענות עליה.`,
      questionId: id,
    });
  }
  revalidatePath(`/q/${id}`);
  redirect(`/q/${id}`);
}

export async function releaseAction(fd: FormData) {
  const me = await requireActiveUser();
  if (!me || me.role === "volunteer") redirect("/login");
  const id = str(fd, "id");
  const q = await loadQ(id);
  if (q && (q.claimed_by === me.id || me.role === "manager") && q.status === "claimed") {
    await db().from("questions").update({ status: "new", claimed_by: null, claimed_at: null }).eq("id", id);
  }
  redirect(`/q/${id}`);
}

export async function answerAction(fd: FormData) {
  const me = await requireActiveUser();
  if (!me || me.role === "volunteer") redirect("/login");
  const id = str(fd, "id");
  const body = str(fd, "body");
  const inKb = bool(fd, "in_kb");
  if (body.length < 2) redirect(`/q/${id}?error=empty`);
  const q = await loadQ(id);
  if (!q) redirect("/queue");
  // עונה יכול לענות אם השאלה שלו, או חדשה (תפיסה מרומזת), או שהוא מנהל
  if (q.status === "claimed" && q.claimed_by !== me.id && me.role !== "manager") redirect(`/q/${id}?error=taken`);

  await db().from("messages").insert({ question_id: id, author_id: me.id, kind: "answer", body });
  await db()
    .from("questions")
    .update({ status: "answered", claimed_by: q.claimed_by ?? me.id, answered_at: q.answered_at ?? new Date().toISOString(), in_kb: inKb })
    .eq("id", id);

  const asker = q.asker as unknown as User;
  await notifyUser(asker, {
    event: "answered",
    subject: `יש תשובה לשאלה שלך: ${q.title}`,
    text: `${me.name} ענה/תה על השאלה שלך "${q.title}" בתיבת הדילמות.`,
    link: appUrl(`/q/${id}`),
    questionId: id,
    channels: [...(q.notify_sms ? (["sms"] as const) : []), ...(q.notify_email && asker.email ? (["email"] as const) : [])],
  });
  revalidatePath("/queue");
  redirect(`/q/${id}?answered=1`);
}

export async function followUpAction(fd: FormData) {
  const me = await requireActiveUser();
  if (!me) redirect("/login");
  const id = str(fd, "id");
  const body = str(fd, "body");
  const q = await loadQ(id);
  if (!q || q.asker_id !== me.id || body.length < 2) redirect(`/q/${id}`);

  await db().from("messages").insert({ question_id: id, author_id: me.id, kind: "followup", body });
  await db().from("questions").update({ status: "claimed" }).eq("id", id);

  const target = q.claimed_by ? (await db().from("users").select("*").eq("id", q.claimed_by).maybeSingle()).data : null;
  const recipients = target ? [target as User] : await getAnswerers();
  await notifyMany(recipients, {
    event: "followup",
    subject: `שאלת המשך: ${q.title}`,
    text: `${me.name} שלח/ה שאלת המשך על "${q.title}".`,
    link: appUrl(`/q/${id}`),
    questionId: id,
  });
  redirect(`/q/${id}`);
}

export async function closeAction(fd: FormData) {
  const me = await requireActiveUser();
  if (!me) redirect("/login");
  const id = str(fd, "id");
  const q = await loadQ(id);
  if (q && (q.asker_id === me.id || me.role !== "volunteer")) {
    await db().from("questions").update({ status: "closed" }).eq("id", id);
  }
  redirect(`/q/${id}`);
}

export async function toggleKbAction(fd: FormData) {
  const me = await requireActiveUser();
  if (!me || me.role === "volunteer") redirect("/login");
  const id = str(fd, "id");
  const q = await loadQ(id);
  if (q) await db().from("questions").update({ in_kb: !q.in_kb }).eq("id", id);
  revalidatePath("/kb");
  redirect(`/q/${id}`);
}

// ---------- ניהול ----------

export async function adminUpdateUserAction(fd: FormData) {
  const me = await requireActiveUser();
  if (!me || me.role !== "manager") redirect("/login");
  const id = str(fd, "id");
  const role = str(fd, "role") as Role;
  const status = str(fd, "status") as UserStatus;
  if (!["volunteer", "answerer", "manager"].includes(role) || !["pending", "active", "blocked"].includes(status)) redirect("/admin");
  if (id === me.id && (role !== "manager" || status !== "active")) redirect("/admin?tab=users&error=self");

  const { data: before } = await db().from("users").select("*").eq("id", id).maybeSingle();
  await db().from("users").update({ role, status }).eq("id", id);

  if (before && before.status !== "active" && status === "active") {
    await notifyUser(before as User, {
      event: "approved",
      subject: "אושרת לתיבת הדילמות",
      text: `שלום ${before.name}, החשבון שלך בתיבת הדילמות אושר. אפשר להיכנס ולשאול.`,
      link: appUrl("/"),
      channels: ["sms", ...(before.email ? (["email"] as const) : [])],
    });
  }
  revalidatePath("/admin");
  redirect("/admin?tab=users&saved=1");
}

export async function adminAddUserAction(fd: FormData) {
  const me = await requireActiveUser();
  if (!me || me.role !== "manager") redirect("/login");
  const phone = normalizeIsraeliPhone(str(fd, "phone"));
  const name = str(fd, "name");
  const role = str(fd, "role") as Role;
  const team = str(fd, "team");
  if (!phone || name.length < 2) redirect("/admin?tab=users&error=add");
  const { error } = await db().from("users").upsert(
    { phone, name, role, team: (TEAMS as readonly string[]).includes(team) ? team : null, status: "active" },
    { onConflict: "phone" },
  );
  if (error) redirect("/admin?tab=users&error=add");
  revalidatePath("/admin");
  redirect("/admin?tab=users&saved=1");
}
