-- ============================================================================
-- Shared Playbooks for MyCases
-- Enables link-based sharing of MyCases Rotation Playbooks.
-- Playbooks must NOT contain patient information (acknowledged by the sender).
-- Public read is intentional — share codes are unguessable (base62, 8 chars).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.shared_playbooks (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  share_code      text        UNIQUE NOT NULL,
  title           text        NOT NULL,
  rotation_name   text        NOT NULL,
  institution     text,
  payload_json    jsonb       NOT NULL,
  created_by      uuid,       -- Supabase auth.users.id; NULL for anonymous shares
  created_by_email text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  download_count  integer     NOT NULL DEFAULT 0,
  is_active       boolean     NOT NULL DEFAULT true,
  expires_at      timestamptz            -- NULL = never expires
);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS shared_playbooks_share_code_idx
  ON public.shared_playbooks (share_code);

CREATE INDEX IF NOT EXISTS shared_playbooks_created_by_idx
  ON public.shared_playbooks (created_by);

CREATE INDEX IF NOT EXISTS shared_playbooks_is_active_idx
  ON public.shared_playbooks (is_active);

-- RLS
ALTER TABLE public.shared_playbooks ENABLE ROW LEVEL SECURITY;

-- Anyone can read active, non-expired shares by share_code (link-based discovery)
CREATE POLICY "public_read_active_shares"
  ON public.shared_playbooks
  FOR SELECT
  USING (
    is_active = true
    AND (expires_at IS NULL OR expires_at > now())
  );

-- Authenticated users can insert their own shares
CREATE POLICY "authenticated_insert"
  ON public.shared_playbooks
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by OR created_by IS NULL);

-- Creators can deactivate or delete their own shares
CREATE POLICY "creator_update"
  ON public.shared_playbooks
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "creator_delete"
  ON public.shared_playbooks
  FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- Service role bypasses RLS (used by backend API routes for both INSERT and SELECT)
-- No policy needed — service_role is exempt from RLS by default.

-- Atomic download counter increment (called from the backend API)
CREATE OR REPLACE FUNCTION public.increment_shared_playbook_downloads(p_code text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE public.shared_playbooks
  SET download_count = download_count + 1
  WHERE share_code = p_code;
$$;

COMMENT ON TABLE public.shared_playbooks IS
  'MyCases Rotation Playbook share links. Share codes are unguessable (base62, 8 chars). '
  'Payloads must not contain PHI — acknowledged by sender at share time. '
  'Route-level validation enforces size and schema caps in addition to RLS.';
