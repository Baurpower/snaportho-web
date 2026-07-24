"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronUp,
  MapPin,
  Pencil,
  Plane,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import {
  MOBILE_INPUT_CLASS,
  MobileField,
} from "@/components/student-workspace/mobile/profile/MobileProfileSettings";
import { formatDateOnly } from "@/lib/student-workspace/date";
import { sortRotations } from "@/lib/student-workspace/progress";
import type {
  StudentWorkspaceRotation,
  StudentWorkspaceRotationFormValues,
} from "@/lib/student-workspace/types";

const EMPTY_FORM_VALUES: StudentWorkspaceRotationFormValues = {
  title: "",
  institution: "",
  service: "",
  location: "",
  start_date: "",
  end_date: "",
  notes: "",
  is_away_rotation: false,
};

/**
 * Phone version of the rotation manager.
 *
 * The desktop card shows a four-cell detail grid plus Edit/Delete for every
 * rotation, which on a phone means scrolling a full screen per block. Here each
 * rotation is a compact row that expands on tap, and the add/edit form is a
 * full-screen sheet so date pickers are not squeezed under the keyboard.
 */
export function MobileRotationList({
  initialRotations,
  today,
}: {
  initialRotations: StudentWorkspaceRotation[];
  today: string;
}) {
  const router = useRouter();
  const [rotations, setRotations] = useState(() =>
    sortRotations(initialRotations)
  );
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingRotationId, setEditingRotationId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const editingRotation = useMemo(
    () => rotations.find((rotation) => rotation.id === editingRotationId) ?? null,
    [editingRotationId, rotations]
  );

  async function saveRotation(values: StudentWorkspaceRotationFormValues) {
    setSaving(true);
    setError(null);

    try {
      const isEditing = !!editingRotation;
      const response = await fetch(
        isEditing
          ? `/api/student-workspace/rotations/${editingRotation.id}`
          : "/api/student-workspace/rotations",
        {
          method: isEditing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        }
      );
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error ?? "Unable to save rotation.");
      }

      setRotations((current) =>
        sortRotations(
          isEditing
            ? current.map((rotation) =>
                rotation.id === payload.rotation.id ? payload.rotation : rotation
              )
            : [...current, payload.rotation]
        )
      );
      setSheetOpen(false);
      setEditingRotationId(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save rotation.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteRotation(rotation: StudentWorkspaceRotation) {
    setBusy(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/student-workspace/rotations/${rotation.id}`,
        { method: "DELETE" }
      );
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error ?? "Unable to delete rotation.");
      }

      setRotations(sortRotations(payload.rotations ?? []));
      if (expandedId === rotation.id) setExpandedId(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete rotation.");
    } finally {
      setBusy(false);
    }
  }

  async function moveRotation(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= rotations.length) return;

    const next = [...rotations];
    const [moved] = next.splice(index, 1);
    next.splice(nextIndex, 0, moved);

    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/student-workspace/rotations/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rotation_ids: next.map((item) => item.id) }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error ?? "Unable to reorder rotations.");
      }

      setRotations(sortRotations(payload.rotations ?? []));
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to reorder rotations."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Rotations
          </p>
          <h2 className="mt-0.5 text-[17px] font-bold leading-tight tracking-tight text-slate-950">
            Your fourth-year map
          </h2>
        </div>
        <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[12px] font-bold text-slate-600">
          {rotations.length}
        </span>
      </div>

      {error ? (
        <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-[13px] text-rose-700">
          {error}
        </p>
      ) : null}

      <div className="mt-3 space-y-2">
        {rotations.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3.5 py-5 text-center text-[13px] leading-6 text-slate-600">
            No rotations yet. Add your first block so Home can show where you are
            in the year.
          </p>
        ) : (
          rotations.map((rotation, index) => {
            const expanded = expandedId === rotation.id;
            const isCurrent =
              rotation.start_date <= today && today <= rotation.end_date;

            return (
              <div
                key={rotation.id}
                className={`overflow-hidden rounded-xl border ${
                  isCurrent
                    ? "border-sky-300 bg-sky-50"
                    : "border-slate-200 bg-white"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : rotation.id)}
                  aria-expanded={expanded}
                  className="flex min-h-14 w-full items-center gap-3 px-3.5 py-3 text-left"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-950 text-[12px] font-bold text-white">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-[15px] font-bold tracking-tight text-slate-950">
                        {rotation.title}
                      </span>
                      {rotation.is_away_rotation ? (
                        <Plane className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      ) : null}
                    </span>
                    <span className="block truncate text-[12px] text-slate-600">
                      {formatDateOnly(rotation.start_date)} –{" "}
                      {formatDateOnly(rotation.end_date)}
                      {isCurrent ? " · Current" : ""}
                    </span>
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-slate-400 transition ${
                      expanded ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {expanded ? (
                  <div className="border-t border-slate-200 bg-white px-3.5 py-3">
                    <dl className="space-y-1.5 text-[13px]">
                      <DetailRow
                        label="Institution"
                        value={rotation.institution ?? "Not added yet"}
                      />
                      <DetailRow
                        label="Service"
                        value={rotation.service ?? "Not added yet"}
                      />
                      <DetailRow
                        label="Location"
                        value={rotation.location ?? "Not added yet"}
                        icon={<MapPin className="h-3.5 w-3.5 text-slate-400" />}
                      />
                      <DetailRow
                        label="Type"
                        value={
                          rotation.is_away_rotation
                            ? "Away rotation"
                            : "Home rotation"
                        }
                      />
                    </dl>

                    {rotation.notes ? (
                      <p className="mt-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-[13px] leading-6 text-slate-600">
                        {rotation.notes}
                      </p>
                    ) : null}

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={busy || saving}
                        onClick={() => {
                          setEditingRotationId(rotation.id);
                          setSheetOpen(true);
                          setError(null);
                        }}
                        className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white text-[14px] font-semibold text-slate-700 active:bg-slate-100 disabled:opacity-50"
                      >
                        <Pencil className="h-4 w-4" />
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={busy || saving}
                        onClick={() => void deleteRotation(rotation)}
                        className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 text-[14px] font-semibold text-rose-700 active:bg-rose-100 disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    </div>

                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={busy || saving || index === 0}
                        onClick={() => void moveRotation(index, -1)}
                        className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white text-[14px] font-semibold text-slate-600 active:bg-slate-100 disabled:opacity-40"
                      >
                        <ChevronUp className="h-4 w-4" />
                        Move up
                      </button>
                      <button
                        type="button"
                        disabled={
                          busy || saving || index === rotations.length - 1
                        }
                        onClick={() => void moveRotation(index, 1)}
                        className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white text-[14px] font-semibold text-slate-600 active:bg-slate-100 disabled:opacity-40"
                      >
                        <ChevronDown className="h-4 w-4" />
                        Move down
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>

      <button
        type="button"
        onClick={() => {
          setEditingRotationId(null);
          setSheetOpen(true);
          setError(null);
        }}
        className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-[15px] font-semibold text-white transition active:bg-slate-800"
      >
        <Plus className="h-4 w-4" />
        Add rotation
      </button>

      {sheetOpen ? (
        <MobileRotationSheet
          initialValues={
            editingRotation
              ? {
                  title: editingRotation.title,
                  institution: editingRotation.institution ?? "",
                  service: editingRotation.service ?? "",
                  location: editingRotation.location ?? "",
                  start_date: editingRotation.start_date,
                  end_date: editingRotation.end_date,
                  notes: editingRotation.notes ?? "",
                  is_away_rotation: editingRotation.is_away_rotation,
                }
              : EMPTY_FORM_VALUES
          }
          title={editingRotation ? "Edit rotation" : "Add rotation"}
          submitLabel={editingRotation ? "Update rotation" : "Save rotation"}
          saving={saving}
          error={error}
          onSubmit={saveRotation}
          onClose={() => {
            setSheetOpen(false);
            setEditingRotationId(null);
            setError(null);
          }}
        />
      ) : null}
    </section>
  );
}

function DetailRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="shrink-0 font-semibold text-slate-500">{label}</dt>
      <dd className="inline-flex min-w-0 items-center gap-1.5 text-right text-slate-800">
        {icon}
        <span className="truncate">{value}</span>
      </dd>
    </div>
  );
}

function MobileRotationSheet({
  initialValues,
  title,
  submitLabel,
  saving,
  error,
  onSubmit,
  onClose,
}: {
  initialValues: StudentWorkspaceRotationFormValues;
  title: string;
  submitLabel: string;
  saving: boolean;
  error: string | null;
  onSubmit: (values: StudentWorkspaceRotationFormValues) => Promise<void>;
  onClose: () => void;
}) {
  const [values, setValues] = useState(initialValues);

  function update<K extends keyof StudentWorkspaceRotationFormValues>(
    key: K,
    value: StudentWorkspaceRotationFormValues[K]
  ) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-white">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <h3 className="text-[17px] font-bold tracking-tight text-slate-950">
          {title}
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-500 active:bg-slate-100"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <form
        id="mobile-rotation-form"
        onSubmit={(event) => {
          event.preventDefault();
          void onSubmit(values);
        }}
        className="grid flex-1 content-start gap-3 overflow-y-auto px-4 py-4"
      >
        <MobileField label="Title" htmlFor="mobile-rotation-title">
          <input
            id="mobile-rotation-title"
            value={values.title}
            onChange={(event) => update("title", event.target.value)}
            placeholder="e.g. Home Ortho Sub-I"
            required
            className={MOBILE_INPUT_CLASS}
          />
        </MobileField>

        <MobileField label="Institution" htmlFor="mobile-rotation-institution">
          <input
            id="mobile-rotation-institution"
            value={values.institution}
            onChange={(event) => update("institution", event.target.value)}
            placeholder="Medical school or program"
            className={MOBILE_INPUT_CLASS}
          />
        </MobileField>

        <MobileField label="Service" htmlFor="mobile-rotation-service">
          <input
            id="mobile-rotation-service"
            value={values.service}
            onChange={(event) => update("service", event.target.value)}
            placeholder="e.g. Trauma"
            className={MOBILE_INPUT_CLASS}
          />
        </MobileField>

        <MobileField label="Location" htmlFor="mobile-rotation-location">
          <input
            id="mobile-rotation-location"
            value={values.location}
            onChange={(event) => update("location", event.target.value)}
            placeholder="Clinic, hospital, city"
            className={MOBILE_INPUT_CLASS}
          />
        </MobileField>

        <MobileField label="Start date" htmlFor="mobile-rotation-start">
          <input
            id="mobile-rotation-start"
            type="date"
            value={values.start_date}
            onChange={(event) => update("start_date", event.target.value)}
            required
            className={MOBILE_INPUT_CLASS}
          />
        </MobileField>

        <MobileField label="End date" htmlFor="mobile-rotation-end">
          <input
            id="mobile-rotation-end"
            type="date"
            value={values.end_date}
            onChange={(event) => update("end_date", event.target.value)}
            required
            className={MOBILE_INPUT_CLASS}
          />
        </MobileField>

        <label className="flex min-h-12 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-[15px] text-slate-700">
          <input
            type="checkbox"
            checked={values.is_away_rotation}
            onChange={(event) => update("is_away_rotation", event.target.checked)}
            className="h-5 w-5 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
          />
          Away rotation
        </label>

        <MobileField label="Notes" htmlFor="mobile-rotation-notes">
          <textarea
            id="mobile-rotation-notes"
            value={values.notes}
            onChange={(event) => update("notes", event.target.value)}
            rows={4}
            placeholder="Goals, reminders, or key contacts for this block"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-[16px] text-slate-900 outline-none transition focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100"
          />
        </MobileField>

        {error ? (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-[13px] text-rose-700">
            {error}
          </p>
        ) : null}
      </form>

      <div
        className="shrink-0 border-t border-slate-200 px-4 pt-3"
        style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
      >
        <button
          type="submit"
          form="mobile-rotation-form"
          disabled={saving}
          className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-slate-950 px-4 text-[15px] font-semibold text-white transition active:bg-slate-800 disabled:opacity-60"
        >
          {saving ? "Saving…" : submitLabel}
        </button>
      </div>
    </div>
  );
}
