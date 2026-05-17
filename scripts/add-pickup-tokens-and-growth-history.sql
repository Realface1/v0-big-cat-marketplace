alter table if exists public.orders
  add column if not exists pickup_token text,
  add column if not exists pickup_verified_at timestamptz,
  add column if not exists pickup_verified_by text;

create table if not exists public.merchant_scale_history (
  id uuid primary key default gen_random_uuid(),
  merchant_id text not null,
  merchant_name text,
  previous_scale text,
  next_scale text not null,
  total_sales numeric(14,2) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists merchant_scale_history_merchant_id_idx
  on public.merchant_scale_history (merchant_id, created_at desc);