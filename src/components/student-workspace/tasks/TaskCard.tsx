"use client";

import { CalendarClock, CheckCircle2, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { compareDateOnly, formatDateOnly } from "@/lib/student-workspace/date";
import type {
  StudentWorkspaceRotation,
  StudentWorkspaceTask,
} from "@/lib/student-workspace/types";

function getDueTone(task: StudentWorkspaceTask, today: string) {
  if (!task.due_date) return "text-slate-500";
  if (compareDateOnly(task.due_date, today) < 0 && task.status === "open") {
    return "text-rose-700";
  }
  if (compareDateOnly(task.due_date, today) === 0 && task.status === "open") {
    return "text-amber-700";
  }
  return "text-slate-600";
}

export function TaskCard({
  task,
  rotations,
  today,
  busy,
  onEdit,
  onToggleComplete,
  onDelete,
}: {
  task: StudentWorkspaceTask;
  rotations: StudentWorkspaceRotation[];
  today: string;
  busy?: boolean;
  onEdit: (task: StudentWorkspaceTask) => void;
  onToggleComplete: (task: StudentWorkspaceTask) => Promise<void>;
  onDelete: (task: StudentWorkspaceTask) => Promise<void>;
}) {
  const linkedRotation = rotations.find((rotation) => rotation.id === task.rotation_id);

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
            {task.priority} priority
          </div>
          <h4 className={`mt-3 text-base font-semibold ${task.status === "done" ? "text-slate-500 line-through" : "text-slate-950"}`}>
            {task.title}
          </h4>
          {task.notes ? (
            <p className="mt-2 text-sm leading-6 text-slate-600">{task.notes}</p>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onEdit(task)}
            disabled={busy}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-100 disabled:opacity-50"
            aria-label="Edit task"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(task)}
            disabled={busy}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
            aria-label="Delete task"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className={`mt-4 flex flex-wrap items-center gap-3 text-sm ${getDueTone(task, today)}`}>
        {task.due_date ? (
          <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1">
            <CalendarClock className="h-4 w-4 text-slate-400" />
            Due {formatDateOnly(task.due_date)}
          </span>
        ) : (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-500">
            No due date
          </span>
        )}
        {linkedRotation ? (
          <span className="rounded-full bg-sky-50 px-3 py-1 text-sky-800">
            {linkedRotation.title}
          </span>
        ) : null}
      </div>

      <div className="mt-5">
        <button
          type="button"
          onClick={() => onToggleComplete(task)}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
        >
          {task.status === "done" ? (
            <>
              <RotateCcw className="h-4 w-4" />
              Reopen
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4" />
              Complete
            </>
          )}
        </button>
      </div>
    </article>
  );
}
