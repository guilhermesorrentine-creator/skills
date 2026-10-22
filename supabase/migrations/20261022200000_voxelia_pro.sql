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
