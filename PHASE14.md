# Phase 14 — Launch & Deployment Package

Phase 14 closes production gaps discovered during static QA of Phase 13.

## Fixed production issues

1. **Privileged credit RPC mismatch**
   - `consume_credits` and `grant_credits` are intentionally service-role-only database functions.
   - `/api/analyze` previously called them with the user-scoped SSR client, which would fail after the Phase 10 hardening migration.
   - All privileged credit mutations now go through a dedicated server-only admin client.

2. **Queue credit bypass**
   - Authenticated clients could previously insert rows into `jobs` directly through RLS.
   - Queue creation is now server-controlled.
   - The enqueue API authenticates the user, validates the payload, verifies project ownership, reserves credits, and inserts the job with the server secret.

3. **Terminal job refunds**
   - Queue jobs record `credit_cost`.
   - After retries are exhausted, a terminal failed job refunds its reserved credits and marks `credit_refunded_at`.

4. **Supabase secret-key compatibility**
   - New deployments can use `SUPABASE_SECRET_KEY`.
   - `SUPABASE_SERVICE_ROLE_KEY` remains supported as a backwards-compatible fallback.

## Upgrade from Phase 13

Apply:

`supabase/migrations/20260905_140000_phase14_queue_credit_security.sql`

Then deploy the application code. Do not deploy the new queue API before the migration is applied.

## Verification

Run:

```bash
npm run release:smoke
npm run check:env
npm run typecheck
npm run build
```

`check:env` expects real environment variables, so run it in a configured staging/production shell.
