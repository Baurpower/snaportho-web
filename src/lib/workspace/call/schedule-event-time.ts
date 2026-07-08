export type ScheduleEventCategory = "or" | "clinic" | "custom";

export type DurationPreset = "full_day" | "am_half" | "pm_half" | "custom";

export type PresetTimes = {
  isAllDay: boolean;
  startTime: string | null;
  endTime: string | null;
};

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isValidHHMM(value: unknown): value is string {
  return typeof value === "string" && TIME_PATTERN.test(value);
}

export function toHHMM(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.slice(0, 5);
}

export type TimeValidationResult =
  | { valid: true }
  | { valid: false; error: string };

export function validateScheduleEventTimes(input: {
  isAllDay: boolean;
  startTime?: string | null;
  endTime?: string | null;
}): TimeValidationResult {
  if (input.isAllDay) return { valid: true };

  if (!input.startTime || !input.endTime) {
    return {
      valid: false,
      error: "Timed events require both a startTime and an endTime",
    };
  }

  if (!isValidHHMM(input.startTime)) {
    return {
      valid: false,
      error: "startTime must be a valid HH:MM time between 00:00 and 23:59",
    };
  }

  if (!isValidHHMM(input.endTime)) {
    return {
      valid: false,
      error: "endTime must be a valid HH:MM time between 00:00 and 23:59",
    };
  }

  if (input.endTime <= input.startTime) {
    return { valid: false, error: "endTime must be after startTime" };
  }

  return { valid: true };
}

const CLINIC_AM: PresetTimes = { isAllDay: false, startTime: "08:00", endTime: "12:00" };
const CLINIC_PM: PresetTimes = { isAllDay: false, startTime: "12:00", endTime: "17:00" };
const OR_AM: PresetTimes = { isAllDay: false, startTime: "07:00", endTime: "12:00" };
const OR_PM: PresetTimes = { isAllDay: false, startTime: "12:00", endTime: "17:00" };
const FULL_DAY: PresetTimes = { isAllDay: true, startTime: null, endTime: null };

export function getPresetTimes(
  category: ScheduleEventCategory,
  preset: DurationPreset
): PresetTimes {
  if (preset === "full_day") return FULL_DAY;

  if (preset === "am_half") {
    if (category === "or") return OR_AM;
    return CLINIC_AM;
  }

  if (preset === "pm_half") {
    if (category === "or") return OR_PM;
    return CLINIC_PM;
  }

  // Custom: caller supplies explicit start/end times.
  return { isAllDay: false, startTime: null, endTime: null };
}

export function detectPreset(
  category: ScheduleEventCategory,
  isAllDay: boolean,
  startTime: string | null,
  endTime: string | null
): DurationPreset {
  if (isAllDay) return "full_day";
  if (!startTime || !endTime) return "custom";

  const am = getPresetTimes(category, "am_half");
  if (startTime === am.startTime && endTime === am.endTime) return "am_half";

  const pm = getPresetTimes(category, "pm_half");
  if (startTime === pm.startTime && endTime === pm.endTime) return "pm_half";

  return "custom";
}

export function formatScheduleEventTimeLabel(input: {
  isAllDay: boolean | null | undefined;
  startTime: string | null | undefined;
  endTime: string | null | undefined;
  category?: ScheduleEventCategory | null;
}): string | null {
  if (input.isAllDay) return null;

  const start = toHHMM(input.startTime);
  const end = toHHMM(input.endTime);
  if (!start || !end) return null;

  const category = input.category ?? "custom";
  const preset = detectPreset(category, false, start, end);

  if (preset === "am_half") return `AM half · ${start}-${end}`;
  if (preset === "pm_half") return `PM half · ${start}-${end}`;

  return `${start}-${end}`;
}
