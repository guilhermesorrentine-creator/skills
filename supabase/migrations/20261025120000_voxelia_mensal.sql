-- Assinatura mensal separada das licenças vitalícias já vendidas.
insert into public.plans (code, name, description, price_cents, cycle, features, active, sort)
values ('voxelia-mensal', 'Voxelia mensal', 'Acervo e conexão com IA enquanto a assinatura estiver paga.', 4990, 'MONTHLY',
  array['Acervo de skills', 'Conexão com Claude, ChatGPT e Claude Code'], true, 1)
on conflict (code) do update set name = excluded.name, description = excluded.description,
  price_cents = excluded.price_cents, features = excluded.features, active = excluded.active;

-- O Pro anual deixa de ser vendido. Pedidos e direitos já adquiridos permanecem.
update public.commercial_editions set on_sale = false, updated_at = now() where code = 'pro-anual';

alter table public.checkout_sessions add column if not exists ad_tracking jsonb;
alter table public.checkout_sessions add column if not exists attribution jsonb;
alter table public.checkout_sessions add column if not exists asaas_customer_id text;
alter table public.subscriptions add column if not exists checkout_session_id uuid references public.checkout_sessions(id);
alter table public.subscriptions add column if not exists ad_tracking jsonb;
alter table public.subscriptions add column if not exists attribution jsonb;
create unique index if not exists subscriptions_checkout_session_unique on public.subscriptions (checkout_session_id);
