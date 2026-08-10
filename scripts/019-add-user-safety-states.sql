-- Server-backed trust and safety state for contact-sharing violations.

create table if not exists public.user_safety_states (
  user_id uuid primary key,
  strike_count integer not null default 0,
  suspended_until timestamptz,
  last_violation_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_safety_states_suspended_until_idx
  on public.user_safety_states(suspended_until);

create or replace function public.set_user_safety_states_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_user_safety_states_updated_at on public.user_safety_states;
create trigger trg_user_safety_states_updated_at
before update on public.user_safety_states
for each row
execute function public.set_user_safety_states_updated_at();

notify pgrst, 'reload schema';
