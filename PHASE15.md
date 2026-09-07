# Phase 15 — Release Candidate Operations

Phase 15 builds on the Phase 14 security corrections and adds an operator-facing release readiness layer.

## Added
- `/admin/system` production operations screen.
- `/api/admin/system` admin-only system summary.
- Queue status snapshot without exposing job payloads or secrets.
- API-key pool count/health summary without exposing API keys.
- Billing/webhook error count and active subscription count.
- Static release invariant verifier (`npm run release:verify-static`).
- Final release-candidate documentation.

## Launch gate
A production launch should not be approved until all of these pass in the real deployment environment:

```bash
npm run release:smoke
npm run release:verify-static
npm run check:env
npm run typecheck
npm run build
```

Then visit `/admin/system`, run one direct AI analysis, one queued analysis, one test-mode subscription checkout, and verify the corresponding database/credit state.
