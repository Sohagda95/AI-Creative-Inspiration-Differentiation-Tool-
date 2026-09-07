'use client';
import {useState} from 'react';
import {getSupabaseBrowserClient} from '@/lib/supabase/browser';

export default function Login(){
 const[email,setEmail]=useState(''); const[msg,setMsg]=useState(''); const[loading,setLoading]=useState(false);
 async function send(){setLoading(true);setMsg('');const supabase=getSupabaseBrowserClient();if(!supabase){setMsg('Supabase is not configured. Add the Supabase values to .env.local.');setLoading(false);return}const {error}=await supabase.auth.signInWithOtp({email,options:{emailRedirectTo:`${location.origin}/auth/callback`}});setMsg(error?.message||'Check your email for the sign-in link.');setLoading(false)}
 return <main className="grid min-h-screen place-items-center px-6"><div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[.035] p-7"><h1 className="text-2xl font-bold">Sign in</h1><p className="mt-2 text-sm text-white/45">Use a magic link to access saved projects and history.</p><input value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="you@example.com" className="mt-6 w-full rounded-xl border border-white/10 bg-black/20 p-3 outline-none"/><button disabled={loading||!email} onClick={send} className="mt-3 w-full rounded-xl bg-violet-500 p-3 text-sm font-semibold disabled:opacity-50">{loading?'Sending…':'Send sign-in link'}</button>{msg&&<p className="mt-4 text-xs leading-5 text-white/55">{msg}</p>}</div></main>
}
