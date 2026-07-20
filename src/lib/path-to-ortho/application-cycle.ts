export type DateOnly = `${number}-${number}-${number}`;

export type ApplicationCycleEnvironment = {
  NEXT_PUBLIC_PATH_TO_ORTHO_ERAS_APPLICATION_OPEN_DATE?: string;
  NEXT_PUBLIC_PATH_TO_ORTHO_ERAS_PROGRAM_REVIEW_DATE?: string;
  NEXT_PUBLIC_PATH_TO_ORTHO_NRMP_REGISTRATION_OPEN_DATE?: string;
  NEXT_PUBLIC_PATH_TO_ORTHO_NRMP_REGISTRATION_CLOSE_DATE?: string;
  NEXT_PUBLIC_PATH_TO_ORTHO_NRMP_RANKING_OPEN_DATE?: string;
  NEXT_PUBLIC_PATH_TO_ORTHO_NRMP_RANKING_CLOSE_DATE?: string;
  NEXT_PUBLIC_PATH_TO_ORTHO_YES_NO_DAY_DATE?: string;
  NEXT_PUBLIC_PATH_TO_ORTHO_MATCH_DAY_DATE?: string;
};

export type ApplicationCycleConfig = {
  erasApplicationOpenDate: DateOnly;
  erasProgramReviewDate: DateOnly;
  nrmpRegistrationOpenDate: DateOnly;
  nrmpRegistrationCloseDate: DateOnly;
  nrmpRankingOpenDate: DateOnly;
  nrmpRankingCloseDate: DateOnly;
  yesNoDayDate: DateOnly;
  matchDayDate: DateOnly;
  milestones: readonly ApplicationCycleMilestone[];
};

export type ApplicationCycleMilestone = {
  key: Exclude<keyof ApplicationCycleConfig, "milestones">;
  label: string;
  date: DateOnly;
};

const DAY_IN_MS = 86_400_000;

const ENV_FIELDS = [
  ["erasApplicationOpenDate", "NEXT_PUBLIC_PATH_TO_ORTHO_ERAS_APPLICATION_OPEN_DATE"],
  ["erasProgramReviewDate", "NEXT_PUBLIC_PATH_TO_ORTHO_ERAS_PROGRAM_REVIEW_DATE"],
  ["nrmpRegistrationOpenDate", "NEXT_PUBLIC_PATH_TO_ORTHO_NRMP_REGISTRATION_OPEN_DATE"],
  ["nrmpRegistrationCloseDate", "NEXT_PUBLIC_PATH_TO_ORTHO_NRMP_REGISTRATION_CLOSE_DATE"],
  ["nrmpRankingOpenDate", "NEXT_PUBLIC_PATH_TO_ORTHO_NRMP_RANKING_OPEN_DATE"],
  ["nrmpRankingCloseDate", "NEXT_PUBLIC_PATH_TO_ORTHO_NRMP_RANKING_CLOSE_DATE"],
  ["yesNoDayDate", "NEXT_PUBLIC_PATH_TO_ORTHO_YES_NO_DAY_DATE"],
  ["matchDayDate", "NEXT_PUBLIC_PATH_TO_ORTHO_MATCH_DAY_DATE"],
] as const;

type ApplicationCycleDateFields = Exclude<keyof ApplicationCycleConfig, "milestones">;

export const DEFAULT_APPLICATION_CYCLE_DATES = {
  erasApplicationOpenDate: "2026-09-02",
  erasProgramReviewDate: "2026-09-23",
  nrmpRegistrationOpenDate: "2026-09-15",
  nrmpRegistrationCloseDate: "2027-01-29",
  nrmpRankingOpenDate: "2027-02-01",
  nrmpRankingCloseDate: "2027-03-03",
  yesNoDayDate: "2027-03-15",
  matchDayDate: "2027-03-19",
} as const satisfies Readonly<Record<ApplicationCycleDateFields, DateOnly>>;

const LABELS: Record<(typeof ENV_FIELDS)[number][0], string> = {
  erasApplicationOpenDate: "ERAS Applications Open",
  erasProgramReviewDate: "Programs Begin Reviewing Applications",
  nrmpRegistrationOpenDate: "NRMP Registration Opens",
  nrmpRegistrationCloseDate: "NRMP Registration Closes",
  nrmpRankingOpenDate: "Rank Order List Opens",
  nrmpRankingCloseDate: "Rank Order List Certification Deadline",
  yesNoDayDate: "Yes/No Day",
  matchDayDate: "Match Day",
};

function dateParts(value: string): [number, number, number] | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }
  return [year, month, day];
}

export function parseDateOnly(value: string): DateOnly {
  const normalized = value.trim();
  if (!dateParts(normalized)) {
    throw new Error(`Invalid calendar date "${value}"; expected a real date in YYYY-MM-DD format.`);
  }
  return normalized as DateOnly;
}

function dateOrdinal(value: DateOnly): number {
  const [year, month, day] = dateParts(value)!;
  return Date.UTC(year, month - 1, day) / DAY_IN_MS;
}

export function compareDateOnly(left: DateOnly, right: DateOnly): number {
  return dateOrdinal(left) - dateOrdinal(right);
}

export function daysBetweenDateOnly(from: DateOnly, to: DateOnly): number {
  return dateOrdinal(to) - dateOrdinal(from);
}

export function formatDateOnly(
  value: DateOnly,
  options: Intl.DateTimeFormatOptions = { month: "long", day: "numeric", year: "numeric" }
): string {
  const [year, month, day] = dateParts(value)!;
  return new Intl.DateTimeFormat("en-US", { ...options, timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1, day, 12))
  );
}

export function localTodayDateOnly(now = new Date()): DateOnly {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}` as DateOnly;
}

export function getNextMilestone(
  milestones: readonly ApplicationCycleMilestone[],
  today: DateOnly = localTodayDateOnly()
): ApplicationCycleMilestone | null {
  return milestones.find((milestone) => compareDateOnly(milestone.date, today) >= 0) ?? null;
}

export function getApplicationCycleWindows(config: ApplicationCycleConfig, today: DateOnly) {
  const includes = (start: DateOnly, end: DateOnly) =>
    compareDateOnly(today, start) >= 0 && compareDateOnly(today, end) <= 0;

  return {
    erasApplicationsOpen:
      compareDateOnly(today, config.erasApplicationOpenDate) >= 0 &&
      compareDateOnly(today, config.erasProgramReviewDate) < 0,
    programsReviewing:
      compareDateOnly(today, config.erasProgramReviewDate) >= 0 &&
      compareDateOnly(today, config.matchDayDate) <= 0,
    nrmpRegistrationOpen: includes(
      config.nrmpRegistrationOpenDate,
      config.nrmpRegistrationCloseDate
    ),
    rankOrderListOpen: includes(config.nrmpRankingOpenDate, config.nrmpRankingCloseDate),
    isYesNoDay: compareDateOnly(today, config.yesNoDayDate) === 0,
    isMatchDay: compareDateOnly(today, config.matchDayDate) === 0,
  };
}

export function createApplicationCycleConfig(
  env: ApplicationCycleEnvironment = {}
): ApplicationCycleConfig {
  const values: Partial<Record<ApplicationCycleDateFields, DateOnly>> = {};

  for (const [field, envKey] of ENV_FIELDS) {
    const raw = env[envKey]?.trim();
    const resolved = raw || DEFAULT_APPLICATION_CYCLE_DATES[field];
    try {
      values[field] = parseDateOnly(resolved);
    } catch (error) {
      throw new Error(`Invalid Path to Ortho application-cycle override ${envKey}: ${(error as Error).message}`);
    }
  }

  const dates = values as Record<ApplicationCycleDateFields, DateOnly>;
  const chronologicalKeys: (typeof ENV_FIELDS)[number][0][] = [
    "erasApplicationOpenDate",
    "nrmpRegistrationOpenDate",
    "erasProgramReviewDate",
    "nrmpRegistrationCloseDate",
    "nrmpRankingOpenDate",
    "nrmpRankingCloseDate",
    "yesNoDayDate",
    "matchDayDate",
  ];

  for (let index = 1; index < chronologicalKeys.length; index += 1) {
    const previous = chronologicalKeys[index - 1];
    const current = chronologicalKeys[index];
    if (compareDateOnly(dates[previous], dates[current]) >= 0) {
      throw new Error(`${LABELS[current]} must occur after ${LABELS[previous]}.`);
    }
  }

  const milestones = chronologicalKeys.map((key) => ({ key, label: LABELS[key], date: dates[key] }));
  return { ...dates, milestones };
}
