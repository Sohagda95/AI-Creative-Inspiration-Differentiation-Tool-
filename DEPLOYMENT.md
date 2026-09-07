# Production Deployment Guide

## 1. Database

For a brand-new project, run `supabase/schema.sql` once.

For an existing Phase 13 database, apply migrations in filename order from `supabase/migrations/`.

Important: the Phase 14 queue migration must be applied before the Phase 14 app is deployed because queue rows now contain `credit_cost` and `credit_refunded_at`.

## 2. Environment

Copy `.env.example` to `.env.local` for development. Configure the same values in your hosting provider for production.

Required core values:
- OpenAI API key pool (`OPENAI_API_KEY` and optional numbered keys)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SECRET_KEY` (preferred) or legacy `SUPABASE_SERVICE_ROLE_KEY`
- `APP_ENCRYPTION_KEY`
- `CRON_SECRET`
- `NEXT_PUBLIC_APP_URL`

Billing additionally needs Stripe secret, webhook secret and plan price IDs.

## 3. Preflight

```bash
npm install
npm run release:smoke
npm run check:env
npm run typecheck
npm run build
```

## 4. Stripe

Configure the production webhook URL as:

`https://YOUR_DOMAIN/api/billing/webhook`

Subscribe to the event types handled in `app/api/billing/webhook/route.ts`.

## 5. Scheduled jobs

- Daily credit maintenance: `/api/cron/credits`
- Queue worker: `/api/cron/jobs`

Both routes require `Authorization: Bearer <CRON_SECRET>`.

If the hosting plan cannot invoke the queue frequently enough, use a separate scheduler/worker that calls the route with the same authorization header.

## 6. Launch smoke flow

1. Create a non-admin account.
2. Confirm its profile is created with the Free plan.
3. Upload one test image and run direct analysis.
4. Confirm credits decrease exactly once.
5. Force a failed provider request in staging and confirm credits are refunded.
6. Queue one image and confirm a job is created only through `/api/jobs`.
7. Run the queue worker and confirm success changes the job to `completed`.
8. Force terminal queue failure and confirm a single refund.
9. Save/open/delete a project.
10. Complete a Stripe test checkout and confirm subscription state and cycle credits.
11. Confirm a normal user cannot access admin endpoints.
12. Confirm `/api/health` returns `ok` in the configured production environment.
