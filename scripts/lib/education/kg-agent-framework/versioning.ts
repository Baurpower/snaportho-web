/** Knowledge Factory Agent Contract Framework version. */
export const FRAMEWORK_CONTRACT_VERSION = "1.0.0" as const;

/** Ontology plan alignment — CKO spec + relationship registry generation set. */
export const SUPPORTED_ONTOLOGY_VERSION = "2026-07-05" as const;

/** Minimum Ontology Compiler version this framework supports. */
export const MIN_COMPILER_VERSION = "1.0.0" as const;

/** Factory proposal envelope schema version. */
export const PROPOSAL_SCHEMA_VERSION = "1.0.0" as const;

export type AgentVersionInfo = {
  contractVersion: typeof FRAMEWORK_CONTRACT_VERSION;
  ontologyVersion: typeof SUPPORTED_ONTOLOGY_VERSION;
  minCompilerVersion: typeof MIN_COMPILER_VERSION;
  proposalSchemaVersion: typeof PROPOSAL_SCHEMA_VERSION;
};