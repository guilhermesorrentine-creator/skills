-- Dados para a API de Conversões do Meta, gravados no pedido só com consentimento de cookies:
-- fbp/fbc, IP, navegador e página de origem. Nada disso é exigido para a compra funcionar.
alter table public.orders add column if not exists ad_tracking jsonb;
