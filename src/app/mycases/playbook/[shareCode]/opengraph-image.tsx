import { ImageResponse } from 'next/og'
import { getShareMetadata } from '@/lib/mycases/playbook-share'

export const runtime = 'nodejs'
export const alt = 'Rotation Playbook — MyCases'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// ── Design tokens ─────────────────────────────────────────────────────────────
const BG_TOP = '#0F1E3C'      // deep navy
const BG_BOT = '#0D3B38'      // dark teal
const PURPLE = '#7C3AED'
const PURPLE_LIGHT = '#A78BFA'
const WHITE = '#FFFFFF'
const WHITE_DIM = 'rgba(255,255,255,0.55)'
const WHITE_FAINT = 'rgba(255,255,255,0.12)'

export default async function OgImage({
  params,
}: {
  params: Promise<{ shareCode: string }>
}) {
  const { shareCode } = await params
  const meta = await getShareMetadata(shareCode)

  // ── Fallback for invalid / expired codes ────────────────────────────────
  if (!meta) {
    return new ImageResponse(
      (
        <div
          style={{
            width: 1200,
            height: 630,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: `linear-gradient(135deg, ${BG_TOP} 0%, ${BG_BOT} 100%)`,
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          <div style={{ fontSize: 72, marginBottom: 24 }}>📘</div>
          <div style={{ fontSize: 48, fontWeight: 800, color: WHITE, marginBottom: 12 }}>
            Rotation Playbook
          </div>
          <div style={{ fontSize: 28, color: WHITE_DIM }}>Open in MyCases</div>
        </div>
      ),
      { width: 1200, height: 630 }
    )
  }

  const { rotationName, institution, counts } = meta
  const hasSections = counts.total > 0

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: 'flex',
          flexDirection: 'column',
          background: `linear-gradient(145deg, ${BG_TOP} 0%, ${BG_BOT} 100%)`,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* ── Background glow circles ───────────────────────────── */}
        <div
          style={{
            position: 'absolute',
            top: -180,
            right: -120,
            width: 520,
            height: 520,
            borderRadius: '50%',
            background: 'rgba(124,58,237,0.18)',
            filter: 'blur(80px)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -150,
            left: -80,
            width: 440,
            height: 440,
            borderRadius: '50%',
            background: 'rgba(13,59,56,0.6)',
            filter: 'blur(70px)',
          }}
        />

        {/* ── Main content ─────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            flex: 1,
            padding: '64px 72px',
          }}
        >
          {/* Top: app badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                background: PURPLE,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 28,
              }}
            >
              📘
            </div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: PURPLE_LIGHT,
                letterSpacing: 1,
                textTransform: 'uppercase',
              }}
            >
              MyCases · Rotation Playbook
            </div>
          </div>

          {/* Center: rotation info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div
              style={{
                fontSize: rotationName.length > 30 ? 56 : 68,
                fontWeight: 900,
                color: WHITE,
                lineHeight: 1.1,
                letterSpacing: -1,
                maxWidth: 900,
              }}
            >
              {rotationName}
            </div>

            {institution && (
              <div style={{ fontSize: 32, fontWeight: 600, color: WHITE_DIM }}>
                {institution}
              </div>
            )}
          </div>

          {/* Bottom: stats + footer */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            {/* Section stat pill */}
            {hasSections && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  background: WHITE_FAINT,
                  borderRadius: 50,
                  padding: '12px 28px',
                  border: '1px solid rgba(255,255,255,0.14)',
                }}
              >
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: PURPLE_LIGHT,
                  }}
                />
                <span style={{ fontSize: 26, fontWeight: 700, color: WHITE }}>
                  {counts.filled} of {counts.total} sections completed
                </span>
              </div>
            )}

            {/* Shared-with footer */}
            <div
              style={{
                fontSize: 22,
                fontWeight: 600,
                color: WHITE_DIM,
                marginLeft: 'auto',
              }}
            >
              Shared with MyCases
            </div>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
