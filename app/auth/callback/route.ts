import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const supabase = await createSupabaseServerClient();
  if (supabase && code) await supabase.auth.exchangeCodeForSession(code);
  return NextResponse.redirect(new URL('/', url.origin));
}
