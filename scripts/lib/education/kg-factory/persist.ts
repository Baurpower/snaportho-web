import type { ProposalRecord } from "../../../kg-automation-common.ts";
import { chunkArray, createServiceRoleClient, isMissingRelationError } from "../../../kg-automation-common.ts";

export type PersistResult = {
  tableAvailable: boolean;
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
};

export async function persistProposals(proposals: ProposalRecord[]): Promise<PersistResult> {
  const result: PersistResult = {
    tableAvailable: false,
    inserted: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  let supabase: ReturnType<typeof createServiceRoleClient>;
  try {
    supabase = createServiceRoleClient();
    const { error } = await supabase.from("kg_automation_proposals").select("id").limit(1);
    if (error) throw error;
    result.tableAvailable = true;
  } catch (error) {
    if (isMissingRelationError(error, "kg_automation_proposals")) {
      result.errors.push("kg_automation_proposals table unavailable — proposals remain in snapshot only");
      return result;
    }
    result.errors.push(error instanceof Error ? error.message : String(error));
    return result;
  }

  for (const batch of chunkArray(proposals, 50)) {
    for (const proposal of batch) {
      const { data: existing, error: selectError } = await supabase
        .from("kg_automation_proposals")
        .select("id, review_status")
        .eq("proposal_fingerprint", proposal.proposal_fingerprint)
        .eq("is_active", true)
        .limit(1);

      if (selectError) {
        result.errors.push(selectError.message);
        continue;
      }

      const row = { ...proposal, updated_at: new Date().toISOString() };

      if ((existing ?? []).length > 0) {
        const id = (existing as { id: string }[])[0].id;
        const { error: updateError } = await supabase
          .from("kg_automation_proposals")
          .update(row)
          .eq("id", id);
        if (updateError) {
          result.errors.push(`${proposal.proposal_fingerprint}: ${updateError.message}`);
        } else {
          result.updated += 1;
        }
      } else {
        const { error: insertError } = await supabase.from("kg_automation_proposals").insert(row);
        if (insertError) {
          result.errors.push(`${proposal.proposal_fingerprint}: ${insertError.message}`);
        } else {
          result.inserted += 1;
        }
      }
    }
  }

  return result;
}

export async function loadPilotProposals(pilotKey: string): Promise<ProposalRecord[]> {
  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("kg_automation_proposals")
      .select("*")
      .eq("is_active", true)
      .contains("metadata", { pilot: pilotKey });

    if (error) throw error;
    return (data ?? []) as ProposalRecord[];
  } catch {
    return [];
  }
}