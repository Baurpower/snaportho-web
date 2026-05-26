import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import {
  createGoogleOAuthNonce,
  encodeGoogleOAuthState,
  getGoogleAuthUrl,
  GOOGLE_OAUTH_STATE_COOKIE,
  GOOGLE_OAUTH_STATE_MAX_AGE_SECONDS,
  sanitizeGoogleOAuthNextPath,
} from "@/lib/google/calendar";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const next = sanitizeGoogleOAuthNextPath(
      new URL(request.url).searchParams.get("next")
    );
    const expiresAt =
      Date.now() + GOOGLE_OAUTH_STATE_MAX_AGE_SECONDS * 1000;
    const state = encodeGoogleOAuthState({
      nonce: createGoogleOAuthNonce(),
      userId: user.id,
      next,
      expiresAt,
    });

    const response = NextResponse.redirect(getGoogleAuthUrl(state));
    response.cookies.set({
      name: GOOGLE_OAUTH_STATE_COOKIE,
      value: state,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: GOOGLE_OAUTH_STATE_MAX_AGE_SECONDS,
    });

    return response;
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Failed to initialize Google OAuth" },
      { status: 500 }
    );
  }
}
