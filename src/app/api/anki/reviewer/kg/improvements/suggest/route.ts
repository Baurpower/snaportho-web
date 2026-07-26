import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { reviewerAuth, body } from "../../../_lib";
import { workspaceLocalIdentitySchema } from "@/lib/education/anki-reviewer";
import { buildImprovementContext } from "../_lib";

const requestSchema = z
  .object({
    contractVersion: z.literal("snaportho-anki-kg-improvement-request.v1"),
    localIdentity: workspaceLocalIdentitySchema,
    idempotencyKey: z.string().uuid(),
    clientVersion: z.string().min(1).max(64),
  })
  .strict();

export async function POST(request: Request) {
  const auth = await reviewerAuth(request, "clinical_editor");
  if ("response" in auth) return auth.response;
  const parsed = await body(request, requestSchema);
  if ("response" in parsed) return parsed.response;
  const input = parsed.data!;
  const context = await buildImprovementContext(
    auth.auth.supabase,
    input.localIdentity,
  );
  if (!context)
    return NextResponse.json({ error: "card unavailable" }, { status: 404 });
  const evidenceHash = createHash("sha256")
    .update(JSON.stringify(context.improvement))
    .digest("hex");
  const { data: existing } = await auth.auth.supabase
    .from("anki_kg_improvement_suggestions")
    .select("id,improvement_id,evidence_hash,graph_diff")
    .eq("reviewer_user_id", auth.ctx.userId)
    .eq("idempotency_key", input.idempotencyKey)
    .maybeSingle();
  if (existing)
    return existing.evidence_hash === evidenceHash
      ? NextResponse.json({
          suggestionId: existing.id,
          improvement: existing.graph_diff,
          idempotentReplay: true,
        })
      : NextResponse.json(
          { error: "idempotency key reused with different evidence" },
          { status: 409 },
        );
  const { data: row, error } = await auth.auth.supabase
    .from("anki_kg_improvement_suggestions")
    .insert({
      reviewer_user_id: auth.ctx.userId,
      device_token_id: auth.ctx.deviceTokenId,
      canonical_card_id: context.canonicalCardId,
      canonical_card_version_id: context.canonicalCardVersionId,
      base_content_hash: context.contentHash,
      note_guid: input.localIdentity.noteGuid,
      card_ordinal: input.localIdentity.cardOrdinal,
      local_content_hash: input.localIdentity.contentHash,
      improvement_id: context.improvement.improvementId,
      graph_diff: context.improvement,
      evidence_hash: evidenceHash,
      algorithm_version: context.improvement.algorithmVersion,
      idempotency_key: input.idempotencyKey,
      client_version: input.clientVersion,
    })
    .select("id")
    .single();
  if (error)
    if (
      error.code === "42P01" ||
      String(error.message ?? "").includes("anki_kg_improvement_suggestions")
    )
      return NextResponse.json(
        {
          error: "database_upgrade_required",
          migration: "20260726_140000_anki_kg_graph_improvements.sql",
        },
        { status: 503 },
      );
  if (error)
    return NextResponse.json(
      { error: "improvement suggestion could not be saved" },
      { status: 500 },
    );
  return NextResponse.json({
    suggestionId: row.id,
    improvement: context.improvement,
    canonicalDataChanged: false,
  });
}
