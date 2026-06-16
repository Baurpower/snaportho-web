-- ============================================================================
-- BroBot Phase 1: Conversation Persistence and Analytics
-- Stores authenticated-user conversations, messages, message tags, and
-- lightweight usage analytics for later personalization and weakness tracking.
-- ============================================================================

create table if not exists public.brobot_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text null,
  detected_context jsonb null,
  last_mode text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists brobot_conversations_id_user_id_idx
  on public.brobot_conversations (id, user_id);

create index if not exists brobot_conversations_user_updated_at_idx
  on public.brobot_conversations (user_id, updated_at desc);

create table if not exists public.brobot_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.brobot_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null,
  content text not null,
  structured_json jsonb null,
  mode text null,
  response_depth text null,
  created_at timestamptz not null default now(),
  constraint brobot_messages_role_check
    check (role in ('user', 'assistant', 'system')),
  constraint brobot_messages_conversation_owner_fkey
    foreign key (conversation_id, user_id)
    references public.brobot_conversations (id, user_id)
    on delete cascade
);

create unique index if not exists brobot_messages_id_user_id_idx
  on public.brobot_messages (id, user_id);

create index if not exists brobot_messages_conversation_created_at_idx
  on public.brobot_messages (conversation_id, created_at);

create index if not exists brobot_messages_user_created_at_idx
  on public.brobot_messages (user_id, created_at desc);

create table if not exists public.brobot_message_tags (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.brobot_messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  topic text null,
  subtopic text null,
  body_region text null,
  procedure text null,
  concept_type text null,
  mode text null,
  confidence numeric null,
  created_at timestamptz not null default now(),
  constraint brobot_message_tags_message_owner_fkey
    foreign key (message_id, user_id)
    references public.brobot_messages (id, user_id)
    on delete cascade
);

create index if not exists brobot_message_tags_user_topic_idx
  on public.brobot_message_tags (user_id, topic);

-- brobot_usage_events already exists from the BroBot AI usage/quota migration.
-- Keep its legacy quota/audit columns intact and add the conversation analytics
-- columns needed by the chat persistence layer.
create table if not exists public.brobot_usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid null references public.brobot_conversations(id) on delete set null,
  message_id uuid null references public.brobot_messages(id) on delete set null,
  event_type text not null,
  metadata jsonb null,
  created_at timestamptz not null default now()
);

alter table public.brobot_usage_events
  add column if not exists conversation_id uuid null,
  add column if not exists message_id uuid null,
  add column if not exists event_type text null,
  add column if not exists metadata jsonb null,
  add column if not exists created_at timestamptz null;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'brobot_usage_events'
      and column_name = 'outcome'
  ) then
    alter table public.brobot_usage_events
      alter column outcome set default 'brobot_event';

    update public.brobot_usage_events
    set event_type = coalesce(event_type, outcome, 'brobot_event')
    where event_type is null;
  else
    update public.brobot_usage_events
    set event_type = coalesce(event_type, 'brobot_event')
    where event_type is null;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'brobot_usage_events'
      and column_name = 'occurred_at'
  ) then
    update public.brobot_usage_events
    set created_at = coalesce(created_at, occurred_at, now())
    where created_at is null;
  else
    update public.brobot_usage_events
    set created_at = coalesce(created_at, now())
    where created_at is null;
  end if;
end
$$;

alter table public.brobot_usage_events
  alter column event_type set not null,
  alter column event_type set default 'brobot_event',
  alter column created_at set not null,
  alter column created_at set default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.brobot_usage_events'::regclass
      and conname = 'brobot_usage_events_conversation_id_fkey'
  ) then
    alter table public.brobot_usage_events
      add constraint brobot_usage_events_conversation_id_fkey
      foreign key (conversation_id)
      references public.brobot_conversations(id)
      on delete set null
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.brobot_usage_events'::regclass
      and conname = 'brobot_usage_events_message_id_fkey'
  ) then
    alter table public.brobot_usage_events
      add constraint brobot_usage_events_message_id_fkey
      foreign key (message_id)
      references public.brobot_messages(id)
      on delete set null
      not valid;
  end if;
end
$$;

alter table public.brobot_usage_events
  validate constraint brobot_usage_events_conversation_id_fkey;
alter table public.brobot_usage_events
  validate constraint brobot_usage_events_message_id_fkey;

create index if not exists brobot_usage_events_user_created_at_idx
  on public.brobot_usage_events (user_id, created_at desc);

create table if not exists public.brobot_learning_fingerprints (
  user_id uuid primary key references auth.users(id) on delete cascade,
  favorite_branches jsonb not null default '[]'::jsonb,
  frequent_branches jsonb not null default '[]'::jsonb,
  weakness_branches jsonb not null default '[]'::jsonb,
  preferred_modes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_brobot_conversations_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_brobot_conversations_updated_at
  on public.brobot_conversations;

create trigger set_brobot_conversations_updated_at
  before update on public.brobot_conversations
  for each row
  execute function public.set_brobot_conversations_updated_at();

create or replace function public.set_brobot_learning_fingerprints_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_brobot_learning_fingerprints_updated_at
  on public.brobot_learning_fingerprints;

create trigger set_brobot_learning_fingerprints_updated_at
  before update on public.brobot_learning_fingerprints
  for each row
  execute function public.set_brobot_learning_fingerprints_updated_at();

alter table public.brobot_conversations enable row level security;
alter table public.brobot_messages enable row level security;
alter table public.brobot_message_tags enable row level security;
alter table public.brobot_usage_events enable row level security;
alter table public.brobot_learning_fingerprints enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'brobot_conversations'
      and policyname = 'Users can view their own BroBot conversations'
  ) then
    create policy "Users can view their own BroBot conversations"
      on public.brobot_conversations
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'brobot_conversations'
      and policyname = 'Users can insert their own BroBot conversations'
  ) then
    create policy "Users can insert their own BroBot conversations"
      on public.brobot_conversations
      for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'brobot_conversations'
      and policyname = 'Users can update their own BroBot conversations'
  ) then
    create policy "Users can update their own BroBot conversations"
      on public.brobot_conversations
      for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'brobot_conversations'
      and policyname = 'Users can delete their own BroBot conversations'
  ) then
    create policy "Users can delete their own BroBot conversations"
      on public.brobot_conversations
      for delete
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'brobot_messages'
      and policyname = 'Users can view their own BroBot messages'
  ) then
    create policy "Users can view their own BroBot messages"
      on public.brobot_messages
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'brobot_messages'
      and policyname = 'Users can insert their own BroBot messages'
  ) then
    create policy "Users can insert their own BroBot messages"
      on public.brobot_messages
      for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'brobot_message_tags'
      and policyname = 'Users can view their own BroBot message tags'
  ) then
    create policy "Users can view their own BroBot message tags"
      on public.brobot_message_tags
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'brobot_message_tags'
      and policyname = 'Users can insert their own BroBot message tags'
  ) then
    create policy "Users can insert their own BroBot message tags"
      on public.brobot_message_tags
      for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'brobot_usage_events'
      and policyname = 'Users can view their own BroBot usage events'
  ) then
    create policy "Users can view their own BroBot usage events"
      on public.brobot_usage_events
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'brobot_usage_events'
      and policyname = 'Users can insert their own BroBot usage events'
  ) then
    create policy "Users can insert their own BroBot usage events"
      on public.brobot_usage_events
      for insert
      with check (
        auth.uid() = user_id
        and (
          conversation_id is null
          or exists (
            select 1
            from public.brobot_conversations conversations
            where conversations.id = conversation_id
              and conversations.user_id = auth.uid()
          )
        )
        and (
          message_id is null
          or exists (
            select 1
            from public.brobot_messages messages
            where messages.id = message_id
              and messages.user_id = auth.uid()
          )
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'brobot_learning_fingerprints'
      and policyname = 'Users can view their own BroBot learning fingerprint'
  ) then
    create policy "Users can view their own BroBot learning fingerprint"
      on public.brobot_learning_fingerprints
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'brobot_learning_fingerprints'
      and policyname = 'Users can insert their own BroBot learning fingerprint'
  ) then
    create policy "Users can insert their own BroBot learning fingerprint"
      on public.brobot_learning_fingerprints
      for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'brobot_learning_fingerprints'
      and policyname = 'Users can update their own BroBot learning fingerprint'
  ) then
    create policy "Users can update their own BroBot learning fingerprint"
      on public.brobot_learning_fingerprints
      for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end
$$;

comment on table public.brobot_conversations is
  'BroBot chat conversation headers owned by authenticated users.';
comment on table public.brobot_messages is
  'BroBot chat messages for persisted conversation history.';
comment on table public.brobot_message_tags is
  'Lightweight per-message classification tags for later personalization and weakness tracking.';
comment on table public.brobot_usage_events is
  'BroBot usage and analytics events. Includes legacy quota/audit columns plus conversation/message analytics columns.';
comment on table public.brobot_learning_fingerprints is
  'Groundwork table for BroBot branch and mode personalization. Stores aggregate JSONB signals; no scoring algorithm in Phase 2.';

notify pgrst, 'reload schema';
