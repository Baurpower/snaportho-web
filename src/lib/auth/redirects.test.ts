import assert from "node:assert/strict";
import { appendSafeReturnTo, safeRedirectPath } from "./redirects";

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

console.log("auth redirect sanitizer tests passed");
