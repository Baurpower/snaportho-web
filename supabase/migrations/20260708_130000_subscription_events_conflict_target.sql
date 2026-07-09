-- PostgREST's `on_conflict=provider,provider_event_id` cannot infer the
-- previous partial unique index. Use a full unique index so webhook retries
-- can upsert their audit record idempotently.
drop index if exists public.subscription_events_provider_event_uidx;

create unique index if not exists subscription_events_provider_event_uidx
  on public.subscription_events (provider, provider_event_id);
