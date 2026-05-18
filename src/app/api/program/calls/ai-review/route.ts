// src/app/api/program/calls/ai-review/route.ts

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { buildSchedulePacket } from "@/lib/workspace/call/buildSchedulePacket";
import { getFlagsForAssignedResident } from "@/components/workspace/call/programcallevaluator";
import type {
  CalendarDay,
  DraftDayAssignment,
  ProgramAvailabilityMonthResponse,
  ProgramRule,
  ResidentOption,
} from "@/components/workspace/call/programcalltypes";

export const runtime = "nodejs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type Slot = "Primary" | "Backup";
type JsonRecord = Record<string, unknown>;

type WarningCategory =
  | "hard_or_eligibility"
  | "spacing"
  | "weekend"
  | "workload"
  | "other";

type ResidentStatLike = {
  resident?: {
    displayName?: string;
    trainingLevel?: string;
    pgyYear?: number;
  };
  displayName?: string;
  name?: string;
  trainingLevel?: string;
  pgy?: string;
  pgyYear?: number;
  monthPrimary?: number;
  primary?: number;
  monthBackup?: number;
  backup?: number;
  monthTotal?: number;
  total?: number;
  monthWeekend?: number;
  weekend?: number;
  monthWeekendPrimary?: number;
  weekendPrimary?: number;
  monthWeekendBackup?: number;
  weekendBackup?: number;
  weightedBurden?: number;
  adjustedBurden?: number;
};

type ResidentSummary = {
  name: string;
  pgy: string;
  primary: number;
  backup: number;
  total: number;
  weekend: number;
  weekendPrimary: number;
  weekendBackup: number;
  weightedBurden: number;
  weightedWeekendBurden: number;
  adjustedBurden: number;
};

type WarningItem = {
  dateKey: string;
  slot: Slot;
  residentName: string;
  message: string;
  category: WarningCategory;
};

type WarningSummary = {
  total: number;
  primary: number;
  backup: number;
  spacing: number;
  weekend: number;
  workload: number;
  hardOrEligibility: number;
  examples: WarningItem[];
};

type OptionSummary = {
  rank: number;
  score: number;
  isComplete: boolean;
  openRequiredSlots: number;
  spreads: {
    total: number;
    primary: number;
    backup: number;
    weightedBurden: number;
    weekendPrimary: number;
    weightedWeekend: number;
  };
  highestTotal: ResidentSummary[];
  highestPrimary: ResidentSummary[];
  highestBackup: ResidentSummary[];
  highestWeekendPrimary: ResidentSummary[];
  warningSummary: WarningSummary;
  residentSummaries: ResidentSummary[];
  assignments: Record<string, DraftDayAssignment>;
};

type OptionInterpretation = {
  rank: number;
  label: string;
  summary: string;
  strengths: string[];
  tradeoffs: string[];
  bestFor: string;
};

type ReviewRaw = {
  title?: unknown;
  summary?: unknown;
  status?: unknown;
  severity?: unknown;
  keyFindings?: unknown;
  ruleWarnings?: unknown;
  workloadNotes?: unknown;
  generatorNotes?: unknown;
  recommendation?: unknown;
  shouldRequestSuggestions?: unknown;
};

function arr(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" ? (value as JsonRecord) : {};
}

function safeNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function round(value: unknown, digits = 2) {
  const number = safeNumber(value, 0);
  return Number(number.toFixed(digits));
}

function sanitizeStringArray(value: unknown, maxItems: number) {
  return arr(value).slice(0, maxItems).map(String).filter(Boolean);
}

function toDraftAssignments(value: unknown): Record<string, DraftDayAssignment> {
  return record(value) as Record<string, DraftDayAssignment>;
}

function getFlagText(flag: unknown) {
  if (typeof flag === "string") return flag;

  const raw = record(flag);

  return String(
    raw.message ??
      raw.label ??
      raw.description ??
      raw.reason ??
      raw.type ??
      JSON.stringify(flag)
  );
}

function classifyWarning(text: string): WarningCategory {
  const lower = text.toLowerCase();

  if (
    lower.includes("unavailable") ||
    lower.includes("availability") ||
    lower.includes("cannot") ||
    lower.includes("not allowed") ||
    lower.includes("pgy") ||
    lower.includes("restricted")
  ) {
    return "hard_or_eligibility";
  }

  if (
    lower.includes("spacing") ||
    lower.includes("consecutive") ||
    lower.includes("day(s) from") ||
    lower.includes("minimum")
  ) {
    return "spacing";
  }

  if (lower.includes("weekend") || lower.includes("sat") || lower.includes("sun")) {
    return "weekend";
  }

  if (
    lower.includes("max") ||
    lower.includes("monthly") ||
    lower.includes("burden") ||
    lower.includes("call")
  ) {
    return "workload";
  }

  return "other";
}

function getResidentName(stat: ResidentStatLike) {
  return String(
    stat.resident?.displayName ?? stat.displayName ?? stat.name ?? "Unknown"
  );
}

function getResidentPgy(stat: ResidentStatLike) {
  return String(
    stat.resident?.trainingLevel ??
      stat.trainingLevel ??
      stat.pgy ??
      (typeof stat.resident?.pgyYear === "number"
        ? `PGY-${stat.resident.pgyYear}`
        : typeof stat.pgyYear === "number"
        ? `PGY-${stat.pgyYear}`
        : "Unknown")
  );
}

function getWeightedBurden(stat: ResidentStatLike) {
  const primary = safeNumber(stat.monthPrimary ?? stat.primary);
  const backup = safeNumber(stat.monthBackup ?? stat.backup);
  return round(primary + backup * 0.25);
}

function getWeightedWeekendBurden(stat: ResidentStatLike) {
  const weekendPrimary = safeNumber(
    stat.monthWeekendPrimary ?? stat.weekendPrimary
  );
  const weekendBackup = safeNumber(stat.monthWeekendBackup ?? stat.weekendBackup);
  const fallbackWeekend = safeNumber(stat.monthWeekend ?? stat.weekend);

  return weekendPrimary || weekendBackup
    ? round(weekendPrimary + weekendBackup * 0.3)
    : round(fallbackWeekend);
}

function summarizeStats(stats: unknown[]): ResidentSummary[] {
  return arr(stats).map((item) => {
    const s = item as ResidentStatLike;
    const primary = safeNumber(s.monthPrimary ?? s.primary);
    const backup = safeNumber(s.monthBackup ?? s.backup);

    return {
      name: getResidentName(s),
      pgy: getResidentPgy(s),
      primary,
      backup,
      total: safeNumber(s.monthTotal ?? s.total, primary + backup),
      weekend: safeNumber(s.monthWeekend ?? s.weekend),
      weekendPrimary: safeNumber(s.monthWeekendPrimary ?? s.weekendPrimary),
      weekendBackup: safeNumber(s.monthWeekendBackup ?? s.weekendBackup),
      weightedBurden: getWeightedBurden(s),
      weightedWeekendBurden: getWeightedWeekendBurden(s),
      adjustedBurden:
        typeof s.adjustedBurden === "number"
          ? round(s.adjustedBurden)
          : typeof s.weightedBurden === "number"
          ? round(s.weightedBurden)
          : getWeightedBurden(s),
    };
  });
}

function getSpread(values: number[]) {
  if (values.length === 0) return 0;
  return round(Math.max(...values) - Math.min(...values));
}

function getOptionWarningSummary({
  assignments,
  body,
}: {
  assignments: Record<string, DraftDayAssignment>;
  body: unknown;
}): WarningSummary {
  const bodyRecord = record(body);
  const monthDays = arr(bodyRecord.monthDays) as CalendarDay[];
  const residents = arr(bodyRecord.residents) as ResidentOption[];
  const rules = arr(bodyRecord.rules) as ProgramRule[];
  const availabilityByResident =
    (bodyRecord.availabilityByResident ??
      {}) as ProgramAvailabilityMonthResponse["availability"];

  const residentLookup = new Map(
    residents.map((resident) => [resident.membershipId, resident])
  );

  const warnings: WarningItem[] = [];

  for (const day of monthDays) {
    const assignment = assignments[day.key];
    if (!assignment) continue;

    function check(residentId: string | null | undefined, slot: Slot) {
      if (!residentId) return;

      const resident = residentLookup.get(residentId);
      if (!resident) return;

      const flags = getFlagsForAssignedResident({
        resident,
        slot,
        dateKey: day.key,
        assignments,
        rules,
        availabilityByResident,
      });

      for (const flag of flags) {
        const message = getFlagText(flag);

        warnings.push({
          dateKey: day.key,
          slot,
          residentName: String(resident.displayName ?? "Unknown"),
          message,
          category: classifyWarning(message),
        });
      }
    }

    check(assignment.primaryMembershipId, "Primary");
    check(assignment.backupMembershipId, "Backup");
  }

  const seen = new Set<string>();
  const uniqueWarnings = warnings.filter((warning) => {
    const key = `${warning.dateKey}|${warning.slot}|${warning.residentName}|${warning.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return {
    total: uniqueWarnings.length,
    primary: uniqueWarnings.filter((warning) => warning.slot === "Primary").length,
    backup: uniqueWarnings.filter((warning) => warning.slot === "Backup").length,
    spacing: uniqueWarnings.filter((warning) => warning.category === "spacing").length,
    weekend: uniqueWarnings.filter((warning) => warning.category === "weekend").length,
    workload: uniqueWarnings.filter((warning) => warning.category === "workload").length,
    hardOrEligibility: uniqueWarnings.filter(
      (warning) => warning.category === "hard_or_eligibility"
    ).length,
    examples: uniqueWarnings.slice(0, 5),
  };
}

function summarizeCombo(
  comboRaw: unknown,
  fallbackRank: number,
  body: unknown
): OptionSummary {
  const combo = record(comboRaw);

  const stats = summarizeStats(
    Array.isArray(combo.residentSummaries)
      ? combo.residentSummaries
      : Array.isArray(combo.stats)
      ? combo.stats
      : []
  );

  const primaryValues = stats.map((s) => s.primary);
  const backupValues = stats.map((s) => s.backup);
  const totalValues = stats.map((s) => s.total);
  const weightedValues = stats.map((s) => s.weightedBurden);
  const weekendPrimaryValues = stats.map((s) => s.weekendPrimary);
  const weekendWeightedValues = stats.map((s) => s.weightedWeekendBurden);

  const highestTotal = [...stats].sort((a, b) => b.total - a.total).slice(0, 4);
  const highestPrimary = [...stats]
    .sort((a, b) => b.primary - a.primary)
    .slice(0, 4);
  const highestBackup = [...stats].sort((a, b) => b.backup - a.backup).slice(0, 4);
  const highestWeekendPrimary = [...stats]
    .sort(
      (a, b) =>
        b.weekendPrimary - a.weekendPrimary ||
        b.weightedWeekendBurden - a.weightedWeekendBurden
    )
    .slice(0, 4);

  const assignments = toDraftAssignments(combo.assignments);

  return {
    rank: safeNumber(combo.rank, fallbackRank),
    score: round(combo.score),
    isComplete: Boolean(combo.isComplete),
    openRequiredSlots: safeNumber(combo.openRequiredSlots),
    spreads: {
      total: getSpread(totalValues),
      primary: getSpread(primaryValues),
      backup: getSpread(backupValues),
      weightedBurden: getSpread(weightedValues),
      weekendPrimary: getSpread(weekendPrimaryValues),
      weightedWeekend: getSpread(weekendWeightedValues),
    },
    highestTotal,
    highestPrimary,
    highestBackup,
    highestWeekendPrimary,
    warningSummary: getOptionWarningSummary({ assignments, body }),
    residentSummaries: stats,
    assignments,
  };
}

function buildTopOptions(generationReport: unknown, body: unknown): OptionSummary[] {
  const report = record(generationReport);
  const fullCombos = arr(report.topCombinations);
  const summaries = arr(report.topCombinationSummaries);
  const source = fullCombos.length > 0 ? fullCombos : summaries;

  return source.slice(0, 5).map((comboRaw, index) => {
    const combo = record(comboRaw);
    const summary = record(summaries[index]);

    return summarizeCombo(
      {
        ...summary,
        ...combo,
        assignments: combo.assignments ?? summary.assignments ?? {},
        stats: combo.stats ?? summary.residentSummaries ?? [],
      },
      index + 1,
      body
    );
  });
}

function getNoticeableLeader(
  residents: ResidentSummary[],
  key: "total" | "primary" | "backup" | "weekendPrimary"
) {
  const sorted = [...residents].sort(
    (a, b) => safeNumber(b[key]) - safeNumber(a[key])
  );
  const top = sorted[0];
  const second = sorted[1];

  if (!top) return null;

  const topValue = safeNumber(top[key]);
  const secondValue = safeNumber(second?.[key]);

  if (topValue <= 0) return null;

  return {
    name: top.name,
    pgy: top.pgy,
    value: topValue,
    nextValue: secondValue,
    isNoticeablyHigher: topValue > secondValue,
  };
}

function warningComparisonText(current: OptionSummary, best: OptionSummary) {
  const currentWarnings = current.warningSummary.total;
  const bestWarnings = best.warningSummary.total;
  const delta = currentWarnings - bestWarnings;

  if (delta === 0) return `same warnings as Option 1 (${currentWarnings})`;
  if (delta > 0) return `${delta} more warning${delta === 1 ? "" : "s"} than Option 1`;
  return `${Math.abs(delta)} fewer warning${Math.abs(delta) === 1 ? "" : "s"} than Option 1`;
}

function warningLocationText(option: OptionSummary) {
  const warnings = option.warningSummary;
  if (warnings.total === 0) return "no rule warnings";

  if (warnings.primary > warnings.backup) {
    return `mostly Primary warnings (${warnings.primary}/${warnings.total})`;
  }

  if (warnings.backup > warnings.primary) {
    return `mostly Backup warnings (${warnings.backup}/${warnings.total})`;
  }

  return `split between Primary and Backup warnings (${warnings.total} total)`;
}

function buildDeterministicOptionInterpretations(
  topOptions: OptionSummary[]
): OptionInterpretation[] {
  if (topOptions.length === 0) return [];

  const best = topOptions[0];

  return topOptions.map((option) => {
    const totalLeader = getNoticeableLeader(option.residentSummaries, "total");
    const primaryLeader = getNoticeableLeader(option.residentSummaries, "primary");
    const weekendLeader = getNoticeableLeader(
      option.residentSummaries,
      "weekendPrimary"
    );

    const scoreDelta = round(option.score - best.score);
    const warningText = warningComparisonText(option, best);
    const warningLocation = warningLocationText(option);

    const strengths: string[] = [];
    const tradeoffs: string[] = [];

    if (option.openRequiredSlots === 0) {
      strengths.push("Complete schedule");
    } else {
      tradeoffs.push(`${option.openRequiredSlots} open required slot(s)`);
    }

    if (option.spreads.primary <= best.spreads.primary) {
      strengths.push(`Primary spread ${option.spreads.primary}`);
    } else {
      tradeoffs.push(`Primary spread ${option.spreads.primary}`);
    }

    if (option.warningSummary.total === 0) {
      strengths.push("No rule warnings");
    } else {
      tradeoffs.push(`${option.warningSummary.total} rule warning(s), ${warningLocation}`);
    }

    if (totalLeader?.isNoticeablyHigher) {
      tradeoffs.push(`${totalLeader.name} has the highest total call (${totalLeader.value})`);
    }

    if (primaryLeader?.isNoticeablyHigher) {
      tradeoffs.push(`${primaryLeader.name} has the highest primary call (${primaryLeader.value})`);
    }

    if (weekendLeader?.isNoticeablyHigher) {
      tradeoffs.push(
        `${weekendLeader.name} has the most weekend primary call (${weekendLeader.value})`
      );
    }

    let label = "Balanced option";
    if (option.rank === 1) label = "Best overall";
    else if (option.warningSummary.total > best.warningSummary.total) label = "More warnings";
    else if (option.spreads.primary < best.spreads.primary) label = "Better primary balance";
    else if (option.spreads.weekendPrimary < best.spreads.weekendPrimary) {
      label = "Better weekend balance";
    } else if (option.openRequiredSlots > 0) label = "Incomplete";
    else label = "Usable alternative";

    const personTradeoffs = [
      totalLeader?.isNoticeablyHigher
        ? `${totalLeader.name} carries the most total call (${totalLeader.value})`
        : null,
      primaryLeader?.isNoticeablyHigher
        ? `${primaryLeader.name} carries the most primary call (${primaryLeader.value})`
        : null,
      weekendLeader?.isNoticeablyHigher
        ? `${weekendLeader.name} carries the most weekend primary call (${weekendLeader.value})`
        : null,
    ].filter((value): value is string => Boolean(value));

    const summaryParts = [
      option.openRequiredSlots === 0
        ? "This option is complete"
        : `This option leaves ${option.openRequiredSlots} required slot(s) open`,
      personTradeoffs.length > 0
        ? personTradeoffs.join(", ")
        : "no single resident stands out as carrying a clearly higher burden",
      `${warningText} and ${warningLocation}`,
      scoreDelta === 0
        ? "it scores the same as Option 1"
        : option.rank === 1
        ? "it has the best overall score"
        : `it is ${scoreDelta} points behind Option 1`,
    ];

    return {
      rank: option.rank,
      label,
      summary: `${summaryParts.join("; ")}.`,
      strengths: strengths.slice(0, 3),
      tradeoffs: tradeoffs.slice(0, 4),
      bestFor:
        option.rank === 1
          ? "Best default choice unless you prefer a specific tradeoff in another option."
          : option.warningSummary.total < best.warningSummary.total
          ? "Best if avoiding rule warnings matters more than the overall score."
          : option.spreads.primary < best.spreads.primary
          ? "Best if primary-call balance matters more than the overall score."
          : option.spreads.weekendPrimary < best.spreads.weekendPrimary
          ? "Best if weekend-primary balance matters more than the overall score."
          : "Use only if the selected resident pattern fits your program better.",
    };
  });
}

function extractAssignedRuleFlags(body: unknown): WarningItem[] {
  const bodyRecord = record(body);
  const context = record(bodyRecord.aiReviewContext);
  const schedule = arr(context.schedule);

  const flags: WarningItem[] = [];

  for (const dayRaw of schedule) {
    const day = record(dayRaw);

    for (const flag of arr(day.primaryFlags)) {
      const message = getFlagText(flag);
      flags.push({
        dateKey: String(day.dateKey ?? ""),
        slot: "Primary",
        residentName: String(day.primaryName ?? "Unknown"),
        message,
        category: classifyWarning(message),
      });
    }

    for (const flag of arr(day.backupFlags)) {
      const message = getFlagText(flag);
      flags.push({
        dateKey: String(day.dateKey ?? ""),
        slot: "Backup",
        residentName: String(day.backupName ?? "Unknown"),
        message,
        category: classifyWarning(message),
      });
    }
  }

  return flags;
}

function summarizeWarningCounts(flags: WarningItem[]) {
  return {
    total: flags.length,
    primary: flags.filter((flag) => flag.slot === "Primary").length,
    backup: flags.filter((flag) => flag.slot === "Backup").length,
    hardOrEligibility: flags.filter((flag) => flag.category === "hard_or_eligibility")
      .length,
    spacing: flags.filter((flag) => flag.category === "spacing").length,
    weekend: flags.filter((flag) => flag.category === "weekend").length,
    workload: flags.filter((flag) => flag.category === "workload").length,
    other: flags.filter((flag) => flag.category === "other").length,
  };
}

function buildOptionComparison(topOptions: OptionSummary[]) {
  if (topOptions.length === 0) return [];

  const best = topOptions[0];

  return topOptions.map((option) => ({
    rank: option.rank,
    score: option.score,
    scoreDeltaFromBest: round(option.score - best.score),
    isComplete: option.isComplete,
    openRequiredSlots: option.openRequiredSlots,
    spreads: option.spreads,
    highestTotal: option.highestTotal,
    highestPrimary: option.highestPrimary,
    highestBackup: option.highestBackup,
    highestWeekendPrimary: option.highestWeekendPrimary,
    ruleWarnings: option.warningSummary,
    residentSummaries: option.residentSummaries,
  }));
}

function buildDeterministicReviewFacts(
  body: unknown,
  schedulePacketRaw: unknown,
  topOptions: OptionSummary[]
) {
  const bodyRecord = record(body);
  const context = record(bodyRecord.aiReviewContext);
  const coverage = record(context.coverage);
  const schedulePacket = record(schedulePacketRaw);
  const summary = record(schedulePacket.summary);
  const generationReport = record(schedulePacket.generationReport);

  const assignedRuleFlags = extractAssignedRuleFlags(body);
  const warningCounts = summarizeWarningCounts(assignedRuleFlags);
  const selected = topOptions[0] ?? null;
  const second = topOptions[1] ?? null;

  return {
    coverage: {
      assignedSlots: summary.assignedSlots ?? coverage.assignedSlots ?? null,
      expectedSlots: summary.expectedSlots ?? coverage.expectedSlots ?? null,
      openRequiredSlots:
        summary.openRequiredSlots ??
        (Array.isArray(coverage.unfilledRequiredSlots)
          ? coverage.unfilledRequiredSlots.length
          : undefined) ??
        selected?.openRequiredSlots ??
        null,
    },
    ruleWarnings: {
      count: assignedRuleFlags.length,
      counts: warningCounts,
      actualWarnings: assignedRuleFlags.slice(0, 20),
    },
    generatorComparison: {
      attemptsRun: generationReport.attemptsRun ?? null,
      uniqueCombinations: generationReport.uniqueCombinations ?? null,
      completeCombinationCount: generationReport.completeCombinationCount ?? null,
      selectedRank: selected?.rank ?? 1,
      selectedScore: selected?.score ?? null,
      secondBestScore: second?.score ?? null,
      scoreGapVsSecondBest:
        selected && second ? round(second.score - selected.score) : null,
      topOptions: buildOptionComparison(topOptions),
    },
    optionInterpretations: buildDeterministicOptionInterpretations(topOptions),
    workload: selected
      ? {
          highestTotal: selected.highestTotal,
          highestPrimary: selected.highestPrimary,
          highestBackup: selected.highestBackup,
          highestWeekendPrimary: selected.highestWeekendPrimary,
          allResidents: selected.residentSummaries,
        }
      : {
          highestTotal: [],
          highestPrimary: [],
          highestBackup: [],
          highestWeekendPrimary: [],
          allResidents: [],
        },
  };
}

function sanitizeReview(
  rawValue: unknown,
  deterministicOptionInterpretations: OptionInterpretation[]
) {
  const raw = rawValue as ReviewRaw;

  return {
    title: String(raw?.title ?? "Schedule review"),
    summary: String(raw?.summary ?? ""),
    status:
      raw?.status === "good" ||
      raw?.status === "review_needed" ||
      raw?.status === "problem"
        ? raw.status
        : "review_needed",
    severity:
      raw?.severity === "high" ||
      raw?.severity === "medium" ||
      raw?.severity === "low"
        ? raw.severity
        : "low",
    keyFindings: sanitizeStringArray(raw?.keyFindings, 5),
    ruleWarnings: sanitizeStringArray(raw?.ruleWarnings, 8),
    workloadNotes: sanitizeStringArray(raw?.workloadNotes, 6),
    generatorNotes: sanitizeStringArray(raw?.generatorNotes, 6),
    optionInterpretations: deterministicOptionInterpretations,
    recommendation: String(raw?.recommendation ?? ""),
    shouldRequestSuggestions: false,
  };
}

export async function POST(request: NextRequest) {
  try {
    const rawBody: unknown = await request.json();
const bodyRecord = record(rawBody);

if (
  !Array.isArray(bodyRecord.monthDays) ||
  !Array.isArray(bodyRecord.residents)
) {
  return NextResponse.json(
    { error: "Missing schedule data." },
    { status: 400 }
  );
}

const body = rawBody as Parameters<typeof buildSchedulePacket>[0];

const { schedulePacket } = buildSchedulePacket(body);
    const packetRecord = record(schedulePacket);
    const generationReport = packetRecord.generationReport ?? {};

    const topOptions = buildTopOptions(generationReport, body);
    const reviewFacts = buildDeterministicReviewFacts(
      body,
      schedulePacket,
      topOptions
    );

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.05,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `
You are a senior chief resident reviewing a generated residency call schedule.

Use ONLY reviewFacts. Do not invent names, dates, rules, or alternatives.

Keep the review concise and practical. The optionInterpretations are already computed by code and will be shown directly to the user, so do NOT rewrite them.

Focus on:
1. Coverage.
2. Rule warnings on the selected option.
3. Whether Option 1 is clearly best or only marginally better.
4. Whether the burden is concentrated on specific residents.

Return JSON only:
{
  "review": {
    "title": "short specific title",
    "summary": "max 2 sentences",
    "status": "good" | "review_needed" | "problem",
    "severity": "low" | "medium" | "high",
    "keyFindings": [
      "coverage interpretation",
      "selected option tradeoff",
      "primary/weekend-primary balance interpretation"
    ],
    "ruleWarnings": ["specific selected-option warning bullets"],
    "workloadNotes": ["specific resident workload bullets"],
    "generatorNotes": ["specific comparison of option 1 vs other options"],
    "recommendation": "one short practical sentence",
    "shouldRequestSuggestions": false
  }
}
          `.trim(),
        },
        {
          role: "user",
          content: JSON.stringify({ reviewFacts }),
        },
      ],
    });

    const parsed = JSON.parse(completion.choices[0]?.message?.content ?? "{}");
    const parsedRecord = record(parsed);

    return NextResponse.json({
      review: sanitizeReview(parsedRecord.review, reviewFacts.optionInterpretations),
      scheduleSummary: packetRecord.summary,
      reviewFacts,
      topOptions,
    });
  } catch (error) {
    console.error("AI review error:", error);
    return NextResponse.json(
      { error: "Failed to review schedule." },
      { status: 500 }
    );
  }
}