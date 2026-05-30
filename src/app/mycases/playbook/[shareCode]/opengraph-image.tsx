import { ImageResponse } from 'next/og'
import { getShareMetadata } from '@/lib/mycases/playbook-share'
import fs from 'fs/promises'
import path from 'path'

export const runtime = 'nodejs'
export const alt = 'Rotation Playbook — MyCases'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// ── Design tokens ─────────────────────────────────────────────────────────────
const TEAL       = '#0891B2'
const TEAL_DARK  = '#0E7490'
const NAVY       = '#0F172A'
const SLATE      = '#64748B'
const PURPLE     = '#7C3AED'
const WHITE      = '#FFFFFF'

// ── Load logo as base64 from public/ (Node runtime, no network needed) ────────
async function getLogoDataUrl(): Promise<string | null> {
  for (const name of ['MyCasesLogo.png', 'My CasesLogo.png']) {
    try {
      const buf = await fs.readFile(path.join(process.cwd(), 'public', name))
      return `data:image/png;base64,${buf.toString('base64')}`
    } catch { /* try next candidate */ }
  }
  return null
}

export default async function OgImage({
  params,
}: {
  params: Promise<{ shareCode: string }>
}) {
  const { shareCode } = await params
  const [meta, logoSrc] = await Promise.all([getShareMetadata(shareCode), getLogoDataUrl()])

  // ── Logo element (reused in both branches) ────────────────────────────────
  const logoEl = logoSrc ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logoSrc}
      width={56}
      height={56}
      style={{ borderRadius: 14, objectFit: 'contain' }}
      alt=""
    />
  ) : (
    <div
      style={{
        width: 56,
        height: 56,
        borderRadius: 14,
        background: `linear-gradient(135deg, ${TEAL} 0%, ${PURPLE} 100%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: WHITE,
        fontSize: 22,
        fontWeight: 800,
        letterSpacing: -0.5,
      }}
    >
      MC
    </div>
  )

  // ── Background canvas shared by both branches ─────────────────────────────
  const canvasStyle = {
    width: 1200,
    height: 630,
    display: 'flex',
    flexDirection: 'column' as const,
    background: 'linear-gradient(150deg, #EEF6FF 0%, #F0FDFA 55%, #EEF6FF 100%)',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    position: 'relative' as const,
    overflow: 'hidden' as const,
  }

  // ── Fallback for invalid / expired codes ──────────────────────────────────
  if (!meta) {
    return new ImageResponse(
      (
        <div style={canvasStyle}>
          {/* Subtle center radial glow */}
          <div
            style={{
              position: 'absolute',
              width: 800,
              height: 500,
              top: 65,
              left: 200,
              borderRadius: '50%',
              background:
                'radial-gradient(ellipse, rgba(8,145,178,0.10) 0%, transparent 68%)',
            }}
          />

          {/* Centered content */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 1,
              gap: 40,
              position: 'relative',
            }}
          >
            {/* Brand badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {logoEl}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 800,
                    color: TEAL_DARK,
                    letterSpacing: 3,
                    textTransform: 'uppercase',
                  }}
                >
                  MyCases
                </div>
                <div style={{ fontSize: 16, fontWeight: 500, color: SLATE }}>
                  Rotation Playbook
                </div>
              </div>
            </div>

            {/* Main message */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 14,
              }}
            >
              <div
                style={{
                  fontSize: 58,
                  fontWeight: 900,
                  color: NAVY,
                  letterSpacing: -1.5,
                }}
              >
                Rotation Playbook
              </div>
              <div style={{ fontSize: 28, fontWeight: 500, color: SLATE }}>
                Open this link in MyCases to view
              </div>
            </div>

            {/* Powered by */}
            <div style={{ fontSize: 18, fontWeight: 600, color: SLATE }}>
              Powered by SnapOrtho
            </div>
          </div>
        </div>
      ),
      { width: 1200, height: 630 }
    )
  }

  // ── Main image ────────────────────────────────────────────────────────────
  const { rotationName, institution, counts } = meta
  const hasSections = counts.total > 0
  const titleFontSize =
    rotationName.length > 45 ? 50 : rotationName.length > 30 ? 60 : 70

  return new ImageResponse(
    (
      <div style={{ ...canvasStyle, padding: '52px 72px' }}>
        {/* Subtle off-center radial glow */}
        <div
          style={{
            position: 'absolute',
            width: 800,
            height: 560,
            top: 35,
            left: 200,
            borderRadius: '50%',
            background:
              'radial-gradient(ellipse, rgba(8,145,178,0.08) 0%, transparent 68%)',
          }}
        />

        {/* Content column */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            flex: 1,
            position: 'relative',
          }}
        >
          {/* ── Header: logo + brand ─────────────────────────────── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {logoEl}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                  color: TEAL_DARK,
                  letterSpacing: 2.5,
                  textTransform: 'uppercase',
                }}
              >
                MyCases
              </div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: SLATE,
                  letterSpacing: 0.3,
                }}
              >
                Rotation Playbook
              </div>
            </div>
          </div>

          {/* ── Floating card ─────────────────────────────────────── */}
          <div
            style={{
              background: WHITE,
              borderRadius: 28,
              border: '1.5px solid rgba(8,145,178,0.18)',
              padding: '44px 56px',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              boxShadow:
                '0 6px 40px rgba(8,145,178,0.13), 0 1px 6px rgba(15,23,42,0.06)',
            }}
          >
            {/* Eyebrow label */}
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: TEAL,
                letterSpacing: 2.5,
                textTransform: 'uppercase',
              }}
            >
              Rotation Playbook
            </div>

            {/* Rotation name */}
            <div
              style={{
                fontSize: titleFontSize,
                fontWeight: 900,
                color: NAVY,
                lineHeight: 1.05,
                letterSpacing: -1.5,
              }}
            >
              {rotationName}
            </div>

            {/* Institution */}
            {institution && (
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 600,
                  color: SLATE,
                  lineHeight: 1.2,
                }}
              >
                {institution}
              </div>
            )}
          </div>

          {/* ── Footer row ───────────────────────────────────────── */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            {/* Progress pill */}
            {hasSections ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  background: 'rgba(8,145,178,0.08)',
                  borderRadius: 50,
                  padding: '10px 22px',
                  border: '1px solid rgba(8,145,178,0.2)',
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: TEAL,
                  }}
                />
                <span
                  style={{ fontSize: 22, fontWeight: 600, color: TEAL_DARK }}
                >
                  {counts.filled} of {counts.total} sections completed
                </span>
              </div>
            ) : (
              <div style={{ display: 'flex' }} />
            )}

            {/* Powered by */}
            <div style={{ fontSize: 18, fontWeight: 600, color: SLATE }}>
              Powered by SnapOrtho
            </div>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
