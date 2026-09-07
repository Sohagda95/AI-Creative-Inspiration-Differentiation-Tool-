export type StripePricePlan = 'creator' | 'pro' | 'studio';
const api = 'https://api.stripe.com/v1';
function secret(){ const v=process.env.STRIPE_SECRET_KEY; if(!v) throw new Error('STRIPE_SECRET_KEY is not configured.'); return v; }
export function priceForPlan(plan:StripePricePlan){ const key=`STRIPE_PRICE_${plan.toUpperCase()}` as keyof NodeJS.ProcessEnv; const v=process.env[key]; if(!v) throw new Error(`Missing ${key}.`); return v; }
export async function stripePost(path:string, params:Record<string,string>){
 const body=new URLSearchParams(params);
 const r=await fetch(`${api}${path}`,{method:'POST',headers:{Authorization:`Bearer ${secret()}`,'Content-Type':'application/x-www-form-urlencoded'},body,cache:'no-store'});
 const data=await r.json(); if(!r.ok) throw Object.assign(new Error(data?.error?.message||'Stripe request failed.'),{status:r.status,code:data?.error?.code}); return data;
}
export async function createCheckoutSession(args:{userId:string;email?:string;plan:StripePricePlan;successUrl:string;cancelUrl:string;}){
 const price=priceForPlan(args.plan);
 return stripePost('/checkout/sessions',{
  mode:'subscription', 'line_items[0][price]':price,'line_items[0][quantity]':'1',
  success_url:args.successUrl,cancel_url:args.cancelUrl,
  customer_email:args.email||'', 'client_reference_id':args.userId,
  'metadata[user_id]':args.userId,'metadata[plan]':args.plan,
  'subscription_data[metadata][user_id]':args.userId,'subscription_data[metadata][plan]':args.plan,
 });
}
