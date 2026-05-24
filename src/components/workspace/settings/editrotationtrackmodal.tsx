"use client";

import { useEffect, useState } from "react";
import { Loader2, Save, X } from "lucide-react";
import type { RotationTrackItem } from "@/app/work/settings/settingsclient";
import SettingsModal from "@/components/workspace/settings/settingsmodal";

type DraftTrack = {
  name: string;
  description: string;
  targetPgyYear: string;
  isActive: boolean;
};

export default function EditRotationTrackModal({
  open,
  track,
  saving,
  onClose,
  onSave,
}: {
  open: boolean;
  track: RotationTrackItem | null;
  saving: boolean;
  onClose: () => void;
  onSave: (payload: {
    name: string;
    description: string | null;
    targetPgyYear: number | null;
    isActive?: boolean;
  }) => Promise<void> | void;
}) {
  const [draft, setDraft] = useState<DraftTrack>({
    name: "",
    description: "",
    targetPgyYear: "",
    isActive: true,
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    setDraft({
      name: track?.name ?? "",
      description: track?.description ?? "",
      targetPgyYear:
        typeof track?.targetPgyYear === "number" ? String(track.targetPgyYear) : "",
      isActive: track?.isActive ?? true,
    });
    setError(null);
  }, [open, track]);

  if (!open) return null;

  async function handleSubmit() {
    if (!draft.name.trim()) {
      setError("Track name is required.");
      return;
    }

    const parsedPgy =
      draft.targetPgyYear.trim() === "" ? null : Number(draft.targetPgyYear);

    if (
      parsedPgy !== null &&
      (!Number.isInteger(parsedPgy) || parsedPgy < 1 || parsedPgy > 5)
    ) {
      setError("Target PGY must be blank or between 1 and 5.");
      return;
    }

    setError(null);
    await onSave({
      name: draft.name.trim(),
      description: draft.description.trim() ? draft.description.trim() : null,
      targetPgyYear: parsedPgy,
      isActive: track ? draft.isActive : undefined,
    });
  }

  return (
    <SettingsModal open={open} onBackdropClick={saving ? undefined : onClose}>
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-[1.8rem] border border-white/10 bg-[#0d1728] shadow-[0_30px_90px_rgba(0,0,0,0.45)]">
        <div className="flex items-start justify-between gap-4 px-5 pt-5 md:px-6 md:pt-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-200">
              {track ? "Edit track" : "New track"}
            </p>
            <h3 className="mt-2 text-2xl font-bold text-white">
              {track ? track.name : "Create rotation track"}
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
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-200">
                Name
              </label>
              <input
                value={draft.name}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="PGY-2 Track A"
                className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-sky-300/30 focus:ring-2 focus:ring-sky-300/15"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-200">
                Description
              </label>
              <textarea
                value={draft.description}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                rows={4}
                placeholder="Optional notes about this track"
                className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-sky-300/30 focus:ring-2 focus:ring-sky-300/15"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">
                  Target PGY
                </label>
                <input
                  value={draft.targetPgyYear}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      targetPgyYear: event.target.value,
                    }))
                  }
                  inputMode="numeric"
                  placeholder="Optional"
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-sky-300/30 focus:ring-2 focus:ring-sky-300/15"
                />
              </div>

              {track ? (
                <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white">
                  <span className="font-medium">Active track</span>
                  <input
                    type="checkbox"
                    checked={draft.isActive}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        isActive: event.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-white/20 bg-white/10 text-sky-300"
                  />
                </label>
              ) : null}
            </div>
          </div>

          {error ? (
            <div className="mt-4 rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
              {error}
            </div>
          ) : null}

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
              onClick={handleSubmit}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {track ? "Save changes" : "Create track"}
            </button>
          </div>
        </div>
      </div>
    </SettingsModal>
  );
}
