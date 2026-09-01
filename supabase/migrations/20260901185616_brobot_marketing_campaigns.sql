-- BroBot consent-aware lifecycle marketing foundation.
-- All tables are service-role only. Public unsubscribe endpoints validate a
-- signed token and then write through the server-side admin client.

alter table public.user_profiles
  add column if not exists marketing_consent_at timestamptz,
  add column if not exists marketing_consent_source text,
  add column if not exists marketing_consent_version text,
  add column if not exists marketing_unsubscribed_at timestamptz;

comment on column public.user_profiles.marketing_consent_at is
  'Timestamp of an explicit marketing-email choice. Null for legacy receive_emails values whose provenance is unknown.';
comment on column public.user_profiles.marketing_consent_source is
  'Surface that captured the explicit choice, for example onboarding or workspace_profile.';

create or replace function public.capture_user_profile_marketing_consent()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.receive_emails is true and (tg_op = 'INSERT' or old.receive_emails is distinct from true) then
    new.marketing_consent_at := coalesce(new.marketing_consent_at, now());
    new.marketing_consent_source := coalesce(new.marketing_consent_source, 'profile_form');
    new.marketing_consent_version := coalesce(new.marketing_consent_version, 'v1');
    new.marketing_unsubscribed_at := null;
  elsif new.receive_emails is false and (tg_op = 'INSERT' or old.receive_emails is distinct from false) then
    new.marketing_unsubscribed_at := coalesce(new.marketing_unsubscribed_at, now());
  end if;
  return new;
end
$$;

drop trigger if exists capture_user_profile_marketing_consent on public.user_profiles;
create trigger capture_user_profile_marketing_consent
  before insert or update on public.user_profiles
  for each row execute function public.capture_user_profile_marketing_consent();
revoke all on function public.capture_user_profile_marketing_consent() from public;

alter table public.lifecycle_emails
  add column if not exists campaign_key text,
  add column if not exists campaign_step text,
  add column if not exists topic text,
  add column if not exists template_version text,
  add column if not exists send_status text not null default 'sent',
  add column if not exists resend_email_id text,
  add column if not exists delivered_at timestamptz,
  add column if not exists first_clicked_at timestamptz,
  add column if not exists bounced_at timestamptz,
  add column if not exists complained_at timestamptz,
  add column if not exists suppressed_at timestamptz,
  add column if not exists failure_reason text;

create unique index if not exists lifecycle_emails_campaign_delivery_uidx
  on public.lifecycle_emails (user_id, campaign_key, campaign_step, template_version)
  where campaign_key is not null and campaign_step is not null
    and template_version is not null and send_status <> 'failed';
create unique index if not exists lifecycle_emails_resend_email_uidx
  on public.lifecycle_emails (resend_email_id)
  where resend_email_id is not null;

create table if not exists public.marketing_email_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider_event_id text not null unique,
  event_type text not null,
  resend_email_id text,
  payload jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  processing_error text
);

create index if not exists marketing_email_webhook_resend_idx
  on public.marketing_email_webhook_events (resend_email_id, received_at desc);

alter table public.marketing_email_webhook_events enable row level security;
revoke all on table public.marketing_email_webhook_events from anon, authenticated;

-- Existing lifecycle tables had RLS but explicit revokes make their intended
-- service-role-only boundary unambiguous even if Data API grants change.
revoke all on table public.lifecycle_emails from anon, authenticated;
revoke all on table public.lifecycle_email_optouts from anon, authenticated;
