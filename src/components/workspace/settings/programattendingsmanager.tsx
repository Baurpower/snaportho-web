"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  Loader2,
  PencilLine,
  Plus,
  RotateCcw,
  UserRound,
  X,
} from "lucide-react";
import SettingsModal from "@/components/workspace/settings/settingsmodal";
import type { ProgramAttending } from "@/lib/workspace/call/types";
import {
  composeProgramAttendingFullName,
  getAttendingDisplayName,
  parseProgramAttendingFullName,
} from "@/lib/workspace/call/attendings-shared";

type ProgramAttendingsResponse = {
  programId?: string | null;
  canManageAttendings?: boolean;
  attendings?: ProgramAttending[];
  error?: string;
};

type ProgramAttendingMutationResponse = {
  attending?: ProgramAttending;
  error?: string;
};

type ProgramAttendingsManagerProps = {
  canManageFallback?: boolean;
  onBanner?: (banner: {
    tone: "success" | "error";
    message: string;
  } | null) => void;
};

type AttendingModalProps = {
  open: boolean;
  attending: ProgramAttending | null;
  saving: boolean;
  onClose: () => void;
  onSave: (payload: { firstName: string; lastName: string }) => Promise<void> | void;
};

function formatAttendingName(attending: ProgramAttending) {
  return getAttendingDisplayName(attending);
}

function sortAttendings(attendings: ProgramAttending[]) {
  return [...attendings].sort((a, b) => {
    if (a.isActive !== b.isActive) {
      return a.isActive ? -1 : 1;
    }

    return formatAttendingName(a).localeCompare(formatAttendingName(b));
  });
}

function AttendingRow({
  attending,
  canManage,
  saving,
  onEdit,
  onToggleActive,
}: {
  attending: ProgramAttending;
  canManage: boolean;
  saving: boolean;
  onEdit: (attending: ProgramAttending) => void;
  onToggleActive: (attending: ProgramAttending) => Promise<void> | void;
}) {
  const label = formatAttendingName(attending);

  return (
    <div
      className={`rounded-[1.5rem] border px-4 py-4 transition sm:px-5 ${
        attending.isActive
          ? "border-white/10 bg-white/[0.04]"
          : "border-white/8 bg-white/[0.025] opacity-80"
      }`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-2xl ring-1 ${
                attending.isActive
                  ? "bg-sky-400/10 text-sky-300 ring-sky-300/15"
                  : "bg-white/[0.04] text-slate-400 ring-white/10"
              }`}
            >
              <UserRound className="h-4 w-4" />
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{label}</p>
              {attending.fullName !== label ? (
                <p className="truncate text-xs text-slate-400">{attending.fullName}</p>
              ) : null}
            </div>

            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${
                attending.isActive
                  ? "bg-emerald-400/10 text-emerald-200 ring-1 ring-emerald-300/15"
                  : "bg-white/[0.06] text-slate-300 ring-1 ring-white/10"
              }`}
            >
              {attending.isActive ? "Active" : "Inactive"}
            </span>
          </div>
        </div>

        {canManage ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onEdit(attending)}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-white/[0.08] disabled:opacity-60"
            >
              <PencilLine className="h-3.5 w-3.5" />
              Edit
            </button>

            <button
              type="button"
              onClick={() => onToggleActive(attending)}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-white/[0.08] disabled:opacity-60"
            >
              {attending.isActive ? (
                <>
                  <X className="h-3.5 w-3.5" />
                  Deactivate
                </>
              ) : (
                <>
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reactivate
                </>
              )}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function AttendingModal({
  open,
  attending,
  saving,
  onClose,
  onSave,
}: AttendingModalProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const parsed = parseProgramAttendingFullName(
      attending ? formatAttendingName(attending) : ""
    );
    setFirstName(attending?.firstName ?? parsed.firstName);
    setLastName(attending?.lastName ?? parsed.lastName);
    setError(null);
  }, [attending, open]);

  if (!open) return null;

  async function handleSubmit() {
    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();

    if (!trimmedFirstName || !trimmedLastName) {
      setError("First name and last name are required.");
      return;
    }

    setError(null);
    await onSave({ firstName: trimmedFirstName, lastName: trimmedLastName });
  }

  return (
    <SettingsModal open={open} onBackdropClick={saving ? undefined : onClose}>
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-[1.8rem] border border-white/10 bg-[#0d1728] shadow-[0_30px_90px_rgba(0,0,0,0.45)]">
        <div className="flex items-start justify-between gap-4 px-5 pt-5 md:px-6 md:pt-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-200">
              {attending ? "Edit attending" : "New attending"}
            </p>
            <h3 className="mt-2 text-2xl font-bold text-white">
              {attending ? "Update program attending" : "Add program attending"}
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
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">
                  First name
                </label>
                <input
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  placeholder="Dan"
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-sky-300/30 focus:ring-2 focus:ring-sky-300/15"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">
                  Last name
                </label>
                <input
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  placeholder="Lee"
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-sky-300/30 focus:ring-2 focus:ring-sky-300/15"
                />
              </div>
            </div>
            <p className="text-xs text-slate-400">
              Display name is derived as first name plus last name for consistent
              calendar labels.
            </p>
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
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {attending ? "Save changes" : "Create attending"}
            </button>
          </div>
        </div>
      </div>
    </SettingsModal>
  );
}

export default function ProgramAttendingsManager({
  canManageFallback = false,
  onBanner,
}: ProgramAttendingsManagerProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attendings, setAttendings] = useState<ProgramAttending[]>([]);
  const [canManageAttendings, setCanManageAttendings] = useState(canManageFallback);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAttending, setEditingAttending] = useState<ProgramAttending | null>(null);
  const [inactiveExpanded, setInactiveExpanded] = useState(false);

  const loadAttendings = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/program/attendings", {
        credentials: "include",
        cache: "no-store",
      });

      const payload = (await response.json().catch(() => null)) as ProgramAttendingsResponse | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to load program attendings.");
      }

      const nextAttendings = Array.isArray(payload?.attendings) ? payload.attendings : [];

      setAttendings(sortAttendings(nextAttendings));
      setCanManageAttendings(
        typeof payload?.canManageAttendings === "boolean"
          ? payload.canManageAttendings
          : canManageFallback
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load program attendings."
      );
    } finally {
      setLoading(false);
    }
  }, [canManageFallback]);

  useEffect(() => {
    void loadAttendings();
  }, [loadAttendings]);

  const activeAttendings = useMemo(
    () => attendings.filter((attending) => attending.isActive),
    [attendings]
  );
  const inactiveAttendings = useMemo(
    () => attendings.filter((attending) => !attending.isActive),
    [attendings]
  );

  async function runMutation<T>(
    work: () => Promise<T>,
    successMessage: string
  ) {
    setSaving(true);
    setError(null);
    onBanner?.(null);

    try {
      const result = await work();
      onBanner?.({ tone: "success", message: successMessage });
      return result;
    } catch (mutationError) {
      const message =
        mutationError instanceof Error
          ? mutationError.message
          : "The request could not be completed.";
      setError(message);
      onBanner?.({ tone: "error", message });
      throw mutationError;
    } finally {
      setSaving(false);
    }
  }

  async function saveAttending(payload: { firstName: string; lastName: string }) {
    const firstName = payload.firstName.trim();
    const lastName = payload.lastName.trim();
    const fullName = composeProgramAttendingFullName(firstName, lastName);
    const requestBody = {
      firstName,
      lastName,
      displayName: fullName,
      fullName,
    };

    await runMutation(
      async () => {
        const response = await fetch(
          editingAttending
            ? `/api/program/attendings/${editingAttending.id}`
            : "/api/program/attendings",
          {
            method: editingAttending ? "PATCH" : "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
          }
        );

        const payload =
          (await response.json().catch(() => null)) as ProgramAttendingMutationResponse | null;

        if (!response.ok || !payload?.attending) {
          throw new Error(payload?.error ?? "Failed to save attending.");
        }

        await loadAttendings();
        return payload.attending;
      },
      editingAttending ? "Attending updated." : "Attending created."
    );

    setModalOpen(false);
    setEditingAttending(null);
  }

  async function toggleAttendingActive(attending: ProgramAttending) {
    await runMutation(
      async () => {
        const response = await fetch(`/api/program/attendings/${attending.id}`, {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ isActive: !attending.isActive }),
        });

        const payload =
          (await response.json().catch(() => null)) as ProgramAttendingMutationResponse | null;

        if (!response.ok || !payload?.attending) {
          throw new Error(
            payload?.error ??
              `Failed to ${attending.isActive ? "deactivate" : "reactivate"} attending.`
          );
        }

        await loadAttendings();
        return payload.attending;
      },
      attending.isActive ? "Attending deactivated." : "Attending reactivated."
    );
  }

  return (
    <>
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {canManageAttendings ? (
            <button
              type="button"
              onClick={() => {
                setEditingAttending(null);
                setModalOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
            >
              <Plus className="h-4 w-4" />
              Add Attending
            </button>
          ) : (
            <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-slate-400">
              Read-only access
            </div>
          )}
        </div>

        {loading ? (
          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] px-6 py-14 text-slate-300">
            <div className="flex items-center justify-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading attendings...
            </div>
          </div>
        ) : error ? (
          <div className="space-y-3 rounded-[1.5rem] border border-rose-300/20 bg-rose-400/10 px-5 py-5 text-sm text-rose-100">
            <p>{error}</p>
            <button
              type="button"
              onClick={() => loadAttendings()}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/[0.1]"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Retry
            </button>
          </div>
        ) : attendings.length === 0 ? (
          <div className="rounded-[1.5rem] border border-dashed border-white/10 bg-white/[0.03] px-6 py-14 text-center">
            <p className="text-sm font-medium text-white">No attendings added yet.</p>
            <p className="mt-2 text-sm text-slate-400">
              Add attending physicians here before wiring them into future call coverage tools.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="space-y-3">
              {activeAttendings.map((attending) => (
                <AttendingRow
                  key={attending.id}
                  attending={attending}
                  canManage={canManageAttendings}
                  saving={saving}
                  onEdit={(nextAttending) => {
                    setEditingAttending(nextAttending);
                    setModalOpen(true);
                  }}
                  onToggleActive={toggleAttendingActive}
                />
              ))}
            </div>

            {inactiveAttendings.length > 0 ? (
              <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.025]">
                <button
                  type="button"
                  onClick={() => setInactiveExpanded((current) => !current)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition hover:bg-white/[0.03] sm:px-5"
                >
                  <div>
                    <p className="text-sm font-semibold text-white">Inactive attendings</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {inactiveAttendings.length} inactive
                      {inactiveAttendings.length === 1 ? " record" : " records"}
                    </p>
                  </div>

                  <ChevronDown
                    className={`h-4 w-4 text-slate-400 transition ${
                      inactiveExpanded ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {inactiveExpanded ? (
                  <div className="space-y-3 border-t border-white/10 px-4 py-4 sm:px-5">
                    {inactiveAttendings.map((attending) => (
                      <AttendingRow
                        key={attending.id}
                        attending={attending}
                        canManage={canManageAttendings}
                        saving={saving}
                        onEdit={(nextAttending) => {
                          setEditingAttending(nextAttending);
                          setModalOpen(true);
                        }}
                        onToggleActive={toggleAttendingActive}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        )}
      </div>

      <AttendingModal
        open={modalOpen}
        attending={editingAttending}
        saving={saving}
        onClose={() => {
          if (saving) return;
          setModalOpen(false);
          setEditingAttending(null);
        }}
        onSave={saveAttending}
      />
    </>
  );
}
