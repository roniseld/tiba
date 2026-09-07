import { ICON_PNG_BASE64 } from "@/lib/logo-data";

/** אייקון האפליקציה כקובץ PNG (מוגש מה-base64 המוטמע). הגודל בכתובת הוא לתאימות בלבד. */
export async function GET() {
  const buf = Buffer.from(ICON_PNG_BASE64, "base64");
  return new Response(buf, {
    headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
