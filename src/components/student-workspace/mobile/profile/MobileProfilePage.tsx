import {
  CalendarDays,
  GraduationCap,
  MapPinned,
  UserRound,
} from "lucide-react";
import { StudentWorkspaceMobileChrome } from "@/components/student-workspace/mobile/StudentWorkspaceMobileChrome";
import { MobileProfileSettings } from "@/components/student-workspace/mobile/profile/MobileProfileSettings";
import { MobileRotationList } from "@/components/student-workspace/mobile/profile/MobileRotationList";
import {
  DEFAULT_STUDENT_WORKSPACE_TIMEZONE,
  formatDateOnly,
} from "@/lib/student-workspace/date";
import type {
  StudentWorkspaceProfile,
  StudentWorkspaceRotation,
} from "@/lib/student-workspace/types";

export function MobileProfilePage({
  profile,
  rotations,
  today,
}: {
  profile: StudentWorkspaceProfile;
  rotations: StudentWorkspaceRotation[];
  today: string;
}) {
  const stats = [
    {
      icon: <UserRound className="h-3.5 w-3.5" />,
      label: "Display name",
      value: profile.display_name ?? "Not set yet",
    },
    {
      icon: <GraduationCap className="h-3.5 w-3.5" />,
      label: "Graduation year",
      value: profile.expected_graduation_year
        ? String(profile.expected_graduation_year)
        : "Not set yet",
    },
    {
      icon: <CalendarDays className="h-3.5 w-3.5" />,
      label: "Fourth-year window",
      value:
        profile.fourth_year_start_date && profile.fourth_year_end_date
          ? `${formatDateOnly(profile.fourth_year_start_date)} – ${formatDateOnly(
              profile.fourth_year_end_date
            )}`
          : "Not configured",
    },
    {
      icon: <MapPinned className="h-3.5 w-3.5" />,
      label: "Timezone",
      value: profile.timezone ?? DEFAULT_STUDENT_WORKSPACE_TIMEZONE,
    },
  ];

  return (
    <StudentWorkspaceMobileChrome badge="Profile" title="Profile & settings">
      <div className="grid gap-4">
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <dl className="divide-y divide-slate-100">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="flex items-baseline justify-between gap-3 px-4 py-3"
              >
                <dt className="inline-flex shrink-0 items-center gap-1.5 text-[13px] font-semibold text-slate-500">
                  {stat.icon}
                  {stat.label}
                </dt>
                <dd className="min-w-0 truncate text-right text-[14px] font-semibold text-slate-950">
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <MobileProfileSettings profile={profile} />

        <MobileRotationList initialRotations={rotations} today={today} />
      </div>
    </StudentWorkspaceMobileChrome>
  );
}
