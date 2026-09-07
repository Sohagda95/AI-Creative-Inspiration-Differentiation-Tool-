# Phase 10 — Final QA & Production Integration

## Automated checks
- `npm run typecheck` — TypeScript validation.
- `npm run build` — production build.
- Verify `NEXT_PUBLIC_APP_URL`, Supabase, Stripe, OpenAI, encryption and cron secrets are configured.

## Integration checks
1. Sign in with Supabase magic link.
2. Upload one supported image and generate 1, 3 and 10 variations.
3. Confirm credits are deducted exactly once.
4. Force an AI/provider failure and confirm the reserved credits are refunded.
5. Add two provider keys; make the first return a rate-limit/quota error and confirm rotation.
6. Create a Stripe Checkout session and verify the webhook updates the subscription and grants credits once.
7. Re-deliver the same webhook event and confirm it is treated as a duplicate.
8. Create a project, save analyses, reopen it and delete it.
9. Verify normal users cannot access `/admin` or admin APIs.
10. Run the protected cron endpoint and confirm due monthly credits reset.

## Security notes
- API/provider secrets remain server-side.
- `SECURITY DEFINER` credit/job/admin functions have browser execution revoked in the schema.
- Do not commit `.env.local`, real API keys, Stripe secrets or `APP_ENCRYPTION_KEY`.
