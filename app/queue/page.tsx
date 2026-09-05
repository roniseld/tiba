import Shell from "@/components/Shell";
import QuestionCard from "@/components/QuestionCard";
import { guard } from "@/lib/page-guard";
import { listQueue } from "@/lib/questions";

export const dynamic = "force-dynamic";

export default async function QueuePage() {
  const me = await guard({ staff: true });
  const { open, recent } = await listQueue();
  const newCount = open.filter((q) => q.status === "new").length;
  return (
    <Shell user={me} active="queue" openCount={newCount}>
      <div className="sec">ממתינות ובטיפול · {open.length}</div>
      <div className="list">
        {open.length ? open.map((q) => <QuestionCard key={q.id} q={q} showAsker />) : <div className="empty">התיבה ריקה. כל הכבוד.</div>}
      </div>
      {recent.length ? (
        <>
          <div className="sec">נענו לאחרונה</div>
          <div className="list">{recent.map((q) => <QuestionCard key={q.id} q={q} showAsker />)}</div>
        </>
      ) : null}
    </Shell>
  );
}
