import { createHash, randomBytes } from "node:crypto";

export function generateInviteToken(): string {
  // URL-safe enough for manual copy/paste and strong enough for one-time invites
  return randomBytes(32).toString("base64url");
}

export function hashInviteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function tokenHint(token: string): string {
  return token.slice(-6);
}