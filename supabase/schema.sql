-- TripTalk database schema
-- Run this in the Supabase SQL Editor (Project -> SQL Editor -> New query)

create extension if not exists pgcrypto;

-- ── Core trip info ──────────────────────────────────────────────
-- RLS is enabled with NO policies below, so this table has zero direct
-- API access (read or write) for anon/authenticated roles. The only way
-- in is through the SECURITY DEFINER functions further down, which run
-- with elevated privileges and decide exactly what to expose.
create table trips (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  address text not null,
  lat double precision,
  lng double precision,
  start_date date not null,
  end_date date not null,
  password_hash text not null,
  created_at timestamptz not null default now()
);
alter table trips enable row level security;

-- ── Access grants ────────────────────────────────────────────────
-- One row per (trip, visitor) once they've entered the correct password.
-- Only verify_trip_password() can insert into this table (SECURITY
-- DEFINER bypasses RLS for its own writes) — clients can't grant
-- themselves access.
create table trip_access (
  trip_id uuid not null references trips(id) on delete cascade,
  user_id uuid not null,
  granted_at timestamptz not null default now(),
  primary key (trip_id, user_id)
);
alter table trip_access enable row level security;

create policy "read own access" on trip_access
  for select using (auth.uid() = user_id);

-- ── Day plan content (Kids Activities, Adult Stuff, etc.) ──────────
create table day_plan_sections (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  title text not null,
  content text not null default '',
  position int not null default 0,
  updated_at timestamptz not null default now()
);
alter table day_plan_sections enable row level security;

create policy "read if unlocked" on day_plan_sections
  for select using (
    exists (
      select 1 from trip_access
      where trip_access.trip_id = day_plan_sections.trip_id
        and trip_access.user_id = auth.uid()
    )
  );
create policy "write if unlocked" on day_plan_sections
  for insert with check (
    exists (
      select 1 from trip_access
      where trip_access.trip_id = day_plan_sections.trip_id
        and trip_access.user_id = auth.uid()
    )
  );
create policy "update if unlocked" on day_plan_sections
  for update using (
    exists (
      select 1 from trip_access
      where trip_access.trip_id = day_plan_sections.trip_id
        and trip_access.user_id = auth.uid()
    )
  );

-- ── Meal sign-ups ───────────────────────────────────────────────
create table meal_signups (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  day_date date not null,
  meal_type text not null check (meal_type in ('breakfast','lunch','dinner','dessert','snacks')),
  dish text not null,
  person_name text not null,
  created_at timestamptz not null default now()
);
alter table meal_signups enable row level security;

create policy "read if unlocked" on meal_signups
  for select using (
    exists (
      select 1 from trip_access
      where trip_access.trip_id = meal_signups.trip_id
        and trip_access.user_id = auth.uid()
    )
  );
create policy "write if unlocked" on meal_signups
  for insert with check (
    exists (
      select 1 from trip_access
      where trip_access.trip_id = meal_signups.trip_id
        and trip_access.user_id = auth.uid()
    )
  );
create policy "delete if unlocked" on meal_signups
  for delete using (
    exists (
      select 1 from trip_access
      where trip_access.trip_id = meal_signups.trip_id
        and trip_access.user_id = auth.uid()
    )
  );

-- trips gets a read policy too, but only for visitors who've already
-- unlocked it — still no insert/update/delete policy, so the core
-- fields can never be edited through the API, ever.
create policy "read if unlocked" on trips
  for select using (
    exists (
      select 1 from trip_access
      where trip_access.trip_id = trips.id
        and trip_access.user_id = auth.uid()
    )
  );

create index on meal_signups (trip_id, day_date, meal_type);
create index on day_plan_sections (trip_id, position);

grant select on trips to authenticated;
grant select, insert, update on day_plan_sections to authenticated;
grant select, insert, delete on meal_signups to authenticated;

-- ── The password gate itself ───────────────────────────────────
-- Client calls this after supabase.auth.signInAnonymously(). Checks the
-- password against the stored hash and, if correct, grants this
-- visitor's anonymous ID access to the trip.
create or replace function verify_trip_password(p_slug text, p_password text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trip trips%rowtype;
begin
  select * into v_trip from trips where slug = p_slug;
  if v_trip is null then
    return false;
  end if;

  if v_trip.password_hash = crypt(p_password, v_trip.password_hash) then
    insert into trip_access (trip_id, user_id)
    values (v_trip.id, auth.uid())
    on conflict (trip_id, user_id) do nothing;
    return true;
  end if;

  return false;
end;
$$;

grant execute on function verify_trip_password(text, text) to authenticated;

-- ── Creating a new trip (the reusable-template part) ───────────────
-- Hashes the password server-side so it's never sent back out in
-- plain text once stored.
create or replace function create_trip(
  p_slug text,
  p_name text,
  p_address text,
  p_lat double precision,
  p_lng double precision,
  p_start_date date,
  p_end_date date,
  p_password text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into trips (slug, name, address, lat, lng, start_date, end_date, password_hash)
  values (p_slug, p_name, p_address, p_lat, p_lng, p_start_date, p_end_date, crypt(p_password, gen_salt('bf')))
  returning id into v_id;

  insert into trip_access (trip_id, user_id) values (v_id, auth.uid());

  return v_id;
end;
$$;

grant execute on function create_trip to authenticated;
