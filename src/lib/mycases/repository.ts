import { createClient } from "@/utils/supabase/server";
import type { MyCasesCase, MyCasesCaseInput, MyCasesLearningItem, MyCasesLearningItemInput, MyCasesTag } from "./types";

async function syncTags(userId: string, owner: "case" | "learning", ownerId: string, names: string[]) {
  const supabase = await createClient();
  const linkTable = owner === "case" ? "mycases_case_tags" : "mycases_learning_item_tags";
  const ownerColumn = owner === "case" ? "case_id" : "learning_item_id";
  const { error: clearError } = await supabase.from(linkTable).delete().eq("user_id", userId).eq(ownerColumn, ownerId);
  if (clearError) throw new Error(clearError.message);
  if (!names.length) return;
  const { data: tagRows, error: tagError } = await supabase.from("mycases_tags")
    .upsert(names.map((name) => ({ user_id: userId, name })), { onConflict: "user_id,name", ignoreDuplicates: false })
    .select("id,user_id,name,color,created_at");
  if (tagError) throw new Error(tagError.message);
  const { error: linkError } = await supabase.from(linkTable).insert((tagRows ?? []).map((tag) => ({ user_id: userId, [ownerColumn]: ownerId, tag_id: tag.id })));
  if (linkError) throw new Error(linkError.message);
}

async function tagsByOwner(userId: string, owner: "case" | "learning") {
  const supabase = await createClient();
  const table = owner === "case" ? "mycases_case_tags" : "mycases_learning_item_tags";
  const column = owner === "case" ? "case_id" : "learning_item_id";
  const { data, error } = await supabase.from(table).select(`${column},tag:mycases_tags(*)`).eq("user_id", userId);
  if (error) throw new Error(error.message);
  const map = new Map<string, MyCasesTag[]>();
  for (const row of data ?? []) {
    const id = String((row as Record<string, unknown>)[column]);
    const tagValue = (row as unknown as { tag: MyCasesTag | MyCasesTag[] }).tag;
    const tag = Array.isArray(tagValue) ? tagValue[0] : tagValue;
    if (tag) map.set(id, [...(map.get(id) ?? []), tag]);
  }
  return map;
}

export async function listCases(userId: string, query?: string, includeArchived = false) {
  const supabase = await createClient();
  let request = supabase.from("mycases_cases").select("*").eq("user_id", userId).is("deleted_at", null).order("updated_at", { ascending: false });
  if (!includeArchived) request = request.eq("is_archived", false);
  if (query?.trim()) request = request.or(`title.ilike.%${query.trim()}%,procedure_name.ilike.%${query.trim()}%,diagnosis.ilike.%${query.trim()}%`);
  const { data, error } = await request; if (error) throw new Error(error.message);
  const tagMap = await tagsByOwner(userId, "case");
  return (data ?? []).map((item) => ({ ...item, tags: tagMap.get(item.id) ?? [] })) as MyCasesCase[];
}
export async function getCase(userId: string, id: string) {
  const items = await listCases(userId, undefined, true); return items.find((item) => item.id === id) ?? null;
}
export async function createCase(userId: string, input: MyCasesCaseInput) {
  const { tags = [], ...fields } = input; const supabase = await createClient();
  const { data, error } = await supabase.from("mycases_cases").insert({ ...fields, user_id: userId, source: "web" }).select("*").single();
  if (error) throw new Error(error.message); await syncTags(userId, "case", data.id, tags); return getCase(userId, data.id);
}
export async function updateCase(userId: string, id: string, input: Partial<MyCasesCaseInput>) {
  const { tags, ...fields } = input; const supabase = await createClient();
  const { data, error } = await supabase.from("mycases_cases").update(fields).eq("user_id", userId).eq("id", id).is("deleted_at", null).select("id").maybeSingle();
  if (error) throw new Error(error.message); if (!data) throw new Error("Case not found.");
  if (tags) await syncTags(userId, "case", id, tags); return getCase(userId, id);
}
export async function deleteCase(userId: string, id: string) {
  const supabase = await createClient(); const { data, error } = await supabase.from("mycases_cases").update({ deleted_at: new Date().toISOString() }).eq("user_id", userId).eq("id", id).is("deleted_at", null).select("id").maybeSingle();
  if (error) throw new Error(error.message); if (!data) throw new Error("Case not found.");
}

export async function listLearningItems(userId: string, filters: { kind?: string; caseId?: string; query?: string; includeArchived?: boolean } = {}) {
  const supabase = await createClient(); let request = supabase.from("mycases_learning_items").select("*").eq("user_id", userId).is("deleted_at", null).order("is_pinned", { ascending: false }).order("updated_at", { ascending: false });
  if (filters.kind) request = request.eq("kind", filters.kind); if (filters.caseId) request = request.eq("case_id", filters.caseId);
  if (!filters.includeArchived) request = request.eq("is_archived", false);
  if (filters.query?.trim()) request = request.textSearch("search_tsv", filters.query.trim(), { type: "websearch", config: "english" });
  const { data, error } = await request; if (error) throw new Error(error.message);
  const tagMap = await tagsByOwner(userId, "learning");
  return (data ?? []).map((item) => ({ ...item, tags: tagMap.get(item.id) ?? [] })) as MyCasesLearningItem[];
}
export async function getLearningItem(userId: string, id: string) { const items = await listLearningItems(userId, { includeArchived: true }); return items.find((item) => item.id === id) ?? null; }
async function assertOwnedCase(userId: string, caseId?: string | null) { if (!caseId) return null; if (!(await getCase(userId, caseId))) throw new Error("Case not found."); return caseId; }
export async function createLearningItem(userId: string, input: MyCasesLearningItemInput) {
  const { tags = [], ...fields } = input; const caseId = await assertOwnedCase(userId, fields.case_id); const supabase = await createClient();
  const { data, error } = await supabase.from("mycases_learning_items").insert({ ...fields, case_id: caseId, user_id: userId, source: "web" }).select("id").single();
  if (error) throw new Error(error.message); await syncTags(userId, "learning", data.id, tags); return getLearningItem(userId, data.id);
}
export async function updateLearningItem(userId: string, id: string, input: Partial<MyCasesLearningItemInput>) {
  const { tags, ...fields } = input; if ("case_id" in fields) fields.case_id = await assertOwnedCase(userId, fields.case_id); const supabase = await createClient();
  const { data, error } = await supabase.from("mycases_learning_items").update(fields).eq("user_id", userId).eq("id", id).is("deleted_at", null).select("id").maybeSingle();
  if (error) throw new Error(error.message); if (!data) throw new Error("Learning item not found."); if (tags) await syncTags(userId, "learning", id, tags); return getLearningItem(userId, id);
}
export async function deleteLearningItem(userId: string, id: string) { const supabase = await createClient(); const { data, error } = await supabase.from("mycases_learning_items").update({ deleted_at: new Date().toISOString() }).eq("user_id", userId).eq("id", id).is("deleted_at", null).select("id").maybeSingle(); if (error) throw new Error(error.message); if (!data) throw new Error("Learning item not found."); }
