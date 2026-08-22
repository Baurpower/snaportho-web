-- Structured Labs / Imaging / PT items are encrypted with the same card-key
-- scope as the freeform sign-out body. Nothing clinical is queryable plaintext.
alter table public.signout_cards
  add column if not exists diagnostics_ct text,
  add column if not exists diagnostics_nonce text,
  add column if not exists diagnostics_key_id text;

alter table public.signout_card_history
  add column if not exists diagnostics_ct text,
  add column if not exists diagnostics_nonce text,
  add column if not exists diagnostics_key_id text;

comment on column public.signout_cards.diagnostics_ct is
  'AES-256-GCM encrypted versioned diagnostics JSON (ciphertext plus auth tag).';
