import { NextRequest, NextResponse } from 'next/server'
import {
  createSharedPlaybook,
  validatePlaybookPayload,
  verifyBearerToken,
} from '@/lib/mycases/playbook-share'

export const runtime = 'nodejs'

// POST /api/mycases/playbooks/share
// Creates a share link for a MyCases Rotation Playbook.
// Auth: optional Bearer token (sets created_by if valid; allows anonymous otherwise).
export async function POST(req: NextRequest) {
  // ── Auth (optional) ────────────────────────────────────────────────────────
  let userId: string | null = null
  let userEmail: string | null = null

  const authHeader = req.headers.get('authorization') ?? ''
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null

  if (bearerToken) {
    const verified = await verifyBearerToken(bearerToken)
    if (verified) {
      userId = verified.userId
      userEmail = verified.email
    }
    // Invalid token → allow anonymous (don't reject; the payload itself has no PII)
  }

  // ── Parse body ─────────────────────────────────────────────────────────────
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { title, rotationName, institution, payload } = body as {
    title?: unknown
    rotationName?: unknown
    institution?: unknown
    payload?: unknown
  }

  // ── Validate ───────────────────────────────────────────────────────────────
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 })
  }
  if (!rotationName || typeof rotationName !== 'string' || rotationName.trim().length === 0) {
    return NextResponse.json({ error: 'rotationName is required' }, { status: 400 })
  }

  const payloadError = validatePlaybookPayload(payload)
  if (payloadError) {
    return NextResponse.json({ error: payloadError }, { status: 400 })
  }

  // ── Create share ───────────────────────────────────────────────────────────
  try {
    const result = await createSharedPlaybook({
      title: title.trim(),
      rotationName: rotationName.trim(),
      institution: typeof institution === 'string' ? institution.trim() || null : null,
      payload: payload as Record<string, unknown>,
      userId,
      userEmail,
    })

    return NextResponse.json({
      success: true,
      shareCode: result.shareCode,
      shareUrl: result.shareUrl,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create share link'
    console.error('[POST /api/mycases/playbooks/share]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
