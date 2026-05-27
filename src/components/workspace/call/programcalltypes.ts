/**
 * Re-exports from the single canonical source of truth.
 * DO NOT duplicate RuleType / RuleConfig / ProgramRule here.
 * Adding a new rule type only requires changes in rule-definitions.ts + evaluator branches.
 */
import type { CallTypeOption } from "@/lib/workspace/call/rule-definitions";

export type {
  CallTypeOption as CallType,
  RuleType,
  RuleConfig,
  ProgramRule,
} from "@/lib/workspace/call/rule-definitions";

// Re-export the constants and definitions for consumers that need them
export {
  CALL_TYPE_OPTIONS,
  PGY_YEAR_OPTIONS,
  RULE_DEFINITIONS,
  RULE_DEFINITION_MAP,
  SINGLETON_RULE_TYPES,
  getRuleDefinition,
  createDefaultRuleDraft,
  sanitizeRuleConfig,
  validateRuleDraft,
  normalizeRuleForSave,
  getEffectiveRules,
  mergeSingletonRuleIntoList,
  isSingletonRuleType,
  getDefaultRuleScope,
  DEFAULT_RULE_SCOPE,
} from "@/lib/workspace/call/rule-definitions";

export type ResidentOption = {
  // Canonical scheduler identity. This should resolve to program_roster.id.
  residentId: string;
  rosterId?: string | null;
  programMembershipId?: string | null;
  // Legacy compatibility field; scheduler state should use `residentId`.
  membershipId: string;
  displayName: string;
  trainingLevel: string | null;
  pgyYear: number | null;
  gradYear: number | null;
};

export type ExistingResidentStats = {
  residentId: string;
  rosterId?: string | null;
  // Legacy compatibility field; stats are keyed by `residentId`.
  membershipId: string;
  totalCallsYear: number;
  weekendCallsYear: number;
  primaryCallsYear: number;
  backupCallsYear: number;
};

export type DraftDayAssignment = {
  // Legacy field names: these values store canonical resident ids (program_roster.id),
  // not program_memberships.id.
  primaryMembershipId: string | null;
  backupMembershipId: string | null;
};

export type CalendarDay = {
  date: Date;
  key: string;
  dayNumber: number;
  dayName: string;
  isWeekend: boolean;
};

export type MonthCall = {
  id: string;
  residentId: string | null;
  rosterId?: string | null;
  programMembershipId?: string | null;
  // Legacy compatibility field; month calls should use `residentId`.
  membershipId: string | null;
  residentName: string;
  trainingLevel: string | null;
  pgyYear: number | null;
  gradYear: number | null;
  userId: string | null;
  callType: CallTypeOption | null;
  callDate: string | null;
  startDatetime: string | null;
  endDatetime: string | null;
  site: string | null;
  isHomeCall: boolean | null;
  notes: string | null;
  isMine: boolean;
};

export type MonthResponse = {
  monthStart: string;
  monthEnd: string;
  myMembershipId: string | null;
  calls: MonthCall[];
};

export type AssignmentFlagTone =
  | "rose"
  | "amber"
  | "sky"
  | "violet"
  | "slate";

export type AssignmentFlagCategory =
  | "rule"
  | "time_off"
  | "rotation"
  | "warning";

export type AssignmentFlag = {
  key: string;
  label: string;
  tone: AssignmentFlagTone;
  description?: string | null;
  category?: AssignmentFlagCategory;
};

export type QuickAssignSlotMode = "Primary" | "Backup" | "Both";

export type TimeOffConflict = {
  eventId: string;
  title: string | null;
  type: "personal" | "conference" | "vacation" | "sick" | "other";
  usingPto: boolean;
  startDate: string | null;
  endDate: string | null;
  approvalStatus: "requested" | "approved" | "denied" | null;
  location?: string | null;
  notes?: string | null;
};

export type RotationConflict = {
  rotationId: string | null;
  rotationName: string;
  startDate?: string | null;
  endDate?: string | null;
  reason?: string | null;
};

export type RuleEvaluationBlock = {
  ruleId?: string | null;
  ruleType: string;
  ruleName: string;
  message: string;
  isHardRule: boolean;
};

export type ResidentAvailabilityForDate = {
  residentId: string;
  membershipId: string;
  dateKey: string;

  isBlocked: boolean;
  isWarning: boolean;

  blocks?: RuleEvaluationBlock[];
  warnings?: RuleEvaluationBlock[];
  ruleBlocks?: RuleEvaluationBlock[];

  timeOffConflicts: TimeOffConflict[];
  rotationConflicts: RotationConflict[];

  flags: AssignmentFlag[];
};

export type ResidentAvailabilityMap = Record<
  string,
  Record<string, ResidentAvailabilityForDate>
>;

export type ProgramAvailabilityMonthResponse = {
  monthStart: string;
  monthEnd: string;
  residents: ResidentOption[];
  availability: ResidentAvailabilityMap;
};

export type ResidentSchedulingContext = {
  resident: ResidentOption;
  availability?: ResidentAvailabilityForDate;
  monthPrimary: number;
  monthBackup: number;
  monthTotal: number;
  monthWeekend: number;
  yearPrimary: number;
  yearBackup: number;
  yearTotal: number;
  yearWeekend: number;
  spacingFlags: number;
};

export type PgySummaryRow = {
  label: string;
  monthTotal: number;
  monthWeekend: number;
  yearTotal: number;
  yearWeekend: number;
};

export type ResidentSchedulingStats = {
  resident: ResidentOption;
  monthPrimary: number;
  monthBackup: number;
  monthTotal: number;
  monthWeekend: number;
  yearPrimary: number;
  yearBackup: number;
  yearTotal: number;
  yearWeekend: number;
  spacingFlags: number;
};
