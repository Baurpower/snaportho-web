/**
 * Knowledge Factory Agent Contract Framework — public API.
 */

export * from "./contract.ts";
export * from "./versioning.ts";
export * from "./confidence.ts";
export * from "./validation.ts";
export * from "./proposal-contract.ts";
export * from "./lifecycle.ts";
export * from "./registry.ts";
export * from "./matching.ts";
export * from "./safety.ts";
export * from "./review-bridge.ts";
export * from "./agent-reports.ts";
export * from "./work-assignment.ts";
export * from "./orchestrator.ts";
export * from "./gap-proposal-matcher.ts";
export { registerDefaultAgents } from "./register-default-agents.ts";

export { RelationshipBuilderAgent } from "./agents/relationship-builder.ts";
export { MetadataBuilderAgent } from "./agents/metadata-builder.ts";
export { ReviewAssistantAgent } from "./agents/review-assistant.ts";
export { PublicationValidatorAgent } from "./agents/publication-validator-agent.ts";
export { DuplicateDetectorAgent } from "./agents/duplicate-detector.ts";
export { ConflictResolverAgent } from "./agents/conflict-resolver.ts";
export { QualityScorerAgent } from "./agents/quality-scorer.ts";