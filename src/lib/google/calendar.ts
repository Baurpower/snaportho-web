import { google } from "googleapis";
import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { logGoogleAudit } from "@/lib/google/audit";
export {
  decodeGoogleOAuthState,
  encodeGoogleOAuthState,
  sanitizeGoogleOAuthNextPath,
  type GoogleOAuthStatePayload,
} from "@/lib/google/oauth-state";

export const GOOGLE_CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/userinfo.email",
];

export const GOOGLE_OAUTH_STATE_COOKIE = "snaportho_google_oauth_state";
export const GOOGLE_OAUTH_STATE_MAX_AGE_SECONDS = 60 * 10;

export function getGoogleOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    process.env.GOOGLE_REDIRECT_URI!
  );
}

export function getAuthorizedGoogleOAuthClient(connection: {
  id: string;
  user_id: string;
  access_token: string | null;
  refresh_token: string | null;
}) {
  const oauth2Client = getGoogleOAuthClient();
  oauth2Client.setCredentials({
    access_token: connection.access_token,
    refresh_token: connection.refresh_token,
  });

  oauth2Client.on("tokens", (tokens) => {
    const updates: {
      access_token?: string;
      refresh_token?: string;
      token_expiry?: string;
      updated_at: string;
    } = {
      updated_at: new Date().toISOString(),
    };

    if (tokens.access_token) updates.access_token = tokens.access_token;
    if (tokens.refresh_token) updates.refresh_token = tokens.refresh_token;
    if (tokens.expiry_date) {
      updates.token_expiry = new Date(tokens.expiry_date).toISOString();
    }

    void createAdminClient()
      .from("user_calendar_connections")
      .update(updates)
      .eq("id", connection.id)
      .eq("user_id", connection.user_id)
      .eq("provider", "google")
      .then(({ error }) => {
        logGoogleAudit("token_refresh.persist", {
          connectionId: connection.id,
          ownerUserId: connection.user_id,
          success: !error,
          error: error?.message ?? null,
        });
      });
  });

  return oauth2Client;
}

export function getGoogleAuthUrl(state: string) {
  const oauth2Client = getGoogleOAuthClient();

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: GOOGLE_CALENDAR_SCOPES,
    state,
  });
}

export function createGoogleOAuthNonce() {
  return crypto.randomBytes(24).toString("base64url");
}
