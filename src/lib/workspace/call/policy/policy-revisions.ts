import { createAdminClient } from "@/lib/supabase/admin";
import { createHash } from "node:crypto";
import type { ProgramCallRule } from "../programcallrules";
import {
  projectLegacyRulesToPolicyDocumentV2,
  type ProgramCallPolicyDocumentV2,
} from "./authoring-document-v2";
import {
  runAcademicYearPolicyParity,
  type AcademicYearParityReport,
} from "./academic-year-parity";
import { materializePolicyDocumentV2 } from "./compile-authoring-v2";

export type ProgramCallPolicyRevision = {
  id: string;
  program_id: string;
  rule_set_id: string;
  revision_number: number;
  schema_version: number;
  status: "draft" | "active" | "superseded" | "rejected";
  document: ProgramCallPolicyDocumentV2;
  legacy_rules_snapshot: ProgramCallRule[];
  compatibility_audit: ProgramCallPolicyDocumentV2["compatibility"];
  parity_status: "passed" | "failed";
  parity_report: AcademicYearParityReport;
  created_by: string;
  created_at: string;
  activated_at: string | null;
  base_rule_set_updated_at: string;
  base_rules_hash: string;
  metadata: Record<string, unknown>;
};

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function hashPolicyRules(rules: ProgramCallRule[]) {
  return createHash("sha256").update(canonicalJson(rules)).digest("hex");
}

export function buildPolicyDocumentFromRules(params: {
  ruleSetId: string;
  ruleSetName: string;
  rules: ProgramCallRule[];
  generatedAt?: string;
}) {
  return projectLegacyRulesToPolicyDocumentV2({
    ruleSetId: params.ruleSetId,
    name: params.ruleSetName,
    generatedAt: params.generatedAt,
    rules: params.rules.map((rule) => ({
      id: rule.id,
      rule_type: rule.rule_type,
      name: rule.name,
      is_enabled: rule.is_enabled,
      is_hard_rule: rule.is_hard_rule,
      priority: rule.priority,
      config: rule.config,
    })),
  });
}

export async function listPolicyRevisions(programId: string, ruleSetId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("program_call_policy_revisions")
    .select("*")
    .eq("program_id", programId)
    .eq("rule_set_id", ruleSetId)
    .order("revision_number", { ascending: false });

  if (error) throw new Error(`Failed to load policy revisions: ${error.message}`);
  return (data ?? []) as ProgramCallPolicyRevision[];
}

export async function createPolicyDraftRevision(params: {
  programId: string;
  ruleSetId: string;
  actorUserId: string;
  document: ProgramCallPolicyDocumentV2;
  legacyRules: ProgramCallRule[];
  baseRuleSetUpdatedAt: string;
  metadata?: Record<string, unknown>;
}) {
  const materialized = materializePolicyDocumentV2(params.document);
  const currentById = new Map(params.legacyRules.map((rule) => [rule.id, rule]));
  const activationRules = materialized.map((rule) => {
    const current = currentById.get(rule.id);
    return {
      ...current,
      id: rule.id,
      program_id: params.programId,
      rule_set_id: params.ruleSetId,
      rule_type: rule.rule_type,
      name: rule.name ?? rule.rule_type,
      is_enabled: rule.is_enabled !== false,
      is_hard_rule: rule.is_hard_rule === true,
      priority: rule.priority ?? 0,
      scope: current?.scope ?? {},
      config: rule.config ?? {},
      created_by: current?.created_by ?? params.actorUserId,
    } as ProgramCallRule;
  });
  const parityReport = runAcademicYearPolicyParity({
    ruleSetId: params.ruleSetId,
    ruleSetName: params.document.name,
    rules: activationRules,
    document: params.document,
  });
  if (!parityReport.passed) {
    throw new Error(
      `Policy draft failed academic-year parity with ${parityReport.differences.length} differences`
    );
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("create_program_call_policy_revision_v2", {
    p_program_id: params.programId,
    p_rule_set_id: params.ruleSetId,
    p_actor_user_id: params.actorUserId,
    p_document: params.document,
    p_legacy_rules_snapshot: activationRules,
    p_compatibility_audit: params.document.compatibility,
    p_parity_report: parityReport,
    p_base_rule_set_updated_at: params.baseRuleSetUpdatedAt,
    p_base_rules_hash: hashPolicyRules(params.legacyRules),
    p_metadata: params.metadata ?? {},
  });

  if (error) throw new Error(`Failed to create policy revision: ${error.message}`);
  return data as ProgramCallPolicyRevision;
}

export async function activatePolicyRevision(params: {
  programId: string;
  ruleSetId: string;
  revisionId: string;
  actorUserId: string;
  previousRuleSetUpdatedAt: string;
}) {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("activate_program_call_policy_revision_v2", {
    p_program_id: params.programId,
    p_rule_set_id: params.ruleSetId,
    p_revision_id: params.revisionId,
    p_actor_user_id: params.actorUserId,
    p_previous_updated_at: params.previousRuleSetUpdatedAt,
  });
  if (error) throw new Error(`Failed to activate policy revision: ${error.message}`);
  return data as { revisionId: string; status: "active"; ruleSetUpdatedAt: string };
}
