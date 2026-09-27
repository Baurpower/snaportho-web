begin;

alter function public.commit_orthobullets_machine_claim(
  uuid, uuid, text, uuid, uuid, text, text, text, text, jsonb, text, numeric, text
) set search_path = public, extensions;

commit;
