/**
 * Deployment boundary flags for code that should remain in Git without becoming
 * active on Vercel unless production explicitly opts in.
 */

function readBooleanFlag(name: string, defaultValue = false): boolean {
  const raw = process.env[name]?.trim().toLowerCase();

  if (!raw) return defaultValue;
  if (raw === "true") return true;
  if (raw === "false") return false;

  return defaultValue;
}

export function isCronJobsEnabled(): boolean {
  return readBooleanFlag("ENABLE_CRON_JOBS", false);
}

export function isKgAutomationEnabled(): boolean {
  return readBooleanFlag("ENABLE_KG_AUTOMATION", false);
}

export function getDisabledAutomationResponse(message: string) {
  return {
    disabled: true,
    message,
  } as const;
}
