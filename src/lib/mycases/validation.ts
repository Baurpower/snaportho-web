import { MYCASES_CASE_STATUSES, MYCASES_LEARNING_KINDS, type MyCasesCaseInput, type MyCasesLearningItemInput } from "./types";

const forbiddenKeys = new Set(["user_id", "patient_name", "mrn", "dob", "encounter_id", "room", "history", "examination", "clinical_report", "caption", "encryption_key"]);
const text = (value: unknown, label: string, max: number, required = false) => {
  if (value == null || value === "") { if (required) throw new Error(`${label} is required.`); return null; }
  if (typeof value !== "string") throw new Error(`${label} must be text.`);
  const valueTrimmed = value.trim();
  if (required && !valueTrimmed) throw new Error(`${label} is required.`);
  if (valueTrimmed.length > max) throw new Error(`${label} is too long.`);
  return valueTrimmed || null;
};
const rating = (value: unknown, label: string) => {
  if (value == null) return null;
  if (!Number.isInteger(value) || Number(value) < 0 || Number(value) > 5) throw new Error(`${label} must be an integer from 0 to 5.`);
  return Number(value);
};
const tags = (value: unknown) => {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > 20) throw new Error("Tags are invalid.");
  return [...new Set(value.map((entry) => text(entry, "Tag", 40, true)!).filter(Boolean))];
};
function rejectForbidden(input: Record<string, unknown>) {
  for (const key of Object.keys(input)) if (forbiddenKeys.has(key.toLowerCase())) throw new Error(`Field ${key} is not accepted.`);
}

export function parseCaseInput(value: unknown, partial = false): Partial<MyCasesCaseInput> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid case payload.");
  const input = value as Record<string, unknown>; rejectForbidden(input);
  const output: Partial<MyCasesCaseInput> = {};
  if (!partial || "title" in input) output.title = text(input.title, "Title", 160, !partial)!;
  if (!partial || "procedure_name" in input) output.procedure_name = text(input.procedure_name, "Procedure", 160, !partial)!;
  for (const key of ["diagnosis", "rotation_context", "attending_context"] as const) if (!partial || key in input) output[key] = text(input[key], key, 160);
  for (const key of ["preparation", "debrief"] as const) if (!partial || key in input) output[key] = text(input[key], key, 10000);
  if (!partial || "status" in input) { const status = input.status ?? "draft"; if (!MYCASES_CASE_STATUSES.includes(status as never)) throw new Error("Invalid case status."); output.status = status as MyCasesCaseInput["status"]; }
  for (const key of ["difficulty", "autonomy"] as const) if (!partial || key in input) output[key] = rating(input[key], key);
  for (const key of ["is_archived"] as const) if (key in input) { if (typeof input[key] !== "boolean") throw new Error(`${key} must be boolean.`); output[key] = input[key]; }
  if ("tags" in input) output.tags = tags(input.tags);
  return output;
}

export function parseLearningItemInput(value: unknown, partial = false): Partial<MyCasesLearningItemInput> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid learning item payload.");
  const input = value as Record<string, unknown>; rejectForbidden(input);
  const output: Partial<MyCasesLearningItemInput> = {};
  if (!partial || "kind" in input) { if (!MYCASES_LEARNING_KINDS.includes(input.kind as never)) throw new Error("Invalid learning item kind."); output.kind = input.kind as MyCasesLearningItemInput["kind"]; }
  if (!partial || "content" in input) output.content = text(input.content, "Content", 10000, !partial)!;
  for (const key of ["title", "procedure_name", "diagnosis", "rotation_context", "attending_context", "topic"] as const) if (!partial || key in input) output[key] = text(input[key], key, key === "title" ? 200 : 160);
  if ("case_id" in input) output.case_id = text(input.case_id, "Case ID", 36);
  for (const key of ["is_pinned", "is_favorite", "is_archived"] as const) if (key in input) { if (typeof input[key] !== "boolean") throw new Error(`${key} must be boolean.`); output[key] = input[key]; }
  if ("tags" in input) output.tags = tags(input.tags);
  return output;
}
