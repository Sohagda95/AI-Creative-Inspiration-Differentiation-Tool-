import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { getApiKeyPoolStatus } from '@/lib/api-key-pool';

export const runtime='nodejs';

export async function GET(){
  try{
    const {admin}=await requireAdmin();
    const [keys,jobs,webhooks,subs]=await Promise.all([
      getApiKeyPoolStatus(),
      admin.from('jobs').select('status,credit_cost,credit_refunded_at,created_at').order('created_at',{ascending:false}).limit(1000),
      admin.from('webhook_events').select('processing_error,processed_at,created_at').order('created_at',{ascending:false}).limit(250),
      admin.from('subscriptions').select('status,plan').limit(1000)
    ]);
    const jobRows=jobs.data??[];
    const counts=jobRows.reduce((a:any,j:any)=>{a[j.status]=(a[j.status]||0)+1;return a;},{});
    const failedWebhookCount=(webhooks.data??[]).filter((x:any)=>x.processing_error).length;
    const activeSubscriptions=(subs.data??[]).filter((x:any)=>['active','trialing'].includes(x.status)).length;
    const checks={
      supabaseServer:Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && (process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY)),
      supabaseBrowser:Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      encryption:Boolean(process.env.APP_ENCRYPTION_KEY),
      cron:Boolean(process.env.CRON_SECRET),
      stripe:Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET),
      openaiKeys:keys.total
    };
    const coreReady=checks.supabaseServer&&checks.supabaseBrowser&&checks.encryption&&checks.cron&&checks.openaiKeys>0;
    return NextResponse.json({
      release:{phase:15,version:process.env.APP_VERSION||'0.15.0',coreReady},
      checks,
      apiKeys:keys,
      jobs:{...counts,total:jobRows.length},
      billing:{activeSubscriptions,failedWebhookCount},
      generatedAt:new Date().toISOString()
    });
  }catch(e:any){return NextResponse.json({error:e?.message||'Unable to read system status.'},{status:e?.status||500});}
}
