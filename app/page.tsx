import Link from "next/link";
import Shell from "@/components/Shell";
import QuestionCard from "@/components/QuestionCard";
import { guard } from "@/lib/page-guard";
import { countOpen, listMyQuestions } from "@/lib/questions";

export const dynamic = "force-dynamic";

export default async function MyQuestionsPage() {
  const me = await guard();
  const [mine, open] = await Promise.all([listMyQuestions(me.id), me.role === "volunteer" ? 0 : countOpen()]);
  return (
    <Shell user={me} active="mine" openCount={open}>
      <div className="sec">השאלות שלי</div>
      <div className="list">
        {mine.length ? mine.map((q) => <QuestionCard key={q.id} q={q} />) : <div className="empty">עדיין לא שאלת. יש דילמה מהמשמרת האחרונה?</div>}
      </div>
      <div style={{ marginTop: 16 }}>
        <Link href="/ask" className="btn">שאלה חדשה</Link>
      </div>
    </Shell>
  );
}
