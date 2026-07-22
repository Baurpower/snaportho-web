import { NextRequest, NextResponse } from "next/server";
import { createCase, listCases } from "@/lib/mycases/repository";
import { requireMyCasesApiUser } from "@/lib/mycases/request-user";
import { parseCaseInput } from "@/lib/mycases/validation";
export async function GET(request: NextRequest) { try { const auth = await requireMyCasesApiUser(); if ("error" in auth) return auth.error; const p = request.nextUrl.searchParams; return NextResponse.json({ cases: await listCases(auth.user.id, p.get("q") ?? undefined, p.get("archived") === "true") }); } catch { return NextResponse.json({ error: "Unable to load cases." }, { status: 500 }); } }
export async function POST(request: NextRequest) { try { const auth = await requireMyCasesApiUser(); if ("error" in auth) return auth.error; const item = await createCase(auth.user.id, parseCaseInput(await request.json()) as Parameters<typeof createCase>[1]); return NextResponse.json({ case: item }, { status: 201 }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create case." }, { status: 400 }); } }
