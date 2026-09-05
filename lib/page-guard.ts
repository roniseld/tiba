import { redirect } from "next/navigation";
import { getCurrentUser } from "./auth";
import type { User } from "./types";

/** לשימוש בראש כל דף פנימי: מחזיר משתמש פעיל או מפנה למקום הנכון. */
export async function guard(opts?: { staff?: boolean; manager?: boolean }): Promise<User> {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (!me.name) redirect("/register");
  if (me.status !== "active") redirect("/pending");
  if (opts?.manager && me.role !== "manager") redirect("/");
  if (opts?.staff && me.role === "volunteer") redirect("/");
  return me;
}
