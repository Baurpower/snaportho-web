"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarRange,
  CheckSquare,
  CircleX,
  ChevronDown,
  ChevronUp,
  Loader2,
  Save,
  Wand2,
} from "lucide-react";
import type {
  OverviewRotationCatalogItem,
  RotationTrackBlockItem,
} from "@/app/work/settings/settingsclient";
import {
  buildAcademicMonths,
  convertMonthsToBlocks,
  countUnassignedMonths,
  hydrateBlocksToMonths,
  normalizeRotationId,
  type BlockPayload,
  type MonthDraft,
} from "@/components/workspace/settings/rotationtrackscheduleutils";

export default function RotationTrackGridEditor({
  academicYearStart,
  blocks,
  rotations,
  canManage,
  saving,
  onCancel,
  onSave,
}: {
  academicYearStart: number;
  blocks: RotationTrackBlockItem[];
  rotations: OverviewRotationCatalogItem[];
  canManage: boolean;
  saving: boolean;
  onCancel?: () => void;
  onSave: (blocks: BlockPayload[]) => Promise<void> | void;
}) {
  const months = useMemo(
    () => buildAcademicMonths(academicYearStart),
    [academicYearStart]
  );

  const [monthDrafts, setMonthDrafts] = useState<MonthDraft[]>([]);
  const [selectedMonthKeys, setSelectedMonthKeys] = useState<string[]>([]);
  const [expandedMonthKeys, setExpandedMonthKeys] = useState<string[]>([]);
  const [batchRotationId, setBatchRotationId] = useState("");
  const [batchSiteLabel, setBatchSiteLabel] = useState("");
  const [batchTeamLabel, setBatchTeamLabel] = useState("");
  const [batchNotes, setBatchNotes] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const hydrated = hydrateBlocksToMonths(months, blocks);
    setMonthDrafts(hydrated.drafts);
    setWarnings(hydrated.warnings);
    setSelectedMonthKeys([]);
    setExpandedMonthKeys([]);
    setBatchRotationId("");
    setBatchSiteLabel("");
    setBatchTeamLabel("");
    setBatchNotes("");
    setError(null);
  }, [blocks, months]);

  const rotationOptions = useMemo(
    () =>
      [...rotations].sort((a, b) => {
        const aOrder = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
        const bOrder = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
        if (aOrder !== bOrder) return aOrder - bOrder;
        return (a.shortName ?? a.name ?? "").localeCompare(b.shortName ?? b.name ?? "");
      }),
    [rotations]
  );

  const unassignedMonths = useMemo(
    () => countUnassignedMonths(monthDrafts),
    [monthDrafts]
  );

  const selectedMonthSet = useMemo(
    () => new Set(selectedMonthKeys),
    [selectedMonthKeys]
  );

  function updateMonthDraft(
    monthKey: string,
    updates: Partial<MonthDraft>
  ) {
    setMonthDrafts((current) =>
      current.map((draft) =>
        draft.monthKey === monthKey ? { ...draft, ...updates } : draft
      )
    );
  }

  function toggleMonthSelection(monthKey: string) {
    setSelectedMonthKeys((current) =>
      current.includes(monthKey)
        ? current.filter((key) => key !== monthKey)
        : [...current, monthKey]
    );
  }

  function toggleMonthExpanded(monthKey: string) {
    setExpandedMonthKeys((current) =>
      current.includes(monthKey)
        ? current.filter((key) => key !== monthKey)
        : [...current, monthKey]
    );
  }

  function applyToSelectedMonths() {
    if (!selectedMonthKeys.length) {
      setError("Choose at least one month before applying a rotation.");
      return;
    }

    if (!normalizeRotationId(batchRotationId)) {
      setError("Choose a rotation to apply to the selected months.");
      return;
    }

    setError(null);
    setMonthDrafts((current) =>
      current.map((draft) =>
        selectedMonthSet.has(draft.monthKey)
          ? {
              ...draft,
              rotationId: normalizeRotationId(batchRotationId),
              siteLabel: batchSiteLabel,
              teamLabel: batchTeamLabel,
              notes: batchNotes,
            }
          : draft
      )
    );
  }

  async function handleSave() {
    setError(null);
    await onSave(convertMonthsToBlocks(months, monthDrafts));
  }

  return (
    <div className="rounded-[1.6rem] border border-white/10 bg-white/[0.04] p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sky-200">
            <CalendarRange className="h-4 w-4" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em]">
              Track blocks
            </p>
          </div>
          <p className="mt-2 text-sm text-slate-400">
            Assign rotations by month, then save this track template.
          </p>
        </div>

        {canManage ? (
          <div className="flex flex-wrap gap-3">
            {onCancel ? (
              <button
                type="button"
                onClick={onCancel}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/[0.08] disabled:opacity-60"
              >
                <CircleX className="h-4 w-4" />
                Cancel
              </button>
            ) : null}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save schedule
            </button>
          </div>
        ) : null}
      </div>

      {!canManage ? (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-400">
          You have read-only access to track blocks.
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Academic year
          </p>
          <p className="mt-1 text-sm font-bold text-white">
            {academicYearStart}–{academicYearStart + 1}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Unassigned months
          </p>
          <p className="mt-1 text-sm font-bold text-white">{unassignedMonths}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Saved blocks preview
          </p>
          <p className="mt-1 text-sm font-bold text-white">
            {convertMonthsToBlocks(months, monthDrafts).length}
          </p>
        </div>
      </div>

      {warnings.length ? (
        <div className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
          <p className="font-semibold">Saved blocks were normalized into full months.</p>
          <div className="mt-2 space-y-1">
            {warnings.map((warning) => (
              <p key={warning}>{warning}</p>
            ))}
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      {canManage ? (
        <div className="mt-5 rounded-[1.4rem] border border-white/10 bg-[#081221] p-4">
          <div className="flex items-center gap-2 text-sky-200">
            <Wand2 className="h-4 w-4" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em]">
              Apply to selected months
            </p>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-200">
                Rotation
              </label>
              <select
                value={batchRotationId}
                onChange={(event) => setBatchRotationId(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none transition focus:border-sky-300/30 focus:ring-2 focus:ring-sky-300/15"
              >
                <option value="">Select rotation</option>
                {rotationOptions.map((rotation) => (
                  <option
                    key={rotation.id}
                    value={rotation.id}
                    className="text-slate-950"
                  >
                    {rotation.shortName ?? rotation.name ?? "Rotation"}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-200">
                Site
              </label>
              <input
                value={batchSiteLabel}
                onChange={(event) => setBatchSiteLabel(event.target.value)}
                placeholder="Optional"
                className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-sky-300/30 focus:ring-2 focus:ring-sky-300/15"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-200">
                Team
              </label>
              <input
                value={batchTeamLabel}
                onChange={(event) => setBatchTeamLabel(event.target.value)}
                placeholder="Optional"
                className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-sky-300/30 focus:ring-2 focus:ring-sky-300/15"
              />
            </div>
          </div>

          <div className="mt-3">
            <label className="mb-2 block text-sm font-medium text-slate-200">
              Notes
            </label>
            <textarea
              value={batchNotes}
              onChange={(event) => setBatchNotes(event.target.value)}
              rows={2}
              placeholder="Optional notes for selected months"
              className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-sky-300/30 focus:ring-2 focus:ring-sky-300/15"
            />
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-400">
              {selectedMonthKeys.length} month{selectedMonthKeys.length === 1 ? "" : "s"} selected
            </p>
            <button
              type="button"
              onClick={applyToSelectedMonths}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
            >
              <CheckSquare className="h-4 w-4" />
              Apply to selected months
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-5 space-y-3">
        {monthDrafts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-5 py-8 text-center text-sm text-slate-400">
            Assign rotations by month, then save this track template.
          </div>
        ) : (
          months.map((month) => {
            const draft = monthDrafts[month.index];
            const expanded = expandedMonthKeys.includes(month.key);
            const selected = selectedMonthSet.has(month.key);

            return (
              <div
                key={month.key}
                className={`rounded-[1.4rem] border p-4 transition ${
                  selected
                    ? "border-sky-300/25 bg-sky-400/10"
                    : "border-white/10 bg-[#081221]"
                }`}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      {canManage ? (
                        <label className="inline-flex items-center gap-2 text-sm text-slate-300">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleMonthSelection(month.key)}
                            className="h-4 w-4 rounded border-white/20 bg-white/10 text-sky-300"
                          />
                          Select
                        </label>
                      ) : null}

                      <div>
                        <p className="text-sm font-semibold text-white">{month.monthLabel}</p>
                        <p className="text-xs text-slate-400">{month.rangeLabel}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex w-full flex-col gap-3 lg:max-w-[520px]">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-200">
                        Rotation
                      </label>
                      <select
                        value={draft?.rotationId ?? ""}
                        onChange={(event) =>
                          updateMonthDraft(month.key, {
                            rotationId: normalizeRotationId(event.target.value),
                          })
                        }
                        disabled={!canManage}
                        className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none transition focus:border-sky-300/30 focus:ring-2 focus:ring-sky-300/15 disabled:opacity-60"
                      >
                        <option value="">Unassigned</option>
                        {rotationOptions.map((rotation) => (
                          <option
                            key={rotation.id}
                            value={rotation.id}
                            className="text-slate-950"
                          >
                            {rotation.shortName ?? rotation.name ?? "Rotation"}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs text-slate-400">
                        {draft?.rotationId ? "Assigned for this full month." : "No rotation assigned yet."}
                      </p>
                      <button
                        type="button"
                        onClick={() => toggleMonthExpanded(month.key)}
                        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-200 transition hover:bg-white/[0.08]"
                      >
                        Optional details
                        {expanded ? (
                          <ChevronUp className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {expanded ? (
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-200">
                        Site
                      </label>
                      <input
                        value={draft?.siteLabel ?? ""}
                        onChange={(event) =>
                          updateMonthDraft(month.key, { siteLabel: event.target.value })
                        }
                        disabled={!canManage}
                        placeholder="Optional"
                        className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-sky-300/30 focus:ring-2 focus:ring-sky-300/15 disabled:opacity-60"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-200">
                        Team
                      </label>
                      <input
                        value={draft?.teamLabel ?? ""}
                        onChange={(event) =>
                          updateMonthDraft(month.key, { teamLabel: event.target.value })
                        }
                        disabled={!canManage}
                        placeholder="Optional"
                        className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-sky-300/30 focus:ring-2 focus:ring-sky-300/15 disabled:opacity-60"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="mb-2 block text-sm font-medium text-slate-200">
                        Notes
                      </label>
                      <textarea
                        value={draft?.notes ?? ""}
                        onChange={(event) =>
                          updateMonthDraft(month.key, { notes: event.target.value })
                        }
                        disabled={!canManage}
                        rows={3}
                        placeholder="Optional notes"
                        className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-sky-300/30 focus:ring-2 focus:ring-sky-300/15 disabled:opacity-60"
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
