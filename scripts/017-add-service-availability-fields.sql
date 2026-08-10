-- Add availability fields to existing service_listings table.

alter table if exists public.service_listings
  add column if not exists working_days text[] not null default '{}';

alter table if exists public.service_listings
  add column if not exists working_hours text;
