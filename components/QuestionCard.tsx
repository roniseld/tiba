import Link from "next/link";
import type { Question } from "@/lib/types";
import { STATUS_LABEL } from "@/lib/types";
import { ago } from "@/lib/format";

export function StatusPill({ status }: { status: Question["status"] }) {
  return <span className={`pill s-${status}`}>{STATUS_LABEL[status]}</span>;
}

export default function QuestionCard({ q, showAsker }: { q: Question; showAsker?: boolean }) {
  return (
    <Link href={`/q/${q.id}`} className="card q">
      <div className="t">{q.title}</div>
      <div className="meta">
        <StatusPill status={q.status} />
        <span className="cat">{q.category}</span>
        {showAsker && q.asker ? (
          <span>
            {q.asker.name}
            {q.asker.team ? ` · ${q.asker.team}` : ""}
          </span>
        ) : null}
        <span>{ago(q.created_at)}</span>
        {q.status === "claimed" && q.claimer ? <span>בטיפול {q.claimer.name}</span> : null}
      </div>
    </Link>
  );
}
