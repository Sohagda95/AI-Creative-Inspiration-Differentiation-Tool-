# Phase 13 — Release Engineering & Billing Correctness

Implemented:
- Added dependency-free release smoke checks.
- Added GitHub Actions CI for typecheck and release smoke verification.
- Added a production Vercel cron for daily credit resets. Vercel documents that Hobby cron jobs are limited to once per day; higher-frequency queue polling should use Pro or an external scheduler.
- Hardened Stripe signature parsing against malformed signatures.
- Changed recurring credit grants so subscription update events do not repeatedly add monthly credits.
- Added invoice-paid cycle crediting with an idempotent period reference.
- Added safer subscription cancellation downgrade to free.
- Preserved server-only secret handling.

Operational note:
- The `/api/cron/jobs` worker is available for a frequent scheduler. On Vercel Pro, it can be scheduled as frequently as once per minute; otherwise use an external scheduler/worker for queue polling.
