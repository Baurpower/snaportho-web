import { readFileSync } from "node:fs";
import pg from "pg";

const email = process.argv.find((argument) => argument.startsWith("--email="))?.slice("--email=".length)?.trim().toLowerCase();
if (!email) throw new Error("missing_--email");
const env = Object.fromEntries(readFileSync(".env.local", "utf8").split(/\r?\n/).flatMap((line) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) return [];
  const index = trimmed.indexOf("=");
  return [[trimmed.slice(0, index).trim(), trimmed.slice(index + 1).trim().replace(/^['\"]|['\"]$/g, "")]];
}));
if (!env.DATABASE_URL) throw new Error("DATABASE_URL required");
const db = new pg.Client({ connectionString: env.DATABASE_URL, ssl: { rejectUnauthorized: false }, application_name: "resolve_ontology_reviewer" });
await db.connect();
try {
  await db.query("begin read only");
  const result = await db.query("select id, email from auth.users where lower(email) = $1", [email]);
  if (result.rows.length !== 1) throw new Error(`reviewer_email_not_unique_or_missing:${result.rows.length}`);
  console.log(JSON.stringify({ reviewerId: result.rows[0].id, reviewerEmail: result.rows[0].email }, null, 2));
} finally {
  await db.query("rollback").catch(() => undefined);
  await db.end();
}
