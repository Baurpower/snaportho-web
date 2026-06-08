/* eslint-disable @typescript-eslint/no-require-imports */

process.env.GOOGLE_CLIENT_SECRET = "test-google-client-secret";

const {
  decodeGoogleOAuthState,
  encodeGoogleOAuthState,
  sanitizeGoogleOAuthNextPath,
} = require("./oauth-state.ts") as typeof import("./oauth-state");

function assertGoogleEqual<T>(label: string, actual: T, expected: T) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, received ${actual}`);
  }
}

function runGoogleOAuthStateTests() {
  const payload = {
    nonce: "nonce-123",
    userId: "user-456",
    next: "/work/call?setupGoogleSync=1",
    expiresAt: 2_000_000_000_000,
  };
  const encoded = encodeGoogleOAuthState(payload);
  const decoded = decodeGoogleOAuthState(encoded);

  assertGoogleEqual("signed state nonce", decoded?.nonce, payload.nonce);
  assertGoogleEqual("signed state user", decoded?.userId, payload.userId);
  assertGoogleEqual("signed state next", decoded?.next, payload.next);
  assertGoogleEqual("signed state expiry", decoded?.expiresAt, payload.expiresAt);

  const [body, signature] = encoded.split(".");
  const tamperedBody = `${body.slice(0, -1)}${body.endsWith("a") ? "b" : "a"}`;
  assertGoogleEqual(
    "tampered state rejected",
    decodeGoogleOAuthState(`${tamperedBody}.${signature}`),
    null
  );
  assertGoogleEqual(
    "external redirect rejected",
    sanitizeGoogleOAuthNextPath("https://example.com"),
    "/work/call"
  );
  assertGoogleEqual(
    "protocol-relative redirect rejected",
    sanitizeGoogleOAuthNextPath("//example.com/oauth"),
    "/work/call"
  );
}

runGoogleOAuthStateTests();
