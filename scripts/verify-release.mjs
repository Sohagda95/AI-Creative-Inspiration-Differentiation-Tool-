import {readFileSync,existsSync} from 'node:fs';
function assert(ok,msg){if(!ok)throw new Error(msg)}
const schema=readFileSync('supabase/schema.sql','utf8');
const analyze=readFileSync('app/api/analyze/route.ts','utf8');
const jobs=readFileSync('app/api/jobs/route.ts','utf8');
const worker=readFileSync('app/api/cron/jobs/route.ts','utf8');
const admin=readFileSync('lib/supabase/admin.ts','utf8');
assert(!analyze.includes("supabase.rpc('consume_credits'"),'Privileged credit consume RPC is user-scoped');
assert(!analyze.includes("supabase.rpc('grant_credits'"),'Privileged credit grant RPC is user-scoped');
assert(jobs.includes("consumeCredits(user.id"),'Queued job does not reserve credits');
assert(jobs.includes("createSupabaseAdmin"),'Queued job insert is not server-controlled');
assert(worker.includes('job_terminal_failure_refund'),'Terminal queue failure refund missing');
assert(schema.includes('revoke insert, update, delete on public.jobs from anon, authenticated'),'Direct queue writes not revoked');
assert(admin.includes('SUPABASE_SECRET_KEY'),'Preferred Supabase server secret not supported');
assert(existsSync('app/api/admin/system/route.ts')&&existsSync('app/admin/system/page.tsx'),'System readiness console missing');
console.log('Phase 15 release verification passed.');
