import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { TEAMS } from "@/lib/types";
import { registerAction } from "@/app/actions";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  const { error } = await searchParams;
  return (
    <div className="app">
      <div className="login">
        <h2>נעים להכיר</h2>
        <p>עוד רגע וסיימנו. אחרי הרישום מנהל האזור מאשר את החשבון ואז אפשר לשאול.</p>
        {error === "name" ? <div className="error">צריך שם מלא.</div> : null}
        {error === "email" ? <div className="error">כתובת המייל לא תקינה.</div> : null}
        <form action={registerAction}>
          <div className="field">
            <label htmlFor="name">שם מלא</label>
            <input id="name" name="name" defaultValue={me.name} required minLength={2} autoComplete="name" />
          </div>
          <div className="field">
            <label htmlFor="team">צוות</label>
            <select id="team" name="team" defaultValue={me.team ?? ""}>
              <option value="">בחר/י צוות</option>
              {TEAMS.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="email">מייל (לא חובה — לקבלת התראות במייל)</label>
            <input id="email" name="email" type="email" defaultValue={me.email ?? ""} autoComplete="email" dir="ltr" />
          </div>
          <button className="btn">סיום רישום</button>
        </form>
      </div>
    </div>
  );
}
