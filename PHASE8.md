# Phase 8 — Production Hardening & Launch Checklist

## Included
- Supabase SSR session refresh middleware
- Security response headers
- `/api/health` readiness endpoint
- Error and 404 boundaries
- Robots and sitemap routes
- Privacy and Terms starter pages
- Docker production image
- Vercel configuration
- Typecheck script
- Secret-safe `.gitignore` and `.dockerignore`

## Before going live
1. Run `npm install`.
2. Run `npm run typecheck`.
3. Run `npm run build`.
4. Configure Supabase URL/anon/service-role keys.
5. Run `supabase/schema.sql`.
6. Create an admin profile deliberately; do not make all users admins.
7. Set `APP_ENCRYPTION_KEY` to a high-entropy secret and rotate it only with a migration plan.
8. Configure Stripe prices and webhook endpoint.
9. Configure `CRON_SECRET` and an authenticated scheduler.
10. Configure `NEXT_PUBLIC_APP_URL` to the production origin.
11. Replace the starter Privacy/Terms pages with reviewed legal text.
12. Test login, image analysis, key rotation, credits, Stripe webhook replay, exports and deletion flows.

## Production architecture note
The in-memory API-key cursor is fine for a single process but should be replaced with shared database/Redis coordination for horizontally scaled workers. The queue claim function already uses database locking so multiple workers can safely claim jobs.
