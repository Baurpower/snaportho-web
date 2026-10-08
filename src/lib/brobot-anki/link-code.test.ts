import assert from "node:assert/strict";
import {
  formatAnkiLinkCode,
  isValidAnkiLinkCode,
  normalizeAnkiLinkCode,
} from "./link-code.ts";

assert.equal(normalizeAnkiLinkCode("a1b2c-3d4e5"), "A1B2C3D4E5");
assert.equal(normalizeAnkiLinkCode(" A1B2C 3D4E5 "), "A1B2C3D4E5");
assert.equal(formatAnkiLinkCode("a1b2c3d4e5"), "A1B2C-3D4E5");
assert.equal(isValidAnkiLinkCode("a1b2c-3d4e5"), true);
assert.equal(isValidAnkiLinkCode("A1B2C3D4EZ"), false);
assert.equal(isValidAnkiLinkCode("A1B2C"), false);

console.log("Anki link-code tests passed");
