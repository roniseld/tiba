import Shell from "@/components/Shell";
import { guard } from "@/lib/page-guard";
import { countOpen } from "@/lib/questions";
import { CATEGORIES } from "@/lib/types";
import { askAction } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function AskPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const me = await guard();
  const { error } = await searchParams;
  const open = me.role === "volunteer" ? 0 : await countOpen();
  return (
    <Shell user={me} active="ask" openCount={open}>
      <div className="sec">שאלה חדשה</div>
      <div className="notice">התיבה מיועדת ללמידה ולהתייעצות אחרי אירוע. בזמן אירוע פונים למוקד ולרופא הכונן.</div>
      {error ? <div className="error">צריך נושא, כותרת (לפחות 3 תווים) ותיאור (לפחות 10 תווים).</div> : null}
      <form action={askAction}>
        <div className="field">
          <label htmlFor="category">נושא</label>
          <select id="category" name="category" required>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="title">כותרת קצרה</label>
          <input id="title" name="title" placeholder="למשל: מינון אדרנלין בילד" required minLength={3} maxLength={120} />
        </div>
        <div className="field">
          <label htmlFor="body">תיאור המקרה או השאלה</label>
          <textarea id="body" name="body" placeholder="מה קרה, מה עשית, ומה לא היה לך ברור" required minLength={10} />
          <span className="hint">בלי פרטים מזהים של מטופלים.</span>
        </div>
        <div className="field">
          <label>איך לעדכן אותך כשיש תשובה</label>
          <div className="row">
            <label className="check"><input type="checkbox" name="notify_sms" defaultChecked /> SMS</label>
            <label className="check"><input type="checkbox" name="notify_email" defaultChecked={!!me.email} disabled={!me.email} /> מייל{me.email ? "" : " (אין כתובת בהגדרות)"}</label>
          </div>
        </div>
        <button className="btn">שלח לתיבה</button>
      </form>
    </Shell>
  );
}
