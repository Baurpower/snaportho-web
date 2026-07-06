-- Fundraising donations (migrated from Vapor/RDS stripe-webhook + GET /donations)

CREATE TABLE IF NOT EXISTS public.donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  billing_name TEXT,
  display_name TEXT,
  anonymous BOOLEAN NOT NULL DEFAULT false,
  email TEXT NOT NULL,
  message TEXT,
  amount INTEGER NOT NULL CHECK (amount > 0),
  stripe_id TEXT NOT NULL,
  stripe_event_id TEXT,
  status TEXT NOT NULL DEFAULT 'paid',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT donations_stripe_id_key UNIQUE (stripe_id),
  CONSTRAINT donations_stripe_event_id_key UNIQUE (stripe_event_id)
);

CREATE INDEX IF NOT EXISTS donations_status_created_at_idx
  ON public.donations (status, created_at DESC);

ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

-- Service role writes via Next.js webhook; public reads via API route using service role.
CREATE POLICY donations_service_role_all
  ON public.donations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);