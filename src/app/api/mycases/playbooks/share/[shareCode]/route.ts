import { NextRequest, NextResponse } from 'next/server'
import {
  fetchSharedPlaybook,
  incrementDownloadCount,
} from '@/lib/mycases/playbook-share'

export const runtime = 'nodejs'

// GET /api/mycases/playbooks/share/[shareCode]
// Returns a shared playbook payload for the iOS app to import.
// Public — no auth required. Increments download_count on successful fetch.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ shareCode: string }> }
) {
  const { shareCode } = await params

  if (!shareCode || typeof shareCode !== 'string' || shareCode.length === 0) {
    return NextResponse.json({ error: 'Invalid share code' }, { status: 400 })
  }

  const row = await fetchSharedPlaybook(shareCode)

  if (!row) {
    return NextResponse.json({ error: 'Playbook not found' }, { status: 404 })
  }

  // Check expiry separately (fetchSharedPlaybook already filters is_active=true,
  // but expires_at needs a date comparison the DB already does via RLS policy;
  // double-check here for clarity in the response code)
  if (row.expires_at && new Date(row.expires_at) < new Date()) {
    return NextResponse.json({ error: 'This share link has expired' }, { status: 410 })
  }

  // Increment counter asynchronously — never block the response
  incrementDownloadCount(shareCode)

  return NextResponse.json({
    success: true,
    shareCode: row.share_code,
    title: row.title,
    rotationName: row.rotation_name,
    institution: row.institution,
    payload: row.payload_json,
    createdAt: row.created_at,
    downloadCount: row.download_count,
  })
}
