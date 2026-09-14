import type { ProductEventName } from './product-events.ts';

export const ANKI_ATTENDING_PROMPT = 'What would an attending ask related to this?';
export const ANKI_OITE_PROMPT = 'What is a common OITE board trap or question?';

export type AnkiBroBotPromptKind = 'attending' | 'oite' | 'freeform';
export type AnkiOsFamily = 'mac' | 'windows' | 'linux' | 'other';

export type AnkiProductEventRow = {
  event_name: string;
  occurred_at: string;
  user_id: string | null;
  anonymous_id?: string | null;
  app_version: string | null;
  properties: Record<string, string | number | boolean | null> | null;
};

export type AnkiDeviceTokenRow = {
  user_id: string;
  last_used_at: string | null;
  revoked_at: string | null;
};

export type AnkiUsageSummary = {
  generatedAt: string;
  windowDays: number;
  uniqueDownloadersAllTime: number;
  uniqueDownloadersInWindow: number;
  totalDownloadsInWindow: number;
  uniqueLinkedInWindow: number;
  uniqueDeckImportsInWindow: number;
  uniqueBroBotUsersInWindow: number;
  uniqueOpenedInWindow: number;
  activatedWithin7d: number;
  activationRate: number | null;
  linkedDevices: number;
  activeUsers1d: number;
  activeUsers7d: number;
  activeUsers30d: number;
  promptKindCounts: Record<AnkiBroBotPromptKind, number>;
  versionMix: Array<{ version: string; people: number }>;
  setupFailures: Array<{ code: string; count: number }>;
  daily: Array<{
    day: string;
    landingViews: number;
    downloads: number;
    firstDownloads: number;
    links: number;
    deckImports: number;
    opened: number;
    brobotPrompts: number;
    deckUpdates: number;
    uniquePeople: number;
  }>;
};

export function classifyAnkiBroBotPrompt(message: string | null | undefined): AnkiBroBotPromptKind {
  const text = String(message ?? '');
  if (text.includes(ANKI_ATTENDING_PROMPT)) return 'attending';
  if (text.includes(ANKI_OITE_PROMPT)) return 'oite';
  return 'freeform';
}

function dayKey(value: string, now: Date): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return now.toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function inWindow(occurredAt: string, sinceMs: number): boolean {
  const time = Date.parse(occurredAt);
  return Number.isFinite(time) && time >= sinceMs;
}

function uniqueUsers(
  rows: AnkiProductEventRow[],
  eventName: ProductEventName,
  sinceMs?: number
): Set<string> {
  const users = new Set<string>();
  for (const row of rows) {
    if (row.event_name !== eventName || !row.user_id) continue;
    if (sinceMs != null && !inWindow(row.occurred_at, sinceMs)) continue;
    users.add(row.user_id);
  }
  return users;
}

export function summarizeAnkiUsage(input: {
  events: AnkiProductEventRow[];
  tokens: AnkiDeviceTokenRow[];
  allTimeDownloaders: number;
  windowDays?: number;
  now?: Date;
}): AnkiUsageSummary {
  const now = input.now ?? new Date();
  const windowDays = input.windowDays ?? 30;
  const sinceMs = now.getTime() - windowDays * 24 * 60 * 60 * 1000;
  const dayMs = 24 * 60 * 60 * 1000;

  const firstDownloaders = uniqueUsers(input.events, 'anki_addon_first_downloaded', sinceMs);
  const linked = uniqueUsers(input.events, 'anki_device_linked', sinceMs);
  const imported = uniqueUsers(input.events, 'anki_deck_imported', sinceMs);
  const brobot = uniqueUsers(input.events, 'anki_brobot_prompt_used', sinceMs);
  const opened = uniqueUsers(input.events, 'anki_addon_opened', sinceMs);

  const firstAt = new Map<string, number>();
  const linkedAt = new Map<string, number>();
  for (const row of input.events) {
    if (!row.user_id) continue;
    const time = Date.parse(row.occurred_at);
    if (!Number.isFinite(time)) continue;
    if (row.event_name === 'anki_addon_first_downloaded') {
      const current = firstAt.get(row.user_id);
      if (current == null || time < current) firstAt.set(row.user_id, time);
    }
    if (row.event_name === 'anki_device_linked') {
      const current = linkedAt.get(row.user_id);
      if (current == null || time < current) linkedAt.set(row.user_id, time);
    }
  }
  let activatedWithin7d = 0;
  for (const [userId, downloadedAt] of firstAt) {
    if (downloadedAt < sinceMs) continue;
    const linkedTime = linkedAt.get(userId);
    if (linkedTime != null && linkedTime <= downloadedAt + 7 * dayMs) activatedWithin7d += 1;
  }

  const totalDownloadsInWindow = input.events.filter(
    (row) => row.event_name === 'anki_addon_downloaded' && inWindow(row.occurred_at, sinceMs)
  ).length;

  const promptKindCounts: Record<AnkiBroBotPromptKind, number> = {
    attending: 0,
    oite: 0,
    freeform: 0,
  };
  for (const row of input.events) {
    if (row.event_name !== 'anki_brobot_prompt_used' || !inWindow(row.occurred_at, sinceMs)) continue;
    const kind = row.properties?.prompt_kind;
    if (kind === 'attending' || kind === 'oite' || kind === 'freeform') promptKindCounts[kind] += 1;
    else promptKindCounts.freeform += 1;
  }

  const latestVersion = new Map<string, { at: number; version: string }>();
  for (const row of input.events) {
    if (!row.user_id || !row.app_version) continue;
    if (row.event_name !== 'anki_addon_opened' && row.event_name !== 'anki_addon_downloaded') continue;
    const time = Date.parse(row.occurred_at);
    if (!Number.isFinite(time) || time < sinceMs) continue;
    const current = latestVersion.get(row.user_id);
    if (!current || time >= current.at) latestVersion.set(row.user_id, { at: time, version: row.app_version });
  }
  const versionCounts = new Map<string, number>();
  for (const { version } of latestVersion.values()) {
    versionCounts.set(version, (versionCounts.get(version) ?? 0) + 1);
  }

  const failureCounts = new Map<string, number>();
  for (const row of input.events) {
    if (row.event_name !== 'anki_setup_failed' || !inWindow(row.occurred_at, sinceMs)) continue;
    const code = String(row.properties?.code ?? 'unknown').slice(0, 64);
    failureCounts.set(code, (failureCounts.get(code) ?? 0) + 1);
  }

  const dailyMap = new Map<
    string,
    AnkiUsageSummary['daily'][number] & { people: Set<string> }
  >();
  for (let offset = windowDays - 1; offset >= 0; offset -= 1) {
    const day = new Date(now.getTime() - offset * dayMs).toISOString().slice(0, 10);
    dailyMap.set(day, {
      day,
      landingViews: 0,
      downloads: 0,
      firstDownloads: 0,
      links: 0,
      deckImports: 0,
      opened: 0,
      brobotPrompts: 0,
      deckUpdates: 0,
      uniquePeople: 0,
      people: new Set<string>(),
    });
  }
  for (const row of input.events) {
    if (!inWindow(row.occurred_at, sinceMs)) continue;
    const bucket = dailyMap.get(dayKey(row.occurred_at, now));
    if (!bucket) continue;
    const person = row.user_id ?? row.anonymous_id ?? null;
    if (person) bucket.people.add(person);
    if (row.event_name === 'anki_landing_viewed') bucket.landingViews += 1;
    if (row.event_name === 'anki_addon_downloaded') bucket.downloads += 1;
    if (row.event_name === 'anki_addon_first_downloaded') bucket.firstDownloads += 1;
    if (row.event_name === 'anki_device_linked') bucket.links += 1;
    if (row.event_name === 'anki_deck_imported') bucket.deckImports += 1;
    if (row.event_name === 'anki_addon_opened') bucket.opened += 1;
    if (row.event_name === 'anki_brobot_prompt_used') bucket.brobotPrompts += 1;
    if (row.event_name === 'anki_deck_update_applied') bucket.deckUpdates += 1;
  }

  const activeCutoff = (days: number) => new Date(now.getTime() - days * dayMs).toISOString();
  const activeTokens = input.tokens.filter((token) => !token.revoked_at);
  const activeUsers = (days: number) => {
    const cutoff = activeCutoff(days);
    const users = new Set<string>();
    for (const token of activeTokens) {
      if (token.last_used_at && token.last_used_at >= cutoff) users.add(token.user_id);
    }
    return users.size;
  };

  const uniqueDownloadersInWindow = firstDownloaders.size;
  return {
    generatedAt: now.toISOString(),
    windowDays,
    uniqueDownloadersAllTime: input.allTimeDownloaders,
    uniqueDownloadersInWindow,
    totalDownloadsInWindow,
    uniqueLinkedInWindow: linked.size,
    uniqueDeckImportsInWindow: imported.size,
    uniqueBroBotUsersInWindow: brobot.size,
    uniqueOpenedInWindow: opened.size,
    activatedWithin7d,
    activationRate:
      uniqueDownloadersInWindow === 0 ? null : activatedWithin7d / uniqueDownloadersInWindow,
    linkedDevices: activeTokens.length,
    activeUsers1d: activeUsers(1),
    activeUsers7d: activeUsers(7),
    activeUsers30d: activeUsers(30),
    promptKindCounts,
    versionMix: [...versionCounts.entries()]
      .map(([version, people]) => ({ version, people }))
      .sort((a, b) => b.people - a.people || a.version.localeCompare(b.version)),
    setupFailures: [...failureCounts.entries()]
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count || a.code.localeCompare(b.code)),
    daily: [...dailyMap.values()].map(({ people, ...rest }) => ({
      ...rest,
      uniquePeople: people.size,
    })),
  };
}
