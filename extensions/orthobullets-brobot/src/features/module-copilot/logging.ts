export function logModuleCopilot(event: Record<string, unknown>) {
  const safe = { ...event };
  delete safe.visibleText;
  delete safe.text;
  delete safe.apiKey;
  delete safe.deviceToken;
  console.info('[module-copilot]', safe);
}
