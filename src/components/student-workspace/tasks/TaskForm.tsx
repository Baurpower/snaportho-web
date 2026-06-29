"use client";

import type {
  StudentWorkspaceRotation,
  StudentWorkspaceTask,
  StudentWorkspaceTaskPriority,
} from "@/lib/student-workspace/types";

export function TaskForm({
  rotations,
  initialTask,
  saving,
  error,
  onSubmit,
  onCancel,
}: {
  rotations: StudentWorkspaceRotation[];
  initialTask?: StudentWorkspaceTask | null;
  saving: boolean;
  error: string | null;
  onSubmit: (values: {
    title: string;
    notes: string;
    priority: StudentWorkspaceTaskPriority;
    due_date: string;
    rotation_id: string;
  }) => Promise<void>;
  onCancel: () => void;
}) {
  async function handleSubmit(formData: FormData) {
    await onSubmit({
      title: String(formData.get("title") ?? ""),
      notes: String(formData.get("notes") ?? ""),
      priority: String(formData.get("priority") ?? "normal") as StudentWorkspaceTaskPriority,
      due_date: String(formData.get("due_date") ?? ""),
      rotation_id: String(formData.get("rotation_id") ?? ""),
    });
  }

  return (
    <form action={handleSubmit} className="grid gap-4 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Personal Task
        </p>
        <h3 className="mt-2 text-xl font-bold tracking-tight text-slate-950">
          {initialTask ? "Update task" : "Add task"}
        </h3>
      </div>

      <input
        name="title"
        defaultValue={initialTask?.title ?? ""}
        placeholder="Task title"
        required
        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none"
      />

      <textarea
        name="notes"
        defaultValue={initialTask?.notes ?? ""}
        rows={3}
        placeholder="Notes"
        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <select
          name="priority"
          defaultValue={initialTask?.priority ?? "normal"}
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none"
        >
          <option value="low">low</option>
          <option value="normal">normal</option>
          <option value="high">high</option>
        </select>
        <input
          type="date"
          name="due_date"
          defaultValue={initialTask?.due_date ?? ""}
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none"
        />
      </div>

      <select
        name="rotation_id"
        defaultValue={initialTask?.rotation_id ?? ""}
        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none"
      >
        <option value="">No linked rotation</option>
        {rotations.map((rotation) => (
          <option key={rotation.id} value={rotation.id}>
            {rotation.title}
          </option>
        ))}
      </select>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
        >
          {saving ? "Saving..." : initialTask ? "Update task" : "Save task"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
