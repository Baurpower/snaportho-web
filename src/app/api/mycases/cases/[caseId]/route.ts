import { NextRequest, NextResponse } from "next/server";
import { deleteCase, getCase, updateCase } from "@/lib/mycases/repository";
import { requireMyCasesApiUser } from "@/lib/mycases/request-user";
import { parseCaseInput } from "@/lib/mycases/validation";
type Context = { params: Promise<{ caseId: string }> };
export async function GET(_: NextRequest, context: Context) { const auth = await requireMyCasesApiUser(); if ("error" in auth) return auth.error; const item = await getCase(auth.user.id, (await context.params).caseId); return item ? NextResponse.json({ case: item }) : NextResponse.json({ error: "Case not found." }, { status: 404 }); }
export async function PATCH(request: NextRequest, context: Context) { try { const auth = await requireMyCasesApiUser(); if ("error" in auth) return auth.error; return NextResponse.json({ case: await updateCase(auth.user.id, (await context.params).caseId, parseCaseInput(await request.json(), true)) }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update case." }, { status: 400 }); } }
export async function DELETE(_: NextRequest, context: Context) { try { const auth = await requireMyCasesApiUser(); if ("error" in auth) return auth.error; await deleteCase(auth.user.id, (await context.params).caseId); return NextResponse.json({ success: true }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to delete case." }, { status: 400 }); } }
