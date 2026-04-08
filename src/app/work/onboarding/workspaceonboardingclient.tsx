"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Building2,
  Check,
  ChevronDown,
  Mail,
  MapPin,
  Search,
  UserRound,
  X,
} from "lucide-react";

type Props = {
  redirectTo: string;
};

type ExistingProgram = {
  id: string;
  name: string;
  institutionName?: string | null;
  city?: string | null;
  state?: string | null;
  timezone?: string | null;
};

type InviteContext = {
  inviteToken: string;
  inviteId: string;
  rosterId: string;
  programId: string;
  rosterFullName: string | null;
  rosterEmail: string | null;
  rosterGradYear: number | null;
  program: {
    id: string;
    name: string | null;
    institutionName?: string | null;
    city?: string | null;
    state?: string | null;
    timezone?: string | null;
  };
};

type OnboardingPayload = {
  profile: {
    fullName: string | null;
    email: string | null;
    trainingLevel: string | null;
    institution: string | null;
    city: string | null;
    pgyYear: number | null;
    gradYear: number | null;
    isProfileComplete?: boolean;
  };
  programs: ExistingProgram[];
  existingWorkspaceState: {
    onboardingCompleted: boolean;
    selectedProgramId: string | null;
    membershipId?: string | null;
  } | null;
  inviteContext?: InviteContext | null;
};

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

function getAcademicStartYear(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth();
  return month >= 6 ? year : year - 1;
}

function getPgyPreviewFromGradYear(gradYear: number | null | undefined) {
  if (!gradYear) return null;

  const academicStartYear = getAcademicStartYear();
  const pgy = academicStartYear - gradYear + 6;

  if (pgy < 0 || pgy > 10) return null;
  return pgy;
}

function getPgyOneStartDateFromGradYear(gradYear: number | null | undefined) {
  if (!gradYear) return null;
  const startYear = gradYear - 5;
  return new Date(startYear, 6, 1);
}

function formatLongDate(date: Date | null) {
  if (!date) return null;
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function getPgyDisplayLabel(gradYear: number | null | undefined) {
  const pgy = getPgyPreviewFromGradYear(gradYear);
  if (pgy === null) return null;
  return `PGY-${pgy}`;
}

function getPgyHelperText(gradYear: number | null | undefined) {
  const pgy = getPgyPreviewFromGradYear(gradYear);
  if (pgy === null) {
    return "Enter your graduation year to preview your current PGY.";
  }

  if (pgy === 0) {
    const startDate = formatLongDate(getPgyOneStartDateFromGradYear(gradYear));
    return startDate ? `PGY-1 starts ${startDate}.` : "PGY-1 start date unavailable.";
  }

  return "Calculated automatically from your graduation year using a July 1 academic-year rollover.";
}

function SectionCard({
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
    <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.05] p-5 md:p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-400/10 text-sky-300 ring-1 ring-sky-300/10">
          {icon}
        </div>
        <div>
          <h2 className="text-lg font-bold tracking-tight text-white">
            {title}
          </h2>
          <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
        </div>
      </div>

      <div className="mt-5">{children}</div>
    </div>
  );
}

function ProgramCard({
  program,
  selected,
  onSelect,
}: {
  program: ExistingProgram;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-[1.2rem] border p-4 text-left transition ${
        selected
          ? "border-sky-300/50 bg-sky-300/12 shadow-[0_12px_30px_rgba(56,189,248,0.14)]"
          : "border-white/10 bg-white/[0.04] hover:border-white/15 hover:bg-white/[0.07]"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-bold text-white">
            {program.name}
          </h3>

          <p className="mt-1 truncate text-sm text-slate-300">
            {program.institutionName ?? "Residency program"}
          </p>

          {(program.city || program.state) && (
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-slate-300">
              <MapPin className="h-3.5 w-3.5 text-slate-400" />
              {[program.city, program.state].filter(Boolean).join(", ")}
            </div>
          )}

          {program.timezone ? (
            <p className="mt-2 text-xs text-slate-500">{program.timezone}</p>
          ) : null}
        </div>

        <div
          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
            selected
              ? "border-sky-300 bg-sky-300 text-slate-950"
              : "border-white/15 bg-white/5 text-transparent"
          }`}
        >
          <Check className="h-3.5 w-3.5" />
        </div>
      </div>
    </button>
  );
}

function RequestProgramModal({
  open,
  onClose,
  fullName,
  email,
  gradYear,
  selectedState,
}: {
  open: boolean;
  onClose: () => void;
  fullName: string;
  email: string;
  gradYear: string;
  selectedState: string;
}) {
  const [programName, setProgramName] = useState("");
  const [institutionName, setInstitutionName] = useState("");
  const [city, setCity] = useState("");
  const [stateValue, setStateValue] = useState("");
  const [notes, setNotes] = useState("");
  const [isResident, setIsResident] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setStateValue(selectedState !== "Select a state" ? selectedState : "");
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [open, selectedState]);

  async function handleSubmit() {
    if (!programName.trim() || !institutionName.trim() || !stateValue.trim()) {
      setErrorMsg("Please fill out the program name, institution, and state.");
      return;
    }

    if (!isResident) {
      setErrorMsg("Please confirm that you are affiliated with this program.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const response = await fetch("/api/work/program-request", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requesterName: fullName,
          requesterEmail: email,
          requesterGradYear: gradYear ? Number(gradYear) : null,
          requestedProgramName: programName,
          institutionName,
          city: city || null,
          state: stateValue,
          notes: notes || null,
          affirmedResidentOrAffiliated: isResident,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to submit program request.");
      }

      setSuccessMsg(
        "Request submitted. We’ll review it before adding the program."
      );
      setProgramName("");
      setInstitutionName("");
      setCity("");
      setNotes("");
      setIsResident(false);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Failed to submit program request."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-[1.75rem] border border-white/10 bg-[#0b1628] shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-5 md:px-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-200">
              Program request
            </p>
            <h3 className="mt-2 text-2xl font-bold tracking-tight text-white">
              Can’t find your program?
            </h3>
            <p className="mt-2 text-sm text-slate-400">
              Submit a request and we’ll review it before adding the program to
              Workspace.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5 md:px-6">
          {errorMsg ? (
            <div className="rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
              {errorMsg}
            </div>
          ) : null}

          {successMsg ? (
            <div className="rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
              {successMsg}
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-slate-200">
                Program name
              </label>
              <input
                type="text"
                value={programName}
                onChange={(e) => setProgramName(e.target.value)}
                placeholder="Orthopaedic Surgery Residency Program"
                className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none transition focus:border-sky-300/40 focus:ring-2 focus:ring-sky-300/20"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-200">
                Institution
              </label>
              <input
                type="text"
                value={institutionName}
                onChange={(e) => setInstitutionName(e.target.value)}
                placeholder="Hospital or university"
                className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none transition focus:border-sky-300/40 focus:ring-2 focus:ring-sky-300/20"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-200">
                State
              </label>
              <input
                type="text"
                value={stateValue}
                onChange={(e) => setStateValue(e.target.value)}
                placeholder="VA"
                className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none transition focus:border-sky-300/40 focus:ring-2 focus:ring-sky-300/20"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-200">
                City <span className="text-slate-500">(optional)</span>
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City"
                className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none transition focus:border-sky-300/40 focus:ring-2 focus:ring-sky-300/20"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-slate-200">
                Notes <span className="text-slate-500">(optional)</span>
              </label>
              <textarea
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Anything helpful about the program, your role, or how to verify it."
                className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none transition focus:border-sky-300/40 focus:ring-2 focus:ring-sky-300/20"
              />
            </div>
          </div>

          <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={isResident}
              onChange={(e) => setIsResident(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-white/20 bg-white/10"
            />
            <span>
              I am a resident or directly affiliated with this program and
              understand that the program may be reviewed before it is added.
            </span>
          </label>
        </div>

        <div className="flex justify-end gap-3 border-t border-white/10 px-5 py-5 md:px-6">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 disabled:opacity-60"
          >
            {isSubmitting ? "Submitting..." : "Submit request"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function WorkspaceOnboardingClient({ redirectTo }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams?.get("inviteToken")?.trim() || null;

  const [loadingInitial, setLoadingInitial] = useState(true);
  const [initialError, setInitialError] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [gradYear, setGradYear] = useState("");

  const [selectedState, setSelectedState] = useState("Select a state");
  const [programSearch, setProgramSearch] = useState("");
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(
    null
  );
  const [programs, setPrograms] = useState<ExistingProgram[]>([]);
  const [inviteContext, setInviteContext] = useState<InviteContext | null>(null);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const gradYearNumber = useMemo(() => {
    if (!gradYear.trim()) return null;
    const parsed = Number.parseInt(gradYear, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }, [gradYear]);

  const pgyDisplayLabel = useMemo(
    () => getPgyDisplayLabel(gradYearNumber),
    [gradYearNumber]
  );

  const pgyHelperText = useMemo(
    () => getPgyHelperText(gradYearNumber),
    [gradYearNumber]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadInitial() {
      try {
        setLoadingInitial(true);
        setInitialError(null);

        const response = await fetch(
          inviteToken
            ? `/api/work/onboarding?inviteToken=${encodeURIComponent(inviteToken)}`
            : "/api/work/onboarding",
          {
            credentials: "include",
            cache: "no-store",
          }
        );

        const payload: OnboardingPayload | null = await response
          .json()
          .catch(() => null);

        if (!response.ok || !payload) {
          throw new Error(
            payload && "error" in payload
              ? (payload as { error?: string }).error ??
                  "Failed to load onboarding details."
              : "Failed to load onboarding details."
          );
        }

        if (cancelled) return;

        const sortedPrograms = [...(payload.programs ?? [])].sort((a, b) => {
          const stateA = a.state ?? "";
          const stateB = b.state ?? "";
          if (stateA !== stateB) return stateA.localeCompare(stateB);
          return a.name.localeCompare(b.name);
        });

        const nextInviteContext = payload.inviteContext ?? null;
        const currentSelectedProgramId =
          nextInviteContext?.programId ??
          payload.existingWorkspaceState?.selectedProgramId ??
          null;

        const currentSelectedProgram =
          sortedPrograms.find((p) => p.id === currentSelectedProgramId) ?? null;

        setInviteContext(nextInviteContext);
        setPrograms(sortedPrograms);

        setFullName(payload.profile.fullName ?? nextInviteContext?.rosterFullName ?? "");
        setEmail(payload.profile.email ?? nextInviteContext?.rosterEmail ?? "");
        setGradYear(
          payload.profile.gradYear != null
            ? String(payload.profile.gradYear)
            : nextInviteContext?.rosterGradYear != null
            ? String(nextInviteContext.rosterGradYear)
            : ""
        );

        setSelectedProgramId(currentSelectedProgramId);

        if (nextInviteContext?.program?.state) {
          setSelectedState(nextInviteContext.program.state);
        } else if (currentSelectedProgram?.state) {
          setSelectedState(currentSelectedProgram.state);
        }
      } catch (err) {
        if (!cancelled) {
          setInitialError(
            err instanceof Error
              ? err.message
              : "Failed to load onboarding details."
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingInitial(false);
        }
      }
    }

    loadInitial();

    return () => {
      cancelled = true;
    };
  }, [inviteToken]);

  const programSelectionLocked = !!inviteContext;

  const availableStates = useMemo(() => {
    const states = Array.from(
      new Set(programs.map((program) => program.state).filter(Boolean))
    ) as string[];

    return ["Select a state", ...states.sort((a, b) => a.localeCompare(b))];
  }, [programs]);

  const statePrograms = useMemo(() => {
    if (selectedState === "Select a state") return [];
    return programs.filter((program) => program.state === selectedState);
  }, [programs, selectedState]);

  const filteredPrograms = useMemo(() => {
    const query = programSearch.trim().toLowerCase();

    const basePrograms = !query
      ? statePrograms
      : statePrograms.filter((program) => {
          const haystack = [
            program.name,
            program.institutionName,
            program.city,
            program.state,
            program.timezone,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return haystack.includes(query);
        });

    return basePrograms.filter((program) => program.id !== selectedProgramId);
  }, [programSearch, statePrograms, selectedProgramId]);

  const selectedProgram = useMemo(
    () => programs.find((program) => program.id === selectedProgramId) ?? null,
    [programs, selectedProgramId]
  );

  useEffect(() => {
    if (!selectedProgramId || programSelectionLocked) return;

    const stillVisible = statePrograms.some(
      (program) => program.id === selectedProgramId
    );

    if (!stillVisible && selectedProgram?.state !== selectedState) {
      setSelectedProgramId(null);
    }
  }, [
    selectedProgramId,
    statePrograms,
    selectedState,
    selectedProgram,
    programSelectionLocked,
  ]);

  const canContinue =
    fullName.trim().length > 1 &&
    email.trim().length > 3 &&
    !!selectedProgramId &&
    !isSubmitting;

  async function handleContinue() {
    if (!canContinue) return;

    setIsSubmitting(true);
    setInitialError(null);

    try {
      const response = await fetch("/api/work/onboarding", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          profile: {
            fullName,
            email,
            gradYear: gradYear ? Number(gradYear) : null,
          },
          programMode: "select",
          selectedProgramId,
          inviteToken,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to save onboarding.");
      }

      router.push(redirectTo);
    } catch (err) {
      setInitialError(
        err instanceof Error ? err.message : "Failed to save onboarding."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#071120] text-white">
      <section className="px-6 py-12 sm:px-8 md:py-16">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="mx-auto max-w-4xl"
        >
          <div className="mb-8">
            <div className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-200">
              Workspace setup
            </div>

            <h1 className="mt-5 text-4xl font-black tracking-tight text-white sm:text-5xl">
              Finish setup
            </h1>

            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-300">
              {programSelectionLocked
                ? "Confirm your profile and connect to your residency workspace."
                : "Confirm your profile, choose your state, and connect to the right residency program."}
                        </p>
          </div>

          {initialError ? (
            <div className="mb-6 rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
              {initialError}
            </div>
          ) : null}

          {loadingInitial ? (
            <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.05] px-5 py-6 text-sm text-slate-300">
              Loading your profile…
            </div>
          ) : (
            <div className="space-y-5">
              <SectionCard
                title="Profile"
                subtitle="We’ll preload anything already saved in your SnapOrtho profile."
                icon={<UserRound className="h-5 w-5" />}
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-200">
                      Full name
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white placeholder:text-slate-400 outline-none transition focus:border-sky-300/40 focus:ring-2 focus:ring-sky-300/20"
                      placeholder="Your full name"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-200">
                      Email
                    </label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full rounded-2xl border border-white/10 bg-white/10 px-11 py-3 text-white placeholder:text-slate-400 outline-none transition focus:border-sky-300/40 focus:ring-2 focus:ring-sky-300/20"
                        placeholder="Your email"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-200">
                      Graduation year
                    </label>
                    <input
                      type="number"
                      min={2020}
                      max={2100}
                      value={gradYear}
                      onChange={(e) => setGradYear(e.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white placeholder:text-slate-400 outline-none transition focus:border-sky-300/40 focus:ring-2 focus:ring-sky-300/20"
                      placeholder="Example: 2031"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-200">
                      Current PGY preview
                    </label>
                    <div className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white">
                      {pgyDisplayLabel ?? "Will be calculated from graduation year"}
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      {pgyHelperText}
                    </p>
                  </div>
                </div>
              </SectionCard>

              <SectionCard
                title="Residency program"
                subtitle={
                  programSelectionLocked
                    ? "Your invite already points to the correct residency program."
                    : "Choose your state first, then select your residency program."
                }
                icon={<Building2 className="h-5 w-5" />}
              >
                {selectedProgram ? (
                  <div className="mb-5 rounded-[1.25rem] border border-sky-300/25 bg-sky-300/10 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-200">
                      Selected program
                    </p>
                    <div className="mt-2 flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-bold text-white">
                          {selectedProgram.name}
                        </h3>
                        <p className="mt-1 text-sm text-slate-300">
                          {selectedProgram.institutionName ?? "Residency program"}
                        </p>
                        {(selectedProgram.city || selectedProgram.state) && (
                          <p className="mt-1 text-sm text-slate-400">
                            {[selectedProgram.city, selectedProgram.state]
                              .filter(Boolean)
                              .join(", ")}
                          </p>
                        )}
                      </div>

                      {!programSelectionLocked ? (
                        <button
                          type="button"
                          onClick={() => setSelectedProgramId(null)}
                          className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10"
                        >
                          Change
                        </button>
                      ) : (
                        <div className="rounded-full border border-sky-300/25 bg-sky-300/10 px-3 py-1.5 text-xs font-semibold text-sky-100">
                          Connected via invite
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}

                <div className="grid gap-3 md:grid-cols-[240px_1fr]">
                  <div className="relative">
                    <select
                      value={selectedState}
                      disabled={programSelectionLocked}
                      onChange={(e) => {
                        setSelectedState(e.target.value);
                        setProgramSearch("");
                      }}
                      className="w-full appearance-none rounded-2xl border border-white/10 bg-white/10 px-4 py-3 pr-10 text-white outline-none transition focus:border-sky-300/40 focus:ring-2 focus:ring-sky-300/20 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {availableStates.map((state) => (
                        <option
                          key={state}
                          value={state}
                          className="bg-slate-900"
                        >
                          {state}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  </div>

                  <div className="relative">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={programSearch}
                      onChange={(e) => setProgramSearch(e.target.value)}
                      placeholder={
                        selectedState === "Select a state"
                          ? "Select a state first"
                          : `Search ${selectedState} programs`
                      }
                      disabled={
                        selectedState === "Select a state" || programSelectionLocked
                      }
                      className="w-full rounded-2xl border border-white/10 bg-white/10 px-11 py-3 text-white placeholder:text-slate-400 outline-none transition focus:border-sky-300/40 focus:ring-2 focus:ring-sky-300/20 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-slate-400">
                    {selectedState === "Select a state"
                      ? "Choose a state to load available programs."
                      : programSelectionLocked
                      ? "Your program was preselected from your invite."
                      : `${filteredPrograms.length} ${
                          filteredPrograms.length === 1 ? "program" : "programs"
                        } left to browse in ${selectedState}.`}
                  </p>

                  {!programSelectionLocked ? (
                    <button
                      type="button"
                      onClick={() => setIsRequestModalOpen(true)}
                      className="rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
                    >
                      Can’t find your program?
                    </button>
                  ) : null}
                </div>

                {!programSelectionLocked ? (
                  selectedState !== "Select a state" ? (
                    <div className="mt-4 max-h-[420px] space-y-3 overflow-y-auto pr-1">
                      {filteredPrograms.length === 0 ? (
                        <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.04] px-4 py-4 text-sm text-slate-300">
                          {selectedProgram
                            ? `You’ve already selected your ${selectedState} program.`
                            : `No programs matched your search in ${selectedState}.`}
                        </div>
                      ) : (
                        filteredPrograms.map((program) => (
                          <ProgramCard
                            key={program.id}
                            program={program}
                            selected={selectedProgramId === program.id}
                            onSelect={() => setSelectedProgramId(program.id)}
                          />
                        ))
                      )}
                    </div>
                  ) : (
                    <div className="mt-4 rounded-[1.25rem] border border-white/10 bg-white/[0.04] px-4 py-5 text-sm text-slate-300">
                      Select a state first to see available programs.
                    </div>
                  )
                ) : null}
              </SectionCard>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-400">
                  You can update more details later.
                </p>

                <div className="flex gap-3">
                  <Link
                    href="/work/welcome"
                    className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                  >
                    Back
                  </Link>

                  <button
                    type="button"
                    onClick={handleContinue}
                    disabled={!canContinue}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? "Saving..." : "Continue"}
                    {!isSubmitting ? <ArrowRight className="h-4 w-4" /> : null}
                  </button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </section>

      {!programSelectionLocked ? (
        <RequestProgramModal
          open={isRequestModalOpen}
          onClose={() => setIsRequestModalOpen(false)}
          fullName={fullName}
          email={email}
          gradYear={gradYear}
          selectedState={selectedState}
        />
      ) : null}
    </main>
  );
}