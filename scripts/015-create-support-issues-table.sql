-- Support issues reported by buyers from order details.
-- BigCat admin reviews and resolves these complaints.

create table if not exists public.support_issues (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null,
  buyer_id uuid not null,
  merchant_id uuid,
  issue_type text not null,
  description text not null,
  status text not null default 'open',
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists support_issues_order_id_idx on public.support_issues(order_id);
create index if not exists support_issues_buyer_id_idx on public.support_issues(buyer_id);
create index if not exists support_issues_status_idx on public.support_issues(status);
create index if not exists support_issues_created_at_idx on public.support_issues(created_at desc);

-- Keep updated_at current on changes.
create or replace function public.set_support_issues_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_support_issues_updated_at on public.support_issues;
create trigger trg_support_issues_updated_at
before update on public.support_issues
for each row
execute function public.set_support_issues_updated_at();