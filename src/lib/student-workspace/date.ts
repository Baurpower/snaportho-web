const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_ONLY_PATTERN = /^\d{2}:\d{2}(:\d{2})?$/;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
export const DEFAULT_STUDENT_WORKSPACE_TIMEZONE = "America/Los_Angeles";

export function isValidDateOnlyString(value: unknown): value is string {
  if (typeof value !== "string" || !DATE_ONLY_PATTERN.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function parseDateOnlyToUtcDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function isValidTimeString(value: unknown): value is string {
  if (typeof value !== "string" || !TIME_ONLY_PATTERN.test(value)) {
    return false;
  }

  const [hourPart, minutePart, secondPart = "00"] = value.split(":");
  const hour = Number(hourPart);
  const minute = Number(minutePart);
  const second = Number(secondPart);

  return (
    Number.isInteger(hour) &&
    Number.isInteger(minute) &&
    Number.isInteger(second) &&
    hour >= 0 &&
    hour <= 23 &&
    minute >= 0 &&
    minute <= 59 &&
    second >= 0 &&
    second <= 59
  );
}

export function normalizeTimeString(value: string) {
  if (!isValidTimeString(value)) {
    throw new Error("Times must use valid HH:MM format.");
  }

  const [hours, minutes] = value.split(":");
  return `${hours}:${minutes}`;
}

export function dateOnlyToDayNumber(value: string) {
  return Math.floor(parseDateOnlyToUtcDate(value).getTime() / MS_PER_DAY);
}

export function compareDateOnly(left: string, right: string) {
  return dateOnlyToDayNumber(left) - dateOnlyToDayNumber(right);
}

export function getInclusiveDaySpan(start: string, end: string) {
  return dateOnlyToDayNumber(end) - dateOnlyToDayNumber(start) + 1;
}

export function formatDateOnly(value: string | null | undefined) {
  if (!value || !isValidDateOnlyString(value)) return "—";
  return parseDateOnlyToUtcDate(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function formatLongDateOnly(value: string | null | undefined) {
  if (!value || !isValidDateOnlyString(value)) return "—";
  return parseDateOnlyToUtcDate(value).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function formatShortDateWithWeekday(value: string | null | undefined) {
  if (!value || !isValidDateOnlyString(value)) return "—";
  return parseDateOnlyToUtcDate(value).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function formatDayOfMonth(value: string | null | undefined) {
  if (!value || !isValidDateOnlyString(value)) return "—";
  return parseDateOnlyToUtcDate(value).toLocaleDateString("en-US", {
    day: "numeric",
    timeZone: "UTC",
  });
}

export function formatTimeOnly(value: string | null | undefined) {
  if (!value || !isValidTimeString(value)) return "—";
  const [hoursText, minutesText] = value.split(":");
  const hours = Number(hoursText);
  const minutes = Number(minutesText);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 === 0 ? 12 : hours % 12;
  return `${displayHours}:${String(minutes).padStart(2, "0")} ${period}`;
}

export function isValidTimeZone(value: unknown): value is string {
  if (typeof value !== "string" || !value.trim()) {
    return false;
  }

  try {
    Intl.DateTimeFormat("en-US", { timeZone: value }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function resolveStudentWorkspaceTimeZone(timeZone: string | null | undefined) {
  return isValidTimeZone(timeZone)
    ? timeZone
    : DEFAULT_STUDENT_WORKSPACE_TIMEZONE;
}

export function getDateKeyForTimeZone(
  timeZone = DEFAULT_STUDENT_WORKSPACE_TIMEZONE,
  date = new Date()
) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: resolveStudentWorkspaceTimeZone(timeZone),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error("Unable to derive a date key for the requested timezone.");
  }

  return `${year}-${month}-${day}`;
}

export function todayDateKey(timeZone = DEFAULT_STUDENT_WORKSPACE_TIMEZONE) {
  return getDateKeyForTimeZone(timeZone);
}

export function addDaysToDateKey(value: string, days: number) {
  const nextDate = new Date(parseDateOnlyToUtcDate(value));
  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return nextDate.toISOString().slice(0, 10);
}

export function getStartOfWeekDateKey(value: string) {
  const date = parseDateOnlyToUtcDate(value);
  const weekday = date.getUTCDay();
  return addDaysToDateKey(value, -weekday);
}

export function getDatesForWeek(weekStart: string) {
  return Array.from({ length: 7 }, (_, index) => addDaysToDateKey(weekStart, index));
}

export function getWeekdayFromDateKey(value: string) {
  return parseDateOnlyToUtcDate(value).getUTCDay();
}

export function getWeekdayLabel(weekday: number, format: "short" | "long" = "short") {
  const labels =
    format === "long"
      ? ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
      : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return labels[weekday] ?? labels[0];
}
