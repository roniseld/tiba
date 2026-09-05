import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

// דפים פתוחים ללא כניסה
const PUBLIC = ["/login", "/api/auth", "/api/cron", "/manifest.webmanifest", "/icon.svg"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const token = req.cookies.get("tiba_session")?.value;
  if (token) {
    try {
      await jwtVerify(token, new TextEncoder().encode(process.env.AUTH_SECRET || ""));
      return NextResponse.next();
    } catch {
      /* fallthrough */
    }
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
