import crypto from "node:crypto";
import { google } from "googleapis";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createProgramCalendarOAuthClient } from "@/lib/google/program-calendar-sync";
import { encryptProgramCalendarToken } from "@/lib/google/program-calendar-crypto";
import { requireWorkspacePermission } from "@/lib/workspace/access-control";

const COOKIE = "snaportho_program_calendar_oauth_state";
type State = {
  nonce: string;
  userId: string;
  programId: string;
  expiresAt: number;
};

export async function GET(request: NextRequest) {
  const redirect = (status: string) => {
    const response = NextResponse.redirect(
      new URL(`/work/settings?calendarSource=${status}`, request.url),
    );
    response.cookies.set(COOKIE, "", { path: "/", maxAge: 0 });
    return response;
  };
  try {
    const code = request.nextUrl.searchParams.get("code");
    const rawState = request.nextUrl.searchParams.get("state");
    const cookieState = request.cookies.get(COOKIE)?.value;
    if (!code || !rawState || rawState !== cookieState)
      return redirect("invalid_state");
    const state = JSON.parse(
      Buffer.from(rawState, "base64url").toString("utf8"),
    ) as State;
    if (!state.nonce || state.expiresAt < Date.now())
      return redirect("invalid_state");
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || user.id !== state.userId) return redirect("auth_failed");
    await requireWorkspacePermission({
      userId: user.id,
      programId: state.programId,
      permission: "canManageProgramCalendarSource",
    });
    const admin = createAdminClient();
    const now = new Date().toISOString();
    const { data: consumed, error: consumeError } = await admin
      .from("program_calendar_oauth_states")
      .update({ consumed_at: now })
      .eq(
        "nonce_hash",
        crypto.createHash("sha256").update(state.nonce).digest("hex"),
      )
      .eq("user_id", user.id)
      .eq("program_id", state.programId)
      .is("consumed_at", null)
      .gt("expires_at", now)
      .select("nonce_hash")
      .maybeSingle();
    if (consumeError || !consumed) return redirect("invalid_state");
    const oauth = createProgramCalendarOAuthClient();
    const { tokens } = await oauth.getToken(code);
    oauth.setCredentials(tokens);
    const profile = await google
      .oauth2({ version: "v2", auth: oauth })
      .userinfo.get();
    const { data: existing } = await admin
      .from("program_calendar_connections")
      .select("encrypted_refresh_token")
      .eq("program_id", state.programId)
      .eq("provider", "google")
      .maybeSingle();
    const { error } = await admin.from("program_calendar_connections").upsert(
      {
        program_id: state.programId,
        provider: "google",
        granted_by_user_id: user.id,
        provider_account_email:
          profile.data.email?.trim().toLowerCase() ?? null,
        encrypted_access_token: encryptProgramCalendarToken(
          tokens.access_token,
        ),
        encrypted_refresh_token: tokens.refresh_token
          ? encryptProgramCalendarToken(tokens.refresh_token)
          : (existing?.encrypted_refresh_token ?? null),
        token_expiry: tokens.expiry_date
          ? new Date(tokens.expiry_date).toISOString()
          : null,
        status: "active",
        last_token_error: null,
        last_token_error_at: null,
        updated_at: now,
      },
      { onConflict: "program_id,provider" },
    );
    if (error) throw new Error(error.message);
    return redirect("connected");
  } catch (error) {
    console.error("[program-calendar/callback]", error);
    return redirect("failed");
  }
}
