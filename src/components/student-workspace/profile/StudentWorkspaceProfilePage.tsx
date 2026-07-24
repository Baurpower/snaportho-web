import type { ReactNode } from "react";
import {
  CalendarDays,
  GraduationCap,
  MapPinned,
  UserRound,
} from "lucide-react";
import { StudentWorkspaceProfileSettingsPanel } from "@/components/student-workspace/StudentWorkspaceProfileSettingsPanel";
import { MobileProfilePage } from "@/components/student-workspace/mobile/profile/MobileProfilePage";
import {
  DesktopOnly,
  MobileOnly,
} from "@/components/student-workspace/mobile/viewport";
import { RotationList } from "@/components/student-workspace/rotations/RotationList";
import { StudentWorkspaceChrome } from "@/components/student-workspace/shell/StudentWorkspaceChrome";
import {
  DEFAULT_STUDENT_WORKSPACE_TIMEZONE,
  formatDateOnly,
} from "@/lib/student-workspace/date";
import type {
  StudentWorkspaceProfile,
  StudentWorkspaceRotation,
} from "@/lib/student-workspace/types";

type StudentWorkspaceProfilePageProps = {
  profile: StudentWorkspaceProfile;
  rotations: StudentWorkspaceRotation[];
  today: string;
};

export function StudentWorkspaceProfilePage(
  props: StudentWorkspaceProfilePageProps
) {
  return (
    <>
      <MobileOnly>
        <MobileProfilePage {...props} />
      </MobileOnly>
      <DesktopOnly>
        <DesktopProfilePage {...props} />
      </DesktopOnly>
    </>
  );
}

function DesktopProfilePage({
  profile,
  rotations,
  today,
}: StudentWorkspaceProfilePageProps) {
  return (
    <StudentWorkspaceChrome
      badge="Profile"
      title="Profile and settings"
      description="Keep your setup, graduation year, fourth-year timeline, rotations, and timezone here so Home can stay focused on your day."
      actions={
        <div className="rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Timezone
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-950">
            {profile.timezone ?? DEFAULT_STUDENT_WORKSPACE_TIMEZONE}
          </p>
        </div>
      }
    >
      <div className="grid gap-6">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <ProfileStat
            icon={<UserRound className="h-4 w-4" />}
            label="Display name"
            value={profile.display_name ?? "Not set yet"}
          />
          <ProfileStat
            icon={<GraduationCap className="h-4 w-4" />}
            label="Graduation year"
            value={
              profile.expected_graduation_year
                ? String(profile.expected_graduation_year)
                : "Not set yet"
            }
          />
          <ProfileStat
            icon={<CalendarDays className="h-4 w-4" />}
            label="Fourth-year window"
            value={
              profile.fourth_year_start_date && profile.fourth_year_end_date
                ? `${formatDateOnly(profile.fourth_year_start_date)} to ${formatDateOnly(
                    profile.fourth_year_end_date
                  )}`
                : "Not configured"
            }
          />
          <ProfileStat
            icon={<MapPinned className="h-4 w-4" />}
            label="Tracked rotations"
            value={`${rotations.length}`}
          />
        </section>

        <StudentWorkspaceProfileSettingsPanel profile={profile} />

        <RotationList
          profile={profile}
          initialRotations={rotations}
          today={today}
        />
      </div>
    </StudentWorkspaceChrome>
  );
}

function ProfileStat({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[1.75rem] border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
        {icon}
        {label}
      </div>
      <p className="mt-3 text-base font-semibold text-slate-950">{value}</p>
    </div>
  );
}
