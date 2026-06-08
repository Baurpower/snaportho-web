import { NextRequest, NextResponse } from "next/server";
import {
  createGoogleOAuthNonce,
  encodeGoogleOAuthState,
  getGoogleAuthUrl,
  GOOGLE_OAUTH_STATE_COOKIE,
  GOOGLE_OAUTH_STATE_MAX_AGE_SECONDS,
  sanitizeGoogleOAuthNextPath,
} from "@/lib/google/calendar";
import { hashGoogleOAuthNonce, requireGoogleApiUser } from "@/lib/google/auth";
import { logGoogleAudit } from "@/lib/google/audit";

export async function GET(request: NextRequest) {
  try {
    const { user, admin } = await requireGoogleApiUser("google.connect");

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const next = sanitizeGoogleOAuthNextPath(
      new URL(request.url).searchParams.get("next")
    );
    const expiresAt =
      Date.now() + GOOGLE_OAUTH_STATE_MAX_AGE_SECONDS * 1000;
    const nonce = createGoogleOAuthNonce();
    const state = encodeGoogleOAuthState({
      nonce,
      userId: user.id,
      next,
      expiresAt,
    });
    const { error: stateError } = await admin.from("google_oauth_states").insert({
      nonce_hash: hashGoogleOAuthNonce(nonce),
      user_id: user.id,
      expires_at: new Date(expiresAt).toISOString(),
    });

    if (stateError) {
      throw new Error(`Failed to persist OAuth state: ${stateError.message}`);
    }

    logGoogleAudit("oauth.redirect", {
      stateUserId: user.id,
      userEmail: user.email ?? null,
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
