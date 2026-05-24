"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Save, Search, Users, CircleX, UserRound } from "lucide-react";
import type {
  OverviewMember,
  RotationTrackMembershipItem,
} from "@/app/work/settings/settingsclient";

function compareMembers(a: OverviewMember, b: OverviewMember) {
  const aGrad = a.gradYear ?? Number.MAX_SAFE_INTEGER;
  const bGrad = b.gradYear ?? Number.MAX_SAFE_INTEGER;
  if (aGrad !== bGrad) return aGrad - bGrad;
  return a.displayName.localeCompare(b.displayName);
}

export default function RotationTrackMembersPanel({
  members,
  memberships,
  editing,
  canManage,
  saving,
  onCancel,
  onSave,
}: {
  members: OverviewMember[];
  memberships: RotationTrackMembershipItem[];
  editing?: boolean;
  canManage: boolean;
  saving: boolean;
  onCancel?: () => void;
  onSave: (rosterIds: string[]) => Promise<void> | void;
}) {
  const [search, setSearch] = useState("");
  const [selectedRosterIds, setSelectedRosterIds] = useState<string[]>([]);

  useEffect(() => {
    setSelectedRosterIds(memberships.map((membership) => membership.rosterId));
  }, [memberships]);

  const sortedMembers = useMemo(() => [...members].sort(compareMembers), [members]);

  const filteredMembers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) return sortedMembers;

    return sortedMembers.filter((member) =>
      [
        member.displayName,
        member.trainingLevel ?? "",
        String(member.gradYear ?? ""),
        member.role ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch)
    );
  }, [search, sortedMembers]);

  const selectedSet = useMemo(() => new Set(selectedRosterIds), [selectedRosterIds]);

  function toggleRoster(rosterId: string) {
    setSelectedRosterIds((current) =>
      current.includes(rosterId)
        ? current.filter((id) => id !== rosterId)
        : [...current, rosterId]
    );
  }

  async function handleSave() {
    await onSave(selectedRosterIds);
  }

  if (!editing) {
    const assignedMembers = memberships
      .map((membership) => membership.member)
      .filter((member): member is OverviewMember => Boolean(member))
      .sort(compareMembers);

    return (
      <div className="rounded-[1.6rem] border border-white/10 bg-white/[0.04] p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sky-200">
              <Users className="h-4 w-4" />
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em]">
                Assigned people
              </p>
            </div>
            <p className="mt-2 text-sm text-slate-400">
              {assignedMembers.length
                ? "People currently assigned to this track."
                : "No people are assigned to this track yet."}
            </p>
          </div>

          <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-slate-300">
            {assignedMembers.length} assigned
          </div>
        </div>

        {assignedMembers.length ? (
          <div className="mt-5 flex flex-wrap gap-3">
            {assignedMembers.map((member) => (
              <div
                key={member.rosterId ?? member.membershipId}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#081221] px-3 py-2 text-sm text-white"
              >
                <UserRound className="h-4 w-4 text-slate-400" />
                <span>{member.displayName}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="rounded-[1.6rem] border border-white/10 bg-white/[0.04] p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sky-200">
            <Users className="h-4 w-4" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em]">
              Assigned people
            </p>
          </div>
          <p className="mt-2 text-sm text-slate-400">
            Assign anyone from the roster. Missing grad years do not block assignment.
          </p>
        </div>

        {canManage ? (
          <div className="flex flex-wrap gap-3">
            {onCancel ? (
              <button
                type="button"
                onClick={onCancel}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/[0.08] disabled:opacity-60"
              >
                <CircleX className="h-4 w-4" />
                Cancel
              </button>
            ) : null}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save people
            </button>
          </div>
        ) : null}
      </div>

      <div className="mt-4">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search roster"
            className="w-full rounded-2xl border border-white/10 bg-white/[0.05] py-3 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-sky-300/30 focus:ring-2 focus:ring-sky-300/15"
          />
        </label>
      </div>

      {!canManage ? (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-400">
          You have read-only access to track membership.
        </div>
      ) : null}

      {selectedRosterIds.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-400">
          No people are assigned to this track yet.
        </div>
      ) : null}

      <div className="mt-5 max-h-[420px] space-y-3 overflow-y-auto pr-1">
        {filteredMembers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-5 py-8 text-center text-sm text-slate-400">
            No roster members matched your search.
          </div>
        ) : (
          filteredMembers.map((member) => {
            const checked = selectedSet.has(member.rosterId ?? member.membershipId);
            const key = member.rosterId ?? member.membershipId;

            return (
              <label
                key={key}
                className={`flex cursor-pointer items-center justify-between gap-4 rounded-[1.3rem] border px-4 py-3 transition ${
                  checked
                    ? "border-sky-300/25 bg-sky-400/10"
                    : "border-white/10 bg-[#081221] hover:bg-white/[0.04]"
                }`}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">
                    {member.displayName}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-400">
                    {member.trainingLevel ? <span>{member.trainingLevel}</span> : null}
                    {member.gradYear ? <span>Grad {member.gradYear}</span> : null}
                    {member.role ? <span>{member.role}</span> : null}
                  </div>
                </div>

                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleRoster(key)}
                  disabled={!canManage}
                  className="h-4 w-4 rounded border-white/20 bg-white/10 text-sky-300"
                />
              </label>
            );
          })
        )}
      </div>
    </div>
  );
}
