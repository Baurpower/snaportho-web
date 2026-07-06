-- BroBot case-prep feedback logs (migrated from Vapor/RDS POST /case-prep-log)

CREATE TABLE IF NOT EXISTS public.case_prep_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt TEXT NOT NULL,
  response_json TEXT NOT NULL,
  was_helpful BOOLEAN,
  user_feedback TEXT,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS case_prep_logs_created_at_idx
  ON public.case_prep_logs (created_at DESC);

ALTER TABLE public.case_prep_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY case_prep_logs_service_role_all
  ON public.case_prep_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);