import { NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { withApiKeyRotation } from '@/lib/api-key-pool';
import { isQuotaOrRateLimitError } from '@/lib/api-key-pool';

export const runtime = 'nodejs';

function authorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get('authorization') === `Bearer ${secret}`;
}

function extractText(data:any){
  if(typeof data?.output_text==='string') return data.output_text;
  return (data?.output??[]).flatMap((x:any)=>x.content??[]).map((x:any)=>x.text).filter(Boolean).join('\n');
}

function prompt(target:string,level:string,count:number){
  return `Analyze this reference image only at a high level and create differentiated creative directions. Do not recreate exact composition, viewpoint, arrangement, distinctive expression, logos, trademarks, recognizable characters, celebrity likenesses, or signature marks. Change at least four of composition, viewpoint, environment, lighting, supporting elements, subject treatment, palette relationships, scale, depth, or style. Target: ${target}. Differentiation: ${level}. Return ONLY JSON: {"analysis":{"subject":"","secondaryElements":[],"environment":"","composition":"","viewpoint":"","lighting":"","colorPalette":[],"mood":"","visualStyle":"","distinctiveFeaturesToAvoid":[]},"creativeDirections":[{"title":"","concept":"","changes":[]}],"prompts":[{"title":"","prompt":"","negativeGuidance":[]}],"confidence":0}`;
}

export async function POST(req:Request){
  if(!authorized(req)) return NextResponse.json({error:'Unauthorized'},{status:401});
  const admin=createSupabaseAdmin();
  const {data:jobs,error}=await admin.rpc('claim_next_job');
  if(error) return NextResponse.json({error:error.message},{status:500});
  const job=(Array.isArray(jobs)?jobs[0]:jobs) as any;
  if(!job) return NextResponse.json({processed:false,message:'No queued jobs.'});
  try{
    const payload=job.payload||{};
    const imageDataUrl=String(payload.imageDataUrl||'');
    const target=String(payload.target||'ChatGPT Image');
    const level=String(payload.level||'High');
    const count=Math.max(1,Math.min(10,Number(payload.count)||3));
    if(!imageDataUrl.startsWith('data:image/')) throw new Error('Job payload is missing a valid image.');
    const result=await withApiKeyRotation(async key=>{
      const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`},body:JSON.stringify({model:process.env.OPENAI_VISION_MODEL||'gpt-5.6-luna',input:[{role:'user',content:[{type:'input_text',text:prompt(target,level,count)},{type:'input_image',image_url:imageDataUrl,detail:'high'}]}],max_output_tokens:5000})});
      const d=await r.json(); if(!r.ok){const e:any=new Error(d?.error?.message||`OpenAI request failed (${r.status}).`);e.status=r.status;e.code=d?.error?.code;throw e;} return d;
    },isQuotaOrRateLimitError);
    let parsed:any; try{parsed=JSON.parse(extractText(result).replace(/^```json\s*/i,'').replace(/\s*```$/,'').trim())}catch{throw new Error('AI returned invalid JSON.');}
    await admin.from('jobs').update({status:'completed',result:parsed,error:null,updated_at:new Date().toISOString()}).eq('id',job.id);
    return NextResponse.json({processed:true,jobId:job.id,result:parsed});
  }catch(e:any){
    const attempts=Number(job.attempts||1);
    const retryable=Number(e?.status)===429 || Number(e?.status)>=500;
    const willRetry=retryable && attempts<3;
    await admin.from('jobs').update({status:willRetry?'queued':'failed',error:String(e?.message||e),available_at:willRetry?new Date(Date.now()+Math.min(attempts*30_000,120_000)).toISOString():new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',job.id);
    if(!willRetry && Number(job.credit_cost)>0 && !job.credit_refunded_at){
      const {error:refundError}=await admin.rpc('grant_credits',{p_user_id:job.user_id,p_amount:Number(job.credit_cost),p_reason:'job_terminal_failure_refund',p_reference_id:job.id});
      if(!refundError) await admin.from('jobs').update({credit_refunded_at:new Date().toISOString()}).eq('id',job.id).is('credit_refunded_at',null);
    }
    return NextResponse.json({processed:true,jobId:job.id,error:e?.message||'Job failed',retrying:willRetry},{status:willRetry?503:500});
  }
}
