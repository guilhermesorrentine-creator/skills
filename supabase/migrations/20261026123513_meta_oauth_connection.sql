-- Token OAuth da Meta: cifrado pela aplicação e acessível somente pelo backend com service_role.
create table if not exists public.dashboard_connections (
  provider text primary key check (provider in ('meta')),
  token_ciphertext text not null,
  external_account_id text,
  display_name text,
  scopes text[] not null default '{}',
  token_expires_at timestamptz,
  connected_by uuid references auth.users(id) on delete set null,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.dashboard_connections enable row level security;
revoke all on table public.dashboard_connections from public, anon, authenticated;
grant select, insert, update, delete on table public.dashboard_connections to service_role;
