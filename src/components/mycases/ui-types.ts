import type { MyCasesEducationalAsset, MyCasesAssetView } from "@/lib/mycases/media/types";

export type MyCasesSection = "overview" | "cases" | "knowledge" | "collections" | "search";
export type CasesViewMode = "grid" | "list";

export type CaseMediaSummary = {
  count: number;
  thumbnailUrl?: string;
  expiresAt?: string;
  loading?: boolean;
  failed?: boolean;
};

export type CaseMediaSummaryMap = Record<string, CaseMediaSummary>;

export type MyCasesFixtureAsset = MyCasesEducationalAsset & {
  view?: MyCasesAssetView;
  failedThumbnail?: boolean;
};

export type MyCasesFixtureMediaMap = Record<string, MyCasesFixtureAsset[]>;
