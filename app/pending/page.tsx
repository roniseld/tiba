import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function PendingPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (!me.name) redirect("/register");
  if (me.status === "active") redirect("/");
  return (
    <div className="app">
      <div className="login">
        <h2>{me.status === "blocked" ? "החשבון חסום" : "ממתין לאישור"}</h2>
        <p>
          {me.status === "blocked"
            ? "החשבון שלך נחסם. אם זו טעות, פנה למנהל האזור."
            : `תודה ${me.name}. מנהל האזור קיבל הודעה ויאשר את החשבון בהקדם. תקבל/י SMS כשזה יקרה.`}
        </p>
        <form action="/api/auth/logout" method="post">
          <button className="btn ghost">יציאה</button>
        </form>
      </div>
    </div>
  );
}
