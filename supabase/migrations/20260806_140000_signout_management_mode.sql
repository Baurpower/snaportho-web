-- Sign-out cards: surgery vs non-op management mode.
--
-- Distinguishes operative vs non-operative pathways so the editor can show
-- surgery + date (POD) or a treatment (tx) field without ambiguous inference
-- when surgery text is set but surgery_date is empty.

begin;

alter table public.signout_cards
  add column if not exists management_mode text
  check (management_mode is null or management_mode in ('surgery', 'nonop'));

commit;
