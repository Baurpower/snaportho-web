import { ImageResponse } from 'next/og'
import { getShareMetadata } from '@/lib/mycases/playbook-share'
import fs from 'fs/promises'
import path from 'path'

export const runtime = 'nodejs'
export const alt = 'Rotation Playbook — MyCases'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// ── Design tokens ─────────────────────────────────────────────────────────────
const TEAL        = '#0891B2'
const TEAL_DARK   = '#0E7490'
const NAVY        = '#0F172A'
const SLATE       = '#64748B'
const SLATE_LIGHT = '#94A3B8'
const PURPLE      = '#7C3AED'
const WHITE       = '#FFFFFF'

// ── Logo loader ───────────────────────────────────────────────────────────────
// Place the MyCases logo at public/mycases/mycases-logo.png
async function getLogoDataUrl(): Promise<string | null> {
  const candidates = [
    path.join(process.cwd(), 'public', 'mycases', 'mycases-logo.png'),
    path.join(process.cwd(), 'public', 'MyCasesLogo.png'),
    path.join(process.cwd(), 'public', 'My CasesLogo.png'),
  ]
  for (const p of candidates) {
    try {
      const buf = await fs.readFile(p)
      return `data:image/png;base64,${buf.toString('base64')}`
    } catch { /* try next candidate */ }
  }
  return null
}

// ── Large logo element (200×200) used in main layout ─────────────────────────
function LargeLogo({ src }: { src: string | null }) {
  if (src) {
    return (
      <img
        src={src}
        width={200}
        height={200}
        style={{ borderRadius: 36, objectFit: 'contain' }}
        alt=""
      />
    )
  }
  // Fallback: styled "MC" badge — swap for real logo by placing asset at the path above
  return (
    <div
      style={{
        width: 200,
        height: 200,
        borderRadius: 36,
        background: `linear-gradient(135deg, ${TEAL} 0%, ${PURPLE} 100%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: WHITE,
        fontSize: 74,
        fontWeight: 900,
        letterSpacing: -2,
      }}
    >
      MC
    </div>
  )
}

export default async function OgImage({
  params,
}: {
  params: Promise<{ shareCode: string }>
}) {
  const { shareCode } = await params
  const [meta, logoSrc] = await Promise.all([
    getShareMetadata(shareCode),
    getLogoDataUrl(),
  ])

  const canvasBase = {
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
        <div style={canvasBase}>
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

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 1,
              position: 'relative',
            }}
          >
            <LargeLogo src={logoSrc} />

            <div style={{ height: 28 }} />

            <div
              style={{
                fontSize: 40,
                fontWeight: 800,
                color: TEAL_DARK,
                letterSpacing: 3,
                textTransform: 'uppercase',
              }}
            >
              MyCases
            </div>

            <div style={{ height: 8 }} />

            <div style={{ fontSize: 22, fontWeight: 500, color: SLATE }}>
              Rotation Playbook
            </div>

            <div style={{ height: 36 }} />

            <div
              style={{
                width: 56,
                height: 2,
                background: 'rgba(8,145,178,0.25)',
                borderRadius: 1,
              }}
            />

            <div style={{ height: 36 }} />

            <div style={{ fontSize: 26, fontWeight: 500, color: SLATE }}>
              Open this link in MyCases to view
            </div>

            <div style={{ height: 20 }} />

            <div style={{ fontSize: 17, fontWeight: 500, color: SLATE_LIGHT }}>
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

  // Card inner content width ≈ 716px − 96px padding = 620px
  const titleFontSize =
    rotationName.length > 45 ? 44 : rotationName.length > 30 ? 54 : 64

  return new ImageResponse(
    (
      <div
        style={{
          ...canvasBase,
          padding: '48px 64px 40px 64px',
        }}
      >
        {/* Subtle radial glow behind the card */}
        <div
          style={{
            position: 'absolute',
            width: 700,
            height: 500,
            top: 65,
            right: 80,
            borderRadius: '50%',
            background:
              'radial-gradient(ellipse, rgba(8,145,178,0.07) 0%, transparent 68%)',
          }}
        />

        {/* ── Main row: brand left + card right ──────────────────── */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            flex: 1,
            gap: 56,
            position: 'relative',
          }}
        >
          {/* Left: brand column */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              width: 300,
              flexShrink: 0,
            }}
          >
            <LargeLogo src={logoSrc} />

            <div style={{ height: 24 }} />

            <div
              style={{
                fontSize: 32,
                fontWeight: 800,
                color: TEAL_DARK,
                letterSpacing: 2.5,
                textTransform: 'uppercase',
              }}
            >
              MyCases
            </div>

            <div style={{ height: 8 }} />

            <div style={{ fontSize: 17, fontWeight: 500, color: SLATE }}>
              Rotation Playbook
            </div>

            <div style={{ height: 28 }} />

            <div
              style={{
                width: 48,
                height: 2,
                background: 'rgba(8,145,178,0.28)',
                borderRadius: 1,
              }}
            />

            <div style={{ height: 28 }} />

            <div style={{ fontSize: 15, fontWeight: 500, color: SLATE_LIGHT }}>
              Shared with MyCases
            </div>
          </div>

          {/* Right: playbook card */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                background: WHITE,
                borderRadius: 28,
                border: '1.5px solid rgba(8,145,178,0.18)',
                padding: '44px 48px',
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                boxShadow:
                  '0 6px 40px rgba(8,145,178,0.13), 0 1px 6px rgba(15,23,42,0.06)',
              }}
            >
              {/* Eyebrow */}
              <div
                style={{
                  fontSize: 13,
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
                  lineHeight: 1.1,
                  letterSpacing: -1,
                }}
              >
                {rotationName}
              </div>

              {/* Institution */}
              {institution && (
                <div
                  style={{
                    fontSize: 26,
                    fontWeight: 600,
                    color: SLATE,
                    lineHeight: 1.2,
                  }}
                >
                  {institution}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Footer: progress + powered-by ──────────────────────── */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 24,
            position: 'relative',
          }}
        >
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
              <span style={{ fontSize: 20, fontWeight: 600, color: TEAL_DARK }}>
                {counts.filled} of {counts.total} sections completed
              </span>
            </div>
          ) : (
            <div style={{ display: 'flex' }} />
          )}

          <div style={{ fontSize: 17, fontWeight: 600, color: SLATE }}>
            Powered by SnapOrtho
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
