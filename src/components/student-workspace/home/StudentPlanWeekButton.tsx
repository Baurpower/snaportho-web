import { SharedPlanWeekButton } from "@/components/shared/planner/PlanWeekButton";

export function StudentPlanWeekButton({
  isOpen,
  onClick,
}: {
  isOpen: boolean;
  onClick: () => void;
}) {
  return <SharedPlanWeekButton isOpen={isOpen} onClick={onClick} />;
}
