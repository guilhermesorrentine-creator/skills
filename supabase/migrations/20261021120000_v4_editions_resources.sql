-- Biblioteca Total 4.0: edições comerciais, licenças vitalícias, pedidos avulsos (Asaas),
-- recursos unificados, caminhos por objetivo, coleções, favoritos e histórico.
-- Incremental e não destrutiva. As tabelas de assinatura da migração anterior permanecem,
-- sem uso pelo código (o modelo recorrente foi descartado).

-- Edições comerciais: o preço vale para novas compras; pedidos guardam o preço praticado.
create table if not exists public.commercial_editions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  rank integer not null unique check (rank >= 1),
  price_cents integer not null check (price_cents >= 500),
  description text not null default '',
  features text[] not null default '{}',
  on_sale boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  edition_id uuid not null references public.commercial_editions(id),
  kind text not null check (kind in ('purchase', 'upgrade')),
  list_price_cents integer not null,
  credit_cents integer not null default 0,
  amount_cents integer not null check (amount_cents >= 0),
  status text not null check (status in ('creating', 'pending', 'paid', 'canceled', 'expired', 'failed', 'refunded')),
  asaas_checkout_id text unique,
  asaas_customer_id text,
  checkout_url text,
  expires_at timestamptz,
  paid_at timestamptz,
  refunded_at timestamptz,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Um único pedido em aberto por usuário: cliques repetidos não geram cobranças duplicadas.
create unique index if not exists orders_one_open_per_user on public.orders (user_id) where status in ('creating', 'pending');
create index if not exists orders_user_idx on public.orders (user_id, created_at desc);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  asaas_payment_id text not null unique,
  order_id uuid references public.orders(id),
  user_id uuid references public.profiles(id) on delete cascade,
  asaas_customer_id text,
  status text not null,
  value_cents integer not null default 0,
  billing_type text,
  confirmed_at timestamptz,
  invoice_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Licença vitalícia: sem data de expiração. Uma por usuário; a edição só sobe com pedidos pagos.
create table if not exists public.lifetime_licenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  edition_id uuid not null references public.commercial_editions(id),
  status text not null check (status in ('active', 'disputed', 'refunded', 'revoked')),
  origin_order_id uuid references public.orders(id),
  activated_at timestamptz not null default now(),
  version integer not null default 1,
  updated_at timestamptz not null default now()
);

create table if not exists public.license_events (
  id uuid primary key default gen_random_uuid(),
  license_id uuid references public.lifetime_licenses(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null,
  from_edition_id uuid references public.commercial_editions(id),
  to_edition_id uuid references public.commercial_editions(id),
  order_id uuid references public.orders(id),
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.access_grants add column if not exists edition_id uuid references public.commercial_editions(id);

-- Recursos gerenciados pela administração (as Agent Skills continuam vindo de src/data/catalog.json).
create table if not exists public.resources (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9-]{1,80}$'),
  type text not null check (type in ('skill', 'subagent', 'workflow', 'guide', 'tool', 'reference')),
  category text not null check (category in ('software', 'empreendedorismo', 'conteudo', 'ciencia')),
  title text not null,
  summary text not null default '',
  body_md text not null default '',
  instructions text not null default '',
  tags text[] not null default '{}',
  source_name text not null default '',
  source_url text,
  preview_url text,
  author text not null default '',
  license text not null default '',
  visibility text not null default 'edition' check (visibility in ('public', 'demo', 'edition')),
  min_edition_rank integer not null default 1,
  status text not null default 'draft' check (status in ('draft', 'published', 'hidden')),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.resource_relations (
  from_id text not null,
  to_id text not null,
  kind text not null default 'related' check (kind in ('related', 'requires', 'next')),
  primary key (from_id, to_id, kind)
);

-- Caminhos editoriais por objetivo: só aparecem na busca quando publicados.
create table if not exists public.goal_paths (
  id uuid primary key default gen_random_uuid(),
  goal text not null,
  description text not null default '',
  keywords text[] not null default '{}',
  steps jsonb not null default '[]',
  status text not null default 'draft' check (status in ('draft', 'published')),
  version integer not null default 1,
  updated_at timestamptz not null default now()
);

create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  description text not null default '',
  share_token text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists collections_user_idx on public.collections (user_id, updated_at desc);

create table if not exists public.collection_items (
  collection_id uuid not null references public.collections(id) on delete cascade,
  resource_id text not null,
  position integer not null default 0,
  added_at timestamptz not null default now(),
  primary key (collection_id, resource_id)
);

create table if not exists public.favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  resource_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, resource_id)
);

create table if not exists public.recent_items (
  user_id uuid not null references public.profiles(id) on delete cascade,
  resource_id text not null,
  visited_at timestamptz not null default now(),
  primary key (user_id, resource_id)
);

-- RLS ligado em tudo. O navegador não grava diretamente: todas as escritas passam pela API.
alter table public.commercial_editions enable row level security;
alter table public.orders enable row level security;
alter table public.payments enable row level security;
alter table public.lifetime_licenses enable row level security;
alter table public.license_events enable row level security;
alter table public.resources enable row level security;
alter table public.resource_relations enable row level security;
alter table public.goal_paths enable row level security;
alter table public.collections enable row level security;
alter table public.collection_items enable row level security;
alter table public.favorites enable row level security;
alter table public.recent_items enable row level security;

drop policy if exists "editions_select_on_sale" on public.commercial_editions;
create policy "editions_select_on_sale" on public.commercial_editions for select to anon, authenticated using (on_sale);
drop policy if exists "orders_select_own" on public.orders;
create policy "orders_select_own" on public.orders for select to authenticated using (user_id = auth.uid());
drop policy if exists "licenses_select_own" on public.lifetime_licenses;
create policy "licenses_select_own" on public.lifetime_licenses for select to authenticated using (user_id = auth.uid());
drop policy if exists "collections_select_own" on public.collections;
create policy "collections_select_own" on public.collections for select to authenticated using (user_id = auth.uid());
drop policy if exists "favorites_select_own" on public.favorites;
create policy "favorites_select_own" on public.favorites for select to authenticated using (user_id = auth.uid());
drop policy if exists "recent_select_own" on public.recent_items;
create policy "recent_select_own" on public.recent_items for select to authenticated using (user_id = auth.uid());
-- resources, relações, caminhos, pagamentos e eventos: sem políticas = acesso só pelo servidor.

-- Edição 1 (preço aprovado: R$ 97,90). Fica fora de venda até a administração ativá-la.
insert into public.commercial_editions (code, name, rank, price_cents, description, on_sale)
values ('edicao-1', 'Biblioteca Total — Edição 1', 1, 9790, 'Acesso vitalício aos recursos incluídos na Edição 1.', false)
on conflict (code) do nothing;
