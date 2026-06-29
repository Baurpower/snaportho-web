"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, RefreshCcw } from "lucide-react";
import { sortRotations } from "@/lib/student-workspace/progress";
import type {
  StudentWorkspaceProfile,
  StudentWorkspaceRotation,
  StudentWorkspaceRotationFormValues,
} from "@/lib/student-workspace/types";
import { RotationCard } from "@/components/student-workspace/rotations/RotationCard";
import { RotationEmptyState } from "@/components/student-workspace/rotations/RotationEmptyState";
import { RotationForm } from "@/components/student-workspace/rotations/RotationForm";
import { RotationProgressSummary } from "@/components/student-workspace/rotations/RotationProgressSummary";

type RotationListProps = {
  profile: StudentWorkspaceProfile;
  initialRotations: StudentWorkspaceRotation[];
  today: string;
};

const EMPTY_FORM_VALUES: StudentWorkspaceRotationFormValues = {
  title: "",
  institution: "",
  service: "",
  location: "",
  start_date: "",
  end_date: "",
  notes: "",
  is_away_rotation: false,
};

export function RotationList({
  profile,
  initialRotations,
  today,
}: RotationListProps) {
  const router = useRouter();
  const [rotations, setRotations] = useState(() => sortRotations(initialRotations));
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingRotationId, setEditingRotationId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyRotationId, setBusyRotationId] = useState<string | null>(null);

  const editingRotation = useMemo(
    () => rotations.find((rotation) => rotation.id === editingRotationId) ?? null,
    [editingRotationId, rotations]
  );

  async function saveRotation(values: StudentWorkspaceRotationFormValues) {
    setSaving(true);
    setError(null);

    try {
      const isEditing = !!editingRotation;
      const endpoint = isEditing
        ? `/api/student-workspace/rotations/${editingRotation.id}`
        : "/api/student-workspace/rotations";
      const method = isEditing ? "PATCH" : "POST";
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error ?? "Unable to save rotation.");
      }

      if (isEditing) {
        setRotations((current) =>
          sortRotations(
            current.map((rotation) =>
              rotation.id === payload.rotation.id ? payload.rotation : rotation
            )
          )
        );
      } else {
        setRotations((current) => sortRotations([...current, payload.rotation]));
      }

      setShowCreateForm(false);
      setEditingRotationId(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save rotation.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteRotation(rotation: StudentWorkspaceRotation) {
    setBusyRotationId(rotation.id);
    setError(null);

    try {
      const response = await fetch(
        `/api/student-workspace/rotations/${rotation.id}`,
        { method: "DELETE" }
      );
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error ?? "Unable to delete rotation.");
      }

      setRotations(sortRotations(payload.rotations ?? []));
      if (editingRotationId === rotation.id) {
        setEditingRotationId(null);
      }
      if ((payload.rotations ?? []).length === 0) {
        setShowCreateForm(true);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete rotation.");
    } finally {
      setBusyRotationId(null);
    }
  }

  async function reorderRotations(nextRotations: StudentWorkspaceRotation[]) {
    setBusyRotationId("reordering");
    setError(null);

    try {
      const response = await fetch("/api/student-workspace/rotations/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rotation_ids: nextRotations.map((rotation) => rotation.id),
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error ?? "Unable to reorder rotations.");
      }

      setRotations(sortRotations(payload.rotations ?? []));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to reorder rotations.");
    } finally {
      setBusyRotationId(null);
    }
  }

  async function moveRotation(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= rotations.length) {
      return;
    }

    const nextRotations = [...rotations];
    const [rotation] = nextRotations.splice(index, 1);
    nextRotations.splice(nextIndex, 0, rotation);
    await reorderRotations(nextRotations);
  }

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Phase 2 Rotations
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
            Your fourth-year map
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Keep your known blocks in one place so progress stays visible and the
            next step is always obvious.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setShowCreateForm((current) => !current);
            setEditingRotationId(null);
            setError(null);
          }}
          className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          {showCreateForm ? <RefreshCcw className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showCreateForm ? "Hide add form" : "Add rotation"}
        </button>
      </div>

      <div className="mt-6 grid gap-4">
        <RotationProgressSummary profile={profile} rotations={rotations} today={today} />

        {showCreateForm ? (
          <RotationForm
            initialValues={EMPTY_FORM_VALUES}
            submitLabel="Save rotation"
            saving={saving && !editingRotation}
            error={!editingRotation ? error : null}
            onSubmit={saveRotation}
            onCancel={() => {
              setShowCreateForm(false);
              setError(null);
            }}
            cancelLabel={rotations.length === 0 ? "Back" : "Cancel"}
          />
        ) : null}

        {editingRotation ? (
          <RotationForm
            initialValues={{
              title: editingRotation.title,
              institution: editingRotation.institution ?? "",
              service: editingRotation.service ?? "",
              location: editingRotation.location ?? "",
              start_date: editingRotation.start_date,
              end_date: editingRotation.end_date,
              notes: editingRotation.notes ?? "",
              is_away_rotation: editingRotation.is_away_rotation,
            }}
            submitLabel="Update rotation"
            saving={saving && !!editingRotation}
            error={editingRotation ? error : null}
            onSubmit={saveRotation}
            onCancel={() => {
              setEditingRotationId(null);
              setError(null);
            }}
          />
        ) : null}

        {rotations.length === 0 && !showCreateForm ? (
          <RotationEmptyState onAddRotation={() => setShowCreateForm(true)} />
        ) : null}

        {rotations.length > 0 ? (
          <div className="grid gap-4">
            {rotations.map((rotation, index) => (
              <RotationCard
                key={rotation.id}
                rotation={rotation}
                index={index}
                total={rotations.length}
                busy={busyRotationId !== null || saving}
                onEdit={(nextRotation) => {
                  setEditingRotationId(nextRotation.id);
                  setShowCreateForm(false);
                  setError(null);
                }}
                onDelete={deleteRotation}
                onMoveUp={() => moveRotation(index, -1)}
                onMoveDown={() => moveRotation(index, 1)}
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
