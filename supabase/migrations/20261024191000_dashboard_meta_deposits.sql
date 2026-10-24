-- Recargas antecipadas são saídas de caixa, não despesa de competência.
-- O gasto efetivo continua vindo dos Insights da Meta Ads.
alter table public.dashboard_expenses
  add column if not exists kind text not null default 'expense'
  check (kind in ('expense', 'meta_deposit'));

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'dashboard_meta_deposit_nonrecurring'
    and conrelid = 'public.dashboard_expenses'::regclass) then
    alter table public.dashboard_expenses
      add constraint dashboard_meta_deposit_nonrecurring
      check (kind <> 'meta_deposit' or recurring = false);
  end if;
end $$;
