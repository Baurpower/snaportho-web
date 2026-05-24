"use client";

import type {
  OverviewRotationCatalogItem,
  RotationTrackBlockItem,
} from "@/app/work/settings/settingsclient";
import {
  buildAcademicMonths,
  countUnassignedMonths,
  hydrateBlocksToMonths,
} from "@/components/workspace/settings/rotationtrackscheduleutils";

function getRotationLabel(
  rotationId: string,
  rotations: OverviewRotationCatalogItem[]
) {
  const match = rotations.find((rotation) => rotation.id === rotationId);
  return match?.shortName ?? match?.name ?? "Rotation";
}

function getRotationFullLabel(
  rotationId: string,
  rotations: OverviewRotationCatalogItem[]
) {
  const match = rotations.find((rotation) => rotation.id === rotationId);
  return match?.name ?? match?.shortName ?? "Rotation";
}

export default function RotationTrackSchedulePreview({
  academicYearStart,
  blocks,
  rotations,
}: {
  academicYearStart: number;
  blocks: RotationTrackBlockItem[];
  rotations: OverviewRotationCatalogItem[];
}) {
  const months = buildAcademicMonths(academicYearStart);
  const hydrated = hydrateBlocksToMonths(months, blocks);
  const unassignedMonths = countUnassignedMonths(hydrated.drafts);

  return (
    <div className="rounded-[1.6rem] border border-white/10 bg-white/[0.04] p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-200">
            Saved schedule
          </p>
          <p className="mt-2 text-sm text-slate-400">
            July through June schedule summary for this track.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs text-slate-300">
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">
            {blocks.length} saved blocks
          </span>
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">
            {unassignedMonths} unassigned months
          </span>
        </div>
      </div>

      {hydrated.warnings.length ? (
        <div className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
          <p className="font-semibold">Schedule display note</p>
          <div className="mt-2 space-y-1">
            {hydrated.warnings.map((warning) => (
              <p key={warning}>{warning}</p>
            ))}
          </div>
        </div>
      ) : null}

      {blocks.length === 0 ? (
        <div className="mt-5 rounded-[1.4rem] border border-dashed border-white/10 bg-white/[0.03] px-5 py-10 text-center text-sm text-slate-400">
          No saved schedule yet. Use <span className="font-semibold text-slate-200">Edit schedule</span> to build this July–June track.
        </div>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <div className="min-w-[1440px] rounded-[1.5rem] border border-white/10 bg-[#081221]">
            <div className="grid grid-cols-12 border-b border-white/10">
              {months.map((month) => (
                <div
                  key={`${month.key}-header`}
                  className="border-r border-white/10 px-4 py-3 text-center last:border-r-0"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    {month.shortLabel}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500">{month.rangeLabel}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-12">
              {months.map((month) => {
                const draft = hydrated.drafts[month.index];
                const assigned = Boolean(draft?.rotationId);
                const shortLabel = assigned
                  ? getRotationLabel(draft.rotationId, rotations)
                  : "Unassigned";
                const fullLabel = assigned
                  ? getRotationFullLabel(draft.rotationId, rotations)
                  : "Unassigned";

                return (
                  <div
                    key={month.key}
                    title={
                      assigned
                        ? [fullLabel, draft.siteLabel, draft.teamLabel]
                            .filter(Boolean)
                            .join(" • ")
                        : "Unassigned"
                    }
                    className={`flex min-h-[116px] flex-col items-center justify-center border-r border-white/10 px-4 py-4 text-center last:border-r-0 ${
                      assigned ? "bg-transparent" : "bg-white/[0.02]"
                    }`}
                  >
                    <p
                      className={`max-w-full truncate text-sm font-semibold ${
                        assigned ? "text-white" : "text-slate-500"
                      }`}
                    >
                      {shortLabel}
                    </p>
                    {assigned && (draft.siteLabel || draft.teamLabel) ? (
                      <p className="mt-2 max-w-full truncate text-[11px] text-slate-400">
                        {[draft.siteLabel, draft.teamLabel].filter(Boolean).join(" · ")}
                      </p>
                    ) : !assigned ? (
                      <p className="mt-2 text-[11px] text-slate-600">No assignment</p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
