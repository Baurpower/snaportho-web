"use client";

import { useCallback, useEffect, useState } from "react";
import type { MyCasesCase } from "@/lib/mycases/types";
import type { MyCasesEducationalAsset, MyCasesAssetThumbnailView } from "@/lib/mycases/media/types";
import type { CaseMediaSummaryMap, MyCasesFixtureMediaMap } from "../ui-types";

function fixtureSummaries(fixtures?: MyCasesFixtureMediaMap): CaseMediaSummaryMap {
  if (!fixtures) return {};
  return Object.fromEntries(Object.entries(fixtures).map(([caseId, assets]) => [caseId, {
    count: assets.length,
    thumbnailUrl: assets[0]?.failedThumbnail ? undefined : assets[0]?.view?.thumbnailUrl,
    expiresAt: assets[0]?.view?.expiresAt,
    failed: Boolean(assets[0]?.failedThumbnail),
  }]));
}

export function useCaseMedia(cases: MyCasesCase[], fixtures?: MyCasesFixtureMediaMap) {
  const [media, setMedia] = useState<CaseMediaSummaryMap>(() => fixtureSummaries(fixtures));

  const loadCase = useCallback(async (caseId: string) => {
    if (fixtures) return;
    setMedia((current) => ({ ...current, [caseId]: { ...(current[caseId] ?? { count:0 }), loading:true, failed:false } }));
    try {
      const assetsResponse = await fetch(`/api/mycases/cases/${caseId}/assets`, { cache:"no-store" });
      if (!assetsResponse.ok) throw new Error("asset-list");
      const { assets } = await assetsResponse.json() as { assets:MyCasesEducationalAsset[] };
      if (!assets.length) {
        setMedia((current) => ({ ...current, [caseId]:{ count:0 } }));
        return;
      }
      const viewResponse = await fetch(`/api/mycases/assets/${assets[0].id}/view?thumbnailOnly=true`, { cache:"no-store" });
      if (!viewResponse.ok) throw new Error("thumbnail-view");
      const view = await viewResponse.json() as MyCasesAssetThumbnailView;
      setMedia((current) => ({ ...current, [caseId]:{ count:assets.length, thumbnailUrl:view.thumbnailUrl, expiresAt:view.expiresAt } }));
    } catch {
      setMedia((current) => ({ ...current, [caseId]:{ ...(current[caseId] ?? {count:0}), loading:false, failed:true } }));
    }
  }, [fixtures]);

  useEffect(() => {
    if (fixtures) {
      setMedia(fixtureSummaries(fixtures));
      return;
    }
    for (const item of cases) void loadCase(item.id);
  }, [cases, fixtures, loadCase]);

  return { media, refreshCaseMedia:loadCase };
}
