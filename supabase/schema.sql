-- AI Creative Inspiration & Differentiation Tool
-- Run this in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null default 'user' check (role in ('user','admin')),
  created_at timestamptz not null default now(),
  plan text not null default 'free' check (plan in ('free','creator','pro','studio')),
  credits integer not null default 25,
  credits_used integer not null default 0,
  credits_reset_at timestamptz not null default (now() + interval '1 month')
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.analyses (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  image_index integer not null,
  analysis jsonb not null,
  prompts jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  encrypted_secret text not null,
  enabled boolean not null default true,
  status text not null default 'unknown',
  failure_count integer not null default 0,
  last_used_at timestamptz,
  last_error_at timestamptz,
  cooldown_until timestamptz,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.analyses enable row level security;
alter table public.api_keys enable row level security;

create policy "profiles own row" on public.profiles for select using (id = auth.uid());
create policy "projects own rows" on public.projects for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "analyses through own projects" on public.analyses for all using (exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())) with check (exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid()));

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin insert into public.profiles (id) values (new.id) on conflict do nothing; return new; end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create or replace function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
drop trigger if exists projects_updated_at on public.projects;
create trigger projects_updated_at before update on public.projects for each row execute procedure public.set_updated_at();


-- Phase 6: billing / credit ledger
create table if not exists public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount integer not null,
  reason text not null,
  reference_id text,
  created_at timestamptz not null default now()
);

alter table public.credit_ledger enable row level security;
create policy "credit ledger own rows" on public.credit_ledger for select using (user_id = auth.uid());

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'stripe',
  provider_customer_id text,
  provider_subscription_id text unique,
  plan text not null check (plan in ('creator','pro','studio')),
  status text not null default 'pending',
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;
create policy "subscriptions own rows" on public.subscriptions for select using (user_id = auth.uid());

-- Phase 5: operational controls and atomic credit usage
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade, status text not null default 'queued' check(status in ('queued','processing','completed','failed','cancelled')),
  payload jsonb not null default '{}'::jsonb, result jsonb, error text, attempts integer not null default 0,
  credit_cost integer not null default 0 check (credit_cost >= 0), credit_refunded_at timestamptz,
  available_at timestamptz not null default now(), locked_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.jobs enable row level security;
create policy "jobs own rows read" on public.jobs for select using(user_id=auth.uid());

create or replace function public.consume_credits(p_user_id uuid,p_amount integer,p_reason text,p_reference_id text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare remaining integer; begin
 if p_amount <= 0 then raise exception 'Credit amount must be positive'; end if;
 update profiles set credits=credits-p_amount, credits_used=credits_used+p_amount where id=p_user_id and credits>=p_amount returning credits into remaining;
 if not found then raise exception 'INSUFFICIENT_CREDITS'; end if;
 insert into credit_ledger(user_id,amount,reason,reference_id) values(p_user_id,-p_amount,p_reason,p_reference_id);
 return jsonb_build_object('credits',remaining);
end; $$;

create or replace function public.grant_credits(p_user_id uuid,p_amount integer,p_reason text,p_reference_id text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare remaining integer; begin
 if p_amount <= 0 then raise exception 'Credit amount must be positive'; end if;
 update profiles set credits=credits+p_amount where id=p_user_id returning credits into remaining;
 if not found then raise exception 'USER_NOT_FOUND'; end if;
 insert into credit_ledger(user_id,amount,reason,reference_id) values(p_user_id,p_amount,p_reason,p_reference_id);
 return jsonb_build_object('credits',remaining);
end; $$;
create index if not exists jobs_status_available_idx on public.jobs(status,available_at);
create index if not exists credit_ledger_user_created_idx on public.credit_ledger(user_id,created_at desc);
create index if not exists api_keys_enabled_cooldown_idx on public.api_keys(enabled,cooldown_until);

-- Phase 7: production SaaS operations
create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_id text not null unique,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  processing_error text,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.webhook_events enable row level security;

create index if not exists webhook_events_provider_created_idx on public.webhook_events(provider,created_at desc);

create or replace function public.set_user_plan(p_user_id uuid,p_plan text,p_monthly_credits integer,p_reason text,p_reference_id text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare remaining integer; begin
 if p_plan not in ('free','creator','pro','studio') then raise exception 'INVALID_PLAN'; end if;
 update profiles set plan=p_plan, credits_reset_at=now()+interval '1 month', credits=credits+p_monthly_credits where id=p_user_id returning credits into remaining;
 if not found then raise exception 'USER_NOT_FOUND'; end if;
 insert into credit_ledger(user_id,amount,reason,reference_id) values(p_user_id,p_monthly_credits,p_reason,p_reference_id);
 return jsonb_build_object('credits',remaining,'plan',p_plan);
end; $$;

create or replace function public.reset_due_credits()
returns integer language plpgsql security definer set search_path=public as $$
declare r record; n integer := 0; amount integer; begin
 for r in select id,plan from profiles where credits_reset_at<=now() loop
  amount:=case r.plan when 'free' then 25 when 'creator' then 300 when 'pro' then 1500 when 'studio' then 5000 else 25 end;
  update profiles set credits=amount,credits_used=0,credits_reset_at=now()+interval '1 month' where id=r.id;
  insert into credit_ledger(user_id,amount,reason) values(r.id,amount,'monthly_reset'); n:=n+1;
 end loop; return n;
end; $$;


-- Security hardening: these functions are server-side only. Never allow a browser
-- client to call them directly because they use SECURITY DEFINER privileges.
revoke execute on function public.consume_credits(uuid,integer,text,text) from public, anon, authenticated;
revoke execute on function public.grant_credits(uuid,integer,text,text) from public, anon, authenticated;
revoke execute on function public.set_user_plan(uuid,text,integer,text,text) from public, anon, authenticated;
revoke execute on function public.reset_due_credits() from public, anon, authenticated;
grant execute on function public.consume_credits(uuid,integer,text,text) to service_role;
grant execute on function public.grant_credits(uuid,integer,text,text) to service_role;
grant execute on function public.set_user_plan(uuid,text,integer,text,text) to service_role;
grant execute on function public.reset_due_credits() to service_role;

create or replace function public.claim_next_job()
returns public.jobs language plpgsql security definer set search_path=public as $$
declare j public.jobs; begin
 update public.jobs set status='processing',locked_at=now(),attempts=attempts+1,updated_at=now()
 where id=(select id from public.jobs where status='queued' and available_at<=now() order by created_at for update skip locked limit 1)
 returning * into j; return j; end; $$;

revoke execute on function public.claim_next_job() from public, anon, authenticated;
grant execute on function public.claim_next_job() to service_role;

-- Queue writes are server-controlled because enqueueing reserves paid credits.
revoke insert, update, delete on public.jobs from anon, authenticated;
grant select on public.jobs to authenticated;

-- Idempotency for server-side refunds/monthly grants that must never be doubled.
create unique index if not exists credit_ledger_idempotent_ref_idx
on public.credit_ledger(user_id, reason, reference_id)
where reference_id is not null and reason in ('job_terminal_failure_refund','job_enqueue_failed_refund','stripe_monthly_credit');

-- Useful indexes for production dashboards.
create index if not exists projects_user_updated_idx on public.projects(user_id,updated_at desc);
create index if not exists subscriptions_user_status_idx on public.subscriptions(user_id,status);
create index if not exists jobs_user_created_idx on public.jobs(user_id,created_at desc);
