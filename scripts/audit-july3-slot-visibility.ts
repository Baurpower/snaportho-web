import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createAdminClient } from "../src/lib/supabase/admin";
import {
  buildBuddyDateStateByDate,
  getCallHubVisibleSlotDefinitions,
  slotMapToDraftDayAssignments,
} from "../src/lib/workspace/call/call-hub-scheduling";
import {
  extractSlotDefinitions,
  getVisibleCallSlotsForDay,
} from "../src/lib/workspace/call/rule-definitions";
import { migratePersistedCallRules } from "../src/lib/workspace/call/persisted-rule-migration";
import { serializeSlotId } from "../src/lib/workspace/call/validation";
import { getResidentStatusDetails } from "../src/lib/workspace/pgy";

function loadEnvFile(filePath: string) {
  try {
    const contents = readFileSync(filePath, "utf8");
    for (const line of contents.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const separator = trimmed.indexOf("=");
      if (separator === -1) continue;
      const key = trimmed.slice(0, separator).trim();
      const value = trimmed.slice(separator + 1).trim();
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // ignore
  }
}

function parsePgy(trainingLevel: string | null | undefined): number | null {
  if (!trainingLevel) return null;
  const match = trainingLevel.match(/pgy-?(\d+)/i);
  return match ? parseInt(match[1], 10) : null;
}

async function main() {
  loadEnvFile(join(process.cwd(), ".env.local"));
  const supabase = createAdminClient();
  const programId = "082cc352-bba2-4f19-b837-b28d0878a308";

  const { data: rules, error: rulesError } = await supabase
    .from("program_call_rules")
    .select("*")
    .eq("program_id", programId)
    .eq("is_enabled", true)
    .order("priority", { ascending: true });

  if (rulesError) throw rulesError;

  const migratedRules = migratePersistedCallRules(rules ?? []).rules;
  const programRules = migratedRules.map((row) => ({
    id: row.id,
    name: row.name,
    rule_type: row.rule_type,
    is_enabled: row.is_enabled,
    is_hard_rule: row.is_hard_rule,
    config: row.config ?? {},
  }));

  const slotDefinitions = extractSlotDefinitions(programRules as any);
  console.log(
    "SLOT_DEFINITIONS",
    JSON.stringify(
      slotDefinitions.map((def) => ({
        callType: def.callType,
        requiredMode: def.requiredMode,
        requiredWhenVisible: def.requiredWhenVisible,
        daysOfWeek: def.daysOfWeek,
        condition: def.condition,
      })),
      null,
      2
    )
  );

  const { data: roster, error: rosterError } = await supabase
    .from("program_roster")
    .select("id, full_name, first_name, last_name, grad_year, program_membership_id")
    .eq("program_id", programId);

  if (rosterError) throw rosterError;

  const nathan = (roster ?? []).find((r) =>
    `${r.full_name ?? ""} ${r.first_name ?? ""} ${r.last_name ?? ""}`
      .toLowerCase()
      .includes("safran")
  );

  console.log(
    "NATHAN_SAFRAN",
    nathan
      ? {
          rosterId: nathan.id,
          name: nathan.full_name ?? `${nathan.first_name} ${nathan.last_name}`,
          gradYear: nathan.grad_year,
        }
      : null
  );

  const { data: julyCalls, error: callsError } = await supabase
    .from("program_calls")
    .select("id, roster_id, call_date, call_type, training_level, pgy_year")
    .eq("program_id", programId)
    .gte("call_date", "2026-07-01")
    .lte("call_date", "2026-07-10");

  if (callsError) {
    console.log("JULY_CALLS", "unavailable:", callsError.message);
  }

  if (!callsError) console.log(
    "JULY_CALLS",
    JSON.stringify(
      (julyCalls ?? []).map((call) => ({
        date: call.call_date,
        type: call.call_type,
        rosterId: call.roster_id,
        trainingLevel: call.training_level,
        pgyYear: call.pgy_year,
      })),
      null,
      2
    )
  );

  const dates = ["2026-07-02", "2026-07-03", "2026-07-04", "2026-07-10"];
  for (const dateKey of dates) {
    const dayOfWeek = new Date(`${dateKey}T00:00:00`).getDay();
    const dayCalls = (julyCalls ?? []).filter((c) => c.call_date === dateKey);
    const primaryCall = dayCalls.find((c) => c.call_type === "Primary") ?? null;

    const slotMap = new Map<string, any>();
    for (const call of dayCalls) {
      slotMap.set(
        serializeSlotId({ dateKey, callType: call.call_type }),
        {
          rosterId: call.roster_id,
          pgyYear: call.pgy_year,
          trainingLevel: call.training_level,
        }
      );
    }

    const draftAssignments = slotMapToDraftDayAssignments(slotMap as any);
    const buddyDateStateByDate = buildBuddyDateStateByDate({
      year: 2026,
      monthIndex: 6,
      residents: (roster ?? []).map((r) => ({
        rosterId: r.id,
        programMembershipId: r.program_membership_id,
        residentName: r.full_name ?? `${r.first_name ?? ""} ${r.last_name ?? ""}`.trim(),
        trainingLevel: null,
        pgyYear: null,
        gradYear: r.grad_year,
      })),
      rotations: [],
      rules: programRules as any,
      slotDefinitions,
      draftAssignments,
    });

    const primaryCallPgyYear =
      primaryCall?.pgy_year ??
      parsePgy(primaryCall?.training_level ?? null) ??
      null;

    const assignedCallTypeKeys = new Set(
      dayCalls.map((c) => String(c.call_type).toLowerCase())
    );

    const buddyDateState = buddyDateStateByDate.get(dateKey) ?? null;
    const baseVisible = getVisibleCallSlotsForDay({
      dayOfWeek,
      primaryCallPgyYear,
      assignedCallTypeKeys,
      slotDefinitions,
      buddyDateState,
    });
    const hubVisible = getCallHubVisibleSlotDefinitions({
      dayOfWeek,
      primaryCallPgyYear,
      assignedCallTypeKeys,
      slotDefinitions,
      buddyDateState,
      draftDayAssignment: draftAssignments[dateKey] ?? null,
    });

    console.log(
      `\nDATE_AUDIT ${dateKey}`,
      JSON.stringify(
        {
          dayOfWeek,
          dayName: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dayOfWeek],
          primaryAssignment: primaryCall
            ? {
                rosterId: primaryCall.roster_id,
                trainingLevel: primaryCall.training_level,
                pgyYear: primaryCall.pgy_year,
              }
            : null,
          primaryCallPgyYear,
          assignedCallTypeKeys: [...assignedCallTypeKeys],
          buddyDateState: buddyDateState
            ? {
                isVisible: buddyDateState.isVisible,
                isRequired: buddyDateState.isRequired,
                reason: buddyDateState.reason,
                selectedBuddyRosterId: buddyDateState.selectedBuddyRosterId,
                visibleEligibleResidentNames:
                  buddyDateState.visibleEligibleResidentNames,
              }
            : null,
          getVisibleCallSlotsForDay: baseVisible.map((d) => d.callType),
          getCallHubVisibleSlotDefinitions: hubVisible.map((d) => d.callType),
          backupSuppressedByBuddyFilter:
            baseVisible.some((d) => d.callType === "Backup") &&
            !hubVisible.some((d) => d.callType === "Backup"),
        },
        null,
        2
      )
    );
  }
}

async function runScenarioAudit() {
  const supabase = createAdminClient();
  const programId = "082cc352-bba2-4f19-b837-b28d0878a308";
  const { data: rules } = await supabase
    .from("program_call_rules")
    .select("*")
    .eq("program_id", programId)
    .eq("is_enabled", true);
  const programRules = migratePersistedCallRules(rules ?? []).rules.map((row) => ({
    id: row.id,
    name: row.name,
    rule_type: row.rule_type,
    is_enabled: row.is_enabled,
    is_hard_rule: row.is_hard_rule,
    config: row.config ?? {},
  }));
  const slotDefinitions = extractSlotDefinitions(programRules as any);
  const { data: roster } = await supabase
    .from("program_roster")
    .select("id, full_name, grad_year, program_membership_id")
    .eq("program_id", programId);
  const { data: rotRows } = await supabase
    .from("rotation_assignments")
    .select(
      "id, roster_id, program_membership_id, rotation_id, start_date, end_date, site_label, team_label, notes, rotations(id, name, short_name, category)"
    )
    .eq("program_id", programId)
    .lte("start_date", "2026-07-31")
    .gte("end_date", "2026-07-01");

  const apiAssignments = (rotRows ?? []).map((row) => ({
    id: row.id,
    rosterId: row.roster_id,
    programMembershipId: row.program_membership_id,
    rotationId: row.rotation_id,
    startDate: row.start_date,
    endDate: row.end_date,
    siteLabel: row.site_label,
    teamLabel: row.team_label,
    notes: row.notes,
    rotation: Array.isArray(row.rotations) ? row.rotations[0] : row.rotations,
  }));

  const hubResidents = (roster ?? []).map((row) => {
    const status = getResidentStatusDetails(row.grad_year, "2026-07-03");
    return {
      rosterId: row.id,
      programMembershipId: row.program_membership_id,
      residentName: row.full_name ?? "",
      trainingLevel: status.statusLabel,
      pgyYear: status.pgyYear,
      gradYear: row.grad_year,
    };
  });

  const nathan = hubResidents.find((resident) =>
    resident.residentName.includes("Safran")
  );
  const robertId = "5e5693c2-8fba-4ce7-a22d-2aa0a13aa43d";
  const dateKey = "2026-07-03";

  const scenarios = [
    { name: "pgy2-primary-no-buddy", pgy: 2 as number | null, buddyAssigned: false },
    { name: "pgy2-primary-buddy-draft", pgy: 2 as number | null, buddyAssigned: true },
    { name: "null-pgy-primary", pgy: null, buddyAssigned: false },
  ];

  for (const scenario of scenarios) {
    const slotMap = new Map<string, any>();
    slotMap.set(serializeSlotId({ dateKey, callType: "Primary" }), {
      rosterId: nathan?.rosterId,
      pgyYear: scenario.pgy,
      trainingLevel: scenario.pgy ? `PGY-${scenario.pgy}` : null,
    });
    if (scenario.buddyAssigned) {
      slotMap.set(serializeSlotId({ dateKey, callType: "Buddy" }), {
        rosterId: robertId,
        pgyYear: 1,
        trainingLevel: "PGY-1",
      });
    }

    const draftAssignments = slotMapToDraftDayAssignments(slotMap as any);
    const buddyMap = buildBuddyDateStateByDate({
      year: 2026,
      monthIndex: 6,
      residents: hubResidents,
      rotations: apiAssignments,
      rules: programRules as any,
      slotDefinitions,
      draftAssignments,
    });
    const buddy = buddyMap.get(dateKey);
    const base = getVisibleCallSlotsForDay({
      dayOfWeek: 5,
      primaryCallPgyYear: scenario.pgy,
      assignedCallTypeKeys: new Set(
        scenario.buddyAssigned ? ["primary", "buddy"] : ["primary"]
      ),
      slotDefinitions,
      buddyDateState: buddy ?? null,
    });
    const hub = getCallHubVisibleSlotDefinitions({
      dayOfWeek: 5,
      primaryCallPgyYear: scenario.pgy,
      assignedCallTypeKeys: new Set(
        scenario.buddyAssigned ? ["primary", "buddy"] : ["primary"]
      ),
      slotDefinitions,
      buddyDateState: buddy ?? null,
      draftDayAssignment: draftAssignments[dateKey] ?? null,
    });

    console.log(
      "SCENARIO",
      JSON.stringify(
        {
          name: scenario.name,
          buddyDateState: buddy
            ? {
                isVisible: buddy.isVisible,
                isRequired: buddy.isRequired,
                reason: buddy.reason,
                visibleEligibleResidentNames: buddy.visibleEligibleResidentNames,
              }
            : null,
          getVisibleCallSlotsForDay: base.map((def) => def.callType),
          getCallHubVisibleSlotDefinitions: hub.map((def) => def.callType),
          backupSuppressed:
            base.some((def) => def.callType === "Backup") &&
            !hub.some((def) => def.callType === "Backup"),
        },
        null,
        2
      )
    );
  }
}

main()
  .then(() => runScenarioAudit())
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });