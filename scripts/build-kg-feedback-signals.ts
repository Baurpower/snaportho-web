import { createHash } from "node:crypto";
import pg from "pg";

import { resolveOperatorDatabaseUrl } from "../src/lib/datastore/connection-url.ts";

type Json = Record<string, any>;

const apply = process.argv.includes("--apply");
const confirmation = "normalize-feedback-signals";

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function fingerprint(value: unknown): string {
  return createHash("sha256").update(stable(value)).digest("hex");
}

function proposedChangeType(feedbackType: string): string {
  if (feedbackType === "missing_entity") return "create_entity";
  if (feedbackType === "missing_relationship") return "create_relationship";
  if (feedbackType === "confusing_terminology") return "add_alias";
  if (feedbackType === "provenance_concern") return "add_provenance";
  if (feedbackType === "inappropriate_curriculum_placement") return "expand_neighborhood";
  if (feedbackType === "outdated_content") return "acquire_source";
  if (["weak_retrieval", "successful_answer", "useful_traversal"].includes(feedbackType)) {
    return "update_metadata";
  }
  return "review_existing_object";
}

function riskTier(feedbackType: string, severity: string): "low" | "moderate" | "high" {
  if (
    ["critical", "high"].includes(severity)
    || ["incorrect_relationship", "unsupported_answer", "outdated_content", "expert_correction"].includes(feedbackType)
  ) return "high";
  if (["incorrect_entity", "missing_relationship", "provenance_concern", "user_correction"].includes(feedbackType)) {
    return "moderate";
  }
  return "low";
}

const client = new pg.Client({
  connectionString: resolveOperatorDatabaseUrl().url,
  ssl: { rejectUnauthorized: false },
});
await client.connect();
try {
  const result = await client.query(`select *
    from kg_graph_feedback_events
    where normalized_signal_status='pending'
    order by created_at,id`);
  const groups = new Map<string, Json[]>();
  for (const event of result.rows) {
    const shape = {
      releaseId: event.release_id,
      feedbackType: event.feedback_type,
      neighborhoodSlugs: [...event.neighborhood_slugs].sort(),
      entityIds: [...event.entity_ids].sort(),
      relationshipIds: [...event.relationship_ids].sort(),
    };
    const key = fingerprint(shape);
    const rows = groups.get(key) ?? [];
    rows.push(event);
    groups.set(key, rows);
  }

  const signals = [...groups.entries()].map(([signalFingerprint, events]) => {
    const first = events[0];
    const severities = events.map((event) => String(event.severity));
    const highestSeverity = ["critical", "high", "moderate", "low"]
      .find((severity) => severities.includes(severity)) ?? "low";
    return {
      signalFingerprint,
      releaseId: first.release_id,
      feedbackType: first.feedback_type,
      riskTier: riskTier(first.feedback_type, highestSeverity),
      feedbackEventIds: events.map((event) => event.id),
      neighborhoodSlugs: [...new Set(events.flatMap((event) => event.neighborhood_slugs))].sort(),
      entityIds: [...new Set(events.flatMap((event) => event.entity_ids))].sort(),
      relationshipIds: [...new Set(events.flatMap((event) => event.relationship_ids))].sort(),
      occurrenceCount: events.length,
      proposedChangeType: proposedChangeType(first.feedback_type),
      proposedPayload: {
        feedbackType: first.feedback_type,
        highestSeverity,
        productSurfaces: [...new Set(events.map((event) => event.product_surface))].sort(),
        responseOrRetrievalIds: events.map((event) => event.response_or_retrieval_id).filter(Boolean),
        requiresDeterministicValidation: true,
        canonicalMutationAuthorized: false,
        nextStage: "proposal_validation",
      },
    };
  });

  if (!apply) {
    console.log(JSON.stringify({
      mode: "dry-run",
      pendingEvents: result.rows.length,
      normalizedSignals: signals.length,
      signals,
      canonicalMutations: 0,
      productionPublicationMutations: 0,
    }, null, 2));
  } else {
    if (process.env.KG_FEEDBACK_SIGNAL_CONFIRM !== confirmation) {
      throw new Error(`Set KG_FEEDBACK_SIGNAL_CONFIRM=${confirmation} to persist normalized feedback signals`);
    }
    await client.query("begin");
    for (const signal of signals) {
      await client.query(`insert into kg_graph_feedback_signals(
        signal_fingerprint,release_id,feedback_type,risk_tier,feedback_event_ids,
        neighborhood_slugs,entity_ids,relationship_ids,occurrence_count,status,
        proposed_change_type,proposed_payload)
        values($1,$2,$3,$4,$5::uuid[],$6::text[],$7::uuid[],$8::uuid[],$9,'proposal_ready',$10,$11::jsonb)
        on conflict(signal_fingerprint) do update set
          feedback_event_ids=excluded.feedback_event_ids,
          occurrence_count=excluded.occurrence_count,
          risk_tier=excluded.risk_tier,
          proposed_payload=excluded.proposed_payload`, [
        signal.signalFingerprint,
        signal.releaseId,
        signal.feedbackType,
        signal.riskTier,
        signal.feedbackEventIds,
        signal.neighborhoodSlugs,
        signal.entityIds,
        signal.relationshipIds,
        signal.occurrenceCount,
        signal.proposedChangeType,
        JSON.stringify(signal.proposedPayload),
      ]);
      await client.query(`update kg_graph_feedback_events
        set normalized_signal_status='normalized'
        where id=any($1::uuid[]) and normalized_signal_status='pending'`, [
        signal.feedbackEventIds,
      ]);
    }
    await client.query("commit");
    console.log(JSON.stringify({
      mode: "apply",
      normalizedSignals: signals.length,
      normalizedEvents: result.rows.length,
      canonicalMutations: 0,
      productionPublicationMutations: 0,
    }, null, 2));
  }
} catch (error) {
  if (apply) {
    try { await client.query("rollback"); } catch {}
  }
  throw error;
} finally {
  await client.end();
}
