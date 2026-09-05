import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";
import { appUrl } from "@/lib/notify";

export async function POST() {
  await destroySession();
  return NextResponse.redirect(appUrl("/login"), { status: 303 });
}
