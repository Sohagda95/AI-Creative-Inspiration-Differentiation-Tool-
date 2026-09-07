# Release Candidate Checklist — Phase 15

## Code gate
- release smoke test passes
- static security invariants pass
- TypeScript passes
- Next.js production build passes

## Database gate
- Phase 14 migration applied
- RLS policies inspected
- authenticated role cannot write directly to `jobs`
- server role can execute credit/job RPCs

## AI gate
- direct analysis succeeds
- direct failed analysis refunds credits
- key rotation succeeds when a configured key is rate-limited

## Queue gate
- enqueue reserves credits once
- worker completes valid job
- retryable error requeues up to configured attempt limit
- terminal failure refunds credits once

## Billing gate
- Stripe test checkout succeeds
- webhook signature is verified
- duplicate webhook is ignored
- invoice cycle grant occurs once
- cancellation downgrades account as expected

## Operations gate
- `/api/health` returns 200
- `/admin/system` reports core readiness
- cron routes reject missing/incorrect CRON_SECRET
- logs contain no plaintext provider secrets

## Launch decision
Only promote the release after the above gates are verified against the actual staging deployment and its real Supabase/Stripe/OpenAI configuration.
