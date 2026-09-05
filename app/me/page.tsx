import Shell from "@/components/Shell";
import { guard } from "@/lib/page-guard";
import { countOpen } from "@/lib/questions";
import { TEAMS } from "@/lib/types";
import { formatPhone } from "@/lib/phone";
import { whatsappEnabled } from "@/lib/whatsapp";
import { updateMeAction } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function MePage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const me = await guard();
  const sp = await searchParams;
  const open = me.role === "volunteer" ? 0 : await countOpen();
  return (
    <Shell user={me} active="" openCount={open}>
      <div className="sec">הפרטים שלי</div>
      {sp.saved ? <div className="ok">נשמר.</div> : null}
      {sp.error === "email" ? <div className="error">כתובת המייל לא תקינה.</div> : null}
      <form action={updateMeAction}>
        <div className="field"><label>טלפון</label><input value={formatPhone(me.phone)} disabled dir="ltr" /></div>
        <div className="field"><label htmlFor="name">שם מלא</label><input id="name" name="name" defaultValue={me.name} required minLength={2} /></div>
        <div className="field">
          <label htmlFor="team">צוות</label>
          <select id="team" name="team" defaultValue={me.team ?? ""}>
            <option value="">ללא</option>
            {TEAMS.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div className="field"><label htmlFor="email">מייל</label><input id="email" name="email" type="email" defaultValue={me.email ?? ""} dir="ltr" /></div>
        <div className="sec">איך לקבל התראות</div>
        <label className="check"><input type="checkbox" name="notify_sms" defaultChecked={me.notify_sms} /> SMS</label>
        <label className="check"><input type="checkbox" name="notify_email" defaultChecked={me.notify_email} /> מייל</label>
        {whatsappEnabled() ? <label className="check"><input type="checkbox" name="notify_whatsapp" defaultChecked={me.notify_whatsapp} /> וואטסאפ</label> : null}
        <div style={{ marginTop: 14 }}><button className="btn">שמירה</button></div>
      </form>
      <form action="/api/auth/logout" method="post" style={{ marginTop: 24 }}>
        <button className="btn ghost">יציאה מהמערכת</button>
      </form>
    </Shell>
  );
}
