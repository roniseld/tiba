import Link from "next/link";
import { notFound } from "next/navigation";
import Shell from "@/components/Shell";
import { StatusPill } from "@/components/QuestionCard";
import { guard } from "@/lib/page-guard";
import { countOpen, getQuestion } from "@/lib/questions";
import { ago, hoursBetween } from "@/lib/format";
import { ROLE_LABEL } from "@/lib/types";
import { answerAction, claimAction, closeAction, followUpAction, releaseAction, toggleKbAction } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function QuestionPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> }) {
  const me = await guard();
  const { id } = await params;
  const sp = await searchParams;
  const data = await getQuestion(id);
  if (!data) notFound();
  const { q, messages } = data;

  const isStaff = me.role !== "volunteer";
  const isAsker = q.asker_id === me.id;
  // מתנדב רואה רק שאלות שלו או שאלות במאגר הידע
  if (!isStaff && !isAsker && !q.in_kb) notFound();

  const open = isStaff ? await countOpen() : 0;
  const mineToAnswer = q.status === "claimed" && (q.claimed_by === me.id || me.role === "manager");
  const backHref = isStaff ? "/queue" : isAsker ? "/" : "/kb";
  const lastConsult = [...messages].reverse().find((m) => m.kind === "answer" && m.consulted_with)?.consulted_with ?? null;

  return (
    <Shell user={me} active={isStaff ? "queue" : isAsker ? "mine" : "kb"} openCount={open}>
      <Link href={backHref} className="back">‹ חזרה</Link>
      {sp.sent ? <div className="ok">השאלה נשלחה. העונים המוסמכים קיבלו התראה, ותקבל/י הודעה כשיש תשובה.</div> : null}
      {sp.answered ? <div className="ok">התשובה נשלחה והשואל/ת קיבל/ה התראה.</div> : null}
      {sp.error === "taken" ? <div className="error">השאלה בטיפול של עונה אחר.</div> : null}
      {sp.error === "empty" ? <div className="error">כתוב/י תשובה לפני השליחה.</div> : null}

      <h2 style={{ fontSize: 20, marginBottom: 8 }}>{q.title}</h2>
      <div className="meta" style={{ marginBottom: 14 }}>
        <StatusPill status={q.status} />
        <span className="cat">{q.category}</span>
        {q.answered_at ? <span className="num">נענתה תוך {hoursBetween(q.created_at, q.answered_at).toFixed(1)} שע׳</span> : null}
        {q.in_kb ? <span>· במאגר הידע</span> : null}
      </div>
      {q.status === "claimed" && q.claimer ? <div className="answered-by">בטיפול: <b>{q.claimer.name}</b></div> : null}
      {(q.status === "answered" || q.status === "closed") && q.claimer ? (
        <div className="answered-by">
          נענתה על ידי <b>{q.claimer.name}</b>
          {lastConsult ? <> · בהתייעצות עם <b>{lastConsult}</b></> : null}
        </div>
      ) : null}

      <div className="thread">
        <div className="msg ask">
          <div className="by">
            {q.asker?.name}{q.asker?.team ? ` · ${q.asker.team}` : ""} · {ago(q.created_at)}
          </div>
          {q.body}
        </div>
        {messages.map((m) => (
          <div key={m.id} className={`msg ${m.kind}`}>
            <div className="by">
              {m.author?.name}
              {m.kind === "answer" && m.author?.role ? ` · ${ROLE_LABEL[m.author.role]}` : ""} · {ago(m.created_at)}
            </div>
            {m.body}
            {m.consulted_with ? <div className="consult">בהתייעצות עם {m.consulted_with}</div> : null}
          </div>
        ))}
      </div>

      {/* ---- פעולות עונה ---- */}
      {isStaff && q.status === "new" ? (
        <form action={claimAction} style={{ marginTop: 14 }}>
          <input type="hidden" name="id" value={q.id} />
          <button className="btn">אני לוקח/ת את השאלה</button>
          <div className="hint" style={{ marginTop: 6 }}>שאר העונים יראו שהשאלה בטיפול ולא יענו במקביל.</div>
        </form>
      ) : null}

      {isStaff && q.status === "claimed" && !mineToAnswer ? (
        <div className="hint" style={{ marginTop: 14 }}>בטיפול {q.claimer?.name}.</div>
      ) : null}

      {isStaff && (mineToAnswer || (q.status === "answered" && (q.claimed_by === me.id || me.role === "manager"))) ? (
        <form action={answerAction} style={{ marginTop: 14 }}>
          <input type="hidden" name="id" value={q.id} />
          <div className="field">
            <label htmlFor="body">{q.status === "answered" ? "תשובה נוספת" : "התשובה שלך"}</label>
            <textarea id="body" name="body" placeholder="תשובה מקצועית, קצרה וברורה" required />
          </div>
          <div className="field">
            <label htmlFor="consulted">בהתייעצות עם (לא חובה)</label>
            <input id="consulted" name="consulted_with" maxLength={120} placeholder='למשל: ד"ר לוי, רופא טראומה' />
            <span className="hint">אם התייעצת עם גורם שאינו רשום במערכת, שמו יופיע בתשובה ובהודעה לשואל. התשובה נרשמת על שמך.</span>
          </div>
          <label className="check"><input type="checkbox" name="in_kb" defaultChecked={q.status === "answered" ? q.in_kb : true} /> לפרסם במאגר הידע לכל המתנדבים</label>
          <button className="btn">שלח תשובה</button>
          {q.status === "claimed" ? (
            <div style={{ marginTop: 8 }}>
              <button className="btn ghost sm" formAction={releaseAction} formNoValidate>שחרר את השאלה לעונה אחר</button>
            </div>
          ) : null}
        </form>
      ) : null}

      {isStaff && q.status !== "new" && q.status !== "claimed" ? (
        <form action={toggleKbAction} style={{ marginTop: 10 }}>
          <input type="hidden" name="id" value={q.id} />
          <button className="btn ghost sm">{q.in_kb ? "הסר ממאגר הידע" : "פרסם במאגר הידע"}</button>
        </form>
      ) : null}

      {/* ---- פעולות שואל ---- */}
      {isAsker && q.status === "answered" ? (
        <form action={followUpAction} style={{ marginTop: 14 }}>
          <input type="hidden" name="id" value={q.id} />
          <div className="field">
            <label htmlFor="fbody">שאלת המשך</label>
            <textarea id="fbody" name="body" placeholder="משהו לא ברור בתשובה?" style={{ minHeight: 70 }} required />
          </div>
          <div className="row">
            <button className="btn ghost sm">שלח שאלת המשך</button>
            <button className="btn ghost sm" formAction={closeAction} formNoValidate>התשובה עזרה, לסגור</button>
          </div>
        </form>
      ) : null}
    </Shell>
  );
}
