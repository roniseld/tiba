import Link from "next/link";
import Shell from "@/components/Shell";
import { guard } from "@/lib/page-guard";
import { db } from "@/lib/db";
import { countOpen } from "@/lib/questions";
import { ago, fmtDateTime, hoursBetween } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { CATEGORIES, ROLE_LABEL, TEAMS, type Question, type User } from "@/lib/types";
import { adminAddUserAction, adminUpdateUserAction } from "@/app/actions";

export const dynamic = "force-dynamic";

const STATUS_HE = { pending: "ממתין לאישור", active: "פעיל", blocked: "חסום" } as const;

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ tab?: string; saved?: string; error?: string }> }) {
  const me = await guard({ manager: true });
  const sp = await searchParams;
  const tab = sp.tab ?? "report";
  const open = await countOpen();

  return (
    <Shell user={me} active="admin" openCount={open}>
      <div className="subnav">
        <Link href="/admin" className={tab === "report" ? "on" : ""}>דוח</Link>
        <Link href="/admin?tab=users" className={tab === "users" ? "on" : ""}>משתמשים</Link>
        <Link href="/admin?tab=log" className={tab === "log" ? "on" : ""}>יומן התראות</Link>
      </div>
      {sp.saved ? <div className="ok">נשמר.</div> : null}
      {sp.error === "self" ? <div className="error">אי אפשר להוריד לעצמך הרשאות מנהל.</div> : null}
      {sp.error === "add" ? <div className="error">לא הצלחנו להוסיף. בדוק טלפון (05XXXXXXXX) ושם.</div> : null}
      {tab === "users" ? <Users /> : tab === "log" ? <Log /> : <Report />}
    </Shell>
  );
}

async function Report() {
  const { data } = await db().from("questions").select("*, claimer:users!questions_claimed_by_fkey(id,name)");
  const qs = (data as Question[]) ?? [];
  const openQs = qs.filter((q) => q.status === "new" || q.status === "claimed");
  const done = qs.filter((q) => q.answered_at);
  const avg = done.length ? done.reduce((s, q) => s + hoursBetween(q.created_at, q.answered_at!), 0) / done.length : 0;
  const oldest = openQs.length ? Math.max(...openQs.map((q) => hoursBetween(q.created_at, new Date().toISOString()))) : 0;
  const byCat = CATEGORIES.map((c) => [c, qs.filter((q) => q.category === c).length] as const).filter((x) => x[1]);
  const maxCat = Math.max(1, ...byCat.map((x) => x[1]));
  const byAns = new Map<string, number>();
  for (const q of done) if (q.claimer?.name) byAns.set(q.claimer.name, (byAns.get(q.claimer.name) ?? 0) + 1);
  const ansRows = [...byAns.entries()].sort((a, b) => b[1] - a[1]);
  const maxAns = Math.max(1, ...ansRows.map((x) => x[1]));
  const remind = process.env.REMIND_AFTER_HOURS || "2";
  const escalate = process.env.ESCALATE_AFTER_HOURS || "24";
  return (
    <>
      <div className="sec">מצב התיבה</div>
      <div className="stats">
        <div className="stat"><div className="v num">{openQs.length}</div><div className="k">שאלות פתוחות</div></div>
        <div className="stat"><div className="v num">{avg.toFixed(1)}</div><div className="k">שעות · זמן מענה ממוצע</div></div>
        <div className="stat"><div className="v num">{oldest.toFixed(1)}</div><div className="k">שעות · השאלה הוותיקה שממתינה</div></div>
        <div className="stat"><div className="v num">{qs.filter((q) => q.in_kb).length}</div><div className="k">תשובות במאגר הידע</div></div>
      </div>
      <div className="sec">לפי נושא · סה"כ {qs.length}</div>
      {byCat.length ? byCat.map(([c, n]) => (
        <div className="bar" key={c}><span className="n">{c}</span><span className="f" style={{ width: `${(n / maxCat) * 60}%` }} /><span className="num">{n}</span></div>
      )) : <div className="hint">עדיין אין שאלות.</div>}
      <div className="sec">מענה לפי עונה</div>
      {ansRows.length ? ansRows.map(([c, n]) => (
        <div className="bar" key={c}><span className="n">{c}</span><span className="f" style={{ width: `${(n / maxAns) * 60}%` }} /><span className="num">{n}</span></div>
      )) : <div className="hint">עדיין אין תשובות.</div>}
      <div className="sec">כללי התראות (נקבעים בהגדרות הסביבה)</div>
      <div className="card" style={{ fontSize: 13, lineHeight: 1.7 }}>
        שאלה חדשה → SMS / מייל / וואטסאפ לכל העונים, לפי ההעדפות שלהם<br />
        שאלה לא נלקחה תוך {remind} שעות → תזכורת לעונים<br />
        שאלה פתוחה {escalate} שעות → התראה למנהלי האזור<br />
        תשובה נשלחה → SMS / מייל לשואל, לפי בחירתו בשאלה<br />
        מתנדב חדש נרשם → הודעה למנהלים; אושר → הודעה למתנדב
      </div>
    </>
  );
}

async function Users() {
  const { data } = await db().from("users").select("*").order("status", { ascending: false }).order("created_at", { ascending: false });
  const users = (data as User[]) ?? [];
  const pending = users.filter((u) => u.status === "pending" && u.name);
  const rest = users.filter((u) => !(u.status === "pending" && u.name));
  const Row = ({ u }: { u: User }) => (
    <div className="userrow">
      <div>
        <span className="nm">{u.name || "(לא השלים רישום)"}</span>{" "}
        <span className={`pill s-${u.status}`}>{STATUS_HE[u.status]}</span>
        <div className="hint num" dir="auto">{formatPhone(u.phone)}{u.team ? ` · ${u.team}` : ""}{u.email ? ` · ${u.email}` : ""} · נרשם {ago(u.created_at)}</div>
      </div>
      <form action={adminUpdateUserAction}>
        <input type="hidden" name="id" value={u.id} />
        <select name="role" defaultValue={u.role}>
          {(Object.keys(ROLE_LABEL) as (keyof typeof ROLE_LABEL)[]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
        </select>
        <select name="status" defaultValue={u.status}>
          <option value="active">פעיל</option>
          <option value="pending">ממתין</option>
          <option value="blocked">חסום</option>
        </select>
        <button className="btn sm">{u.status === "pending" ? "אשר" : "עדכן"}</button>
      </form>
    </div>
  );
  return (
    <>
      <div className="sec">ממתינים לאישור · {pending.length}</div>
      {pending.length ? pending.map((u) => <Row key={u.id} u={u} />) : <div className="hint">אין ממתינים.</div>}
      <div className="sec">הוספת משתמש ידנית</div>
      <form action={adminAddUserAction} className="card">
        <div className="row">
          <input name="name" placeholder="שם מלא" required style={{ flex: 2, minWidth: 140, border: "1px solid var(--line)", borderRadius: 8, padding: "7px 10px", background: "var(--surface)" }} />
          <input name="phone" placeholder="05XXXXXXXX" required dir="ltr" style={{ flex: 1, minWidth: 120, border: "1px solid var(--line)", borderRadius: 8, padding: "7px 10px", background: "var(--surface)" }} />
        </div>
        <div className="row" style={{ marginTop: 8, alignItems: "center" }}>
          <select name="role" defaultValue="volunteer" style={{ border: "1px solid var(--line)", borderRadius: 8, padding: "6px 8px", background: "var(--surface)" }}>
            {(Object.keys(ROLE_LABEL) as (keyof typeof ROLE_LABEL)[]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
          </select>
          <select name="team" defaultValue="" style={{ border: "1px solid var(--line)", borderRadius: 8, padding: "6px 8px", background: "var(--surface)" }}>
            <option value="">צוות</option>
            {TEAMS.map((t) => <option key={t}>{t}</option>)}
          </select>
          <button className="btn sm">הוסף כפעיל</button>
        </div>
        <div className="hint" style={{ marginTop: 6 }}>משתמש שנוסף כאן נכנס ישירות בלי לחכות לאישור. כך מוסיפים את העונים המוסמכים.</div>
      </form>
      <div className="sec">כל המשתמשים · {rest.length}</div>
      {rest.map((u) => <Row key={u.id} u={u} />)}
    </>
  );
}

async function Log() {
  const { data } = await db().from("notifications").select("*, user:users(name)").order("created_at", { ascending: false }).limit(80);
  const rows = (data as (Record<string, unknown> & { user?: { name: string } | null })[]) ?? [];
  const names: Record<string, string> = { sms: "SMS", email: "מייל", whatsapp: "וואטסאפ" };
  return (
    <>
      <div className="sec">80 ההתראות האחרונות</div>
      <div className="list">
        {rows.length ? rows.map((n) => (
          <div className="ntf" key={String(n.id)}>
            <span className={`ch ${n.ok ? String(n.channel) : "fail"}`}>{n.ok ? names[String(n.channel)] : "נכשל"}</span>
            <span><b>{n.user?.name ?? "—"}</b> <span className="hint" dir="ltr">{String(n.destination)}</span> <span className="cat">{String(n.event)}</span></span>
            <span className="tx">{String(n.body)}{n.error ? `\nשגיאה: ${String(n.error)}` : ""}</span>
            <span className="tm num">{fmtDateTime(String(n.created_at))}</span>
          </div>
        )) : <div className="empty">עדיין לא נשלחו התראות.</div>}
      </div>
    </>
  );
}
