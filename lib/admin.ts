import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
export async function requireAdmin(){
 const supabase=await createSupabaseServerClient(); if(!supabase) throw Object.assign(new Error('Supabase is not configured.'),{status:503});
 const {data:{user}}=await supabase.auth.getUser(); if(!user) throw Object.assign(new Error('Authentication required.'),{status:401});
 const admin=createSupabaseAdmin(); const {data:profile,error}=await admin.from('profiles').select('role,plan,credits,credits_used').eq('id',user.id).single();
 if(error||profile?.role!=='admin') throw Object.assign(new Error('Admin access required.'),{status:403});
 return {user,admin,profile};
}
