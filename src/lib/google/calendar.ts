import { google } from "googleapis";
import crypto from "node:crypto";

export const GOOGLE_CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/userinfo.email",
];

export const GOOGLE_OAUTH_STATE_COOKIE = "snaportho_google_oauth_state";
export const GOOGLE_OAUTH_STATE_MAX_AGE_SECONDS = 60 * 10;

export type GoogleOAuthStatePayload = {
  nonce: string;
  userId: string;
  next: string;
  expiresAt: number;
};

export function getGoogleOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    process.env.GOOGLE_REDIRECT_URI!
  );
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

export function sanitizeGoogleOAuthNextPath(value: string | null | undefined) {
  if (!value || typeof value !== "string") return "/work/call";
  return value.startsWith("/") ? value : "/work/call";
}

export function encodeGoogleOAuthState(value: GoogleOAuthStatePayload) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

export function decodeGoogleOAuthState(value: string | null | undefined) {
  if (!value) return null;

  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));

    if (
      typeof parsed?.nonce !== "string" ||
      typeof parsed?.userId !== "string" ||
      typeof parsed?.next !== "string" ||
      typeof parsed?.expiresAt !== "number"
    ) {
      return null;
    }

    return {
      nonce: parsed.nonce,
      userId: parsed.userId,
      next: sanitizeGoogleOAuthNextPath(parsed.next),
      expiresAt: parsed.expiresAt,
    } satisfies GoogleOAuthStatePayload;
  } catch {
    return null;
  }
}
