import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getActiveMembershipForUser } from "@/lib/db/memberships";
import { getProgramResidents } from "@/lib/db/calls";

type RawResident = Record<string, unknown>;

type NormalizedResident = {
  membershipId: string;
  displayName: string;
  gradYear: number | null;
  pgyYear: number | null;
  trainingLevel: string | null;
};

function parseGradYear(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^\d{4}$/.test(trimmed)) return Number(trimmed);
  }

  return null;
}

function getCurrentChiefGradYear(date = new Date()): number {
  const year = date.getFullYear();
  const julyFirst = new Date(year, 6, 1);
  return date >= julyFirst ? year + 1 : year;
}

function getPgyFromGradYear(
  gradYear: number | null,
  date = new Date()
): number | null {
  if (!gradYear) return null;

  const currentChiefGradYear = getCurrentChiefGradYear(date);
  const pgy = 5 - (gradYear - currentChiefGradYear);

  if (pgy < 1 || pgy > 5) return null;
  return pgy;
}

function asString(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return null;
}

function normalizeResident(row: RawResident): NormalizedResident | null {
  const membershipId =
    asString(row.membershipId) ??
    asString(row.membership_id) ??
    asString(row.program_membership_id) ??
    asString(row.id);

  if (!membershipId) return null;

  const gradYear =
    parseGradYear(row.gradYear) ??
    parseGradYear(row.grad_year) ??
    null;

  const pgyYear = getPgyFromGradYear(gradYear);
  const trainingLevel = pgyYear ? `PGY-${pgyYear}` : null;

  const displayName =
    asString(row.displayName) ??
    asString(row.display_name) ??
    asString(row.full_name) ??
    asString(row.residentName) ??
    asString(row.resident_name) ??
    asString(row.name) ??
    "Unknown";

  return {
    membershipId,
    displayName,
    gradYear,
    pgyYear,
    trainingLevel,
  };
}

function sortResidents(a: NormalizedResident, b: NormalizedResident) {
  const aYear = a.pgyYear ?? 99;
  const bYear = b.pgyYear ?? 99;

  if (aYear !== bYear) return aYear - bYear;
  return a.displayName.localeCompare(b.displayName);
}

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      return NextResponse.json(
        { error: `Authentication failed: ${authError.message}` },
        { status: 401 }
      );
    }

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const membership = await getActiveMembershipForUser(user.id);

    if (!membership?.program_id) {
      return NextResponse.json(
        {
          residents: [],
          residentsByPgy: {
            1: [],
            2: [],
            3: [],
            4: [],
            5: [],
          },
          countsByPgy: {
            1: 0,
            2: 0,
            3: 0,
            4: 0,
            5: 0,
          },
        },
        { status: 200 }
      );
    }

    const rawResidents = await getProgramResidents(membership.program_id);

    const residents = Array.isArray(rawResidents)
      ? rawResidents
          .map((row) => normalizeResident(row as RawResident))
          .filter((r): r is NormalizedResident => !!r)
          .sort(sortResidents)
      : [];

    const residentsByPgy: Record<string, NormalizedResident[]> = {
      1: [],
      2: [],
      3: [],
      4: [],
      5: [],
    };

    for (const resident of residents) {
      if (resident.pgyYear && residentsByPgy[String(resident.pgyYear)]) {
        residentsByPgy[String(resident.pgyYear)].push(resident);
      }
    }

    const countsByPgy = {
      1: residentsByPgy["1"].length,
      2: residentsByPgy["2"].length,
      3: residentsByPgy["3"].length,
      4: residentsByPgy["4"].length,
      5: residentsByPgy["5"].length,
    };

    return NextResponse.json(
      {
        residents,
        residentsByPgy,
        countsByPgy,
      },
      { status: 200 }
    );
  } catch (error) {
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