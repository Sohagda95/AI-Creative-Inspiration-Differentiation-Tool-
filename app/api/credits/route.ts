import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
export async function GET(){
 const supabase=await createServerSupabase(); const {data:{user}}=await supabase.auth.getUser();
 if(!user) return NextResponse.json({error:'Unauthorized'},{status:401});
 const {data,error}=await supabase.from('profiles').select('plan,credits,credits_used,credits_reset_at').eq('id',user.id).single();
 if(error) return NextResponse.json({error:error.message},{status:500});
 return NextResponse.json({credits:data});
}
