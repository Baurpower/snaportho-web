begin;

alter table public.educational_anki_search_requests
  alter column expires_at set default (now() + interval '5 minutes');

commit;
