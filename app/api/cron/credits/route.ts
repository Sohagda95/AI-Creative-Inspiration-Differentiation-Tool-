import {NextResponse} from 'next/server'; import {createSupabaseAdmin} from '@/lib/supabase/admin';
export const runtime='nodejs';
export async function POST(req:Request){const auth=req.headers.get('authorization'); if(!process.env.CRON_SECRET||auth!==`Bearer ${process.env.CRON_SECRET}`)return NextResponse.json({error:'Unauthorized'},{status:401});
 const admin=createSupabaseAdmin(); const {data,error}=await admin.rpc('reset_due_credits'); if(error)return NextResponse.json({error:error.message},{status:500}); return NextResponse.json({ok:true,result:data});}
