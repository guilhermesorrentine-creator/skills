alter table public.dashboard_connections
  add column if not exists instagram_user_id text,
  add column if not exists instagram_username text;
