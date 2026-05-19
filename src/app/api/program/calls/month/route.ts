import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getActiveMembershipForUser } from "@/lib/workspace/memberships";
import {
  getPgyFromGradYear,
  getTrainingLevelFromPgy,
} from "@/lib/workspace/pgy";

function isValidDateString(value: string | null): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

type ProgramRosterRelation = {
  id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  grad_year: number | null;
  role: string | null;
  program_membership_id: string | null;
};

type ProgramCallRow = {
  id: string;
  program_id: string | null;
  roster_id: string | null;
  program_membership_id: string | null;
  call_type: string | null;
  call_date: string | null;
  start_datetime: string | null;
  end_datetime: string | null;
  site: string | null;
  is_home_call: boolean | null;
  notes: string | null;
  program_roster: ProgramRosterRelation | ProgramRosterRelation[] | null;
};

type ProgramRosterLookupRow = {
  id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  grad_year: number | null;
  role: string | null;
  program_membership_id: string | null;
};

function normalizeRoster(
  value: ProgramCallRow["program_roster"]
): ProgramRosterRelation | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

function getRosterDisplayName(roster: ProgramRosterRelation | null) {
  const fallbackName = [roster?.first_name, roster?.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  return roster?.full_name ?? (fallbackName || "Unknown Resident");
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const monthStart = searchParams.get("monthStart");
    const monthEnd = searchParams.get("monthEnd");

    if (!isValidDateString(monthStart) || !isValidDateString(monthEnd)) {
      return NextResponse.json(
        { error: "monthStart and monthEnd are required in YYYY-MM-DD format" },
        { status: 400 }
      );
    }

    if (monthStart > monthEnd) {
      return NextResponse.json(
        { error: "monthStart must be on or before monthEnd" },
        { status: 400 }
      );
    }

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

    const activeMembership = await getActiveMembershipForUser(user.id);

    if (!activeMembership?.program_id) {
      return NextResponse.json(
        {
          monthStart,
          monthEnd,
          myMembershipId: null,
          myRosterId: null,
          calls: [],
        },
        { status: 200 }
      );
    }

    const startIso = `${monthStart}T00:00:00.000Z`;
    const endIso = `${monthEnd}T23:59:59.999Z`;

    const baseSelect = `
      id,
      program_id,
      roster_id,
      program_membership_id,
      call_type,
      call_date,
      start_datetime,
      end_datetime,
      site,
      is_home_call,
      notes,
      program_roster (
        id,
        full_name,
        first_name,
        last_name,
        grad_year,
        role,
        program_membership_id
      )
    `;

    const { data: timedCalls, error: timedError } = await supabase
      .from("call_assignments")
      .select(baseSelect)
      .eq("program_id", activeMembership.program_id)
      .not("start_datetime", "is", null)
      .lte("start_datetime", endIso)
      .gte("end_datetime", startIso)
      .order("start_datetime", { ascending: true });

    if (timedError) {
      throw new Error(`Failed to fetch timed program calls: ${timedError.message}`);
    }

    const { data: dateOnlyCalls, error: dateOnlyError } = await supabase
      .from("call_assignments")
      .select(baseSelect)
      .eq("program_id", activeMembership.program_id)
      .is("start_datetime", null)
      .gte("call_date", monthStart)
      .lte("call_date", monthEnd)
      .order("call_date", { ascending: true });

    if (dateOnlyError) {
      throw new Error(
        `Failed to fetch date-only program calls: ${dateOnlyError.message}`
      );
    }

    const merged = [
      ...((timedCalls ?? []) as unknown as ProgramCallRow[]),
      ...((dateOnlyCalls ?? []) as unknown as ProgramCallRow[]),
    ];

    const deduped = Array.from(
      new Map(merged.map((row) => [row.id, row])).values()
    );

    const rosterIds = Array.from(
      new Set(deduped.map((row) => row.roster_id).filter(Boolean))
    ) as string[];
    const membershipIds = Array.from(
      new Set(deduped.map((row) => row.program_membership_id).filter(Boolean))
    ) as string[];
    const rosterById = new Map<string, ProgramRosterRelation>();
    const rosterByMembershipId = new Map<string, ProgramRosterRelation>();

    if (rosterIds.length > 0 || membershipIds.length > 0) {
      let rosterQuery = supabase
        .from("program_roster")
        .select(
          "id, full_name, first_name, last_name, grad_year, role, program_membership_id"
        )
        .eq("program_id", activeMembership.program_id);

      if (rosterIds.length > 0 && membershipIds.length > 0) {
        rosterQuery = rosterQuery.or(
          `id.in.(${rosterIds.join(",")}),program_membership_id.in.(${membershipIds.join(",")})`
        );
      } else if (rosterIds.length > 0) {
        rosterQuery = rosterQuery.in("id", rosterIds);
      } else if (membershipIds.length > 0) {
        rosterQuery = rosterQuery.in("program_membership_id", membershipIds);
      }

      const { data: rosterRows, error: rosterError } = await rosterQuery;

      if (rosterError) {
        throw new Error(`Failed to resolve roster names: ${rosterError.message}`);
      }

      for (const row of (rosterRows ?? []) as ProgramRosterLookupRow[]) {
        const normalized: ProgramRosterRelation = {
          id: String(row.id),
          full_name: row.full_name ?? null,
          first_name: row.first_name ?? null,
          last_name: row.last_name ?? null,
          grad_year: row.grad_year ?? null,
          role: row.role ?? null,
          program_membership_id: row.program_membership_id ?? null,
        };
        rosterById.set(normalized.id, normalized);
        if (normalized.program_membership_id) {
          rosterByMembershipId.set(normalized.program_membership_id, normalized);
        }
      }
    }

    return NextResponse.json(
      {
        monthStart,
        monthEnd,
        myMembershipId: activeMembership.id,
        myRosterId: activeMembership.roster_id ?? null,
        calls: deduped.map((row) => {
          const effectiveDate =
            row.call_date ?? row.start_datetime?.slice(0, 10) ?? null;
          const roster =
            normalizeRoster(row.program_roster) ??
            (row.roster_id ? rosterById.get(row.roster_id) ?? null : null) ??
            (row.program_membership_id
              ? rosterByMembershipId.get(row.program_membership_id) ?? null
              : null);
          const gradYear = roster?.grad_year ?? null;
          const pgyYear = effectiveDate
            ? getPgyFromGradYear(gradYear, effectiveDate)
            : null;
          const trainingLevel = getTrainingLevelFromPgy(pgyYear);

          return {
            id: row.id,
            rosterId: row.roster_id,
            // Compatibility field: `membershipId` carries roster identity in roster-first flows.
            membershipId: row.roster_id ?? row.program_membership_id,
            residentName: getRosterDisplayName(roster),
            gradYear,
            pgyYear,
            trainingLevel,
            userId: null,
            callType: row.call_type,
            callDate: row.call_date ?? row.start_datetime?.slice(0, 10) ?? null,
            startDatetime: row.start_datetime,
            endDatetime: row.end_datetime,
            site: row.site,
            isHomeCall: row.is_home_call,
            notes: row.notes,
            isMine:
              row.roster_id === (activeMembership.roster_id ?? null) ||
              row.program_membership_id === activeMembership.id,
          };
        }),
      },
      { status: 200 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
