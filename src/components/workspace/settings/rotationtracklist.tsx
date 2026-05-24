"use client";

import { Blocks, GraduationCap, Users } from "lucide-react";
import type {
  RotationTrackItem,
  RotationTrackMembershipItem,
  RotationTrackBlockItem,
} from "@/app/work/settings/settingsclient";

function pgyLabel(targetPgyYear: number | null) {
  if (!targetPgyYear) return "Any PGY";
  return `PGY-${targetPgyYear}`;
}

export default function RotationTrackList({
  tracks,
  selectedTrackId,
  memberships,
  blocks,
  onSelect,
}: {
  tracks: RotationTrackItem[];
  selectedTrackId: string | null;
  memberships: RotationTrackMembershipItem[];
  blocks: RotationTrackBlockItem[];
  onSelect: (trackId: string) => void;
}) {
  const memberCountByTrackId = new Map<string, number>();
  const blockCountByTrackId = new Map<string, number>();

  for (const membership of memberships) {
    memberCountByTrackId.set(
      membership.trackId,
      (memberCountByTrackId.get(membership.trackId) ?? 0) + 1
    );
  }

  for (const block of blocks) {
    blockCountByTrackId.set(block.trackId, (blockCountByTrackId.get(block.trackId) ?? 0) + 1);
  }

  return (
    <div className="space-y-3">
      {tracks.length === 0 ? (
        <div className="rounded-[1.5rem] border border-dashed border-white/10 bg-white/[0.03] px-5 py-10 text-center text-sm text-slate-400">
          No tracks created for this academic year yet.
        </div>
      ) : (
        tracks.map((track) => {
          const selected = track.id === selectedTrackId;
          const memberCount = memberCountByTrackId.get(track.id) ?? 0;
          const blockCount = blockCountByTrackId.get(track.id) ?? 0;

          return (
            <button
              key={track.id}
              type="button"
              onClick={() => onSelect(track.id)}
              className={`w-full rounded-[1.5rem] border px-4 py-4 text-left transition ${
                selected
                  ? "border-sky-300/35 bg-sky-400/10"
                  : "border-white/10 bg-white/[0.04] hover:bg-white/[0.07]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-base font-bold text-white">
                      {track.name}
                    </p>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${
                        track.isActive
                          ? "bg-emerald-400/10 text-emerald-200 ring-1 ring-emerald-300/15"
                          : "bg-white/[0.06] text-slate-300 ring-1 ring-white/10"
                      }`}
                    >
                      {track.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>

                  {track.description ? (
                    <p className="mt-2 line-clamp-2 text-sm text-slate-400">
                      {track.description}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-300">
                <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">
                  <GraduationCap className="h-3.5 w-3.5" />
                  {pgyLabel(track.targetPgyYear)}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">
                  <Users className="h-3.5 w-3.5" />
                  {memberCount} assigned
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">
                  <Blocks className="h-3.5 w-3.5" />
                  {blockCount} blocks
                </span>
              </div>
            </button>
          );
        })
      )}
    </div>
  );
}
