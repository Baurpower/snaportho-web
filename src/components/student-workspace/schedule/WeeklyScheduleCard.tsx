"use client";

import { useMemo, useState } from "react";
import { Plus, RefreshCcw } from "lucide-react";
import { resolveScheduleEntriesForWeek } from "@/lib/student-workspace/schedule-resolver";
import type {
  StudentWorkspaceRotation,
  StudentWorkspaceResolvedScheduleEntry,
  StudentWorkspaceScheduleEntry,
} from "@/lib/student-workspace/types";
import { ScheduleEntryForm } from "@/components/student-workspace/schedule/ScheduleEntryForm";
import { ScheduleEmptyState } from "@/components/student-workspace/schedule/ScheduleEmptyState";
import { WeeklyScheduleList } from "@/components/student-workspace/schedule/WeeklyScheduleList";

export function WeeklyScheduleCard({
  initialEntries,
  rotations,
  today,
  weekStart,
}: {
  initialEntries: StudentWorkspaceScheduleEntry[];
  rotations: StudentWorkspaceRotation[];
  today: string;
  weekStart: string;
}) {
  const [entries, setEntries] = useState(initialEntries);
  const [showForm, setShowForm] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolvedEntries = useMemo(
    () => resolveScheduleEntriesForWeek(entries, weekStart),
    [entries, weekStart]
  );
  const editingEntry =
    resolvedEntries.find((entry) => entry.id === editingEntryId) ?? null;

  async function saveEntry(values: {
    title: string;
    entry_type: StudentWorkspaceResolvedScheduleEntry["entry_type"];
    location: string;
    notes: string;
    weekday: string;
    specific_date: string;
    start_time: string;
    end_time: string;
    rotation_id: string;
    is_all_day: boolean;
    color_token: string;
  }) {
    setSaving(true);
    setError(null);

    try {
      const payload = {
        title: values.title,
        entry_type: values.entry_type,
        location: values.location,
        notes: values.notes,
        weekday: values.weekday ? Number(values.weekday) : null,
        specific_date: values.specific_date || null,
        start_time: values.start_time,
        end_time: values.end_time,
        rotation_id: values.rotation_id || null,
        is_all_day: values.is_all_day,
        color_token: values.color_token,
      };

      const endpoint = editingEntry
        ? `/api/student-workspace/schedule/${editingEntry.id}`
        : "/api/student-workspace/schedule";
      const method = editingEntry ? "PATCH" : "POST";
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error ?? "Unable to save schedule entry.");
      }

      if (editingEntry) {
        setEntries((current) =>
          current.map((entry) => (entry.id === result.entry.id ? result.entry : entry))
        );
      } else {
        setEntries((current) => [...current, result.entry]);
      }

      setShowForm(false);
      setEditingEntryId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save schedule entry.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteEntry(entry: StudentWorkspaceResolvedScheduleEntry) {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/student-workspace/schedule/${entry.id}`, {
        method: "DELETE",
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error ?? "Unable to delete schedule entry.");
      }
      setEntries((current) => current.filter((currentEntry) => currentEntry.id !== entry.id));
      if (editingEntryId === entry.id) {
        setEditingEntryId(null);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to delete schedule entry."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Weekly Schedule
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
            What does this week look like?
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Today is {today}. Keep recurring blocks and one-off dates in one place.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setShowForm((current) => !current);
            setEditingEntryId(null);
            setError(null);
          }}
          className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          {showForm ? <RefreshCcw className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? "Hide form" : "Add entry"}
        </button>
      </div>

      <div className="mt-6 grid gap-4">
        {showForm ? (
          <ScheduleEntryForm
            key="create-schedule-entry"
            rotations={rotations}
            saving={saving}
            error={!editingEntry ? error : null}
            onSubmit={saveEntry}
            onCancel={() => {
              setShowForm(false);
              setError(null);
            }}
          />
        ) : null}

        {editingEntry ? (
          <ScheduleEntryForm
            key={editingEntry.id}
            rotations={rotations}
            initialEntry={editingEntry}
            saving={saving}
            error={error}
            onSubmit={saveEntry}
            onCancel={() => {
              setEditingEntryId(null);
              setError(null);
            }}
          />
        ) : null}

        {entries.length === 0 && !showForm ? (
          <ScheduleEmptyState onAddEntry={() => setShowForm(true)} />
        ) : (
          <WeeklyScheduleList
            resolvedEntries={resolvedEntries}
            rotations={rotations}
            weekStart={weekStart}
            busy={saving}
            onEdit={(entry) => {
              setEditingEntryId(entry.id);
              setShowForm(false);
              setError(null);
            }}
            onDelete={deleteEntry}
          />
        )}
      </div>
    </section>
  );
}
