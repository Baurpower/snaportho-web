begin;

alter table public.educational_anki_search_requests
  add column query_kind text not null default 'question',
  add column page_sections jsonb not null default '[]'::jsonb;

alter table public.educational_anki_search_requests
  add constraint educational_anki_search_query_kind
    check (query_kind in ('question', 'topic_page')),
  add constraint educational_anki_search_page_sections_safe
    check (
      jsonb_typeof(page_sections) = 'array'
      and jsonb_array_length(page_sections) <= 30
      and public.educational_metadata_is_safe(page_sections)
    ),
  add constraint educational_anki_search_page_sections_match_kind
    check (
      (query_kind = 'question' and jsonb_array_length(page_sections) = 0)
      or (query_kind = 'topic_page' and jsonb_array_length(page_sections) > 0)
    );

comment on column public.educational_anki_search_requests.query_kind is
  'Separates exact Orthobullets question retrieval from structured topic-page retrieval.';
comment on column public.educational_anki_search_requests.page_sections is
  'De-identified section headings and compact medical concepts used for diversified page search.';
comment on table public.educational_anki_search_requests is
  'Short-lived metadata relay between Chrome and a linked Anki desktop. Stores identifiers, compact teaching summaries, section headings, and medical search concepts; never stores raw HTML, answer choices, images, or full page bodies.';

commit;
