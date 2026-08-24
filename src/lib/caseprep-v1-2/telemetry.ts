import { createAdminClient } from "@/lib/supabase/admin";
import type { Subject } from "@/lib/brobot/entitlements";

export type CasePrepPacketTelemetry = {
  version: "v1.2" | "v1.3";
  subject: Subject;
  packetId: string | null;
  canonicalSlug: string | null;
  clientSurface: string;
  coverageStatus: string | null;
  qualityGate: string | null;
  groundedPercentage: number | null;
  groundedCount: number;
  generatedCount: number;
  omittedSections: string[];
  latencyMs: number;
};

/** Privacy-minimized packet telemetry: never stores prompts or clinical prose. */
export async function recordCasePrepPacketTelemetry(
  event: CasePrepPacketTelemetry,
): Promise<void> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("caseprep_packet_events").insert({
      user_id: event.subject.type === "user" ? event.subject.id : null,
      guest_id: event.subject.type === "guest" ? event.subject.id : null,
      packet_id: event.packetId,
      caseprep_version: event.version,
      canonical_slug: event.canonicalSlug,
      client_surface: event.clientSurface,
      coverage_status: event.coverageStatus,
      quality_gate: event.qualityGate,
      grounded_percentage: event.groundedPercentage,
      grounded_count: event.groundedCount,
      generated_count: event.generatedCount,
      omitted_sections: event.omittedSections,
      latency_ms: event.latencyMs,
    });
    if (error) console.error(`[CASEPREP-${event.version}] telemetry insert failed`, error);
  } catch (error) {
    console.error(`[CASEPREP-${event.version}] telemetry unavailable`, error);
  }
}
