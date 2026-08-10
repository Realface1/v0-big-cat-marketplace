-- Phase 1 services marketplace schema.

create table if not exists public.service_listings (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null,
  title text not null,
  description text,
  category text,
  base_price numeric(12,2) not null default 0,
  duration_minutes integer not null default 60,
  working_days text[] not null default '{}',
  working_hours text,
  service_city text,
  service_state text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists service_listings_merchant_idx on public.service_listings(merchant_id);
create index if not exists service_listings_active_idx on public.service_listings(is_active);
create index if not exists service_listings_category_idx on public.service_listings(category);
create index if not exists service_listings_location_idx on public.service_listings(service_state, service_city);

create table if not exists public.service_bookings (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null,
  buyer_id uuid not null,
  merchant_id uuid not null,
  status text not null default 'requested',
  scheduled_at timestamptz,
  service_address text,
  buyer_note text,
  quoted_price numeric(12,2) not null default 0,
  payment_status text not null default 'held',
  escrow_status text not null default 'held',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists service_bookings_buyer_idx on public.service_bookings(buyer_id);
create index if not exists service_bookings_merchant_idx on public.service_bookings(merchant_id);
create index if not exists service_bookings_status_idx on public.service_bookings(status);
create index if not exists service_bookings_scheduled_idx on public.service_bookings(scheduled_at);

create table if not exists public.service_booking_events (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null,
  actor_id uuid,
  actor_type text,
  from_status text,
  to_status text,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists service_booking_events_booking_idx on public.service_booking_events(booking_id);

create or replace function public.set_services_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_service_listings_updated_at on public.service_listings;
create trigger trg_service_listings_updated_at
before update on public.service_listings
for each row
execute function public.set_services_updated_at();

drop trigger if exists trg_service_bookings_updated_at on public.service_bookings;
create trigger trg_service_bookings_updated_at
before update on public.service_bookings
for each row
execute function public.set_services_updated_at();
