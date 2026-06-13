
-- =========================================
-- PROFILES (user accounts)
-- =========================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  email text,
  full_name text,
  tokens integer not null default 0,
  vester_password text,
  vester_unlocked boolean not null default false,
  youtube_url text,
  instagram_url text,
  facebook_url text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.profiles to authenticated;
grant all on public.profiles to service_role;
grant select on public.profiles to anon;
alter table public.profiles enable row level security;
create policy "Profiles are viewable by everyone"
  on public.profiles for select using (true);
create policy "Users can insert their own profile"
  on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update their own profile"
  on public.profiles for update using (auth.uid() = id);

-- =========================================
-- SERVICE LISTINGS (generic for all marketplace pages)
-- =========================================
-- module: dfunctions | academy | worker | model | hall | bpartner
create table public.listings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  module text not null,
  category text not null,
  business_name text,
  owner_name text not null,
  age integer,
  city text,
  address text,
  experience text,
  whatsapp text not null,
  fee numeric,
  subjects text[],
  images text[] default '{}',
  plan text not null default '7d',
  active boolean not null default true,
  starts_at timestamptz not null default now(),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.listings to authenticated;
grant all on public.listings to service_role;
grant select on public.listings to anon;
alter table public.listings enable row level security;
create policy "Listings are viewable by everyone"
  on public.listings for select using (true);
create policy "Users create own listings"
  on public.listings for insert with check (auth.uid() = user_id);
create policy "Users update own listings"
  on public.listings for update using (auth.uid() = user_id);
create policy "Users delete own listings"
  on public.listings for delete using (auth.uid() = user_id);
create index listings_module_category_idx on public.listings(module, category);
create index listings_active_idx on public.listings(active, expires_at);

-- =========================================
-- RATINGS
-- =========================================
create table public.ratings (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  stars integer not null check (stars between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique(listing_id, user_id)
);
grant select, insert, update, delete on public.ratings to authenticated;
grant all on public.ratings to service_role;
grant select on public.ratings to anon;
alter table public.ratings enable row level security;
create policy "Ratings viewable by everyone" on public.ratings for select using (true);
create policy "Authenticated users add ratings" on public.ratings for insert with check (auth.uid() = user_id);
create policy "Users update own ratings" on public.ratings for update using (auth.uid() = user_id);
create policy "Users delete own ratings" on public.ratings for delete using (auth.uid() = user_id);

-- =========================================
-- FUND REQUESTS (Add Funds via screenshot)
-- =========================================
create table public.fund_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric not null check (amount > 0),
  screenshot_url text not null,
  status text not null default 'pending', -- pending | approved | rejected
  note text,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.fund_requests to authenticated;
grant all on public.fund_requests to service_role;
alter table public.fund_requests enable row level security;
create policy "Users see own fund requests"
  on public.fund_requests for select using (auth.uid() = user_id);
create policy "Users create own fund requests"
  on public.fund_requests for insert with check (auth.uid() = user_id);

-- =========================================
-- USER COUNTER (visitors)
-- =========================================
create table public.site_stats (
  key text primary key,
  value bigint not null default 0
);
insert into public.site_stats(key, value) values ('visitors', 0) on conflict do nothing;
grant select on public.site_stats to anon, authenticated;
grant all on public.site_stats to service_role;
alter table public.site_stats enable row level security;
create policy "Stats viewable by everyone" on public.site_stats for select using (true);

create or replace function public.increment_visitor()
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare v bigint;
begin
  update public.site_stats set value = value + 1 where key = 'visitors' returning value into v;
  return v;
end;
$$;
grant execute on function public.increment_visitor() to anon, authenticated;

-- =========================================
-- updated_at trigger
-- =========================================
create or replace function public.update_updated_at_column()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.update_updated_at_column();
create trigger trg_listings_updated before update on public.listings
  for each row execute function public.update_updated_at_column();

-- =========================================
-- Auto-create profile on signup
-- =========================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, email, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
