"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  PencilLine,
  Save,
 Search,
  Settings2,
  Users,
  X,
} from "lucide-react";
import ProgramRotations from "@/components/workspace/settings/programrotations";
import EditProgramRotations from "@/components/workspace/settings/editprogramrotations";

export type OverviewProgram = {
  id: string;
  name: string | null;
  slug: string | null;
  institutionName: string | null;
  timezone: string | null;
};

type RawOverviewProgram =
  | {
      id?: string | null;
      name?: string | null;
      slug?: string | null;
      institutionName?: string | null;
      institution_name?: string | null;
      timezone?: string | null;
    }
  | null
  | undefined;

type MeProgramResponse = {
  program?: {
    id?: string | null;
    name?: string | null;
    slug?: string | null;
    institutionName?: string | null;
    institution_name?: string | null;
    timezone?: string | null;
    city?: string | null;
    state?: string | null;
  } | null;
  error?: string;
};

export type OverviewMember = {
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

export type OverviewRotationCatalogItem = {
  id: string;
  name: string | null;
  shortName: string | null;
  category: string | null;
  color: string | null;
  isActive: boolean | null;
  sortOrder: number | null;
};

export type OverviewAssignment = {
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

type RawOverviewResponse = {
  program?: RawOverviewProgram;
  academicYearStart?: number | null;
  academicYearLabel?: string | null;
  rangeStart?: string | null;
  rangeEnd?: string | null;
  members?: OverviewMember[];
  rotations?: OverviewRotationCatalogItem[];
  assignments?: OverviewAssignment[];
  error?: string;
} | null;

export type RotationBlock = {
  id: string;
  memberId: string;
  startDate: string;
  endDate: string;
  rotationId: string | null;
  rotationName: string;
  shortName: string | null;
  siteLabel: string | null;
  teamLabel: string | null;
  color: string | null;
};

export type MonthMeta = {
  key: string;
  label: string;
  shortWithYear: string;
  start: string;
  end: string;
};

type EditProgramInfo = {
  id: string;
  name: string | null;
  slug: string | null;
  institutionName: string | null;
  timezone: string | null;
};

type EditProgramMember = OverviewMember;

type EditProgramRotationCatalogItem = {
  id: string;
  name: string | null;
  short_name: string | null;
  category: string | null;
  color: string | null;
  isActive: boolean | null;
  sortOrder: number | null;
};

type EditProgramRotationAssignment = {
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

type SaveRotationAssignmentPayload = {
  id?: string;
  membershipId: string;
  rotationId: string;
  startDate: string;
  endDate: string;
  siteLabel?: string | null;
  teamLabel?: string | null;
  notes?: string | null;
};

type RotationMutationResponse = {
  message?: string;
  assignment?: EditProgramRotationAssignment;
  error?: string;
};

const MONTHS_PER_PAGE = 6;

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

function getAcademicStartYear(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth();
  return month >= 6 ? year : year - 1;
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

function normalizeProgram(
  program: RawOverviewProgram | MeProgramResponse["program"]
): OverviewProgram | null {
  if (!program) return null;

  const id =
    typeof program.id === "string" && program.id.trim() ? program.id.trim() : null;

  if (!id) return null;

  const name =
    typeof program.name === "string" && program.name.trim()
      ? program.name.trim()
      : null;

  const slug =
    typeof program.slug === "string" && program.slug.trim()
      ? program.slug.trim()
      : null;

  const institutionName =
    typeof program.institutionName === "string" && program.institutionName.trim()
      ? program.institutionName.trim()
      : typeof program.institution_name === "string" && program.institution_name.trim()
      ? program.institution_name.trim()
      : null;

  const timezone =
    typeof program.timezone === "string" && program.timezone.trim()
      ? program.timezone.trim()
      : null;

  return {
    id,
    name,
    slug,
    institutionName,
    timezone,
  };
}

function getProgramDisplayName(program: OverviewProgram | null) {
  if (program?.name && program.name.trim()) return program.name.trim();
  if (program?.institutionName && program.institutionName.trim()) {
    return program.institutionName.trim();
  }
  return "Your Program";
}

function getProgramSecondaryLabel(program: OverviewProgram | null) {
  if (!program) return null;

  if (
    program.institutionName &&
    program.name &&
    program.institutionName.trim() !== program.name.trim()
  ) {
    return program.institutionName.trim();
  }

  return null;
}

function SectionShell({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle: string;
  icon: ReactNode;
  children: ReactNode;
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

function SummaryStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-lg font-bold text-white">{value}</p>
    </div>
  );
}

function normalizeAssignments(assignments: OverviewAssignment[]): RotationBlock[] {
  return assignments
    .filter(
      (
        item
      ): item is OverviewAssignment & {
        membershipId: string;
        startDate: string;
        endDate: string;
      } => !!item.membershipId && !!item.startDate && !!item.endDate
    )
    .map((item) => ({
      id: item.id,
      memberId: item.membershipId,
      startDate: item.startDate,
      endDate: item.endDate,
      rotationId: item.rotation?.id ?? null,
      rotationName: item.rotation?.name ?? "Rotation",
      shortName: item.rotation?.short_name ?? null,
      siteLabel: item.siteLabel ?? null,
      teamLabel: item.teamLabel ?? null,
      color: item.rotation?.color ?? null,
    }));
}

function sortAssignments<
  T extends {
    memberName: string | null;
    startDate: string | null;
    endDate: string | null;
  }
>(items: T[]) {
  return [...items].sort((a, b) => {
    const aName = a.memberName ?? "";
    const bName = b.memberName ?? "";
    if (aName !== bName) return aName.localeCompare(bName);

    const aStart = a.startDate ?? "";
    const bStart = b.startDate ?? "";
    if (aStart !== bStart) return aStart.localeCompare(bStart);

    const aEnd = a.endDate ?? "";
    const bEnd = b.endDate ?? "";
    return aEnd.localeCompare(bEnd);
  });
}

function upsertAssignment<
  T extends {
    id: string;
    memberName: string | null;
    startDate: string | null;
    endDate: string | null;
  }
>(items: T[], nextItem: T) {
  const filtered = items.filter((item) => item.id !== nextItem.id);
  filtered.push(nextItem);
  return sortAssignments(filtered);
}

export default function ProgramSettingsPage() {
  const [search, setSearch] = useState("");
  const [monthPage, setMonthPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [program, setProgram] = useState<OverviewProgram | null>(null);
  const [fallbackProgram, setFallbackProgram] = useState<OverviewProgram | null>(null);
  const [academicYearStart, setAcademicYearStart] = useState<number>(
    getAcademicStartYear()
  );
  const [academicYearLabel, setAcademicYearLabel] = useState<string>(
    getAcademicYearLabel(getAcademicStartYear())
  );
  const [members, setMembers] = useState<OverviewMember[]>([]);
  const [rotationCatalog, setRotationCatalog] = useState<OverviewRotationCatalogItem[]>([]);
  const [assignments, setAssignments] = useState<OverviewAssignment[]>([]);
  const [draftAssignments, setDraftAssignments] = useState<EditProgramRotationAssignment[]>([]);

  const [selectedRotationIds, setSelectedRotationIds] = useState<string[]>([]);
  const [rotationFilterOpen, setRotationFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement | null>(null);

  const months = useMemo(
    () => getAcademicMonths(academicYearStart),
    [academicYearStart]
  );

  const visibleMonths = months.slice(
    monthPage * MONTHS_PER_PAGE,
    monthPage * MONTHS_PER_PAGE + MONTHS_PER_PAGE
  );

  const canGoBack = monthPage > 0;
  const canGoForward = (monthPage + 1) * MONTHS_PER_PAGE < months.length;

  useEffect(() => {
    let cancelled = false;

    async function loadOverview() {
      try {
        setLoading(true);
        setLoadError(null);

        const targetAcademicYearStart = getAcademicStartYear();

        const response = await fetch(
          `/api/program/settings/overview?academicYearStart=${targetAcademicYearStart}`,
          {
            credentials: "include",
            cache: "no-store",
          }
        );

        const payload = (await response.json().catch(() => null)) as RawOverviewResponse;

        if (!response.ok) {
          throw new Error(payload?.error ?? "Failed to load program settings.");
        }

        if (cancelled) return;

        const nextProgram = normalizeProgram(payload?.program);
        const nextMembers = Array.isArray(payload?.members) ? payload.members : [];
        const nextRotations = Array.isArray(payload?.rotations) ? payload.rotations : [];
        const nextAssignments = Array.isArray(payload?.assignments)
          ? payload.assignments
          : [];

        setProgram(nextProgram);
        setAcademicYearStart(payload?.academicYearStart ?? targetAcademicYearStart);
        setAcademicYearLabel(
          payload?.academicYearLabel ?? getAcademicYearLabel(targetAcademicYearStart)
        );
        setMembers(nextMembers);
        setRotationCatalog(nextRotations);
        setAssignments(sortAssignments(nextAssignments));
        setDraftAssignments(sortAssignments(nextAssignments));
        setSelectedRotationIds([]);
        setMonthPage(0);
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error ? error.message : "Failed to load program settings."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadOverview();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadFallbackProgram() {
      try {
        const response = await fetch("/api/me/program", {
          credentials: "include",
          cache: "no-store",
        });

        const payload = (await response.json().catch(() => null)) as MeProgramResponse;

        if (!response.ok || cancelled) return;

        const nextFallbackProgram = normalizeProgram(payload?.program);

        if (!cancelled) {
          setFallbackProgram(nextFallbackProgram);
        }
      } catch {
        // ignore fallback failures
      }
    }

    loadFallbackProgram();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!filterRef.current) return;
      if (!filterRef.current.contains(event.target as Node)) {
        setRotationFilterOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const normalizedAssignments = useMemo(
    () => normalizeAssignments(assignments),
    [assignments]
  );

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

  const rotationOptions = useMemo(() => {
    return [...rotationCatalog]
      .filter((rotation) => rotation.name || rotation.shortName)
      .sort((a, b) => {
        const aOrder = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
        const bOrder = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
        if (aOrder !== bOrder) return aOrder - bOrder;

        const aLabel = a.shortName ?? a.name ?? "";
        const bLabel = b.shortName ?? b.name ?? "";
        return aLabel.localeCompare(bLabel);
      });
  }, [rotationCatalog]);

  const selectedRotationSet = useMemo(
    () => new Set(selectedRotationIds),
    [selectedRotationIds]
  );

  const hasRotationFilter = selectedRotationIds.length > 0;

  const filteredAssignments = useMemo(() => {
    if (!hasRotationFilter) return normalizedAssignments;

    return normalizedAssignments.filter(
      (assignment) =>
        assignment.rotationId && selectedRotationSet.has(assignment.rotationId)
    );
  }, [normalizedAssignments, hasRotationFilter, selectedRotationSet]);

  const filteredDraftAssignments = useMemo(() => {
    if (!hasRotationFilter) return draftAssignments;

    return draftAssignments.filter(
      (assignment) =>
        assignment.rotation?.id && selectedRotationSet.has(assignment.rotation.id)
    );
  }, [draftAssignments, hasRotationFilter, selectedRotationSet]);

  const visibleRangeLabel = useMemo(() => {
    if (visibleMonths.length === 0) return "";
    return `${visibleMonths[0].shortWithYear} – ${
      visibleMonths[visibleMonths.length - 1].shortWithYear
    }`;
  }, [visibleMonths]);

  const resolvedProgram = useMemo(
    () => program ?? fallbackProgram,
    [program, fallbackProgram]
  );

  const programDisplayName = useMemo(
    () => getProgramDisplayName(resolvedProgram),
    [resolvedProgram]
  );

  const programSecondaryLabel = useMemo(
    () => getProgramSecondaryLabel(resolvedProgram),
    [resolvedProgram]
  );

  const rotationFilterLabel = useMemo(() => {
    if (selectedRotationIds.length === 0) return "All rotations";
    if (selectedRotationIds.length === 1) {
      const match = rotationOptions.find((item) => item.id === selectedRotationIds[0]);
      return match?.shortName ?? match?.name ?? "1 rotation";
    }
    return `${selectedRotationIds.length} rotations`;
  }, [selectedRotationIds, rotationOptions]);

  const editProgram = useMemo<EditProgramInfo | null>(
    () =>
      resolvedProgram
        ? {
            id: resolvedProgram.id,
            name: resolvedProgram.name,
            slug: resolvedProgram.slug,
            institutionName: resolvedProgram.institutionName,
            timezone: resolvedProgram.timezone,
          }
        : null,
    [resolvedProgram]
  );

  const editRotationCatalog = useMemo<EditProgramRotationCatalogItem[]>(
    () =>
      rotationCatalog.map((rotation) => ({
        id: rotation.id,
        name: rotation.name,
        short_name: rotation.shortName ?? null,
        category: rotation.category,
        color: rotation.color,
        isActive: rotation.isActive,
        sortOrder: rotation.sortOrder,
      })),
    [rotationCatalog]
  );

  function toggleRotation(rotationId: string) {
    setSelectedRotationIds((prev) =>
      prev.includes(rotationId)
        ? prev.filter((id) => id !== rotationId)
        : [...prev, rotationId]
    );
  }

  function handleSelectAllRotations() {
    setSelectedRotationIds([]);
  }

  function handleClearRotationFilter() {
    setSelectedRotationIds([]);
  }

  function handleEnterEdit() {
    setSaveError(null);
    setDraftAssignments(sortAssignments(assignments));
    setIsEditing(true);
  }

  function handleCancelEdit() {
    setSaveError(null);
    setDraftAssignments(sortAssignments(assignments));
    setIsEditing(false);
  }

  function handleDoneEditing() {
    setSaveError(null);
    setIsEditing(false);
  }

  async function handleSaveAssignment(payload: SaveRotationAssignmentPayload) {
    try {
      setSaving(true);
      setSaveError(null);

      const isEdit = Boolean(payload.id);
      const url = isEdit
        ? `/api/program/rotation-assignments/${payload.id}`
        : `/api/program/rotation-assignments`;
      const method = isEdit ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = (await response.json().catch(() => null)) as
        | RotationMutationResponse
        | null;

      if (!response.ok || !result?.assignment) {
        throw new Error(result?.error ?? "Failed to save rotation assignment.");
      }

      const savedAssignment = result.assignment;

      setDraftAssignments((prev) => upsertAssignment(prev, savedAssignment));
      setAssignments((prev) => upsertAssignment(prev, savedAssignment));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save rotation assignment.";
      setSaveError(message);
      throw error;
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteAssignment(assignmentId: string) {
    try {
      setSaving(true);
      setSaveError(null);

      const response = await fetch(
        `/api/program/rotation-assignments/${assignmentId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      const result = (await response.json().catch(() => null)) as
        | { deletedId?: string; error?: string }
        | null;

      if (!response.ok) {
        throw new Error(result?.error ?? "Failed to delete rotation assignment.");
      }

      setDraftAssignments((prev) =>
        sortAssignments(prev.filter((item) => item.id !== assignmentId))
      );
      setAssignments((prev) =>
        sortAssignments(prev.filter((item) => item.id !== assignmentId))
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete rotation assignment.";
      setSaveError(message);
      throw error;
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#071120] pt-6 text-white md:pt-10">
      <section className="px-6 py-10 sm:px-8 md:py-12">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="mx-auto max-w-7xl"
        >
          <div className="mb-8">
            <div className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-200">
              <Settings2 className="mr-2 h-3.5 w-3.5" />
              Program settings
            </div>

            <div className="mt-5 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div>
                <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">
                  Program rotation settings
                </h1>
                <p className="mt-3 max-w-3xl text-base leading-7 text-slate-300">
                  Review your roster, filter rotations, and scan the academic year
                  schedule in one place.
                </p>
              </div>

              {!loading ? (
                !isEditing ? (
                  <button
                    type="button"
                    onClick={handleEnterEdit}
                    className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
                  >
                    <PencilLine className="h-4 w-4" />
                    Edit rotations
                  </button>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      disabled={saving}
                      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <X className="h-4 w-4" />
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={handleDoneEditing}
                      disabled={saving}
                      className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 disabled:opacity-60"
                    >
                      {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      Done editing
                    </button>
                  </div>
                )
              ) : null}
            </div>
          </div>

          {loadError ? (
            <div className="mb-6 rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
              {loadError}
            </div>
          ) : null}

          {saveError ? (
            <div className="mb-6 rounded-2xl border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
              {saveError}
            </div>
          ) : null}

          <div className="space-y-5">
            <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.03] shadow-[0_24px_70px_rgba(2,8,23,0.22)]">
              <div className="flex flex-col gap-5 p-5 md:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sky-200">
                      <Users className="h-4 w-4" />
                      <span className="text-[11px] font-semibold uppercase tracking-[0.22em]">
                        Active program
                      </span>
                    </div>

                    <h2 className="mt-2 truncate text-2xl font-bold tracking-tight text-white">
                      {programDisplayName}
                    </h2>

                    {programSecondaryLabel ? (
                      <p className="mt-1 truncate text-sm text-slate-400">
                        {programSecondaryLabel}
                      </p>
                    ) : null}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[420px]">
                    <SummaryStat label="People in program" value={String(members.length)} />
                    <SummaryStat label="Academic year" value={academicYearLabel} />
                    <SummaryStat
                      label="Visible after filters"
                      value={String(filteredMembers.length)}
                    />
                  </div>
                </div>
              </div>
            </div>

            <SectionShell
              title={isEditing ? "Edit rotation schedule" : "Roster and schedule"}
              subtitle={
                isEditing
                  ? "Update assignments directly. Search residents and narrow the view by rotation."
                  : "Search residents, filter by rotation, and move through the academic year."
              }
              icon={<Users className="h-5 w-5" />}
            >
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="rounded-full border border-sky-300/15 bg-sky-400/10 px-4 py-2 text-sm text-sky-100">
                    <span className="font-semibold">Academic year:</span> {academicYearLabel}
                  </div>

                  {hasRotationFilter ? (
                    <button
                      type="button"
                      onClick={handleClearRotationFilter}
                      className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/[0.08]"
                    >
                      Clear rotation filter
                    </button>
                  ) : null}
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

                    <div className="relative" ref={filterRef}>
                      <button
                        type="button"
                        onClick={() => setRotationFilterOpen((prev) => !prev)}
                        className="inline-flex min-h-[48px] items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
                      >
                        <span>{rotationFilterLabel}</span>
                        <ChevronDown
                          className={`h-4 w-4 transition ${
                            rotationFilterOpen ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      {rotationFilterOpen ? (
                        <div className="absolute left-0 z-30 mt-2 w-[320px] overflow-hidden rounded-2xl border border-white/10 bg-[#0b1728] shadow-[0_24px_70px_rgba(2,8,23,0.38)]">
                          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                            <p className="text-sm font-semibold text-white">
                              Filter rotations
                            </p>
                            <button
                              type="button"
                              onClick={handleSelectAllRotations}
                              className="text-xs font-semibold text-sky-200 transition hover:text-sky-100"
                            >
                              Show all
                            </button>
                          </div>

                          <div className="max-h-72 overflow-y-auto p-2">
                            {rotationOptions.length > 0 ? (
                              rotationOptions.map((rotation) => {
                                const checked = selectedRotationSet.has(rotation.id);
                                const label =
                                  rotation.shortName ?? rotation.name ?? "Rotation";

                                return (
                                  <button
                                    key={rotation.id}
                                    type="button"
                                    onClick={() => toggleRotation(rotation.id)}
                                    className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition hover:bg-white/[0.06]"
                                  >
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-medium text-white">
                                        {label}
                                      </p>
                                      {rotation.category ? (
                                        <p className="mt-0.5 truncate text-xs text-slate-400">
                                          {rotation.category}
                                        </p>
                                      ) : null}
                                    </div>

                                    <div
                                      className={`ml-3 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                                        checked
                                          ? "border-sky-300 bg-sky-300 text-slate-950"
                                          : "border-white/15 bg-white/[0.03] text-transparent"
                                      }`}
                                    >
                                      <Check className="h-3.5 w-3.5" />
                                    </div>
                                  </button>
                                );
                              })
                            ) : (
                              <div className="px-3 py-4 text-sm text-slate-400">
                                No active rotation catalog loaded.
                              </div>
                            )}
                          </div>
                        </div>
                      ) : null}
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

                {loading ? (
                  <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] px-6 py-14 text-slate-300">
                    <div className="flex items-center justify-center gap-3">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Loading program data...
                    </div>
                  </div>
                ) : isEditing ? (
                  <EditProgramRotations
                    program={editProgram}
                    academicYearStart={academicYearStart}
                    academicYearLabel={academicYearLabel}
                    members={filteredMembers as EditProgramMember[]}
                    rotations={editRotationCatalog}
                    assignments={filteredDraftAssignments}
                    loading={loading}
                    saving={saving}
                    onSaveAssignment={handleSaveAssignment}
                    onDeleteAssignment={handleDeleteAssignment}
                  />
                ) : (
                  <ProgramRotations
                    members={filteredMembers}
                    months={visibleMonths}
                    assignments={filteredAssignments}
                  />
                )}
              </div>
            </SectionShell>
          </div>
        </motion.div>
      </section>
    </main>
  );
}