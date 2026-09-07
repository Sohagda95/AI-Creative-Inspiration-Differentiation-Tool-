import {NextResponse} from 'next/server'; import {requireAdmin} from '@/lib/admin';
export async function GET(){try{const {admin}=await requireAdmin();
 const [profiles,projects,subs,ledger,jobs]=await Promise.all([
  admin.from('profiles').select('id,plan,credits,credits_used,created_at'),
  admin.from('projects').select('id,created_at'),
  admin.from('subscriptions').select('plan,status,created_at'),
  admin.from('credit_ledger').select('amount,reason,created_at').order('created_at',{ascending:false}).limit(1000),
  admin.from('jobs').select('status,created_at').order('created_at',{ascending:false}).limit(1000)
 ]);
 return NextResponse.json({users:profiles.data||[],projects:projects.data||[],subscriptions:subs.data||[],ledger:ledger.data||[],jobs:jobs.data||[]});
 }catch(e:any){return NextResponse.json({error:e.message},{status:e.status||500});}}
