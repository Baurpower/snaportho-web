"use client";

import { Loader2, Sparkles, X } from "lucide-react";
import type { GenerateAssignmentsMode } from "@/app/work/settings/settingsclient";
import SettingsModal from "@/components/workspace/settings/settingsmodal";

export default function GenerateAssignmentsModal({
  open,
  academicYearLabel,
  trackCount,
  assignedPeopleCount,
  mode,
  saving,
  onModeChange,
  onClose,
  onGenerate,
}: {
  open: boolean;
  academicYearLabel: string;
  trackCount: number;
  assignedPeopleCount: number;
  mode: GenerateAssignmentsMode;
  saving: boolean;
  onModeChange: (mode: GenerateAssignmentsMode) => void;
  onClose: () => void;
  onGenerate: () => Promise<void> | void;
}) {
  if (!open) return null;

  return (
    <SettingsModal open={open} onBackdropClick={saving ? undefined : onClose}>
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-[1.8rem] border border-white/10 bg-[#0d1728] shadow-[0_30px_90px_rgba(0,0,0,0.45)]">
        <div className="flex items-start justify-between gap-4 px-5 pt-5 md:px-6 md:pt-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-200">
              Generate assignments
            </p>
            <h3 className="mt-2 text-2xl font-bold text-white">
              Build live rotation assignments
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-slate-300 transition hover:bg-white/[0.08] disabled:opacity-60"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 pb-5 pt-5 md:px-6 md:pb-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Academic year
              </p>
              <p className="mt-1 text-sm font-bold text-white">{academicYearLabel}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Tracks
              </p>
              <p className="mt-1 text-sm font-bold text-white">{trackCount}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Assigned people
              </p>
              <p className="mt-1 text-sm font-bold text-white">{assignedPeopleCount}</p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4">
              <input
                type="radio"
                name="generate-mode"
                checked={mode === "overwrite_generated"}
                onChange={() => onModeChange("overwrite_generated")}
                className="mt-1 h-4 w-4 border-white/20 bg-white/10 text-sky-300"
              />
              <div>
                <p className="font-semibold text-white">Overwrite generated assignments</p>
                <p className="mt-1 text-sm text-slate-400">
                  Manual assignments will be preserved. Previously generated assignments in this academic year may be replaced.
                </p>
              </div>
            </label>

            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4">
              <input
                type="radio"
                name="generate-mode"
                checked={mode === "fill_gaps"}
                onChange={() => onModeChange("fill_gaps")}
                className="mt-1 h-4 w-4 border-white/20 bg-white/10 text-sky-300"
              />
              <div>
                <p className="font-semibold text-white">Fill gaps only</p>
                <p className="mt-1 text-sm text-slate-400">
                  Only create assignments where no overlapping assignment already exists for the same roster member.
                </p>
              </div>
            </label>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/[0.08] disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onGenerate}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Generate assignments
            </button>
          </div>
        </div>
      </div>
    </SettingsModal>
  );
}
