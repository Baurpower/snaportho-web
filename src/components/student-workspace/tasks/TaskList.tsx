"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import type {
  StudentWorkspaceRotation,
  StudentWorkspaceTask,
  StudentWorkspaceTaskPriority,
} from "@/lib/student-workspace/types";
import { TaskCard } from "@/components/student-workspace/tasks/TaskCard";
import { TaskEmptyState } from "@/components/student-workspace/tasks/TaskEmptyState";
import { TaskFilters } from "@/components/student-workspace/tasks/TaskFilters";
import { TaskForm } from "@/components/student-workspace/tasks/TaskForm";

function sortTasks(tasks: StudentWorkspaceTask[]) {
  return [...tasks].sort((left, right) => {
    if (left.status !== right.status) {
      return left.status.localeCompare(right.status);
    }
    if (left.sort_order !== right.sort_order) {
      return left.sort_order - right.sort_order;
    }
    if ((left.due_date ?? "") !== (right.due_date ?? "")) {
      return (left.due_date ?? "9999-12-31").localeCompare(
        right.due_date ?? "9999-12-31"
      );
    }
    return left.created_at.localeCompare(right.created_at);
  });
}

export function TaskList({
  initialTasks,
  rotations,
  today,
}: {
  initialTasks: StudentWorkspaceTask[];
  rotations: StudentWorkspaceRotation[];
  today: string;
}) {
  const [tasks, setTasks] = useState(() => sortTasks(initialTasks));
  const [showForm, setShowForm] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const editingTask = tasks.find((task) => task.id === editingTaskId) ?? null;
  const openTasks = useMemo(
    () => tasks.filter((task) => task.status === "open"),
    [tasks]
  );
  const completedTasks = useMemo(
    () => tasks.filter((task) => task.status === "done"),
    [tasks]
  );
  const hasHiddenCompletedTasks = openTasks.length === 0 && completedTasks.length > 0 && !showCompleted;

  async function saveTask(values: {
    title: string;
    notes: string;
    priority: StudentWorkspaceTaskPriority;
    due_date: string;
    rotation_id: string;
  }) {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        title: values.title,
        notes: values.notes,
        priority: values.priority,
        due_date: values.due_date || null,
        rotation_id: values.rotation_id || null,
      };
      const endpoint = editingTask
        ? `/api/student-workspace/tasks/${editingTask.id}`
        : "/api/student-workspace/tasks";
      const method = editingTask ? "PATCH" : "POST";
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error ?? "Unable to save task.");
      if (editingTask) {
        setTasks((current) =>
          sortTasks(
            current.map((task) => (task.id === result.task.id ? result.task : task))
          )
        );
      } else {
        setTasks((current) => sortTasks([...current, result.task]));
      }
      setShowForm(false);
      setEditingTaskId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save task.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleComplete(task: StudentWorkspaceTask) {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/student-workspace/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: task.status === "done" ? "open" : "done" }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error ?? "Unable to update task.");
      setTasks((current) =>
        sortTasks(
          current.map((currentTask) =>
            currentTask.id === result.task.id ? result.task : currentTask
          )
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update task.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteTask(task: StudentWorkspaceTask) {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/student-workspace/tasks/${task.id}`, {
        method: "DELETE",
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error ?? "Unable to delete task.");
      setTasks((current) => current.filter((currentTask) => currentTask.id !== task.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete task.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Personal Tasks
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
            Keep the loose ends visible
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Open tasks stay first so today&apos;s follow-ups are easy to finish.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <TaskFilters
            showCompleted={showCompleted}
            onToggleCompleted={() => setShowCompleted((current) => !current)}
          />
          <button
            type="button"
            onClick={() => {
              setShowForm((current) => !current);
              setEditingTaskId(null);
              setError(null);
            }}
            className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            {showForm ? "Hide form" : "Add task"}
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-4">
        {showForm ? (
          <TaskForm
            rotations={rotations}
            saving={saving}
            error={!editingTask ? error : null}
            onSubmit={saveTask}
            onCancel={() => {
              setShowForm(false);
              setError(null);
            }}
          />
        ) : null}

        {editingTask ? (
          <TaskForm
            rotations={rotations}
            initialTask={editingTask}
            saving={saving}
            error={error}
            onSubmit={saveTask}
            onCancel={() => {
              setEditingTaskId(null);
              setError(null);
            }}
          />
        ) : null}

        {openTasks.length === 0 && !showForm && !hasHiddenCompletedTasks ? (
          <TaskEmptyState onAddTask={() => setShowForm(true)} />
        ) : null}

        {hasHiddenCompletedTasks ? (
          <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-white px-5 py-8 text-center shadow-sm">
            <h3 className="text-xl font-bold tracking-tight text-slate-950">
              No open tasks right now
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Your completed tasks are hidden. Show them again or add a new next step.
            </p>
          </div>
        ) : null}

        {openTasks.length > 0 ? (
          <div className="grid gap-3">
            {openTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                rotations={rotations}
                today={today}
                busy={saving}
                onEdit={(nextTask) => {
                  setEditingTaskId(nextTask.id);
                  setShowForm(false);
                  setError(null);
                }}
                onToggleComplete={toggleComplete}
                onDelete={deleteTask}
              />
            ))}
          </div>
        ) : null}

        {showCompleted && completedTasks.length > 0 ? (
          <div className="grid gap-3">
            {completedTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                rotations={rotations}
                today={today}
                busy={saving}
                onEdit={(nextTask) => {
                  setEditingTaskId(nextTask.id);
                  setShowForm(false);
                  setError(null);
                }}
                onToggleComplete={toggleComplete}
                onDelete={deleteTask}
              />
            ))}
          </div>
        ) : null}

        {error && !showForm && !editingTask ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}
      </div>
    </section>
  );
}
