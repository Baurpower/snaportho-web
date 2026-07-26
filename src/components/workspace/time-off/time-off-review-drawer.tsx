"use client";

import React, { useEffect, useState } from "react";
import {
  CheckCircle2,
  Loader2,
  Pencil,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import type {
  ApprovalStatus,
  TimeOffItem,
  TimeOffType,
} from "@/lib/workspace/call/time-off-shared";
import { getTimeOffTypeLabel } from "@/lib/workspace/call/time-off-shared";
import {
  formatDateRange,
  getApprovalTone,
  getDayCount,
  getTimeOffTone,
} from "./time-off-display";

const TYPE_OPTIONS: TimeOffType[] = [
  "vacation",
  "conference",
  "personal",
  "sick",
  "other",
];

const STATUS_OPTIONS: ApprovalStatus[] = [
  "requested",
  "approved",
  "denied",
];

type Props = {
  open: boolean;
  item: TimeOffItem | null;
  canManageProgram: boolean;
  onClose: () => void;
  onUpdated: (item: TimeOffItem) => void;
  onDeleted: (id: string) => void;
};

export default function TimeOffReviewDrawer({
  open,
  item,
  canManageProgram,
  onClose,
  onUpdated,
  onDeleted,
}: Props) {
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [draft, setDraft] = useState<TimeOffItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !item) {
      setMode("view");
      setDraft(null);
      setConfirmDelete(false);
      setError(null);
      return;
    }
    setDraft({ ...item });
    setMode("view");
    setConfirmDelete(false);
    setError(null);
  }, [open, item]);

  if (!open || !item || !draft) return null;

  const tone = getTimeOffTone(draft);
  const approval = getApprovalTone(draft.approvalStatus);
  const canEdit = canManageProgram || draft.isMine;
  const canApprove = canManageProgram;
  const canDelete =
    canManageProgram ||
    (draft.isMine && draft.approvalStatus === "requested");

  function updateDraft<K extends keyof TimeOffItem>(key: K, value: TimeOffItem[K]) {
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function patch(body: Record<string, unknown>) {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/program/time-off/${item!.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          payload?.error ?? `Failed to update (${response.status})`
        );
      }
      const next = {
        ...draft!,
        ...(payload?.item ?? {}),
        residentName: draft!.residentName,
        trainingLevel: draft!.trainingLevel,
        classYear: draft!.classYear,
        userId: draft!.userId,
      } as TimeOffItem;
      setDraft(next);
      onUpdated(next);
      setMode("view");
      return next;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
      throw err;
    } finally {
      setSaving(false);
    }
  }

  async function handleApprove() {
    await patch({ approvalStatus: "approved" });
  }

  async function handleDeny() {
    await patch({ approvalStatus: "denied" });
  }

  async function handleSaveEdit() {
    if (!draft) return;
    await patch({
      eventType: draft.type,
      usingPto: draft.usingPto,
      startDate: draft.startDate,
      endDate: draft.endDate,
      title: draft.title,
      notes: draft.notes,
      location: draft.location,
      ...(canManageProgram
        ? { approvalStatus: draft.approvalStatus ?? "requested" }
        : {}),
    });
  }

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      const response = await fetch(`/api/program/time-off/${item!.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          payload?.error ?? `Failed to delete (${response.status})`
        );
      }
      onDeleted(item!.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40">
      <button
        type="button"
        className="h-full flex-1 cursor-default"
        aria-label="Close review panel"
        onClick={onClose}
      />
      <aside className="flex h-full w-full max-w-lg flex-col border-l border-slate-200 bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Review time-off
            </p>
            <h2 className="mt-1 truncate text-xl font-bold text-slate-950">
              {draft.residentName}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {formatDateRange(draft.startDate, draft.endDate)} ·{" "}
              {getDayCount(draft.startDate, draft.endDate)} day
              {getDayCount(draft.startDate, draft.endDate) === 1 ? "" : "s"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${tone.badge}`}
            >
              {tone.label}
            </span>
            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${approval.className}`}
            >
              {approval.label}
            </span>
            {draft.usingPto ? (
              <span className="rounded-full bg-sky-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-sky-700">
                Uses PTO
              </span>
            ) : null}
          </div>

          {mode === "view" ? (
            <div className="space-y-3">
              <Field label="Title" value={draft.title ?? "—"} />
              <Field
                label="Type"
                value={getTimeOffTypeLabel(draft.type)}
              />
              <Field
                label="Dates"
                value={formatDateRange(draft.startDate, draft.endDate)}
              />
              <Field
                label="Location"
                value={draft.location ?? "—"}
              />
              <Field label="Notes" value={draft.notes ?? "—"} />
              {draft.trainingLevel || draft.classYear ? (
                <Field
                  label="Training"
                  value={[
                    draft.trainingLevel,
                    draft.classYear ? `Class ${draft.classYear}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                />
              ) : null}
            </div>
          ) : (
            <div className="space-y-3">
              <label className="block text-sm">
                <span className="font-semibold text-slate-700">Title</span>
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                  value={draft.title ?? ""}
                  onChange={(e) => updateDraft("title", e.target.value || null)}
                />
              </label>
              <label className="block text-sm">
                <span className="font-semibold text-slate-700">Type</span>
                <select
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                  value={draft.type}
                  onChange={(e) =>
                    updateDraft("type", e.target.value as TimeOffType)
                  }
                >
                  {TYPE_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {getTimeOffTypeLabel(t)}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm">
                  <span className="font-semibold text-slate-700">Start</span>
                  <input
                    type="date"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                    value={draft.startDate ?? ""}
                    onChange={(e) => updateDraft("startDate", e.target.value)}
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-semibold text-slate-700">End</span>
                  <input
                    type="date"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                    value={draft.endDate ?? ""}
                    onChange={(e) => updateDraft("endDate", e.target.value)}
                  />
                </label>
              </div>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={draft.usingPto}
                  onChange={(e) => updateDraft("usingPto", e.target.checked)}
                />
                Uses PTO
              </label>
              {canManageProgram ? (
                <label className="block text-sm">
                  <span className="font-semibold text-slate-700">Status</span>
                  <select
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                    value={draft.approvalStatus ?? "requested"}
                    onChange={(e) =>
                      updateDraft(
                        "approvalStatus",
                        e.target.value as ApprovalStatus
                      )
                    }
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <label className="block text-sm">
                <span className="font-semibold text-slate-700">Location</span>
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                  value={draft.location ?? ""}
                  onChange={(e) =>
                    updateDraft("location", e.target.value || null)
                  }
                />
              </label>
              <label className="block text-sm">
                <span className="font-semibold text-slate-700">Notes</span>
                <textarea
                  className="mt-1 min-h-[88px] w-full rounded-xl border border-slate-200 px-3 py-2"
                  value={draft.notes ?? ""}
                  onChange={(e) => updateDraft("notes", e.target.value || null)}
                />
              </label>
            </div>
          )}

          {confirmDelete ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
              <p className="font-semibold">Delete this time-off event?</p>
              <p className="mt-1">
                {draft.residentName}: {draft.title ?? tone.label} (
                {formatDateRange(draft.startDate, draft.endDate)})
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  disabled={deleting}
                  onClick={handleDelete}
                  className="inline-flex items-center gap-2 rounded-full bg-rose-600 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white"
                >
                  {deleting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                  Confirm delete
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="rounded-full border border-rose-200 bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-rose-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <footer className="space-y-2 border-t border-slate-100 px-5 py-4">
          {mode === "view" ? (
            <>
              {canApprove ? (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={saving || draft.approvalStatus === "approved"}
                    onClick={() => void handleApprove()}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={saving || draft.approvalStatus === "denied"}
                    onClick={() => void handleDeny()}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    <XCircle className="h-4 w-4" />
                    Deny
                  </button>
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2">
                {canEdit ? (
                  <button
                    type="button"
                    onClick={() => setMode("edit")}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800"
                  >
                    <Pencil className="h-4 w-4" />
                    Edit
                  </button>
                ) : null}
                {canDelete ? (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-800"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                ) : null}
              </div>
            </>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleSaveEdit()}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                Save changes
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  setDraft({ ...item });
                  setMode("view");
                  setError(null);
                }}
                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800"
              >
                Cancel
              </button>
            </div>
          )}
        </footer>
      </aside>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 whitespace-pre-wrap text-sm font-medium text-slate-900">
        {value}
      </p>
    </div>
  );
}
