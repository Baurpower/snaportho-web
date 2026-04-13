"use client";

import { useMemo, useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Clock3,
  GraduationCap,
  Hospital,
  Loader2,
  PencilLine,
  Save,
  Search,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react";

/* =========================
   Types
========================= */

export type EditProgramInfo = {
  id: string;
  name: string | null;
  slug: string | null;
  institutionName: string | null;
  timezone: string | null;
};

export type EditProgramMember = {
  membershipId: string;
  rosterId: string | null;
  displayName: string;
  gradYear: number | null;
  pgyYear: number | null;
  trainingLevel: string | null;
  role: string | null;
  userId: string | null;
  isActive: boolean | null;
};

export type EditProgramRotationCatalogItem = {
  id: string;
  name: string | null;
  short_name: string | null;
  category: string | null;
  color: string | null;
  isActive: boolean | null;
  sortOrder: number | null;
};

export type EditProgramRotationAssignment = {
  id: string;
  membershipId: string | null;
  rosterId: string | null;
  memberName: string | null;
  gradYear: number | null;
  role: string | null;
  userId: string | null;
  startDate: string | null;
  endDate: string | null;
  siteLabel: string | null;
  teamLabel: string | null;
  notes: string | null;
  rotation: {
    id: string;
    name: string | null;
    short_name: string | null;
    category: string | null;
    color: string | null;
  } | null;
};

type MonthMeta = {
  key: string;
  label: string;
  shortWithYear: string;
  start: string;
  end: string;
};

type VisibleSegment = {
  id: string;
  startIndex: number;
  endIndex: number;
  block: EditProgramRotationAssignment & {
    membershipId: string;
    startDate: string;
    endDate: string;
  };
};

type DraftForm = {
  assignmentId: string | null;
  membershipId: string;
  rotationId: string;
  siteLabel: string;
  teamLabel: string;
  notes: string;
  startDate: string;
  endDate: string;
};

export type SaveRotationAssignmentPayload = {
  id?: string;
  membershipId: string;
  rotationId: string;
  startDate: string;
  endDate: string;
  siteLabel?: string | null;
  teamLabel?: string | null;
  notes?: string | null;
};

/* =========================
   Constants
========================= */

const MONTHS_PER_PAGE = 6;
const ROW_HEIGHT_PX = 176;
const INSET_PX = 12;

/* =========================
   Helpers
========================= */

function formatDateLabel(dateString: string) {
  return new Date(`${dateString}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function getAcademicYearLabel(startYear: number) {
  return `${startYear}–${startYear + 1}`;
}

function getAcademicMonths(anchorYear: number): MonthMeta[] {
  const months = [
    { year: anchorYear, month: 6 },
    { year: anchorYear, month: 7 },
    { year: anchorYear, month: 8 },
    { year: anchorYear, month: 9 },
    { year: anchorYear, month: 10 },
    { year: anchorYear, month: 11 },
    { year: anchorYear + 1, month: 0 },
    { year: anchorYear + 1, month: 1 },
    { year: anchorYear + 1, month: 2 },
    { year: anchorYear + 1, month: 3 },
    { year: anchorYear + 1, month: 4 },
    { year: anchorYear + 1, month: 5 },
  ];

  return months.map(({ year, month }) => {
    const start = new Date(Date.UTC(year, month, 1));
    const end = new Date(Date.UTC(year, month + 1, 0));
    const monthLabel = start.toLocaleDateString("en-US", {
      month: "short",
      timeZone: "UTC",
    });

    return {
      key: `${year}-${String(month + 1).padStart(2, "0")}`,
      label: monthLabel,
      shortWithYear: `${monthLabel} ${year}`,
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10),
    };
  });
}

function overlaps(startA: string, endA: string, startB: string, endB: string) {
  return startA <= endB && endA >= startB;
}

function bgForRotation(color?: string | null) {
  if (!color) return "bg-white/[0.04] border-white/10 text-white";

  const normalized = color.toLowerCase();

  if (normalized.includes("sky") || normalized.includes("blue")) {
    return "bg-sky-400/10 border-sky-300/20 text-sky-100";
  }
  if (normalized.includes("violet") || normalized.includes("purple")) {
    return "bg-violet-400/10 border-violet-300/20 text-violet-100";
  }
  if (normalized.includes("emerald") || normalized.includes("green")) {
    return "bg-emerald-400/10 border-emerald-300/20 text-emerald-100";
  }
  if (normalized.includes("amber") || normalized.includes("yellow")) {
    return "bg-amber-400/10 border-amber-300/20 text-amber-100";
  }
  if (normalized.includes("rose") || normalized.includes("red")) {
    return "bg-rose-400/10 border-rose-300/20 text-rose-100";
  }

  return "bg-white/[0.04] border-white/10 text-white";
}

function roleTone(role: string | null) {
  if (role === "resident") {
    return "bg-sky-400/10 text-sky-200 ring-sky-300/15";
  }
  if (role === "faculty") {
    return "bg-violet-400/10 text-violet-200 ring-violet-300/15";
  }
  if (role === "coordinator") {
    return "bg-emerald-400/10 text-emerald-200 ring-emerald-300/15";
  }
  if (role === "admin") {
    return "bg-amber-400/10 text-amber-200 ring-amber-300/15";
  }
  return "bg-white/[0.06] text-slate-200 ring-white/10";
}

function formatRoleLabel(role: string | null) {
  return role ?? "member";
}

function getRotationLabel(
  rotation:
    | EditProgramRotationCatalogItem
    | EditProgramRotationAssignment["rotation"]
    | null
    | undefined
) {
  return rotation?.short_name ?? rotation?.name ?? "Rotation";
}

function getVisibleSegments(
  assignments: EditProgramRotationAssignment[],
  visibleMonths: MonthMeta[]
): VisibleSegment[] {
  return assignments
    .filter(
      (
        item
      ): item is EditProgramRotationAssignment & {
        membershipId: string;
        startDate: string;
        endDate: string;
      } => !!item.membershipId && !!item.startDate && !!item.endDate
    )
    .map((item) => {
      let startIndex = -1;
      let endIndex = -1;

      for (let i = 0; i < visibleMonths.length; i += 1) {
        const month = visibleMonths[i];
        if (overlaps(item.startDate, item.endDate, month.start, month.end)) {
          if (startIndex === -1) startIndex = i;
          endIndex = i;
        }
      }

      if (startIndex === -1 || endIndex === -1) return null;

      return {
        id: item.id,
        startIndex,
        endIndex,
        block: item,
      };
    })
    .filter((segment): segment is VisibleSegment => !!segment)
    .sort((a, b) => {
      if (a.startIndex !== b.startIndex) return a.startIndex - b.startIndex;
      if (a.endIndex !== b.endIndex) return a.endIndex - b.endIndex;
      return a.block.startDate.localeCompare(b.block.startDate);
    });
}

function getEmptyMonthIndexes(
  segments: VisibleSegment[],
  monthCount: number
): number[] {
  const covered = new Set<number>();

  for (const segment of segments) {
    for (let i = segment.startIndex; i <= segment.endIndex; i += 1) {
      covered.add(i);
    }
  }

  const result: number[] = [];
  for (let i = 0; i < monthCount; i += 1) {
    if (!covered.has(i)) result.push(i);
  }
  return result;
}

function monthRangeToDates(
  visibleMonths: MonthMeta[],
  startIndex: number,
  endIndex: number
) {
  return {
    startDate: visibleMonths[startIndex].start,
    endDate: visibleMonths[endIndex].end,
  };
}

function cellLeft(index: number, monthCount: number) {
  return `${(index / monthCount) * 100}%`;
}

function cellWidth(span: number, monthCount: number) {
  return `${(span / monthCount) * 100}%`;
}

/* =========================
   Small UI bits
========================= */

function InfoCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string;
  subtitle: string;
}) {
  return (
    <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.05] p-4 shadow-[0_18px_50px_rgba(2,8,23,0.18)] backdrop-blur">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
        {title}
      </p>
      <p className="mt-2 text-xl font-black tracking-tight text-white md:text-2xl">
        {value}
      </p>
      <p className="mt-1.5 text-xs text-slate-400 md:text-sm">{subtitle}</p>
    </div>
  );
}

function SectionShell({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[1.8rem] border border-white/10 bg-white/[0.05] p-5 shadow-[0_18px_50px_rgba(2,8,23,0.18)] backdrop-blur md:p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-400/10 text-sky-300 ring-1 ring-sky-300/10">
          {icon}
        </div>
        <div>
          <h2 className="text-lg font-bold tracking-tight text-white">{title}</h2>
          <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
        </div>
      </div>

      <div className="mt-5">{children}</div>
    </div>
  );
}

/* =========================
   Modal
========================= */

function EditRotationModal({
  open,
  draft,
  member,
  visibleMonths,
  rotations,
  saving,
  onClose,
  onChange,
  onSave,
  onDelete,
}: {
  open: boolean;
  draft: DraftForm | null;
  member: EditProgramMember | null;
  visibleMonths: MonthMeta[];
  rotations: EditProgramRotationCatalogItem[];
  saving: boolean;
  onClose: () => void;
  onChange: (next: DraftForm) => void;
  onSave: () => void;
  onDelete?: () => void;
}) {
  if (!open || !draft || !member) return null;

  const selectedRotation = rotations.find((r) => r.id === draft.rotationId) ?? null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-[1.8rem] border border-white/10 bg-[#0d1728] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.45)] md:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-200">
              Edit rotation
            </p>
            <h3 className="mt-2 text-2xl font-bold text-white">{member.displayName}</h3>
            <p className="mt-2 text-sm text-slate-400">
              {formatDateLabel(draft.startDate)} – {formatDateLabel(draft.endDate)}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-slate-300 transition hover:bg-white/[0.08]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-200">
              Rotation
            </label>
            <select
              value={draft.rotationId}
              onChange={(e) => onChange({ ...draft, rotationId: e.target.value })}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none transition focus:border-sky-300/30 focus:ring-2 focus:ring-sky-300/15"
            >
              <option value="">Select rotation</option>
              {rotations.map((rotation) => (
                <option key={rotation.id} value={rotation.id} className="text-slate-950">
                  {getRotationLabel(rotation)}
                  {rotation.category ? ` • ${rotation.category}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">
              Site
            </label>
            <input
              value={draft.siteLabel}
              onChange={(e) => onChange({ ...draft, siteLabel: e.target.value })}
              placeholder="Main Hospital"
              className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-sky-300/30 focus:ring-2 focus:ring-sky-300/15"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">
              Team
            </label>
            <input
              value={draft.teamLabel}
              onChange={(e) => onChange({ ...draft, teamLabel: e.target.value })}
              placeholder="Optional"
              className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-sky-300/30 focus:ring-2 focus:ring-sky-300/15"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-200">
              Notes
            </label>
            <textarea
              value={draft.notes}
              onChange={(e) => onChange({ ...draft, notes: e.target.value })}
              rows={4}
              placeholder="Optional notes"
              className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-sky-300/30 focus:ring-2 focus:ring-sky-300/15"
            />
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            Preview
          </p>
          <div className="mt-3 grid grid-cols-6 gap-2">
            {visibleMonths.map((month) => {
              const covered = overlaps(draft.startDate, draft.endDate, month.start, month.end);
              return (
                <div
                  key={month.key}
                  className={`rounded-xl border px-3 py-2 text-center text-xs font-semibold ${
                    covered
                      ? bgForRotation(selectedRotation?.color)
                      : "border-white/10 bg-white/[0.03] text-slate-500"
                  }`}
                >
                  {month.label}
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            {draft.assignmentId ? (
              <button
                type="button"
                onClick={onDelete}
                className="inline-flex items-center gap-2 rounded-full border border-rose-400/20 bg-rose-400/10 px-4 py-2.5 text-sm font-semibold text-rose-100 transition hover:bg-rose-400/15"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={onSave}
              disabled={saving || !draft.rotationId}
              className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : draft.assignmentId ? "Save changes" : "Create assignment"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================
   Main component
========================= */

export default function EditProgramRotations({
  program,
  academicYearStart,
  academicYearLabel,
  members,
  rotations,
  assignments,
  loading = false,
  saving = false,
  onSaveAssignment,
  onDeleteAssignment,
}: {
  program: EditProgramInfo | null;
  academicYearStart: number;
  academicYearLabel?: string;
  members: EditProgramMember[];
  rotations: EditProgramRotationCatalogItem[];
  assignments: EditProgramRotationAssignment[];
  loading?: boolean;
  saving?: boolean;
  onSaveAssignment?: (payload: SaveRotationAssignmentPayload) => Promise<void> | void;
  onDeleteAssignment?: (assignmentId: string) => Promise<void> | void;
}) {
  const [search, setSearch] = useState("");
  const [monthPage, setMonthPage] = useState(0);
  const [selection, setSelection] = useState<{
    membershipId: string;
    startIndex: number;
    endIndex: number;
  } | null>(null);
  const [draft, setDraft] = useState<DraftForm | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const resolvedAcademicYearLabel =
    academicYearLabel ?? getAcademicYearLabel(academicYearStart);

  const months = useMemo(() => getAcademicMonths(academicYearStart), [academicYearStart]);

  const visibleMonths = months.slice(
    monthPage * MONTHS_PER_PAGE,
    monthPage * MONTHS_PER_PAGE + MONTHS_PER_PAGE
  );

  const canGoBack = monthPage > 0;
  const canGoForward = (monthPage + 1) * MONTHS_PER_PAGE < months.length;

  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      if (!search.trim()) return true;
      return [
        member.displayName,
        member.trainingLevel ?? "",
        String(member.gradYear ?? ""),
        member.role ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase());
    });
  }, [members, search]);

  const assignmentsByMember = useMemo(() => {
    const map = new Map<string, EditProgramRotationAssignment[]>();
    for (const assignment of assignments) {
      if (!assignment.membershipId) continue;
      const existing = map.get(assignment.membershipId) ?? [];
      existing.push(assignment);
      map.set(assignment.membershipId, existing);
    }
    return map;
  }, [assignments]);

  const visibleRangeLabel = useMemo(() => {
    if (visibleMonths.length === 0) return "";
    return `${visibleMonths[0].shortWithYear} – ${visibleMonths[visibleMonths.length - 1].shortWithYear}`;
  }, [visibleMonths]);

  const activeRotationNames = useMemo(() => {
    return rotations.filter((rotation) => rotation.name || rotation.short_name).slice(0, 10);
  }, [rotations]);

  const selectedMember = useMemo(() => {
    if (!draft?.membershipId) return null;
    return members.find((member) => member.membershipId === draft.membershipId) ?? null;
  }, [draft?.membershipId, members]);

  useEffect(() => {
    setSelection(null);
  }, [monthPage]);

  function clearSelection() {
    setSelection(null);
  }

    function closeModal() {
    setModalOpen(false);
    setDraft(null);
    clearSelection();
  }

  function openCreateModal(membershipId: string, startIndex: number, endIndex: number) {
    const normalizedStart = Math.min(startIndex, endIndex);
    const normalizedEnd = Math.max(startIndex, endIndex);
    const { startDate, endDate } = monthRangeToDates(
      visibleMonths,
      normalizedStart,
      normalizedEnd
    );

    setDraft({
      assignmentId: null,
      membershipId,
      rotationId: "",
      siteLabel: "",
      teamLabel: "",
      notes: "",
      startDate,
      endDate,
    });
    setModalOpen(true);
  }

  function openEditModal(assignment: EditProgramRotationAssignment) {
    if (!assignment.membershipId || !assignment.startDate || !assignment.endDate) return;

    setDraft({
      assignmentId: assignment.id,
      membershipId: assignment.membershipId,
      rotationId: assignment.rotation?.id ?? "",
      siteLabel: assignment.siteLabel ?? "",
      teamLabel: assignment.teamLabel ?? "",
      notes: assignment.notes ?? "",
      startDate: assignment.startDate,
      endDate: assignment.endDate,
    });
    setModalOpen(true);
  }

  function handleCellClick(member: EditProgramMember, monthIndex: number) {
    const memberAssignments = assignmentsByMember.get(member.membershipId) ?? [];
    const clickedMonth = visibleMonths[monthIndex];

    const clickedExisting = memberAssignments.find(
      (assignment) =>
        assignment.startDate &&
        assignment.endDate &&
        overlaps(
          assignment.startDate,
          assignment.endDate,
          clickedMonth.start,
          clickedMonth.end
        )
    );

    if (clickedExisting) {
      clearSelection();
      openEditModal(clickedExisting);
      return;
    }

    if (!selection || selection.membershipId !== member.membershipId) {
      setSelection({
        membershipId: member.membershipId,
        startIndex: monthIndex,
        endIndex: monthIndex,
      });
      return;
    }

    const normalizedStart = Math.min(selection.startIndex, monthIndex);
    const normalizedEnd = Math.max(selection.startIndex, monthIndex);

    openCreateModal(member.membershipId, normalizedStart, normalizedEnd);
  }

  async function handleSave() {
    if (!draft || !onSaveAssignment) return;

    await onSaveAssignment({
      id: draft.assignmentId ?? undefined,
      membershipId: draft.membershipId,
      rotationId: draft.rotationId,
      startDate: draft.startDate,
      endDate: draft.endDate,
      siteLabel: draft.siteLabel || null,
      teamLabel: draft.teamLabel || null,
      notes: draft.notes || null,
    });

    closeModal();
  }

  async function handleDelete() {
    if (!draft?.assignmentId || !onDeleteAssignment) return;
    await onDeleteAssignment(draft.assignmentId);
    closeModal();
  }

  const programDisplayName =
    program?.name ?? program?.institutionName ?? "Program rotations";

  return (
    <>
      <div className="space-y-5">
        <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.03] shadow-[0_24px_70px_rgba(2,8,23,0.22)]">
          <div className="flex flex-col gap-5 p-6 md:p-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-200">
                  Rotation editor
                </p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-white">
                  {programDisplayName}
                </h2>
                <p className="mt-2 text-sm text-slate-300">
                  Academic year {resolvedAcademicYearLabel}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 lg:w-[560px]">
                <InfoCard
                  title="Residents"
                  value={String(filteredMembers.length)}
                  subtitle="Visible in current filter"
                />
                <InfoCard
                  title="Rotations"
                  value={String(rotations.length)}
                  subtitle="Available to assign"
                />
                <InfoCard
                  title="Mode"
                  value="Span edit"
                  subtitle="Click start month, then end month"
                />
              </div>
            </div>
          </div>
        </div>

        <SectionShell
          title="Edit yearly schedule"
          subtitle="Click empty months to create a span. Click any existing block to edit it."
          icon={<PencilLine className="h-5 w-5" />}
        >
          <div className="space-y-4">
            <div className="rounded-2xl border border-amber-300/15 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
              <span className="font-semibold">Quick add:</span> click one month to start, click a
              later month to finish. Since each resident can only have one rotation at a time, this
              stays fast and clean.
            </div>

            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center">
                <label className="relative block w-full max-w-md">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search residents"
                    className="w-full rounded-2xl border border-white/10 bg-white/10 py-3 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-sky-300/40 focus:ring-2 focus:ring-sky-300/20"
                  />
                </label>

                <div className="flex flex-wrap gap-2">
                  {activeRotationNames.map((rotation) => (
                    <span
                      key={rotation.id}
                      className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold ${bgForRotation(
                        rotation.color
                      )}`}
                    >
                      {getRotationLabel(rotation)}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMonthPage((prev) => Math.max(prev - 1, 0))}
                  disabled={!canGoBack}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-slate-200">
                  {visibleRangeLabel}
                </div>

                <button
                  type="button"
                  onClick={() => setMonthPage((prev) => prev + 1)}
                  disabled={!canGoForward}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/[0.03]">
              <div className="overflow-x-auto">
                <div className="min-w-[1120px]">
                  <div className="grid grid-cols-[300px_repeat(6,minmax(0,1fr))] border-b border-white/10 bg-white/[0.03]">
                    <div className="border-r border-white/10 px-5 py-4">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        <Users className="h-3.5 w-3.5" />
                        People
                      </div>
                    </div>

                    {visibleMonths.map((month) => (
                      <div
                        key={month.key}
                        className="border-r border-white/10 px-4 py-4 text-center last:border-r-0"
                      >
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                          {month.label}
                        </div>
                      </div>
                    ))}
                  </div>

                  {loading ? (
                    <div className="flex items-center justify-center gap-3 px-6 py-14 text-slate-300">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Loading rotation schedule...
                    </div>
                  ) : filteredMembers.length === 0 ? (
                    <div className="px-6 py-14 text-center text-slate-400">
                      No residents matched your search.
                    </div>
                  ) : (
                    filteredMembers.map((member) => {
                      const memberAssignments = assignmentsByMember.get(member.membershipId) ?? [];
                      const segments = getVisibleSegments(memberAssignments, visibleMonths);
                      const emptyIndexes = getEmptyMonthIndexes(
                        segments,
                        visibleMonths.length
                      );

                      return (
                        <div
                          key={member.membershipId}
                          className="grid grid-cols-[300px_repeat(6,minmax(0,1fr))] border-b border-white/10 last:border-b-0"
                        >
                          <div
                            className="border-r border-white/10 px-5 py-4"
                            style={{ minHeight: `${ROW_HEIGHT_PX}px` }}
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.06] text-slate-300">
                                <UserRound className="h-5 w-5" />
                              </div>

                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="truncate text-sm font-bold text-white">
                                    {member.displayName}
                                  </p>

                                  <span
                                    className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ring-1 ${roleTone(
                                      member.role
                                    )}`}
                                  >
                                    {formatRoleLabel(member.role)}
                                  </span>
                                </div>

                                <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-400">
                                  {member.trainingLevel ? (
                                    <span className="inline-flex items-center gap-1">
                                      <GraduationCap className="h-3.5 w-3.5" />
                                      {member.trainingLevel}
                                    </span>
                                  ) : null}

                                  {member.gradYear ? <span>Grad {member.gradYear}</span> : null}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div
                            className="relative col-span-6"
                            style={{ height: `${ROW_HEIGHT_PX}px` }}
                          >
                            <div className="absolute inset-0 grid grid-cols-6">
                              {visibleMonths.map((month, idx) => {
                                const isSelected =
                                  selection?.membershipId === member.membershipId &&
                                  idx >= Math.min(selection.startIndex, selection.endIndex) &&
                                  idx <= Math.max(selection.startIndex, selection.endIndex);

                                return (
                                  <button
                                    key={`${member.membershipId}-${month.key}`}
                                    type="button"
                                    onClick={() => handleCellClick(member, idx)}
                                    className={`border-r border-white/10 transition last:border-r-0 ${
                                      isSelected ? "bg-sky-400/10" : "hover:bg-white/[0.04]"
                                    }`}
                                  />
                                );
                              })}
                            </div>

                            {emptyIndexes.map((index) => (
                              <div
                                key={`${member.membershipId}-empty-${index}`}
                                className="pointer-events-none absolute"
                                style={{
                                  top: `${INSET_PX}px`,
                                  bottom: `${INSET_PX}px`,
                                  left: cellLeft(index, visibleMonths.length),
                                  width: cellWidth(1, visibleMonths.length),
                                }}
                              >
                                <div className="mx-3 flex h-full items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-3 text-center text-xs text-slate-500">
                                  Add rotation
                                </div>
                              </div>
                            ))}

                            {segments.map((segment) => (
                              <button
                                key={`${member.membershipId}-${segment.id}`}
                                type="button"
                                onClick={() => openEditModal(segment.block)}
                                className="absolute text-left transition hover:brightness-110"
                                style={{
                                  top: `${INSET_PX}px`,
                                  bottom: `${INSET_PX}px`,
                                  left: cellLeft(segment.startIndex, visibleMonths.length),
                                  width: cellWidth(
                                    segment.endIndex - segment.startIndex + 1,
                                    visibleMonths.length
                                  ),
                                }}
                              >
                                <div
                                  className={`mx-3 h-full rounded-2xl border px-3 py-3 ${bgForRotation(
                                    segment.block.rotation?.color
                                  )}`}
                                >
                                  <div className="flex h-full flex-col overflow-hidden">
                                    <p className="truncate text-sm font-bold">
                                      {getRotationLabel(segment.block.rotation)}
                                    </p>

                                    <div className="mt-2 flex-1 overflow-hidden text-[11px] opacity-80">
                                      {segment.block.siteLabel ? (
                                        <div className="truncate">
                                          <span className="inline-flex items-center gap-1.5">
                                            <Hospital className="h-3 w-3 shrink-0" />
                                            <span className="truncate">{segment.block.siteLabel}</span>
                                          </span>
                                        </div>
                                      ) : null}

                                      <div className="mt-2 truncate">
                                        <span className="inline-flex items-center gap-1.5">
                                          <Clock3 className="h-3 w-3 shrink-0" />
                                          <span className="truncate">
                                            {formatDateLabel(segment.block.startDate)} –{" "}
                                            {formatDateLabel(segment.block.endDate)}
                                          </span>
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </SectionShell>
      </div>

      <EditRotationModal
        open={modalOpen}
        draft={draft}
        member={selectedMember}
        visibleMonths={visibleMonths}
        rotations={rotations}
        saving={saving}
        onClose={closeModal}
        onChange={setDraft}
        onSave={() => void handleSave()}
        onDelete={draft?.assignmentId ? () => void handleDelete() : undefined}
      />
    </>
  );
}