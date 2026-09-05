import Shell from "@/components/Shell";
import QuestionCard from "@/components/QuestionCard";
import { guard } from "@/lib/page-guard";
import { countOpen, listKnowledgeBase } from "@/lib/questions";

export const dynamic = "force-dynamic";

export default async function KbPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const me = await guard();
  const { q = "" } = await searchParams;
  const [items, open] = await Promise.all([listKnowledgeBase(q), me.role === "volunteer" ? 0 : countOpen()]);
  return (
    <Shell user={me} active="kb" openCount={open}>
      <div className="sec">מאגר ידע · תשובות שאושרו לפרסום</div>
      <form method="get">
        <input className="search" name="q" placeholder="חיפוש במאגר…" defaultValue={q} />
      </form>
      <div className="list">
        {items.length ? items.map((x) => <QuestionCard key={x.id} q={x} />) : <div className="empty">{q ? "לא נמצאו תשובות" : "המאגר עדיין ריק. תשובות שהעונים מסמנים לפרסום יופיעו כאן."}</div>}
      </div>
    </Shell>
  );
}
