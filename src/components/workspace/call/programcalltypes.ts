export type CallType = "Primary" | "Backup";

export type RuleType =
  | "min_days_between_assignments"
  | "max_calls_per_month"
  | "max_weekends_per_month"
  | "restrict_call_type_by_pgy"
  | "weekend_pairing"
  | "restrict_call_by_rotation";

export type RuleConfig = {
  minDays?: number;
  excludeAdjacentWeekendPairing?: boolean;

  maxCalls?: number;
  maxWeekends?: number;

  restrictedPgyYears?: number[];
  allowedCallTypes?: CallType[];

  sameResidentForWeekend?: boolean;

  rotationIds?: string[];
  blockAllCall?: boolean;
  restrictedCallTypes?: CallType[];
};

export type ProgramRule = {
  id: string;
  name: string;
  rule_type: RuleType;
  is_enabled: boolean;
  is_hard_rule: boolean;
  config: RuleConfig;
};

export type ResidentOption = {
  membershipId: string;
  displayName: string;
  trainingLevel: string | null;
  pgyYear: number | null;
  gradYear: number | null;
};

export type ExistingResidentStats = {
  membershipId: string;
  totalCallsYear: number;
  weekendCallsYear: number;
  primaryCallsYear: number;
  backupCallsYear: number;
};

export type DraftDayAssignment = {
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
  membershipId: string | null;
  residentName: string;
  trainingLevel: string | null;
  pgyYear: number | null;
  gradYear: number | null;
  userId: string | null;
  callType: CallType | null;
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
  type: "personal" | "conference";
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
  membershipId: string;
  dateKey: string;

  isBlocked: boolean;
  isWarning: boolean;

  blocks: RuleEvaluationBlock[];
  warnings: RuleEvaluationBlock[];

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