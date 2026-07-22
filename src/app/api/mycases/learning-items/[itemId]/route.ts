import { NextRequest, NextResponse } from "next/server";
import { deleteLearningItem, getLearningItem, updateLearningItem } from "@/lib/mycases/repository";
import { requireMyCasesApiUser } from "@/lib/mycases/request-user";
import { parseLearningItemInput } from "@/lib/mycases/validation";
type Context = { params: Promise<{ itemId: string }> };
export async function GET(_: NextRequest, context: Context) { const auth = await requireMyCasesApiUser(); if ("error" in auth) return auth.error; const item = await getLearningItem(auth.user.id, (await context.params).itemId); return item ? NextResponse.json({ item }) : NextResponse.json({ error: "Learning item not found." }, { status: 404 }); }
export async function PATCH(request: NextRequest, context: Context) { try { const auth = await requireMyCasesApiUser(); if ("error" in auth) return auth.error; return NextResponse.json({ item: await updateLearningItem(auth.user.id, (await context.params).itemId, parseLearningItemInput(await request.json(), true)) }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update learning item." }, { status: 400 }); } }
export async function DELETE(_: NextRequest, context: Context) { try { const auth = await requireMyCasesApiUser(); if ("error" in auth) return auth.error; await deleteLearningItem(auth.user.id, (await context.params).itemId); return NextResponse.json({ success: true }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to delete learning item." }, { status: 400 }); } }
