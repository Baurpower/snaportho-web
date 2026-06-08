import crypto from "node:crypto";

export type GoogleOAuthStatePayload = {
  nonce: string;
  userId: string;
  next: string;
  expiresAt: number;
};

export function sanitizeGoogleOAuthNextPath(value: string | null | undefined) {
  if (!value || typeof value !== "string") return "/work/call";
  return value.startsWith("/") && !value.startsWith("//")
    ? value
    : "/work/call";
}

export function encodeGoogleOAuthState(value: GoogleOAuthStatePayload) {
  const payload = Buffer.from(JSON.stringify(value)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", process.env.GOOGLE_CLIENT_SECRET!)
    .update(payload)
    .digest("base64url");

  return `${payload}.${signature}`;
}

export function decodeGoogleOAuthState(value: string | null | undefined) {
  if (!value) return null;

  try {
    const [payload, signature, extra] = value.split(".");
    if (!payload || !signature || extra) return null;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.GOOGLE_CLIENT_SECRET!)
      .update(payload)
      .digest();
    const actualSignature = Buffer.from(signature, "base64url");

    if (
      actualSignature.length !== expectedSignature.length ||
      !crypto.timingSafeEqual(actualSignature, expectedSignature)
    ) {
      return null;
    }

    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));

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
