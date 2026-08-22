export type CalendarAlias = {
  normalized_alias: string;
  roster_id: string;
  program_membership_id: string | null;
  active_from?: string | null;
  active_to?: string | null;
};

export type ImportIssue = {
  code: string;
  severity: "warning" | "blocked";
  message: string;
};

export function normalizeCalendarPersonName(value: string) {
  return value
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("en-US");
}

export function parseCalendarTitle(value: string) {
  const original = value.normalize("NFKC").trim().replace(/\s+/g, " ");
  const holidayMatch = original.match(
    /^(.+?)\s+-\s+(labor day|memorial day|thanksgiving|christmas|new year(?:'s)? day)$/i,
  );
  const personPart = holidayMatch?.[1] ?? original;
  return {
    original,
    normalizedPerson: normalizeCalendarPersonName(personPart),
    suffix: holidayMatch?.[2] ?? null,
  };
}

export function isIgnoredCalendarTitle(value: string) {
  return /(?:^|[\s\-–—:()])pto(?:$|[\s\-–—:()])/i.test(
    value.normalize("NFKC").trim(),
  );
}

export function enumerateAllDayDates(
  startDate: string,
  endDateExclusive: string,
) {
  const output: string[] = [];
  const cursor = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDateExclusive}T00:00:00.000Z`);
  while (cursor < end) {
    output.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return output;
}

export function resolveCalendarAlias(params: {
  aliases: CalendarAlias[];
  normalizedTitle: string;
  eventDate: string;
}) {
  const matches = params.aliases.filter((alias) => {
    if (alias.normalized_alias !== params.normalizedTitle) return false;
    if (alias.active_from && alias.active_from > params.eventDate) return false;
    if (alias.active_to && alias.active_to < params.eventDate) return false;
    return true;
  });

  const uniqueRosterIds = new Set(matches.map((match) => match.roster_id));
  if (uniqueRosterIds.size !== 1)
    return { match: null, count: uniqueRosterIds.size };
  return { match: matches[0] ?? null, count: 1 };
}

export function validateCalendarEvent(params: {
  title: string;
  startDate?: string | null;
  endDateExclusive?: string | null;
  startDateTime?: string | null;
  endDateTime?: string | null;
  aliases: CalendarAlias[];
}) {
  const parsed = parseCalendarTitle(params.title);
  const ignored = isIgnoredCalendarTitle(parsed.original);
  const issues: ImportIssue[] = [];
  let dates: string[] = [];

  if (params.startDate && params.endDateExclusive) {
    dates = enumerateAllDayDates(params.startDate, params.endDateExclusive);
  } else if (params.startDateTime && params.endDateTime) {
    const start = new Date(params.startDateTime);
    const end = new Date(params.endDateTime);
    if (
      !Number.isFinite(start.getTime()) ||
      !Number.isFinite(end.getTime()) ||
      end <= start
    ) {
      issues.push({
        code: "invalid_time_range",
        severity: "blocked",
        message: "Event end must be after its start.",
      });
    } else {
      dates = [params.startDateTime.slice(0, 10)];
    }
  } else {
    issues.push({
      code: "missing_time_range",
      severity: "blocked",
      message: "Event is missing a supported start/end range.",
    });
  }

  if (dates.length === 0 && issues.length === 0) {
    issues.push({
      code: "empty_date_range",
      severity: "blocked",
      message: "Event does not cover a calendar date.",
    });
  }

  const alias = ignored
    ? { match: null, count: 0 }
    : resolveCalendarAlias({
        aliases: params.aliases,
        normalizedTitle: parsed.normalizedPerson,
        eventDate: dates[0] ?? "0000-01-01",
      });
  if (!ignored && alias.count === 0) {
    issues.push({
      code: "unmatched_person",
      severity: "blocked",
      message: `No roster alias matches “${parsed.original}”.`,
    });
  } else if (!ignored && alias.count > 1) {
    issues.push({
      code: "ambiguous_person",
      severity: "blocked",
      message: `More than one roster member matches “${parsed.original}”.`,
    });
  }
  if (!ignored && parsed.suffix) {
    issues.push({
      code: "recognized_suffix",
      severity: "warning",
      message: `Recognized title suffix “${parsed.suffix}”.`,
    });
  }
  if (!ignored && dates.length > 1) {
    issues.push({
      code: "multi_day_event",
      severity: "warning",
      message: `Event expands to ${dates.length} daily assignments.`,
    });
  }

  return {
    parsed,
    dates,
    alias: alias.match,
    issues,
    validationStatus: ignored
      ? ("ignored" as const)
      : issues.some((issue) => issue.severity === "blocked")
        ? ("blocked" as const)
        : issues.length > 0
          ? ("warning" as const)
          : ("valid" as const),
  };
}
