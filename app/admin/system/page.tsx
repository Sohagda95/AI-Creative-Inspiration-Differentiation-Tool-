'use client';
import {useEffect,useState} from 'react';
import {Activity,Database,KeyRound,CreditCard,RefreshCw,CheckCircle2,AlertTriangle} from 'lucide-react';

export default function SystemPage(){
 const [data,setData]=useState<any>(null); const [error,setError]=useState(''); const [loading,setLoading]=useState(true);
 async function load(){setLoading(true);setError('');try{const r=await fetch('/api/admin/system',{cache:'no-store'});const d=await r.json();if(!r.ok)throw new Error(d.error||'Unable to load system status');setData(d)}catch(e:any){setError(e.message)}finally{setLoading(false)}}
 useEffect(()=>{load()},[]);
 return <main className="mx-auto max-w-6xl px-6 py-10">
  <div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2 text-violet-300"><Activity size={20}/>Production Operations</div><h1 className="mt-2 text-3xl font-semibold">System readiness</h1><p className="mt-2 text-sm text-white/45">A safe operational summary. Secrets are never returned to the browser.</p></div><button onClick={load} className="rounded-xl border border-white/10 p-3" aria-label="Refresh"><RefreshCw size={16}/></button></div>
  {error&&<div className="mt-6 rounded-xl bg-red-500/10 p-4 text-sm text-red-200">{error}</div>}
  {loading&&!data&&<p className="mt-8 text-sm text-white/45">Loading system status…</p>}
  {data&&<><div className="mt-8 grid gap-4 md:grid-cols-4"><Card icon={<Database/>} title="Core readiness" value={data.release.coreReady?'Ready':'Needs setup'} ok={data.release.coreReady}/><Card icon={<KeyRound/>} title="OpenAI keys" value={String(data.checks.openaiKeys)} ok={data.checks.openaiKeys>0}/><Card icon={<Activity/>} title="Queued jobs" value={String(data.jobs.queued||0)} ok={(data.jobs.failed||0)===0}/><Card icon={<CreditCard/>} title="Active subscriptions" value={String(data.billing.activeSubscriptions)} ok={data.billing.failedWebhookCount===0}/></div>
  <section className="mt-6 rounded-2xl border border-white/10 bg-white/[.035] p-5"><h2 className="font-semibold">Configuration checks</h2><div className="mt-4 grid gap-3 md:grid-cols-2">{Object.entries(data.checks).map(([k,v]:any)=><div key={k} className="flex items-center justify-between rounded-xl border border-white/10 p-3"><span className="text-sm">{k}</span><span className="flex items-center gap-2 text-xs text-white/55">{typeof v==='number'?v:(v?<CheckCircle2 size={15}/>:<AlertTriangle size={15}/>)} {typeof v==='boolean'?(v?'configured':'missing'):''}</span></div>)}</div></section>
  <section className="mt-6 rounded-2xl border border-white/10 bg-white/[.035] p-5"><h2 className="font-semibold">Queue snapshot</h2><div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-5">{['queued','processing','completed','failed','cancelled'].map(k=><div key={k} className="rounded-xl border border-white/10 p-3"><div className="text-xl font-semibold">{data.jobs[k]||0}</div><div className="text-xs text-white/40">{k}</div></div>)}</div></section>
  <p className="mt-6 text-xs text-white/35">Phase {data.release.phase} · {data.release.version} · generated {new Date(data.generatedAt).toLocaleString()}</p></>}
 </main>
}
function Card({icon,title,value,ok}:{icon:any;title:string;value:string;ok:boolean}){return <div className="rounded-2xl border border-white/10 bg-white/[.035] p-5"><div className={ok?'text-emerald-300':'text-amber-300'}>{icon}</div><div className="mt-3 text-2xl font-semibold">{value}</div><div className="text-xs text-white/40">{title}</div></div>}
