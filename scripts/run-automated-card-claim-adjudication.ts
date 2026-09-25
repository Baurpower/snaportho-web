import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import pg from "pg";
import { adjudicateOntologyCandidate } from "../src/lib/education/automated-ontology-adjudicator.ts";
import { requireStaging } from "./lib/education/kg-staging-guard.ts";

const arg = (name: string) => process.argv.find((v) => v.startsWith(`${name}=`))?.slice(name.length + 1) ?? "";
const runId = arg("--run-id");
if (!runId) throw new Error("missing_--run-id");
const apply = process.argv.includes("--apply");
if (apply && !process.argv.includes("--confirm=AUTOMATED_ONTOLOGY_ADJUDICATION")) throw new Error("missing_confirmation");
const out = arg("--out") || `reports/education/automated-adjudication/${runId}`;
const env = Object.fromEntries(readFileSync(".env.local", "utf8").split(/\r?\n/).flatMap((l) => { const i=l.indexOf("="); return i < 0 ? [] : [[l.slice(0,i).trim(),l.slice(i+1).trim().replace(/^['\"]|['\"]$/g,"")]]; }));
if (!env.DATABASE_URL) throw new Error("DATABASE_URL required");
if (apply) requireStaging("automated card-claim ontology adjudication");
const db = new pg.Client({ connectionString: env.DATABASE_URL, ssl: { rejectUnauthorized: false }, application_name: "automated_card_claim_adjudication" });
await db.connect();
try {
  await db.query("begin");
  const rows = (await db.query(`select id, proposed_entity_label, metadata from public.kg_automation_proposals where is_active and review_status='needs_review' and metadata->>'card_claim_review_run_id'=$1`, [runId])).rows;
  const outcomes = rows.map((r) => {
    const m = r.metadata ?? {}; const sources = Array.isArray(m.source_cards) ? m.source_cards : [];
    const d = adjudicateOntologyCandidate({ label: r.proposed_entity_label ?? "", sourceCount: sources.length, duplicateConflict: (m.possible_canonical_duplicates?.length ?? 0) > 0 || (m.possible_proposed_duplicates?.length ?? 0) > 0 });
    return { id: r.id, label: r.proposed_entity_label, sources, ...d };
  });
  if (apply) {
    const decidedAt = new Date().toISOString();
    const decisions = outcomes.map((o) => ({
      id: o.id,
      review_status: o.decision === "promote" ? "approved" : o.decision === "reject" ? "rejected" : "needs_review",
      adjudication: { version: "v1", decision: o.decision, entity_type: o.entityType, score: o.score, reasons: o.reasons, decided_at: decidedAt },
    }));
    // One set-based update keeps the run atomic and avoids host timeouts from
    // hundreds of serial service-role writes.
    const updated = await db.query(`
      update public.kg_automation_proposals p
      set review_status = d.review_status,
          metadata = p.metadata || jsonb_build_object('automated_adjudication', d.adjudication),
          reviewer_notes = 'Automated adjudication; no human reviewer asserted.'
      from jsonb_to_recordset($1::jsonb) as d(id uuid, review_status text, adjudication jsonb)
      where p.id = d.id
      returning p.id
    `, [JSON.stringify(decisions)]);
    if (updated.rowCount !== outcomes.length) throw new Error(`bulk_update_count_mismatch:${updated.rowCount}:${outcomes.length}`);
  }
  if (apply) await db.query("commit"); else await db.query("rollback");
  mkdirSync(out, { recursive: true });
  const summary = { runId, applied: apply, total: outcomes.length, promote: outcomes.filter(x=>x.decision==="promote").length, quarantine: outcomes.filter(x=>x.decision==="quarantine").length, reject: outcomes.filter(x=>x.decision==="reject").length, outcomes };
  writeFileSync(path.join(out, "automated-adjudication.json"), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify({ ...summary, outcomes: undefined }, null, 2));
} catch (e) { await db.query("rollback").catch(()=>undefined); throw e; } finally { await db.end(); }
