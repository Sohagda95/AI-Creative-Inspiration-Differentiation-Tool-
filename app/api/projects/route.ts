import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ configured: false, projects: [] });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ configured: true, authenticated: false, projects: [] });
  const { data, error } = await supabase.from('projects').select('id,name,created_at,updated_at').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ configured: true, authenticated: true, projects: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  const body = await req.json();
  const name = String(body?.name || 'Untitled Project').trim().slice(0, 120);
  const metadata = body?.metadata ?? {};
  const { data, error } = await supabase.from('projects').insert({ user_id: user.id, name, metadata }).select('id,name,created_at,updated_at').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ project: data });
}
