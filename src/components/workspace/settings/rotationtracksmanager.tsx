"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRightLeft,
  PencilLine,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import type {
  GenerateAssignmentsMode,
  OverviewMember,
  OverviewRotationCatalogItem,
  RotationTrackBlockItem,
  RotationTrackItem,
  RotationTrackMembershipItem,
} from "@/app/work/settings/settingsclient";
import RotationTrackList from "@/components/workspace/settings/rotationtracklist";
import EditRotationTrackModal from "@/components/workspace/settings/editrotationtrackmodal";
import RotationTrackGridEditor from "@/components/workspace/settings/rotationtrackgrideditor";
import RotationTrackMembersPanel from "@/components/workspace/settings/rotationtrackmemberspanel";
import CopyTracksYearModal from "@/components/workspace/settings/copytracksyearmodal";
import GenerateAssignmentsModal from "@/components/workspace/settings/generateassignmentsmodal";
import RotationTrackSchedulePreview from "@/components/workspace/settings/rotationtrackschedulepreview";

function getAcademicYearLabel(startYear: number) {
  return `${startYear}–${startYear + 1}`;
}

export default function RotationTracksManager({
  academicYearStart,
  members,
  rotations,
  tracks,
  trackBlocks,
  trackMemberships,
  canManage,
  saving,
  onCreateTrack,
  onUpdateTrack,
  onDeleteTrack,
  onSaveBlocks,
  onSaveMembers,
  onImportPreviousYear,
  onGenerateAssignments,
}: {
  academicYearStart: number;
  members: OverviewMember[];
  rotations: OverviewRotationCatalogItem[];
  tracks: RotationTrackItem[];
  trackBlocks: RotationTrackBlockItem[];
  trackMemberships: RotationTrackMembershipItem[];
  canManage: boolean;
  saving: boolean;
  onCreateTrack: (payload: {
    academicYearStart: number;
    name: string;
    description: string | null;
    targetPgyYear: number | null;
  }) => Promise<void> | void;
  onUpdateTrack: (
    trackId: string,
    payload: {
      name: string;
      description: string | null;
      targetPgyYear: number | null;
      isActive?: boolean;
    }
  ) => Promise<void> | void;
  onDeleteTrack: (trackId: string) => Promise<void> | void;
  onSaveBlocks: (
    trackId: string,
    blocks: Array<{
      id?: string;
      rotationId: string;
      startDate: string;
      endDate: string;
      siteLabel?: string | null;
      teamLabel?: string | null;
      notes?: string | null;
      sortOrder?: number | null;
    }>
  ) => Promise<void> | void;
  onSaveMembers: (trackId: string, rosterIds: string[]) => Promise<void> | void;
  onImportPreviousYear: (payload: {
    fromAcademicYearStart: number;
    toAcademicYearStart: number;
    copyMemberships: boolean;
  }) => Promise<void> | void;
  onGenerateAssignments: (payload: {
    academicYearStart: number;
    mode: GenerateAssignmentsMode;
  }) => Promise<void> | void;
}) {
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(tracks[0]?.id ?? null);
  const [editingTrack, setEditingTrack] = useState<RotationTrackItem | null>(null);
  const [trackModalOpen, setTrackModalOpen] = useState(false);
  const [copyModalOpen, setCopyModalOpen] = useState(false);
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [generateMode, setGenerateMode] =
    useState<GenerateAssignmentsMode>("overwrite_generated");
  const [isEditingSchedule, setIsEditingSchedule] = useState(false);
  const [isEditingMembers, setIsEditingMembers] = useState(false);

  useEffect(() => {
    if (!tracks.length) {
      setSelectedTrackId(null);
      setIsEditingSchedule(false);
      setIsEditingMembers(false);
      return;
    }

    if (!selectedTrackId || !tracks.some((track) => track.id === selectedTrackId)) {
      setSelectedTrackId(tracks[0].id);
    }
  }, [selectedTrackId, tracks]);

  useEffect(() => {
    setIsEditingSchedule(false);
    setIsEditingMembers(false);
  }, [selectedTrackId, academicYearStart]);

  const selectedTrack = useMemo(
    () => tracks.find((track) => track.id === selectedTrackId) ?? null,
    [selectedTrackId, tracks]
  );

  const selectedTrackBlocks = useMemo(
    () => trackBlocks.filter((block) => block.trackId === selectedTrackId),
    [selectedTrackId, trackBlocks]
  );

  const selectedTrackMemberships = useMemo(
    () => trackMemberships.filter((membership) => membership.trackId === selectedTrackId),
    [selectedTrackId, trackMemberships]
  );

  const assignedPeopleCount = useMemo(() => {
    return new Set(trackMemberships.map((membership) => membership.rosterId)).size;
  }, [trackMemberships]);

  const totalBlockCount = trackBlocks.length;
  const canGenerateAssignments =
    canManage && tracks.length > 0 && assignedPeopleCount > 0 && totalBlockCount > 0;

  const generateDisabledReason = !tracks.length
    ? "Add at least one track before generating assignments."
    : assignedPeopleCount === 0
    ? "Assign at least one person to a track before generating assignments."
    : totalBlockCount === 0
    ? "Add at least one track block before generating assignments."
    : null;

  return (
    <>
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {canManage ? (
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setCopyModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
              >
                <ArrowRightLeft className="h-4 w-4" />
                Copy Previous Year
              </button>

              <button
                type="button"
                onClick={() => {
                  setEditingTrack(null);
                  setTrackModalOpen(true);
                }}
                className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
              >
                <Plus className="h-4 w-4" />
                Add Track
              </button>
            </div>
          ) : (
            <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-slate-400">
              Read-only access
            </div>
          )}
        </div>

        <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
          <div className="rounded-[1.8rem] border border-white/10 bg-white/[0.05] p-5">
            <div className="mb-4">
              <h3 className="text-lg font-bold tracking-tight text-white">Tracks</h3>
              <p className="mt-1 text-sm text-slate-400">
                Choose a track to edit its details, blocks, and assigned people.
              </p>
            </div>

            <RotationTrackList
              tracks={tracks}
              selectedTrackId={selectedTrackId}
              memberships={trackMemberships}
              blocks={trackBlocks}
              onSelect={setSelectedTrackId}
            />
          </div>

          <div className="space-y-5">
            {selectedTrack ? (
              <>
                <div className="rounded-[1.8rem] border border-white/10 bg-white/[0.05] p-5">
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-xl font-bold tracking-tight text-white">
                          {selectedTrack.name}
                        </h3>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${
                            selectedTrack.isActive
                              ? "bg-emerald-400/10 text-emerald-200 ring-1 ring-emerald-300/15"
                              : "bg-white/[0.06] text-slate-300 ring-1 ring-white/10"
                          }`}
                        >
                          {selectedTrack.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>

                      <p className="mt-2 text-sm text-slate-400">
                        {selectedTrack.description || "No description yet."}
                      </p>

                      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-300">
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">
                          {selectedTrack.targetPgyYear
                            ? `Target PGY-${selectedTrack.targetPgyYear}`
                            : "Open to any PGY"}
                        </span>
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">
                          {selectedTrackMemberships.length} people assigned
                        </span>
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">
                          {selectedTrackBlocks.length} blocks
                        </span>
                      </div>
                    </div>

                    {canManage ? (
                      <div className="flex shrink-0 flex-wrap items-center justify-start gap-2 xl:justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTrack(selectedTrack);
                            setTrackModalOpen(true);
                          }}
                          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
                        >
                          <PencilLine className="h-4 w-4" />
                          Edit track
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setIsEditingSchedule(true);
                            setIsEditingMembers(false);
                          }}
                          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
                        >
                          Edit schedule
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setIsEditingMembers(true);
                            setIsEditingSchedule(false);
                          }}
                          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
                        >
                          Assign people
                        </button>

                        <button
                          type="button"
                          onClick={async () => {
                            if (
                              typeof window !== "undefined" &&
                              !window.confirm(
                                "Delete this track template? This will delete the track, its blocks, and its assigned track members. It does not automatically delete already-created manual assignments."
                              )
                            ) {
                              return;
                            }

                            await onDeleteTrack(selectedTrack.id);
                          }}
                          disabled={saving}
                          className="inline-flex items-center gap-2 rounded-full border border-rose-400/20 bg-transparent px-4 py-2.5 text-sm font-semibold text-rose-200 transition hover:bg-rose-400/10 disabled:opacity-60"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>

                {isEditingSchedule ? (
                  <RotationTrackGridEditor
                    academicYearStart={academicYearStart}
                    blocks={selectedTrackBlocks}
                    rotations={rotations}
                    canManage={canManage}
                    saving={saving}
                    onCancel={() => setIsEditingSchedule(false)}
                    onSave={async (blocks) => {
                      await onSaveBlocks(selectedTrack.id, blocks);
                      setIsEditingSchedule(false);
                    }}
                  />
                ) : (
                  <RotationTrackSchedulePreview
                    academicYearStart={academicYearStart}
                    blocks={selectedTrackBlocks}
                    rotations={rotations}
                  />
                )}

                <RotationTrackMembersPanel
                  members={members}
                  memberships={selectedTrackMemberships}
                  editing={isEditingMembers}
                  canManage={canManage}
                  saving={saving}
                  onCancel={() => setIsEditingMembers(false)}
                  onSave={async (rosterIds) => {
                    await onSaveMembers(selectedTrack.id, rosterIds);
                    setIsEditingMembers(false);
                  }}
                />
              </>
            ) : (
              <div className="rounded-[1.8rem] border border-dashed border-white/10 bg-white/[0.03] px-6 py-16 text-center text-slate-400">
                Select a track to start editing it, or create a new one for this academic year.
              </div>
            )}
          </div>
        </div>

        {canManage ? (
          <div className="flex flex-col items-end gap-2">
            <button
              type="button"
              onClick={() => setGenerateModalOpen(true)}
              disabled={!canGenerateAssignments || saving}
              className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Sparkles className="h-4 w-4" />
              Generate Assignments
            </button>

            {generateDisabledReason ? (
              <p className="text-sm text-slate-400">{generateDisabledReason}</p>
            ) : (
              <p className="text-sm text-slate-400">
                Generated assignments will follow this year&apos;s track templates.
              </p>
            )}
          </div>
        ) : null}
      </div>

      <EditRotationTrackModal
        open={trackModalOpen}
        track={editingTrack}
        saving={saving}
        onClose={() => {
          setTrackModalOpen(false);
          setEditingTrack(null);
        }}
        onSave={async (payload) => {
          if (editingTrack) {
            await onUpdateTrack(editingTrack.id, payload);
          } else {
            await onCreateTrack({
              academicYearStart,
              name: payload.name,
              description: payload.description,
              targetPgyYear: payload.targetPgyYear,
            });
          }

          setTrackModalOpen(false);
          setEditingTrack(null);
        }}
      />

      <CopyTracksYearModal
        open={copyModalOpen}
        academicYearStart={academicYearStart}
        saving={saving}
        onClose={() => setCopyModalOpen(false)}
        onSubmit={async (payload) => {
          await onImportPreviousYear(payload);
          setCopyModalOpen(false);
        }}
      />

      <GenerateAssignmentsModal
        open={generateModalOpen}
        academicYearLabel={getAcademicYearLabel(academicYearStart)}
        trackCount={tracks.length}
        assignedPeopleCount={assignedPeopleCount}
        mode={generateMode}
        saving={saving}
        onModeChange={setGenerateMode}
        onClose={() => setGenerateModalOpen(false)}
        onGenerate={async () => {
          await onGenerateAssignments({
            academicYearStart,
            mode: generateMode,
          });
          setGenerateModalOpen(false);
        }}
      />
    </>
  );
}
