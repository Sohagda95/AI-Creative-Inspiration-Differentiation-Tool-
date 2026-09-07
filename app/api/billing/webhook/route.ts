import {NextResponse} from 'next/server';
import crypto from 'node:crypto';
import {createSupabaseAdmin} from '@/lib/supabase/admin';
import {PLANS,PlanId} from '@/lib/billing';
export const runtime='nodejs';
function verify(raw:string,signature:string,secret:string){
 const parts=Object.fromEntries(signature.split(',').map(x=>x.trim().split('='))) as Record<string,string>;
 const t=parts.t,v1=parts.v1; if(!t||!v1||!/^[0-9]+$/.test(t)||!/^[a-f0-9]{64}$/i.test(v1))return false;
 if(Math.abs(Date.now()/1000-Number(t))>300)return false;
 const expected=crypto.createHmac('sha256',secret).update(`${t}.${raw}`).digest('hex');
 return crypto.timingSafeEqual(Buffer.from(expected),Buffer.from(v1));
}
function planFromPrice(priceId:string):PlanId|null{ for(const p of ['creator','pro','studio'] as const){if(process.env[`STRIPE_PRICE_${p.toUpperCase()}`]===priceId)return p;} return null; }
export async function POST(req:Request){
 const raw=await req.text(); const sig=req.headers.get('stripe-signature'); const secret=process.env.STRIPE_WEBHOOK_SECRET;
 if(!sig||!secret||!verify(raw,sig,secret))return NextResponse.json({error:'Invalid signature.'},{status:400});
 let event:any; try{event=JSON.parse(raw)}catch{return NextResponse.json({error:'Invalid JSON.'},{status:400});}
 const admin=createSupabaseAdmin();
 const {error:insertError}=await admin.from('webhook_events').insert({provider:'stripe',event_id:event.id,event_type:event.type,payload:event});
 if(insertError?.code==='23505')return NextResponse.json({received:true,duplicate:true});
 if(insertError)return NextResponse.json({error:insertError.message},{status:500});
 try{
  const obj=event.data?.object||{}; const metadata=obj.metadata||obj.subscription_details?.metadata||{}; const userId=metadata.user_id||obj.client_reference_id;
  if(event.type==='checkout.session.completed' && userId){
   const subId=obj.subscription; const customerId=obj.customer; const priceId=obj.line_items?.data?.[0]?.price?.id || metadata.price_id; const plan:PlanId|null=planFromPrice(priceId||'') || (['free','creator','pro','studio'].includes(metadata.plan)?metadata.plan:null);
   if(plan&&PLANS[plan]&&subId) await admin.from('subscriptions').upsert({user_id:userId,provider:'stripe',provider_customer_id:customerId,provider_subscription_id:subId,plan,status:'active'}, {onConflict:'provider_subscription_id'});
   if(plan&&PLANS[plan]) await admin.rpc('set_user_plan',{p_user_id:userId,p_plan:plan,p_monthly_credits:PLANS[plan].credits,p_reason:'stripe_checkout',p_reference_id:event.id});
  }
  if(['customer.subscription.updated','customer.subscription.created','customer.subscription.deleted'].includes(event.type)){
   const subId=obj.id; const plan:PlanId|null=planFromPrice(obj.items?.data?.[0]?.price?.id||'') || (['free','creator','pro','studio'].includes(metadata.plan)?metadata.plan:null); const status=event.type==='customer.subscription.deleted'?'canceled':obj.status;
   const row:any={status,current_period_end:obj.current_period_end?new Date(obj.current_period_end*1000).toISOString():null,provider_customer_id:obj.customer,updated_at:new Date().toISOString()}; if(plan&&PLANS[plan])row.plan=plan;
   const {data:existing}=await admin.from('subscriptions').select('user_id,plan').eq('provider_subscription_id',subId).maybeSingle();
   await admin.from('subscriptions').update(row).eq('provider_subscription_id',subId);
   // Do not grant credits on every subscription.updated event; invoice.paid is the cycle grant event.
   if(existing?.user_id && plan&&PLANS[plan] && status!=='active' && event.type==='customer.subscription.deleted') await admin.from('profiles').update({plan:'free'}).eq('id',existing.user_id);
  }

  if(event.type==='invoice.paid'){
   const subId=obj.subscription;
   if(subId){
    const {data:sub}=await admin.from('subscriptions').select('user_id,plan').eq('provider_subscription_id',subId).maybeSingle();
    const plan=sub?.plan as PlanId|undefined;
    const periodStart=obj.lines?.data?.[0]?.period?.start || obj.period_start;
    const cycleRef=periodStart?`${subId}:${periodStart}`:event.id;
    if(sub?.user_id && plan && PLANS[plan]){
      const {data:existingGrant}=await admin.from('credit_ledger').select('id').eq('user_id',sub.user_id).eq('reason','stripe_monthly_credit').eq('reference_id',cycleRef).maybeSingle();
      if(!existingGrant) await admin.rpc('grant_credits',{p_user_id:sub.user_id,p_amount:PLANS[plan].credits,p_reason:'stripe_monthly_credit',p_reference_id:cycleRef});
    }
   }
  }
  if(event.type==='invoice.payment_failed'){
   const subId=obj.subscription; if(subId)await admin.from('subscriptions').update({status:'past_due',updated_at:new Date().toISOString()}).eq('provider_subscription_id',subId);
  }
 }catch(e:any){await admin.from('webhook_events').update({processing_error:e.message,processed_at:new Date().toISOString()}).eq('event_id',event.id);return NextResponse.json({error:e.message},{status:500});}
 await admin.from('webhook_events').update({processed_at:new Date().toISOString()}).eq('event_id',event.id);
 return NextResponse.json({received:true});
}
