import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Node's type-stripping runner requires the extension; the app tsconfig intentionally disallows it.
// @ts-expect-error -- required by the direct Node test runner.
import { CasePrepWebV11Schema } from "./schema.ts";

const legacyAskRoute = readFileSync(
  join(process.cwd(), "src/app/api/brobot/ask/route.ts"),
  "utf8"
);
assert.match(legacyAskRoute, /const upstreamUrl = `\$\{baseUrl\}\/case-prep`/);
assert.doesNotMatch(legacyAskRoute, /case-prep\/web\/v1\.1/);

const caseReadinessSource = readFileSync(
  join(process.cwd(), "src/lib/student-curriculum/student-caseprep-context.ts"),
  "utf8"
);
assert.match(caseReadinessSource, /isCasePrepWebV11Enabled\(\)/);
assert.match(caseReadinessSource, /requestCasePrepWebV11/);

// The flag itself must remain centralized and opt-in.
const flagsSource = readFileSync(
  join(process.cwd(), "src/lib/caseprep-v1-1/flags.ts"),
  "utf8"
);
assert.match(flagsSource, /CASEPREP_WEB_V1_1_ENABLED\s*===\s*["']true["']/);
assert.match(flagsSource, /CASEPREP_WEB_V1_1_STREAM_ENABLED\s*===\s*["']true["']/);

const rendererSource = readFileSync(
  join(process.cwd(), "src/components/student-workspace/case-readiness/CasePrepV11Document.tsx"),
  "utf8"
);
assert.match(rendererSource, /High-Yield Questions & Answers/);
assert.match(rendererSource, /Object\.entries\(data\.sections\)/);

const parsed = CasePrepWebV11Schema.parse({
  caseprep_version: "v1.1",
  engine: "web_parallel_rag",
  content_status: "preview",
  case: {
    requested_case: "Open carpal tunnel release",
    canonical_slug: "carpal_tunnel_release",
    canonical_name: "Carpal Tunnel Release",
    diagnosis: "carpal_tunnel_syndrome",
    approach: "open",
    specialty: "hand",
    region: "hand",
    subregion: "carpal_tunnel",
    laterality: null,
    patient_age: null,
    resolver_method: "exact",
    confidence: 1,
    requires_clarification: false,
    clarification_reason: null,
  },
  high_yield_questions: [],
  sections: {
    indications: [],
    anatomy: [],
    approach: [],
    operative_steps: [],
    complications: [],
    postoperative_care: [],
  },
  case_specific_pearls: [],
  sources: [],
  pipeline_status: {},
  timing: { preflight_ms: 4, total_ms: 10 },
  highYieldQuestions: [],
  pimpQuestions: [],
  otherUsefulFacts: [],
  anatomy: null,
  warnings: [],
  retrieval: {
    strategy: "single_embedding_parallel_scoped_queries",
    candidate_count: 0,
    embedding_count: 1,
    embedding_ms: 100,
    pinecone_query_ms: 200,
    branch_count: 3,
    branch_candidate_counts: {},
    failed_branches: [],
    raw_candidate_count: 0,
    selected_count: 0,
  },
});
assert.equal(parsed.caseprep_version, "v1.1");

console.log("CasePrep web v1.1 contract tests passed");
