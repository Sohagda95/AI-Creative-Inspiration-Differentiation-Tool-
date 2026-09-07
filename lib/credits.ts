import { createSupabaseAdmin } from '@/lib/supabase/admin';

export async function consumeCredits(userId:string, amount:number, reason:string, referenceId?:string|null){
  const admin=createSupabaseAdmin();
  const {data,error}=await admin.rpc('consume_credits',{p_user_id:userId,p_amount:amount,p_reason:reason,p_reference_id:referenceId||null});
  if(error) throw error;
  return data;
}

export async function grantCredits(userId:string, amount:number, reason:string, referenceId?:string|null){
  const admin=createSupabaseAdmin();
  const {data,error}=await admin.rpc('grant_credits',{p_user_id:userId,p_amount:amount,p_reason:reason,p_reference_id:referenceId||null});
  if(error) throw error;
  return data;
}
