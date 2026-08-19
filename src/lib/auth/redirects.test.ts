import assert from "node:assert/strict";
import {
  appendSafeReturnTo,
  buildGoogleOAuthRedirectTo,
  safeRedirectPath,
} from "./redirects";

assert.equal(safeRedirectPath("/brobot/chat", "/"), "/brobot/chat");
assert.equal(
  safeRedirectPath("/brobot/chat?mode=oite&level=pgy2", "/"),
  "/brobot/chat?mode=oite&level=pgy2"
);
assert.equal(safeRedirectPath("//evil.com", "/"), "/");
assert.equal(safeRedirectPath("https://evil.com", "/"), "/");
assert.equal(safeRedirectPath("brobot/chat", "/"), "/");
assert.equal(safeRedirectPath("/\\evil", "/"), "/");
assert.equal(safeRedirectPath(null, "/brobot/chat"), "/brobot/chat");
assert.equal(safeRedirectPath(undefined, ""), "");
assert.equal(
  appendSafeReturnTo("/account/billing?intent=brobot", "/brobot/chat"),
  "/account/billing?intent=brobot&returnTo=%2Fbrobot%2Fchat"
);

assert.equal(
  buildGoogleOAuthRedirectTo(
    "https://snap-ortho.com",
    "/brobot/chat?mode=oite&level=pgy2"
  ),
  "https://snap-ortho.com/auth/callback?next=%2Fbrobot%2Fchat%3Fmode%3Doite%26level%3Dpgy2"
);
assert.equal(
  buildGoogleOAuthRedirectTo("https://snap-ortho.com", "https://evil.com"),
  "https://snap-ortho.com/auth/callback?next=%2F"
);
assert.equal(
  buildGoogleOAuthRedirectTo("https://snap-ortho.com", "//evil.com"),
  "https://snap-ortho.com/auth/callback?next=%2F"
);
assert.equal(
  buildGoogleOAuthRedirectTo("http://localhost:3000", null),
  "http://localhost:3000/auth/callback?next=%2F"
);

console.log("auth redirect sanitizer tests passed");
