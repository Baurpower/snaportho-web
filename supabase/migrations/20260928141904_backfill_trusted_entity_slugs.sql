-- Repair three pre-existing trusted entities created by the Orthobullets
-- machine-consensus path before trusted-entity slug enforcement existed.
-- IDs and candidate slugs were verified against production before apply.

do $$
declare
  collision_count integer;
begin
  select count(*) into collision_count
  from public.canonical_entities
  where slug in (
    'perineurium',
    'groin-flap',
    'latissimus-dorsi-myocutaneous-flap'
  )
    and id not in (
      'ef7d1c34-9b15-46ef-b8f8-11632d28e969'::uuid,
      '4e1668e6-5870-43e9-a817-35a5d12c9251'::uuid,
      'd7e304ee-6931-4815-b8a5-f88b73998328'::uuid
    );

  if collision_count > 0 then
    raise exception 'trusted entity slug repair found % collisions', collision_count;
  end if;
end;
$$;

update public.canonical_entities
set slug = case id
  when 'ef7d1c34-9b15-46ef-b8f8-11632d28e969'::uuid then 'perineurium'
  when '4e1668e6-5870-43e9-a817-35a5d12c9251'::uuid then 'groin-flap'
  when 'd7e304ee-6931-4815-b8a5-f88b73998328'::uuid then 'latissimus-dorsi-myocutaneous-flap'
end,
updated_at = now()
where id in (
  'ef7d1c34-9b15-46ef-b8f8-11632d28e969'::uuid,
  '4e1668e6-5870-43e9-a817-35a5d12c9251'::uuid,
  'd7e304ee-6931-4815-b8a5-f88b73998328'::uuid
)
  and (slug is null or btrim(slug) = '');

do $$
begin
  if exists (
    select 1
    from public.canonical_entities
    where id in (
      'ef7d1c34-9b15-46ef-b8f8-11632d28e969'::uuid,
      '4e1668e6-5870-43e9-a817-35a5d12c9251'::uuid,
      'd7e304ee-6931-4815-b8a5-f88b73998328'::uuid
    )
      and (slug is null or btrim(slug) = '')
  ) then
    raise exception 'trusted entity slug repair incomplete';
  end if;
end;
$$;
