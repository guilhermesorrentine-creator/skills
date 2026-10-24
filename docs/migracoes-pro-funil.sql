-- Voxelia Pro: acervo vitalício + conexão da Voxelia com a IA do cliente (MCP) por 12 meses.
-- 12x de R$ 49,90 no cartão (R$ 598,80) ou à vista no Pix. A regra dos 12 meses e o parcelamento
-- ficam no servidor (server/commerce.js: MCP_EDITION, MCP_DAYS, INSTALLMENTS).
insert into public.commercial_editions (code, name, rank, price_cents, description, features, on_sale)
values (
  'pro-anual',
  'Voxelia Pro',
  2,
  59880,
  'Conecte a Voxelia no Claude, no ChatGPT e no Claude Code: é como dar superpoderes à sua IA. Inclui o acervo vitalício.',
  array[
    'Conexão com Claude, ChatGPT e Claude Code (MCP) por 12 meses',
    'A IA consulta o acervo e usa a skill certa: menos resposta genérica',
    'Menos tokens gastos explicando o que a skill já sabe',
    '2 mil skills com guias em português, com acesso vitalício',
    '15 dias de garantia'
  ],
  true
)
on conflict (code) do update set
  name = excluded.name, rank = excluded.rank, price_cents = excluded.price_cents,
  description = excluded.description, features = excluded.features, on_sale = excluded.on_sale, updated_at = now();
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
