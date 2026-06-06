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
  Shapes,
  Stethoscope,
  Users,
  X,
} from "lucide-react";
import ProgramRotations from "@/components/workspace/settings/programrotations";
import EditProgramRotations from "@/components/workspace/settings/editprogramrotations";
import ProgramAttendingsManager from "@/components/workspace/settings/programattendingsmanager";
import RotationSettingsSegmentedControl from "@/components/workspace/settings/rotationsettingssegmentedcontrol";
import RotationTracksManager from "@/components/workspace/settings/rotationtracksmanager";
import { isVisibleResidentForAcademicYear } from "@/lib/workspace/pgy";
import { useWorkspacePermissions } from "@/hooks/useWorkspacePermissions";

export type GenerateAssignmentsMode = "overwrite_generated" | "fill_gaps";
export type RotationSettingsTab = "tracks" | "assignments";

export type OverviewProgram = {
  id: string;
  name: string | null;
  slug: string | null;
  institutionName: string | null;
  timezone: string | null;
  city?: string | null;
  state?: string | null;
};

type RawOverviewProgram =
  | {
      id?: string | null;
      name?: string | null;
      slug?: string | null;
      institutionName?: string | null;
      institution_name?: string | null;
      timezone?: string | null;
      city?: string | null;
      state?: string | null;
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
  programMembershipId?: string | null;
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
  programMembershipId?: string | null;
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
  sourceKind: string | null;
  trackId: string | null;
  trackBlockId: string | null;
  rotation: {
    id: string;
    name: string | null;
    short_name: string | null;
    category: string | null;
    color: string | null;
  } | null;
};

export type RotationTrackItem = {
  id: string;
  programId: string;
  academicYearStart: number;
  name: string;
  description: string | null;
  targetPgyYear: number | null;
  sortOrder: number | null;
  isActive: boolean | null;
  copiedFromTrackId: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RotationTrackBlockItem = {
  id: string;
  trackId: string;
  rotationId: string;
  startDate: string;
  endDate: string;
  siteLabel: string | null;
  teamLabel: string | null;
  notes: string | null;
  sortOrder: number | null;
  createdAt: string;
  updatedAt: string;
  rotation: {
    id: string;
    name: string | null;
    shortName: string | null;
    category: string | null;
    color: string | null;
  } | null;
};

export type RotationTrackMembershipItem = {
  id: string;
  trackId: string;
  rosterId: string;
  programMembershipId: string | null;
  createdAt: string;
  updatedAt: string;
  member: OverviewMember | null;
};

type RawOverviewResponse = {
  program?: RawOverviewProgram;
  academicYearStart?: number | null;
  academicYearLabel?: string | null;
  members?: OverviewMember[];
  rotations?: OverviewRotationCatalogItem[];
  tracks?: RotationTrackItem[];
  trackBlocks?: RotationTrackBlockItem[];
  trackMemberships?: RotationTrackMembershipItem[];
  assignments?: OverviewAssignment[];
  permissions?: {
    canManageRotationSettings?: boolean;
  } | null;
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
  sourceKind: string | null;
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
  programMembershipId?: string | null;
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
  sourceKind: string | null;
  trackId: string | null;
  trackBlockId: string | null;
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
  rosterId: string;
  membershipId?: string;
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

type Banner = {
  tone: "error" | "success";
  message: string;
} | null;

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
    city:
      typeof program.city === "string" && program.city.trim() ? program.city.trim() : null,
    state:
      typeof program.state === "string" && program.state.trim()
        ? program.state.trim()
        : null,
  };
}

function SectionShell({
  title,
  subtitle,
  icon,
  headerActions,
  children,
}: {
  title: string;
  subtitle: string;
  icon: ReactNode;
  headerActions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[1.8rem] border border-white/10 bg-white/[0.05] p-5 shadow-[0_18px_50px_rgba(2,8,23,0.18)] backdrop-blur md:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-400/10 text-sky-300 ring-1 ring-sky-300/10">
            {icon}
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-white">{title}</h2>
            <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
          </div>
        </div>

        {headerActions ? (
          <div className="flex flex-wrap items-center gap-3 lg:justify-end">
            {headerActions}
          </div>
        ) : null}
      </div>

      <div className="mt-5">{children}</div>
    </div>
  );
}

function getAcademicYearOptions(selectedAcademicYearStart: number) {
  const currentAcademicYear =
    new Date().getMonth() >= 6 ? new Date().getFullYear() : new Date().getFullYear() - 1;
  const options = new Set<number>();
  for (let offset = -2; offset <= 2; offset += 1) {
    options.add(currentAcademicYear + offset);
  }
  options.add(selectedAcademicYearStart);
  return Array.from(options).sort((a, b) => a - b);
}

function AcademicYearSelector({
  academicYearStart,
  onChange,
}: {
  academicYearStart: number;
  onChange: (year: number) => void;
}) {
  const yearOptions = getAcademicYearOptions(academicYearStart);

  return (
    <label className="inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white">
      <span className="font-semibold text-slate-300">Academic year</span>
      <select
        value={academicYearStart}
        onChange={(event) => onChange(Number(event.target.value))}
        className="rounded-xl border border-white/10 bg-[#0b1728] px-3 py-2 text-sm text-white outline-none"
      >
        {yearOptions.map((year) => (
          <option key={year} value={year}>
            {getAcademicYearLabel(year)}
          </option>
        ))}
      </select>
    </label>
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
      memberId: item.rosterId ?? item.membershipId,
      startDate: item.startDate,
      endDate: item.endDate,
      rotationId: item.rotation?.id ?? null,
      rotationName: item.rotation?.name ?? "Rotation",
      shortName: item.rotation?.short_name ?? null,
      siteLabel: item.siteLabel ?? null,
      teamLabel: item.teamLabel ?? null,
      color: item.rotation?.color ?? null,
      sourceKind: item.sourceKind ?? null,
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

function formatImportSummary(summary: {
  createdTracksCount: number;
  createdBlocksCount: number;
  createdMembershipsCount: number;
  skippedRosterIds: string[];
}) {
  const skipped = summary.skippedRosterIds.length;
  return `Imported ${summary.createdTracksCount} tracks, ${summary.createdBlocksCount} blocks, and ${summary.createdMembershipsCount} memberships${skipped > 0 ? ` with ${skipped} skipped roster rows` : ""}.`;
}

function formatGenerationSummary(summary: {
  createdCount: number;
  deletedCount: number;
  skippedCount: number;
}) {
  return `Generated ${summary.createdCount} assignments, removed ${summary.deletedCount} generated assignments, and skipped ${summary.skippedCount} overlapping items.`;
}

function matchesMemberSearch(member: OverviewMember, search: string) {
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
}

export default function ProgramSettingsPage() {
  const { permissions } = useWorkspacePermissions();
  const [activeTab, setActiveTab] = useState<RotationSettingsTab>("assignments");
  const [search, setSearch] = useState("");
  const [monthPage, setMonthPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [mutating, setMutating] = useState(false);
  const [banner, setBanner] = useState<Banner>(null);
  const [isEditingAssignments, setIsEditingAssignments] = useState(false);

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
  const [tracks, setTracks] = useState<RotationTrackItem[]>([]);
  const [trackBlocks, setTrackBlocks] = useState<RotationTrackBlockItem[]>([]);
  const [trackMemberships, setTrackMemberships] = useState<RotationTrackMembershipItem[]>([]);
  const [assignments, setAssignments] = useState<OverviewAssignment[]>([]);
  const [draftAssignments, setDraftAssignments] = useState<EditProgramRotationAssignment[]>([]);
  const [canManageRotationSettings, setCanManageRotationSettings] = useState(false);
  const isAdminMode = permissions?.mode === "admin";
  const canManageAttendingsFallback =
    Boolean(permissions?.canEditCallAssignments) ||
    Boolean(permissions?.canManageProgramSettings);

  const [selectedRotationIds, setSelectedRotationIds] = useState<string[]>([]);
  const [rotationFilterOpen, setRotationFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement | null>(null);

  const months = useMemo(() => getAcademicMonths(academicYearStart), [academicYearStart]);

  const visibleMonths = months.slice(
    monthPage * MONTHS_PER_PAGE,
    monthPage * MONTHS_PER_PAGE + MONTHS_PER_PAGE
  );

  const canGoBack = monthPage > 0;
  const canGoForward = (monthPage + 1) * MONTHS_PER_PAGE < months.length;

  async function loadOverview(targetAcademicYearStart: number) {
    setLoading(true);
    setBanner(null);

    try {
      const response = await fetch(
        `/api/program/rotation-settings/overview?academicYearStart=${targetAcademicYearStart}`,
        {
          credentials: "include",
          cache: "no-store",
        }
      );

      const payload = (await response.json().catch(() => null)) as RawOverviewResponse;

      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to load program settings.");
      }

      const nextProgram = normalizeProgram(payload?.program);
      const nextMembers = Array.isArray(payload?.members) ? payload.members : [];
      const nextRotations = Array.isArray(payload?.rotations) ? payload.rotations : [];
      const nextTracks = Array.isArray(payload?.tracks) ? payload.tracks : [];
      const nextTrackBlocks = Array.isArray(payload?.trackBlocks) ? payload.trackBlocks : [];
      const nextTrackMemberships = Array.isArray(payload?.trackMemberships)
        ? payload.trackMemberships
        : [];
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
      setTracks(nextTracks);
      setTrackBlocks(nextTrackBlocks);
      setTrackMemberships(nextTrackMemberships);
      setAssignments(sortAssignments(nextAssignments));
      setDraftAssignments(sortAssignments(nextAssignments));
      setCanManageRotationSettings(
        Boolean(payload?.permissions?.canManageRotationSettings)
      );
      setSelectedRotationIds([]);
      setMonthPage(0);
    } catch (error) {
      setBanner({
        tone: "error",
        message:
          error instanceof Error ? error.message : "Failed to load program settings.",
      });
    } finally {
      setLoading(false);
    }
  }

  function handleAcademicYearChange(year: number) {
    setIsEditingAssignments(false);
    setSearch("");
    setSelectedRotationIds([]);
    loadOverview(year);
  }

  useEffect(() => {
    loadOverview(getAcademicStartYear());
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

  const visibleResidentMembers = useMemo(
    () =>
      members.filter((member) =>
        isVisibleResidentForAcademicYear({
          gradYear: member.gradYear,
          role: member.role,
          academicYearStart,
        })
      ),
    [members, academicYearStart]
  );

  const visibleResidentIds = useMemo(
    () =>
      new Set(
        visibleResidentMembers.map((member) => member.rosterId ?? member.membershipId)
      ),
    [visibleResidentMembers]
  );

  const filteredMembers = useMemo(
    () => visibleResidentMembers.filter((member) => matchesMemberSearch(member, search)),
    [visibleResidentMembers, search]
  );

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
    const visibleAssignments = normalizedAssignments.filter((assignment) =>
      visibleResidentIds.has(assignment.memberId)
    );

    if (!hasRotationFilter) return visibleAssignments;

    return visibleAssignments.filter(
      (assignment) =>
        assignment.rotationId && selectedRotationSet.has(assignment.rotationId)
    );
  }, [
    normalizedAssignments,
    hasRotationFilter,
    selectedRotationSet,
    visibleResidentIds,
  ]);

  const filteredDraftAssignments = useMemo(() => {
    const visibleAssignments = draftAssignments.filter((assignment) => {
      const memberId = assignment.rosterId ?? assignment.membershipId;
      return memberId ? visibleResidentIds.has(memberId) : false;
    });

    if (!hasRotationFilter) return visibleAssignments;

    return visibleAssignments.filter(
      (assignment) =>
        assignment.rotation?.id && selectedRotationSet.has(assignment.rotation.id)
    );
  }, [draftAssignments, hasRotationFilter, selectedRotationSet, visibleResidentIds]);

  const visibleTrackMemberships = useMemo(
    () =>
      trackMemberships.filter((membership) => visibleResidentIds.has(membership.rosterId)),
    [trackMemberships, visibleResidentIds]
  );

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

  async function runMutation<T>(
    work: () => Promise<T>,
    successMessage?: (result: T) => string
  ) {
    try {
      setMutating(true);
      setBanner(null);
      const result = await work();
      if (successMessage) {
        setBanner({ tone: "success", message: successMessage(result) });
      }
      return result;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "The request could not be completed.";
      setBanner({ tone: "error", message });
      throw error;
    } finally {
      setMutating(false);
    }
  }

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
    setBanner(null);
    setDraftAssignments(sortAssignments(assignments));
    setIsEditingAssignments(true);
  }

  function handleCancelEdit() {
    setBanner(null);
    setDraftAssignments(sortAssignments(assignments));
    setIsEditingAssignments(false);
  }

  function handleDoneEditing() {
    setBanner(null);
    setIsEditingAssignments(false);
  }

  async function handleSaveAssignment(payload: SaveRotationAssignmentPayload) {
    await runMutation(
      async () => {
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
        await refreshCurrentYear();
        return savedAssignment;
      },
      () => "Rotation assignment saved."
    );
  }

  async function handleDeleteAssignment(assignmentId: string) {
    await runMutation(
      async () => {
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

        return assignmentId;
      },
      () => "Rotation assignment deleted."
    );
  }

  async function refreshCurrentYear() {
    await loadOverview(academicYearStart);
  }

  async function handleCreateTrack(payload: {
    academicYearStart: number;
    name: string;
    description: string | null;
    targetPgyYear: number | null;
  }) {
    await runMutation(
      async () => {
        const response = await fetch("/api/program/rotation-tracks", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            academicYearStart: payload.academicYearStart,
            name: payload.name,
            description: payload.description,
            targetPgyYear: payload.targetPgyYear,
          }),
        });

        const result = (await response.json().catch(() => null)) as
          | { item?: RotationTrackItem; error?: string }
          | null;

        if (!response.ok || !result?.item) {
          throw new Error(result?.error ?? "Failed to create track.");
        }

        await refreshCurrentYear();
        return result.item;
      },
      (item) => `Created track "${item.name}".`
    );
  }

  async function handleUpdateTrack(
    trackId: string,
    payload: {
      name: string;
      description: string | null;
      targetPgyYear: number | null;
      isActive?: boolean;
    }
  ) {
    await runMutation(
      async () => {
        const response = await fetch(`/api/program/rotation-tracks/${trackId}`, {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const result = (await response.json().catch(() => null)) as
          | { item?: RotationTrackItem; error?: string }
          | null;

        if (!response.ok || !result?.item) {
          throw new Error(result?.error ?? "Failed to update track.");
        }

        await refreshCurrentYear();
        return result.item;
      },
      (item) => `Saved track "${item.name}".`
    );
  }

  async function handleDeleteTrack(trackId: string) {
    await runMutation(
      async () => {
        const response = await fetch(`/api/program/rotation-tracks/${trackId}`, {
          method: "DELETE",
          credentials: "include",
        });

        const result = (await response.json().catch(() => null)) as
          | { item?: { id: string }; error?: string }
          | null;

        if (!response.ok) {
          throw new Error(result?.error ?? "Failed to delete track.");
        }

        await refreshCurrentYear();
        return trackId;
      },
      () => "Track deleted."
    );
  }

  async function handleSaveTrackBlocks(
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
  ) {
    await runMutation(
      async () => {
        const response = await fetch(`/api/program/rotation-tracks/${trackId}/blocks`, {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ blocks }),
        });

        const result = (await response.json().catch(() => null)) as
          | { items?: RotationTrackBlockItem[]; error?: string }
          | null;

        if (!response.ok || !result?.items) {
          throw new Error(result?.error ?? "Failed to save track blocks.");
        }

        await refreshCurrentYear();
        return result.items;
      },
      () => "Track blocks saved."
    );
  }

  async function handleSaveTrackMembers(trackId: string, rosterIds: string[]) {
    await runMutation(
      async () => {
        const response = await fetch(`/api/program/rotation-tracks/${trackId}/members`, {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ rosterIds }),
        });

        const result = (await response.json().catch(() => null)) as
          | { items?: RotationTrackMembershipItem[]; error?: string }
          | null;

        if (!response.ok || !result?.items) {
          throw new Error(result?.error ?? "Failed to save assigned people.");
        }

        await refreshCurrentYear();
        return result.items;
      },
      () => "Assigned people saved."
    );
  }

  async function handleImportPreviousYear(payload: {
    fromAcademicYearStart: number;
    toAcademicYearStart: number;
    copyMemberships: boolean;
  }) {
    await runMutation(
      async () => {
        const response = await fetch("/api/program/rotation-tracks/import", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const result = (await response.json().catch(() => null)) as
          | {
              success?: boolean;
              summary?: {
                createdTracksCount: number;
                createdBlocksCount: number;
                createdMembershipsCount: number;
                skippedRosterIds: string[];
              };
              error?: string;
            }
          | null;

        if (!response.ok || !result?.summary) {
          throw new Error(result?.error ?? "Failed to import tracks.");
        }

        await refreshCurrentYear();
        return result.summary;
      },
      formatImportSummary
    );
  }

  async function handleGenerateAssignments(payload: {
    academicYearStart: number;
    mode: GenerateAssignmentsMode;
  }) {
    await runMutation(
      async () => {
        const response = await fetch(
          "/api/program/rotation-tracks/generate-assignments",
          {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          }
        );

        const result = (await response.json().catch(() => null)) as
          | {
              success?: boolean;
              summary?: {
                createdCount: number;
                deletedCount: number;
                skippedCount: number;
              };
              error?: string;
            }
          | null;

        if (!response.ok || !result?.summary) {
          throw new Error(result?.error ?? "Failed to generate assignments.");
        }

        await refreshCurrentYear();
        return result.summary;
      },
      formatGenerationSummary
    );
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
              {isAdminMode ? "Admin Workspace" : "Program settings"}
            </div>

            <div className="mt-5">
              <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">
                Program operations
              </h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-slate-300">
                Use the current administrative workspace to manage live rotation assignments, academic-year track templates, and roster-linked planning data.
              </p>
              {isAdminMode ? (
                <p className="mt-3 text-sm font-semibold text-sky-200">
                  This area is only available to program administrators.
                </p>
              ) : null}
            </div>
          </div>

          {banner ? (
            <div
              className={`mb-6 rounded-2xl px-4 py-3 text-sm ${
                banner.tone === "error"
                  ? "border border-rose-300/20 bg-rose-400/10 text-rose-100"
                  : "border border-emerald-300/20 bg-emerald-400/10 text-emerald-100"
              }`}
            >
              {banner.message}
            </div>
          ) : null}

          <div className="space-y-5">
            <SectionShell
              title={activeTab === "tracks" ? "Tracks and templates" : "Assignments"}
              subtitle={
                activeTab === "tracks"
                  ? "Design academic-year track templates, assign people, and generate live rotation assignments."
                  : "Search residents, filter rotations, and review the live assignment grid."
              }
              icon={
                activeTab === "tracks" ? (
                  <Shapes className="h-5 w-5" />
                ) : (
                  <Users className="h-5 w-5" />
                )
              }
              headerActions={
                activeTab === "tracks" ? (
                  <AcademicYearSelector
                    academicYearStart={academicYearStart}
                    onChange={handleAcademicYearChange}
                  />
                ) : (
                  <>
                    <AcademicYearSelector
                      academicYearStart={academicYearStart}
                      onChange={handleAcademicYearChange}
                    />

                    {canManageRotationSettings && !loading ? (
                      !isEditingAssignments ? (
                        <button
                          type="button"
                          onClick={handleEnterEdit}
                          className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
                        >
                          <PencilLine className="h-4 w-4" />
                          Manage assignments
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            disabled={mutating}
                            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <X className="h-4 w-4" />
                            Cancel
                          </button>

                          <button
                            type="button"
                            onClick={handleDoneEditing}
                            disabled={mutating}
                            className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 disabled:opacity-60"
                          >
                            {mutating ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Save className="h-4 w-4" />
                            )}
                            Save assignment changes
                          </button>
                        </>
                      )
                    ) : null}
                  </>
                )
              }
            >
              <div className="space-y-5">
                <RotationSettingsSegmentedControl
                  activeTab={activeTab}
                  onChange={(tab) => {
                    setActiveTab(tab);
                    setBanner(null);
                  }}
                />

                {activeTab === "tracks" ? (
                  loading ? (
                    <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] px-6 py-14 text-slate-300">
                      <div className="flex items-center justify-center gap-3">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Loading track data...
                      </div>
                    </div>
                  ) : (
                    <RotationTracksManager
                      academicYearStart={academicYearStart}
                      members={visibleResidentMembers}
                      rotations={rotationCatalog}
                      tracks={tracks}
                      trackBlocks={trackBlocks}
                      trackMemberships={visibleTrackMemberships}
                      canManage={canManageRotationSettings}
                      saving={mutating}
                      onCreateTrack={handleCreateTrack}
                      onUpdateTrack={handleUpdateTrack}
                      onDeleteTrack={handleDeleteTrack}
                      onSaveBlocks={handleSaveTrackBlocks}
                      onSaveMembers={handleSaveTrackMembers}
                      onImportPreviousYear={handleImportPreviousYear}
                      onGenerateAssignments={handleGenerateAssignments}
                    />
                  )
                ) : (
                  <div className="space-y-4">
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
                        {hasRotationFilter ? (
                          <button
                            type="button"
                            onClick={handleClearRotationFilter}
                            className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/[0.08]"
                          >
                            Clear rotation filter
                          </button>
                        ) : null}

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
                    ) : isEditingAssignments && canManageRotationSettings ? (
                      <EditProgramRotations
                        program={editProgram}
                        academicYearStart={academicYearStart}
                        academicYearLabel={academicYearLabel}
                        members={filteredMembers as EditProgramMember[]}
                        rotations={editRotationCatalog}
                        assignments={filteredDraftAssignments}
                        loading={loading}
                        saving={mutating}
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
                )}
              </div>
            </SectionShell>

            <SectionShell
              title="Program Attendings"
              subtitle="Manage attending physicians for call coverage and future resident preferences."
              icon={<Stethoscope className="h-5 w-5" />}
            >
              <ProgramAttendingsManager
                canManageFallback={canManageAttendingsFallback}
                onBanner={setBanner}
              />
            </SectionShell>
          </div>
        </motion.div>
      </section>
    </main>
  );
}
