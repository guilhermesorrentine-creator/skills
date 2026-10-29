-- Nova oferta apenas para compras futuras. Pedidos, assinaturas e preços já pagos permanecem.
update public.commercial_editions
set name = 'Voxelia — acesso vitalício', price_cents = 1990,
    description = 'Acesso vitalício ao acervo de skills em português. Sem conexão automática com IA.',
    features = array['Acervo de skills com busca por objetivo', 'Guias em português para consultar e copiar', 'Pagamento único, sem mensalidade'],
    on_sale = true, updated_at = now()
where code = 'edicao-1';

update public.commercial_editions set on_sale = false, updated_at = now() where code <> 'edicao-1';
update public.plans set active = false where code = 'voxelia-mensal';

alter table public.orders add column if not exists payment_provider text not null default 'asaas'
  check (payment_provider in ('asaas', 'cakto'));
alter table public.orders add column if not exists cakto_order_id text unique;
alter table public.orders add column if not exists cakto_fee_cents integer check (cakto_fee_cents >= 0);
alter table public.orders add column if not exists cakto_payment_method text;
alter table public.orders add column if not exists access_granted_at timestamptz;
alter table public.orders add column if not exists meta_purchase_sent_at timestamptz;
alter table public.orders add column if not exists meta_purchase_attempted_at timestamptz;
alter table public.orders add column if not exists meta_purchase_error text;

create table if not exists public.cakto_webhook_events (
  id text primary key,
  event text not null,
  payload jsonb not null,
  status text not null default 'received' check (status in ('received', 'processing', 'processed', 'unlinked', 'failed')),
  note text,
  attempts integer not null default 0,
  received_at timestamptz not null default now(),
  processing_started_at timestamptz,
  processed_at timestamptz
);
create index if not exists cakto_webhook_events_status_idx on public.cakto_webhook_events (status, received_at desc);
alter table public.cakto_webhook_events enable row level security;
-- Sem políticas para anon/authenticated: apenas o backend com service role lê e escreve eventos.
