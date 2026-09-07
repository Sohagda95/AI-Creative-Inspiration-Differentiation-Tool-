-- Phase 14 production security migration.
-- Apply this to deployments created from Phase 13 or earlier.

alter table public.jobs add column if not exists credit_cost integer not null default 0;
alter table public.jobs add column if not exists credit_refunded_at timestamptz;

-- Existing jobs are historical and should not be retroactively billed.
update public.jobs set credit_cost=0 where credit_cost is null;

alter table public.jobs drop constraint if exists jobs_credit_cost_check;
alter table public.jobs add constraint jobs_credit_cost_check check (credit_cost >= 0);

-- Queue writes are now server-controlled. Authenticated users may only read their own jobs.
drop policy if exists "jobs own rows" on public.jobs;
drop policy if exists "jobs own rows read" on public.jobs;
create policy "jobs own rows read" on public.jobs for select using (user_id=auth.uid());
revoke insert, update, delete on public.jobs from anon, authenticated;
grant select on public.jobs to authenticated;

-- The privileged credit/job functions remain callable only by the server role.
revoke execute on function public.consume_credits(uuid,integer,text,text) from public, anon, authenticated;
revoke execute on function public.grant_credits(uuid,integer,text,text) from public, anon, authenticated;
revoke execute on function public.claim_next_job() from public, anon, authenticated;
grant execute on function public.consume_credits(uuid,integer,text,text) to service_role;
grant execute on function public.grant_credits(uuid,integer,text,text) to service_role;
grant execute on function public.claim_next_job() to service_role;

create unique index if not exists credit_ledger_idempotent_ref_idx
on public.credit_ledger(user_id, reason, reference_id)
where reference_id is not null and reason in ('job_terminal_failure_refund','job_enqueue_failed_refund','stripe_monthly_credit');
