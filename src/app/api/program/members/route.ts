import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getActiveMembershipForUser } from "@/lib/workspace/memberships";

type NormalizedRosterPerson = {
  rosterId: string;
  programMembershipId: string | null;
  displayName: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  role: string;
  gradYear: number | null;
  pgyYear: number | null;
  trainingLevel: string | null;
};

function getCurrentChiefGradYear(date = new Date()): number {
  const year = date.getFullYear();
  const julyFirst = new Date(year, 6, 1);
  return date >= julyFirst ? year + 1 : year;
}

function getPgyFromGradYear(gradYear: number | null): number | null {
  if (!gradYear) return null;

  const currentChiefGradYear = getCurrentChiefGradYear();
  const pgy = 5 - (gradYear - currentChiefGradYear);

  return pgy >= 1 && pgy <= 5 ? pgy : null;
}

function emptyRosterPayload() {
  return {
    roster: [],
    residents: [],
    residentsByPgy: { 1: [], 2: [], 3: [], 4: [], 5: [] },
    countsByPgy: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  };
}

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const membership = await getActiveMembershipForUser(user.id);

    if (!membership?.program_id) {
      return NextResponse.json(emptyRosterPayload(), { status: 200 });
    }

    const { data, error } = await supabase
      .from("program_roster")
      .select(
        `
        id,
        program_membership_id,
        first_name,
        last_name,
        full_name,
        grad_year,
        role,
        email
      `
      )
      .eq("program_id", membership.program_id)
      .order("role", { ascending: true })
      .order("grad_year", { ascending: true })
      .order("last_name", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    const roster: NormalizedRosterPerson[] = (data ?? []).map((row) => {
      const gradYear =
        typeof row.grad_year === "number" ? row.grad_year : null;

      const pgyYear = row.role === "resident" ? getPgyFromGradYear(gradYear) : null;

      const displayName =
        row.full_name ||
        [row.first_name, row.last_name].filter(Boolean).join(" ") ||
        row.email ||
        "Unknown";

      return {
        rosterId: String(row.id),
        programMembershipId: row.program_membership_id
          ? String(row.program_membership_id)
          : null,
        displayName,
        firstName: row.first_name ?? null,
        lastName: row.last_name ?? null,
        email: row.email ?? null,
        role: row.role,
        gradYear,
        pgyYear,
        trainingLevel: pgyYear ? `PGY-${pgyYear}` : null,
      };
    });

    const residents = roster.filter((person) => person.role === "resident");

    const residentsByPgy: Record<string, NormalizedRosterPerson[]> = {
      1: [],
      2: [],
      3: [],
      4: [],
      5: [],
    };

    for (const resident of residents) {
      if (resident.pgyYear) {
        residentsByPgy[String(resident.pgyYear)].push(resident);
      }
    }

    return NextResponse.json(
      {
        roster,
        residents,
        residentsByPgy,
        countsByPgy: {
          1: residentsByPgy["1"].length,
          2: residentsByPgy["2"].length,
          3: residentsByPgy["3"].length,
          4: residentsByPgy["4"].length,
          5: residentsByPgy["5"].length,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to load program roster", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load program roster",
      },
      { status: 500 }
    );
  }
}