import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../../..");
const migration = readFileSync(
  path.join(root, "supabase/migrations/20260930120000_anki_product_guid_identity.sql"),
  "utf8",
);
const publisher = readFileSync(
  path.join(root, "scripts/publish-anki-note-sync-v2-release.ts"),
  "utf8",
);

for (const invariant of [
  /source_guid text/,
  /product_guid text/,
  /identity_scheme text/,
  /product_guid <> source_guid/,
  /published SnapOrtho sync identity scheme is immutable/,
  /snaportho-note-guid\.v1/,
]) assert.match(migration, invariant);

for (const invariant of [
  /identityCutover/,
  /needsOperation=!predecessor\|\|identityCutover\|\|changed/,
  /onConflict:"source_guid"/,
  /minimum_addon_version:"1\.0\.8"/,
]) assert.match(publisher, invariant);

console.log("anki-product-guid-schema.test.ts: all assertions passed");
