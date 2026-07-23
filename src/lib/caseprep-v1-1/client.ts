import { getCasePrepInternalBaseUrl } from "@/lib/config/brobot";
import { CasePrepWebV11Schema, type CasePrepWebV11 } from "@/lib/caseprep-v1-1/schema";

export async function requestCasePrepWebV11(prompt: string): Promise<CasePrepWebV11> {
  const response = await fetch(`${getCasePrepInternalBaseUrl()}/case-prep/web/v1.1`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, entry_surface: "web_case_prep_v1_1" }),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    throw new Error(`CasePrep web v1.1 returned ${response.status}.`);
  }
  return CasePrepWebV11Schema.parse(await response.json());
}
