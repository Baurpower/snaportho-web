import { compareDateOnly, getDatesForWeek, getWeekdayFromDateKey } from "@/lib/student-workspace/date";
import type {
  StudentWorkspaceResolvedScheduleEntry,
  StudentWorkspaceScheduleEntry,
} from "@/lib/student-workspace/types";

export function resolveScheduleEntriesForWeek(
  entries: StudentWorkspaceScheduleEntry[],
  weekStart: string
) {
  const weekDates = getDatesForWeek(weekStart);
  const resolved: StudentWorkspaceResolvedScheduleEntry[] = [];

  for (const entry of entries) {
    if (entry.specific_date) {
      resolved.push({ ...entry, occurs_on: entry.specific_date });
      continue;
    }

    const occursOn = weekDates.find(
      (dateKey) => getWeekdayFromDateKey(dateKey) === entry.weekday
    );
    if (occursOn) {
      resolved.push({ ...entry, occurs_on: occursOn });
    }
  }

  return resolved.sort((left, right) => {
    if (left.occurs_on !== right.occurs_on) {
      return compareDateOnly(left.occurs_on, right.occurs_on);
    }
    if (left.is_all_day !== right.is_all_day) {
      return left.is_all_day ? -1 : 1;
    }
    if (left.start_time !== right.start_time) {
      return left.start_time.localeCompare(right.start_time);
    }
    return left.sort_order - right.sort_order;
  });
}
