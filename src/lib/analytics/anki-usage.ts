import { createAdminClient } from '@/lib/supabase/admin';
import { recordProductEvent } from '@/lib/analytics/product-events-server';
import type { ProductEventInput, ProductEventName } from '@/lib/analytics/product-events';
import {
  summarizeAnkiUsage,
  type AnkiDeviceTokenRow,
  type AnkiProductEventRow,
  type AnkiUsageSummary,
} from '@/lib/analytics/anki-usage-summary';

export {
  ANKI_ATTENDING_PROMPT,
  ANKI_OITE_PROMPT,
  classifyAnkiBroBotPrompt,
  summarizeAnkiUsage,
  type AnkiBroBotPromptKind,
  type AnkiDeviceTokenRow,
  type AnkiOsFamily,
  type AnkiProductEventRow,
  type AnkiUsageSummary,
} from '@/lib/analytics/anki-usage-summary';

export function recordAnkiProductEvent(
  input: Omit<ProductEventInput, 'productArea'> & { eventName: ProductEventName }
): Promise<boolean> {
  return recordProductEvent({
    ...input,
    productArea: 'anki',
  });
}

export async function loadAnkiUsageSnapshot(windowDays = 30, now = new Date()): Promise<AnkiUsageSummary> {
  const admin = createAdminClient();
  const since = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000).toISOString();
  const [eventsResult, tokensResult, downloadersResult] = await Promise.all([
    admin
      .from('product_events')
      .select('event_name, occurred_at, user_id, anonymous_id, app_version, properties')
      .eq('product_area', 'anki')
      .gte('occurred_at', since),
    admin.from('brobot_anki_device_tokens').select('user_id, last_used_at, revoked_at'),
    admin
      .from('product_events')
      .select('*', { count: 'exact', head: true })
      .eq('event_name', 'anki_addon_first_downloaded'),
  ]);

  if (eventsResult.error) throw new Error(eventsResult.error.message);
  if (tokensResult.error) throw new Error(tokensResult.error.message);
  if (downloadersResult.error) throw new Error(downloadersResult.error.message);

  return summarizeAnkiUsage({
    events: (eventsResult.data ?? []) as AnkiProductEventRow[],
    tokens: (tokensResult.data ?? []) as AnkiDeviceTokenRow[],
    allTimeDownloaders: downloadersResult.count ?? 0,
    windowDays,
    now,
  });
}
