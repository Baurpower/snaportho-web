import assert from "node:assert/strict";
import {
  IMPORT_PARENT_DECK,
  PRODUCT_PARENT_DECK,
  toImportDeckPath,
  toProductDeckPath,
} from "./anki-deck-path";

assert.equal(toProductDeckPath(IMPORT_PARENT_DECK), PRODUCT_PARENT_DECK);
assert.equal(
  toProductDeckPath(`${IMPORT_PARENT_DECK}::2) Pocket Pimped::Xrays`),
  `${PRODUCT_PARENT_DECK}::2) Pocket Pimped::Xrays`,
);
assert.equal(toProductDeckPath("Other::Branch"), "Other::Branch");
assert.equal(toProductDeckPath(""), "");

assert.equal(toImportDeckPath(PRODUCT_PARENT_DECK), IMPORT_PARENT_DECK);
assert.equal(
  toImportDeckPath(`${PRODUCT_PARENT_DECK}::2) Pocket Pimped::Xrays`),
  `${IMPORT_PARENT_DECK}::2) Pocket Pimped::Xrays`,
);
assert.equal(toImportDeckPath("Other::Branch"), "Other::Branch");

console.log("anki-deck-path.test.ts: all assertions passed");
