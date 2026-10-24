-- Painel privado do proprietário. Somente a chave de serviço acessa estes dados.
alter table public.orders add column if not exists refunded_cents integer not null default 0 check (refunded_cents >= 0);
alter table public.payments add column if not exists refunded_cents integer not null default 0 check (refunded_cents >= 0);
create table if not exists public.dashboard_expenses (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 120),
  category text not null default 'Sistema',
  amount_cents integer not null check (amount_cents > 0),
  starts_on date not null,
  recurring boolean not null default false,
  ends_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on is null or ends_on >= starts_on)
);
create table if not exists public.dashboard_settings (
  id boolean primary key default true check (id),
  goal_cents integer not null default 1500000 check (goal_cents > 0),
  goal_starts_on date not null default '2026-10-22',
  goal_ends_on date not null default '2026-12-05',
  updated_at timestamptz not null default now(),
  check (goal_ends_on >= goal_starts_on)
);
insert into public.dashboard_settings (id) values (true) on conflict (id) do nothing;
create table if not exists public.dashboard_notes (
  path text primary key,
  title text not null,
  content text not null,
  source_updated_on date,
  imported_at timestamptz not null default now()
);
create table if not exists public.dashboard_ad_links (
  entity_kind text not null check (entity_kind in ('campaign', 'ad')),
  entity_id text not null,
  utm_campaign text not null default '',
  utm_content text not null default '',
  note_paths text[] not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (entity_kind, entity_id)
);
create table if not exists public.dashboard_cache (
  key text primary key,
  payload jsonb not null,
  checked_at timestamptz not null default now()
);
alter table public.dashboard_expenses enable row level security;
alter table public.dashboard_settings enable row level security;
alter table public.dashboard_notes enable row level security;
alter table public.dashboard_ad_links enable row level security;
alter table public.dashboard_cache enable row level security;
