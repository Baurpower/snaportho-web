"use client";

import { useEffect, useState } from "react";
import { ArrowRightLeft, Loader2, X } from "lucide-react";
import SettingsModal from "@/components/workspace/settings/settingsmodal";

export default function CopyTracksYearModal({
  open,
  academicYearStart,
  saving,
  onClose,
  onSubmit,
}: {
  open: boolean;
  academicYearStart: number;
  saving: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    fromAcademicYearStart: number;
    toAcademicYearStart: number;
    copyMemberships: boolean;
  }) => Promise<void> | void;
}) {
  const [fromAcademicYearStart, setFromAcademicYearStart] = useState(academicYearStart - 1);
  const [copyMemberships, setCopyMemberships] = useState(true);

  useEffect(() => {
    if (!open) return;
    setFromAcademicYearStart(academicYearStart - 1);
    setCopyMemberships(true);
  }, [academicYearStart, open]);

  if (!open) return null;

  return (
    <SettingsModal open={open} onBackdropClick={saving ? undefined : onClose}>
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-[1.8rem] border border-white/10 bg-[#0d1728] shadow-[0_30px_90px_rgba(0,0,0,0.45)]">
        <div className="flex items-start justify-between gap-4 px-5 pt-5 md:px-6 md:pt-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-200">
              Copy previous year
            </p>
            <h3 className="mt-2 text-2xl font-bold text-white">
              Import rotation tracks
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
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">
                  From academic year
                </label>
                <input
                  type="number"
                  value={fromAcademicYearStart}
                  onChange={(event) => setFromAcademicYearStart(Number(event.target.value))}
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none transition focus:border-sky-300/30 focus:ring-2 focus:ring-sky-300/15"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">
                  To academic year
                </label>
                <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white">
                  {academicYearStart}
                </div>
              </div>
            </div>

            <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white">
              <span className="font-medium">Copy existing memberships too</span>
              <input
                type="checkbox"
                checked={copyMemberships}
                onChange={(event) => setCopyMemberships(event.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-white/10 text-sky-300"
              />
            </label>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-400">
              Tracks and blocks are copied as-is. Memberships are only copied for roster rows that still belong to the same program.
            </div>
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
              onClick={() =>
                onSubmit({
                  fromAcademicYearStart,
                  toAcademicYearStart: academicYearStart,
                  copyMemberships,
                })
              }
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRightLeft className="h-4 w-4" />
              )}
              Copy tracks
            </button>
          </div>
        </div>
      </div>
    </SettingsModal>
  );
}
