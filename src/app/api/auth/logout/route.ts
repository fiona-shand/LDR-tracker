import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ACTIVE_PROFILE_COOKIE, SESSION_COOKIE } from "@/lib/session";

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  cookieStore.delete(ACTIVE_PROFILE_COOKIE);
  return NextResponse.redirect(new URL("/login", request.url));
}
