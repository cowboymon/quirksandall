-- Quirks & All — initial schema

create extension if not exists "pgcrypto";

-- Owners (auth.users 1:1)
create table owners (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  primary_phone text,
  primary_email text not null,
  backup_contacts jsonb default '[]'::jsonb,
  purchase_status text not null default 'free' check (purchase_status in ('free','paid')),
  purchase_restored_at timestamptz,
  pet_count_limit int not null default 1,
  created_at timestamptz not null default now()
);

-- Pets
create table pets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references owners(id) on delete cascade,
  name text not null,
  species text not null default 'dog',
  breed text,
  dob date not null,
  dob_is_estimated boolean not null default false,
  sex text,
  weight text,
  color_markings text,
  photo_url text,
  microchip_number text,
  status text not null default 'active' check (status in ('active','archived')),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Vet info (1:1 per pet)
create table pet_vet_info (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null unique references pets(id) on delete cascade,
  primary_vet jsonb not null default '{}'::jsonb,   -- {clinic, address, phone}
  emergency_vet jsonb not null default '{}'::jsonb, -- {clinic, phone}
  insurance jsonb not null default '{}'::jsonb,     -- {provider, policy_number, claims_contact}
  updated_at timestamptz not null default now()
);

-- Medical (1:1 per pet)
create table pet_medical (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null unique references pets(id) on delete cascade,
  allergies jsonb not null default '[]'::jsonb,    -- string[], always visible
  conditions jsonb not null default '[]'::jsonb,   -- paid-tier only
  medications jsonb not null default '[]'::jsonb,  -- paid-tier only
  updated_at timestamptz not null default now()
);

-- Routine (1:1 per pet)
create table pet_routine (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null unique references pets(id) on delete cascade,
  feeding jsonb not null default '{}'::jsonb,
  walks text,
  sleep text,
  bathroom_habits text,
  updated_at timestamptz not null default now()
);

-- Behavior (1:1 per pet)
create table pet_behavior (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null unique references pets(id) on delete cascade,
  commands jsonb not null default '[]'::jsonb,
  quirks_triggers jsonb not null default '[]'::jsonb,
  escape_risk jsonb not null default '{"flag":false,"notes":""}'::jsonb,
  scared text,
  no_go text,
  flight_risk text,
  temperament_summary text,
  updated_at timestamptz not null default now()
);

-- Share links
create table share_links (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references pets(id) on delete cascade,
  token text not null unique,
  pin_hash text,                              -- sha256 of the PIN
  mode text not null default 'full' check (mode in ('quick','full')),
  expires_at timestamptz,
  revoked boolean not null default false,
  last_viewed_at timestamptz,
  last_viewed_by text,
  created_at timestamptz not null default now()
);

create index share_links_token_idx on share_links(token);

-- PIN attempts (rate-limiting log)
create table pin_attempts (
  id uuid primary key default gen_random_uuid(),
  link_id uuid not null references share_links(id) on delete cascade,
  ip text not null,
  success boolean not null,
  attempted_at timestamptz not null default now()
);

create index pin_attempts_link_time_idx on pin_attempts(link_id, attempted_at desc);

-- RLS policies

alter table owners enable row level security;
alter table pets enable row level security;
alter table pet_vet_info enable row level security;
alter table pet_medical enable row level security;
alter table pet_routine enable row level security;
alter table pet_behavior enable row level security;
alter table share_links enable row level security;
alter table pin_attempts enable row level security;

-- Owners: only self
create policy "owners_self" on owners for all using (auth.uid() = id);

-- Pets: owner only
create policy "pets_owner" on pets for all using (
  auth.uid() = owner_id
);

-- Pet sub-tables: owner via pet
create policy "pet_vet_info_owner" on pet_vet_info for all using (
  exists (select 1 from pets where pets.id = pet_vet_info.pet_id and pets.owner_id = auth.uid())
);
create policy "pet_medical_owner" on pet_medical for all using (
  exists (select 1 from pets where pets.id = pet_medical.pet_id and pets.owner_id = auth.uid())
);
create policy "pet_routine_owner" on pet_routine for all using (
  exists (select 1 from pets where pets.id = pet_routine.pet_id and pets.owner_id = auth.uid())
);
create policy "pet_behavior_owner" on pet_behavior for all using (
  exists (select 1 from pets where pets.id = pet_behavior.pet_id and pets.owner_id = auth.uid())
);

-- Share links: owner can manage; public can read non-revoked by token (via service key in edge fn)
create policy "share_links_owner" on share_links for all using (
  exists (select 1 from pets where pets.id = share_links.pet_id and pets.owner_id = auth.uid())
);

-- PIN attempts: service key only (no direct client access)
create policy "pin_attempts_deny_anon" on pin_attempts for all using (false);

-- Auto-create owner row on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into owners (id, primary_email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- Auto-update updated_at
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger pets_updated_at before update on pets for each row execute procedure set_updated_at();
create trigger pet_vet_info_updated_at before update on pet_vet_info for each row execute procedure set_updated_at();
create trigger pet_medical_updated_at before update on pet_medical for each row execute procedure set_updated_at();
create trigger pet_routine_updated_at before update on pet_routine for each row execute procedure set_updated_at();
create trigger pet_behavior_updated_at before update on pet_behavior for each row execute procedure set_updated_at();
