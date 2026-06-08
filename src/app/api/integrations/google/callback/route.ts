import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import {
  decodeGoogleOAuthState,
  getGoogleOAuthClient,
  GOOGLE_OAUTH_STATE_COOKIE,
} from "@/lib/google/calendar";
import { hashGoogleOAuthNonce, requireGoogleApiUser } from "@/lib/google/auth";
import {
  googleConnectionAuditDetails,
  logGoogleAudit,
} from "@/lib/google/audit";

export async function GET(request: NextRequest) {
  const clearStateCookie = (response: NextResponse) => {
    response.cookies.set({
      name: GOOGLE_OAUTH_STATE_COOKIE,
      value: "",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });

    return response;
  };

  try {
    const { searchParams } = new URL(request.url);

    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const cookieState = request.cookies.get(GOOGLE_OAUTH_STATE_COOKIE)?.value;
    const parsedState = decodeGoogleOAuthState(state);
    const parsedCookieState = decodeGoogleOAuthState(cookieState);

    let nextPath = "/work/call?google=connected";

    if (!code) {
      return clearStateCookie(NextResponse.redirect(
        new URL("/work/call?google=failed", request.url)
      ));
    }

    if (
      !parsedState ||
      !parsedCookieState ||
      parsedState.nonce !== parsedCookieState.nonce ||
      parsedState.userId !== parsedCookieState.userId ||
      parsedState.next !== parsedCookieState.next ||
      parsedState.expiresAt !== parsedCookieState.expiresAt ||
      parsedState.expiresAt < Date.now()
    ) {
      return clearStateCookie(
        NextResponse.redirect(
          new URL("/work/call?google=invalid_state", request.url)
        )
      );
    }

    nextPath = parsedState.next;

    const { user, admin } = await requireGoogleApiUser("google.callback");

    logGoogleAudit("oauth.callback_state", {
      stateUserId: parsedState.userId,
      authenticatedUserId: user?.id ?? null,
      authenticatedEmail: user?.email ?? null,
    });

    if (!user || user.id !== parsedState.userId) {
      return clearStateCookie(NextResponse.redirect(
        new URL("/work/call?google=auth_failed", request.url)
      ));
    }

    const consumedAt = new Date().toISOString();
    const { data: consumedState, error: consumeError } = await admin
      .from("google_oauth_states")
      .update({ consumed_at: consumedAt })
      .eq("nonce_hash", hashGoogleOAuthNonce(parsedState.nonce))
      .eq("user_id", user.id)
      .is("consumed_at", null)
      .gt("expires_at", consumedAt)
      .select("nonce_hash")
      .maybeSingle();

    if (consumeError || !consumedState) {
      return clearStateCookie(
        NextResponse.redirect(
          new URL("/work/call?google=invalid_state", request.url)
        )
      );
    }

    const { data: existingConnection } = await admin
      .from("user_calendar_connections")
      .select("id, user_id, provider_account_email, refresh_token, calendar_id")
      .eq("user_id", user.id)
      .eq("provider", "google")
      .maybeSingle();

    const oauth2Client = getGoogleOAuthClient();

    const { tokens } = await oauth2Client.getToken(code);

    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({
      version: "v2",
      auth: oauth2Client,
    });

    const profile = await oauth2.userinfo.get();
    const googleAccountEmail = profile.data.email?.trim().toLowerCase() ?? null;
    const existingGoogleAccountEmail =
      existingConnection?.provider_account_email?.trim().toLowerCase() ?? null;
    const sameGoogleAccount =
      Boolean(googleAccountEmail) &&
      googleAccountEmail === existingGoogleAccountEmail;

    const tokenExpiry = tokens.expiry_date
      ? new Date(tokens.expiry_date).toISOString()
      : null;

    const { data: connection, error: upsertError } = await admin
      .from("user_calendar_connections")
      .upsert(
        {
          user_id: user.id,
          provider: "google",
          provider_account_email: googleAccountEmail,
          access_token: tokens.access_token ?? null,
          refresh_token:
            tokens.refresh_token ??
            (sameGoogleAccount ? existingConnection?.refresh_token : null) ??
            null,
          token_expiry: tokenExpiry,
          calendar_id:
            sameGoogleAccount && existingConnection?.calendar_id
              ? existingConnection.calendar_id
              : "primary",
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,provider",
        }
      )
      .select("id, user_id, provider_account_email")
      .single();

    if (upsertError) {
      throw new Error(upsertError.message);
    }

    if (existingConnection && !sameGoogleAccount) {
      const { error: eventCleanupError } = await admin
        .from("synced_call_events")
        .delete()
        .eq("user_id", user.id)
        .eq("connection_id", connection.id);
      const { error: settingsCleanupError } = await admin
        .from("user_calendar_sync_settings")
        .delete()
        .eq("user_id", user.id)
        .eq("connection_id", connection.id);

      if (eventCleanupError || settingsCleanupError) {
        throw new Error(
          eventCleanupError?.message ??
            settingsCleanupError?.message ??
            "Failed to reset prior Google account state"
        );
      }

      logGoogleAudit("oauth.google_account_changed", {
        connectionId: connection.id,
        ownerUserId: user.id,
        previousGoogleAccountEmail: existingGoogleAccountEmail,
        googleAccountEmail,
      });
    }

    logGoogleAudit(
      "oauth.connection_bound",
      googleConnectionAuditDetails(connection)
    );

    return clearStateCookie(NextResponse.redirect(new URL(nextPath, request.url)));
  } catch (error) {
    console.error(error);

    return clearStateCookie(NextResponse.redirect(
      new URL("/work/call?google=failed", request.url)
    ));
  }
}
