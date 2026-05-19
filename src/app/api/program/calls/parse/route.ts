import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getActiveMembershipForUser } from "@/lib/workspace/memberships";
import { parseCallUploadFile } from "@/lib/workspace/call/import-parser";

type RosterRow = {
  id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  program_membership_id: string | null;
  training_level: string | null;
  class_year: number | null;
};

function normalizeName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/,/g, " ")
    .replace(/\b(dr|md|do|mr|mrs|ms|miss)\b\.?/gi, "")
    .replace(/\b(jr|sr|ii|iii|iv)\b\.?/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function splitNameParts(value: string) {
  const normalized = normalizeName(value);
  const parts = normalized.split(" ").filter(Boolean);

  return {
    normalized,
    parts,
    first: parts[0] ?? "",
    last: parts[parts.length - 1] ?? "",
    firstInitial: parts[0]?.[0] ?? "",
  };
}

function buildNameVariants(value: string): string[] {
  const { normalized, first, last, firstInitial } = splitNameParts(value);
  const variants = new Set<string>();

  if (normalized) variants.add(normalized);

  if (first && last) {
    variants.add(`${first} ${last}`);
    variants.add(`${last} ${first}`);
    variants.add(`${firstInitial} ${last}`.trim());
    variants.add(last);
  }

  return Array.from(variants);
}

function findRosterMatch(
  residentName: string,
  rosterRows: RosterRow[]
): RosterRow | null {
  const targetVariants = buildNameVariants(residentName);

  for (const item of rosterRows) {
    const display =
      item.full_name ??
      [item.first_name, item.last_name].filter(Boolean).join(" ") ??
      "";
    const displayVariants = buildNameVariants(display);

    const exact = targetVariants.some((target) => displayVariants.includes(target));
    if (exact) return item;
  }

  const target = splitNameParts(residentName);

  const lastNameMatches = rosterRows.filter((item) => {
    const parts = splitNameParts(
      item.full_name ?? [item.first_name, item.last_name].filter(Boolean).join(" ")
    );
    return target.last && parts.last === target.last;
  });

  if (lastNameMatches.length === 1) return lastNameMatches[0];

  const fuzzy = rosterRows.find((item) => {
    const name = normalizeName(
      item.full_name ?? [item.first_name, item.last_name].filter(Boolean).join(" ")
    );
    return (
      targetVariants.some((variant) => name.includes(variant)) ||
      targetVariants.some((variant) => variant.includes(name))
    );
  });

  return fuzzy ?? null;
}

export async function POST(request: NextRequest) {
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
        { error: "No active program membership found" },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    const parsedRows = await parseCallUploadFile(file);

    const { data: rosterData, error: rosterError } = await supabase
      .from("program_roster")
      .select("id, full_name, first_name, last_name, program_membership_id, training_level, class_year")
      .eq("program_id", membership.program_id);

    if (rosterError) {
      throw new Error(`Failed to load program roster: ${rosterError.message}`);
    }

    const rosterRows = (rosterData ?? []) as RosterRow[];

    const previewRows = parsedRows.map((row) => {
      const match = findRosterMatch(row.residentName, rosterRows);
      const displayName =
        match?.full_name ??
        [match?.first_name, match?.last_name].filter(Boolean).join(" ") ??
        null;

      return {
        ...row,
        matchedRosterId: match?.id ?? null,
        matchedMembershipId: match?.program_membership_id ?? null,
        programMembershipId: match?.program_membership_id ?? null,
        matchedDisplayName: displayName,
        matchedTrainingLevel: match?.training_level ?? null,
        matchedClassYear: match?.class_year ?? null,
        status:
          row.errors.length > 0
            ? "needs_review"
            : match
            ? "matched"
            : "unmatched",
      };
    });

    return NextResponse.json(
      {
        fileName: file.name,
        totalRows: previewRows.length,
        matchedRows: previewRows.filter((row) => row.status === "matched").length,
        unmatchedRows: previewRows.filter((row) => row.status === "unmatched").length,
        needsReviewRows: previewRows.filter((row) => row.status === "needs_review").length,
        rows: previewRows,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to parse call upload",
      },
      { status: 500 }
    );
  }
}
