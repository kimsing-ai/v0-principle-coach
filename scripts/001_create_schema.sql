-- Profiles table (auto-created on signup)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  onboarding_complete boolean default false,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- Principles table
create table if not exists public.principles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  principle_text text not null,
  source_regret text,
  better_version text,
  created_at timestamptz default now()
);

alter table public.principles enable row level security;
create policy "principles_select_own" on public.principles for select using (auth.uid() = user_id);
create policy "principles_insert_own" on public.principles for insert with check (auth.uid() = user_id);
create policy "principles_update_own" on public.principles for update using (auth.uid() = user_id);
create policy "principles_delete_own" on public.principles for delete using (auth.uid() = user_id);

-- Coaching sessions table
create table if not exists public.coaching_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  principle_id uuid references public.principles(id) on delete set null,
  situation text not null,
  wedge_label text not null,
  framework_used text not null,
  coaching_script text not null,
  commitment text,
  feedback smallint, -- 1 = thumbs up, -1 = thumbs down
  follow_up_status text, -- 'yes', 'no', 'partly'
  follow_up_note text,
  followed_up_at timestamptz,
  created_at timestamptz default now()
);

alter table public.coaching_sessions enable row level security;
create policy "sessions_select_own" on public.coaching_sessions for select using (auth.uid() = user_id);
create policy "sessions_insert_own" on public.coaching_sessions for insert with check (auth.uid() = user_id);
create policy "sessions_update_own" on public.coaching_sessions for update using (auth.uid() = user_id);

-- Trigger to auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
