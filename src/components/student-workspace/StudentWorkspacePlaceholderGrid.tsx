import { StudentWorkspaceSectionCard } from "@/components/student-workspace/StudentWorkspaceSectionCard";

const FUTURE_SECTIONS = [
  {
    eyebrow: "Schedule",
    title: "Weekly Schedule",
    description:
      "A lightweight week view for OR, clinic, call, conference, research, and off days.",
  },
  {
    eyebrow: "Checklist",
    title: "Daily Success Checklist",
    description:
      "Curated SnapOrtho guidance for showing up prepared and making a strong impression every day.",
  },
  {
    eyebrow: "Tasks",
    title: "My Tasks",
    description:
      "A simple personal task list for reminders, follow-ups, and small wins during rotations.",
  },
];

export function StudentWorkspacePlaceholderGrid() {
  return (
    <section className="mt-8">
      <div className="mb-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Phase 3 Next
        </p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
          The next layers are already mapped out
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Rotations and progress are live. These next three blocks will round out
          the daily operating system for fourth-year students.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {FUTURE_SECTIONS.map((section) => (
          <StudentWorkspaceSectionCard
            key={section.title}
            eyebrow={section.eyebrow}
            title={section.title}
            description={section.description}
          />
        ))}
      </div>
    </section>
  );
}
