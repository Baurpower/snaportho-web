const commonModulePromise = import(new URL("./kg-automation-common.ts", import.meta.url).href);
const relationshipRegistryPromise = import(
  new URL("./lib/education/kg-relationship-registry.ts", import.meta.url).href
);

type ParsedArgs = {
  dryRun: boolean;
};

type ApprovedProposal = {
  id: string;
  proposal_type: string;
  specialty_id: string | null;
  proposed_entity_type: string | null;
  proposed_entity_label: string | null;
  proposed_existing_entity_id: string | null;
  proposed_subject_entity_id: string | null;
  proposed_predicate: string | null;
  proposed_object_entity_id: string | null;
  proposed_alias: string | null;
  proposed_bridge_type: string | null;
  metadata: Record<string, unknown>;
};

function parseArgs(argv: string[]): ParsedArgs {
  return {
    dryRun: argv.includes("--dry-run"),
  };
}

function normalizeLabel(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

async function main() {
  const { createServiceRoleClient } = await commonModulePromise;
  const { validateRelationshipTriple } = await relationshipRegistryPromise;
  const args = parseArgs(process.argv);
  const supabase = createServiceRoleClient();

  try {
    const { error } = await supabase.from("kg_automation_proposals").select("id").limit(1);
    if (error) {
      throw error;
    }
  } catch {
    console.log(
      JSON.stringify(
        {
          dryRun: args.dryRun,
          proposalTableAvailable: false,
          approvedProposalCount: 0,
          appliedCount: 0,
        },
        null,
        2
      )
    );
    return;
  }

  const { data, error } = await supabase
    .from("kg_automation_proposals")
    .select("*")
    .eq("review_status", "approved")
    .eq("is_active", true)
    .order("confidence", { ascending: false });

  if (error) {
    throw error;
  }

  const proposals = (data ?? []) as ApprovedProposal[];
  let appliedCount = 0;
  const invalidRelationships: Array<{ proposalId: string; errors: string[] }> = [];
  const skippedUnhandled: Array<{ proposalId: string; proposalType: string }> = [];

  // TODO(kg-scale): this applies proposals one at a time with several sequential
  // round-trips each and no surrounding transaction — a mid-batch failure leaves
  // earlier proposals committed. Move each proposal's writes behind a single
  // Postgres RPC so it applies atomically. See
  // docs/kg-automation-scale-hardening-todo.md.
  // Proposal types this generic apply step knows how to write. Anything else
  // (e.g. retarget_card_to_entity / retarget_question_to_entity, handled by the
  // dedicated apply-legacy-retargeting script, and the flag_* review-only types)
  // must be skipped here — NOT silently marked applied.
  const handledTypes = new Set([
    "create_canonical_entity",
    "link_curriculum_node_to_entity",
    "link_concept_to_entity",
    "add_entity_alias",
    "add_canonical_relationship",
    "add_provenance_record",
  ]);

  for (const proposal of proposals) {
    if (!handledTypes.has(proposal.proposal_type)) {
      skippedUnhandled.push({ proposalId: proposal.id, proposalType: proposal.proposal_type });
      continue;
    }
    if (proposal.proposal_type === "create_canonical_entity") {
      if (!proposal.proposed_entity_type || !proposal.proposed_entity_label) {
        continue;
      }

      const existing = await supabase
        .from("canonical_entities")
        .select("id")
        .eq("normalized_label", normalizeLabel(proposal.proposed_entity_label))
        .eq("entity_type", proposal.proposed_entity_type)
        .limit(1);

      if (existing.error) {
        throw existing.error;
      }

      if ((existing.data ?? []).length === 0 && !args.dryRun) {
        const { error: insertError } = await supabase.from("canonical_entities").insert({
          entity_type: proposal.proposed_entity_type,
          preferred_label: proposal.proposed_entity_label,
          normalized_label: normalizeLabel(proposal.proposed_entity_label),
          slug: slugify(proposal.proposed_entity_label),
          status: "reviewed",
          review_status: "approved",
          metadata: {
            created_from_proposal_id: proposal.id,
            automation_metadata: proposal.metadata,
          },
          comments: "Created from approved kg_automation_proposal.",
          is_active: true,
        });

        if (insertError) {
          throw insertError;
        }
      }
    }

    if (proposal.proposal_type === "link_curriculum_node_to_entity") {
      const curriculumNodeId = String(proposal.metadata.curriculum_node_id ?? "");
      if (!curriculumNodeId || !proposal.proposed_existing_entity_id || !proposal.proposed_bridge_type) {
        continue;
      }

      const existing = await supabase
        .from("curriculum_node_entities")
        .select("id")
        .eq("curriculum_node_id", curriculumNodeId)
        .eq("canonical_entity_id", proposal.proposed_existing_entity_id)
        .eq("relation_type", proposal.proposed_bridge_type)
        .eq("is_active", true)
        .limit(1);

      if (existing.error) {
        throw existing.error;
      }

      if ((existing.data ?? []).length === 0 && !args.dryRun) {
        const { error: insertError } = await supabase.from("curriculum_node_entities").insert({
          curriculum_node_id: curriculumNodeId,
          canonical_entity_id: proposal.proposed_existing_entity_id,
          relation_type: proposal.proposed_bridge_type,
          confidence: 1,
          review_status: "approved",
          provenance_status: "reviewed",
          metadata: {
            created_from_proposal_id: proposal.id,
            automation_metadata: proposal.metadata,
          },
          comments: "Created from approved kg_automation_proposal.",
          is_active: true,
        });

        if (insertError) {
          throw insertError;
        }
      }
    }

    if (proposal.proposal_type === "link_concept_to_entity") {
      const conceptId = String(proposal.metadata.concept_id ?? "");
      if (!conceptId || !proposal.proposed_existing_entity_id || !proposal.proposed_bridge_type) {
        continue;
      }

      const existing = await supabase
        .from("concept_canonical_entities")
        .select("id")
        .eq("concept_id", conceptId)
        .eq("canonical_entity_id", proposal.proposed_existing_entity_id)
        .eq("bridge_type", proposal.proposed_bridge_type)
        .eq("is_active", true)
        .limit(1);

      if (existing.error) {
        throw existing.error;
      }

      if ((existing.data ?? []).length === 0 && !args.dryRun) {
        const { error: insertError } = await supabase.from("concept_canonical_entities").insert({
          concept_id: conceptId,
          canonical_entity_id: proposal.proposed_existing_entity_id,
          bridge_type: proposal.proposed_bridge_type,
          confidence: 1,
          review_status: "approved",
          provenance_status: "reviewed",
          created_by: "kg_automation_apply",
          metadata: {
            created_from_proposal_id: proposal.id,
            automation_metadata: proposal.metadata,
          },
          comments: "Created from approved kg_automation_proposal.",
          is_active: true,
        });

        if (insertError) {
          throw insertError;
        }
      }
    }

    if (proposal.proposal_type === "add_entity_alias") {
      const sourceId =
        typeof proposal.metadata.source_id === "string" && proposal.metadata.source_id
          ? proposal.metadata.source_id
          : null;

      if (!sourceId || !proposal.proposed_existing_entity_id || !proposal.proposed_alias) {
        continue;
      }

      const existing = await supabase
        .from("source_aliases")
        .select("id")
        .eq("source_id", sourceId)
        .eq("entity_type", "canonical_entity")
        .eq("entity_id", proposal.proposed_existing_entity_id)
        .eq("alias_value", proposal.proposed_alias)
        .eq("is_active", true)
        .limit(1);

      if (existing.error) {
        throw existing.error;
      }

      if ((existing.data ?? []).length === 0 && !args.dryRun) {
        const { error: insertError } = await supabase.from("source_aliases").insert({
          source_id: sourceId,
          entity_type: "canonical_entity",
          entity_id: proposal.proposed_existing_entity_id,
          alias_kind: "source_label",
          alias_value: proposal.proposed_alias,
          external_id: null,
          metadata: {
            created_from_proposal_id: proposal.id,
            automation_metadata: proposal.metadata,
          },
          comments: "Created from approved kg_automation_proposal.",
          is_active: true,
        });

        if (insertError) {
          throw insertError;
        }
      }
    }

    if (proposal.proposal_type === "add_canonical_relationship") {
      if (
        !proposal.proposed_subject_entity_id ||
        !proposal.proposed_predicate ||
        !proposal.proposed_object_entity_id
      ) {
        continue;
      }

      // Validate the triple against the shared registry before writing. Fetch
      // the real entity_type of both endpoints so entity-type pairing is
      // enforced (not just the predicate vocabulary). An invalid relationship
      // is skipped and left in `approved` status for human follow-up rather
      // than silently marked applied.
      const endpointEntities = await supabase
        .from("canonical_entities")
        .select("id,entity_type")
        .in("id", [proposal.proposed_subject_entity_id, proposal.proposed_object_entity_id]);

      if (endpointEntities.error) {
        throw endpointEntities.error;
      }

      const entityTypeById = new Map<string, string>(
        (endpointEntities.data ?? []).map((row: { id: string; entity_type: string }) => [
          row.id,
          row.entity_type,
        ])
      );

      const subjectEntityType = entityTypeById.get(proposal.proposed_subject_entity_id) ?? null;
      const objectEntityType = entityTypeById.get(proposal.proposed_object_entity_id) ?? null;

      // canonical_relationships endpoints are not FK-enforced; refuse to write an
      // edge that would point at a canonical_entity row that does not exist.
      const missingEndpoints: string[] = [];
      if (!subjectEntityType) {
        missingEndpoints.push(`subject entity ${proposal.proposed_subject_entity_id} not found`);
      }
      if (!objectEntityType) {
        missingEndpoints.push(`object entity ${proposal.proposed_object_entity_id} not found`);
      }

      const validation = validateRelationshipTriple({
        subjectEndpointType: "canonical_entity",
        subjectEntityType,
        predicate: proposal.proposed_predicate,
        objectEndpointType: "canonical_entity",
        objectEntityType,
      });

      if (missingEndpoints.length > 0 || !validation.valid) {
        invalidRelationships.push({
          proposalId: proposal.id,
          errors: [...missingEndpoints, ...validation.errors],
        });
        continue;
      }

      const existing = await supabase
        .from("canonical_relationships")
        .select("id")
        .eq("subject_entity_type", "canonical_entity")
        .eq("subject_entity_id", proposal.proposed_subject_entity_id)
        .eq("predicate", proposal.proposed_predicate)
        .eq("object_entity_type", "canonical_entity")
        .eq("object_entity_id", proposal.proposed_object_entity_id)
        .eq("is_active", true)
        .limit(1);

      if (existing.error) {
        throw existing.error;
      }

      if ((existing.data ?? []).length === 0 && !args.dryRun) {
        const { error: insertError } = await supabase.from("canonical_relationships").insert({
          subject_entity_type: "canonical_entity",
          subject_entity_id: proposal.proposed_subject_entity_id,
          predicate: proposal.proposed_predicate,
          object_entity_type: "canonical_entity",
          object_entity_id: proposal.proposed_object_entity_id,
          confidence: 1,
          review_status: "approved",
          provenance_status: "reviewed",
          lifecycle_status: "active",
          created_by_source: "reviewed",
          metadata: {
            created_from_proposal_id: proposal.id,
            automation_metadata: proposal.metadata,
          },
          comments: "Created from approved kg_automation_proposal.",
          is_active: true,
        });

        if (insertError) {
          throw insertError;
        }
      }
    }

    if (proposal.proposal_type === "add_provenance_record") {
      const subjectEntityType =
        typeof proposal.metadata.subject_entity_type === "string"
          ? proposal.metadata.subject_entity_type
          : null;
      const subjectEntityId =
        typeof proposal.metadata.subject_entity_id === "string" ? proposal.metadata.subject_entity_id : null;
      const sourceArtifactType =
        typeof proposal.metadata.source_artifact_type === "string"
          ? proposal.metadata.source_artifact_type
          : null;
      const sourceName =
        typeof proposal.metadata.source_name === "string" ? proposal.metadata.source_name : null;

      if (!subjectEntityType || !subjectEntityId || !sourceArtifactType || !sourceName) {
        continue;
      }

      if (!args.dryRun) {
        const { error: insertError } = await supabase.from("ontology_provenance_records").insert({
          subject_entity_type: subjectEntityType,
          subject_entity_id: subjectEntityId,
          source_artifact_id:
            typeof proposal.metadata.source_artifact_id === "string"
              ? proposal.metadata.source_artifact_id
              : null,
          source_artifact_type: sourceArtifactType,
          source_name: sourceName,
          source_external_id:
            typeof proposal.metadata.source_external_id === "string"
              ? proposal.metadata.source_external_id
              : null,
          extraction_method:
            typeof proposal.metadata.extraction_method === "string"
              ? proposal.metadata.extraction_method
              : "kg_automation_apply",
          confidence: 1,
          reviewer_status: "approved",
          reviewed_by: null,
          reviewed_at: null,
          notes: "Created from approved kg_automation_proposal.",
          metadata: {
            created_from_proposal_id: proposal.id,
            automation_metadata: proposal.metadata,
          },
          comments: "Created from approved kg_automation_proposal.",
          is_active: true,
        });

        if (insertError) {
          throw insertError;
        }
      }
    }

    if (!args.dryRun) {
      const { error: updateError } = await supabase
        .from("kg_automation_proposals")
        .update({
          review_status: "applied",
          applied_at: new Date().toISOString(),
          metadata: {
            ...proposal.metadata,
            applied_by_script: "apply-approved-kg-automation-proposals",
          },
        })
        .eq("id", proposal.id);

      if (updateError) {
        throw updateError;
      }
    }

    appliedCount += 1;
  }

  console.log(
    JSON.stringify(
      {
        dryRun: args.dryRun,
        proposalTableAvailable: true,
        approvedProposalCount: proposals.length,
        appliedCount,
        invalidRelationshipCount: invalidRelationships.length,
        invalidRelationships,
        skippedUnhandledCount: skippedUnhandled.length,
        skippedUnhandled,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  commonModulePromise
    .then(({ serializeError }) => {
      console.error(JSON.stringify(serializeError(error), null, 2));
      process.exit(1);
    })
    .catch(() => {
      console.error(String(error));
      process.exit(1);
    });
});
