import {NextResponse} from 'next/server';
import {createSupabaseServerClient} from '@/lib/supabase/server';
import {PLANS} from '@/lib/billing';
import {createCheckoutSession} from '@/lib/stripe';
export const runtime='nodejs';
export async function POST(req:Request){
 const supabase=await createSupabaseServerClient(); if(!supabase)return NextResponse.json({error:'Supabase is not configured.'},{status:503});
 const {data:{user}}=await supabase.auth.getUser(); if(!user)return NextResponse.json({error:'Unauthorized'},{status:401});
 const body=await req.json().catch(()=>({})); const plan=String(body?.plan||'') as keyof typeof PLANS;
 if(!plan||!PLANS[plan])return NextResponse.json({error:'Invalid plan.'},{status:400});
 if(plan==='free')return NextResponse.json({checkoutUrl:null,plan});
 try{
  const origin=new URL(req.url).origin;
  const session=await createCheckoutSession({userId:user.id,email:user.email,plan,successUrl:`${origin}/pricing?checkout=success`,cancelUrl:`${origin}/pricing?checkout=cancelled`});
  return NextResponse.json({checkoutUrl:session.url,sessionId:session.id,plan});
 }catch(e:any){return NextResponse.json({error:e.message||'Checkout could not be created.'},{status:e.status||500});}
}
