// Read-only semantic re-fingerprinting for the existing claim corpus.
//
// DEFAULTS TO READ ONLY: offline mode reads committed JSON artifacts and
// writes report files; it never touches the database. The optional --db mode
// opens a READ ONLY transaction and issues SELECTs only.
//
// Outputs (default --out=reports/kg-identity-vnext):
//   claim-semantic-refingerprint.json  full corpus rows + summary
//   legacy-collision-review.md          re-evaluation of known STRUCT groups
//
// Usage:
//   node --experimental-strip-types scripts/report-claim-semantic-identity.ts \
//     [--input=.../proposed-claims.json] [--assignments=.../card-assignments.json] \
//     [--groups=.../claim-duplicate-candidates.json] [--out=reports/kg-identity-vnext] [--db]

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { opposingPolarity } from "../src/lib/education/card-claim-factory.ts";
import {
  SEMANTIC_CLAIM_IDENTITY_VERSION,
  normalizeSemanticClaimText,
  semanticClaimFingerprintHash,
} from "../src/lib/education/contracts/clinical-claim-v1.ts";

const args = new Map(
  process.argv.slice(2).map((value) => {
    const [key, ...rest] = value.split("=");
    return [key, rest.join("=") || "true"] as const;
  }),
);

const ROOT = "/Users/alexbaur/snaportho_dev/snaportho-web";
const DEFAULT_INPUT = `${ROOT}/reports/education/card-claim-factory-2026-09-25/current-published-deck/checkpointed-ac2d7bfa13548ce94d98ab40/proposed-claims.json`;
const DEFAULT_ASSIGNMENTS = `${ROOT}/reports/education/card-claim-factory-2026-09-25/current-published-deck/checkpointed-ac2d7bfa13548ce94d98ab40/card-assignments.json`;
const DEFAULT_GROUPS = `${ROOT}/reports/kg-audit-2026-09-27/claim-duplicate-candidates.json`;

const inputPath = args.get("--input") ?? DEFAULT_INPUT;
const assignmentsPath = args.get("--assignments") ?? DEFAULT_ASSIGNMENTS;
const groupsPath = args.get("--groups") ?? DEFAULT_GROUPS;
const outDir = path.resolve(args.get("--out") ?? `${ROOT}/reports/kg-identity-vnext`);

type CorpusClaim = {
  claimId: string;
  claimText: string;
  claimType: string;
  predicate?: string;
  objectText?: string;
  qualifiers?: Record<string, string>;
  fingerprintHash?: string;
  algorithmVersion?: string;
  primaryEntityId?: string;
  entityTargetType?: string;
};

type Status =
  | "unique"
  | "exact_semantic_candidate"
  | "legacy_collision_resolved"
  | "possible_duplicate"
  | "possible_conflict"
  | "needs_review";

async function loadClaims(): Promise<{ claims: CorpusClaim[]; source: string }> {
  if (args.has("--db")) {
    const { readFileSync: readEnv } = await import("node:fs");
    const envText = readEnv(`${ROOT}/.env.local`, "utf8");
    const line = envText.split("\n").find((l) => l.startsWith("DATABASE_URL="));
    if (!line) throw new Error("DATABASE_URL not found; cannot run --db mode");
    const connectionString = line.replace(/^DATABASE_URL=/, "").replace(/^"|"$/g, "").trim();
    const pg = (await import("pg")).default;
    const client = new pg.Client({ connectionString, statement_timeout: 60000 });
    await client.connect();
    try {
      await client.query("SET default_transaction_read_only = on");
      await client.query("BEGIN TRANSACTION READ ONLY");
      const rows = (
        await client.query(
          `select id, claim_text, claim_type, predicate, object_text, qualifiers,
                  fingerprint_hash, algorithm_version, primary_entity_id
           from public.educational_claims order by created_at asc`,
        )
      ).rows;
      await client.query("ROLLBACK");
      return {
        source: "live-db-read-only",
        claims: rows.map((r) => ({
          claimId: String(r.id),
          claimText: String(r.claim_text ?? ""),
          claimType: String(r.claim_type ?? ""),
          predicate: String(r.predicate ?? ""),
          objectText: String(r.object_text ?? ""),
          qualifiers: (r.qualifiers ?? {}) as Record<string, string>,
          fingerprintHash: String(r.fingerprint_hash ?? ""),
          algorithmVersion: String(r.algorithm_version ?? ""),
          primaryEntityId: String(r.primary_entity_id ?? ""),
        })),
      };
    } finally {
      await client.end();
    }
  }
  const raw = JSON.parse(readFileSync(inputPath, "utf8")) as CorpusClaim[];
  return { source: `offline:${inputPath}`, claims: raw };
}

function loadNoteGuidsByLegacyFp(): Map<string, string[]> {
  try {
    const rows = JSON.parse(readFileSync(assignmentsPath, "utf8")) as Array<{
      fingerprintHash: string | null;
      noteGuid: string;
    }>;
    const map = new Map<string, string[]>();
    for (const row of rows) {
      if (!row.fingerprintHash) continue;
      const list = map.get(row.fingerprintHash) ?? [];
      list.push(row.noteGuid);
      map.set(row.fingerprintHash, list);
    }
    return map;
  } catch {
    return new Map();
  }
}

function loadLegacyGroups(): Map<string, string> {
  // claimId -> groupId for the 23 known STRUCT collision groups.
  const map = new Map<string, string>();
  try {
    const doc = JSON.parse(readFileSync(groupsPath, "utf8")) as {
      clusters: Array<{ clusterId: string; candidates: Array<{ claimId: string }> }>;
    };
    for (const cluster of doc.clusters ?? []) {
      for (const candidate of cluster.candidates ?? []) map.set(candidate.claimId, cluster.clusterId);
    }
  } catch {
    // Offline groups file absent (e.g. --db mode elsewhere): no legacy labels.
  }
  return map;
}

const { claims, source } = await loadClaims();
const noteGuidsByFp = loadNoteGuidsByLegacyFp();
const legacyGroupByClaim = loadLegacyGroups();

type Row = {
  claimId: string;
  legacyFingerprint: string;
  algorithmVersion: string;
  claimText: string;
  normalizedAssertion: string;
  semanticFingerprint: string;
  semanticIdentityVersion: string;
  sharesSemanticFingerprint: boolean;
  candidateCount: number;
  candidateClaimIds: string[];
  legacyCollisionGroup: string | null;
  status: Status;
  statusReasons: string[];
};

const semanticByClaim = new Map(
  claims.map((c) => [
    c.claimId,
    semanticClaimFingerprintHash({
      claimText: c.claimText ?? "",
      claimType: c.claimType ?? "",
      qualifiers: c.qualifiers ?? {},
    }),
  ]),
);
const membersBySemantic = new Map<string, CorpusClaim[]>();
for (const claim of claims) {
  const key = semanticByClaim.get(claim.claimId) ?? "";
  const list = membersBySemantic.get(key) ?? [];
  list.push(claim);
  membersBySemantic.set(key, list);
}

const rows: Row[] = claims.map((claim) => {
  const semantic = semanticByClaim.get(claim.claimId) ?? "";
  const members = membersBySemantic.get(semantic) ?? [claim];
  const normalized = normalizeSemanticClaimText(claim.claimText ?? "");
  const candidateIds = members.map((m) => m.claimId).filter((id) => id !== claim.claimId).sort();
  const legacyGroup = legacyGroupByClaim.get(claim.claimId) ?? null;
  const reasons: string[] = [];
  let status: Status;
  if (normalized.length < 10) {
    status = "needs_review";
    reasons.push("short_normalized_assertion");
  } else if (candidateIds.length === 0) {
    if (legacyGroup) {
      status = "legacy_collision_resolved";
      reasons.push(`legacy_group:${legacyGroup}`);
    } else {
      status = "unique";
    }
  } else {
    const predicates = members.map((m) => m.predicate ?? "");
    const clash = predicates.some((left, i) =>
      predicates.slice(i + 1).some((right) => opposingPolarity(left, right)),
    );
    if (clash) {
      status = "possible_conflict";
      reasons.push("opposing_predicate_polarity");
    } else {
      const guids = new Set(
        members.flatMap((m) => (m.fingerprintHash ? (noteGuidsByFp.get(m.fingerprintHash) ?? []) : [])),
      );
      if (guids.size === 1) {
        status = "possible_duplicate";
        reasons.push("same_note_guid");
      } else {
        status = "exact_semantic_candidate";
        reasons.push(candidateIds.length === 1 ? "one_candidate" : "many_candidates");
      }
    }
    if (legacyGroup) reasons.push(`legacy_group:${legacyGroup}`);
  }
  return {
    claimId: claim.claimId,
    legacyFingerprint: claim.fingerprintHash ?? "",
    algorithmVersion: claim.algorithmVersion ?? "",
    claimText: claim.claimText ?? "",
    normalizedAssertion: normalized,
    semanticFingerprint: semantic,
    semanticIdentityVersion: SEMANTIC_CLAIM_IDENTITY_VERSION,
    sharesSemanticFingerprint: candidateIds.length > 0,
    candidateCount: candidateIds.length,
    candidateClaimIds: candidateIds,
    legacyCollisionGroup: legacyGroup,
    status,
    statusReasons: reasons,
  };
});

const byStatus = new Map<Status, number>();
for (const row of rows) byStatus.set(row.status, (byStatus.get(row.status) ?? 0) + 1);
const dupGroups = [...membersBySemantic.entries()].filter(([, m]) => m.length > 1);

const report = {
  generatedAt: new Date().toISOString(),
  contractVersion: "snaportho-kg-identity-vnext.v1",
  semanticIdentityVersion: SEMANTIC_CLAIM_IDENTITY_VERSION,
  source,
  summary: {
    totalClaims: claims.length,
    uniqueSemanticFingerprints: membersBySemantic.size,
    duplicateCandidateGroups: dupGroups.length,
    statusCounts: Object.fromEntries(byStatus),
  },
  rows,
};

mkdirSync(outDir, { recursive: true });
writeFileSync(`${outDir}/claim-semantic-refingerprint.json`, `${JSON.stringify(report, null, 1)}\n`);

// Legacy collision review markdown.
const groupDoc = (() => {
  try {
    return JSON.parse(readFileSync(groupsPath, "utf8")) as {
      clusters: Array<{
        clusterId: string;
        predicate: string;
        object: string;
        claimType: string;
        candidates: Array<{ claimId: string; claimText: string; fingerprintHash: string }>;
      }>;
    };
  } catch {
    return null;
  }
})();

let review = `# Legacy Collision Review — semantic re-fingerprint\n\nSource: ${source}\nSemantic identity: v1\n\n`;
let split = 0;
let equivalent = 0;
let ambiguous = 0;
if (!groupDoc) {
  review += "No legacy groups file available; nothing to re-evaluate.\n";
} else {
  for (const cluster of groupDoc.clusters) {
    const fps = cluster.candidates.map((c) => {
      const full = claims.find((row) => row.claimId === c.claimId);
      return {
        claimId: c.claimId,
        claimText: c.claimText,
        legacyFingerprint: c.fingerprintHash,
        semantic: semanticByClaim.get(c.claimId) ?? "(claim not in corpus)",
        inCorpus: Boolean(full),
      };
    });
    const distinct = new Set(fps.map((f) => f.semantic)).size;
    let result: string;
    let expert = false;
    if (distinct === fps.length) {
      result = "split_correctly";
      split += 1;
    } else if (distinct === 1) {
      result = "still_equivalent";
      equivalent += 1;
      expert = true;
    } else {
      result = "still_ambiguous";
      ambiguous += 1;
      expert = true;
    }
    review += `## ${cluster.clusterId} — ${result}${expert ? " (requires_expert_review)" : ""}\n\n`;
    review += `Legacy structural key: predicate=${cluster.predicate} object=${cluster.object} type=${cluster.claimType}\n\n`;
    for (const f of fps) {
      review += `- ${f.claimId} legacy=${f.legacyFingerprint.slice(0, 12)}… semantic=${f.semantic.slice(0, 12)}…${f.inCorpus ? "" : " NOT-IN-CORPUS"}\n  ${f.claimText.slice(0, 220)}\n`;
    }
    review += "\n";
  }
  review += `## Totals\n\n- groups: ${groupDoc.clusters.length}\n- split_correctly: ${split}\n- still_equivalent: ${equivalent}\n- still_ambiguous: ${ambiguous}\n`;
}
writeFileSync(`${outDir}/legacy-collision-review.md`, review);

console.log(
  JSON.stringify(
    {
      status: "complete",
      outDir,
      totalClaims: claims.length,
      uniqueSemanticFingerprints: membersBySemantic.size,
      duplicateCandidateGroups: dupGroups.length,
      statusCounts: Object.fromEntries(byStatus),
      legacyGroups: { split_correctly: split, still_equivalent: equivalent, still_ambiguous: ambiguous },
    },
    null,
    2,
  ),
);
