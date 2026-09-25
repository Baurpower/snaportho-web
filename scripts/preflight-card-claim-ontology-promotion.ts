import { readFileSync } from "node:fs";
import pg from "pg";

const packetPath = process.argv.find((value) => value.startsWith("--input="))?.slice(8);
if (!packetPath) throw new Error("missing_--input");
const packet = JSON.parse(readFileSync(packetPath, "utf8"));
const env = Object.fromEntries(readFileSync(".env.local", "utf8").split(/\r?\n/).flatMap((line) => {
  const value = line.trim(); if (!value || value.startsWith("#") || !value.includes("=")) return [];
  const index = value.indexOf("="); return [[value.slice(0, index).trim(), value.slice(index + 1).trim().replace(/^['\"]|['\"]$/g, "")]];
}));
const db = new pg.Client({ connectionString: env.DATABASE_URL, ssl: { rejectUnauthorized: false }, application_name: "card_claim_promotion_preflight" });
await db.connect();
try {
  await db.query("begin read only");
  const creates = packet.items.filter((item: any) => item.recommendedAction !== "add_alias_to_existing");
  const aliases = packet.items.filter((item: any) => item.recommendedAction === "add_alias_to_existing");
  const labels = creates.map((item: any) => item.normalizedLabel);
  const collisions = await db.query("select id, preferred_label, normalized_label from public.canonical_entities where is_active and normalized_label = any($1::text[])", [labels]);
  const duplicateLabels = labels.filter((label: string, index: number) => labels.indexOf(label) !== index);
  const reviewer = await db.query("select id from auth.users where lower(email) = lower($1)", [process.argv.find((value) => value.startsWith("--reviewer-email="))?.slice(17) ?? ""]);
  console.log(JSON.stringify({ creates: creates.length, aliases: aliases.length, canonicalCollisions: collisions.rows, duplicateLabels: [...new Set(duplicateLabels)], reviewerMatches: reviewer.rows.length }, null, 2));
} finally { await db.query("rollback").catch(() => undefined); await db.end(); }
