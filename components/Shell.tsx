import Link from "next/link";
import type { User } from "@/lib/types";
import { APP_NAME, ROLE_LABEL } from "@/lib/types";

const ICONS: Record<string, React.ReactNode> = {
  mine: <svg viewBox="0 0 24 24"><path d="M4 5h16v11H8l-4 4z" /></svg>,
  ask: <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" /></svg>,
  kb: <svg viewBox="0 0 24 24"><path d="M4 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4zM20 4h-7a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h8z" /></svg>,
  queue: <svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h10" /></svg>,
  admin: <svg viewBox="0 0 24 24"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>,
};

export function tabsFor(user: User, openCount: number) {
  const t: { key: string; href: string; label: string; badge?: number }[] = [];
  if (user.role === "volunteer") {
    t.push({ key: "mine", href: "/", label: "השאלות שלי" }, { key: "ask", href: "/ask", label: "שאלה חדשה" }, { key: "kb", href: "/kb", label: "מאגר ידע" });
  } else {
    t.push({ key: "queue", href: "/queue", label: "תור שאלות", badge: openCount }, { key: "ask", href: "/ask", label: "שאלה חדשה" }, { key: "kb", href: "/kb", label: "מאגר ידע" });
    if (user.role === "manager") t.push({ key: "admin", href: "/admin", label: "ניהול" });
    else t.push({ key: "mine", href: "/", label: "שלי" });
  }
  return t;
}

export default function Shell({ user, active, openCount = 0, children }: { user: User; active: string; openCount?: number; children: React.ReactNode }) {
  const tabs = tabsFor(user, openCount);
  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="איחוד הצלה" />
          <div>
          <h1>{APP_NAME}</h1>
          <div className="who">
            {user.name} · {ROLE_LABEL[user.role]}
            {user.team ? ` · ${user.team}` : ""} · <Link href="/me">הגדרות</Link>
          </div>
          </div>
        </div>
      </header>
      <main className="screen">{children}</main>
      <nav className="tabs">
        {tabs.map((t) => (
          <Link key={t.key} href={t.href} className={active === t.key ? "on" : ""}>
            {ICONS[t.key]}
            <span>
              {t.label}
              {t.badge ? <span className="badge num">{t.badge}</span> : null}
            </span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
