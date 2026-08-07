-- Sign-out cards: planned / next OR after an index surgery.
--
-- Supports staged care: patient is post-op (surgery + surgery_date → POD) and
-- also booked for a return trip to the OR (next_surgery + next_surgery_date →
-- countdown / pre-op chip). Both are optional plaintext facets.

begin;

alter table public.signout_cards
  add column if not exists next_surgery text,
  add column if not exists next_surgery_date date;

commit;
