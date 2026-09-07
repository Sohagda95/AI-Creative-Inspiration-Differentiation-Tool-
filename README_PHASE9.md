# AI Creative Inspiration & Differentiation Tool — Phase 9

A production-oriented SaaS foundation for image reference analysis, differentiated prompt generation, cross-image trend analysis, saved projects, credits, subscriptions, API-key rotation and admin operations.

## Local
```bash
npm install
npm run typecheck
npm run build
npm run dev
```

## Environment
Copy `.env.example` to `.env.local`. Never put provider secrets behind `NEXT_PUBLIC_`.

## Routes
- `/` — analysis studio
- `/onboarding` — first-use onboarding
- `/dashboard` — workspace and projects
- `/pricing` — plans and credits
- `/settings` — profile/security settings
- `/admin` — admin operations
- `/api/health` — health check

## Deployment
Vercel is the simplest default for this Next.js application, but any Node.js host that supports the required Next.js runtime can be used.
