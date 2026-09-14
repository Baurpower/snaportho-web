'use client';

import { useEffect, useState } from 'react';

import type { AnkiUsageSummary } from '@/lib/analytics/anki-usage-summary';

function percent(value: number | null): string {
  if (value == null || Number.isNaN(value)) return '—';
  return `${Math.round(value * 100)}%`;
}

function SummaryCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="text-3xl font-bold text-gray-900">{value}</div>
      <div className="mt-1 text-sm font-medium text-gray-700">{label}</div>
      {hint ? <div className="mt-1 text-xs text-gray-500">{hint}</div> : null}
    </div>
  );
}

export function AnkiUsageDashboard() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<AnkiUsageSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetch(`/api/admin/anki-usage?days=${days}`, { credentials: 'include' })
      .then(async (response) => {
        const body = (await response.json().catch(() => null)) as
          | { data?: AnkiUsageSummary; error?: string }
          | null;
        if (!response.ok) {
          throw new Error(body?.error || `Unable to load usage (${response.status})`);
        }
        if (!body?.data) throw new Error('Usage snapshot missing.');
        if (!cancelled) setData(body.data);
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setData(null);
          setError(loadError instanceof Error ? loadError.message : 'Unable to load usage.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [days]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">SnapOrtho for Anki usage</h1>
          <p className="mt-1 text-sm text-gray-600">
            Downloads, linked devices, and feature use. Card text and review history are never stored.
          </p>
        </div>
        <label className="text-sm text-gray-600" htmlFor="anki-usage-window">
          Window
          <select
            id="anki-usage-window"
            className="ml-2 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm"
            value={days}
            onChange={(event) => setDays(Number(event.target.value))}
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </label>
      </div>

      {loading ? <p className="mt-8 text-sm text-gray-500">Loading usage…</p> : null}
      {error ? <p className="mt-8 text-sm text-red-600">{error}</p> : null}

      {data ? (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard
              label="Unique downloaders"
              value={data.uniqueDownloadersAllTime}
              hint={`${data.uniqueDownloadersInWindow} first downloads in window`}
            />
            <SummaryCard
              label="Downloads in window"
              value={data.totalDownloadsInWindow}
              hint="Includes re-downloads of the same add-on"
            />
            <SummaryCard
              label="Linked in window"
              value={data.uniqueLinkedInWindow}
              hint={`Activation within 7 days: ${percent(data.activationRate)}`}
            />
            <SummaryCard
              label="7-day active users"
              value={data.activeUsers7d}
              hint={`${data.linkedDevices} linked devices · ${data.activeUsers1d} today`}
            />
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard label="Deck imports" value={data.uniqueDeckImportsInWindow} />
            <SummaryCard label="BroBot users" value={data.uniqueBroBotUsersInWindow} />
            <SummaryCard
              label="Add-on opens"
              value={data.uniqueOpenedInWindow}
              hint="Daily heartbeats after the add-on update"
            />
            <SummaryCard
              label="30-day active"
              value={data.activeUsers30d}
              hint="From linked device last_used_at"
            />
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-gray-200 bg-white p-5">
              <h2 className="text-lg font-semibold text-gray-900">BroBot prompts</h2>
              <ul className="mt-4 space-y-2 text-sm text-gray-700">
                <li>Attending: {data.promptKindCounts.attending}</li>
                <li>OITE trap: {data.promptKindCounts.oite}</li>
                <li>Freeform: {data.promptKindCounts.freeform}</li>
              </ul>
            </section>
            <section className="rounded-2xl border border-gray-200 bg-white p-5">
              <h2 className="text-lg font-semibold text-gray-900">Add-on versions</h2>
              {data.versionMix.length === 0 ? (
                <p className="mt-4 text-sm text-gray-500">No version reports in this window.</p>
              ) : (
                <ul className="mt-4 space-y-2 text-sm text-gray-700">
                  {data.versionMix.map((row) => (
                    <li key={row.version}>
                      {row.version}: {row.people} {row.people === 1 ? 'person' : 'people'}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-gray-900">Setup failures</h2>
            {data.setupFailures.length === 0 ? (
              <p className="mt-4 text-sm text-gray-500">No setup failures recorded in this window.</p>
            ) : (
              <ul className="mt-4 space-y-2 text-sm text-gray-700">
                {data.setupFailures.map((row) => (
                  <li key={row.code}>
                    {row.code}: {row.count}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="mt-6 overflow-x-auto rounded-2xl border border-gray-200 bg-white">
            <table className="min-w-full text-left text-sm">
              <caption className="sr-only">Daily SnapOrtho for Anki funnel</caption>
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Day</th>
                  <th className="px-4 py-3">Landing</th>
                  <th className="px-4 py-3">Downloads</th>
                  <th className="px-4 py-3">First</th>
                  <th className="px-4 py-3">Links</th>
                  <th className="px-4 py-3">Imports</th>
                  <th className="px-4 py-3">Opens</th>
                  <th className="px-4 py-3">BroBot</th>
                  <th className="px-4 py-3">Updates</th>
                  <th className="px-4 py-3">People</th>
                </tr>
              </thead>
              <tbody>
                {[...data.daily].reverse().map((row) => (
                  <tr key={row.day} className="border-t border-gray-100">
                    <td className="px-4 py-2 font-medium text-gray-800">{row.day}</td>
                    <td className="px-4 py-2">{row.landingViews}</td>
                    <td className="px-4 py-2">{row.downloads}</td>
                    <td className="px-4 py-2">{row.firstDownloads}</td>
                    <td className="px-4 py-2">{row.links}</td>
                    <td className="px-4 py-2">{row.deckImports}</td>
                    <td className="px-4 py-2">{row.opened}</td>
                    <td className="px-4 py-2">{row.brobotPrompts}</td>
                    <td className="px-4 py-2">{row.deckUpdates}</td>
                    <td className="px-4 py-2">{row.uniquePeople}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      ) : null}
    </div>
  );
}
