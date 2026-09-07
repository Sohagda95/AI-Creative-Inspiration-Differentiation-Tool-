import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { creditsForImages } from '@/lib/billing';
import { consumeCredits } from '@/lib/credits';
import { allowRequest, clientKey } from '@/lib/request-guard';

export const runtime='nodejs';
const MAX_IMAGE_CHARS=12_000_000;

export async function POST(req:NextRequest){
  try{
    if(!allowRequest(`jobs:${clientKey(req.headers)}`,20,60_000)) return NextResponse.json({error:'Too many queue requests. Please wait a moment.'},{status:429});
    const supabase=await createSupabaseServerClient();
    if(!supabase) return NextResponse.json({error:'Supabase is not configured.'},{status:503});
    const {data:{user}}=await supabase.auth.getUser();
    if(!user) return NextResponse.json({error:'Authentication required.'},{status:401});

    const body=await req.json();
    const payload=body?.payload&&typeof body.payload==='object'?body.payload:{};
    const imageDataUrl=String(payload.imageDataUrl||'');
    if(!imageDataUrl.startsWith('data:image/')) return NextResponse.json({error:'A valid image is required.'},{status:400});
    if(imageDataUrl.length>MAX_IMAGE_CHARS) return NextResponse.json({error:'Image is too large.'},{status:413});
    const count=Math.max(1,Math.min(10,Number(payload.count)||3));
    const creditCost=creditsForImages(1,count);

    if(body?.projectId){
      const {data:project,error:projectError}=await supabase.from('projects').select('id').eq('id',body.projectId).maybeSingle();
      if(projectError) throw projectError;
      if(!project) return NextResponse.json({error:'Project not found.'},{status:404});
    }

    const jobId=crypto.randomUUID();
    try{await consumeCredits(user.id,creditCost,'queued_image_analysis',jobId)}catch(e:any){
      const status=e?.message?.includes('INSUFFICIENT_CREDITS')?402:500;
      return NextResponse.json({error:status===402?'Insufficient credits.':e?.message||'Credit reservation failed.'},{status});
    }

    const admin=createSupabaseAdmin();
    const {data,error}=await admin.from('jobs').insert({id:jobId,user_id:user.id,project_id:body?.projectId||null,payload:{...payload,count},credit_cost:creditCost}).select('id,status,credit_cost,created_at').single();
    if(error){
      await admin.rpc('grant_credits',{p_user_id:user.id,p_amount:creditCost,p_reason:'job_enqueue_failed_refund',p_reference_id:jobId});
      throw error;
    }
    return NextResponse.json({job:data});
  }catch(e:any){return NextResponse.json({error:e?.message||'Unable to queue job.'},{status:500});}
}

export async function GET(){
  try{
    const supabase=await createSupabaseServerClient();
    if(!supabase)return NextResponse.json({jobs:[]});
    const {data:{user}}=await supabase.auth.getUser();
    if(!user)return NextResponse.json({error:'Authentication required.'},{status:401});
    const {data,error}=await supabase.from('jobs').select('id,project_id,status,error,attempts,credit_cost,credit_refunded_at,created_at,updated_at').eq('user_id',user.id).order('created_at',{ascending:false}).limit(100);
    if(error)throw error;
    return NextResponse.json({jobs:data??[]});
  }catch(e:any){return NextResponse.json({error:e?.message||'Unable to load jobs.'},{status:500});}
}
