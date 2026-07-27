import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ACTIVE_PROFILE_COOKIE } from "@/lib/session";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const personId = formData.get("personId");

  if (typeof personId === "string" && personId.length > 0) {
    const cookieStore = await cookies();
    cookieStore.set(ACTIVE_PROFILE_COOKIE, personId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  const referer = request.headers.get("referer");
  const redirectUrl =
    referer && new URL(referer).origin === request.nextUrl.origin
      ? referer
      : new URL("/", request.url);

  return NextResponse.redirect(redirectUrl);
}
