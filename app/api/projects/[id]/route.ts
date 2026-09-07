import {NextRequest,NextResponse} from 'next/server';
import {createSupabaseServerClient} from '@/lib/supabase/server';
export async function GET(_req:NextRequest,{params}:{params:Promise<{id:string}>}){
 const supabase=await createSupabaseServerClient(); if(!supabase)return NextResponse.json({error:'Supabase is not configured.'},{status:503});
 const {data:{user}}=await supabase.auth.getUser(); if(!user)return NextResponse.json({error:'Authentication required.'},{status:401});
 const {id}=await params; const {data:project,error}=await supabase.from('projects').select('id,name,metadata,created_at,updated_at').eq('id',id).eq('user_id',user.id).single();
 if(error)return NextResponse.json({error:'Project not found.'},{status:404});
 const {data:analyses}=await supabase.from('analyses').select('id,image_index,analysis,prompts,created_at').eq('project_id',id).order('image_index');
 return NextResponse.json({project,analyses:analyses||[]});
}
export async function DELETE(_req:NextRequest,{params}:{params:Promise<{id:string}>}){
 const supabase=await createSupabaseServerClient(); if(!supabase)return NextResponse.json({error:'Supabase is not configured.'},{status:503});
 const {data:{user}}=await supabase.auth.getUser(); if(!user)return NextResponse.json({error:'Authentication required.'},{status:401});
 const {id}=await params; const {error}=await supabase.from('projects').delete().eq('id',id).eq('user_id',user.id); if(error)return NextResponse.json({error:error.message},{status:500}); return NextResponse.json({ok:true});
}
