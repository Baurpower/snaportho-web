import { splitFields } from "@/lib/workspace/signout/fields";
import { computeNextOr, computePod, computeTxDay } from "@/lib/workspace/signout/pod";
import type { SignoutCard } from "@/lib/workspace/signout/types";

/**
 * Builds the LLM messages for a per-card "attending update" draft.
 *
 * Safety: the payload carries ONLY the clinical body/facets — never the patient's
 * name/DOB/MRN (those live under a separate key) and never room/location. The model
 * emits the literal token `{{name}}`, which the browser splices locally after the
 * response returns, so no name ever reaches OpenAI.
 */

export const DRAFT_SYSTEM_PROMPT = `You are an orthopaedic surgery resident drafting a concise clinical update to text an attending.

Rules:
- Reformat ONLY the information provided. Do not add, infer, or embellish any clinical fact. If a field is empty, omit it.
- Write the patient's name as the literal token {{name}} — never invent or write an actual name.
- Structure as flowing clinical prose in short paragraphs, in this order:
  {{name}}, <age/sex> <presentation>. Then interval history, then PE, then labs/imaging, then assessment/plan.
- Keep orthopaedic shorthand exactly as given (POD, WBAT, NWB, NVI, ROM, s/p, I&D, etc.).
- Preserve any "image attached"/"images attached" notes verbatim.
- Do NOT include a greeting. Do NOT include room, bed, unit, or location. Do NOT include a severity/triage label.
- Output ONLY the message text, with no preamble, headings, or quotation marks.`;

function surgeryContext(card: SignoutCard): string {
  if (card.managementMode === "nonop") {
    const tx = computeTxDay(card.surgeryDate);
    return [card.surgery, tx?.label].filter(Boolean).join(" · ");
  }
  const pod = computePod(card.surgeryDate);
  const parts: string[] = [];
  if (pod) parts.push(pod.label);
  if (card.surgery) parts.push(`s/p ${card.surgery}`);
  const next = computeNextOr(card.nextSurgeryDate);
  const plannedNext = [card.nextSurgery, next?.label].filter(Boolean).join(" ");
  if (plannedNext) parts.push(`planned: ${plannedNext}`);
  return parts.join(", ");
}

/** The structured, de-identified fields handed to the model. */
export function draftPayload(card: SignoutCard): Record<string, string> {
  const f = splitFields(card.body);
  const payload: Record<string, string> = {};
  const put = (key: string, value: string) => {
    if (value && value.trim()) payload[key] = value.trim();
  };
  put("oneLiner", f.lead);
  put("surgeryContext", surgeryContext(card));
  put("hpiExam", f.values["HPI/Exam"] ?? "");
  put("labsImaging", f.values["Labs/Imaging/PT"] ?? "");
  put("plan", f.values["Plan"] ?? "");
  put("todo", f.values["To-do"] ?? "");
  return payload;
}

export function buildDraftMessages(card: SignoutCard): {
  system: string;
  user: string;
} {
  return {
    system: DRAFT_SYSTEM_PROMPT,
    user: JSON.stringify(draftPayload(card)),
  };
}
