-- Funil próprio (sem dados pessoais): sessão anônima, página, campanha e criativo (utm) e pedido.
-- Mede visita → clique em comprar → pagamento gerado → pago por criativo, mesmo sem consentimento
-- de cookies para o Pixel. Só o servidor (chave de serviço) lê e grava.
create table if not exists public.funnel_events (
  id bigserial primary key,
  at timestamptz not null default now(),
  sid text not null,
  name text not null check (name in ('view', 'buy_click', 'buy_page', 'checkout')),
  path text not null default '',
  source text not null default '',
  campaign text not null default '',
  content text not null default '',
  order_id uuid references public.orders(id) on delete set null
);
create index if not exists funnel_events_at_idx on public.funnel_events (at desc);
alter table public.funnel_events enable row level security;
