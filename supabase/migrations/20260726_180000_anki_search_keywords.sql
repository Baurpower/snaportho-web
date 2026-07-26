begin;

alter table public.educational_anki_search_requests
  add column search_keywords jsonb not null default '[]'::jsonb;

alter table public.educational_anki_search_requests
  add constraint educational_anki_search_keywords_safe check (
    jsonb_typeof(search_keywords) = 'array'
    and jsonb_array_length(search_keywords) <= 24
    and public.educational_metadata_is_safe(search_keywords)
  );

comment on column public.educational_anki_search_requests.search_keywords is
  'Short de-identified medical vocabulary extracted from structured tutoring fields; no question or explanation prose.';

commit;
