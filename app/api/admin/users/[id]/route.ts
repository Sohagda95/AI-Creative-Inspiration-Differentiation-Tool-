import {NextRequest,NextResponse} from 'next/server'; import {requireAdmin} from '@/lib/admin'; import {PLANS} from '@/lib/billing';
export async function PATCH(req:NextRequest,{params}:{params:Promise<{id:string}>}){try{const {admin}=await requireAdmin(); const {id}=await params; const b=await req.json(); const patch:any={};
 if(['free','creator','pro','studio'].includes(b.plan))patch.plan=b.plan;
 if(Number.isInteger(b.credits)&&b.credits>=0)patch.credits=b.credits;
 if(typeof b.role==='string'&&['user','admin'].includes(b.role))patch.role=b.role;
 if(!Object.keys(patch).length)return NextResponse.json({error:'No valid fields.'},{status:400});
 const {data,error}=await admin.from('profiles').update(patch).eq('id',id).select('id,display_name,role,plan,credits,credits_used,credits_reset_at').single(); if(error)throw error;
 if(patch.plan&&patch.plan!=='free')await admin.from('credit_ledger').insert({user_id:id,amount:PLANS[patch.plan as keyof typeof PLANS].credits,reason:'admin_plan_update',reference_id:id});
 return NextResponse.json({user:data});
 }catch(e:any){return NextResponse.json({error:e.message},{status:e.status||500});}}
