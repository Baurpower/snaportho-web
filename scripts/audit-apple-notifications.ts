import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  fetchAppleNotificationHistory,
  requestAppleTestNotification,
  type AppleEnvironment,
} from '@/lib/apple/app-store-server';
import { recoverAppleNotificationHistory } from '@/lib/subscriptions/apple-notification-recovery';

function loadDotEnvLocal() {
  const path = join(process.cwd(), '.env.local');
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const match = line.trim().match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
  }
}

async function main() {
  loadDotEnvLocal();
  const apply = process.argv.includes('--apply');
  const sendTest = process.argv.includes('--send-test');
  const sinceArg = process.argv.find((value) => value.startsWith('--since='));
  const startDate = sinceArg
    ? new Date(sinceArg.slice('--since='.length))
    : new Date(Date.now() - 72 * 60 * 60 * 1000);
  const endDate = new Date();

  for (const environment of ['production', 'sandbox'] as AppleEnvironment[]) {
    const history = await fetchAppleNotificationHistory({
      environment,
      startDate,
      endDate,
      maxPages: 50,
    });
    console.log(JSON.stringify({
      environment,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      pagesFetched: history.pagesFetched,
      notificationsFound: history.signedPayloads.length,
    }));

    if (apply) {
      const recovery = await recoverAppleNotificationHistory({
        environment,
        lookbackHours: Math.ceil((endDate.getTime() - startDate.getTime()) / 3_600_000),
        maxPages: 50,
        now: endDate,
      });
      console.log(JSON.stringify({ recovery }));
    }

    if (sendTest) {
      const test = await requestAppleTestNotification(environment);
      console.log(JSON.stringify({
        environment,
        testNotificationRequested: true,
        testNotificationTokenPresent: Boolean(test.testNotificationToken),
      }));
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
