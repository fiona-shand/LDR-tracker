import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  createSessionToken,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
} from "@/lib/session";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const passcode = formData.get("passcode");

  if (typeof passcode !== "string" || passcode !== process.env.APP_PASSCODE) {
    return NextResponse.redirect(new URL("/login?error=1", request.url));
  }

  const token = await createSessionToken();
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
  });

  return NextResponse.redirect(new URL("/", request.url));
}
