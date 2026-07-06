import { ankiSignalCollector } from "./anki-signal-collector.ts";
import { canonicalSnapshotCollector } from "./canonical-snapshot-collector.ts";
import { caseprepLinkCollector } from "./caseprep-link-collector.ts";
import { curriculumNodeCollector } from "./curriculum-node-collector.ts";
import { orthobulletsMetadataCollector } from "./orthobullets-metadata-collector.ts";
import { proposalHistoryCollector } from "./proposal-history-collector.ts";
import { qualitySignalCollector } from "./quality-signal-collector.ts";
import { reviewHistoryCollector } from "./review-history-collector.ts";
import { staticPrepareCollector } from "./static-prepare-collector.ts";
import type { EvidenceCollector } from "./types.ts";

export const DEFAULT_COLLECTORS: EvidenceCollector[] = [
  staticPrepareCollector,
  curriculumNodeCollector,
  ankiSignalCollector,
  orthobulletsMetadataCollector,
  caseprepLinkCollector,
  canonicalSnapshotCollector,
  proposalHistoryCollector,
  reviewHistoryCollector,
  qualitySignalCollector,
];

export {
  staticPrepareCollector,
  curriculumNodeCollector,
  ankiSignalCollector,
  orthobulletsMetadataCollector,
  caseprepLinkCollector,
  canonicalSnapshotCollector,
  proposalHistoryCollector,
  reviewHistoryCollector,
  qualitySignalCollector,
};