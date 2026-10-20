-- Biblioteca Total 4.0: contas, planos, assinaturas Asaas e auditoria.
-- Incremental e não destrutiva: só cria objetos ausentes. Senhas ficam no Supabase Auth;
-- nenhum dado de cartão é armazenado. Escritas acontecem apenas pelo servidor (service role).

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  is_admin boolean not null default false,
  asaas_customer_id text unique,
  created_at timestamptz not null default now()
);

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text not null default '',
  price_cents integer not null check (price_cents >= 500),
  currency text not null default 'BRL',
  cycle text not null check (cycle in ('MONTHLY', 'YEARLY')),
  features text[] not null default '{}',
  rules text not null default '',
  active boolean not null default false,
  sort integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.checkout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_id uuid not null references public.plans(id),
  status text not null check (status in ('creating', 'created', 'paid', 'canceled', 'expired', 'failed')),
  asaas_checkout_id text unique,
  checkout_url text,
  expires_at timestamptz not null,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Uma única intenção de contratação aberta por usuário (evita checkouts duplicados).
create unique index if not exists checkout_sessions_one_open_per_user
  on public.checkout_sessions (user_id) where status in ('creating', 'created');

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_id uuid references public.plans(id),
  status text not null check (status in ('pending', 'active', 'past_due', 'canceled', 'expired', 'suspended')),
  cycle text not null default 'MONTHLY' check (cycle in ('MONTHLY', 'YEARLY')),
  asaas_subscription_id text unique,
  asaas_customer_id text,
  current_period_end timestamptz,
  next_due_date timestamptz,
  last_payment_at timestamptz,
  canceled_at timestamptz,
  status_changed_at timestamptz,
  reconciled_at timestamptz,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists subscriptions_user_idx on public.subscriptions (user_id, created_at desc);

create table if not exists public.payment_records (
  id uuid primary key default gen_random_uuid(),
  asaas_payment_id text not null unique,
  user_id uuid not null references public.profiles(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id),
  status text not null,
  value_cents integer not null default 0,
  billing_type text,
  due_date date,
  confirmed_at timestamptz,
  invoice_url text,
  created_at timestamptz not null default now()
);

-- O ID do evento do Asaas é a chave primária: reenvios não são reprocessados.
create table if not exists public.asaas_webhook_events (
  id text primary key,
  event text not null,
  payload jsonb not null,
  status text not null default 'received' check (status in ('received', 'processed', 'unlinked', 'failed')),
  note text,
  attempts integer not null default 0,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);
create index if not exists asaas_webhook_events_status_idx on public.asaas_webhook_events (status, received_at desc);

create table if not exists public.access_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null check (char_length(reason) >= 10),
  granted_by uuid not null references public.profiles(id),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  action text not null,
  target_user_id uuid references public.profiles(id),
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- Perfil criado automaticamente no cadastro; `is_admin` só muda por SQL do proprietário.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email) on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS: o navegador só lê o que é seu (e planos ativos); nenhuma escrita direta pelo cliente.
alter table public.profiles enable row level security;
alter table public.plans enable row level security;
alter table public.checkout_sessions enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payment_records enable row level security;
alter table public.asaas_webhook_events enable row level security;
alter table public.access_grants enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select to authenticated using (id = auth.uid());
drop policy if exists "plans_select_active" on public.plans;
create policy "plans_select_active" on public.plans for select to anon, authenticated using (active);
drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own" on public.subscriptions for select to authenticated using (user_id = auth.uid());
drop policy if exists "payments_select_own" on public.payment_records;
create policy "payments_select_own" on public.payment_records for select to authenticated using (user_id = auth.uid());
drop policy if exists "checkouts_select_own" on public.checkout_sessions;
create policy "checkouts_select_own" on public.checkout_sessions for select to authenticated using (user_id = auth.uid());
-- asaas_webhook_events, access_grants e audit_logs: sem políticas = sem acesso pelo cliente.
