-- Repair PostgreSQL regex portability and make v2 immutability lifecycle-aware.
begin;

alter table public.anki_sync_v2_release_notes
  drop constraint anki_sync_v2_release_notes_order_check;
alter table public.anki_sync_v2_release_notes
  add constraint anki_sync_v2_release_notes_order_check check(
    char_length(ordering_key) between 1 and 500
    and ordering_key ~ '^[A-Za-z0-9._:/-]+$'
  );

create or replace function public.guard_anki_sync_v2_immutable()
returns trigger language plpgsql security definer set search_path=public as $$
declare rid uuid; protected boolean := false;
begin
  if tg_table_name='anki_sync_v2_note_versions' then
    select exists(
      select 1 from public.anki_sync_v2_release_notes rn
      join public.anki_sync_v2_releases r on r.id=rn.release_id
      where rn.note_version_id=old.id and r.status<>'draft'
    ) into protected;
  else
    rid:=case when tg_op='DELETE' then old.release_id else new.release_id end;
    select coalesce(status<>'draft',false) into protected
    from public.anki_sync_v2_releases where id=rid;
  end if;
  if protected then raise exception 'published SnapOrtho sync v2 evidence is immutable'; end if;
  return case when tg_op='DELETE' then old else new end;
end $$;

commit;
