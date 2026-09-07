import { NextResponse } from 'next/server';
import { getApiKeyPoolStatus } from '@/lib/api-key-pool';
export const runtime='nodejs';
export async function GET(){
  const supabaseServer=Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY));
  const supabaseBrowser=Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const billing=Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);
  const encryption=Boolean(process.env.APP_ENCRYPTION_KEY);
  const cron=Boolean(process.env.CRON_SECRET);
  const keys=await getApiKeyPoolStatus();
  const ready=supabaseServer && supabaseBrowser && encryption && cron && keys.total>0;
  return NextResponse.json({
    status:ready?'ok':'degraded',
    timestamp:new Date().toISOString(),
    checks:{supabaseServer,supabaseBrowser,billing,encryption,cron,openaiKeys:keys.total},
    version:process.env.APP_VERSION||'0.15.0'
  },{status:ready?200:503});
}
