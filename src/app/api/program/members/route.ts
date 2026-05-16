import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getActiveMembershipForUser } from "@/lib/db/memberships";

type NormalizedResident = {
  membershipId: string;
  displayName: string;
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

function emptyResidentPayload() {
  return {
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
      return NextResponse.json(emptyResidentPayload(), { status: 200 });
    }

    const { data, error } = await supabase
      .from("program_roster")
      .select("id, first_name, last_name, full_name, grad_year, role")
      .eq("program_id", membership.program_id)
      .eq("role", "resident")
      .order("grad_year", { ascending: true })
      .order("last_name", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    const residents: NormalizedResident[] = (data ?? []).map((row) => {
      const gradYear =
        typeof row.grad_year === "number" ? row.grad_year : null;

      const pgyYear = getPgyFromGradYear(gradYear);

      const displayName =
        row.full_name ||
        [row.first_name, row.last_name].filter(Boolean).join(" ") ||
        "Unknown";

      return {
        // This is intentionally program_roster.id
        membershipId: row.id,
        displayName,
        gradYear,
        pgyYear,
        trainingLevel: pgyYear ? `PGY-${pgyYear}` : null,
      };
    });

    const residentsByPgy: Record<string, NormalizedResident[]> = {
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
    console.error("Failed to load program residents", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load program residents",
      },
      { status: 500 }
    );
  }
}