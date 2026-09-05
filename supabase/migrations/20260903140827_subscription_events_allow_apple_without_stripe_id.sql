-- Apple events use (provider, provider_event_id), not stripe_event_id.
-- Preserve both unique indexes and all existing rows, RLS and grants.
SET LOCAL lock_timeout = '5s';
ALTER TABLE public.subscription_events
  ALTER COLUMN stripe_event_id DROP NOT NULL;
