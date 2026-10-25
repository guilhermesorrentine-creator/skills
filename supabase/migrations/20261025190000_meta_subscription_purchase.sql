-- Uma aquisição mensal gera um único Purchase. A cobrança do Asaas é a identidade estável.
alter table public.payment_records add column if not exists meta_purchase_attempted_at timestamptz;
alter table public.payment_records add column if not exists meta_purchase_sent_at timestamptz;
alter table public.payment_records add column if not exists meta_purchase_error text;

