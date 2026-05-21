"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarRange,
  Check,
  Loader2,
  PlaneTakeoff,
  Save,
  UserRound,
  Wand2,
} from "lucide-react";
import { calculatePgyForDateRange } from "@/lib/workspace/pgy";

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

type ComputedResidentOption = ResidentOption & {
  pgyYear: number | null;
  pgyLabel: string | null;
};

type SetupResponse = {
  canManageProgramTimeOff: boolean;
  rosterId: string | null;
  rosterRole: string | null;
  programMembershipId: string | null;
  membershipRole: string | null;
  residents: ResidentOption[];
};

type Props = {
  defaultStartDate: string;
  onSaved?: () => void | Promise<void>;
};

const EVENT_TYPE_OPTIONS: Array<{ value: TimeOffType; label: string }> = [
  { value: "vacation", label: "Vacation" },
  { value: "conference", label: "Conference" },
  { value: "sick", label: "Sick" },
  { value: "personal", label: "Personal" },
  { value: "other", label: "Other" },
];

function getPgySortValue(resident: ResidentOption) {
  if ("pgyYear" in resident && typeof resident.pgyYear === "number") {
    return resident.pgyYear;
  }

  return 99;
}

function getPgyLabel(pgyYear: number | null) {
  return typeof pgyYear === "number" ? `PGY-${pgyYear}` : null;
}

function isResidentActiveForRange(
  resident: ResidentOption,
  startDate: string,
  endDate: string
) {
  if (resident.isActive === false) return false;

  if (resident.rosterStartDate || resident.rosterEndDate) {
    const startsBeforeRangeEnds =
      !resident.rosterStartDate || resident.rosterStartDate <= endDate;
    const endsAfterRangeStarts =
      !resident.rosterEndDate || resident.rosterEndDate >= startDate;

    return startsBeforeRangeEnds && endsAfterRangeStarts;
  }

  if (calculatePgyForDateRange({ gradYear: resident.gradYear, startDate, endDate })) {
    return true;
  }

  return true;
}

function formatDateLabel(dateString: string) {
  return new Date(`${dateString}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getDayCount(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((end.getTime() - start.getTime()) / msPerDay) + 1;
}

export default function ProgramTimeOffAddView({
  defaultStartDate,
  onSaved,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [canManage, setCanManage] = useState(false);
  const [rosterRole, setRosterRole] = useState<string | null>(null);
  const [membershipRole, setMembershipRole] = useState<string | null>(null);
  const [residents, setResidents] = useState<ResidentOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [activePgyTab, setActivePgyTab] = useState("1");
  const [selectedRosterId, setSelectedRosterId] = useState("");
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultStartDate);
  const [eventType, setEventType] = useState<TimeOffType>("vacation");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [saveAndAddAnother, setSaveAndAddAnother] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadSetup() {
      try {
        setLoading(true);
        setError(null);

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
          setRosterRole(payload?.rosterRole ?? null);
          setMembershipRole(payload?.membershipRole ?? null);
          setResidents(Array.isArray(payload?.residents) ? payload!.residents : []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load residents");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadSetup();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (endDate < startDate) {
      setEndDate(startDate);
    }
  }, [startDate, endDate]);

  const filteredResidents = useMemo<ComputedResidentOption[]>(
    () =>
      residents
        .filter((resident) => isResidentActiveForRange(resident, startDate, endDate))
        .map((resident) => {
          const pgyYear = calculatePgyForDateRange({
            gradYear: resident.gradYear,
            startDate,
            endDate,
          });

          return {
            ...resident,
            pgyYear,
            pgyLabel: getPgyLabel(pgyYear),
          };
        })
        .filter((resident) => typeof resident.pgyYear === "number")
        .sort((a, b) => {
          const pgyDiff = getPgySortValue(a) - getPgySortValue(b);
          if (pgyDiff !== 0) return pgyDiff;
          return a.displayName.localeCompare(b.displayName);
        }),
    [endDate, residents, startDate]
  );

  const residentGroups = useMemo(() => {
    return [1, 2, 3, 4, 5].map((year) => ({
      key: String(year),
      label: `PGY-${year}`,
      residents: filteredResidents.filter((resident) => resident.pgyYear === year),
    }));
  }, [filteredResidents]);

  const visibleResidents = useMemo(
    () =>
      residentGroups.find((group) => group.key === activePgyTab)?.residents ?? [],
    [activePgyTab, residentGroups]
  );

  const selectedResident =
    filteredResidents.find((resident) => resident.rosterId === selectedRosterId) ?? null;

  const hasValidRange = Boolean(startDate && endDate && endDate >= startDate);
  const canSave = Boolean(selectedResident && hasValidRange && !saving);
  const totalDays = hasValidRange ? getDayCount(startDate, endDate) : 0;
  const eventTypeLabel =
    EVENT_TYPE_OPTIONS.find((option) => option.value === eventType)?.label ?? "Time Off";

  useEffect(() => {
    if (
      selectedRosterId &&
      !filteredResidents.some((resident) => resident.rosterId === selectedRosterId)
    ) {
      setSelectedRosterId("");
    }
  }, [filteredResidents, selectedRosterId]);

  useEffect(() => {
    if (residentGroups.some((group) => group.key === activePgyTab)) return;

    const firstNonEmptyGroup =
      residentGroups.find((group) => group.residents.length > 0)?.key ?? "1";
    setActivePgyTab(firstNonEmptyGroup);
  }, [activePgyTab, residentGroups]);

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;

    console.log("program_time_off_resident_range", {
      startDate,
      endDate,
      loadedResidentsCount: residents.length,
      filteredResidentsCount: filteredResidents.length,
    });

    for (const resident of filteredResidents) {
      console.log("program_time_off_resident_pgy", {
        rosterId: resident.rosterId,
        displayName: resident.displayName,
        startDate,
        endDate,
        gradYear: resident.gradYear,
        rosterStartDate: resident.rosterStartDate,
        rosterEndDate: resident.rosterEndDate,
        isActive: resident.isActive,
        pgyYear: resident.pgyYear,
      });
    }
  }, [endDate, filteredResidents, residents.length, startDate]);

  async function handleSave(keepResident: boolean) {
    if (!canSave || !selectedResident) return;

    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      const response = await fetch("/api/program/time-off", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rosterId: selectedResident.rosterId,
          programMembershipId: selectedResident.programMembershipId,
          startDate,
          endDate,
          eventType,
          title: title.trim() || null,
          notes: notes.trim() || null,
          approvalStatus: "approved",
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          payload && typeof payload === "object" && "error" in payload
            ? String((payload as { error?: unknown }).error ?? "Failed to save time off")
            : "Failed to save time off"
        );
      }

      setSuccessMessage(
        `${selectedResident.displayName} saved for ${formatDateLabel(startDate)}${
          startDate === endDate ? "" : ` to ${formatDateLabel(endDate)}`
        }.`
      );
      setStartDate(defaultStartDate);
      setEndDate(defaultStartDate);
      setEventType("vacation");
      setTitle("");
      setNotes("");
      if (!keepResident) {
        setSelectedRosterId("");
      }

      await onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save time off");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading quick add setup...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[1.6rem] border border-rose-200 bg-white p-5 shadow-sm">
        <div className="rounded-[1rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <span className="inline-flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </span>
        </div>
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="rounded-[1.2rem] border border-amber-200 bg-amber-50 px-4 py-4">
          <p className="text-sm font-semibold text-amber-900">
            Program Upload is available to program admins and chiefs
          </p>
          <p className="mt-1 text-sm text-amber-700">
            Your current workspace role can still use Individual Add, but it does
            not have permission to create approved blocks for other residents.
          </p>
          <p className="mt-2 text-xs text-amber-700/80">
            Roster role: {rosterRole ?? "none"} • Membership role: {membershipRole ?? "none"}
          </p>
        </div>
      </div>
    );
  }

  if (residents.length === 0) {
    return (
      <div className="rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-4">
          <p className="text-sm font-semibold text-slate-900">
            No roster residents are available for Program Upload
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Add residents to the active program roster first, then return here to
            create approved time-off blocks.
          </p>
        </div>
      </div>
    );
  }

  return (
    <section className="rounded-[1.8rem] border border-slate-200 bg-white p-4 shadow-xl md:p-5 xl:p-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Program Quick Entry
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
            Quick Add Time Off
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-500">
            Pick a block, choose the resident, and save directly into approved
            availability so the calendar and call validation update off the same data.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700">
          <Wand2 className="h-3.5 w-3.5" />
          Range-based quick add
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1.05fr_1.35fr_1fr]">
        <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50/80 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            1. Select date range
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-600">Start date</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-600">End date</span>
              <input
                type="date"
                min={startDate}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
              />
            </label>
          </div>

          {!hasValidRange ? (
            <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
              End date must be the same day or later than the start date.
            </div>
          ) : null}
        </div>

        <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50/80 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                2. Select resident
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Residents shown are active for the selected date range.
              </p>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
              <UserRound className="h-3.5 w-3.5" />
              {filteredResidents.length} residents
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {residentGroups.map((group) => {
              return (
                <button
                  key={group.key}
                  type="button"
                  onClick={() => setActivePgyTab(group.key)}
                  className={`inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-semibold transition ${
                    activePgyTab === group.key
                      ? "bg-slate-950 text-white"
                      : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span>{group.label}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                      activePgyTab === group.key
                        ? "bg-white/10 text-slate-100"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {group.residents.length}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-2.5">
            {filteredResidents.length === 0 ? (
              <div className="rounded-xl bg-slate-50 px-4 py-5 text-sm text-slate-500">
                No active residents are available for the selected date range.
              </div>
            ) : visibleResidents.length === 0 ? (
              <div className="rounded-xl bg-slate-50 px-4 py-5 text-sm text-slate-500">
                No residents found in {residentGroups.find((group) => group.key === activePgyTab)?.label ?? "this group"}.
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {visibleResidents.map((resident) => {
                  const selected = selectedRosterId === resident.rosterId;

                  return (
                    <button
                      key={resident.rosterId}
                      type="button"
                      onClick={() => setSelectedRosterId(resident.rosterId)}
                      className={`flex items-start justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                        selected
                          ? "border-slate-950 bg-slate-950 text-white"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="min-w-0">
                        <p
                          className={`truncate text-sm font-semibold ${
                            selected ? "text-white" : "text-slate-900"
                          }`}
                        >
                          {resident.displayName}
                        </p>
                        {resident.pgyLabel ? (
                          <div className="mt-2">
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                selected
                                  ? "bg-white/10 text-white"
                                  : "bg-sky-50 text-sky-700 ring-1 ring-sky-200"
                              }`}
                            >
                              {resident.pgyLabel}
                            </span>
                          </div>
                        ) : null}
                      </div>

                      <div
                        className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                          selected
                            ? "border-white/20 bg-white/10 text-white"
                            : "border-slate-200 bg-slate-50 text-transparent"
                        }`}
                      >
                        <Check className="h-3 w-3" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50/80 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            3. Time-off details
          </p>

          <div className="mt-3 space-y-3">
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-600">Event type</span>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value as TimeOffType)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
              >
                {EVENT_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-600">Title</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Optional title"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-600">Notes</span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Optional notes"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
              />
            </label>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.25fr_auto] xl:items-end">
        <div className="rounded-[1.35rem] border border-slate-200 bg-white px-4 py-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-700">
              <CalendarRange className="h-3.5 w-3.5" />
              Preview
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-700">
              <PlaneTakeoff className="h-3.5 w-3.5" />
              Saves as approved
            </span>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                Resident
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {selectedResident?.displayName ?? "Choose a resident"}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                Range
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {hasValidRange
                  ? `${formatDateLabel(startDate)}${
                      startDate === endDate ? "" : ` - ${formatDateLabel(endDate)}`
                    }`
                  : "Choose a valid range"}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                Total days
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {hasValidRange ? totalDays : 0}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                Type
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{eventTypeLabel}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => {
              setSaveAndAddAnother(false);
              void handleSave(false);
            }}
            disabled={!canSave}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {saving && !saveAndAddAnother ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save block
          </button>

          <button
            type="button"
            onClick={() => {
              setSaveAndAddAnother(true);
              void handleSave(true);
            }}
            disabled={!canSave}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
          >
            {saving && saveAndAddAnother ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="h-4 w-4" />
            )}
            Save and add another
          </button>
        </div>
      </div>

      {successMessage ? (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <span className="inline-flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </span>
        </div>
      ) : null}
    </section>
  );
}
