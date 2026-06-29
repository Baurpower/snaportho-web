"use client";

import { ArrowDown, ArrowUp } from "lucide-react";

type RotationReorderControlsProps = {
  canMoveUp: boolean;
  canMoveDown: boolean;
  disabled?: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
};

export function RotationReorderControls({
  canMoveUp,
  canMoveDown,
  disabled,
  onMoveUp,
  onMoveDown,
}: RotationReorderControlsProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onMoveUp}
        disabled={!canMoveUp || disabled}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Move rotation up"
      >
        <ArrowUp className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onMoveDown}
        disabled={!canMoveDown || disabled}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Move rotation down"
      >
        <ArrowDown className="h-4 w-4" />
      </button>
    </div>
  );
}
