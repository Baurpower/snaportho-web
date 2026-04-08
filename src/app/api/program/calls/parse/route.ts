import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getActiveMembershipForUser } from "@/lib/db/memberships";
import { parseCallUploadFile } from "@/lib/calls/import-parser";

type MembershipRow = {
  id: string;
  display_name: string | null;
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

function findMembershipMatch(
  residentName: string,
  memberships: MembershipRow[]
): MembershipRow | null {
  const targetVariants = buildNameVariants(residentName);

  for (const item of memberships) {
    const display = item.display_name ?? "";
    const displayVariants = buildNameVariants(display);

    const exact = targetVariants.some((target) => displayVariants.includes(target));
    if (exact) return item;
  }

  const target = splitNameParts(residentName);

  const lastNameMatches = memberships.filter((item) => {
    const parts = splitNameParts(item.display_name ?? "");
    return target.last && parts.last === target.last;
  });

  if (lastNameMatches.length === 1) return lastNameMatches[0];

  const fuzzy = memberships.find((item) => {
    const name = normalizeName(item.display_name ?? "");
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

    const { data: membershipsData, error: membershipsError } = await supabase
      .from("program_memberships")
      .select("id, display_name, training_level, class_year")
      .eq("program_id", membership.program_id);

    if (membershipsError) {
      throw new Error(`Failed to load program memberships: ${membershipsError.message}`);
    }

    const memberships = (membershipsData ?? []) as MembershipRow[];

    const previewRows = parsedRows.map((row) => {
      const match = findMembershipMatch(row.residentName, memberships);

      return {
        ...row,
        matchedMembershipId: match?.id ?? null,
        matchedDisplayName: match?.display_name ?? null,
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

    console.log(
      previewRows.slice(0, 20).map((row) => ({
        sourceRow: row.sourceRow,
        residentName: row.residentName,
        callDate: row.callDate,
        callType: row.callType,
        matchedDisplayName: row.matchedDisplayName,
        errors: row.errors,
      }))
    );

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