import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { extractSlotDefinitions, DEFAULT_SLOT_DEFINITIONS } from "@/components/workspace/call/programcalltypes";
import { generateCallSchedule } from "@/components/workspace/call/programcallautogenerator";
import { debugCallGenerationMonth } from "@/lib/workspace/call/debugCallGeneration";
import { getResidentStatusDetails } from "@/lib/workspace/pgy";

const PROGRAM_ID = "082cc352-bba2-4f19-b837-b28d0878a308";
const YEAR = 2026;
const MONTH = 7;

function readEnvFile(path: string) {
  return Object.fromEntries(
    fs
      .readFileSync(path, "utf8")
      .split(/\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const index = line.indexOf("=");
        return [
          line.slice(0, index),
          line.slice(index + 1).replace(/^['"]|['"]$/g, ""),
        ];
      })
  );
}

function createMonthDays(year: number, month: number) {
  const totalDays = new Date(year, month, 0).getDate();
  return Array.from({ length: totalDays }, (_, index) => {
    const dayNumber = index + 1;
    const date = new Date(year, month - 1, dayNumber);
    return {
      date,
      key: `${year}-${String(month).padStart(2, "0")}-${String(dayNumber).padStart(2, "0")}`,
      dayNumber,
      dayName: date.toLocaleDateString("en-US", { weekday: "short" }),
      isWeekend: [0, 6].includes(date.getDay()),
    };
  });
}

async function main() {
  const env = readEnvFile(".env.local");
  const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const monthStart = `${YEAR}-${String(MONTH).padStart(2, "0")}-01`;
  const monthEnd = `${YEAR}-${String(MONTH).padStart(2, "0")}-31`;

  const [{ data: rosterRows, error: rosterError }, { data: rotationRows, error: rotationError }, { data: ruleSetRow, error: ruleSetError }] =
    await Promise.all([
      supabase
        .from("program_roster")
        .select("id,program_membership_id,full_name,first_name,last_name,grad_year,role")
        .eq("program_id", PROGRAM_ID)
        .eq("role", "resident")
        .order("grad_year", { ascending: true }),
      supabase
        .from("rotation_assignments")
        .select(`
          roster_id,
          program_membership_id,
          start_date,
          end_date,
          team_label,
          site_label,
          rotations (
            id,
            name,
            short_name
          )
        `)
        .eq("program_id", PROGRAM_ID)
        .lte("start_date", monthEnd)
        .gte("end_date", monthStart),
      supabase
        .from("program_call_rule_sets")
        .select("id")
        .eq("program_id", PROGRAM_ID)
        .eq("is_default", true)
        .maybeSingle(),
    ]);

  if (rosterError) throw rosterError;
  if (rotationError) throw rotationError;
  if (ruleSetError) throw ruleSetError;
  if (!ruleSetRow?.id) throw new Error("No default rule set found");

  const { data: rules, error: rulesError } = await supabase
    .from("program_call_rules")
    .select("*")
    .eq("program_id", PROGRAM_ID)
    .eq("rule_set_id", ruleSetRow.id)
    .order("priority", { ascending: true });
  if (rulesError) throw rulesError;

  const rotationAssignmentsByRosterId = new Map<string, any[]>();
  for (const row of rotationRows ?? []) {
    const rosterId = row.roster_id ? String(row.roster_id) : null;
    if (!rosterId) continue;
    const current = rotationAssignmentsByRosterId.get(rosterId) ?? [];
    const rotation = Array.isArray(row.rotations) ? row.rotations[0] : row.rotations;
    current.push({
      rotationId: rotation?.id ?? null,
      rotationName: rotation?.name ?? null,
      rotationShortName: rotation?.short_name ?? null,
      teamLabel: row.team_label ?? null,
      siteLabel: row.site_label ?? null,
      startDate: row.start_date ?? null,
      endDate: row.end_date ?? null,
    });
    rotationAssignmentsByRosterId.set(rosterId, current);
  }

  const residents = (rosterRows ?? []).map((row) => {
    const rosterId = String(row.id);
    const status = getResidentStatusDetails(row.grad_year, monthStart);
    return {
      residentId: rosterId,
      rosterId,
      membershipId: row.program_membership_id ? String(row.program_membership_id) : rosterId,
      programMembershipId: row.program_membership_id ? String(row.program_membership_id) : null,
      displayName:
        row.full_name ??
        [row.first_name, row.last_name].filter(Boolean).join(" ") ??
        "Unknown",
      trainingLevel: status.statusLabel === "Unknown" ? null : status.statusLabel,
      pgyYear: status.pgyYear,
      gradYear: row.grad_year ?? null,
      residentStatus: status.statusLabel,
      rotationAssignments: rotationAssignmentsByRosterId.get(rosterId) ?? [],
    };
  }).filter((resident) => resident.trainingLevel);

  const slotDefinitions = extractSlotDefinitions(rules ?? []);
  const monthDays = createMonthDays(YEAR, MONTH);

  const generated = generateCallSchedule({
    monthDays,
    residents,
    existingAssignments: {},
    rules: (rules ?? []).filter((rule) => rule.rule_type !== "call_slot_definition"),
    slotDefinitions: slotDefinitions.length > 0 ? slotDefinitions : DEFAULT_SLOT_DEFINITIONS,
    generationVersion: Date.now(),
    forceRegenerate: true,
    availabilityByResident: {},
    historicalStats: [],
    slotMode: "Both",
  });

  const debugReport = debugCallGenerationMonth({
    programId: PROGRAM_ID,
    year: YEAR,
    month: MONTH,
    residents,
    rotations: residents.flatMap((resident) =>
      (resident.rotationAssignments ?? []).map((assignment) => ({
        residentId: resident.residentId,
        rosterId: resident.residentId,
        residentName: resident.displayName,
        ...assignment,
      }))
    ),
    rules: (rules ?? []).filter((rule) => rule.rule_type !== "call_slot_definition"),
    slotDefinitions: slotDefinitions.length > 0 ? slotDefinitions : DEFAULT_SLOT_DEFINITIONS,
    generatedAssignments: {
      assignments: generated.assignments,
      generationDebug:
        (generated.generationReport as { generationDebug?: unknown } | null)
          ?.generationDebug ?? null,
    },
  });

  const output = {
    summary: debugReport.summary,
    buddyRequirements: debugReport.buddyRequirements.map((requirement) => ({
      resident: requirement.residentName,
      requiredBuddyDays: requirement.requiredBuddyDays,
      assignedDates: requirement.assignedDates,
      remainingNeeded: requirement.remainingNeeded,
    })),
    filledBuddyDays: debugReport.days
      .filter((day) => day.finalStatus.Buddy === "filled")
      .map((day) => ({
        date: day.date,
        buddy: day.existingAssignments.Buddy,
        primary: day.existingAssignments.Primary,
        buddyReason: day.buddyReason,
      })),
    openRequiredDays: debugReport.days
      .filter(
        (day) => day.finalStatus.Backup === "open" || day.finalStatus.Buddy === "open"
      )
      .map((day) => ({
        date: day.date,
        backup: day.finalStatus.Backup,
        backupReason: day.backupReason,
        buddy: day.finalStatus.Buddy,
        buddyReason: day.buddyReason,
        eligibleBuddyRequirements: day.eligibleBuddyRequirements,
      })),
  };

  console.log(JSON.stringify(output, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
