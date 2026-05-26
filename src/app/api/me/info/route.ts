import { NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/workspace/require-workspace-access";

export async function GET() {
  try {
    const workspace = await requireWorkspaceAccess({
      allowUnlinkedRoster: true,
    });
    let activeProgram:
      | {
          id: string;
          name: string;
          institutionName: string | null;
        }
      | null = null;

    if (workspace.membership?.program_id) {
      const { data: program, error: programError } = await workspace.supabase
        .from("programs")
        .select("id, name, institution_name")
        .eq("id", workspace.membership.program_id)
        .maybeSingle();

      if (programError) {
        throw new Error(programError.message);
      }

      if (program?.id) {
        activeProgram = {
          id: program.id,
          name: program.name ?? "Unnamed program",
          institutionName: program.institution_name ?? null,
        };
      }
    }

    return NextResponse.json({
      data: {
        user: {
          id: workspace.user.id,
          email: workspace.user.email,
        },
        activeProgram,
        membership: workspace.membership
          ? {
              id: workspace.membership.id,
              role: workspace.membership.role,
            }
          : null,
        roster: workspace.roster
          ? {
              id: workspace.roster.id,
              fullName: workspace.roster.full_name ?? null,
              gradYear: workspace.roster.grad_year ?? null,
              role: workspace.roster.role,
              isAdmin: Boolean(workspace.roster.isAdmin),
            }
          : null,
        accessContext: workspace.accessContext
          ? {
              userId: workspace.accessContext.userId,
              programId: workspace.accessContext.programId,
              membershipId: workspace.accessContext.membershipId,
              rosterId: workspace.accessContext.rosterId,
              isRosterLinked: workspace.accessContext.isRosterLinked,
              isAdmin: workspace.accessContext.isAdmin,
              mode: workspace.accessContext.mode,
              membershipRole: workspace.accessContext.membershipRole,
              rosterRole: workspace.accessContext.rosterRole,
            }
          : null,
        permissions: workspace.permissions,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load workspace info",
      },
      { status: 401 }
    );
  }
}
