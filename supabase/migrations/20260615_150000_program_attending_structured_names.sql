alter table public.program_attendings
  add column if not exists first_name text null,
  add column if not exists last_name text null;

with parsed as (
  select
    id,
    regexp_split_to_array(btrim(full_name), '\s+') as parts
  from public.program_attendings
  where full_name is not null
    and btrim(full_name) <> ''
)
update public.program_attendings as attending
set
  first_name = coalesce(
    nullif(btrim(attending.first_name), ''),
    parsed.parts[1]
  ),
  last_name = coalesce(
    nullif(btrim(attending.last_name), ''),
    parsed.parts[array_length(parsed.parts, 1)]
  )
from parsed
where attending.id = parsed.id
  and (
    attending.first_name is null
    or btrim(attending.first_name) = ''
    or attending.last_name is null
    or btrim(attending.last_name) = ''
  );

create index if not exists program_attendings_program_name_idx
  on public.program_attendings (program_id, is_active, last_name, first_name);

notify pgrst, 'reload schema';
