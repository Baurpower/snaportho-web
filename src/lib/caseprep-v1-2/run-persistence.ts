import type { CasePrepPacketState } from "../caseprep-v1-1/stream-schema";

export type CasePrepRunOutcome = "complete" | "partial" | "clarification" | "error";
export type CasePrepClientPlatform = "web" | "ios";
export type CasePrepRunVersion = "v1.1" | "v1.2" | "v1.3";

export type CasePrepRunSubject =
  | { type: "user"; id: string }
  | { type: "guest"; id: string };

export type CasePrepPacketSnapshot = {
  packetId: string | null;
  caseIdentity: CasePrepPacketState["caseIdentity"];
  header: CasePrepPacketState["header"];
  sections: CasePrepPacketState["sections"];
  clarification: CasePrepPacketState["clarification"];
  coverage: CasePrepPacketState["coverage"];
  warnings: string[];
  timing: CasePrepPacketState["timing"];
};

export type CasePrepRunRow = {
  user_id: string | null;
  guest_id: string | null;
  client_platform: CasePrepClientPlatform;
  client_surface: string;
  caseprep_version: CasePrepRunVersion;
  packet_id: string | null;
  prompt: string;
  training_level: string | null;
  outcome: CasePrepRunOutcome;
  requested_case: string | null;
  canonical_slug: string | null;
  canonical_name: string | null;
  coverage_status: string | null;
  quality_gate: string | null;
  grounded_percentage: number | null;
  grounded_count: number;
  generated_count: number;
  omitted_sections: string[];
  latency_ms: number | null;
  request_id: string | null;
  error_message: string | null;
  packet: CasePrepPacketSnapshot;
};

export type CasePrepRunInput = {
  subject: CasePrepRunSubject;
  clientHeader: string | null | undefined;
  hasBearerToken: boolean;
  clientSurface: string;
  version: CasePrepRunVersion;
  prompt: string;
  trainingLevel?: string | null;
  requestId?: string | null;
  state: CasePrepPacketState;
  latencyMs: number;
};

export function resolveCasePrepPersistDecision(input: {
  clientHeader: string | null | undefined;
  hasBearerToken: boolean;
}): { persist: boolean; platform: CasePrepClientPlatform | null } {
  const header = input.clientHeader?.trim().toLowerCase() ?? "";
  if (header === "ios") {
    return { persist: false, platform: "ios" };
  }
  if (header === "web") {
    return { persist: true, platform: "web" };
  }
  if (header) {
    return { persist: false, platform: null };
  }
  // Website cookie sessions historically omitted the client header. Bearer
  // requests without a header are treated as native and skipped in this slice.
  if (input.hasBearerToken) {
    return { persist: false, platform: null };
  }
  return { persist: true, platform: "web" };
}

export function casePrepRunOutcomeFromState(
  state: CasePrepPacketState,
): CasePrepRunOutcome {
  if (state.status === "clarification") return "clarification";
  if (state.status === "error") return "error";
  if (state.status === "done") return "complete";
  return "partial";
}

export function compactCasePrepPacket(
  state: CasePrepPacketState,
): CasePrepPacketSnapshot {
  return {
    packetId: state.packetId,
    caseIdentity: state.caseIdentity,
    header: state.header,
    sections: state.sections,
    clarification: state.clarification,
    coverage: state.coverage,
    warnings: state.warnings,
    timing: state.timing,
  };
}

export function buildCasePrepRunRow(
  input: Omit<CasePrepRunInput, "clientHeader" | "hasBearerToken"> & {
    platform: CasePrepClientPlatform;
  },
): CasePrepRunRow {
  const coverage = input.state.coverage;
  const identity = input.state.caseIdentity;
  return {
    user_id: input.subject.type === "user" ? input.subject.id : null,
    guest_id: input.subject.type === "guest" ? input.subject.id : null,
    client_platform: input.platform,
    client_surface: input.clientSurface,
    caseprep_version: input.version,
    packet_id: input.state.packetId,
    prompt: input.prompt.trim(),
    training_level: input.trainingLevel?.trim() || null,
    outcome: casePrepRunOutcomeFromState(input.state),
    requested_case: identity?.requested_case ?? null,
    canonical_slug: identity?.canonical_slug ?? null,
    canonical_name: identity?.canonical_name ?? null,
    coverage_status: coverage?.coverage_status ?? null,
    quality_gate: coverage?.quality_gate ?? null,
    grounded_percentage: coverage?.grounded_percentage ?? null,
    grounded_count: coverage?.grounded_count ?? 0,
    generated_count: coverage?.generated_count ?? 0,
    omitted_sections: coverage?.omitted_sections ?? [],
    latency_ms: Number.isFinite(input.latencyMs) ? Math.max(0, Math.round(input.latencyMs)) : null,
    request_id: input.requestId ?? null,
    error_message: input.state.errorMessage,
    packet: compactCasePrepPacket(input.state),
  };
}

/**
 * Fire-and-forget CasePrep corpus write. Never throws to the caller.
 * iOS and other non-web clients are skipped in this slice.
 */
export async function recordCasePrepRun(input: CasePrepRunInput): Promise<void> {
  const decision = resolveCasePrepPersistDecision({
    clientHeader: input.clientHeader,
    hasBearerToken: input.hasBearerToken,
  });
  if (!decision.persist || !decision.platform) return;

  const prompt = input.prompt.trim();
  if (!prompt) return;

  try {
    const { createAdminClient } = await import("../supabase/admin");
    const row = buildCasePrepRunRow({ ...input, platform: decision.platform });
    const supabase = createAdminClient();
    const { error } = await supabase.from("caseprep_runs").insert(row);
    if (error && error.code !== "23505") {
      console.error(`[CASEPREP-${input.version}] run persist failed`, {
        code: error.code,
        message: error.message,
        outcome: row.outcome,
        packetId: row.packet_id,
      });
    }
  } catch (error) {
    console.error(`[CASEPREP-${input.version}] run persist unavailable`, error);
  }
}
