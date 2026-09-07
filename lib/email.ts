import type { SendResult } from "./sms";

/** שליחת מייל דרך Resend. אם אין RESEND_API_KEY — נרשם ביומן בלבד. */
export async function sendEmail(to: string, subject: string, text: string, link?: string): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "אני רק שאלה... <onboarding@resend.dev>";
  const html = `<div dir="rtl" style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#1c2230">
    <p>${escapeHtml(text).replace(/\n/g, "<br>")}</p>
    ${link ? `<p><a href="${link}" style="display:inline-block;background:#f26e2d;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">פתיחה בתיבה</a></p>` : ""}
    <p style="color:#6f6b63;font-size:12px">הודעה אוטומטית מ"אני רק שאלה...".</p></div>`;
  if (!key) {
    console.log(`[EMAIL:log] → ${to} | ${subject}\n${text}${link ? "\n" + link : ""}`);
    return { ok: true };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject, text: link ? `${text}\n\n${link}` : text, html }),
    });
    if (res.ok) return { ok: true };
    const json = (await res.json().catch(() => ({}))) as { message?: string };
    return { ok: false, error: `Resend: ${json.message || res.status}` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string);
}
