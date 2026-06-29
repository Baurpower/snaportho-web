import type { StudentWorkspaceProfile } from "@/lib/student-workspace/types";

export function StudentWorkspaceHero({
  profile,
}: {
  profile: StudentWorkspaceProfile;
}) {
  const displayName = profile.display_name ?? "there";

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-950 px-5 py-6 text-white shadow-[0_28px_80px_rgba(2,8,23,0.16)] sm:px-6 sm:py-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.18),transparent_30%),radial-gradient(circle_at_85%_15%,rgba(255,255,255,0.08),transparent_20%)]" />

      <div className="relative">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-200">
          Student Workspace
        </div>

        <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
          Good morning, {displayName}.
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
          This is your personal SnapOrtho home base for fourth-year life. Your
          rotations and year-long progress live here now, with schedule, checklist,
          and task layers ready to come next without leaning on the resident
          Workspace backend.
        </p>
      </div>
    </section>
  );
}
