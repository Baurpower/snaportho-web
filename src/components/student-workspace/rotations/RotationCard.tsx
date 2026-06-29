"use client";

import { MapPin, Pencil, Plane, Trash2 } from "lucide-react";
import { formatDateOnly } from "@/lib/student-workspace/date";
import type { StudentWorkspaceRotation } from "@/lib/student-workspace/types";
import { RotationReorderControls } from "@/components/student-workspace/rotations/RotationReorderControls";

type RotationCardProps = {
  rotation: StudentWorkspaceRotation;
  index: number;
  total: number;
  busy?: boolean;
  onEdit: (rotation: StudentWorkspaceRotation) => void;
  onDelete: (rotation: StudentWorkspaceRotation) => Promise<void>;
  onMoveUp: () => Promise<void>;
  onMoveDown: () => Promise<void>;
};

export function RotationCard({
  rotation,
  index,
  total,
  busy,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
}: RotationCardProps) {
  return (
    <article className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
            Rotation {index + 1}
          </div>
          <h3 className="mt-3 text-xl font-bold tracking-tight text-slate-950">
            {rotation.title}
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            {formatDateOnly(rotation.start_date)} to {formatDateOnly(rotation.end_date)}
          </p>
        </div>

        <RotationReorderControls
          canMoveUp={index > 0}
          canMoveDown={index < total - 1}
          disabled={busy}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
        />
      </div>

      <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
        <div>
          <p className="font-semibold text-slate-800">Institution</p>
          <p>{rotation.institution ?? "Not added yet"}</p>
        </div>
        <div>
          <p className="font-semibold text-slate-800">Service</p>
          <p>{rotation.service ?? "Not added yet"}</p>
        </div>
        <div>
          <p className="font-semibold text-slate-800">Location</p>
          <p className="inline-flex items-center gap-2">
            <MapPin className="h-4 w-4 text-slate-400" />
            {rotation.location ?? "Not added yet"}
          </p>
        </div>
        <div>
          <p className="font-semibold text-slate-800">Type</p>
          <p className="inline-flex items-center gap-2">
            <Plane className="h-4 w-4 text-slate-400" />
            {rotation.is_away_rotation ? "Away rotation" : "Home rotation"}
          </p>
        </div>
      </div>

      {rotation.notes ? (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
          {rotation.notes}
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => onEdit(rotation)}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Pencil className="h-4 w-4" />
          Edit
        </button>
        <button
          type="button"
          onClick={() => onDelete(rotation)}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </button>
      </div>
    </article>
  );
}
