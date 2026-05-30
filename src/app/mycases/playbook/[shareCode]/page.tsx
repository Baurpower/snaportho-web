import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import SmartDeepLink from '@/components/smartdeeplink'
import { fetchSharedPlaybook } from '@/lib/mycases/playbook-share'

const SITE_URL = 'https://snap-ortho.com'
const APP_STORE_URL = 'https://apps.apple.com/app/id6742800145'

// ── Helpers ──────────────────────────────────────────────────────────────────

function countFilledSections(payload: Record<string, unknown>): { filled: number; total: number } {
  try {
    const playbook = (payload as { playbook?: { sections?: unknown[] } }).playbook
    const sections = playbook?.sections ?? []
    const filled = sections.filter((s: unknown) => {
      const sec = s as { content?: string }
      return sec.content && sec.content.trim().length > 0
    }).length
    return { filled, total: sections.length }
  } catch {
    return { filled: 0, total: 0 }
  }
}

// ── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ shareCode: string }>
}): Promise<Metadata> {
  const { shareCode } = await params
  const row = await fetchSharedPlaybook(shareCode)

  if (!row) {
    return {
      title: 'Playbook Not Found | MyCases',
      description: 'This rotation playbook link is no longer active.',
    }
  }

  const { filled, total } = countFilledSections(row.payload_json)
  const canonicalUrl = `${SITE_URL}/mycases/playbook/${shareCode}`

  const title = `${row.rotation_name} Rotation Playbook`
  const descParts = ['Shared from MyCases']
  if (row.institution) descParts.push(row.institution)
  if (total > 0) descParts.push(`${filled} of ${total} sections`)
  const description = descParts.join(' · ')

  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      type: 'website',
      url: canonicalUrl,
      title,
      description,
      siteName: 'MyCases by SnapOrtho',
      images: [
        {
          url: '/og-image-away-rotations.png',
          width: 1200,
          height: 630,
          alt: `${row.rotation_name} Rotation Playbook — shared from MyCases`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/og-image-away-rotations.png'],
    },
  }
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function PlaybookSharePage({
  params,
}: {
  params: Promise<{ shareCode: string }>
}) {
  const { shareCode } = await params
  const row = await fetchSharedPlaybook(shareCode)

  if (!row) notFound()

  // Check expiry
  if (row.expires_at && new Date(row.expires_at) < new Date()) {
    return <ExpiredPage />
  }

  const { filled, total } = countFilledSections(row.payload_json)
  const deepLink = `mycases://playbook/share/${shareCode}`

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-cream, #F8EACF)' }}>
      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="max-w-lg mx-auto px-5 py-12">

        {/* App badge */}
        <div className="flex items-center gap-3 mb-8">
          <Image
            src="/snaportho-logo.png"
            alt="MyCases"
            width={44}
            height={44}
            className="rounded-xl shadow-sm"
          />
          <div>
            <p className="text-xs font-bold uppercase tracking-widest"
              style={{ color: 'var(--color-midnight, #0D0E1F)', opacity: 0.45 }}>
              MyCases
            </p>
            <p className="text-sm font-semibold"
              style={{ color: 'var(--color-midnight, #0D0E1F)', opacity: 0.7 }}>
              by SnapOrtho
            </p>
          </div>
        </div>

        {/* Playbook card */}
        <div
          className="bg-white rounded-3xl shadow-sm border p-6 mb-6"
          style={{ borderColor: 'rgba(13,14,31,0.08)' }}
        >
          {/* Icon + title */}
          <div className="flex items-start gap-4">
            <div
              className="flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(124,58,237,0.10)' }}
            >
              {/* Book icon */}
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"
                  stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                />
                <path
                  d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"
                  stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                />
              </svg>
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide mb-0.5"
                style={{ color: '#7C3AED' }}>
                Rotation Playbook
              </p>
              <h1 className="text-2xl font-extrabold leading-tight"
                style={{ color: 'var(--color-midnight, #0D0E1F)' }}>
                {row.rotation_name}
              </h1>
              {row.institution && (
                <p className="text-base font-semibold mt-0.5"
                  style={{ color: 'var(--color-midnight, #0D0E1F)', opacity: 0.55 }}>
                  {row.institution}
                </p>
              )}
            </div>
          </div>

          {/* Stats */}
          {total > 0 && (
            <div
              className="mt-5 flex gap-0 rounded-2xl overflow-hidden"
              style={{ background: 'rgba(13,14,31,0.04)' }}
            >
              <StatCell value={String(filled)} label="Sections filled" />
              <div style={{ width: 1, background: 'rgba(13,14,31,0.08)' }} />
              <StatCell value={String(total)} label="Total sections" />
            </div>
          )}

          {/* Shared label */}
          <p className="mt-5 text-sm font-medium"
            style={{ color: 'var(--color-midnight, #0D0E1F)', opacity: 0.45 }}>
            Shared from MyCases
          </p>
        </div>

        {/* ── CTA ─────────────────────────────────────────────────── */}
        {/* Wrapper provides the visual styling; SmartDeepLink renders the <a> */}
        <div
          className="rounded-2xl shadow-lg overflow-hidden"
          style={{ background: '#7C3AED', boxShadow: '0 2px 16px rgba(124,58,237,0.30)' }}
        >
          <SmartDeepLink
            deepLink={deepLink}
            fallbackUrl={APP_STORE_URL}
            className="block w-full text-center py-4 px-6 font-bold text-base text-white"
          >
            Open in MyCases
          </SmartDeepLink>
        </div>

        <p className="mt-3 text-center text-xs" style={{ color: 'var(--color-midnight, #0D0E1F)', opacity: 0.45 }}>
          If MyCases doesn&apos;t open,{' '}
          <a href={APP_STORE_URL} className="underline font-semibold">
            install it from the App Store
          </a>{' '}
          and return to this link.
        </p>

        {/* ── Privacy note ─────────────────────────────────────────── */}
        <div
          className="mt-8 rounded-2xl p-4 flex gap-3 items-start"
          style={{ background: 'rgba(13,14,31,0.05)' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="flex-shrink-0 mt-0.5" aria-hidden="true">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"
              stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--color-midnight, #0D0E1F)', opacity: 0.55 }}>
            <strong className="font-semibold" style={{ opacity: 1 }}>Privacy:</strong>{' '}
            MyCases Rotation Playbooks are intended for workflow notes and team preferences
            only. They must not contain patient information.
          </p>
        </div>

        {/* ── Footer ──────────────────────────────────────────────── */}
        <div className="mt-10 text-center text-xs"
          style={{ color: 'var(--color-midnight, #0D0E1F)', opacity: 0.4 }}>
          <Link href="/" className="hover:opacity-70 transition font-semibold">SnapOrtho</Link>
          <span className="mx-2">·</span>
          <Link href="/mobile-app" className="hover:opacity-70 transition">Get the app</Link>
          <span className="mx-2">·</span>
          <Link href="/privacy" className="hover:opacity-70 transition">Privacy</Link>
        </div>
      </section>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCell({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex-1 py-3 px-4 text-center">
      <div className="text-lg font-extrabold" style={{ color: 'var(--color-midnight, #0D0E1F)' }}>
        {value}
      </div>
      <div className="text-xs font-semibold mt-0.5" style={{ color: 'var(--color-midnight, #0D0E1F)', opacity: 0.45 }}>
        {label}
      </div>
    </div>
  )
}

function ExpiredPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-5"
      style={{ background: 'var(--color-cream, #F8EACF)' }}>
      <div className="bg-white rounded-3xl shadow-sm border p-8 max-w-sm w-full text-center"
        style={{ borderColor: 'rgba(13,14,31,0.08)' }}>
        <div className="text-4xl mb-4">⏰</div>
        <h1 className="text-xl font-extrabold mb-2"
          style={{ color: 'var(--color-midnight, #0D0E1F)' }}>
          Link Expired
        </h1>
        <p className="text-sm" style={{ color: 'var(--color-midnight, #0D0E1F)', opacity: 0.55 }}>
          This rotation playbook link is no longer active. Ask the sender to share a new link.
        </p>
        <Link
          href="/mobile-app"
          className="mt-6 block py-3 px-6 rounded-2xl font-bold text-sm text-white"
          style={{ background: '#7C3AED' }}
        >
          Get MyCases
        </Link>
      </div>
    </div>
  )
}
