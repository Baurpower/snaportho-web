"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock,
  GraduationCap,
  Loader2,
  Search,
  UserRound,
} from "lucide-react";
import { useWorkspaceInfo } from "@/lib/workspace/use-workspace-info";
import AcademicEventDetailDrawer from "@/components/workspace/academic/academiceventdetail";

type AssignmentStatus =
  | "assigned"
  | "in_progress"
  | "completed"
  | "excused"
  | "cancelled";

type AcademicAssignment = {
  id: string;
  academic_event_id: string;
  academic_event_session_id?: string | null;
  assignment_type: string;
  title?: string | null;
  due_date?: string | null;
  status: AssignmentStatus;
  notes?: string | null;
  event?: {
    id: string;
    program_id?: string;
    title: string;
    start_datetime: string;
    end_datetime: string;
  } | null;
  session?: {
    id: string;
    title: string;
    session_type?: string | null;
    start_datetime?: string | null;
    end_datetime?: string | null;
  } | null;
  roster?: {
    id: string;
    full_name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    role?: string | null;
    grad_year?: number | null;
  } | null;
};

function formatDate(value?: string | null) {
  if (!value) return "No due date";

  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatEventDateTime(value?: string | null) {
  if (!value) return null;

  return new Date(value).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getDateKey(value?: string | null) {
  return value ?? "no-due-date";
}

function getPersonName(assignment: AcademicAssignment) {
  const roster = assignment.roster;

  if (!roster) return "Me";

  return (
    roster.full_name ||
    [roster.first_name, roster.last_name].filter(Boolean).join(" ") ||
    "Me"
  );
}

function statusStyles(status: AssignmentStatus) {
  switch (status) {
    case "completed":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "in_progress":
      return "bg-sky-50 text-sky-700 border-sky-200";
    case "excused":
      return "bg-slate-100 text-slate-600 border-slate-200";
    case "cancelled":
      return "bg-red-50 text-red-700 border-red-200";
    case "assigned":
    default:
      return "bg-amber-50 text-amber-700 border-amber-200";
  }
}

function isOverdue(assignment: AcademicAssignment) {
  if (!assignment.due_date) return false;
  if (assignment.status === "completed" || assignment.status === "cancelled") {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(`${assignment.due_date}T00:00:00`);
  return due < today;
}

function isDueSoon(assignment: AcademicAssignment) {
  if (!assignment.due_date || isOverdue(assignment)) return false;
  if (assignment.status === "completed" || assignment.status === "cancelled") {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(`${assignment.due_date}T00:00:00`);
  const diffDays = Math.ceil(
    (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  return diffDays <= 7;
}

export default function AcademicAssignmentsPage() {
  const router = useRouter();
  const {
    programId,
    loading: workspaceLoading,
    error: workspaceError,
  } = useWorkspaceInfo();

  const [assignments, setAssignments] = useState<AcademicAssignment[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | AssignmentStatus>(
    "all"
  );

  useEffect(() => {
    if (!programId) {
      setAssignments([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadAssignments() {
      if (!programId) return;

      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          programId,
          mineOnly: "true",
        });

        const response = await fetch(
          `/api/program/academic-calendar/assignments?${params.toString()}`,
          { cache: "no-store" }
        );

        const json = await response.json();

        if (!response.ok) {
          throw new Error(json?.error ?? "Failed to load assignments");
        }

        if (!cancelled) {
          setAssignments(json.data ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load assignments"
          );
          setAssignments([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadAssignments();

    return () => {
      cancelled = true;
    };
  }, [programId, refreshKey]);

  const filteredAssignments = useMemo(() => {
    const search = query.trim().toLowerCase();

    return assignments
      .filter((assignment) => {
        if (statusFilter !== "all" && assignment.status !== statusFilter) {
          return false;
        }

        if (!search) return true;

        const haystack = [
          assignment.title,
          assignment.assignment_type,
          assignment.notes,
          assignment.event?.title,
          assignment.session?.title,
          assignment.session?.session_type,
          getPersonName(assignment),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(search);
      })
      .sort((a, b) => {
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;

        return (
          new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
        );
      });
  }, [assignments, query, statusFilter]);

  const groupedAssignments = useMemo(() => {
    const grouped = new Map<string, AcademicAssignment[]>();

    for (const assignment of filteredAssignments) {
      const key = getDateKey(assignment.due_date);
      grouped.set(key, [...(grouped.get(key) ?? []), assignment]);
    }

    return Array.from(grouped.entries()).map(([dateKey, items]) => ({
      dateKey,
      date: dateKey === "no-due-date" ? null : dateKey,
      items,
    }));
  }, [filteredAssignments]);

  const stats = useMemo(() => {
    return {
      total: assignments.length,
      overdue: assignments.filter(isOverdue).length,
      dueSoon: assignments.filter(isDueSoon).length,
      open: assignments.filter(
        (a) => a.status === "assigned" || a.status === "in_progress"
      ).length,
      completed: assignments.filter((a) => a.status === "completed").length,
    };
  }, [assignments]);

  if (workspaceLoading || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm font-semibold text-slate-200 shadow-xl">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading your assignments...
        </div>
      </main>
    );
  }

  if (workspaceError || !programId || error) {
    return (
      <main className="min-h-screen bg-slate-950 p-6">
        <div className="mx-auto max-w-4xl rounded-3xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {workspaceError ?? error ?? "No active program found."}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-8 text-slate-900 md:px-8">
      <div className="mx-auto max-w-[1400px] space-y-5">
        <section className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5 shadow-xl backdrop-blur md:p-6">
          <button
            type="button"
            onClick={() => router.push("/work/academic")}
            className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-300 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to academics
          </button>

          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-200">
                <GraduationCap className="h-3.5 w-3.5" />
                My Academic Assignments
              </div>

              <h1 className="mt-3 text-3xl font-black tracking-tight text-white md:text-5xl">
                My Assignments
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                Your upcoming readings, presentations, journal club duties, and
                conference responsibilities.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-5 lg:min-w-[760px]">
              <div className="rounded-2xl bg-white p-4">
                <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                  Total
                </p>
                <p className="mt-1 text-2xl font-black text-slate-950">
                  {stats.total}
                </p>
              </div>

              <div className="rounded-2xl bg-white p-4">
                <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                  Open
                </p>
                <p className="mt-1 text-2xl font-black text-slate-950">
                  {stats.open}
                </p>
              </div>

              <div className="rounded-2xl bg-white p-4">
                <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                  Due Soon
                </p>
                <p className="mt-1 text-2xl font-black text-amber-600">
                  {stats.dueSoon}
                </p>
              </div>

              <div className="rounded-2xl bg-white p-4">
                <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                  Overdue
                </p>
                <p className="mt-1 text-2xl font-black text-red-600">
                  {stats.overdue}
                </p>
              </div>

              <div className="rounded-2xl bg-white p-4">
                <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                  Done
                </p>
                <p className="mt-1 text-2xl font-black text-emerald-600">
                  {stats.completed}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-xl md:p-5">
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative max-w-xl flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search assignment, event, or session..."
                className="w-full rounded-full border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm font-semibold outline-none focus:border-slate-950 focus:bg-white"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {(
                [
                  "all",
                  "assigned",
                  "in_progress",
                  "completed",
                  "excused",
                  "cancelled",
                ] as const
              ).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={`rounded-full border px-4 py-2 text-sm font-bold capitalize ${
                    statusFilter === status
                      ? "border-slate-950 bg-slate-950 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {status === "all" ? "All" : status.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          {groupedAssignments.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm">
                <CheckCircle2 className="h-5 w-5" />
              </div>

              <h3 className="mt-4 text-sm font-black text-slate-950">
                No assignments found
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                You do not have any assignments matching the current filters.
              </p>
            </div>
          ) : (
            <div className="space-y-7">
              {groupedAssignments.map((group) => (
                <div key={group.dateKey}>
                  <div className="sticky top-0 z-10 mb-3 flex items-center gap-3 bg-white/95 py-2 backdrop-blur">
                    <div className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black uppercase tracking-wide text-white">
                      {formatDate(group.date)}
                    </div>

                    <div className="h-px flex-1 bg-slate-200" />

                    <div className="text-xs font-bold text-slate-400">
                      {group.items.length} assignment
                      {group.items.length === 1 ? "" : "s"}
                    </div>
                  </div>

                  <div className="grid gap-3">
                    {group.items.map((assignment) => {
                      const overdue = isOverdue(assignment);
                      const dueSoon = isDueSoon(assignment);

                      return (
                        <button
                          key={assignment.id}
                          type="button"
                          onClick={() =>
                            setSelectedEventId(assignment.academic_event_id)
                          }
                          className={`w-full rounded-3xl border p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                            overdue
                              ? "border-red-200 bg-red-50"
                              : dueSoon
                              ? "border-amber-200 bg-amber-50"
                              : "border-slate-200 bg-white hover:border-slate-300"
                          }`}
                        >
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="mb-2 flex flex-wrap items-center gap-2">
                                <span
                                  className={`rounded-full border px-2 py-0.5 text-[11px] font-black uppercase tracking-wide ${statusStyles(
                                    assignment.status
                                  )}`}
                                >
                                  {assignment.status.replace("_", " ")}
                                </span>

                                {overdue && (
                                  <span className="rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-black uppercase tracking-wide text-white">
                                    Overdue
                                  </span>
                                )}

                                {!overdue && dueSoon && (
                                  <span className="rounded-full bg-amber-600 px-2 py-0.5 text-[11px] font-black uppercase tracking-wide text-white">
                                    Due soon
                                  </span>
                                )}

                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-black uppercase tracking-wide text-slate-600">
                                  {assignment.assignment_type}
                                </span>
                              </div>

                              <h3 className="text-base font-black text-slate-950">
                                {assignment.title ?? assignment.assignment_type}
                              </h3>

                              {assignment.notes && (
                                <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                                  {assignment.notes}
                                </p>
                              )}

                              <div className="mt-3 grid gap-2 text-xs font-bold text-slate-500 sm:grid-cols-2 lg:grid-cols-3">
                                <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2 py-1">
                                  <UserRound className="h-3.5 w-3.5" />
                                  {getPersonName(assignment)}
                                </span>

                                {assignment.event?.title && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2 py-1">
                                    <CalendarDays className="h-3.5 w-3.5" />
                                    {assignment.event.title}
                                  </span>
                                )}

                                {assignment.session?.title && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2 py-1">
                                    <Clock className="h-3.5 w-3.5" />
                                    {assignment.session.title}
                                  </span>
                                )}
                              </div>

                              {assignment.event?.start_datetime && (
                                <p className="mt-3 text-xs font-semibold text-slate-500">
                                  Event:{" "}
                                  {formatEventDateTime(
                                    assignment.event.start_datetime
                                  )}
                                </p>
                              )}
                            </div>

                            <div className="shrink-0 rounded-2xl bg-white/80 p-3 text-sm font-black text-slate-700 lg:min-w-[180px] lg:text-right">
                              <div className="text-[10px] uppercase tracking-wide text-slate-400">
                                Due
                              </div>
                              <div>{formatDate(assignment.due_date)}</div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <AcademicEventDetailDrawer
        eventId={selectedEventId}
        open={!!selectedEventId}
        onClose={() => setSelectedEventId(null)}
        onDeleted={() => {
          setSelectedEventId(null);
          setRefreshKey((current) => current + 1);
        }}
      />
    </main>
  );
}