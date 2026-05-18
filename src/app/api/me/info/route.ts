import { NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/workspace/require-workspace-access";

export async function GET() {
  try {
    const workspace = await requireWorkspaceAccess();
    let activeProgram: { id: string; name: string } | null = null;

    if (workspace.membership?.program_id) {
      const { data: program, error: programError } = await workspace.supabase
        .from("programs")
        .select("id, name")
        .eq("id", workspace.membership.program_id)
        .maybeSingle();

      if (programError) {
        throw new Error(programError.message);
      }

      if (program?.id && program?.name) {
        activeProgram = {
          id: program.id,
          name: program.name,
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
