-- Volt Burn Fit: per-user data with Row Level Security.
-- Run in Supabase Dashboard -> SQL Editor (or `supabase db push`).

create table if not exists public.profiles (
  user_id    uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  settings   jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.workout_sets (
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id          text not null,
  date        date not null,
  exercise_id text not null,
  weight_kg   numeric not null check (weight_kg >= 0 and weight_kg <= 1000),
  reps        integer not null check (reps between 1 and 1000),
  tags        text[] not null default '{}',
  note        text check (char_length(note) <= 500),
  created_at  bigint not null,
  primary key (user_id, id)
);

create table if not exists public.meal_logs (
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id         text not null,
  date       date not null,
  name       text not null check (char_length(name) <= 200),
  kcal       numeric not null check (kcal >= 0 and kcal <= 10000),
  protein_g  numeric not null check (protein_g >= 0 and protein_g <= 1000),
  carb_g     numeric not null check (carb_g >= 0 and carb_g <= 2000),
  fat_g      numeric not null check (fat_g >= 0 and fat_g <= 1000),
  created_at bigint not null,
  primary key (user_id, id)
);

create table if not exists public.weight_logs (
  user_id   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date      date not null,
  weight_kg numeric not null check (weight_kg between 20 and 500),
  source    text check (source in ('profile')),
  primary key (user_id, date)
);

create table if not exists public.day_records (
  user_id  uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date     date not null,
  is_rest  boolean not null default false,
  water_ml integer not null default 0 check (water_ml between 0 and 20000),
  primary key (user_id, date)
);

create index if not exists workout_sets_user_date on public.workout_sets (user_id, date);
create index if not exists meal_logs_user_date on public.meal_logs (user_id, date);

-- Row Level Security: a user can only ever see and change their own rows.
alter table public.profiles     enable row level security;
alter table public.workout_sets enable row level security;
alter table public.meal_logs    enable row level security;
alter table public.weight_logs  enable row level security;
alter table public.day_records  enable row level security;

do $$
declare t text;
begin
  foreach t in array array['profiles','workout_sets','meal_logs','weight_logs','day_records'] loop
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format(
      'create policy "own rows" on public.%I for all to authenticated
         using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;

-- The anon role gets nothing: sync requires a signed-in user.
revoke all on public.profiles, public.workout_sets, public.meal_logs,
              public.weight_logs, public.day_records from anon;
grant select, insert, update, delete on public.profiles, public.workout_sets,
              public.meal_logs, public.weight_logs, public.day_records to authenticated;
