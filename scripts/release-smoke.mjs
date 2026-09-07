import { existsSync, readFileSync } from 'node:fs';
const required = [
  'app/page.tsx','app/api/analyze/route.ts','app/api/jobs/route.ts','app/api/billing/webhook/route.ts',
  'app/api/cron/jobs/route.ts','app/api/cron/credits/route.ts','app/api/health/route.ts',
  'lib/api-key-pool.ts','lib/credits.ts','lib/secret-box.ts','supabase/schema.sql',
  'supabase/migrations/20260905_140000_phase14_queue_credit_security.sql','DEPLOYMENT.md','RELEASE_CHECKLIST.md','vercel.json'
];
const missing=required.filter(x=>!existsSync(x));
if(missing.length){console.error('Missing release files:',missing.join(', '));process.exit(1);}
const env=readFileSync('.env.example','utf8');
for(const key of ['OPENAI_API_KEY','NEXT_PUBLIC_SUPABASE_URL','SUPABASE_SECRET_KEY','APP_ENCRYPTION_KEY','CRON_SECRET']){
  if(!env.includes(key)) throw new Error(`Missing env documentation: ${key}`);
}
const analyze=readFileSync('app/api/analyze/route.ts','utf8');
if(analyze.includes("supabase.rpc('consume_credits'")||analyze.includes("supabase.rpc('grant_credits'")) throw new Error('Analyze route still uses user-scoped client for privileged credit RPCs.');
const jobs=readFileSync('app/api/jobs/route.ts','utf8');
if(!jobs.includes('consumeCredits')||!jobs.includes("createSupabaseAdmin")) throw new Error('Queue route is missing server-side credit reservation.');
const migration=readFileSync('supabase/migrations/20260905_140000_phase14_queue_credit_security.sql','utf8');
if(!migration.includes('revoke insert, update, delete on public.jobs from anon, authenticated')) throw new Error('Queue write grants were not hardened.');
const pkg=JSON.parse(readFileSync('package.json','utf8'));
if(!pkg.scripts?.build || !pkg.scripts?.typecheck || !pkg.scripts?.['check:env']) throw new Error('Missing build/typecheck/env scripts');
console.log('Release smoke check passed:', required.length, 'critical files checked.');
