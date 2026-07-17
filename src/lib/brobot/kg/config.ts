import type { BroBotKgFeatureMode } from "./contracts";

export const BROBOT_KG_RETRIEVAL_DEADLINE_MS = Math.min(
  Math.max(Number(process.env.BROBOT_KG_RETRIEVAL_DEADLINE_MS) || 275, 50),
  1_000
);

export function getBroBotKgFeatureMode(): BroBotKgFeatureMode {
  const configured = process.env.BROBOT_KG_MODE?.trim().toLowerCase();
  if (configured === "off" || configured === "enabled") return configured;
  return "shadow";
}
