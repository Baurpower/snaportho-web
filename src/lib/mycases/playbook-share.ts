import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

// ─── Supabase service-role client (server-only) ───────────────────────────────
// Uses service_role key to bypass RLS. This module is server-only.
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SharedPlaybookRow {
  id: string
  share_code: string
  title: string
  rotation_name: string
  institution: string | null
  payload_json: Record<string, unknown>
  created_by: string | null
  created_by_email: string | null
  created_at: string
  updated_at: string
  download_count: number
  is_active: boolean
  expires_at: string | null
}

export interface CreateShareInput {
  title: string
  rotationName: string
  institution?: string | null
  payload: Record<string, unknown>
  userId?: string | null
  userEmail?: string | null
}

export interface CreateShareResult {
  shareCode: string
  shareUrl: string
}

// ─── Share code generation ────────────────────────────────────────────────────

const BASE62_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'

function generateShareCode(length = 8): string {
  const bytes = crypto.randomBytes(length)
  return Array.from(bytes)
    .map((b) => BASE62_CHARS[b % 62])
    .join('')
}

function buildShareUrl(shareCode: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://snap-ortho.com'
  return `${base}/mycases/playbook/${shareCode}`
}

// ─── Payload validation ───────────────────────────────────────────────────────

const MAX_PAYLOAD_BYTES = 500_000          // 500 KB total
const MAX_SECTION_CONTENT_BYTES = 200_000  // mirrors iOS cap

export function validatePlaybookPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return 'payload must be an object'

  const p = payload as Record<string, unknown>

  if (typeof p.schemaVersion !== 'number') return 'payload.schemaVersion must be a number'
  if (!p.playbook || typeof p.playbook !== 'object') return 'payload.playbook is required'

  const playbook = p.playbook as Record<string, unknown>
  const sections = playbook.sections

  if (sections != null) {
    if (!Array.isArray(sections)) return 'payload.playbook.sections must be an array'
    for (const section of sections) {
      const s = section as Record<string, unknown>
      if (typeof s.content === 'string' && s.content.length > MAX_SECTION_CONTENT_BYTES) {
        return `A section exceeds the maximum content length (${MAX_SECTION_CONTENT_BYTES} chars)`
      }
    }
  }

  const serialized = JSON.stringify(payload)
  if (serialized.length > MAX_PAYLOAD_BYTES) {
    return `Payload exceeds maximum size (${MAX_PAYLOAD_BYTES} bytes)`
  }

  return null
}

// ─── Verify a Bearer JWT using the service client ────────────────────────────

export async function verifyBearerToken(
  token: string
): Promise<{ userId: string; email: string | null } | null> {
  try {
    const supabase = getServiceClient()
    const { data, error } = await supabase.auth.getUser(token)
    if (error || !data.user) return null
    return { userId: data.user.id, email: data.user.email ?? null }
  } catch {
    return null
  }
}

// ─── DB operations ───────────────────────────────────────────────────────────

export async function createSharedPlaybook(
  input: CreateShareInput
): Promise<CreateShareResult> {
  const supabase = getServiceClient()

  // Retry on rare collision (collision probability ~1 in 218 trillion for 8 chars)
  for (let attempt = 0; attempt < 3; attempt++) {
    const shareCode = generateShareCode()

    const { error } = await supabase.from('shared_playbooks').insert({
      share_code: shareCode,
      title: input.title,
      rotation_name: input.rotationName,
      institution: input.institution ?? null,
      payload_json: input.payload,
      created_by: input.userId ?? null,
      created_by_email: input.userEmail ?? null,
    })

    if (!error) {
      return { shareCode, shareUrl: buildShareUrl(shareCode) }
    }

    // 23505 = unique_violation; retry with a different code
    if ((error as { code?: string }).code !== '23505') {
      throw new Error(`Database error: ${error.message}`)
    }
  }

  throw new Error('Could not generate a unique share code. Please try again.')
}

export async function fetchSharedPlaybook(
  shareCode: string
): Promise<SharedPlaybookRow | null> {
  const supabase = getServiceClient()

  const { data, error } = await supabase
    .from('shared_playbooks')
    .select('*')
    .eq('share_code', shareCode)
    .eq('is_active', true)
    .single()

  if (error || !data) return null
  return data as SharedPlaybookRow
}

export async function incrementDownloadCount(shareCode: string): Promise<void> {
  // Fire-and-forget — never fail the caller over a counter update.
  const supabase = getServiceClient()
  void supabase
    .rpc('increment_shared_playbook_downloads', { p_code: shareCode })
}
