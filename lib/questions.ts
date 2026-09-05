import { db } from "./db";
import type { Message, Question } from "./types";

const Q_SELECT = "*, asker:users!questions_asker_id_fkey(id,name,team), claimer:users!questions_claimed_by_fkey(id,name)";

export async function listMyQuestions(userId: string): Promise<Question[]> {
  const { data } = await db().from("questions").select(Q_SELECT).eq("asker_id", userId).order("created_at", { ascending: false });
  return (data as Question[]) ?? [];
}

export async function listQueue(): Promise<{ open: Question[]; recent: Question[] }> {
  const { data: open } = await db().from("questions").select(Q_SELECT).in("status", ["new", "claimed"]).order("created_at", { ascending: true });
  const { data: recent } = await db().from("questions").select(Q_SELECT).in("status", ["answered", "closed"]).order("answered_at", { ascending: false }).limit(10);
  const sorted = ((open as Question[]) ?? []).sort((a, b) => (a.status === b.status ? 0 : a.status === "new" ? -1 : 1));
  return { open: sorted, recent: (recent as Question[]) ?? [] };
}

export async function countOpen(): Promise<number> {
  const { count } = await db().from("questions").select("id", { count: "exact", head: true }).eq("status", "new");
  return count ?? 0;
}

export async function listKnowledgeBase(query: string): Promise<Question[]> {
  let req = db().from("questions").select(Q_SELECT).eq("in_kb", true).in("status", ["answered", "closed"]).order("answered_at", { ascending: false });
  if (query.trim()) {
    const q = query.trim().replace(/[%_,]/g, " ");
    req = req.or(`title.ilike.%${q}%,body.ilike.%${q}%,category.ilike.%${q}%`);
  }
  const { data } = await req.limit(100);
  return (data as Question[]) ?? [];
}

export async function getQuestion(id: string): Promise<{ q: Question; messages: Message[] } | null> {
  const { data: q } = await db().from("questions").select(Q_SELECT).eq("id", id).maybeSingle();
  if (!q) return null;
  const { data: messages } = await db().from("messages").select("*, author:users(id,name,role)").eq("question_id", id).order("created_at", { ascending: true });
  return { q: q as Question, messages: (messages as Message[]) ?? [] };
}
