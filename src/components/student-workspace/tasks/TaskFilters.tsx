"use client";

export function TaskFilters({
  showCompleted,
  onToggleCompleted,
}: {
  showCompleted: boolean;
  onToggleCompleted: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggleCompleted}
      className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
    >
      {showCompleted ? "Hide completed" : "Show completed"}
    </button>
  );
}
