import Link from "next/link";
import Shell from "@/components/Shell";
import QuestionCard from "@/components/QuestionCard";
import { guard } from "@/lib/page-guard";
import { countOpen, listKnowledgeBase } from "@/lib/questions";
import { CATEGORIES } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function KbPage({ searchParams }: { searchParams: Promise<{ q?: string; cat?: string }> }) {
  const me = await guard();
  const { q = "", cat = "" } = await searchParams;
  const category = (CATEGORIES as readonly string[]).includes(cat) ? cat : "";
  const [items, open] = await Promise.all([listKnowledgeBase(q, category), me.role === "volunteer" ? 0 : countOpen()]);
  const href = (c: string) => `/kb?${new URLSearchParams({ ...(q ? { q } : {}), ...(c ? { cat: c } : {}) }).toString()}`;
  return (
    <Shell user={me} active="kb" openCount={open}>
      <div className="sec">מאגר ידע · תשובות שאושרו לפרסום</div>
      <form method="get">
        {category ? <input type="hidden" name="cat" value={category} /> : null}
        <input className="search" name="q" placeholder="חיפוש במאגר…" defaultValue={q} />
      </form>
      <div className="chips">
        <Link href={href("")} className={category ? "" : "on"}>הכל</Link>
        {CATEGORIES.map((c) => <Link key={c} href={href(c)} className={category === c ? "on" : ""}>{c}</Link>)}
      </div>
      <div className="list">
        {items.length ? items.map((x) => <QuestionCard key={x.id} q={x} />) : <div className="empty">{q || category ? "לא נמצאו תשובות" : "המאגר עדיין ריק. תשובות שהעונים מסמנים לפרסום יופיעו כאן."}</div>}
      </div>
    </Shell>
  );
}
