import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { createClient } from "@/utils/supabase/server";
import { getGoogleOAuthClient } from "@/lib/google/calendar";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const code = searchParams.get("code");
    const state = searchParams.get("state");

    let nextPath = "/work/call?google=connected";

    if (state) {
      try {
        const parsed = JSON.parse(
          Buffer.from(state, "base64url").toString("utf8")
        );

        if (typeof parsed.next === "string" && parsed.next.startsWith("/")) {
          nextPath = parsed.next;
        }
      } catch {
        nextPath = "/work/call?google=connected";
      }
    }

    if (!code) {
      return NextResponse.redirect(
        new URL("/work/call?google=failed", request.url)
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.redirect(
        new URL("/work/call?google=auth_failed", request.url)
      );
    }

    const { data: existingConnection } = await supabase
      .from("user_calendar_connections")
      .select("refresh_token, calendar_id")
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

    const tokenExpiry = tokens.expiry_date
      ? new Date(tokens.expiry_date).toISOString()
      : null;

    const { error: upsertError } = await supabase
      .from("user_calendar_connections")
      .upsert(
        {
          user_id: user.id,
          provider: "google",
          provider_account_email: profile.data.email ?? null,
          access_token: tokens.access_token ?? null,
          refresh_token:
            tokens.refresh_token ?? existingConnection?.refresh_token ?? null,
          token_expiry: tokenExpiry,
          calendar_id: existingConnection?.calendar_id ?? "primary",
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,provider",
        }
      );

    if (upsertError) {
      throw new Error(upsertError.message);
    }

    return NextResponse.redirect(new URL(nextPath, request.url));
  } catch (error) {
    console.error(error);

    return NextResponse.redirect(
      new URL("/work/call?google=failed", request.url)
    );
  }
}