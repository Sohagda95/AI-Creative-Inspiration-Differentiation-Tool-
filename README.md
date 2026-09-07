# AI Creative Inspiration & Differentiation Tool — Phase 15

Production-hardening release built on Next.js, Supabase, OpenAI-compatible vision processing and Stripe billing.

## Run locally

Requirements: Node.js 20+.

```bash
npm install
cp .env.example .env.local
npm run typecheck
npm run build
npm run dev
```

Open http://localhost:3000.

## Environment variables

Keep provider secrets server-side. Only variables prefixed with `NEXT_PUBLIC_` are intended for browser exposure. Next.js documents that non-`NEXT_PUBLIC_` variables remain server-only, while public variables are inlined into browser bundles.

Required for the main app:
- `OPENAI_API_KEY` (plus optional numbered keys)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SECRET_KEY` (preferred) or legacy `SUPABASE_SERVICE_ROLE_KEY`
- `APP_ENCRYPTION_KEY`

Billing:
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_CREATOR`
- `STRIPE_PRICE_PRO`
- `STRIPE_PRICE_STUDIO`

Operations:
- `CRON_SECRET`
- `NEXT_PUBLIC_APP_URL`

## Supabase

Run `supabase/schema.sql` in the Supabase SQL editor. Promote your first admin by changing the user's `profiles.role` to `admin`.

## Stripe

Point Stripe's webhook to `/api/billing/webhook`. The endpoint verifies the raw request signature before processing and records event IDs for idempotency. Stripe recommends signature verification and replay protection for webhook endpoints. 

## Deployment

### Vercel
1. Import the repository into Vercel.
2. Add environment variables in Project Settings.
3. Deploy.
4. Set the Stripe webhook URL to `https://YOUR_DOMAIN/api/billing/webhook`.
5. Configure a scheduled request to `/api/cron/credits` with `Authorization: Bearer $CRON_SECRET` if your scheduler supports authenticated headers.

### Docker

```bash
docker build -t ai-creative-tool .
docker run --env-file .env.local -p 3000:3000 ai-creative-tool
```

## Security notes

- Never commit `.env.local` or provider secrets.
- Never prefix secret API keys with `NEXT_PUBLIC_`.
- The admin service-role client is server-only.
- Database API keys are encrypted before storage.
- Stripe webhooks are signature checked using the raw request body.
- For a multi-instance production deployment, move queue execution and key health counters to shared database-backed state rather than process memory.

## Phase 12
See `PHASE12.md` for final integration changes and job worker setup.

## Phase 13 release verification

Run `npm run release:smoke` after checkout. CI also runs `npm run typecheck` and the smoke check. Vercel Cron is configured for the daily credit reset route; queue processing can be triggered separately through `/api/cron/jobs` using `CRON_SECRET`.


## Phase 14
See `PHASE14.md`, `DEPLOYMENT.md`, and `RELEASE_CHECKLIST.md`. Phase 14 fixes privileged credit RPC usage and closes the direct queue-write/credit-bypass path.


## Phase 15
See `PHASE15.md` and `RELEASE_CANDIDATE.md`. Admins can use `/admin/system` for a secret-safe operational readiness summary.
