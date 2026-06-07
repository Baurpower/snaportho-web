const fs = require("node:fs");
const { createClient } = require("@supabase/supabase-js");
const { getResidentStatusDetails } = require("../src/lib/workspace/pgy.ts");

const PROGRAM_ID = "082cc352-bba2-4f19-b837-b28d0878a308";
const YEAR = 2026;
const MONTH = 7;
const REQUIRED_BUDDY_DAYS = 2;

function readEnvFile(path) {
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

function normalizeRotationName(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function isBuddyRotation(value) {
  const normalized = normalizeRotationName(value);
  return normalized.includes("genortho") || normalized.includes("pager");
}

function dateKey(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function monthDates(year, month) {
  const totalDays = new Date(year, month, 0).getDate();
  return Array.from({ length: totalDays }, (_, index) => {
    const key = dateKey(year, month, index + 1);
    const date = new Date(`${key}T00:00:00`);
    return { key, date, dayOfWeek: date.getDay() };
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

  const [{ data: rosterRows, error: rosterError }, { data: rotationRows, error: rotationError }] =
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
    ]);

  if (rosterError) throw rosterError;
  if (rotationError) throw rotationError;

  const rotationsByRosterId = new Map();
  for (const row of rotationRows || []) {
    const rosterId = row.roster_id ? String(row.roster_id) : null;
    if (!rosterId) continue;
    const current = rotationsByRosterId.get(rosterId) || [];
    const rotation = Array.isArray(row.rotations) ? row.rotations[0] : row.rotations;
    current.push({
      startDate: row.start_date,
      endDate: row.end_date,
      rotationName: rotation?.name || null,
      shortName: rotation?.short_name || null,
      teamLabel: row.team_label || null,
      siteLabel: row.site_label || null,
    });
    rotationsByRosterId.set(rosterId, current);
  }

  const residents = (rosterRows || []).map((row) => {
    const rosterId = String(row.id);
    const displayName =
      row.full_name || [row.first_name, row.last_name].filter(Boolean).join(" ") || rosterId;
    return {
      rosterId,
      displayName,
      gradYear: row.grad_year || null,
      rotations: rotationsByRosterId.get(rosterId) || [],
    };
  });

  const rosterById = new Map(residents.map((resident) => [resident.rosterId, resident]));
  const fridaySaturdayDates = monthDates(YEAR, MONTH).filter(
    (entry) => entry.dayOfWeek === 5 || entry.dayOfWeek === 6
  );

  const pgy4PartnerCounts = new Map();
  const selectedBuddyDays = [];
  const buddyRequirements = [];

  for (const resident of residents) {
    const eligibleDates = fridaySaturdayDates
      .filter((entry) => {
        const pgy = getResidentStatusDetails(resident.gradYear, entry.key).pgyYear;
        if (pgy !== 1) return false;
        const rotation = resident.rotations.find((assignment) => {
          return (
            (!assignment.startDate || assignment.startDate <= entry.key) &&
            (!assignment.endDate || assignment.endDate >= entry.key)
          );
        });
        const rotationLabel =
          rotation?.shortName ||
          rotation?.rotationName ||
          rotation?.teamLabel ||
          rotation?.siteLabel ||
          "";
        return isBuddyRotation(rotationLabel);
      })
      .map((entry) => entry.key);

    if (eligibleDates.length === 0) continue;

    const requirement = {
      resident: resident.displayName,
      rosterId: resident.rosterId,
      requiredBuddyDays: REQUIRED_BUDDY_DAYS,
      eligibleDates,
      assignedDates: [],
      remainingNeeded: REQUIRED_BUDDY_DAYS,
    };

    for (const entry of fridaySaturdayDates) {
      if (requirement.remainingNeeded === 0) break;
      if (!eligibleDates.includes(entry.key)) continue;
      if (selectedBuddyDays.some((item) => item.date === entry.key)) continue;

      const pgy4Partner = residents
        .filter((candidate) => {
          const pgy = getResidentStatusDetails(candidate.gradYear, entry.key).pgyYear;
          return pgy === 4 && candidate.rosterId !== resident.rosterId;
        })
        .sort((left, right) => {
          const leftCount = pgy4PartnerCounts.get(left.rosterId) || 0;
          const rightCount = pgy4PartnerCounts.get(right.rosterId) || 0;
          if (leftCount !== rightCount) return leftCount - rightCount;
          return left.displayName.localeCompare(right.displayName);
        })[0];

      if (!pgy4Partner) continue;

      requirement.assignedDates.push(entry.key);
      requirement.remainingNeeded -= 1;
      pgy4PartnerCounts.set(
        pgy4Partner.rosterId,
        (pgy4PartnerCounts.get(pgy4Partner.rosterId) || 0) + 1
      );
      selectedBuddyDays.push({
        date: entry.key,
        buddy: resident.displayName,
        primaryPartner: pgy4Partner.displayName,
      });
    }

    buddyRequirements.push(requirement);
  }

  const output = {
    month: `${YEAR}-${String(MONTH).padStart(2, "0")}`,
    eligiblePgy1Requirements: buddyRequirements.map((requirement) => ({
      resident: requirement.resident,
      eligibleDates: requirement.eligibleDates,
      assignedDates: requirement.assignedDates,
      remainingNeeded: requirement.remainingNeeded,
    })),
    selectedBuddyDays,
    summary: {
      eligiblePgy1Count: buddyRequirements.length,
      filledBuddyCount: selectedBuddyDays.length,
      unmetResidents: buddyRequirements
        .filter((requirement) => requirement.remainingNeeded > 0)
        .map((requirement) => ({
          resident: requirement.resident,
          remainingNeeded: requirement.remainingNeeded,
        })),
      pgy4PartnerDistribution: Array.from(pgy4PartnerCounts.entries()).map(
        ([rosterId, count]) => ({
          resident: rosterById.get(rosterId)?.displayName || rosterId,
          buddyPrimaryDays: count,
        })
      ),
    },
  };

  console.log(JSON.stringify(output, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
