-- Sign-out cards: drop legacy manual POD counter.
--
-- POD is derived from surgery_date in application code (see pod.ts). The manual
-- pod_number column and nightly rollover path are obsolete.

begin;

alter table public.signout_cards
  drop column if exists pod_number;

commit;
