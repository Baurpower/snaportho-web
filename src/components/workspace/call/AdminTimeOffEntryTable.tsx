"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarRange,
  CheckCircle2,
  Copy,
  ListPlus,
  Loader2,
  Save,
  Trash2,
  Wand2,
} from "lucide-react";
import {
  calculatePgyForDateRange,
  getResidentStatusDetails,
} from "@/lib/workspace/pgy";

type TimeOffType = "personal" | "conference" | "vacation" | "sick" | "other";

type ResidentOption = {
  rosterId: string;
  programMembershipId: string | null;
  displayName: string;
  gradYear: number | null;
  isActive: boolean | null;
  rosterStartDate: string | null;
  rosterEndDate: string | null;
};

type SetupResponse = {
  canManageProgramTimeOff: boolean;
  residents: ResidentOption[];
};

export type AdminTimeOffDraftRow = {
  id: string;
  residentText: string;
  rosterId: string;
  startDate: string;
  endDate: string;
  eventType: TimeOffType | "";
  notes: string;
  errors: string[];
  warnings: string[];
};

type BatchRowResult = {
  rowId: string;
  status: "pending" | "created" | "skipped" | "error";
  created: boolean;
  skipped: boolean;
  eventId: string | null;
  errors: string[];
  warnings: string[];
  info: string[];
};

type BatchResponse = {
  created: number;
  skipped: number;
  errors: Array<{ rowId: string; message: string }>;
  warnings: Array<{ rowId: string; message: string }>;
  rowResults: BatchRowResult[];
};

type Props = {
  defaultStartDate: string;
};

const EVENT_TYPES: Array<{ value: TimeOffType; label: string }> = [
  { value: "personal", label: "PTO / Personal" },
  { value: "conference", label: "Conference" },
  { value: "vacation", label: "Vacation" },
  { value: "sick", label: "Sick" },
  { value: "other", label: "Other" },
];

function createRow(defaultStartDate: string): AdminTimeOffDraftRow {
  return {
    id: crypto.randomUUID(),
    residentText: "",
    rosterId: "",
    startDate: defaultStartDate,
    endDate: defaultStartDate,
    eventType: "vacation",
    notes: "",
    errors: [],
    warnings: [],
  };
}

function isDateKey(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(`${value}T00:00:00`);
  return (
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day
  );
}

function getDayCount(startDate: string, endDate: string) {
  if (!isDateKey(startDate) || !isDateKey(endDate) || endDate < startDate) {
    return 0;
  }

  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((end.getTime() - start.getTime()) / msPerDay) + 1;
}

function includesWeekend(startDate: string, endDate: string) {
  if (!isDateKey(startDate) || !isDateKey(endDate) || endDate < startDate) {
    return false;
  }

  const cursor = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);

  while (cursor <= end) {
    const day = cursor.getDay();
    if (day === 0 || day === 6) return true;
    cursor.setDate(cursor.getDate() + 1);
  }

  return false;
}

function isResidentActiveForRange(
  resident: ResidentOption,
  startDate: string,
  endDate: string
) {
  if (!isDateKey(startDate) || !isDateKey(endDate)) return true;

  const status = getResidentStatusDetails(resident.gradYear, startDate);
  if (!status.isActiveResident) return false;
  if (resident.isActive === false) return false;
  if (resident.rosterStartDate && resident.rosterStartDate > endDate) return false;
  if (resident.rosterEndDate && resident.rosterEndDate < startDate) return false;

  return true;
}

function validateRows(
  rows: AdminTimeOffDraftRow[],
  residentsById: Map<string, ResidentOption>
) {
  const seen = new Set<string>();

  return rows.map((row) => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const resident = row.rosterId ? residentsById.get(row.rosterId) ?? null : null;

    if (!row.rosterId) {
      errors.push("Missing resident.");
    } else if (!resident) {
      errors.push("Unmatched resident.");
    }

    if (!row.startDate) {
      errors.push("Missing start date.");
    } else if (!isDateKey(row.startDate)) {
      errors.push("Invalid start date.");
    }

    if (!row.endDate) {
      errors.push("Missing end date.");
    } else if (!isDateKey(row.endDate)) {
      errors.push("Invalid end date.");
    }

    if (isDateKey(row.startDate) && isDateKey(row.endDate) && row.endDate < row.startDate) {
      errors.push("End date before start date.");
    }

    if (!row.eventType || !EVENT_TYPES.some((type) => type.value === row.eventType)) {
      errors.push("Missing or unknown type.");
    }

    if (
      resident &&
      isDateKey(row.startDate) &&
      isDateKey(row.endDate) &&
      !isResidentActiveForRange(resident, row.startDate, row.endDate)
    ) {
      errors.push("Resident inactive or graduated for start date.");
    }

    if (
      row.rosterId &&
      isDateKey(row.startDate) &&
      isDateKey(row.endDate) &&
      row.eventType
    ) {
      const key = `${row.rosterId}|${row.startDate}|${row.endDate}|${row.eventType}`;
      if (seen.has(key)) {
        errors.push("Duplicate row in current table.");
      } else {
        seen.add(key);
      }
    }

    if (includesWeekend(row.startDate, row.endDate)) {
      warnings.push("Weekend days included.");
    }

    if (
      row.eventType &&
      row.eventType !== "conference" &&
      /\b(conference|academy|aaos|aana|ors|ota|meeting)\b/i.test(row.notes)
    ) {
      warnings.push("Notes look like conference; confirm type.");
    }

    return {
      ...row,
      errors,
      warnings,
    };
  });
}

export default function AdminTimeOffEntryTable({ defaultStartDate }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [canManage, setCanManage] = useState(false);
  const [residents, setResidents] = useState<ResidentOption[]>([]);
  const [rows, setRows] = useState<AdminTimeOffDraftRow[]>(() => [
    createRow(defaultStartDate),
    createRow(defaultStartDate),
    createRow(defaultStartDate),
  ]);
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [applyStartDate, setApplyStartDate] = useState(defaultStartDate);
  const [applyEndDate, setApplyEndDate] = useState(defaultStartDate);
  const [applyType, setApplyType] = useState<TimeOffType>("vacation");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [summary, setSummary] = useState<BatchResponse | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSetup() {
      try {
        setLoading(true);
        setLoadError(null);

        const response = await fetch("/api/program/time-off", {
          credentials: "include",
          cache: "no-store",
        });
        const payload = (await response.json().catch(() => null)) as SetupResponse | null;

        if (!response.ok) {
          throw new Error(
            payload && typeof payload === "object" && "error" in payload
              ? String((payload as { error?: unknown }).error ?? "Failed to load residents")
              : "Failed to load residents"
          );
        }

        if (!cancelled) {
          setCanManage(Boolean(payload?.canManageProgramTimeOff));
          setResidents(Array.isArray(payload?.residents) ? payload!.residents : []);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "Failed to load residents");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadSetup();

    return () => {
      cancelled = true;
    };
  }, []);

  const residentsById = useMemo(() => {
    return new Map(residents.map((resident) => [resident.rosterId, resident]));
  }, [residents]);

  const validatedRows = useMemo(
    () => validateRows(rows, residentsById),
    [residentsById, rows]
  );

  const validRows = validatedRows.filter((row) => row.errors.length === 0);
  const invalidRows = validatedRows.length - validRows.length;
  const selectedCount = selectedRowIds.size;

  function updateRow(id: string, updates: Partial<AdminTimeOffDraftRow>) {
    setRows((current) =>
      current.map((row) => {
        if (row.id !== id) return row;
        const next = { ...row, ...updates };
        const resident = updates.rosterId ? residentsById.get(updates.rosterId) : null;
        return {
          ...next,
          residentText: resident?.displayName ?? next.residentText,
        };
      })
    );
    setSummary(null);
  }

  function addRow() {
    setRows((current) => [...current, createRow(defaultStartDate)]);
    setSummary(null);
  }

  function duplicateRow(row: AdminTimeOffDraftRow) {
    setRows((current) => [
      ...current,
      {
        ...row,
        id: crypto.randomUUID(),
        errors: [],
        warnings: [],
      },
    ]);
    setSummary(null);
  }

  function deleteRow(id: string) {
    setRows((current) => current.filter((row) => row.id !== id));
    setSelectedRowIds((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
    setSummary(null);
  }

  function toggleSelected(id: string) {
    setSelectedRowIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function applyToSelected(updates: Partial<AdminTimeOffDraftRow>) {
    if (selectedRowIds.size === 0) return;
    setRows((current) =>
      current.map((row) => (selectedRowIds.has(row.id) ? { ...row, ...updates } : row))
    );
    setSummary(null);
  }

  async function submitValidRows() {
    if (validRows.length === 0) return;

    try {
      setSaving(true);
      setSubmitError(null);
      setSummary(null);

      const response = await fetch("/api/program/time-off/batch", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rows: validatedRows.map((row) => ({
            id: row.id,
            rosterId: row.rosterId,
            startDate: row.startDate,
            endDate: row.endDate,
            eventType: row.eventType,
            notes: row.notes,
          })),
        }),
      });

      const payload = (await response.json().catch(() => null)) as BatchResponse | { error?: string } | null;

      if (!response.ok) {
        throw new Error(
          payload && typeof payload === "object" && "error" in payload
            ? String(payload.error ?? "Failed to save admin entries")
            : "Failed to save admin entries"
        );
      }

      const batchPayload = payload as BatchResponse;
      setSummary(batchPayload);

      const resultById = new Map(batchPayload.rowResults.map((result) => [result.rowId, result]));
      setRows((current) =>
        current.map((row) => {
          const result = resultById.get(row.id);
          if (!result) return row;
          return {
            ...row,
            errors: result.errors,
            warnings: result.warnings,
          };
        })
      );
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Failed to save admin entries");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading admin entry...
        </div>
      </section>
    );
  }

  if (loadError) {
    return (
      <section className="rounded-2xl border border-rose-200 bg-white p-5 shadow-xl">
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {loadError}
        </div>
      </section>
    );
  }

  if (!canManage) {
    return (
      <section className="rounded-2xl border border-amber-200 bg-white p-5 shadow-xl">
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4">
          <p className="text-sm font-semibold text-amber-900">
            Admin Time-Off Entry is available to workspace admins.
          </p>
          <p className="mt-1 text-sm text-amber-700">
            You can still use individual request entry if your workspace role allows it.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xl md:p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Admin Entry
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
            Add Time Off for Multiple Residents
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-500">
            Enter approved PTO, conferences, sick days, vacation, and other time away in one table.
          </p>
        </div>

        <div className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm sm:grid-cols-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              Valid
            </p>
            <p className="mt-1 text-lg font-black text-emerald-700">{validRows.length}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              Needs Fix
            </p>
            <p className="mt-1 text-lg font-black text-rose-700">{invalidRows}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              Selected
            </p>
            <p className="mt-1 text-lg font-black text-slate-900">{selectedCount}</p>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 xl:grid-cols-[1fr_auto_auto_auto] xl:items-end">
        <button
          type="button"
          onClick={addRow}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          <ListPlus className="h-4 w-4" />
          Add row
        </button>

        <div className="grid gap-2 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="text-xs font-semibold text-slate-600">Apply start</span>
            <input
              type="date"
              value={applyStartDate}
              onChange={(event) => setApplyStartDate(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-semibold text-slate-600">Apply end</span>
            <input
              type="date"
              value={applyEndDate}
              onChange={(event) => setApplyEndDate(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
            />
          </label>
        </div>

        <label className="space-y-1">
          <span className="text-xs font-semibold text-slate-600">Apply type</span>
          <select
            value={applyType}
            onChange={(event) => setApplyType(event.target.value as TimeOffType)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
          >
            {EVENT_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </label>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            disabled={selectedCount === 0}
            onClick={() => applyToSelected({ startDate: applyStartDate, endDate: applyEndDate })}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
          >
            <CalendarRange className="h-4 w-4" />
            Apply dates
          </button>
          <button
            type="button"
            disabled={selectedCount === 0}
            onClick={() => applyToSelected({ eventType: applyType })}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
          >
            <Wand2 className="h-4 w-4" />
            Apply type
          </button>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200">
        <table className="min-w-[1100px] w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
            <tr>
              <th className="w-10 px-3 py-3"></th>
              <th className="px-3 py-3">Resident</th>
              <th className="px-3 py-3">Start Date</th>
              <th className="px-3 py-3">End Date</th>
              <th className="px-3 py-3">Type</th>
              <th className="px-3 py-3">Notes</th>
              <th className="px-3 py-3">Status / Issues</th>
              <th className="px-3 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {validatedRows.map((row) => {
              const selected = selectedRowIds.has(row.id);
              const resident = row.rosterId ? residentsById.get(row.rosterId) : null;
              const pgyYear =
                resident && isDateKey(row.startDate)
                  ? calculatePgyForDateRange({
                      gradYear: resident.gradYear,
                      startDate: row.startDate,
                      endDate: row.endDate || row.startDate,
                    })
                  : null;
              const dayCount = getDayCount(row.startDate, row.endDate);

              return (
                <tr key={row.id} className={row.errors.length > 0 ? "bg-rose-50/40" : ""}>
                  <td className="px-3 py-3 align-top">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleSelected(row.id)}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                  </td>
                  <td className="min-w-[220px] px-3 py-3 align-top">
                    <select
                      value={row.rosterId}
                      onChange={(event) => updateRow(row.id, { rosterId: event.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                    >
                      <option value="">Choose resident</option>
                      {residents.map((residentOption) => (
                        <option key={residentOption.rosterId} value={residentOption.rosterId}>
                          {residentOption.displayName}
                        </option>
                      ))}
                    </select>
                    {pgyYear ? (
                      <p className="mt-1 text-xs font-semibold text-slate-500">PGY-{pgyYear}</p>
                    ) : null}
                  </td>
                  <td className="px-3 py-3 align-top">
                    <input
                      type="date"
                      value={row.startDate}
                      onChange={(event) => updateRow(row.id, { startDate: event.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                    />
                  </td>
                  <td className="px-3 py-3 align-top">
                    <input
                      type="date"
                      min={row.startDate || undefined}
                      value={row.endDate}
                      onChange={(event) => updateRow(row.id, { endDate: event.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                    />
                    {dayCount > 0 ? (
                      <p className="mt-1 text-xs font-semibold text-slate-500">{dayCount} day{dayCount === 1 ? "" : "s"}</p>
                    ) : null}
                  </td>
                  <td className="px-3 py-3 align-top">
                    <select
                      value={row.eventType}
                      onChange={(event) => updateRow(row.id, { eventType: event.target.value as TimeOffType })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                    >
                      {EVENT_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="min-w-[220px] px-3 py-3 align-top">
                    <textarea
                      value={row.notes}
                      onChange={(event) => updateRow(row.id, { notes: event.target.value })}
                      rows={2}
                      placeholder="Optional notes"
                      className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                    />
                  </td>
                  <td className="min-w-[240px] px-3 py-3 align-top">
                    {row.errors.length === 0 ? (
                      <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Ready
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {row.errors.map((error) => (
                          <p key={error} className="flex items-start gap-1.5 text-xs font-semibold text-rose-700">
                            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            {error}
                          </p>
                        ))}
                      </div>
                    )}
                    {row.warnings.length > 0 ? (
                      <div className="mt-2 space-y-1">
                        {row.warnings.map((warning) => (
                          <p key={warning} className="text-xs font-semibold text-amber-700">
                            {warning}
                          </p>
                        ))}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-3 py-3 align-top">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => duplicateRow(row)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
                        aria-label="Duplicate row"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteRow(row.id)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-rose-200 bg-white text-rose-600 transition hover:bg-rose-50"
                        aria-label="Delete row"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="text-sm text-slate-500">
          Submit saves valid rows as approved admin entries and skips invalid rows.
        </div>
        <button
          type="button"
          onClick={() => void submitValidRows()}
          disabled={saving || validRows.length === 0}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Submit {validRows.length} valid row{validRows.length === 1 ? "" : "s"}
        </button>
      </div>

      {submitError ? (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {submitError}
        </div>
      ) : null}

      {summary ? (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <p className="font-bold">
            Saved {summary.created} row{summary.created === 1 ? "" : "s"}; skipped {summary.skipped}.
          </p>
          {summary.warnings.length > 0 ? (
            <p className="mt-1 text-amber-700">{summary.warnings.length} warning{summary.warnings.length === 1 ? "" : "s"} returned.</p>
          ) : null}
          {summary.errors.length > 0 ? (
            <p className="mt-1 text-rose-700">{summary.errors.length} row error{summary.errors.length === 1 ? "" : "s"} returned.</p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
