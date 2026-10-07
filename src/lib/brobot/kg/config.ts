import type { BroBotChatMode } from "@/lib/brobot/chat/types";
import type { BroBotKgFeatureMode } from "./contracts";

/** Claims RPC often needs 300–1500ms; keep abort→bypass. Parallel with context build. */
export const BROBOT_KG_RETRIEVAL_DEADLINE_MS = Math.min(
  Math.max(Number(process.env.BROBOT_KG_RETRIEVAL_DEADLINE_MS) || 1_200, 50),
  5_000
);

function parseFeatureMode(
  raw: string | undefined,
  fallback: BroBotKgFeatureMode
): BroBotKgFeatureMode {
  const configured = raw?.trim().toLowerCase();
  if (configured === "off" || configured === "shadow" || configured === "enabled") {
    return configured;
  }
  return fallback;
}

/** Master KG retrieval switch. Default shadow — never break chat. */
export function getBroBotKgFeatureMode(): BroBotKgFeatureMode {
  return parseFeatureMode(
    process.env.BROBOT_KNOWLEDGE_V2_MODE ?? process.env.BROBOT_KG_MODE,
    "shadow"
  );
}

/**
 * Whether retrieved claims may enter the answer prompt.
 * Default shadow (dual-run / log only). Never default to enabled.
 */
export function getBroBotClaimsGroundingMode(): BroBotKgFeatureMode {
  return parseFeatureMode(process.env.BROBOT_CLAIMS_GROUNDING_MODE, "shadow");
}

/** Exact claim→Anki card linking. Default off until grounding proves out. */
export function getBroBotClaimAnkiMode(): BroBotKgFeatureMode {
  return parseFeatureMode(process.env.BROBOT_CLAIM_ANKI_MODE, "off");
}

export type BroBotKnowledgeRetrievalVersion = "v2" | "v3";

/** Default v2 (live). v3 RPC is optional and may be absent remotely. */
export function getBroBotKnowledgeRetrievalVersion(): BroBotKnowledgeRetrievalVersion {
  const configured = process.env.BROBOT_KNOWLEDGE_RETRIEVAL_VERSION?.trim().toLowerCase();
  if (configured === "v3") return "v3";
  return "v2";
}

/**
 * Optional mode allowlist for answer influence.
 * Empty / unset = all modes eligible when grounding mode is enabled.
 * Example: BROBOT_CLAIMS_GROUNDING_MODES=consult,or_prep
 */
export function getBroBotClaimsGroundingModeAllowlist(): Set<BroBotChatMode> | null {
  const raw = process.env.BROBOT_CLAIMS_GROUNDING_MODES?.trim();
  if (!raw) return null;
  const modes = raw
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean) as BroBotChatMode[];
  return modes.length ? new Set(modes) : null;
}

export function isBroBotClaimsGroundingAllowedForMode(mode: BroBotChatMode): boolean {
  if (getBroBotClaimsGroundingMode() !== "enabled") return false;
  const allowlist = getBroBotClaimsGroundingModeAllowlist();
  if (!allowlist) return true;
  return allowlist.has(mode);
}
