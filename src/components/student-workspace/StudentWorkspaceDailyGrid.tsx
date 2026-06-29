import type {
  StudentWorkspaceChecklistItem,
  StudentWorkspaceChecklistState,
  StudentWorkspaceChecklistTemplate,
  StudentWorkspaceProfile,
  StudentWorkspaceRotation,
  StudentWorkspaceScheduleEntry,
  StudentWorkspaceTask,
} from "@/lib/student-workspace/types";
import { DailyChecklistCard } from "@/components/student-workspace/checklists/DailyChecklistCard";
import { WeeklyScheduleCard } from "@/components/student-workspace/schedule/WeeklyScheduleCard";
import { TaskList } from "@/components/student-workspace/tasks/TaskList";

type StudentWorkspaceDailyGridProps = {
  profile: StudentWorkspaceProfile;
  rotations: StudentWorkspaceRotation[];
  scheduleEntries: StudentWorkspaceScheduleEntry[];
  checklistTemplates: StudentWorkspaceChecklistTemplate[];
  checklistItems: StudentWorkspaceChecklistItem[];
  checklistState: StudentWorkspaceChecklistState[];
  tasks: StudentWorkspaceTask[];
  today: string;
  weekStart: string;
  currentRotationId: string | null;
};

export function StudentWorkspaceDailyGrid({
  profile,
  rotations,
  scheduleEntries,
  checklistTemplates,
  checklistItems,
  checklistState,
  tasks,
  today,
  weekStart,
  currentRotationId,
}: StudentWorkspaceDailyGridProps) {
  return (
    <section className="mt-8 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
      <div className="grid gap-4">
        <WeeklyScheduleCard
          initialEntries={scheduleEntries}
          rotations={rotations}
          today={today}
          weekStart={weekStart}
        />
      </div>

      <div className="grid gap-4">
        <DailyChecklistCard
          profile={profile}
          rotations={rotations}
          templates={checklistTemplates}
          items={checklistItems}
          state={checklistState}
          today={today}
          currentRotationId={currentRotationId}
        />
        <TaskList
          initialTasks={tasks}
          rotations={rotations}
          today={today}
        />
      </div>
    </section>
  );
}
